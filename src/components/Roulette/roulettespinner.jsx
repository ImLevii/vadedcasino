import {createEffect, For, Show, onCleanup} from "solid-js";
import RouletteIcon from "./rouletteicons";
import RouletteNumbers from "./roulettenumbers";

// Keep bait numbers adjacent to green so the spinner visually lands with bait
// slots flanking green on both sides.
const NUMBERS = [1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 0, 8]

function RouletteSpinner(props) {

    let animations = []
    let icons
    let numbers
    let prev = 0
    onCleanup(() => animations.forEach(animation => animation?.cancel()))

    createEffect(() => {
        if (typeof props.roll?.result === 'number') {
            rollSpinner(props.roll?.result)
        }
    })

    function rollSpinner(number) {
        let startOffset = numberToOffset(prev) + 1275
        let resetOffset = numberToOffset(number) + 1275
        let offset = resetOffset + 5100
        let randomOffset = getRandomNumber(-35, 35)

        prev = number

        animations[0]?.cancel()
        animations[1]?.cancel()

        let slide = [
            {transform: `translateX(-${startOffset}px)`, offset: 0, easing: 'cubic-bezier(.14,.15,0,1)'},
            {transform: `translateX(-${offset + randomOffset}px)`, offset: 0.9, easing: 'cubic-bezier(.14,.15,0,1)'},
            {transform: `translateX(-${offset + randomOffset}px)`, offset: 0.95, easing: 'cubic-bezier(.14,.15,0,1)'},
            {transform: `translateX(-${offset}px)`, offset: 1, easing: 'cubic-bezier(.14,.15,0,1)'},
            {transform: `translateX(-${resetOffset}px)`, offset: 1, easing: 'cubic-bezier(.14,.15,0,1)'},
        ]

        animations[0] = icons.animate(slide, {
            iterations: 1,
            duration: props.config?.rollTime,
            fill: 'forwards'
        })

        animations[1] = numbers.animate(slide, {
            iterations: 1,
            duration: props.config?.rollTime,
            fill: 'forwards'
        })
        const elapsed = Math.min(props.config?.rollTime || 5000, props.roll?.elapsedMs || 0)
        for (const animation of animations) animation.currentTime = elapsed
    }

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1) ) + min
    }

    function numberToOffset(num) {
        return (NUMBERS.indexOf(num) * 85) + 40
    }

    return (
        <>
            <div class='spinner-wrapper'>
                <div class='fade-left'/>
                <div class='fade-right'/>
                <div class='spinner-container' classList={{ 'is-waiting': props.timeLeft > 0 }}>
                    <span class='center-marker marker-top' aria-hidden='true'/>
                    <span class='center-marker marker-bottom' aria-hidden='true'/>
                    <div class='icons' ref={icons} style={{ transform: `translateX(-${numberToOffset(0) + 1275}px)` }}>
                        <For each={[...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS]}>{(num, index) =>
                            <RouletteIcon num={num} roll={props.roll} config={props.config}/>
                        }</For>
                    </div>
                    <Show when={props.timeLeft > 0}>
                        <div class='spinner-countdown'>
                            <p>Starting in <strong>{(props.timeLeft / 1000).toFixed(2)}</strong></p>
                            <div class='countdown-track' aria-hidden='true'>
                                <div class='countdown-fill' style={{ transform: `scaleX(${Math.min(1, Math.max(0, props.timeLeft / (props.config?.betTime || 10000)))})` }}/>
                            </div>
                        </div>
                    </Show>
                </div>

                <div class='numbers-container'>
                    <div class='numbers' ref={numbers} style={{ transform: `translateX(-${numberToOffset(0) + 1275}px)` }}>
                        <For each={[...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS]}>{(num, index) =>
                            <RouletteNumbers num={num} roll={props.roll} config={props.config}/>
                        }</For>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .spinner-wrapper {
                width: 100%;
                height: fit-content;
                
                display: flex;
                flex-direction: column;
                
                position: relative;
              }

              .center-marker {
                position: absolute;
                left: 50%;
                width: 10px;
                height: 2px;
                transform: translateX(-50%);
                background: #1fd68b;
                box-shadow: 0 0 6px rgba(31, 214, 139, .3);
                z-index: 4;
                pointer-events: none;
              }

              .marker-top { top: 4px; }
              .marker-bottom { bottom: 4px; }

              .spinner-container.is-waiting .icons { opacity: .35; }

              .spinner-countdown {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: min(260px, 75%);
                z-index: 3;
                pointer-events: none;
                text-align: center;
              }

              .spinner-countdown p {
                margin: 0 0 14px;
                color: #96999f;
                font-size: 15px;
                font-weight: 700;
              }

              .spinner-countdown strong {
                color: #e0e1e4;
                font-variant-numeric: tabular-nums;
              }

              .countdown-track {
                height: 4px;
                background: rgba(31, 214, 139, .12);
                border-radius: 2px;
                overflow: hidden;
              }

              .countdown-fill {
                width: 100%;
                height: 100%;
                background: #1fb980;
                transform-origin: left center;
              }

              /* Side gradient fades */
              .fade-left, .fade-right {
                position: absolute;
                top: 0;
                width: 20%;
                height: 125px;
                z-index: 2;
                pointer-events: none;
              }

              .fade-left {
                left: 0;
                background: linear-gradient(to right, #0c0e13 0%, rgba(12,14,19,0.8) 50%, transparent 100%);
                border-radius: 12px 0 0 0;
              }

              .fade-right {
                right: 0;
                background: linear-gradient(to left, #0c0e13 0%, rgba(12,14,19,0.8) 50%, transparent 100%);
                border-radius: 0 12px 0 0;
              }

              .spinner-container {
                width: 100%;
                height: 125px;

                border-radius: 12px 12px 0 0;
                background:
                  radial-gradient(120% 140% at 50% 0%, rgba(31, 214, 95, 0.1) 0%, rgba(31, 214, 95, 0) 55%),
                  #080a10;
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-bottom: none;
                overflow: hidden;
                
                position: relative;
                box-shadow: 0 8px 40px rgba(0,0,0,0.5);
              }
              
              .numbers-container {
                width: 100%;
                height: 42px;

                border-radius: 0 0 12px 12px;
                background: #0e1016;
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-top: 1px solid rgba(255, 255, 255, 0.04);
                overflow: hidden;

                position: relative;
              }
              
              .spinner-container:before {
                position: absolute;
                width: 100%;
                height: 100%;
                content: '';
                z-index: 1;
                pointer-events: none;
                border-radius: 12px 12px 0 0;
                box-shadow: 80px 0 60px -10px rgba(8, 10, 16, 0.98) inset, -80px 0 60px -10px rgba(8, 10, 16, 0.98) inset;
              }
              
              .icons, .numbers {
                display: flex;
                gap: 5px;
                align-items: center;
                
                width: 100%;
                height: 100%;

                overflow: visible;
                position: absolute;
                left: 50%;

              }
              
              .numbers {
                height: 100%;
              }


            `}</style>
        </>
    );
}

export default RouletteSpinner;
