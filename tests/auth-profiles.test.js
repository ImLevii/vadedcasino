const assert = require('node:assert/strict');
const { test } = require('node:test');
const { displayName, avatarUrl } = require('../routes/auth/profiles');

test('provider names retain Unicode and emoji without allowing blank or control-only names', () => {
    assert.equal(displayName('  東京 🎮 Zoë  '), '東京 🎮 Zoë');
    assert.equal(displayName(' \t\n\u202e '), null);
    assert.equal(displayName(undefined), null);
    assert.equal(displayName('Zoe\u0308'), 'Zoë');
    assert.equal(Array.from(displayName('🎮'.repeat(300))).length, 255);
});

test('provider images must be valid HTTPS URLs without embedded credentials', () => {
    assert.equal(avatarUrl('https://lh3.googleusercontent.com/photo'), 'https://lh3.googleusercontent.com/photo');
    for (const url of [undefined, '', 'javascript:alert(1)', 'data:image/svg+xml,test', '//example.com/image', 'http://example.com/image', 'https://user:pass@example.com/image']) {
        assert.equal(avatarUrl(url), null);
    }
});
