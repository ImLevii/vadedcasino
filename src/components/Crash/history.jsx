import { For } from 'solid-js';

function CrashHistory(props) {
  return (
    <>
      <div class='crash-history'>
        <For each={props.history || []}>
          {(multiplier, index) => (
            <div 
              class={'history-item ' + (multiplier <= 1 ? 'bust' : multiplier >= 10 ? 'high' : multiplier < 2 ? 'low' : 'win')}
              style={{ opacity: 1 - (index() * 0.03) }}
            >
              {multiplier.toFixed(2)}x
            </div>
          )}
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

        .history-item.bust {
          background: rgba(255, 81, 65, 0.15);
          color: #ff5141;
          border: 1px solid rgba(255, 81, 65, 0.3);
        }

        .history-item.win {
          background: rgba(31, 214, 95, 0.08);
          color: #1fd65f;
          border: 1px solid rgba(31, 214, 95, 0.18);
        }

        .history-item.low {
          background: rgba(255, 184, 74, .065);
          color: #d9a654;
          border: 1px solid rgba(255,184,74,.14);
        }

        .history-item.high {
          background: rgba(65,118,255,.1);
          color: #80a2ff;
          border: 1px solid rgba(65,118,255,.2);
          box-shadow: 0 0 14px rgba(65,118,255,.08);
        }
      `}</style>
    </>
  );
}

export default CrashHistory;
