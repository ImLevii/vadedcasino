import {createMemo, createResource, createSignal, For, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import Loader from "../Loader/loader";
import {formatNumber} from "../../util/numbers";
import {useUser} from "../../contexts/usercontextprovider";

function SkinDeckDeposit() {
    const [user] = useUser();
    const [creating, setCreating] = createSignal(false);
    const [query, setQuery] = createSignal('');
    const [sort, setSort] = createSignal('value-desc');
    const [selectedIds, setSelectedIds] = createSignal([]);
    const [sidebarTab, setSidebarTab] = createSignal('items');
    const steamReady = createMemo(() => !!user()?.hasTradeUrl && !!user()?.hasApiKey);
    const [inventory, {refetch: refetchInventory}] = createResource(
        () => steamReady() ? 'ready' : null,
        fetchInventory
    );
    const [history, {refetch}] = createResource(fetchHistory);

    async function fetchInventory() {
        const response = await authedAPI('/trading/skindeck/inventory', 'GET');
        return response?.items || [];
    }

    async function fetchHistory() {
        const response = await authedAPI('/trading/skindeck/transactions?type=deposit', 'GET');
        return response?.data || [];
    }

    const filteredItems = createMemo(() => {
        const term = query().trim().toLowerCase();
        const items = (inventory() || []).filter(item => !term || `${item.name} ${item.wear || ''}`.toLowerCase().includes(term));
        return [...items].sort((left, right) => {
            if (sort() === 'value-asc') return left.value - right.value;
            if (sort() === 'name') return left.name.localeCompare(right.name);
            return right.value - left.value;
        });
    });

    const selectedItems = createMemo(() => {
        const selected = new Set(selectedIds());
        return (inventory() || []).filter(item => selected.has(item.id));
    });

    const totalValue = createMemo(() => selectedItems().reduce((sum, item) => sum + Number(item.value || 0), 0));

    function toggleItem(itemId) {
        setSelectedIds(current => current.includes(itemId)
            ? current.filter(id => id !== itemId)
            : current.length < 20 ? [...current, itemId] : current);
    }

    async function createDeposit() {
        if (creating() || !selectedIds().length) return;
        setCreating(true);
        const response = await authedAPI('/trading/skindeck/deposits', 'POST', JSON.stringify({itemIds: selectedIds()}), true);
        setCreating(false);

        if (!response?.redirectUrl) return;
        await refetch();
        window.location.assign(response.redirectUrl);
    }

    return (
        <section class='skindeck-market'>
            <Show when={steamReady()} fallback={
                <div class='steam-setup'>
                    <div class='setup-icon'><img src='/assets/icons/cs2-logo.svg' alt=''/></div>
                    <div class='setup-copy'>
                        <span class='eyebrow'>STEAM CONNECTION REQUIRED</span>
                        <h2>Connect your inventory</h2>
                        <p>SkinDeck uses the Steam API key and trade URL saved on your profile. Both are required before inventory or trade data can load.</p>
                        <div class='requirements'>
                            <span classList={{ready: !!user()?.hasTradeUrl}}>Steam Trade URL</span>
                            <span classList={{ready: !!user()?.hasApiKey}}>Steam API Key</span>
                        </div>
                    </div>
                    <a class='profile-link' href='/profile'>OPEN PROFILE</a>
                </div>
            }>
                <div class='market-head'>
                    <div class='market-brand'>
                        <img src='/assets/icons/cs2-logo.svg' alt='Counter-Strike 2'/>
                        <div><span>COUNTER-STRIKE 2</span><strong>Inventory Deposit</strong></div>
                    </div>
                    <div class='market-state'><i></i><span>LIVE PRICES</span></div>
                </div>
                <div class='market-layout'>
                    <div class='inventory-pane'>
                        <div class='toolbar'>
                            <label class='search-box'>
                                <img src='/assets/icons/search.svg' alt=''/>
                                <input value={query()} onInput={event => setQuery(event.target.value)} placeholder='Search items...'/>
                            </label>
                            <select aria-label='Sort inventory' value={sort()} onChange={event => setSort(event.target.value)}>
                                <option value='value-desc'>Price: High to Low</option>
                                <option value='value-asc'>Price: Low to High</option>
                                <option value='name'>Name</option>
                            </select>
                            <button class='icon-button' aria-label='Refresh inventory' title='Refresh inventory' onClick={() => refetchInventory()}>
                                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M20 6v5h-5M4 18v-5h5M6.1 9A7 7 0 0 1 18 6l2 2M18 15a7 7 0 0 1-12 3l-2-2'/></svg>
                            </button>
                        </div>

                        <Show when={!inventory.loading} fallback={<div class='loading'><Loader/></div>}>
                            <div class='inventory-meta'><span>{filteredItems().length} ITEMS</span><span class='instant'>INSTANT INVENTORY</span></div>
                            <div class='item-grid'>
                                <For each={filteredItems()}>{item => (
                                    <button class={`skin-card ${item.rarity || 'consumer'}`} classList={{selected: selectedIds().includes(item.id)}}
                                            aria-pressed={selectedIds().includes(item.id)} onClick={() => toggleItem(item.id)}>
                                        <span class='wear'>{item.wear || 'CS2'}</span>
                                        <span class='check' aria-hidden='true'>{selectedIds().includes(item.id) ? '✓' : ''}</span>
                                        <div class='skin-image'><img src={item.image} alt={item.name}/></div>
                                        <strong>{item.name}</strong>
                                        <span class='skin-wear'>{item.wear || 'Tradable item'}</span>
                                        <span class='price'><img src='/assets/icons/coin.svg' alt='Coins'/>{formatNumber(item.value)}</span>
                                    </button>
                                )}</For>
                            </div>
                            <Show when={!filteredItems().length}><div class='no-results'>No items match your search.</div></Show>
                        </Show>
                    </div>

                    <aside class='trade-sidebar'>
                        <div class='side-tabs'>
                            <button classList={{active: sidebarTab() === 'items'}} onClick={() => setSidebarTab('items')}>
                                <img src='/assets/icons/cart.svg' alt=''/>Items
                            </button>
                            <button classList={{active: sidebarTab() === 'trades'}} onClick={() => setSidebarTab('trades')}>
                                <img src='/assets/icons/history.svg' alt=''/>Trades
                            </button>
                        </div>

                        <Show when={sidebarTab() === 'items'} fallback={
                            <div class='trade-list'>
                                <Show when={!history.loading} fallback={<Loader/>}>
                                    <For each={history()}>{payment => (
                                        <div class='trade-row'>
                                            <div><strong>{payment.skinItems?.length || 0} items</strong><span>{new Date(payment.createdAt).toLocaleDateString()}</span></div>
                                            <span class={`status ${payment.status}`}>{payment.status}</span>
                                        </div>
                                    )}</For>
                                    <Show when={!history()?.length}><p class='empty-copy'>No SkinDeck trades yet.</p></Show>
                                </Show>
                            </div>
                        }>
                            <div class='selection-head'><span>SELECTED ITEMS ({selectedItems().length})</span><button disabled={!selectedItems().length} onClick={() => setSelectedIds([])}>CLEAR</button></div>
                            <div class='selected-list'>
                                <For each={selectedItems()}>{item => (
                                    <div class='selected-row'>
                                        <img class='selected-image' src={item.image} alt=''/>
                                        <div><strong>{item.name}</strong><span>{formatNumber(item.value)} COINS</span></div>
                                        <button aria-label={`Remove ${item.name}`} onClick={() => toggleItem(item.id)}><img src='/assets/icons/trash.svg' alt=''/></button>
                                    </div>
                                )}</For>
                                <Show when={!selectedItems().length}>
                                    <div class='empty-selection'><div><img src='/assets/icons/cart.svg' alt=''/></div><strong>No Items Selected</strong><p>Select items from your inventory to add them to this trade.</p></div>
                                </Show>
                            </div>
                        </Show>

                        <div class='trade-total'>
                            <div><span>TOTAL LISTING</span><strong><img src='/assets/icons/coin.svg' alt='Coins'/>{formatNumber(totalValue())}</strong></div>
                            <button class='deposit-button' disabled={!selectedItems().length || creating()} onClick={createDeposit}>
                                {creating() ? 'CREATING TRADE...' : `DEPOSIT${selectedItems().length ? ` ${selectedItems().length} ITEM${selectedItems().length > 1 ? 'S' : ''}` : ''}`}
                            </button>
                        </div>
                    </aside>
                </div>
            </Show>

            <style jsx>{`
                .skindeck-market, .skindeck-market * { box-sizing: border-box; }
                .skindeck-market { min-height: 570px; border: 1px solid #242c38; border-radius: 8px; overflow: hidden; background: #0c1018; box-shadow: inset 0 1px rgba(255,255,255,.025), 0 22px 52px rgba(0,0,0,.32); font-family: Geogrotesque Wide, sans-serif; }
                button, input, select, a { font-family: inherit; letter-spacing: 0; }
                .market-head { height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border-bottom: 1px solid #242c38; background: linear-gradient(90deg, rgba(31,214,95,.055), transparent 35%), #111720; }
                .market-brand { display: flex; align-items: center; gap: 11px; }
                .market-brand > img { width: 60px; height: 30px; object-fit: contain; }
                .market-brand > div { display: flex; flex-direction: column; gap: 2px; }
                .market-brand span { color: #717c8b; font-size: 8px; font-weight: 800; }
                .market-brand strong { color: #f4f7fb; font-size: 12px; }
                .market-state { display: flex; align-items: center; gap: 7px; color: #768190; font-size: 8px; font-weight: 800; }
                .market-state i { width: 7px; height: 7px; border-radius: 50%; background: #1fd65f; box-shadow: 0 0 10px rgba(31,214,95,.7); }
                .market-layout { min-height: 540px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; }
                .inventory-pane { min-width: 0; padding: 18px; border-right: 1px solid #242c38; background: radial-gradient(circle at 45% 30%, rgba(38,50,67,.12), transparent 48%); }
                .toolbar { display: grid; grid-template-columns: minmax(180px,1fr) 170px 38px; gap: 8px; }
                .search-box { height: 38px; display: flex; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid #222a36; border-radius: 6px; background: #151b25; }
                .search-box img { width: 13px; height: 13px; opacity: .65; }
                .search-box input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #dce2ec; font-size: 11px; }
                .toolbar select { min-width: 0; padding: 0 10px; border: 1px solid #222a36; border-radius: 6px; outline: 0; background: #151b25; color: #8993a2; font-size: 10px; }
                .icon-button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #222a36; border-radius: 6px; background: #151b25; cursor: pointer; }
                .icon-button svg { width: 15px; fill: none; stroke: #7d8795; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
                .icon-button:hover { border-color: rgba(31,214,95,.4); }
                .inventory-meta { height: 36px; display: flex; align-items: center; justify-content: space-between; color: #697382; font-size: 9px; font-weight: 700; }
                .instant { color: #1fd65f; }
                .item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 9px; }
                .skin-card { --rarity:#607087; min-width: 0; height: 202px; position: relative; display: flex; flex-direction: column; padding: 11px; overflow: hidden; border: 1px solid #29313d; border-radius: 6px; background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 52%), radial-gradient(circle at 50% 24%, color-mix(in srgb, var(--rarity) 18%, transparent), transparent 45%), #141922; color: inherit; text-align: left; cursor: pointer; box-shadow: inset 0 1px rgba(255,255,255,.02), 0 8px 18px rgba(0,0,0,.13); transition: border-color .16s ease, transform .16s ease, background .16s ease, box-shadow .16s ease; }
                .skin-card.classified { --rarity:#c84edd; }
                .skin-card.covert { --rarity:#e84d55; }
                .skin-card.rare { --rarity:#e4b84a; }
                .skin-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--rarity) 60%, #303846); box-shadow: 0 12px 24px rgba(0,0,0,.25); }
                .skin-card.selected { border-color: #1fd65f; box-shadow: inset 0 0 0 1px rgba(31,214,95,.22), 0 0 22px rgba(31,214,95,.09); }
                .wear { position: absolute; top: 9px; left: 9px; color: #7d8795; font-size: 8px; font-weight: 700; text-transform: uppercase; }
                .check { width: 15px; height: 15px; position: absolute; top: 9px; right: 9px; display: grid; place-items: center; border: 1px solid #48515e; border-radius: 3px; color: #061209; background: transparent; font-size: 10px; font-weight: 900; }
                .selected .check { border-color: #1fd65f; background: #1fd65f; }
                .skin-image { height: 108px; display: grid; place-items: center; margin: 13px 0 5px; }
                .skin-image img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,.4)); }
                .skin-card > strong { min-height: 28px; color: #eef2f8; font-size: 10px; line-height: 1.3; }
                .skin-wear { overflow: hidden; color: #626c7b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
                .price { display: flex; align-items: center; gap: 5px; margin-top: auto; color: #1fd65f; font-size: 10px; font-weight: 800; }
                .price img, .trade-total strong img { width: 12px; height: 12px; }
                .loading { min-height: 400px; display: grid; place-items: center; }
                .no-results { padding: 70px 10px; color: #737d8b; font-size: 11px; text-align: center; }
                .trade-sidebar { min-width: 0; display: grid; grid-template-rows: 54px auto minmax(0, 1fr) 92px; background: linear-gradient(180deg, #121923, #0f141c); }
                .side-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 8px; border-bottom: 1px solid #202631; }
                .side-tabs button { display: flex; align-items: center; justify-content: center; gap: 7px; border: 0; border-radius: 4px; background: transparent; color: #8993a2; font-size: 10px; font-weight: 700; cursor: pointer; }
                .side-tabs button.active { background: #1a222d; color: #fff; }
                .side-tabs img { width: 13px; height: 13px; opacity: .8; }
                .selection-head { height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 0 11px; color: #7e8795; font-size: 8px; font-weight: 700; }
                .selection-head button { border: 0; background: transparent; color: #7e8795; font-size: 8px; cursor: pointer; }
                .selection-head button:disabled { opacity: .35; }
                .selected-list, .trade-list { min-height: 0; overflow-y: auto; padding: 0 8px; }
                .selected-row, .trade-row { min-height: 58px; display: flex; align-items: center; gap: 9px; padding: 7px; border-bottom: 1px solid #202631; }
                .selected-image { width: 52px; height: 40px; object-fit: contain; }
                .selected-row > div, .trade-row > div { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .selected-row strong, .trade-row strong { overflow: hidden; color: #dce2eb; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
                .selected-row span, .trade-row span { color: #1fd65f; font-size: 8px; }
                .selected-row > button { width: 26px; height: 26px; display: grid; place-items: center; border: 0; background: transparent; cursor: pointer; }
                .selected-row > button img { width: 12px; opacity: .55; }
                .empty-selection { min-height: 340px; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 25px; text-align: center; }
                .empty-selection > div { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 12px; border: 1px solid rgba(31,214,95,.24); border-radius: 7px; background: rgba(31,214,95,.06); }
                .empty-selection img { width: 20px; filter: brightness(0) saturate(100%) invert(72%) sepia(77%) saturate(580%) hue-rotate(83deg); }
                .empty-selection strong { color: #fff; font-size: 11px; }
                .empty-selection p, .empty-copy { max-width: 180px; margin: 8px 0 0; color: #6f7887; font-size: 9px; line-height: 1.5; }
                .trade-list { grid-row: 2 / 4; padding-top: 4px; }
                .trade-row .status { width: 70px; color: #7c8695; font-size: 8px; text-align: right; text-transform: uppercase; }
                .status.completed { color: #1fd65f; }
                .status.failed, .status.cancelled, .status.expired { color: #ff5141; }
                .trade-total { grid-row: 4; padding: 10px 12px; border-top: 1px solid #202631; background: #151b23; }
                .trade-total > div { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; color: #77818f; font-size: 8px; }
                .trade-total strong { display: flex; align-items: center; gap: 5px; color: #fff; font-size: 10px; }
                .deposit-button { width: 100%; height: 36px; border: 1px solid #25e86a; border-radius: 5px; background: #1fd65f; color: #06130a; font-size: 10px; font-weight: 900; cursor: pointer; }
                .deposit-button:disabled { border-color: #264f34; background: #214e2e; color: #7d9785; cursor: not-allowed; opacity: .7; }
                .steam-setup { min-height: 300px; display: flex; align-items: center; gap: 20px; padding: 34px; background: radial-gradient(circle at 0 0, rgba(31,214,95,.08), transparent 45%), #11161e; }
                .setup-icon { width: 64px; height: 64px; flex: 0 0 64px; display: grid; place-items: center; border: 1px solid rgba(31,214,95,.25); border-radius: 8px; background: rgba(31,214,95,.06); }
                .setup-icon img { width: 46px; }
                .setup-copy { flex: 1; }
                .eyebrow { color: #1fd65f; font-size: 9px; font-weight: 800; }
                .setup-copy h2 { margin: 5px 0 7px; color: #fff; font-size: 20px; letter-spacing: 0; }
                .setup-copy p { max-width: 620px; margin: 0; color: #87919f; font-size: 11px; line-height: 1.55; }
                .requirements { display: flex; gap: 8px; margin-top: 14px; }
                .requirements span { padding: 6px 9px; border: 1px solid #303844; border-radius: 4px; color: #7c8694; font-size: 8px; font-weight: 700; }
                .requirements span.ready { border-color: rgba(31,214,95,.35); color: #1fd65f; }
                .profile-link { height: 38px; display: inline-flex; align-items: center; padding: 0 16px; border-radius: 5px; background: #1fd65f; color: #06130a; font-size: 9px; font-weight: 900; text-decoration: none; }
                @media (max-width: 900px) { .market-layout { grid-template-columns: 1fr; } .inventory-pane { border-right: 0; } .trade-sidebar { min-height: 430px; border-top: 1px solid #202631; } }
                @media (max-width: 600px) { .market-head { padding: 0 12px; } .market-state { display: none; } .inventory-pane { padding: 12px; } .toolbar { grid-template-columns: minmax(0,1fr) 38px; } .toolbar select { grid-column: 1 / -1; grid-row: 2; height: 36px; } .item-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .skin-card { height: 184px; } .skin-image { height: 94px; } .steam-setup { align-items: flex-start; flex-direction: column; padding: 24px; } .profile-link { width: 100%; justify-content: center; } .requirements { flex-wrap: wrap; } }
            `}</style>
        </section>
    );
}

export default SkinDeckDeposit;