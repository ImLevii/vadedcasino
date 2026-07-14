import Level from "../Level/level";
import {levelToXP} from "../../resources/levels";
import Avatar from "../Level/avatar";
import {authedAPI} from "../../util/api";

const NotificationTitles = {
  'withdraw-completed': 'Withdraw',
  'deposit-completed': 'Deposit',
  'tip-received': 'Tip',
  'rewards-claimed': 'Rewards',
  'level-up': 'Rewards',
}

function Notification(props) {

  const NotificationContent = {
    'withdraw-completed': () => <div>
      Your withdraw of
      <img src='/assets/icons/coin.svg' height='18' width='19' alt=''/>
      <span class='white bold'>{props?.content?.amount?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}</span>
      succeeded.
    </div>,

    'deposit-completed': () => <div>
      Your deposit of
      <img src='/assets/icons/coin.svg' height='18' width='19' alt=''/>
      <span className='white bold'>{props?.content?.amount?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}</span>
      has been credited.
    </div>,

    'tip-received': () => <div class='tip'>
      <Avatar id={props?.content?.fromUser?.id} height='24'/> <p class='white bold'>{props?.content?.fromUser?.username}</p> <Level xp={props?.content?.fromUser?.xp}/>
      tipped you &nbsp;
      <span class='fancyamt'>
        <img src='/assets/icons/coin.svg' height='18' width='19' alt=''/>
        {props?.content?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}
      </span>
    </div>,

    'reward-claimed': () => <div>
      <span class='gold'>You claimed: </span>
      <div class='flex'>
        <span className='fancyamt'>
          <img src='/assets/icons/coin.svg' height='18' width='19' alt=''/>
          {props?.content?.amount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span> from your rewards.
      </div>
    </div>,

    'level-up': () => <p class='gold'>Congrats, you leveled up! <Level xp={levelToXP(props?.content?.level)}/></p>,
  }

  return (
    <>
      <div className='notification'>
        <p class='title'>
          <img src='/assets/icons/bell.svg' height='15' width='12' alt=''/>
          {NotificationTitles[props?.type]}
        </p>

        <button class='trash' onClick={async () => {
          let res = await authedAPI(`/user/notifications/${props?.id}`, 'DELETE', null, true)

          if (res.success) {
            props?.delete()
          }
        }}>
          <img src='/assets/icons/trash.svg' height='13' width='12' alt=''/>
        </button>

        <div class='content'>
          {NotificationContent[props?.type]}
        </div>
      </div>

      <style jsx>{`
        .notification {
          width: 100%;
          height: fit-content;

          border-radius: 6px;
          border: 1px solid var(--glass-border);
          background:
            radial-gradient(100% 80% at 0% 0%, rgba(31,214,95,0.055), transparent 68%),
            linear-gradient(145deg, rgba(24, 31, 42, 0.84), rgba(11, 16, 23, 0.9));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 8px 24px rgba(0,0,0,0.2);

          display: flex;
          flex-direction: column;

          font-family: Geogrotesque Wide, sans-serif;
          font-size: 15px;
          font-weight: 500;

          position: relative;
        }

        .title {
          height: 25px;
          width: fit-content;
          padding: 0 12px;

          border-radius: 6px 0px;
          background: rgba(31, 214, 95, 0.12);

          color: #1fd65f;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 600;

          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .trash {
          height: 25px;
          width: 36px;
          
          background: linear-gradient(180deg, rgba(61,70,86,0.72), rgba(34,41,53,0.78));
          border-radius: 6px;
          
          outline: unset;
          border: 1px solid rgba(255,255,255,0.06);
          
          position: absolute;
          top: 4px;
          right: 8px;
          cursor: pointer;
          transition: background .15s;
        }

        .trash:hover {
          background: linear-gradient(180deg, rgba(220, 38, 38, 0.38), rgba(120, 25, 32, 0.42));
          border-color: rgba(255, 90, 90, 0.22);
        }

        .content {
          padding: 12px;
          color: #8b92a0;
        }

        .content > div, .content > p {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;

          cursor: initial;
          align-items: center;
        }

        .gold {
          color: rgba(31, 214, 95, 0.75) !important;
        }

        .fancyamt {
          border-radius: 4px;
          border: 1px solid rgba(31, 214, 95, 0.4);
          background: linear-gradient(180deg, rgba(31, 214, 95, 0.12), rgba(16, 79, 43, 0.1));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);

          height: 30px;
          padding: 0 8px;

          color: white;
          font-weight: 700;

          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .flex {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
      `}</style>
    </>
  );
}

export default Notification
