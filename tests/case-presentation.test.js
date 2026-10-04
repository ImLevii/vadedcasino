const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function load(file, names) {
  const context = vm.createContext({Math, Array, Number});
  vm.runInContext(fs.readFileSync(file, 'utf8').replaceAll('export ', '') + `\nglobalThis.api = {${names}}`, context);
  return context.api;
}
const cases = load('src/resources/cases.jsx', 'pickCaseItem, generateRandomItems, getRareItems, maskRareItems, generateRareItems');
const battles = load('src/util/battleutil.jsx', 'fillEmptySlots, getWonItems, getRoundWinner, calculateWinnings');
const pool = [{id:1, price:20.12, probability:94.99}, {id:2, price:140.36, probability:5}];

test('rounded probabilities still generate 56 populated slots and complete demo results', () => {
  for (const random of [0, .5, .999999999, 1]) {
    const strip = cases.generateRandomItems(pool, {random: () => random});
    assert.equal(strip.length, 56);
    assert.ok(strip.every(Boolean));
  }
  assert.equal(cases.pickCaseItem(pool, () => 0).id, 1);
  assert.equal(cases.pickCaseItem(pool, () => 1).id, 2);
  assert.equal(cases.generateRandomItems([]).length, 0);
});

test('Cosmic masking preserves ordinary items, uses rare-only strips, and never mutates authoritative outcomes', () => {
  const original = structuredClone(pool);
  const masked = cases.maskRareItems(pool, 79.88);
  assert.equal(masked[0], pool[0]);
  assert.equal(masked[1].cosmic, true);
  assert.deepEqual(pool, original);
  const rareStrip = cases.generateRareItems(pool, 79.88, {random: () => .5});
  assert.equal(rareStrip.length, 56);
  assert.ok(rareStrip.every(item => item.id === 2));
});

test('team round leaders are correctly indexed for 2v2, ties, crazy and group modes', () => {
  const items = [10, 20, 40, 50].map(price => ({price}));
  assert.deepEqual([...battles.getRoundWinner(items, 2)], [1]);
  assert.deepEqual([...battles.getRoundWinner(items, 2, 'crazy')], [0]);
  assert.deepEqual([...battles.getRoundWinner(items, 4, 'group')], [0]);
  assert.deepEqual([...battles.getRoundWinner([{price:0}, {price:0}], 1)], [0, 1]);
  assert.deepEqual([...battles.getRoundWinner([], 1)], []);
  assert.deepEqual([...battles.getRoundWinner([.1,.2,.15,.15].map(price => ({price})), 2)], [0, 1]);
});

test('battle drops retain seat identity and payout cents, including repeated bot accounts', () => {
  const rounds = [{caseId:10, items:[{userId:7,itemId:1}, {userId:7,itemId:2}]}];
  const battleCases = [{id:10, items:pool}];
  const drops = battles.getWonItems(rounds,battleCases);
  assert.equal(drops[0].slot, 1);
  assert.equal(drops[1].slot, 2);
  assert.equal(drops[1].round, 1);
  assert.equal(battles.calculateWinnings(battleCases,rounds,2), 80.24);
  assert.equal(battles.getWonItems([{caseId:11,items:[]}],battleCases).length, 0);
  assert.equal(battles.fillEmptySlots(2,[{slot:99,id:7}]).length, 2);
});
