/* LSP Drive · the GTA-style layer.
 *
 *   ★ LSP Police with a 5-star wanted level
 *       crimes: hitting people, ramming police, crashing in front of a cop, speeding past a patrol, gunfire seen by police
 *       ★1+ patrols chase you · ★3+ roadblocks · ★4+ a helicopter with a searchlight
 *       break their line of sight and the stars flash: stay hidden until they give up
 *       stop near a cop while wanted and you get BUSTED (a fine), lose all your health and it's WASTED
 *   📻 Radio in every car: 4 music stations made live by the game (no song files) + LSP Talk
 *       N or the 📻 button changes station
 *   💥 Cars dent where they hit, windscreens crack, and it all comes back at the 🔧 garage
 *   🧍 People get knocked flying instead of just falling over
 *
 * Plugs in like drive-real2.js (wraps LSPDriveReal) and into drive-rp.js through LSPDriveRP.ext().
 */
(function () {
  'use strict';
  const L = window.LSPG, R1 = window.LSPDriveReal; if (!R1) return;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  let C = null, T = null, K = null, broken = false;
  const W = { stars: 0, seen: false, lastSeen: null, escT: 0, crimeCd: 0, cops: [], heli: null, blockT: 0, bustT: 0, busted: false, flash: 0, t: 0 };

  const baseInit = R1.init, baseFrame = R1.frame;
  R1.init = function (ctx) { baseInit(ctx); try { init(ctx); } catch (e) { console.error('gta layer', e); broken = true; } };
  R1.frame = function (dt) { baseFrame(dt); if (!C || broken) return; try { frame(dt); } catch (e) { console.error('gta layer', e); broken = true; } };

  const G = () => C.G, P = () => C.getP(), F = () => C.getF();
  const me = () => (G().mode === 'drive' ? P() : F());
  const solid = (x, z) => K && K.E && K.E.solidAt ? K.E.solidAt(x, z) : false;
  function los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 3); for (let i = 1; i < n; i++) { const t = i / n; if (solid(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
  const inCity = (x, z) => Math.abs(x) < 226 && Math.abs(z) < 226;

  /* ================= UI ================= */
  const css = `
  #gta-wanted{position:absolute;right:12px;top:calc(122px + env(safe-area-inset-top,0px));z-index:20;font:900 30px/1 system-ui,sans-serif;letter-spacing:2px;pointer-events:none;text-shadow:0 2px 0 #000,0 0 6px #000}
  #gta-wanted span{color:rgba(255,255,255,.18);-webkit-text-stroke:1.5px rgba(0,0,0,.7)}#gta-wanted span.on{color:#fff}
  #gta-wanted.search span.on{animation:gtaBlink .5s steps(2) infinite}#gta-wanted.hide{opacity:0}
  @keyframes gtaBlink{50%{color:rgba(255,255,255,.25)}}
  #gta-radio{position:absolute;left:50%;top:calc(118px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:20;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s;color:#fff;text-shadow:0 2px 0 #000,0 0 10px #000;white-space:nowrap}
  #gta-radio.show{opacity:1}#gta-radio b{display:block;font:italic 900 30px/1.1 system-ui,sans-serif;letter-spacing:1px}#gta-radio small{font:700 14px system-ui,sans-serif;opacity:.9}
  #gta-big{position:absolute;left:0;right:0;top:22%;z-index:71;text-align:center;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(0,0,0,.75) 25%,rgba(0,0,0,.75) 75%,transparent);padding:10px 0;animation:gtaIn 1s both}
  #gta-big b{font:900 clamp(56px,11vw,110px)/1 Impact,'Arial Narrow',system-ui,sans-serif;letter-spacing:4px;color:#d0182a;text-shadow:0 4px 0 #000}
  #gta-big.busted b{color:#f2f2f2}
  @keyframes gtaIn{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:none}}
  #drive-cv.gta-grey{filter:grayscale(1) brightness(.72) contrast(1.15);transition:filter 1.6s}
  #d-fail.gta{background:transparent;animation:none}#d-fail.gta h1{display:none}#d-fail.gta .fail-in{animation:gtaIn .6s 2.4s both;margin-top:30vh}
  #gta-bust{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:20;background:#16203dd9;color:#fff;font:800 18px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;display:none}
  `;
  function ui() {
    if (document.getElementById('gta-wanted')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const scr = document.getElementById('s-drive');
    scr.insertAdjacentHTML('beforeend', '<div id="gta-wanted" class="hide" aria-label="Wanted level"></div><div id="gta-radio"><b></b><small></small></div><div id="gta-bust"></div>');
    const hud = scr.querySelector('.hud'); if (hud) { hud.insertAdjacentHTML('beforeend', '<button class="hudpill" id="gta-rbtn" title="Radio (N)">📻</button>'); document.getElementById('gta-rbtn').onclick = () => Radio.next(); }
    addEventListener('keydown', (e) => { if (e.code === 'KeyN' && !e.repeat && C && G().on && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName)) Radio.next(); });
  }
  let lastStars = -1, lastSearch = null;
  function starsUi() {
    const el = document.getElementById('gta-wanted'); if (!el) return;
    const search = W.stars > 0 && !W.seen;
    if (lastStars !== W.stars) { el.innerHTML = [1, 2, 3, 4, 5].map((i) => `<span class="${i <= W.stars ? 'on' : ''}">★</span>`).join(''); lastStars = W.stars; }
    if (lastSearch !== search) { el.classList.toggle('search', search); lastSearch = search; }
    el.classList.toggle('hide', W.stars === 0);
  }

  /* ================= wanted level ================= */
  function crime(n, why, minStars) {
    if (W.busted || G().over || G().race) return;
    if (W.crimeCd > 0 && W.stars >= (minStars || 1)) return;
    W.crimeCd = 2.5;
    const before = W.stars;
    W.stars = clamp(Math.max(W.stars + n, minStars || 0), 0, 5);
    const m = me(); W.lastSeen = { x: m.x, z: m.z }; W.seen = true; W.escT = 0;
    if (W.stars > before) { if (K) K.say(`🚨 ${why} — ${'★'.repeat(W.stars)}`, 2600); C.sfx && C.sfx('siren', { volume: 0.4 }); }
    for (const c of W.cops) if (c.mode === 'patrol') c.mode = 'chase';
  }
  function clearWanted(msg) {
    if (W.stars && msg && K) K.say(msg, 3500);
    W.stars = 0; W.seen = false; W.escT = 0; W.bustT = 0;
    for (const c of W.cops) if (c.mode !== 'patrol') { c.mode = 'leave'; c.leaveT = 0; }
    if (W.heli) W.heli.leave = true;
  }

  /* ================= police cars ================= */
  let copTex = null;
  function copModel() {
    const b = C.TBODY.sedan, CB = C.carBody(b), g = new T.Group(); g.rotation.order = 'YXZ';
    getCopTex();
    const white = new T.MeshPhysicalMaterial({ color: '#f4f6fa', metalness: 0.4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
    const black = new T.MeshPhysicalMaterial({ color: '#111318', metalness: 0.5, roughness: 0.3, clearcoat: 1 });
    const add = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = true; g.add(o); return o; };
    add(CB.body, white); add(CB.glass, C.M('#1a2633', { metalness: 0.6, roughness: 0.05 })); add(CB.roof, black);
    const wg = new T.CylinderGeometry(b.wr, b.wr, b.ww, 14); wg.rotateZ(Math.PI / 2);
    const tire = C.M('#17181c', { roughness: 0.95 }), wheels = [];
    for (const sz of [1, -1]) for (const sx of [-1, 1]) { const w = new T.Mesh(wg, tire); w.position.set(sx * (b.W / 2 - b.ww / 2 + 0.03), b.wr, sz * (b.L / 2 - b.wr - 0.32)); g.add(w); wheels.push(w); }
    // side stripes with the name
    for (const sx of [-1, 1]) { const pl = new T.Mesh(new T.PlaneGeometry(2.2, 0.36), new T.MeshStandardMaterial({ map: copTex, roughness: 0.5 })); pl.position.set(sx * (b.W / 2 + 0.012), b.clr + b.H * 0.55, -0.1); pl.rotation.y = sx * Math.PI / 2; g.add(pl); }
    // light bar
    const top = CB.top;
    C.box(b.W * 0.72, 0.1, 0.32, C.M('#22252c'), 0, top + 0.05, b.cabZ, g, false);
    const red = new T.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff0000', emissiveIntensity: 0.2 }), blue = new T.MeshStandardMaterial({ color: '#2a6bff', emissive: '#0040ff', emissiveIntensity: 0.2 });
    C.box(b.W * 0.32, 0.12, 0.26, red, -b.W * 0.19, top + 0.13, b.cabZ, g, false); C.box(b.W * 0.32, 0.12, 0.26, blue, b.W * 0.19, top + 0.13, b.cabZ, g, false);
    const glow = (col) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(3.4, 3.4, 1); s.position.set(0, top + 0.2, b.cabZ); g.add(s); return s; };
    const sr = glow('#ff2020'), sb = glow('#2060ff'); sr.position.x = -b.W * 0.2; sb.position.x = b.W * 0.2;
    const hl = new T.MeshStandardMaterial({ color: '#fff', emissive: '#fff6dd', emissiveIntensity: 1.4 });
    for (const sx of [-1, 1]) C.box(0.36, 0.12, 0.05, hl, sx * b.W * 0.32, b.clr + b.H * 0.62, b.L / 2 + 0.01, g, false);
    C.scene.add(g);
    return { g, red, blue, sr, sb, wheels, L: b.L, W: b.W, wr: b.wr };
  }
  function getCopTex() {
    if (!copTex) copTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#16203d'; x.font = '900 40px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LSP POLICE', 128, 34); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
    return copTex;
  }
  let gt = null;
  function glowTex() { if (gt) return gt; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); gt = new T.CanvasTexture(c); return gt; }

  const NB = () => C.NB, node = (i, j) => [C.RX(i), C.RX(j)];
  const nearestNode = (x, z) => [clamp(Math.round((x - C.RX(0)) / C.CELL), 0, NB()), clamp(Math.round((z - C.RX(0)) / C.CELL), 0, NB())];
  function spawnCop(mode, nearSeen) {
    const m = me(), ref = nearSeen && W.lastSeen ? W.lastSeen : m;
    let best = null;
    for (let k = 0; k < 50; k++) {
      const i = Math.floor(rnd(0, NB() + 1)), j = Math.floor(rnd(0, NB() + 1)), [x, z] = node(i, j), d = Math.hypot(x - ref.x, z - ref.z);
      if (d > (mode === 'patrol' ? 60 : 85) && d < 200 && !los(x, z, m.x, m.z)) { best = [i, j]; break; }
      if (!best && d > 70) best = [i, j];
    }
    if (!best) return null;
    const [x, z] = node(best[0], best[1]), c = { m: copModel(), x, z, h: rnd(0, 6), v: 0, mode, ni: best[0], nj: best[1], prev: null, stuck: 0, sees: false, hp: 100 };
    c.m.g.position.set(x, 0, z); W.cops.push(c); return c;
  }
  function removeCop(c) { C.scene.remove(c.m.g); W.cops.splice(W.cops.indexOf(c), 1); }
  function pickNext(c, tx, tz) {
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [c.ni + a, c.nj + b]).filter(([i, j]) => i >= 0 && j >= 0 && i <= NB() && j <= NB());
    let pool = opts.filter(([i, j]) => !c.prev || i !== c.prev[0] || j !== c.prev[1]); if (!pool.length) pool = opts;
    let n;
    if (tx == null) n = pool[Math.floor(Math.random() * pool.length)];
    else n = pool.reduce((a, b) => { const da = Math.hypot(C.RX(a[0]) - tx, C.RX(a[1]) - tz), db = Math.hypot(C.RX(b[0]) - tx, C.RX(b[1]) - tz); return db < da ? b : a; });
    c.prev = [c.ni, c.nj]; c.ni = n[0]; c.nj = n[1];
  }
  function stepCop(c, dt) {
    const m = me(), dx = m.x - c.x, dz = m.z - c.z, dist = Math.hypot(dx, dz), chasing = c.mode === 'chase';
    c.sees = W.stars > 0 && dist < (chasing ? 90 : 60) && !G().hidden && los(c.x, c.z, m.x, m.z);
    if (c.mode === 'block') { c.v = 0; c.blockT -= dt; if (c.blockT <= 0 || dist > 260) c.mode = W.stars ? 'chase' : 'leave'; return; }
    let tx, tz, vmax = 13, direct = false;
    if (chasing) {
      vmax = 28 + W.stars * 3;
      const mv = G().mode === 'drive' ? P() : { vx: 0, vz: 0 };
      if (c.sees && dist < 55) { direct = true; tx = m.x + mv.vx * 0.5; tz = m.z + mv.vz * 0.5; if (G().mode === 'foot' || Math.hypot(mv.vx, mv.vz) < 3) vmax = dist < 6 ? 0 : Math.min(vmax, (dist - 5) * 1.6 + 1); }
      else if (W.lastSeen && !W.seen) { tx = W.lastSeen.x + Math.sin(W.t * 0.3 + c.x) * 40; tz = W.lastSeen.z + Math.cos(W.t * 0.3 + c.z) * 40; }
      else { tx = m.x; tz = m.z; }
    }
    if (c.mode === 'leave') { c.leaveT = (c.leaveT || 0) + dt; if ((c.leaveT > 6 && dist > 90 && !los(c.x, c.z, m.x, m.z)) || c.leaveT > 40) { removeCop(c); return; } }
    if (!direct) {
      const [nx, nz] = node(c.ni, c.nj);
      if (Math.hypot(nx - c.x, nz - c.z) < 5) { pickNext(c, chasing ? tx : null, chasing ? tz : null); }
      const [ax, az] = node(c.ni, c.nj), dirx = Math.sign(Math.round(ax - c.x)), dirz = Math.sign(Math.round(az - c.z));
      // keep to the right-hand lane while not chasing
      const lane = chasing ? 0 : C.LANE * 0.6;
      tx = ax + (Math.abs(ax - c.x) > Math.abs(az - c.z) ? 0 : dirz * lane); tz = az + (Math.abs(ax - c.x) > Math.abs(az - c.z) ? -dirx * lane : 0); // same side as traffic
      if (c.mode === 'patrol' || c.mode === 'leave') vmax = 13;
    }
    const want = Math.atan2(tx - c.x, tz - c.z), dh = wrapA(want - c.h), turn = 2.4 * Math.min(1, 0.4 + c.v / 12);
    c.h = wrapA(c.h + clamp(dh, -turn * dt, turn * dt));
    const target = vmax * (1 - Math.min(0.7, Math.abs(dh) / 1.6));
    c.v += clamp(target - c.v, -22 * dt, 13 * dt);
    const nx = c.x + Math.sin(c.h) * c.v * dt, nz = c.z + Math.cos(c.h) * c.v * dt;
    if (solid(nx, nz) || solid(nx + Math.sin(c.h) * 2, nz + Math.cos(c.h) * 2)) {
      c.v *= 0.3; c.stuck += dt;
      if (direct) { const [i, j] = nearestNode(c.x, c.z); c.ni = i; c.nj = j; }
      if (c.stuck > 2.5) { const [i, j] = nearestNode(c.x, c.z); [c.x, c.z] = node(i, j); c.ni = i; c.nj = j; c.stuck = 0; }
    } else { c.x = nx; c.z = nz; c.stuck = Math.max(0, c.stuck - dt); }
  }
  function poseCop(c, dt) {
    const g = c.m.g; g.position.set(c.x, 0, c.z); g.rotation.y = c.h;
    for (const w of c.m.wheels) w.rotation.x += c.v * dt / c.m.wr;
    const on = c.mode === 'chase' || c.mode === 'block', ph = (W.t * 2.4) % 1, a = on && ph < 0.5, b = on && ph >= 0.5;
    c.m.red.emissiveIntensity = a ? 4 : 0.2; c.m.blue.emissiveIntensity = b ? 4 : 0.2; c.m.sr.visible = a; c.m.sb.visible = b;
  }

  /* bumping into police cars (and them ramming you) */
  function collidePlayer(c, dt) {
    const m = me(), dx = m.x - c.x, dz = m.z - c.z, d = Math.hypot(dx, dz), drive = G().mode === 'drive', r = drive ? 2.5 : 1.6;
    if (d > r || d < 0.01) return;
    const nx = dx / d, nz = dz / d, push = r - d;
    m.x += nx * push; m.z += nz * push;
    if (drive) {
      const p = P(), rel = (p.vx - Math.sin(c.h) * c.v) * -nx + (p.vz - Math.cos(c.h) * c.v) * -nz;
      if (rel > 1.5) { p.vx += nx * rel * 0.8; p.vz += nz * rel * 0.8; }
      const hit = Math.abs(rel);
      if (hit > 5) {
        c.v *= 0.4; if (p.hp != null) p.hp -= hit * 0.35; C.sfx && C.sfx('hit', { volume: 0.5 });
        const playerFault = Math.hypot(p.vx, p.vz) > c.v;
        if (playerFault && hit > 7) crime(1, 'You rammed a police car', 2);
        else if (W.stars && c.mode === 'chase') { p.vx += nx * 3; p.vz += nz * 3; }
      }
    } else if (c.v > 6) { c.v = 0; }
  }

  /* ================= helicopter ================= */
  function makeHeli() {
    const g = new T.Group(), body = new T.MeshStandardMaterial({ color: '#1b2a4a', metalness: 0.4, roughness: 0.4 }), dark = C.M('#16181c');
    const cab = new T.Mesh(new T.SphereGeometry(1.6, 16, 12), body); cab.scale.set(1, 0.9, 1.7); g.add(cab);
    const win = new T.Mesh(new T.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), C.M('#9fc8e8', { metalness: 0.6, roughness: 0.05 })); win.position.set(0, 0.25, 0.9); win.rotation.x = 1.1; g.add(win);
    const boom = new T.Mesh(new T.CylinderGeometry(0.22, 0.4, 5.5, 8), body); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.3, -4.2); g.add(boom);
    const fin = new T.Mesh(new T.BoxGeometry(0.15, 1.4, 0.9), body); fin.position.set(0, 0.9, -6.8); g.add(fin);
    for (const sx of [-1, 1]) { const sk = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 3.6), dark); sk.position.set(sx * 1.1, -1.55, 0.2); g.add(sk); }
    const rot = new T.Group(); rot.position.y = 1.7; g.add(rot);
    const bladeM = new T.MeshStandardMaterial({ color: '#222', transparent: true, opacity: 0.55 });
    for (let k = 0; k < 4; k++) { const bl = new T.Mesh(new T.BoxGeometry(0.3, 0.05, 11), bladeM); bl.rotation.y = k * Math.PI / 4 * 2 / 2 + k * Math.PI / 4; rot.add(bl); }
    const tr = new T.Group(); tr.position.set(0.25, 0.9, -6.8); g.add(tr); const tb = new T.Mesh(new T.BoxGeometry(0.05, 1.8, 0.18), bladeM); tr.add(tb);
    const label = new T.Mesh(new T.PlaneGeometry(2.4, 0.5), new T.MeshStandardMaterial({ map: getCopTex(), transparent: true })); label.position.set(1.62, 0, 0); label.rotation.y = Math.PI / 2; g.add(label);
    const spot = new T.SpotLight('#f4f8ff', 0, 120, 0.2, 0.55, 2); spot.position.set(0, -1.2, 1.2); g.add(spot); g.add(spot.target);
    const coneG = new T.ConeGeometry(5, 1, 24, 1, true); coneG.translate(0, -0.5, 0);
    const cone = new T.Mesh(coneG, new T.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); C.scene.add(cone);
    const blink = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: '#ff3030', transparent: true, blending: T.AdditiveBlending, depthWrite: false })); blink.scale.set(4, 4, 1); blink.position.set(0, -1.6, 0); g.add(blink);
    C.scene.add(g);
    const m = me(); return { g, rot, tr, spot, cone, blink, x: m.x + 150, z: m.z + 150, y: 70, a: 0, leave: false };
  }
  function stepHeli(H, dt, day) {
    const m = me();
    H.a += dt * 0.25;
    const tx = H.leave ? H.x + 60 : m.x + Math.cos(H.a) * 22, tz = H.leave ? H.z + 60 : m.z + Math.sin(H.a) * 22, ty = H.leave ? 120 : 34;
    const k = Math.min(1, dt * 0.6); const ox = H.x, oz = H.z;
    H.x += (tx - H.x) * k; H.z += (tz - H.z) * k; H.y += (ty - H.y) * k;
    const vx = (H.x - ox) / Math.max(dt, 1e-3), vz = (H.z - oz) / Math.max(dt, 1e-3);
    H.g.position.set(H.x, H.y, H.z); H.g.rotation.set(clamp(Math.hypot(vx, vz) * 0.012, 0, 0.25), Math.atan2(m.x - H.x, m.z - H.z), 0, 'YXZ');
    H.rot.rotation.y += dt * 28; H.tr.rotation.x += dt * 40; H.blink.visible = (W.t % 1) < 0.15;
    const night = clamp((0.55 - day) * 2.5, 0, 1);
    H.spot.target.position.set(0, -H.y, 0); H.spot.target.updateMatrixWorld();
    H.g.updateMatrixWorld(); const sp = H.spot.getWorldPosition(new T.Vector3()); H.spot.target.position.copy(H.g.worldToLocal(new T.Vector3(m.x, 0, m.z)));
    H.spot.intensity = H.leave ? 0 : 1300 * night;
    H.cone.position.copy(sp); H.cone.scale.set(1, sp.distanceTo(new T.Vector3(m.x, 0, m.z)), 1); H.cone.lookAt(m.x, 0, m.z); H.cone.rotateX(-Math.PI / 2);
    H.cone.material.opacity = H.leave ? 0 : 0.025 * night;
    H.sees = !H.leave && !G().hidden && Math.hypot(m.x - H.x, m.z - H.z) < 75 && !(G().mode === 'foot' && window.LSPDriveRP && LSPDriveRP.inside && LSPDriveRP.inside());
    if (H.leave && H.y > 110) { C.scene.remove(H.g); C.scene.remove(H.cone); W.heli = null; }
  }

  function roadblock() {
    const m = me(), p = G().mode === 'drive' ? P() : null; if (!p) return;
    const sp = Math.hypot(p.vx, p.vz); if (sp < 8) return;
    const ax = Math.abs(p.vx) > Math.abs(p.vz), [i0, j0] = nearestNode(m.x, m.z);
    const i = ax ? i0 + Math.sign(p.vx) * 2 : i0, j = ax ? j0 : j0 + Math.sign(p.vz) * 2;
    if (i < 0 || j < 0 || i > NB() || j > NB()) return;
    const [x, z] = node(i, j); if (Math.hypot(x - m.x, z - m.z) < 70) return;
    for (const s of [-1, 1]) {
      const c = spawnCop('block'); if (!c) return;
      c.x = x + (ax ? 0 : s * 2.6); c.z = z + (ax ? s * 2.6 : 0); c.h = ax ? 0 : Math.PI / 2; c.ni = i; c.nj = j; c.blockT = 30; c.v = 0;
    }
  }

  /* ================= dents and cracked glass ================= */
  const DENT = { car: null, orig: null, geo: null, box: null, glass: null, glassOrig: null, total: 0 };
  let crackM = null;
  function crackMat() {
    if (crackM) return crackM;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = 'rgba(26,38,51,1)'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(235,245,255,.85)'; x.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) { const cx = rnd(60, 196), cy = rnd(60, 196); for (let i = 0; i < 14; i++) { let px = cx, py = cy, a = rnd(0, 6.28); x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 6; s++) { a += rnd(-0.4, 0.4); px += Math.cos(a) * rnd(10, 26); py += Math.sin(a) * rnd(10, 26); x.lineTo(px, py); } x.stroke(); } for (let r = 8; r < 40; r += 10) { x.beginPath(); x.arc(cx, cy, r + rnd(-2, 2), 0, 6.28); x.stroke(); } }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.6, 0.6);
    return (crackM = new T.MeshStandardMaterial({ map: t, metalness: 0.5, roughness: 0.15 }));
  }
  function dentReset() {
    if (DENT.geo && DENT.orig) { DENT.geo.attributes.position.array.set(DENT.orig); DENT.geo.attributes.position.needsUpdate = true; DENT.geo.computeVertexNormals(); }
    if (DENT.glass && DENT.glassOrig) DENT.glass.material = DENT.glassOrig;
    DENT.total = 0;
  }
  function dent(p, wx, wz, force) {
    const g = p.m && p.m.g; if (!g || p.m.bike) return;
    const body = g.children[0]; if (!body || !body.geometry) return;
    if (DENT.car !== p.m) {
      DENT.car = p.m; body.geometry = body.geometry.clone(); DENT.geo = body.geometry;
      DENT.orig = Float32Array.from(DENT.geo.attributes.position.array); DENT.geo.computeBoundingBox(); DENT.box = DENT.geo.boundingBox.clone();
      DENT.glass = g.children[1]; DENT.glassOrig = DENT.glass && DENT.glass.material; DENT.total = 0;
    }
    const c = Math.cos(p.h), s = Math.sin(p.h); let lx = wx * c - wz * s, lz = wx * s + wz * c; const n = Math.hypot(lx, lz) || 1; lx /= n; lz /= n;
    const bx = DENT.box, hw = (bx.max.x - bx.min.x) / 2, hl = (bx.max.z - bx.min.z) / 2, cxm = (bx.max.x + bx.min.x) / 2, czm = (bx.max.z + bx.min.z) / 2;
    const t = Math.min(hw / Math.max(1e-3, Math.abs(lx)), hl / Math.max(1e-3, Math.abs(lz)));
    const px = cxm + lx * t, pz = czm + lz * t, py = bx.min.y + (bx.max.y - bx.min.y) * 0.45, Rr = 0.8 + force * 1.2, k = clamp(force, 0.05, 0.42);
    const a = DENT.geo.attributes.position.array, o = DENT.orig;
    for (let i = 0; i < a.length; i += 3) {
      const dx = a[i] - px, dy = a[i + 1] - py, dz = a[i + 2] - pz, d = Math.sqrt(dx * dx + dy * dy * 0.6 + dz * dz); if (d > Rr) continue;
      const f = (1 - d / Rr) ** 2 * k;
      let nx = a[i] - lx * f, nz = a[i + 2] - lz * f, ny = a[i + 1] - f * 0.25 * Math.sin(i);
      const ddx = nx - o[i], ddy = ny - o[i + 1], ddz = nz - o[i + 2], dd = Math.hypot(ddx, ddy, ddz);
      if (dd > 0.45) { nx = o[i] + ddx / dd * 0.45; ny = o[i + 1] + ddy / dd * 0.45; nz = o[i + 2] + ddz / dd * 0.45; }
      a[i] = nx; a[i + 1] = ny; a[i + 2] = nz;
    }
    DENT.geo.attributes.position.needsUpdate = true; DENT.geo.computeVertexNormals();
    DENT.total += force;
    if ((DENT.total > 0.6 || force > 0.32) && DENT.glass && DENT.glass.material !== crackMat()) { DENT.glass.material = crackMat(); C.sfx && C.sfx('hit', { volume: 0.6 }); }
  }

  /* ================= people knocked flying ================= */
  const flying = new Map();
  function tickPeds(dt) {
    const peds = (R1.R && R1.R.peds) || [], p = P(), drive = G().mode === 'drive';
    for (const ped of peds) {
      const wasDown = ped._gd || 0; ped._gd = ped.down;
      if (ped.down > 0 && wasDown <= 0 && drive) {
        const sp = Math.hypot(p.vx, p.vz);
        ped.down = 3.6;
        flying.set(ped, { vx: p.vx * 0.55 + rnd(-1.5, 1.5), vz: p.vz * 0.55 + rnd(-1.5, 1.5), vy: 3 + sp * 0.18, y: 0, ox: 0, oz: 0, spin: rnd(-8, 8) });
        crime(1, 'You hit someone');
      }
      const f = flying.get(ped);
      if (f) {
        if (ped.down <= 0) { flying.delete(ped); ped.m.rotation.z = 0; continue; }
        if (f.y > 0 || f.vy > 0) {
          f.vy -= 22 * dt; f.y = Math.max(0, f.y + f.vy * dt); const nox = f.ox + f.vx * dt, noz = f.oz + f.vz * dt;
          if (!solid(ped.m.position.x - f.ox + nox, ped.m.position.z - f.oz + noz)) { f.ox = nox; f.oz = noz; } else { f.vx *= -0.3; f.vz *= -0.3; }
          if (f.y === 0) { f.vy = Math.abs(f.vy) > 4 ? -f.vy * 0.3 : 0; f.vx *= 0.5; f.vz *= 0.5; f.spin *= 0.4; }
          f.rz = (f.rz || 0) + f.spin * dt;
        }
        ped.m.position.x += f.ox - (f.applied ? f.applied[0] : 0); ped.m.position.z += f.oz - (f.applied ? f.applied[1] : 0); f.applied = [f.ox, f.oz];
        ped.m.position.y = 0.4 + f.y; ped.m.rotation.z = f.rz || 0;
      }
    }
  }

  /* ================= the radio ================= */
  const Radio = (() => {
    const STATIONS = [
      { name: 'LSP FM', tag: 'The hits that move the city', style: 'pop', bpm: [118, 126], dj: 'L S P F M. The hits that move the city.' },
      { name: 'Chill Lounge 88', tag: 'Roll the windows down', style: 'lofi', bpm: [76, 86], dj: 'Chill Lounge eighty eight. Slow down and enjoy the ride.' },
      { name: 'Rock City 101', tag: 'Turn it up', style: 'rock', bpm: [134, 150], dj: 'Rock City one oh one! Turn it up!' },
      { name: 'Night Drive FM', tag: 'Neon all night long', style: 'synth', bpm: [96, 108], dj: 'Night Drive F M. Neon all night long.' },
      { name: 'LSP Talk', tag: 'News · traffic · weather', style: 'talk', bpm: [70, 70] },
    ];
    const A1 = ['Neon', 'Golden', 'Midnight', 'Electric', 'Summer', 'City', 'Silver', 'Velvet', 'Paper', 'Ocean', 'Highway', 'Crystal', 'Sunset', 'Thunder', 'Happy'];
    const A2 = ['Lights', 'Dreams', 'Hearts', 'Roads', 'Skies', 'Waves', 'Days', 'Nights', 'Rockets', 'Streets', 'Stars', 'Echoes', 'Signals', 'Drive', 'Parade'];
    const ART = ['The Lanterns', 'Nova Kid', 'DJ Mango', 'Static Bloom', 'The Overpass', 'Luna Park', 'Kilo Beats', 'The Hatchbacks', 'Mira & the Moons', 'Turbo Tiger', 'Blue Harbor', 'Pixel Hearts'];
    const st = { on: false, idx: (() => { try { return +(localStorage.getItem('lspdrive.radio') ?? 0); } catch (e) { return 0; } })(), a: null, bus: null, rev: null, timer: null, next: 0, step: 0, song: null, bar: 0, talkT: 0, gain: 0 };
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function audio() {
      if (st.a) return st.a; const A = L.audio && L.audio(); if (!A) return null; st.a = A;
      const c = A.ctx; st.bus = c.createGain(); st.bus.gain.value = 0;
      const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 9000; st.tone = tone;
      st.bus.connect(tone).connect(A.master);
      const rv = c.createConvolver(), len = c.sampleRate * 1.8, buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      rv.buffer = buf; const rg = c.createGain(); rg.gain.value = 0.25; rv.connect(rg).connect(st.bus); st.rev = rv;
      const ws = c.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); } ws.curve = curve; const wg = c.createGain(); wg.gain.value = 0.25; ws.connect(wg).connect(st.bus); st.dist = ws;
      return A;
    }
    function newSong() {
      const S = STATIONS[st.idx], minor = S.style === 'synth' || S.style === 'rock' ? Math.random() < 0.7 : Math.random() < 0.35;
      const progs = minor ? [[0, 5, 3, 4], [0, 3, 5, 4], [0, 5, 2, 4], [0, 6, 5, 4]] : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4]];
      const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
      const mel = []; for (let i = 0; i < 16; i++) mel.push(Math.random() < (S.style === 'lofi' ? 0.3 : 0.5) ? Math.floor(rnd(0, 7)) + (Math.random() < 0.3 ? 7 : 0) : null);
      st.song = { root: 40 + Math.floor(rnd(0, 8)), scale, prog: pick(progs), bpm: Math.round(rnd(S.bpm[0], S.bpm[1])), mel, title: `${pick(A1)} ${pick(A2)}`, artist: pick(ART), bars: 32 };
      st.bar = 0; st.step = 0;
      if (S.style !== 'talk') banner(S.name, `♪ ${st.song.title} · ${st.song.artist}`);
    }
    function chord(deg) { const s = st.song, sc = s.scale, n = (k) => { const d = deg + k; return s.root + sc[d % 7] + 12 * Math.floor(d / 7); }; return [n(0), n(2), n(4), n(6)]; }
    // ---- instruments
    function env(g, t, a, p, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function osc(type, f, t, dur, vol, cut, dest, a = 0.005) { const c = st.a.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; let n = o; if (cut) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.25), t + dur); o.connect(fl); n = fl; } n.connect(g); g.connect(dest || st.bus); env(g, t, a, vol, dur); o.start(t); o.stop(t + a + dur + 0.05); return g; }
    function noise(t, dur, vol, hp, dest) { const c = st.a.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = st.a.noise; f.type = 'highpass'; f.frequency.value = hp; s.connect(f).connect(g).connect(dest || st.bus); env(g, t, 0.002, vol, dur); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); }
    function kick(t, v = 0.9) { const c = st.a.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); o.connect(g).connect(st.bus); env(g, t, 0.002, v, 0.32); o.start(t); o.stop(t + 0.4); }
    function snare(t, v = 0.45) { noise(t, 0.16, v, 1400); noise(t, 0.2, v * 0.4, 1400, st.rev); osc('triangle', 190, t, 0.08, v * 0.5); }
    function hat(t, v = 0.12, open) { noise(t, open ? 0.18 : 0.04, v, 7000); }
    // ---- one 16th-note step of music
    function play(t) {
      const S = STATIONS[st.idx], s = st.song, step = st.step % 16, bar = st.bar, deg = s.prog[Math.floor(bar / 2) % 4], ch = chord(deg), sec = 60 / s.bpm / 4;
      const P = { pop: ['x...x...x...x...', '....x.......x...', '..x...x...x...x.'], lofi: ['x......x..x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.'], rock: ['x.....x.x.....x.', '....x.......x...', 'x.x.x.x.x.x.x.x.'], synth: ['x...x...x...x...', '....x.......x...', 'xxxxxxxxxxxxxxxx'] }[S.style];
      const intro = bar < 2, outro = bar >= s.bars - 1;
      if (!intro && P[0][step] === 'x') kick(t, S.style === 'lofi' ? 0.6 : 0.9);
      if (!intro && P[1][step] === 'x') snare(t, S.style === 'lofi' ? 0.25 : S.style === 'rock' ? 0.55 : 0.4);
      if (P[2][step] === 'x') hat(t, S.style === 'synth' ? 0.05 : S.style === 'lofi' ? 0.06 : 0.1, S.style === 'pop' && step % 4 === 2);
      if (S.style === 'rock' && step === 0 && bar % 4 === 0) noise(t, 1.2, 0.18, 5000, st.rev);
      // bass
      const b = ch[0] - 12;
      if (S.style === 'pop' && step % 2 === 0) osc('sawtooth', mtof(b + (step % 4 === 2 ? 12 : 0)), t, sec * 1.6, 0.28, 900);
      if (S.style === 'lofi' && (step === 0 || step === 7 || step === 10)) osc('sine', mtof(b + (step === 10 ? 7 : 0)), t, sec * 3, 0.4);
      if (S.style === 'rock' && step % 2 === 0) osc('sawtooth', mtof(b), t, sec * 1.8, 0.3, 700);
      if (S.style === 'synth') osc('sawtooth', mtof(b), t, sec * 0.9, 0.22, 600 + (step % 4) * 300);
      // chords
      if (S.style === 'pop' && (step === 0 || step === 6 || step === 10)) ch.slice(0, 3).forEach((n) => osc('square', mtof(n + 12), t, sec * 2, 0.045, 2400));
      if (S.style === 'lofi' && (step === 0 || step === 6)) ch.forEach((n, i) => { osc('sine', mtof(n + 12), t + i * 0.012, sec * 7, 0.07, 0, null, 0.01); osc('triangle', mtof(n + 24), t + i * 0.012, sec * 3, 0.015); });
      if (S.style === 'rock' && step % 2 === 0) [0, 7, 12].forEach((k) => osc('sawtooth', mtof(ch[0] + k), t, sec * 1.7, 0.09, 0, st.dist));
      if (S.style === 'synth' && step === 0) ch.forEach((n) => { const g = osc('sawtooth', mtof(n + 12), t, sec * 15, 0.04, 1800, null, 0.4); void g; });
      // melody / arps
      if (!intro && !outro && bar % 8 >= 4 || S.style === 'synth') {
        const m = s.mel[step], sc = s.scale;
        if (S.style === 'synth') osc('square', mtof(ch[step % 3] + 24), t, sec * 0.8, 0.035, 3000);
        else if (m != null) { const note = s.root + 24 + sc[m % 7] + 12 * Math.floor(m / 7); osc(S.style === 'lofi' ? 'triangle' : S.style === 'rock' ? 'sawtooth' : 'square', mtof(note), t, sec * (S.style === 'lofi' ? 3 : 1.6), S.style === 'rock' ? 0.05 : 0.06, S.style === 'rock' ? 0 : 3200, S.style === 'rock' ? st.dist : null); }
      }
      if (S.style === 'lofi' && Math.random() < 0.08) noise(t, 0.01, 0.05, 2000); // vinyl crackle
    }
    function tick() {
      if (!st.on || !st.a || !st.song) return;
      const c = st.a.ctx, S = STATIONS[st.idx];
      if (S.style === 'talk') return;
      while (st.next < c.currentTime + 0.15) {
        play(st.next);
        const sec = 60 / st.song.bpm / 4, swing = STATIONS[st.idx].style === 'lofi' && st.step % 2 === 0 ? sec * 0.18 : STATIONS[st.idx].style === 'lofi' ? -sec * 0.18 : 0;
        st.next += sec + swing; st.step++;
        if (st.step % 16 === 0) { st.bar++; if (st.bar >= st.song.bars) { if (Math.random() < 0.5) say(S.dj, 1.05); newSong(); st.next += 0.8; } }
      }
    }
    // ---- talk radio (spoken by the browser's voice)
    const NEWS = [
      () => `Good ${hourWord()} L S P City, this is L S P Talk. ${weatherLine()}`,
      () => 'Traffic now. The roads around the Business Tower are busy, so give yourself a few extra minutes.',
      () => 'Police say they are watching the streets more closely tonight. Drive safe, and keep to the speed limit.',
      () => 'Hungry? L S P Eats delivers to your door. Burgers, noodles, pizza, and the famous L S P sweets.',
      () => 'Flying somewhere? L S P Airways has one hundred gates, a café and a lounge. Book on your phone.',
      () => 'Business news. More people than ever are registering free businesses at the Business Tower.',
      () => 'Sports. The L S P City races start at the checkered flags. Beat the field and take home the prize.',
      () => 'This hour is brought to you by the L S P Store. One hundred laptops, phones and more, all in one place.',
      () => 'A reminder from the city: crossing on the zebra stripes is the safest way to cross. Look both ways!',
      () => 'Builders are using L S P Studio to make their own games. Some of them are earning thousands of points.',
      () => 'Fun fact: the Royal Palace on the hill costs seven million dollars and comes with its own private chef.',
      () => W.stars ? `Breaking news: police are chasing a driver through the city. The wanted level is ${W.stars} star${W.stars > 1 ? 's' : ''}.` : 'The police report a quiet day in L S P City. Nice work, everyone.',
    ];
    const hourWord = () => { const h = K && K.hour ? K.hour() : 12; return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
    const weatherLine = () => { const r = R1.R || {}; return r.rain > 0.6 ? 'Weather: heavy rain and storms. Turn your lights on and take it slow.' : r.rain > 0.2 ? 'Weather: light rain, so the roads are slippery.' : 'Weather: clear skies all over the city.'; };
    let talkI = 0;
    function say(text, rate) {
      try { if (!window.speechSynthesis || L.muted()) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = rate || 1; u.pitch = 1; u.volume = 0.9; speechSynthesis.speak(u); } catch (e) {}
    }
    function talkTick(dt) {
      st.talkT -= dt; if (st.talkT > 0) return;
      const busy = window.speechSynthesis && speechSynthesis.speaking; if (busy) { st.talkT = 1; return; }
      const line = NEWS[talkI++ % NEWS.length](); say(line, 1); banner('LSP Talk', line.length > 60 ? line.slice(0, 58) + '…' : line); st.talkT = 2.5;
    }
    let banT = 0;
    function banner(name, sub) { const el = document.getElementById('gta-radio'); if (!el) return; el.querySelector('b').textContent = name; el.querySelector('small').textContent = sub || ''; el.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => el.classList.remove('show'), 3500); }
    function start() {
      const A = audio(); if (!A) return;
      if (st.idx < 0) return;
      st.on = true; const c = A.ctx; st.bus.gain.cancelScheduledValues(c.currentTime); st.bus.gain.setTargetAtTime(0.5, c.currentTime, 0.3);
      // the crackle of tuning in
      noise(c.currentTime, 0.35, 0.12, 900);
      newSong(); st.next = c.currentTime + 0.4;
      const S = STATIONS[st.idx]; if (S.style === 'talk') { st.talkT = 0.5; banner(S.name, S.tag); } else if (Math.random() < 0.6) say(S.dj, 1.05);
      if (!st.timer) st.timer = setInterval(tick, 30);
    }
    function stop() { st.on = false; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} if (st.a) st.bus.gain.setTargetAtTime(0, st.a.ctx.currentTime, 0.15); }
    return {
      STATIONS, st,
      next() {
        if (!C || G().mode !== 'drive') { K && K.say('📻 Get in a car to use the radio.', 2000); return; }
        st.idx = st.idx + 1 >= STATIONS.length ? -1 : st.idx + 1; try { localStorage.setItem('lspdrive.radio', st.idx); } catch (e) {}
        stop(); if (st.idx < 0) { banner('Radio off', 'Press N or 📻 to turn it on'); return; } start();
      },
      update(dt, inCar) {
        if (inCar && !st.on && st.idx >= 0 && !G().paused && !G().over) start();
        if ((!inCar || G().paused || G().over) && st.on) stop();
        if (st.on && STATIONS[st.idx].style === 'talk') talkTick(dt);
      },
      stop,
    };
  })();

  /* ================= sirens and rotor sound ================= */
  const SND = { on: false };
  function sounds(dist, heliD) {
    const A = L.audio && L.audio(); if (!A) return;
    const c = A.ctx;
    if (!SND.on) {
      SND.on = true;
      SND.o = c.createOscillator(); SND.o.type = 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; SND.g = c.createGain(); SND.g.gain.value = 0;
      SND.o.connect(f).connect(SND.g).connect(A.master); SND.o.start();
      const n = c.createBufferSource(); n.buffer = A.noise; n.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; SND.hg = c.createGain(); SND.hg.gain.value = 0; const am = c.createGain(); am.gain.value = 0;
      const lfo = c.createOscillator(); lfo.frequency.value = 11; const lg = c.createGain(); lg.gain.value = 1; lfo.connect(lg).connect(am.gain); lfo.start();
      n.connect(lp).connect(am).connect(SND.hg).connect(A.master); n.start();
    }
    const t = c.currentTime, wail = (Math.sin(W.t * Math.PI * 0.5) + 1) / 2;
    SND.o.frequency.setTargetAtTime(650 + wail * 650, t, 0.05);
    SND.g.gain.setTargetAtTime(dist < 160 ? 0.07 * (1 - dist / 160) : 0, t, 0.2);
    SND.hg.gain.setTargetAtTime(heliD < 200 ? 0.9 * (1 - heliD / 200) : 0, t, 0.3);
  }

  /* ================= GTA death and arrest screens ================= */
  function bigText(kind) {
    const scr = document.getElementById('s-drive'); document.getElementById('gta-big')?.remove();
    scr.insertAdjacentHTML('beforeend', `<div id="gta-big" class="${kind}"><b>${kind === 'busted' ? 'BUSTED' : 'WASTED'}</b></div>`);
    document.getElementById('drive-cv')?.classList.add('gta-grey');
    const f = document.getElementById('d-fail');
    if (f) {
      f.classList.add('gta');
      const ps = f.querySelectorAll('.fail-in p');
      if (kind === 'busted' && ps[0]) { ps[0].textContent = `The LSP Police caught you. Fine: $${W.fine}.`; if (ps[1]) ps[1].textContent = 'They let you go outside LSP Hospital after a check-up.'; }
    }
  }
  function clearBig() { document.getElementById('gta-big')?.remove(); document.getElementById('drive-cv')?.classList.remove('gta-grey'); document.getElementById('d-fail')?.classList.remove('gta'); }

  /* ================= setup + every frame ================= */
  function init(ctx) { C = ctx; T = ctx.T; ui(); }
  let pv = null;
  function frame(dt) {
    const g = G(); if (!g.on) return;
    const paused = g.paused || g.over;
    const drive = g.mode === 'drive', p = P(), m = me();
    Radio.update(dt, drive && p && !p.dead);
    if (paused) { sounds(1e9, 1e9); return; }
    W.t += dt; W.crimeCd -= dt;
    const day = R1.R && R1.R.day != null ? R1.R.day : 1;

    // crashes: dents, and a crime if a cop saw you smash into something
    if (drive && p && !p.dead) {
      if (pv && pv.m === p.m) {
        const dvx = p.vx - pv.vx, dvz = p.vz - pv.vz, dv = Math.hypot(dvx, dvz);
        if (dv > 6 && dt < 0.1) {
          dent(p, -dvx, -dvz, (dv - 5) * 0.03);
          if (W.cops.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 60 && los(c.x, c.z, p.x, p.z)) && dv > 9) crime(1, 'Reckless driving in front of the police');
        }
      }
      pv = { vx: p.vx, vz: p.vz, m: p.m };
      if (DENT.total > 0 && p.s) { DENT.low = Math.min(DENT.low ?? p.hp, p.hp); if (p.hp >= p.s.hp - 0.01 && DENT.low < p.s.hp - 0.5) { dentReset(); DENT.low = null; } }
      // speeding past a patrol
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 33 && !W.stars) for (const c of W.cops) if (c.mode === 'patrol' && Math.hypot(c.x - p.x, c.z - p.z) < 28 && los(c.x, c.z, p.x, p.z)) { crime(1, 'Speeding past the police'); break; }
    } else pv = null;
    if (p && p.m !== DENT.car && DENT.car) { DENT.car = null; DENT.total = 0; }

    tickPeds(dt);

    // police population
    const inside = inCity(m.x, m.z);
    const patrols = W.cops.filter((c) => c.mode === 'patrol').length, chasers = W.cops.filter((c) => c.mode === 'chase').length;
    W.spawnT = (W.spawnT || 0) - dt;
    if (W.spawnT <= 0) {
      W.spawnT = 3;
      if (!W.stars && patrols < (L.isTouch() ? 2 : 3) && inside) spawnCop('patrol');
      const want = [0, 2, 3, 4, 5, 6][W.stars] - (L.isTouch() ? 1 : 0);
      if (W.stars && chasers < want) spawnCop('chase', true);
    }
    for (const c of W.cops.slice()) {
      if (c.mode === 'patrol' && Math.hypot(c.x - m.x, c.z - m.z) > 280) { removeCop(c); continue; }
      stepCop(c, dt); if (!W.cops.includes(c)) continue;
      collidePlayer(c, dt); poseCop(c, dt);
    }
    // cops don't stack on top of each other
    for (let i = 0; i < W.cops.length; i++) for (let j = i + 1; j < W.cops.length; j++) { const a = W.cops[i], b = W.cops[j], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 2.6 && d > 0.01) { const k = (2.6 - d) / 2 / d; if (a.mode !== 'block') { a.x += dx * k; a.z += dz * k; } if (b.mode !== 'block') { b.x -= dx * k; b.z -= dz * k; } } }

    // the helicopter at 4 stars
    if (W.stars >= 4 && !W.heli) W.heli = makeHeli();
    if (W.heli) stepHeli(W.heli, dt, day);
    // roadblocks at 3 stars
    W.blockT -= dt; if (W.stars >= 3 && W.seen && W.blockT <= 0) { W.blockT = 22; roadblock(); }

    // seen or searching
    if (W.stars) {
      const seen = W.cops.some((c) => c.sees) || (W.heli && W.heli.sees);
      if (seen) { W.seen = true; W.escT = 0; W.lastSeen = { x: m.x, z: m.z }; }
      else { W.seen = false; W.escT += dt * (g.hidden ? 2 : 1); if (W.escT > 7 + W.stars * 2.5) clearWanted('😎 You lost the police.'); }
      // busted: stopped (or on foot) right next to a chasing cop
      const near = W.cops.some((c) => c.mode !== 'patrol' && c.mode !== 'leave' && Math.hypot(c.x - m.x, c.z - m.z) < 5.5);
      const slow = !drive || Math.hypot(p.vx, p.vz) < 3.5;
      const bb = document.getElementById('gta-bust');
      if (near && slow && W.seen) { W.bustT += dt; bb.style.display = 'block'; bb.textContent = `🚔 Getting arrested… move! ${Math.max(0, 2.5 - W.bustT).toFixed(1)}`; if (W.bustT > 2.5) busted(); }
      else { W.bustT = Math.max(0, W.bustT - dt * 0.7); bb.style.display = 'none'; }
    } else { const bb = document.getElementById('gta-bust'); if (bb) bb.style.display = 'none'; }
    starsUi();
    // sirens get louder as the closest chasing cop comes near
    let nd = 1e9; for (const c of W.cops) if (c.mode === 'chase' || c.mode === 'block') nd = Math.min(nd, Math.hypot(c.x - m.x, c.z - m.z));
    sounds(nd, W.heli && !W.heli.leave ? Math.hypot(W.heli.x - m.x, W.heli.z - m.z) : 1e9);
  }
  function busted() {
    W.busted = true; W.fine = Math.min(Math.max(0, Math.floor(((K && K.S && K.S.cash) || 0) / 2)), 150 * W.stars);
    if (window.LSPDrive && LSPDrive.fail) LSPDrive.fail('You were arrested by the LSP Police.');
  }
  // you got caught or knocked out: tidy up and show the big words
  function onDied() {
    const kind = W.busted ? 'busted' : 'wasted';
    if (W.busted && W.fine && K) K.pay(W.fine, '🚔 LSP Police fine');
    clearWanted(); for (const c of W.cops.slice()) removeCop(c);
    if (W.heli) { C.scene.remove(W.heli.g); C.scene.remove(W.heli.cone); W.heli = null; }
    Radio.stop(); setTimeout(() => bigText(kind), 0);
    const bb = document.getElementById('gta-bust'); if (bb) bb.style.display = 'none';
    C.sfx && C.sfx('lose', { volume: 0.5 });
  }

  /* ================= hooks into the roleplay layer ================= */
  window.LSPDriveRP && LSPDriveRP.ext({
    build(kit) { K = kit; },
    died() { try { onDied(); } catch (e) { console.error(e); } },
    respawned() { W.busted = false; clearBig(); },
    enter() { W.busted = false; clearBig(); },
    leave() { clearWanted(); Radio.stop(); clearBig(); if (C) for (const c of W.cops.slice()) removeCop(c); if (W.heli && C) { C.scene.remove(W.heli.g); C.scene.remove(W.heli.cone); W.heli = null; } sounds(1e9, 1e9); },
    drawMap(g, R, X, Z) { for (const c of W.cops) { g.fillStyle = c.mode === 'patrol' ? '#2f6bff' : (W.t % 0.5 < 0.25 ? '#ff2020' : '#2060ff'); g.beginPath(); g.arc(X(c.x), Z(c.z), 7, 0, 7); g.fill(); } },
  });

  window.LSPDriveGTA = {
    W, Radio, crime, clearWanted, dent: () => DENT,
    // minimap: police dots, the helicopter and the search area
    mini(g, dot, at, zoom) {
      if (W.stars && !W.seen && W.lastSeen) { const p = at(W.lastSeen.x, W.lastSeen.z, true); if (p) { g.fillStyle = 'rgba(80,140,255,.22)'; g.strokeStyle = 'rgba(80,140,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], 55 * zoom, 0, 7); g.fill(); g.stroke(); } }
      for (const c of W.cops) dot(c.x, c.z, c.mode === 'patrol' ? '#2f6bff' : (W.t % 0.5 < 0.25 ? '#ff2020' : '#2060ff'), 7, c.mode !== 'patrol');
      if (W.heli && !W.heli.leave) dot(W.heli.x, W.heli.z, '#16203d', 9, true, '🚁');
    },
  };

  // gunshots that a cop can see or hear bring the police
  if (L.sfx) {
    const base = L.sfx;
    L.sfx = function (name, o) {
      try {
        if (C && G().on && !G().paused && (name === 'rifle' || name === 'explode') && G().mode === 'foot' && !(window.LSPDriveRP && LSPDriveRP.inside && LSPDriveRP.inside()) && inCity(F().x, F().z)) {
          const f = F(); if (W.cops.some((c) => Math.hypot(c.x - f.x, c.z - f.z) < 90)) crime(1, name === 'explode' ? 'Explosion near the police' : 'Shots fired near the police', 2);
        }
      } catch (e) {}
      return base.apply(this, arguments);
    };
  }
})();
