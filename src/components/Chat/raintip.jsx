import Avatar from "../Level/avatar";
import {getCents} from "../../util/balance";

function RainTip(props) {
    return (
        <>
            <div class='raintip-container'>
                <div class='raintip-left'>
                    <span class='rain-dot'/>
                    <img src='/assets/icons/coin.svg' height='16' alt=''/>
                    <div class='rain-text'>
                        <p class='title'>RAIN HAS BEEN TIPPED</p>
                        <div class='info'>
                            <Avatar xp={props?.user?.xp || 0} id={props?.user?.id} height={16}/>
                            <span class='username'>{props?.user?.username}</span>
                            <span class='gray'>tipped</span>
                        </div>
                    </div>
                </div>
                <div class='amount'>
                    <img src='/assets/icons/coin.svg' height='13' alt=''/>
                    <span>{Math.floor(props?.content || 0)}<span class='cents'>.{getCents(props?.content || 0)}</span></span>
                </div>
            </div>

            <style jsx>{`
              .raintip-container {
                width: 100%;
                min-height: 44px;

                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;

                padding: 9px 12px;
                border-radius: 8px;

                background: rgba(31, 214, 95, 0.07);
                border: 1px solid rgba(31, 214, 95, 0.25);

                box-sizing: border-box;
              }

              .raintip-left {
                display: flex;
                align-items: center;
                gap: 7px;
                min-width: 0;
              }

              .rain-dot {
                width: 7px;
                height: 7px;
                min-width: 7px;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 6px rgba(31, 214, 95, 0.8);
              }

              .rain-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
              }

              .title {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 11px;
                color: #1fd65f;
                white-space: nowrap;
              }

              .info {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 11px;
              }

              .username {
                font-weight: 700;
                color: #c3cad6;
                max-width: 80px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              }

              .gray {
                color: #6b7280;
                font-weight: 500;
              }

              .amount {
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 13px;
                color: #c3cad6;
              }

              .cents {
                color: #6b7280;
                font-size: 11px;
              }
            `}</style>
        </>
    );
}

export default RainTip;
