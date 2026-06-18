import SpinnerItem from "./spinneritem";
import {createEffect, For} from "solid-js";

function CaseSpinner(props) {

    let spinner

    createEffect(() => {
        if (props?.spinning === 'spinning') {
            animate()
        }
    })

    function animate() {

        const itemsWidth = 130
        const center = (itemsWidth / 2)
        const itemsGap = 4
        const firstItem = 5 * (itemsWidth + itemsGap) + center
        const lastItem = 50 * (itemsWidth + itemsGap) + center

        spinner.animate(
            [
                {transform: `translatex(-${firstItem}px)`, offset: 0, easing: 'cubic-bezier(.05,.85,.3,1)'},
                {transform: `translatex(${-lastItem - props?.offset}px)`, offset: 0.9, easing: 'cubic-bezier(.05,.85,.3,1)'},
                {transform: `translatex(${-lastItem - props?.offset}px)`, offset: 0.95, easing: 'cubic-bezier(.05,.85,.3,1)'},
                {transform: `translatex(-${lastItem}px)`, offset: 1, easing: 'cubic-bezier(.05,.85,.3,1)'}
            ],
            {
                duration: props?.spinTime || 7000,
                fill: 'forwards'
            })
    }

    return (
        <>
            <div class='case-spinner-container'>
                {/* Side fade masks */}
                <div class='fade-left'/>
                <div class='fade-right'/>
                {/* Center indicator */}
                <div class='center-indicator'/>
                <div class='center-line-top'/>
                <div class='center-line-bottom'/>
                <div class='spinner-items' ref={spinner}>
                    <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                  spinning={props?.spinning}
                                                                                  price={item?.price}
                                                                                  index={index()} position={props?.position}/>}</For>
                </div>
            </div>

            <style jsx>{`
              .case-spinner-container {
                flex: 1;
                min-width: 500px;

                min-height: 130px;
                height: 190px;

                border-radius: 10px;
                background: #080a10;
                overflow: hidden;
                position: relative;
                border: 1px solid rgba(255,255,255,0.05);
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

              /* Center column highlight */
              .center-indicator {
                position: absolute;
                left: 50%;
                top: 0;
                transform: translateX(-65px);
                width: 130px;
                height: 100%;
                background: rgba(31, 214, 95, 0.04);
                z-index: 1;
                pointer-events: none;
              }

              /* Top and bottom tick lines */
              .center-line-top, .center-line-bottom {
                position: absolute;
                left: 50%;
                transform: translateX(-65px);
                width: 130px;
                height: 2px;
                background: linear-gradient(to right, transparent, #1fd65f 30%, #1fd65f 70%, transparent);
                z-index: 3;
                pointer-events: none;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.6);
              }

              .center-line-top { top: 0; }
              .center-line-bottom { bottom: 0; }

              .spinner-items {
                width: fit-content;
                height: 100%;

                display: flex;

                gap: 4px;

                position: absolute;
                left: 50%;
                transform: translateX(-870px); /* 5 items * 134px each, centered on item 5 */
              }

              @media only screen and (max-width: 560px) {
                .case-spinner-container {
                  width: 100%;
                  min-width: unset;
                }
              }
            `}</style>
        </>
    );
}

export default CaseSpinner;
