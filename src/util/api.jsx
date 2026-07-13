import {toast} from "solid-toast";
import {errors} from "../resources/errors";

export const dropdowns = []

// ─── Custom toast renderer ───────────────────────────────────────────────────

const ACCENT = {
    success: { color: '#1fd65f', rgb: '31,214,95' },
    error:   { color: '#e74c3c', rgb: '231,76,60' },
    info:    { color: '#5865f2', rgb: '88,101,242' },
}

function ToastIcon(props) {
    const c = ACCENT[props.type] || ACCENT.info
    return (
        <div style={{
            width: '30px', height: '30px',
            borderRadius: '50%',
            background: `rgba(${c.rgb},0.12)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: '0'
        }}>
            {props.type === 'success' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke={c.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            )}
            {props.type === 'error' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke={c.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            )}
            {props.type !== 'success' && props.type !== 'error' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke={c.color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            )}
        </div>
    )
}

function showToast(type, message, options) {
    const a = ACCENT[type] || ACCENT.info
    return toast.custom((t) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#0f131a',
            border: `1px solid rgba(${a.rgb},0.18)`,
            borderLeft: `3px solid ${a.color}`,
            borderRadius: '8px',
            padding: '11px 14px 11px 11px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
            minWidth: '260px',
            maxWidth: '360px',
            opacity: t.visible ? '1' : '0',
            transform: t.visible ? 'translateX(0)' : 'translateX(20px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
            fontFamily: "'Geogrotesque Wide', 'Rubik', sans-serif",
            pointerEvents: 'all',
            userSelect: 'none',
            cursor: 'default',
        }}>
            <ToastIcon type={type}/>
            <p style={{
                margin: '0',
                color: '#c3cad6',
                fontSize: '13px',
                fontWeight: '600',
                lineHeight: '1.45',
                flex: '1',
                letterSpacing: '0.01em',
            }}>{message}</p>
        </div>
    ), { duration: 3500, ...options })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createNotification(type, message, options) {
    return showToast(type, message, options)
}

export async function api(path, method, body, notification = false, headers =  { 'Content-Type': 'application/json' }) {
    try {
        let res = await fetch(`${import.meta.env.VITE_SERVER_URL}${path}`, {
            method,
            headers,
            body,
        })
        let data = await res.json()

        if (data.error && notification) {
            showToast('error', errors[data.error] || data.error)
        } else if (data.error && data.error === 'DISABLED') {
            showToast('error', errors[data.error] || data.error)
        }

        return data
    } catch (e) {
        console.log('There was an error when trying to fetch ' + path, e)
        return null
    }
}

export async function authedAPI(path, method, body, notification = false) {
    return await api(path, method, body, notification, { 'Authorization': getJWT(), 'Content-Type': 'application/json' })
}

export async function fetchUser() {
    let user = await api('/user', 'GET', null, false, { 'Authorization': getJWT() })
    return user?.error ? null : user
}

export function addDropdown(setValue) {
    dropdowns.push(setValue)
}

export function closeDropdowns() {
    dropdowns.forEach(dropdown => dropdown(false))
}

export function getRandomNumber(min, max, chance) {
    const range = max - min + 1

    if (!chance)
        return Math.floor(Math.random() * range) + min;
    return Math.floor(chance.random() * range) + min;
}

export function getJWT() {
    return document.cookie.split("; ").find((row) => row.startsWith("jwt="))?.split("=")[1] || ''
}

export function logout() {
    document.cookie = `jwt= ; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    window.location.reload()
}