import {createSignal, For} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";

const CARDS = {
    'g2a': [
    { amount: 3, link: 'https://www.g2a.com/bloxclash-gift-card-3-usd-bloxclash-key-global-i10000500684001' },
    { amount: 5, link: 'https://www.g2a.com/bloxclash-gift-card-5-usd-bloxclash-key-global-i10000500684002' },
    { amount: 10, link: 'https://www.g2a.com/bloxclash-gift-card-10-usd-bloxclash-key-global-i10000500684003' },
    { amount: 25, link: 'https://www.g2a.com/bloxclash-gift-card-25-usd-bloxclash-key-global-i10000500684004' },
    { amount: 50, link: 'https://www.g2a.com/bloxclash-gift-card-50-usd-bloxclash-key-global-i10000500684005' },
    { amount: 100, link: 'https://www.g2a.com/bloxclash-gift-card-100-usd-bloxclash-key-global-i10000500684006' },
    { amount: 250, link: 'https://www.g2a.com/bloxclash-gift-card-250-usd-bloxclash-key-global-i10000500684007' },
    { amount: 500, link: 'https://www.g2a.com/bloxclash-gift-card-500-usd-bloxclash-key-global-i10000500684008' },
    ],

    'kinguin': [
    { amount: 3, link: 'https://www.kinguin.net/category/186314/bloxclash-3-gift-card' },
    { amount: 5, link: 'https://www.kinguin.net/category/186853/bloxclash-5-gift-card' },
    { amount: 10, link: 'https://www.kinguin.net/category/186854/bloxclash-10-gift-card' },
    { amount: 25, link: 'https://www.kinguin.net/category/186855/bloxclash-25-gift-card' },
    { amount: 50, link: 'https://www.kinguin.net/category/186856/bloxclash-50-gift-card' },
    { amount: 100, link: 'https://www.kinguin.net/category/186857/bloxclash-100-gift-card' },
    { amount: 250, link: 'https://www.kinguin.net/category/186858/bloxclash-250-gift-card' },
    { amount: 500, link: 'https://www.kinguin.net/category/186859/bloxclash-500-gift-card' },
    ]
}

