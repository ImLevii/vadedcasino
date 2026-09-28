# Admin operations

The operations workspace targets the deployed Vercel + Neon PostgreSQL runtime.
`/admin` shows gross gaming revenue, cash flow, registrations, live games, and engine
health. Gross gaming revenue is settled stakes minus payouts; it is not accounting
profit. Refunds carry zero edge and equal stake/payout, so they do not inflate GGR.

## Navigation and data

- `/admin/games`: live operations, search by game/player/account, state/game/node
  filters, active/recent/history views, attention filter, and sorting.
- `/admin/games/settings`: staged configuration changes with review, reason, and
  explicit save/discard. Opening the page or changing a slider does not save.
- `/admin/audit`: durable game-control and settings receipts, including failures.
- Existing users, cashier, case management, and fairness pages remain available
  within the responsive admin shell, subject to permissions.

Lists default to 25 rows, capped at 50 per request; game details show up to 250 bets
and 50 audit receipts. Large history searches are bounded by pagination but still
require production-scale query/load testing. Live lists use authenticated Socket.IO
snapshot acknowledgements every three seconds, with HTTP fallback every five
seconds and slower polling for hidden tabs. Rows retain their identity across
updates. Failed reads retain the previous snapshot and disable controls until fresh
data arrives. Reconnection and tab activation request authoritative snapshots.

Connected players are authenticated users with a presence heartbeat within 45
seconds, not a precise count of unique humans. Node IDs identify the instance that
last advanced an engine; games are not permanently assigned to that instance.
Health combines sanitized engine error codes and runtime thresholds. Provider
games are read-only; a provider settlement must not be credited a second time here.
Exposure labels distinguish current cash-out value, largest Roulette outcome
payout, and unsettled stakes. They are operational measurements, not a solvency
model or guaranteed eventual winnings.

## Authorization

All admin HTTP routes require the current authenticated staff account and an
elevated session lasting 30 minutes. Accounts with TOTP configured must submit a
valid code; staff accounts without TOTP can explicitly open the workspace using
their authenticated session. Configure TOTP on production staff accounts.

OWNER and ADMIN can inspect financial data, manage settings, pause games, control
admission, cancel/refund eligible games, and recover eligible engines. DEV can
inspect games/debug information, with financial fields redacted, but cannot mutate
games/settings or access the financial dashboard. Permissions are validated in the
backend for every action. Socket snapshots recheck JWT, session, current role,
and banned/deleted status on every request. No raw server seeds, hidden Mines
positions, provider credentials, or unsanitized exception messages are exposed.

## Controls by game

| Game             | Safe controls and limits                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roulette / Crash | Lock new bets; pause/resume before play; close betting early; cancel/refund before betting's deadline and before play; recover the current committed round. No mid-spin/mid-flight pause or refund.      |
| Mines            | Lock new starts; pause/resume tile reveals; refund before any reveal; settle the player's current earned cash-out after safe reveals. Player cash-outs remain available while paused.                    |
| Case battles     | Lock entries; pause/refund while waiting and before randomness/round commitment; retry the original committed engine.                                                                                    |
| Coinflip         | Lock entries; pause/refund before both sides are committed; retry original block/result settlement.                                                                                                      |
| Case opening     | Lock new openings; inspect atomically completed openings. No retrospective cancellation.                                                                                                                 |
| Blackjack        | Inspect/refund legacy active stakes. New bets return `BLACKJACK_UNAVAILABLE`: the pre-existing engine had unfinished actions and no player table. It must be implemented and validated before reopening. |
| Provider slots   | Inspect provider records only; no local settlement override.                                                                                                                                             |

Global locks reject new entries without preventing existing games from settling.
Recovery preserves seeds and outcomes; it does not restart a game with new odds.
Already completed games cannot be replayed. Recovery of an older Crash/Roulette
record is rejected instead of silently advancing a different round. Manual recovery
requires the coordinated Vercel transaction runtime; standalone processes retain
their automatic engine loops but do not expose this nested recovery action.

