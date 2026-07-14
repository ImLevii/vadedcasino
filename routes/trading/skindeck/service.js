const crypto = require('crypto');

const { doTransaction } = require('../../../database');
const { cryptoData } = require('../crypto/deposit/functions');
const { checkAccountLock, depositBonus } = require('../../admin/config');
const { activateDepositRewards } = require('../../user/rewards/functions');
const { roundDecimal } = require('../../../utils');
const { assertLocalStatus, isTerminalStatus } = require('./contract');

function usdToCoins(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error('Provider value must be a positive number.');
    }

    return Math.floor(value * cryptoData.coinRate.coins / cryptoData.coinRate.usd);
}

function serializeItems(items) {
    if (items == null) return null;
    if (!Array.isArray(items)) throw new Error('Skin items must be an array.');
    return JSON.stringify(items);
}

function paymentError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
}

async function assertWithdrawalEligibility(connection, user, providerValue) {
    user.accountLock = await checkAccountLock(user, connection);
    if (user.accountLock) throw paymentError('ACCOUNT_LOCKED');
    if (user.sponsorLock) throw paymentError('SPONSOR_LOCK');

    const vip = user.perms > 1;
    if (vip) return;

    if (user.xp < 5000) throw paymentError('INSUFFICIENT_XP');

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [[lastTwoWeeks]] = await connection.query(
        "SELECT COALESCE(SUM(amount), 0) AS sum FROM transactions WHERE userId = ? AND type = 'deposit' AND createdAt > ?",
        [user.id, since]
    );
    if (lastTwoWeeks.sum < 200) throw paymentError('INSUFFICIENT_DEPOSITS');

    const [[totalDeposits]] = await connection.query(
        "SELECT COALESCE(SUM(amount), 0) AS sum FROM transactions WHERE userId = ? AND type = 'deposit'",
        [user.id]
    );
    const [[userWagered]] = await connection.query(
        'SELECT COALESCE(SUM(amount), 0) AS sum FROM bets WHERE userId = ? AND completed = 1',
        [user.id]
    );
    if (totalDeposits.sum > userWagered.sum) throw paymentError('NOT_ENOUGH_WAGERED_WITHDRAW');

    const [[lastDeposit]] = await connection.query(
        "SELECT amount, createdAt FROM transactions WHERE userId = ? AND type = 'deposit' ORDER BY id DESC LIMIT 1",
        [user.id]
    );
    if (!lastDeposit) throw paymentError('INSUFFICIENT_DEPOSITS');
    const [[wageredSinceLastDeposit]] = await connection.query(
        'SELECT COALESCE(SUM(amount), 0) AS sum FROM bets WHERE userId = ? AND completed = 1 AND createdAt > ?',
        [user.id, lastDeposit.createdAt]
    );
    if (lastDeposit.amount > wageredSinceLastDeposit.sum) throw paymentError('NOT_ENOUGH_WAGERED_WITHDRAW');

    if (!user.verified) {
        if (providerValue > 150) throw paymentError('KYC');
        const [[previousWithdrawals]] = await connection.query(
            `SELECT
                (SELECT COALESCE(SUM(fiatAmount), 0) FROM cryptoWithdraws WHERE userId = ? AND status = 'completed') +
                (SELECT COALESCE(SUM(providerValue), 0) FROM paymentTransactions
                 WHERE userId = ? AND provider = 'skindeck' AND type = 'withdrawal' AND status = 'completed') AS sum`,
            [user.id, user.id]
        );
        if (previousWithdrawals.sum + providerValue > 150) throw paymentError('KYC');
    }
}

async function createPaymentTransaction(userId, type, connectionOverride) {
    if (!['deposit', 'withdrawal'].includes(type)) throw new Error('Invalid payment type.');
    const internalRef = crypto.randomUUID();

    const insert = async (connection) => {
        const [result] = await connection.query(
            'INSERT INTO paymentTransactions (internalRef, userId, type, provider, status) VALUES (?, ?, ?, ?, ?)',
            [internalRef, userId, type, 'skindeck', 'initiating']
        );
        return { id: result.insertId, internalRef, status: 'initiating' };
    };

    if (connectionOverride) return insert(connectionOverride);

    return doTransaction(async (connection, commit) => {
        const payment = await insert(connection);
        await commit();
        return payment;
    });
}

