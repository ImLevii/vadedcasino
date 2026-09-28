const { sql, doTransaction } = require('../../../database');
const { newBets } = require('../../../socketio/bets');
const { sleep, roundDecimal } = require('../../../utils');
const { getGameConfig } = require('../../../routes/admin/gameConfig');
const { generateServerSeed } = require('../../../fairness');
const io = require('../../../socketio/server');
const crypto = require('crypto');

const { addContribution, distributeBonus, loadBonus, MINIMUM_BET } = require('./bonus');

function getColorsMultipliers() {
    const configured = getGameConfig('roulette', 'colorsMultipliers', {0:14,1:2,2:2,3:7}) || {};

    return {
        // Enforced mechanics
        0: 14,
        3: 7,
        // Keep standard colors at 2x unless explicitly set to a valid positive number
        1: Number(configured[1]) > 0 ? Number(configured[1]) : 2,
        2: Number(configured[2]) > 0 ? Number(configured[2]) : 2
    };
}

function resultToColor(result) {
    if (result === 0) return 0;
    if (result <= 7) return 1;
    return 2;
}

function betWins(color, result, resultColor) {
    if (color === resultColor) return true;
    if (color === 3) return result === 7 || result === 8;
    return false;
}

async function settleRouletteBets(connection, round, bets) {
    const multipliers = getColorsMultipliers();
    const edge = getGameConfig('roulette', 'houseEdge', 5);
    const settled = [];
    for (const bet of bets) {
        const payout = betWins(bet.color, round.result, round.color)
            ? bet.amount * multipliers[bet.color] : 0;
        if (payout > 0) {
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, bet.user.id]);
        }
        await connection.query('UPDATE bets SET completed = 1, winnings = ? WHERE game = ? AND gameId = ?', [payout, 'roulette', bet.id]);
        settled.push({ user: bet.user, amount: bet.amount, edge: roundDecimal(bet.amount * (edge / 100)), payout, game: 'roulette' });
    }
    return settled;
}

const roulette = {
    round: {},
    bets: [],
    last: [],
    tripleGreenBonusPot: 0,
    tripleGreenStreak: 0,
    config: {
        get tripleGreenBonusRake() { return getTripleGreenBonusRake(); },
        tripleGreenMinimumBet: MINIMUM_BET,
        maxBet: getGameConfig('roulette', 'maxBet', 25000),
        betTime: getGameConfig('roulette', 'betTime', 10000),
        rollTime: getGameConfig('roulette', 'rollTime', 5000)
    }
};

const lastResults = 100;

// Expose the same validated rate to the bet ledger and the rules dialog.
function getTripleGreenBonusRake() {
    const configured = Number(getGameConfig('roulette', 'tripleGreenBonusRake', 0.66));
    if (!Number.isFinite(configured) || configured < 0 || configured > 5) return 0.66;
    return configured;
}

async function loadTripleGreenBonusPot() {
    const {pot, streak} = await loadBonus(sql);
    roulette.tripleGreenBonusPot = pot;
    roulette.tripleGreenStreak = streak;
}

async function addToTripleGreenBonus(connection, amount) {
    return addContribution(connection, amount, getTripleGreenBonusRake());
}

// Provably fair roulette result using server seed
function computeRouletteResult(serverSeed) {
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const h = parseInt(hash.slice(0, 8), 16);
    return h % 15; // 0-14
}

async function createRouletteRound() {
    const serverSeed = generateServerSeed();
    const result = computeRouletteResult(serverSeed);
    const color = resultToColor(result);
    const [ins] = await sql.query('INSERT INTO roulette (result, color, serverSeed) VALUES (?, ?, ?)', [result, color, serverSeed]);
    const [[newRound]] = await sql.query('SELECT * FROM roulette WHERE id = ?', [ins.insertId]);
    return newRound;
}

