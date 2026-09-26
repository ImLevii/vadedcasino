const {test} = require('node:test');
const assert = require('node:assert/strict');
const {buildOfficialCases, seedOfficialCases} = require('../scripts/seed-official-cases');

test('ten official cases have distinct drops, complete odds and valid prices', () => {
    const cases = buildOfficialCases();
    assert.equal(cases.length, 10);
    assert.equal(new Set(cases.map(c => c.slug)).size, 10);
    for (const entry of cases) {
        assert.equal(entry.items.length, 10);
        assert.equal(new Set(entry.items.map(item => item.itemId)).size, 10);
        let cursor = 1;
        for (const item of entry.items) {
            assert.equal(item.rangeFrom, cursor);
            assert.ok(item.rangeTo >= item.rangeFrom);
            assert.ok(item.price > 0);
            cursor = item.rangeTo + 1;
        }
        assert.equal(cursor, 100001);
        assert.ok(entry.price > entry.expectedValue);
        assert.ok(entry.items.some(item => item.price > entry.price), `${entry.slug} needs a winning drop`);
    }
});

test('seeding skips existing slugs without changing cases or their history', async () => {
    let commits = 0;
    const result = await seedOfficialCases(async fn => fn({query: async sql => {
        assert.ok(sql.startsWith('SELECT'), 'existing cases must not be mutated');
        return [[{id: 99}]];
    }}, async () => {commits++;}), buildOfficialCases());
    assert.equal(result.created.length, 0);
    assert.equal(result.skipped.length, 10);
    assert.equal(commits, 1);
});
