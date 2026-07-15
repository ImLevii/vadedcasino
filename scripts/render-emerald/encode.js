// Encodes captured frames into a seamless looping VP9 WEBM with alpha (60fps).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const FRAMES_DIR = path.join(__dirname, 'frames');
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
const OUT_WEBM = path.join(OUT_DIR, 'emerald-gem.webm');
const OUT_POSTER = path.join(OUT_DIR, 'emerald-gem-poster.png');

if (!fs.existsSync(path.join(FRAMES_DIR, '0000.png'))) {
  console.error('No frames found — run render.js first.');
  process.exit(1);
}

const args = [
  '-y',
  '-framerate', '60',
  '-i', path.join(FRAMES_DIR, '%04d.png'),
  '-c:v', 'libvpx-vp9',
  '-pix_fmt', 'yuva420p',
  '-auto-alt-ref', '0', // required for alpha
  '-b:v', '0',
  '-crf', '18',
  '-row-mt', '1',
  '-metadata:s:v:0', 'alpha_mode=1',
  OUT_WEBM,
];

console.log('Encoding VP9 alpha WEBM...');
const res = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
if (res.status !== 0) {
  console.error('ffmpeg failed with exit code', res.status);
  process.exit(res.status || 1);
}

fs.copyFileSync(path.join(FRAMES_DIR, '0000.png'), OUT_POSTER);
fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
console.log('Wrote', OUT_WEBM);
console.log('Wrote', OUT_POSTER);
