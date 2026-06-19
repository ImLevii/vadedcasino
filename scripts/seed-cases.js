/**
 * Seeds missing feature flags.
 *
 * Legacy Roblox case seeding has been disabled. Use `npm run csgo:replace-cases`
 * for a dry run or `npm run csgo:replace-cases -- --apply` to seed CS cases.
 */
require('dotenv').config();
const { sql } = require('../database');

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

async function main() {
    console.log('=== Seeding features ===');
    await seedFeatures();

    console.log('\nLegacy Roblox case seeding is disabled.');
    console.log('Run `npm run csgo:replace-cases` to preview CS cases.');
    console.log('Run `npm run csgo:replace-cases -- --apply` to replace cases with CS skins.');

    console.log('\nDone.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
