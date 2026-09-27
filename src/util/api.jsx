import {toast} from "solid-toast";
import {errors} from "../resources/errors";
import {resolveServerUrl} from './server-url.mjs';

export const dropdowns = []

// ─── Custom toast renderer ───────────────────────────────────────────────────

const ACCENT = {
    success: { color: '#1fd65f', rgb: '31,214,95',   label: 'SUCCESS' },
    error:   { color: '#e74c3c', rgb: '231,76,60',   label: 'ERROR'   },
    info:    { color: '#1fd65f', rgb: '31,214,95',  label: 'INFO'    },
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
        <div class='toast' classList={{ visible: t.visible }} style={{ '--toast-rgb': a.rgb }}
             onMouseEnter={() => toast.dismiss(t.id)} onClick={() => toast.dismiss(t.id)}>

            {/* Ambient radial glow behind icon */}
            <div class='toast-glow'/>

            <ToastIcon type={type}/>

            {/* Text block */}
            <div class='toast-body'>
                <p class='toast-label'>{a.label}</p>
                <p class='toast-message'>{message}</p>
            </div>

            {/* Dismiss button */}
            <button class='toast-dismiss' type='button' aria-label='Dismiss notification'>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

        </div>
    ), { duration, ...options })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createNotification(type, message, options) {
    return showToast(type, message, options)
}

function normalizePath(path) {
    return path.startsWith('/') ? path : `/${path}`
}

function resolveBaseUrl() {
    return resolveServerUrl(import.meta.env, window.location.origin)
}

const pendingWrites = new Set()
const nextWriteAt = new Map()

export async function api(path, method, body, notification = false, headers =  { 'Content-Type': 'application/json' }, timeout = 10000) {
    const writeKey = method?.toUpperCase() === 'POST' ? normalizePath(path) : null
    if (writeKey && (pendingWrites.has(writeKey) || Date.now() < (nextWriteAt.get(writeKey) || 0))) {
        if (notification) showToast('error', errors.SLOW_DOWN)
        return { error: 'SLOW_DOWN' }
    }
    if (writeKey) { pendingWrites.add(writeKey); nextWriteAt.set(writeKey, Date.now() + 350) }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const res = await fetch(`${resolveBaseUrl()}${normalizePath(path)}`, {
            method,
            headers,
            body,
            credentials: 'include',
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        let data = null
        try {
            data = await res.json()
        } catch (_) {
            data = { error: 'SERVER_ERROR' }
        }

        if (!res.ok && !data?.error) {
            data = { error: 'SERVER_ERROR' }
        }

        if (data.error && notification) {
            showToast('error', errors[data.error] || data.error)
        } else if (data.error && data.error === 'DISABLED') {
            showToast('error', errors[data.error] || data.error)
        }

        return data
    } catch (e) {
        clearTimeout(timeoutId)
        console.log('There was an error when trying to fetch ' + path, e)
        if (notification) {
            showToast('error', e.name === 'AbortError' ? 'The server took too long to respond.' : 'Unable to reach the server.')
        }
        return null
    } finally {
        clearTimeout(timeoutId)
        if (writeKey) { pendingWrites.delete(writeKey); nextWriteAt.set(writeKey, Date.now() + 350) }
    }
}

export async function authedAPI(path, method, body, notification = false, timeout = 10000) {
    return await api(path, method, body, notification, { 'Authorization': getJWT(), 'Content-Type': 'application/json' }, timeout)
}

export async function fetchUser() {
    let user = await api('/user', 'GET', null, false, { 'Authorization': getJWT() }, 3000)
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
    const value = document.cookie.split("; ").find((row) => row.startsWith("jwt="))?.slice(4) || ''
    try {
        return decodeURIComponent(value)
    } catch (_) {
        return value
    }
}

export function logout() {
    document.cookie = `jwt=; Path=/; SameSite=Lax;${window.location.protocol === 'https:' ? ' Secure;' : ''} expires=Thu, 01 Jan 1970 00:00:00 GMT`
    window.location.reload()
}
