import {createEffect, createSignal} from "solid-js";
import {numberToColor} from "../../util/roulettehelpers";

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
            { filter: 'grayscale(0%)', offset: 1}
        ], {
            iterations: 1,
            duration: 2000,
            delay: props.config?.rollTime
        })
    }

    return (
        <>
            <div ref={icon} class={'spinner-icon ' + (type()) + ' ' + (props.size || 'large')}></div>

            <style jsx>{`
              .spinner-icon {
                border-radius: 8px;
                
                display: flex;
                align-items: center;
                justify-content: center;

                background-size: 36px 64px !important;
              }
              
              .small {
                min-width: 35px;
                width: 35px;
                height: 40px;
                border-radius: 6px;
                background-size: 16px 30px !important;
              }
              
              .large {
                min-width: 80px;
                width: 80px;
                height: 100px;
              }
              
              .gold {
                background-color: rgba(245, 166, 35, 0.12);
                background-image: url("/assets/icons/roulette-gold.svg");
                background-position: center;
                background-repeat: no-repeat;
                border: 1px solid rgba(245, 166, 35, 0.55);
                box-shadow: inset 0 0 18px rgba(245, 166, 35, 0.22);
              }
              
              .red {
                background-color: rgba(232, 69, 95, 0.12);
                background-image: url("/assets/icons/roulette-red.svg");
                background-position: center;
                background-repeat: no-repeat;
                border: 1px solid rgba(232, 69, 95, 0.5);
                box-shadow: inset 0 0 18px rgba(232, 69, 95, 0.18);
              }
              
              .green {
                background-color: rgba(31, 214, 95, 0.12);
                background-image: url("/assets/icons/roulette-green.svg");
                background-position: center;
                background-repeat: no-repeat;
                border: 1px solid rgba(31, 214, 95, 0.5);
                box-shadow: inset 0 0 18px rgba(31, 214, 95, 0.18);
              }
              
              .index {
                color: white;
                position: absolute;
                top: 5px;
                left: 5px;
                font-weight: 800;
              }
            `}</style>
        </>
    );
}

export default RouletteIcon;
