import {createEffect, createSignal} from "solid-js";
import {authedAPI} from "../../util/api";
import {playGameSFX} from "../../util/sound";

function Tile(props) {

    const [isProcessing, setIsProcessing] = createSignal(false)
    const [animate, setAnimate] = createSignal(null)

    createEffect(() => {
      if (animate() && !props?.game?.active) {
            setAnimate(false)
        }

        if (props?.game?.active && props?.random === props?.index && !isProcessing()) {
            clickTile(props?.index)
        }
    })

    async function clickTile(tile) {
        if (!props?.game || !props?.game.active || isProcessing() || props?.revealed.includes(tile)) return
        setIsProcessing(true)
        setAnimate(true)
        const animationStartedAt = Date.now()

        let res = await authedAPI('/mines/reveal', 'POST', JSON.stringify({ field: tile }) , true)
        if (!res.success) {
          setAnimate(false)
          return setIsProcessing(false)
        }

        const remainingAnimation = Math.max(0, 220 - (Date.now() - animationStartedAt))
        if (remainingAnimation) {
          await new Promise(resolve => setTimeout(resolve, remainingAnimation))
        }

        handleMineClick(res)
    }

    function handleMineClick(res) {
        try {
            if (res.payout) {
                props?.setRevealed([...props?.revealed, props?.index])
                return props?.cashoutGame(res)
            }

            if (!res.isMine) {
                props?.setRevealed(res.revealedTiles || [])
                props?.setGame({
                    ...props?.game,
                    multiplier: res.multiplier,
                    currentPayout: res.currentPayout,
                    active: true,
                })

                if (props?.revealed.length < 8) {
                  playGameSFX('mines-tile-early', '/assets/sfx/tile0.mp3', {
                    channel: 'mines-reveal', volume: 0.48, minIntervalMs: 50
                  })
                } else if (props?.revealed.length < 16) {
                  playGameSFX('mines-tile-mid', '/assets/sfx/tile1.mp3', {
                    channel: 'mines-reveal', volume: 0.5, minIntervalMs: 50
                  })
                } else {
                  playGameSFX('mines-tile-late', '/assets/sfx/tile2.mp3', {
                    channel: 'mines-reveal', volume: 0.52, minIntervalMs: 50
                  })
                }
            } else {
                props?.setGame({
                    ...props?.game,
                    active: false,
                })

                props?.setBombs(res.minePositions || [])
                props?.setRevealed(res.revealedTiles || [])

                playGameSFX('mines-bomb', '/assets/sfx/mine.mp3', {
                  channel: 'result-loss', volume: 0.62, fadeInMs: 30
                })
            }

            setAnimate(null)
            setIsProcessing(false)
        } catch (e) {
            console.error('ERROR WITH MINES ', e)

            return
        }
    }

    function getTileState(tile) {
        let classNames = ''

        if (props?.bombs.includes(tile)) classNames += ' bomb'
        if (props?.revealed.includes(tile)) classNames += ' active'

        if (classNames.includes('active') && !classNames.includes('bomb'))
            return ' gem active'

        if (classNames === '' && props?.game && !props?.game.active)
            return ' gem'

        return classNames
    }

    return (
        <>
            <button type='button'
                className={'mine' + getTileState(props?.index) + (animate() ? ' animate' : '')}
              style={{ '--tile-index': props?.index }}
              aria-label={props?.revealed.includes(props?.index) ? 'Revealed safe tile' : props?.bombs.includes(props?.index) ? 'Mine' : `Reveal tile ${props?.index + 1}`}
              disabled={!props?.game?.active || props?.revealed.includes(props?.index) || isProcessing()}
                onClick={() => clickTile(props?.index)}
            >
                <img src='/assets/icons/minesgem.png' className='popin gem-img' alt=''/>
                <img src='/assets/icons/greensparkles.png' className='popin green-sparkles' alt=''/>

                <img src='/assets/icons/bomb.png' className='popin bomb-img' alt=''/>
                <img src='/assets/icons/purplesparkles.png' className='popin purple-sparkles' alt=''/>
            </button>

            <style jsx>{`
              .mine {
                aspect-ratio: 1;
                width: 100%;
                padding: 0;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,.075);
                border-radius: 8px;
                background:
                  linear-gradient(145deg, rgba(45,55,70,.82), rgba(21,27,36,.96));
                box-shadow:
                  inset 2px 2px 0 rgba(255,255,255,.055),
                  inset -3px -3px 0 rgba(0,0,0,.28),
                  0 8px 18px rgba(0,0,0,.2);
                transition: background .2s, border-color .2s, transform .18s, box-shadow .2s;
                cursor: pointer;
                
                display: flex;
                align-items: center;
                justify-content: center;
                
                position: relative;
              }

              .mine::before {
                content: '';
                position: absolute;
                inset: 0;
                opacity: 0;
                background: radial-gradient(circle at 50% 40%, rgba(31,214,95,.12), transparent 68%);
                transition: opacity .2s;
              }
              
              .mine:not(:disabled):hover {
                z-index: 1;
                border-color: rgba(31,214,95,.28);
                background: linear-gradient(145deg, rgba(53,65,80,.9), rgba(23,30,39,.98));
                box-shadow: inset 2px 2px 0 rgba(255,255,255,.07), inset -3px -3px 0 rgba(0,0,0,.3), 0 12px 24px rgba(0,0,0,.3), 0 0 16px rgba(31,214,95,.045);
                transform: translateY(-2px);
              }

              .mine:not(:disabled):hover::before {
                opacity: 1;
              }

              .mine:focus-visible {
                outline: 2px solid var(--gold);
                outline-offset: 2px;
              }

              .mine:disabled {
                cursor: default;
              }
              
              .mine.animate {
                animation: tile-press .42s ease-in-out infinite;
              }
              
              .mine.gem:not(.active), .mine.bomb:not(.active) {
                opacity: 0.5;
              }
              
              .mine.gem {
                border: 1px solid #1fd65f;
                background: radial-gradient(120% 120% at 50% 45%, rgba(0,255,73,.32), transparent 62%), linear-gradient(145deg, rgba(11,57,31,.94), rgba(7,25,17,.98));
                box-shadow: inset 0 1px 0 rgba(135,255,173,.12), inset 0 0 28px rgba(10,182,47,.34), 0 8px 20px rgba(0,0,0,.22);
              }

              .mine.bomb {
                border: 1px solid rgba(255, 81, 65, 0.35);
                background: radial-gradient(120% 120% at 50% 45%, rgba(255,81,65,.3), transparent 62%), linear-gradient(145deg, rgba(61,28,31,.94), rgba(25,13,18,.98));
                box-shadow: inset 0 1px 0 rgba(255,171,163,.1), inset 0 0 28px rgba(255,81,65,.28), 0 8px 20px rgba(0,0,0,.22);
              }
              
              .popin {
                opacity: 0;
                transform: scale(0.7);
                transition: opacity .3s, transform .3s;

                position: absolute;
              }
              
              .gem-img {
                height: 100%;
              }

              .bomb-img {
                height: 75%;
              }
              
              .purple-sparkles {
                height: 100%;
              }
              
              .green-sparkles {
                width: 90%;
              }
              
              .gem .gem-img.popin, .gem .green-sparkles.popin, .bomb .bomb-img, .bomb .purple-sparkles.popin {
                opacity: 1;
                transform: scale(1);
                animation: reveal-pop .42s cubic-bezier(.2,.9,.25,1.2) both;
                animation-delay: calc(var(--tile-index) * 12ms);
              }

              @keyframes tile-press {
                0%, 100% { transform: scale(1); filter: brightness(1); }
                50% { transform: scale(.94); filter: brightness(1.16); }
              }

              @keyframes reveal-pop {
                from { opacity: 0; transform: scale(.55) rotate(-6deg); }
                to { opacity: 1; transform: scale(1) rotate(0); }
              }

              @media (prefers-reduced-motion: reduce) {
                .mine, .popin {
                  animation: none !important;
                  transition: none !important;
                }
              }
            `}</style>
        </>
    );
}

export default Tile;
