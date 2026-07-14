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
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                    <path d='M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z' fill='#1fd65f'/>
                                    <path d='M12 6v6l4 2' stroke='#0a5e2a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                                </svg>
                                REWARDS
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
                                        <p class='robux'><Countup end={props?.user?.balance} gray={true}/></p>
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

                background:
                  linear-gradient(180deg, rgba(20, 26, 36, 0.88), rgba(11, 15, 22, 0.78));
                border-bottom: 1px solid var(--glass-border);
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 10px 30px rgba(0, 0, 0, 0.24);
                backdrop-filter: blur(16px) saturate(130%);
                -webkit-backdrop-filter: blur(16px) saturate(130%);
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
                border: unset;
                background: linear-gradient(180deg, #22e86a 0%, #1fd65f 60%, #18c255 100%);
                box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.3) inset;

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 14px;
                color: #021a09;

                cursor: pointer;
                transition: filter .2s;
              }

              .deposit:hover {
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
                background:
                  radial-gradient(90% 120% at 50% 0%, rgba(31, 214, 95, 0.2), transparent 58%),
                  linear-gradient(180deg, rgba(17, 27, 26, 0.84), rgba(10, 17, 18, 0.88));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 22px rgba(0,0,0,0.22), 0 0 20px rgba(31,214,95,0.06);

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
