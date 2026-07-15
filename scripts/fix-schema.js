require('dotenv').config();
const { sql } = require('../database');

async function main() {
    const alters = [
        // fairRolls: add serverSeed and clientSeed columns that the INSERT expects
        `ALTER TABLE fairRolls ADD COLUMN IF NOT EXISTS serverSeed varchar(255) NOT NULL DEFAULT '' AFTER id`,
        `ALTER TABLE fairRolls ADD COLUMN IF NOT EXISTS clientSeed varchar(255) NOT NULL DEFAULT '' AFTER serverSeed`,
        // discordAuths: add all columns that getExistingAuth/INSERT expect
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS discordId varchar(32) NULL DEFAULT NULL AFTER userId`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS token varchar(512) NULL DEFAULT NULL`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS tokenExpiresAt datetime NULL DEFAULT NULL`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS refreshToken varchar(512) NULL DEFAULT NULL`,
    ];

    for (const q of alters) {
        try {
            await sql.query(q);
            console.log('OK:', q.slice(0, 70));
        } catch (e) {
            console.log('SKIP:', e.message.slice(0, 100));
        }
    }

    // Verify
    const [fr] = await sql.query('DESCRIBE fairRolls');
    console.log('\nfairRolls columns:', fr.map(c => c.Field).join(', '));
    const [da] = await sql.query('DESCRIBE discordAuths');
    console.log('discordAuths columns:', da.map(c => c.Field).join(', '));

    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
