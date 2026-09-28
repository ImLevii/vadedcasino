import {A, useSearchParams} from "@solidjs/router";
import {ADMIN_ROLES} from "../../resources/users";
import {getUserLevel} from '../../resources/levels';
import StaffModeButton from '../Chat/staffmode';
import {logout} from "../../util/api";

function UserDropdown(props) {

    const [, setSearchParams] = useSearchParams()

    return (
        <>
            <div id={props.id} inert={props.active ? undefined : ''} aria-hidden={!props.active} class={'dropdown' + (props?.mobile ? ' mobile ' : ' ') + (props.active ? 'active' : '')} onClick={(e) => e.stopPropagation()}>
                <div class='decoration-arrow'/>
                <div class='links'>
                    {props.user && <div class='account-summary'><span>{getUserLevel(props.user.xp || 0)}</span><strong>{props.user.username}</strong></div>}
                    <StaffModeButton/>
                    <div class='menu-group'>
                      <A href='/withdraw' class='user-dropdown-link withdraw' onClick={() => props.setActive(false)}>
                        <img src='/assets/icons/cart.svg' height='12' alt=''/>
                        Withdraw
                      </A>
                    </div>

                  <div class='menu-group'>
                    <A href='/profile' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/user.svg' height='12' alt=''/>
                      Profile
                    </A>

                    <A href='/profile/transactions' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/transactions.svg' height='12' alt=''/>
                      Transactions
                    </A>

                    <A href='/profile/settings' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/settings.svg' height='12' alt=''/>
                      Settings
                    </A>

                    <A href='/profile/history' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/history.svg' height='12'alt=''/>
                      History
                    </A>
                    </div>

                  <div class='menu-group divided'>
                    <A href='/rewards' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/coin.svg' height='14' alt=''/>
                      Rewards
                    </A>
                    <A href='/affiliates' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/user.svg' height='14' alt=''/>
                      Affiliates
                    </A>
                    <A href='/docs/provably' class='user-dropdown-link' onClick={() => props.setActive(false)}>
                      <img src='/assets/icons/settings.svg' height='14' alt=''/>
                      Provably Fair
                    </A>
                    <button class='user-dropdown-link reward' onClick={() => {
                      setSearchParams({ modal: 'freecoins' })
                      props.setActive(false)
                    }}>
                      <img src='/assets/icons/coin.svg' height='12' alt=''/>
                      Free Coins
                      <span class='reward-dot'/>
                    </button>

                    <button class='user-dropdown-link signout' onClick={() => logout()}>
                      <img src='/assets/icons/signout.svg' height='12' alt=''/>
                      Sign out
                    </button>
                    </div>

                    {ADMIN_ROLES?.includes(props?.user?.role) && (
                    <div class='menu-group divided'>
                      <A href='/admin' class='user-dropdown-link admin' onClick={() => props?.setActive(false)}>
                        <img src='/assets/icons/user.svg' height='12' alt=''/>
                        Admin
                      </A>
                    </div>
                    )}
                </div>
            </div>

            <style jsx>{`
              .dropdown {
                position: absolute;
                min-width: 210px;
                max-height: 0;

                top: calc(var(--nav-control-height,40px) + 5px);
                right: 0;
                z-index: 1;

                border-radius: 8px 0 8px 8px;
                transition: max-height .28s ease, opacity .2s ease, transform .25s ease;
                overflow: hidden;
                opacity: 0;
                transform: translateY(-5px);
                pointer-events: none;

                cursor: default;
              }

              .mobile {
                top: unset;
                bottom: 70px;
                min-width: 200px;
                right: unset;
                left: 0;
              }

              .dropdown.active {
                max-height: min(680px, calc(100dvh - 90px));
                overflow-y: auto;
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
              }

              svg.active {
                transform: rotate(180deg);
              }

              .decoration-arrow {
                width: 13px;
                height: 9px;

                top: 1px;
                background: rgba(27, 35, 47, 0.96);
                position: absolute;
                right: 0;

                border-left: 1px solid rgba(255,255,255,0.08);
                border-right: 1px solid rgba(255,255,255,0.08);
                border-top: 1px solid rgba(255,255,255,0.08);

                clip-path: polygon(0% 100%, 100% 0%, 100% 100%);
              }

              .mobile .decoration-arrow {
                display: none;
              }

              .links {
                display: flex;
                flex-direction: column;
                padding: 7px;

                border: 1px solid var(--glass-border);
                background: linear-gradient(180deg, rgba(29, 37, 49, 0.96), rgba(12, 17, 24, 0.97));
                border-radius: 0 0 8px 8px;
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 16px 40px rgba(0,0,0,0.42);
                backdrop-filter: blur(18px) saturate(125%);
                -webkit-backdrop-filter: blur(18px) saturate(125%);

                margin-top: 9px;
              }
              .account-summary {display:flex;align-items:center;gap:10px;padding:14px 12px;margin-bottom:8px;background:#14191d;border:1px solid #ffffff06;border-radius:4px;font-size:12px;}
              .account-summary>span {padding:2px 6px;border-radius:3px;background:#a6a8ac;color:#15191c;font-size:10px;font-weight:700;}
              .account-summary strong {color:#00edac;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
              .dropdown {min-width:240px;border-radius:5px;}
              .links {padding:12px;background:#20262e;border:1px solid #ffffff09;border-radius:5px;box-shadow:0 14px 40px #0008;}
              .user-dropdown-link {min-height:40px;}
              .links :global(a.user-dropdown-link::after) {content:'\u203a';margin-left:auto;color:#00d59b;font-size:18px;}

              .menu-group {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .menu-group.divided {
                margin-top: 5px;
                padding-top: 6px;
                border-top: 1px solid rgba(255,255,255,0.065);
              }

              .links :global(.user-dropdown-link) {
                position: relative;
                width: 100%;
                min-height: 36px;
                padding: 0 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;
                box-shadow: none;
                color: #aeb7c5;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 12px;
                font-weight: 600;
                text-align: left;
                text-decoration: none;
                cursor: pointer;
                transition: color .16s ease, background .16s ease, border-color .16s ease, transform .16s ease;
              }

              .links :global(.user-dropdown-link:hover) {
                color: #f0f4f8;
                border-color: rgba(255,255,255,0.065);
                background: rgba(255,255,255,0.055);
                transform: translateX(1px);
              }

              .links :global(.user-dropdown-link img) {
                width: 15px;
                height: 15px;
                object-fit: contain;
                opacity: .66;
                filter: grayscale(.2);
                transition: opacity .16s ease;
              }

              .links :global(.user-dropdown-link:hover img) {
                opacity: 1;
              }

              .links :global(.reward) {
                color: #b8e8c8;
                border-color: rgba(31,214,95,0.12);
                background: rgba(31,214,95,0.055);
              }

              .links :global(.reward:hover) {
                color: #d9ffe5;
                border-color: rgba(31,214,95,0.24);
                background: rgba(31,214,95,0.1);
              }

              .reward-dot {
                width: 5px;
                height: 5px;
                margin-left: auto;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 8px rgba(31,214,95,.65);
              }

              .links :global(.signout:hover) {
                color: #ff9b96;
                border-color: rgba(255,81,65,0.13);
                background: rgba(255,81,65,0.065);
              }

              .links :global(.admin) {
                color: #d8c68f;
              }

              .links :global(.withdraw) {
                color: #b8e8c8;
              }

              @media only screen and (max-width: 640px) {
                .dropdown {
                  width: min(260px, calc(100vw - 20px));
                }

                .links :global(.user-dropdown-link) {
                  min-height: 40px;
                  font-size: 13px;
                }
              }
              .decoration-arrow { display:none; }
            `}</style>
        </>
    );
}

export default UserDropdown;
