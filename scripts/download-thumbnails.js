/**
 * Downloads all CSGOLuck S3 thumbnail images referenced by the frontend
 * into public/assets/thumbnails/ so the app no longer depends on the
 * external S3 bucket.
 *
 * Usage: node scripts/download-thumbnails.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES = {
  'casebattle.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/638e2dcf-4f8c-4b96-b5cb-e43b0a517207-CSGOLuck_Thumbnail_960x540_CaseBattle.jpeg',
  'caseopening.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/427a331f-8299-4914-9895-0ff3cac84a47-CSGOLuck_Thumbnail_960x540_CaseOpening.jpeg',
  'dailycases.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/51ca07c1-9691-4f9b-a630-256a641c1d16-CSGOLuck_Thumbnail_960x540_DailyCases.jpeg',
  'superchargecases.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/3b116ffd-cb21-413a-96c3-8776a4a902b7-CSGOLuck_Thumbnail_960x540_SuperchargeCases.jpeg',
  'mines.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/666df0e7-15eb-46be-b911-5d014e3d50a4-CSGOLuck_Thumbnail_960x540_Mines.jpeg',
  'gamefairness.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/951b0171-107f-45b8-ac59-204566eafa60-CSGOLuck_Thumbnail_960x540_GameFairness.jpeg',
  'rewards.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/ad09501f-1d4d-4ef6-bc0c-0d74bc59f7a4-CSGOLuck_Thumbnail_960x540_Rewards.jpeg',
  'rankings.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/139ce9a3-a36a-44c4-a4ee-4b6d4fa640f4-CSGOLuck_Thumbnail_960x540_Rankings.jpeg',
  'market.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/566f489c-b4a8-4ad8-8b9f-4b191c4732a9-CSGOLuck_Thumbnail_960x540_Market.jpeg',
  'crash.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/48a028f4-8e12-4cd2-a364-71bdb176a461-CSGOLuck_Thumbnail_960x540_Crash.jpeg',
  // Extra thumbnails referenced elsewhere on CSGOLuck (bonus/wiki/affiliates art)
  'affiliates.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/7052d1ad-7f40-4653-b2e8-d5c78d54de0e-CSGOLuck_Thumbnail_960x540_Affiliates.jpeg',
  'bonus.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/96ada75d-6f75-4765-8d0b-8592b0503d13-CSGOLuck_Thumbnail_960x540_Bonus.jpeg',
  'wiki.jpeg': 'https://csgoluck.s3.eu-central-1.amazonaws.com/a2d3fbf3-30f9-438f-ae20-5a9d91b280bc-CSGOLuck_Thumbnail_960x540_Wiki.jpeg',
};

const outDir = path.join(__dirname, '..', 'public', 'assets', 'thumbnails');
fs.mkdirSync(outDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  let failed = 0;
  for (const [name, url] of Object.entries(IMAGES)) {
    const dest = path.join(outDir, name);
    try {
      await download(url, dest);
      console.log(`OK ${name}`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${name}: ${e.message}`);
    }
  }
  console.log(failed ? `Done with ${failed} failure(s).` : 'All thumbnails downloaded.');
  process.exit(failed ? 1 : 0);
})();
