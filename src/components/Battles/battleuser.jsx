import Avatar from "../Level/avatar";
import Level from "../Level/level";
import {getCents} from "../../util/balance";
import {authedAPI} from "../../util/api";
import {For, Show} from "solid-js";
import IndicatorLine from "../IndicatorLine/indicatorline";
import {resolveImageSrc} from "../../util/image";

function BattleUser(props) {

    function sumItemsWon() {
        return getOwnPulls().reduce((total, item) => total + (item?.price || 0), 0)
    }

    function getOwnPulls() {
        if (!Array.isArray(props?.wonItems)) return []
        return props?.wonItems?.filter(item => {
            if (props?.state !== 'WINNERS' && item.round >= props?.round) return false
            return item.userId === props?.player?.id
        })
    }

    function getRarityColor(price) {
        if (price >= 250000) return '#FFB84A'
        if (price >= 50000)  return '#FF5141'
        if (price >= 10000)  return '#DC5FDE'
        if (price >= 1000)   return '#4176FF'
        return '#A9B5D2'
    }

    function getExterior(name) {
        if (!name) return null
        const n = name.toLowerCase()
        if (n.includes('factory new') || n.includes('fn)'))   return 'FN'
        if (n.includes('minimal wear') || n.includes('mw)'))  return 'MW'
        if (n.includes('field-tested') || n.includes('ft)'))  return 'FT'
        if (n.includes('well-worn') || n.includes('ww)'))     return 'WW'
        if (n.includes('battle-scarred') || n.includes('bs)'))return 'BS'
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

    function totalRounds() {
        return props?.rounds?.length || 0
    }

    function useImageFallback(e) {
        e.currentTarget.onerror = null
        e.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
    }

    return (
        <>
            <div class='battle-user-container'>
                {/* ── User info header ── */}
                <div class={'user-info ' + (props?.player ? 'active' : '')}>
                    <Avatar height='36' id={props?.player?.id || '?'} xp={props?.player?.xp || 'purple'} dark={!props.player}/>

                    <div class='name-container'>
                        <p class='username'>{props?.player?.username || 'WAITING...'}</p>
                        {props?.player && <Level xp={props?.player?.xp}/>}
                    </div>

                    {props?.player ? (
                        <div class='balance'>
                            <img src='/assets/chips/chip-green.png' height='16' width='16' alt=''/>
                            <span>
                                {Math.floor(sumItemsWon())}
                                <span class='cents'>.{getCents(sumItemsWon())}</span>
                            </span>
                        </div>
                    ) : (
                        <button class='join-btn' onClick={async () => {
                            if (props?.creator) {
                                return await authedAPI(`/battles/${props?.battle?.id}/bot`, 'POST', JSON.stringify({ slot: props.index + 1, pk: null }), true)
                            }
                            await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({ slot: props.index + 1, privKey: props?.battle?.privKey }), true)
                        }}>{props?.creator ? 'CALL BOT' : 'JOIN'}</button>
                    )}
                </div>

                {/* ── Won items grid ── */}
                <div class='items'>
                    <Show when={getOwnPulls().length > 0} fallback={
                        <div class='items-empty'>
                            <For each={new Array(Math.min(totalRounds(), 4))}>{(_, i) => (
                                <div class='empty-slot'>{i() + 1}</div>
                            )}</For>
                        </div>
                    }>
                        <For each={getOwnPulls()}>{(item, index) => (
                            <div class='item-card' style={{ '--rarity': getRarityColor(item?.price || 0) }}>
                                <div class='item-img-wrap'>
                                    <img
                                        class='item-img'
                                        src={resolveImageSrc(item?.img)}
                                        alt={item?.name || ''}
                                        draggable={false}
                                        onError={useImageFallback}
                                    />
                                    <IndicatorLine
                                        orientation='horizontal'
                                        length='70%'
                                        thickness='3px'
                                        color={getRarityColor(item?.price || 0)}
                                        pulse={false}
                                        style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)' }}
                                    />
                                    {getExterior(item?.name) && (
                                        <span class='ext-tag' style={{ color: getExteriorColor(getExterior(item?.name)) }}>
                                            {getExterior(item?.name)}
                                        </span>
                                    )}
                                </div>
                                <div class='item-details'>
                                    <span class='item-name'>{item?.name || 'Mystery'}</span>
                                    <span class='item-price'>
                                        <img src='/assets/chips/chip-green.png' height='11' width='11' alt=''/>
                                        {Number(item?.price || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div class='round-tag'>{(item?.round ?? index()) + 1}</div>
                            </div>
                        )}</For>
                    </Show>

                    {/* Round slots row */}
                    <div class='round-slots'>
                        <For each={new Array(totalRounds())}>{(_, i) => {
                            const pull = getOwnPulls().find(p => (p?.round ?? 0) === i())
                            return (
                                <div class={'round-slot ' + (pull ? 'filled' : i() < (props?.round || 0) ? 'empty-done' : 'pending')}>
                                    {pull ? (
                                        <img src={resolveImageSrc(pull?.img)} alt='' onError={useImageFallback}/>
                                    ) : (
                                        <span>{i() + 1}</span>
                                    )}
                                </div>
                            )
                        }}</For>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .battle-user-container {
                flex: 1;
                position: relative;
                height: fit-content;
                background: #0d1219;
                border-top: 1px solid rgba(255,255,255,0.04);
              }

              .user-info {
                width: 100%;
                height: 52px;
                background: rgba(255,255,255,0.02);
                border-bottom: 1px solid rgba(255,255,255,0.05);
                padding: 0 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #6b7280;
                font-size: 12px;
                font-weight: 700;
              }

              .user-info.active {
                color: #ffffff;
              }

              .username {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: 700;
                font-size: 12px;
                margin: 0;
              }

              .name-container {
                display: flex;
                flex-direction: column;
                gap: 3px;
                overflow: hidden;
                flex: 1;
                min-width: 0;
              }

              .balance {
                display: flex;
                align-items: center;
                gap: 4px;
                height: 26px;
                padding: 0 8px;
                border-radius: 5px;
                border: 1px solid rgba(31,214,95,0.2);
                background: rgba(31,214,95,0.07);
                color: #ffffff;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
                margin-left: auto;
                flex-shrink: 0;
              }

              .cents {
                opacity: 0.55;
              }

              .join-btn {
                min-width: 72px;
                height: 26px;
                margin-left: auto;
                flex-shrink: 0;
                border: none;
                border-radius: 5px;
                background: linear-gradient(135deg, #1fd65f, #14b04a);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 4px 12px rgba(31,214,95,.28);
                color: #021a09;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.3px;
                cursor: pointer;
                transition: filter .18s, transform .18s;
              }

              .join-btn:hover {
                filter: brightness(1.08);
                transform: translateY(-1px);
              }

              /* ── Items area ── */
              .items {
                width: 100%;
                min-height: 200px;
                padding: 10px 10px 6px;
                display: flex;
                flex-direction: column;
                gap: 7px;
              }

              .items-empty {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
              }

              .empty-slot {
                width: 38px;
                height: 38px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.06);
                background: rgba(255,255,255,0.02);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #3a4255;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
                font-weight: 700;
              }

              /* ── Per-item card matching CSGOLuck style ── */
              .item-card {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border-radius: 7px;
                border: 1px solid rgba(255,255,255,0.06);
                background: rgba(255,255,255,0.02);
                position: relative;
                transition: border-color .2s;
              }

              .item-card:hover {
                border-color: color-mix(in srgb, var(--rarity, #A9B5D2) 30%, transparent);
              }

              .item-img-wrap {
                position: relative;
                flex-shrink: 0;
                width: 54px;
                height: 44px;
                border-radius: 5px;
                background: radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--rarity, #A9B5D2) 16%, transparent), transparent), rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }

              .item-img {
                width: 39px;
                height: 32px;
                object-fit: contain;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
              }

              .ext-tag {
                position: absolute;
                top: 3px;
                left: 4px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 7px;
                font-weight: 800;
                line-height: 1;
                text-shadow: 0 0 5px currentColor;
              }

              .item-details {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .item-name {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                color: #c6ccd8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .item-price {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                color: #1fd65f;
              }

              .round-tag {
                flex-shrink: 0;
                width: 18px;
                height: 18px;
                border-radius: 4px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.08);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 8px;
                font-weight: 700;
                color: #6b7280;
              }

              /* ── Round slots row at the bottom ── */
              .round-slots {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                padding: 4px 0 2px;
                border-top: 1px solid rgba(255,255,255,0.04);
                margin-top: 2px;
              }

              .round-slot {
                width: 28px;
                height: 28px;
                border-radius: 5px;
                border: 1px solid rgba(255,255,255,0.06);
                background: rgba(255,255,255,0.02);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                flex-shrink: 0;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 700;
                color: #3a4255;
                transition: border-color .2s, background .2s;
              }

              .round-slot img {
                width: 22px;
                height: 22px;
                object-fit: contain;
              }

              .round-slot.filled {
                border-color: rgba(31,214,95,0.25);
                background: rgba(31,214,95,0.06);
              }

              .round-slot.empty-done {
                border-color: rgba(255,255,255,0.04);
                background: rgba(255,255,255,0.015);
                color: #252e3e;
              }

              .round-slot.pending {
                color: #3a4255;
              }

              @media only screen and (max-width: 1040px) {
                .user-info {
                  height: 56px;
                  padding: 0 12px;
                }
              }
            `}</style>
        </>
    );
}

export default BattleUser;
