const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { saveProviderProfile } = require('./profiles');
const { authUrls, beginAuth, validateAuth } = require('./redirects');
const { ensureEmailAccounts, normalizeEmail, registerEmail, credentialLimiter } = require('./credentials');

const { sql } = require('../../database');
const { isAuthed, generateJwtToken, expiresIn, apiLimiter } = require('./functions');
const { bannedUsers, lastLogouts } = require('../admin/config');

const router = express.Router();

async function ensureCredentialColumns() {
    const [columns] = await sql.query('DESCRIBE users');
    const existing = new Set(columns.map(column => column.Field));
    const missing = [
        ['passwordHash', 'VARCHAR(255) DEFAULT NULL'],
        ['role', "VARCHAR(16) NOT NULL DEFAULT 'USER'"],
        ['perms', 'TINYINT UNSIGNED NOT NULL DEFAULT 0']
    ].filter(([column]) => !existing.has(column));

    for (const [column, definition] of missing) {
        await sql.query(`ALTER TABLE users ADD COLUMN \`${column}\` ${definition}`);
    }
}

async function findCredentialUser(username) {
    const query = username.includes('@')
        ? 'SELECT users.id, users.username, users.passwordHash, users.banned, users.deletedAt FROM users JOIN emailAccounts ON emailAccounts.userId = users.id WHERE emailAccounts.email = ? LIMIT 1'
        : 'SELECT id, username, passwordHash, banned, deletedAt FROM users WHERE LOWER(username) = ? AND passwordHash IS NOT NULL LIMIT 1';
    try {
        const [[user]] = await sql.query(query, [username.toLowerCase()]);
        return user;
    } catch (error) {
        if (error.code !== 'ER_BAD_FIELD_ERROR' && error.code !== 'SQLITE_ERROR') throw error;
        await ensureCredentialColumns();
        const [[user]] = await sql.query(query, [username.toLowerCase()]);
        return user;
    }
}

function publicBaseUrl(req) {
    return authUrls(req).base;
}

function frontendUrl(req) {
    return authUrls(req).frontend;
}

function cookieOptions() {
    return {
        maxAge: expiresIn * 1000,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    };
}

function finishLogin(res, userId, username) {
    const token = generateJwtToken(userId);
    res.cookie('jwt', token, cookieOptions());
    return res.json({ token, expiresIn, userId: `${userId}`, username });
}

router.get('/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return res.redirect(`${frontendUrl(req)}/?modal=login&error=google_unavailable`);

    const redirectUri = `${publicBaseUrl(req)}/auth/google/callback`;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account'
    });
    params.set('state', beginAuth(res, 'google'));
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
    const destination = frontendUrl(req);
    if (!validateAuth(req, res, 'google')) return res.redirect(`${destination}/?modal=login&error=auth_expired`);
    const { code } = req.query;
    if (!code) return res.redirect(`${destination}/?modal=login&error=google_denied`);

    try {
        const redirectUri = `${publicBaseUrl(req)}/auth/google/callback`;
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 8000
        });

        const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
            timeout: 5000
        });
        const { id: googleId, name, email, picture } = profileResponse.data;
        if (!googleId) return res.redirect(`${destination}/?modal=login&error=google_invalid`);

        const userId = await saveProviderProfile(sql, 'google', googleId, {
            username: name?.trim() || email?.split('@')[0],
            avatarUrl: picture
        });

        const token = generateJwtToken(userId);
        res.cookie('jwt', token, cookieOptions());
        return res.redirect(`${destination}/`);
    } catch (error) {
        console.error('Google auth error:', error.message);
        return res.redirect(`${destination}/?modal=login&error=google_error`);
    }
});

router.get('/steam', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    const state = beginAuth(res, 'steam');
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': `${baseUrl}/auth/steam/callback?state=${state}`,
        'openid.realm': baseUrl,
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select'
    });
    res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
});

