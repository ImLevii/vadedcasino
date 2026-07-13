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
        <div class='toast-icon'>
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
        <div class='toast' classList={{ visible: t.visible }} style={{ '--toast-rgb': a.rgb }}>

            {/* Ambient radial glow behind icon */}
            <div class='toast-glow'/>

            <ToastIcon type={type}/>

            {/* Text block */}
            <div class='toast-body'>
                <p class='toast-label'>{a.label}</p>
                <p class='toast-message'>{message}</p>
            </div>

            {/* Dismiss button */}
            <button class='toast-dismiss' onClick={() => toast.dismiss(t.id)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            {/* Progress bar */}
            <div class='toast-progress'>
                <div class='toast-progress-fill' style={{ 'animation-duration': `${duration}ms` }}/>
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