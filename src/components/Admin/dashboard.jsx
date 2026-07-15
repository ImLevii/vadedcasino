import {createResource, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import LineChart from "./linechart";
import AdminMFA from "../MFA/adminmfa";

function AdminDashboard(props) {

    const [stats, { mutate: mutateStats, refetch: refetchStats }] = createResource(fetchStats)

    async function fetchStats() {
        try {
            let stats = await authedAPI(`/admin/dashboard`, 'GET', null)
            if (stats.error && stats.error === '2FA_REQUIRED') {
                return mutateStats({ mfa: true })
            }

            if (stats.growth) {
                stats.growth = stats.growth.reverse()
            }

            return mutateStats(stats)
        } catch (e) {
            console.log(e)
            return mutateStats(null)
        }
    }

    return (
        <>
            {stats()?.mfa && (
                <AdminMFA refetch={() => refetchStats()}/>
            )}

            <Show when={!stats.loading} fallback={<Loader/>}>
                <div className='stats'>
                    <div className='stat'>
                        <p className='white align'>
                            $
                            {(stats()?.profit?.lastDay || 0)?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                        <p>PROFIT ON DAY</p>
                    </div>

                    <div className='stat'>
                        <p className='white align'>
                            $
                            {(stats()?.profit?.last7d || 0)?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                        <p>PROFIT ON WEEK</p>
                    </div>

                    <div className='stat'>
                        <p className='white align'>
                            $
                            {(stats()?.profit?.last31d || 0)?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                        <p>PROFIT ON MONTH</p>
                    </div>

                    <div className='stat green'>
                        <p className='white align'>
                            $
                            {((stats()?.profit?.total) || 0)?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                        <p class='green'>OVERALL PROFIT</p>
                    </div>
                </div>
            </Show>

            <div class='bar' style={{margin: '30px 0 10px 0'}}/>

            <div className='banner'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'><polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/></svg>
                <p>GROWTH</p>
                <div className='line'/>
            </div>

            <div class='graph'>
                <Show when={!stats.loading} fallback={<Loader/>}>
                    <LineChart data={stats()?.growth || []}/>
                </Show>
            </div>

            <div className='banner'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>
                <p>DEMOGRAPHIC</p>
                <div className='line'/>
            </div>

            <div class='demographics'>

            </div>

            <style jsx>{`
              .stats {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
              }

              .stat {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 6px;

                flex: 1 1 0;
                height: 88px;

                border-radius: 8px;
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.06);

                color: #ffffff;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 20px;
                font-weight: 700;

                padding: 10px 20px;
                transition: border-color .2s;
              }

              .stat:hover {
                border-color: rgba(255,255,255,0.12);
              }

              .stat.green {
                background: rgba(31, 214, 95, 0.08);
                border-color: rgba(31, 214, 95, 0.25);
              }

              .stat.green:hover {
                border-color: rgba(31, 214, 95, 0.4);
              }

              .stat p:last-child {
                color: #4b5260;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              .stat.green p:last-child {
                color: rgba(31,214,95,0.6);
              }

              .align {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .green {
                color: #1fd65f !important;
              }

              .bar {
                width: 100%;
                height: 1px;
                min-height: 1px;
                background: rgba(255,255,255,0.06);
              }

              .banner {
                outline: unset;
                border: unset;
                border-left: 3px solid rgba(31,214,95,0.5);

                width: 100%;
                height: 44px;

                border-radius: 0 6px 6px 0;
                background: linear-gradient(90deg, rgba(31,214,95,0.08) 0%, rgba(18,21,28,0) 60%);

                padding: 0 16px;
                display: flex;
                align-items: center;
                gap: 10px;

                color: #c3cad6;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.05em;

                margin-bottom: 20px;
              }

              .line {
                flex: 1;
                height: 1px;
                background: linear-gradient(90deg, rgba(31,214,95,0.2) 0%, transparent 100%);
              }
              
              .graph {
                width: 100%;
                height: 235px;

                border-radius: 10px;
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.06);
              }
            `}</style>
        </>
    );
}

export default AdminDashboard;
