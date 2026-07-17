import {resolveImageSrc} from "../../util/image";

function CaseItem(props) {

    function getRarity(price) {
        if (price < 1000) return 'gray'
        if (price < 10000) return 'blue'
        if (price < 50000) return 'pink'
        if (price < 250000) return 'red'
        return 'gold'
    }

    function getRarityColor(price) {
        if (price < 1000) return '#A9B5D2'
        if (price < 10000) return '#4176FF'
        if (price < 50000) return '#DC5FDE'
        if (price < 250000) return '#FF5141'
        return '#FFB84A'
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
            <div
                class={'case-item-container ' + (props?.grid ? 'grid ' : '') + getRarity(props?.price || 0)}
                style={`--rarity-color: ${getRarityColor(props?.price || 0)};`}
            >
                <div class='item-img-box'>
                  <img class='item-image' src={resolveImageSrc(props.img)} height='58' alt='' draggable={false}/>
                </div>

                <div class='item-info'>
                    <div class='item-top-row'>
                        {getExterior(props?.name) && (
                            <span class='ext-tag' style={`color: ${getExteriorColor(getExterior(props?.name))}`}>
                                {getExterior(props?.name)}
                            </span>
                        )}
                    </div>
                    <p class='name'>{props?.name || 'Unknown Item'}</p>
                    <div class='price'>
                        <img src='/assets/icons/coin.svg' height='12' alt=''/>
                        <span>{props?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .case-item-container {
                position: relative;
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 10px;

                width: 100%;
                min-height: 80px;
                padding: 10px 12px;
                box-sizing: border-box;

                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.045);
                background:
                  radial-gradient(120% 80% at 0% 50%, color-mix(in srgb, var(--rarity-color) 8%, transparent), transparent 60%),
                  linear-gradient(160deg, #141720, #0f1219);

                overflow: hidden;
                transition: border-color .18s, box-shadow .18s;
                cursor: default;
              }

              .case-item-container:hover {
                border-color: color-mix(in srgb, var(--rarity-color) 55%, transparent);
                box-shadow: 0 0 16px -4px color-mix(in srgb, var(--rarity-color) 25%, transparent);
              }

              .case-item-container::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                border-radius: 8px 0 0 8px;
                background: linear-gradient(180deg, color-mix(in srgb, var(--rarity-color) 90%, white 10%), var(--rarity-color));
              }

              .item-img-box {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;

                width: 68px;
                height: 58px;
                border-radius: 6px;
                background:
                  radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--rarity-color) 12%, transparent), transparent),
                  rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
              }

              .item-image {
                object-fit: contain;
                max-width: 60px;
                max-height: 54px;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
              }

              .item-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                flex: 1;
                min-width: 0;
              }

              .item-top-row {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 1px;
              }

              .ext-tag {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.5px;
                text-shadow: 0 0 10px currentColor, 0 0 4px currentColor;
              }

              .name {
                color: #d0d7e4;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .price {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #1fd65f;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 700;
              }

              .price span {
                color: #e8edf5;
              }
            `}</style>
        </>
    );
}

export default CaseItem;
