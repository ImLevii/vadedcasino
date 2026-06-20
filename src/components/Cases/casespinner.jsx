import SpinnerItem from "./spinneritem";
import {createEffect, For} from "solid-js";

function CaseSpinner(props) {

    let spinner
  let spinAnimation
  const itemWidth = 130
  const itemGap = 4
  const itemStep = itemWidth + itemGap
  const itemCenter = itemWidth / 2
  const idleItemIndex = 6
  const idleStart = idleItemIndex * itemStep + itemCenter
  const idleEnd = idleStart + itemStep
  const spinEasing = 'cubic-bezier(.08,.78,.16,1)'

    createEffect(() => {
        if (props?.spinning === 'spinning') {
      requestAnimationFrame(() => animate())
    }

    if (props?.spinning === '') {
      resetTrack()
        }
    })

    function animate() {

      const currentPosition = getCurrentTranslateX()
      const firstItem = Math.abs(currentPosition || -idleStart)
      const lastItem = 50 * itemStep + itemCenter

        spinAnimation?.cancel()
        spinner?.getAnimations()?.forEach(animation => {
          if (animation.animationName !== 'idleCarousel') animation.cancel()
        })
      spinner.style.transform = `translateX(-${firstItem}px)`

        spinAnimation = spinner.animate(
            [
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
      if (!spinner) return -idleStart

      const transform = getComputedStyle(spinner).transform
      if (!transform || transform === 'none') return -idleStart

      const matrix = new DOMMatrixReadOnly(transform)
      return matrix.m41 || -idleStart
    }

    return (
        <>
            <div class={'case-spinner-container ' + (props?.spinning === '' || props?.spinning === 'loading' ? 'idle ' : '') + (props?.layout === 'multi' ? 'multi ' : '') + (props?.sideArrows ? 'side-arrows' : '')}>
                {/* Side fade masks */}
                <div class='fade-left'/>
                <div class='fade-right'/>
                {/* Center indicator */}
              <div class='lane-arrow lane-arrow-top'/>
              <div class='lane-arrow lane-arrow-bottom'/>
                <div class='center-indicator'/>
                <div class='center-line-top'/>
                <div class='center-line-bottom'/>
                <div class={'spinner-items ' + (props?.spinning === '' || props?.spinning === 'loading' ? 'idle-track' : '')} ref={spinner}>
                    <For each={props?.items || []}>{(item, index) => <SpinnerItem spinTime={props?.spinTime} offset={props.offset} img={item.img}
                                                                                  name={item?.name}
                                                                                  spinning={props?.spinning}
                                                                                  price={item?.price}
                                                                                  index={index()} position={props?.position}/>}</For>
                </div>
            </div>

            <style jsx>{`
              .case-spinner-container {
                flex: 1 0 320px;
                min-width: 320px;

                min-height: 130px;
                height: 204px;

                border-radius: 10px;
                background: radial-gradient(72% 115% at 50% 50%, rgba(31, 214, 95, 0.038), rgba(8, 10, 16, 0) 48%), linear-gradient(180deg, #0a0d14, #06080e);
                overflow: hidden;
                position: relative;
                border: 1px solid rgba(255,255,255,0.05);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.025), 0 12px 30px rgba(0, 0, 0, 0.22);
              }

              .case-spinner-container.multi {
                width: 100%;
                min-width: 0;
                flex: unset;
                height: 252px;
                border-radius: 0;
                border-top: 0;
                border-bottom: 0;
                border-left: 1px solid rgba(255, 255, 255, 0.045);
                border-right: 0;
                background: radial-gradient(55% 80% at 50% 50%, rgba(31, 214, 95, 0.045), rgba(31, 214, 95, 0) 54%), linear-gradient(180deg, rgba(12, 16, 23, 0.96), rgba(8, 11, 17, 0.98));
                box-shadow: inset 1px 0 0 rgba(255,255,255,0.018), inset -1px 0 0 rgba(0,0,0,0.24);
              }

              .case-spinner-container.multi:first-child {
                border-left: 0;
              }

              .case-spinner-container.idle {
                border-color: rgba(31, 214, 95, 0.08);
              }

              .lane-arrow {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                z-index: 5;
                pointer-events: none;
                filter: drop-shadow(0 0 7px rgba(31, 214, 95, 0.68));
              }

              .lane-arrow-top {
                top: 7px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 7px solid #1fd65f;
              }

              .lane-arrow-bottom {
                bottom: 7px;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 7px solid #1fd65f;
              }

              .case-spinner-container.multi .lane-arrow-top {
                top: 8px;
                border-left-width: 5px;
                border-right-width: 5px;
                border-top-width: 7px;
              }

              .case-spinner-container.multi .lane-arrow-bottom {
                bottom: 8px;
                border-left-width: 5px;
                border-right-width: 5px;
                border-bottom-width: 7px;
              }

              .case-spinner-container.side-arrows .lane-arrow {
                top: 50%;
                bottom: auto;
                left: auto;
                transform: translateY(-50%);
              }

              .case-spinner-container.side-arrows .lane-arrow-top {
                left: 8px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-left: 7px solid #1fd65f;
                border-right: 0;
              }

              .case-spinner-container.side-arrows .lane-arrow-bottom {
                right: 8px;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-right: 7px solid #1fd65f;
                border-left: 0;
              }

              .case-spinner-container.multi.side-arrows .lane-arrow-top {
                top: 50%;
                left: 7px;
                border-top-width: 5px;
                border-bottom-width: 5px;
                border-left-width: 7px;
                border-right-width: 0;
              }

              .case-spinner-container.multi.side-arrows .lane-arrow-bottom {
                bottom: auto;
                right: 7px;
                border-top-width: 5px;
                border-bottom-width: 5px;
                border-right-width: 7px;
                border-left-width: 0;
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
                background: linear-gradient(90deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.095), rgba(31, 214, 95, 0));
                z-index: 1;
                pointer-events: none;
                box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.08), inset -1px 0 0 rgba(31, 214, 95, 0.08), 0 0 46px rgba(31, 214, 95, 0.12);
                animation: centerGlow 2.8s ease-in-out infinite;
              }

              .case-spinner-container.multi .center-indicator {
                background: linear-gradient(90deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.12), rgba(31, 214, 95, 0));
                box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.12), inset -1px 0 0 rgba(31, 214, 95, 0.12), 0 0 44px rgba(31, 214, 95, 0.14);
              }

              /* Top and bottom tick lines */
              .center-line-top, .center-line-bottom {
                position: absolute;
                left: 50%;
                transform: translateX(-65px);
                width: 130px;
                height: 2px;
                background: linear-gradient(to right, transparent, rgba(31, 214, 95, 0.2) 12%, #1fd65f 38%, #1fd65f 62%, rgba(31, 214, 95, 0.2) 88%, transparent);
                z-index: 3;
                pointer-events: none;
                box-shadow: 0 0 12px rgba(31, 214, 95, 0.72), 0 0 28px rgba(31, 214, 95, 0.24);
              }

              .center-line-top { top: 0; }
              .center-line-bottom { bottom: 0; }

              .case-spinner-container.multi .center-line-top,
              .case-spinner-container.multi .center-line-bottom {
                height: 1px;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.64), 0 0 22px rgba(31, 214, 95, 0.18);
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
              }

              .spinner-items.idle-track {
                animation: idleCarousel 5.75s linear infinite alternate;
              }

              .case-spinner-container:hover .spinner-items.idle-track {
                animation-play-state: paused;
              }

              @keyframes idleCarousel {
                0% { transform: translateX(-${idleStart}px); }
                100% { transform: translateX(-${idleEnd}px); }
              }

              @keyframes centerGlow {
                0%, 100% {
                  opacity: .78;
                  box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.08), inset -1px 0 0 rgba(31, 214, 95, 0.08), 0 0 34px rgba(31, 214, 95, 0.10);
                }
                50% {
                  opacity: 1;
                  box-shadow: inset 1px 0 0 rgba(31, 214, 95, 0.16), inset -1px 0 0 rgba(31, 214, 95, 0.16), 0 0 54px rgba(31, 214, 95, 0.18);
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
