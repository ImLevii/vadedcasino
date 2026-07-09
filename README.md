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

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

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
