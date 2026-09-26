# Case battle verification

New battles use RANDOM.ORG's [Signed API v4](https://api.random.org/json-rpc/4/signed).
Existing battles without a `randomTicket` retain the EOS provider and original roll algorithm.

## Configuration

Copy `.env.randomorg.example` to `.env.randomorg.local`, fill in the server-only API key,
and restart the backend. This credential file is ignored by Git and is never imported
by Vite. Set `RANDOM_ORG_LICENSE` to the license assigned by RANDOM.ORG; the supplied
Developer key is for local development/testing. Production rejects an unset or
Developer license before creating a ticket, and rejects Developer-licensed signed
results. A suitable RANDOM.ORG license is required before live use. Flexible licenses
requiring per-draw `licenseData` are not configured by this integration.

For an existing database run `node scripts/migrate-battle-fairness.js`. The migration
adds nullable `randomTicket` and `randomProof` fields without modifying historical
seeds. Fresh schemas already contain these fields.

## Commitment and recovery

1. Creation publishes SHA256(server seed) and a single-use RANDOM.ORG ticket with
   `showResult: true`. No random seed has been drawn yet.
2. Once all seats are filled, `generateSignedStrings` draws one 32-character hex
   client seed using that ticket. Signed `userData` binds the battle ID, server seed
   hash, algorithm, and a hash of seats, mode, case versions, item values, and ranges.
3. The RSA-SHA512 signature is verified using RANDOM.ORG's published signing key.
   The untouched `random` object and signature are stored as text, preserving JSON
   property order. The client seed/proof is persisted before opening any cases.
4. A timeout/restart recovers the same ticket through `getTicket`; it cannot redraw
   using a new ticket. Provider failures pause the battle and retry every 30 seconds.
   No alternate RNG is used. A failed ticket allocation rolls back/no-ops the wallet.
5. Seeds are revealed when the battle starts, after seats have locked. They can then
   reproduce every round. The panel displays rolls only as their rounds become live.

Public signing key source: <https://api.random.org/server.crt>.
Verification procedure: <https://api.random.org/signatures/manual>.
The certificate's SPKI public key is pinned at `public/assets/fairness/random-org-public-key.pem`.
A provider signing-key rotation requires updating that pin after checking the official source.

## Ticket calculation (v2)

For round R and seat S (both starting at 1), `nonce = (R - 1) * playerCount + S`.
Calculate `HMAC-SHA256(serverSeed, clientSeed + ':' + nonce)` using UTF-8 strings.
Read consecutive 8-hex-digit chunks as unsigned 32-bit integers. Reject values at
or above 4,294,900,000. For the first accepted value, `ticket = value % 100000 + 1`.
If all eight chunks are rejected, repeat with
`SHA256(originalDigest + ':retry:' + counter)`, beginning at counter 1.
Select the item whose inclusive `rangeFrom`–`rangeTo` contains the ticket.

New battles sum item values in integer cents. Standard/Case mode awards the highest
team total; Crazy the lowest; Group has one team and shares the total. Ties use the
lowest sum of rolled tickets, then the highest team number. Per-player payouts are
rounded to two decimals. Legacy battles retain their original floating-point and
15-hex-digit ticket behavior for accurate replay.

## Player panel

The battle toolbar's **Provably Fair** button opens a responsive dialog. It refreshes
on battle events and polls every three seconds while open, can follow the current
round or inspect a selected round, and exports JSON proof. The browser independently
checks the signature, rules hash, server seed commitment, nonce order, item ranges,
and winning team using Web Crypto. Private proofs require the battle's private key.
The RANDOM.ORG verifier link provides an independent verification option.

Tests: `node --test tests/randomorg.test.js tests/postgres.test.js tests/postgres-startup.test.js`.
