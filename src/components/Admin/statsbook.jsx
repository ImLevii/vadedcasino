import {createResource, createSignal, For, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import AdminMFA from "../MFA/adminmfa";
import {useSearchParams} from "@solidjs/router";
import NumberPrefix from "../Transactions/prefix";
import Pagination from "../Pagination/pagination";

function AdminStatsbook(props) {

    let loadedPages = new Set()
    const [total, setTotal] = createSignal(1)
    const [page, setPage] = createSignal(1)
    const [isLoading, setIsLoading] = createSignal(true)

    const [params, setParams] = useSearchParams()
    const [stats, setStats] = createSignal([], { equals: false })
    const [statsbook, {
        mutate: mutateStats,
        refetch: refetchStats
    }] = createResource(fetchStats)

    async function fetchStats() {
        try {
            let statsbookRes = await authedAPI(`/admin/statsbook?page=${params.page || 1}`, 'GET', null)
            if (statsbookRes.error && statsbookRes.error === '2FA_REQUIRED') {
                return mutateStats({mfa: true})
            }

            setPage(+params?.page || 1)
            setTotal(statsbookRes?.pages)
            addStatsPage(statsbookRes.data)
            setIsLoading(false)
            return mutateStats(statsbookRes)
        } catch (e) {
            console.log(e)
            return mutateStats(null)
        }
    }

    function addStatsPage(data) {
        return setStats(stats => {
            stats[page()] = data
            return stats
        })
    }

    async function loadPage() {
        if (isLoading()) return
        setIsLoading(true)
        setParams({ page: page() })

        let moreData = await authedAPI(`/admin/statsbook?page=${page()}`, 'GET', null)
        if (!moreData) return setIsLoading(false)

        addStatsPage(moreData.data)
        setTotal(moreData.pages)
        loadedPages.add(page())

        setIsLoading(false)
    }

    function getColor(amount) {
        if (amount === 0) return ''
        if (amount > 0) return 'green'
        return 'red'
    }

    return (
        <>
            {statsbook()?.mfa && (
                <AdminMFA refetch={() => {
                    refetchStats()
                }}/>
            )}

            <div class='statsbook-wrapper'>
                <Show when={!statsbook.loading} fallback={<Loader/>}>
                    <div class='table-scroll'>
                        <div class='table-panel'>
                            <div className='table-header'>
                                <div className='table-column'><p>DATE</p></div>
                                <div className='table-column'><p>NPC</p></div>
                                <div className='table-column'><p>COINS</p></div>
                                <div className='table-column'><p>GIFTCARDS</p></div>
                                <div className='table-column'><p>CRYPTO</p></div>
                                <div className='table-column'><p>CC</p></div>
                                <div className='table-column'><p>SURVEYS</p></div>
                                <div className='table-column'><p>NET</p></div>
                            </div>

                            <div class='table'>
                                <For each={stats()[page()] || []}>{(stat) =>
                                    <div className='table-data'>
                                        <div className='table-column date-column'>
                                            <p>{stat?.date}</p>
                                        </div>

                                        <div className='table-column'>
                                            <p>{stat?.npc}</p>
                                        </div>

                                        <div className='table-column coin-column'>
                                            <NumberPrefix amount={stat?.coinDeposits}/>
                                            <img src='/assets/icons/coin.svg' height='15' width='16' alt=''/>
                                            <p className='white'>{(stat?.coinDeposits || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>

                                        <div className='table-column'>
                                            <p className={getColor(stat?.giftCardDeposits)}>${(stat?.giftCardDeposits || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>

                                        <div className='table-column crypto-column'>
                                            <p className="green">${(stat?.cryptoDeposits || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                            <span>/</span>
                                            <p className="red">${(stat?.cryptoWithdraws || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>

                                        <div className='table-column'>
                                            <p className={getColor(stat?.creditCardDeposits)}>${(stat?.creditCardDeposits || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>

                                        <div className='table-column'>
                                            <p className={getColor(stat?.surveysRevenue)}>${(stat?.surveysRevenue || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>

                                        <div className='table-column net-column'>
                                            <p className={getColor(stat?.netProfit)}>${(stat?.netProfit || 0)?.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</p>
                                        </div>
                                    </div>
                                }</For>
                            </div>
                        </div>
                    </div>

                    <Pagination isLoading={isLoading()} loadedPages={loadedPages} loadPage={loadPage} page={page()} total={total()} setPage={setPage} setParams={setParams}/>
                </Show>
            </div>

            <style jsx>{`
              .statsbook-wrapper {
                display: flex;
                flex-direction: column;
                                gap: 16px;
                                width: 100%;
                            }

                            .table-scroll {
                                width: 100%;
                                overflow-x: auto;
                                padding-bottom: 2px;
                                scrollbar-color: #2a3040 transparent;
                            }

                            .table-panel {
                                min-width: 930px;
                                overflow: hidden;
                                border: 1px solid rgba(255, 255, 255, 0.07);
                                border-radius: 8px;
                                background: #12151c;
                                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.03);
              }
              
              .table {
                display: flex;
                flex-direction: column;
              }

              .table-header, .table-data {
                                display: grid;
                                grid-template-columns: 120px 72px 130px 130px 150px 112px 120px 120px;
                                align-items: center;
                                column-gap: 12px;
              }

              .red {
                                color: #ff5f68;
                            }

                            .green {
                                color: #1fd65f;
                            }

                            .white {
                                color: #ffffff;
              }

              .table-data {
                                min-height: 56px;
                                padding: 0 18px;
                                background: rgba(58, 66, 80, 0.2);
                                border-top: 1px solid rgba(255, 255, 255, 0.045);
                color: #8b92a0;
                                font-size: 13px;
                                font-weight: 800;
                                transition: background .15s, color .15s;
              }

              .table-data:nth-of-type(2n) {
                                background: rgba(16, 19, 27, 0.72);
                            }

                            .table-data:hover {
                                background: rgba(31, 214, 95, 0.055);
              }

              .table-column {
                display: flex;
                align-items: center;
                gap: 8px;
                                min-width: 0;
                                white-space: nowrap;
              }

                            .table-column p,
                            .table-column span {
                                margin: 0;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            }

                            .date-column p {
                                color: #aeb6c6;
                                font-variant-numeric: tabular-nums;
                            }

                            .coin-column img {
                                flex: 0 0 auto;
                                filter: drop-shadow(0 0 8px rgba(31, 214, 95, 0.28));
                            }

                            .crypto-column span {
                                color: #596173;
                                font-weight: 900;
                            }

                            .net-column {
                justify-content: flex-end;
              }

                            .net-column p {
                                font-size: 14px;
                            }

                            .table-header {
                                min-height: 46px;
                                padding: 0 18px;
                                background: linear-gradient(180deg, #191e2a 0%, #141924 100%);
                                border-bottom: 1px solid rgba(255, 255, 255, 0.075);
                            }

              .table-header p {
                                color: #7f8798;
                                font-size: 10px;
                                font-weight: 900;
                                letter-spacing: 0.08em;
                            }

                            .table-header .net-column,
                            .table-header .table-column:last-child {
                                justify-content: flex-end;
                            }

                            @media only screen and (max-width: 700px) {
                                .table-panel {
                                    min-width: 860px;
                                }

                                .table-header, .table-data {
                                    grid-template-columns: 112px 62px 120px 120px 140px 100px 108px 108px;
                                    column-gap: 10px;
                                }

                                .table-data,
                                .table-header {
                                    padding-left: 14px;
                                    padding-right: 14px;
                                }
              }
            `}</style>
        </>
    );
}

export default AdminStatsbook;
