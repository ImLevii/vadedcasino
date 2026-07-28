import {createSignal, For, Show, createMemo} from "solid-js";
import {A, useNavigate} from "@solidjs/router";
import Avatar from "../Level/avatar";
import {getCents} from "../../util/balance";
import {authedAPI} from "../../util/api";
import {resolveImageSrc} from "../../util/image";

function BotIcon(props) {
  return (
    <svg viewBox='0 0 24 24' width={props.size || 16} height={props.size || 16} fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='5' y='9' width='14' height='11' rx='2.5' stroke='currentColor' stroke-width='1.7'/>
      <path d='M12 9V5.5' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'/>
      <circle cx='12' cy='4' r='1.4' fill='currentColor'/>
      <circle cx='9' cy='14.5' r='1.4' fill='currentColor'/>
      <circle cx='15' cy='14.5' r='1.4' fill='currentColor'/>
      <path d='M9 18h6' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'/>
      <path d='M2.5 12.5v3M21.5 12.5v3' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'/>
    </svg>
  )
}

function BattleRow(props) {

  const navigate = useNavigate()
  const [joining, setJoining] = createSignal(false)

  function isBotPlayer(player) {
    return !!(player?.bot || player?.isBot || String(player?.type || '').toUpperCase() === 'BOT')
  }

  function isGroup() {
    return props?.battle?.gamemode === 'group'
  }

  function teams() {
    const perTeam = props?.battle?.playersPerTeam || 1
    const teamCount = props?.battle?.teams || 1
    const list = props?.battle?.players || []
    const out = []
    for (let t = 0; t < teamCount; t++) {
      out.push(list.slice(t * perTeam, (t + 1) * perTeam))
    }
    return out
  }

  function getCase(id) {
    return props?.battle?.cases?.find(c => id === c.id)
  }

  function rounds() {
    return props?.battle?.rounds || []
  }

  function activeRoundIndex() {
    if (state() !== 'rolling') return -1
    return (props?.battle?.round || 1) - 1
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

  const state = createMemo(() => {
    if (props?.battle?.endedAt) return 'finished'
    if (props?.battle?.startedAt) return 'rolling'
    return 'waiting'
  })

  function statusKind() {
    if (state() === 'rolling') return 'live'
    if (state() === 'finished') return 'ended'
    if (isFull()) return 'full'
    return 'starting'
  }

  function potValue() {
    return Number(props?.battle?.entryPrice || 0) * maxPlayers()
  }

  function battleHref() {
    return `/battle/${props.battle.id}${props?.battle?.privKey ? `?pk=${props?.battle?.privKey}` : ''}`
  }

  function badges() {
    const list = []
    if (props?.battle?.gamemode === 'crazy') list.push({label: 'Crazy', kind: 'crazy'})
    if (props?.battle?.gamemode === 'group') list.push({label: 'Group', kind: 'group'})
    if (props?.battle?.cosmicSpin) list.push({label: 'Cosmic', kind: 'cosmic'})
    if (props?.battle?.ownerFunding > 0) list.push({label: `${props?.battle?.ownerFunding}% funded`, kind: 'funded'})
    if (props?.battle?.privKey) list.push({label: 'Private', kind: 'private'})
    while (list.length < 4) list.push(null)
    return list.slice(0, 4)
  }

  function badgeIcon(kind) {
    if (kind === 'crazy') return <path d='M4 20 20 4M4 4l16 16' stroke='currentColor' stroke-width='2' stroke-linecap='round'/>
    if (kind === 'group') return <path d='M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' fill='none'/>
    if (kind === 'cosmic') return <path d='m12 2 2.2 6.8H21l-5.6 4.1L17.6 20 12 15.9 6.4 20l2.2-7.1L3 8.8h6.8L12 2Z' stroke='currentColor' stroke-width='1.6' stroke-linejoin='round' fill='none'/>
    if (kind === 'funded') return <path d='M12 2v20M17 6.5H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/>
    if (kind === 'private') return <><rect x='5' y='11' width='14' height='9' rx='2' stroke='currentColor' stroke-width='1.7'/><path d='M8 11V7a4 4 0 0 1 8 0v4' stroke='currentColor' stroke-width='1.7'/></>
    return null
  }

  async function joinBattle() {
    const slot = props?.battle?.players?.findIndex(u => u === null) + 1
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
        <div class={'battle-row ' + statusKind()}>
          <div class='left'>
            <div class='avatar-row'>
              <For each={teams()}>{(team, teamIndex) => (
                <>
                  <div class='team'>
                    <For each={team}>{(player) => (
                      <div class={'slot ' + (player ? (isBotPlayer(player) ? 'bot' : 'user') : 'empty')} title={player?.username || 'Open seat'}>
                        {player ? (
                          isBotPlayer(player) ? <BotIcon size={16}/> : <Avatar id={player?.id} xp={player?.xp || 0} height={30}/>
                        ) : (
                          <span class='dash'/>
                        )}
                      </div>
                    )}</For>
                  </div>
                  {!isGroup() && teamIndex() < teams().length - 1 && <span class='vs'>VS</span>}
                  {isGroup() && teamIndex() < teams().length - 1 && <span class='plus'>+</span>}
                </>
              )}</For>
            </div>

            <div class='drops-row'>
              <span class='drops-label'>Drops</span>
              <span class='drops-amount'>
                <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                {Math.floor(potValue())}.{getCents(potValue())}
              </span>

              {statusKind() === 'starting' ? (
                <button class='action join' type='button' onClick={joinBattle} disabled={joining()}>
                  {joining() ? 'Joining…' : 'Join'}
                </button>
              ) : (
                <button class='action watch' type='button'>
                  <svg viewBox='0 0 24 24' width='13' height='13' fill='none' aria-hidden='true'><path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z' stroke='currentColor' stroke-width='1.8'/><circle cx='12' cy='12' r='2.5' stroke='currentColor' stroke-width='1.8'/></svg>
                  {state() === 'finished' ? 'See Result' : 'Watch'}
                  <A class='gamemode-link' href={battleHref()}/>
                </button>
              )}
            </div>
          </div>

          <div class='mid'>
            <button class='inspect' type='button'>
              Inspect
              <A class='gamemode-link' href={battleHref()}/>
            </button>

            <div class='badge-row'>
              <For each={badges()}>{(badge) => (
                <div class={'badge ' + (badge ? 'active ' + badge.kind : 'empty')} title={badge?.label || ''}>
                  {badge && (
                    <svg viewBox='0 0 24 24' width='13' height='13'>{badgeIcon(badge.kind)}</svg>
                  )}
                </div>
              )}</For>
            </div>
          </div>

          <div class='cases scroll-thin'>
            <For each={rounds()}>{(round, index) => {
              const c = getCase(round?.caseId)
              return (
                <div class={'case-thumb ' + (index() === activeRoundIndex() ? 'active' : '')}>
                  <Show when={index() === activeRoundIndex()}>
                    <span class='marker top'/>
                    <span class='marker bottom'/>
                  </Show>
                  <img src={resolveImageSrc(c?.img, '/assets/logo/cosmic-luck-logo.png')} alt='' draggable={false}/>
                </div>
              )
            }}</For>
          </div>
        </div>
      )}

      <style jsx>{`
        .battle-row {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: stretch;
          gap: 18px;

          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-card);
          background: linear-gradient(160deg, rgba(19, 23, 20, 0.96), rgba(10, 12, 11, 0.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .battle-row.live {
          border-color: rgba(34, 197, 94, .3);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 0 0 1px rgba(34,197,94,.06), var(--shadow-emerald);
        }

        .left {
          flex: 0 0 auto;
          width: min(320px, 34vw);
          min-width: 220px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
        }

        .avatar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .team {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .slot {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .slot.bot {
          border: 1px solid rgba(34, 197, 94, 0.4);
          background: rgba(34, 197, 94, 0.1);
          color: var(--color-emerald-bright);
        }

        .slot.empty {
          border: 1px dashed rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.02);
        }

        .slot .dash {
          width: 10px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.18);
        }

        .vs {
          padding: 2px 6px;
          color: var(--color-copy-muted);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .04em;
        }

        .plus {
          color: var(--color-copy-muted);
          font-size: 13px;
          font-weight: 700;
        }

        .drops-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
        }

        .drops-label {
          color: var(--color-copy-muted);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .drops-amount {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--color-copy);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 13px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .action {
          margin-left: auto;
          min-height: 34px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--radius-control);
          border: 1px solid rgba(255,255,255,.1);
          background: #171a18;
          color: var(--color-copy);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 11px;
          font-weight: 800;
          position: relative;
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease, color .18s ease;
        }

        .action.watch:hover {
          border-color: rgba(34,197,94,.35);
          color: var(--color-emerald-bright);
          background: rgba(34,197,94,.07);
        }

        .action.join {
          border-color: rgba(74, 222, 128, .42);
          background: linear-gradient(135deg, var(--color-emerald-bright), var(--color-emerald));
          color: #041b0c;
        }

        .action.join:hover {
          filter: brightness(1.08);
        }

        .action.join:disabled {
          cursor: wait;
          opacity: .7;
        }

        .mid {
          flex: 0 0 auto;
          width: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }

        .inspect {
          min-height: 34px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-control);
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          color: var(--color-copy-muted);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 11px;
          font-weight: 700;
          position: relative;
          cursor: pointer;
          transition: border-color .18s ease, color .18s ease, background .18s ease;
        }

        .inspect:hover {
          color: var(--color-copy);
          border-color: rgba(255,255,255,.16);
          background: rgba(255,255,255,.05);
        }

        .badge-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .badge {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge.empty {
          border: 1px solid rgba(255,255,255,.05);
          background: rgba(255,255,255,.015);
        }

        .badge.active {
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          color: var(--color-copy-muted);
        }

        .badge.active.crazy { border-color: rgba(255,81,65,.4); background: rgba(255,81,65,.1); color: #ff6a5c; }
        .badge.active.group { border-color: rgba(34,197,94,.4); background: rgba(34,197,94,.1); color: var(--color-emerald-bright); }
        .badge.active.cosmic { border-color: rgba(220,95,222,.4); background: rgba(220,95,222,.1); color: #dc5fde; }
        .badge.active.funded { border-color: rgba(246,196,83,.4); background: rgba(246,196,83,.1); color: var(--color-premium); }
        .badge.active.private { border-color: rgba(65,118,255,.4); background: rgba(65,118,255,.1); color: #4176ff; }

        .cases {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 2px;
        }

        .case-thumb {
          flex: 0 0 auto;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.07);
          background: linear-gradient(160deg, #14181a, #0d1010);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .case-thumb img {
          width: 80%;
          height: 80%;
          object-fit: contain;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,.5));
        }

        .case-thumb.active {
          border-color: rgba(34,197,94,.6);
          box-shadow: 0 0 0 1px rgba(34,197,94,.2), 0 0 16px rgba(34,197,94,.18);
        }

        .marker {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 3px;
          border-radius: 999px;
          background: var(--color-emerald-bright);
          box-shadow: 0 0 8px rgba(34,197,94,.8);
        }

        .marker.top { top: -6px; }
        .marker.bottom { bottom: -6px; }

        @media only screen and (max-width: 900px) {
          .battle-row { flex-wrap: wrap; }
          .left { width: 100%; }
          .mid { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; }
          .inspect { flex: 1; }
          .cases { width: 100%; }
        }

        @media only screen and (max-width: 520px) {
          .battle-row { padding: 12px; gap: 10px; }
          .case-thumb { width: 52px; height: 52px; }
        }
      `}</style>
    </>
  );
}

export default BattleRow;
