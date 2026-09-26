export function resolveImageSrc(src, fallback = '') {
    let value = String(src || fallback || '').trim();
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;

    // Keep the static namespace: /cases/* is also the case API route in dev.
    value = value.replaceAll('\\', '/').replace(/^\.?\/?public\//i, '/public/');
    let normalized = value.startsWith('/') ? value : `/${value}`;
    if (/^\/cases\/.*\.(png|jpe?g|webp|gif|svg|avif)(?:[?#]|$)/i.test(normalized)) normalized = `/public${normalized}`;
    const serverUrl = String(import.meta.env.VITE_SERVER_URL || '').replace(/\/+$/, '');
    return serverUrl ? `${serverUrl}${normalized}` : normalized;
}
