import { createEffect, onCleanup, onMount, Show } from 'solid-js';
import { A } from '@solidjs/router';
import Rocket3D from './rocket3d';

function CrashGraph(props) {
  let canvasRef;
  let containerRef;

  onMount(() => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  });

  onCleanup(() => {
    window.removeEventListener('resize', resizeCanvas);
  });

  function resizeCanvas() {
    if (!canvasRef || !containerRef) return;
    canvasRef.width = containerRef.clientWidth;
    canvasRef.height = containerRef.clientHeight;
    drawGraph();
  }

  createEffect(() => {
    if (props.multiplier || props.isFlying || props.isCrashed) {
      drawGraph();
    }
  });

  function drawGraph() {
    if (!canvasRef) return;
    
    const ctx = canvasRef.getContext('2d');
    const width = canvasRef.width;
    const height = canvasRef.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (!props.isFlying && !props.isCrashed) return;

    const multi = props.multiplier || 1.00;
    const maxTime = Math.max(10000, getTimeFromMultiplier(multi) * 1.2);
    const maxMulti = Math.max(2.0, multi * 1.2);

    // Draw axes
    drawAxes(ctx, width, height, maxMulti, maxTime);

    // Draw graph line
    drawLine(ctx, width, height, multi, maxMulti, maxTime);
  }

  function getTimeFromMultiplier(multi) {
    // Inverse of: multi = e^(0.00006 * time)
    return Math.log(multi) / 0.00006;
  }

  function drawAxes(ctx, width, height, maxMulti, maxTime) {
    const padding = 60;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.font = '12px Geogrotesque Wide';
    ctx.fillStyle = '#8b92a0';

    // Y-axis ticks (multipliers)
    const yStep = maxMulti > 5 ? 1 : 0.5;
    for (let m = 1; m < maxMulti; m += yStep) {
      const y = height - padding - ((m - 1) / (maxMulti - 1)) * graphHeight;
      
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      ctx.fillText(`${m.toFixed(2)}x`, width - padding + 10, y + 4);
    }

    // X-axis ticks (time)
    const xStep = 2000; // 2 seconds
    for (let t = xStep; t < maxTime; t += xStep) {
      const x = padding + (t / maxTime) * graphWidth;
      
      ctx.fillText(`${(t / 1000).toFixed(0)}s`, x - 10, height - padding + 20);
    }

    ctx.setLineDash([]);
  }

  function drawLine(ctx, width, height, currentMulti, maxMulti, maxTime) {
    const padding = 60;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const currentTime = getTimeFromMultiplier(currentMulti);

    ctx.strokeStyle = props.isCrashed ? '#ff5141' : '#1fd65f';
    ctx.lineWidth = 3;
    ctx.shadowBlur = props.isCrashed ? 0 : 15;
    ctx.shadowColor = props.isCrashed ? 'transparent' : '#1fd65f';

    ctx.beginPath();

    for (let m = 1.00; m <= currentMulti; m += 0.01) {
      const t = getTimeFromMultiplier(m);
      const x = padding + (t / maxTime) * graphWidth;
      const y = height - padding - ((m - 1) / (maxMulti - 1)) * graphHeight;
      
      if (m === 1.00) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw current point
    if (!props.isCrashed) {
      const x = padding + (currentTime / maxTime) * graphWidth;
      const y = height - padding - ((currentMulti - 1) / (maxMulti - 1)) * graphHeight;
      
      ctx.fillStyle = '#1fd65f';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(31, 214, 95, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return (
    <>
      <div class='crash-graph' ref={containerRef}>
        <div class='graph-header'>
          <A href='/docs/provably' class='fairness-link'>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Game Fairness</span>
          </A>

          <div class='max-payout'>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span>Max Payout</span>
            <img src='/assets/chips/chip-green.png' height='14' width='14' alt='' />
            <span class='amount'>{(props.maxPayout / 1000).toFixed(2)}K</span>
          </div>
        </div>

        <div class='graph-center' classList={{ waiting: !props.isFlying && !props.isCrashed }}>
          <Show 
            when={props.isFlying || props.isCrashed}
            fallback={
              <div class='countdown-display'>
                <p class='countdown-label'>Starting in</p>
                <p class='countdown-value'>{(props.countdown / 1000).toFixed(1)}s</p>
              </div>
            }
          >
            <div class='multiplier-display'>
              <p class='current-label'>
                {props.isCrashed ? `CRASHED @ ${props.multiplier.toFixed(2)}x` : 'Current Payout'}
              </p>
              <p
                class={'multiplier-value ' + (props.isCrashed ? 'crashed' : '')}
                style={props.isFlying && !props.isCrashed ? {
                  color: props.multiplier >= 10 ? '#f5c842'
                    : props.multiplier >= 5 ? '#00d2b4'
                    : props.multiplier >= 2 ? '#1fd65f'
                    : '#1fd65f',
                  'text-shadow': props.multiplier >= 10
                    ? '0 0 32px rgba(245,200,66,0.6)'
                    : props.multiplier >= 5
                    ? '0 0 28px rgba(0,210,180,0.5)'
                    : '0 0 26px rgba(31,214,95,0.46)',
                } : {}}
              >
                {props.multiplier.toFixed(2)}x
              </p>
            </div>
          </Show>
        </div>

        <div class='graph-canvas'>
          <Rocket3D
            multiplier={props.multiplier}
            isFlying={props.isFlying}
            isCrashed={props.isCrashed}
            countdown={props.countdown}
          />
        </div>
      </div>

      <style jsx>{`
        .crash-graph {
          flex: 1;
          min-width: 0;
          min-height: 560px;
          background: radial-gradient(70% 70% at 50% 55%, rgba(22,61,45,.24), transparent 64%), linear-gradient(180deg, #090e16, #070a10);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 14px 36px rgba(0,0,0,.22);
        }

        .crash-graph::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 85%);
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          position: relative;
          z-index: 2;
        }

        .fairness-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8b92a0;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .fairness-link:hover {
          color: #1fd65f;
        }

        .max-payout {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8b92a0;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 7px 9px;
          border: 1px solid rgba(255,255,255,.05);
          border-radius: 6px;
          background: rgba(5,8,12,.46);
        }

        .max-payout .amount {
          color: #1fd65f;
          font-weight: 700;
        }

        .graph-center {
          position: absolute;
          top: 82px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          text-align: center;
        }

        .graph-center.waiting {
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .countdown-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .countdown-label {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #8b92a0;
          text-transform: uppercase;
        }

        .countdown-value {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 56px;
          font-weight: 700;
          color: #1fd65f;
          text-shadow: 0px 0px 20px rgba(31, 214, 95, 0.5);
        }

        .multiplier-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .current-label {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #8b92a0;
          text-transform: uppercase;
        }

        .multiplier-value {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 58px;
          font-weight: 700;
          color: #1fd65f;
          text-shadow: 0 0 26px rgba(31, 214, 95, 0.46);
          line-height: 1;
          transition: color .18s ease, text-shadow .18s ease, transform .18s ease;
        }

        .multiplier-value.crashed {
          color: #ff5141;
          text-shadow: 0px 0px 30px rgba(255, 81, 65, 0.6);
          animation: crash-flash 0.5s;
        }

        @keyframes crash-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .graph-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .crash-graph {
            min-height: 500px;
          }

          .graph-header {
            padding: 12px;
          }

          .multiplier-value {
            font-size: 48px;
          }

          .countdown-value {
            font-size: 42px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .multiplier-value.crashed {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

export default CrashGraph;
