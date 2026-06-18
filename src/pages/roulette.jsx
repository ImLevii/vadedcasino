import {createEffect, createSignal, For} from "solid-js";
import RouletteSpinner from "../components/Roulette/roulettespinner";
import RouletteIcon from "../components/Roulette/rouletteicons";
import {useWebsocket} from "../contexts/socketprovider";
import {numberToColor} from "../util/roulettehelpers";
import RouletteBetControls from "../components/Roulette/betcontrols";
import RouletteColor from "../components/Roulette/roulettecolor";
import {subscribeToGame, unsubscribeFromGames} from "../util/socket";
import {Meta, Title} from "@solidjs/meta";

function Roulette(props) {

    let hasConnected = false
    let bar

    const [bets, setBets] = createSignal([])
    const [bet, setBet] = createSignal(0)
    const [timeLeft, setTimeLeft] = createSignal(10000)
    const [config, setConfig] = createSignal({ rollTime: 5000, betTime: 10000 })
    const [round, setRound] = createSignal(null)
    const [last10, setLast10] = createSignal([])
    const [state, setState] = createSignal('')

    const [last100, setLast100] = createSignal([])
    const [stats, setStats] = createSignal({
        green: 0,
        red: 0,
        gold: 0
    })

    const [ws] = useWebsocket()

    createEffect(() => {
        if (ws() && ws().connected && !hasConnected) {
            unsubscribeFromGames(ws())
            subscribeToGame(ws(), 'roulette')
            ws().on('roulette:set', (data) => {
                let stats = { green: 0, red: 0, gold: 0 }
                let last10 = []

                for (let i = 0; i < data.last.length; i++) {
                    let color = numberToColor(data.last[i])
                    stats[color]++

                    if (i < 10) {
                        last10.push(data.last[i])
                    }
                }

                setStats(stats)
                setLast100(data.last)
                setLast10(last10)
                setConfig(data.config)
                setBets(data.bets)

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
                startCountdown()
            })

            ws().on('roulette:roll', (roll) => {
                let prev10 = last10()
                let newLast100 = last100()

                newLast100.unshift(roll?.result)
                newLast100 = newLast100.slice(0, 100)

                prev10.unshift(roll?.result)
                prev10 = prev10.slice(0, 10)

                setTimeout(() => {
                    setStats(calculateStats(newLast100))
                    setLast100(newLast100)
                    setLast10(prev10)
                    setState('WINNERS')
                }, 5000)

                setRound(roll)
            })

            hasConnected = true
        }

        if (!ws() || !ws().connected) {
            hasConnected = false
        }
    })

    async function startCountdown(duration = config().betTime) {

        setTimeLeft(Math.max(0, duration))
        let lastDate = Date.now()

        bar.animate([
            {width: '100%'},
            {width: '0%'}
        ], {
            duration: timeLeft(),
            easing: 'linear',
            fill: 'forwards'
        })

        while (timeLeft() > 0) {
            let remaining = Math.max(0, timeLeft() - (Date.now() - lastDate))
            setTimeLeft(remaining)

            lastDate = Date.now()

            await new Promise((resolve) => setTimeout(resolve, Math.min(1000, timeLeft())))
        }
    }

    function calculateStats(history) {
        let stats = { green: 0, red: 0, gold: 0 }

        for (let i = 0; i < history.length; i++) {
            let color = numberToColor(history[i])
            stats[color]++
        }

        return stats
    }

    return (
        <>
            <Title>Cosmic Luck | Roulette</Title>
            <Meta name='title' content='Roulette'></Meta>
            <Meta name='description' content='Bet On Roulette And Win Coins on Cosmic Luck! Play On Red, Green And Gold To Win 14x Multiplier'></Meta>

            <div class='roulette-container fadein'>
                <div class='roulette-header'>
                    <div class='recent'>
                        <p class='label'>RECENT ROLLS</p>
                        <div class='lastten'>
                            <For each={last10()}>{(round, index) => <RouletteIcon num={round} size='small'/>}</For>
                        </div>
                    </div>

                    <div class='timer-container'>
                        {timeLeft() === 0 ?
                            <p class='rolling'>ROLLING <span class='white'>NOW</span></p>
                            :
                            <p class='rolling'>ROLLING IN <span class='white'>{Math.round(timeLeft() / 1000)}s</span></p>
                        }
                        <div class='timer'>
                            <div class='bar' ref={bar}/>
                        </div>
                    </div>

                    <div class='last100'>
                        <p class='label'>LAST 100</p>
                        <div class='stats'>
                            <div class='stat green'>
                                <RouletteIcon num={1} size='small'/>
                                <p>{stats().green}</p>
                            </div>

                            <div class='stat gold'>
                                <RouletteIcon num={0} size='small'/>
                                <p>{stats().gold}</p>
                            </div>

                            <div class='stat red'>
                                <RouletteIcon num={14} size='small'/>
                                <p>{stats().red}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <RouletteSpinner roll={round()} config={config()}/>
                <RouletteBetControls bet={bet()} setBet={setBet} user={props.user}/>

                <div class='colors'>
                    <RouletteColor color='green' amount={bet()} bets={bets()} round={round()} state={state()}/>

                    <RouletteColor color='gold' amount={bet()} bets={bets()} round={round()} state={state()}/>

                    <RouletteColor color='red' amount={bet()} bets={bets()} round={round()} state={state()}/>
                </div>
            </div>

            <style jsx>{`
              .roulette-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                padding: 30px 0;
                margin: 0 auto;
              }

              .roulette-header {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                gap: 20px;
                margin-bottom: 18px;
                padding: 14px 18px;
                background: #0c0e14;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
              }

              .recent, .last100 {
                display: flex;
                flex-direction: column;
                gap: 8px;
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
                gap: 5px;
              }

              .rolling {
                color: #6b7280;
                font-size: 13px;
                font-weight: 700;
                text-align: center;
              }

              .white {
                color: #fff;
                font-size: 18px;
                font-weight: 800;
              }

              .timer-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
                flex: 1;
                max-width: 200px;
              }

              .timer {
                width: 100%;
                height: 4px;
                border-radius: 99px;
                background: rgba(255,255,255,0.06);
                overflow: hidden;
              }

              .bar {
                height: 100%;
                width: 100%;
                border-radius: 99px;
                background: linear-gradient(90deg, #18c255, #1fd65f, #45e57f);
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.7);
                transition: background .3s;
              }

              .stats {
                display: flex;
                gap: 6px;
              }

              .stat {
                display: flex;
                align-items: center;
                gap: 6px;

                padding: 4px 10px 4px 5px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255, 255, 255, 0.06);

                font-size: 13px;
                font-weight: 800;
              }

              .stat.green { color: #1fd65f; }
              .stat.gold { color: #f5a623; }
              .stat.red { color: #e8455f; }

              .colors {
                display: flex;
                width: 100%;
                gap: 12px;
              }

              @media only screen and (max-width: 1000px) {
                .roulette-container {
                  padding-bottom: 90px;
                }
              }

              @media only screen and (max-width: 875px) {
                .roulette-header {
                  flex-wrap: wrap;
                }

                .timer-container {
                  order: 3;
                  max-width: unset;
                  width: 100%;
                }

                .colors {
                  flex-direction: column;
                  gap: 28px;
                }
              }
            `}</style>
        </>
    );
}

export default Roulette;
