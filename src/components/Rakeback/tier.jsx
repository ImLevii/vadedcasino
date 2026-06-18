import {authedAPI, createNotification} from "../../util/api";

function RakebackTier(props) {

  function formatTimeLeft() {
    let timeLeft = props?.claimAt - props?.time
    const totalSeconds = Math.floor(timeLeft / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  async function claimRakeback() {
    if (!props?.active || props?.reward < props?.min) return

    let res = await authedAPI('/user/rakeback/claim', 'POST', JSON.stringify({
      type: props?.tier?.toLowerCase()
    }), true)

    if (res.success) {
      createNotification('success', `Successfully claimed your ${props?.tier} rakeback for a total of ${props?.reward}.`)
      props?.onClaim(props?.tier)
    }
  }

  return (
    <>
      <div className={'period-wrapper ' + (props?.active ? 'active' : '')}>
        <div className='period'>
          <img className='arrows' src='/assets/art/rakebackarrows.png' height='87' width='87'/>
          <p>{props?.period}</p>
        </div>

        <div className='amount' onClick={async () => claimRakeback()}>
          <p>{props?.tier} RAKEBACK</p>
          <p className='claimable'>
            <img src='/assets/icons/coin.svg' height='13' width='12' alt=''/>&nbsp;
            {props?.reward?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        <div className='claim'>
          <p>{props?.tier} Rakeback</p>

          <div className='diamond'/>

          <div className='timer'>
            <div className='bar'/>
          </div>

          <button class='claim-button' onClick={async () => claimRakeback()}>
            {(props?.reward < props?.min) ?
              `MIN ${props?.min} ROBUX TO CLAIM` : props?.active ? 'CLAIM NOW' : `CLAIM IN ${formatTimeLeft()}`}
          </button>
        </div>
      </div>

      <style jsx>{`
        .period-wrapper {
          flex: 1;
          
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;

          color: #98a4b6;
          font-size: 12px;
          font-weight: 700;
        }
        
        .active.period-wrapper {
          color: #ffb13e;
        }
        
        .period {
          width: 80px;
          height: 80px;
          
          display: flex;
          align-items: center;
          justify-content: center;
          
          border-radius: 50%;
          
          background: linear-gradient(180deg, rgba(10, 14, 20, 0.95) 0%, rgba(18, 24, 32, 0.95) 100%);
          border: 1px solid rgba(31, 214, 95, 0.18);
          box-shadow: inset 0 0 12px rgba(31, 214, 95, 0.08);
          position: relative;

          color: #c5cfdd;
          font-size: 14px;
          font-weight: 700;
        }

        .active .period {
          border-color: rgba(255, 177, 62, 0.45);
          box-shadow: inset 0 0 12px rgba(255, 177, 62, 0.18), 0 0 20px rgba(255, 177, 62, 0.1);
        }
        
        .arrows {
          position: absolute;
          opacity: 0.55;
        }
        
        .amount {
          width: 100%;
          min-height: 45px;
          height: auto;
          
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          border-radius: 5px;
          background: rgba(25, 33, 45, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          
          color: #9ea8b8;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          
          cursor: pointer;
        }
        
        .active .amount {
          background: linear-gradient(53deg, rgba(255, 177, 62, 0.16) 0%, rgba(31, 214, 95, 0.15) 100%);
          border: 1px dashed rgba(255, 177, 62, 0.65);
          color: #ffb13e;
        }
        
        .claimable {
          color: #ffffff;
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
        
        .active .amount .claimable {
          opacity: 1;
        }
        
        .claim {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .diamond {
          border: 1px solid rgba(160, 174, 194, 0.5);
          background: rgba(160, 174, 194, 0.28);
          
          height: 8.5px;
          width: 8.5px;
          
          transform: rotate(45deg);
        }
        
        .active .diamond {
          background: linear-gradient(53deg, #ff9f2f 54.58%, #ffc35d 69.11%);
          border: unset;
        }
        
        .timer {
          width: 100%;
          height: 6px;
          
          border-radius: 2525px;
          background: #121a25;
          border: 1px solid rgba(255, 255, 255, 0.05);
          
          margin: 8px 0;
        }
        
        .active .timer {
          background: linear-gradient(53deg, #ff9f2f 54.58%, #ffc35d 69.11%), #121a25;
        }
        
        .claim-button {
          background: unset;
          border: unset;
          outline: unset;
          
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #8d98a9;
          text-align: center;
        }
        
        .active .claim-button {
          cursor: pointer;
          color: #1fd65f;
          text-shadow: 0 0 14px rgba(31, 214, 95, 0.25);
        }

        @media only screen and (max-width: 700px) {
          .period-wrapper {
            gap: 14px;
          }

          .period {
            width: 68px;
            height: 68px;
            font-size: 13px;
          }

          .arrows {
            width: 74px;
            height: 74px;
          }
        }
      `}</style>
    </>
  )
}

export default RakebackTier