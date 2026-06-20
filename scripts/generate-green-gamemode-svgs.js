const fs = require('fs');
const path = require('path');

// Create green-themed SVG images for gamemodes
const createSlotsSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="slotsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#065f46;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#34d399;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowSlots">
      <stop offset="0%" style="stop-color:#6ee7b7;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#047857;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#slotsGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="400" cy="225" r="250" fill="url(#glowSlots)" opacity="0.4"/>
  
  <!-- Slot machine frame -->
  <rect x="250" y="100" width="300" height="250" rx="20" fill="#064e3b" stroke="#10b981" stroke-width="4"/>
  
  <!-- Slot reels -->
  <rect x="280" y="140" width="70" height="170" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
  <rect x="365" y="140" width="70" height="170" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
  <rect x="450" y="140" width="70" height="170" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
  
  <!-- Lucky 7s -->
  <text x="315" y="235" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#10b981" text-anchor="middle">7</text>
  <text x="400" y="235" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#10b981" text-anchor="middle">7</text>
  <text x="485" y="235" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#10b981" text-anchor="middle">7</text>
  
  <!-- Sparkles -->
  <circle cx="200" cy="150" r="4" fill="#6ee7b7"/>
  <circle cx="600" cy="300" r="4" fill="#6ee7b7"/>
  <circle cx="150" cy="300" r="3" fill="#34d399"/>
  <circle cx="650" cy="150" r="3" fill="#34d399"/>
  
  <!-- Win rays -->
  <line x1="400" y1="225" x2="200" y2="100" stroke="#10b981" stroke-width="2" opacity="0.3"/>
  <line x1="400" y1="225" x2="600" y2="100" stroke="#10b981" stroke-width="2" opacity="0.3"/>
  <line x1="400" y1="225" x2="200" y2="350" stroke="#10b981" stroke-width="2" opacity="0.3"/>
  <line x1="400" y1="225" x2="600" y2="350" stroke="#10b981" stroke-width="2" opacity="0.3"/>
</svg>`;

const createCoinflipSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coinflipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14532d;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#16a34a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowCoinflip">
      <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#15803d;stop-opacity:0" />
    </radialGradient>
    <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#34d399;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#coinflipGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="280" cy="225" r="180" fill="url(#glowCoinflip)" opacity="0.5"/>
  <circle cx="520" cy="225" r="180" fill="url(#glowCoinflip)" opacity="0.5"/>
  
  <!-- Left coin (heads side) -->
  <circle cx="280" cy="225" r="100" fill="url(#coinGradient)" stroke="#064e3b" stroke-width="5"/>
  <circle cx="280" cy="225" r="80" fill="none" stroke="#064e3b" stroke-width="3"/>
  <text x="280" y="245" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="#064e3b" text-anchor="middle">H</text>
  
  <!-- Right coin (tails side) -->
  <ellipse cx="520" cy="225" rx="30" ry="100" fill="url(#coinGradient)" stroke="#064e3b" stroke-width="5"/>
  <ellipse cx="520" cy="225" rx="20" ry="80" fill="none" stroke="#064e3b" stroke-width="2"/>
  
  <!-- Motion lines -->
  <line x1="350" y1="225" x2="450" y2="225" stroke="#4ade80" stroke-width="3" opacity="0.6" stroke-dasharray="10,5"/>
  
  <!-- Sparkles -->
  <circle cx="150" cy="120" r="3" fill="#4ade80"/>
  <circle cx="650" cy="330" r="3" fill="#4ade80"/>
  <circle cx="180" cy="330" r="4" fill="#22c55e"/>
  <circle cx="620" cy="120" r="4" fill="#22c55e"/>
</svg>`;

const createRouletteSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rouletteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#052e16;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#15803d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowRoulette">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#166534;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#rouletteGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="400" cy="225" r="220" fill="url(#glowRoulette)" opacity="0.4"/>
  
  <!-- Roulette wheel outer rim -->
  <circle cx="400" cy="225" r="150" fill="#052e16" stroke="#10b981" stroke-width="6"/>
  
  <!-- Roulette wheel sections (simplified) -->
  <circle cx="400" cy="225" r="140" fill="#1e293b"/>
  
  <!-- Green sections (simplified representation) -->
  <path d="M 400 225 L 400 85 A 140 140 0 0 1 498.995 125.372 Z" fill="#10b981" opacity="0.9"/>
  <path d="M 400 225 L 498.995 125.372 A 140 140 0 0 1 540 225 Z" fill="#064e3b" opacity="0.7"/>
  <path d="M 400 225 L 540 225 A 140 140 0 0 1 498.995 324.628 Z" fill="#10b981" opacity="0.9"/>
  <path d="M 400 225 L 498.995 324.628 A 140 140 0 0 1 400 365 Z" fill="#064e3b" opacity="0.7"/>
  <path d="M 400 225 L 400 365 A 140 140 0 0 1 301.005 324.628 Z" fill="#10b981" opacity="0.9"/>
  <path d="M 400 225 L 301.005 324.628 A 140 140 0 0 1 260 225 Z" fill="#064e3b" opacity="0.7"/>
  <path d="M 400 225 L 260 225 A 140 140 0 0 1 301.005 125.372 Z" fill="#10b981" opacity="0.9"/>
  <path d="M 400 225 L 301.005 125.372 A 140 140 0 0 1 400 85 Z" fill="#064e3b" opacity="0.7"/>
  
  <!-- Center hub -->
  <circle cx="400" cy="225" r="30" fill="#10b981" stroke="#064e3b" stroke-width="3"/>
  <circle cx="400" cy="225" r="15" fill="#064e3b"/>
  
  <!-- Winning number -->
  <text x="400" y="240" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#10b981" text-anchor="middle">0</text>
  
  <!-- Ball -->
  <circle cx="470" cy="150" r="12" fill="#6ee7b7" stroke="#064e3b" stroke-width="2"/>
  <circle cx="467" cy="147" r="4" fill="#fff" opacity="0.8"/>
  
  <!-- Sparkles -->
  <circle cx="150" cy="100" r="3" fill="#4ade80"/>
  <circle cx="650" cy="350" r="3" fill="#4ade80"/>
  <circle cx="200" cy="350" r="4" fill="#22c55e"/>
  <circle cx="600" cy="100" r="4" fill="#22c55e"/>
</svg>`;

const createJackpotSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="jackpotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14532d;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#15803d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowJackpot">
      <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#166534;stop-opacity:0" />
    </radialGradient>
    <linearGradient id="potGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#jackpotGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="400" cy="280" r="250" fill="url(#glowJackpot)" opacity="0.5"/>
  
  <!-- Pot/Trophy -->
  <ellipse cx="400" cy="320" rx="120" ry="40" fill="url(#potGradient)" stroke="#064e3b" stroke-width="4"/>
  <path d="M 280 320 Q 280 200 400 180 Q 520 200 520 320" fill="url(#potGradient)" stroke="#064e3b" stroke-width="4"/>
  
  <!-- Handles -->
  <path d="M 280 250 Q 240 250 240 280 Q 240 300 260 300" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
  <path d="M 520 250 Q 560 250 560 280 Q 560 300 540 300" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
  
  <!-- Shine on pot -->
  <ellipse cx="380" cy="240" rx="40" ry="60" fill="#6ee7b7" opacity="0.3"/>
  
  <!-- Coins overflowing -->
  <circle cx="400" cy="170" r="20" fill="#fbbf24" stroke="#064e3b" stroke-width="2"/>
  <circle cx="360" cy="185" r="18" fill="#fcd34d" stroke="#064e3b" stroke-width="2"/>
  <circle cx="440" cy="185" r="18" fill="#fcd34d" stroke="#064e3b" stroke-width="2"/>
  <circle cx="380" cy="160" r="16" fill="#fde047" stroke="#064e3b" stroke-width="2"/>
  <circle cx="420" cy="160" r="16" fill="#fde047" stroke="#064e3b" stroke-width="2"/>
  
  <!-- Dollar signs on coins -->
  <text x="400" y="180" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#064e3b" text-anchor="middle">$</text>
  
  <!-- Jackpot text -->
  <text x="400" y="120" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#10b981" text-anchor="middle">JACKPOT</text>
  <text x="400" y="120" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#6ee7b7" text-anchor="middle" opacity="0.5">JACKPOT</text>
  
  <!-- Sparkles and stars -->
  <circle cx="150" cy="150" r="4" fill="#fde047"/>
  <circle cx="650" cy="300" r="4" fill="#fde047"/>
  <path d="M 200 100 L 205 110 L 215 110 L 207 116 L 210 126 L 200 120 L 190 126 L 193 116 L 185 110 L 195 110 Z" fill="#4ade80"/>
  <path d="M 600 120 L 605 130 L 615 130 L 607 136 L 610 146 L 600 140 L 590 146 L 593 136 L 585 130 L 595 130 Z" fill="#4ade80"/>
</svg>`;

// Write SVG files
const outputDir = path.join(__dirname, '..', 'public', 'assets', 'gamemodes');

fs.writeFileSync(
  path.join(outputDir, 'slots-green.svg'),
  createSlotsSVG().trim()
);

fs.writeFileSync(
  path.join(outputDir, 'coinflip-green.svg'),
  createCoinflipSVG().trim()
);

fs.writeFileSync(
  path.join(outputDir, 'roulette-green.svg'),
  createRouletteSVG().trim()
);

fs.writeFileSync(
  path.join(outputDir, 'jackpot-green.svg'),
  createJackpotSVG().trim()
);

console.log('✅ Created slots-green.svg');
console.log('✅ Created coinflip-green.svg');
console.log('✅ Created roulette-green.svg');
console.log('✅ Created jackpot-green.svg');
console.log('\nGreen SVG files have been generated in:', outputDir);
