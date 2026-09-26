const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

test('total wagered remains unavailable on query failure and retries after recovery', async (t) => {
    const root = path.join(__dirname, '..');
    function replaceModule(relativePath, exports) {
        const filename = require.resolve(path.join(root, relativePath));
        const previous = require.cache[filename];
        require.cache[filename] = { id: filename, filename, loaded: true, exports };
        t.after(() => {
            if (previous) require.cache[filename] = previous;
            else delete require.cache[filename];
        });
    }

    let queries = 0;
    replaceModule('database', { sql: {
        async query() {
            queries++;
            if (queries === 1) throw new Error('connect ETIMEDOUT');
            return [[{ totalWagered: 125 }]];
        },
    } });
    replaceModule('socketio/server', {});
    replaceModule('socketio/rain', { rains: {} });
    replaceModule('routes/admin/config', { sponsorLockedUsers: new Set() });
    replaceModule('routes/user/rakeback/functions', { cachedRakebacks: {} });
    replaceModule('utils', { roundDecimal: value => Math.round(value * 100) / 100 });
    const errors = t.mock.method(console, 'error', () => {});
    const { emitTotalWagered } = require('../socketio/bets');
    const emitted = [];
    const socket = { emit: (...args) => emitted.push(args) };

    assert.equal(await emitTotalWagered(0, socket), null);
    assert.deepEqual(emitted, []);
    assert.equal(errors.mock.callCount(), 1);
    assert.equal(await emitTotalWagered(0, socket), 125);
    assert.equal(await emitTotalWagered(5, socket), 130);
    assert.equal(queries, 2);
    assert.deepEqual(emitted, [['totalWagered', 125], ['totalWagered', 130]]);
});
