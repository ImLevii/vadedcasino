import {A, useParams, useSearchParams, useNavigate} from "@solidjs/router";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleColumn from "../components/Battles/battlecolumn";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {calculateWinnings, convertItems, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX} from "../util/sound";
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

    return (
        <>
            <Title>Cosmic Luck | Battle</Title>

            <div class='battle-container fadein'>
                {!battle() ? (
                    <Loader/>
                ) : (
                    <>
                        {/* Live controls strip */}
                        <div class='battle-topbar'>
                          <div class='topbar-left-stack'>
                            <div class='battle-cost-pill stat-panel'>
                              <span class='cost-label'>Battle Cost</span>
                              <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                              <span class='cost-value'>
                                {battle()?.cases?.reduce((s, c) => s + (c?.price || 0), 0).toFixed(2)}
                              </span>
                            </div>

                            <div class='round-pill stat-panel'>
                              <span class='cost-label'>Game</span>
                              <span class='round-value'>{round() || 0} OF {battle()?.rounds?.length || 0}</span>
                            </div>
                          </div>

                          <div class='topbar-center'>
                            <button class='inspect-btn'>Inspect</button>

                            <div class='center-icons'>
                              <button class='icon-btn' title='Live'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='1'/></svg></button>
                              <button class='icon-btn' title='Round'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 6v6l4 2'/><circle cx='12' cy='12' r='9'/></svg></button>
                              <button class='icon-btn' title='Loading'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12a9 9 0 1 1-6.22-8.56'/></svg></button>
                            </div>

                            <div class='cases-container'>
                              <IndicatorLine
                                orientation='horizontal'
                                length='10px'
                                thickness='2px'
                                pulse={false}
                                style={{ position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)', 'z-index': 4 }}
                              />
                              <IndicatorLine
                                orientation='horizontal'
                                length='10px'
                                thickness='2px'
                                pulse={false}
                                style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', 'z-index': 4 }}
                              />
                              <div class='cases' style={{'transform': `translateX(-${74 * Math.max(0, round() - 1) + 30}px)`}}>
                                <For each={battle()?.rounds}>{(c, index) => (
                                  <div class={'case-thumb ' + (round() - 1 === index() ? 'active' : '')}>
                                    <img
                                      class='case-thumb-img'
                                      src={resolveImageSrc(getCase(c?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                      width='56' height='56'
                                      alt={getCase(c?.caseId)?.name || 'Battle case'}
                                      onError={useImageFallback}
                                    />
                                  </div>
                                )}</For>
                              </div>
                            </div>
                          </div>

                          <div class='topbar-right'>
                            <button class='back-btn stat-panel' onClick={() => navigate('/battles')}>
                              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>
                              <span>Back</span>
                            </button>

                            <div class='right-icons'>
                              <A href='/fairness' class='icon-btn' title='Provably Fair'>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z'/><path d='M9 12l2 2 4-4'/></svg>
                              </A>
                              <button class='icon-btn' title='Share' onClick={() => {
                                if (navigator.clipboard) navigator.clipboard.writeText(window.location.href)
                              }}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.6' y1='13.5' x2='15.4' y2='17.5'/><line x1='15.4' y1='6.5' x2='8.6' y2='10.5'/></svg>
                              </button>
                              <button class='icon-btn' title='Fullscreen' onClick={() => {
                                if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
                                else document.exitFullscreen?.()
                              }}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
                              </button>
                              <button class='icon-btn' title='Open battle link'>
                                <A href={`/battle/${battle()?.id}${battle()?.privKey ? `?pk=${battle()?.privKey}` : ''}`} class='gamemode-link'></A>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 3h7v7'/><path d='M10 14L21 3'/><path d='M21 14v7h-7'/><path d='M3 10V3h7'/><path d='M3 3l7 7'/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class='columns-wrapper'>
                          <div class='columns'>
                            {/* Left half */}
                            <For each={new Array(Math.ceil(players() / 2))}>{(_, idx) =>
                                <BattleColumn
                                    index={idx()}
                                    battle={battle()}
                                    player={battle()?.players[idx()]}
                                    players={players()}
                                    team={Math.floor(idx() / battle()?.playersPerTeam)}
                                    startOfTeam={idx() % battle()?.playersPerTeam === 0}
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

                            {/* Center case display */}
                            <Show when={players() > 1}>
                              <div class='center-display'>
                                <div class='center-vline'/>
                                <div class='center-dashes'>
                                  <span/><span/><span/>
                                </div>
                                <img
                                  class='center-case-img'
                                  src={resolveImageSrc(
                                    getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.img,
                                    '/assets/logo/cosmic-luck-logo.png'
                                  )}
                                  alt={getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.name || 'Case'}
                                  onError={useImageFallback}
                                />
                                <div class='center-footer'>
                                  <div class='center-price'>
                                    <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                    <span>{(getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.price || 0).toFixed(2)}</span>
                                  </div>
                                  <span class='center-name'>{getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.name || ''}</span>
                                </div>
                              </div>
                            </Show>

                            {/* Right half */}
                            <For each={new Array(Math.floor(players() / 2))}>{(_, idx) => {
                              const colIdx = Math.ceil(players() / 2) + idx()
                              return (
                                <BattleColumn
                                    index={colIdx}
                                    battle={battle()}
                                    player={battle()?.players[colIdx]}
                                    players={players()}
                                    team={Math.floor(colIdx / battle()?.playersPerTeam)}
                                    startOfTeam={colIdx % battle()?.playersPerTeam === 0}
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
                              )
                            }}</For>
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
                --battle-panel: #101722;
                --battle-panel-soft: #151d2a;
                --battle-border: rgba(140, 156, 180, 0.2);
                --battle-border-strong: rgba(31, 214, 95, 0.35);
                --battle-text-dim: #8792a4;
                --battle-text: #dbe4f2;

                width: 100%;
                max-width: 1175px;
                height: fit-content;

                display: flex;
                flex-direction: column;
                gap: 14px;

                box-sizing: border-box;
                padding: 18px 18px 96px;
                margin: 0 auto;
                position: relative;
                isolation: isolate;
              }

              /* Live strip styled after reference */
              .battle-topbar {
                width: 100%;
                min-height: 76px;
                box-sizing: border-box;
                position: relative;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #131821;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 8px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
              }

              .topbar-left-stack, .topbar-right {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 8px;
                flex: 0 0 auto;
              }

              .topbar-right {
                align-items: flex-end;
              }

              .stat-panel {
                width: 122px;
                height: 28px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.07);
                background: #0f141c;
                font-family: "Geogrotesque Wide", sans-serif;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
              }

              .battle-cost-pill {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0 8px;
              }

              .round-pill {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 8px;
                color: #ccd5e3;
                font-size: 11px;
                font-weight: 700;
              }

              .round-value {
                color: #eef3ff;
                font-size: 11px;
                font-weight: 800;
              }

              .topbar-center {
                flex: 1;
                min-width: 0;
                display: grid;
                grid-template-columns: 112px 96px minmax(220px, 1fr);
                gap: 8px;
                align-items: center;
                overflow: hidden;
              }

              .inspect-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 36px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1f2530;
                color: #cdd6e5;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
              }

              .inspect-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #252c38;
              }

              .center-icons {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .right-icons {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .cost-label {
                color: #8b92a0;
                font-size: 8px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .cost-value {
                color: #1fd65f;
                font-size: 12px;
                font-weight: 700;
              }

              .icon-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #6b7280;
                cursor: pointer;
                transition: all var(--transition-fast);
                text-decoration: none;
                padding: 0;
                position: relative;
              }

              .icon-btn:hover {
                border-color: rgba(255,255,255,0.14);
                color: #e8eefc;
                background: #222a35;
              }

              .back-btn {
                width: 122px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                color: #b8c3d6;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
              }

              .back-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #1a2029;
                color: #ffffff;
              }

              .columns-wrapper {
                width: 100%;
                position: relative;
              }

              .cases-container {
                flex: 1;
                overflow: hidden;
                height: 100%;
                width: 100%;
                min-height: 52px;
                position: relative;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 4px;
                background: #10151d;
                padding: 0 7px;
              }
               
              .cases {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                gap: 7px;
                 
                position: absolute;
                transform: translateX(-30px);
                left: 50%;
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              }
               
              .case-thumb {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 52px;
                height: 52px;
                flex-shrink: 0;
                border-radius: 4px;
                background: #1b212c;
                border: 1px solid rgba(255,255,255,.07);
                transition: all 0.3s ease;
                box-shadow: none;
              }

              .case-thumb.active {
                background: #212834;
                border-color: rgba(31,214,95,.3);
                box-shadow: none;
              }

              .case-thumb-img {
                object-fit: contain;
                opacity: 0.4;
                filter: grayscale(1) brightness(0.7);
                transform: scale(0.9);
                transition: all 0.3s ease;
              }

              .case-thumb.active .case-thumb-img {
                opacity: 1;
                filter: none;
                transform: scale(1);
              }

              .case-thumb.fallback .case-thumb-img {
                opacity: 0.24;
              }

              .columns {
                width: 100%;
                box-sizing: border-box;
                display: flex;
                align-items: stretch;
                gap: 0;
                padding: 0;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #0d1219;
                position: relative;
                overflow: hidden;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
              }

              /* Center case display */
              .center-display {
                width: 176px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                position: relative;
                background: #0c111a;
                padding: 22px 12px 18px;
                box-sizing: border-box;
                border-left: 1px solid rgba(31,214,95,0.18);
                border-right: 1px solid rgba(31,214,95,0.18);
              }

              .center-vline {
                position: absolute;
                left: 50%;
                top: 0;
                bottom: 0;
                width: 2px;
                transform: translateX(-50%);
                background: linear-gradient(to bottom, transparent 0%, rgba(31,214,95,0.65) 18%, rgba(31,214,95,0.65) 82%, transparent 100%);
                pointer-events: none;
                z-index: 0;
              }

              .center-dashes {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 4px;
                z-index: 2;
              }

              .center-dashes span {
                width: 10px;
                height: 2px;
                border-radius: 999px;
                background: rgba(31,214,95,0.75);
                box-shadow: 0 0 6px rgba(31,214,95,0.5);
              }

              .center-case-img {
                width: 116px;
                height: 116px;
                object-fit: contain;
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 6px 24px rgba(0,0,0,0.55));
              }

              .center-footer {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                position: relative;
                z-index: 1;
              }

              .center-price {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #1fd65f;
              }

              .center-name {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 600;
                color: #6b7280;
                text-align: center;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              /* Team Totals Bar */
              .team-totals {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #111720;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
              }

              .team-side {
                display: flex;
                align-items: center;
                gap: 9px;
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
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: rgba(31,214,95,0.15);
                border: 2px solid rgba(31,214,95,0.3);
                color: #1fd65f;
                font-size: 9px;
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
                gap: 4px;
                color: #ffffff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
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
                padding: 0 18px;
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
                gap: 4px;
                color: #ffffff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
              }

              @media only screen and (max-width: 1040px) {
                .battle-topbar { min-height: auto; padding: 10px; }
                .topbar-center { grid-template-columns: 108px 92px minmax(180px, 1fr); }
                .team-totals { flex-wrap: wrap; gap: 12px; }
                .total-drops { border-left: none; border-right: none; padding: 12px 0; width: 100%; justify-content: center; }
              }

              @media only screen and (max-width: 620px) {
                .battle-container { padding: 20px 12px 90px; gap: 18px; }
                .battle-topbar { padding: 8px; gap: 8px; }
                .topbar-left-stack { width: 100%; flex-direction: row; }
                .topbar-right { width: 100%; align-items: center; flex-direction: row; justify-content: space-between; }
                .topbar-center { width: 100%; order: 3; grid-template-columns: 88px 82px 1fr; }
                .inspect-btn { height: 34px; }
                .center-icons { gap: 4px; }
                .columns { grid-template-columns: 1fr; padding: 8px; }
                .team-totals { flex-direction: column; gap: 12px; }
                .total-drops { border-left: none; border-right: none; padding: 12px 0; width: 100%; justify-content: center; }
              }

              @media (prefers-reduced-motion: reduce) {
                .cases, .case {
                  transition: none;
                  animation-duration: .01ms;
                }
              }
            `}</style>
        </>
    );
}

export default Battle;
