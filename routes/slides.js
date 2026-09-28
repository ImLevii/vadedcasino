const express = require('express');
const { sql } = require('../database');
const { seedDefaultHomeSlides } = require('./homeSlides');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Vercel initializes schema and defaults once under the shared lock.
        // Public reads must not race schema writes against live game requests.
        if (!require('../runtime/context').enabled) await seedDefaultHomeSlides();

        const [rows] = await sql.query(
            `SELECT id, title, subtitle, cta, href, tag, accentColor, image, backgroundImage
             FROM homeSlides
             WHERE active = 1
             ORDER BY sortOrder ASC, id ASC`
        );

        return res.json({ success: true, data: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

module.exports = router;
