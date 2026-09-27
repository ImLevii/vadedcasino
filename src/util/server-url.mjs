export function resolveServerUrl(env, origin) {
    const configured = String(env.VITE_SERVER_URL || '').trim();
    return (!configured || configured === 'undefined' ? origin : configured).replace(/\/+$/, '');
}

export function resolveSocketUrl(env, origin) {
    const configured = String(env.VITE_SOCKET_URL || '').trim();
    return (!configured || configured === 'undefined' ? resolveServerUrl(env, origin) : configured).replace(/\/+$/, '');
}
