import GreenCount from "../Count/greencount";
import {createEffect, createSignal, For} from "solid-js";
import Avatar from "../Level/avatar";
import {getCents} from "../../util/balance";
import {A, useNavigate} from "@solidjs/router";
import {authedAPI} from "../../util/api";
import ActiveGame from "../Loader/activegame";
import {resolveImageSrc} from "../../util/image";

function BattlePreview(props) {

  const navigate = useNavigate()
  const [state, setState] = createSignal('waiting')

  createEffect(() => {
    if (state() === 'finished') return
    if (!props?.battle?.startedAt) return setState('waiting')
    if (!props?.battle?.endedAt) return setState('rolling')
    setState('finished')
  })

  function getType() {
    if (props?.battle?.gamemode === 'group') return 'Group'
    if (props?.battle?.playersPerTeam === 2 && props?.battle?.teams === 2) return '2v2'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 4) return '1v1v1v1'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 3) return '1v1v1'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 2) return '1v1'
    return Array(props?.battle?.teams).map(e => props?.battle?.playersPerTeam).join('v')
  }

  function getColor(team) {
    if (props?.battle?.gamemode !== 'group' && props?.battle?.playersPerTeam === 2) return team === 0 ? 'blueteam' : 'yellowteam'
    return 'purple'
  }

  function getCase(id) {
    return props?.battle?.cases?.find(c => id === c.id)
  }

  function getFirstAvailableSlot() {
    return props?.battle?.players?.findIndex(u => u === null) + 1
  }

  function hasLost(index) {
    return (index + 1) !== props?.battle?.winnerTeam && state() === 'finished'
  }

  return (
    <>
      {props?.battle && (
        <div class='battle-preview-container'>

          <div class={'mode ' + (props?.battle?.gamemode === 'group' ? 'group' : '')}>
            {props?.battle?.gamemode === 'group' && (
              <img src='/assets/icons/hands.svg' height='14' alt=''/>)}
            <p>{getType()}</p>
          </div>

          {props?.battle?.gamemode === 'crazy' && (
            <div class='crazy'>
              <img src='/assets/icons/crazy.svg' height='14' alt=''/>
              <p>CRAZY</p>
            </div>
          )}

          {props?.battle?.ownerFunding > 0 && (
            <div className='funding'>
              <p>-{props?.battle?.ownerFunding}%</p>
            </div>
          )}

          <div class='left'>
            <GreenCount number={props?.battle?.rounds?.length} active={state() === 'rolling'}
                        css={{height: '30px', padding: '0 10px'}}/>

            <div class='teams'>
              <For each={new Array(props?.battle?.teams)}>{(t, teamIndex) => (
                <>
                  <div class={'team ' + (hasLost(teamIndex()) ? 'lum' : '')}>
                    <For each={new Array(props?.battle?.playersPerTeam)}>{(p, playerIndex) => {
                      let player = props?.battle?.players[playerIndex() + (teamIndex() * props?.battle?.playersPerTeam)]
                      return (
                        <>
                          <Avatar height={44} xp={getColor(teamIndex())}
                                  id={player?.id || '?'}/>
                          {(props?.battle?.gamemode === 'group' && playerIndex() < props?.battle?.playersPerTeam - 1) && (
                            <img src='/assets/icons/goldhands.svg' height='18' width='18'
                                 alt='vs'/>
                          )}
                        </>
                      )
                    }}</For>
                  </div>

                  {teamIndex() < props?.battle?.teams - 1 && (
                    <img src='/assets/icons/battles.svg' height='16' width='16' alt='vs'/>
                  )}
                </>
              )}</For>
            </div>
          </div>

          <div class='cases'>
            <For each={props?.battle?.rounds}>{(c, index) => (
              <img src={resolveImageSrc(getCase(c?.caseId)?.img)} height='80'
                   alt=''/>
            )}</For>
          </div>

          <div class='right'>
            <div class='cost'>
              <img src='/assets/icons/coin.svg' height='15'/>
              <p>{Math.floor(props?.battle?.entryPrice) || '0'}<span
                class='gray'>.{getCents(props?.battle?.entryPrice)}</span></p>
            </div>

            <div class='controls'>
              {state() === 'rolling' && (
                <ActiveGame/>
              )}

              {!props?.battle?.startedAt && !props?.hasJoined && (
                <button class='bevel-gold join' onClick={async () => {
                  let res = await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({
                    slot: getFirstAvailableSlot(),
                    privKey: props?.battle?.privKey
                  }), true)

                  if (res.success) {
                    let link = `/battle/${props?.battle?.id}`
                    if (props?.battle?.privKey) {
                      link += `?pk=${props?.battle?.privKey}`
                    }

                    props?.ws?.emit('battles:subscribe', props?.battle?.id, props?.battle?.privKey)
                    navigate(link)
                  }
                }}>JOIN</button>
              )}

              <button class='bevel-light view'>
                <A href={`/battle/${props.battle.id}${props?.battle?.privKey ? `?pk=${props?.battle?.privKey}` : ''}`}
                   class='gamemode-link'></A>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="8" viewBox="0 0 13 8"
                     fill='#8b92a0'>
                  <path
                    d="M6.5 0C4.01621 0 1.76378 1.3589 0.101718 3.56612C-0.0339061 3.74696 -0.0339061 3.99959 0.101718 4.18042C1.76378 6.3903 4.01621 7.74921 6.5 7.74921C8.98379 7.74921 11.2362 6.3903 12.8983 4.18308C13.0339 4.00225 13.0339 3.74962 12.8983 3.56878C11.2362 1.3589 8.98379 0 6.5 0ZM6.67817 6.60305C5.02941 6.70676 3.66784 5.34786 3.77156 3.69643C3.85665 2.33487 4.96026 1.23126 6.32183 1.14616C7.97059 1.04245 9.33216 2.40135 9.22844 4.05278C9.14069 5.41168 8.03708 6.51529 6.67817 6.60305ZM6.59573 5.34254C5.70753 5.39838 4.97356 4.66708 5.03206 3.77887C5.07727 3.0449 5.67296 2.45188 6.40692 2.40401C7.29513 2.34816 8.0291 3.07947 7.97059 3.96768C7.92273 4.70431 7.32704 5.29733 6.59573 5.34254Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .battle-preview-container {
          width: 100%;
          height: 80px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 14px;

          position: relative;

          background: #12151c;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 300px;
        }

        .teams {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .team {
          display: flex;
          align-items: center;
          gap: 6px;

          transition: all .3s;
        }

        .lum {
          filter: grayscale(1);
          mix-blend-mode: luminosity;
          opacity: 0.3;
        }

        .cases {
          flex: 1;
          height: 100%;
          max-width: 480px;

          display: flex;
          align-items: center;
          padding: 0 6px;
          gap: 6px;

          overflow-x: auto;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .cases::-webkit-scrollbar {
          height: 3px;
        }

        .cases::-webkit-scrollbar-track {
          background: transparent;
        }

        .cases::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background: rgba(255,255,255,0.12);
        }

        .right {
          display: flex;
          align-items: center;
          margin-left: auto;
          gap: 20px;
          flex-shrink: 0;
        }

        .cost {
          height: 32px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1a1f29;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #c3cad6;
        }

        .controls {
          display: flex;
          justify-content: flex-end;
          min-width: 100px;
          gap: 6px;
        }

        .join {
          height: 32px;
          width: 70px;
          font-size: 12px;
        }

        .view {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          width: 32px;
          position: relative;
          border-radius: 6px;
          background: #1a1f29;
          border: 1px solid rgba(255,255,255,0.07);
        }

        .mode, .crazy, .funding {
          width: 64px;
          height: 26px;
          position: absolute;
          top: -13px;
          left: 0;
          background: #1a1f29;
          border: 1px solid rgba(255,255,255,0.08);

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border-radius: 5px;

          color: #8b92a0;
          font-size: 11px;
          font-weight: 700;
        }

        .mode.group {
          color: #1fd65f;
          background: rgba(31,214,95,0.08);
          border-color: rgba(31,214,95,0.25);
        }

        .mode p, .crazy p {
          margin-top: -2px;
        }

        .crazy {
          left: 74px;
          color: #e8a14a;
          background: rgba(232,161,74,0.08);
          border-color: rgba(232,161,74,0.25);
        }

        .funding {
          left: unset;
          top: -5px;
          right: 0;
          z-index: 0;
          background: unset;
          height: 20px;
          width: auto;
          padding: 0 8px;
          font-size: 10px;
        }

        .funding:before {
          position: absolute;
          content: '';
          top: 0; left: 0;
          z-index: -1;
          width: 100%; height: 100%;
          background: rgba(31,214,95,0.08);
          border-radius: 3px;
          border: 1px solid rgba(31,214,95,0.3);
          transform: skew(-10deg);
        }

        .funding p {
          color: #1fd65f;
        }
      `}</style>
    </>
  );
}

export default BattlePreview;
