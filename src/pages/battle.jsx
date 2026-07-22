import {A, useParams, useSearchParams, useNavigate} from "@solidjs/router";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleColumn from "../components/Battles/battlecolumn";
import BattleDropHistory from "../components/Battles/battledrophistory";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {calculateWinnings, convertItems, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX} from "../util/sound";
import Avatar from "../components/Level/avatar";
import {authedAPI} from "../util/api";

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

    async function recreateBattle() {
      if (!battle()) return

      const res = await authedAPI('/battles/create', 'POST', JSON.stringify({
        cases: battle()?.rounds?.map(r => r?.caseId),
        teams: battle()?.teams,
        playersPerTeam: battle()?.playersPerTeam,
        gamemode: battle()?.gamemode,
        cosmicSpin: !!battle()?.cosmicSpin,
        funding: battle()?.ownerFunding || 0,
        minLvl: battle()?.minLevel || 0,
        isPrivate: !!battle()?.privKey,
      }), true)

      if (res?.success) {
        let link = `/battle/${res?.battleId}`
        if (res?.privKey) {
          link += `?pk=${res?.privKey}`
        }
        navigate(link)
      }
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
                          <div class='topbar-left'>
                            <button class='recreate-btn' onClick={() => recreateBattle()}>
                              <span>Recreate</span>
                              <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                              <span>{(battle()?.entryPrice || 0).toFixed(2)}</span>
                            </button>

                            <button class='replay-btn' type='button'>
                              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12a9 9 0 1 1-2.64-6.36'/><polyline points='21 3 21 9 15 9'/></svg>
                              <span>Replay</span>
                            </button>
                          </div>

                          <div class='topbar-right'>
                            <div class='topbar-row'>
                              <button class='back-btn' onClick={() => navigate('/battles')}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>
                                <span>Back</span>
                              </button>
                              <button class='utility-btn' title='Help' type='button'>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='9'/><path d='M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 4'/><circle cx='12' cy='17' r='0.8'/></svg>
                              </button>
                            </div>

                            <div class='topbar-row'>
                              <A href='/fairness' class='utility-btn' title='Provably Fair'>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z'/><path d='M9 12l2 2 4-4'/></svg>
                              </A>
                              <button class='utility-btn' type='button' title='Round' disabled>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 6v6l4 2'/><circle cx='12' cy='12' r='9'/></svg>
                              </button>
                              <button class='utility-btn' type='button' title='Copy link' onClick={() => {
                                if (navigator.clipboard) navigator.clipboard.writeText(window.location.href)
                              }}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1'/><path d='M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1'/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class='columns-wrapper'>
                          <div class='columns'>
                            {/* Left half */}
                            <div class='team-lanes left'>
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
                                    compact={battle()?.teams === 2}
                                    side='left'
                                />
                              }</For>
                            </div>

                            {/* Center case reel — mirrors csgoluck.com/case-battle center rail */}
                            <Show when={players() > 1}>
                              <div class={'center-display ' + String(state() || '').toLowerCase()}>
                                <Show when={state() === 'WINNERS'} fallback={
                                  <>
                                    <div class='center-dashes'>
                                      <span/><span/><span/><span/><span/>
                                    </div>

                                    <div class='reel'>
                                      <div class='reel-bar left'/>
                                      <div class='reel-bar right'/>

                                      <div class='reel-case dim'>
                                        <Show when={rounds()?.[Math.max(0, round() - 2)]}>
                                          <img
                                            src={resolveImageSrc(getCase(rounds()?.[Math.max(0, round() - 2)]?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                            alt=''
                                            onError={useImageFallback}
                                          />
                                        </Show>
                                      </div>

                                      <div class='reel-case current'>
                                        <img
                                          src={resolveImageSrc(
                                            getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.img,
                                            '/assets/logo/cosmic-luck-logo.png'
                                          )}
                                          alt={getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.name || 'Case'}
                                          onError={useImageFallback}
                                        />
                                      </div>

                                      <div class='reel-case dim'>
                                        <Show when={rounds()?.[round()]}>
                                          <img
                                            src={resolveImageSrc(getCase(rounds()?.[round()]?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                            alt=''
                                            onError={useImageFallback}
                                          />
                                        </Show>
                                      </div>
                                    </div>

                                    <div class='center-footer'>
                                      <div class='center-price'>
                                        <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                        <span>{(getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.price || 0).toFixed(2)}</span>
                                      </div>
                                      <span class='center-name'>{getCase(rounds()?.[Math.max(0, round() - 1)]?.caseId)?.name || ''}</span>
                                    </div>
                                  </>
                                }>
                                  <div class='winner-callout'>
                                    <span class='winner-label'>Winner</span>
                                    <div class='winner-avatars'>
                                      <For each={getWinningPlayers()}>{(p) => (
                                        <Avatar height='40' id={p?.id} xp={p?.xp || 0}/>
                                      )}</For>
                                    </div>
                                    <div class='winner-names'>
                                      <For each={getWinningPlayers()}>{(p, i) => (
                                        <span class='winner-name'>{p?.username || 'Bot'}{i() < getWinningPlayers().length - 1 ? ', ' : ''}</span>
                                      )}</For>
                                    </div>
                                    <div class='winner-amount'>
                                      <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                      <span>{getTeamTotal(winnerTeam()).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </Show>
                              </div>
                            </Show>

                            {/* Right half */}
                            <div class='team-lanes right'>
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
                                      compact={battle()?.teams === 2}
                                      side='right'
                                  />
                                )
                              }}</For>
                            </div>
                          </div>
                        </div>

                        {/* Team Totals Footer */}
                        {battle() && battle().teams === 2 && (
                            <div class='team-totals'>
                              <article class='totals-card left'>
                                <h4>Left</h4>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                  <span>{getTeamTotal(0).toFixed(2)}</span>
                                </div>
                              </article>

                              <article class='totals-card center'>
                                <h4>Total</h4>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                  <span>{(getTeamTotal(0) + getTeamTotal(1)).toFixed(2)}</span>
                                </div>
                              </article>

                              <article class='totals-card right'>
                                <h4>Right</h4>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/>
                                  <span>{getTeamTotal(1).toFixed(2)}</span>
                                </div>
                              </article>
                            </div>
                        )}

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

              /* Live strip styled after reference */
              .battle-topbar {
                width: 100%;
                min-height: 74px;
                box-sizing: border-box;
                position: relative;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #131821;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 9px;
                padding: 7px 10px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
              }

              .topbar-left {
                display: flex;
                align-items: center;
                gap: 7px;
                flex: 0 0 auto;
              }

              .topbar-right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                justify-content: center;
                gap: 4px;
                margin-left: auto;
              }

              .topbar-row {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .recreate-btn {
                height: 31px;
                min-width: 134px;
                padding: 0 11px;
                border-radius: 4px;
                border: 1px solid rgba(66, 237, 133, 0.52);
                background: linear-gradient(180deg, #21cc5e 0%, #11a84d 100%);
                font-family: "Geogrotesque Wide", sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                color: #f6fff8;
                font-size: 10px;
                font-weight: 700;
                text-shadow: 0 1px 0 rgba(0,0,0,0.35);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.23);
                cursor: pointer;
                transition: filter .16s ease;
              }

              .recreate-btn:hover {
                filter: brightness(1.06);
              }

              .replay-btn {
                height: 31px;
                min-width: 102px;
                padding: 0 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202b;
                color: #d2dae8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
              }

              .replay-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #242c39;
              }

              .utility-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #8f98a9;
                cursor: pointer;
                transition: all var(--transition-fast);
                text-decoration: none;
                padding: 0;
                position: relative;
              }

              .utility-btn:hover {
                border-color: rgba(255,255,255,0.14);
                color: #e8eefc;
                background: #222a35;
              }

              .utility-btn:disabled {
                opacity: .5;
                cursor: default;
              }

              .back-btn {
                min-width: 92px;
                height: 27px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a202a;
                color: #b8c3d6;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
                padding: 0 9px;
              }

              .back-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #1a2029;
                color: #ffffff;
              }

              .columns-wrapper {
                width: 100%;
                position: relative;
                overflow-x: auto;
                overflow-y: hidden;
              }

              .columns {
                width: 100%;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: minmax(0, 1fr) 126px minmax(0, 1fr);
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

              .team-lanes {
                min-width: 0;
                display: flex;
                flex-direction: column;
                background: #0f131b;
              }

              .team-lanes.left {
                border-right: 1px solid rgba(255,255,255,0.035);
              }

              .team-lanes.right {
                border-left: 1px solid rgba(255,255,255,0.035);
              }

              /* Center case reel — mirrors csgoluck.com/case-battle center rail */
              .center-display {
                width: 126px;
                min-height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                position: relative;
                background:
                  linear-gradient(180deg, rgba(255,255,255,0.018), transparent 18%, transparent 82%, rgba(255,255,255,0.012)),
                  #090d13;
                padding: 12px 7px;
                box-sizing: border-box;
                border-left: 1px solid rgba(31,214,95,0.18);
                border-right: 1px solid rgba(31,214,95,0.18);
              }

              .center-dashes {
                display: flex;
                gap: 4px;
                z-index: 2;
              }

              .center-dashes span {
                width: 8px;
                height: 2px;
                border-radius: 999px;
                background: rgba(31,214,95,0.75);
                box-shadow: 0 0 6px rgba(31,214,95,0.5);
              }

              .reel {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                position: relative;
                padding: 0 10px;
              }

              .reel-bar {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                border-radius: 999px;
                background: linear-gradient(to bottom, transparent 0%, rgba(31,214,95,0.65) 20%, rgba(31,214,95,0.65) 80%, transparent 100%);
                pointer-events: none;
                z-index: 0;
              }

              .reel-bar.left { left: 0; }
              .reel-bar.right { right: 0; }

              .center-display.rolling .reel-bar {
                background: linear-gradient(to bottom, transparent 0%, #ffe600 22%, #ffe600 78%, transparent 100%);
                box-shadow: 0 0 8px rgba(255,230,0,.55);
              }

              .reel-case {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .reel-case img {
                object-fit: contain;
              }

              .reel-case.dim {
                width: 50px;
                height: 38px;
                opacity: 0.32;
                filter: grayscale(0.4);
              }

              .reel-case.dim img {
                width: 42px;
                height: 34px;
              }

              .reel-case.current img {
                width: 92px;
                height: 92px;
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
                max-width: 108px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .winner-callout {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
              }

              .winner-label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.6px;
                text-transform: uppercase;
                color: #1fd65f;
              }

              .winner-avatars {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
              }

              .winner-avatars :global(img) {
                border-radius: 50%;
                border: 2px solid rgba(31,214,95,0.5);
                box-shadow: 0 0 12px rgba(31,214,95,0.35);
              }

              .winner-names {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 2px;
                max-width: 150px;
              }

              .winner-name {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                color: #dbe4f2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .winner-amount {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 14px;
                font-weight: 800;
                color: #1fd65f;
              }

              /* Team Totals Bar */
              .team-totals {
                width: 100%;
                min-height: 46px;
                height: 46px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 6px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #111720;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
              }

              .totals-card {
                flex: 1;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.05);
                background: #0f151e;
                padding: 0 10px;
              }

              .totals-card.center {
                justify-content: center;
                gap: 12px;
                border-color: rgba(31,214,95,0.2);
                background: linear-gradient(180deg, rgba(31,214,95,0.08), rgba(15,21,30,0.95));
              }

              .totals-card h4 {
                margin: 0;
                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .totals-value {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #ffffff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .totals-value img {
                filter: drop-shadow(0 0 6px rgba(31,214,95,.3));
              }

              @media only screen and (max-width: 1040px) {
                .columns { min-width: 860px; }
                .topbar-left {
                  gap: 6px;
                }
                .recreate-btn {
                  min-width: 126px;
                }
              }

              @media only screen and (max-width: 620px) {
                .battle-container { padding: 8px 6px 24px; gap: 8px; }
                .battle-topbar { min-height: 92px; padding: 7px; gap: 8px; flex-wrap: wrap; align-items: stretch; }
                .topbar-left { order: 1; width: 100%; justify-content: flex-start; }
                .recreate-btn, .replay-btn { height: 30px; min-width: 0; }
                .topbar-right { order: 2; width: 100%; align-items: stretch; gap: 6px; }
                .topbar-row { justify-content: space-between; }
                .back-btn { min-width: 88px; }
                .columns { min-width: 760px; grid-template-columns: minmax(0, 1fr) 112px minmax(0, 1fr); }
                .center-display { width: 112px; }
                .team-totals { min-height: 40px; height: 40px; gap: 5px; padding: 5px; }
                .totals-card { padding: 0 7px; }
                .totals-card h4 { font-size: 9px; }
                .totals-value { font-size: 10px; }
                .totals-value img { width: 12px; height: 12px; }
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
