import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { resolveServerUrl, resolveSocketUrl } from '../src/util/server-url.mjs';
import { validateVercelEnv } from '../scripts/validate-vercel-env.mjs';
const require = createRequire(import.meta.url);
const express = require('express');
const { Server } = require('socket.io');
const { frontendOrigins, frontendCors } = require('../utils/frontend-cors');

test('API and socket resolution supports same-origin, separate backend, and socket override', () => {
    const origin = 'https://frontend.example';
    assert.equal(resolveServerUrl({}, origin), origin);
    assert.equal(resolveSocketUrl({}, origin), origin);
    const env = { VITE_SERVER_URL: ' https://api.example/ ' };
    assert.equal(resolveServerUrl(env, origin), 'https://api.example');
    assert.equal(resolveSocketUrl(env, origin), 'https://api.example');
    assert.equal(resolveSocketUrl({ ...env, VITE_SOCKET_URL: 'undefined' }, origin), 'https://api.example');
    assert.equal(resolveSocketUrl({ ...env, VITE_SOCKET_URL: 'https://socket.example/' }, origin), 'https://socket.example');
});

test('Vercel build supports the included same-origin API and rejects unsafe overrides', () => {
    const env = { VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'vadedcasino.vercel.app' };
    for (const url of ['undefined', 'http://localhost:3000', 'https://user:secret@api.example', 'https://api.example/wrong-path']) {
        assert.throws(() => validateVercelEnv({ ...env, VITE_SERVER_URL: url }), /HTTPS origin/);
    }
    assert.doesNotThrow(() => validateVercelEnv({ ...env, VITE_SERVER_URL: 'https://api.example' }));
    assert.doesNotThrow(() => validateVercelEnv(env));
    assert.doesNotThrow(() => validateVercelEnv({ ...env, VITE_SERVER_URL: 'https://vadedcasino.vercel.app' }));
    assert.doesNotThrow(() => validateVercelEnv({}));
});

test('production API preflight and Socket.IO polling allow only configured origins', async t => {
    const origin = 'https://vadedcasino.vercel.app';
    const origins = frontendOrigins({ NODE_ENV: 'production', FRONTEND_URL: origin + '/', BASE_URL: 'https://api.example' });
    assert.equal(origins.has('http://localhost:3001'), false);
    const app = express();
    app.use(frontendCors(origins));
    app.options('*', (req, res) => res.sendStatus(204));
    app.get('/announcements/active', (req, res) => res.json({ success: true, data: [] }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const io = new Server(server, { cors: { origin: [...origins], credentials: true } });
    t.after(() => new Promise(resolve => { server.closeAllConnections(); io.close(resolve); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const preflight = await fetch(base + '/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
    for (const endpoint of ['/announcements/active', '/socket.io/?EIO=4&transport=polling']) {
        const response = await fetch(base + endpoint, { headers: { Origin: origin } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('access-control-allow-origin'), origin);
        const rejected = await fetch(base + endpoint, { headers: { Origin: 'https://untrusted.example' } });
        assert.equal(rejected.headers.get('access-control-allow-origin'), null);
    }
});
