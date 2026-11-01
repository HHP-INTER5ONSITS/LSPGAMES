/* Block Drop: falling blocks puzzle. Clear lines to score. */
(function () {
  'use strict';
  const L = LSPG, rr = L.rr;
  const CW = 10, CH = 20, SZ = 28, BX = 180, BY = 20, W = 660, H = 600;
  const P = {
    I: { c: '#4fd6ff', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] }, O: { c: '#ffd640', m: [[1, 1], [1, 1]] },
    T: { c: '#b36bff', m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] }, S: { c: '#5cd67a', m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { c: '#ff5a6e', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] }, J: { c: '#4f7dff', m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] }, L: { c: '#ff9f40', m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  };
  const DB = L.store('blockdrop', { best: 0, lines: 0, games: 0 });
  let S = null; const save = () => DB.save(S);
  const A = L.makeGame({
    key: 'bdrop', title: 'Block Drop', emoji: '🟦', cardBg: '#dfe9ff', grid: 'puzzle-games', bg: '#e9eef8', world: { w: W, h: H },
    desc: 'Rotate and drop blocks. Clear lines before the stack reaches the top.',
    hud: '<span class="hudpill" id="bd-score">Score 0</span><span class="hudpill" id="bd-level">Level 1</span>',
    padsL: '<button class="kbtn" data-k="left" aria-label="Left">◀</button><button class="kbtn" data-k="right" aria-label="Right">▶</button>',
    padsR: '<button class="kbtn" data-k="down" aria-label="Soft drop">▼</button><button class="kbtn" data-k="drop" aria-label="Hard drop">⤓</button><button class="kbtn jump" data-k="rot" aria-label="Rotate">⟳</button>',
    help: 'Left and right to move, Up to rotate, Down to drop faster, Space to slam', padReserve: 120, rotate: false,
    progress: () => { const s = DB.load(); return s.best ? `High score ${s.best.toLocaleString()}` : 'Clear your first line!'; },
  });
  const g = A.g;
  let G = null;

  /* ---------- 3D arcade cabinet ---------- */
  const V = L.g3d(A, { background: '#141a2e', fog: false, shadowSize: 16, hemi: 0.8 });
  const D3 = {};
  const BXp = (x) => x - CW / 2 + 0.5, BYp = (y) => CH - y - 0.5;
  V.onReady((V) => {
    const T = V.T, sc = V.scene;
    const geo = new T.BoxGeometry(0.94, 0.94, 0.94);
    D3.cells = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ roughness: 0.25, metalness: 0.15 }), CW * CH + 8); D3.cells.castShadow = true; sc.add(D3.cells);
    D3.ghost = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ transparent: true, opacity: 0.22, roughness: 0.4 }), 4); sc.add(D3.ghost);
    D3.next = new T.InstancedMesh(new T.BoxGeometry(0.6, 0.6, 0.6), new T.MeshStandardMaterial({ roughness: 0.3 }), 12); D3.next.castShadow = true; sc.add(D3.next);
    // cabinet: back panel with grid, side rails, floor
    const grid = V.tex(64, 64, (c) => { c.fillStyle = '#1d2540'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#2b3660'; c.lineWidth = 2; c.strokeRect(0, 0, 64, 64); }, [CW, CH]);
    const back = new T.Mesh(new T.PlaneGeometry(CW, CH), new T.MeshStandardMaterial({ map: grid, roughness: 0.9 })); back.position.set(0, CH / 2, -0.5); back.receiveShadow = true; sc.add(back);
    const rail = V.M('#3a4a7a', { metalness: 0.6, roughness: 0.3 }), neon = V.M('#4fd6ff', { emissive: '#4fd6ff', emissiveIntensity: 1.4 });
    V.box(0.6, CH + 0.6, 1.4, rail, -CW / 2 - 0.3, CH / 2 - 0.3, 0); V.box(0.6, CH + 0.6, 1.4, rail, CW / 2 + 0.3, CH / 2 - 0.3, 0); V.box(CW + 1.2, 0.6, 1.4, rail, 0, -0.3, 0);
    V.box(0.08, CH + 0.6, 0.08, neon, -CW / 2 - 0.05, CH / 2 - 0.3, 0.72, sc, false); V.box(0.08, CH + 0.6, 0.08, neon, CW / 2 + 0.05, CH / 2 - 0.3, 0.72, sc, false);
    const floor = V.ground(80, 60, '#0f1424', -0.6); floor.material = V.M('#1a2036', { roughness: 0.3, metalness: 0.4 });
    V.box(4, 8, 1, '#232d4d', 8.2, 14.5, -0.6); const nx = V.sprite('NEXT', 3, 0.8, null, '#9fb3e6'); nx.position.set(8.2, 18, 0.2);
    for (let i = 0; i < 14; i++) { const p = V.box(1 + Math.random() * 2, 4 + Math.random() * 14, 1, ['#2b3660', '#22305a', '#30285a'][i % 3], -24 + i * 3.6 + (Math.abs(-24 + i * 3.6) < 9 ? 30 : 0), 0, -14, sc, false); p.position.y = p.geometry.parameters.height / 2 - 0.6; }
    const l = new T.PointLight('#4fd6ff', 40, 30); l.position.set(-6, 12, 6); sc.add(l); const l2 = new T.PointLight('#b36bff', 40, 30); l2.position.set(7, 6, 6); sc.add(l2);
    V.camera.position.set(1.2, 10.2, 25); V.camera.lookAt(1.2, 9.6, 0); V.follow = new T.Vector3(0, 8, 0); V.sun.position.set(6, 30, 20);
    D3.m = new T.Matrix4(); D3.c = new T.Color();
  });
  function draw3() {
    const T = V.T, m = D3.m, c = D3.c; let n = 0;
    const put = (im, i, x, y, z, col, s = 1) => { m.makeScale(s, s, s); m.setPosition(x, y, z); im.setMatrixAt(i, m); im.setColorAt(i, c.set(col)); };
    G.board.forEach((row, y) => row.forEach((col, x) => { if (col) put(D3.cells, n++, BXp(x), BYp(y), 0, col); }));
    let gn = 0;
    if (G.cur && !A.over) {
      let gy = G.cur.y; while (!hit(G.cur.m, G.cur.x, gy + 1)) gy++;
      const col = P[G.cur.k].c, drop = Math.min(1, G.fall / Math.max(0.06, 0.8 * Math.pow(0.82, G.level - 1)));
      const smoothY = hit(G.cur.m, G.cur.x, G.cur.y + 1) ? 0 : drop * 0.25;
      G.cur.m.forEach((row, r) => row.forEach((v, cc) => { if (!v) return; if (gy + r >= 0 && gy !== G.cur.y) put(D3.ghost, gn++, BXp(G.cur.x + cc), BYp(gy + r), 0, col); if (G.cur.y + r >= 0) put(D3.cells, n++, BXp(G.cur.x + cc), BYp(G.cur.y + r) - smoothY, 0, col); }));
    }
    D3.cells.count = n; D3.cells.instanceMatrix.needsUpdate = true; if (D3.cells.instanceColor) D3.cells.instanceColor.needsUpdate = true;
    D3.ghost.count = gn; D3.ghost.instanceMatrix.needsUpdate = true; if (D3.ghost.instanceColor) D3.ghost.instanceColor.needsUpdate = true;
    let k = 0; G.queue.slice(0, 3).forEach((key, i) => P[key].m.forEach((row, r) => row.forEach((v, cc) => { if (v && k < 12) put(D3.next, k++, 7.3 + cc * 0.62, 16.8 - i * 2.3 - r * 0.62, 0, P[key].c); })));
    D3.next.count = k; D3.next.instanceMatrix.needsUpdate = true; if (D3.next.instanceColor) D3.next.instanceColor.needsUpdate = true;
    for (const f of G.flash) if (f.t > 0.2) { for (let x = 0; x < CW; x += 2) V.puff(BXp(x), BYp(f.y), 0.6, '#ffffff', 0.8, 0.4, (Math.random() - 0.5) * 3, Math.random() * 3, 2, 1, 0.9); }
    V.frame();
  }

  function bag() { const k = Object.keys(P); for (let i = k.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [k[i], k[j]] = [k[j], k[i]]; } return k; }
  function start() {
    S = DB.load();
    G = { board: Array.from({ length: CH }, () => Array(CW).fill(null)), queue: [...bag(), ...bag()], cur: null, score: 0, lines: 0, level: 1, fall: 0, lock: 0, flash: [], t: 0, rep: {} };
    spawn(); A.play(); V.init(); A.run(step); hud();
  }
  A.onAgain = start;
  function spawn() {
    if (G.queue.length < 7) G.queue.push(...bag());
    const k = G.queue.shift(); G.cur = { k, m: P[k].m.map((r) => r.slice()), x: k === 'O' ? 4 : 3, y: k === 'I' ? -1 : 0 };
    if (hit(G.cur.m, G.cur.x, G.cur.y)) gameOver();
  }
  function hit(m, x, y) { for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) { const bx = x + c, by = y + r; if (bx < 0 || bx >= CW || by >= CH || (by >= 0 && G.board[by][bx])) return true; } return false; }
  const rot = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
  function move(dx) { if (!hit(G.cur.m, G.cur.x + dx, G.cur.y)) { G.cur.x += dx; G.lock = 0; } }
  function rotate() { LSPG.sfx('click', { volume: 0.6 }); const m = rot(G.cur.m); for (const k of [0, -1, 1, -2, 2]) if (!hit(m, G.cur.x + k, G.cur.y)) { G.cur.m = m; G.cur.x += k; G.lock = 0; return; } }
  function soft() { if (!hit(G.cur.m, G.cur.x, G.cur.y + 1)) { G.cur.y++; G.score += 1; return true; } return false; }
  function hard() { LSPG.sfx('drop'); let n = 0; while (!hit(G.cur.m, G.cur.x, G.cur.y + 1)) { G.cur.y++; n++; } G.score += n * 2; place(); }
  function place() { LSPG.sfx('place', { volume: 0.6 });
    const c = G.cur; let over = false;
    c.m.forEach((row, r) => row.forEach((v, cc) => { if (v) { if (c.y + r < 0) over = true; else G.board[c.y + r][c.x + cc] = P[c.k].c; } }));
    if (over) return gameOver();
    const full = []; G.board.forEach((row, i) => { if (row.every(Boolean)) full.push(i); });
    if (full.length) {
      G.flash = full.map((y) => ({ y, t: 0.25 }));
      full.forEach((y) => { G.board.splice(y, 1); G.board.unshift(Array(CW).fill(null)); });
      G.score += [0, 100, 300, 500, 800][full.length] * G.level; G.lines += full.length; if (full.length) LSPG.sfx('line'); G.level = 1 + Math.floor(G.lines / 10);
    }
    G.fall = 0; G.lock = 0; spawn(); hud();
  }
  function gameOver() {
    if (A.over) return; A.over = true;
    const got = Wallet.add(Math.floor(G.score / 50)), best = G.score > S.best; if (best) S.best = G.score; S.lines += G.lines; S.games++; save();
    setTimeout(() => A.end(best ? 'New high score!' : 'Game over', got, `Score ${G.score.toLocaleString()}, ${G.lines} lines, level ${G.level}. You get 1 point for every 50 score.`), 400);
  }
  function hud() { $('#bd-score').textContent = `Score ${G.score.toLocaleString()}`; $('#bd-level').textContent = `Level ${G.level}, ${G.lines} lines`; }
  A.onKey = (k) => {
    if (!G || A.over || A.paused) return;
    if (k === 'ArrowLeft' || k === 'KeyA') move(-1); else if (k === 'ArrowRight' || k === 'KeyD') move(1);
    else if (k === 'ArrowUp' || k === 'KeyW' || k === 'KeyX') rotate(); else if (k === 'ArrowDown' || k === 'KeyS') { soft(); hud(); } else if (k === 'Space') hard();
  };
  function touchRepeat(key, dt, fn, first = 0.18, every = 0.06) {
    const on = A.tin[key], r = G.rep; if (!on) { r[key] = null; return; }
    if (r[key] == null) { r[key] = first; fn(); return; } r[key] -= dt; if (r[key] <= 0) { r[key] = every; fn(); }
  }
  function step(dt) {
    if (dt > 0 && !A.over) {
      G.t += dt;
      touchRepeat('left', dt, () => move(-1)); touchRepeat('right', dt, () => move(1)); touchRepeat('down', dt, () => { soft(); hud(); }, 0.05, 0.04);
      if (A.tin.rot && !G.rotHeld) rotate(); G.rotHeld = A.tin.rot;
      if (A.tin.drop && !G.dropHeld) hard(); G.dropHeld = A.tin.drop;
      if (!A.over) {
        const speed = Math.max(0.06, 0.8 * Math.pow(0.82, G.level - 1));
        if (hit(G.cur.m, G.cur.x, G.cur.y + 1)) { G.lock += dt; if (G.lock > 0.45) place(); }
        else { G.fall += dt; if (G.fall >= speed) { G.fall = 0; G.cur.y++; } }
      }
      G.flash.forEach((f) => (f.t -= dt)); G.flash = G.flash.filter((f) => f.t > 0);
    }
    draw();
  }
  function cell(x, y, c, alpha) { g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = c; rr(g, x + 1, y + 1, SZ - 2, SZ - 2, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, x + 4, y + 4, SZ - 8, 6, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + SZ - 6, SZ - 4, 4); g.globalAlpha = 1; }
  function draw() {
    if (V.ready) return draw3();
    A.begin();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#d5dcea'; g.lineWidth = 4; rr(g, BX - 8, BY - 8, CW * SZ + 16, CH * SZ + 16, 14); g.fill(); g.stroke();
    g.strokeStyle = '#eef2f8'; g.lineWidth = 1; for (let x = 1; x < CW; x++) { g.beginPath(); g.moveTo(BX + x * SZ, BY); g.lineTo(BX + x * SZ, BY + CH * SZ); g.stroke(); } for (let y = 1; y < CH; y++) { g.beginPath(); g.moveTo(BX, BY + y * SZ); g.lineTo(BX + CW * SZ, BY + y * SZ); g.stroke(); }
    G.board.forEach((row, y) => row.forEach((c, x) => { if (c) cell(BX + x * SZ, BY + y * SZ, c); }));
    if (G.cur && !A.over) {
      let gy = G.cur.y; while (!hit(G.cur.m, G.cur.x, gy + 1)) gy++;
      const col = P[G.cur.k].c;
      G.cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && gy + r >= 0) cell(BX + (G.cur.x + c) * SZ, BY + (gy + r) * SZ, col, 0.22); }));
      G.cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && G.cur.y + r >= 0) cell(BX + (G.cur.x + c) * SZ, BY + (G.cur.y + r) * SZ, col); }));
    }
    for (const f of G.flash) { g.fillStyle = `rgba(255,255,255,${f.t * 3})`; g.fillRect(BX, BY + f.y * SZ, CW * SZ, SZ); }
    // side panel
    const px = BX + CW * SZ + 30;
    g.fillStyle = '#fff'; rr(g, px, BY, 150, 300, 14); g.fill();
    g.fillStyle = '#66708f'; g.font = '800 14px Nunito, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('NEXT', px + 16, BY + 26);
    G.queue.slice(0, 3).forEach((k, i) => { const m = P[k].m, s = 18; m.forEach((row, r) => row.forEach((v, c) => { if (v) { g.fillStyle = P[k].c; rr(g, px + 30 + c * s, BY + 44 + i * 84 + r * s, s - 2, s - 2, 4); g.fill(); } })); });
    g.fillStyle = '#fff'; rr(g, 20, BY, 140, 170, 14); g.fill();
    g.fillStyle = '#66708f'; g.font = '800 13px Nunito, system-ui, sans-serif';
    [['SCORE', G.score.toLocaleString()], ['LEVEL', G.level], ['BEST', Math.max(S.best, G.score).toLocaleString()]].forEach(([a, b], i) => { g.fillStyle = '#66708f'; g.fillText(a, 36, BY + 28 + i * 52); g.fillStyle = '#16203d'; g.font = '700 22px Fredoka, system-ui, sans-serif'; g.fillText(String(b), 36, BY + 52 + i * 52); g.font = '800 13px Nunito, system-ui, sans-serif'; });
  }
  A.onTab = () => {
    S = DB.load();
    A.panel('play').innerHTML = L.playCard('🟦', 'Stack and clear', 'Move and rotate falling blocks to fill whole rows. Full rows disappear and score points. It speeds up every 10 lines. You earn 1 LSP point for every 50 score.', [`🏆 High score ${S.best.toLocaleString()}`, `🧱 ${S.lines} lines cleared`, `🎮 ${S.games} games`], 'bd-go', 'Play');
    $('#bd-go').onclick = start;
  };
})();
