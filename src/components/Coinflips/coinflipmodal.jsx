import Level from "../Level/level";
import {getCents} from "../../util/balance";
import {authedAPI, getRandomNumber} from "../../util/api";
import {createEffect, createSignal} from "solid-js";

function CoinflipModal(props) {

  createEffect(() => {
    setOpponent(props?.cf[opponentCoin])

    if (props?.cf?.winnerSide && !animation()) {
      const randomAnimation = getRandomNumber(1, 3)
      setAnimation(props?.cf?.winnerSide + randomAnimation)
      setIsSpinning(true)

      setTimer(5)
      let int = setInterval(() => {
        setTimer((t) => t - 1)
        if (timer() <= 0) {
          clearInterval(int)
        }
      }, 1000)
    }
  })

  const opponentCoin = props?.cf?.ownerSide === 'fire' ? 'ice' : 'fire'
  const creator = props?.cf[props?.cf?.ownerSide]
  const [opponent, setOpponent] = createSignal(props?.cf[opponentCoin])
  const [animation, setAnimation] = createSignal(null)
  const [isSpinning, setIsSpinning] = createSignal(false)
  const [timer, setTimer] = createSignal(-1)

  function isLoser(side) {
    if (!props?.cf?.endsAt || timer() > 0 || isSpinning() || (props?.time < props?.cf?.endsAt)) return false
    return side !== props?.cf?.winnerSide
  }

  return (
    <>
      <div class='modal fadein' onClick={() => props.close()}>
        <div class='coinflip-container' onClick={(e) => e.stopPropagation()}>
          <div class='header'>
            <div class='user'>
              <div class={'name '+ (isLoser(props?.cf?.ownerSide) ? 'loser' : '')} style={{margin: '0 auto 0 0'}}>
                <p>{creator?.username}</p>
                <Level xp={creator?.xp}/>
              </div>

              <div class='avatar-container'>
                <img class={'avatar ' + (isLoser(props?.cf?.ownerSide) ? 'gray' : '')} src={`${import.meta.env.VITE_SERVER_URL}/user/${creator?.id}/img`}
                     onError={(e) => e.target.src = '/assets/icons/default-avatar.svg'}
                     height='90' width='90' alt=''/>

                <img class={'coin ' + (isLoser(props?.cf?.ownerSide) ? 'gray' : '')} src={`/assets/icons/${props?.cf?.ownerSide}coin.svg`} height='35' width='35'
                     alt={props?.cf?.ownerSide}/>
              </div>

              <p class={'percent ' + (isLoser(props?.cf?.ownerSide) ? 'loser' : '')}>
                {opponent() ? '50.00%' : '100.00%'}
              </p>
            </div>

            <div class='center'>
              {animation() && timer() > 0 ? (
                <p>{timer()} s</p>
              ) : animation() ? (
                <video class='anim' src={`/assets/animations/${animation()}.webm`}
                       autoPlay={true} onEnded={() => setIsSpinning(false)}></video>
              ) : null}
            </div>

            <div class='user'>
              <p class={'percent ' + + (isLoser(opponentCoin) ? 'loser' : '')}>
                {opponent() ? '50.00%' : '...'}
              </p>

              <div class='avatar-container'>
                {opponent() ? (
                  <img class={'avatar ' + (isLoser(opponentCoin) ? 'gray' : '')} src={`${import.meta.env.VITE_SERVER_URL}/user/${opponent().id}/img`}
                       onError={(e) => e.target.src = '/assets/icons/default-avatar.svg'}
                       height='90' width='90' alt=''/>
                ) : (
                  <p class='nouser'>?</p>
                )}

                <img class={'coin left ' + (isLoser(opponentCoin) ? 'gray' : '')} src={`/assets/icons/${opponentCoin}coin.svg`} height='35'
                     width='35' alt={opponentCoin}/>
              </div>

              <div class={'name ' + (isLoser(opponentCoin) ? 'loser' : '') } style={{margin: '0 0 0 auto'}}>
                {opponent() ? (
                  <>
                    <Level xp={opponent()?.xp || 0}/>
                    <p>{opponent()?.username}</p>
                  </>
                ) : (
                  <p>Waiting...</p>
                )}
              </div>
            </div>
          </div>

          <div class='user-items'>
            <div class='items' style={{background: 'rgba(0,0,0,0.21)'}}>
              <div class={'coin-amount-container ' + (isLoser(props?.cf?.ownerSide) ? 'loser' : '')}>
                <p>Coins</p>

                <div class='coin-container'>
                  <img class='spiral' src='/assets/icons/goldspiral.png' height='90'
                       width='90'/>
                  <img src='/assets/icons/coin.svg' height='64' width='71'/>
                </div>

                <div class='cost'>
                  <img src='/assets/icons/coin.svg' height='15'/>
                  <p>{Math.floor(props?.cf?.amount)?.toLocaleString(undefined, {maximumFractionDigits: 0}) || '0'}<span
                    class='gray'>.{getCents(props?.cf?.amount)}</span></p>
                </div>
              </div>
            </div>

            {opponent() ? (
              <div class='items'>
                <div class={'coin-amount-container ' + (isLoser(opponentCoin) ? 'loser' : '') }>
                  <p>Coins</p>

                  <div class='coin-container'>
                    <img class='spiral' src='/assets/icons/goldspiral.png' height='90'
                         width='90'/>
                    <img src='/assets/icons/coin.svg' height='64' width='71'/>
                  </div>

                  <div class='cost'>
                    <img src='/assets/icons/coin.svg' height='15'/>
                    <p>{Math.floor(props?.cf?.amount)?.toLocaleString(undefined, {maximumFractionDigits: 0}) || '0'}<span
                      class='gray'>.{getCents(props?.cf?.amount)}</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div class='items waiting'>
                <div class='join-container'>
                  Waiting for a user to join...
                  <button class='bevel-gold join' onClick={async () => {
                    if (creator.id === props?.user?.id)
                      return await authedAPI(`/coinflip/${props?.cf?.id}/bot`, 'POST', null, true)

                    await authedAPI(`/coinflip/${props?.cf?.id}/join`, 'POST', null, true)
                  }}>
                    {creator.id === props?.user?.id ? (
                      'CALL BOT'
                    ) : 'JOIN COINFLIP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div class='footer'>
            <p class='seed'>
              <span class='gold bold'>SERVER SEED{!props?.cf?.winnerSide && ' HASH'}:</span> {props?.cf?.serverSeed}
            </p>

            <p>
              <span class='gold bold'>Game ID:</span> {props?.cf?.id}
            </p>

            <button class='bevel-light close' onClick={() => props.close()}>CLOSE</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;

          width: 100vw;
          height: 100vh;

          background: rgba(5, 7, 12, 0.72);
          backdrop-filter: blur(5px);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
          padding: 20px;
          box-sizing: border-box;
        }

        .coinflip-container {
          max-width: 780px;
          width: 100%;
          height: fit-content;
          min-height: 340px;
          max-height: calc(100vh - 40px);
          background: #161b24;

          display: flex;
          flex-direction: column;
          overflow: hidden;

          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 80px rgba(0,0,0,0.55);
        }

        .header {
          background: linear-gradient(90deg, rgba(31, 214, 95, 0.09) 0%, rgba(22, 27, 36, 0) 45%), #1e2533;
          border-bottom: 1px solid rgba(255,255,255,0.055);
          width: 100%;
          height: 70px;
          min-height: 70px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          gap: 20px;

          position: relative;

          padding: 0 35px;
        }

        .user {
          display: flex;
          align-items: center;
          gap: 15px;

          flex-grow: 1;

          overflow: hidden;
        }

        .center {
          min-width: 120px;
          max-width: 120px;
          height: 120px;
          flex-shrink: 0;
          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background: linear-gradient(to right, rgba(31, 214, 95, 0.1), rgba(31, 214, 95, 0.02), rgba(0, 0, 0, 0)), #1e2533;
          border: 1px solid rgba(31, 214, 95, 0.15);
          filter: drop-shadow(0px 2px 15px rgba(0, 0, 0, 0.2));

          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 22px;
          font-weight: 700;

          overflow: hidden;
        }

        .avatar-container {
          min-width: 100px;
          width: 100px;
          height: 100px;
          flex-shrink: 0;
          border-radius: 50%;

          display: flex;
          align-items: flex-end;
          justify-content: center;

          position: relative;

          background: #1e2533;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .coin {
          position: absolute;
          top: 6px;
          right: 6px;
          border-radius: 50%;
        }

        .coin.left {
          left: 6px;
          right: unset;
        }

        .avatar {
          border-radius: 50%;
          object-fit: cover;
        }

        .nouser {
          line-height: 125px;
          color: #4E4A8A;
          font-size: 32px;
          font-weight: 700;
          user-select: none;
        }

        .percent {
          min-width: 52px;
          height: 25px;
          flex-shrink: 0;

          border-radius: 4px;
          background: rgba(38, 46, 62, 0.7);

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;

          text-align: center;
          line-height: 25px;
          font-variant-numeric: tabular-nums;
        }

        .name {
          display: flex;
          gap: 6px;

          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 14px;
          font-weight: 700;

        }

        .name p {
          max-width: 65px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-items {
          width: 100%;
          height: 100%;
          max-height: 400px;

          display: flex;
        }

        .items {
          display: grid;
          grid-template-columns: 140px;
          grid-gap: 15px;
          flex: 1;
          overflow-y: scroll;
          padding: 20px;
          height: 100%;

          background: rgba(0, 0, 0, 0.11);
          scrollbar-color: transparent transparent;
        }

        .items.waiting {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .join-container {
          width: 100%;
          max-width: 360px;
          height: 100px;

          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(10, 13, 20, 0.5);

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 15px;
          font-weight: 700;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
        }

        .join {
          width: 115px;
          height: 35px;
        }

        .coin-amount-container {
          width: 100%;
          height: 170px;

          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(10, 13, 20, 0.5);

          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 15px;

          color: #1fd65f;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;

          padding: 0 15px;
        }

        .coin-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spiral {
          position: absolute;
        }

        .cost {
          min-height: 30px;
          padding: 0 10px;
        }

        .footer {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 500;

          padding: 14px 25px;
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.055);
        }

        .seed {
          max-width: 300px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .close {
          font-weight: 700;
          width: 90px;
          height: 30px;

          margin-left: auto;
        }

        .loser {
          mix-blend-mode: luminosity;
          opacity: 0.5;
        }

        .gray {
          filter: grayscale(1);
        }

        .items::-webkit-scrollbar {
          display: none;
        }

        @media only screen and (max-width: 720px) {
          .header {
            height: auto;
            min-height: 0;
            flex-direction: column;
            gap: 14px;
            padding: 16px;
          }

          .user { width: 100%; }

          .user-items {
            flex-direction: column;
            max-height: none;
          }

          .items {
            grid-template-columns: 1fr;
            height: auto;
          }

          .footer {
            padding: 12px 16px;
          }

          .seed {
            max-width: 100%;
            flex-basis: 100%;
          }

          .close {
            margin-left: 0;
          }
        }

        @media only screen and (max-width: 460px) {
          .avatar-container {
            min-width: 78px;
            width: 78px;
            height: 78px;
          }

          .center {
            min-width: 92px;
            max-width: 92px;
            height: 92px;
            font-size: 18px;
          }

          .name p {
            max-width: 90px;
          }
        }
      `}</style>
    </>
  );
}

export default CoinflipModal;
