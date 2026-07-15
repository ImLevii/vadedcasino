const { sql, doTransaction } = require('../../../database');
const { newBets } = require('../../../socketio/bets');
const { sleep, roundDecimal } = require('../../../utils');
const { sha256, generateServerSeed } = require('../../../fairness');
const io = require('../../../socketio/server');
const crypto = require('crypto');
const { getGameConfig } = require('../../../routes/admin/gameConfig');

const LAST_RESULTS = 30;
const ROUND_COOLDOWN = 4000;
const BONUS_POT_MIN_CASHOUT = 5.00;

const crash = {
    round: {},
    bets: [],
    last: [],
    pot: 0,
    intervalStarted: false,
    config: {
        get betTime() { return getGameConfig('crash', 'betTime', 10000); },
        get tick() { return getGameConfig('crash', 'tickRate', 150); },
        get maxProfit() { return getGameConfig('crash', 'maxProfit', 1000000); },
        get maxPayout() { return getGameConfig('crash', 'maxPayout', 50000); },
        get minBet() { return getGameConfig('crash', 'minBet', 0.1); },
        get maxBet() { return getGameConfig('crash', 'maxBet', 25000); },
        get bonusPotRake() { return getGameConfig('crash', 'bonusPotRake', 1); }
    }
};

// Multiplier growth over elapsed ms
const growthFunc = ms => Math.floor(100 * Math.pow(Math.E, 0.00006 * ms)) / 100;

// ─── Provably fair crash point ────────────────────────────────────────────────
function computeCrashPoint(serverSeed) {
    const houseEdge = getGameConfig('crash', 'houseEdge', 4);
    const edgeDecimal = houseEdge / 100;
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const h = parseInt(hash.slice(0, 8), 16);
    // House edge determines the frequency of an instant 1.00x crash
    const houseCrashDivisor = Math.max(2, Math.round(25 * (edgeDecimal / 0.04)));
    if (h % houseCrashDivisor === 0) return 1.00;
    const result = Math.floor((2 ** 32 / (h + 1)) * (1 - edgeDecimal) * 100) / 100;
    return Math.max(1.00, result);
}

// ─── Bonus pot ────────────────────────────────────────────────────────────────
async function loadPot() {
    try {
        const [[row]] = await sql.query('SELECT value FROM settings WHERE id = ?', ['crashBonusPot']);
        crash.pot = row ? roundDecimal(+row.value) || 0 : 0;
    } catch (e) {
        crash.pot = 0;
    }
}

async function savePot() {
    await sql.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['crashBonusPot', String(crash.pot)]
    );
}

async function addToPot(amount) {
    const rake = crash.config.bonusPotRake;
    if (!rake || rake <= 0) return;
    crash.pot = roundDecimal(crash.pot + amount * (rake / 100));
    try {
        await savePot();
    } catch (e) {
        console.error('[crash] failed to persist bonus pot', e);
    }
    io.to('crash').emit('crash:pot', crash.pot);
}

// Awarded to the highest cashout of the round, if it reached the threshold.
async function awardPot() {
    if (crash.pot <= 0) return;

    const winner = crash.bets
        .filter(bet => bet.cashoutPoint && bet.cashoutPoint >= BONUS_POT_MIN_CASHOUT)
        .sort((a, b) => b.cashoutPoint - a.cashoutPoint)[0];

    if (!winner) return;

    const amount = crash.pot;
    crash.pot = 0;

    try {
        await doTransaction(async (connection, commit) => {
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, winner.user.id]);
            await connection.query(
                'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
                ['crashBonusPot', '0']
            );
            await commit();
        });
    } catch (e) {
        crash.pot = amount;
        return console.error('[crash] failed to award bonus pot', e);
    }

    io.to(winner.user.id).emit('balance', 'add', amount);
    io.to('crash').emit('crash:pot:won', {
        user: winner.user.anon ? null : { id: winner.user.id, username: winner.user.username },
        amount,
        cashoutPoint: winner.cashoutPoint
    });
    io.to('crash').emit('crash:pot', crash.pot);
}

