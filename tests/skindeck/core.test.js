const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');

function replaceModule(relativePath, exports) {
    const filename = require.resolve(path.join(root, relativePath));
    require.cache[filename] = {
        id: filename,
        filename,
        loaded: true,
        exports
    };
}

function loadServiceWithFakeDatabase(state) {
    const connection = {
        async query(query, params = []) {
            const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();

            if (normalized.startsWith('select * from paymenttransactions')) {
                state.lookupParams = params;
                return [[state.payment]];
            }
            if (normalized.startsWith('select id from users')) return [[{id: state.payment.userId}]];
            if (normalized.startsWith('update paymenttransactions')) {
                state.payment.providerRef = params[0] || state.payment.providerRef;
                state.payment.providerStatus = params[1];
                state.payment.status = 'completed';
                state.payment.value = params[3];
                return [{affectedRows: 1}];
            }
            if (normalized.startsWith('insert into transactions')) {
                state.genericTransactions++;
                return [{insertId: state.genericTransactions}];
            }
            if (normalized.startsWith('update users set balance = balance +')) {
                state.balance += params[0];
                return [{affectedRows: 1}];
            }

            throw new Error(`Unexpected test query: ${normalized}`);
        }
    };

    replaceModule('database/index.js', {
        doTransaction: async (logic) => logic(connection, async () => {
            state.commits++;
        })
    });
    replaceModule('routes/trading/crypto/deposit/functions.js', {
        cryptoData: {coinRate: {coins: 1, usd: 0.7}}
    });
    replaceModule('routes/admin/config.js', {depositBonus: 0});
    replaceModule('routes/user/rewards/functions.js', {activateDepositRewards: async () => {}});
    replaceModule('utils/index.js', {roundDecimal: value => Math.floor(value * 100) / 100});

    const servicePath = require.resolve(path.join(root, 'routes/trading/skindeck/service.js'));
    delete require.cache[servicePath];
    return require(servicePath);
}

test('configuration defaults to disabled sandbox mode', () => {
    const previous = {
        enabled: process.env.SKINDECK_ENABLED,
        mode: process.env.SKINDECK_MODE
    };
    delete process.env.SKINDECK_ENABLED;
    delete process.env.SKINDECK_MODE;

    const {getSkinDeckConfig} = require('../../routes/trading/skindeck/config');
    assert.deepEqual(getSkinDeckConfig(), {
        enabled: false,
        mode: 'sandbox',
        apiKey: process.env.SKINDECK_API_KEY || '',
        webhookSecret: process.env.SKINDECK_WEBHOOK_SECRET || '',
        apiUrl: process.env.SKINDECK_API_URL || 'https://api.skindeck.com/v1'
    });

    if (previous.enabled == null) delete process.env.SKINDECK_ENABLED;
    else process.env.SKINDECK_ENABLED = previous.enabled;
    if (previous.mode == null) delete process.env.SKINDECK_MODE;
    else process.env.SKINDECK_MODE = previous.mode;
});

test('redactor removes nested credentials and signatures', () => {
    const {redact} = require('../../routes/trading/skindeck/logger');
    assert.deepEqual(redact({
        authorization: 'Bearer raw',
        nested: {api_key: 'raw-key', signature: 'raw-signature', status: 'ok'}
    }), {
        authorization: '[REDACTED]',
        nested: {api_key: '[REDACTED]', signature: '[REDACTED]', status: 'ok'}
    });
});

test('provider contract supports sandbox and fails closed for unverified live mode', () => {
    const {assertProviderContract, isProviderContractReady} = require('../../routes/trading/skindeck/contract');
    assert.equal(isProviderContractReady('sandbox'), true);
    assert.equal(assertProviderContract('sandbox'), 'sandbox');
    assert.equal(isProviderContractReady('live'), false);
    assert.throws(assertProviderContract, error => error.code === 'SKINDECK_CONTRACT_UNAVAILABLE');
});

test('SkinDeck provider operations require the stored Steam profile', async () => {
    const {assertSteamProfile, createSkinDeckClient} = require('../../routes/trading/skindeck/client');
    assert.throws(() => assertSteamProfile({steamId: '100'}), error => error.code === 'STEAM_DETAILS_REQUIRED');

    const previousMode = process.env.SKINDECK_MODE;
    process.env.SKINDECK_MODE = 'sandbox';
    const client = createSkinDeckClient();
    await assert.rejects(client.listInventory({steamId: '100'}), error => error.code === 'STEAM_DETAILS_REQUIRED');
    if (previousMode == null) delete process.env.SKINDECK_MODE;
    else process.env.SKINDECK_MODE = previousMode;
});

test('sandbox checkout signature binds the selected item basket', async () => {
    const previousMode = process.env.SKINDECK_MODE;
    process.env.SKINDECK_MODE = 'sandbox';
    const {createSkinDeckClient} = require('../../routes/trading/skindeck/client');
    const client = createSkinDeckClient();
    const profile = {steamId: '100', tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=test', apiKey: 'A'.repeat(32)};
    const selected = ['sandbox-ak47-redline', 'sandbox-awp-asiimov'];
    const session = await client.createDeposit({internalRef: 'internal-ref', origin: 'https://example.test', itemIds: selected, profile});
    const url = new URL(session.redirectUrl);

    assert.equal(client.verifyCheckout('internal-ref', url.searchParams.get('token'), selected), true);
    assert.equal(client.verifyCheckout('internal-ref', url.searchParams.get('token'), ['sandbox-knife-doppler']), false);

    if (previousMode == null) delete process.env.SKINDECK_MODE;
    else process.env.SKINDECK_MODE = previousMode;
});

test('provider state update finds a new payment by its internal reference', async () => {
    const state = {
        payment: {
            id: 41,
            internalRef: 'internal-ref',
            providerRef: null,
            userId: '100',
            type: 'deposit',
            status: 'initiating'
        },
        balance: 0,
        genericTransactions: 0,
        commits: 0
    };
    const {updateProviderState} = loadServiceWithFakeDatabase(state);

    const result = await updateProviderState({
        internalRef: 'internal-ref',
        providerRef: 'new-provider-ref',
        providerStatus: 'created',
        status: 'pending'
    });

    assert.equal(result.duplicate, false);
    assert.deepEqual(state.lookupParams, ['skindeck', 'internal-ref']);
    assert.equal(state.commits, 1);
});

test('duplicate completed deposit credits exactly once', async () => {
    const state = {
        payment: {
            id: 42,
            internalRef: 'internal-ref',
            providerRef: 'provider-ref',
            userId: '100',
            type: 'deposit',
            status: 'pending'
        },
        balance: 0,
        genericTransactions: 0,
        commits: 0
    };
    const {settleDeposit, usdToCoins} = loadServiceWithFakeDatabase(state);

    assert.equal(usdToCoins(70), 100);

    const event = {
        providerRef: 'provider-ref',
        providerStatus: 'verified-success',
        status: 'completed',
        skinItems: [{id: 'skin-1'}],
        providerValue: 70,
        providerCurrency: 'USD'
    };

    const first = await settleDeposit(event);
    const duplicate = await settleDeposit(event);

    assert.equal(first.duplicate, false);
    assert.equal(duplicate.duplicate, true);
    assert.equal(state.balance, 100);
    assert.equal(state.genericTransactions, 1);
    assert.equal(state.payment.status, 'completed');
    assert.equal(state.commits, 2);
});
