const io = require('./server');
const { sql } = require('../database');
const { rains } = require('./rain');
const { joinChat, sendMessage } = require('./chat');
const { sendOnlineUsers, sendSystemMessage } = require('./chat/functions');
const { cachedDrops: caseDrops } = require('../routes/games/cases/functions');
const { getBattle, cachedBattles, minifyBattle } = require('../routes/games/battles/functions');
const { roulette } = require('../routes/games/roulette/functions');
const { crash } = require('../routes/games/crash/functions');
const { cachedCoinflips } = require('../routes/games/coinflip/functions');
const { getBets, emitTotalWagered } = require('./bets');
const { validateJwtToken } = require('../routes/auth/functions');
const { discordClient, discordIds } = require('../discord/index');
const { rewards: surveysRewards } = require('../routes/surveys/functions');
const cookie = require('cookie');

process.on('SIGTERM', cleanupAndExit);
process.on('SIGINT', cleanupAndExit);

// Per-user rate-limit map for battle emoji reactions (timestamp of last send)
const emojiRateLimits = {};
const BATTLE_EMOJI_COOLDOWN_MS = 1500;
const ALLOWED_BATTLE_EMOJIS = new Set(['🔥', '😂', '💀', '🙏', '🍀', '😤', '👑', '🎰']);

function cleanupAndExit() {
    const m = 'Server is restarting, you will get disconnected for a few seconds..';
    io.emit('toast', 'info', m, {
        icon: '⚠️',
        duration: 10000
    });
    sendSystemMessage(io, m);
    process.exit(0);
}

async function newSocket(socket) {
   
    sendOnlineUsers(socket);
    socket.on('disconnect', () => sendOnlineUsers(io));
    emitTotalWagered(0, socket);

    if (rains.system) {
        const endsIn = rains.system.createdAt.valueOf() + rains.systemRainDuration - Date.now();
        const joined = socket.userId && rains.system.users.includes(socket.userId);
        socket.emit('rain', rains.system.amount, endsIn, rains.system.joinable, joined);
    }

    if (rains.user) {
        const endsIn = rains.user.createdAt.valueOf() + rains.joinTime - Date.now();
        const joined = socket.userId && rains.user.users.includes(socket.userId);
        socket.emit('rain:user', rains.user.amount, endsIn, rains.user.host, joined);
    }

    socket.emit('chat:emojis', discordClient.guilds.cache.get(discordIds.guild)?.emojis?.cache.map(e => {
        return {
            name: e.name,
            url: e.url
        }
    }) || []);

    // Send active announcements to newly connected client
    try {
        const { getActiveAnnouncements } = require('../routes/admin/announcements');
        getActiveAnnouncements().then(list => {
            if (list.length > 0) socket.emit('announcements', list);
        }).catch(() => {});
    } catch (_) {}

}

function socketLogin(socket, token) {

    const valid = validateJwtToken(token);

    if (!valid) {
        socket.userId = null;
        return socket.emit('auth', { error: 'INVALID_TOKEN' });
    }

    socket.userId = valid.uid;
    socket.emit('auth', { success: true, userId: socket.userId });

    // JWT uid is a string but many emit sites use numeric DB ids
    // (io.to(user.id)). Socket.io rooms are type-strict, so join both
    // representations to receive every 'balance'/'xp'/toast emit.
    socket.join(socket.userId);
    const numericId = Number(socket.userId);
    if (!Number.isNaN(numericId)) socket.join(numericId);
    // console.log(socket.userId, 'Logged in to socketio');

}

