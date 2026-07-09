require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const DEFAULT_ADMIN_ID = 9999999999;
const DEFAULT_ADMIN_USER = 'admin';
const DEFAULT_ADMIN_PASS = 'admin';

function envOrDefault(name, fallback) {
    const value = process.env[name];
    return value && String(value).trim() ? String(value).trim() : fallback;
}

async function applyCompatibilityFixes(connection) {
    const alters = [
        // Some older installs miss these columns while runtime INSERTs expect them.
        `ALTER TABLE fairRolls ADD COLUMN IF NOT EXISTS serverSeed varchar(255) NOT NULL DEFAULT '' AFTER id`,
        `ALTER TABLE fairRolls ADD COLUMN IF NOT EXISTS clientSeed varchar(255) NOT NULL DEFAULT '' AFTER serverSeed`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS discordId varchar(32) NULL DEFAULT NULL AFTER userId`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS token varchar(512) NULL DEFAULT NULL`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS tokenExpiresAt datetime NULL DEFAULT NULL`,
        `ALTER TABLE discordAuths ADD COLUMN IF NOT EXISTS refreshToken varchar(512) NULL DEFAULT NULL`,
    ];

    for (const statement of alters) {
        try {
            await connection.query(statement);
        } catch (error) {
            // Keep bootstrap resilient: unsupported IF NOT EXISTS or absent table is non-fatal.
            console.log('[db:bootstrap] Skipping compatibility alter:', error.message);
        }
    }
}

async function upsertAdmin(connection, username, password) {
    const hash = await bcrypt.hash(password, 10);

    await connection.query(
        `INSERT INTO users (id, username, passwordHash, role, perms, balance, xp, createdAt)
         VALUES (?, ?, ?, 'OWNER', 4, 0, 0, NOW())
         ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            passwordHash = VALUES(passwordHash),
            role = 'OWNER',
            perms = 4`,
        [DEFAULT_ADMIN_ID, username, hash]
    );
}

async function main() {
    const host = envOrDefault('SQL_HOST', 'localhost');
    const user = envOrDefault('SQL_USER', 'root');
    const password = envOrDefault('SQL_PASS', '');
    const database = envOrDefault('SQL_DB', 'cosmicluck_local');

    const usernameArg = process.argv[2];
    const passwordArg = process.argv[3];
    const adminUsername = usernameArg || DEFAULT_ADMIN_USER;
    const adminPassword = passwordArg || DEFAULT_ADMIN_PASS;

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    const connection = await mysql.createConnection({
        host,
        user,
        password,
        multipleStatements: true,
    });

    try {
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await connection.changeUser({database});

        await connection.query(schemaSQL);
        await applyCompatibilityFixes(connection);
        await upsertAdmin(connection, adminUsername, adminPassword);

        console.log('[db:bootstrap] Complete');
        console.log(`[db:bootstrap] Database: ${database}`);
        console.log(`[db:bootstrap] Admin: id=${DEFAULT_ADMIN_ID}, username=${adminUsername}`);
        console.log('[db:bootstrap] If SQL_DB was empty, set SQL_DB=' + database + ' in your env file for app runtime.');
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error('[db:bootstrap] Failed:', error);
    process.exit(1);
});
