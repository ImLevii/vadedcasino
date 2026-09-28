import { createEffect, createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { authedAPI } from "../../util/api";
import { useWebsocket } from "../../contexts/socketprovider";

export function createOperationsFeed(filters) {
  const [ws] = useWebsocket(),
    [rows, setRows] = createStore([]),
    [snapshot, setSnapshot] = createSignal(),
    [error, setError] = createSignal(),
    [received, setReceived] = createSignal(0),
    [clock, setClock] = createSignal(Date.now()),
    [revision, setRevision] = createSignal(0);
  const ticker = setInterval(() => setClock(Date.now()), 1000);
  onCleanup(() => clearInterval(ticker));
  createEffect(() => {
    const query = JSON.parse(JSON.stringify(filters())),
      socket = ws();
    revision();
    let alive = true,
      timer,
      lastServerTime = 0;
    const poll = async () => {
      if (!alive) return;
      let result;
      if (socket?.connected) {
        result = await new Promise((resolve) =>
          socket
            .timeout(7000)
            .emit("admin:operations", query, (err, data) =>
              resolve(err ? { error: "CONNECTION_UNAVAILABLE" } : data),
            ),
        );
      } else {
        const params = new URLSearchParams(
          Object.entries(query).filter(
            ([k, v]) => k !== "selected" && v !== "" && v != null,
          ),
        );
        result = await authedAPI("/admin/operations?" + params, "GET");
        if (result?.success && query.selected) {
          const detail = await authedAPI(
            "/admin/operations/" +
              query.selected.game +
              "/" +
              query.selected.id,
            "GET",
          );
          result.selected = detail?.data;
          result.detailError = detail?.error;
        }
      }
      if (!alive) return;
      if (result?.error === "SLOW_DOWN") {
        timer = setTimeout(poll, 1600);
        return;
      }
      if (result?.error === "2FA_REQUIRED") {
        window.dispatchEvent(new Event("admin:reauth"));
        return;
      }
      if (result?.success && result.serverTime >= lastServerTime) {
        lastServerTime = result.serverTime;
        setRows(
          reconcile(
            result.data.map((row) => ({
              ...row,
              key: row.game + ":" + row.id,
            })),
            { key: "key" },
          ),
        );
        setSnapshot(result);
        setReceived(Date.now());
        setError(null);
      } else if (!result?.success)
        setError(result?.error || "CONNECTION_UNAVAILABLE");
      timer = setTimeout(
        poll,
        document.hidden ? 12000 : socket?.connected ? 3000 : 5000,
      );
    };
    const resume = () => {
      if (document.visibilityState === "visible") setRevision((v) => v + 1);
    };
    document.addEventListener("visibilitychange", resume);
    poll();
    onCleanup(() => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    });
  });
  return {
    rows,
    snapshot,
    error,
    age: () => Math.max(0, clock() - received()),
    fresh: () => received() > 0 && clock() - received() < 12000 && !error(),
    refresh: () => setRevision((v) => v + 1),
    connected: () => !!ws()?.connected,
  };
}
