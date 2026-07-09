import {createSignal, For} from "solid-js";
import {addDropdown, closeDropdowns} from "../../util/api";
import {A} from "@solidjs/router";

const CASE_LINKS = [
    {name: 'CASE OPENING', href: '/cases', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/427a331f-8299-4914-9895-0ff3cac84a47-CSGOLuck_Thumbnail_960x540_CaseOpening.jpeg'},
    {name: 'CASE BATTLES', href: '/battles', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/638e2dcf-4f8c-4b96-b5cb-e43b0a517207-CSGOLuck_Thumbnail_960x540_CaseBattle.jpeg'},
    {name: 'DAILY CASES', href: '/rewards/daily', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/51ca07c1-9691-4f9b-a630-256a641c1d16-CSGOLuck_Thumbnail_960x540_DailyCases.jpeg'},
    {name: 'SUPERCHARGE CASES', href: '/rewards/supercharge', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/3b116ffd-cb21-413a-96c3-8776a4a902b7-CSGOLuck_Thumbnail_960x540_SuperchargeCases.jpeg'},
]

function Cases() {

    const [active, setActive] = createSignal(false)
    addDropdown(setActive)

    return (
        <>
            <div class='cases-container' onClick={(e) => e.stopPropagation()}>
                <div class={'cases ' + (active() ? 'active' : '')} onClick={() => {
                    const wasActive = active();
                    closeDropdowns();
                    setActive(!wasActive);
                }}>
                    <svg class='icon' width="16" height="16" viewBox="0 0 16 16" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.5 5.5H14.5V13C14.5 13.5523 14.0523 14 13.5 14H2.5C1.94772 14 1.5 13.5523 1.5 13V5.5Z"
                              stroke="currentColor" stroke-width="1.5"/>
                        <path d="M1 3C1 2.44772 1.44772 2 2 2H14C14.5523 2 15 2.44772 15 3V5.5H1V3Z"
                              stroke="currentColor" stroke-width="1.5"/>
                        <path d="M6.5 8.5H9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>

                    CASES

                    <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                            fill="currentColor"/>
                    </svg>
                </div>

                <div class={'dropdown ' + (active() ? 'active' : '')}>
                    <div class='decoration-arrow'/>
                    <div class='dropdown-container'>
                        <div class='dropdown-header'>
                            <span class='dot'/>
                            CASES
                        </div>

                        <div class='case-list'>
                            <For each={CASE_LINKS}>{(c) => (
                                <A href={c.href} class='case' onClick={() => setActive(false)}
                                   style={{'display':'flex','align-items':'center','gap':'12px'}}>
                                    <div class='thumb' style={{'background-image': `url("${c.img}")`}}/>
                                    <p class='name'>{c.name}</p>
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
              .cases-container {
                position: relative;
                z-index: 2;
              }

              .cases {
                display: flex;
                align-items: center;
                gap: 8px;

                height: 36px;
                padding: 0 12px;
                border-radius: 8px;

                font-weight: 700;
                font-size: 14px;
                color: #8b92a0;

                cursor: pointer;
                user-select: none;
                transition: color .2s, background .2s;
              }

              .cases:hover, .cases.active {
                color: #fff;
                background: rgba(255, 255, 255, 0.04);
              }

              .icon {
                transition: color .2s;
              }

              .cases.active .icon {
                color: #1fd65f;
              }

              .cases.active .arrow {
                transform: rotate(180deg);
              }

              .arrow {
                color: #8b92a0;
                transition: transform .2s;
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

              .case-list {
                display: flex;
                flex-direction: column;
                gap: 5px;
              }

              .case {
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

              .case:hover {
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

              .case:hover .thumb {
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

              .case:hover .name {
                color: #fff;
              }

              .chevron {
                color: #3a4150;
                transition: color .2s ease, transform .2s ease;
              }

              .case:hover .chevron {
                color: #1fd65f;
                transform: translateX(2px);
              }
            `}</style>
        </>
    );
}

export default Cases;
