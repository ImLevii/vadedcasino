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

router.get('/:id', (req, res) => {
    res.status(501).json({ error: 'Fairness verification not yet implemented' });
});

module.exports = router;