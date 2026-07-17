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
 * Forcefully restart an audio element: fully reset it before playing again.
 * This prevents audio drift/overlap when the same sound must replay immediately.
 */
function resetAndPlay(audio, volume) {
  try {
    // Fully reset the audio element to a clean state
    audio.pause();
    // Small delay forces the browser to flush any pending audio buffer
    audio.currentTime = 0;
    audio.volume = volume;
    // Use void to ensure the play() promise is handled
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (e) {
    // Silently fail if audio context is not available
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
    // Force restart with proper volume
    resetAndPlay(audio, targetVolume);
  }

  lastPlayedAt.set(key, nowMs());
}