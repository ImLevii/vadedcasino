const express = require('express');
const router = express.Router();
const { sql } = require('../../../database');

router.get('/', async (req, res) => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'DESC', page = 1, search } = req.query;
        const pageSize = 25;
        const offset = (parseInt(page) - 1) * pageSize;

        const allowedSorts = ['createdAt', 'amount', 'type'];
        const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
        const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'AND u.username LIKE ?';
            params.push(`%${search}%`);
        }

        const countQuery = `
            SELECT COUNT(*) as total
            FROM transactions t
            JOIN users u ON t.userId = u.id
            WHERE 1=1 ${whereClause}
        `;
        const [countResult] = await sql.query(countQuery, params);
        const total = countResult[0].total;

        const dataQuery = `
            SELECT
                t.id,
                t.userId,
                u.username,
                t.amount,
                t.type,
                t.method,
                t.createdAt
            FROM transactions t
            JOIN users u ON t.userId = u.id
            WHERE 1=1 ${whereClause}
            ORDER BY t.${sortColumn} ${order}
            LIMIT ? OFFSET ?
        `;
        const [rows] = await sql.query(dataQuery, [...params, pageSize, offset]);

        res.json({
            success: true,
            data: rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (e) {
        console.error('Admin coin transactions error:', e);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;