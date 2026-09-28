// Run the real Express application against an isolated embedded PostgreSQL.
const { PGlite } = require('@electric-sql/pglite');
const { buildSchema } = require('../../database/postgres-sql');
const adapter = require('../../database/postgres');

async function main() {
    const db = new PGlite({ parsers: { 20: adapter.parseBigInt, 1700: Number } });
    await db.exec(buildSchema());
    const hash = await require('bcrypt').hash('postgres-smoke-password', 4);
    await db.query('INSERT INTO users (id, username, "passwordHash", role, perms) VALUES (1, $1, $2, $3, 4)', ['pgsmoke', hash, 'OWNER']);
    let queue = Promise.resolve();
    async function acquire() {
        let release;
        const previous = queue;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        return release;
    }
    class EmbeddedPool {
        on() {}
        async query(text, values) {
            const release = await acquire();
            try { return await db.query(text, values); } finally { release(); }
        }
        async connect() {
            const release = await acquire();
            return { query: (text, values) => db.query(text, values), release };
        }
        end() { return db.close(); }
    }
    const createPool = adapter.createPostgresPool;
    adapter.createPostgresPool = url => createPool(url, EmbeddedPool);
    // Keep third-party traffic out of a database smoke test.
    const axios = require('axios');
    let steamLogins = 0;
    let googleLogins = 0;
    axios.get = async (url, options) => {
        if (url.startsWith('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/')) {
            steamLogins++;
            if (steamLogins === 3) throw new Error('Temporary Steam outage');
            return { data: { response: { players: [{
                steamid: '76561198012345678',
                personaname: steamLogins === 1 ? '  星 🌟 玩家  ' : '玩家 updated 🎮',
                avatarfull: `https://avatars.steamstatic.com/test-${steamLogins}.jpg`
            }] } } };
        }
        if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
            googleLogins++;
            return { data: {
                id: '112233445566778899000', name: googleLogins === 1 ? '  Zoë 東京  ' : 'Zoë 新しい',
                picture: `https://lh3.googleusercontent.com/test-${googleLogins}`
            } };
        }
        if (url.startsWith('https://api.coingecko.com/')) {
            return { data: Object.fromEntries(options.params.ids.split(',').map(id => [id, { usd: 1 }])) };
        }
        throw new Error('External HTTP is disabled in the PostgreSQL smoke test');
    };
    axios.post = async url => {
        if (url === 'https://steamcommunity.com/openid/login') return { data: 'is_valid:true' };
        if (url === 'https://oauth2.googleapis.com/token') return { data: { access_token: 'fixture-token' } };
        return { data: {} };
    };
    if (process.env.VERCEL === '1') {
        await db.query('UPDATE users SET balance = 85 WHERE id = 1');
        const crash = await db.query(`INSERT INTO crash ("serverSeed", "crashPoint", "createdAt", "startedAt") VALUES ('test-crash-seed', 2, NOW() - INTERVAL '40 seconds', NOW() - INTERVAL '30 seconds') RETURNING id`);
        const cb = await db.query(`INSERT INTO "crashBets" ("userId", "roundId", amount, "autoCashoutPoint") VALUES (1, $1, 10, 1.2) RETURNING id`, [crash.rows[0].id]);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 10, 0.75, 'crash', $1, 0)`, [cb.rows[0].id]);
        const roulette = await db.query(`INSERT INTO roulette ("serverSeed", result, color, "createdAt", "rolledAt") VALUES ('test-roulette-seed', 1, 1, NOW() - INTERVAL '40 seconds', NOW() - INTERVAL '30 seconds') RETURNING id`);
        const rb = await db.query(`INSERT INTO "rouletteBets" ("userId", "roundId", amount, color) VALUES (1, $1, 5, 1) RETURNING id`, [roulette.rows[0].id]);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 5, 0.25, 'roulette', $1, 0)`, [rb.rows[0].id]);
        // This committed seed selects fire. A fractional payout previously
        // caused every Vercel request to roll back while resuming this game.
        await db.query("INSERT INTO users (id, username) VALUES (2, 'coinflip-opponent')");
        const coinflip = await db.query(`INSERT INTO coinflips ("ownerId", fire, ice, amount, "serverSeed", "clientSeed", "EOSBlock") VALUES (1, 1, 2, 1, 'test-coinflip-seed', 'test-client-seed', 100) RETURNING id`);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 1, 0.05, 'coinflip', $1, 0), (2, 1, 0.05, 'coinflip', $1, 0)`, [coinflip.rows[0].id]);
        require('../../api/index').listen(Number(process.env.PORT), '127.0.0.1');
    } else require('../../app');
}
main().catch(error => { console.error(error); process.exit(1); });
