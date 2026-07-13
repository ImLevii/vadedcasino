import { createEffect, onMount, Show, For } from 'solid-js';
import { A } from '@solidjs/router';
import CrashScene from './crashscene';

function CrashGraph(props) {
  let canvasRef;
  let containerRef;

  // Auto-scaling max for the right-side multiplier axis
  const axisStep = (max) => (max <= 5 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : 10);

  const axisMax = () => {
    const m = props.multiplier || 1;
    const target = Math.max(2, m * 1.4);
    const step = axisStep(target);
    return Math.ceil(target / step) * step;
  };

  const axisTicks = () => {
    const max = axisMax();
    const step = axisStep(max);
    const ticks = [];
    for (let v = 0; v <= max + 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
  };

  onMount(() => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
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
            <img src='/assets/icons/coin.svg' height='12' width='12' alt='' />
            <span class='amount'>{(props.maxPayout / 1000).toFixed(2)}K</span>
          </div>
        </div>

        <div class='graph-center'>
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
                {props.isCrashed ? 'CRASHED' : 'CURRENT PAYOUT'}
              </p>
              <p class={'multiplier-value ' + (props.isCrashed ? 'crashed' : '')}>
                {props.multiplier.toFixed(2)}x
              </p>
              <Show when={props.profit > 0 && !props.isCrashed}>
                <div class='profit-pill'>
                  <img src='/assets/icons/coin.svg' height='12' width='12' alt='' />
                  +{props.profit.toFixed(4)}
                </div>
              </Show>
            </div>
          </Show>
        </div>

        <div class='graph-canvas'>
          <CrashScene
            multiplier={props.multiplier}
            isFlying={props.isFlying}
            isCrashed={props.isCrashed}
            countdown={props.countdown}
            axisMax={axisMax()}
            bets={props.bets}
          />
        </div>

        <div class='y-axis'>
          <For each={axisTicks()}>{(v) => (
            <div class='tick' style={{ bottom: `${(v / axisMax()) * 100}%` }}>
              <span class='tick-label'>{v.toFixed(2)}x</span>
              <span class='tick-mark' />
            </div>
          )}</For>
        </div>
      </div>

      <style jsx>{`
        .crash-graph {
          flex: 1;
          background: radial-gradient(circle at 50% 50%, #0d1420 0%, #0a0e16 100%);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
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
          color: #c3cad6;
        }

        .max-payout {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8b92a0;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 600;
        }

        .max-payout .amount {
          color: #1fd65f;
          font-weight: 700;
        }

        .graph-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
          text-align: center;
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
          font-size: 14px;
          font-weight: 600;
          color: #8b92a0;
          text-transform: uppercase;
        }

        .multiplier-value {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 76px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 1px;
          background: linear-gradient(180deg, #ffffff 0%, #dff6e8 38%, #86b79b 52%, #ffffff 58%, #bfe6cf 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.5)) drop-shadow(0 0 22px rgba(31,214,95,0.45));
        }

        .multiplier-value.crashed {
          background: linear-gradient(180deg, #ffffff 0%, #ffd9d4 40%, #b9756e 54%, #ffffff 60%, #f0b7b0 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.5)) drop-shadow(0 0 22px rgba(255,81,65,0.5));
          animation: crash-flash 0.5s;
        }

        .profit-pill {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          background: rgba(31, 214, 95, 0.15);
          border: 1px solid rgba(31, 214, 95, 0.4);
          color: #1fd65f;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 14px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .y-axis {
          position: absolute;
          top: 52px;
          right: 0;
          height: calc(100% - 62px);
          width: 66px;
          z-index: 2;
          pointer-events: none;
        }

        .tick {
          position: absolute;
          right: 8px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          width: 100%;
          transform: translateY(50%);
        }

        .tick-label {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .tick-mark {
          width: 6px;
          height: 1px;
          background: rgba(255,255,255,0.25);
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
          .multiplier-value {
            font-size: 56px;
          }

          .countdown-value {
            font-size: 42px;
          }
        }
      `}</style>
    </>
  );
}

export default CrashGraph;

/*
        //Calculate X Axis
        let milisecondsSeparation = stepValues(values.xAxisValue);
        let XAxisValuesSeparation = values.plotWidth / (values.xAxisValue/milisecondsSeparation);

        //Draw X Axis Values
        for(var miliseconds = 0, counter = 0, i = 0; miliseconds < values.xAxisValue; miliseconds+=milisecondsSeparation, counter++, i++) {
            let seconds = miliseconds/1000;
            let textWidth = ctx.measureText(seconds).width;
            let x = (counter*XAxisValuesSeparation) + values.xStart
            ctx.fillText(seconds + 's', x - textWidth/2, values.plotHeight + 11);

            if(i > 100) break
        }

        //Draw background Axis
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, values.canvasHeight);
        ctx.lineTo(0, values.canvasHeight);
        ctx.stroke();
    }

    function clearGraph(ctx) {
        ctx.clearRect(0, 0, graphRef?.width, graphRef?.height);
    }

    return (
        <>
            <div ref={canvasRef} class='canvas'>
                <canvas ref={graphRef}></canvas>
            </div>

            <style jsx>{`
              .canvas {
                top: 0;
                left: 0;
                z-index: 1;
                position: absolute;
                display: flex;
                height: 100%;
                width: 100%;
              }
            `}</style>
        </>
    )
}

export default Graph;
*/