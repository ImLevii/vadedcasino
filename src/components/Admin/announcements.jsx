import {createSignal, For, Show, createResource} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import AdminMFA from "../MFA/adminmfa";

const TYPE_META = {
    info:    { label: 'INFO',    color: '#5dade2', bg: 'rgba(93,173,226,0.1)',  border: 'rgba(93,173,226,0.3)'  },
    success: { label: 'SUCCESS', color: '#1fd65f', bg: 'rgba(31,214,95,0.1)',   border: 'rgba(31,214,95,0.3)'   },
    warning: { label: 'WARNING', color: '#e8a14a', bg: 'rgba(232,161,74,0.1)',  border: 'rgba(232,161,74,0.3)'  },
    error:   { label: 'ERROR',   color: '#e74c3c', bg: 'rgba(231,76,60,0.1)',   border: 'rgba(231,76,60,0.3)'   },
};

function AdminAnnouncements() {

    const [resource, { mutate, refetch }] = createResource(fetchAll);
    const [items, setItems] = createSignal([]);

    // Form state
    const [msg, setMsg]             = createSignal('');
    const [type, setType]           = createSignal('info');
    const [link, setLink]           = createSignal('');
    const [linkText, setLinkText]   = createSignal('');
    const [dismissible, setDismissible] = createSignal(false);
    const [priority, setPriority]   = createSignal(0);
    const [startsAt, setStartsAt]   = createSignal('');
    const [expiresAt, setExpiresAt] = createSignal('');
    const [editId, setEditId]       = createSignal(null);
    const [saving, setSaving]       = createSignal(false);

    async function fetchAll() {
        const res = await authedAPI('/admin/announcements', 'GET', null);
        if (res?.error === '2FA_REQUIRED') return mutate({ mfa: true });
        setItems(res?.data || []);
        return mutate(res);
    }

    function resetForm() {
        setMsg(''); setType('info'); setLink(''); setLinkText('');
        setDismissible(false); setPriority(0); setStartsAt(''); setExpiresAt('');
        setEditId(null);
    }

    function loadEdit(item) {
        setEditId(item.id);
        setMsg(item.message || '');
        setType(item.type || 'info');
        setLink(item.link || '');
        setLinkText(item.linkText || '');
        setDismissible(!!item.dismissible);
        setPriority(item.priority || 0);
        setStartsAt(item.startsAt ? item.startsAt.slice(0, 16) : '');
        setExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 16) : '');
        document.getElementById('ann-form-top')?.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleSave() {
        if (!msg().trim()) return createNotification('error', 'Message is required.');
        setSaving(true);
        const body = {
            message: msg().trim(),
            type: type(),
            link: link() || null,
            linkText: linkText() || null,
            dismissible: dismissible(),
            priority: parseInt(priority()) || 0,
            startsAt: startsAt() ? new Date(startsAt()).toISOString() : null,
            expiresAt: expiresAt() ? new Date(expiresAt()).toISOString() : null,
            active: true,
        };

        const endpoint = editId() ? `/admin/announcements/${editId()}` : '/admin/announcements';
        const method = editId() ? 'PUT' : 'POST';
        const res = await authedAPI(endpoint, method, JSON.stringify(body), true);
        setSaving(false);
        if (res?.success) {
            createNotification('success', editId() ? 'Announcement updated.' : 'Announcement created.');
            resetForm();
            refetch();
        }
    }

    async function toggleActive(item) {
        const res = await authedAPI(`/admin/announcements/${item.id}`, 'PUT', JSON.stringify({ active: !item.active }), true);
        if (res?.success) refetch();
    }

    async function handleDelete(id) {
        if (!confirm('Delete this announcement?')) return;
        const res = await authedAPI(`/admin/announcements/${id}`, 'DELETE', null, true);
        if (res?.success) { createNotification('success', 'Deleted.'); refetch(); }
    }

    function formatDate(dt) {
        if (!dt) return '—';
        return new Date(dt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    }

    return (
        <>
            {resource()?.mfa && <AdminMFA refetch={refetch}/>}

            <div class='ann-admin' id='ann-form-top'>

                {/* ── Form ── */}
                <div class='card'>
                    <p class='card-title'>{editId() ? '✏️ EDIT ANNOUNCEMENT' : '+ NEW ANNOUNCEMENT'}</p>

                    <div class='form-grid'>
                        <div class='field full'>
                            <label>MESSAGE <span class='req'>*</span></label>
                            <textarea rows='2' placeholder='Enter announcement text...'
                                value={msg()} onInput={(e) => setMsg(e.target.value)}/>
                        </div>

                        <div class='field'>
                            <label>TYPE</label>
                            <div class='type-row'>
                                <For each={Object.entries(TYPE_META)}>{([key, meta]) =>
                                    <button class={'type-btn ' + (type() === key ? 'active' : '')}
                                            style={type() === key ? `background:${meta.bg};border-color:${meta.color};color:${meta.color}` : ''}
                                            onClick={() => setType(key)}>{meta.label}</button>
                                }</For>
                            </div>
                        </div>

                        <div class='field'>
                            <label>PRIORITY <span class='hint'>(higher = shown first)</span></label>
                            <input type='number' min='0' max='100' placeholder='0' value={priority()}
                                   onInput={(e) => setPriority(e.target.value)}/>
                        </div>

                        <div class='field'>
                            <label>LINK URL <span class='hint'>(optional)</span></label>
                            <input type='text' placeholder='https://...' value={link()}
                                   onInput={(e) => setLink(e.target.value)}/>
                        </div>

                        <div class='field'>
                            <label>LINK TEXT <span class='hint'>(optional)</span></label>
                            <input type='text' placeholder='Learn more' value={linkText()}
                                   onInput={(e) => setLinkText(e.target.value)}/>
                        </div>

                        <div class='field'>
                            <label>STARTS AT <span class='hint'>(leave blank = now)</span></label>
                            <input type='datetime-local' value={startsAt()}
                                   onInput={(e) => setStartsAt(e.target.value)}/>
                        </div>

                        <div class='field'>
                            <label>EXPIRES AT <span class='hint'>(leave blank = never)</span></label>
                            <input type='datetime-local' value={expiresAt()}
                                   onInput={(e) => setExpiresAt(e.target.value)}/>
                        </div>

                        <div class='field checkbox-field'>
                            <label>
                                <input type='checkbox' checked={dismissible()}
                                       onChange={(e) => setDismissible(e.target.checked)}/>
                                Allow users to dismiss
                            </label>
                        </div>
                    </div>

                    {/* Preview */}
                    <Show when={msg()}>
                        <div class='preview-label'>PREVIEW</div>
                        <div class='preview-ann' style={`background:${TYPE_META[type()].bg};border-color:${TYPE_META[type()].border};color:${TYPE_META[type()].color}`}>
                            <span class='ann-dot-preview' style={`background:${TYPE_META[type()].color}`}/>
                            {msg()}
                            {link() && <a href={link()} style={`color:${TYPE_META[type()].color};margin-left:8px;font-weight:700`}>{linkText() || link()}</a>}
                        </div>
                    </Show>

                    <div class='form-actions'>
                        <button class='ctrl-btn green' onClick={handleSave} disabled={saving()}>
                            {saving() ? 'SAVING...' : editId() ? 'SAVE CHANGES' : 'CREATE'}
                        </button>
                        <Show when={editId()}>
                            <button class='ctrl-btn gray' onClick={resetForm}>CANCEL</button>
                        </Show>
                    </div>
                </div>

                {/* ── List ── */}
                <div class='card'>
                    <p class='card-title'>ALL ANNOUNCEMENTS</p>

                    <Show when={!resource.loading} fallback={<Loader/>}>
                        <Show when={items().length > 0} fallback={<p class='empty'>No announcements yet.</p>}>
                            <div class='ann-list'>
                                <For each={items()}>{(item) => {
                                    const meta = TYPE_META[item.type] || TYPE_META.info;
                                    return (
                                        <div class={'ann-row ' + (item.active ? '' : 'inactive')}>
                                            <div class='ann-row-left'>
                                                <span class='type-badge' style={`background:${meta.bg};border-color:${meta.border};color:${meta.color}`}>
                                                    {meta.label}
                                                </span>
                                                <div class='ann-info'>
                                                    <p class='ann-msg'>{item.message}</p>
                                                    <div class='ann-meta'>
                                                        {item.link && <span class='meta-tag'>🔗 {item.linkText || item.link}</span>}
                                                        {item.dismissible && <span class='meta-tag'>✕ dismissible</span>}
                                                        {item.priority > 0 && <span class='meta-tag'>↑ {item.priority}</span>}
                                                        {item.startsAt && <span class='meta-tag'>▶ {formatDate(item.startsAt)}</span>}
                                                        {item.expiresAt && <span class='meta-tag'>⏹ {formatDate(item.expiresAt)}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class='ann-row-actions'>
                                                <button class={'toggle-btn ' + (item.active ? 'on' : 'off')} onClick={() => toggleActive(item)}>
                                                    {item.active ? 'LIVE' : 'OFF'}
                                                </button>
                                                <button class='ctrl-btn gray sm' onClick={() => loadEdit(item)}>EDIT</button>
                                                <button class='ctrl-btn red sm' onClick={() => handleDelete(item.id)}>DEL</button>
                                            </div>
                                        </div>
                                    );
                                }}</For>
                            </div>
                        </Show>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .ann-admin {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
              }

              .card {
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                padding: 20px 24px;
              }

              .card-title {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                color: #6b7280;
                margin-bottom: 18px;
              }

              .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
              }

              .field {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .field.full { grid-column: 1 / -1; }

              .field label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: #4b5260;
              }

              .req { color: #e74c3c; }
              .hint { color: #2e3440; font-weight: 500; }

              .field input, .field textarea, .field select {
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                padding: 8px 12px;
                color: #c3cad6;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
                outline: none;
                resize: vertical;
                transition: border-color .2s;
              }

              .field input:focus, .field textarea:focus { border-color: rgba(31,214,95,0.4); }

              .checkbox-field {
                flex-direction: row;
                align-items: center;
                gap: 8px;
              }

              .checkbox-field label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: #8b92a0;
                cursor: pointer;
              }

              .checkbox-field input[type='checkbox'] {
                width: 16px; height: 16px;
                padding: 0;
                border-radius: 3px;
                cursor: pointer;
              }

              .type-row {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
              }

              .type-btn {
                height: 30px;
                padding: 0 12px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.03);
                color: #6b7280;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: all .15s;
              }

              .type-btn:hover { background: rgba(255,255,255,0.07); color: #c3cad6; }

              .preview-label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.1em;
                color: #2e3440;
                margin: 16px 0 6px;
              }

              .preview-ann {
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 700;
              }

              .ann-dot-preview {
                width: 7px; height: 7px;
                flex-shrink: 0;
                border-radius: 50%;
                box-shadow: 0 0 6px currentColor;
              }

              .form-actions {
                display: flex;
                gap: 8px;
                margin-top: 18px;
              }

              .ctrl-btn {
                height: 36px;
                padding: 0 18px;
                border-radius: 6px;
                border: none;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: filter .15s;
              }

              .ctrl-btn.sm { height: 30px; padding: 0 12px; font-size: 11px; }
              .ctrl-btn:disabled { opacity: 0.6; cursor: not-allowed; }
              .ctrl-btn:not(:disabled):hover { filter: brightness(1.1); }
              .ctrl-btn.green { background: linear-gradient(180deg,#22e86a,#1fd65f); color: #021a09; }
              .ctrl-btn.red   { background: #c0392b; color: #fff; }
              .ctrl-btn.gray  { background: #1a1f29; border: 1px solid rgba(255,255,255,0.08); color: #c3cad6; }

              .empty {
                color: #4b5260;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                text-align: center;
                padding: 24px 0;
              }

              .ann-list { display: flex; flex-direction: column; gap: 8px; }

              .ann-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 14px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                transition: opacity .2s;
              }

              .ann-row.inactive { opacity: 0.45; }

              .ann-row-left {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                min-width: 0;
                flex: 1;
              }

              .type-badge {
                flex-shrink: 0;
                height: 22px;
                padding: 0 8px;
                border-radius: 4px;
                border: 1px solid;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.08em;
                display: flex;
                align-items: center;
              }

              .ann-info { min-width: 0; }

              .ann-msg {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: #c3cad6;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
              }

              .ann-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
              }

              .meta-tag {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 600;
                color: #4b5260;
                background: rgba(255,255,255,0.04);
                border-radius: 4px;
                padding: 2px 6px;
              }

              .ann-row-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
              }

              .toggle-btn {
                height: 28px;
                padding: 0 10px;
                border-radius: 5px;
                border: none;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
                cursor: pointer;
                letter-spacing: 0.06em;
                transition: filter .15s;
              }

              .toggle-btn.on  { background: rgba(31,214,95,0.15); color: #1fd65f; border: 1px solid rgba(31,214,95,0.3); }
              .toggle-btn.off { background: rgba(255,255,255,0.05); color: #4b5260; border: 1px solid rgba(255,255,255,0.08); }
              .toggle-btn:hover { filter: brightness(1.15); }

              @media (max-width: 700px) {
                .form-grid { grid-template-columns: 1fr; }
              }
            `}</style>
        </>
    );
}

export default AdminAnnouncements;
