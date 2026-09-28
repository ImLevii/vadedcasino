## Usage

Those templates dependencies are maintained via [pnpm](https://pnpm.io) via `pnpm up -Lri`.

This is the reason you see a `pnpm-lock.yaml`. That being said, any package manager will work. This file can be safely be removed once you clone a template.

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

The production service is a single Node process that serves the Express API, Socket.IO, and the built SolidJS SPA. Do not deploy only the `dist` directory.

### Dokploy with Railpack

Use these application settings exactly:

- Build type: `Railpack`
- Container port: `3000`
- Health check path: `/healthz`
- Publish directory: leave empty
- Build command: leave empty; Railpack detects `pnpm build` from `package.json`
- Start command: leave empty; Railpack detects `pnpm start` from `package.json`

Remove legacy command values before redeploying. In particular, never place build and start commands in the same field; doing so passes `pnpm start` to Vite as an entry path and causes the container to exit before Traefik can route to it. The root `packageManager` field pins pnpm 9.15.9 because the committed lockfile uses format 9.0; pnpm 8 will reject it as incompatible.

Configure the external MySQL connection in Dokploy:

```bash
SQL_HOST=mysql.example.internal
SQL_PORT=3306
SQL_USER=cosmicluck
SQL_PASS=replace-with-a-secret
SQL_DB=cosmicluck
SQL_CONNECT_TIMEOUT_MS=10000
STARTUP_CACHE_TIMEOUT_MS=15000
```

`/healthz` reports process liveness and must be used by Dokploy. `/readyz` reports cache/database readiness and returns `503` when startup cache warming is degraded. Database failures do not prevent the server from opening port 3000, so Traefik no longer returns `502` solely because MySQL is slow or temporarily unavailable.

After saving the settings, perform one Dokploy redeploy. The deployment log should show `Listening on 0.0.0.0:3000` before cache completion messages.

### Vercel + Neon (no separate backend host)

Use Node.js 24.x. Vercel builds the Vite frontend into `dist` and deploys
`api/index.js` as the Express/Socket.IO backend. Both use the same public origin.
The Vercel frontend uses WebSocket transport and restores subscriptions after
reconnecting when a function reaches its maximum duration.

Set these **server-only** variables in Vercel's Production environment (and use
an isolated Neon branch for Preview deployments):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Rotated Neon pooled PostgreSQL connection string |
| `SQL_DIALECT` | `postgres` |
| `JWT_SECRET` | A stable random secret, at least 32 characters |
| `NODE_ENV` | `production` |
| `BASE_URL` | Your public HTTPS Vercel origin |
| `FRONTEND_URL` | The same public HTTPS Vercel origin |

Remove `VITE_SERVER_URL` and `VITE_SOCKET_URL` from Vercel and any production
Vite env files. Blank values now intentionally use the included same-origin API.
Never put database credentials or JWT secrets in variables prefixed `VITE_`.
Keep the project preset **Vite**, build command `npm run build`, output directory
`dist`, and enable Fluid compute. Commit/push the configuration, then redeploy.

For a fresh Neon database, apply `npm run db:neon:bootstrap` once from a trusted
local shell with `DIRECT_DATABASE_URL` and `DATABASE_URL` set privately. This
creates the application schema and seed settings. The API creates only its small
runtime event/session/media tables automatically; it does not initialize the full
application schema or an administrator. `npm run db:neon:check` verifies the
connection. Optional OAuth/payment providers still require their own credentials.

After deployment, verify `/readyz` returns HTTP 200, then check login, chat,
subscriptions after reconnect, and game actions on a preview database.
`/healthz` checks only process liveness. Schema initialization and environment
settings must be completed before the live API can pass readiness.

#### Runtime behavior

Vercel requests use a PostgreSQL transaction and advisory lock to coordinate
legacy caches across instances. Game actions, settlements, and event log writes
commit together; HTTP success responses wait for that commit. Crash, Roulette,
case battles, rain, and leaderboards advance from stored state instead of
relying on a continuously running process. Admin sessions, pending 2FA setup,
Discord linking, and slot authentication tokens persist in Neon with expiry.
Admin image uploads are stored in Neon and served at `/public/media/...`; the
processed image must be under 3 MB and the JSON request under 4 MB.

