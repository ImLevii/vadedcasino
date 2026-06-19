require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const outputPath = path.join(__dirname, '..', 'utils', 'csgo', 'items.json');
const statePath = path.join(__dirname, '..', 'utils', 'csgo', 'import-state.json');
const APP_ID = 730;
const CSGO_API_SKINS_URL = process.env.CSGO_API_SKINS_URL || 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const DEFAULT_COUNT = 100;
const REQUEST_DELAY_MS = Number(process.env.STEAM_MARKET_DELAY_MS || 3000);
const REQUEST_STAGGER_MS = Number(process.env.STEAM_MARKET_STAGGER_MS || 350);
const MAX_RETRIES = Number(process.env.STEAM_MARKET_MAX_RETRIES || 10);
const THROTTLE_COOLDOWN_MS = Number(process.env.STEAM_MARKET_THROTTLE_COOLDOWN_MS || 120000);
const DEFAULT_CONCURRENCY = Number(process.env.STEAM_MARKET_CONCURRENCY || 4);
const DEFAULT_STRIDE = Number(process.env.STEAM_MARKET_STRIDE || 10);
const CURRENCY = Number(process.env.STEAM_MARKET_CURRENCY || 1);
const COUNTRY = process.env.STEAM_MARKET_COUNTRY || 'US';
const WEAR_MULTIPLIERS = {
    'Factory New': 1.8,
    'Minimal Wear': 1.35,
    'Field-Tested': 1,
    'Well-Worn': 0.82,
    'Battle-Scarred': 0.68
};
const RARITY_BASE_PRICES = {
    Consumer: 0.08,
    Industrial: 0.18,
    'Mil-Spec Grade': 0.55,
    Restricted: 2.5,
    Classified: 8,
    Covert: 28,
    Contraband: 1200,
    Extraordinary: 180
};

function parseArgs() {
    const args = new Set(process.argv.slice(2));
    const getValue = (name, fallback) => {
        const prefix = `${name}=`;
        const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
        return found ? found.slice(prefix.length) : fallback;
    };

    return {
        source: getValue('--source', 'api'),
        dryRun: args.has('--dry-run'),
        fresh: args.has('--fresh'),
        noResume: args.has('--no-resume'),
        maxPages: Number(getValue('--max-pages', 0)) || 0,
        start: Number(getValue('--start', 0)) || 0,
        count: Math.min(Number(getValue('--count', DEFAULT_COUNT)) || DEFAULT_COUNT, 100),
        concurrency: Math.max(1, Math.min(Number(getValue('--concurrency', DEFAULT_CONCURRENCY)) || DEFAULT_CONCURRENCY, 12)),
        stride: Math.max(1, Math.min(Number(getValue('--stride', DEFAULT_STRIDE)) || DEFAULT_STRIDE, 100))
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableMarketError(err) {
    const status = err?.response?.status;
    return status === 429 || status >= 500 || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
}

function retryDelayMs(err, attempt) {
    const retryAfter = Number(err?.response?.headers?.['retry-after'] || 0);
    if (retryAfter) return retryAfter * 1000;
    return Math.min(15 * 60 * 1000, REQUEST_DELAY_MS * Math.pow(2, attempt));
}

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) return fallback;

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) || fallback;
    } catch (err) {
        console.warn(`[csgo-import] failed to read ${filePath}: ${err.message}`);
        return fallback;
    }
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'item';
}

function makeItemId(marketHashName) {
    const hash = crypto.createHash('sha1').update(marketHashName).digest('hex').slice(0, 16);
    return `csgo_${slugify(marketHashName).slice(0, 48)}_${hash}`;
}

function roundPrice(value) {
    return Math.max(0.01, Math.round((Number(value) || 0.01) * 100) / 100);
}

function marketVariantName(name, variant) {
    if (variant === 'standard') return name;
    if (variant === 'souvenir') return `Souvenir ${name}`;

    if (name.startsWith('★ ')) return `★ StatTrak™ ${name.slice(2)}`;
    return `StatTrak™ ${name}`;
}

function marketHashNameForSkin(skin, wearName, variant) {
    const variantName = marketVariantName(skin.name, variant);
    return wearName ? `${variantName} (${wearName})` : variantName;
}

