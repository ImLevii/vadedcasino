/**
 * Seeds cases, caseVersions, and caseItems from utils/cases.json and utils/cases2.json
 * Also seeds missing feature flags.
 * Safe to run multiple times (uses ON DUPLICATE KEY / checks existing).
 */
require('dotenv').config();
const { sql } = require('../database');
const cases1 = require('../utils/cases.json');
const cases2 = require('../utils/cases2.json');

const MAXROLL = 100000;

function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function calcPrice(items) {
    return items.reduce((sum, item) => {
        const prob = (item.rangeTo - item.rangeFrom + 1) / MAXROLL;
        return sum + item.price * prob;
    }, 0);
}

async function seedFeatures() {
    const missing = [
        'cases', 'tips', 'fiatDeposits', 'cardDeposits'
    ];
    for (const id of missing) {
        await sql.query(
            'INSERT INTO features (id, enabled) VALUES (?, 1) ON DUPLICATE KEY UPDATE id=id',
            [id]
        );
        console.log(`Feature ensured: ${id}`);
    }
}

async function seedCases(allCases) {
    for (const c of allCases) {
        const slug = c.slug || slugify(c.name);
        const price = c.price != null ? c.price : calcPrice(c.items);

        // Upsert case
        const [existing] = await sql.query('SELECT id FROM cases WHERE slug = ?', [slug]);
        let caseId;

        if (existing.length) {
            caseId = existing[0].id;
            console.log(`Case exists: ${c.name} (id=${caseId})`);
        } else {
            const [ins] = await sql.query(
                'INSERT INTO cases (name, slug, img) VALUES (?, ?, ?)',
                [c.name, slug, c.img || null]
            );
            caseId = ins.insertId;
            console.log(`Case created: ${c.name} (id=${caseId})`);
        }

        // Check if an active caseVersion exists
        const [activeVer] = await sql.query(
            'SELECT id FROM caseVersions WHERE caseId = ? AND endedAt IS NULL',
            [caseId]
        );

        let versionId;
        if (activeVer.length) {
            versionId = activeVer[0].id;
            console.log(`  Version exists: ${versionId}`);
        } else {
            const [verIns] = await sql.query(
                'INSERT INTO caseVersions (caseId, price, createdAt) VALUES (?, ?, NOW())',
                [caseId, Math.round(price)]
            );
            versionId = verIns.insertId;
            console.log(`  Version created: ${versionId} price=${Math.round(price)}`);
        }

        // Check if items already seeded for this version
        const [itemCount] = await sql.query(
            'SELECT COUNT(*) as cnt FROM caseItems WHERE caseVersionId = ?',
            [versionId]
        );
        if (itemCount[0].cnt > 0) {
            console.log(`  Items already seeded (${itemCount[0].cnt}), skipping.`);
            continue;
        }

        // Insert items
        for (const item of c.items) {
            await sql.query(
                'INSERT INTO caseItems (itemId, name, img, price, rangeFrom, rangeTo, caseVersionId) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    String(item.id),
                    item.name,
                    item.img || null,
                    item.price,
                    item.rangeFrom,
                    item.rangeTo,
                    versionId
                ]
            );
        }
        console.log(`  Items seeded: ${c.items.length}`);
    }
}

async function main() {
    console.log('=== Seeding features ===');
    await seedFeatures();

    console.log('\n=== Seeding cases (cases.json) ===');
    await seedCases(cases1);

    console.log('\n=== Seeding cases (cases2.json) ===');
    await seedCases(cases2);

    console.log('\nDone.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
