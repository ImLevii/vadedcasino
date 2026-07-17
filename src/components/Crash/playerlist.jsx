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
          <div>
            <span class='live-dot'/>
            <p>Players</p>
          </div>
          <strong>{props.bets?.length || 0}</strong>
        </div>

        <div class='player-list-body'>
          <Show when={(props.bets || []).length} fallback={
            <div class='empty-players'>
              <span class='empty-icon'>+</span>
              <strong>No bets yet</strong>
              <p>Be the first player in this round.</p>
            </div>
          }>
            <For each={props.bets || []}>
            {(bet) => {
              const state = getBetState(bet);
              const isCurrentUser = bet.user?.id === props.userId;

              return (
                <div class={'player-row ' + state + (isCurrentUser ? ' current-user' : '')}>
                  <div class='player-info'>
                    <Avatar id={bet.user?.id} xp={bet.user?.xp || 0} height={28} />
                    <div class='player-name'>
                      <p class='username'>{bet.user?.username || 'Anonymous'}</p>
                      <Level xp={bet.user?.xp || 0} />
                    </div>
                  </div>

                  <div class='player-bet-info'>
                    <Show when={bet.cashoutPoint}>
                      <p class='multiplier'>{bet.cashoutPoint.toFixed(2)}x</p>
                    </Show>
                    <div class='payout'>
                      <img src='/assets/chips/chip-green.png' height='15' width='15' alt='' />
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
          </Show>
        </div>
      </div>

      <style jsx>{`
        .crash-player-list {
          min-width: 0;
          width: 100%;
          background: linear-gradient(180deg, rgba(18,23,31,.92), rgba(9,12,18,.96));
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 12px 30px rgba(0,0,0,.18);
        }

        .player-list-header {
          height: 48px;
          background: rgba(31, 37, 50, 0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .player-list-header p {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #8b92a0;
          text-transform: uppercase;
        }

        .player-list-header > div { display: flex; align-items: center; gap: 8px; }
        .player-list-header strong { min-width: 26px; height: 24px; display: grid; place-items: center; border-radius: 5px; background: rgba(31,214,95,.08); color: #1fd65f; font-size: 10px; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #1fd65f; box-shadow: 0 0 9px rgba(31,214,95,.65); }

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
          min-height: 51px;
          padding: 7px 12px;
          border-bottom: 1px solid rgba(255,255,255,.025);
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
          background: rgba(255, 81, 65, 0.04);
          border-left: 2px solid rgba(255, 81, 65, 0.3);
        }

        .player-row.won {
          background: rgba(31, 214, 95, 0.04);
          border-left: 2px solid rgba(31, 214, 95, 0.3);
        }

        .player-row.playing {
          /* neutral waiting state */
        }

        .player-info {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .player-name { min-width: 0; display: flex; flex-direction: column; gap: 3px; }

        .username {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #c3cad6;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-bet-info {
          display: flex;
          align-items: center;
          gap: 8px;
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
          font-size: 11px;
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

        .empty-players { height: 100%; min-height: 220px; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; text-align: center; }
        .empty-icon { width: 34px; height: 34px; margin-bottom: 4px; display: grid; place-items: center; border: 1px solid rgba(31,214,95,.18); border-radius: 50%; background: rgba(31,214,95,.055); color: #1fd65f; font-size: 20px; }
        .empty-players strong { color: #c8d0da; font-size: 11px; }
        .empty-players p { color: #657080; font-size: 9px; }

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
