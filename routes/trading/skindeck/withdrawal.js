// A lost provider response is not proof that a trade failed. Keep its reservation
// until an authenticated provider event or reconciliation resolves the outcome.
async function submitWithdrawal({ client, userId, itemIds, profile }, {
    reserveWithdrawal, settleWithdrawal, usdToCoins, notifyBalance
}) {
    const quote = await client.quoteItems(itemIds);
    const payment = await reserveWithdrawal({
        userId, value: usdToCoins(quote.providerValue), providerValue: quote.providerValue,
        providerCurrency: quote.providerCurrency, skinItems: quote.items
    });
    notifyBalance(-payment.value);
    let order;
    try {
        order = await client.createWithdrawal({ internalRef: payment.internalRef, itemIds, profile });
        const result = await settleWithdrawal({
            internalRef: payment.internalRef, providerRef: order.providerRef,
            providerStatus: order.providerStatus, status: order.status, skinItems: order.items
        });
        if (!result) throw new Error('Withdrawal payment was not found.');
        if (result.balanceDelta) notifyBalance(result.balanceDelta);
        return { ...payment, status: result.payment.status, skinItems: order.items };
    } catch (error) {
        // Only a local sandbox failure before a returned order is known to be safe
        // to refund. A live timeout or local settlement failure must remain held.
        const knownFailure = client.mode === 'sandbox' && !order;
        try {
            const result = await settleWithdrawal({
                internalRef: payment.internalRef,
                providerRef: order?.providerRef,
                providerStatus: knownFailure ? 'request-failed' : 'confirmation-required',
                status: knownFailure ? 'failed' : 'unknown'
            });
            if (result?.balanceDelta) notifyBalance(result.balanceDelta);
        } catch (_) {
            // The committed reservation remains available for reconciliation.
        }
        throw error;
    }
}

module.exports = { submitWithdrawal };
