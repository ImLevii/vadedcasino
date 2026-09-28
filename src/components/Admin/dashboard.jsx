import { A } from "@solidjs/router";
import { createSignal, onMount, For, Show } from "solid-js";
import { authedAPI } from "../../util/api";
import { createOperationsFeed } from "./live-operations";
import {
  PageHeader,
  Metric,
  Badge,
  Failure,
  Skeleton,
  Empty,
  money,
  words,
  duration,
  date,
} from "./system";
export default function Dashboard() {
  const [stats, setStats] = createSignal(),
    [loading, setLoading] = createSignal(true),
    [error, setError] = createSignal();
  const feed = createOperationsFeed(() => ({
    view: "active",
    limit: 5,
    sort: "exposure",
  }));
  const load = async () => {
    setLoading(true);
    const r = await authedAPI("/admin/dashboard", "GET");
    if (r && !r.error) {
      setStats({ ...r, growth: [...(r.growth || [])].reverse() });
      setError(null);
    } else setError(r?.error || "CONNECTION_UNAVAILABLE");
    setLoading(false);
  };
  onMount(load);
  const points = () => stats()?.growth || [];
  const maximum = () => Math.max(1, ...points().map((p) => Number(p.players)));
  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OVERVIEW"
        title="Operations at a glance"
        description="Game health, recorded revenue, and the tools to keep play moving."
      >
        <Badge value={feed.fresh() ? "connected" : "reconnecting"}>
          {feed.fresh() ? "Live operations" : "Connecting"}
        </Badge>
        <button class="adm-button" disabled={loading()} onClick={load}>
          Refresh financials
        </button>
      </PageHeader>
      <Show when={error()}>
        <Failure error={error()} retry={load} />
      </Show>
      <Show when={stats()} fallback={<Skeleton />}>
        <div class="adm-metrics">
          <For
            each={[
              ["GGR · 24 hours", "lastDay", "Settled stakes less game payouts"],
              ["GGR · 7 days", "last7d", "Excludes bots and unfinished bets"],
              ["GGR · 31 days", "last31d", "Bonuses and expenses excluded"],
              ["Lifetime GGR", "total", "Recorded game ledger"],
            ]}
          >
            {([label, key, note]) => (
              <Metric
                label={label}
                value={money(stats()?.ggr?.[key])}
                note={note}
                accent={key === "total"}
              />
            )}
          </For>
        </div>
        <div class="adm-two-col">
          <section class="adm-panel">
            <div class="adm-panel-heading">
              <div>
                <span class="adm-eyebrow">LIVE GAME HEALTH</span>
                <h3>{feed.snapshot()?.summary.total || 0} active games</h3>
              </div>
              <A href="/admin/games" class="adm-button">
                Open control center →
              </A>
            </div>
            <Show when={feed.error()}>
              <div class="adm-panel-content">
                <Failure error={feed.error()} />
              </div>
            </Show>
            <Show
              when={feed.rows.length}
              fallback={
                <Empty
                  title={
                    feed.snapshot()
                      ? "No active games"
                      : "Connecting to live games"
                  }
                >
                  New rounds and player sessions will appear here.
                </Empty>
              }
            >
              <div class="adm-table-scroll">
                <table class="adm-table" style={{ "min-width": "500px" }}>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>State</th>
                      <th>Players</th>
                      <th class="adm-numeric">Exposure</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={feed.rows}>
                      {(g) => (
                        <tr>
                          <td>
                            <strong>{words(g.game)}</strong>
                            <small>Round #{g.id}</small>
                          </td>
                          <td>
                            <Badge value={g.state} />
                            <small>{words(g.health)}</small>
                          </td>
                          <td>{g.playerCount}</td>
                          <td class="adm-numeric">{money(g.exposure)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
            <div class="adm-pagination">
              <span>
                {feed.snapshot()?.summary.onlinePlayers || 0} signed-in players
                online
              </span>
              <span>Updated {duration(feed.age())} ago</span>
            </div>
          </section>
          <aside class="adm-panel">
            <div class="adm-panel-heading">
              <div>
                <span class="adm-eyebrow">WORKSPACE</span>
                <h3>Quick access</h3>
              </div>
            </div>
            <nav class="adm-panel-content adm-quick-links">
              <For
                each={[
                  ["/admin/cashier", "Review transactions"],
                  ["/admin/users", "Manage players"],
                  ["/admin/games/settings", "Configure games"],
                  ["/admin/audit", "Inspect audit history"],
                  ["/admin/games/probability", "Probability & fairness"],
                ]}
              >
                {([href, label]) => (
                  <A class="adm-quick-link" href={href}>
                    {label}
                    <span>↗</span>
                  </A>
                )}
              </For>
            </nav>
            <div class="adm-panel-content">
              <small>
                Privileged changes require an active staff session. Controls
                check permissions and the current game state on the server.
              </small>
            </div>
          </aside>
        </div>
        <div class="adm-two-col">
          <section class="adm-panel">
            <div class="adm-panel-heading">
              <div>
                <span class="adm-eyebrow">PLAYER GROWTH</span>
                <h3>Weekly registrations</h3>
              </div>
              <small>Latest 9 recorded weeks · bots excluded</small>
            </div>
            <div class="adm-panel-content">
              <Show
                when={points().length}
                fallback={
                  <Empty title="No registrations yet">
                    New player registrations will be charted here.
                  </Empty>
                }
              >
                <div
                  style={{
                    height: "210px",
                    display: "grid",
                    "grid-template-columns":
                      "repeat(" + points().length + ",minmax(0,1fr))",
                    gap: "10px",
                    "align-items": "end",
                    "border-bottom": "1px solid #354252",
                    "padding-top": "20px",
                  }}
                >
                  <For each={points()}>
                    {(p) => (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          "flex-direction": "column",
                          "justify-content": "flex-end",
                          "align-items": "center",
                          gap: "8px",
                        }}
                      >
                        <small>{p.players}</small>
                        <div
                          title={
                            p.from +
                            " – " +
                            p.to +
                            ": " +
                            p.players +
                            " players"
                          }
                          style={{
                            height:
                              Math.max(
                                2,
                                (Number(p.players) / maximum()) * 160,
                              ) + "px",
                            width: "65%",
                            background: "linear-gradient(#48e695,#1b7153)",
                            "border-radius": "4px 4px 0 0",
                          }}
                        />
                      </div>
                    )}
                  </For>
                </div>
                <div class="adm-chart-labels" style={{ "margin-top": "12px" }}>
                  <span>{points()[0]?.from}</span>
                  <span>{points().at(-1)?.to}</span>
                </div>
                <details style={{ "margin-top": "14px" }}>
                  <summary class="adm-muted">View registration counts</summary>
                  <For each={points()}>
                    {(p) => (
                      <p>
                        {p.from} – {p.to}: {p.players} players
                      </p>
                    )}
                  </For>
                </details>
              </Show>
            </div>
          </section>
          <section class="adm-panel">
            <div class="adm-panel-heading">
              <div>
                <span class="adm-eyebrow">INFRASTRUCTURE</span>
                <h3>Engine heartbeat</h3>
              </div>
            </div>
            <div class="adm-panel-content adm-audit-list">
              <Show
                when={feed.snapshot()?.health.length}
                fallback={
                  <p class="adm-muted">
                    Heartbeats appear after a game is advanced.
                  </p>
                }
              >
                <For each={feed.snapshot()?.health}>
                  {(h) => (
                    <div class="adm-gate">
                      <div>
                        <strong>{words(h.game)}</strong>
                        <small>{h.nodeId}</small>
                        <small>{date(h.updatedAt)}</small>
                      </div>
                      <Badge
                        value={
                          h.errorCode
                            ? "error"
                            : Date.now() - new Date(h.updatedAt).valueOf() >
                                45000
                              ? "waiting"
                              : "healthy"
                        }
                      />
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </section>
        </div>
        <p class="adm-muted">
          Financial snapshot: {date(stats()?.serverTime)}. GGR is game revenue,
          before bonus costs and operating expenses. Recorded net cashflow:{" "}
          {money(stats()?.profit?.total)} USD; this is a separate payment
          metric.
        </p>
      </Show>
    </>
  );
}
