import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {A, useParams} from "@solidjs/router";
import CaseTitle from "./casetitle";
import Loader from "../Loader/loader";
import CaseItem from "./caseitem";
import CaseSpinner from "./casespinner";
import {authedAPI} from "../../util/api";
import {useUser} from "../../contexts/usercontextprovider";
import {generateRandomItems, generateRareItems, getRareItems, isRareItem, maskRareItems} from "../../resources/cases";
import Toggle from "../Toggle/toggle";
import {resolveImageSrc} from "../../util/image";
import CasePreview from "./casepreview";
import {playGameSFX, stopSFXChannel} from "../../util/sound";

function CasePage(props) {

  let params = useParams()

  const [user, {setBalance}] = useUser()
  const [caseObj, {mutate}] = createResource(() => params.slug, fetchCase)
  const [amount, setAmount] = createSignal(1)
  const [spinnerItems, setSpinnerItems] = createSignal([])
  const [spinning, setSpinning] = createSignal('')
  const [offset, setOffset] = createSignal(0)
  const [winningItems, setWinningItems] = createSignal([])
  const [spinTime, setSpinTime] = createSignal(4800)
  const [itemTime, setItemTime] = createSignal(2200)
  const [cosmicSpin, setCosmicSpin] = createSignal(false)
  const [showPreview, setShowPreview] = createSignal(false)

  let tickTimer = null

  /**
   * Bezier derivative for cubic-bezier(0.08, 0.78, 0.16, 1.0) — the CSS spin easing.
   * Returns the instantaneous speed at normalized time t (0→1).
   * Higher speed → shorter tick interval.
   */
  function spinBezierSpeed(t) {
    // Control points: P0=0, P1=0.08, P2=0.78, P3=1
    const p1 = 0.08, p2 = 0.78, p3 = 1
    // Derivative of cubic bezier: B'(t) = 3(1-t)²(p1-0) + 6(1-t)t(p2-p1) + 3t²(p3-p2)
    const u = 1 - t
    return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2)
  }

  function startTicking(duration) {
    if (tickTimer) clearTimeout(tickTimer)
    let elapsed = 0

    /**
     * Instead of naive linear deceleration, we use the same cubic-bezier
     * as the CSS animation. At each step we compute the bezier speed and
     * derive a delay that matches how fast items are actually scrolling.
     *
     * minDelay  = 75 ms  — fastest tick (start of spin)
     * maxDelay  = 280 ms — slowest tick (end of spin)
     */
    const minDelay = 75
    const maxDelay = 280

    const tick = () => {
      playGameSFX('case-tick', '/assets/sfx/casetick.wav', {
        channel: 'spin-tick',
        volume: 0.52,
        minIntervalMs: 40,
      })

      const progress = Math.min(elapsed / duration, 0.999)
      const speed = Math.max(spinBezierSpeed(progress), 0.01)
      // Invert speed to get delay: fast (high speed) → short delay, slow → long delay
      const normalized = 1 - Math.min(1, speed / 3)
      const delay = Math.round(minDelay + normalized * (maxDelay - minDelay))

      elapsed += delay
      if (elapsed < duration) {
        tickTimer = setTimeout(tick, delay)
      }
    }
    tickTimer = setTimeout(tick, minDelay)
  }

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

    const casePrice = caseObj()?.price
    const cosmic = cosmicSpin() && getRareItems(caseObj()?.items, casePrice).length > 0
    const anyRare = cosmic && winningItems.some(item => isRareItem(item, casePrice))

    let items = []
    for (let i = 0; i < amount(); i++) {
      items[i] = generateRandomItems(caseObj()?.items)
      items[i][50] = winningItems[i]
      // Cosmic Spin - every rare item (including a rare win) shows as the Cosmic logo
      if (cosmic) items[i] = maskRareItems(items[i], casePrice)
    }

    setWinningItems(winningItems)
    setSpinnerItems(items)
    setSpinning('spinning')
    startTicking(spinTime())

    const finish = () => {
      if (tickTimer) { clearTimeout(tickTimer); tickTimer = null }
      setSpinning('win')
      playGameSFX('case-win', '/assets/sfx/winorcashout.mp3', {
        channel: 'result-win',
        volume: 0.62,
        fadeInMs: 80,
      })
      if (newBal)
        setBalance(newBal)
      setTimeout(() => setSpinning(''), itemTime() - 500)
    }

    if (anyRare) {
      // Exclusive second spin featuring only rare items
      setTimeout(() => {
        setSpinning('')
        setOffset(getRandomNumber(-64, 64))

        let rareReels = []
        for (let i = 0; i < amount(); i++) {
          rareReels[i] = isRareItem(winningItems[i], casePrice)
            ? generateRareItems(caseObj()?.items, casePrice)
            : generateRandomItems(caseObj()?.items)
          rareReels[i][50] = winningItems[i]
        }

        setSpinnerItems(rareReels)

        requestAnimationFrame(() => {
          setSpinning('spinning')
          startTicking(spinTime())
          setTimeout(finish, spinTime() + 500)
        })
      }, spinTime() + 900)
    } else {
      setTimeout(finish, spinTime() + 500)
    }
  }

  function setCasesToOpen(amt) {
    if (spinning() === '' && amt !== amount()) {
      let items = []
      for (let i = 0; i < amt; i++) {
        items[i] = generateRandomItems(caseObj()?.items)
      }
      setAmount(amt)
      setSpinnerItems(items)
    }
  }

  onCleanup(() => {
    if (tickTimer) {
      clearTimeout(tickTimer)
      tickTimer = null
    }
    stopSFXChannel('spin-tick', { fadeOutMs: 80 })
  })

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
          <Show when={!caseObj.loading} fallback={<div class='spinner-loader'><Loader/></div>}>
            <div class={'spinner-track amount-' + amount()}>
              <For each={Array(amount())}>{(spinner, index) =>
                <CaseSpinner spinTime={spinTime()} offset={offset()}
                             items={spinnerItems()[index()]}
                             spinning={spinning()}
                             layout={amount() >= 3 ? 'multi' : 'row'}
                             sideArrows={amount() > 1}
                             position={index()}/>
              }</For>

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
            {/* Preview button */}
            <button class='preview-btn' onClick={() => setShowPreview(true)} aria-label='Preview'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
              </svg>
            </button>

            {/* Cosmic Spin */}
            <div class='fast-toggle cosmic-toggle' onClick={() => {
              if (spinning() !== '') return
              setCosmicSpin(!cosmicSpin())
            }}>
              <Toggle active={cosmicSpin()} toggle={() => null}/>
              <img src='/assets/icons/cosmic-spin.png' class='cosmic-icon' alt='' height='16' width='16'/>
              <span>COSMIC SPIN</span>
            </div>

            {/* Fast open */}
            <div class='fast-toggle' onClick={() => {
              if (spinning() !== '') return
              setItemTime(itemTime() === 1100 ? 2200 : 1100)
              setSpinTime(spinTime() === 2400 ? 4800 : 2400)
            }}>
              <Toggle active={spinTime() === 2400} toggle={() => null}/>
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

      {/* ── Case Preview Modal ── */}
      <Show when={showPreview() && caseObj()}>
        <CasePreview case={caseObj()} onClose={() => setShowPreview(false)}/>
      </Show>

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
          gap: 10px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;
          text-decoration: none;
          padding: 6px 12px 6px 8px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: all .2s ease;
        }

        .back-btn:hover {
          color: #c3cad6;
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
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

          height: 34px;
          padding: 0 14px;
          border-radius: 7px;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;

          outline: none;
          cursor: pointer;
          transition: all .2s;
        }

        .provably-btn {
          color: #1fd65f;
          border: 1px solid rgba(31, 214, 95, 0.25);
          background: rgba(31, 214, 95, 0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .provably-btn:hover {
          background: rgba(31, 214, 95, 0.14);
          border-color: rgba(31, 214, 95, 0.4);
          transform: translateY(-1px);
        }

        .share-btn {
          color: #8b92a0;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .share-btn:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.14);
          color: #c3cad6;
          transform: translateY(-1px);
        }

        /* ── Spinner ── */
        .spinner-section {
          width: 100%;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(4, 6, 11, 0.96), rgba(2, 4, 8, 0.98));
          border: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 48px rgba(0,0,0,0.6);
        }

        .spinner-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 5%;
          right: 5%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(31, 214, 95, 0.08), transparent);
          z-index: 1;
        }

        .spinner-track {
          min-height: 224px;
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
          gap: 12px;
          padding: 16px 20px 22px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(31, 214, 95, 0.18) transparent;
          position: relative;
        }

        .spinner-track.amount-3,
        .spinner-track.amount-4 {
          min-height: 290px;
          display: grid;
          grid-auto-rows: 258px;
          align-items: stretch;
          gap: 0;
          padding: 12px;
          overflow-x: hidden;
          overflow-y: hidden;
          background: linear-gradient(180deg, rgba(10, 14, 22, 0.96), rgba(5, 8, 14, 0.98));
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.02), inset 0 0 80px rgba(0, 0, 0, 0.35);
        }

        .spinner-track.amount-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .spinner-track.amount-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .spinner-track::-webkit-scrollbar {
          height: 5px;
        }

        .spinner-track::-webkit-scrollbar-track {
          background: transparent;
        }

        .spinner-track::-webkit-scrollbar-thumb {
          background: rgba(31, 214, 95, 0.18);
          border-radius: 999px;
        }

        .spinner-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 180px;
          width: 100%;
        }

        /* ── Controls bar ── */
        .controls-bar {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 0 16px;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          margin-bottom: 10px;
        }

        .case-info-mini {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          padding-right: 18px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }

        .case-img-mini {
          width: 58px;
          height: 58px;
          object-fit: contain;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
        }

        .case-name-mini {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 17px;
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
          gap: 14px;
          margin-left: auto;
        }

        .amount-group {
          display: flex;
          gap: 5px;
          padding: 3px;
          border-radius: 8px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.04);
        }

        .amt-btn {
          width: 36px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #6b7280;

          cursor: pointer;
          transition: all .2s;
        }

        .amt-btn:hover {
          border-color: rgba(31, 214, 95, 0.35);
          color: #fff;
          background: rgba(31, 214, 95, 0.06);
          transform: translateY(-1px);
        }

        .amt-btn.active {
          border-color: rgba(31, 214, 95, 0.5);
          background: rgba(31, 214, 95, 0.15);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(31, 214, 95, 0.12);
        }

        .open-btn {
          display: flex;
          align-items: center;
          gap: 8px;

          height: 38px;
          padding: 0 22px;
          border-radius: 8px;
          border: none;
          outline: none;

          background: linear-gradient(135deg, #1fd65f 0%, #14b04a 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 0 22px rgba(31, 214, 95, 0.4), 0 2px 0 #0f8a36;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          letter-spacing: .2px;

          cursor: pointer;
          transition: all .2s ease;
          position: relative;
          overflow: hidden;
        }

        .open-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent 50%);
          pointer-events: none;
        }

        .open-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.26), 0 0 32px rgba(31, 214, 95, 0.55), 0 2px 0 #0f8a36;
        }

        .open-btn:active {
          transform: translateY(0);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 0 18px rgba(31, 214, 95, 0.3);
        }

        .open-btn.loading {
          background: linear-gradient(135deg, rgba(31,214,95,0.35) 0%, rgba(20,176,74,0.35) 100%);
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
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;

          cursor: pointer;
          user-select: none;
          transition: color .2s;
        }

        .fast-toggle:hover {
          color: #c3cad6;
        }

        .cosmic-icon {
          object-fit: contain;
          filter: drop-shadow(0 0 6px rgba(31, 214, 95, 0.35));
          transition: filter .25s ease, transform .25s ease;
        }

        .fast-toggle:hover .cosmic-icon {
          filter: drop-shadow(0 0 10px rgba(31, 214, 95, 0.6));
          transform: scale(1.1);
        }

        .demo-btn {
          height: 38px;
          padding: 0 18px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.065);
          background: linear-gradient(180deg, rgba(20, 25, 35, 0.92), rgba(14, 18, 28, 0.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          transition: all .2s;
        }

        .demo-btn:hover {
          background: rgba(31, 214, 95, 0.07);
          border-color: rgba(31, 214, 95, 0.3);
          color: #fff;
          transform: translateY(-1px);
        }

        .preview-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 16, 24, 0.75);
          backdrop-filter: blur(12px) saturate(130%);
          -webkit-backdrop-filter: blur(12px) saturate(130%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 6px 18px rgba(0, 0, 0, 0.35);
          color: #8b92a0;
          cursor: pointer;
          outline: none;
          transition: all .2s ease;
        }

        .preview-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.16);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 22px rgba(0, 0, 0, 0.4);
          transform: translateY(-1px);
        }

        .preview-btn svg {
          width: 14px;
          height: 14px;
        }

        /* ── Items section ── */
        .items-section {
          margin-top: 8px;
        }

        .items-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #8b92a0;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .items-label img {
          opacity: 0.6;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
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
            gap: 8px;
          }

          .header-actions {
            display: none;
          }

          .controls-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .case-info-mini {
            border-right: none;
            padding-right: 0;
          }
        }

        @media only screen and (max-width: 480px) {
          .items-grid {
            grid-template-columns: 1fr;
          }

          .controls-right {
            margin-left: 0;
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

export default CasePage;