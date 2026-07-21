import {createEffect, createSignal} from "solid-js";
import {useRain} from "../../contexts/raincontext";
import Captcha from "../Captcha/captcha";
import {authedAPI, createNotification} from "../../util/api";
import Countup from "../Countup/countup";
import Avatar from "../Level/avatar";

function SidebarRain(props) {

    const [rain, userRain, time, userTimer, joinedRain] = useRain()
    const [token, setToken] = createSignal(null)
    const [showCaptcha, setShowCaptcha] = createSignal(false)

    async function ensureHcaptcha() {
      if (typeof window !== 'undefined' && window.hcaptcha) {
        return true
      }

      const existing = document.querySelector('script[data-hcaptcha="true"]')
      if (existing) {
        await new Promise((resolve) => {
          if (window.hcaptcha) return resolve(true)
          existing.addEventListener('load', () => resolve(true), { once: true })
          existing.addEventListener('error', () => resolve(false), { once: true })
        })
        return !!window.hcaptcha
      }

      const script = document.createElement('script')
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.hcaptcha = 'true'

      const loaded = await new Promise((resolve) => {
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
      })

      return loaded && !!window.hcaptcha
    }

    async function joinRain() {
        let res = await authedAPI('/rain/join', 'POST', JSON.stringify({
            'captchaResponse': token()
        }), true)

        if (res.success) {
            setToken(null)
            joinedRain()
            createNotification('success', `Successfully joined the rain.`)
        }

        if (res.error === 'NOT_LINKED') {
            let discordRes = await authedAPI('/discord/link', 'POST', null, true)
            if (discordRes.url) {
                attemptToLinkDiscord(discordRes.url)
            }
        }

        setShowCaptcha(false)
    }

    function attemptToLinkDiscord(url) {
        let popupWindow = window.open(url, 'popUpWindow', 'height=700,width=500,left=100,top=100,resizable=yes,scrollbar=yes')
        window.addEventListener("message", function (event) {
            if (event.data === "Authorized") {
                popupWindow.close();
                joinRain()
            }
        }, false)
    }

    async function handleRainJoin() {
        if (userRain()?.joined || rain()?.joined) return createNotification('error', 'You have already joined this rain.')

      const hasCaptcha = await ensureHcaptcha()
      if (!hasCaptcha) {
        // Fallback path for environments where captcha is disabled or script is blocked.
        return joinRain()
      }

        setShowCaptcha(true)

      setTimeout(() => {
        if (!window.hcaptcha) return

        window.hcaptcha.render('captcha-div', {
            sitekey: '5029f0f4-b80b-42a8-8c0e-3eba4e9edc4c',
            theme: 'dark',
            callback: function (token) {
                setToken(token)
                joinRain()
            }
      })
      }, 0)
    }

    function formatTimeLeft(ms) {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
        return `${seconds}s`
    }

    const hostName = () => userRain()?.host?.username || rain()?.host?.username || 'COSMIC LUCK'
    const isJoined = () => userRain()?.joined || rain()?.joined

    return (
        <>
            <Captcha active={showCaptcha()} close={() => setShowCaptcha(false)}/>

            <div class='rain-container fadein'>
                <div class='rain-glow'/>

                <div class='rain-top'>
                    <div class='rain-icon'>
                        {userRain()?.host ? (
                            <Avatar id={userRain().host.id} xp={userRain().host.xp} height='32'/>
                        ) : (
                            <svg width='22' height='22' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M48 26.5C48 26.33 47.99 26.17 47.98 26C47.33 19.27 41.77 14 35 14C30.09 14 25.82 16.7 23.55 20.73C22.76 20.27 21.91 20 21 20C18.24 20 16 22.24 16 25C16 25.18 16.01 25.35 16.03 25.52C13.72 26.58 12 28.9 12 31.5C12 35.09 14.91 38 18.5 38H47.5C51.64 38 55 34.64 55 30.5C55 28.28 54.01 26.27 52.44 24.92C50.93 25.01 49.41 25.61 48.16 26.71C48.05 26.64 48 26.57 48 26.5Z' fill='#1fd65f' opacity='0.9'/>
                                <line x1='22' y1='44' x2='20' y2='52' stroke='#1fd65f' stroke-width='3' stroke-linecap='round' opacity='0.7'/>
                                <line x1='30' y1='44' x2='28' y2='52' stroke='#1fd65f' stroke-width='3' stroke-linecap='round' opacity='0.7'/>
                                <line x1='38' y1='44' x2='36' y2='52' stroke='#1fd65f' stroke-width='3' stroke-linecap='round' opacity='0.7'/>
                                <line x1='46' y1='44' x2='44' y2='52' stroke='#1fd65f' stroke-width='3' stroke-linecap='round' opacity='0.7'/>
                            </svg>
                        )}
                    </div>

                    <div class='rain-title'>
                        <span class='host-name'>{hostName()}</span>
                        <span class='hosted-text'>HOSTED A RAIN</span>
                    </div>
                </div>

                <div class='rain-bottom'>
                    <div class='rain-stats'>
                        <div class='stat-pill'>
                            <img src='/assets/icons/coin.svg' height='12' alt=''/>
                            <Countup end={userRain()?.amount || rain()?.amount || 0} gray={true}/>
                        </div>
                        <div class='stat-pill'>
                            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <circle cx='12' cy='12' r='10' stroke='#1fd65f' stroke-width='2'/>
                                <path d='M12 7V12L15 15' stroke='#1fd65f' stroke-width='2' stroke-linecap='round'/>
                            </svg>
                            <span>{formatTimeLeft(userRain() ? userTimer() : time())}</span>
                        </div>
                    </div>

                    <button class={'claim' + (isJoined() ? ' joined' : '')} onClick={() => handleRainJoin()} disabled={isJoined()}>
                        {isJoined() ? '✓ IN' : 'CLAIM'}
                    </button>
                </div>
            </div>

            <style jsx>{`
              .rain-container {
                width: 100%;

                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 1;

                padding: 10px 14px;
                background: #090c11;
                border-top: 1px solid rgba(31, 214, 95, 0.15);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                overflow: hidden;
                position: relative;
              }

              .rain-glow {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: radial-gradient(ellipse at 10% 50%, rgba(31, 214, 95, 0.07) 0%, transparent 60%);
                pointer-events: none;
              }

              .rain-container > * {
                position: relative;
                z-index: 1;
              }

              .rain-top {
                display: flex;
                align-items: center;
                gap: 10px;
              }

              .rain-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 36px;
                height: 36px;
                background: rgba(31, 214, 95, 0.08);
                border: 1px solid rgba(31, 214, 95, 0.2);
                border-radius: 8px;
              }

              .rain-title {
                display: flex;
                flex-direction: column;
                gap: 1px;
                min-width: 0;
              }

              .host-name {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 12px;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .hosted-text {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 600;
                font-size: 10px;
                color: #1fd65f;
                letter-spacing: 0.08em;
              }

              .rain-bottom {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .rain-stats {
                display: flex;
                gap: 5px;
                align-items: center;
                flex: 1;
              }

              .stat-pill {
                display: flex;
                align-items: center;
                gap: 4px;

                height: 26px;
                padding: 0 8px;

                background: #12151c;
                border: 1px solid rgba(255, 255, 255, 0.07);
                border-radius: 6px;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 11px;
                color: #c3cad6;
                font-variant-numeric: tabular-nums;
              }

              .claim {
                flex-shrink: 0;
                height: 26px;
                padding: 0 12px;

                outline: unset;
                border: unset;
                border-radius: 6px;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 11px;
                letter-spacing: 0.04em;
                color: #021a09;
                cursor: pointer;
                white-space: nowrap;

                background: linear-gradient(180deg, #22e86a 0%, #1fd65f 60%, #18c255 100%);
                box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 -1px 0 rgba(0,0,0,0.3) inset;
                transition: filter .2s;
              }

              .claim:hover:not(:disabled) {
                filter: brightness(1.08);
              }

              .claim.joined {
                background: rgba(31, 214, 95, 0.1);
                border: 1px solid rgba(31, 214, 95, 0.3);
                color: #1fd65f;
                box-shadow: none;
                cursor: default;
              }

              .fadein {
                animation: fadein .4s forwards ease;
              }

              @keyframes fadein {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
            `}</style>
        </>
    );
}

export default SidebarRain;
