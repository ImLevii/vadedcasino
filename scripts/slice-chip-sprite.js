// Slices the chip sprite sheet into individual clean transparent PNGs.
// Pipeline: flood-fill checkerboard bg -> remove specks -> grid segmentation ->
// per-cell largest component -> geometric shape fit (ellipse for round chips,
// rect for square tiles) to clip cast shadows & neighbor slivers ->
// 1px fringe erosion -> gaussian-feathered alpha -> tight crop.
// Source: public/assets/icons/97df258f-fe1d-4614-a01a-0f71d0425359.png (6 cols x 2 rows)
// Output: public/assets/chips/
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'public', 'assets', 'icons', '97df258f-fe1d-4614-a01a-0f71d0425359.png');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'chips');

// Names by grid position: row 0 = round chips, row 1 = square-tile variants
const NAMES = [
  ['chip-red', 'chip-black', 'chip-white', 'chip-green', 'chip-white-clover', 'chip-green-clover'],
  ['chip-red-square', 'chip-black-square', 'chip-white-square', 'chip-green-square', 'chip-white-clover-square', 'chip-green-clover-square'],
];

const FLOOD_TOL = 12;   // strict tolerance for flat checkerboard colors
const FRINGE_TOL = 45;  // looser tolerance for anti-aliased edge cleanup (kept
                        // moderate so white chip rim texture is not eaten)
const FRINGE_PASSES = 2;
const MIN_SEGMENT = 40; // ignore tiny noise segments (px)
const MIN_ISLAND = 500; // drop disconnected opaque islands smaller than this
const ERODE_PX = 2;     // shave this many px of bg-contaminated edge pixels
const PAD = 3;          // transparent padding around each exported chip

