import {toast} from "solid-toast";
import {errors} from "../resources/errors";

export const dropdowns = []

// ─── Custom toast renderer ───────────────────────────────────────────────────

const ACCENT = {
    success: { color: '#1fd65f', rgb: '31,214,95',   label: 'SUCCESS' },
    error:   { color: '#e74c3c', rgb: '231,76,60',   label: 'ERROR'   },
    info:    { color: '#5865f2', rgb: '88,101,242',  label: 'INFO'    },
}

function ToastIcon(props) {
    const c = ACCENT[props.type] || ACCENT.info
    return (
        <div style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: `rgba(${c.rgb},0.1)`,
            border: `1.5px solid rgba(${c.rgb},0.3)`,
            boxShadow: `0 0 14px rgba(${c.rgb},0.18)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: '0', position: 'relative', zIndex: '1',
        }}>
            {props.type === 'success' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke={c.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            )}
            {props.type === 'error' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke={c.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            )}
            {props.type !== 'success' && props.type !== 'error' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
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
    const duration = options?.duration ?? 3500

    return toast.custom((t) => (
        <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: `linear-gradient(135deg, rgba(${a.rgb},0.08) 0%, #0c1018 45%)`,
            border: `1px solid rgba(${a.rgb},0.2)`,
            borderLeft: `4px solid ${a.color}`,
            borderRadius: '10px',
            padding: '13px 14px 16px 12px',
            boxShadow: `0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(${a.rgb},0.06), 0 0 28px rgba(${a.rgb},0.07)`,
            minWidth: '270px',
            maxWidth: '370px',
            overflow: 'hidden',
            opacity: t.visible ? '1' : '0',
            transform: t.visible ? 'translateX(0) scale(1)' : 'translateX(28px) scale(0.96)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            fontFamily: "'Geogrotesque Wide', 'Rubik', sans-serif",
            pointerEvents: 'all',
            userSelect: 'none',
        }}>

            {/* Ambient radial glow behind icon */}
            <div style={{
                position: 'absolute', top: '0', left: '0',
                width: '90px', height: '90px',
                background: `radial-gradient(circle at 20% 30%, rgba(${a.rgb},0.14) 0%, transparent 65%)`,
                pointerEvents: 'none',
            }}/>

            <ToastIcon type={type}/>

            {/* Text block */}
            <div style={{ flex: '1', minWidth: '0', position: 'relative', zIndex: '1' }}>
                <p style={{
                    margin: '0 0 3px 0',
                    color: a.color,
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    lineHeight: '1',
                }}>{a.label}</p>
                <p style={{
                    margin: '0',
                    color: '#c3cad6',
                    fontSize: '13px',
                    fontWeight: '500',
                    lineHeight: '1.45',
                    letterSpacing: '0.005em',
                }}>{message}</p>
            </div>

            {/* Dismiss button */}
            <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px', borderRadius: '4px',
                    color: '#4a5260',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: '0', position: 'relative', zIndex: '1',
                    transition: 'color 0.15s ease, background 0.15s ease',
                    alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#8b92a0'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#4a5260'; e.currentTarget.style.background = 'none' }}
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            {/* Progress bar */}
            <div style={{
                position: 'absolute', bottom: '0', left: '0', right: '0',
                height: '2px',
                background: `rgba(${a.rgb},0.1)`,
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: '100%',
                    background: `linear-gradient(90deg, rgba(${a.rgb},0.5), ${a.color})`,
                    transformOrigin: 'left center',
                    animation: `toast-shrink ${duration}ms linear forwards`,
                }}/>
            </div>
        </div>
    ), { duration, ...options })
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