function GiftcardDeposit(props) {

    const [code, setCode] = createSignal('')

    return (
        <>
            <div class='giftcard-container'>
                <div class='deposit-header'>
                    <p class='type'>You have selected <span class='gold'>{props?.name}</span></p>

                    <div class='code-container'>
                        <input className='text' placeholder='ENTER CODE HERE' value={code()} onInput={(e) => setCode(e.target.value)}/>
                        <button class='bevel-gold redeem' onClick={async () => {
                            let res = await authedAPI('/trading/deposit/giftcards/redeem', 'POST', JSON.stringify({
                                code: code()
                            }), true)

                            if (res.success) {
                                createNotification('success', 'Successfully redeemed your giftcard.')
                            }
                        }}>REDEEM</button>
                    </div>
                </div>

                <div class='bar' style={{margin: '15px 0 30px 0'}}/>

                <div class='cards'>
                  <For each={CARDS[props?.type] || []}>{(card) =>
                    <button class='card' aria-label={`Buy $${card.amount} Cosmic Luck gift card on ${props?.type}`}
                        onClick={() => window.open(card?.link, '_blank', 'noopener,noreferrer')}>
                      <div class='card-brand'>
                        <img src='/assets/logo/cosmic-luck-logo.png' alt='Cosmic Luck'/>
                      </div>
                      <span class='partner'>{props?.type}</span>
                      <div class='card-copy'>
                        <strong>${card.amount}</strong>
                        <span>Gift card</span>
                      </div>
                      <div class='card-chips' aria-hidden='true'>
                        <img class='chip chip-back' src='/assets/chips/chip-green.png' alt=''/>
                        <img class='chip chip-front' src='/assets/chips/chip-green-clover.png' alt=''/>
                        <img class='chip chip-small' src='/assets/chips/chip-white-clover.png' alt=''/>
                      </div>
                    </button>
                    }</For>
                </div>
            </div>

            <style jsx>{`
              .giftcard-container {
                width: 100%;
                height: fit-content;

                display: flex;
                flex-direction: column;

                padding: 28px;
                border: 1px solid var(--glass-border);
                border-radius: 10px;
                background:
                  radial-gradient(90% 140% at 0 0, rgba(31, 214, 95, .06), transparent 58%),
                  linear-gradient(145deg, rgba(22, 29, 39, .82), rgba(8, 12, 18, .9));
                box-shadow: inset 0 1px 0 var(--glass-highlight), var(--morph-shadow);
                backdrop-filter: blur(14px) saturate(120%);
                -webkit-backdrop-filter: blur(14px) saturate(120%);
              }

              .deposit-header {
                display: flex;
                justify-content: space-between;
                width: 100%;

                color: #8b92a0;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 13px;
                font-weight: 600;

                gap: 8px;
              }

              .bar {
                flex: 1;
                height: 1px;
                min-height: 1px;
                background: linear-gradient(90deg, rgba(31, 214, 95, .25), rgba(255, 255, 255, .08), transparent);
              }
              
              .cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 12px;
              }
              
              .card {
                position: relative;
                min-width: 0;
                aspect-ratio: 16 / 9;
                padding: 16px;
                overflow: hidden;
                border: 1px solid rgba(31, 214, 95, .22);
                border-radius: 9px;
                background:
                  radial-gradient(90% 130% at 10% 0, rgba(31, 214, 95, .2), transparent 55%),
                  linear-gradient(145deg, rgba(13, 35, 27, .96), rgba(5, 12, 15, .98) 72%);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 8px 24px rgba(0,0,0,.25);
                color: #fff;
                font-family: Geogrotesque Wide, sans-serif;
                text-align: left;
                cursor: pointer;
                isolation: isolate;
                transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
              }
              
              .card:hover {
                transform: translateY(-3px);
                border-color: rgba(31, 214, 95, .48);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.09), 0 14px 32px rgba(0,0,0,.38), 0 0 22px rgba(31,214,95,.07);
              }

              .card:focus-visible {
                outline: 2px solid var(--gold);
                outline-offset: 2px;
              }

              .card::after {
                content: '';
                position: absolute;
                inset: 0;
                z-index: -1;
                background: linear-gradient(112deg, transparent 35%, rgba(255,255,255,.055) 47%, transparent 58%);
                transform: translateX(-100%);
                transition: transform .5s ease;
              }

              .card:hover::after {
                transform: translateX(100%);
              }

              .card-brand {
                width: min(62%, 175px);
                height: 28px;
                display: flex;
                align-items: center;
              }

              .card-brand img {
                width: 100%;
                max-height: 28px;
                object-fit: contain;
                object-position: left center;
              }

              .partner {
                position: absolute;
                top: 15px;
                right: 16px;
                padding: 3px 7px;
                border: 1px solid rgba(255,255,255,.09);
                border-radius: 4px;
                background: rgba(3, 8, 11, .56);
                color: #aab4c2;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .card-copy {
                position: absolute;
                left: 16px;
                bottom: 15px;
                z-index: 2;
                display: flex;
                flex-direction: column;
                line-height: 1;
              }

              .card-copy strong {
                color: var(--gold);
                font-size: clamp(28px, 3vw, 42px);
                font-weight: 900;
              }

              .card-copy span {
                margin-top: 5px;
                color: #f3f6f8;
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .card-chips {
                position: absolute;
                right: -3px;
                bottom: -4px;
                width: 46%;
                height: 76%;
              }

              .chip {
                position: absolute;
                object-fit: contain;
                filter: drop-shadow(0 8px 12px rgba(0,0,0,.42));
                transition: transform .25s ease;
              }

              .chip-back {
                width: 54%;
                right: 33%;
                top: 3%;
                transform: rotate(-16deg);
                opacity: .78;
              }

              .chip-front {
                width: 76%;
                right: 0;
                bottom: -5%;
                transform: rotate(10deg);
              }

              .chip-small {
                width: 35%;
                right: 55%;
                bottom: -6%;
                transform: rotate(-24deg);
              }

              .card:hover .chip-front {
                transform: rotate(13deg) translateY(-2px);
              }
              
              .code-container {
                width: 100%;
                max-width: 390px;
                height: 40px;
                
                display: flex;
                align-items: center;
                
                border-radius: 7px;
                border: 1px solid rgba(255,255,255,.09);
                background: rgba(4, 8, 13, .5);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
                
                padding: 5px 5px 5px 12px;
                transition: border-color .18s ease, box-shadow .18s ease;
              }

              .code-container:focus-within {
                border-color: rgba(31,214,95,.38);
                box-shadow: 0 0 0 3px rgba(31,214,95,.06);
              }
              
              .code-container input {
                width: 100%;
                height: 100%;
                border: unset;
                outline: unset;
                background: unset;

                color: white;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 11px;
                font-weight: 600;
              }
              
              .code-container input::placeholder {
                color: #8b92a0;
              }
              
              .redeem {
                height: 30px;
                padding: 0 12px;
                border: 0;
                border-radius: 5px;
                font-size: 12px;
              }

              @media only screen and (max-width: 680px) {
                .giftcard-container {
                  padding: 16px;
                }

                .deposit-header {
                  flex-direction: column;
                  gap: 12px;
                }

                .code-container {
                  max-width: none;
                }

                .cards {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
        </>
    );
}

export default GiftcardDeposit;
