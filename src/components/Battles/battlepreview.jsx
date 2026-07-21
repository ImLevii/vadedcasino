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

  function useImageFallback(event) {
    event.currentTarget.onerror = null
    event.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
    event.currentTarget.classList.add('fallback')
  }

  return (
    <>
      {props?.battle && (
        <div class='battle-preview-container'>

          <div class='left-col'>
            <div class='slots-box'>
              <For each={new Array(props?.battle?.teams)}>{(t, teamIndex) => (
                <>
                  <For each={new Array(props?.battle?.playersPerTeam)}>{(p, playerIndex) => {
                    let player = props?.battle?.players[playerIndex() + (teamIndex() * props?.battle?.playersPerTeam)]
                    return (
                      <>
                        <div class={'slot ' + (hasLost(teamIndex()) ? 'lum' : '')}>
                          {player ? (
                            <Avatar height={36} xp={player?.xp || 0} id={player?.id}/>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2zm-4 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9 16h6v1.5H9V16z" fill="#1fd65f"/>
                            </svg>
                          )}
                        </div>
                        {(playerIndex() < props?.battle?.playersPerTeam - 1) && (
                          <span class='sep'>+</span>
                        )}
                      </>
                    )
                  }}</For>

                  {teamIndex() < props?.battle?.teams - 1 && (
                    <span class={'sep ' + (props?.battle?.gamemode === 'group' ? '' : 'vs')}>
                      {props?.battle?.gamemode === 'group' ? '+' : 'vs'}
                    </span>
                  )}
                </>
              )}</For>
            </div>

            <div class='bottom-row'>
              <div class='drops-box'>
                <span class='drops-label'>{state() === 'finished' ? 'Drops' : 'Price'}</span>
                <img class='price-chip' src='/assets/chips/chip-green.png' height='17' width='17' alt=''/>
                <span class='drops-amount'>
                  {Math.floor(props?.battle?.entryPrice) || '0'}<span class='gray'>.{getCents(props?.battle?.entryPrice)}</span>
                </span>
              </div>

              {(!props?.battle?.startedAt && !props?.hasJoined) ? (
                <button class='action-btn join' onClick={async () => {
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
                }}>Join</button>
              ) : (
                <button class='action-btn'>
                  <A href={`/battle/${props.battle.id}${props?.battle?.privKey ? `?pk=${props?.battle?.privKey}` : ''}`}
                     class='gamemode-link'></A>
                  {state() === 'finished' ? 'See Result' : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="8" viewBox="0 0 13 8" fill='currentColor'>
                        <path d="M6.5 0C4.01621 0 1.76378 1.3589 0.101718 3.56612C-0.0339061 3.74696 -0.0339061 3.99959 0.101718 4.18042C1.76378 6.3903 4.01621 7.74921 6.5 7.74921C8.98379 7.74921 11.2362 6.3903 12.8983 4.18308C13.0339 4.00225 13.0339 3.74962 12.8983 3.56878C11.2362 1.3589 8.98379 0 6.5 0ZM6.67817 6.60305C5.02941 6.70676 3.66784 5.34786 3.77156 3.69643C3.85665 2.33487 4.96026 1.23126 6.32183 1.14616C7.97059 1.04245 9.33216 2.40135 9.22844 4.05278C9.14069 5.41168 8.03708 6.51529 6.67817 6.60305ZM6.59573 5.34254C5.70753 5.39838 4.97356 4.66708 5.03206 3.77887C5.07727 3.0449 5.67296 2.45188 6.40692 2.40401C7.29513 2.34816 8.0291 3.07947 7.97059 3.96768C7.92273 4.70431 7.32704 5.29733 6.59573 5.34254Z"/>
                      </svg>
                      Watch
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div class='cases-panel'>
            <div class='panel-side'>
              <button class='inspect'>
                Inspect
                <A href={`/battle/${props.battle.id}${props?.battle?.privKey ? `?pk=${props?.battle?.privKey}` : ''}`}
                   class='gamemode-link'></A>
              </button>

              <div class='mode-chips'>
                <div class='chip' title={getType()}>
                  {props?.battle?.gamemode === 'group' ? (
                    <img src='/assets/icons/hands.svg' height='12' alt='group'/>
                  ) : (
                    <img src='/assets/icons/battles.svg' height='12' alt=''/>
                  )}
                </div>
                <div class='chip text'>{getType()}</div>
                {props?.battle?.gamemode === 'crazy' && (
                  <div class='chip crazy' title='Crazy mode'>
                    <img src='/assets/icons/crazy.svg' height='12' alt='crazy'/>
                  </div>
                )}
                {props?.battle?.ownerFunding > 0 && (
                  <div class='chip funding' title='Owner funded'>-{props?.battle?.ownerFunding}%</div>
                )}
                {state() === 'rolling' && (
                  <div class='chip rolling'>
                    <ActiveGame/>
                  </div>
                )}
              </div>
            </div>

            <div class='cases'>
              <For each={props?.battle?.rounds}>{(c, index) => (
                <div class='case-tile'>
                  <img
                    src={resolveImageSrc(getCase(c?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                    alt={getCase(c?.caseId)?.name || 'Battle case'}
                    onError={useImageFallback}
                  />
                </div>
              )}</For>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .battle-preview-container {
          width: 100%;
          min-height: 130px;

          display: flex;
          align-items: stretch;
          gap: 14px;
          padding: 14px;
          box-sizing: border-box;

          background: linear-gradient(180deg, rgba(17, 22, 32, 0.95), rgba(10, 14, 22, 0.98));
          border: 1px solid rgba(148, 166, 192, 0.22);
          border-radius: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 34px rgba(0,0,0,0.32);
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(.34,1.56,.64,1);
        }
        
        .battle-preview-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(31, 214, 95, 0.06), transparent);
          pointer-events: none;
          z-index: 1;
        }
        
        .battle-preview-container:hover {
          border-color: rgba(31, 214, 95, 0.34);
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 38px rgba(0,0,0,0.35), 0 0 0 1px rgba(31, 214, 95, 0.12);
        }

        .left-col {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          min-width: 260px;
          flex-shrink: 0;
        }

        .slots-box {
          display: flex;
          align-items: center;
          gap: 8px;

          background: linear-gradient(180deg, rgba(8, 12, 18, 0.95), rgba(5, 8, 13, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 8px 12px;
          flex: 1;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .slots-box::-webkit-scrollbar { display: none; }

        .slot {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;
          background: radial-gradient(75% 75% at 50% 50%, rgba(31, 214, 95, 0.08), rgba(23, 28, 38, 0.9));
          border: 1px solid rgba(31, 214, 95, 0.24);
          box-shadow: inset 0 0 12px rgba(31, 214, 95, 0.08), 0 2px 6px rgba(0,0,0,0.2);
          overflow: hidden;
          transition: all .25s ease;
        }
        
        .slot:has(> :not(svg)) {
          border-color: rgba(31, 214, 95, 0.35);
          background: radial-gradient(75% 75% at 50% 50%, rgba(31, 214, 95, 0.14), rgba(23, 28, 38, 0.95));
          box-shadow: inset 0 0 18px rgba(31, 214, 95, 0.14), 0 3px 8px rgba(0,0,0,0.26);
        }
        
        .slot:empty, .slot:has(svg) {
          background: rgba(23, 28, 38, 0.7);
          border-style: dashed;
          border-color: rgba(31, 214, 95, 0.18);
        }

        .slot:has(svg):hover {
          border-color: rgba(31, 214, 95, 0.3);
          background: rgba(23, 28, 38, 0.8);
        }

        .slot svg {
          filter: drop-shadow(0 0 5px rgba(31, 214, 95, 0.55));
        }

        .lum {
          filter: grayscale(1);
          opacity: 0.35;
        }

        .sep {
          color: #4a5261;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 12px;
          font-weight: 700;
        }

        .sep.vs {
          font-size: 11px;
          text-transform: lowercase;
        }

        .bottom-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .drops-box {
          flex: 1;
          height: 40px;

          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;

          background: linear-gradient(180deg, rgba(8, 12, 18, 0.95), rgba(5, 8, 13, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);

          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 13px;
          font-weight: 700;
          transition: border-color .2s ease;
        }

        .battle-preview-container:hover .drops-box {
          border-color: rgba(31, 214, 95, 0.12);
        }

        .drops-label {
          color: #8b92a0;
        }

        .drops-amount {
          color: #FFF;
        }

        .gray {
          color: #8b92a0;
        }

        .price-chip {
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(31,214,95,.3));
        }

        .action-btn {
          height: 40px;
          padding: 0 18px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          outline: unset;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(30, 36, 47, 0.9), rgba(22, 27, 37, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);

          color: #c3cad6;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;

          position: relative;
          cursor: pointer;
          transition: all .2s ease;
        }

        .action-btn:hover {
          color: #FFF;
          border-color: rgba(31, 214, 95, 0.4);
          background: rgba(31, 214, 95, 0.07);
          transform: translateY(-1px);
          box-shadow: 0 0 16px rgba(31, 214, 95, 0.12);
        }

        .action-btn.join {
          background: linear-gradient(180deg, #1fd65f 0%, #0db950 100%);
          border: 1px solid rgba(75,242,137,.4);
          color: #04240f;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px rgba(31, 214, 95, 0.25), 0 2px 0 rgba(0,0,0,0.15);
        }

        .action-btn.join:hover {
          background: linear-gradient(180deg, #45e57f 0%, #1fd65f 100%);
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 0 22px rgba(31, 214, 95, 0.4), 0 2px 0 rgba(0,0,0,0.15);
        }

        .action-btn.join:active {
          transform: translateY(0);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px rgba(31, 214, 95, 0.2);
        }

        .cases-panel {
          flex: 1;
          min-width: 0;

          display: flex;
          gap: 10px;
          padding: 10px;
          box-sizing: border-box;

          background: linear-gradient(180deg, rgba(18, 22, 32, 0.92), rgba(12, 16, 24, 0.96));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .panel-side {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
        }

        .inspect {
          height: 38px;
          padding: 0 26px;

          outline: unset;
          border-radius: 6px;
          background: linear-gradient(180deg, rgba(30, 36, 47, 0.9), rgba(22, 27, 37, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);

          color: #c3cad6;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 12px;
          font-weight: 700;

          position: relative;
          cursor: pointer;
          transition: all .2s ease;
        }

        .inspect:hover {
          color: #FFF;
          border-color: rgba(31, 214, 95, 0.35);
          background: rgba(31, 214, 95, 0.07);
          transform: translateY(-1px);
          box-shadow: 0 0 14px rgba(31, 214, 95, 0.1);
        }

        .mode-chips {
          display: flex;
          gap: 6px;
        }

        .chip {
          width: 32px;
          height: 32px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;
          background: rgba(30, 36, 47, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);

          color: #8b92a0;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 9px;
          font-weight: 700;
          transition: all .2s ease;
        }

        .chip:hover {
          border-color: rgba(31, 214, 95, 0.25);
          background: rgba(31, 214, 95, 0.04);
        }

        .chip.text {
          width: auto;
          padding: 0 8px;
          font-size: 10px;
        }

        .chip.crazy {
          border-color: rgba(232, 161, 74, 0.35);
        }

        .chip.crazy:hover {
          border-color: rgba(232, 161, 74, 0.5);
        }

        .chip.funding {
          width: auto;
          padding: 0 7px;
          color: #1fd65f;
          border-color: rgba(31, 214, 95, 0.3);
        }

        .chip.rolling {
          width: auto;
          padding: 0 6px;
          border-color: rgba(31, 214, 95, 0.3);
        }

        .cases {
          flex: 1;
          min-width: 0;

          display: flex;
          align-items: center;
          gap: 8px;

          overflow-x: auto;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
          padding-bottom: 2px;
        }

        .case-tile {
          width: 96px;
          height: 96px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;
          background: linear-gradient(180deg, rgba(22, 28, 38, 0.95), rgba(15, 20, 28, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
          transition: all .25s ease;
        }

        .case-tile:hover {
          border-color: rgba(31, 214, 95, 0.35);
          transform: scale(1.04) translateY(-2px);
          box-shadow: 0 0 20px rgba(31, 214, 95, 0.16), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .case-tile img {
          max-width: 86px;
          max-height: 86px;
          object-fit: contain;
          filter: drop-shadow(0 8px 12px rgba(0,0,0,.35));
          transition: filter .25s ease;
        }

        .case-tile:hover img {
          filter: drop-shadow(0 10px 16px rgba(31,214,95,.12)) drop-shadow(0 8px 12px rgba(0,0,0,.35));
        }

        .case-tile img.fallback {
          width: 42px;
          height: 42px;
          opacity: .34;
          filter: grayscale(1);
        }

        .cases::-webkit-scrollbar {
          height: 3px;
        }

        .cases::-webkit-scrollbar-track {
          background: transparent;
        }

        .cases::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.12);
        }

        @media only screen and (max-width: 800px) {
          .battle-preview-container {
            flex-direction: column;
            border-radius: 10px;
          }

          .left-col {
            min-width: 0;
          }
        }

        @media only screen and (max-width: 560px) {
          .battle-preview-container { padding: 10px; gap: 10px; }
          .bottom-row { align-items: stretch; }
          .drops-box { min-width: 0; }
          .cases-panel { flex-direction: column; }
          .panel-side { flex-direction: row; align-items: center; }
          .inspect { padding: 0 18px; }
          .cases { width: 100%; }
          .case-tile { width: 82px; height: 82px; }
          .case-tile img { max-width: 72px; max-height: 72px; }
        }
      `}</style>
    </>
  );
}

export default BattlePreview;
