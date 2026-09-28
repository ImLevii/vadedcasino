# Cashier and crypto provider migration

Reviewed 27 September 2026. The replacement provider has **not been activated**. Existing crypto integrations remain compatible while onboarding is decided; missing credentials and disabled methods are surfaced explicitly in the cashier and deposit UI.

## Recommended provider

**CryptoProcessing by CoinsPaid** is the preferred candidate for a licensed gaming business, subject to merchant approval, operating countries and the relevant regional agreement. Its [iGaming offering](https://cryptoprocessing.com/industries/crypto-payment-gateway-for-igaming-industry) supports deposits, withdrawals and mass payouts. It has [US terms](https://cryptoprocessing.com/en-us/legal-hub-usa/terms-of-use-usa) and a separate US API; a US entity must not automatically use the international API.

Before implementing the replacement, confirm the business registration country, gambling licence, customer markets and approval from the provider. Obtain the appropriate regional sandbox credentials and API contract. Fees and eligible jurisdictions must be confirmed during onboarding.

The API supports HTTPS callbacks and therefore does not require a persistent Render service. It uses an [API IP allowlist](https://docs.cryptoprocessing.com/merchant-administration/manage-allowed-ip-addresses-for-api-requests); [Vercel Static IPs](https://vercel.com/kb/guide/can-i-get-a-fixed-ip-address) can supply stable outbound addresses. Confirm the cost of that Vercel feature before purchasing it.

NOWPayments was also evaluated. Its [current pricing](https://nowpayments.io/pricing) advertises a 1% service fee, but its [31 August 2026 terms, section 15](https://nowpayments.io/doc/fd-tos.pdf?v=1.4.2) exclude residents/citizens of the US, UK, EU and UAE, among other restrictions. It is not a default recommendation without confirming jurisdiction. BitPay requires preapproval for gambling under its [terms](https://www.bitpay.com/legal/terms-of-use).

## Current integrations and fixes

- Deposit QR codes are rendered locally. Addresses only appear after a successful provider response. Network names, destination tags, confirmation counts, estimates, errors and deposit history are visible.
- Crypto estimates expire after five minutes; the server does not treat old database prices as current quotes.
- CoinPayments callbacks validate the raw-body HMAC, merchant ID and IPN mode. Deposit receipts, fractional coin credits, rewards and the balance commit together. Duplicate confirmed callbacks cannot credit again. Turning off new deposits does not turn off settlement of previously sent funds.
- Existing CoinPayments configuration requires `COINPAYMENTS_KEY`, `COINPAYMENTS_SECRET`, `COINPAYMENTS_IPN_SECRET`, `COINPAYMENTS_MERCHANT_ID` and a public HTTPS `BASE_URL` (Vercel's production domain is also supported). The callback remains `/trading/crypto/deposit/ipn`. Keep the old credentials and endpoint available during any migration until old deposits settle.
- MEXC withdrawal approval uses the documented `/api/v3/capital/withdraw` endpoint with a stable `withdrawOrderId`. The asset must already be funded; the undocumented app-token auto-trading flow was removed. `MEXC_APP_TOKEN` is no longer used.
- A withdrawal claim commits to Neon **before** the provider request. Timeout/ambiguous results remain `sending` with funds reserved. They are never automatically retried or refunded. Use **Reconcile with provider** to check the original transfer. An absent history result requires manual investigation; it does not prove that no transfer occurred. The history query covers at most the last 89 days and 1,000 results.
- Completed provider status is required before marking a withdrawal complete. Confirmed provider failures/cancellations refund once and restore any deducted crypto allowance. Pending requests can be denied or cancelled safely.
- Gift-card batches use cryptographic random codes and idempotent admin requests. Codes are returned only to the authenticated admin, never broadcast to all browsers. Redeemed values cannot be edited or deleted. Cashier actions retain actor, reason and request ID in `cashierAudit`.
- Credit-card availability requires the existing provider credentials. Incomplete responses and unavailable providers return a clear error. Card callbacks require a configured secret and the expected paid amount.

## Deployment

`runtime/cashier.js` applies the new receipt, wallet metadata and audit tables at startup. Neon migration preserves fractional crypto credits and adds the legacy card-order fields. `database/schema.sql` and `database/schema.postgres.sql` include the same structure for fresh installations.

No provider account was opened, API credentials changed, or real payment sent during implementation. The end-to-end cashier tests run against an isolated embedded PostgreSQL with mocked provider APIs. Before enabling a replacement, run that provider's sandbox cases for signed/replayed/out-of-order callbacks, minimum amounts, memo/network validation, under/overpayments, payout timeouts, reconciliation and account approval requirements.
