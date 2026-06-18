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
        return '#1fd65f'
    }

    return (
        <>
            <div
                class={'case-item-container ' + (props?.grid ? 'grid ' : '') + getRarity(props?.price || 0)}
                style={`--rarity-color: ${getRarityColor(props?.price || 0)};`}
            >
                <div class='item-img-box'>
                    <img class='item-image' src={`${import.meta.env.VITE_SERVER_URL}${props.img}`} height='58' alt='' draggable={false}/>
                </div>

                <div class='item-info'>
                    <p class='name'>{props?.name || 'Unknown Item'}</p>
                    <div class='price'>
                        <img src='/assets/icons/coin.svg' height='12' alt=''/>
                        <span>{props?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                    </div>
                </div>

                <div class='prob-badge'>{(props?.probability || '0.000')}%</div>
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
                border: 1px solid rgba(255,255,255,0.05);
                background: #13161e;

                overflow: hidden;
                transition: border-color .2s;
                cursor: default;
              }

              .case-item-container:hover {
                border-color: var(--rarity-color);
              }

              .case-item-container::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                border-radius: 8px 0 0 8px;
                background: var(--rarity-color);
              }

              .item-img-box {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;

                width: 68px;
                height: 58px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04);
              }

              .item-image {
                object-fit: contain;
                max-width: 60px;
                max-height: 54px;
              }

              .item-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
                flex: 1;
                min-width: 0;
              }

              .name {
                color: #c3cad6;
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
                color: #fff;
              }

              .prob-badge {
                position: absolute;
                bottom: 6px;
                right: 8px;

                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(255,255,255,0.07);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                color: #8b92a0;
              }
            `}</style>
        </>
    );
}

export default CaseItem;
