import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { api, authedAPI } from "../../util/api";
import { useUser } from "../../contexts/usercontextprovider";
import DepositAction from "./action";
import "./deposit.css";

const humanError = (code) =>
  ({
    PAYMENT_MANUAL_REVIEW_REQUIRED: "Staff must verify this PayPal payment before coins are credited. Refresh here to check approval.",
    PAYMENT_PROVIDER_UNCONFIGURED: "This provider has not been configured. Choose another method or contact support.",
    PAYMENT_PUBLIC_URL_REQUIRED: "Checkout return URLs are not configured. Contact support to enable this method.",
    PAYMENT_PROVIDER_AUTH_FAILED: "The payment provider could not authenticate. Contact support to check its credentials.",
    PAYMENT_PROVIDER_ACCESS_DENIED: "The provider account does not have access to this payment feature. Contact support.",
    PAYMENT_PROVIDER_REQUEST_UNCONFIRMED: "The payment provider could not be reached. Refresh the payment status before starting another payment.",
    PAYMENT_SERVICE_UNAVAILABLE: "The payment service is reconnecting. Try again shortly.",
    PAYMENT_RATE_UNAVAILABLE: "The coin conversion rate is temporarily unavailable. Try again shortly.",
    DISABLED: "This method is currently disabled. Choose another payment method.",
    INVALID_AMOUNT: "Enter a valid amount with up to two decimal places.",
    PAYMENT_AMOUNT_OUTSIDE_LIMITS:
      "Choose an amount within the payment limits.",
    INVALID_PAYPAL_RECIPIENT: "Enter the email address of your PayPal account.",
    INSUFFICIENT_BALANCE: "Your balance is too low for this withdrawal.",
    STRIPE_ONBOARDING_REQUIRED:
      "Complete your Stripe account setup before withdrawing.",
    PAYMENT_REQUIRES_RECONCILIATION:
      "The provider response is still being checked. Keep this payment reference and contact support before starting another payment.",
    PENDING_WITHDRAWAL: "You already have a withdrawal awaiting processing.",
    KYC: "Complete account verification before withdrawing.",
    ACCOUNT_LOCKED: "Your account requires verification before withdrawing.",
    SPONSOR_LOCK: "Withdrawals are unavailable for this account.",
    PAYMENT_TEST_MODE_STAFF_ONLY:
      "This method is currently in testing. Choose another payment method.",
    PAYMENT_AMOUNT_BELOW_FEES:
      "Choose a larger amount to cover the withdrawal fee.",
    INSUFFICIENT_XP: "Your account has not met the withdrawal requirements.",
    INSUFFICIENT_DEPOSITS:
      "Your account has not met the withdrawal requirements.",
    NOT_ENOUGH_WAGERED_WITHDRAW:
      "Your deposit wagering requirements must be met before withdrawing.",
  })[code] ||
  "This payment method is unavailable right now. Try again later or contact support.";
