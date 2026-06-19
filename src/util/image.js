export function resolveImageSrc(src, fallback = '') {
    const value = String(src || fallback || '');
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;

    const normalized = value.startsWith('/') ? value : `/${value}`;
    return `${import.meta.env.VITE_SERVER_URL}${normalized}`;
}