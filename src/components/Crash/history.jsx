import { For } from 'solid-js';

function CrashHistory(props) {
  return (
    <>
      <div class='crash-history'>
        <For each={props.history || []}>
          {(multiplier, index) => {
            // Tier: under2x=amber, 2-5x=green, 5-10x=cyan/teal, 10x+=gold/purple
            const tier = multiplier < 2 ? 'low'
              : multiplier < 5 ? 'win'
              : multiplier < 10 ? 'teal'
              : 'jackpot';
            return (
              <div
                class={'history-item ' + tier}
                style={{ opacity: 1 - (index() * 0.025) }}
              >
                {multiplier.toFixed(2)}x
              </div>
            );
          }}
        </For>
      </div>

      <style jsx>{`
        .crash-history {
          min-width: 0;
          width: 100%;
          display: flex;
          gap: 6px;
          padding: 8px 0;
          overflow-x: auto;
          overflow-y: hidden;
          flex-wrap: nowrap;
          scrollbar-width: none;
        }

        .crash-history::-webkit-scrollbar {
          display: none;
        }

        .history-item {
          min-width: 61px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 10px;
          font-weight: 700;
          transition: opacity 0.3s;
        }

        /* Under 2x — muted amber */
        .history-item.low {
          background: rgba(255, 184, 74, 0.07);
          color: #b8803a;
          border: 1px solid rgba(255, 184, 74, 0.14);
        }

        /* 2x–5x — green */
        .history-item.win {
          background: rgba(31, 214, 95, 0.08);
          color: #1fd65f;
          border: 1px solid rgba(31, 214, 95, 0.2);
        }

        /* 5x–10x — cyan/teal */
        .history-item.teal {
          background: rgba(0, 210, 180, 0.09);
          color: #00d2b4;
          border: 1px solid rgba(0, 210, 180, 0.22);
          box-shadow: 0 0 10px rgba(0, 210, 180, 0.07);
        }

        /* 10x+ — gold/purple jackpot */
        .history-item.jackpot {
          background: linear-gradient(135deg, rgba(255, 184, 74, 0.12), rgba(168, 85, 247, 0.1));
          color: #f5c842;
          border: 1px solid rgba(255, 184, 74, 0.28);
          box-shadow: 0 0 14px rgba(255, 184, 74, 0.12), 0 0 24px rgba(168, 85, 247, 0.06);
          font-size: 11px;
        }
      `}</style>
    </>
  );
}

export default CrashHistory;
