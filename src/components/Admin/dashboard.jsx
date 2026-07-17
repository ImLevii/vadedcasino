import { A } from '@solidjs/router';
import { createResource, For, Show } from 'solid-js';
import { authedAPI } from '../../util/api';
import Loader from '../Loader/loader';
import LineChart from './linechart';
import AdminMFA from '../MFA/adminmfa';

function AdminDashboard() {
  const [stats, { mutate: mutateStats, refetch: refetchStats }] = createResource(fetchStats);

  async function fetchStats() {
    const response = await authedAPI('/admin/dashboard', 'GET', null);
    if (response?.error === '2FA_REQUIRED') {
      mutateStats({ mfa: true });
      return { mfa: true };
    }
    if (!response || response.error) throw new Error(response?.error || 'Dashboard unavailable');
    return { ...response, growth: [...(response.growth || [])].reverse() };
  }

  const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cards = () => [
    { label: 'Profit today', value: `$${money(stats()?.profit?.lastDay)}`, note: 'Rolling 24 hours' },
    { label: 'Profit this week', value: `$${money(stats()?.profit?.last7d)}`, note: 'Last 7 days' },
    { label: 'Profit this month', value: `$${money(stats()?.profit?.last31d)}`, note: 'Last 31 days' },
    { label: 'Lifetime profit', value: `$${money(stats()?.profit?.total)}`, note: 'All recorded activity', accent: true },
  ];

  return (
    <>
      <Show when={stats()?.mfa}><AdminMFA refetch={refetchStats}/></Show>

      <div class='dashboard-toolbar'>
        <div>
          <h2>Operations overview</h2>
          <p>Revenue and platform controls in one place.</p>
        </div>
        <button onClick={() => refetchStats()} disabled={stats.loading}>
          {stats.loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      <Show when={!stats.loading} fallback={<div class='dashboard-loader'><Loader/></div>}>
        <Show when={!stats.error} fallback={
          <div class='dashboard-state' role='alert'>
            <strong>Dashboard data is unavailable</strong>
            <p>Check the admin API connection, then try again.</p>
            <button onClick={() => refetchStats()}>Try again</button>
          </div>
        }>
          <section class='stats-grid' aria-label='Profit summary'>
            <For each={cards()}>{(card) => (
              <article class='metric-card' classList={{ accent: card.accent }}>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
                <span>{card.note}</span>
              </article>
            )}</For>
          </section>

          <div class='dashboard-grid'>
            <section class='chart-panel'>
              <div class='panel-heading'>
                <div>
                  <span>Performance</span>
                  <h3>Growth trend</h3>
                </div>
                <span class='live-status'><i/> Live data</span>
              </div>
              <div class='graph'><LineChart data={stats()?.growth || []}/></div>
            </section>

            <aside class='quick-panel'>
              <div class='panel-heading'>
                <div><span>Workflows</span><h3>Quick actions</h3></div>
              </div>
              <nav>
                <A href='/admin/cashier'>Review transactions <span>→</span></A>
                <A href='/admin/users'>Manage users <span>→</span></A>
                <A href='/admin/games'>Game controls <span>→</span></A>
                <A href='/admin/games/probability'>Fairness settings <span>→</span></A>
              </nav>
              <div class='security-note'>
                <i/>
                <div><strong>Protected session</strong><span>Sensitive actions remain MFA-gated.</span></div>
              </div>
            </aside>
          </div>
        </Show>
      </Show>

      <style jsx>{`
        .dashboard-toolbar { margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .dashboard-toolbar > div { display: flex; flex-direction: column; gap: 4px; }
        .dashboard-toolbar h2, .panel-heading h3 { margin: 0; color: #f3f6f8; font: 750 16px 'Geogrotesque Wide', sans-serif; }
        .dashboard-toolbar p { color: #758191; font-size: 11px; }
        button { min-height: 34px; padding: 0 12px; border: 1px solid rgba(31,214,95,.28); border-radius: 6px; background: #15221d; color: #1fd65f; font-size: 10px; font-weight: 750; cursor: pointer; }
        button:disabled { opacity: .55; cursor: wait; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .metric-card { min-width: 0; min-height: 110px; padding: 15px; display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(255,255,255,.06); border-radius: 7px; background: #0e141c; }
        .metric-card p, .panel-heading span { color: #687586; font-size: 9px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
        .metric-card strong { overflow: hidden; color: #f3f6f8; font: 750 21px 'Geogrotesque Wide', sans-serif; text-overflow: ellipsis; }
        .metric-card span { margin-top: auto; color: #687586; font-size: 9px; }
        .metric-card.accent { border-color: rgba(31,214,95,.3); background: #111d19; }
        .metric-card.accent strong { color: #1fd65f; }

        .dashboard-grid { margin-top: 10px; display: grid; grid-template-columns: minmax(0, 2fr) minmax(240px, .8fr); gap: 10px; }
        .chart-panel, .quick-panel { min-width: 0; border: 1px solid rgba(255,255,255,.06); border-radius: 7px; background: #0e141c; }
        .panel-heading { min-height: 58px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.06); }
        .panel-heading > div { display: flex; flex-direction: column; gap: 4px; }
        .live-status { display: flex; align-items: center; gap: 6px; }
        .live-status i, .security-note > i { width: 7px; height: 7px; border-radius: 50%; background: #1fd65f; }
        .graph { width: 100%; height: 270px; border: 0 !important; border-radius: 0 !important; }
        .quick-panel nav { padding: 7px; display: flex; flex-direction: column; gap: 3px; }
        .quick-panel a { min-height: 38px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; border-radius: 5px; color: #aab3bf; font-size: 10px; font-weight: 700; text-decoration: none; }
        .quick-panel a:hover { background: #151d26; color: #f3f6f8; }
        .quick-panel a span { color: #1fd65f; }
        .security-note { margin: 7px; padding: 11px; display: flex; align-items: flex-start; gap: 9px; border: 1px solid rgba(31,214,95,.18); border-radius: 6px; background: #111d19; }
        .security-note div { display: flex; flex-direction: column; gap: 3px; }
        .security-note strong { color: #dfe5e9; font-size: 10px; }
        .security-note span { color: #748090; font-size: 9px; line-height: 1.45; }
        .dashboard-loader, .dashboard-state { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid rgba(255,255,255,.06); border-radius: 7px; background: #0e141c; text-align: center; }
        .dashboard-state strong { color: #f3f6f8; }
        .dashboard-state p { color: #758191; font-size: 11px; }

        @media (max-width: 1000px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 700px) { .dashboard-grid { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 460px) { .stats-grid { grid-template-columns: 1fr; } .dashboard-toolbar { align-items: flex-start; } }
      `}</style>
    </>
  );
}

export default AdminDashboard;
