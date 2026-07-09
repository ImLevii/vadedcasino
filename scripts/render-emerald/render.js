// Captures 240 deterministic frames of scene.html via headless Chromium.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const SIZE = 512;
const TOTAL_FRAMES = 240;
const FRAMES_DIR = path.join(__dirname, 'frames');

(async () => {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--allow-file-access-from-files',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
    page.on('pageerror', (err) => { throw err; });

    await page.goto(pathToFileURL(path.join(__dirname, 'scene.html')).href);
    await page.waitForFunction('window.sceneReady === true', { timeout: 60000 });

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      await page.evaluate((f) => window.setFrame(f), i);
      await page.screenshot({
        path: path.join(FRAMES_DIR, String(i).padStart(4, '0') + '.png'),
        omitBackground: true,
        clip: { x: 0, y: 0, width: SIZE, height: SIZE },
      });
      if (i % 30 === 0) console.log(`frame ${i}/${TOTAL_FRAMES}`);
    }
    console.log(`Rendered ${TOTAL_FRAMES} frames to ${FRAMES_DIR}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
