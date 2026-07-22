import {For} from "solid-js";
import Avatar from "../Level/avatar";
import {resolveImageSrc} from "../../util/image";

function BattleDropHistory(props) {

    function getRoundItem(playerId, round) {
      if (!Array.isArray(props?.wonItems) || !playerId) return null
      return props.wonItems.find(item => item.userId === playerId && item.round === round)
    }

    function roundSlots() {
      return new Array(Math.max(props?.rounds?.length || 0, 1))
    }

    function getRarityColor(price) {
        if (price >= 250000) return '#FFB84A'
        if (price >= 50000) return '#FF5141'
        if (price >= 10000) return '#DC5FDE'
        if (price >= 1000) return '#4176FF'
        return '#A9B5D2'
    }

    function getExterior(name) {
        if (!name) return null
        const n = name.toLowerCase()
        if (n.includes('factory new') || n.includes('fn)')) return 'FN'
        if (n.includes('minimal wear') || n.includes('mw)')) return 'MW'
        if (n.includes('field-tested') || n.includes('ft)')) return 'FT'
        if (n.includes('well-worn') || n.includes('ww)')) return 'WW'
        if (n.includes('battle-scarred') || n.includes('bs)')) return 'BS'
        return null
    }

    function getExteriorColor(ext) {
        if (ext === 'FN') return '#4DFFA0'
        if (ext === 'MW') return '#7AB8FF'
        if (ext === 'FT') return '#B8D4FF'
        if (ext === 'WW') return '#FF9E7A'
        if (ext === 'BS') return '#FF6B6B'
        return '#8b92a0'
    }

    function useImageFallback(e) {
        e.currentTarget.onerror = null
        e.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
    }

    return (
        <>
            <div class='drop-history'>
                <For each={props?.players || []}>{(player) => (
                    <div class='player-column'>
                        <div class='player-header-compact'>
                      <Avatar height='20' id={player?.id || '?'} xp={player?.xp || 0} dark={!player}/>
                      <span class='player-name-compact'>{player?.username || 'Waiting...'}</span>
                        </div>
                        <div class='player-drops'>
                      <For each={roundSlots()}>{(_, roundIndex) => {
                        const item = () => getRoundItem(player?.id, roundIndex() + 1)
                        return (
                          <div class={'drop-card ' + (item() ? 'filled' : 'pending')} style={{ '--rarity': getRarityColor(item()?.price || 0) }}>
                                        <div class='drop-img-wrap'>
                              {item() ? (
                                <>
                                  <img
                                    class='drop-img'
                                    src={resolveImageSrc(item()?.img)}
                                    alt={item()?.name || ''}
                                    draggable={false}
                                    onError={useImageFallback}
                                  />
                                  {getExterior(item()?.name) && (
                                    <span class='drop-ext' style={{ color: getExteriorColor(getExterior(item()?.name)) }}>
                                      {getExterior(item()?.name)}
                                    </span>
                                  )}
                                </>
                              ) : <span class='round-number'>{roundIndex() + 1}</span>}
                                        </div>
                                        <div class='drop-info'>
                              <span class='drop-name'>{item()?.name || 'Pending'}</span>
                                            <div class='drop-price'>
                                                <img src='/assets/chips/chip-green.png' height='10' width='10' alt=''/>
                                <span>{Number(item()?.price || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                        )
                      }}</For>
                        </div>
                    </div>
                )}</For>
            </div>

            <style jsx>{`
              .drop-history {
                width: 100%;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1px;
                background: rgba(255,255,255,0.03);
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.05);
                overflow: hidden;
              }

              .player-column {
                display: flex;
                flex-direction: column;
                background: #0f131b;
                min-height: 103px;
              }

              .player-header-compact {
                display: flex;
                align-items: center;
                height: 25px;
                gap: 5px;
                padding: 2px 7px;
                background: #141a24;
                border-bottom: 1px solid rgba(255,255,255,0.04);
              }

              .player-name-compact {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 8px;
                font-weight: 700;
                color: #c7d0df;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .player-drops {
                display: flex;
                flex-direction: row;
                gap: 4px;
                padding: 5px;
                overflow-x: auto;
                overflow-y: hidden;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.1) transparent;
              }

              .player-drops::-webkit-scrollbar {
                height: 3px;
              }

              .player-drops::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 999px;
              }

              .drop-card {
                display: grid;
                grid-template-columns: 54px;
                grid-template-rows: 49px 18px;
                width: 54px;
                min-width: 54px;
                height: 67px;
                background: #0a0e14;
                border-radius: 3px;
                border: 1px solid rgba(255,255,255,0.06);
                border-bottom-color: var(--rarity, #A9B5D2);
                overflow: hidden;
                transition: border-color .2s ease;
              }

              .drop-card:hover {
                border-color: var(--rarity, #A9B5D2);
              }

              .drop-img-wrap {
                position: relative;
                width: 54px;
                height: 49px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #141922;
                border-radius: 3px;
              }

              .drop-img {
                max-width: 48px;
                max-height: 43px;
                object-fit: contain;
                filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
              }

              .drop-ext {
                position: absolute;
                top: 2px;
                left: 3px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 6px;
                font-weight: 800;
                text-shadow: 0 0 4px currentColor;
              }

              .drop-info {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 2px;
                padding: 0 3px;
                min-width: 0;
              }

              .drop-name {
                font-family: 'Geogrotesque', sans-serif;
                font-size: 6px;
                font-weight: 600;
                color: #c7d0df;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                line-height: 1.2;
              }

              .drop-price {
                display: flex;
                align-items: center;
                gap: 3px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 6px;
                font-weight: 700;
                color: #1fd65f;
              }

              .drop-price img {
                width: 7px;
                height: 7px;
              }

              .pending {
                border-bottom-color: rgba(255,255,255,0.06);
              }

              .pending .drop-img-wrap {
                background: #10151d;
              }

              .pending .drop-info {
                opacity: .36;
              }

              .round-number {
                color: #303848;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
              }

              @media only screen and (max-width: 768px) {
                .drop-history {
                  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }
              }

              @media only screen and (max-width: 390px) {
                .drop-history {
                  grid-template-columns: repeat(2, 1fr);
                }
              }
            `}</style>
        </>
    );
}

export default BattleDropHistory;
