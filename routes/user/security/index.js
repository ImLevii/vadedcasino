const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');

const { sql } = require('../../../database');

const { isAuthed, apiLimiter } = require('../../auth/functions');
const { sendLog } = require('../../../utils');
const { updateSelfLockCache } = require('./functions');

// Pending 2FA setups - userId -> { secret, expiresAt }
const pending2faSetups = new Map();
const SETUP_TTL = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
    const now = Date.now();
    for (const [userId, setup] of pending2faSetups) {
        if (setup.expiresAt < now) pending2faSetups.delete(userId);
    }
}, 60 * 1000).unref();

router.post('/2fa/setup', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const [[user]] = await sql.query('SELECT id, username, `2fa` FROM users WHERE id = ?', [req.userId]);
        if (user['2fa']) return res.status(400).json({ error: '2FA_ALREADY_ENABLED' });

        const secret = speakeasy.generateSecret({
            length: 20,
            name: `CosmicLuck (${user.username})`
        });

        pending2faSetups.set(req.userId, { secret: secret.base32, expiresAt: Date.now() + SETUP_TTL });

        res.json({ success: true, secret: secret.base32, otpauthUrl: secret.otpauth_url });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/2fa/verify', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const token = req.body.token;
        if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return res.status(400).json({ error: 'INVALID_TOKEN' });

        const setup = pending2faSetups.get(req.userId);
        if (!setup || setup.expiresAt < Date.now()) return res.status(400).json({ error: 'NO_PENDING_SETUP' });

        const verified = speakeasy.totp.verify({
            secret: setup.secret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) return res.status(400).json({ error: 'INVALID_TOKEN' });

        await sql.query('UPDATE users SET `2fa` = ? WHERE id = ?', [setup.secret, req.userId]);
        pending2faSetups.delete(req.userId);

        res.json({ success: true });
        sendLog('admin', `User \`${req.userId}\` enabled 2FA`);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/2fa/disable', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const token = req.body.token;
        if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return res.status(400).json({ error: 'INVALID_TOKEN' });

        const [[user]] = await sql.query('SELECT id, `2fa` FROM users WHERE id = ?', [req.userId]);
        if (!user['2fa']) return res.status(400).json({ error: '2FA_NOT_ENABLED' });

        const verified = speakeasy.totp.verify({
            secret: user['2fa'],
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) return res.status(400).json({ error: 'INVALID_TOKEN' });

        await sql.query('UPDATE users SET `2fa` = NULL WHERE id = ?', [req.userId]);

        res.json({ success: true });
        sendLog('admin', `User \`${req.userId}\` disabled 2FA`);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

const tradeUrlRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;

router.post('/steam/trade-url', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const url = req.body.url;

        if (url === null || url === '') {
            await sql.query('UPDATE users SET steamTradeUrl = NULL WHERE id = ?', [req.userId]);
            return res.json({ success: true });
        }

        if (typeof url !== 'string' || url.length > 255 || !tradeUrlRegex.test(url)) return res.status(400).json({ error: 'INVALID_TRADE_URL' });

        await sql.query('UPDATE users SET steamTradeUrl = ? WHERE id = ?', [url, req.userId]);
        res.json({ success: true });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/steam/api-key', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const key = req.body.key;

        if (key === null || key === '') {
            await sql.query('UPDATE users SET steamApiKey = NULL WHERE id = ?', [req.userId]);
            return res.json({ success: true });
        }

        if (typeof key !== 'string' || !/^[A-F0-9]{32}$/i.test(key)) return res.status(400).json({ error: 'INVALID_API_KEY' });

        await sql.query('UPDATE users SET steamApiKey = ? WHERE id = ?', [key.toUpperCase(), req.userId]);
        res.json({ success: true });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

const lockDurations = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'permanent': 100 * 365 * 24 * 60 * 60 * 1000
};

router.post('/self-lock', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const duration = req.body.duration;
        if (typeof duration !== 'string' || !lockDurations[duration]) return res.status(400).json({ error: 'INVALID_DURATION' });

        const newUntil = Date.now() + lockDurations[duration];

        const [[user]] = await sql.query('SELECT id, username, selfLockUntil FROM users WHERE id = ?', [req.userId]);
        const currentUntil = user.selfLockUntil ? new Date(user.selfLockUntil).getTime() : 0;

        if (currentUntil >= newUntil) return res.status(400).json({ error: 'ALREADY_LOCKED_LONGER' });

        await sql.query('UPDATE users SET selfLockUntil = FROM_UNIXTIME(?) WHERE id = ?', [Math.floor(newUntil / 1000), req.userId]);
        updateSelfLockCache(req.userId, newUntil);

        res.json({ success: true, until: newUntil });
        sendLog('admin', `User *${user.username}* (\`${user.id}\`) self-locked their account for ${duration}`);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

module.exports = router;
