const audioByKey = new Map();
const channelState = new Map();
const lastPlayedAt = new Map();

function nowMs() {
  return Date.now();
}

function parseGlobalVolume() {
  if (typeof window === 'undefined') return 1;

  const stored = window.localStorage.getItem('sound');
  const numeric = Number(stored);

  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(1, numeric / 100));
}

function ensureAudio(key, src) {
  if (!audioByKey.has(key)) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioByKey.set(key, audio);
  }

  return audioByKey.get(key);
}

function fadeTo(audio, target, durationMs) {
  if (!audio || durationMs <= 0) {
    if (audio) audio.volume = target;
    return;
  }

  const start = audio.volume;
  const startedAt = nowMs();
  const stepMs = 24;

  const timer = setInterval(() => {
    const elapsed = nowMs() - startedAt;
    const t = Math.min(1, elapsed / durationMs);
    audio.volume = start + (target - start) * t;

    if (t >= 1) {
      clearInterval(timer);
    }
  }, stepMs);
}

function stopAudio(audio, fadeOutMs = 0) {
  if (!audio) return;

  if (fadeOutMs > 0) {
    fadeTo(audio, 0, fadeOutMs);
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, fadeOutMs);
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

export function stopSFXChannel(channel, options = {}) {
  const active = channelState.get(channel);
  if (!active) return;

  stopAudio(active.audio, options.fadeOutMs || 0);
  channelState.delete(channel);
}

/**
 * Reset audio and play from start — ensures no overlap/drift.
 */
function resetAndPlay(audio, volume) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (e) {
    // Silently fail
  }
}

export function playGameSFX(key, src, options = {}) {
  if (typeof window === 'undefined') return;

  const globalVolume = parseGlobalVolume();
  if (globalVolume <= 0) return;

  const minIntervalMs = options.minIntervalMs || 0;
  const lastPlayed = lastPlayedAt.get(key) || 0;

  if (minIntervalMs > 0 && nowMs() - lastPlayed < minIntervalMs) {
    return;
  }

  const audio = ensureAudio(key, src);
  const channel = options.channel || null;

  if (channel) {
    const active = channelState.get(channel);

    if (active && active.audio && active.audio !== audio) {
      stopAudio(active.audio, options.fadeOutMs || 60);
    }

    channelState.set(channel, { key, audio });
  }

  const localVolume = options.volume == null ? 1 : options.volume;
  const targetVolume = Math.max(0, Math.min(1, localVolume * globalVolume));

  if (options.fadeInMs && options.fadeInMs > 0) {
    audio.volume = 0;
    resetAndPlay(audio, 0);
    fadeTo(audio, targetVolume, options.fadeInMs);
  } else {
    resetAndPlay(audio, targetVolume);
  }

  lastPlayedAt.set(key, nowMs());
}

/**
 * Cubic bezier evaluation helper.
 * Evaluates the Y value (output) of a cubic bezier at parameter t using Newton-Raphson.
 * Control points P1 and P2 (P0=0,0 P3=1,1).
 */
function cubicBezierY(t, p1x, p1y, p2x, p2y) {
  // Evaluate X(t) and Y(t) separately
  function sampleX(t) {
    return 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
  }
  function sampleY(t) {
    return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  }
  function sampleDerivX(t) {
    return 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
  }

  // Newton-Raphson to find t for a given x (progress)
  function getTForX(x) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 0.0001) break;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 0.0001) break;
      t -= dx / d;
    }
    return Math.max(0, Math.min(1, t));
  }

  return sampleY(getTForX(t));
}

/**
 * Velocity-synced animation ticker powered by requestAnimationFrame.
 *
 * Ticks fire proportional to the visual velocity of the eased animation:
 *   - Fast at the start (many items pass quickly) → dense ticks
 *   - Slow at the end (items crawling) → sparse ticks
 *
 * This produces the correct "rapid fire → decelerating" tick pattern that
 * matches the CSS cubic-bezier(.08,.78,.16,1) case/battle spinner easing.
 *
 * @param {Function} tickFn       — called every time a tick should fire; receives (progress, elapsed)
 * @param {number}   durationMs   — total animation duration in ms
 * @param {number}   [minInterval]— minimum ms between ticks (default 35)
 * @param {number[]} [bezier]     — [p1x,p1y,p2x,p2y] control points (default linear)
 * @returns {{ cancel: Function }}
 */
export function startAnimationTicker(tickFn, durationMs, minInterval = 35, bezier = null) {
  if (typeof window === 'undefined') return { cancel: () => {} };

  let startTime = null;
  let cancelled = false;
  let rafId = null;
  let lastTickTime = 0;
  let lastPosition = 0; // last bezier Y value we fired at

  // How much bezier-Y position needs to change before we fire a tick.
  // Smaller → more ticks, larger → fewer ticks.
  // At the start of the animation the bezier rises steeply so ticks fire rapidly;
  // near the end the curve flattens so ticks become sparse.
  const positionThreshold = 0.022; // ~45 ticks total across the full range

  function frame(ts) {
    if (cancelled) return;
    if (startTime === null) startTime = ts;

    const elapsed    = ts - startTime;
    const rawT       = Math.min(elapsed / durationMs, 1);
    const position   = bezier
      ? cubicBezierY(rawT, bezier[0], bezier[1], bezier[2], bezier[3])
      : rawT;

    // Fire when we've crossed a position threshold AND enough wall-time has passed
    const positionDelta = position - lastPosition;
    const timeDelta     = ts - lastTickTime;

    if (positionDelta >= positionThreshold && timeDelta >= minInterval) {
      lastPosition = position;
      lastTickTime = ts;
      tickFn(rawT, elapsed);
    }

    if (rawT < 1) {
      rafId = requestAnimationFrame(frame);
    }
  }

  rafId = requestAnimationFrame(frame);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
