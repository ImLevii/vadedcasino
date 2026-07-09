import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import {useUser} from "../contexts/usercontextprovider";
import Avatar from "../components/Level/avatar";
import {getCents} from "../util/balance";
import {api, authedAPI, createNotification} from "../util/api";
import Loader from "../components/Loader/loader";
import Pagination from "../components/Pagination/pagination";
import {useSearchParams} from "@solidjs/router";
import {addPage} from "../util/pagination";
import {Title} from "@solidjs/meta";

function Affiliates(props) {

    let linkRef
    let loadedPages = new Set()
    const [users, setUsers] = createSignal([], { equals: false })
    const [total, setTotal] = createSignal(1)
    const [page, setPage] = createSignal(1)
    const [isLoading, setIsLoading] = createSignal(true)
    const [totalRef, setTotalRef] = createSignal(0)

    const [searchParams, setSearchParams] = useSearchParams()

    const [code, setCode] = createSignal(null)
    const [tempCode, setTempCode] = createSignal('')
    const [tab, setTab] = createSignal('dashboard')

    const [affiliates, { mutate: mutateAffiliates }] = createResource(fetchStats)

    async function fetchStats() {
        try {
            setPage(+searchParams?.page || 1)
            let aff = await authedAPI('/user/affiliate', 'GET', null)
            let users = await authedAPI(`/user/affiliate/users?page=${page()}`, 'GET', null)

            if (aff.affiliateCode) {
                setCode(aff.affiliateCode)
                setTempCode(aff.affiliateCode)
            }

            if (users) {
                loadedPages.add(page())
                addPage(users.data, page(), setUsers)
                setTotal(users.pages)
                setIsLoading(false)
                setTotalRef(users.total || 0)
            }

            return mutateAffiliates(aff)
        } catch (e) {
            console.log(e)
            return mutateAffiliates(null)
        }
    }

    async function loadPage() {
        if (isLoading()) return
        setIsLoading(true)
        setSearchParams({ page: page() })

        let moreData = await authedAPI(`/user/affiliate/users?page=${page()}`, 'GET', null)
        if (!moreData) return setIsLoading(false)

        addPage(moreData.data, page(), setUsers)
        setTotalRef(moreData.total)
        setTotal(moreData.pages)
        loadedPages.add(page())

        setIsLoading(false)
    }

    function copyAffLink() {
        navigator.clipboard.writeText(`https://cosmicluck.gg/?a=${code()}`);
    }

    return (
        <>
            <Title>Cosmic Luck | Affiliates</Title>

            <div class='affiliate-container fadein'>
                <div class='tabs'>
                    <button class={'tab ' + (tab() === 'program' ? 'active' : '')} onClick={() => setTab('program')}>Affiliate Program</button>
                    <button class={'tab ' + (tab() === 'dashboard' ? 'active' : '')} onClick={() => setTab('dashboard')}>Dashboard</button>
                </div>

                <Show when={!affiliates.loading} fallback={<Loader/>}>
                    <Show when={tab() === 'program'}>
                        <div class='program-banner'>
                            <img src='/assets/icons/chip.svg' width='110' height='110' alt=''/>
                            <div class='program-info'>
                                <h1 class='title'>Affiliate Program</h1>
                                <p class='desc'>
                                    Invite people to Cosmic Luck and <span class='green'>earn 10%</span> of the house edge
                                    on every wager your referrals make. The more they play, the more <span class='green'>you earn</span> —
                                    paid straight into your affiliate wallet.
                                </p>
                                <button class='primary-btn' onClick={() => setTab('dashboard')}>Open Dashboard</button>
                            </div>
                        </div>
                    </Show>

                    <Show when={tab() === 'dashboard'}>
                        <div class='dashboard'>
                            <div class='main'>
                                <div class='stat-cards'>
                                    <div class='stat-card'>
                                        <p class='stat-value white'>{totalRef() || 0}</p>
                                        <p class='stat-label'>Total Referrals</p>
                                    </div>
                                    <div class='stat-card'>
                                        <p class='stat-value white align'>
                                            <img src='/assets/icons/coin.svg' height='16' width='16' alt=''/>
                                            {(affiliates()?.totalWagered || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                        <p class='stat-label'>Referral Wagers</p>
                                    </div>
                                    <div class='stat-card'>
                                        <p class='stat-value green align'>
                                            <img src='/assets/icons/coin.svg' height='16' width='16' alt=''/>
                                            {(affiliates()?.totalEarnings || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                        <p class='stat-label'>Total Commission</p>
                                    </div>
                                </div>

                                <div class='table'>
                                    <div class='table-header'>
                                        <p class='col-index'>Index</p>
                                        <p class='col-user'>User</p>
                                        <p class='col-num'>Wager</p>
                                        <p class='col-num'>Share</p>
                                        <p class='col-date'>Start</p>
                                        <p class='col-status'>Status</p>
                                    </div>

                                    <For each={users()[page()]}>{(aff, index) => (
                                        <div class='table-row'>
                                            <p class='col-index'>{(page() - 1) * 6 + index() + 1}</p>
                                            <div class='col-user user-cell'>
                                                <Avatar id={aff?.id} xp={aff.xp} height='26'/>
                                                <p class='white'>{aff?.username || 'Anonymous'}</p>
                                            </div>
                                            <p class='col-num align'>
                                                <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                                <span class='white'>{(aff?.totalWagered || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                            </p>
                                            <p class='col-num align'>
                                                <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                                <span class='green'>{(aff?.totalEarnings || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                            </p>
                                            <p class='col-date'>{new Date(aff.affiliatedAt).toLocaleDateString()}</p>
                                            <div class='col-status'>
                                                <span class={'status-pill ' + ((aff?.totalWagered || 0) > 0 ? 'active' : 'inactive')}>
                                                    {(aff?.totalWagered || 0) > 0 ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    )}</For>

                                    <Pagination isLoading={isLoading()} loadedPages={loadedPages} loadPage={loadPage} page={page()} total={total()} setPage={setPage} setParams={setSearchParams}/>
                                </div>
                            </div>

                            <div class='sidebar'>
                                <div class='tier-card'>
                                    <img src='/assets/icons/chip.svg' width='64' height='64' alt=''/>
                                    <div class='tier-info'>
                                        <p class='tier-name'>Tier 1 (10%)</p>
                                        <p class='side-label'>Running Balance</p>
                                        <p class='align green side-value'>
                                            <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                                            {(affiliates()?.totalEarnings || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                        <p class='side-label'>Affiliate Wallet</p>
                                        <p class='align white side-value'>
                                            <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                                            {(affiliates()?.unclaimedEarnings || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                    </div>
                                </div>

                                <div class='progress-block'>
                                    <p class='progress-title white'>{totalRef() || 0} / 25</p>
                                    <p class='side-label'>Min referred users to reach next tier</p>
                                    <div class='progress'>
                                        <div class='progress-fill' style={{width: `${Math.min(100, (totalRef() || 0) / 25 * 100)}%`}}/>
                                    </div>
                                </div>

                                <div class='progress-block'>
                                    <p class='progress-title white align'>
                                        <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                                        {(affiliates()?.totalWagered || 0)?.toLocaleString(undefined, {maximumFractionDigits: 2})} / 10,000.00
                                    </p>
                                    <p class='side-label'>Min referred wagers to reach next tier</p>
                                    <div class='progress'>
                                        <div class='progress-fill' style={{width: `${Math.min(100, (affiliates()?.totalWagered || 0) / 10000 * 100)}%`}}/>
                                    </div>
                                </div>

                                <div class='input-block'>
                                    <p class='side-label'>Your Referral Code</p>
                                    <div class='input-row'>
                                        <input type='text' placeholder='Create a referral code...' value={tempCode()} onInput={(e) => setTempCode(e.target.value)}/>
                                        <button class='update-btn' onClick={async () => {
                                            let res = await authedAPI('/user/affiliate/code', 'POST', JSON.stringify({
                                                code: tempCode()
                                            }), true)

                                            if (res.success) {
                                                createNotification('success', `Successfully changed your referral code to ${tempCode()}`)
                                                setCode(tempCode())
                                            }
                                        }}>Update</button>
                                    </div>
                                </div>

                                <div class='input-block'>
                                    <p class='side-label'>Referral Link</p>
                                    <div class='input-row link-row' onClick={() => {
                                        copyAffLink()
                                        createNotification('success', 'Copied your referral link.')
                                    }}>
                                        <p ref={linkRef} class='link-text'>{code() ? `https://cosmicluck.gg/?a=${code()}` : `Set a referral code first!`}</p>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="#8b92a0">
                                            <path d="M8.62259 2.2981H1.52163C0.681259 2.2981 0 2.97936 0 3.81974V13.964C0 14.8043 0.681259 15.4856 1.52163 15.4856H8.62259C9.46297 15.4856 10.1442 14.8043 10.1442 13.964V3.81974C10.1442 2.97936 9.46297 2.2981 8.62259 2.2981Z"/>
                                            <path d="M13.1876 1.79089V11.9351C13.1864 12.3383 13.0257 12.7246 12.7406 13.0097C12.4555 13.2948 12.0692 13.4555 11.666 13.4567H11.1588V3.81974C11.1588 3.14713 10.8916 2.50208 10.416 2.02647C9.94036 1.55087 9.2953 1.28368 8.6227 1.28368H3.13467C3.23932 0.987696 3.43295 0.731325 3.68902 0.549713C3.9451 0.368101 4.25107 0.270139 4.56501 0.269257H11.666C12.0692 0.270461 12.4555 0.431162 12.7406 0.716263C13.0257 1.00136 13.1864 1.3877 13.1876 1.79089Z"/>
                                        </svg>
                                    </div>
                                </div>

                                <button class='primary-btn claim-btn' onClick={async () => {
                                    if (affiliates()?.unclaimedEarnings < affiliates()?.minClaim) {
                                        return createNotification('error', `You need a minimum of ${affiliates()?.minClaim} Coins to claim your affiliates.`)
                                    }

                                    let res = await authedAPI('/user/affiliate/claim', 'POST', null, true)

                                    if (res.success) {
                                        createNotification('success', 'Successfully claimed your affiliate earnings.')

                                        let newAffiliates = {...affiliates()}
                                        newAffiliates.unclaimedEarnings = 0

                                        mutateAffiliates(newAffiliates)
                                    }
                                }}>
                                    Claim&nbsp;
                                    <img src='/assets/icons/coin.svg' height='14' width='14' alt=''/>
                                    &nbsp;{(affiliates()?.unclaimedEarnings || 0)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </button>
                            </div>
                        </div>
                    </Show>
                </Show>
            </div>

            <style jsx>{`
              .affiliate-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }

              .tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 25px;
              }

              .tab {
                height: 36px;
                padding: 0 16px;

                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;

                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;

                cursor: pointer;
                transition: all .2s;
              }

              .tab:hover {
                color: #FFF;
              }

              .tab.active {
                color: #FFF;
                background: #2c3340;
                border-color: #3a4250;
              }

              .program-banner {
                display: flex;
                align-items: center;
                gap: 30px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 30px;
              }

              .program-info {
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
              }

              .title {
                margin: unset;
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 28px;
                font-weight: 700;
              }

              .desc {
                color: #8b92a0;
                font-size: 14px;
                font-weight: 600;
                line-height: 1.6;
                max-width: 640px;
              }

              .green {
                color: #1fd65f !important;
              }

              .white {
                color: #FFF;
              }

              .align {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .dashboard {
                display: flex;
                gap: 15px;
                align-items: flex-start;
              }

              .main {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 15px;
              }

              .stat-cards {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
              }

              .stat-card {
                display: flex;
                flex-direction: column;
                gap: 6px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 16px;
              }

              .stat-value {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 17px;
                font-weight: 700;
              }

              .stat-label {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
              }

              .table {
                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 6px 15px 15px 15px;
              }

              .table-header, .table-row {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 5px;

                color: #8b92a0;
                font-size: 13px;
                font-weight: 600;
              }

              .table-header {
                font-size: 12px;
                font-weight: 700;
                border-bottom: 1px solid #2c3340;
              }

              .table-row:nth-child(odd) {
                background: rgba(18, 21, 28, 0.5);
                border-radius: 5px;
              }

              .col-index {
                width: 45px;
              }

              .col-user {
                flex: 1.4;
                min-width: 0;
              }

              .user-cell {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .col-num {
                flex: 1;
              }

              .col-date {
                flex: 1;
              }

              .col-status {
                width: 80px;
                display: flex;
                justify-content: flex-end;
              }

              .status-pill {
                padding: 4px 10px;
                border-radius: 3px;

                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
              }

              .status-pill.active {
                background: rgba(31, 214, 95, 0.15);
                border: 1px solid rgba(31, 214, 95, 0.4);
                color: #1fd65f;
              }

              .status-pill.inactive {
                background: rgba(255, 177, 62, 0.1);
                border: 1px solid rgba(255, 177, 62, 0.35);
                color: #ffb13e;
              }

              .sidebar {
                width: 300px;
                min-width: 300px;

                display: flex;
                flex-direction: column;
                gap: 12px;
              }

              .tier-card {
                display: flex;
                gap: 16px;

                border-radius: 8px;
                background: linear-gradient(135deg, rgba(31, 214, 95, 0.1) 0%, rgba(18, 21, 28, 0.6) 100%), #1a1f29;
                border: 1px solid rgba(31, 214, 95, 0.25);
                padding: 16px;
              }

              .tier-info {
                display: flex;
                flex-direction: column;
                gap: 3px;
              }

              .tier-name {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 4px;
              }

              .side-label {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .side-value {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .progress-block {
                display: flex;
                flex-direction: column;
                gap: 6px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 14px 16px;
              }

              .progress-title {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
              }

              .progress {
                width: 100%;
                height: 5px;
                border-radius: 2525px;
                background: #12151c;
                border: 1px solid #2c3340;
                margin-top: 4px;
              }

              .progress-fill {
                height: 100%;
                border-radius: 2525px;
                background: linear-gradient(90deg, #18c255 0%, #1fd65f 60%, #45e57f 100%);
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.5);
              }

              .input-block {
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .input-row {
                display: flex;
                align-items: center;
                gap: 8px;

                border-radius: 5px;
                background: #12151c;
                border: 1px solid #2c3340;
                padding: 0 8px 0 12px;
                height: 42px;
              }

              .input-row input {
                flex: 1;
                min-width: 0;
                height: 100%;

                background: unset;
                outline: unset;
                border: unset;

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 600;
              }

              .update-btn {
                height: 28px;
                padding: 0 12px;

                outline: unset;
                border: unset;
                border-radius: 3px;
                background: #2c3340;

                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;

                cursor: pointer;
                transition: all .2s;
              }

              .update-btn:hover {
                color: #FFF;
              }

              .link-row {
                cursor: pointer;
              }

              .link-text {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;

                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
              }

              .primary-btn {
                display: flex;
                align-items: center;
                justify-content: center;

                height: 44px;
                padding: 0 22px;

                outline: unset;
                border: unset;
                border-radius: 8px;
                background: #1fd65f;

                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;

                cursor: pointer;
                transition: all .2s;
              }

              .primary-btn:hover {
                background: #45e57f;
                box-shadow: 0 0 18px rgba(31, 214, 95, 0.35);
              }

              .claim-btn {
                width: 100%;
              }

              @media only screen and (max-width: 1000px) {
                .affiliate-container {
                  padding-bottom: 90px;
                }

                .dashboard {
                  flex-direction: column-reverse;
                }

                .sidebar {
                  width: 100%;
                  min-width: 0;
                }

                .stat-cards {
                  grid-template-columns: 1fr;
                }

                .col-date, .col-index {
                  display: none;
                }
              }
            `}</style>
        </>
    );
}

export default Affiliates;