async function getRouletteRound() {

    const [[round]] = await sql.query('SELECT * FROM roulette WHERE endedAt IS NULL ORDER BY id ASC LIMIT 1');
    if (!round) return createRouletteRound();

    const now = new Date();

    if (!round.createdAt) {
        await sql.query('UPDATE roulette SET createdAt = ? WHERE id = ?', [now, round.id]);
        round.new = true;
    }

    round.createdAt = now;
    return round;

}

async function updateRoulette() {

    const round = await getRouletteRound();
    if (!round) return;

    roulette.round = round;
    
    if (!roulette.round.new) {

        const [bets] = await sql.query(`
            SELECT rouletteBets.userId, users.username, users.xp, users.anon, rouletteBets.color, rouletteBets.amount, rouletteBets.id FROM rouletteBets
            INNER JOIN users ON users.id = rouletteBets.userId WHERE roundId = ?
        `, [round.id]);

        roulette.bets = bets.map(bet => ({
            id: bet.id,
            user: {
                id: bet.userId,
                username: bet.username,
                xp: bet.xp,
                anon: bet.anon
            },
            color: bet.color,
            amount: bet.amount
        }));

    } else {
        roulette.bets = [];
    }

    io.to('roulette').emit('roulette:new', {
        id: round.id,
        createdAt: round.createdAt
    });

    if (roulette.bets.length) {
        io.to('roulette').emit('roulette:bets', roulette.bets);
    }

}

async function cacheRoulette() {

    if (require('../../../runtime/context').enabled) return advanceRoulette();

    const [last] = await sql.query('SELECT result FROM roulette WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?', [lastResults]);
    roulette.last = last.map(bet => bet.result);

    await loadTripleGreenBonusPot();

    await updateRoulette();
    
    // Start the roulette interval loop
    if (!roulette.intervalStarted) {
        roulette.intervalStarted = true;
        rouletteInterval();
    }

}

async function rouletteInterval() {
    try {
        // Guard: if no active round (shouldn't happen after fix, but just in case)
        if (!roulette.round || !roulette.round.id) {
            await sleep(2000);
            await updateRoulette();
            return setTimeout(rouletteInterval, 0);
        }

        if (!roulette.round.rolledAt) {
            await sleep(roulette.config.betTime);

            roulette.round.rolledAt = new Date();
            await sql.query('UPDATE roulette SET rolledAt = ? WHERE id = ?', [roulette.round.rolledAt, roulette.round.id]);

            io.to('roulette').emit('roulette:roll', {
                id: roulette.round.id,
                result: roulette.round.result,
                color: roulette.round.color
            });

        }

        await sleep(roulette.config.rollTime);

        roulette.round.endedAt = new Date();

        let tripleGreenBonusResult = null;

        let socketBets = [];
        await doTransaction(async (connection, commit) => {
            const [[stored]] = await connection.query('SELECT endedAt FROM roulette WHERE id = ? FOR UPDATE', [roulette.round.id]);
            if (!stored) throw new Error('Roulette round missing');
            if (!stored.endedAt) {
                socketBets = await settleRouletteBets(connection, roulette.round, roulette.bets);
                await connection.query('UPDATE roulette SET endedAt = ? WHERE id = ?', [roulette.round.endedAt, roulette.round.id]);
            }
            const result = await distributeBonus(connection);
            await commit();
            tripleGreenBonusResult = result;
            if (result) roulette.tripleGreenBonusPot = result.carriedOver;
        });
        for (const bet of socketBets) {
            if (bet.payout > 0) io.to(String(bet.user.id)).emit('balance', 'add', bet.payout);
        }
        if (socketBets.length) newBets(socketBets);

        roulette.tripleGreenStreak = tripleGreenBonusResult ? 0 : roulette.round.result === 0 ? Math.min(2, roulette.tripleGreenStreak + 1) : 0;
        io.to('roulette').emit('roulette:bonus:streak', roulette.tripleGreenStreak);

        if (tripleGreenBonusResult) {
            for (const payout of tripleGreenBonusResult.payouts) {
                io.to(payout.userId).emit('balance', 'add', payout.amount);
            }

            io.to('roulette').emit('roulette:tripleGreenBonus:pot', roulette.tripleGreenBonusPot);
            io.to('roulette').emit('roulette:tripleGreenBonus:won', {
                total: tripleGreenBonusResult.total,
                distributed: tripleGreenBonusResult.distributed,
                carriedOver: tripleGreenBonusResult.carriedOver,
                rounds: tripleGreenBonusResult.rounds,
                payouts: tripleGreenBonusResult.payouts
            });
        }

    } catch (error) {
        console.error("Roulette err:", error);
        return setTimeout(rouletteInterval, 2500);
    }

    roulette.last.unshift(roulette.round.result);
    if (roulette.last.length > lastResults) roulette.last.pop();

    await sleep(2500);

    try {
        await updateRoulette();
    } catch (error) {
        console.error("Roulette updateRoulette err:", error);
    }

    // Use setTimeout instead of recursive call to prevent stack overflow
    setTimeout(rouletteInterval, 0);
}

