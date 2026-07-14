const express = require('express');
const rateLimit = require('express-rate-limit');

const { sql } = require('../../../database');
const { isAuthed, apiLimiter } = require('../../auth/functions');
const { enabledFeatures } = require('../../admin/config');
const { getSkinDeckConfig } = require('./config');
const { assertProviderContract, isProviderContractReady } = require('./contract');
const { logSkinDeck } = require('./logger');

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
    const configured = !!config.apiKey && !!config.webhookSecret;
    const contractReady = isProviderContractReady();

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

function failClosed(res) {
    try {
        assertProviderContract();
    } catch (error) {
        return res.status(503).json({ error: error.code || 'SKINDECK_UNAVAILABLE' });
    }
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

router.post('/webhook', (req, res) => {
    logSkinDeck('warn', 'webhook_rejected_contract_unavailable', {
        ip: req.headers['cf-connecting-ip'] || req.ip
    });
    return failClosed(res);
});

router.post('/deposits', isAuthed, apiLimiter, requireSkinDeck, (req, res) => {
    return failClosed(res);
});

router.get('/skins', isAuthed, requireSkinDeck, (req, res) => {
    return failClosed(res);
});

router.post('/withdrawals', isAuthed, apiLimiter, withdrawalLimiter, requireSkinDeck, (req, res) => {
    return failClosed(res);
});

module.exports = router;