const { AsyncLocalStorage } = require('node:async_hooks');
const storage = new AsyncLocalStorage();
const enabled = process.env.VERCEL === '1';

function track(promise) {
    const context = storage.getStore();
    if (!context) return promise;
    context.pending.add(promise);
    promise.then(() => context.pending.delete(promise), error => {
        context.pending.delete(promise);
        context.error ||= error;
    });
    return promise;
}

function tracked(fn) {
    return (...args) => track(fn(...args));
}

module.exports = { enabled, storage, track, tracked };
