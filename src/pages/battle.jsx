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

    // Spin sounds — same linear-decel pattern as case opening
    let battleTickTimer = null

    function startBattleTicking(spinPhase) {
        if (battleTickTimer) clearTimeout(battleTickTimer)
        let elapsed = 0
        const tick = () => {
          playGameSFX('battle-tick', '/assets/sfx/casetick.wav', {
            channel: 'spin-tick',
            volume: 0.5,
            minIntervalMs: 45,
          })
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
        setWon(calculateWinnings(battle.cases, battle.rounds, battle.play