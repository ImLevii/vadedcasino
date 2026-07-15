import {createEffect, createSignal} from "solid-js";
import {numberToColor} from "../../util/roulettehelpers";

const CHIP_IMAGES = {
  green: '/assets/chips/chip-green.png',
  red: '/assets/chips/chip-red.png',
  black: '/assets/chips/chip-black.png'
}

// Numbers 7 (red) and 8 (black) are the BAIT winning slots — use the
// square-background chip variant so they stand out in the wheel.
const BAIT_NUMBERS = new Set([7, 8])
const BAIT_CHIP_IMAGES = {
  red: '/assets/chips/chip-red-square.png',
  black: '/assets/chips/chip-black-square.png'
}

function PokerChip(props) {
  const size = () => props.size === 'small' ? 30 : 64
  // Evaluated inside JSX so SolidJS tracks props.color reactively
  const isBait = () => props.size !== 'small' && BAIT_NUMBERS.has(props.num)
  const src = () => isBait()
    ? (BAIT_CHIP_IMAGES[props.color] || CHIP_IMAGES[props.color] || CHIP_IMAGES.green)
    : (CHIP_IMAGES[props.color] || CHIP_IMAGES.green)

  return (
    <img
      src={src()}
      width={size()}
      height={size()}
      alt=''
      draggable={false}
      style={{ 'object-fit': 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))' }}
    />
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
        <PokerChip color={type()} size={props.size || 'large'} num={props.num} />
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

        .black {
        background: rgba(139, 146, 160, 0.08);
        border: 1px solid rgba(139, 146, 160, 0.3);
        box-shadow: 0 0 18px rgba(139, 146, 160, 0.12);
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
