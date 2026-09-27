import {createEffect, createSignal, For, onCleanup} from "solid-js";
import RouletteSpinner from "../components/Roulette/roulettespinner";
import RouletteIcon from "../components/Roulette/rouletteicons";
import {useWebsocket} from "../contexts/socketprovider";
import {numberToColor} from "../util/roulettehelpers";
import RouletteBetControls from "../components/Roulette/betcontrols";
import RouletteColor from "../components/Roulette/roulettecolor";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {Meta, Title} from "@solidjs/meta";
import {playGameSFX, stopSFXChannel, startAnimationTicker, GAME_SOUNDS} from "../util/sound";
import {createNotification} from "../util/api";

import WheelBonus from "../components/Roulette/wheelbonus";

function Roulette(props) {

    let hasConnected = false
    let countdownFrame

    let rouletteTicker = null
    let rouletteResultTimer

    // Roulette spin easing: cubic-bezier(.14,.15,0,1)
    const ROULETTE_BEZIER = [0.14, 0.15, 0, 1]

    // spinPhase = the active-spin window (0 → 90% of rollTime).
    // Ticking stops naturally here; the hold + snap phases are silent.
    function startRouletteTicking(spinPhase) {
        stopRouletteTicking()
        playGameSFX('roulette-roll', GAME_SOUNDS.rouletteRoll, {
          channel: 'roulette-roll', volume: .48, durationMs: 640,
        })

        // Pass the real cubic-bezier so ticks fire densely early and
        // decelerate as the spinner slows toward the landing position.
        rouletteTicker = startAnimationTicker(
          () => {
            playGameSFX('roulette-tick', GAME_SOUNDS.rouletteClick, {
              channel: 'roulette-tick',
              startTime: 1.34, durationMs: 110,
              volume: 0.48,
              minIntervalMs: 28,
            })
          },
          spinPhase,
          28,
          ROULETTE_BEZIER
        )
    }

    function stopRouletteTicking() {
        if (rouletteTicker) {
          rouletteTicker.cancel()
          rouletteTicker = null
        }
        clearTimeout(rouletteResultTimer)
        stopSFXChannel('roulette-tick')
        stopSFXChannel('roulette-roll')
    }

    const [bets, setBets] = createSignal([])
    const [bet, setBet] = createSignal(0)
    const [timeLeft, setTimeLeft] = createSignal(10000)
    const [config, setConfig] = createSignal({ rollTime: 5000, betTime: 10000 })
    const [round, setRound] = createSignal(null)
    const [last10, setLast10] = createSignal([])
    const [state, setState] = createSignal('')
    const [tripleGreenBonusPot, setTripleGreenBonusPot] = createSignal(0)
    const [bonusStreak, setBonusStreak] = createSignal(0)

    const [last100, setLast100] = createSignal([])
    const [stats, setStats] = createSignal({
        green: 0,
        red: 0,
        black: 0,
        bait: 0
    })

    const [ws] = useWebsocket()

    createEffect(() => {
        if (ws() && ws().connected && !hasConnected) {
            unsubscribeFromGames(ws())
            subscribeToGame(ws(), 'roulette')

        ws().off('roulette:set')
        ws().off('roulette:bets')
        ws().off('roulette:bet:update')
        ws().off('roulette:new')
        ws().off('roulette:roll')
        ws().off('roulette:tripleGreenBonus:pot')
        ws().off('roulette:tripleGreenBonus:won')
        ws().off('roulette:bonus:streak')

            ws().on('roulette:set', (data) => {
                let stats = { green: 0, red: 0, black: 0, bait: 0 }
                let last10 = []

                for (let i = 0; i < data.last.length; i++) {
                    let color = numberToColor(data.last[i])
                    stats[color]++
                    if (data.last[i] === 7 || data.last[i] === 8) stats.bait++

                    if (i < 10) {
                        last10.push(data.last[i])
                    }
                }

                setStats(stats)
                setLast100(data.last)
                setLast10(last10)
                setConfig(data.config)
                setBets(data.bets)
                setTripleGreenBonusPot(Number(data.tripleGreenBonusPot || 0))
                setBonusStreak(Number(data.tripleGreenStreak || 0))

                let timeLeftToRoll = new Date(data.round.createdAt).getTime() + data.config.betTime - Date.now()
                startCountdown(timeLeftToRoll)
            })

            ws().on('roulette:bets', (b) => {
                setBets(bets => [...b, ...bets])
            })

            ws().on('roulette:bet:update', (b) => {
                let curBets = bets()
                let betIndex = curBets?.findIndex(bet => bet.id === b.id)
                if (betIndex < 0) return

                let newBet = curBets[betIndex]
                newBet.amount = b.amount

                setBets([...curBets.slice(0, betIndex), {...newBet}, ...curBets.slice(betIndex + 1)])
            })

            ws().on('roulette:new', (roll) => {
                setBets([])
                setState('')
              stopRouletteTicking()

                startCountdown()
            })

            ws().on('roulette:roll', (roll) => {
                startCountdown(0)
                let prev10 = last10()
                let newLast100 = last100()

                newLast100.unshift(roll?.result)
                newLast100 = newLast100.slice(0, 100)

                prev10.unshift(roll?.result)
                prev10 = prev10.slice(0, 10)

                // Capture rollTime once so both the ticker and the win-sound
                // timeout reference the same value
                const rollTime = config().rollTime || 5000

                // Tick only during the active-spin phase (first 90 % of rollTime).
                // The remaining 10 % is the hold + snap — silence there feels correct.
                startRouletteTicking(rollTime * 0.9)

                // Win sound fires exactly when the animation finishes
                rouletteResultTimer = setTimeout(() => {
                  stopRouletteTicking()
                  playGameSFX('roulette-land', GAME_SOUNDS.rouletteRoll, {
                    channel: 'roulette-land',
                    startTime: 5.79, durationMs: 800,
                    volume: 0.62,
                    fadeInMs: 80,
                  })
                    setStats(calculateStats(newLast100))
                    setLast100(newLast100)
                    setLast10(prev10)
                    setState('WINNERS')
                }, rollTime)

                setRound(roll)
            })

              ws().on('roulette:bonus:streak', value => setBonusStreak(Number(value || 0)))
              ws().on('roulette:tripleGreenBonus:pot', (amount) => {
                setTripleGreenBonusPot(Number(amount || 0))
              })

              ws().on('roulette:tripleGreenBonus:won', (data) => {
                const distributed = Number(data?.distributed || 0)
                const userPayout = (data?.payouts || []).find(p => String(p.userId) === String(props.user?.id))

                if (userPayout?.amount) {
                  createNotification('success', `Wheel Bonus paid ${Number(userPayout.amount).toFixed(2)} coins to your account.`)
                } else if (distributed > 0) {
                  createNotification('info', `Wheel Bonus triggered: ${distributed.toFixed(2)} coins distributed.`)
                }
              })

            hasConnected = true
        }

        if (!ws() || !ws().connected) {
            hasConnected = false
        }
    })

      onCleanup(() => {
        cancelAnimationFrame(countdownFrame)
        stopRouletteTicking()
        stopSFXChannel('roulette-land')

        if (ws() && ws().connected) {
          ws().off('roulette:set')
          ws().off('roulette:bets')
          ws().off('roulette:bet:update')
          ws().off('roulette:new')
          ws().off('roulette:roll')
          ws().off('roulette:tripleGreenBonus:pot')
          ws().off('roulette:tripleGreenBonus:won')
        ws().off('roulette:bonus:streak')
          unsubscribeFromGames(ws())
        }
      })

    function startCountdown(duration = config().betTime) {
        cancelAnimationFrame(countdownFrame)
        const deadline = performance.now() + Math.max(0, Number(duration) || 0)
        function tick() {
            const remaining = Math.max(0, deadline - performance.now())
            setTimeLeft(remaining)
            if (remaining > 0) countdownFrame = requestAnimationFrame(tick)
        }
        tick()
    }

    function calculateStats(history) {
        let stats = { green: 0, red: 0, black: 0, bait: 0 }

        for (let i = 0; i < history.length; i++) {
            let color = numberToColor(history[i])
            stats[color]++
            if (history[i] === 7 || history[i] === 8) stats.bait++
        }

        return stats
    }

    return (
        <>
            <Title>Cosmic Luck | Roulette</Title>
            <Meta name='title' content='Roulette'></Meta>
            <Meta name='description' content='Bet On Roulette And Win Coins on Cosmic Luck! Play red or black for 2x, green for 14x, and bait red or bait black for 7x.'></Meta>

            <div class='roulette-container fadein'>
                <div class='roulette-header'>
                    <div class='recent'>
                        <p class='label'>RECENT ROLLS</p>
                        <div class='lastten'>
                            <For each={last10()}>{(round, index) => <RouletteIcon num={round} size='small'/>}</For>
                        </div>
                    </div>


                    <div class='last100'>
                        <p class='label'>LAST 100</p>
                        <div class='stats'>
                            <div class='stat green'>
                                <RouletteIcon num={0} size='small'/>
                                <p>{stats().green}</p>
                            </div>

                            <div class='stat red'>
                                <RouletteIcon num={1} size='small'/>
                                <p>{stats().red}</p>
                            </div>

                            <div class='stat black'>
                                <RouletteIcon num={14} size='small'/>
                                <p>{stats().black}</p>
                            </div>

                            <div class='stat bait'>
                                <RouletteIcon num={7} size='small'/>
                                <p>{stats().bait}</p>
                            </div>
                        </div>

                    </div>
                    <WheelBonus pot={tripleGreenBonusPot()} streak={bonusStreak()} rate={config().tripleGreenBonusRake} minimum={config().tripleGreenMinimumBet}/>
                </div>

                <RouletteSpinner roll={round()} config={config()} timeLeft={timeLeft()}/>
                <RouletteBetControls bet={bet()} setBet={setBet} user={props.user}/>

                <div class='colors'>
                    <RouletteColor color='red' amount={bet()} bets={bets()} round={round()} state={state()}/>

                  <RouletteColor color='green' amount={bet()} bets={bets()} round={round()} state={state()}/>

                    <RouletteColor color='black' amount={bet()} bets={bets()} round={round()} state={state()}/>

                  <RouletteColor color='bait' amount={bet()} bets={bets()} round={round()} state={state()}/>
                </div>
            </div>

            <style jsx>{`
              .roulette-container {
                width: 100%;
                max-width: var(--page-max-width);
                container-type: inline-size;
                height: fit-content;

                padding: 30px 0;
                margin: 0 auto;
              }

              .roulette-header {
                width: 100%;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto auto;
                align-items: center;
                justify-content: space-between;
                position: relative;
                gap: 16px;
                margin-bottom: 14px;
                padding: 10px 14px;
                --roulette-small-chip-size: 28px;
                --roulette-small-chip-image-size: 24px;
                background: #0c0e14;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
              }

              .recent, .last100 {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
              }

              .last100 {
                align-items: flex-end;
              }

              .label {
                color: #4b5563;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
              }

              .lastten {
                display: flex;
                gap: 4px;
              }


              .stats {
                display: flex;
                gap: 6px;
              }

              .stat {
                display: flex;
                align-items: center;
                gap: 6px;

                padding: 3px 8px 3px 4px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255, 255, 255, 0.06);

                font-size: 13px;
                font-weight: 800;
              }

              .stat.green { color: #1fd65f; }
              .stat.black { color: #8b92a0; }
              .stat.red { color: #e8455f; }
              .stat.bait { color: #c9a84c; border-color: rgba(201, 168, 76, 0.22); background: rgba(201, 168, 76, 0.07); }

              @container (max-width: 900px) {
                .roulette-header { grid-template-columns: minmax(0, 1fr) auto; gap: 10px 14px; }
                .recent { grid-column: 1 / -1; }
                .last100 { align-items: flex-start; }
              }

              @container (max-width: 520px) {
                .roulette-header { grid-template-columns: minmax(0, 1fr); }
                .lastten { flex-wrap: wrap; }
              }

              .colors {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                width: 100%;
                gap: 16px;
              }

              @media only screen and (max-width: 1000px) {
                .roulette-container {
                  padding-bottom: 90px;
                }
              }

              @media only screen and (max-width: 875px) {
                .colors {
                  grid-template-columns: 1fr;
                  gap: 28px;
                }
              }

              @media only screen and (max-width: 1360px) and (min-width: 876px) {
                .colors {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }
            `}</style>
        </>
    );
}

export default Roulette;
