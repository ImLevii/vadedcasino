import {createEffect, onCleanup} from "solid-js";
import {resolveImageSrc} from "../../util/image";
import CosmicGem from './cosmicgem';

function SpinnerItem(props) {

    let item, image, swords;
    let revealAnimation;
    createEffect(() => {
      const phase = props.spinning;
      if (props.index !== 50 || !image) return;
      revealAnimation?.cancel();
      if (phase === 'win' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealAnimation = image.animate([
          {transform:'scale(1)'}, {transform:'scale(1.09)', offset:.55}, {transform:'scale(1.04)'}
        ], {duration:360, easing:'cubic-bezier(.2,.8,.3,1)', fill:'forwards'});
      }
    });
    onCleanup(() => revealAnimation?.cancel());

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
        if (price >= 10000)  return '#40c9ac'
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
            <div class={'case-item-container' + (props?.vertical ? ' vertical' : '') + (props.presentation === 'case' ? ' opening-item' : '') + (props.spinning === 'win' && props.index === 50 ? ' revealed' : '')} ref={item} style={{ '--rarity': rarityColor(props?.price) }}>
                <div class='card-bg'/>
                {props.cosmic ? <div ref={image} class='item-image cosmic-image'><CosmicGem motion={props.spinning === 'cosmic' && props.index === 50} active={props.spinning === 'cosmic' && props.index === 50}/></div>
                  : <img ref={image} class='item-image' src={resolveImageSrc(props.img)} height='90' alt='' draggable={false}/>}
                {props.cosmic && props.spinning === 'cosmic' && props.index === 50 && <span class='cosmic-label'>COSMIC SPIN</span>}
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
                <img class={'back-img ' + (props.cosmic ? 'cosmic-back' : '')} src={props.presentation === 'case' ? '/assets/chips/chip-green-clover.png' : backImage(props?.price)} height='60' alt='' ref={swords}/>
            </div>

            <style jsx>{`
              .case-item-container .cosmic-image, .case-item-container.vertical .cosmic-image { width:58px; height:72px; flex-shrink:0; }
              .case-item-container.opening-item.revealed { opacity:1; }
              .cosmic-label { position:absolute; bottom:7px; color:#b9ffd0; font-size:9px; font-weight:900; letter-spacing:1.3px; text-shadow:0 0 9px #1fd65f; z-index:3; }
              .cosmic-back { visibility:hidden; }
              .case-item-container.opening-item { opacity:.72; }
              .opening-item .card-bg { inset:10px 2px; border:1px solid #090c11; border-radius:4px; background:#101319; box-shadow:none; opacity:1; backdrop-filter:none; }
              .opening-item.vertical .card-bg { inset:0; }
              .opening-item.vertical.revealed .item-image { max-width:74px; height:58px; margin-bottom:46px; }
              .opening-item.vertical .item-meta { bottom:7px; left:6px; right:6px; padding-top:0; border:0; gap:3px; }
              .opening-item .item-image { max-width:100px; object-fit:contain; }
              .opening-item .back-img { width:74px; height:74px; object-fit:contain; opacity:.16; }

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
