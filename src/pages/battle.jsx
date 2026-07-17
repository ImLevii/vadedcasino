import {A, useParams, useSearchParams} from "@solidjs/router";
import BattleHeader from "../components/Battles/battleheader";
import GreenCount from "../components/Count/greencount";
import {createEffect, createResource, createSignal, For, onCleanup} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleColumn from "../components/Battles/battlecolumn";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {calculateWinnings, convertItems, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX, stopSFXChannel} from "../util/sound";

function Battle(props) {

    let params = useParams()
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

    // Spin sounds — curve-matched to the CSS cubic-bezier(.08,.7,.14,1)
    let battleTickTimer = null

    /**
     * Derivative of cubic-bezier(0.08, 0.7, 0.14, 1.0) — the battle spinner easing.
     * Returns instantaneous speed at normalized time t (0→1).
     */
    function battleBezierSpeed(t) {
        // Control points: P0=0, P1=0.08, P2=0.7, P3=1
        const p1 = 0.08, p2 = 0.7, p3 = 1
        const u = 1 - t
        return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2)
    }

    function startBattleTicking(spinPhase) {
        if (battleTickTimer) clearTimeout(battleTickTimer)
        let elapsed = 0

        const minDelay = 75
        const maxDelay = 320

        const tick = () => {
          playGameSFX('battle-tick', '/assets/sfx/casetick.wav', {
            channel: 'spin-tick',
            volume: 0.5,
            minIntervalMs: 40,
          })
            const progress = Math.min(elapsed / spinPhase, 0.999)
            const speed = Math.max(battleBezierSpeed(progress), 0.01)
            const normalized = 1 - Math.min(1, speed / 3)
            const delay = Math.round(minDelay + normalized * (maxDelay - minDelay))
            elapsed += delay
            if (elapsed < spinPhase) {
                battleTickTimer = setTimeout(tick, delay)
            } else {
                battleTickTimer = null
            }
        }
        battleTickTimer = setTimeout(tick, minDelay)
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
                if (battleTickTimer) { clearTimeout(battleTickTimer); battleTickTimer = null }
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
        if (battleTickTimer) { clearTimeout(battleTickTimer); battleTickTimer = null }
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
                        <div class='round-info'>
                            <div>
                                <GreenCount number={round()} max={battle()?.rounds?.length} active={round() > 0} css={{width: '90px'}}/>
                            </div>

                            <div class='cases-container'>
                              <div class='cases' style={{'transform': `translateX(-${74 * Math.max(0, round() - 1) + 30}px)`}}>
                                    <For each={battle()?.rounds}>{(c, index) => <img class={'case ' + (round() - 1 === index() ? 'active' : '')}
                                                 src={resolveImageSrc(getCase(c?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                                 width='60' height='60'
                                                 alt={getCase(c?.caseId)?.name || 'Battle case'}
                                                 onError={useImageFallback}/>}</For>
                                </div>
                            </div>

                            <div class='round-info-right'>
                                <div class='emoji-bar'>
                                    <For each={BATTLE_EMOJIS}>{(emoji) => (
                                        <button class='emoji-btn' onClick={() => sendEmoji(emoji)}>{emoji}</button>
                                    )}</For>
                                </div>
                                <A href='/docs/provably' class='provably'>
                                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                                    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' stroke='currentColor' stroke-width='2'/>
                                    <path d='m9 12 2 2 4-4' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                                  </svg>
                                  <span>Provably Fair</span>
                                </A>
                            </div>
                        </div>

                        {/* Floating emoji overlay */}
                        <div class='emoji-overlay'>
                            <For each={floatingEmojis()}>{(e) => (
                                <span class='float-emoji' style={{ left: `${e.x}%` }}>{e.emoji}</span>
                            )}</For>
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

                        {/* Team Totals */}
                        {battle() && battle().teams === 2 && (
                            <div class='team-totals'>
                                <div class='team-total'>
                                    <div class='team-label'>
                                        <span class='team-dot left'/>
                                        <span>Left Team</span>
                                    </div>
                                    <div class='team-value'>
                                        <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                        <span>{getTeamTotal(0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div class='total-drops'>
                                    <span>Total Drops</span>
                                    <span>{getTeamTotal(0).toFixed(2) + getTeamTotal(1).toFixed(2)}</span>
                                </div>
                                <div class='team-total'>
                                    <div class='team-label'>
                                        <span>Right Team</span>
                                        <div class='team-bots'>
                                            <img src='/assets/icons/bot.svg' height='16' width='16' alt=''/>
                                            <img src='/assets/icons/bot.svg' height='16' width='16' alt=''/>
                                            <img src='/assets/icons/bot.svg' height='16' width='16' alt=''/>
                                        </div>
                                    </div>
                                    <div class='team-value'>
                                        <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                                        <span>{getTeamTotal(1).toFixed(2)}</span>
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

              .round-info {
                width: 100%;
                min-height: 74px;
                box-sizing: border-box;
                position: relative;

                border-radius: var(--glass-radius);
                border: 1px solid var(--glass-border);
                background: var(--btn-glass-bg);
                box-shadow: 
                  inset 0 1px 0 var(--glass-highlight), 
                  0 8px 32px rgba(0,0,0,0.25),
                  0 16px 48px rgba(0,0,0,0.2);

                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 16px;
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
                transition: all var(--transition-smooth);
              }
               
              .round-info::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, 
                  transparent, 
                  rgba(255,255,255,0.08), 
                  transparent);
                z-index: 1;
              }
               
              .round-info:hover {
                border-color: rgba(31, 214, 95, 0.18);
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.06), 
                  0 10px 32px rgba(0,0,0,0.3),
                  0 20px 52px rgba(0,0,0,0.25),
                  0 0 0 1px rgba(31, 214, 95, 0.06),
                  var(--green-glow);
              }

              .round-info > div:first-child {
                flex: 0 0 auto;
              }

              .round-info-right {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                flex: 0 0 auto;
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

              .team-total {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                flex: 1;
              }

              .team-label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
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

              .team-dot.left {
                background: #1fd65f;
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.5);
              }

              .team-bots {
                display: flex;
                gap: 4px;
                margin-left: 4px;
              }

              .team-value {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #FFFFFF;
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
                gap: 4px;
                padding: 0 24px;
                border-left: 1px solid rgba(255,255,255,0.06);
                border-right: 1px solid rgba(255,255,255,0.06);
              }

              .total-drops span:first-child {
                color: #6b7280;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .total-drops span:last-child {
                color: #FFFFFF;
                font-size: 16px;
                font-weight: 700;
              }

              @media only screen and (max-width: 1040px) {
                .round-info { flex-wrap: wrap; }
                .round-info-right { width: 100%; justify-content: space-between; }
                .cases-container { max-width: none; min-width: 220px; }
                .team-totals {
                  flex-wrap: wrap;
                  gap: 12px;
                }
                .total-drops {
                  border-left: none;
                  border-right: none;
                  padding: 12px 0;
                  width: 100%;
                  justify-content: center;
                }
              }

              @media only screen and (max-width: 620px) {
                .battle-container { padding: 20px 12px 90px; gap: 18px; }
                .round-info {
                  padding: 10px;
                  gap: 8px;
                }
                .cases-container { order: 3; flex-basis: 100%; height: 64px; }
                .round-info-right { width: auto; margin-left: auto; }
                .round-info-right .provably { display: none; }
                .emoji-bar { max-width: 178px; }
                .columns { grid-template-columns: 1fr; padding: 8px; }
                .team-totals {
                  flex-direction: column;
                  gap: 12px;
                }
                .total-drops {
                  border-left: none;
                  border-right: none;
                  padding: 12px 0;
                  width: 100%;
                  justify-content: center;
                }
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