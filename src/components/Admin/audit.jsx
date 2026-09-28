import { createSignal, onMount, For, Show } from "solid-js";
import { authedAPI } from "../../util/api";
import {
  PageHeader,
  Failure,
  Skeleton,
  Empty,
  date,
  words,
  Badge,
} from "./system";

export function AuditEntries(props) {
  return (
    <Show
      when={props.rows?.length}
      fallback={
        <Empty title="No control actions recorded">
          Privileged changes and failed attempts will appear here.
        </Empty>
      }
    >
      <div class="adm-audit-list">
        <For each={props.rows}>
          {(entry) => (
            <article
              class="adm-audit-entry"
              classList={{ failed: !entry.success }}
            >
              <div class="adm-actions">
                <Badge value={entry.success ? "success" : "error"} />
                <strong>
                  {words(entry.action)} · {entry.game} #
                  {entry.gameId ?? props.gameId}
                </strong>
              </div>
              <small>
                {date(entry.createdAt)} · {entry.username || "Staff account"} ·
                Account {entry.adminId}
              </small>
              <p>{entry.parameters?.reason || "No reason recorded"}</p>
              <Show when={entry.errorCode}>
                <small>{entry.errorCode}</small>
              </Show>
              <details>
                <summary>State changes</summary>
                <pre>
                  {JSON.stringify(
                    { before: entry.stateBefore, after: entry.stateAfter },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          )}
        </For>
      </div>
    </Show>
  );
}
export default function AdminAudit() {
  const [rows, setRows] = createSignal([]),
    [page, setPage] = createSignal(1),
    [hasMore, setHasMore] = createSignal(false),
    [loading, setLoading] = createSignal(true),
    [error, setError] = createSignal();
  const load = async (next = page()) => {
    setLoading(true);
    setError(null);
    const r = await authedAPI("/admin/operations/audit?page=" + next, "GET");
    if (r?.success) {
      setRows(r.data);
      setHasMore(r.hasMore);
      setPage(next);
    } else setError(r?.error || "CONNECTION_UNAVAILABLE");
    setLoading(false);
  };
  onMount(() => load());
  return (
    <>
      <PageHeader
        title="Audit history"
        description="A durable record of game controls, settings changes, and rejected requests."
      >
        <button class="adm-button" onClick={() => load()} disabled={loading()}>
          Refresh history
        </button>
      </PageHeader>
      <Show when={error()}>
        <Failure error={error()} retry={() => load()} />
      </Show>
      <Show when={!loading()} fallback={<Skeleton />}>
        <AuditEntries rows={rows()} />
        <div class="adm-pagination">
          <button
            class="adm-button"
            disabled={page() === 1}
            onClick={() => load(page() - 1)}
          >
            Previous
          </button>
          <span>Page {page()} · 50 records per page</span>
          <button
            class="adm-button"
            disabled={!hasMore()}
            onClick={() => load(page() + 1)}
          >
            Next
          </button>
        </div>
      </Show>
    </>
  );
}
