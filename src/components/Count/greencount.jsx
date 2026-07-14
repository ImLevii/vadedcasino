function GreenCount(props) {
    return (
        <>
            <div class={'count ' + (props.active ? 'active' : '')} style={props.css}>
                <div class='dot'/>
                {props?.max ? (
                    <p>{props.number} / {props?.max}</p>
                ) : (
                    <p>{props?.number}</p>
                )}
            </div>

            <style jsx>{`
              .count {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 9px;

                border-radius: 7px;
                height: 36px;
                padding: 0 12px;
                box-sizing: border-box;

                font-weight: 800;
                font-size: 13px;
                font-variant-numeric: tabular-nums;
                color: #aeb6c5;
                
                position: relative;
                z-index: 0;

                border: 1px solid rgba(255, 255, 255, 0.08);
                background: linear-gradient(180deg, rgba(26, 32, 43, 0.94), rgba(12, 16, 24, 0.96));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 7px 18px rgba(0,0,0,.22);
                
                overflow: hidden;
              }
              
              .count.active {
                color: #1fd65f;
                border-color: rgba(31, 214, 95, 0.38);
                background: linear-gradient(180deg, rgba(18, 55, 37, 0.82), rgba(10, 27, 21, 0.94));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 0 0 1px rgba(31,214,95,.06), 0 8px 22px rgba(0,0,0,.24);
              }
              
              .count.active::before {
                inset: 0;
                border-radius: inherit;
                content: '';
                position: absolute;
                background: linear-gradient(110deg, transparent 20%, rgba(31,214,95,.08) 50%, transparent 80%);
                z-index: -1;
              }

              .count.active::after {
                content: none;
              }
              
              .dot {
                height: 14px;
                width: 14px;

                background: rgba(174, 182, 197, 0.12);
                border: 1px solid rgba(174, 182, 197, 0.18);
                border-radius: 4px;
                
                display: flex;
                align-items: center;
                justify-content: center;
                
                position: relative;
              }
              
              .dot:before {
                height: 6px;
                width: 6px;
                
                content: '';
                position: absolute;
                
                background: #8992a2;
                border-radius: 2px;
              }
              
              .active .dot {
                background: rgba(31, 214, 95, 0.12);
                border-color: rgba(31, 214, 95, 0.3);
              }
              
              .active .dot:before {
                background: #1fd65f;
                box-shadow: 0 0 7px rgba(31, 214, 95, 0.85);
              }
            `}</style>
        </>
    );
}

export default GreenCount;
