require('dotenv').config();
const bcrypt = require('bcrypt');
const { sql } = require('../database');

async function main() {
    const username = process.argv[2];
    const password = process.argv[3];

    if (!username || !password) {
        console.log('Usage: node scripts/create-user.js <username> <password> [role]');
        console.log('Example: node scripts/create-user.js john mypassword USER');
        process.exit(1);
    }

    const role = process.argv[4] || 'USER';
    const hash = await bcrypt.hash(password, 10);
    const id = Date.now();

    await sql.query(
        `INSERT INTO users (id, username, passwordHash, role, perms, balance, xp, createdAt)
         VALUES (?, ?, ?, ?, 0, 0, 0, NOW())`,
        [id, username, hash, role]
    );

    console.log(`User created: id=${id}, username=${username}, role=${role}`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });