import {A, useNavigate} from "@solidjs/router";
import {createResource, createSignal, For, Show} from "solid-js";
import {authedAPI, createNotification} from "../util/api";
import {resolveImageSrc} from "../util/image";
import CaseTitle from "../components/Cases/casetitle";
import Loader from "../components/Loader/loader";

function CommunityCases(props) {

    const navigate = useNavigate()
    const [list, {refetch: refetchList}] = createResource(fetchCases)
    const [mine, {refetch: refetchMine}] = createResource(fetchMine)
    const [view, setView] = createSignal('all')
    const [likedCases, setLikedCases] = createSignal({})
    const [search, setSearch] = createSignal('')
    const [sortBy, setSortBy] = createSignal('openings')

    async function fetchCases() {
        try {
            return await authedAPI('/cases/community', 'GET', null)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    async function fetchMine() {
        try {
            let res = await authedAPI('/cases/community/mine', 'GET', null)
            return res?.cases ? res : null
        } catch (e) {
            console.log(e)
            return null
        }
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    function displayedCases() {
        let cases = view() === 'mine' ? (mine()?.cases || []) : (list()?.cases || [])

        let q = search().trim().toLowerCase()
        if (q) cases = cases.filter(c => c.name?.toLowerCase().includes(q) || c.creatorName?.toLowerCase().includes(q))

        let sorted = cases.slice()
        switch (sortBy()) {
            case 'likes':
                sorted.sort((a, b) => likeCount(b) - likeCount(a))
                break
            case 'newest':
                sorted.sort((a, b) => b.id - a.id)
                break
            case 'price-desc':
                sorted.sort((a, b) => b.price - a.price)
                break
            case 'price-asc':
                sorted.sort((a, b) => a.price - b.price)
                break
            default:
                sorted.sort((a, b) => b.openCount - a.openCount)
        }

        return sorted
    }

    function maxOpenCount() {
        let cases = view() === 'mine' ? (mine()?.cases || []) : (list()?.cases || [])
        return Math.max(1, ...cases.map(c => c.openCount || 0))
    }

    function heat(c) {
        return Math.min(1, (c.openCount || 0) / maxOpenCount())
    }

    function likeCount(c) {
        let local = likedCases()[c.id]
        return local?.likeCount ?? c.likeCount
    }

    function isLiked(c) {
        let local = likedCases()[c.id]
        if (local) return local.liked
        return (list()?.likedCaseIds || []).includes(c.id)
    }

    async function toggleLike(c, event) {
        event.preventDefault()
        event.stopPropagation()

        let res = await authedAPI(`/cases/community/${c.id}/like`, 'POST', null, true)
        if (typeof res?.liked === 'boolean') {
            setLikedCases({...likedCases(), [c.id]: res})
        }
    }

    async function claimEarnings() {
        let res = await authedAPI('/cases/community/claim', 'POST', null, true)
        if (res?.success) {
            createNotification('success', `You claimed ${coins(res.amount)} coins of case earnings!`)
            refetchMine()
        }
    }

    return (
        <>
            <div class='community-container fadein'>

                <div class='banner'>
                  <span class='banner-icon'><img src='/assets/icons/cases_explosion.svg' height='20' alt=''/></span>
                  <div class='banner-copy'>
                    <span>Creator earnings</span>
                    <p>Earn <strong>commission</strong> from every opening of your custom cases.</p>
                  </div>
                  <span class='banner-tag'>7 day claim window</span>
                </div>

                <div class='top-bar'>
                  <div class='page-identity'>
                    <button class='back-link' onClick={() => navigate('/cases')}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
                        <path d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z" fill="currentColor"/>
                      </svg>
                      Official Cases
                    </button>
                    <div>
                      <span>Creator marketplace</span>
                      <h1>Community Cases</h1>
                    </div>
                  </div>

                    <div class='toolbar'>
                        <div class='search-wrap'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" fill="#5c6474"/>
                            </svg>
                            <input type='text' placeholder='Search cases or creators...' value={search()}
                                   onInput={(e) => setSearch(e.target.value)}/>
                        </div>

                        <select class='sort-select' value={sortBy()} onChange={(e) => setSortBy(e.target.value)}>
                            <option value='openings'>Most Opened</option>
                            <option value='likes'>Most Liked</option>
                            <option value='newest'>Newest</option>
                            <option value='price-desc'>Price: High to Low</option>
                            <option value='price-asc'>Price: Low to High</option>
                        </select>
                          <span class='result-count'>{displayedCases().length} cases</span>
                    </div>

                    <div class='top-actions'>
                        <button class='create-btn' onClick={() => navigate('/cases/community/create')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                            </svg>
                            Create Custom Case
                        </button>
                        <button class={'view-btn ' + (view() === 'mine' ? 'active' : '')}
                                onClick={() => setView(view() === 'mine' ? 'all' : 'mine')}>
                            {view() === 'mine' ? 'View All Cases' : 'View Your Cases'}
                        </button>
                    </div>
                </div>

                <Show when={!list.loading} fallback={<Loader/>}>
                    <div class='layout'>
                        <div class='grid'>
                            <For each={displayedCases()}>
                                {(c) => (
                                    <div class='case-card'>
                                        <button class={'like-btn ' + (isLiked(c) ? 'liked' : '')}
                                                onClick={(e) => toggleLike(c, e)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                                                 fill={isLiked(c) ? 'currentColor' : 'none'} stroke='currentColor' stroke-width='2'>
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                            {likeCount(c)}
                                        </button>

                                        <CaseTitle name={c.name}/>

                                        <div class='cost'>
                                            <img src='/assets/icons/coin.svg' height='13' alt=''/>
                                            <p>{coins(c.price)}</p>
                                        </div>

                                        <div class='img-wrap'>
                                            <img class='case-img' src={resolveImageSrc(c.img, '/public/cases/radiation-case.png')} alt=''/>
                                            <div class='img-glow'/>
                                        </div>

                                        <Show when={view() !== 'mine'}>
                                            <p class='case-creator'>by <span>{c.creatorName || 'Unknown'}</span></p>
                                        </Show>

                                        <div class='rarity-track'>
                                            <span class='track-fill'/>
                                            <span class='track-marker' style={{left: `${18 + heat(c) * 68}%`}}/>
                                        </div>

                                        <p class='opened'>Opened <b>{(c.openCount || 0).toLocaleString()}</b> times</p>

                                        <div class='open-case'>OPEN CASE</div>

                                        <div class='earned'>
                                            Earned&nbsp;
                                            <img src='/assets/icons/coin.svg' height='11' width='11' alt=''/>
                                            &nbsp;{coins(c.earned)}
                                        </div>

                                        <div class='bg'/>

                                        <A href={`/cases/${c.slug}`} class='gamemode-link'></A>
                                    </div>
                                )}
                            </For>

                            <Show when={!displayedCases().length}>
                                <div class='empty'>
                                    <img src='/assets/icons/cases_explosion.svg' height='34' alt=''/>
                                    <p>{view() === 'mine' ? 'You haven\'t created any cases yet.' : search() ? 'No cases match your search.' : 'No community cases yet. Be the first to create one!'}</p>
                                    <Show when={view() === 'mine' || !search()}>
                                        <button class='create-btn' onClick={() => navigate('/cases/community/create')}>Create Custom Case</button>
                                    </Show>
                                </div>
                            </Show>
                        </div>

                        <div class='sidebar'>
                            <Show when={view() === 'mine'} fallback={
                                <>
                                    <div class='stat-block'>
                                        <p class='side-label'>
                                            Available Earnings
                                            <span class='info-dot' title='Commission from your cases. Expires 7 days after each unbox.'>ⓘ</span>
                                        </p>
                                        <p class='side-amount align'>
                                            <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                            {coins(mine()?.availableEarnings)}
                                        </p>
                                    </div>
                                    <button class='claim-btn' onClick={claimEarnings}>
                                        Claim Earnings
                                    </button>
                                    <button class='overview-btn' onClick={() => setView('mine')}>Your Cases Overview</button>
                                    <p class='side-note'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#1fd65f"/>
                                        </svg>
                                        &nbsp;Earnings expire 7 days after each unbox — claim them in time!
                                    </p>
                                </>
                            }>
                                <div class='stat-block'>
                                    <p class='side-label'>Total Openings</p>
                                    <p class='side-amount gold'>{(mine()?.totalOpenings || 0).toLocaleString()} Times</p>
                                </div>

                                <div class='stat-block'>
                                    <p class='side-label'>Total Earnings</p>
                                    <p class='side-amount green align'>
                                        <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                        {coins(mine()?.totalEarnings)}
                                    </p>
                                </div>

                                <div class='stat-block row'>
                                    <div>
                                        <p class='side-label'>Available Earnings ⓘ</p>
                                        <p class='side-amount align'>
                                            <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                            {coins(mine()?.availableEarnings)}
                                        </p>
                                    </div>
                                    <button class='claim-btn small' onClick={claimEarnings}>Claim</button>
                                </div>

                                <Show when={mine()?.mostOpened}>
                                    <div class='stat-block row'>
                                        <div>
                                            <p class='side-label'>Most Opened Case</p>
                                            <p class='side-amount gold'>{mine()?.mostOpened?.name}</p>
                                        </div>
                                        <img src={resolveImageSrc(mine()?.mostOpened?.img)} height='48' alt=''/>
                                    </div>
                                </Show>

                                <Show when={mine()?.mostLiked}>
                                    <div class='stat-block row'>
                                        <div>
                                            <p class='side-label'>Most Liked Case</p>
                                            <p class='side-amount gold'>{mine()?.mostLiked?.name}</p>
                                        </div>
                                        <img src={resolveImageSrc(mine()?.mostLiked?.img)} height='48' alt=''/>
                                    </div>
                                </Show>

                                <p class='side-note'>Earnings expire 7 days after each unbox — claim them in time!</p>
                            </Show>
                        </div>
                    </div>
                </Show>
            </div>

            <style jsx>{`
              .community-container {
                width: 100%;
                max-width: 1480px;
                margin: 0 auto;
                padding: 10px 0 48px;
                display: flex;
                flex-direction: column;
                gap: 18px;
              }

              .banner {
                width: 100%;
                min-height: 58px;
                padding: 10px 14px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                gap: 11px;
                border-radius: 10px;
                background: radial-gradient(circle at 8% 0%, rgba(31,214,95,.15), transparent 28%), linear-gradient(135deg, rgba(17,36,27,.92), rgba(8,17,15,.98));
                border: 1px solid rgba(31, 214, 95, 0.22);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 12px 28px rgba(0,0,0,.2);
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
              }

              .banner-icon {
                width: 36px;
                height: 36px;
                display: grid;
                place-items: center;
                flex: 0 0 auto;
                border-radius: 8px;
                background: rgba(31,214,95,.1);
                border: 1px solid rgba(31,214,95,.26);
              }

              .banner-icon img { filter: drop-shadow(0 0 8px rgba(31,214,95,.5)); }

              .banner-copy { display: flex; flex-direction: column; gap: 2px; }
              .banner-copy > span {
                color: #5ce78e;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }
              .banner-copy p { color: #cfd7e2; font-size: 12px; font-weight: 600; }
              .banner-copy strong { color: #fff; font-weight: 800; }

              .banner-tag {
                margin-left: auto;
                padding: 7px 10px;
                border-radius: 6px;
                background: rgba(31,214,95,.08);
                border: 1px solid rgba(31,214,95,.18);
                color: #69da92;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                white-space: nowrap;
              }

              .gold {
                color: #1fd65f;
                font-weight: 700;
              }

              .green {
                color: #1fd65f !important;
              }

              .top-bar {
                display: grid;
                grid-template-columns: minmax(210px, auto) minmax(320px, 1fr) auto;
                align-items: center;
                gap: 16px;
                padding: 14px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,.06);
                background: linear-gradient(145deg, rgba(17,22,32,.96), rgba(8,12,19,.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 14px 34px rgba(0,0,0,.22);
              }

              .page-identity {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
              }

              .page-identity > div {
                padding-left: 12px;
                border-left: 1px solid rgba(255,255,255,.08);
              }

              .page-identity span {
                color: #687284;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .page-identity h1 {
                margin: 2px 0 0;
                color: #fff;
                font-size: 17px;
                font-weight: 800;
                white-space: nowrap;
              }

              .back-link {
                display: flex;
                align-items: center;
                gap: 7px;

                outline: unset;
                border: unset;
                background: transparent;
                padding: 0;

                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
                cursor: pointer;
                transition: color .2s;
              }

              .back-link:hover {
                color: #FFF;
              }

              .toolbar {
                flex: 1;
                min-width: 0;
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: center;
              }

              .search-wrap {
                display: flex;
                align-items: center;
                gap: 8px;

                width: min(320px, 100%);
                height: 40px;
                padding: 0 12px;
                box-sizing: border-box;

                border-radius: 7px;
                background: rgba(4,7,12,.58);
                border: 1px solid rgba(255,255,255,.08);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
                transition: border-color .2s, background .2s, box-shadow .2s;
              }

              .search-wrap:focus-within {
                border-color: rgba(31, 214, 95, 0.45);
                background: rgba(7,14,11,.72);
                box-shadow: 0 0 0 2px rgba(31,214,95,.08);
              }

              .search-wrap input {
                flex: 1;
                min-width: 0;
                outline: unset;
                border: unset;
                background: transparent;
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 600;
              }

              .search-wrap input::placeholder {
                color: #5c6474;
              }

              .sort-select {
                height: 40px;
                padding: 0 12px;
                outline: unset;
                border-radius: 7px;
                background: rgba(4,7,12,.58);
                border: 1px solid rgba(255,255,255,.08);
                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: border-color .2s;
              }

              .sort-select:hover {
                border-color: rgba(31, 214, 95, 0.45);
              }

              .result-count {
                color: #687284;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                white-space: nowrap;
              }

              .top-actions {
                display: flex;
                gap: 8px;
              }

              .create-btn {
                display: flex;
                align-items: center;
                gap: 7px;

                height: 40px;
                padding: 0 16px;
                outline: unset;
                border: unset;
                border-radius: 7px;
                background: linear-gradient(180deg, #24df68, #11b950);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 8px 20px rgba(31,214,95,.12);
                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                transition: all .2s;
              }

              .create-btn:hover {
                background: #45e57f;
                box-shadow: 0 0 16px rgba(31, 214, 95, 0.3);
              }

              .view-btn {
                height: 40px;
                padding: 0 16px;
                outline: unset;
                border-radius: 7px;
                background: rgba(31, 214, 95, 0.08);
                border: 1px solid rgba(31, 214, 95, 0.45);
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s;
              }

              .view-btn:hover, .view-btn.active {
                background: rgba(31, 214, 95, 0.2);
              }

              .layout {
                display: flex;
                gap: 18px;
                align-items: flex-start;
              }

              .grid {
                flex: 1;
                min-width: 0;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 15px;
              }

              .empty {
                grid-column: 1 / -1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 14px;

                padding: 70px 0;
                border-radius: 8px;
                background: rgba(18, 21, 28, 0.5);
                border: 1px dashed #2c3340;
                color: #8b92a0;
                font-size: 14px;
                font-weight: 600;
              }

              .case-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;

                min-height: 344px;
                box-sizing: border-box;
                border-radius: 10px;
                background: radial-gradient(circle at 50% 42%, rgba(31,214,95,.055), transparent 35%), linear-gradient(180deg, rgba(22, 28, 38, 0.94) 0%, rgba(12, 16, 24, 0.98) 66%, rgba(7, 10, 16, 1) 100%);
                border: 1px solid rgba(255, 255, 255, 0.06);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 14px 34px rgba(0, 0, 0, 0.24);
                padding: 16px 14px 14px;
                position: relative;
                overflow: hidden;
                isolation: isolate;
                cursor: pointer;
                transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
              }

              .case-card:hover {
                border-color: rgba(31, 214, 95, 0.24);
                transform: translateY(-3px);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 20px 42px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(31, 214, 95, 0.035);
              }

              .cost {
                min-width: 116px;
                min-height: 29px;
                padding: 0 15px;
                margin: 3px 0 6px 0;

                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;

                background: linear-gradient(180deg, rgba(18,84,49,.95), rgba(9,57,32,.98));
                border: 1px solid rgba(31,214,95,.42);
                border-radius: 6px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 7px 18px rgba(0,0,0,.22);
                position: relative;
                z-index: 2;

                color: white;
                font-weight: 700;
                font-size: 13px;
                text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
              }

              .cost:before {
                content: none;
              }

              .like-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 2;

                display: flex;
                align-items: center;
                gap: 4px;

                padding: 5px 8px;
                outline: unset;
                border-radius: 4px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s;
              }

              .like-btn:hover {
                color: #ff5977;
              }

              .like-btn.liked {
                color: #ff5977;
                border-color: rgba(255, 89, 119, 0.5);
              }

              .img-wrap {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
              }

              .img-glow {
                position: absolute;
                inset: 10% 20%;
                z-index: -1;
                border-radius: 50%;
                background: radial-gradient(50% 50% at 50% 50%, rgba(31, 214, 95, 0.14), transparent 70%);
                opacity: 0;
                transition: opacity .25s ease;
              }

              .case-card:hover .img-glow {
                opacity: 1;
              }

              .case-img {
                height: 120px;
                max-width: 100%;
                object-fit: contain;
                filter: drop-shadow(0 14px 12px rgba(0, 0, 0, 0.4));
                transition: transform .22s ease, filter .22s ease;
              }

              .case-card:hover .case-img {
                transform: translateY(-4px) scale(1.04);
                filter: drop-shadow(0 18px 16px rgba(31, 214, 95, 0.13)) drop-shadow(0 14px 14px rgba(0, 0, 0, 0.45));
              }

              .case-creator {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
                margin-top: -4px;
              }

              .case-creator span {
                color: #c6ccd8;
              }

              .rarity-track {
                width: calc(100% - 8px);
                height: 16px;
                margin: 2px 0 4px;
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
              }

              .rarity-track:before {
                content: '';
                width: 100%;
                height: 4px;
                border-radius: 99px;
                background: rgba(48, 59, 49, 0.75);
              }

              .track-fill {
                position: absolute;
                left: 0;
                right: 0;
                height: 4px;
                border-radius: 99px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.24), rgba(234, 207, 79, 0.55), rgba(255, 85, 113, 0.9));
                opacity: .82;
              }

              .track-marker {
                position: absolute;
                top: 0;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #dce2ec;
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
                transition: left .3s ease;
              }

              .opened {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 500;
              }

              .opened b {
                color: #FFF;
              }

              .open-case {
                width: 100%;
                height: 40px;
                margin-top: 2px;
                border-radius: 7px;
                background: linear-gradient(180deg, #1bd861 0%, #0db950 100%);
                border: 1px solid rgba(75,242,137,.35);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 8px 22px rgba(8, 209, 90, 0.12);

                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                z-index: 1;

                color: #fff;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .2px;
                transition: filter .18s ease;
              }

              .case-card:hover .open-case {
                filter: brightness(1.12);
              }

              .earned {
                display: flex;
                align-items: center;
                justify-content: center;

                width: calc(100% + 28px);
                margin: 8px -14px -14px;
                padding: 8px 0;

                border-radius: 0 0 8px 8px;
                background: rgba(31, 214, 95, 0.07);
                border-top: 1px solid rgba(31, 214, 95, 0.25);
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                position: relative;
                z-index: 1;
              }

              .bg {
                position: absolute;
                height: 100%;
                width: 100%;
                top: 0;
                left: 0;
                z-index: -1;

                opacity: 0.12;
                background-size: cover;
                background-image: url("/assets/art/casebg.png");
              }

              .bg:after {
                content: '';
                position: absolute;
                inset: 38% 0 38px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.00), rgba(31, 214, 95, 0.12), rgba(255, 214, 88, 0.10), rgba(31, 214, 95, 0.00));
                opacity: 0;
                transition: opacity .22s ease;
              }

              .case-card:hover .bg:after {
                opacity: 1;
              }

              .sidebar {
                width: 280px;
                min-width: 280px;
                position: sticky;
                top: 18px;

                display: flex;
                flex-direction: column;
                gap: 12px;

                border-radius: 10px;
                background: linear-gradient(145deg, rgba(18,24,34,.96), rgba(8,12,19,.98));
                border: 1px solid rgba(255,255,255,.07);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 16px 36px rgba(0,0,0,.25);
                padding: 18px;
                box-sizing: border-box;
              }

              .stat-block {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 12px;
                border-radius: 7px;
                background: rgba(255,255,255,.035);
                border: 1px solid rgba(255,255,255,.07);
              }

              .stat-block.row {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
              }

              .side-label {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
              }

              .info-dot {
                color: #5c6474;
                font-size: 11px;
                cursor: help;
              }

              .side-amount {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 17px;
                font-weight: 700;
              }

              .side-amount.gold {
                color: #1fd65f;
              }

              .align {
                display: flex;
                align-items: center;
                gap: 5px;
              }

              .claim-btn {
                height: 38px;
                padding: 0 16px;
                outline: unset;
                border: unset;
                border-radius: 5px;
                background: #1fd65f;
                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s;
              }

              .claim-btn:hover {
                background: #45e57f;
              }

              .claim-btn.small {
                height: 32px;
                padding: 0 14px;
              }

              .overview-btn {
                height: 38px;
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

              .overview-btn:hover {
                color: #FFF;
              }

              .side-note {
                display: flex;
                align-items: flex-start;
                gap: 4px;

                padding: 10px 12px;
                border-radius: 5px;
                background: rgba(31, 214, 95, 0.05);
                border: 1px solid rgba(31, 214, 95, 0.3);
                color: #5cd88a;
                font-size: 11px;
                font-weight: 600;
                line-height: 1.5;
              }

              @media only screen and (max-width: 1180px) {
                .top-bar {
                  grid-template-columns: 1fr auto;
                }

                .toolbar {
                  grid-column: 1 / -1;
                  grid-row: 2;
                }
              }

              @media only screen and (max-width: 1000px) {
                .layout {
                  flex-direction: column-reverse;
                }

                .sidebar {
                  width: 100%;
                  min-width: 0;
                  position: static;
                }

                .toolbar {
                  width: 100%;
                  justify-content: stretch;
                }

                .search-wrap {
                  width: 100%;
                }
              }

              @media only screen and (max-width: 680px) {
                .community-container { gap: 12px; padding-bottom: 36px; }
                .banner-tag, .result-count { display: none; }
                .banner-copy p { font-size: 10px; line-height: 1.4; }
                .top-bar { display: flex; flex-direction: column; align-items: stretch; padding: 12px; }
                .page-identity, .top-actions { justify-content: space-between; }
                .page-identity > div { margin-left: auto; }
                .toolbar { order: 3; flex-wrap: wrap; }
                .search-wrap { flex-basis: 100%; }
                .sort-select { flex: 1; }
                .top-actions > * { flex: 1; padding: 0 10px; justify-content: center; }
                .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
                .case-card { min-height: 330px; padding-left: 10px; padding-right: 10px; }
                .earned { width: calc(100% + 20px); margin-left: -10px; margin-right: -10px; }
              }
            `}</style>
        </>
    );
}

export default CommunityCases;
