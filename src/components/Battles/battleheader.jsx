import {A} from "@solidjs/router";
import {getCents} from "../../util/balance";
import {For} from "solid-js";

function BattleHeader(props) {

    function getType() {
        if (props?.battle?.gamemode === 'group') return 'Group'
        if (props?.battle?.playersPerTeam === 2 && props?.battle?.teams === 2) return '2v2'
        if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 4) return '1v1v1v1'
        if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 3) return '1v1v1'
        if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 2) return '1v1'
        return Array(props?.battle?.teams).map(e => props?.battle?.playersPerTeam).join('v')
    }

    function getStateText() {
        if (props?.state === 'WAITING') return 'Waiting for Players...'
        if (props?.state === 'EOS') return `Waiting for EOS Block #${props?.block}`
        return ''
    }

    function getActiveCase() {
        let round = props?.battle?.rounds[props?.round - 1]
        if (!round) return
        let caseId = round.caseId
        let c = getCase(caseId)

        return c
    }

    function getCase(id) {
        return props?.battle?.cases?.find(c => id === c.id)
    }

    return (
        <>
            <div class='battle-header'>
                <div class='header-section'>
                    <button class='back bevel-light'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
                            <path
                                d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z"
                                fill="#8b92a0"/>
                        </svg>
                        <p>BACK</p>
                        <A href='/battles' class='gamemode-link'></A>
                    </button>

                    <div class={'mode ' + (props?.battle?.gamemode === 'group' ? 'group' : '')}>
                        {props?.battle?.gamemode === 'group' && (
                            <img src='/assets/icons/hands.svg' height='17' width='12' alt=''/>)}
                        <p>{getType()}</p>
                    </div>

                    {props?.battle?.gamemode === 'crazy' && (
                        <div class='crazy'>
                            <img src='/assets/icons/crazy.svg' height='14' alt=''/>
                            <p>CRAZY</p>
                        </div>
                    )}
                </div>

                <div class='header-section'>
                    {getStateText() === '' ? (
                        <div class='case-info'>
                            <p>{getActiveCase()?.name}</p>

                            <div class='cost'>
                                <img src='/assets/chips/chip-green.png' height='18' width='18' alt=''/>
                                <p>{Math.floor(getActiveCase()?.price || 0)}<span class='gray'>.{getCents(getActiveCase()?.price || 0)}</span></p>
                            </div>
                        </div>
                    ) : (
                        <p class='state'>{getStateText()}</p>
                    )}
                </div>

                <div class='header-section'>
                    <p class='total'>TOTAL COST</p>
                    <div class='cost'>
                        <img src='/assets/chips/chip-green.png' height='18' width='18' alt=''/>
                        <p>{Math.floor(props?.battle?.entryPrice || 0)}<span class='gray'>.{getCents(props?.battle?.entryPrice || 0)}</span></p>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .battle-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-height: 48px;
                padding: 7px 10px;
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 8px;
                background: #111720;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
                position: relative;
                overflow: hidden;
              }

              .battle-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 8%;
                right: 8%;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(31, 214, 95, 0.05), transparent);
                pointer-events: none;
              }

              .header-section {
                display: flex;
                align-items: center;
                flex: 1;
                gap: 8px;
                justify-content: center;
                position: relative;
                z-index: 1;
              }
               
              .header-section:first-child {
                justify-content: flex-start;
              }
               
              .header-section:last-child {
                justify-content: flex-end;
              }
               
              .case-info {
                display: flex;
                align-items: center;
                gap: 8px;

                color: #fff;
                font-size: 13px;
                font-weight: 700;
              }
               
              .back {
                height: 28px;
                padding: 0 9px;
                font-weight: 700;
                font-family: Geogrotesque Wide;
                position: relative;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 6px;
                background: rgba(255,255,255,0.02);
                display: flex;
                align-items: center;
                transition: all .2s ease;
              }

              .back:hover {
                background: rgba(255,255,255,0.03);
                border-color: rgba(255,255,255,0.08);
              }

              .back p {
                margin-top: -3px;
              }
               
              .back svg {
                margin-right: 6px;
              }
               
              .state {
                color: #FFF;
                font-size: 13px;
                font-weight: 600;
                text-align: center;
              }
               
              .total {
                color: #6b7280;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: .5px;
                margin-bottom: 2px;
              }

              .cost {
                height: 28px;
                font-size: 12px;
                padding: 0 9px;
                min-width: 86px;
                gap: 4px;
                border-radius: 6px;
              }

              .cost img {
                object-fit: contain;
                filter: drop-shadow(0 0 8px rgba(31,214,95,.25));
              }

              .cost p {
                margin-top: -2px;
              }

              .mode, .crazy {
                height: 26px;
                padding: 0 9px;
                background: rgba(26, 31, 41, 0.5);
                border: 1px solid rgba(255,255,255,0.06);

                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border-radius: 6px;

                color: #8b92a0;
                font-size: 11px;
                font-weight: 700;
                backdrop-filter: blur(4px);
                transition: all .2s ease;
              }

              .mode.group {
                color: #1fd65f;
                background: rgba(31,214,95,0.08);
                border-color: rgba(31,214,95,0.22);
                box-shadow: 0 0 10px rgba(31,214,95,0.05);
              }

              .mode p, .crazy p {
                margin-top: -2px;
              }

              .crazy {
                color: #e8a14a;
                background: rgba(232,161,74,0.08);
                border-color: rgba(232,161,74,0.22);
                box-shadow: 0 0 10px rgba(232,161,74,0.05);
              }

              @media only screen and (max-width: 720px) {
                .battle-header {
                  flex-wrap: wrap;
                  gap: 10px;
                  padding: 10px;
                }

                .header-section {
                  flex: 1 1 auto;
                }

                .header-section:nth-child(2) {
                  order: 3;
                  flex-basis: 100%;
                  min-height: 32px;
                  border-top: 1px solid rgba(255,255,255,0.04);
                  padding-top: 10px;
                }

                .total {
                  display: none;
                }

                .case-info {
                  width: 100%;
                  justify-content: space-between;
                  font-size: 12px;
                }
              }
            `}</style>
        </>
    );
}

export default BattleHeader;
