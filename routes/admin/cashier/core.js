const express = require('express');
const path = require('path');

const { sql } = require('../../../database');
const { sendLog } = require('../../../utils');
const io = require('../../../socketio/server');

const router = express.Router();

// GET /admin/cashier - Serve the cashier SPA page (production only)
// In development, Vite proxy bypass handles browser navigations (Accept: text/html) by
// returning req.url — letting Vite serve its own index.html with HMR and dev assets.
// Production SPA fallback is handled by the catch-all in app.js:175-180.
router.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'development') {
        return res.status(404).send('Use Vite dev server');
    }
    res.sendFile(path.join(__dirname, '../../../dist/index.html'));
});

router.use('/crypto', require('./crypto'));
router.use('/skindeck', require('./skindeck'));
router.use('/giftcards', require('./giftcards'));

router.post('/createGiftCards', async (req, res) => {
    const quantity = parseInt(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({ error: 'INVALID_QUANTITY' });
    }

    const amount = parseInt(req.body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
        return res.status(400).json({ error: 'INVALID_AMOUNT' });
    }

    const values = [];
    const codes = [];
    for (let index = 0; index < quantity; index++) {
        const parts = [...Array(16)]
            .map(() => (Math.random() * 36 | 0).toString(36))
            .join('')
            .match(/.{1,4}/g);
        values.push([parts.join('').toLowerCase(), amount, 1]);
        codes.push(parts.join('-').toUpperCase());
    }

    await sql.query('INSERT INTO giftCards (code, amount, usd) VALUES ?', [values]);
    sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* created \`${quantity}\` gift cards of $\`${amount}\`usd each`);

    // Emit real-time update to admin cashier giftcards page
    io.emit('admin:giftcards:created', { quantity, amount, codes });

    res.json({ success: true, codes, amount });
});

module.exports = router;