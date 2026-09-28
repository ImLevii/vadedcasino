const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const { io } = require('socket.io-client');

test('Vercel API recovers overdue rounds exactly once, serves auth and reconnects WebSockets', { timeout: 45000 }, async t => {
    const reservation = net.createServer().listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const child = spawn(process.execPath, ['tests/fixtures/postgres-app.cjs'], {
        env: { ...process.env, VERCEL: '1', NODE_ENV: 'production', PORT: String(port),
            SQL_DIALECT: 'postgres', DATABASE_URL: 'postgres://test:test@localhost/test',
            JWT_SECRET: 'fixture-secret-that-is-longer-than-thirty-two-characters',
            COINPAYMENTS_KEY: '', COINPAYMENTS_SECRET: '', MEXC_API_KEY: '', MEXC_API_SECRET: '', DISCORD_BOT_TOKEN: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; if(process.env.DEBUG_TEST) process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { output += chunk; if(process.env.DEBUG_TEST) process.stderr.write(chunk); });
    t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } });
    const origin = `http://127.0.0.1:${port}`;
    let ready;
    for (let i = 0; i < 100; i++) {
        try { ready = await fetch(origin + '/readyz', { signal: AbortSignal.timeout(4000) }); if (ready.ok) break; } catch {}
        if (child.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready?.status, 200, output);
    const login = await fetch(origin + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'pgsmoke', password: 'postgres-smoke-password' }) });
    assert.equal(login.status, 200, output);
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, output);
    const token = cookie.slice(cookie.indexOf('=') + 1);
    const balances = await Promise.all(Array.from({ length: 3 }, async () => {
        const profile = await fetch(origin + '/user', { headers: { cookie } });
        assert.equal(profile.status, 200, output);
        return (await profile.json()).balance;
    }));
    assert.deepEqual(balances, [108.9, 108.9, 108.9], 'Recovered crash, roulette and fractional coinflip payouts must credit once');
    const history = await fetch(origin + '/user/bets?games=coinflip', { headers: { cookie } });
    assert.equal(history.status, 200, output);
    const settled = (await history.json()).data;
    assert.equal(settled.length, 1);
    assert.equal(settled[0].winnings, 1.9);
    assert.equal(settled[0].completed, 1);
    const opponentToken = require('jsonwebtoken').sign({ uid: 2 }, 'fixture-secret-that-is-longer-than-thirty-two-characters');
    const opponentHistory = await fetch(origin + '/user/bets?games=coinflip', { headers: { authorization: opponentToken } });
    const opponentBets = (await opponentHistory.json()).data;
    assert.equal(opponentBets[0].winnings, 0);
    assert.equal(opponentBets[0].completed, 1);
    for (const path of ['/readyz', '/cases', '/mines']) {
        const response = await fetch(origin + path, { headers: { cookie, accept: 'application/json' } });
        assert.equal(response.status, 200, `${path}: ${output}`);
        assert.match(response.headers.get('content-type'), /application\/json/);
    }
    const admin = await fetch(origin + '/admin/2fa', { method: 'POST', headers: { cookie } });
    assert.equal((await admin.json()).success, true, output);
    const settings = await fetch(origin + '/admin/games/settings', { headers: { cookie } });
    assert.equal((await settings.json()).success, true, output);
    const png = await require('sharp')({ create: { width: 2, height: 2, channels: 4, background: '#00ff00' } }).png().toBuffer();
    const upload = await fetch(origin + '/admin/slides/upload', {
        method: 'POST', headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.png', dataUrl: 'data:image/png;base64,' + png.toString('base64') }),
    });
    const uploaded = await upload.json();
    assert.equal(uploaded.success, true, output);
    assert.match(uploaded.data.path, /^\/public\/media\/slides\//);
    const image = await fetch(origin + uploaded.data.path);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.ok((await image.arrayBuffer()).byteLength > 0);
    const socket = io(origin, { transports: ['websocket'], autoConnect: false });
    t.after(() => socket.disconnect());
    socket.connect();
    await once(socket, 'connect');
    let authenticated = once(socket, 'auth');
    socket.emit('auth', token);
    assert.equal((await authenticated)[0].success, true, output);
    let snapshot = once(socket, 'crash:set');
    socket.emit('crash:subscribe');
    assert.ok((await snapshot)[0].round.id, output);
    await socket.timeout(5000).emitWithAck('runtime:tick');
    socket.disconnect();
    socket.connect();
    await once(socket, 'connect');
    authenticated = once(socket, 'auth');
    socket.emit('auth', token);
    assert.equal((await authenticated)[0].success, true);
    snapshot = once(socket, 'crash:set');
    socket.emit('crash:subscribe');
    assert.ok((await snapshot)[0].round.id);
});
