import {A, useParams, useSearchParams, useNavigate} from "@solidjs/router";
import BattleHeader from "../components/Battles/battleheader";
import GreenCount from "../components/Count/greencount";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleColumn from "../components/Battles/battlecolumn";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {calculateWinnings, convertItems, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX, stopSFXChannel, startAnimationTicker} from "../util/sound";
import IndicatorLine from "../components/IndicatorLine/indicatorline";

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

    // Spin sounds — driven by requestAnimationFrame for drift-free sync
    let battleTicker = null

    function startBattleTicking(spinPhase) {
        if (battleTicker) battleTicker.cancel()

        battleTicker = startAnimationTicker(
          () => {
            playGameSFX('battle-tick', '/assets/sfx/casetick.wav', {
              channel: 'spin-tick',
              volume: 0.5,
              minIntervalMs: 30,
            })
          },
          spinPhase,
          30 // min interval
        )
    }

    function stopBattleTicking() {
        if (battleTicker) {
            battleTicker.cancel()
            battleTicker = null
        }
    }

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

                // Tick for the active spin phase (90 % of the 5 000 ms spinner duration)
                startBattleTicking(5000 * 0.9)

                let itemsInRound = wonItems().slice((roundNum - 1) * players(), roundNum * players())
                setRoundWinners(getRoundWinner(itemsInRound, battle().playersPerTeam))
            })

            ws().on('battle:ended', (battleId, { winnerTeam, serverSeed, clientSeed }) => {
                stopBattleTicking()
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
        stopBattleTicking()
      stopSFXChannel('spin-tick', { fadeOutMs: 70 })
        if (ws() && ws().connected) {
            ws().emit('battles:unsubscribe', prevBattle)
            ws().off('battle')
            ws().off('battle:join')
            ws().off('battle:commit')
            ws().off('battle:start')
            ws().off('battle:ended')
            ws().off('battle:start')
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

    return (
        <>
            <Title>Cosmic Luck | Battle</Title>

            <div class='battle-container fadein'>
                <BattleHeader battle={battle()} round={round()} state={state()} block={block()}/>

                {!battle() ? (
                    <Loader/>
                ) : (
                    <>
                        {/* ── Enhanced top bar ── */}
                        <div class='battle-topbar'>
                          {/* Left: back + battle cost */}
                          <div class='topbar-left'>
                            <button class='back-btn glass-btn' onClick={() => navigate('/battles')}>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'>
                                <polyline points='15 18 9 12 15 6'/>
                              </svg>
                              Back
                            </button>
                            <div class='battle-cost-pill'>
                              <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                              <span class='cost-label'>Battle Cost</span>
                              <span class='cost-value'>
                                {battle()?.cases?.reduce((s, c) => s + (c?.price || 0), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Center: game X of Y + case strip */}
                          <div class='topbar-center'>
                            <GreenCount number={round()} max={battle()?.rounds?.length} active={round() > 0} css={{width: '90px'}}/>
                            <div class='cases-container'>
                              <div class='cases' style={{'transform': `translateX(-${74 * Math.max(0, round() - 1) + 30}px)`}}>
                                <For each={battle()?.rounds}>{(c, index) => (
                                  <img
                                    class={'case ' + (round() - 1 === index() ? 'active' : '')}
                                    src={resolveImageSrc(getCase(c?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                    width='60' height='60'
                                    alt={getCase(c?.caseId)?.name || 'Battle case'}
                                    onError={useImageFallback}
                                  />
                                )}</For>
                              </div>
                            </div>
                          </div>

                          {/* Right: emoji bar + actions */}
                          <div class='topbar-right'>
                            <div class='emoji-bar'>
                              <For each={BATTLE_EMOJIS}>{(emoji) => (
                                <button class='emoji-btn' onClick={() => sendEmoji(emoji)}>{emoji}</button>
                              )}</For>
                            </div>
                            <div class='action-cluster'>
                              <A href='/docs/provably' class='cluster-btn' title='Provably Fair'>
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                                  <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'/>
                                  <path d='m9 12 2 2 4-4' stroke-linecap='round' stroke-linejoin='round'/>
                                </svg>
                              </A>
                              <button class='cluster-btn' title='Share' onClick={() => {
                                if (navigator.clipboard) navigator.clipboard.writeText(window.location.href)
                              }}>
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                                  <path d='M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'/>
                                  <polyline points='16 6 12 2 8 6'/>
                                  <line x1='12' y1='2' x2='12' y2='15'/>
                                </svg>
                              </button>
                              <button class='cluster-btn' title='Fullscreen' onClick={() => {
                                if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
                                else document.exitFullscreen?.()
                              }}>
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                                  <polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/>
                                  <line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Floating emoji overlay */}
                        <div class='emoji-overlay'>
                            <For each={floatingEmojis()}>{(e) => (
                                <span class='float-emoji' style={{ left: `${e.x}%` }}>{e.emoji}</span>
                            )}</For>
                        </div>

                        <div class='columns-wrapper'>
                          {/* Vertical center spine with IndicatorLine */}
                          <div class='center-spine'>
                            <IndicatorLine
                              orientation='vertical'
                              length='100%'
                              thickness='3px'
                              style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}
                            />
                          </div>

                          <div class='columns'>
                            <For each={new Array(players())}>{(column, index) =>
                                <BattleColumn
                                    index={index()}
                                    battle={battle()}
                                    player={battle()?.players[index()]}
                                    players={players()}
                                    team={Math.floor(index() / battle()?.playersPerTeam )}
                                    startOfTeam={index() % battle()?.playersPerTeam === 0}
                                    state={state()}
                                    round={round()}
                                    rounds={rounds()}
                                    winnerTeam={winnerTeam()}
                                    max={players() - 1}
                                    creator={isCreator()}
                                    total={won()}
                                    wonItems={wonItems()}
                                    roundWinners={roundWinners()}
                                />
                            }</For>
                          </div>
                        </div>

                        {/* Team Totals Footer */}
                        {battle() && battle().teams === 2 && (
                            <div class='team-totals'>
                                {/* Left team */}
                                <div class='team-side'>
                                    <div class='team-label'>
                                        <span class='team-dot left'/>
                                        <span>Left Team</span>
                                    </div>
                                    <div class='team-value'>
                                        <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                        <span>{getTeamTotal(0).toFixed(2)}</span>
                                    </div>
                                    <div class='team-avatars'>
                                        <For each={battle()?.players?.slice(0, battle()?.playersPerTeam)}>{(p) => (
                                            <div class='team-avatar-dot' title={p?.username || 'Bot'}>
                                                {p?.username ? p.username.charAt(0).toUpperCase() : '?'}
                                            </div>
                                        )}</For>
                                    </div>
                                </div>

                                {/* Center: total drops */}
                                <div class='total-drops'>
                                    <span>Total Drops</span>
                                    <div class='total-drops-value'>
                                        <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                        <span>{(getTeamTotal(0) + getTeamTotal(1)).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Right team */}
                                <div class='team-side right'>
                                    <div class='team-avatars'>
                                        <For each={battle()?.players?.slice(battle()?.playersPerTeam)}>{(p) => (
                                            <div class='team-avatar-dot right-side' title={p?.username || 'Bot'}>
                                                {p?.username ? p.username.charAt(0).toUpperCase() : '?'}
                                            </div>
                                        )}</For>
                                    </div>
                                    <div class='team-value'>
                                        <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                        <span>{getTeamTotal(1).toFixed(2)}</span>
                                    </div>
                                    <div class='team-label right'>
                                        <span>Right Team</span>
                                        <span class='team-dot right'/>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style jsx>{`
              .battle-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                display: flex;
                flex-direction: column;
                gap: 20px;

                box-sizing: border-box;
                padding: 20px 18px 96px;
                margin: 0 auto;
              }

              /* ── Enhanced top bar ── */
              .battle-topbar {
                width: 100%;
                min-height: 74px;
                box-sizing: border-box;
                position: relative;
                border-radius: var(--glass-radius);
                border: 1px solid var(--glass-border);
                background: var(--btn-glass-bg);
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 8px 32px rgba(0,0,0,0.25);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 16px;
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                transition: all var(--transition-smooth);
              }

              .battle-topbar::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                z-index: 1;
              }

              .topbar-left, .topbar-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 0 0 auto;
              }

              .topbar-right {
                justify-content: flex-end;
              }

              .topbar-center {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                overflow: hidden;
              }

              .battle-cost-pill {
                display: flex;
                align-items: center;
                gap: 6px;
                height: 34px;
                padding: 0 12px;
                border-radius: var(--glass-radius-sm);
                border: 1px solid rgba(31,214,95,0.25);
                background: linear-gradient(135deg, rgba(31,214,95,0.12), rgba(31,214,95,0.05));
                font-family: "Geogrotesque Wide", sans-serif;
              }

              .cost-label {
                color: #8b92a0;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .cost-value {
                color: #1fd65f;
                font-size: 13px;
                font-weight: 700;
              }

              .action-cluster {
                display: flex;
                align-items: center;
                gap: 4px;
              }

              .cluster-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: var(--glass-radius-xs);
                border: 1px solid var(--btn-glass-border);
                background: var(--btn-glass-bg);
                color: #6b7280;
                cursor: pointer;
                transition: all var(--transition-fast);
                text-decoration: none;
              }

              .cluster-btn:hover {
                border-color: rgba(31,214,95,0.25);
                color: #1fd65f;
                background: rgba(31,214,95,0.06);
              }

              /* ── Columns wrapper with center spine ── */
              .columns-wrapper {
                width: 100%;
                position: relative;
              }

              .center-spine {
                position: absolute;
                top: 14px;
                bottom: 14px;
                left: 50%;
                transform: translateX(-50%);
                width: 3px;
                z-index: 5;
                pointer-events: none;
              }

              .provably {
                width: auto;
                min-width: 142px;
                height: 36px;
                padding: 0 14px;
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border-radius: var(--glass-radius-sm);
                border: 1px solid rgba(31, 214, 95, 0.3);
                background: linear-gradient(135deg, rgba(31, 214, 95, 0.15), rgba(31, 214, 95, 0.06));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 8px 24px rgba(0,0,0,.25), var(--green-glow);
                color: #42e77d;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 800;
                text-decoration: none;
                text-transform: uppercase;
                white-space: nowrap;
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                transition: all var(--transition-smooth);
              }

              .provably:hover {
                color: #72f2a3;
                border-color: rgba(31, 214, 95, 0.5);
                background: linear-gradient(135deg, rgba(31, 214, 95, 0.22), rgba(31, 214, 95, 0.1));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 28px rgba(0,0,0,.3), var(--green-glow-strong);
                transform: translateY(-1px);
              }

              .provably:focus-visible {
                outline: 2px solid rgba(31, 214, 95, 0.75);
                outline-offset: 2px;
              }

              .emoji-bar {
                display: flex;
                align-items: center;
                gap: 4px;
                max-width: 268px;
                overflow-x: auto;
                scrollbar-width: none;
              }

              .emoji-bar::-webkit-scrollbar { display: none; }

              .emoji-btn {
                background: var(--btn-glass-bg);
                border: 1px solid var(--btn-glass-border);
                border-radius: var(--glass-radius-xs);
                width: 30px;
                height: 28px;
                font-size: 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                transition: all var(--transition-fast);
                line-height: 1;
                padding: 0;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.12);
              }

              .emoji-btn:hover {
                background: rgba(31, 214, 95, 0.08);
                border-color: rgba(31, 214, 95, 0.25);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.18), var(--green-glow);
                transform: scale(1.15);
              }

              .emoji-btn:active {
                transform: scale(0.92);
              }

              /* Floating emoji overlay */
              .emoji-overlay {
                position: relative;
                height: 0;
                overflow: visible;
                pointer-events: none;
              }

              @keyframes floatUp {
                0%   { transform: translateY(0)    scale(1);    opacity: 1;   }
                70%  { transform: translateY(-140px) scale(1.1); opacity: 0.9; }
                100% { transform: translateY(-220px) scale(0.7); opacity: 0;   }
              }

              .float-emoji {
                position: absolute;
                bottom: 0;
                font-size: 32px;
                animation: floatUp 2.8s ease-out forwards;
                pointer-events: none;
                user-select: none;
                filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
              }

              .cases-container {
                flex: 1;
                overflow: hidden;
                height: 100%;
                width: 100%;
                max-width: 485px;
                position: relative;
              }
               
              .cases {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                gap: 14px;
                 
                position: absolute;
                transform: translateX(-30px);
                left: 50%;
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              }
               
              .case {
                opacity: 0.4;
                transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease;
                filter: grayscale(1) brightness(0.7);
                transform: scale(0.92);
                object-fit: contain;
                border-radius: 8px;
              }
               
              .case.active {
                opacity: 1;
                filter: none;
                transform: scale(1);
                box-shadow: 0 0 20px rgba(31, 214, 95, 0.25);
              }

              .case.fallback {
                padding: 14px;
                box-sizing: border-box;
                opacity: .24;
              }

              .columns {
                width: 100%;
                overflow: visible;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
                align-items: start;
                gap: 14px;
                padding: 14px;
                border-radius: var(--glass-radius);
                border: 1px solid var(--glass-border);
                background: var(--btn-glass-bg);
                box-shadow: 
                  inset 0 1px 0 var(--glass-highlight), 
                  0 10px 32px rgba(0,0,0,0.26),
                  0 24px 60px rgba(0,0,0,0.22);
                position: relative;
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
              }
               
              .columns::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: var(--glass-radius);
                background: radial-gradient(circle at 50% 0%, 
                  rgba(31, 214, 95, 0.025), 
                  transparent 60%);
                pointer-events: none;
              }

              .columns:hover {
                border-color: rgba(31, 214, 95, 0.10);
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.05), 
                  0 12px 40px rgba(0,0,0,0.3),
                  0 28px 64px rgba(0,0,0,0.25),
                  0 0 0 1px rgba(31, 214, 95, 0.04);
              }

              /* Team Totals Bar */
              .team-totals {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 22px;
                border-radius: var(--glass-radius);
                border: 1px solid var(--glass-border);
                background: var(--btn-glass-bg);
                box-shadow: 
                  inset 0 1px 0 var(--glass-highlight), 
                  0 10px 32px rgba(0,0,0,0.26),
                  0 24px 60px rgba(0,0,0,0.22);
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                transition: all var(--transition-smooth);
              }

              .team-totals:hover {
                border-color: rgba(31, 214, 95, 0.12);
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.05), 
                  0 12px 36px rgba(0,0,0,0.3),
                  0 28px 64px rgba(0,0,0,0.25),
                  var(--green-glow);
              }

              .team-side {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
              }

              .team-side.right {
                justify-content: flex-end;
              }

              .team-label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .team-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.5);
              }

              .team-dot.right {
                background: #6fdcff;
                box-shadow: 0 0 8px rgba(111, 220, 255, 0.5);
              }

              .team-avatars {
                display: flex;
                flex-direction: row-reverse;
              }

              .team-avatar-dot {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(31,214,95,0.15);
                border: 2px solid rgba(31,214,95,0.3);
                color: #1fd65f;
                font-size: 10px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: -6px;
                font-family: "Geogrotesque Wide", sans-serif;
              }

              .team-avatar-dot.right-side {
                background: rgba(111,220,255,0.12);
                border-color: rgba(111,220,255,0.25);
                color: #6fdcff;
                margin-right: 0;
                margin-left: -6px;
              }

              .team-value {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #FFFFFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 15px;
                font-weight: 700;
              }

              .team-value img {
                filter: drop-shadow(0 0 6px rgba(31,214,95,.3));
              }

              .total-drops {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                padding: 0 24px;
                border-left: 1px solid rgba(255,255,255,0.06);
                border-right: 1px solid rgba(255,255,255,0.06);
              }

              .total-drops span:first-child {
                color: #6b7280;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .total-drops-value {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #FFFFFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 700;
              }

              @media only screen and (max-width: 1040px) {
                .battle-topbar { flex-wrap: wrap; min-height: auto; padding: 10px; }
                .topbar-right { width: 100%; justify-content: space-between; }
                .cases-container { max-width: none; min-width: 220px; }
                .team-totals { flex-wrap: wrap; gap: 12px; }
                .total-drops { border-left: none; border-right: none; padding: 12px 0; width: 100%; justify-content: center; }
                .center-spine { display: none; }
              }

              @media only screen and (max-width: 620px) {
                .battle-container { padding: 20px 12px 90px; gap: 18px; }
                .battle-topbar { padding: 8px; gap: 8px; }
                .topbar-center { order: 3; flex-basis: 100%; min-width: 0; }
                .emoji-bar { max-width: 178px; }
                .action-cluster { display: none; }
                .columns { grid-template-columns: 1fr; padding: 8px; }
                .team-totals { flex-direction: column; gap: 12px; }
                .total-drops { border-left: none; border-right: none; padding: 12px 0; width: 100%; justify-content: center; }
                .center-spine { display: none; }
              }

              @media (prefers-reduced-motion: reduce) {
                .cases, .case, .float-emoji {
                  transition: none;
                  animation-duration: .01ms;
                }
              }
            `}</style>
        </>
    );
}

export default Battle;
