const express = require('express');

const { sql } = require('../../../database');
const { sendLog } = require('../../../utils');

const router = express.Router();

router.use('/crypto', require('./crypto'));
router.use('/skindeck', require('./skindeck'));

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
    res.json({ success: true, codes, amount });
});

module.exports = router;