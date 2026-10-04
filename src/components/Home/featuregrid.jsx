import {For} from "solid-js";
import {A} from "@solidjs/router";

const FEATURES = [
  {name: 'CASE BATTLES',      href: '/battles',       accent: '#FF5141', img: '/assets/thumbnails/casebattles.webp'},
    {name: 'CASE OPENING',      href: '/cases',         accent: '#1fd65f', img: '/assets/thumbnails/caseopening.webp'},
    {name: 'DAILY CASES',       href: '/cases',         accent: '#1fd65f', img: '/assets/thumbnails/dailycases.webp'},
    {name: 'SUPERCHARGE CASES', href: '/cases',         accent: '#f0c040', img: '/assets/thumbnails/superchargecases.webp'},
    {name: 'MINES',             href: '/mines',         accent: '#40c9ac', img: '/assets/thumbnails/mines.webp'},
    {name: 'GAME FAIRNESS',     href: '/docs/provably', accent: '#1fd65f', img: '/assets/thumbnails/gamefairness.webp'},
    {name: 'AFFILIATES',        href: '/affiliates',    accent: '#40c9ac', img: '/assets/thumbnails/rewards.webp'},
    {name: 'RANKINGS',          href: '/leaderboard',   accent: '#f0c040', img: '/assets/thumbnails/rankings.webp'},
    {name: 'BUY COINS',         href: '/deposit',       accent: '#1fd65f', img: '/assets/thumbnails/market.webp', wide: true},
    {name: 'CRASH',             href: '/crash',         accent: '#4176FF', img: '/assets/thumbnails/crash.webp', wide: true},
]
  const PAYMENT_LOGO_ROWS = [
    [
      ['mastercard.png', 'Mastercard'],
      ['visa.png', 'Visa'],
      ['paypal.png', 'PayPal'],
      ['googlepay.png', 'Google Pay'],
      ['g2a.png', 'G2A'],
      ['kinguin.png', 'Kinguin'],
    ],
    [
      ['bitcoin.png', 'Bitcoin'],
      ['ethereum.png', 'Ethereum'],
      ['litecoin.png', 'Litecoin'],
      ['usdt.png', 'Tether'],
      ['usdc.png', 'USD Coin'],
      ['bnb.png', 'BNB'],
      ['dogecoin.png', 'Dogecoin'],
    ],
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

                        <div class='feature-image-container'>
                          <img src={f.img} alt='' loading='lazy' decoding='async'/>
                        </div>

                        <div class='feature-label-bar'>
                            <div class='feature-dot'/>
                            <p class='feature-name'>{f.name}</p>
                            <svg class='feature-arrow' width='6' height='10' viewBox='0 0 6 10' fill='none'>
                                <path d='M1 1l4 4-4 4' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/>
                            </svg>
                        </div>

                        <A href={f.href} class='gamemode-link' aria-label={f.name}/>
                    </div>
                )}</For>
            </div>

              <section class='payment-carousel' aria-label='Available payment methods'>
                <h2>Select your preferred payment method</h2>
                <div class='payment-carousel-row'>
                  <div class='payment-carousel-track' aria-hidden='true'>
                    <For each={[0, 1, 2, 3]}>{() => (
                      <div class='payment-carousel-sequence'>
                        <For each={PAYMENT_LOGO_ROWS[0]}>{([icon, name]) => (
                          <div class='payment-carousel-tile'>
                            <img src={'/assets/icons/' + icon} alt={name}/>
                          </div>
                        )}</For>
                      </div>
                    )}</For>
                  </div>
                </div>
                <div class='payment-carousel-row'>
                  <div class='payment-carousel-track reverse' aria-hidden='true'>
                    <For each={[0, 1, 2, 3]}>{() => (
                      <div class='payment-carousel-sequence'>
                        <For each={PAYMENT_LOGO_ROWS[1]}>{([icon, name]) => (
                          <div class='payment-carousel-tile'>
                            <img src={'/assets/icons/' + icon} alt={name}/>
                          </div>
                        )}</For>
                      </div>
                    )}</For>
                  </div>
                </div>
              </section>

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
                font-size: 13px;
                letter-spacing: 0;
                color: #bed8d0;
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
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 16px;
              }

              .payment-carousel {
                position: relative;
                isolation: isolate;
                margin-top: 8px;
                padding: 22px 0 20px;
                overflow: hidden;
                border-block: 1px solid rgba(145, 179, 165, 0.12);
                background: linear-gradient(105deg, #121719 0%, #171d1f 50%, #121719 100%);
              }

              .payment-carousel h2 {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                margin: 0 16px 18px;
                color: #f1f5f3;
                text-align: center;
                font-size: 18px;
                line-height: 1.25;
                font-weight: 700;
              }

              .payment-carousel h2::before,
              .payment-carousel h2::after {
                content: '';
                width: 38px;
                height: 1px;
                background: linear-gradient(90deg, transparent, #43c98c99);
              }

              .payment-carousel h2::after {
                transform: scaleX(-1);
              }

              .payment-carousel-row {
                overflow: hidden;
                margin-top: 10px;
                mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
                -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
              }

              .payment-carousel-track {
                display: flex;
                width: max-content;
                animation: payment-carousel-scroll 34.8s linear infinite;
              }

              .payment-carousel-track.reverse {
                animation-direction: reverse;
                animation-duration: 40.6s;
              }

              .payment-carousel-sequence {
                display: flex;
                flex: 0 0 auto;
                gap: 12px;
                padding-right: 12px;
              }

              .payment-carousel-tile {
                display: grid;
                place-items: center;
                flex: 0 0 104px;
                height: 58px;
                padding: 9px 12px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                border-radius: 5px;
                background: linear-gradient(135deg, #202729, #191f21);
                box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
                transition: border-color 180ms ease, background 180ms ease;
              }

              .payment-carousel-tile:hover {
                border-color: rgba(96, 220, 157, 0.32);
                background: linear-gradient(135deg, #252f30, #1b2424);
              }

              .payment-carousel-tile img {
                display: block;
                max-width: 78px;
                max-height: 36px;
                object-fit: contain;
              }

              @keyframes payment-carousel-scroll {
                to { transform: translateX(-25%); }
              }

              @media (prefers-reduced-motion: reduce) {
                .payment-carousel-row {
                  overflow-x: auto;
                  mask-image: none;
                  -webkit-mask-image: none;
                }
                .payment-carousel-track { animation: none; }
              }

              @container (max-width: 520px) {
                .payment-carousel { padding: 18px 0 16px; }
                .payment-carousel h2 { gap: 9px; font-size: 16px; }
                .payment-carousel h2::before,
                .payment-carousel h2::after { width: 20px; }
                .payment-carousel-sequence { gap: 9px; }
                .payment-carousel-tile { flex-basis: 90px; height: 52px; }
                .payment-carousel-sequence { padding-right: 9px; }
                .payment-carousel-track { animation-duration: 29.7s; }
                .payment-carousel-track.reverse { animation-duration: 34.65s; }
              }

              .feature {
                position: relative;
                display: flex;
                flex-direction: column;

                min-width: 0;
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

              .feature.wide .feature-image-container {
                aspect-ratio: 32 / 9;
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
                aspect-ratio: 16 / 9;
                min-height: 0;
                position: relative;
                z-index: 1;
                overflow: hidden;
              }

              .feature-image-container img {
                width: 100%;
                height: 100%;
                display: block;
                object-fit: cover;
                object-position: center;
                transition: transform .3s ease;
                transform-origin: center;
              }

              .feature:hover .feature-image-container img {
                transform: scale(1.06);
              }

              .feature-label-bar {
                min-height: 44px;
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
                font-size: 13px;
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

              @container (min-width: 1500px) {
                .feature-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
              }

              @container (max-width: 960px) {
                .feature-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .feature.wide {
                  grid-column: span 2;
                }

                .feature-image-container img {
                  object-position: center;
                }
              }

              @container (max-width: 440px) {
                .feature-grid {
                  grid-template-columns: minmax(0, 1fr);
                  gap: 10px;
                }

                .feature {
                  border-radius: 8px;
                }

                .feature.wide {
                  grid-column: span 1;
                }

                .feature.wide .feature-image-container { aspect-ratio: 16 / 9; }

                .feature-image-container img { object-fit: cover; }
                .feature-label-bar { padding: 0 14px; }
              }
            `}</style>
        </>
    );
}

export default FeatureGrid;
