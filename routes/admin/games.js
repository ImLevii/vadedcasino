const express = require('express');
const router = express.Router();
const { sql } = require('../../database');
const { getGameConfig, updateGameSetting, getAllGameSettings, cacheGameConfig } = require('./gameConfig');
const { sendLog } = require('../../utils');

// GET /admin/games/settings - Get all game settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await getAllGameSettings();
        
        // Group by game
        const grouped = {};
        for (const s of settings) {
            if (!grouped[s.game]) grouped[s.game] = {};
            grouped[s.game][s.key] = {
                value: s.type === 'number' ? Number(s.value) 
                     : s.type === 'boolean' ? s.value === '1' || s.value === 'true'
                     : s.type === 'json' ? (() => { try { return JSON.parse(s.value); } catch(e) { return s.value; } })()
                     : s.value,
                type: s.type,
                label: s.label,
                description: s.description,
                min: s.min,
                max: s.max,
                step: s.step
            };
        }
        
        res.json({ success: true, data: grouped });
    } catch (e) {
        console.error('[admin/games] Error fetching settings:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// GET /admin/games/settings/:game - Get settings for a specific game
router.get('/settings/:game', async (req, res) => {
    try {
        const game = req.params.game;
        const [settings] = await sql.query(
            'SELECT * FROM gameSettings WHERE game = ? ORDER BY `key`',
            [game]
        );
        
        const formatted = {};
        for (const s of settings) {
            formatted[s.key] = {
                id: s.id,
                value: s.type === 'number' ? Number(s.value) 
                     : s.type === 'boolean' ? s.value === '1' || s.value === 'true'
                     : s.type === 'json' ? (() => { try { return JSON.parse(s.value); } catch(e) { return s.value; } })()
                     : s.value,
                type: s.type,
                label: s.label,
                description: s.description,
                min: s.min,
                max: s.max,
                step: s.step
            };
        }
        
        res.json({ success: true, data: formatted });
    } catch (e) {
        console.error('[admin/games] Error fetching game settings:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// POST /admin/games/settings/:game - Update a game setting
router.post('/settings/:game', async (req, res) => {
    try {
        const game = req.params.game;
        const { key, value } = req.body;
        
        if (!key) return res.status(400).json({ error: 'MISSING_KEY' });
        if (value === undefined) return res.status(400).json({ error: 'MISSING_VALUE' });
        
        await updateGameSetting(game, key, value, req.user);
        
        sendLog('admin', `[\`${req.user.id}\`] *${req.user.username}* updated \`${game}.${key}\` = \`${JSON.stringify(value)}\``);
        
        res.json({ success: true });
    } catch (e) {
        console.error('[admin/games] Error updating setting:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// GET /admin/games/probability - Get probability/fairness tables for all games
router.get('/probability', async (req, res) => {
    try {
        const data = {};
        
        // Crash probability table
        const crashEdge = getGameConfig('crash', 'houseEdge', 4);
        data.crash = {
            houseEdge: crashEdge,
            description: 'Crash game uses provably fair SHA-256 based crash point generation. House edge determines the multiplier adjustment.',
            crashProbability: (edge) => {
                // With 4% house edge, 1 in 25 rounds house wins instantly
                const houseWinChance = (crashEdge / 100) * 25;
                return `~${Math.round(houseWinChance)}% chance of immediate house win (crash at 1.00x)`;
            }
        };
        
        // Mines probability table
        const minesEdge = getGameConfig('mines', 'houseEdge', 7.5);
        data.mines = {
            houseEdge: minesEdge,
            description: 'Mines uses HMAC-SHA256 based tile shuffling. Each revealed tile increases the multiplier.',
            samplePayouts: generateMinesPayoutTable(minesEdge)
        };
        
        // Roulette probability table
        const rouletteEdge = getGameConfig('roulette', 'houseEdge', 5);
        const colorsMultipliers = getGameConfig('roulette', 'colorsMultipliers', {0:14,1:2,2:2,3:7});
        data.roulette = {
            houseEdge: rouletteEdge,
            description: 'Roulette uses provably fair seeded results. 15 possible outcomes (0-14).',
            colors: {
                0: { name: 'Green', multiplier: colorsMultipliers[0], probability: `${(1/15*100).toFixed(1)}%`, houseEdge: `${((1 - 14/15)*100).toFixed(1)}%` },
                1: { name: 'Red', multiplier: colorsMultipliers[1], probability: `${(7/15*100).toFixed(1)}%`, houseEdge: `${((1 - 7/15*2)*100).toFixed(1)}%` },
                2: { name: 'Black', multiplier: colorsMultipliers[2], probability: `${(7/15*100).toFixed(1)}%`, houseEdge: `${((1 - 7/15*2)*100).toFixed(1)}%` },
                3: { name: 'Gold', multiplier: colorsMultipliers[3], probability: `${(2/15*100).toFixed(1)}%`, houseEdge: `${((1 - 2/15*7)*100).toFixed(1)}%` }
            }
        };
        
        // Coinflip probability
        const coinflipEdge = getGameConfig('coinflip', 'houseEdge', 5);
        data.coinflip = {
            houseEdge: coinflipEdge,
            description: 'Coinflip uses EOS block hash as client seed for provably fair results. 50/50 chance per side.',
            winMultiplier: (1 - coinflipEdge / 100) * 2
        };
        
        // Jackpot probability
        const jackpotEdge = getGameConfig('jackpot', 'houseEdge', 5);
        data.jackpot = {
            houseEdge: jackpotEdge,
            description: 'Jackpot uses EOS block hash. Winner determined by ticket weight distribution.',
            prizeMultiplier: (1 - jackpotEdge / 100)
        };
        
        // Blackjack probability
        const blackjackEdge = getGameConfig('blackjack', 'houseEdge', 2.5);
        data.blackjack = {
            houseEdge: blackjackEdge,
            description: 'Blackjack uses HMAC-SHA256 card generation. Standard blackjack rules with dynamic house edge.'
        };
        
        res.json({ success: true, data });
    } catch (e) {
        console.error('[admin/games] Error generating probability data:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// POST /admin/games/reload - Reload all game configs from DB
router.post('/reload', async (req, res) => {
    try {
        await cacheGameConfig();
        sendLog('admin', `[\`${req.user.id}\`] *${req.user.username}* reloaded game config cache.`);
        res.json({ success: true });
    } catch (e) {
        console.error('[admin/games] Error reloading config:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

// GET /admin/games/fairness/:game? - Verify fairness for rounds
router.get('/fairness/:game?', async (req, res) => {
    try {
        const game = req.params.game;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        
        if (game) {
            // Get recent rounds for a specific game
            let rounds = [];
            switch (game) {
                case 'crash':
                    [rounds] = await sql.query(
                        'SELECT id, serverSeed, crashPoint, createdAt, startedAt, endedAt FROM crash WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
                        [limit]
                    );
                    rounds = rounds.map(r => ({
                        ...r,
                        serverSeedHash: r.serverSeed ? require('crypto').createHash('sha256').update(r.serverSeed).digest('hex') : null,
                        verifyUrl: `/fairness/verify/crash/${r.id}`
                    }));
                    break;
                case 'coinflip':
                    [rounds] = await sql.query(
                        'SELECT id, serverSeed, clientSeed, winnerSide, startedAt FROM coinflips WHERE startedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
                        [limit]
                    );
                    break;
                case 'jackpot':
                    [rounds] = await sql.query(
                        'SELECT id, serverSeed, clientSeed, winnerBet, ticket, amount, rolledAt FROM jackpot WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
                        [limit]
                    );
                    break;
                case 'mines':
                    [rounds] = await sql.query(
                        'SELECT id, minesCount, payout, endedAt FROM mines WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
                        [limit]
                    );
                    break;
                case 'roulette':
                    [rounds] = await sql.query(
                        'SELECT id, result, color, rolledAt FROM roulette WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
                        [limit]
                    );
                    break;
                default:
                    return res.status(400).json({ error: 'INVALID_GAME' });
            }
            
            res.json({ success: true, data: rounds });
        } else {
            // Get count of rounds per game
            const games = ['crash', 'coinflip', 'jackpot', 'mines', 'roulette'];
            const counts = {};
            
            for (const g of games) {
                const [[{ count }]] = await sql.query(`SELECT COUNT(*) as count FROM \`${g}\``);
                counts[g] = count;
            }
            
            res.json({ success: true, data: counts });
        }
    } catch (e) {
        console.error('[admin/games] Error fetching fairness data:', e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

function generateMinesPayoutTable(houseEdge) {
    const totalTiles = 25;
    
    function calcMult(mineCount, revealed) {
        if (revealed < 1) return 1;
        let successProbability = 1;
        for (let i = 0; i < revealed; i++) {
            successProbability *= (totalTiles - mineCount - i) / (totalTiles - i);
        }
        const idealMultiplier = 1 / successProbability;
        const adjustedMultiplier = idealMultiplier * (1 - houseEdge / 100);
        return +adjustedMultiplier.toFixed(2);
    }
    
    return {
        '1 mine': {
            '1 reveal': calcMult(1, 1),
            '5 reveals': calcMult(1, 5),
            '10 reveals': calcMult(1, 10),
            '24 reveals': calcMult(1, 24)
        },
        '3 mines': {
            '1 reveal': calcMult(3, 1),
            '5 reveals': calcMult(3, 5),
            '10 reveals': calcMult(3, 10),
            '22 reveals': calcMult(3, 22)
        },
        '10 mines': {
            '1 reveal': calcMult(10, 1),
            '5 reveals': calcMult(10, 5),
            '10 reveals': calcMult(10, 10),
            '15 reveals': calcMult(10, 15)
        },
        '24 mines': {
            '1 reveal': calcMult(24, 1),
            '5 reveals': calcMult(24, 5),
            '10 reveals': calcMult(24, 10)
        }
    };
}

module.exports = router;