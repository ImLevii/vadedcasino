import BattleSpinner from "./battlespinner";
import BattleUser from "./battleuser";

function BattleColumn(props) {

    return (
        <>
            <div class={'column ' + (props?.compact ? 'compact ' : '') + (props?.side || '')}>
              <div class='container user-container'>
                    <BattleUser index={props?.index}
                                players={props?.players}
                                battle={props?.battle}
                                state={props?.state}
                                round={props?.round}
                                rounds={props?.rounds}
                                player={props?.player}
                                creator={props?.creator}
                                wonItems={props?.wonItems}
                                compact={props?.compact}
                                side={props?.side}
                    />
                </div>

                        <div class='container spinner-container'>
                          <BattleSpinner index={props?.index}
                                   battle={props?.battle}
                                   player={props?.player}
                                   team={props?.team}
                                   startOfTeam={props?.startOfTeam}
                                   state={props?.state}
                                   round={props?.round}
                                   rounds={props?.rounds}
                                   winnerTeam={props?.winnerTeam}
                                   max={props?.max}
                                   creator={props?.creator}
                                   wonItems={props?.wonItems}
                                   total={props?.total}
                                   roundWinners={props?.roundWinners}
                                   compact={props?.compact}
                          />
                        </div>
            </div>

            <style jsx>{`
              .column {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 0;
                min-width: 0;
                border-bottom: 1px solid rgba(255,255,255,0.045);
              }

              .column:last-child {
                border-bottom: none;
              }
              
              .container {
                width: 100%;
                height: fit-content;
                min-width: 0;
              }

              .compact .user-container {
                order: 0;
              }

              .compact .spinner-container {
                order: 1;
              }
            `}</style>
        </>
    );
}

export default BattleColumn;
