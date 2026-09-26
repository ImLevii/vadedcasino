import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js';
import CrashRocket from './rocket';
import {flightGeometry} from '../../util/crashmotion.mjs';

export default function CrashGraph(props) {
  let container;
  const [size, setSize] = createSignal({width:900,height:560});
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(container);
    onCleanup(() => observer.disconnect());
  });
  const color = m => m >= 4 ? '#d2382b' : m >= 3 ? '#d68125' : m >= 2 ? '#c5ab24' : '#659e22';
  const geometry = createMemo(() => flightGeometry(size().width, size().height, props.multiplier));
  const waiting = () => !props.isFlying && !props.isCrashed;
  const stars=Array.from({length:65},(_,i)=>({x:(i*73.37)%100,y:(i*39.71)%100,r:i%5===0?1.2:.7}));
  return <>
    <div class='crash-graph' classList={{flying:props.isFlying, ended:props.isCrashed}} ref={container}>
      <svg class='flight-chart' viewBox={`0 0 ${geometry().w} ${geometry().h}`} aria-label={`Crash multiplier ${Number(props.multiplier||1).toFixed(2)}x`} role='img'>
        <defs>
          <linearGradient id='crash-space' x2='1' y2='0'><stop stop-color='#00121c'/><stop offset='1' stop-color='#000609'/></linearGradient>
          <linearGradient id='crash-trail'><stop stop-color={color(geometry().m)} stop-opacity='0'/><stop offset='1' stop-color={props.isCrashed?'#e34236':color(geometry().m)}/></linearGradient>
          <filter id='crash-glow' x='-50%' y='-100%' width='200%' height='300%'><feGaussianBlur stdDeviation='2'/></filter>
        </defs>
        <rect width='100%' height='100%' fill='url(#crash-space)'/>
        <g class='starfield' aria-hidden='true'>
          <For each={stars}>{(star,index)=><g class='star-drift' style={{'--drift-time':`${12+index()%9}s`,'--star-delay':`${-index()*1.7}s`}}>
            <circle class='star' cx={`${star.x}%`} cy={`${star.y}%`} r={star.r} fill='#c9f9e8' style={{'--twinkle-time':`${2+index()%5}s`,'--star-delay':`${-index()*.37}s`}}/>
          </g>}</For>
        </g>
        <Show when={!waiting()}>
        <line x1={geometry().left} x2={geometry().right-28} y1={geometry().bottom+18} y2={geometry().bottom+18} stroke='#7d898c' stroke-width='2'/>
        <For each={geometry().xTicks}>{tick=><g>
          <line x1={geometry().left+tick/geometry().maxT*(geometry().right-geometry().left-40)} x2={geometry().left+tick/geometry().maxT*(geometry().right-geometry().left-40)} y1={geometry().bottom+13} y2={geometry().bottom+24} stroke='#929d9f'/>
          <text x={geometry().left+tick/geometry().maxT*(geometry().right-geometry().left-40)} y={geometry().bottom+38} text-anchor='middle'>{tick}s</text>
        </g>}</For>
        <line x1={geometry().right+12} x2={geometry().right+12} y1={geometry().top-20} y2={geometry().bottom} stroke={color(geometry().m)} stroke-opacity='.5' stroke-width='2'/>
        <For each={geometry().yTicks}>{tick=><g>
          <line x1={geometry().right+8} x2={geometry().right+16} y1={geometry().point(tick).y} y2={geometry().point(tick).y} stroke='#b2bcbc' stroke-width='2'/>
          <text x={geometry().right+23} y={geometry().point(tick).y+4}>{tick.toFixed(2)}x</text>
        </g>}</For>
        <Show when={props.isFlying||props.isCrashed}>
          <path d={geometry().path} fill='none' stroke='url(#crash-trail)' stroke-width='6' filter='url(#crash-glow)' opacity='.6'/>
          <path d={geometry().path} fill='none' stroke='url(#crash-trail)' stroke-width='3'/>
          <text class='current-tick' x={geometry().right+23} y={geometry().end.y-9}>{geometry().m.toFixed(2)}x</text>
        </Show>
        <g class='rocket' opacity={props.isCrashed ? .4 : 1} transform={`translate(${geometry().end.x},${geometry().end.y}) rotate(${geometry().angle}) scale(${geometry().w<600?.65:1})`}>
          <CrashRocket stopped={props.isCrashed}/>
        </g>
        <Show when={props.cashoutPoint&&(props.isFlying||props.isCrashed)}>
          <circle cx={geometry().point(props.cashoutPoint).x} cy={geometry().point(props.cashoutPoint).y} r='5' fill='#00efac'/>
        </Show>
        </Show>
      </svg>
      <div class='graph-header'>
        <button class='expand' aria-label='Toggle fullscreen' onClick={()=>document.fullscreenElement?document.exitFullscreen?.():container.requestFullscreen?.()}><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 3h7v7M21 3l-8 8M3 14v7h7M3 21l8-8'/></svg></button>
        <span>Max Payout <img src='/assets/icons/coin.svg' width='13' height='13' alt=''/>{(Number(props.maxPayout||0)/1000).toFixed(2)}K</span>
      </div>
      <Show when={waiting()}>
        <div class='launch-countdown'>
          <svg class='launch-rocket' viewBox='-80 -70 160 175' aria-hidden='true'><g transform='rotate(-90)'><CrashRocket/></g></svg>
          <strong>{(Math.max(0,props.countdown||0)/1000).toFixed(2)}s</strong>
          <span>Getting ready to launch</span>
        </div>
      </Show>
      <Show when={!waiting()}>
      <div class='graph-summary'>
        <strong classList={{crashed:props.isCrashed}}>{`${Number(props.multiplier||1).toFixed(2)}x`}</strong>
        <span>{props.isCrashed?'Crashed':'Current Payout'}</span>
        <Show when={props.cashoutPoint}><span class='cashout'>Cashed out {Number(props.cashoutPoint).toFixed(2)}x &middot; +{Number(props.cashoutWinnings||0).toFixed(2)}</span></Show>
      </div>
      </Show>
    </div>
    <style jsx>{`
      .crash-graph { position:relative; min-width:0; height:100%; min-height:440px; overflow:hidden; border:4px solid #171c21; border-radius:7px; background:#001018; }
      .flight-chart { width:100%; height:100%; position:absolute; inset:0; } .flight-chart text { fill:#8c999e; font-size:10px; font-family:inherit; } .flight-chart .current-tick { fill:#fff; font-weight:700; }
      .graph-header { position:absolute; top:16px; left:18px; right:12px; display:flex; align-items:center; flex-wrap:wrap; gap:12px; color:#91999d; font-size:12px; }
      .graph-header span { display:flex; align-items:center; gap:4px; } .expand { background:none; border:1px solid #707b82; color:#a1a9af; border-radius:3px; width:20px; height:20px; cursor:pointer; }
      .graph-summary { position:absolute; top:15%; left:30%; transform:translateX(-50%); display:flex; align-items:center; flex-direction:column; pointer-events:none; white-space:nowrap; }
      .graph-summary strong { color:#fff; font-size:clamp(42px,5vw,80px); line-height:1.05; font-weight:600; font-variant-numeric:tabular-nums; }
      .graph-summary span { color:#89959a; font-size:12px; } .graph-summary .crashed { color:#f06058; } .graph-summary .cashout { margin-top:12px; color:#00ed95; }
      .launch-countdown { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
      .launch-rocket { width:160px; height:175px; overflow:visible; }
      .launch-rocket { animation:crash-hover 3s ease-in-out infinite; }
      .star-drift { animation:crash-star-drift var(--drift-time) linear var(--star-delay) infinite; }
      .star { animation:crash-twinkle var(--twinkle-time) ease-in-out var(--star-delay) infinite alternate; }
      .ended .star-drift { animation-play-state:paused; }
      @keyframes crash-star-drift { 0% { transform:translate(30px,-18px); opacity:0; } 15%,85% { opacity:1; } 100% { transform:translate(-60px,36px); opacity:0; } }
      @keyframes crash-twinkle { from { opacity:.12; } to { opacity:.6; } }
      @keyframes crash-hover { 0%,100% { transform:translateY(2px); } 50% { transform:translateY(-3px); } }
      @media(prefers-reduced-motion:reduce) { .star-drift,.star,.launch-rocket { animation:none; } .star { opacity:.3; } }
      .launch-countdown strong { margin-top:-6px; color:#f8fcff; font-size:30px; line-height:1.3; font-weight:700; font-variant-numeric:tabular-nums; }
      .launch-countdown span { margin-top:5px; color:#89959a; font-size:12px; font-weight:600; }
      .crash-graph:fullscreen { width:100vw; height:100vh; }
      @media(max-width:700px) { .crash-graph { min-height:350px; } .graph-summary { top:16%; left:32%; } .graph-header { gap:8px; left:12px; font-size:10px; } }
    `}</style>
  </>;
}
