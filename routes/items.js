const express = require('express');
const { getItemById } = require('../utils/csgo/items');

const router = express.Router();

router.get('/:id/img', async (req, res) => {

    const rawItemId = String(req.params.id || '');
    const csItem = getItemById(rawItemId);

    if (csItem?.img) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Surrogate-Control', 'public, max-age=31536000');
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        res.setHeader('Expires', date.toUTCString());
        return res.redirect(csItem.img);
    }
    return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
});

module.exports = router;