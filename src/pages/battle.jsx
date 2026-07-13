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

    // Spin sounds — same linear-decel pattern as case opening
    const battleTickSFX = new Audio('/assets/sfx/casetick.wav')
    const battleWinSFX = new Audio('/assets/sfx/winorcashout.mp3')
    let battleTickTimer = null

    function startBattleTicking(spinPhase) {
        if (battleTickTimer) clearTimeout(battleTickTimer)
        let elapsed = 0
        const tick = () => {
            battleTickSFX.currentTime = 0
            battleTickSFX.play().catch(() => {})
            // Linear decel: 75 ms → 300 ms — identical to case opening
            const progress = Math.min(elapsed / spinPhase, 1)
            const delay = Math.round(75 + progress * 225)
            elapsed += delay
            if (elapsed < spinPhase) {
                battleTickTimer = setTimeout(tick, delay)
            } else {
                battleTickTimer = null
            }
        }
        battleTickTimer = setTimeout(tick, 75)
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
                battleWinSFX.currentTime = 0
                battleWinSFX.play().catch(() => {})
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
        return props?.user?.id === battle()?.players[0].id
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
                                <div class='cases' style={{'transform': `translateX(-${72 * (round() - 1) + 30}px)`}}>
                                    <For each={battle()?.rounds}>{(c, index) => <img class={'case ' + (round() - 1 === index() ? 'active' : '')}
                                                                                     src={resolveImageSrc(getCase(c?.caseId)?.img)}
                                                                                     width='60' height='60' alt=''/>}</For>
                                </div>
                            </div>

                            <div class='round-info-right'>
                                <div class='emoji-bar'>
                                    <For each={BATTLE_EMOJIS}>{(emoji) => (
                                        <button class='emoji-btn' onClick={() => sendEmoji(emoji)}>{emoji}</button>
                                    )}</For>
                                </div>
                                <A href='/docs/provably' class='provably' style={{width: '130px'}}>PROVABLY FAIR</A>
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
                gap: 30px;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }

              .round-info {
                width: 100%;
                height: 70px;
                position: relative;

                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.065);
                background: linear-gradient(135deg, 
                  rgba(18, 24, 35, 0.96), 
                  rgba(10, 14, 22, 0.98));
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.045), 
                  0 8px 24px rgba(0,0,0,0.22),
                  0 16px 40px rgba(0,0,0,0.18);

                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
                backdrop-filter: blur(12px);
                transition: all 0.3s ease;
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
                  rgba(255,255,255,0.1), 
                  transparent);
              }
              
              .round-info:hover {
                border-color: rgba(31, 214, 95, 0.12);
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.055), 
                  0 10px 28px rgba(0,0,0,0.24),
                  0 18px 44px rgba(0,0,0,0.2),
                  0 0 0 1px rgba(31, 214, 95, 0.06);
              }

              .round-info > * {
                flex: 1;
              }

              .provably-container {
                display: flex;
                justify-content: flex-end;
              }

              .round-info-right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                justify-content: center;
                gap: 6px;
                flex: 1;
              }

              .emoji-bar {
                display: flex;
                align-items: center;
                gap: 4px;
              }

              .emoji-btn {
                background: rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 6px;
                width: 30px;
                height: 28px;
                font-size: 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
                line-height: 1;
                padding: 0;
              }

              .emoji-btn:hover {
                background: rgba(255,255,255,0.09);
                border-color: rgba(255,255,255,0.16);
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
                transition: all 0.35s ease;
                filter: grayscale(1) brightness(0.7);
                transform: scale(0.92);
                object-fit: cover;
                border-radius: 8px;
              }
              
              .case.active {
                opacity: 1;
                filter: none;
                transform: scale(1);
                box-shadow: 0 0 20px rgba(31, 214, 95, 0.25);
              }

              .columns {
                width: 100%;
                overflow: hidden;
                
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                padding: 12px;
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.045);
                background: linear-gradient(135deg, 
                  rgba(14, 19, 28, 0.78), 
                  rgba(8, 11, 18, 0.88));
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.03), 
                  0 10px 32px rgba(0,0,0,0.24),
                  0 20px 56px rgba(0,0,0,0.2);
                position: relative;
              }
              
              .columns::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 14px;
                background: radial-gradient(circle at 50% 0%, 
                  rgba(31, 214, 95, 0.015), 
                  transparent 60%);
                pointer-events: none;
              }

              @media only screen and (max-width: 1040px) {
                .columns {
                  flex-direction: column;
                }
              }

              @media only screen and (max-width: 540px) {
                .battles-header {
                  justify-content: center;
                  flex-direction: column;
                  align-items: center;
                  gap: 25px;
                }

                .right {
                  justify-content: center;
                }
                
                .round-info {
                  height: 65px;
                  padding: 0 15px;
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

export default Battle;
