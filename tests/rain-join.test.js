const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');

function fixture({failQuery = false, wagered = 3000, captcha = false} = {}) {
    const rain = {id: 8, users: [], joinable: true};
    const writes = [];
    const query = async (sql, params) => {
        if (failQuery) throw new Error('Database unavailable');
        if (sql.includes('SUM(amount) AS wagered')) return [[{wagered}]];
        if (sql.startsWith('SELECT id, username')) return [[{id: 42, username: 'Tester', balance: 0, xp: 0, ip: 'test'}]];
        if (sql.startsWith('SELECT')) return [[]];
        writes.push({sql, params}); return [{insertId: 1}];
    };
    const dependencies = {
        express,
        '../socketio/server': {},
        '../database': {sql: {query}, doTransaction: fn => fn({query}, async () => {})},
        './auth/functions': {isAuthed() {}, apiLimiter() {}},
        '../utils': {roundDecimal: Number, sendLog() {}, getUserLevel() {}},
        '../socketio/rain': {rains: {system: rain}},
        '../socketio/chat/functions': {},
        './admin/config': {enabledFeatures: {rain: true, rainCaptcha: captcha}, checkAccountLock: async () => false},
    };
    const context = {module: {exports: {}}, console: {error() {}}, require: name => {
        assert.ok(name in dependencies, `Unexpected dependency ${name}`);
        return dependencies[name];
    }};
    vm.runInNewContext(fs.readFileSync(require.resolve('../routes/rain'), 'utf8'), context);
    async function join(body = {}) {
        const route = context.module.exports.stack.find(layer => layer.route?.path === '/join').route;
        const response = {statusCode: 200, status(code) {this.statusCode = code; return this;}, json(data) {this.body = data; return this;}};
        await route.stack.at(-1).handle({userId: 42, body}, response);
        return response;
    }
    return {join, writes, rain};
}

test('rain joins without a captcha when disabled and reports duplicate membership', async () => {
    const f = fixture();
    assert.equal((await f.join()).body.success, true);
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.rain.users, [42]);
    assert.equal((await f.join()).body.error, 'ALREADY_JOINED_RAIN');
    assert.equal(f.writes.length, 1);
});

test('rain preserves wager and captcha eligibility requirements', async () => {
    const low = fixture({wagered: 10});
    assert.equal((await low.join()).body.error, 'NOT_ENOUGH_WAGERED');
    assert.equal(low.writes.length, 0);
    const protectedRain = fixture({captcha: true});
    assert.equal((await protectedRain.join()).body.error, 'CAPTCHA_REQUIRED');
    assert.equal(protectedRain.writes.length, 0);
});

test('rain preflight database failures respond with an error instead of hanging', async () => {
    const result = await fixture({failQuery: true}).join();
    assert.equal(result.statusCode, 500);
    assert.equal(result.body.error, 'SERVER_ERROR');
});
