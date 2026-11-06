/* LSP Drive · LSP International Airport, flights to the islands, and private jets.
 * Plugs into drive-rp.js through LSPDriveRP.ext().
 *
 * The airport sits south of the city, through the gap in the south fence (follow the
 * road at x = 0). Real-life order: book a ticket (phone or counter) → wait in the check-in
 * line → get your gate → security → walk to your gate (1-100) → board when it opens →
 * fly → land on the island.
 */
(function () {
  'use strict';
  const L = window.LSPG;
  let K = null, E = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ISLANDS = [
    { id: 'palm', name: 'Palm Paradise', icon: '🏝️', x: -650, z: 1750, theme: 'palm', sand: '#f2dca4', grass: '#7cc46a', desc: 'White beaches, palm trees and coconut water.' },
    { id: 'volcano', name: 'Volcano Isle', icon: '🌋', x: 250, z: 2200, theme: 'volcano', sand: '#4a3b35', grass: '#6b7d4a', desc: 'A smoking volcano and hot springs.' },
    { id: 'snow', name: 'Snow Peak Island', icon: '🏔️', x: -1250, z: 2400, theme: 'snow', sand: '#dfe9f2', grass: '#ffffff', desc: 'Snow, pine trees and hot cocoa.' },
    { id: 'pirate', name: 'Pirate Cove', icon: '🏴‍☠️', x: -350, z: 2900, theme: 'pirate', sand: '#e8cf8f', grass: '#8cb85a', desc: 'An old pirate ship and buried treasure.' },
    { id: 'jungle', name: 'Jungle Ruins', icon: '🌴', x: -1000, z: 3400, theme: 'jungle', sand: '#d9c27a', grass: '#3f8a3a', desc: 'Thick jungle and an ancient temple.' },
  ];
  const CITY_AP = { id: 'city', name: 'LSP City', icon: '🏙️', x: 0, z: 430 };
  const RUNWAY = { x0: -200, x1: 200, z: 430, w: 30 };
  const GATES = 100, gateX = (n) => -197 + (n - 1) * 3.35, GATE_Z = 343;
  const CLASSES = [['economy', 'Economy', 1], ['business', 'Business', 3], ['first', 'First class', 7]];
  const A = { mode: null, fl: null, jet: null, queue: [], line: null, lounge: 0, board: null, loc: null };
  let OB = null; // the original bounds of the city

  const placeOf = (id) => (id === 'city' ? CITY_AP : ISLANDS.find((i) => i.id === id));
  const isRw = (id) => (id === 'city' ? { x0: RUNWAY.x0, x1: RUNWAY.x1, z: RUNWAY.z } : (() => { const i = placeOf(id); return { x0: i.x - 100, x1: i.x + 100, z: i.z + 75 }; })());
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const priceOf = (from, to, cls) => Math.round((90 + dist(placeOf(from), placeOf(to)) * 0.04) * CLASSES.find((c) => c[0] === cls)[2] / 5) * 5;
  const T_ = () => K.S.ticket;

  /* ---------- the airport ---------- */
  function build(kit) {
    K = kit; E = kit.E; OB = { ...E.BOUND };
    const T = E.T, root = new T.Group(); E.scene.add(root); const V2 = K.adapter(root), Y0 = K.Y0;
    const asphalt = E.M('#3d4046', { roughness: 0.95 }), concrete = E.M('#a9adb5', { roughness: 0.9 });
    const flat = (w, d, mat, x, z, y = 0.02) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
    // road from the city, forecourt and parking
    flat(14, 50, asphalt, 0, 248); flat(160, 16, asphalt, 0, 276); flat(90, 12, E.M('#5a5f68'), -110, 276);
    for (let k = 0; k < 14; k++) V2.box(0.15, 0.03, 4.5, '#e8e8e8', -150 + k * 6, 0.04, 276, root, false);
    const sign = V2.sprite('✈️ LSP International Airport', 12, 1.8, '#16203d', '#ffffff'); sign.position.set(0, 7, 240);
    for (const s of [-1, 1]) V2.box(0.4, 6, 0.4, '#9aa3b5', s * 6, 3, 240, root);
    // terminal
    const term = K.building({ x0: -60, x1: 60, z0: 285, z1: 330, h: 9, wall: '#e9eef5', floor: '#dfe3ea', roof: '#9aa3b5', trim: '#2f6bff',
      walls: [[-60, 60, 285, 'h', [[-4, 4]]], [-60, 60, 330, 'h', [[-3, 3]]], [285, 330, -60, 'v'], [285, 330, 60, 'v']],
      windows: [[-40, 285, 1, 3], [-25, 285, 1, 3], [-12, 285, 1, 3], [12, 285, 1, 3], [25, 285, 1, 3], [40, 285, 1, 3], [-40, 285, 1, 6.5], [-12, 285, 1, 6.5], [12, 285, 1, 6.5], [40, 285, 1, 6.5]] }, V2, root);
    term.sign = V2.sprite('✈️ DEPARTURES', 8, 1.3, '#2f6bff', '#ffffff'); term.sign.position.set(0, 10.6, 284.4);
    // concourse with a glass wall over the apron
    K.building({ x0: -200, x1: 140, z0: 330, z1: 346, h: 6, wall: '#e9eef5', floor: '#cfd5de', roof: '#9aa3b5', trim: '#2f6bff', walls: [[-200, 140, 330, 'h', [[-60, 60]]], [330, 346, -200, 'v'], [330, 346, 140, 'v']] }, V2, root);
    V2.box(340, 6, 0.2, E.M('#9fd3f2', { transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2 }), -30, Y0 + 3, 346, root, false); E.addCol(-200, 345.85, 140, 346.15);
    // fences so the apron is only reached through security
    for (const [x0, x1] of [[-236, -200], [175, 215]]) { V2.box(x1 - x0, 2.6, 0.15, '#9aa3b5', (x0 + x1) / 2, 1.3, 330, root, false); E.addCol(x0, 329.85, x1, 330.15); }
    // apron, taxiway, runway
    flat(420, 70, concrete, 5, 382, 0.015);
    const rwTex = E.canvasTex(1024, 96, (g, w, h) => { g.fillStyle = '#34373d'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2f2'; for (let x = 70; x < w - 70; x += 40) g.fillRect(x, h / 2 - 2, 22, 4); for (const x0 of [8, w - 52]) for (let y = 10; y < h - 10; y += 10) g.fillRect(x0, y, 44, 5); g.fillRect(0, 4, w, 3); g.fillRect(0, h - 7, w, 3); });
    rwTex.repeat.set(1, 1);
    flat(RUNWAY.x1 - RUNWAY.x0, RUNWAY.w, new T.MeshStandardMaterial({ map: rwTex, roughness: 0.9 }), 0, RUNWAY.z, 0.03);
    flat(420, 14, asphalt, 5, 405, 0.025);
    const rws = V2.sprite('🛬 RUNWAY 09 / 27', 10, 1.4, '#16203d', '#ffffff'); rws.position.set(-210, 4, 430);
    const tower = new T.Group(); tower.position.set(-120, 0, 300); root.add(tower); { const t2 = K.adapter(tower); t2.box(5, 26, 5, '#e9eef5', 0, 13, 0, tower); t2.box(9, 4, 9, E.M('#2b3350', { metalness: 0.5, roughness: 0.2 }), 0, 28, 0, tower); t2.box(10, 0.6, 10, '#e9eef5', 0, 30.3, 0, tower); E.addCol(-122.5, 297.5, -117.5, 302.5); }
    // ---- inside the terminal ----
    buildCheckin(V2, root); buildInfo(V2, root); buildCafe(V2, root); buildLounge(V2, root); buildSecurity(V2, root); buildBoard(root);
    buildGates(root); buildHangar(V2, root);
    // parked planes, and the one for your flight
    A.parked = [12, 27, 48, 66, 83].map((n, i) => { const p = makePlane(['#2f6bff', '#d61f30', '#14c79a', '#ff8a3d', '#6a3fa0'][i]); p.position.set(gateX(n), 0, 363); p.rotation.y = Math.PI; E.scene.add(p); return p; });
    A.plane = makePlane('#2f6bff'); A.plane.visible = false; E.scene.add(A.plane);
    ISLANDS.forEach(buildIsland);
    // the sea around the islands
    const sea = new T.Mesh(new T.PlaneGeometry(9000, 9000), E.M('#2a8cc4', { roughness: 0.25, metalness: 0.1, emissive: '#0b3d5e', emissiveIntensity: 0.25 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-500, -0.6, 2200); E.scene.add(sea);
    // HUD
    document.querySelector('#s-drive').insertAdjacentHTML('beforeend', `<div id="air-hud" hidden><div id="air-read"></div><div id="air-help"></div><div id="air-btns"><button data-ab="up">⬆️ Climb</button><button data-ab="down">⬇️ Down</button><button data-ab="view" hidden>🪟 View</button><button data-ab="skip" hidden>⏩ Skip</button></div></div><div id="air-fade" hidden></div>`);
    const st = document.createElement('style');
    st.textContent = `#air-hud{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:30;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}#air-hud[hidden]{display:none}
#air-read{background:#0b0f1ccc;color:#7fffb0;font:700 14px ui-monospace,monospace;padding:8px 14px;border-radius:12px;white-space:pre;text-align:center;border:1px solid #2f6bff}
#air-help{background:#16203dcc;color:#fff;font:600 12px system-ui;padding:5px 10px;border-radius:10px}
#air-btns{display:flex;gap:8px;pointer-events:auto}#air-btns button{border:0;border-radius:12px;padding:10px 14px;font:700 14px system-ui;background:#fff;color:#16203d;box-shadow:0 4px 14px #0005;cursor:pointer}#air-btns button[hidden]{display:none}
#air-fade{position:absolute;inset:0;background:#000;z-index:60;pointer-events:none;opacity:0;transition:opacity .5s}#air-fade.on{opacity:1}
.bp{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #d9dee8}.bp-top{background:linear-gradient(135deg,#16203d,#2f6bff);color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}.bp-top b{font:700 24px Fredoka,system-ui}
.bp-mid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 14px}.bp-mid small{display:block;color:#6b7591;font-size:11px}.bp-mid b{font:700 18px system-ui}.bp-gate b{font-size:30px;color:#2f6bff}`;
    document.head.appendChild(st);
    document.querySelectorAll('#air-btns [data-ab]').forEach((b) => { const k = b.dataset.ab; b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'up') A.up = true; if (k === 'down') A.down = true; if (k === 'view') A.view = !A.view; if (k === 'skip') skipFlight(); }); b.addEventListener('pointerup', () => { if (k === 'up') A.up = false; if (k === 'down') A.down = false; }); });
    addEventListener('keydown', (e) => { if (!L.isActive('s-drive') || !A.mode) return; if (e.code === 'KeyV') A.view = !A.view; if (e.code === 'Enter' && A.mode === 'fly') skipFlight(); });
    K.places.push({ name: 'LSP Airport', icon: '✈️', x: 0, z: 278 });
  }

  /* ---------- check-in line ---------- */
  const QX = -40.5, qPos = (i) => [QX, 316.2 - i * 1.3];
  function buildCheckin(V2, root) {
    const Y0 = K.Y0;
    for (let k = 0; k < 4; k++) { const x = -52 + k * 9; V2.box(5, 1.1, 1, '#2f6bff', x + 2.5, Y0 + 0.55, 318.5, root, false); E.addCol(x, 318, x + 5, 319); V2.box(5, 1.6, 0.2, '#16203d', x + 2.5, Y0 + 3, 329.5, root, false); const sg = E.textSprite(`CHECK-IN ${k + 1}`, '#16203d', '#ffb31a', 4.4, 0.8); sg.position.set(x + 2.5, Y0 + 3, 329.3); root.add(sg); const ag = E.person('#2f6bff', '#2d3a5c', ['#c68642', '#f1c27d', '#8d5524'][k % 3]); ag.position.set(x + 2.5, Y0, 320); ag.rotation.y = Math.PI; root.add(ag); }
    // belts that make the line
    for (const x of [QX - 1, QX + 1]) { for (let z = 304; z <= 316; z += 2) V2.cyl(0.06, 0.08, 1, '#9aa3b5', x, Y0 + 0.5, z, root, 8); V2.box(0.04, 0.08, 12, '#d61f30', x, Y0 + 0.95, 310, root, false); }
    E.addCol(QX - 1.05, 303.8, QX - 0.95, 316.2); E.addCol(QX + 0.95, 303.8, QX + 1.05, 316.2);
    for (let i = 0; i < 5; i++) { const p = E.person(['#ff4d8b', '#14c79a', '#ffb31a', '#8a5cff', '#6b4a2f'][i], '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][i % 3]); const [x, z] = qPos(i); p.position.set(x, Y0, z); p.rotation.y = 0; const bag = K.adapter(p).box(0.45, 0.6, 0.3, ['#16203d', '#d61f30', '#2f6bff'][i % 3], 0.5, 0.35, 0, p, false); root.add(p); A.queue.push({ m: p, tz: z, bag }); }
    A.qT = 3.5;
    K.obj({ x: QX, z: 302.6, r: 1.6, when: () => !A.line, label: () => `🧍 Join the check-in line (${A.queue.length} ahead)`, use: joinLine }, 0, 0);
  }
  function joinLine() { A.line = { i: A.queue.length }; const F = E.getF(); [F.x, F.z] = qPos(A.line.i); F.h = 0; K.say('🧍 You are in the line. Wait for your turn (E to step out).', 2500); }
  function tickQueue(dt) {
    A.qT -= dt; const Y0 = K.Y0;
    if (A.qT <= 0) {
      A.qT = A.line ? 3.2 : 4.5;
      // the person at the front is done: they walk off, and someone new joins at the back
      const q = A.queue.shift(); if (q) { q.leave = 1; A.leaving = A.leaving || []; A.leaving.push(q); }
      if (A.line) A.line.i = Math.max(0, A.line.i - 1);
      A.queue.forEach((p, i) => (p.tz = qPos(i)[1]));
      if (!A.line && A.queue.length < 5 && A.leaving.length) { const p = A.leaving.find((o) => o.leave > 2.5); if (p) { A.leaving.splice(A.leaving.indexOf(p), 1); p.leave = 0; const [x, z] = qPos(A.queue.length); p.m.position.set(x, Y0, z - 4); p.tz = z; A.queue.push(p); } }
    }
    A.queue.forEach((p) => { const dz = p.tz - p.m.position.z; if (Math.abs(dz) > 0.02) p.m.position.z += Math.sign(dz) * Math.min(Math.abs(dz), dt * 1.6); p.m.rotation.y = 0; });
    for (const p of A.leaving || []) { p.leave += dt; if (p.leave < 2.5) { p.m.position.x += dt * 2.2; p.m.position.z += dt * 0.6; p.m.rotation.y = 1.3; } }
    if (A.line) {
      const F = E.getF(), [x, z] = qPos(A.line.i); F.x += (x - F.x) * Math.min(1, dt * 3); F.z += (z - F.z) * Math.min(1, dt * 3); F.h = 0;
      if (A.line.i === 0 && A.queue.length === 0) { A.line = null; checkinDesk(); }
      else if (A.line.i === 0 && Math.abs(F.z - qPos(0)[1]) < 0.1) { A.line = null; checkinDesk(); }
    }
  }
  function checkinDesk() {
    const t = T_();
    if (!t || t.from !== 'city' || t.used) { A.counter = true; return bookUi('🧑‍✈️ Check-in counter: "No ticket? You can buy one right here, and I will check you in."', 'city'); }
    if (t.checked) return K.say(`🧑‍✈️ "You are already checked in. Gate ${t.gate}!"`);
    t.checked = true; K.save(); L.sfx && L.sfx('ding');
    const dir = gateX(t.gate) > 0 ? 'LEFT' : 'RIGHT', m = Math.round(Math.abs(gateX(t.gate)));
    K.openUi(`<div class="lf-top"><h3>🧑‍✈️ Check-in</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:420px">${passHtml(t)}<p style="margin-top:10px">"Here is your bag tag. Your flight boards at <b>Gate ${t.gate}</b> at <b>${clock(t.boardAt)}</b>. Go through security behind the info desk, then turn <b>${dir}</b> and walk about ${m} m. Enjoy the café or the lounge while you wait!"</p><button class="btn primary" data-gps="1">📍 Put Gate ${t.gate} on my GPS</button></div>`);
    document.querySelector('#rp-win [data-gps]').onclick = () => { K.setGps({ name: `Gate ${t.gate}`, icon: '🛫', x: gateX(t.gate), z: GATE_Z }); K.closeUi(); };
  }
  function buildInfo(V2, root) {
    const Y0 = K.Y0; V2.cyl(1.8, 1.8, 1.1, '#ffb31a', 0, Y0 + 0.55, 302, root, 24); E.addCol(-1.8, 300.2, 1.8, 303.8);
    const ag = E.person('#ffb31a', '#2d3a5c', '#c68642'); ag.position.set(0, Y0, 302); root.add(ag);
    const sg = E.textSprite('🛈 INFORMATION', '#ffb31a', '#16203d', 4, 0.7); sg.position.set(0, Y0 + 3.2, 302); root.add(sg);
    K.obj({ x: 0, z: 299.4, r: 1.8, label: () => '🛈 Information desk: ask where to go', use: info }, 0, 0);
  }
  function info() {
    const t = T_();
    if (!t || t.used) return K.say('🛈 "Book a flight on your phone (✈️ Flights) or at the check-in counters on the left. Then join the line!"', 4500);
    if (t.from !== 'city') return K.say('🛈 "Your ticket is for a flight from an island."');
    const dir = gateX(t.gate) > 0 ? 'left' : 'right', m = Math.round(Math.abs(gateX(t.gate)));
    K.setGps({ name: `Gate ${t.gate}`, icon: '🛫', x: gateX(t.gate), z: GATE_Z });
    K.say(t.checked ? `🛈 "Flight ${t.no}: Gate ${t.gate}. Through security behind me, turn ${dir}, about ${m} m. It's on your GPS now."` : `🛈 "First check in at the counters on the left (join the line). Then security, and Gate ${t.gate} is ${m} m to the ${dir}."`, 5500);
  }
  function buildSecurity(V2, root) {
    const Y0 = K.Y0;
    for (const s of [-1, 1]) V2.box(0.3, 2.6, 0.8, '#9aa3b5', s * 1.1, Y0 + 1.3, 329, root, false);
    V2.box(2.6, 0.3, 0.8, '#9aa3b5', 0, Y0 + 2.75, 329, root, false); V2.box(1.6, 0.9, 6, '#2b3350', 4, Y0 + 0.45, 326, root, false); E.addCol(3.2, 323, 4.8, 329);
    const g = E.person('#16203d', '#16203d', '#8d5524', '#16203d'); g.position.set(-2.2, Y0, 328); g.rotation.y = 0.8; root.add(g);
    E.addCol(-3, 329.85, 3, 330.15);
    K.obj({ x: 0, z: 327.8, r: 1.8, label: () => '🛂 Security: show your boarding pass', use: () => {
      const t = T_(); if (!t || t.used || t.from !== 'city') return K.say('🛂 "Boarding pass please. No ticket, no entry."');
      if (!t.checked) return K.say('🛂 "Please check in at the counters first."');
      L.sfx && L.sfx('beep'); const F = E.getF(); F.x = 0; F.z = 332; F.h = 0; K.say(`🛂 "All clear. Gate ${t.gate} is to your ${gateX(t.gate) > 0 ? 'left' : 'right'}. Have a good flight!"`, 3500);
    } }, 0, 0);
    K.obj({ x: 0, z: 331.8, r: 1.5, label: () => '🚪 Back to the main hall', use: () => { const F = E.getF(); F.x = 0; F.z = 326.5; F.h = Math.PI; } }, 0, 0);
    // moving walkways
    const walk = E.M('#2b3350', { roughness: 0.6 });
    for (const [x0, x1] of [[-195, -8], [8, 135]]) for (const z of [336.5, 339.5]) V2.box(x1 - x0, 0.08, 2, walk, (x0 + x1) / 2, Y0 + 0.04, z, root, false);
  }
  function buildCafe(V2, root) {
    const Y0 = K.Y0; V2.box(9, 1.1, 1.1, '#6b4a2f', 32, Y0 + 0.55, 322, root, false); E.addCol(27.5, 321.4, 36.5, 322.6);
    const sg = E.textSprite('☕ SKY CAFÉ', '#6b4a2f', '#fff', 4, 0.8); sg.position.set(32, Y0 + 3.4, 323); root.add(sg);
    const b = E.person('#14c79a', '#2d3a5c', '#f1c27d', '#6b4a2f'); b.position.set(32, Y0, 323.4); b.rotation.y = Math.PI; root.add(b);
    for (const [x, z] of [[24, 306], [30, 306], [36, 306], [24, 312], [30, 312], [36, 312], [42, 309]]) { V2.cyl(0.7, 0.7, 0.06, '#ffffff', x, Y0 + 0.75, z, root, 18); V2.cyl(0.08, 0.1, 0.72, '#555', x, Y0 + 0.37, z, root, 8); for (const s of [-1, 1]) V2.box(0.5, 0.45, 0.5, '#14c79a', x + s * 1.1, Y0 + 0.23, z, root, false); E.addCol(x - 0.6, z - 0.6, x + 0.6, z + 0.6); }
    K.obj({ x: 32, z: 320.4, r: 1.8, label: () => '☕ Sky Café: order · scan to pay', use: () => menu('☕ Sky Café', [['☕', 'Cappuccino', 4, { energy: 12 }], ['🥐', 'Croissant', 3, { hunger: 14 }], ['🥪', 'Club sandwich', 7, { hunger: 30 }], ['🍰', 'Cheesecake', 5, { hunger: 10, fun: 6 }], ['🧃', 'Orange juice', 3, { energy: 6, hunger: 4 }], ['🍜', 'Noodle bowl', 8, { hunger: 35 }]]) }, 0, 0);
  }
  function menu(title, items) {
    K.openUi(`<div class="lf-top"><h3>${title}</h3><span class="pill">${K.fmt$(K.S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="lf-grid">${items.map(([ic, n, p], i) => `<div class="lf-card"><span class="ic">${ic}</span><b>${n}</b><button class="btn gold" data-mi="${i}" ${p === 0 || K.canPay(p) ? '' : 'disabled'}>${p ? K.fmt$(p) : 'Free'}</button></div>`).join('')}</div></div>`);
    document.querySelectorAll('#rp-win [data-mi]').forEach((x) => (x.onclick = () => { const [ic, n, p, eff] = items[+x.dataset.mi]; K.closeUi(); const go = () => K.activity('eat', `Having your ${n.toLowerCase()}`, 4, Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, v / 4]))); if (!p) return go(); K.showQR(title.replace(/^\S+\s/, ''), p, false, () => { K.pay(p, `${ic} ${n}`); go(); K.hud(); }); }));
  }
  function buildLounge(V2, root) {
    const Y0 = K.Y0, glass = E.M('#bfe4ff', { transparent: true, opacity: 0.35, roughness: 0.05 });
    V2.box(0.15, 9, 37, glass, 46, Y0 + 4.5, 307.5, root, false); E.addCol(45.9, 289, 46.1, 326);
    V2.box(14, 9, 0.15, glass, 53, Y0 + 4.5, 289, root, false); E.addCol(46, 288.9, 60, 289.1);
    V2.box(14, 9, 0.15, glass, 53, Y0 + 4.5, 326, root, false); E.addCol(46, 325.9, 60, 326.1);
    V2.box(13.6, 0.03, 36.6, '#7a5c3a', 53, Y0 + 0.02, 307.5, root, false);
    const sg = E.textSprite('🛋️ LSP PREMIUM LOUNGE', '#111114', '#d4af37', 6, 0.9); sg.position.set(45.7, Y0 + 3.8, 307.5); root.add(sg);
    V2.box(1, 1, 8, '#ffffff', 58.6, Y0 + 0.5, 300, root, false); E.addCol(58, 296, 59.2, 304);
    for (let k = 0; k < 8; k++) V2.box(0.6, 0.2, 0.6, ['#ff8a3d', '#14c79a', '#ffd23f', '#ff4d8b'][k % 4], 58.6, Y0 + 1.1, 296.6 + k, root, false);
    V2.box(1, 1.1, 5, '#2b2b2b', 58.6, Y0 + 0.55, 316, root, false); E.addCol(58, 313.5, 59.2, 318.5);
    for (const z of [294, 306, 312, 322]) { V2.box(3, 0.5, 1.1, '#4f6bd8', 51, Y0 + 0.3, z, root, false); V2.box(3, 0.7, 0.25, '#4f6bd8', 51, Y0 + 0.75, z - 0.45, root, false); E.addCol(49.5, z - 0.6, 52.5, z + 0.6); }
    V2.box(3, 1.7, 0.1, '#111', 47, Y0 + 2.2, 309, root, false).rotation.y = Math.PI / 2;
    K.obj({ x: 44.6, z: 307.5, r: 2, label: () => (A.lounge > 0 ? `🛋️ Go back into the lounge (${Math.ceil(A.lounge)}s left)` : '🛋️ Premium lounge · $100 for 5 minutes'), use: () => {
      if (A.lounge <= 0) { if (!K.canPay(100)) return K.say('The lounge costs $100.'); K.showQR('LSP Premium Lounge', 100, false, () => { K.pay(100, '🛋️ LSP Premium Lounge (5 min)'); A.lounge = 300; enterLounge(); K.hud(); }); return; }
      enterLounge();
    } }, 0, 0);
    const o = (q) => K.obj({ ...q, when: () => A.lounge > 0 }, 0, 0);
    o({ x: 57.2, z: 300, r: 2.2, label: () => '🍽️ Free buffet', use: () => menu('🍽️ Lounge buffet (free)', [['🍣', 'Sushi', 0, { hunger: 30 }], ['🥗', 'Salad', 0, { hunger: 20, energy: 4 }], ['🍝', 'Pasta', 0, { hunger: 35 }], ['🍨', 'Dessert', 0, { hunger: 8, fun: 8 }]]) });
    o({ x: 57.2, z: 316, r: 2, label: () => '🍹 Free drinks bar', use: () => menu('🍹 Lounge bar (free)', [['🍹', 'Mocktail', 0, { fun: 10, energy: 4 }], ['☕', 'Espresso', 0, { energy: 14 }], ['🥤', 'Smoothie', 0, { hunger: 10, energy: 8 }], ['🍵', 'Green tea', 0, { energy: 8 }]]) });
    o({ x: 51, z: 307.4, r: 1.6, label: () => '🛋️ Relax on the sofa', use: () => K.activity('relax', 'Relaxing in the lounge', 8, { fun: 6, energy: 6 }) });
    o({ x: 51, z: 323.4, r: 1.6, label: () => '💆 Massage chair', use: () => K.activity('relax', 'Massage chair', 6, { fun: 8, energy: 8, hygiene: 2 }) });
    o({ x: 48.5, z: 309, r: 1.8, label: () => '📺 Watch the news', use: () => K.activity('tv', 'Watching TV in the lounge', 8, { fun: 6 }) });
    o({ x: 47.2, z: 307.5, r: 1.4, label: () => '🚪 Leave the lounge', use: () => { const F = E.getF(); F.x = 44.4; F.z = 307.5; F.h = -Math.PI / 2; } });
  }
  function enterLounge() { const F = E.getF(); F.x = 48.2; F.z = 307.5; F.h = Math.PI / 2; K.say(`🛋️ Welcome to the lounge. Food and drinks are free. ${Math.ceil(A.lounge / 60)} min left.`, 3000); }
  function buildBoard(root) {
    const T = E.T, c = document.createElement('canvas'); c.width = 1024; c.height = 512; A.boardCv = c;
    A.boardTex = new T.CanvasTexture(c); A.boardTex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(14, 7), new T.MeshBasicMaterial({ map: A.boardTex })); m.position.set(16, K.Y0 + 5.2, 329.7); m.rotation.y = Math.PI; root.add(m);
    drawBoard();
  }
  function drawBoard() {
    const g = A.boardCv.getContext('2d'), t = T_(); g.fillStyle = '#0b0f1c'; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#ffb31a'; g.font = '700 40px ui-monospace,monospace'; g.fillText('✈ DEPARTURES', 30, 56); g.fillStyle = '#9aa3b5'; g.font = '700 24px ui-monospace,monospace'; g.fillText('TIME    FLIGHT   TO                 GATE  STATUS', 30, 100);
    const rows = []; const now = K.absMin();
    if (t && !t.used && t.from === 'city') rows.push([t.boardAt, t.no, placeOf(t.to).name, t.gate, now >= t.departAt ? 'DEPARTED' : now >= t.boardAt ? 'BOARDING' : 'ON TIME', true]);
    let seed = Math.floor(now / 60); const R = () => ((seed = (seed * 16807 + 11) % 2147483647) / 2147483647);
    for (let k = 0; rows.length < 9; k++) { const i = ISLANDS[Math.floor(R() * ISLANDS.length)], at = Math.floor(now / 30) * 30 + 30 + k * 25; rows.push([at, 'LSP' + (100 + Math.floor(R() * 899)), i.name, 1 + Math.floor(R() * GATES), R() < 0.15 ? 'DELAYED' : at - now < 40 ? 'BOARDING' : 'ON TIME', false]); }
    rows.slice(0, 9).forEach(([at, no, to, gate, st, mine], i) => { const y = 145 + i * 40; if (mine) { g.fillStyle = '#16305c'; g.fillRect(20, y - 30, 984, 38); } g.fillStyle = mine ? '#7fffb0' : '#ffffff'; g.font = '700 26px ui-monospace,monospace'; g.fillText(`${clock(at).padEnd(8)}${no.padEnd(9)}${to.slice(0, 18).padEnd(19)}${String(gate).padEnd(6)}`, 30, y); g.fillStyle = st === 'BOARDING' ? '#7fffb0' : st === 'DELAYED' ? '#ff6b6b' : st === 'DEPARTED' ? '#9aa3b5' : '#ffd56b'; g.fillText(st, 790, y); });
    A.boardTex.needsUpdate = true;
  }
  function buildGates(root) {
    const T = E.T, Y0 = K.Y0;
    // one atlas with all 100 gate numbers, one mesh for every sign
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    for (let n = 1; n <= GATES; n++) { const col = (n - 1) % 10, row = Math.floor((n - 1) / 10), x = col * 102.4, y = row * 102.4; g.fillStyle = '#16203d'; g.fillRect(x + 2, y + 2, 98, 98); g.fillStyle = '#ffb31a'; g.font = '700 22px system-ui'; g.textAlign = 'center'; g.fillText('GATE', x + 51, y + 30); g.font = '700 50px system-ui'; g.fillText(String(n), x + 51, y + 82); }
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const signs = [], seats = [], desks = [], doors = [];
    for (let n = 1; n <= GATES; n++) {
      const x = gateX(n), col = (n - 1) % 10, row = Math.floor((n - 1) / 10);
      const p = new T.PlaneGeometry(1.4, 1.4), uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 10, 1 - (row + 1 - uv.getY(i)) / 10);
      p.rotateY(Math.PI); p.translate(x, Y0 + 4.4, 345.7); signs.push(p);
      for (let k = 0; k < 3; k++) { const s = new T.BoxGeometry(0.5, 0.45, 0.5); s.translate(x + 0.2 + k * 0.55, Y0 + 0.23, 342.6); seats.push(s); const b2 = new T.BoxGeometry(0.5, 0.5, 0.1); b2.translate(x + 0.2 + k * 0.55, Y0 + 0.7, 342.85); seats.push(b2); }
      const d = new T.BoxGeometry(0.9, 1.05, 0.6); d.translate(x - 1.05, Y0 + 0.52, 344.7); desks.push(d);
      const dr = new T.BoxGeometry(1.5, 2.6, 0.1); dr.translate(x - 1.05, Y0 + 1.3, 345.9); doors.push(dr);
      E.addCol(x - 1.5, 344.4, x - 0.6, 345);
      K.obj({ x: x - 1.05, z: 343.6, r: 1.4, label: () => gateLabel(n), use: () => gateUse(n) }, 0, 0);
    }
    const mk = (geos, mat) => { const m = new T.Mesh(E.merge(geos), mat); root.add(m); return m; };
    mk(signs, new T.MeshBasicMaterial({ map: tex })); mk(seats, E.M('#2f6bff')); mk(desks, E.M('#ffb31a')); mk(doors, E.M('#5f6b80', { metalness: 0.5, roughness: 0.3 }));
  }
  function gateLabel(n) {
    const t = T_(), now = K.absMin();
    if (!t || t.used || t.from !== 'city' || t.gate !== n) return `🛫 Gate ${n}`;
    if (now >= t.departAt) return `🛫 Gate ${n}: flight ${t.no} has left. Rebook at the info desk`;
    if (now >= t.boardAt) return `🛫 Gate ${n}: BOARDING NOW · scan your pass for ${placeOf(t.to).name}`;
    return `🛫 Gate ${n}: ${t.no} to ${placeOf(t.to).name} · boarding at ${clock(t.boardAt)}`;
  }
  function gateUse(n) {
    const t = T_(), now = K.absMin();
    if (!t || t.used || t.from !== 'city' || t.gate !== n) return K.say(t && !t.used && t.from === 'city' ? `Your flight is at Gate ${t.gate}. Look at your ticket!` : 'No flight for you at this gate.');
    if (now >= t.departAt) { t.used = true; K.save(); return K.say('😢 You missed your flight. Book a new one on your phone.', 3500); }
    if (now < t.boardAt) return K.say(`⏳ Boarding starts at ${clock(t.boardAt)}. Grab a coffee or relax in the lounge!`, 3000);
    L.sfx && L.sfx('beep'); t.used = true; K.save(); takeoff(t);
  }
  function buildHangar(V2, root) {
    const Y0 = K.Y0;
    K.building({ x0: 125, x1: 175, z0: 288, z1: 326, h: 12, wall: '#c7cbd2', floor: '#9aa3b5', roof: '#7a808a', trim: '#ffb31a', walls: [[125, 175, 288, 'h', [[145, 151]]], [125, 175, 326, 'h', [[130, 170]]], [288, 326, 125, 'v'], [288, 326, 175, 'v']] }, V2, root);
    const sg = V2.sprite('🛩️ PRIVATE JETS', 7, 1.2, '#16203d', '#ffb31a'); sg.position.set(148, 14, 287.4);
    const fl = new E.T.Mesh(new E.T.PlaneGeometry(40, 22), E.M('#5a5f68')); fl.rotation.x = -Math.PI / 2; fl.position.set(150, 0.02, 337); root.add(fl);
    const guy = E.person('#ffb31a', '#2d3a5c', '#8d5524', '#ffb31a'); guy.position.set(132, Y0, 296); guy.rotation.y = 1; root.add(guy);
    V2.box(2.4, 1, 1, '#2b3350', 132, Y0 + 0.5, 297.5, root, false); E.addCol(130.8, 297, 133.2, 298);
    K.obj({ x: 132, z: 299.2, r: 1.8, label: () => (K.S.jet && K.S.jet.own ? '🛩️ Hangar desk: your jet is ready' : '🛩️ Hangar desk: rent $800 or buy a private jet'), use: jetDesk }, 0, 0);
    A.jet = makeJet(); E.scene.add(A.jet);
  }

  /* ---------- planes ---------- */
  function makePlane(livery) {
    const T = E.T, g = new T.Group(), V2 = K.adapter(g), white = E.M('#f4f6fa', { roughness: 0.45, metalness: 0.2 }), dark = E.M('#16203d', { roughness: 0.2, metalness: 0.4 }), liv = E.M(livery);
    const body = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, 30, 20), white); body.rotation.x = Math.PI / 2; body.position.y = 3.4; body.castShadow = true; g.add(body);
    const nose = new T.Mesh(new T.SphereGeometry(2.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.rotation.x = Math.PI / 2; nose.position.set(0, 3.4, 15); nose.scale.set(1, 1.6, 1); g.add(nose);
    const tail = new T.Mesh(new T.ConeGeometry(2.1, 7, 20), white); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 3.9, -18.4); g.add(tail);
    V2.box(1.6, 0.5, 0.1, dark, 0, 4.3, 17.2, g, false).rotation.x = -0.6;
    for (const s of [-1, 1]) {
      V2.box(0.05, 0.35, 24, dark, s * 2.08, 4.1, 0.5, g, false);
      V2.box(0.05, 0.5, 30, liv, s * 2.08, 2.6, 0, g, false);
      const w = V2.box(14, 0.35, 4.2, white, s * 8.6, 2.4, -1, g); w.rotation.y = s * 0.32; w.rotation.z = s * -0.06;
      const st = V2.box(5.2, 0.25, 2, white, s * 3.4, 4.4, -18.5, g); st.rotation.y = s * 0.35;
      const en = new T.Mesh(new T.CylinderGeometry(0.95, 0.85, 3.6, 16), E.M('#c7cbd2', { metalness: 0.6, roughness: 0.3 })); en.rotation.x = Math.PI / 2; en.position.set(s * 6.2, 1.5, 1); g.add(en);
      V2.box(0.3, 0.9, 1.2, white, s * 6.2, 2.1, 0.6, g, false);
      V2.cyl(0.3, 0.3, 0.4, '#16203d', s * 2.2, 0.35, -1.5, g, 10).rotation.z = Math.PI / 2;
    }
    const fin = V2.box(0.35, 6, 4.2, liv, 0, 7.5, -18, g); fin.rotation.x = -0.45;
    V2.cyl(0.25, 0.25, 0.4, '#16203d', 0, 0.35, 12, g, 10).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) V2.box(0.2, 1.6, 0.2, '#555', s * 2.2, 1.1, -1.5, g, false);
    V2.box(0.2, 1.6, 0.2, '#555', 0, 1.1, 12, g, false);
    const logo = E.textSprite('LSP AIR', null, livery, 4, 1); logo.position.set(0, 8.4, -18.6); g.add(logo);
    g.userData.lights = [V2.box(0.3, 0.3, 0.3, E.M('#ff2d2d', { emissive: '#ff0000', emissiveIntensity: 2 }), -15.2, 2.6, -2.6, g, false), V2.box(0.3, 0.3, 0.3, E.M('#2dff6b', { emissive: '#00ff44', emissiveIntensity: 2 }), 15.2, 2.6, -2.6, g, false)];
    return g;
  }
  function makeJet() {
    const T = E.T, g = new T.Group(), V2 = K.adapter(g), white = E.M('#f4f6fa', { roughness: 0.4, metalness: 0.3 }), gold = E.M('#d4af37', { metalness: 0.7, roughness: 0.3 }), dark = E.M('#16203d', { metalness: 0.4, roughness: 0.2 });
    const body = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, 12, 16), white); body.rotation.x = Math.PI / 2; body.position.y = 1.9; body.castShadow = true; g.add(body);
    const nose = new T.Mesh(new T.ConeGeometry(1.05, 3.2, 16), white); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.9, 7.6); g.add(nose);
    const tail = new T.Mesh(new T.ConeGeometry(1.05, 3, 16), white); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 2.1, -7.4); g.add(tail);
    V2.box(1.2, 0.45, 0.1, dark, 0, 2.5, 6.3, g, false).rotation.x = -0.7;
    for (const s of [-1, 1]) {
      const w = V2.box(6.5, 0.2, 2.2, white, s * 4, 1.4, 0, g); w.rotation.y = s * 0.3;
      const wl = V2.box(0.15, 1, 0.8, gold, s * 7.2, 1.85, -1, g, false); wl.rotation.z = s * -0.2;
      V2.box(0.05, 0.25, 6, dark, s * 1.04, 2.2, 1.5, g, false); V2.box(0.05, 0.18, 12, gold, s * 1.04, 1.5, 0, g, false);
      const en = new T.Mesh(new T.CylinderGeometry(0.5, 0.45, 2.4, 14), E.M('#c7cbd2', { metalness: 0.6, roughness: 0.3 })); en.rotation.x = Math.PI / 2; en.position.set(s * 1.7, 2.3, -4.5); g.add(en);
      V2.cyl(0.18, 0.18, 0.25, '#16203d', s * 1.1, 0.25, -0.5, g, 10).rotation.z = Math.PI / 2; V2.box(0.12, 1, 0.12, '#555', s * 1.1, 0.75, -0.5, g, false);
    }
    V2.box(0.25, 3, 2, white, 0, 4, -7, g).rotation.x = -0.5; V2.box(4.4, 0.18, 1.3, white, 0, 5.3, -7.9, g);
    V2.cyl(0.15, 0.15, 0.2, '#16203d', 0, 0.25, 5, g, 10).rotation.z = Math.PI / 2; V2.box(0.1, 0.9, 0.1, '#555', 0, 0.7, 5, g, false);
    g.position.set(150, 0.05, 306); g.rotation.y = 0;
    return g;
  }

  /* ---------- tickets ---------- */
  const clock = (m) => { const mm = ((Math.floor(m) % 1440) + 1440) % 1440, h = Math.floor(mm / 60), mi = mm % 60; return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  function passHtml(t) {
    const now = K.absMin(), st = t.used ? (t.flown ? 'Flown' : 'Used / expired') : now >= t.departAt ? 'Departed' : now >= t.boardAt ? 'BOARDING' : 'On time', fr = placeOf(t.from), to = placeOf(t.to);
    return `<div class="bp"><div class="bp-top"><div><small>LSP AIR · ${CLASSES.find((c) => c[0] === t.cls)[1]}</small><br><b>${fr.icon} → ${to.icon}</b></div><div style="text-align:right"><small>Flight</small><br><b>${t.no}</b></div></div><div class="bp-mid"><div><small>From</small><b style="font-size:14px">${fr.name}</b></div><div><small>To</small><b style="font-size:14px">${to.name}</b></div><div class="bp-gate"><small>${t.from === 'city' ? 'Gate' : 'Desk'}</small><b>${t.from === 'city' ? t.gate : '1'}</b></div><div><small>Seat</small><b>${t.seat}</b></div><div><small>Boarding</small><b>${clock(t.boardAt)}</b></div><div><small>Status</small><b style="font-size:14px;color:${st === 'BOARDING' ? '#14c79a' : '#16203d'}">${st}</b></div></div><div style="padding:0 14px 12px;font-size:12px;color:#6b7591">${t.from === 'city' ? (t.checked ? `✅ Checked in. Go through security, then to Gate ${t.gate}.` : '1. Join the check-in line · 2. Security · 3. Gate') : 'Board at the island airport desk when boarding opens.'}</div></div>`;
  }
  function bookUi(intro, from) {
    from = from || A.loc || 'city';
    const dests = [CITY_AP, ...ISLANDS].filter((p) => p.id !== from);
    const pick = A.pick || (A.pick = { to: dests[0].id, cls: 'economy' }); if (!dests.some((d) => d.id === pick.to)) pick.to = dests[0].id;
    const p = priceOf(from, pick.to, pick.cls), pts = p * 3;
    const html = `${intro ? `<p style="margin:0 0 8px">${intro}</p>` : ''}<p class="muted" style="margin:0 0 6px">Where to?</p>${dests.map((d) => `<button class="rp-row" data-to="${d.id}" style="width:100%;border:${pick.to === d.id ? '2px solid #2f6bff' : '0'};cursor:pointer;text-align:left"><span style="font-size:24px">${d.icon}</span><div style="flex:1"><b>${d.name}</b><div class="muted" style="font-size:11px">${d.desc || 'Back to the city'}</div></div><span class="muted">${K.fmt$(priceOf(from, d.id, 'economy'))}+</span></button>`).join('')}
      <div class="rp-cats" style="margin:8px 0">${CLASSES.map(([id, n]) => `<button data-cls="${id}" class="${pick.cls === id ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p><b>${K.fmt$(p)}</b> or <b>⭐ ${pts.toLocaleString()}</b> game points · boarding in about 45 game minutes</p>
      <button class="btn primary" data-pay="upi" ${K.S.cash >= p ? '' : 'disabled'}>📲 Pay with LSP UPI</button> <button class="btn ghost" data-pay="card" ${K.cardLeft() >= p ? '' : 'disabled'}>💳 Credit card</button> <button class="btn gold" data-pay="pts" ${Wallet.get() >= pts ? '' : 'disabled'}>⭐ Game points</button>`;
    K.openUi(`<div class="lf-top"><h3>✈️ Book a flight</h3><span class="pill">${K.fmt$(K.S.cash)} · ⭐ ${Wallet.get().toLocaleString()}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:460px">${html}</div>`);
    wireBook(from, () => bookUi(intro, from));
  }
  function wireBook(from, re) {
    document.querySelectorAll('#rp-win [data-to]').forEach((b) => (b.onclick = () => { A.pick.to = b.dataset.to; re(); }));
    document.querySelectorAll('#rp-win [data-cls]').forEach((b) => (b.onclick = () => { A.pick.cls = b.dataset.cls; re(); }));
    document.querySelectorAll('#rp-win [data-pay]').forEach((b) => (b.onclick = () => {
      if (!document.querySelector('#rp-win .lf-top h3') || !/Book a flight/.test(document.querySelector('#rp-win .lf-top h3').textContent)) A.counter = false;
      const how = b.dataset.pay, p = priceOf(from, A.pick.to, A.pick.cls), to = placeOf(A.pick.to);
      if (how === 'pts') { if (!Wallet.spend(p * 3)) return K.say('Not enough game points.'); K.txn(`✈️ Flight to ${to.name} · ⭐ ${p * 3} points`, 0); }
      else if (how === 'upi') { if (K.S.cash < p) return; K.S.cash -= p; K.txn(`✈️ LSP Air to ${to.name}`, -p); }
      else { if (K.cardLeft() < p) return; K.S.card.due += p; K.txn(`✈️ LSP Air to ${to.name} · 💳 credit card`, -p); }
      const now = K.absMin(), row = A.pick.cls === 'first' ? 1 + Math.floor(Math.random() * 3) : A.pick.cls === 'business' ? 4 + Math.floor(Math.random() * 6) : 12 + Math.floor(Math.random() * 25);
      K.S.ticket = { no: 'LSP' + (100 + Math.floor(Math.random() * 899)), from, to: to.id, cls: A.pick.cls, gate: 1 + Math.floor(Math.random() * GATES), seat: row + 'ABCDEF'[Math.floor(Math.random() * 6)], boardAt: now + (from === 'city' ? 45 : 8), departAt: now + (from === 'city' ? 150 : 90), checked: false, used: false };
      K.save(); K.hud(); L.sfx && L.sfx('cash'); drawBoard();
      const t = K.S.ticket;
      if (A.counter && from === 'city') { A.counter = false; return checkinDesk(); }
      K.notify(from === 'city' ? `🎫 Ticket ${t.no} to ${to.name} booked. Gate ${t.gate}, boarding ${clock(t.boardAt)}. At the airport: check-in line → security → Gate ${t.gate}.` : `🎫 Ticket ${t.no} to ${to.name} booked. Boarding at the island airport desk at ${clock(t.boardAt)}.`);
      K.openPhone('flights');
    }));
  }
  const flightsApp = {
    id: 'flights', icon: '✈️', label: 'Flights',
    html() {
      const t = T_();
      const mine = t && !t.used ? `<p class="muted" style="margin:0 0 6px">🎫 Your boarding pass</p>${passHtml(t)}${t.from === 'city' ? `<button class="btn ghost" data-gate="1" style="margin-top:6px">📍 GPS to ${t.checked ? 'Gate ' + t.gate : 'the airport'}</button>` : ''}<hr style="border:0;border-top:1px solid #e1e6ef;margin:12px 0">` : '';
      return `${mine}<div id="fl-book"></div>`;
    },
    wire() {
      const t = T_(), from = A.loc || 'city', dests = [CITY_AP, ...ISLANDS].filter((p) => p.id !== from), pick = A.pick || (A.pick = { to: dests[0].id, cls: 'economy' }); if (!dests.some((d) => d.id === pick.to)) pick.to = dests[0].id;
      const p = priceOf(from, pick.to, pick.cls), box = document.querySelector('#fl-book');
      if (box) box.innerHTML = `<p class="muted" style="margin:0 0 6px">Book a flight from ${placeOf(from).name}</p>${dests.map((d) => `<button class="rp-row" data-to="${d.id}" style="width:100%;border:${pick.to === d.id ? '2px solid #2f6bff' : '0'};cursor:pointer;text-align:left"><span style="font-size:22px">${d.icon}</span><b style="flex:1">${d.name}</b><span class="muted">${K.fmt$(priceOf(from, d.id, 'economy'))}+</span></button>`).join('')}<div class="rp-cats" style="margin:8px 0">${CLASSES.map(([id, n]) => `<button data-cls="${id}" class="${pick.cls === id ? 'on' : ''}">${n}</button>`).join('')}</div><p><b>${K.fmt$(p)}</b> or <b>⭐ ${(p * 3).toLocaleString()}</b></p><button class="btn primary" data-pay="upi" ${K.S.cash >= p ? '' : 'disabled'}>📲 LSP UPI</button> <button class="btn ghost" data-pay="card" ${K.cardLeft() >= p ? '' : 'disabled'}>💳 Card</button> <button class="btn gold" data-pay="pts" ${Wallet.get() >= p * 3 ? '' : 'disabled'}>⭐ Points</button>`;
      wireBook(from, () => K.openPhone('flights'));
      const g = document.querySelector('#rp-win [data-gate]'); if (g) g.onclick = () => K.setGps(t.checked ? { name: `Gate ${t.gate}`, icon: '🛫', x: gateX(t.gate), z: GATE_Z } : { name: 'LSP Airport', icon: '✈️', x: 0, z: 278 });
    },
  };

  /* ---------- flying as a passenger ---------- */
  function route(fromId, toId, gate) {
    const P = [], rwF = isRw(fromId), rwT = isRw(toId), fr = placeOf(fromId), to = placeOf(toId);
    const east = fromId === 'city' && gateX(gate) > -30; // take off away from the gate side
    if (fromId === 'city') { const gx = gateX(gate); P.push({ x: gx, z: 362, y: 0, sp: 0 }, { x: gx, z: 392, y: 0, sp: 3, rev: true, face: east ? Math.PI / 2 : -Math.PI / 2 }, { x: east ? rwF.x1 - 15 : rwF.x0 + 15, z: 405, y: 0, sp: 16 }, { x: east ? rwF.x1 - 5 : rwF.x0 + 5, z: rwF.z, y: 0, sp: 8 }); }
    else P.push({ x: fr.x, z: fr.z + 62, y: 0, sp: 0 }, { x: rwF.x0 + 10, z: rwF.z - 6, y: 0, sp: 12 }, { x: rwF.x0 + 4, z: rwF.z, y: 0, sp: 6 });
    const dir = fromId === 'city' && east ? -1 : 1, start = P[P.length - 1];
    P.push({ x: start.x + dir * 150, z: rwF.z, y: 0, sp: 75, roll: true }, { x: start.x + dir * 400, z: rwF.z, y: 170, sp: 120 });
    // cruise
    const mid = { x: (fr.x + to.x) / 2, z: (Math.max(fr.z, 430) + to.z) / 2 };
    P.push({ x: mid.x, z: mid.z, y: 380, sp: 260 });
    // approach the destination runway from the west, land, roll out, taxi in
    if (toId === 'city') P.push({ x: rwT.x0 - 1000, z: rwT.z, y: 260, sp: 160 }, { x: rwT.x0 - 60, z: rwT.z, y: 14, sp: 75 });
    else P.push({ x: rwT.x0 - 900, z: rwT.z, y: 170, sp: 160 }, { x: rwT.x0 - 260, z: rwT.z, y: 40, sp: 80 });
    P.push( { x: rwT.x0 + 10, z: rwT.z, y: 0, sp: 62, touch: true }, { x: rwT.x0 + 150, z: rwT.z, y: 0, sp: 10 });
    if (toId === 'city') P.push({ x: rwT.x0 + 160, z: 405, y: 0, sp: 10 }, { x: gateX(50), z: 405, y: 0, sp: 10 }, { x: gateX(50), z: 364, y: 0, sp: 4, end: true });
    else P.push({ x: to.x, z: to.z + 64, y: 0, sp: 8, end: true });
    return P;
  }
  function takeoff(t) {
    const F = E.getF(); K.stopAct(); K.closeUi(); K.setGps(null);
    A.mode = 'fly'; A.fl = { t, path: route(t.from, t.to, t.gate), i: 1, x: 0, y: 0, z: 0, h: 0, sp: 0, vy: 0, roll: 0, time: 0 };
    const p0 = A.fl.path[0]; Object.assign(A.fl, { x: p0.x, z: p0.z, y: 0, h: t.from === 'city' ? Math.PI : Math.PI / 2 });
    A.plane.visible = true; F.m.visible = false; setBound(null);
    document.querySelector('#air-hud').hidden = false; document.querySelector('#air-btns [data-ab="skip"]').hidden = false; document.querySelector('#air-btns [data-ab="view"]').hidden = false;
    document.querySelectorAll('#air-btns [data-ab="up"],#air-btns [data-ab="down"]').forEach((b) => (b.hidden = true));
    clouds(placeOf(t.from), placeOf(t.to));
    fade(() => {}, 300);
    K.say(`🧑‍✈️ "Welcome aboard ${t.no} to ${placeOf(t.to).name}. Please fasten your seatbelt." · V: window seat`, 4500);
  }
  function clouds(a, b) {
    const T = E.T; if (A.cloud) E.scene.remove(A.cloud); const g = new T.Group(), m = E.M('#ffffff', { roughness: 1, flatShading: true });
    const geo = new T.IcosahedronGeometry(1, 1);
    for (let k = 0; k < 70; k++) { const f = Math.random(), x = a.x + (b.x - a.x) * f + rnd(-400, 400), z = Math.max(a.z, 430) + (b.z - Math.max(a.z, 430)) * f + rnd(-300, 300); const c = new T.Mesh(geo, m); c.scale.set(rnd(25, 60), rnd(8, 16), rnd(20, 45)); c.position.set(x, rnd(260, 480), z); g.add(c); }
    E.scene.add(g); A.cloud = g;
  }
  function tickFlight(dt) {
    const f = A.fl, P = f.path; f.time += dt;
    const w = P[f.i]; if (!w) return land();
    const dx = w.x - f.x, dz = w.z - f.z, d = Math.hypot(dx, dz);
    f.sp += K.clamp(w.sp - f.sp, -18 * dt, (w.roll ? 9 : 22) * dt);
    if (w.rev) { f.z += Math.sign(dz) * Math.min(Math.abs(dz), 3 * dt); if (w.face != null && Math.abs(dz) < 18) f.h += K.wrapA(w.face - f.h) * Math.min(1, dt * 0.5); if (Math.abs(dz) < 0.3) { if (w.face != null) f.h = w.face; f.i++; } }
    else {
      const want = Math.atan2(dx, dz), turn = K.clamp(K.wrapA(want - f.h), -(f.y > 2 ? 0.45 : 0.9) * dt, (f.y > 2 ? 0.45 : 0.9) * dt);
      f.h += turn; f.roll += (-turn / dt * 0.6 - f.roll) * Math.min(1, dt * 2);
      f.x += Math.sin(f.h) * f.sp * dt; f.z += Math.cos(f.h) * f.sp * dt;
      const ty = w.y, climb = K.clamp((ty - f.y) / Math.max(1, d / Math.max(f.sp, 1)), -14, 22);
      if (!(w.roll && f.sp < 62)) f.vy += (climb - f.vy) * Math.min(1, dt * 1.5); else f.vy = 0;
      f.y = Math.max(0, f.y + f.vy * dt);
      if (d < Math.max(6, f.sp * 0.6)) { if (w.touch) { f.y = 0; f.vy = 0; L.sfx && L.sfx('land'); K.say('🛬 Touchdown!', 1500); } if (P[f.i] === P[1] || w.roll) L.sfx && L.sfx('whoosh'); f.i++; if (w.end) return land(); }
    }
    A.plane.position.set(f.x, f.y + 0.05, f.z); A.plane.rotation.set(-Math.atan2(f.vy, Math.max(f.sp, 5)), f.h, f.y > 1 ? f.roll : 0, 'YXZ');
    const blink = Math.floor(performance.now() / 500) % 2 === 0; A.plane.userData.lights.forEach((l) => (l.visible = blink));
    const F = E.getF(); F.x = f.x; F.z = f.z;
    const kmh = Math.round(f.sp * 3.6), alt = Math.round(f.y * 3.28), to = placeOf(f.t.to), left = Math.round(Math.hypot(to.x - f.x, to.z - f.z));
    document.querySelector('#air-read').textContent = `${f.t.no} · ${placeOf(f.t.from).name} → ${to.name}\n${kmh} km/h · ${alt.toLocaleString()} ft · ${left > 1000 ? (left / 1000).toFixed(1) + ' km' : left + ' m'} to go`;
    document.querySelector('#air-help').textContent = f.y < 1 && f.i < 4 ? 'Taxiing to the runway…' : f.y < 1 && f.sp > 30 ? 'Full power… takeoff!' : f.sp > 200 ? 'Cruising above the clouds ☁️' : f.y > 1 && f.vy < -2 ? 'Descending for landing' : 'V: window seat · ⏩ skip';
  }
  function skipFlight() { if (A.mode !== 'fly') return; fade(() => land(), 400); }
  function land() {
    const f = A.fl; if (!f) return; const t = f.t; t.flown = true; A.mode = null; A.fl = null;
    A.plane.visible = false; if (A.cloud) { E.scene.remove(A.cloud); A.cloud = null; }
    document.querySelector('#air-hud').hidden = true;
    const F = E.getF(); F.m.visible = true; F.vx = F.vz = 0;
    if (t.to === 'city') { A.loc = null; setBound('city'); F.x = 0; F.z = 296; F.h = Math.PI; K.say('🛬 Welcome to LSP City! The exit is straight ahead.', 3500); }
    else { const i = placeOf(t.to); A.loc = i.id; setBound(i.id); F.x = i.x; F.z = i.z + 56; F.h = Math.PI; K.say(`🏝️ Welcome to ${i.name}! ${i.desc} Book your flight back on your phone or at the airport desk.`, 5000); }
    K.save(); fade(() => {}, 500);
  }
  function setBound(where) {
    const B = E.BOUND, map = document.querySelector('#d-map');
    if (where === 'city') { Object.assign(B, OB); if (map) map.style.visibility = ''; }
    else if (where) { const i = placeOf(where); Object.assign(B, { x0: i.x - 126, x1: i.x + 126, z0: i.z - 126, z1: i.z + 126 }); if (map) map.style.visibility = 'hidden'; }
    else Object.assign(B, { x0: -6000, x1: 6000, z0: -3000, z1: 6000 });
  }
  function fade(mid, ms) { const el = document.querySelector('#air-fade'); el.hidden = false; requestAnimationFrame(() => el.classList.add('on')); setTimeout(() => { mid(); el.classList.remove('on'); setTimeout(() => (el.hidden = true), 520); }, ms); }

  /* ---------- islands ---------- */
  function buildIsland(I) {
    const T = E.T, g = new T.Group(); g.position.set(I.x, 0, I.z); E.scene.add(g); const V2 = K.adapter(g), Y0 = K.Y0;
    const sand = new T.Mesh(new T.CylinderGeometry(130, 150, 2.6, 48), E.M(I.sand, { roughness: 1 })); sand.position.y = -1.25; sand.receiveShadow = true; g.add(sand);
    const top = new T.Mesh(new T.CylinderGeometry(98, 104, 0.4, 40), E.M(I.grass, { roughness: 1 })); top.position.y = 0.02; top.receiveShadow = true; g.add(top);
    // runway, little terminal with a desk and a café
    const rw = new T.Mesh(new T.PlaneGeometry(200, 22), E.M('#3d4046')); rw.rotation.x = -Math.PI / 2; rw.position.set(0, 0.25, 75); g.add(rw);
    for (let x = -90; x < 90; x += 12) V2.box(6, 0.02, 0.6, '#f2f2f2', x, 0.27, 75, g, false);
    V2.box(16, 0.2, 10, '#e9edf4', 0, 0.1, 56, g, false);
    for (const [x, z] of [[-7.5, 52], [7.5, 52], [-7.5, 60], [7.5, 60]]) { V2.box(0.3, 4, 0.3, '#ffffff', x, 2, z, g); E.addCol(I.x + x - 0.2, I.z + z - 0.2, I.x + x + 0.2, I.z + z + 0.2); }
    V2.box(17, 0.4, 10, I.theme === 'snow' ? '#b5533c' : '#2f6bff', 0, 4.2, 56, g);
    const sg = V2.sprite(`${I.icon} ${I.name} Airport`, 8, 1.2, '#16203d', '#fff'); sg.position.set(0, 6, 56);
    V2.box(4, 1.1, 1, '#ffb31a', -3, Y0 + 0.55, 53, g, false); E.addCol(I.x - 5, I.z + 52.5, I.x - 1, I.z + 53.5);
    const ag = E.person('#2f6bff', '#2d3a5c', '#c68642'); ag.position.set(-3, Y0, 52); g.add(ag);
    K.obj({ x: I.x - 3, z: I.z + 54.4, r: 1.8, label: () => islandDeskLabel(I), use: () => islandDesk(I) }, 0, 0);
    V2.box(3, 1.1, 1, '#6b4a2f', 4, Y0 + 0.55, 53, g, false); E.addCol(I.x + 2.5, I.z + 52.5, I.x + 5.5, I.z + 53.5);
    K.obj({ x: I.x + 4, z: I.z + 54.4, r: 1.6, label: () => '🥥 Island snack bar · scan to pay', use: () => menu(`${I.icon} Snack bar`, I.theme === 'snow' ? [['☕', 'Hot cocoa', 3, { energy: 8, fun: 6 }], ['🥧', 'Apple pie', 5, { hunger: 22 }], ['🍲', 'Hot soup', 6, { hunger: 30 }]] : [['🥥', 'Coconut water', 4, { energy: 10 }], ['🍍', 'Pineapple', 3, { hunger: 14 }], ['🐟', 'Grilled fish', 9, { hunger: 35 }], ['🍧', 'Shaved ice', 3, { fun: 8 }]]) }, 0, 0);
    const tree = (x, z, s = 1) => {
      if (I.theme === 'snow') { V2.cyl(0.3, 0.4, 2 * s, '#6b4a2f', x, s, z, g, 8); const c = new T.Mesh(new T.ConeGeometry(2.2 * s, 5 * s, 8), E.M('#2f5a3a', { flatShading: true })); c.position.set(x, 4 * s, z); g.add(c); const cap = new T.Mesh(new T.ConeGeometry(1.1 * s, 1.8 * s, 8), E.M('#ffffff')); cap.position.set(x, 5.9 * s, z); g.add(cap); }
      else if (I.theme === 'jungle') { V2.cyl(0.4 * s, 0.55 * s, 6 * s, '#5a3d24', x, 3 * s, z, g, 8); const c = new T.Mesh(new T.IcosahedronGeometry(3 * s, 0), E.M('#2d6b2a', { flatShading: true })); c.position.set(x, 7 * s, z); g.add(c); }
      else { const tr = V2.cyl(0.25, 0.35, 6 * s, '#8b6b4a', x, 3 * s, z, g, 8); tr.rotation.z = rnd(-0.15, 0.15); for (let k = 0; k < 6; k++) { const l = V2.box(3.2 * s, 0.1, 0.8 * s, '#3f9a3a', x + Math.cos((k / 6) * Math.PI * 2) * 1.4 * s, 6 * s, z + Math.sin((k / 6) * Math.PI * 2) * 1.4 * s, g, false); l.rotation.y = -(k / 6) * Math.PI * 2; l.rotation.z = -0.35; } }
      E.addCol(I.x + x - 0.4, I.z + z - 0.4, I.x + x + 0.4, I.z + z + 0.4);
    };
    for (let k = 0; k < (I.theme === 'jungle' ? 60 : 28); k++) { const a = Math.random() * Math.PI * 2, r = rnd(20, 95), x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 40 && z < 90) continue; if (I.theme === 'volcano' && Math.hypot(x, z + 25) < 50) continue; tree(x, z, rnd(0.8, 1.3)); }
    // the theme
    let chest = [0, -60];
    if (I.theme === 'palm') {
      for (let k = 0; k < 4; k++) { const x = -40 + k * 14; V2.box(5, 3, 5, '#d9b58a', x, 1.5, -88, g); const r = new T.Mesh(new T.ConeGeometry(4.4, 2.4, 4), E.M('#b5533c')); r.rotation.y = Math.PI / 4; r.position.set(x, 4.2, -88); g.add(r); E.addCol(I.x + x - 2.5, I.z - 90.5, I.x + x + 2.5, I.z - 85.5); }
      for (let k = 0; k < 6; k++) { const x = -30 + k * 10; V2.box(0.9, 0.3, 2.2, '#ffffff', x, 0.4, 104, g, false); V2.box(3, 0.1, 3, ['#ff4d8b', '#ffd23f', '#14c79a'][k % 3], x, 3.2, 104, g, false); V2.cyl(0.05, 0.05, 3, '#ffffff', x, 1.6, 104, g, 6); }
      K.obj({ x: I.x, z: I.z + 102, r: 12, label: () => '🏖️ Lie on a beach lounger', use: () => K.activity('relax', 'Sunbathing on the beach', 10, { fun: 8, energy: 5 }) }, 0, 0);
      chest = [62, -40];
    } else if (I.theme === 'volcano') {
      const v = new T.Mesh(new T.CylinderGeometry(6, 48, 60, 24, 1, true), E.M('#4a3b35', { flatShading: true })); v.position.set(0, 30, -25); g.add(v);
      const lava = new T.Mesh(new T.CylinderGeometry(6, 6, 0.5, 24), E.M('#ff4d00', { emissive: '#ff3300', emissiveIntensity: 2 })); lava.position.set(0, 58, -25); g.add(lava); A.lava = A.lava || []; A.lava.push({ x: I.x, z: I.z - 25 });
      E.addCol(I.x - 40, I.z - 65, I.x + 40, I.z + 15);
      V2.cyl(7, 7, 0.4, E.M('#7fd8ff', { emissive: '#2fa8ff', emissiveIntensity: 0.4 }), 40, 0.2, 30, g, 24);
      K.obj({ x: I.x + 40, z: I.z + 30, r: 8, label: () => '♨️ Soak in the hot spring', use: () => K.activity('spa', 'Soaking in the hot spring', 10, { hygiene: 12, fun: 8, energy: 6 }) }, 0, 0);
      chest = [-55, 35];
    } else if (I.theme === 'snow') {
      const sm = new T.Group(); sm.position.set(20, 0, 30); g.add(sm); const s2 = K.adapter(sm); [[1.2, 0.9], [0.9, 2.3], [0.6, 3.4]].forEach(([r, y]) => { const b = new T.Mesh(new T.SphereGeometry(r, 16, 12), E.M('#ffffff')); b.position.y = y; sm.add(b); }); s2.box(0.12, 0.12, 0.5, '#ff8a3d', 0, 3.4, 0.6, sm, false);
      V2.box(10, 4, 8, '#7a5c3a', -40, 2, -40, g); const r = new T.Mesh(new T.ConeGeometry(7.5, 3, 4), E.M('#ffffff')); r.rotation.y = Math.PI / 4; r.position.set(-40, 5.4, -40); g.add(r); E.addCol(I.x - 45, I.z - 44, I.x - 35, I.z - 36);
      K.obj({ x: I.x - 40, z: I.z - 35, r: 2.5, label: () => '🔥 Warm up by the cabin fire', use: () => K.activity('relax', 'Warming up by the fire', 8, { fun: 6, energy: 8 }) }, 0, 0);
      K.obj({ x: I.x + 20, z: I.z + 32, r: 2.5, label: () => '⛄ Build a snowman', use: () => K.activity('play', 'Playing in the snow', 6, { fun: 12, energy: -2 }) }, 0, 0);
      chest = [60, -55];
    } else if (I.theme === 'pirate') {
      const ship = new T.Group(); ship.position.set(0, 0, -112); ship.rotation.y = 0.3; g.add(ship); const s2 = K.adapter(ship);
      s2.box(9, 4, 30, '#5a3d24', 0, 1.5, 0, ship); s2.box(9.4, 0.6, 30.4, '#3a2716', 0, 3.6, 0, ship);
      for (const z of [-8, 3, 11]) { s2.cyl(0.35, 0.4, 16, '#3a2716', 0, 11, z, ship, 8); s2.box(8, 6, 0.2, '#f2ead6', 0, 12, z + 0.3, ship, false); }
      const fl = E.textSprite('☠️', null, '#000', 2.4, 2.4, '400 360px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'); fl.position.set(0, 20, 3); ship.add(fl);
      E.addCol(I.x - 8, I.z - 128, I.x + 8, I.z - 96);
      K.obj({ x: I.x + 6, z: I.z - 95, r: 4, label: () => '🏴‍☠️ Explore the pirate ship', use: () => K.activity('play', 'Exploring the old pirate ship', 6, { fun: 12 }) }, 0, 0);
      for (let k = 0; k < 4; k++) { const x = rnd(-70, 70), z = rnd(-70, 30); V2.box(1.6, 0.04, 0.3, '#b3162a', x, 0.24, z, g, false).rotation.y = 0.785; V2.box(1.6, 0.04, 0.3, '#b3162a', x, 0.24, z, g, false).rotation.y = -0.785; }
      chest = [-48, -30];
    } else if (I.theme === 'jungle') {
      for (let k = 0; k < 6; k++) V2.box(30 - k * 4.5, 3, 30 - k * 4.5, '#8f8a73', 0, 1.5 + k * 3, -40, g);
      E.addCol(I.x - 15, I.z - 55, I.x + 15, I.z - 25);
      K.obj({ x: I.x, z: I.z - 23, r: 4, label: () => '🛕 Explore the ancient temple', use: () => K.activity('play', 'Exploring the ancient temple', 6, { fun: 12 }) }, 0, 0);
      chest = [0, -20];
    }
    // daily treasure
    const ch = new T.Group(); ch.position.set(chest[0], 0.2, chest[1]); g.add(ch); { const c2 = K.adapter(ch); c2.box(1.2, 0.8, 0.8, '#7a4a1f', 0, 0.4, 0, ch); c2.box(1.25, 0.15, 0.85, E.M('#d4af37', { metalness: 0.7 }), 0, 0.82, 0, ch, false); }
    K.obj({ x: I.x + chest[0], z: I.z + chest[1] + 1, r: 1.6, when: () => ((K.S.trez || {})[I.id] || 0) !== K.S.day, label: () => '💰 Open the treasure chest', use: () => { (K.S.trez = K.S.trez || {})[I.id] = K.S.day; const n = 300 + Math.floor(Math.random() * 700); K.receive(n, `💰 Treasure on ${I.name}`); L.sfx && L.sfx('win'); K.save(); } }, 0, 0);
    for (let k = 0; k < 5; k++) { const p = E.person(['#ff4d8b', '#14c79a', '#ffd23f', '#8a5cff', '#ff8a3d'][k], '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][k % 3], k % 2 ? '#ffffff' : undefined); p.position.set(rnd(-30, 30), Y0, rnd(20, 45)); p.rotation.y = rnd(0, 6); g.add(p); }
  }
  function islandDeskLabel(I) {
    const t = T_(); if (t && !t.used && t.from === I.id) { const now = K.absMin(); return now >= t.departAt ? '✈️ Your flight left. Book a new one' : now >= t.boardAt ? `✈️ BOARDING: ${t.no} to ${placeOf(t.to).name}` : `✈️ ${t.no} boards at ${clock(t.boardAt)}`; }
    return '✈️ LSP Air desk: book a flight';
  }
  function islandDesk(I) {
    const t = T_(), now = K.absMin();
    if (t && !t.used && t.from === I.id) {
      if (now >= t.departAt) { t.used = true; K.save(); return bookUi('😢 "That flight has left. Want another one?"', I.id); }
      if (now < t.boardAt) return K.say(`⏳ "Boarding opens at ${clock(t.boardAt)}. Relax on the island!"`, 3000);
      t.used = true; K.save(); return takeoff(t);
    }
    bookUi(`🧑‍✈️ "Welcome to ${I.name} airport. Where would you like to go?"`, I.id);
  }

  /* ---------- private jets: you fly ---------- */
  function jetDesk() {
    const j = K.S.jet || {};
    K.openUi(`<div class="lf-top"><h3>🛩️ Private jets</h3><span class="pill">${K.fmt$(K.S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:460px"><div class="lf-card"><span class="ic">🛩️</span><b>LSP Falcon 9X</b><p>Fly it yourself to any island and back. Land on a runway: slow down, line up and touch down gently.</p><p class="muted">W/S throttle · A/D turn · Space climb · X descend · E get out after landing</p>${j.own ? '<button class="btn primary" data-fly="1">🛫 Fly your jet</button>' : `<button class="btn primary" data-rent="1" ${K.canPay(800) ? '' : 'disabled'}>Rent for one trip · $800</button> <button class="btn gold" data-buy="1" ${K.canPay(250000) ? '' : 'disabled'}>Buy · $250,000</button>`}</div></div>`);
    const q = (s) => document.querySelector('#rp-win ' + s);
    if (q('[data-fly]')) q('[data-fly]').onclick = () => { K.closeUi(); startJet(); };
    if (q('[data-rent]')) q('[data-rent]').onclick = () => { if (!K.pay(800, '🛩️ Private jet rental')) return; K.S.jet = { rent: true }; K.save(); K.closeUi(); startJet(); };
    if (q('[data-buy]')) q('[data-buy]').onclick = () => { if (!K.pay(250000, '🛩️ LSP Falcon 9X')) return; K.S.jet = { own: true }; K.save(); K.closeUi(); K.notify('🛩️ You own a private jet! It lives in the airport hangar.'); startJet(); };
  }
  function startJet() {
    const F = E.getF(), m = A.jet; K.stopAct(); K.setGps(null);
    A.mode = 'jet'; A.J = { x: m.position.x, y: 0, z: m.position.z, h: m.rotation.y, sp: 0, vy: 0, thr: 0, roll: 0, ground: true };
    F.m.visible = false; setBound(null);
    document.querySelector('#air-hud').hidden = false; document.querySelectorAll('#air-btns [data-ab]').forEach((b) => (b.hidden = b.dataset.ab === 'skip' || b.dataset.ab === 'view'));
    K.say('🛩️ Taxi out of the hangar to the runway. W throttle · A/D steer · at 150 km/h hold Space to take off.', 5000);
  }
  function onRunwayish(x, z) {
    if (z > 236 && z < 470 && x > -236 && x < 215) return true; // the whole airport is paved enough
    for (const i of ISLANDS) if (Math.abs(x - i.x) < 104 && Math.abs(z - (i.z + 75)) < 14) return true;
    return false;
  }
  const overLand = (x, z) => (Math.abs(x) < 800 && Math.abs(z) < 800) || ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < 128);
  function tickJet(dt) {
    const J = A.J, Kk = E.K, TIN = E.TIN;
    const up = Kk.KeyW || Kk.ArrowUp || TIN.gas, dn = Kk.KeyS || Kk.ArrowDown || TIN.brake, st = (Kk.KeyD || Kk.ArrowRight || TIN.right ? 1 : 0) - (Kk.KeyA || Kk.ArrowLeft || TIN.left ? 1 : 0);
    const climb = Kk.Space || Kk.KeyQ || A.up, desc = Kk.KeyX || Kk.KeyZ || A.down;
    J.thr = K.clamp(J.thr + ((up ? 1 : 0) - (dn ? 1 : 0)) * 0.6 * dt, 0, 1);
    J.sp += (J.thr * 105 - J.sp) * 0.35 * dt; if (J.ground && dn) J.sp = Math.max(0, J.sp - 14 * dt); if (J.ground && !up && J.thr === 0) J.sp = Math.max(0, J.sp - 4 * dt);
    if (J.ground) J.h -= st * 0.9 * dt * Math.min(1, J.sp / 6);
    else { J.h -= st * 0.5 * dt; J.roll += (st * 0.55 - J.roll) * Math.min(1, dt * 2.5); }
    const lift = J.sp > 42;
    let want = (climb ? 1 : 0) - (desc ? 1 : 0); want = want * J.sp * 0.22; if (!lift && !J.ground) want = -10; if (J.ground && (!lift || want < 0)) want = 0;
    J.vy += (want - J.vy) * Math.min(1, dt * 1.4); J.y += J.vy * dt; if (J.y > 650) { J.y = 650; J.vy = Math.min(0, J.vy); }
    J.x += Math.sin(J.h) * J.sp * dt; J.z += Math.cos(J.h) * J.sp * dt;
    if (J.y <= 0) {
      if (!J.ground) {
        if (!overLand(J.x, J.z)) return crash('🌊 Splash! You came down in the sea.');
        if (J.vy < -9 || Math.abs(J.roll) > 0.5 || !onRunwayish(J.x, J.z)) return crash('💥 Hard landing! Land slowly on a runway next time.');
        L.sfx && L.sfx('land'); K.say('🛬 Nice landing! Slow down, then press E to get out.', 3000);
      }
      J.y = 0; J.vy = 0; J.ground = true; J.roll = 0;
      if (!overLand(J.x, J.z)) return crash('🌊 You rolled into the sea!');
      if (J.sp > 20 && !onRunwayish(J.x, J.z)) return crash('💥 You crashed off the runway!');
    } else if (J.y > 0.6) J.ground = false;
    // buildings in the city
    if (J.y < 100 && J.x > -236 && J.x < 236 && J.z > -236 && J.z < 236) for (const b of E.CITY_BLDGS) if (Math.abs(J.x - b.x) < b.w / 2 + 2 && Math.abs(J.z - b.z) < b.d / 2 + 2 && J.y < b.h + 1) return crash('💥 You flew into a building!');
    const rr = Math.hypot(J.x, J.z); if (!J.ground && rr > 565 && rr < 655 && J.y < 55) return crash('⛰️ You flew into the mountains!');
    if (A.lava) for (const v of A.lava) if (Math.hypot(J.x - v.x, J.z - v.z) < 45 && J.y < 62) return crash('🌋 You flew into the volcano!');
    const m = A.jet; m.position.set(J.x, J.y + 0.05, J.z); m.rotation.set(-Math.atan2(J.vy, Math.max(J.sp, 5)), J.h, J.roll, 'YXZ');
    const F = E.getF(); F.x = J.x; F.z = J.z;
    // nearest runway readout
    const rws = [{ n: 'LSP City', ...isRw('city') }, ...ISLANDS.map((i) => ({ n: i.name, ...isRw(i.id) }))];
    let best = null; for (const r of rws) { const cx = (r.x0 + r.x1) / 2, d = Math.hypot(cx - J.x, r.z - J.z); if (!best || d < best.d) best = { d, r, cx }; }
    const rel = K.wrapA(Math.atan2(best.cx - J.x, best.r.z - J.z) - J.h), arrows = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'], idx = ((Math.round(-rel / (Math.PI / 4)) % 8) + 8) % 8;
    document.querySelector('#air-read').textContent = `${Math.round(J.sp * 3.6)} km/h · ${Math.round(J.y * 3.28).toLocaleString()} ft · throttle ${Math.round(J.thr * 100)}%\n${arrows[idx]} ${best.r.n} runway ${best.d > 1000 ? (best.d / 1000).toFixed(1) + ' km' : Math.round(best.d) + ' m'}`;
    document.querySelector('#air-help').textContent = !J.ground && rr > 430 && rr < 700 && J.y < 170 ? '⚠️ Mountains around the city: climb above 600 ft!' : J.ground ? (J.sp < 2 ? 'E: get out · W: throttle up' : lift ? 'Hold Space to take off!' : 'Speed up to 150 km/h to take off') : 'Space climb · X descend · A/D turn · land on a runway';
  }
  function crash(msg) {
    const J = A.J; E.wreckFx(J.x, J.z); L.sfx && L.sfx('explode'); E.G.shake = 1;
    const own = K.S.jet && K.S.jet.own; if (!own) K.S.jet = null; else K.pay(Math.min(5000, Math.max(0, K.S.cash)), '🛠️ Jet repair');
    K.notify(`${msg} ${own ? 'Your jet was towed back to the hangar (repair $5,000).' : 'The rental company took the jet back.'} The rescue team took you to the airport.`);
    endJet(true);
  }
  function endJet(reset) {
    const J = A.J, F = E.getF(), m = A.jet; A.mode = null; A.J = null; F.m.visible = true; F.vx = F.vz = 0;
    document.querySelector('#air-hud').hidden = true;
    if (reset) { m.position.set(150, 0.05, 306); m.rotation.set(0, 0, 0); F.x = 0; F.z = 278; F.h = Math.PI; A.loc = null; setBound('city'); K.save(); return; }
    const isl = ISLANDS.find((i) => Math.hypot(J.x - i.x, J.z - i.z) < 130);
    F.x = J.x + Math.cos(J.h) * 3.5; F.z = J.z - Math.sin(J.h) * 3.5; F.h = J.h;
    if (isl) { A.loc = isl.id; setBound(isl.id); K.say(`🏝️ Welcome to ${isl.name}!`, 3000); }
    else { A.loc = null; setBound('city'); if (K.S.jet && K.S.jet.rent && J.z > 236) { K.S.jet = null; m.position.set(150, 0.05, 306); m.rotation.set(0, 0, 0); K.say('🛩️ Rental returned. Thanks for flying with us!'); } }
    K.save();
  }

  /* ---------- the module ---------- */
  const AIR = {
    apps: [flightsApp],
    build,
    enter() { A.loc = null; setBound('city'); A.mode = null; A.line = null; A.lounge = 0; if (A.jet) { A.jet.position.set(150, 0.05, 306); A.jet.rotation.set(0, 0, 0); } if (A.plane) A.plane.visible = false; document.querySelector('#air-hud').hidden = true; if (K.S.jet && K.S.jet.rent) K.S.jet = null; },
    leave() { if (A.mode === 'jet') endJet(true); if (A.mode === 'fly') { A.mode = null; A.fl = null; A.plane.visible = false; } A.loc = null; setBound('city'); const F = E.getF(); if (F.m) F.m.visible = true; },
    blocked: () => !!A.mode || !!A.line,
    noCol: () => !!A.mode,
    foot(F) { if (A.mode) { F.y = A.mode === 'fly' ? A.fl.y : A.J.y; return true; } return false; },
    cam(camera, dt) {
      if (!A.mode) return false;
      const o = A.mode === 'fly' ? A.fl : A.J, fx = Math.sin(o.h), fz = Math.cos(o.h), D = AIR.d || (AIR.d = {});
      let want, look;
      if (A.mode === 'fly' && A.view) { // window seat: just behind the wing, looking out the left side
        const lx = Math.cos(o.h), lz = -Math.sin(o.h);
        want = { x: o.x + lx * 2.3 - fx * 3, y: o.y + 3.9, z: o.z + lz * 2.3 - fz * 3 }; look = { x: o.x + lx * 30 - fx * 6, y: o.y + 1, z: o.z + lz * 30 - fz * 6 };
        D.cp = { ...want }; camera.position.set(want.x, want.y, want.z); camera.lookAt(look.x, look.y, look.z); return true;
      }
      const far = A.mode === 'fly' ? (o.y > 50 ? 60 : 42) : o.y > 5 ? 24 : 18, high = A.mode === 'fly' ? (o.y > 50 ? 16 : 11) : 6.5;
      want = { x: o.x - fx * far, y: Math.max(1.5, o.y + high), z: o.z - fz * far }; look = { x: o.x + fx * 10, y: o.y + 2, z: o.z + fz * 10 };
      if (!D.cp || D.m !== A.mode) { D.cp = { ...want }; D.m = A.mode; }
      const k = Math.min(1, dt * 3.5); for (const a of ['x', 'y', 'z']) D.cp[a] += (want[a] - D.cp[a]) * k;
      camera.position.set(D.cp.x, D.cp.y, D.cp.z); camera.lookAt(look.x, look.y, look.z); return true;
    },
    tick(dt) {
      if (!K) return;
      tickQueue(dt);
      if (A.lounge > 0) { A.lounge -= dt; const F = E.getF(); if (A.lounge <= 0 && F.x > 46 && F.x < 60 && F.z > 289 && F.z < 326) { F.x = 44.4; F.z = 307.5; K.say('⏰ Your 5 minutes in the lounge are over.', 3000); } }
      if (A.mode === 'fly') tickFlight(dt); else if (A.mode === 'jet') tickJet(dt);
      // moving walkways in the concourse
      if (!A.mode && E.G.mode === 'foot') { const F = E.getF(); if (F.z > 330 && F.z < 346 && ((F.x > -195 && F.x < -8) || (F.x > 8 && F.x < 135))) { if (Math.abs(F.z - 336.5) < 1) F.x += 3 * dt; else if (Math.abs(F.z - 339.5) < 1) F.x -= 3 * dt; } }
      A.bt = (A.bt || 0) - dt; if (A.bt <= 0) { A.bt = 3; if (A.boardCv) drawBoard(); const t = T_(); if (t && !t.used && t.from === 'city' && !t.boardNote && K.absMin() >= t.boardAt) { t.boardNote = true; K.notify(`📢 Flight ${t.no} to ${placeOf(t.to).name} is now boarding at Gate ${t.gate}.`); } }
      // your plane waits at your gate
      const t = T_(); if (A.plane && !A.mode) { const show = t && !t.used && t.from === 'city'; A.plane.visible = !!show; if (show) { A.plane.position.set(gateX(t.gate), 0.05, 363); A.plane.rotation.set(0, Math.PI, 0); } }
    },
    frame() {},
    use() { return false; },
    drawMap(g, R) { g.fillStyle = '#9aa3b5'; R(-60, 285, 60, 330); R(-200, 330, 140, 346); R(125, 288, 175, 326); g.fillStyle = '#34373d'; R(RUNWAY.x0, RUNWAY.z - 15, RUNWAY.x1, RUNWAY.z + 15); },
  };
  // getting out of a landed jet, stepping out of the line, and getting back in your jet
  function extraObjs() {
    const F = () => E.getF();
    const o1 = K.obj({ x: 0, z: 0, r: 8, when: () => { if (A.mode !== 'jet' || !A.J.ground || A.J.sp > 2) return false; o1.x = F().x; o1.z = F().z; return true; }, label: () => '🛬 Get out of the jet', use: () => endJet(false) }, 0, 0);
    const o2 = K.obj({ x: 0, z: 0, r: 3, when: () => { if (!A.line) return false; o2.x = F().x; o2.z = F().z; return true; }, label: () => `🧍 In line (${A.line.i} ahead) · step out`, use: () => { A.line = null; } }, 0, 0);
    const o3 = K.obj({ x: 0, z: 0, r: 7, when: () => { if (A.mode || !K.S.jet) return false; o3.x = A.jet.position.x; o3.z = A.jet.position.z; return true; }, label: () => '🛩️ Fly the private jet', use: startJet }, 0, 0);
  }
  const realBuild = AIR.build; AIR.build = (kit) => { realBuild(kit); extraObjs(); };
  window.LSPDriveAir = { _at: (id) => { A.loc = id; setBound(id); }, A, ISLANDS, startJet: () => startJet(), _book: (to, cls) => { A.pick = { to, cls: cls || 'economy' }; }, _skip: skipFlight, gateX };
  const hook = () => (window.LSPDriveRP ? window.LSPDriveRP.ext(AIR) : setTimeout(hook, 50)); hook();
})();
