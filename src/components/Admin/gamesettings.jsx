import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { authedAPI } from "../../util/api";
import {
  PageHeader,
  Failure,
  Skeleton,
  Modal,
  useAdmin,
  words,
} from "./system";
export default function GameSettings() {
  const admin = useAdmin(),
    [settings, setSettings] = createSignal({}),
    [versions, setVersions] = createSignal({}),
    [draft, setDraft] = createSignal({}),
    [active, setActive] = createSignal("crash"),
    [loading, setLoading] = createSignal(true),
    [error, setError] = createSignal(),
    [saved, setSaved] = createSignal(false),
    [confirm, setConfirm] = createSignal(),
    [reason, setReason] = createSignal(""),
    [busy, setBusy] = createSignal(false);
  const load = async () => {
    setLoading(true);
    const r = await authedAPI("/admin/games/settings", "GET");
    if (r?.success) {
      setSettings(r.data);
      setVersions(r.versions);
      setDraft({});
      setError(null);
    } else setError(r?.error || "CONNECTION_UNAVAILABLE");
    setLoading(false);
  };
  onMount(load);
  const entries = () => Object.entries(settings()[active()] || {});
  const value = (key, meta) =>
    Object.hasOwn(draft()[active()] || {}, key)
      ? draft()[active()][key]
      : meta.type === "json"
        ? JSON.stringify(meta.value, null, 2)
        : meta.value;
  const change = (key, value) => {
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      [active()]: { ...prev[active()], [key]: value },
    }));
  };
  const changes = () =>
    Object.entries(draft()[active()] || {}).filter(([key, val]) => {
      const meta = settings()[active()][key];
      return (
        String(val) !==
        String(
          meta.type === "json"
            ? JSON.stringify(meta.value, null, 2)
            : meta.value,
        )
      );
    });
  const review = (e) => {
    e.preventDefault();
    setError(null);
    const values = {};
    try {
      for (const [key, val] of changes()) {
        const meta = settings()[active()][key];
        values[key] =
          meta.type === "number"
            ? Number(val)
            : meta.type === "json"
              ? JSON.parse(val)
              : val;
        if (meta.type === "number" && !Number.isFinite(values[key]))
          throw Error();
      }
    } catch {
      setError("INVALID_SETTING_VALUE");
      return;
    }
    setReason("");
    setConfirm({
      game: active(),
      values,
      version: versions()[active()],
      requestId: crypto.randomUUID(),
    });
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = confirm();
    if (!payload.reason) {
      payload.reason = reason().trim();
      setConfirm({ ...payload });
    }
    const r = await authedAPI(
      "/admin/games/settings/" + payload.game,
      "POST",
      JSON.stringify(payload),
    );
    if (r?.success) {
      setConfirm(null);
      await load();
      setSaved(true);
    } else setError(r?.error || "CONNECTION_UNAVAILABLE");
    setBusy(false);
  };
  return (
    <>
      <PageHeader
        title="Game settings"
        description="Stage changes, review them together, then save a single audited update."
      >
        <A class="adm-button" href="/admin/games">
          ← Live controls
        </A>
        <A class="adm-button" href="/admin/games/probability">
          Probability & fairness ↗
        </A>
      </PageHeader>
      <Show when={error() && !confirm()}>
        <Failure
          error={error()}
          retry={!Object.keys(settings()).length ? load : undefined}
        />
      </Show>
      <Show when={saved()}>
        <div class="adm-notice" role="status">
          Settings saved. Current Crash and Roulette rounds retain their
          original rules.
        </div>
      </Show>
      <Show when={!loading()} fallback={<Skeleton />}>
        <div class="adm-tabs">
          <For each={Object.keys(settings())}>
            {(game) => (
              <button
                classList={{ active: active() === game }}
                onClick={() => setActive(game)}
              >
                {words(game)}
                {Object.keys(draft()[game] || {}).length ? " •" : ""}
              </button>
            )}
          </For>
        </div>
        <div class="adm-notice warning" style={{ "margin-top": "18px" }}>
          Crash and Roulette changes apply to future rounds. Other active games
          must finish before their rules can change.
        </div>
        <form onSubmit={review}>
          <div class="adm-settings-grid">
            <For each={entries()}>
              {([key, meta]) => (
                <label class="adm-setting">
                  <code>{key}</code>
                  <strong>{meta.label || words(key)}</strong>
                  <p>{meta.description || "Game configuration"}</p>
                  <Show when={meta.type === "boolean"}>
                    <input
                      type="checkbox"
                      checked={value(key, meta)}
                      disabled={!admin.can("settings.manage")}
                      onChange={(e) => change(key, e.currentTarget.checked)}
                    />
                  </Show>
                  <Show when={meta.type === "json"}>
                    <textarea
                      class="adm-textarea"
                      value={value(key, meta)}
                      disabled={!admin.can("settings.manage")}
                      onInput={(e) => change(key, e.currentTarget.value)}
                    />
                  </Show>
                  <Show when={meta.type === "number" || meta.type === "string"}>
                    <input
                      class="adm-input"
                      type={meta.type === "number" ? "number" : "text"}
                      min={meta.min ?? undefined}
                      max={meta.max ?? undefined}
                      step={meta.step || "any"}
                      required
                      value={value(key, meta)}
                      disabled={
                        !admin.can("settings.manage") || key === "totalTiles"
                      }
                      onInput={(e) => change(key, e.currentTarget.value)}
                    />
                  </Show>
                  <small>
                    {meta.type === "number"
                      ? "Range: " +
                        (meta.min ?? "—") +
                        " – " +
                        (meta.max ?? "—")
                      : meta.type}
                  </small>
                </label>
              )}
            </For>
          </div>
          <Show when={changes().length}>
            <div class="adm-savebar">
              <div>
                <strong>
                  {changes().length} unsaved{" "}
                  {changes().length === 1 ? "change" : "changes"}
                </strong>
                <p class="adm-muted">{words(active())} settings</p>
              </div>
              <div class="adm-actions">
                <button
                  type="button"
                  class="adm-button"
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, [active()]: {} }))
                  }
                >
                  Discard
                </button>
                <button class="adm-button primary">Review changes</button>
              </div>
            </div>
          </Show>
        </form>
      </Show>
      <Show when={confirm()}>
        <Modal
          title={"Save " + words(confirm().game) + " settings"}
          busy={busy()}
          close={() => setConfirm(null)}
        >
          <form onSubmit={save}>
            <Show when={error()}>
              <Failure error={error()} />
            </Show>
            <div class="adm-audit-list" style={{ "margin-bottom": "18px" }}>
              <For each={Object.entries(confirm().values)}>
                {([key, val]) => (
                  <div class="adm-fact">
                    <strong>{key}</strong>
                    <p style={{ "overflow-wrap": "anywhere" }}>
                      {JSON.stringify(settings()[confirm().game][key].value)} →{" "}
                      {JSON.stringify(val)}
                    </p>
                  </div>
                )}
              </For>
            </div>
            <label class="adm-field">
              Reason
              <textarea
                class="adm-textarea"
                minLength="5"
                maxLength="500"
                required
                value={reason()}
                disabled={busy() || !!confirm().reason}
                onInput={(e) => setReason(e.currentTarget.value)}
              />
            </label>
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
                class="adm-button primary"
                disabled={busy() || error() === "STALE_GAME_STATE"}
              >
                {busy() ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        </Modal>
      </Show>
    </>
  );
}
