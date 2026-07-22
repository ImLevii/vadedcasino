import SpinnerItem from "./spinneritem";
import {createEffect, createSignal, onCleanup, For, Show} from "solid-js";
import IndicatorLine from "../IndicatorLine/indicatorline";

function CaseSpinner(props) {

    let spinner
  let spinAnimation
  const itemWidth = 130
  const itemGap = 4
  const itemStep = itemWidth + itemGap
  const itemCenter = itemWidth / 2
  const idleItemIndex = 6
  const idleStart = idleItemIndex * itemStep + itemCenter
  const verticalIdleStart = idleItemIndex * itemStep
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

  const isIdle = () => props?.spinning === '' || props?.spinning === 'loading'
  const isVertical = () => props?.layout === 'multi'
  const idleOffset = () => isVertical() ? verticalIdleStart : idleStart
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

      const vertical = isVertical()
      const currentPosition = getCurrentTranslateX()
      const firstItem = Math.abs(currentPosition || -idleOffset())
      const lastItem = 50 * itemStep + itemCenter

        spinAnimation?.cancel()
        spinner?.getAnimations()?.forEach(animation => {
          if (animation.animationName !== 'idleCarousel' && animation.animationName !== 'idleCarouselVertical') animation.cancel()
        })
      spinner.style.transform = vertical ? `translateY(-${firstItem}px)` : `translateX(-${firstItem}px)`

        spinAnimation = spinner.animate(
          vertical ? [
            {transform: `translateY(-${firstItem}px)`, offset: 0, easing: spinEasing},
            {transform: `translateY(${-lastItem - props?.offset}px)`, offset: 0.88, easing: spinEasing},
            {transform: `translateY(-${lastItem}px)`, offset: 1, easing: 'cubic-bezier(.18,.72,.22,1)'}
          ] : [
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
      if (!spinner) return -idleOffset()

      const transform = getComputedStyle(spinner).transform
      if (!transform || transform === 'none') return -idleOffset()

      const matrix = new DOMMatrixReadOnly(transform)
      return (isVertical() ? matrix.m42 : matrix.m41) || -idleOffset()
    }

    return (
        <>
            <div class={'case-spinner-container ' + (props?.spinning === '' || props?.spinning === 'loading' ? 'idle ' : '') + (props?.layout === 'multi' ? 'multi vertical ' : '') + (props?.sideArrows ? 'side-arrows' : '')}>
                {/* Side fade masks */}
                <Show when={!isVertical()} fallback={
                  <>
                    <div class='fade-top'/>
                    <div class='fade-bottom'/>
                  </>
                }>
                  <div class='fade-left'/>
                  <div class='fade-right'/>
                </Show>
                <div class='center-indicator'/>
                <Show when={!isVertical()}>
                  <IndicatorLine
                    orientation='horizontal'
                    length='10px'
                    thickness='2px'
                    pulse={false}
                    style={{ position: 'absolute', left: '50%', top: '11px', transform: 'translateX(-50%)', 'z-index': 5 }}
                  />
                  <IndicatorLine
                    orientation='horizontal'
                    length='10px'
                    thickness='2px'
                    pulse={false}
                    style={{ position: 'absolute', left: '50%', bottom: '11px', transform: 'translateX(-50%)', 'z-index': 5 }}
                  />
                </Show>

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
                <div class={'spinner-items ' + (isVertical() ? 'vertical ' : '') + (isIdle() ? 'idle-track' : '')} ref={spinner}
                     style={{
                       '--idle-from': `-${idleOffset()}px`,
                       '--idle-to': `-${idleOffset() + loopWidth()}px`,
                       '--idle-duration': `${loopDuration()}s`
                     }}>
                    <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                  name={item?.name}
                                                                                  spinning={props?.spinning}
                                                                                  price={item?.price}
                                                                                  vertical={isVertical()}
                                                                                  index={index()} position={props?.position}/>}</For>
                    {/* duplicated strip for seamless infinite idle loop */}
                    <Show when={isIdle()}>
                        <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                      name={item?.name}
                                                                                      spinning={props?.spinning}
                                                                                      price={item?.price}
                                                                                      vertical={isVertical()}
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
                isolation: isolate;
              }

              .case-spinner-container::before {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent 18%, transparent 82%, rgba(255,255,255,0.015));
                z-index: 0;
              }

              .case-spinner-container.multi {
                width: 100%;
                min-width: 0;
                flex: unset;
                height: 252px;
                border: 0;
                border-radius: 0;
                background: transparent;
                box-shadow: none;
              }

              .case-spinner-container.multi:first-child {
                border-left: 0;
              }

              .case-spinner-container.vertical {
                height: 258px;
              }

              .case-spinner-container.vertical .fade-left,
              .case-spinner-container.vertical .fade-right {
                display: none;
              }

              .case-spinner-container.vertical .fade-top,
              .case-spinner-container.vertical .fade-bottom {
                position: absolute;
                left: 0;
                width: 100%;
                height: 26%;
                z-index: 2;
                pointer-events: none;
              }

              .case-spinner-container.vertical .fade-top {
                top: 0;
                background: linear-gradient(to bottom, #080a10 0%, rgba(8,10,16,0.85) 40%, transparent 100%);
              }

              .case-spinner-container.vertical .fade-bottom {
                bottom: 0;
                background: linear-gradient(to top, #080a10 0%, rgba(8,10,16,0.85) 40%, transparent 100%);
              }

              .case-spinner-container.vertical .center-indicator {
                left: 0;
                top: 50%;
                transform: translateY(-65px);
                width: 100%;
                height: 130px;
              }

              .case-spinner-container.idle {
                border-color: rgba(31, 214, 95, 0.12);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 28px rgba(0, 0, 0, 0.24), var(--green-glow);
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
                background: transparent;
                z-index: 1;
                pointer-events: none;
                box-shadow: none;
                animation: none;
                border-left: 0;
                border-right: 0;
              }

              .case-spinner-container.multi .center-indicator {
                background: transparent;
                box-shadow: none;
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
                z-index: 2;
              }

              .spinner-items.vertical {
                width: 100%;
                height: fit-content;
                flex-direction: column;
                left: 0;
                top: 50%;
                transform: translateY(-${verticalIdleStart}px);
              }

              .spinner-items.idle-track {
                animation: idleCarousel var(--idle-duration, 60s) linear infinite;
              }

              .spinner-items.vertical.idle-track {
                animation: idleCarouselVertical var(--idle-duration, 60s) linear infinite;
              }

              .case-spinner-container:hover .spinner-items.idle-track {
                animation-play-state: paused;
              }

              @keyframes idleCarousel {
                0% { transform: translateX(var(--idle-from, -${idleStart}px)); }
                100% { transform: translateX(var(--idle-to, -${idleEnd}px)); }
              }

              @keyframes idleCarouselVertical {
                0% { transform: translateY(var(--idle-from, -${idleStart}px)); }
                100% { transform: translateY(var(--idle-to, -${idleEnd}px)); }
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
