import {For, Show} from "solid-js";
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
      if (!name) return 'Pending Drop'
      const sanitized = String(name)
        .replace(/stattrak™?\s*/gi, '')
        .replace(/souvenir\s+/gi, '')
      const pipePart = sanitized.includes('|') ? sanitized.split('|').pop() : sanitized
      return (pipePart || sanitized).replace(/\s*\(.*?\)\s*/g, '').trim()
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
                          <Avatar height='22' id={player?.id || '?'} xp={player?.xp || 0} dark={!player}/>
                          <span class='player-name-compact'>{player?.username || 'Waiting...'}</span>
                        </div>

                        <div class='player-drops'>
                          <For each={roundSlots()}>{(_, roundIndex) => {
                            const item = () => getRoundItem(player?.id, roundIndex() + 1)
                            const exterior = () => getExterior(item()?.name)

                            return (
                              <div class={'drop-card ' + (item() ? 'filled' : 'pending')} style={{ '--rarity': getRarityColor(item()?.price || 0) }}>
                                <div class='drop-img-wrap'>
                                  <Show when={item()} fallback={<span class='round-watermark'>R{roundIndex() + 1}</span>}>
                                    <img
                                      class='drop-img'
                                      src={resolveImageSrc(item()?.img)}
                                      alt={item()?.name || ''}
                                      draggable={false}
                                      onError={useImageFallback}
                                    />
                                  </Show>
                                  <div class='rarity-line'/>
                                </div>

                                <div class='drop-body'>
                                  <span class='drop-ext' style={{ color: getExteriorColor(exterior()) }}>
                                    {exterior() || 'CS2'}
                                  </span>

                                  <h5 class='drop-name'>{item() ? getSkinName(item()?.name) : 'Pending Drop'}</h5>

                                  <div class='drop-price'>
                                    <img src='/assets/chips/chip-green.png' height='13' width='13' alt=''/>
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
                display: flex;
                gap: 10px;
                overflow-x: auto;
                overflow-y: hidden;
                padding: 2px;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.12) transparent;
              }

              .drop-history::-webkit-scrollbar {
                height: 6px;
              }

              .drop-history::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.12);
                border-radius: 999px;
              }

              .player-column {
                display: flex;
                flex-direction: column;
                min-width: 168px;
                width: 168px;
                gap: 8px;
              }

              .player-header-compact {
                display: flex;
                align-items: center;
                height: 28px;
                gap: 6px;
                padding: 0 3px;
                border-radius: 6px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
              }

              .player-name-compact {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 700;
                color: #c7d0df;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .player-drops {
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .drop-card {
                width: 100%;
                min-width: 0;
                min-height: 224px;
                display: flex;
                flex-direction: column;
                background: #212630;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.06);
                overflow: hidden;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
                transition: transform .16s ease, border-color .16s ease;
              }

              .drop-card:hover {
                border-color: var(--rarity, #A9B5D2);
                transform: translateY(-1px);
              }

              .drop-img-wrap {
                position: relative;
                width: calc(100% - 18px);
                height: 96px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 10px 9px 0;
                background: #0f141c;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.06);
              }

              .drop-img {
                width: 88%;
                max-width: 138px;
                max-height: 78px;
                object-fit: contain;
                filter: drop-shadow(0 8px 10px rgba(0,0,0,0.42));
              }

              .rarity-line {
                position: absolute;
                left: 12px;
                right: 12px;
                bottom: 10px;
                height: 2px;
                border-radius: 999px;
                background: var(--rarity, #A9B5D2);
                box-shadow: 0 0 8px color-mix(in srgb, var(--rarity, #A9B5D2) 55%, transparent);
              }

              .drop-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 9px 11px 10px;
                min-height: 0;
              }

              .drop-ext {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
                line-height: 1;
                text-transform: uppercase;
                margin-bottom: 6px;
              }

              .drop-name {
                margin: 0;
                font-family: 'Geogrotesque', sans-serif;
                font-size: 11px;
                font-weight: 700;
                color: #f2f6ff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                line-height: 1.25;
                margin-bottom: 6px;
              }

              .drop-price {
                display: flex;
                align-items: center;
                gap: 5px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 800;
                color: #1fd65f;
                line-height: 1;
                margin-bottom: 10px;
              }

              .drop-price img {
                width: 13px;
                height: 13px;
              }

              .drop-meta {
                margin-top: auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 7px;
              }

              .meta-chip {
                min-height: 24px;
                min-width: 48px;
                padding: 0 8px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #191f28;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #97a2b4;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 700;
                line-height: 1;
              }

              .meta-chip.round {
                min-width: 32px;
                color: #bcc5d4;
              }

              .pending {
                border-color: rgba(255,255,255,0.05);
              }

              .pending .drop-img-wrap {
                background: #111722;
              }

              .pending .rarity-line {
                opacity: 0.35;
              }

              .pending .drop-price,
              .pending .drop-name,
              .pending .drop-ext {
                color: #8b92a0;
              }

              .round-watermark {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 17px;
                font-weight: 800;
                color: rgba(139, 146, 160, 0.35);
              }

              @media only screen and (max-width: 768px) {
                .player-column {
                  min-width: 154px;
                  width: 154px;
                }

                .drop-card {
                  min-height: 212px;
                }

                .drop-name {
                  font-size: 10px;
                }

                .drop-price {
                  font-size: 11px;
                }
              }

              @media only screen and (max-width: 520px) {
                .player-column {
                  min-width: 146px;
                  width: 146px;
                }

                .drop-card {
                  min-height: 206px;
                }

                .drop-name {
                  font-size: 10px;
                }

                .drop-price {
                  font-size: 11px;
                }
              }
            `}</style>
        </>
    );
}

export default BattleDropHistory;
