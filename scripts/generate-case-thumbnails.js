const fs = require('fs');
const path = require('path');

// Create simple SVG images for the case thumbnails
const createDailyCasesSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dailyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowDaily">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#dailyGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="250" cy="225" r="150" fill="url(#glowDaily)" opacity="0.6"/>
  <circle cx="550" cy="225" r="120" fill="url(#glowDaily)" opacity="0.5"/>
  
  <!-- Clock/Calendar representation -->
  <g transform="translate(250, 225)">
    <circle cx="0" cy="0" r="80" fill="#1e293b" stroke="#3b82f6" stroke-width="4"/>
    <circle cx="0" cy="0" r="5" fill="#3b82f6"/>
    <line x1="0" y1="0" x2="0" y2="-50" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="35" y2="0" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
  </g>
  
  <!-- Calendar icon -->
  <g transform="translate(550, 225)">
    <rect x="-50" y="-50" width="100" height="100" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/>
    <rect x="-50" y="-50" width="100" height="25" rx="8" fill="#3b82f6"/>
    <text x="0" y="10" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#3b82f6" text-anchor="middle">24</text>
  </g>
  
  <!-- Sparkles -->
  <circle cx="150" cy="100" r="3" fill="#60a5fa" opacity="0.8"/>
  <circle cx="650" cy="350" r="3" fill="#60a5fa" opacity="0.8"/>
  <circle cx="700" cy="150" r="2" fill="#93c5fd" opacity="0.7"/>
  <circle cx="100" cy="350" r="2" fill="#93c5fd" opacity="0.7"/>
</svg>`;

const createSuperchargeCasesSVG = () => `
<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="superchargeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#713f12;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowSupercharge">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#b45309;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="450" fill="url(#superchargeGradient)"/>
  
  <!-- Glow effects -->
  <circle cx="400" cy="225" r="200" fill="url(#glowSupercharge)" opacity="0.5"/>
  
  <!-- Lightning bolts -->
  <g transform="translate(300, 100)">
    <path d="M 20 0 L 0 50 L 20 50 L 10 100 L 50 30 L 30 30 Z" 
          fill="#fbbf24" stroke="#78350f" stroke-width="2" opacity="0.9"/>
  </g>
  
  <g transform="translate(480, 150)">
    <path d="M 15 0 L 0 40 L 15 40 L 8 80 L 40 25 L 25 25 Z" 
          fill="#fde047" stroke="#78350f" stroke-width="2" opacity="0.9"/>
  </g>
  
  <!-- Energy orb -->
  <circle cx="400" cy="225" r="60" fill="#78350f" opacity="0.8"/>
  <circle cx="400" cy="225" r="50" fill="#f59e0b" opacity="0.9"/>
  <circle cx="400" cy="225" r="35" fill="#fbbf24"/>
  <circle cx="385" cy="210" r="15" fill="#fde047" opacity="0.7"/>
  
  <!-- Electric particles -->
  <circle cx="200" cy="300" r="4" fill="#fde047"/>
  <circle cx="600" cy="320" r="4" fill="#fde047"/>
  <circle cx="250" cy="150" r="3" fill="#fbbf24"/>
  <circle cx="550" cy="100" r="3" fill="#fbbf24"/>
  <circle cx="150" cy="200" r="2" fill="#fde047" opacity="0.8"/>
  <circle cx="650" cy="250" r="2" fill="#fde047" opacity="0.8"/>
  
  <!-- Energy lines -->
  <line x1="340" y1="225" x2="280" y2="225" stroke="#fde047" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  <line x1="460" y1="225" x2="520" y2="225" stroke="#fde047" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  <line x1="400" y1="165" x2="400" y2="105" stroke="#fde047" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  <line x1="400" y1="285" x2="400" y2="345" stroke="#fde047" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
</svg>`;

// Write SVG files
const outputDir = path.join(__dirname, '..', 'public', 'assets', 'gamemodes');

fs.writeFileSync(
  path.join(outputDir, 'daily-cases.svg'),
  createDailyCasesSVG().trim()
);

fs.writeFileSync(
  path.join(outputDir, 'supercharge-cases.svg'),
  createSuperchargeCasesSVG().trim()
);

console.log('✅ Created daily-cases.svg');
console.log('✅ Created supercharge-cases.svg');
console.log('\nSVG files have been generated in:', outputDir);
