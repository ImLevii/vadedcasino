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

    function getRarity(price) {
        if (price >= 250000) {
            return '#FFB84A' // Gold/Covert
        } else if (price >= 50000) {
            return '#FF5141' // Red/Classified
        } else if (price >= 10000) {
            return '#DC5FDE' // Pink/Restricted
        } else if (price >= 1000) {
            return '#4176FF' // Blue/Mil-Spec
        }
        return '#A9B5D2' // Gray/Consumer
    }

    function getExterior(name) {
        if (!name) return null
        const n = name.toLowerCase()
        if (n.includes('factory new') || n.includes('fn)')) return 'FN'
        if (n.includes('minimal wear') || n.includes('mw)')) return 'MW'
        if (n.includes('field-tested') || n.includes('field tested') || n.includes('ft)')) return 'FT'
        if (n.includes('well-worn') || n.includes('well worn') || n.includes('ww)')) return 'WW'
        if (n.includes('battle-scarred') || n.includes('battle scarred') || n.includes('bs)')) return 'BS'
        if (n.includes('souvenir')) return 'SV'
        if (n.includes('stattrak') || n.includes('stat trak')) return 'ST'
        return null
    }

    function getExteriorColor(ext) {
        if (ext === 'FN') return '#4DFFA0'
        if (ext === 'MW') return '#7AB8FF'
        if (ext === 'FT') return '#B8D4FF'
        if (ext === 'WW') return '#FF9E7A'
        if (ext === 'BS') return '#FF6B6B'
        if (ext === 'SV') return '#FFD87A'
        if (ext === 'ST') return '#FF9224'
        return '#8b92a0'
    }

    return (
        <>
            <div class={'case-item-container ' + (props.index === 50 ? 'winning-item' : '')} style={{ '--rarity': getRarity(props?.price) }}>
                <div class='item-top-badges'>
                    {getExterior(props.name) && (
                        <span class='ext-badge' style={{ color: getExteriorColor(getExterior(props.name)) }}>
                            {getExterior(props.name)}
                        </span>
                    )}
                </div>
                <img class='item-image' src={resolveImageSrc(props.img, '/assets/logo/cosmic-luck-logo.png')} height='80' alt='' draggable={false} onError={useImageFallback}/>
                <div class='item-details'>
                    <span class='item-name'>{props.name || 'Mystery reward'}</span>
                    <span class='item-price'>
                        <img src='/assets/chips/chip-green.png' alt='' height='10' width='10'/>
                        {formatPrice(props.price)}
                    </span>
                </div>
                <div class='rarity-underline'/>
            </div>

            <style jsx>{`
              .case-item-container {
                height: 78px;
                width: 82px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                isolation: isolate;
                background: #0d1116;
                border-radius: 3px;
                border: 1px solid rgba(255,255,255,0.06);
                padding: 3px;
                box-sizing: border-box;
              }

              .winning-item {
                border-color: color-mix(in srgb, var(--rarity, #A9B5D2) 40%, transparent);
                box-shadow: inset 0 -1px 0 var(--rarity, #A9B5D2);
              }

              .item-image {
                position: relative;
                user-select: none;
                z-index: 1;
                width: 68px;
                height: 47px;
                object-fit: contain;
                opacity: .95;
                filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                margin-bottom: 1px;
              }

              .item-top-badges {
                position: absolute;
                top: 3px;
                left: 4px;
                z-index: 3;
                display: flex;
                align-items: center;
                gap: 3px;
              }

              .ext-badge {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 5px;
                font-weight: 800;
                letter-spacing: 0.3px;
                line-height: 1;
                text-shadow: 0 0 4px currentColor;
              }

              .item-details {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                width: 100%;
                padding: 0 4px;
                z-index: 2;
              }

              .item-name {
                font-family: "Geogrotesque", sans-serif;
                font-size: 6px;
                font-weight: 600;
                color: #c7d0df;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
                line-height: 1.2;
              }

              .item-price {
                display: flex;
                align-items: center;
                gap: 3px;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 7px;
                font-weight: 700;
                color: #1fd65f;
              }

              .rarity-underline {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, var(--rarity, #A9B5D2) 50%, transparent 100%);
                opacity: 0.7;
              }

              @media only screen and (max-width: 620px) {
                .case-item-container {
                  width: 82px;
                  height: 78px;
                }

                .item-image {
                  width: 68px;
                  height: 47px;
                }
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
