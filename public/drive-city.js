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
    hospital: { name: 'LSP Hospital', icon: '🏥', wall: '#f7fbff', floor: '#e9f0f7', trim: '#d61f30' },
    xhp: { name: 'Viper XHP', icon: '🔫', wall: '#1b1b1f', floor: '#2b2b2b', trim: '#ff3b3b' },
    party: { name: 'City Party Hall', icon: '🎉', wall: '#1d1440', floor: '#2b2350', trim: '#ffb31a' },
    club: { name: 'LSP Club', icon: '🏓', wall: '#14202e', floor: '#3a3f4a', trim: '#14c79a' },
    sweets: { name: 'LSP Sweets', icon: '🍬', wall: '#fff4e6', floor: '#f2e6d0', trim: '#ff8a3d' },
    cafe: { name: 'Café', icon: '☕', wall: '#f3eadb', floor: '#a87a50', trim: '#6b4a2f' },
    restaurant: { name: 'La Terraza', icon: '🍽️', wall: '#2a1f1a', floor: '#6b4a2f', trim: '#d4af37' },
  };
  const CITY_MIX = ['office', 'apartments', 'office', 'shop', 'apartments', 'diner', 'office', 'gym', 'apartments', 'clinic', 'shop', 'office'];
  const RANKS = [['Recruit', 0, 100], ['Soldier', 150, 250], ['Enforcer', 400, 500], ['Capo', 800, 900], ['Underboss', 1400, 1500], ['CEO', 2200, 5000]];
  const VT_FLOORS = 5; // floors 0-4 have Vipers, floor 5 is the roof with the Viper King and the tower core
  const BLD = []; // every enterable place
  const IN = { b: null, floor: 0, g: null, objs: [], cols: [], en: [], fx: [], targets: [] };
  const CB = { armed: false, cool: 0, gun: null, flash: 0, ko: 0 };
  let MARBLE = null;
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
      const PICK = { 2: 'party', 6: 'club', 9: 'sweets', 13: 'cafe', 17: 'restaurant', 22: 'sweets', 27: 'cafe', 31: 'restaurant', 36: 'club' };
      const type = c.turf ? 'den' : PICK[i] || CITY_MIX[(i * 7 + c.bx * 3 + c.bz) % CITY_MIX.length];
      if (type === 'party') K.places.push({ name: 'City Party Hall', icon: '🎉', x: c.x, z: c.z + (c.lz === 0 ? -1 : 1) * (c.d / 2 + 2) });
      if (type === 'club' && !K.places.some((p) => p.name === 'LSP Club')) K.places.push({ name: 'LSP Club', icon: '🏓', x: c.x, z: c.z + (c.lz === 0 ? -1 : 1) * (c.d / 2 + 2) });
      if (type === 'sweets' && !K.places.some((p) => p.name === 'LSP Sweets')) K.places.push({ name: 'LSP Sweets', icon: '🍬', x: c.x, z: c.z + (c.lz === 0 ? -1 : 1) * (c.d / 2 + 2) });
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
    { const l = E.RP_LOTS.hospital; tower('hospital', 'hospital', E.lotC(...l), l[3] === 0 ? -1 : 1, 30, { body: '#eef4fa', lit: '#cfe8ff', dark: '#9fb3c8', trim: '#d61f30', title: '✚ LSP HOSPITAL', titleBg: '#ffffff', titleFg: '#d61f30', door: '🏥 LSP Hospital · 24/7', enter: '🏥 Enter LSP Hospital' }); const [x, z] = E.lotC(...l); K.places.push({ name: 'LSP Hospital', icon: '🏥', x, z: z + 14 }); }
    { const l = E.RP_LOTS.xhp; tower('xhp', 'xhp', E.lotC(...l), l[3] === 0 ? -1 : 1, 52, { body: '#121214', lit: '#ff3b3b', dark: '#2a2a33', trim: '#ff3b3b', title: 'VIPER XHP', titleBg: '#121214', titleFg: '#ff3b3b', door: '🔫 Viper XHP · guns, bombs, missiles', enter: '🔫 Enter Viper XHP (weapons shop)' }); const [x, z] = E.lotC(...l); K.places.push({ name: 'Viper XHP', icon: '🔫', x, z: z + (l[3] === 0 ? -14 : 14) }); }
    // rifle and fire controls
    const scr = document.querySelector('#s-drive');
    scr.insertAdjacentHTML('beforeend', '<button id="cb-equip" hidden>🔫 Gun</button><div id="cb-wpn"></div><div id="cb-ui" hidden><button id="cb-fire">🔫 FIRE</button><button id="cb-sw">🔁 Switch</button><button id="cb-gren">💣 Grenade</button><button id="cb-gun" title="G">Put away</button></div><div id="cb-hit" hidden></div><div id="cb-cross" hidden>+</div>');
    const st = document.createElement('style');
    st.textContent = `#cb-ui{position:absolute;right:16px;bottom:120px;display:flex;flex-direction:column;gap:8px;z-index:30}#cb-ui[hidden]{display:none}#cb-equip{position:absolute;right:16px;bottom:120px;z-index:30;border:0;border-radius:16px;padding:12px 14px;font:700 15px system-ui;background:#111114e6;color:#d4af37;box-shadow:0 6px 20px #0006;cursor:pointer}#cb-equip[hidden]{display:none}
#cb-wpn{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(58px + env(safe-area-inset-bottom,0px));background:#111114cc;color:#fff;border:1px solid #d4af37;border-radius:12px;padding:6px 12px;font:13px system-ui;text-align:center;z-index:29;pointer-events:none}#cb-wpn:empty{display:none}#cb-sw,#cb-gren{background:#16203dcc;color:#fff;padding:8px 10px}
#pp{position:absolute;inset:0;z-index:66;display:grid;place-items:center;background:#000b}#pp[hidden]{display:none}.pp-in{text-align:center;color:#fff}.pp-in canvas{height:min(60vh,480px);width:auto;max-width:86vw;border-radius:12px;box-shadow:0 10px 40px #000}.pp-score{font:700 22px Fredoka,system-ui;margin-bottom:8px}
#cb-ui button{border:0;border-radius:16px;font:700 15px system-ui;cursor:pointer;box-shadow:0 6px 20px #0006}#cb-fire{width:92px;height:92px;border-radius:50%!important;background:#d61f30;color:#fff;font-size:17px!important}#cb-gun{background:#16203dcc;color:#fff;padding:8px 10px}
#cb-hit{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 30px rgba(214,31,48,.75);z-index:25}#cb-hit[hidden]{display:none}
#cb-cross{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);color:#fff;font:700 30px system-ui;text-shadow:0 0 4px #000;pointer-events:none;z-index:24}#cb-cross[hidden]{display:none}`;
    document.head.appendChild(st);
    const fireBtn = document.querySelector('#cb-fire');
    fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); CB.hold = true; fire(true); });
    document.querySelector('#cb-equip').onclick = () => toggleGun(true);
    document.querySelector('#cb-sw').onclick = () => cycleGun(1); document.querySelector('#cb-gren').onclick = () => throwBomb('grenade');
    addEventListener('wheel', (e) => { if (CB.armed && L.isActive('s-drive') && !K.isUi()) cycleGun(e.deltaY > 0 ? 1 : -1); }, { passive: true });
    addEventListener('pointerup', () => (CB.hold = false));
    document.querySelector('#cb-gun').onclick = () => toggleGun();
    document.querySelector('#drive-cv').addEventListener('pointerdown', (e) => { if (e.button === 0 && e.pointerType === 'mouse' && CB.armed && E.G.mode === 'foot' && !K.isUi()) { CB.hold = true; fire(true); } });
    addEventListener('keydown', (e) => {
      if (!L.isActive('s-drive') || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
      if (e.code === 'KeyG' && !e.repeat) toggleGun();
      if (e.code === 'KeyR' && CB.armed && !e.repeat) { CB.hold = true; fire(true); }
      if (CB.armed && /^Digit[0-9]$/.test(e.code)) selectGun((+e.code.slice(5) + 9) % 10);
      if (e.code === 'KeyY' && !e.repeat) throwBomb('grenade');
      if (e.code === 'KeyB' && !e.repeat) throwBomb('sticky');
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
    const skin = look.premium ? E.canvasTex(256, 512, (c, w, hh) => { const gr = c.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#1a1f2b'); gr.addColorStop(0.5, '#38425a'); gr.addColorStop(1, '#141820'); c.fillStyle = gr; c.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) { c.fillStyle = 'rgba(212,175,55,.85)'; c.fillRect(0, y, w, 2); } for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(212,175,55,.9)'; c.fillRect(x, 0, 3, hh); } for (let k = 0; k < 140; k++) { c.fillStyle = 'rgba(255,214,120,.55)'; c.fillRect(Math.floor(Math.random() * 8) * 32 + 4, Math.floor(Math.random() * 32) * 16 + 3, 26, 12); } }, [2, 4]) : tex;
    const body = V2.box(W, h, W, look.premium ? new T.MeshStandardMaterial({ map: skin, roughness: 0.12, metalness: 0.85, emissive: '#ffffff', emissiveMap: skin, emissiveIntensity: 0.12 }) : new T.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.4, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 }), 0, h / 2 + 0.16, 0, g);
    if (look.premium) {
      const gold = E.M('#d4af37', { metalness: 0.9, roughness: 0.2 });
      for (const [x, z] of [[-W / 2, -W / 2], [W / 2, -W / 2], [-W / 2, W / 2], [W / 2, W / 2]]) V2.box(1.2, h + 2, 1.2, gold, x, h / 2 + 1, z, g, false);
      for (let k = 0; k < 3; k++) V2.box(W - k * 6, 3, W - k * 6, k % 2 ? '#111114' : gold, 0, h + 2.4 + k * 3, 0, g);
      const sp = new T.Mesh(new T.ConeGeometry(1.2, 22, 8), gold); sp.position.set(0, h + 22, 0); g.add(sp);
      V2.box(0.6, 0.6, 0.6, E.M('#ff2d2d', { emissive: '#ff0000', emissiveIntensity: 3 }), 0, h + 33.2, 0, g, false);
      // entrance: canopy on gold columns, red carpet, guards, black SUVs
      V2.box(10, 0.4, 6, '#111114', 0, 5, s * (W / 2 + 3), g); V2.box(10.2, 0.15, 6.2, gold, 0, 4.75, s * (W / 2 + 3), g, false);
      for (const x of [-4.5, 4.5]) V2.cyl(0.3, 0.3, 4.8, gold, x, 2.55, s * (W / 2 + 5.6), g, 16);
      V2.box(3, 0.03, 9, '#8b0000', 0, 0.18, s * (W / 2 + 4.5), g, false);
      for (const x of [-2.2, 2.2]) { const gd = E.person('#111114', '#111114', '#8d5524', '#111114'); gd.position.set(x, 0.16, s * (W / 2 + 6.5)); gd.rotation.y = s > 0 ? 0 : Math.PI; g.add(gd); }
      for (const x of [-9, 9]) { const suv = new T.Group(); suv.position.set(x, 0, s * (W / 2 + 8)); suv.rotation.y = Math.PI / 2; g.add(suv); const s2 = K.adapter(suv); s2.box(2, 1.1, 4.8, E.M('#0b0b0d', { metalness: 0.8, roughness: 0.15 }), 0, 0.95, 0, suv); s2.box(1.8, 0.8, 2.8, E.M('#141a22', { metalness: 0.7, roughness: 0.05 }), 0, 1.9, -0.3, suv); for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) { const w = s2.cyl(0.45, 0.45, 0.3, '#111', wx, 0.45, wz, suv, 14); w.rotation.z = Math.PI / 2; } }
    }
    body.receiveShadow = true;
    // real tower details: glass lobby, floor ledges, parapet, roof plant, antenna and aircraft light
    V2.box(W + 0.1, 4.6, W + 0.1, E.M('#1f2a36', { metalness: 0.6, roughness: 0.08, emissive: '#3a2c14', emissiveIntensity: 0.4 }), 0, 2.46, 0, g, false);
    for (let y = 9; y < h - 3; y += 10.5) V2.box(W + 0.35, 0.25, W + 0.35, look.premium ? E.M('#d4af37', { metalness: 0.9, roughness: 0.2 }) : '#c9c6bf', 0, y, 0, g, false);
    if (!look.premium) { for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) V2.box(sx ? 0.35 : W, 1.2, sz ? 0.35 : W, '#c9c6bf', sx * (W / 2 - 0.17), h + 1.9, sz * (W / 2 - 0.17), g, false); V2.box(6, 2.6, 5, '#8a8f98', -4, h + 2.6, 3, g); V2.cyl(1.5, 1.5, 3, '#7a5c3a', 5, h + 3.8, -4, g, 14); const an = V2.cyl(0.1, 0.18, 12, '#9aa3b5', 0, h + 7.3, 0, g, 6); an.castShadow = false; V2.box(0.45, 0.45, 0.45, E.M('#ff2d2d', { emissive: '#ff0000', emissiveIntensity: 3 }), 0, h + 13.4, 0, g, false); }
    V2.box(W + 0.6, 0.8, W + 0.6, look.trim, 0, 5.2, 0, g, false); V2.box(W + 0.6, 1.2, W + 0.6, look.trim, 0, h + 0.7, 0, g, false);
    const top = E.textSprite(look.title, look.titleBg, look.titleFg, 20, 3); top.position.set(0, h + 3.6, s * (W / 2 + 0.6)); g.add(top);
    V2.box(3.2, 3.4, 0.4, '#111111', 0, 1.85, s * (W / 2 + 0.1), g, false); V2.box(2.4, 2.8, 0.42, E.M(look.trim, { metalness: 0.6, roughness: 0.3 }), 0, 1.6, s * (W / 2 + 0.12), g, false);
    const sg = V2.sprite(look.door, 6, 1, look.titleBg, look.titleFg); sg.position.set(0, 6.4, s * (W / 2 + 1.2));
    E.addCol(cx - W / 2, cz - W / 2, cx + W / 2, cz + W / 2);
    const b = { id, x: cx, z: cz, w: W, d: W, h, s, type, floors: type === 'viper' ? VT_FLOORS + 1 : type === 'mafia' ? 3 : 1, g, body };
    BLD.push(b);
    K.obj({ x: cx, z: cz + s * (W / 2 + 1.4), r: 2, when: () => !IN.b && E.G.mode === 'foot' && !(type === 'viper' && destroyed(id)), label: () => (type === 'viper' ? (M().member ? '🐍 Storm the Red Vipers Tower' : '🐍 Red Vipers Tower · ⚠️ armed gang inside') : look.enter || '🕴️ Enter the Mafia Tower'), use: () => (type === 'viper' ? missionPick(b) : enter(b, 0)) }, 0, 0);
    return b;
  }
  function buildMafiaTower() {
    const l = E.RP_LOTS.mafia;
    tower('mafia', 'mafia', E.lotC(...l), l[3] === 0 ? -1 : 1, 96, { premium: true, body: '#111114', lit: '#ffd56b', dark: '#2a2a33', trim: '#d4af37', title: 'MAFIA TOWER', titleBg: '#111114', titleFg: '#d4af37', door: '🕴️ Mafia Tower · members only' });
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
    if (b.g && b.type !== 'viper') b.g.visible = false; // the outside of the tower would poke into the room
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
    (IN.unit ? LAYOUT.unit : LAYOUT[b.type] || LAYOUT.office)(b, floor);
    if (b.type === 'viper' && IN.mission === 'squad') spawnSquad();
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
    for (const a of IN.allies || []) E.scene.remove(a.m);
    IN.g = null; IN.en = []; IN.objs = []; IN.cols = []; IN.targets = []; IN.allies = []; IN.tiles = null; IN.dancers = null;
  }
  function leaveRoom() {
    if (!IN.b) return;
    const F = E.getF(), was = IN.b; clearRoom(); IN.b = null; if (was.g && was.type !== 'viper') was.g.visible = true; IN.mission = null; IN.squad = null; IN.unit = false;
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
        room({ u: hw - 2.5, v: hd - 4, r: 1.8, label: () => (K.S.apt && K.S.apt.b === b.id ? `🔑 You live here: apartment ${K.S.apt.unit} on floor ${K.S.apt.floor}` : '🔑 Rent an apartment here · $60/day'), use: () => {
          const a = K.S.apt; if (a && a.b === b.id) return K.say(`🏠 Take the elevator to floor ${a.floor}. Your door is ${a.unit}.`);
          if (!K.pay(60, '🔑 Apartment rent (first day)')) return K.say('Rent is $60 a day.');
          const fl = 1 + Math.floor(Math.random() * (b.floors - 1)); K.S.apt = { b: b.id, floor: fl, unit: `${fl}A`, paidDay: K.S.day, door: { x: b.x, z: b.z + b.s * (b.d / 2 + 1.2) } }; K.save(); L.sfx && L.sfx('win');
          K.notify(`🔑 You rented apartment ${fl}A. Take the elevator to floor ${fl}. Rent is $60 a day, paid automatically. Parcels come to this building.`);
        } });
        room({ u: 0, v: 1.2, r: 1.6, label: () => '🛋️ Sit and relax', use: () => K.activity('relax', 'Relaxing in the lobby', 6, { fun: 3, energy: 2 }) });
      } else {
        for (let v = -hd + 4; v < hd - 2; v += 5) for (const sd of [-1, 1]) {
          V2.box(0.12, 2.4, 1.2, '#8b5a33', sd * (hw - 0.12), Y0 + 1.2, v, IN.g, false);
          const no = `${f}${'ABCDEFGH'[Math.floor((v + hd) / 5) * 2 + (sd > 0 ? 1 : 0)]}`, sg = E.textSprite(no, '#16203d', '#fff', 0.9, 0.4); sg.position.set(sd * (hw - 0.3), Y0 + 2.7, v); IN.g.add(sg);
          const mine = () => K.S.apt && K.S.apt.b === b.id && K.S.apt.unit === no;
          room({ u: sd * (hw - 1), v, r: 1.2, label: () => (mine() ? `🚪 Your apartment ${no} · go in` : `🚪 Apartment ${no} · knock`), use: () => mine() ? (IN.unit = true, IN.spawn = [0, IN.hd - 2], enter(b, f)) : K.say(['🗣️ "Who is it? ...Not today, thanks!"', '🗣️ "Hi neighbour!"', '🐶 Woof! Woof!', '🔇 Nobody is home.', '🗣️ "Are you the delivery guy?"'][Math.floor(Math.random() * 5)]) });
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
      if (!MARBLE) MARBLE = E.canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#efeae2'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,110,100,.35)'; for (let k = 0; k < 40; k++) { c.lineWidth = Math.random() * 2; c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let q = 0; q < 8; q++) { x += (Math.random() - 0.5) * 80; y += Math.random() * 50; c.lineTo(x, y); } c.stroke(); } c.strokeStyle = 'rgba(212,175,55,.6)'; c.lineWidth = 3; for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(w, x); c.stroke(); } }, [3, 3]);
      const mfl = new E.T.Mesh(new E.T.PlaneGeometry(hw * 2 - 0.2, hd * 2 - 0.2), new E.T.MeshStandardMaterial({ map: MARBLE, roughness: 0.15, metalness: 0.1 })); mfl.rotation.x = -Math.PI / 2; mfl.position.y = Y0 + 0.02; mfl.receiveShadow = true; IN.g.add(mfl);
      for (const [u, v] of [[-hw / 2, 0], [hw / 2, 0]]) { const ch = new E.T.Group(); ch.position.set(u, Y0 + 3.2, v); IN.g.add(ch); const c2 = K.adapter(ch); c2.cyl(0.9, 0.3, 0.3, gold, 0, 0, 0, ch, 16); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; c2.box(0.1, 0.35, 0.1, E.M('#fff6d0', { emissive: '#ffe9a0', emissiveIntensity: 1.5 }), Math.cos(a) * 0.85, -0.25, Math.sin(a) * 0.85, ch, false); } }
      for (const [u, v] of [[-hw + 1.2, -hd / 2], [hw - 1.2, -hd / 2], [-hw + 1.2, hd / 2 - 2], [hw - 1.2, hd / 2 - 2]]) { V2.cyl(0.35, 0.35, H_IN, gold, u, Y0 + H_IN / 2, v, IN.g, 16); IN.cols.push([u - 0.4, v - 0.4, u + 0.4, v + 0.4]); }
      if (f === 0) {
        const art = E.canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#1a1410'; c.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { c.fillStyle = ['#8b0000', '#d4af37', '#2b2b2b', '#f2e6d0', '#5a3d24'][k % 5]; c.globalAlpha = 0.7; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 0, 7); c.fill(); } c.globalAlpha = 1; c.strokeStyle = '#d4af37'; c.lineWidth = 10; c.strokeRect(0, 0, w, h); });
        for (const u of [-hw / 2, hw / 2]) { const p = new E.T.Mesh(new E.T.PlaneGeometry(3, 1.9), new E.T.MeshStandardMaterial({ map: art, roughness: 0.6 })); p.position.set(u, Y0 + 2.4, -hd + 0.12); IN.g.add(p); }
        const logo = E.textSprite('M · FAMIGLIA', '#111114', '#d4af37', 5, 0.9); logo.position.set(0, Y0 + 3.3, -hd + 0.25); IN.g.add(logo);
        for (let k = -2; k <= 2; k++) { V2.box(0.15, 1, 0.9, '#c7cbd2', k * 1.4, Y0 + 0.5, hd - 6, IN.g, false); V2.box(0.6, 0.05, 0.05, E.M('#ff3b3b', { emissive: '#ff0000', emissiveIntensity: 1 }), k * 1.4 + 0.35, Y0 + 0.9, hd - 6, IN.g, false); }
        for (const s of [-1, 1]) { solid(2.6, 1, 0.8, '#3a2216', s * (hw - 3), hd - 9); V2.box(2.6, 0.7, 0.25, '#3a2216', s * (hw - 3), Y0 + 1, hd - 8.6, IN.g, false); }
        for (const s of [-1, 1]) npc('#111114', s * 2, hd - 2.6, Math.PI, '#111114');
        solid(5, 1.4, 1.1, '#3a2a1a', 0, -hd + 4.2); V2.box(5.2, 0.08, 1.6, gold, 0, Y0 + 1.14, -hd + 4.2, IN.g, false);
        const don = npc('#111114', 0, -hd + 2.8, 0, '#2b2b2b'); don.scale.setScalar(1.12);
        room({ u: 0, v: -hd + 5.7, r: 2, label: () => (M().member ? `🕴️ Don Marco: "Welcome back, ${RANKS[rankOf(M().xp)][0]}."` : '🕴️ Don Marco: "You want to join the family?"'), use: openDon });
        // armory
        solid(1, 5, 1.2, '#2b2b2b', -hw + 1, 0); for (let k = 0; k < 6; k++) V2.box(0.12, 1, 0.3, '#444', -hw + 0.4, Y0 + 2, -2 + k * 0.8, IN.g, false);
        room({ u: -hw + 2.3, v: 0, r: 1.6, label: () => (M().member ? '🔫 Armory: guns and explosives' : '🔫 Armory · members only'), use: openArmory });
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
    m.member = true; m.xp = m.xp || 0; m.since = K.S.day; m.payDay = K.S.day; ARM(); m.guns.rifle = m.guns.rifle || 1; m.guns.pistol = m.guns.pistol || 1; m.ammo.grenade += 3; K.save(); gunHud();
    L.sfx && L.sfx('win');
    K.notify(`🕴️ Welcome to the family! You are a ${RANKS[0][0]}. You got a 🔫 rifle, a pistol and 3 grenades: G takes your gun out, click or R fires, 1-9 switches guns, Y throws a grenade. Buy more at 🐍 Viper XHP. Mission: destroy the 3 Red Vipers Towers.${free ? ' (admin)' : ''}`);
    return true;
  }
  function gainXp(n, why) {
    const m = M(); if (!m.member) return; const before = rankOf(m.xp); m.xp += n;
    const after = rankOf(m.xp);
    if (after > before) { L.sfx && L.sfx('win'); K.notify(after === RANKS.length - 1 ? '👔 You are now the CEO of the Mafia Tower! Your office is on the top floor.' : `⬆️ Promoted to ${RANKS[after][0]}! Salary ${K.fmt$(RANKS[after][2])} a day.`); }
    else if (why) K.say(`+${n} XP · ${why}`, 1500);
  }
  function openArmory() { openShop(); }
  const mafiaApp = {
    id: 'mafia', icon: '🕴️', label: 'Mafia',
    html() {
      const m = M(), r = rankOf(m.xp), nx = RANKS[r + 1];
      if (!m.member) return '<p>You are not in the family. Visit Don Marco in the 🕴️ Mafia Tower to join.</p>';
      return `<div class="ph-card" style="background:linear-gradient(135deg,#111114,#3a2a1a);color:#d4af37"><small>Mafia Tower · rank</small><b>${RANKS[r][0]}</b><small>${m.xp} XP${nx ? ` · ${nx[1] - m.xp} XP to ${nx[0]}` : ' · top rank'}</small><div style="height:6px;background:#0006;border-radius:4px;margin-top:6px"><i style="display:block;height:100%;border-radius:4px;background:#d4af37;width:${nx ? Math.round(((m.xp - RANKS[r][1]) / (nx[1] - RANKS[r][1])) * 100) : 100}%"></i></div></div>
        <div class="rp-row"><span style="font-size:22px">🎯</span><div style="flex:1"><b>Mission: save the city</b><div class="muted" style="font-size:12px">Storm the 3 Red Vipers Towers, fight floor by floor up to the roof, beat the Viper King and destroy the tower.</div></div><b>${m.destroyed.length}/3</b></div>
        <div class="rp-row"><span style="font-size:22px">💀</span><b style="flex:1">Vipers defeated</b><b>${m.kills}</b></div><div class="rp-row"><span style="font-size:22px">🪜</span><b style="flex:1">Floors cleared</b><b>${m.floors}</b></div><div class="rp-row"><span style="font-size:22px">💵</span><b style="flex:1">Daily salary</b><b>${K.fmt$(RANKS[r][2])}</b></div><div class="rp-row"><span style="font-size:22px">🔫</span><b style="flex:1">Guns owned</b><b>${owned().length}/14</b></div><div class="rp-row"><span style="font-size:22px">🧍</span><b style="flex:1">Towers destroyed alone</b><b>${(m.solo || []).length}/3 → CEO</b></div>
        <p class="muted" style="font-size:12px">Ranks: ${RANKS.map((q) => `${q[0]} (${q[1]} XP)`).join(' · ')}</p>${E.RP_LOTS.vipers.map((_, i) => `<button class="btn ghost" data-vgps="${i}" style="margin:3px 0">📍 GPS to Red Vipers Tower ${i + 1}${destroyed('viper' + i) ? ' · destroyed ✅' : ''}</button>`).join('')}`;
    },
    wire() { document.querySelectorAll('#rp-win [data-vgps]').forEach((b) => (b.onclick = () => { const p = K.places.find((q) => q.name === `Red Vipers Tower ${+b.dataset.vgps + 1}`); K.setGps(p); })); },
  };

  /* ---------- weapons: 14 guns (levels 1-5), grenades, sticky bombs, missiles ---------- */
  // [id, name, icon, price, damage, seconds between shots, range, pellets, full-auto, spread]
  const GUNS = [
    ['pistol', 'Pistol', '🔫', 500, 24, 0.32, 35, 1, false, 0.05], ['revolver', 'Revolver', '🔫', 1200, 48, 0.6, 40, 1, false, 0.04],
    ['smg', 'SMG', '🔫', 2500, 15, 0.08, 30, 1, true, 0.09], ['microsmg', 'Micro SMG', '🔫', 3000, 13, 0.065, 25, 1, true, 0.12],
    ['rifle', 'Assault rifle', '🔫', 4500, 28, 0.13, 45, 1, true, 0.06], ['carbine', 'Carbine rifle', '🔫', 6000, 31, 0.12, 50, 1, true, 0.05],
    ['shotgun', 'Pump shotgun', '💥', 4000, 16, 0.9, 16, 7, false, 0.2], ['autoshot', 'Combat shotgun', '💥', 9000, 13, 0.35, 18, 7, true, 0.22],
    ['marksman', 'Marksman rifle', '🎯', 12000, 70, 0.5, 70, 1, false, 0.02], ['sniper', 'Sniper rifle', '🎯', 15000, 160, 1.4, 90, 1, false, 0.01],
    ['heavysniper', 'Heavy sniper', '🎯', 30000, 260, 1.8, 100, 1, false, 0.01], ['lmg', 'Machine gun', '🔫', 20000, 22, 0.07, 50, 1, true, 0.1],
    ['minigun', 'Minigun', '🔫', 60000, 18, 0.04, 45, 1, true, 0.12], ['rpg', 'Missile launcher', '🚀', 50000, 300, 1.6, 120, 1, false, 0],
  ].map(([id, name, icon, price, dmg, rate, range, pellets, auto, spread]) => ({ id, name, icon, price, dmg, rate, range, pellets, auto, spread }));
  const THROW = { grenade: { name: 'Grenade', icon: '💣', price: 150, dmg: 160, r: 6 }, sticky: { name: 'Sticky bomb', icon: '🧨', price: 300, dmg: 240, r: 7.5 }, missile: { name: 'Missile', icon: '🚀', price: 500 } };
  const ARM = () => { const m = M(); m.guns = m.guns || {}; m.ammo = m.ammo || { grenade: 0, sticky: 0, missile: 0 }; if (m.member && !m.guns.rifle) m.guns.rifle = m.gunLv || 1; return m; };
  const owned = () => GUNS.filter((g) => ARM().guns[g.id]);
  const gun = () => GUNS.find((g) => g.id === CB.cur && ARM().guns[g.id]) || owned()[0];
  const gunDmg = (g) => Math.round(g.dmg * (1 + 0.25 * ((ARM().guns[g.id] || 1) - 1)));
  const upCost = (g, lv) => Math.max(300, Math.round(g.price * 0.5 * lv));
  function selectGun(i) { const o = owned(); if (!o.length) return; const g = typeof i === 'number' ? o[(i + o.length) % o.length] : o.find((q) => q.id === i); if (!g) return; CB.cur = g.id; CB.cool = 0.25; gunHud(); L.sfx && L.sfx('click'); }
  function cycleGun(d) { const o = owned(), i = o.findIndex((g) => g.id === (gun() || {}).id); selectGun(i + d); }
  function gunHud() {
    const g = CB.armed ? gun() : null, m = ARM(), el = document.querySelector('#cb-wpn'); if (!el) return;
    el.innerHTML = g ? `${g.icon} <b>${g.name}</b> Lv${m.guns[g.id]}${g.id === 'rpg' ? ` · 🚀${m.ammo.missile}` : ''}<br><small>💣${m.ammo.grenade} (Y) · 🧨${m.ammo.sticky} (B) · 1-9 / wheel to switch</small>` : '';
    if (CB.gunMesh) { const big = g && (g.id === 'rpg' || g.id === 'minigun' || g.id === 'lmg'), small = g && (g.id === 'pistol' || g.id === 'revolver' || g.id === 'microsmg'); CB.gunMesh.scale.set(big ? 1.6 : 1, big ? 1.6 : 1, small ? 0.45 : big ? 1.3 : 1); CB.tube.visible = !!(g && g.id === 'rpg'); }
  }
  function openShop(tab) {
    const m = ARM(); tab = tab || 'guns';
    if (!m.member) return K.say('🔫 Viper XHP: "Weapons are for the family only. Join the 🕴️ Mafia Tower first."', 4000);
    const tabs = `<div class="lf-apps"><button data-st="guns" class="${tab === 'guns' ? 'on' : ''}">🔫 Guns</button><button data-st="boom" class="${tab === 'boom' ? 'on' : ''}">💣 Explosives</button></div>`;
    let body;
    if (tab === 'guns') body = `<div class="lf-grid">${GUNS.map((g) => { const lv = m.guns[g.id]; return `<div class="lf-card"><span class="ic">${g.icon}</span><b>${g.name}</b><p>Damage ${gunDmg(g)}${g.pellets > 1 ? '×' + g.pellets : ''} · ${g.auto ? 'full auto' : 'semi'} · range ${g.range} m</p><p>${lv ? 'Level ' + '★'.repeat(lv) + '☆'.repeat(5 - lv) : 'Not owned'}</p>${!lv ? `<button class="btn gold" data-gb="${g.id}" ${K.canPay(g.price) ? '' : 'disabled'}>Buy ${K.fmt$(g.price)}</button>` : lv < 5 ? `<button class="btn primary" data-gu="${g.id}" ${K.canPay(upCost(g, lv)) ? '' : 'disabled'}>Upgrade ${K.fmt$(upCost(g, lv))}</button>` : '<button class="btn ghost" disabled>Max level</button>'}</div>`; }).join('')}</div>`;
    else body = `<div class="lf-grid">${Object.entries(THROW).map(([id, t]) => `<div class="lf-card"><span class="ic">${t.icon}</span><b>${t.name}</b><p>${id === 'missile' ? 'Ammo for the missile launcher. Enough hits bring down a Red Vipers Tower from outside.' : `Damage ${t.dmg}, blast ${t.r} m. ${id === 'grenade' ? 'Press Y to throw.' : 'Press B to throw; it blows up after 2 seconds.'}`}</p><p>You have ${m.ammo[id]}</p><button class="btn gold" data-ab="${id}:1" ${K.canPay(t.price) ? '' : 'disabled'}>1 · ${K.fmt$(t.price)}</button> <button class="btn gold" data-ab="${id}:5" ${K.canPay(t.price * 5) ? '' : 'disabled'}>5 · ${K.fmt$(t.price * 5)}</button></div>`).join('')}</div>`;
    K.openUi(`<div class="lf-top"><h3>🐍 Viper XHP · weapons</h3><span class="pill">${K.fmt$(K.S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body">${tabs}<div style="margin-top:10px">${body}</div></div>`);
    document.querySelectorAll('#rp-win [data-st]').forEach((b) => (b.onclick = () => openShop(b.dataset.st)));
    document.querySelectorAll('#rp-win [data-gb]').forEach((b) => (b.onclick = () => { const g = GUNS.find((q) => q.id === b.dataset.gb); if (!K.pay(g.price, `🔫 ${g.name}`)) return; m.guns[g.id] = 1; CB.cur = g.id; K.save(); L.sfx && L.sfx('win'); gunHud(); openShop('guns'); }));
    document.querySelectorAll('#rp-win [data-gu]').forEach((b) => (b.onclick = () => { const g = GUNS.find((q) => q.id === b.dataset.gu), c = upCost(g, m.guns[g.id]); if (!K.pay(c, `⬆️ ${g.name} upgrade`)) return; m.guns[g.id]++; K.save(); L.sfx && L.sfx('ding'); gunHud(); openShop('guns'); }));
    document.querySelectorAll('#rp-win [data-ab]').forEach((b) => (b.onclick = () => { const [id, n] = b.dataset.ab.split(':'), t = THROW[id]; if (!K.pay(t.price * n, `${t.icon} ${t.name} ×${n}`)) return; m.ammo[id] += +n; K.save(); gunHud(); openShop('boom'); }));
  }
  // grenades and sticky bombs: thrown in an arc, then boom
  const BOOMS = [];
  function throwBomb(kind) {
    const m = ARM(); if (!m.member || E.G.mode !== 'foot' || K.isUi()) return;
    if (!m.ammo[kind]) return K.say(`No ${THROW[kind].name.toLowerCase()}s left. Buy more at 🐍 Viper XHP.`);
    m.ammo[kind]--; gunHud();
    const F = E.getF(), fx = Math.sin(F.h), fz = Math.cos(F.h), mesh = K.adapter(E.scene).box(0.25, 0.25, 0.25, kind === 'sticky' ? '#d61f30' : '#3f5a2a', F.x + fx * 0.6, F.y + 1.5, F.z + fz * 0.6, E.scene, false);
    BOOMS.push({ kind, m: mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, vx: fx * 11, vy: 5, vz: fz * 11, t: kind === 'sticky' ? 2 : 1.6 });
    L.sfx && L.sfx('whoosh', { volume: 0.4 });
  }
  function explode(x, y, z, dmg, r, fromPlayer) {
    E.wreckFx(x, z); L.sfx && L.sfx('explode'); E.G.shake = Math.max(E.G.shake || 0, 0.6);
    for (const e of IN.en) if (!e.dead) { const d = Math.hypot(e.x - x, e.z - z); if (d < r) { e.hp -= dmg * (1 - d / r * 0.6); e.alert = true; if (e.hp <= 0) kill(e); } }
    const F = E.getF(), d = Math.hypot(F.x - x, F.z - z); if (d < r * 0.7 && !fromPlayer) hurtMe(dmg * 0.3);
    // missiles and bombs outside can hit a Red Vipers Tower
    if (!IN.b) for (const b of BLD) if (b.type === 'viper' && !destroyed(b.id) && VT[b.id].collapse == null && Math.abs(x - b.x) < b.w / 2 + 3 && Math.abs(z - b.z) < b.d / 2 + 3 && y < b.h) {
      const st = VT[b.id]; st.hp = (st.hp == null ? 12 : st.hp) - (dmg >= 300 ? 1 : 0.25);
      K.say(st.hp > 0 ? `🚀 Direct hit! Tower ${Math.round((st.hp / 12) * 100)}% left` : '💥 The tower is coming down!', 1500);
      if (st.hp <= 0) { st.collapse = 0; st.by = 'missile'; }
    }
  }
  const ROCKETS = [];
  function tickBooms(dt) {
    for (let i = BOOMS.length - 1; i >= 0; i--) { const b = BOOMS[i]; b.t -= dt; if (b.y > K.Y0 + 0.15) { b.vy -= 18 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.y < K.Y0 + 0.15) { b.y = K.Y0 + 0.15; b.vx *= 0.3; b.vz *= 0.3; } if (IN.b) { const [u, v] = l2(b.x, b.z); const p = { x: K.clamp(u, -IN.hw + 0.3, IN.hw - 0.3), z: K.clamp(v, -IN.hd + 0.3, IN.hd - 0.3) }; [b.x, b.z] = w2(p.x, p.z); } } b.m.position.set(b.x, b.y, b.z); if (b.t <= 0) { E.scene.remove(b.m); BOOMS.splice(i, 1); const t = THROW[b.kind]; explode(b.x, b.y, b.z, t.dmg, t.r, true); } }
    for (let i = ROCKETS.length - 1; i >= 0; i--) {
      const r = ROCKETS[i]; r.t += dt; const step = 60 * dt; r.x += r.dx * step; r.y += r.dy * step; r.z += r.dz * step; r.m.position.set(r.x, r.y, r.z);
      if (Math.random() < 0.7) E.puff(r.x, r.y, r.z, '#cfcfcf', 0.4, 0.6, 0, 0.5, 0, 1, 0.6);
      let hit = r.t > 2.2 || r.y < K.Y0;
      for (const e of IN.en) if (!e.dead && Math.hypot(e.x - r.x, e.z - r.z) < 1.2) hit = true;
      if (IN.b) { const [u, v] = l2(r.x, r.z); if (Math.abs(u) > IN.hw || Math.abs(v) > IN.hd || IN.cols.some(([a, b2, c, d]) => u > a && u < c && v > b2 && v < d)) hit = true; }
      else for (const b of BLD) if (b.type === 'viper' && !destroyed(b.id) && Math.abs(r.x - b.x) < b.w / 2 && Math.abs(r.z - b.z) < b.d / 2 && r.y < b.h) hit = true;
      if (hit) { E.scene.remove(r.m); ROCKETS.splice(i, 1); explode(r.x, r.y, r.z, 300 * (1 + 0.25 * ((ARM().guns.rpg || 1) - 1)), 5, true); }
    }
  }
  function fireRocket() {
    const m = ARM(); if (!m.ammo.missile) { K.say('🚀 No missiles. Buy some at 🐍 Viper XHP.'); return false; }
    m.ammo.missile--; gunHud();
    const F = E.getF(), fx = Math.sin(F.h), fz = Math.cos(F.h);
    // aim up at a tower if you are outside facing one
    let dy = 0; if (!IN.b) { const t = BLD.find((b) => b.type === 'viper' && !destroyed(b.id) && Math.hypot(b.x - F.x, b.z - F.z) < 140 && Math.abs(K.wrapA(Math.atan2(b.x - F.x, b.z - F.z) - F.h)) < 0.35); if (t) dy = Math.min(0.5, 14 / Math.max(10, Math.hypot(t.x - F.x, t.z - F.z))); }
    const n = Math.hypot(1, dy), mesh = K.adapter(E.scene).box(0.18, 0.18, 0.8, '#555', F.x + fx, F.y + 1.4, F.z + fz, E.scene, false); mesh.rotation.y = F.h;
    ROCKETS.push({ m: mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, dx: fx / n, dy: dy / n, dz: fz / n, t: 0 });
    L.sfx && L.sfx('whoosh'); return true;
  }

  /* ---------- squads: the family fights with you ---------- */
  function missionPick(b) {
    if (destroyed(b.id)) return;
    const m = ARM();
    K.openUi(`<div class="lf-top"><h3>🐍 Red Vipers Tower · mission</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:480px">${m.member ? '' : '<p>⚠️ You are not in the Mafia: no rifle, no squad. You can still walk in.</p>'}<div class="lf-grid"><div class="lf-card"><span class="ic">🧍</span><b>Fight alone</b><p>Full health. Destroy all 3 towers alone and you become <b>CEO</b> instantly.</p><button class="btn primary" data-mis="solo">Go alone</button></div><div class="lf-card"><span class="ic">👥</span><b>Fight with your squad</b><p>3 family members fight with you. Your health is cut in half. When they fall, you are on your own.</p><button class="btn gold" data-mis="squad" ${m.member ? '' : 'disabled'}>Go with squad</button></div></div><p class="muted" style="margin-top:8px">Tip: from outside, a 🚀 missile launcher can bring the tower down too.</p></div>`);
    document.querySelectorAll('#rp-win [data-mis]').forEach((x) => (x.onclick = () => { K.closeUi(); IN.mission = x.dataset.mis; IN.squad = IN.mission === 'squad' ? [0, 1, 2].map((k) => ({ hp: 140, name: ['Tony', 'Rocco', 'Lena'][k] })) : []; const F = E.getF(); if (IN.mission === 'squad') F.hp = Math.min(F.hp, 50); enter(b, 0); }));
  }
  function spawnSquad() {
    if (!IN.squad) return; IN.allies = [];
    IN.squad.forEach((s, k) => {
      if (s.hp <= 0) return;
      const p = E.person('#111114', '#111114', ['#f1c27d', '#c68642', '#8d5524'][k], '#111114'); K.adapter(p).box(0.1, 0.12, 0.7, '#222', 0.38, 1.05, 0.35, p, false);
      const tag = E.textSprite(`🕴️ ${s.name}`, 'rgba(17,17,20,.8)', '#d4af37', 1.6, 0.42); tag.position.y = 2.4; p.add(tag);
      const [x, z] = w2(-1.5 + k * 1.5, IN.hd - 3); p.position.set(x, K.Y0, z); E.scene.add(p);
      IN.allies.push({ s, m: p, x, z, cool: rnd(0.5, 1.5) });
    });
  }
  function tickAllies(dt) {
    if (!IN.allies || !IN.allies.length) return; const F = E.getF();
    for (const a of IN.allies) {
      if (a.s.hp <= 0) { if (!a.dead) { a.dead = true; a.t = 0; K.say(`💀 ${a.s.name} is down!${IN.allies.every((q) => q.s.hp <= 0) ? " You're on your own now!" : ''}`, 2500); } a.t += dt; a.m.rotation.x = Math.max(-Math.PI / 2, -a.t * 4); a.m.position.y = K.Y0 + 0.15; continue; }
      // target the closest Viper you can see, otherwise stay near you
      let tg = null; for (const e of IN.en) if (!e.dead) { const d = Math.hypot(e.x - a.x, e.z - a.z); if (d < 26 && (!tg || d < tg.d) && clear(a.x, a.z, e.x, e.z)) tg = { e, d }; }
      const fx = tg ? tg.e.x : F.x - Math.sin(F.h) * 2.5 + (IN.allies.indexOf(a) - 1) * 1.5, fz = tg ? tg.e.z : F.z - Math.cos(F.h) * 2.5;
      const dx = fx - a.x, dz = fz - a.z, d = Math.hypot(dx, dz), want = tg ? (d > 9 ? 1 : 0) : d > 1.2 ? 1 : 0;
      if (want) { let [u, v] = l2(a.x + (dx / d) * 2.6 * dt, a.z + (dz / d) * 2.6 * dt); const p = { x: K.clamp(u, -IN.hw + 0.5, IN.hw - 0.5), z: K.clamp(v, -IN.hd + 0.5, IN.hd - 0.5) }; K.pushCols(p, 0, 0, IN.cols); [a.x, a.z] = w2(p.x, p.z); const w = Math.sin(performance.now() / 110) * 0.5; a.m.userData.legs[0].rotation.x = w; a.m.userData.legs[1].rotation.x = -w; }
      a.m.position.set(a.x, K.Y0, a.z); a.m.rotation.y = Math.atan2(dx, dz); a.m.userData.arms[1].rotation.x = -1.4;
      a.cool -= dt;
      if (tg && a.cool <= 0) { a.cool = rnd(0.8, 1.4); L.sfx && L.sfx('rifle', { volume: 0.2 }); tracer(a.x, K.Y0 + 1.2, a.z, tg.e.x, K.Y0 + 1.2, tg.e.z, '#ffd56b'); if (Math.random() < 0.7) { tg.e.hp -= 22; tg.e.alert = true; if (tg.e.hp <= 0) kill(tg.e, true); } }
    }
  }
  function hurtMe(n) { const F = E.getF(); F.hp -= n; E.G.shake = 0.25; L.sfx && L.sfx('hurt', { volume: 0.35 }); const h = document.querySelector('#cb-hit'); h.hidden = false; clearTimeout(CB.hitT); CB.hitT = setTimeout(() => (h.hidden = true), 180); if (F.hp <= 0) knockedOut(); }

  /* ---------- more places in town ---------- */
  const EV_TYPES = [['bday', '🎂', 'Birthday party'], ['dj', '🎧', 'DJ night'], ['launch', '🚀', 'Business launch'], ['award', '🏆', 'Award show'], ['family', '👨‍👩‍👧', 'Family get-together'], ['festival', '🪔', 'Festival party']];
  const EV_SIZES = [[20, 500], [50, 1200], [100, 2500]];
  const EV = { on: null };
  function eventUi() {
    const pick = EV.pick || (EV.pick = { type: 'bday', size: 0 });
    const html = `<p class="muted" style="margin:0 0 6px">Book the city party hall for your own event. Guests arrive, the DJ plays, the lights go wild.</p><div class="rp-cats">${EV_TYPES.map(([id, i, n]) => `<button data-et="${id}" class="${pick.type === id ? 'on' : ''}">${i} ${n}</button>`).join('')}</div><div class="rp-cats" style="margin:8px 0">${EV_SIZES.map(([n, p], i) => `<button data-es="${i}" class="${pick.size === i ? 'on' : ''}">${n} guests · ${K.fmt$(p)}</button>`).join('')}</div>${EV.on ? `<p>🎉 Your ${EV_TYPES.find((t) => t[0] === EV.on.type)[2].toLowerCase()} is happening now!</p>` : `<button class="btn gold" data-ebook="1" ${K.canPay(EV_SIZES[pick.size][1]) ? '' : 'disabled'}>Book now · ${K.fmt$(EV_SIZES[pick.size][1])}</button>`} <button class="btn ghost" data-egps="1">📍 GPS to the party hall</button>`;
    return html;
  }
  function wireEvent(re) {
    document.querySelectorAll('#rp-win [data-et]').forEach((b) => (b.onclick = () => { EV.pick.type = b.dataset.et; re(); }));
    document.querySelectorAll('#rp-win [data-es]').forEach((b) => (b.onclick = () => { EV.pick.size = +b.dataset.es; re(); }));
    const bk = document.querySelector('#rp-win [data-ebook]'); if (bk) bk.onclick = () => { const [n, p] = EV_SIZES[EV.pick.size], t = EV_TYPES.find((q) => q[0] === EV.pick.type); if (!K.pay(p, `🎉 Party hall · ${t[2]}`)) return; EV.on = { type: t[0], guests: n, t: 0 }; K.notify(`🎉 Your ${t[2].toLowerCase()} for ${n} guests is booked at the city party hall. It starts when you arrive!`); if (IN.b && IN.b.type === 'party') enter(IN.b, 0); re(); };
    const g = document.querySelector('#rp-win [data-egps]'); if (g) g.onclick = () => { const p = K.places.find((q) => q.name === 'City Party Hall'); if (p) K.setGps(p); };
  }
  const eventsApp = { id: 'events', icon: '🎉', label: 'Party Planner', html: eventUi, wire: () => wireEvent(() => K.openPhone('events')) };
  // table tennis: first to 7
  function pingPong() {
    K.closeUi(); let el = document.querySelector('#pp'); if (!el) { document.querySelector('#s-drive').insertAdjacentHTML('beforeend', '<div id="pp"><div class="pp-in"><div class="pp-score"></div><canvas width="360" height="540"></canvas><p class="muted">Move with the mouse, finger, or ← →. First to 7 wins.</p><button class="btn ghost" data-ppx="1">Quit</button></div></div>'); el = document.querySelector('#pp'); }
    el.hidden = false; const cv = el.querySelector('canvas'), g = cv.getContext('2d'), sc = el.querySelector('.pp-score');
    const P = { x: 180, ai: 180, bx: 180, by: 270, vx: 2.5, vy: 5, me: 0, cpu: 0, keys: {} };
    const serve = (dir) => { P.bx = 180; P.by = 270; P.vx = (Math.random() - 0.5) * 6; P.vy = 5.2 * dir; };
    cv.onpointermove = (e) => { const r = cv.getBoundingClientRect(); P.x = ((e.clientX - r.left) / r.width) * 360; };
    const kd = (e) => { P.keys[e.code] = e.type === 'keydown'; e.stopPropagation(); }; addEventListener('keydown', kd, true); addEventListener('keyup', kd, true);
    let raf; const end = (msg) => { cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', kd, true); el.hidden = true; if (msg) K.say(msg, 3500); };
    el.querySelector('[data-ppx]').onclick = () => end();
    const loop = () => {
      if (P.keys.ArrowLeft || P.keys.KeyA) P.x -= 7; if (P.keys.ArrowRight || P.keys.KeyD) P.x += 7; P.x = Math.max(36, Math.min(324, P.x));
      P.ai += Math.max(-4.2, Math.min(4.2, P.bx - P.ai)); P.bx += P.vx; P.by += P.vy;
      if (P.bx < 8 || P.bx > 352) P.vx *= -1;
      if (P.vy > 0 && P.by > 500 && P.by < 516 && Math.abs(P.bx - P.x) < 42) { P.vy = -Math.min(11, Math.abs(P.vy) * 1.06); P.vx += (P.bx - P.x) * 0.12; L.sfx && L.sfx('click'); }
      if (P.vy < 0 && P.by < 40 && P.by > 24 && Math.abs(P.bx - P.ai) < 42) { P.vy = Math.min(11, Math.abs(P.vy) * 1.04); P.vx += (P.bx - P.ai) * 0.1 + (Math.random() - 0.5) * 2; L.sfx && L.sfx('click'); }
      if (P.by > 545) { P.cpu++; serve(-1); } if (P.by < -5) { P.me++; L.sfx && L.sfx('ding'); serve(1); }
      g.fillStyle = '#1d5c9e'; g.fillRect(0, 0, 360, 540); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(4, 4, 352, 532); g.beginPath(); g.moveTo(180, 4); g.lineTo(180, 536); g.stroke(); g.fillStyle = '#e8e8e8'; g.fillRect(0, 266, 360, 8);
      g.fillStyle = '#d61f30'; g.fillRect(P.x - 36, 506, 72, 12); g.fillStyle = '#16203d'; g.fillRect(P.ai - 36, 22, 72, 12);
      g.fillStyle = '#ffb31a'; g.beginPath(); g.arc(P.bx, P.by, 7, 0, 7); g.fill();
      sc.textContent = `You ${P.me} : ${P.cpu} LSP Club pro`;
      if (P.me >= 7) { K.receive(25, '🏓 Table tennis win'); return end('🏆 You won the table tennis match!'); }
      if (P.cpu >= 7) return end('🏓 Close one! Practice and try again.');
      raf = requestAnimationFrame(loop);
    };
    serve(1); loop();
  }
  const SWEETS = [['🟤', 'Gulab jamun (4)', 4, { hunger: 12, fun: 8 }], ['⚪', 'Rasgulla (4)', 4, { hunger: 12, fun: 8 }], ['🟠', 'Jalebi (250 g)', 3, { hunger: 10, fun: 10 }], ['💎', 'Kaju katli (250 g)', 8, { hunger: 12, fun: 10 }], ['🟡', 'Motichoor ladoo (4)', 5, { hunger: 14, fun: 8 }], ['🍮', 'Rasmalai (2)', 5, { hunger: 12, fun: 9 }], ['🍰', 'Chocolate pastry', 4, { hunger: 10, fun: 9 }], ['🍩', 'Glazed donut box', 6, { hunger: 16, fun: 10 }], ['🥛', 'Mango lassi', 3, { energy: 8, fun: 5 }]];
  const MORE_LAYOUT = {
    hospital(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(6, 1, 1.1, '#ffffff', 0, -hd + 4); npc('#ffffff', -1.5, -hd + 3, 0); npc('#14c79a', 1.5, -hd + 3, 0);
      const sg = E.textSprite('🏥 LSP HOSPITAL · EMERGENCY', '#ffffff', '#d61f30', 6, 0.8); sg.position.set(0, Y0 + 3.3, -hd + 0.2); IN.g.add(sg);
      for (let k = 0; k < 6; k++) { const u = -hw + 2 + k * 1.1; V2.box(0.9, 0.45, 0.9, '#2f6bff', u, Y0 + 0.23, hd - 5, IN.g, false); }
      for (let k = 0; k < 4; k++) { const u = -hw + 3 + k * ((hw * 2 - 6) / 3); solid(1.2, 2.2, 0.6, '#e9edf4', u, -hd + 8); V2.box(1, 0.15, 1.8, '#9fd4ff', u, Y0 + 0.68, -hd + 8, IN.g, false); V2.box(0.05, 2.2, 2.6, E.M('#bfe4ff', { transparent: true, opacity: 0.5 }), u + 0.9, Y0 + 1.1, -hd + 8, IN.g, false); }
      room({ u: 0, v: -hd + 5.4, r: 2, label: () => '🩺 Doctor: full checkup · $30', use: () => { if (!K.pay(30, '🏥 Doctor visit')) return K.say('You need $30.'); E.getF().hp = 100; K.activity('doctor', 'Getting checked by the doctor', 4, { energy: 6, hygiene: 3 }); } });
      room({ u: hw - 2, v: hd - 5, r: 1.8, label: () => '💊 Pharmacy: vitamins and energy drinks', use: () => menu('💊 Pharmacy', [['💊', 'Vitamins', 6, { energy: 10 }], ['🧃', 'Electrolyte drink', 3, { energy: 8 }], ['🩹', 'First aid kit', 8, { hygiene: 6 }]]) });
    },
    xhp(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      const sg = E.textSprite('🐍 VIPER XHP · ARMS & EXPLOSIVES', '#111114', '#ff3b3b', 7, 0.9); sg.position.set(0, Y0 + 3.3, -hd + 0.2); IN.g.add(sg);
      solid(10, 1, 1.1, '#2b2b2b', 0, -hd + 4.5); V2.box(10.2, 0.06, 1.2, E.M('#9fd3f2', { transparent: true, opacity: 0.5 }), 0, Y0 + 1.15, -hd + 4.5, IN.g, false);
      npc('#111114', 0, -hd + 3.4, 0, '#d61f30');
      for (let k = 0; k < 14; k++) { const u = -hw + 1 + (k % 7) * ((hw * 2 - 2) / 6), y = Y0 + 1.6 + Math.floor(k / 7) * 0.9; V2.box(0.9, 0.18, 0.12, '#1d1d1d', u, y, -hd + 0.2, IN.g, false); }
      for (const s of [-1, 1]) { solid(0.8, 8, 1.6, '#3a3a3a', s * (hw - 0.8), 0); for (let k = 0; k < 6; k++) V2.box(0.2, 0.3, 0.3, k % 2 ? '#3f5a2a' : '#d61f30', s * (hw - 0.8), Y0 + 1.75, -3 + k, IN.g, false); }
      room({ u: 0, v: -hd + 6, r: 2.5, label: () => '🔫 Viper XHP: 14 guns, grenades, bombs, missiles', use: () => openShop() });
    },
    party(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(hw * 1.2, 2.6, 1, '#16203d', 0, -hd + 1.6); solid(2.4, 1, 1.1, '#2b2b2b', 0, -hd + 3.4); npc('#8a5cff', 0, -hd + 2.5, 0, '#111');
      IN.tiles = []; for (let u = -4; u <= 4; u += 2) for (let v = -2; v <= 4; v += 2) { const m = E.M('#8a5cff', { emissive: '#8a5cff', emissiveIntensity: 0.8 }).clone(); IN.tiles.push(m); V2.box(1.9, 0.04, 1.9, m, u, Y0 + 0.03, v - hd / 3, IN.g, false); }
      for (const [u, v] of [[-hw + 3, hd - 4], [hw - 3, hd - 4], [-hw + 3, 2], [hw - 3, 2]]) { solid(1.6, 1.6, 0.75, '#ffffff', u, v); IN.V2.cyl(0.2, 0.2, 0.4, '#ff4d8b', u, Y0 + 0.95, v, IN.g, 10); }
      const sg = E.textSprite('🎉 CITY PARTY HALL', '#16203d', '#ffb31a', 5, 0.8); sg.position.set(0, Y0 + 3.4, -hd + 0.3); IN.g.add(sg);
      room({ u: 0, v: -hd + 5, r: 2.5, label: () => (EV.on ? `🎉 Your ${EV_TYPES.find((t) => t[0] === EV.on.type)[2].toLowerCase()} is on! Dance` : '🎉 Organize your own event here'), use: () => { if (EV.on) return K.activity('dance', 'Dancing at your party', 8, { fun: 14, energy: -2 }); K.openUi(`<div class="lf-top"><h3>🎉 City Party Hall</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:520px">${eventUi()}</div>`); wireEvent(() => K.closeUi()); } });
      if (EV.on) { const n = Math.min(18, Math.round(EV.on.guests / 5)); IN.dancers = []; for (let k = 0; k < n; k++) { const p = npc(['#ff4d8b', '#14c79a', '#ffb31a', '#8a5cff', '#2f6bff', '#ff8a3d'][k % 6], rnd(-5, 5), rnd(-hd / 3 - 3, -hd / 3 + 5), rnd(0, 6)); IN.dancers.push(p); } }
    },
    club(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      for (const u of [-hw / 2, hw / 2]) { solid(1.6, 2.8, 0.76, '#1d5c9e', u, -hd + 5); V2.box(1.65, 0.3, 0.04, '#ffffff', u, Y0 + 0.92, -hd + 5, IN.g, false); }
      solid(1.4, 2.5, 0.85, '#0f5a2a', -hw / 2, 2); V2.cyl(0.4, 0.4, 0.04, '#d61f30', hw - 0.15, Y0 + 1.7, 0, IN.g, 20).rotation.z = Math.PI / 2;
      solid(5, 1, 1.1, '#2b2b2b', hw / 2, hd - 5); npc('#2b2b2b', hw / 2, hd - 5.9, 0);
      const sg = E.textSprite('🏓 LSP CLUB', '#111114', '#14c79a', 4, 0.8); sg.position.set(0, Y0 + 3.3, -hd + 0.2); IN.g.add(sg);
      for (const u of [-hw / 2, hw / 2]) room({ u, v: -hd + 6.8, r: 1.8, label: () => '🏓 Play table tennis', use: pingPong });
      room({ u: -hw / 2, v: 3.6, r: 1.8, label: () => '🎱 Play pool', use: () => K.activity('play', 'Playing pool', 8, { fun: 12 }) });
      room({ u: hw - 2.5, v: 0, r: 1.8, label: () => '🎯 Throw darts', use: () => K.activity('play', 'Throwing darts', 6, { fun: 9 }) });
      room({ u: hw / 2, v: hd - 3.6, r: 2, label: () => '🍹 Club bar · scan to pay', use: () => menu('🍹 LSP Club bar', [['🍹', 'Virgin mojito', 4, { fun: 8, energy: 4 }], ['🥤', 'Cola float', 3, { fun: 6, energy: 6 }], ['🍟', 'Loaded fries', 5, { hunger: 22 }], ['🍕', 'Mini pizzas', 6, { hunger: 26 }]]) });
    },
    sweets(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      for (const u of [-hw / 2, hw / 2]) { solid(hw * 0.8, 1, 1.1, '#ffffff', u, -hd + 4); V2.box(hw * 0.8, 0.5, 0.9, E.M('#cfe8ff', { transparent: true, opacity: 0.4 }), u, Y0 + 1.35, -hd + 4, IN.g, false); for (let k = 0; k < 10; k++) V2.box(0.3, 0.15, 0.3, ['#7a3e1d', '#f4f1ea', '#ff8a3d', '#e8e2d0', '#ffd23f'][k % 5], u - hw * 0.35 + k * hw * 0.08, Y0 + 1.15, -hd + 4, IN.g, false); }
      npc('#ff8a3d', -hw / 2, -hd + 2.8, 0); npc('#ff8a3d', hw / 2, -hd + 2.8, 0);
      const sg = E.textSprite('🍬 LSP SWEETS · MITHAI & BAKERY', '#ff8a3d', '#ffffff', 6, 0.8); sg.position.set(0, Y0 + 3.3, -hd + 0.2); IN.g.add(sg);
      for (const [u, v] of [[-3, 3], [3, 3]]) { solid(1.2, 1.2, 0.75, '#ffffff', u, v); }
      room({ u: 0, v: -hd + 5.6, r: 3, label: () => '🍬 Buy sweets · scan to pay', use: () => menu('🍬 LSP Sweets', SWEETS) });
    },
    cafe(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(7, 1, 1.1, '#6b4a2f', 0, -hd + 3.5); V2.box(0.8, 0.6, 0.5, '#9aa3b5', -2, Y0 + 1.4, -hd + 3.3, IN.g, false); npc('#14c79a', 0, -hd + 2.4, 0, '#6b4a2f');
      const board = E.textSprite('☕ Latte $4 · Cold coffee $4 · Masala chai $2 · Muffin $3', '#2b2b2b', '#ffffff', 8, 0.7); board.position.set(0, Y0 + 3, -hd + 0.2); IN.g.add(board);
      for (const [u, v] of [[-hw + 3, 0], [-hw + 3, 4], [hw - 3, 0], [hw - 3, 4], [0, hd - 4]]) { solid(1.2, 1.2, 0.75, '#ffffff', u, v); for (const s of [-1, 1]) V2.box(0.5, 0.45, 0.5, '#14c79a', u + s, Y0 + 0.23, v, IN.g, false); }
      room({ u: 0, v: -hd + 5, r: 2.2, label: () => '☕ Order at the counter · scan to pay', use: () => menu('☕ Café', [['☕', 'Latte', 4, { energy: 12 }], ['🧋', 'Cold coffee', 4, { energy: 12, fun: 3 }], ['🍵', 'Masala chai', 2, { energy: 8 }], ['🧁', 'Blueberry muffin', 3, { hunger: 14 }], ['🥪', 'Grilled sandwich', 5, { hunger: 26 }]]) });
    },
    restaurant(b) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      for (let u = -hw + 3; u <= hw - 3; u += 4.5) for (let v = -hd + 4; v <= hd - 5; v += 4) { solid(1.6, 1.6, 0.78, E.M('#ffffff'), u, v); V2.cyl(0.08, 0.08, 0.3, '#ffd23f', u, Y0 + 0.95, v, IN.g, 8); for (const s of [-1, 1]) V2.box(0.55, 0.5, 0.55, '#7a0f16', u + s * 1.2, Y0 + 0.25, v, IN.g, false); }
      npc('#111114', -hw + 2, hd - 3, Math.PI);
      const sg = E.textSprite('🍽️ LA TERRAZA · FINE DINING', '#111114', '#d4af37', 6, 0.8); sg.position.set(0, Y0 + 3.3, -hd + 0.2); IN.g.add(sg);
      room({ u: -hw + 2, v: hd - 4.4, r: 2, label: () => '🍽️ Waiter: "Table for one?"', use: () => menu('🍽️ La Terraza', [['🧀', 'Paneer tikka', 12, { hunger: 40, fun: 8 }], ['🍛', 'Butter chicken + naan', 15, { hunger: 55, fun: 8 }], ['🍝', 'Truffle pasta', 18, { hunger: 50, fun: 10 }], ['🥗', 'Caesar salad', 9, { hunger: 30, energy: 4 }], ['🍨', 'Chocolate lava cake', 8, { hunger: 14, fun: 14 }]]) });
    },
    unit(b, f) {
      const { hw, hd } = IN, V2 = IN.V2, Y0 = K.Y0;
      solid(3, 1, 0.8, '#4f6bd8', -hw + 3, 1); V2.box(2.2, 1.2, 0.08, '#16181f', -hw + 3, Y0 + 1.3, -2.4, IN.g, false);
      solid(4.5, 0.8, 0.95, '#f2f3f5', hw - 3, -hd + 0.6); solid(1, 0.8, 2, '#e7ebf2', hw - 6, -hd + 0.6);
      solid(2.2, 2.8, 0.5, '#8b6b4a', -hw + 2.2, -hd + 2); V2.box(2, 0.2, 2.2, '#8a5cff', -hw + 2.2, Y0 + 0.6, -hd + 2.2, IN.g, false);
      solid(1.6, 0.8, 0.78, '#8b6b4a', 0, -hd + 0.6); V2.box(0.6, 0.03, 0.4, '#c3cad8', 0, Y0 + 0.8, -hd + 0.6, IN.g, false);
      V2.box(1.5, 0.05, 1.5, '#c9d7e8', hw - 1.2, Y0 + 0.03, hd - 4, IN.g, false); V2.box(0.06, 2.2, 1.5, E.M('#cfe8ff', { transparent: true, opacity: 0.35 }), hw - 2, Y0 + 1.1, hd - 4, IN.g, false);
      const no = K.S.apt && K.S.apt.unit; const sg = E.textSprite(`🏠 Apartment ${no || ''}`, '#16203d', '#fff', 3, 0.6); sg.position.set(0, Y0 + 3.3, hd - 0.3); IN.g.add(sg);
      room({ u: -hw + 2.2, v: -hd + 4, r: 1.6, label: () => '🛏️ Sleep', use: () => K.sleepUi(null, 14) });
      room({ u: -hw + 3, v: 2.4, r: 1.6, label: () => '📺 Watch TV', use: () => K.activity('tv', 'Watching TV', 99, { fun: 5, energy: 0.5 }) });
      room({ u: hw - 6, v: -hd + 2.4, r: 1.4, label: () => '🧊 Fridge', use: K.openFridge });
      room({ u: hw - 3, v: -hd + 2, r: 1.4, label: () => '🍳 Cook', use: K.openStove });
      room({ u: 0, v: -hd + 1.9, r: 1.3, label: () => '💻 Laptop: jobs, store, bank', use: () => K.openLaptop('jobs') });
      room({ u: hw - 1.2, v: hd - 5.4, r: 1.4, label: () => '🚿 Shower', use: () => K.activity('shower', 'Showering', 5, { hygiene: 22 }) });
      room({ u: 0, v: hd - 0.9, r: 1.6, label: () => '🚪 Back to the hallway', use: () => { IN.unit = false; IN.spawn = [0, -IN.hd + 3]; enter(b, f); } });
    },
  };

  Object.assign(LAYOUT, MORE_LAYOUT);
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
    if (!M().member || !owned().length) return K.say('🔫 Join the 🕴️ Mafia Tower to get your first guns.');
    CB.armed = on === undefined ? !CB.armed : on; L.sfx && L.sfx('click');
    document.querySelector('#cb-ui').hidden = !CB.armed; document.querySelector('#cb-cross').hidden = !CB.armed; gunHud();
    if (CB.armed) K.say(`${gun().icon} ${gun().name} out. Click, R or FIRE to shoot · 1-9 switch · Y grenade · B sticky bomb · G put away.`, 3000);
  }
  function fire(first) {
    if (!CB.armed || E.G.mode !== 'foot' || K.isUi() || CB.cool > 0 || E.G.paused) return;
    const g = gun(); if (!g) return; if (!g.auto && !first) return;
    CB.cool = g.rate;
    if (g.id === 'rpg') { if (fireRocket()) CB.flash = 0.08; return; }
    const F = E.getF(), fx = Math.sin(F.h), fz = Math.cos(F.h), y = F.y + 1.35;
    L.sfx && L.sfx('rifle', { volume: g.id.includes('sniper') ? 0.8 : 0.45 }); CB.flash = 0.05;
    const cone = (d) => 0.1 + 1.2 / Math.max(2, d) + g.spread;
    for (let p = 0; p < g.pellets; p++) {
      const jit = (Math.random() - 0.5) * g.spread * 2;
      let best = null;
      for (const e of IN.en) { if (e.dead) continue; const dx = e.x - F.x, dz = e.z - F.z, d = Math.hypot(dx, dz), a = Math.abs(K.wrapA(Math.atan2(dx, dz) - F.h - jit)); if (d < g.range && a < cone(d) && (!best || a < best.a) && clear(F.x, F.z, e.x, e.z)) best = { e, a, d }; }
      for (const t of IN.targets) { const dx = t.x - F.x, dz = t.z - F.z, d = Math.hypot(dx, dz), a = Math.abs(K.wrapA(Math.atan2(dx, dz) - F.h - jit)); if (d < g.range && a < cone(d) && (!best || a < best.a)) best = { t, a, d }; }
      if (best && best.e) {
        const e = best.e; tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, e.x, K.Y0 + 1.3 * (e.boss ? 1.3 : 1), e.z, '#ffd56b');
        const falloff = g.pellets > 1 ? Math.max(0.3, 1 - best.d / g.range) : 1;
        e.hp -= gunDmg(g) * falloff; e.alert = true; if (p === 0) L.sfx && L.sfx('hit', { volume: 0.4 }); E.puff(e.x, K.Y0 + 1.3, e.z, '#b3162a', 0.3, 0.4, 0, 1, 0, 1.5, 0.8);
        if (e.hp <= 0) kill(e);
      } else if (best && best.t) {
        const t = best.t; tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, t.x, K.Y0 + 1.3, t.z, '#ffd56b'); t.t = 0.4; if (p === 0) L.sfx && L.sfx('ding', { volume: 0.4 });
        const m = M(); if ((m.rangeDay || 0) !== K.S.day) { m.rangeDay = K.S.day; m.rangeXp = 0; } if (m.rangeXp < 60 && p === 0) { m.rangeXp++; gainXp(1); }
      } else if (p < 3) { const a = F.h + jit; tracer(F.x + fx * 0.6, y, F.z + fz * 0.6, F.x + Math.sin(a) * g.range, y, F.z + Math.cos(a) * g.range, '#ffd56b'); }
    }
  }
  function kill(e, byAlly) {
    e.dead = true; e.hp = 0; L.sfx && L.sfx(e.boss ? 'explode' : 'hurt', { volume: 0.5 });
    const m = M(); m.kills++; gainXp(e.boss ? 150 : 10, e.boss ? 'Viper King defeated!' : 'Viper down');
    const cash = e.boss ? 2000 : 20 + Math.floor(Math.random() * 40); if (e.boss) K.receive(cash, '👑 Viper King\'s cash'); else { K.S.cash += cash; K.txn('🐍 Cash from a Viper', cash); K.hud(); }
    if (IN.b && IN.b.type === 'viper' && !left()) { VT[IN.b.id].cleared.add(IN.floor); m.floors++; gainXp(40, IN.floor === VT_FLOORS ? '' : 'Floor cleared! Take the stairs up'); K.say(IN.floor === VT_FLOORS ? '💣 The roof is clear. Plant the charge on the tower core!' : '✅ Floor cleared! Take the stairs up.', 3000); }
    if (IN.b && IN.b.type === 'den' && !left()) K.say('✅ Den cleared! Grab the cash stash by the back wall.', 3000);
    K.save();
  }
  function knockedOut() {
    document.querySelector('#cb-hit').hidden = true;
    const was = IN.b; window.LSPDrive.fail(was && was.type === 'viper' ? 'The Red Vipers took you down.' : was && was.type === 'den' ? 'The Red Vipers in the den took you down.' : 'You were taken down.');
  }
  function plantCharge(b) {
    const st = VT[b.id]; st.planted = true; st.timer = 10; st.solo = IN.mission !== 'squad'; L.sfx && L.sfx('beep');
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
        const m = M(); if (!m.destroyed.includes(b.id)) m.destroyed.push(b.id); m.ruinDay = K.S.day; st.hp = null;
        if (st.solo || st.by === 'missile') { m.solo = [...new Set([...(m.solo || []), b.id])]; if (m.solo.length >= 3 && m.member && rankOf(m.xp) < RANKS.length - 1) { m.xp = Math.max(m.xp, RANKS[RANKS.length - 1][1]); K.notify('👔 You took down all 3 Red Vipers Towers ALONE. Don Marco makes you CEO of the Mafia Tower, starting today!'); } }
        st.solo = false; st.by = null;
        gainXp(400, 'Red Vipers Tower destroyed!'); K.receive(10000, '🐍 Reward for a Red Vipers Tower');
        if (m.destroyed.length >= 3) { m.saved = (m.saved || 0) + 1; K.receive(50000, '🌍 You saved the city'); gainXp(1000); K.notify('🌍 All three Red Vipers Towers are down. You saved the city! The family will remember this.'); L.sfx && L.sfx('win'); }
        else K.notify(`💥 Red Vipers Tower destroyed! ${3 - m.destroyed.length} to go.`);
        K.save();
      }
    }
  }

  /* ---------- the module ---------- */
  const CITY = {
    apps: [mafiaApp, eventsApp],
    maxHp: () => (IN.b && IN.b.type === 'viper' && IN.mission === 'squad' ? 50 : 100),
    inFight: () => IN.en.some((e) => !e.dead && e.alert),
    died() { leaveRoom(); BOOMS.splice(0).forEach((b) => E.scene.remove(b.m)); },
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
      { const eq = document.querySelector('#cb-equip'), show = M().member && !CB.armed && E.G.mode === 'foot' && !K.isUi(); if (eq.hidden === show) eq.hidden = !show; }
      CB.cool -= dt; if (CB.hold && CB.armed) fire(false);
      collapseTick(dt); tickBooms(dt); tickAllies(dt);
      if (K.S.apt && K.S.apt.paidDay !== K.S.day) { K.S.apt.paidDay = K.S.day; if (!K.pay(60, '🔑 Apartment rent')) { K.notify('🔑 You could not pay rent, so you moved out of your apartment.'); K.S.apt = null; } K.save(); }
      if (EV.on && IN.b && IN.b.type === 'party') { EV.on.t += dt; const k = Math.floor(EV.on.t * 3); if (IN.tiles) IN.tiles.forEach((m, i) => m.emissive.setHSL(((i * 0.13 + k * 0.07) % 1), 1, 0.5)); if (IN.dancers) IN.dancers.forEach((p, i) => { p.position.y = K.Y0 + Math.abs(Math.sin(EV.on.t * 6 + i)) * 0.25; p.rotation.y += dt * (i % 2 ? 1 : -1); p.userData.arms.forEach((a) => (a.rotation.x = -1.5 - Math.sin(EV.on.t * 6 + i) * 1)); }); if (Math.random() < dt * 3) E.puff(rnd(IN.b.x - 6, IN.b.x + 6), 3.5, rnd(IN.b.z - 6, IN.b.z + 6), ['#ff4d8b', '#ffd23f', '#14c79a', '#2f6bff'][Math.floor(Math.random() * 4)], 0.3, 0.2, 0, -1, 0, 0, 2); K.addNeeds({ fun: 0.5 }, dt); if (EV.on.t > 180) { K.notify('🎉 Your event was a big success! Everyone had a great time.'); EV.on = null; enter(IN.b, 0); } }
      // salary and slow XP for members
      if (m.member) { if (m.payDay !== K.S.day) { m.payDay = K.S.day; const r = rankOf(m.xp); K.receive(RANKS[r][2], `🕴️ Mafia salary (${RANKS[r][0]})`); gainXp(20); K.save(); } }
      for (const t of IN.targets) if (t.t > 0) { t.t -= dt; t.m.rotation.x = t.t > 0 ? -1.2 : 0; }
      for (let i = IN.fx.length - 1; i >= 0; i--) { const f = IN.fx[i]; f.t -= dt; if (f.t <= 0) { E.scene.remove(f.o); f.o.geometry.dispose(); IN.fx.splice(i, 1); } }
      if (!IN.b) return;
      let hurt = false;
      for (const e of IN.en) {
        if (e.dead) { e.dt += dt; e.m.rotation.x = Math.max(-Math.PI / 2, -e.dt * 4); e.m.position.y = K.Y0 + 0.15; continue; }
        let T0 = { x: F.x, z: F.z, me: true }; { let dm = Math.hypot(F.x - e.x, F.z - e.z); for (const a of IN.allies || []) if (a.s.hp > 0) { const da = Math.hypot(a.x - e.x, a.z - e.z); if (da < dm - 2) { dm = da; T0 = { x: a.x, z: a.z, a }; } } }
        const dx = T0.x - e.x, dz = T0.z - e.z, d = Math.hypot(dx, dz), sees = d < 30 && clear(e.x, e.z, T0.x, T0.z);
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
          const hit = Math.random() < K.clamp(0.6 - d / 55 - (T0.me ? Math.hypot(F.vx, F.vz) * 0.05 : 0), 0.12, 0.6);
          tracer(e.x, K.Y0 + 1.2 * (e.boss ? 1.3 : 1), e.z, T0.x + (hit ? 0 : rnd(-1.5, 1.5)), K.Y0 + 1.2, T0.z + (hit ? 0 : rnd(-1.5, 1.5)), '#ff5a5a');
          if (hit && T0.a) T0.a.s.hp -= e.boss ? 14 : 8;
          else if (hit) { F.hp -= e.boss ? 12 : 6; hurt = true; E.G.shake = 0.25; L.sfx && L.sfx('hurt', { volume: 0.35 }); if (F.hp <= 0) return knockedOut(); }
        }
      }
      if (hurt) { const h = document.querySelector('#cb-hit'); h.hidden = false; clearTimeout(CB.hitT); CB.hitT = setTimeout(() => (h.hidden = true), 180); }
    },
    frame() {
      const F = E.getF(); if (!F.m) return;
      // the rifle in your hands
      if (!CB.gun) { const g = new E.T.Group(), V2 = K.adapter(g); V2.box(0.09, 0.14, 0.95, '#1d1d1d', 0, 0, 0.25, g, false); V2.box(0.07, 0.2, 0.12, '#1d1d1d', 0, -0.13, 0.05, g, false); V2.box(0.06, 0.06, 0.3, '#3a3a3a', 0, 0.09, 0.2, g, false); V2.box(0.1, 0.12, 0.3, '#6b4a2f', 0, -0.02, -0.28, g, false); CB.flashM = V2.box(0.16, 0.16, 0.16, E.M('#ffd56b', { emissive: '#ffb31a', emissiveIntensity: 2 }), 0, 0, 0.78, g, false); CB.tube = V2.cyl(0.16, 0.16, 1.3, '#3f5a2a', 0, 0.08, 0.2, g, 12); CB.tube.rotation.x = Math.PI / 2; CB.tube.visible = false; g.position.set(0.2, 1.22, 0.32); CB.gun = g; CB.gunMesh = g; gunHud(); }
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
  window.LSPDriveCity = { _leave: () => leaveRoom(), _sel: (id) => { CB.armed = true; selectGun(id); }, join: (admin) => (K ? join(admin) : false), killAll() { let n = 0; for (const e of IN.en) if (!e.dead) { kill(e); n++; } return n; }, _IN: IN, _enter: (id, f) => enter(BLD.find((b) => b.id === id), f || 0), _BLD: BLD, _VT: VT };
  const hook = () => (window.LSPDriveRP ? window.LSPDriveRP.ext(CITY) : setTimeout(hook, 50)); hook();
})();
