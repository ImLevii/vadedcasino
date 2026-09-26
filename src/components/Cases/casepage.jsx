import {batch, createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {A, useParams} from "@solidjs/router";
import Loader from "../Loader/loader";
import CaseItem from "./caseitem";
import CaseSpinner from "./casespinner";
import {authedAPI, createNotification} from "../../util/api";
import {useUser} from "../../contexts/usercontextprovider";
import {generateRandomItems, generateRareItems, getRareItems, isRareItem, maskRareItems} from "../../resources/cases";
import {resolveImageSrc} from "../../util/image";
import CasePreview from "./casepreview";
import CosmicGem from './cosmicgem';
import {playGameSFX, stopSFXChannel, startReelSFX, prepareCosmicSFX, playCosmicSFX} from "../../util/sound";

function CasePage(props) {

  let params = useParams()

  const [user, {setBalance}] = useUser()
  const [caseObj, {refetch}] = createResource(() => params.slug, fetchCase)
  const [amount, setAmount] = createSignal(1)
  const [spinnerItems, setSpinnerItems] = createSignal([])
  const [spinning, setSpinning] = createSignal('')
  const [reelStates, setReelStates] = createSignal([])
  const [offset, setOffset] = createSignal(0)
  const [winningItems, setWinningItems] = createSignal([])
  const [spinTime, setSpinTime] = createSignal(4800)
  const [itemTime, setItemTime] = createSignal(2200)
  const [cosmicSpin, setCosmicSpin] = createSignal(false)
  const [showPreview, setShowPreview] = createSignal(false)

  const timers = new Set()
  const schedule = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
  let tickerHandle = null
  let reelFinished = () => {}
  let revealFrame
  let stopCosmicSound = () => {}

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

  function startTicking(duration) {
    stopTicking()
    tickerHandle = startReelSFX('case-roll', duration * .88)
  }

  function stopTicking() {
    tickerHandle?.()
    tickerHandle = null
    stopSFXChannel('case-roll')
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
      return c?.error ? null : c
    } catch (e) {
      console.log(e)
      return null
    }
  }

  function demoSpin() {
    if (spinning() !== '' || !caseObj()?.items?.length) return

    prepareCosmicSFX()
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
    const cosmicReels = winningItems.map(item => cosmic && isRareItem(item, casePrice))
    const anyRare = cosmicReels.some(Boolean)

    let items = []
    for (let i = 0; i < amount(); i++) {
      items[i] = generateRandomItems(caseObj()?.items)
      items[i][50] = winningItems[i]
      // Cosmic Spin - every rare item (including a rare win) shows as the Cosmic logo
      if (cosmic) items[i] = maskRareItems(items[i], casePrice)
    }

    setWinningItems(winningItems)
    setSpinnerItems(items)
    setReelStates(winningItems.map(() => 'spinning'))
    setSpinning('spinning')

    const finish = () => {
      stopTicking()
      setReelStates(winningItems.map(() => 'win'))
      setSpinning('win')
      playGameSFX('case-win', '/assets/sfx/winorcashout.mp3', {
        channel: 'result-win',
        volume: 0.62,
        fadeInMs: 80,
      })
      if (Number.isFinite(newBal))
        setBalance(newBal)
      schedule(() => batch(() => { setReelStates([]); setSpinning('') }), itemTime() - 500)
    }

    const whenReelsFinish = (indices, callback) => {
      const pending = new Set(indices)
      reelFinished = index => {
        pending.delete(index)
        if (pending.size) return
        reelFinished = () => {}
        schedule(callback, 80)
      }
    }

    if (anyRare) {
      // Keep ordinary winners on their original strips while only hit reels reveal.
      whenReelsFinish(winningItems.map((_, i) => i), () => {
        stopTicking()
        setReelStates(cosmicReels.map(hit => hit ? 'cosmic' : 'win'))
        stopCosmicSound = playCosmicSFX()
        schedule(() => {
          batch(() => {
            setReelStates(cosmicReels.map(hit => hit ? 'loading' : 'win'))
            setOffset(getRandomNumber(-64, 64))
            setSpinnerItems(current => current.map((strip, i) => {
              if (!cosmicReels[i]) return strip
              const rareStrip = generateRareItems(caseObj()?.items, casePrice)
              rareStrip[50] = winningItems[i]
              return rareStrip
            }))
          })
          revealFrame = requestAnimationFrame(() => {
            whenReelsFinish(cosmicReels.flatMap((hit, i) => hit ? [i] : []), finish)
            setReelStates(cosmicReels.map(hit => hit ? 'spinning' : 'win'))
          })
        }, 1100)
      })
    } else {
      whenReelsFinish(winningItems.map((_, i) => i), finish)
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
    reelFinished = () => {}
    timers.forEach(clearTimeout)
    cancelAnimationFrame(revealFrame)
    stopCosmicSound()
    stopTicking()
    stopSFXChannel('result-win')
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
        <Show when={!caseObj.loading && !caseObj()?.items?.length}>
          <div class='case-error' role='status'>This case could not be loaded. <button class='demo-btn' onClick={() => refetch()}>Try again</button></div>
        </Show>

        {/* ── Top header bar ── */}
        <div class='case-header'>
          <div class='case-header-main'>
            <Show when={!caseObj.loading}>
              <img src={resolveImageSrc(caseObj()?.img, '/public/cases/radiation-case.png')} class='case-hero-img' alt=''/>
            </Show>

            <div class='case-header-info'>
              <div class='case-title-row'>
                <h1 class='case-title'>{caseObj()?.name || (caseObj.loading ? 'Loading case…' : 'Case unavailable')}</h1>
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
                  {[1,2,3,4,5,6].map(n => (
                    <button
                      class={'amt-btn ' + (amount() === n ? 'active' : '')}
                      disabled={spinning() !== '' || !caseObj()?.items?.length} aria-pressed={amount() === n}
                      onClick={() => setCasesToOpen(n)}
                    >{n}</button>
                  ))}
                </div>

                {/* Demo spin */}
                <button class='demo-btn' disabled={spinning() !== '' || !caseObj()?.items?.length} onClick={() => demoSpin()}>Demo</button>

                {/* Open Case button with price inline */}
                <button
                  class={'open-btn ' + (spinning() !== '' ? 'loading' : '')}
                  disabled={spinning() !== '' || !caseObj()?.items?.length}
                  onClick={async () => {
                    if (spinning() !== '') return
                    if (!user()) return createNotification('error', 'Sign in to open cases, or try a demo spin.')
                    if (Number(user().balance) < Number(caseObj().price) * amount()) return createNotification('error', 'Insufficient balance for this opening.')
                    prepareCosmicSFX()
                    setSpinning('loading')
                    let res = await authedAPI(`/cases/${caseObj()?.id}/open`, 'POST', JSON.stringify({ amount: amount() }), true)
                    if (!res?.results?.length) return setSpinning('')
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
                      {amount()} {amount() === 1 ? 'Spin' : 'Spins'} for
                      <img src='/assets/icons/coin.svg' height='14'/>
                      <Show when={!caseObj.loading}>
                        <span>{(Number(caseObj()?.price || 0) * amount()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </Show>
                    </>
                  )}
                </button>
              </div>
        <div class='case-toolbar'>
          {/* Cosmic Spin */}
          <button class='fast-toggle cosmic-toggle' aria-pressed={cosmicSpin()} disabled={spinning() !== ''} onClick={() => {
            if (spinning() !== '') return
            setCosmicSpin(!cosmicSpin())
          }}>

            <span class='cosmic-icon'><CosmicGem/></span>
            <span>Cosmic Spin</span>
          </button>

          {/* Fast open */}
          <button class='fast-toggle' aria-pressed={spinTime() === 2400} disabled={spinning() !== ''} onClick={() => {
            if (spinning() !== '') return
            setItemTime(itemTime() === 1100 ? 2200 : 1100)
            setSpinTime(spinTime() === 2400 ? 4800 : 2400)
          }}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 20a10 10 0 1 1 16 0M12 14l5-7'/></svg>
            <span>Quick</span>
          </button>


          <div class='toolbar-right'>
            {/* Preview button */}
            <button class='preview-btn' onClick={() => setShowPreview(true)} aria-label='Preview case contents' title='Preview case contents'>
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

            </div>
          </div>

          <A href='/cases' class='case-back-link'>
            <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
              <path
                d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z"
                fill="#8b92a0"/>
            </svg>
            Back
          </A>
        </div>

        {/* ── Secondary toolbar ── */}
        {/* ── Spinner section ── */}
        <div class='spinner-section'>
          <Show when={!caseObj.loading} fallback={<div class='spinner-loader'><Loader/></div>}>
            <div class={'spinner-track amount-' + amount()}>
              <div class='spinner-grid'>
                <For each={Array(amount())}>{(spinner, index) =>
                  <div class='reel-column'><CaseSpinner presentation="case" spinTime={spinTime()} offset={offset()}
                               onSpinStart={() => { if (index() === reelStates().indexOf('spinning')) startTicking(spinTime()) }}
                               onSpinEnd={() => reelFinished(index())}
                               items={spinnerItems()[index()]}
                               spinning={reelStates()[index()] ?? spinning()}
                               layout={amount() > 1 ? 'multi' : 'row'}
                               sideArrows={amount() > 1}
                               position={index()}/></div>
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

      <style>{`
        .case-page .case-back-link { height:40px; padding:0 18px; display:inline-flex; align-items:center; justify-content:center; gap:10px; flex-shrink:0; border:1px solid #252933; border-radius:4px; background:#20232c; color:#9298a5; font-size:12px; text-decoration:none; }
        @media(max-width:700px) { .case-page .case-back-link { position:absolute; top:20px; right:0; padding:0 8px; font-size:10px; } }
      `}</style>
      <style jsx>{`
        .case-page, .case-page * { box-sizing: border-box; }
        .case-page { width:100%; min-width:0; color:#9298a5; }
        .case-error { padding:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid #373d49; border-radius:6px; background:#1b2029; }
        .case-header { display:flex; align-items:flex-start; gap:24px; padding:24px 0 32px; }
        .case-header-main { display:flex; align-items:center; gap:24px; flex:1; min-width:0; }
        .case-hero-img { width:208px; height:164px; flex-shrink:0; object-fit:contain; filter:drop-shadow(0 12px 16px #0005); }
        .case-header-info { display:flex; flex-direction:column; gap:20px; min-width:0; }
        .case-title-row, .case-header-controls, .case-toolbar, .toolbar-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .case-title { font-size:16px; line-height:1.35; color:#fff; margin:0 4px 0 0; }
        .risk-tag { border:1px solid; border-radius:3px; padding:4px 8px; font-size:11px; font-weight:700; }
        button, .back-btn { font-family:inherit; font-size:12px; font-weight:700; }
        button { cursor:pointer; }
        button:disabled { cursor:not-allowed; opacity:.5; }
        button:focus-visible, .back-btn:focus-visible { outline:2px solid #1fd65f; outline-offset:3px; }
        .amount-group { display:flex; gap:2px; margin-right:8px; border-radius:4px; overflow:hidden; }
        .amt-btn { width:40px; height:40px; border:0; border-radius:0; background:#20232c; color:#9298a5; }
        .amt-btn.active { color:#1fd65f; background:#252e2b; }
        .demo-btn, .back-btn, .action-btn, .preview-btn { height:40px; padding:0 18px; border:1px solid #252933; border-radius:4px; background:#20232c; color:#9298a5; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; }
        .back-btn { flex-shrink:0; }
        .open-btn { min-width:250px; height:40px; padding:0 22px; display:flex; align-items:center; justify-content:center; gap:6px; border:0; border-radius:4px; background:#1fd65f; color:#07140c; }
        .open-btn:hover:not(:disabled) { background:#32e872; }
        .case-toolbar { gap:8px; }
        .fast-toggle { height:40px; display:inline-flex; align-items:center; gap:8px; padding:0 12px; border:2px solid #262a34; border-radius:4px; background:#11141b; color:#9298a5; }
        .fast-toggle[aria-pressed=true] { color:#1fd65f; border-color:#1fd65f70; background:#1fd65f0d; }
        .cosmic-icon { display:inline-flex; width:24px; height:24px; flex-shrink:0; }
        .preview-btn { width:40px; padding:0; }
        .spinner-section { width:100%; overflow:hidden; background:#181b22; border:1px solid #20242c; border-radius:7px; }
        .spinner-track { min-height:280px; padding:64px 16px; display:flex; align-items:center; overflow:hidden; }
        .spinner-grid, .reel-column { display:contents; }
        .spinner-track:not(.amount-1) { justify-content:center; padding:0 24px; }
        .spinner-track:not(.amount-1) .spinner-grid { width:100%; max-width:calc(${amount()} * 142px - 12px); display:grid; grid-template-columns:repeat(${amount()}, minmax(0, 1fr)); gap:12px; }
        .spinner-track:not(.amount-1) .reel-column { display:block; position:relative; min-width:0; }
        .spinner-track:not(.amount-1) .reel-column:first-child::before,
        .spinner-track:not(.amount-1) .reel-column:last-child::after {
          content:''; position:absolute; top:50%; width:2px; height:8px; transform:translateY(-50%);
          background:#1fd65f; box-shadow:0 0 4px #1fd65f,0 0 10px rgba(31,214,95,.4); z-index:6; pointer-events:none;
        }
        .reel-column::before { left:-10px; } .reel-column::after { right:-10px; }
        @media(max-width:700px) {
          .spinner-track:not(.amount-1) .reel-column:nth-child(3n+1)::before,
          .spinner-track:not(.amount-1) .reel-column:nth-child(3n)::after {
            content:''; position:absolute; top:50%; width:2px; height:8px; transform:translateY(-50%);
            background:#1fd65f; box-shadow:0 0 4px #1fd65f,0 0 10px rgba(31,214,95,.4); z-index:6; pointer-events:none;
          }
        }
        .spinner-loader { min-height:280px; display:grid; place-items:center; }
        .items-section { margin-top:26px; }
        .items-label { display:flex; align-items:center; gap:8px; font-size:13px; color:#e0e4ec; padding-bottom:14px; border-bottom:1px solid #242831; }
        .items-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; }
        .open-loader-row { display:flex; align-items:center; gap:8px; }
        .open-loader { width:14px; height:14px; border:2px solid #07140c40; border-top-color:#07140c; border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media(max-width:1100px) { .case-hero-img { width:150px; height:150px; } .case-header-main { gap:16px; } .open-btn { min-width:190px; } .case-header { gap:12px; } }
        @media(max-width:700px) { .case-header { position:relative; padding-top:20px; } .case-header-main { display:grid; grid-template-columns:100px minmax(0,1fr); width:100%; } .case-hero-img { width:100px; height:100px; grid-column:1; grid-row:1; } .case-header-info { display:contents; } .case-title-row { grid-column:2; padding-right:45px; } .case-header-controls,.case-toolbar { grid-column:1/-1; } .back-btn { position:absolute; right:0; top:20px; padding:0 8px; font-size:10px; } .amt-btn { width:34px; } .amount-group { margin-right:0; } .demo-btn { padding:0 12px; } .open-btn { width:100%; } .spinner-track { min-height:240px; padding:44px 0; } .spinner-track:not(.amount-1) .spinner-grid { grid-template-columns:repeat(${Math.min(amount(),3)},minmax(0,1fr)); } .items-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      `}</style>
    </>
  );
}

export default CasePage;
