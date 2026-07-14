import {createResource, createSignal, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import Loader from "../Loader/loader";

function CreditCardDeposit(props) {

  const [robux, setRobux] = createSignal(0)
  const [dollars, setDollars] = createSignal(0)
  const [rates, setRates] = createSignal({})
  const [processing, setProcessing] = createSignal(false)
  const [info, {mutate}] = createResource(fetchCCInfo)

  async function fetchCCInfo() {
    try {
      let res = await authedAPI('/trading/deposit/cc', 'GET')

      setRates({
        robux: res?.rate?.robux || 1,
        usd: res?.rate?.usd || 0.7,
      })

      convertAmounts(0, res?.minAmount)

      return res
    } catch (e) {
      console.log(e)
      return mutate(null)
    }
  }

  function convertAmounts(robux, dollars, preFees) {
    if (!rates()) return

    if (robux) {
      dollars = Math.ceil((robux / rates().robux * rates().usd * 1.035 + 0.35) * 100) / 100

      setRobux(robux)
      setDollars(dollars)
      return
    }

    if (dollars) {
      robux = Math.ceil(((dollars / 1.035 - 0.35) / rates().usd * rates().robux) * 100) / 100;

      setDollars(dollars)
      setRobux(robux)
      return
    }
  }

  return (
    <>
      <div class='crypto-deposit-container'>
        <div class='deposit-header'>
          <p class='type'>You have selected <span class='gold'>CREDIT CARD</span></p>

          <p>
            <span class='gold'>Deposit amount: </span>
          </p>
          <img class='amount-chip' src='/assets/chips/chip-green-clover.png' height='22' width='22' alt=''/>
          <p className='white'>{robux()?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</p>
        </div>

        <div class='bar' style={{margin: '15px 0 30px 0'}}/>

        <Show when={!info.loading} fallback={<Loader/>}>
          <>
            <div className='inputs'>
              <div className='robux-input'>
                <img src='/assets/chips/chip-green-clover.png' width='24' height='24' alt=''/>
                <input type='number' value={robux()}
                       onInput={(e) => convertAmounts(e.target.valueAsNumber, 0) }/>
              </div>
            </div>

            <div className='conversions-container'>
              <div className='rate'>
                <p>{rates().robux} <span className='gold'>COINS</span></p>
                <p>=</p>
                <p>${rates().usd?.toFixed(2)}</p>
                <img className='coin' src='/assets/chips/chip-green.png' height='58' width='58' alt=''/>
              </div>

              <div className='conversions'>
                <div className='input'>
                  <img src='/assets/chips/chip-green-clover.png' width='24' height='24' alt=''/>
                  <input type='number' value={robux()}
                         onInput={(e) => convertAmounts(e.target.valueAsNumber, 0)}/>
                </div>

                <span class='equals'>=</span>

                <div className='input'>
                  <span class='currency'>$</span>
                  <input type='number' value={dollars()}
                         onInput={(e) => convertAmounts(0, e.target.valueAsNumber, 0)}/>
                </div>
              </div>

              <button class='bevel-gold deposit' onClick={async () => {
                if (processing()) return
                setProcessing(true)

                let res = await authedAPI('/trading/deposit/cc', 'POST', JSON.stringify({
                  amount: robux()
                }), true)

                if (res.url) {
                  window.open(res.url, '_blank')
                }

                setProcessing(false)
              }}>
                PROCEED
              </button>
            </div>

            <div className='disclaimer'>
              <p className='disclaimer-text'>
                Minimum deposit amount is ${info()?.minAmount}, all credit card deposits have a $0.35 base fee and a 3.5% included by our payment processor.
              </p>
            </div>
          </>
        </Show>
      </div>

      <style jsx>{`
        .crypto-deposit-container {
          width: 100%;
          height: fit-content;

          display: flex;
          flex-direction: column;
          gap: 20px;

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
          background: linear-gradient(90deg, rgba(31,214,95,.25), rgba(255,255,255,.08), transparent);
        }

        .type {
          margin-right: auto;
        }

        .inputs {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
          gap: 10px;
        }

        .input {
          border: unset;
          outline: unset;
          white-space: nowrap;

          flex: 1 1 0;
          height: 45px;

          border-radius: 7px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(4,8,13,.52);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;

          padding: 0 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .robux-input {
          border: unset;
          outline: unset;
          white-space: nowrap;

          flex: 1 1 0;
          height: 45px;

          border-radius: 7px;
          border: 1px solid rgba(31,214,95,.24);
          background: rgba(4,8,13,.52);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025), 0 0 24px rgba(31,214,95,.035);

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;

          padding: 0 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .robux-input:focus-within, .input:focus-within {
          border-color: rgba(31,214,95,.45);
          box-shadow: 0 0 0 3px rgba(31,214,95,.06);
        }

        .robux-input input {
          background: unset;
          outline: unset;
          border: unset;

          width: 100%;
          height: 100%;

          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;
        }

        .deposit {
          height: 40px;
          padding: 0 45px;
          border: 0;
          border-radius: 6px;
        }

        .input input {
          background: unset;
          outline: unset;
          border: unset;

          width: 100%;
          height: 100%;
          text-align: center;

          color: #FFF;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 700;
        }

        .conversions-container {
          display: flex;
          align-items: center;
          justify-content: space-between;

          position: relative;

          padding: 10px 0;
          gap: 6px;
        }

        .conversions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .equals {
          color: #687384;
          font-size: 13px;
          font-weight: 800;
        }

        .currency {
          color: var(--gold);
          font-size: 14px;
          font-weight: 800;
        }

        .conversions .input {
          max-width: 175px;
        }

        .rate {
          width: 270px;
          height: 40px;
          margin-left: 20px;

          border: 1px solid rgba(31,214,95,.15);
          border-radius: 8px;
          background: linear-gradient(100deg, rgba(31,214,95,.12), rgba(10,16,22,.5) 70%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04);

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;

          color: #FFF;
          font-size: 16px;
          font-weight: 700;
          
          position: relative;
        }

        .rate .coin {
          position: absolute;
          left: -20px;
          z-index: 10;
          object-fit: contain;
          filter: drop-shadow(0 8px 10px rgba(0,0,0,.38));
        }

        .disclaimer {
          display: flex;
          width: 100%;
        }

        .disclaimer-text {
          max-width: 50%;

          color: #8b92a0;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
        }

        @media only screen and (max-width: 800px) {
          .crypto-deposit-container {
            padding: 20px;
          }

          .deposit-header, .conversions-container {
            flex-wrap: wrap;
          }

          .type {
            width: 100%;
          }

          .conversions-container {
            justify-content: center;
            gap: 18px;
          }

          .rate {
            margin-left: 20px;
          }

          .deposit {
            width: 100%;
          }

          .disclaimer-text {
            max-width: 100%;
          }
        }

        @media only screen and (max-width: 520px) {
          .crypto-deposit-container {
            padding: 16px;
          }

          .conversions {
            width: 100%;
          }

          .conversions .input {
            min-width: 0;
          }

          .rate {
            width: calc(100% - 20px);
          }
        }
      `}</style>
    </>
  );
}

export default CreditCardDeposit;
