import {createResource, createSignal, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import Loader from "../Loader/loader";

function CryptoDeposit(props) {

    const [robux, setRobux] = createSignal(0)
    const [dollars, setDollars] = createSignal(0)
    const [crypto, setCrypto] = createSignal(0)
    const [confirmations, setConfirmations] = createSignal(0)
    const [rates, setRates] = createSignal({})
    const [name, setName] = createSignal('')
    const [symbol, setSymbol] = createSignal('')
    const [address, {mutate}] = createResource(fetchCryptoDetails)

    async function fetchCryptoDetails() {
        try {
            let res = await authedAPI('/trading/crypto/deposit/wallet', 'POST', JSON.stringify({ currency: props.currency }))
            if (!res.address) return mutate(null)
            setRates({
                robux: res?.robuxRate?.robux || 1,
                usd: res?.robuxRate?.usd || 0.7,
                crypto: res.currency.price || 0,
            })
            setName(res.currency.name)
            setSymbol(res.currency.id)
            setConfirmations(res.currency.confirmations)

            convertAmounts(1, 0, 0)

            return mutate(res.address)
        } catch (e) {
            console.log(e)
            return mutate(null)
        }
    }

    function convertAmounts(robux, dollars, crypto) {
        if (!rates()) return

        if (robux) {
            dollars = Math.floor(robux / rates().robux * rates().usd * 10000) / 10000 // Round to 4 decimals
            crypto = Math.floor(dollars / rates().crypto * 1000000000) / 1000000000 // 9 decimals max
            setRobux(robux)
            setDollars(dollars)
            setCrypto(crypto)
            return
        }

        if (dollars) {
            robux = Math.round(dollars / rates().usd * rates().robux * 100) / 100 // 2 decimals max
            crypto = Math.floor(dollars / rates().crypto * 1000000000) / 1000000000 // 9 decimals max
            setDollars(dollars)
            setRobux(robux)
            setCrypto(crypto)
            return
        }

        if (crypto) {
            dollars = Math.floor(crypto * rates().crypto * 10000) / 10000 // Round to 4 decimals
            robux = Math.round(dollars / rates().usd * rates().robux * 100) / 100 // 2 decimals max
            setCrypto(crypto)
            setRobux(robux)
            setDollars(dollars)
            return
        }
    }

    function copyAddress() {
        navigator.clipboard.writeText(`${address()}`);
    }

    return (
        <>
            <div class='crypto-deposit-container'>
                <div class='deposit-header'>
                    <p class='type'>You have selected <span class='gold'>{symbol()}</span></p>

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

                <Show when={!address.loading} fallback={<Loader/>}>
                    <>
                        <div className='inputs'>
                            <div className='input'>
                                <p>{symbol()} ADDRESS:</p>

                                <div className='info thin'>
                                    {address()}

                                    <button className='copy' onClick={() => copyAddress()}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"
                                             viewBox="0 0 14 16">
                                            <path
                                                d="M8.62259 2.2981H1.52163C0.681259 2.2981 0 2.97936 0 3.81974V13.964C0 14.8043 0.681259 15.4856 1.52163 15.4856H8.62259C9.46297 15.4856 10.1442 14.8043 10.1442 13.964V3.81974C10.1442 2.97936 9.46297 2.2981 8.62259 2.2981Z"/>
                                            <path
                                                d="M13.1876 1.79089V11.9351C13.1864 12.3383 13.0257 12.7246 12.7406 13.0097C12.4555 13.2948 12.0692 13.4555 11.666 13.4567H11.1588V3.81974C11.1588 3.14713 10.8916 2.50208 10.416 2.02647C9.94036 1.55087 9.2953 1.28368 8.6227 1.28368H3.13467C3.23932 0.987696 3.43295 0.731325 3.68902 0.549713C3.9451 0.368101 4.25107 0.270139 4.56501 0.269257H11.666C12.0692 0.270461 12.4555 0.431162 12.7406 0.716263C13.0257 1.00136 13.1864 1.3877 13.1876 1.79089Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className='input'>
                                <p>SEND AMOUNT:</p>

                                <div className='info'>
                                    <img src={props?.img} height='16' width='16' alt=''/>
                                    {crypto()}
                                </div>
                            </div>
                        </div>

                        <div className='conversions-container'>
                            <img
                                src={`https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${address()}&choe=UTF-8&chld=L|2`}
                                className='qr' alt=''/>

                            <div className='conversions'>
                                <div className='input'>
                                  <img src='/assets/chips/chip-green-clover.png' width='24' height='24' alt=''/>
                                    <input type='number' value={robux()}
                                           onInput={(e) => convertAmounts(e.target.valueAsNumber, 0, 0)}/>
                                </div>

                                <span class='equals'>=</span>

                                <div className='input'>
                                  <span class='currency'>$</span>
                                    <input type='number' value={dollars()}
                                           onInput={(e) => convertAmounts(0, e.target.valueAsNumber, 0)}/>
                                </div>

                                <span class='equals'>=</span>

                                <div className='input'>
                                    <img src={props?.img} height='16' width='16' alt=''/>
                                    <input type='number' value={crypto()}
                                           onInput={(e) => convertAmounts(0, 0, e.target.valueAsNumber)}/>
                                </div>
                            </div>
                        </div>

                        <div className='disclaimer'>
                            <p className='disclaimer-text'>Only send {symbol()} to the address or QR code above, do not
                                send any other crypto currency. {confirmations()} confirmations are required before you are
                                credited.</p>

                            <div className='rate'>
                                <p>{rates().robux} <span className='gold'>COINS</span></p>
                                <p>=</p>
                                <p>${rates().usd?.toFixed(2)}</p>
                                <img className='coin' src='/assets/chips/chip-green.png' height='72' width='72' alt=''/>
                            </div>
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

                padding: 28px;
                border: 1px solid var(--glass-border);
                border-radius: 10px;
                background:
                  radial-gradient(90% 140% at 0 0, rgba(31,214,95,.06), transparent 58%),
                  linear-gradient(145deg, rgba(22,29,39,.82), rgba(8,12,18,.9));
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
                transition: border-color .18s ease, box-shadow .18s ease;
              }

              .input:focus-within {
                border-color: rgba(31,214,95,.45);
                box-shadow: 0 0 0 3px rgba(31,214,95,.06);
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

              .info {
                display: flex;
                align-items: center;
                gap: 8px;

                color: #FFF;
                font-size: 12px;
              }

              .thin {
                font-weight: 400;
              }

              .copy {
                border: unset;
                outline: unset;
                padding: unset;
                background: unset;
                cursor: pointer;
              }

              .copy svg {
                fill: #8b92a0;
                transition: all .1s;
              }

              .copy:active svg {
                fill: #8b92a0;
              }

              .conversions-container {
                display: flex;
                justify-content: center;
                align-items: flex-start;

                position: relative;

                margin: 35px 0;
                padding: 10px 0;

                min-height: 132px;

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

              .qr {
                position: absolute;
                top: 0;
                left: 0;

                width: 132px;
                height: 132px;
                padding: 6px;
                border: 1px solid rgba(255,255,255,.1);
                border-radius: 8px;
                background: #fff;
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

              .rate {
                width: 350px;
                height: 60px;

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

                position: absolute;
                right: 50px;
                bottom: 40px;
              }

              .rate .coin {
                position: absolute;
                left: -40px;
                z-index: 10;
                object-fit: contain;
                filter: drop-shadow(0 8px 10px rgba(0,0,0,.38));
              }

              @media only screen and (max-width: 800px) {
                .crypto-deposit-container {
                  padding: 20px;
                }

                .deposit-header {
                  flex-wrap: wrap;
                }

                .type {
                  width: 100%;
                }

                .conversions-container {
                  padding-top: 160px;
                  margin: 20px 0;
                }

                .qr {
                  left: 50%;
                  transform: translateX(-50%);
                }

                .conversions {
                  flex-wrap: wrap;
                  justify-content: center;
                }

                .disclaimer-text {
                  max-width: 100%;
                  padding-bottom: 85px;
                }

                .rate {
                  right: 20px;
                  bottom: 20px;
                }
              }

              @media only screen and (max-width: 520px) {
                .crypto-deposit-container {
                  padding: 16px;
                }

                .inputs {
                  flex-direction: column;
                }

                .input {
                  flex-basis: 45px;
                  width: 100%;
                }

                .conversions .input {
                  max-width: none;
                }

                .rate {
                  width: calc(100% - 72px);
                }
              }
            `}</style>
        </>
    );
}

export default CryptoDeposit;
