const express = require('express');
const rateLimit = require('express-rate-limit');

const { sql } = require('../../../database');
const io = require('../../../socketio/server');
const { isAuthed, apiLimiter } = require('../../auth/functions');
const { enabledFeatures } = require('../../admin/config');
const { getSkinDeckConfig } = require('./config');
const { isProviderContractReady } = require('./contract');
const { createSkinDeckClient } = require('./client');
const { logSkinDeck } = require('./logger');
const {
    createPaymentTransaction,
    reserveWithdrawal,
    settleDeposit,
    settleWithdrawal,
    updateProviderState,
    usdToCoins
} = require('./service');

const router = express.Router();
const resultsPerPage = 25;

const withdrawalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'TOO_MANY_ATTEMPTS' },
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => `skindeck-withdrawal:${req.userId || req.headers['cf-connecting-ip'] || req.ip}`
});

function getCapabilities() {
    const config = getSkinDeckConfig();
    const configured = config.mode === 'sandbox' || (!!config.apiKey && !!config.webhookSecret);
    const contractReady = isProviderContractReady(config.mode);

    return {
        enabled: config.enabled && !!enabledFeatures.skindeck && configured && contractReady,
        mode: config.mode,
        configured,
        contractReady
    };
}

function requireSkinDeck(req, res, next) {
    if (!getCapabilities().enabled) return res.status(400).json({ error: 'DISABLED' });
    next();
}

function requestOrigin(req) {
    return `${req.protocol}://${req.get('host')}`;
}

