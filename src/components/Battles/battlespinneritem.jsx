import {resolveImageSrc} from "../../util/image";

function BattleSpinnerItem(props) {

    function useImageFallback(event) {
        event.currentTarget.onerror = null
        event.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
        event.currentTarget.classList.add('fallback')
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
            <div class={'case-item-container ' + (props.index === 50 ? 'winning-item' : '')} style={{ '--rarity': getRarity(props?.price) }}>
                <div class='card-bg'/>
                <img class='item-image' src={resolveImageSrc(props.img, '/assets/logo/cosmic-luck-logo.png')} height='100' alt='' draggable={false} onError={useImageFallback}/>
                <img class='back-img' src={backImage(props?.price)} height='70' alt=''/>
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

              .item-image {
                position: relative;
                user-select: none;
                                z-index: 1;
                                width: 104px;
                                height: 92px;
                                object-fit: contain;
                                opacity: .72;
                                transform: scale(.88);
                                filter: drop-shadow(0 9px 13px rgba(0,0,0,0.58));
              }

              .back-img {
                position: absolute;
                z-index: -1;
                                opacity: 0.18;
                                filter: drop-shadow(0 8px 14px rgba(0,0,0,0.4));
                            }

                            .winning-item .item-image {
                                opacity: 1;
                                transform: scale(1.04);
                            }

                            .winning-item .card-bg {
                                opacity: 1;
                                box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 24px -5px var(--rarity, #A9B5D2);
                            }

                            .item-image.fallback {
                                width: 42px;
                                height: 42px;
                                opacity: .3;
                                filter: grayscale(1);
              }
            `}</style>
        </>
    );
}

export default BattleSpinnerItem;
