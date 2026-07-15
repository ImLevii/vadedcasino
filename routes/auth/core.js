const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { createHash } = require('crypto');

const { sql } = require('../../database');
const { isAuthed, generateJwtToken, expiresIn, apiLimiter } = require('./functions');
const { bannedUsers, lastLogouts } = require('../admin/config');

const router = express.Router();
const staffRoles = new Set(['ADMIN', 'OWNER', 'DEV']);

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
    const query = 'SELECT id, username, passwordHash, perms, role FROM users WHERE LOWER(username) = ? LIMIT 1';
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

function requestOrigin(req) {
    return `${req.protocol}://${req.get('host')}`;
}

function publicBaseUrl(req) {
    return process.env.BASE_URL || requestOrigin(req);
}

function frontendUrl(req) {
    return (process.env.FRONTEND_URL || requestOrigin(req)).replace(/\/$/, '');
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
    if (!clientId) return res.status(503).send('Google OAuth is not configured.');

    const redirectUri = `${publicBaseUrl(req)}/auth/google/callback`;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account'
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
    const destination = frontendUrl(req);
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
        const { id: googleId, name, email } = profileResponse.data;
        if (!googleId) return res.redirect(`${destination}/?modal=login&error=google_invalid`);

        const fallbackName = `User${googleId.slice(-6)}`;
        const username = (name || email?.split('@')[0] || fallbackName)
            .replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 20) || fallbackName;

        try {
            await sql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS googleId VARCHAR(64) DEFAULT NULL');
        } catch (_) {}

        const [[existing]] = await sql.query('SELECT id FROM users WHERE googleId = ?', [googleId]);
        const userId = existing?.id || BigInt(`0x${createHash('sha256').update(`google:${googleId}`).digest('hex').slice(0, 15)}`).toString();
        if (!existing) {
            await sql.query(
                'INSERT INTO users (id, username, googleId) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE googleId = VALUES(googleId)',
                [userId, username, googleId]
            );
        }

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
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': `${baseUrl}/auth/steam/callback`,
        'openid.realm': baseUrl,
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select'
    });
    res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
});

router.get('/steam/callback', async (req, res) => {
    const destination = frontendUrl(req);
    try {
        const verification = new URLSearchParams({ ...req.query, 'openid.mode': 'check_authentication' });
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

        let username = `Player${steamId.slice(-6)}`;
        if (process.env.STEAM_API_KEY) {
            try {
                const profileResponse = await axios.get(
                    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`,
                    { timeout: 5000 }
                );
                username = profileResponse.data?.response?.players?.[0]?.personaname || username;
            } catch (_) {}
        }
        username = username.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 20) || `Player${steamId.slice(-6)}`;

        try {
            await sql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS steamId VARCHAR(32) DEFAULT NULL');
        } catch (_) {}

        const [[existing]] = await sql.query('SELECT id FROM users WHERE steamId = ?', [steamId]);
        const userId = existing?.id || BigInt(`0x${createHash('sha256').update(`steam:${steamId}`).digest('hex').slice(0, 15)}`).toString();
        if (!existing) {
            await sql.query(
                'INSERT INTO users (id, username, steamId) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE steamId = VALUES(steamId)',
                [userId, username, steamId]
            );
        }

        const token = generateJwtToken(userId);
        res.cookie('jwt', token, cookieOptions());
        return res.redirect(`${destination}/`);
    } catch (error) {
        console.error('Steam auth error:', error.message);
        return res.redirect(`${destination}/?modal=login&error=steam_error`);
    }
});

router.post('/login', apiLimiter, async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (typeof username !== 'string' || username.length < 2 || username.length > 20) {
            return res.status(400).json({ error: 'INVALID_USERNAME' });
        }
        if (typeof password !== 'string' || password.length < 4 || password.length > 50) {
            return res.status(400).json({ error: 'INVALID_PASSWORD' });
        }

        const user = await findCredentialUser(username);
        if (!user?.passwordHash || bannedUsers.has(user.id)) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }
        if (user.perms < 1 && !staffRoles.has(user.role) && process.env.NODE_ENV !== 'production') {
            return res.status(401).json({ error: 'UNAUTHORIZED' });
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