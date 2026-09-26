import {For, Show} from "solid-js";
import Avatar from "../Level/avatar";
import {resolveImageSrc} from "../../util/image";

function BattleDropHistory(props) {

    function getRoundItem(playerId, round) {
      if (!Array.isArray(props?.wonItems) || !playerId) return null
      if (props.state !== 'WINNERS' && round >= (props.round || 0)) return null
      return props.wonItems.find(item => item.userId === playerId && item.round === round)
    }

    function getPlayerTotal(playerId) {
      if (!Array.isArray(props?.wonItems) || !playerId) return 0

      return props.wonItems
        .filter(item => {
          if (props.state !== 'WINNERS' && item?.round >= (props.round || 0)) return false
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
      if (price >= 10000) return '#40c9ac'
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
        <div class='drop-history' style={{ '--players': props.players?.length || 2 }}>
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
            grid-template-columns: repeat(var(--players),minmax(0,1fr));
            gap: 12px;
            padding: 16px;
            background: #17191f;
            border-radius: 6px;
            box-sizing: border-box;
          }

          .player-column {
            min-width: 0;
            container-type: inline-size;
          }

          .player-header {
            min-height: 58px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            background: #0e1015;
            border: 1px solid #090b0f;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .player-header-info {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .player-name {
            font-size: 11px;
            font-weight: 700;
            color: #eef1f5;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .player-total {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
          }

          .player-drops {
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(min(100%,82px),1fr));
            align-content: start;
            gap: 8px;
          }

          .drop-card {
            min-width: 0;
            border-radius: 3px;
            background: #22252d;
            overflow: hidden;
            border: 1px solid transparent;
          }

          .drop-card:hover {
            border-color: #3c4550;
          }

          .drop-img-wrap {
            margin: 7px 7px 0;
            height: 84px;
            border-radius: 3px;
            background: #0e1116;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .drop-img {
            width: 90%;
            height: 64px;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px #0006);
          }

          .rarity-line {
            position: absolute;
            left: 9px;
            right: 9px;
            bottom: 7px;
            height: 2px;
            background: var(--rarity);
            box-shadow: 0 0 7px var(--rarity);
          }

          .drop-body {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 10px 8px 8px;
          }

          .drop-ext {
            font-size: 8px;
            font-weight: 700;
            line-height: 1;
          }

          .drop-name {
            font-size: 10px;
            font-weight: 600;
            color: #eff1f6;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .drop-price {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #1fd65f;
            font-size: 12px;
            font-weight: 700;
          }

          .drop-meta {
            margin-top: 5px;
            display: flex;
            justify-content: space-between;
            gap: 3px;
          }

          .meta-chip {
            background: #15171d;
            border: 1px solid #101218;
            padding: 2px 5px;
            color: #9da6b6;
            border-radius: 3px;
            font-size: 9px;
            white-space: nowrap;
          }

          .round {
            min-width: 20px;
            text-align: center;
          }

          .round-placeholder {
            font-size: 12px;
            font-weight: 700;
            color: #555d6a;
          }

          .pending .rarity-line {
            opacity: .18;
          }

          .pending .drop-price,.pending .drop-name,.pending .drop-ext {
            color: #7d8592;
          }

          @media(max-width:1200px) {

            .drop-history {
              grid-template-columns: repeat(auto-fit,minmax(min(100%,240px),1fr));
            }
          }

          @media(max-width:700px) {

            .drop-history {
              grid-template-columns: repeat(2,minmax(0,1fr));
              gap: 12px;
              padding: 10px;
            }

            .player-drops {
              gap: 5px;
              grid-template-columns: repeat(2,minmax(0,1fr));
            }

            .drop-body {
              padding: 8px 5px;
            }

            .drop-name {
              font-size: 9px;
            }

            .drop-price {
              font-size: 10px;
            }

            .meta-chip {
              font-size: 8px;
              padding: 2px 3px;
            }

            .drop-img-wrap {
              margin: 4px 4px 0;
              height: 68px;
            }

            .drop-img {
              height: 52px;
            }
          }
        `}</style>
      </>
    );
}

export default BattleDropHistory;
