import { A, Outlet, useLocation, useSearchParams } from '@solidjs/router';
import { For, Show } from 'solid-js';
import { useUser } from '../contexts/usercontextprovider';

const NAV_GROUPS = [
  { label: 'Overview', items: [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/statistics', label: 'Statistics' },
    { href: '/admin/statsbook', label: 'Statsbook' },
  ]},
  { label: 'Operations', items: [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/filter', label: 'Bet filter' },
    { href: '/admin/cashier', label: 'Cashier' },
    { href: '/admin/rain', label: 'Rain' },
  ]},
  { label: 'Content', items: [
    { href: '/admin/announcements', label: 'Announcements' },
    { href: '/admin/cases', label: 'Cases' },
    { href: '/admin/rewards', label: 'Rewards' },
    { href: '/admin/slides', label: 'Homepage slider' },
  ]},
  { label: 'System', items: [
    { href: '/admin/games', label: 'Game control', exact: true },
    { href: '/admin/games/probability', label: 'Game fairness' },
    { href: '/admin/settings', label: 'Settings' },
  ]},
];

const PAGE_LABELS = Object.fromEntries(NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.href, item.label])));
PAGE_LABELS['/admin/user'] = 'Users';

function Admin() {
  const location = useLocation();
  const [user] = useUser();
  const [params, setParams] = useSearchParams();

  const currentTitle = () => PAGE_LABELS[location.pathname] || 'Admin operations';
  const isActive = (item) => item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href);

  return (
    <>
      <main class='admin-shell fadein'>
        <aside class='admin-sidebar' aria-label='Admin navigation'>
          <div class='admin-brand'>
            <span class='admin-brand-mark'>CL</span>
            <div>
              <strong>Control room</strong>
              <span>Cosmic Luck</span>
            </div>
          </div>

          <nav class='admin-nav'>
            <For each={NAV_GROUPS}>{(group) => (
              <section class='nav-group'>
                <p>{group.label}</p>
                <For each={group.items}>{(item) => (
                  <A href={item.href} class='admin-nav-link' classList={{ active: isActive(item) }}>
                    <span class='nav-indicator'/>
                    {item.label}
                  </A>
                )}</For>
              </section>
            )}</For>
          </nav>

          <div class='admin-identity'>
            <span class='security-dot'/>
            <div>
              <strong>{user()?.username || 'Administrator'}</strong>
              <span>Secure session · ID {user()?.id || '—'}</span>
            </div>
          </div>
        </aside>

        <section class='admin-workspace'>
          <header class='admin-topbar'>
            <div class='admin-heading'>
              <span>Admin / {currentTitle()}</span>
              <h1>{currentTitle()}</h1>
            </div>

            <div class='admin-topbar-actions'>
              <Show when={location.pathname === '/admin/cashier'}>
                <label class='admin-select-label'>
                  <span>Ledger</span>
                  <select value={params.type || 'coins'} onChange={(event) => setParams({ type: event.currentTarget.value === 'coins' ? null : event.currentTarget.value })}>
                    <option value='coins'>Coins</option>
                    <option value='crypto'>Crypto</option>
                    <option value='skindeck'>SkinDeck</option>
                  </select>
                </label>
              </Show>

              <label class='mobile-admin-nav'>
                <span class='sr-only'>Admin page</span>
                <select value={location.pathname} onChange={(event) => window.location.assign(event.currentTarget.value)}>
                  <For each={NAV_GROUPS.flatMap((group) => group.items)}>{(item) => (
                    <option value={item.href}>{item.label}</option>
                  )}</For>
                </select>
              </label>

              <div class='system-health'>
                <span class='security-dot'/>
                Systems online
              </div>
            </div>
          </header>

          <div class='admin-content'>
            <Outlet/>
          </div>
        </section>
      </main>

      <style jsx>{`
        .admin-shell {
          width: min(1440px, 100%);
          min-height: calc(100vh - 74px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 224px minmax(0, 1fr);
          border: 1px solid rgba(255,255,255,.06);
          background: #0b1017;
        }

        .admin-sidebar {
          min-width: 0;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          border-right: 1px solid rgba(255,255,255,.06);
          background: #0e141c;
        }

        .admin-brand, .admin-identity { display: flex; align-items: center; gap: 10px; }
        .admin-brand { padding: 0 6px 16px; border-bottom: 1px solid rgba(255,255,255,.06); }
        .admin-brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid rgba(31,214,95,.35); border-radius: 7px; background: #111b20; color: #1fd65f; font: 800 11px 'Geogrotesque Wide', sans-serif; }
        .admin-brand div, .admin-identity div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .admin-brand strong, .admin-identity strong { color: #f3f6f8; font-size: 12px; }
        .admin-brand span:not(.admin-brand-mark), .admin-identity span { color: #7e8998; font-size: 9px; }

        .admin-nav { display: flex; flex-direction: column; gap: 20px; }
        .nav-group { display: flex; flex-direction: column; gap: 3px; }
        .nav-group > p { padding: 0 9px 5px; color: #596575; font: 700 9px 'Geogrotesque Wide', sans-serif; letter-spacing: .09em; text-transform: uppercase; }
        .admin-nav-link { min-height: 34px; padding: 0 9px; display: flex; align-items: center; gap: 9px; border-radius: 6px; color: #8893a2; font-size: 11px; font-weight: 650; text-decoration: none; transition: background .16s ease, color .16s ease; }
        .nav-indicator { width: 3px; height: 12px; border-radius: 3px; background: #303a47; }
        .admin-nav-link:hover { background: #131b24; color: #dce2e8; }
        .admin-nav-link.active { background: #15221d; color: #f3f6f8; }
        .admin-nav-link.active .nav-indicator { background: #1fd65f; }

        .admin-identity { margin-top: auto; padding: 12px 7px 0; border-top: 1px solid rgba(255,255,255,.06); }
        .security-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #1fd65f; box-shadow: 0 0 9px rgba(31,214,95,.5); }

        .admin-workspace { min-width: 0; }
        .admin-topbar { min-height: 72px; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(255,255,255,.06); background: #0e141c; }
        .admin-heading { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .admin-heading span { color: #667282; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .admin-heading h1 { margin: 0; color: #f3f6f8; font: 750 20px 'Geogrotesque Wide', sans-serif; }
        .admin-topbar-actions { display: flex; align-items: center; gap: 10px; }
        .system-health { min-height: 34px; padding: 0 11px; display: flex; align-items: center; gap: 7px; border: 1px solid rgba(255,255,255,.06); border-radius: 6px; color: #9ca6b3; font-size: 10px; font-weight: 700; }
        .admin-select-label { display: flex; align-items: center; gap: 8px; color: #697586; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        select { height: 34px; padding: 0 30px 0 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; background: #111820; color: #dbe1e7; font: 700 10px 'Geogrotesque Wide', sans-serif; }
        select:focus-visible { outline: 2px solid #1fd65f; outline-offset: 2px; }
        .mobile-admin-nav { display: none; }

        .admin-content { min-width: 0; padding: 20px; }

        :global(.admin-content input), :global(.admin-content textarea), :global(.admin-content select) {
          border-color: rgba(255,255,255,.08) !important;
          border-radius: 6px !important;
          background: #0e141c !important;
          color: #f3f6f8 !important;
        }
        :global(.admin-content input:focus), :global(.admin-content textarea:focus), :global(.admin-content select:focus) { border-color: rgba(31,214,95,.55) !important; outline: none !important; }
        :global(.admin-content button) { border-radius: 6px; font-family: 'Geogrotesque Wide', sans-serif; }
        :global(.admin-content .banner) { min-height: 42px; border: 1px solid rgba(255,255,255,.06) !important; border-left: 3px solid #1fd65f !important; border-radius: 6px !important; background: #0e141c !important; }
        :global(.admin-content .panel), :global(.admin-content .card), :global(.admin-content .section), :global(.admin-content .graph), :global(.admin-content .table-panel) { border-color: rgba(255,255,255,.06) !important; background: #0e141c !important; box-shadow: none !important; }
        :global(.admin-content .table), :global(.admin-content .users) { border-color: rgba(255,255,255,.06) !important; background: #0e141c !important; }
        :global(.admin-content .filters), :global(.admin-content .toolbar) { position: sticky; top: 0; z-index: 3; background: #0b1017 !important; }
        :global(.admin-content .table-scroll), :global(.admin-content .users-wrapper) { max-width: 100%; overflow-x: auto; }
        :global(.admin-content button:focus-visible), :global(.admin-content a:focus-visible) { outline: 2px solid #1fd65f !important; outline-offset: 2px; }
        :global(.sr-only) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        @media (max-width: 920px) {
          .admin-shell { display: block; border-left: 0; border-right: 0; }
          .admin-sidebar { display: none; }
          .mobile-admin-nav { display: block; }
          .admin-content { padding: 14px; padding-bottom: 90px; }
          .admin-topbar { padding: 10px 14px; }
          .system-health { display: none; }
        }

        @media (max-width: 560px) {
          .admin-topbar { align-items: flex-start; flex-direction: column; }
          .admin-topbar-actions { width: 100%; justify-content: space-between; }
          .admin-select-label > span { display: none; }
          .admin-content { padding: 10px; padding-bottom: 90px; }
        }
      `}</style>
    </>
  );
}

export default Admin;
