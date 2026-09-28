import { createSignal, For, Show } from "solid-js";
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
import { useCashierList, Pager } from "./shared";
export default function AdminSkinDeckCashier() {
  const [type, setType] = createSignal(""),
    [selected, setSelected] = createSignal(null),
    list = useCashierList("/admin/cashier/skindeck", () => ({ type: type() }));
  return (
    <>
      <PageHeader
        eyebrow="CASHIER / CS2 SKINS"
        title="Skin transactions"
        description="Track inventory deposits and withdrawals through SkinDeck."
      >
        <button
          class="adm-button"
          disabled={list.data.loading}
          onClick={list.refetch}
        >
          Refresh
        </button>
      </PageHeader>
      <form class="adm-filterbar" onSubmit={list.search}>
        <label class="adm-field">
          Search
          <input
            class="adm-input"
            placeholder="Username or transaction reference"
            maxLength="64"
            value={list.draft()}
            onInput={(e) => list.setDraft(e.currentTarget.value)}
          />
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
          Status
          <select
            class="adm-select"
            value={list.status()}
            onChange={(e) => list.setStatus(e.currentTarget.value)}
          >
            <option value="">All statuses</option>
            <For
              each={[
                "initiating",
                "pending",
                "hold",
                "unknown",
                "completed",
                "failed",
                "cancelled",
                "expired",
              ]}
            >
              {(s) => <option value={s}>{s}</option>}
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
                <Empty title="No skin transactions found">
                  Try another filter or check back after a trade.
                </Empty>
              }
            >
              <div class="adm-table-scroll">
                <table class="adm-table">
                  <thead>
                    <tr>
                      <th>Reference / user</th>
                      <th>Type</th>
                      <th>Coins</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Details</th>
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
                            <small>{tx.providerRef || tx.internalRef}</small>
                          </td>
                          <td>{tx.type}</td>
                          <td>{money(tx.value)}</td>
                          <td>
                            <Badge value={tx.status} />
                          </td>
                          <td>{date(tx.createdAt)}</td>
                          <td>
                            <button
                              class="adm-button"
                              onClick={() => setSelected(tx)}
                            >
                              View
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
      <Show when={selected()}>
        <Modal
          title={"Skin transaction #" + selected().id}
          close={() => setSelected(null)}
        >
          <dl class="cashier-detail">
            <dt>Player</dt>
            <dd>{selected().username}</dd>
            <dt>Internal reference</dt>
            <dd>{selected().internalRef}</dd>
            <dt>Provider reference</dt>
            <dd>{selected().providerRef || "Pending"}</dd>
            <dt>Value</dt>
            <dd>{money(selected().value)} coins</dd>
            <dt>Status</dt>
            <dd>
              <Badge value={selected().status} />
            </dd>
            <dt>Provider status</dt>
            <dd>{selected().providerStatus || "—"}</dd>
            <dt>Last update</dt>
            <dd>{date(selected().updatedAt)}</dd>
            <dt>Issue</dt>
            <dd>{selected().lastError || "None reported"}</dd>
          </dl>
        </Modal>
      </Show>
    </>
  );
}
