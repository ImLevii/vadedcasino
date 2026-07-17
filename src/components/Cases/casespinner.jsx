import SpinnerItem from "./spinneritem";
import {createEffect, createSignal, onCleanup, For, Show} from "solid-js";

function CaseSpinner(props) {

    let spinner
  let spinAnimation
  const itemWidth = 130
  const itemGap = 4
  const itemStep = itemWidth + itemGap
  const itemCenter = itemWidth / 2
  const idleItemIndex = 6
  const idleStart = idleItemIndex * itemStep + itemCenter
  const idleEnd = idleStart + itemStep
  const spinEasing = 'cubic-bezier(.08,.78,.16,1)'

  const [particles, setParticles] = createSignal([])
  const [showShockwave, setShowShockwave] = createSignal(false)
  const [showFlash, setShowFlash] = createSignal(false)

  function playCosmicChargeSFX() {
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

  const isIdle = () => props?.spinning === '' || props?.spinning === 'loading'
  const loopWidth = () => (props?.items?.length || 0) * itemStep
  const loopDuration = () => Math.max(20, (props?.items?.length || 0) * 1.4)

    createEffect(() => {
        if (props?.spinning === 'spinning') {
      requestAnimationFrame(() => animate())

      const isCosmicWin = props.items && props.items[50]?.id === 'cosmic-spin-gem';
      if (isCosmicWin) {
        const timer = setTimeout(() => {
          triggerCosmicParticles();
        }, props.spinTime || 4800);
        onCleanup(() => clearTimeout(timer));
      }
    }

    if (props?.spinning === '') {
      resetTrack()
        }
    })

    function animate() {

      const currentPosition = getCurrentTranslateX()
      const firstItem = Math.abs(currentPosition || -idleStart)
      const lastItem = 50 * itemStep + itemCenter

        spinAnimation?.cancel()
        spinner?.getAnimations()?.forEach(animation => {
          if (animation.animationName !== 'idleCarousel') animation.cancel()
        })
      spinner.style.transform = `translateX(-${firstItem}px)`

        spinAnimation = spinner.animate(
            [
          {transform: `translateX(-${firstItem}px)`, offset: 0, easing: spinEasing},
          {transform: `translateX(${-lastItem - props?.offset}px)`, offset: 0.88, easing: spinEasing},
          {transform: `translateX(-${lastItem}px)`, offset: 1, easing: 'cubic-bezier(.18,.72,.22,1)'}
            ],
            {
          duration: props?.spinTime || 4800,
                fill: 'forwards'
            })
    }

        function resetTrack() {
          spinAnimation?.cancel()
          spinAnimation = null
          if (spinner) spinner.style.transform = ''
        }

    function getCurrentTranslateX() {
      if (!spinner) return -idleStart

      const transform = getComputedStyle(spinner).transform
      if (!transform || transform === 'none') return -idleStart

      const matrix = new DOMMatrixReadOnly(transform)
      return matrix.m41 || -idleStart
    }

    return (
        <>
            <div class={'case-spinner-container ' + (props?.spinning === '' || props?.spinning === 'loading' ? 'idle ' : '') + (props?.layout === 'multi' ? 'multi ' : '') + (props?.sideArrows ? 'side-arrows' : '')}>
                {/* Side fade masks */}
                <div class='fade-left'/>
                <div class='fade-right'/>
                {/* Center indicator */}
              <div class='lane-arrow lane-arrow-top'/>
              <div class='lane-arrow lane-arrow-bottom'/>
                <div class='center-indicator'/>
                <div class='center-line-top'/>
                <div class='center-line-bottom'/>

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
                <div class={'spinner-items ' + (isIdle() ? 'idle-track' : '')} ref={spinner}
                     style={{
                       '--idle-from': `-${idleStart}px`,
                       '--idle-to': `-${idleStart + loopWidth()}px`,
                       '--idle-duration': `${loopDuration()}s`
                     }}>
                    <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                  name={item?.name}
                                                                                  spinning={props?.spinning}
                                                                                  price={item?.price}
                                                                                  index={index()} position={props?.position}/>}</For>
                    {/* duplicated strip for seamless infinite idle loop */}
                    <Show when={isIdle()}>
                        <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                      name={item?.name}
                                                                                      spinning={props?.spinning}
                                                                                      price={item?.price}
                                                                                      index={index()} position={props?.position}/>}</For>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .case-spinner-container {
                flex: 1 0 320px;
                min-width: 320px;

                min-height: 130px;
                height: 204px;

                border-radius: var(--glass-radius-sm);
                background: var(--btn-glass-bg);
                overflow: hidden;
                position: relative;
                border: 1px solid var(--glass-border);
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 10px 28px rgba(0, 0, 0, 0.24);
                backdrop-filter: var(--glass-blur);
                -webkit-backdrop-filter: var(--glass-blur);
              }

              .case-spinner-container.multi {
                width: 100%;
                min-width: 0;
                flex: unset;
                height: 252px;
                border-radius: 0;
                border-top: 0;
                border-bottom: 0;
                border-left: 1px solid var(--glass-border);
                border-right: 0;
                background: radial-gradient(55% 80% at 50% 50%, rgba(31, 214, 95, 0.045), rgba(31, 214, 95, 0) 54%), var(--btn-glass-bg);
                box-shadow: inset 1px 0 0 rgba(255,255,255,0.018), inset -1px 0 0 rgba(0,0,0,0.24);
              }

              .case-spinner-container.multi:first-child {
                border-left: 0;
              }

              .case-spinner-container.idle {
                border-color: rgba(31, 214, 95, 0.12);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 28px rgba(0, 0, 0, 0.24), var(--green-glow);
              }

              .lane-arrow {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                z-index: 5;
                pointer-events: none;
                filter: drop-shadow(0 0 3px rgba(31, 214, 95, 0.4));
              }

              .lane-arrow-top {
                top: 7px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 7px solid #1fd65f;
              }

              .lane-arrow-bottom {
                bottom: 7px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 7px solid #1fd65f;
              }

              .case-spinner-container.multi .lane-arrow-top {
                top: 8px;
                border-left-width: 5px;
                border-right-width: 5px;
                border-top-width: 7px;
              }

              .case-spinner-container.multi .lane-arrow-bottom {
                bottom: 8px;
                border-left-width: 5px;
                border-right-width: 5px;
                border-bottom-width: 7px;
              }

              .case-spinner-container.side-arrows .lane-arrow {
                top: 50%;
                bottom: auto;
                left: auto;
                transform: translateY(-50%);
              }

              .case-spinner-container.side-arrows .lane-arrow-top {
                left: 8px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-left: 7px solid #1fd65f;
                border-right: 0;
              }

              .case-spinner-container.side-arrows .lane-arrow-bottom {
                right: 8px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-right: 7px solid #1fd65f;
                border-left: 0;
              }

              .case-spinner-container.multi.side-arrows .lane-arrow-top {
                top: 50%;
                left: 7px;
                border-top-width: 5px;
                border-bottom-width: 5px;
                border-left-width: 7px;
                border-right-width: 0;
              }

              .case-spinner-container.multi.side-arrows .lane-arrow-bottom {
                bottom: auto;
                right: 7px;
                border-top-width: 5px;
                border-bottom-width: 5px;
                border-right-width: 7px;
                border-left-width: 0;
              }

              /* Side gradient fades */
              .fade-left, .fade-right {
                position: absolute;
                top: 0;
                width: 22%;
                height: 100%;
                z-index: 2;
                pointer-events: none;
              }

              .fade-left {
                left: 0;
                background: linear-gradient(to right, #080a10 0%, rgba(8,10,16,0.85) 40%, transparent 100%);
              }

              .fade-right {
                right: 0;
                background: linear-gradient(to left, #080a10 0%, rgba(8,10,16,0.85) 40%, transparent 100%);
              }

              .case-spinner-container.multi .fade-left,
              .case-spinner-container.multi .fade-right {
                width: 28%;
              }

              /* Center column highlight */
              .center-indicator {
                position: absolute;
                left: 50%;
                top: 0;
                transform: translateX(-65px);
                width: 130px;
                height: 100%;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.07), rgba(31, 214, 95, 0));
                z-index: 1;
                pointer-events: none;
                box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.08), inset -1px 0 0 rgba(31, 214, 95, 0.08), 0 0 24px rgba(31, 214, 95, 0.08);
                animation: centerGlow 2.8s ease-in-out infinite;
              }

              .case-spinner-container.multi .center-indicator {
                background: linear-gradient(90deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.07), rgba(31, 214, 95, 0));
                box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.08), inset -1px 0 0 rgba(31, 214, 95, 0.08), 0 0 18px rgba(31, 214, 95, 0.06);
              }

              /* Top and bottom tick lines */
              .center-line-top, .center-line-bottom {
                position: absolute;
                left: 50%;
                transform: translateX(-65px);
                width: 130px;
                height: 2px;
                background: linear-gradient(to right, transparent, rgba(31, 214, 95, 0.16) 12%, #1fd65f 38%, #1fd65f 62%, rgba(31, 214, 95, 0.16) 88%, transparent);
                z-index: 3;
                pointer-events: none;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.5), 0 0 18px rgba(31, 214, 95, 0.22);
              }

              .center-line-top { top: 0; }
              .center-line-bottom { bottom: 0; }

              .case-spinner-container.multi .center-line-top,
              .case-spinner-container.multi .center-line-bottom {
                height: 1px;
                box-shadow: 0 0 4px rgba(31, 214, 95, 0.25);
              }

              .spinner-items {
                width: fit-content;
                height: 100%;

                display: flex;

                gap: 4px;

                position: absolute;
                left: 50%;
                transform: translateX(-869px);
                transform: translateX(-${idleStart}px);
                will-change: transform;
              }

              .spinner-items.idle-track {
                animation: idleCarousel var(--idle-duration, 60s) linear infinite;
              }

              .case-spinner-container:hover .spinner-items.idle-track {
                animation-play-state: paused;
              }

              @keyframes idleCarousel {
                0% { transform: translateX(var(--idle-from, -${idleStart}px)); }
                100% { transform: translateX(var(--idle-to, -${idleEnd}px)); }
              }

              @keyframes centerGlow {
                0%, 100% {
                  opacity: .75;
                  box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.08), inset -1px 0 0 rgba(31, 214, 95, 0.08), 0 0 16px rgba(31, 214, 95, 0.06);
                }
                50% {
                  opacity: 1;
                  box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.14), inset -1px 0 0 rgba(31, 214, 95, 0.14), 0 0 28px rgba(31, 214, 95, 0.1);
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

              @media only screen and (max-width: 560px) {
                .case-spinner-container {
                  width: 100%;
                  min-width: 300px;
                  flex-basis: 300px;
                }
              }
            `}</style>
        </>
    );
}

export default CaseSpinner;
