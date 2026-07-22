import {createEffect} from "solid-js";
import {resolveImageSrc} from "../../util/image";

function SpinnerItem(props) {

    let item
    let image
    let scaleAnim
    let opacityAnim
    let swords
    const spinEasing = 'cubic-bezier(.08,.78,.16,1)'

    createEffect(() => {
        if (props?.spinning === 'spinning') {
            requestAnimationFrame(() => animate())
        }

        if (props?.spinning === '') {
            resetAnimations()
        }
    })

    function resetAnimations() {
        if (scaleAnim) scaleAnim.cancel()
        if (opacityAnim) opacityAnim.cancel()
        scaleAnim = null
        opacityAnim = null
        if (image) image.style.transform = ''
        if (item) item.style.opacity = ''
        if (swords) swords.style.opacity = ''
    }

    function animate() {
        const lastIndex = 50
        const startIndex = 6

        if (props?.index < startIndex || props?.index > lastIndex) return

        const width = 134 // 130px item + 4px gap
        const firstItem = startIndex * width
        const lastItem = (lastIndex - startIndex + 1) * width // 46 because we start at 5, 51 - 5 is 46

        let indexPx = props?.index * width
        let firstItemEnd = firstItem - width

        let startOffset = Math.min(1, (indexPx - firstItem) / (lastItem + props?.offset))
        let endOffset = props?.index === lastIndex ? 1 : Math.min(1, (indexPx - firstItemEnd) / (lastItem + props?.offset))
        let midPoint = startOffset + (endOffset - startOffset)
        let endScale = props.index === lastIndex ? 1.2 : 1

        if (scaleAnim) scaleAnim.cancel()
        if (opacityAnim) opacityAnim.cancel()
        swords?.getAnimations()?.forEach(animation => animation.cancel())

        let config = {
            duration: props?.spinTime || 4800,
            easing: spinEasing,
            fill: 'forwards',
        }

        // Spinner tick SFX is handled once at the reel level to avoid stacked sounds.

        scaleAnim = image.animate(
            {
                transform: ['scale(1)', 'scale(1)', 'scale(1.2)', `scale(${endScale})`],
                offset: [0, startOffset, midPoint, endOffset]
            },
            config
        )

        // Basically making it so the opacity is instant compared to the scale effect
        opacityAnim = item.animate(
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

    function rarityColor(price) {
        if (price >= 250000) return '#FFD700'
        if (price >= 50000)  return '#FF5141'
        if (price >= 10000)  return '#DC5FDE'
        if (price >= 1000)   return '#4176FF'
        return '#A9B5D2'
    }

    function formattedPrice(price) {
        return Number(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
            <div class={'case-item-container' + (props?.vertical ? ' vertical' : '')} ref={item} style={{ '--rarity': rarityColor(props?.price) }}>
                <div class='card-bg'/>
                <img ref={image} class='item-image' src={resolveImageSrc(props.img)} height='90' alt='' draggable={false}/>
                {props?.spinning === 'win' && props?.index === 50 ? (
                    <div class='item-meta'>
                        {getExterior(props?.name) ? (
                            <span class='item-exterior' style={{ color: getExteriorColor(getExterior(props?.name)) }}>{getExterior(props?.name)}</span>
                        ) : null}
                        <p class='item-name'>{props?.name}</p>
                        <div class='item-price'>
                            <img src='/assets/icons/coin.svg' height='11' alt=''/>
                            <span>{formattedPrice(props?.price)}</span>
                        </div>
                    </div>
                ) : null}
                <img class='back-img' src={backImage(props?.price)} height='60' alt='' ref={swords}/>
            </div>

            <style jsx>{`
              .case-item-container {
                height: 100%;
                
                min-width: 130px;
                width: 130px;
                
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                
                                opacity: 0.46;
                transition: opacity var(--transition-smooth);
              }

              .case-item-container.vertical {
                height: 130px;
                min-height: 130px;
                width: 100%;
                min-width: 0;
                flex-shrink: 0;
              }

              .card-bg {
                position: absolute;
                inset: 6px 4px;
                border-radius: 8px;
                background:
                                    radial-gradient(78% 58% at 50% 100%, color-mix(in srgb, var(--rarity, #A9B5D2) 20%, transparent), transparent 72%),
                                    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012));
                border: 1px solid rgba(255,255,255,0.07);
                border-bottom: 2px solid var(--rarity, #A9B5D2);
                box-shadow:
                  inset 0 1px 0 rgba(255,255,255,0.06),
                                    0 0 18px -6px var(--rarity, #A9B5D2),
                                    0 8px 16px rgba(0,0,0,0.2);
                opacity: 0.72;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                transition: all var(--transition-smooth);
              }
              
              .item-image {
                position: relative;
                user-select: none;
                z-index: 1;
                filter: drop-shadow(0 8px 14px rgba(0,0,0,0.62));
                transition: transform var(--transition-smooth);
              }

                            .case-item-container.vertical .item-image {
                                width: min(90px, calc(100% - 12px));
                                height: auto;
                                max-height: 90px;
                                object-fit: contain;
                            }

              .winning-item .card-bg {
                opacity: 1;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px -4px var(--rarity, #A9B5D2);
              }

                            .item-meta {
                                position: absolute;
                                left: 10px;
                                right: 10px;
                                bottom: 13px;
                                z-index: 2;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                gap: 5px;
                                pointer-events: none;
                                animation: itemMetaIn .18s ease-out both;
                                                padding-top: 6px;
                                                border-top: 1px solid rgba(255,255,255,0.06);
                            }

                            .item-name {
                                width: 100%;
                                margin: 0;
                                color: #f0f4fb;
                                font-size: 9px;
                                line-height: 1.1;
                                font-weight: 900;
                                text-align: center;
                                display: -webkit-box;
                                -webkit-line-clamp: 2;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                                text-shadow: 0 1px 8px rgba(0,0,0,0.9);
                            }

                            .item-exterior {
                                font-size: 8px;
                                font-weight: 900;
                                letter-spacing: .4px;
                                text-transform: uppercase;
                                text-shadow: 0 1px 8px rgba(0,0,0,0.9);
                            }

                            .item-price {
                                height: 18px;
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                padding: 0 7px;
                                border-radius: 4px;
                                background: rgba(10, 24, 18, 0.96);
                                border: 1px solid rgba(31, 214, 95, 0.2);
                                color: #b7ffd1;
                                font-size: 10px;
                                line-height: 1;
                                font-weight: 900;
                                box-shadow: 0 0 14px rgba(31, 214, 95, 0.13), inset 0 1px 0 rgba(255,255,255,0.05);
                            }

                            @keyframes itemMetaIn {
                                from { opacity: 0; transform: translateY(4px); }
                                to { opacity: 1; transform: translateY(0); }
                            }

              .back-img {
                position: absolute;
                z-index: 0;
                opacity: 0.15;
              }
            `}</style>
        </>
    );
}

export default SpinnerItem;
