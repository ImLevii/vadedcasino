import {createResource, createSignal, For, Show, onCleanup} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import AdminMFA from "../MFA/adminmfa";
import Avatar from "../Level/avatar";
import {useSearchParams} from "@solidjs/router";

function AdminRain(props) {

    // ── Tippers table ─────────────────────────────────────────
    const [username, setUsername] = createSignal('')
    const [amount, setAmount] = createSignal('')
    const [users, setUsers] = createSignal([])
    const [params, setParams] = useSearchParams()
    const [phrasesResource, {mutate: mutatePhrases, refetch: refetchPhrases}] = createResource(() => params?.search || '', fetchUsers)

    // ── Status ────────────────────────────────────────────────
    const [status, setStatus] = createSignal(null)
    const [statusLoading, setStatusLoading] = createSignal(false)

    // ── Controls ──────────────────────────────────────────────
    const [startAmount, setStartAmount] = createSignal(200)
    const [startDuration, setStartDuration] = createSignal(30)
    const [schedAmount, setSchedAmount] = createSignal(200)
    const [schedDuration, setSchedDuration] = createSignal(30)
    const [schedDelay, setSchedDelay] = createSignal(60)
    const [scheduledAt, setScheduledAt] = createSignal(null)

    // ── Config ────────────────────────────────────────────────
    const [cfgAmount, setCfgAmount] = createSignal('')
    const [cfgDuration, setCfgDuration] = createSignal('')
    const [cfgJoinTime, setCfgJoinTime] = createSignal('')

    // Poll status every 5s
    async function refreshStatus() {
        setStatusLoading(true)
        const res = await authedAPI('/admin/rain/status', 'GET', null, false)
        if (res?.error === '2FA_REQUIRED') return mutatePhrases({mfa: true})
        if (res && !res.error) setStatus(res)
        setStatusLoading(false)
    }
    refreshStatus()
    const poll = setInterval(refreshStatus, 5000)
    onCleanup(() => clearInterval(poll))

    async function fetchUsers(search) {
        try {
            setUsername(search)
            let res = await authedAPI(`/admin/rain${search ? `?search=${search}` : ''}`, 'GET', null)
            if (res.error && res.error === '2FA_REQUIRED') return mutatePhrases({mfa: true})
            setUsers(res?.data)
            return mutatePhrases(res)
        } catch (e) { return mutatePhrases(null) }
    }

    function formatMs(ms) {
        if (!ms) return '—'
        const s = Math.floor(ms / 1000)
        const m = Math.floor(s / 60)
        const h = Math.floor(m / 60)
        if (h > 0) return `${h}h ${m % 60}m`
        if (m > 0) return `${m}m ${s % 60}s`
        return `${s}s`
    }

    return (
        <>
            {phrasesResource()?.mfa && <AdminMFA refetch={refetchPhrases}/>}

            <div class='rain-admin'>

                {/* ── Status card ── */}
                <div class='section'>
                    <div class='section-header'>
                        <p class='section-title'>CURRENT RAIN STATUS</p>
                        <button class='icon-btn' onClick={refreshStatus} title='Refresh'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M1 4v6h6M23 20v-6h-6'/><path d='M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15'/>
                            </svg>
                        </button>
                    </div>
                    <div class='status-grid'>
                        <div class='status-item'>
                            <p class='stat-label'>STATUS</p>
                            <p class={'stat-value ' + (status()?.active ? 'green' : 'gray')}>{status() === null ? '...' : status()?.active ? '● ACTIVE' : '○ IDLE'}</p>
                        </div>
                        <div class='status-item'>
                            <p class='stat-label'>AMOUNT</p>
                            <p class='stat-value'>{status()?.amount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '—'}</p>
                        </div>
                        <div class='status-item'>
                            <p class='stat-label'>TIME LEFT</p>
                            <p class='stat-value'>{formatMs(status()?.timeLeftMs)}</p>
                        </div>
                        <div class='status-item'>
                            <p class='stat-label'>USERS JOINED</p>
                            <p class='stat-value'>{status()?.usersJoined ?? '—'}</p>
                        </div>
                        <div class='status-item'>
                            <p class='stat-label'>DEFAULT AMOUNT</p>
                            <p class='stat-value'>{status()?.config?.systemRainAmount}</p>
                        </div>
                        <div class='status-item'>
                            <p class='stat-label'>DEFAULT DURATION</p>
                            <p class='stat-value'>{status()?.config ? `${status().config.systemRainDuration / 60000}m` : '—'}</p>
                        </div>
                    </div>
                </div>

                <div class='controls-row'>

                    {/* ── Pot controls ── */}
                    <div class='section'>
                        <p class='section-title'>ADJUST POT</p>
                        <div class='field-row'>
                            <div class='field'>
                                <label>AMOUNT</label>
                                <input type='number' placeholder='e.g. 50' value={amount()} onInput={(e) => setAmount(e.target.valueAsNumber)}/>
                            </div>
                        </div>
                        <div class='btn-row'>
                            <button class='ctrl-btn green' onClick={async () => {
                                const res = await authedAPI('/admin/rain/add', 'POST', JSON.stringify({amount: amount()}), true)
                                if (res?.success) { createNotification('success', `Added ${amount()} to rain pot.`); refreshStatus() }
                            }}>+ ADD</button>
                            <button class='ctrl-btn red' onClick={async () => {
                                const res = await authedAPI('/admin/rain/substract', 'POST', JSON.stringify({amount: amount()}), true)
                                if (res?.success) { createNotification('success', `Subtracted ${amount()} from rain pot.`); refreshStatus() }
                            }}>– SUBTRACT</button>
                        </div>
                    </div>

                    {/* ── Force start/stop ── */}
                    <div class='section'>
                        <p class='section-title'>START / STOP</p>
                        <div class='field-row'>
                            <div class='field'>
                                <label>AMOUNT</label>
                                <input type='number' placeholder='200' value={startAmount()} onInput={(e) => setStartAmount(e.target.valueAsNumber)}/>
                            </div>
                            <div class='field'>
                                <label>DURATION (min)</label>
                                <input type='number' placeholder='30' value={startDuration()} onInput={(e) => setStartDuration(e.target.valueAsNumber)}/>
                            </div>
                        </div>
                        <div class='btn-row'>
                            <button class='ctrl-btn green' onClick={async () => {
                                const res = await authedAPI('/admin/rain/start', 'POST', JSON.stringify({amount: startAmount(), durationMinutes: startDuration()}), true)
                                if (res?.success) { createNotification('success', 'Rain started!'); refreshStatus() }
                            }}>▶ START RAIN</button>
                            <button class='ctrl-btn red' onClick={async () => {
                                if (!confirm('Force-stop the active rain?')) return
                                const res = await authedAPI('/admin/rain/stop', 'POST', null, true)
                                if (res?.success) { createNotification('success', 'Rain stopped.'); refreshStatus() }
                                else createNotification('error', res?.error || 'No active rain.')
                            }}>■ STOP RAIN</button>
                        </div>
                    </div>

                    {/* ── Schedule ── */}
                    <div class='section'>
                        <p class='section-title'>SCHEDULE RAIN</p>
                        {scheduledAt() && (
                            <div class='schedule-badge'>
                                <span>⏰ Scheduled at {new Date(scheduledAt()).toLocaleTimeString()}</span>
                                <button class='icon-btn red-icon' onClick={async () => {
                                    const res = await authedAPI('/admin/rain/schedule/cancel', 'POST', null, true)
                                    if (res?.success) { setScheduledAt(null); createNotification('success', 'Schedule cancelled.') }
                                }}>✕</button>
                            </div>
                        )}
                        <div class='field-row'>
                            <div class='field'>
                                <label>AMOUNT</label>
                                <input type='number' placeholder='200' value={schedAmount()} onInput={(e) => setSchedAmount(e.target.valueAsNumber)}/>
                            </div>
                            <div class='field'>
                                <label>IN (min)</label>
                                <input type='number' placeholder='60' value={schedDelay()} onInput={(e) => setSchedDelay(e.target.valueAsNumber)}/>
                            </div>
                            <div class='field'>
                                <label>DURATION (min)</label>
                                <input type='number' placeholder='30' value={schedDuration()} onInput={(e) => setSchedDuration(e.target.valueAsNumber)}/>
                            </div>
                        </div>
                        <div class='btn-row'>
                            <button class='ctrl-btn blue' onClick={async () => {
                                const res = await authedAPI('/admin/rain/schedule', 'POST', JSON.stringify({
                                    amount: schedAmount(), delayMinutes: schedDelay(), durationMinutes: schedDuration()
                                }), true)
                                if (res?.success) { setScheduledAt(res.scheduledAt); createNotification('success', `Rain scheduled for ${new Date(res.scheduledAt).toLocaleTimeString()}`) }
                                else createNotification('error', res?.error || 'Failed.')
                            }}>⏱ SCHEDULE</button>
                        </div>
                    </div>

                </div>

                {/* ── Config ── */}
                <div class='section'>
                    <p class='section-title'>DEFAULT CONFIG</p>
                    <div class='field-row'>
                        <div class='field'>
                            <label>DEFAULT AMOUNT</label>
                            <input type='number' placeholder={status()?.config?.systemRainAmount || 200} value={cfgAmount()} onInput={(e) => setCfgAmount(e.target.value)}/>
                        </div>
                        <div class='field'>
                            <label>DURATION (min)</label>
                            <input type='number' placeholder={status()?.config ? status().config.systemRainDuration / 60000 : 30} value={cfgDuration()} onInput={(e) => setCfgDuration(e.target.value)}/>
                        </div>
                        <div class='field'>
                            <label>JOIN WINDOW (min)</label>
                            <input type='number' placeholder={status()?.config ? status().config.joinTime / 60000 : 2} value={cfgJoinTime()} onInput={(e) => setCfgJoinTime(e.target.value)}/>
                        </div>
                        <button class='ctrl-btn gray align-end' onClick={async () => {
                            const body = {}
                            if (cfgAmount()) body.systemRainAmount = cfgAmount()
                            if (cfgDuration()) body.systemRainDurationMinutes = cfgDuration()
                            if (cfgJoinTime()) body.joinTimeMinutes = cfgJoinTime()
                            const res = await authedAPI('/admin/rain/config', 'POST', JSON.stringify(body), true)
                            if (res?.success) { createNotification('success', 'Config updated.'); setCfgAmount(''); setCfgDuration(''); setCfgJoinTime(''); refreshStatus() }
                        }}>SAVE CONFIG</button>
                    </div>
                </div>

                {/* ── Tippers table ── */}
                <div class='section'>
                    <div class='section-header'>
                        <p class='section-title'>RAIN TIPPERS</p>
                    </div>
                    <div class='table-header'>
                        <div class='table-column'><p>USERNAME</p></div>
                        <div class='table-column'><p>AMOUNT</p></div>
                    </div>
                    <div class='search-row'>
                        <div class='input-wrapper'>
                            <input placeholder='Search user...' value={username()} onInput={(e) => setUsername(e.target.value)}/>
                            <button class='search-button' onClick={() => setParams({search: username()})}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 19 19" fill="none">
                                    <path d="M16.2987 17.8313L16.2988 17.8314C16.5039 18.0371 16.7798 18.15 17.0732 18.15C17.3511 18.15 17.6162 18.0476 17.818 17.8601C18.2484 17.4602 18.2624 16.7948 17.8478 16.3785L13.7547 12.2684C14.7979 11.0227 15.3686 9.47437 15.3686 7.86374C15.3686 3.99137 12.1072 0.85 8.10932 0.85C4.11147 0.85 0.85 3.99137 0.85 7.86374C0.85 11.7361 4.11147 14.8775 8.10932 14.8775C9.56844 14.8775 10.9619 14.4644 12.163 13.6786L16.2987 17.8313ZM8.10932 2.94054C10.929 2.94054 13.214 5.15409 13.214 7.86374C13.214 10.5734 10.929 12.7869 8.10932 12.7869C5.28964 12.7869 3.00461 10.5734 3.00461 7.86374C3.00461 5.15409 5.28964 2.94054 8.10932 2.94054Z" fill="#837EC1" stroke="#837EC1" stroke-width="0.3"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <Show when={!phrasesResource.loading} fallback={<Loader/>}>
                        <div class='table'>
                            <For each={users()}>{(tipper) =>
                                <div class='table-data'>
                                    <div class='table-column'>
                                        <Avatar id={tipper?.id} xp={tipper.xp} height='28'/>
                                        <p class='white'>{tipper?.username || 'Anonymous'}</p>
                                    </div>
                                    <div class='table-column'>
                                        <img src='/assets/icons/coin.svg' height='14' alt=''/>
                                        <p class='white'>{tipper?.amount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                    </div>
                                </div>
                            }</For>
                        </div>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .rain-admin {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
              }

              .section {
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                padding: 16px 20px;
              }

              .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 14px;
              }

              .section-title {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                color: #6b7280;
                margin-bottom: 14px;
              }

              .section-header .section-title { margin-bottom: 0; }

              .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 10px;
              }

              .status-item {
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                padding: 10px 14px;
              }

              .stat-label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0.1em;
                color: #4b5260;
                margin-bottom: 4px;
              }

              .stat-value {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 14px;
                font-weight: 700;
                color: #c3cad6;
              }

              .stat-value.green { color: #1fd65f; }
              .stat-value.gray  { color: #4b5260; }

              .controls-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px;
              }

              .field-row {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 12px;
              }

              .field {
                display: flex;
                flex-direction: column;
                gap: 5px;
                flex: 1;
                min-width: 80px;
              }

              .field label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: #4b5260;
              }

              .field input {
                width: 100%;
                height: 36px;
                padding: 0 10px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                outline: none;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #c3cad6;
              }

              .field input:focus { border-color: rgba(31,214,95,0.4); }

              .btn-row {
                display: flex;
                gap: 8px;
              }

              .ctrl-btn {
                flex: 1;
                height: 36px;
                outline: none;
                border: none;
                border-radius: 6px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: filter .15s;
              }

              .ctrl-btn:hover { filter: brightness(1.1); }

              .ctrl-btn.green {
                background: linear-gradient(180deg, #22e86a 0%, #1fd65f 100%);
                color: #021a09;
              }

              .ctrl-btn.red {
                background: #c0392b;
                color: white;
              }

              .ctrl-btn.blue {
                background: #2980b9;
                color: white;
              }

              .ctrl-btn.gray {
                background: #2a313d;
                color: #c3cad6;
                border: 1px solid rgba(255,255,255,0.08);
              }

              .align-end { align-self: flex-end; height: 36px; flex: none; padding: 0 16px; }

              .icon-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 6px;
                cursor: pointer;
                color: #6b7280;
                outline: none;
                transition: color .2s;
              }

              .icon-btn:hover { color: #c3cad6; }
              .red-icon { color: #e74c3c; }

              .schedule-badge {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(41,128,185,0.12);
                border: 1px solid rgba(41,128,185,0.3);
                border-radius: 6px;
                padding: 6px 10px;
                margin-bottom: 10px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 600;
                color: #5dade2;
              }

              .table { display: flex; flex-direction: column; }

              .table-header, .table-data {
                display: flex;
                justify-content: space-between;
              }

              .table-header { margin: 0 0 10px; }

              .table-header p {
                background: rgba(255,255,255,0.04);
                height: 24px;
                line-height: 24px;
                padding: 0 12px;
                border-radius: 4px;
                color: #6b7280;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              .table-data {
                height: 48px;
                background: #1a1f29;
                border-radius: 6px;
                padding: 0 16px;
                display: flex;
                align-items: center;
                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
              }

              .table-data:nth-of-type(2n) { background: rgba(255,255,255,0.02); }

              .table-column {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
              }

              .table-column:nth-of-type(2n) { justify-content: flex-end; }

              .search-row {
                margin-bottom: 12px;
              }

              .input-wrapper {
                width: 100%;
                max-width: 360px;
                height: 40px;
                display: flex;
                border-radius: 6px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.07);
                overflow: hidden;
              }

              .input-wrapper input {
                flex: 1;
                background: transparent;
                border: none;
                outline: none;
                color: white;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
                padding: 0 12px;
              }

              .search-button {
                height: 100%;
                width: 40px;
                outline: none;
                border: none;
                background: rgba(255,255,255,0.04);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .white { color: #c3cad6; }

              @media (max-width: 900px) {
                .controls-row { grid-template-columns: 1fr; }
              }
            `}</style>
        </>
    );
}

export default AdminRain;
