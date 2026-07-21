import {createEffect, createSignal, For, Show} from "solid-js";
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

    function getBattleMode(battle) {
        if (battle.gamemode === 'group') return 'GROUP'
        if (battle.gamemode === 'crazy') return 'CRAZY'
        if (battle.playersPerTeam === 2 && battle.teams === 2) return '2V2'
        if (battle.playersPerTeam === 1 && battle.teams === 4) return '1V1V1V1'
        if (battle.playersPerTeam === 1 && battle.teams === 3) return '1V1V1'
        return '1V1'
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

            <div class='battles-container fadein'>
                <div class='battles-header'>
                <div class='header-copy'>
                  <div class='eyebrow'>Live arena</div>
                  <h1>Case Battles</h1>
                  <p>Join an open lineup or watch the latest rounds resolve live.</p>
                </div>

                <button class='create-battle'>
                  <img src='/assets/icons/battles.svg' height='15' alt=''/>
                  Create Battle
                  <A href='/battle/create' class='gamemode-link'></A>
                </button>
              </div>

              <div class='filter-panel'>
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
                                <option value='GROUP'>Group</option>
                                <option value='CRAZY'>Crazy</option>
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

                    <div class='filter-summary'>
                      <span class='live-dot'/>
                      <span>{(battles() || []).filter((battle) => !battle.startedAt).length} open</span>
                    </div>
                </div>

                {battles() ? (
                    <div class='battles'>
                      <Show when={(getSortedBattles(battles(), toggle(), sortByPrice()) || []).length} fallback={
                        <div class='empty-battles'>
                          <img src='/assets/icons/battles.svg' alt=''/>
                          <strong>No battles match these filters</strong>
                          <span>Change a filter or create a new battle.</span>
                        </div>
                      }>
                        <For each={getSortedBattles(battles(), toggle(), sortByPrice()) || []}>{(battle) => <BattlePreview
                          battle={battle} hasJoined={isInBattle(battle)} ws={ws()}/>}</For>
                      </Show>
                    </div>
                ) : (
                    <Loader/>
                )}
            </div>

            <style jsx>{`
              .battles-container {
                --b-panel: #111925;
                --b-panel-soft: #182231;
                --b-border: rgba(149, 168, 196, 0.2);
                --b-text: #dde6f4;
                --b-text-dim: #92a0b7;

                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 18px 96px;
                margin: 0 auto;
                position: relative;
              }
              
              .battles-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 24px;
                margin-bottom: 18px;
                padding: 12px 14px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,.06);
                background: #111720;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
              }

              .header-copy h1, .header-copy p {
                margin: 0;
              }

              .eyebrow {
                margin-bottom: 6px;
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .header-copy h1 {
                color: #fff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 27px;
                font-weight: 800;
              }

              .header-copy p {
                margin-top: 7px;
                color: #7d8796;
                font-size: 12px;
              }

              .filter-panel {
                margin-bottom: 18px;
                padding: 14px;
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: 14px;
                border: 1px solid rgba(255,255,255,.06);
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(18,23,31,.9), rgba(10,14,20,.95));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 10px 30px rgba(0,0,0,.16);
              }

              .filters {
                display: flex;
                gap: 9px;
                flex-wrap: wrap;
              }

              .filter {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .filter-label {
                margin: 0 0 0 2px;
                color: #697382;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .filter select {
                height: 40px;
                min-width: 112px;
                padding: 0 31px 0 11px;

                outline: unset;
                border-radius: 6px;
                background-color: rgba(7,10,15,.66);
                border: 1px solid rgba(255, 255, 255, 0.06);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;

                cursor: pointer;
                appearance: none;
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6'%3E%3Cpath d='M1 1l3.5 3.5L8 1' stroke='%238b92a0' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
              }

              .filter select:hover {
                border-color: rgba(31, 214, 95, 0.3);
              }
              
              .filter select:focus {
                border-color: rgba(31, 214, 95, 0.5);
                box-shadow: 0 0 0 2px rgba(31, 214, 95, 0.12), inset 0 1px 0 rgba(255,255,255,0.035);
              }

              .create-battle {
                height: 40px;
                padding: 0 20px;

                display: flex;
                align-items: center;
                gap: 9px;

                outline: unset;
                border: unset;
                border-radius: 8px;
                background: #1fd65f;

                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                white-space: nowrap;

                position: relative;
                cursor: pointer;
                transition: all .2s;
              }

              .create-battle img {
                filter: brightness(0.15);
              }

              .create-battle:hover {
                background: #45e57f;
                transform: translateY(-1px);
                box-shadow: 0 0 24px rgba(31, 214, 95, 0.5), 0 0 0 1px rgba(31, 214, 95, 0.2);
              }
              
              .create-battle:active {
                transform: translateY(0);
              }

              .filter-summary {
                min-width: 70px;
                height: 40px;
                padding: 0 12px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                border: 1px solid rgba(31,214,95,.14);
                border-radius: 6px;
                background: rgba(31,214,95,.04);
                color: #8c96a4;
                font-size: 10px;
                font-weight: 700;
                white-space: nowrap;
              }

              .live-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 10px rgba(31,214,95,.7);
              }

              .battles {
                display: flex;
                flex-direction: column;
                width: 100%;
                gap: 12px;
              }

              .empty-battles {
                min-height: 230px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: 1px dashed rgba(255,255,255,.07);
                border-radius: 8px;
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

              @media only screen and (max-width: 800px) {
                .battles-header {
                  align-items: flex-end;
                }

                .filter {
                  flex: 1;
                  min-width: calc(33.33% - 9px);
                }

                .filter select {
                  width: 100%;
                  min-width: 0;
                }

                .filter-panel {
                  align-items: stretch;
                  flex-direction: column;
                }

                .filter-summary {
                  width: 100%;
                }
              }

              @media only screen and (max-width: 560px) {
                .battles-container { padding: 20px 12px 90px; }
                .battles-header { align-items: stretch; flex-direction: column; }
                .create-battle { width: 100%; justify-content: center; }
                .filter { min-width: calc(50% - 9px); }
              }
            `}</style>
        </>
    );
}

export default Battles;
