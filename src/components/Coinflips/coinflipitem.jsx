import {resolveImageSrc} from "../../util/image";

function CoinflipItem(props) {

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

    function getImage() {
      if (props?.img) return resolveImageSrc(props.img)
        return '/assets/icons/coin.svg'
    }

    return (
        <>
            <div class={'cf-item ' + (getRarity(props?.price || 0))}>
                <img class='item-image' src={getImage()} height='35' width='35' alt=''
                     draggable={false}/>
            </div>

            <style jsx>{`
              .cf-item {
                height: 55px;
                
                min-width: 65px;
                width: 65px;
                
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                
                border-radius: 10px;
                z-index: 0;
                padding: 1px;
                transition: transform .15s;
              }

              .cf-item:hover {
                transform: translateY(-1px);
              }
              
              .gray {
                background: linear-gradient(135deg, rgba(169, 181, 210, 0.55) 0%, rgba(169, 181, 210, 0.08) 55%, rgba(169, 181, 210, 0) 100%);
              }

              .blue {
                background: linear-gradient(135deg, rgba(65, 118, 255, 0.58) 0%, rgba(65, 118, 255, 0.08) 55%, rgba(65, 118, 255, 0) 100%);
              }

              .pink {
                background: linear-gradient(135deg, rgba(220, 95, 222, 0.58) 0%, rgba(220, 95, 222, 0.08) 55%, rgba(220, 95, 222, 0) 100%);
              }

              .red {
                background: linear-gradient(135deg, rgba(255, 81, 65, 0.58) 0%, rgba(255, 81, 65, 0.08) 55%, rgba(255, 81, 65, 0) 100%);
              }

              .gold {
                background: linear-gradient(135deg, rgba(255, 153, 1, 0.58) 0%, rgba(255, 153, 1, 0.08) 55%, rgba(255, 153, 1, 0) 100%);
              }

              .cf-item:before {
                position: absolute;
                content: '';
                border-radius: 9px;
                z-index: -1;
                background:
                  radial-gradient(100% 65% at 50% 100%, rgba(169, 181, 210, 0.16) 0%, rgba(169, 181, 210, 0) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.28));
                top: 1px;
                left: 1px;
                width: calc(100% - 2px);
                height: calc(100% - 2px);
              }
              
              .blue:before {
                background:
                  radial-gradient(100% 65% at 50% 100%, rgba(65, 118, 255, 0.18) 0%, rgba(65, 118, 255, 0) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.28));
              }
              
              .pink:before {
                background:
                  radial-gradient(100% 65% at 50% 100%, rgba(220, 95, 222, 0.18) 0%, rgba(220, 95, 222, 0) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.28));
              }
              
              .red:before {
                background:
                  radial-gradient(100% 65% at 50% 100%, rgba(255, 81, 65, 0.18) 0%, rgba(255, 81, 65, 0) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.28));
              }

              .gold:before {
                background:
                  radial-gradient(100% 65% at 50% 100%, rgba(31, 214, 95, 0.18) 0%, rgba(31, 214, 95, 0) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22));
              }
              
              .item-image {
                margin: auto 0;
                filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));
              }
            `}</style>
        </>
    );
}

export default CoinflipItem;
