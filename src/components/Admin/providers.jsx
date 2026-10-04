import {
  createResource,
  createSignal,
  For,
  Show,
  Switch,
  Match,
} from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { authedAPI, createNotification } from "../../util/api";
import {
  PageHeader,
  Badge,
  Empty,
  Failure,
  Skeleton,
  Modal,
  money,
  date,
  explain,
} from "./system";
import { useCashierList, Pager } from "../Cashier/shared";
import "./providers.css";
const apiPath = "/admin/cashier/providers";
const labels = {
  email: "Receiving PayPal email",
  clientId: "Client ID",
  clientSecret: "Client secret",
  webhookId: "Webhook ID",
  merchantId: "Merchant ID",
  secretKey: "Secret API key",
  webhookSecret: "Webhook secret",
  apiKey: "API key",
  apiSecret: "API secret",
  ipnSecret: "IPN secret",
  partnerId: "Partner ID",
};

function credentialFields(provider, settings) {
  return provider.credentials.filter(field => provider.id !== "paypal" ||
    (field.key === "email" ? settings.depositFlow === "email" : settings.depositFlow !== "email" || settings.withdrawalsEnabled));
}
function ProviderEditor(props) {
  const p = props.provider;
  const [settings, setSettings] = createSignal({ ...p.settings }),
    [credentials, setCredentials] = createSignal({}),
    [cleared, setCleared] = createSignal([]),
    [reason, setReason] = createSignal(""),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [submitted, setSubmitted] = createSignal(null);
  const set = (key, value) =>
    setSettings((current) => ({ ...current, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (busy()) return;
    const visibleFields = credentialFields(p, settings()).map(field => field.key);
    const body = submitted() || {
      requestId: crypto.randomUUID(),
      reason: reason().trim(),
      version: p.version,
      settings: settings(),
      credentials: Object.fromEntries(Object.entries(credentials()).filter(([key]) => visibleFields.includes(key))),
      clearSecrets: cleared().filter(key => visibleFields.includes(key)),
    };
    setSubmitted(body);
    setBusy(true);
    setError("");
    const response = await authedAPI(
      apiPath + "/" + p.id,
      "PUT",
      JSON.stringify(body),
      false,
      30000,
    );
    setBusy(false);
    if (!response?.success) {
      setError(response?.error || "PAYMENT_SERVICE_UNAVAILABLE");
      // Keep the same request only when its outcome may be unknown.
      if (response?.error && !["SERVER_ERROR", "PAYMENT_SERVICE_UNAVAILABLE"].includes(response.error))
        setSubmitted(null);
      return;
    }
    setCredentials({});
    props.saved();
    createNotification("success", p.name + " settings saved.");
  }
  return (
    <Modal
      title={p.name + " configuration"}
      eyebrow="PAYMENT PROVIDERS"
      wide
      busy={busy()}
      close={props.close}
    >
      <form class="adm-form" onSubmit={save}>
        <Show when={p.policy}>
          <div class="adm-notice">{p.policy}</div>
        </Show>
        <div class="provider-form-grid">
          <label class="adm-field">
            Environment
            <select
              class="adm-select"
              aria-label="Environment"
              value={settings().mode}
              disabled={!!submitted()}
              onChange={(e) => {
                set("mode", e.currentTarget.value);
                setCredentials({});
                setCleared([]);
              }}
            >
              <For each={p.modes}>
                {(mode) => (
                  <option value={mode}>
                    {mode === "sandbox" ? "Sandbox / test" : "Live"}
                  </option>
                )}
              </For>
            </select>
          </label>
          <div class="provider-switches">
            <label>
              <input
                type="checkbox"
                checked={settings().depositsEnabled}
                disabled={!p.deposits.supported || !!submitted()}
                onChange={(e) =>
                  set("depositsEnabled", e.currentTarget.checked)
                }
              />
              Allow deposits
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings().withdrawalsEnabled}
                disabled={!p.withdrawals.supported || !!submitted()}
                onChange={(e) =>
                  set("withdrawalsEnabled", e.currentTarget.checked)
                }
              />
              Allow withdrawals
            </label>
          </div>
        </div>
        <Show when={p.id === "paypal"}>
          <label class="adm-field">
            Deposit flow
            <select class="adm-select" aria-label="Deposit flow" disabled={!!submitted()}
              value={settings().depositFlow} onChange={e => set("depositFlow", e.currentTarget.value)}>
              <option value="email">Email + manual approval</option>
              <option value="api">Automatic API checkout</option>
            </select>
          </label>
          <Show when={settings().depositFlow === "email"}>
            <div class="adm-notice">Enter the receiving PayPal email below. Staff must confirm receipt in PayPal before approving a deposit. Changing this email applies to new deposits; existing requests keep their saved receiving email.</div>
            <Show when={settings().withdrawalsEnabled}>
              <div class="adm-notice">PayPal withdrawals use the API and require the additional credentials below.</div>
            </Show>
          </Show>
        </Show>
        <Show when={p.integrated}>
          <div class="adm-notice">
            Test payments are available to staff only and never change player
            balances.{" "}
            <Show when={p.withdrawals.supported}>
              Live withdrawals require cashier approval before money is sent.
            </Show>
          </div>
          <Show when={p.id !== "paypal" || settings().depositFlow !== "email" || settings().withdrawalsEnabled}>
          <div class="provider-form-grid">
            <For each={[["apiOrigin", "Public API origin"], ["frontendOrigin", "Public frontend origin"]]}>
              {([key, label]) => (
                <label class="adm-field">
                  {label}
                  <input class="adm-input" type="url" aria-label={label}
                    maxLength="2048" placeholder="https://your-domain.com"
                    disabled={!!submitted()} value={settings()[key] || ""}
                    onInput={(e) => set(key, e.currentTarget.value)} />
                  <small>Optional override for checkout and onboarding returns.</small>
                </label>
              )}
            </For>
          </div>
          </Show>
          <div class="provider-form-grid">
            <For
              each={[
                ["minDeposit", "Minimum deposit (USD)"],
                ["maxDeposit", "Maximum deposit (USD)"],
                ["depositPercent", "Deposit fee (%)"],
                ["depositFixed", "Deposit fixed fee (USD)"],
                ["minWithdrawal", "Minimum withdrawal (USD)"],
                ["maxWithdrawal", "Maximum withdrawal (USD)"],
                ["withdrawalPercent", "Withdrawal fee (%)"],
                ["withdrawalFixed", "Withdrawal fixed fee (USD)"],
              ].filter(
                ([key]) =>
                  !key.toLowerCase().includes("withdrawal") ||
                  p.withdrawals.supported,
              )}
            >
              {([key, label]) => (
                <label class="adm-field">
                  {label}
                  <input
                    class="adm-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max={key.includes("Percent") ? "25" : "1000000"}
                    required
                    disabled={!!submitted()}
                    value={settings()[key]}
                    onInput={(e) =>
                      set(
                        key,
                        e.currentTarget.value === ""
                          ? ""
                          : Number(e.currentTarget.value),
                      )
                    }
                  />
                </label>
              )}
            </For>
          </div>
          <Show when={p.id === "paypal" && (settings().depositFlow !== "email" || settings().withdrawalsEnabled)}>
            <label class="adm-field">
              PayPal merchant reference (optional)
              <textarea
                class="adm-input"
                maxLength="500"
                disabled={!!submitted()}
                placeholder="Your approval or merchant onboarding reference"
                value={settings().merchantApproval}
                onInput={(e) => set("merchantApproval", e.currentTarget.value)}
              />
            </label>
          </Show>
          <Show when={p.id === "stripe"}>
            <label class="adm-field">
              Connect account country
              <input
                class="adm-input"
                maxLength="2"
                pattern="[A-Z]{2}"
                disabled={!!submitted()}
                value={settings().connectCountry}
                onInput={(e) =>
                  set("connectCountry", e.currentTarget.value.toUpperCase())
                }
              />
            </label>
          </Show>
        </Show>
        <Show when={p.credentials.length}>
          <h3>
            Credentials for{" "}
            {settings().mode === "sandbox" ? "test mode" : "live mode"}
          </h3>
          <Show when={p.canStoreSecrets}>
            <div class="adm-notice">Credentials are encrypted and saved in admin. Leave a field blank to keep its existing value.</div>
          </Show>
          <Show when={!p.canStoreSecrets}>
            <div class="adm-notice">
              Credential storage is unavailable because the server application
              secret is missing or invalid.
            </div>
          </Show>
          <div class="provider-form-grid">
            <For each={credentialFields(p, settings())}>
              {(field) => (
                <label class="adm-field">
                  {labels[field.key] || field.key}
                  <input
                    class="adm-input"
                    aria-label={labels[field.key] || field.key}
                    type={field.key === "email" ? "email" : "password"}
                    autoComplete={field.key === "email" ? "off" : "new-password"}
                    spellcheck={false}
                    maxLength={field.key === "email" ? "254" : "4096"}
                    disabled={
                      !p.canStoreSecrets ||
                      !!submitted() ||
                      cleared().includes(field.key)
                    }
                    placeholder={
                      settings().mode === p.settings.mode && field.configured
                        ? "Configured — leave blank to keep"
                        : "Enter credential"
                    }
                    value={credentials()[field.key] || ""}
                    onInput={(e) =>
                      setCredentials((current) => ({
                        ...current,
                        [field.key]: e.currentTarget.value,
                      }))
                    }
                  />
                  <small>
                    {field.env} ·{" "}
                    {settings().mode === p.settings.mode
                      ? field.source
                      : "separate environment"}
                  </small>
                  <Show when={field.key === "secretKey"}>
                    <small>Use a secret (sk_) or restricted (rk_) key for the selected mode. Publishable pk_ keys cannot create checkout.</small>
                  </Show>
                  <Show
                    when={
                      field.source === "admin" &&
                      settings().mode === p.settings.mode
                    }
                  >
                    <span class="provider-clear">
                      <input
                        type="checkbox"
                        disabled={!!submitted()}
                        checked={cleared().includes(field.key)}
                        onChange={(e) =>
                          setCleared((current) =>
                            e.currentTarget.checked
                              ? [...current, field.key]
                              : current.filter((key) => key !== field.key),
                          )
                        }
                      />
                      Remove stored credential (environment fallback applies)
                    </span>
                  </Show>
                </label>
              )}
            </For>
          </div>
        </Show>
        <Show when={p.callbackPath && (p.id !== "paypal" || settings().depositFlow !== "email" || settings().withdrawalsEnabled)}>
          <label class="adm-field">
            Webhook endpoint
            <code class="provider-endpoint">
              {settings().apiOrigin || ""}{p.callbackPath}
              {p.id === "paypal" ? "?mode=" + settings().mode : ""}
            </code>
          </label>
          <p class="provider-caption">
            Configure this endpoint on your API domain in the provider
            dashboard. Retain credentials while outstanding payments settle.
          </p>
        </Show>
        <label class="adm-field">
          Reason for change
          <textarea
            class="adm-input"
            required
            minLength="5"
            maxLength="500"
            disabled={!!submitted()}
            value={reason()}
            onInput={(e) => setReason(e.currentTarget.value)}
          />
        </label>
        <Show when={error()}>
          <Failure error={error()} />
          <p class="provider-caption">
            {error() === "CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS"
              ? "Open payments still need these API credentials. Review or reconcile them in the cashier before changing keys." + (p.id === "paypal" ? " You can update the receiving PayPal email separately." : "")
              : submitted() ? "Retry uses the same request until its outcome is known."
              : "Correct the fields and save again. Close and reload settings if another admin changed this provider."}
          </p>
        </Show>
        <div class="adm-actions">
          <button
            class="adm-button"
            type="button"
            disabled={busy()}
            onClick={props.close}
          >
            Cancel
          </button>
          <button class="adm-button primary" disabled={busy()}>
            {busy() ? "Saving…" : submitted() ? "Retry save" : "Save provider"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Providers() {
  const [data, { refetch }] = createResource(() => authedAPI(apiPath, "GET")),
    [editor, setEditor] = createSignal(null),
    [checking, setChecking] = createSignal(null),
    [checks, setChecks] = createSignal({});
  async function check(p) {
    setChecking(p.id);
    const result = await authedAPI(
      apiPath + "/" + p.id + "/check",
      "POST",
      "{}",
      false,
      30000,
    );
    setChecking(null);
    setChecks((current) => ({
      ...current,
      [p.id]: result?.success
        ? result.localOnly
          ? "Credentials checked locally"
          : "Provider connection verified"
        : explain(result?.error),
    }));
  }
  return (
    <>
      <PageHeader
        eyebrow="CASHIER / PROVIDERS"
        title="Payment providers"
        description="Manage payment availability, credentials and checkout rules."
      >
        <button class="adm-button" disabled={data.loading} onClick={refetch}>
          Refresh
        </button>
      </PageHeader>
      <Show when={!data.loading} fallback={<Skeleton />}>
        <Show
          when={!data()?.error && data()?.providers}
          fallback={<Failure error={data()?.error} retry={refetch} />}
        >
          <div class="provider-grid">
            <For each={data().providers}>
              {(p) => (
                <article class="adm-panel provider-card">
                  <header>
                    <div>
                      <span class="adm-eyebrow">
                        {p.settings.mode === "sandbox"
                          ? "TEST ENVIRONMENT"
                          : "LIVE ENVIRONMENT"}
                      </span>
                      <h2>{p.name}</h2>
                    </div>
                    <Badge value={p.settings.mode} />
                  </header>
                  <div class="provider-directions">
                    <For each={["deposits", "withdrawals"]}>
                      {(direction) => (
                        <div>
                          <span>
                            {direction === "deposits"
                              ? "Deposits"
                              : "Withdrawals"}
                          </span>
                          <Badge
                            value={
                              !p[direction].supported
                                ? "unsupported"
                                : p[direction].available
                                  ? "enabled"
                                  : "disabled"
                            }
                          />
                          <small>
                            {p[direction].supported && !p[direction].available
                              ? explain(p[direction].reason)
                              : p[direction].supported
                                ? "Ready for new requests"
                                : "Not offered by this integration"}
                          </small>
                        </div>
                      )}
                    </For>
                  </div>
                  <Show when={p.policy}>
                    <p class="provider-policy">{p.policy}</p>
                  </Show>
                  <div class="provider-credentials-summary">
                    {credentialFields(p, p.settings).filter((field) => field.configured).length} /{" "}
                    {credentialFields(p, p.settings).length} credentials configured
                  </div>
                  <Show when={checks()[p.id]}>
                    <p class="provider-check" role="status">
                      {checks()[p.id]}
                    </p>
                  </Show>
                  <footer>
                    <button
                      class="adm-button"
                      disabled={!!checking()}
                      onClick={() => check(p)}
                    >
                      {checking() === p.id
                        ? "Checking…"
                        : p.integrated && !(p.id === "paypal" && p.settings.depositFlow === "email" && !p.settings.withdrawalsEnabled)
                          ? "Check connection"
                          : "Check configuration"}
                    </button>
                    <button
                      class="adm-button primary"
                      onClick={() => setEditor(p)}
                    >
                      Configure {p.name}
                    </button>
                  </footer>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={editor()} keyed>
        {(p) => (
          <ProviderEditor
            provider={p}
            close={() => setEditor(null)}
            saved={() => {
              setEditor(null);
              refetch();
            }}
          />
        )}
      </Show>
    </>
  );
}
function Payments() {
  const [provider, setProvider] = createSignal(""),
    [type, setType] = createSignal(""),
    [mode, setMode] = createSignal(""),
    [dialog, setDialog] = createSignal(null),
    [reason, setReason] = createSignal(""),
    [transactionRef, setTransactionRef] = createSignal(""),
    [confirmedReceived, setConfirmedReceived] = createSignal(false),
    [error, setError] = createSignal(""),
    [submitted, setSubmitted] = createSignal(null),
    [busy, setBusy] = createSignal(false);
  const list = useCashierList(apiPath + "/transactions", () => ({
    provider: provider(),
    type: type(),
    mode: mode(),
  }));
  function open(row, action) {
    setDialog({ row, action, requestId: crypto.randomUUID() });
    setSubmitted(null);
    setReason("");
    setTransactionRef("");
    setConfirmedReceived(false);
    setError("");
  }
  async function submit(e) {
    e.preventDefault();
    if (busy()) return;
    const d = dialog();
    const body = submitted() || {
      requestId: d.requestId,
      reason: reason().trim(),
      ...(d.action === "approve-email" ? { transactionRef: transactionRef().trim().toUpperCase(), confirmedReceived: confirmedReceived() } : {}),
    };
    setSubmitted(body);
    setBusy(true);
    setError("");
    const result = await authedAPI(
      apiPath + "/transactions/" + d.row.id + "/" + d.action,
      "POST",
      JSON.stringify(body),
      false,
      30000,
    );
    setBusy(false);
    list.refetch();
    if (!result?.success) {
      setError(result?.error || "PAYMENT_SERVICE_UNAVAILABLE");
      if (result?.error && !["SERVER_ERROR", "PAYMENT_SERVICE_UNAVAILABLE"].includes(result.error)) setSubmitted(null);
      return;
    }
    setDialog(null);
    createNotification("success", "Payment action recorded.");
  }
  return (
    <>
      <PageHeader
        eyebrow="CASHIER / PAYMENTS"
        title="Payment transactions"
        description="Review deposits across payment providers, approve supported payouts and reconcile uncertain transfers."
      >
        <button class="adm-button" onClick={list.refetch}>
          Refresh
        </button>
      </PageHeader>
      <form class="adm-filterbar provider-filters" onSubmit={list.search}>
        <label class="adm-field">
          Search
          <input
            class="adm-input"
            placeholder="Player, reference or user ID"
            value={list.draft()}
            onInput={(e) => list.setDraft(e.currentTarget.value)}
          />
        </label>
        <label class="adm-field">
          Provider
          <select
            class="adm-select"
            value={provider()}
            onChange={(e) => {
              setProvider(e.currentTarget.value);
              list.setPage(1);
            }}
          >
            <option value="">All providers</option>
            <option value="paypal">PayPal</option>
            <option value="stripe">Stripe</option>
            <option value="applepay">Apple Pay</option>
            <option value="cashapp">Cash App Pay</option>
          </select>
        </label>
        <label class="adm-field">
          Type
          <select
            class="adm-select"
            value={type()}
            onChange={(e) => {
              setType(e.currentTarget.value);
              list.setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </label>
        <label class="adm-field">
          Environment
          <select
            class="adm-select"
            value={mode()}
            onChange={(e) => {
              setMode(e.currentTarget.value);
              list.setPage(1);
            }}
          >
            <option value="">All environments</option>
            <option value="live">Live</option>
            <option value="sandbox">Test</option>
          </select>
        </label>
        <label class="adm-field">
          Status
          <select
            class="adm-select"
            value={list.status()}
            onChange={(e) => list.setStatus(e.currentTarget.value)}
          >
            <option value="">All statuses</option>
            <For
              each={[
                "queued",
                "awaiting_payment",
                "sending",
                "unknown",
                "completed",
                "failed",
                "cancelled",
                "disputed",
              ]}
            >
              {(status) => (
                <option value={status}>{status.replaceAll("_", " ")}</option>
              )}
            </For>
          </select>
        </label>
        <button class="adm-button">Search</button>
      </form>
      <Show when={list.data()} fallback={<Skeleton />}>
        <Show
          when={!list.data()?.error}
          fallback={<Failure error={list.data()?.error} retry={list.refetch} />}
        >
          <section class="adm-panel">
            <Show
              when={list.data()?.data?.length}
              fallback={
                <Empty title="No payments found">
                  Adjust your filters or wait for a new payment.
                </Empty>
              }
            >
              <div class="adm-table-scroll">
                <table class="adm-table">
                  <thead>
                    <tr>
                      <th>Player / reference</th>
                      <th>Provider</th>
                      <th>Type</th>
                      <th>Coins</th>
                      <th>USD / fee</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list.data().data}>
                      {(row) => (
                        <tr>
                          <td>
                            <strong>{row.username}</strong>
                            <small class="provider-reference">
                              #{row.id} · {row.providerRef || row.requestId}
                            </small>
                            <Show when={row.lastError}>
                              <small class="provider-reference">
                                {explain(row.lastError)}
                              </small>
                            </Show>
                          </td>
                          <td>
                            {row.provider}
                            <small class="provider-reference">
                              {row.mode === "sandbox"
                                ? "Test — no balance changes"
                                : "Live"}
                            </small>
                          </td>
                          <td>{row.type}</td>
                          <td>{money(row.coins)}</td>
                          <td>
                            ${money(row.fiatCents / 100)}
                            <small class="provider-reference">
                              Fee ${money(row.feeCents / 100)}
                            </small>
                          </td>
                          <td>
                            <Badge value={row.status} />
                          </td>
                          <td>{date(row.createdAt)}</td>
                          <td>
                            <div class="adm-actions">
                              <Show when={row.provider === "paypal" && row.flow === "email" && row.type === "deposit" && row.status === "awaiting_payment" && !row.settled}>
                                <button class="adm-button primary" onClick={() => open(row, "approve-email")}>Approve deposit</button>
                                <button class="adm-button danger" onClick={() => open(row, "reject-email")}>Reject deposit</button>
                              </Show>
                              <Show
                                when={
                                  row.type === "withdrawal" &&
                                  row.status === "queued"
                                }
                              >
                                <button
                                  class="adm-button primary"
                                  onClick={() => open(row, "accept")}
                                >
                                  Approve
                                </button>
                                <button
                                  class="adm-button danger"
                                  onClick={() => open(row, "deny")}
                                >
                                  Deny
                                </button>
                              </Show>
                              <Show
                                when={
                                  (row.flow !== "email" && row.providerRef &&
                                    row.type === "deposit" &&
                                    !["completed", "disputed"].includes(
                                      row.status,
                                    )) ||
                                  (row.type === "withdrawal" &&
                                    ["sending", "unknown"].includes(row.status))
                                }
                              >
                                <button
                                  class="adm-button"
                                  onClick={() => open(row, "reconcile")}
                                >
                                  Reconcile
                                </button>
                              </Show>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
            <Pager list={list} />
          </section>
        </Show>
      </Show>
      <Show when={dialog()}>
        <Modal
          title={
            {
              accept: "Approve withdrawal",
              deny: "Deny withdrawal",
              reconcile: "Reconcile payment",
              "approve-email": "Approve PayPal deposit",
              "reject-email": "Reject PayPal deposit",
            }[dialog().action]
          }
          busy={busy()}
          close={() => setDialog(null)}
        >
          <form class="adm-form" onSubmit={submit}>
            <p>
              {dialog().row.username} · {money(dialog().row.coins)} coins · $
              {money(dialog().row.fiatCents / 100)} USD
            </p>
            <Show when={dialog().row.receiver}>
              <p>Recipient: {dialog().row.receiver}</p>
            </Show>
            <Show when={dialog().row.flow === "email"}>
              <p class="provider-reference">Payment reference: {dialog().row.requestId}</p>
            </Show>
            <div class="adm-notice">
              {dialog().action === "approve-email"
                ? "Check the received PayPal transaction, receiving email, USD amount and payment reference. Approval credits this deposit once."
                : dialog().action === "reject-email"
                  ? "This closes an unapproved deposit. No coins have been credited or reserved."
                  : dialog().action === "accept"
                ? "This sends the reserved withdrawal to the saved recipient."
                : dialog().action === "deny"
                  ? "This cancels a queued withdrawal and releases its reserved funds."
                  : "This checks the original payment with the provider. An uncertain response keeps funds reserved."}
            </div>
            <Show when={dialog().action === "approve-email"}>
              <label class="adm-field">
                PayPal transaction ID
                <input class="adm-input" aria-label="PayPal transaction ID" required pattern="[A-Za-z0-9]{8,64}"
                  minLength="8" maxLength="64" disabled={busy() || !!submitted()}
                  value={transactionRef()} onInput={e => setTransactionRef(e.currentTarget.value)} />
              </label>
              <label class="provider-receipt-confirm">
                <input type="checkbox" required checked={confirmedReceived()} disabled={busy() || !!submitted()}
                  onChange={e => setConfirmedReceived(e.currentTarget.checked)} />
                I confirmed this payment in PayPal, including the amount and receiving email.
              </label>
            </Show>
            <label class="adm-field">
              Reason
              <textarea
                class="adm-input"
                required
                minLength="5"
                maxLength="500"
                disabled={busy() || !!submitted()}
                value={reason()}
                onInput={(e) => setReason(e.currentTarget.value)}
              />
            </label>
            <Show when={error()}>
              <Failure error={error()} />
            </Show>
            <div class="adm-actions">
              <button
                type="button"
                class="adm-button"
                disabled={busy()}
                onClick={() => setDialog(null)}
              >
                Close
              </button>
              <button class="adm-button primary" disabled={busy()}>
                {busy() ? "Processing…" : "Confirm action"}
              </button>
            </div>
          </form>
        </Modal>
      </Show>
    </>
  );
}
function Audit() {
  const [data, { refetch }] = createResource(() =>
    authedAPI(apiPath + "/audit", "GET"),
  );
  return (
    <>
      <PageHeader
        title="Provider audit history"
        description="Configuration changes, approvals, denials and reconciliation attempts."
      >
        <button class="adm-button" onClick={refetch}>
          Refresh
        </button>
      </PageHeader>
      <Show when={data()} fallback={<Skeleton />}>
        <Show
          when={!data()?.error}
          fallback={<Failure error={data()?.error} retry={refetch} />}
        >
          <section class="adm-panel">
            <div class="adm-table-scroll">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Payment</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data()?.data}>
                    {(row) => (
                      <tr>
                        <td>{date(row.createdAt)}</td>
                        <td>{row.adminId}</td>
                        <td>{row.action}</td>
                        <td>{row.targetId || "—"}</td>
                        <td>{row.reason}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Show when={!data()?.data?.length}>
              <Empty title="No provider changes yet" />
            </Show>
          </section>
        </Show>
      </Show>
    </>
  );
}
export default function AdminProviders() {
  const [params, setParams] = useSearchParams();
  return (
    <>
      <div class="adm-tabs provider-subtabs">
        <For
          each={[
            ["", "Providers"],
            ["payments", "Transactions"],
            ["audit", "Provider audit"],
          ]}
        >
          {([key, label]) => (
            <button
              classList={{ active: (params.view || "") === key }}
              onClick={() => setParams({ view: key || null })}
            >
              {label}
            </button>
          )}
        </For>
      </div>
      <Switch fallback={<Providers />}>
        <Match when={params.view === "payments"}>
          <Payments />
        </Match>
        <Match when={params.view === "audit"}>
          <Audit />
        </Match>
      </Switch>
      <p class="provider-caption">
        Archived crypto, SkinDeck and gift-card transactions remain available in
        their cashier tabs.{" "}
        <A href="/admin/settings">Platform feature controls →</A>
      </p>
    </>
  );
}
