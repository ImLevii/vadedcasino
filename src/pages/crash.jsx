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
  const [betQueued, setBetQueued] = createSignal(false);
  const [pendingAction, setPendingAction] = createSignal('');

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
        setBetQueued((data.bets || []).some((bet) => String(bet.user?.id) === String(props.user?.id)));
        setPendingAction('');

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
        setBetQueued(false);
        setPendingAction('');
        setIsFlying(false);
        setIsCrashed(false);
        setMultiplier(1.00);
        setPot(data.pot || 0);
        startCountdownTimer(data.betTime || 10000);
      });

      ws().on('crash:bets', (newBets) => {
        setBets(prev => [...newBets, ...prev]);
        if (newBets.some((bet) => String(bet.user?.id) === String(props.user?.id))) {
          setBetQueued(true);
          setPendingAction('');
        }
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
        if (myBet()?.id === data.id) setPendingAction('');
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
    return bets().find(b => String(b.user?.id) === String(props.user?.id));
  }

  function hasActiveBet() {
    const bet = myBet();
    return bet && !bet.cashoutPoint;
  }

  async function placeBet() {
    if (pendingAction() || isFlying() || isCrashed() || countdown() <= 0 || betQueued() || myBet()) return;

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

    if (autoCashoutPoint !== null && (!Number.isFinite(autoCashoutPoint) || autoCashoutPoint < 1.01)) {
      createNotification('error', 'Auto cashout must be at least 1.01x');
      return;
    }

    setPendingAction('bet');
    const response = await authedAPI('/crash/bet', 'POST', JSON.stringify({
      amount,
      autoCashoutPoint
    }), true);

    if (response?.success) {
      setBetQueued(true);
      createNotification('success', `Bet queued for ${amount.toFixed(2)} coins`);
    }
    setPendingAction('');
  }

  async function cashout() {
    if (pendingAction() || !isFlying() || !hasActiveBet()) return;
    setPendingAction('cashout');
    const response = await authedAPI('/crash/cashout', 'POST', null, true);
    if (response?.success) {
      createNotification('success', `Cashed out at ${multiplier().toFixed(2)}x`);
    }
    setPendingAction('');
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

    if (!props.user) {
      return { text: 'Sign in to play', style: 'disabled', action: null };
    }

    if (pendingAction() === 'bet') {
      return { text: 'Placing bet...', style: 'disabled', action: null };
    }

    if (pendingAction() === 'cashout') {
      return { text: `Cashing out ${multiplier().toFixed(2)}x`, style: 'cashout pending', action: null };
    }
    
    if (isFlying() && hasActiveBet()) {
      return { text: `Cashout ${multiplier().toFixed(2)}x`, style: 'cashout', action: cashout };
    }
    
    if (isFlying() && !bet) {
      return { text: 'Betting closed', style: 'info', action: null };
    }
    
    if (isCrashed()) {
      return { text: 'Next round soon', style: 'disabled', action: null };
    }

    if (betQueued() || bet) {
      return { text: 'Bet placed', style: 'queued', action: null };
    }

    if (countdown() <= 0) {
      return { text: 'Starting round...', style: 'disabled', action: null };
    }
    
    // Waiting for round start
    return { text: 'Play', style: 'play', action: placeBet };
  }

  const buttonState = () => getButtonState();

  return (
    <>
      <Title>Cosmic Luck | Crash</Title>

      <div class='crash-container fadein'>
        <header class='crash-header'>
          <div class='header-copy'>
            <span class='eyebrow'>Cosmic Luck original</span>
            <h1>Crash</h1>
            <p>Lock in a bet before launch and cash out before the flight ends.</p>
          </div>

          <div class={'round-status ' + (isFlying() ? 'live' : isCrashed() ? 'crashed' : 'waiting')}>
            <span class='status-dot'/>
            <div>
              <span>Round {round()?.id ? `#${round().id}` : ''}</span>
              <strong>{isFlying() ? 'In flight' : isCrashed() ? 'Round crashed' : 'Betting open'}</strong>
            </div>
          </div>
        </header>

        <section class='history-panel'>
          <span class='section-label'>Recent rounds</span>
          <CrashHistory history={history()} />
        </section>

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

        <section class='crash-bet-bar'>
          <div class='control-group amount-group'>
            <label>Bet amount</label>
            <div class='control-row'>
                <div class='bet-input-wrapper'>
                <img src='/assets/chips/chip-green.png' height='18' width='18' alt='' />
                <input
                  type='number'
                  min={config().minBet}
                  max={config().maxBet}
                  step='0.01'
                  placeholder={config().minBet.toFixed(2)}
                  value={betAmount()}
                  onInput={(e) => setBetAmount(e.target.value)}
                  disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()}
                /></div>

              <div class='quick-bets' aria-label='Bet amount shortcuts'>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('min')}>Min</button>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('max')}>Max</button>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('+1')}>+1</button>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('+10')}>+10</button>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('/2')}>1/2</button>
                <button class='bet-btn' disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()} onClick={() => adjustBet('x2')}>x2</button>
              </div>

              <div class='quick-bets' aria-label='Bet amount shortcuts'>
                <button class='bet-btn' onClick={() => adjustBet('min')}>Min</button>
                <button class='bet-btn' onClick={() => adjustBet('max')}>Max</button>
                <button class='bet-btn' onClick={() => adjustBet('+1')}>+1</button>
                <button class='bet-btn' onClick={() => adjustBet('+10')}>+10</button>
                <button class='bet-btn' onClick={() => adjustBet('/2')}>1/2</button>
                <button class='bet-btn' onClick={() => adjustBet('x2')}>x2</button>
              </div>
            </div>
          </div>

          <div class='control-group cashout-group'>
            <label>Auto cashout</label>
            <div class='bet-input-wrapper auto-cashout'>
              <input
                type='number'
                min='1.01'
                step='0.01'
                placeholder='Optional'
                value={autoCashout()}
                onInput={(e) => setAutoCashout(e.target.value)}
                disabled={betQueued() || (isFlying() && hasActiveBet()) || isCrashed()}
              />
              {autoCashout() ? (
                <button
                  class='clear-btn'
                  onClick={() => setAutoCashout('')}
                  aria-label='Clear auto cashout'
                  title='Clear'
                >✕</button>
              ) : (
                <span class='input-suffix'>x</span>
              )}
            </div>
          </div>

          <div class='control-group pot-group'>
            <label>Flight bonus</label>
            <div class='bonus-pot'>
              <img src='/assets/chips/chip-green-clover.png' height='21' width='21' alt='' />
              <div><span>Bonus pot</span><strong>{pot().toFixed(2)}</strong></div>
            </div>
          </div>

          <button
            class={'play-button ' + buttonState().style}
            onClick={buttonState().action}
            disabled={!buttonState().action}
          >
            {buttonState().text}
          </button>
        </section>
      </div>

      <style jsx>{`
        .crash-container {
          width: 100%;
          max-width: 1320px;
          min-height: calc(100vh - 90px);
          margin: 0 auto;
          padding: 28px 18px 96px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .crash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .header-copy h1, .header-copy p {
          margin: 0;
        }

        .eyebrow, .section-label, .control-group > label {
          color: #6f7988;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #1fd65f;
        }

        .header-copy h1 {
          color: #fff;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 28px;
          line-height: 1.1;
        }

        .header-copy p {
          margin-top: 7px;
          color: #7d8796;
          font-size: 12px;
        }

        .round-status {
          min-width: 168px;
          height: 52px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(19,24,33,.92), rgba(10,13,19,.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #1fd65f;
          box-shadow: 0 0 12px rgba(31,214,95,.7);
        }

        .round-status.crashed .status-dot {
          background: #ff5141;
          box-shadow: 0 0 12px rgba(255,81,65,.65);
        }

        .round-status.waiting .status-dot {
          animation: statusPulse 1.6s ease-in-out infinite;
        }

        .round-status > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .round-status span {
          color: #687281;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .round-status strong {
          color: #dce2e9;
          font-size: 11px;
        }

        .history-panel {
          min-height: 52px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 8px;
          background: rgba(12,16,23,.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        }

        .section-label {
          flex: 0 0 auto;
        }

        .crash-main {
          min-height: 560px;
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 14px;
        }

        .crash-bet-bar {
          width: 100%;
          padding: 14px;
          display: grid;
          grid-template-columns: minmax(390px, 1.6fr) minmax(150px, .55fr) minmax(140px, .5fr) minmax(180px, .65fr);
          align-items: end;
          gap: 12px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(18,23,31,.92), rgba(9,12,18,.97));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 14px 35px rgba(0,0,0,.2);
        }

        .control-group {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .control-group > label {
          margin-left: 2px;
        }

        .control-row, .quick-bets {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .bet-input-wrapper {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(5,8,12,.68);
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 7px;
          padding: 0 12px;
          height: 40px;
          flex: 1;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .bet-input-wrapper:focus-within {
          border-color: rgba(31,214,95,.4);
          box-shadow: 0 0 0 2px rgba(31,214,95,.08);
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

        .bet-input-wrapper input:disabled {
          cursor: not-allowed;
          opacity: .52;
        }

        .bet-input-wrapper input::placeholder {
          color: #8b92a0;
        }

        .auto-cashout {
          width: 100%;
        }

        .input-suffix {
          color: #1fd65f;
          font-size: 12px;
          font-weight: 800;
        }

        .clear-btn {
          background: none;
          border: none;
          color: #6f7988;
          cursor: pointer;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
          transition: color .18s ease, background .18s ease;
          flex-shrink: 0;
        }

        .clear-btn:hover {
          color: #ff5141;
          background: rgba(255, 81, 65, 0.1);
        }

        .bet-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .bet-btn {
          height: 40px;
          min-width: 42px;
          padding: 0 9px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 6px;
          background: rgba(255,255,255,.035);
          color: #8993a1;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
          transition: .18s ease;
        }

        .bet-btn:hover {
          color: #fff;
          border-color: rgba(31,214,95,.22);
          background: rgba(31,214,95,.06);
        }

        .bonus-pot {
          height: 40px;
          padding: 0 11px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(31, 214, 95, 0.14);
          border-radius: 7px;
          background: rgba(31,214,95,.045);
        }

        .bonus-pot > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .bonus-pot span {
          color: #6f7988;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .bonus-pot strong {
          overflow: hidden;
          color: #1fd65f;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          text-overflow: ellipsis;
        }

        .play-button {
          height: 40px;
          width: 100%;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Geogrotesque Wide', sans-serif;
          outline: none;
        }

        .play-button.play {
          background: #1fd65f;
          color: #06210f;
          box-shadow: 0 8px 22px rgba(31,214,95,.22), inset 0 1px 0 rgba(255,255,255,.28);
        }

        .play-button.play:hover {
          background: #18b853;
        }

        .play-button.cashout {
          background: #ff5141;
          color: white;
          box-shadow: 0 8px 22px rgba(255,81,65,.22), inset 0 1px 0 rgba(255,255,255,.2);
        }

        .play-button.cashout:hover {
          background: linear-gradient(180deg, #ff6624 0%, #ff3d2d 100%);
        }

        .play-button.disabled {
          background: rgba(255,255,255,.045);
          color: #606a78;
          cursor: not-allowed;
          box-shadow: none;
        }

        .play-button.queued {
          background: rgba(31,214,95,.08);
          color: #1fd65f;
          border: 1px solid rgba(31,214,95,.2);
          cursor: default;
        }

        .play-button.info {
          background: transparent;
          color: #6b7280;
          border: 1px solid rgba(255,255,255,.06);
          cursor: default;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .play-button.pending {
          opacity: .72;
          cursor: wait;
        }

        @keyframes statusPulse {
          0%, 100% { opacity: .55; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 1120px) {
          .crash-bet-bar {
            grid-template-columns: minmax(390px, 1fr) minmax(150px, .5fr);
          }

          .crash-main {
            grid-template-columns: 1fr;
            min-height: 0;
          }
        }

        @media (max-width: 800px) {
          .crash-container { padding: 20px 12px 90px; }
          .crash-main { min-height: 650px; }
          .crash-bet-bar { grid-template-columns: 1fr; }

          .control-row { align-items: stretch; flex-direction: column; }
          .quick-bets { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
          .bet-btn { min-width: 0; width: 100%; }
        }

        @media (max-width: 560px) {
          .crash-header { align-items: stretch; flex-direction: column; }
          .round-status { min-width: 0; }
          .history-panel { align-items: flex-start; flex-direction: column; gap: 0; padding-top: 10px; }
          .header-copy h1 { font-size: 25px; }
          .crash-main { min-height: 590px; }
          .quick-bets { grid-template-columns: repeat(3, 1fr); }
        }

        @media (prefers-reduced-motion: reduce) {
          .round-status.waiting .status-dot { animation: none; }
        }
      `}</style>
    </>
  );
}

export default Crash;