async function advanceRoulette() {
    const [[latest]] = await sql.query('SELECT * FROM roulette ORDER BY id DESC LIMIT 1');
    const now = Date.now();
    let round = latest;
    if (!round || (round.endedAt && now >= new Date(round.endedAt).valueOf() + 2500)) {
        round = await createRouletteRound();
        io.to('roulette').emit('roulette:new', { id: round.id, createdAt: round.createdAt, serverTime: new Date(), betTime: roulette.config.betTime });
    }
    roulette.round = round;
    const [rows] = await sql.query(`SELECT rb.*, u.username, u.xp, u.anon FROM rouletteBets rb JOIN users u ON u.id = rb.userId WHERE rb.roundId = ?`, [round.id]);
    roulette.bets = rows.map(row => ({ id: row.id, color: row.color, amount: row.amount,
        user: { id: row.userId, username: row.username, xp: row.xp, anon: row.anon } }));
    if (!round.endedAt) {
        const roll = round.rolledAt ? new Date(round.rolledAt).valueOf() : new Date(round.createdAt).valueOf() + roulette.config.betTime;
        if (now >= roll && !round.rolledAt) {
            round.rolledAt = new Date(roll);
            await sql.query('UPDATE roulette SET rolledAt = ? WHERE id = ?', [round.rolledAt, round.id]);
            io.to('roulette').emit('roulette:roll', { id: round.id, result: round.result, color: round.color, rolledAt: round.rolledAt, serverTime: new Date() });
        }
        if (now >= roll + roulette.config.rollTime) {
            const settled = await settleRouletteBets(sql, round, roulette.bets);
            round.endedAt = new Date(roll + roulette.config.rollTime);
            await sql.query('UPDATE roulette SET endedAt = ? WHERE id = ?', [round.endedAt, round.id]);
            const bonus = await distributeBonus(sql);
            for (const bet of settled) if (bet.payout) io.to(String(bet.user.id)).emit('balance', 'add', bet.payout);
            if (settled.length) await newBets(settled);
            if (bonus) {
                for (const payout of bonus.payouts) io.to(payout.userId).emit('balance', 'add', payout.amount);
                io.to('roulette').emit('roulette:tripleGreenBonus:won', bonus);
            }
        }
    }
    await loadTripleGreenBonusPot();
    const [last] = await sql.query('SELECT result FROM roulette WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?', [lastResults]);
    roulette.last = last.map(row => row.result);
    io.to('roulette').emit('roulette:bonus:streak', roulette.tripleGreenStreak);
    io.to('roulette').emit('roulette:tripleGreenBonus:pot', roulette.tripleGreenBonusPot);
}

module.exports = {
    settleRouletteBets,
    roulette,
    resultToColor,
    betWins,
    getColorsMultipliers,
    cacheRoulette,
    addToTripleGreenBonus
}
