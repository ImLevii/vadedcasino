const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const { Server } = require('socket.io');
const { io } = require('socket.io-client');
const { PGlite } = require('@electric-sql/pglite');
const { createPostgresPool } = require('../database/postgres');
const { installEvents } = require('../runtime/events');
const { createCoordinator } = require('../runtime/transaction');

test('Neon event log relays between instances only after commit and preserves room isolation', { timeout: 15000 }, async t => {
    const db = new PGlite();
    await db.exec(fs.readFileSync(require.resolve('../database/runtime.sql'), 'utf8'));
    let tail = Promise.resolve();
    async function acquire() { let release; const prior = tail; tail = new Promise(resolve => { release = resolve; }); await prior; return release; }
    class EmbeddedPool {
        on() {}
        async query(text, values) { const release = await acquire(); try { return await db.query(text, values); } finally { release(); } }
        async connect() { const release = await acquire(); return { query: (text, values) => db.query(text, values), release }; }
    }
    const pool = createPostgresPool('postgres://test:test@localhost/test', EmbeddedPool);
    const servers = [];
    const clients = [];
    t.after(async () => {
        for (const client of clients) client.disconnect();
        for (const server of servers) await new Promise(resolve => server.close(resolve));
        await db.close();
    });
    async function instance() {
        const httpServer = http.createServer();
        const server = new Server(httpServer);
        servers.push(server);
        const events = installEvents(server, pool);
        await events.initialize();
        server.on('connection', socket => socket.on('join', (room, ack) => { socket.join(room); ack(); }));
        httpServer.listen(0, '127.0.0.1');
        await once(httpServer, 'listening');
        return { server, events, url: `http://127.0.0.1:${httpServer.address().port}` };
    }
    const a = await instance();
    const b = await instance();
    async function client(url, room) {
        const socket = io(url, { transports: ['websocket'] });
        clients.push(socket);
        await once(socket, 'connect');
        await socket.emitWithAck('join', room);
        return socket;
    }
    const receiver = await client(b.url, 'user:1');
    const outsider = await client(b.url, 'user:2');
    let leaked = 0;
    outsider.on('balance', () => leaked++);
    const coordinate = createCoordinator(pool);
    let releaseCommit;
    const barrier = new Promise(resolve => { releaseCommit = resolve; });
    let delivered = false;
    const received = once(receiver, 'balance').then(args => { delivered = true; return args; });
    const sending = coordinate(async context => {
        a.events.bind(context);
        a.server.to('user:1').emit('balance', 'set', 123);
        await barrier;
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(delivered, false);
    releaseCommit();
    await sending;
    assert.deepEqual(await received, ['set', 123]);
    assert.equal(leaked, 0);
    await assert.rejects(coordinate(async context => {
        a.events.bind(context);
        a.server.to('user:1').emit('balance', 'set', 999);
        throw new Error('rollback');
    }), /rollback/);
    const [[row]] = await pool.query('SELECT COUNT(*) AS count FROM runtimeEvents');
    assert.equal(Number(row.count), 1);
});
