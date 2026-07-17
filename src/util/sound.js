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
 * Ticker driven by requestAnimationFrame — checks actual animation progress
 * rather than computing setTimeout delays (which drift).
 *
 * @param {Function} tickFn         — called every time a tick should fire
 * @param {number}   durationMs     — total duration of the animation
 * @param {number}   [minInterval]  — minimum ms between ticks (default 40)
 * @param {Function} [easingFn]     — cubic-bezier or null for linear
 * @returns {Object} { cancel, elapsed, setElapsed }
 */
export function startAnimationTicker(tickFn, durationMs, minInterval = 40, easingFn = null) {
  if (typeof window === 'undefined') return { cancel: () => {} };

  let startTime = null;
  let lastTickTime = 0;
  let cancelled = false;
  let lastProgress = -1;
  let rafId = null;

  function frame(ts) {
    if (cancelled) return;
    if (startTime === null) startTime = ts;

    const elapsed = ts - startTime;
    const rawProgress = Math.min(elapsed / durationMs, 1);
    const progress = easingFn ? easingFn(rawProgress) : rawProgress;

    // Fire a tick if we've crossed a progress threshold (every ~2% of progress)
    const threshold = Math.floor(progress * 100);
    if (threshold !== lastProgress) {
      lastProgress = threshold;

      // Rate-limit: don't fire more often than minInterval
      if (ts - lastTickTime >= minInterval) {
        lastTickTime = ts;
        tickFn(progress, elapsed);
      }
    }

    if (rawProgress < 1) {
      rafId = requestAnimationFrame(frame);
    }
  }

  rafId = requestAnimationFrame(frame);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    },
    elapsed: () => lastTickTime - startTime,
  };
}