import { onCleanup, onMount, createEffect } from 'solid-js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Full 3D crash scene (brand-green theme):
 *  - Neon perspective grid floor that scrolls with speed
 *  - Nebula/vignette backdrop
 *  - Exponential multiplier curve (m = headM^t) rendered as a glowing fat line
 *  - Rocket riding the head of the curve, oriented along the tangent, with exhaust
 *  - Player bet markers pinned along the curve
 *  - Explosion burst on crash
 *  - Bloom post-processing with an automatic mobile fallback
 *
 * Props: multiplier, isFlying, isCrashed, countdown, axisMax, bets
 */
const GREEN = new THREE.Color(0x1fd65f);
const RED = new THREE.Color(0xff5141);

// Curve mapping bounds (world units)
const X_LEFT = -8.5;
const X_RIGHT = 7.5;
const BASE_Y = 0.35;
const SPAN_Y = 7.2;
const CURVE_SAMPLES = 60;

function isLowEnd() {
  try {
    const mob = window.matchMedia('(max-width: 768px)').matches;
    const cores = navigator.hardwareConcurrency || 8;
    return mob || cores <= 4;
  } catch (e) {
    return false;
  }
}

function Rocket3DScene(props) {
  let container;

  let renderer, scene, camera, composer;
  let useBloom = false;
  let rocketGroup, glowLight, floorMat;
  let curveLine, curveGeo, curveMat;
  let exhaustGeo, exhaustPts;
  let boomGeo, boomPts;
  let markerGroup;
  const exhaustData = [];
  const boomData = [];
  const N_EXHAUST = 240;
  const N_BOOM = 300;

  // marker sprites keyed by bet id
  const markerMap = new Map();

  let raf = 0;
  let resizeObserver;

  const state = {
    multiplier: 1,
    axisMax: 2,
    isFlying: false,
    isCrashed: false,
    countdown: 0,
    t: 0,
    speed: 0,
    rocketVisible: true,
  };

  let onCrash = () => {};
  let onLaunch = () => {};

  createEffect(() => {
    const m = props.multiplier || 1;
    const flying = !!props.isFlying;
    const crashed = !!props.isCrashed;

    state.multiplier = m;
    state.axisMax = props.axisMax || Math.max(2, m * 1.4);
    state.countdown = props.countdown || 0;

    if (crashed && !state.isCrashed) onCrash();
    if (flying && !state.isFlying) onLaunch();

    state.isFlying = flying;
    state.isCrashed = crashed;
  });

  // rebuild markers when the bet list changes
  createEffect(() => {
    const bets = props.bets || [];
    if (!markerGroup) return;
    syncMarkers(bets);
  });

  function curvePoint(t, headM, axisMax, out) {
    const m = Math.pow(Math.max(1, headM), t); // 1..headM
    const x = X_LEFT + (X_RIGHT - X_LEFT) * t;
    const y = BASE_Y + ((m - 1) / Math.max(0.0001, axisMax - 1)) * SPAN_Y;
    (out || (out = new THREE.Vector3())).set(x, y, 0);
    return out;
  }

  function buildFloor() {
    const geo = new THREE.PlaneGeometry(60, 60, 1, 1);
    floorMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.4 },
        uColor: { value: new THREE.Color(0x1fd65f) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;
        uniform vec3 uColor;
        void main() {
          vec2 uv = vUv * vec2(46.0, 46.0);
          uv.y += uTime * uSpeed * 46.0;
          vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
          float line = min(g.x, g.y);
          float grid = 1.0 - min(line, 1.0);
          float fadeFar = smoothstep(0.0, 0.35, vUv.y);
          float fadeNear = smoothstep(1.0, 0.75, vUv.y);
          float a = grid * fadeFar * fadeNear;
          gl_FragColor = vec4(uColor * (0.6 + grid * 0.8), a * 0.55);
        }
      `,
    });
    const floor = new THREE.Mesh(geo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -6);
    scene.add(floor);
  }

  function buildBackdrop() {
    // radial nebula glow behind the action
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(256, 230, 40, 256, 256, 300);
    g.addColorStop(0, 'rgba(31,214,95,0.16)');
    g.addColorStop(0.35, 'rgba(20,40,60,0.10)');
    g.addColorStop(1, 'rgba(4,7,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(26, 26, 1);
    sprite.position.set(0, 4, -10);
    scene.add(sprite);
  }

  function buildRocket() {
    rocketGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeef2f7, metalness: 0.55, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.1, 24), bodyMat);
    body.position.y = 0.55;
    rocketGroup.add(body);

    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1fd65f, metalness: 0.3, roughness: 0.3, emissive: 0x0f7d38, emissiveIntensity: 0.9 });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 24), noseMat);
    nose.position.y = 1.35;
    rocketGroup.add(nose);

    const winMat = new THREE.MeshStandardMaterial({ color: 0x9ff0ff, metalness: 0.1, roughness: 0.05, emissive: 0x2b7fa6, emissiveIntensity: 0.9 });
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 18), winMat);
    win.position.set(0, 0.75, 0.22);
    rocketGroup.add(win);

    const finMat = new THREE.MeshStandardMaterial({ color: 0x18b853, metalness: 0.4, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.28), finMat);
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.24, 0.16, Math.sin(a) * 0.24);
      fin.rotation.y = -a;
      fin.rotation.x = 0.15;
      rocketGroup.add(fin);
    }

    scene.add(rocketGroup);
  }

  function buildCurve() {
    curveGeo = new LineGeometry();
    const init = new Array(CURVE_SAMPLES * 3).fill(0);
    curveGeo.setPositions(init);
    curveMat = new LineMaterial({
      color: 0x1fd65f,
      linewidth: 3.2, // px
      transparent: true,
      opacity: 0.95,
      dashed: false,
    });
    curveMat.resolution.set(container.clientWidth || 800, container.clientHeight || 500);
    curveLine = new Line2(curveGeo, curveMat);
    curveLine.computeLineDistances();
    curveLine.visible = false;
    scene.add(curveLine);
  }

  function buildExhaust() {
    exhaustGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_EXHAUST * 3);
    const col = new Float32Array(N_EXHAUST * 3);
    for (let i = 0; i < N_EXHAUST; i++) {
      pos[i * 3 + 1] = -999;
      exhaustData[i] = { life: 0, vx: 0, vy: 0, vz: 0 };
    }
    exhaustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    exhaustGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.2, transparent: true, opacity: 0.95, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
    exhaustPts = new THREE.Points(exhaustGeo, mat);
    scene.add(exhaustPts);
  }

  function buildBoom() {
    boomGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_BOOM * 3);
    const col = new Float32Array(N_BOOM * 3);
    for (let i = 0; i < N_BOOM; i++) {
      pos[i * 3 + 1] = -999;
      boomData[i] = { life: 0, vx: 0, vy: 0, vz: 0 };
    }
    boomGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    boomGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.28, transparent: true, opacity: 1, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
    boomPts = new THREE.Points(boomGeo, mat);
    boomPts.visible = false;
    scene.add(boomPts);
  }

  // markers
  function makeMarkerTexture(bet) {
    const cashed = !!bet.cashoutPoint;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = cashed ? 'rgba(31,214,95,0.18)' : 'rgba(18,21,28,0.85)';
    ctx.strokeStyle = cashed ? 'rgba(31,214,95,0.9)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    roundRect(ctx, 30, 10, 120, 42, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cashed ? '#1fd65f' : '#3a4250';
    ctx.beginPath();
    ctx.arc(50, 31, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((bet.user?.username || '?').charAt(0).toUpperCase(), 50, 32);
    ctx.fillStyle = cashed ? '#1fd65f' : '#c3cad6';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    const amt = cashed ? `${bet.cashoutPoint.toFixed(2)}x` : `${(bet.amount || 0).toFixed(2)}`;
    ctx.fillText(amt, 72, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function syncMarkers(bets) {
    const capped = bets.slice(0, 12);
    const seen = new Set();
    capped.forEach((bet) => {
      seen.add(bet.id);
      let entry = markerMap.get(bet.id);
      const cashedNow = !!bet.cashoutPoint;
      if (!entry) {
        const mat = new THREE.SpriteMaterial({ map: makeMarkerTexture(bet), transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.5, 0.9, 1);
        markerGroup.add(sprite);
        entry = { sprite, cashed: cashedNow, t: 1 };
        markerMap.set(bet.id, entry);
      } else if (entry.cashed !== cashedNow) {
        entry.sprite.material.map.dispose();
        entry.sprite.material.map = makeMarkerTexture(bet);
        entry.sprite.material.needsUpdate = true;
        entry.cashed = cashedNow;
      }
      entry.bet = bet;
    });
    for (const [id, entry] of markerMap) {
      if (!seen.has(id)) {
        markerGroup.remove(entry.sprite);
        entry.sprite.material.map?.dispose();
        entry.sprite.material.dispose();
        markerMap.delete(id);
      }
    }
  }

  function updateMarkers() {
    const headM = state.multiplier;
    const show = state.isFlying || state.isCrashed;
    let idx = 0;
    const tmp = new THREE.Vector3();
    for (const [, entry] of markerMap) {
      const bet = entry.bet;
      if (!show) {
        entry.sprite.visible = false;
        continue;
      }
      entry.sprite.visible = true;
      let t;
      if (bet.cashoutPoint && bet.cashoutPoint > 1 && headM > 1) {
        t = Math.min(1, Math.log(bet.cashoutPoint) / Math.log(headM));
      } else {
        t = 1;
      }
      curvePoint(t, headM, state.axisMax, tmp);
      const stagger = bet.cashoutPoint ? 0.55 : 0.55 + (idx % 4) * 0.5;
      entry.sprite.position.set(tmp.x + (bet.cashoutPoint ? -0.2 : 0.6), tmp.y + stagger, 0.2);
      idx++;
    }
  }

  function updateCurve() {
    if (!state.isFlying && !state.isCrashed) {
      curveLine.visible = false;
      return;
    }
    curveLine.visible = true;
    const headM = state.multiplier;
    const arr = new Array(CURVE_SAMPLES * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < CURVE_SAMPLES; i++) {
      const t = i / (CURVE_SAMPLES - 1);
      curvePoint(t, headM, state.axisMax, p);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = 0;
    }
    curveGeo.setPositions(arr);
    curveLine.computeLineDistances();
    curveMat.color.copy(state.isCrashed ? RED : GREEN);
  }

  function updateRocket(dt) {
    if (!rocketGroup || !state.rocketVisible) return;
    const headM = state.multiplier;
    const tip = new THREE.Vector3();
    const prev = new THREE.Vector3();

    if (state.isFlying) {
      curvePoint(1, headM, state.axisMax, tip);
      curvePoint(0.98, headM, state.axisMax, prev);
    } else {
      tip.set(X_LEFT + 1.2, BASE_Y + 0.1 + Math.sin(state.t * 2) * 0.05, 0);
      prev.set(tip.x - 0.02, tip.y - 0.3, 0);
    }

    rocketGroup.position.lerp(tip, Math.min(1, dt * 12));

    const tangent = tip.clone().sub(prev).normalize();
    if (tangent.lengthSq() > 0.0001) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      rocketGroup.quaternion.slerp(q, Math.min(1, dt * 8));
    }
    const shake = state.speed;
    rocketGroup.position.x += (Math.random() - 0.5) * 0.02 * shake;
    rocketGroup.position.y += (Math.random() - 0.5) * 0.02 * shake;
  }

  function updateFloor(dt) {
    if (!floorMat) return;
    floorMat.uniforms.uTime.value += dt;
    floorMat.uniforms.uSpeed.value = 0.25 + state.speed * 1.6;
    floorMat.uniforms.uColor.value.copy(state.isCrashed ? RED : GREEN);
  }

  function updateExhaust(dt) {
    const pos = exhaustGeo.attributes.position.array;
    const col = exhaustGeo.attributes.color.array;
    const base = rocketGroup.position;
    const back = new THREE.Vector3(0, -1, 0).applyQuaternion(rocketGroup.quaternion).normalize();

    const emitting = state.rocketVisible && !state.isCrashed;
    const rate = state.isFlying ? Math.round(8 + state.speed * 22) : 3;
    let toSpawn = emitting ? rate : 0;

    for (let i = 0; i < N_EXHAUST; i++) {
      const pd = exhaustData[i];
      if (pd.life > 0) {
        pd.life -= dt * 2.6;
        pos[i * 3] += pd.vx * dt;
        pos[i * 3 + 1] += pd.vy * dt;
        pos[i * 3 + 2] += pd.vz * dt;
        const l = Math.max(0, pd.life);
        col[i * 3] = 1.0 * (1 - l) + 0.12 * l;
        col[i * 3 + 1] = 0.55 * (1 - l) + 0.84 * l;
        col[i * 3 + 2] = 0.2 * (1 - l) + 0.37 * l;
      } else if (toSpawn > 0) {
        toSpawn--;
        pd.life = 1;
        pos[i * 3] = base.x + back.x * 0.5 + (Math.random() - 0.5) * 0.15;
        pos[i * 3 + 1] = base.y + back.y * 0.5 + (Math.random() - 0.5) * 0.15;
        pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.15;
        const sp = 2.5 + state.speed * 4;
        pd.vx = back.x * sp + (Math.random() - 0.5) * 0.5;
        pd.vy = back.y * sp + (Math.random() - 0.5) * 0.5;
        pd.vz = (Math.random() - 0.5) * 0.5;
        col[i * 3] = 0.12; col[i * 3 + 1] = 0.84; col[i * 3 + 2] = 0.37;
      } else {
        pos[i * 3 + 1] = -999;
      }
    }
    exhaustGeo.attributes.position.needsUpdate = true;
    exhaustGeo.attributes.color.needsUpdate = true;
  }

  function updateBoom(dt) {
    if (!boomPts.visible) return;
    const pos = boomGeo.attributes.position.array;
    const col = boomGeo.attributes.color.array;
    let alive = false;
    for (let i = 0; i < N_BOOM; i++) {
      const pd = boomData[i];
      if (pd.life <= 0) continue;
      alive = true;
      pd.life -= dt * 0.9;
      pd.vy -= dt * 0.25;
      pos[i * 3] += pd.vx;
      pos[i * 3 + 1] += pd.vy;
      pos[i * 3 + 2] += pd.vz;
      const l = Math.max(0, pd.life);
      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.35 * l + 0.12;
      col[i * 3 + 2] = 0.1 * l;
    }
    boomGeo.attributes.position.needsUpdate = true;
    boomGeo.attributes.color.needsUpdate = true;
    if (!alive) boomPts.visible = false;
  }

  onMount(() => {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070f, 0.03);

    camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
    camera.position.set(0, 4.2, 15);
    camera.lookAt(0.5, 3.4, -2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x5a7a99, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 8, 6);
    scene.add(dir);
    glowLight = new THREE.PointLight(0x1fd65f, 2.2, 12);
    scene.add(glowLight);

    markerGroup = new THREE.Group();
    scene.add(markerGroup);

    buildBackdrop();
    buildFloor();
    buildCurve();
    buildRocket();
    buildExhaust();
    buildBoom();
    syncMarkers(props.bets || []);

    useBloom = !isLowEnd();
    if (useBloom) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.7, 0.2);
      composer.addPass(bloom);
      composer.setSize(width, height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    onLaunch = () => {
      boomPts.visible = false;
      state.rocketVisible = true;
      rocketGroup.visible = true;
    };

    onCrash = () => {
      boomPts.visible = true;
      const pos = boomGeo.attributes.position.array;
      const o = rocketGroup.position;
      for (let i = 0; i < N_BOOM; i++) {
        pos[i * 3] = o.x;
        pos[i * 3 + 1] = o.y + 0.4;
        pos[i * 3 + 2] = o.z;
        const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(0.06 + Math.random() * 0.16);
        boomData[i] = { vx: d.x, vy: d.y, vz: d.z, life: 1 };
      }
      boomGeo.attributes.position.needsUpdate = true;
      rocketGroup.visible = false;
      state.rocketVisible = false;
    };

    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      state.t += dt;

      const target = state.isFlying ? Math.min(1, Math.log(Math.max(1, state.multiplier)) / Math.log(15)) : 0;
      state.speed += (target - state.speed) * Math.min(1, dt * 4);

      updateFloor(dt);
      updateCurve();
      updateRocket(dt);
      updateMarkers();
      updateExhaust(dt);
      updateBoom(dt);

      if (glowLight) {
        glowLight.position.copy(rocketGroup.position);
        glowLight.intensity = (state.isCrashed ? 0.6 : 1.8 + state.speed * 2.6) + Math.sin(state.t * 28) * 0.25;
        glowLight.color.copy(state.isCrashed ? RED : GREEN);
      }

      if (useBloom && composer) composer.render();
      else renderer.render(scene, camera);
    };
    animate();

    resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
      if (curveMat) curveMat.resolution.set(w, h);
    });
    resizeObserver.observe(container);
  });

  onCleanup(() => {
    cancelAnimationFrame(raf);
    if (resizeObserver) resizeObserver.disconnect();
    for (const [, entry] of markerMap) {
      entry.sprite.material.map?.dispose();
      entry.sprite.material.dispose();
    }
    markerMap.clear();
    if (scene) {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    if (composer) composer.dispose?.();
    if (renderer) {
      renderer.dispose();
      const el = renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  });

  return <div ref={container} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

export default Rocket3DScene;