Connected browsers request a tick once per second; a shared database timestamp
coalesces those ticks. With no traffic, processing pauses and due work resumes
on the next request. Countdown deadlines remain persisted, so a restart does
not reopen betting. Cross-instance socket broadcasts use a Neon event log,
polled while WebSocket connections are active. This initial implementation
serializes game operations globally and prioritizes correctness; it needs load
testing on Vercel/Neon before supporting substantial concurrent play.

The optional long-running Discord bot is not part of this request-driven
backend. Local `npm run dev` and standalone `npm start` retain their existing
server mode.

References: [Vercel WebSockets and Socket.IO](https://vercel.com/docs/functions/websockets),
[Vercel function limits](https://vercel.com/docs/functions/limitations),
[Vite environment variables](https://vite.dev/guide/env-and-mode).

## Fresh Neon / PostgreSQL development database

Create an empty Neon database and copy its connection string from the Neon console.
Use the pooled URL for `DATABASE_URL`; an optional direct URL can be supplied as
`DIRECT_DATABASE_URL` for bootstrap. See [Neon's connection guide](https://neon.com/docs/connect/connect-from-any-app).

Add these server-only settings to `.env.local`:

```dotenv
SQL_DIALECT=postgres
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require
# Optional: create an owner account with zero balance on the first bootstrap.
NEON_ADMIN_USERNAME=your-admin-name
NEON_ADMIN_PASSWORD=your-own-password
```

Then run:

```bash
npm run db:neon:check
npm run db:neon:bootstrap
npm run dev
```

`db:neon:bootstrap` applies `database/schema.postgres.sql` in a transaction and
seeds feature/game settings. It creates no account unless both admin settings are
provided, and does not reset an existing admin password. It does not import MySQL
users, balances, history, or game assets. Remove the optional admin settings from
`.env.local` after bootstrap. A ready backend returns HTTP 200 at
`http://127.0.0.1:3000/readyz`.

The app supports `SQL_DIALECT=postgres`, `postgresql`, or `neon`; it also chooses
PostgreSQL when `DATABASE_URL` is present and `SQL_DIALECT` is unset. Existing
`SQL_HOST`, `SQL_USER`, `SQL_PASS`, and `SQL_DB` settings are ignored in this mode.
The driver verifies Neon's TLS certificate and keeps each transaction on one
connection. The adapter preserves the existing query result shape, camelCase
fields, and large user IDs.

To regenerate the PostgreSQL schema after changes to `database/schema.sql` or
`database/postgres-runtime.sql`, run `npm run db:neon:schema`. Use the PostgreSQL
bootstrap command for this database; `db:migrate` contains legacy MySQL migrations
and refuses to run against PostgreSQL. PostgreSQL regression tests run with
`npm test` using an isolated embedded PostgreSQL engine; no Neon credentials are
needed for those tests. They cover startup, authentication, static query planning,
parameter binding, generated IDs, upserts, and commit/rollback behavior. Hosted
Neon connectivity and concurrent transaction behavior still require integration
validation against the target database.

For an existing database, run `npm run db:auth-profiles` once to add provider
avatar storage without changing accounts or balances. Fresh schemas include it.
Steam and Google logins save Unicode display names and profile pictures and
refresh them on subsequent logins. Steam profile lookup requires `STEAM_API_KEY`;
Google login requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Configure
their callback URLs as `${BASE_URL}/auth/steam/callback` and
`${BASE_URL}/auth/google/callback`, respectively.

On Vercel, provider callbacks and post-login redirects use the current HTTPS
deployment host, ignoring stale local `BASE_URL` and `FRONTEND_URL` settings.
Register the production Google callback in the Google OAuth console; both Google
client credentials are required. Unconfigured Google login returns to the form
with a helpful message. Provider callbacks validate browser-bound, expiring state.

Players can also create an account with a username, email, and password. Email
identities are normalized and stored in `emailAccounts`; passwords use bcrypt.
The table is created automatically on Vercel initialization and for local email
authentication. Registration creates a normal user with zero balance. Existing
username/password accounts still work. Email delivery, verification, and password
reset are not part of this registration flow.

Run `npm run db:account-deletion` when upgrading an existing database to enable
account deletion from `/admin/users` → View → Delete account. Admins must confirm
the target account ID and cannot delete themselves, bots, or accounts with equal
or higher permissions. Deletion removes the profile from the active user list,
clears its credentials and profile data, and revokes access. Account/provider IDs
and financial history are retained; the deletion time and acting admin ID are
recorded. Signing in with the same provider cannot recreate the deleted account.

## Local MySQL Bootstrap

You can bootstrap a local database (create DB, apply schema, and create/update an admin user) with one command:

```bash
npm run db:bootstrap
```

### One-command Docker setup (recommended)

If you don't have MySQL installed locally, this command will:

1. Start MySQL in Docker (`docker-compose.mysql.yml`)
2. Wait until MySQL is reachable
3. Apply schema + compatibility fixes
4. Create/update admin user

```bash
npm run db:docker:bootstrap
```

Optional custom admin credentials:

```bash
node scripts/bootstrap-local-docker.js <username> <password>
```

### SQLite local mode (no MySQL required)

Use SQLite for local development with one command:

```bash
npm run db:sqlite:bootstrap
```

This command:

1. Creates/updates `database/local.sqlite` (or `SQLITE_FILE` if set)
2. Converts and applies `database/schema.sql` to SQLite format
3. Creates/updates local admin user
4. Writes `SQL_DIALECT=sqlite` and `SQLITE_FILE=...` into `.env.local`

Optional custom admin credentials:

```bash
node scripts/bootstrap-local-sqlite.js <username> <password>
```

The bootstrap script will use these values:

- `SQL_HOST` (default: `localhost`)
- `SQL_USER` (default: `root`)
- `SQL_PASS` (default: empty)
- `SQL_DB` (default: `cosmicluck_local`)

Optional custom admin credentials:

```bash
node scripts/bootstrap-local-db.js <username> <password>
```

Examples:

```bash
node scripts/bootstrap-local-db.js owner supersecret123
```

Legacy helpers are still available:

```bash
npm run db:create-admin
npm run db:fix-schema
```

## SkinDeck payments

SkinDeck deposits and CS2-skin withdrawals are protected by a server-side feature flag and an idempotent provider ledger. New SkinDeck sessions and orders remain disabled unless both the environment flag and the database `skindeck` feature are enabled.

```bash
SKINDECK_ENABLED=false
SKINDECK_API_KEY=
SKINDECK_WEBHOOK_SECRET=
SKINDECK_MODE=sandbox
```

- `SKINDECK_ENABLED` must be exactly `true` to allow new activity. It defaults to disabled.
- `SKINDECK_API_KEY` and `SKINDECK_WEBHOOK_SECRET` are server-only secrets. Never prefix them with `VITE_` or expose them to browser code.
- `SKINDECK_MODE` accepts `sandbox` or `live`. Start in sandbox.
- Register the webhook URL as `https://<cosmic-luck-host>/trading/skindeck/webhook` after confirming the required event subscriptions in SkinDeck's current merchant documentation.
- Each user must save a valid Steam Trade URL and 32-character Steam Web API key from `/profile`. SkinDeck reads both values from the server-side user record; clients cannot submit or override them in payment requests.
- Sandbox mode exposes a local marketplace-style inventory and signed checkout. The checkout signature includes the selected item IDs, so the credited basket cannot be changed after session creation.

Live mode remains fail-closed until the production provider adapter and callback signature/status mapping are implemented and verified against SkinDeck's current merchant contract.

The local ledger uses a unique provider reference and row-locked terminal transitions. Deposit value comes only from the provider-confirmed USD value, using the existing Cosmic Luck conversion rate. Withdrawals move coins into `heldBalance` before any provider order and consume or refund that hold exactly once.

Run the focused foundation tests with:

```bash
pnpm test:skindeck
```

Before enabling live mode, obtain compliance approval covering gambling licensing, KYC and age gating, allowed jurisdictions, skin-based deposits, and Valve's Terms of Service.
