import {resolveImageSrc} from "../../util/image";

function LiveItem(props) {

    function getRarity(price) {
        if (price < 1000) {
            return 'gray'
        } else if (price < 10000) {
            return 'blue'
        } else if (price < 50000) {
            return 'pink'
        } else if (price < 250000) {
            return 'red'
        }
        return 'gold'
    }

    return (
        <>
            <div class={'live-item-container ' + (getRarity(props.price))}>
              <img src={resolveImageSrc(props.img)} alt='' height='48'/>
            </div>

            <style jsx>{`
              .live-item-container {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 58px;
                
                position: relative;
                z-index: 0;

                border-radius: 7px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.045);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 18px rgba(0, 0, 0, 0.22);
              }

              .live-item-container:after {
                content: '';
                position: absolute;
                left: 10px;
                right: 10px;
                bottom: 4px;
                height: 1px;
                background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0));
                opacity: .55;
              }

              .live-item-container img {
                width: 92%;
                height: 50px;
                object-fit: contain;
                filter: drop-shadow(0 9px 9px rgba(0, 0, 0, 0.44));
              }

              .live-item-container:before {
                position: absolute;
                content: '';
                border-radius: 7px;
                z-index: -1;
                background: radial-gradient(104.74% 70.25% at 50.00% 76.90%, rgba(169, 181, 210, 0.16) 0%, rgba(169, 181, 210, 0.00) 100%), linear-gradient(180deg, #111722, #080c14);
                top: 1px;
                left: 1px;
                width: calc(100% - 2px);
                height: calc(100% - 2px);
              }

              .gray {
                background: linear-gradient(45deg, rgba(169, 181, 210, .75), rgba(169, 181, 210, 0) 70%);
              }

              .blue {
                background: linear-gradient(45deg, rgba(65, 118, 255, .82), rgba(65, 118, 255, 0) 70%);
              }

              .pink {
                background: linear-gradient(45deg, rgba(220, 95, 222, .82), rgba(220, 95, 222, 0) 70%);
              }

              .red {
                background: linear-gradient(45deg, rgba(255, 81, 65, .85), rgba(255, 81, 65, 0) 70%);
              }

              .gold {
                background: linear-gradient(45deg, rgba(255, 184, 74, .9), rgba(255, 184, 74, 0) 70%);
              }

              .blue:before {
                background: radial-gradient(104.74% 70.25% at 50.00% 76.90%, rgba(65, 118, 255, 0.14) 0%, rgba(65, 118, 255, 0.00) 100%), #18172b;
              }

              .pink:before {
                background: radial-gradient(104.74% 70.25% at 50.00% 76.90%, rgba(220, 95, 222, 0.14) 0%, rgba(220, 95, 222, 0.00) 100%), #18172b;
              }

              .red:before {
                background: radial-gradient(104.74% 70.25% at 50.00% 76.90%, rgba(255, 81, 65, 0.14) 0%, rgba(255, 81, 65, 0.00) 100%), #18172b;
              }

              .gold:before {
                background: radial-gradient(104.74% 70.25% at 50.00% 76.90%, rgba(31, 214, 95, 0.14) 0%, rgba(0, 0, 0, 0.00) 100%), #18172b;
              }
            `}</style>
        </>
    );
}

export default LiveItem;