async function createCrashRound() {
    const serverSeed = generateServerSeed();
    const crashPoint = computeCrashPoint(serverSeed);
    const [ins] = await sql.query(
        'INSERT INTO crash (serverSeed, crashPoint, createdAt) VALUES (?, ?, NOW())',
        [serverSeed, crashPoint]
    );
    const [[newRound]] = await sql.query('SELECT * FROM crash WHERE id = ?', [ins.insertId]);
    newRound.new = true;
    return newRound;
}

async function getCrashRound() {

    const [[round]] = await sql.query('SELECT * FROM crash WHERE endedAt IS NULL ORDER BY id ASC LIMIT 1');
    if (!round) return createCrashRound();

    const now = new Date();

    // Recovered round after a restart — restart its bet timer
    if (round.startedAt) {
        await sql.query('UPDATE crash SET startedAt = NULL, createdAt = ? WHERE id = ?', [now, round.id]);
        round.startedAt = null;
    } else {
        await sql.query('UPDATE crash SET createdAt = ? WHERE id = ?', [now, round.id]);
    }

    round.createdAt = now;
    return round;

}

async function updateCrash() {

    const round = await getCrashRound();
    if (!round) return;

    round.serverSeedHash = sha256(round.serverSeed);
    crash.round = round;

    if (!crash.round.new) {

        const [bets] = await sql.query(`
            SELECT crashBets.userId, users.username, users.xp, users.role, users.anon, crashBets.autoCashoutPoint, crashBets.cashoutPoint, crashBets.amount, crashBets.id FROM crashBets
            INNER JOIN users ON users.id = crashBets.userId WHERE roundId = ?
        `, [round.id]);

        crash.bets = bets.map(bet => ({
            id: bet.id,
            user: {
                id: bet.userId,
                username: bet.username,
                role: bet.role,
                xp: bet.xp,
                anon: bet.anon
            },
            amount: bet.amount,
            cashoutPoint: bet.cashoutPoint,
            autoCashoutPoint: bet.autoCashoutPoint
        }));

    } else {
        crash.bets = [];
    }

    io.to('crash').emit('crash:new', {
        id: round.id,
        serverSeedHash: round.serverSeedHash,
        createdAt: round.createdAt,
        betTime: crash.config.betTime,
        pot: crash.pot
    });

    if (crash.bets.length) {
        io.to('crash').emit('crash:bets', crash.bets.map(bet => ({
            ...bet,
            user: { ...bet.user, anon: undefined },
            autoCashoutPoint: undefined
        })));
    }

}

// Cap a cashout at both max profit and the round max payout
function capWinnings(amount, multiplier) {
    const raw = roundDecimal(amount * multiplier);
    const profitCapped = Math.min(raw, roundDecimal(+amount + crash.config.maxProfit));
    return Math.min(profitCapped, crash.config.maxPayout);
}

async function processCashoutsBelow(multiplier) {

    await Promise.all(crash.bets.map(async bet => {
        
        if (bet.cashoutPoint) return;
        if (bet.processingCashout) return;
        if (!bet.autoCashoutPoint) return;
        if (bet.autoCashoutPoint > multiplier) return;

        const cashoutPoint = bet.autoCashoutPoint;
        const winnings = capWinnings(bet.amount, cashoutPoint);
        bet.processingCashout = true;

        try {

            await doTransaction(async (connection, commit) => {

                await connection.query('UPDATE crashBets SET cashoutPoint = ? WHERE id = ?', [cashoutPoint, bet.id]);
                await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [winnings, bet.user.id]);
                await connection.query('UPDATE bets SET completed = 1, winnings = ? WHERE game = ? AND gameId = ?', [winnings, 'crash', bet.id]);
        
                await commit();

            });

        } catch (e) {
            bet.processingCashout = false;
            console.error(e);
            return;
        }

        bet.cashoutPoint = cashoutPoint;
        bet.winnings = winnings;
        bet.processingCashout = false;

        io.to(bet.user.id).emit('balance', 'add', bet.winnings);
    
        io.to('crash').emit('crash:cashout', {
            id: bet.id,
            cashoutPoint: bet.cashoutPoint,
            winnings: bet.winnings
        });

        const crashEdge = getGameConfig('crash', 'houseEdge', 4);
        newBets([{
            user: bet.user,
            amount: bet.amount,
            edge: roundDecimal(bet.amount * (crashEdge / 100 + 0.035)),
            payout: bet.winnings,
            game: 'crash'
        }]);

        
    }));

}

