import {createEffect, createResource, createSignal, For, Show} from "solid-js";
import {A, useParams} from "@solidjs/router";
import CaseTitle from "./casetitle";
import Loader from "../Loader/loader";
import CaseItem from "./caseitem";
import CaseSpinner from "./casespinner";
import {authedAPI} from "../../util/api";
import PlainItem from "../Items/plainitem";
import {useUser} from "../../contexts/usercontextprovider";
import {generateRandomItems} from "../../resources/cases";
import Toggle from "../Toggle/toggle";
import {resolveImageSrc} from "../../util/image";

function CasePage(props) {

  let params = useParams()

  const [user, {setBalance}] = useUser()
  const [caseObj, {mutate}] = createResource(() => params.slug, fetchCase)
  const [amount, setAmount] = createSignal(1)
  const [spinnerItems, setSpinnerItems] = createSignal([])
  const [spinning, setSpinning] = createSignal('')
  const [offset, setOffset] = createSignal(0)
  const [winningItems, setWinningItems] = createSignal([])
  const [spinTime, setSpinTime] = createSignal(7000)
  const [itemTime, setItemTime] = createSignal(3000)

  createEffect(() => {
    if (caseObj() && caseObj()?.items) {
      let items = []
      for (let i = 0; i < 4; i++) {
        items[i] = generateRandomItems(caseObj()?.items)
      }
      setSpinnerItems(items)
    }
  })

  async function fetchCase(slug) {
    try {
      let c = await authedAPI(`/cases/${slug}`, 'GET', null)
      return mutate(c)
    } catch (e) {
      console.log(e)
      return mutate([])
    }
  }

  function demoSpin() {
    if (spinning() !== '') return

    let items = []
    const sortedItems = caseObj()?.items?.slice().sort((a, b) => a.price - b.price);

    for (let i = 0; i < amount(); i++) {
      let randomTicket = Math.random() * 100;
      for (let item of sortedItems) {
        randomTicket -= item.probability;
        if (randomTicket <= 0) {
          items.push(item)
          break;
        }
      }
    }

    spinCases(items)
  }

  function buyCases(results, newBal) {
    let winningItems = []
    for (let result of results) {
      winningItems.push(result.item)
    }
    spinCases(winningItems, newBal)
  }

  function getRandomNumber(min, max) {
    const range = max - min + 1
    return Math.floor(Math.random() * range) + min;
  }

  function spinCases(winningItems, newBal) {
    setOffset(getRandomNumber(-64, 64))

    let items = []
    for (let i = 0; i < amount(); i++) {
      items[i] = generateRandomItems(caseObj()?.items)
      items[i][50] = winningItems[i]
    }

    setWinningItems(winningItems)
    setSpinnerItems(items)
    setSpinning('spinning')
    setTimeout(() => {
      setSpinning('win')
      if (newBal)
        setBalance(newBal)
    }, spinTime() + 500)
    setTimeout(() => setSpinning(''), spinTime() + itemTime())
  }

  function setCasesToOpen(amt) {
    if (spinning() === '' && amt !== amount()) {
      let items = []
      for (let i = 0; i < amt; i++) {
        items[i] = generateRandomItems(caseObj()?.items)
      }
      setSpinnerItems(items)
      setAmount(amt)
    }
  }

  return (
    <>
      <div class='case-page fadein'>

        {/* ── Top header bar ── */}
        <div class='page-header'>
          <A href='/cases' class='back-btn'>
            <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
              <path
                d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z"
                fill="#8b92a0"/>
            </svg>
            Return to Case Opening
          </A>

          <div class='header-actions'>
            <button class='action-btn share-btn'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
              </svg>
              Share Case
            </button>
            <A href='/docs/provably' class='action-btn provably-btn'>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z' fill='#1fd65f'/>
              </svg>
              Provably Fair
            </A>
          </div>
        </div>

        {/* ── Spinner section ── */}
        <div class='spinner-section'>
          <div class='spinner-indicator'>
            <svg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M6 8L0.803847 0.5H11.1962L6 8Z' fill='#1fd65f'/>
            </svg>
          </div>

          <Show when={!caseObj.loading} fallback={<div class='spinner-loader'><Loader/></div>}>
            <div class='spinner-track'>
              {spinning() !== 'win' ? (
                <For each={Array(amount())}>{(spinner, index) =>
                  <CaseSpinner spinTime={spinTime()} offset={offset()}
                               items={spinnerItems()[index()]}
                               spinning={spinning()}
                               position={index()}/>
                }</For>
              ) : (
                <div class='winnings'>
                  <For each={winningItems()}>{(item, index) => <PlainItem {...item}/>}</For>
                </div>
              )}
            </div>
          </Show>
        </div>

        {/* ── Controls bar ── */}
        <div class='controls-bar'>
          <Show when={!caseObj.loading}>
            <div class='case-info-mini'>
              <img src={resolveImageSrc(caseObj()?.img, '/public/cases/radiation-case.png')} class='case-img-mini' alt=''/>
              <p class='case-name-mini'>{caseObj()?.name}</p>
            </div>
          </Show>

          <div class='controls-left'>
            {/* Amount selectors */}
            <div class='amount-group'>
              {[1,2,3,4].map(n => (
                <button
                  class={'amt-btn ' + (amount() === n ? 'active' : '')}
                  onClick={() => setCasesToOpen(n)}
                >{n}</button>
              ))}
            </div>

            {/* Open Case button with price inline */}
            <button
              class={'open-btn ' + (spinning() !== '' ? 'loading' : '')}
              onClick={async () => {
                if (spinning() !== '') return
                setSpinning('loading')
                let res = await authedAPI(`/cases/${caseObj()?.id}/open`, 'POST', JSON.stringify({ amount: amount() }), true)
                if (!res.results) return setSpinning('')
                buyCases(res.results, res.balance)
              }}
            >
              {spinning() !== '' ? (
                <div class='open-loader-row'>
                  <div class='open-loader'/>
                  OPENING...
                </div>
              ) : (
                <>
                  Open for
                  <img src='/assets/icons/coin.svg' height='14'/>
                  <Show when={!caseObj.loading}>
                    <span>{(caseObj()?.price * amount())?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </Show>
                </>
              )}
            </button>

            {/* Demo spin */}
            <button class='demo-btn' onClick={() => demoSpin()}>Demo</button>
          </div>

          <div class='controls-right'>
            {/* Fast open */}
            <div class='fast-toggle' onClick={() => {
              if (spinning() !== '') return
              setItemTime(itemTime() === 1500 ? 3000 : 1500)
              setSpinTime(spinTime() === 3000 ? 7000 : 3000)
            }}>
              <Toggle active={spinTime() === 3000} toggle={() => null}/>
              <span>QUICK UNBOX</span>
            </div>
          </div>
        </div>

        {/* ── Case contains grid ── */}
        <Show when={!caseObj.loading}>
          <div class='items-section'>
            <p class='items-label'>
              <img src='/assets/icons/coin.svg' height='16'/>
              Potential Drops
            </p>
            <div class='items-grid'>
              <For each={caseObj()?.items}>{(item) => <CaseItem {...item} grid={true}/>}</For>
            </div>
          </div>
        </Show>

      </div>

      <style jsx>{`
        .case-page {
          width: 100%;
          height: fit-content;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Page header ── */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0 12px;
          flex-wrap: wrap;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;
          text-decoration: none;
          transition: color .2s;
        }

        .back-btn:hover {
          color: #c3cad6;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;

          height: 32px;
          padding: 0 12px;
          border-radius: 6px;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;

          outline: none;
          cursor: pointer;
          transition: background .2s;
        }

        .provably-btn {
          color: #1fd65f;
          border: 1px solid rgba(31, 214, 95, 0.3);
          background: rgba(31, 214, 95, 0.08);
        }

        .provably-btn:hover {
          background: rgba(31, 214, 95, 0.16);
        }

        .share-btn {
          color: #8b92a0;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
        }

        .share-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #c3cad6;
        }

        /* ── Spinner ── */
        .spinner-section {
          width: 100%;
          border-radius: 12px;
          background: #06080e;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        }

        .spinner-indicator {
          display: flex;
          justify-content: center;
          padding-top: 4px;
          position: relative;
          z-index: 4;
        }

        .spinner-track {
          min-height: 160px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 10px 20px 20px 20px;
        }

        .spinner-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          width: 100%;
        }

        .winnings {
          flex: 1;
          min-height: 130px;
          height: 200px;
          border-radius: 10px;
          background: rgba(31, 214, 95, 0.05);
          border: 1px solid rgba(31, 214, 95, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          overflow: hidden;
          position: relative;
        }

        /* ── Controls bar ── */
        .controls-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 0 14px;
          flex-wrap: wrap;
        }

        .case-info-mini {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .case-img-mini {
          width: 64px;
          height: 64px;
          object-fit: contain;
        }

        .case-name-mini {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }

        .controls-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }

        .amount-group {
          display: flex;
          gap: 6px;
        }

        .amt-btn {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #1a1f29;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          transition: all .2s;
        }

        .amt-btn:hover {
          border-color: rgba(31, 214, 95, 0.4);
          color: #fff;
        }

        .amt-btn.active {
          border-color: #1fd65f;
          background: rgba(31, 214, 95, 0.18);
          color: #fff;
        }

        .open-btn {
          display: flex;
          align-items: center;
          gap: 8px;

          height: 36px;
          padding: 0 20px;
          border-radius: 6px;
          border: none;
          outline: none;

          background: linear-gradient(135deg, #1fd65f 0%, #14b04a 100%);
          box-shadow: 0 0 18px rgba(31, 214, 95, 0.35), 0 2px 0 #0f8a36;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #fff;

          cursor: pointer;
          transition: filter .2s, box-shadow .2s;
        }

        .open-btn:hover {
          filter: brightness(1.08);
        }

        .open-btn.loading {
          background: linear-gradient(135deg, rgba(31,214,95,0.4) 0%, rgba(20,176,74,0.4) 100%);
          box-shadow: none;
          color: #1fd65f;
          cursor: not-allowed;
        }

        .open-loader-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .open-loader {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(31,214,95,0.3);
          border-top-color: #1fd65f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .fast-toggle {
          display: flex;
          align-items: center;
          gap: 7px;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          user-select: none;
          transition: color .2s;
        }

        .fast-toggle:hover {
          color: #c3cad6;
        }

        .demo-btn {
          height: 36px;
          padding: 0 16px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #1a1f29;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          transition: background .2s, color .2s;
        }

        .demo-btn:hover {
          background: #222a36;
          color: #fff;
        }

        /* ── Items grid ── */
        .items-section {
          margin-top: 6px;
        }

        .items-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #1fd65f;
          margin-bottom: 14px;
        }
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0 14px 0;
          flex-wrap: wrap;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;
          text-decoration: none;
          transition: color .2s;
        }

        .back-btn:hover {
          color: #c3cad6;
        }

        .header-case-info {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }

        /* ── Items grid ── */
        .items-section {
          margin-top: 8px;
        }

        .items-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #1fd65f;
          margin-bottom: 14px;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media only screen and (max-width: 1100px) {
          .items-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media only screen and (max-width: 750px) {
          .items-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .header-actions {
            display: none;
          }

          .controls-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media only screen and (max-width: 480px) {
          .items-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export default CasePage;