function estimatePrice(skin, wearName, variant) {
    const rarityName = skin.rarity?.name || 'Mil-Spec Grade';
    const categoryName = skin.category?.name || '';
    const base = RARITY_BASE_PRICES[rarityName] || 1;
    const wearMultiplier = WEAR_MULTIPLIERS[wearName] || 1;
    const variantMultiplier = variant === 'stattrak' ? 2.2 : variant === 'souvenir' ? 1.45 : 1;
    const categoryMultiplier = categoryName === 'Knives' ? 2.8 : categoryName === 'Gloves' ? 3.5 : 1;
    const floatSpread = Math.max(0.25, Number(skin.max_float ?? 1) - Number(skin.min_float ?? 0));

    return roundPrice(base * wearMultiplier * variantMultiplier * categoryMultiplier * (1 + (1 - floatSpread) * 0.25));
}

function buildExistingPriceMap(items) {
    const priceMap = new Map();

    for (const item of Object.values(items || {})) {
        if (!item?.marketHashName || !(Number(item.price) > 0)) continue;
        priceMap.set(item.marketHashName, Number(item.price));
    }

    return priceMap;
}

function parsePriceText(value) {
    if (!value || typeof value !== 'string') return null;
    const normalized = value.replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/);
    if (!normalized) return null;
    const price = Number(normalized[0]);
    return Number.isFinite(price) && price >= 0 ? price : null;
}

function tagValue(tags, category) {
    const tag = tags.find((entry) => entry.category === category);
    return tag?.localized_tag_name || tag?.internal_name || null;
}

function detectVariant(name) {
    return {
        isStatTrak: /StatTrak/.test(name),
        isSouvenir: /Souvenir/.test(name)
    };
}

function normalizeMarketItem(result) {
    const description = result.asset_description || {};
    const marketHashName = result.hash_name || result.name || description.market_hash_name;
    if (!marketHashName) return null;

    const tags = Array.isArray(description.tags) ? description.tags : [];
    const price = parsePriceText(result.sell_price_text || result.sale_price_text || result.normal_price);
    const variant = detectVariant(marketHashName);
    const iconUrl = description.icon_url_large || description.icon_url;

    return {
        itemId: makeItemId(marketHashName),
        marketHashName,
        name: result.name || description.name || marketHashName,
        type: tagValue(tags, 'Type') || description.type || null,
        weapon: tagValue(tags, 'Weapon') || null,
        exterior: tagValue(tags, 'Exterior') || null,
        rarity: tagValue(tags, 'Rarity') || null,
        collection: tagValue(tags, 'ItemSet') || null,
        isStatTrak: variant.isStatTrak,
        isSouvenir: variant.isSouvenir,
        img: iconUrl ? `https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}` : null,
        price,
        currency: COUNTRY === 'US' && CURRENCY === 1 ? 'USD' : String(CURRENCY),
        source: 'steam-community-market',
        updatedAt: new Date().toISOString()
    };
}

function normalizeApiSkin(skin, wearName, variant, priceMap) {
    const marketHashName = marketHashNameForSkin(skin, wearName, variant);
    const realPrice = priceMap.get(marketHashName);
    const estimatedPrice = estimatePrice(skin, wearName, variant);

    return {
        itemId: makeItemId(marketHashName),
        marketHashName,
        name: marketHashName,
        type: skin.category?.name || null,
        weapon: skin.weapon?.name || null,
        exterior: wearName || null,
        rarity: skin.rarity?.name || null,
        collection: skin.collections?.[0]?.name || null,
        isStatTrak: variant === 'stattrak',
        isSouvenir: variant === 'souvenir',
        img: skin.image || null,
        price: realPrice || estimatedPrice,
        priceEstimated: !realPrice,
        currency: COUNTRY === 'US' && CURRENCY === 1 ? 'USD' : String(CURRENCY),
        source: realPrice ? 'steam-community-market' : 'csgo-api-estimated',
        updatedAt: new Date().toISOString()
    };
}

async function fetchApiSkins() {
    const { data } = await axios.get(CSGO_API_SKINS_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 CSGO Catalog Importer'
        },
        timeout: 60000
    });

    if (!Array.isArray(data)) throw new Error('CSGO API skins response was not an array');
    return data;
}