router.get('/steam/callback', async (req, res) => {
    const destination = frontendUrl(req);
    if (!validateAuth(req, res, 'steam')) return res.redirect(`${destination}/?modal=login&error=auth_expired`);
    if (req.query['openid.mode'] === 'cancel') return res.redirect(`${destination}/?modal=login&error=steam_denied`);
    try {
        const claimedId = req.query['openid.claimed_id'];
        const returnTo = `${publicBaseUrl(req)}/auth/steam/callback?state=${req.query.state}`;
        if (typeof claimedId !== 'string' || !/^https:\/\/steamcommunity\.com\/openid\/id\/\d{17}$/.test(claimedId)
            || req.query['openid.identity'] !== claimedId || req.query['openid.return_to'] !== returnTo
            || req.query['openid.mode'] !== 'id_res') {
            return res.redirect(`${destination}/?modal=login&error=steam_invalid`);
        }
        const verification = new URLSearchParams(Object.entries(req.query).filter(([key, value]) => key.startsWith('openid.') && typeof value === 'string'));
        verification.set('openid.mode', 'check_authentication');
        const verificationResponse = await axios.post('https://steamcommunity.com/openid/login', verification.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 8000
        });
        if (!verificationResponse.data.includes('is_valid:true')) {
            return res.redirect(`${destination}/?modal=login&error=steam_invalid`);
        }

        const steamId = (req.query['openid.claimed_id'] || '').split('/').pop();
        if (!steamId || !/^\d+$/.test(steamId)) {
            return res.redirect(`${destination}/?modal=login&error=steam_invalid`);
        }

        let profile;
        if (process.env.STEAM_API_KEY) {
            try {
                const profileResponse = await axios.get(
                    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`,
                    { timeout: 5000 }
                );
                profile = profileResponse.data?.response?.players?.find(player => player.steamid === steamId);
            } catch (_) {}
        }
        const userId = await saveProviderProfile(sql, 'steam', steamId, {
            username: profile?.personaname,
            avatarUrl: profile?.avatarfull || profile?.avatarmedium || profile?.avatar
        });

        const token = generateJwtToken(userId);
        res.cookie('jwt', token, cookieOptions());
        return res.redirect(`${destination}/`);
    } catch (error) {
        console.error('Steam auth error:', error.message);
        return res.redirect(`${destination}/?modal=login&error=steam_error`);
    }
});

router.post('/register', apiLimiter, credentialLimiter(5), async (req, res) => {
    try {
        const { username, password, agree } = req.body || {};
        const email = normalizeEmail(req.body?.email);
        if (!email) return res.status(400).json({error:'INVALID_EMAIL'});
        if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({error:'INVALID_SIGNUP_USERNAME'});
        if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({error:'INVALID_SIGNUP_PASSWORD'});
        if (agree !== true) return res.status(400).json({error:'TERMS_REQUIRED'});
        if (!require('../../runtime/context').enabled) { await ensureCredentialColumns(); await ensureEmailAccounts(); }
        const account = await registerEmail({email, username, password});
        if (account.error) return res.status(409).json(account);
        return finishLogin(res, account.userId, account.username);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') return res.status(409).json({error:'EMAIL_IN_USE'});
        console.error('Registration failed:', error.code || 'UNKNOWN');
        return res.status(500).json({error:'UNKNOWN_ERROR'});
    }
});

router.post('/login', apiLimiter, credentialLimiter(30), async (req, res) => {
    try {
        const { password } = req.body || {};
        const username = (req.body?.email || req.body?.username)?.trim?.();
        if (typeof username !== 'string' || username.length < 2 || username.length > 254) {
            return res.status(400).json({ error: 'INVALID_USERNAME' });
        }
        if (typeof password !== 'string' || password.length < 4 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'INVALID_PASSWORD' });
        }

        if (!require('../../runtime/context').enabled && username.includes('@')) await ensureEmailAccounts();
        const user = await findCredentialUser(username);
        if (!user?.passwordHash || user.deletedAt || user.banned || bannedUsers.has(user.id)) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        return finishLogin(res, user.id, user.username);
    } catch (error) {
        console.error('Credentials login failed:', error.code || 'UNKNOWN', error.message);
        return res.status(500).json({ error: 'UNKNOWN_ERROR' });
    }
});

router.post('/logout', isAuthed, async (req, res) => {
    await sql.query('UPDATE users SET lastLogout = NOW() WHERE id = ?', [req.userId]);
    lastLogouts[req.userId] = Date.now();
    res.clearCookie('jwt', cookieOptions());
    res.json({ success: true });
});

module.exports = router;
