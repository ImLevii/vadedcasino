import {For} from "solid-js";
import {A} from "@solidjs/router";

const FEATURES = [
    {name: 'CASE BATTLES',      href: '/battles',       accent: '#FF5141', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/638e2dcf-4f8c-4b96-b5cb-e43b0a517207-CSGOLuck_Thumbnail_960x540_CaseBattle.jpeg'},
    {name: 'CASE OPENING',      href: '/cases',         accent: '#1fd65f', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/427a331f-8299-4914-9895-0ff3cac84a47-CSGOLuck_Thumbnail_960x540_CaseOpening.jpeg'},
    {name: 'DAILY CASES',       href: '/cases',         accent: '#1fd65f', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/51ca07c1-9691-4f9b-a630-256a641c1d16-CSGOLuck_Thumbnail_960x540_DailyCases.jpeg'},
    {name: 'SUPERCHARGE CASES', href: '/cases',         accent: '#f0c040', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/3b116ffd-cb21-413a-96c3-8776a4a902b7-CSGOLuck_Thumbnail_960x540_SuperchargeCases.jpeg'},
    {name: 'MINES',             href: '/mines',         accent: '#DC5FDE', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/666df0e7-15eb-46be-b911-5d014e3d50a4-CSGOLuck_Thumbnail_960x540_Mines.jpeg'},
    {name: 'GAME FAIRNESS',     href: '/docs/provably', accent: '#1fd65f', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/951b0171-107f-45b8-ac59-204566eafa60-CSGOLuck_Thumbnail_960x540_GameFairness.jpeg'},
    {name: 'AFFILIATES',        href: '/affiliates',    accent: '#DC5FDE', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/ad09501f-1d4d-4ef6-bc0c-0d74bc59f7a4-CSGOLuck_Thumbnail_960x540_Rewards.jpeg'},
    {name: 'RANKINGS',          href: '/leaderboard',   accent: '#f0c040', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/139ce9a3-a36a-44c4-a4ee-4b6d4fa640f4-CSGOLuck_Thumbnail_960x540_Rankings.jpeg'},
    {name: 'BUY COINS',         href: '/deposit',       accent: '#1fd65f', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/566f489c-b4a8-4ad8-8b9f-4b191c4732a9-CSGOLuck_Thumbnail_960x540_Market.jpeg', wide: true},
    {name: 'MARKET',            href: '/withdraw',      accent: '#4176FF', img: 'https://csgoluck.s3.eu-central-1.amazonaws.com/48a028f4-8e12-4cd2-a364-71bdb176a461-CSGOLuck_Thumbnail_960x540_Crash.jpeg', wide: true},
]

function FeatureGrid() {
    return (
        <>
            <div class='section-header'>
                <div class='section-line'/>
                <p class='section-title'>GAME MODES</p>
                <div class='section-line'/>
            </div>

            <div class='feature-grid'>
                <For each={FEATURES}>{(f) => (
                    <div
                        class={'feature ' + (f.wide ? 'wide' : '')}
                        style={`--accent: ${f.accent};`}
                    >
                        {/* Subtle corner glow */}
                        <div class='feature-glow'/>

                        <div class='feature-image-container' style={`background-image: url('${f.img}');`}/>

                        <div class='feature-label-bar'>
                            <div class='feature-dot'/>
                            <p class='feature-name'>{f.name}</p>
                            <svg class='feature-arrow' width='6' height='10' viewBox='0 0 6 10' fill='none'>
                                <path d='M1 1l4 4-4 4' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/>
                            </svg>
                        </div>

                        <A href={f.href} class='gamemode-link'/>
                    </div>
                )}</For>
            </div>

            <style jsx>{`
              .section-header {
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: -6px;
              }

              .section-title {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 11px;
                letter-spacing: 1.5px;
                color: #6b7280;
                white-space: nowrap;
                text-transform: uppercase;
              }

              .section-line {
                flex: 1;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
              }

              .feature-grid {
                width: 100%;

                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
              }

              .feature {
                position: relative;
                display: flex;
                flex-direction: column;

                height: 160px;
                border-radius: 10px;
                overflow: hidden;

                border: 1px solid rgba(255, 255, 255, 0.06);
                background: linear-gradient(160deg, #13161f 0%, #0e1116 100%);

                cursor: pointer;
                transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
              }

              .feature.wide {
                grid-column: span 2;
              }

              /* Accent glow in corner */
              .feature-glow {
                position: absolute;
                top: -20px;
                right: -20px;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: var(--accent);
                opacity: 0;
                filter: blur(35px);
                transition: opacity .3s;
                pointer-events: none;
                z-index: 0;
              }

              .feature:hover .feature-glow {
                opacity: 0.18;
              }

              .feature-image-container {
                flex: 1;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                position: relative;
                z-index: 1;
                transition: transform .3s ease;
                transform-origin: center;
              }

              .feature:hover .feature-image-container {
                transform: scale(1.06);
              }

              .feature-label-bar {
                height: 36px;
                background: rgba(0,0,0,0.45);
                border-top: 1px solid rgba(255, 255, 255, 0.04);

                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;

                position: relative;
                z-index: 1;

                transition: background .22s;
              }

              .feature-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: var(--accent);
                box-shadow: 0 0 6px var(--accent);
                flex-shrink: 0;
                transition: box-shadow .22s;
              }

              .feature-name {
                flex: 1;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 700;
                font-size: 10.5px;
                letter-spacing: 0.6px;
                color: #c3cad6;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .feature-arrow {
                color: #3a4250;
                flex-shrink: 0;
                transition: color .22s, transform .22s;
              }

              /* Hover states */
              .feature:hover {
                transform: translateY(-4px);
                border-color: color-mix(in srgb, var(--accent) 40%, transparent);
                box-shadow:
                  0 14px 32px rgba(0,0,0,0.5),
                  0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent),
                  0 0 24px color-mix(in srgb, var(--accent) 15%, transparent);
              }

              .feature:hover .feature-image {
                transform: scale(1.08) translateY(-2px);
              }

              .feature:hover .feature-label-bar {
                background: rgba(0,0,0,0.6);
              }

              .feature:hover .feature-arrow {
                color: var(--accent);
                transform: translateX(2px);
              }

              .feature:hover .feature-dot {
                box-shadow: 0 0 10px var(--accent);
              }

              @media only screen and (max-width: 1000px) {
                .feature-grid {
                  grid-template-columns: repeat(3, 1fr);
                }
              }

              @media only screen and (max-width: 700px) {
                .feature-grid {
                  grid-template-columns: repeat(2, 1fr);
                }

                .feature.wide {
                  grid-column: span 2;
                }
              }

              @media only screen and (max-width: 480px) {
                .feature-grid {
                  grid-template-columns: 1fr 1fr;
                  gap: 8px;
                }

                .feature { height: 110px; }

                .feature.wide {
                  grid-column: span 2;
                }
              }
            `}</style>
        </>
    );
}

export default FeatureGrid;
