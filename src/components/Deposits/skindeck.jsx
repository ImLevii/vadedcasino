import {createResource, createSignal, For, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import Loader from "../Loader/loader";
import {formatNumber} from "../../util/numbers";

function SkinDeckDeposit() {
    const [creating, setCreating] = createSignal(false);
    const [history, {refetch}] = createResource(fetchHistory);

    async function fetchHistory() {
        const response = await authedAPI('/trading/skindeck/transactions?type=deposit', 'GET');
        return response?.data || [];
    }

    async function createDeposit() {
        if (creating()) return;
        setCreating(true);
        const response = await authedAPI('/trading/skindeck/deposits', 'POST', JSON.stringify({}), true);
        setCreating(false);

        if (!response?.redirectUrl) return;
        await refetch();
        window.location.assign(response.redirectUrl);
    }

    return (
        <section class='skindeck-panel'>
            <header>
                <div><span class='eyebrow'>CS2 INVENTORY</span><h2>Deposit skins</h2></div>
                <span class='provider'>POWERED BY SKINDECK</span>
            </header>

            <div class='deposit-action'>
                <div class='inventory-mark'><img src='/assets/icons/cube.svg' width='30' height='30' alt=''/></div>
                <div class='action-copy'>
                    <strong>Steam inventory</strong>
                    <span>Provider-confirmed value is credited after trade settlement.</span>
                </div>
                <button class='bevel-gold' disabled={creating()} onClick={createDeposit}>
                    {creating() ? 'OPENING...' : 'SELECT SKINS'}
                </button>
            </div>

            <div class='history'>
                <h3>Recent deposits</h3>
                <Show when={!history.loading} fallback={<Loader/>}>
                    <Show when={history()?.length} fallback={<p class='empty'>No SkinDeck deposits yet.</p>}>
                        <For each={history()}>{payment => (
                            <div class='history-row'>
                                <div><strong>{payment.skinItems?.length || 0} skins</strong><span>{new Date(payment.createdAt).toLocaleString()}</span></div>
                                <span class={`status ${payment.status}`}>{payment.status}</span>
                                <strong class='value'>{formatNumber(payment.value)} COINS</strong>
                            </div>
                        )}</For>
                    </Show>
                </Show>
            </div>

            <style jsx>{`
                .skindeck-panel { padding: 28px; border: 1px solid var(--glass-border); border-radius: 8px; background: radial-gradient(90% 140% at 0 0, rgba(31,214,95,.08), transparent 58%), linear-gradient(145deg, rgba(22,29,39,.86), rgba(8,12,18,.94)); box-shadow: inset 0 1px 0 var(--glass-highlight), var(--morph-shadow); }
                header, .deposit-action, .history-row { display: flex; align-items: center; }
                header { justify-content: space-between; margin-bottom: 24px; }
                h2, h3, strong, span, p { font-family: Geogrotesque Wide, sans-serif; }
                h2 { margin: 3px 0 0; color: #fff; font-size: 20px; letter-spacing: 0; }
                h3 { margin: 0 0 12px; color: #fff; font-size: 14px; letter-spacing: 0; }
                .eyebrow, .provider { color: #1fd65f; font-size: 10px; font-weight: 700; letter-spacing: 0; }
                .provider { color: #6f7785; }
                .deposit-action { gap: 16px; min-height: 86px; padding: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(4,8,13,.52); }
                .inventory-mark { width: 54px; height: 54px; flex: 0 0 54px; display: grid; place-items: center; border: 1px solid rgba(31,214,95,.28); background: rgba(31,214,95,.08); }
                .inventory-mark img { filter: brightness(0) saturate(100%) invert(72%) sepia(77%) saturate(580%) hue-rotate(83deg); }
                .action-copy { display: flex; flex: 1; flex-direction: column; gap: 5px; min-width: 0; }
                .action-copy strong { color: #fff; font-size: 14px; }
                .action-copy span { color: #8b92a0; font-size: 12px; line-height: 1.4; }
                button { min-width: 150px; height: 40px; border: 0; font-family: Geogrotesque Wide, sans-serif; font-weight: 700; cursor: pointer; }
                button:disabled { opacity: .55; cursor: wait; }
                .history { margin-top: 24px; }
                .history-row { min-height: 54px; gap: 16px; padding: 0 14px; border-top: 1px solid rgba(255,255,255,.06); }
                .history-row > div { flex: 1; display: flex; flex-direction: column; gap: 3px; }
                .history-row strong { color: #c3cad6; font-size: 12px; }
                .history-row span { color: #727b89; font-size: 10px; text-transform: uppercase; }
                .status { min-width: 72px; text-align: center; }
                .status.completed { color: #1fd65f; }
                .status.failed, .status.cancelled, .status.expired { color: #ff5141; }
                .value { min-width: 110px; text-align: right; }
                .empty { padding: 18px 0; color: #727b89; font-size: 12px; }
                @media (max-width: 650px) { .skindeck-panel { padding: 18px; } .provider { display: none; } .deposit-action { align-items: stretch; flex-wrap: wrap; } .action-copy { min-width: calc(100% - 74px); } button { width: 100%; } .history-row { gap: 8px; } .value { min-width: 80px; } }
            `}</style>
        </section>
    );
}

export default SkinDeckDeposit;