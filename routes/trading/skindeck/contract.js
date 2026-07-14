const LOCAL_STATUSES = new Set([
    'initiating',
    'pending',
    'hold',
    'unknown',
    'completed',
    'failed',
    'cancelled',
    'expired'
]);

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'expired']);

function assertLocalStatus(status) {
    if (!LOCAL_STATUSES.has(status)) throw new Error(`Unsupported local payment status: ${status}`);
    return status;
}

function isTerminalStatus(status) {
    return TERMINAL_STATUSES.has(status);
}

function assertProviderContract() {
    const error = new Error('SkinDeck merchant contract has not been verified.');
    error.code = 'SKINDECK_CONTRACT_UNAVAILABLE';
    throw error;
}

function isProviderContractReady() {
    return false;
}

module.exports = {
    assertLocalStatus,
    assertProviderContract,
    isTerminalStatus,
    isProviderContractReady,
    LOCAL_STATUSES,
    TERMINAL_STATUSES
};