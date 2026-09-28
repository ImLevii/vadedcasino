const { createHash } = require('node:crypto');
const key = (scope, id) => scope + ':' + createHash('sha256').update(String(id)).digest('hex');
async function get(scope, id) {
    const { sql } = require('../database');
    const [[row]] = await sql.query('SELECT value FROM runtimeState WHERE id = ?', [key(scope, id)]);
    if (!row) return null;
    const entry = JSON.parse(row.value);
    return entry.expiresAt > Date.now() ? entry.data : null;
}
async function set(scope, id, data, ttl) {
    const { sql } = require('../database');
    await sql.query('INSERT INTO runtimeState (id, value) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value',
        [key(scope, id), JSON.stringify({ data, expiresAt: Date.now() + ttl })]);
}
async function remove(scope, id) {
    await require('../database').sql.query('DELETE FROM runtimeState WHERE id = ?', [key(scope, id)]);
}
module.exports = { get, set, remove };
