const GROWTH = 0.00006;

// Keep sub-cent precision for motion; only round the text shown to the player.
// Server ticks are rounded down to cents, so reconcile against their whole
// interval instead of repeatedly rewinding the animation to its lower bound.
export function createFlightClock(now, multiplier = 1, elapsed) {
  const initial = Math.max(1, Number(multiplier) || 1);
  let age = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : Math.log(initial) / GROWTH;
  let origin = now - age;
  let targetOrigin = origin;
  let previousTime = now;
  let latestTick = 1;
  return {
    sample(time) {
      const dt = Math.max(0, time - previousTime);
      previousTime = Math.max(previousTime, time);
      const correction = (targetOrigin - origin) * (1 - Math.exp(-dt / 250));
      // Correct network drift without reversing flight or jumping on a tick.
      origin += Math.max(-dt * .25, Math.min(dt * .25, correction));
      age = Math.max(age, time - origin);
      return Math.exp(GROWTH * age);
    },
    observe(tick, time) {
      const value = Number(tick);
      if (!Number.isFinite(value) || value < latestTick || value < 1) return;
      latestTick = value;
      const lower = Math.log(value) / GROWTH;
      const upper = Math.log(value + .01) / GROWTH;
      const projected = time - targetOrigin;
      if (projected < lower) targetOrigin = time - lower;
      else if (projected > upper) targetOrigin = time - upper;
    }
  };
}

export function flightGeometry(width, height, multiplier) {
  const m = Math.max(1, Number(multiplier) || 1);
  const t = Math.log(m) / .06;
  // A continuous viewport avoids the drops caused by ceil(multiplier * 1.15).
  const spanY = Math.hypot(1, (m - 1) * 1.2);
  const maxY = 1 + spanY;
  const maxT = Math.hypot(2, t) * 1.08;
  const left = width < 600 ? 60 : 90, right = width - 70;
  const top = 65, bottom = height - 48;
  const plotWidth = Math.max(40, right - left - 40);
  const plotHeight = Math.max(40, bottom - top);
  const point = value => ({
    x: left + Math.log(Math.max(1, value)) / .06 / maxT * plotWidth,
    y: bottom - (value - 1) / spanY * plotHeight
  });
  const end = point(m);
  const path = Array.from({length: 81}, (_, i) => {
    const p = point(Math.exp(Math.log(m) * i / 80));
    return `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }).join(' ');
  const step = maxY <= 2.5 ? .2 : Math.max(1, Math.floor((maxY - 1) / 5));
  const yTicks = Array.from({length: Math.floor((maxY - 1) / step)}, (_, i) => 1 + (i + 1) * step);
  const tickStep = [1, 2, 5, 10, 20, 30, 60, 120, 300].find(v => maxT / v <= 6) || 600;
  const xTicks = Array.from({length: Math.floor(maxT / tickStep)}, (_, i) => (i + 1) * tickStep);
  // Analytic tangent stays stable even at launch and at very high multipliers.
  const angle = Math.atan2(-m * .06 / spanY * plotHeight, plotWidth / maxT) * 180 / Math.PI;
  return {w: width, h: height, m, t, maxT, maxY, left, right, top, bottom, end, path, yTicks, xTicks, point, angle};
}
