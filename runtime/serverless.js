const fs = require('node:fs');
const path = require('node:path');
const { sql, dialect } = require('../database');
const { createCoordinator } = require('./transaction');
const { installEvents } = require('./events');
const { storage } = require('./context');

const coordinate = createCoordinator(sql);
let initialized;
let events;

async function initialize() {
    if (!initialized) initialized = (async () => {
        if (!['postgres', 'postgresql', 'neon'].includes(dialect)) throw new Error('Vercel requires PostgreSQL DATABASE_URL');
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set a stable JWT_SECRET of at least 32 characters');
        await coordinate(async context => {
            for (const statement of fs.readFileSync(path.join(__dirname, '../database/runtime.sql'), 'utf8').split(';').filter(s => s.trim())) {
                await context.connection.nativeQuery(statement);
            }
            await require('../routes/homeSlides').seedDefaultHomeSlides();
        });
        await events.initialize();
    })().catch(error => { initialized = null; throw error; });
    return initialized;
}

async function refresh(scopes) {
    const includes = scope => scopes.includes('all') || scopes.includes(scope);
    await require('../routes/admin/config').cacheAdmin();
    await require('../routes/admin/gameConfig').cacheGameConfig();
    if (includes('user')) await require('../routes/user/rewards/functions').loadRewardsConfig();
    if (includes('cases') || includes('battles')) await require('../routes/games/cases/functions').ensureCasesCacheFresh();
    if (includes('drops')) await require('../routes/games/cases/functions').cacheDrops();
    if (includes('surveys')) await require('../routes/surveys/functions').cacheSurveys();
    if (includes('slots')) await require('../routes/games/slots/functions').cacheSlots();
    if (['rain', 'crash', 'roulette', 'battles', 'coinflip', 'cases', 'mines'].some(includes)) await require('../socketio/rain').cacheRains();
    if (includes('crash')) await require('../routes/games/crash/functions').cacheCrash();
    if (includes('roulette')) await require('../routes/games/roulette/functions').cacheRoulette();
    if (includes('battles')) await require('../routes/games/battles/functions').cacheBattles();
    if (includes('coinflip')) await require('../routes/games/coinflip/functions').cacheCoinflips();
    if (includes('leaderboard')) await require('../routes/leaderboard/functions').cacheLeaderboards();
    if (includes('chat')) await require('../socketio/chat/functions').cacheChannels();
    if (includes('bets')) await require('../socketio/bets').cacheBets();
    const { cachedRakebacks } = require('../routes/user/rakeback/functions');
    for (const key of Object.keys(cachedRakebacks)) delete cachedRakebacks[key];
}

async function run(work, { tick = false, scopes = ['all'] } = {}) {
    if (storage.getStore()) return work();
    await initialize();
    const result = await coordinate(async context => {
        events.bind(context);
        if (tick) {
            const [[last]] = await sql.query('SELECT value FROM runtimeState WHERE id = ?', ['lastTick']);
            if (last && Date.now() - Number(last.value) < 900) return;
            await sql.query('INSERT INTO runtimeState (id, value) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value', ['lastTick', String(Date.now())]);
        }
        await refresh(scopes);
        const result = await work();
        const [[maintenance]] = await sql.query('SELECT value FROM runtimeState WHERE id = ?', ['maintenanceAt']);
        if (!maintenance || Date.now() - Number(maintenance.value) >= 60000) {
            await context.connection.nativeQuery('DELETE FROM "runtimeState" WHERE (value::jsonb ->> \'expiresAt\')::numeric < $1', [Date.now()]);
            if (process.env.MEXC_API_KEY && process.env.MEXC_API_SECRET) await require('../routes/trading/crypto/withdraw/functions').updateSentWithdrawals();
            await sql.query('INSERT INTO runtimeState (id, value) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value', ['maintenanceAt', String(Date.now())]);
            await sql.query('DELETE FROM runtimeEvents WHERE createdAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)');
        }
        return result;
    });
    // Deliver other instances' committed events during an active request too;
    // correctness must not depend on a background interval getting CPU time.
    await events.flush();
    return result;
}

