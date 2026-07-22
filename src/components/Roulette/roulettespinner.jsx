import {createEffect, createSignal, For} from "solid-js";
import RouletteIcon from "./rouletteicons";
import RouletteNumbers from "./roulettenumbers";
import {useWebsocket} from "../../contexts/socketprovider";
import IndicatorLine from "../IndicatorLine/indicatorline";

// Keep bait numbers adjacent to green so the spinner visually lands with bait
// slots flanking green on both sides.
const NUMBERS = [1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 0, 8]

function RouletteSpinner(props) {

    let animations = []
    let icons
    let numbers
    let prev = 0

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
                {/* Top marker line — short horizontal green dash above center slot */}
                <IndicatorLine
                  orientation='horizontal'
                  length='10px'
                  thickness='2px'
                  pulse={false}
                  style={{ position: 'absolute', left: '50%', top: '11px', transform: 'translateX(-50%)', 'z-index': 4 }}
                />
                {/* Bottom marker line — short horizontal green dash below center slot */}
                <IndicatorLine
                  orientation='horizontal'
                  length='10px'
                  thickness='2px'
                  pulse={false}
                  style={{ position: 'absolute', left: '50%', bottom: '30px', transform: 'translateX(-50%)', 'z-index': 4 }}
                />
                <div class='fade-left'/>
                <div class='fade-right'/>
                <div class='spinner-container'>
                    <div class='icons' ref={icons}>
                        <For each={[...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS, ...NUMBERS]}>{(num, index) =>
                            <RouletteIcon num={num} roll={props.roll} config={props.config}/>
                        }</For>
                    </div>
                </div>

                <div class='numbers-container'>
                    <div class='numbers' ref={numbers}>
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

                transform: translatex(-1910px);
              }
              
              .numbers {
                height: 100%;
              }


            `}</style>
        </>
    );
}

export default RouletteSpinner;
