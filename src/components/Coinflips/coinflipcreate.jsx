import {createSignal, For} from "solid-js";
import CaseButton from "../Cases/casebutton";
import {getCents} from "../../util/balance";
import {useUser} from "../../contexts/usercontextprovider";
import {authedAPI} from "../../util/api";

function CreateCoinflip(props) {

  let slider
  let coinInput

  const MIN_BET = 1
  const MAX_BET = 100000

  const [coin, setCoin] = createSignal('fire')
  const [amount, setAmount] = createSignal(MIN_BET, {equals: false})
  const [user] = useUser()

  function createTrail() {
    let max = user() ? Math.min(MAX_BET, user()?.balance) : MIN_BET
    let value = (slider.value - MIN_BET) / (max - MIN_BET) * 100
    slider.style.background = 'linear-gradient(to right, #1fd65f 0%, #1fd65f ' + value + '%, rgba(31, 214, 95, 0.26) ' + value + '%, rgba(31, 214, 95, 0.26) 100%)'
    resizeInput()
  }

  function resizeInput() {
    let length = (coinInput.value + '').length
    let width = Math.max(12, Math.min(70, length * 10))
    coinInput.style.width = width + 'px'
  }

  return (
    <>
      <div class='modal fadein' onClick={() => props.close()}>
        <div class='coinflip-create' onClick={(e) => e.stopPropagation()}>
          <div class='header'>
            <button class='exit bevel-light' onClick={() => props.close()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M3.9497 0.447999L5.21006 1.936L6.45216 0.447999C6.68353 0.149333 6.95752 0 7.27413 0H9.6122C9.79486 0 9.90445 0.0533333 9.94099 0.16C9.9897 0.256 9.95925 0.362666 9.84966 0.48L6.79921 3.968L9.88619 7.52C9.99578 7.63733 10.0262 7.74933 9.97752 7.856C9.94099 7.952 9.83139 8 9.64873 8H6.96361C6.68353 8 6.40954 7.85067 6.14163 7.552L4.863 6.048L3.58438 7.552C3.31647 7.85067 3.04857 8 2.78067 8H0.351272C0.180788 8 0.071191 7.952 0.0224814 7.856C-0.0262283 7.74933 0.00421525 7.63733 0.113812 7.52L3.27385 3.936L0.296473 0.48C0.186876 0.362666 0.150344 0.256 0.186876 0.16C0.235586 0.0533333 0.351272 0 0.533933 0H3.10946C3.42607 0 3.70615 0.149333 3.9497 0.447999Z"
                  fill="#8b92a0"/>
              </svg>
            </button>

            <p class='title'><img src='/assets/icons/coin2.svg' height='20' alt=''/>COINFLIP CREATION</p>

            <button class={'color red ' + (coin() === 'fire' ? 'active' : '')} onClick={() => setCoin('fire')}>
              <img class='coin' src='/assets/icons/coin.svg' height='44' width='44'/>
              <div class='coinname'>
                <p>FIRE</p>
              </div>
            </button>

            <button class={'color blue ' + (coin() === 'ice' ? 'active' : '')} onClick={() => setCoin('ice')}>
              <img class='coin' src='/assets/icons/coin2.svg' height='44' width='44'/>
              <div class='coinname'>
                <p>ICE</p>
              </div>
            </button>

            <div class='min'>
              <p>MINIMUM</p>
              <img src='/assets/icons/coin.svg' height='14' width='14' alt=''/>
              <p class='white price'>
                50
                <span class='gray'>.00</span>
              </p>
            </div>
          </div>

          <div class='items'>
            <div class='coin-amount-container'>
              <div class='coin-container'>
                <img class='spiral' src='/assets/icons/goldspiral.png' height='90' width='90'/>
                <img src='/assets/icons/coin.svg' height='64' width='71'/>
              </div>

              <div class='coin-slider-container'>
                <input ref={slider} type='range' class='range' value={amount()} min={0}
                       max={Math.min(user()?.balance || MIN_BET, MAX_BET)}
                       onInput={(e) => {
                         let num = Math.max(0, Math.min(e.target.valueAsNumber, MAX_BET))
                         setAmount(num)
                         createTrail()
                       }}
                />
              </div>

              <div class='cost selected-coins'>
                <img src='/assets/icons/coin.svg' height='16' alt=''/>
                <input ref={coinInput} class='coin-input' type='number' value={amount()} onInput={(e) => {
                  resizeInput()
                  let num = Math.max(0, Math.min(e.target.valueAsNumber, MAX_BET))
                  setAmount(num)
                  createTrail()
                }}/>
              </div>
            </div>
            {/*<For each={[]}>{(i, index) => null}</For>*/}
          </div>

          <div class='footer'>
            {/*<div class='selected info'>*/}
            {/*    <p>SELECTED</p>*/}
            {/*</div>*/}

            <div class='info'>
              <p>TOTAL AMOUNT</p>
            </div>

            <div class='cost'>
              <img src='/assets/icons/coin.svg' height='16' alt=''/>
              <p>
                {Math.floor(amount())?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                <span class='gray'>.{getCents(amount())}</span>
              </p>
            </div>

            <div class='bar'/>

            <button class='bevel-gold done' onClick={async () => {
              let res = await authedAPI('/coinflip/create', 'POST', JSON.stringify({
                side: coin(),
                amount: amount()
              }), true)

              if (res.success) {
                props?.setViewing(res?.coinflip)
                props?.close()
              }
            }}>CREATE
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;

          width: 100vw;
          height: 100vh;

          background: rgba(24, 23, 47, 0.55);
          cubic-bezier(0, 1, 0, 1);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
        }

        .coinflip-create {
          max-width: 1010px;
          width: 100%;
          height: fit-content;
          min-height: 340px;
          max-height: 650px;
          background: #161b24;

          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 80px rgba(0,0,0,0.55);
        }

        .header, .footer {
          width: 100%;
          min-height: 66px;

          display: flex;
          align-items: center;
          gap: 12px;

          padding: 0 18px;

          background: #1e2533;
          border-bottom: 1px solid rgba(255,255,255,0.055);
        }

        .header {
          background: linear-gradient(90deg, rgba(31, 214, 95, 0.09) 0%, rgba(22, 27, 36, 0) 45%), #1e2533;
        }

        .footer {
          min-height: 58px;
          border-bottom: none;
          border-top: 1px solid rgba(255,255,255,0.055);
        }

        .info {
          height: 32px;
          padding: 0 12px;
          margin-left: auto;

          border-radius: 4px;
          background: rgba(38, 46, 62, 0.7);
          line-height: 32px;

          color: #8b92a0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .selected {
          margin-right: auto;
        }

        .cost {
          height: 32px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 6px;

          border-radius: 4px;
          background: rgba(38, 46, 62, 0.7);
          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
        }

        .selected-coins {
          width: 100%;
          height: 25px;
          background: unset;
          border: unset;
          padding: unset;
        }

        .coin-input {
          background: unset;
          border: unset;
          outline: unset;
          width: 30px;

          font-family: "Geogrotesque Wide", sans-serif;
          color: #FFF;
          font-size: 12px;
          font-weight: 700;
        }

        .done {
          height: 34px;
          min-width: 95px;
          padding: 0 18px;
          border-radius: 6px;
          border: none;
          outline: none;
          background: linear-gradient(135deg, #1fd65f, #14b04a);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(31,214,95,0.32);
          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: #021a09;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: filter .18s, transform .18s;
        }

        .done:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .done:active {
          transform: translateY(0);
          filter: brightness(0.97);
        }

        .bar {
          height: 16px;
          width: 1px;
          background: rgba(255,255,255,0.1);
          margin: 0 4px;
          flex-shrink: 0;
        }

        .exit {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background .2s;
        }

        .exit:hover {
          background: rgba(255,255,255,0.12);
        }

        .title {
          color: #FFF;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.3px;

          display: flex;
          align-items: center;
          gap: 8px;
        }

        .items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          grid-gap: 15px;
          flex: 1;
          overflow-y: scroll;
          padding: 20px;
          scrollbar-color: transparent transparent;
        }

        .items::-webkit-scrollbar {
          display: none;
        }

        .min {
          margin-left: auto;
          display: flex;
          gap: 7px;
          align-items: center;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 10px;
          color: #8b92a0;
          letter-spacing: 0.4px;

          border-radius: 6px;
          background: rgba(38, 46, 62, 0.7);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 8px 14px;
        }

        .price {
          font-size: 13px;
          color: #fff;
          font-weight: 700;
        }

        .color {
          display: flex;
          align-items: center;
          gap: 0;
          cursor: pointer;
          padding: unset;
          background: unset;
          outline: unset;
          border: unset;
          border-radius: 999px;
        }

        .coin {
          z-index: 2;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .coinname {
          border-radius: 999px;

          padding: 0 14px 0 28px;
          line-height: 32px;

          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;

          color: rgba(255, 255, 255, 0.3);
          background: rgba(38, 46, 62, 0.7);
          border: 1px solid rgba(255,255,255,0.07);
          position: relative;
          z-index: 1;

          height: 32px;
          margin-left: -22px;

          transition: all .25s ease;
        }

        .blue .coinname {
          color: rgba(255, 255, 255, 0.3);
        }

        .red .coinname {
          color: rgba(255, 255, 255, 0.3);
        }

        .blue.active .coinname {
          background: rgba(30, 77, 209, 0.18);
          border-color: rgba(30, 77, 209, 0.5);
          color: #5b8aff;
          box-shadow: 0 0 10px rgba(30, 77, 209, 0.25);
        }

        .red.active .coinname {
          background: rgba(236, 75, 69, 0.18);
          border-color: rgba(236, 75, 69, 0.5);
          color: #ff6b66;
          box-shadow: 0 0 10px rgba(236, 75, 69, 0.25);
        }

        .coin {
          background: unset;
        }

        .coin-slider-container {
          margin-top: auto;
          border-radius: 3px;
          background: linear-gradient(0deg, rgba(31, 214, 95, 0.25) 0%, rgba(31, 214, 95, 0.25) 100%), linear-gradient(230deg, #12151c 0%, #1f242e 100%);
          width: 100%;
          height: 25px;
          padding: 0 6px;

          display: flex;
          align-items: center;
        }

        .coin-amount-container {
          height: 170px;

          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(10, 13, 20, 0.5);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);

          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          padding: 15px;
        }

        .coin-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spiral {
          position: absolute;
        }

        .range {
          -webkit-appearance: none;
          appearance: none;
          outline: unset;

          border-radius: 25px;
          background: rgba(31, 214, 95, 0.26);
          max-width: 190px;
          height: 5px;

          width: 100%;
        }

        .range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 11px;
          height: 11px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
        }

        .range::-moz-range-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
        }
      `}</style>
    </>
  );
}

export default CreateCoinflip;