async function getLockedPayment(connection, reference) {
    const byProvider = reference.providerRef != null;
    const column = byProvider ? 'providerRef' : 'internalRef';
    const value = byProvider ? reference.providerRef : reference.internalRef;
    if (!value) throw new Error('A payment reference is required.');

    const [[payment]] = await connection.query(
        `SELECT * FROM paymentTransactions WHERE provider = ? AND ${column} = ? FOR UPDATE`,
        ['skindeck', value]
    );
    return payment;
}

async function updateProviderState({
    internalRef,
    providerRef,
    providerStatus,
    status,
    skinItems,
    providerValue,
    providerCurrency,
    lastError = null
}) {
    assertLocalStatus(status);

    return doTransaction(async (connection, commit) => {
        const payment = await getLockedPayment(connection, { internalRef, providerRef });
        if (!payment) return null;
        if (isTerminalStatus(payment.status)) {
            await commit();
            return { payment, duplicate: true };
        }

        await connection.query(
            `UPDATE paymentTransactions
             SET providerRef = COALESCE(?, providerRef), providerStatus = ?, status = ?, skinItems = COALESCE(?, skinItems),
                 providerValue = COALESCE(?, providerValue), providerCurrency = COALESCE(?, providerCurrency), lastError = ?
             WHERE id = ?`,
            [providerRef, providerStatus, status, serializeItems(skinItems), providerValue, providerCurrency, lastError, payment.id]
        );
        await commit();
        return { payment: { ...payment, providerRef, providerStatus, status }, duplicate: false };
    });
}

async function settleDeposit({
    internalRef,
    providerRef,
    providerStatus,
    status,
    skinItems,
    providerValue,
    providerCurrency = 'USD'
}) {
    assertLocalStatus(status);
    if (status === 'completed' && providerCurrency !== 'USD') {
        throw new Error('Only verified USD provider values can be credited.');
    }

    return doTransaction(async (connection, commit) => {
        const payment = await getLockedPayment(connection, { internalRef, providerRef });
        if (!payment) return null;
        if (payment.type !== 'deposit') throw new Error('Payment is not a deposit.');
        if (isTerminalStatus(payment.status)) {
            await commit();
            return { payment, duplicate: true, balanceDelta: 0 };
        }

        if (status !== 'completed') {
            await connection.query(
                `UPDATE paymentTransactions
                 SET providerRef = COALESCE(?, providerRef), providerStatus = ?, status = ?, skinItems = COALESCE(?, skinItems),
                     providerValue = COALESCE(?, providerValue), providerCurrency = COALESCE(?, providerCurrency),
                     finalizedAt = CASE WHEN ? IN ('failed','cancelled','expired') THEN CURRENT_TIMESTAMP ELSE NULL END
                 WHERE id = ?`,
                [providerRef, providerStatus, status, serializeItems(skinItems), providerValue, providerCurrency, status, payment.id]
            );
            await commit();
            return { payment: { ...payment, status }, duplicate: false, balanceDelta: 0 };
        }

        const coinValue = usdToCoins(providerValue);
        if (coinValue < 1) throw new Error('Confirmed deposit value is below one coin.');

        const [[user]] = await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [payment.userId]);
        if (!user) throw new Error('Deposit user was not found.');

        await connection.query(
            `UPDATE paymentTransactions
             SET providerRef = COALESCE(?, providerRef), providerStatus = ?, status = 'completed', skinItems = COALESCE(?, skinItems),
                 value = ?, providerValue = ?, providerCurrency = ?, finalizedAt = CURRENT_TIMESTAMP, lastError = NULL
             WHERE id = ?`,
            [providerRef, providerStatus, serializeItems(skinItems), coinValue, providerValue, providerCurrency, payment.id]
        );
        const [transactionResult] = await connection.query(
            'INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)',
            [payment.userId, coinValue, 'deposit', 'skindeck', payment.id]
        );
        await activateDepositRewards(connection, payment.userId, coinValue);

        let balanceDelta = coinValue;
        if (depositBonus) {
            const bonus = roundDecimal(coinValue * depositBonus);
            await connection.query(
                'INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)',
                [payment.userId, bonus, 'in', 'deposit-bonus', transactionResult.insertId]
            );
            balanceDelta = roundDecimal(balanceDelta + bonus);
        }

        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [balanceDelta, payment.userId]);
        await commit();
        return { payment: { ...payment, status: 'completed', value: coinValue }, duplicate: false, balanceDelta };
    });
}

