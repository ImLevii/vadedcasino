import {useSearchParams} from "@solidjs/router";
import {createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import {useUser} from "../../contexts/usercontextprovider";

const TIERS = ['Instant', 'Daily', 'Weekly', 'Monthly']

function Rakeback(props) {

  const [user, { mutateUser }] = useUser()
  const [rewards, {mutate}] = createResource(fetchRakeback)
  const [time, setTime] = createSignal(Date.now())
  const [tier, setTier] = createSignal('Daily')

  const [searchParams, setSearchParams] = useSearchParams()

  async function fetchRakeback() {
    try {
      let data = await authedAPI('/user/rakeback', 'GET', null, false)
      if (!data.serverTime) return

      data.instant.claimAt = new Date(data.instant.canClaimAt).getTime()
      data.daily.claimAt = new Date(data.daily.canClaimAt).getTime()
      data.weekly.claimAt = new Date(data.weekly.canClaimAt).getTime()
      data.monthly.claimAt = new Date(data.monthly.canClaimAt).getTime()

      return data
    } catch (e) {
      return null
    }
  }

  function current() {
    return rewards()?.[tier().toLowerCase()]
  }

  function timeLeft() {
    return Math.max(0, (current()?.claimAt || 0) - time())
  }

  function progress() {
    let c = current()
    if (!c) return 0
    if (c.canClaim || !c.cooldown) return 1
    return Math.min(1, Math.max(0, 1 - timeLeft() / c.cooldown))
  }

  function formatTimeLeft() {
    const totalSeconds = Math.floor(timeLeft() / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m ${totalSeconds % 60}s`
  }

  function canClaim() {
    let c = current()
    return c?.canClaim && c?.unclaimedRakeback >= c?.min
  }

  async function claimRakeback() {
    if (!canClaim()) return

    let res = await authedAPI('/user/rakeback/claim', 'POST', JSON.stringify({
      type: tier().toLowerCase()
    }), true)

    if (res.success) {
      createNotification('success', `Successfully claimed your ${tier()} rakeback.`)

      let key = tier().toLowerCase()
      let newRewards = {...rewards()}
      newRewards[key].unclaimedRakeback = 0
      newRewards[key].canClaim = false
      newRewards[key].claimAt = Date.now() + newRewards[key].cooldown
      mutateUser({
        ...user(),
        rewards: Math.max(0, user().rewards - 1)
      })
      mutate(newRewards)
    }
  }

  function close() {
    setSearchParams({modal: null})
  }

  let timer = setInterval(() => setTime(Date.now()), 1000)
  onCleanup(() => clearInterval(timer))

  return (
    <>
      <div class='modal' onClick={() => close()}>
        <div class='rakeback-container' onClick={(e) => e.stopPropagation()}>

          <div class='header'>
            <p class='title'>{tier()} Rakeback</p>
            <button class='close' onClick={() => close()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class='tabs'>
            <For each={TIERS}>
              {(t) => (
                <button class={'tab ' + (tier() === t ? 'active' : '')} onClick={() => setTier(t)}>
                  {t}
                  <Show when={rewards()?.[t.toLowerCase()]?.canClaim && rewards()?.[t.toLowerCase()]?.unclaimedRakeback >= rewards()?.[t.toLowerCase()]?.min}>
                    <span class='dot'/>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <Show when={!rewards.loading} fallback={<Loader/>}>
            <div class='icon-panel'>
              <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none">
                <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z" fill="#e8ecf2"/>
                <path d="M12.5 8.5H11.5V9.55C10.62 9.78 10 10.52 10 11.5C10 12.6 10.9 13.25 11.85 13.55C12.75 13.83 13 14.1 13 14.5C13 14.95 12.55 15.25 12 15.25C11.34 15.25 11 14.9 10.95 14.35H9.9C9.96 15.42 10.63 16.1 11.5 16.32V17.5H12.5V16.34C13.42 16.14 14.1 15.45 14.1 14.48C14.1 13.13 12.96 12.62 12.05 12.34C11.15 12.06 11.05 11.75 11.05 11.45C11.05 11.1 11.35 10.75 12 10.75C12.6 10.75 12.9 11.08 12.93 11.5H14C13.95 10.6 13.4 9.86 12.5 9.6V8.5Z" fill="#e8ecf2"/>
              </svg>
            </div>

            <div class='amount-row'>
              <p>Bonus Amount</p>
              <p class='amount'>
                <img src='/assets/icons/coin.svg' height='14' width='14' alt=''/>
                {(current()?.unclaimedRakeback || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>

            <div class='timer-row'>
              <p class='timer-label'>Remaining time to claim</p>
              <p class='timer-value'>{current()?.canClaim ? 'Ready' : formatTimeLeft()}</p>
            </div>
            <div class='progress'>
              <div class='progress-fill' style={{width: `${progress() * 100}%`}}/>
            </div>

            <p class='description'>
              {current()?.unclaimedRakeback < current()?.min
                ? `You need a minimum of ${current()?.min} coins of ${tier().toLowerCase()} rakeback before you can claim.`
                : `You are claiming your ${tier()} Rakeback for the amount mentioned above.`}
            </p>

            <div class='buttons'>
              <button class={'claim-btn ' + (canClaim() ? '' : 'disabled')} onClick={claimRakeback}>
                Claim Rakeback
              </button>
              <button class='cancel-btn' onClick={() => close()}>Cancel</button>
            </div>
          </Show>
        </div>
      </div>

      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;

          width: 100vw;
          height: 100vh;

          background: rgba(5, 9, 14, 0.72);
          backdrop-filter: blur(3px);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
          padding: 20px;
          box-sizing: border-box;
        }

        .rakeback-container {
          width: 100%;
          max-width: 340px;

          background: #1a1f29;
          border: 1px solid #2c3340;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          border-radius: 12px;

          display: flex;
          flex-direction: column;
          gap: 14px;

          padding: 22px;
          box-sizing: border-box;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .title {
          color: #FFF;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 17px;
          font-weight: 700;
        }

        .close {
          position: absolute;
          right: -6px;
          top: -4px;

          width: 26px;
          height: 26px;

          outline: unset;
          background: #2c3340;
          border: 1px solid #3a4250;
          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #8b92a0;
          cursor: pointer;
          transition: all .2s;
        }

        .close:hover {
          color: #FFF;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .tab {
          height: 30px;

          outline: unset;
          border-radius: 5px;
          background: #12151c;
          border: 1px solid #2c3340;

          color: #8b92a0;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 11px;
          font-weight: 700;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          cursor: pointer;
          transition: all .2s;
        }

        .tab.active {
          color: #1fd65f;
          border-color: rgba(31, 214, 95, 0.35);
          background: rgba(31, 214, 95, 0.08);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1fd65f;
          box-shadow: 0 0 6px rgba(31, 214, 95, 0.8);
        }

        .icon-panel {
          width: 100%;
          height: 110px;

          border-radius: 8px;
          background: #12151c;
          border: 1px solid #2c3340;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .amount-row {
          display: flex;
          align-items: center;
          gap: 12px;

          border-radius: 8px;
          background: #12151c;
          border: 1px solid #2c3340;
          padding: 14px 16px;

          color: #FFF;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .amount {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #1fd65f;
        }

        .timer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        .timer-label {
          color: #8b92a0;
          font-size: 13px;
          font-weight: 600;
        }

        .timer-value {
          color: #FFF;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 14px;
          font-weight: 700;
        }

        .progress {
          width: 100%;
          height: 6px;

          border-radius: 2525px;
          background: #12151c;
          border: 1px solid #2c3340;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2525px;
          background: linear-gradient(90deg, #18c255 0%, #1fd65f 60%, #45e57f 100%);
          box-shadow: 0 0 8px rgba(31, 214, 95, 0.5);
          transition: width .5s;
        }

        .description {
          color: #8b92a0;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
          margin: 6px 0 30px 0;
        }

        .buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .claim-btn {
          flex: 1;
          height: 44px;

          outline: unset;
          border: unset;
          border-radius: 8px;
          background: #1fd65f;

          color: #04240f;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 14px;
          font-weight: 700;

          cursor: pointer;
          transition: all .2s;
        }

        .claim-btn:hover {
          background: #45e57f;
          box-shadow: 0 0 18px rgba(31, 214, 95, 0.35);
        }

        .claim-btn.disabled {
          background: #2c3340;
          color: #8b92a0;
          cursor: not-allowed;
          box-shadow: unset;
        }

        .cancel-btn {
          height: 44px;
          padding: 0 20px;

          outline: unset;
          border-radius: 8px;
          background: #2c3340;
          border: 1px solid #3a4250;

          color: #8b92a0;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 13px;
          font-weight: 700;

          cursor: pointer;
          transition: all .2s;
        }

        .cancel-btn:hover {
          color: #FFF;
        }
      `}</style>
    </>
  )
}

export default Rakeback
