import {
  createResource,
  createSignal,
  For,
  Show,
  onCleanup,
  createEffect,
} from "solid-js";
import QRCode from "qrcode";
import { authedAPI, createNotification } from "../../util/api";
import { openSupport } from "../../util/support";
export default function CryptoDeposit(props) {
  const [wallet, setWallet] = createSignal(null),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [amount, setAmount] = createSignal("25"),
    [unit, setUnit] = createSignal("usd"),
    [qr, setQr] = createSignal(""),
    [page, setPage] = createSignal(1);
  const [history, { refetch }] = createResource(
    page,
    async (page) =>
      (await authedAPI(
        "/trading/crypto/deposit/transactions?page=" + page,
        "GET",
      )) || { error: "CONNECTION_UNAVAILABLE" },
  );
  const currency = () =>
    props.catalog?.currencies?.find((c) => c.id === props.currency);
  const rate = () => props.catalog?.coinRate || { coins: 1, usd: 0.7 };
  const available = () => props.catalog?.available && currency()?.available;
  const dollars = () => {
    const n = Number(amount());
    return Number.isFinite(n) && n >= 0
      ? unit() === "usd"
        ? n
        : unit() === "coins"
          ? (n * rate().usd) / rate().coins
          : n * (currency()?.price || 0)
      : 0;
  };
  const value = (n, d = 2) =>
    Number(n || 0).toLocaleString(undefined, {
      maximumFractionDigits: d,
      minimumFractionDigits: d === 2 ? 2 : 0,
    });
  createEffect(() => {
    const address = wallet()?.address;
    setQr("");
    if (!address) return;
    let active = true;
    QRCode.toDataURL(address, {
      width: 232,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#091812", light: "#ffffff" },
    })
      .then((url) => active && setQr(url))
      .catch(() => {});
    onCleanup(() => (active = false));
  });
  let disposed = false;
  onCleanup(() => (disposed = true));
  async function generate() {
    if (busy() || !available()) return;
    setBusy(true);
    setError("");
    const result = await authedAPI(
      "/trading/crypto/deposit/wallet",
      "POST",
      JSON.stringify({ currency: props.currency }),
      false,
      15000,
    );
    if (disposed) return;
    setBusy(false);
    if (!result?.address) {
      setError(result?.error || "CONNECTION_UNAVAILABLE");
      return;
    }
    setWallet(result);
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      createNotification("success", "Copied to clipboard.");
    } catch {
      createNotification(
        "error",
        "Copy is unavailable. Select and copy the address manually.",
      );
    }
  }
  const timer = setInterval(() => {
    if (wallet() && document.visibilityState === "visible" && !history.loading)
      refetch();
  }, 20000);
  onCleanup(() => clearInterval(timer));
  return (
    <div class="wallet-crypto">
      <div class="wallet-currency-title">
        <img src={props.img} alt="" />
        <div>
          <h3>{currency()?.name || props.currency}</h3>
          <p>{currency()?.network || props.currency}</p>
        </div>
        <span class="wallet-pill">CRYPTO</span>
      </div>
      <Show
        when={!props.catalogLoading}
        fallback={
          <div class="wallet-loading" role="status">
            Checking payment availability…
          </div>
        }
      >
        <Show
          when={available()}
          fallback={
            <div class="wallet-notice">
              <strong>Crypto deposits are temporarily unavailable</strong>
              <p>
                No deposit address is available right now. Try again later or
                choose another payment method.
              </p>
              <div class="wallet-actions">
                <button class="wallet-button" onClick={props.retryCatalog}>
                  Check again
                </button>
                <button class="wallet-text-button" onClick={openSupport}>
                  Get help ↗
                </button>
              </div>
            </div>
          }
        >
          <label class="wallet-label" for="deposit-amount">
            Estimate your deposit
          </label>
          <div class="wallet-amount">
            <input
              id="deposit-amount"
              type="number"
              inputMode="decimal"
              min="0"
              max="1000000"
              step="any"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value)}
            />
            <select
              aria-label="Amount unit"
              value={unit()}
              onChange={(e) => setUnit(e.currentTarget.value)}
            >
              <option value="usd">USD</option>
              <option value="coins">Coins</option>
              <option value="crypto">{props.currency.split(".")[0]}</option>
            </select>
          </div>
          <div class="wallet-estimate">
            <span>
              Estimated credit
              <strong>
                <img src="/assets/chips/chip-green-clover.png" alt="" />
                {value((dollars() / rate().usd) * rate().coins)} coins
              </strong>
            </span>
            <span>
              Crypto amount
              <strong>
                {value(dollars() / currency().price, 8)}{" "}
                {props.currency.split(".")[0]}
              </strong>
            </span>
          </div>
          <p class="wallet-caption">
            Estimates use the current market rate. Your final credit is
            calculated when payment confirms.
          </p>
          <Show when={error()}>
            <div class="wallet-notice danger" role="alert">
              We couldn’t generate your deposit details. Please try again.
            </div>
          </Show>
          <Show
            when={wallet()}
            fallback={
              <button
                class="wallet-button primary full"
                onClick={generate}
                disabled={busy()}
              >
                {busy() ? "Preparing your address…" : "Get deposit address →"}
              </button>
            }
          >
            <div class="wallet-network-note">
              Only send <strong>{props.currency.split(".")[0]}</strong> using{" "}
              <strong>{currency()?.network}</strong>.
            </div>
            <div class="wallet-address-grid">
              <div class="wallet-qr">
                <Show when={qr()} fallback={<span>Preparing QR code…</span>}>
                  <img
                    src={qr()}
                    alt={props.currency + " deposit address QR code"}
                  />
                </Show>
              </div>
              <div class="wallet-address-details">
                <label class="wallet-label">Your deposit address</label>
                <code>{wallet()?.address}</code>
                <button
                  class="wallet-button"
                  onClick={() => copy(wallet().address)}
                >
                  Copy address
                </button>
                <Show when={wallet()?.destinationTag}>
                  <label class="wallet-label">
                    Required destination tag / memo
                  </label>
                  <code>{wallet().destinationTag}</code>
                  <button
                    class="wallet-button"
                    onClick={() => copy(wallet().destinationTag)}
                  >
                    Copy memo
                  </button>
                </Show>
                <p class="wallet-caption">
                  {wallet()?.currency?.confirmations} network confirmations
                  required.
                </p>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
      <section class="wallet-history">
        <div class="wallet-section-title">
          <h3>Recent crypto deposits</h3>
          <button
            class="wallet-text-button"
            disabled={history.loading}
            onClick={refetch}
          >
            {history.loading ? "Refreshing…" : "Refresh ↻"}
          </button>
        </div>
        <Show
          when={!history()?.error}
          fallback={
            <div class="wallet-notice">
              History couldn’t be loaded.{" "}
              <button class="wallet-text-button" onClick={refetch}>
                Try again
              </button>
            </div>
          }
        >
          <Show
            when={history()?.data?.length}
            fallback={
              <p class="wallet-caption">
                {history.loading
                  ? "Loading your history…"
                  : "Your crypto deposits will appear here after they are detected."}
              </p>
            }
          >
            <div class="wallet-history-list">
              <For each={history()?.data}>
                {(tx) => (
                  <div class="wallet-history-row">
                    <div>
                      <strong>{tx.currency}</strong>
                      <small>
                        {new Date(tx.createdAt).toLocaleDateString()} · #{tx.id}
                      </small>
                    </div>
                    <div>
                      <strong>
                        {tx.status === "completed"
                          ? value(tx.coinAmount) + " coins"
                          : value(tx.cryptoAmount, 8)}
                      </strong>
                      <span class={"wallet-status " + tx.status}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={history()?.pages > 1}>
            <div class="wallet-pagination">
              <button
                class="wallet-button"
                disabled={history.loading || page() <= 1}
                onClick={() => setPage(page() - 1)}
              >
                Previous
              </button>
              <span>
                {history()?.page} / {history()?.pages}
              </span>
              <button
                class="wallet-button"
                disabled={history.loading || page() >= history()?.pages}
                onClick={() => setPage(page() + 1)}
              >
                Next
              </button>
            </div>
          </Show>
        </Show>
      </section>
    </div>
  );
}
