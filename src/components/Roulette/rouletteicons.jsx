import {createEffect, createSignal} from "solid-js";
import {numberToColor} from "../../util/roulettehelpers";

const CHIP_COLORS = {
  green: { primary: '#1fd65f', secondary: '#18c255', dark: '#061a0e', rim: '#45e57f' },
  red: { primary: '#e8455f', secondary: '#c73550', dark: '#1a0609', rim: '#ff7089' },
  gold: { primary: '#f5a623', secondary: '#d4851a', dark: '#1a1006', rim: '#ffc84a' }
}

const EDGE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

function PokerChip(props) {
  const c = CHIP_COLORS[props.color] || CHIP_COLORS.green
  const size = props.size === 'small' ? 36 : 64

  return (
    <svg viewBox="0 0 60 60" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={`glow-${props.color}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id={`bg-${props.color}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={c.secondary} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c.dark} stopOpacity="1" />
        </radialGradient>
      </defs>

      <circle cx="30" cy="30" r="28" fill={`url(#bg-${props.color})`} stroke={c.primary} strokeWidth="1.5" />

      {EDGE_ANGLES.map((angle, i) => (
        <rect
          x="26.5"
          y="1.5"
          width="7"
          height="5"
          rx="1.5"
          fill={i % 2 === 0 ? c.rim : c.primary}
          fillOpacity={i % 2 === 0 ? '0.9' : '0.5'}
          transform={`rotate(${angle} 30 30)`}
        />
      ))}

      <circle cx="30" cy="30" r="22" fill="none" stroke={c.primary} strokeWidth="1" strokeOpacity="0.35" />
      <circle cx="30" cy="30" r="20" fill={c.dark} fillOpacity="0.85" />
      <circle cx="30" cy="30" r="17" fill="none" stroke={c.primary} strokeWidth="0.75" strokeOpacity="0.3" />

      <text
        x="30"
        y="34.5"
        textAnchor="middle"
        fill={c.primary}
        fontSize={props.size === 'small' ? '12' : '16'}
        fontWeight="700"
        fontFamily="serif"
        filter={`url(#glow-${props.color})`}
        style={{ letterSpacing: 0 }}
      >
        ✦
      </text>

      <ellipse cx="26" cy="18" rx="8" ry="4" fill="white" fillOpacity="0.07" />
    </svg>
  )
}

function RouletteIcon(props) {
  let icon
  const [type, setType] = createSignal('green')

  createEffect(() => setType(numberToColor(props.num)))

  createEffect(() => {
    if (typeof props.roll?.result === 'number') {
      rollSpinner(props.roll?.result)
    }
  })

  function rollSpinner(number) {
    if (number === props.num) return

    icon.animate([
      { filter: 'grayscale(0%)', offset: 0 },
      { filter: 'grayscale(100%)', offset: 0.05 },
      { filter: 'grayscale(100%)', offset: 0.9 },
      { filter: 'grayscale(0%)', offset: 0.95 },
      { filter: 'grayscale(0%)', offset: 1 }
    ], {
      iterations: 1,
      duration: 2000,
      delay: props.config?.rollTime
    })
  }

  return (
    <>
      <div ref={icon} class={'spinner-icon ' + type() + ' ' + (props.size || 'large')}>
        <PokerChip color={type()} size={props.size || 'large'} />
      </div>

      <style jsx>{`
        .spinner-icon {
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        }

        .small {
        min-width: 35px;
        width: 35px;
        height: 40px;
        border-radius: 6px;
        }

        .large {
        min-width: 80px;
        width: 80px;
        height: 100px;
        }

        .gold {
        background: rgba(245, 166, 35, 0.08);
        border: 1px solid rgba(245, 166, 35, 0.3);
        box-shadow: 0 0 18px rgba(245, 166, 35, 0.12);
        }

        .red {
        background: rgba(232, 69, 95, 0.08);
        border: 1px solid rgba(232, 69, 95, 0.3);
        box-shadow: 0 0 18px rgba(232, 69, 95, 0.12);
        }

        .green {
        background: rgba(31, 214, 95, 0.08);
        border: 1px solid rgba(31, 214, 95, 0.3);
        box-shadow: 0 0 18px rgba(31, 214, 95, 0.12);
        }
      `}</style>
    </>
  )
}

export default RouletteIcon;
