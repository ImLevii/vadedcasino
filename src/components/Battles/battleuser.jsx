import Avatar from "../Level/avatar";
import Level from "../Level/level";
import {getCents} from "../../util/balance";
import {authedAPI} from "../../util/api";
import {For} from "solid-js";
import CaseItem from "../Cases/caseitem";

function BattleUser(props) {

    function sumItemsWon() {
        return getOwnPulls()?.reduce((pv, item) => pv + item?.price, 0)
    }

    function getOwnPulls() {
        if (!Array.isArray(props?.wonItems)) return
        return props?.wonItems?.filter(item => {
            if (props?.state !== 'WINNERS' && item.round >= props?.round) return false
            return item.userId === props?.player?.id
        })
    }

    return (
        <>
            <div class='battle-user-container'>
                <div class={'user-info ' + (props?.player ? 'active' : '')}>
                    <Avatar height='40' id={props?.player?.id || '?'} xp={props?.player?.xp || 'purple'} dark={!props.player}/>

                    <div class='name-container'>
                        <p class='username'>{props?.player?.username || 'WAITING FOR PLAYER'}</p>
                        {props?.player && (
                            <Level xp={props?.player?.xp}/>
                        )}
                    </div>

                    {props?.player ? (
                        <>
                            <div class='balance'>
                                <img src='/assets/icons/coin.svg' height='16px' width='16px' alt=''/>
                                <p>
                                    {Math.floor(sumItemsWon())}
                                    <span class='gray'>.{getCents(sumItemsWon())}</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <button class='bevel-gold call' onClick={async () => {
                            if (props?.creator) { return await authedAPI(`/battles/${props?.battle?.id}/bot`, 'POST', JSON.stringify({ slot: props.index + 1, pk: null }), true) }
                            await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({ slot: props.index + 1, privKey: props?.battle?.privKey }), true)
                        }}>{props?.creator ? 'CALL BOT' : 'JOIN'}</button>
                    )}
                </div>

                <div class='items'>
                    <For each={getOwnPulls()}>{(item, index) => <CaseItem grid={true} {...item}/>}</For>
                </div>
            </div>

            <style jsx>{`
              .battle-user-container {
                flex: 1;
                position: relative;
                height: fit-content;
                
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.065);
                background: linear-gradient(180deg, rgba(16, 21, 30, 0.96), rgba(9, 13, 20, 0.98));
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.045), 
                  0 4px 12px rgba(0,0,0,0.25),
                  0 16px 40px rgba(0,0,0,0.28);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }
              
              .battle-user-container:hover {
                transform: translateY(-2px);
                border-color: rgba(31, 214, 95, 0.15);
                box-shadow: 
                  inset 0 1px 0 rgba(255,255,255,0.055), 
                  0 6px 16px rgba(0,0,0,0.28),
                  0 20px 48px rgba(0,0,0,0.32),
                  0 0 0 1px rgba(31, 214, 95, 0.08);
              }
              
              .user-info {
                width: 100%;
                height: 70px;
                background: linear-gradient(135deg, rgba(25, 33, 46, 0.94), rgba(15, 20, 31, 0.97));
                border-bottom: 1px solid rgba(255,255,255,0.055);
                padding: 0 18px;
                display: flex;
                align-items: center;
                gap: 10px;
                position: relative;

                color: #7a8394;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.2px;

                text-overflow: ellipsis;
                backdrop-filter: blur(8px);
                transition: all 0.3s ease;
              }
              
              .user-info::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, 
                  transparent, 
                  rgba(255,255,255,0.08), 
                  transparent);
              }
              
              .user-info.active {
                color: #FFFFFF;
                font-size: 15px;
                font-weight: 700;
                background: linear-gradient(135deg, 
                  rgba(24, 42, 40, 0.96), 
                  rgba(14, 23, 28, 0.98));
                border-bottom: 1px solid rgba(31, 214, 95, 0.12);
              }
              
              .user-info.active::before {
                background: linear-gradient(90deg, 
                  transparent, 
                  rgba(31, 214, 95, 0.2), 
                  transparent);
              }
              
              .items {
                width: 100%;
                min-height: 340px;
                background: 
                  radial-gradient(85% 60% at 50% 0%, 
                    rgba(31, 214, 95, 0.042), 
                    rgba(31, 214, 95, 0)), 
                  linear-gradient(180deg, 
                    rgba(8, 11, 17, 0.85), 
                    rgba(6, 9, 14, 0.92));
                padding: 18px;
                
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
                grid-gap: 12px;
                position: relative;
              }
              
              .items::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: linear-gradient(180deg, 
                  rgba(31, 214, 95, 0.025), 
                  transparent);
                pointer-events: none;
              }
              
              .username {
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
              }
              
              .name-container {
                display: flex;
                gap: 2px 8px;
                flex-wrap: wrap;
                overflow: hidden;
                align-items: center;
              }
              
              .call {
                min-width: 95px;
                height: 34px;
                margin-left: auto;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.5px;
                transition: all 0.25s ease;
              }
              
              .call:hover {
                transform: scale(1.02);
              }
              
              .balance {
                min-width: 70px;
                height: 34px;
                background: 
                  linear-gradient(135deg, 
                    rgba(31, 184, 91, 0.22), 
                    rgba(18, 122, 68, 0.16)),
                  linear-gradient(180deg,
                    rgba(31, 214, 95, 0.08),
                    rgba(15, 111, 61, 0.08));
                border: 1px solid rgba(31, 214, 95, 0.24);
                border-radius: 6px;
                margin-left: auto;

                color: #FFFFFF;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 14px;
                font-weight: 700;
                box-sizing: content-box;
                
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 0 12px;
                
                box-shadow: 
                  inset 0 1px 0 rgba(31, 214, 95, 0.15),
                  0 2px 8px rgba(31, 214, 95, 0.12),
                  0 4px 16px rgba(0,0,0,0.15);
                transition: all 0.25s ease;
              }
              
              .balance:hover {
                border-color: rgba(31, 214, 95, 0.32);
                box-shadow: 
                  inset 0 1px 0 rgba(31, 214, 95, 0.2),
                  0 3px 12px rgba(31, 214, 95, 0.18),
                  0 6px 20px rgba(0,0,0,0.2);
                transform: translateY(-1px);
              }
              
              .balance img {
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
              }
              
              .gray {
                opacity: 0.65;
              }

              @media only screen and (max-width: 1040px) {
                .battle-user-container {
                  width: 100%;
                }
                
                .user-info {
                  height: 65px;
                  padding: 0 15px;
                }
              }
            `}</style>
        </>
    );
}

export default BattleUser;
