import { A } from "@solidjs/router";
import { createEffect, createMemo, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { authedAPI, createNotification } from "../../util/api";
import { useUser } from "../../contexts/usercontextprovider";
import { formatNumber } from "../../util/numbers";
import Loader from "../Loader/loader";
import "./market.css";

const wears = { "Factory New": "FN", "Minimal Wear": "MW", "Field-Tested": "FT", "Well-Worn": "WW", "Battle-Scarred": "BS" };
const colors = { consumer: "#b0c3d9", industrial: "#5e98d9", milspec: "#4b69ff", restricted: "#8847ff", classified: "#d32ce6", covert: "#eb4b4b", rare: "#e4ae39" };
const available = item => item.available !== false && item.tradable !== false;
const itemNames = item => String(item.name || "CS2 skin").split(" | ");

function Icon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <Show when={props.type === "refresh"}><path d="M20 6v5h-5M4 18v-5h5M6 9a7 7 0 0 1 12-3l2 2M18 15a7 7 0 0 1-12 3l-2-2" /></Show>
    <Show when={props.type === "trash"}><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></Show>
    <Show when={props.type === "search"}><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></Show>
    <Show when={props.type === "trades"}><path d="M3 7h18l-4-4M21 17H3l4 4" /></Show>
  </svg>;
}

