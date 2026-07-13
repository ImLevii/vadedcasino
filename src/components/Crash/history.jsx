import { For } from 'solid-js';

function CrashHistory(props) {
  return (
    <>
      <div class='crash-history'>
        <For each={props.history || []}>
          {(multiplier, index) => (
            <div 
              class={'history-item ' + (multiplier === 1.00 ? 'bust' : 'win')}
              style={{ opacity: 1 - (index() * 0.03) }}
            >
              {multiplier.toFixed(2)}x
            </div>
          )}
        </For>
      </div>

      <style jsx>{`
        .crash-history {
          display: flex;
          gap: 8px;
          padding: 12px 0;
          overflow-x: auto;
          overflow-y: hidden;
          flex-wrap: nowrap;
          scrollbar-width: none;
        }

        .crash-history::-webkit-scrollbar {
          display: none;
        }

        .history-item {
          min-width: 70px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          transition: opacity 0.3s;
        }

        .history-item.bust {
          background: rgba(255, 81, 65, 0.15);
          color: #ff5141;
          border: 1px solid rgba(255, 81, 65, 0.3);
        }

        .history-item.win {
          background: rgba(31, 214, 95, 0.15);
          color: #1fd65f;
          border: 1px solid rgba(31, 214, 95, 0.3);
        }
      `}</style>
    </>
  );
}

export default CrashHistory;
