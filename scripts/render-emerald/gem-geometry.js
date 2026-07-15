// Custom faceted emerald gem geometry — elongated octagonal bipyramid with
// beveled tip facets and a girdle band. Original facet arrangement (not copied
// from the reference asset; only the overall silhouette proportions match).
import * as THREE from 'three';

/**
 * Profile rings from top to bottom: { y, r, twist }.
 * `twist` (in segment fractions) offsets alternate rings so the quads between
 * rings triangulate into diamond-shaped facets instead of a plain prism.
 */
const SEGMENTS = 8;
const RINGS = [
  { y: 1.02, r: 0.0, twist: 0.0 }, // top apex
  { y: 0.94, r: 0.09, twist: 0.5 }, // tip bevel
  { y: 0.58, r: 0.34, twist: 0.0 }, // upper crown
  { y: 0.14, r: 0.52, twist: 0.5 }, // girdle top
  { y: -0.14, r: 0.52, twist: 0.5 }, // girdle bottom
  { y: -0.58, r: 0.34, twist: 0.0 }, // lower pavilion
  { y: -0.94, r: 0.09, twist: 0.5 }, // tip bevel
  { y: -1.02, r: 0.0, twist: 0.0 }, // bottom apex
];

function ringPoint(ring, i) {
  const a = ((i + ring.twist) / SEGMENTS) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r);
}

export function createGemGeometry() {
  const positions = [];
  const push = (a, b, c) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);

  for (let ri = 0; ri < RINGS.length - 1; ri++) {
    const top = RINGS[ri];
    const bot = RINGS[ri + 1];
    for (let i = 0; i < SEGMENTS; i++) {
      const t0 = ringPoint(top, i);
      const t1 = ringPoint(top, i + 1);
      const b0 = ringPoint(bot, i);
      const b1 = ringPoint(bot, i + 1);
      if (top.r === 0) {
        push(t0, b0, b1); // fan from top apex
      } else if (bot.r === 0) {
        push(t0, b0, t1); // fan to bottom apex
      } else {
        // Split quad along the diagonal to form diamond facets
        push(t0, b0, b1);
        push(t0, b1, t1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // Non-indexed vertices => computeVertexNormals yields flat per-facet normals
  geometry.computeVertexNormals();
  return geometry;
}