async function importFromApi(args) {
    const existing = args.fresh ? {} : readJson(outputPath, {});
    const priceMap = buildExistingPriceMap(existing);
    const imported = {};
    const skins = await fetchApiSkins();

    for (const skin of skins) {
        const wearNames = Array.isArray(skin.wears) && skin.wears.length
            ? skin.wears.map((wear) => wear.name).filter(Boolean)
            : [null];
        const variants = ['standard'];

        if (skin.stattrak) variants.push('stattrak');
        if (skin.souvenir) variants.push('souvenir');

        for (const variant of variants) {
            for (const wearName of wearNames) {
                const item = normalizeApiSkin(skin, wearName, variant, priceMap);
                imported[item.itemId] = item;
            }
        }
    }

    const state = {
        source: 'csgo-api',
        total: Object.keys(imported).length,
        imported: Object.keys(imported).length,
        completed: true,
        priceEstimated: Object.values(imported).filter((item) => item.priceEstimated).length,
        updatedAt: new Date().toISOString()
    };

    if (args.dryRun) {
        console.log(`[csgo-import] dry run complete. Would write ${state.imported} items from ${skins.length} base skins to ${outputPath}`);
        return;
    }

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await writeCatalog(imported, state);
    console.log(`[csgo-import] wrote ${state.imported} items from ${skins.length} base skins to ${outputPath}; estimatedPrices=${state.priceEstimated}`);
}

async function fetchPage(start, count) {
    const { data } = await axios.get('https://steamcommunity.com/market/search/render/', {
        params: {
            query: '',
            start,
            count,
            search_descriptions: 0,
            sort_column: 'popular',
            sort_dir: 'desc',
            appid: APP_ID,
            norender: 1,
            currency: CURRENCY,
            country: COUNTRY
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 CSGO Catalog Importer'
        },
        timeout: 30000
    });

    if (!data?.success) throw new Error(`Steam Market request failed at start=${start}`);
    return data;
}

async function fetchPageWithRetry(start, count) {
    let attempt = 0;

    while (true) {
        try {
            return await fetchPage(start, count);
        } catch (err) {
            attempt += 1;
            const status = err?.response?.status;
            const retryable = isRetryableMarketError(err);

            if (!retryable || attempt > MAX_RETRIES) {
                err.retryableMarketError = retryable;
                throw err;
            }

            const waitMs = retryDelayMs(err, attempt);

            console.warn(`[csgo-import] request failed start=${start} status=${status || err.code || 'unknown'} attempt=${attempt}/${MAX_RETRIES}; retrying in ${Math.round(waitMs / 1000)}s`);
            await sleep(waitMs);
        }
    }
}

async function fetchBatch(start, args, total) {
    const starts = [];
    const maxPages = args.maxPages ? args.maxPages : Infinity;

    for (let index = 0; index < args.concurrency && starts.length < maxPages; index += 1) {
        const pageStart = start + index * args.stride;
        if (total !== null && pageStart >= total) break;
        starts.push(pageStart);
    }

    const results = await Promise.allSettled(starts.map(async (pageStart, index) => {
        if (index > 0) await sleep(index * REQUEST_STAGGER_MS);
        const data = await fetchPageWithRetry(pageStart, args.count);
        return {
            start: pageStart,
            total: Number(data.total_count || 0),
            results: Array.isArray(data.results) ? data.results : []
        };
    }));

    const pages = [];
    const errors = [];

    for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        if (result.status === 'fulfilled') {
            pages.push(result.value);
        } else {
            errors.push({ start: starts[index], error: result.reason });
        }
    }

    pages.sort((a, b) => a.start - b.start);
    errors.sort((a, b) => a.start - b.start);
    return { pages, errors };
}

async function writeCatalog(items, state) {
    const sorted = Object.fromEntries(
        Object.values(items)
            .sort((a, b) => Number(b.price || 0) - Number(a.price || 0) || a.name.localeCompare(b.name))
            .map((item) => [item.itemId, item])
    );

    await fs.promises.writeFile(outputPath, JSON.stringify(sorted, null, 4));
    await fs.promises.writeFile(statePath, JSON.stringify(state, null, 4));
}

