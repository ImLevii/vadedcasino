const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const { io } = require('socket.io-client');

test('fresh PostgreSQL starts all caches and serves login, API and chat', { timeout: 25000 }, async t => {
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    const child = spawn(process.execPath, ['tests/fixtures/postgres-app.cjs'], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            PORT: String(port),
            NODE_ENV: 'development',
            SQL_DIALECT: 'postgres',
            DATABASE_URL: 'postgres://test:test@localhost/test',
            COINPAYMENTS_KEY: '', COINPAYMENTS_SECRET: '',
            MEXC_API_KEY: '', MEXC_API_SECRET: '',
            DISCORD_BOT_TOKEN: '',
            STEAM_API_KEY: 'fixture-steam-key', GOOGLE_CLIENT_ID: 'fixture-google-id', GOOGLE_CLIENT_SECRET: 'fixture-google-secret',
            STARTUP_CACHE_TIMEOUT_MS: '5000',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    t.after(async () => {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await once(child, 'exit');
        }
    });
    const origin = `http://127.0.0.1:${port}`;
    let state;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        try {
            state = await (await fetch(`${origin}/readyz`)).json();
            if (state.status !== 'warming' && state.status !== 'starting') break;
        } catch {}
        if (child.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(state?.status, 'ready', output);
    assert.deepEqual(state.failures, []);
    for (const endpoint of ['/announcements/active', '/slides']) {
        const response = await fetch(origin + endpoint);
        assert.equal(response.status, 200, endpoint + '\n' + output);
    }
    const botAvatar = await fetch(origin + '/user/8000000000000001/img');
    assert.equal(botAvatar.status, 200, output);
    assert.match(botAvatar.headers.get('content-type'), /image\/png/);
    assert.deepEqual(Buffer.from(await botAvatar.arrayBuffer()), require('node:fs').readFileSync(path.join(__dirname, '../public/assets/icons/battle-bot.png')));
    const login = await fetch(origin + '/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3001' },
        body: JSON.stringify({ username: 'pgsmoke', password: 'postgres-smoke-password' }),
    });
    assert.equal(login.status, 200, output);
    assert.equal(login.headers.get('access-control-allow-origin'), 'http://localhost:3001');
    assert.equal(login.headers.get('access-control-allow-credentials'), 'true');
    const loginData = await login.json();
    assert.equal(loginData.username, 'pgsmoke');
    const cookie = login.headers.get('set-cookie').split(';')[0];
    for (const frontendOrigin of ['http://localhost:3001', 'http://127.0.0.1:3001']) {
        const preflight = await fetch(origin + '/user', {
            method: 'OPTIONS', headers: {
                Origin: frontendOrigin,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'authorization',
            },
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), frontendOrigin);
        assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
        assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/i);
        const profile = await fetch(origin + '/user', { headers: { Origin: frontendOrigin, Cookie: cookie } });
        assert.equal(profile.status, 200, output);
        assert.equal((await profile.json()).username, 'pgsmoke');
    }
    const untrusted = await fetch(origin + '/user', { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' } });
    assert.equal(untrusted.headers.get('access-control-allow-origin'), null);

    async function providerCallback(provider) {
        const start = await fetch(origin + '/auth/' + provider, {redirect:'manual'});
        const location = new URL(start.headers.get('location'));
        const callback = provider === 'steam' ? new URL(location.searchParams.get('openid.return_to')) : new URL(origin + '/auth/google/callback');
        if (provider === 'steam') {
            callback.searchParams.set('openid.return_to', callback.href);
            callback.searchParams.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561198012345678');
            callback.searchParams.set('openid.identity', 'https://steamcommunity.com/openid/id/76561198012345678');
            callback.searchParams.set('openid.mode', 'id_res');
        } else {
            callback.searchParams.set('code', 'fixture-code');
            callback.searchParams.set('state', location.searchParams.get('state'));
        }
        return fetch(origin + callback.pathname + callback.search, {redirect:'manual', headers:{Cookie:start.headers.get('set-cookie').split(';')[0]}});
    }
    const providerSessions = {};
    for (const provider of ['steam', 'google']) {
        let userId;
        for (let visit = 1; visit <= (provider === 'steam' ? 3 : 2); visit++) {
            const response = await providerCallback(provider);
            assert.equal(response.status, 302);
            assert.doesNotMatch(response.headers.get('location'), /error=/, output);
            const sessionCookie = response.headers.getSetCookie().find(value => value.startsWith('jwt=')).split(';')[0];
            const profileResponse = await fetch(origin + '/user', { headers: { Cookie: sessionCookie } });
            assert.equal(profileResponse.status, 200, output);
            const profile = await profileResponse.json();
            assert.equal(typeof profile.id, 'string', 'Provider IDs must not lose integer precision');
            if (userId) assert.equal(profile.id, userId, 'Returning users keep the same account');
            userId = profile.id;
            providerSessions[provider] = {id: userId, cookie: sessionCookie};
            const expectedName = provider === 'steam'
                ? (visit === 1 ? '星 🌟 玩家' : '玩家 updated 🎮')
                : (visit === 1 ? 'Zoë 東京' : 'Zoë 新しい');
            const expectedAvatar = provider === 'steam'
                ? `https://avatars.steamstatic.com/test-${Math.min(visit, 2)}.jpg`
                : `https://lh3.googleusercontent.com/test-${visit}`;
            assert.equal(profile.username, expectedName);
            assert.equal(profile.avatarUrl, expectedAvatar);
            assert.equal(profile.role, 'USER');
            const avatar = await fetch(`${origin}/user/${userId}/img`, { redirect: 'manual' });
            assert.equal(avatar.status, 302);
            assert.equal(avatar.headers.get('location'), expectedAvatar);
            assert.equal(avatar.headers.get('cache-control'), 'no-store');
            const publicProfile = await fetch(`${origin}/user/${userId}/profile`);
            assert.equal(publicProfile.status, 200);
            assert.equal((await publicProfile.json()).username, expectedName);
        }
    }
    const defaultAvatar = await fetch(origin + '/user/1/img');
    assert.equal(defaultAvatar.status, 200);
    assert.match(defaultAvatar.headers.get('content-type'), /image\/svg\+xml/);
    assert.equal((await fetch(origin + '/user/123abc/img')).status, 400);

    const target = providerSessions.steam;
    const deleteRequest = (id, sessionCookie, confirmId = id) => fetch(`${origin}/admin/users/${id}`, {
        method: 'DELETE', headers: {'Content-Type': 'application/json', ...(sessionCookie ? {Cookie: sessionCookie} : {})},
        body: JSON.stringify({confirmId})
    });
    assert.equal((await deleteRequest(target.id)).status, 401);
    assert.equal((await (await deleteRequest(target.id, target.cookie)).json()).error, 'UNAUTHORIZED');
    assert.equal((await (await deleteRequest(target.id, cookie)).json()).error, '2FA_REQUIRED');
    const adminSession = await fetch(origin + '/admin/2fa', {method: 'POST', headers: {Cookie: cookie}});
    assert.equal((await adminSession.json()).success, true);
    assert.equal((await deleteRequest('1', cookie)).status, 400);
    assert.equal((await deleteRequest(target.id, cookie, 'wrong')).status, 400);
    const victimSocket = io(origin, {transports: ['websocket'], autoConnect: false, reconnection: false});
    t.after(() => victimSocket.disconnect());
    const victimConnected = once(victimSocket, 'connect');
    victimSocket.connect();
    await victimConnected;
    const victimAuth = once(victimSocket, 'auth');
    victimSocket.emit('auth', decodeURIComponent(target.cookie.slice(4)));
    assert.equal((await victimAuth)[0].success, true);
    const disconnected = once(victimSocket, 'disconnect');
    assert.equal((await (await deleteRequest(target.id, cookie)).json()).success, true);
    await disconnected;
    assert.equal((await fetch(origin + '/user', {headers: {Cookie: target.cookie}})).status, 401);
    assert.equal((await deleteRequest(target.id, cookie)).status, 404);
    const activeUsers = await (await fetch(origin + '/admin/users', {headers: {Cookie: cookie}})).json();
    assert.ok(!activeUsers.data.some(user => user.id === target.id));
    const deletedLogin = await providerCallback('steam');
    assert.ok(!deletedLogin.headers.getSetCookie().some(value => value.startsWith('jwt=')));
    assert.match(deletedLogin.headers.get('location'), /error=steam_error/);
    const socket = io(origin, { transports: ['websocket'], autoConnect: false, reconnection: false });
    t.after(() => socket.disconnect());
    const connected = once(socket, 'connect');
    socket.connect();
    await connected;
    const joined = once(socket, 'chat:join');
    socket.emit('chat:join', 'EN');
    assert.equal((await joined)[0].success, true);
    assert.doesNotMatch(output, /\[unhandledRejection\]|\[uncaughtException\]|\[startup\].*failed|syntax error/);
});
