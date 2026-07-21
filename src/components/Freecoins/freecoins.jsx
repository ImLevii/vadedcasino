import {useSearchParams} from "@solidjs/router";
import {createResource, createSignal, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";

function Freecoins(props) {

  const [searchParams, setSearchParams] = useSearchParams()
  const [affCode, setAffCode] = createSignal('')
  const [affRes, { mutate: setAffRes }] = createResource(fetchCode)
  const [promo, setPromo] = createSignal('')

  async function fetchCode(paramsCode) {
    try {
      let res = await authedAPI('/user/affiliate/usedCode', 'GET', null)

      if (res.code) {
        setAffRes(true)
        return res.code
      }
      setAffRes(false)
      return ''
    } catch (e) {
      setAffRes(false)
      console.error(e)
      return ''
    }
  }

  function close() {
    setSearchParams({ modal: null })
  }

  return (
    <>
      <div class='modal' onClick={() => close()}>
        <div class='freecoins-container' onClick={(e) => e.stopPropagation()}>
          <div class='fancy-title'>
            <div class='title-icon'>
              <img src='/assets/icons/coin.svg' width='20' height='20' alt=''/>
            </div>
            <div>
              <p class='eyebrow'>REWARDS</p>
              <p>Claim free coins</p>
            </div>
          </div>

          <button class='close' aria-label='Close free coins' onClick={() => close()}>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'>
              <path d='M18 6L6 18M6 6l12 12'/>
            </svg>
          </button>

          <div class='input-wrapper'>
            <div class='input-heading'>
              <p>Affiliate code</p>
              <span>One-time reward</span>
            </div>
            <div class='input'>
              <input type='text' placeholder='Enter affiliate code' value={affCode()} onInput={(e) => setAffCode(e.target.value)}/>

              <Show when={!affRes.loading}>
                {!affRes() && (
                  <button class='redeem' disabled={!affCode().trim()} onClick={async () => {
                    if (affCode().length < 1) return

                    let res = await authedAPI('/user/affiliate', 'POST', JSON.stringify({
                      code: affCode()
                    }), true)

                    if (res.success) {
                      createNotification('success', `Successfully redeemed affiliate code ${affCode()}.`)
                    }
                  }}>Redeem</button>
                )}
              </Show>
            </div>
          </div>

          <div className='input-wrapper'>
            <div class='input-heading'>
              <p>Promo code</p>
              <span>Limited drops</span>
            </div>
            <div className='input'>
              <input type='text' placeholder='Enter promo code' value={promo()} onInput={(e) => setPromo(e.target.value)}/>
              <button class='redeem' disabled={!promo().trim()} onClick={async () => {
                if (promo().length < 1) return

                let res = await authedAPI('/user/promo', 'POST', JSON.stringify({
                  code: promo()
                }), true)

                if (res.success) {
                  createNotification('success', `Successfully redeemed promocode ${promo()}.`)
                }
              }}>Redeem</button>
            </div>
          </div>

          <p class='claim-more'>Follow Cosmic Luck for new promo drops and reward announcements.</p>

          <div class='bar'/>

          <div class='socials'>
            <a class='twitter' href='https://twitter.com/cosmicluckcom' target='_blank' rel='noreferrer'>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M16 1.42062C15.405 1.66154 14.771 1.82123 14.11 1.89877C14.79 1.524 15.309 0.935077 15.553 0.225231C14.919 0.574154 14.219 0.820615 13.473 0.958154C12.871 0.366462 12.013 0 11.077 0C9.261 0 7.799 1.36062 7.799 3.02862C7.799 3.26862 7.821 3.49938 7.875 3.71908C5.148 3.59631 2.735 2.38985 1.114 0.552C0.831 1.00523 0.665 1.524 0.665 2.08246C0.665 3.13108 1.25 4.06062 2.122 4.59877C1.595 4.58954 1.078 4.44831 0.64 4.22585C0.64 4.23508 0.64 4.24708 0.64 4.25908C0.64 5.73046 1.777 6.95262 3.268 7.23415C3.001 7.30154 2.71 7.33385 2.408 7.33385C2.198 7.33385 1.986 7.32277 1.787 7.28215C2.212 8.48123 3.418 9.36277 4.852 9.39138C3.736 10.1972 2.319 10.6828 0.785 10.6828C0.516 10.6828 0.258 10.6717 0 10.6412C1.453 11.5062 3.175 12 5.032 12C11.068 12 14.368 7.38462 14.368 3.384C14.368 3.25015 14.363 3.12092 14.356 2.99262C15.007 2.56615 15.554 2.03354 16 1.42062Z"/>
              </svg>

              Twitter
            </a>

            <a class='discord' href='https://discord.gg/cosmicluck' target='_blank' rel='noreferrer'>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M13.5447 0.994743C12.5249 0.53434 11.4314 0.195118 10.288 0.000815247C10.2672 -0.00293612 10.2463 0.00644229 10.2356 0.0251684C10.095 0.271314 9.93919 0.592394 9.8301 0.844781C8.60032 0.663608 7.37681 0.663608 6.17225 0.844781C6.06312 0.586797 5.90169 0.271314 5.76041 0.0251684C5.74969 0.00705727 5.72887 -0.00232114 5.70806 0.000815247C4.56531 0.194472 3.47175 0.533694 2.45131 0.994743C2.44246 0.998495 2.4349 1.00474 2.42987 1.01285C0.355618 4.06207 -0.212633 7.03635 0.0661174 9.97374C0.0673674 9.9881 0.0755861 10.0018 0.0869299 10.0106C1.45546 10.9995 2.78115 11.5999 4.08218 11.9978C4.103 12.0041 4.12506 11.9966 4.13831 11.9797C4.44606 11.5662 4.7204 11.1301 4.95562 10.6716C4.9695 10.6447 4.95625 10.6128 4.92787 10.6022C4.49272 10.4398 4.07837 10.2417 3.67978 10.0169C3.64825 9.99877 3.64572 9.95439 3.67475 9.93315C3.75862 9.87131 3.84253 9.80695 3.92262 9.74198C3.93712 9.73011 3.95731 9.72762 3.97434 9.73509C6.59284 10.9115 9.42769 10.9115 12.0153 9.73509C12.0323 9.72698 12.0525 9.7295 12.0676 9.74134C12.1478 9.80631 12.2316 9.87128 12.3161 9.93312C12.3451 9.95436 12.3432 9.99874 12.3117 10.0168C11.9131 10.2461 11.4988 10.4398 11.063 10.6016C11.0346 10.6122 11.022 10.6447 11.0359 10.6715C11.2762 11.1294 11.5505 11.5655 11.8526 11.9791C11.8652 11.9966 11.8879 12.0041 11.9087 11.9978C13.2161 11.5999 14.5418 10.9995 15.9103 10.0106C15.9223 10.0018 15.9299 9.98871 15.9311 9.97435C16.2647 6.57841 15.3723 3.62851 13.5655 1.01347C13.5611 1.00474 13.5535 0.998495 13.5447 0.994743ZM5.34672 8.18516C4.55837 8.18516 3.90878 7.47302 3.90878 6.5984C3.90878 5.7238 4.54575 5.01163 5.34672 5.01163C6.15394 5.01163 6.79725 5.73005 6.78463 6.5984C6.78463 7.47302 6.14762 8.18516 5.34672 8.18516ZM10.6632 8.18516C9.87488 8.18516 9.22529 7.47302 9.22529 6.5984C9.22529 5.7238 9.86226 5.01163 10.6632 5.01163C11.4704 5.01163 12.1137 5.73005 12.1011 6.5984C12.1011 7.47302 11.4705 8.18516 10.6632 8.18516Z"/>
              </svg>

              Discord
            </a>

            <a class='youtube' href='https://youtube.com/@cosmicluck' target='_blank' rel='noreferrer'>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="13" viewBox="0 0 18 13" fill="none">
                <rect width="18" height="13" rx="3"/>
                <path d="M11.8869 6.4453C12.0377 6.52091 12.0377 6.72909 11.8869 6.8047L7.30655 9.10192C7.16688 9.17197 7 9.07414 7 8.92222L7 4.32778C7 4.17586 7.16688 4.07803 7.30655 4.14808L11.8869 6.4453Z" fill="#F61C0D"/>
              </svg>

              Youtube
            </a>

            <a class='twitch' href='https://twitch.tv/cosmicluck' target='_blank' rel='noreferrer'>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <g clip-path="url(#clip0_1416_46181)">
                  <path d="M0.649902 2.78333V13.9127H4.48257V16H6.57524L8.66457 13.912H11.8012L15.9839 9.74V0H1.69457L0.649902 2.78333ZM3.08857 1.39H14.5899V9.04267L12.1499 11.4773H8.3159L6.22657 13.562V11.4773H3.08857V1.39Z"/>
                  <path d="M6.92334 4.17468H8.31667V8.34802H6.92334V4.17468Z"/>
                  <path d="M10.7551 4.17468H12.1491V8.34802H10.7551V4.17468Z"/>
                </g>
                <defs>
                  <clipPath id="clip0_1416_46181">
                    <rect width="16" height="16" fill="white"/>
                  </clipPath>
                </defs>
              </svg>

              Twitch
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal {
          position: fixed;
          inset: 0;

          width: 100vw;
          height: 100vh;

          padding: 24px;
          background: rgba(4, 7, 11, 0.72);
          backdrop-filter: blur(10px) saturate(115%);
          -webkit-backdrop-filter: blur(10px) saturate(115%);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
        }

        .freecoins-container {
          max-width: 620px;
          max-height: calc(100vh - 48px);

          height: fit-content;
          width: 100%;

          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background:
            radial-gradient(100% 90% at 0 0, rgba(31,214,95,0.09), transparent 58%),
            linear-gradient(145deg, rgba(25,33,44,0.98), rgba(9,13,20,0.99));
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 28px 80px rgba(0,0,0,0.62);

          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          overflow-y: auto;
          
          transition: max-height .3s;
          position: relative;
        }

        .fancy-title {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 42px;

          color: #f4f7fb;
          font-size: 22px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .title-icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid rgba(31,214,95,0.28);
          background: rgba(31,214,95,0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 22px rgba(31,214,95,0.08);
        }

        .eyebrow {
          margin-bottom: 3px;
          color: #1fd65f;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
        }
        
        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;

          color: #dce2eb;
          font-size: 13px;
          font-weight: 700;

          width: 100%;
          max-width: none;
        }

        .input-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .input-heading p {
          font-weight: 700;
        }

        .input-heading span {
          color: #667080;
          font-family: 'Rubik', sans-serif;
          font-size: 10px;
          font-weight: 500;
        }
        
        .input {
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(5, 9, 14, 0.48);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);

          width: 100%;
          height: 48px;
          
          display: flex;
          align-items: center;
          gap: 12px;
          
          padding: 0 7px 0 14px;
          transition: border-color .18s, box-shadow .18s;
        }

        .input:focus-within {
          border-color: rgba(31,214,95,0.38);
          box-shadow: 0 0 0 3px rgba(31,214,95,0.06), inset 0 1px 0 rgba(255,255,255,0.03);
        }
        
        input {
          width: 100%;
          height: 100%;
          
          border: unset;
          outline: unset;
          background: unset;
          
          font-family: "Geogrotesque Wide", sans-serif;
          color: white;
          font-weight: 400;
        }
        
        input::placeholder {
          color: #626c7c;
        }
        
        .redeem {
          min-width: 88px;
          height: 34px;
          border: 0;
          border-radius: 6px;
          background: linear-gradient(180deg, #25df68, #18b950);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #0d8034;
          color: #04190b;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .redeem:disabled {
          background: #252c37;
          box-shadow: none;
          color: #596273;
          cursor: not-allowed;
        }
        
        .claim-more {
          color: #7f8998;
          font-family: 'Rubik', sans-serif;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }
        
        .socials {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        a {
          display: flex;
          align-items: center;
          
          height: 30px;
          padding: 0 12px;
          line-height: 30px;
          color: #b9c1cd;
          fill: #8b95a5;
          font-weight: 600;
          font-family: "Geogrotesque Wide", sans-serif;
          
          gap: 7px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
          transition: color .18s, border-color .18s, background .18s;
        }
        
        a svg {
          fill: currentColor;
        }

        a:hover {
          color: #eef3f8;
          border-color: rgba(31,214,95,0.24);
          background: rgba(31,214,95,0.07);
        }
        
        .bar {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent);
        }

        .close {
          width: 32px;
          height: 32px;

          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 7px;

          display: flex;
          align-items: center;
          justify-content: center;
          
          position: absolute;
          top: 20px;
          right: 20px;

          color: #7d8797;
          cursor: pointer;
          transition: color .18s, background .18s, border-color .18s;
        }

        .close:hover {
          color: #ff7474;
          border-color: rgba(255,81,65,0.2);
          background: rgba(255,81,65,0.08);
        }

        @media only screen and (max-width: 640px) {
          .modal {
            padding: 12px;
            align-items: flex-end;
          }

          .freecoins-container {
            max-height: calc(100vh - 24px);
            padding: 20px 16px;
            gap: 17px;
          }

          .fancy-title {
            font-size: 18px;
          }

          .input {
            height: auto;
            min-height: 48px;
          }

          .socials a {
            flex: 1 1 calc(50% - 4px);
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}

export default Freecoins