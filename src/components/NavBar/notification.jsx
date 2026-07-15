import Level from "../Level/level";
import {levelToXP} from "../../resources/levels";
import Avatar from "../Level/avatar";
import {authedAPI} from "../../util/api";
import {createSignal} from "solid-js";

const NotificationTitles = {
  'withdraw-completed': 'Withdraw',
  'deposit-completed': 'Deposit',
  'tip-received': 'Tip',
  'reward-claimed': 'Rewards',
  'rewards-claimed': 'Rewards',
  'level-up': 'Rewards',
}

function Notification(props) {

  const [deleting, setDeleting] = createSignal(false)

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

  const content = () => {
    const Content = NotificationContent[props?.type]
    return Content ? <Content/> : <div>{props?.content?.message || 'You have a new account update.'}</div>
  }

  async function deleteNotification() {
    if (deleting()) return

    setDeleting(true)
    try {
      let res = await authedAPI(`/user/notifications/${props?.id}`, 'DELETE', null, true)
      if (res?.success) props?.delete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className='notification'>
        <div class='notification-head'>
          <p class='title'>
            <span class='type-icon'><img src='/assets/icons/bell.svg' height='12' width='12' alt=''/></span>
            {NotificationTitles[props?.type] || 'Update'}
          </p>

          <button class='trash' type='button' aria-label='Delete notification' disabled={deleting()}
                  onClick={deleteNotification}>
            <img src='/assets/icons/trash.svg' height='12' width='11' alt=''/>
          </button>
        </div>

        <div class='content'>
          {content()}
        </div>
      </div>

      <style jsx>{`
        .notification {
          width: 100%;
          height: fit-content;
          box-sizing: border-box;

          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.07);
          background:
            radial-gradient(90% 90% at 0% 0%, rgba(31,214,95,0.07), transparent 68%),
            linear-gradient(145deg, rgba(23, 31, 41, 0.88), rgba(9, 14, 21, 0.94));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 8px 20px rgba(0,0,0,0.18);

          display: flex;
          flex-direction: column;

          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 500;

          position: relative;
          overflow: hidden;
          transition: border-color .18s ease, background .18s ease;
        }

        .notification:hover {
          border-color: rgba(31,214,95,.16);
          background: radial-gradient(90% 90% at 0% 0%, rgba(31,214,95,.095), transparent 68%), linear-gradient(145deg, rgba(25,34,44,.92), rgba(9,14,21,.96));
        }

        .notification-head {
          min-height: 35px;
          padding: 5px 7px 0 9px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .title {
          min-width: 0;
          color: #1fd65f;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;

          display: flex;
          align-items: center;
          gap: 7px;
        }

        .type-icon {
          width: 25px;
          height: 25px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 6px;
          border: 1px solid rgba(31,214,95,.18);
          background: rgba(31,214,95,.08);
        }
        
        .trash {
          height: 27px;
          width: 29px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          padding: 0;
          
          background: rgba(255,255,255,.035);
          border-radius: 6px;
          
          outline: unset;
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          opacity: .72;
          transition: background .15s, border-color .15s, opacity .15s;
        }

        .trash:hover:not(:disabled) {
          background: rgba(255,70,84,.11);
          border-color: rgba(255, 90, 100, 0.25);
          opacity: 1;
        }

        .trash:disabled {
          cursor: wait;
          opacity: .4;
        }

        .content {
          padding: 8px 11px 12px 41px;
          color: #929cab;
          line-height: 1.45;
        }

        .content > div, .content > p {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;

          cursor: initial;
          align-items: center;
        }

        .gold {
          color: #35db72 !important;
          font-weight: 700;
        }

        .fancyamt {
          border-radius: 4px;
          border: 1px solid rgba(31, 214, 95, 0.4);
          background: linear-gradient(180deg, rgba(31, 214, 95, 0.12), rgba(16, 79, 43, 0.1));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);

          height: 28px;
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
