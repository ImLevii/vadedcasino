// One-off: ensure giftCards.notes and idx_giftCards_redeemedAt exist.
const { sql } = require('../database');

async function safeAdd(stmt, label) {
    try {
        await sql.query(stmt);
        console.log('OK: ' + label);
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEY' || /Duplicate column|already exists/i.test(e.message)) {
            console.log('SKIP (already exists): ' + label);
            return;
        }
        console.error('FAIL ' + label + ':', e.code, e.message);
        throw e;
    }
}

async function main() {
    await safeAdd(
        "ALTER TABLE `giftCards` ADD COLUMN `notes` VARCHAR(500) DEFAULT NULL AFTER `redeemedBy`",
        'add giftCards.notes'
    );
    await safeAdd(
        "ALTER TABLE `giftCards` ADD INDEX `idx_giftCards_redeemedAt` (`redeemedAt`)",
        'add giftCards.idx_giftCards_redeemedAt'
    );
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });