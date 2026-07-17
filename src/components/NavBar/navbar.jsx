import Games from "./games";
import Cases from "./cases";
import {A, useSearchParams} from "@solidjs/router";
import {createEffect, createSignal} from "solid-js";
import {progressToNextLevel, getUserLevel} from "../../resources/levels";
import BottomNavBar from "./mobilenav";
import UserDropdown from "./userdropdown";
import {addDropdown} from "../../util/api";
import {useWebsocket} from "../../contexts/socketprovider";
import Countup from "../Countup/countup";
import Notifications from "./notifications";
import {USD_PER_COIN} from "../../util/numbers";

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
                        <div class='nav-links'>
                            <Games/>
                            <Cases/>

                            <button class='rewards' onClick={() => {
                                if (!props?.user) return setSearchParams({modal: 'login'})
                                setSearchParams({modal: 'rakeback'})
                            }}>
                                <svg class='rewards-icon' width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                    <rect x='1.5' y='6' width='13' height='8.5' rx='1.5' fill='currentColor' opacity='0.85'/>
                                    <rect x='0.75' y='4' width='14.5' height='3.5' rx='1.5' fill='currentColor'/>
                                    <line x1='8' y1='4' x2='8' y2='14.5' stroke='rgba(0,0,0,0.35)' stroke-width='1.5'/>
                                    <path d='M8 4 C8 4 5.5 3 4.5 1.5 C4 0.5 5.5 0.5 6 1.5 C6.5 2.5 8 4 8 4Z' fill='currentColor'/>
                                    <path d='M8 4 C8 4 10.5 3 11.5 1.5 C12 0.5 10.5 0.5 10 1.5 C9.5 2.5 8 4 8 4Z' fill='currentColor'/>
                                </svg>
                                <span>REWARDS</span>
                                <svg class='rewards-arrow' width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class='right'>
                        {props.user ? (
                            <>
                                <button class='deposit'>
                                    Deposit
                                    <A href='/deposit' class='gamemode-link'/>
                                </button>

                                <button class='withdraw'>
                                    Withdraw
                                    <A href='/withdraw' class='gamemode-link'/>
                                </button>

                                <div class='balance'>
                                    <img class='coin' src='/assets/icons/coin.svg' height='18'/>
                                    <div class='balance-hover'>
                                        <p class='coins'><Countup end={props?.user?.balance} gray={true}/></p>
                                        <p class='fiat'><span class='gold'>$ </span><Countup
                                            end={(props?.user?.balance || 0) * USD_PER_COIN} gray={true}/></p>
                                    </div>
                                </div>

                                <Notifications/>

                                <div class={'user-dropdown-wrapper ' + (userDropdown() ? 'active' : '')}
                                     onClick={(e) => {
                                         setUserDropdown(!userDropdown())
                                         e.stopPropagation()
                                     }}>
                                    <img class='user-avatar'
                                         src={`${import.meta.env.VITE_SERVER_URL}/user/${props.user?.id}/img`}
                                         onError={(e) => e.target.src = '/assets/icons/default-avatar.svg'}
                                         width='30' height='30'/>

                                    <div class='user-info'>
                                        <div class='user-name-row'>
                                            <span class='user-level'>{getUserLevel(props?.user?.xp || 0)}</span>
                                            <span class='user-name'>{props?.user?.username}</span>
                                        </div>
                                        <div class='xp-bar-track'>
                                            <div class='xp-bar-fill' style={`width:${Math.max(2, 100 - (progressToNextLevel(props?.user?.xp || 0)))}%`}/>
                                        </div>
                                    </div>

                                    <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                                            fill="#6b7280"/>
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

                <BottomNavBar user={props.user} chat={props.chat} setChat={props.setChat}/>
            </div>

            <style jsx>{`
              .navbar-container {
                width: 100%;
                height: fit-content;
                z-index: 3;
                position: sticky;
                top: 0;

                &::after {
                  content: '';
                  position: absolute;
                  bottom: -1px;
                  left: 10%;
                  right: 10%;
                  height: 1px;
                  background: linear-gradient(90deg, transparent 5%, rgba(31, 214, 95, 0.12) 30%, rgba(31, 214, 95, 0.18) 50%, rgba(31, 214, 95, 0.12) 70%, transparent 95%);
                  pointer-events: none;
                }
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

                background:
                  radial-gradient(110% 100% at 50% -28%, rgba(31, 214, 95, 0.08) 0%, transparent 65%),
                  linear-gradient(180deg, rgba(18, 24, 34, 0.82), rgba(9, 13, 19, 0.88));
                border-bottom: 1px solid rgba(31, 214, 95, 0.07);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  0 10px 30px rgba(0, 0, 0, 0.32),
                  0 0 40px rgba(31, 214, 95, 0.03);
                backdrop-filter: blur(20px) saturate(140%);
                -webkit-backdrop-filter: blur(20px) saturate(140%);
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
                position: relative;
                display: flex;
                align-items: center;
                gap: 7px;

                height: 36px;
                padding: 0 14px;
                border-radius: 8px;

                outline: unset;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: linear-gradient(180deg, rgba(38, 44, 57, 0.72), rgba(22, 27, 37, 0.82));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.18);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 13px;
                color: #8b92a0;

                cursor: pointer;
                transition: all .22s ease;
                overflow: hidden;
              }

              .rewards:hover {
                color: #c6ccd8;
                border-color: rgba(255, 255, 255, 0.14);
                background: linear-gradient(180deg, rgba(48, 55, 70, 0.78), rgba(28, 34, 46, 0.88));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 18px rgba(0,0,0,0.22);
                transform: translateY(-1px);
              }

              .rewards:active {
                transform: translateY(0px);
              }

              .rewards span {
                position: relative;
                z-index: 1;
                letter-spacing: 0.3px;
              }

              .rewards-icon {
                position: relative;
                z-index: 1;
                color: #8b92a0;
                transition: color .22s ease;
              }

              .rewards-arrow {
                position: relative;
                z-index: 1;
                color: #8b92a0;
                transition: color .22s ease;
              }

              .rewards:hover .rewards-icon,
              .rewards:hover .rewards-arrow {
                color: #c6ccd8;
              }

              .withdraw {
                position: relative;

                height: 38px;
                padding: 0 16px;
                border-radius: 8px;

                outline: unset;
                border: 1px solid var(--glass-border);
                background: linear-gradient(180deg, rgba(42, 50, 64, 0.58), rgba(21, 27, 37, 0.66));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.18);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 14px;
                color: #c3cad6;

                cursor: pointer;
                transition: background .2s, color .2s;
              }

              .withdraw:hover {
                background: linear-gradient(180deg, rgba(52, 62, 78, 0.68), rgba(25, 32, 43, 0.76));
                color: #fff;
              }

              .deposit {
                position: relative;

                height: 38px;
                padding: 0 18px;
                border-radius: 8px;

                outline: unset;
                border: 1px solid rgba(52, 232, 114, 0.45);
                background: linear-gradient(180deg, #25e46a 0%, #1fd65f 55%, #18c255 100%);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.26),
                  inset 0 -2px 0 rgba(0, 0, 0, 0.18),
                  0 4px 18px rgba(31, 214, 95, 0.32);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 14px;
                color: #021a09;

                cursor: pointer;
                transition: filter .18s, transform .18s, box-shadow .18s;
              }

              .deposit:hover {
                filter: brightness(1.07);
                transform: translateY(-1px);
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.26),
                  inset 0 -2px 0 rgba(0, 0, 0, 0.16),
                  0 8px 24px rgba(31, 214, 95, 0.40);
              }

              .deposit:active {
                filter: brightness(0.97);
                transform: translateY(0);
              }

              .balance {
                display: flex;
                align-items: center;
                gap: 10px;

                height: 38px;
                padding: 0 14px;
                border-radius: 8px;

                border: 1px solid rgba(31, 214, 95, 0.32);
                background:
                  radial-gradient(80% 110% at 50% 0%, rgba(31, 214, 95, 0.14), transparent 60%),
                  linear-gradient(180deg, rgba(14, 22, 20, 0.88), rgba(8, 14, 14, 0.92));
                box-shadow:
                  inset 0 1px 0 rgba(255, 255, 255, 0.06),
                  inset 0 0 0 1px rgba(31, 214, 95, 0.06),
                  0 6px 20px rgba(0, 0, 0, 0.22);

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

              .balance-hover:hover .coins {
                opacity: 0;
              }

              .balance-hover:hover .fiat {
                opacity: 1;
              }

              .coins, .fiat {
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
                padding: 0 10px 0 6px;
                position: relative;

                background: linear-gradient(180deg, rgba(39, 47, 60, 0.58), rgba(18, 23, 32, 0.72));
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 22px rgba(0,0,0,0.2);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);

                cursor: pointer;
                transition: background .2s;
              }

              .user-dropdown-wrapper:hover {
                background: linear-gradient(180deg, rgba(49, 58, 73, 0.68), rgba(23, 29, 40, 0.82));
              }

              .user-dropdown-wrapper.active .arrow {
                transform: rotate(180deg);
              }

              .arrow {
                transition: transform .2s;
                flex-shrink: 0;
              }

              .user-avatar {
                border-radius: 6px;
                object-fit: cover;
                flex-shrink: 0;
              }

              .user-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 60px;
              }

              .user-name-row {
                display: flex;
                align-items: center;
                gap: 5px;
              }

              .user-level {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 12px;
                color: #1fd65f;
              }

              .user-name {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 13px;
                color: #ffffff;
                max-width: 80px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              }

              .xp-bar-track {
                width: 100%;
                height: 3px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
              }

              .xp-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #18c255, #1fd65f);
                border-radius: 2px;
                transition: width .5s ease;
              }

              .signin {
                outline: unset;
                padding: 0 22px;

                height: 40px;
                min-width: 110px;
                border-radius: 8px;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 13px;
                letter-spacing: 0.4px;
                color: #021a09;

                cursor: pointer;
              }

              @media only screen and (max-width: 1000px) {
                .nav-links, .withdraw, .deposit, .user-info, .arrow {
                  display: none;
                }

                .navbar {
                  padding: 0 14px;
                }
              }
            `}</style>
        </>
    );
}

export default NavBar;
