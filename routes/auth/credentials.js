const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { sql, doTransaction } = require('../../database');

async function ensureEmailAccounts() {
    await sql.query(`CREATE TABLE IF NOT EXISTS emailAccounts (
        userId BIGINT NOT NULL PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE
    )`);
}
function normalizeEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
async function registerEmail({email, username, password}) {
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = BigInt('0x' + randomBytes(7).toString('hex')).toString();
    return doTransaction(async (connection, commit) => {
        const [[existing]] = await connection.query('SELECT userId FROM emailAccounts WHERE email = ?', [email]);
        if (existing) return { error: 'EMAIL_IN_USE' };
        const [[nameTaken]] = await connection.query('SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1', [username.toLowerCase()]);
        if (nameTaken) return { error: 'USERNAME_IN_USE' };
        await connection.query('INSERT INTO users (id, username, passwordHash) VALUES (?, ?, ?)', [userId, username, passwordHash]);
        await connection.query('INSERT INTO emailAccounts (userId, email) VALUES (?, ?)', [userId, email]);
        await commit();
        return { userId, username };
    });
}
const rateLimit = require('express-rate-limit');
function credentialLimiter(limit) {
    const ttl = 15 * 60 * 1000;
    const memory = rateLimit({ windowMs: ttl, max: limit, message: {error:'SLOW_DOWN'}, standardHeaders: true, legacyHeaders: false });
    return async (req, res, next) => {
        if (!require('../../runtime/context').enabled) return memory(req, res, next);
        const store = require('../../runtime/kv');
        const key = `${req.path}:${req.ip}`;
        const entry = await store.get('credential-attempts', key) || {count:0, until:Date.now()+ttl};
        if (entry.count >= limit) return res.status(429).json({error:'SLOW_DOWN'});
        entry.count++;
        await store.set('credential-attempts', key, entry, entry.until-Date.now());
        next();
    };
}
module.exports = { ensureEmailAccounts, normalizeEmail, registerEmail, credentialLimiter };
