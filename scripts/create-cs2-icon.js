const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="20" fill="#1a1f2e"/>
  <path d="M20 30h60v40H20z" fill="#2b3344"/>
  <text x="50" y="55" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, sans-serif" font-size="28" font-weight="900"
        fill="#f5c842" letter-spacing="2">CS</text>
  <text x="50" y="72" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-size="8" font-weight="700"
        fill="#8892a4" letter-spacing="1">SKINS</text>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#f5c842" stroke-width="1.5" opacity="0.3"/>
</svg>`;

const filePath = path.join(__dirname, '..', 'assets', 'icons', 'cs2-logo.svg');
fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, svg);
console.log('CS2 logo created at', filePath);