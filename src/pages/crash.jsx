import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { Title } from '@solidjs/meta';
import { useWebsocket } from '../contexts/socketprovider';
import { subscribeToGame, unsubscribeFromGames } from '../util/socket';
import { authedAPI, createNotification } from '../util/api';
import CrashPlayerList from '../components/Crash/playerlist';
import CrashGraph from '../components/Crash/graph';
import CrashHistory from '../components/Crash/history';

function Crash(props) {
  let hasConnected = false;

  const [ws] = useWebsocket();

  // Game state
  const [round, setRound] = createSignal(null);
  const [multiplier, setMultiplier] = createSignal(1.00);
  const [bets, setBets] = createSignal([]);
  const [history, setHistory] = createSignal([]);
  const [pot, setPot] = createSignal(0);
  const [config, setConfig] = createSignal({ maxPayout: 50000, minBet: 1, maxBet: 100000 });
  
  // UI state
  const [betAmount, setBetAmount] = createSignal('');
  const [autoCashout, setAutoCashout] = createSignal('');
  const [countdown, setCountdown] = createSignal(0);
  const [isFlying, setIsFlying] = createSignal(false);
  const [isCrashed, setIsCrashed] = createSignal(false);

  // Animation state
  let animationFrame = null;
  let flightStartTime = null;
  let lastTickTime = null;
  let lastTickMultiplier = 1.00;

  // Multiplier interpolation: multiplier = floor(100 * e^(0.00006 * ms)) / 100
  function calculateMultiplier(msSinceStart) {
    return Math.floor(100 * Math.exp(0.00006 * msSinceStart)) / 100;
  }

  function animateMultiplier() {
    if (!isFlying()) {
      animationFrame = null;
      return;
    }

    const now = performance.now();
    const elapsed = now - flightStartTime;
    const interpolated = calculateMultiplier(elapsed);
    
    setMultiplier(Math.max(interpolated, lastTickMultiplier));
    animationFrame = requestAnimationFrame(animateMultiplier);
  }

  function startFlight() {
    setIsFlying(true);
    setIsCrashed(false);
    flightStartTime = performance.now();
    lastTickTime = flightStartTime;
    lastTickMultiplier = 1.00;
    setMultiplier(1.00);
    
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animateMultiplier);
  }

  function stopFlight(crashPoint) {
    setIsFlying(false);
    setIsCrashed(true);
    setMultiplier(crashPoint);
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function startCountdownTimer(ms) {
    setCountdown(ms);
    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = Math.max(0, prev - 100);
        if (next <= 0) clearInterval(interval);
        return next;
      });
    }, 100);
  }

  createEffect(() => {
    if (ws() && ws().connected && !hasConnected) {
      unsubscribeFromGames(ws());
      subscribeToGame(ws(), 'crash');

      ws().on('crash:set', (data) => {
        setConfig({ 
          maxPayout: data.maxPayout || 50000, 
          minBet: data.minBet || 1, 
          maxBet: data.maxBet || 100000 
        });
        setHistory(data.last || []);
        setPot(data.pot || 0);
        setBets(data.bets || []);
        setRound(data.round);

        if (data.round?.status === 'created') {
          // Waiting state
          const betTimeLeft = data.betTime || 0;
          setIsFlying(false);
          setIsCrashed(false);
          setMultiplier(1.00);
          startCountdownTimer(betTimeLeft);
        } else if (data.round?.status === 'started') {
          // Flying state
          const serverTime = new Date(data.serverTime).getTime();
          const startedAt = new Date(data.round.startedAt).getTime();
          const elapsed = serverTime - startedAt;
          
          setIsFlying(true);
          setIsCrashed(false);
          flightStartTime = performance.now() - elapsed;
          lastTickMultiplier = data.round.multiplier || 1.00;
          setMultiplier(data.round.multiplier || 1.00);
          
          if (animationFrame) cancelAnimationFrame(animationFrame);
          animationFrame = requestAnimationFrame(animateMultiplier);
        } else if (data.round?.status === 'ended') {
          // Crashed state
          stopFlight(data.round.multiplier || 1.00);
        }
      });

      ws().on('crash:new', (data) => {
        setRound({ id: data.id, status: 'created', serverSeedHash: data.serverSeedHash });
        setBets([]);
        setIsFlying(false);
        setIsCrashed(false);
        setMultiplier(1.00);
        setPot(data.pot || 0);
        startCountdownTimer(data.betTime || 10000);
      });

      ws().on('crash:bets', (newBets) => {
        setBets(prev => [...newBets, ...prev]);
      });

      ws().on('crash:start', (data) => {
        setCountdown(0);
        startFlight();
      });

      ws().on('crash:tick', (tick) => {
        // Anchor interpolation to received tick
        if (isFlying()) {
          lastTickTime = performance.now();
          lastTickMultiplier = tick;
          setMultiplier(tick);
        }
      });

      ws().on('crash:cashout', (data) => {
        const index = bets().findIndex(b => b.id === data.id);
        if (index >= 0) {
          const updated = [...bets()];
          updated[index] = { 
            ...updated[index], 
            cashoutPoint: data.cashoutPoint, 
            winnings: data.winnings 
          };
          setBets(updated);
        }
      });

      ws().on('crash:end', (data) => {
        stopFlight(data.crashPoint);
        setHistory(prev => [data.crashPoint, ...prev].slice(0, 30));
      });

      ws().on('crash:pot', (amount) => {
        setPot(amount);
      });

      ws().on('crash:pot:won', (data) => {
        createNotification(
          'success',
          `${data.user?.username || 'Anonymous'} won the ${data.amount} coin bonus pot at ${data.cashoutPoint}x!`
        );
      });

      hasConnected = true;
    }

    if (!ws() || !ws().connected) {
      hasConnected = false;
    }
  });

  onCleanup(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (ws() && ws().connected) {
      ws().off('crash:set');
      ws().off('crash:new');
      ws().off('crash:bets');
      ws().off('crash:start');
      ws().off('crash:tick');
      ws().off('crash:cashout');
      ws().off('crash:end');
      ws().off('crash:pot');
      ws().off('crash:pot:won');
      unsubscribeFromGames(ws());
    }
  });

  // Find user's active bet
  function myBet() {
    return bets().find(b => b.user?.id === props.user?.id);
  }

  function hasActiveBet() {
    const bet = myBet();
    return bet && !bet.cashoutPoint;
  }

  async function placeBet() {
    const amount = parseFloat(betAmount());
    const autoCashoutPoint = autoCashout() ? parseFloat(autoCashout()) : null;
    
    if (!amount || amount < config().minBet) {
      createNotification('error', `Minimum bet is ${config().minBet} coins`);
      return;
    }
    
    if (amount > config().maxBet) {
      createNotification('error', `Maximum bet is ${config().maxBet} coins`);
      return;
    }

    await authedAPI('/crash/bet', 'POST', JSON.stringify({ 
      amount, 
      autoCashoutPoint 
    }), true);
  }

  async function cashout() {
    await authedAPI('/crash/cashout', 'POST', null, true);
  }

  function adjustBet(type) {
    const current = parseFloat(betAmount()) || 0;
    switch(type) {
      case 'min':
        setBetAmount(config().minBet.toString());
        break;
      case 'max':
        setBetAmount(config().maxBet.toString());
        break;
      case '+1':
        setBetAmount((current + 1).toString());
        break;
      case '+10':
        setBetAmount((current + 10).toString());
        break;
      case '/2':
        setBetAmount((current / 2).toString());
        break;
      case 'x2':
        setBetAmount((current * 2).toString());
        break;
    }
  }

  function getButtonState() {
    const bet = myBet();
    
    if (isFlying() && hasActiveBet()) {
      return { text: `Cashout ${multiplier().toFixed(2)}x`, style: 'cashout', action: cashout };
    }
    
    if (isFlying() && !bet) {
      return { text: 'Betting closed', style: 'disabled', action: null };
    }
    
    if (isCrashed()) {
      return { text: 'Play', style: 'play', action: placeBet };
    }
    
    // Waiting for round start
    return { text: 'Play', style: 'play', action: placeBet };
  }

  const buttonState = () => getButtonState();

  return (
    <>
      <Title>Cosmic Luck | Crash</Title>

      <div class='crash-container fadein'>
        <CrashHistory history={history()} />

        <div class='crash-main'>
          <CrashPlayerList bets={bets()} isCrashed={isCrashed()} userId={props.user?.id} />

          <CrashGraph
            multiplier={multiplier()}
            isFlying={isFlying()}
            isCrashed={isCrashed()}
            countdown={countdown()}
            maxPayout={config().maxPayout}
          />
        </div>

        <div class='crash-bet-bar'>
          <div class='bet-input-wrapper'>
            <img src='/assets/icons/coin.svg' height='14' width='14' alt='' />
            <input
              type='number'
              placeholder='Play Amount'
              value={betAmount()}
              onInput={(e) => setBetAmount(e.target.value)}
            />
          </div>

          <button class='bevel-light bet-btn' onClick={() => adjustBet('min')}>Min</button>
          <button class='bevel-light bet-btn' onClick={() => adjustBet('max')}>Max</button>
          <button class='bevel-light bet-btn' onClick={() => adjustBet('+1')}>+1</button>
          <button class='bevel-light bet-btn' onClick={() => adjustBet('+10')}>+10</button>
          <button class='bevel-light bet-btn' onClick={() => adjustBet('/2')}>1/2</button>
          <button class='bevel-light bet-btn' onClick={() => adjustBet('x2')}>x2</button>

          <div class='bet-input-wrapper auto-cashout'>
            <input
              type='number'
              placeholder='Auto Cashout'
              value={autoCashout()}
              onInput={(e) => setAutoCashout(e.target.value)}
            />
          </div>

          <div class='bonus-pot'>
            <img src='/assets/icons/coin.svg' height='14' width='14' alt='' />
            <span>{pot().toFixed(2)}</span>
          </div>

          <button
            class={'play-button ' + buttonState().style}
            onClick={buttonState().action}
            disabled={buttonState().style === 'disabled' || !props.user}
          >
            {buttonState().text}
          </button>
        </div>
      </div>

      <style jsx>{`
        .crash-container {
          width: 100%;
          min-height: calc(100vh - 65px);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: radial-gradient(50% 50% at 50% 50%, #10151d 0%, #0b1017 100%);
        }

        .crash-main {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .crash-bet-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .bet-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #14171f;
          border-radius: 3px;
          padding: 0 12px;
          height: 40px;
          flex: 1;
          max-width: 200px;
        }

        .bet-input-wrapper input {
          background: none;
          border: none;
          outline: none;
          color: #c3cad6;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 14px;
          font-weight: 600;
          width: 100%;
        }

        .bet-input-wrapper input::placeholder {
          color: #8b92a0;
        }

        .auto-cashout {
          max-width: 150px;
        }

        .bet-btn {
          height: 40px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 700;
        }

        .bonus-pot {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1a1f29;
          border-radius: 20px;
          padding: 8px 14px;
          color: #1fd65f;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid rgba(31, 214, 95, 0.15);
        }

        .play-button {
          height: 40px;
          padding: 0 40px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Geogrotesque Wide', sans-serif;
          outline: none;
        }

        .play-button.play {
          background: #1fd65f;
          color: #06210f;
          box-shadow: 0px -2px 0px #45e57f, 0px 2px 0px #16a049;
        }

        .play-button.play:hover {
          background: #18b853;
        }

        .play-button.cashout {
          background: linear-gradient(180deg, #ff7a3d 0%, #ff5141 100%);
          color: white;
          box-shadow: 0px -2px 0px #ff9966, 0px 2px 0px #cc3d2f;
        }

        .play-button.cashout:hover {
          background: linear-gradient(180deg, #ff6624 0%, #ff3d2d 100%);
        }

        .play-button.disabled {
          background: #2c3340;
          color: #5a5f6b;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 1000px) {
          .crash-main {
            flex-direction: column;
          }
        }

        @media (max-width: 800px) {
          .crash-bet-bar {
            flex-wrap: wrap;
          }

          .bet-input-wrapper,
          .auto-cashout {
            max-width: 100%;
          }

          .play-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}

export default Crash;
/*

                    <div class='input-container'>
                      <input type='number' value={numBets()}
                             onInput={(e) => setNumBets(e.target.valueAsNumber)}
                             placeholder='0'/>
                    </div>
                  </div>
                </>
              )}

              <button class={'bevel-gold bet ' + (getButtonStyle())} onClick={async () => {
                let hasBet = activeBet()

                if (!hasBet) {
                  let res = await authedAPI('/crash/bet', 'POST', JSON.stringify({
                    amount: bet(),
                    autoCashoutPoint: cashoutMulti()
                  }), true)
                } else {
                  let res = await authedAPI('/crash/cashout', 'POST', null, true)
                }
              }}>
                {getButtonStyle() === 'active' ? 'CASHOUT FROM THE DRAGON REALM' : 'ENTER THE DRAGON REALM'}
              </button>
            </div>

            {betMode() === 'manual' && (
              <div class='bets-container'>
                <div class='bets-header'>
                  <p>{bets()?.length} PLAYERS</p>

                  <p class='total gold'>
                    <img src='/assets/icons/coin.svg' height='15' alt=''/>
                    {(bets()?.reduce((pv, bet) => pv + bet.amount, 0))?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>

                <div class='bets'>
                  <For each={bets()}>{(bet) => <CrashBet bet={bet} state={animationState()}/>}</For>
                </div>
              </div>
            )}
          </div>

          <div class={'animation-container ' + (animationState())}>

            <div class='history'>
              <For each={history()}>{(multi) => <CrashRound multi={multi}/>}</For>
            </div>

            <div class='round-info'>
              {animationState() === 'idle' ? (
                <>
                  <p>ENTERING DRAGON REALM</p>
                  <p class='countdown'>
                    Starting IN
                    &nbsp;
                    <span class='white'>
                                    {(timer() / 1000).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}S
                                </span>
                  </p>
                </>
              ) : (
                <>
                  <p>{animationState() === 'crashed' ? 'CRASHED' : 'CURRENT PAYOUT'}</p>
                  <p class='multi'><Countup end={multi()} duration={100} steps={3}
                                            stepDown={false}
                                            init={false}/> x</p>
                </>
              )}
            </div>

            <Graph payout={multi()}/>

            <div class='dragon' ref={dragon}>
              {animationState() === 'idle' ? (
                <video src='/assets/animations/Hold.webm' playsInline autoPlay='autoPlay'
                       loop
                       muted/>
              ) : animationState() === 'start' ? (
                <video src='/assets/animations/Start.webm' playsInline
                       autoPlay='autoPlay'
                       muted/>
              ) : animationState() === 'flying' ? (
                <video src='/assets/animations/Flying.webm' playsInline
                       autoPlay='autoPlay' loop
                       muted/>
              ) : animationState() === 'crashed' ? (
                <video src='/assets/animations/Explode.webm' playsInline autoPlay='autoPlay'
                       muted/>
              ) : null}
            </div>

            {/*<div class='ruler'/>*/}
            <div class='bg'/>
          </div>
        </div>

        <div class='crash-footer'>

        </div>
      </div>

      <style jsx>{`
        .crash-container {
          width: 100%;
          max-width: 1175px;
          height: fit-content;

          box-sizing: border-box;
          padding: 30px 0;
          margin: 0 auto;
        }

        .crash-header {
          width: 100%;
          min-height: 45px;
          height: 45px;

          border-radius: 5px 5px 0px 0px;
          background: #2B2455;
          box-shadow: 0px -1.5px 0px 0px #413972;

          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 20px;

          color: #FFF;
          font-size: 16px;
          font-weight: 700;
        }

        .crash-content {
          width: 100%;
          min-height: 575px;
          height: 575px;

          display: flex;

          background: linear-gradient(238deg, #161a22 0%, #1b202a 100%);
        }

        .dragon {
          bottom: -40px;
          left: -40px;
          position: absolute;
          z-index: 2;
        }

        .crash-footer {
          width: 100%;
          min-height: 65px;
          height: 65px;

          border-radius: 0px 0px 5px 5px;
          background: #1B1639;
        }

        .betting-container {
          min-width: 275px;
          width: 275px;
          height: 100%;

          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .bets-container {
          width: 100%;
          height: 100%;
          overflow-y: hidden;
          display: flex;
          flex-direction: column;
        }

        .bets-header {
          width: 100%;
          height: 30px;
          min-height: 30px;

          color: #9F9AC8;
          font-size: 12px;
          font-weight: 700;

          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;

          background: linear-gradient(238deg, #48428B 0%, #1b202a 100%);
        }

        .bets {
          overflow-y: scroll;
          height: 100%;
          scrollbar-color: transparent transparent;
        }

        .bets::-webkit-scrollbar {
          display: none;
        }

        .total {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .animation-container {
          width: 100%;
          height: 100%;
          background-image: url('/assets/art/lava.png'), radial-gradient(71.59% 50% at 50% 50%, #210b0b 0, #050114 100%);
          background-size: cover;
          position: relative;
          padding: 10px 120px 10px 50px;
          overflow: hidden;
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

          background: #413976;
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
          padding: 0 10px;
          gap: 15px;
        }

        .split {
          display: flex;
          gap: 8px;
        }

        .input-wrapper {
          border-radius: 3px;
          overflow: hidden;
        }

        .input-header {
          width: 100%;
          height: 30px;
          background: #413976;

          color: #9F9AC8;
          font-size: 12px;
          font-weight: 700;

          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
        }

        .input-container {
          height: 40px;
          border-radius: 0px 0px 3px 3px;
          border: 1px solid #3E3771;
          background: #14171f;

          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
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

        .bet {
          height: 40px;

          transition: all .3s;
        }

        .bet.active {
          outline: unset;
          box-shadow: unset;

          border-radius: 3px;
          border: 1px solid #1fd65f;
          background: rgba(31, 214, 95, 0.25);

          color: #1fd65f;
        }

        .round-info {
          color: #FFF;
          font-size: 24px;
          font-weight: 700;

          position: relative;
          z-index: 2;
          margin: 70px 0 0 0px;
        }

        .countdown {
          color: #1fd65f;
          font-size: 44px;
          font-weight: 700;
          text-transform: uppercase;
          font-variant-numeric: tabular-nums;
        }

        .multi {
          background: linear-gradient(37deg, #F90 30.03%, #F9AC39 42.84%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;

          text-shadow: 0px 6px 0px rgba(255, 153, 1, 0.30);
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 84px;
          font-weight: 700;

          font-variant-numeric: tabular-nums;
        }

        .crashed .multi {
          background-clip: unset;
          -webkit-background-clip: unset;
          -webkit-text-fill-color: unset;
          background: unset;

          color: #EC4040;
          text-shadow: 0px 5px 0px #45141B;
        }

        .history {
          width: 100%;
          height: fit-content;
          display: flex;
          overflow: hidden;
          gap: 10px;
          position: relative;
          z-index: 2;
        }

        .ruler {
          background: linear-gradient(238deg, rgba(255, 0, 6, 0.15) 0%, rgba(255, 122, 0, 0.15) 100%), #0F0B21;
          box-shadow: -2px 0px 5px 0px rgba(0, 0, 0, 0.35);
          height: 100%;
          width: 70px;

          position: absolute;
          z-index: 0;
          right: 0;
          top: 0;
        }

        @media only screen and (max-width: 1000px) {
          .crash-container {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </>
  );
}

*/
