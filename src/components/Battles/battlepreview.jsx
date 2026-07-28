import {createEffect, createSignal, For} from "solid-js";
import Avatar from "../Level/avatar";
import {getCents} from "../../util/balance";
import {A, useNavigate} from "@solidjs/router";
import {authedAPI} from "../../util/api";
import {resolveImageSrc} from "../../util/image";

function BattlePreview(props) {

  const navigate = useNavigate()
  const [state, setState] = createSignal('waiting')
  const [joining, setJoining] = createSignal(false)

  createEffect(() => {
    if (state() === 'finished') return
    if (!props?.battle?.startedAt) return setState('waiting')
    if (!props?.battle?.endedAt) return setState('rolling')
    setState('finished')
  })

  function getType() {
    if (props?.battle?.gamemode === 'group') return 'Group'
    if (props?.battle?.gamemode === 'crazy') return 'Crazy'
    if (props?.battle?.gamemode === 'casual') return 'Case'
    if (props?.battle?.gamemode === 'standard') return 'Standard'
    if (props?.battle?.playersPerTeam === 2 && props?.battle?.teams === 2) return '2v2'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 4) return '1v1v1v1'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 3) return '1v1v1'
    if (props?.battle?.playersPerTeam === 1 && props?.battle?.teams === 1) return '1v1'
    return Array(props?.battle?.teams).fill(props?.battle?.playersPerTeam).join('v')
  }

  function getCase(id) {
    return props?.battle?.cases?.find(c => id === c.id)
  }

  function getFirstAvailableSlot() {
    return props?.battle?.players?.findIndex(user => user === null) + 1
  }

  function maxPlayers() {
    return (props?.battle?.playersPerTeam || 0) * (props?.battle?.teams || 0)
  }

  function filledSlots() {
    return props?.battle?.players?.filter(Boolean).length || 0
  }

  function isFull() {
    return maxPlayers() > 0 && filledSlots() >= maxPlayers()
  }

  function potValue() {
    return Number(props?.battle?.entryPrice || 0) * maxPlayers()
  }

  function statusKind() {
    if (state() === 'rolling') return 'live'
    if (state() === 'finished') return 'ended'
    if (isFull()) return 'full'
    return 'starting'
  }

  function statusText() {
    if (state() === 'rolling') return 'Live'
    if (state() === 'finished') return 'Ended'
    if (isFull()) return 'Full'
    return 'Starting'
  }

  function battleHref() {
    return `/battle/${props.battle.id}${props?.battle?.privKey ? `?pk=${props?.battle?.privKey}` : ''}`
  }

  function previewCases() {
    return (props?.battle?.rounds || []).slice(0, 3)
  }

  function useImageFallback(event) {
    event.currentTarget.onerror = null
    event.currentTarget.src = '/assets/logo/cosmic-luck-logo.png'
    event.currentTarget.classList.add('fallback')
  }

  async function joinBattle() {
    const slot = getFirstAvailableSlot()
    if (!slot || joining()) return

    setJoining(true)
    try {
      const res = await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({
        slot,
        privKey: props?.battle?.privKey
      }), true)

      if (!res.success) return
      props?.ws?.emit('battles:subscribe', props?.battle?.id, props?.battle?.privKey)
      navigate(battleHref())
    } finally {
      setJoining(false)
    }
  }

  return (
    <>
      {props?.battle && (
        <article class={'battle-card ' + statusKind()}>
          <div class='card-topline'>
            <div class={'status-badge ' + statusKind()}>
              <span class='status-indicator'/>
              {statusText()}
            </div>

            <div class='battle-meta'>
              <span class='mode-badge'>{getType()}</span>
              <span>{props?.battle?.rounds?.length || 0} rounds</span>
            </div>
          </div>

          <div class='case-stage'>
            <div class='stage-grid'/>
            <div class='case-halo'/>
            <div class='case-stack'>
              <For each={previewCases()}>{(round, index) => (
                <div class={'case-art case-' + index()}>
                  <img
                    src={resolveImageSrc(getCase(round?.caseId)?.img, '/assets/logo/cosmic-luck-logo.png')}
                    alt={getCase(round?.caseId)?.name || 'Battle case'}
                    onError={useImageFallback}
                  />
                </div>
              )}</For>
            </div>
            <span class='case-count'>{props?.battle?.rounds?.length || 0} CASES</span>
          </div>

          <div class='economy-row'>
            <div class='pot-block'>
              <span>Battle pot</span>
              <strong>
                <img src='/assets/chips/chip-green.png' height='22' width='22' alt=''/>
                {Math.floor(potValue())}<small>.{getCents(potValue())}</small>
              </strong>
            </div>

            <div class='entry-block'>
              <span>Entry</span>
              <strong>{Number(props?.battle?.entryPrice || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div class='players-section'>
            <div class='players-heading'>
              <span>Players</span>
              <strong>{filledSlots()} / {maxPlayers()}</strong>
            </div>

            <div class='seat-progress' style={{ '--seat-progress': `${maxPlayers() ? (filledSlots() / maxPlayers()) * 100 : 0}%` }}>
              <span/>
            </div>

            <div class='teams'>
              <For each={new Array(props?.battle?.teams)}>{(_, teamIndex) => (
                <div class='team'>
                  <For each={new Array(props?.battle?.playersPerTeam)}>{(_, playerIndex) => {
                    const player = props?.battle?.players[playerIndex() + (teamIndex() * props?.battle?.playersPerTeam)]
                    return (
                      <div class={'slot ' + (player ? 'occupied' : 'available')} title={player?.username || 'Open seat'}>
                        {player ? (
                          <Avatar height={42} xp={player?.xp || 0} id={player?.id}/>
                        ) : (
                          <svg viewBox='0 0 24 24' aria-hidden='true'>
                            <path d='M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2Zm-4 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-7 6h6v1.5H9V16Z'/>
                          </svg>
                        )}
                      </div>
                    )
                  }}</For>
                  {teamIndex() < props?.battle?.teams - 1 && <span class='versus'>{props?.battle?.gamemode === 'group' ? '+' : 'VS'}</span>}
                </div>
              )}</For>
            </div>
          </div>

          <div class='card-footer'>
            <div class='condition-chips'>
              {props?.battle?.ownerFunding > 0 && <span class='funded'>-{props?.battle?.ownerFunding}% funded</span>}
              {props?.battle?.privKey && <span>Private</span>}
              {!props?.battle?.ownerFunding && !props?.battle?.privKey && <span>Public</span>}
            </div>

            {(!props?.battle?.startedAt && !props?.hasJoined && !isFull()) ? (
              <button class='action-btn join' type='button' onClick={joinBattle} disabled={joining()}>
                {joining() ? 'Joining...' : 'Join Battle'}
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m9 18 6-6-6-6'/></svg>
              </button>
            ) : (
              <button class='action-btn watch' type='button'>
                <A class='gamemode-link' href={battleHref()}/>
                {state() === 'finished' ? 'View Result' : 'Watch Battle'}
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z'/><circle cx='12' cy='12' r='2.5'/></svg>
              </button>
            )}
          </div>
        </article>
      )}

      <style jsx>{`
        .battle-card {
          width: 100%;
          min-width: 0;
          min-height: 470px;
          display: flex;
          flex-direction: column;
          padding: 16px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-card);
          background: linear-gradient(155deg, rgba(23, 27, 24, 0.98), rgba(11, 13, 12, 0.99));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 14px 36px rgba(0, 0, 0, .22);
          overflow: hidden;
          position: relative;
          isolation: isolate;
          transition: transform .25s cubic-bezier(.22,.8,.24,1), border-color .25s ease, box-shadow .25s ease;
        }

        .battle-card::before {
          content: '';
          position: absolute;
          inset: 0 0 auto;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(34, 197, 94, .8), transparent);
          opacity: .45;
          z-index: 3;
        }

        .battle-card:hover {
          transform: translateY(-5px) scale(1.006);
          border-color: rgba(74, 222, 128, .3);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), var(--shadow-emerald), 0 22px 46px rgba(0, 0, 0, .3);
        }

        .battle-card.live::before {
          opacity: 1;
          animation: live-scan 2.4s ease-in-out infinite;
        }

        .card-topline,
        .battle-meta,
        .economy-row,
        .players-heading,
        .card-footer,
        .condition-chips { display: flex; align-items: center; }

        .card-topline { justify-content: space-between; gap: 12px; min-height: 27px; position: relative; z-index: 2; }

        .status-badge,
        .mode-badge,
        .condition-chips span {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-badge { height: 26px; gap: 6px; padding: 0 10px; background: rgba(255,255,255,.035); color: #c3cbc5; }
        .status-badge.live { color: var(--color-emerald-bright); border-color: rgba(34,197,94,.3); background: rgba(34,197,94,.09); }
        .status-badge.full { color: var(--color-premium); border-color: rgba(246,196,83,.3); background: rgba(246,196,83,.08); }
        .status-badge.ended { color: var(--color-copy-muted); }
        .status-indicator { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        .battle-meta { gap: 8px; color: var(--color-copy-muted); font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .mode-badge { height: 24px; padding: 0 9px; color: var(--color-copy); background: rgba(255,255,255,.04); }

        .case-stage {
          height: 184px;
          margin: 14px 0 12px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 14px;
          background: radial-gradient(circle at 50% 58%, rgba(34,197,94,.11), transparent 48%), #0b0d0c;
          position: relative;
          overflow: hidden;
        }

        .stage-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(to bottom, transparent, black 40%, transparent);
        }

        .case-halo { position: absolute; left: 50%; bottom: 22px; width: 190px; height: 55px; border-radius: 50%; background: rgba(34,197,94,.13); filter: blur(18px); transform: translateX(-50%); }
        .case-stack { position: absolute; inset: 12px 22px 20px; display: flex; align-items: center; justify-content: center; }

        .case-art {
          width: 148px;
          height: 138px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          border-bottom: 2px solid var(--case-accent, #22c55e);
          transition: transform .28s ease, filter .28s ease;
        }

        .case-art::after { content: ''; position: absolute; right: 14px; bottom: -2px; left: 14px; height: 16px; background: var(--case-accent, #22c55e); opacity: .25; filter: blur(11px); }
        .case-art img { width: 138px; height: 126px; object-fit: contain; filter: drop-shadow(0 14px 14px rgba(0,0,0,.5)); z-index: 1; }
        .case-art img.fallback { width: 64px; height: 64px; opacity: .35; filter: grayscale(1); }
        .case-0 { --case-accent: #f6c453; z-index: 3; }
        .case-1 { --case-accent: #dc5fde; transform: translateX(-82px) rotate(-7deg) scale(.76); z-index: 1; opacity: .7; }
        .case-2 { --case-accent: #4176ff; transform: translateX(82px) rotate(7deg) scale(.76); z-index: 2; opacity: .7; }
        .battle-card:hover .case-0 { transform: translateY(-5px) scale(1.04); filter: drop-shadow(0 0 14px rgba(246,196,83,.16)); }
        .battle-card:hover .case-1 { transform: translate(-88px, -2px) rotate(-9deg) scale(.78); }
        .battle-card:hover .case-2 { transform: translate(88px, -2px) rotate(9deg) scale(.78); }

        .case-count { position: absolute; right: 10px; bottom: 9px; padding: 5px 7px; border-radius: 6px; background: rgba(0,0,0,.5); color: var(--color-copy-muted); font-size: 8px; font-weight: 800; }
        .economy-row { justify-content: space-between; gap: 14px; padding-bottom: 13px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .pot-block, .entry-block { display: flex; flex-direction: column; gap: 4px; }
        .pot-block > span, .entry-block > span { color: var(--color-copy-muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }
        .pot-block strong { display: flex; align-items: center; gap: 7px; color: var(--color-copy); font-size: 23px; line-height: 1; }
        .pot-block strong img { filter: drop-shadow(0 0 9px rgba(34,197,94,.45)); }
        .pot-block small { color: var(--color-copy-muted); font-size: 14px; }
        .entry-block { align-items: flex-end; }
        .entry-block strong { color: var(--color-emerald-bright); font-size: 14px; }

        .players-section { padding: 13px 0; }
        .players-heading { justify-content: space-between; color: var(--color-copy-muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }
        .players-heading strong { color: var(--color-copy); font-size: 10px; }
        .seat-progress { height: 3px; margin: 7px 0 11px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; }
        .seat-progress span { display: block; width: var(--seat-progress); height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--color-emerald-deep), var(--color-emerald-bright)); box-shadow: 0 0 9px rgba(34,197,94,.55); transition: width .3s ease; }

        .teams { display: flex; align-items: center; gap: 7px; overflow-x: auto; padding: 1px; }
        .team { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .slot { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.09); border-radius: 11px; background: #171a18; overflow: hidden; transition: border-color .2s ease, background .2s ease; }
        .slot.available { border-style: dashed; color: rgba(74,222,128,.62); }
        .slot.available:hover { border-color: rgba(74,222,128,.5); background: rgba(34,197,94,.08); }
        .slot svg { width: 20px; height: 20px; fill: currentColor; }
        .versus { margin-left: 2px; color: #6c756f; font-size: 8px; font-weight: 900; }

        .card-footer { flex-direction: column; align-items: stretch; gap: 12px; margin-top: auto; }
        .condition-chips { min-height: 20px; gap: 6px; }
        .condition-chips span { min-height: 20px; padding: 0 7px; color: var(--color-copy-muted); font-size: 7px; }
        .condition-chips .funded { color: var(--color-premium); border-color: rgba(246,196,83,.22); background: rgba(246,196,83,.06); }

        .action-btn {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: var(--radius-control);
          background: #1a1e1b;
          color: var(--color-copy);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 11px;
          font-weight: 900;
          position: relative;
          cursor: pointer;
          transition: transform .18s ease, filter .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        .action-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .action-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.2); }
        .action-btn.join { border-color: rgba(74,222,128,.42); background: linear-gradient(135deg, var(--color-emerald-bright), var(--color-emerald)); color: #041b0c; box-shadow: 0 8px 24px rgba(34,197,94,.23), inset 0 1px 0 rgba(255,255,255,.26); }
        .action-btn.join:hover { filter: brightness(1.08); box-shadow: var(--shadow-emerald-strong), inset 0 1px 0 rgba(255,255,255,.3); }
        .action-btn:disabled { cursor: wait; opacity: .7; transform: none; }
        .action-btn.watch:hover { color: var(--color-emerald-bright); border-color: rgba(34,197,94,.32); background: rgba(34,197,94,.07); }

        @keyframes live-scan {
          0%, 100% { transform: translateX(-35%); opacity: .45; }
          50% { transform: translateX(35%); opacity: 1; }
        }

        @media only screen and (max-width: 560px) {
          .battle-card { min-height: 458px; padding: 13px; border-radius: 14px; }
          .case-stage { height: 174px; margin-top: 12px; }
          .case-art { width: 138px; height: 128px; }
          .case-art img { width: 128px; height: 116px; }
          .pot-block strong { font-size: 21px; }
          .action-btn { min-height: 50px; }
        }

        @media (hover: none) {
          .battle-card:hover { transform: none; }
          .battle-card:hover .case-0 { transform: none; }
          .battle-card:hover .case-1 { transform: translateX(-82px) rotate(-7deg) scale(.76); }
          .battle-card:hover .case-2 { transform: translateX(82px) rotate(7deg) scale(.76); }
        }

        @media (prefers-reduced-motion: reduce) {
          .battle-card,
          .case-art,
          .seat-progress span,
          .action-btn { transition: none; }
          .battle-card.live::before { animation: none; }
        }
      `}</style>
    </>
  );
}

export default BattlePreview;