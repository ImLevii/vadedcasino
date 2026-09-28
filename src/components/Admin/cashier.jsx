import { createSignal, For, Show, Switch, Match } from "solid-js";
import { useSearchParams } from "@solidjs/router";
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
} from "./system";
import AdminCryptoCashier from "../Cashier/cryptotxs";
import AdminSkinDeckCashier from "../Cashier/skindecktxs";
import {
  useCashierList,
  Pager,
  copyCashier,
  downloadCodes,
} from "../Cashier/shared";
function GiftCards() {
  const list = useCashierList("/admin/cashier/giftcards");
  const [dialog, setDialog] = createSignal(null),
    [amount, setAmount] = createSignal(25),
    [quantity, setQuantity] = createSignal(1),
    [notes, setNotes] = createSignal(""),
    [reason, setReason] = createSignal(""),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(""),
    [codes, setCodes] = createSignal([]),
    [submitted, setSubmitted] = createSignal(null);
  function open(kind, card) {
    setDialog({ kind, card, requestId: crypto.randomUUID() });
    setAmount(Number(card?.amount || 25));
    setQuantity(1);
    setNotes(card?.notes || "");
    setReason("");
    setError("");
    setSubmitted(null);
  }
  async function save(e) {
    e.preventDefault();
    if (busy()) return;
    const d = dialog();
    const body = submitted() || {
      requestId: d.requestId,
      reason: reason().trim(),
      ...(d.kind === "create"
        ? { amount: Number(amount()), quantity: Number(quantity()) }
        : d.kind === "edit"
          ? { amount: Number(amount()), notes: notes() }
          : {}),
    };
    setSubmitted(body);
    setBusy(true);
    setError("");
    const result = await authedAPI(
      d.kind === "create"
        ? "/admin/cashier/createGiftCards"
        : "/admin/cashier/giftcards/" + d.card.id,
      d.kind === "create" ? "POST" : d.kind === "edit" ? "PUT" : "DELETE",
      JSON.stringify(body),
    );
    setBusy(false);
    if (!result?.success) {
      setError(result?.error || "CASHIER_UNAVAILABLE");
      return;
    }
    if (result.codes) setCodes(result.codes);
    setDialog(null);
    list.refetch();
    createNotification(
      "success",
      d.kind === "create"
        ? "Gift cards created."
        : d.kind === "edit"
          ? "Gift card updated."
          : "Gift card revoked.",
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="CASHIER / GIFT CARDS"
        title="Gift cards"
        description="Create codes, track redemptions, and manage outstanding cards."
      >
        <button
          class="adm-button"
          disabled={list.data.loading}
          onClick={list.refetch}
        >
          Refresh
        </button>
        <button class="adm-button primary" onClick={() => open("create")}>
          + Create gift cards
        </button>
      </PageHeader>
      <Show when={codes().length}>
        <section class="adm-panel cashier-generated">
          <div class="adm-panel-heading">
            <div>
              <h2>{codes().length} gift cards created</h2>
              <p>
                Codes can be redeemed once. Share them only with the intended
                recipients.
              </p>
            </div>
            <div class="adm-actions">
              <button
                class="adm-button"
                onClick={() => copyCashier(codes().join("\n"))}
              >
                Copy codes
              </button>
              <button
                class="adm-button primary"
                onClick={() => downloadCodes(codes())}
              >
                Download
              </button>
              <button class="adm-button" onClick={() => setCodes([])}>
                Dismiss
              </button>
            </div>
          </div>
          <pre>{codes().join("\n")}</pre>
        </section>
      </Show>
      <form class="adm-filterbar" onSubmit={list.search}>
        <label class="adm-field">
          Search by code
          <input
            class="adm-input"
            placeholder="Paste a code…"
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
            <option value="">All cards</option>
            <option value="active">Active</option>
            <option value="redeemed">Redeemed</option>
          </select>
        </label>
        <button class="adm-button" type="submit">
          Search
        </button>
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
                <Empty title="No gift cards found">
                  Create a card or adjust your search.
                </Empty>
              }
            >
              <div class="adm-table-scroll">
                <table class="adm-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Redeemed by</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list.data()?.data}>
                      {(card) => (
                        <tr>
                          <td>
                            <button
                              class="cashier-code"
                              title="Copy gift-card code"
                              onClick={() =>
                                copyCashier(
                                  card.code
                                    .match(/.{1,4}/g)
                                    .join("-")
                                    .toUpperCase(),
                                )
                              }
                            >
                              {card.code
                                .match(/.{1,4}/g)
                                .join("-")
                                .toUpperCase()}
                            </button>
                            <small>#{card.id}</small>
                          </td>
                          <td>
                            <strong>
                              {card.usd ? "$" : ""}
                              {money(card.amount)}
                              {card.usd ? "" : " coins"}
                            </strong>
                          </td>
                          <td>
                            <Badge
                              value={card.redeemedAt ? "completed" : "active"}
                            >
                              {card.redeemedAt ? "Redeemed" : "Active"}
                            </Badge>
                          </td>
                          <td>
                            {card.redeemedByUsername || "—"}
                            <small>
                              {card.redeemedAt
                                ? date(card.redeemedAt)
                                : "Not redeemed"}
                            </small>
                          </td>
                          <td class="cashier-note">{card.notes || "—"}</td>
                          <td>
                            <div class="adm-actions">
                              <button
                                class="adm-button"
                                onClick={() => open("edit", card)}
                              >
                                Edit
                              </button>
                              <button
                                class="adm-button danger"
                                disabled={!!card.redeemedAt}
                                onClick={() => open("revoke", card)}
                              >
                                Revoke
                              </button>
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
            dialog().kind === "create"
              ? "Create gift cards"
              : dialog().kind === "edit"
                ? "Edit gift card"
                : "Revoke gift card"
          }
          eyebrow="CASHIER ACTION"
          busy={busy()}
          close={() => setDialog(null)}
        >
          <form onSubmit={save}>
            <Show when={dialog().kind !== "revoke"}>
              <label class="adm-field">
                {dialog().card?.usd === 0
                  ? "Value in coins"
                  : "Value per card (USD)"}
                <input
                  class="adm-input"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  required
                  value={amount()}
                  disabled={!!dialog().card?.redeemedAt || !!submitted()}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                />
              </label>
              <Show when={dialog().kind === "create"}>
                <label class="adm-field">
                  Quantity
                  <input
                    class="adm-input"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    disabled={!!submitted()}
                    value={quantity()}
                    onInput={(e) => setQuantity(e.currentTarget.value)}
                  />
                </label>
                <p class="cashier-total">
                  Total issued value{" "}
                  <strong>
                    ${money(Number(amount()) * Number(quantity()))}
                  </strong>
                </p>
              </Show>
              <Show when={dialog().kind === "edit"}>
                <label class="adm-field">
                  Internal notes
                  <textarea
                    class="adm-input"
                    maxLength="500"
                    disabled={!!submitted()}
                    value={notes()}
                    onInput={(e) => setNotes(e.currentTarget.value)}
                  />
                </label>
              </Show>
            </Show>
            <Show when={dialog().kind === "revoke"}>
              <div class="adm-notice danger">
                The unredeemed card #{dialog().card.id} will stop working.
                Redeemed cards cannot be revoked.
              </div>
            </Show>
            <label class="adm-field">
              Reason for this action
              <textarea
                class="adm-input"
                minLength="5"
                maxLength="500"
                required
                disabled={!!submitted()}
                value={reason()}
                onInput={(e) => setReason(e.currentTarget.value)}
                placeholder="Describe why this change is needed"
              />
            </label>
            <Show when={error()}>
              <Failure error={error()} />
              <p class="wallet-caption">
                Retry keeps the same request to avoid creating duplicate cards.
              </p>
            </Show>
            <div class="adm-actions">
              <button
                class="adm-button"
                type="button"
                disabled={busy()}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                class={
                  "adm-button " +
                  (dialog().kind === "revoke" ? "danger" : "primary")
                }
                disabled={busy()}
              >
                {busy()
                  ? "Processing…"
                  : submitted()
                    ? "Retry request"
                    : dialog().kind === "create"
                      ? "Create cards"
                      : dialog().kind === "edit"
                        ? "Save changes"
                        : "Revoke card"}
              </button>
            </div>
          </form>
        </Modal>
      </Show>
    </>
  );
}
export default function AdminCashier() {
  const [params] = useSearchParams();
  return (
    <Switch fallback={<GiftCards />}>
      <Match when={params.type === "crypto"}>
        <AdminCryptoCashier />
      </Match>
      <Match when={params.type === "skindeck"}>
        <AdminSkinDeckCashier />
      </Match>
    </Switch>
  );
}
