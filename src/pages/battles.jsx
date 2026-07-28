import {createEffect, createSignal, For, Show, onCleanup} from "solid-js";
import BattleRow from "../components/Battles/battlerow";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import {A} from "@solidjs/router";
import {useUser} from "../contexts/usercontextprovider";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {fillEmptySlots} from "../util/battleutil";
import {Meta, Title} from "@solidjs/meta";

function Battles(props) {

    const [toggle, setToggle] = createSignal('ALL')
    const [sortByPrice, setSortByPrice] = createSignal(true)
    const [modeFilter, setModeFilter] = createSignal('ALL')
    const [playersFilter, setPlayersFilter] = createSignal('ALL')
    const [condFilter, setCondFilter] = createSignal('ALL')
    const [battles, setBattles] = createSignal(null, { equals: false })
    const [user] = useUser()

    let hasConnected = false
    const [ws] = useWebsocket()

    createEffect(() => {
        if (ws() && ws().connected && !hasConnected) {
            unsubscribeFromGames(ws())
            subscribeToGame(ws(), 'battles')

            ws().on('battles:push', (b) => {
                let curBattles = battles() || []
                b.forEach((battle) => battle.players = fillEmptySlots(battle.playersPerTeam * battle.teams, battle.players))
                setBattles([...b, ...curBattles])
            })

            ws().on('battles:join', (id, user) => {
                let battleIndex = battles()?.findIndex(b => id === b.id)
                if (battleIndex < 0) return

                let curBattle = battles()[battleIndex]
                if (id !== curBattle.id) return

                curBattle.players[user.slot - 1] = user
                setBattles([...battles().slice(0, battleIndex), {...curBattle}, ...battles().slice(battleIndex + 1)])
            })

            ws().on('battles:start', (id, winnerTeam) => {
                let battleIndex = battles()?.findIndex(b => id === b.id)
                if (battleIndex < 0) return

                let curBattle = battles()[battleIndex]
                if (id !== curBattle.id) return

                curBattle.startedAt = Date.now()
                setBattles([...battles().slice(0, battleIndex), {...curBattle}, ...battles().slice(battleIndex + 1)])
            })

              ws().on('battles:round', (id, roundNum) => {
                let battleIndex = battles()?.findIndex(b => id === b.id)
                if (battleIndex < 0) return

                let curBattle = battles()[battleIndex]
                if (id !== curBattle.id) return

                // Keep live cards in sync with currently spinning case.
                curBattle.round = roundNum
                if (!curBattle.startedAt) {
                  curBattle.startedAt = Date.now()
                }

                setBattles([...battles().slice(0, battleIndex), {...curBattle}, ...battles().slice(battleIndex + 1)])
              })

            ws().on('battles:ended', (id, winnerTeam) => {
                let battleIndex = battles()?.findIndex(b => id === b.id)
                if (battleIndex < 0) return

                let curBattle = battles()[battleIndex]
                if (id !== curBattle.id) return

                curBattle.endedAt = Date.now()
                curBattle.winnerTeam = +winnerTeam
                setBattles([...battles().slice(0, battleIndex), {...curBattle}, ...battles().slice(battleIndex + 1)])
            })

            hasConnected = true
        }

        hasConnected = !!ws()?.connected
    })

        onCleanup(() => {
          if (!ws()) return

          ws().off('battles:push')
          ws().off('battles:join')
          ws().off('battles:start')
          ws().off('battles:round')
          ws().off('battles:ended')
        })

    function getBattleMode(battle) {
        if (battle.gamemode === 'group') return 'GROUP'
        if (battle.gamemode === 'crazy') return 'CRAZY'
        if (battle.gamemode === 'casual') return 'CASE'
        if (battle.gamemode === 'standard') return 'STANDARD'
        if (battle.playersPerTeam === 2 && battle.teams === 2) return '2V2'
        if (battle.playersPerTeam === 1 && battle.teams === 4) return '1V1V1V1'
        if (battle.playersPerTeam === 1 && battle.teams === 3) return '1V1V1'
        if (battle.playersPerTeam === 1 && battle.teams === 1) return '1V1'
        return '1V1'
    }

    function isCaseBattle(battle) {
        if (!battle || !battle.gamemode) return false
        return battle.gamemode === 'casual'
    }

    function getSortedBattles(battles, toggle, sortByPrice) {
        if (!Array.isArray(battles) || battles?.length < 1) return battles

        let baseSort = [...battles]

        if (toggle === 'JOINABLE') baseSort = baseSort.filter((battle) => !battle.startedAt && battle.winnerTeam === null)
        else if (toggle === 'ENDED') baseSort = baseSort.filter((battle) => battle.winnerTeam !== null)

        if (modeFilter() !== 'ALL') baseSort = baseSort.filter((battle) => getBattleMode(battle) === modeFilter())
        if (playersFilter() !== 'ALL') baseSort = baseSort.filter((battle) => battle.playersPerTeam * battle.teams === +playersFilter())
        if (condFilter() === 'FUNDED') baseSort = baseSort.filter((battle) => battle.ownerFunding > 0)
        else if (condFilter() === 'STANDARD') baseSort = baseSort.filter((battle) => !battle.ownerFunding)

        if (baseSort.length < 2) return baseSort

        if (sortByPrice) { // Sort by price
            baseSort = baseSort.sort((a, b) => {
                if (a.endedAt === null && b.endedAt !== null) {
                    return -1;
                } else if (a.endedAt !== null && b.endedAt === null) {
                    return 1;
                } else {
                    return b.entryPrice - a.entryPrice;
                }
            })
        } else { // Sort by date
            baseSort = baseSort.sort((a, b) => {
                if (a.endedAt === null && b.endedAt !== null) {
                    return -1;
                } else if (a.endedAt !== null && b.endedAt === null) {
                    return 1;
                } else {
                  return new Date(b.createdAt) - new Date(a.createdAt)
                }
            })
        }

        return baseSort
    }

    function isInBattle(battle) {
        if (!user()) return false
        return battle?.players?.find(player => player?.id === user()?.id)
    }

    function visibleBattles() {
        return getSortedBattles(battles(), toggle(), sortByPrice()) || []
    }

    function liveCount() {
        return visibleBattles().filter(battle => battle.startedAt && !battle.endedAt).length
    }

    function renderableBattle(battle) {
        const battleMode = getBattleMode(battle)
        // Skip battle if mode is Case and has no cases
        if (battleMode === 'CASE' && (!battle.cases || battle.cases.length === 0)) return null
        const players = battle.playersPerTeam * battle.teams
        return <BattleRow
            battle={battle}
            hasJoined={isInBattle(battle)}
            ws={ws()}
            mode={battleMode}
            players={players}/>
    }

    return (
        <>
            <Title>Cosmic Luck | Battles</Title>
            <Meta name='title' content='Battles'></Meta>
            <Meta name='description' content='Wager Coins On Cosmic Luck Battles And Win Big Versus Other Players!'></Meta>

            <div class='battles-container'>
              <header class='page-heading'>
                <div>
                  <span class='eyebrow'>Player vs player</span>
                  <h1>Case Battles</h1>
                  <p>Pick your lineup, claim a seat, and watch every drop land live.</p>
                </div>
              </header>

              <div class='filter-bar' aria-label='Battle filters'>
                <div class='filter'>
                    <p class='filter-label'>State</p>
                    <select value={toggle()} onChange={(e) => setToggle(e.target.value)}>
                        <option value='ALL'>All</option>
                        <option value='JOINABLE'>Joinable</option>
                        <option value='ENDED'>Ended</option>
                    </select>
                </div>

                <div class='filter'>
                    <p class='filter-label'>Modes</p>
                    <select value={modeFilter()} onChange={(e) => setModeFilter(e.target.value)}>
                        <option value='ALL'>All</option>
                        <option value='1V1'>1v1</option>
                        <option value='2V2'>2v2</option>
                        <option value='1V1V1'>1v1v1</option>
                        <option value='1V1V1V1'>1v1v1v1</option>
                        <option value='CASE'>Case</option>
                        <option value='GROUP'>Group</option>
                        <option value='CRAZY'>Crazy</option>
                        <option value='STANDARD'>Standard</option>
                    </select>
                </div>

                <div class='filter'>
                    <p class='filter-label'>Players</p>
                    <select value={playersFilter()} onChange={(e) => setPlayersFilter(e.target.value)}>
                        <option value='ALL'>All</option>
                        <option value='2'>2</option>
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                        <option value='6'>6</option>
                    </select>
                </div>

                <div class='filter'>
                    <p class='filter-label'>Conditions</p>
                    <select value={condFilter()} onChange={(e) => setCondFilter(e.target.value)}>
                        <option value='ALL'>All</option>
                        <option value='FUNDED'>Funded</option>
                        <option value='STANDARD'>Standard</option>
                    </select>
                </div>

                <div class='filter'>
                    <p class='filter-label'>Order</p>
                    <select value={sortByPrice() ? 'FEATURED' : 'NEWEST'} onChange={(e) => setSortByPrice(e.target.value === 'FEATURED')}>
                        <option value='FEATURED'>Featured</option>
                        <option value='NEWEST'>Newest</option>
                    </select>
                </div>

                <button class='create-battle'>
                  <img src='/assets/icons/battles.svg' height='16' alt=''/>
                  Create Battle
                  <A href='/battle/create' class='gamemode-link'></A>
                </button>
              </div>

              {battles() ? (
                <div class='battles-list'>
                  <div class='results-heading'>
                    <div>
                      <span class='live-dot'/>
                      <strong>{visibleBattles().length} battles</strong>
                      <Show when={liveCount() > 0}><span class='live-count'>{liveCount()} live</span></Show>
                    </div>
                    <span>Live updates enabled</span>
                  </div>

                  <Show when={visibleBattles().length} fallback={
                    <div class='empty-battles'>
                      <img src='/assets/icons/battles.svg' alt=''/>
                      <strong>No battles match these filters</strong>
                      <span>Change a filter or create a new battle.</span>
                    </div>
                  }>
                    <For each={visibleBattles()}>{(battle) => renderableBattle(battle)}</For>
                  </Show>
                </div>
              ) : (
                <Loader/>
              )}
            </div>

            <style jsx>{`
              :global(.content:has(.battles-container)::before) {
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
              }

              .battles-container {
                width: 100%;
                max-width: 1440px;
                height: fit-content;
                box-sizing: border-box;
                padding: 26px 24px 80px;
                margin: 0 auto;
                position: relative;
              }

              .page-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
                margin-bottom: 24px;
              }

              .eyebrow {
                display: block;
                margin-bottom: 5px;
                color: var(--color-emerald-bright);
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .page-heading h1 {
                margin: 0;
                color: var(--color-copy);
                font-size: clamp(25px, 3vw, 38px);
                line-height: 1.05;
                letter-spacing: 0;
              }

              .page-heading p {
                max-width: 590px;
                margin: 8px 0 0;
                color: var(--color-copy-muted);
                font-family: "Geogrotesque", sans-serif;
                font-size: 14px;
                line-height: 1.5;
              }

              .filter-bar {
                width: 100%;
                display: flex;
                align-items: flex-end;
                flex-wrap: wrap;
                gap: 10px;
                padding: 14px;
                margin-bottom: 18px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: var(--radius-card);
                background: linear-gradient(160deg, rgba(21, 25, 22, 0.98), rgba(12, 14, 13, 0.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 18px 45px rgba(0, 0, 0, 0.24);
              }

              .filter {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 130px;
                flex: 1 1 130px;
              }

              .filter-label {
                margin: 0 0 2px 2px;
                color: var(--color-copy-muted);
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .filter select {
                width: 100%;
                height: 44px;
                padding: 0 34px 0 12px;
                border-radius: var(--radius-control);
                background-color: #0d0f0e;
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: var(--color-copy);
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                appearance: none;
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6'%3E%3Cpath d='M1 1l3.5 3.5L8 1' stroke='%238b92a0' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                transition: border-color .2s ease, box-shadow .2s ease;
              }

              .filter select:hover {
                border-color: rgba(31, 214, 95, 0.3);
              }

              .filter select:focus {
                border-color: rgba(31, 214, 95, 0.5);
                box-shadow: 0 0 0 2px rgba(31, 214, 95, 0.12), inset 0 1px 0 rgba(255,255,255,0.035);
              }

              .create-battle {
                min-height: 44px;
                padding: 0 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 9px;
                border: 1px solid rgba(74, 222, 128, 0.45);
                border-radius: var(--radius-control);
                background: linear-gradient(135deg, var(--color-emerald-bright), var(--color-emerald));
                box-shadow: 0 8px 26px rgba(34, 197, 94, 0.24), inset 0 1px 0 rgba(255,255,255,.28);
                color: #041b0c;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 800;
                white-space: nowrap;
                position: relative;
                cursor: pointer;
                flex: 0 0 auto;
                margin-left: auto;
                transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
              }

              .create-battle img {
                filter: brightness(0.15);
              }

              .create-battle:hover {
                filter: brightness(1.08);
                transform: translateY(-2px);
                box-shadow: var(--shadow-emerald-strong), inset 0 1px 0 rgba(255,255,255,.32);
              }

              .create-battle:active {
                transform: translateY(0);
              }

              .battles-list {
                width: 100%;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .results-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 30px;
                margin-bottom: 4px;
                color: var(--color-copy-muted);
                font-size: 10px;
              }

              .results-heading > div {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .results-heading strong {
                color: var(--color-copy);
                font-size: 12px;
              }

              .live-count {
                min-width: 20px;
                height: 20px;
                padding: 0 6px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: rgba(34, 197, 94, .14);
                color: var(--color-emerald-bright);
                font-size: 10px;
                font-weight: 800;
              }

              .live-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--color-emerald);
                box-shadow: 0 0 10px rgba(34, 197, 94, .8);
                animation: status-pulse 1.8s ease-in-out infinite;
              }

              .empty-battles {
                min-height: 230px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: 1px dashed rgba(255,255,255,.07);
                border-radius: var(--radius-card);
                background: rgba(255,255,255,.018);
                color: #747e8c;
                font-size: 11px;
              }

              .empty-battles img {
                width: 26px;
                margin-bottom: 5px;
                opacity: .45;
              }

              .empty-battles strong {
                color: #c7ced8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
              }

              @keyframes status-pulse {
                50% { opacity: .45; transform: scale(.82); }
              }

              @media only screen and (max-width: 800px) {
                .battles-container { padding: 20px 14px 76px; }
                .page-heading { align-items: flex-end; margin-bottom: 18px; }
                .page-heading p { display: none; }
                .filter { flex: 1 1 45%; }
                .create-battle { flex: 1 1 100%; margin-left: 0; }
              }

              @media only screen and (max-width: 560px) {
                .battles-container { padding: 16px 10px 72px; }
                .page-heading { align-items: stretch; flex-direction: column; gap: 14px; }
                .filter { flex: 1 1 100%; }
                .results-heading > span { display: none; }
              }

              @media (prefers-reduced-motion: reduce) {
                .live-dot { animation: none; }
              }
            `}</style>
        </>
    );
}

export default Battles;
