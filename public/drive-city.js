/* LSP Drive · every building can be entered, the Mafia Tower, the Red Vipers Towers and rifle combat.
 * Plugs into drive-rp.js through LSPDriveRP.ext().
 *
 * Interiors are built when you walk in and thrown away when you walk out. While you are
 * inside, the building's own outer collider is switched off and this module keeps you
 * inside its walls instead, so every city block box becomes a real place with rooms.
 */
(function () {
  'use strict';
  const L = window.LSPG;
  let K = null, E = null;
  const H_IN = 4, FLOOR_TXT = (n) => (n ? `Floor ${n}` : 'Lobby');
  const TYPES = {
    office: { name: 'Office', icon: '🏢', wall: '#e8ecf2', floor: '#b9c3d1', trim: '#2f6bff' },
    apartments: { name: 'Apartments', icon: '🏠', wall: '#f3eadb', floor: '#a87a50', trim: '#b5533c' },
    shop: { name: '24/7 Shop', icon: '🏪', wall: '#eef6ff', floor: '#e9edf4', trim: '#14c79a' },
    diner: { name: 'Diner', icon: '🍔', wall: '#fff3e0', floor: '#d9b58a', trim: '#ff8a3d' },
    gym: { name: 'Gym', icon: '🏋️', wall: '#e9e4f5', floor: '#5c6270', trim: '#8a5cff' },
    clinic: { name: 'Clinic', icon: '🏥', wall: '#f4fbff', floor: '#dfe9f2', trim: '#ff4d5e' },
    den: { name: 'Red Vipers Den', icon: '🐍', wall: '#3a1418', floor: '#2b2b2b', trim: '#d61f30' },
    mafia: { name: 'Mafia Tower', icon: '🕴️', wall: '#1b1b1f', floor: '#2b2620', trim: '#d4af37' },
    viper: { name: 'Red Vipers Tower', icon: '🐍', wall: '#2a0d10', floor: '#1d1d1d', trim: '#d61f30' },
  };
  const CITY_MIX = ['office', 'apartments', 'office', 'shop', 'apartments', 'diner', 'office', 'gym', 'apartments', 'clinic', 'shop', 'office'];
  const RANKS = [['Recruit', 0, 100], ['Soldier', 150, 250], ['Enforcer', 400, 500], ['Capo', 800, 900], ['Underboss', 1400, 1500], ['CEO', 2200, 5000]];
  const VT_FLOORS = 5; // floors 0-4 have Vipers, floor 5 is the roof with the Viper King and the tower core
  const BLD = []; // every enterable place
  const IN = { b: null, floor: 0, g: null, objs: [], cols: [], en: [], fx: [], targets: [] };
  const CB = { armed: false, cool: 0, gun: null, flash: 0, ko: 0 };
  const VT = {}; // per Viper tower: { cleared: Set, planted, collapse }
  let S = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const M = () => K.S.mafia || (K.S.mafia = { member: false, xp: 0, kills: 0, floors: 0, destroyed: [], payDay: 0, gunLv: 1 });
  const rankOf = (xp) => { let r = 0; RANKS.forEach((q, i) => { if (xp >= q[1]) r = i; }); return r; };
  const destroyed = (id) => M().destroyed.includes(id);

  /* ---------- exterior: doors on every city building, plus the two special towers ---------- */
  function build(kit) {
    K = kit; E = kit.E; S = kit.S;
    const T = E.T;
    // signs share one texture per type so a hundred doors stay cheap
    const signMat = {}; const sign = (type, x, y, z) => { const t = TYPES[type]; if (!signMat[type]) signMat[type] = E.textSprite(`${t.icon} ${t.name}`, 'rgba(22,32,61,.85)', '#fff', 3.6, 0.7).material; const s = new T.Sprite(signMat[type]); s.scale.set(3.6, 0.7, 1); s.position.set(x, y, z); E.scene.add(s); return s; };
    const frames = [], glass = [], awn = {};
    E.CITY_BLDGS.forEach((c, i) => {
      const type = c.turf ? 'den' : CITY_MIX[(i * 7 + c.bx * 3 + c.bz) % CITY_MIX.length];
      const s = c.lz === 0 ? -1 : 1, fz = c.z + s * (c.d / 2);
      const b = { id: 'c' + i, x: c.x, z: c.z, w: c.w, d: c.d, h: c.h, s, type, floors: type === 'office' || type === 'apartments' ? Math.max(2, Math.min(20, Math.floor(c.h / 3.6))) : 1 };
      BLD.push(b);
      const f = new T.BoxGeometry(2.8, 3.1, 0.3); f.translate(c.x, 1.7, fz + s * 0.1); frames.push(f);
      const gl = new T.BoxGeometry(2.1, 2.6, 0.32); gl.translate(c.x, 1.47, fz + s * 0.12); glass.push(gl);
      const a = new T.BoxGeometry(3.6, 0.18, 1.3); a.translate(c.x, 3.35, fz + s * 0.7); (awn[TYPES[type].trim] = awn[TYPES[type].trim] || []).push(a);
      sign(type, c.x, 4.2, fz + s * 0.9);
      K.obj({ x: c.x, z: fz + s * 1.4, r: 1.7, when: () => !IN.b && E.G.mode === 'foot', label: () => `🚪 Enter ${TYPES[type].icon} ${TYPES[type].name}`, use: () => enter(b, 0) }, 0, 0);
    });
    const mk = (geos, mat) => { if (!geos.length) return; const m = new T.Mesh(E.merge(geos), mat); m.castShadow = false; m.receiveShadow = true; E.scene.add(m); };
    mk(frames, E.M('#2b3350')); mk(glass, E.M('#9fd3f2', { roughness: 0.05, metalness: 0.4, emissive: '#2a4d6e', emissiveIntensity: 0.5 }));
    for (const col in awn) mk(awn[col], E.M(col));
    buildMafiaTower(); buildViperTowers();
    // rifle and fire controls
    const scr = document.querySelector('#s-drive');
    scr.insertAdjacentHTML('beforeend', '<div id="cb-ui" hidden><button id="cb-fire">🔫 FIRE</button><button id="cb-gun" title="G">Put away</button></div><div id="cb-hit" hidden></div><div id="cb-cross" hidden>+</div>');
    const st = document.createElement('style');
    st.textContent = `#cb-ui{position:absolute;right:16px;bottom:120px;display:flex;flex-direction:column;gap:8px;z-index:30}#cb-ui[hidden]{display:none}#cb-ui button{border:0;border-radius:16px;font:700 15px system-ui;cursor:pointer;box-shadow:0 6px 20px #0006}#cb-fire{width:92px;height:92px;border-radius:50%!important;background:#d61f30;color:#fff;font-size:17px!important}#cb-gun{background:#16203dcc;color:#fff;padding:8px 10px}
#cb-hit{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 30px rgba(214,31,48,.75);z-index:25}#cb-hit[hidden]{display:none}
#cb-cross{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);color:#fff;font:700 30px system-ui;text-shadow:0 0 4px #000;pointer-events:none;z-index:24}#cb-cross[hidden]{display:none}`;
    document.head.appendChild(st);
    const fireBtn = document.querySelector('#cb-fire');
    fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); CB.hold = true; fire(); });
    addEventListener('pointerup', () => (CB.hold = false));
    document.querySelector('#cb-gun').onclick = () => toggleGun();
    document.querySelector('#drive-cv').addEventListener('pointerdown', (e) => { if (e.button === 0 && e.pointerType === 'mouse' && CB.armed && E.G.mode === 'foot' && !K.isUi()) { CB.hold = true; fire(); } });
    addEventListener('keydown', (e) => {
      if (!L.isActive('s-drive') || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
      if (e.code === 'KeyG' && !e.repeat) toggleGun();
      if (e.code === 'KeyR' && CB.armed) { CB.hold = true; fire(); }
    });
    addEventListener('keyup', (e) => { if (e.code === 'KeyR') CB.hold = false; });
    // map and GPS
    const [mx, mz] = E.lotC(...E.RP_LOTS.mafia);
    K.places.push({ name: 'Mafia Tower', icon: '🕴️', x: mx, z: mz + 14 });
    E.RP_LOTS.vipers.forEach((l, i) => { const [x, z] = E.lotC(...l); K.places.push({ name: `Red Vipers Tower ${i + 1}`, icon: '🐍', x, z: z + (l[3] === 0 ? -13 : 13) }); });
  }
  // a tall tower made of a solid box, a door, and its sign on top; the inside is built on entry
  function tower(id, type, [cx, cz], s, h, look) {
    const T = E.T, g = new T.Group(); g.position.set(cx, 0, cz); E.scene.add(g);
    const V2 = K.adapter(g), W = 24;
    const tex = E.canvasTex(256, 512, (c, w, hh) => { c.fillStyle = look.body; c.fillRect(0, 0, w, hh); for (let y = 0; y < 40; y++) for (let x = 0; x < 7; x++) { c.fillStyle = Math.random() < 0.5 ? look.lit : look.dark; c.fillRect(x * 36 + 6, y * 12.8 + 3, 24, 7); } }, [1, 2]);
    const body = V2.box(W, h, W, new T.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.4, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 }), 0, h / 2 + 0.16, 0, g);
    body.receiveShadow = true;
    V2.box(W + 0.6, 0.8, W + 0.6, look.trim, 0, 5.2, 0, g, false); V2.box(W + 0.6, 1.2, W + 0.6, look.trim, 0, h + 0.7, 0, g, false);
    const top = E.textSprite(look.title, look.titleBg, look.titleFg, 20, 3); top.position.set(0, h + 3.6, s * (W / 2 + 0.6)); g.add(top);
    V2.box(3.2, 3.4, 0.4, '#111111', 0, 1.85, s * (W / 2 + 0.1), g, false); V2.box(2.4, 2.8, 0.42, E.M(look.trim, { metalness: 0.6, roughness: 0.3 }), 0, 1.6, s * (W / 2 + 0.12), g, false);
    const sg = V2.sprite(look.door, 6, 1, look.titleBg, look.titleFg); sg.position.set(0, 6.4, s * (W / 2 + 1.2));
    E.addCol(cx - W / 2, cz - W / 2, cx + W / 2, cz + W / 2);
    const b = { id, x: cx, z: cz, w: W, d: W, h, s, type, floors: type === 'viper' ? VT_FLOORS + 1 : 3, g, body };
    BLD.push(b);
    K.obj({ x: cx, z: cz + s * (W / 2 + 1.4), r: 2, when: () => !IN.b && E.G.mode === 'foot' && !(type === 'viper' && destroyed(id)), label: () => (type === 'viper' ? (M().member ? '🐍 Storm the Red Vipers Tower' : '🐍 Red Vipers Tower · ⚠️ armed gang inside') : '🕴️ Enter the Mafia Tower'), use: () => enter(b, 0) }, 0, 0);
    return b;
  }
  function buildMafiaTower() {
    const l = E.RP_LOTS.mafia;
    tower('mafia', 'mafia', E.lotC(...l), l[3] === 0 ? -1 : 1, 96, { body: '#111114', lit: '#ffd56b', dark: '#2a2a33', trim: '#d4af37', title: 'MAFIA TOWER', titleBg: '#111114', titleFg: '#d4af37', door: '🕴️ Mafia Tower · members only' });
  }
  function buildViperTowers() {
    E.RP_LOTS.vipers.forEach((l, i) => {
      const b = tower('viper' + i, 'viper', E.lotC(...l), l[3] === 0 ? -1 : 1, 64 + i * 8, { body: '#1a0608', lit: '#ff3b3b', dark: '#2a1012', trim: '#d61f30', title: '🐍 RED VIPERS', titleBg: '#1a0608', titleFg: '#ff3b3b', door: `🐍 Red Vipers Tower ${i + 1}` });
      VT[b.id] = { cleared: new Set() };
      const rub = new E.T.Group(); rub.visible = false; E.scene.add(rub); b.rubble = rub;
      const V2 = K.adapter(rub);
      for (let k = 0; k < 26; k++) { const s = rnd(2, 6); const m = V2.box(s, rnd(1, 4), s, ['#2a1012', '#3a3a3a', '#555'][k % 3], b.x + rnd(-10, 10), rnd(0.5, 3), b.z + rnd(-10, 10), rub); m.rotation.set(rnd(-0.5, 0.5), rnd(0, 3), rnd(-0.5, 0.5)); }
      const sg = V2.sprite('💥 Destroyed by the Mafia', 7, 1.1, '#111114', '#d4af37'); sg.position.set(b.x, 7, b.z);
    });
  }
  function setTowerState() {
    for (const b of BLD) if (b.type === 'viper') { const d = destroyed(b.id); b.g.visible = !d; b.rubble.visible = d; b.g.position.y = 0; }
  }

  /* ---------- inside ---------- */
  // layouts use (u, v) with the door at v = +hd; the room group is turned so that matches the real door side
  function enter(b, floor) {
    if (IN.b && IN.b !== b) leaveRoom(); else clearRoom();
    const T = E.T, t = TYPES[b.type], hw = b.w / 2 - 0.3, hd = b.d / 2 - 0.3;
    const g = new T.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.s > 0 ? 0 : Math.PI; E.scene.add(g);
    Object.assign(IN, { b, floor, g, hw, hd, objs: [], cols: [], en: [], targets: [], V2: K.adapter(g) });
    const V2 = IN.V2, Y0 = K.Y0;
    const fl = new T.Mesh(new T.PlaneGeometry(hw * 2, hd * 2), E.M(t.floor, { roughness: 0.55 })); fl.rotation.x = -Math.PI / 2; fl.position.y = Y0 + 0.01; fl.receiveShadow = true; g.add(fl);
    const ce = new T.Mesh(new T.PlaneGeometry(hw * 2, hd * 2), E.M('#f4f1ea', { side: T.DoubleSide, emissive: '#ffffff', emissiveIntensity: b.type === 'den' || b.type === 'viper' ? 0.05 : 0.25 })); ce.rotation.x = Math.PI / 2; ce.position.y = Y0 + H_IN; g.add(ce);
    const wm = E.M(t.wall, { roughness: 0.9 });
    for (const [w, d, x, z] of [[hw * 2, 0.2, 0, -hd], [hw * 2, 0.2, 0, hd], [0.2, hd * 2, -hw, 0], [0.2, hd * 2, hw, 0]]) V2.box(w, H_IN, d, wm, x, Y0 + H_IN / 2, z, g, false);
    V2.box(hw * 2, 0.25, 0.25, E.M(t.trim), 0, Y0 + 0.12, -hd + 0.12, g, false);
    // light panels and windows
    for (let u = -hw + 3; u < hw - 2; u += 5) for (let v = -hd + 3; v < hd - 2; v += 5) V2.box(2, 0.05, 0.8, E.M('#ffffff', { emissive: '#fff6dd', emissiveIntensity: b.type === 'den' || b.type === 'viper' ? 0.4 : 1.2 }), u, Y0 + H_IN - 0.04, v, g, false);
    const win = E.M('#9fd3f2', { emissive: '#7fb8e0', emissiveIntensity: 0.7 });
    for (let v = -hd + 3; v < hd - 2; v += 4.5) { V2.box(0.06, 1.4, 2.4, win, -hw + 0.11, Y0 + 2.2, v, g, false); V2.box(0.06, 1.4, 2.4, win, hw - 0.11, Y0 + 2.2, v, g, false); }
    // the way out
    if (floor === 0) { V2.box(2.4, 2.7, 0.1, E.M('#16203d'), 0, Y0 + 1.35, hd - 0.12, g, false); V2.box(2, 2.5, 0.12, win, 0, Y0 + 1.3, hd - 0.14, g, false); room({ u: 0, v: hd - 0.9, r: 1.6, label: () => '🚪 Go outside', use: leaveRoom }); }
    (LAYOUT[b.type] || LAYOUT.office)(b, floor);
    const F = E.getF();
    if (IN.spawn) { const [x, z] = w2(IN.spawn[0], IN.spawn[1]); F.x = x; F.z = z; IN.spawn = null; }
    else { const [x, z] = w2(0, hd - 2.2); F.x = x; F.z = z; F.h = b.s > 0 ? Math.PI : 0; }
    F.vx = F.vz = 0;
    L.sfx && L.sfx('door');
    K.say(`${t.icon} ${b.type === 'viper' ? `Red Vipers Tower · ${floor === VT_FLOORS ? 'Roof' : FLOOR_TXT(floor)}` : `${t.name} · ${FLOOR_TXT(floor)}`}`, 1800);
  }
  function clearRoom() {
    if (!IN.g) return;
    for (const o of IN.objs) { const i = K.OBJ.indexOf(o); if (i >= 0) K.OBJ.splice(i, 1); }
    for (const e of IN.en) E.scene.remove(e.m);
    E.scene.remove(IN.g); IN.g.traverse((o) => o.geometry && o.geometry.dispose());
    IN.g = null; IN.en = []; IN.objs = []; IN.cols = []; IN.targets = [];
  }
  function leaveRoom() {
    if (!IN.b) return;
    const F = E.getF(), was = IN.b; clearRoom(); IN.b = null;
    F.x = was.x; F.z = was.z + was.s * (was.d / 2 + 1.6); F.h = was.s > 0 ? 0 : Math.PI; F.vx = F.vz = 0; F.y = K.Y0;
    if (was.type === 'viper' && !destroyed(was.id) && !VT[was.id].planted) VT[was.id].cleared = new Set(); // the Vipers fill the floors back up
    L.sfx && L.sfx('door');
  }
  const w2 = (u, v) => [IN.b.x + u * IN.b.s, IN.b.z + v * IN.b.s];
  const l2 = (x, z) => [(x - IN.b.x) * IN.b.s, (z - IN.b.z) * IN.b.s];
  function room(o) { const [x, z] = w2(o.u, o.v); const q = K.obj({ ...o, x, z, when: o.when }, 0, 0); IN.objs.push(q); return q; }
  // a solid piece of furniture: drawn and added to the walls you bump into
  function solid(w, d, h, mat, u, v, y = 0) { IN.V2.box(w, h, d, mat, u, K.Y0 + y + h / 2, v, IN.g, false); IN.cols.push([u - w / 2, v - d / 2, u + w / 2, v + d / 2]); }
  function npc(shirt, u, v, face = 0, hat) { const p = E.person(shirt, '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][Math.floor(Math.random() * 3)], hat); p.position.set(u, K.Y0, v); p.rotation.y = face; IN.g.add(p); return p; }
  const plant = (u, v) => { IN.V2.cyl(0.3, 0.24, 0.5, '#d0784a', u, K.Y0 + 0.25, v, IN.g); IN.V2.box(0.7, 0.8, 0.7, '#3f8a3a', u, K.Y0 + 0.9, v, IN.g, false); IN.cols.push([u - 0.35, v - 0.35, u + 0.35, v + 0.35]); };
  function elevator(b, floor, u, v) {
    IN.V2.box(2.6, 3, 0.2, '#9aa3b5', u, K.Y0 + 1.5, v, IN.g, false); IN.V2.box(2.2, 2.6, 0.22, E.M('#d9dee8', { metalness: 0.6, roughness: 0.2 }), u, K.Y0 + 1.3, v + 0.02, IN.g, false);
    const sg = E.textSprite(FLOOR_TXT(floor), '#16203d', '#ffb31a', 1.8, 0.45); sg.position.set(u, K.Y0 + 3.4, v + 0.2); IN.g.add(sg);
    room({ u, v: v + 1.2, r: 1.6, label: () => `🛗 Elevator · ${FLOOR_TXT(floor)}`, use: () => pickFloor(b, floor) });
  }
  function pickFloor(b, cur) {
    const lock = (n) => b.type === 'mafia' && n === 2 && rankOf(M().xp) < 5;
    K.openUi(`<div class="lf-top"><h3>🛗 ${TYPES[b.type].name}</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="rp-floors">${Array.from({ length: b.floors }, (_, n) => `<button data-fl="${n}" ${n === cur || lock(n) ? 'disabled' : ''} class="${n === cur ? 'mine' : ''}">${n === 0 ? 'Lobby' : b.type === 'mafia' ? ['', 'Ops', 'CEO 🔒'][n].replace(' 🔒', lock(n) ? ' 🔒' : '') : n}</button>`).join('')}</div></div>`);
    document.querySelectorAll('#rp-win [data-fl]').forEach((x) => (x.onclick = () => { K.closeUi(); IN.spawn = [-IN.hw + 2.5, -IN.hd + 2.2]; enter(b, +x.dataset.fl); }));
  }

  /* ---------- room layouts ---------- */
  const LAYOUT = {
    office(b, f) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      plant(-hw + 0.8, hd - 0.8); plant(hw - 0.8, hd - 0.8);
      elevator(b, f, -hw + 2.5, -hd + 0.3);
      if (f === 0) {
        solid(5, 1, 1.1, '#2f6bff', 0, -hd + 4); npc('#2f6bff', 0, -hd + 3, 0);
        room({ u: 0, v: -hd + 5.3, r: 1.8, label: () => '💁 Reception: "Need a job? Use the computers upstairs."', use: () => K.say('💁 "Take the elevator. Any free computer upstairs is yours to work on!"') });
        solid(3, 1, 0.8, '#4f6bd8', -hw + 2.6, hd - 4.5); solid(3, 1, 0.8, '#4f6bd8', hw - 2.6, hd - 4.5);
      } else {
        let k = 0;
        for (let u = -hw + 4; u <= hw - 3; u += 4) for (let v = -hd + 4.5; v <= hd - 3; v += 3.6) {
          solid(1.8, 0.9, 0.78, '#8b6b4a', u, v); V2.box(0.7, 0.45, 0.05, E.M('#2f6bff', { emissive: '#2f6bff', emissiveIntensity: 0.6 }), u, Y0 + 1.05, v - 0.2, IN.g, false);
          if ((k++ + f) % 3) npc(['#ffffff', '#2f6bff', '#14c79a', '#ff8a3d'][k % 4], u, v + 0.9, Math.PI).userData.arms.forEach((a) => (a.rotation.x = -1.1));
          else room({ u, v: v + 1.1, r: 1.1, label: () => '💻 Free computer: work a shift', use: () => K.openLaptop('jobs', true) });
        }
      }
    },
    apartments(b, f) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      elevator(b, f, -hw + 2.5, -hd + 0.3); plant(hw - 0.8, hd - 0.8);
      if (f === 0) {
        for (let k = 0; k < 12; k++) V2.box(0.5, 0.45, 0.1, '#c0c6d0', hw - 0.16, Y0 + 1 + (k % 3) * 0.5, -hd + 3 + Math.floor(k / 3) * 0.6, IN.g, false);
        room({ u: hw - 1, v: -hd + 4, r: 1.4, label: () => '📬 Mailboxes', use: () => K.say('📬 Nothing for you here. Your parcels come to your own front door.') });
        solid(3, 1, 0.8, '#b5533c', 0, 0); npc('#b5533c', 0, -1.3, Math.PI);
        room({ u: 0, v: 1.2, r: 1.6, label: () => '🛋️ Sit and relax', use: () => K.activity('relax', 'Relaxing in the lobby', 6, { fun: 3, energy: 2 }) });
      } else {
        for (let v = -hd + 4; v < hd - 2; v += 5) for (const sd of [-1, 1]) {
          V2.box(0.12, 2.4, 1.2, '#8b5a33', sd * (hw - 0.12), Y0 + 1.2, v, IN.g, false);
          const no = `${f}${'ABCDEFGH'[Math.floor((v + hd) / 5) * 2 + (sd > 0 ? 1 : 0)]}`, sg = E.textSprite(no, '#16203d', '#fff', 0.9, 0.4); sg.position.set(sd * (hw - 0.3), Y0 + 2.7, v); IN.g.add(sg);
          room({ u: sd * (hw - 1), v, r: 1.2, label: () => `🚪 Apartment ${no} · knock`, use: () => K.say(['🗣️ "Who is it? ...Not today, thanks!"', '🗣️ "Hi neighbour!"', '🐶 Woof! Woof!', '🔇 Nobody is home.', '🗣️ "Are you the delivery guy?"'][Math.floor(Math.random() * 5)]) });
        }
      }
    },
    shop(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      for (let u = -hw + 4; u <= hw - 4; u += 4.5) { solid(1, hd * 1.1, 1.8, '#d9dee8', u, -hd * 0.25); for (let k = 0; k < 10; k++) V2.box(0.3, 0.3, 0.3, ['#ff8a3d', '#ffd23f', '#14c79a', '#ff4d8b', '#2f6bff'][k % 5], u + (k % 2 ? 0.55 : -0.55), Y0 + 0.5 + (k % 3) * 0.5, -hd * 0.25 - hd * 0.45 + k * 0.1 * hd, IN.g, false); }
      solid(3, 1, 1.05, '#14c79a', hw - 3, hd - 4); npc('#14c79a', hw - 3, hd - 5.1, 0);
      room({ u: hw - 3, v: hd - 2.9, r: 1.6, label: () => '🛒 Buy snacks · scan to pay', use: () => menu('🏪 24/7 Shop', [['🥔', 'Chips', 3, { hunger: 10 }], ['🥤', 'Soda', 2, { energy: 6, fun: 2 }], ['🥪', 'Sandwich', 6, { hunger: 25 }], ['🍫', 'Chocolate', 2, { fun: 5, hunger: 4 }], ['💧', 'Water', 1, { energy: 3 }]]) });
    },
    diner(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(hw * 1.2, 1, 1.05, '#ff8a3d', 0, -hd + 2.5); npc('#ffffff', 0, -hd + 1.4, 0, '#ffffff');
      for (let u = -hw + 3.5; u <= hw - 3; u += 4.5) for (let v = -hd + 6; v <= hd - 4; v += 4) { solid(1.4, 1.4, 0.75, '#b5533c', u, v); for (const s of [-1, 1]) V2.box(0.5, 0.45, 0.5, '#d61f30', u + s * 1.1, Y0 + 0.23, v, IN.g, false); }
      room({ u: 0, v: -hd + 3.8, r: 1.8, label: () => '🍔 Order food · scan to pay', use: () => menu('🍔 Diner', [['🍔', 'Cheeseburger', 8, { hunger: 35 }], ['🍕', 'Pizza slice', 6, { hunger: 25 }], ['🍟', 'Fries', 4, { hunger: 15, fun: 3 }], ['🥤', 'Milkshake', 5, { energy: 6, fun: 6 }], ['🥞', 'Pancakes', 7, { hunger: 30, fun: 4 }]]) });
    },
    gym(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      for (let u = -hw + 3; u <= hw - 3; u += 3) { solid(1, 2.2, 1.2, '#2b3350', u, -hd + 2.5); }
      for (let u = -hw + 4; u <= hw - 4; u += 5) { solid(2, 0.6, 0.5, '#111', u, 1); V2.cyl(0.25, 0.25, 0.2, '#555', u - 1.2, Y0 + 1, 1, IN.g); V2.cyl(0.25, 0.25, 0.2, '#555', u + 1.2, Y0 + 1, 1, IN.g); }
      npc('#8a5cff', hw - 2, hd - 4, Math.PI);
      room({ u: 0, v: -hd + 4, r: 2.5, label: () => '🏃 Treadmill workout · $5', use: () => { if (!K.pay(5, '🏋️ Gym session')) return K.say('You need $5.'); K.activity('gym', 'Running on the treadmill', 8, { fun: 6, energy: -3, hygiene: -3 }); } });
      room({ u: 0, v: 2.4, r: 2.5, label: () => '🏋️ Lift weights · $5', use: () => { if (!K.pay(5, '🏋️ Gym session')) return K.say('You need $5.'); K.activity('gym', 'Lifting weights', 8, { fun: 5, energy: -4, hygiene: -3 }); } });
    },
    clinic(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(4, 1, 1.1, '#ffffff', 0, -hd + 4); npc('#ffffff', 0, -hd + 3, 0);
      for (let u = -hw + 3; u <= hw - 3; u += 4) { solid(1.2, 2.2, 0.6, '#e9edf4', u, -hd + 1.6); V2.box(1, 0.15, 1.6, '#9fd4ff', u, Y0 + 0.68, -hd + 1.8, IN.g, false); }
      room({ u: 0, v: -hd + 5.3, r: 1.8, label: () => '🩺 See a doctor · $30 (full health)', use: () => { if (!K.pay(30, '🏥 Clinic visit')) return K.say('You need $30.'); E.getF().hp = 100; K.activity('doctor', 'Getting checked by the doctor', 4, { energy: 5, hygiene: 3 }); K.say('🩺 "You are as good as new!"'); } });
    },
    den(b) {
      const { hw, hd } = IN, V2 = IN.V2;
      solid(2.6, 1.4, 0.8, '#d61f30', -hw + 3, -hd + 3); solid(2.6, 1.4, 0.8, '#d61f30', hw - 3, -hd + 3);
      solid(2.2, 1.2, 0.85, '#0f5a2a', 0, -1);
      for (let k = 0; k < 4; k++) solid(1.2, 1.2, 1.1, '#6b4a2f', rnd(-hw + 2, hw - 2), rnd(-hd + 5, hd - 5));
      const sg = E.textSprite('🐍 RED VIPERS', '#1a0608', '#ff3b3b', 4, 0.8); sg.position.set(0, K.Y0 + 3, -hd + 0.2); IN.g.add(sg);
      for (let k = 0; k < 3 + (b.bx || 0) % 2; k++) enemy(rnd(-hw + 2, hw - 2), rnd(-hd + 2, -1));
      room({ u: 0, v: -hd + 1.2, r: 1.5, when: () => IN.en.every((e) => e.dead) && (M().denDay || {})[b.id] !== K.S.day, label: () => '💰 Take the Vipers\' cash stash', use: () => { const n = 150 + Math.floor(Math.random() * 250); (M().denDay = M().denDay || {})[b.id] = K.S.day; K.receive(n, '🐍 Vipers\' stash'); gainXp(60, 'Den cleared'); K.save(); } });
    },
    mafia(b, f) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0, gold = E.M('#d4af37', { metalness: 0.7, roughness: 0.3 });
      elevator(b, f, -hw + 2.5, -hd + 0.3);
      V2.box(hw * 2 - 0.4, 0.02, 2, '#7a0f16', 0, Y0 + 0.03, 0, IN.g, false);
      if (f === 0) {
        for (const s of [-1, 1]) npc('#111114', s * 2, hd - 2.6, Math.PI, '#111114');
        solid(5, 1.4, 1.1, '#3a2a1a', 0, -hd + 4.2); V2.box(5.2, 0.08, 1.6, gold, 0, Y0 + 1.14, -hd + 4.2, IN.g, false);
        const don = npc('#111114', 0, -hd + 2.8, 0, '#2b2b2b'); don.scale.setScalar(1.12);
        room({ u: 0, v: -hd + 5.7, r: 2, label: () => (M().member ? `🕴️ Don Marco: "Welcome back, ${RANKS[rankOf(M().xp)][0]}."` : '🕴️ Don Marco: "You want to join the family?"'), use: openDon });
        // armory
        solid(1, 5, 1.2, '#2b2b2b', -hw + 1, 0); for (let k = 0; k < 6; k++) V2.box(0.12, 1, 0.3, '#444', -hw + 0.4, Y0 + 2, -2 + k * 0.8, IN.g, false);
        room({ u: -hw + 2.3, v: 0, r: 1.6, label: () => (M().member ? `🔫 Armory: rifle level ${M().gunLv}` : '🔫 Armory · members only'), use: openArmory });
        // shooting range
        for (let k = 0; k < 3; k++) { const tg = V2.box(0.9, 1.6, 0.12, '#ffffff', hw - 1.6, Y0 + 1.2, -hd + 4 + k * 3, IN.g, false); V2.box(0.5, 0.5, 0.14, '#d61f30', hw - 1.6, Y0 + 1.5, -hd + 4 + k * 3, IN.g, false); tg.rotation.y = Math.PI / 2; const [x, z] = w2(hw - 1.6, -hd + 4 + k * 3); IN.targets.push({ x, z, m: tg, t: 0 }); }
        V2.box(0.2, 1.1, 8, '#555', hw - 6, Y0 + 0.55, -hd + 7, IN.g, false); IN.cols.push([hw - 6.1, -hd + 3, hw - 5.9, -hd + 11]);
        room({ u: hw - 7, v: -hd + 7, r: 2.2, label: () => '🎯 Shooting range: press G for your rifle, aim at the targets', use: () => (M().member ? toggleGun(true) : K.say('Members only.')) });
        for (let k = 0; k < 4; k++) { const u = -4 + k * 2.6; solid(1.6, 0.8, 0.78, '#3a2a1a', u, 3.2); npc('#2b2b2b', u, 4.1, Math.PI).userData.arms.forEach((a) => (a.rotation.x = -1.1)); }
      } else if (f === 1) {
        solid(6, 3, 0.9, '#3a2a1a', 0, -1); const mp = E.textSprite('🗺️ Operation: Red Vipers', '#111114', '#d4af37', 5, 0.8); mp.position.set(0, Y0 + 2.6, -1); IN.g.add(mp);
        for (let k = 0; k < 10; k++) { const u = -hw + 3 + (k % 5) * ((hw * 2 - 6) / 4), v = k < 5 ? -hd + 3 : hd - 4; solid(1.6, 0.8, 0.78, '#3a2a1a', u, v); npc(['#2b2b2b', '#111114', '#4a4a55'][k % 3], u, v + (k < 5 ? 0.9 : -0.9), k < 5 ? Math.PI : 0); }
        room({ u: 0, v: 1.2, r: 2.4, label: () => `🗺️ Mission board · ${M().destroyed.length}/3 Viper towers down`, use: () => K.openPhone('mafia') });
      } else {
        solid(4, 1.4, 1, '#3a2a1a', 0, -hd + 4); V2.box(4.2, 0.08, 1.6, gold, 0, Y0 + 1.04, -hd + 4, IN.g, false);
        V2.box(1.4, 2, 1, '#555', hw - 1.5, Y0 + 1, -hd + 1.2, IN.g, false); IN.cols.push([hw - 2.2, -hd + 0.7, hw - 0.8, -hd + 1.7]);
        room({ u: 0, v: -hd + 5.4, r: 2, label: () => '👔 Your CEO desk: run the Mafia Tower', use: () => K.openPhone('mafia') });
        room({ u: hw - 1.5, v: -hd + 2.4, r: 1.5, when: () => M().safeDay !== K.S.day, label: () => '💼 Open the tower safe (daily)', use: () => { M().safeDay = K.S.day; K.receive(20000, '🕴️ Mafia Tower profits'); K.save(); } });
      }
    },
    viper(b, f) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0, st = VT[b.id], roof = f === VT_FLOORS;
      const sg = E.textSprite(roof ? '🐍 ROOF · VIPER KING' : `🐍 FLOOR ${f}`, '#1a0608', '#ff3b3b', 4, 0.8); sg.position.set(0, Y0 + 3.2, -hd + 0.2); IN.g.add(sg);
      // seeded cover so each floor feels different
      let seed = f * 97 + b.id.length * 31; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let k = 0; k < 7; k++) { const u = -hw + 3 + R() * (hw * 2 - 6), v = -hd + 4 + R() * (hd * 2 - 10); solid(1.4, 1.4, 1.2, ['#6b4a2f', '#3a3a3a', '#7a0f16'][k % 3], u, v); }
      // stairs up in the back corner, down by the door
      V2.box(2.4, 3, 0.2, '#2a1012', hw - 2, Y0 + 1.5, -hd + 0.2, IN.g, false);
      if (!roof) room({ u: hw - 2, v: -hd + 1.4, r: 1.6, label: () => (left() ? `🪜 Stairs up (clear the floor first: ${left()} Viper${left() > 1 ? 's' : ''} left)` : `🪜 Stairs up to ${f + 1 === VT_FLOORS ? 'the roof' : 'floor ' + (f + 1)}`), use: () => { if (left()) return K.say('🐍 Clear this floor first!'); IN.spawn = [hw - 2, -hd + 2.4]; enter(b, f + 1); } });
      if (f > 0) room({ u: -hw + 2, v: hd - 1.4, r: 1.6, label: () => '🪜 Stairs down', use: () => { IN.spawn = [hw - 2, -hd + 2.4]; enter(b, f - 1); } });
      if (f > 0) { IN.spawn = IN.spawn || [-hw + 2, hd - 2.4]; }
      if (!st.cleared.has(f)) {
        const n = roof ? 3 : 3 + f;
        for (let k = 0; k < n; k++) enemy(rnd(-hw + 2, hw - 2), rnd(-hd + 2, hd - 7));
        if (roof) enemy(0, -hd + 3, true);
      }
      if (roof) {
        const core = V2.box(2.2, 3.2, 2.2, E.M('#ff3b3b', { emissive: '#ff0000', emissiveIntensity: 0.8 }), 0, Y0 + 1.6, -2, IN.g, false); IN.cols.push([-1.1, -3.1, 1.1, -0.9]);
        IN.core = core;
        room({ u: 0, v: -0.2, r: 1.8, when: () => !st.planted, label: () => (left() ? `⚡ Tower core (defeat the Vipers first: ${left()} left)` : '💣 Plant the charge on the tower core'), use: () => { if (left()) return K.say("🐍 The Viper King is still standing!"); plantCharge(b); } });
      }
    },
  };
  const left = () => IN.en.filter((e) => !e.dead).length;

  function menu(title, items) {
    K.openUi(`<div class="lf-top"><h3>${title}</h3><span class="pill">${K.fmt$(K.S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="lf-grid">${items.map(([ic, n, p], i) => `<div class="lf-card"><span class="ic">${ic}</span><b>${n}</b><button class="btn gold" data-mi="${i}" ${K.canPay(p) ? '' : 'disabled'}>${K.fmt$(p)}</button></div>`).join('')}</div></div>`);
    document.querySelectorAll('#rp-win [data-mi]').forEach((x) => (x.onclick = () => { const [ic, n, p, eff] = items[+x.dataset.mi]; K.closeUi(); K.showQR(title.replace(/^\S+\s/, ''), p, false, () => { K.pay(p, `${ic} ${n}`); K.activity('eat', `Having your ${n.toLowerCase()}`, 4, Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, v / 4]))); K.hud(); }); }));
  }

  /* ---------- the Mafia ---------- */
  function openDon() {
    const m = M(), r = rankOf(m.xp);
    if (!m.member) {
      K.openUi(`<div class="lf-top"><h3>🕴️ Don Marco</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:460px"><p>"The Red Vipers have taken over three towers in the east of the city. They hurt our people and they hurt the city. The family is going to stop them."</p><p>"Join us and you get a rifle, a salary, and a place in this tower. Work hard and one day you will run it as <b>CEO</b>."</p><p class="muted">Joining fee: $2,500</p><button class="btn gold" data-join="1" ${K.canPay(2500) ? '' : 'disabled'}>Join the Mafia · $2,500</button></div>`);
      document.querySelector('#rp-win [data-join]').onclick = () => { if (!K.pay(2500, '🕴️ Mafia joining fee')) return; join(); K.closeUi(); };
      return;
    }
    K.openPhone('mafia');
  }
  function join(free) {
    const m = M(); if (m.member) return false;
    m.member = true; m.xp = m.xp || 0; m.since = K.S.day; m.payDay = K.S.day; K.save();
    L.sfx && L.sfx('win');
    K.notify(`🕴️ Welcome to the family! You are a ${RANKS[0][0]}. You got a 🔫 rifle: press G to take it out, click or R to fire. Mission: destroy the 3 Red Vipers Towers.${free ? ' (admin)' : ''}`);
    return true;
  }
  function gainXp(n, why) {
    const m = M(); if (!m.member) return; const before = rankOf(m.xp); m.xp += n;
    const after = rankOf(m.xp);
    if (after > before) { L.sfx && L.sfx('win'); K.notify(after === RANKS.length - 1 ? '👔 You are now the CEO of the Mafia Tower! Your office is on the top floor.' : `⬆️ Promoted to ${RANKS[after][0]}! Salary ${K.fmt$(RANKS[after][2])} a day.`); }
    else if (why) K.say(`+${n} XP · ${why}`, 1500);
  }
  function openArmory() {
    const m = M(); if (!m.member) return K.say('🔫 "Members only. Talk to Don Marco."');
    const cost = 1500 * m.gunLv;
    K.openUi(`<div class="lf-top"><h3>🔫 Armory</h3><span class="pill">${K.fmt$(K.S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:440px"><div class="lf-card"><span class="ic">🔫</span><b>Rifle · level ${m.gunLv}</b><p>Damage ${dmg()} per shot. Press G to take it out or put it away. Click, R or the FIRE button to shoot.</p><button class="btn primary" data-take="1">${CB.armed ? 'Put it away' : 'Take your rifle'}</button>${m.gunLv < 5 ? `<button class="btn gold" data-up="1" ${K.canPay(cost) ? '' : 'disabled'}>Upgrade · ${K.fmt$(cost)}</button>` : '<button class="btn ghost" disabled>Max level</button>'}</div></div>`);
    document.querySelector('#rp-win [data-take]').onclick = () => { K.closeUi(); toggleGun(); };
    const up = document.querySelector('#rp-win [data-up]'); if (up) up.onclick = () => { if (!K.pay(cost, '🔫 Rifle upgrade')) return; m.gunLv++; K.save(); openArmory(); };
  }
  const dmg = () => 26 + M().gunLv * 8;
  const mafiaApp = {
    id: 'mafia', icon: '🕴️', label: 'Mafia',
    html() {
      const m = M(), r = rankOf(m.xp), nx = RANKS[r + 1];
      if (!m.member) return '<p>You are not in the family. Visit Don Marco in the 🕴️ Mafia Tower to join.</p>';
      return `<div class="ph-card" style="background:linear-gradient(135deg,#111114,#3a2a1a);color:#d4af37"><small>Mafia Tower · rank</small><b>${RANKS[r][0]}</b><small>${m.xp} XP${nx ? ` · ${nx[1] - m.xp} XP to ${nx[0]}` : ' · top rank'}</small><div style="height:6px;background:#0006;border-radius:4px;margin-top:6px"><i style="display:block;height:100%;border-radius:4px;background:#d4af37;width:${nx ? Math.round(((m.xp - RANKS[r][1]) / (nx[1] - RANKS[r][1])) * 100) : 100}%"></i></div></div>
        <div class="rp-row"><span style="font-size:22px">🎯</span><div style="flex:1"><b>Mission: save the city</b><div class="muted" style="font-size:12px">Storm the 3 Red Vipers Towers, fight floor by floor up to the roof, beat the Viper King and destroy the tower.</div></div><b>${m.destroyed.length}/3</b></div>
        <div class="rp-row"><span style="font-size:22px">💀</span><b style="flex:1">Vipers defeated</b><b>${m.kills}</b></div><div class="rp-row"><span style="font-size:22px">🪜</span><b style="flex:1">Floors cleared</b><b>${m.floors}</b></div><div class="rp-row"><span style="font-size:22px">💵</span><b style="flex:1">Daily salary</b><b>${K.fmt$(RANKS[r][2])}</b></div><div class="rp-row"><span style="font-size:22px">🔫</span><b style="flex:1">Rifle level</b><b>${m.gunLv}</b></div>
        <p class="muted" style="font-size:12px">Ranks: ${RANKS.map((q) => `${q[0]} (${q[1]} XP)`).join(' · ')}</p>${E.RP_LOTS.vipers.map((_, i) => `<button class="btn ghost" data-vgps="${i}" style="margin:3px 0">📍 GPS to Red Vipers Tower ${i + 1}${destroyed('viper' + i) ? ' · destroyed ✅' : ''}</button>`).join('')}`;
    },
    wire() { document.querySelectorAll('#rp-win [data-vgps]').forEach((b) => (b.onclick = () => { const p = K.places.find((q) => q.name === `Red Vipers Tower ${+b.dataset.vgps + 1}`); K.setGps(p); })); },
  };

  /* ---------- Red Vipers and combat ---------- */
  function enemy(u, v, boss) {
    const m = E.person(boss ? '#111111' : '#b3162a', '#111111', ['#f1c27d', '#c68642', '#8d5524'][Math.floor(Math.random() * 3)], boss ? '#d4af37' : '#111111');
    const gun = K.adapter(m).box(0.1, 0.12, 0.6, '#222', 0.38, 1.05, 0.35, m, false);
    if (boss) { m.scale.setScalar(1.3); K.adapter(m).box(0.4, 0.06, 0.06, E.M('#d4af37', { metalness: 0.8 }), 0, 1.45, 0.17, m, false); }
    const [x, z] = w2(u, v); m.position.set(x, K.Y0, z); E.scene.add(m);
    const e = { m, x, z, hp: boss ? 450 : 90, max: boss ? 450 : 90, boss, cool: rnd(1, 2.5), alert: false, dead: false, dt: 0, strafe: Math.random() < 0.5 ? 1 : -1, gun };
    IN.en.push(e); return e;
  }
  // straight line test against the room's furniture (in room coordinates)
  function clear(ax, az, bx, bz) {
    const [a0, a1] = l2(ax, az), [b0, b1] = l2(bx, bz), d = Math.hypot(b0 - a0, b1 - a1), n = Math.ceil(d / 0.35);
    for (let i = 1; i < n; i++) { const t = i / n, u = a0 + (b0 - a0) * t, v = a1 + (b1 - a1) * t; for (const [x0, z0, x1, z1] of IN.cols) if (u > x0 && u < x1 && v > z0 && v < z1) return false; }
    return true;
  }
  function tracer(ax, ay, az, bx, by, bz, col) {
    const T = E.T, g = new T.BufferGeometry().setFromPoints([new T.Vector3(ax, ay, az), new T.Vector3(bx, by, bz)]);
    const l = new T.Line(g, new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); E.scene.add(l); IN.fx.push({ o: l, t: 0.08 });
  }
  function toggleGun(on) {
    if (!M().member) return K.say('🔫 You need to join the 🕴️ Mafia Tower to get a rifle.');
    CB.armed = on === undefined ? !CB.armed : on; L.sfx && L.sfx('click');
    document.querySelector('#cb-ui').hidden = !CB.armed; document.querySelector('#cb-cross').hidden = !CB.armed;
    if (CB.armed) K.say('🔫 Rifle out. Click, press R or tap FIRE to shoot. G to put it away.', 2500);
  }
  function fire() {
    if (!CB.armed || E.G.mode !== 'foot' || K.isUi() || CB.cool > 0 || E.G.paused) return;
    CB.cool = 0.16; const F = E.getF(), fx = Math.sin(F.h), fz = Math.cos(F.h), y = F.y + 1.35;
    L.sfx && L.sfx('rifle', { volume: 0.5 }); CB.flash = 0.05;
    // aim assist: the enemy or target closest to where you face
    let best = null;
    for (const e of IN.en) { if (e.dead) continue; const dx = e.x - F.x, dz = e.z - F.z, d = Math.hypot(dx, dz), a = Math.abs(K.wrapA(Math.atan2(dx, dz) - F.h)); if (d < 45 && a < 0.12 + 1.2 / Math.max(2, d) && (!best || a < best.a) && clear(F.x, F.z, e.x, e.z)) best = { e, a, d }; }
    for (const t of IN.targets) { const dx = t.x - F.x, dz = t.z - F.z, d = Math.hypot(dx, dz), a = Math.abs(K.wrapA(Math.atan2(dx, dz) - F.h)); if (d < 40 && a < 0.1 + 0.8 / Math.max(2, d) && (!best || a < best.a)) best = { t, a, d }; }
    if (best && best.e) {
      const e = best.e; tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, e.x, K.Y0 + 1.3 * (e.boss ? 1.3 : 1), e.z, '#ffd56b');
      e.hp -= dmg(); e.alert = true; L.sfx && L.sfx('hit', { volume: 0.4 }); E.puff(e.x, K.Y0 + 1.3, e.z, '#b3162a', 0.3, 0.4, 0, 1, 0, 1.5, 0.8);
      if (e.hp <= 0) kill(e);
    } else if (best && best.t) {
      const t = best.t; tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, t.x, K.Y0 + 1.3, t.z, '#ffd56b'); t.t = 0.4; L.sfx && L.sfx('ding', { volume: 0.4 });
      const m = M(); if ((m.rangeDay || 0) !== K.S.day) { m.rangeDay = K.S.day; m.rangeXp = 0; } if (m.rangeXp < 60) { m.rangeXp++; gainXp(1); }
    } else tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, F.x + fx * 40, y, F.z + fz * 40, '#ffd56b');
  }
  function kill(e) {
    e.dead = true; e.hp = 0; L.sfx && L.sfx(e.boss ? 'explode' : 'hurt', { volume: 0.5 });
    const m = M(); m.kills++; gainXp(e.boss ? 150 : 10, e.boss ? 'Viper King defeated!' : 'Viper down');
    const cash = e.boss ? 2000 : 20 + Math.floor(Math.random() * 40); if (e.boss) K.receive(cash, '👑 Viper King\'s cash'); else { K.S.cash += cash; K.txn('🐍 Cash from a Viper', cash); K.hud(); }
    if (IN.b && IN.b.type === 'viper' && !left()) { VT[IN.b.id].cleared.add(IN.floor); m.floors++; gainXp(40, IN.floor === VT_FLOORS ? '' : 'Floor cleared! Take the stairs up'); K.say(IN.floor === VT_FLOORS ? '💣 The roof is clear. Plant the charge on the tower core!' : '✅ Floor cleared! Take the stairs up.', 3000); }
    if (IN.b && IN.b.type === 'den' && !left()) K.say('✅ Den cleared! Grab the cash stash by the back wall.', 3000);
    K.save();
  }
  function knockedOut() {
    const F = E.getF(); F.hp = 100; const was = IN.b; leaveRoom();
    const [mx, mz] = E.lotC(...E.RP_LOTS.mafia); F.x = mx; F.z = mz + 14.2; F.h = 0;
    const fee = Math.min(100, Math.max(0, Math.floor(K.S.cash))); if (fee) K.pay(fee, '🚑 Ambulance');
    document.querySelector('#cb-hit').hidden = true; L.sfx && L.sfx('lose');
    K.notify(`🚑 You were knocked out${was && was.type === 'viper' ? ' in the Red Vipers Tower' : ''}. The ambulance brought you to the Mafia Tower${fee ? ` (−${K.fmt$(fee)})` : ''}. Rest, upgrade your rifle and try again.`);
  }
  function plantCharge(b) {
    const st = VT[b.id]; st.planted = true; st.timer = 10; L.sfx && L.sfx('beep');
    K.say('💣 Charge planted! 10 seconds. Get out!', 2500);
    room({ u: 0, v: IN.hd - 1.5, r: 50, when: () => st.planted && IN.b === b, label: () => `🏃 RUN! Emergency exit · ${Math.ceil(st.timer)}s`, use: () => escape(b) });
  }
  function escape(b) {
    const st = VT[b.id]; if (!st.planted) return; IN.spawn = null; leaveRoom();
    const F = E.getF(); F.x = b.x; F.z = b.z + b.s * (b.d / 2 + 18); F.h = b.s > 0 ? Math.PI : 0;
    st.planted = false; st.collapse = 0; K.say('🏃 You made it out!', 1500);
  }
  function collapseTick(dt) {
    for (const b of BLD) {
      if (b.type !== 'viper') continue; const st = VT[b.id];
      if (st.planted) { st.timer -= dt; if (Math.floor(st.timer * 2) !== Math.floor((st.timer + dt) * 2)) L.sfx && L.sfx('beep', { volume: 0.3 }); if (st.timer <= 0) escape(b); }
      if (st.collapse == null) continue;
      st.collapse += dt; const t = st.collapse;
      b.g.position.y = -Math.pow(Math.max(0, t - 0.6), 2) * 6; b.g.rotation.z = Math.sin(t * 9) * 0.004;
      E.G.shake = Math.max(E.G.shake || 0, 0.5);
      if (Math.random() < dt * 14) E.wreckFx(b.x + rnd(-12, 12), b.z + rnd(-12, 12));
      if (t > 0.1 && t - dt <= 0.1) L.sfx && L.sfx('explode');
      if (b.g.position.y < -b.h) {
        st.collapse = null; b.g.visible = false; b.rubble.visible = true; b.g.rotation.z = 0;
        const m = M(); if (!m.destroyed.includes(b.id)) m.destroyed.push(b.id); m.ruinDay = K.S.day;
        gainXp(400, 'Red Vipers Tower destroyed!'); K.receive(10000, '🐍 Reward for a Red Vipers Tower');
        if (m.destroyed.length >= 3) { m.saved = (m.saved || 0) + 1; K.receive(50000, '🌍 You saved the city'); gainXp(1000); K.notify('🌍 All three Red Vipers Towers are down. You saved the city! The family will remember this.'); L.sfx && L.sfx('win'); }
        else K.notify(`💥 Red Vipers Tower destroyed! ${3 - m.destroyed.length} to go.`);
        K.save();
      }
    }
  }

  /* ---------- the module ---------- */
  const CITY = {
    apps: [mafiaApp],
    build,
    enter() { S = K.S; M(); const m = M(); if (m.destroyed.length >= 3 && m.ruinDay && K.S.day - m.ruinDay >= 3) { m.destroyed = []; K.notify('🐍 The Red Vipers are back! They rebuilt their towers. The family needs you.'); } setTowerState(); CB.armed = false; document.querySelector('#cb-ui').hidden = true; document.querySelector('#cb-cross').hidden = true; },
    leave() { leaveRoom(); CB.armed = false; },
    noCol: () => !!IN.b,
    inside: () => !!IN.b,
    foot(F) {
      if (!IN.b) return false;
      F.y = K.Y0; F.floor = 0; F.stairs = false; F.tower = 0;
      const [u, v] = l2(F.x, F.z), p = { x: K.clamp(u, -IN.hw + 0.4, IN.hw - 0.4), z: K.clamp(v, -IN.hd + 0.4, IN.hd - 0.4) };
      K.pushCols(p, 0, 0, IN.cols); const [x, z] = w2(p.x, p.z); F.x = x; F.z = z;
      return true;
    },
    cam(camera, dt) {
      if (!IN.b || E.G.mode !== 'foot') return false;
      const F = E.getF(), D = CITY.d || (CITY.d = {});
      D.ch = D.ch == null ? F.h : D.ch + K.wrapA(F.h - D.ch) * Math.min(1, dt * 6);
      const fx = Math.sin(D.ch), fz = Math.cos(D.ch), b = IN.b, hw = IN.hw - 0.3, hd = IN.hd - 0.3, dist = CB.armed ? 2.6 : 3.4, side = CB.armed ? 0.7 : 0;
      const want = { x: K.clamp(F.x - fx * dist - fz * side, b.x - hw, b.x + hw), y: Math.min(K.Y0 + H_IN - 0.35, F.y + 2.1), z: K.clamp(F.z - fz * dist + fx * side, b.z - hd, b.z + hd) };
      if (!D.cp || D.b !== b) { D.cp = { ...want }; D.b = b; }
      const k = Math.min(1, dt * 8); for (const a of ['x', 'y', 'z']) D.cp[a] += (want[a] - D.cp[a]) * k;
      camera.position.set(D.cp.x, D.cp.y, D.cp.z); camera.lookAt(F.x + fx * 3, F.y + 1.4, F.z + fz * 3); return true;
    },
    tick(dt) {
      if (!K) return; const F = E.getF(), m = M();
      CB.cool -= dt; if (CB.hold && CB.armed) fire();
      collapseTick(dt);
      // salary and slow XP for members
      if (m.member) { if (m.payDay !== K.S.day) { m.payDay = K.S.day; const r = rankOf(m.xp); K.receive(RANKS[r][2], `🕴️ Mafia salary (${RANKS[r][0]})`); gainXp(20); K.save(); } }
      for (const t of IN.targets) if (t.t > 0) { t.t -= dt; t.m.rotation.x = t.t > 0 ? -1.2 : 0; }
      for (let i = IN.fx.length - 1; i >= 0; i--) { const f = IN.fx[i]; f.t -= dt; if (f.t <= 0) { E.scene.remove(f.o); f.o.geometry.dispose(); IN.fx.splice(i, 1); } }
      if (!IN.b) return;
      let hurt = false;
      for (const e of IN.en) {
        if (e.dead) { e.dt += dt; e.m.rotation.x = Math.max(-Math.PI / 2, -e.dt * 4); e.m.position.y = K.Y0 + 0.15; continue; }
        const dx = F.x - e.x, dz = F.z - e.z, d = Math.hypot(dx, dz), sees = d < 30 && clear(e.x, e.z, F.x, F.z);
        if (sees && d < 22) e.alert = true;
        if (!e.alert) continue;
        e.m.rotation.y = Math.atan2(dx, dz);
        // close in, then strafe
        const sp = (e.boss ? 1.4 : 2.1) * dt, want = d > 8 ? 1 : d < 4 ? -0.6 : 0;
        let [u, v] = l2(e.x, e.z); const [du, dv] = [(dx / d) * IN.b.s, (dz / d) * IN.b.s];
        u += (du * want - dv * e.strafe * 0.6) * sp; v += (dv * want + du * e.strafe * 0.6) * sp;
        if (Math.random() < dt * 0.4) e.strafe *= -1;
        const p = { x: K.clamp(u, -IN.hw + 0.5, IN.hw - 0.5), z: K.clamp(v, -IN.hd + 0.5, IN.hd - 0.5) }; K.pushCols(p, 0, 0, IN.cols);
        [e.x, e.z] = w2(p.x, p.z); e.m.position.set(e.x, K.Y0, e.z);
        const u2 = e.m.userData, w = Math.sin(performance.now() / 110) * 0.5; u2.legs[0].rotation.x = w; u2.legs[1].rotation.x = -w; u2.arms[1].rotation.x = -1.4;
        e.cool -= dt;
        if (e.cool <= 0 && sees) {
          e.cool = e.boss ? rnd(0.5, 0.9) : rnd(1.1, 2.2);
          L.sfx && L.sfx('rifle', { volume: 0.25 });
          const hit = Math.random() < K.clamp(0.6 - d / 55 - Math.hypot(F.vx, F.vz) * 0.05, 0.12, 0.6);
          tracer(e.x, K.Y0 + 1.2 * (e.boss ? 1.3 : 1), e.z, F.x + (hit ? 0 : rnd(-1.5, 1.5)), F.y + 1.2, F.z + (hit ? 0 : rnd(-1.5, 1.5)), '#ff5a5a');
          if (hit) { F.hp -= e.boss ? 12 : 6; hurt = true; E.G.shake = 0.25; L.sfx && L.sfx('hurt', { volume: 0.35 }); if (F.hp <= 0) return knockedOut(); }
        }
      }
      if (hurt) { const h = document.querySelector('#cb-hit'); h.hidden = false; clearTimeout(CB.hitT); CB.hitT = setTimeout(() => (h.hidden = true), 180); }
    },
    frame() {
      const F = E.getF(); if (!F.m) return;
      // the rifle in your hands
      if (!CB.gun) { const g = new E.T.Group(), V2 = K.adapter(g); V2.box(0.09, 0.14, 0.95, '#1d1d1d', 0, 0, 0.25, g, false); V2.box(0.07, 0.2, 0.12, '#1d1d1d', 0, -0.13, 0.05, g, false); V2.box(0.06, 0.06, 0.3, '#3a3a3a', 0, 0.09, 0.2, g, false); V2.box(0.1, 0.12, 0.3, '#6b4a2f', 0, -0.02, -0.28, g, false); CB.flashM = V2.box(0.16, 0.16, 0.16, E.M('#ffd56b', { emissive: '#ffb31a', emissiveIntensity: 2 }), 0, 0, 0.78, g, false); g.position.set(0.2, 1.22, 0.32); CB.gun = g; }
      if (CB.gun.parent !== F.m) F.m.add(CB.gun);
      const on = CB.armed && E.G.mode === 'foot'; CB.gun.visible = on;
      CB.flash -= 1 / 60; CB.flashM.visible = CB.flash > 0;
      if (on) { const u = F.m.userData; u.arms[1].rotation.x = -1.45; u.arms[0].rotation.x = -1.3; u.arms[0].rotation.z = -0.35; } else if (F.m.userData.arms[0].rotation.z) F.m.userData.arms[0].rotation.z = 0;
    },
    drawMap(g, R) {
      const [mx, mz] = E.lotC(...E.RP_LOTS.mafia); g.fillStyle = '#d4af37'; R(mx - 12, mz - 12, mx + 12, mz + 12);
      for (const b of BLD) if (b.type === 'viper') { g.fillStyle = destroyed(b.id) ? '#555' : '#d61f30'; R(b.x - 12, b.z - 12, b.x + 12, b.z + 12); }
    },
  };
  window.LSPDriveCity = { join: (admin) => (K ? join(admin) : false), killAll() { let n = 0; for (const e of IN.en) if (!e.dead) { kill(e); n++; } return n; }, _IN: IN, _enter: (id, f) => enter(BLD.find((b) => b.id === id), f || 0), _BLD: BLD, _VT: VT };
  const hook = () => (window.LSPDriveRP ? window.LSPDriveRP.ext(CITY) : setTimeout(hook, 50)); hook();
})();