async function crashInterval() {
    try {
        // Guard: if no active round (shouldn't happen after fix, but just in case)
        if (!crash.round || !crash.round.id) {
            await sleep(2000);
            await updateCrash();
            return setTimeout(crashInterval, 0);
        }

        if (!crash.round.startedAt) {

            const msUntilStart = Math.max(0, crash.round.createdAt.valueOf() + crash.config.betTime - Date.now());
            await sleep(msUntilStart);

            crash.round.startedAt = new Date();
            await sql.query('UPDATE crash SET startedAt = ? WHERE id = ?', [crash.round.startedAt, crash.round.id]);
        
            io.to('crash').emit('crash:start', {
                id: crash.round.id
            });
        
        }

        while (!crash.round.endedAt) {
        
            const ms = new Date() - crash.round.startedAt;
            let currentMultiplier = growthFunc(ms);

            if (currentMultiplier > crash.round.crashPoint) {
                currentMultiplier = crash.round.crashPoint;
            } 

            await processCashoutsBelow(currentMultiplier);
            io.to('crash').emit('crash:tick', currentMultiplier);
            crash.round.currentMultiplier = currentMultiplier;

            if (currentMultiplier < crash.round.crashPoint) {
                await sleep(crash.config.tick);
                continue;
            }    

            crash.round.endedAt = new Date();

        }

        try {
            await doTransaction(async (connection, commit) => {
                await connection.query('UPDATE crash SET endedAt = ? WHERE id = ?', [crash.round.endedAt, crash.round.id]);
                if (crash.bets.length) await connection.query('UPDATE bets SET completed = 1 WHERE game = ? AND gameId IN (?)', ['crash', crash.bets.map(bet => bet.id)]);
                await commit();
            });
        } catch (e) {
            console.error(e);
        }

        io.to('crash').emit('crash:end', {
            id: crash.round.id,
            crashPoint: crash.round.crashPoint,
            serverSeed: crash.round.serverSeed
        }); 

        if (crash.bets.length) {

            const crashEdge = getGameConfig('crash', 'houseEdge', 4);
            const losers = crash.bets.map(bet => {
             
                if (bet.cashoutPoint) return;
                return { user: bet.user, amount: bet.amount, edge: roundDecimal(bet.amount * (crashEdge / 100 + 0.035)), payout: 0, game: 'crash' };

            }).filter(bet => bet);

            if (losers.length) newBets(losers);

            await awardPot();

        }

        crash.last.unshift(crash.round.crashPoint);
        if (crash.last.length > LAST_RESULTS) crash.last.pop();

        await sleep(ROUND_COOLDOWN);

        try {
            await updateCrash();
        } catch (error) {
            console.error("Crash updateCrash err:", error);
        }

        // Use setTimeout instead of recursive call to prevent stack overflow
        setTimeout(crashInterval, 0);

    } catch (error) {
        console.error("Crash interval err:", error);
        setTimeout(crashInterval, 0);
    }
}

async function cacheCrash() {

    const [last] = await sql.query('SELECT crashPoint FROM crash WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?', [LAST_RESULTS]);
    crash.last = last.map(round => +round.crashPoint);

    await loadPot();
    await updateCrash();
    
    // Start the crash interval loop only once
    if (!crash.intervalStarted) {
        crash.intervalStarted = true;
        crashInterval();
    }

}

module.exports = {
    cacheCrash,
    crash,
    capWinnings,
    addToPot
}