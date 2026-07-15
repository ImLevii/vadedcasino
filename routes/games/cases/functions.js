const io = require('../../../socketio/server');
const { sql } = require('../../../database');
const { getItemById } = require('../../../utils/csgo/items');

const topDropPrice = 25000;
const limit = 15;
const CASE_CACHE_TTL_MS = Number(process.env.CASE_CACHE_TTL_MS || 10000);
const CASE_CACHE_REFRESH_MS = Number(process.env.CASE_CACHE_REFRESH_MS || 1000 * 60 * 60);

const cachedCases = {};
let cacheCasesPromise = null;
let cacheCasesTimer = null;
let casesCachedAt = 0;

const drops = {
    all: [],
    top: []
}

function scheduleCaseCacheRefresh() {
    if (cacheCasesTimer) clearTimeout(cacheCasesTimer);

    cacheCasesTimer = setTimeout(() => {
        cacheCases().catch((err) => console.error('[cases] cache refresh failed:', err));
    }, CASE_CACHE_REFRESH_MS);

    if (typeof cacheCasesTimer.unref === 'function') cacheCasesTimer.unref();
}

async function cacheCases() {
    if (cacheCasesPromise) return cacheCasesPromise;

    cacheCasesPromise = refreshCasesCache();

    try {
        return await cacheCasesPromise;
    } finally {
        cacheCasesPromise = null;
    }
}

async function refreshCasesCache() {

    for (const slug of Object.keys(cachedCases)) {
        delete cachedCases[slug];
    }

    const [cases] = await sql.query(`
        SELECT c.id, c.name, c.slug, c.img, c.creatorId, cv.price, cv.id as revId, cv.createdAt as modifiedAt FROM cases c
        INNER JOIN caseVersions cv ON c.id = cv.caseId AND cv.endedAt IS NULL
    `);

    if (!cases.length) {
        casesCachedAt = Date.now();
        scheduleCaseCacheRefresh();
        return;
    }

    const [items] = await sql.query(`
        SELECT id, itemId, name, img, price, rangeFrom, rangeTo, caseVersionId FROM caseItems WHERE caseVersionId IN(?) ORDER BY price DESC;
    `, [cases.map(e => e.revId)]);

    for (const caseInfo of cases) {

        const caseItems = items.filter(e => e.caseVersionId === caseInfo.revId);

        delete caseInfo.revId;

        cachedCases[caseInfo.slug] = {
            ...caseInfo,
            items: caseItems.map(e => mapItem(e))
        }

    }

    casesCachedAt = Date.now();
    scheduleCaseCacheRefresh();

}

async function ensureCasesCacheFresh(maxAgeMs = CASE_CACHE_TTL_MS) {
    if (!Object.keys(cachedCases).length || Date.now() - casesCachedAt > maxAgeMs) {
        await cacheCases();
    }

}

async function cacheDrops(top = false) {

    const now = Date.now();

    const [results] = await sql.query(`
        SELECT cases.slug, cases.name as caseName, cases.img as caseImg,
        users.id as userId, users.username, users.xp,
        caseItems.itemId, caseItems.name, caseItems.img, caseItems.price, caseItems.rangeFrom, caseItems.rangeTo
        FROM caseOpenings INNER JOIN caseVersions ON caseOpenings.caseVersionId = caseVersions.id
        INNER JOIN cases ON caseVersions.caseId = cases.id
        INNER JOIN users ON caseOpenings.userId = users.id INNER JOIN caseItems ON caseOpenings.caseItemId = caseItems.id
        ${top ? `WHERE caseItems.price > ${topDropPrice}` : ''} ORDER BY caseOpenings.id DESC LIMIT ${limit}
    `);

    const after = Date.now();
    console.log(`Drops${top ? ' top': ''} took ${after - now}ms`);

    drops[top ? 'top' : 'all'] = results.map(e => {

        const item = mapItem(e);

        return {
            user: {
                id: e.userId,
                username: e.username,
                xp: e.xp
            },
            case: {
                name: e.caseName,
                slug: e.slug,
                img: e.caseImg
            },
            item: item,
            top: item.price >= topDropPrice
        }
        
    });
    
    if (!top) await cacheDrops(true);

}

function newDrops(user, caseInfo, results) {

    io.to('cases').except(user.id).emit('cases:drops', results.map(result => {
        
        const data = {
            user: {
                id: user.id,
                username: user.username,
                xp: user.xp
            },
            case: {
                name: caseInfo.name,
                slug: caseInfo.slug,
                img: caseInfo.img
            },
            item: result.item,
            top: result.item.price >= topDropPrice
        }

        drops.all.unshift(data);
        if (drops.all.length > limit) {
            drops.all.splice(-(drops.all.length - limit));
        }

        if (data.top) {
            drops.top.unshift(data);
            if (drops.top.length > limit) {
                drops.top.splice(-(drops.top.length - limit));
            }
        }

        return data;

    }));

}

function getItemProbability(rangeFrom, rangeTo) {
    let totalProbability = 100000;
    let itemRange = rangeTo - rangeFrom + 1;
    return (itemRange / totalProbability) * 100;
}

function mapItem(e) {
    const catalogItem = getItemById(e.itemId);

    return {
        id: e.id,
        name: e.name,
        img: e.img || catalogItem?.img || `/items/${encodeURIComponent(e.itemId)}/img`,
        price: e.price,
        probability: +getItemProbability(e.rangeFrom, e.rangeTo).toFixed(3) // roundDecimal(getItemProbability(e.rangeFrom, e.rangeTo), 3)
    }

}

module.exports = {
    cachedCases,
    cacheCases,
    ensureCasesCacheFresh,
    cacheDrops,
    newDrops,
    getItemProbability,
    mapItem,
    cachedDrops: drops
}