const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const { sql, doTransaction } = require('../../../database');
const { isAuthed, apiLimiter, validateJwtToken, getReqToken } = require('../../auth/functions');
const { roundDecimal, sendLog } = require('../../../utils');
const { bannedPhrases } = require('../../admin/config');
const { getCatalogItems, getItemById } = require('../../../utils/csgo/items');
const { cacheCases } = require('./functions');

const io = require('../../../socketio/server');

const communityConfig = {
    houseEdge: 0.05,
    minCommissionPct: 0,
    maxCommissionPct: 5,
    minItems: 2,
    maxItems: 20,
    maxCasesPerCreator: 10,
    nameMinLength: 10,
    nameMaxLength: 32,
    earningsExpiryDays: 7,
    minCasePrice: 0.1
};

// Whitelist of selectable case images (served from /public/cases)
const caseImages = fs.readdirSync(path.join(__dirname, '../../../public/cases'))
    .filter(f => f.endsWith('.png'))
    .sort();

function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

const earnedSubquery = '(SELECT COALESCE(SUM(amount), 0) FROM communityCaseEarnings WHERE caseId = c.id)';

router.get('/', async (req, res) => {

    try {

        const [cases] = await sql.query(`
            SELECT c.id, c.name, c.slug, c.img, c.openCount, c.likeCount, c.commissionPct, cv.price,
            u.username as creatorName, ${earnedSubquery} as earned
            FROM cases c
            INNER JOIN caseVersions cv ON c.id = cv.caseId AND cv.endedAt IS NULL
            INNER JOIN users u ON u.id = c.creatorId
            WHERE c.creatorId IS NOT NULL
            ORDER BY c.openCount DESC LIMIT 200
        `);

        // Soft auth - include which cases this user has liked
        let likedCaseIds = [];
        const token = getReqToken(req);
        const auth = token ? validateJwtToken(token) : null;

        if (auth?.uid && cases.length) {
            const [likes] = await sql.query('SELECT caseId FROM caseLikes WHERE userId = ? AND caseId IN (?)', [auth.uid, cases.map(c => c.id)]);
            likedCaseIds = likes.map(l => l.caseId);
        }

        res.json({ cases, likedCaseIds, config: { commissionOptions: [0.5, 1, 2, 3, 5], maxItems: communityConfig.maxItems } });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.get('/images', (req, res) => {
    res.json(caseImages);
});

router.get('/items', async (req, res) => {

    try {

        const search = String(req.query.search || '').toLowerCase().slice(0, 64);
        const sort = req.query.sort === 'desc' ? 'desc' : 'asc';
        const offset = Math.max(0, parseInt(req.query.offset) || 0);
        const limit = 60;

        let list = getCatalogItems().filter(e => e.price > 0);
        if (search) list = list.filter(e => e.name?.toLowerCase().includes(search));
        list.sort((a, b) => sort === 'asc' ? a.price - b.price : b.price - a.price);

        res.json({
            total: list.length,
            items: list.slice(offset, offset + limit).map(e => ({
                id: e.itemId,
                name: e.name,
                type: e.type,
                img: e.img,
                price: e.price
            }))
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.get('/mine', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const [cases] = await sql.query(`
            SELECT c.id, c.name, c.slug, c.img, c.openCount, c.likeCount, c.commissionPct, cv.price,
            ${earnedSubquery} as earned
            FROM cases c
            INNER JOIN caseVersions cv ON c.id = cv.caseId AND cv.endedAt IS NULL
            WHERE c.creatorId = ?
            ORDER BY c.openCount DESC
        `, [req.userId]);

        const [[earnings]] = await sql.query(`
            SELECT
                COALESCE(SUM(CASE WHEN claimedAt IS NULL AND expiresAt > NOW() THEN amount END), 0) as available,
                COALESCE(SUM(amount), 0) as total
            FROM communityCaseEarnings WHERE creatorId = ?
        `, [req.userId]);

        const mostOpened = cases.slice().sort((a, b) => b.openCount - a.openCount)[0] || null;
        const mostLiked = cases.slice().sort((a, b) => b.likeCount - a.likeCount)[0] || null;

        res.json({
            cases,
            totalOpenings: cases.reduce((total, c) => total + c.openCount, 0),
            totalEarnings: roundDecimal(earnings.total),
            availableEarnings: roundDecimal(earnings.available),
            mostOpened: mostOpened ? { name: mostOpened.name, slug: mostOpened.slug, img: mostOpened.img } : null,
            mostLiked: mostLiked ? { name: mostLiked.name, slug: mostLiked.slug, img: mostLiked.img } : null
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/create', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
        if (name.length < communityConfig.nameMinLength || name.length > communityConfig.nameMaxLength) return res.status(400).json({ error: 'INVALID_NAME_LENGTH' });
        if (!/^[a-zA-Z0-9 x'&!._-]+$/.test(name)) return res.status(400).json({ error: 'INVALID_NAME_CHARACTERS' });

        const bannedWords = Object.values(bannedPhrases).map(e => e.toLowerCase());
        if (bannedWords.some(e => name.toLowerCase().includes(e))) return res.status(400).json({ error: 'NAME_NOT_ALLOWED' });

        const img = String(req.body.img || '');
        if (!caseImages.includes(img)) return res.status(400).json({ error: 'INVALID_IMAGE' });

        const commissionPct = Number(req.body.commissionPct);
        if (!Number.isFinite(commissionPct) || commissionPct < communityConfig.minCommissionPct || commissionPct > communityConfig.maxCommissionPct) {
            return res.status(400).json({ error: 'INVALID_COMMISSION' });
        }

        const rawItems = req.body.items;
        if (!Array.isArray(rawItems) || rawItems.length < communityConfig.minItems || rawItems.length > communityConfig.maxItems) {
            return res.status(400).json({ error: 'INVALID_ITEMS_AMOUNT' });
        }

        const seenIds = new Set();
        const items = [];

        for (const rawItem of rawItems) {

            const catalogItem = getItemById(String(rawItem?.id || ''));
            if (!catalogItem || !(catalogItem.price > 0)) return res.status(400).json({ error: 'INVALID_ITEM' });
            if (seenIds.has(catalogItem.itemId)) return res.status(400).json({ error: 'DUPLICATE_ITEM' });
            seenIds.add(catalogItem.itemId);

            const probability = Number(rawItem?.probability);
            if (!Number.isFinite(probability) || probability < 0.001 || probability > 99.999) return res.status(400).json({ error: 'INVALID_PROBABILITY' });

            items.push({
                itemId: catalogItem.itemId,
                name: catalogItem.name,
                img: catalogItem.img,
                price: catalogItem.price,
                probability,
                rangeWidth: Math.round(probability * 1000)
            });

        }

        const probabilitySum = items.reduce((total, item) => total + item.probability, 0);
        if (Math.abs(probabilitySum - 100) > 0.011) return res.status(400).json({ error: 'PROBABILITIES_MUST_SUM_100' });

        if (items.some(item => item.rangeWidth < 1)) return res.status(400).json({ error: 'INVALID_PROBABILITY' });

        // Pad rounding drift onto the widest range so widths total exactly 100000
        const widthSum = items.reduce((total, item) => total + item.rangeWidth, 0);
        const widest = items.reduce((a, b) => (b.rangeWidth > a.rangeWidth ? b : a));
        widest.rangeWidth += 100000 - widthSum;
        if (widest.rangeWidth < 1) return res.status(400).json({ error: 'INVALID_PROBABILITY' });

        // Sort by price descending (matches official cases) and assign ranges
        items.sort((a, b) => b.price - a.price);

        let rangeStart = 1;
        for (const item of items) {
            item.rangeFrom = rangeStart;
            item.rangeTo = rangeStart + item.rangeWidth - 1;
            rangeStart = item.rangeTo + 1;
        }

        const ev = items.reduce((total, item) => total + item.price * (item.rangeWidth / 100000), 0);
        const price = roundDecimal(ev * (1 + communityConfig.houseEdge + commissionPct / 100));
        if (price < communityConfig.minCasePrice) return res.status(400).json({ error: 'CASE_PRICE_TOO_LOW' });

        const slug = 'c-' + slugify(name);
        if (slug.length < 4) return res.status(400).json({ error: 'INVALID_NAME_CHARACTERS' });

        let created = false;

        await doTransaction(async (connection, commit) => {

            const [[{ myCases }]] = await connection.query(
                'SELECT COUNT(*) as myCases FROM cases WHERE creatorId = ?',
                [req.userId]
            );

            if (myCases >= communityConfig.maxCasesPerCreator) return res.status(400).json({ error: 'MAX_CASES_REACHED' });

            const [[existing]] = await connection.query('SELECT id FROM cases WHERE slug = ? OR name = ? LIMIT 1', [slug, name]);
            if (existing) return res.status(400).json({ error: 'NAME_ALREADY_USED' });

            const [caseResult] = await connection.query(
                'INSERT INTO cases (name, slug, img, creatorId, commissionPct) VALUES (?, ?, ?, ?, ?)',
                [name, slug, `/public/cases/${img}`, req.userId, commissionPct]
            );

            const [versionResult] = await connection.query(
                'INSERT INTO caseVersions (caseId, price) VALUES (?, ?)',
                [caseResult.insertId, price]
            );

            await connection.query(
                'INSERT INTO caseItems (caseVersionId, itemId, name, img, price, rangeFrom, rangeTo) VALUES ?',
                [items.map(item => [versionResult.insertId, item.itemId, item.name, item.img, item.price, item.rangeFrom, item.rangeTo])]
            );

            await commit();
            created = true;

            res.json({ success: true, slug, price });

            sendLog('admin', `*${req.userId}* created community case *${name}* (\`${slug}\`) - ${price} coins, ${commissionPct}% commission`);

        });

        if (created) await cacheCases();

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/claim', [isAuthed, apiLimiter], async (req, res) => {

    try {

        await doTransaction(async (connection, commit) => {

            const [[user]] = await connection.query('SELECT id, username, balance FROM users WHERE id = ? FOR UPDATE', [req.userId]);

            const [[{ amount }]] = await connection.query(
                'SELECT COALESCE(SUM(amount), 0) as amount FROM communityCaseEarnings WHERE creatorId = ? AND claimedAt IS NULL AND expiresAt > NOW() FOR UPDATE',
                [req.userId]
            );

            const claimable = roundDecimal(amount);
            if (claimable < 0.01) return res.status(400).json({ error: 'NOTHING_TO_CLAIM' });

            await connection.query(
                'UPDATE communityCaseEarnings SET claimedAt = NOW() WHERE creatorId = ? AND claimedAt IS NULL AND expiresAt > NOW()',
                [req.userId]
            );

            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [claimable, user.id]);
            await connection.query('INSERT INTO transactions (userId, amount, type, method) VALUES (?, ?, ?, ?)', [user.id, claimable, 'in', 'case-earnings']);

            await commit();
            io.to(user.id).emit('balance', 'set', roundDecimal(user.balance + claimable));

            res.json({ success: true, amount: claimable });

            sendLog('rakeback', `*${user.username}* (\`${user.id}\`) claimed ${claimable} coins of community case earnings`);

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/:id/like', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const caseId = parseInt(req.params.id);
        if (!caseId) return res.status(400).json({ error: 'INVALID_CASE' });

        const [[caseInfo]] = await sql.query('SELECT id FROM cases WHERE id = ? AND creatorId IS NOT NULL', [caseId]);
        if (!caseInfo) return res.status(404).json({ error: 'NOT_FOUND' });

        const [deleted] = await sql.query('DELETE FROM caseLikes WHERE caseId = ? AND userId = ?', [caseId, req.userId]);

        let liked;
        if (deleted.affectedRows) {
            liked = false;
            await sql.query('UPDATE cases SET likeCount = GREATEST(likeCount, 1) - 1 WHERE id = ?', [caseId]);
        } else {
            liked = true;
            await sql.query('INSERT INTO caseLikes (caseId, userId) VALUES (?, ?)', [caseId, req.userId]);
            await sql.query('UPDATE cases SET likeCount = likeCount + 1 WHERE id = ?', [caseId]);
        }

        const [[{ likeCount }]] = await sql.query('SELECT likeCount FROM cases WHERE id = ?', [caseId]);
        res.json({ liked, likeCount });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

module.exports = {
    router,
    communityConfig
};
