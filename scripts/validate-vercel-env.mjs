export function validateVercelEnv(env) {
    if (env.VERCEL !== '1') return;
    // The API is now deployed with the frontend. Blank URLs intentionally use
    // the browser origin; PostgreSQL credentials are only read by the API.
    if (!env.VITE_SERVER_URL && !env.VITE_SOCKET_URL) return;
    for (const key of ['VITE_SERVER_URL', 'VITE_SOCKET_URL']) {
        const value = key === 'VITE_SOCKET_URL' ? (env[key] || env.VITE_SERVER_URL) : env[key];
        if (!value || !String(value).trim()) continue;
        let url;
        try { url = new URL(value); } catch { /* Report the setting name, never its value. */ }
        if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
            throw new Error(`${key} must be an HTTPS origin, or leave both VITE_SERVER_URL and VITE_SOCKET_URL unset to use the included Vercel backend. See README.md.`);
        }
    }
}
