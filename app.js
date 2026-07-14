require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Prevent unhandled rejections/exceptions from crashing the process
process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});

const express = require('express');
const nocache = require("nocache");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const rfs = require('rotating-file-stream');
const io = require('./socketio/server');
const cookieParser = require('cookie-parser');

const app = express();
app.disable('x-powered-by');

const startupState = {
    status: 'starting',
    startedAt: new Date().toISOString(),
    completedAt: null,
    failures: []
};

if (process.env.NODE_ENV == 'development') {

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "*");
        res.header("Access-Control-Allow-Methods", "*");
        res.header('Access-Control-Max-Age', '7200');
        next();
    });

} else {

    app.use((req, res, next) => {
        if (req.path.startsWith('/slots/hacksaw')) {
            res.header("Access-Control-Allow-Origin", "https://static-live.hacksawgaming.com");
            res.header("Access-Control-Allow-Headers", "*");
            res.header("Access-Control-Allow-Methods", "*");
            res.header('Access-Control-Max-Age', '7200');
        }
        next();
    });

}

app.options('*', (req, res) => {
    res.sendStatus(204);
});

app.set('view engine', 'ejs');
app.use('/public', express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV == 'development') {
    app.use(morgan('dev', {
        skip: (req, res) => req.url.endsWith('/img')
    }));
}

morgan.token('ip', function(req, res) {
    return req.headers['cf-connecting-ip']
});

morgan.token('user-agent', function(req, res) {
    return req.headers['user-agent']
});

const logDirectory = path.join(__dirname, 'logs');
const fs = require('fs');
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true });

const accessLogStream = rfs.createStream('access.log', {
    interval: '1d',
    path: logDirectory,
    size: "10M",
    // compress: 'gzip'
});

app.use(morgan('[:date[clf]] :ip :method :url :status :response-time ms - :user-agent', {
    stream: accessLogStream,
    skip: (req, res) => req.url.endsWith('/img')
}));

app.use(bodyParser.json({
    verify: function (req, res, buf, encoding) {
        req.rawJsonBody = buf;
    }
}));

app.use(bodyParser.urlencoded({
    extended: true,
    verify: function (req, res, buf, encoding) {
        req.rawUrlBody = buf;
    }
}));

app.use(nocache());
app.use(cookieParser());

app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/readyz', (req, res) => {
    const ready = startupState.status === 'ready';
    res.status(ready ? 200 : 503).json(startupState);
});

const authRoute = require('./routes/auth/core');
const userRoute = require('./routes/user');
const itemsRoute = require('./routes/items');
const tradingRoute = require('./routes/trading');
const discordRoute = require('./routes/discord');
const rainRoute = require('./routes/rain');
const leaderboardRoute = require('./routes/leaderboard');
const casesRoute = require('./routes/games/cases');
const battlesRoute = require('./routes/games/battles');
const rouletteRoute = require('./routes/games/roulette');
const crashRoute = require('./routes/games/crash');
const coinflipRoute = require('./routes/games/coinflip');
const slotsRoute = require('./routes/games/slots');
const minesRoute = require('./routes/games/mines');
const blackjackRoute = require('./routes/games/blackjack');
const adminRoute = require('./routes/admin');
const surveysRoute = require('./routes/surveys');
const fairnessRoute = require('./routes/fairness');
const slidesRoute = require('./routes/slides');
const { selfLockGuard } = require('./routes/user/security/functions');

app.use(['/cases', '/battles', '/roulette', '/crash', '/coinflip', '/slots', '/mines', '/blackjack'], selfLockGuard);

app.use('/auth', authRoute);
app.use('/user', userRoute);
app.use('/items', itemsRoute);
app.use('/trading', tradingRoute);
app.use('/discord', discordRoute);
app.use('/rain', rainRoute);
app.use('/leaderboard', leaderboardRoute);
app.use('/cases', casesRoute);
app.use('/battles', battlesRoute);
app.use('/roulette', rouletteRoute);
app.use('/crash', crashRoute);
app.use('/coinflip', coinflipRoute);
app.use('/slots', slotsRoute);
app.use('/mines', minesRoute);
app.use('/blackjack', blackjackRoute);
app.use('/admin', adminRoute);
app.use('/surveys', surveysRoute);
app.use('/fairness', fairnessRoute);
app.use('/slides', slidesRoute);

