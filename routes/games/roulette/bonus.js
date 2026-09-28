const POT_KEY = 'rouletteTripleGreenBonusPot';
const PAID_KEY = 'rouletteTripleGreenBonusLastRound';
const MINIMUM_BET = 0.01;

async function lockPot(connection) {
    await connection.query('INSERT IGNORE INTO settings (id, value) VALUES (?, ?)', [POT_KEY, '0']);
    const [[row]] = await connection.query('SELECT value FROM settings WHERE id = ? FOR UPDATE', [POT_KEY]);
    const units = Math.round(Number(row.value) * 1000000);
    if (!Number.isSafeInteger(units) || units < 0) throw new Error('Invalid wheel bonus pot');
    return units;
}

async function writePot(connection, units) {
    await connection.query('UPDATE settings SET value = ? WHERE id = ?', [(units / 1000000).toFixed(6), POT_KEY]);
}

async function addContribution(connection, amount, percent) {
    const units = await lockPot(connection);
    // Preserve sub-cent contributions, including a minimum 0.01 coin bet.
    const next = units + Math.round(Math.round(amount * 100) * Math.round(percent * 100));
    if (!Number.isSafeInteger(next)) throw new Error('Wheel bonus pot overflow');
    await writePot(connection, next);
    return next / 1000000;
}

function allocateShare(cents, participants) {
    const stakes = participants.map(p => Math.round(Number(p.amount) * 100));
    const total = stakes.reduce((sum, stake) => sum + stake, 0);
    if (!total || !cents) return [];
    const shares = participants.map((p, i) => ({...p, cents: Math.floor(cents * stakes[i] / total), remainder: cents * stakes[i] % total, index: i}));
    let remainder = cents - shares.reduce((sum, p) => sum + p.cents, 0);
    const ordered = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < remainder; i++) ordered[i].cents++;
    return shares;
}

async function distributeBonus(connection) {
    const units = await lockPot(connection);
    const [[paid]] = await connection.query('SELECT value FROM settings WHERE id = ?', [PAID_KEY]);
    const [rounds] = await connection.query("SELECT g.id, g.result FROM roulette g WHERE g.endedAt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gameOperationControls c WHERE c.game = 'roulette' AND c.gameId = g.id AND c.cancelledAt IS NOT NULL) ORDER BY g.id DESC LIMIT 3");
    if (rounds.length !== 3 || rounds.some(round => Number(round.result) !== 0
        || BigInt(round.id) <= BigInt(paid?.value || 0))) return null;

    const cents = Math.floor(units / 10000);
    const share = Math.floor(cents / 3);
    const shares = [share, share, cents - share * 2];
    const payouts = new Map();
    const summaries = [];
    let distributed = 0;
    for (let i = 0; i < rounds.length; i++) {
        const [participants] = await connection.query(
            'SELECT rb.userId, u.username, SUM(rb.amount) AS amount FROM rouletteBets rb INNER JOIN users u ON u.id = rb.userId WHERE rb.roundId = ? AND rb.color = 0 GROUP BY rb.userId, u.username HAVING SUM(rb.amount) >= ? ORDER BY rb.userId',
            [rounds[i].id, MINIMUM_BET]);
        const rewards = allocateShare(shares[i], participants);
        const roundTotal = rewards.reduce((sum, p) => sum + p.cents, 0);
        for (const reward of rewards) {
            const key = String(reward.userId);
            const entry = payouts.get(key) || {userId: reward.userId, username: reward.username, cents: 0};
            entry.cents += reward.cents;
            payouts.set(key, entry);
        }
        distributed += roundTotal;
        summaries.push({roundId: rounds[i].id, share: shares[i] / 100, distributed: roundTotal / 100, participants: participants.length});
    }
    const winners = [...payouts.values()].filter(p => p.cents > 0).sort((a, b) => String(a.userId).localeCompare(String(b.userId)));
    for (const winner of winners) {
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [winner.cents / 100, winner.userId]);
        await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)',
            [winner.userId, winner.cents / 100, 'in', 'roulette-bonus', rounds[0].id]);
    }
    await writePot(connection, units - distributed * 10000);
    await connection.query('INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [PAID_KEY, String(rounds[0].id)]);
    return {total: units / 1000000, distributed: distributed / 100, carriedOver: (units - distributed * 10000) / 1000000,
        rounds: summaries, payouts: winners.map(p => ({userId: p.userId, username: p.username, amount: p.cents / 100}))};
}

async function loadBonus(sql) {
    const [[pot]] = await sql.query('SELECT value FROM settings WHERE id = ?', [POT_KEY]);
    const [[paid]] = await sql.query('SELECT value FROM settings WHERE id = ?', [PAID_KEY]);
    const [rounds] = await sql.query("SELECT g.id, g.result FROM roulette g WHERE g.endedAt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gameOperationControls c WHERE c.game = 'roulette' AND c.gameId = g.id AND c.cancelledAt IS NOT NULL) ORDER BY g.id DESC LIMIT 3");
    let streak = 0;
    for (const round of rounds) {
        if (Number(round.result) !== 0 || BigInt(round.id) <= BigInt(paid?.value || 0)) break;
        streak++;
    }
    return {pot: Number(pot?.value || 0), streak: Math.min(streak, 2)};
}

module.exports = {addContribution, distributeBonus, loadBonus, allocateShare, MINIMUM_BET};
