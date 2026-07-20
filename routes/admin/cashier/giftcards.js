const express = require('express');
const { sql } = require('../../../database');
const { sendLog } = require('../../../utils');

const router = express.Router();

const resultsPerPage = 20;

// GET /admin/cashier/giftcards - List all giftcards with pagination
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * resultsPerPage;
        const search = req.query.search || '';
        const status = req.query.status || ''; // 'active' | 'redeemed' | ''

        let where = '';
        const params = [];

        if (search) {
            where += ' AND g.code LIKE ?';
            params.push(`%${search}%`);
        }

        if (status === 'active') {
            where += ' AND g.redeemedAt IS NULL';
        } else if (status === 'redeemed') {
            where += ' AND g.redeemedAt IS NOT NULL';
        }

        const countSql = `SELECT COUNT(*) AS total FROM giftCards g WHERE 1=1 ${where}`;
        const [[{ total }]] = await sql.query(countSql, params);
        const pages = Math.max(1, Math.ceil(total / resultsPerPage));

        const dataSql = `
            SELECT g.id, g.code, g.amount, g.usd, g.redeemedAt, g.redeemedBy, g.notes,
                   u.username AS redeemedByUsername
            FROM giftCards g
            LEFT JOIN users u ON u.id = g.redeemedBy
            WHERE 1=1 ${where}
            ORDER BY g.id DESC
            LIMIT ? OFFSET ?
        `;
        const [data] = await sql.query(dataSql, [...params, resultsPerPage, offset]);

        res.json({ success: true, data, pages, total });
    } catch (e) {
        console.error('Error fetching giftcards:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// PUT /admin/cashier/giftcards/:id - Edit a giftcard (notes, amount)
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id) return res.status(400).json({ error: 'INVALID_ID' });

        const { amount, notes } = req.body;

        const [[card]] = await sql.query('SELECT * FROM giftCards WHERE id = ?', [id]);
        if (!card) return res.status(404).json({ error: 'NOT_FOUND' });

        if (amount !== undefined) {
            const amt = parseInt(amount);
            if (!Number.isInteger(amt) || amt < 1 || amt > 10000) {
                return res.status(400).json({ error: 'INVALID_AMOUNT' });
            }
            await sql.query('UPDATE giftCards SET amount = ? WHERE id = ?', [amt, id]);
        }

        if (notes !== undefined) {
            await sql.query('UPDATE giftCards SET notes = ? WHERE id = ?', [notes, id]);
        }

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* edited giftcard #\`${id}\``);
        res.json({ success: true });
    } catch (e) {
        console.error('Error editing giftcard:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// DELETE /admin/cashier/giftcards/:id - Delete a giftcard
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id) return res.status(400).json({ error: 'INVALID_ID' });

        const [[card]] = await sql.query('SELECT * FROM giftCards WHERE id = ?', [id]);
        if (!card) return res.status(404).json({ error: 'NOT_FOUND' });

        await sql.query('DELETE FROM giftCards WHERE id = ?', [id]);

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* deleted giftcard #\`${id}\` (code: \`${card.code}\`)`);
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting giftcard:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

module.exports = router;