const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const audio = [], storage = new Map(), frames = new Map();
  let frameId = 0;
  const plays = [];
  class Audio {
    constructor(src) { this.src = src; this.currentTime = 0; this.volume = 1; this.paused = true; audio.push(this); }
    getAttribute() { return this.src; }
    play() { this.paused = false; plays.push(this.src); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const context = vm.createContext({Audio, Date, Map, Math, Number, Object, setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    window: {localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value))}, addEventListener() {}},
  });
  vm.runInContext(fs.readFileSync('src/util/sound.js', 'utf8').replaceAll('export ', '') + '\nglobalThis.sfx = {playGameSFX, stopSFXChannel, setSFXVolume, playCosmicSFX, prepareCosmicSFX, GAME_SOUNDS, startReelSFX};', context);
  return {audio, plays, frame: time => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }, ...context.sfx};
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('default volume, live slider updates, and mute apply to active and future recordings', () => {
  const s = setup();
  const stop = s.playGameSFX('roll', 'roll.mp3', {volume: .5});
  assert.equal(s.audio[0].volume, .5);
  s.setSFXVolume(40); assert.equal(s.audio[0].volume, .2);
  s.setSFXVolume(0); assert.equal(s.audio[0].volume, 0);
  s.playGameSFX('muted', 'gem.mp3'); assert.equal(s.audio.length, 1);
  stop();
});
test('a restarted clip survives cleanup and fade timers belonging to the previous spin', async () => {
  const s = setup();
  const oldStop = s.playGameSFX('roll', 'roll.mp3', {channel: 'reel'});
  s.stopSFXChannel('reel', {fadeOutMs: 30});
  const stop = s.playGameSFX('roll', 'roll.mp3', {channel: 'reel'});
  oldStop(); await wait(70);
  assert.equal(s.audio[0].paused, false);
  assert.equal(s.audio[0].volume, 1);
  stop(); assert.equal(s.audio[0].paused, true);
});
test('cue offset skips recording silence and duration stops playback', async () => {
  const s = setup();
  s.playGameSFX('click', s.GAME_SOUNDS.minesClick, {startTime: 1.94, durationMs: 30});
  assert.equal(s.audio[0].currentTime, 1.94);
  await wait(70); assert.equal(s.audio[0].paused, true);
});
test('simultaneous cosmic reels play the gem once and a throttled cleanup cannot stop it', () => {
  const s = setup();
  const stop = s.playCosmicSFX(); const duplicateStop = s.playCosmicSFX();
  duplicateStop(); assert.equal(s.audio.length, 1);
  assert.equal(s.audio[0].paused, false);
  assert.equal(s.audio[0].src, s.GAME_SOUNDS.cosmicGem);
  stop();
});

test('gesture preparation unlocks all reel and result clips silently without interrupting active playback', async () => {
  const s = setup();
  s.prepareCosmicSFX();
  assert.equal(s.audio.length, 6);
  assert.ok(s.audio.every(clip => clip.volume === 0));
  const stop = s.playGameSFX('case-roll', s.GAME_SOUNDS.rouletteClick, {channel:'case-roll', volume:.4});
  await Promise.resolve();
  assert.equal(s.audio.find(clip => !clip.paused).volume, .4);
  const count = s.plays.length;
  s.prepareCosmicSFX();
  assert.equal(s.plays.length, count);
  stop();
  s.setSFXVolume(0);
  s.prepareCosmicSFX();
  assert.equal(s.plays.length, count);
});
test('leaving a channel cancels scheduled playback and fades', async () => {
  const s = setup();
  s.playGameSFX('roll', 'roll.mp3', {channel: 'reel', durationMs: 80, fadeInMs: 50});
  s.stopSFXChannel('reel'); await wait(100);
  assert.equal(s.audio[0].paused, true);
  assert.equal(s.audio[0].currentTime, 0);
});

test('reel clicks slow down with easing and stop immediately on cancellation', () => {
  const s = setup();
  const stop = s.startReelSFX('case-roll', 4800);
  let early, late;
  for (let t = 0; t <= 4800; t += 16) {
    s.frame(t);
    if (t === 1600) early = s.plays.length;
    if (t === 3200) late = s.plays.length;
  }
  assert.ok(early > s.plays.length - late, 'clicks must decelerate');
  assert.ok(s.plays.length > 10);
  assert.ok(s.plays.every(src => src === s.GAME_SOUNDS.rouletteClick));
  stop();
  const count = s.plays.length;
  for (let t = 5000; t < 7000; t += 16) s.frame(t);
  assert.equal(s.plays.length, count);
  assert.ok(s.audio.every(clip => clip.paused));
});
