const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|api[-_]?key|secret|signature|cookie|token|trade[-_]?url)/i;

function redact(value, seen = new WeakSet()) {
    if (Array.isArray(value)) return value.map(item => redact(item, seen));
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return '[CIRCULAR]';

    seen.add(value);
    const result = {};

    for (const [key, item] of Object.entries(value)) {
        result[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, seen);
    }

    seen.delete(value);
    return result;
}

function logSkinDeck(level, event, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        provider: 'skindeck',
        event,
        details: redact(details)
    };

    const output = JSON.stringify(entry);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
}

module.exports = {
    logSkinDeck,
    redact
};