function colorDist(data, idx, c) {
  const dr = data[idx] - c[0];
  const dg = data[idx + 1] - c[1];
  const db = data[idx + 2] - c[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function segments(profile) {
  const segs = [];
  let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    const filled = i < profile.length && profile[i];
    if (filled && start === -1) start = i;
    if (!filled && start !== -1) {
      if (i - start >= MIN_SEGMENT) segs.push([start, i]);
      start = -1;
    }
  }
  return segs;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[(s.length / 2) | 0];
}

async function main() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const ch = 3;

  // Detect the two checkerboard colors: corner pixel + first border pixel that differs
  const bgColors = [[data[0], data[1], data[2]]];
  for (let x = 1; x < width; x++) {
    const idx = x * ch;
    if (colorDist(data, idx, bgColors[0]) > FLOOD_TOL) {
      bgColors.push([data[idx], data[idx + 1], data[idx + 2]]);
      break;
    }
  }
  const isBgColor = (idx, tol) => bgColors.some((c) => colorDist(data, idx, c) <= tol);

  // Flood fill background from all border pixels
  const bg = new Uint8Array(width * height); // 1 = background
  {
    const stack = [];
    const push = (x, y) => {
      const p = y * width + x;
      if (!bg[p] && isBgColor(p * ch, FLOOD_TOL)) { bg[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
    for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % width, y = (p / width) | 0;
      if (x > 0) push(x - 1, y);
      if (x < width - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < height - 1) push(x, y + 1);
    }
  }

  // Eat anti-aliased fringe next to background
  for (let pass = 0; pass < FRINGE_PASSES; pass++) {
    const added = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (bg[p]) continue;
        const nearBg = (x > 0 && bg[p - 1]) || (x < width - 1 && bg[p + 1]) ||
                       (y > 0 && bg[p - width]) || (y < height - 1 && bg[p + width]);
        if (nearBg && isBgColor(p * ch, FRINGE_TOL)) added.push(p);
      }
    }
    for (const p of added) bg[p] = 1;
  }

  // Clear enclosed checkerboard pockets (bg trapped between touching chips,
  // unreachable from the border). To avoid eating near-white chip pixels, a
  // pocket is only cleared when its pixels actually follow the checkerboard
  // GRID PATTERN (correct color at the predicted grid cell).
  {
    // Detect checker period and phase from the top-left corner row
    const changes = [];
    for (let x = 1; x < 200 && changes.length < 3; x++) {
      if (colorDist(data, x * ch, [data[(x - 1) * ch], data[(x - 1) * ch + 1], data[(x - 1) * ch + 2]]) > 5) changes.push(x);
    }
    const period = changes.length >= 2 ? changes[1] - changes[0] : 16;
    const phase = changes.length >= 1 ? ((changes[0] % period) + period) % period : 0;
    const c00 = bgColors[0]; // color of the block containing (0,0)
    const c01 = bgColors[1] || bgColors[0];
    const expected = (x, y) => {
      const parity = (Math.floor((x - phase + period * 4) / period) + Math.floor((y - phase + period * 4) / period)) % 2;
      // block at (0,0) has parity of floor((0-phase+4p)/p)*2 % 2
      const originParity = (Math.floor((0 - phase + period * 4) / period) + Math.floor((0 - phase + period * 4) / period)) % 2;
      return parity === originParity ? c00 : c01;
    };

    const seen = new Uint8Array(width * height);
    for (let p0 = 0; p0 < width * height; p0++) {
      if (bg[p0] || seen[p0] || !isBgColor(p0 * ch, FLOOD_TOL)) continue;
      const comp = [p0];
      seen[p0] = 1;
      for (let i = 0; i < comp.length; i++) {
        const p = comp[i];
        const x = p % width, y = (p / width) | 0;
        const nbrs = [];
        if (x > 0) nbrs.push(p - 1);
        if (x < width - 1) nbrs.push(p + 1);
        if (y > 0) nbrs.push(p - width);
        if (y < height - 1) nbrs.push(p + width);
        for (const q of nbrs) {
          if (!bg[q] && !seen[q] && isBgColor(q * ch, FLOOD_TOL)) { seen[q] = 1; comp.push(q); }
        }
      }
      if (comp.length < 100) continue;
      // Fraction of pixels matching the predicted checker color more closely
      // than the opposite color
      let match = 0;
      for (const p of comp) {
        const x = p % width, y = (p / width) | 0;
        const exp = expected(x, y);
        const other = exp === c00 ? c01 : c00;
        const dExp = colorDist(data, p * ch, exp);
        if (dExp <= 8 && dExp < colorDist(data, p * ch, other)) match++;
      }
      if (match / comp.length >= 0.8) {
        for (const p of comp) bg[p] = 1;
      }
    }
    // Re-run fringe cleanup around the newly cleared pockets
    for (let pass = 0; pass < FRINGE_PASSES; pass++) {
      const added = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = y * width + x;
          if (bg[p]) continue;
          const nearBg = (x > 0 && bg[p - 1]) || (x < width - 1 && bg[p + 1]) ||
                         (y > 0 && bg[p - width]) || (y < height - 1 && bg[p + width]);
          if (nearBg && isBgColor(p * ch, FRINGE_TOL)) added.push(p);
        }
      }
      for (const p of added) bg[p] = 1;
    }
  }

  // Drop tiny disconnected opaque islands (specks)
  {
    const seen = new Uint8Array(width * height);
    for (let p0 = 0; p0 < width * height; p0++) {
      if (bg[p0] || seen[p0]) continue;
      const comp = [p0];
      seen[p0] = 1;
      for (let i = 0; i < comp.length; i++) {
        const p = comp[i];
        const x = p % width, y = (p / width) | 0;
        if (x > 0 && !bg[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; comp.push(p - 1); }
        if (x < width - 1 && !bg[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; comp.push(p + 1); }
        if (y > 0 && !bg[p - width] && !seen[p - width]) { seen[p - width] = 1; comp.push(p - width); }
        if (y < height - 1 && !bg[p + width] && !seen[p + width]) { seen[p + width] = 1; comp.push(p + width); }
      }
      if (comp.length < MIN_ISLAND) for (const p of comp) bg[p] = 1;
    }
  }

  // Segment rows then columns by opaque-pixel profiles
  const rowProfile = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bg[y * width + x]) { rowProfile[y] = true; break; }
    }
  }
  const rowSegs = segments(rowProfile);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;

  for (let r = 0; r < rowSegs.length; r++) {
    const [y0, y1] = rowSegs[r];
    const colProfile = new Array(width).fill(false);
    for (let x = 0; x < width; x++) {
      for (let y = y0; y < y1; y++) {
        if (!bg[y * width + x]) { colProfile[x] = true; break; }
      }
    }
    let colSegs = segments(colProfile);

    // Split segments containing multiple touching chips at the sparsest column
    const minW = Math.min(...colSegs.map(([a, b]) => b - a));
    const colDensity = (x) => {
      let n = 0;
      for (let y = y0; y < y1; y++) if (!bg[y * width + x]) n++;
      return n;
    };
    const split = [];
    for (const [a, b] of colSegs) {
      const n = Math.max(1, Math.round((b - a) / minW));
      if (n === 1) { split.push([a, b]); continue; }
      let prev = a;
      for (let k = 1; k < n; k++) {
        const target = a + Math.round(((b - a) * k) / n);
        const span = Math.round(minW * 0.15);
        let best = target, bestN = Infinity;
        for (let x = Math.max(a + 1, target - span); x <= Math.min(b - 1, target + span); x++) {
          const d = colDensity(x);
          if (d < bestN) { bestN = d; best = x; }
        }
        split.push([prev, best]);
        prev = best;
      }
      split.push([prev, b]);
    }
    colSegs = split;

    for (let c = 0; c < colSegs.length; c++) {
      const [x0, x1] = colSegs[c];
      const cw = x1 - x0, chh = y1 - y0;

      // Editable copy of the cell's RGB (used for texture retouching)
      const cellRGB = Buffer.alloc(cw * chh * 3);
      for (let y = 0; y < chh; y++) {
        for (let x = 0; x < cw; x++) {
          const src = ((y0 + y) * width + (x0 + x)) * ch;
          const d = (y * cw + x) * 3;
          cellRGB[d] = data[src];
          cellRGB[d + 1] = data[src + 1];
          cellRGB[d + 2] = data[src + 2];
        }
      }

      // Local mask: 1 = chip pixel
      let mask = new Uint8Array(cw * chh);
      for (let y = 0; y < chh; y++) {
        for (let x = 0; x < cw; x++) {
          mask[y * cw + x] = bg[(y0 + y) * width + (x0 + x)] ? 0 : 1;
        }
      }

      // Keep only the largest connected component (drops neighbor-tile slivers)
      {
        const seen = new Uint8Array(cw * chh);
        let bestComp = [];
        for (let p0 = 0; p0 < cw * chh; p0++) {
          if (!mask[p0] || seen[p0]) continue;
          const comp = [p0];
          seen[p0] = 1;
          for (let i = 0; i < comp.length; i++) {
            const p = comp[i];
            const x = p % cw, y = (p / cw) | 0;
            if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; comp.push(p - 1); }
            if (x < cw - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; comp.push(p + 1); }
            if (y > 0 && mask[p - cw] && !seen[p - cw]) { seen[p - cw] = 1; comp.push(p - cw); }
            if (y < chh - 1 && mask[p + cw] && !seen[p + cw]) { seen[p + cw] = 1; comp.push(p + cw); }
          }
          if (comp.length > bestComp.length) bestComp = comp;
        }
        const only = new Uint8Array(cw * chh);
        for (const p of bestComp) only[p] = 1;
        mask = only;
      }

      // Geometric shape fit to clip cast shadows
      if (r === 0) {
        // Round chip: fit an ellipse using robust (median) ray lengths from the centroid
        let sx = 0, sy = 0, n = 0;
        for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) if (mask[y * cw + x]) { sx += x; sy += y; n++; }
        const cx = sx / n, cy = sy / n;
        const ray = (dx, dy) => {
          let t = 0;
          for (;;) {
            const x = Math.round(cx + dx * t), y = Math.round(cy + dy * t);
            if (x < 0 || x >= cw || y < 0 || y >= chh || !mask[y * cw + x]) return t;
            t++;
          }
        };
        const sample = (a0, a1) => {
          const lens = [];
          for (let a = a0; a <= a1; a += 3) {
            const rad = (a * Math.PI) / 180;
            lens.push(ray(Math.cos(rad), Math.sin(rad)));
          }
          return median(lens);
        };
        const rRight = sample(-30, 30), rLeft = sample(150, 210);
        const rDown = sample(60, 120), rUp = sample(240, 300);
        const ecx = cx + (rRight - rLeft) / 2, ecy = cy + (rDown - rUp) / 2;
        const rx = (rRight + rLeft) / 2 + 0.5, ry = (rDown + rUp) / 2 + 0.5;
        // Reconstruct the mask as the FULL ellipse: chips are solid, so this
        // both clips shadows outside and repairs rim notches eaten by the
        // fringe cleanup (ragged edges on the white chips)
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            const ex = (x - ecx) / rx, ey = (y - ecy) / ry;
            mask[y * cw + x] = ex * ex + ey * ey <= 1 ? 1 : 0;
          }
        }
      } else {
        // Square tile: clip to a rect found by density thresholds. Tile
        // columns/rows are nearly full height/width; neighbor slivers and
        // shadow tabs are short and fall below the threshold.
        const colD = new Array(cw).fill(0), rowD = new Array(chh).fill(0);
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            if (mask[y * cw + x]) { colD[x]++; rowD[y]++; }
          }
        }
        // Threshold at 70% of max density: genuine tile edge columns are
        // ~85% dense (full height minus rounded corners) while leftover seam
        // strips between tiles are only ~65% dense.
        const cThr = Math.max(...colD) * 0.7, rThr = Math.max(...rowD) * 0.7;
        let L = 0; while (L < cw && colD[L] < cThr) L++;
        let R = cw - 1; while (R >= 0 && colD[R] < cThr) R--;
        let T = 0; while (T < chh && rowD[T] < rThr) T++;
        let B = chh - 1; while (B >= 0 && rowD[B] < rThr) B--;

        // Clean borders: analytic rounded-rect mask, slightly inset so the
        // worn/white tile rim is cut off
        const INSET = 3, RAD = 12;
        const rcx = (L + R) / 2, rcy = (T + B) / 2;
        const hw = (R - L) / 2 - INSET, hh = (B - T) / 2 - INSET;
        // Reconstruct the mask as the FULL rounded rect: tiles are solid, so
        // this also repairs any interior holes / rim notches eaten earlier
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            const qx = Math.abs(x - rcx) - (hw - RAD);
            const qy = Math.abs(y - rcy) - (hh - RAD);
            const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - RAD;
            mask[y * cw + x] = d <= 0 ? 1 : 0;
          }
        }

        // Locate the chip circle inside the tile (strongest circular
        // luminance edge) so retouching never touches the chip itself
        const lumAt = (x, y) => {
          const i = (y * cw + x) * 3;
          return (cellRGB[i] + cellRGB[i + 1] + cellRGB[i + 2]) / 3;
        };
        const tileW = Math.min(R - L, B - T);
        let bcx = rcx, bcy = rcy, br = tileW * 0.5;
        {
          // Collect scored candidates, then prefer the LARGEST circle whose
          // edge score is close to the best — over-protecting the chip is
          // safer than under-protecting it
          const cands = [];
          let bestScore = -Infinity;
          for (let dy = -10; dy <= 10; dy += 2) {
            for (let dx = -10; dx <= 10; dx += 2) {
              for (let rr2 = Math.round(tileW * 0.40); rr2 <= Math.round(tileW * 0.60); rr2 += 2) {
                let s = 0;
                for (let a = 0; a < 72; a++) {
                  const th = (a * Math.PI) / 36;
                  const ca = Math.cos(th), sa = Math.sin(th);
                  const xo = Math.round(rcx + dx + ca * (rr2 + 3));
                  const yo = Math.round(rcy + dy + sa * (rr2 + 3));
                  const xi = Math.round(rcx + dx + ca * (rr2 - 3));
                  const yi = Math.round(rcy + dy + sa * (rr2 - 3));
                  if (xo < 0 || xo >= cw || yo < 0 || yo >= chh || xi < 0 || xi >= cw || yi < 0 || yi >= chh) { s = -Infinity; break; }
                  s += Math.abs(lumAt(xo, yo) - lumAt(xi, yi));
                }
                if (s > -Infinity) {
                  cands.push([s, dx, dy, rr2]);
                  if (s > bestScore) bestScore = s;
                }
              }
            }
          }
          for (const [s, dx, dy, rr2] of cands) {
            if (s >= bestScore * 0.6 && rr2 > br) { bcx = rcx + dx; bcy = rcy + dy; br = rr2; }
          }
        }
        const protectR2 = (br + 6) * (br + 6);

        // Despeckle the stone background: suppress bright scuff/worn marks
        // near the tile borders (luminance outliers vs the stone median) by
        // replacing them with the local average of surrounding stone pixels
        const inBorderBand = (x, y) =>
          x - L < 18 || R - x < 18 || y - T < 18 || B - y < 18;
        const isStone = (x, y) => {
          const ddx = x - bcx, ddy = y - bcy;
          return mask[y * cw + x] && ddx * ddx + ddy * ddy > protectR2;
        };
        const stoneLums = [];
        for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) if (isStone(x, y)) stoneLums.push(lumAt(x, y));
        const medL = median(stoneLums);
        const scuffThr = medL + Math.max(16, medL * 0.15);
        const scuff = new Uint8Array(cw * chh);
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            if (isStone(x, y) && inBorderBand(x, y) && lumAt(x, y) > scuffThr) scuff[y * cw + x] = 1;
          }
        }
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            if (!scuff[y * cw + x]) continue;
            let sr = 0, sg = 0, sb = 0, n = 0;
            for (let yy = Math.max(0, y - 6); yy <= Math.min(chh - 1, y + 6); yy++) {
              for (let xx = Math.max(0, x - 6); xx <= Math.min(cw - 1, x + 6); xx++) {
                if (scuff[yy * cw + xx] || !isStone(xx, yy)) continue;
                const i = (yy * cw + xx) * 3;
                sr += cellRGB[i]; sg += cellRGB[i + 1]; sb += cellRGB[i + 2]; n++;
              }
            }
            if (n >= 4) {
              const i = (y * cw + x) * 3;
              cellRGB[i] = Math.round(sr / n);
              cellRGB[i + 1] = Math.round(sg / n);
              cellRGB[i + 2] = Math.round(sb / n);
            }
          }
        }
      }

      // Erode ERODE_PX px to shave the bg-contaminated (white halo) fringe
      for (let pass = 0; pass < ERODE_PX; pass++) {
        const eroded = [];
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            const p = y * cw + x;
            if (!mask[p]) continue;
            const onEdge =
              x === 0 || x === cw - 1 || y === 0 || y === chh - 1 ||
              !mask[p - 1] || !mask[p + 1] || !mask[p - cw] || !mask[p + cw] ||
              !mask[p - cw - 1] || !mask[p - cw + 1] || !mask[p + cw - 1] || !mask[p + cw + 1];
            if (onEdge) eroded.push(p);
          }
        }
        for (const p of eroded) mask[p] = 0;
      }
      const alphaF = new Float32Array(cw * chh);
      for (let p = 0; p < cw * chh; p++) alphaF[p] = mask[p] ? 1 : 0;

      // Feather: separable Gaussian [1,4,6,4,1]/16 on the alpha mask
      {
        const k = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
        const tmp = new Float32Array(cw * chh);
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            let s = 0;
            for (let d = -2; d <= 2; d++) {
              const xx = Math.min(cw - 1, Math.max(0, x + d));
              s += alphaF[y * cw + xx] * k[d + 2];
            }
            tmp[y * cw + x] = s;
          }
        }
        for (let x = 0; x < cw; x++) {
          for (let y = 0; y < chh; y++) {
            let s = 0;
            for (let d = -2; d <= 2; d++) {
              const yy = Math.min(chh - 1, Math.max(0, y + d));
              s += tmp[yy * cw + x] * k[d + 2];
            }
            alphaF[y * cw + x] = s;
          }
        }
      }

      // Compose RGBA cell and find tight bounds of visible pixels
      const cell = Buffer.alloc(cw * chh * 4);
      let bx0 = cw, bx1 = 0, by0 = chh, by1 = 0;
      for (let y = 0; y < chh; y++) {
        for (let x = 0; x < cw; x++) {
          const p = y * cw + x;
          let a = alphaF[p];
          if (a > 0.97) a = 1; else if (a < 0.03) a = 0;
          cell[p * 4] = cellRGB[p * 3];
          cell[p * 4 + 1] = cellRGB[p * 3 + 1];
          cell[p * 4 + 2] = cellRGB[p * 3 + 2];
          cell[p * 4 + 3] = Math.round(a * 255);
          if (a > 0) {
            if (x < bx0) bx0 = x;
            if (x > bx1) bx1 = x;
            if (y < by0) by0 = y;
            if (y > by1) by1 = y;
          }
        }
      }

      const left = Math.max(0, bx0 - PAD);
      const top = Math.max(0, by0 - PAD);
      const w = Math.min(cw, bx1 + 1 + PAD) - left;
      const h = Math.min(chh, by1 + 1 + PAD) - top;

      const name = (NAMES[r] && NAMES[r][c]) || `chip-r${r}-c${c}`;
      await sharp(cell, { raw: { width: cw, height: chh, channels: 4 } })
        .extract({ left, top, width: w, height: h })
        .png()
        .toFile(path.join(OUT_DIR, `${name}.png`));
      console.log(`${name}.png  ${w}x${h}  (row ${r}, col ${c})`);
      count++;
    }
  }

  console.log(`\nDone: ${count} chips written to ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
