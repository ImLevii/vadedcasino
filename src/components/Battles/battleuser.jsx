import Avatar from "../Level/avatar";
import Level from "../Level/level";
import {getCents} from "../../util/balance";
import {authedAPI} from "../../util/api";

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

    return (
        <>
            <div class={'battle-user-container ' + (props?.compact ? 'compact ' : '') + (props?.side || '')}>
                {/* ── User info header ── */}
                <div class={'user-info ' + (props?.player ? 'active' : '')}>
                    <Avatar height={props?.compact ? 24 : 36} id={props?.player?.id || '?'} xp={props?.player?.xp || 'purple'} dark={!props.player}/>

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
            </div>

            <style jsx>{`
              .battle-user-container {
                flex: 1;
                position: relative;
                height: fit-content;
                background: #141922;
                border-top: 1px solid rgba(255,255,255,0.05);
                padding: 10px 10px 8px;
                box-sizing: border-box;
              }

              .battle-user-container.compact {
                height: 34px;
                min-height: 34px;
                padding: 4px 8px 3px;
                background: #0f131b;
                border-top: 0;
              }

              .battle-user-container.compact .user-info {
                height: 27px;
                padding: 0;
                background: transparent;
                border: 0;
                position: relative;
              }

              .battle-user-container.compact.right .user-info {
                flex-direction: row-reverse;
                text-align: right;
              }

              .battle-user-container.compact.right .balance {
                margin-left: 0;
                margin-right: auto;
              }

              .battle-user-container.compact .balance {
                height: 13px;
                padding: 0;
                border: 0;
                background: transparent;
                color: #f4f7fb;
                position: absolute;
                left: 30px;
                bottom: 1px;
                font-size: 8px;
              }

              .battle-user-container.compact .name-container {
                align-self: flex-start;
                flex-direction: row-reverse;
                justify-content: flex-end;
                padding-top: 0;
              }

              .battle-user-container.compact.right .name-container {
                flex-direction: row;
                justify-content: flex-start;
              }

              .battle-user-container.compact.right .balance {
                left: auto;
                right: 30px;
              }

              .battle-user-container.compact .items {
                display: none;
              }

              .user-info {
                width: 100%;
                height: 50px;
                background: #11161f;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 6px;
                padding: 0 9px;
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
                font-size: 10px;
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
                height: 24px;
                padding: 0 7px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #0d1219;
                color: #ffffff;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                margin-left: auto;
                flex-shrink: 0;
              }

              .cents {
                opacity: 0.55;
              }

              .join-btn {
                min-width: 72px;
                height: 24px;
                margin-left: auto;
                flex-shrink: 0;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 4px;
                background: #1f2530;
                color: #c7d0df;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.3px;
                cursor: pointer;
                transition: background .18s, border-color .18s;
              }

              .join-btn:hover {
                border-color: rgba(255,255,255,0.14);
                background: #252c38;
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