function socketScopes(name) {
    if (name === 'auth') return ['rain'];
    if (name.endsWith(':unsubscribe')) return [];
    if (name.startsWith('cases:')) return ['drops'];
    return [name.split(':')[0] === 'battle' ? 'battles' : name.split(':')[0]];
}

function setup(io) {
    events = installEvents(io, sql);
    io.use((socket, next) => {
        initialize().then(() => next(), () => next(new Error('Service unavailable')));
    });
    // WebSocket requests keep their instance alive. Work is driven by clients,
    // never by an unbounded background game loop. Reconnects resume from Neon.
    io.on('connection', socket => {
        const originalOn = socket.on.bind(socket);
        socket.on = (name, handler) => originalOn(name, (...args) => {
            if (name === 'disconnect' || name === 'error') return handler(...args);
            run(() => handler(...args), { scopes: socketScopes(name) }).catch(error => {
                console.error('[socket-request]', error.code || error.message);
                socket.emit('toast', 'error', 'Service temporarily unavailable. Please try again.');
            });
        });
        let lastTick = 0;
        let tickPending = false;
        originalOn('runtime:tick', ack => {
            if (tickPending || Date.now() - lastTick < 900) return typeof ack === 'function' && ack({ ok: true });
            lastTick = Date.now();
            tickPending = true;
            run(() => {}, { tick: true, scopes: ['crash', 'roulette', 'battles', 'coinflip', 'leaderboard'] }).then(
                () => { if (typeof ack === 'function') ack({ ok: true }); },
                error => { console.error('[runtime-tick]', error.code || error.message); if (typeof ack === 'function') ack({ ok: false }); }
            ).finally(() => { tickPending = false; });
        });
    });
}

function middleware(req, res, next) {
    // Public presentation reads neither spend balances nor use game caches.
    // In particular, image streams must never own the game transaction lock.
    if (req.method === 'GET' && (/^\/(slides|announcements\/active)\/?$/.test(req.path) || /^\/user\/[^/]+\/img$/.test(req.path) || req.path.startsWith('/public/media/'))) {
        return initialize().then(() => next(), next);
    }
    const end = res.end.bind(res);
    const write = res.write.bind(res);
    const chunks = [];
    let endArgs;
    let disconnected = false;
    let cancelRoute;
    const onClose = () => {
        if (res.writableFinished) return;
        disconnected = true;
        cancelRoute?.(new Error('Client disconnected'));
    };
    res.once('close', onClose);
    run(async () => {
      if (disconnected || res.destroyed) throw new Error('Client disconnected');
      if (req.path.startsWith('/trading')) {
          await require('../routes/trading/crypto/deposit/functions').cacheCryptos();
          await require('../routes/trading/crypto/withdraw/functions').cacheWithdrawalCoins();
      }
      return new Promise((resolve, reject) => {
        cancelRoute = reject;
        res.write = (chunk, encoding, callback) => {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
            if (typeof encoding === 'function') encoding();
            callback?.();
            return true;
        };
        res.end = (...args) => {
            endArgs = args;
            if (res.statusCode >= 500) reject(new Error('Route failed'));
            else resolve();
            return res;
        };
        next();
      });
    }, { scopes: req.path.startsWith('/admin') ? ['all'] : [req.path.split('/')[1]] }).then(() => {
        res.write = write;
        res.end = end;
        if (disconnected || res.destroyed) return;
        for (const chunk of chunks) write(chunk);
        end(...endArgs);
    }, error => {
        console.error('[serverless-request]', error.code || error.message);
        res.write = write;
        res.end = end;
        if (disconnected || res.destroyed) return;
        if (res.headersSent) return res.destroy();
        res.removeHeader('Content-Length');
        res.removeHeader('Set-Cookie');
        res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    }).finally(() => res.off('close', onClose));
}

module.exports = { setup, middleware, run };
