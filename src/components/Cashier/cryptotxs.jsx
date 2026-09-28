import { createSignal, For, Show } from "solid-js";
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
} from "../Admin/system";
import { useCashierList, Pager, copyCashier } from "./shared";
export default function AdminCryptoCashier() {
  const [kind, setKind] = createSignal("withdrawals"),
    list = useCashierList("/admin/cashier/crypto", () => ({ kind: kind() }));
  const [dialog, setDialog] = createSignal(null),
    [reason, setReason] = createSignal(""),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [submitted, setSubmitted] = createSignal(null);
  function open(tx, action) {
    setDialog({ tx, action, requestId: crypto.randomUUID() });
    setReason("");
    setError("");
    setSubmitted(null);
  }
  async function save(e) {
    e.preventDefault();
    if (busy()) return;
    const d = dialog(),
      body = submitted() || { requestId: d.requestId, reason: reason().trim() };
    setSubmitted(body);
    setBusy(true);
    setError("");
    const result = await authedAPI(
      "/admin/cashier/crypto/" + d.action + "/" + d.tx.id,
      "POST",
      JSON.stringify(body),
      false,
      25000,
    );
    setBusy(false);
    list.refetch();
    if (!result?.success) {
      setError(result?.error || "CASHIER_UNAVAILABLE");
      return;
    }
    setDialog(null);
    createNotification("success", "Transaction updated.");
  }
  const statuses = () =>
    kind() === "deposits"
      ? ["pending", "completed", "failed"]
      : ["pending", "sending", "sent", "completed", "failed", "cancelled"];
  return (
    <>
      <PageHeader
        eyebrow="CASHIER / CRYPTO"
        title="Crypto transactions"
        description="Review deposits, approve withdrawals, and reconcile pending transfers."
      >
        <button
          class="adm-button"
          disabled={list.data.loading}
          onClick={list.refetch}
        >
          Refresh
        </button>
      </PageHeader>
      <Show when={list.data()?.provider}>
        <div class="cashier-providers">
          <For each={["deposits", "withdrawals"]}>
            {(key) => (
              <div>
                <div>
                  <strong>
                    {key === "deposits"
                      ? "Deposit connection"
                      : "Withdrawal connection"}
                  </strong>
                  <Badge
                    value={
                      list.data().provider[key].configured ? "active" : "paused"
                    }
                  >
                    {list.data().provider[key].configured
                      ? "Configured"
                      : "Setup required"}
                  </Badge>
                </div>
                <p>
                  {list.data().provider[key].configured
                    ? "Credentials are configured. Transaction requests verify provider availability."
                    : "Missing: " +
                      list.data().provider[key].missing.join(", ")}
                </p>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="adm-tabs">
        <For each={["withdrawals", "deposits"]}>
          {(key) => (
            <button
              classList={{ active: kind() === key }}
              onClick={() => {
                setKind(key);
                list.setStatus("");
                list.setPage(1);
              }}
            >
              {key === "withdrawals" ? "Withdrawals" : "Deposits"}
            </button>
          )}
        </For>
      </div>
      <form class="adm-filterbar" onSubmit={list.search}>
        <label class="adm-field">
          Search
          <input
            class="adm-input"
            placeholder="Username, account ID or transaction hash"
            maxLength="128"
            value={list.draft()}
            onInput={(e) => list.setDraft(e.currentTarget.value)}
          />
        </label>
        <label class="adm-field">
          Status
          <select
            class="adm-select"
            value={list.status()}
            onChange={(e) => list.setStatus(e.currentTarget.value)}
          >
            <option value="">All statuses</option>
            <For each={statuses()}>
              {(status) => (
                <option value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              )}
            </For>
          </select>
        </label>
        <button class="adm-button">Search</button>
      </form>
      <Show
        when={!list.data()?.error}
        fallback={<Failure error={list.data()?.error} retry={list.refetch} />}
      >
        <Show when={list.data()} fallback={<Skeleton />}>
          <section class="adm-panel">
            <Show
              when={list.data()?.data.length}
              fallback={
                <Empty title="No transactions found">
                  Activity will appear here as payments are processed.
                </Empty>
              }
            >
              <div class="adm-table-scroll">
                <table class="adm-table">
                  <thead>
                    <tr>
                      <th>Transaction / user</th>
                      <th>Coins</th>
                      <th>Crypto / network</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list.data()?.data}>
                      {(tx) => (
                        <tr>
                          <td>
                            <strong>
                              #{tx.id} · {tx.username}
                            </strong>
                            <small>{tx.userId}</small>
                          </td>
                          <td>
                            <strong>{money(tx.coinAmount)}</strong>
                            <small>${money(tx.fiatAmount)} USD</small>
                          </td>
                          <td>
                            <strong>
                              {tx.cryptoAmount} {tx.currency}
                            </strong>
                            <small>{tx.chain || tx.currency}</small>
                          </td>
                          <td>
                            <Badge value={tx.status} />
                          </td>
                          <td>{date(tx.createdAt)}</td>
                          <td>
                            <button
                              class="adm-button"
                              onClick={() => open(tx, "inspect")}
                            >
                              View details
                            </button>
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
          title={"Transaction #" + dialog().tx.id}
          eyebrow={
            kind() === "deposits" ? "CRYPTO DEPOSIT" : "CRYPTO WITHDRAWAL"
          }
          busy={busy()}
          close={() => setDialog(null)}
        >
          <dl class="cashier-detail">
            <dt>Account</dt>
            <dd>
              {dialog().tx.username} · {dialog().tx.userId}
            </dd>
            <dt>Amount</dt>
            <dd>
              {money(dialog().tx.coinAmount)} coins / $
              {money(dialog().tx.fiatAmount)}
            </dd>
            <dt>Asset</dt>
            <dd>
              {dialog().tx.cryptoAmount} {dialog().tx.currency}
            </dd>
            <dt>Network</dt>
            <dd>{dialog().tx.chain || dialog().tx.currency}</dd>
            <dt>Status</dt>
            <dd>
              <Badge value={dialog().tx.status} />
            </dd>
            <Show when={dialog().tx.address}>
              <dt>Destination</dt>
              <dd>
                <code>{dialog().tx.address}</code>
                <button
                  class="adm-button"
                  onClick={() => copyCashier(dialog().tx.address)}
                >
                  Copy
                </button>
              </dd>
            </Show>
            <dt>Transaction hash</dt>
            <dd>
              <code>{dialog().tx.txId || "Not yet broadcast"}</code>
            </dd>
            <dt>Created</dt>
            <dd>{date(dialog().tx.createdAt)}</dd>
          </dl>
          <Show when={kind() === "withdrawals"}>
            <Show when={dialog().action === "inspect"}>
              <div class="adm-actions">
                <Show when={dialog().tx.status === "pending"}>
                  <button
                    class="adm-button danger"
                    onClick={() => open(dialog().tx, "deny")}
                  >
                    Deny & refund
                  </button>
                  <button
                    class="adm-button primary"
                    disabled={!list.data()?.provider?.withdrawals?.configured}
                    onClick={() => open(dialog().tx, "accept")}
                  >
                    Review approval
                  </button>
                </Show>
                <Show when={["sending", "sent"].includes(dialog().tx.status)}>
                  <div class="adm-notice">
                    Funds remain reserved until the provider confirms the
                    transfer. Reconciliation checks the existing payment without
                    sending again.
                  </div>
                  <button
                    class="adm-button primary"
                    onClick={() => open(dialog().tx, "reconcile")}
                  >
                    Reconcile with provider
                  </button>
                </Show>
              </div>
            </Show>
            <Show when={dialog().action !== "inspect"}>
              <form onSubmit={save}>
                <div class="adm-notice">
                  {dialog().action === "accept"
                    ? "Approving sends these funds to the destination above. Verify the asset, network, address and amount."
                    : dialog().action === "deny"
                      ? "This returns the reserved coins to the player and cancels the request."
                      : "This checks the provider status. An unknown transfer remains reserved for investigation."}
                </div>
                <label class="adm-field">
                  Reason
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
                </Show>
                <button class="adm-button primary" disabled={busy()}>
                  {busy()
                    ? "Processing…"
                    : submitted()
                      ? "Retry request"
                      : "Confirm " +
                        (dialog().action === "accept"
                          ? "approval"
                          : dialog().action === "deny"
                            ? "refund"
                            : "reconciliation")}
                </button>
              </form>
            </Show>
          </Show>
        </Modal>
      </Show>
    </>
  );
}
