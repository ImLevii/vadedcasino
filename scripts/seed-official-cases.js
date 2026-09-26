const fs = require('node:fs');
const path = require('node:path');
const {getCatalogItems} = require('../utils/csgo/items');

const TICKETS = [30000, 22000, 16000, 11000, 8000, 5000, 3500, 2300, 1500, 700];
const DEFINITIONS = [
    {name: 'Cosmic Starter', slug: 'cosmic-starter', art: 'business-case', min: .03, max: 2},
    {name: 'Neon Rush', slug: 'neon-rush', art: 'neon-case', min: .5, max: 12},
    {name: 'Sidearm Orbit', slug: 'sidearm-orbit', art: 'lunar-case', type: 'Pistols', min: 1, max: 70},
    {name: 'SMG Nebula', slug: 'smg-nebula', art: 'alien-case', type: 'SMGs', min: 1, max: 95},
    {name: 'Rifle Reactor', slug: 'rifle-reactor', art: 'radiation-case', type: 'Rifles', min: 2, max: 200},
    {name: 'Sniper Signal', slug: 'sniper-signal', art: 'top-secret-case', weapons: ['AWP', 'SSG 08'], min: 3, max: 300},
    {name: 'Covert Cache', slug: 'covert-cache', art: 'ruby-treasure', rarity: 'Covert', min: 5, max: 300},
    {name: 'Knife Vault', slug: 'knife-vault', art: 'swords-of-doom', type: 'Knives', min: 50, max: 200},
    {name: 'Glove Galaxy', slug: 'glove-galaxy', art: 'galaxy-case', type: 'Gloves', min: 400, max: 1300},
    {name: 'Cosmic High Roller', slug: 'cosmic-high-roller', art: 'the-immortal-case', min: 100, max: 2500},
];

function buildOfficialCases(catalog = getCatalogItems()) {
    const eligible = catalog.filter(item => item.itemId && item.name && item.img && Number.isFinite(Number(item.price))
        && Number(item.price) > 0 && !item.isStatTrak && !item.isSouvenir);
    return DEFINITIONS.map(def => {
        const pool = eligible.filter(item => Number(item.price) >= def.min && Number(item.price) <= def.max
            && (!def.type || item.type === def.type) && (!def.rarity || item.rarity === def.rarity)
            && (!def.weapons || def.weapons.includes(item.weapon))).sort((a, b) => Number(a.price) - Number(b.price) || a.itemId.localeCompare(b.itemId));
        // One wear variant per skin keeps the ten drops visually distinct.
        const skins = new Map();
        for (const item of pool) {
            const key = item.name.replace(/\s*\([^)]*\)$/, '');
            if (!skins.has(key)) skins.set(key, []);
            skins.get(key).push(item);
        }
        const unique = [...skins.values()].map((variants, index) => variants[index % variants.length])
            .sort((a, b) => Number(a.price) - Number(b.price) || a.itemId.localeCompare(b.itemId));
        if (unique.length < TICKETS.length) throw new Error(`Not enough catalog items for ${def.slug}`);
        let cursor = 1;
        const items = TICKETS.map((tickets, index) => {
            const item = unique[Math.round(index * (unique.length - 1) / (TICKETS.length - 1))];
            const drop = {itemId: item.itemId, name: item.name, img: item.img, price: Math.round(Number(item.price) * 100) / 100,
                rangeFrom: cursor, rangeTo: cursor + tickets - 1};
            cursor += tickets;
            return drop;
        });
        const expectedValue = items.reduce((sum, item) => sum + item.price * (item.rangeTo - item.rangeFrom + 1) / 100000, 0);
        // Development prices use the checked-in catalog snapshot and a 10% target edge.
        return {name: def.name, slug: def.slug, img: `/public/cases/${def.art}.png`,
            price: Math.ceil(expectedValue / .9 * 100) / 100, expectedValue, items};
    });
}

async function seedOfficialCases(doTransaction, entries) {
    return doTransaction(async (connection, commit) => {
        const created = [], skipped = [];
        for (const entry of entries) {
            const [[existing]] = await connection.query('SELECT id FROM cases WHERE slug = ?', [entry.slug]);
            if (existing) { skipped.push(entry.slug); continue; }
            const [row] = await connection.query('INSERT INTO cases (name, slug, img) VALUES (?, ?, ?)', [entry.name, entry.slug, entry.img]);
            const [version] = await connection.query('INSERT INTO caseVersions (caseId, price) VALUES (?, ?)', [row.insertId, entry.price]);
            for (const item of entry.items) {
                await connection.query('INSERT INTO caseItems (caseVersionId, itemId, name, img, price, rangeFrom, rangeTo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [version.insertId, item.itemId, item.name, item.img, item.price, item.rangeFrom, item.rangeTo]);
            }
            created.push({id: row.insertId, slug: entry.slug, price: entry.price});
        }
        await commit();
        return {created, skipped};
    });
}

async function main() {
    const entries = buildOfficialCases();
    for (const entry of entries) {
        if (!fs.existsSync(path.join(__dirname, '..', entry.img))) throw new Error(`Missing artwork: ${entry.img}`);
    }
    console.table(entries.map(({name, price, items, expectedValue}) => ({name, price, items: items.length, edge: `${((1 - expectedValue / price) * 100).toFixed(2)}%`})));
    if (!process.argv.includes('--apply')) return console.log('Preview only. Pass --apply to add missing official cases. Existing cases are preserved.');
    const {doTransaction} = require('../database');
    console.log(JSON.stringify(await seedOfficialCases(doTransaction, entries), null, 2));
}

if (require.main === module) main().then(() => process.exit(0)).catch(error => {console.error(error.message); process.exit(1);});
module.exports = {buildOfficialCases, seedOfficialCases};
