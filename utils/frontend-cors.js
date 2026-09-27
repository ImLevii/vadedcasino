function frontendOrigins(env = process.env) {
    const origins = new Set();
    if (env.NODE_ENV === 'development') {
        origins.add('http://localhost:3001');
        origins.add('http://127.0.0.1:3001');
    }
    for (const value of [env.FRONTEND_URL, env.BASE_URL]) {
        if (!value) continue;
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
            throw new Error('FRONTEND_URL and BASE_URL must be HTTP(S) URLs without credentials.');
        }
        origins.add(url.origin);
    }
    return origins;
}

function frontendCors(origins) {
    return (req, res, next) => {
        const origin = req.get('Origin');
        res.vary('Origin');
        if (origins.has(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.header('Access-Control-Max-Age', '7200');
        } else if (req.path.startsWith('/slots/hacksaw') && origin === 'https://static-live.hacksawgaming.com') {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Headers', '*');
            res.header('Access-Control-Allow-Methods', '*');
        }
        next();
    };
}

module.exports = { frontendOrigins, frontendCors };
