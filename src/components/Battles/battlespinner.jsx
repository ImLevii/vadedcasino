import {authedAPI, getRandomNumber} from "../../util/api"
import {createEffect, createSignal, For, Index, onCleanup, Show} from "solid-js"
import BattleSpinnerItem from "./battlespinneritem"
import {generateRandomItems, generateRareItems, getRareItems, isRareItem, maskRareItems} from "../../resources/cases"
import Avatar from "../Level/avatar"
import Level from "../Level/level"
import Countup from "../Countup/countup"
import {useNavigate} from "@solidjs/router"
import Chance from 'chance'
import SpinnerDiamond from "./spinnerdiamond";
import IndicatorLine from "../IndicatorLine/indicatorline";
import {playGameSFX, stopSFXChannel, startAnimationTicker} from "../../util/sound";

function BattleSpinner(props) {

  let spinner
  let bar

  const [items, setItems] = createSignal([])
  const [color, setColor] = createSignal('')
  const navigate = useNavigate()
  let cosmicTimer
  let particleTimer
  let tickerHandle = null

  // Spin easing control points: cubic-bezier(.08,.7,.14,1)
  const SPIN_BEZIER = [0.08, 0.7, 0.14, 1]
  const SPIN_DURATION = 5000

  function startBattleTicking(duration = SPIN_DURATION) {
    if (props?.index !== 0) return
    if (tickerHandle) tickerHandle.cancel()
    tickerHandle = startAnimationTicker(
      () => {
        playGameSFX('battle-tick', '/assets/sfx/casetick.wav', {
          channel: 'battle-spin-tick',
          volume: 0.45,
          minIntervalMs: 28,
        })
      },
      duration,
      28,
      SPIN_BEZIER
    )
  }

  function stopBattleTicking() {
    if (props?.index !== 0) return
    if (tickerHandle) {
      tickerHandle.cancel()
      tickerHandle = null
    }
    stopSFXChannel('battle-spin-tick', { fadeOutMs: 60 })
  }

  const [particles, setParticles] = createSignal([])
  const [showShockwave, setShowShockwave] = createSignal(false)
  const [showFlash, setShowFlash] = createSignal(false)

  function playCosmicChargeSFX() {
    if (props?.index !== 0) return
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.20, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      masterGain.connect(ctx.destination);
      
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.9);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(12, ctx.currentTime);
      filter.frequency.setValueAtTime(140, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.9);
      
      osc.connect(filter);
      filter.connect(masterGain);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 1700)
      
      for (let i = 0; i < 7; i++) {
        const time = ctx.currentTime + i * 0.10;
        const sparkOsc = ctx.createOscillator();
        const sparkGain = ctx.createGain();
        
        sparkOsc.type = 'sine';
        sparkOsc.frequency.setValueAtTime(1400 + Math.random() * 900, time);
        
        sparkGain.gain.setValueAtTime(0.06, time);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        
        sparkOsc.connect(sparkGain);
        sparkGain.connect(ctx.destination);
        
        sparkOsc.start(time);
        sparkOsc.stop(time + 0.5);
      }
    } catch (e) {
      console.error("Web Audio API not supported or blocked", e);
    }
  }

  function triggerCosmicParticles() {
    playCosmicChargeSFX();
    
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 250);
    
    setShowShockwave(true);
    setTimeout(() => setShowShockwave(false), 850);

    const particleCount = 50;
    const colors = [
      '#1fd65f',
      '#14b04a',
      '#5cff8b',
      '#a3ffb4',
      '#00ffb7',
    ];
    
    const newParticles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 8.5;
      newParticles.push({
        id: Math.random(),
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 2),
        size: 5 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.016 + Math.random() * 0.024,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12
      });
    }

    setParticles(newParticles);

    let animFrame;
    const update = () => {
      const current = particles();
      if (current.length === 0) return;

      const updated = current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.08,
          vx: p.vx * 0.97,
          life: p.life - p.decay,
          rotation: p.rotation + p.rotSpeed
        }))
        .filter(p => p.life > 0);

      setParticles(updated);

      if (updated.length > 0) {
        animFrame = requestAnimationFrame(update);
      }
    };

    animFrame = requestAnimationFrame(update);
  }

  function adjacentTeamIsWinner() {
    if (props?.state !== 'WINNERS') return
    return props?.winnerTeam >= props?.index - 1 && props?.winnerTeam < props?.index + 1
  }

  function getRecentPulls() {
    if (!Array.isArray(props?.wonItems) || !props?.player?.id) return []

    return props.wonItems
      .filter(item => item?.userId === props.player.id)
      .slice()
      .sort((a, b) => (a?.round || 0) - (b?.round || 0))
      .slice(-5)
  }

  function latestPullRound() {
    return getRecentPulls().reduce((latest, item) => Math.max(latest, item?.round || 0), 0)
  }

  createEffect(() => {
    if (!props?.player) return setColor('')
    if (props.state === 'WAITING' || props?.state === 'EOS') return setColor('gold')
    if (props?.state === 'WINNERS' && props?.team === props?.winnerTeam) return setColor('green')
    if (props?.state === 'WINNERS' && props?.team !== props?.winnerTeam) return setColor('red')
    return setColor('')
  })

  createEffect(() => {
    if (props?.round && props?.state === 'ROLLING') {
      let chanceObj = new Chance(props?.battle?.id + '-' + props?.index)

      let currentRound = props?.rounds[props?.round - 1]
      if (!currentRound) return

      let battleCase = props?.battle?.cases?.find(c => c.id === currentRound.caseId)
      let caseItems = battleCase?.items
      let spinnerItems = generateRandomItems(caseItems, chanceObj)

      let winningId = currentRound?.items[props?.index].itemId
      let winningItem = caseItems?.find(item => winningId === item.id)
      spinnerItems[50] = winningItem

      // Cosmic Spin - rare items (including a rare win) show as the Cosmic logo
      const cosmic = !!props?.battle?.cosmicSpin && getRareItems(caseItems, battleCase?.price).length > 0
      if (cosmic) spinnerItems = maskRareItems(spinnerItems, battleCase?.price)

      setItems([...spinnerItems])
      scheduleAnimation()
      startBattleTicking(SPIN_DURATION)

      // Stop ticking when animation finishes, then play win sound
      setTimeout(() => {
        stopBattleTicking()
        if (props?.index === 0) {
          playGameSFX('battle-win', '/assets/sfx/winorcashout.mp3', {
            channel: 'battle-result-win',
            volume: 0.58,
            fadeInMs: 80,
          })
        }
      }, SPIN_DURATION)

      if (cosmic && isRareItem(winningItem, battleCase?.price)) {
        // Exclusive second spin featuring only rare items
        clearTimeout(cosmicTimer)
        cosmicTimer = setTimeout(() => {
          let rareReel = generateRareItems(caseItems, battleCase?.price, chanceObj)
          rareReel[50] = winningItem
          setItems([...rareReel])
          scheduleAnimation(true)
          startBattleTicking(SPIN_DURATION)
          setTimeout(() => stopBattleTicking(), SPIN_DURATION)
        }, 5300)

        // Trigger green particles exactly when first spin finishes (5000ms)
        clearTimeout(particleTimer)
        particleTimer = setTimeout(() => {
          triggerCosmicParticles();
        }, 5000)
      }
    }
  })

  onCleanup(() => {
    clearTimeout(cosmicTimer)
    clearTimeout(particleTimer)
    stopBattleTicking()
  })

  function scheduleAnimation(secondPhase = false) {
    requestAnimationFrame(() => requestAnimationFrame(() => animate(secondPhase)))
  }

  function animate(secondPhase = false) {
    if (!spinner) return

    let chanceObj = new Chance(props?.battle?.id + '-' + props?.round + (secondPhase ? '-cosmic' : ''))
    const winnerItem = spinner.children[50]
    const startItem = spinner.children[1]
    const viewport = spinner.parentElement
    if (!winnerItem || !startItem || !viewport) return

    const center = viewport.clientWidth / 2
    const startPosition = Math.max(0, startItem.offsetLeft + (startItem.offsetWidth / 2) - center)
    const landingOffset = getRandomNumber(-20, 20, chanceObj)
    const endPosition = winnerItem.offsetLeft + (winnerItem.offsetWidth / 2) - center + landingOffset
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reducedMotion ? 1 : 5000

    spinner.getAnimations().forEach((anim) => {
      anim.cancel()
    })

    spinner.animate(
      [
        { transform: `translateX(-${startPosition}px)` },
        { transform: `translateX(-${endPosition + 10}px)`, offset: .94 },
        { transform: `translateX(-${endPosition}px)` }
      ],
      {
        duration,
        easing: 'cubic-bezier(.08,.7,.14,1)',
        fill: 'forwards'
      }
    )

    if (!secondPhase) {
      bar.getAnimations().forEach((anim) => {
        anim.cancel()
      })

      let color = 'linear-gradient(90deg, rgba(249, 81, 81, 0.00) 0%, #F95151 100%)'
      if (props?.roundWinners?.includes(props?.team))
        color = 'linear-gradient(90deg, rgba(31, 214, 95, 0.00) 0%, #1fd65f 100%)'

      bar.animate(
        {
          background: [color, color, color],
          width: [`0`, '100%', '100%'],
          easing: ['ease', 'ease-out', 'ease-out'],
          offset: [0, 0.7, 1]
        },
        {
          delay: reducedMotion ? 0 : props?.battle?.cosmicSpin ? 10500 : 5000,
          duration: reducedMotion ? 1 : 1200,
          fill: 'forwards',
        }
      )
    }
  }

  async function recreateBattle() {
    let res = await authedAPI('/battles/create', 'POST', JSON.stringify({
      cases: props?.battle?.rounds?.map(r => r?.caseId),
      teams: props?.battle?.teams,
      playersPerTeam: props?.battle?.playersPerTeam,
      gamemode: props?.battle?.gamemode,
      cosmicSpin: !!props?.battle?.cosmicSpin,
      funding: props?.creator ? props?.battle?.ownerFunding || 0 : 0,
      minLvl: props?.creator ? props?.battle?.minLevel || 0 : 0,
      isPrivate: props?.creator ? !!props?.battle?.privKey : false,
    }), true)

    if (res.success) {
      let link = `/battle/${res?.battleId}`
      if (res?.privKey) {
        link += `?pk=${res?.privKey}`
      }
      navigate(link)
    }
  }

  async function joinBattle() {
    if (props?.creator) {
      return await authedAPI(`/battles/${props?.battle?.id}/bot`, 'POST', JSON.stringify({
        slot: props.index + 1,
        privKey: props?.battle?.privKey
      }), true)
    }

    await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({
      slot: props.index + 1,
      privKey: props?.battle?.privKey
    }), true)
  }

  return (
    <>
      <div class={'spinner ' + (color())}>

        {props?.player && props?.state === 'WINNERS' ? (
          <div class='result-lane'>
            <Show when={getRecentPulls().length > 0} fallback={<span class='result-empty'>No drops</span>}>
              <For each={getRecentPulls()}>{(item) => (
                <BattleSpinnerItem
                  img={item?.img}
                  name={item?.name}
                  price={item?.price}
                  index={item?.round === latestPullRound() ? 50 : -1}
                />
              )}</For>
            </Show>
          </div>
        ) : props?.player && props?.state === 'ROLLING' ? (
          <div class='spinner-column'>
            <div class='center-band'/>
            <IndicatorLine
              orientation='horizontal'
              length='10px'
              thickness='2px'
              pulse={false}
              style={{ position: 'absolute', top: 'calc(50% - 51px)', left: '50%', transform: 'translateX(-50%)', 'z-index': 4 }}
            />
            <IndicatorLine
              orientation='horizontal'
              length='10px'
              thickness='2px'
              pulse={false}
              style={{ position: 'absolute', top: 'calc(50% + 49px)', left: '50%', transform: 'translateX(-50%)', 'z-index': 4 }}
            />
            <div class='fade-left'/>
            <div class='fade-right'/>

            {/* Particle and Shockwave Effects */}
            <Show when={showShockwave()}>
              <div class='shockwave'/>
            </Show>
            <Show when={showFlash()}>
              <div class='flash-overlay'/>
            </Show>
            <div class='particle-container'>
              <For each={particles()}>{(p) =>
                <div
                  class='particle'
                  style={{
                    transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotation}deg) scale(${p.life})`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: p.color,
                    opacity: p.life,
                    'box-shadow': `0 0 14px ${p.color}, 0 0 5px ${p.color}`,
                    'border-radius': Math.random() > 0.45 ? '50%' : '3px'
                  }}
                />
              }</For>
            </div>

            <div class='spinner-items' ref={spinner}>
              <Index each={items()}>{(item, index) => (
                <BattleSpinnerItem
                  img={item()?.img}
                  name={item()?.name}
                  price={item()?.price}
                  index={index}
                />
              )}</Index>
            </div>
          </div>
        ) : props?.player ? (
          <div class='ready'>
            <img src='/assets/icons/logoswords.svg'/>
            <p>READY</p>
          </div>
        ) : (
          <div class='spinner-content waiting'>
            <img src='/assets/icons/waiting.png' height='50' width='50'/>
            <p>WAITING</p>
            <button class='bevel-gold call' onClick={() => joinBattle()}>{props?.creator ? 'CALL BOT' : 'JOIN BATTLE'}</button>
          </div>
        )}

        <Show when={!props?.compact}>
          <SpinnerDiamond
            index={props?.index}
            teams={props?.battle?.teams}
            startOfTeam={props?.startOfTeam}
            team={props?.team}
            gamemode={props?.battle?.gamemode}
            adjacentTeamIsWinner={adjacentTeamIsWinner()}
          />
        </Show>

        <div class='bar' ref={bar}/>
      </div>

      <style jsx>{`
        .spinner {
          flex: 1;
          height: 138px;
          position: relative;
          z-index: 0;

          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0;
          overflow: hidden;

          background: #141922;
          border: 0;
          box-shadow: none;
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          transition: all var(--transition-smooth);
        }

        .spinner.gold:before {
          position: absolute;
          top: 0;
          left: 0;
          content: '';
          width: 100%;
          height: 100%;
          opacity: 0.12;
          border-radius: var(--glass-radius);
          background-image: url("/assets/icons/battlestripes.png");
        }

        .spinner.green {
          background: #141922;
          border-bottom: 1px solid rgba(31,214,95,0.48);
          box-shadow: none;
        }

        .spinner.red {
          background: #141922;
          border-bottom: 1px solid rgba(249,81,81,0.44);
          box-shadow: none;
        }

        .gold {
          background: radial-gradient(92% 95% at 50.00% 100.00%, rgba(255, 184, 74, 0.14) 0%, rgba(0, 0, 0, 0.00) 70%), var(--btn-glass-bg);
          border-color: rgba(255, 184, 74, 0.14);
        }

        .ready {
          display: none;
        }

        .gold .ready {
          display: block;
          text-align: center;
          color: white;
          font-weight: 700;
        }

        .spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;

          color: #9296D6;
          font-size: 18px;
          font-weight: 700;

          position: relative;

          width: 100%;
          height: 100%;
        }

        .result-lane {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 14px;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(20,25,34,1), transparent 12%, transparent 88%, rgba(20,25,34,1)),
            #141922;
          animation: revealResult .35s ease-out both;
        }

        .result-empty {
          color: #596273;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .waiting img {
          animation: infinite spin 3s ease-in-out;
          filter: drop-shadow(0 0 14px rgba(31,214,95,.24));
        }

        .user-summary {
          gap: 12px;
          animation: revealResult .48s cubic-bezier(.2,.8,.2,1) both;
        }

        .cost {
          min-width: 135px;
          height: 30px;
          font-variant-numeric: tabular-nums;
        }

        .winner {
          position: absolute;
          top: 20px;
          left: 20px;

          color: #1fd65f;
          font-size: 16px;
          font-weight: 700;

          background: conic-gradient(from 180deg at 50% 50%, #1fd65f -0.3deg, #459D7B 72.1deg, #407B64 139.9deg, #407C64 180.52deg, #37545C 215.31deg, #3B5964 288.37deg, #1fd65f 359.62deg, #1fd65f 359.7deg, #459D7B 432.1deg);
          z-index: 0;

          width: 90px;
          height: 30px;
          border-radius: 3px;

          text-align: center;
          line-height: 30px;
        }

        .winner::after {
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          border-radius: 3px;

          top: 1px;
          left: 1px;

          content: '';
          position: absolute;

          background: linear-gradient(0deg, rgba(31, 214, 95, 0.25), rgba(31, 214, 95, 0.25)), linear-gradient(252.77deg, #12151c -27.53%, #1f242e 175.86%);
          z-index: -1;
        }

        .username {
          color: #FFF;
          font-size: 16px;
          font-weight: 700;

          display: flex;
          gap: 6px;
        }

        .avatar {
          position: relative;
        }

        .crown {
          position: absolute;
          top: -26px;
        }

        .red .username, .red .avatar {
          filter: grayscale(1);
        }

        .red .username {
          opacity: 0.5;
        }

        .red .cost {
          background: linear-gradient(rgba(147, 62, 62, 1), rgba(147, 62, 62, 0.61), rgba(147, 62, 62, 0.49), rgba(147, 62, 62, 0.61), rgba(147, 62, 62, 1), rgba(249, 81, 81, 1));
          position: relative;
          z-index: 0;
        }

        .red .cost:before {
          position: absolute;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          content: '';
          left: 1px;
          top: 1px;
          background: linear-gradient(0deg, rgba(249, 81, 81, 0.25) 0%, rgba(249, 81, 81, 0.25) 100%), linear-gradient(230deg, #12151c 0%, #1f242e 100%);
          z-index: -1;
        }

        .call {
          width: 147px;
          height: 34px;
        }

        .call, .recreate {
          border: 0;
          border-radius: 7px;
          background: #1fd65f;
          color: #052310;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .call:hover, .recreate:hover {
          transform: translateY(-1px);
          background: #43e37b;
          box-shadow: 0 8px 22px rgba(31,214,95,.25);
        }

        .spinner-column {
          max-width: none;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 0;

          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;

          overflow: hidden;
          background: #141922;
        }

        .center-band {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 102px;
          transform: translateY(-51px);
          pointer-events: none;
          z-index: 1;
          border-top: 0;
          border-bottom: 0;
          background: transparent;
          box-shadow: none;
          animation: none;
        }

        .fade-left, .fade-right {
          position: absolute;
          top: 0;
          width: 14%;
          height: 100%;
          z-index: 3;
          pointer-events: none;
        }

        .fade-left {
          left: 0;
          background: linear-gradient(90deg, #141922 0%, rgba(20, 25, 34, 0.86) 45%, transparent 100%);
        }

        .fade-right {
          right: 0;
          background: linear-gradient(270deg, #141922 0%, rgba(20, 25, 34, 0.86) 45%, transparent 100%);
        }

        .bar {
          position: absolute;
          width: calc(100% - 8px);
          height: 2px;
          bottom: 0;
          overflow: hidden;
          border-radius: 2525px;
          left: 0;
        }

        .spinner-items {
          width: max-content;
          height: 100%;

          display: flex;
          flex-direction: row;
          gap: 10px;

          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
        }

        @keyframes revealResult {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .recreate {
          max-width: 165px;
          width: 100%;
          height: 35px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          90% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Cosmic Spin Particle & Shockwave Styles */
        .particle-container {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 0;
          height: 0;
          z-index: 12;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          transform-origin: center;
          pointer-events: none;
          transition: transform 0.016s linear;
        }

        .shockwave {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(0.1);
          width: 130px;
          height: 130px;
          border-radius: 50%;
          border: 4px solid #1fd65f;
          box-shadow: 0 0 24px #1fd65f, inset 0 0 24px #1fd65f;
          opacity: 0.85;
          z-index: 11;
          pointer-events: none;
          animation: shockwave-expand 0.85s cubic-bezier(0.1, 0.8, 0.25, 1) forwards;
        }

        @keyframes shockwave-expand {
          0% {
            transform: translate(-50%, -50%) scale(0.1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(3.2);
            opacity: 0;
            border-width: 1px;
          }
        }

        .flash-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(31, 214, 95, 0.35) 0%, rgba(31, 214, 95, 0) 80%);
          z-index: 10;
          pointer-events: none;
          animation: flash-fade 0.25s ease-out forwards;
        }

        @keyframes flash-fade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @media only screen and (max-width: 1040px) {
          .spinner {
            width: 100%;
            min-height: 138px;
            height: 138px;
          }
        }

        @media only screen and (max-width: 620px) {
          .spinner, .spinner-column {
            min-height: 128px;
            height: 128px;
          }

          .spinner-column { max-width: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .center-band, .waiting img, .user-summary {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

export default BattleSpinner;
