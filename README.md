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

### Vercel frontend + persistent Node backend

Vercel serves the Vite frontend from `dist`. This does not start `app.js`.
The current backend owns in-memory game rounds, timers, and Socket.IO sessions;
run one persistent Node process using the Dokploy settings above (or the included
Dockerfile). It is not implemented as Vercel Functions.

1. Deploy the backend with `npm run build` followed by `npm start`, port `3000`.
   Configure the database and server secrets on that host. Verify `/readyz`
   returns HTTP 200 before directing players to it.
2. On the backend, set `NODE_ENV=production`, `BASE_URL` to its public HTTPS
   origin, and `FRONTEND_URL=https://vadedcasino.vercel.app`. The explicit
   frontend origin enables API and Socket.IO CORS; arbitrary origins are not allowed.
3. In Vercel project settings, choose **Vite**, build command `npm run build`,
   output directory `dist`. Set `VITE_SERVER_URL` to the backend's HTTPS origin
   (for example `https://api.your-domain.com`). `VITE_SOCKET_URL` defaults to that
   same backend; only set it if Socket.IO runs at a different origin.
4. Redeploy after changing Vite variables: they are compiled into browser assets.
   Do not point them at `vadedcasino.vercel.app` or localhost. The build now
   rejects missing/invalid backend settings on Vercel instead of shipping a
   frontend that repeatedly calls nonexistent same-origin API routes.

`vercel.json` handles browser navigation to SPA pages without rewriting the
reported API and Socket.IO failures into HTML. It does not host or proxy the
backend. Username/password login stores the returned token on the frontend and
sends it in the Authorization header. OAuth cookies across unrelated domains
need a separate same-origin auth proxy or shared-domain configuration; setting
CORS alone does not transfer those cookies.

For a single-origin deployment, serve the entire app on Dokploy instead and
leave both `VITE_` URL settings blank. Local `npm run dev` also continues to use
the existing Vite proxy when the settings are blank.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite),
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
