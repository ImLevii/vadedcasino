import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadHcaptcha} from '../src/util/hcaptcha.mjs';

test('captcha loading times out, supports retry, and waits for SDK readiness', async t => {
    const originalWindow = globalThis.window, originalDocument = globalThis.document;
    const scripts = [];
    globalThis.window = {};
    globalThis.document = {
        createElement: () => ({dataset: {}, remove() {this.removed = true;}}),
        head: {appendChild: script => scripts.push(script)}
    };
    t.after(() => {
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
        if (originalDocument === undefined) delete globalThis.document;
        else globalThis.document = originalDocument;
    });
    const first = loadHcaptcha(5);
    assert.equal(loadHcaptcha(5), first, 'concurrent clicks share one load');
    await assert.rejects(first, /too long/);
    assert.equal(scripts[0].removed, true);
    const retry = loadHcaptcha(100);
    assert.equal(scripts.length, 2);
    window.hcaptcha = {render() {}};
    window.cosmicCaptchaReady();
    assert.equal(await retry, window.hcaptcha);
    assert.equal(await loadHcaptcha(), window.hcaptcha);
    assert.equal(scripts.length, 2);
});
