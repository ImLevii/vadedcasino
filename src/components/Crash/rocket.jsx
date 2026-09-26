import {createUniqueId, For} from 'solid-js';

export default function CrashRocket(props) {
  const id = createUniqueId();
  return <g class='crash-ship' classList={{'engine-off': props.stopped}}>
    <defs>
      <linearGradient id={`${id}-hull`} x1='0' y1='0' x2='0' y2='1'>
        <stop stop-color='#74818c'/><stop offset='.22' stop-color='#fff'/><stop offset='.5' stop-color='#f6f8fa'/><stop offset='.8' stop-color='#bdc7d0'/><stop offset='1' stop-color='#53606b'/>
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1='0' x2='1'>
        <stop stop-color='#131e29'/><stop offset='.6' stop-color='#526777'/><stop offset='1' stop-color='#a7bac6'/>
      </linearGradient>
      <linearGradient id={`${id}-flame`}>
        <stop stop-color='#00efbe' stop-opacity='0'/><stop offset='.6' stop-color='#00efbe'/><stop offset='1' stop-color='#d8fff6'/>
      </linearGradient>
      <filter id={`${id}-glow`} x='-100%' y='-100%' width='300%' height='300%'><feGaussianBlur stdDeviation='3'/></filter>
    </defs>
    <g class='engine'>
      <path d='M-38-7 C-53-12-56-3-65-7 C-64 0-82-4-94 0 C-81 5-70 0-66 7 C-57 2-52 13-38 7Z' fill='#00edbb' filter={`url(#${id}-glow)`}/>
      <g class='flame'>
        <path d='M-39-6 C-53-11-52-1-63-5 C-61 1-78-3-86 0 C-76 4-68 0-63 5 C-52 1-54 11-39 6Z' fill={`url(#${id}-flame)`}/>
        <path d='M-39-3 Q-61 0-69 0 Q-55 5-39 3Z' fill='#b5fff0'/>
      </g>
      <path d='M-39-25-79-25 M-39 25-72 25' stroke='#5be9d5' stroke-width='.5' opacity='.25'/>
      <For each={[-4,2,5,-1,3]}>{(y,index)=><circle class='exhaust-particle' cx='-47' cy={y} r={index()%2?1:1.6} fill='#73ffe0' style={{'--particle-delay':`${-index()*.16}s`}}/>}</For>
    </g>
    <g stroke='#38434c' stroke-width='1.7' stroke-linejoin='round'>
      <path d='M-34-10-39-29-30-31 6-18 20-9 M-34 10-39 29-30 31 6 18 20 9' fill={`url(#${id}-hull)`}/>
      <path d='M-34-27-28-27-5-17-24-19Z M-34 27-28 27-5 17-24 19Z' fill='#faffff' stroke-width='.7'/>
      <path d='M-32-25-28-24 M-32 25-28 24' stroke='#00e5a6' stroke-width='3'/>
      <path d='M-42-10-47-7-47 7-42 10-30 8-30-8Z' fill='#28333a'/>
      <path d='M-44-6-44 6' stroke='#64ffe0' stroke-width='2'/>
      <path d='M-37-13 C-18-18 12-20 37-10 Q51-6 56 0 Q51 6 37 10 C12 20-18 18-37 13 Q-42 0-37-13Z' fill={`url(#${id}-hull)`}/>
      <path d='M-28-11 C-8-14 13-14 27-8 L14-4-29-5Z M-28 11 C-8 14 13 14 27 8 L14 4-29 5Z' fill='#fff' stroke='#a7b0b9' stroke-width='.7'/>
      <path d='M12-8 Q26-12 39-6 L46 0 39 6 Q26 12 12 8 L21 0Z' fill={`url(#${id}-glass)`}/>
      <path d='M18-7 Q31-9 39-4' fill='none' stroke='#d5e1e8' stroke-width='1'/>
      <path d='M46-4 Q51-3 54 0 L49 2' fill='none' stroke='#fff' stroke-width='1'/>
      <path d='M-35-4-5-3 15 0-5 3-35 4Z' fill='#eceff2' stroke='#89969f' stroke-width='.8'/>
      <path d='M-28-10-4-10 M-28 10-4 10' stroke='#253c39' stroke-width='4' stroke-linecap='round'/>
      <path d='M-27-10-5-10 M-27 10-5 10' stroke='#00df9b' stroke-width='2' stroke-linecap='round'/>
      <path d='M-34-10-34-6 M-34 10-34 6' stroke='#697883' stroke-width='2'/>
    </g>
    <style jsx>{`
      .engine { opacity:1; } .engine-off .engine { opacity:0; }
      .exhaust-particle { animation:crash-exhaust .85s linear var(--particle-delay) infinite; }
      .engine-off .exhaust-particle,.engine-off .flame { animation-play-state:paused; }
      @keyframes crash-exhaust { 0% { transform:translateX(0); opacity:0; } 15% { opacity:.9; } 100% { transform:translateX(-48px); opacity:0; } }
      .flame { transform-box:fill-box; transform-origin:right center; animation:crash-engine-pulse .18s ease-in-out infinite alternate; }
      @keyframes crash-engine-pulse { from { transform:scaleX(.88) scaleY(.94); opacity:.8; } to { transform:scaleX(1.08) scaleY(1.06); opacity:1; } }
      @media(prefers-reduced-motion:reduce) { .flame,.exhaust-particle { animation:none; } .exhaust-particle { opacity:0; } }
    `}</style>
  </g>;
}
