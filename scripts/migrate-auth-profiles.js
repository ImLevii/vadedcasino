const { sql } = require('../database');

async function main() {
    const [columns] = await sql.query('DESCRIBE users');
    if (!columns.some(column => column.Field === 'avatarUrl')) {
        await sql.query('ALTER TABLE users ADD COLUMN avatarUrl TEXT DEFAULT NULL');
    }
    console.log('Provider profile schema is ready.');
    await sql.end();
}

main().catch(error => {
    console.error('Provider profile migration failed:', error.code || error.message);
    process.exit(1);
});
