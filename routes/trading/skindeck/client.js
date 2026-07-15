const crypto = require('crypto');

const { assertProviderContract } = require('./contract');
const { validateSkinDeckConfig } = require('./config');

const SANDBOX_ITEMS = Object.freeze([
    Object.freeze({ id: 'sandbox-ak47-redline', name: 'AK-47 | Redline', wear: 'Field-Tested', rarity: 'classified', image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSMuWRDGKC_uJ_t-l9AXCxxEh14zjTztivci2ePQZ2W8NzTecD4BKwloLiYeqxtAOIj9gUyyngznQeF7I6QE8', providerValue: 35, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-awp-asiimov', name: 'AWP | Asiimov', wear: 'Battle-Scarred', rarity: 'covert', image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7NkLPSVB3WV_uJ_t-l9AX7rxhl-tmzSwomtdC6TPwQnW5UkR-YD5kK-ltCzP-Ox4FfXiNoQyyrgznQeu9L0PzQ', providerValue: 70, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-m4a1-printstream', name: 'M4A1-S | Printstream', wear: 'Field-Tested', rarity: 'classified', image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwiFO0P_6afVSKP-EAm6extF6ueZhW2exwkl2tmTXwt39eCiUPQR2DMN4TOVetUK8xoLgM-K341eM2otDnC6okGoXufBz_TAB', providerValue: 105, providerCurrency: 'USD' }),
    Object.freeze({ id: 'sandbox-knife-doppler', name: 'Flip Knife | Doppler', wear: 'Factory New', rarity: 'rare', image: 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Z-ua6bbZrLOmsD2qvzO9ksu1scC-ykRgYvzSCkpu3JCrBPVMkCZIiFLUC40S-l9DkZerg4Qfc3Y9DzCuo3SlK6ydv5e9UA71lpPNwsjHPzA', providerValue: 140, providerCurrency: 'USD' })
]);

function assertSteamProfile(profile) {
    if (!profile?.steamId || !profile?.tradeUrl || !profile?.apiKey) {
        const error = new Error('A Steam API key and trade URL are required.');
        error.code = 'STEAM_DETAILS_REQUIRED';
        throw error;
    }
    return profile;
}

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
        if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.length > 20 || itemIds.some(id => typeof id !== 'string')) {
            const error = new Error('Select between one and twenty SkinDeck items.');
            error.code = 'INVALID_ITEMS';
            throw error;
        }

        const uniqueIds = [...new Set(itemIds)];
        if (uniqueIds.length !== itemIds.length) {
            const error = new Error('A SkinDeck item can only be selected once.');
            error.code = 'INVALID_ITEMS';
            throw error;
        }

        const items = uniqueIds.map(id => SANDBOX_ITEMS.find(candidate => candidate.id === id));
        if (items.some(item => !item)) {
            const error = new Error('The selected SkinDeck item is unavailable.');
            error.code = 'ITEM_UNAVAILABLE';
            throw error;
        }
        return items.map(item => ({ ...item }));
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
        listInventory: async profile => {
            assertSteamProfile(profile);
            return SANDBOX_ITEMS.map(item => ({ ...item }));
        },
        listSkins: async profile => {
            assertSteamProfile(profile);
            return SANDBOX_ITEMS.map(item => ({ ...item }));
        },
        quoteItems,
        createDeposit: async ({ internalRef, origin, itemIds, profile }) => {
            assertSteamProfile(profile);
            const quote = await quoteItems(itemIds);
            const providerRef = `sandbox-deposit-${internalRef}`;
            const quotedItemIds = quote.items.map(item => item.id);
            const token = sign(`${providerRef}:${quotedItemIds.join(',')}`, secret);
            return {
                ...quote,
                providerRef,
                providerStatus: 'checkout-created',
                status: 'pending',
                redirectUrl: `${origin}/trading/skindeck/sandbox/deposits/${encodeURIComponent(internalRef)}?token=${token}&items=${encodeURIComponent(quotedItemIds.join(','))}`
            };
        },
        createWithdrawal: async ({ internalRef, itemIds, profile }) => {
            assertSteamProfile(profile);
            const quote = await quoteItems(itemIds);
            return {
                ...quote,
                providerRef: `sandbox-withdrawal-${internalRef}`,
                providerStatus: 'delivered',
                status: 'completed'
            };
        },
        verifyCheckout: (internalRef, token, itemIds) => {
            try {
                const verifiedItemIds = getItems(itemIds).map(item => item.id);
                return safeEqual(token, sign(`sandbox-deposit-${internalRef}:${verifiedItemIds.join(',')}`, secret));
            } catch (_) {
                return false;
            }
        },
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
    assertSteamProfile,
    createSkinDeckClient
};