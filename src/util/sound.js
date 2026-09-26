// Source recordings are preserved unchanged. Cue offsets skip recording silence.
export const GAME_SOUNDS = Object.freeze({
  minesClick: '/assets/sfx/cosmic-luck-mines-click-sound.mp3',
  rouletteClick: '/assets/sfx/cosmic-luck-roullete-click-sound.mp3',
  rouletteRoll: '/assets/sfx/cosmic-luck-roullete-roll-sound.mp3',
  cosmicGem: '/assets/sfx/cosmicluck-gem-sound.mp3',
  caseRoll: '/assets/sfx/cosmicluck-roll-sound.mp3',
});
const audioByKey = new Map();
const channelState = new Map();
const lastPlayedAt = new Map();
const playbackState = new Map();
const noop = () => {};

function parseGlobalVolume() {
  if (typeof window === 'undefined') return 1;
  const stored = window.localStorage.getItem('sound');
  if (stored === null) return 1;
  const numeric = Number(stored);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric / 100)) : 1;
}

// Update existing clips immediately as well as future playback.
export function setSFXVolume(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || typeof window === 'undefined') return;
  window.localStorage.setItem('sound', Math.max(0, Math.min(100, numeric)));
  syncVolume();
}
function syncVolume() {
  for (const [audio, state] of playbackState) {
    audio.volume = state.volume * state.envelope * parseGlobalVolume();
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => { if (event.key === 'sound' || event.key === null) syncVolume(); });
}

function ensureAudio(key, src) {
  const existing = audioByKey.get(key);
  if (!existing || existing.getAttribute('src') !== src) {
    if (existing) stopAudio(existing);
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioByKey.set(key, audio);
  }
  return audioByKey.get(key);
}

// Preload and unlock the gem recording directly from the spin gesture.
export function prepareCosmicSFX() {
  if (typeof window === 'undefined' || parseGlobalVolume() <= 0) return;
  const audio = ensureAudio('cosmic-gem', GAME_SOUNDS.cosmicGem);
  if (playbackState.has(audio)) return;
  audio.volume = 0;
  try {
    audio.play()?.then(() => { if (!playbackState.has(audio)) { audio.pause(); audio.currentTime = 0; } }).catch(noop);
  } catch { /* Browser audio may be unavailable. */ }
}

export function playCosmicSFX() {
  return playGameSFX('cosmic-gem', GAME_SOUNDS.cosmicGem, {
    channel: 'cosmic-reveal', volume: .65, startTime: 1.92, durationMs: 1100, minIntervalMs: 200,
  });
}

function dispose(audio, state) {
  if (playbackState.get(audio) !== state) return;
  clearTimeout(state.timer);
  clearInterval(state.fade);
  audio.pause();
  audio.currentTime = 0;
  audio.onended = null;
  playbackState.delete(audio);
  for (const [channel, active] of channelState) if (active === audio) channelState.delete(channel);
}
function fadeTo(audio, state, target, durationMs, done = noop) {
  clearInterval(state.fade);
  const initial = state.envelope;
  const startedAt = Date.now();
  state.fade = setInterval(() => {
    if (playbackState.get(audio) !== state) return clearInterval(state.fade);
    const t = Math.min(1, (Date.now() - startedAt) / durationMs);
    state.envelope = initial + (target - initial) * t;
    audio.volume = state.volume * state.envelope * parseGlobalVolume();
    if (t === 1) { clearInterval(state.fade); done(); }
  }, 16);
}
function stopAudio(audio, fadeOutMs = 0) {
  const state = playbackState.get(audio);
  if (!state) return;
  clearTimeout(state.timer);
  if (fadeOutMs > 0) fadeTo(audio, state, 0, fadeOutMs, () => dispose(audio, state));
  else dispose(audio, state);
}
export function stopSFXChannel(channel, options = {}) {
  const audio = channelState.get(channel);
  if (!audio) return;
  channelState.delete(channel);
  stopAudio(audio, options.fadeOutMs || 0);
}

// Each play owns its timers: an old fade or cleanup cannot interrupt a new spin.
export function playGameSFX(key, src, options = {}) {
  if (typeof window === 'undefined' || parseGlobalVolume() <= 0) return noop;
  const now = Date.now();
  if (options.minIntervalMs && now - (lastPlayedAt.get(key) || 0) < options.minIntervalMs) return noop;
  const audio = ensureAudio(key, src);
  const channel = options.channel;
  const previous = channelState.get(channel);
  if (previous && previous !== audio) stopAudio(previous, options.fadeOutMs ?? 60);
  stopAudio(audio);
  const state = {volume: Math.max(0, Math.min(1, options.volume ?? 1)), envelope: options.fadeInMs ? 0 : 1};
  playbackState.set(audio, state);
  if (channel) channelState.set(channel, audio);
  const stop = () => dispose(audio, state);
  try {
    audio.currentTime = options.startTime || 0;
    audio.volume = state.volume * state.envelope * parseGlobalVolume();
    audio.onended = stop;
    const started = () => {
      if (playbackState.get(audio) !== state) return;
      if (options.fadeInMs) fadeTo(audio, state, 1, options.fadeInMs);
      if (options.durationMs) state.timer = setTimeout(stop, options.durationMs);
    };
    const promise = audio.play();
    if (promise) promise.then(started).catch(stop);
    else started();
    lastPlayedAt.set(key, now);
  } catch { stop(); }
  return stop;
}

// Capture activation once, including SVG children and keyboard-generated clicks.
// Capture runs before navigation or dropdown handlers stop event propagation.
export function installUIClickSFX(root = document) {
  const onClick = event => {
    if (!event.isTrusted || event.button > 0) return;
    const target = event.target;
    if (!target?.closest || target.closest('[data-ui-sound="off"], [inert], [aria-disabled="true"]')) return;
    const control = target.closest('button, a[href], [role="button"], summary, input[type="button"], input[type="submit"]');
    if (!control || control.matches(':disabled')) return;
    playGameSFX('ui-click', GAME_SOUNDS.rouletteClick, {
      channel: 'ui-click', volume: .28, startTime: 1.35, durationMs: 90, minIntervalMs: 40,
    });
  };
  root.addEventListener('click', onClick, true);
  return () => { root.removeEventListener('click', onClick, true); stopSFXChannel('ui-click'); };
}

// A roll is a sequence of item crossings, not the long gem recording (the
// supplied roll/gem MP3s contain identical bytes). Use the supplied short click.
export function startReelSFX(channel, durationMs, bezier) {
  let stopClick = noop;
  const ticker = startAnimationTicker(() => {
    stopClick = playGameSFX(channel, GAME_SOUNDS.rouletteClick, {
      channel, volume: .42, startTime: 1.35, durationMs: 90,
    });
  }, durationMs, 65, bezier || [.08, .78, .16, 1]);
  return () => { ticker.cancel(); stopClick(); };
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
