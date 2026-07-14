import {createMemo, createResource, createSignal, For, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import {formatNumber} from "../../util/numbers";
import {useUser} from "../../contexts/usercontextprovider";

function SkinDeckWithdraw() {
    const [user] = useUser();
    const [selectedId, setSelectedId] = createSignal(null);
    const [submitting, setSubmitting] = createSignal(false);
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
            <header><div><span class='eyebrow'>SKINDECK INVENTORY</span><h2>Withdraw a CS2 skin</h2></div><span class='provider'>LIVE PRICES</span></header>

            <Show when={steamReady()} fallback={
                <div class='steam-setup'>
                    <img src='/assets/icons/cube.svg' alt=''/>
                    <div><strong>Steam connection required</strong><span>Add both your Steam Trade URL and Steam API Key before using SkinDeck.</span></div>
                    <a href='/profile'>OPEN PROFILE</a>
                </div>
            }>
                <Show when={!catalog.loading} fallback={<Loader/>}>
                    <div class='catalog'>
                        <For each={catalog()}>{item => (
                            <button class='skin' classList={{selected: selectedId() === item.id}} onClick={() => setSelectedId(item.id)}>
                                <div class='image-wrap'><img src={item.image} alt=''/></div>
                                <strong>{item.name}</strong><span>{formatNumber(item.value)} COINS</span>
                            </button>
                        )}</For>
                    </div>
                    <Show when={!catalog()?.length}><p class='empty'>No affordable skins are currently available.</p></Show>
                </Show>

                <div class='checkout'>
                    <div><span>SELECTED VALUE</span><strong>{formatNumber(selectedItem()?.value || 0)} COINS</strong></div>
                    <button class='bevel-gold' disabled={!selectedItem() || submitting()} onClick={submitWithdrawal}>{submitting() ? 'SUBMITTING...' : 'WITHDRAW SKIN'}</button>
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
                .skindeck-panel { padding: 28px; border: 1px solid var(--glass-border); border-radius: 8px; background: radial-gradient(90% 140% at 0 0, rgba(31,214,95,.07), transparent 58%), linear-gradient(145deg, rgba(22,29,39,.86), rgba(8,12,18,.94)); box-shadow: inset 0 1px 0 var(--glass-highlight), var(--morph-shadow); }
                header, .checkout, .history-row { display: flex; align-items: center; }
                header { justify-content: space-between; margin-bottom: 22px; }
                h2, h3, strong, span, p, button { font-family: Geogrotesque Wide, sans-serif; letter-spacing: 0; }
                h2 { margin: 3px 0 0; color: #fff; font-size: 20px; }
                h3 { margin: 0 0 10px; color: #fff; font-size: 14px; }
                .eyebrow { color: #1fd65f; font-size: 10px; font-weight: 700; }
                .provider { color: #6f7785; font-size: 10px; font-weight: 700; }
                .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 10px; max-height: 390px; overflow: auto; }
                .skin { min-width: 0; padding: 10px; text-align: left; border: 1px solid rgba(255,255,255,.07); border-radius: 6px; background: rgba(4,8,13,.54); cursor: pointer; transition: border-color .16s ease, background .16s ease; }
                .skin:hover, .skin.selected { border-color: rgba(31,214,95,.52); background: rgba(31,214,95,.07); }
                .image-wrap { width: 100%; aspect-ratio: 1.45; display: grid; place-items: center; overflow: hidden; }
                .image-wrap img { width: 90%; height: 90%; object-fit: contain; }
                .skin strong { display: block; min-height: 31px; color: #c3cad6; font-size: 11px; line-height: 1.35; }
                .skin span { color: #1fd65f; font-size: 11px; font-weight: 700; }
                .checkout { justify-content: space-between; gap: 18px; margin-top: 20px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.07); }
                .checkout > div { display: flex; flex-direction: column; gap: 4px; }
                .checkout span { color: #727b89; font-size: 9px; font-weight: 700; }
                .checkout strong { color: #fff; font-size: 15px; }
                .checkout button { width: 170px; height: 40px; border: 0; font-weight: 700; cursor: pointer; }
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
                @media (max-width: 650px) { .skindeck-panel { padding: 18px; } .provider { display: none; } .catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); } .checkout { align-items: stretch; flex-direction: column; } .checkout button { width: 100%; } }
            `}</style>
        </section>
    );
}

export default SkinDeckWithdraw;