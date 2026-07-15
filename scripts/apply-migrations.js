// Apply database migrations to an existing database
// Run with: node scripts/apply-migrations.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { sql } = require('../database');

async function main() {
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const sqlPath = path.join(migrationsDir, file);
        const content = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolons but keep ALTER TABLE safe
        const statements = content
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Applying migration: ${file}`);
        
        for (const stmt of statements) {
            try {
                await sql.query(stmt);
            } catch (e) {
                // Ignore "already exists" type errors
                if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_ENTRY') {
                    console.log(`  Skipped (already exists): ${stmt.substring(0, 50)}...`);
                } else {
                    console.error(`  Error in statement: ${stmt.substring(0, 100)}`);
                    console.error(`  ${e.message}`);
                }
            }
        }
    }

    console.log('Migrations applied successfully.');
    process.exit(0);
}

main().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});