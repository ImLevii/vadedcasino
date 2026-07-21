import { createEffect, onCleanup, onMount, Show } from 'solid-js';
import GameFairnessButton from '../GameFairness/gamefairnessbutton';

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
    const dpr = window.devicePixelRatio || 1;
    canvasRef.width  = containerRef.clientWidth  * dpr;
    canvasRef.height = containerRef.clientHeight * dpr;
    canvasRef.style.width  = containerRef.clientWidth  + 'px';
    canvasRef.style.height = containerRef.clientHeight + 'px';
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
    const dpr = window.devicePixelRatio || 1;
    const width  = canvasRef.width;
    const height = canvasRef.height;

    ctx.clearRect(0, 0, width, height);

    if (!props.isFlying && !props.isCrashed) return;

    const multi    = props.multiplier || 1.00;
    const maxMulti = Math.max(2.0, multi * 1.25);
    const maxTime  = Math.max(10000, getTimeFromMultiplier(multi) * 1.25);

    // Padding: left side thin, right side wider for labels, bottom for time labels
    const padLeft   = 18 * dpr;
    const padRight  = 70 * dpr;
    const padTop    = 24 * dpr;
    const padBottom = 36 * dpr;
    const gW = width  - padLeft - padRight;
    const gH = height - padTop  - padBottom;

    // ── Grid lines ────────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth   = 1 * dpr;
    ctx.setLineDash([4 * dpr, 6 * dpr]);

    const yStep = maxMulti > 6 ? 1 : maxMulti > 3 ? 0.5 : 0.25;
    const steps = Math.ceil((maxMulti - 1) / yStep);

    for (let i = 0; i <= steps; i++) {
      const m = 1 + i * yStep;
      if (m > maxMulti) break;
      const y = padTop + gH - ((m - 1) / (maxMulti - 1)) * gH;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    // X-axis grid
    const xTickSec = maxTime > 20000 ? 5 : 2;
    const xTickMs  = xTickSec * 1000;
    for (let t = xTickMs; t < maxTime; t += xTickMs) {
      const x = padLeft + (t / maxTime) * gW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + gH);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Y-axis labels (right side) ────────────────────────────────────────────
    ctx.save();
    ctx.font      = `${Math.round(11 * dpr)}px "Geogrotesque Wide", "Inter", sans-serif`;
    ctx.textAlign = 'left';

    for (let i = 0; i <= steps; i++) {
      const m = 1 + i * yStep;
      if (m > maxMulti) break;
      const y = padTop + gH - ((m - 1) / (maxMulti - 1)) * gH;

      // Color label based on value
      if (m >= 10)       ctx.fillStyle = '#f5c842';
      else if (m >= 5)   ctx.fillStyle = '#00d2b4';
      else if (m >= 2)   ctx.fillStyle = '#1fd65f';
      else               ctx.fillStyle = 'rgba(255,255,255,0.38)';

      ctx.fillText(`${m.toFixed(2)}x`, width - padRight + 10 * dpr, y + 4 * dpr);
    }
    ctx.restore();

    // ── X-axis labels (bottom) ────────────────────────────────────────────────
    ctx.save();
    ctx.font      = `${Math.round(10 * dpr)}px "Geogrotesque Wide", "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.textAlign = 'center';

    for (let t = xTickMs; t < maxTime; t += xTickMs) {
      const x = padLeft + (t / maxTime) * gW;
      ctx.fillText(`${(t / 1000).toFixed(0)}s`, x, padTop + gH + 22 * dpr);
    }
    ctx.restore();

    // ── Graph line ────────────────────────────────────────────────────────────
    drawLine(ctx, width, height, padLeft, padRight, padTop, padBottom, gW, gH, multi, maxMulti, maxTime, dpr);
  }

  function getTimeFromMultiplier(m) {
    return Math.log(Math.max(1.001, m)) / 0.00006;
  }

  function multiplierToColor(m) {
    if (m >= 10) return { r: 245, g: 200, b: 66  };
    if (m >= 5)  return { r:   0, g: 210, b: 180 };
    if (m >= 2)  return { r:  31, g: 214, b: 95  };
    return           { r:  31, g: 214, b: 95  };
  }

  function drawLine(ctx, width, height, padLeft, padRight, padTop, padBottom, gW, gH, currentMulti, maxMulti, maxTime, dpr) {
    const isCrashed = props.isCrashed;
    const currentTime = getTimeFromMultiplier(currentMulti);

    // Build sample points
    const samples = 200;
    const points  = [];
    for (let s = 0; s <= samples; s++) {
      const m = 1 + (currentMulti - 1) * (s / samples);
      const t = getTimeFromMultiplier(m);
      const x = padLeft + (t / maxTime) * gW;
      const y = padTop  + gH - ((m - 1) / (maxMulti - 1)) * gH;
      points.push({ x, y, m });
    }

    if (points.length < 2) return;

    // Draw glowing line with gradient color based on current multiplier
    if (isCrashed) {
      // Crashed — solid red line, no glow
      ctx.save();
      ctx.strokeStyle = '#ff5141';
      ctx.lineWidth   = 3 * dpr;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    } else {
      // Flying — segmented gradient line (green → teal → gold based on multi)
      const segmentSize = Math.max(1, Math.floor(points.length / 40));

      ctx.save();
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap   = 'round';
      ctx.lineJoin  = 'round';

      for (let i = 0; i < points.length - 1; i += segmentSize) {
        const end = Math.min(i + segmentSize, points.length - 1);
        const midM = (points[i].m + points[end].m) / 2;
        const c = multiplierToColor(midM);
        ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
        ctx.shadowBlur  = 18 * dpr;
        ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.7)`;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        for (let j = i + 1; j <= end; j++) {
          ctx.lineTo(points[j].x, points[j].y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Glow trail under the line
      ctx.save();
      const gradX1 = points[0].x;
      const gradX2 = points[points.length - 1].x;
      const grad = ctx.createLinearGradient(gradX1, 0, gradX2, 0);

      grad.addColorStop(0,   'rgba(31,214,95,0.0)');
      grad.addColorStop(0.5, 'rgba(31,214,95,0.08)');
      grad.addColorStop(1,   'rgba(31,214,95,0.18)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padTop + gH);
      ctx.lineTo(points[0].x, padTop + gH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Current point dot
      const last = points[points.length - 1];
      const c    = multiplierToColor(currentMulti);

      ctx.save();
      ctx.shadowBlur  = 24 * dpr;
      ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.9)`;
      ctx.fillStyle   = `rgb(${c.r},${c.g},${c.b})`;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer ring
      ctx.save();
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.35)`;
      ctx.lineWidth   = 1.5 * dpr;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 10 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function getShipPosition() {
    const multi = Math.max(1, props.multiplier || 1);
    const maxMulti = Math.max(2.0, multi * 1.25);
    const maxTime = Math.max(10000, getTimeFromMultiplier(multi) * 1.25);
    const currentTime = getTimeFromMultiplier(multi);

    const padLeftPct = 3;
    const padRightPct = 8;
    const usableWidthPct = 100 - padLeftPct - padRightPct;

    const xRatio = Math.max(0, Math.min(1, currentTime / maxTime));
    const yRatio = Math.max(0, Math.min(1, (multi - 1) / (maxMulti - 1)));

    const left = padLeftPct + xRatio * usableWidthPct;
    const top = 90 - yRatio * 70;
    const tilt = -10 + (xRatio * 14);

    return {
      left: `${left.toFixed(3)}%`,
      top: `${top.toFixed(3)}%`,
      tilt: `${tilt.toFixed(2)}deg`
    };
  }

  const shipPosition = () => getShipPosition();

  return (
    <>
      <div class='crash-graph' ref={containerRef}>
        <canvas ref={canvasRef} class='graph-canvas-el' />

        <div class='graph-header'>
          <GameFairnessButton/>

          <div class='max-payout'>
            <img src='/assets/chips/chip-green.png' height='14' width='14' alt='' />
            <span>Max Payout</span>
            <span class='amount'>{(props.maxPayout / 1000).toFixed(2)}K</span>
          </div>
        </div>

        <Show when={props.isFlying || props.isCrashed}>
          <div
            class={'spaceship ' + (props.isFlying ? 'flying' : 'crashed')}
            style={{
              left: shipPosition().left,
              top: shipPosition().top,
              '--ship-tilt': shipPosition().tilt
            }}
          >
            <div class='ship-core'>
              <span class='cockpit'/>
              <span class='wing wing-left'/>
              <span class='wing wing-right'/>
              <span class='engine'/>
              <span class='thruster'/>
            </div>
          </div>
        </Show>

        <div class='graph-center' classList={{ waiting: !props.isFlying && !props.isCrashed }}>
          <Show
            when={props.isFlying || props.isCrashed}
            fallback={
              <div class='countdown-display'>
                <p class='countdown-value'>{(props.countdown / 1000).toFixed(1)}s</p>
                <p class='countdown-label'>Starting in</p>
              </div>
            }
          >
            <div class='multiplier-display'>
              <p
                class={'multiplier-value ' + (props.isCrashed ? 'crashed' : '')}
                style={props.isFlying && !props.isCrashed ? {
                  color: props.multiplier >= 10 ? '#f5c842'
                    : props.multiplier >= 5 ? '#00d2b4'
                    : '#ffffff',
                  'text-shadow': props.multiplier >= 10
                    ? '0 0 32px rgba(245,200,66,0.5)'
                    : props.multiplier >= 5
                    ? '0 0 28px rgba(0,210,180,0.4)'
                    : '0 0 0 transparent',
                } : {}}
              >
                {props.multiplier.toFixed(2)}x
              </p>
              <p class='current-label'>
                {props.isCrashed ? `CRASHED` : 'Current Payout'}
              </p>
            </div>
          </Show>
        </div>
      </div>

      <style jsx>{`
        .crash-graph {
          flex: 1;
          min-width: 0;
          min-height: 560px;
          background: #0b1017;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .graph-canvas-el {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          position: relative;
          z-index: 4;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .fairness-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          color: #8b92a0;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          border-radius: 6px;
          border: 1px solid rgba(31, 214, 95, 0);
        }

        .fairness-link svg {
          flex-shrink: 0;
          color: #1fd65f;
          transition: color 0.2s;
        }

        .fairness-link:hover {
          color: #c3cad6;
          border-color: rgba(31, 214, 95, 0.4);
          background: rgba(31, 214, 95, 0.08);
        }

        .fairness-link:hover svg {
          color: #1fd65f;
          filter: drop-shadow(0 0 8px rgba(31, 214, 95, 0.5));
        }

        .max-payout {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8b92a0;
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,.05);
          border-radius: 6px;
          background: rgba(255,255,255,.025);
        }

        .max-payout .amount {
          color: #1fd65f;
          font-weight: 700;
        }

        .graph-center {
          position: absolute;
          top: 58px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          text-align: center;
          pointer-events: none;
        }

        .spaceship {
          position: absolute;
          width: 46px;
          height: 46px;
          z-index: 4;
          transform: translate(-50%, -50%) rotate(var(--ship-tilt));
          pointer-events: none;
          transition: left .11s linear, top .11s linear;
        }

        .spaceship.flying {
          animation: ship-drift 1.2s ease-in-out infinite;
        }

        .spaceship.crashed {
          opacity: 0.55;
          filter: grayscale(0.4);
        }

        .ship-core {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 14px;
          background: linear-gradient(145deg, #243445 0%, #122130 55%, #0a151f 100%);
          border: 1px solid rgba(132, 195, 255, 0.35);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.24),
            0 10px 24px rgba(0,0,0,0.45),
            0 0 20px rgba(31,214,95,0.22);
        }

        .cockpit {
          position: absolute;
          left: 50%;
          top: 7px;
          transform: translateX(-50%);
          width: 17px;
          height: 14px;
          border-radius: 9px 9px 6px 6px;
          background: radial-gradient(circle at 45% 35%, #a8f6ff, #2a6fa3 68%, #173a5c 100%);
          box-shadow: 0 0 12px rgba(105, 231, 255, 0.4);
        }

        .wing {
          position: absolute;
          top: 19px;
          width: 16px;
          height: 12px;
          border-radius: 3px;
          background: linear-gradient(180deg, rgba(196,225,255,0.8), rgba(61,111,154,0.9));
        }

        .wing-left {
          left: -9px;
          transform: skewY(14deg) rotate(-7deg);
        }

        .wing-right {
          right: -9px;
          transform: skewY(-14deg) rotate(7deg);
        }

        .engine {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          width: 13px;
          height: 8px;
          border-radius: 2px 2px 5px 5px;
          background: linear-gradient(180deg, #37556f, #162635);
        }

        .thruster {
          position: absolute;
          left: 50%;
          bottom: -14px;
          transform: translateX(-50%);
          width: 11px;
          height: 18px;
          border-radius: 2px 2px 8px 8px;
          background: linear-gradient(180deg, rgba(104,253,185,0.92), rgba(60,196,255,0.7), rgba(40,120,255,0));
          filter: drop-shadow(0 0 10px rgba(64,226,170,0.5));
          animation: thruster-flicker .2s ease-in-out infinite alternate;
        }

        .graph-center.waiting {
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .countdown-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .countdown-label {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #8b92a0;
        }

        .countdown-value {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 64px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }

        .multiplier-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .current-label {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #8b92a0;
        }

        .multiplier-value {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 80px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          transition: color .12s ease;
        }

        .multiplier-value.crashed {
          color: #ff5141;
          animation: crash-flash 0.4s;
        }

        @keyframes crash-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes ship-drift {
          0%, 100% { transform: translate(-50%, -50%) rotate(var(--ship-tilt)) translateY(0px); }
          50% { transform: translate(-50%, -50%) rotate(calc(var(--ship-tilt) + 1.6deg)) translateY(-2px); }
        }

        @keyframes thruster-flicker {
          from { opacity: .65; height: 15px; }
          to { opacity: 1; height: 20px; }
        }

        @media (max-width: 768px) {
          .crash-graph {
            min-height: 500px;
          }

          .graph-header {
            padding: 12px;
          }

          .multiplier-value {
            font-size: 56px;
          }

          .spaceship {
            width: 38px;
            height: 38px;
          }

          .countdown-value {
            font-size: 42px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .multiplier-value.crashed {
            animation: none;
          }

          .spaceship.flying,
          .thruster {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

export default CrashGraph;
