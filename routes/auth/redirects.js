const { randomBytes, timingSafeEqual } = require('node:crypto');
const jwt = require('jsonwebtoken');

function requestOrigin(req, env = process.env) {
    return `${env.VERCEL === '1' ? 'https' : req.protocol}://${req.get('host')}`;
}
function authUrls(req, env = process.env) {
    const origin = requestOrigin(req, env);
    // Vercel serves the API and frontend on the same host. Never let a stale
    // development BASE_URL send a production authentication flow to localhost.
    if (env.VERCEL === '1') return { base: origin, frontend: origin };
    return { base: (env.BASE_URL || origin).replace(/\/+$/, ''), frontend: (env.FRONTEND_URL || origin).replace(/\/+$/, '') };
}
function stateOptions() {
    return { httpOnly: true, secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/auth', maxAge: 600000 };
}
function beginAuth(res, provider) {
    const state = randomBytes(24).toString('hex');
    const token = jwt.sign({ state, provider }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' });
    res.cookie(`oauth_${provider}`, token, stateOptions());
    return state;
}
function validateAuth(req, res, provider) {
    try {
        const data = jwt.verify(req.cookies?.[`oauth_${provider}`] || '', process.env.JWT_SECRET || 'secret');
        const state = req.query.state;
        if (data.provider !== provider || typeof state !== 'string' || state.length !== data.state.length) return false;
        if (!timingSafeEqual(Buffer.from(state), Buffer.from(data.state))) return false;
        res.clearCookie(`oauth_${provider}`, stateOptions());
        return true;
    } catch { return false; }
}
module.exports = { authUrls, beginAuth, validateAuth };
