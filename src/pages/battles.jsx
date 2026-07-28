import {createEffect, createSignal, For, Show, onCleanup} from "solid-js";
import BattlePreview from "../components/Battles/battlepreview";
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
    const [filtersOpen, setFiltersOpen] = createSignal(false)
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

        if (toggle === 'JOINABLE') baseSort = baseSort.filter((battle) => battle.startedAt === null)
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

                <div class='heading-actions'>
                  <button class='mobile-filter-trigger' type='button' onClick={() => setFiltersOpen(true)} aria-label='Open battle filters'>
                    <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M7 12h10M10 17h4'/></svg>
                    Filters
                  </button>
                  <button class='create-battle'>
                    <img src='/assets/icons/battles.svg' height='16' alt=''/>
                    Create Battle
                    <A href='/battle/create' class='gamemode-link'></A>
                  </button>
                </div>
              </header>

              <button class={'filter-backdrop ' + (filtersOpen() ? 'visible' : '')} type='button' onClick={() => setFiltersOpen(false)} aria-label='Close battle filters'/>

              <div class='battle-layout'>
                <aside class={'filter-panel ' + (filtersOpen() ? 'open' : '')} aria-label='Battle filters'>
                  <div class='filter-heading'>
                    <div>
                      <span>Refine battles</span>
                      <strong>Filters</strong>
                    </div>
                    <button type='button' onClick={() => setFiltersOpen(false)} aria-label='Close battle filters'>
                      <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m6 6 12 12M18 6 6 18'/></svg>
                    </button>
                  </div>

                    <div class='filters'>
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
                    </div>

                    <button class='apply-filters' type='button' onClick={() => setFiltersOpen(false)}>Show Battles</button>
                </aside>

                {battles() ? (
                    <div class='battles'>
                      <div class='results-heading'>
                        <div>
                          <span class='live-dot'/>
                          <strong>{(getSortedBattles(battles(), toggle(), sortByPrice()) || []).length} battles</strong>
                        </div>
                        <span>Live updates enabled</span>
                      </div>
                      <Show when={(getSortedBattles(battles(), toggle(), sortByPrice()) || []).length} fallback={
                        <div class='empty-battles'>
                          <img src='/assets/icons/battles.svg' alt=''/>
                          <strong>No battles match these filters</strong>
                          <span>Change a filter or create a new battle.</span>
                        </div>
                      }>
                        <For each={getSortedBattles(battles(), toggle(), sortByPrice()) || []}>{(battle) => {
                          const battleMode = getBattleMode(battle);
                          const players = battle.playersPerTeam * battle.teams;

                          // Skip battle if mode is Case and has no cases
                          if (battleMode === 'CASE' && (!battle.cases || battle.cases.length === 0)) {
                            return null;
                          }

                          return <BattlePreview
                            battle={battle}
                            hasJoined={isInBattle(battle)}
                            ws={ws()}
                            mode={battleMode}
                            players={players}/>
                        }}</For>
                      </Show>
                    </div>
                ) : (
                    <Loader/>
                )}
                  </div>
            </div>

            <style jsx>{`
              :global(.content:has(.battles-container)) {
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

              .heading-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-shrink: 0;
              }

              .battle-layout {
                display: grid;
                grid-template-columns: 220px minmax(0, 1fr);
                align-items: start;
                gap: 18px;
              }

              .filter-panel {
                position: sticky;
                top: 18px;
                padding: 16px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: var(--radius-card);
                background: linear-gradient(160deg, rgba(21, 25, 22, 0.98), rgba(12, 14, 13, 0.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 18px 45px rgba(0, 0, 0, 0.24);
                z-index: 5;
              }

              .filter-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid rgba(255,255,255,.07);
              }

              .filter-heading > div {
                display: flex;
                flex-direction: column;
                gap: 3px;
              }

              .filter-heading span {
                color: var(--color-copy-muted);
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .filter-heading strong {
                color: var(--color-copy);
                font-size: 15px;
              }

              .filter-heading button {
                display: none;
                width: 40px;
                height: 40px;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,.08);
                border-radius: 10px;
                background: #181b19;
                color: var(--color-copy);
              }

              .filter-heading svg,
              .mobile-filter-trigger svg {
                width: 18px;
                height: 18px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
                stroke-linecap: round;
              }

              .filters {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }

              .filter {
                display: flex;
                flex-direction: column;
                gap: 3px;
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
                min-height: 48px;
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

              .battles {
                width: 100%;
                min-width: 0;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
              }

              .results-heading {
                grid-column: 1 / -1;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 34px;
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
                grid-column: 1 / -1;
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

              .mobile-filter-trigger,
              .apply-filters,
              .filter-backdrop {
                display: none;
              }

              @keyframes status-pulse {
                50% { opacity: .45; transform: scale(.82); }
              }

              @media only screen and (max-width: 1120px) {
                .battles { grid-template-columns: 1fr; }
              }

              @media only screen and (max-width: 800px) {
                .battles-container { padding: 20px 14px 76px; }
                .page-heading { align-items: flex-end; margin-bottom: 18px; }
                .page-heading p { display: none; }
                .battle-layout { display: block; }

                .filter-panel {
                  position: fixed;
                  top: auto;
                  right: 0;
                  bottom: 0;
                  left: 0;
                  max-height: min(82vh, 640px);
                  overflow-y: auto;
                  border-radius: 20px 20px 0 0;
                  padding: 18px 18px max(18px, env(safe-area-inset-bottom));
                  transform: translateY(105%);
                  visibility: hidden;
                  transition: transform .28s cubic-bezier(.22,.8,.24,1), visibility .28s;
                  z-index: 1001;
                }

                .filter-panel.open {
                  transform: translateY(0);
                  visibility: visible;
                }

                .filter-heading button { display: flex; }
                .filters { display: grid; grid-template-columns: 1fr 1fr; }
                .filter:first-child { grid-column: 1 / -1; }

                .filter-backdrop {
                  position: fixed;
                  inset: 0;
                  border: 0;
                  background: rgba(0, 0, 0, .7);
                  backdrop-filter: blur(4px);
                  opacity: 0;
                  visibility: hidden;
                  transition: opacity .2s ease, visibility .2s;
                  z-index: 1000;
                }

                .filter-backdrop.visible {
                  display: block;
                  opacity: 1;
                  visibility: visible;
                }

                .apply-filters {
                  display: flex;
                  width: 100%;
                  min-height: 48px;
                  margin-top: 16px;
                  align-items: center;
                  justify-content: center;
                  border: 0;
                  border-radius: var(--radius-control);
                  background: var(--color-emerald);
                  color: #041b0c;
                  font-family: "Geogrotesque Wide", sans-serif;
                  font-size: 12px;
                  font-weight: 800;
                }

                .mobile-filter-trigger {
                  display: flex;
                  min-height: 48px;
                  padding: 0 15px;
                  align-items: center;
                  gap: 8px;
                  border: 1px solid rgba(255,255,255,.09);
                  border-radius: var(--radius-control);
                  background: #141715;
                  color: var(--color-copy);
                  font-family: "Geogrotesque Wide", sans-serif;
                  font-size: 11px;
                  font-weight: 800;
                }
              }

              @media only screen and (max-width: 560px) {
                .battles-container { padding: 16px 10px 72px; }
                .page-heading { align-items: stretch; flex-direction: column; gap: 14px; }
                .heading-actions { width: 100%; }
                .mobile-filter-trigger { flex: 0 0 auto; }
                .create-battle { flex: 1; padding: 0 14px; }
                .filters { grid-template-columns: 1fr; }
                .filter:first-child { grid-column: auto; }
                .results-heading > span { display: none; }
              }

              @media (prefers-reduced-motion: reduce) {
                .live-dot { animation: none; }
                .filter-panel,
                .filter-backdrop { transition: none; }
              }
            `}</style>
        </>
    );
}

export default Battles;
