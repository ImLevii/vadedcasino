const crypto = require('crypto');

const { assertProviderContract } = require('./contract');
const { validateSkinDeckConfig } = require('./config');

const SANDBOX_ITEMS = Object.freeze([
    Object.freeze({ id: 'sandbox-ak47-redline', name: 'AK-47 | Redline (Field-Tested)', image: '/assets/icons/cube.svg', providerValue: 35, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-awp-asiimov', name: 'AWP | Asiimov (Battle-Scarred)', image: '/assets/icons/cube.svg', providerValue: 70, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-m4a1-printstream', name: 'M4A1-S | Printstream (Field-Tested)', image: '/assets/icons/cube.svg', providerValue: 105, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-knife-doppler', name: 'Flip Knife | Doppler (Factory New)', image: '/assets/icons/cube.svg', providerValue: 140, providerCurrency: 'USD' })
]);

function getSandboxSecret(config) {
    const secret = config.webhookSecret || config.apiKey || process.env.JWT_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
        const error = new Error('SKINDECK_WEBHOOK_SECRET is required for production sandbox mode.');
        error.code = 'SKINDECK_CONFIG_ERROR';
        throw error;
    }
    return 'skindeck-local-sandbox';
}

function sign(value, secret) {
    return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left || '', 'utf8');
    const rightBuffer = Buffer.from(right || '', 'utf8');
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSandboxClient(config) {
    const secret = getSandboxSecret(config);

    function getItems(itemIds) {
        if (!Array.isArray(itemIds) || itemIds.length !== 1 || typeof itemIds[0] !== 'string') {
            const error = new Error('Select exactly one SkinDeck item.');
            error.code = 'INVALID_ITEMS';
            throw error;
        }

        const item = SANDBOX_ITEMS.find(candidate => candidate.id === itemIds[0]);
        if (!item) {
            const error = new Error('The selected SkinDeck item is unavailable.');
            error.code = 'ITEM_UNAVAILABLE';
            throw error;
        }
        return [{ ...item }];
    }

    async function quoteItems(itemIds) {
        const items = getItems(itemIds);
        return {
            items,
            providerValue: items.reduce((sum, item) => sum + item.providerValue, 0),
            providerCurrency: 'USD'
        };
    }

    return {
        mode: 'sandbox',
        listSkins: async () => SANDBOX_ITEMS.map(item => ({ ...item })),
        quoteItems,
        createDeposit: async ({ internalRef, origin }) => {
            const providerRef = `sandbox-deposit-${internalRef}`;
            const token = sign(providerRef, secret);
            return {
                providerRef,
                providerStatus: 'checkout-created',
                status: 'pending',
                redirectUrl: `${origin}/trading/skindeck/sandbox/deposits/${encodeURIComponent(internalRef)}?token=${token}`
            };
        },
        createWithdrawal: async ({ internalRef, itemIds }) => {
            const quote = await quoteItems(itemIds);
            return {
                ...quote,
                providerRef: `sandbox-withdrawal-${internalRef}`,
                providerStatus: 'delivered',
                status: 'completed'
            };
        },
        verifyCheckout: (internalRef, token) => safeEqual(token, sign(`sandbox-deposit-${internalRef}`, secret)),
        parseWebhook: (rawBody, signature) => {
            if (!Buffer.isBuffer(rawBody) || !safeEqual(signature, sign(rawBody, secret))) {
                const error = new Error('Invalid SkinDeck webhook signature.');
                error.code = 'INVALID_WEBHOOK_SIGNATURE';
                throw error;
            }
            return JSON.parse(rawBody.toString('utf8'));
        }
    };
}

function createSkinDeckClient() {
    const config = validateSkinDeckConfig();
    assertProviderContract(config.mode);

    if (config.mode === 'sandbox') return createSandboxClient(config);

    const error = new Error('SkinDeck live merchant contract has not been configured.');
    error.code = 'SKINDECK_CONTRACT_UNAVAILABLE';
    throw error;
}

module.exports = {
    SANDBOX_ITEMS,
    createSkinDeckClient
};