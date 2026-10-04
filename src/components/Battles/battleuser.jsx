import Avatar from "../Level/avatar";
import Level from "../Level/level";

function BattleUser(props) {

    function sumItemsWon() {
        return getOwnPulls().reduce((total, item) => total + Number(item?.price || 0), 0)
    }

    function isBot() {
        const player = props?.player
        return !!(player?.bot || player?.isBot || player?.role === 'BOT' || String(player?.type || '').toUpperCase() === 'BOT')
    }

    function getOwnPulls() {
        if (!Array.isArray(props?.wonItems)) return []
        return props?.wonItems?.filter(item => {
            if (props?.state !== 'WINNERS' && item.round > (props.revealedRound || 0)) return false
            return item.slot ? item.slot === props.index + 1 : item.userId === props?.player?.id
        })
    }

    return (
      <>
        <div class={'battle-user-container ' + (props.side || '')}>
          <Avatar height={30} id={props.player?.id || '?'} xp={props.player?.xp || 0} dark={!props.player}/>
          <div class='identity'>
            <div class='name-row'>
              {props.player && (isBot() ? <span class='bot-badge'>Bot</span> : <Level xp={props.player.xp}/>)}
              <span class='username'>{props.player?.username || 'Open seat'}</span>
            </div>
            <div class='balance'>
              {props.player ? <><img src='/assets/chips/chip-green.png' width='11' height='11' alt=''/><span>{sumItemsWon().toFixed(2)}</span></> : <span class='muted'>Waiting for player</span>}
            </div>
          </div>
        </div>
        <style jsx>{`

          .battle-user-container {
            height: 44px;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 0 8px;
            min-width: 0;
          }

          .battle-user-container.right {
            flex-direction: row-reverse;
            text-align: right;
          }

          .identity {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .name-row {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .right .name-row,.right .balance {
            justify-content: flex-end;
          }

          .username {
            color: #f3f4f6;
            font-size: 11px;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .bot-badge {
            background: #1fd65f;
            color: #03200b;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 3px;
          }

          .balance {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: #fff;
            font-weight: 600;
          }

          .muted {
            color: #818997;
            font-size: 9px;
          }

          @media(max-width:700px) {

            .battle-user-container {
              padding: 0 2px;
            }

            .name-row {
              gap: 4px;
            }

            .username {
              font-size: 10px;
            }
          }
        `}</style>
      </>
    );
}
export default BattleUser;
