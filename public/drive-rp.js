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
  const hour = () => Math.floor(S.time / 60), clockTxt = () => { const h = hour(), m = Math.floor(S.time % 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

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
    const H = o.h || 3, t = 0.25, wm = E.M(o.wall, { roughness: 0.85 }), trim = E.M(o.trim || '#ffffff'), glass = E.M('#9fd3f2', { roughness: 0.05, metalness: 0.3, emissive: '#1d3550', emissiveIntensity: 0.25 });
    const fl = new T.Mesh(new T.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), E.M(o.floor || '#d9b58a', { roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.position.set((o.x0 + o.x1) / 2, Y0, (o.z0 + o.z1) / 2); fl.receiveShadow = true; group.add(fl);
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
    const roof = new T.Group(); group.add(roof);
    if (o.peak) { const r = new T.Mesh(new T.ConeGeometry(Math.hypot(o.x1 - o.x0, o.z1 - o.z0) * 0.56, 2.8, 4), E.M(o.roof)); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, (o.z1 - o.z0) / (o.x1 - o.x0)); r.position.set((o.x0 + o.x1) / 2, H + Y0 + 1.4, (o.z0 + o.z1) / 2); r.castShadow = true; roof.add(r); }
    else V2.box(o.x1 - o.x0 + 0.8, 0.4, o.z1 - o.z0 + 0.8, E.M(o.roof), (o.x0 + o.x1) / 2, H + Y0 + 0.2, (o.z0 + o.z1) / 2, roof);
    const b = { ...o, walls, roof, wx0: ox + o.x0, wx1: ox + o.x1, wz0: oz + o.z0, wz1: oz + o.z1 }; BUILD.push(b); return b;
  }
  const insideB = (b, x, z) => x > b.wx0 && x < b.wx1 && z > b.wz0 && z < b.wz1;
  function obj(o, ox, oz) { o.x += ox; o.z += oz; OBJ.push(o); return o; }

  /* ---------- two-storey houses ---------- */
  const HOUSE_PRICES = [1200, 2500, 4000];
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
    const b = building({ ...HOUSE, wall, roof, floor: '#c99a66', peak: true }, V2, g); b.house = i; b.group = g; b.V2 = V2; b.price = HOUSE_PRICES[i];
    V2.box(1.6, 0.04, 6, '#c9cdd4', -6.3, 0.18, -3, g, false);
    for (const x of [-13, 1]) V2.box(1, 0.8, 0.8, '#3f8a3a', x, 0.55, -4.2, g);
    V2.box(2.2, 0.15, 1.2, '#b9bec7', -6.3, 0.2, -5.2, g); // doorstep
    b.door = V2.box(1.4, 2.4, 0.1, '#8b5a33', -6.3, Y0 + 1.2, -6, g);
    b.doorCol = { x0: g.position.x - 7, z0: g.position.z - 6.1, x1: g.position.x - 5.6, z1: g.position.z - 5.9 };
    b.sign = V2.sprite('🏠 For sale', 4.6, 0.8, 'rgba(22,32,61,.8)'); b.sign.position.set(-6.3, FH * 2 + 3.6, -5.4);
    // upstairs floor with a hole for the stairs, and the stairs themselves
    const slab = E.M('#c99a66', { roughness: 0.6 }), under = E.M('#f4f1ea');
    for (const [x0, z0, x1, z1] of [[-14, -20, 0, -6], [0, -20, 2, -13], [0, -8, 2, -6]]) { const s = V2.box(x1 - x0, 0.22, z1 - z0, slab, (x0 + x1) / 2, Y0 + FH - 0.11, (z0 + z1) / 2, g); s.receiveShadow = true; }
    for (let k = 0; k < 10; k++) V2.box(1.7, (k + 1) * (FH / 10), 0.5, '#8b6b4a', 1, Y0 + ((k + 1) * (FH / 10)) / 2, -12.75 + k * 0.5, g);
    V2.box(0.2, FH, 5, E.M('#f4efe6'), 0, Y0 + FH / 2, -10.5, g); // wall beside the stairs downstairs
    V2.box(2, FH, 0.2, E.M('#f4efe6'), 1, Y0 + FH / 2, -8, g);
    for (const [w, d, x, z] of [[0.08, 5, 0, -10.5], [2, 0.08, 1, -13]]) V2.box(w, 1, d, '#6b4a2f', x, Y0 + FH + 0.5, z, g); // upstairs railing
    // upstairs inner walls (bedroom, bathroom)
    const iw = E.M('#f4efe6', { roughness: 0.9 });
    for (const [x0, z0, x1, z1] of [[-6.1, -20, -5.9, -9], [-6.1, -7.6, -5.9, -6], [-6, -15.1, -3, -14.9], [-1.8, -15.1, 2, -14.9]]) V2.box(x1 - x0, FH - 0.1, z1 - z0, iw, (x0 + x1) / 2, Y0 + FH + (FH - 0.1) / 2, (z0 + z1) / 2, g);
    obj({ x: -6.3, z: -4.9, r: 1.5, house: i, outside: true, label: () => (S.home === i ? '🚪 Your house · walk in' : `🏠 Buy this house — ${fmt$(b.price)}`), use: () => buy(i) }, g.position.x, g.position.z);
    return b;
  }
  function furnish(b) {
    const T = E.T, V2 = b.V2, g = b.group, ox = g.position.x, oz = g.position.z, F = (b.F = {});
    const fg = new T.Group(); g.add(fg); b.furnGroup = fg;
    const at = (x, z, fl = 0) => { const gr = new T.Group(); gr.position.set(x, Y0 + fl * FH, z); fg.add(gr); return gr; };
    const up = Y0 + FH;
    // ---- ground floor: living room, kitchen, dining ----
    const sofa = at(-10.5, -8.2); V2.box(3, 0.45, 1, '#4f6bd8', 0, 0.35, 0, sofa); V2.box(3, 0.6, 0.25, '#4f6bd8', 0, 0.8, 0.4, sofa); for (const x of [-1.4, 1.4]) V2.box(0.25, 0.65, 1, '#3f58c0', x, 0.5, 0, sofa);
    const tvs = at(-10.5, -12.6); V2.box(2.2, 0.5, 0.6, '#6b4a2f', 0, 0.25, 0, tvs); F.tv = V2.box(1.6, 0.9, 0.08, '#16181f', 0, 1.05, -0.1, tvs); F.screen = V2.box(1.5, 0.82, 0.01, E.M('#0b0d12'), 0, 1.05, -0.05, tvs, false);
    F.bigtv = V2.box(2.6, 1.4, 0.08, '#16181f', -10.5, Y0 + 1.4, -12.66, fg); F.console = V2.box(0.5, 0.12, 0.35, '#f2f3f5', -9.6, Y0 + 0.56, -12.5, fg);
    F.rug = V2.box(4, 0.02, 2.6, '#b5533c', -10.5, Y0 + 0.02, -10.3, fg, false);
    F.shelf = at(-13.55, -10.5); V2.box(0.4, 2.2, 1.6, '#6b4a2f', 0, 1.1, 0, F.shelf); for (let k = 0; k < 12; k++) V2.box(0.22, 0.32, 0.12, ['#d61f30', '#2f6bff', '#14c79a', '#ffb31a'][k % 4], 0.06, 0.3 + Math.floor(k / 4) * 0.6, -0.6 + (k % 4) * 0.35, F.shelf, false);
    F.plants = [[-13.3, -6.7, 0], [-5.5, -6.7, 0], [-13.3, -19.3, 1]].map(([x, z, f]) => { const p = at(x, z, f); V2.cyl(0.25, 0.2, 0.45, '#d0784a', 0, 0.22, 0, p); V2.box(0.6, 0.6, 0.6, '#3f8a3a', 0, 0.75, 0, p); return p; });
    F.aquarium = at(-7.5, -6.6); V2.box(1.4, 0.7, 0.5, '#6b4a2f', 0, 0.35, 0, F.aquarium); V2.box(1.3, 0.7, 0.45, E.M('#5fb6ef', { transparent: true, opacity: 0.55 }), 0, 1.05, 0, F.aquarium);
    V2.box(5.1, 0.95, 0.8, '#f2f3f5', -3.05, Y0 + 0.47, -19.55, fg); V2.box(5.2, 0.06, 0.9, '#6f7685', -3.05, Y0 + 0.97, -19.55, fg); // kitchen counter
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
    const o = (q) => obj({ ...q, where: 'home' }, ox, oz);
    o({ x: -12.2, z: -15.8, r: 1.8, floor: 1, label: () => '🛏️ Sleep', use: () => activity('sleep', 'Sleeping… zzz', 99, { energy: has('goodbed') ? 18 : 12 }, { x: -12.2, z: -17.4, face: Math.PI, lie: true }) });
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
    applyFurniture(b);
  }
  function applyFurniture(b) {
    const F = b && b.F; if (!F) return;
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
  /* ---------- Business Center: start and grow your own businesses ---------- */
  const BIZ = [
    { id: 'lemon', name: 'Lemonade stand', icon: '🍋', cost: 200, inc: 10 }, { id: 'truck', name: 'Food truck', icon: '🌮', cost: 1500, inc: 50 },
    { id: 'cafe', name: 'Café', icon: '☕', cost: 4000, inc: 120 }, { id: 'wash', name: 'Car wash', icon: '🚿', cost: 9000, inc: 260 }, { id: 'tech', name: 'Tech startup', icon: '💻', cost: 20000, inc: 600 },
  ];
  const BIZ_MAX = 10, upCost = (b, lv) => Math.round(b.cost * 0.75 * lv), incOf = (b, lv) => b.inc * lv;
  function buildBiz() {
    const T = E.T, [cx, cz] = E.lotC(...E.RP_LOTS.biz), g = new T.Group(); g.position.set(cx, 0, cz); E.scene.add(g);
    const V2 = adapter(g);
    const b = building({ x0: -9, x1: 9, z0: -7, z1: 7, h: 4.5, wall: '#2b3350', floor: '#d9dee8', roof: '#16203d', trim: '#ffb31a', walls: [[-9, 9, 7, 'h', [[-1, 1]]], [-9, 9, -7, 'h'], [-7, 7, -9, 'v'], [-7, 7, 9, 'v']], windows: [[-5, 7, 1, 2.3], [5, 7, 1, 2.3], [-5, -7, 1, 2.3], [5, -7, 1, 2.3]] }, V2, g);
    b.sign = V2.sprite('🏢 Business Center', 6, 1.1, '#ffb31a', '#16203d'); b.sign.position.set(0, 6.4, 7.5);
    const l = new T.PointLight('#ffffff', 5, 18); l.position.set(0, 3.8, 0); g.add(l);
    V2.box(4, 1.1, 1, '#ffb31a', 0, 0.72, -2, g); E.addCol(cx - 2, cz - 2.5, cx + 2, cz - 1.5);
    const boss = E.person('#16203d', '#2d3a5c', '#8d5524', '#ffb31a'); boss.position.set(cx, 0.17, cz - 3.2); E.scene.add(boss);
    obj({ x: 0, z: -0.6, r: 1.6, label: () => '🏢 Business manager: start or grow a business', use: openBusiness }, cx, cz);
    for (const x of [-6.5, -4.5]) for (const z of [-4, 0, 4]) { V2.box(1.4, 0.06, 0.7, '#8b6b4a', x, 0.95, z, g); V2.box(0.6, 0.4, 0.04, E.M('#2f6bff', { emissive: '#2f6bff', emissiveIntensity: 0.5 }), x, 1.22, z - 0.2, g, false); E.addCol(cx + x - 0.7, cz + z - 0.35, cx + x + 0.7, cz + z + 0.35); }
    obj({ x: -5.5, z: 1.2, r: 2.4, label: () => '💻 Public computer: work a shift', use: () => openLaptop('jobs', true) }, cx, cz);
    for (const [x, z] of [[7.5, 5.5], [7.5, -5.5], [-8, 5.5]]) { V2.cyl(0.25, 0.2, 0.45, '#d0784a', x, 0.4, z, g); V2.box(0.6, 0.6, 0.6, '#3f8a3a', x, 0.95, z, g); }
  }
  function openBusiness() {
    stopAct(); S.biz = S.biz || {};
    openUi(`<div class="lf-top"><h3>🏢 Your businesses</h3><span class="pill">${fmt$(S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body"><p class="muted" style="margin:0 0 10px">Businesses earn money every hour of game time, even while you drive or sleep. Come back to collect it and upgrade them. Each can hold up to one day of earnings.</p><div class="lf-grid">${BIZ.map((b) => {
      const o = S.biz[b.id];
      if (!o) return `<div class="lf-card"><span class="ic">${b.icon}</span><b>${b.name}</b><p>Earns ${fmt$(b.inc)} per hour.</p><button class="btn gold" data-bbuy="${b.id}" ${S.cash < b.cost ? 'disabled' : ''}>Start for ${fmt$(b.cost)}</button></div>`;
      return `<div class="lf-card"><span class="ic">${b.icon}</span><b>${b.name}</b><p>Level ${o.lv} · ${fmt$(incOf(b, o.lv))}/hour</p><button class="btn primary" data-bcol="${b.id}" ${o.bank < 1 ? 'disabled' : ''}>Collect ${fmt$(o.bank)}</button>${o.lv < BIZ_MAX ? `<button class="btn ghost" data-bup="${b.id}" ${S.cash < upCost(b, o.lv) ? 'disabled' : ''}>Upgrade ${fmt$(upCost(b, o.lv))}</button>` : '<button class="btn ghost" disabled>Max level</button>'}</div>`;
    }).join('')}</div></div>`);
    $$('#rp-win [data-bbuy]').forEach((x) => (x.onclick = () => { const b = BIZ.find((q) => q.id === x.dataset.bbuy); if (S.cash < b.cost) return; S.cash -= b.cost; S.biz[b.id] = { lv: 1, bank: 0 }; save(); hud(); L.sfx && L.sfx('win'); say(`🎉 You started your ${b.name}!`); openBusiness(); }));
    $$('#rp-win [data-bcol]').forEach((x) => (x.onclick = () => { const o = S.biz[x.dataset.bcol]; const n = Math.floor(o.bank); S.cash += n; o.bank -= n; save(); hud(); L.sfx && L.sfx('cash'); openBusiness(); }));
    $$('#rp-win [data-bup]').forEach((x) => (x.onclick = () => { const b = BIZ.find((q) => q.id === x.dataset.bup), o = S.biz[b.id], c = upCost(b, o.lv); if (S.cash < c) return; S.cash -= c; o.lv++; save(); hud(); L.sfx && L.sfx('ding'); openBusiness(); }));
  }

  /* ---------- buying a house ---------- */
  function buy(i) {
    const b = BUILD.find((x) => x.house === i);
    if (S.home === i) return say('This is your house. Walk in through the front door!');
    if (S.cash < b.price) return say(`This house costs ${fmt$(b.price)}. You have ${fmt$(S.cash)}. Earn money with deliveries, the public computers at the Business Center, or a business!`, 4500);
    S.cash -= b.price; S.home = i; save(); setHouseState(); hud(); L.sfx && L.sfx('win');
    say(`🏠 You bought this house for ${fmt$(b.price)}! Walk in. Your bed and laptop are upstairs.`, 4500);
  }
  function setHouseState() {
    BUILD.filter((b) => b.house != null).forEach((b) => {
      const mine = S.home === b.house;
      b.door.visible = !mine;
      b.sign.material.map = E.textSprite(mine ? `🏠 ${(window.Social && Social.me()) || 'Your'}${window.Social && Social.me() ? "'s" : ''} house` : `🏠 For sale · ${fmt$(b.price)}`, mine ? '#14c79a' : 'rgba(22,32,61,.8)', '#ffffff', 4.6, 0.8).material.map;
      if (mine && !b.F) furnish(b);
      if (b.furnGroup) b.furnGroup.visible = mine;
      b.locked = !mine;
    });
  }

  /* ---------- needs, money, activities ---------- */
  const NEEDS = [['hunger', '🍔'], ['energy', '⚡'], ['hygiene', '🫧'], ['fun', '🎉']];
  function addNeeds(d, k = 1) { for (const n in d) if (S.needs[n] != null) S.needs[n] = clamp(S.needs[n] + d[n] * k, 0, 100); }
  const mood = () => (S.needs.hunger + S.needs.energy + S.needs.hygiene + S.needs.fun) / 4;
  function say(m, ms) { toast(m, ms || 2600); }
  function activity(id, text, secs, gain, spot) {
    stopAct(); act = { id, text, t: 0, secs, gain, spot: spot ? { ...spot, x: spot.x + curHouse().group.position.x, z: spot.z + curHouse().group.position.z } : null };
    if (act.spot) act.spot.floor = E.getF().floor || 0;
    if (act.spot) { const F = E.getF(); F.x = act.spot.x; F.z = act.spot.z; F.h = act.spot.face; }
    $('#rp-act').hidden = false; $('#rp-act-t').textContent = text; L.sfx && L.sfx('click');
  }
  const curHouse = () => BUILD.find((b) => b.house === S.home) || BUILD[0];
  function stopAct() { if (!act) return; act = null; $('#rp-act').hidden = true; const b = curHouse(); if (b && b.F) b.F.screen.material = E.M('#0b0d12'); }
  const cartTotal = () => cart.reduce((a, id) => a + FOODS[id].price, 0);
  function addToCart(id) {
    if (hour() < 8 || hour() >= 22) return say('The market is closed. It opens at 8 AM.');
    if (cart.length >= 12) return say('Your basket is full. Pay at the till.');
    cart.push(id); L.sfx && L.sfx('pop'); say(`${FOODS[id].icon} added. Basket ${fmt$(cartTotal())}`, 1600); hud();
  }
  function checkout() {
    if (!cart.length) return say('Pick food from the shelves first.');
    const total = cartTotal(); if (S.cash < total) return say(`You need ${fmt$(total)} but have ${fmt$(S.cash)}. Work on your laptop or do deliveries!`);
    S.cash -= total; for (const id of cart) S.pantry[id] = (S.pantry[id] || 0) + 1;
    say(`Paid ${fmt$(total)}. The food is in your fridge at home.`, 3000); cart = []; L.sfx && L.sfx('cash'); save(); hud();
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
    const apps = `<div class="lf-apps">${[['jobs', '💼 Jobs'], ['biz', '🏢 Business'], ...(publicPc ? [] : [['shop', '🛋️ Home shop']]), ['bank', '🏦 Bank']].map(([id, l]) => `<button data-app="${id}" class="${tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'jobs') body = `<div class="lf-grid">${JOBS.map((j) => `<div class="lf-card"><span class="ic">${j.icon}</span><b>${j.name}</b><p>${j.desc}</p><p>Level ${1 + Math.floor((S.jobs[j.id] || 0) / 5)}</p><button class="btn primary" data-job="${j.id}">Start 60s shift</button></div>`).join('')}</div>`;
    else if (tab === 'shop') body = `<div class="lf-grid">${FURNI.map((f) => `<div class="lf-card"><span class="ic">${f.icon}</span><b>${f.name}</b><p>${f.desc}</p><button class="btn ${has(f.id) ? 'ghost' : 'gold'}" data-buy="${f.id}" ${has(f.id) || S.cash < f.price ? 'disabled' : ''}>${has(f.id) ? 'In your house' : 'Buy ' + fmt$(f.price)}</button></div>`).join('')}</div>`;
    else body = `<div class="lf-card" style="max-width:420px"><span class="ic">🏦</span><b>Balance: ${fmt$(S.cash)}</b><p>Swap money for LSP points: $50 → ⭐ 10.</p><button class="btn gold" data-swap="1" ${S.cash < 50 ? 'disabled' : ''}>Swap $50 for ⭐ 10</button></div>`;
    openUi(`<div class="lf-top"><h3>💻 LSP OS</h3><span class="pill" style="background:#2f3850;color:#fff;border:0">${fmt$(S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body">${apps}<div style="margin-top:12px">${body}</div></div>`, true);
    $$('#rp-win [data-app]').forEach((b) => (b.onclick = () => openLaptop(b.dataset.app)));
    $$('#rp-win [data-job]').forEach((b) => (b.onclick = () => startShift(b.dataset.job)));
    $$('#rp-win [data-buy]').forEach((b) => (b.onclick = () => { const f = FURNI.find((x) => x.id === b.dataset.buy); if (S.cash < f.price) return; S.cash -= f.price; S.owned.push(f.id); save(); applyFurniture(curHouse()); hud(); L.sfx && L.sfx('cash'); say(`${f.icon} ${f.name} delivered!`); openLaptop('shop'); }));
    $$('#rp-win [data-swap]').forEach((b) => (b.onclick = () => { if (S.cash < 50) return; S.cash -= 50; Wallet.add(10); save(); hud(); L.sfx && L.sfx('coin'); openLaptop('bank'); }));
  }
  const payMult = () => (has('pc') ? 1.25 : 1) * (mood() >= 60 ? 1.2 : mood() < 30 ? 0.8 : 1) * (1 + 0.1 * Math.floor((S.jobs[shift.id] || 0) / 5));
  function startShift(id) {
    if (S.needs.hunger < 8) return say('Too hungry to work. Eat first!');
    if (S.needs.energy < 8) return say('Too tired to work. Sleep first!');
    shift = { id, t: 60, pay: 0, done: 0, good: 0 }; nextTask();
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
    S.cash += s.pay; S.earned += s.pay; S.shifts++; S.jobs[s.id] = (S.jobs[s.id] || 0) + s.good; addNeeds({ energy: -12, hunger: -8, fun: -4 });
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

  /* ---------- the module LSP Drive calls ---------- */
  const RP = (window.LSPDriveRP = {
    ready: false,
    build(env) {
      E = env;
      DB = L.store('life', { cash: 250, pantry: { bread: 1, apple: 2, eggs: 1, veg: 1 }, owned: [], needs: { hunger: 80, energy: 80, hygiene: 80, fun: 70 }, time: 8 * 60, day: 1, jobs: { type: 0, code: 0, support: 0 }, earned: 0, shifts: 0 });
      S = DB.load(); if (S.home === undefined) S.home = null;
      E.RP_LOTS.houses.forEach((_, i) => buildHouse(i));
      buildMarket(); buildBiz();
      const scr = $('#s-drive');
      $('#s-drive .hud').insertAdjacentHTML('beforeend', '<span class="hudpill" id="rp-cash">$0</span><span class="hudpill" id="rp-clock"></span><span class="hudpill" id="rp-needs" title="Hunger, energy, hygiene, fun"></span><span class="hudpill" id="rp-cart" hidden></span>');
      scr.insertAdjacentHTML('beforeend', '<div class="lf-act" id="rp-act" hidden><span id="rp-act-t"></span><div class="bar"><i id="rp-act-b" style="width:0%"></i></div><button id="rp-act-x">Stop</button></div><div class="lf-ui" id="rp-ui" hidden><div class="lf-win" id="rp-win"></div></div>');
      $('#rp-act-x').onclick = stopAct;
      const st = document.createElement('style'); st.textContent = '#s-drive .d-obj{top:calc(112px + env(safe-area-inset-top,0px))} #s-drive .lf-act{top:calc(112px + env(safe-area-inset-top,0px))}'; document.head.appendChild(st);
      $('#rp-ui').addEventListener('pointerdown', (e) => { if (e.target.id === 'rp-ui' && !shift) closeUi(); });
      addEventListener('keydown', (e) => { if (ui && e.code === 'Escape' && !shift && L.isActive('s-drive')) { e.stopImmediatePropagation(); closeUi(); } }, true);
      D3.hemi = E.scene.children.find((o) => o.isHemisphereLight); D3.bg = E.scene.background; D3.night = new E.T.Color('#0c1630'); D3.fog = E.scene.fog.color.clone();
      D3.lamp = E.M('#fffbe6', { emissive: '#fff1c2', emissiveIntensity: 0.6 });
      setHouseState(); RP.ready = true; hud();
    },
    enter() { S = DB.load(); if (S.home === undefined) S.home = null; setHouseState(); hud(); if (S.home == null) setTimeout(() => toast(`🏠 You have ${fmt$(S.cash)} and no house yet. Houses for sale are next to your garage. Earn money at the 🏢 Business Center (public computers) and with deliveries, then buy one!`, 6500), 2500); },
    leave() { stopAct(); closeUi(); cart = []; if (shift) shift = null; save(); },
    blocked: () => ui || !!(act && act.spot),
    inside() { const F = E.getF(); return E.G.mode === 'foot' && BUILD.some((b) => insideB(b, F.x, F.z)); },
    _tp(x, z) { const F = E.getF(); F.x = x; F.z = z; F.vx = F.vz = 0; },
    _S: () => S,
    _F: () => E.getF(),
    addCash(n) { if (!S || !(n > 0)) return; S.cash += n; save(); hud(); },
    nearest() {
      const F = E.getF(); let best = null, bd = 1e9;
      for (const o of OBJ) {
        if (o.need && !has(o.need)) continue; if (o.floor != null && o.floor !== (F.floor || 0)) continue; if (o.where === 'home' && (S.home == null || !insideB(curHouse(), o.x, o.z))) continue;
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
      const F = E.getF(), b = BUILD.find((q) => insideB(q, F.x, F.z));
      if (!b) { D3.ch = D3.cp = null; return false; }
      D3.ch = D3.ch == null ? F.h : D3.ch + wrapA(F.h - D3.ch) * Math.min(1, dt * 5);
      const fx = Math.sin(D3.ch), fz = Math.cos(D3.ch), m = 0.4;
      const ceil = b.house != null ? Y0 + Math.min(2, (F.floor || 0) + 1 + (F.stairs ? 1 : 0)) * FH - 0.35 : Y0 + b.h - 0.35;
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
      const cols = onSt ? [[-0.1, -13, 0.1, -8]] : FLOOR_COLS[F.floor || 0], r = 0.35;
      let px = lx, pz = lz;
      for (const [x0, z0, x1, z1] of cols) {
        const cx = clamp(px, x0, x1), cz = clamp(pz, z0, z1), dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
        if (d >= r) continue;
        if (d > 1e-4) { px = cx + (dx / d) * r; pz = cz + (dz / d) * r; }
        else { const o = [[px - x0 + r, -1, 0], [x1 - px + r, 1, 0], [pz - z0 + r, 0, -1], [z1 - pz + r, 0, 1]].sort((a, q) => a[0] - q[0])[0]; px += o[1] * o[0]; pz += o[2] * o[0]; }
      }
      F.x = px + ox; F.z = pz + oz;
    },
    tick(dt) {
      if (!S) return;
      const sleeping = act && act.id === 'sleep', speed = sleeping ? 15 : 1;
      S.time += dt * MIN_PER_SEC * speed; if (S.time >= DAY_MIN) { S.time -= DAY_MIN; S.day++; say(`☀️ Day ${S.day}`); }
      addNeeds({ hunger: -0.09, energy: sleeping ? 0 : -0.05, hygiene: -0.035, fun: E.G.mode === 'drive' ? 0.05 : -0.05 }, dt * (sleeping ? 0.3 : 1));
      const gm = dt * MIN_PER_SEC * speed;
      if (S.biz) for (const bz of BIZ) { const o = S.biz[bz.id]; if (o) o.bank = Math.min(incOf(bz, o.lv) * 24, o.bank + (incOf(bz, o.lv) / 60) * gm); }
      if (shift) { shift.t -= dt; const e = $('#rp-st'); if (e) e.textContent = Math.ceil(shift.t); if (shift.t <= 0) endShift(); }
      if (act) {
        act.t += dt; addNeeds(act.gain, dt);
        $('#rp-act-b').style.width = (act.secs < 90 ? Math.min(1, act.t / act.secs) : (act.id === 'sleep' ? S.needs.energy : S.needs.fun) / 100) * 100 + '%';
        if (act.id === 'sleep' && (S.needs.energy >= 100 || (hour() === 7 && S.needs.energy > 60))) { stopAct(); say('😊 Good morning!'); }
        else if (act.secs < 90 && act.t >= act.secs) stopAct();
        else if ((act.id === 'tv' || act.id === 'console' || act.id === 'read') && S.needs.fun >= 100) stopAct();
        const b = curHouse(); if (b && b.F && (act && (act.id === 'tv' || act.id === 'console'))) b.F.screen.material = E.M('#5fb6ef', { emissive: ['#2f6bff', '#ff4d8b', '#14c79a'][Math.floor(act.t) % 3], emissiveIntensity: 1.2 });
      }
      const F = E.getF();
      if (act && act.spot) { F.x = act.spot.x; F.z = act.spot.z; F.h = act.spot.face; F.vx = F.vz = 0; }
      // locked doors on houses that aren't yours
      for (const b of BUILD) if (b.house != null && b.locked) { const c = b.doorCol; if (F.x > c.x0 - 0.35 && F.x < c.x1 + 0.35 && Math.abs(F.z - (c.z0 + c.z1) / 2) < 0.4) F.z = (c.z0 + c.z1) / 2 + (F.z < (c.z0 + c.z1) / 2 ? -0.4 : 0.4); }
      tick -= dt; if (tick <= 0) { tick = 1; hud(); if (Math.floor(S.time) % 180 < 2) { const low = NEEDS.find(([n]) => S.needs[n] < 15); if (low) say({ hunger: '🍔 You are hungry. Eat at home!', energy: '⚡ You are tired. Go to bed at home.', hygiene: '🫧 You need a shower.', fun: '🎉 You are bored. Go for a drive!' }[low[0]]); } if (Math.floor(S.time) % 60 < 2) save(); }
    },
    frame(dt) {
      if (!S) return; const F = E.getF(), now = performance.now() / 1000;
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
      E.sun.intensity = 0.3 + 1.9 * day; if (D3.hemi) D3.hemi.intensity = 0.25 + 0.75 * day;
      E.scene.background = day < 0.25 ? D3.night : D3.bg; E.scene.fog.color.copy(day < 0.25 ? D3.night : D3.fog);
      D3.lamp.emissiveIntensity = day < 0.5 ? 2.5 : 0.6;
      const b = curHouse(); if (b && b.lights) b.lights.forEach((l) => (l.intensity = S.home === b.house ? (day < 0.5 ? 14 : 8) : 0));
    },
  });
})();
