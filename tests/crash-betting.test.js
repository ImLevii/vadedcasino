const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');

function fixture() {
    const crash = {round: {id: 7}, bets: [], config: {minBet: .1, maxBet: 1000}};
    const user = {id: 42, username: 'Tester', balance: 100, xp: 0, role: 0};
    const writes = [], events = [];
    let commits = 0;
    const dependencies = {
        express,
        '../../../database': {doTransaction: fn => fn({query: async (sql, params) => {
            if (sql.startsWith('SELECT')) return [[user]];
            writes.push({sql, params});
            return [{insertId: 25}];
        }}, async () => { commits++; })},
        '../../auth/functions': {isAuthed() {}, apiLimiter() {}},
        '../../../utils': {roundDecimal: n => Math.round(Number(n) * 100) / 100, xpChanged: async () => {}},
        '../../../socketio/server': {to: room => ({emit: (...args) => events.push({room, args})})},
        './functions': {crash, capWinnings: (amount, point) => amount * point, addToPot() {}},
        '../../../socketio/bets': {newBets() {}},
        '../../admin/config': {enabledFeatures: {crash: true}, xpMultiplier: 1},
    };
    const context = {module: {exports: {}}, require: name => {
        assert.ok(name in dependencies, `Unexpected dependency ${name}`);
        return dependencies[name];
    }, console};
    vm.runInNewContext(fs.readFileSync(require.resolve('../routes/games/crash/index'), 'utf8'), context);
    async function request(path, body = {}) {
        const route = context.module.exports.stack.find(layer => layer.route?.path === path).route;
        const response = {statusCode: 200, status(code) {this.statusCode = code; return this;}, json(data) {this.body = data; return this;}};
        await route.stack.at(-1).handle({body, userId: 42}, response);
        return response;
    }
    return {crash, writes, events, request, get commits() {return commits;}};
}

test('crash accepts a valid bet and returns a receipt for socket recovery', async () => {
    const f = fixture();
    const result = await f.request('/bet', {amount: 5, autoCashoutPoint: 2});
    assert.equal(result.body.success, true);
    assert.equal(result.body.roundId, 7);
    assert.equal(result.body.bet.user.id, 42);
    assert.equal(result.body.bet.amount, 5);
    assert.equal(f.commits, 1);
    assert.equal(f.crash.bets.length, 1);
    assert.ok(f.writes.some(w => w.sql.startsWith('INSERT INTO crashBets')));
    assert.ok(f.events.some(e => e.args[0] === 'crash:bets'));
    assert.equal((await f.request('/bet', {amount: 5})).body.error, 'ALREADY_JOINED');
    assert.equal(f.commits, 1);
});

test('uninitialized and started rounds reject bets without creating or debiting anything', async () => {
    const f = fixture();
    f.crash.round = null;
    assert.equal((await f.request('/bet', {amount: 5})).body.error, 'ROUND_UNAVAILABLE');
    f.crash.round = {id: 7, startedAt: new Date()};
    assert.equal((await f.request('/bet', {amount: 5})).body.error, 'ALREADY_STARTED');
    assert.equal(f.writes.length, 0);
});

test('cashout returns the authoritative multiplier and payout and cannot pay twice', async () => {
    const f = fixture();
    await f.request('/bet', {amount: 5});
    f.crash.round.startedAt = new Date();
    f.crash.round.currentMultiplier = 1.5;
    const result = await f.request('/cashout');
    assert.equal(result.body.cashoutPoint, 1.5);
    assert.equal(result.body.winnings, 7.5);
    assert.equal(f.crash.bets[0].cashoutPoint, 1.5);
    assert.equal((await f.request('/cashout')).body.error, 'ALREADY_CASHED_OUT');
    assert.equal(f.commits, 2);
});