export default function SkinDeckMarket(props) {
  const [user, { refreshBalance }] = useUser();
  const withdrawal = () => props.mode === "withdrawal";
  const [query, setQuery] = createSignal("");
  const [sort, setSort] = createSignal("value-desc");
  const [selectedIds, setSelectedIds] = createSignal([]);
  const [tab, setTab] = createSignal("items");
  const [busy, setBusy] = createSignal(false);
  const steamReady = () => !!user()?.hasTradeUrl && !!user()?.hasApiKey;
  const [capabilities, { refetch: retryProvider }] = createResource(async () =>
    await authedAPI("/trading/skindeck/capabilities", "GET") || { enabled: false });
  const providerReady = () => capabilities()?.enabled === true && (withdrawal() ? capabilities()?.withdrawals !== false : capabilities()?.deposits !== false);
  const [items, { refetch: refreshItems }] = createResource(
    () => steamReady() && providerReady() ? props.mode : null,
    async () => {
      const response = await authedAPI(`/trading/skindeck/${withdrawal() ? "skins" : "inventory"}`, "GET", undefined, true);
      if (!Array.isArray(response?.items)) throw new Error("Unable to load items");
      return response.items;
    });
  const [history, { refetch: refreshHistory }] = createResource(async () => {
    const response = await authedAPI(`/trading/skindeck/transactions?type=${props.mode}`, "GET");
    if (!Array.isArray(response?.data)) throw new Error("Unable to load trades");
    return response.data;
  });
  const completedTrades = createMemo(() => (history() || []).filter(trade => trade.status === "completed").map(trade => trade.id).join(","));
  createEffect(() => {
    if (completedTrades()) refreshBalance();
  });
  // Catch confirmations received while a trade window or socket was disconnected.
  const checkTrades = () => {
    if (document.visibilityState === "visible" && !history.loading) refreshHistory();
  };
  const tradeTimer = setInterval(() => {
    if (history()?.some(trade => !["completed", "failed", "cancelled", "expired"].includes(trade.status))) checkTrades();
  }, 15000);
  window.addEventListener("focus", checkTrades);
  document.addEventListener("visibilitychange", checkTrades);
  onCleanup(() => {
    clearInterval(tradeTimer);
    window.removeEventListener("focus", checkTrades);
    document.removeEventListener("visibilitychange", checkTrades);
  });
  createEffect(() => {
    if (items.loading || items.error || !items()) return;
    const validIds = new Set(items().filter(available).map(item => item.id));
    setSelectedIds(current => current.filter(id => validIds.has(id)));
  });
  // A failed refresh must not leave stale items available for checkout.
  const selectedItems = createMemo(() => items.error ? [] : (items() || []).filter(item => selectedIds().includes(item.id) && available(item)));
  const total = createMemo(() => selectedItems().reduce((sum, item) => sum + Number(item.value || 0), 0));
  const filtered = createMemo(() => {
    const term = query().trim().toLowerCase();
    return [...(items.error ? [] : items() || [])].filter(item => `${item.name} ${item.wear || ""}`.toLowerCase().includes(term)).sort((a, b) =>
      sort() === "name" ? a.name.localeCompare(b.name) : sort() === "value-asc" ? a.value - b.value : b.value - a.value);
  });
  const canSubmit = () => selectedItems().length > 0 && steamReady() && providerReady() && !busy() && !items.loading;
  function toggle(item) {
    if (busy() || !available(item)) return;
    setSelectedIds(current => current.includes(item.id) ? current.filter(id => id !== item.id)
      : withdrawal() ? [item.id] : current.length < 20 ? [...current, item.id] : current);
  }
  async function submit() {
    if (!canSubmit()) return;
    const itemIds = selectedItems().map(item => item.id);
    setBusy(true);
    try {
      const response = await authedAPI(`/trading/skindeck/${withdrawal() ? "withdrawals" : "deposits"}`, "POST", JSON.stringify({ itemIds }), true);
      if (withdrawal() && response?.success) {
        refreshBalance();
        setSelectedIds([]);
        createNotification("success", "Skin withdrawal submitted.");
        await Promise.all([refreshItems(), refreshHistory()]);
      } else if (!withdrawal() && response?.redirectUrl) {
        await refreshHistory();
        window.location.assign(response.redirectUrl);
      }
    } finally { setBusy(false); }
  }

  return <section class="sd-market" aria-label={withdrawal() ? "Withdraw CS2 skins" : "Deposit CS2 skins"}>
    <main class="sd-inventory">
      <header class="sd-heading">
        <div><button class="sd-back" onClick={props.onBack}>← Payment methods</button><h1>{withdrawal() ? "Withdraw" : "Deposit"} CS2 skins</h1></div>
        <span class="sd-provider">SkinDeck <i />{capabilities.loading ? "Connecting" : capabilities()?.mode === "sandbox" ? "Sandbox" : providerReady() ? "Connected" : "Unavailable"}</span>
      </header>
      <Show when={!capabilities.loading} fallback={<div class="sd-state"><Loader /></div>}>
        <Show when={providerReady()} fallback={<div class="sd-state" role="status"><img src="/assets/icons/cs2-logo.svg" alt="" /><h2>SkinDeck is currently unavailable</h2><p>Please try again later or choose another payment method.</p><button class="sd-secondary" onClick={retryProvider}>Check again</button></div>}>
          <Show when={steamReady()} fallback={<div class="sd-state"><img src="/assets/icons/cs2-logo.svg" alt="" /><h2>Connect your Steam inventory</h2><p>Add your Steam trade URL and API key in your profile to {withdrawal() ? "withdraw" : "deposit"} skins.</p><div class="sd-requirements"><span classList={{ready: !!user()?.hasTradeUrl}}>Trade URL {user()?.hasTradeUrl ? "✓" : "required"}</span><span classList={{ready: !!user()?.hasApiKey}}>API key {user()?.hasApiKey ? "✓" : "required"}</span></div><A class="sd-primary" href="/profile">Open profile →</A></div>}>
            <div class="sd-toolbar">
              <label class="sd-search input-shell"><Icon type="search" /><input aria-label="Search skins" placeholder="Search Items..." value={query()} onInput={e => setQuery(e.currentTarget.value)} /></label>
              <div class="sd-value"><img src="/assets/icons/coin.svg" alt="Coins" />{formatNumber(withdrawal() ? user()?.balance || 0 : total())}<span>{withdrawal() ? "BALANCE" : "SELECTED"}</span></div>
              <select aria-label="Sort skins" value={sort()} onChange={e => setSort(e.currentTarget.value)}><option value="value-desc">Price: high to low</option><option value="value-asc">Price: low to high</option><option value="name">Name: A–Z</option></select>
              <button class="sd-refresh" aria-label="Refresh skins" disabled={items.loading || busy()} onClick={refreshItems}><Icon type="refresh" /></button>
            </div>
            <div class="sd-meta"><span>{filtered().length} items</span><span>{withdrawal() ? "Choose one skin" : "Select up to 20 skins"}</span></div>
            <button class="sd-mobile-selection" onClick={() => document.querySelector('.sd-sidebar')?.scrollIntoView({block: 'start', behavior: 'auto'})}>View selected items ({selectedItems().length}) →</button>
            <Show when={!items.loading} fallback={<div class="sd-state"><Loader /></div>}>
              <Show when={!items.error} fallback={<div class="sd-state" role="alert"><h2>Couldn’t load your skins</h2><p>Refresh your inventory to try again.</p><button class="sd-secondary" onClick={refreshItems}>Try again</button></div>}>
                <div class="sd-grid"><For each={filtered()}>{item => <button type="button" class="sd-card" style={{ "--rarity": colors[String(item.rarity || "consumer").toLowerCase()] || "#8847ff" }} classList={{selected: selectedIds().includes(item.id), unavailable: !available(item)}} aria-pressed={selectedIds().includes(item.id)} aria-label={`${item.name}, ${formatNumber(item.value)} coins`} disabled={!available(item) || busy()} onClick={() => toggle(item)}>
                  <span class="sd-wear" title={item.wear}>{wears[item.wear] || item.wear || "CS2"}<Show when={Number.isFinite(Number(item.float)) && item.float != null}><span> ({Number(item.float).toFixed(3)})</span></Show></span>
                  <div class="sd-art"><span class="sd-orbit" /><img src={item.image} alt="" loading="lazy" /></div>
                  <strong class="sd-name"><For each={itemNames(item)}>{name => <span>{name}</span>}</For></strong>
                  <div class="sd-card-bottom"><span class="sd-price"><img src="/assets/icons/coin.svg" alt="" />{formatNumber(item.value)}</span><span class="sd-check" aria-hidden="true">{selectedIds().includes(item.id) ? "✓" : ""}</span></div>
                  <Show when={!available(item)}><span class="sd-unavailable">Unavailable</span></Show>
                </button>}</For></div>
                <Show when={!filtered().length}><div class="sd-state"><h2>{query() ? "No matching skins" : "No skins available"}</h2><p>{query() ? "Try a different name or wear condition." : "Refresh your inventory or check back later."}</p></div></Show>
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
    </main>
    <aside class="sd-sidebar" aria-label="Skin selection and trades">
      <div class="sd-tabs" role="tablist" aria-label="Skin checkout"><button id="sd-items-tab" role="tab" aria-selected={tab() === "items"} aria-controls="sd-items-panel" classList={{active: tab() === "items"}} onClick={() => setTab("items")}><img src="/assets/icons/cs2-logo.svg" alt="" />Items</button><button id="sd-trades-tab" role="tab" aria-selected={tab() === "trades"} aria-controls="sd-trades-panel" classList={{active: tab() === "trades"}} onClick={() => setTab("trades")}><Icon type="trades" />Trades</button></div>
      <Show when={tab() === "items"} fallback={<div id="sd-trades-panel" class="sd-list" role="tabpanel" aria-labelledby="sd-trades-tab"><div class="sd-selection-heading">Recent {withdrawal() ? "withdrawals" : "deposits"}<button aria-label="Refresh trades" onClick={refreshHistory}><Icon type="refresh" /></button></div><Show when={!history.loading} fallback={<Loader />}><Show when={!history.error} fallback={<div class="sd-sidebar-empty"><p>Couldn’t load trades.</p><button class="sd-secondary" onClick={refreshHistory}>Try again</button></div>}><For each={history()}>{trade => <div class="sd-trade"><strong>{trade.skinItems?.[0]?.name || `${trade.skinItems?.length || 0} CS2 items`}</strong><span class="sd-status">{trade.status}</span><small>{trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : ""}</small><span class="sd-price"><img src="/assets/icons/coin.svg" alt="" />{formatNumber(trade.value || 0)}</span></div>}</For><Show when={!history()?.length}><div class="sd-sidebar-empty"><Icon type="trades" /><strong>No trades yet</strong><p>Your SkinDeck trades will appear here.</p></div></Show></Show></Show></div>}>
        <div id="sd-items-panel" class="sd-list" role="tabpanel" aria-labelledby="sd-items-tab"><div class="sd-selection-heading"><span>Selected items ({selectedItems().length})</span><button disabled={!selectedItems().length || busy()} onClick={() => setSelectedIds([])}><Icon type="trash" />Clear</button></div>
          <For each={selectedItems()}>{item => <article class="sd-selected-item"><div class="sd-selected-top"><img src={item.image} alt="" /><div><span>{itemNames(item)[0]}</span><strong>{itemNames(item).slice(1).join(" | ") || item.wear || "CS2 skin"}</strong></div></div><div class="sd-selected-bottom"><span class="sd-price"><img src="/assets/icons/coin.svg" alt="" />{formatNumber(item.value)}</span><button aria-label={`Remove ${item.name}`} disabled={busy()} onClick={() => toggle(item)}><Icon type="trash" /></button></div></article>}</For>
          <Show when={!selectedItems().length}><div class="sd-sidebar-empty"><img src="/assets/icons/cs2-logo.svg" alt="" /><strong>Select your skins</strong><p>{withdrawal() ? "Choose a skin to withdraw to your Steam inventory." : "Choose skins from your inventory to add to your deposit."}</p></div></Show>
        </div>
      </Show>
      <footer class="sd-checkout"><p class="sd-trade-note">{withdrawal() ? "Your skin will be sent through a Steam trade offer. Review your trade details before accepting." : "Continue to SkinDeck to review your deposit and any applicable Steam trade holds."}</p><div class="sd-checkout-box"><div class="sd-total" aria-live="polite"><span>{withdrawal() ? "Selected value" : "Estimated credit"}</span><strong class="sd-price"><img src="/assets/icons/coin.svg" alt="Coins" />{formatNumber(total())}</strong></div><button class="sd-primary" disabled={!canSubmit()} onClick={submit}>{busy() ? "Processing…" : withdrawal() ? "Withdraw skin" : "Deposit"}</button><span class="sd-powered">Powered by SkinDeck</span></div></footer>
    </aside>
  </section>;
}
