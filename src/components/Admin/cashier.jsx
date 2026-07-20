import {createSignal, createResource, For, Show, onCleanup} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import AdminCryptoCashier from "../Cashier/cryptotxs";
import AdminSkinDeckCashier from "../Cashier/skindecktxs";
import {useSearchParams} from "@solidjs/router";

function AdminCashier(props) {

    const [params, setParams] = useSearchParams()
    const [username, setUsername] = createSignal('')
    const [worth, setWorth] = createSignal(3)
    const [amount, setAmount] = createSignal(1)

    // ── Giftcard management state ──
    const [gcPage, setGcPage] = createSignal(1)
    const [gcSearch, setGcSearch] = createSignal('')
    const [gcStatus, setGcStatus] = createSignal('active')
    const [cards, setCards] = createSignal([])
    const [gcTotal, setGcTotal] = createSignal(0)
    const [gcPages, setGcPages] = createSignal(1)
    const [gcLoading, setGcLoading] = createSignal(false)

    // Edit modal state
    const [editModal, setEditModal] = createSignal(null)
    const [editAmount, setEditAmount] = createSignal('')
    const [editNotes, setEditNotes] = createSignal('')

    async function fetchGiftcards(page, search, status) {
        setGcLoading(true)
        try {
            const p = page || gcPage()
            const s = search !== undefined ? search : gcSearch()
            const st = status !== undefined ? status : gcStatus()
            const url = `/admin/cashier/giftcards?page=${p}${s ? `&search=${encodeURIComponent(s)}` : ''}${st ? `&status=${st}` : ''}`
            const res = await authedAPI(url, 'GET', null)
            if (res?.success) {
                setCards(res.data || [])
                setGcTotal(res.total)
                setGcPages(res.pages)
            }
        } catch (e) {
            console.error(e)
        }
        setGcLoading(false)
    }

    // Fetch on mount and when page/search/status changes
    // We'll manually call when needed

    async function deleteCard(id) {
        if (!confirm('Are you sure you want to delete this gift card? This cannot be undone.')) return
        const res = await authedAPI(`/admin/cashier/giftcards/${id}`, 'DELETE', null, true)
        if (res?.success) {
            createNotification('success', 'Gift card deleted.')
            fetchGiftcards()
        } else {
            createNotification('error', res?.error || 'Failed to delete.')
        }
    }

    function openEdit(card) {
        setEditModal(card)
        setEditAmount(String(card.amount))
        setEditNotes(card.notes || '')
    }

    async function saveEdit() {
        const card = editModal()
        if (!card) return

        const body = {}
        const amt = parseInt(editAmount())
        if (!isNaN(amt) && amt !== card.amount) {
            body.amount = amt
        }
        if (editNotes() !== (card.notes || '')) {
            body.notes = editNotes()
        }
        if (Object.keys(body).length === 0) {
            setEditModal(null)
            return
        }

        const res = await authedAPI(`/admin/cashier/giftcards/${card.id}`, 'PUT', JSON.stringify(body), true)
        if (res?.success) {
            createNotification('success', 'Gift card updated.')
            setEditModal(null)
            fetchGiftcards()
        } else {
            createNotification('error', res?.error || 'Failed to update.')
        }
    }

    function exportGiftCards(cards) {
        const blob = new Blob([cards.join('\n')], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "cards.txt";
        link.href = url;
        link.click();
    }

    // Initial fetch
    fetchGiftcards(1, '', 'active')

    // Reset to page 1 when filters change
    function onSearch(val) {
        setGcSearch(val)
        setGcPage(1)
        fetchGiftcards(1, val, undefined)
    }

    function onStatusFilter(val) {
        setGcStatus(val)
        setGcPage(1)
        fetchGiftcards(1, undefined, val)
    }

    return (
        <>
            <div className='content'>
                {params.type === 'crypto' ? (
                    <AdminCryptoCashier/>
                ) : params.type === 'skindeck' ? (
                  <AdminSkinDeckCashier/>
                ) : (
                    <div class='giftcards-section'>
                        {/* ─── Gift Cards Management ─── */}
                        <div class='gc-header'>
                            <div class='banner'>
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'><rect x='3' y='5' width='18' height='14' rx='2'/><line x1='3' y1='10' x2='21' y2='10'/><path d='M7 15h.01M11 15h2'/></svg>
                                <p>GIFT CARDS</p>
                                <div class='line'/>
                            </div>

                            <div class='gc-toolbar'>
                                <div class='gc-filter-row'>
                                    <div class='search-wrapper'>
                                        <input class='search' placeholder='SEARCH CODE...' value={gcSearch()}
                                               onInput={(e) => {
                                                   const val = e.target.value
                                                   setGcSearch(val)
                                               }}/>
                                        <button class='search-button' onClick={() => onSearch(gcSearch())}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
                                                <path d="M16.2987 17.8313L16.2988 17.8314C16.5039 18.0371 16.7798 18.15 17.0732 18.15C17.3511 18.15 17.6162 18.0476 17.818 17.8601C18.2484 17.4602 18.2624 16.7948 17.8478 16.3785L13.7547 12.2684C14.7979 11.0227 15.3686 9.47437 15.3686 7.86374C15.3686 3.99137 12.1072 0.85 8.10932 0.85C4.11147 0.85 0.85 3.99137 0.85 7.86374C0.85 11.7361 4.11147 14.8775 8.10932 14.8775C9.56844 14.8775 10.9619 14.4644 12.163 13.6786L16.2987 17.8313ZM8.10932 2.94054C10.929 2.94054 13.214 5.15409 13.214 7.86374C13.214 10.5734 10.929 12.7869 8.10932 12.7869C5.28964 12.7869 3.00461 10.5734 3.00461 7.86374C3.00461 5.15409 5.28964 2.94054 8.10932 2.94054Z" fill="#8b92a0" stroke="#8b92a0" stroke-width="0.3"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <div class='status-tabs'>
                                        <button class={'tab ' + (gcStatus() === 'active' ? 'active' : '')} onClick={() => onStatusFilter('active')}>ACTIVE</button>
                                        <button class={'tab ' + (gcStatus() === 'redeemed' ? 'active' : '')} onClick={() => onStatusFilter('redeemed')}>REDEEMED</button>
                                        <button class={'tab ' + (gcStatus() === '' ? 'active' : '')} onClick={() => onStatusFilter('')}>ALL</button>
                                    </div>
                                </div>

                                <div class='gc-refresh' onClick={() => fetchGiftcards()} title='Refresh'>
                                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                                        <path d='M1 4v6h6M23 20v-6h-6'/><path d='M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15'/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div class='gc-table-wrapper'>
                            <div class='gc-table'>
                                <div class='gc-table-header'>
                                    <div class='gc-col col-id'>ID</div>
                                    <div class='gc-col col-code'>CODE</div>
                                    <div class='gc-col col-amount'>AMOUNT</div>
                                    <div class='gc-col col-status'>STATUS</div>
                                    <div class='gc-col col-redeemed'>REDEEMED BY</div>
                                    <div class='gc-col col-notes'>NOTES</div>
                                    <div class='gc-col col-actions'>ACTIONS</div>
                                </div>

                                <Show when={!gcLoading()} fallback={
                                    <div class='gc-loading'>
                                        <span class='spinner'/>
                                        <p>Loading gift cards...</p>
                                    </div>
                                }>
                                    <Show when={cards().length > 0} fallback={
                                        <div class='gc-empty'>
                                            <p>No gift cards found.</p>
                                        </div>
                                    }>
                                        <For each={cards()}>{(card) =>
                                            <div class='gc-row'>
                                                <div class='gc-col col-id'>#{card.id}</div>
                                                <div class='gc-col col-code'>
                                                    <span class='gc-code'>{card.code}</span>
                                                </div>
                                                <div class='gc-col col-amount'>
                                                    <span class='gc-amount'>${card.amount}</span>
                                                </div>
                                                <div class='gc-col col-status'>
                                                    <span class={'gc-badge ' + (card.redeemedAt ? 'redeemed' : 'active')}>
                                                        {card.redeemedAt ? 'REDEEMED' : 'ACTIVE'}
                                                    </span>
                                                </div>
                                                <div class='gc-col col-redeemed'>
                                                    {card.redeemedAt ? (
                                                        <span class='gc-user'>{card.redeemedByUsername || `#${card.redeemedBy}`}</span>
                                                    ) : (
                                                        <span class='gc-na'>—</span>
                                                    )}
                                                </div>
                                                <div class='gc-col col-notes'>
                                                    <span class='gc-note'>{card.notes || '—'}</span>
                                                </div>
                                                <div class='gc-col col-actions'>
                                                    <div class='gc-actions'>
                                                        <button class='gc-btn edit' onClick={() => openEdit(card)} title='Edit'>
                                                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                                                                <path d='M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/>
                                                            </svg>
                                                        </button>
                                                        <button class='gc-btn delete' onClick={() => deleteCard(card.id)} title='Delete'>
                                                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                                                                <path d='M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        }</For>
                                    </Show>
                                </Show>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div class='gc-pagination'>
                            <button disabled={gcPage() <= 1 || gcLoading()} onClick={() => {
                                const p = gcPage() - 1
                                setGcPage(p)
                                fetchGiftcards(p)
                            }}>
                                <svg width='5' height='9' viewBox='0 0 5 9' fill='none'>
                                    <path d='M-9.00013e-07 4.49999C-9.01936e-07 4.33869 0.0599423 4.17741 0.179578 4.05443L3.94614 0.184628C4.18574 -0.0615425 4.57422 -0.0615425 4.81372 0.184628C5.05322 0.430698 4.99335 0.642857 4.99335 1.07593L4.99335 4.49999L4.99335 7.71429C4.99335 8.35714 5.05311 8.56923 4.8136 8.81528C4.5741 9.06157 4.18563 9.06157 4.04603 8.81528L0.179461 4.94554C0.0598064 4.8225 -8.9809e-07 4.66122 -9.00013e-07 4.49999Z' fill='#8b92a0'/>
                                </svg>
                                PREV
                            </button>
                            <p>PAGE <span class='white'>{gcPage()}</span>/{gcPages() || 1}</p>
                            <button disabled={gcPage() >= gcPages() || gcLoading()} onClick={() => {
                                const p = gcPage() + 1
                                setGcPage(p)
                                fetchGiftcards(p)
                            }}>
                                NEXT
                                <svg width='5' height='9' viewBox='0 0 5 9' fill='none'>
                                    <path d='M5 4.50001C5 4.66131 4.94006 4.82259 4.82042 4.94557L1.05386 8.81537C0.814256 9.06154 0.425785 9.06154 0.186281 8.81537C-0.0532221 8.5693 0.00665164 8.35714 0.00665381 7.92407L0.00665385 4.50001L0.0066548 1.28571C0.00665481 0.642857 -0.0531055 0.430768 0.186398 0.184717C0.425901 -0.0615721 0.814372 -0.0615721 1.05397 0.184717L4.82054 4.05446C4.94019 4.1775 5 4.33878 5 4.50001Z' fill='#8b92a0'/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Generate gift cards sidebar ─── */}
            <div class='filters'>
                <div class='search-wrapper'>
                    <input class='search' placeholder='SEARCH FOR USERS' value={username()}
                           onInput={(e) => setUsername(e.target.value)}/>
                    <button class='search-button' onClick={() => setParams({search: username()})}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19"
                             fill="none">
                            <path
                                d="M16.2987 17.8313L16.2988 17.8314C16.5039 18.0371 16.7798 18.15 17.0732 18.15C17.3511 18.15 17.6162 18.0476 17.818 17.8601C18.2484 17.4602 18.2624 16.7948 17.8478 16.3785L17.7415 16.4843L17.8478 16.3785L13.7547 12.2684C14.7979 11.0227 15.3686 9.47437 15.3686 7.86374C15.3686 3.99137 12.1072 0.85 8.10932 0.85C4.11147 0.85 0.85 3.99137 0.85 7.86374C0.85 11.7361 4.11147 14.8775 8.10932 14.8775C9.56844 14.8775 10.9619 14.4644 12.163 13.6786L16.2987 17.8313ZM8.10932 2.94054C10.929 2.94054 13.214 5.15409 13.214 7.86374C13.214 10.5734 10.929 12.7869 8.10932 12.7869C5.28964 12.7869 3.00461 10.5734 3.00461 7.86374C3.00461 5.15409 5.28964 2.94054 8.10932 2.94054Z"
                                fill="#8b92a0" stroke="#8b92a0" stroke-width="0.3"/>
                        </svg>
                    </button>
                </div>

                <div class='dropdown-container bevel-light'>
                    <p>AMOUNT: </p>
                    <select className='dropdown gold' value={worth()} onInput={(e) => setWorth(+e.target.value)}>
                        <option value='3'>$3</option>
                        <option value='5'>$5</option>
                        <option value='10'>$10</option>
                        <option value='25'>$25</option>
                        <option value='50'>$50</option>
                        <option value='100'>$100</option>
                        <option value='250'>$250</option>
                        <option value='500'>$500</option>
                    </select>
                </div>

                <div className='dropdown-container bevel-light'>
                    <p>CARDS: </p>
                    <select className='dropdown' value={amount()} onInput={(e) => setAmount(+e.target.value)}>
                        <option value='1'>1</option>
                        <option value='5'>5</option>
                        <option value='10'>10</option>
                        <option value='25'>25</option>
                        <option value='50'>50</option>
                        <option value='100'>100</option>
                        <option value='250'>250</option>
                        <option value='500'>500</option>
                    </select>
                </div>

                <button class='generate bevel-light' onClick={async () => {
                    let res = await authedAPI(`/admin/cashier/createGiftCards`, 'POST', JSON.stringify({
                        quantity: amount(),
                        amount: worth(),
                    }))

                    if (res.success) {
                        exportGiftCards(res.codes)
                        createNotification('success', `Successfully created ${amount()} giftcards worth $${worth()} each.`)
                        fetchGiftcards()
                    }
                }}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                        <rect x='3' y='5' width='18' height='14' rx='2'/><line x1='3' y1='10' x2='21' y2='10'/>
                    </svg>
                    GENERATE
                </button>
            </div>

            {/* ─── Edit Modal ─── */}
            <Show when={editModal()}>
                <div class='modal-overlay' onClick={() => setEditModal(null)}>
                    <div class='modal' onClick={(e) => e.stopPropagation()}>
                        <div class='modal-header'>
                            <p>EDIT GIFT CARD #{editModal()?.id}</p>
                            <button class='modal-close' onClick={() => setEditModal(null)}>✕</button>
                        </div>
                        <div class='modal-body'>
                            <div class='field-group'>
                                <label>CODE</label>
                                <p class='code-display'>{editModal()?.code}</p>
                            </div>
                            <div class='field-group'>
                                <label>AMOUNT ($)</label>
                                <input type='number' value={editAmount()} onInput={(e) => setEditAmount(e.target.value)} min='1' max='10000'/>
                            </div>
                            <div class='field-group'>
                                <label>NOTES</label>
                                <textarea value={editNotes()} onInput={(e) => setEditNotes(e.target.value)} rows='3' placeholder='Optional notes...'/>
                            </div>
                            <Show when={editModal()?.redeemedAt}>
                                <div class='field-group'>
                                    <label>REDEEMED</label>
                                    <p class='redeemed-info'>
                                        By {editModal()?.redeemedByUsername || `#${editModal()?.redeemedBy}`} on {new Date(editModal()?.redeemedAt).toLocaleString()}
                                    </p>
                                </div>
                            </Show>
                        </div>
                        <div class='modal-footer'>
                            <button class='modal-btn cancel' onClick={() => setEditModal(null)}>CANCEL</button>
                            <button class='modal-btn save' onClick={saveEdit}>SAVE CHANGES</button>
                        </div>
                    </div>
                </div>
            </Show>

            <style jsx>{`
              .content {
                display: flex;
                gap: 35px;
                width: 100%;
                min-width: 0;
              }

              .giftcards-section {
                width: 100%;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 16px;
              }

              .gc-header {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }

              .banner {
                outline: unset;
                border: unset;
                border-left: 3px solid rgba(31,214,95,0.5);
                width: 100%;
                height: 44px;
                border-radius: 0 6px 6px 0;
                background: linear-gradient(90deg, rgba(31,214,95,0.08) 0%, rgba(18,21,28,0) 60%);
                padding: 0 16px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #c3cad6;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.05em;
                margin-bottom: 0;
              }

              .line {
                flex: 1;
                height: 1px;
                background: linear-gradient(90deg, rgba(31,214,95,0.2) 0%, transparent 100%);
              }

              .gc-toolbar {
                display: flex;
                align-items: center;
                gap: 12px;
              }

              .gc-filter-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
              }

              .search-wrapper {
                width: 100%;
                max-width: 320px;
                height: 40px;
                display: flex;
                border-radius: 6px;
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.07);
                overflow: hidden;
              }

              .search {
                width: 100%;
                height: 100%;
                background: unset;
                border: unset;
                outline: unset;
                color: #c3cad6;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
                padding: 0 12px;
              }

              .search::placeholder {
                color: #4b5260;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
              }

              .search-button {
                height: 100%;
                min-width: 44px;
                outline: unset;
                border: unset;
                background: rgba(255,255,255,0.04);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .status-tabs {
                display: flex;
                gap: 4px;
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 6px;
                padding: 3px;
              }

              .tab {
                outline: unset;
                border: unset;
                background: transparent;
                color: #6b7280;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                padding: 6px 14px;
                border-radius: 4px;
                cursor: pointer;
                transition: background .15s, color .15s;
              }

              .tab.active {
                background: #1a1f29;
                color: #c3cad6;
              }

              .tab:hover:not(.active) {
                color: #8b92a0;
              }

              .gc-refresh {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 6px;
                cursor: pointer;
                color: #6b7280;
                transition: color .15s;
                flex-shrink: 0;
              }

              .gc-refresh:hover {
                color: #c3cad6;
              }

              /* Table */
              .gc-table-wrapper {
                width: 100%;
                overflow-x: auto;
              }

              .gc-table {
                display: flex;
                flex-direction: column;
                min-width: 700px;
              }

              .gc-table-header {
                display: flex;
                padding: 0 12px;
                margin-bottom: 8px;
              }

              .gc-table-header .gc-col {
                background: rgba(255,255,255,0.04);
                height: 26px;
                line-height: 26px;
                padding: 0 8px;
                border-radius: 4px;
                color: #6b7280;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              .gc-row {
                display: flex;
                align-items: center;
                padding: 0 12px;
                height: 48px;
                background: #12151c;
                border-radius: 6px;
                margin-bottom: 3px;
                transition: background .15s;
              }

              .gc-row:hover {
                background: #1a1f29;
              }

              .gc-col {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Geogrotesque Wide', sans-serif;
                padding: 0 8px;
              }

              .col-id { width: 60px; min-width: 60px; }
              .col-code { flex: 1; min-width: 140px; }
              .col-amount { width: 80px; min-width: 80px; }
              .col-status { width: 100px; min-width: 100px; }
              .col-redeemed { width: 120px; min-width: 100px; }
              .col-notes { flex: 0.7; min-width: 100px; }
              .col-actions { width: 80px; min-width: 80px; justify-content: flex-end; }

              .gc-code {
                color: #e2c87b;
                font-weight: 700;
                font-size: 11px;
                letter-spacing: 0.05em;
                font-family: monospace;
              }

              .gc-amount {
                color: #1fd65f;
                font-weight: 700;
              }

              .gc-badge {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
                padding: 3px 10px;
                border-radius: 4px;
              }

              .gc-badge.active {
                background: rgba(31,214,95,0.12);
                color: #1fd65f;
              }

              .gc-badge.redeemed {
                background: rgba(139,146,160,0.12);
                color: #8b92a0;
              }

              .gc-user {
                color: #c3cad6;
                font-size: 12px;
              }

              .gc-na {
                color: #4b5260;
              }

              .gc-note {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 120px;
                display: block;
                color: #6b7280;
                font-size: 11px;
              }

              .gc-actions {
                display: flex;
                gap: 6px;
              }

              .gc-btn {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: unset;
                border: unset;
                border-radius: 4px;
                cursor: pointer;
                transition: background .15s;
                background: rgba(255,255,255,0.04);
                color: #6b7280;
              }

              .gc-btn:hover {
                background: rgba(255,255,255,0.08);
              }

              .gc-btn.edit:hover {
                color: #5dade2;
                background: rgba(93,173,226,0.12);
              }

              .gc-btn.delete:hover {
                color: #e74c3c;
                background: rgba(231,76,60,0.12);
              }

              .gc-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px;
                gap: 12px;
                color: #6b7280;
                font-size: 13px;
                font-weight: 600;
              }

              .spinner {
                width: 28px;
                height: 28px;
                border: 3px solid rgba(255,255,255,0.06);
                border-top-color: #1fd65f;
                border-radius: 50%;
                animation: spin .7s linear infinite;
              }

              @keyframes spin { to { transform: rotate(360deg); } }

              .gc-empty {
                text-align: center;
                padding: 40px;
                color: #4b5260;
                font-size: 14px;
                font-weight: 600;
              }

              /* Pagination */
              .gc-pagination {
                width: 100%;
                color: #8b92a0;
                font-family: 'Noto Sans', sans-serif;
                font-size: 14px;
                font-weight: 900;
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 8px;
              }

              .gc-pagination button {
                outline: unset;
                border: 1px solid rgba(255,255,255,0.07);
                width: 78px;
                height: 36px;
                border-radius: 6px;
                background: #12151c;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                color: #6b7280;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 700;
                transition: background .15s, color .15s;
              }

              .gc-pagination button:not(:disabled):hover {
                background: #1a1f29;
                color: #c3cad6;
              }

              .gc-pagination button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
              }

              .white { color: #c3cad6; }

              /* Filters sidebar */
              .filters {
                width: 100%;
                max-width: 290px;
                gap: 12px;
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
              }

              .generate {
                width: 100%;
                height: 40px;
                font-family: Geogrotesque Wide, sans-serif;
                font-weight: 600;
                font-size: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              }

              .dropdown-container {
                width: 100%;
                height: 40px;
                font-family: Geogrotesque Wide, sans-serif;
                font-weight: 600;
                font-size: 15px;
                color: #8b92a0;
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0 12px;
              }

              .dropdown {
                width: 100%;
                height: 100%;
                background: unset;
                border: unset;
                outline: unset;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 700;
                color: white;
              }

              .dropdown option {
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 700;
              }

              .dropdown.gold option {
                color: var(--gold);
              }

              option {
                background: #12151c;
              }

              /* Modal */
              .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
              }

              .modal {
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                width: 100%;
                max-width: 480px;
                box-shadow: 0 24px 48px rgba(0,0,0,0.5);
              }

              .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
              }

              .modal-header p {
                color: #c3cad6;
                font-size: 15px;
                font-weight: 700;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .modal-close {
                background: none;
                border: none;
                outline: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 18px;
              }

              .modal-body {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
              }

              .field-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .field-group label {
                color: #6b7280;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .field-group input,
              .field-group textarea {
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                padding: 10px 12px;
                outline: none;
                color: #c3cad6;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 600;
                transition: border-color .15s;
                width: 100%;
                box-sizing: border-box;
              }

              .field-group input:focus,
              .field-group textarea:focus {
                border-color: rgba(31,214,95,0.4);
              }

              .field-group textarea {
                resize: vertical;
                min-height: 60px;
              }

              .code-display {
                color: #e2c87b;
                font-family: monospace;
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.1em;
                background: #12151c;
                padding: 10px 12px;
                border-radius: 6px;
              }

              .redeemed-info {
                color: #8b92a0;
                font-size: 13px;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .modal-footer {
                display: flex;
                gap: 10px;
                padding: 16px 20px;
                border-top: 1px solid rgba(255,255,255,0.06);
                justify-content: flex-end;
              }

              .modal-btn {
                outline: unset;
                border: unset;
                border-radius: 6px;
                height: 36px;
                padding: 0 20px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: filter .15s;
              }

              .modal-btn:hover { filter: brightness(1.1); }

              .modal-btn.cancel {
                background: rgba(255,255,255,0.06);
                color: #8b92a0;
              }

              .modal-btn.save {
                background: linear-gradient(180deg, #22e86a 0%, #1fd65f 100%);
                color: #021a09;
              }

              @media only screen and (max-width: 1100px) {
                .content {
                  flex-direction: column;
                }
                .filters {
                  max-width: 100%;
                }
                .gc-filter-row {
                  flex-wrap: wrap;
                }
                .search-wrapper {
                  max-width: 100%;
                }
              }
            `}</style>
        </>
    );
}

export default AdminCashier;