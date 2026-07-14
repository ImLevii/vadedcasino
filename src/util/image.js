export function resolveImageSrc(src, fallback = '') {
    let value = String(src || fallback || '').trim();
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;

    value = value.replaceAll('\\', '/').replace(/^\.?\/?public\//i, '/');
    const normalized = value.startsWith('/') ? value : `/${value}`;
    const serverUrl = String(import.meta.env.VITE_SERVER_URL || '').replace(/\/+$/, '');
    return serverUrl ? `${serverUrl}${normalized}` : normalized;
}