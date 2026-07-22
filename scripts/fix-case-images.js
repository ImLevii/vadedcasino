/**
 * One-off fix: the CS case migration (replace-cases-with-cs.js) previously set
 * `cases.img` to the highest-priced ITEM's skin image instead of dedicated
 * case-box artwork. This caused battles/case UI to display a weapon skin
 * image where the case icon should appear.
 *
 * This script only UPDATEs the `img` column on the `cases` table by slug.
 * It does not touch caseVersions, caseItems, or any opening/battle history.
 *
 * Usage:
 *   node scripts/fix-case-images.js            (dry run, prints planned changes)
 *   node scripts/fix-case-images.js --apply     (applies the update)
 */
require('dotenv').config();
const { sql } = require('../database');

const IMAGE_BY_SLUG = {
    'cs-starter': '/public/cases/business-case.png',
    'cs-field-tested': '/public/cases/glass-case.png',
    'cs-classified': '/public/cases/neon-case.png',
    'cs-covert': '/public/cases/top-secret-case.png',
    'cs-high-roller': '/public/cases/the-immortal-case.png'
};

async function main() {
    const apply = process.argv.includes('--apply');

    const [cases] = await sql.query('SELECT id, name, slug, img FROM cases WHERE slug IN (?)', [Object.keys(IMAGE_BY_SLUG)]);

    if (!cases.length) {
        console.log('[fix-case-images] no matching cases found.');
        process.exit(0);
    }

    for (const c of cases) {
        const newImg = IMAGE_BY_SLUG[c.slug];
        console.log(`[fix-case-images] case=${c.slug} (id=${c.id}) img: "${c.img}" -> "${newImg}"`);
    }

    if (!apply) {
        console.log('[fix-case-images] dry run only. Re-run with --apply to write changes.');
        process.exit(0);
    }

    for (const c of cases) {
        const newImg = IMAGE_BY_SLUG[c.slug];
        await sql.query('UPDATE cases SET img = ? WHERE id = ?', [newImg, c.id]);
    }

    console.log(`[fix-case-images] updated ${cases.length} case(s).`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
