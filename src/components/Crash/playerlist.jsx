import { For, Show } from 'solid-js';
import Avatar from '../Level/avatar';
import Level from '../Level/level';

function CrashPlayerList(props) {
  function getBetState(bet) {
    if (bet.cashoutPoint) return 'won';
    if (props.isCrashed) return 'lost';
    return 'playing';
  }

  return (
    <>
      <div class='crash-player-list'>
        <div class='player-list-header'>
          <p>{props.bets?.length || 0} Players</p>
        </div>

        <div class='player-list-body'>
          <For each={props.bets || []}>
            {(bet) => {
              const state = getBetState(bet);
              const isCurrentUser = bet.user?.id === props.userId;

              return (
                <div class={'player-row ' + state + (isCurrentUser ? ' current-user' : '')}>
                  <div class='player-info'>
                    <Avatar id={bet.user?.id} xp={bet.user?.xp || 0} height={28} />
                    <Level xp={bet.user?.xp || 0} />
                    <p class='username'>{bet.user?.username || 'Anonymous'}</p>
                  </div>

                  <div class='player-bet-info'>
                    <Show when={bet.cashoutPoint}>
                      <p class='multiplier'>{bet.cashoutPoint.toFixed(2)}x</p>
                    </Show>
                    <div class='payout'>
                      <img src='/assets/icons/coin.svg' height='14' width='14' alt='' />
                      <p class={state === 'won' ? 'green' : state === 'lost' ? 'red' : 'muted'}>
                        {state === 'won' && '+'}
                        {state === 'lost' && '-'}
                        {(bet.winnings || bet.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <style jsx>{`
        .crash-player-list {
          min-width: 330px;
          width: 330px;
          background: rgba(26, 31, 41, 0.6);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(10px);
        }

        .player-list-header {
          height: 48px;
          background: rgba(31, 37, 50, 0.8);
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .player-list-header p {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #8b92a0;
          text-transform: uppercase;
        }

        .player-list-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .player-list-body::-webkit-scrollbar {
          width: 4px;
        }

        .player-list-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .player-list-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .player-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          transition: background 0.2s;
        }

        .player-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .player-row.current-user {
          background: rgba(31, 214, 95, 0.08);
        }

        .player-row.current-user:hover {
          background: rgba(31, 214, 95, 0.12);
        }

        .player-row.lost {
          opacity: 0.5;
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .username {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #c3cad6;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-bet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .multiplier {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #1fd65f;
          text-shadow: 0px 0px 8px rgba(31, 214, 95, 0.4);
        }

        .payout {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .payout p {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .payout .green {
          color: #1fd65f;
        }

        .payout .red {
          color: #ff5141;
        }

        .payout .muted {
          color: #8b92a0;
        }

        @media (max-width: 1000px) {
          .crash-player-list {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </>
  );
}

export default CrashPlayerList;
