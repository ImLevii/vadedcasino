import {resolveImageSrc} from "../../util/image";

function BattleSpinnerItem(props) {

    function formatPrice(price) {
        return Number(price || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

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
                <div class='item-details'>
                    <span class='item-name'>{props.name || 'Mystery reward'}</span>
                    <span class='item-price'>
                        <img src='/assets/chips/chip-green.png' alt=''/>
                        {formatPrice(props.price)}
                    </span>
                </div>
            </div>

            <style jsx>{`
              .case-item-container {
                                height: 124px;
                                width: 156px;

                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                                isolation: isolate;
              }

                            .card-bg {
                                position: absolute;
                                inset: 3px;
                                z-index: -1;
                                border-radius: 8px;
                                background: radial-gradient(78% 72% at 50% 38%, color-mix(in srgb, var(--rarity, #A9B5D2) 22%, transparent), transparent 74%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.022));
                                border: 1px solid color-mix(in srgb, var(--rarity, #A9B5D2) 28%, rgba(255,255,255,.08));
                                border-bottom: 2px solid var(--rarity, #A9B5D2);
                                box-shadow: inset 0 1px 0 rgba(255,255,255,0.055), 0 8px 20px rgba(0,0,0,.22), 0 0 18px -8px var(--rarity, #A9B5D2);
              }

              .item-image {
                position: relative;
                user-select: none;
                                z-index: 1;
                                width: 118px;
                                height: 82px;
                                margin-bottom: 25px;
                                object-fit: contain;
                                opacity: .96;
                                filter: drop-shadow(0 9px 13px rgba(0,0,0,0.58));
              }

              .back-img {
                position: absolute;
                z-index: -1;
                                top: 17px;
                                opacity: 0.25;
                                filter: drop-shadow(0 8px 14px rgba(0,0,0,0.4));
                            }

                            .item-details {
                                position: absolute;
                                z-index: 2;
                                left: 11px;
                                right: 11px;
                                bottom: 9px;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 7px;
                            }

                            .item-name {
                                min-width: 0;
                                overflow: hidden;
                                color: #dce2e9;
                                font-family: "Geogrotesque Wide", sans-serif;
                                font-size: 8px;
                                font-weight: 700;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            }

                            .item-price {
                                flex: 0 0 auto;
                                display: flex;
                                align-items: center;
                                gap: 3px;
                                color: #fff;
                                font-family: "Geogrotesque Wide", sans-serif;
                                font-size: 8px;
                                font-weight: 700;
                                font-variant-numeric: tabular-nums;
                            }

                            .item-price img {
                                width: 11px;
                                height: 11px;
                                object-fit: contain;
                            }

                            .winning-item .item-image {
                                opacity: 1;
                                transform: scale(1.04);
                            }

                            .winning-item .card-bg {
                                box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.28), 0 0 28px -4px var(--rarity, #A9B5D2);
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
