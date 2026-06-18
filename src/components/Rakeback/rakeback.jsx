import {useSearchParams} from "@solidjs/router";
import {createResource, createSignal, onCleanup, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import RakebackTier from "./tier";
import Loader from "../Loader/loader";
import {useUser} from "../../contexts/usercontextprovider";

function Rakeback(props) {

  const [user, { mutateUser }] = useUser()
  const [rewards, {mutate}] = createResource(fetchRakeback)
  const [time, setTime] = createSignal(Date.now())

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

  function claimTier(tier) {
    tier = tier.toLowerCase()
    let newRewards = {...rewards()}
    newRewards[tier].unclaimedRakeback = 0
    newRewards[tier].canClaim = false
    newRewards[tier].claimAt = Date.now() + newRewards[tier].cooldown
    mutateUser({
      ...user(),
      rewards: Math.max(0, user().rewards - 1)
    })

    mutate(newRewards)
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
            <div class='pages'>
              <button class='page active'>
                <img src='/assets/icons/rakeback.svg' height='16' width='14' alt=''/>
                Rakeback
              </button>
            </div>

            <p class='close' onClick={() => close()}>X</p>
          </div>

          <div class='content'>
            <div className='banner'>
              <p className='title'><span
                className='gold-gradient'>Welcome to our VIP Program,</span> {props?.user?.username}</p>
              <p>Welcome to CosmicLuck Rewards! Here you will find our way of showing appreciation to
                our most loyal & active users.</p>
              <p>Below, you can claim your instant, daily, weekly & monthly rakeback. Enjoy!</p>

              <img src='/assets/art/goldswiggle.png' alt='' className='swiggle'/>
              <div class='brand-lockup'>
                <img src='/assets/logo/cosmic-luck-logo.png' height='152' width='152' alt='CosmicLuck logo' class='logo-mark'/>
                <img src='/assets/logo/cosmic-luck-words.svg' alt='CosmicLuck' class='logo-words'/>
              </div>
            </div>

            <Show when={!rewards.loading} fallback={<Loader/>}>
              <div className='tiers'>
                <RakebackTier reward={rewards()?.instant?.unclaimedRakeback} active={rewards()?.instant?.canClaim}
                              tier='Instant' period='0s' onClaim={claimTier} claimAt={rewards()?.instant?.claimAt}
                              time={time()} min={rewards()?.instant.min}/>

                <RakebackTier reward={rewards()?.daily?.unclaimedRakeback} active={rewards()?.daily?.canClaim}
                              tier='Daily' period='24 H' onClaim={claimTier} claimAt={rewards()?.daily?.claimAt}
                              time={time()} min={rewards()?.daily.min}/>

                <RakebackTier reward={rewards()?.weekly?.unclaimedRakeback} active={rewards()?.weekly?.canClaim}
                              tier='Weekly' period='7 D' onClaim={claimTier} claimAt={rewards()?.weekly?.claimAt}
                              time={time()} min={rewards()?.weekly.min}/>

                <RakebackTier reward={rewards()?.monthly?.unclaimedRakeback} active={rewards()?.monthly?.canClaim}
                              tier='Monthly' period='30 D' onClaim={claimTier} claimAt={rewards()?.monthly?.claimAt}
                              time={time()} min={rewards()?.monthly.min}/>
              </div>
            </Show>
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

          background: rgba(5, 9, 14, 0.72);
          backdrop-filter: blur(3px);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
        }

        .rakeback-container {
          max-width: 880px;
          max-height: 580px;

          height: 100%;
          width: 100%;

          background: linear-gradient(180deg, #151b24 0%, #11161d 100%);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          border-radius: 15px;
          border: 1px solid rgba(31, 214, 95, 0.16);

          display: flex;
          flex-direction: column;

          transition: max-height .3s;
          position: relative;

          overflow: hidden;
        }

        .header {
          display: flex;
          align-items: center;

          min-height: 50px;
          width: 100%;

          border-radius: 15px 15px 0px 0px;
          border-bottom: 1px solid rgba(255, 177, 62, 0.2);
          background: linear-gradient(90deg, rgba(24, 62, 42, 0.52) 0%, rgba(34, 30, 22, 0.62) 100%), #1a222d;
          box-shadow: inset 0 -1px 0 rgba(255, 177, 62, 0.12);

          padding: 0 12px 0 0;
        }

        .close {
          margin-left: auto;

          width: 30px;
          height: 30px;

          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-weight: 700;
          color: #a6b0bf;
          cursor: pointer;
          transition: all .2s;
        }

        .close:hover {
          color: #ffffff;
          border-color: rgba(31, 214, 95, 0.45);
          background: rgba(31, 214, 95, 0.16);
        }

        .pages {
          height: 100%;
        }

        .page {
          height: 100%;
          padding: 0 16px;

          display: flex;
          align-items: center;
          gap: 8px;

          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 16px;
          font-weight: 700;

          cursor: pointer;
        }

        .page.active {
          border-radius: 15px 0px 0px 0px;
          border-right: 1px solid rgba(255, 177, 62, 0.35);
          border-top: 1px solid rgba(255, 177, 62, 0.2);
          background: linear-gradient(53deg, rgba(255, 177, 62, 0.16) 10%, rgba(31, 214, 95, 0.12) 90%);
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: 25px;

          padding: 35px;
        }

        .banner {
          width: 100%;
          min-height: 170px;
          height: auto;

          padding: 20px;

          border-radius: 12px;
          border: 1px dashed rgba(255, 177, 62, 0.65);
          background: radial-gradient(120% 100% at 100% 120%, rgba(255, 177, 62, 0.18) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(135deg, #172437 0%, #2a273d 50%, #1c2a22 100%);

          display: flex;
          justify-content: center;
          flex-direction: column;
          gap: 12px;

          color: #FFF;
          font-size: 12px;
          font-weight: 500;

          position: relative;
          overflow: hidden;
        }

        .banner > p {
          max-width: 400px;
          color: #d8deea;
          line-height: 1.35;

          text-overflow: ellipsis;
          overflow: hidden;
        }

        .gold-gradient {
          background: linear-gradient(53deg, #F90 54.58%, #F9AC39 69.11%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .banner .title {
          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 20px;
          font-weight: 700;
        }

        .swiggle {
          position: absolute;
          transform: scaleX(-1);
          right: -16px;
          margin: auto 0;
          top: 0;
          bottom: 0;
          opacity: 0.4;
          pointer-events: none;
        }

        .brand-lockup {
          position: absolute;
          right: 22px;
          bottom: 10px;
          width: 190px;
          height: 150px;

          display: flex;
          align-items: flex-end;
          justify-content: center;

          border-radius: 14px;
          background: linear-gradient(180deg, rgba(15, 21, 30, 0.15) 0%, rgba(15, 21, 30, 0.52) 100%);
          border: 1px solid rgba(31, 214, 95, 0.2);
          box-shadow: inset 0 0 35px rgba(31, 214, 95, 0.08), 0 14px 30px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(1.6px);
          pointer-events: none;
        }

        .logo-mark {
          position: absolute;
          right: 18px;
          bottom: -10px;
          opacity: 0.92;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 22px rgba(31, 214, 95, 0.2));
        }

        .logo-words {
          position: absolute;
          left: 12px;
          top: 12px;
          width: 112px;
          opacity: 0.95;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
        }

        .tiers {
          display: flex;
          justify-content: space-between;
          gap: 25px;
        }

        @media only screen and (max-width: 980px) {
          .rakeback-container {
            max-width: 94vw;
            max-height: 92vh;
          }

          .content {
            padding: 20px;
            gap: 20px;
          }

          .tiers {
            gap: 14px;
          }
        }

        @media only screen and (max-width: 700px) {
          .brand-lockup, .swiggle {
            display: none;
          }

          .banner {
            align-items: center;
          }

          .tiers {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
        }

        @media only screen and (max-width: 520px) {
          .tiers {
            grid-template-columns: 1fr;
          }

          .banner .title {
            font-size: 18px;
          }
        }
      `}</style>
    </>
  )
}

export default Rakeback