import {useParams, useSearchParams, useNavigate} from "@solidjs/router";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../contexts/socketprovider";
import Loader from "../components/Loader/loader";
import BattleColumn from "../components/Battles/battlecolumn";
import BattleDropHistory from "../components/Battles/battledrophistory";
import {calculateWinnings, fillEmptySlots, getRoundWinner, getWonItems} from "../util/battleutil";
import {Title} from "@solidjs/meta";
import {resolveImageSrc} from "../util/image";
import {playGameSFX} from "../util/sound";
import Avatar from "../components/Level/avatar";
import BattleFairness from "../components/Battles/battlefairness";

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
    const [inspecting, setInspecting] = createSignal(false)
    const [fairnessOpen, setFairnessOpen] = createSignal(false)
    const [fairnessRevision, setFairnessRevision] = createSignal(0)

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

                setPlayers(max)
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

                setBattle(b)
            })

            ws().on('battle:fairness', (id) => { if (id === battle()?.id) setFairnessRevision(n => n + 1) })

            ws().on('battle:join', (id, user) => {
                let curBattle = battle()
                if (id !== curBattle?.id) return

                curBattle.players[user.slot - 1] = user
                setBattle({...curBattle})
            })

            ws().on('battle:commit', (id, block) => {
                if (id !== battle()?.id) return
                setState('EOS')
                setBlock(block)
            })

            ws().on('battle:start', (battleId, rounds, clientSeed, serverSeed) => {
                if (battleId !== battle()?.id) return
                setFairnessRevision(n => n + 1)
                setRounds(rounds)
                setWonItems(getWonItems(rounds, battle()?.cases))
                setWon(calculateWinnings(battle().cases, rounds, battle().playersPerTeam))
            })

            ws().on('battle:round', (battleId, roundNum) => {
                if (battleId !== battle()?.id) return
                setFairnessRevision(n => n + 1)
                setState('ROLLING')
                setRound(roundNum)

                let itemsInRound = wonItems().slice((roundNum - 1) * players(), roundNum * players())
                setRoundWinners(getRoundWinner(itemsInRound, battle().playersPerTeam))
            })

            ws().on('battle:ended', (battleId, { winnerTeam, serverSeed, clientSeed }) => {
              if (battleId !== battle()?.id) return
              setFairnessRevision(n => n + 1)
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
            ws().off('battle:fairness')
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
        setFairnessOpen(false)
        setPlayers(0)
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

    function currentCase() {
      const sequence = rounds().length ? rounds() : battle()?.rounds || []
      return getCase(sequence[Math.max(0, round() - 1)]?.caseId)
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
            .filter(item => teamPlayerIds?.includes(item.userId) && (state() === 'WINNERS' || item.round < round()))
            .reduce((sum, item) => sum + (item?.price || 0), 0)
    }

    function getWinningPlayers() {
        if (!battle() || state() !== 'WINNERS') return []
        return battle()?.players?.filter((p, idx) => Math.floor(idx / battle()?.playersPerTeam) === winnerTeam()) || []
    }

    return (
        <>
            <Title>Cosmic Luck | Battle</Title>
            <Show when={fairnessOpen()}><BattleFairness id={params.id} privateKey={searchParams.pk} revision={fairnessRevision()} onClose={() => setFairnessOpen(false)}/></Show>

            <div class='battle-container fadein'>
                <div class='floating-emojis'>
                  <For each={floatingEmojis()}>{(item) => (
                    <span class='floating-emoji' style={{ left: `${item.x}%` }}>{item.emoji}</span>
                  )}</For>
                </div>

                {!battle() ? (
                    <Loader/>
                ) : (
                    <>
                        {/* Live controls strip */}
                        <div class='battle-topbar'>
                          <div class='topbar-left-block'>
                            <div class='topbar-row'>
                              <div class='battle-cost-pill'>
                                <span class='pill-label'>Battle Cost</span>
                                <img src='/assets/chips/chip-green.png' height='12' width='12' alt=''/>
                                <span class='pill-value'>{((battle()?.entryPrice || 0) > 0 ? battle()?.entryPrice : battle()?.rounds?.reduce((sum, r) => sum + (getCase(r.caseId)?.price || 0), 0) || 0).toFixed(2)}</span>
                              </div>
                              <button class='inspect-btn' type='button' aria-expanded={inspecting()} onClick={() => setInspecting(!inspecting())}>Inspect</button>
                            </div>

                            <div class='topbar-row'>
                              <div class='round-pill'><span>Game</span> {Math.max(1, round() || 0)} of {battle()?.rounds?.length || 0}</div>
                              <span class='mode-label'>{battle()?.gamemode || 'Standard'}</span>
                            </div>
                          </div>

                          <div class='topbar-cases'>
                            <div class='topbar-cases-viewport' tabIndex='0' aria-label='Battle rounds'>
                              <div class='cases-track'>
                                <For each={battle()?.rounds || []}>{(r, index) => (
                                  <div ref={el => createEffect(() => { if (index() === Math.max(0, round() - 1)) el.parentElement?.parentElement?.scrollTo({ left: Math.max(0, el.offsetLeft - el.parentElement.parentElement.clientWidth + 80), behavior: 'instant' }) })} class={'case-mini ' + (Math.max(0, (round() || 1) - 1) === index() ? 'active' : '')}>
                                    <img
                                      src={resolveImageSrc(getCase(r?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                                      alt={getCase(r?.caseId)?.name || 'Battle case'}
                                      onError={useImageFallback}
                                    />
                                  </div>
                                )}</For>
                              </div>
                            </div>
                          </div>

                          <div class='topbar-right-block'>
                            <button class='fairness-btn' type='button' onClick={() => setFairnessOpen(true)} aria-haspopup='dialog'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'><path d='m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4Z'/><path d='m8 12 3 3 5-6'/></svg>
                              Provably Fair
                            </button>
                            <div class='topbar-row'>
                              <button class='back-btn' onClick={() => navigate('/battles')}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 18 9 12 15 6'/></svg>
                                <span>Back</span>
                              </button>
                            </div>

                            <div class='topbar-row'>
                              <button class='utility-btn' type='button' title='Copy link' onClick={() => {
                                if (navigator.clipboard) navigator.clipboard.writeText(window.location.href)
                              }}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1'/><path d='M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1'/></svg>
                              </button>
                              <button class='utility-btn' type='button' title='Fullscreen' onClick={() => {
                                if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
                                else document.exitFullscreen?.()
                              }}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Emoji reactions */}
                        <Show when={props.user}>
                          <div class='emoji-bar' role='group' aria-label='Battle reactions'>
                            <For each={BATTLE_EMOJIS}>{(emoji) => (
                              <button class='emoji-btn' type='button' aria-label={`React with ${emoji}`} title={`React with ${emoji}`} onClick={() => sendEmoji(emoji)}>{emoji}</button>
                            )}</For>
                          </div>
                        </Show>

                        <Show when={inspecting()}>
                          <div class='case-inspection'>
                            <For each={battle()?.cases || []}>{c => (
                              <div class='inspected-case'>
                                <img src={resolveImageSrc(c.img)} alt='' onError={useImageFallback}/>
                                <div><strong>{c.name}</strong><span>{battle().rounds.filter(r => r.caseId === c.id).length} rounds ? {Number(c.price || 0).toFixed(2)} each</span></div>
                              </div>
                            )}</For>
                          </div>
                        </Show>

                        <div class='columns-wrapper'>
                          <div class='columns' classList={{ duel: players() === 2 }} style={{ '--desktop-reel-item-size': players() > 2 ? '108px' : '128px' }}>
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
                                    compact={true}
                                    side='left'
                                />
                              }</For>
                            </div>

                            {/* Center case reel — mirrors csgoluck.com/case-battle center rail */}
                            <Show when={players() > 1}>
                              <div class={'center-display ' + String(state() || '').toLowerCase()}>
                                {/* Decorative rail chrome — mirrors the reference layout */}
                                <img class='center-watermark top' src='/assets/icons/logoswords.svg' alt='' aria-hidden='true'/>
                                <img class='center-watermark bottom' src='/assets/icons/logoswords.svg' alt='' aria-hidden='true'/>
                                <div class='lane-rail'>
                                  <For each={new Array(Math.ceil(players() / 2))}>{() => (
                                    <div class='lane-tick'><span/></div>
                                  )}</For>
                                </div>
                                <div class='center-dashes' aria-hidden='true'><span/><span/><span/><span/><span/></div>
                                <div class='reel-case current'>
                                  <img src={resolveImageSrc(currentCase()?.img, '/assets/logo/cosmic-luck-logo.png')} alt={currentCase()?.name || 'Battle case'} onError={useImageFallback}/>
                                </div>
                                <div class='center-footer'>
                                  <div class='center-price'><img src='/assets/chips/chip-green.png' height='14' width='14' alt=''/><span>{Number(currentCase()?.price || 0).toFixed(2)}</span></div>
                                  <span class='center-name'>{currentCase()?.name}</span>
                                </div>
                                <Show when={state() === 'WINNERS'}>
                                  <div class='winner-callout'>
                                    <span class='winner-label'>{battle()?.teams === 2 ? (winnerTeam() === 0 ? 'Left team wins' : 'Right team wins') : `Team ${winnerTeam() + 1} wins`}</span>
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
                                const colIdx = () => Math.ceil(players() / 2) + idx()
                                return (
                                  <BattleColumn
                                      index={colIdx()}
                                      battle={battle()}
                                      player={battle()?.players[colIdx()]}
                                      players={players()}
                                      team={Math.floor(colIdx() / battle()?.playersPerTeam)}
                                      startOfTeam={colIdx() % battle()?.playersPerTeam === 0}
                                      state={state()}
                                      round={round()}
                                      rounds={rounds()}
                                      winnerTeam={winnerTeam()}
                                      max={players() - 1}
                                      creator={isCreator()}
                                      total={won()}
                                      wonItems={wonItems()}
                                      roundWinners={roundWinners()}
                                      compact={true}
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
                              <div class='team-side'>
                                <div class='team-label'>Left Team</div>
                                <div class='team-avatars'>
                                  <For each={battle()?.players?.slice(0, battle()?.playersPerTeam) || []}>{(p) => (
                                    <Avatar height='20' id={p?.id || '?'} xp={p?.xp || 0}/>
                                  )}</For>
                                </div>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='12' width='12' alt=''/>
                                  <span>{getTeamTotal(0).toFixed(2)}</span>
                                </div>
                              </div>

                              <div class='total-drops'>
                                <span class='team-label'>Total Drops</span>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='12' width='12' alt=''/>
                                  <span>{(getTeamTotal(0) + getTeamTotal(1)).toFixed(2)}</span>
                                </div>
                              </div>

                              <div class='team-side right'>
                                <div class='totals-value'>
                                  <img src='/assets/chips/chip-green.png' height='12' width='12' alt=''/>
                                  <span>{getTeamTotal(1).toFixed(2)}</span>
                                </div>
                                <div class='team-avatars'>
                                  <For each={battle()?.players?.slice(battle()?.playersPerTeam) || []}>{(p) => (
                                    <Avatar height='20' id={p?.id || '?'} xp={p?.xp || 0}/>
                                  )}</For>
                                </div>
                                <div class='team-label'>Right Team</div>
                              </div>
                            </div>
                        )}

                        {/* Drop History */}
                        <Show when={battle()?.players?.length > 0}>
                          <BattleDropHistory
                            players={battle()?.players || []}
                            wonItems={wonItems()}
                            rounds={battle()?.rounds || []}
                            state={state()}
                            round={round()}
                          />
                        </Show>


                    </>
                )}
            </div>

            <style jsx>{`

          .fairness-btn { display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; background:#121b16; color:#a7b6ac; border:1px solid #2b3c30; border-radius:4px; padding:7px 10px; font:inherit; font-size:11px; cursor:pointer; }
          .fairness-btn:hover { color:#1fd65f; border-color:#258b49; }

          .battle-container {
            width: 100%;
            max-width: 2040px;
            margin: 0 auto;
            padding: 18px 12px 32px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            position: relative;
            color: #f2f3f5;
            box-sizing: border-box;
          }

          .battle-topbar {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 92px;
            padding: 12px;
            border-radius: 6px;
            background: #17191f;
          }

          .topbar-left-block,.topbar-right-block {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex-shrink: 0;
          }

          .topbar-row {
            display: flex;
            align-items: center;
            gap: 7px;
          }

          .battle-cost-pill,.round-pill {
            width: 148px;
            min-height: 32px;
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 0 10px;
            background: #0e1015;
            border: 1px solid #090b0f;
            border-radius: 3px;
            font-size: 11px;
            box-sizing: border-box;
          }

          .pill-label,.round-pill>span {
            color: #9298a5;
            margin-right: 3px;
            font-size: 10px;
          }

          .pill-value {
            color: #1fd65f;
            font-weight: 700;
          }

          .round-pill {
            font-weight: 700;
          }

          .mode-label {
            width: 96px;
            text-align: center;
            color: #939ba8;
            font-size: 10px;
            text-transform: capitalize;
          }

          .inspect-btn,.back-btn,.utility-btn {
            border: 1px solid transparent;
            background: #21242c;
            border-radius: 3px;
            color: #a4acba;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0;
            height: 32px;
            font: 600 11px 'Geogrotesque Wide',sans-serif;
          }

          .inspect-btn {
            width: 96px;
          }

          .back-btn {
            width: 108px;
          }

          .utility-btn {
            width: 32px;
          }

          .inspect-btn:hover,.back-btn:hover,.utility-btn:hover {
            color: #fff;
            border-color: #3a424c;
          }

          .inspect-btn[aria-expanded=true] {
            color: #1fd65f;
            border-color: #24663b;
          }

          .battle-topbar button:focus-visible,.emoji-btn:focus-visible {
            outline: 2px solid #1fd65f;
            outline-offset: 3px;
          }

          .topbar-right-block .topbar-row {
            justify-content: flex-end;
          }

          .topbar-cases {
            flex: 1;
            min-width: 0;
            align-self: stretch;
            background: #101217;
            border-radius: 3px;
          }

          .topbar-cases-viewport {
            height: 100%;
            min-height: 68px;
            overflow-x: auto;
            scrollbar-width: none;
            position: relative;
          }

          .topbar-cases-viewport::-webkit-scrollbar { display: none; }

          .cases-track {
            display: flex;
            align-items: center;
            gap: 8px;
            width: max-content;
            min-height: 68px;
            padding: 6px;
            position: relative;
          }

          .case-mini {
            width: 56px;
            height: 56px;
            flex-shrink: 0;
            background: #21242c;
            border-radius: 3px;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
          }

          .case-mini img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }

          .case-mini.active:before,.case-mini.active:after {
            content: '';
            position: absolute;
            left: calc(50% - 4px);
            width: 8px;
            height: 2px;
            background: #1fd65f;
            box-shadow: 0 0 8px #1fd65f88;
          }

          .case-mini.active:before {
            top: -4px;
          }

          .case-mini.active:after {
            bottom: -4px;
          }

          .case-inspection {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            background: #17191f;
            padding: 16px;
            border-radius: 5px;
          }

          .inspected-case {
            display: flex;
            gap: 10px;
            align-items: center;
          }

          .inspected-case>img {
            width: 56px;
            height: 56px;
            object-fit: contain;
          }

          .inspected-case>div {
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 12px;
          }

          .inspected-case span {
            font-size: 11px;
            color: #949ba7;
          }

          .columns-wrapper {
            width: 100%;
            min-width: 0;
          }

          .columns {
            --reel-item-size: var(--desktop-reel-item-size, 108px);
            --lane-height: calc(var(--reel-item-size, 108px) + 24px);
            display: grid;
            grid-template-columns: minmax(0,1fr) clamp(112px, 10vw, 144px) minmax(0,1fr);
            gap: 12px;
          }

          .team-lanes {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }

          .center-display {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #0b0d11;
            border: 1px solid #07090c;
            border-radius: 7px;
            position: relative;
            padding: 16px 10px;
            min-width: 0;
          }

          .center-watermark {
            position: absolute;
            left: calc(50% - 40px);
            width: 80px;
            height: 80px;
            opacity: .035;
            pointer-events: none;
          }

          .center-watermark.top {
            top: 30px;
          }

          .center-watermark.bottom {
            bottom: 30px;
          }

          .lane-rail {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            pointer-events: none;
          }

          .lane-tick {
            flex: 1;
            position: relative;
          }

          .lane-tick:before,.lane-tick:after {
            content: '';
            position: absolute;
            top: calc(50% - 20px);
            height: 80px;
            width: 2px;
            background: #1fd65f;
            box-shadow: 0 0 9px #1fd65f80;
          }

          .lane-tick:before {
            left: -1px;
          }

          .lane-tick:after {
            right: -1px;
          }

          .center-dashes {
            display: flex;
            gap: 6px;
            position: absolute;
            top: 0;
          }

          .center-dashes span {
            width: 10px;
            height: 2px;
            background: #1fd65f88;
            box-shadow: 0 0 7px #1fd65f55;
          }

          .reel-case {
            position: relative;
            z-index: 1;
          }

          .reel-case img {
            width: min(100%, 124px);
            height: 88px;
            object-fit: contain;
            filter: drop-shadow(0 6px 16px #0008);
          }

          .center-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            z-index: 1;
          }

          .center-price {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            font-weight: 700;
          }

          .center-name {
            color: #92969f;
            font-size: 10px;
            line-height: 1.5;
            text-align: center;
            text-transform: uppercase;
            overflow-wrap: anywhere;
          }

          .winner-callout {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            border-top: 1px solid #25292e;
            padding-top: 12px;
            margin-top: 8px;
            width: 100%;
            z-index: 1;
          }

          .winner-label {
            font-size: 10px;
            color: #1fd65f;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .winner-avatars {
            display: none;
            justify-content: center;
            flex-wrap: wrap;
            gap: 4px;
          }

          .winner-names {
            display: none;
          }

          .winner-amount {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
            font-weight: 700;
            color: #1fd65f;
          }

          .team-totals {
            display: grid;
            grid-template-columns: repeat(3,minmax(0,1fr));
            gap: 12px;
          }

          .team-side,.total-drops {
            min-width: 0;
            min-height: 58px;
            background: #0c0e12;
            border: 1px solid #080a0e;
            border-radius: 3px;
            display: grid;
            align-content: center;
            gap: 3px 10px;
            padding: 8px 12px;
          }

          .team-side {
            grid-template-columns: auto 1fr;
          }

          .team-side .team-avatars {
            grid-column: 1;
            grid-row: 1 / 3;
          }

          .team-side .team-label,.team-side .totals-value {
            grid-column: 2;
          }

          .team-side .team-label {
            grid-row: 1;
          }

          .team-side.right {
            grid-template-columns: 1fr auto;
            text-align: right;
          }

          .team-side.right .team-avatars {
            grid-column: 2;
          }

          .team-side.right .team-label,.team-side.right .totals-value {
            grid-column: 1;
            justify-content: flex-end;
          }

          .total-drops {
            justify-items: center;
          }

          .team-label {
            font-size: 11px;
            font-weight: 700;
            color: #edf0f5;
          }

          .team-avatars,.totals-value {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .totals-value {
            font-size: 11px;
            font-weight: 700;
          }

          .floating-emojis {
            position: absolute;
            inset: 0;
            z-index: 30;
            overflow: hidden;
            pointer-events: none;
          }

          .floating-emoji {
            position: absolute;
            bottom: 6%;
            font-size: 28px;
            animation: emoji-float 2.8s ease-out forwards;
          }

          @keyframes emoji-float {

            0% {
              transform: translateY(0) scale(.6);
              opacity: 0;
            }

            12% {
              opacity: 1;
            }

            80% {
              opacity: 1;
            }

            100% {
              transform: translateY(-320%);
              opacity: 0;
            }
          }

          .emoji-bar {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: -12px;
            margin-bottom: -8px;
          }

          .emoji-btn {
            width: 34px;
            height: 34px;
            border: 1px solid #292d35;
            border-radius: 4px;
            background: #191c22;
            display: grid;
            place-items: center;
            padding: 0;
            font-size: 17px;
            cursor: pointer;
          }

          .emoji-btn:hover, .emoji-btn:focus-visible {
            border-color: #1fd65f;
            background: #22272c;
          }

          @media(max-width:1100px) {

            .battle-container {
              gap: 18px;
            }

            .columns {
              grid-template-columns: minmax(0,1fr) 124px minmax(0,1fr);
              gap: 8px;
            }

            .reel-case img {
              width: 104px;
              height: 90px;
            }

            .battle-cost-pill,.round-pill {
              width: 124px;
            }

            .inspect-btn,.mode-label {
              width: 70px;
            }
          }

          @media(min-width:701px) {
            .columns.duel .center-display.winners { padding: 12px 8px; gap: 6px; }
            .columns.duel .center-display.winners .reel-case img { height: 68px; }
            .columns.duel .winner-callout { padding-top: 8px; margin-top: 0; gap: 5px; }
          }

          @media(max-width:700px) {

            .battle-container {
              padding: 12px 8px 24px;
              gap: 16px;
            }

            .battle-topbar {
              flex-wrap: wrap;
              padding: 10px;
              gap: 10px;
            }

            .topbar-cases {
              order: 3;
              flex-basis: 100%;
            }

            .topbar-right-block {
              margin-left: auto;
            }

            .back-btn {
              width: 76px;
            }

            .columns {
              --reel-item-size: 92px;
              grid-template-columns: minmax(0,1fr) minmax(0,1fr);
              gap: 14px 10px;
            }

            .center-display {
              grid-column: 1 / -1;
              grid-row: 1;
              flex-direction: row;
              min-height: 96px;
              padding: 12px;
              gap: 14px;
            }

            .reel-case img {
              width: 78px;
              height: 70px;
            }

            .center-name {
              max-width: 130px;
            }

            .center-footer {
              align-items: flex-start;
            }

            .center-watermark,.lane-rail {
              display: none;
            }

            .winner-callout {
              width: auto;
              border-top: 0;
              border-left: 1px solid #25292e;
              margin: 0 0 0 auto;
              padding: 0 0 0 12px;
            }

            .winner-avatars {
              display: none;
            }

            .team-totals {
              gap: 6px;
            }

            .team-side,.total-drops {
              padding: 8px 5px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 5px;
            }

            .team-side .team-avatars {
              display: none;
            }

            .team-side .team-label {
              order: 0;
            }

            .team-side .totals-value {
              order: 1;
            }

            .team-label,.totals-value {
              font-size: 10px;
            }
          }

          @media(prefers-reduced-motion:reduce) {

            .floating-emoji {
              animation: none;
            }
          }
        `}</style>
        </>
    );
}

export default Battle;