Roulette and Crash freeze timing, payouts/caps, and relevant configuration per
round. Settings changes apply to subsequent rounds. Changes to other stateful games
are rejected while they have active games. Mines remains a 25-tile board; Roulette
green/bait payouts retain their supported values.

## Transaction and retry contract

Every control requires a reason, an observed state version, and a unique request
ID. Mutations lock admission control, the round, and affected ledger rows inside
the existing PostgreSQL coordinator. Two staff members acting on the same old
state cannot both succeed. Each ledger bet is completed at most once.

Refunds, balance credits, ledger state, cancellation markers, and the successful
audit receipt commit together. A failed mutation rolls back its savepoint and
buffered events, then writes a failure receipt. A failed credit cannot leave a
round cancelled or its bet completed. Settings batches use the same atomic pattern
and bind request IDs to the full submitted values. A retry with the same identity,
parameters, and request ID returns its existing receipt; a changed request with the
same ID conflicts. After an uncertain network response, retry the exact same request
ID. A definite audited failure requires a fresh inspection and new intention.

Financial socket notifications invalidate the browser's cached balance; clients
read `/user/balance` rather than applying duplicate incremental credits. Disconnected
clients discard outgoing commands. Only read subscriptions are replayed after
reconnection. Do not add client-side automatic retries for bets or cash-outs.

## Roulette timing

The server determines the result and commits the betting/spin timestamps. Public
snapshots conceal the result until betting closes. The client reconstructs a
deterministic path from the previous result, target result, four extra cycles, and
the server clock. A single animation frame loop accelerates, cruises, and brakes
smoothly; it lands on the exact target at all refresh rates. Mid-spin joins and
reconnects resume at current progress. Older rounds, duplicate snapshots, result
changes, and regressive phases are rejected. Final highlights wait for settlement.

## Deployment and operating limits

`database/operations.sql` is bundled with the Vercel function. Initialization creates
operation controls, audits, frozen round rules, health, presence, and supporting
indexes using idempotent DDL. The full game schema must already exist. The runtime
database role needs the same schema-creation permissions as the existing runtime
bootstrap. New read queries use PostgreSQL features and are not supported by the
legacy MySQL deployment without additional query adaptation.

Vercel uses client/request-driven ticks and a PostgreSQL advisory lock across
instances. With no traffic, due processing resumes on the next request. Persisted
deadlines still close betting; delayed requests cannot reopen it. HTTP success and
realtime event delivery follow the committed transaction. Independent engine
savepoints prevent one engine failure from blocking other engine advancement.
This is not an always-running worker service. Global serialization limits throughput;
load-test against an isolated Neon branch before increasing concurrent play.

For failures, inspect the game detail's state, pending bets, event timeline, health
code, and audit receipts. Check `/readyz` and deployment/server logs. Use recovery
only when available and inspect the resulting receipt. External randomness/provider
outages can require the upstream service to recover; controls cannot manufacture
verified randomness or guarantee external availability.

## Verification

Run `node --test` for isolated PostgreSQL integration and unit tests, and `npm run
build` for the production frontend. Tests cover role/TOTP checks, redaction, stale
versions, duplicate and competing refunds, failed-credit rollback, settings
atomicity, savepoint event rollback, reconnect command suppression, balance event
deduplication, and Roulette paths at 30/60/120/144 Hz.

Browser verification used an isolated local PostgreSQL fixture with the production
runtime, at 320, 390, 768, 1024, 1440, and 1920 px. It exercised the session gate,
dashboard, operations, settings, users, cashier, fairness, audit, confirmation
dialogs, empty results, balance synchronization, offline/stale controls, reconnects, reloads, and consecutive Roulette
landings. Real-money production actions were not used for testing. Synthetic
correctness checks do not establish production throughput or cover every external
provider failure mode.
