import Games from "./games";
import Cases from "./cases";
import {A, useSearchParams, useNavigate, useLocation} from "@solidjs/router";
import './navbar.css';
import {createEffect, createSignal, onCleanup} from "solid-js";
import {progressToNextLevel, getUserLevel} from "../../resources/levels";
import BottomNavBar from "./mobilenav";
import UserDropdown from "./userdropdown";
import {addDropdown, closeDropdowns} from "../../util/api";
import {useWebsocket} from "../../contexts/socketprovider";
import Countup from "../Countup/countup";
import Notifications from "./notifications";
import {USD_PER_COIN} from "../../util/numbers";

function NavBar(props) {

    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const [userDropdown, setUserDropdown] = createSignal(false)
    const [wagered, setWagered] = createSignal(0)
    const [ws] = useWebsocket()

    addDropdown(setUserDropdown)

    createEffect(() => {
      const socket = ws()
      if (!socket || !socket.connected) return

      const onTotalWagered = (amt) => setWagered(amt)
      socket.off('totalWagered', onTotalWagered)
      socket.on('totalWagered', onTotalWagered)

      onCleanup(() => {
        socket.off('totalWagered', onTotalWagered)
      })
    })

    return (
        <>
            <div class='navbar-container' onKeyDown={e => {
                if (e.key === 'Escape') {
                    const trigger = e.currentTarget.querySelector('[aria-expanded="true"]:not([aria-controls="site-chat"])')
                    closeDropdowns(); trigger?.focus(); e.stopPropagation()
                }
            }}>
                <header class='navbar'>
                    <div class='left'>
                        <div class='navbar-logo'>
                            <A href='/' aria-label='Cosmic Luck home'>
                                <img src='/assets/logo/cosmic-luck-logo.webp' alt='Cosmic Luck'/>
                            </A>
                        </div>
                        <nav class='nav-links' aria-label='Primary navigation'>
                            <Games/>
                            <Cases/>

                            <button class='rewards nav-button nav-button-menu' aria-label='Rewards' aria-haspopup='dialog'
                                    classList={{'is-current': location.pathname.startsWith('/rewards') || searchParams.modal === 'rakeback'}} onClick={() => {
                                if (!props?.user) return setSearchParams({modal: 'login'})
                                setSearchParams({modal: 'rakeback'})
                            }}>
                                <svg class='rewards-icon nav-button-icon' width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                    <rect x='1.5' y='6' width='13' height='8.5' rx='1.5' fill='currentColor' opacity='0.85'/>
                                    <rect x='0.75' y='4' width='14.5' height='3.5' rx='1.5' fill='currentColor'/>
                                    <line x1='8' y1='4' x2='8' y2='14.5' stroke='rgba(0,0,0,0.35)' stroke-width='1.5'/>
                                    <path d='M8 4 C8 4 5.5 3 4.5 1.5 C4 0.5 5.5 0.5 6 1.5 C6.5 2.5 8 4 8 4Z' fill='currentColor'/>
                                    <path d='M8 4 C8 4 10.5 3 11.5 1.5 C12 0.5 10.5 0.5 10 1.5 C9.5 2.5 8 4 8 4Z' fill='currentColor'/>
                                </svg>
                                <span class='nav-button-copy'>
                                    <span class='nav-button-title'>REWARDS</span>
                                    <span class='nav-button-detail' aria-hidden='true'>Claim your bonuses</span>
                                </span>
                                <svg class='rewards-arrow' width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </nav>
                    </div>

                    <div class='right'>
                        <button class='chat-toggle nav-button' type='button' aria-label={props.chat ? 'Close chat' : 'Open chat'} aria-expanded={props.chat} aria-controls='site-chat' onClick={() => props.setChat(!props.chat)}>
                            <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'><path d='M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z'/><path d='M7 10h9M7 14h6'/></svg>
                        </button>
                        {props.user ? (
                            <>
                              <div class='wallet-group' aria-label='Wallet'>
                                <div class='balance'>
                                  <img class='coin' src='/assets/icons/coin.svg' height='22' width='22' alt='Coins'/>
                                  <div class='balance-copy'>
                                    <span class='wallet-label'>BALANCE</span>
                                    <div class='balance-hover'>
                                        <p class='coins'><Countup end={props?.user?.balance} gray={true}/></p>
                                        <p class='fiat'><span class='gold'>$ </span><Countup
                                            end={(props?.user?.balance || 0) * USD_PER_COIN} gray={true}/></p>
                                    </div>
                                  </div>
                                </div>
                                <button class='deposit nav-button nav-button-primary' type='button' onClick={() => navigate('/deposit')}>
                                    <svg class='deposit-icon' width='14' height='14' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'><path d='M8 3v10M3 8h10'/></svg>
                                    Deposit
                                </button>
                              </div>

                                <button class='withdraw nav-button' type='button' onClick={() => navigate('/withdraw')}>Withdraw</button>

                                <Notifications/>

                                <div class={'user-dropdown-wrapper ' + (userDropdown() ? 'active' : '')}>
                                  <button class='user-trigger nav-button' type='button' aria-label='Account menu' aria-expanded={userDropdown()} aria-controls='account-menu' onClick={e => {
                                    const wasOpen = userDropdown(); closeDropdowns(); setUserDropdown(!wasOpen); e.stopPropagation()
                                  }}>
                                    <img class='user-avatar'
                                         src={`${import.meta.env.VITE_SERVER_URL || ''}/user/${props.user?.id}/img`}
                                         alt='' onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/icons/default-avatar.svg' }}
                                         width='34' height='34'/>

                                    <div class='user-info'>
                                        <div class='user-name-row'>
                                            <span class='user-name'>{props?.user?.username}</span>
                                            <span class='user-level'>LVL {getUserLevel(props?.user?.xp || 0)}</span>
                                        </div>
                                        <div class='xp-bar-track'>
                                            <div class='xp-bar-fill' style={`width:${Math.max(0, Math.min(100, 100 - (progressToNextLevel(props?.user?.xp || 0))))}%`}/>
                                        </div>
                                    </div>

                                    <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                                            fill="#6b7280"/>
                                    </svg>

                                  </button>
                                    <UserDropdown id="account-menu" user={props?.user} active={userDropdown()}
                                                  setActive={setUserDropdown}/>
                                </div>
                            </>
                        ) : (
                            <button class='signin nav-button nav-button-primary' aria-haspopup='dialog' onClick={() => setSearchParams({modal: 'login'})}>Sign in
                                <svg width='14' height='14' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'><path d='M3 8h10M9 4l4 4-4 4'/></svg>
                            </button>
                        )}
                    </div>
                </header>

                <BottomNavBar user={props.user} chat={props.chat} setChat={props.setChat}/>
            </div>


        </>
    );
}

export default NavBar;
