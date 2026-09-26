const { sql } = require('../database');

async function main() {
    const [columns] = await sql.query('DESCRIBE users');
    for (const [name, type] of [['deletedAt', 'DATETIME'], ['deletedBy', 'BIGINT']]) {
        if (!columns.some(column => column.Field === name)) {
            await sql.query(`ALTER TABLE users ADD COLUMN ${name} ${type} DEFAULT NULL`);
        }
    }
    console.log('Account deletion schema is ready.');
    await sql.end();
}

main().catch(error => { console.error(error.code || error.message); process.exit(1); });
