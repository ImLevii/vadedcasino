import {getCents} from "../util/balance";
import Toggle from "../components/Toggle/toggle";
import {createEffect, createSignal, For, onCleanup} from "solid-js";
import Switch from "../components/Toggle/switch";
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

        let baseSort = battles

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
                    new Date(b.createdAt) - new Date(a.createdAt)
                }
            })
        }

        return baseSort
    }

    function totalPriceOfBattles() {
        return battles()?.reduce((val, battle) => val + battle?.entryPrice, 0)
    }

    function getJoinable() {
        return battles()?.filter((battle) => battle.startedAt === null)
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

                    <button class='create-battle'>
                        <img src='/assets/icons/battles.svg' height='15' alt=''/>
                        Create Battle
                        <A href='/battle/create' class='gamemode-link'></A>
                    </button>
                </div>

                <div class='bar'/>

                {battles() ? (
                    <div class='battles'>
                        <For each={getSortedBattles(battles(), toggle(), sortByPrice()) || []}>{(battle, index) => <BattlePreview
                            battle={battle} hasJoined={isInBattle(battle)} ws={ws()}/>}</For>
                    </div>
                ) : (
                    <Loader/>
                )}
            </div>

            <style jsx>{`
              .battles-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }
              
              .battles-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 15px;
              }

              .filters {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
              }

              .filter {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .filter-label {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 700;
              }

              .filter select {
                height: 40px;
                min-width: 120px;
                padding: 0 12px;

                outline: unset;
                border-radius: 6px;
                background: linear-gradient(180deg, rgba(20, 25, 34, 0.88), rgba(14, 18, 26, 0.92));
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
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
                height: 42px;
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
                font-size: 14px;
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

              .bar {
                flex: 1;
                height: 1px;
                background: rgba(255,255,255,0.06);
                margin: 20px 0;
              }

              .battles {
                display: flex;
                flex-direction: column;
                width: 100%;
                gap: 12px;
              }

              @media only screen and (max-width: 800px) {
                .battles-header {
                  flex-direction: column;
                  align-items: stretch;
                }

                .filter {
                  flex: 1;
                }

                .filter select {
                  width: 100%;
                  min-width: 0;
                }
              }

              @media only screen and (max-width: 1000px) {
                .battles-container {
                  padding-bottom: 90px;
                }
              }
            `}</style>
        </>
    );
}

export default Battles;
