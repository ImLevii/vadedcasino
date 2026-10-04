import {createUniqueId} from 'solid-js';

export default function CosmicGem(props) {
  const id = createUniqueId();
  const paint = name => `url(#${id}-${name})`;
  const silhouette = 'M80 6Q82 6 84 9L147 69Q151 73 149 79L140 130Q140 134 136 138L84 191Q80 196 76 191L24 137Q21 134 20 129L11 77Q10 72 14 68L76 9Q78 6 80 6Z';
  return <span class={'cosmic-gem ' + (props.motion !== false ? 'animated ' : '') + (props.active ? 'charged' : '')} role='img' aria-label='Cosmic Spin emerald'>
    <span class='gem-aura'/><span class='gem-shadow'/>
    <svg class='crystal' width='24' height='30' viewBox='0 0 160 200' fill='none' aria-hidden='true'>
      <defs>
        <linearGradient id={id + '-crown'} x1='41' y1='79' x2='83' y2='13' gradientUnits='userSpaceOnUse'>
          <stop stop-color='#e5ffc5'/><stop offset='.43' stop-color='#9fff78'/><stop offset='1' stop-color='#30ce54'/>
        </linearGradient>
        <radialGradient id={id + '-heart'} cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(76 99) rotate(104) scale(78 51)'>
          <stop stop-color='#afff72'/><stop offset='.26' stop-color='#60ef26'/><stop offset='.61' stop-color='#19b926'/><stop offset='.87' stop-color='#037c29'/><stop offset='1' stop-color='#8cffa3'/>
        </radialGradient>
        <linearGradient id={id + '-left'} x1='9' y1='73' x2='56' y2='143' gradientUnits='userSpaceOnUse'>
          <stop stop-color='#005323'/><stop offset='.4' stop-color='#00631c'/><stop offset='.8' stop-color='#20c33f'/><stop offset='1' stop-color='#b8ff89'/>
        </linearGradient>
        <linearGradient id={id + '-right'} x1='142' y1='72' x2='116' y2='137' gradientUnits='userSpaceOnUse'>
          <stop stop-color='#003d13'/><stop offset='.45' stop-color='#00751f'/><stop offset='.78' stop-color='#12a63b'/><stop offset='1' stop-color='#5bff81'/>
        </linearGradient>
        <linearGradient id={id + '-edge'} x1='26' y1='17' x2='135' y2='178' gradientUnits='userSpaceOnUse'>
          <stop stop-color='#14a435'/><stop offset='.33' stop-color='#ceffb5'/><stop offset='.54' stop-color='#40a938'/><stop offset='.73' stop-color='#c8ff9d'/><stop offset='1' stop-color='#00601f'/>
        </linearGradient>
        <linearGradient id={id + '-bottom'} x1='76' y1='193' x2='131' y2='127' gradientUnits='userSpaceOnUse'>
          <stop stop-color='#003411'/><stop offset='.6' stop-color='#006822'/><stop offset='1' stop-color='#25bc36'/>
        </linearGradient>
        <linearGradient id={id + '-reflection'} x1='0' x2='1'>
          <stop stop-color='white' stop-opacity='0'/><stop offset='.43' stop-color='#e6ffcc' stop-opacity='.05'/><stop offset='.5' stop-color='#f5ffe9' stop-opacity='.7'/><stop offset='.56' stop-color='#d5ffab' stop-opacity='.12'/><stop offset='1' stop-color='white' stop-opacity='0'/>
        </linearGradient>
        <clipPath id={id + '-outline'}><path d={silhouette}/></clipPath>
        <clipPath id={id + '-front'}><path d='M39 85 98 64 101 139 79 177Z'/></clipPath>
      </defs>
      <path d={silhouette} fill='#004b1b' stroke='#00360d' stroke-width='2'/>
      <path d='M79 8 14 70 34 80Z' fill='#00701a'/>
      <path d='M82 9 145 70 121 72Z' fill='#005616'/>
      <path d='M79 10 38 81 98 62Z' fill={paint('crown')}/>
      <path d='M82 11 101 61 119 72Z' fill='#008328'/>
      <path d='M14 74 34 85 52 141 24 128Z' fill={paint('left')}/>
      <path d='M123 76 146 74 136 127 105 139Z' fill={paint('right')}/>
      <path d='M39 85 98 64 101 139 79 177Z' fill={paint('heart')}/>
      <path d='M25 133 54 148 77 190Z' fill='#005c1b'/>
      <path d='M102 145 137 131 83 189Z' fill={paint('bottom')}/>
      <path d='M39 88 77 187 54 146Z' fill='#064719'/>
      <path d='M119 78 101 144 82 190 105 138Z' fill='#003f17'/>
      <path d='M79 10 36 83 55 146 79 191M82 10 121 74 103 143 81 191M14 72 36 83 99 63 121 74 147 73M23 131 55 146M103 143 138 130' fill='none' stroke={paint('edge')} stroke-width='2.1' stroke-linejoin='round'/>
      <path d='M40 82 98 62 81 10M39 87 78 176M124 78 137 77M26 127 16 79' stroke='#daffbc' stroke-width='.85' stroke-linecap='round' opacity='.85'/>
      <g clip-path={paint('outline')}><path class='reflection reflection-wide' d='M-65 5H-27L30 196H-8Z' fill={paint('reflection')}/></g>
      <g clip-path={paint('front')}><path class='reflection reflection-inner' d='M-40 10H-8L60 190H28Z' fill={paint('reflection')}/></g>
      <path class='edge-glint' d='m32 83 5-1 4 2-4 2Z' fill='#f2ffe6'/>
      <path class='edge-glint glint-lower' d='m51 144 3-5 2 6 5 2-6 1-2 4-1-5-4-1Z' fill='#e5ffc1'/>
    </svg>
    <style jsx>{`
      .cosmic-gem { width:100%; height:100%; min-width:0; min-height:0; display:grid; place-items:center; position:relative; isolation:isolate; perspective:360px; pointer-events:none; }
      .gem-aura { position:absolute; inset:12% 18%; border-radius:50%; opacity:.4; background:radial-gradient(ellipse,rgba(31,214,95,.28),rgba(31,214,95,.06) 47%,transparent 72%); }
      .gem-shadow { position:absolute; bottom:1%; left:30%; width:40%; height:5%; border-radius:50%; background:rgba(0,0,0,.5); filter:blur(3px); }
      .cosmic-gem > .crystal { display:block; width:100%; height:100%; max-width:100%; max-height:100%; position:relative; overflow:hidden; transform-origin:50% 54%; filter:drop-shadow(0 3px 4px rgba(0,0,0,.5)) drop-shadow(0 0 2px rgba(31,214,95,.18)); }
      .reflection { opacity:0; transform:translateX(0); }
      .edge-glint { opacity:.8; } .glint-lower { opacity:.35; }
      .animated .crystal { animation:emerald-sway 7s ease-in-out infinite; }
      .animated .reflection-wide { animation:emerald-reflection 7s ease-in-out infinite; }
      .animated .reflection-inner { animation:emerald-reflection 7s 1s ease-in-out infinite; opacity:.3; }
      .animated .edge-glint { animation:emerald-glint 7s ease-in-out infinite; }
      .charged .crystal { animation:emerald-charge 1.1s cubic-bezier(.2,.65,.3,1) forwards; }
      .charged .gem-aura { animation:emerald-bloom 1.1s ease-out forwards; }
      .charged .reflection-wide { animation:emerald-reveal-light 1.1s ease-in-out forwards; }
      .charged .reflection-inner { animation:emerald-reveal-light 1.1s .12s ease-in-out forwards; }
      .charged .edge-glint { animation:emerald-glint 1.1s ease-in-out forwards; }
      @keyframes emerald-sway { 0%,100% { transform:translateY(1px) rotateY(-10deg) rotateZ(-2deg); } 50% { transform:translateY(-2px) rotateY(12deg) rotateZ(1deg); } }
      @keyframes emerald-reflection { 0%,18% { opacity:0; transform:translateX(0); } 35% { opacity:.7; } 65%,100% { opacity:0; transform:translateX(210px); } }
      @keyframes emerald-reveal-light { 0% { opacity:0; transform:translateX(15px); } 35% { opacity:.9; } 100% { opacity:0; transform:translateX(205px); } }
      @keyframes emerald-charge { 0% { transform:rotateY(-10deg) scale(1); } 55% { transform:translateY(-4px) rotateY(18deg) rotateZ(2deg) scale(1.08); } 100% { transform:translateY(-2px) rotateY(-3deg) scale(1.04); } }
      @keyframes emerald-bloom { 0% { opacity:.25; transform:scale(.8); } 60% { opacity:.9; transform:scale(1.5); } 100% { opacity:.35; transform:scale(1.8); } }
      @keyframes emerald-glint { 0%,100% { opacity:.3; } 40% { opacity:1; } 70% { opacity:.55; } }
      @media(prefers-reduced-motion:reduce) { .cosmic-gem * { animation:none !important; } .charged .gem-aura { opacity:.65; } }
    `}</style>
  </span>;
}
