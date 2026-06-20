import {createEffect, onCleanup} from "solid-js";
import {findTimeForOffset} from "../../util/cases";
import {resolveImageSrc} from "../../util/image";

function BattleSpinnerItem(props) {

    let item
    let start
    let swords

    function playSound(timeStamp, delay, index) {
        if (!start) { start = timeStamp }
        let elapsed = timeStamp - start

        if (elapsed > delay) {
            start = null
            let tick = new Audio('/assets/sfx/casetick.wav')
            tick.play()
            return
        }
        window.requestAnimationFrame((ts) => playSound(ts, delay, index))
    }

    createEffect(() => {
        if (props?.state === 'ROLLING' && props?.round) {
            animate()
        }
    })

    function animate() {
        const lastIndex = 50
        const startIndex = 5
        let offset = props?.offset || 0

        if (props?.index < startIndex || props?.index > lastIndex) return

        const width = 100
        const firstItem = startIndex * width
        const lastItem = (lastIndex - startIndex + 1) * width // 46 because we start at 5, 51 - 5 is 46

        let indexPx = props?.index * width
        let firstItemEnd = firstItem - width

        let startOffset = Math.min(1, (indexPx - firstItem) / (lastItem + offset))
        let endOffset = props?.index === lastIndex ? 1 : Math.min(1, (indexPx - firstItemEnd) / (lastItem + offset))
        let midPoint = startOffset + (endOffset - startOffset)
        let endScale = props?.index === lastIndex ? 1.2 : 0.7

        item.getAnimations().forEach((anim) => {
            anim.pause()
            anim.cancel()
        })

        let config = {
            duration: 5000,
            easing: 'cubic-bezier(.05,.85,.3,1)',
            fill: 'forwards',
        }

        if (props?.position === 1 && props?.index >= startIndex + 10) {
            let delay = findTimeForOffset(startOffset, ...[0.05, 0.85, 0.3, 1]) * config.duration
            requestAnimationFrame((ts) => playSound(ts, delay, props?.index))
        }

        item.animate(
            {
                transform: ['scale(0.7)', 'scale(0.7)', 'scale(1.2)', `scale(${endScale})`, `scale(${endScale})`],
                offset: [0, startOffset, midPoint, endOffset, 1]
            },
            config
        )

        item.animate(
            {
                opacity: [0.3, 0.3, 1, 1, 1, endScale > 1 ? 1 : 0.3],
                offset: [0, Math.max(0, startOffset - 0.001), startOffset, midPoint, endOffset, Math.min(endOffset + 0.001, 1)]
            },
            config
        )

        swords.animate(
          {
              opacity: [0.3, 0.3, 0.55, 0.55, 0.55, endScale > 1 ? 0.55 : 0.3],
              offset: [0, Math.max(0, startOffset - 0.001), startOffset, midPoint, endOffset, Math.min(endOffset + 0.001, 1)]
          },
          config
        )
    }

    function backImage(price) {
        if (price >= 250000) {
            return '/assets/icons/rarity-gold.svg' // Gold
        } else if (price >= 50000) {
            return '/assets/icons/rarity-red.svg' // Red
        } else if (price >= 10000) {
            return '/assets/icons/rarity-pink.svg' // Pink
        } else if (price >= 1000) {
            return '/assets/icons/rarity-blue.svg'
        }
        return '/assets/icons/rarity-gray.svg' // Gray
    }

    function getRarity(price) {
        if (price >= 250000) {
            return '#FF9900' // Gold
        } else if (price >= 50000) {
            return '#FF5141' // Red
        } else if (price >= 10000) {
            return '#DC5FDE' // Pink
        } else if (price >= 1000) {
            return '#4176FF'
        }
        return '#A9B5D2' // Gray
    }

    return (
        <>
            <div class='case-item-container' style={{ '--rarity': getRarity(props?.price) }}>
                <div class='card-bg'/>
                <img class='item-image' src={resolveImageSrc(props.img)} height='100' alt='' draggable={false} ref={item}/>
                <img class='back-img' src={backImage(props?.price)} height='70' alt='' ref={swords}/>
            </div>

            <style jsx>{`
              .case-item-container {
                                height: 110px;
                                width: 120px;

                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                                isolation: isolate;
              }

                            .card-bg {
                                position: absolute;
                                inset: 5px 8px;
                                z-index: -1;
                                border-radius: 8px;
                                background: radial-gradient(80% 64% at 50% 50%, color-mix(in srgb, var(--rarity, #A9B5D2) 16%, transparent), transparent 72%), linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.016));
                                border: 1px solid rgba(255,255,255,0.065);
                                border-bottom: 2px solid var(--rarity, #A9B5D2);
                                box-shadow: inset 0 1px 0 rgba(255,255,255,0.038), 0 0 18px -7px var(--rarity, #A9B5D2);
                                opacity: 0.76;
                            }

              .index {
                position: absolute;
                color: white;
                font-weight: 700;
                z-index: 2;
              }

              .item-image {
                position: relative;
                user-select: none;
                scale: 0.7;
                opacity: 0.3;
                                z-index: 1;
                                width: 104px;
                                height: 92px;
                                object-fit: contain;
                                filter: drop-shadow(0 9px 13px rgba(0,0,0,0.58));
              }

              .back-img {
                position: absolute;
                z-index: -1;
                                opacity: 0.18;
                                filter: drop-shadow(0 8px 14px rgba(0,0,0,0.4));
              }
            `}</style>
        </>
    );
}

export default BattleSpinnerItem;
