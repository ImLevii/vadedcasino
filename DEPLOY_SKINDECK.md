# SkinDeck integration

Live mode is currently blocked by `routes/trading/skindeck/contract.js`. Setting
`SKINDECK_MODE=live` alone does not enable trading. The existing live client contains
unverified endpoint/payload assumptions and must not be enabled before replacing
those assumptions with the merchant contract and request/webhook fixtures.

Merchant references:
- https://skindeck.com/documents/merchant-docs-api.md
- https://skindeck.com/docs/

On 2026-09-26 both references returned a Vercel security checkpoint (HTTP 429;
browser verification also failed). Obtain the Markdown specification from the
merchant dashboard or SkinDeck before implementing live requests. Verify the API
base URL, authentication, inventory and price units, trade creation, idempotency,
webhook signing/status mapping, and trade-protection/reversal handling.

## Local sandbox

Set these variables privately in the server environment:

```env
SKINDECK_ENABLED=true
SKINDECK_MODE=sandbox
SKINDECK_WEBHOOK_SECRET=<random-private-secret>
```

The `skindeck` feature flag must also be enabled. Sandbox uses fixed test items;
no Steam skins move. Sandbox completions do update the local site ledger, so use
a development database. Never put merchant credentials in VITE-prefixed variables
or deployment documentation.

The cashier uses the stored Steam trade URL and API key. Its Steam identity comes
from the trade URL partner account and must match a linked Steam ID when present;
it never uses the internal site account ID as the Steam ID.

## Verification

Run `npm run test:skindeck`. Tests cover signed sandbox baskets, Steam identity,
fractional coin conversion, duplicate deposit settlement, conflicting references,
and withdrawal failure handling. These are local tests, not live merchant tests.

Callbacks are mounted at `/trading/skindeck/webhook`. The current signature format
is only verified for the local sandbox. Live signatures must follow the merchant
specification. Uncertain withdrawal outcomes retain reserved funds and appear as
`unknown` for reconciliation; never manually refund solely because a request timed
out. Reconcile against the provider before releasing or completing that hold.
