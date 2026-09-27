export function validateVercelEnv(env) {
    if (env.VERCEL !== '1') return;
    const frontendHosts = new Set([env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean));
    for (const key of ['VITE_SERVER_URL', 'VITE_SOCKET_URL']) {
        const value = key === 'VITE_SOCKET_URL' ? (env[key] || env.VITE_SERVER_URL) : env[key];
        let url;
        try { url = new URL(value); } catch { /* Report the setting name, never its value. */ }
        if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || frontendHosts.has(url.host)) {
            throw new Error(`${key} must point to your separately running HTTPS Node backend, not this Vercel frontend. Deploy app.js on a persistent Node host and set VITE_SERVER_URL before rebuilding. See README.md.`);
        }
    }
}
