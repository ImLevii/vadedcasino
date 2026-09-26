const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env.local') });
require('dotenv').config({ path: path.join(root, '.env') });
const { poolOptions } = require('../database/postgres');

async function main() {
    const checkOnly = process.argv.includes('--check');
    const connectionString = checkOnly ? process.env.DATABASE_URL : (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL);
    const pool = new Pool(poolOptions(connectionString));
    let client;
    try {
        client = await pool.connect();
        if (checkOnly) {
            await client.query('SELECT 1');
            const result = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
            console.log(`[db:neon] Connected successfully. Public tables: ${result.rows[0].count}`);
            return;
        }
        if (!!process.env.NEON_ADMIN_USERNAME !== !!process.env.NEON_ADMIN_PASSWORD) {
            throw new Error('Set both NEON_ADMIN_USERNAME and NEON_ADMIN_PASSWORD to create an admin, or leave both unset');
        }
        await client.query('BEGIN');
        try {
            await client.query('SELECT pg_advisory_xact_lock(738125920)');
            const schema = fs.readFileSync(path.join(root, 'database', 'schema.postgres.sql'), 'utf8');
            await client.query(schema);
            if (process.env.NEON_ADMIN_USERNAME) {
                const hash = await bcrypt.hash(process.env.NEON_ADMIN_PASSWORD, 10);
                // Never reset an existing account or password on subsequent runs.
                await client.query(
                    `INSERT INTO users (id, username, "passwordHash", role, perms) VALUES ($1, $2, $3, 'OWNER', 4) ON CONFLICT (id) DO NOTHING`,
                    ['9999999999', process.env.NEON_ADMIN_USERNAME, hash]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        console.log('[db:neon] Schema and seed settings applied successfully.');
        console.log('[db:neon] Set SQL_DIALECT=postgres and DATABASE_URL in .env.local to run the app on Neon.');
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

main().catch(error => {
    // Connection errors can contain credentials; log only known-safe guidance/codes.
    const message = /^(PostgreSQL requires|DATABASE_URL must|Set both NEON_ADMIN_)/.test(error.message)
        ? error.message : `Failed (${error.code || 'UNKNOWN'}). Check connection settings and the PostgreSQL schema.`;
    console.error('[db:neon]', message);
    process.exitCode = 1;
});
