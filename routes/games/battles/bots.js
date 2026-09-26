// Stable system IDs are below Number.MAX_SAFE_INTEGER and outside local-user IDs.
// INSERT IGNORE never changes an existing account, including an ID collision.
const { randomInt } = require('node:crypto');

function botName() {
    return `Bob#${randomInt(100, 1000)}`;
}

async function ensureBattleBots(connection) {
    const bots = Array.from({ length: 8 }, (_, index) => [8000000000000001 + index, botName(), 'BOT']);
    await connection.query('INSERT IGNORE INTO users (id, username, role) VALUES ?', [bots]);
    // Rename old system placeholders once; preserve generated and custom names.
    const [legacy] = await connection.query('SELECT id, username FROM users WHERE role = ? AND username LIKE ? AND deletedAt IS NULL', ['BOT', 'Cosmic Bot %']);
    for (const bot of legacy) {
        if (!/^Cosmic Bot \d+$/.test(bot.username)) continue;
        await connection.query('UPDATE users SET username = ? WHERE id = ? AND role = ? AND username = ?', [botName(), bot.id, 'BOT', bot.username]);
    }
}

async function findBattleBot(connection, playerIds) {
    const select = () => connection.query(
        'SELECT id, username, xp, role, anon FROM users WHERE id NOT IN (?) AND role = ? AND deletedAt IS NULL AND banned = 0 ORDER BY id LIMIT 1',
        [playerIds, 'BOT']
    );
    let [[bot]] = await select();
    if (!bot) {
        await ensureBattleBots(connection);
        [[bot]] = await select();
    }
    // Deleted/banned bots stay unavailable. Provision a new identity instead of
    // reviving one or turning an unrelated account into a bot on an ID collision.
    for (let attempt = 0; !bot && attempt < 5; attempt++) {
        const id = randomInt(1000000000000, 9000000000000);
        if (playerIds.some(playerId => String(playerId) === String(id))) continue;
        const [created] = await connection.query('INSERT IGNORE INTO users (id, username, role) VALUES (?, ?, ?)', [id, botName(), 'BOT']);
        if (!created.affectedRows) continue;
        [[bot]] = await connection.query('SELECT id, username, xp, role, anon FROM users WHERE id = ?', [id]);
    }
    return bot;
}

module.exports = { ensureBattleBots, findBattleBot };