io.on('connection', function(socket) {

    socket.on('auth', function(token) {
        
        if (!token) {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const cookies = cookie.parse(cookieHeader);
                token = cookies['jwt'];
            }
        }

        const first = socket.userId == undefined;

        if (socket.userId) {
            socket.leave(socket.userId);
            const numericId = Number(socket.userId);
            if (!Number.isNaN(numericId)) socket.leave(numericId);
            socket.userId = null;
        }

        socketLogin(socket, token);
        if (first) newSocket(socket);

    });

    socket.on('bets:subscribe', async (type) => {

        const bets = await getBets(type, socket.userId);
        if (!bets) return;

        socket.join(`bets:${type == 'me' ? socket.userId : type}`);
        socket.emit('bets', type, bets);

    });

    socket.on('bets:unsubscribe', (type) => {
        socket.leave(`bets:${type}`);
    });

    socket.on('cases:subscribe', async () => {

        socket.join('cases');
        socket.emit('cases:drops:all', caseDrops.all);
        socket.emit('cases:drops:top', caseDrops.top);

    });

    socket.on('cases:unsubscribe', () => {
        socket.leave('cases');
    });

    socket.on('surveys:subscribe', async () => {

        socket.join('surveys');
        socket.emit('surveys:rewards:all', surveysRewards.all);
        socket.emit('surveys:rewards:top', surveysRewards.top);

    });

    socket.on('surveys:unsubscribe', () => {
        socket.leave('surveys');
    });

    socket.on('coinflip:subscribe', () => {

        socket.join('coinflips');
        socket.emit('coinflips:push', Object.values(cachedCoinflips), new Date());

    });

    socket.on('coinflip:unsubscribe', () => {
        socket.leave('coinflips');
    });

    socket.on('battles:subscribe', (battleId, privKey) => {

        if (battleId) {
            subscribeToBattle(socket, battleId, privKey)
        } else {
            socket.join('battles');

            const battles = [];

            for (const battleId in cachedBattles) {

                const battle = cachedBattles[battleId];
                if (!battle.privKey) {
                    battles.push(minifyBattle(battle));
                    continue;
                }

                if (battle.players.some(e => e.id == socket.userId)) {
                    battles.push(minifyBattle(battle));
                }

            }

            socket.emit('battles:push', battles);

        }

    });

    socket.on('battles:unsubscribe', (battleId) => {

        if (battleId) {
            socket.leave(`battle:${battleId}`);
        } else {
            socket.leave('battles');
        }

    });

    socket.on('battle:emoji', (battleId, emoji) => {
        if (!socket.userId) return;
        if (!battleId || typeof emoji !== 'string') return;
        if (!ALLOWED_BATTLE_EMOJIS.has(emoji)) return;

        const now = Date.now();
        const key = socket.userId;
        if (emojiRateLimits[key] && now - emojiRateLimits[key] < BATTLE_EMOJI_COOLDOWN_MS) return;
        emojiRateLimits[key] = now;

        io.to(`battle:${battleId}`).emit('battle:emoji', battleId, emoji);
    });

    socket.on('roulette:subscribe', () => {
        
        // console.log(socket.userId, 'subscribed to roulette');

        const round = {
            id: roulette.round.id,
            result: null,
            color: null,
            createdAt: roulette.round.createdAt,
            rolledAt: roulette.round.rolledAt,
            status: 'created'
        };
        
        if (round.rolledAt) {
            round.status = 'rolling';
            round.result = roulette.round.result;
            round.color = roulette.round.color;
        }

        socket.join('roulette');
        socket.emit('roulette:set', {
            serverTime: new Date(),
            ...roulette,
            round
        });

    });

    socket.on('roulette:unsubscribe', () => {
        socket.leave('roulette');
    });

    socket.on('crash:subscribe', () => {

        // console.log(socket.userId, 'subscribed to crash');

        const round = {
            id: crash.round.id,
            status: 'created',
            multiplier: 1,
            serverSeedHash: crash.round.serverSeedHash,
            createdAt: crash.round.createdAt,
            startedAt: null,
            endedAt: null
        }

        if (crash.round.startedAt) {
            round.status = 'started';
            round.startedAt = crash.round.startedAt;
            round.multiplier = crash.round.currentMultiplier;
        }

        if (crash.round.endedAt) {
            round.status = 'ended';
            round.endedAt = crash.round.endedAt;
            round.multiplier = crash.round.crashPoint;
        }

        socket.join('crash');
        socket.emit('crash:set', {
            serverTime: new Date(),
            last: crash.last,
            pot: crash.pot,
            betTime: crash.round.createdAt ? Math.max(0, crash.round.createdAt.valueOf() + crash.config.betTime - Date.now()) : 0,
            maxPayout: crash.config.maxPayout,
            minBet: crash.config.minBet,
            maxBet: crash.config.maxBet,
            bets: crash.bets.map(e => ({
                ...e,
                user: {
                    ...e.user,
                    anon: undefined
                },
                autoCashoutPoint: undefined
            })),
            round
        });

    });

    socket.on('crash:unsubscribe', () => {
        socket.leave('crash');
    });

    socket.on('chat:join', (channel) => {

        joinChat(socket, channel);

    });

    socket.on('chat:sendMessage', (message, replyTo = null) => sendMessage(socket, message, replyTo));

});

async function subscribeToBattle(socket, battleId, privKey = null) {

    const battle = await getBattle(battleId, privKey);
    if (!battle) return socket.emit('toast', 'error', 'Battle not found');
    socket.join(`battle:${battleId}`);
    socket.emit('battle', {
        serverTime: new Date(),
        ...battle
    });

}

setInterval(() => sendOnlineUsers(io, true), 10000);