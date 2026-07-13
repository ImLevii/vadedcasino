const express = require('express');
const router = express.Router();

const crypto = require('crypto');

const { sql, doTransaction } = require('../../database');
const { isAuthed, apiLimiter } = require('../auth/functions');
const { getUserSeeds } = require('../../fairness');

const sha256 = (string) => crypto.createHash('sha256').update(string).digest('hex');

router.get('/seeds', [isAuthed, apiLimiter], async (req, res) => {

    try {

        const seeds = await getUserSeeds(req.userId);

        res.json({
            success: true,
            clientSeed: seeds.clientSeed,
            serverSeedHash: sha256(seeds.serverSeed),
            nonce: seeds.nonce
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/seeds/client', [isAuthed, apiLimiter], async (req, res) => {

    const seed = req.body.seed;
    if (typeof seed !== 'string' || !/^[\w-]{5,64}$/.test(seed)) return res.status(400).json({ error: 'INVALID_SEED' });

    try {

        await doTransaction(async (connection, commit) => {

            await getUserSeeds(req.userId, connection, true);

            await connection.query('UPDATE clientSeeds SET endedAt = NOW() WHERE userId = ? AND endedAt IS NULL', [req.userId]);
            await connection.query('INSERT INTO clientSeeds (userId, seed) VALUES (?, ?)', [req.userId, seed]);

            await commit();
            res.json({ success: true, clientSeed: seed });

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

router.post('/seeds/rotate', [isAuthed, apiLimiter], async (req, res) => {

    try {

        await doTransaction(async (connection, commit) => {

            const seeds = await getUserSeeds(req.userId, connection, true);

            const newServerSeed = crypto.randomBytes(32).toString('hex');

            await connection.query('UPDATE serverSeeds SET endedAt = NOW() WHERE userId = ? AND endedAt IS NULL', [req.userId]);
            await connection.query('INSERT INTO serverSeeds (userId, seed) VALUES (?, ?)', [req.userId, newServerSeed]);

            await commit();

            res.json({
                success: true,
                revealedServerSeed: seeds.serverSeed,
                serverSeedHash: sha256(newServerSeed),
                nonce: 0
            });

        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

});

// Public: Get house edge settings for all games
router.get('/config', async (req, res) => {
    try {
        const { getAllGameSettings, getGameConfig } = require('../../routes/admin/gameConfig');
        
        const games = ['crash', 'mines', 'roulette', 'coinflip', 'blackjack'];
        const config = {};
        
        for (const game of games) {
            config[game] = {
                houseEdge: getGameConfig(game, 'houseEdge', 5),
                enabled: true
            };
        }
        
        res.json({ success: true, data: config });
    } catch (e) {
        console.error('[fairness/config] Error:', e);
        res.json({ success: true, data: {} });
    }
});

// Verify a specific crash round fairness
router.get('/verify/crash/:id', async (req, res) => {
    try {
        const [[round]] = await sql.query(
            'SELECT id, serverSeed, crashPoint, createdAt FROM crash WHERE id = ?',
            [req.params.id]
        );
        
        if (!round) return res.status(404).json({ error: 'ROUND_NOT_FOUND' });
        
        // Recalculate crash point
        const { getGameConfig } = require('../../routes/admin/gameConfig');
        const houseEdge = getGameConfig('crash', 'houseEdge', 4);
        const edgeDecimal = houseEdge / 100;
        const hash = require('crypto').createHash('sha256').update(round.serverSeed).digest('hex');
        const h = parseInt(hash.slice(0, 8), 16);
        const houseCrashDivisor = Math.max(2, Math.round(25 * (edgeDecimal / 0.04)));
        const result = Math.floor((2 ** 32 / (h + 1)) * (1 - edgeDecimal) * 100) / 100;
        const verifiedCrashPoint = Math.max(1.00, result);
        
        res.json({
            success: true,
            data: {
                id: round.id,
                serverSeed: round.serverSeed,
                crashPoint: Number(round.crashPoint),
                verifiedCrashPoint,
                match: Number(round.crashPoint) === verifiedCrashPoint,
                houseEdgeAtTime: houseEdge
            }
        });
    } catch (e) {
        console.error('[fairness/verify/crash] Error:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// Verify a roulette round fairness
router.get('/verify/roulette/:id', async (req, res) => {
    try {
        const [[round]] = await sql.query(
            'SELECT id, serverSeed, result, color, rolledAt FROM roulette WHERE id = ?',
            [req.params.id]
        );
        
        if (!round || !round.serverSeed) return res.status(404).json({ error: 'ROUND_NOT_FOUND_OR_NO_SEED' });
        
        // Recalculate
        const hash = require('crypto').createHash('sha256').update(round.serverSeed).digest('hex');
        const h = parseInt(hash.slice(0, 8), 16);
        const verifiedResult = h % 15;
        
        res.json({
            success: true,
            data: {
                id: round.id,
                serverSeed: round.serverSeed,
                result: round.result,
                verifiedResult,
                color: round.color,
                match: Number(round.result) === verifiedResult
            }
        });
    } catch (e) {
        console.error('[fairness/verify/roulette] Error:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// Verify a coinflip round fairness
router.get('/verify/coinflip/:id', async (req, res) => {
    try {
        const [[round]] = await sql.query(
            'SELECT id, serverSeed, clientSeed, winnerSide, startedAt FROM coinflips WHERE id = ?',
            [req.params.id]
        );
        
        if (!round) return res.status(404).json({ error: 'ROUND_NOT_FOUND' });
        if (!round.clientSeed) return res.json({ success: true, data: { id: round.id, status: 'pending', message: 'Round has not been resolved yet' } });
        
        const combine = (serverSeed, clientSeed) => {
            return require('crypto').createHmac('sha256', serverSeed).update(clientSeed).digest('hex');
        };
        const getResult = hashedValue => {
            const number = parseInt(hashedValue.charAt(1), 16);
            return (number % 2 === 0) ? 'ice' : 'fire';
        };
        
        const verifiedWinner = getResult(combine(round.serverSeed, round.clientSeed));
        
        res.json({
            success: true,
            data: {
                id: round.id,
                serverSeed: round.serverSeed,
                clientSeed: round.clientSeed,
                winnerSide: round.winnerSide,
                verifiedWinnerSide: verifiedWinner,
                match: round.winnerSide === verifiedWinner
            }
        });
    } catch (e) {
        console.error('[fairness/verify/coinflip] Error:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// Legacy fallback
router.get('/:id', (req, res) => {
    res.status(501).json({ error: 'Fairness verification not yet implemented' });
});

module.exports = router;
