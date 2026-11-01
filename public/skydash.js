/* Sky Dash: hold to fly, dodge zappers, birds and missiles, collect stars. */
(function () {
  'use strict';
  const L = LSPG, rr = L.rr;
  const H = 600, CEIL = 36, FLOOR = 548, PR = 15;
  const UPG = [
    { id: 'magnet', name: 'Star Magnet', icon: '🧲', desc: 'Pulls in nearby stars. Bigger range per level' },
    { id: 'value', name: 'Star Power', icon: '✨', desc: '+20% points from stars per level' },
  ];
  const ARMOR = { id: 'armor', name: 'Shield Pack', icon: '🛡️', desc: 'Start every run with one more shield per level' };
  const UPG_COST = [200, 450, 800, 1300, 2000], ARMOR_COST = [400, 1000, 2000];
  const SKINS = [
    { id: 'red', name: 'Red Rocket', color: '#ff4d5e', cost: 0 },
    { id: 'mint', name: 'Mint Jet', color: '#14c79a', cost: 300 },
    { id: 'galaxy', name: 'Galaxy', color: '#8a5cff', cost: 800 },
    { id: 'gold', name: 'Gold Comet', color: '#f2b61f', cost: 2000 },
  ];

  document.body.insertAdjacentHTML('beforeend', `
  <section class="screen" id="s-slobby" style="overflow:auto">
    <header class="topbar"><div class="topbar-in">
      <button class="iconbtn" id="sd-back" aria-label="Back to games">‹</button>
      <h2 style="font-size:20px">Sky Dash</h2><div class="spacer"></div>
      <span class="pill" title="LSP points">⭐ <span class="js-points">0</span></span>
    </div></header>
    <main class="wrap">
      <div class="tabs" role="tablist">
        <button class="tab on" data-t="fly" role="tab">Fly</button>
        <button class="tab" data-t="upgrades" role="tab">Upgrades</button>
        <button class="tab" data-t="skins" role="tab">Rockets</button>
      </div>
      <div class="gpanel on" data-p="fly">
        <div class="item" style="margin-top:18px;max-width:520px">
          <div class="item-head"><div class="ico">🚀</div><div><h3>How far can you fly?</h3><p>Hold to fly up, let go to drop. Dodge zappers, birds and missiles, and grab stars on the way.</p></div></div>
          <div class="statline" id="sd-stats"></div>
          <button class="btn primary" id="sd-go">Start flying</button>
        </div>
        <p class="note">You earn 1 point for every 10 m flown, plus points for every star.</p>
      </div>
      <div class="gpanel" data-p="upgrades"><div class="items" id="sd-upg"></div></div>
      <div class="gpanel" data-p="skins"><div class="items" id="sd-skins"></div></div>
    </main>
  </section>
  <section class="screen gscreen" id="s-sky">
    <canvas class="gcv" id="sd-cv"></canvas>
    <div class="hud">
      <button class="iconbtn" id="sd-pause" aria-label="Pause">⏸</button>
      <span class="hudpill" id="sd-dist">0 m</span>
      <span class="hudpill" id="sd-stars">✨ 0</span>
      <span class="hudpill" id="sd-shield">🛡️ 0</span>
    </div>
    <div class="help">Hold Space, Up or the mouse button to fly. Esc to pause</div>
    <div class="modal" id="sd-modal"><div class="modal-card"></div></div>
  </section>`);

  const cv = $('#sd-cv'), g = cv.getContext('2d'), scr = $('#s-sky');
  let SS = null, R = null, raf = 0, last = 0, held = false;
  const keys = {};
  const view = { z: 1, w: 0, h: 0 };

  /* ---------- 3D sky ---------- */
  const K = 1 / 40, SX = (x) => x * K, SY = (y) => (H / 2 - y) * K;
  const V = L.g3d({ key: 'sky', scr, cv, g, view: { d: 1 } }, { sky: ['#3f86d6', '#a9d4f5', '#fff2df'], fogNear: 30, fogFar: 90, shadows: false });
  Object.defineProperty(V.A, 'view', { get: () => ({ d: devicePixelRatio > 2 ? 2 : devicePixelRatio || 1 }) });
  const D3 = {};
  V.onReady((V) => {
    const Th = V.T, sc = V.scene;
    D3.rocket = new Th.Group(); sc.add(D3.rocket);
    const body = V.cyl(0.32, 0.32, 1.3, '#2f6bff', 0, 0, 0, D3.rocket, 20); body.rotation.z = Math.PI / 2; D3.body = body;
    const nose = new Th.Mesh(new Th.ConeGeometry(0.32, 0.6, 20), V.M('#ffffff', { metalness: 0.3 })); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.95; D3.rocket.add(nose);
    const win = V.ball(0.15, V.M('#bfe8ff', { metalness: 0.5, roughness: 0.1 }), 0.3, 0.12, 0.25, D3.rocket, 12);
    for (const a of [0, 2.09, 4.19]) { const fin = V.box(0.45, 0.04, 0.4, '#3c435a', -0.55, Math.cos(a) * 0.35, Math.sin(a) * 0.35, D3.rocket); fin.rotation.x = a; }
    D3.flame = new Th.Mesh(new Th.ConeGeometry(0.22, 0.8, 12), V.M('#ffb31a', { emissive: '#ff8a1a', emissiveIntensity: 2, transparent: true, opacity: 0.9 })); D3.flame.rotation.z = Math.PI / 2; D3.flame.position.x = -1.05; D3.rocket.add(D3.flame);
    D3.shield = V.ball(0.95, V.M('#4fb6f0', { transparent: true, opacity: 0.18, emissive: '#4fb6f0', emissiveIntensity: 0.4 }), 0, 0, 0, D3.rocket, 20); D3.shield.castShadow = false;
    // clouds: floor and ceiling, recycled as we fly
    D3.clouds = [];
    const cm = V.M('#ffffff', { roughness: 1, emissive: '#c9d6e8', emissiveIntensity: 0.55 });
    for (let i = 0; i < 46; i++) { const top = i % 2 === 0, m = V.ball(1.4 + Math.random() * 1.2, cm, 0, 0, 0, sc, 10); m.castShadow = false; m.scale.y = 0.7; m.userData = { top, off: (i >> 1) * 2.4, z: (Math.random() - 0.5) * 3, dy: Math.random() * 0.6 }; D3.clouds.push(m); }
    D3.far = []; for (let i = 0; i < 16; i++) { const m = V.ball(3 + Math.random() * 3, V.M('#ffffff', { transparent: true, opacity: 0.8, emissive: '#dfe8f3', emissiveIntensity: 0.6 }), 0, 0, 0, sc, 10); m.castShadow = false; m.scale.y = 0.45; m.userData = { off: i * 9, y: -2 + Math.random() * 12, z: -20 - Math.random() * 25 }; D3.far.push(m); }
    const starShape = new Th.Shape(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 + Math.PI / 2, r = i % 2 ? 0.13 : 0.3; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const starGeo = new Th.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); starGeo.center();
    const gold = V.M('#ffb31a', { metalness: 0.6, roughness: 0.25, emissive: '#7a4a00', emissiveIntensity: 0.4 });
    D3.items = V.pool((it) => { if (it.type === 'star') { const m = new Th.Mesh(starGeo, gold); sc.add(m); return m; } const gr = new Th.Group(); const c = it.type === 'shield' ? '#4fb6f0' : '#ff4d8b'; V.ball(0.45, V.M(c, { transparent: true, opacity: 0.35, emissive: c, emissiveIntensity: 0.6 }), 0, 0, 0, gr, 16); const ic = V.sprite(it.type === 'shield' ? '🛡️' : '🧲', 0.6, 0.6); sc.remove(ic); gr.add(ic); sc.add(gr); return gr; });
    D3.obs = V.pool((o) => {
      const gr = new Th.Group();
      if (o.type === 'zap') { for (const s2 of [-1, 1]) { const n = V.ball(0.28, V.M('#3c435a', { metalness: 0.7, roughness: 0.3 }), s2 * SX(o.len) / 2, 0, 0, gr, 14); V.ball(0.14, V.M('#ffd640', { emissive: '#ffd640', emissiveIntensity: 1.5 }), s2 * (SX(o.len) / 2 + 0.05), 0, 0.15, gr, 8); }
        const beam = V.cyl(0.08, 0.08, SX(o.len), V.M('#fff27a', { emissive: '#ffd640', emissiveIntensity: 2.5, transparent: true, opacity: 0.9 }), 0, 0, 0, gr, 8); beam.rotation.z = Math.PI / 2; const glow = V.cyl(0.22, 0.22, SX(o.len), V.M('#ffd640', { transparent: true, opacity: 0.25, emissive: '#ffd640', emissiveIntensity: 1 }), 0, 0, 0, gr, 8); glow.rotation.z = Math.PI / 2; }
      else { const b = V.ball(0.38, '#ff8a3d', 0, 0, 0, gr, 14); V.ball(0.1, '#ffffff', -0.25, 0.12, 0.25, gr, 8); V.ball(0.05, '#16203d', -0.31, 0.12, 0.31, gr, 6); const beak = new Th.Mesh(new Th.ConeGeometry(0.1, 0.3, 8), V.M('#ffb31a')); beak.rotation.z = Math.PI / 2; beak.position.x = -0.48; gr.add(beak); gr.userData.wings = [1, -1].map((s2) => { const w = V.box(0.35, 0.04, 0.5, '#5b6178', 0.05, 0.2, s2 * 0.3, gr); return w; }); }
      sc.add(gr); return gr; });
    D3.mis = V.pool(() => { const gr = new Th.Group(); const b = V.cyl(0.17, 0.17, 1.1, '#c9cfdb', 0, 0, 0, gr, 12); b.rotation.z = Math.PI / 2; const n = new Th.Mesh(new Th.ConeGeometry(0.17, 0.4, 12), V.M('#ff4d5e')); n.rotation.z = Math.PI / 2; n.position.x = -0.75; gr.add(n); V.box(0.2, 0.6, 0.04, '#3c435a', 0.45, 0, 0, gr); sc.add(gr); return gr; });
    V.camera.fov = 52; V.camera.updateProjectionMatrix();
  });
  function draw3() {
    const Th = V.T, t = R.t, rx = SX(R.dist), camX = rx + 5.2;
    V.camera.position.set(camX, 0.6, 15); V.camera.lookAt(camX, 0.2, 0);
    const thrust = held || keys.Space || keys.ArrowUp || keys.KeyW;
    D3.rocket.visible = !R.over; D3.rocket.position.set(rx, SY(R.y), 0); D3.rocket.rotation.z = Math.max(-0.5, Math.min(0.5, -R.vy / 1100)); D3.rocket.rotation.x = t * 1.2;
    if (D3.body.userData.c !== R.color) { D3.body.material = V.M(R.color, { metalness: 0.4, roughness: 0.3 }); D3.body.userData.c = R.color; }
    D3.flame.visible = thrust && !R.over; D3.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
    D3.shield.visible = R.shields > 0; D3.rocket.traverse((o) => { if (o.material && o !== D3.shield) o.visible = !(R.inv > 0 && Math.sin(t * 30) > 0) || o === D3.rocket; });
    if (thrust && !R.over && Math.random() < 0.6) V.puff(rx - 1.1, SY(R.y), 0, '#e8e8ee', 0.4, 0.8, -3, -0.4, (Math.random() - 0.5), 1.2, 0.6);
    const span = 23 * 2.4 / 2;
    for (const c of D3.clouds) { const u = c.userData, x = camX - 30 + ((((u.off - camX * 0.98) % 55) + 55) % 55); c.position.set(x, u.top ? SY(CEIL) + 1 + u.dy : SY(FLOOR) - 1 - u.dy, u.z); }
    for (const c of D3.far) { const u = c.userData, x = camX - 60 + ((((u.off * 1 - camX * 0.6) % 144) + 144) % 144); c.position.set(x, u.y, u.z); }
    D3.items.sync(R.items, (m, it) => { m.position.set(SX(it.x), SY(it.y), 0); m.rotation.y = t * 3 + it.x * 0.01; });
    D3.obs.sync(R.obs, (m, o) => { m.position.set(SX(o.x), SY(o.y), 0); if (o.type === 'zap') m.rotation.z = -o.a; else { m.userData.wings.forEach((w, i) => (w.rotation.x = (i ? -1 : 1) * Math.sin(t * 18 + o.ph) * 0.8)); } });
    D3.mis.sync(R.missiles.filter((mi) => mi.warn <= 0), (m, mi) => { m.position.set(SX(mi.x), SY(mi.y), 0); if (Math.random() < 0.5) V.puff(SX(mi.x) + 0.7, SY(mi.y), 0, '#c9cfdb', 0.35, 0.4, 2, 0, 0, 0.8, 0.6); });
    for (const q of R.parts) if (!q.shown && q.size > 5) { q.shown = true; V.puff(SX(q.x), SY(q.y), 0, q.color, 0.25, 0.6, q.vx * K, -q.vy * K, 0, 0, 1, 6); }
    V.frame();
    for (const mi of R.missiles) if (mi.warn > 0) V.label(camX + 9.5, SY(mi.y), 0, '⚠️', { size: 30, alpha: Math.sin(t * 20) > 0 ? 1 : 0.5 });
    if (!R.started) V.label(camX, -3.2, 0, 'Hold to fly · let go to drop', { size: 26, color: '#16203d', bg: 'rgba(255,255,255,.85)' });
  }

  function sload() {
    SS = Object.assign({ best: 0, runs: 0, owned: ['red'], skin: 'red' }, store.get('lsp_sky_' + profile.email, {}));
    SS.upg = Object.assign({ magnet: 0, value: 0, armor: 0 }, SS.upg || {});
  }
  function ssave() { store.set('lsp_sky_' + profile.email, SS); }
  function fit() { L.fit(cv); view.w = cv.width; view.h = cv.height; view.z = view.h / H; }
  addEventListener('resize', () => { if (L.isActive('s-sky')) fit(); });

  function startRun() {
    fit();
    R = {
      dist: 0, speed: 330, y: H / 2, vy: 0, stars: 0, shields: SS.upg.armor, inv: 0, magnetT: 0, over: false, paused: false, started: false, t: 0,
      obs: [], items: [], parts: [], missiles: [], spawnX: 900, missileT: 7, powerX: 2600, color: (SKINS.find((s) => s.id === SS.skin) || SKINS[0]).color, deadT: 0,
      rng: L.rng((Date.now() & 0xffff) + 1),
    };
    scr.classList.toggle('touch', L.isTouch());
    L.closeModal('sd-modal'); show('s-sky'); fit(); V.init();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
  }

  const vw = () => view.w / view.z;
  const px = () => vw() * 0.26;

  function spawnPattern() {
    const r = R.rng, x = R.spawnX, m = R.dist / 20;
    const hard = Math.min(1, m / 1500);
    const kind = r();
    if (kind < 0.55) {
      const len = 110 + r() * 110 + hard * 40, angs = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
      const a = angs[(r() * angs.length) | 0], cy = CEIL + 70 + r() * (FLOOR - CEIL - 140);
      const spin = m > 400 && r() < 0.25 + hard * 0.3 ? (r() < 0.5 ? -1 : 1) * (0.8 + hard * 1.2) : 0;
      R.obs.push({ type: 'zap', x, y: cy, len, a, spin });
      if (m > 250 && r() < 0.3 + hard * 0.3) {
        const cy2 = cy < H / 2 ? cy + 200 + r() * 80 : cy - 200 - r() * 80;
        R.obs.push({ type: 'zap', x: x + 160 + r() * 80, y: Math.max(CEIL + 60, Math.min(FLOOR - 60, cy2)), len: 100 + r() * 80, a: angs[(r() * angs.length) | 0], spin: 0 });
      }
    } else if (kind < 0.8) {
      const n = 1 + Math.floor(r() * (1 + hard * 2.5));
      for (let i = 0; i < n; i++) R.obs.push({ type: 'bird', x: x + i * 90, y0: CEIL + 60 + r() * (FLOOR - CEIL - 120), amp: 25 + r() * 35, ph: r() * 6, sp: 60 + r() * 60 + hard * 60, y: 0 });
    } else {
      // star pattern in open air
      const cy = CEIL + 80 + r() * (FLOOR - CEIL - 160), shape = r();
      for (let i = 0; i < 8; i++) {
        const sx = x + i * 34, sy = shape < 0.4 ? cy : shape < 0.7 ? cy - Math.sin((i / 7) * Math.PI) * 70 : cy + (i % 2 ? 18 : -18);
        R.items.push({ type: 'star', x: sx, y: sy });
      }
    }
    // loose stars between obstacles
    if (kind < 0.8 && r() < 0.6) {
      const cy = CEIL + 60 + r() * (FLOOR - CEIL - 120);
      for (let i = 0; i < 5; i++) R.items.push({ type: 'star', x: x + 240 + i * 32, y: cy });
    }
    R.spawnX += Math.max(300, 560 - hard * 220) + r() * 180;
  }

  function hitSeg(o, cx, cy, r) {
    const hx = Math.cos(o.a) * o.len / 2, hy = Math.sin(o.a) * o.len / 2;
    const x1 = o.x - hx, y1 = o.y - hy, x2 = o.x + hx, y2 = o.y + hy;
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(cx - (x1 + dx * t), cy - (y1 + dy * t)) < r;
  }

  function burst(x, y, color, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7); R.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, color, size: 3 + Math.random() * 4 }); } }

  function hurt() { LSPG.sfx('crash');
    if (R.inv > 0 || R.over) return;
    if (R.shields > 0) { R.shields--; R.inv = 1.4; burst(R.dist, R.y, '#4fb6f0', 22, 260); return; }
    R.over = true; R.deadT = 1.2; R.finalM = Math.floor(R.dist / 20); burst(R.dist, R.y, R.color, 36, 340); burst(R.dist, R.y, '#ffb31a', 24, 260);
    setTimeout(endRun, 900);
  }

  function endRun() { LSPG.sfx('explode', { volume: 0.7 });
    const m = R.finalM, starPts = Math.floor(R.stars * (1 + 0.2 * SS.upg.value)), distPts = Math.floor(m / 10);
    const got = Wallet.add(distPts + starPts);
    const newBest = m > SS.best; if (newBest) SS.best = m; SS.runs++; ssave(); refreshPoints();
    L.modal('sd-modal', `<h2>${newBest ? 'New best!' : 'Crashed!'}</h2><p class="big">⭐ +${got.toLocaleString()}</p>
      <p class="muted">${m.toLocaleString()} m flown (${distPts} points) and ${R.stars} stars (${starPts} points). Best: ${SS.best.toLocaleString()} m.</p>
      <div class="modal-actions"><button class="btn primary" data-a="again">Fly again</button><button class="btn ghost" data-a="shop">Upgrades</button><button class="btn ghost" data-a="lobby">Back</button></div>`,
      { again: startRun, shop: () => { stop(); openLobby('upgrades'); }, lobby: () => { stop(); openLobby('fly'); } });
  }

  function update(dt) {
    R.t += dt;
    for (const q of R.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 400 * dt; q.life -= dt; }
    R.parts = R.parts.filter((q) => q.life > 0);
    const thrust = held || keys.Space || keys.ArrowUp || keys.KeyW;
    if (!R.started) { if (thrust) R.started = true; else { R.y = H / 2 + Math.sin(R.t * 3) * 10; return; } }
    if (R.over) { R.dist += R.speed * dt * 0.3; return; }
    R.speed = Math.min(760, 330 + R.dist * 0.018);
    R.dist += R.speed * dt;
    R.vy += (thrust ? -2500 : 1450) * dt;
    R.vy = Math.max(-520, Math.min(680, R.vy));
    R.y += R.vy * dt;
    if (R.y < CEIL + PR) { R.y = CEIL + PR; R.vy = Math.max(0, R.vy); }
    if (R.y > FLOOR - PR) { R.y = FLOOR - PR; R.vy = Math.min(0, R.vy); }
    if (thrust && Math.random() < 0.7) R.parts.push({ x: R.dist - 22, y: R.y + 10, vx: -120 - Math.random() * 80, vy: 60 + Math.random() * 80, life: 0.35, color: Math.random() < 0.5 ? '#ffb31a' : '#ff8a3d', size: 4 + Math.random() * 3 });
    R.inv = Math.max(0, R.inv - dt); R.magnetT = Math.max(0, R.magnetT - dt);

    while (R.spawnX < R.dist + vw() * 1.4) spawnPattern();
    if (R.dist > R.powerX) { R.items.push({ type: R.rng() < 0.5 ? 'shield' : 'magnet', x: R.dist + vw(), y: CEIL + 80 + R.rng() * (FLOOR - CEIL - 160) }); R.powerX += 2600 + R.rng() * 2200; }
    const m = R.dist / 20;
    if (m > 150) {
      R.missileT -= dt;
      if (R.missileT <= 0) { R.missiles.push({ warn: 1.2, y: R.y, x: 0, vx: 0 }); R.missileT = Math.max(2.4, 7 - m / 400) + R.rng() * 3; }
    }
    for (const mi of R.missiles) {
      if (mi.warn > 0) { mi.warn -= dt; if (mi.warn > 0.35) mi.y += (R.y - mi.y) * Math.min(1, dt * 5); if (mi.warn <= 0) { mi.x = R.dist + vw(); mi.vx = -(R.speed + 700); } }
      else { mi.x += mi.vx * dt; if (Math.random() < 0.8) R.parts.push({ x: mi.x + 26, y: mi.y, vx: 80, vy: (Math.random() - 0.5) * 60, life: 0.3, color: '#c9cfdb', size: 5 }); }
    }
    R.missiles = R.missiles.filter((mi) => mi.warn > 0 || mi.x > R.dist - px() - 100);

    const left = R.dist - px() - 200;
    for (const o of R.obs) {
      if (o.type === 'zap') { o.a += o.spin * dt; if (hitSeg(o, R.dist, R.y, PR + 7)) hurt(); }
      else { o.x -= o.sp * dt; o.y = o.y0 + Math.sin(R.t * 3 + o.ph) * o.amp; if (Math.hypot(o.x - R.dist, o.y - R.y) < PR + 15) hurt(); }
    }
    for (const mi of R.missiles) if (mi.warn <= 0 && Math.abs(mi.x - R.dist) < 30 && Math.abs(mi.y - R.y) < PR + 9) { hurt(); mi.x = -1e9; }
    R.obs = R.obs.filter((o) => o.x > left);

    const pull = R.magnetT > 0 ? 280 : SS.upg.magnet * 35;
    for (const it of R.items) {
      const d = Math.hypot(it.x - R.dist, it.y - R.y);
      if (it.type === 'star' && pull > 0 && d < pull) { it.x += (R.dist - it.x) * Math.min(1, dt * 8); it.y += (R.y - it.y) * Math.min(1, dt * 8); }
      if (d < PR + 14) {
        it.taken = true;
        if (it.type === 'star') { R.stars++; LSPG.sfx('coin', { volume: 0.5 }); R.parts.push({ x: it.x, y: it.y, vx: 0, vy: -40, life: 0.4, color: '#ffe28a', size: 8 }); }
        else if (it.type === 'shield') { R.shields++; burst(it.x, it.y, '#4fb6f0', 16, 200); }
        else { R.magnetT = 9; burst(it.x, it.y, '#ff4d8b', 16, 200); }
      }
    }
    R.items = R.items.filter((it) => !it.taken && it.x > left);
  }

  function star(x, y, r, rot) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    g.closePath(); g.fill();
  }

  function drawRocket(x, y, tilt, color, flame) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    if (flame) { g.fillStyle = '#ffb31a'; g.beginPath(); g.moveTo(-18, -6); g.lineTo(-34 - Math.random() * 12, 0); g.lineTo(-18, 6); g.fill(); }
    g.fillStyle = '#3c435a'; g.beginPath(); g.moveTo(-14, -8); g.lineTo(-22, -16); g.lineTo(-6, -9); g.fill(); g.beginPath(); g.moveTo(-14, 8); g.lineTo(-22, 16); g.lineTo(-6, 9); g.fill();
    g.fillStyle = color; g.strokeStyle = '#16203d'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-18, -10); g.lineTo(8, -10); g.quadraticCurveTo(24, -8, 26, 0); g.quadraticCurveTo(24, 8, 8, 10); g.lineTo(-18, 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e6f4ff'; g.beginPath(); g.arc(4, 0, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-14, -7, 16, 3);
    g.restore();
  }

  function draw() {
    if (V.ready) return draw3();
    const z = view.z, W = vw(), camX = R.dist - px();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, view.h); gr.addColorStop(0, '#bfe3ff'); gr.addColorStop(0.7, '#eaf6ff'); gr.addColorStop(1, '#fff5e8'); g.fillStyle = gr; g.fillRect(0, 0, view.w, view.h);
    g.setTransform(z, 0, 0, z, 0, 0);
    // far clouds
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 10; i++) { const x = ((i * 419 - camX * 0.15) % (W + 400) + W + 400) % (W + 400) - 200, y = 90 + (i * 97) % 300; g.beginPath(); g.arc(x, y, 30, 0, 7); g.arc(x + 36, y - 12, 38, 0, 7); g.arc(x + 76, y, 28, 0, 7); g.fill(); }
    // cloud floor and ceiling
    g.fillStyle = '#ffffff';
    for (let i = -1; i < W / 70 + 2; i++) { const x = i * 70 - (camX * 0.9) % 70; g.beginPath(); g.arc(x, FLOOR + 40, 46, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = -1; i < W / 60 + 2; i++) { const x = i * 60 - (camX * 0.9) % 60; g.beginPath(); g.arc(x, CEIL - 26, 34, 0, 7); g.fill(); }
    g.setTransform(z, 0, 0, z, -camX * z, 0);
    for (const it of R.items) {
      if (it.type === 'star') { g.fillStyle = '#ffb31a'; star(it.x, it.y, 11, R.t * 2 + it.x * 0.01); g.fillStyle = '#ffe28a'; star(it.x, it.y, 5, R.t * 2 + it.x * 0.01); }
      else { const c = it.type === 'shield' ? '#4fb6f0' : '#ff4d8b'; g.fillStyle = c; g.globalAlpha = 0.25; g.beginPath(); g.arc(it.x, it.y, 22 + Math.sin(R.t * 5) * 2, 0, 7); g.fill(); g.globalAlpha = 1; g.font = '22px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.type === 'shield' ? '🛡️' : '🧲', it.x, it.y + 1); g.textBaseline = 'alphabetic'; }
    }
    for (const o of R.obs) {
      if (o.type === 'zap') {
        const hx = Math.cos(o.a) * o.len / 2, hy = Math.sin(o.a) * o.len / 2;
        g.strokeStyle = 'rgba(255,214,64,.35)'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(o.x - hx, o.y - hy); g.lineTo(o.x + hx, o.y + hy); g.stroke();
        g.strokeStyle = '#ffd640'; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 10; i++) { const t = i / 10, j = i === 0 || i === 10 ? 0 : (Math.random() - 0.5) * 12; g.lineTo(o.x - hx + hx * 2 * t - Math.sin(o.a) * j, o.y - hy + hy * 2 * t + Math.cos(o.a) * j); }
        g.stroke();
        for (const s of [-1, 1]) { g.fillStyle = '#3c435a'; g.beginPath(); g.arc(o.x + hx * s, o.y + hy * s, 11, 0, 7); g.fill(); g.fillStyle = '#ffd640'; g.beginPath(); g.arc(o.x + hx * s, o.y + hy * s, 5, 0, 7); g.fill(); }
      } else {
        const flap = Math.sin(R.t * 18 + o.ph) * 8;
        g.fillStyle = '#5b6178'; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + 10, o.y - 6 - flap); g.lineTo(o.x + 18, o.y); g.fill();
        g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(o.x, o.y, 15, 0, 7); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(o.x - 6, o.y - 4, 5, 0, 7); g.fill(); g.fillStyle = '#16203d'; g.beginPath(); g.arc(o.x - 7, o.y - 4, 2.2, 0, 7); g.fill();
        g.fillStyle = '#ffb31a'; g.beginPath(); g.moveTo(o.x - 14, o.y); g.lineTo(o.x - 24, o.y + 3); g.lineTo(o.x - 14, o.y + 6); g.fill();
      }
    }
    for (const mi of R.missiles) {
      if (mi.warn > 0) {
        const x = camX + W - 36, blink = Math.sin(R.t * 20) > 0;
        g.fillStyle = blink ? '#ff4d5e' : '#ffb31a'; g.beginPath(); g.moveTo(x, mi.y - 16); g.lineTo(x + 16, mi.y + 12); g.lineTo(x - 16, mi.y + 12); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.font = '700 16px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('!', x, mi.y + 9);
      } else {
        g.fillStyle = '#c9cfdb'; rr(g, mi.x - 22, mi.y - 7, 44, 14, 7); g.fill();
        g.fillStyle = '#ff4d5e'; g.beginPath(); g.moveTo(mi.x - 22, mi.y - 7); g.lineTo(mi.x - 32, mi.y); g.lineTo(mi.x - 22, mi.y + 7); g.fill();
        g.fillStyle = '#3c435a'; g.fillRect(mi.x + 14, mi.y - 11, 6, 22);
      }
    }
    for (const q of R.parts) { g.globalAlpha = Math.max(0, q.life / 0.7); g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size / 2, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    {
      if (!R.over) {
        if (R.inv > 0 && Math.sin(R.t * 30) > 0) g.globalAlpha = 0.45;
        drawRocket(R.dist, R.y, Math.max(-0.5, Math.min(0.5, R.vy / 1100)), R.color, held || keys.Space || keys.ArrowUp || keys.KeyW);
        g.globalAlpha = 1;
        if (R.shields > 0) { g.strokeStyle = 'rgba(79,182,240,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(R.dist, R.y, 28, 0, 7); g.stroke(); g.fillStyle = 'rgba(79,182,240,.12)'; g.fill(); }
        if (R.magnetT > 0) { g.strokeStyle = 'rgba(255,77,139,.35)'; g.setLineDash([6, 8]); g.lineWidth = 2; g.beginPath(); g.arc(R.dist, R.y, 44, R.t, R.t + 6.28); g.stroke(); g.setLineDash([]); }
      }
    }
    if (!R.started) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = 'rgba(255,255,255,.8)'; const bw = Math.min(view.w * 0.8, 520 * view.z / 1.2), bh = 90 * view.z;
      rr(g, view.w / 2 - bw / 2, view.h * 0.62, bw, bh, 18 * view.z); g.fill();
      g.fillStyle = '#16203d'; g.textAlign = 'center'; g.font = `700 ${Math.round(32 * view.z)}px Fredoka, system-ui, sans-serif`;
      g.fillText('Hold to fly', view.w / 2, view.h * 0.62 + 44 * view.z);
      g.fillStyle = '#66708f'; g.font = `800 ${Math.round(16 * view.z)}px Nunito, system-ui, sans-serif`;
      g.fillText('Let go to drop', view.w / 2, view.h * 0.62 + 72 * view.z);
    }
  }

  function hud() {
    $('#sd-dist').textContent = `${(R.over ? R.finalM : Math.floor(R.dist / 20)).toLocaleString()} m`;
    $('#sd-stars').textContent = `✨ ${R.stars}`;
    $('#sd-shield').textContent = `🛡️ ${R.shields}`;
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
    if (R && !R.paused) update(dt);
    if (R) { draw(); hud(); }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; held = false; L.closeModal('sd-modal'); for (const k in keys) keys[k] = false; }
  function pause() {
    if (!R || R.over) return;
    if (R.paused) { R.paused = false; L.closeModal('sd-modal'); last = performance.now(); return; }
    R.paused = true; held = false;
    L.modal('sd-modal', '<h2>Paused</h2><p class="muted">Quitting ends this run without points.</p><div class="modal-actions"><button class="btn primary" data-a="resume">Resume</button><button class="btn ghost" data-a="quit">Quit</button></div>',
      { resume: pause, quit: () => { stop(); openLobby('fly'); } });
  }
  $('#sd-pause').onclick = pause;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); held = true; });
  addEventListener('pointerup', () => { held = false; });
  addEventListener('pointercancel', () => { held = false; });
  addEventListener('keydown', (e) => {
    if (!L.isActive('s-sky')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { pause(); return; }
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { held = false; for (const k in keys) keys[k] = false; });

  /* ---------- lobby ---------- */
  const setTab = L.tabs('#s-slobby', () => render());
  function render() {
    $('#sd-stats').innerHTML = `<span class="pill">🏆 Best ${SS.best.toLocaleString()} m</span><span class="pill">🛡️ ${SS.upg.armor} starting shield${SS.upg.armor === 1 ? '' : 's'}</span><span class="pill">🚀 ${SS.runs} flights</span>`;
    $('#sd-upg').innerHTML = L.upgradeCards([ARMOR], SS.upg, ARMOR_COST, 3, 'data-sda') + L.upgradeCards(UPG, SS.upg, UPG_COST, 5, 'data-sdu');
    $$('[data-sda]').forEach((b) => (b.onclick = () => { if (!Wallet.spend(ARMOR_COST[SS.upg.armor])) return; SS.upg.armor++; ssave(); render(); toast('Shield Pack upgraded'); }));
    $$('[data-sdu]').forEach((b) => (b.onclick = () => { const id = b.dataset.sdu; if (!Wallet.spend(UPG_COST[SS.upg[id]])) return; SS.upg[id]++; ssave(); render(); toast('Upgrade installed'); }));
    $('#sd-skins').innerHTML = L.skinCards(SKINS, SS.owned, SS.skin, 'data-sds');
    $$('[data-sds]').forEach((b) => (b.onclick = () => {
      const s = SKINS.find((x) => x.id === b.dataset.sds);
      if (!SS.owned.includes(s.id)) { if (!Wallet.spend(s.cost)) return; SS.owned.push(s.id); }
      SS.skin = s.id; ssave(); render(); toast(s.name + ' equipped');
    }));
    refreshPoints();
  }
  function openLobby(tab) { sload(); show('s-slobby'); setTab(tab || 'fly'); }
  $('#sd-go').onclick = startRun;
  $('#sd-back').onclick = () => enterHub();

  L.addCard({ grid: 'arcade-games', id: 'card-sky', emoji: '🚀', bg: '#ece6ff', title: 'Sky Dash', desc: 'Hold to fly a rocket through zappers, birds and missiles.', open: () => openLobby('fly') });
  L.onHub(() => { sload(); L.setProg('card-sky', SS.best ? `Best flight ${SS.best.toLocaleString()} m` : 'Not flown yet'); });
})();