async function main() {
    const args = parseArgs();

    if (args.source === 'api') {
        await importFromApi(args);
        return;
    }

    if (args.source !== 'steam') throw new Error(`Unknown import source: ${args.source}`);

    const previousState = args.fresh || args.noResume ? {} : readJson(statePath, {});
    const imported = args.fresh ? {} : readJson(outputPath, {});
    let start = args.start || Number(previousState.nextStart || 0);
    let total = null;
    let page = 0;
    let activeConcurrency = args.concurrency;
    let successfulBatches = 0;
    let throttleCooldowns = 0;

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    if (args.fresh) {
        await fs.promises.rm(statePath, { force: true }).catch(() => {});
    }

    console.log(`[csgo-import] starting start=${start} existing=${Object.keys(imported).length} delayMs=${REQUEST_DELAY_MS} staggerMs=${REQUEST_STAGGER_MS} count=${args.count} concurrency=${args.concurrency} stride=${args.stride}`);

    while (total === null || start < total) {
        if (args.maxPages && page >= args.maxPages) break;

        const remainingPages = args.maxPages ? args.maxPages - page : Infinity;
        const { pages, errors } = await fetchBatch(start, { ...args, concurrency: Math.min(activeConcurrency, remainingPages) }, total);
        if (!pages.length) {
            throttleCooldowns += 1;
            activeConcurrency = Math.max(1, Math.floor(activeConcurrency / 2));
            const waitMs = Math.min(30 * 60 * 1000, THROTTLE_COOLDOWN_MS * throttleCooldowns);
            console.warn(`[csgo-import] all requests failed at start=${start}; cooling down for ${Math.round(waitMs / 1000)}s with concurrency=${activeConcurrency}`);
            await writeCatalog(imported, {
                nextStart: start,
                total,
                imported: Object.keys(imported).length,
                paused: true,
                updatedAt: new Date().toISOString()
            });
            await sleep(waitMs);
            continue;
        }

        let fetched = 0;
        let nextStart = start;
        const firstFailedStart = errors.length ? errors[0].start : null;

        for (const steamPage of pages) {
            if (firstFailedStart !== null && steamPage.start > firstFailedStart) continue;

            total = steamPage.total || total;
            fetched += steamPage.results.length;
            nextStart = Math.max(nextStart, steamPage.start + steamPage.results.length);

            for (const result of steamPage.results) {
                const item = normalizeMarketItem(result);
                if (!item) continue;
                imported[item.itemId] = item;
            }
        }

        page += pages.length;

        console.log(`[csgo-import] pages=${page - pages.length + 1}-${page} start=${start} fetched=${fetched} imported=${Object.keys(imported).length} total=${total} concurrency=${activeConcurrency}`);

        if (!fetched || nextStart <= start) {
            throttleCooldowns += 1;
            activeConcurrency = Math.max(1, Math.floor(activeConcurrency / 2));
            const waitMs = Math.min(30 * 60 * 1000, THROTTLE_COOLDOWN_MS * throttleCooldowns);
            console.warn(`[csgo-import] no progress at start=${start}; cooling down for ${Math.round(waitMs / 1000)}s with concurrency=${activeConcurrency}`);
            await sleep(waitMs);
            continue;
        }

        start = nextStart;

        if (!args.dryRun) {
            await writeCatalog(imported, {
                nextStart: start,
                total,
                imported: Object.keys(imported).length,
                updatedAt: new Date().toISOString()
            });
        }

        if (errors.length) {
            throttleCooldowns += 1;
            activeConcurrency = Math.max(1, Math.floor(activeConcurrency / 2));
            const waitMs = Math.min(30 * 60 * 1000, THROTTLE_COOLDOWN_MS * throttleCooldowns);
            console.warn(`[csgo-import] ${errors.length} request(s) failed; checkpointed through start=${start}. Cooling down for ${Math.round(waitMs / 1000)}s with concurrency=${activeConcurrency}`);
            await sleep(waitMs);
            continue;
        }

        throttleCooldowns = 0;
        successfulBatches += 1;
        if (successfulBatches >= 8 && activeConcurrency < args.concurrency) {
            activeConcurrency += 1;
            successfulBatches = 0;
            console.log(`[csgo-import] raising concurrency to ${activeConcurrency}`);
        }

        await sleep(REQUEST_DELAY_MS);
    }

    if (args.dryRun) {
        console.log(`[csgo-import] dry run complete. Would write ${Object.keys(imported).length} items to ${outputPath}`);
        return;
    }

    await writeCatalog(imported, {
        nextStart: start,
        total,
        imported: Object.keys(imported).length,
        completed: total !== null && start >= total,
        updatedAt: new Date().toISOString()
    });

    console.log(`[csgo-import] wrote ${Object.keys(imported).length} items to ${outputPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});