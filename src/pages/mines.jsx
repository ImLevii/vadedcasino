import {useWebsocket} from "../contexts/socketprovider";
import {useUser} from "../contexts/usercontextprovider";
import {createResource, createSignal, For} from "solid-js";
import {authedAPI, createNotification} from "../util/api";
import {Meta, Title} from "@solidjs/meta";
import {formatNumber} from "../util/numbers";
import Tile from "../components/Mines/tile";
import {playGameSFX} from "../util/sound";

function Mines(props) {

    const [bet, setBet] = createSignal(100)
    const [mines, setMines] = createSignal(3)
    const [revealed, setRevealed] = createSignal([])
    const [bombs, setBombs] = createSignal([])
    const [game, { mutate: setGame }] = createResource(getActiveGame)

    const [isProcessing, setIsProcessing] = createSignal(false)
    const [random, setRandom] = createSignal(null)

    async function getActiveGame() {
        let game = await authedAPI(`/mines`, 'GET', null)

        if (!game || !game.activeGame) return null
        game = game.activeGame

        setBet(game.amount)
        setRevealed(game.revealedTiles)
        setMines(game.minesCount)
        game.active = true
        return game
    }

    async function cashout() {
        let res = await authedAPI('/mines/cashout', 'POST', null, true)

        if (res.success) {
            cashoutGame(res)
        }
    }

    async function cashoutGame(res) {
        setGame({
            ...game(),
            payout: res.payout,
            multiplier: res.multiplier,
            active: false,
        })
        playGameSFX('mines-win', '/assets/sfx/winorcashout.mp3', {
          channel: 'result-win',
          volume: 0.62,
          fadeInMs: 70,
        })
        setBombs(res.minePositions || [])
        createNotification('success', `You won ${res.payout} coins from your mines round!`)
    }

    async function startGame() {
        setGame(null)
        setRevealed([])
        setBombs([])
        setRandom(null)

        let res = await authedAPI('/mines/start', 'POST', JSON.stringify({ amount: bet(), minesCount: mines() }), true)

        if (res.success) {
            setGame({
                amount: bet(),
                multiplier: 1,
                currentPayout: bet(),
                active: true,
            })
            createNotification('success', 'Successfully started a mines round.')
        }
    }

    function randomTile() {
        let tile
        while (!tile || revealed().includes(tile)) {
            tile = Math.floor(Math.random() * 25)
        }
        setRandom(tile)
    }

    function changeBetAmount(amt) {
        let newAmt = Math.max(0, Math.min(props?.user?.balance, bet() + amt))
        if (isNaN(newAmt)) newAmt = 0
        newAmt = Math.floor(newAmt * 100) / 100
        setBet(newAmt)
    }

    return (
        <>
            <Title>Cosmic Luck | Mines</Title>
            <Meta name='title' content='Mines'></Meta>
            <Meta name='description' content='Play Mines On Cosmic Luck And Multiply Your Coins By 100x On The Best Casino Platform'></Meta>

            <div class='mines-container fadein'>
                <div className='betting-container'>
                    <div className='betting-header'>
                        <p>BET INTERFACE</p>
                    </div>

                    <div className='inputs'>
                        <div className='input-wrapper'>
                            <div className='input-header'>
                                <p>BET AMOUNT</p>
                            </div>

                            <div className='input-container'>
                              <img class='chip-icon' src='/assets/chips/chip-green-clover.png' height='20' width='20' alt=''/>
                                <input type='number' value={bet()} onInput={(e) => setBet(e.target.valueAsNumber)}
                                   placeholder='0' min='1' max='20000' disabled={game()?.active}/>

                              <button class='modifier' disabled={game()?.active} onClick={() => changeBetAmount(-bet() / 2)}>
                                    1/2
                                </button>

                              <button class='modifier' disabled={game()?.active} onClick={() => changeBetAmount(bet())}>
                                    2X
                                </button>

                              <button class='modifier' disabled={game()?.active} onClick={() => setBet(props?.user?.balance || 0)}>
                                    MAX
                                </button>
                            </div>
                        </div>

                        <div className='input-wrapper'>
                            <div className='input-header'>
                                <p>AMOUNT OF MINES</p>
                            </div>

                            <div className='input-container'>
                                <input type='number' value={mines()} onInput={(e) => setMines(e.target.valueAsNumber)}
                                   placeholder='0' min='1' max='24' disabled={game()?.active}/>
                            </div>
                        </div>

                        {game()?.active && (
                            <div class='current-stats'>
                                <div class='current-cashout stat-surface'>
                                    <div class='coin-prefix'>
                                    <img src='/assets/chips/chip-green-clover.png' height='22' width='22' alt=''/>
                                    </div>
                                    <p>{formatNumber(game()?.currentPayout || 0)}</p>
                                </div>

                                <div class='current-multi stat-surface'>
                                    <p>{formatNumber(game()?.multiplier || 0)}x</p>
                                </div>
                            </div>
                        )}

                        <button className={'bet ' + (game()?.active ? 'active' : '') + (isProcessing() ? ' processing' : '')} onClick={async () => {
                            if (isProcessing() || !props.user) return
                            setIsProcessing(true)

                            if (!game() || !game().active) {
                                await startGame()
                            } else {
                                await cashout()
                            }

                            setIsProcessing(false)
                        }}>
                            {game()?.active ? 'CASHOUT' : 'PLACE BET'}
                        </button>

                        {game()?.active && (
                            <button class='random' onClick={() => randomTile()}>
                                RANDOM TILE
                            </button>
                        )}
                    </div>
                </div>

                <div class={'mines-content ' + (game() && !game().active ? 'round-ended' : '')}>
                    <div className='mines-header'>
                    <div class='game-title'>
                      <img src='/assets/icons/mines.svg' height='14' width='14' alt=''/>
                      <p>MINES</p>
                    </div>
                    <div class={'round-status ' + (game()?.active ? 'live' : '')}>
                      <span class='status-dot'/>
                      <span>{game()?.active ? `${revealed().length} revealed` : 'Ready'}</span>
                    </div>
                    </div>

                    {game() && !game().active && (
                        <div class={'summary ' + (game().payout ? 'win' : 'loss')} role='status'>
                          <span class='summary-label'>{game()?.payout ? 'Round complete' : 'Round ended'}</span>
                            <p>{game()?.payout ? 'YOU WON' : 'YOU LOST'}</p>
                            <p class='multi'>{formatNumber(game()?.multiplier || 0)}x</p>
                            <p class='amount-won'><img src='/assets/chips/chip-green-clover.png'
                                                           height='24' width='24' alt=''/> {formatNumber(game()?.payout || -game()?.amount || 0)}</p>
                            <div class='bar' style={{margin: '16px 0'}}/>
                            <button class='try' onClick={() => startGame()}>{game()?.payout ? 'PLAY AGAIN' : 'TRY AGAIN'}</button>
                        </div>
                    )}

                    <div class='mines'>
                        <For each={Array.from(Array(25))}>{(mine, index) =>
                            <Tile index={index()} revealed={revealed()} bombs={bombs()}
                                  game={game()} setGame={setGame} setRevealed={setRevealed} setBombs={setBombs} random={random()}
                                  cashoutGame={cashoutGame}
                            />
                        }</For>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .mines-container {
                width: 100%;
                max-width: 1175px;

                box-sizing: border-box;
                padding: 28px 18px 90px;
                margin: 0 auto;

                display: flex;
                gap: 16px;
                animation: mines-enter .45s ease both;
              }

              .mines-header {
                width: 100%;
                min-height: 45px;
                height: 45px;
                
                background: linear-gradient(180deg, rgba(22,29,39,.82), rgba(10,15,22,.78));
                border-bottom: 1px solid var(--glass-border);
                box-shadow: inset 0 1px 0 var(--glass-highlight);

                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 0 20px;

                color: #FFF;
                font-size: 16px;
                font-weight: 700;
              }

              .game-title, .round-status {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .round-status {
                min-height: 25px;
                padding: 0 9px;
                border: 1px solid rgba(255,255,255,.065);
                border-radius: 5px;
                background: rgba(255,255,255,.035);
                color: #7d8796;
                font-family: 'Rubik', sans-serif;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
              }

              .status-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: #667080;
              }

              .round-status.live {
                color: #aefbc5;
                border-color: rgba(31,214,95,.16);
                background: rgba(31,214,95,.06);
              }

              .round-status.live .status-dot {
                background: var(--gold);
                box-shadow: 0 0 8px rgba(31,214,95,.7);
                animation: status-pulse 1.6s ease-in-out infinite;
              }

              .mines-content {
                width: 100%;
                max-width: 860px;

                height: 700px;
                max-height: 100%;
                
                border: 1px solid var(--glass-border);
                border-radius: 11px;
                overflow: hidden;

                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;

                background:
                  radial-gradient(75% 80% at 50% 58%, rgba(31,214,95,.025), transparent 72%),
                  linear-gradient(145deg, rgba(23,30,40,.86), rgba(10,15,22,.94));
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 18px 46px rgba(0,0,0,.28);
                backdrop-filter: blur(12px) saturate(115%);
                -webkit-backdrop-filter: blur(12px) saturate(115%);
              }

              .round-ended .mines {
                filter: saturate(.7) brightness(.66);
                transform: scale(.985);
              }
              
              .summary {
                height: fit-content;
                position: absolute;
                z-index: 3;
                
                display: flex;
                flex-direction: column;
                align-items: center;

                width: 100%;
                max-width: 310px;
                padding: 18px;
                
                top: 0; bottom: 0;
                margin: auto;
                
                color: #FFF;
                font-size: 22px;
                font-weight: 700;

                border-radius: 10px;
                border: 1px solid #FF5141;
                background: radial-gradient(120% 130% at 50% 0, rgba(255,81,65,.22), transparent 62%), linear-gradient(145deg, rgba(30,22,27,.97), rgba(10,13,19,.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 32px rgba(255,81,65,.12), 0 22px 60px rgba(0,0,0,.58);
                backdrop-filter: blur(16px) saturate(120%);
                animation: summary-in .4s cubic-bezier(.2,.9,.25,1.15) both;
              }
              
              .summary.win {
                border: 1px solid #1fd65f;
                background: radial-gradient(120% 130% at 50% 0, rgba(31,214,95,.22), transparent 62%), linear-gradient(145deg, rgba(17,34,25,.97), rgba(8,14,18,.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.07), inset 0 0 34px rgba(31,214,95,.12), 0 22px 60px rgba(0,0,0,.58), 0 0 28px rgba(31,214,95,.08);
              }

              .summary-label {
                margin-bottom: 5px;
                color: #778292;
                font-family: 'Rubik', sans-serif;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
              }
              
              .amount-won {
                color: #FFF;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              
              .bar {
                background: linear-gradient(90deg, rgba(217, 217, 217, 0.00) 0%, #FF5141 47.26%, rgba(217, 217, 217, 0.00) 95.02%); 
                height: 1px; 
                width: 100%;
                max-width: 210px;
              }
              
              .win .bar {
                background: linear-gradient(90deg, rgba(217, 217, 217, 0.00) 0%, #1fd65f 47.26%, rgba(217, 217, 217, 0.00) 95.02%);
              }
              
              .multi {
                font-size: 18px;
              }
              
              .win .multi {
                background: linear-gradient(213deg, #1fd65f 31.52%, #88FFA2 51.19%, #29D64E 64.47%);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              
              .loss .multi {
                color: #FF5141;
              }
              
              .try {
                border: unset;
                outline: unset;

                color: #FFF;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 16px;
                font-weight: 700;
                
                padding: 0 16px;
                
                border-radius: 6px;
                background: #FF5141;
                box-shadow: 0px 1px 0px 0px #97352C, 0px -1px 0px 0px #FF8A80;
                min-width: 112px;
                height: 34px;
                
                cursor: pointer;
                transition: filter .18s, transform .18s;
              }

              .try:hover {
                filter: brightness(1.08);
                transform: translateY(-1px);
              }
              
              .win .try {
                color: #16412D;
                background: #1fd65f;
                box-shadow: 0px 1px 0px 0px #2A883E, 0px -1px 0px 0px #78FF95;
              }
              
              .mines {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: clamp(8px, 1.3vw, 14px);
                padding: clamp(16px, 2vw, 24px);
                
                margin: auto 0;
                
                width: 100%;
                max-width: 640px;
                overflow: hidden;
                transition: filter .3s ease, transform .3s ease;
              }

              .betting-container {
                min-width: 275px;
                width: 275px;
                
                height: 700px;
                max-height: 100%;

                display: flex;
                flex-direction: column;
                gap: 15px;

                border: 1px solid var(--glass-border);
                border-radius: 11px;
                background:
                  radial-gradient(110% 60% at 0 0, rgba(31,214,95,.04), transparent 60%),
                  linear-gradient(145deg, rgba(23,30,40,.88), rgba(10,15,22,.95));
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 18px 46px rgba(0,0,0,.25);
                backdrop-filter: blur(12px) saturate(115%);
                -webkit-backdrop-filter: blur(12px) saturate(115%);
                overflow: hidden;
              }
              
              .betting-header {
                width: 100%;
                height: 40px;

                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
                line-height: 40px;
                text-align: center;
                
                background: linear-gradient(180deg, rgba(22,29,39,.84), rgba(10,15,22,.78));
                border-bottom: 1px solid var(--glass-border);
                box-shadow: inset 0 1px 0 var(--glass-highlight);
              }

              .betting-options {
                display: flex;
                width: 100%;
              }

              .betting-option {
                outline: unset;
                border: unset;

                flex: 1 1 0;
                height: 43px;
                line-height: 43px;
                text-align: center;

                background: #2c3340;
                box-shadow: 0px 1px 0px 0px #0e1116, 0px -1px 0px 0px #3a4250;

                font-family: "Geogrotesque Wide", sans-serif;
                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
              }

              .betting-option.active {
                color: white;
                background: #12151c;
                box-shadow: unset;
              }

              .inputs {
                display: flex;
                flex-direction: column;
                padding: 0 12px;
                gap: 13px;
              }

              .input-wrapper {
                border: 1px solid rgba(255,255,255,.07);
                border-radius: 7px;
                overflow: hidden;
                background: rgba(4,8,13,.42);
              }

              .input-header {
                width: 100%;
                height: 30px;
                background: rgba(44,54,69,.62);

                color: #8b92a0;
                font-size: 12px;
                font-weight: 700;

                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 10px;
              }

              .input-container {
                height: 40px;
                border-radius: 0 0 6px 6px;
                border: 0;
                border-top: 1px solid rgba(255,255,255,.045);
                background: rgba(5,9,14,.55);

                display: flex;
                align-items: center;
                gap: 8px;
                padding: 5px 10px;
              }

              .modifier {
                height: 100%;
                min-width: 34px;
                padding: 0 7px;
                border: 1px solid rgba(255,255,255,.065);
                border-radius: 5px;
                background: rgba(255,255,255,.055);
                color: #8b92a0;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: color .16s, background .16s, border-color .16s;
              }

              .modifier:hover:not(:disabled) {
                color: #e3e8ef;
                border-color: rgba(31,214,95,.2);
                background: rgba(31,214,95,.07);
              }

              .modifier:disabled, input:disabled {
                opacity: .55;
                cursor: not-allowed;
              }

              input {
                width: 100%;
                height: 100%;
                border: unset;
                outline: unset;
                background: unset;
                color: white;

                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
              }

              .bet, .random {
                height: 40px;
                border: 1px solid transparent;
                border-radius: 6px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
                transition: filter .18s, transform .18s, background .18s, border-color .18s;
              }

              .bet {
                color: #06210f;
                background: linear-gradient(180deg, #25df68, #18b950);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 2px 0 #0d8034;
              }

              .bet:hover, .random:hover {
                filter: brightness(1.07);
                transform: translateY(-1px);
              }
              
              .random {
                height: 40px;
                font-weight: 700;

                color: #b7c0cc;
                background: rgba(255,255,255,.065);
                border-color: rgba(255,255,255,.075);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
              }
              
              .random:active {
                box-shadow: unset;
              }

              .bet.active {
                outline: unset;
                box-shadow: unset;

                border-radius: 3px;
                border: 1px solid #1fd65f;
                background: rgba(31, 214, 95, 0.12);

                color: #1fd65f;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 0 18px rgba(31,214,95,.045);
              }

              .bet.processing {
                opacity: .65;
                pointer-events: none;
              }
              
              .current-stats {
                display: flex;
                min-height: 40px;
                gap: 8px;
              }
              
              .current-cashout {
                flex: 1;
                height: 100%;
                padding: 0 8px;
                
                display: flex;
                gap: 8px;
                align-items: center;

                color: #FFF;
                font-size: 14px;
                font-weight: 700;
              }
              
              .coin-prefix {
                border-radius: 6px;
                border: 1px solid rgba(31,214,95,.18);
                background: rgba(31,214,95,.07);
              
                height: 30px;
                width: 30px;
                
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              .current-multi {
                height: 100%;
                padding: 0 12px;

                color: #FFF;
                font-size: 14px;
                font-weight: 700;
                line-height: 40px;
              }
              
              .current-multi p {
                color: var(--gold);
              }

              .stat-surface {
                position: relative;
                border: 1px solid rgba(31,214,95,.18);
                border-radius: 6px;
                background: linear-gradient(145deg, rgba(31,214,95,.1), rgba(8,14,18,.48));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
              }

              @keyframes mines-enter {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }

              @keyframes summary-in {
                from { opacity: 0; transform: translateY(10px) scale(.94); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }

              @keyframes status-pulse {
                0%, 100% { opacity: .55; }
                50% { opacity: 1; }
              }

              @media only screen and (max-width: 1000px) {
                .mines-container {
                  padding: 20px 14px 90px;
                }
              }

              @media only screen and (max-width: 800px) {
                .mines-container {
                  flex-direction: column;
                }
                
                .betting-container {
                  width: 100%;
                  min-width: 0;
                  gap: 0;
                  height: fit-content;
                }
                
                .inputs {
                  padding: 16px 10px;
                }
              }

              @media only screen and (max-width: 600px) {
                .mines-container {
                  padding: 12px 10px 90px;
                }

                .mines-content {
                  height: auto;
                  min-height: 430px;
                }

                .mines {
                  gap: 7px;
                  padding: 12px;
                }

                .summary {
                  box-sizing: border-box;
                  max-width: calc(100% - 32px);
                }

                .current-stats {
                  min-height: 44px;
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .mines-container, .summary, .status-dot {
                  animation: none !important;
                }

                .mines, .bet, .random {
                  transition: none !important;
                }
              }
            `}</style>
        </>
    );
}

export default Mines;
