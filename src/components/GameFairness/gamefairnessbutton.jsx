import { A } from '@solidjs/router';

function ShieldCheckIcon() {
  return (
    <svg aria-hidden='true' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
      <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
      <path d='m9 12 2 2 4-4' stroke-linecap='round' stroke-linejoin='round'/>
    </svg>
  );
}

export function GameFairnessButton(props) {
  return (
    <>
      <A
        href='/docs/provably'
        class={`game-fairness-button ${props.compact ? 'compact' : ''} ${props.class || ''}`}
        aria-label={props.compact ? 'Open game fairness documentation' : undefined}
      >
        <ShieldCheckIcon/>
        {!props.compact && <span>{props.label || 'Game Fairness'}</span>}
      </A>

      <style jsx>{`
        .game-fairness-button {
          min-height: 34px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          box-sizing: border-box;
          border: 1px solid rgba(31, 214, 95, .22);
          border-radius: 7px;
          background: #111820;
          color: #aab4c2;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease;
        }

        .game-fairness-button svg {
          flex: 0 0 auto;
          color: #1fd65f;
        }

        .game-fairness-button:hover {
          border-color: rgba(31, 214, 95, .52);
          background: #141e26;
          color: #f2f5f7;
          transform: translateY(-1px);
        }

        .game-fairness-button:focus-visible {
          outline: 2px solid #1fd65f;
          outline-offset: 2px;
        }

        .game-fairness-button:active { transform: translateY(0); }
        .game-fairness-button.compact { width: 34px; padding: 0; }

        @media (prefers-reduced-motion: reduce) {
          .game-fairness-button { transition: none; }
        }
      `}</style>
    </>
  );
}

const GAME_PATHS = [
  '/roulette', '/mines', '/cases', '/battles', '/battle', '/coinflip', '/slots'
];

export function GameFairnessDock(props) {
  const visible = () => GAME_PATHS.some((path) => props.pathname === path || props.pathname.startsWith(`${path}/`));

  return visible() ? (
    <div class='game-fairness-dock'>
      <GameFairnessButton/>
      <style jsx>{`
        .game-fairness-dock {
          position: fixed;
          z-index: 30;
          top: 82px;
          right: 18px;
        }

        @media (max-width: 760px) {
          .game-fairness-dock { top: 72px; right: 10px; }
        }
      `}</style>
    </div>
  ) : null;
}

export default GameFairnessButton;
