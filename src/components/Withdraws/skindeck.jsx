import {createMemo, createResource, createSignal, For, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import {formatNumber} from "../../util/numbers";
import {useUser} from "../../contexts/usercontextprovider";

function SkinDeckWithdraw() {
    const [user] = useUser();
    const [selectedId, setSelectedId] = createSignal(null);
    const [submitting, setSubmitting] = createSignal(false);
    const [query, setQuery] = createSignal('');
    const [sort, setSort] = createSignal('value-desc');
    const steamReady = createMemo(() => !!user()?.hasTradeUrl && !!user()?.hasApiKey);
    const [catalog, {refetch: refetchCatalog}] = createResource(
        () => steamReady() ? 'ready' : null,
        fetchCatalog
    );
    const [history, {refetch: refetchHistory}] = createResource(fetchHistory);

    async function fetchCatalog() {
        const response = await authedAPI('/trading/skindeck/skins', 'GET');
        return response?.items || [];
    }

    async function fetchHistory() {
        const response = await authedAPI('/trading/skindeck/transactions?type=withdrawal', 'GET');
        return response?.data || [];
    }

    function selectedItem() {
        return catalog()?.find(item => item.id === selectedId());
    }

    const filteredItems = createMemo(() => {
        const term = query().trim().toLowerCase();
        const items = (catalog() || []).filter(item => !term || `${item.name} ${item.wear || ''}`.toLowerCase().includes(term));
        return [...items].sort((left, right) => {
            if (sort() === 'value-asc') return left.value - right.value;
            if (sort() === 'name') return left.name.localeCompare(right.name);
            return right.value - left.value;
        });
    });

    async function submitWithdrawal() {
        if (!selectedItem() || submitting()) return;
        setSubmitting(true);
        const response = await authedAPI('/trading/skindeck/withdrawals', 'POST', JSON.stringify({itemIds: [selectedItem().id]}), true);
        setSubmitting(false);

        if (!response?.success) return;
        setSelectedId(null);
        createNotification('success', 'Skin withdrawal submitted.');
        await Promise.all([refetchCatalog(), refetchHistory()]);
    }

    return (
        <section class='skindeck-panel'>
            <header>
                <div class='brand'><img src='https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/942c04efaa5bc87afb6f2a97dbf17ac614c8a84d/capsule_184x69.jpg' alt='Counter-Strike 2'/><div><span class='eyebrow'>SKINDECK INVENTORY</span><h2>Withdraw a CS2 skin</h2></div></div>
                <span class='provider'><i></i>LIVE PRICES</span>
            </header>

            <Show when={steamReady()} fallback={
                <div class='steam-setup'>
                    <img src='/assets/icons/cube.svg' alt=''/>
                    <div><strong>Steam connection required</strong><span>Add both your Steam Trade URL and Steam API Key before using SkinDeck.</span></div>
                    <a href='/profile'>OPEN PROFILE</a>
                </div>
            }>
                <Show when={!catalog.loading} fallback={<Loader/>}>
                    <div class='toolbar'>
                        <label class='search-box'><img src='/assets/icons/search.svg' alt=''/><input value={query()} onInput={event => setQuery(event.target.value)} placeholder='Search skins...'/></label>
                        <select aria-label='Sort skins' value={sort()} onChange={event => setSort(event.target.value)}><option value='value-desc'>Price: High to Low</option><option value='value-asc'>Price: Low to High</option><option value='name'>Name</option></select>
                        <button class='refresh' aria-label='Refresh skins' title='Refresh skins' onClick={() => refetchCatalog()}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M20 6v5h-5M4 18v-5h5M6.1 9A7 7 0 0 1 18 6l2 2M18 15a7 7 0 0 1-12 3l-2-2'/></svg></button>
                    </div>
                    <div class='catalog-meta'><span>{filteredItems().length} ITEMS</span><span>INSTANT DELIVERY</span></div>
                    <div class='catalog'>
                        <For each={filteredItems()}>{item => (
                            <button class={`skin ${item.rarity || 'consumer'}`} classList={{selected: selectedId() === item.id}} aria-pressed={selectedId() === item.id} onClick={() => setSelectedId(selectedId() === item.id ? null : item.id)}>
                                <span class='wear'>{item.wear || 'CS2'}</span><span class='check'>{selectedId() === item.id ? '✓' : ''}</span>
                                <div class='image-wrap'><img src={item.image} alt=''/></div>
                                <strong>{item.name}</strong><small>{item.wear || 'Tradable item'}</small><span class='price'><img src='/assets/icons/coin.svg' alt='Coins'/>{formatNumber(item.value)}</span>
                            </button>
                        )}</For>
                    </div>
                    <Show when={!filteredItems().length}><p class='empty'>No skins match your search.</p></Show>
                </Show>

                <div class='checkout'>
                    <div class='selected-summary'><Show when={selectedItem()} fallback={<div class='selection-placeholder'><strong>No skin selected</strong><span>Choose one item from the inventory</span></div>}>{item => <><img src={item().image} alt=''/><div><strong>{item().name}</strong><span>SELECTED FOR WITHDRAWAL</span></div></>}</Show></div>
                    <div class='checkout-action'><div><span>SELECTED VALUE</span><strong><img src='/assets/icons/coin.svg' alt='Coins'/>{formatNumber(selectedItem()?.value || 0)}</strong></div>
                    <button class='bevel-gold' disabled={!selectedItem() || submitting()} onClick={submitWithdrawal}>{submitting() ? 'SUBMITTING...' : 'WITHDRAW SKIN'}</button>
                    </div>
                </div>
            </Show>

            <div class='history'>
                <h3>Recent withdrawals</h3>
                <Show when={!history.loading} fallback={<Loader/>}>
                    <For each={history()}>{payment => (
                        <div class='history-row'>
                            <strong>{payment.skinItems?.[0]?.name || 'CS2 skin'}</strong>
                            <span class={`status ${payment.status}`}>{payment.status}</span>
                            <strong>{formatNumber(payment.value)} COINS</strong>
                        </div>
                    )}</For>
                </Show>
            </div>

            <style jsx>{`
                .skindeck-panel, .skindeck-panel * { box-sizing: border-box; }
                .skindeck-panel { padding: 0 20px 22px; overflow: hidden; border: 1px solid #242c38; border-radius: 8px; background: radial-gradient(circle at 35% 30%, rgba(38,50,67,.13), transparent 48%), #0c1018; box-shadow: inset 0 1px rgba(255,255,255,.025), 0 22px 52px rgba(0,0,0,.32); }
                header, .checkout, .history-row { display: flex; align-items: center; }
                header { height: 68px; justify-content: space-between; margin: 0 -20px 18px; padding: 0 20px; border-bottom: 1px solid #242c38; background: linear-gradient(90deg, rgba(31,214,95,.055), transparent 35%), #111720; }
                .brand { display: flex; align-items: center; gap: 12px; }
                .brand > img { width: 58px; height: 32px; border: 1px solid rgba(255,255,255,.09); border-radius: 4px; object-fit: cover; }
                h2, h3, strong, span, p, button { font-family: Geogrotesque Wide, sans-serif; letter-spacing: 0; }
                h2 { margin: 3px 0 0; color: #fff; font-size: 17px; }
                h3 { margin: 0 0 10px; color: #fff; font-size: 14px; }
                .eyebrow { color: #1fd65f; font-size: 10px; font-weight: 700; }
                .provider { display: flex; align-items: center; gap: 7px; color: #6f7785; font-size: 9px; font-weight: 700; }
                .provider i { width: 7px; height: 7px; border-radius: 50%; background: #1fd65f; box-shadow: 0 0 10px rgba(31,214,95,.7); }
                .toolbar { display: grid; grid-template-columns: minmax(180px, 1fr) 180px 38px; gap: 8px; }
                .search-box { height: 38px; display: flex; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid #222a36; border-radius: 6px; background: #151b25; }
                .search-box img { width: 13px; opacity: .65; }
                .search-box input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #dce2ec; font-size: 11px; }
                .toolbar select { min-width: 0; padding: 0 10px; border: 1px solid #222a36; border-radius: 6px; outline: 0; background: #151b25; color: #8993a2; font-size: 10px; }
                .refresh { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #222a36; border-radius: 6px; background: #151b25; cursor: pointer; }
                .refresh svg { width: 15px; fill: none; stroke: #7d8795; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
                .catalog-meta { height: 36px; display: flex; align-items: center; justify-content: space-between; color: #697382; font-size: 9px; font-weight: 700; }
                .catalog-meta span:last-child { color: #1fd65f; }
                .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 9px; max-height: 430px; overflow: auto; }
                .skin { --rarity:#607087; min-width: 0; height: 202px; position: relative; display: flex; flex-direction: column; padding: 11px; overflow: hidden; text-align: left; border: 1px solid #29313d; border-radius: 6px; background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 52%), radial-gradient(circle at 50% 24%, color-mix(in srgb, var(--rarity) 18%, transparent), transparent 45%), #141922; color: inherit; cursor: pointer; box-shadow: inset 0 1px rgba(255,255,255,.02), 0 8px 18px rgba(0,0,0,.13); transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
                .skin.classified { --rarity:#c84edd; } .skin.covert { --rarity:#e84d55; } .skin.rare { --rarity:#e4b84a; }
                .skin:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--rarity) 60%, #303846); box-shadow: 0 12px 24px rgba(0,0,0,.25); }
                .skin.selected { border-color: #1fd65f; box-shadow: inset 0 0 0 1px rgba(31,214,95,.22), 0 0 22px rgba(31,214,95,.09); }
                .wear { position: absolute; top: 9px; left: 9px; color: #7d8795; font-size: 8px; font-weight: 700; text-transform: uppercase; }
                .check { width: 15px; height: 15px; position: absolute; top: 9px; right: 9px; display: grid; place-items: center; border: 1px solid #48515e; border-radius: 3px; color: #061209; font-size: 10px; font-weight: 900; }
                .selected .check { border-color: #1fd65f; background: #1fd65f; }
                .image-wrap { width: 100%; height: 108px; display: grid; place-items: center; margin: 13px 0 5px; overflow: hidden; }
                .image-wrap img { width: 90%; height: 90%; object-fit: contain; }
                .skin > strong { min-height: 28px; color: #eef2f8; font-size: 10px; line-height: 1.3; }
                .skin small { overflow: hidden; color: #626c7b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
                .skin .price { display: flex; align-items: center; gap: 5px; margin-top: auto; color: #1fd65f; font-size: 10px; font-weight: 800; }
                .price img, .checkout-action strong img { width: 12px; height: 12px; }
                .checkout { justify-content: space-between; gap: 22px; margin-top: 18px; padding: 14px; border: 1px solid #242c38; border-radius: 6px; background: #111720; }
                .selected-summary { min-width: 0; flex: 1; display: flex; align-items: center; gap: 12px; }
                .selected-summary > img { width: 74px; height: 52px; object-fit: contain; }
                .selected-summary > div, .selection-placeholder { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
                .selected-summary strong { overflow: hidden; color: #fff; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
                .selected-summary span { color: #727b89; font-size: 8px; font-weight: 700; }
                .checkout-action { display: flex; align-items: center; gap: 16px; }
                .checkout-action > div { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
                .checkout-action span { color: #727b89; font-size: 8px; font-weight: 700; }
                .checkout-action strong { display: flex; align-items: center; gap: 5px; color: #fff; font-size: 14px; }
                .checkout button { width: 170px; height: 40px; border: 0; font-weight: 800; cursor: pointer; }
                .checkout button:disabled { opacity: .45; cursor: not-allowed; }
                .history { margin-top: 26px; }
                .history-row { min-height: 48px; gap: 14px; border-top: 1px solid rgba(255,255,255,.06); }
                .history-row strong { flex: 1; color: #c3cad6; font-size: 11px; }
                .history-row strong:last-child { text-align: right; }
                .status { min-width: 72px; color: #8b92a0; font-size: 9px; text-align: center; text-transform: uppercase; }
                .status.completed { color: #1fd65f; }
                .status.failed, .status.cancelled, .status.expired { color: #ff5141; }
                .empty { padding: 26px 0; color: #727b89; font-size: 12px; text-align: center; }
                .steam-setup { min-height: 110px; display: flex; align-items: center; gap: 14px; padding: 18px; border: 1px solid rgba(31,214,95,.18); background: rgba(4,8,13,.54); }
                .steam-setup > img { width: 32px; filter: brightness(0) saturate(100%) invert(72%) sepia(77%) saturate(580%) hue-rotate(83deg); }
                .steam-setup > div { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
                .steam-setup strong { color: #fff; font-size: 12px; }
                .steam-setup span { color: #7d8795; font-size: 10px; line-height: 1.45; }
                .steam-setup a { height: 36px; display: inline-flex; align-items: center; padding: 0 14px; border-radius: 5px; background: #1fd65f; color: #06130a; font-size: 9px; font-weight: 800; text-decoration: none; }
                @media (max-width: 650px) { .skindeck-panel { padding: 0 12px 16px; } header { margin: 0 -12px 14px; padding: 0 12px; } .brand > img, .provider { display: none; } .toolbar { grid-template-columns: minmax(0,1fr) 38px; } .toolbar select { grid-column: 1 / -1; grid-row: 2; height: 36px; } .catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); } .skin { height: 184px; } .image-wrap { height: 94px; } .checkout { align-items: stretch; flex-direction: column; } .checkout-action { align-items: stretch; flex-direction: column; } .checkout-action > div { align-items: flex-start; } .checkout button { width: 100%; } .steam-setup { align-items: flex-start; flex-direction: column; } }
            `}</style>
        </section>
    );
}

export default SkinDeckWithdraw;