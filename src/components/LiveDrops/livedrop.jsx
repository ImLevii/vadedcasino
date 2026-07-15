import Avatar from "../Level/avatar";
import LiveDot from "./livedot";
import LiveItem from "./liveitem";
import {A} from "@solidjs/router";

function LiveDrop(props) {
    return (
        <>
            <div class={'live-drop-container ' + (props?.top ? 'gold' : '')}>
                <div class='live-drop-header'>
                    <div class='type'>
                        <LiveDot type={props?.top ? 'gold' : 'green'}/>
                    </div>

                    <div class='avatar'>
                        <Avatar height='25' id={props?.user?.id} xp={props?.user?.xp}/>
                    </div>

                    <button class='view'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="8" viewBox="0 0 13 8" fill={props?.top ? 'var(--gold)' : '#8b92a0'}>
                            <path d="M6.5 0C4.01621 0 1.76378 1.3589 0.101718 3.56612C-0.0339061 3.74696 -0.0339061 3.99959 0.101718 4.18042C1.76378 6.3903 4.01621 7.74921 6.5 7.74921C8.98379 7.74921 11.2362 6.3903 12.8983 4.18308C13.0339 4.00225 13.0339 3.74962 12.8983 3.56878C11.2362 1.3589 8.98379 0 6.5 0ZM6.67817 6.60305C5.02941 6.70676 3.66784 5.34786 3.77156 3.69643C3.85665 2.33487 4.96026 1.23126 6.32183 1.14616C7.97059 1.04245 9.33216 2.40135 9.22844 4.05278C9.14069 5.41168 8.03708 6.51529 6.67817 6.60305ZM6.59573 5.34254C5.70753 5.39838 4.97356 4.66708 5.03206 3.77887C5.07727 3.0449 5.67296 2.45188 6.40692 2.40401C7.29513 2.34816 8.0291 3.07947 7.97059 3.96768C7.92273 4.70431 7.32704 5.29733 6.59573 5.34254Z"/>
                        </svg>
                        <A href={`/cases/${props?.case?.slug}`} class='gamemode-link'/>
                    </button>
                </div>

                <div class='details'>
                    <LiveItem {...props?.item}/>
                </div>

                <div class='cost'>
                    <img src='/assets/icons/coin.svg' height='15'/>
                    {props?.item?.price?.toLocaleString() || '0'}
                </div>
            </div>

            <style jsx>{`
              .live-drop-container {
                width: 172px;
                min-width: 172px;
                height: 126px;
                
                position: relative;
                z-index: 0;

                display: flex;
                flex-direction: column;
                gap: 7px;
                padding: 8px;

                border-radius: 8px;
                background: linear-gradient(180deg, rgba(22, 28, 39, 0.82), rgba(10, 14, 22, 0.88));
                border: 1px solid rgba(255, 255, 255, 0.045);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 12px 26px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                transition: transform .18s ease, filter .18s ease, border-color .18s ease, box-shadow .18s ease;
              }

              .live-drop-container:before {
                content: '';
                position: absolute;
                inset: 0;
                z-index: -1;
                background: radial-gradient(85% 75% at 50% 20%, rgba(31, 214, 95, 0.055), rgba(31, 214, 95, 0) 58%);
              }

              .live-drop-container:hover {
                transform: translateY(-2px);
                filter: brightness(1.08);
                border-color: rgba(31, 214, 95, 0.16);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 16px 34px rgba(0, 0, 0, 0.28), 0 0 22px rgba(31, 214, 95, 0.06);
              }
              
              .gold.live-drop-container {
                background: linear-gradient(180deg, rgba(32, 28, 20, 0.86), rgba(14, 13, 12, 0.9));
                border-color: rgba(255, 184, 74, 0.1);
              }
              
              .gold.live-drop-container:before {
                content: '';
                background: radial-gradient(85% 75% at 50% 20%, rgba(255, 184, 74, 0.075), rgba(255, 184, 74, 0) 58%);
              }
              
              .live-drop-header {
                width: 100%;
                height: 25px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              
              .type {
                width: 28px;
                height: 25px;

                border-radius: 5px;
                background: rgba(18, 24, 34, 0.86);
                border: 1px solid rgba(255, 255, 255, 0.045);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
                
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              .view {
                width: 32px;
                height: 25px;
                
                border: unset;
                outline: unset;
                
                border-radius: 5px;
                background: rgba(18, 24, 34, 0.86);
                border: 1px solid rgba(255, 255, 255, 0.045);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);

                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                
                position: relative;
              }
              
              .gold .view, .gold .type {
                background: rgba(49, 39, 23, 0.86);
              }
              
              .avatar {
                margin-top: -3px;
                padding: 2px;
                border-radius: 6px;
                border: 1px solid rgba(31, 214, 95, 0.58);
                background: rgba(31, 214, 95, 0.09);
                box-shadow: 0 0 13px rgba(31, 214, 95, 0.08);
              }
              
              .details {
                display: flex;
                height: 58px;
              }

              .cost {
                height: 22px;
                min-height: 22px;
                width: 100%;
                gap: 8px;
                padding: 0 10px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 5px;
                background: linear-gradient(180deg, rgba(31, 173, 91, 0.9), rgba(15, 111, 61, 0.94));
                border: 1px solid rgba(137, 255, 181, 0.13);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 5px 14px rgba(31, 214, 95, 0.13);

                color: #ffffff;
                font-size: 12px;
                font-weight: 900;
                line-height: 1;
                text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
              }

              .cost img {
                width: 14px;
                height: 14px;
              }
            `}</style>
        </>
    );
}

export default LiveDrop;
