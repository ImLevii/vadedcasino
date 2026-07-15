const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), 'public', 'assets', 'art');
const denominations = [3, 5, 10, 25, 50, 100, 250, 500];
const providers = ['g2a', 'kinguin'];

function chip(cx, cy, r, rot, opacity) {
    return `
    <g transform="translate(${cx} ${cy}) rotate(${rot})" opacity="${opacity}">
      <circle r="${r}" fill="url(#cardChipBody)" stroke="#0a0d13" stroke-width="${r * 0.06}"/>
      <g fill="url(#cardChipEdge)">
        ${Array.from({ length: 8 }, (_, i) => {
            const a0 = (i * 45 - 12) * Math.PI / 180;
            const a1 = (i * 45 + 12) * Math.PI / 180;
            const ro = r * 0.98, ri = r * 0.66;
            const x0 = Math.cos(a0) * ro, y0 = Math.sin(a0) * ro;
            const x1 = Math.cos(a1) * ro, y1 = Math.sin(a1) * ro;
            const x2 = Math.cos(a1) * ri, y2 = Math.sin(a1) * ri;
            const x3 = Math.cos(a0) * ri, y3 = Math.sin(a0) * ri;
            return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${ro} ${ro} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${ri} ${ri} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z"/>`;
        }).join('')}
      </g>
      <circle r="${r * 0.6}" fill="url(#cardChipFace)"/>
      <g transform="scale(${r * 0.02})" fill="url(#cardClover)">
        <path d="M0 -4 C -3.3 -26 -30 -26 -25 -7 C -23 3 -9 4 0 -4 Z" transform="rotate(45)"/>
        <path d="M0 -4 C -3.3 -26 -30 -26 -25 -7 C -23 3 -9 4 0 -4 Z" transform="rotate(135)"/>
        <path d="M0 -4 C -3.3 -26 -30 -26 -25 -7 C -23 3 -9 4 0 -4 Z" transform="rotate(225)"/>
        <path d="M0 -4 C -3.3 -26 -30 -26 -25 -7 C -23 3 -9 4 0 -4 Z" transform="rotate(315)"/>
      </g>
    </g>`;
}

function providerBadge(provider) {
    if (provider === 'g2a') {
        return `<g transform="translate(372 30)">
      <rect x="-46" y="-15" width="46" height="30" rx="6" fill="#0a0d13" opacity="0.55"/>
      <text x="-23" y="6" font-family="Arial, sans-serif" font-size="17" font-weight="900" fill="#ff5f00" text-anchor="middle" letter-spacing="1">G2A</text>
    </g>`;
    }
    return `<g transform="translate(372 30)">
      <rect x="-70" y="-15" width="70" height="30" rx="6" fill="#0a0d13" opacity="0.55"/>
      <text x="-35" y="6" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#f2c94c" text-anchor="middle" letter-spacing="0.5">KINGUIN</text>
    </g>`;
}

function makeCard(provider, amount) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225" fill="none">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#123024"/>
      <stop offset="45%" stop-color="#0d1a18"/>
      <stop offset="100%" stop-color="#0a0f14"/>
    </linearGradient>
    <radialGradient id="cardGlow" cx="18%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#1fd65f" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#1fd65f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cardAmount" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8dffb6"/>
      <stop offset="55%" stop-color="#1fd65f"/>
      <stop offset="100%" stop-color="#12a344"/>
    </linearGradient>
    <radialGradient id="cardChipBody" cx="42%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#2b323d"/>
      <stop offset="60%" stop-color="#171d26"/>
      <stop offset="100%" stop-color="#0a0e14"/>
    </radialGradient>
    <linearGradient id="cardChipEdge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7dffc2"/>
      <stop offset="50%" stop-color="#3ee68a"/>
      <stop offset="100%" stop-color="#0e8443"/>
    </linearGradient>
    <radialGradient id="cardChipFace" cx="42%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#f2f7f4"/>
      <stop offset="100%" stop-color="#b8c6bd"/>
    </radialGradient>
    <linearGradient id="cardClover" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5cf0a4"/>
      <stop offset="100%" stop-color="#0d7a3d"/>
    </linearGradient>
  </defs>

  <rect width="400" height="225" rx="16" fill="url(#cardBg)"/>
  <rect width="400" height="225" rx="16" fill="url(#cardGlow)"/>
  <rect x="1" y="1" width="398" height="223" rx="15" fill="none" stroke="rgba(31,214,95,0.25)" stroke-width="1.5"/>

  <!-- decorative floating chips -->
  ${chip(330, 150, 46, -18, 0.9)}
  ${chip(300, 90, 26, 12, 0.55)}
  ${chip(370, 195, 20, 30, 0.4)}

  <!-- brand wordmark -->
  <g transform="translate(28 34)">
    <text font-family="'Geogrotesque Wide', Arial, sans-serif" font-size="20" font-weight="800" letter-spacing="1">
      <tspan fill="#1fd65f">COSMIC</tspan><tspan fill="#ffffff"> LUCK</tspan>
    </text>
  </g>

  ${providerBadge(provider)}

  <!-- amount -->
  <text x="28" y="150" font-family="'Geogrotesque Wide', Arial, sans-serif" font-size="64" font-weight="900" fill="url(#cardAmount)">$${amount}</text>

  <!-- label -->
  <text x="30" y="188" font-family="'Geogrotesque Wide', Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff" letter-spacing="2">GIFT CARD</text>
</svg>
`;
}

let count = 0;
for (const provider of providers) {
    for (const amount of denominations) {
        const svg = makeCard(provider, amount);
        fs.writeFileSync(path.join(OUT, `${provider}${amount}.svg`), svg);
        count++;
    }
}
console.log(`Generated ${count} gift card SVGs in ${OUT}`);