function frontendUrl() {
    return (process.env.FRONTEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
}

function sendSkinDeckError(res, error) {
    const code = error.code || 'SKINDECK_UNAVAILABLE';
    const unavailable = ['SKINDECK_CONTRACT_UNAVAILABLE', 'SKINDECK_CONFIG_ERROR'].includes(code);
    logSkinDeck('error', 'request_failed', { code, message: error.message });
    return res.status(unavailable ? 503 : 400).json({ error: code });
}

function checkoutHtml({ internalRef, token, items }) {
    const options = items.map(item =>
        `<label><input type="radio" name="itemId" value="${item.id}" required> ${item.name} - $${item.providerValue.toFixed(2)}</label>`
    ).join('');

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SkinDeck Sandbox Checkout</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090d14;color:#cbd3df;font-family:Arial,sans-serif}.checkout{width:min(520px,calc(100% - 32px));padding:28px;border:1px solid #263244;background:#101722}h1{margin:0 0 8px;color:#fff;font-size:24px}p{color:#8590a0}label{display:block;margin:10px 0;padding:14px;border:1px solid #283446;background:#0b111a}button{width:100%;height:44px;margin-top:18px;border:0;background:#1fd65f;color:#071109;font-weight:700;cursor:pointer}.tag{color:#1fd65f;font-size:11px;font-weight:700}
</style></head><body><main class="checkout"><span class="tag">SANDBOX ONLY</span><h1>Select test skins</h1><p>No Steam items or money move in this environment.</p><form method="post" action="/trading/skindeck/sandbox/deposits/${internalRef}/complete"><input type="hidden" name="token" value="${token}">${options}<button type="submit">COMPLETE TEST DEPOSIT</button></form></main></body></html>`;
}

function parsePage(value) {
    const page = parseInt(value);
    return !isNaN(page) && page > 0 ? page : 1;
}

function mapPayment(payment) {
    let skinItems = payment.skinItems;
    if (typeof skinItems === 'string') {
        try {
            skinItems = JSON.parse(skinItems);
        } catch (_) {
            skinItems = [];
        }
    }

    return {
        id: payment.id,
        type: payment.type,
        providerRef: payment.providerRef,
        status: payment.status,
        providerStatus: payment.providerStatus,
        skinItems: skinItems || [],
        value: payment.value,
        providerValue: payment.providerValue,
        providerCurrency: payment.providerCurrency,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    };
}

router.get('/capabilities', (req, res) => {
    const capabilities = getCapabilities();
    res.json({
        enabled: capabilities.enabled,
        mode: capabilities.mode
    });
});

router.get('/transactions', isAuthed, async (req, res) => {
    const type = req.query.type;
    if (type && !['deposit', 'withdrawal'].includes(type)) {
        return res.status(400).json({ error: 'INVALID_TRANSACTION_TYPE' });
    }

    const page = parsePage(req.query.page);
    const offset = (page - 1) * resultsPerPage;
    const typeSql = type ? ' AND type = ?' : '';
    const args = type ? [req.userId, type] : [req.userId];

    const [[{ total }]] = await sql.query(
        `SELECT COUNT(*) AS total FROM paymentTransactions WHERE userId = ? AND provider = 'skindeck'${typeSql}`,
        args
    );
    const pages = total ? Math.ceil(total / resultsPerPage) : 0;
    if (pages && page > pages) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });

    const [data] = await sql.query(
        `SELECT id, type, providerRef, status, providerStatus, skinItems, value, providerValue,
                providerCurrency, createdAt, updatedAt
         FROM paymentTransactions
         WHERE userId = ? AND provider = 'skindeck'${typeSql}
         ORDER BY id DESC LIMIT ? OFFSET ?`,
        args.concat([resultsPerPage, offset])
    );

    res.json({ page, pages, total, data: data.map(mapPayment) });
});

router.post('/webhook', async (req, res) => {
    try {
        const client = createSkinDeckClient();
        const event = client.parseWebhook(req.rawJsonBody, req.header('x-skindeck-signature'));
        const settle = event.type === 'deposit' ? settleDeposit : event.type === 'withdrawal' ? settleWithdrawal : null;
        if (!settle) return res.status(400).json({ error: 'INVALID_EVENT_TYPE' });

        const result = await settle(event);
        if (!result) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });
        if (result.balanceDelta) io.to(`${result.payment.userId}`).emit('balance', 'add', result.balanceDelta);
        logSkinDeck('info', 'webhook_processed', { type: event.type, status: event.status, duplicate: result.duplicate });
        return res.json({ success: true, duplicate: result.duplicate });
    } catch (error) {
        return sendSkinDeckError(res, error);
    }
});

router.post('/deposits', isAuthed, apiLimiter, requireSkinDeck, async (req, res) => {
    const payment = await createPaymentTransaction(req.userId, 'deposit');

    try {
        const client = createSkinDeckClient();
        const session = await client.createDeposit({
            internalRef: payment.internalRef,
            userId: req.userId,
            origin: requestOrigin(req)
        });
        await updateProviderState({
            internalRef: payment.internalRef,
            providerRef: session.providerRef,
            providerStatus: session.providerStatus,
            status: session.status
        });
        logSkinDeck('info', 'deposit_created', { userId: req.userId, internalRef: payment.internalRef });
        return res.status(201).json({
            id: payment.id,
            status: session.status,
            redirectUrl: session.redirectUrl
        });
    } catch (error) {
        await updateProviderState({
            internalRef: payment.internalRef,
            providerStatus: 'request-failed',
            status: 'failed',
            lastError: error.message
        });
        return sendSkinDeckError(res, error);
    }
});

router.get('/skins', isAuthed, requireSkinDeck, async (req, res) => {
    try {
        const client = createSkinDeckClient();
        const items = (await client.listSkins()).map(item => ({
            id: item.id,
            name: item.name,
            image: item.image,
            value: usdToCoins(item.providerValue)
        }));
        return res.json({ items });
    } catch (error) {
        return sendSkinDeckError(res, error);
    }
});

router.post('/withdrawals', isAuthed, apiLimiter, withdrawalLimiter, requireSkinDeck, async (req, res) => {
    let payment;
    try {
        const client = createSkinDeckClient();
        const quote = await client.quoteItems(req.body?.itemIds);
        payment = await reserveWithdrawal({
            userId: req.userId,
            value: usdToCoins(quote.providerValue),
            providerValue: quote.providerValue,
            providerCurrency: quote.providerCurrency,
            skinItems: quote.items
        });

        const order = await client.createWithdrawal({ internalRef: payment.internalRef, itemIds: req.body.itemIds });
        const result = await settleWithdrawal({
            internalRef: payment.internalRef,
            providerRef: order.providerRef,
            providerStatus: order.providerStatus,
            status: order.status,
            skinItems: order.items
        });
        io.to(`${req.userId}`).emit('balance', 'add', -payment.value);
        logSkinDeck('info', 'withdrawal_created', { userId: req.userId, internalRef: payment.internalRef, status: order.status });
        return res.status(201).json({ success: true, transaction: { ...payment, status: result.payment.status, skinItems: order.items } });
    } catch (error) {
        if (payment) {
            const refunded = await settleWithdrawal({
                internalRef: payment.internalRef,
                providerStatus: 'request-failed',
                status: 'failed'
            });
            if (refunded?.balanceDelta) io.to(`${req.userId}`).emit('balance', 'add', refunded.balanceDelta);
        }
        return sendSkinDeckError(res, error);
    }
});

router.get('/sandbox/deposits/:internalRef', requireSkinDeck, async (req, res) => {
    try {
        const client = createSkinDeckClient();
        if (client.mode !== 'sandbox' || !client.verifyCheckout(req.params.internalRef, req.query.token)) {
            return res.status(403).send('Invalid sandbox checkout link.');
        }
        return res.type('html').send(checkoutHtml({
            internalRef: req.params.internalRef,
            token: req.query.token,
            items: await client.listSkins()
        }));
    } catch (error) {
        return sendSkinDeckError(res, error);
    }
});

router.post('/sandbox/deposits/:internalRef/complete', requireSkinDeck, async (req, res) => {
    try {
        const client = createSkinDeckClient();
        if (client.mode !== 'sandbox' || !client.verifyCheckout(req.params.internalRef, req.body?.token)) {
            return res.status(403).send('Invalid sandbox checkout link.');
        }

        const quote = await client.quoteItems([req.body?.itemId]);
        const result = await settleDeposit({
            internalRef: req.params.internalRef,
            providerRef: `sandbox-deposit-${req.params.internalRef}`,
            providerStatus: 'delivered',
            status: 'completed',
            skinItems: quote.items,
            providerValue: quote.providerValue,
            providerCurrency: quote.providerCurrency
        });
        if (!result) return res.status(404).send('Sandbox payment was not found.');
        if (result.balanceDelta) io.to(`${result.payment.userId}`).emit('balance', 'add', result.balanceDelta);
        return res.redirect(`${frontendUrl()}/deposit?type=skindeck&status=completed`);
    } catch (error) {
        return sendSkinDeckError(res, error);
    }
});

module.exports = router;