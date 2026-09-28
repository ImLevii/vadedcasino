import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { authedAPI } from "../../util/api";
import { createOperationsFeed } from "./live-operations";
import {
  PageHeader,
  Badge,
  Metric,
  Failure,
  Empty,
  Skeleton,
  Modal,
  money,
  date,
  duration,
  words,
  useAdmin,
  explain,
} from "./system";
import { AuditEntries } from "./audit";

const labels = {
  pause: "Pause game",
  resume: "Resume game",
  lock: "Lock new bets",
  unlock: "Unlock betting",
  close_betting: "Close betting now",
  cancel_refund: "Cancel and refund",
  cashout: "Settle cash-out",
  recover: "Run safe recovery",
};
const descriptions = {
  pause:
    "Stops progression before an outcome is committed. Existing Mines cash-outs remain available.",
  resume:
    "Continues the same game. A paused betting countdown resumes with its remaining time.",
  lock: "Rejects new entries. Accepted bets continue to settle and player cash-outs remain available.",
  unlock: "Allows new entries while the game is still in its betting stage.",
  close_betting:
    "Closes betting immediately and begins the already committed round. The seed and result stay fixed.",
  cancel_refund:
    "Cancels this unplayed game and returns each recorded stake once. No refund is allowed after settlement starts or a Mines tile is revealed.",
  cashout:
    "Ends this Mines game at its current earned multiplier and credits the player once. No new tile is revealed.",
  recover:
    "Retries the original committed game and its settlement. It does not reset seeds, change results, or pay a completed bet again.",
};
const gameNames = {
  crash: "Crash",
  roulette: "Roulette",
  mines: "Mines",
  battles: "Case battles",
  coinflip: "Coinflip",
  blackjack: "Blackjack",
  cases: "Case opening",
  slots: "Provider slots",
};
export default function Operations() {
  const admin = useAdmin(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = createSignal(params.search || ""),
    [debounced, setDebounced] = createSignal(params.search || ""),
    [selected, setSelected] = createSignal(),
    [confirm, setConfirm] = createSignal(),
    [reason, setReason] = createSignal(""),
    [busy, setBusy] = createSignal(false),
    [actionError, setActionError] = createSignal(),
    [success, setSuccess] = createSignal(),
    [tab, setTab] = createSignal("state");
  createEffect(() => {
    const term = search();
    const timer = setTimeout(() => {
      setDebounced(term);
      setParams(
        { search: term || undefined, page: undefined },
        { replace: true },
      );
    }, 300);
    onCleanup(() => clearTimeout(timer));
  });
  const filter = (key, value) =>
    setParams(
      { [key]: value || undefined, page: undefined },
      { replace: true },
    );
  const feed = createOperationsFeed(() => ({
    search: debounced(),
    game: params.game || "",
    view: params.view || "active",
    state: params.state || "",
    health: params.health || "",
    node: params.node || "",
    sort: params.sort || "time",
    page: Number(params.page) || 1,
    selected: selected(),
  }));
  const detail = () => {
    const d = feed.snapshot()?.selected,
      s = selected();
    return s && d?.game === s.game && String(d.id) === String(s.id) ? d : null;
  };
  const open = (game) => {
    setSelected({ game: game.game, id: game.id });
    setTab("state");
  };
  const begin = (game, action) => {
    setReason("");
    setActionError(null);
    setConfirm({
      game: game.game,
      id: game.id,
      version: game.version,
      action,
      requestId: crypto.randomUUID(),
      state: game.state,
      wagered: game.wagered,
    });
  };
  const execute = async (e) => {
    e.preventDefault();
    if (!feed.fresh() || busy()) return;
    setBusy(true);
    setActionError(null);
    const payload = confirm();
    if (!payload.reason) {
      payload.reason = reason().trim();
      setConfirm({ ...payload });
    }
    const r = await authedAPI(
      "/admin/operations/action",
      "POST",
      JSON.stringify(payload),
      false,
      20000,
    );
    if (r?.success) {
      setSuccess(
        labels[payload.action] +
          " completed for " +
          gameNames[payload.game] +
          (payload.id ? " #" + payload.id : "."),
      );
      setConfirm(null);
      feed.refresh();
    } else {
      setActionError(r?.error || "CONNECTION_UNAVAILABLE");
      if (r?.error === "STALE_GAME_STATE") feed.refresh();
    }
    setBusy(false);
  };
  return (
    <>
      <PageHeader
        eyebrow="LIVE OPERATIONS"
        title="Game control"
        description="Inspect active rounds, follow settlements, and intervene with an auditable reason."
      >
        <Badge
          value={
            feed.fresh()
              ? feed.connected()
                ? "connected"
                : "warning"
              : "reconnecting"
          }
        >
          {feed.fresh()
            ? feed.connected()
              ? "Live connection"
              : "HTTP fallback"
            : "Waiting for fresh data"}
        </Badge>
        <Show when={admin.can("settings.manage")}>
          <A href="/admin/games/settings" class="adm-button">
            Game settings ↗
          </A>
        </Show>
      </PageHeader>
      <Show when={success()}>
        <div class="adm-notice" role="status">
          <span>{success()}</span>
          <button class="adm-button" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      </Show>
      <Show when={feed.error()}>
        <Failure
          title="Live updates interrupted"
          error={feed.error()}
          retry={feed.refresh}
        />
      </Show>
      <Show when={feed.snapshot()} fallback={<Skeleton />}>
        <div class="adm-metrics">
          <Metric
            label="Games in view"
            value={feed.snapshot()?.summary.total || 0}
            note={
              params.view === "all"
                ? "Recent history and matching games"
                : "Current filters applied"
            }
            accent
          />
          <Metric
            label="Player seats"
            value={feed.snapshot()?.summary.seats || 0}
            note={
              (feed.snapshot()?.summary.onlinePlayers || 0) +
              " signed-in players connected"
            }
          />
          <Metric
            label="Total wagered"
            value={money(feed.snapshot()?.summary.wagered)}
            note="Coins · games in this view"
          />
          <Metric
            label="Current exposure"
            value={money(feed.snapshot()?.summary.exposure)}
            note="Cash-outs / outcome payouts / unsettled stakes"
          />
        </div>
        <section class="adm-panel">
          <div class="adm-filterbar">
            <label class="adm-field">
              Find a game or player
              <input
                class="adm-input"
                type="search"
                placeholder="Game ID, username, or account ID"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </label>
            <label class="adm-field">
              Game
              <select
                class="adm-select"
                value={params.game || ""}
                onChange={(e) => filter("game", e.currentTarget.value)}
              >
                <option value="">All games</option>
                <For each={Object.entries(gameNames)}>
                  {([key, label]) => <option value={key}>{label}</option>}
                </For>
              </select>
            </label>
            <label class="adm-field">
              State
              <select
                class="adm-select"
                value={params.state || ""}
                onChange={(e) => filter("state", e.currentTarget.value)}
              >
                <option value="">All states</option>
                <For
                  each={[
                    "WAITING",
                    "BETTING",
                    "LOCKED",
                    "STARTING",
                    "RUNNING",
                    "RESOLVING",
                    "PAYING",
                    "PAUSED",
                    "COMPLETED",
                    "CANCELLED",
                  ]}
                >
                  {(state) => <option value={state}>{words(state)}</option>}
                </For>
              </select>
            </label>
            <label class="adm-field">
              Sort by
              <select
                class="adm-select"
                value={params.sort || "time"}
                onChange={(e) => filter("sort", e.currentTarget.value)}
              >
                <option value="time">Newest first</option>
                <option value="wager">Largest wager</option>
                <option value="exposure">Largest exposure</option>
                <option value="players">Most players</option>
              </select>
            </label>
          </div>
          <div class="adm-filter-foot">
            <div class="adm-tabs" aria-label="Game view">
              <For
                each={[
                  ["active", "Active"],
                  ["recent", "Recent / completed"],
                  ["all", "All history"],
                ]}
              >
                {([value, label]) => (
                  <button
                    classList={{ active: (params.view || "active") === value }}
                    onClick={() => filter("view", value)}
                  >
                    {label}
                  </button>
                )}
              </For>
              <button
                classList={{ active: params.health === "error" }}
                onClick={() => filter("health", params.health ? "" : "error")}
              >
                Needs attention
              </button>
            </div>
            <div class="adm-actions">
              <select
                class="adm-select"
                aria-label="Filter node"
                style={{ width: "170px", height: "34px" }}
                value={params.node || ""}
                onChange={(e) => filter("node", e.currentTarget.value)}
              >
                <option value="">All nodes</option>
                <For
                  each={[
                    ...new Set(feed.snapshot()?.health.map((h) => h.nodeId)),
                  ]}
                >
                  {(node) => <option value={node}>{node}</option>}
                </For>
              </select>
              <small>Updated {duration(feed.age())} ago</small>
            </div>
          </div>
          <Show
            when={feed.rows.length}
            fallback={
              <Empty
                title="No matching games"
                action={
                  <button
                    class="adm-button"
                    onClick={() => {
                      setSearch("");
                      setParams({
                        game: undefined,
                        state: undefined,
                        view: undefined,
                        health: undefined,
                        node: undefined,
                        page: undefined,
                      });
                    }}
                  >
                    Clear filters
                  </button>
                }
              >
                Try another game, state, or player. Finished games are available
                in history.
              </Empty>
            }
          >
            <div
              class="adm-table-scroll"
              tabIndex="0"
              aria-label="Live games table"
            >
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>Game / round</th>
                    <th>State</th>
                    <th>Players</th>
                    <th class="adm-numeric">Wagered</th>
                    <th class="adm-numeric">Exposure</th>
                    <th>Runtime / health</th>
                    <th>Node / last update</th>
                    <th>
                      <span class="adm-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={feed.rows}>
                    {(game) => (
                      <tr>
                        <td>
                          <strong>{gameNames[game.game]}</strong>
                          <small>
                            #{game.id} · Round {game.currentRound}
                          </small>
                        </td>
                        <td>
                          <Badge value={game.state} />
                          <small>
                            {game.multiplier
                              ? money(game.multiplier) + "×"
                              : words(game.payoutStatus)}
                          </small>
                        </td>
                        <td>
                          {game.playerCount}
                          <small>{game.connectedPlayers || 0} connected</small>
                        </td>
                        <td class="adm-numeric">{money(game.wagered)}</td>
                        <td class="adm-numeric" title={game.exposureType}>
                          {money(game.exposure)}
                        </td>
                        <td>
                          <strong>{duration(game.runtime)}</strong>
                          <small>{words(game.health)}</small>
                        </td>
                        <td>
                          <small title={game.nodeId}>
                            {game.nodeId || "Request-driven"}
                          </small>
                          <small title={date(game.updatedAt)}>
                            {date(game.updatedAt)}
                          </small>
                        </td>
                        <td>
                          <button
                            class="adm-button adm-row-button"
                            onClick={() => open(game)}
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
          <div class="adm-pagination">
            <span>
              {feed.snapshot()?.summary.total || 0} games · Page{" "}
              {feed.snapshot()?.page || 1}
            </span>
            <div class="adm-actions">
              <button
                class="adm-button"
                disabled={(feed.snapshot()?.page || 1) <= 1}
                onClick={() =>
                  setParams({ page: Number(params.page || 1) - 1 })
                }
              >
                Previous
              </button>
              <button
                class="adm-button"
                disabled={
                  (feed.snapshot()?.page || 1) * 25 >=
                  (feed.snapshot()?.summary.total || 0)
                }
                onClick={() =>
                  setParams({ page: Number(params.page || 1) + 1 })
                }
              >
                Next
              </button>
            </div>
          </div>
        </section>
        <section class="adm-panel">
          <div class="adm-panel-heading">
            <div>
              <span class="adm-eyebrow">ADMISSION CONTROLS</span>
              <h3>New game entries</h3>
            </div>
            <small>Accepted bets still settle</small>
          </div>
          <div class="adm-panel-content adm-gates">
            <For
              each={feed
                .snapshot()
                ?.gates.filter((g) => !["slots", "blackjack"].includes(g.game))}
            >
              {(gate) => (
                <div class="adm-gate">
                  <div>
                    <strong>{gameNames[gate.game]}</strong>
                    <small>
                      {gate.locked
                        ? "New bets locked"
                        : "Accepting new entries"}
                    </small>
                  </div>
                  <Show when={admin.can("games.manage")}>
                    <button
                      class="adm-button"
                      disabled={!feed.fresh()}
                      onClick={() =>
                        begin(
                          {
                            game: gate.game,
                            id: 0,
                            version: String(gate.revision),
                            state: gate.locked ? "LOCKED" : "OPEN",
                          },
                          gate.locked ? "unlock" : "lock",
                        )
                      }
                    >
                      {gate.locked ? "Unlock" : "Lock"}
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </section>
        <p class="adm-muted">
          Node identifies the latest instance to advance a game. On Vercel,
          active client requests drive progression; persisted rounds recover
          from their committed timestamps. Provider slots are read-only; legacy
          Blackjack supports inspection and safe refunds.
        </p>
      </Show>
      <Show when={selected()}>
        <Modal
          wide
          title={gameNames[selected().game] + " #" + selected().id}
          close={() => !confirm() && setSelected(null)}
        >
          <Show
            when={detail()}
            fallback={
              feed.snapshot()?.detailError ? (
                <Failure
                  error={feed.snapshot().detailError}
                  retry={feed.refresh}
                />
              ) : (
                <Skeleton />
              )
            }
          >
            <div class="adm-actions" style={{ "margin-bottom": "18px" }}>
              <Badge value={detail()?.state} />
              <Badge value={detail()?.health} />
              <span class="adm-muted">Updated {date(detail()?.updatedAt)}</span>
            </div>
            <Show when={!feed.fresh()}>
              <div class="adm-notice warning">
                Connection is recovering. Controls are disabled until fresh data
                arrives.
              </div>
            </Show>
            <div class="adm-tabs" style={{ "margin-bottom": "18px" }}>
              <For
                each={[
                  ["state", "Game state"],
                  ["bets", "Participants & bets"],
                  ["audit", "Event history"],
                ]}
              >
                {([key, label]) => (
                  <button
                    classList={{ active: tab() === key }}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                )}
              </For>
            </div>
            <Show when={tab() === "state"}>
              <dl class="adm-facts">
                <For
                  each={Object.entries({
                    startedAt: detail()?.startedAt,
                    runtime: duration(detail()?.runtime),
                    node: detail()?.nodeId || "Request-driven",
                    heartbeat: date(detail()?.heartbeatAt),
                    wagered: money(detail()?.wagered),
                    exposure: money(detail()?.exposure),
                    payout: detail()?.payoutStatus,
                    ...detail()?.facts,
                  })}
                >
                  {([key, value]) => (
                    <div class="adm-fact">
                      <dt>{words(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt>
                      <dd>
                        {typeof value === "object" && value !== null ? (
                          <pre>{JSON.stringify(value, null, 2)}</pre>
                        ) : /At$/.test(key) ? (
                          date(value)
                        ) : (
                          String(value ?? "—")
                        )}
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
              <Show when={detail()?.errorCode}>
                <Failure
                  title="Engine reported an error"
                  error={detail().errorCode}
                />
              </Show>
            </Show>
            <Show when={tab() === "bets"}>
              <div class="adm-table-scroll">
                <table class="adm-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Bet ID</th>
                      <th>Stake</th>
                      <th>Paid</th>
                      <th>Settlement</th>
                      <th>Presence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={detail()?.bets}>
                      {(bet) => (
                        <tr>
                          <td>
                            <strong>{bet.username}</strong>
                            <small>{bet.userId}</small>
                          </td>
                          <td>{bet.id}</td>
                          <td>{money(bet.amount)}</td>
                          <td>{money(bet.winnings)}</td>
                          <td>
                            <Badge
                              value={bet.completed ? "completed" : "waiting"}
                            />
                          </td>
                          <td>{bet.connected ? "Connected" : "Offline"}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
              <Show when={!detail()?.bets.length}>
                <Empty title="No participants yet">
                  Bets will appear when players enter this game.
                </Empty>
              </Show>
              <Show when={detail()?.participantsTruncated}>
                <p class="adm-muted">Showing the first 250 ledger entries.</p>
              </Show>
            </Show>
            <Show when={tab() === "audit"}>
              <div class="adm-audit-list" style={{ "margin-bottom": "20px" }}>
                <For each={detail()?.events}>
                  {(event) => (
                    <article class="adm-audit-entry">
                      <strong>{event.type}</strong>
                      <small>
                        {date(event.at)}
                        {event.userId ? " · Account " + event.userId : ""}
                      </small>
                    </article>
                  )}
                </For>
              </div>
              <AuditEntries rows={detail()?.audit} gameId={detail()?.id} />
            </Show>
            <Show when={detail()?.actions?.length}>
              <div class="adm-panel-heading" style={{ "padding-inline": "0" }}>
                <h3>Game controls</h3>
                <small>Every action is logged</small>
              </div>
              <div class="adm-actions" style={{ "margin-top": "14px" }}>
                <For each={detail()?.actions}>
                  {(action) => (
                    <button
                      class={
                        "adm-button " +
                        (action === "cancel_refund" ? "danger" : "")
                      }
                      disabled={!feed.fresh()}
                      onClick={() => begin(detail(), action)}
                    >
                      {labels[action]}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Modal>
      </Show>
      <Show when={confirm()}>
        <Modal
          title={labels[confirm().action]}
          close={() => setConfirm(null)}
          busy={busy()}
        >
          <form onSubmit={execute}>
            <p class="adm-muted">{descriptions[confirm().action]}</p>
            <div class="adm-fact" style={{ margin: "18px 0" }}>
              <strong>
                {gameNames[confirm().game]}{" "}
                {confirm().id ? "#" + confirm().id : "· all new entries"}
              </strong>
              <p>Current state: {words(confirm().state)}</p>
              <Show when={confirm().action === "cancel_refund"}>
                <p>Recorded stakes: {money(confirm().wagered)} coins</p>
              </Show>
            </div>
            <Show when={actionError()}>
              <Failure error={actionError()} />
            </Show>
            <label class="adm-field">
              Reason for this action
              <textarea
                class="adm-textarea"
                minLength="5"
                maxLength="500"
                required
                placeholder="Describe why this intervention is needed…"
                value={reason()}
                disabled={busy() || !!confirm().reason}
                onInput={(e) => setReason(e.currentTarget.value)}
              />
            </label>
            <Show when={!feed.fresh()}>
              <p class="adm-muted">
                Waiting for a fresh connection before this action can run.
              </p>
            </Show>
            <div
              class="adm-actions"
              style={{ "margin-top": "20px", "justify-content": "flex-end" }}
            >
              <button
                type="button"
                class="adm-button"
                disabled={busy()}
                onClick={() => setConfirm(null)}
              >
                Back
              </button>
              <button
                class={
                  "adm-button " +
                  (confirm().action === "cancel_refund" ? "danger" : "primary")
                }
                disabled={
                  busy() ||
                  !feed.fresh() ||
                  reason().trim().length < 5 ||
                  (actionError() &&
                    ![
                      "CONNECTION_UNAVAILABLE",
                      "SERVICE_UNAVAILABLE",
                      "SLOW_DOWN",
                    ].includes(actionError()))
                }
              >
                {busy()
                  ? "Applying…"
                  : confirm().reason
                    ? "Retry same request"
                    : "Confirm action"}
              </button>
            </div>
          </form>
        </Modal>
      </Show>
    </>
  );
}
