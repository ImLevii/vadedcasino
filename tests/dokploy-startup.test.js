const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

async function getAvailablePort() {
    const server = net.createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    server.close();
    await once(server, 'close');
    return port;
}

async function waitForResponse(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
        try {
            return await fetch(url);
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    throw lastError || new Error(`Timed out waiting for ${url}`);
}

test('health endpoint responds while MySQL is unreachable', { timeout: 15000 }, async (t) => {
    const port = await getAvailablePort();
    const appProcess = spawn(process.execPath, ['app.js'], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: String(port),
            SQL_DIALECT: 'mysql',
            SQL_HOST: '127.0.0.1',
            SQL_PORT: '1',
            SQL_USER: 'unreachable',
            SQL_PASS: 'unreachable',
            SQL_DB: 'unreachable',
            JWT_SECRET: 'startup-test-secret',
            STARTUP_CACHE_TIMEOUT_MS: '100'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    appProcess.stdout.on('data', (chunk) => { output += chunk; });
    appProcess.stderr.on('data', (chunk) => { output += chunk; });

    t.after(async () => {
        if (appProcess.exitCode === null) {
            appProcess.kill('SIGTERM');
            await once(appProcess, 'exit');
        }
    });

    const healthResponse = await waitForResponse(`http://127.0.0.1:${port}/healthz`, 10000);
    assert.equal(healthResponse.status, 200, output);
    assert.deepEqual(await healthResponse.json(), { status: 'ok' });

    const readinessResponse = await fetch(`http://127.0.0.1:${port}/readyz`);
    assert.equal(readinessResponse.status, 503, output);
    assert.notEqual((await readinessResponse.json()).status, 'ready');

    for (const transport of ['websocket', 'polling']) {
        const socket = io(`http://127.0.0.1:${port}`, {
            transports: [transport],
            reconnection: false,
            autoConnect: false,
        });
        t.after(() => socket.disconnect());
        const connected = once(socket, 'connect');
        socket.connect();
        await connected;

        const authenticated = once(socket, 'auth');
        socket.emit('auth', jwt.sign({ uid: '1' }, 'startup-test-secret'));
        assert.equal((await authenticated)[0].success, true);

        const joined = once(socket, 'chat:join');
        const messages = once(socket, 'chat:pushMessage');
        socket.emit('chat:join', 'EN');
        assert.deepEqual((await joined)[0], { success: true, channel: 'EN' });
        assert.deepEqual((await messages)[0], []);

        for (const channel of ['__proto__', 'constructor', {}, null]) {
            const rejected = once(socket, 'chat:join');
            socket.emit('chat:join', channel);
            assert.deepEqual((await rejected)[0], { error: 'INVALID_CHANNEL' });
        }

        const vipRejected = once(socket, 'chat:join');
        socket.emit('chat:join', 'VIP');
        assert.deepEqual((await vipRejected)[0], { error: 'SERVICE_UNAVAILABLE' });

        const betsRejected = once(socket, 'toast');
        socket.emit('bets:subscribe', 'me');
        assert.equal((await betsRejected)[0], 'error');
        socket.disconnect();
    }

    assert.match(output, /\[bets\] Failed to load total wagered:/);
    assert.doesNotMatch(output, /\[unhandledRejection\]|\[uncaughtException\]/);
});

test('Socket.IO transport is available while database warm-up is pending', { timeout: 15000 }, async (t) => {
    const connections = new Set();
    const stalledDatabase = net.createServer(socket => {
        connections.add(socket);
        socket.on('close', () => connections.delete(socket));
    });
    stalledDatabase.listen(0, '127.0.0.1');
    await once(stalledDatabase, 'listening');
    t.after(() => {
        for (const connection of connections) connection.destroy();
        stalledDatabase.close();
    });

    const port = await getAvailablePort();
    const appProcess = spawn(process.execPath, ['app.js'], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            NODE_ENV: 'development',
            PORT: String(port),
            SQL_DIALECT: 'mysql',
            SQL_HOST: '127.0.0.1',
            SQL_PORT: String(stalledDatabase.address().port),
            SQL_USER: 'unreachable',
            SQL_PASS: 'unreachable',
            SQL_DB: 'unreachable',
            SQL_CONNECT_TIMEOUT_MS: '10000',
            STARTUP_CACHE_TIMEOUT_MS: '2000',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    appProcess.stdout.on('data', chunk => { output += chunk; });
    appProcess.stderr.on('data', chunk => { output += chunk; });
    t.after(async () => {
        if (appProcess.exitCode === null) {
            appProcess.kill('SIGTERM');
            await once(appProcess, 'exit');
        }
    });

    const origin = `http://127.0.0.1:${port}`;
    await waitForResponse(`${origin}/healthz`, 10000);
    assert.equal((await (await fetch(`${origin}/readyz`)).json()).status, 'warming', output);
    const handshake = await fetch(`${origin}/socket.io/?EIO=4&transport=polling`);
    assert.equal(handshake.status, 200, output);
    assert.match(await handshake.text(), /^0\{"sid":/);

    const socket = io(origin, { transports: ['websocket'], autoConnect: false, reconnection: false });
    t.after(() => socket.disconnect());
    const connected = once(socket, 'connect');
    socket.connect();
    await connected;
    assert.equal((await (await fetch(`${origin}/readyz`)).json()).status, 'degraded', output);
    const joined = once(socket, 'chat:join');
    socket.emit('chat:join', 'EN');
    assert.deepEqual((await joined)[0], { success: true, channel: 'EN' });
    assert.doesNotMatch(output, /\[unhandledRejection\]|\[uncaughtException\]/);
});
