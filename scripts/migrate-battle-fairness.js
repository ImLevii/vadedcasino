const fields = { randomTicket: 'VARCHAR(32) DEFAULT NULL', randomProof: 'TEXT DEFAULT NULL' };
async function migrate(query) {
    const [columns] = await query('DESCRIBE battles');
    for (const [name, definition] of Object.entries(fields)) {
        if (!columns.some(c => c.Field === name)) await query(`ALTER TABLE battles ADD COLUMN ${name} ${definition}`);
    }
}
if (require.main === module) {
    const { sql } = require('../database');
    migrate(sql.query.bind(sql)).then(() => { console.log('Battle fairness schema ready'); process.exit(0); })
        .catch(() => { console.error('Battle fairness migration failed'); process.exit(1); });
}
module.exports = { migrate };
