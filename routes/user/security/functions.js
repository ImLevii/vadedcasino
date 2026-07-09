const { sql } = require('../../../database');
const { validateJwtToken, getReqToken } = require('../../auth/functions');

// userId -> selfLockUntil timestamp (ms) or Infinity for permanent. Cached to avoid a DB hit on every game request.
const selfLockCache = new Map();
const CACHE_TTL = 60 * 1000;

async function getSelfLockUntil(userId) {

    const cached = selfLockCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.until;

    const [[user]] = await sql.query('SELECT selfLockUntil FROM users WHERE id = ?', [userId]);
    const until = user?.selfLockUntil ? new Date(user.selfLockUntil).getTime() : 0;

    selfLockCache.set(userId, { until, fetchedAt: Date.now() });
    return until;

}

function updateSelfLockCache(userId, until) {
    selfLockCache.set(userId, { until, fetchedAt: Date.now() });
}

// Blocks betting endpoints (POST on game routes) for self-excluded users.
async function selfLockGuard(req, res, next) {

    if (req.method !== 'POST') return next();

    try {

        const token = getReqToken(req);
        if (!token) return next();

        const valid = validateJwtToken(token);
        if (!valid) return next();

        const until = await getSelfLockUntil(valid.uid);
        if (until > Date.now()) return res.status(403).json({ error: 'SELF_LOCKED', until });

        next();

    } catch (e) {
        console.error(e);
        next();
    }

}

module.exports = {
    getSelfLockUntil,
    updateSelfLockCache,
    selfLockGuard
};
