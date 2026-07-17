import { onCleanup, onMount, createEffect } from 'solid-js';
import * as THREE from 'three';

/**
 * Rocket3D — redesigned crash rocket with:
 *  - Visible cockpit window (blue-tinted sphere)
 *  - Pair of side boosters
 *  - Layered thruster flame (white-hot core + flickering orange/green outer particles)
 *  - Fading particle smoke trail
 *  - Subtle rocking/tilt as it climbs, camera scale tied to multiplier
 *  - Genuine crash moment: explosion burst + debris particles + brief red screen flash
 *  - Parallax starfield (slow drift for depth)
 */
function Rocket3D(props) {
  let container;
  let renderer, scene, camera;
  let rocketGroup, glowLight, crashFlashMesh;
  let raf = 0;
  let resizeObserver;

  // ─── Particle buffers ─────────────────────────────────────────────────────
  let exhaustCoreGeo, exhaustCorePts;
  const exhaustCoreData = [];
  let exhaustOuterGeo, exhaustOuterPts;
  const exhaustOuterData = [];
  let smokeGeo, smokePts;
  const smokeData = [];
  let boomGeo, boomPts;
  const boomData = [];
  let debrisGeo, debrisPts;
  const debrisData = [];

  // Star layers for parallax
  let starLayerA_geo, starLayerA_pts;
  let starLayerB_geo, starLayerB_pts;
  const starAData = [], starBData = [];

  const N_CORE   = 80;
  const N_OUTER  = 180;
  const N_SMOKE  = 150;
  const N_BOOM   = 200;
  const N_DEBRIS = 60;
  const N_STAR_A = 280;
  const N_STAR_B = 160;

  // ─── Mutable state ─────────────────────────────────────────────────────────
  const state = {
    t: 0,
    multiplier: 1,
    isFlying: false,
    isCrashed: false,
    countdown: 0,
    speed: 0,       // smoothed 0..1 ascent intensity
    rocketVisible: true,
    crashFlashLife: 0,
  };

  let onCrash  = () => {};
  let onLaunch = () => {};

  createEffect(() => {
    const m       = props.multiplier || 1;
    const flying  = !!props.isFlying;
    const crashed = !!props.isCrashed;
    state.multiplier = m;
    state.countdown  = props.countdown || 0;
    if (crashed && !state.isCrashed) onCrash();
    if (flying  && !state.isFlying)  onLaunch();
    state.isFlying  = flying;
    state.isCrashed = crashed;
  });

  // ─── Build rocket ───────────────────────────────────────────────────────────
  function buildRocket() {
    rocketGroup = new THREE.Group();

    // Main body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe8edf5, metalness: 0.55, roughness: 0.28,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.40, 1.8, 28), bodyMat);
    body.position.y = 0.9;
    rocketGroup.add(body);

    // Nose cone — brighter green
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x1fd65f, metalness: 0.25, roughness: 0.25,
      emissive: 0x0c5a28, emissiveIntensity: 0.6,
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 28), noseMat);
    nose.position.y = 2.11;
    rocketGroup.add(nose);

    // Cockpit window — prominent blue sphere on nose
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x88d8ff, metalness: 0.05, roughness: 0.05,
      emissive: 0x2b7fa6, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.88,
    });
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), cockpitMat);
    cockpit.position.set(0, 1.55, 0.28);
    rocketGroup.add(cockpit);

    // Inner cockpit highlight
    const cockpitHighMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.22,
    });
    const cockpitHigh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), cockpitHighMat);
    cockpitHigh.position.set(-0.04, 1.58, 0.36);
    rocketGroup.add(cockpitHigh);

    // Fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x18b853, metalness: 0.4, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.44), finMat);
      const a   = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.38, 0.26, Math.sin(a) * 0.38);
      fin.rotation.y = -a;
      fin.rotation.x = 0.15;
      rocketGroup.add(fin);
    }

    // Nozzle ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40, 0.48, 0.20, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e2530, metalness: 0.75, roughness: 0.35 })
    );
    ring.position.y = -0.06;
    rocketGroup.add(ring);

    // ── Side boosters (left + right) ─────────────────────────────────────────
    const boosterBodyMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e8, metalness: 0.5, roughness: 0.35 });
    const boosterNoseMat = new THREE.MeshStandardMaterial({ color: 0x1fd65f, metalness: 0.25, roughness: 0.25, emissive: 0x0c5a28, emissiveIntensity: 0.4 });
    const boosterNozzleMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.75, roughness: 0.35 });

    [-0.7, 0.7].forEach((xOff) => {
      const g = new THREE.Group();
      const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 18), boosterBodyMat);
      bBody.position.y = 0.55;
      g.add(bBody);
      const bNose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 18), boosterNoseMat);
      bNose.position.y = 1.29;
      g.add(bNose);
      const bNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 18), boosterNozzleMat);
      bNozzle.position.y = -0.06;
      g.add(bNozzle);
      // Strut connecting booster to main body
      const strutMat = new THREE.MeshStandardMaterial({ color: 0x18b853, metalness: 0.4, roughness: 0.4 });
      const strut = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(xOff) - 0.18, 0.05, 0.06), strutMat);
      strut.position.set(xOff * 0.5, 0.6, 0);
      rocketGroup.add(strut);
      g.position.set(xOff, 0, 0);
      rocketGroup.add(g);
    });

    scene.add(rocketGroup);
  }

  // ─── Build starfields (two layers for parallax) ───────────────────────────
  function buildStars() {
    [
      { geo: 'starLayerA_geo', pts: 'starLayerA_pts', data: starAData, n: N_STAR_A, z: [-2, -8], size: 0.055, speed: 0.8 },
      { geo: 'starLayerB_geo', pts: 'starLayerB_pts', data: starBData, n: N_STAR_B, z: [-8, -18], size: 0.028, speed: 0.35 },
    ].forEach(({ geo, pts, data, n, z, size, speed }) => {
      const g   = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = Math.random() * 24 - 6;
        pos[i * 3 + 2] = z[0] + Math.random() * (z[1] - z[0]);
        data[i]        = { base: Math.random(), driftX: (Math.random() - 0.5) * 0.0005 };
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x9fb4d0, size, transparent: true, opacity: 0.75, depthWrite: false,
      });
      const p = new THREE.Points(g, mat);
      scene.add(p);
      if (geo === 'starLayerA_geo') { starLayerA_geo = g; starLayerA_pts = p; }
      else { starLayerB_geo = g; starLayerB_pts = p; }
    });
  }

  // ─── Exhaust: white-hot core ───────────────────────────────────────────────
  function buildExhaustCore() {
    exhaustCoreGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_CORE * 3);
    const col = new Float32Array(N_CORE * 3);
    for (let i = 0; i < N_CORE; i++) { pos[i * 3 + 1] = -999; exhaustCoreData[i] = { life: 0 }; }
    exhaustCoreGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    exhaustCoreGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.28, transparent: true, opacity: 1, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    exhaustCorePts = new THREE.Points(exhaustCoreGeo, mat);
    scene.add(exhaustCorePts);
  }

  // ─── Exhaust: outer flickering orange/green layer ─────────────────────────
  function buildExhaustOuter() {
    exhaustOuterGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_OUTER * 3);
    const col = new Float32Array(N_OUTER * 3);
    for (let i = 0; i < N_OUTER; i++) { pos[i * 3 + 1] = -999; exhaustOuterData[i] = { life: 0, seed: Math.random() }; }
    exhaustOuterGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    exhaustOuterGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.38, transparent: true, opacity: 0.85, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    exhaustOuterPts = new THREE.Points(exhaustOuterGeo, mat);
    scene.add(exhaustOuterPts);
  }

  // ─── Smoke trail ──────────────────────────────────────────────────────────
  function buildSmoke() {
    smokeGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_SMOKE * 3);
    const col = new Float32Array(N_SMOKE * 3);
    for (let i = 0; i < N_SMOKE; i++) { pos[i * 3 + 1] = -999; smokeData[i] = { life: 0 }; }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    smokeGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55, transparent: true, opacity: 0.45, vertexColors: true,
      depthWrite: false,
    });
    smokePts = new THREE.Points(smokeGeo, mat);
    scene.add(smokePts);
  }

  // ─── Explosion burst ──────────────────────────────────────────────────────
  function buildBoom() {
    boomGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_BOOM * 3);
    const col = new Float32Array(N_BOOM * 3);
    for (let i = 0; i < N_BOOM; i++) { pos[i * 3 + 1] = -999; boomData[i] = { life: 0 }; }
    boomGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    boomGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.32, transparent: true, opacity: 1, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    boomPts = new THREE.Points(boomGeo, mat);
    boomPts.visible = false;
    scene.add(boomPts);
  }

  // ─── Debris chunks ────────────────────────────────────────────────────────
  function buildDebris() {
    debrisGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_DEBRIS * 3);
    const col = new Float32Array(N_DEBRIS * 3);
    for (let i = 0; i < N_DEBRIS; i++) { pos[i * 3 + 1] = -999; debrisData[i] = { life: 0, vx: 0, vy: 0, vz: 0 }; }
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    debrisGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.18, transparent: true, opacity: 1, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    debrisPts = new THREE.Points(debrisGeo, mat);
    debrisPts.visible = false;
    scene.add(debrisPts);
  }

  // ─── Update functions ──────────────────────────────────────────────────────
  function updateRocket(dt) {
    if (!rocketGroup || !state.rocketVisible) return;
    const t     = state.t;
    const sp    = state.speed;
    // Rocking motion — amplitude grows with speed
    const rockZ = Math.sin(t * 1.8) * (0.04 + sp * 0.10);
    const rockX = Math.cos(t * 2.3) * (0.015 + sp * 0.03);
    rocketGroup.rotation.z += (rockZ - rocketGroup.rotation.z) * Math.min(1, dt * 3.5);
    rocketGroup.rotation.y += dt * 0.28;

    // Camera zoom tied to multiplier for sense of acceleration
    const zoomTarget = 8.5 - Math.min(3.2, Math.log(Math.max(1, state.multiplier)) * 0.9);
    camera.position.z += (zoomTarget - camera.position.z) * Math.min(1, dt * 1.4);

    // Ascent height
    const yTarget = state.isFlying ? 0.2 + sp * 0.75 : (state.countdown > 0 ? -0.35 : 0);
    rocketGroup.position.y += (yTarget - rocketGroup.position.y) * Math.min(1, dt * 2.8);
    rocketGroup.position.x = Math.sin(t * 2) * 0.04 + (Math.random() - 0.5) * 0.02 * sp;
  }

  function updateStars(dt) {
    const driftSpeed  = (1.4 + state.speed * 22) * dt;
    const driftSpeedB = (0.6 + state.speed * 8) * dt;

    [[starLayerA_geo, starAData, N_STAR_A, driftSpeed, 0.05 + state.speed * 0.05],
     [starLayerB_geo, starBData, N_STAR_B, driftSpeedB, 0.025]].forEach(([geo, data, n, spd, sz]) => {
      if (!geo) return;
      const pos = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        pos[i * 3]     += data[i].driftX;
        pos[i * 3 + 1] -= spd * (0.5 + data[i].base * 0.8);
        if (pos[i * 3 + 1] < -7) {
          pos[i * 3]     = (Math.random() - 0.5) * 18;
          pos[i * 3 + 1] = 16 + Math.random() * 5;
        }
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  function updateExhaustCore(dt) {
    const pos  = exhaustCoreGeo.attributes.position.array;
    const col  = exhaustCoreGeo.attributes.color.array;
    const base = new THREE.Vector3();
    rocketGroup.getWorldPosition(base);
    const emitting = state.rocketVisible && !state.isCrashed;
    const rate     = state.isFlying ? Math.round(4 + state.speed * 16) : 1;
    let toSpawn = emitting ? rate : 0;
    for (let i = 0; i < N_CORE; i++) {
      const p = exhaustCoreData[i];
      if (p.life > 0) {
        p.life -= dt * 3.5;
        pos[i * 3]     += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        const l = Math.max(0, p.life);
        // White-hot core → yellow → fade
        col[i * 3]     = 1.0;
        col[i * 3 + 1] = 0.85 + 0.15 * l;
        col[i * 3 + 2] = l > 0.5 ? (l - 0.5) * 2 : 0;
      } else if (toSpawn > 0) {
        toSpawn--;
        p.life = 1;
        pos[i * 3]     = base.x + (Math.random() - 0.5) * 0.12;
        pos[i * 3 + 1] = base.y - 0.15;
        pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.12;
        const sp2 = 0.3 + state.speed;
        p.vx = (Math.random() - 0.5) * 0.35;
        p.vy = -(1.8 + state.speed * 5.5) - Math.random() * sp2;
        p.vz = (Math.random() - 0.5) * 0.35;
        col[i * 3] = 1; col[i * 3 + 1] = 1; col[i * 3 + 2] = 1;
      } else {
        pos[i * 3 + 1] = -999;
      }
    }
    exhaustCoreGeo.attributes.position.needsUpdate = true;
    exhaustCoreGeo.attributes.color.needsUpdate    = true;
  }

  function updateExhaustOuter(dt) {
    const pos  = exhaustOuterGeo.attributes.position.array;
    const col  = exhaustOuterGeo.attributes.color.array;
    const base = new THREE.Vector3();
    rocketGroup.getWorldPosition(base);
    const emitting = state.rocketVisible && !state.isCrashed;
    const rate     = state.isFlying ? Math.round(8 + state.speed * 28) : 2;
    let toSpawn = emitting ? rate : 0;
    for (let i = 0; i < N_OUTER; i++) {
      const p = exhaustOuterData[i];
      if (p.life > 0) {
        p.life -= dt * 2.2;
        pos[i * 3]     += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        const l = Math.max(0, p.life);
        // Outer layer: orange → neon green — alternates by seed
        const useGreen = p.seed > 0.45;
        if (useGreen) {
          col[i * 3]     = 0.12 * l;
          col[i * 3 + 1] = 0.85;
          col[i * 3 + 2] = 0.37 * l;
        } else {
          col[i * 3]     = 1.0;
          col[i * 3 + 1] = 0.38 + 0.2 * l;
          col[i * 3 + 2] = 0.0;
        }
        // Flickering opacity via fast sin
        exhaustOuterPts.material.opacity = 0.6 + Math.sin(state.t * 28) * 0.25;
      } else if (toSpawn > 0) {
        toSpawn--;
        p.life = 1;
        pos[i * 3]     = base.x + (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 1] = base.y - 0.2;
        pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.3;
        const spread = 0.7 + state.speed;
        p.vx = (Math.random() - 0.5) * 1.0;
        p.vy = -(1.0 + state.speed * 3.8) - Math.random() * spread;
        p.vz = (Math.random() - 0.5) * 1.0;
      } else {
        pos[i * 3 + 1] = -999;
      }
    }
    exhaustOuterGeo.attributes.position.needsUpdate = true;
    exhaustOuterGeo.attributes.color.needsUpdate    = true;
  }

  function updateSmoke(dt) {
    const pos  = smokeGeo.attributes.position.array;
    const col  = smokeGeo.attributes.color.array;
    const base = new THREE.Vector3();
    rocketGroup.getWorldPosition(base);
    const emitting = state.rocketVisible && !state.isCrashed;
    // Booster nozzle positions (approx world)
    const emitSources = [
      { x: base.x - 0.7, y: base.y - 0.1, z: base.z },
      { x: base.x + 0.7, y: base.y - 0.1, z: base.z },
      { x: base.x,       y: base.y - 0.15, z: base.z },
    ];
    const rate = emitting ? (state.isFlying ? 4 : 1) : 0;
    let toSpawn = rate;
    for (let i = 0; i < N_SMOKE; i++) {
      const p = smokeData[i];
      if (p.life > 0) {
        p.life -= dt * 0.9;
        pos[i * 3]     += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        const l = Math.max(0, p.life);
        const gray = 0.22 + (1 - l) * 0.14;
        col[i * 3] = gray; col[i * 3 + 1] = gray; col[i * 3 + 2] = gray;
        smokePts.material.opacity = 0.32 + state.speed * 0.15;
      } else if (toSpawn > 0) {
        toSpawn--;
        const src = emitSources[Math.floor(Math.random() * emitSources.length)];
        p.life = 1;
        pos[i * 3]     = src.x + (Math.random() - 0.5) * 0.2;
        pos[i * 3 + 1] = src.y;
        pos[i * 3 + 2] = src.z + (Math.random() - 0.5) * 0.2;
        p.vx = (Math.random() - 0.5) * 0.35;
        p.vy = -(0.5 + state.speed * 2.2);
        p.vz = (Math.random() - 0.5) * 0.35;
        const gray = 0.22;
        col[i * 3] = gray; col[i * 3 + 1] = gray; col[i * 3 + 2] = gray;
      } else {
        pos[i * 3 + 1] = -999;
      }
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.color.needsUpdate    = true;
  }

  function updateBoom(dt) {
    if (!boomPts.visible) return;
    const pos = boomGeo.attributes.position.array;
    const col = boomGeo.attributes.color.array;
    let anyAlive = false;
    for (let i = 0; i < N_BOOM; i++) {
      const p = boomData[i];
      if (p.life <= 0) continue;
      anyAlive = true;
      p.life   -= dt * 0.85;
      p.vy     -= dt * 0.4; // gravity
      pos[i * 3]     += p.vx;
      pos[i * 3 + 1] += p.vy;
      pos[i * 3 + 2] += p.vz;
      const l = Math.max(0, p.life);
      col[i * 3]     = 1.0;
      col[i * 3 + 1] = 0.3 * l + 0.05;
      col[i * 3 + 2] = 0.05 * l;
    }
    boomGeo.attributes.position.needsUpdate = true;
    boomGeo.attributes.color.needsUpdate    = true;
    if (!anyAlive) boomPts.visible = false;
  }

  function updateDebris(dt) {
    if (!debrisPts.visible) return;
    const pos = debrisGeo.attributes.position.array;
    const col = debrisGeo.attributes.color.array;
    let anyAlive = false;
    for (let i = 0; i < N_DEBRIS; i++) {
      const p = debrisData[i];
      if (p.life <= 0) continue;
      anyAlive = true;
      p.life   -= dt * 0.55;
      p.vy     -= dt * 0.6;
      pos[i * 3]     += p.vx;
      pos[i * 3 + 1] += p.vy;
      pos[i * 3 + 2] += p.vz;
      const l = Math.max(0, p.life);
      // Silver/grey debris chunks
      const g = 0.6 * l + 0.25;
      col[i * 3] = g; col[i * 3 + 1] = g; col[i * 3 + 2] = g;
    }
    debrisGeo.attributes.position.needsUpdate = true;
    debrisGeo.attributes.color.needsUpdate    = true;
    if (!anyAlive) debrisPts.visible = false;
  }

  function updateCrashFlash(dt) {
    if (state.crashFlashLife <= 0 || !crashFlashMesh) return;
    state.crashFlashLife -= dt * 2.8;
    const a = Math.max(0, state.crashFlashLife) * 0.55;
    crashFlashMesh.material.opacity = a;
    crashFlashMesh.visible = a > 0.005;
  }

  onMount(() => {
    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 500;

    scene    = new THREE.Scene();
    camera   = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 8.5);
    camera.lookAt(0, 1.4, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x557799, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 7, 5);
    scene.add(dir);
    glowLight = new THREE.PointLight(0x1fd65f, 2.5, 10);
    glowLight.position.set(0, 0.2, 0.5);
    scene.add(glowLight);

    // Red accent light (dim until crash)
    const redLight = new THREE.PointLight(0xff2200, 0, 14);
    redLight.position.set(0, 1, 0);
    scene.add(redLight);

    // Screen flash quad
    const flashGeo = new THREE.PlaneGeometry(24, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xff1100, transparent: true, opacity: 0, depthWrite: false,
    });
    crashFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    crashFlashMesh.position.set(0, 1.4, 4.5);
    crashFlashMesh.visible = false;
    scene.add(crashFlashMesh);

    buildRocket();
    buildStars();
    buildExhaustCore();
    buildExhaustOuter();
    buildSmoke();
    buildBoom();
    buildDebris();

    onLaunch = () => {
      boomPts.visible   = false;
      debrisPts.visible = false;
      state.rocketVisible = true;
      state.crashFlashLife = 0;
      if (crashFlashMesh) { crashFlashMesh.material.opacity = 0; crashFlashMesh.visible = false; }
      rocketGroup.visible = true;
      rocketGroup.position.set(0, 0, 0);
      redLight.intensity = 0;
    };

    onCrash = () => {
      const origin = new THREE.Vector3();
      rocketGroup.getWorldPosition(origin);

      // Explosion burst
      boomPts.visible = true;
      const boomPos = boomGeo.attributes.position.array;
      const boomCol = boomGeo.attributes.color.array;
      for (let i = 0; i < N_BOOM; i++) {
        boomPos[i * 3]     = origin.x;
        boomPos[i * 3 + 1] = origin.y + 0.5;
        boomPos[i * 3 + 2] = origin.z;
        const d = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 1.5 - 0.5,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(0.06 + Math.random() * 0.22);
        boomData[i] = { life: 1, vx: d.x, vy: d.y, vz: d.z };
        boomCol[i * 3] = 1; boomCol[i * 3 + 1] = 0.35; boomCol[i * 3 + 2] = 0.05;
      }
      boomGeo.attributes.position.needsUpdate = true;
      boomGeo.attributes.color.needsUpdate    = true;

      // Debris chunks
      debrisPts.visible = true;
      const debPos = debrisGeo.attributes.position.array;
      const debCol = debrisGeo.attributes.color.array;
      for (let i = 0; i < N_DEBRIS; i++) {
        debPos[i * 3]     = origin.x + (Math.random() - 0.5) * 0.3;
        debPos[i * 3 + 1] = origin.y + 0.4;
        debPos[i * 3 + 2] = origin.z;
        const v = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2.5,
          (Math.random() - 0.5) * 3
        ).multiplyScalar(0.04 + Math.random() * 0.09);
        debrisData[i] = { life: 1, vx: v.x, vy: v.y, vz: v.z };
        debCol[i * 3] = 0.85; debCol[i * 3 + 1] = 0.85; debCol[i * 3 + 2] = 0.85;
      }
      debrisGeo.attributes.position.needsUpdate = true;
      debrisGeo.attributes.color.needsUpdate    = true;

      // Red screen flash
      state.crashFlashLife = 1;
      crashFlashMesh.visible = true;
      redLight.intensity = 6;
      setTimeout(() => { if (redLight) redLight.intensity = 0; }, 600);

      rocketGroup.visible = false;
      state.rocketVisible = false;
    };

    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      state.t += dt;

      const target = state.isFlying
        ? Math.min(1, Math.log(Math.max(1, state.multiplier)) / Math.log(15))
        : 0;
      state.speed += (target - state.speed) * Math.min(1, dt * 3.8);

      updateRocket(dt);
      updateStars(dt);
      updateExhaustCore(dt);
      updateExhaustOuter(dt);
      updateSmoke(dt);
      updateBoom(dt);
      updateDebris(dt);
      updateCrashFlash(dt);

      if (glowLight) {
        const b = state.isCrashed ? 0.3 : 1.8 + state.speed * 2.8;
        glowLight.intensity = b + Math.sin(state.t * 32) * 0.4 * (0.3 + state.speed);
        glowLight.color.set(state.isCrashed ? 0xff2200 : 0x1fd65f);
      }

      renderer.render(scene, camera);
    };
    animate();

    resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);
  });

  onCleanup(() => {
    cancelAnimationFrame(raf);
    if (resizeObserver) resizeObserver.disconnect();
    if (scene) {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    if (renderer) {
      renderer.dispose();
      const el = renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  });

  return (
    <div
      ref={container}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

export default Rocket3D;
