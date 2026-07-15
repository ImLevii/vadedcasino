// Resilient production build entrypoint.
//
// The deployment platform was invoking the build with extra positional
// arguments, e.g. `vite build 'pnpm start' 'npm run server '`, which made
// Vite/Rollup treat "pnpm start" as an entry module and fail with:
//   Could not resolve entry module "pnpm start/index.html".
//
// Running the Vite build through this wrapper ignores any stray CLI arguments
// and always performs a normal production build using vite.config.js.

import { build } from 'vite';

try {
    await build();
} catch (err) {
    console.error('[build] Vite production build failed:');
    console.error(err);
    process.exit(1);
}
