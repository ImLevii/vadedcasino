const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');

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
            SQL_HOST: '127.0.0.1',
            SQL_PORT: '1',
            SQL_USER: 'unreachable',
            SQL_PASS: 'unreachable',
            SQL_DB: 'unreachable',
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
});