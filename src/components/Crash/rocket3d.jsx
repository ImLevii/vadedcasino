import { onCleanup, onMount, createEffect } from 'solid-js';
import * as THREE from 'three';

/**
 * 3D rocket + particle scene for the Crash game.
 * Reacts to: multiplier (number), isFlying (bool), isCrashed (bool), countdown (number).
 * Renders a rocket that climbs with the multiplier, an animated exhaust flame,
 * a streaking starfield conveying speed, and an explosion burst on crash.
 */
function Rocket3D(props) {
  let container;

  let renderer, scene, camera;
  let rocketGroup, glowLight;
  let raf = 0;
  let resizeObserver;

  // Particle systems
  let exhaustGeo, exhaustPts;
  const exhaustData = [];
  let starGeo, starPts;
  const starData = [];
  let boomGeo, boomPts;
  const boomData = [];

  const N_EXHAUST = 220;
  const N_STARS = 520;
  const N_BOOM = 260;

  const state = {
    multiplier: 1,
    isFlying: false,
    isCrashed: false,
    countdown: 0,
    t: 0,
    speed: 0,          // smoothed ascent intensity 0..1
    rocketVisible: true,
  };

  // assigned in onMount, referenced from createEffect
  let onCrash = () => {};
  let onLaunch = () => {};

  createEffect(() => {
    const m = props.multiplier || 1;
    const flying = !!props.isFlying;
    const crashed = !!props.isCrashed;

    state.multiplier = m;
    state.countdown = props.countdown || 0;

    if (crashed && !state.isCrashed) onCrash();
    if (flying && !state.isFlying) onLaunch();

    state.isFlying = flying;
    state.isCrashed = crashed;
  });

  function buildRocket() {
    rocketGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeef2f7, metalness: 0.5, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.7, 28), bodyMat);
    body.position.y = 0.85;
    rocketGroup.add(body);

    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1fd65f, metalness: 0.3, roughness: 0.3, emissive: 0x0c5a28, emissiveIntensity: 0.5 });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.75, 28), noseMat);
    nose.position.y = 2.05;
    rocketGroup.add(nose);

    const winMat = new THREE.MeshStandardMaterial({ color: 0x6fdcff, metalness: 0.1, roughness: 0.1, emissive: 0x2b7fa6, emissiveIntensity: 0.6 });
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), winMat);
    win.position.set(0, 1.15, 0.33);
    rocketGroup.add(win);

    const finMat = new THREE.MeshStandardMaterial({ color: 0x18b853, metalness: 0.4, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.4), finMat);
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.36, 0.25, Math.sin(a) * 0.36);
      fin.rotation.y = -a;
      fin.rotation.x = 0.15;
      rocketGroup.add(fin);
    }

    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0x2c3340, metalness: 0.7, roughness: 0.4 })
    );
    ring.position.y = -0.05;
    rocketGroup.add(ring);

    rocketGroup.position.set(0, 0, 0);
    scene.add(rocketGroup);
  }

  function buildStars() {
    starGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_STARS * 3);
    for (let i = 0; i < N_STARS; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 22 - 6;
      pos[i * 3 + 2] = -2 - Math.random() * 11;
      starData[i] = { base: Math.random() };
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x9fb4d0, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false });
    starPts = new THREE.Points(starGeo, mat);
    scene.add(starPts);
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
    const mat = new THREE.PointsMaterial({ size: 0.24, transparent: true, opacity: 0.95, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
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
    const mat = new THREE.PointsMaterial({ size: 0.3, transparent: true, opacity: 1, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
    boomPts = new THREE.Points(boomGeo, mat);
    boomPts.visible = false;
    scene.add(boomPts);
  }

  function updateRocket(dt) {
    if (!rocketGroup || !state.rocketVisible) return;
    const t = state.t;
    const shake = state.speed;
    const targetY = state.isFlying ? 0.2 + state.speed * 0.7 : (state.countdown > 0 ? -0.35 : 0);
    rocketGroup.position.y += (targetY - rocketGroup.position.y) * Math.min(1, dt * 3);
    rocketGroup.position.x = Math.sin(t * 2) * 0.05 + (Math.random() - 0.5) * 0.03 * shake;
    rocketGroup.rotation.z = Math.sin(t * 1.5) * 0.04 - shake * 0.1 + (Math.random() - 0.5) * 0.02 * shake;
    rocketGroup.rotation.y += dt * 0.35;
  }

  function updateStars(dt) {
    const pos = starGeo.attributes.position.array;
    const v = (2 + state.speed * 28) * dt;
    for (let i = 0; i < N_STARS; i++) {
      pos[i * 3 + 1] -= v * (0.4 + starData[i].base);
      if (pos[i * 3 + 1] < -7) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = 15 + Math.random() * 4;
        pos[i * 3 + 2] = -2 - Math.random() * 11;
      }
    }
    starGeo.attributes.position.needsUpdate = true;
    starPts.material.size = 0.05 + state.speed * 0.06;
    starPts.material.opacity = 0.5 + state.speed * 0.5;
  }

  function updateExhaust(dt) {
    const pos = exhaustGeo.attributes.position.array;
    const col = exhaustGeo.attributes.color.array;
    const base = new THREE.Vector3();
    rocketGroup.getWorldPosition(base);

    const emitting = state.rocketVisible && !state.isCrashed;
    const rate = state.isFlying ? Math.round(6 + state.speed * 22) : 2;
    let toSpawn = emitting ? rate : 0;

    for (let i = 0; i < N_EXHAUST; i++) {
      const p = exhaustData[i];
      if (p.life > 0) {
        p.life -= dt * 2.4;
        pos[i * 3] += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        const l = Math.max(0, p.life);
        col[i * 3] = 1.0 * (1 - l) + 0.12 * l;
        col[i * 3 + 1] = 0.5 * (1 - l) + 0.84 * l;
        col[i * 3 + 2] = 0.15 * (1 - l) + 0.37 * l;
      } else if (toSpawn > 0) {
        toSpawn--;
        p.life = 1;
        pos[i * 3] = base.x + (Math.random() - 0.5) * 0.2;
        pos[i * 3 + 1] = base.y - 0.15;
        pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.2;
        const spread = 0.4 + state.speed;
        p.vx = (Math.random() - 0.5) * 0.6;
        p.vy = -(1.5 + state.speed * 4.5) - Math.random() * spread;
        p.vz = (Math.random() - 0.5) * 0.6;
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
    let anyAlive = false;
    for (let i = 0; i < N_BOOM; i++) {
      const p = boomData[i];
      if (p.life <= 0) continue;
      anyAlive = true;
      p.life -= dt * 0.9;
      p.vy -= dt * 0.25; // gravity on debris
      pos[i * 3] += p.vx;
      pos[i * 3 + 1] += p.vy;
      pos[i * 3 + 2] += p.vz;
      const l = Math.max(0, p.life);
      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.35 * l + 0.15;
      col[i * 3 + 2] = 0.12 * l;
    }
    boomGeo.attributes.position.needsUpdate = true;
    boomGeo.attributes.color.needsUpdate = true;
    if (!anyAlive) boomPts.visible = false;
  }

  onMount(() => {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 8.5);
    camera.lookAt(0, 1.4, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x557799, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 5);
    scene.add(dir);
    glowLight = new THREE.PointLight(0x1fd65f, 2.2, 9);
    glowLight.position.set(0, 0.2, 0.5);
    scene.add(glowLight);

    buildRocket();
    buildStars();
    buildExhaust();
    buildBoom();

    onLaunch = () => {
      boomPts.visible = false;
      state.rocketVisible = true;
      rocketGroup.visible = true;
      rocketGroup.position.set(0, 0, 0);
    };

    onCrash = () => {
      boomPts.visible = true;
      const pos = boomGeo.attributes.position.array;
      const origin = new THREE.Vector3();
      rocketGroup.getWorldPosition(origin);
      for (let i = 0; i < N_BOOM; i++) {
        pos[i * 3] = origin.x;
        pos[i * 3 + 1] = origin.y + 0.7;
        pos[i * 3 + 2] = origin.z;
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

      updateRocket(dt);
      updateStars(dt);
      updateExhaust(dt);
      updateBoom(dt);

      if (glowLight) {
        const b = state.isCrashed ? 0.4 : 1.6 + state.speed * 2.6;
        glowLight.intensity = b + Math.sin(state.t * 30) * 0.3 * (0.4 + state.speed);
        glowLight.color.set(state.isCrashed ? 0xff5141 : 0x1fd65f);
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
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
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

  return <div ref={container} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

export default Rocket3D;
