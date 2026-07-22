import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {A, useParams} from "@solidjs/router";
import CaseTitle from "./casetitle";
import Loader from "../Loader/loader";
import CaseItem from "./caseitem";
import CaseSpinner from "./casespinner";
import {authedAPI, createNotification} from "../../util/api";
import {useUser} from "../../contexts/usercontextprovider";
import {generateRandomItems, generateRareItems, getRareItems, isRareItem, maskRareItems} from "../../resources/cases";
import Toggle from "../Toggle/toggle";
import {resolveImageSrc} from "../../util/image";
import CasePreview from "./casepreview";
import {playGameSFX, stopSFXChannel, startAnimationTicker} from "../../util/sound";
import GameFairnessButton from "../GameFairness/gamefairnessbutton";

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

  let tickerHandle = null

  async function shareCurrentCase() {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        createNotification('success', 'Case link copied to clipboard.')
      }
    } catch {
      createNotification('error', 'Unable to copy the case link.')
    }
  }

  // CSS spin easing control points: cubic-bezier(.08,.78,.16,1)
  const CASE_SPIN_BEZIER = [0.08, 0.78, 0.16, 1]

  function startTicking(duration) {
    if (tickerHandle) tickerHandle.cancel()

    // Pass the real cubic-bezier control points so the ticker fires fast at
    // the start (when items rush past) and decelerates near the end.
    tickerHandle = startAnimationTicker(
      () => {
        playGameSFX('case-tick', '/assets/sfx/casetick.wav', {
          channel: 'spin-tick',
          volume: 0.50,
          minIntervalMs: 28,
        })
      },
      duration,
      28,
      CASE_SPIN_BEZIER
    )
  }

  function stopTicking() {
    if (tickerHandle) {
      tickerHandle.cancel()
      tickerHandle = null
    }
    stopSFXChannel('spin-tick', { fadeOutMs: 60 })
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
      stopTicking()
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
    stopTicking()
    stopSFXChannel('spin-tick', { fadeOutMs: 80 })
  })

  function getRiskLabel(items) {
    if (!items?.length) return { label: 'Unknown', color: '#8b92a0' }
    const max = Math.max(...items.map(i => i.price))
    const min = Math.min(...items.map(i => i.price))
    const ratio = max / (min || 1)
    if (ratio > 500) return { label: 'Very High Risk', color: '#FF5141' }
    if (ratio > 100) return { label: 'High Risk', color: '#FF9224' }
    if (ratio > 20) return { label: 'Medium Risk', color: '#FFB84A' }
    return { label: 'Low Risk', color: '#1fd65f' }
  }

  return (
    <>
      <div class='case-page fadein'>

        {/* ── Top header bar ── */}
        <div class='case-header'>
          <div class='case-header-main'>
            <Show when={!caseObj.loading}>
              <img src={resolveImageSrc(caseObj()?.img, '/public/cases/radiation-case.png')} class='case-hero-img' alt=''/>
            </Show>

            <div class='case-header-info'>
              <div class='case-title-row'>
                <h1 class='case-title'>{caseObj()?.name}</h1>
                <Show when={!caseObj.loading && caseObj()?.items?.length}>
                  <span
                    class='risk-tag'
                    style={{
                      color: getRiskLabel(caseObj()?.items).color,
                      'border-color': getRiskLabel(caseObj()?.items).color + '40',
                      background: getRiskLabel(caseObj()?.items).color + '14'
                    }}
                  >{getRiskLabel(caseObj()?.items).label}</span>
                </Show>
              </div>

              <div class='case-header-controls'>
                {/* Amount selectors */}
                <div class='amount-group'>
                  {[1,2,3,4].map(n => (
                    <button
                      class={'amt-btn ' + (amount() === n ? 'active' : '')}
                      onClick={() => setCasesToOpen(n)}
                    >{n}</button>
                  ))}
                </div>

                {/* Demo spin */}
                <button class='demo-btn' onClick={() => demoSpin()}>Demo</button>

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
              </div>
            </div>
          </div>

          <A href='/cases' class='back-btn'>
            <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
              <path
                d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z"
                fill="#8b92a0"/>
            </svg>
            Back
          </A>
        </div>

        {/* ── Secondary toolbar ── */}
        <div class='case-toolbar'>
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

          <GameFairnessButton/>

          <div class='toolbar-right'>
            {/* Preview button */}
            <button class='preview-btn' onClick={() => setShowPreview(true)} aria-label='Preview'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
              </svg>
            </button>

            <button class='action-btn share-btn' onClick={shareCurrentCase}>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
              </svg>
              Share Case
            </button>
          </div>
        </div>

        {/* ── Spinner section ── */}
        <div class='spinner-section'>
          <Show when={!caseObj.loading} fallback={<div class='spinner-loader'><Loader/></div>}>
            <div class={'spinner-track amount-' + amount()}>
              <div class='spinner-grid'>
                <For each={Array(amount())}>{(spinner, index) =>
                  <CaseSpinner spinTime={spinTime()} offset={offset()}
                               items={spinnerItems()[index()]}
                               spinning={spinning()}
                               layout={amount() > 1 ? 'multi' : 'row'}
                               sideArrows={amount() > 1}
                               position={index()}/>
                }</For>
              </div>
            </div>
          </Show>
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

        /* ── Case header ── */
        .case-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 0 14px;
          flex-wrap: wrap;
        }

        .case-header-main {
          display: flex;
          align-items: center;
          gap: 18px;
          min-width: 0;
        }

        .case-hero-img {
          width: 92px;
          height: 92px;
          flex-shrink: 0;
          object-fit: contain;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));
        }

        .case-header-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .case-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .case-title {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .risk-tag {
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .3px;
        }

        .case-header-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
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

        /* ── Secondary toolbar ── */
        .case-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 0 14px;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
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
          background: #080d14;
          overflow: hidden;
          position: relative;
        }

        .spinner-track {
          min-height: 224px;
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
          gap: 0;
          padding: 20px 24px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(31, 214, 95, 0.12) transparent;
          position: relative;
        }

        .spinner-grid {
          display: contents;
        }

        .spinner-track.amount-2,
        .spinner-track.amount-3,
        .spinner-track.amount-4 {
          min-height: 290px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          background: #171a20;
          border: 0;
          border-radius: 8px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.015);
        }

        .spinner-track.amount-2 .spinner-grid,
        .spinner-track.amount-3 .spinner-grid,
        .spinner-track.amount-4 .spinner-grid {
          width: min(100%, var(--reel-grid-width));
          height: 258px;
          display: grid;
          grid-auto-rows: 258px;
          align-items: stretch;
          gap: 8px;
          position: relative;
        }

        .spinner-track.amount-2 .spinner-grid::before,
        .spinner-track.amount-2 .spinner-grid::after,
        .spinner-track.amount-3 .spinner-grid::before,
        .spinner-track.amount-3 .spinner-grid::after,
        .spinner-track.amount-4 .spinner-grid::before,
        .spinner-track.amount-4 .spinner-grid::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 3px;
          height: 9px;
          border-radius: 1px;
          background: #14f195;
          box-shadow: 0 0 8px rgba(20, 241, 149, 0.72);
          transform: translateY(-50%);
          z-index: 8;
          pointer-events: none;
        }

        .spinner-track .spinner-grid::before {
          left: -12px;
        }

        .spinner-track .spinner-grid::after {
          right: -12px;
        }

        .spinner-track.amount-2 {
          --reel-grid-width: 272px;
        }

        .spinner-track.amount-2 .spinner-grid {
          grid-template-columns: repeat(2, minmax(0, 132px));
        }

        .spinner-track.amount-3 {
          --reel-grid-width: 412px;
        }

        .spinner-track.amount-3 .spinner-grid {
          grid-template-columns: repeat(3, minmax(0, 132px));
        }

        .spinner-track.amount-4 {
          --reel-grid-width: 552px;
        }

        .spinner-track.amount-4 .spinner-grid {
          grid-template-columns: repeat(4, minmax(0, 132px));
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
          border-radius: var(--glass-radius-sm);
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
          transition: all var(--transition-smooth);
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
          height: 34px;
          padding: 0 12px;
          border-radius: var(--glass-radius-xs);
          border: 1px solid transparent;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;

          cursor: pointer;
          user-select: none;
          transition: all var(--transition-smooth);
        }

        .fast-toggle:hover {
          color: #c3cad6;
          background: rgba(255,255,255,0.03);
          border-color: var(--btn-glass-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.1);
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
          border-radius: var(--glass-radius-sm);
          border: 1px solid var(--btn-glass-border);
          background: var(--btn-glass-bg);
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 4px 12px rgba(0,0,0,0.15);

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          transition: all var(--transition-smooth);
        }

        .demo-btn:hover {
          border-color: rgba(31, 214, 95, 0.25);
          background: rgba(31, 214, 95, 0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 20px rgba(0,0,0,0.2), var(--green-glow);
          color: #fff;
          transform: translateY(-1px);
        }

        .demo-btn:active {
          transform: translateY(0);
        }

        .preview-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: var(--glass-radius-sm);
          border: 1px solid var(--btn-glass-border);
          background: var(--btn-glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 6px 18px rgba(0, 0, 0, 0.35);
          color: #8b92a0;
          cursor: pointer;
          outline: none;
          transition: all var(--transition-smooth);
        }

        .preview-btn:hover {
          background: rgba(31, 214, 95, 0.06);
          border-color: rgba(31, 214, 95, 0.25);
          color: #1fd65f;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 22px rgba(0, 0, 0, 0.4), var(--green-glow);
          transform: translateY(-1px);
        }

        .preview-btn:active {
          transform: translateY(0);
        }

        .preview-btn svg {
          width: 14px;
          height: 14px;
        }

        /* ── Items section ── */
        .items-section {
          margin-top: 20px;
        }

        .items-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: #c3cad6;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .items-label img {
          opacity: 0.7;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media only screen and (max-width: 1200px) {
          .items-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media only screen and (max-width: 960px) {
          .items-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media only screen and (max-width: 750px) {
          .items-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .case-hero-img {
            width: 64px;
            height: 64px;
          }

          .case-title {
            font-size: 16px;
          }

          .toolbar-right {
            margin-left: 0;
            width: 100%;
          }

          .case-toolbar {
            flex-wrap: wrap;
          }
        }

        @media only screen and (max-width: 480px) {
          .items-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .case-header-main {
            width: 100%;
          }

          .case-header-controls {
            width: 100%;
          }

          .open-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}

export default CasePage;
