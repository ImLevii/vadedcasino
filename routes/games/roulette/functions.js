const { sql, doTransaction } = require('../../../database');
const { newBets } = require('../../../socketio/bets');
const { sleep, roundDecimal } = require('../../../utils');
const { getGameConfig } = require('../../../routes/admin/gameConfig');
const { generateServerSeed } = require('../../../fairness');
const io = require('../../../socketio/server');
const crypto = require('crypto');

const TRIPLE_GREEN_BONUS_SETTING_ID = 'rouletteTripleGreenBonusPot';
const TRIPLE_GREEN_STREAK = 3;

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

const roulette = {
    round: {},
    bets: [],
    last: [],
    tripleGreenBonusPot: 0,
    config: {
        maxBet: getGameConfig('roulette', 'maxBet', 25000),
        betTime: getGameConfig('roulette', 'betTime', 10000),
        rollTime: getGameConfig('roulette', 'rollTime', 5000)
    }
};

const lastResults = 100;

function getTripleGreenBonusRake() {
    const configured = Number(getGameConfig('roulette', 'tripleGreenBonusRake', 0.75));
    if (!Number.isFinite(configured) || configured < 0) return 0.75;
    return configured;
}

async function loadTripleGreenBonusPot() {
    try {
        const [[row]] = await sql.query('SELECT value FROM settings WHERE id = ?', [TRIPLE_GREEN_BONUS_SETTING_ID]);
        roulette.tripleGreenBonusPot = row ? roundDecimal(+row.value) || 0 : 0;
    } catch (error) {
        roulette.tripleGreenBonusPot = 0;
    }
}

async function saveTripleGreenBonusPot() {
    await sql.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [TRIPLE_GREEN_BONUS_SETTING_ID, String(roulette.tripleGreenBonusPot)]
    );
}

async function addToTripleGreenBonus(amount) {
    const rakePercent = getTripleGreenBonusRake();
    if (!rakePercent || rakePercent <= 0) return;

    const contribution = roundDecimal(Number(amount) * (rakePercent / 100));
    if (!contribution || contribution <= 0) return;

    roulette.tripleGreenBonusPot = roundDecimal(roulette.tripleGreenBonusPot + contribution);

    try {
        await saveTripleGreenBonusPot();
    } catch (error) {
        console.error('[roulette] failed to persist triple green bonus pot', error);
    }

    io.to('roulette').emit('roulette:tripleGreenBonus:pot', roulette.tripleGreenBonusPot);
}

async function distributeTripleGreenBonus(connection) {
    if (!roulette.tripleGreenBonusPot || roulette.tripleGreenBonusPot <= 0) return null;

    const [streakRows] = await connection.query(
        'SELECT id, result FROM roulette WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?',
        [TRIPLE_GREEN_STREAK]
    );

    if (streakRows.length < TRIPLE_GREEN_STREAK) return null;
    if (streakRows.some(round => round.result !== 0)) return null;

    const startingPot = roundDecimal(roulette.tripleGreenBonusPot);
    if (startingPot <= 0) return null;

    const baseShare = roundDecimal(startingPot / TRIPLE_GREEN_STREAK);
    const roundShares = [baseShare, baseShare, roundDecimal(startingPot - (baseShare * 2))];

    const userPayoutMap = new Map();
    const roundSummaries = [];
    let distributedTotal = 0;

    for (let index = 0; index < streakRows.length; index++) {
        const streakRound = streakRows[index];
        const roundShare = roundShares[index] || 0;
        if (!roundShare || roundShare <= 0) {
            roundSummaries.push({ roundId: streakRound.id, share: 0, distributed: 0, participants: 0 });
            continue;
        }

        const [participants] = await connection.query(
            'SELECT rb.userId, u.username, rb.amount FROM rouletteBets rb INNER JOIN users u ON u.id = rb.userId WHERE rb.roundId = ? AND rb.color = 0 ORDER BY rb.amount DESC, rb.id ASC',
            [streakRound.id]
        );

        if (!participants.length) {
            roundSummaries.push({ roundId: streakRound.id, share: roundShare, distributed: 0, participants: 0 });
            continue;
        }

        const totalRoundBets = participants.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);
        if (!totalRoundBets) {
            roundSummaries.push({ roundId: streakRound.id, share: roundShare, distributed: 0, participants: participants.length });
            continue;
        }

        let distributedInRound = 0;

        for (let participantIndex = 0; participantIndex < participants.length; participantIndex++) {
            const participant = participants[participantIndex];
            const isLast = participantIndex === participants.length - 1;

            let reward = isLast
                ? roundDecimal(roundShare - distributedInRound)
                : roundDecimal(roundShare * (Number(participant.amount || 0) / totalRoundBets));

            if (!reward || reward <= 0) continue;

            distributedInRound = roundDecimal(distributedInRound + reward);
            const existing = userPayoutMap.get(participant.userId) || { userId: participant.userId, username: participant.username, amount: 0 };
            existing.amount = roundDecimal(existing.amount + reward);
            userPayoutMap.set(participant.userId, existing);
        }

        distributedTotal = roundDecimal(distributedTotal + distributedInRound);
        roundSummaries.push({
            roundId: streakRound.id,
            share: roundShare,
            distributed: distributedInRound,
            participants: participants.length
        });
    }

    const userPayouts = Array.from(userPayoutMap.values()).filter(entry => entry.amount > 0);
    if (!userPayouts.length) return null;

    for (const payout of userPayouts) {
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [payout.amount, payout.userId]);
    }

    const carriedOver = roundDecimal(Math.max(0, startingPot - distributedTotal));
    roulette.tripleGreenBonusPot = carriedOver;

    await connection.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [TRIPLE_GREEN_BONUS_SETTING_ID, String(roulette.tripleGreenBonusPot)]
    );

    return {
        total: startingPot,
        distributed: distributedTotal,
        carriedOver,
        rounds: roundSummaries,
        payouts: userPayouts
    };
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

        await doTransaction(async (connection, commit) => {
            
            await connection.query('UPDATE roulette SET endedAt = ? WHERE id = ?', [roulette.round.endedAt, roulette.round.id]);
            if (!roulette.bets.length) return await commit();

            const updateUserBalanceStmt = await connection.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
            const updateBetsStmt = await connection.prepare('UPDATE bets SET completed = 1, winnings = ? WHERE game = ? AND gameId = ?');
            const socketBets = [];

            const colorsMultipliers = getColorsMultipliers();
            const rouletteEdge = getGameConfig('roulette', 'houseEdge', 5);
            
            for (const bet of roulette.bets) {
                const color = roulette.round.color;
                let won = 0;
    
                if (betWins(bet.color, roulette.round.result, color)) {
                    won = bet.amount * (colorsMultipliers[bet.color] || 2);
                    await updateUserBalanceStmt.execute([won, bet.user.id]);
                    io.to(bet.user.id).emit('balance', 'add', won);
                }
    
                await updateBetsStmt.execute([won, 'roulette', bet.id]);
                socketBets.push({ user: bet.user, amount: bet.amount, edge: roundDecimal(bet.amount * (rouletteEdge / 100)), payout: won, game: 'roulette' });
            }
                
            await commit();
            newBets(socketBets);
  
        });

        await doTransaction(async (connection, commit) => {
            const result = await distributeTripleGreenBonus(connection);
            if (!result) return await commit();

            tripleGreenBonusResult = result;
            await commit();
        });

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

module.exports = {
    roulette,
    resultToColor,
    betWins,
    getColorsMultipliers,
    cacheRoulette,
    addToTripleGreenBonus
}
