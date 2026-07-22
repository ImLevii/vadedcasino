import {A, useParams, useSearchParams, useNavigate} from "@solidjs/router";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleDropHistory from "../components/Battles/battledrophistory";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {calculateWinnings, convertItems, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX} from "../util/sound";
import Avatar from "../components/Level/avatar";

function Battle(props) {

    let params = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    let hasConnected = false
    const [ws] = useWebsocket()

    let prevBattle = null
    const [battle, { mutate: setBattle }] = createResource(() => params.id, subscribeToBattle)

    const [players, setPlayers] = createSignal(0)
    const [state, setState] = createSignal('WAITING')
    const [rounds, setRounds] = createSignal([], { equals: false })
    const [round, setRound] = createSignal(0)
    const [block, setBlock] = createSignal('')

    // Emojis
    const BATTLE_EMOJIS = ['🔥', '😂', '💀', '🙏', '🍀', '😤', '👑', '🎰']
    const [floatingEmojis, setFloatingEmojis] = createSignal([])
    let emojiLastSent = 0

    // Winning
    const [winnerTeam, setWinnerTeam] = createSignal(0)
    const [roundWinners, setRoundWinners] = createSignal([])
    const [wonItems, setWonItems] = createSignal([])
    const [won, setWon] = createSignal(0)

    function subscribeToBattle(id) {
        if (ws() && ws().connected) {
            ws().emit('battles:subscribe', id, searchParams?.pk)
        }

        return null
    }

    createEffect(() => {
        if (ws() && ws().connected && !hasConnected) {
            ws().emit('battles:subscribe', params.id, searchParams?.pk)
            ws().on('battle', (b) => {

                if (prevBattle !== b.id) {
                    resetValues()
                    ws().emit('battles:unsubscribe', prevBattle)
                }
                prevBattle = b.id

                if (b.id !== battle()?.id) resetValues()

                let max = b.playersPerTeam * b.teams
                b.players = fillEmptySlots(max, b.players)

                setRound(b.round)
                initRounds(b)

                if (b.round < 1 && b.EOSBlock) {
                    setState('EOS')
                    setBlock(b.EOSBlock)
                }

                if (b.round > 0 && !b.endedAt) {
                    setState('ROLLING')
                    let itemsInRound = wonItems().slice((b.round - 1) * players(), b.round * players())
                    setRoundWinners(getRoundWinner(itemsInRound, b.playersPerTeam))
                }

                if (b.endedAt) {
                    setWinnerTeam(b.winnerTeam - 1)
                    setState('WINNERS')
                }

                setPlayers(max)
                setBattle(b)
            })

            ws().on('battle:join', (id, user) => {
                let curBattle = battle()
                if (id !== curBattle.id) return

                curBattle.players[user.slot - 1] = user
                setBattle({...curBattle})
            })

            ws().on('battle:commit', (id, block) => {
                if (id !== battle().id) return
                setState('EOS')
                setBlock(block)
            })

            ws().on('battle:start', (battleId, rounds, clientSeed, serverSeed) => {
                // if (battleId !== battle()?.id) return ws().emit('battles:unsubscribe', battleId)
                setRounds(rounds)
                setWonItems(getWonItems(rounds, battle()?.cases))
                setWon(calculateWinnings(battle().cases, rounds, battle().playersPerTeam))
            })

            ws().on('battle:round', (battleId, roundNum) => {
                // if (battleId !== battle()?.id) return ws().emit('battles:unsubscribe', battleId)
                setState('ROLLING')
                setRound(roundNum)

                let itemsInRound = wonItems().slice((roundNum - 1) * players(), roundNum * players())
                setRoundWinners(getRoundWinner(itemsInRound, battle().playersPerTeam))
            })

            ws().on('battle:ended', (battleId, { winnerTeam, serverSeed, clientSeed }) => {
              playGameSFX('battle-win', '/assets/sfx/winorcashout.mp3', {
                channel: 'result-win',
                volume: 0.62,
                fadeInMs: 80,
              })
                setWinnerTeam(winnerTeam - 1)
                setState('WINNERS')
            })

            ws().on('battle:emoji', (battleId, emoji) => {
                if (battleId !== battle()?.id) return
                spawnEmoji(emoji)
            })
        }

        hasConnected = !!ws()?.connected
    })

    onCleanup(() => {
        if (ws() && ws().connected) {
            ws().emit('battles:unsubscribe', prevBattle)
            ws().off('battle')
            ws().off('battle:join')
            ws().off('battle:commit')
            ws().off('battle:start')
            ws().off('battle:round')
            ws().off('battle:ended')
            ws().off('battle:emoji')
        }
    })

    function initRounds(battle) {
        if (!battle || battle.round < 1) return

        setRound(battle.round)
        setRounds([...battle.rounds])
        setWonItems(getWonItems(battle.rounds, battle.cases))
        setWon(calculateWinnings(battle.cases, battle.rounds, battle.playersPerTeam))
    }

    function resetValues() {
        setPlayers([])
        setBattle(null)
        setState('WAITING')
        setBlock(0)
        setWon(0)
        setWonItems([])
        setRounds([])
        setRound(0)
    }

    function getCase(id) {
        if (!battle() || !battle()?.cases) return
        return battle()?.cases?.find(c => id === c.id)
    }

    function isCreator() {
      return props?.user?.id === battle()?.players?.[0]?.id
    }

    function useImageFallback(event) {
      event.currentTarget.onerror = null
      event.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
      event.currentTarget.classList.add('fallback')
    }

    function sendEmoji(emoji) {
        if (!props.user || !battle() || !ws()) return
        const now = Date.now()
        if (now - emojiLastSent < 1500) return
        emojiLastSent = now
        ws().emit('battle:emoji', battle().id, emoji)
    }

    function spawnEmoji(emoji) {
        const id = Date.now() + Math.random()
        const x = 5 + Math.random() * 90
        setFloatingEmojis(prev => [...prev, { id, emoji, x }])
        setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2800)
    }

    // Calculate team totals
    function getTeamTotal(teamIndex) {
        if (!battle() || !wonItems()) return 0
        const teamPlayerIds = battle()?.players
            ?.filter((p, idx) => Math.floor(idx / battle()?.playersPerTeam) === teamIndex)
            ?.map(p => p?.id)
        
        return wonItems()
            .filter(item => teamPlayerIds?.includes(item.userId))
            .reduce((sum, item) => sum + (item?.price || 0), 0)
    }

    function getWinningPlayers() {
        if (!battle() || state() !== 'WINNERS') return []
        return battle()?.players?.filter((p, idx) => Math.floor(idx / battle()?.playersPerTeam) === winnerTeam()) || []
    }

    return (
        <>
            <Title>Cosmic Luck | Battle</Title>

            <div class='battle-container fadein'>
                {!battle() ? (
                    <Loader/>
                ) : (
                    <>
                        {/* Top bar - CSGOLuck style */}
                        <div class='battle-topbar'>
                          <div class='topbar-left'>
                            <button class='recreate-btn' type='button'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12a9 9 0 1 1-2.64-6.36'/><polyline points='21 3 21 9 15 9'/></svg>
                              <span>Recreate @ {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
                            </button>
                            <button class='inspect-btn' type='button'>Inspect</button>
                          </div>

                          <div class='topbar-center'>
                            <div class='cases-strip'>
                              <For each={battle()?.rounds || []}>{(r, index) => (
                                <div class={'case-tile ' + (Math.max(0, (round() || 1) - 1) === index() ? 'active' : '')}>
                                  <img
                                    src={resolveImageSrc(getCase(r?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                    alt={getCase(r?.caseId)?.name || 'Battle case'}
                                    onError={useImageFallback}
                                  />
                                </div>
                              )}</For>
                            </div>
                          </div>

                          <div class='topbar-right'>
                            <button class='back-btn' onClick={() => navigate('/battles')}>
                              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>
                              <span>Back</span>
                            </button>
                            <button class='utility-icon-btn' title='Provably Fair'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z'/><path d='M9 12l2 2 4-4'/></svg>
                            </button>
                            <button class='utility-icon-btn' title='Round'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 6v6l4 2'/><circle cx='12' cy='12' r='9'/></svg>
                            </button>
                            <button class='utility-icon-btn' title='Copy link' onClick={() => {
                              if (navigator.clipboard) navigator.clipboard.writeText(window.location.href)
                            }}>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1'/><path d='M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1'/></svg>
                            </button>
                            <button class='utility-icon-btn' title='Fullscreen' onClick={() => {
                              if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
                              else document.exitFullscreen?.()
                            }}>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
                            </button>
                          </div>
                        </div>

                        {/* Main battle board - CSGOLuck style */}
                        <div class='battle-board'>
                          {/* Left sidebar with players */}
                          <div class='players-sidebar'>
                            <For each={battle()?.players || []}>{(player) => (
                              <div class='player-card'>
                                <Avatar height='36' id={player?.id || '?'} xp={player?.xp || 0}/>
                                <div class='player-info'>
                                  <span class='player-name'>{player?.username || 'Waiting'}</span>
                                  <span class='player-value positive'>+ {wonItems().filter(item => item.userId === player?.id).reduce((sum, item) => sum + (item?.price || 0), 0).toFixed(2)}</span>
                                </div>
                              </div>
                            )}</For>
                          </div>

                          {/* Center drop zone */}
                          <div class='drop-zone'>
                            <Show when={state() === 'WINNERS'}>
                              <div class='winner-display'>
                                <span class='winner-label'>WINNER</span>
                                <div class='winner-avatar'>
                                  <For each={getWinningPlayers()}>{(p) => (
                                    <Avatar height='64' id={p?.id} xp={p?.xp || 0}/>
                                  )}</For>
                                </div>
                                <div class='winner-info'>
                                  <For each={getWinningPlayers()}>{(p, i) => (
                                    <span class='winner-name'>{p?.username || 'Bot'}{i() < getWinningPlayers().length - 1 ? ', ' : ''}</span>
                                  )}</For>
                                </div>
                                <div class='winner-prize'>
                                  <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                  <span>{getTeamTotal(winnerTeam()).toFixed(2)}</span>
                                </div>
                              </div>
                            </Show>
                            <Show when={state() === 'ROLLING'}>
                              <div class='spinning-display'>
                                {/* Glowing orbs/animation area */}
                                <div class='drop-orbs'>
                                  <div class='orb'/>
                                  <div class='orb'/>
                                  <div class='orb'/>
                                </div>
                              </div>
                            </Show>
                          </div>
                        </div>

                        {/* Drop History */}
                        <Show when={battle()?.players?.length > 0}>
                          <BattleDropHistory
                            players={battle()?.players || []}
                            wonItems={wonItems()}
                            rounds={battle()?.rounds || []}
                            round={round()}
                          />
                        </Show>
                    </>
                )}
            </div>

            <style jsx>{`
              .battle-container {
                --battle-panel: #101722;
                --battle-panel-soft: #151d2a;
                --battle-border: rgba(140, 156, 180, 0.2);
                --battle-border-strong: rgba(31, 214, 95, 0.35);
                --battle-text-dim: #8792a4;
                --battle-text: #dbe4f2;

                width: 100%;
                max-width: 1920px;
                height: fit-content;

                display: flex;
                flex-direction: column;
                gap: 10px;

                box-sizing: border-box;
                padding: 14px 7px 40px;
                margin: 0 auto;
                position: relative;
                isolation: isolate;
              }

              /* Top bar - CSGOLuck style */
              .battle-topbar {
                width: 100%;
                min-height: 68px;
                box-sizing: border-box;
                position: relative;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #0f131a;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 14px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
              }

              .topbar-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
              }

              .topbar-center {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .topbar-right {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
              }

              .recreate-btn {
                height: 42px;
                padding: 0 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border-radius: 5px;
                border: 1px solid rgba(31,214,95,0.3);
                background: linear-gradient(180deg, rgba(31,214,95,0.14), rgba(31,214,95,0.08));
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
                white-space: nowrap;
                transition: all .2s ease;
              }

              .recreate-btn:hover {
                border-color: rgba(31,214,95,0.45);
                background: linear-gradient(180deg, rgba(31,214,95,0.2), rgba(31,214,95,0.12));
                transform: translateY(-1px);
              }

              .inspect-btn {
                height: 42px;
                padding: 0 16px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #c5ccd8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                transition: all .2s ease;
              }

              .inspect-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #202733;
                color: #fff;
                transform: translateY(-1px);
              }

              .cases-strip {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0 12px;
                overflow-x: auto;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.08) transparent;
              }

              .cases-strip::-webkit-scrollbar {
                height: 4px;
              }

              .cases-strip::-webkit-scrollbar-track {
                background: transparent;
              }

              .cases-strip::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.08);
                border-radius: 2px;
              }

              .case-tile {
                width: 64px;
                height: 54px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #151c27;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                position: relative;
                transition: all .2s ease;
              }

              .case-tile img {
                width: 56px;
                height: 46px;
                object-fit: contain;
                opacity: .75;
                transition: opacity .2s ease;
              }

              .case-tile.active {
                border-color: rgba(31,214,95,0.45);
                background: #1a212d;
                box-shadow: inset 0 -2px 0 rgba(31,214,95,0.5);
              }

              .case-tile.active img {
                opacity: 1;
              }

              .back-btn {
                height: 36px;
                padding: 0 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #b8c3d6;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s ease;
              }

              .back-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #1f2631;
                color: #ffffff;
                transform: translateY(-1px);
              }

              .utility-icon-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #8f98a9;
                cursor: pointer;
                transition: all .2s ease;
              }

              .utility-icon-btn:hover {
                border-color: rgba(255,255,255,0.14);
                color: #e8eefc;
                background: #202733;
                transform: translateY(-1px);
              }

              /* Main battle board - CSGOLuck style */
              .battle-board {
                width: 100%;
                min-height: 520px;
                display: flex;
                gap: 10px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #0d1118;
                padding: 10px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
              }

              .players-sidebar {
                width: 220px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 8px;
                border-radius: 6px;
                background: #0a0d12;
                border: 1px solid rgba(255,255,255,0.04);
              }

              .player-card {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: 5px;
                background: #111820;
                border: 1px solid rgba(255,255,255,0.06);
                transition: all .2s ease;
              }

              .player-card:hover {
                border-color: rgba(255,255,255,0.1);
                background: #151d26;
              }

              .player-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .player-name {
                color: #d4dce8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .player-value {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
              }

              .player-value.positive {
                color: #1fd65f;
              }

              .player-value.negative {
                color: #ef4444;
              }

              .drop-zone {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                background: 
                  radial-gradient(ellipse at center, rgba(31,214,95,0.05) 0%, transparent 60%),
                  #090c11;
                border: 1px solid rgba(255,255,255,0.04);
                position: relative;
                overflow: hidden;
              }

              .winner-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
              }

              .winner-label {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 900;
                letter-spacing: 1.2px;
                text-transform: uppercase;
                color: #1fd65f;
                text-shadow: 0 0 12px rgba(31,214,95,0.5);
              }

              .winner-avatar :global(img) {
                border-radius: 50%;
                border: 3px solid rgba(31,214,95,0.5);
                box-shadow: 0 0 24px rgba(31,214,95,0.4);
              }

              .winner-info {
                display: flex;
                align-items: center;
                gap: 4px;
                flex-wrap: wrap;
                justify-content: center;
              }

              .winner-name {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 800;
                color: #e8eff8;
              }

              .winner-prize {
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 20px;
                font-weight: 900;
                color: #1fd65f;
                margin-top: 4px;
              }

              .spinning-display {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .drop-orbs {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 24px;
              }

              .orb {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(31,214,95,0.3), rgba(31,214,95,0.05));
                box-shadow: 0 0 40px rgba(31,214,95,0.4), inset 0 0 20px rgba(31,214,95,0.2);
                animation: pulse 2s ease-in-out infinite;
              }

              .orb:nth-child(2) {
                animation-delay: 0.3s;
                width: 100px;
                height: 100px;
              }

              .orb:nth-child(3) {
                animation-delay: 0.6s;
              }

              @keyframes pulse {
                0%, 100% { opacity: 0.6; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
              }
                align-items: center;
                gap: 3px;
                min-width: 0;
              }

              .totals-value {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #ffffff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                white-space: nowrap;
              }

              .totals-value img {
                filter: drop-shadow(0 0 6px rgba(31,214,95,.3));
              }

              @media only screen and (max-width: 1040px) {
                .battle-board {
                  flex-direction: column;
                }
                
                .players-sidebar {
                  width: 100%;
                  flex-direction: row;
                  flex-wrap: wrap;
                }
                
                .player-card {
                  flex: 1;
                  min-width: 140px;
                }
              }

              @media only screen and (max-width: 620px) {
                .battle-container { padding: 8px 6px 24px; gap: 8px; }
                .battle-topbar { 
                  min-height: auto; 
                  padding: 8px; 
                  gap: 8px; 
                  flex-wrap: wrap; 
                }
                .topbar-left { 
                  flex-wrap: wrap; 
                  width: 100%; 
                  order: 1; 
                }
                .topbar-center { 
                  order: 3; 
                  width: 100%; 
                }
                .topbar-right { 
                  order: 2; 
                  margin-left: auto; 
                }
                .recreate-btn,
                .inspect-btn { 
                  flex: 1; 
                  min-width: 120px; 
                }
                .battle-board {
                  min-height: 400px;
                }
                .players-sidebar {
                  padding: 6px;
                }
                .drop-zone {
                  min-height: 300px;
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .orb,
                * {
                  transition: none !important;
                  animation-duration: .01ms !important;
                }
              }
            `}</style>
        </>
    );
}

export default Battle;
