const express = require('express');

const { sql } = require('../../../database');

const router = express.Router();
const resultsPerPage = 25;
const ALLOWED_STATUSES = new Set(['initiating', 'pending', 'hold', 'unknown', 'completed', 'failed', 'cancelled', 'expired']);

router.get('/', async (req, res) => {
    const pageValue = parseInt(req.query.page);
    const page = !isNaN(pageValue) && pageValue > 0 ? pageValue : 1;
    const offset = (page - 1) * resultsPerPage;
    const type = req.query.type;
    const status = req.query.status;
    const search = req.query.search;

    if (type && !['deposit', 'withdrawal'].includes(type)) return res.status(400).json({ error: 'INVALID_TRANSACTION_TYPE' });
    if (status && !ALLOWED_STATUSES.has(status)) return res.status(400).json({ error: 'INVALID_TRANSACTION_STATUS' });
    if (search && (typeof search !== 'string' || search.length > 64)) return res.status(400).json({ error: 'INVALID_SEARCH' });

    const clauses = ["pt.provider = 'skindeck'"];
    const args = [];
    if (type) {
        clauses.push('pt.type = ?');
        args.push(type);
    }
    if (status) {
        clauses.push('pt.status = ?');
        args.push(status);
    }
    if (search) {
        clauses.push('(LOWER(u.username) LIKE ? OR pt.providerRef = ? OR pt.internalRef = ?)');
        args.push(`%${search.toLowerCase()}%`, search, search);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;
    const [[{ total }]] = await sql.query(
        `SELECT COUNT(*) AS total FROM paymentTransactions pt JOIN users u ON u.id = pt.userId ${where}`,
        args
    );
    const pages = total ? Math.ceil(total / resultsPerPage) : 0;
    if (pages && page > pages) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });

    const [data] = await sql.query(
        `SELECT pt.id, pt.internalRef, pt.providerRef, pt.type, pt.status, pt.providerStatus,
                pt.skinItems, pt.value, pt.providerValue, pt.providerCurrency, pt.lastError,
                pt.createdAt, pt.updatedAt, pt.finalizedAt,
                u.id AS userId, u.username, u.role, u.xp
         FROM paymentTransactions pt JOIN users u ON u.id = pt.userId
         ${where} ORDER BY pt.id DESC LIMIT ? OFFSET ?`,
        args.concat([resultsPerPage, offset])
    );

    res.json({ page, pages, total, data });
});

module.exports = router;