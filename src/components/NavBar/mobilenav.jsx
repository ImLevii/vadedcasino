import {A, useLocation} from '@solidjs/router';
import {createEffect, createSignal, For} from 'solid-js';
import {addDropdown, closeDropdowns} from '../../util/api';
import {GAMEMODES} from '../../resources/gamemodes';
import UserDropdown from './userdropdown';
import './mobilenav.css';

function BottomNavBar(props) {
    const location = useLocation();
    const [menuDropdown, setMenuDropdown] = createSignal(false);
    const [active, setActive] = createSignal(false);
    addDropdown(setMenuDropdown);
    addDropdown(setActive);

    createEffect(() => {
        location.pathname;
        setMenuDropdown(false);
        setActive(false);
    });

    function toggle(event, isOpen, setOpen) {
        event.stopPropagation();
        closeDropdowns();
        setOpen(!isOpen);
    }

    return (
        <nav class='bottom-navbar' aria-label='Mobile navigation'>
            <div class='mobile-account-wrapper'>
                <button class='mobile-nav-button' type='button' aria-label='Account menu'
                        aria-expanded={menuDropdown()} aria-controls='mobile-account-menu'
                        onClick={e => toggle(e, menuDropdown(), setMenuDropdown)}>
                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'>
                        <path d='M4 6h16M4 12h16M4 18h16'/>
                    </svg>
                    <span>Menu</span>
                </button>
                <UserDropdown id='mobile-account-menu' user={props.user} active={menuDropdown()} setActive={setMenuDropdown} mobile={true}/>
            </div>

            <button class='mobile-nav-button' classList={{active: active()}} type='button'
                    aria-label='Games' aria-expanded={active()} aria-controls='mobile-games-menu'
                    onClick={e => toggle(e, active(), setActive)}>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                    <rect x='3' y='3' width='7' height='7' rx='1.5'/><rect x='14' y='3' width='7' height='7' rx='1.5'/>
                    <rect x='3' y='14' width='7' height='7' rx='1.5'/><rect x='14' y='14' width='7' height='7' rx='1.5'/>
                </svg>
                <span>Games</span>
            </button>

            <div id='mobile-games-menu' class='mobile-games-menu' classList={{active: active()}}
                 inert={active() ? undefined : ''} aria-hidden={!active()} onClick={e => e.stopPropagation()}>
                <div class='mobile-games-heading'>
                    <span>GAME MODES</span>
                    <button type='button' aria-label='Close game selector' onClick={() => setActive(false)}>×</button>
                </div>
                <div class='mobile-games-grid'>
                    <For each={GAMEMODES}>{mode => (
                        <A href={mode.href} class='mobile-game-link' onClick={() => setActive(false)}>
                            <img src={active() ? mode.img : undefined} alt='' loading='lazy' decoding='async'/>
                            <span>{mode.name}</span>
                        </A>
                    )}</For>
                </div>
            </div>

            <button class='mobile-nav-button' type='button' aria-label={props.chat ? 'Close chat' : 'Open chat'}
                    aria-expanded={props.chat} aria-controls='site-chat' onClick={() => { closeDropdowns(); props.setChat(!props.chat); }}>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'>
                    <path d='M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z'/><path d='M7 10h9M7 14h6'/>
                </svg>
                <span>Chat</span>
            </button>
        </nav>
    );
}

export default BottomNavBar;