async function reserveWithdrawal({ userId, value, providerValue, providerCurrency = 'USD', skinItems }) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Invalid withdrawal value.');
    if (typeof providerValue !== 'number' || !Number.isFinite(providerValue) || providerValue <= 0) throw new Error('Invalid provider value.');
    if (providerCurrency !== 'USD') throw new Error('Only verified USD provider values can be reserved.');
    const coinValue = roundDecimal(value);

    return doTransaction(async (connection, commit) => {
        const [[user]] = await connection.query(
            `SELECT id, username, balance, heldBalance, xp, accountLock, sponsorLock, verified, perms
             FROM users WHERE id = ? FOR UPDATE`,
            [userId]
        );
        if (!user) throw new Error('Withdrawal user was not found.');
        await assertWithdrawalEligibility(connection, user, providerValue);
        if (user.balance < coinValue) throw paymentError('INSUFFICIENT_BALANCE');

        const [[{ pendingWithdrawals }]] = await connection.query(
            `SELECT COUNT(*) AS pendingWithdrawals FROM paymentTransactions
             WHERE userId = ? AND provider = 'skindeck' AND type = 'withdrawal'
               AND status IN ('initiating','pending','hold','unknown')`,
            [userId]
        );
        if (pendingWithdrawals > 0) {
            throw paymentError('PENDING_WITHDRAWAL');
        }

        const internalRef = crypto.randomUUID();
        const [result] = await connection.query(
            `INSERT INTO paymentTransactions
             (internalRef, userId, type, provider, status, skinItems, value, providerValue, providerCurrency)
             VALUES (?, ?, 'withdrawal', 'skindeck', 'initiating', ?, ?, ?, ?)`,
            [internalRef, userId, serializeItems(skinItems), coinValue, providerValue, providerCurrency]
        );
        await connection.query(
            'UPDATE users SET balance = balance - ?, heldBalance = heldBalance + ? WHERE id = ?',
            [coinValue, coinValue, userId]
        );
        await connection.query(
            'INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)',
            [userId, coinValue, 'out', 'skindeck-hold', result.insertId]
        );

        await commit();
        return { id: result.insertId, internalRef, status: 'initiating', value: coinValue };
    });
}

async function settleWithdrawal({
    internalRef,
    providerRef,
    providerStatus,
    status,
    skinItems
}) {
    assertLocalStatus(status);

    return doTransaction(async (connection, commit) => {
        const payment = await getLockedPayment(connection, { internalRef, providerRef });
        if (!payment) return null;
        if (payment.type !== 'withdrawal') throw new Error('Payment is not a withdrawal.');
        if (isTerminalStatus(payment.status)) {
            await commit();
            return { payment, duplicate: true, balanceDelta: 0, heldDelta: 0 };
        }

        if (!isTerminalStatus(status)) {
            await connection.query(
                `UPDATE paymentTransactions
                 SET providerRef = COALESCE(?, providerRef), providerStatus = ?, status = ?, skinItems = COALESCE(?, skinItems)
                 WHERE id = ?`,
                [providerRef, providerStatus, status, serializeItems(skinItems), payment.id]
            );
            await commit();
            return { payment: { ...payment, status }, duplicate: false, balanceDelta: 0, heldDelta: 0 };
        }

        const [[user]] = await connection.query(
            'SELECT id, balance, heldBalance FROM users WHERE id = ? FOR UPDATE',
            [payment.userId]
        );
        if (!user || user.heldBalance < payment.value) throw new Error('Held balance invariant violated.');

        let balanceDelta = 0;
        if (status === 'completed') {
            await connection.query('UPDATE users SET heldBalance = heldBalance - ? WHERE id = ?', [payment.value, payment.userId]);
        } else {
            await connection.query(
                'UPDATE users SET heldBalance = heldBalance - ?, balance = balance + ? WHERE id = ?',
                [payment.value, payment.value, payment.userId]
            );
            await connection.query(
                'INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)',
                [payment.userId, payment.value, 'in', 'skindeck-refund', payment.id]
            );
            balanceDelta = payment.value;
        }

        await connection.query(
            `UPDATE paymentTransactions
             SET providerRef = COALESCE(?, providerRef), providerStatus = ?, status = ?, skinItems = COALESCE(?, skinItems),
                 finalizedAt = CURRENT_TIMESTAMP, lastError = NULL
             WHERE id = ?`,
            [providerRef, providerStatus, status, serializeItems(skinItems), payment.id]
        );
        await commit();
        return { payment: { ...payment, status }, duplicate: false, balanceDelta, heldDelta: -payment.value };
    });
}

module.exports = {
    createPaymentTransaction,
    reserveWithdrawal,
    settleDeposit,
    settleWithdrawal,
    updateProviderState,
    usdToCoins
};