const express = require('express');
const router = express.Router();

const { doTransaction } = require('../../../database');

const { isAuthed, apiLimiter } = require('../../auth/functions');
const { roundDecimal, sendLog, newNotification, getUserLevel } = require('../../../utils');
const io = require('../../../socketio/server');
const { getUserSeeds, getResult, combine } = require('../../../fairness');
const { dailyCaseConfig, depositCasesConfig, superchargeConfig, buildRewardPool, getDailyCaseTier, getDailyClaimTotal, getRewardsOverview } = require('./functions');

// Matches the frontend spinner duration (4800ms spin + 500ms reveal)
const SPIN_TIME = 5300;

// Rolls a provably-fair result against a reward pool. Returns { rollId, nonce, seed, result, item }.
async function rollRewardCase(connection, userId, pool) {

    const seeds = await getUserSeeds(userId, connection, true);
    seeds.nonce++;

    const seed = combine(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const result = getResult(seed);

    const item = pool.find(e => result >= e.rangeFrom && result <= e.rangeTo);
    if (!item) throw new Error('REWARD_ROLL_FAILED');

    const [fairResult] = await connection.query(
        'INSERT INTO fairRolls (serverSeed, clientSeed, nonce, seed, result) VALUES (?, ?, ?, ?, ?)',
        [seeds.serverSeed, seeds.clientSeed, seeds.nonce, seed, result]
    );

    const [nonceIncrease] = await connection.query('UPDATE serverSeeds SET nonce = nonce + 1 WHERE id = ?', [seeds.serverSeedId]);
    if (nonceIncrease.affectedRows !== 1) throw new Error('REWARD_ROLL_FAILED');

    return { rollId: fairResult.insertId, nonce: seeds.nonce, seed, result, item };

}

router.get('/overview', [isAuthed, apiLimiter], async (req, res) => {

    try {
        const overview = await getRewardsOverview(req.userId);
        res.json(overview);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/daily-case/:tierLevel/open', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const tierLevel = parseInt(req.params.tierLevel);
        const tier = dailyCaseConfig.tiers.find(t => t.minLevel === tierLevel);
        if (!tier) return res.status(400).json({ error: 'INVALID_TIER' });

        await doTransaction(async (connection, commit) => {

            const [[user]] = await connection.query('SELECT id, username, balance, xp FROM users WHERE id = ? FOR UPDATE', [req.userId]);

            const level = getUserLevel(user.xp);
            if (level < tier.minLevel) return res.status(400).json({ error: 'LEVEL_TOO_LOW' });

            // Per-tier cooldown - the level column stores the tier's minLevel
            const [[lastClaim]] = await connection.query(
                'SELECT createdAt FROM dailyCaseClaims WHERE userId = ? AND level = ? ORDER BY id DESC LIMIT 1',
                [req.userId, tier.minLevel]
            );

            if (lastClaim && Date.now() - new Date(lastClaim.createdAt).getTime() < dailyCaseConfig.cooldown) {
                return res.status(400).json({ error: 'COOLDOWN' });
            }

            const pool = buildRewardPool(tier.amount);
            const roll = await rollRewardCase(connection, user.id, pool);
            const amount = roll.item.price;

            const [result] = await connection.query('INSERT INTO dailyCaseClaims (userId, level, amount) VALUES (?, ?, ?)', [user.id, tier.minLevel, amount]);
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, user.id]);

            const [txResult] = await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [user.id, amount, 'in', 'daily-case', result.insertId]);
            await newNotification(user.id, 'reward-claimed', { txId: txResult.insertId, amount }, connection);

            await commit();
            io.to(user.id).emit('balance', 'set', roundDecimal(user.balance + amount), SPIN_TIME);

            res.json({
                success: true,
                amount,
                balance: roundDecimal(user.balance + amount),
                nonce: roll.nonce,
                seed: roll.seed,
                result: roll.result,
                item: roll.item
            });

            sendLog('rakeback', `*${user.username}* (\`${user.id}\`) opened their daily level ${tier.minLevel} case and won ${amount} coins`);

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/deposit-cases/open', [isAuthed, apiLimiter], async (req, res) => {

    try {

        await doTransaction(async (connection, commit) => {

            const [[user]] = await connection.query('SELECT id, username, balance FROM users WHERE id = ? FOR UPDATE', [req.userId]);

            const [[depositCase]] = await connection.query(
                'SELECT id, depositAmount, casesTotal, casesOpened, wagerRequired, createdAt FROM depositCases WHERE userId = ? AND active = 1 AND expiresAt > NOW() AND casesOpened < casesTotal ORDER BY id ASC LIMIT 1 FOR UPDATE',
                [req.userId]
            );

            if (!depositCase) return res.status(400).json({ error: 'NO_CASES_AVAILABLE' });

            const [[{ wagered }]] = await connection.query(
                'SELECT COALESCE(SUM(amount), 0) as wagered FROM bets WHERE userId = ? AND completed = 1 AND createdAt > ?',
                [req.userId, depositCase.createdAt]
            );

            if (wagered < depositCase.wagerRequired) return res.status(400).json({ error: 'WAGER_REQUIREMENT_NOT_MET' });

            const minReward = depositCase.depositAmount * depositCasesConfig.rewardMinPct;
            const maxReward = depositCase.depositAmount * depositCasesConfig.rewardMaxPct;
            const amount = Math.max(0.1, roundDecimal(minReward + Math.random() * (maxReward - minReward)));

            const opened = depositCase.casesOpened + 1;
            await connection.query('UPDATE depositCases SET casesOpened = ?, active = ? WHERE id = ?', [opened, opened < depositCase.casesTotal ? 1 : 0, depositCase.id]);
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, user.id]);

            const [txResult] = await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [user.id, amount, 'in', 'deposit-case', depositCase.id]);
            await newNotification(user.id, 'reward-claimed', { txId: txResult.insertId, amount }, connection);

            await commit();
            io.to(user.id).emit('balance', 'set', roundDecimal(user.balance + amount));

            res.json({ success: true, amount, casesRemaining: depositCase.casesTotal - opened });

            sendLog('rakeback', `*${user.username}* (\`${user.id}\`) opened a deposit case for ${amount} coins (${depositCase.casesTotal - opened} remaining)`);

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/supercharge/open', [isAuthed, apiLimiter], async (req, res) => {

    try {

        await doTransaction(async (connection, commit) => {

            const [[user]] = await connection.query('SELECT id, username, balance FROM users WHERE id = ? FOR UPDATE', [req.userId]);

            const [[supercharge]] = await connection.query(
                'SELECT id, bonusAmount FROM supercharges WHERE userId = ? AND active = 1 AND claimedAt IS NULL AND createdAt > DATE_SUB(NOW(), INTERVAL ? SECOND) ORDER BY id DESC LIMIT 1 FOR UPDATE',
                [req.userId, superchargeConfig.duration / 1000]
            );

            if (!supercharge) return res.status(400).json({ error: 'NO_ACTIVE_SUPERCHARGE' });

            const pool = buildRewardPool(supercharge.bonusAmount);
            const roll = await rollRewardCase(connection, user.id, pool);
            const amount = roll.item.price;

            await connection.query('UPDATE supercharges SET active = 0, claimedAt = NOW() WHERE id = ?', [supercharge.id]);
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, user.id]);

            const [txResult] = await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [user.id, amount, 'in', 'supercharge', supercharge.id]);
            await newNotification(user.id, 'reward-claimed', { txId: txResult.insertId, amount }, connection);

            await commit();
            io.to(user.id).emit('balance', 'set', roundDecimal(user.balance + amount), SPIN_TIME);

            res.json({
                success: true,
                amount,
                balance: roundDecimal(user.balance + amount),
                nonce: roll.nonce,
                seed: roll.seed,
                result: roll.result,
                item: roll.item
            });

            sendLog('rakeback', `*${user.username}* (\`${user.id}\`) opened their supercharge case and won ${amount} coins`);

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

module.exports = router;
