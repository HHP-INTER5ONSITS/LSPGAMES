/* LSP Drive roleplay, Brookhaven style: claim a house in the city, walk in, live
 * there (sleep, shower, cook, TV, laptop jobs), shop at the supermarket, and
 * watch day turn to night. Money, needs, food and furniture are the same save
 * as the LSP Life game, so progress carries over both ways.
 */
(function () {
  'use strict';
  const L = LSPG;
  const FOODS = {
    bread: { name: 'Bread', icon: '🍞', price: 4, fill: 18 }, milk: { name: 'Milk', icon: '🥛', price: 3, fill: 10, energy: 4 },
    eggs: { name: 'Eggs', icon: '🥚', price: 5, fill: 0, ingredient: true }, veg: { name: 'Vegetables', icon: '🥦', price: 6, fill: 0, ingredient: true },
    pasta: { name: 'Pasta', icon: '🍝', price: 7, fill: 0, ingredient: true }, apple: { name: 'Apples', icon: '🍎', price: 3, fill: 12 },
    pizza: { name: 'Frozen pizza', icon: '🍕', price: 12, fill: 45, fun: 6 }, snack: { name: 'Chips', icon: '🍿', price: 3, fill: 8, fun: 8 },
    juice: { name: 'Juice', icon: '🧃', price: 3, fill: 8, energy: 6 }, icecream: { name: 'Ice cream', icon: '🍦', price: 5, fill: 10, fun: 12 },
  };
  const SHELVES = [['bread', 'milk', 'eggs', 'veg', 'apple'], ['pasta', 'pizza', 'snack', 'juice', 'icecream']];
  const RECIPES = [
    { id: 'omelette', name: 'Veggie omelette', icon: '🍳', need: { eggs: 1, veg: 1 }, fill: 60, fun: 6 },
    { id: 'pasta', name: 'Pasta dinner', icon: '🍝', need: { pasta: 1, veg: 1 }, fill: 75, fun: 10 },
    { id: 'toast', name: 'Egg toast', icon: '🥪', need: { bread: 1, eggs: 1 }, fill: 45, fun: 4 },
  ];
  const FURNI = [
    { id: 'bigtv', name: 'Big Smart TV', icon: '📺', price: 450, desc: 'Watching TV is twice as fun.' }, { id: 'console', name: 'Game console', icon: '🎮', price: 600, desc: 'Play games for lots of fun.' },
    { id: 'coffee', name: 'Coffee machine', icon: '☕', price: 250, desc: 'A quick energy boost.' }, { id: 'goodbed', name: 'Memory-foam bed', icon: '🛏️', price: 700, desc: 'Recover energy 50% faster.' },
    { id: 'rug', name: 'Cozy rug', icon: '🟫', price: 80, desc: 'Makes the living room cozy.' }, { id: 'plant', name: 'House plants', icon: '🪴', price: 60, desc: 'A little green in every room.' },
    { id: 'shelf', name: 'Bookshelf', icon: '📚', price: 150, desc: 'Read a book for fun.' }, { id: 'pc', name: 'Pro laptop', icon: '💻', price: 900, desc: 'Laptop jobs pay 25% more.' },
    { id: 'bath', name: 'Bathtub', icon: '🛁', price: 500, desc: 'A relaxing bath.' }, { id: 'aquarium', name: 'Aquarium', icon: '🐠', price: 350, desc: 'Watch the fish to relax.' },
  ];
  const JOBS = [{ id: 'type', name: 'Typist', icon: '⌨️', desc: 'Type sentences exactly.' }, { id: 'code', name: 'Junior coder', icon: '🧑‍💻', desc: 'Pick what the code prints.' }, { id: 'support', name: 'Customer support', icon: '🎧', desc: 'Pick the most helpful reply.' }];
  const SENTENCES = ['The quick brown fox jumps over the lazy dog.', 'Please send the report before five o clock.', 'Thank you for shopping at LSP Market today.', 'Our team will reply to your message soon.', 'Save your work often so nothing gets lost.', 'Fresh mangoes are on sale this week only.', 'Meeting moved to Tuesday at ten in the morning.', 'Your order has been packed and shipped.'];
  const CODE = [
    { c: 'let a = 2;\na = a + 3;\nprint(a);', o: ['5', '23', '6'], a: 0 }, { c: 'let s = "Hi";\nprint(s + s);', o: ['Hi Hi', 'HiHi', '2'], a: 1 },
    { c: 'let t = 0;\nfor (let i = 1; i <= 3; i++) t += i;\nprint(t);', o: ['3', '6', '123'], a: 1 }, { c: 'let list = [4, 7, 9];\nprint(list.length);', o: ['3', '9', '20'], a: 0 },
    { c: 'let x = 7 % 3;\nprint(x);', o: ['2', '1', '4'], a: 1 }, { c: 'let k = 3;\nk = k * k;\nprint(k);', o: ['6', '9', '33'], a: 1 }, { c: 'print(10 / 4);', o: ['2', '2.5', '2.4'], a: 1 },
  ];
  const SUPPORT = [
    { q: 'My parcel is 3 days late!', o: ['Not our problem.', 'Sorry about the wait! I will check the tracking and update you today.', 'Wait longer.'], a: 1 },
    { q: 'I forgot my password.', o: ['Make a new account.', 'Click "Forgot password" and we will email you a reset link.', 'Guess it.'], a: 1 },
    { q: 'The shoes are too small.', o: ['You can exchange them free within 30 days. Shall I start that?', 'Buy bigger ones.', 'No refunds.'], a: 0 },
    { q: 'I was charged twice.', o: ['Sorry! I have refunded the extra charge. It takes 3-5 days.', 'Banks make mistakes.', 'Be careful.'], a: 0 },
    { q: 'Can I change my delivery address?', o: ['No.', 'Yes! If it has not shipped I can change it now. What is the new address?', 'Ask the courier.'], a: 1 },
  ];
  const HOUSE_COLORS = [['#f6ead6', '#b5533c'], ['#dff0ff', '#2f5fa8'], ['#f3e1ff', '#6a3fa0']];
  const DAY_MIN = 1440, MIN_PER_SEC = 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), fmt$ = (n) => '$' + Math.floor(n).toLocaleString();
  const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  let E = null, S = null, DB = null, V = null, ui = false, act = null, cart = [], shift = null, near = null, tick = 0;
  const OBJ = [], BUILD = [], D3 = {};
  const save = () => DB && S && DB.save(S);
  const has = (id) => S && S.owned.includes(id);
  const hour = () => Math.floor(S.time / 60), clockTxt = (t) => { const tt = t == null ? S.time : t, h = Math.floor(tt / 60), m = Math.floor(tt % 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  /* A tiny version of the 3D helpers LSP Life uses, built on LSP Drive's own. */
  function adapter(root) {
    const T = E.T, M = (c, o) => (typeof c === 'string' ? E.M(c, o) : c);
    return {
      T, M: (c, o) => E.M(c, o),
      box: (w, h, d, mat, x = 0, y = 0, z = 0, parent, shadow = true) => E.box(w, h, d, M(mat), x, y, z, parent || root, shadow),
      cyl: (r1, r2, h, mat, x = 0, y = 0, z = 0, parent, seg = 16) => { const m = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), M(mat)); m.position.set(x, y, z); m.castShadow = true; (parent || root).add(m); return m; },
      sprite: (text, sx, sy, bg, fg = '#fff') => { const s = E.textSprite(text, bg || null, fg, sx, sy, bg ? undefined : '400 360px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'); root.add(s); return s; },
    };
  }

  /* ---------- buildings: closed inside, like Brookhaven ---------- */
  const Y0 = 0.17, FH = 3.2; // floor level and height of one storey
  function building(o, V2, group) {
    const T = E.T, walls = new T.Group(); group.add(walls);
    const H = o.h || 3, t = 0.25, own = (m) => (o.own ? m.clone() : m), wm = own(E.M(o.wall, { roughness: 0.85 })), trim = own(E.M(o.trim || '#ffffff')), glass = E.M('#9fd3f2', { roughness: 0.05, metalness: 0.3, emissive: '#1d3550', emissiveIntensity: 0.25 });
    const fl = new T.Mesh(new T.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), own(E.M(o.floor || '#d9b58a', { roughness: 0.6 }))); fl.rotation.x = -Math.PI / 2; fl.position.set((o.x0 + o.x1) / 2, Y0, (o.z0 + o.z1) / 2); fl.receiveShadow = true; group.add(fl);
    const ox = group.position.x, oz = group.position.z;
    const seg = (a0, a1, fixed, horiz) => {
      const len = a1 - a0; if (len < 0.05) return;
      horiz ? V2.box(len, H, t, wm, (a0 + a1) / 2, H / 2 + Y0, fixed, walls) : V2.box(t, H, len, wm, fixed, H / 2 + Y0, (a0 + a1) / 2, walls);
      horiz ? V2.box(len, 0.14, t + 0.06, trim, (a0 + a1) / 2, Y0 + 0.07, fixed, walls, false) : V2.box(t + 0.06, 0.14, len, trim, fixed, Y0 + 0.07, (a0 + a1) / 2, walls, false);
      horiz ? E.addCol(ox + a0, oz + fixed - t / 2, ox + a1, oz + fixed + t / 2) : E.addCol(ox + fixed - t / 2, oz + a0, ox + fixed + t / 2, oz + a1);
    };
    const lintel = (g0, g1, fixed, horiz) => { const top = Y0 + 2.6, hh = H + Y0 - top; if (hh < 0.05) return; horiz ? V2.box(g1 - g0, hh, t, wm, (g0 + g1) / 2, top + hh / 2, fixed, walls) : V2.box(t, hh, g1 - g0, wm, fixed, top + hh / 2, (g0 + g1) / 2, walls); };
    const wall = (a0, a1, fixed, horiz, gaps = []) => { let cur = a0; for (const [g0, g1] of gaps.slice().sort((p, q) => p[0] - q[0])) { seg(cur, g0, fixed, horiz); lintel(g0, g1, fixed, horiz); cur = g1; } seg(cur, a1, fixed, horiz); };
    for (const w of o.walls) wall(w[0], w[1], w[2], w[3] === 'h', w[4] || []);
    for (const [a, fixed, horiz, y] of o.windows || []) horiz ? V2.box(1.5, 1.1, t + 0.06, glass, a, y, fixed, walls, false) : V2.box(t + 0.06, 1.1, 1.5, glass, fixed, y, a, walls, false);
    // a ceiling so the inside feels like a room, then the roof
    const ceil = new T.Mesh(new T.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), E.M(o.ceiling || '#f4f1ea', { side: T.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set((o.x0 + o.x1) / 2, H + Y0 - 0.02, (o.z0 + o.z1) / 2); group.add(ceil);
    const roof = new T.Group(); group.add(roof); let cone = null, flat = null;
    if (o.noRoof) { /* something sits on top */ }
    else if (o.peak) { const r = (cone = new T.Mesh(new T.ConeGeometry(Math.hypot(o.x1 - o.x0, o.z1 - o.z0) * 0.56, 2.8, 4), own(E.M(o.roof)))); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, (o.z1 - o.z0) / (o.x1 - o.x0)); r.position.set((o.x0 + o.x1) / 2, H + Y0 + 1.4, (o.z0 + o.z1) / 2); r.castShadow = true; roof.add(r); }
    if (!o.noRoof && (!o.peak || o.own)) { flat = V2.box(o.x1 - o.x0 + 0.8, 0.4, o.z1 - o.z0 + 0.8, own(E.M(o.roof)), (o.x0 + o.x1) / 2, H + Y0 + 0.2, (o.z0 + o.z1) / 2, roof); if (o.peak) flat.visible = false; }
    const b = { ...o, walls, roof, cone, flat, mat: { wall: wm, trim, floor: fl.material }, wx0: ox + o.x0, wx1: ox + o.x1, wz0: oz + o.z0, wz1: oz + o.z1 }; BUILD.push(b); return b;
  }
  const insideB = (b, x, z) => x > b.wx0 && x < b.wx1 && z > b.wz0 && z < b.wz1;
  function obj(o, ox, oz) { o.x += ox; o.z += oz; OBJ.push(o); return o; }

  /* ---------- two-storey houses ---------- */
  // 10 house designs, like Brookhaven. Every plot can be built as any design.
  const DESIGNS = [
    { id: 'cottage', name: 'Starter Cottage', icon: '🏡', price: 1200, wall: '#f6ead6', roof: '#b5533c', trim: '#ffffff', door: '#8b5a33', floor: '#c99a66', tier: 0, desc: 'Two cozy floors. Bed and laptop upstairs.' },
    { id: 'family', name: 'Family Home', icon: '🏠', price: 2500, wall: '#dff0ff', roof: '#2f5fa8', trim: '#ffffff', door: '#2f5fa8', floor: '#c99a66', tier: 1, desc: 'Picket fence and flower beds.' },
    { id: 'modern', name: 'Modern House', icon: '🏢', price: 4000, wall: '#eef0f3', roof: '#2b3350', trim: '#2b3350', door: '#2b3350', floor: '#b9bec7', tier: 2, flat: true, desc: 'Flat roof, clean lines, grey floors.' },
    { id: 'farm', name: 'Farmhouse', icon: '🌾', price: 8000, wall: '#b5533c', roof: '#4a3b30', trim: '#ffffff', door: '#ffffff', floor: '#a87a50', tier: 3, desc: 'Red barn walls, garden lamps and a big yard.' },
    { id: 'villa', name: 'Suburban Villa', icon: '🏘️', price: 15000, wall: '#f3e1ff', roof: '#6a3fa0', trim: '#ffffff', door: '#6a3fa0', floor: '#d9c2a3', tier: 4, desc: 'Hedges, lamps and a chandelier.' },
    { id: 'beach', name: 'Beach House', icon: '🏖️', price: 35000, wall: '#fff8e6', roof: '#14a3c7', trim: '#14a3c7', door: '#14a3c7', floor: '#e8d5a8', tier: 5, desc: 'A swimming pool in the back yard.' },
    { id: 'glass', name: 'Glass Modern', icon: '🪟', price: 80000, wall: '#9fc7e0', roof: '#16203d', trim: '#16203d', door: '#16203d', floor: '#dde3ea', tier: 6, flat: true, desc: 'Glass walls, pool and a jacuzzi bathtub.' },
    { id: 'luxury', name: 'Luxury Villa', icon: '🏛️', price: 250000, wall: '#fffaf0', roof: '#7a5c3a', trim: '#d4af37', door: '#7a5c3a', floor: '#f0e6d2', tier: 7, desc: 'Gold columns, marble floors, a grand piano.' },
    { id: 'mansion', name: 'Mansion', icon: '🏰', price: 1500000, wall: '#e9e4da', roof: '#2b2b2b', trim: '#d4af37', door: '#2b2b2b', floor: '#f7f3ea', tier: 8, desc: 'Fountain, pool, jacuzzi and a private chef.' },
    { id: 'palace', name: 'Royal Palace', icon: '👑', price: 7000000, wall: '#fff4d6', roof: '#c9a227', trim: '#ffd700', door: '#8b0000', floor: '#ffffff', tier: 9, desc: 'The best house in the city: private chef, private golden bathtub, pool, fountain and gold everywhere.' },
  ];
  const design = () => DESIGNS[S.design || 0] || DESIGNS[0];
  const HOUSE = { x0: -14, x1: 2, z0: -20, z1: -6, h: FH * 2, walls: [[-14, 2, -6, 'h', [[-7, -5.6]]], [-14, 2, -20, 'h'], [-20, -6, -14, 'v'], [-20, -6, 2, 'v']],
    windows: [[-11, -6, 1, 1.9], [-2.5, -6, 1, 1.9], [-11, -6, 1, 5.1], [-3, -6, 1, 5.1], [-10, -20, 1, 1.9], [-2.5, -20, 1, 5.1], [-10, -20, 1, 5.1], [-10, -14, 0, 1.9], [-16, -14, 0, 5.1], [-10, 2, 0, 1.9], [-17, 2, 0, 5.1]] };
  // inside walls and furniture you bump into, per floor, in house coordinates [x0, z0, x1, z1]
  const FLOOR_COLS = [
    [[-0.1, -13, 0.1, -8], [0, -8.1, 2, -7.9], [-12, -8.7, -9, -7.7], [-11.6, -12.9, -9.4, -12.3], [-5.6, -20, -0.5, -19.1], [-6.9, -20, -5.9, -19.1], [-3.9, -11.9, -2.1, -10.1]],
    [[-7, -6.1, -5.6, -5.9], [-6.1, -20, -5.9, -9], [-6.1, -7.6, -5.9, -6], [-6, -15.1, -3, -14.9], [-1.8, -15.1, 2, -14.9], [-0.05, -13, 0.05, -8], [0, -13.05, 2, -12.95], [-13.2, -19, -11.2, -16.2], [-14, -12.3, -12.6, -11.7], [-3.8, -10.8, -2.2, -10.2], [-1.5, -19.8, -0.9, -19], [-4.8, -19.9, -4, -19.3], [-3.9, -18, -2.1, -17.1]],
  ];
  function buildHouse(i) {
    const T = E.T, [bx, bz, lx, lz] = E.RP_LOTS.houses[i], [cx, cz] = E.lotC(bx, bz, lx, lz);
    const g = new T.Group(); g.position.set(cx + 6, 0, cz + 13); E.scene.add(g);
    const V2 = adapter(g), [wall, roof] = HOUSE_COLORS[i];
    const b = building({ ...HOUSE, wall, roof, floor: '#c99a66', peak: true, own: true }, V2, g); b.house = i; b.group = g; b.V2 = V2; b.price = DESIGNS[i].price;
    V2.box(1.6, 0.04, 6, '#c9cdd4', -6.3, 0.18, -3, g, false);
    for (const x of [-13, 1]) V2.box(1, 0.8, 0.8, '#3f8a3a', x, 0.55, -4.2, g);
    V2.box(2.2, 0.15, 1.2, '#b9bec7', -6.3, 0.2, -5.2, g); // doorstep
    b.door = V2.box(1.4, 2.4, 0.1, E.M('#8b5a33').clone(), -6.3, Y0 + 1.2, -6, g);
    b.doorCol = { x0: g.position.x - 7, z0: g.position.z - 6.1, x1: g.position.x - 5.6, z1: g.position.z - 5.9 };
    b.sign = V2.sprite('🏠 For sale', 4.6, 0.8, 'rgba(22,32,61,.8)'); b.sign.position.set(-6.3, FH * 2 + 3.6, -5.4);
    // upstairs floor with a hole for the stairs, and the stairs themselves
    const slab = (b.mat.slab = E.M('#c99a66', { roughness: 0.6 }).clone());
    for (const [x0, z0, x1, z1] of [[-14, -20, 0, -6], [0, -20, 2, -13], [0, -8, 2, -6]]) { const s = V2.box(x1 - x0, 0.22, z1 - z0, slab, (x0 + x1) / 2, Y0 + FH - 0.11, (z0 + z1) / 2, g); s.receiveShadow = true; }
    for (let k = 0; k < 10; k++) V2.box(1.7, (k + 1) * (FH / 10), 0.5, '#8b6b4a', 1, Y0 + ((k + 1) * (FH / 10)) / 2, -12.75 + k * 0.5, g);
    V2.box(0.2, FH, 5, E.M('#f4efe6'), 0, Y0 + FH / 2, -10.5, g); // wall beside the stairs downstairs
    V2.box(2, FH, 0.2, E.M('#f4efe6'), 1, Y0 + FH / 2, -8, g);
    for (const [w, d, x, z] of [[0.08, 5, 0, -10.5], [2, 0.08, 1, -13]]) V2.box(w, 1, d, '#6b4a2f', x, Y0 + FH + 0.5, z, g); // upstairs railing
    // upstairs inner walls (bedroom, bathroom)
    const iw = E.M('#f4efe6', { roughness: 0.9 });
    for (const [x0, z0, x1, z1] of [[-6.1, -20, -5.9, -9], [-6.1, -7.6, -5.9, -6], [-6, -15.1, -3, -14.9], [-1.8, -15.1, 2, -14.9]]) V2.box(x1 - x0, FH - 0.1, z1 - z0, iw, (x0 + x1) / 2, Y0 + FH + (FH - 0.1) / 2, (z0 + z1) / 2, g);
    obj({ x: -6.3, z: -4.9, r: 1.5, house: i, outside: true, label: () => (S.home === i ? `🚪 Your ${design().name} · walk in` : S.home != null ? '🏠 Move to this plot / pick a design' : '🏠 Buy a house here: 10 designs'), use: () => houseShop(i) }, g.position.x, g.position.z);
    // outside extras, shown by design
    const X = (b.X = {}), grp = (k) => { const q = new T.Group(); g.add(q); q.visible = false; X[k] = q; return q; };
    const fence = grp('fence'); for (let x = -20; x <= 8; x += 1) if (Math.abs(x + 6.3) > 1.2) { V2.box(0.12, 0.8, 0.12, '#ffffff', x, 0.4, 1.3, fence, false); } V2.box(9.8, 0.08, 0.06, '#ffffff', -15, 0.6, 1.3, fence, false); V2.box(12.6, 0.08, 0.06, '#ffffff', 1.9, 0.6, 1.3, fence, false);
    const flowers = grp('flowers'); for (let k = 0; k < 14; k++) V2.box(0.3, 0.3, 0.3, ['#ff4d8b', '#ffd23f', '#ff8a3d', '#8a5cff'][k % 4], -13.5 + k * 0.5 + (k > 6 ? 8.2 : 0), 0.32, -5.4, flowers, false);
    const lamps = grp('lamps'); for (const x of [-9, -3.6]) { V2.cyl(0.06, 0.06, 1.6, '#2b3350', x, 0.8, -1.5, lamps, 8); V2.box(0.3, 0.3, 0.3, E.M('#fffbe6', { emissive: '#fff1c2', emissiveIntensity: 1.5 }), x, 1.7, -1.5, lamps, false); }
    const hedge = grp('hedge'); V2.box(5, 1, 0.8, '#2f6b2a', -17, 0.5, -2, hedge); V2.box(5, 1, 0.8, '#2f6b2a', 5, 0.5, -2, hedge);
    const pool = grp('pool'); V2.box(13, 0.12, 6.2, '#e9edf4', -6, 0.08, -24, pool, false); V2.box(12, 0.05, 5.2, E.M('#3fb7ff', { roughness: 0.1, metalness: 0.1, emissive: '#0b5c8a', emissiveIntensity: 0.3 }), -6, 0.16, -24, pool, false); for (const x of [-10, -2]) { V2.box(0.8, 0.1, 1.8, '#ffffff', x, 0.35, -21.2, pool, false); }
    const cols = grp('columns'); for (const x of [-8, -4.6]) { V2.cyl(0.28, 0.28, FH * 2 - 0.2, E.M('#d4af37', { metalness: 0.6, roughness: 0.3 }), x, Y0 + FH - 0.1, -5.5, cols, 16); }
    const fountain = grp('fountain'); V2.cyl(1.6, 1.8, 0.5, '#e9edf4', -14, 0.25, -1.8, fountain, 24); V2.cyl(1.4, 1.4, 0.05, '#3fb7ff', -14, 0.5, -1.8, fountain, 24); V2.cyl(0.25, 0.3, 1.4, '#e9edf4', -14, 0.9, -1.8, fountain, 12); V2.cyl(0.6, 0.3, 0.2, '#e9edf4', -14, 1.6, -1.8, fountain, 16);
    const gold = grp('gold'); V2.box(16.4, 0.3, 0.3, E.M('#ffd700', { metalness: 0.7, roughness: 0.25 }), -6, Y0 + FH * 2, -5.85, gold, false); for (const x of [-14.1, 2.1]) V2.box(0.3, FH * 2, 0.3, E.M('#ffd700', { metalness: 0.7, roughness: 0.25 }), x, Y0 + FH, -5.9, gold, false);
    return b;
  }
  function furnish(b) {
    const T = E.T, V2 = b.V2, g = b.group, ox = g.position.x, oz = g.position.z, F = (b.F = {});
    const fg = new T.Group(); g.add(fg); b.furnGroup = fg;
    const at = (x, z, fl = 0) => { const gr = new T.Group(); gr.position.set(x, Y0 + fl * FH, z); fg.add(gr); return gr; };
    const up = Y0 + FH;
    // ---- ground floor: living room, kitchen, dining ----
    F.m = { sofa: E.M('#4f6bd8').clone(), kitchen: E.M('#f2f3f5').clone(), rug: E.M('#b5533c').clone() };
    const sofa = at(-10.5, -8.2); V2.box(3, 0.45, 1, F.m.sofa, 0, 0.35, 0, sofa); V2.box(3, 0.6, 0.25, F.m.sofa, 0, 0.8, 0.4, sofa); for (const x of [-1.4, 1.4]) V2.box(0.25, 0.65, 1, '#3f58c0', x, 0.5, 0, sofa);
    const tvs = at(-10.5, -12.6); V2.box(2.2, 0.5, 0.6, '#6b4a2f', 0, 0.25, 0, tvs); F.tv = V2.box(1.6, 0.9, 0.08, '#16181f', 0, 1.05, -0.1, tvs); F.screen = V2.box(1.5, 0.82, 0.01, E.M('#0b0d12'), 0, 1.05, -0.05, tvs, false);
    F.bigtv = V2.box(2.6, 1.4, 0.08, '#16181f', -10.5, Y0 + 1.4, -12.66, fg); F.console = V2.box(0.5, 0.12, 0.35, '#f2f3f5', -9.6, Y0 + 0.56, -12.5, fg);
    F.rug = V2.box(4, 0.02, 2.6, F.m.rug, -10.5, Y0 + 0.02, -10.3, fg, false);
    F.shelf = at(-13.55, -10.5); V2.box(0.4, 2.2, 1.6, '#6b4a2f', 0, 1.1, 0, F.shelf); for (let k = 0; k < 12; k++) V2.box(0.22, 0.32, 0.12, ['#d61f30', '#2f6bff', '#14c79a', '#ffb31a'][k % 4], 0.06, 0.3 + Math.floor(k / 4) * 0.6, -0.6 + (k % 4) * 0.35, F.shelf, false);
    F.plants = [[-13.3, -6.7, 0], [-5.5, -6.7, 0], [-13.3, -19.3, 1]].map(([x, z, f]) => { const p = at(x, z, f); V2.cyl(0.25, 0.2, 0.45, '#d0784a', 0, 0.22, 0, p); V2.box(0.6, 0.6, 0.6, '#3f8a3a', 0, 0.75, 0, p); return p; });
    F.aquarium = at(-7.5, -6.6); V2.box(1.4, 0.7, 0.5, '#6b4a2f', 0, 0.35, 0, F.aquarium); V2.box(1.3, 0.7, 0.45, E.M('#5fb6ef', { transparent: true, opacity: 0.55 }), 0, 1.05, 0, F.aquarium);
    V2.box(5.1, 0.95, 0.8, F.m.kitchen, -3.05, Y0 + 0.47, -19.55, fg); V2.box(1, 1.8, 0.5, F.m.kitchen, -0.9, Y0 + 2.4, -19.8, fg, false); V2.box(1, 1.8, 0.5, F.m.kitchen, -5, Y0 + 2.4, -19.8, fg, false); V2.box(5.2, 0.06, 0.9, '#6f7685', -3.05, Y0 + 0.97, -19.55, fg); // kitchen counter
    V2.box(1, 2, 0.8, '#e7ebf2', -6.4, Y0 + 1, -19.5, fg); // fridge
    V2.box(0.8, 0.04, 0.6, '#2b3350', -2, Y0 + 1.0, -19.55, fg, false); V2.box(0.7, 0.05, 0.45, '#9aa3b5', -3.6, Y0 + 1.0, -19.55, fg, false);
    F.coffee = V2.box(0.35, 0.45, 0.3, '#2b3350', -1, Y0 + 1.22, -19.6, fg);
    const table = at(-3, -11); V2.cyl(0.9, 0.9, 0.08, '#8b6b4a', 0, 0.78, 0, table, 24); V2.cyl(0.08, 0.12, 0.75, '#6b4a2f', 0, 0.38, 0, table, 8);
    // ---- upstairs: bedroom, office, bathroom ----
    const bed = at(-12.2, -17.6, 1); V2.box(2, 0.45, 2.8, '#8b6b4a', 0, 0.22, 0, bed); F.blanket = V2.box(1.9, 0.18, 2.1, '#8a5cff', 0, 0.54, 0.3, bed); V2.box(1.5, 0.2, 0.5, '#ffffff', 0, 0.56, -1, bed); V2.box(2, 1, 0.15, '#6b4a2f', 0, 0.6, -1.4, bed);
    V2.box(1.4, 2, 0.6, '#b07d50', -13.3, up + 1, -12, fg); // wardrobe
    const rugUp = V2.box(3, 0.02, 2, '#ffb6c9', -10, up + 0.02, -13, fg, false);
    V2.box(1.6, 0.06, 0.6, '#8b6b4a', -3, up + 0.78, -10.5, fg); V2.box(0.06, 0.75, 0.55, '#6b4a2f', -3.7, up + 0.38, -10.5, fg); V2.box(0.06, 0.75, 0.55, '#6b4a2f', -2.3, up + 0.38, -10.5, fg);
    const lap = at(-3, -10.6, 1); lap.position.y = up + 0.81; V2.box(0.6, 0.03, 0.42, '#c3cad8', 0, 0, 0, lap); const sc = V2.box(0.54, 0.34, 0.02, E.M('#2f6bff', { emissive: '#2f6bff', emissiveIntensity: 0.6 }), 0, 0.2, -0.2, lap, false); sc.rotation.x = -0.25;
    V2.box(0.5, 0.45, 0.5, '#2b3350', -3, up + 0.23, -9.6, fg);
    V2.box(1.4, 0.05, 1.4, '#c9d7e8', 1, up + 0.03, -19, fg, false); V2.box(0.06, 2.2, 1.4, E.M('#cfe8ff', { transparent: true, opacity: 0.35 }), 0.3, up + 1.1, -19, fg, false);
    V2.box(0.5, 0.45, 0.65, '#ffffff', -1.2, up + 0.23, -19.4, fg);
    V2.box(0.8, 0.85, 0.5, '#ffffff', -4.4, up + 0.43, -19.6, fg); V2.box(0.6, 0.6, 0.04, E.M('#cfe8ff', { metalness: 0.6, roughness: 0.05 }), -4.4, up + 1.6, -19.85, fg, false);
    F.bath = at(-3, -17.55, 1); V2.box(1.8, 0.6, 0.9, '#ffffff', 0, 0.3, 0, F.bath); V2.box(1.6, 0.05, 0.7, '#9fd4ff', 0, 0.58, 0, F.bath);
    b.lights = [[-7, -13, 0], [-7, -13, 1]].map(([x, z, f]) => { const l = new T.PointLight('#ffe2b0', 3, 16); l.position.set(x, Y0 + f * FH + 2.7, z); g.add(l); return l; });
    // luxury extras for the expensive designs
    F.lux = true;
    F.chandelier = at(-10, -10); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; V2.box(0.12, 0.3, 0.12, E.M('#fff6d0', { emissive: '#ffe9a0', emissiveIntensity: 1.2 }), Math.cos(a) * 0.6, FH - 0.7, Math.sin(a) * 0.6, F.chandelier, false); } V2.cyl(0.7, 0.2, 0.25, E.M('#d4af37', { metalness: 0.7, roughness: 0.3 }), 0, FH - 0.5, 0, F.chandelier, 16);
    F.piano = at(-7.5, -16.5); V2.box(1.6, 1, 1.4, '#111111', 0, 0.5, 0, F.piano); V2.box(1.4, 0.06, 0.25, '#ffffff', 0, 0.98, 0.72, F.piano, false);
    F.jacuzzi = at(-9.5, -18.3, 1); V2.cyl(1.25, 1.35, 0.75, E.M('#ffd700', { metalness: 0.7, roughness: 0.25 }), 0, 0.37, 0, F.jacuzzi, 24); V2.cyl(1.05, 1.05, 0.05, E.M('#7fd8ff', { emissive: '#2fa8ff', emissiveIntensity: 0.4 }), 0, 0.72, 0, F.jacuzzi, 24);
    F.goldbed = V2.box(1.95, 0.2, 2.15, E.M('#ffd700', { metalness: 0.6, roughness: 0.3 }), -12.2, up + 0.56, -17.3, fg, false);
    F.chef = E.person('#ffffff', '#2b2b2b', '#c68642', '#ffffff'); F.chef.position.set(-3.6, Y0, -18.4); F.chef.rotation.y = 0; fg.add(F.chef);
    const o = (q) => obj({ ...q, where: 'home' }, ox, oz);
    o({ x: -3.6, z: -17.3, r: 1.4, floor: 0, tier: 8, label: () => '👨‍🍳 Private chef: cook me a meal (free)', use: () => { stopAct(); say('👨‍🍳 "Coming right up!"'); activity('eat', 'Eating the chef\'s special', 5, { hunger: 20, fun: 4, energy: 2 }); } });
    o({ x: -9.5, z: -16.7, r: 1.6, floor: 1, tier: 6, label: () => '🛁 Private bathtub: relax', use: () => activity('bath', 'Relaxing in your private bathtub', 7, { hygiene: 18, fun: 8, energy: 2 }, { x: -9.5, z: -18.3, face: 0, sit: true }) });
    o({ x: -7.5, z: -15.4, r: 1.3, floor: 0, tier: 7, label: () => '🎹 Play the piano', use: () => activity('piano', 'Playing the piano', 99, { fun: 10 }, { x: -7.5, z: -15.4, face: Math.PI }) });
    o({ x: -12.2, z: -15.8, r: 1.8, floor: 1, label: () => '🛏️ Sleep', use: () => sleepUi({ x: -12.2, z: -17.4, face: Math.PI, lie: true }, has('goodbed') ? 18 : 12) });
    V2.box(0.6, 0.6, 0.5, '#7a5c3a', -10.6, up + 0.3, -18.9, fg); V2.box(0.3, 0.3, 0.3, E.M('#ff4d5e', { emissive: '#ff2d2d', emissiveIntensity: 0.6 }), -10.6, up + 0.75, -18.9, fg, false);
    o({ x: -10.6, z: -18, r: 1.1, floor: 1, label: () => '🗄️ Open the drawer', use: openDrawer });
    o({ x: 1, z: -18.2, r: 1.3, floor: 1, label: () => '🚿 Shower', use: () => activity('shower', 'Showering', 5, { hygiene: 22 }, { x: 1, z: -19, face: Math.PI }) });
    o({ x: -1.2, z: -18.6, r: 1.1, floor: 1, label: () => '🚽 Toilet', use: () => activity('toilet', 'Using the toilet', 3, { hygiene: 4 }, { x: -1.2, z: -19.3, face: 0, sit: true }) });
    o({ x: -4.4, z: -18.9, r: 1.1, floor: 1, label: () => '🧼 Wash hands', use: () => activity('wash', 'Washing hands', 2, { hygiene: 6 }) });
    o({ x: -3, z: -16.6, r: 1.4, floor: 1, need: 'bath', label: () => '🛁 Bath', use: () => activity('bath', 'Relaxing in the bath', 7, { hygiene: 16, fun: 5 }, { x: -3, z: -17.55, face: -Math.PI / 2, lie: true }) });
    o({ x: -3, z: -9.8, r: 1.3, floor: 1, label: () => '💻 Laptop: jobs, business, home shop, bank', use: () => { stopAct(); openLaptop('jobs'); } });
    o({ x: -10.5, z: -9.2, r: 1.6, floor: 0, label: () => '📺 Watch TV', use: () => activity('tv', 'Watching TV', 99, { fun: has('bigtv') ? 9 : 5, energy: 0.5 }, { x: -10.5, z: -8.2, face: Math.PI, sit: true }) });
    o({ x: -9.6, z: -11.6, r: 1.1, floor: 0, need: 'console', label: () => '🎮 Play video games', use: () => activity('console', 'Gaming', 99, { fun: 12, energy: -1 }, { x: -10, z: -8.2, face: Math.PI, sit: true }) });
    o({ x: -12.9, z: -10.5, r: 1.2, floor: 0, need: 'shelf', label: () => '📚 Read a book', use: () => activity('read', 'Reading', 99, { fun: 6 }) });
    o({ x: -7.5, z: -7.4, r: 1.2, floor: 0, need: 'aquarium', label: () => '🐠 Watch the fish', use: () => activity('fish', 'Watching the fish', 8, { fun: 4, energy: 1 }) });
    o({ x: -6.4, z: -18.6, r: 1.3, floor: 0, label: () => '🧊 Fridge', use: openFridge });
    o({ x: -2, z: -18.6, r: 1.2, floor: 0, label: () => '🍳 Cook', use: openStove });
    o({ x: -1, z: -18.7, r: 0.9, floor: 0, need: 'coffee', label: () => '☕ Make coffee', use: () => activity('coffee', 'Making coffee', 3, { energy: 9 }) });
    o({ x: 1, z: -13.6, r: 1.2, floor: 0, label: () => '🪜 Stairs up · just walk', use: () => {} });
    applyFurniture(b); buildYard(b); applyHome(b);
  }
  function applyDesign(b, d) {
    b.mat.wall.color.set(d.wall); b.mat.trim.color.set(d.trim); b.mat.floor.color.set(d.floor); b.mat.slab.color.set(d.floor); b.door.material.color.set(d.door);
    if (b.cone) { b.cone.material.color.set(d.roof); b.cone.visible = !d.flat; } if (b.flat) { b.flat.material.color.set(d.roof); b.flat.visible = !!d.flat; }
    b.mat.wall.transparent = d.id === 'glass'; b.mat.wall.opacity = d.id === 'glass' ? 0.55 : 1; b.mat.wall.metalness = d.id === 'glass' ? 0.4 : 0;
    const t = d.tier, on = { fence: t >= 1 && t !== 2 && t !== 6, flowers: t >= 1, lamps: t >= 3, hedge: t >= 4, pool: t >= 5, columns: t >= 7, fountain: t >= 8, gold: t >= 9 };
    for (const k in b.X) b.X[k].visible = !!on[k];
  }
  function applyFurniture(b) {
    const F = b && b.F; if (!F) return;
    const t = design().tier; if (F.lux) { F.chandelier.visible = t >= 4; F.piano.visible = t >= 7; F.jacuzzi.visible = t >= 6; F.chef.visible = t >= 8; F.goldbed.visible = t >= 9; }
    F.bigtv.visible = has('bigtv'); F.tv.visible = F.screen.visible = !has('bigtv'); F.console.visible = has('console'); F.rug.visible = has('rug');
    F.shelf.visible = has('shelf'); F.plants.forEach((p) => (p.visible = has('plant'))); F.aquarium.visible = has('aquarium'); F.coffee.visible = has('coffee'); F.bath.visible = has('bath');
    F.blanket.material = E.M(has('goodbed') ? '#ffb6c9' : '#8a5cff');
  }
  function buildMarket() {
    const T = E.T, [cx, cz] = E.lotC(...E.RP_LOTS.market), g = new T.Group(); g.position.set(cx - 13, 0, cz - 15); E.scene.add(g);
    const V2 = adapter(g);
    const b = building({ x0: 4, x1: 22, z0: 8, z1: 22, h: 4, wall: '#e8f1fb', floor: '#e9edf4', roof: '#2f6bff', trim: '#2f6bff', walls: [[4, 22, 22, 'h', [[11, 13]]], [4, 22, 8, 'h'], [8, 22, 4, 'v'], [8, 22, 22, 'v']], windows: [[7, 22, 1, 2], [17, 22, 1, 2], [20, 22, 1, 2]] }, V2, g);
    const sign = V2.sprite('🛒 LSP Market', 5, 1.1, '#2f6bff'); sign.position.set(12, 5.6, 22.4); b.sign = sign;
    const l = new T.PointLight('#ffffff', 5, 18); l.position.set(13, 3.6, 15); g.add(l);
    SHELVES.forEach((row, ri) => {
      const z = 12 + ri * 4;
      V2.box(12, 1.6, 0.9, '#d9dee8', 13.5, 0.97, z, g); E.addCol(g.position.x + 7.5, g.position.z + z - 0.5, g.position.x + 19.5, g.position.z + z + 0.5);
      row.forEach((id, i) => {
        const x = 8.6 + i * 2.45, f = FOODS[id];
        for (let k = 0; k < 6; k++) V2.box(0.28, 0.32, 0.22, ['#ff8a3d', '#ffd23f', '#14c79a', '#ff4d8b', '#2f6bff'][(i + k + ri) % 5], x - 0.7 + (k % 3) * 0.35, 0.8 + Math.floor(k / 3) * 0.5, z + 0.3, g, false);
        const sp = V2.sprite(f.icon, 0.7, 0.7); sp.position.set(x, 2.25, z);
        obj({ x, z: z + 0.95, r: 1.2, where: 'market', label: () => `${f.icon} ${f.name} — $${f.price}  (add to basket)`, use: () => addToCart(id) }, g.position.x, g.position.z);
      });
    });
    V2.box(2.4, 1, 1, '#14c79a', 6.5, 0.67, 19, g); E.addCol(g.position.x + 5.3, g.position.z + 18.5, g.position.x + 7.7, g.position.z + 19.5);
    const cashier = E.person('#14c79a', '#2d3a5c', '#c68642', '#14c79a'); cashier.position.set(g.position.x + 6.5, 0.17, g.position.z + 17.8); E.scene.add(cashier);
    obj({ x: 6.5, z: 20.2, r: 1.4, where: 'market', label: () => (cart.length ? `💳 Pay $${cartTotal()} at the till` : '🧑 Cashier: "Grab a basket and shop!"'), use: checkout }, g.position.x, g.position.z);
  }
  /* ---------- Business Tower: register a business, get a TAXIN and a stall ----------
     100 floors of stalls. Registering is free. Customers on your floor come to
     your stall and pay by scanning your QR, straight into your LSP UPI balance. */
  const BIZ = [
    { id: 'lemon', name: 'Lemonade stand', icon: '🍋', cost: 200, inc: 10, sell: 'Lemonade', price: 6 },
    { id: 'truck', name: 'Food truck', icon: '🌮', cost: 1500, inc: 50, sell: 'Tacos', price: 14 },
    { id: 'cafe', name: 'Café', icon: '☕', cost: 4000, inc: 120, sell: 'Coffee and cake', price: 22 },
    { id: 'wash', name: 'Car wash', icon: '🚿', cost: 9000, inc: 260, sell: 'Car wash voucher', price: 35 },
    { id: 'tech', name: 'Digital company', icon: '💻', cost: 20000, inc: 600, sell: 'App subscription', price: 60 },
  ];
  const STALL_DESIGNS = [
    { name: 'Basic', price: 0, top: '#9aa3b5', body: '#e9edf4' }, { name: 'Sunny', price: 150, top: '#ffd23f', body: '#fff3c4' },
    { name: 'Mint', price: 300, top: '#14c79a', body: '#dff8ef' }, { name: 'Ocean', price: 600, top: '#2f6bff', body: '#dfe9ff' },
    { name: 'Candy', price: 1000, top: '#ff4d8b', body: '#ffe0ec' }, { name: 'Wood cabin', price: 2000, top: '#7a5c3a', body: '#c99a66' },
    { name: 'Neon night', price: 5000, top: '#8a5cff', body: '#16203d', glow: '#c9b3ff' }, { name: 'Marble', price: 12000, top: '#b9bec7', body: '#ffffff' },
    { name: 'Diamond', price: 30000, top: '#7fd8ff', body: '#e8f8ff', glow: '#bff0ff' }, { name: 'Royal gold', price: 80000, top: '#ffd700', body: '#fff4d6', glow: '#ffe680' },
  ];
  const BIZ_MAX = 10, upCost = (b, lv) => Math.round(b.cost * 0.75 * lv), incOf = (b, lv) => b.inc * lv, salePrice = (b, lv) => Math.round(b.price * (1 + 0.25 * (lv - 1)));
  const NPC_STALLS = [['🍿 Popcorn', 'Popcorn', 4, { hunger: 10, fun: 4 }], ['🍔 Burger hut', 'Burger', 9, { hunger: 30 }], ['🧋 Bubble tea', 'Bubble tea', 5, { hunger: 6, energy: 8 }], ['🍕 Pizza slice', 'Pizza slice', 6, { hunger: 22 }],
    ['🍩 Donuts', 'Donut', 3, { hunger: 8, fun: 5 }], ['🥤 Fresh juice', 'Juice', 4, { energy: 10 }], ['📱 Phone covers', 'Phone cover', 12, 'stuff'], ['🎧 Gadgets', 'Earphones', 25, 'stuff'], ['👕 T-shirts', 'T-shirt', 15, 'stuff'],
    ['💐 Flowers', 'Flowers', 8, { fun: 8 }], ['🧸 Toys', 'Teddy bear', 18, 'stuff'], ['📚 Books', 'Comic book', 7, { fun: 10 }], ['🍦 Ice cream', 'Ice cream cone', 4, { hunger: 8, fun: 8 }], ['🕶️ Sunglasses', 'Sunglasses', 20, 'stuff'], ['🌮 Wraps', 'Wrap', 7, { hunger: 24 }], ['🎮 Game shop', 'Game card', 30, 'stuff']];
  const HALL_H = 4.2, hallY = (n) => Y0 + 4.7 + (n - 1) * 0.78; // floor n of the tower
  const STALLS = []; for (const z of [-6, -1, 4, 9]) for (const x of [-9, -3, 3, 9]) STALLS.push({ x, z });
  const TOWER_COLS = {
    lobby: [[-4, -3.5, 4, -2.5], [-11.2, -6.4, -6.8, 2.4]],
    hall: [[-1.2, 12.9, 1.2, 13.1], ...STALLS.map(({ x, z }) => [x - 1.3, z - 1.35, x + 1.3, z + 0.45])],
  };
  const T3 = { floor: 1 };
  function taxin(name) {
    const st = ['07', '09', '27', '29', '33'][Math.floor(Math.random() * 5)], L2 = () => 'ABCDEFGHJKLMNPRSTUVWXYZ'[Math.floor(Math.random() * 23)], d = () => Math.floor(Math.random() * 10);
    const nm = (String(name || 'LSP').replace(/[^A-Za-z]/g, '').toUpperCase() + 'XXX').slice(0, 3);
    return `${st}${nm}${L2()}${L2()}${d()}${d()}${d()}${d()}${L2()}1Z${'0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 34)]}`;
  }
  function buildTower() {
    const T = E.T, [cx, cz] = E.lotC(...E.RP_LOTS.biz), g = new T.Group(); g.position.set(cx, 0, cz); E.scene.add(g);
    const V2 = adapter(g);
    const b = building({ x0: -13, x1: 13, z0: -13, z1: 13, h: 4.5, wall: '#2b3350', floor: '#d9dee8', roof: '#16203d', trim: '#ffb31a', noRoof: true,
      walls: [[-13, 13, 13, 'h', [[-1.2, 1.2]]], [-13, 13, -13, 'h'], [-13, 13, -13, 'v'], [-13, 13, 13, 'v']], windows: [[-8, 13, 1, 2.3], [8, 13, 1, 2.3], [-4.5, 13, 1, 2.3], [4.5, 13, 1, 2.3]] }, V2, g);
    b.tower = true; T3.b = b; T3.g = g;
    // the tall tower above the lobby, with a lit window grid and the name on top
    const H = hallY(100) + HALL_H + 1 - 4.7;
    const tex = E.canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#1d2a4d'; c.fillRect(0, 0, w, h); for (let y = 0; y < 50; y++) for (let x = 0; x < 8; x++) { c.fillStyle = Math.random() < 0.55 ? '#ffe9a6' : '#5f7fb8'; c.fillRect(x * 32 + 5, y * 10.24 + 2, 22, 6); } }, [1, 2]);
    const shell = V2.box(26.2, H, 26.2, new T.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }), 0, 4.7 + H / 2, 0, g, false);
    shell.castShadow = false; shell.receiveShadow = false;
    V2.box(27, 0.6, 27, '#ffb31a', 0, 4.9, 0, g, false); V2.box(27, 1, 27, '#16203d', 0, 4.7 + H + 0.5, 0, g, false);
    const top = E.textSprite('BUSINESS TOWER', '#16203d', '#ffb31a', 22, 3.2); top.position.set(0, 4.7 + H + 3.2, 13.5); g.add(top);
    const top2 = E.textSprite('BUSINESS TOWER', '#16203d', '#ffb31a', 22, 3.2); top2.position.set(0, 4.7 + H + 3.2, -13.5); g.add(top2);
    b.sign = V2.sprite('🏢 Business Tower · 100 floors', 7, 1.1, '#ffb31a', '#16203d'); b.sign.position.set(0, 6.2, 13.8);
    // lobby: reception (register your business), elevator, public computers
    V2.box(8, 1.1, 1, '#ffb31a', 0, 0.72, -3, g, false);
    const clerk = E.person('#16203d', '#2d3a5c', '#8d5524', '#ffb31a'); clerk.position.set(0, Y0, -4.2); g.add(clerk);
    obj({ x: 0, z: -1.6, r: 2.2, tower: 0, label: () => '🧾 Reception: register a business (free) · get your TAXIN', use: () => openBusiness() }, cx, cz);
    const ele = (grp) => { V2.box(3, 3.2, 0.3, '#9aa3b5', 0, Y0 + 1.6, -12.75, grp, false); V2.box(1.3, 2.6, 0.32, E.M('#d9dee8', { metalness: 0.6, roughness: 0.2 }), -0.66, Y0 + 1.3, -12.7, grp, false); V2.box(1.3, 2.6, 0.32, E.M('#d9dee8', { metalness: 0.6, roughness: 0.2 }), 0.66, Y0 + 1.3, -12.7, grp, false); };
    ele(g);
    obj({ x: 0, z: -11.6, r: 1.8, tower: 0, label: () => '🛗 Elevator: go to a floor', use: openElevator }, cx, cz);
    for (const z of [-5.5, -2, 1.5]) { V2.box(1.4, 0.06, 0.7, '#8b6b4a', -9, 0.95, z, g); V2.box(0.6, 0.4, 0.04, E.M('#2f6bff', { emissive: '#2f6bff', emissiveIntensity: 0.5 }), -9, 1.22, z - 0.2, g, false); }
    obj({ x: -9, z: -2, r: 3, tower: 0, label: () => '💻 Public computer: jobs, LSP Store, bank', use: () => openLaptop('jobs', true) }, cx, cz);
    for (const [x, z] of [[11.5, 11.5], [-11.5, 11.5], [11.5, -11.5]]) { V2.cyl(0.25, 0.2, 0.45, '#d0784a', x, 0.4, z, g); V2.box(0.6, 0.6, 0.6, '#3f8a3a', x, 0.95, z, g); }
    // one floor of stalls; it moves to whichever floor you ride the elevator to
    const hall = new T.Group(); hall.visible = false; g.add(hall); T3.hall = hall;
    const hb = (w, h, d, m, x, y, z) => V2.box(w, h, d, m, x, y, z, hall, false);
    const fl = hb(25.8, 0.1, 25.8, E.M('#e9edf4', { roughness: 0.5 }), 0, Y0 - 0.04, 0);
    hb(25.8, 0.1, 25.8, E.M('#f4f1ea', { emissive: '#ffffff', emissiveIntensity: 0.35 }), 0, Y0 + HALL_H, 0);
    for (const [w, d, x, z] of [[26, 0.25, 0, 12.9], [26, 0.25, 0, -12.9], [0.25, 26, 12.9, 0], [0.25, 26, -12.9, 0]]) hb(w, HALL_H, d, E.M('#dfe4ec'), x, Y0 + HALL_H / 2, z);
    for (const x of [-8, -3, 3, 8]) { hb(3.2, 1.6, 0.3, E.M('#9fd3f2', { emissive: '#4f8fc0', emissiveIntensity: 0.5 }), x, Y0 + 2.2, 12.75); hb(3.2, 1.6, 0.3, E.M('#9fd3f2', { emissive: '#4f8fc0', emissiveIntensity: 0.5 }), x, Y0 + 2.2, -12.75); }
    for (let k = 0; k < 6; k++) hb(3, 0.06, 0.6, E.M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1 }), -10 + k * 4, Y0 + HALL_H - 0.05, 0);
    ele(hall);
    T3.label = E.textSprite('Floor 1', '#16203d', '#ffb31a', 3.4, 0.8); T3.label.position.set(0, Y0 + 3.6, -12.4); hall.add(T3.label);
    T3.stalls = STALLS.map(({ x, z }, i) => {
      const sg = new T.Group(); sg.position.set(x, Y0, z); hall.add(sg);
      const body = E.M('#e9edf4').clone(), topM = E.M('#9aa3b5').clone(), glow = E.M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0 }).clone();
      V2.box(2.6, 1.05, 0.7, body, 0, 0.52, 0, sg, false); V2.box(2.6, 2.6, 0.12, body, 0, 1.3, -1.3, sg, false);
      V2.box(2.9, 0.18, 1.8, topM, 0, 2.7, -0.4, sg, false); V2.box(2.6, 0.06, 0.06, glow, 0, 2.58, 0.45, sg, false);
      for (const xx of [-1.25, 1.25]) V2.box(0.1, 2.6, 0.1, topM, xx, 1.3, 0.4, sg, false);
      const goods = []; for (let k = 0; k < 5; k++) goods.push(V2.box(0.3, 0.3, 0.3, E.M('#ff8a3d').clone(), -0.9 + k * 0.45, 1.2, 0, sg, false));
      const vend = E.person('#2f6bff', '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][i % 3]); vend.position.set(0, 0, -0.8); sg.add(vend);
      const sign = E.textSprite('Stall', 'rgba(22,32,61,.85)', '#ffffff', 2.6, 0.55); sign.position.set(0, 3.15, 0.2); sg.add(sign);
      return { g: sg, x, z, body, topM, glow, goods, vend, sign, cust: null };
    });
    T3.shoppers = Array.from({ length: 8 }, (_, k) => { const p = E.person(['#ff4d8b', '#14c79a', '#ffb31a', '#8a5cff'][k % 4], '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][k % 3]); p.position.set(-6 + k * 1.7, Y0, 11 - (k % 3) * 5); hall.add(p); return { m: p, tx: p.position.x, tz: p.position.z, wait: 0, stall: null }; });
    // stall interactions on the floor you are on
    STALLS.forEach(({ x, z }, i) => obj({ x, z: z + 1.25, r: 1.3, tower: 'hall', stall: i, label: () => stallLabel(i), use: () => useStall(i) }, cx, cz));
    obj({ x: 0, z: -11.6, r: 1.8, tower: 'hall', label: () => `🛗 Elevator (you are on floor ${T3.floor})`, use: openElevator }, cx, cz);
  }
  const myStalls = (n) => Object.entries(S.biz || {}).filter(([, o]) => o.floor === n);
  const stallOwner = (n, i) => { const m = myStalls(n).find(([, o]) => o.stall === i); return m ? { id: m[0], o: m[1], b: BIZ.find((q) => q.id === m[0]) } : null; };
  const seeded = (n, i) => { let h = (n * 7919 + i * 104729) % 2147483647; h = (h * 16807) % 2147483647; return h; };
  const npcStall = (n, i) => NPC_STALLS[seeded(n, i) % NPC_STALLS.length];
  function dressFloor() {
    const n = T3.floor;
    T3.label.material.map = E.textSprite(`Floor ${n}`, '#16203d', '#ffb31a', 3.4, 0.8).material.map;
    T3.stalls.forEach((st, i) => {
      const mine = stallOwner(n, i), d = mine ? STALL_DESIGNS[mine.o.design || 0] : STALL_DESIGNS[seeded(n, i) % 6], empty = !mine && seeded(n, i + 50) % 9 === 0;
      st.body.color.set(d.body); st.topM.color.set(d.top); st.glow.emissive.set(d.glow || '#000000'); st.glow.emissiveIntensity = d.glow ? 1.6 : 0;
      st.vend.visible = !empty && !mine; st.goods.forEach((g, k) => { g.visible = !empty; g.material.color.set(['#ff8a3d', '#ffd23f', '#14c79a', '#ff4d8b', '#2f6bff'][(k + i + n) % 5]); });
      st.empty = empty;
      const txt = mine ? `${mine.b.icon} ${mine.o.name || mine.b.name}` : empty ? 'For rent' : npcStall(n, i)[0];
      st.sign.material.map = E.textSprite(txt, mine ? '#14c79a' : 'rgba(22,32,61,.85)', '#ffffff', 2.6, 0.55).material.map;
      st.cust = null;
    });
  }
  function stallLabel(i) {
    const n = T3.floor, st = T3.stalls[i], mine = stallOwner(n, i);
    if (mine) return st.cust ? `💳 Customer wants ${mine.b.sell} (${fmt$(salePrice(mine.b, mine.o.lv))}) · show your QR` : `${mine.b.icon} Your ${mine.b.name} · TAXIN ${mine.o.taxin} · waiting for customers`;
    if (st.empty) return '🏷️ Empty stall. Register a business at reception to get one.';
    const [nm, item, price] = npcStall(n, i); return `${nm}: buy ${item} for ${fmt$(price)} · scan to pay`;
  }
  function useStall(i) {
    const n = T3.floor, st = T3.stalls[i], mine = stallOwner(n, i);
    if (mine) {
      if (!st.cust) return say('No customer yet. Wait near your stall, they will come!');
      const amt = salePrice(mine.b, mine.o.lv); st.cust.wait = 0; st.cust.stall = null; st.cust = null;
      showQR(`${mine.o.name || mine.b.name}`, amt, true, () => { receive(amt, `${mine.b.icon} Sale at your ${mine.b.name}`); mine.o.sales = (mine.o.sales || 0) + 1; mine.o.made = (mine.o.made || 0) + amt; save(); });
      return;
    }
    if (st.empty) return openBusiness();
    const [nm, item, price, eff] = npcStall(n, i);
    if (!canPay(price)) return say(`You need ${fmt$(price)}.`);
    showQR(nm.replace(/^\S+\s/, ''), price, false, () => {
      pay(price, `${nm} · ${item}`);
      if (eff === 'stuff') { addStuff({ id: 'stall-' + item, name: item, icon: nm.split(' ')[0] }); say(`${item} is in your bag (📱 My stuff).`); }
      else { activity('eat', `Enjoying your ${item.toLowerCase()}`, 3, Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, v / 3]))); }
      save(); hud();
    });
  }
  // a little QR on screen: scan to pay or show to get paid
  function showQR(to, amt, incoming, done) {
    let q = $('#rp-qr'); if (!q) { $('#s-drive').insertAdjacentHTML('beforeend', '<div id="rp-qr"></div>'); q = $('#rp-qr'); }
    const cells = Array.from({ length: 121 }, (_, k) => { const x = k % 11, y = Math.floor(k / 11), fix = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7); return `<i style="background:${fix ? ((x % 2 === 1 && y % 2 === 1) ? '#fff' : '#16203d') : Math.random() < 0.5 ? '#16203d' : '#fff'}"></i>`; }).join('');
    q.innerHTML = `<div class="qr-card"><b>${incoming ? '📲 Customer is scanning your QR' : '📷 Scanning QR to pay'}</b><div class="qr-grid">${cells}</div><span>${incoming ? 'From customer to' : 'To'} <b>${to}</b></span><span class="qr-amt">${fmt$(amt)}</span><span class="qr-st">LSP UPI · processing…</span></div>`;
    q.hidden = false; L.sfx && L.sfx('click');
    setTimeout(() => { const st = q.querySelector('.qr-st'); if (st) { st.textContent = incoming ? `✅ ${fmt$(amt)} received` : '✅ Paid'; st.style.color = '#14c79a'; } done(); L.sfx && L.sfx('cash'); }, 900);
    setTimeout(() => (q.hidden = true), 1900);
  }
  function openElevator() {
    stopAct(); const mine = new Set(Object.values(S.biz || {}).map((o) => o.floor));
    openUi(`<div class="lf-top"><h3>🛗 Elevator</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body"><p class="muted" style="margin:0 0 8px">Pick a floor. ${mine.size ? 'Your stalls are on the green floors.' : 'Register a business at reception to get your own stall.'}</p><div class="rp-floors"><button data-fl="0">Lobby</button>${Array.from({ length: 100 }, (_, k) => `<button data-fl="${k + 1}" class="${mine.has(k + 1) ? 'mine' : ''}">${k + 1}</button>`).join('')}</div></div>`);
    $$('#rp-win [data-fl]').forEach((x) => (x.onclick = () => { closeUi(); goFloor(+x.dataset.fl); }));
  }
  function goFloor(n) {
    const F = E.getF(), g = T3.g;
    F.tower = n; F.x = g.position.x; F.z = g.position.z - 10.6; F.h = 0; F.vx = F.vz = 0;
    if (n) { T3.floor = n; T3.hall.position.y = hallY(n) - Y0; T3.hall.visible = true; dressFloor(); }
    else T3.hall.visible = false;
    L.sfx && L.sfx('ding'); say(n ? `🛗 Floor ${n}` : '🛗 Lobby', 1400);
  }
  function tickTower(dt) {
    const F = E.getF(); if (!T3.hall || !T3.hall.visible || !F.tower) return;
    const n = T3.floor, gx = T3.g.position.x, gz = T3.g.position.z, lx = F.x - gx, lz = F.z - gz;
    T3.spawn = (T3.spawn == null ? 3 : T3.spawn) - dt;
    if (T3.spawn <= 0) {
      T3.spawn = 5 + Math.random() * 4;
      const near = T3.stalls.findIndex((st, i) => stallOwner(n, i) && Math.hypot(st.x - lx, st.z + 1.2 - lz) < 8 && !st.cust && !T3.shoppers.some((o) => o.stall === i));
      const idle = T3.shoppers.filter((c) => c.stall == null);
      if (near >= 0 && idle.length) { const c = idle[Math.floor(Math.random() * idle.length)]; c.stall = near; c.tx = T3.stalls[near].x + (Math.random() - 0.5) * 0.4; c.tz = T3.stalls[near].z + 1.9; c.wait = 0; }
    }
    for (const c of T3.shoppers) {
      const m = c.m, dx = c.tx - m.position.x, dz = c.tz - m.position.z, d = Math.hypot(dx, dz);
      if (c.stall != null) { if (d > 0.1) { m.position.x += (dx / d) * Math.min(d, dt * 3.2); m.position.z += (dz / d) * Math.min(d, dt * 3.2); m.rotation.y = Math.atan2(dx, dz); } else { m.rotation.y = Math.PI; c.wait += dt; const st = T3.stalls[c.stall]; if (!st.cust) st.cust = c; if (c.wait > 25) { st.cust = null; c.stall = null; c.wait = 0; } } continue; }
      if (d < 0.2) {
        // pick somewhere new: often one of your stalls when you are standing near it
        const near = T3.stalls.findIndex((st, i) => stallOwner(n, i) && Math.hypot(st.x - lx, st.z + 1.2 - lz) < 7 && !st.cust && !T3.shoppers.some((o) => o.stall === i));
        if (near >= 0 && Math.random() < 0.5) { c.stall = near; c.tx = T3.stalls[near].x + (Math.random() - 0.5) * 0.4; c.tz = T3.stalls[near].z + 1.9; c.wait = 0; }
        else { c.tx = [-6, 0, 6][Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 2; c.tz = -9 + Math.random() * 21; }
      } else { const sp = Math.min(d, dt * 1.6); m.position.x += (dx / d) * sp; m.position.z += (dz / d) * sp; m.rotation.y = Math.atan2(dx, dz); }
    }
  }
  function registerBiz(id, name) {
    const b = BIZ.find((q) => q.id === id); S.biz = S.biz || {};
    if (S.biz[id]) return;
    let floor = Object.values(S.biz)[0] ? Object.values(S.biz)[0].floor : 2 + Math.floor(Math.random() * 98);
    const used = new Set(Object.values(S.biz).filter((o) => o.floor === floor).map((o) => o.stall));
    const free = STALLS.map((_, i) => i).filter((i) => !used.has(i)); const stall = free[Math.floor(Math.random() * free.length)];
    S.biz[id] = { lv: 1, bank: 0, floor, stall, design: 0, taxin: taxin(name || b.name), name: (name || '').slice(0, 24) || b.name, since: S.day, sales: 0, made: 0 };
    save(); hud(); L.sfx && L.sfx('win');
    notify(`🧾 ${b.name} registered! TAXIN ${S.biz[id].taxin}. Your stall is on floor ${floor}.`);
  }
  function fixBiz() { // older saves: businesses from before the tower
    for (const [id, o] of Object.entries(S.biz || {})) { if (!o.taxin) o.taxin = taxin(id); if (!o.floor) { const f = Object.values(S.biz).find((q) => q.floor); o.floor = f ? f.floor : 2 + Math.floor(Math.random() * 98); } if (o.stall == null) { const used = new Set(Object.values(S.biz).filter((q) => q.floor === o.floor && q !== o).map((q) => q.stall)); o.stall = STALLS.findIndex((_, i) => !used.has(i)); } if (o.design == null) o.design = 0; if (!o.name) o.name = BIZ.find((b) => b.id === id).name; }
  }
  function openBusiness(view) {
    stopAct(); S.biz = S.biz || {};
    if (view && view.design) {
      const id = view.design, o = S.biz[id], b = BIZ.find((q) => q.id === id);
      openUi(`<div class="lf-top"><h3>🎨 Stall design · ${b.icon} ${o.name}</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="lf-grid">${STALL_DESIGNS.map((d, k) => `<div class="lf-card"><span class="ic" style="display:inline-block;width:42px;height:28px;border-radius:6px;background:linear-gradient(${d.top} 45%, ${d.body} 45%)"></span><b>${d.name}</b><button class="btn ${o.design === k ? 'ghost' : 'gold'}" data-sd="${k}" ${o.design === k || (!(o.owned || [0]).includes(k) && !canPay(d.price)) ? 'disabled' : ''}>${o.design === k ? 'Using' : (o.owned || [0]).includes(k) ? 'Use' : d.price ? 'Buy ' + fmt$(d.price) : 'Use'}</button></div>`).join('')}</div><button class="btn ghost" data-back="1" style="margin-top:10px">← Back</button></div>`);
      $$('#rp-win [data-sd]').forEach((x) => (x.onclick = () => { const k = +x.dataset.sd, d = STALL_DESIGNS[k]; o.owned = o.owned || [0]; if (!o.owned.includes(k)) { if (!pay(d.price, `🎨 ${d.name} stall design`)) return; o.owned.push(k); } o.design = k; save(); hud(); if (T3.hall && T3.hall.visible) dressFloor(); openBusiness({ design: id }); }));
      $('#rp-win [data-back]').onclick = () => openBusiness(); return;
    }
    openUi(`<div class="lf-top"><h3>🏢 Business Tower</h3><span class="pill">${fmt$(S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body"><p class="muted" style="margin:0 0 10px">Registering is free. You get a TAXIN (your business tax number) and a stall in the tower. Customers on your floor pay you by scanning your QR. Staff also sell while you are away and keep up to a day of money for you to collect.</p><div class="lf-grid">${BIZ.map((b) => {
      const o = S.biz[b.id];
      if (!o) return `<div class="lf-card"><span class="ic">${b.icon}</span><b>${b.name}</b><p>Sells ${b.sell.toLowerCase()} for ${fmt$(b.price)}. Staff earn ${fmt$(b.inc)}/hour.</p><input class="lf-in" data-nm="${b.id}" maxlength="24" placeholder="Business name (optional)" style="margin-bottom:6px"><button class="btn gold" data-reg="${b.id}">Register free</button></div>`;
      return `<div class="lf-card"><span class="ic">${b.icon}</span><b>${o.name}</b><p style="font-family:ui-monospace,monospace">TAXIN ${o.taxin}</p><p>Floor ${o.floor}, stall ${o.stall + 1} · Level ${o.lv} · ${o.sales || 0} sales</p><button class="btn primary" data-bcol="${b.id}" ${o.bank < 1 ? 'disabled' : ''}>Collect ${fmt$(o.bank)}</button>${o.lv < BIZ_MAX ? `<button class="btn ghost" data-bup="${b.id}" ${!canPay(upCost(b, o.lv)) ? 'disabled' : ''}>Upgrade ${fmt$(upCost(b, o.lv))}</button>` : '<button class="btn ghost" disabled>Max level</button>'}<button class="btn ghost" data-bd="${b.id}">🎨 Stall design</button><button class="btn ghost" data-go="${o.floor}">🛗 Go to floor ${o.floor}</button></div>`;
    }).join('')}</div></div>`);
    $$('#rp-win [data-nm]').forEach((x) => ['keydown', 'keyup'].forEach((ev) => x.addEventListener(ev, (e) => e.stopPropagation())));
    $$('#rp-win [data-reg]').forEach((x) => (x.onclick = () => { const id = x.dataset.reg, nm = $(`#rp-win [data-nm="${id}"]`).value.trim(); registerBiz(id, nm); openBusiness(); }));
    $$('#rp-win [data-bcol]').forEach((x) => (x.onclick = () => { const o = S.biz[x.dataset.bcol]; const n = Math.floor(o.bank); o.bank -= n; receive(n, `🏢 Collected from ${o.name}`); save(); hud(); openBusiness(); }));
    $$('#rp-win [data-bup]').forEach((x) => (x.onclick = () => { const b = BIZ.find((q) => q.id === x.dataset.bup), o = S.biz[b.id], c = upCost(b, o.lv); if (!pay(c, `⬆️ Upgrade ${o.name}`)) return; o.lv++; save(); hud(); L.sfx && L.sfx('ding'); openBusiness(); }));
    $$('#rp-win [data-bd]').forEach((x) => (x.onclick = () => openBusiness({ design: x.dataset.bd })));
    $$('#rp-win [data-go]').forEach((x) => (x.onclick = () => { const F = E.getF(); closeUi(); if (insideB(T3.b, F.x, F.z)) goFloor(+x.dataset.go); else say('Go to the Business Tower and take the elevator.'); }));
  }

  /* ---------- buying a house: pick a plot, then one of 10 designs ---------- */
  function houseShop(i) {
    stopAct();
    const own = S.home != null, here = S.home === i, cur = own ? design() : null, trade = own ? Math.floor(cur.price / 2) : 0;
    openUi(`<div class="lf-top"><h3>🏠 ${here ? 'Redesign your house' : 'Houses for sale'}</h3><span class="pill">${fmt$(S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body">${own ? `<p class="muted" style="margin:0 0 10px">You own a ${cur.name}. Switching gives you ${fmt$(trade)} back for it (half its price).</p>` : '<p class="muted" style="margin:0 0 10px">Pick a design for this plot. Every house has two floors.</p>'}${here ? '<button class="btn primary" data-walk="1" style="margin-bottom:10px">🚪 Just walk in</button>' : ''}<div class="lf-grid">${DESIGNS.map((d, k) => {
      const isCur = here && (S.design || 0) === k, cost = Math.max(0, d.price - trade);
      return `<div class="lf-card"><span class="ic">${d.icon}</span><b>${d.name}</b><p>${d.desc}</p><p><b>${fmt$(d.price)}</b>${own && !isCur ? ` · you pay ${fmt$(cost)}` : ''}</p><button class="btn ${isCur ? 'ghost' : 'gold'}" data-hd="${k}" ${isCur || !canPay(cost) ? 'disabled' : ''}>${isCur ? 'Your house' : 'Buy'}</button></div>`;
    }).join('')}</div></div>`);
    const w = $('#rp-win [data-walk]'); if (w) w.onclick = () => { closeUi(); const F = E.getF(), b = curHouse(); F.x = b.group.position.x - 6.3; F.z = b.group.position.z - 7.4; F.h = Math.PI; };
    $$('#rp-win [data-hd]').forEach((x) => (x.onclick = () => {
      const k = +x.dataset.hd, d = DESIGNS[k], cost = Math.max(0, d.price - trade);
      if (!pay(cost, `${d.icon} ${d.name}`)) return say(`You need ${fmt$(cost)}.`);
      if (own) txn(`🏠 Sold your ${cur.name} (half price)`, trade);
      S.home = i; S.design = k; save(); setHouseState(); hud(); closeUi(); L.sfx && L.sfx('win');
      notify(`${d.icon} You bought a ${d.name}! Walk in. Your bed and laptop are upstairs.${d.tier >= 8 ? ' Your private chef is in the kitchen.' : ''}`);
    }));
  }
  function setHouseState() {
    BUILD.filter((b) => b.house != null).forEach((b) => {
      const mine = S.home === b.house, d = mine ? design() : DESIGNS[[0, 1, 2][b.house]];
      applyDesign(b, d);
      b.door.visible = !mine;
      const me = window.Social && Social.me();
      b.sign.material.map = E.textSprite(mine ? `${d.icon} ${me ? me + "'s" : 'Your'} ${d.name}` : '🏠 For sale · 10 designs', mine ? '#14c79a' : 'rgba(22,32,61,.8)', '#ffffff', 4.6, 0.8).material.map;
      if (mine && !b.F) furnish(b);
      if (b.furnGroup) { b.furnGroup.visible = mine; if (mine) { applyFurniture(b); applyHome(b); } }
      b.locked = !mine;
    });
  }

  /* ---------- money: LSP UPI balance, credit card, history ---------- */
  const absMin = () => S.day * DAY_MIN + S.time;
  function txn(label, amt) { S.txns = S.txns || []; S.txns.unshift({ label, amt: Math.round(amt), day: S.day, at: clockTxt() }); if (S.txns.length > 40) S.txns.length = 40; }
  const cardLeft = () => (S.card ? S.card.limit - S.card.due : 0);
  const canPay = (n) => n <= 0 || S.cash >= n || cardLeft() >= n;
  function pay(n, label) {
    n = Math.round(n); if (n <= 0) return 'free';
    if (S.cash >= n) { S.cash -= n; txn(label, -n); hud(); return 'upi'; }
    if (cardLeft() >= n) { S.card.due += n; txn(label + ' · 💳 credit card', -n); hud(); return 'card'; }
    return null;
  }
  function receive(n, label) { n = Math.round(n); if (n <= 0) return; S.cash += n; txn(label, n); notify(`📲 LSP UPI: ${fmt$(n)} received · ${label}`); hud(); }
  function notify(m) { S.notes = S.notes || []; S.notes.unshift({ m, day: S.day, at: clockTxt() }); if (S.notes.length > 30) S.notes.length = 30; say(m, 3600); }
  function addStuff(it) { S.stuff = S.stuff || []; const e = S.stuff.find((q) => q.id === it.id); if (e) e.n++; else S.stuff.push({ ...it, n: 1 }); }

  /* ---------- LSP Store: 100 products, delivered to you ---------- */
  const P = (cat, list) => list.map(([id, name, icon, price, fast, extra]) => ({ id, cat, name, icon, price, fast: !!fast, ...(extra || {}) }));
  const PRODUCTS = [
    ...P('Phones', [['ph-lite', 'LSP Lite 2', '📱', 100, 1, { phone: '#4f6bd8' }], ['ph-mini', 'Pocket Mini', '📱', 140, 1, { phone: '#ff4d8b' }], ['ph-nova', 'LSP Nova', '📱', 180, 1, { phone: '#14c79a' }], ['ph-pix', 'Pixelo 8', '📱', 320, 0, { phone: '#2b3350' }], ['ph-galx', 'Galaxo S', '📱', 450, 0, { phone: '#6a3fa0' }], ['ph-game', 'Gamer Phone X', '🎮', 650, 0, { phone: '#ff3b30' }], ['ph-fruit', 'Orchard Phone 15', '📱', 799, 0, { phone: '#e9e4da' }], ['ph-cam', 'Camera Pro', '📸', 900, 0, { phone: '#16203d' }], ['ph-fold', 'LSP Fold', '📲', 1200, 0, { phone: '#7fd8ff' }], ['ph-ultra', 'LSP Ultra Gold', '📱', 1500, 0, { phone: '#d4af37' }]]),
    ...P('Electronics', [['pc', 'Pro laptop', '💻', 900, 0, { furni: 1, desc: 'Laptop jobs pay 25% more.' }], ['el-head', 'Headphones', '🎧', 60, 1, { use: { fun: 8 } }], ['el-watch', 'Smartwatch', '⌚', 150, 1], ['el-tab', 'Tablet', '📲', 300, 0, { use: { fun: 10 } }], ['el-spk', 'Bluetooth speaker', '🔊', 80, 1, { use: { fun: 8 } }], ['el-cam', 'Camera', '📷', 500, 0], ['el-drone', 'Drone', '🛸', 400, 0, { use: { fun: 14 } }], ['el-vr', 'VR headset', '🥽', 350, 0, { use: { fun: 16 } }], ['el-pb', 'Power bank', '🔋', 25, 1], ['el-buds', 'Earbuds', '🎵', 45, 1, { use: { fun: 6 } }]]),
    ...P('Home', [['bigtv', 'Big Smart TV', '📺', 450, 0, { furni: 1, desc: 'Watching TV is twice as fun.' }], ['console', 'Game console', '🎮', 600, 0, { furni: 1, desc: 'Play games for lots of fun.' }], ['coffee', 'Coffee machine', '☕', 250, 1, { furni: 1, desc: 'A quick energy boost.' }], ['goodbed', 'Memory-foam bed', '🛏️', 700, 0, { furni: 1, desc: 'Recover energy 50% faster.' }], ['rug', 'Cozy rug', '🟫', 80, 1, { furni: 1 }], ['plant', 'House plants', '🪴', 60, 1, { furni: 1 }], ['shelf', 'Bookshelf', '📚', 150, 0, { furni: 1, desc: 'Read a book for fun.' }], ['bath', 'Bathtub', '🛁', 500, 0, { furni: 1, desc: 'A relaxing bath.' }], ['aquarium', 'Aquarium', '🐠', 350, 0, { furni: 1, desc: 'Watch the fish to relax.' }], ['hm-lamp', 'Floor lamp', '💡', 40, 1]]),
    ...P('Groceries', [['gr-bread', 'Bread pack ×3', '🍞', 10, 1, { food: { bread: 3 } }], ['gr-milk', 'Milk crate ×3', '🥛', 8, 1, { food: { milk: 3 } }], ['gr-eggs', 'Egg tray ×4', '🥚', 16, 1, { food: { eggs: 4 } }], ['gr-veg', 'Veg box ×3', '🥦', 15, 1, { food: { veg: 3 } }], ['gr-pasta', 'Pasta pack ×3', '🍝', 18, 1, { food: { pasta: 3 } }], ['gr-pizza', 'Frozen pizza ×2', '🍕', 22, 1, { food: { pizza: 2 } }], ['gr-snack', 'Snack box ×3', '🍿', 8, 1, { food: { snack: 3 } }], ['gr-juice', 'Juice pack ×3', '🧃', 8, 1, { food: { juice: 3 } }], ['gr-ice', 'Ice cream tub ×2', '🍦', 9, 1, { food: { icecream: 2 } }], ['gr-fruit', 'Fruit basket ×5', '🍎', 13, 1, { food: { apple: 5 } }]]),
    ...P('Fashion', [['fa-tee', 'T-shirt', '👕', 15, 1], ['fa-jeans', 'Jeans', '👖', 40, 0], ['fa-snk', 'Sneakers', '👟', 70, 0], ['fa-hood', 'Hoodie', '🧥', 35, 0], ['fa-cap', 'Cap', '🧢', 12, 1], ['fa-sun', 'Sunglasses', '🕶️', 25, 1], ['fa-jack', 'Leather jacket', '🧥', 90, 0], ['fa-dress', 'Party dress', '👗', 55, 0], ['fa-watch', 'Gold watch', '⌚', 120, 0], ['fa-bag', 'Backpack', '🎒', 45, 1]]),
    ...P('Sports', [['sp-foot', 'Football', '⚽', 20, 1, { use: { fun: 10, energy: -4 } }], ['sp-bat', 'Cricket bat', '🏏', 35, 1, { use: { fun: 10, energy: -4 } }], ['sp-bask', 'Basketball', '🏀', 25, 1, { use: { fun: 10, energy: -4 } }], ['sp-bike', 'Bicycle', '🚲', 180, 0, { use: { fun: 12, energy: -5 } }], ['sp-skate', 'Skateboard', '🛹', 60, 0, { use: { fun: 12, energy: -4 } }], ['sp-yoga', 'Yoga mat', '🧘', 20, 1, { use: { energy: 6, fun: 4 } }], ['sp-dumb', 'Dumbbells', '🏋️', 40, 0, { use: { fun: 4, energy: -6 } }], ['sp-ten', 'Tennis racket', '🎾', 50, 0, { use: { fun: 10, energy: -4 } }], ['sp-tread', 'Treadmill', '🏃', 600, 0, { use: { fun: 6, energy: -6 } }], ['sp-gog', 'Swim goggles', '🥽', 10, 1]]),
    ...P('Toys & games', [['ty-board', 'Board game', '🎲', 25, 1, { use: { fun: 14 } }], ['ty-puz', 'Jigsaw puzzle', '🧩', 15, 1, { use: { fun: 10 } }], ['ty-rc', 'RC car', '🏎️', 45, 0, { use: { fun: 12 } }], ['ty-teddy', 'Teddy bear', '🧸', 20, 1, { use: { fun: 6 } }], ['ty-blocks', 'Building blocks', '🧱', 40, 0, { use: { fun: 12 } }], ['ty-racer', 'Game: LSP Racer', '🕹️', 30, 1, { use: { fun: 16 } }], ['ty-space', 'Game: Space Quest', '🚀', 35, 1, { use: { fun: 16 } }], ['ty-kite', 'Kite', '🪁', 10, 1, { use: { fun: 8 } }], ['ty-yoyo', 'Yo-yo', '🪀', 5, 1, { use: { fun: 5 } }], ['ty-cards', 'Card deck', '🃏', 6, 1, { use: { fun: 8 } }]]),
    ...P('Beauty & care', [['bt-sham', 'Shampoo', '🧴', 8, 1, { use: { hygiene: 12 } }], ['bt-perf', 'Perfume', '🌸', 45, 0, { use: { hygiene: 8, fun: 4 } }], ['bt-face', 'Face wash', '🧼', 10, 1, { use: { hygiene: 10 } }], ['bt-tooth', 'Toothbrush kit', '🪥', 6, 1, { use: { hygiene: 8 } }], ['bt-dry', 'Hair dryer', '💨', 35, 0], ['bt-skin', 'Skincare set', '✨', 40, 0, { use: { hygiene: 10, fun: 3 } }], ['bt-deo', 'Deodorant', '🧴', 7, 1, { use: { hygiene: 10 } }], ['bt-bomb', 'Bath bombs', '🛁', 12, 1, { use: { hygiene: 6, fun: 6 } }], ['bt-razor', 'Razor', '🪒', 15, 1, { use: { hygiene: 6 } }], ['bt-spa', 'Home spa kit', '💆', 60, 0, { use: { hygiene: 14, fun: 8, energy: 4 } }]]),
    ...P('Books & office', [['bk-novel', 'Mystery novel', '📕', 12, 1, { use: { fun: 12 } }], ['bk-cook', 'Cookbook', '📗', 18, 1, { use: { fun: 6 } }], ['bk-code', 'Learn to code', '📘', 30, 1, { use: { fun: 6 } }], ['bk-comic', 'Comic book', '📙', 8, 1, { use: { fun: 10 } }], ['bk-note', 'Notebook', '📓', 4, 1], ['bk-pens', 'Pen set', '🖊️', 6, 1], ['bk-lamp', 'Desk lamp', '💡', 25, 1], ['bk-chair', 'Office chair', '🪑', 150, 0], ['bk-print', 'Printer', '🖨️', 120, 0], ['bk-calc', 'Calculator', '🧮', 10, 1]]),
    ...P('Car & travel', [['cr-fresh', 'Car air freshener', '🌲', 8, 1], ['cr-hold', 'Phone holder', '📱', 12, 1], ['cr-dash', 'Dash cam', '📹', 90, 0], ['cr-seat', 'Seat covers', '💺', 60, 0], ['cr-vac', 'Car vacuum', '🧹', 45, 0], ['cr-bag', 'Travel bag', '🧳', 70, 0], ['cr-pillow', 'Neck pillow', '😴', 15, 1, { use: { energy: 4 } }], ['cr-wash', 'Car wash kit', '🧽', 25, 1], ['cr-tyre', 'Tyre inflator', '🛞', 40, 0], ['cr-shade', 'Sunshade', '🌞', 15, 1]]),
  ];
  const CATS = [...new Set(PRODUCTS.map((p) => p.cat))];
  const CAT_ICON = { Phones: '📱', Electronics: '🎧', Home: '🛋️', Groceries: '🍎', Fashion: '👕', Sports: '⚽', 'Toys & games': '🧸', 'Beauty & care': '🧴', 'Books & office': '📚', 'Car & travel': '🚗' };
  const ownedP = (p) => (p.furni ? has(p.id) : p.phone ? (S.phones || []).includes(p.id) : false);
  const ETA_FAST = 120, ETA_SLOW = 2 * DAY_MIN; // game minutes
  function storeHtml(cat, q) {
    const list = PRODUCTS.filter((p) => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : p.cat === cat));
    return `<div class="rp-cats">${CATS.map((c) => `<button data-cat="${c}" class="${c === cat && !q ? 'on' : ''}">${CAT_ICON[c]} ${c}</button>`).join('')}</div><input class="lf-in" id="rp-q" placeholder="🔎 Search 100 products" value="${(q || '').replace(/"/g, '')}" style="margin:8px 0"><div class="lf-grid">${list.map((p) => `<div class="lf-card"><span class="ic">${p.icon}</span><b>${p.name}</b><p>${p.desc || (p.food ? 'Goes in your fridge.' : p.use ? 'Use it from 📱 My stuff.' : p.phone ? 'A new phone.' : '')}</p><p>🚚 ${p.fast ? 'Arrives today' : 'Arrives in 2 days'}</p><button class="btn gold" data-sbuy="${p.id}" ${ownedP(p) || !canPay(p.price) ? 'disabled' : ''}>${ownedP(p) ? 'Owned' : 'Buy ' + fmt$(p.price)}</button></div>`).join('') || '<p class="muted">Nothing found.</p>'}</div>`;
  }
  function wireStore(reopen) {
    $$('#rp-win [data-cat]').forEach((x) => (x.onclick = () => reopen(x.dataset.cat, '')));
    const q = $('#rp-q'); if (q) { ['keydown', 'keyup'].forEach((ev) => q.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'keyup' && e.key === 'Enter') reopen(null, q.value.trim()); })); }
    $$('#rp-win [data-sbuy]').forEach((x) => (x.onclick = () => checkoutProduct(PRODUCTS.find((p) => p.id === x.dataset.sbuy), reopen)));
  }
  function checkoutProduct(p, back) {
    const fee = p.fast ? 0 : 0, html = `<div class="lf-top"><h3>🛍️ LSP Store · Checkout</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:440px"><div class="lf-card"><span class="ic">${p.icon}</span><b>${p.name}</b><p>${fmt$(p.price)} · 🚚 ${p.fast ? 'Same-day delivery (about 2 game hours)' : 'Standard delivery (2 game days)'}</p></div>
      <p style="margin:10px 0 6px"><b>Pay with</b></p><button class="btn primary" data-pm="upi" ${S.cash < p.price ? 'disabled' : ''}>📲 LSP UPI balance (${fmt$(S.cash)})</button> <button class="btn ghost" data-pm="card" ${cardLeft() < p.price ? 'disabled' : ''}>💳 Credit card (${S.card ? fmt$(cardLeft()) + ' left' : 'get one in Bank'})</button>${!p.fast ? `<p class="muted" style="margin-top:8px">Want it today? <button class="btn ghost" data-express="1" ${!canPay(p.price + 15) ? 'disabled' : ''}>⚡ Express +$15</button></p>` : ''}<button class="btn ghost" data-back="1" style="margin-top:10px">← Back to store</button></div>`;
    openUi(html, true);
    const place = (how, express) => {
      const total = p.price + (express ? 15 : 0);
      if (how === 'upi' ? S.cash < total : cardLeft() < total) return say('Not enough money for that.');
      if (how === 'upi') { S.cash -= total; txn(`🛍️ LSP Store · ${p.name}`, -total); } else { S.card.due += total; txn(`🛍️ LSP Store · ${p.name} · 💳 credit card`, -total); }
      S.orders = S.orders || []; const id = 'LSP' + Math.floor(100000 + Math.random() * 899999);
      const eta = absMin() + (p.fast || express ? ETA_FAST : ETA_SLOW);
      S.orders.unshift({ id, pid: p.id, at: absMin(), eta, done: false }); if (S.orders.length > 30) S.orders.length = 30;
      if (p.phone || p.furni) { /* reserve so you can't buy it twice */ if (p.phone) (S.phones = S.phones || []).push(p.id); }
      save(); hud(); L.sfx && L.sfx('cash');
      showQR('LSP Store', total, false, () => {});
      notify(`📦 Order ${id} placed: ${p.icon} ${p.name}. ${p.fast || express ? 'Arriving today.' : 'Arriving in 2 days.'}`);
      back(p.cat, '');
    };
    $$('#rp-win [data-pm]').forEach((x) => (x.onclick = () => place(x.dataset.pm, false)));
    const ex = $('#rp-win [data-express]'); if (ex) ex.onclick = () => place(S.cash >= p.price + 15 ? 'upi' : 'card', true);
    $('#rp-win [data-back]').onclick = () => back(p.cat, '');
  }
  /* ---------- deliveries: a delivery partner brings your order; you share the OTP ---------- */
  function handOver(o) {
    o.done = true; o.out = false; const p = PRODUCTS.find((q) => q.id === o.pid); if (!p) return;
    if (p.food) for (const [k, n] of Object.entries(p.food)) S.pantry[k] = (S.pantry[k] || 0) + n;
    else if (p.furni) { if (!has(p.id)) S.owned.push(p.id); applyFurniture(curHouse()); }
    else if (p.phone) S.phone = p.id;
    else addStuff({ id: p.id, name: p.name, icon: p.icon });
    notify(`📦 Delivered: ${p.icon} ${p.name}${p.food ? ' (in your fridge)' : p.furni ? (S.home != null ? ' (set up in your house)' : ' (it will be in your house when you buy one)') : p.phone ? ' (your new phone!)' : ' (in 📱 My stuff)'}`);
  }
  // where the parcel goes: your front door, or the LSP Market pickup point if you have no house
  function dropPoint() {
    if (S.home != null) { const g = curHouse().group.position; return { x: g.x - 6.3, z: g.z - 4.4, name: 'your front door' }; }
    if (S.apt && S.apt.door) return { x: S.apt.door.x, z: S.apt.door.z, name: 'your apartment building' };
    const [cx, cz] = E.lotC(...E.RP_LOTS.market); return { x: cx - 13 + 12, z: cz - 15 + 23.4, name: 'the LSP Market pickup point' };
  }
  const CR = { st: null };
  function deliverOrders() {
    for (const o of S.orders || []) {
      if (o.done || o.out || absMin() < o.eta) continue;
      o.out = true; o.otp = String(1000 + Math.floor(Math.random() * 9000));
      const p = PRODUCTS.find((q) => q.id === o.pid) || { icon: '📦', name: 'parcel' };
      notify(`🔐 OTP ${o.otp} for order #${o.id} (${p.icon} ${p.name}). A delivery partner is on the way to ${dropPoint().name}. Share this OTP only with them.`);
    }
    if (!CR.st && (S.orders || []).some((o) => o.out && !o.done)) sendCourier();
  }
  function sendCourier() {
    const T = E.T, d = dropPoint();
    // park on the nearest road, in line with the door, then walk over
    let best = null;
    for (let i = 0; i <= 6; i++) { const r = E.RX(i); if (!best || Math.abs(d.x - r) < best.dist) best = { dist: Math.abs(d.x - r), vert: true, r }; if (Math.abs(d.z - r) < best.dist) best = { dist: Math.abs(d.z - r), vert: false, r }; }
    const side = best.vert ? Math.sign(d.x - best.r) : Math.sign(d.z - best.r);
    const stop = best.vert ? { x: best.r + side * 3.2, z: d.z } : { x: d.x, z: best.r + side * 3.2 };
    const start = best.vert ? { x: stop.x, z: stop.z - 90 } : { x: stop.x - 90, z: stop.z };
    const van = new T.Group(), V2 = adapter(van);
    V2.box(2.2, 2.3, 4.4, '#ffb31a', 0, 1.55, -0.3, van); V2.box(2.1, 1.3, 1.4, '#ffb31a', 0, 1.05, 2.4, van); V2.box(2, 0.7, 0.05, E.M('#16203d', { metalness: 0.5, roughness: 0.1 }), 0, 1.45, 3.11, van, false);
    for (const [x, z] of [[-1, 1.9], [1, 1.9], [-1, -1.6], [1, -1.6]]) V2.cyl(0.42, 0.42, 0.3, '#16203d', x, 0.42, z, van, 14).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) { const t = E.textSprite('🛍️ LSP Store', '#16203d', '#ffb31a', 3, 0.7); t.position.set(s * 1.2, 1.9, -0.3); van.add(t); }
    van.position.set(start.x, 0, start.z); van.rotation.y = Math.atan2(stop.x - start.x, stop.z - start.z); E.scene.add(van);
    const man = E.person('#ffb31a', '#2d3a5c', ['#c68642', '#8d5524', '#f1c27d'][Math.floor(Math.random() * 3)], '#ffb31a');
    const box = V2.box(0.55, 0.45, 0.45, '#c9a26b', 0, 1.15, 0.38, man, false); man.visible = false; E.scene.add(man);
    Object.assign(CR, { st: 'drive', van, man, box, start, stop, d, t: 0, wait: 0 });
    CR.o = obj({ x: d.x, z: d.z, r: 2.8, when: () => CR.st === 'wait', label: () => (CR.st === 'wait' ? '📦 Delivery partner: "Your OTP please?"' : ''), use: () => CR.st === 'wait' && otpPad() }, 0, 0);
  }
  function otpPad() {
    const due = (S.orders || []).filter((o) => o.out && !o.done); if (!due.length) return;
    let typed = '';
    const draw = () => {
      openUi(`<div class="lf-top"><h3>📦 Delivery · ${due.length} parcel${due.length > 1 ? 's' : ''}</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:340px;margin:auto;text-align:center"><p class="muted" style="margin:0 0 8px">Open 📱 Orders or Alerts to see your OTP, then tell the delivery partner.</p>${due.map((o) => { const p = PRODUCTS.find((q) => q.id === o.pid) || {}; return `<div class="rp-row"><span style="font-size:22px">${p.icon || '📦'}</span><b style="flex:1;text-align:left">${p.name || 'Parcel'}</b><span class="muted">#${o.id}</span></div>`; }).join('')}<div class="otp-in">${[0, 1, 2, 3].map((i) => `<i>${typed[i] || ''}</i>`).join('')}</div><div class="otp-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div><button class="btn ghost" data-peek="1" style="margin-top:8px">📱 Check my phone</button></div>`);
      $$('#rp-win [data-k]').forEach((b) => (b.onclick = () => { const k = b.dataset.k; if (k === '⌫') typed = typed.slice(0, -1); else if (k === '✓') return check(); else if (typed.length < 4) typed += k; L.sfx && L.sfx('click'); draw(); }));
      $('#rp-win [data-peek]').onclick = () => { openPhone('orders'); };
    };
    const check = () => {
      const hit = due.filter((o) => o.otp === typed);
      if (!hit.length) { L.sfx && L.sfx('hurt', { volume: 0.4 }); say('❌ "That OTP is not right. Check your phone."'); typed = ''; return draw(); }
      // one OTP per order: hand over the ones that match; the rest need their own OTP
      hit.forEach(handOver); save(); hud(); L.sfx && L.sfx('win');
      const left = due.filter((o) => !o.done);
      if (left.length) { say(`✅ Thanks! You have ${left.length} more parcel${left.length > 1 ? 's' : ''}. Tell me the next OTP.`); typed = ''; due.splice(0, due.length, ...left); return draw(); }
      closeUi(); say('✅ "Here you go! Have a nice day."'); CR.st = 'back'; CR.box.visible = false;
    };
    draw();
  }
  function tickCourier(dt) {
    if (!CR.st) return;
    const v = CR.van, m = CR.man, walk = (tx, tz, sp) => { const dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz); if (d < 0.15) return true; m.position.x += (dx / d) * Math.min(d, sp * dt); m.position.z += (dz / d) * Math.min(d, sp * dt); m.rotation.y = Math.atan2(dx, dz); const u = m.userData, w = Math.sin(performance.now() / 120) * 0.6; u.legs[0].rotation.x = w; u.legs[1].rotation.x = -w; return false; };
    if (CR.st === 'drive' || CR.st === 'leave') {
      CR.t = Math.min(1, CR.t + dt / 7); const k = CR.st === 'drive' ? 1 - (1 - CR.t) * (1 - CR.t) : CR.t * CR.t, a = CR.st === 'drive' ? CR.start : CR.stop, b = CR.st === 'drive' ? CR.stop : CR.start;
      v.position.x = a.x + (b.x - a.x) * k; v.position.z = a.z + (b.z - a.z) * k;
      if (CR.t >= 1) { if (CR.st === 'drive') { CR.st = 'walk'; m.visible = true; m.position.set(CR.stop.x, Y0, CR.stop.z); } else { E.scene.remove(v); E.scene.remove(m); OBJ.splice(OBJ.indexOf(CR.o), 1); CR.st = null; deliverOrders(); } }
    } else if (CR.st === 'walk') { if (walk(CR.d.x, CR.d.z, 2.2)) { CR.st = 'wait'; CR.wait = 0; notify(`🚚 Your delivery partner is waiting at ${CR.d.name}. Share your OTP.`); } }
    else if (CR.st === 'wait') { const F = E.getF(); m.rotation.y = Math.atan2(F.x - m.position.x, F.z - m.position.z); CR.wait += dt; const u = m.userData; u.legs[0].rotation.x = u.legs[1].rotation.x = 0; }
    else if (CR.st === 'back') { if (walk(CR.stop.x, CR.stop.z, 2.6)) { m.visible = false; CR.st = 'leave'; CR.t = 0; } }
  }

  /* ---------- Maps and GPS ---------- */
  const PLACES = []; // {name, icon, x, z}
  function places() {
    const [mx, mz] = E.lotC(...E.RP_LOTS.market), [tx, tz] = E.lotC(...E.RP_LOTS.biz), [gx, gz] = E.lotC(1, 1, 0, 0);
    const list = [{ name: 'Business Tower', icon: '🏢', x: tx, z: tz + 14 }, { name: 'LSP Market', icon: '🛒', x: mx - 1, z: mz + 9 }, { name: 'Garage', icon: '🔧', x: gx, z: gz }];
    if (S.home != null) { const g = curHouse().group.position; list.unshift({ name: 'Home', icon: '🏠', x: g.x - 6.3, z: g.z - 3 }); }
    return list.concat(PLACES);
  }
  function setGps(p) { S.gps = p ? { name: p.name, icon: p.icon, x: p.x, z: p.z } : null; save(); gpsHud(); if (p) say(`📍 GPS set: ${p.icon} ${p.name}`); }
  function gpsHud() {
    const el = $('#rp-gps'); if (!el) return; const g = S && S.gps; el.hidden = !g; if (!g) { if (D3.beam) D3.beam.visible = false; return; }
    const me = E.G.mode === 'drive' ? E.getP() : E.getF(), dx = g.x - me.x, dz = g.z - me.z, d = Math.hypot(dx, dz);
    if (d < 10 && !(me.y > 20)) { say(`📍 You arrived at ${g.icon} ${g.name}`); S.gps = null; el.hidden = true; if (D3.beam) D3.beam.visible = false; return; }
    const head = E.G.mode === 'drive' ? me.h : me.h, rel = wrapA(Math.atan2(dx, dz) - head), arrows = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
    const idx = ((Math.round(-rel / (Math.PI / 4)) % 8) + 8) % 8;
    el.textContent = `${arrows[idx]} ${g.icon} ${g.name} · ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}`;
    if (!D3.beam) { D3.beam = new E.T.Mesh(new E.T.CylinderGeometry(1.2, 1.2, 120, 16, 1, true), new E.T.MeshBasicMaterial({ color: '#ffb31a', transparent: true, opacity: 0.35, depthWrite: false, side: E.T.DoubleSide })); E.scene.add(D3.beam); }
    D3.beam.visible = true; D3.beam.position.set(g.x, 60, g.z);
  }
  function mapHtml() {
    return `<canvas id="rp-mapcv" width="600" height="600" style="width:100%;border-radius:12px;background:#7fb66a;touch-action:none"></canvas><p class="muted" style="font-size:12px;margin:6px 0">Tap a place to set the GPS.</p>${places().map((p, i) => `<button class="rp-row" data-gps="${i}" style="width:100%;border:0;cursor:pointer;text-align:left"><span style="font-size:22px">${p.icon}</span><b style="flex:1">${p.name}</b><span class="muted">${distTo(p)}</span></button>`).join('')}${S.gps ? '<button class="btn ghost" data-gps="off">✕ Stop GPS</button>' : ''}`;
  }
  const distTo = (p) => { const me = E.G.mode === 'drive' ? E.getP() : E.getF(), d = Math.hypot(p.x - me.x, p.z - me.z); return d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'; };
  function drawMap() {
    const cv = $('#rp-mapcv'); if (!cv) return; const g = cv.getContext('2d'), W = 600, x0 = -245, x1 = 345, z0 = -245, z1 = 480, sc = W / Math.max(x1 - x0, z1 - z0), off = (W - (x1 - x0) * sc) / 2;
    // same orientation as the minimap: north (+z) up, +x to the left
    const X = (x) => (x1 - x) * sc + off, Z = (z) => (z1 - z) * sc, R = (ax, az, bx, bz) => g.fillRect(X(Math.max(ax, bx)), Z(Math.max(az, bz)), Math.abs(bx - ax) * sc, Math.abs(bz - az) * sc);
    g.fillStyle = '#7fb66a'; g.fillRect(0, 0, W, W); g.fillStyle = '#b48a5c'; R(223, -236, 332, 236);
    g.fillStyle = '#c3c8d0'; for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 6; bz++) R(E.RX(bx) + 7, E.RX(bz) + 7, E.RX(bx) + 65, E.RX(bz) + 65);
    g.fillStyle = 'rgba(214,31,48,.45)'; R(E.TURF.x0, E.TURF.z0, E.TURF.x1, E.TURF.z1);
    g.fillStyle = '#4d525b'; for (let i = 0; i <= 6; i++) { R(-223, E.RX(i) - 7, 223, E.RX(i) + 7); R(E.RX(i) - 7, -223, E.RX(i) + 7, 223); }
    R(-7, 216, 7, 300);
    EXT.forEach((m) => m.drawMap && m.drawMap(g, R, X, Z, sc));
    g.font = '22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of places()) if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) { g.fillStyle = '#fff'; g.beginPath(); g.arc(X(p.x), Z(p.z), 15, 0, 7); g.fill(); g.fillText(p.icon, X(p.x), Z(p.z) + 1); }
    if (S.gps) { g.strokeStyle = '#ffb31a'; g.lineWidth = 4; g.beginPath(); g.arc(X(S.gps.x), Z(S.gps.z), 19, 0, 7); g.stroke(); }
    const me = E.G.mode === 'drive' ? E.getP() : E.getF(); g.save(); g.translate(X(me.x), Z(me.z)); g.rotate(-me.h); g.fillStyle = '#2f6bff'; g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.restore();
    cv.onclick = (e) => { const r = cv.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, pz = ((e.clientY - r.top) / r.height) * W; let best = null; for (const p of places()) { const d = Math.hypot(X(p.x) - px, Z(p.z) - pz); if (d < 30 && (!best || d < best.d)) best = { d, p }; } if (best) { setGps(best.p); openPhone('maps'); } };
  }

  const orderStatus = (o) => { if (o.done) return ['Delivered', 100]; if (o.out) return [CR.st === 'wait' ? 'Delivery partner is at ' + dropPoint().name : 'Out for delivery', 96]; const f = (absMin() - o.at) / (o.eta - o.at); return [f < 0.25 ? 'Order placed' : f < 0.6 ? 'Shipped' : 'Out for delivery', Math.round(f * 100)]; };
  const etaTxt = (o) => { const m = Math.max(0, o.eta - absMin()); return m < 60 ? `${Math.ceil(m)} min` : m < DAY_MIN ? `${Math.ceil(m / 60)} h` : `${Math.ceil(m / DAY_MIN)} days`; };
  function ordersHtml() {
    const os = S.orders || [];
    return os.length ? os.map((o) => { const p = PRODUCTS.find((q) => q.id === o.pid) || { icon: '📦', name: o.pid }, [st, pc] = orderStatus(o); return `<div class="rp-row"><span style="font-size:24px">${p.icon}</span><div style="flex:1"><b>${p.name}</b><div class="muted" style="font-size:12px">#${o.id} · ${st}${o.done || o.out ? '' : ' · ' + etaTxt(o)}</div>${o.out && !o.done ? `<div style="font:700 15px ui-monospace,monospace;color:#2f6bff;margin-top:2px">🔐 OTP ${o.otp}</div>` : ''}<div class="bar" style="height:6px;background:#e1e6ef;border-radius:4px;margin-top:4px"><i style="display:block;height:100%;width:${pc}%;background:#14c79a;border-radius:4px"></i></div></div></div>`; }).join('') : '<p class="muted">No orders yet. Shop on the LSP Store!</p>';
  }
  function bankHtml() {
    const c = S.card;
    return `<div class="lf-grid"><div class="lf-card"><span class="ic">🏦</span><b>LSP UPI balance: ${fmt$(S.cash)}</b><p>Swap money for LSP points: $50 → ⭐ 10.</p><button class="btn gold" data-swap="1" ${S.cash < 50 ? 'disabled' : ''}>Swap $50 for ⭐ 10</button></div>
      <div class="lf-card"><span class="ic">💳</span>${c ? `<b>LSP Credit Card</b><p>Limit ${fmt$(c.limit)} · Bill ${fmt$(c.due)}</p><p class="muted">Unpaid bills grow 2% each game day.</p><button class="btn primary" data-paybill="1" ${!c.due || S.cash < 1 ? 'disabled' : ''}>Pay bill</button>` : `<b>LSP Credit Card</b><p>Buy now, pay later. Limit grows with your businesses.</p><button class="btn primary" data-getcard="1">Get a card (free)</button>`}</div></div>`;
  }
  function wireBank(reopen) {
    $$('#rp-win [data-swap]').forEach((b) => (b.onclick = () => { if (S.cash < 50) return; S.cash -= 50; txn('⭐ Swapped for 10 LSP points', -50); Wallet.add(10); save(); hud(); L.sfx && L.sfx('coin'); reopen(); }));
    $$('#rp-win [data-getcard]').forEach((b) => (b.onclick = () => { S.card = { limit: cardLimit(), due: 0, no: '4' + String(Math.floor(Math.random() * 1e15)).padStart(15, '0') }; save(); notify(`💳 Your LSP Credit Card is ready. Limit ${fmt$(S.card.limit)}.`); reopen(); }));
    $$('#rp-win [data-paybill]').forEach((b) => (b.onclick = () => { const n = Math.min(S.cash, S.card.due); S.cash -= n; S.card.due -= n; txn('💳 Credit card bill paid', -n); save(); hud(); L.sfx && L.sfx('cash'); reopen(); }));
  }
  const cardLimit = () => 500 + 1000 * Object.keys(S.biz || {}).length + (S.home != null ? Math.min(50000, Math.floor(design().price / 10)) : 0);

  /* ---------- your phone ---------- */
  const phoneP = () => PRODUCTS.find((p) => p.id === S.phone);
  function openPhone(app) {
    stopAct(); if (shift) return;
    const ph = phoneP(), color = ph ? ph.phone : '#3a4566', name = ph ? ph.name : 'LSP Starter';
    const ALL = [['upi', '📲', 'LSP UPI'], ['wallet', '👛', 'Wallet'], ['web', '🌐', 'LSP Web'], ['play', '🏪', 'Play Store'], ['maps', '🗺️', 'Maps'], ['notes', '🔔', 'Alerts'], ['settings', '⚙️', 'Settings'], ['store', '🛍️', 'LSP Store'], ['orders', '📦', 'Orders'], ['biz', '🏢', 'Business'], ['stuff', '🎒', 'My stuff'], ['eats', '🍔', 'LSP Eats'], ['jobs', '💼', 'LSP Jobs'], ['home', '🏡', 'Home Designer'], ...EXT.flatMap((m) => (m.apps || []).map((a) => [a.id, a.icon, a.label]))];
    const APPS = ALL.filter(([id]) => installed(id));
    if (app && !installed(app)) app = 'play';
    let body = '';
    if (!app) body = `<div class="ph-apps">${APPS.map(([id, ic, l]) => `<button data-papp="${id}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    else if (app === 'upi') body = `<div class="ph-bal"><small>LSP UPI balance</small><b>${fmt$(S.cash)}</b><small>${(window.Social && Social.me()) || 'you'}@lspupi</small></div><p class="muted" style="font-size:12px;margin:6px 0">Scan & pay at shops and stalls. Customers pay you by scanning your QR.</p>${(S.txns || []).slice(0, 25).map((t) => `<div class="rp-row"><div style="flex:1"><b style="font-size:13px">${t.label}</b><div class="muted" style="font-size:11px">Day ${t.day} · ${t.at}</div></div><b style="color:${t.amt >= 0 ? '#14c79a' : '#ff4d5e'}">${t.amt >= 0 ? '+' : '−'}${fmt$(Math.abs(t.amt))}</b></div>`).join('') || '<p class="muted">No payments yet.</p>'}`;
    else if (app === 'wallet') body = `<div class="ph-card" style="background:linear-gradient(135deg,#16203d,#2f6bff)"><small>LSP UPI</small><b>${fmt$(S.cash)}</b></div>${S.card ? `<div class="ph-card" style="background:linear-gradient(135deg,#6a3fa0,#ff4d8b)"><small>LSP Credit Card · ${S.card.no.slice(0, 4)} •••• ${S.card.no.slice(-4)}</small><b>${fmt$(cardLeft())} left</b><small>Bill ${fmt$(S.card.due)} of ${fmt$(S.card.limit)}</small></div>` : '<p class="muted">No credit card yet. Get one in the Bank app on a laptop.</p>'}${Object.values(S.biz || {}).map((o) => `<div class="ph-card" style="background:linear-gradient(135deg,#ffb31a,#ff8a3d);color:#16203d"><small>Business ID · TAXIN</small><b style="font-family:ui-monospace,monospace;font-size:15px">${o.taxin}</b><small>${o.name}</small></div>`).join('')}${bankHtml()}`;
    else if (app === 'store') body = storeHtml(D3.cat || 'Phones', D3.q || '');
    else if (app === 'orders') body = ordersHtml();
    else if (app === 'biz') body = Object.keys(S.biz || {}).length ? Object.entries(S.biz).map(([id, o]) => { const b = BIZ.find((q) => q.id === id); return `<div class="rp-row"><span style="font-size:24px">${b.icon}</span><div style="flex:1"><b>${o.name}</b><div class="muted" style="font-size:11px;font-family:ui-monospace,monospace">TAXIN ${o.taxin}</div><div class="muted" style="font-size:12px">Floor ${o.floor} · Lv ${o.lv} · ${o.sales || 0} sales · made ${fmt$(o.made || 0)}</div></div><b>${fmt$(o.bank)}</b></div>`; }).join('') + '<p class="muted" style="font-size:12px">Collect and upgrade at Business Tower reception or on a laptop.</p>' : '<p class="muted">No business yet. Go to the 🏢 Business Tower and register one for free.</p>';
    else if (app === 'stuff') body = (S.stuff || []).length ? S.stuff.map((it, k) => { const p = PRODUCTS.find((q) => q.id === it.id); return `<div class="rp-row"><span style="font-size:24px">${it.icon}</span><div style="flex:1"><b>${it.name}</b> ×${it.n}</div>${p && p.use ? `<button class="btn primary" data-use="${k}" style="height:34px;font-size:13px">Use</button>` : ''}</div>`; }).join('') : '<p class="muted">Your bag is empty. Things you buy show up here.</p>';
    else if (app === 'notes') body = (S.notes || []).map((n) => `<div class="rp-row"><div><b style="font-size:13px">${n.m}</b><div class="muted" style="font-size:11px">Day ${n.day} · ${n.at}</div></div></div>`).join('') || '<p class="muted">No alerts.</p>';
    else if (app === 'maps') body = mapHtml();
    else if (app === 'settings') body = settingsHtml();
    else if (app === 'play') body = playHtml();
    else if (app === 'web') body = webHtml();
    else if (app === 'eats') body = eatsHtml();
    else if (app === 'jobs') body = jobsHtml();
    else if (app === 'home') body = designerHtml();
    else { const xa = EXT.flatMap((m) => m.apps || []).find((a) => a.id === app); if (xa) body = xa.html(); }
    const title = app ? ALL.find((a) => a[0] === app) : null;
    openUi(`<div class="ph" style="--ph:${color}"><div class="ph-bar"><span>${clockTxt()}</span><span>${name}</span><span>📶 🔋</span></div><div class="ph-top">${app ? '<button data-papp="" class="ph-back">‹</button>' : ''}<b>${title ? title[1] + ' ' + title[2] : '📱 Home'}</b><button class="x" data-ui="close">✕</button></div><div class="ph-body">${body}</div></div>`);
    $('#rp-win').classList.add('phone');
    $$('#rp-win [data-papp]').forEach((x) => (x.onclick = () => openPhone(x.dataset.papp || null)));
    if (app === 'store') wireStore((c, q) => { if (c) D3.cat = c; D3.q = q; openPhone('store'); });
    if (app === 'wallet') wireBank(() => openPhone('wallet'));
    if (app === 'settings') wireSettings(() => openPhone('settings'));
    if (app === 'play') wirePlay();
    if (app === 'web') wireWeb();
    if (app === 'eats') wireEats();
    if (app === 'jobs') wireJobs(() => openPhone('jobs'));
    if (app === 'home') wireDesigner(() => openPhone('home'));
    if (app === 'maps') { drawMap(); $$('#rp-win [data-gps]').forEach((b) => (b.onclick = () => { if (b.dataset.gps === 'off') setGps(null); else setGps(places()[+b.dataset.gps]); openPhone('maps'); })); }
    { const xa = EXT.flatMap((m) => m.apps || []).find((a) => a.id === app); if (xa && xa.wire) xa.wire(); }
    $$('#rp-win [data-use]').forEach((x) => (x.onclick = () => { const it = S.stuff[+x.dataset.use], p = PRODUCTS.find((q) => q.id === it.id); closeUi(); activity('use', `Using your ${it.name.toLowerCase()}`, 5, Object.fromEntries(Object.entries(p.use).map(([k, v]) => [k, v / 5]))); }));
  }

  /* ---------- needs, money, activities ---------- */
  const NEEDS = [['hunger', '🍔'], ['energy', '⚡'], ['hygiene', '🫧'], ['fun', '🎉']];
  function addNeeds(d, k = 1) { for (const n in d) if (S.needs[n] != null) S.needs[n] = clamp(S.needs[n] + d[n] * k, 0, 100); }
  const mood = () => (S.needs.hunger + S.needs.energy + S.needs.hygiene + S.needs.fun) / 4;
  function say(m, ms) { toast(m, (ms || 2600) * (SET.msg === 'normal' ? 1 : 1.8)); }
  function activity(id, text, secs, gain, spot) {
    stopAct(); act = { id, text, t: 0, secs, gain, spot: spot ? { ...spot, x: spot.x + curHouse().group.position.x, z: spot.z + curHouse().group.position.z } : null };
    if (act.spot) act.spot.floor = E.getF().floor || 0;
    if (act.spot) { const F = E.getF(); F.x = act.spot.x; F.z = act.spot.z; F.h = act.spot.face; }
    $('#rp-act').hidden = false; $('#rp-act-t').textContent = text; L.sfx && L.sfx('click');
  }
  const curHouse = () => BUILD.find((b) => b.house === S.home) || BUILD[0];
  function stopAct() { if (!act) return; act = null; $('#rp-act').hidden = true; const b = curHouse(); if (b && b.F) b.F.screen.material = E.M('#0b0d12'); }
  const cartTotal = () => cart.reduce((a, id) => a + FOODS[id].price, 0);
  function addToCart(id, open24) {
    if (!open24 && (hour() < 8 || hour() >= 22)) return say('The market is closed. It opens at 8 AM.');
    if (cart.length >= (open24 ? 40 : 12)) return say(open24 ? 'Your cart is full. Pay at a checkout lane.' : 'Your basket is full. Pay at the till.');
    cart.push(id); L.sfx && L.sfx('pop'); say(`${FOODS[id].icon} added. Basket ${fmt$(cartTotal())}`, 1600); hud();
  }
  function checkout() {
    if (!cart.length) return say('Pick food from the shelves first.');
    const total = cartTotal(); if (!canPay(total)) return say(`You need ${fmt$(total)} but have ${fmt$(S.cash)}. Work on your laptop or do deliveries!`);
    const items = cart.slice(); cart = []; hud();
    showQR('LSP Market', total, false, () => { pay(total, '🛒 LSP Market'); for (const id of items) S.pantry[id] = (S.pantry[id] || 0) + 1; say(`Paid ${fmt$(total)} with LSP UPI. The food is in your fridge at home.`, 3000); save(); hud(); });
  }

  /* ---------- windows: fridge, stove, laptop ---------- */
  function openUi(html, laptop) {
    ui = true; const w = $('#rp-win'); w.className = 'lf-win' + (laptop ? ' laptop' : ''); w.innerHTML = html; $('#rp-ui').hidden = false;
    w.querySelectorAll('[data-ui]').forEach((b) => (b.onclick = () => (b.dataset.ui === 'endshift' ? endShift() : closeUi())));
    for (const k in E.K) E.K[k] = false; for (const k in E.TIN) E.TIN[k] = false;
  }
  function closeUi() { ui = false; const u = $('#rp-ui'); if (u) u.hidden = true; }
  function openFridge() {
    stopAct(); const list = Object.keys(FOODS).filter((id) => S.pantry[id] > 0);
    openUi(`<div class="lf-top"><h3>🧊 Fridge</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body">${list.length ? list.map((id) => { const f = FOODS[id]; return `<div class="lf-food"><span>${f.icon} ${f.name} ×${S.pantry[id]}</span>${f.ingredient ? '<small class="muted">for cooking</small>' : `<button class="btn primary" data-eat="${id}" style="height:38px;font-size:14px">Eat</button>`}</div>`; }).join('') : '<p class="muted">Empty! Shop at the LSP Market in the city.</p>'}</div>`);
    $$('#rp-win [data-eat]').forEach((b) => (b.onclick = () => { const f = FOODS[b.dataset.eat]; S.pantry[b.dataset.eat]--; closeUi(); activity('eat', `Eating ${f.name.toLowerCase()}`, 3, { hunger: f.fill / 3, energy: (f.energy || 0) / 3, fun: (f.fun || 0) / 3 }); L.sfx && L.sfx('eat'); save(); }));
  }
  function openStove() {
    stopAct();
    openUi(`<div class="lf-top"><h3>🍳 Cook</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="lf-grid">${RECIPES.map((r) => { const ok = Object.entries(r.need).every(([k, n]) => (S.pantry[k] || 0) >= n); return `<div class="lf-card"><span class="ic">${r.icon}</span><b>${r.name}</b><p>Needs ${Object.keys(r.need).map((k) => FOODS[k].icon).join(' + ')}</p><button class="btn ${ok ? 'primary' : 'ghost'}" data-cook="${r.id}" ${ok ? '' : 'disabled'}>${ok ? 'Cook' : 'Missing food'}</button></div>`; }).join('')}</div></div>`);
    $$('#rp-win [data-cook]').forEach((b) => (b.onclick = () => { const r = RECIPES.find((x) => x.id === b.dataset.cook); for (const [k, n] of Object.entries(r.need)) S.pantry[k] -= n; closeUi(); save(); activity('cook', `Cooking ${r.name.toLowerCase()}`, 5, { hunger: r.fill / 5, fun: r.fun / 5 }, { x: -1, z: -11.7, face: Math.PI }); }));
  }
  let publicPc = false;
  function openLaptop(tab, pub) {
    if (pub !== undefined) publicPc = pub;
    if (tab === 'biz') return openBusiness();
    const apps = `<div class="lf-apps">${[['jobs', '💼 Jobs'], ['store', '🛍️ LSP Store'], ['orders', '📦 Orders'], ['biz', '🏢 Business'], ['bank', '🏦 Bank & card']].map(([id, l]) => `<button data-app="${id}" class="${tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'jobs') body = `<div class="lf-grid">${JOBS.map((j) => `<div class="lf-card"><span class="ic">${j.icon}</span><b>${j.name}</b><p>${j.desc}</p><p>Level ${1 + Math.floor((S.jobs[j.id] || 0) / 5)}</p><button class="btn primary" data-job="${j.id}">Start 60s shift</button></div>`).join('')}</div>`;
    else if (tab === 'store') body = storeHtml(D3.cat || 'Phones', D3.q || '');
    else if (tab === 'orders') body = ordersHtml();
    else body = bankHtml();
    openUi(`<div class="lf-top"><h3>💻 LSP OS</h3><span class="pill" style="background:#2f3850;color:#fff;border:0">${fmt$(S.cash)}${S.card ? ' · 💳 ' + fmt$(cardLeft()) : ''}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body">${apps}<div style="margin-top:12px">${body}</div></div>`, true);
    $$('#rp-win [data-app]').forEach((b) => (b.onclick = () => openLaptop(b.dataset.app)));
    $$('#rp-win [data-job]').forEach((b) => (b.onclick = () => startShift(b.dataset.job)));
    if (tab === 'store') wireStore((c, q) => { if (c) D3.cat = c; D3.q = q; openLaptop('store'); });
    if (tab === 'bank') wireBank(() => openLaptop('bank'));
  }
  const payMult = () => (shift && shift.mult ? shift.mult : 1) * (has('pc') ? 1.25 : 1) * (mood() >= 60 ? 1.2 : mood() < 30 ? 0.8 : 1) * (1 + 0.1 * Math.floor((S.jobs[shift.id] || 0) / 5));
  function startShift(id, opt) {
    if (S.needs.hunger < 8) return say('Too hungry to work. Eat first!');
    if (S.needs.energy < 8) return say('Too tired to work. Sleep first!');
    shift = { id, t: 60, pay: 0, done: 0, good: 0, mult: (opt && opt.mult) || 1, title: opt && opt.title }; nextTask();
  }
  function nextTask() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)], s = shift, j = JOBS.find((x) => x.id === s.id);
    s.task = s.id === 'type' ? { s: pick(SENTENCES) } : s.id === 'code' ? pick(CODE) : pick(SUPPORT);
    let body;
    if (s.id === 'type') body = `<div class="lf-task"><div class="q">Type this exactly:</div><div class="lf-type" id="rp-target">${s.task.s}</div><input class="lf-in" id="rp-typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type, then press Enter"></div>`;
    else body = `<div class="lf-task">${s.id === 'code' ? `<div class="q">What does this print?</div><pre>${s.task.c.replace(/</g, '&lt;')}</pre>` : `<div class="q">💬 "${s.task.q}"</div>`}<div class="lf-opts">${s.task.o.map((o, i) => `<button data-opt="${i}">${o}</button>`).join('')}</div></div>`;
    openUi(`<div class="lf-top"><h3>${j.icon} ${j.name} shift</h3><button class="x" data-ui="endshift">✕</button></div><div class="lf-body">${body}<div class="lf-shift"><span>⏱️ <span id="rp-st">${Math.ceil(s.t)}</span>s</span><span>Earned ${fmt$(s.pay)}</span><span>${s.good}/${s.done}</span></div></div>`, true);
    if (s.id === 'type') {
      const inp = $('#rp-typed'), tgt = s.task.s; setTimeout(() => inp.focus(), 30);
      inp.oninput = () => { const v = inp.value; $('#rp-target').innerHTML = tgt.split('').map((ch, i) => (i < v.length ? `<span class="${v[i] === ch ? 'ok' : 'no'}">${ch}</span>` : ch)).join(''); };
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { const v = inp.value; let ok = 0; for (let i = 0; i < tgt.length; i++) if (v[i] === tgt[i]) ok++; const acc = ok / tgt.length; s.pay += Math.round(ok * 0.2 * acc * payMult()); s.done++; if (acc > 0.9) s.good++; L.sfx && L.sfx(acc > 0.9 ? 'ding' : 'click'); nextTask(); } };
    } else $$('#rp-win [data-opt]').forEach((b) => (b.onclick = () => {
      const right = +b.dataset.opt === s.task.a; s.done++; if (right) { s.good++; s.pay += Math.round((s.id === 'code' ? 12 : 9) * payMult()); }
      b.classList.add(right ? 'good' : 'bad'); if (!right) $$('#rp-win [data-opt]')[s.task.a].classList.add('good'); $$('#rp-win [data-opt]').forEach((x) => (x.disabled = true)); L.sfx && L.sfx(right ? 'ding' : 'hurt', { volume: 0.5 });
      setTimeout(() => shift && nextTask(), 700);
    }));
  }
  function endShift() {
    const s = shift; if (!s) return; shift = null;
    receive(s.pay, `💼 ${s.title || JOBS.find((j) => j.id === s.id).name + ' shift'}`); S.earned += s.pay; S.shifts++; S.jobs[s.id] = (S.jobs[s.id] || 0) + s.good; addNeeds({ energy: -12, hunger: -8, fun: -4 });
    const pts = s.pay > 0 ? Wallet.add(Math.max(1, Math.round(s.pay / 4))) : 0; save(); hud(); L.sfx && L.sfx(s.pay ? 'cash' : 'lose');
    openUi(`<div class="lf-top"><h3>Shift over</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="text-align:center"><p style="font-family:Fredoka,system-ui,sans-serif;font-size:40px;font-weight:700;color:#14c79a;margin:6px 0">${fmt$(s.pay)}</p><p>${s.good} of ${s.done} done well · ⭐ +${pts}</p><button class="btn primary" data-again="1">Another shift</button></div>`, true);
    $$('#rp-win [data-again]').forEach((b) => (b.onclick = () => openLaptop('jobs')));
  }

  /* ---------- HUD ---------- */
  function hud() {
    if (!S || !$('#rp-cash')) return;
    $('#rp-cash').textContent = fmt$(S.cash); $('#rp-clock').textContent = `${hour() >= 6 && hour() < 19 ? '☀️' : '🌙'} ${clockTxt()}`;
    $('#rp-needs').innerHTML = NEEDS.map(([n, ic]) => `<span style="color:${S.needs[n] < 20 ? '#ff4d5e' : 'inherit'}">${ic}${Math.round(S.needs[n])}</span>`).join(' ');
    const c = $('#rp-cart'); c.hidden = !cart.length; c.textContent = `🛒 ${cart.length} · ${fmt$(cartTotal())}`;
  }

  function pushCols(F, ox, oz, cols) {
      const r = 0.35; let px = F.x - ox, pz = F.z - oz;
      for (const [x0, z0, x1, z1] of cols) {
        const cx = clamp(px, x0, x1), cz = clamp(pz, z0, z1), dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
        if (d >= r) continue;
        if (d > 1e-4) { px = cx + (dx / d) * r; pz = cz + (dz / d) * r; }
        else { const o = [[px - x0 + r, -1, 0], [x1 - px + r, 1, 0], [pz - z0 + r, 0, -1], [z1 - pz + r, 0, 1]].sort((a, q) => a[0] - q[0])[0]; px += o[1] * o[0]; pz += o[2] * o[0]; }
      }
      F.x = px + ox; F.z = pz + oz;
  }
  /* ---------- settings (kept on this device) ---------- */
  const SET_KEY = 'lspdrive.settings', SPEEDS = { real: 1 / 60, slow: 1, normal: 2, fast: 4 };
  const SET = (() => { try { return { wx: 'auto', speed: 'normal', gfx: 'high', msg: 'normal', ...(JSON.parse(localStorage.getItem(SET_KEY)) || {}) }; } catch (e) { return { speed: 'normal', gfx: 'high', msg: 'normal' }; } })();
  const mps = () => SPEEDS[SET.speed] || 2;
  function saveSet() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) {} applySet(); }
  function applySet() {
    const r = E && E.renderer; if (r) { const touch = L.isTouch(); r.setPixelRatio(SET.gfx === 'low' ? 0.75 : Math.min(devicePixelRatio || 1, touch ? 1.25 : 1.5)); }
    if (E && E.sun) E.sun.castShadow = SET.gfx !== 'low' && !L.isTouch();
    document.body.classList.toggle('rp-bigmsg', SET.msg === 'large');
  }
  function settingsHtml() {
    const row = (k, label, opts) => `<p style="margin:12px 0 6px"><b>${label}</b></p><div class="rp-cats">${opts.map(([v, n]) => `<button data-set="${k}:${v}" class="${SET[k] === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    return `${row('speed', '⏱️ Clock speed', [['real', 'Real time (1 min = 60 s)'], ['slow', 'Slow (1 min = 1 s)'], ['normal', 'Normal (2 min = 1 s)'], ['fast', 'Fast (4 min = 1 s)']])}
      ${row('gfx', '🖥️ Graphics', [['high', 'High (shadows)'], ['low', 'Low (faster)']])}
      ${window.LSPDriveReal ? row('wx', '🌦️ Weather', [['auto', 'Changes by itself'], ['clear', 'Always clear'], ['rain', 'Rain'], ['storm', 'Thunderstorm']]) : ''}
      ${row('msg', '💬 Messages', [['normal', 'Normal'], ['long', 'Stay longer'], ['large', 'Large and longer']])}
      <p style="margin:14px 0 6px"><b>📜 Rules of LSP Town</b></p>${RULES_HTML}`;
  }
  function wireSettings(re) { $$('#rp-win [data-set]').forEach((b) => (b.onclick = () => { const [k, v] = b.dataset.set.split(':'); SET[k] = v; saveSet(); if (k === 'wx' && window.LSPDriveReal) LSPDriveReal.setWeather(v); L.sfx && L.sfx('click'); re(); })); }
  const RULES_HTML = `<div class="rp-rules"><div>🚫 <b>No online dating or flirting.</b> No boyfriend/girlfriend roleplay, no "date me".</div><div>🔞 <b>Nothing sexual.</b> No sexual words, jokes or roleplay.</div><div>🤬 <b>No swearing or bullying.</b> Bad words are hidden.</div><div>🛡️ Never share your address, phone number or passwords.</div><div>⚠️ Breaking the rules: the message is blocked, 3 warnings = muted, admins can ban.</div></div>`;
  function showRules(first) {
    openUi(`<div class="lf-top"><h3>📜 LSP Town rules</h3>${first ? '' : '<button class="x" data-ui="close">✕</button>'}</div><div class="lf-body" style="max-width:460px">${RULES_HTML}<button class="btn primary" data-agree="1" style="margin-top:12px;width:100%">I agree</button></div>`);
    $('#rp-win [data-agree]').onclick = () => { try { localStorage.setItem('lspdrive.rules', '1'); } catch (e) {} closeUi(); };
  }

  /* ---------- sleeping, the alarm clock and the drawer ---------- */
  function sleepUi(spot, gainE) {
    stopAct();
    openUi(`<div class="lf-top"><h3>🛏️ Go to sleep</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:420px;text-align:center"><p>It is ${clockTxt()}. How long do you want to sleep? Your alarm will wake you up.</p><div class="lf-grid">${[6, 8, 10, 12].map((h) => `<button class="btn ${h === 8 ? 'primary' : 'ghost'}" data-sleep="${h}">${h} hours<br><small>wake at ${clockTxt((S.time + h * 60) % DAY_MIN)}</small></button>`).join('')}</div></div>`);
    $$('#rp-win [data-sleep]').forEach((b) => (b.onclick = () => { closeUi(); D3.wakeAt = absMin() + +b.dataset.sleep * 60; activity('sleep', `Sleeping until ${clockTxt((S.time + +b.dataset.sleep * 60) % DAY_MIN)}… zzz`, 99, { energy: gainE }, spot); }));
  }
  function goodMorning() {
    stopAct(); D3.wakeAt = null; L.sfx && L.sfx('beep');
    let el = $('#rp-gm'); if (!el) { $('#s-drive').insertAdjacentHTML('beforeend', '<div id="rp-gm"></div>'); el = $('#rp-gm'); }
    const me = (window.Social && Social.me()) || '';
    el.innerHTML = `<div class="gm-sky"><div class="gm-sun"></div></div><div class="gm-card"><div class="gm-clock"><div class="gm-bell l"></div><div class="gm-bell r"></div><div class="gm-face"><i class="gm-h"></i><i class="gm-m"></i></div><div class="gm-feet"></div></div><h2>Good morning${me ? ', ' + me : ''}! ☀️</h2><p>${clockTxt()} · Day ${S.day}. You feel rested.</p><div class="gm-btns"><button class="btn primary" data-gm="up">Get up</button><button class="btn ghost" data-gm="drawer">🗄️ Open the drawer</button></div></div>`;
    el.hidden = false; let n = 0; const ring = setInterval(() => { if (++n > 6 || el.hidden) return clearInterval(ring); L.sfx && L.sfx('beep', { volume: 0.4 }); }, 450);
    el.querySelector('[data-gm="up"]').onclick = () => { el.hidden = true; };
    el.querySelector('[data-gm="drawer"]').onclick = () => { el.hidden = true; openDrawer(); };
  }
  function openDrawer() {
    S.drawer = S.drawer || {}; const found = S.drawer.day !== S.day && Math.random() < 0.5 ? 5 + Math.floor(Math.random() * 46) : 0; S.drawer.day = S.day;
    if (found) receive(found, '🗄️ Cash you found in your drawer');
    const items = [['⌚', 'Watch'], ['👛', 'Wallet'], ['🔌', 'Phone charger'], ['📓', 'Notebook'], ['🕶️', 'Sunglasses'], ['🔑', 'House keys'], ['🎧', 'Earphones'], ['🧦', 'Socks']];
    openUi(`<div class="lf-top"><h3>🗄️ Your drawer</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:440px"><div class="lf-grid">${items.map(([i, n]) => `<div class="lf-card"><span class="ic">${i}</span><b>${n}</b></div>`).join('')}</div>${found ? `<p>💵 You found <b>${fmt$(found)}</b> in your drawer!</p>` : ''}<button class="btn primary" data-charge="1">🔌 Charge your phone and take your keys</button></div>`);
    $('#rp-win [data-charge]').onclick = () => { closeUi(); say('📱 Phone charged. 🔑 Keys in your pocket. Have a great day!', 3000); addNeeds({ fun: 3 }); };
  }

  /* ---------- your home: designer, backyard and guests ---------- */
  const HD = {
    floor: [['Oak wood', '#c99a66'], ['Dark wood', '#6b4a2f'], ['White marble', '#f2f1ec'], ['Grey tile', '#b9bec7'], ['Blue carpet', '#5b7bd5'], ['Black marble', '#2b2b2f']],
    sofa: [['Royal blue', '#4f6bd8'], ['Grey', '#7a808a'], ['Leather brown', '#7a4a2a'], ['Cream', '#efe4cf'], ['Emerald', '#1f8a5b'], ['Pink', '#ff8fb3']],
    bed: [['Purple', '#8a5cff'], ['White', '#f4f4f4'], ['Navy', '#22325c'], ['Sunset', '#ff8a3d'], ['Mint', '#7fe0c0'], ['Red', '#c0392b']],
    kitchen: [['White', '#f2f3f5'], ['Black', '#2b2b2f'], ['Wood', '#a87a50'], ['Sage', '#9fb89a'], ['Navy', '#2f3f6b'], ['Red', '#c94b3c']],
    rug: [['Terracotta', '#b5533c'], ['Blue', '#2f6bff'], ['Beige', '#d9c8a9'], ['Black', '#16181f'], ['Green', '#3f8a3a'], ['Pink', '#ff4d8b']],
  };
  const YARD = [['grill', '🍖', 'BBQ grill', 300], ['patio', '🪑', 'Patio table set', 400], ['garden', '🌻', 'Flower and veg garden', 250], ['swing', '🎠', 'Garden swing', 350], ['tramp', '🤸', 'Trampoline', 500], ['hottub', '♨️', 'Hot tub', 2500], ['fire', '🔥', 'Fire pit', 450], ['tree', '🌳', 'Big shade tree', 200]];
  const homeD = () => (S.homeD = S.homeD || { floor: 0, sofa: 0, bed: 0, kitchen: 0, rug: 0, yard: [] });
  function applyHome(b) {
    if (!b || !b.F || !b.F.m) return; const d = homeD(), m = b.F.m;
    if (d.floor) { b.mat.floor.color.set(HD.floor[d.floor][1]); b.mat.slab.color.set(HD.floor[d.floor][1]); }
    m.sofa.color.set(HD.sofa[d.sofa][1]); m.kitchen.color.set(HD.kitchen[d.kitchen][1]); m.rug.color.set(HD.rug[d.rug][1]);
    if (!has('goodbed')) b.F.blanket.material.color.set(HD.bed[d.bed][1]);
    for (const [id] of YARD) if (b.Y && b.Y[id]) b.Y[id].visible = d.yard.includes(id);
  }
  function designerHtml() {
    if (S.home == null) return '<p>You need a house first. Buy one next to the garage, then design it here.</p>';
    const d = homeD(), part = (k, label) => `<p style="margin:12px 0 6px"><b>${label}</b> <span class="muted">· $50 to change</span></p><div class="rp-cats">${HD[k].map(([n, c], i) => `<button data-hd2="${k}:${i}" class="${d[k] === i ? 'on' : ''}"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${c};vertical-align:-1px;margin-right:4px"></i>${n}</button>`).join('')}</div>`;
    return `<p class="muted" style="margin:0">Design every room of your house. Changes show up right away.</p>${part('floor', '🪵 Floors (all rooms)')}${part('sofa', '🛋️ Living room sofa')}${part('rug', '🟫 Living room rug')}${part('kitchen', '🍳 Kitchen cabinets')}${part('bed', '🛏️ Bedroom bedding')}
      <p style="margin:14px 0 6px"><b>🌳 Backyard</b></p><div class="lf-grid">${YARD.map(([id, i, n, p]) => `<div class="lf-card"><span class="ic">${i}</span><b>${n}</b><button class="btn ${d.yard.includes(id) ? 'ghost' : 'gold'}" data-yard="${id}" ${d.yard.includes(id) || canPay(p) ? '' : 'disabled'}>${d.yard.includes(id) ? 'Remove' : fmt$(p)}</button></div>`).join('')}</div>
      <p style="margin:14px 0 6px"><b>📨 Guests</b></p><button class="btn primary" data-guests="1" ${D3.guests ? 'disabled' : ''}>${D3.guests ? 'Guests are over right now' : 'Invite friends over (house party)'}</button><p class="muted" style="font-size:12px">Real friends can join your city from the 👥 Friends page and walk in.</p>`;
  }
  function wireDesigner(re) {
    $$('#rp-win [data-hd2]').forEach((x) => (x.onclick = () => { const [k, i] = x.dataset.hd2.split(':'); if (homeD()[k] === +i) return; if (!pay(50, '🎨 Home redesign')) return say('You need $50.'); homeD()[k] = +i; save(); applyHome(curHouse()); L.sfx && L.sfx('ding'); re(); }));
    $$('#rp-win [data-yard]').forEach((x) => (x.onclick = () => { const id = x.dataset.yard, d = homeD(), y = YARD.find((q) => q[0] === id); if (d.yard.includes(id)) d.yard = d.yard.filter((q) => q !== id); else { if (!pay(y[3], `${y[1]} ${y[2]}`)) return; d.yard.push(id); } save(); applyHome(curHouse()); re(); }));
    const g = $('#rp-win [data-guests]'); if (g) g.onclick = () => { closeUi(); inviteGuests(); };
  }
  function buildYard(b) {
    const T = E.T, V2 = b.V2, g = b.group, Y = (b.Y = {}), grp = (k) => { const q = new T.Group(); g.add(q); q.visible = false; Y[k] = q; return q; };
    const grill = grp('grill'); V2.box(1.2, 0.9, 0.7, '#2b2b2b', 5.5, 0.6, -9, grill); V2.box(1.3, 0.1, 0.8, '#555', 5.5, 1.1, -9, grill, false);
    const patio = grp('patio'); V2.cyl(0.8, 0.8, 0.06, '#ffffff', 5.5, 0.85, -13, patio, 18); V2.cyl(0.06, 0.06, 0.8, '#555', 5.5, 0.45, -13, patio, 6); for (const [x, z] of [[4.4, -13], [6.6, -13], [5.5, -14.1]]) V2.box(0.5, 0.45, 0.5, '#14c79a', x, 0.4, z, patio, false); V2.cyl(0.04, 0.04, 2.6, '#ffffff', 5.5, 1.5, -13, patio, 6); V2.cyl(1.4, 0.05, 0.5, '#ff4d8b', 5.5, 2.7, -13, patio, 16);
    const garden = grp('garden'); for (let k = 0; k < 10; k++) V2.box(0.5, 0.5, 0.5, ['#ffd23f', '#ff4d8b', '#3f8a3a', '#ff8a3d'][k % 4], 4 + (k % 5) * 0.8, 0.45, -17.5 - Math.floor(k / 5) * 0.9, garden, false); V2.box(4.4, 0.3, 2.2, '#6b4a2f', 5.6, 0.2, -18, garden, false);
    const swing = grp('swing'); for (const x of [-18.5, -15.5]) V2.box(0.15, 2.6, 0.15, '#7a5c3a', x, 1.4, -9, swing); V2.box(3.3, 0.15, 0.15, '#7a5c3a', -17, 2.7, -9, swing); V2.box(1.2, 0.08, 0.5, '#ff4d8b', -17, 0.8, -9, swing, false);
    const tramp = grp('tramp'); V2.cyl(1.7, 1.7, 0.1, '#16203d', -17, 0.9, -15, tramp, 24); V2.cyl(1.8, 1.8, 0.12, '#2f6bff', -17, 0.85, -15, tramp, 24);
    const hot = grp('hottub'); V2.box(2.6, 0.9, 2.6, '#7a5c3a', -17, 0.6, -20, hot); V2.box(2.3, 0.05, 2.3, E.M('#7fd8ff', { emissive: '#2fa8ff', emissiveIntensity: 0.4 }), -17, 1.06, -20, hot, false);
    const fire = grp('fire'); V2.cyl(0.9, 1, 0.4, '#555', 5.5, 0.35, -23.5, fire, 16); V2.box(0.5, 0.5, 0.5, E.M('#ff8a3d', { emissive: '#ff5a00', emissiveIntensity: 1.5 }), 5.5, 0.7, -23.5, fire, false);
    const tree = grp('tree'); V2.cyl(0.4, 0.5, 3.5, '#6b4a2f', -17, 1.9, -3, tree, 8); const c = new T.Mesh(new T.IcosahedronGeometry(2.6, 0), E.M('#3f8a3a', { flatShading: true })); c.position.set(-17, 5, -3); tree.add(c);
    const o = (q, id) => obj({ ...q, where: 'home', when: () => homeD().yard.includes(id) && !(E.getF().floor) }, g.position.x, g.position.z);
    o({ x: 5.5, z: -10, r: 1.6, label: () => '🍖 Grill a BBQ', use: () => activity('cook', 'Grilling a BBQ', 6, { hunger: 7, fun: 2 }) }, 'grill');
    o({ x: 5.5, z: -11.8, r: 1.6, label: () => '🪑 Relax on the patio', use: () => activity('relax', 'Relaxing on the patio', 8, { fun: 4, energy: 3 }) }, 'patio');
    o({ x: 5.5, z: -16.4, r: 1.6, label: () => '🌻 Water the garden', use: () => activity('garden', 'Gardening', 6, { fun: 4, hygiene: -1 }) }, 'garden');
    o({ x: -17, z: -8, r: 1.6, label: () => '🎠 Swing', use: () => activity('play', 'Swinging', 6, { fun: 8 }) }, 'swing');
    o({ x: -17, z: -13, r: 2, label: () => '🤸 Jump on the trampoline', use: () => activity('play', 'Jumping on the trampoline', 6, { fun: 12, energy: -2 }) }, 'tramp');
    o({ x: -15.2, z: -20, r: 1.8, label: () => '♨️ Hot tub', use: () => activity('spa', 'Relaxing in the hot tub', 8, { hygiene: 8, fun: 8, energy: 4 }) }, 'hottub');
    o({ x: 5.5, z: -22, r: 1.8, label: () => '🔥 Sit by the fire pit', use: () => activity('relax', 'Sitting by the fire', 6, { fun: 6, energy: 2 }) }, 'fire');
  }
  function inviteGuests() {
    const b = curHouse(); if (!b || D3.guests) return;
    const g = b.group, names = ['Aarav', 'Mia', 'Kabir', 'Zoe', 'Ishaan', 'Leo', 'Anaya', 'Sam'], n = 3 + Math.floor(Math.random() * 3);
    D3.guests = { t: 0, list: [] }; notify(`📨 You invited ${n} friends over. They're on their way!`);
    for (let k = 0; k < n; k++) {
      const p = E.person(['#ff4d8b', '#14c79a', '#ffb31a', '#8a5cff', '#2f6bff'][k % 5], '#2d3a5c', ['#f1c27d', '#c68642', '#8d5524'][k % 3]);
      p.position.set(g.position.x - 6.3 + (k - n / 2) * 0.8, Y0, g.position.z + 8); E.scene.add(p);
      const nm = E.textSprite(names[(k + S.day) % names.length], 'rgba(22,32,61,.75)', '#fff', 1.4, 0.4); nm.position.y = 2.3; p.add(nm);
      D3.guests.list.push({ m: p, stage: 0, delay: k * 1.2, spot: [g.position.x - 12 + (k % 3) * 1.6, g.position.z - 10 - Math.floor(k / 3) * 1.6] });
    }
  }
  function tickGuests(dt) {
    const G = D3.guests; if (!G) return; G.t += dt; const b = curHouse();
    for (const q of G.list) {
      if (G.t < q.delay) continue; const m = q.m, door = [b.group.position.x - 6.3, b.group.position.z - 4.5], inside = [b.group.position.x - 6.3, b.group.position.z - 8];
      const tg = q.stage === 0 ? door : q.stage === 1 ? inside : q.stage === 2 ? q.spot : q.stage === 3 ? inside : q.stage === 4 ? door : [door[0], door[1] + 14];
      const dx = tg[0] - m.position.x, dz = tg[1] - m.position.z, d = Math.hypot(dx, dz), u = m.userData;
      if (q.stage === 2 && d < 0.2) { m.rotation.y = Math.sin(G.t * 0.7 + q.delay) * 1.2; m.position.y = Y0 + Math.abs(Math.sin(G.t * 6 + q.delay)) * 0.15; u.arms[0].rotation.x = u.arms[1].rotation.x = -Math.abs(Math.sin(G.t * 6 + q.delay)) * 2; if (G.t > 150) q.stage = 3; continue; }
      if (d < 0.25) { q.stage++; if (q.stage > 5) { E.scene.remove(m); q.gone = true; } continue; }
      m.position.x += (dx / d) * Math.min(d, dt * 2); m.position.z += (dz / d) * Math.min(d, dt * 2); m.rotation.y = Math.atan2(dx, dz); m.position.y = Y0; const w = Math.sin(G.t * 9) * 0.6; u.legs[0].rotation.x = w; u.legs[1].rotation.x = -w;
    }
    const F = E.getF(); if (G.t > 5 && G.t < 150 && b && insideB(b, F.x, F.z)) { addNeeds({ fun: 0.6 }, dt); if (Math.random() < dt * 0.15) say(['🎉 "Nice house!"', '🍕 "Who ordered pizza?"', '🎶 "Turn the music up!"', '😂 "Haha, good one!"', '🕺 "Let\'s dance!"'][Math.floor(Math.random() * 5)], 1800); }
    if (G.list.every((q) => q.gone)) { D3.guests = null; say('👋 Your friends went home. Great party!', 2500); }
  }

  /* ---------- phone: Play Store, LSP Web, LSP Eats, LSP Jobs ---------- */
  const CORE_APPS = ['upi', 'wallet', 'notes', 'maps', 'settings', 'play', 'web'];
  const PLAY = [['store', '🛍️', 'LSP Store', 'Shop 100 products, delivered with OTP.'], ['orders', '📦', 'Orders', 'Track your deliveries and OTPs.'], ['biz', '🏢', 'Business', 'Your TAXIN and businesses.'], ['eats', '🍔', 'LSP Eats', 'Fast food delivered to your door.'], ['jobs', '💼', 'LSP Jobs', 'Apply for real jobs in town.'], ['home', '🏡', 'Home Designer', 'Design your house and backyard.'], ['stuff', '🎒', 'My stuff', 'Things you own.'], ['flights', '✈️', 'Flights', 'Book flights to the islands.'], ['mafia', '🕴️', 'Mafia', 'Missions, rank and weapons.'], ['events', '🎉', 'Party Planner', 'Book the city party hall.']];
  const installed = (id) => CORE_APPS.includes(id) || (S.apps || []).includes(id);
  function playHtml() { return `<p class="muted" style="margin:0 0 8px">Download apps to your phone.</p>${PLAY.map(([id, ic, n, d]) => `<div class="rp-row"><span style="font-size:28px">${ic}</span><div style="flex:1"><b>${n}</b><div class="muted" style="font-size:12px">${d}</div></div>${installed(id) ? `<button class="btn ghost" data-open="${id}" style="height:34px">Open</button>` : `<button class="btn primary" data-get="${id}" style="height:34px">Get</button>`}</div>`).join('')}`; }
  function wirePlay() {
    $$('#rp-win [data-open]').forEach((b) => (b.onclick = () => openPhone(b.dataset.open)));
    $$('#rp-win [data-get]').forEach((b) => (b.onclick = () => { const id = b.dataset.get; b.disabled = true; let p = 0; const t = setInterval(() => { p += 20; b.textContent = p + '%'; if (p >= 100) { clearInterval(t); S.apps = [...new Set([...(S.apps || []), id])]; save(); L.sfx && L.sfx('ding'); notify(`📲 ${PLAY.find((q) => q[0] === id)[2]} installed.`); if ($('#rp-win .ph')) openPhone('play'); } }, 220); }));
  }
  const EATS = [['eat-burger', '🍔', 'Burger Bros · Double cheeseburger meal', 9, 'burgerm', 'Burger meal', 70], ['eat-pizza', '🍕', 'Slice Express · Large pepperoni pizza', 14, 'pizzam', 'Hot pizza', 85], ['eat-biryani', '🍛', 'Spice Route · Chicken biryani', 11, 'biryani', 'Biryani', 80], ['eat-noodles', '🍜', 'Wok This Way · Hakka noodles', 8, 'noodles', 'Noodles', 60], ['eat-tacos', '🌮', 'Taco Loco · 3 tacos', 7, 'tacos', 'Tacos', 55], ['eat-fried', '🍗', 'Crispy Chicken Co · 6 piece bucket', 12, 'chicken', 'Fried chicken', 75], ['eat-sushi', '🍣', 'Tokyo Roll · Sushi box', 15, 'sushi', 'Sushi', 65], ['eat-dosa', '🥞', 'South Spice · Masala dosa', 6, 'dosa', 'Masala dosa', 55]];
  function setupEats() { for (const [, ic, , p, food, n, fill] of EATS) FOODS[food] = FOODS[food] || { name: n, icon: ic, price: p, fill, fun: 6 }; for (const [id, ic, n, p, food] of EATS) if (!PRODUCTS.some((q) => q.id === id)) PRODUCTS.push({ id, cat: 'Food delivery', name: n, icon: ic, price: p, fast: true, food: { [food]: 1 }, eats: true }); }
  function eatsHtml() { return `<p class="muted" style="margin:0 0 8px">Hot food delivered in about 30 minutes. Share the OTP with the rider.</p>${EATS.map(([id, ic, n, p]) => `<div class="rp-row"><span style="font-size:26px">${ic}</span><div style="flex:1"><b style="font-size:13px">${n}</b><div class="muted" style="font-size:12px">${fmt$(p)} + $2 delivery</div></div><button class="btn gold" data-eat="${id}" style="height:34px" ${canPay(p + 2) ? '' : 'disabled'}>Order</button></div>`).join('')}`; }
  function wireEats() { $$('#rp-win [data-eat]').forEach((b) => (b.onclick = () => { const p = PRODUCTS.find((q) => q.id === b.dataset.eat); if (!pay(p.price + 2, `🍔 LSP Eats · ${p.name}`)) return; S.orders = S.orders || []; const id = 'EAT' + Math.floor(1000 + Math.random() * 8999); S.orders.unshift({ id, pid: p.id, at: absMin(), eta: absMin() + 30, done: false }); save(); hud(); L.sfx && L.sfx('cash'); notify(`🛵 Order ${id} placed: ${p.icon} ${p.name}. Arriving in about 30 minutes.`); openPhone('orders'); })); }
  const JOBLIST = [['cashier', '🧾', 'Cashier', 'LSP MegaMart', 'support', 1.2], ['barista', '☕', 'Barista', 'Sky Café', 'support', 1.1], ['office', '🗂️', 'Office assistant', 'Downtown offices', 'type', 1.3], ['dev', '🧑‍💻', 'Junior developer', 'LSP Tech', 'code', 1.8], ['agent', '🧑‍✈️', 'Airport check-in agent', 'LSP Airport', 'support', 1.5], ['writer', '✍️', 'News writer', 'LSP Daily', 'type', 1.5], ['nurse', '🩺', 'Hospital receptionist', 'LSP Hospital', 'support', 1.4], ['analyst', '📊', 'Data analyst', 'Business Tower', 'code', 2.2]];
  function jobsHtml() {
    const j = S.job && JOBLIST.find((q) => q[0] === S.job.id);
    return `${j ? `<div class="ph-card" style="background:linear-gradient(135deg,#14c79a,#2f6bff)"><small>Your job</small><b>${j[1]} ${j[2]}</b><small>${j[3]} · pay ×${j[5]} · ${S.job.shifts || 0} shifts</small></div><button class="btn primary" data-work="1">💼 Work a shift now</button> <button class="btn ghost" data-quit="1">Quit job</button><hr style="border:0;border-top:1px solid #e1e6ef;margin:12px 0">` : ''}<p class="muted" style="margin:0 0 8px">Open positions in LSP Town. Apply, pass the quick interview, get hired.</p>${JOBLIST.map(([id, ic, n, at, , m]) => `<div class="rp-row"><span style="font-size:24px">${ic}</span><div style="flex:1"><b>${n}</b><div class="muted" style="font-size:12px">${at} · pay ×${m}</div></div><button class="btn ghost" data-apply="${id}" style="height:34px" ${S.job && S.job.id === id ? 'disabled' : ''}>Apply</button></div>`).join('')}`;
  }
  const INTERVIEW = [['A customer is angry. What do you do?', ['Listen, say sorry and help fix it', 'Ignore them', 'Get angry back'], 0], ['You are late for work. What do you do?', ['Tell your manager early and say sorry', 'Do not go', 'Say nothing'], 0], ['A teammate needs help. What do you do?', ['Help them when you can', 'Laugh at them', 'Tell them to quit'], 0], ['You found a wallet at work. What do you do?', ['Hand it to the manager', 'Keep the money', 'Throw it away'], 0]];
  function wireJobs(re) {
    $$('#rp-win [data-apply]').forEach((b) => (b.onclick = () => { const j = JOBLIST.find((q) => q[0] === b.dataset.apply), q = INTERVIEW[Math.floor(Math.random() * INTERVIEW.length)], order = [0, 1, 2].sort(() => Math.random() - 0.5);
      openUi(`<div class="lf-top"><h3>${j[1]} Interview · ${j[3]}</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:440px"><p><b>${q[0]}</b></p>${order.map((i) => `<button class="lf-opt" data-ans="${i}">${q[1][i]}</button>`).join('')}</div>`);
      $$('#rp-win [data-ans]').forEach((a) => (a.onclick = () => { if (+a.dataset.ans === q[2]) { S.job = { id: j[0], since: S.day, shifts: 0 }; save(); L.sfx && L.sfx('win'); notify(`🎉 You're hired as ${j[2]} at ${j[3]}! Work shifts from the LSP Jobs app or your laptop.`); } else { L.sfx && L.sfx('lose'); say('😕 "Thanks for coming. We picked someone else." Try again!', 3000); } openPhone('jobs'); }));
    }));
    const w = $('#rp-win [data-work]'); if (w) w.onclick = () => { const j = JOBLIST.find((q) => q[0] === S.job.id); closeUi(); S.job.shifts = (S.job.shifts || 0) + 1; startShift(j[4], { mult: j[5], title: `${j[1]} ${j[2]} at ${j[3]}` }); };
    const q = $('#rp-win [data-quit]'); if (q) q.onclick = () => { S.job = null; save(); re(); };
  }
  // LSP Web: a little search engine for the town
  const WEB = [
    [/job|work|hire|career|apply|salary/, () => ({ t: '💼 Jobs in LSP Town', a: `${JOBLIST.length} open positions: ${JOBLIST.slice(0, 4).map((j) => j[2]).join(', ')} and more.`, go: ['jobs', 'Open LSP Jobs'] })],
    [/food|eat|hungry|pizza|burger|biryani|noodle|taco|sushi|chicken|dosa|delivery|restaurant/, () => ({ t: '🍔 Fast food near you', a: `${EATS.length} restaurants deliver now: ${EATS.slice(0, 4).map((e) => e[2].split(' · ')[0]).join(', ')}…`, go: ['eats', 'Order on LSP Eats'] })],
    [/flight|plane|fly|airport|island|travel|holiday|vacation/, () => ({ t: '✈️ LSP International Airport', a: 'Flights to Palm Paradise, Volcano Isle, Snow Peak Island, Pirate Cove, Jungle Ruins and the Rocket Base. Book, check in, security, then your gate.', go: ['flights', 'Book a flight'] })],
    [/house|home|apartment|rent|real estate|buy a house/, () => ({ t: '🏡 Homes in LSP Town', a: `10 house designs from $1,200 to the $7,000,000 Royal Palace, next to the garage. Apartments to rent in apartment buildings.`, go: ['home', 'Home Designer'] })],
    [/business|company|taxin|shop|stall/, () => ({ t: '🏢 Start a business', a: 'Register for free at the Business Tower. You get a TAXIN and a stall on one of 100 floors.', go: ['biz', 'Open Business'] })],
    [/gun|weapon|viper|mafia|fight|grenade|missile|rocket launcher/, () => ({ t: '🕴️ Mafia Tower and Viper XHP', a: 'Join the Mafia Tower, buy guns, grenades and missiles at the Viper XHP shop, and take down the Red Vipers Towers.', go: ['mafia', 'Open Mafia'] })],
    [/weather|rain|sun|temperature/, () => ({ t: '🌤️ Weather in LSP Town', a: `${['Sunny', 'Partly cloudy', 'Clear skies', 'Warm and breezy'][S.day % 4]}, ${24 + (S.day * 7) % 9}°C. Good day for a drive.` })],
    [/time|clock|day/, () => ({ t: '🕒 Time', a: `It is ${clockTxt()} on day ${S.day}.` })],
    [/party|event|club|ping pong|table tennis|dance/, () => ({ t: '🎉 Party hall and LSP Club', a: 'Book the city party hall for your own event, or play table tennis, pool and darts at the LSP Club downtown.', go: ['events', 'Party Planner'] })],
    [/sweet|mithai|candy|chocolate|snack|chips|grocer|supermarket|megamart|walmart/, () => ({ t: '🛒 LSP MegaMart', a: 'The biggest store in town, next to the airport: snacks, chocolate, sweets, drinks, groceries and more.', place: 'LSP MegaMart' })],
    [/hospital|doctor|health|hurt/, () => ({ t: '🏥 LSP Hospital', a: 'Open 24/7 east of the Business Tower. You wake up here after a mission fails.', place: 'LSP Hospital' })],
    [/rule|dating|date|swear/, () => ({ t: '📜 Rules', a: 'No online dating or flirting, nothing sexual, no swearing or bullying. Breaking rules gets you muted or banned.' })],
  ];
  function webHtml() {
    const q = D3.webQ || '';
    let res = '';
    if (q) { const hit = WEB.find(([re]) => re.test(q.toLowerCase())); const r = hit ? hit[1]() : null;
      res = r ? `<div class="rp-row" style="flex-direction:column;align-items:flex-start;gap:6px"><b style="font-size:16px">${r.t}</b><span style="font-size:13px">${r.a}</span>${r.go ? `<button class="btn primary" data-wgo="${r.go[0]}" style="height:34px">${r.go[1]}</button>` : ''}${r.place ? `<button class="btn ghost" data-wplace="${r.place}" style="height:34px">📍 Directions</button>` : ''}</div>` : `<p class="muted">No exact answer for "${q.replace(/</g, '')}". LSP Web knows about: jobs, fast food, flights, houses, business, weapons, weather, parties, the supermarket and the hospital.</p>`; }
    return `<div style="text-align:center;margin:6px 0 10px;font:700 26px Fredoka,system-ui"><span style="color:#2f6bff">L</span><span style="color:#ff4d5e">S</span><span style="color:#ffb31a">P</span> <span style="color:#14c79a">Web</span></div><input class="lf-in" id="rp-web" placeholder="🔎 Search anything" value="${q.replace(/"/g, '')}"><div class="rp-cats" style="margin:8px 0">${['jobs', 'food delivery', 'flights', 'houses', 'weather'].map((x) => `<button data-wq="${x}">${x}</button>`).join('')}</div>${res}`;
  }
  function wireWeb() {
    const i = $('#rp-web'); if (i) ['keydown', 'keyup'].forEach((ev) => i.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'keyup' && e.key === 'Enter') { D3.webQ = i.value.trim(); openPhone('web'); } }));
    $$('#rp-win [data-wq]').forEach((b) => (b.onclick = () => { D3.webQ = b.dataset.wq; openPhone('web'); }));
    $$('#rp-win [data-wgo]').forEach((b) => (b.onclick = () => { const id = b.dataset.wgo; if (!installed(id)) { say('Get the app from the 🛍️ Play Store first.'); return openPhone('play'); } openPhone(id); }));
    $$('#rp-win [data-wplace]').forEach((b) => (b.onclick = () => { const p = places().find((q) => q.name === b.dataset.wplace); if (p) setGps(p); }));
  }

  /* ---------- extensions (city buildings, mafia, airport) plug in here ---------- */
  const EXT = []; let KIT = null;
  function makeKit() {
    return { get E() { return E; }, get S() { return S; }, Y0, OBJ, BUILD, obj, building, adapter, insideB, pushCols, openUi, closeUi, isUi: () => ui, say, notify, toast: (m, t) => toast(m, t), fmt$, save, hud, pay, canPay, receive, txn, cardLeft, addStuff, addNeeds, activity, stopAct, showQR, openPhone, openLaptop, setGps, FOODS, openFridge, openStove, sleepUi, addToCart, checkout, getCart: () => cart, startShift, SET, installed, goodMorning, places: PLACES, absMin, clockTxt, hour, curHouse, wrapA, clamp, T3, goFloor, tower: () => T3, enterCity: () => RP.enter() };
  }
  /* ---------- the module LSP Drive calls ---------- */
  const RP = (window.LSPDriveRP = {
    ready: false,
    build(env) {
      E = env;
      DB = L.store('life', { cash: 250, pantry: { bread: 1, apple: 2, eggs: 1, veg: 1 }, owned: [], needs: { hunger: 80, energy: 80, hygiene: 80, fun: 70 }, time: 8 * 60, day: 1, jobs: { type: 0, code: 0, support: 0 }, earned: 0, shifts: 0 });
      S = DB.load(); if (S.home === undefined) S.home = null;
      E.RP_LOTS.houses.forEach((_, i) => buildHouse(i));
      buildMarket(); buildTower(); fixBiz();
      const scr = $('#s-drive');
      $('#s-drive .hud').insertAdjacentHTML('beforeend', '<span class="hudpill" id="rp-cash">$0</span><span class="hudpill" id="rp-clock"></span><span class="hudpill" id="rp-needs" title="Hunger, energy, hygiene, fun"></span><span class="hudpill" id="rp-cart" hidden></span><button class="hudpill" id="rp-phone" title="Your phone (M)">📱</button><button class="hudpill" id="rp-set" title="Settings">⚙️</button><span class="hudpill" id="rp-gps" hidden></span>');
      $('#rp-phone').onclick = () => (ui ? closeUi() : openPhone());
      $('#rp-set').onclick = () => (ui ? closeUi() : openPhone('settings'));
      addEventListener('keydown', (e) => { if (e.code === 'KeyM' && L.isActive('s-drive') && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); ui ? $('#rp-win').classList.contains('phone') && closeUi() : openPhone(); } });
      scr.insertAdjacentHTML('beforeend', '<div class="lf-act" id="rp-act" hidden><span id="rp-act-t"></span><div class="bar"><i id="rp-act-b" style="width:0%"></i></div><button id="rp-act-x">Stop</button></div><div class="lf-ui" id="rp-ui" hidden><div class="lf-win" id="rp-win"></div></div>');
      $('#rp-act-x').onclick = stopAct;
      const st = document.createElement('style'); st.textContent = `#s-drive .d-obj{top:calc(112px + env(safe-area-inset-top,0px))} #s-drive .lf-act{top:calc(112px + env(safe-area-inset-top,0px))}
#rp-phone{cursor:pointer;border:0;font-size:16px}
#rp-win.phone{width:min(360px,94vw);max-height:92vh;padding:0;background:transparent;box-shadow:none;overflow:visible}
.ph{background:#0b0f1c;border:10px solid var(--ph);border-radius:34px;overflow:hidden;box-shadow:0 20px 60px #000a;display:flex;flex-direction:column;max-height:88vh;color:#16203d}
.ph-bar{display:flex;justify-content:space-between;color:#fff;font:600 11px system-ui;padding:6px 14px;background:#0b0f1c}
.ph-top{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #e1e6ef}.ph-top b{flex:1}.ph-back{border:0;background:#eef1f6;border-radius:10px;font-size:20px;width:34px;height:30px;cursor:pointer}
.ph .lf-in{background:#fff;color:#16203d;border:1px solid #d9dee8}
.ph-body{background:#f6f8fc;padding:12px;overflow:auto;flex:1;min-height:380px}.ph-body .lf-grid{grid-template-columns:1fr 1fr}
.ph-apps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:8px 2px}.ph-apps button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 12px system-ui;color:#16203d;cursor:pointer}.ph-apps span{font-size:28px;width:58px;height:58px;display:grid;place-items:center;background:#fff;border-radius:18px;box-shadow:0 3px 10px #16203d22}
.ph-bal{background:linear-gradient(135deg,#16203d,#2f6bff);color:#fff;border-radius:16px;padding:14px;display:flex;flex-direction:column}.ph-bal b{font:700 30px Fredoka,system-ui}
.ph-card{color:#fff;border-radius:16px;padding:14px;margin-bottom:10px;display:flex;flex-direction:column;gap:2px}.ph-card b{font:700 24px Fredoka,system-ui}
.rp-row{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:9px 10px;margin-bottom:7px}
.rp-cats{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.rp-cats button{flex:none;border:1px solid #d9dee8;background:#fff;border-radius:999px;padding:6px 10px;font:600 12px system-ui;cursor:pointer}.rp-cats button.on{background:#16203d;color:#fff;border-color:#16203d}
.rp-floors{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:6px;max-height:52vh;overflow:auto}.rp-floors button{height:38px;border:1px solid #d9dee8;border-radius:10px;background:#fff;font:700 13px system-ui;cursor:pointer}.rp-floors button.mine{background:#14c79a;color:#fff;border-color:#14c79a}.rp-floors button:first-child{grid-column:span 2;background:#16203d;color:#fff}
#rp-qr{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:40}#rp-qr[hidden]{display:none}
.qr-card{background:#fff;border-radius:18px;padding:14px 18px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 14px 40px #0008;color:#16203d;font:14px system-ui}
.qr-grid{display:grid;grid-template-columns:repeat(11,12px);gap:0;border:6px solid #fff;outline:2px solid #16203d}.qr-grid i{width:12px;height:12px;display:block}
.qr-amt{font:700 28px Fredoka,system-ui}.qr-st{font-weight:700;color:#6b7591}
.otp-in{display:flex;gap:8px;justify-content:center;margin:12px 0}.otp-in i{width:44px;height:52px;border-radius:10px;border:2px solid #2f6bff;display:grid;place-items:center;font:700 26px ui-monospace,monospace;font-style:normal;background:#fff;color:#16203d}
.otp-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.otp-pad button{height:48px;border-radius:12px;border:1px solid #d9dee8;background:#fff;font:700 20px system-ui;cursor:pointer;color:#16203d}
#rp-hp{background:#ff4d5e;color:#fff}
#rp-set{cursor:pointer;border:0;font-size:16px}
.rp-rules div{background:#fff;border:1px solid #e1e6ef;border-radius:10px;padding:8px 10px;margin-bottom:6px;font-size:13px;color:#16203d}
body.rp-bigmsg .toast,body.rp-bigmsg #toast{font-size:18px!important;max-width:min(680px,94vw)!important;white-space:normal!important}
#d-fail{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:radial-gradient(circle,rgba(40,0,0,.55),rgba(0,0,0,.85));animation:fadeIn .4s}#d-fail[hidden]{display:none}
.fail-in{text-align:center;color:#fff;padding:24px;max-width:520px}.fail-in h1{font:900 clamp(40px,9vw,84px)/1 Fredoka,system-ui;color:#ff3b3b;letter-spacing:3px;margin:0 0 10px;text-shadow:0 6px 30px #f008;animation:failIn .6s cubic-bezier(.2,1.4,.4,1)}.fail-in p{margin:6px 0}.fail-in .muted{color:#ccd}
.fail-btns{display:flex;gap:12px;justify-content:center;margin-top:18px}.fail-btns .btn{min-width:150px;height:52px;font-size:17px}
@keyframes failIn{from{transform:scale(2.2);opacity:0}to{transform:scale(1);opacity:1}}@keyframes fadeIn{from{opacity:0}}
#rp-gm{position:absolute;inset:0;z-index:65;display:grid;place-items:center}#rp-gm[hidden]{display:none}
.gm-sky{position:absolute;inset:0;background:linear-gradient(#ffb36b,#ffe1a8 45%,#bfe4ff);animation:fadeIn .8s;overflow:hidden}.gm-sun{position:absolute;left:50%;width:180px;height:180px;margin-left:-90px;border-radius:50%;background:radial-gradient(#fff6c2,#ffb31a);box-shadow:0 0 80px 30px #ffd56b;animation:sunUp 2.4s ease-out forwards;bottom:-200px}
@keyframes sunUp{to{bottom:55%}}
.gm-card{position:relative;background:#fffffff0;border-radius:24px;padding:22px 26px;text-align:center;box-shadow:0 20px 60px #0004;max-width:420px;color:#16203d;animation:failIn .7s .3s both}
.gm-clock{position:relative;width:110px;height:120px;margin:0 auto 6px;animation:ring .12s linear infinite alternate}.gm-face{position:absolute;left:5px;top:12px;width:100px;height:100px;border-radius:50%;background:#fff;border:8px solid #ff4d5e;box-sizing:border-box}.gm-face i{position:absolute;left:50%;bottom:50%;width:4px;margin-left:-2px;background:#16203d;transform-origin:bottom center;border-radius:2px}.gm-h{height:24px;transform:rotate(210deg)}.gm-m{height:34px;transform:rotate(0)}
.gm-bell{position:absolute;top:0;width:34px;height:22px;border-radius:30px 30px 4px 4px;background:#ff4d5e}.gm-bell.l{left:2px;transform:rotate(-30deg)}.gm-bell.r{right:2px;transform:rotate(30deg)}.gm-feet{position:absolute;bottom:0;left:22px;right:22px;height:10px;border-left:8px solid #16203d;border-right:8px solid #16203d}
@keyframes ring{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}.gm-card h2{font:700 30px Fredoka,system-ui;margin:6px 0}.gm-btns{display:flex;gap:10px;justify-content:center;margin-top:12px}`; document.head.appendChild(st);
      $('#rp-ui').addEventListener('pointerdown', (e) => { if (e.target.id === 'rp-ui' && !shift) closeUi(); });
      addEventListener('keydown', (e) => { if (ui && e.code === 'Escape' && !shift && L.isActive('s-drive')) { e.stopImmediatePropagation(); closeUi(); } }, true);
      D3.hemi = E.scene.children.find((o) => o.isHemisphereLight); D3.bg = E.scene.background; D3.night = new E.T.Color('#0c1630'); D3.fog = E.scene.fog.color.clone();
      D3.lamp = E.M('#fffbe6', { emissive: '#fff1c2', emissiveIntensity: 0.6 });
      setHouseState(); RP.ready = true; hud();
      setupEats(); applySet();
      KIT = makeKit(); for (const m of EXT) try { m.build && m.build(KIT); } catch (e) { console.error('drive ext', e); }
    },
    ext(m) { EXT.push(m); if (KIT && m.build) try { m.build(KIT); } catch (e) { console.error('drive ext', e); } },
    noCol: () => EXT.some((m) => m.noCol && m.noCol()),
    enter() { S = DB.load(); if (S.home === undefined) S.home = null; D3.guests = null; D3.wakeAt = null; applySet(); try { if (!localStorage.getItem('lspdrive.rules')) setTimeout(() => showRules(true), 900); } catch (e) {} fixBiz(); const F = E.getF(); F.tower = 0; if (T3.hall) T3.hall.visible = false; setHouseState(); hud(); EXT.forEach((m) => m.enter && m.enter()); if (S.home == null) setTimeout(() => toast(`🏠 You have ${fmt$(S.cash)} and no house yet. Houses for sale are next to your garage. Register a free business at the 🏢 Business Tower, work on its public computers, do deliveries, then buy a house! Press M for your phone.`, 6500), 2500); },
    leave() { EXT.forEach((m) => m.leave && m.leave()); stopAct(); closeUi(); cart = []; if (shift) shift = null; save(); },
    blocked: () => ui || !!(act && act.spot) || EXT.some((m) => m.blocked && m.blocked()),
    inside() { const F = E.getF(); return E.G.mode === 'foot' && (BUILD.some((b) => insideB(b, F.x, F.z)) || EXT.some((m) => m.inside && m.inside())); },
    _tp(x, z) { const F = E.getF(); F.x = x; F.z = z; F.vx = F.vz = 0; },
    _S: () => S,
    _F: () => E.getF(),
    _save: () => save(),
    maxHp: () => EXT.reduce((m, x) => Math.min(m, x.maxHp ? x.maxHp() : 100), 100),
    inFight: () => EXT.some((x) => x.inFight && x.inFight()),
    died() { stopAct(); closeUi(); if (shift) shift = null; EXT.forEach((m) => m.died && m.died()); if (S) { const fee = Math.min(100, Math.max(0, Math.floor(S.cash))); if (fee) pay(fee, '🏥 LSP Hospital bill'); save(); } },
    respawned() { say('🏥 You woke up at LSP Hospital. Your car is parked outside.', 4000); EXT.forEach((m) => m.respawned && m.respawned()); },
    addCash(n) { if (!S || !(n > 0)) return; S.cash += n; save(); hud(); },
    nearest() {
      const F = E.getF(); let best = null, bd = 1e9;
      for (const o of OBJ) {
        if (o.when && !o.when()) continue; if (o.need && !has(o.need)) continue; if (o.tier != null && design().tier < o.tier) continue; if (o.tower != null && (o.tower === 'hall' ? !F.tower : F.tower || !insideB(T3.b, F.x, F.z))) continue; if (o.floor != null && o.floor !== (F.floor || 0)) continue; if (o.where === 'home' && (S.home == null || !insideB(curHouse(), o.x, o.z))) continue;
        const d = Math.hypot(o.x - F.x, o.z - F.z); if (d < o.r && d < bd) { bd = d; best = o; }
      }
      return best;
    },
    prompt() { if (ui) return ''; const o = RP.nearest(); if (!o) return ''; const t = o.label(); return `${t}${t.includes('— E') ? '' : L.isTouch() ? ' · tap 🚪' : ' · press E'}`; },
    use() {
      if (ui) return true;
      const o = RP.nearest(); if (!o) return false;
      if (act && act.id === 'sleep' && o.label().startsWith('🛏')) { stopAct(); return true; }
      if (o.outside && S.home === o.house) { const F = E.getF(), b = curHouse(); F.x = b.group.position.x - 6.3; F.z = b.group.position.z - 7.4; F.h = Math.PI; return true; }
      o.use(); return true;
    },
    cam(camera, dt) {
      for (const m of EXT) if (m.cam && m.cam(camera, dt)) return true;
      const F = E.getF(), b = BUILD.find((q) => insideB(q, F.x, F.z));
      if (!b) { D3.ch = D3.cp = null; return false; }
      D3.ch = D3.ch == null ? F.h : D3.ch + wrapA(F.h - D3.ch) * Math.min(1, dt * 5);
      const fx = Math.sin(D3.ch), fz = Math.cos(D3.ch), m = 0.4;
      const ceil = b.tower ? F.y + (F.tower ? HALL_H : 4.5) - 0.35 : b.house != null ? Y0 + Math.min(2, (F.floor || 0) + 1 + (F.stairs ? 1 : 0)) * FH - 0.35 : Y0 + b.h - 0.35;
      const want = { x: clamp(F.x - fx * 3.2, b.wx0 + m, b.wx1 - m), y: Math.min(ceil, F.y + 2.1), z: clamp(F.z - fz * 3.2, b.wz0 + m, b.wz1 - m) };
      if (!D3.cp) D3.cp = { ...want }; const k = Math.min(1, dt * 7);
      for (const a of ['x', 'y', 'z']) D3.cp[a] += (want[a] - D3.cp[a]) * k;
      camera.position.set(D3.cp.x, D3.cp.y, D3.cp.z); camera.lookAt(F.x + fx * 2, F.y + 1.3, F.z + fz * 2); return true;
    },
    // called by LSP Drive right after it moves you on foot: stairs, upstairs, room walls, flying
    foot(F, dt, gy) {
      if (window.LSPG_FLY) {
        const K = E.K; F.flyY = Math.max(gy, (F.flyY == null ? F.y : F.flyY) + ((K.Space || K.KeyQ ? 9 : 0) - (K.KeyX || K.KeyZ ? 9 : 0)) * dt);
        F.y = F.flyY; F.floor = 0; F.stairs = false; return;
      }
      F.flyY = null;
      for (const m of EXT) if (m.foot && m.foot(F, dt, gy)) return;
      if (T3.b && insideB(T3.b, F.x, F.z)) { F.floor = 0; F.stairs = false; F.tower = F.tower || 0; F.y = F.tower ? hallY(F.tower) : Y0; pushCols(F, T3.g.position.x, T3.g.position.z, F.tower ? TOWER_COLS.hall : TOWER_COLS.lobby); return; }
      if (F.tower) { F.tower = 0; if (T3.hall) T3.hall.visible = false; }
      const b = BUILD.find((q) => q.house != null && insideB(q, F.x, F.z));
      if (!b) { F.floor = 0; F.stairs = false; return; }
      const ox = b.group.position.x, oz = b.group.position.z, lx = F.x - ox, lz = F.z - oz;
      const onSt = lx > 0 && lx < 2 && lz > -13 && lz < -8;
      if (onSt) {
        const t = clamp((lz + 13) / 5, 0, 1);
        if (!F.stairs && (F.floor || 0) === 1 && t < 0.8) { /* fell into the hole: can't, railing */ }
        F.stairs = true; F.y = Y0 + t * FH; F.floor = t > 0.5 ? 1 : 0;
      } else {
        if (F.stairs) F.floor = lz >= -8 ? 1 : 0; F.stairs = false;
        F.y = Y0 + (F.floor || 0) * FH;
      }
      pushCols(F, ox, oz, onSt ? [[-0.1, -13, 0.1, -8]] : FLOOR_COLS[F.floor || 0]);
    },
    tick(dt) {
      if (!S) return;
      const sleeping = act && act.id === 'sleep', speed = sleeping ? 60 / mps() : 1;
      S.time += dt * mps() * speed; if (S.time >= DAY_MIN) { S.time -= DAY_MIN; S.day++; say(`☀️ Day ${S.day}`); if (S.card && S.card.due > 0) { const i = Math.ceil(S.card.due * 0.02); S.card.due += i; txn('💳 Card interest (2%)', -i); } }
      addNeeds({ hunger: -0.09, energy: sleeping ? 0 : -0.05, hygiene: -0.035, fun: E.G.mode === 'drive' ? 0.05 : -0.05 }, dt * (sleeping ? 0.3 : 1));
      const gm = dt * mps() * speed;
      if (S.biz) for (const bz of BIZ) { const o = S.biz[bz.id]; if (o) o.bank = Math.min(incOf(bz, o.lv) * 24, o.bank + (incOf(bz, o.lv) / 60) * gm); }
      if (shift) { shift.t -= dt; const e = $('#rp-st'); if (e) e.textContent = Math.ceil(shift.t); if (shift.t <= 0) endShift(); }
      if (act) {
        act.t += dt; addNeeds(act.gain, dt);
        $('#rp-act-b').style.width = (act.secs < 90 ? Math.min(1, act.t / act.secs) : (act.id === 'sleep' ? S.needs.energy : S.needs.fun) / 100) * 100 + '%';
        if (act.id === 'sleep' && (D3.wakeAt ? absMin() >= D3.wakeAt : S.needs.energy >= 100)) goodMorning();
        else if (act.secs < 90 && act.t >= act.secs) stopAct();
        else if ((act.id === 'tv' || act.id === 'console' || act.id === 'read') && S.needs.fun >= 100) stopAct();
        const b = curHouse(); if (b && b.F && (act && (act.id === 'tv' || act.id === 'console'))) b.F.screen.material = E.M('#5fb6ef', { emissive: ['#2f6bff', '#ff4d8b', '#14c79a'][Math.floor(act.t) % 3], emissiveIntensity: 1.2 });
      }
      const F = E.getF();
      if (act && act.spot) { F.x = act.spot.x; F.z = act.spot.z; F.h = act.spot.face; F.vx = F.vz = 0; }
      // locked doors on houses that aren't yours
      for (const b of BUILD) if (b.house != null && b.locked) { const c = b.doorCol; if (F.x > c.x0 - 0.35 && F.x < c.x1 + 0.35 && Math.abs(F.z - (c.z0 + c.z1) / 2) < 0.4) F.z = (c.z0 + c.z1) / 2 + (F.z < (c.z0 + c.z1) / 2 ? -0.4 : 0.4); }
      tickTower(dt); tickCourier(dt); EXT.forEach((m) => m.tick && m.tick(dt));
      tick -= dt; if (tick <= 0) { tick = 1; deliverOrders(); hud(); gpsHud(); if (Math.floor(S.time) % 180 < 2) { const low = NEEDS.find(([n]) => S.needs[n] < 15); if (low) say({ hunger: '🍔 You are hungry. Eat at home!', energy: '⚡ You are tired. Go to bed at home.', hygiene: '🫧 You need a shower.', fun: '🎉 You are bored. Go for a drive!' }[low[0]]); } if (Math.floor(S.time) % 60 < 2) save(); }
    },
    frame(dt) {
      if (!S) return; const F = E.getF(), now = performance.now() / 1000; EXT.forEach((m) => m.frame && m.frame(dt));
      // poses for sitting and lying
      if (E.G.mode === 'foot' && act && act.spot && F.m) {
        const u = F.m.userData;
        if (act.spot.lie) { F.m.rotation.set(-Math.PI / 2, F.h, 0, 'YXZ'); F.m.position.y = F.y + 0.61; }
        else if (act.spot.sit) { u.legs[0].rotation.x = u.legs[1].rotation.x = -1.4; F.m.position.y = F.y + 0.08; }
      } else if (F.m && F.m.rotation.x) F.m.rotation.x = 0;
      if (act && (act.id === 'eat' || act.id === 'cook' || act.id === 'coffee') && F.m) F.m.userData.arms[1].rotation.x = -1.2 + Math.sin(now * 10) * 0.4;
      if (act && act.id === 'shower' && Math.random() < 0.5) E.puff(F.x + (Math.random() - 0.5) * 0.6, 2.3, F.z + (Math.random() - 0.5) * 0.6, '#bfe8ff', 0.15, 0.5, 0, -4, 0, 0, 0.8);
      // houses are closed rooms: only the floating sign hides while you are inside
      for (const b of BUILD) { const inn = E.G.mode === 'foot' && insideB(b, F.x, F.z); if (b.sign) b.sign.visible = !inn; }
      // day and night across the whole city
      const h = S.time / 60, day = clamp(Math.sin(((h - 6) / 24) * Math.PI * 2) * 1.6 + 0.35, 0, 1);
      E.sun.intensity = 0.3 + 1.9 * day; RP.dayF = day; if (D3.hemi) D3.hemi.intensity = 0.25 + 0.75 * day;
      E.scene.background = day < 0.25 ? D3.night : D3.bg; E.scene.fog.color.copy(day < 0.25 ? D3.night : D3.fog);
      D3.lamp.emissiveIntensity = day < 0.5 ? 2.5 : 0.6;
      const b = curHouse(); if (b && b.lights) b.lights.forEach((l) => (l.intensity = S.home === b.house ? (day < 0.5 ? 14 : 8) : 0));
    },
  });
})();
