import {
  A,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@solidjs/router";
import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { useUser } from "../contexts/usercontextprovider";
import { authedAPI } from "../util/api";
import { AdminContext, Failure, Skeleton } from "../components/Admin/system";
import "../components/Admin/admin.css";
const navigation = [
  [
    "Operations",
    [
      ["/admin", "Overview"],
      ["/admin/games", "Live games"],
      ["/admin/audit", "Audit history"],
    ],
  ],
  [
    "Platform",
    [
      ["/admin/users", "Users"],
      ["/admin/cashier", "Cashier"],
      ["/admin/statistics", "Statistics"],
      ["/admin/statsbook", "Statsbook"],
    ],
  ],
  [
    "Management",
    [
      ["/admin/games/settings", "Game settings"],
      ["/admin/games/probability", "Fairness"],
      ["/admin/cases", "Cases"],
      ["/admin/rewards", "Rewards"],
      ["/admin/rain", "Rain"],
      ["/admin/announcements", "Announcements"],
      ["/admin/slides", "Home banners"],
      ["/admin/filter", "Chat filter"],
      ["/admin/settings", "Features"],
    ],
  ],
];
export default function Admin() {
  const [user] = useUser(),
    location = useLocation(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const [session, setSession] = createSignal(),
    [loading, setLoading] = createSignal(true),
    [error, setError] = createSignal(),
    [code, setCode] = createSignal(""),
    [busy, setBusy] = createSignal(false);
  const allowed = (path) =>
    user()?.role !== "DEV" ||
    ["/admin/games", "/admin/audit", "/admin/games/probability"].includes(path);
  const groups = () =>
    navigation
      .map(([label, links]) => [label, links.filter(([path]) => allowed(path))])
      .filter(([, links]) => links.length);
  const active = (path) =>
    location.pathname === path ||
    (path === "/admin/users" && location.pathname.startsWith("/admin/user/"));
  const refresh = async () => {
    setLoading(true);
    const res = await authedAPI("/admin/session", "GET");
    if (res?.success) {
      setSession(res);
      setError(null);
    } else {
      setSession(null);
      setError(res?.error || "CONNECTION_UNAVAILABLE");
    }
    setLoading(false);
  };
  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await authedAPI(
      "/admin/2fa",
      "POST",
      JSON.stringify({ token: code() }),
    );
    if (res?.success || res?.error === "ALREADY_AUTHORIZED") await refresh();
    else setError(res?.error || "CONNECTION_UNAVAILABLE");
    setBusy(false);
  };
  onMount(() => {
    refresh();
    const expire = () => {
      setSession(null);
      setError("2FA_REQUIRED");
    };
    window.addEventListener("admin:reauth", expire);
    onCleanup(() => window.removeEventListener("admin:reauth", expire));
  });
  createEffect(() => {
    if (user()?.role === "DEV" && !allowed(location.pathname))
      navigate("/admin/games", { replace: true });
  });
  return (
    <AdminContext.Provider
      value={{
        session,
        refresh,
        can: (permission) => session()?.permissions?.includes(permission),
      }}
    >
      <div class="admin-design adm-shell">
        <header class="adm-topbar">
          <div class="adm-brand">
            <span class="adm-brand-icon" aria-hidden="true">
              ◇
            </span>
            <div>
              <span class="adm-eyebrow">COSMIC LUCK</span>
              <strong>Administration</strong>
            </div>
          </div>
          <div class="adm-account">
            <strong>
              {user()?.username} · {user()?.role}
            </strong>
            <small>Account {user()?.id}</small>
          </div>
        </header>
        <div class="adm-mobile-nav">
          <label class="adm-field">
            Navigate to
            <select
              class="adm-select"
              aria-label="Admin navigation"
              value={location.pathname}
              onChange={(e) => navigate(e.currentTarget.value)}
            >
              <For each={groups()}>
                {([label, links]) => (
                  <optgroup label={label}>
                    <For each={links}>
                      {([path, title]) => <option value={path}>{title}</option>}
                    </For>
                  </optgroup>
                )}
              </For>
            </select>
          </label>
        </div>
        <div class="adm-layout">
          <nav class="adm-sidebar" aria-label="Administration">
            <For each={groups()}>
              {([label, links]) => (
                <div class="adm-nav-group">
                  <span>{label}</span>
                  <For each={links}>
                    {([path, title]) => (
                      <A
                        href={path}
                        class="adm-nav-link"
                        classList={{ active: active(path) }}
                        end={path === "/admin"}
                      >
                        <i class="adm-nav-dot" />
                        {title}
                      </A>
                    )}
                  </For>
                </div>
              )}
            </For>
            <small class="adm-panel-content">
              COSMICLUCK
              <br />
              Operations workspace
            </small>
          </nav>
          <main class="adm-body">
            <Show when={!loading()} fallback={<Skeleton />}>
              <Show
                when={session()}
                fallback={
                  <form class="adm-auth" onSubmit={unlock}>
                    <span class="adm-eyebrow">PROTECTED WORKSPACE</span>
                    <h1>Admin access</h1>
                    <p>
                      {user()?.has2fa
                        ? "Enter the code from your authenticator to open a 30-minute admin session."
                        : "Continue with your signed-in staff account to open a 30-minute admin session."}
                    </p>
                    <Show when={error() && error() !== "2FA_REQUIRED"}>
                      <Failure error={error()} />
                    </Show>
                    <Show when={user()?.has2fa}>
                      <label class="adm-field">
                        Authenticator code
                        <input
                          class="adm-input"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength="6"
                          required
                          value={code()}
                          onInput={(e) => setCode(e.currentTarget.value)}
                        />
                      </label>
                    </Show>
                    <button class="adm-button primary" disabled={busy()}>
                      {busy() ? "Verifying…" : "Open admin workspace"}
                    </button>
                    <A href="/">Return to site</A>
                  </form>
                }
              >
                <Show when={location.pathname === "/admin/cashier"}>
                  <div class="adm-tabs" style={{ "margin-bottom": "18px" }}>
                    <For
                      each={[
                        ["", "Coins"],
                        ["crypto", "Crypto"],
                        ["skindeck", "Skins"],
                      ]}
                    >
                      {([value, label]) => (
                        <button
                          classList={{ active: (params.type || "") === value }}
                          onClick={() =>
                            setParams({ type: value || undefined })
                          }
                        >
                          {label}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
                <div
                  classList={{
                    "adm-legacy": ![
                      "/admin",
                      "/admin/games",
                      "/admin/audit",
                      "/admin/games/settings",
                    ].includes(location.pathname),
                  }}
                >
                  <Outlet />
                </div>
              </Show>
            </Show>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
