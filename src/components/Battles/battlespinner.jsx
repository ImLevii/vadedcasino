import {authedAPI, getRandomNumber} from "../../util/api"
import {createEffect, createSignal, Index, onCleanup} from "solid-js"
import BattleSpinnerItem from "./battlespinneritem"
import {generateRandomItems, generateRareItems, getRareItems, isRareItem, maskRareItems} from "../../resources/cases"
import Avatar from "../Level/avatar"
import Level from "../Level/level"
import Countup from "../Countup/countup"
import {useNavigate} from "@solidjs/router"
import Chance from 'chance'
import SpinnerDecoration from "./spinnerdecoration";
import SpinnerDiamond from "./spinnerdiamond";

function BattleSpinner(props) {

  let spinner
  let bar

  const [items, setItems] = createSignal([])
  const [color, setColor] = createSignal('')
  const navigate = useNavigate()
  let cosmicTimer

  function adjacentTeamIsWinner() {
    if (props?.state !== 'WINNERS') return
    return props?.winnerTeam >= props?.index - 1 && props?.winnerTeam < props?.index + 1
  }

  createEffect(() => {
    if (!props?.player) return setColor('')
    if (props.state === 'WAITING' || props?.state === 'EOS') return setColor('gold')
    if (props?.state === 'WINNERS' && props?.team === props?.winnerTeam) return setColor('green')
    if (props?.state === 'WINNERS' && props?.team !== props?.winnerTeam) return setColor('red')
    return setColor('')
  })

  createEffect(() => {
    if (props?.round && props?.state === 'ROLLING') {
      let chanceObj = new Chance(props?.battle?.id + '-' + props?.index)

      let currentRound = props?.rounds[props?.round - 1]
      if (!currentRound) return

      let battleCase = props?.battle?.cases?.find(c => c.id === currentRound.caseId)
      let caseItems = battleCase?.items
      let spinnerItems = generateRandomItems(caseItems, chanceObj)

      let winningId = currentRound?.items[props?.index].itemId
      let winningItem = caseItems?.find(item => winningId === item.id)
      spinnerItems[50] = winningItem

      // Cosmic Spin - rare items (including a rare win) show as the Cosmic logo
      const cosmic = !!props?.battle?.cosmicSpin && getRareItems(caseItems, battleCase?.price).length > 0
      if (cosmic) spinnerItems = maskRareItems(spinnerItems, battleCase?.price)

      setItems([...spinnerItems])
      scheduleAnimation()

      if (cosmic && isRareItem(winningItem, battleCase?.price)) {
        // Exclusive second spin featuring only rare items
        clearTimeout(cosmicTimer)
        cosmicTimer = setTimeout(() => {
          let rareReel = generateRareItems(caseItems, battleCase?.price, chanceObj)
          rareReel[50] = winningItem
          setItems([...rareReel])
          scheduleAnimation(true)
        }, 5300)
      }
    }
  })

  onCleanup(() => clearTimeout(cosmicTimer))

  function scheduleAnimation(secondPhase = false) {
    requestAnimationFrame(() => requestAnimationFrame(() => animate(secondPhase)))
  }

  function animate(secondPhase = false) {
    if (!spinner) return

    let chanceObj = new Chance(props?.battle?.id + '-' + props?.round + (secondPhase ? '-cosmic' : ''))
    const winnerItem = spinner.children[50]
    const startItem = spinner.children[1]
    const viewport = spinner.parentElement
    if (!winnerItem || !startItem || !viewport) return

    const center = viewport.clientHeight / 2
    const startPosition = Math.max(0, startItem.offsetTop + (startItem.offsetHeight / 2) - center)
    const landingOffset = getRandomNumber(-36, 36, chanceObj)
    const endPosition = winnerItem.offsetTop + (winnerItem.offsetHeight / 2) - center + landingOffset
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reducedMotion ? 1 : 5000

    spinner.getAnimations().forEach((anim) => {
      anim.cancel()
    })

    spinner.animate(
      [
        { transform: `translateY(-${startPosition}px)` },
        { transform: `translateY(-${endPosition}px)` }
      ],
      {
        duration,
        easing: 'cubic-bezier(.08,.72,.16,1)',
        fill: 'forwards'
      }
    )

    if (!secondPhase) {
      bar.getAnimations().forEach((anim) => {
        anim.cancel()
      })

      let color = 'linear-gradient(90deg, rgba(249, 81, 81, 0.00) 0%, #F95151 100%)'
      if (props?.roundWinners?.includes(props?.team))
        color = 'linear-gradient(90deg, rgba(31, 214, 95, 0.00) 0%, #1fd65f 100%)'

      bar.animate(
        {
          background: [color, color, color],
          width: [`0`, '100%', '100%'],
          easing: ['ease', 'ease-out', 'ease-out'],
          offset: [0, 0.7, 1]
        },
        {
          delay: reducedMotion ? 0 : props?.battle?.cosmicSpin ? 10500 : 5000,
          duration: reducedMotion ? 1 : 1200,
          fill: 'forwards',
        }
      )
    }
  }

  async function recreateBattle() {
    let res = await authedAPI('/battles/create', 'POST', JSON.stringify({
      cases: props?.battle?.rounds?.map(r => r?.caseId),
      teams: props?.battle?.teams,
      playersPerTeam: props?.battle?.playersPerTeam,
      gamemode: props?.battle?.gamemode,
      cosmicSpin: !!props?.battle?.cosmicSpin,
      funding: props?.creator ? props?.battle?.ownerFunding || 0 : 0,
      minLvl: props?.creator ? props?.battle?.minLevel || 0 : 0,
      isPrivate: props?.creator ? !!props?.battle?.privKey : false,
    }), true)

    if (res.success) {
      let link = `/battle/${res?.battleId}`
      if (res?.privKey) {
        link += `?pk=${res?.privKey}`
      }
      navigate(link)
    }
  }

  async function joinBattle() {
    if (props?.creator) {
      return await authedAPI(`/battles/${props?.battle?.id}/bot`, 'POST', JSON.stringify({
        slot: props.index + 1,
        privKey: props?.battle?.privKey
      }), true)
    }

    await authedAPI(`/battles/${props?.battle?.id}/join`, 'POST', JSON.stringify({
      slot: props.index + 1,
      privKey: props?.battle?.privKey
    }), true)
  }

  return (
    <>
      <div class={'spinner ' + (color())}>

        {props?.state === 'WINNERS' ? (
          <div class='spinner-content user-summary'>
            {color() === 'green' && (
              <div class='winner'>
                <p>WINNER</p>
              </div>
            )}

            <div class='avatar'>
              <Avatar id={props?.player?.id} xp={props?.player?.xp} height='50'/>

              {color() === 'green' && (
                <img class='crown' src='/assets/icons/crown.svg' height='31' width='50'/>
              )}
            </div>

            <div class='username'>
              <p>{props?.player?.username}</p>
              <Level xp={props?.player?.xp}/>
            </div>

            <div class='cost'>
              <img src='/assets/chips/chip-green.png' height='18' width='18' alt=''/>
              <p>
                <Countup end={color() === 'green' ? props?.total : 0} duration={1000} steps={30} gray={true}/>
              </p>
            </div>

            {color() === 'green' && (
              <button class='bevel-gold recreate' onClick={() => recreateBattle()}>RE-CREATE BATTLE</button>
            )}
          </div>
        ) : props?.player && props?.state === 'ROLLING' ? (
          <div class='spinner-column'>
            <div class='battle-arrow battle-arrow-left'/>
            <div class='battle-arrow battle-arrow-right'/>
            <div class='center-band'/>
            <div class='center-line'/>
            <div class='fade-top'/>
            <div class='fade-bottom'/>
            <div class='spinner-items' ref={spinner}>
              <Index each={items()}>{(item, index) => (
                <BattleSpinnerItem
                  img={item()?.img}
                  price={item()?.price}
                  index={index}
                />
              )}</Index>
            </div>
          </div>
        ) : props?.player ? (
          <div class='ready'>
            <img src='/assets/icons/logoswords.svg'/>
            <p>READY</p>
          </div>
        ) : (
          <div class='spinner-content waiting'>
            <img src='/assets/icons/waiting.png' height='50' width='50'/>
            <p>WAITING</p>
            <button class='bevel-gold call' onClick={() => joinBattle()}>{props?.creator ? 'CALL BOT' : 'JOIN BATTLE'}</button>
          </div>
        )}

        <SpinnerDecoration type={props?.index === 0 ? 'right-dec' : 'left-dec'} color={color()}/>

        {props?.index !== 0 && props?.index < props?.max && (
          <SpinnerDecoration type='right-dec' color={color()}/>
        )}

        <SpinnerDiamond
          index={props?.index}
          teams={props?.battle?.teams}
          startOfTeam={props?.startOfTeam}
          team={props?.team}
          gamemode={props?.battle?.gamemode}
          adjacentTeamIsWinner={adjacentTeamIsWinner()}
        />

        <div class='bar' ref={bar}/>
      </div>

      <style jsx>{`
        .spinner {
          flex: 1;
          height: 375px;
          position: relative;
          z-index: 0;

          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          overflow: hidden;

          background: radial-gradient(86% 90% at 50% 50%, rgba(31, 214, 95, 0.038), rgba(8, 10, 16, 0) 50%), linear-gradient(180deg, #0a0d14, #06080e);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 12px 30px rgba(0, 0, 0, 0.26);
        }

        .spinner.gold:before {
          position: absolute;
          top: 0;
          left: 0;
          content: '';
          width: 100%;
          height: 100%;
          opacity: 0.15;
          border-radius: 10px;
          background-image: url("/assets/icons/battlestripes.png");
        }

        .spinner.green {
          background: radial-gradient(92% 95% at 50.00% 100.00%, rgba(31, 214, 95, 0.24) 0%, rgba(0, 0, 0, 0.00) 70%), linear-gradient(180deg, #0a0d14, #06080e);
          border-color: rgba(31, 214, 95, 0.3);
          border-bottom: 2px solid #1fd65f;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 28px rgba(31, 214, 95, 0.2), 0 12px 30px rgba(0, 0, 0, 0.28);
        }

        .spinner.red {
          background: radial-gradient(92% 95% at 50.00% 100.00%, rgba(249, 81, 81, 0.18) 0%, rgba(0, 0, 0, 0.00) 70%), linear-gradient(180deg, #0a0d14, #06080e);
          border-color: rgba(249, 81, 81, 0.2);
          border-bottom: 2px solid #F95151;
        }

        .gold {
          background: radial-gradient(92% 95% at 50.00% 100.00%, rgba(255, 184, 74, 0.16) 0%, rgba(0, 0, 0, 0.00) 70%), linear-gradient(180deg, #0a0d14, #06080e);
          border-color: rgba(255, 184, 74, 0.16);
        }

        .ready {
          display: none;
        }

        .gold .ready {
          display: block;
          text-align: center;
          color: white;
          font-weight: 700;
        }

        .spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;

          color: #9296D6;
          font-size: 18px;
          font-weight: 700;

          position: relative;

          width: 100%;
          height: 100%;
        }

        .waiting img {
          animation: infinite spin 3s ease-in-out;
          filter: drop-shadow(0 0 14px rgba(31,214,95,.24));
        }

        .user-summary {
          gap: 12px;
          animation: revealResult .48s cubic-bezier(.2,.8,.2,1) both;
        }

        .cost {
          min-width: 135px;
          height: 30px;
          font-variant-numeric: tabular-nums;
        }

        .winner {
          position: absolute;
          top: 20px;
          left: 20px;

          color: #1fd65f;
          font-size: 16px;
          font-weight: 700;

          background: conic-gradient(from 180deg at 50% 50%, #1fd65f -0.3deg, #459D7B 72.1deg, #407B64 139.9deg, #407C64 180.52deg, #37545C 215.31deg, #3B5964 288.37deg, #1fd65f 359.62deg, #1fd65f 359.7deg, #459D7B 432.1deg);
          z-index: 0;

          width: 90px;
          height: 30px;
          border-radius: 3px;

          text-align: center;
          line-height: 30px;
        }

        .winner::after {
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          border-radius: 3px;

          top: 1px;
          left: 1px;

          content: '';
          position: absolute;

          background: linear-gradient(0deg, rgba(31, 214, 95, 0.25), rgba(31, 214, 95, 0.25)), linear-gradient(252.77deg, #12151c -27.53%, #1f242e 175.86%);
          z-index: -1;
        }

        .username {
          color: #FFF;
          font-size: 16px;
          font-weight: 700;

          display: flex;
          gap: 6px;
        }

        .avatar {
          position: relative;
        }

        .crown {
          position: absolute;
          top: -26px;
        }

        .red .username, .red .avatar {
          filter: grayscale(1);
        }

        .red .username {
          opacity: 0.5;
        }

        .red .cost {
          background: linear-gradient(rgba(147, 62, 62, 1), rgba(147, 62, 62, 0.61), rgba(147, 62, 62, 0.49), rgba(147, 62, 62, 0.61), rgba(147, 62, 62, 1), rgba(249, 81, 81, 1));
          position: relative;
          z-index: 0;
        }

        .red .cost:before {
          position: absolute;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          content: '';
          left: 1px;
          top: 1px;
          background: linear-gradient(0deg, rgba(249, 81, 81, 0.25) 0%, rgba(249, 81, 81, 0.25) 100%), linear-gradient(230deg, #12151c 0%, #1f242e 100%);
          z-index: -1;
        }

        .call {
          width: 147px;
          height: 34px;
        }

        .call, .recreate {
          border: 0;
          border-radius: 7px;
          background: #1fd65f;
          color: #052310;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .call:hover, .recreate:hover {
          transform: translateY(-1px);
          background: #43e37b;
          box-shadow: 0 8px 22px rgba(31,214,95,.25);
        }

        .spinner-column {
          max-width: 260px;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 0;

          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          overflow: hidden;
          background: radial-gradient(90% 52% at 50% 50%, rgba(31, 214, 95, 0.045), rgba(31, 214, 95, 0) 62%);
        }

        .spinner-column:before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.045), rgba(255,255,255,0));
          opacity: 0.45;
        }

        .center-band {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 104px;
          transform: translateY(-52px);
          pointer-events: none;
          z-index: 1;
          background: linear-gradient(180deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.11), rgba(31, 214, 95, 0));
          box-shadow: inset 0 1px 0 rgba(31, 214, 95, 0.1), inset 0 -1px 0 rgba(31, 214, 95, 0.1), 0 0 52px rgba(31, 214, 95, 0.14);
          animation: battleCenterGlow 2.8s ease-in-out infinite;
        }

        .center-line {
          position: absolute;
          left: 12px;
          right: 12px;
          top: 50%;
          height: 2px;
          transform: translateY(-1px);
          z-index: 4;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(31, 214, 95, 0.32) 12%, #1fd65f 42%, #1fd65f 58%, rgba(31, 214, 95, 0.32) 88%, transparent);
          box-shadow: 0 0 14px rgba(31, 214, 95, 0.75), 0 0 30px rgba(31, 214, 95, 0.26);
        }

        .battle-arrow {
          position: absolute;
          top: 50%;
          width: 0;
          height: 0;
          z-index: 5;
          pointer-events: none;
          filter: drop-shadow(0 0 12px rgba(31, 214, 95, 0.85));
        }

        .battle-arrow-left {
          left: 7px;
          transform: translateY(-50%);
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 11px solid #1fd65f;
        }

        .battle-arrow-right {
          right: 7px;
          transform: translateY(-50%);
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-right: 11px solid #1fd65f;
        }

        .fade-top, .fade-bottom {
          position: absolute;
          left: 0;
          width: 100%;
          height: 26%;
          z-index: 3;
          pointer-events: none;
        }

        .fade-top {
          top: 0;
          background: linear-gradient(180deg, #06080e 0%, rgba(6, 8, 14, 0.82) 38%, transparent 100%);
        }

        .fade-bottom {
          bottom: 0;
          background: linear-gradient(0deg, #06080e 0%, rgba(6, 8, 14, 0.82) 38%, transparent 100%);
        }

        .bar {
          position: absolute;
          width: calc(100% - 8px);
          height: 2px;
          bottom: 0;
          overflow: hidden;
          border-radius: 2525px;
          left: 0;
        }

        .spinner-items {
          height: 100%;

          display: flex;
          flex-direction: column;
          gap: 24px;

          position: absolute;
          top: 0px;
          z-index: 2;
        }

        @keyframes battleCenterGlow {
          0%, 100% {
            opacity: .82;
            box-shadow: inset 0 1px 0 rgba(31, 214, 95, 0.1), inset 0 -1px 0 rgba(31, 214, 95, 0.1), 0 0 42px rgba(31, 214, 95, 0.12);
          }
          50% {
            opacity: 1;
            box-shadow: inset 0 1px 0 rgba(31, 214, 95, 0.18), inset 0 -1px 0 rgba(31, 214, 95, 0.18), 0 0 60px rgba(31, 214, 95, 0.2);
          }
        }

        @keyframes revealResult {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .recreate {
          max-width: 165px;
          width: 100%;
          height: 35px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          90% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media only screen and (max-width: 1040px) {
          .spinner {
            width: 100%;
            min-height: 375px;
            height: 375px;
          }
        }

        @media only screen and (max-width: 620px) {
          .spinner, .spinner-column {
            min-height: 340px;
            height: 340px;
          }

          .spinner-column { max-width: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .center-band, .waiting img, .user-summary {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

export default BattleSpinner;
