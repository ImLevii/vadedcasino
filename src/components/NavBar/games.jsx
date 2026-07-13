import {createSignal, For} from "solid-js";
import {addDropdown, createNotification, closeDropdowns} from "../../util/api";
import {A} from "@solidjs/router";

const GAMEMODES = [
    {name: 'CASE BATTLES', href: '/battles', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/638e2dcf-4f8c-4b96-b5cb-e43b0a517207-CSGOLuck_Thumbnail_960x540_CaseBattle.jpeg'},
    {name: 'SLOTS', href: '/slots', img: '/assets/gamemodes/slots-green.svg'},
    {name: 'MINES', href: '/mines', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/666df0e7-15eb-46be-b911-5d014e3d50a4-CSGOLuck_Thumbnail_960x540_Mines.jpeg'},
    {name: 'COINFLIP', href: '/coinflip', img: '/assets/gamemodes/coinflip-green.svg'},
    {name: 'ROULETTE', href: '/roulette', img: '/assets/gamemodes/roulette-green.svg'},
    {name: 'CRASH', href: '/crash', img: '/assets/gamemodes/crash.png'},
    {name: 'CASES', href: '/cases', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/427a331f-8299-4914-9895-0ff3cac84a47-CSGOLuck_Thumbnail_960x540_CaseOpening.jpeg'},
]

function Games() {

    const [active, setActive] = createSignal(false)
    addDropdown(setActive)

    return (
        <>
            <div class='games-container' onClick={(e) => e.stopPropagation()}>
                <div class={'games ' + (active() ? 'active' : '')} onClick={() => {
                    const wasActive = active();
                    closeDropdowns();
                    setActive(!wasActive);
                }}>
                    <svg class='cube' width="16" height="19" viewBox="0 0 19 22" fill="#8b92a0"
                         xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M0 6.7481V10.7158L3.62116 12.8067V8.6235L0.013838 6.5412C0.00470492 6.60928 0 6.67839 0 6.7481Z"/>
                        <path d="M4.80713 13.4916L8.43192 15.5845V11.4006L4.80713 9.30817V13.4916Z"/>
                        <path d="M9.02488 6.18939L5.40063 8.28126L9.02488 10.3734L12.6491 8.28126L9.02488 6.18939Z"/>
                        <path d="M9.61792 15.5845L13.2427 13.4916V9.30817L9.61792 11.4006V15.5845Z"/>
                        <path
                            d="M18.036 6.5412L14.4287 8.6235V12.8067L18.0499 10.7158V6.7481C18.0499 6.67839 18.0452 6.60928 18.036 6.5412Z"/>
                        <path
                            d="M17.2701 5.39649C16.4397 4.91667 15.1589 4.17685 13.8357 3.41272L10.2114 5.50462L13.8356 7.59649L17.4443 5.5134C17.3893 5.47086 17.3312 5.43168 17.2701 5.39649Z"/>
                        <path
                            d="M12.6493 2.72784C11.5729 2.1064 10.5499 1.51596 9.80559 1.0867C9.56485 0.947928 9.29485 0.87854 9.02485 0.87854C8.75481 0.87854 8.48477 0.947928 8.24391 1.08678C7.516 1.50742 6.49013 2.09968 5.40112 2.72828L9.02481 4.81987L12.6493 2.72784Z"/>
                        <path
                            d="M4.21534 3.41302C2.91307 4.16474 1.64005 4.89962 0.780915 5.39608C0.719593 5.43143 0.661355 5.47073 0.606201 5.51343L4.21478 7.59648L7.83899 5.50461L4.21534 3.41302Z"/>
                        <path
                            d="M0 15.3681C0 15.9246 0.298939 16.4424 0.780105 16.7198L0.780698 16.7202C1.50846 17.1407 2.53322 17.7323 3.62116 18.3603V14.1763L0 12.0854V15.3681Z"/>
                        <path
                            d="M4.80713 19.045C6.11047 19.7973 7.38482 20.533 8.24464 21.0298C8.30536 21.0648 8.36795 21.0953 8.43192 21.1215V16.9542L4.80713 14.8611V19.045Z"/>
                        <path
                            d="M9.61792 21.1214C9.68209 21.0952 9.74487 21.0646 9.80576 21.0295C10.6859 20.5219 11.9557 19.7889 13.2427 19.0458V14.8611L9.61792 16.9542V21.1214Z"/>
                        <path
                            d="M14.4287 18.3609C15.5338 17.7227 16.5641 17.1276 17.2692 16.7201C17.751 16.4424 18.0499 15.9245 18.0499 15.3681V12.0853L14.4288 14.1762V18.3609H14.4287Z"/>
                    </svg>

                    GAMES

                    <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                            fill="#8b92a0"/>
                    </svg>
                </div>

                <div class={'dropdown ' + (active() ? 'active' : '')}>
                    <div class='decoration-arrow'/>
                    <div class='dropdown-container'>
                        <div class='dropdown-header'>
                            <span class='dot'/>
                            GAME MODES
                        </div>

                        <div class='gamemode-list'>
                            <For each={GAMEMODES}>{(mode) => (
                                <A href={mode.href} class='gamemode' onClick={() => setActive(false)}
                                   style={{'display':'flex','align-items':'center','gap':'12px'}}>
                                    <div class='thumb' style={{'background-image': `url("${mode.img}")`}}/>
                                    <p class='name'>{mode.name}</p>
                                    <svg class='chevron' width="6" height="10" viewBox="0 0 6 10" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L1 9" stroke="currentColor" stroke-width="1.6"
                                              stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </A>
                            )}</For>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .games-container {
                position: relative;
                z-index: 2;
              }

              .games {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;
                box-sizing: border-box;

                height: 36px;
                border-radius: 8px;

                font-weight: 700;
                font-size: 14px;
                color: #8b92a0;

                cursor: pointer;
                user-select: none;
                transition: color .2s, background .2s;
              }

              .games:hover, .games.active {
                color: white;
                background: rgba(255, 255, 255, 0.04);
              }

              .cube {
                transition: fill .3s;
              }

              .games.active .cube {
                fill: #1fd65f;
              }

              .games.active .arrow {
                transform: rotate(180deg);
              }

              .dropdown {
                position: absolute;
                width: 290px;

                top: 46px;
                left: 0;

                max-height: 0;
                z-index: 1;
                transition: max-height .3s ease;
                overflow: hidden;
              }

              .dropdown.active {
                max-height: 750px;
              }

              .decoration-arrow {
                width: 14px;
                height: 9px;

                background: #161a22;
                position: absolute;
                left: 24px;
                z-index: 2;

                clip-path: polygon(0% 100%, 50% 0%, 100% 100%);
              }

              .dropdown-container {
                margin-top: 8px;
                padding: 10px;

                border: 1px solid rgba(255, 255, 255, 0.06);
                background: linear-gradient(180deg, #161a22 0%, #11141b 100%);
                border-radius: 12px;
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);

                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .dropdown-header {
                display: flex;
                align-items: center;
                gap: 8px;

                padding: 4px 6px 2px;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 11px;
                letter-spacing: 1.4px;
                color: #6b7280;
                text-transform: uppercase;
              }

              .dropdown-header .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.8);
              }

              .gamemode-list {
                display: flex;
                flex-direction: column;
                gap: 5px;
              }

              .gamemode {
                display: flex;
                align-items: center;
                gap: 12px;

                padding: 6px 10px 6px 6px;
                border-radius: 9px;
                border: 1px solid transparent;
                background: rgba(255, 255, 255, 0.02);

                text-decoration: none;
                cursor: pointer;
                transition: background .2s ease, border-color .2s ease, transform .2s ease;
              }

              .gamemode:hover {
                background: rgba(31, 214, 95, 0.08);
                border-color: rgba(31, 214, 95, 0.45);
                transform: translateX(2px);
              }

              .thumb {
                width: 58px;
                height: 42px;
                flex-shrink: 0;
                border-radius: 7px;

                background-size: cover;
                background-position: center top;
                background-repeat: no-repeat;

                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
                transition: box-shadow .2s ease, transform .2s ease;
                overflow: hidden;
                position: relative;
              }

              .thumb::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 100%);
                border-radius: 7px;
                pointer-events: none;
              }

              .gamemode:hover .thumb {
                box-shadow: inset 0 0 0 1px rgba(31, 214, 95, 0.5), 0 0 14px rgba(31, 214, 95, 0.3);
                transform: scale(1.04);
              }

              .name {
                flex: 1;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: .3px;
                color: #c3cad6;
                transition: color .2s ease;
              }

              .gamemode:hover .name {
                color: #fff;
              }

              .chevron {
                color: #3a4150;
                transition: color .2s ease, transform .2s ease;
              }

              .gamemode:hover .chevron {
                color: #1fd65f;
                transform: translateX(2px);
              }
            `}</style>
        </>
    );
}

export default Games;
