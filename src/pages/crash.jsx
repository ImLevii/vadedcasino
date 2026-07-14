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
  let countdownInterval = null;

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
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    setCountdown(ms);
    countdownInterval = setInterval(() => {
      setCountdown(prev => {
        const next = Math.max(0, prev - 100);
        if (next <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        return next;
      });
    }, 100);
  }

  createEffect(() => {
    if (ws() && ws().connected && !hasConnected) {
      unsubscribeFromGames(ws());
      subscribeToGame(ws(), 'crash');

      ws().off('crash:set');
      ws().off('crash:new');
      ws().off('crash:bets');
      ws().off('crash:start');
      ws().off('crash:tick');
      ws().off('crash:cashout');
      ws().off('crash:end');
      ws().off('crash:pot');
      ws().off('crash:pot:won');

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
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
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
