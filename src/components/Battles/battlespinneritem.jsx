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

    function getSkinName(name) {
        if (!name) return 'Mystery reward'
        const cleaned = String(name).replace(/\s*\(.*?\)\s*/g, '').trim()
        const last = cleaned.includes('|') ? cleaned.split('|').pop() : cleaned
        return (last || cleaned).trim()
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
                <div class='rarity-glow'/>
                <img class='item-image' src={resolveImageSrc(props.img, '/assets/logo/cosmic-luck-logo.png')} height='80' alt='' draggable={false} onError={useImageFallback}/>
                <div class='item-details'>
                    {getExterior(props.name) && (
                        <span class='ext-badge' style={{ color: getExteriorColor(getExterior(props.name)) }}>
                            {getExterior(props.name)}
                        </span>
                    )}
                    <span class='item-name'>{getSkinName(props.name)}</span>
                    <span class='item-price'>
                        <img src='/assets/chips/chip-green.png' alt='' height='10' width='10'/>
                        {formatPrice(props.price)}
                    </span>
                </div>
            </div>

            <style jsx>{`
              /* Bare, borderless tile — the item floats on a soft rarity glow.
                 Card chrome and labels are reserved for the winning item. */
              .case-item-container {
                height: 108px;
                width: 108px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                isolation: isolate;
                background: transparent;
                border-radius: 4px;
                border: 1px solid transparent;
                padding: 6px;
                box-sizing: border-box;
              }

              .rarity-glow {
                position: absolute;
                inset: 12%;
                z-index: 0;
                border-radius: 50%;
                background: radial-gradient(circle, color-mix(in srgb, var(--rarity, #A9B5D2) 34%, transparent) 0%, transparent 68%);
                filter: blur(6px);
                pointer-events: none;
              }

              .winning-item {
                background: #0b0f15;
                border-color: rgba(255,255,255,0.07);
                justify-content: flex-start;
                padding: 8px 8px 7px;
              }

              .winning-item .rarity-glow {
                opacity: .55;
              }

              .item-image {
                position: relative;
                user-select: none;
                z-index: 1;
                width: 84px;
                height: 62px;
                object-fit: contain;
                filter: drop-shadow(0 5px 12px rgba(0,0,0,0.55));
              }

              .winning-item .item-image {
                width: 74px;
                height: 44px;
                opacity: .32;
                filter: blur(1px);
              }

              .ext-badge {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 7px;
                font-weight: 800;
                letter-spacing: 0.3px;
                line-height: 1;
                text-transform: uppercase;
              }

              /* Hidden on reel filler items — only the landed item is labelled. */
              .item-details {
                display: none;
              }

              .winning-item .item-details {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 3px;
                width: 100%;
                margin-top: auto;
                z-index: 2;
              }

              .item-name {
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 9px;
                font-weight: 700;
                color: #edf2fb;
                text-align: left;
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
                font-size: 10px;
                font-weight: 700;
                color: #1fd65f;
              }

              @media only screen and (max-width: 620px) {
                .case-item-container {
                  width: 92px;
                  height: 92px;
                }

                .item-image {
                  width: 70px;
                  height: 52px;
                }

                .winning-item .item-image {
                  width: 62px;
                  height: 36px;
                }

                .item-name { font-size: 8px; }
                .item-price { font-size: 9px; }
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
