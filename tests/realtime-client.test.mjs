import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {Server} from 'socket.io';
import {io} from 'socket.io-client';
import {createRealtimeClient} from '../src/util/realtime-client.mjs';

test('reconnects authenticate, restore each active subscription once, and never replay actions', {timeout: 12000}, async t => {
    const server = http.createServer();
    const sockets = new Server(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const connections = [];
    let peer;
    let actions = 0;
    sockets.on('connection', socket => {
        peer = socket;
        const events = [];
        connections.push(events);
        socket.on('auth', token => { assert.equal(token, 'fresh-token'); events.push('auth'); socket.emit('auth', {success: true}); });
        socket.on('crash:subscribe', () => { events.push('crash'); socket.emit('crash:set', {round: connections.length}); });
        socket.on('battles:subscribe', () => events.push('battle'));
        socket.on('bets:subscribe', type => events.push('bets:' + type));
        socket.on('place-bet', () => actions++);
        socket.on('runtime:tick', ack => ack({ok: true}));
    });
    const socket = io(`http://127.0.0.1:${server.address().port}`, {transports: ['websocket'], autoConnect: false, reconnectionDelay: 20});
    const snapshots = [];
    socket.on('crash:set', snapshot => snapshots.push(snapshot.round));
    const statuses = [];
    const client = createRealtimeClient(socket, {
        getToken: () => 'fresh-token', onReady: s => s.emit('crash:subscribe'),
        onDisconnect: () => {}, onStatus: status => statuses.push(status), serverless: true
    });
    t.after(async () => { client.dispose(); await new Promise(resolve => sockets.close(resolve)); });
    async function waitFor(check) {
        const until = Date.now() + 4000;
        while (!check() && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 20));
        assert.ok(check(), JSON.stringify(connections));
    }
    socket.connect();
    await waitFor(() => snapshots.length === 1);
    socket.emit('battles:subscribe', 'private-battle', 'private-key');
    socket.emit('bets:subscribe', 'all');
    socket.emit('bets:subscribe', 'high');
    socket.emit('place-bet');
    await waitFor(() => actions === 1);
    socket.io.engine.close();
    socket.emit('battles:unsubscribe', 'private-battle');
    await waitFor(() => snapshots.length === 2);
    assert.deepEqual(connections[1], ['auth', 'crash', 'bets:high']);
    peer.disconnect(true);
    await waitFor(() => snapshots.length === 3);
    assert.deepEqual(connections[2], ['auth', 'crash', 'bets:high']);
    assert.equal(actions, 1);
    assert.ok(statuses.includes('reconnecting'));
    assert.equal(statuses.at(-1), 'connected');
});
