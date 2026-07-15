const express = require('express');
const router = express.Router();

const { sql } = require('../../database');
const { sendLog } = require('../../utils');
const { getRewardsParams, updateRewardsConfig } = require('../user/rewards/functions');

router.get('/', async (req, res) => {

    try {

        const [[stats]] = await sql.query(`
            SELECT
                (SELECT COUNT(*) FROM dailyCaseClaims WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS dailyClaims24h,
                (SELECT COALESCE(SUM(amount), 0) FROM dailyCaseClaims WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS dailyClaimed24h,
                (SELECT COUNT(*) FROM depositCases WHERE active = 1 AND expiresAt > NOW()) AS activeDepositCases,
                (SELECT COUNT(*) FROM supercharges WHERE active = 1) AS activeSupercharges,
                (SELECT COALESCE(SUM(bonusAmount), 0) FROM supercharges WHERE claimedAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS superchargePaid24h
        `);

        res.json({ success: true, config: getRewardsParams(), stats });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/', async (req, res) => {

    try {

        const error = await updateRewardsConfig(req.body?.config);
        if (error) return res.status(400).json({ error });

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* updated the rewards configuration.`);
        res.json({ success: true, config: getRewardsParams() });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

module.exports = router;
