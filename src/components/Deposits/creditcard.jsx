import { createResource, createSignal, Show } from "solid-js";
import { api, authedAPI } from "../../util/api";
import DepositAction from "./action";
export default function CreditCardDeposit(props) {
  const [info, { refetch }] = createResource(() =>
      api("/trading/deposit/cc", "GET"),
    ),
    [amount, setAmount] = createSignal("15"),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [link, setLink] = createSignal("");
  const usd = () =>
    (Number(amount() || 0) * (info()?.rate?.usd || 0.7)) /
    (info()?.rate?.coins || 1);
  const total = () =>
    Math.ceil(
      (usd() * (1 + (info()?.percentFee || 0) / 100) +
        (info()?.fixedFee || 0)) *
        10,
    ) / 10;
  const minCoins = () => Math.ceil((info().baseMin / (info().rate.usd / info().rate.coins)) * 100) / 100;
  const maxCoins = () => Math.floor((info().baseMax / (info().rate.usd / info().rate.coins)) * 100) / 100;
  const validAmount = () => Number.isFinite(Number(amount())) && Number(amount()) > 0
    && Number(amount()) >= minCoins() && Number(amount()) <= maxCoins();
  async function submit(e) {
    e.preventDefault();
    if (busy() || !validAmount()) return;
    setBusy(true);
    setError("");
    setLink("");
    const result = await authedAPI(
      "/trading/deposit/cc",
      "POST",
      JSON.stringify({ amount: Number(amount()) }),
      false,
      20000,
    );
    setBusy(false);
    try {
      const url = new URL(result?.url);
      if (url.protocol !== "https:") throw new Error();
      setLink(url.href);
    } catch {
      setError(
        "Card checkout is unavailable right now. Please try again later.",
      );
    }
  }
  return (
    <div class="wallet-card">
      <Show
        when={!info.loading}
        fallback={<div class="wallet-loading">Checking card availability…</div>}
      >
        <Show
          when={info()?.available}
          fallback={
            <div class="wallet-notice">
              <strong>Card deposits are currently unavailable</strong>
              <p>Choose another payment method or check again later.</p>
              <button class="wallet-button" onClick={refetch}>
                Check again
              </button>
            </div>
          }
        >
          <form id="card-deposit-form" onSubmit={submit}>
            <label class="wallet-label" for="card-coins">
              Conversion
            </label>
            <div class="wallet-card-conversion">
              <div class="wallet-card-field input-shell">
                <img src="/assets/chips/chip-green-clover.png" alt="" />
            <input
              id="card-coins"
              class="wallet-input"
              type="number"
              aria-label="Coins to receive"
              inputMode="decimal"
              min={minCoins()}
              max={maxCoins()}
              step="0.01"
              required
              value={amount()}
              onInput={(e) => { setAmount(e.currentTarget.value); setLink(""); }}
            />
              </div>
              <span class="wallet-conversion-arrow" aria-hidden="true">⇄</span>
              <div class="wallet-card-field input-shell">
                <span aria-hidden="true">$</span>
                <input aria-label="Deposit amount in USD" type="number" inputMode="decimal"
                  min={info().baseMin} max={info().baseMax} step="0.01" required value={usd().toFixed(2)}
                  onInput={(e) => { setAmount(e.currentTarget.value === "" ? "" : String(Math.round(Number(e.currentTarget.value) / (info().rate.usd / info().rate.coins) * 100) / 100)); setLink(""); }} />
              </div>
            </div>
            <span class="wallet-label">What you pay</span>
            <div class="wallet-card-total" role="status" aria-label="Total with processing fee">
              <span aria-hidden="true">$</span>
              <strong>{total().toFixed(2)} <small>({Math.max(0, total() - usd()).toFixed(2)} processing fee)</small></strong>
            </div>
            <p class="wallet-checkout-note">
              The total shown above is an estimate. Your final charge is confirmed at checkout.
            </p>
          </form>
          <DepositAction mount={props.actionMount}>
          <Show when={link()} fallback={
            <button class="wallet-button primary" form="card-deposit-form" disabled={busy() || !validAmount()}>
              <Show when={!busy()} fallback="Preparing checkout…">
                Buy <img src="/assets/chips/chip-green-clover.png" alt="coins" /> {Number(amount() || 0).toFixed(2)}
              </Show>
            </button>
          }>
            <a
              class="wallet-button primary"
              href={link()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open secure checkout ↗
            </a>
          </Show>
          </DepositAction>
          <Show when={error()}>
            <div class="wallet-notice danger" role="alert">
              {error()}
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
