const MODES = new Set(['sandbox', 'live']);

function parseEnabled(value) {
    return typeof value === 'string' && value.toLowerCase() === 'true';
}

function getSkinDeckConfig() {
    const mode = (process.env.SKINDECK_MODE || 'sandbox').toLowerCase();
    if (!MODES.has(mode)) throw new Error('SKINDECK_MODE must be sandbox or live.');

    return {
        enabled: parseEnabled(process.env.SKINDECK_ENABLED),
        mode,
        apiKey: process.env.SKINDECK_API_KEY || '',
        webhookSecret: process.env.SKINDECK_WEBHOOK_SECRET || ''
    };
}

function validateSkinDeckConfig({ api = false, webhook = false } = {}) {
    const config = getSkinDeckConfig();

    if (api && !config.apiKey) throw new Error('SKINDECK_API_KEY is required.');
    if (webhook && !config.webhookSecret) throw new Error('SKINDECK_WEBHOOK_SECRET is required.');

    return config;
}

module.exports = {
    getSkinDeckConfig,
    validateSkinDeckConfig
};