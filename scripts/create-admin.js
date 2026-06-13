require('dotenv').config();
const bcrypt = require('bcrypt');
const { sql } = require('../database');

async function main() {
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin';
    const hash = await bcrypt.hash(password, 10);
    const id = 9999999999;

    await sql.query(
        `INSERT INTO users (id, username, passwordHash, role, perms, balance, xp, createdAt)
         VALUES (?, ?, ?, 'OWNER', 4, 0, 0, NOW())
         ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), role = 'OWNER', perms = 4`,
        [id, username, hash]
    );

    console.log(`Admin created: id=${id}, username=${username}`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
