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
import {playGameSFX, stopSFXChannel, startReelSFX, playCosmicSFX} from "../../util/sound";

function BattleSpinner(props) {

  let spinner

  const [items, setItems] = createSignal([])
  const [color, setColor] = createSignal('')
  const navigate = useNavigate()
  let cosmicTimer
  let particleFrame
  let animationFrame
  let spinAnimation
  let tickerHandle = null
  let stopCosmicSound = () => {}
  const soundTimers = new Set()
  const scheduleSound = (fn, delay) => {
    const timer = setTimeout(() => { soundTimers.delete(timer); fn() }, delay)
    soundTimers.add(timer)
  }

  const SPIN_DURATION = 5000

  function startBattleTicking(duration = SPIN_DURATION, owner = 0) {
    if (props?.index !== owner) return
    stopBattleTicking()
    tickerHandle = startReelSFX('battle-roll', duration * .94, [.08, .7, .14, 1])
  }

  function stopBattleTicking() {
    tickerHandle?.()
    tickerHandle = null
  }

  const [particles, setParticles] = createSignal([])
  const [showShockwave, setShowShockwave] = createSignal(false)
  const [showFlash, setShowFlash] = createSignal(false)

  function triggerCosmicParticles(soundOwner) {
    if (props.index === soundOwner) stopCosmicSound = playCosmicSFX()

    setShowFlash(true);
    scheduleSound(() => setShowFlash(false), 250);
    
    setShowShockwave(true);
    scheduleSound(() => setShowShockwave(false), 850);

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

    cancelAnimationFrame(particleFrame);
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
        particleFrame = requestAnimationFrame(update);
      }
    };

    particleFrame = requestAnimationFrame(update);
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

      const soundOwner = cosmic ? currentRound.items.findIndex(result => isRareItem(caseItems?.find(item => item.id === result.itemId), battleCase?.price)) : -1
      const hit = cosmic && isRareItem(winningItem, battleCase?.price)
      const playResult = () => playGameSFX('battle-round-win', '/assets/sfx/winorcashout.mp3', {
        channel: 'battle-result-win', volume: .5, fadeInMs: 30,
      })
      setItems([...spinnerItems])
      scheduleAnimation(false, 0, () => {
        // One result cue per round, after the last phase has actually landed.
        if (soundOwner < 0 && props.index === 0) playResult()
        if (!hit) return
        triggerCosmicParticles(soundOwner)
        cosmicTimer = setTimeout(() => {
          let rareReel = generateRareItems(caseItems, battleCase?.price, chanceObj)
          rareReel[50] = winningItem
          setItems([...rareReel])
          scheduleAnimation(true, soundOwner, () => {
            if (props.index === soundOwner) playResult()
          })
        }, 300)
      })
      // Reactive round changes and navigation must cancel the previous round.
      onCleanup(clearRoundEffects)

    }
  })

  function clearRoundEffects() {
    clearTimeout(cosmicTimer)
    cancelAnimationFrame(particleFrame)
    cancelAnimationFrame(animationFrame)
    if (spinAnimation) { spinAnimation.onfinish = null; spinAnimation.cancel(); spinAnimation = null }
    soundTimers.forEach(clearTimeout)
    soundTimers.clear()
    stopCosmicSound()
    stopBattleTicking()
    if (props?.index === 0) stopSFXChannel('battle-result-win')
  }
  onCleanup(clearRoundEffects)

  function scheduleAnimation(secondPhase = false, soundOwner = 0, onFinish = () => {}) {
    animationFrame = requestAnimationFrame(() => {
      animationFrame = requestAnimationFrame(() => animate(secondPhase, soundOwner, onFinish))
    })
  }

  function animate(secondPhase = false, soundOwner = 0, onFinish = () => {}) {
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

    spinAnimation = spinner.animate(
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

    if (!reducedMotion) startBattleTicking(duration, soundOwner)
    spinAnimation.onfinish = () => { stopBattleTicking(); onFinish() }

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

  const [joining, setJoining] = createSignal(false)

  function previewItems() {
    const caseId = props.battle?.rounds?.[Math.max(0, (props.round || 1) - 1)]?.caseId
    const pool = props.battle?.cases?.find(c => c.id === caseId)?.items || []
    const recent = getRecentPulls()
    return Array.from({ length: 9 }, (_, i) => i === 4 && props.state === 'WINNERS' ? recent[recent.length - 1] : pool[i % Math.max(1, pool.length)]).filter(Boolean)
  }

  async function joinBattle() {
    if (joining()) return
    setJoining(true)
    try {
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
    } finally { setJoining(false) }
  }

  return (
    <>
      <div class={'spinner ' + (color())}>

        {props?.player && props?.state === 'WINNERS' ? (
          <div class='result-lane'>
            <div class='resting-track'>
              <For each={previewItems()}>{(item, i) => <BattleSpinnerItem img={item.img} name={item.name} price={item.price} index={i() === 4 ? 50 : -1}/>}</For>
            </div>
          </div>
        ) : props?.player && props?.state === 'ROLLING' ? (
          <div class='spinner-column'>
            <div class='center-band'/>
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
        ) : (
          <div class='idle-lane'>
            <div class='resting-track preview' aria-hidden='true'>
              <For each={previewItems()}>{item => <BattleSpinnerItem img={item.img} name={item.name} price={item.price} index={-1}/>}</For>
            </div>
            <div class={'seat-status ' + (props.player ? 'ready' : 'waiting')}>
              <svg class='seat-icon' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.6' aria-hidden='true'>
                <Show when={props.player} fallback={<><circle cx='12' cy='8' r='3'/><path d='M5 21v-3a7 7 0 0 1 14 0v3M18 5h6m-3-3v6'/></>}><path d='m6 12 4 4 8-8'/><circle cx='12' cy='12' r='10'/></Show>
              </svg>
              <strong>{props.player ? (props.state === 'EOS' ? 'Starting soon' : 'Ready') : 'Waiting for player'}</strong>
              <Show when={!props.player} fallback={<span>Waiting for the battle to start</span>}>
                <button class='call' disabled={joining()} onClick={joinBattle}>{joining() ? 'Joining?' : props.creator ? 'Call bot' : 'Join battle'}</button>
              </Show>
            </div>
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

      </div>

      <style jsx>{`
        .spinner {
          width: 100%;
          min-width: 0;
          height: var(--lane-height, 132px);
          box-sizing: border-box;
          position: relative;
          z-index: 0;

          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0;
          overflow: hidden;

          background: #111318;
          border: 0;
          box-shadow: none;
          transition: background var(--transition-smooth);
        }

        .spinner { border-radius:4px; background:#111318; }
        .spinner:before,.spinner:after { content:''; position:absolute; left:calc(50% - 4px); width:8px; height:2px; background:#1fd65f; box-shadow:0 0 8px #1fd65f88; z-index:5; }
        .spinner:before { top:1px; }.spinner:after { bottom:1px; }
        .idle-lane,.result-lane { position:relative; width:100%; height:100%; overflow:hidden; }
        .resting-track { display:flex; gap:6px; width:max-content; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
        .preview { opacity:.15; filter:blur(1px); }
        .seat-status { position:relative; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:8px; box-sizing:border-box; text-align:center; background:radial-gradient(ellipse at center,#111318 5%,#111318c9 40%,transparent 80%); }
        .seat-status strong { color:#e8edf1; font-size:12px; font-weight:700; }.seat-status>span { color:#86928e; font-size:10px; }.seat-icon { color:#1fd65f; }
        .seat-status .call { min-width:112px; width:auto; height:30px; padding:0 14px; border-radius:4px; text-transform:none; }
        .call:disabled { opacity:.6; cursor:wait; }.call:focus-visible { outline:2px solid #1fd65f; outline-offset:3px; }
        @media(max-width:700px) { .seat-status>span { max-width:115px; text-align:center; font-size:9px; }.seat-status strong { font-size:10px; }.seat-status .call { min-width:100px; } }

        .spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;

          color: #a6b8ad;
          font-size: 10px;
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
          justify-content: flex-start;
          gap: 6px;
          padding: 0;
          overflow: hidden;
          background:
            linear-gradient(90deg, #111318, transparent 12%, transparent 88%, #111318),
            #111318;
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
          width: 92px;
          height: 24px;
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
          background: #111318;
        }

        .center-band {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 108px;
          transform: translateY(-54px);
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
          background: linear-gradient(90deg, #111318 0%, rgba(17,19,24,.86) 45%, transparent 100%);
        }

        .fade-right {
          right: 0;
          background: linear-gradient(270deg, #111318 0%, rgba(17,19,24,.86) 45%, transparent 100%);
        }

        .spinner-items {
          width: max-content;
          height: 100%;

          display: flex;
          flex-direction: row;
          gap: 6px;

          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
          align-items: center;
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
