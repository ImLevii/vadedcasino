import {For, Show} from "solid-js";
import Avatar from "../Level/avatar";
import {resolveImageSrc} from "../../util/image";

function BattleDropHistory(props) {

    function getRoundItem(playerId, round) {
      if (!Array.isArray(props?.wonItems) || !playerId) return null
      return props.wonItems.find(item => item.userId === playerId && item.round === round)
    }

    function getPlayerTotal(playerId) {
      if (!Array.isArray(props?.wonItems) || !playerId) return 0

      return props.wonItems
        .filter(item => {
          if ((props?.round || 0) > 0 && item?.round >= props?.round) return false
          return item?.userId === playerId
        })
        .reduce((sum, item) => sum + (item?.price || 0), 0)
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
      if (n.includes('field-tested') || n.includes('field tested') || n.includes('ft)')) return 'FT'
      if (n.includes('well-worn') || n.includes('well worn') || n.includes('ww)')) return 'WW'
      if (n.includes('battle-scarred') || n.includes('battle scarred') || n.includes('bs)')) return 'BS'
      return null
    }

    function getExteriorColor(ext) {
      if (ext === 'FN') return '#4DFFA0'
      if (ext === 'MW') return '#7AB8FF'
      if (ext === 'FT') return '#FFD462'
      if (ext === 'WW') return '#FF9E7A'
      if (ext === 'BS') return '#FF6B6B'
      return '#8b92a0'
    }

    function formatChance(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num <= 0) return '--'
      return `${num.toFixed(2).replace(/\.?0+$/, '')}%`
    }

    function formatPrice(value) {
      return Number(value || 0).toFixed(2)
    }

    function getSkinName(name) {
      if (!name) return 'Pending'
      const cleaned = String(name).replace(/\s*\(.*?\)\s*/g, '').trim()
      const last = cleaned.includes('|') ? cleaned.split('|').pop() : cleaned
      return (last || cleaned).trim()
    }

    function useImageFallback(event) {
      event.currentTarget.onerror = null
      event.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
    }

    return (
      <>
        <div class='drop-history'>
          <For each={props?.players || []}>{(player) => (
            <div class='player-column'>
              <div class='player-header'>
                <Avatar height='20' id={player?.id || '?'} xp={player?.xp || 0} dark={!player}/>
                <div class='player-header-info'>
                  <span class='player-name'>{player?.username || 'Waiting...'}</span>
                  <div class='player-total'>
                    <img src='/assets/chips/chip-green.png' height='10' width='10' alt=''/>
                    <span>{formatPrice(getPlayerTotal(player?.id))}</span>
                  </div>
                </div>
              </div>

              <div class='player-drops'>
                <For each={roundSlots()}>{(_, roundIndex) => {
                  const item = () => getRoundItem(player?.id, roundIndex() + 1)
                  const ext = () => getExterior(item()?.name)

                  return (
                    <div class={'drop-card ' + (item() ? 'filled' : 'pending')} style={{ '--rarity': getRarityColor(item()?.price || 0) }}>
                      <div class='drop-img-wrap'>
                        <Show when={item()} fallback={<span class='round-placeholder'>R{roundIndex() + 1}</span>}>
                          <img
                            class='drop-img'
                            src={resolveImageSrc(item()?.img, '/assets/logo/cosmic-luck-logo.png')}
                            alt={item()?.name || ''}
                            draggable={false}
                            onError={useImageFallback}
                          />
                        </Show>
                        <div class='rarity-line'/>
                      </div>

                      <div class='drop-body'>
                        <span class='drop-ext' style={{ color: getExteriorColor(ext()) }}>{ext() || '--'}</span>
                        <span class='drop-name'>{item() ? getSkinName(item()?.name) : 'Pending'}</span>

                        <div class='drop-price'>
                          <img src='/assets/chips/chip-green.png' height='10' width='10' alt=''/>
                          <span>{formatPrice(item()?.price)}</span>
                        </div>

                        <div class='drop-meta'>
                          <span class='meta-chip'>{formatChance(item()?.probability)}</span>
                          <span class='meta-chip round'>{roundIndex() + 1}</span>
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
            grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
            gap: 8px;
          }

          .player-column {
            background: #111720;
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 6px;
            overflow: hidden;
          }

          .player-header {
            height: 36px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0 7px;
            background: #151b26;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          .player-header-info {
            min-width: 0;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
          }

          .player-name {
            color: #d6deeb;
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 9px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .player-total {
            display: flex;
            align-items: center;
            gap: 3px;
            color: #1fd65f;
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 8px;
            font-weight: 700;
            white-space: nowrap;
          }

          .player-drops {
            display: flex;
            flex-direction: row;
            gap: 6px;
            padding: 8px;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.12) transparent;
          }

          .player-drops::-webkit-scrollbar {
            height: 4px;
          }

          .player-drops::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.12);
            border-radius: 999px;
          }

          .drop-card {
            width: 72px;
            min-width: 72px;
            height: 142px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.06);
            background: #202632;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: border-color .16s ease;
          }

          .drop-card:hover {
            border-color: var(--rarity, #A9B5D2);
          }

          .drop-img-wrap {
            margin: 6px 6px 0;
            height: 54px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.06);
            background: #0f141d;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .drop-img {
            width: 90%;
            max-height: 44px;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));
          }

          .rarity-line {
            position: absolute;
            left: 6px;
            right: 6px;
            bottom: 7px;
            height: 2px;
            border-radius: 999px;
            background: var(--rarity, #A9B5D2);
            box-shadow: 0 0 8px color-mix(in srgb, var(--rarity, #A9B5D2) 50%, transparent);
          }

          .drop-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 5px 6px 6px;
          }

          .drop-ext {
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 7px;
            font-weight: 800;
            line-height: 1;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .drop-name {
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 8px;
            font-weight: 700;
            line-height: 1.2;
            color: #edf2fb;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 20px;
          }

          .drop-price {
            margin-top: 3px;
            display: flex;
            align-items: center;
            gap: 3px;
            color: #1fd65f;
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 10px;
            font-weight: 700;
          }

          .drop-meta {
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
          }

          .meta-chip {
            min-width: 28px;
            height: 16px;
            padding: 0 5px;
            border-radius: 3px;
            border: 1px solid rgba(255,255,255,0.08);
            background: #181e29;
            color: #8f98aa;
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 7px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
          }

          .meta-chip.round {
            min-width: 16px;
            color: #b8c1d3;
          }

          .round-placeholder {
            color: rgba(139,146,160,0.4);
            font-family: 'Geogrotesque Wide', sans-serif;
            font-size: 10px;
            font-weight: 800;
          }

          .pending .drop-price,
          .pending .drop-name,
          .pending .drop-ext {
            color: #7b8596;
          }

          .pending .rarity-line {
            opacity: .3;
          }

          @media only screen and (max-width: 1040px) {
            .drop-history {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media only screen and (max-width: 680px) {
            .drop-history {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        `}</style>
      </>
    );
}

export default BattleDropHistory;
