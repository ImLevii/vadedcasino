import { createResource, createSignal, Show } from "solid-js";
import { api, authedAPI } from "../../util/api";
export default function CreditCardDeposit() {
  const [info, { refetch }] = createResource(() =>
      api("/trading/deposit/cc", "GET"),
    ),
    [amount, setAmount] = createSignal("25"),
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
  async function submit(e) {
    e.preventDefault();
    if (busy()) return;
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
      <h3>Credit & debit cards</h3>
      <p class="wallet-caption">
        Review your amount before continuing to secure checkout.
      </p>
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
          <form onSubmit={submit}>
            <label class="wallet-label" for="card-coins">
              Coins to receive
            </label>
            <input
              id="card-coins"
              class="wallet-input"
              type="number"
              min={
                Math.ceil(
                  (info().baseMin / (info().rate.usd / info().rate.coins)) *
                    100,
                ) / 100
              }
              max={
                Math.floor(
                  (info().baseMax / (info().rate.usd / info().rate.coins)) *
                    100,
                ) / 100
              }
              step="0.01"
              required
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value)}
            />
            <div class="wallet-estimate">
              <span>
                Deposit value<strong>${usd().toFixed(2)}</strong>
              </span>
              <span>
                Total with fees<strong>${total().toFixed(2)}</strong>
              </span>
            </div>
            <p class="wallet-caption">
              Fee: {info()?.percentFee}% + ${info()?.fixedFee}. The final charge
              is confirmed at checkout.
            </p>
            <button class="wallet-button primary full" disabled={busy()}>
              {busy() ? "Preparing checkout…" : "Continue to checkout →"}
            </button>
          </form>
          <Show when={link()}>
            <a
              class="wallet-button primary full"
              href={link()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open secure checkout ↗
            </a>
          </Show>
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
