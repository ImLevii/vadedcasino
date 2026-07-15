require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { sql, doTransaction } = require('../database');
const { getCatalogItems } = require('../utils/csgo/items');
const { cacheCases } = require('../routes/games/cases/functions');

const MAX_ROLL = 100000;
const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups');

const CASE_TIERS = [
    { name: 'CS Starter Case', slug: 'cs-starter', min: 0.01, max: 2.5, limit: 12, markup: 1.2 },
    { name: 'CS Field-Tested Case', slug: 'cs-field-tested', min: 2.5, max: 10, limit: 12, markup: 1.18 },
    { name: 'CS Classified Case', slug: 'cs-classified', min: 10, max: 50, limit: 12, markup: 1.16 },
    { name: 'CS Covert Case', slug: 'cs-covert', min: 50, max: 250, limit: 12, markup: 1.14 },
    { name: 'CS High Roller Case', slug: 'cs-high-roller', min: 250, max: Infinity, limit: 12, markup: 1.12 }
];

function hasFlag(name, flag) {
    return process.argv.includes(flag) || process.argv.includes(`-${name[0]}`);
}

function roundDecimal(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function buildRanges(items) {
    const weights = items.map((item) => 1 / Math.max(Number(item.price || 0), 0.01));
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    let assigned = 0;
    let cursor = 1;

    return items.map((item, index) => {
        const rolls = index === items.length - 1
            ? MAX_ROLL - assigned
            : Math.max(1, Math.floor((weights[index] / weightSum) * MAX_ROLL));
        const rangeFrom = cursor;
        const rangeTo = cursor + rolls - 1;
        assigned += rolls;
        cursor = rangeTo + 1;

        return {
            ...item,
            rangeFrom,
            rangeTo: Math.min(rangeTo, MAX_ROLL)
        };
    });
}

function expectedValue(items) {
    return roundDecimal(items.reduce((sum, item) => {
        const probability = (item.rangeTo - item.rangeFrom + 1) / MAX_ROLL;
        return sum + (Number(item.price || 0) * probability);
    }, 0));
}

function buildCases(catalog) {
    const priced = catalog
        .filter((item) => item.itemId && item.name && item.img && Number(item.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price));

    return CASE_TIERS.map((tier) => {
        const pool = priced.filter((item) => Number(item.price) >= tier.min && Number(item.price) < tier.max);
        const selected = pool.slice(0, tier.limit);
        if (selected.length < 2) return null;

        const items = buildRanges(selected.map((item) => ({
            itemId: item.itemId,
            name: item.name,
            img: item.img,
            price: roundDecimal(item.price)
        })));

        const ev = expectedValue(items);

        return {
            name: tier.name,
            slug: tier.slug,
            img: items[items.length - 1]?.img || items[0]?.img || null,
            price: Math.max(1, roundDecimal(ev * tier.markup)),
            items
        };
    }).filter(Boolean);
}

async function backupTables() {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `cases-backup-${stamp}.json`);
    const [cases] = await sql.query('SELECT * FROM cases ORDER BY id ASC');
    const [versions] = await sql.query('SELECT * FROM caseVersions ORDER BY id ASC');
    const [items] = await sql.query('SELECT * FROM caseItems ORDER BY id ASC');

    await fs.promises.writeFile(backupPath, JSON.stringify({ cases, caseVersions: versions, caseItems: items }, null, 4));
    return { backupPath, counts: { cases: cases.length, caseVersions: versions.length, caseItems: items.length } };
}

async function main() {
    const apply = hasFlag('apply', '--apply');
    const catalog = getCatalogItems();
    const cases = buildCases(catalog);

    if (!catalog.length) throw new Error('CS catalog is empty. Run scripts/import-csgo-market-items.js first.');
    if (!cases.length) throw new Error('No replacement CS cases could be generated from priced catalog items.');

    console.log(`[cs-replace] catalog=${catalog.length} generatedCases=${cases.length} apply=${apply}`);

    const backup = await backupTables();
    console.log(`[cs-replace] backup=${backup.backupPath}`);
    console.log(`[cs-replace] existing=${JSON.stringify(backup.counts)}`);

    for (const entry of cases) {
        console.log(`[cs-replace] case=${entry.slug} price=${entry.price} items=${entry.items.length}`);
    }

    if (!apply) {
        console.log('[cs-replace] dry run only. Re-run with --apply to delete old cases and insert CS cases.');
        process.exit(0);
    }

    await doTransaction(async (connection, commit) => {
        await connection.query('DELETE FROM caseOpenings');
        await connection.query('DELETE FROM caseItems');
        await connection.query('DELETE FROM caseVersions');
        await connection.query('DELETE FROM cases');

        for (const entry of cases) {
            const [caseInsert] = await connection.query(
                'INSERT INTO cases (name, slug, img) VALUES (?, ?, ?)',
                [entry.name, entry.slug, entry.img]
            );

            const [versionInsert] = await connection.query(
                'INSERT INTO caseVersions (caseId, price) VALUES (?, ?)',
                [caseInsert.insertId, entry.price]
            );

            for (const item of entry.items) {
                await connection.query(
                    `INSERT INTO caseItems (caseVersionId, itemId, name, img, price, rangeFrom, rangeTo)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [versionInsert.insertId, item.itemId, item.name, item.img, item.price, item.rangeFrom, item.rangeTo]
                );
            }
        }

        await commit();
    });

    await cacheCases();
    console.log('[cs-replace] applied successfully.');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});