const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
function checkoutUrl(value, provider) {
  try {
    const url = new URL(value),
      host = provider === "paypal" ? "paypal.com" : "stripe.com";
    return url.protocol === "https:" &&
      (url.hostname === host || url.hostname.endsWith("." + host))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export default function ProviderPayment(props) {
  const [user, { refreshBalance }] = useUser(),
    [params, setParams] = useSearchParams(),
    [amount, setAmount] = createSignal("15"),
    [receiver, setReceiver] = createSignal(""),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [submitted, setSubmitted] = createSignal(null),
    [created, setCreated] = createSignal(null);
  const withdrawal = () => props.direction === "withdrawal";
  const [catalog, { refetch: refreshCatalog }] = createResource(() =>
    api("/trading/providers", "GET"),
  );
  const info = createMemo(() =>
    catalog()?.providers?.find((p) => p.id === props.provider),
  );
  const providerName = () =>
    info()?.name ||
    {
      paypal: "PayPal",
      stripe: "Stripe",
      applepay: "Apple Pay",
      cashapp: "Cash App Pay",
    }[props.provider] ||
    "Payment provider";
  const settings = () => info()?.[withdrawal() ? "withdrawals" : "deposits"];
  const staff = () => ["OWNER", "ADMIN"].includes(user()?.role);
  const ready = () =>
    settings()?.available && (info()?.mode !== "sandbox" || staff());
  const rate = () => catalog()?.coinRate?.usd / catalog()?.coinRate?.coins;
  const cents = () => Math.round(Number(amount()) * rate() * 100);
  const fee = () =>
    Math.round((cents() * (settings()?.percent || 0)) / 100) +
    Math.round((settings()?.fixed || 0) * 100);
  const total = () => (withdrawal() ? cents() - fee() : cents() + fee());
  const valid = () =>
    Number.isFinite(Number(amount())) &&
    Number(amount()) >= 0.01 &&
    Math.abs(Number(amount()) * 100 - Math.round(Number(amount()) * 100)) <
      1e-6 &&
    cents() >= Math.round((settings()?.min || 0) * 100) &&
    cents() <= Math.round((settings()?.max || 0) * 100) &&
    total() > 0 &&
    (!withdrawal() ||
      info()?.mode === "sandbox" ||
      Number(amount()) <= Number(user()?.balance || 0));
  const [saved, { refetch: refreshPayment }] = createResource(
    () => (params.payment && user()?.id ? params.payment : null),
    async (id) =>
      authedAPI("/trading/providers/payments/" + encodeURIComponent(id), "GET"),
  );
  const current = createMemo(() => {
    // Resources retain their last response when disabled or loading another ID.
    // Only show saved instructions for the currently selected payment.
    const row = params.payment
      ? [saved()?.payment, created()].find(row => row && String(row.id) === String(params.payment))
      : created();
    return row?.provider === props.provider &&
      row?.type === (withdrawal() ? "withdrawal" : "deposit")
      ? row
      : null;
  });
  const manualPayment = () => current()?.flow === "email";
  const emailDeposit = () => props.provider === "paypal" && !withdrawal() && info()?.depositFlow === "email";
  const [account, { refetch: refreshAccount }] = createResource(
    () => withdrawal() && props.provider === "stripe" && ready(),
    () => authedAPI("/trading/providers/stripe/account", "GET"),
  );
  const [history, { refetch: refreshHistory }] = createResource(() =>
    authedAPI("/trading/providers/payments", "GET"),
  );
  const creditedPayment = createMemo(() => {
    const row = current();
    return row?.mode === "live" && row.status === "completed" ? String(row.id) : null;
  });
  createEffect(() => {
    if (creditedPayment()) refreshBalance();
  });
  const returnedPayments = new Set();
  createEffect(() => {
    const row = current();
    if (params.checkout === "success" && row && !withdrawal() && !manualPayment() && !["completed", "disputed"].includes(row.status) && !returnedPayments.has(row.id)) {
      returnedPayments.add(row.id);
      untrack(() => refreshStatus());
    }
  });
  createEffect(() => {
    if (!params.payment) return;
    const check = () => {
      if (document.visibilityState === "visible" && current() && !busy() && !["completed", "failed", "cancelled", "disputed"].includes(current().status))
        refreshStatus();
    };
    const timer = setInterval(check, 15000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    onCleanup(() => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    });
  });
  const edit = (e) => {
    setAmount(e.currentTarget.value);
    setError("");
  };
  async function submit(e) {
    e.preventDefault();
    if (busy() || !valid() || !ready()) return;
    const body = submitted() || {
      requestId: crypto.randomUUID(),
      amount: Number(amount()),
      ...(withdrawal() && props.provider === "paypal"
        ? { receiver: receiver().trim() }
        : {}),
    };
    setSubmitted(body);
    setBusy(true);
    setError("");
    const result = await authedAPI(
      "/trading/providers/" +
        props.provider +
        "/" +
        (withdrawal() ? "withdrawals" : "deposits"),
      "POST",
      JSON.stringify(body),
      false,
      30000,
    );
    setBusy(false);
    if (!result?.success) {
      // Only known rejections before creation may discard the original request ID.
      if (
        [
          "INVALID_AMOUNT",
          "PAYMENT_AMOUNT_OUTSIDE_LIMITS",
          "INVALID_PAYPAL_RECIPIENT",
          "INSUFFICIENT_BALANCE",
          "STRIPE_ONBOARDING_REQUIRED",
          "PENDING_WITHDRAWAL",
          "KYC",
          "ACCOUNT_LOCKED",
          "SPONSOR_LOCK",
          "PAYMENT_TEST_MODE_STAFF_ONLY",
          "PAYMENT_AMOUNT_BELOW_FEES",
          "INSUFFICIENT_XP",
          "INSUFFICIENT_DEPOSITS",
          "NOT_ENOUGH_WAGERED_WITHDRAW",
          "DISABLED",
          "PAYMENT_PROVIDER_UNCONFIGURED",
        ].includes(result?.error)
      )
        setSubmitted(null);
      if (result?.error === "KYC") props.setKYC?.(true);
      setError(humanError(result?.error));
      return;
    }
    setCreated(result.payment);
    setParams({ payment: result.payment.id, checkout: null });
    refreshPayment();
    refreshHistory();
  }
  async function refreshStatus() {
    if (busy() || !current()) return;
    setBusy(true);
    setError("");
    if (!withdrawal() && !manualPayment() && !["completed", "disputed"].includes(current().status)) {
      const result = await authedAPI("/trading/providers/payments/" + current().id + "/reconcile", "POST", "{}", false, 30000);
      if (!result?.success) setError(humanError(result?.error));
    }
    await Promise.all([refreshPayment(), refreshHistory()]);
    setBusy(false);
  }
  async function capture() {
    if (busy() || !current()) return;
    setBusy(true);
    setError("");
    const result = await authedAPI(
      "/trading/providers/paypal/payments/" + current().id + "/capture",
      "POST",
      "{}",
      false,
      30000,
    );
    setBusy(false);
    if (!result?.success) setError(humanError(result?.error));
    refreshPayment();
    refreshHistory();
  }
  async function connect() {
    setBusy(true);
    setError("");
    const result = await authedAPI(
      "/trading/providers/stripe/connect",
      "POST",
      "{}",
      false,
      30000,
    );
    setBusy(false);
    const url = checkoutUrl(result?.url, "stripe");
    if (url) window.location.assign(url);
    else setError(humanError(result?.error));
  }
  async function copyPayment(value) {
    try { await navigator.clipboard.writeText(String(value)); }
    catch { setError("Copy is unavailable. Select and copy the payment details below."); }
  }
  function reset() {
    setCreated(null);
    setSubmitted(null);
    setError("");
    setParams({ payment: null, checkout: null });
  }
  return (
    <div class="wallet-provider">
      <Show
        when={!catalog.loading}
        fallback={
          <div class="wallet-loading">Checking payment availability…</div>
        }
      >
        <Show
          when={ready() || current()}
          fallback={
            <div class="wallet-notice">
              <strong>
                {providerName()} {withdrawal() ? "withdrawals" : "deposits"} are
                currently unavailable
              </strong>
              <p>{humanError(catalog()?.error || settings()?.reason || (catalog() ? "PAYMENT_TEST_MODE_STAFF_ONLY" : "PAYMENT_SERVICE_UNAVAILABLE"))}</p>
              <button class="wallet-button" onClick={refreshCatalog}>
                Check again
              </button>
            </div>
          }
        >
          <Show when={(current()?.mode || info()?.mode) === "sandbox"}>
            <div class="wallet-network-note">
              Test mode · Staff only. These payments do not change your balance.
            </div>
          </Show>
          <Show when={!current() && emailDeposit()}>
            <p class="wallet-caption">Create a deposit to see the receiving PayPal email and payment reference. Coins are added after staff verifies receipt.</p>
          </Show>
          <Show when={!current() && props.provider === "applepay"}>
            <p class="wallet-caption">
              Apple Pay appears in checkout on eligible devices. You can also
              use the card checkout fallback.
            </p>
          </Show>
          <Show when={!current() && props.provider === "cashapp"}>
            <p class="wallet-caption">
              Continue to Cash App Pay to approve the payment in the app or scan
              its QR code.
            </p>
          </Show>
          <Show
            when={current()}
            fallback={
              <form
                id={
                  withdrawal()
                    ? "provider-withdraw-form"
                    : "provider-deposit-form"
                }
                onSubmit={submit}
              >
                <label class="wallet-label" for="provider-coins">Conversion</label>
                <div class="wallet-card-conversion">
                  <div class="wallet-card-field input-shell">
                    <img src="/assets/chips/chip-green-clover.png" alt="" />
                    <input id="provider-coins" type="number" inputMode="decimal"
                      aria-label={withdrawal() ? "Coins to withdraw" : "Coins to receive"}
                      min="0.01" max="1000000" step="0.01" required
                      disabled={!!submitted()} value={amount()} onInput={edit} />
                  </div>
                  <span class="wallet-conversion-arrow" aria-hidden="true">⇄</span>
                  <div class="wallet-card-field input-shell">
                    <span aria-hidden="true">$</span>
                    <input type="number" inputMode="decimal" aria-label={withdrawal() ? "Withdrawal value (USD)" : "Deposit value (USD)"}
                      min="0.01" max="1000000" step="0.01" required
                      disabled={!!submitted()} value={Number.isFinite(cents()) ? (cents() / 100).toFixed(2) : ""}
                      onInput={(e) => {
                        const value = Number(e.currentTarget.value);
                        setAmount(e.currentTarget.value && rate() > 0 ? (value / rate()).toFixed(2) : "");
                        setError("");
                      }} />
                  </div>
                </div>
                <p class="wallet-caption wallet-limits">
                  ${money(settings()?.min)}–${money(settings()?.max)} USD per {withdrawal() ? "withdrawal" : "deposit"}
                </p>
                <Show when={withdrawal() && props.provider === "paypal"}>
                  <label class="wallet-label" for="provider-recipient">
                    Your PayPal email
                  </label>
                  <input
                    id="provider-recipient"
                    class="wallet-input"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength="127"
                    disabled={!!submitted()}
                    value={receiver()}
                    onInput={(e) => setReceiver(e.currentTarget.value)}
                  />
                </Show>
                <Show
                  when={
                    withdrawal() &&
                    props.provider === "stripe" &&
                    !account()?.ready
                  }
                >
                  <div class="wallet-notice">
                    <strong>Set up your payout account</strong>
                    <p>
                      Complete Stripe’s account verification to receive
                      transfers.
                    </p>
                    <button
                      class="wallet-button"
                      type="button"
                      disabled={busy()}
                      onClick={connect}
                    >
                      Connect Stripe account
                    </button>
                    <button
                      class="wallet-text-button"
                      type="button"
                      onClick={refreshAccount}
                    >
                      Check account status
                    </button>
                  </div>
                </Show>
                <span class="wallet-label">{withdrawal() ? "You receive" : "What You Pay"}</span>
                <div class="wallet-card-total">
                  <span aria-hidden="true">$</span>
                  <strong>{money(total() / 100)}<Show when={fee() > 0}><small> ({money(fee() / 100)} {withdrawal() ? "withdrawal" : "processing"} fee)</small></Show></strong>
                </div>
                <p class="wallet-checkout-note">
                  {withdrawal()
                    ? props.provider === "stripe"
                      ? "Transfers go to your verified Stripe account. Stripe manages its bank payout schedule."
                      : "Your withdrawal is reviewed by the cashier, then sent to your PayPal account."
                    : "The total amount shown above is an estimate. The final amount may vary due to currency exchange rate fluctuations."}
                </p>
                <DepositAction mount={props.actionMount}>
                  <button
                    class="wallet-button primary"
                    form={
                      withdrawal()
                        ? "provider-withdraw-form"
                        : "provider-deposit-form"
                    }
                    aria-label={withdrawal() ? "Request withdrawal" : submitted() ? "Retry same request" : "Buy " + money(amount()) + " coins with " + providerName()}
                    disabled={
                      busy() ||
                      !valid() ||
                      (withdrawal() &&
                        props.provider === "stripe" &&
                        !account()?.ready)
                    }
                  >
                    {busy()
                      ? "Processing…"
                      : submitted()
                        ? "Retry same request"
                        : withdrawal()
                          ? "Request withdrawal"
                          : <><span>Buy</span><img src="/assets/chips/chip-green-clover.png" alt="coins" /><span>{money(amount())}</span></>}
                  </button>
                </DepositAction>
              </form>
            }
          >
            <div class="wallet-provider-status" role="status">
              <span class="wallet-label">Payment #{current()?.id}</span>
              <h3>
                {
                  {
                    creating: "Creating payment",
                    awaiting_payment: manualPayment() ? "Awaiting PayPal payment / approval" : "Awaiting payment",
                    queued: "Withdrawal awaiting review",
                    sending: "Withdrawal processing",
                    unknown: "Payment being checked",
                    completed: withdrawal()
                      ? "Withdrawal completed"
                      : "Payment confirmed",
                    cancelled: withdrawal() ? "Withdrawal cancelled" : "Deposit cancelled",
                    failed: "Payment unsuccessful",
                    disputed: "Payment under review",
                  }[current()?.status]
                }
              </h3>
              <div class="wallet-estimate">
                <span>{withdrawal() ? "Withdrawal" : "Deposit"}</span>
                <strong>{money(current()?.coins)} coins</strong>
              </div>
              <p class="wallet-caption">
                {current()?.mode === "sandbox"
                  ? "Test payment — your balance is unchanged."
                  : current()?.status === "completed"
                    ? withdrawal()
                      ? "Your transfer has been confirmed by the provider."
                      : "Your coins have been added to your balance."
                    : withdrawal()
                      ? "Your coins remain reserved while this withdrawal is reviewed or processed."
                      : manualPayment()
                        ? current()?.status === "cancelled"
                          ? "This deposit was closed without crediting coins. Contact support if you already sent a payment."
                          : "Send the payment using the details below. Staff will check receipt in PayPal and approve your coins."
                        : "Complete payment and wait for the provider’s confirmation."}
              </p>
              <button
                class="wallet-text-button"
                disabled={busy() || saved.loading}
                onClick={() => refreshStatus()}
              >
                Refresh payment status
              </button>
            </div>
            <Show when={manualPayment() && current()?.status === "awaiting_payment"}>
              <div class="wallet-paypal-instructions">
                <label class="wallet-label">Send to this PayPal email</label>
                <div class="wallet-payment-copy">
                  <strong>{current()?.receiver}</strong>
                  <button class="wallet-text-button" aria-label="Copy receiving PayPal email" onClick={() => copyPayment(current()?.receiver)}>Copy</button>
                </div>
                <span class="wallet-label">Amount to send (USD)</span>
                <div class="wallet-card-total"><span>$</span><strong>{money(current()?.fiatCents / 100)}</strong></div>
                <label class="wallet-label">Include this payment reference</label>
                <div class="wallet-payment-copy">
                  <code>{current()?.requestId}</code>
                  <button class="wallet-text-button" aria-label="Copy payment reference" onClick={() => copyPayment(current()?.requestId)}>Copy</button>
                </div>
                <p class="wallet-checkout-note">Send the exact USD amount to this email and include the reference in your payment note. Keep your PayPal receipt. Refresh the status here after staff approves your deposit.</p>
              </div>
              <DepositAction mount={props.actionMount}>
                <a class="wallet-button primary" target="_blank" rel="noopener noreferrer"
                  href={current()?.mode === "sandbox" ? "https://www.sandbox.paypal.com/myaccount/transfer/homepage" : "https://www.paypal.com/myaccount/transfer/homepage"}>
                  Open {current()?.mode === "sandbox" ? "PayPal sandbox" : "PayPal"} ↗
                </a>
              </DepositAction>
            </Show>
            <Show
              when={
                !withdrawal() &&
                !manualPayment() &&
                checkoutUrl(current()?.checkoutUrl, props.provider) &&
                !["completed", "failed", "disputed"].includes(current()?.status)
              }
            >
              <DepositAction mount={props.actionMount}>
                <a
                  class="wallet-button primary"
                  href={checkoutUrl(current()?.checkoutUrl, props.provider)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open {providerName()} checkout ↗
                </a>
              </DepositAction>
            </Show>
            <Show
              when={
                props.provider === "paypal" &&
                !withdrawal() &&
                !manualPayment() &&
                current()?.providerRef &&
                !["completed", "disputed"].includes(current()?.status)
              }
            >
              <button class="wallet-button" disabled={busy()} onClick={capture}>
                {busy() ? "Checking payment…" : "Confirm PayPal payment"}
              </button>
            </Show>
            <Show
              when={["completed", "failed", "cancelled"].includes(
                current()?.status,
              )}
            >
              <button class="wallet-button" onClick={reset}>
                Start another {withdrawal() ? "withdrawal" : "deposit"}
              </button>
            </Show>
          </Show>
        </Show>
      </Show>
      <Show when={error()}>
        <p class="wallet-error" role="alert">
          {error()}
        </p>
      </Show>
      <details class="wallet-history">
        <summary>
          Recent {providerName()} {withdrawal() ? "withdrawals" : "deposits"}
        </summary>
        <Show
          when={!history.loading}
          fallback={<div class="wallet-loading">Loading payments…</div>}
        >
          <Show
            when={!history()?.error}
            fallback={
              <p class="wallet-error">Payment history is unavailable.</p>
            }
          >
            <For
              each={history()?.data?.filter(
                (row) =>
                  row.provider === props.provider &&
                  row.type === (withdrawal() ? "withdrawal" : "deposit"),
              )}
            >
              {(row) => (
                <div class="wallet-history-row">
                  <div>
                    <strong>{money(row.coins)} coins</strong>
                    <span>
                      #{row.id} ·{" "}
                      {row.mode === "sandbox"
                        ? "Test"
                        : new Date(row.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    class="wallet-text-button"
                    onClick={() => setParams({ payment: row.id })}
                  >
                    {row.status.replaceAll("_", " ")}
                  </button>
                </div>
              )}
            </For>
            <Show
              when={
                !history()?.data?.some(
                  (row) =>
                    row.provider === props.provider &&
                    row.type === (withdrawal() ? "withdrawal" : "deposit"),
                )
              }
            >
              <p class="wallet-caption">No payments yet.</p>
            </Show>
          </Show>
        </Show>
        <button class="wallet-text-button" onClick={refreshHistory}>
          Refresh history
        </button>
      </details>
    </div>
  );
}
