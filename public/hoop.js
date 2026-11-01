/* Hoop Shot: drag back and release to shoot. 60 seconds, swishes and streaks score more. */
(function () {
  'use strict';
  const L = LSPG, rr = L.rr;
  const W = 1000, H = 600, GR = 1500, BR = 22, FLOOR = 560;
  const BALLS = [
    { id: 'classic', name: 'Classic', icon: '🏀', cost: 0, c1: '#ff8a3d', c2: '#16203d' }, { id: 'street', name: 'Street', icon: '🔵', cost: 300, c1: '#2f6bff', c2: '#ffffff' },
    { id: 'neon', name: 'Neon', icon: '🟢', cost: 700, c1: '#14c79a', c2: '#0b5c48' }, { id: 'gold', name: 'Golden', icon: '🟡', cost: 2000, c1: '#f2b61f', c2: '#8a6100' },
  ].map((b) => ({ ...b, desc: 'Ball skin' }));
  const DB = L.store('hoop', { best: 0, owned: ['classic'], ball: 'classic', games: 0 });
  let S = null; const save = () => DB.save(S);
  const A = L.makeGame({
    key: 'hoop', title: 'Hoop Shot', emoji: '🏀', cardBg: '#ffe9d9', grid: 'arcade-games', bg: '#f3eee6', world: { w: W, h: H },
    desc: 'Drag and flick to shoot hoops. Swishes and streaks score big.',
    tabs: [['play', 'Play'], ['balls', 'Balls']],
    hud: '<span class="hudpill" id="hp-score">Score 0</span><span class="hudpill" id="hp-time">⏱️ 60</span><span class="hudpill" id="hp-streak">🔥 0</span>',
    help: 'Drag back from the ball and let go to shoot',
    progress: () => { const s = DB.load(); return s.best ? `Best score ${s.best}` : 'Shoot some hoops!'; },
  });
  const g = A.g;
  let G = null;

  /* ---------- 3D gym ---------- */
  const SC = 3.05 / 330, X = (x) => (x - 500) * SC, Y = (y) => (FLOOR - y) * SC;
  const V = L.g3d(A, { background: '#2a2f3d', fog: false, shadowSize: 8 });
  const D3 = {};
  V.onReady((V) => {
    const T = V.T, sc = V.scene;
    const wood = V.tex(256, 256, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#d9a86c', '#cf9c5f', '#e0b177', '#d4a266'][i % 4]; c.fillRect(0, i * 32, 256, 32); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, i * 32 + 30, 256, 2); c.fillRect((i * 97) % 256, i * 32, 2, 32); } }, [6, 4]);
    const floor = new T.Mesh(new T.PlaneGeometry(26, 20), new T.MeshStandardMaterial({ map: wood, roughness: 0.35, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    // court lines
    const line = V.M('#ffffff', { roughness: 0.4 });
    const arc = new T.Mesh(new T.RingGeometry(6.6, 6.7, 64, 1, 0, Math.PI), line); arc.rotation.x = -Math.PI / 2; arc.rotation.z = Math.PI / 2; arc.position.set(X(770), 0.005, 0); sc.add(arc);
    V.box(0.05, 0.01, 12, line, X(770) - 4.2, 0.005, 0, sc, false);
    // walls, bleachers, crowd
    V.box(30, 9, 0.4, '#3b4a6b', 0, 4.5, -7, sc, false);
    V.box(30, 0.8, 0.4, '#ff4d5e', 0, 3.2, -6.75, sc, false);
    for (let r = 0; r < 4; r++) {
      V.box(24, 0.45, 1, '#59637a', 0, 0.25 + r * 0.55, -3.6 - r * 0.9, sc);
      for (let i = 0; i < 34; i++) { if (Math.random() < 0.25) continue; const c = ['#ff8a3d', '#2f6bff', '#14c79a', '#ffd23f', '#ff4d8b', '#ffffff', '#16203d'][Math.floor(Math.random() * 7)]; const p = V.box(0.32, 0.5, 0.3, c, -11 + i * 0.66 + Math.random() * 0.2, 0.75 + r * 0.55, -3.6 - r * 0.9, sc, false); V.box(0.22, 0.22, 0.22, '#f1c27d', 0, 0.36, 0, p, false); D3.fans = D3.fans || []; D3.fans.push(p); }
    }
    const sign = V.sprite('🏀 LSP ARENA', 7, 1.1, '#16203d', '#fff'); sign.position.set(0, 6.5, -6.7);
    for (const x of [-8, 0, 8]) { const l = new T.PointLight('#fff4dd', 25, 30); l.position.set(x, 8, 2); sc.add(l); V.box(1.2, 0.15, 0.6, V.M('#ffffff', { emissive: '#fff4dd', emissiveIntensity: 1 }), x, 8.2, 2, sc, false); }
    // hoop: pole, backboard, rim, net (moves as a group)
    const hoop = new T.Group(); sc.add(hoop); D3.hoop = hoop;
    V.box(0.18, 3.6, 0.18, '#5d6680', 0.85, 1.8, -0.55, hoop); V.box(0.18, 0.18, 0.6, '#5d6680', 0.85, 3.5, -0.27, hoop);
    V.box(0.28, 1.6, 0.28, V.M('#ff4d5e'), 0.85, 0.3, -0.55, hoop);
    const board = V.box(0.06, 1.25, 1.8, V.M('#ffffff', { transparent: true, opacity: 0.88, roughness: 0.1 }), (58 + 5) * SC, Y(230) + 0.55, 0, hoop);
    V.box(0.07, 0.42, 0.6, V.M('#ff4d5e'), 0, -0.25, 0, board, false).material = V.M('#ff4d5e');
    const rim = new T.Mesh(new T.TorusGeometry(45 * SC, 0.02, 8, 32), V.M('#ff5a1f', { metalness: 0.6, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.set(0, Y(230), 0); rim.castShadow = true; hoop.add(rim);
    const net = new T.Mesh(new T.CylinderGeometry(45 * SC, 28 * SC, 0.5, 14, 4, true), new T.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.85 })); net.position.set(0, Y(230) - 0.25, 0); hoop.add(net); D3.net = net;
    // ball with seams
    D3.ballTex = {};
    D3.ball = V.ball(BR * SC, '#ff8a3d', 0, 1, 0, sc, 28);
    D3.dots = []; for (let i = 0; i < 13; i++) { const d = V.ball(0.06, V.M('#ffd23f', { emissive: '#ffb31a', emissiveIntensity: 0.6 }), 0, 0, 0, sc, 8); d.castShadow = false; D3.dots.push(d); }
    V.camera.position.set(-0.3, 2.3, 8.2); V.camera.lookAt(0.6, 1.6, 0); V.camera.fov = 48; V.camera.updateProjectionMatrix();
    V.follow = new T.Vector3(0, 0, 0);
    A.toWorld = (e) => { const p = V.pick(e, { z: 0 }); return p ? { x: p.x / SC + 500, y: FLOOR - p.y / SC } : { x: -999, y: -999 }; };
  });
  function ballSkin() {
    const bl = BALLS.find((b) => b.id === S.ball) || BALLS[0];
    if (!D3.ballTex[bl.id]) D3.ballTex[bl.id] = V.tex(256, 128, (c, w, h) => { c.fillStyle = bl.c1; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = bl.c2; c.lineWidth = 4; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); for (const x of [w / 4, (3 * w) / 4]) { c.moveTo(x, 0); c.lineTo(x, h); } c.stroke(); c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.18, h * 0.6, 0, 0, 7); c.stroke(); });
    return D3.ballTex[bl.id];
  }
  function draw3() {
    const b = G.ball, T = V.T;
    D3.hoop.position.x = X(G.hoop.x);
    const tex = ballSkin(); if (D3.ball.material.map !== tex) { D3.ball.material = new T.MeshStandardMaterial({ map: tex, roughness: 0.6 }); }
    D3.ball.position.set(X(b.x), Y(b.y), 0); D3.ball.rotation.z = -b.x * 0.03;
    D3.net.scale.y = G.msg && G.msg.t > 0.8 ? 1.2 : 1;
    const t = performance.now() / 1000;
    if (D3.fans) D3.fans.forEach((f, i) => { f.position.y = f.userData.y0 === undefined ? (f.userData.y0 = f.position.y) : f.userData.y0 + (G.msg ? Math.abs(Math.sin(t * 9 + i)) * 0.18 : 0); });
    // aim preview
    let show = false;
    if (G.drag) {
      const d = G.drag; let vx = (d.sx - d.x) * 6.2, vy = (d.sy - d.y) * 6.2; const m = Math.hypot(vx, vy); if (m > 1500) { vx *= 1500 / m; vy *= 1500 / m; }
      show = true; D3.dots.forEach((dot, i) => { const tt = (i + 1) * 0.05; dot.position.set(X(b.x + vx * tt), Y(b.y + vy * tt + 0.5 * GR * tt * tt), 0); dot.visible = true; });
    }
    if (!show) D3.dots.forEach((dot) => (dot.visible = false));
    if (G.newParts) { for (const q of G.newParts) V.burst(X(q.x), Y(q.y), 0, ['#ffb31a', '#ff4d5e', '#2f6bff', '#14c79a'], 20, 3, 0.2); G.newParts = null; }
    V.frame();
    if (!b.live && !G.drag) V.label(X(b.x), Y(b.y) + 0.55, 0, 'Drag back and let go', { size: 15, color: '#fff', stroke: 'rgba(0,0,0,.5)' });
    if (G.msg) V.label(X(G.hoop.x), Y(230) + 1.6, 0, G.msg.text, { size: 40, color: G.streak >= 3 ? '#ff4d5e' : '#ffffff', stroke: 'rgba(0,0,0,.45)', alpha: Math.min(1, G.msg.t * 2) });
  }

  function start() {
    S = DB.load();
    G = { score: 0, time: 60, streak: 0, made: 0, shots: 0, ball: null, drag: null, hoop: { x: 700, y: 230, vx: 0 }, parts: [], t: 0, msg: null };
    newBall(); A.play(); V.init(); A.run(step); hud();
  }
  A.onAgain = start;
  function newBall() { G.ball = { x: 140 + Math.random() * 300, y: FLOOR - BR - 40, vx: 0, vy: 0, live: false, touched: false, scored: false, t: 0, above: false }; }
  const rimL = () => ({ x: G.hoop.x - 45, y: G.hoop.y }), rimR = () => ({ x: G.hoop.x + 45, y: G.hoop.y });
  function hud() { $('#hp-score').textContent = `Score ${G.score}`; $('#hp-time').textContent = `⏱️ ${Math.ceil(G.time)}`; $('#hp-streak').textContent = G.streak >= 3 ? `🔥 ${G.streak} ON FIRE` : `🔥 ${G.streak}`; }

  A.cv.addEventListener('pointerdown', (e) => { if (!G || A.over || A.paused || !L.isActive('s-hoop') || G.ball.live) return; const p = A.toWorld(e); if (Math.hypot(p.x - G.ball.x, p.y - G.ball.y) < 110) G.drag = { sx: p.x, sy: p.y, x: p.x, y: p.y }; });
  A.cv.addEventListener('pointermove', (e) => { if (G && G.drag) { const p = A.toWorld(e); G.drag.x = p.x; G.drag.y = p.y; } });
  addEventListener('pointerup', () => {
    if (!G || !G.drag) return; const d = G.drag; G.drag = null;
    let vx = (d.sx - d.x) * 6.2, vy = (d.sy - d.y) * 6.2; const m = Math.hypot(vx, vy); if (m < 150) return;
    if (m > 1500) { vx *= 1500 / m; vy *= 1500 / m; }
    Object.assign(G.ball, { vx, vy, live: true }); G.shots++;
  });

  function collideCircle(b, p, r) {
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
    if (d < BR + r && d > 0) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = p.x + nx * (BR + r); b.y = p.y + ny * (BR + r); if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; } b.touched = true; }
  }
  function step(dt) {
    if (dt > 0 && !A.over) update(dt);
    draw();
  }
  function update(dt) {
    G.t += dt; G.time -= dt; if (G.time <= 0) { G.time = 0; hud(); return finish(); }
    if (G.score >= 10) { const sp = 60 + Math.min(160, (G.score - 10) * 6); if (!G.hoop.vx) G.hoop.vx = sp; G.hoop.vx = Math.sign(G.hoop.vx) * sp; G.hoop.x += G.hoop.vx * dt; if (G.hoop.x > 860) G.hoop.vx = -sp; if (G.hoop.x < 560) G.hoop.vx = sp; }
    const b = G.ball;
    if (b.live) {
      const sub = 3; for (let i = 0; i < sub; i++) {
        const h = dt / sub; b.vy += GR * h; const py = b.y; b.x += b.vx * h; b.y += b.vy * h;
        collideCircle(b, rimL(), 6); collideCircle(b, rimR(), 6);
        const bx = G.hoop.x + 58; if (b.x + BR > bx && b.x - BR < bx + 10 && b.y > G.hoop.y - 130 && b.y < G.hoop.y + 20) { if (b.vx > 0) { b.x = bx - BR; b.vx *= -0.6; } else { b.x = bx + 10 + BR; b.vx *= -0.6; } b.touched = true; }
        if (!b.scored && py < G.hoop.y && b.y >= G.hoop.y && b.x > rimL().x + 4 && b.x < rimR().x - 4 && b.vy > 0) score(b);
        if (b.y > FLOOR - BR) { b.y = FLOOR - BR; b.vy *= -0.55; b.vx *= 0.8; }
        if (b.x < BR) { b.x = BR; b.vx *= -0.7; } if (b.x > W - BR) { b.x = W - BR; b.vx *= -0.7; }
      }
      b.t += dt;
      if (b.t > 3.5 || (b.y >= FLOOR - BR - 1 && Math.abs(b.vy) < 60 && b.t > 0.6)) { if (!b.scored) { G.streak = 0; hud(); } newBall(); }
    }
    for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.life -= dt; } G.parts = G.parts.filter((q) => q.life > 0);
    if (G.msg) { G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }
    hud();
  }
  function score(b) { LSPG.sfx('swish'); LSPG.sfx('ding', { volume: 0.5 });
    b.scored = true; G.streak++; G.made++;
    let pts = b.touched ? 2 : 3; if (G.streak >= 3) pts *= 2; if (G.hoop.vx) pts += 1;
    G.score += pts; G.time = Math.min(60, G.time + (b.touched ? 0 : 1.5));
    G.msg = { text: `${b.touched ? 'Nice!' : 'SWISH!'} +${pts}${G.streak >= 3 ? ' 🔥' : ''}`, t: 1.1 };
    G.newParts = [{ x: G.hoop.x, y: G.hoop.y + 20 }];
    for (let i = 0; i < 20; i++) G.parts.push({ x: G.hoop.x, y: G.hoop.y + 20, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, life: 0.8, c: ['#ffb31a', '#ff4d5e', '#2f6bff', '#14c79a'][i % 4] });
  }
  function finish() {
    A.over = true; const got = Wallet.add(G.score); const best = G.score > S.best; if (best) S.best = G.score; S.games++; save();
    A.end(best ? 'New high score!' : "Time's up!", got, `You made ${G.made} of ${G.shots} shots for ${G.score} points. Best: ${S.best}.`);
  }
  function drawBall(x, y, rot) {
    const bl = BALLS.find((b) => b.id === S.ball) || BALLS[0];
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = bl.c1; g.beginPath(); g.arc(0, 0, BR, 0, 7); g.fill();
    g.strokeStyle = bl.c2; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, BR, 0, 7); g.moveTo(-BR, 0); g.lineTo(BR, 0); g.moveTo(0, -BR); g.lineTo(0, BR); g.stroke();
    g.beginPath(); g.arc(-BR * 1.2, 0, BR * 0.9, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(BR * 1.2, 0, BR * 0.9, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    g.restore();
  }
  function draw() {
    if (V.ready) return draw3();
    A.begin();
    g.fillStyle = '#fbf6ee'; g.fillRect(0, 0, W, FLOOR);
    g.fillStyle = '#f1e6d6'; for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, FLOOR);
    g.fillStyle = '#e0b07a'; g.fillRect(0, FLOOR, W, H - FLOOR); g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = 0; x < W; x += 50) g.fillRect(x, FLOOR, 2, H - FLOOR);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(700, FLOOR, 240, Math.PI, 2 * Math.PI); g.stroke();
    const hx = G.hoop.x, hy = G.hoop.y;
    g.fillStyle = '#8a93ab'; g.fillRect(hx + 80, hy - 60, 12, FLOOR - hy + 60);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#c3cbdb'; g.lineWidth = 4; rr(g, hx + 58, hy - 130, 12, 150, 4); g.fill(); g.stroke();
    g.strokeStyle = '#ff4d5e'; g.lineWidth = 3; g.strokeRect(hx + 60, hy - 70, 8, 40);
    // net
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
    for (let i = 0; i <= 6; i++) { const x = hx - 45 + i * 15; g.beginPath(); g.moveTo(x, hy); g.lineTo(hx - 28 + i * 9.3, hy + 60); g.stroke(); }
    for (let j = 1; j <= 3; j++) { g.beginPath(); g.moveTo(hx - 45 + j * 5.7, hy + j * 20); g.lineTo(hx + 45 - j * 5.7, hy + j * 20); g.stroke(); }
    const b = G.ball; drawBall(b.x, b.y, b.x * 0.03);
    g.strokeStyle = '#ff4d5e'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx - 45, hy); g.lineTo(hx + 45, hy); g.stroke();
    if (G.drag) {
      const d = G.drag; let vx = (d.sx - d.x) * 6.2, vy = (d.sy - d.y) * 6.2; const m = Math.hypot(vx, vy); if (m > 1500) { vx *= 1500 / m; vy *= 1500 / m; }
      g.fillStyle = 'rgba(47,107,255,.55)'; for (let i = 1; i < 14; i++) { const t = i * 0.05; g.beginPath(); g.arc(b.x + vx * t, b.y + vy * t + 0.5 * GR * t * t, 5 - i * 0.25, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(22,32,61,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - (d.sx - d.x), b.y - (d.sy - d.y)); g.stroke();
    } else if (!b.live) { g.fillStyle = 'rgba(22,32,61,.55)'; g.font = '800 15px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Drag back and let go', b.x, b.y - 40); }
    for (const q of G.parts) { g.globalAlpha = Math.max(0, q.life / 0.8); g.fillStyle = q.c; g.fillRect(q.x - 4, q.y - 4, 8, 8); } g.globalAlpha = 1;
    if (G.msg) { g.globalAlpha = Math.min(1, G.msg.t * 2); g.fillStyle = G.streak >= 3 ? '#ff4d5e' : '#16203d'; g.font = '700 44px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(G.msg.text, 500, 140); g.globalAlpha = 1; }
  }
  A.onTab = (t) => {
    S = DB.load(); const re = () => A.onTab(t);
    if (t === 'play') { A.panel('play').innerHTML = L.playCard('🏀', '60 second shootout', 'Drag back from the ball and let go to shoot. A basket is 2, a swish (no rim) is 3 and adds time. Three in a row puts you on fire for double points. After 10 points the hoop starts moving.', [`🏆 Best ${S.best}`, `🎮 ${S.games} games`], 'hp-go', 'Start'); $('#hp-go').onclick = start; }
    else { A.panel('balls').innerHTML = `<div class="items">${L.shopCards(BALLS, S.owned, S.ball, 'data-hpb')}</div>`; L.bindBuy('data-hpb', BALLS, S, save, re, 'owned', 'ball'); }
  };
})();
