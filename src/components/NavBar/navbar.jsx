import Games from "./games";
import Cases from "./cases";
import {A, useSearchParams} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import Circularprogress from "../Level/circularprogress";
import {progressToNextLevel} from "../../resources/levels";
import BottomNavBar from "./mobilenav";
import UserDropdown from "./userdropdown";
import {addDropdown} from "../../util/api";
import {useWebsocket} from "../../contexts/socketprovider";
import Countup from "../Countup/countup";
import Notifications from "./notifications";

function NavBar(props) {

    const [searchParams, setSearchParams] = useSearchParams()
    const [userDropdown, setUserDropdown] = createSignal(false)
    const [wagered, setWagered] = createSignal(0)
    const [ws] = useWebsocket()

    addDropdown(setUserDropdown)

    createEffect(() => {
        if (ws() && ws().connected) {
            ws().on('totalWagered', (amt) => setWagered(amt))
        }
    })

    return (
        <>
            <div class='navbar-container'>
                <div class='navbar'>
                    <div class='left'>
                        <A href='/' class='logo'>
                            <img src='/assets/logo/cosmic-luck-logo.png' alt='Cosmic Luck' height='30'/>
                        </A>

                        <div class='nav-links'>
                            <Games/>
                            <Cases/>

                            <button class='rewards' onClick={() => {
                                if (!props?.user) return setSearchParams({modal: 'login'})
                                setSearchParams({modal: 'rakeback'})
                            }}>
                                <img src='/assets/icons/rakeback.svg' height='12' width='10' alt=''/>
                                REWARDS
                            </button>
                        </div>
                    </div>

                    <div class='right'>
                        {props.user ? (
                            <>
                                <button class='withdraw'>
                                    Withdraw
                                    <A href='/withdraw' class='gamemode-link'/>
                                </button>

                                <button class='deposit-plus'>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 1V13M1 7H13" stroke="white" stroke-width="2.2"
                                              stroke-linecap="round"/>
                                    </svg>
                                    <A href='/deposit' class='gamemode-link'/>
                                </button>

                                <div class='balance'>
                                    <img class='coin' src='/assets/icons/coin.svg' height='18'/>
                                    <div class='balance-hover'>
                                        <p class='robux'><Countup end={props?.user?.balance} gray={true}/></p>
                                        <p class='fiat'><span class='gold'>$ </span><Countup
                                            end={props?.user?.balance / 1000 * 3.5} gray={true}/></p>
                                    </div>
                                </div>

                                <Notifications/>

                                <div class='user-dropdown-minified'>
                                    <Circularprogress progress={progressToNextLevel(props?.user?.xp || 0)}>
                                        <div class='avatar'>
                                            <img
                                                src={`${import.meta.env.VITE_SERVER_URL}/user/${props.user?.id}/img`}
                                                width='31' height='31'/>
                                        </div>
                                    </Circularprogress>
                                </div>

                                <div class={'user-dropdown-wrapper ' + (userDropdown() ? 'active' : '')}
                                     onClick={(e) => {
                                         setUserDropdown(!userDropdown())
                                         e.stopPropagation()
                                     }}>
                                    <div class='avatar-wrapper'>
                                        <Circularprogress progress={progressToNextLevel(props?.user?.xp || 0)}>
                                            <div class='avatar'>
                                                <img
                                                    src={`${import.meta.env.VITE_SERVER_URL}/user/${props.user?.id}/img`}
                                                    width='31' height='31'/>
                                            </div>
                                        </Circularprogress>
                                    </div>

                                    <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                                            fill="#8b92a0"/>
                                    </svg>

                                    <UserDropdown user={props?.user} active={userDropdown()}
                                                  setActive={setUserDropdown}/>
                                </div>
                            </>
                        ) : (
                            <button class='bevel-gold signin' onClick={() => setSearchParams({modal: 'login'})}>SIGN
                                IN</button>
                        )}
                    </div>
                </div>

                <BottomNavBar chat={props.chat} setChat={props.setChat}/>
            </div>

            <style jsx>{`
              .navbar-container {
                width: 100%;
                height: fit-content;
                z-index: 3;
                position: sticky;
                top: 0;
              }

              .navbar {
                width: 100%;
                height: 60px;

                box-sizing: border-box;
                padding: 0 22px;

                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;

                background: #12151c;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              }

              .left, .right {
                display: flex;
                align-items: center;
                gap: 10px;
                height: 100%;
              }

              .logo {
                display: flex;
                align-items: center;
                margin-right: 10px;
              }

              .nav-links {
                display: flex;
                align-items: center;
                gap: 4px;
              }

              .rewards {
                display: flex;
                align-items: center;
                gap: 8px;

                height: 36px;
                padding: 0 12px;
                border-radius: 8px;

                outline: unset;
                border: unset;
                background: transparent;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 14px;
                color: #8b92a0;

                cursor: pointer;
                transition: color .2s, background .2s;
              }

              .rewards:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.04);
              }

              .withdraw {
                position: relative;

                height: 38px;
                padding: 0 16px;
                border-radius: 8px;

                outline: unset;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: #1a1f29;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 14px;
                color: #c3cad6;

                cursor: pointer;
                transition: background .2s, color .2s;
              }

              .withdraw:hover {
                background: #222a36;
                color: #fff;
              }

              .deposit-plus {
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;

                height: 38px;
                width: 38px;
                min-width: 38px;
                border-radius: 8px;

                outline: unset;
                border: unset;
                background: radial-gradient(60% 60% at 50% 50%, #25e06b 0%, #18b853 100%);
                box-shadow: 0px 2px 0px 0px #16a049, 0px -2px 0px 0px #5ceb90;

                cursor: pointer;
                transition: filter .2s;
              }

              .deposit-plus:hover {
                filter: brightness(1.08);
              }

              .balance {
                display: flex;
                align-items: center;
                gap: 10px;

                height: 38px;
                padding: 0 16px;
                border-radius: 8px;

                border: 1px solid rgba(31, 214, 95, 0.4);
                background: radial-gradient(60% 60% at 50% 50%, rgba(31, 214, 95, 0.12) 0%, rgba(24, 184, 83, 0.12) 100%), #11141b;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 14px;
                color: #fff;
                font-variant-numeric: tabular-nums;
              }

              .balance-hover {
                position: relative;
                display: flex;
                align-items: center;
                cursor: pointer;
              }

              .balance-hover:hover .robux {
                opacity: 0;
              }

              .balance-hover:hover .fiat {
                opacity: 1;
              }

              .robux, .fiat {
                transition: opacity .3s;
              }

              .fiat {
                position: absolute;
                left: 0;
                opacity: 0;
                white-space: nowrap;
              }

              .right :global(.notifications-container) {
                margin-left: 2px;
              }

              .user-dropdown-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
                height: 42px;
                position: relative;

                cursor: pointer;
              }

              .avatar-wrapper {
                background: #1a1f29;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;

                display: flex;
                align-items: center;
                justify-content: center;

                height: 42px;
                aspect-ratio: 1;
              }

              .user-dropdown-wrapper.active .arrow {
                transform: rotate(180deg);
              }

              .arrow {
                transition: transform .2s;
              }

              .avatar {
                position: relative;
                height: 35px;
                width: 35px;
                overflow: hidden;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 6px;
              }

              .avatar img {
                position: relative;
                z-index: 1;
                border-radius: 6px;
              }

              .signin {
                outline: unset;
                border: unset;
                padding: unset;

                height: 40px;
                width: 120px;
                border-radius: 8px;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 14px;
                color: white;

                cursor: pointer;
              }

              .user-dropdown-minified {
                display: none;
              }

              @media only screen and (max-width: 1000px) {
                .nav-links, .withdraw, .user-dropdown-wrapper {
                  display: none;
                }

                .user-dropdown-minified {
                  display: block;
                }

                .navbar {
                  padding: 0 14px;
                }

                .logo {
                  margin-right: 0;
                }
              }

              @media only screen and (max-width: 560px) {
                .logo img {
                  height: 22px;
                }

                .balance {
                  padding: 0 12px;
                  font-size: 12px;
                }
              }
            `}</style>
        </>
    );
}

export default NavBar;