// Public announcements endpoint (no auth required)
app.get('/announcements/active', async (req, res) => {
    try {
        const { getActiveAnnouncements } = require('./routes/admin/announcements');
        const list = await getActiveAnnouncements();
        res.json({ success: true, data: list });
    } catch (e) {
        res.json({ success: true, data: [] });
    }
});

// Serve built frontend static files (production)
if (process.env.NODE_ENV !== 'development') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/public')) return next();
        if (path.extname(req.path)) return res.status(404).send('Asset not found');
        res.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Backend running. Start the Vite dev server on port 3001 for the frontend.');
    });
}

const { cacheBets } = require('./socketio/bets');
const { cacheRains } = require('./socketio/rain');
const { cacheBattles } = require('./routes/games/battles/functions');
const { cacheCases, cacheDrops } = require('./routes/games/cases/functions');
const { cacheCrash } = require('./routes/games/crash/functions');
const { cacheCryptos } = require('./routes/trading/crypto/deposit/functions');
const { cacheWithdrawalCoins } = require('./routes/trading/crypto/withdraw/functions');
const { cacheJackpot } = require('./routes/games/jackpot/functions');
const { cacheRoulette } = require('./routes/games/roulette/functions');
const { cacheCoinflips } = require('./routes/games/coinflip/functions');
const { cacheChannels } = require('./socketio/chat/functions');
const { cacheAdmin } = require('./routes/admin/config');
const { cacheSlots } = require('./routes/games/slots/functions');
const { cacheSurveys } = require('./routes/surveys/functions');
const { cacheLeaderboards } = require('./routes/leaderboard/functions');
const { cacheGameConfig } = require('./routes/admin/gameConfig');

async function start() {
    const promises = [
        cacheBets,
        cacheRains,
        cacheBattles,
        cacheCases,
        // cacheDrops,
        cacheCrash,
        cacheCryptos,
        cacheWithdrawalCoins,
        cacheJackpot,
        cacheRoulette,
        cacheCoinflips,
        cacheChannels,
        cacheAdmin,
        cacheSlots,
        cacheSurveys,
        cacheLeaderboards,
        cacheGameConfig
    ];

    const port = process.env.PORT || 3000;
    startupState.status = 'warming';
    const serverInstance = app.listen(port, '0.0.0.0', () => {
        console.log(`Listening on 0.0.0.0:${port}`);
    });

    require('./socketio');
    io.attach(serverInstance, { cors: { origin: '*' } });

    const timeoutMs = Math.max(100, Number(process.env.STARTUP_CACHE_TIMEOUT_MS) || 15000);
    const results = await Promise.all(promises.map((promise) => timedPromise(promise, promise.name, timeoutMs)));
    startupState.failures = results.filter((result) => result.error).map((result) => ({
        name: result.name,
        error: result.error
    }));
    startupState.status = startupState.failures.length ? 'degraded' : 'ready';
    startupState.completedAt = new Date().toISOString();

    if (startupState.failures.length) {
        console.error(`[startup] Cache warm-up completed with ${startupState.failures.length} failure(s).`);
    } else {
        console.log('[startup] Cache warm-up completed successfully.');
    }

}

function timedPromise(task, name, timeoutMs) {
    const startTime = Date.now();
    let timeout;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([Promise.resolve().then(task), timeoutPromise]).then(result => {
        const endTime = Date.now();
        console.log(`${name} completed in ${endTime - startTime}ms`);
        return { name, result, timeTaken: endTime - startTime };
    }).catch(err => {
        console.error(`[startup] ${name} failed:`, err.message);
        return { name, error: err.message };
    }).finally(() => {
        clearTimeout(timeout);
    });
}

start();