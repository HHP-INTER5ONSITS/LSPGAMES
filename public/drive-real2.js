/* LSP Drive · realism layer 2. It sits on top of drive-real.js and adds:
 *   - pools of warm light under every street lamp at night, with real lights near you
 *   - headlight beams on every car after dark or in the rain
 *   - a moon, a hazy glow around the sun, and a distant city skyline on the horizon
 *   - birds overhead and airliners crossing the sky (blinking lights at night, contrails by day)
 *   - reflective puddles and rain splashes when it's wet, lightning bolts in storms
 *   - steam from manholes on cold nights and after rain
 *   - trees that sway in the wind (harder in a storm)
 */
(function () {
  'use strict';
  const R1 = window.LSPDriveReal; if (!R1) return;
  const L = window.LSPG;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let C = null, T = null, broken = false;
  const S = { t: 0, lastFlash: 0 };
  R1.R2 = S;

  const baseInit = R1.init, baseFrame = R1.frame;
  R1.init = function (ctx) { baseInit(ctx); try { init(ctx); } catch (e) { console.error('realism 2', e); broken = true; } };
  R1.frame = function (dt) { baseFrame(dt); if (!C || broken) return; try { frame(dt); } catch (e) { console.error('realism 2', e); broken = true; } };

  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const glowTex = (inner, outer) => tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(0.35, outer); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });

  function init(ctx) {
    C = ctx; T = ctx.T;
    const touch = L.isTouch();
    lampPools(touch); skyBits(); skyline(); birds(); plane(); puddles(); splashes(); bolt(); wind();
    S.beamTex = tex(8, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); });
    S.beamM = new T.MeshBasicMaterial({ map: S.beamTex, color: '#fff1c8', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  }

  /* ---------- street lamps: light pools + a few real lights near you ---------- */
  function lampPools(touch) {
    const W = C.WORLD || {}; const lamps = W.lamps || []; S.lamps = lamps.map(([x, z, r]) => [x + Math.sin(r) * 2, z + Math.cos(r) * 2]);
    if (!S.lamps.length) return;
    const geo = new T.PlaneGeometry(11, 11); geo.rotateX(-Math.PI / 2);
    S.poolM = new T.MeshBasicMaterial({ map: glowTex('rgba(255,214,150,1)', 'rgba(255,190,110,0.45)'), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const im = new T.InstancedMesh(geo, S.poolM, S.lamps.length), m = new T.Matrix4();
    S.lamps.forEach(([x, z], i) => { m.makeTranslation(x, 0.24, z); im.setMatrixAt(i, m); });
    im.frustumCulled = false; im.renderOrder = 3; C.scene.add(im); S.pools = im;
    // a halo around each lamp head, seen from far away
    const hg = new T.PlaneGeometry(1, 1);
    S.haloM = new T.SpriteMaterial({ map: glowTex('rgba(255,236,190,1)', 'rgba(255,200,120,0.35)'), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
    S.halos = new T.Group(); C.scene.add(S.halos); void hg;
    S.lamps.forEach(([x, z]) => { const s = new T.Sprite(S.haloM); s.position.set(x, 6.4, z); s.scale.set(2.4, 2.4, 1); S.halos.add(s); });
    S.lights = []; const n = touch ? 2 : 6;
    for (let i = 0; i < n; i++) { const l = new T.PointLight('#ffd49a', 0, 20, 2); l.position.set(0, -50, 0); C.scene.add(l); S.lights.push(l); }
    S.lampHeads = W.lampHeads;
  }

  /* ---------- moon, sun glow ---------- */
  function skyBits() {
    const moonT = tex(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(235,240,255,1)'); r.addColorStop(0.28, 'rgba(225,232,250,1)'); r.addColorStop(0.31, 'rgba(180,195,255,0.35)'); r.addColorStop(1, 'rgba(120,140,220,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(160,170,195,0.5)'; [[54, 56, 6], [72, 70, 8], [66, 50, 4], [58, 74, 3]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
    });
    S.moon = new T.Sprite(new T.SpriteMaterial({ map: moonT, transparent: true, depthWrite: false, fog: false, opacity: 0 })); S.moon.scale.set(110, 110, 1); S.moon.renderOrder = -9; C.scene.add(S.moon);
    S.sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,245,220,0.9)', 'rgba(255,200,140,0.25)'), transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending, opacity: 0 })); S.sunGlow.scale.set(260, 260, 1); S.sunGlow.renderOrder = -9; C.scene.add(S.sunGlow);
  }

  /* ---------- a far-away skyline all around the horizon ---------- */
  function skyline() {
    const W = 4096, H = 256, wins = [];
    const sil = tex(W, H, (g) => {
      g.clearRect(0, 0, W, H); g.fillStyle = '#fff'; let x = 0;
      while (x < W) {
        const w = rnd(18, 70), tall = Math.random() < 0.12, h = tall ? rnd(110, 230) : rnd(25, 110);
        g.fillRect(x, H - h, w, h);
        if (tall && Math.random() < 0.5) g.fillRect(x + w / 2 - 1.5, H - h - rnd(15, 40), 3, 40);
        if (Math.random() < 0.15) { g.beginPath(); g.moveTo(x, H - h); g.lineTo(x + w / 2, H - h - rnd(10, 30)); g.lineTo(x + w, H - h); g.fill(); }
        for (let wy = H - h + 6; wy < H - 4; wy += 7) for (let wx = x + 4; wx < x + w - 4; wx += 6) if (Math.random() < 0.28) wins.push([wx, wy]);
        x += w + (Math.random() < 0.2 ? rnd(10, 60) : rnd(0, 4));
      }
    });
    const lit = tex(W, H, (g) => { g.clearRect(0, 0, W, H); for (const [wx, wy] of wins) { g.fillStyle = Math.random() < 0.8 ? '#ffd890' : '#cfe4ff'; g.fillRect(wx, wy, 2.5, 2.5); } });
    const geo = new T.CylinderGeometry(860, 860, 140, 96, 1, true);
    S.skyM = new T.MeshBasicMaterial({ map: sil, alphaMap: sil, transparent: true, side: T.BackSide, depthWrite: false, fog: false, color: '#9aa8b8' });
    S.skyLitM = new T.MeshBasicMaterial({ map: lit, transparent: true, side: T.BackSide, depthWrite: false, fog: false, blending: T.AdditiveBlending, opacity: 0 });
    S.sky1 = new T.Mesh(geo, S.skyM); S.sky2 = new T.Mesh(geo, S.skyLitM);
    for (const m of [S.sky1, S.sky2]) { m.renderOrder = -8; m.frustumCulled = false; m.position.y = 48; C.scene.add(m); }
  }

  /* ---------- birds ---------- */
  function birds() {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.25, -0.9, 0.15, -0.1, 0, 0, -0.2, 0, 0, 0.25, 0.9, 0.15, -0.1, 0, 0, -0.2], 3)); g.computeVertexNormals();
    const m = new T.MeshBasicMaterial({ color: '#2a2e36', side: T.DoubleSide, fog: true });
    S.flock = { c: new T.Vector3(0, 55, 0), a: 0, list: [] };
    for (let i = 0; i < 22; i++) { const b = new T.Mesh(g, m); b.scale.setScalar(rnd(0.8, 1.3)); b.userData = { r: rnd(6, 22), h: rnd(-6, 6), sp: rnd(0.25, 0.4), ph: rnd(0, 6), off: rnd(0, 6) }; C.scene.add(b); S.flock.list.push(b); }
  }

  /* ---------- airliners crossing the sky ---------- */
  function plane() {
    const g = new T.Group(), body = new T.MeshStandardMaterial({ color: '#eef2f7', roughness: 0.4, metalness: 0.3 }), tail = new T.MeshStandardMaterial({ color: '#2f6bff', roughness: 0.5 });
    const fus = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, 38, 14), body); fus.rotation.x = Math.PI / 2; g.add(fus);
    const nose = new T.Mesh(new T.SphereGeometry(2.1, 14, 10), body); nose.position.z = 19; nose.scale.z = 1.8; g.add(nose);
    const wing = new T.Mesh(new T.BoxGeometry(36, 0.5, 6), body); wing.position.set(0, -0.6, 1); g.add(wing);
    const ht = new T.Mesh(new T.BoxGeometry(13, 0.4, 3.5), body); ht.position.set(0, 0.6, -17); g.add(ht);
    const vt = new T.Mesh(new T.BoxGeometry(0.5, 7, 5), tail); vt.position.set(0, 4, -17); g.add(vt);
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 4.5, 12), new T.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.6, roughness: 0.3 })); e.rotation.x = Math.PI / 2; e.position.set(sx * 8, -2, 3); g.add(e); }
    const nav = (col, x, y, z) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,255,255,1)', col), color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.position.set(x, y, z); s.scale.set(9, 9, 1); g.add(s); return s; };
    S.navR = nav('#ff3030', -18, -0.4, 1); S.navG = nav('#30ff60', 18, -0.4, 1); S.strobe = nav('#ffffff', 0, 7.6, -18); S.beacon = nav('#ff2020', 0, -2.4, 0);
    g.visible = false; C.scene.add(g);
    S.trailM = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });
    S.trail = new T.Group(); for (const sx of [-8, 8]) { const t = new T.Mesh(new T.BoxGeometry(1.1, 1.1, 1), S.trailM); t.position.x = sx; S.trail.add(t); } C.scene.add(S.trail); S.trail.visible = false;
    S.plane = { g, on: false, wait: rnd(8, 25), p: new T.Vector3(), d: new T.Vector3(), run: 0 };
  }
  function tickPlane(dt, day, wet) {
    const P = S.plane, cam = C.camera.position;
    if (!P.on) {
      P.wait -= dt; if (P.wait > 0) return;
      const a = rnd(0, Math.PI * 2), off = rnd(-250, 250);
      P.d.set(Math.cos(a), 0, Math.sin(a)); P.p.set(cam.x - P.d.x * 1100 - P.d.z * off, rnd(230, 300), cam.z - P.d.z * 1100 + P.d.x * off);
      P.on = true; P.run = 0; P.g.visible = true; P.g.rotation.y = Math.atan2(P.d.x, P.d.z);
    }
    P.p.addScaledVector(P.d, 70 * dt); P.run += 70 * dt; P.g.position.copy(P.p);
    const blink = (S.t % 1.2) < 0.08, night = 1 - Math.min(1, day * 1.6);
    S.strobe.visible = blink; S.beacon.visible = (S.t % 1.0) > 0.5;
    for (const s of [S.navR, S.navG, S.strobe, S.beacon]) s.material.opacity = 0.35 + night * 0.65;
    // contrail behind both engines on clear days
    const len = Math.min(P.run, 420); S.trail.visible = day > 0.3 && wet < 0.4 && P.g.position.y > 200;
    S.trail.position.copy(P.p).addScaledVector(P.d, -len / 2 - 22); S.trail.position.y -= 2; S.trail.rotation.y = P.g.rotation.y;
    S.trail.children.forEach((t) => (t.scale.z = len)); S.trailM.opacity = 0.4 * (1 - wet) * Math.min(1, day * 1.5);
    if (P.run > 2400) { P.on = false; P.g.visible = false; S.trail.visible = false; P.wait = rnd(25, 70); }
  }

  /* ---------- puddles and rain splashes ---------- */
  function puddles() {
    const { RX, NB, ROAD } = C, n = 260, geo = new T.CircleGeometry(1, 18); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; for (let i = 1; i < pos.count; i++) { const k = 0.75 + Math.sin(i * 1.7) * 0.15 + Math.random() * 0.15; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
    S.pudM = new T.MeshStandardMaterial({ color: '#9aa6b6', roughness: 0.0, metalness: 1.0, envMapIntensity: 1.6, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    const im = new T.InstancedMesh(geo, S.pudM, n), m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), v = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const line = RX(Math.floor(Math.random() * (NB + 1))), along = rnd(RX(0), RX(NB)), side = rnd(-ROAD * 0.32, ROAD * 0.32), alongX = Math.random() < 0.5;
      v.set(alongX ? along : line + side, 0.2, alongX ? line + side : along); q.setFromAxisAngle(up, rnd(0, 6)); sc.set(rnd(1.2, 3.4), 1, rnd(0.8, 1.8));
      m.compose(v, q, sc); im.setMatrixAt(i, m);
    }
    im.frustumCulled = false; im.renderOrder = 2; im.receiveShadow = true; C.scene.add(im); S.puddles = im;
  }
  function splashes() {
    const n = L.isTouch() ? 40 : 90, geo = new T.RingGeometry(0.06, 0.13, 14); geo.rotateX(-Math.PI / 2);
    S.splM = new T.MeshBasicMaterial({ color: '#dfe8f2', transparent: true, opacity: 0, depthWrite: false });
    S.spl = new T.InstancedMesh(geo, S.splM, n); S.spl.frustumCulled = false; C.scene.add(S.spl);
    S.splD = Array.from({ length: n }, () => ({ x: 0, z: 0, t: rnd(0, 0.5) }));
  }
  function tickSplash(dt, wet) {
    S.splM.opacity = 0.3 * Math.min(1, wet * 1.4); S.spl.visible = wet > 0.15; if (!S.spl.visible) return;
    const cam = C.camera.position, m = new T.Matrix4(), v = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
    S.splD.forEach((d, i) => {
      d.t += dt; if (d.t > 0.45) { d.t = 0; const a = rnd(0, 6.28), r = rnd(2, 26); d.x = cam.x + Math.cos(a) * r; d.z = cam.z + Math.sin(a) * r; }
      const k = d.t / 0.45, s = 1 + k * 3.5; v.set(d.x, 0.22, d.z); sc.set(s * (1 - k * 0.6), 1, s * (1 - k * 0.6)); m.compose(v, q, sc); S.spl.setMatrixAt(i, m);
    });
    S.spl.instanceMatrix.needsUpdate = true;
  }

  /* ---------- lightning ---------- */
  function bolt() {
    S.boltM = new T.LineBasicMaterial({ color: '#f4f7ff', transparent: true, opacity: 1, fog: false });
    S.bolt = new T.LineSegments(new T.BufferGeometry(), S.boltM); S.bolt.visible = false; S.bolt.frustumCulled = false; C.scene.add(S.bolt);
    S.boltLight = new T.PointLight('#cfe0ff', 0, 0, 0); C.scene.add(S.boltLight);
  }
  function strike() {
    const cam = C.camera.position, a = rnd(0, 6.28), r = rnd(250, 520), x0 = cam.x + Math.cos(a) * r, z0 = cam.z + Math.sin(a) * r, pts = [];
    const branch = (x, y, z, steps, spread) => { for (let i = 0; i < steps && y > 0; i++) { const nx = x + rnd(-spread, spread), ny = y - rnd(10, 22), nz = z + rnd(-spread, spread); pts.push(x, y, z, nx, Math.max(0, ny), nz); if (Math.random() < 0.18 && steps > 4) branch(nx, ny, nz, Math.floor(steps / 3), spread * 0.8); x = nx; y = ny; z = nz; } };
    branch(x0, 300, z0, 22, 9);
    S.bolt.geometry.dispose(); S.bolt.geometry = new T.BufferGeometry(); S.bolt.geometry.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    S.bolt.visible = true; S.boltT = 0.22; S.boltLight.position.set(x0, 150, z0);
  }

  /* ---------- trees sway in the wind ---------- */
  function wind() {
    S.windU = { value: 0 }; S.gust = { value: 0.35 };
    C.scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.userData.leaves) return;
      o.material = o.material.clone();
      o.material.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = S.windU; sh.uniforms.uGust = S.gust;
        sh.vertexShader = 'uniform float uWind; uniform float uGust;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float wk = max(0.0, transformed.y - 2.2);
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
          #else
            float ph = 0.0;
          #endif
          transformed.x += sin(uWind * 1.6 + ph) * wk * 0.07 * uGust + sin(uWind * 4.3 + ph * 2.0 + transformed.y) * 0.025 * uGust;
          transformed.z += cos(uWind * 1.3 + ph) * wk * 0.05 * uGust;`);
      };
    });
  }

  /* ---------- headlight beams on cars ---------- */
  function beamFor(group, halfL, w) {
    if (group.userData.beam) return group.userData.beam;
    const g = new T.Group();
    for (const sx of [-1, 1]) {
      const c = new T.ConeGeometry(1.9, 13, 18, 1, true); c.rotateX(-Math.PI / 2); c.rotateX(0.09); c.translate(sx * (w / 2 - 0.35), 0.75, halfL + 6.4);
      const m = new T.Mesh(c, S.beamM); m.renderOrder = 4; g.add(m);
    }
    group.add(g); group.userData.beam = g; return g;
  }

  /* ---------- every frame ---------- */
  function frame(dt) {
    S.t += dt;
    const R = R1.R, day = R.day == null ? 1 : R.day, wet = Math.min(1, R.rain || 0), cam = C.camera.position;
    const glow = Math.max(0, Math.min(1, (0.55 - day) * 2.5)), dark = Math.max(glow, wet > 0.6 ? 0.6 : 0);
    const U = R.skyU && R.skyU.sun ? R.skyU : null, sunDir = U ? U.sun.value : new T.Vector3(0.4, 0.6, 0.3);

    // lamps
    if (S.pools) {
      S.poolM.opacity = glow * (0.32 + wet * 0.2); S.pools.visible = glow > 0.02;
      S.haloM.opacity = glow * 0.6; S.halos.visible = glow > 0.02;
      if (S.lampHeads) S.lampHeads.material.emissiveIntensity = 0.6 + glow * 1.6;
      if ((S.lt = (S.lt || 0) - dt) <= 0) {
        S.lt = 0.4; const near = [];
        for (const p of S.lamps) { const d = (p[0] - cam.x) ** 2 + (p[1] - cam.z) ** 2; if (d < 6400) near.push([d, p]); }
        near.sort((a, b) => a[0] - b[0]); S.near = near;
      }
      S.lights.forEach((l, i) => { const n = S.near && S.near[i]; if (!n || glow < 0.05) { l.intensity = 0; return; } l.position.set(n[1][0], 6.1, n[1][1]); l.intensity = 9 * glow; });
    }
    // moon and sun glow
    const night = Math.max(0, 1 - day * 2.2);
    S.moon.material.opacity = night * (1 - wet * 0.85); S.moon.visible = S.moon.material.opacity > 0.01;
    S.moon.position.set(cam.x - sunDir.x * 780 + 120, cam.y + Math.max(160, 420 - day * 300), cam.z - sunDir.z * 780);
    S.sunGlow.position.copy(cam).addScaledVector(sunDir, 800); S.sunGlow.material.opacity = Math.max(0, Math.min(1, day * 1.4 - 0.1)) * (1 - wet) * (sunDir.y < 0.35 ? 0.32 : 0.16);
    S.sunGlow.material.color.set(sunDir.y < 0.3 ? '#ffb070' : '#fff4dd');
    // skyline takes the colour of the haze on the horizon
    if (U) { S.skyM.color.copy(U.hor.value).lerp(new T.Color(day > 0.4 ? '#6f7c8c' : '#0a0f1e'), 0.45); }
    S.skyLitM.opacity = glow * (1 - wet * 0.4);
    S.sky1.position.set(cam.x, 48, cam.z); S.sky2.position.copy(S.sky1.position);
    // birds by day
    const F = S.flock, showBirds = day > 0.35 && wet < 0.5;
    F.a += dt * 0.12; F.c.set(cam.x + Math.cos(F.a) * 120, 55, cam.z + Math.sin(F.a * 0.8) * 120);
    F.list.forEach((b) => { const u = b.userData; b.visible = showBirds; if (!showBirds) return; const a = S.t * u.sp + u.off; b.position.set(F.c.x + Math.cos(a) * u.r, F.c.y + u.h + Math.sin(S.t * 0.7 + u.off) * 2, F.c.z + Math.sin(a) * u.r); b.rotation.y = -a; b.scale.y = Math.sin(S.t * 9 + u.ph) * 1.2; });
    tickPlane(dt, day, wet);
    // puddles and splashes
    S.pudM.opacity = Math.max(0, Math.min(0.85, (wet - 0.15) * 1.3)); S.puddles.visible = S.pudM.opacity > 0.01;
    tickSplash(dt, wet);
    // lightning
    if (R.flash > 0 && S.lastFlash <= 0) strike();
    S.lastFlash = R.flash;
    if (S.boltT > 0) { S.boltT -= dt; S.boltM.opacity = Math.random() < 0.7 ? 1 : 0.2; S.boltLight.intensity = 1.2; if (S.boltT <= 0) { S.bolt.visible = false; S.boltLight.intensity = 0; } }
    // manhole steam at night and after rain
    if (R.manholes && (glow > 0.3 || wet > 0.3) && Math.random() < dt * 3) {
      const near = R.manholes.filter(([x, z]) => Math.abs(x - cam.x) < 45 && Math.abs(z - cam.z) < 45);
      if (near.length) { const [x, z] = near[Math.floor(Math.random() * near.length)]; C.puff(x + rnd(-0.2, 0.2), 0.3, z + rnd(-0.2, 0.2), '#e6eaef', 0.5, 2.4, rnd(-0.3, 0.3), rnd(0.6, 1.1), rnd(-0.3, 0.3), 1.6, 0.35); }
    }
    // wind
    S.windU.value += dt * (1 + wet * 1.5); S.gust.value += ((0.35 + wet * 1.1 + Math.max(0, Math.sin(S.t * 0.13)) * 0.3) - S.gust.value) * Math.min(1, dt);
    // headlight beams after dark
    S.beamM.opacity = dark * 0.07;
    const show = dark > 0.05;
    for (const tr of C.G.traffic || []) {
      if (!tr.m || !tr.m.g) continue;
      const near = Math.abs(tr.x - cam.x) < 140 && Math.abs(tr.z - cam.z) < 140;
      if (!show || !near) { if (tr.m.g.userData.beam) tr.m.g.userData.beam.visible = false; continue; }
      const halfL = tr.co ? -tr.co[0] + tr.cr : 2.1; beamFor(tr.m.g, halfL, (tr.cr || 0.9) * 2).visible = true;
    }
    const P = C.getP && C.getP();
    if (P && P.m && P.m.g && !P.s.bike) { const b = beamFor(P.m.g, (P.m.L || 4.2) / 2, P.m.W || 1.8); b.visible = show && C.G.mode === 'drive'; }
  }
})();
