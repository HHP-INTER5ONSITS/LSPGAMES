/* LSP Life: a 3D life sim. Live in your house, look after your needs, go to the
 * supermarket, work real jobs on your laptop, earn money and decorate your home.
 * Money ($) is saved per player. Every work shift also earns LSP points (⭐).
 */
(function () {
  'use strict';
  const L = LSPG;

  /* ================= data ================= */
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
    { id: 'bigtv', name: 'Big Smart TV', icon: '📺', price: 450, desc: 'Watching TV is twice as fun.' },
    { id: 'console', name: 'Game console', icon: '🎮', price: 600, desc: 'Play games for lots of fun.' },
    { id: 'coffee', name: 'Coffee machine', icon: '☕', price: 250, desc: 'A quick energy boost in the kitchen.' },
    { id: 'goodbed', name: 'Memory-foam bed', icon: '🛏️', price: 700, desc: 'Sleep and recover energy 50% faster.' },
    { id: 'rug', name: 'Cozy rug', icon: '🟫', price: 80, desc: 'Makes the living room cozy.' },
    { id: 'plant', name: 'House plants', icon: '🪴', price: 60, desc: 'A little green in every room.' },
    { id: 'shelf', name: 'Bookshelf', icon: '📚', price: 150, desc: 'Read a book for fun.' },
    { id: 'pc', name: 'Pro laptop', icon: '💻', price: 900, desc: 'All laptop jobs pay 25% more.' },
    { id: 'bath', name: 'Bathtub', icon: '🛁', price: 500, desc: 'A relaxing bath: clean and fun.' },
    { id: 'aquarium', name: 'Aquarium', icon: '🐠', price: 350, desc: 'Watch the fish to relax.' },
  ];
  const JOBS = [
    { id: 'type', name: 'Typist', icon: '⌨️', desc: 'Type sentences exactly. Pay per correct letter.' },
    { id: 'code', name: 'Junior coder', icon: '🧑‍💻', desc: 'Read a little code and pick what it prints.' },
    { id: 'support', name: 'Customer support', icon: '🎧', desc: 'Pick the most helpful reply to each customer.' },
  ];
  const SENTENCES = [
    'The quick brown fox jumps over the lazy dog.', 'Please send the report before five o clock.', 'Thank you for shopping at LSP Market today.',
    'Our team will reply to your message soon.', 'Save your work often so nothing gets lost.', 'The train to Mumbai leaves at half past nine.',
    'Fresh mangoes are on sale this week only.', 'Remember to drink water and take short breaks.', 'Meeting moved to Tuesday at ten in the morning.',
    'Your order has been packed and shipped.', 'Practice every day and you will get faster.', 'Happy birthday, have a wonderful day!',
  ];
  const CODE = [
    { c: 'let a = 2;\na = a + 3;\nprint(a);', o: ['5', '23', '6'], a: 0 },
    { c: 'let s = "Hi";\nprint(s + s);', o: ['Hi Hi', 'HiHi', '2'], a: 1 },
    { c: 'let n = 10;\nif (n > 5) print("big");\nelse print("small");', o: ['small', 'big', '10'], a: 1 },
    { c: 'let t = 0;\nfor (let i = 1; i <= 3; i++) t += i;\nprint(t);', o: ['3', '6', '123'], a: 1 },
    { c: 'let list = [4, 7, 9];\nprint(list.length);', o: ['3', '9', '20'], a: 0 },
    { c: 'let x = 7 % 3;\nprint(x);', o: ['2', '1', '4'], a: 1 },
    { c: 'let name = "lsp";\nprint(name.toUpperCase());', o: ['Lsp', 'LSP', 'lsp'], a: 1 },
    { c: 'let a = [1, 2, 3];\nprint(a[0] + a[2]);', o: ['4', '3', '5'], a: 0 },
    { c: 'let k = 3;\nk = k * k;\nprint(k);', o: ['6', '9', '33'], a: 1 },
    { c: 'print(10 / 4);', o: ['2', '2.5', '2.4'], a: 1 },
    { c: 'let ok = 5 === "5";\nprint(ok);', o: ['true', 'false', '5'], a: 1 },
    { c: 'let w = "game";\nprint(w.length);', o: ['4', '5', 'game'], a: 0 },
  ];
  const SUPPORT = [
    { q: 'My parcel has not arrived and it is 3 days late!', o: ['That is not our problem.', 'Sorry about the wait! Let me check the tracking and send you an update today.', 'Wait longer.'], a: 1 },
    { q: 'I forgot my password, how do I get back in?', o: ['Make a new account.', 'Click "Forgot password" on the login page and we will email you a reset link.', 'Try guessing it.'], a: 1 },
    { q: 'The shoes I bought are too small.', o: ['You can exchange them for free within 30 days. Want me to start that for you?', 'Should have bought bigger ones.', 'We do not do refunds ever.'], a: 0 },
    { q: 'Your app keeps closing on my phone.', o: ['Buy a new phone.', 'Sorry! Please update the app to the latest version. If it still closes, tell me your phone model.', 'Works for me.'], a: 1 },
    { q: 'Can I change my delivery address?', o: ['No.', 'Yes! If it has not shipped yet I can change it now. What is the new address?', 'Ask the courier.'], a: 1 },
    { q: 'I was charged twice for one order.', o: ['I am sorry! I can see the double charge and have refunded one of them. It takes 3-5 days.', 'Banks make mistakes.', 'Pay attention next time.'], a: 0 },
    { q: 'Do you have this jacket in blue?', o: ['Look yourself.', 'We do! Blue is in stock in sizes S to XL. Shall I add it to your cart?', 'Blue is ugly.'], a: 1 },
    { q: 'Thank you, your team was really helpful!', o: ['Okay.', 'Thank you so much for the kind words! Have a great day.', 'We know.'], a: 1 },
  ];
  const START_CASH = 250, DAY_MIN = 24 * 60, MIN_PER_SEC = 2;

  /* ================= save ================= */
  const DB = L.store('life', { cash: START_CASH, pantry: { bread: 1, apple: 2, eggs: 1, veg: 1 }, owned: [], needs: { hunger: 80, energy: 80, hygiene: 80, fun: 70 }, time: 8 * 60, day: 1, jobs: { type: 0, code: 0, support: 0 }, earned: 0, shifts: 0 });
  let S = null; const save = () => DB.save(S);
  const has = (id) => S.owned.includes(id);

  /* ================= shell ================= */
  const A = L.makeGame({
    key: 'life', title: 'LSP Life', emoji: '🏡', cardBg: '#e2f4e8', grid: 'rp-games', bg: '#9fd0f5',
    desc: 'Live your life in 3D: your house, the supermarket and real jobs on your laptop.',
    tabs: [['play', 'Play']],
    hud: '<span class="hudpill" id="lf-cash">$0</span><span class="hudpill" id="lf-clock">Day 1 8:00</span><span class="hudpill" id="lf-cart" hidden>🛒 0</span>',
    padsL: '<div class="lf-dpad"><button class="kbtn" data-k="up" aria-label="Up">▲</button><button class="kbtn" data-k="left" aria-label="Left">◀</button><button class="kbtn" data-k="down" aria-label="Down">▼</button><button class="kbtn" data-k="right" aria-label="Right">▶</button></div>',
    padsR: '<button class="kbtn jump" data-k="act">USE</button>',
    help: 'WASD or arrows to walk · Shift to run · E to use things · Esc to pause', rotate: false,
    quitNote: 'Your house, money and food are saved.',
    progress: () => { const s = DB.load(); return `$${s.cash.toLocaleString()} · Day ${s.day} · ${s.owned.length} furniture`; },
  });
  const css = `
  .lf-needs{position:absolute;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.92);border:2px solid var(--line);border-radius:14px;padding:8px 10px;display:grid;gap:4px;min-width:170px;z-index:2;pointer-events:none}
  .touch .lf-needs{left:auto;right:12px;top:calc(64px + env(safe-area-inset-top,0px));bottom:auto;min-width:140px;padding:6px 8px}
  .lf-need{display:grid;grid-template-columns:22px 1fr;align-items:center;gap:6px;font-size:14px}
  .lf-need .bar{height:8px}.lf-need .bar i{transition:width .3s}
  .lf-prompt{position:absolute;left:50%;bottom:calc(110px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#fff;border:2px solid var(--line);border-radius:12px;padding:8px 14px;font-weight:800;white-space:nowrap;z-index:2;pointer-events:none}
  .lf-prompt:empty{display:none}
  .lf-act{position:absolute;left:50%;top:calc(66px + env(safe-area-inset-top,0px));transform:translateX(-50%);background:rgba(22,32,61,.85);color:#fff;border-radius:12px;padding:8px 14px;font-weight:800;z-index:2;display:flex;gap:10px;align-items:center}
  .lf-act[hidden]{display:none}.lf-act .bar{width:120px;height:8px;background:rgba(255,255,255,.2)}.lf-act button{pointer-events:auto;background:#fff;border:0;border-radius:8px;padding:4px 10px;font-weight:800}
  .lf-dpad{display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:6px}
  .lf-dpad .kbtn{width:64px;height:64px;font-size:20px}.lf-dpad [data-k=up]{grid-column:2}.lf-dpad [data-k=left]{grid-column:1;grid-row:2}.lf-dpad [data-k=down]{grid-column:2;grid-row:2}.lf-dpad [data-k=right]{grid-column:3;grid-row:2}
  .lf-ui{position:absolute;inset:0;background:rgba(22,32,61,.45);display:flex;align-items:center;justify-content:center;padding:14px;z-index:8}
  .lf-ui[hidden]{display:none}
  .lf-win{background:#fff;border-radius:22px;width:min(640px,100%);max-height:100%;overflow:auto;border:2px solid var(--line);box-shadow:0 8px 0 var(--line)}
  .lf-win.laptop{background:#1d2333;color:#fff;border:10px solid #3c4458;border-radius:18px;box-shadow:0 14px 0 #2a3040}
  .lf-top{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:2px solid var(--line);position:sticky;top:0;background:inherit;z-index:1}
  .laptop .lf-top{border-color:#2f3850}
  .lf-top h3{flex:1;font-size:18px}.lf-top .x{border:0;background:#eef1f7;border-radius:10px;width:36px;height:36px;font-size:18px}
  .laptop .lf-top .x{background:#2f3850;color:#fff}
  .lf-body{padding:14px}
  .lf-apps{display:flex;gap:6px;flex-wrap:wrap}
  .lf-apps button{border:0;border-radius:10px;padding:8px 12px;font-weight:800;background:#2f3850;color:#cfd8ee}.lf-apps button.on{background:#2f6bff;color:#fff}
  .lf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
  .lf-card{background:#262d42;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px}
  .lf-win:not(.laptop) .lf-card{background:#f3f6fc}
  .lf-card .ic{font-size:30px}.lf-card b{font-family:Fredoka,system-ui,sans-serif;font-size:16px}.lf-card p{font-size:13px;opacity:.75;margin:0}
  .lf-card .btn{height:40px;font-size:14px;margin-top:auto}
  .lf-task{background:#262d42;border-radius:14px;padding:14px;margin-top:10px}
  .lf-task pre{background:#0f1422;color:#9fe3a8;border-radius:10px;padding:12px;font:600 15px ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;margin:0 0 10px}
  .lf-task .q{font-weight:700;font-size:16px;margin-bottom:10px}
  .lf-opts{display:grid;gap:8px}.lf-opts button{text-align:left;border:2px solid #3a4562;background:#1d2333;color:#fff;border-radius:12px;padding:10px 12px;font-weight:700;font-size:15px}
  .lf-opts button.good{border-color:#14c79a;background:#0e3d33}.lf-opts button.bad{border-color:#ff4d5e;background:#4a1e26}
  .lf-type{font:700 18px Nunito,system-ui,sans-serif;line-height:1.5;margin-bottom:10px;letter-spacing:.2px}
  .lf-type .ok{color:#14c79a}.lf-type .no{color:#ff6b78;text-decoration:underline}
  .lf-in{width:100%;height:50px;border-radius:12px;border:2px solid #3a4562;background:#0f1422;color:#fff;padding:0 12px;font:700 17px Nunito,system-ui,sans-serif}
  .lf-shift{display:flex;justify-content:space-between;font-weight:800;margin-top:10px;color:#cfd8ee}
  .lf-food{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e3e8f2}.lf-food span{flex:1;font-weight:700}
  `;
  const stEl = document.createElement('style'); stEl.textContent = css; document.head.appendChild(stEl);
  A.scr.insertAdjacentHTML('beforeend', `
    <div class="lf-needs" id="lf-needs"></div>
    <div class="lf-prompt" id="lf-prompt"></div>
    <div class="lf-act" id="lf-act" hidden><span id="lf-act-t"></span><div class="bar"><i id="lf-act-b" style="width:0%"></i></div><button id="lf-act-x">Stop</button></div>
    <div class="lf-ui" id="lf-ui" hidden><div class="lf-win" id="lf-win"></div></div>`);
  const g = A.g;

  /* ================= world ================= */
  const V = L.g3d(A, { sky: ['#5ea4e8', '#cfe7f8'], fogNear: 45, fogFar: 120, shadowSize: 22 });
  const COL = [], OBJ = [], BUILD = [];
  const W = { x0: -40, x1: 40, z0: -26, z1: 26 };
  let P = null, D3 = {};
  const addCol = (x0, z0, x1, z1) => COL.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  // A building: floor, walls with door gaps, roof. Walls drop to knee height when you are inside (like Bloxburg).
  function building(o) {
    const T = V.T, grp = new T.Group(), walls = new T.Group(); V.scene.add(grp); grp.add(walls);
    const H = o.h || 3, t = 0.2, wm = V.M(o.wall || '#f3ece0', { roughness: 0.85 }), trim = V.M(o.trim || '#ffffff');
    const fl = new T.Mesh(new T.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), V.M(o.floor || '#d9b58a', { roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.position.set((o.x0 + o.x1) / 2, 0.02, (o.z0 + o.z1) / 2); fl.receiveShadow = true; grp.add(fl);
    const seg = (a0, a1, fixed, horiz) => {
      const len = a1 - a0; if (len < 0.05) return;
      const m = horiz ? V.box(len, H, t, wm, (a0 + a1) / 2, H / 2, fixed, walls) : V.box(t, H, len, wm, fixed, H / 2, (a0 + a1) / 2, walls);
      const tr = horiz ? V.box(len, 0.12, t + 0.04, trim, (a0 + a1) / 2, 0.06, fixed, walls, false) : V.box(t + 0.04, 0.12, len, trim, fixed, 0.06, (a0 + a1) / 2, walls, false);
      horiz ? addCol(a0, fixed - t / 2, a1, fixed + t / 2) : addCol(fixed - t / 2, a0, fixed + t / 2, a1);
    };
    const wall = (a0, a1, fixed, horiz, gaps = []) => { let cur = a0; for (const [g0, g1] of gaps.slice().sort((p, q) => p[0] - q[0])) { seg(cur, g0, fixed, horiz); cur = g1; } seg(cur, a1, fixed, horiz); };
    for (const w of o.walls) wall(w[0], w[1], w[2], w[3] === 'h', w[4] || []);
    const roof = V.box(o.x1 - o.x0 + 0.8, 0.35, o.z1 - o.z0 + 0.8, V.M(o.roof || '#b5533c'), (o.x0 + o.x1) / 2, H + 0.18, (o.z0 + o.z1) / 2, grp);
    const b = { ...o, grp, walls, roof, inside: false }; BUILD.push(b); return b;
  }
  // Something you can use: E near it shows "label".
  function obj(o) { OBJ.push(o); return o; }
  function furniture() {
    const T = V.T, sc = V.scene, F = D3.furn = {};
    const g2 = (x, z, r = 0) => { const gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = r; sc.add(gr); return gr; };
    // living room
    const sofa = g2(-10.5, -8.2); V.box(3, 0.45, 1, '#4f6bd8', 0, 0.35, 0, sofa); V.box(3, 0.6, 0.25, '#4f6bd8', 0, 0.8, 0.4, sofa); for (const x of [-1.4, 1.4]) V.box(0.25, 0.65, 1, '#3f58c0', x, 0.5, 0, sofa); addCol(-12, -8.7, -9, -7.7);
    const tvs = g2(-10.5, -12.6); V.box(2.2, 0.5, 0.6, '#6b4a2f', 0, 0.25, 0, tvs); F.tv = V.box(1.6, 0.9, 0.08, V.M('#16181f', { roughness: 0.2 }), 0, 1.05, -0.1, tvs); F.tvScreen = V.box(1.5, 0.82, 0.01, V.M('#0b0d12', { emissive: '#000000' }), 0, 1.05, -0.05, tvs, false); addCol(-11.6, -12.9, -9.4, -12.3);
    F.bigtv = V.box(2.6, 1.4, 0.08, V.M('#16181f', { roughness: 0.2 }), -10.5, 1.4, -12.66); F.bigtv.visible = false;
    F.console = V.box(0.5, 0.12, 0.35, '#f2f3f5', -9.6, 0.56, -12.5); F.console.visible = false;
    F.rug = V.box(4, 0.02, 2.6, '#b5533c', -10.5, 0.03, -10.3, sc, false); F.rug.visible = false;
    F.shelf = new T.Group(); F.shelf.position.set(-13.55, 0, -10.5); sc.add(F.shelf); V.box(0.4, 2.2, 1.6, '#6b4a2f', 0, 1.1, 0, F.shelf); for (let i = 0; i < 4; i++) for (let k = 0; k < 5; k++) V.box(0.22, 0.32, 0.12, ['#d61f30', '#2f6bff', '#14c79a', '#ffb31a'][(i + k) % 4], 0.06, 0.3 + i * 0.5, -0.6 + k * 0.28, F.shelf, false); F.shelf.visible = false;
    F.plants = []; for (const [x, z] of [[-13.3, -6.7], [1.3, -6.7], [-13.3, -19.3], [1.4, -14]]) { const p = new T.Group(); p.position.set(x, 0, z); V.cyl(0.25, 0.2, 0.45, '#d0784a', 0, 0.22, 0, p); const lf = new T.Mesh(new T.IcosahedronGeometry(0.45, 0), V.M('#3f8a3a', { flatShading: true })); lf.position.y = 0.75; p.add(lf); sc.add(p); p.visible = false; F.plants.push(p); }
    F.aquarium = new T.Group(); F.aquarium.position.set(-7, 0, -6.6); sc.add(F.aquarium); V.box(1.4, 0.7, 0.5, '#6b4a2f', 0, 0.35, 0, F.aquarium); V.box(1.3, 0.7, 0.45, V.M('#5fb6ef', { transparent: true, opacity: 0.55 }), 0, 1.05, 0, F.aquarium); F.fish = [0, 1, 2].map((i) => V.box(0.14, 0.08, 0.04, ['#ff8a3d', '#ffd23f', '#ff4d8b'][i], 0, 1 + i * 0.12, 0, F.aquarium, false)); F.aquarium.visible = false;
    // kitchen
    V.box(6.6, 0.95, 0.7, '#f2f3f5', -2.4, 0.47, -12.55); V.box(6.7, 0.06, 0.8, '#6f7685', -2.4, 0.97, -12.55); addCol(-5.7, -12.95, 0.9, -12.15);
    V.box(0.9, 2, 0.75, V.M('#e7ebf2', { metalness: 0.4, roughness: 0.3 }), 1.4, 1, -12.5); addCol(0.9, -12.9, 1.9, -12.1); // fridge
    V.box(0.8, 0.04, 0.6, '#2b3350', -1, 1.0, -12.55, sc, false); for (const [x, z] of [[-1.2, -12.7], [-0.8, -12.4]]) V.cyl(0.13, 0.13, 0.02, '#1c1e24', x, 1.03, z, sc, 14);
    V.box(0.7, 0.05, 0.45, '#9aa3b5', -3.2, 1.0, -12.55, sc, false); // sink
    F.coffee = V.box(0.35, 0.45, 0.3, '#2b3350', -4.8, 1.22, -12.6); F.coffee.visible = false;
    const table = g2(-2.5, -8.8); V.cyl(0.9, 0.9, 0.08, '#8b6b4a', 0, 0.78, 0, table, 24); V.cyl(0.08, 0.12, 0.75, '#6b4a2f', 0, 0.38, 0, table, 8); addCol(-3.4, -9.7, -1.6, -7.9);
    for (const a of [0, 2.1, 4.2]) { V.box(0.45, 0.45, 0.45, '#b07d50', -2.5 + Math.cos(a) * 1.3, 0.23, -8.8 + Math.sin(a) * 1.3); }
    // bedroom
    F.bed = new T.Group(); F.bed.position.set(-12.2, 0, -17.6); sc.add(F.bed); V.box(2, 0.45, 2.8, '#8b6b4a', 0, 0.22, 0, F.bed); F.blanket = V.box(1.9, 0.18, 2.1, '#8a5cff', 0, 0.54, 0.3, F.bed); V.box(1.5, 0.2, 0.5, '#ffffff', 0, 0.56, -1.0, F.bed); V.box(2, 1, 0.15, '#6b4a2f', 0, 0.6, -1.4, F.bed); addCol(-13.2, -19, -11.2, -16.2);
    V.box(1.6, 0.06, 0.8, '#8b6b4a', -7.4, 0.78, -15.4); V.box(0.06, 0.75, 0.7, '#6b4a2f', -8.1, 0.38, -15.4); V.box(0.06, 0.75, 0.7, '#6b4a2f', -6.7, 0.38, -15.4); addCol(-8.2, -15.8, -6.6, -15);
    F.laptop = new T.Group(); F.laptop.position.set(-7.4, 0.81, -15.5); sc.add(F.laptop); V.box(0.6, 0.03, 0.42, '#c3cad8', 0, 0, 0, F.laptop); const scr = V.box(0.6, 0.4, 0.03, '#c3cad8', 0, 0.2, -0.2, F.laptop); scr.rotation.x = -0.25; F.lscreen = V.box(0.54, 0.34, 0.01, V.M('#2f6bff', { emissive: '#2f6bff', emissiveIntensity: 0.6 }), 0, 0.2, -0.18, F.laptop, false); F.lscreen.rotation.x = -0.25;
    V.box(0.5, 0.45, 0.5, '#2b3350', -7.4, 0.23, -14.6); // chair
    V.box(1.4, 2, 0.6, '#b07d50', -13.3, 1, -14); addCol(-14, -14.3, -12.6, -13.7); // wardrobe
    // bathroom
    V.box(1.4, 0.05, 1.4, '#c9d7e8', 1, 0.04, -19, sc, false); for (const [x, z] of [[0.3, -18.3]]) V.box(0.06, 2.2, 1.4, V.M('#cfe8ff', { transparent: true, opacity: 0.35 }), x, 1.1, -19, sc, false); V.cyl(0.04, 0.04, 0.3, '#c3cad8', 1.4, 2.1, -19.5, sc, 6); // shower
    V.box(0.5, 0.45, 0.65, '#ffffff', -1.2, 0.23, -19.4); V.box(0.5, 0.5, 0.2, '#ffffff', -1.2, 0.6, -19.75); addCol(-1.5, -19.8, -0.9, -19); // toilet
    V.box(0.8, 0.85, 0.5, '#ffffff', -4.4, 0.43, -19.6); V.box(0.6, 0.6, 0.04, V.M('#cfe8ff', { metalness: 0.6, roughness: 0.05 }), -4.4, 1.6, -19.85, sc, false); addCol(-4.8, -19.9, -4, -19.3);
    F.bath = new T.Group(); F.bath.position.set(-2.6, 0, -16.6); sc.add(F.bath); V.box(1.8, 0.6, 0.9, '#ffffff', 0, 0.3, 0, F.bath); V.box(1.6, 0.05, 0.7, '#9fd4ff', 0, 0.58, 0, F.bath); F.bath.visible = false;
    // house lights for the night
    D3.lights = [[-10, -9.5], [-2.5, -9.5], [-10, -16.5], [-2.5, -16.5]].map(([x, z]) => { const l = new T.PointLight('#ffe2b0', 0, 9); l.position.set(x, 2.6, z); sc.add(l); return l; });
    applyFurniture();
  }
  function applyFurniture() {
    if (!D3.furn) return; const F = D3.furn;
    F.bigtv.visible = has('bigtv'); F.tv.visible = F.tvScreen.visible = !has('bigtv'); F.console.visible = has('console'); F.rug.visible = has('rug');
    F.shelf.visible = has('shelf'); F.plants.forEach((p) => (p.visible = has('plant'))); F.aquarium.visible = has('aquarium'); F.coffee.visible = has('coffee'); F.bath.visible = has('bath');
    F.blanket.material = V.M(has('goodbed') ? '#ffb6c9' : '#8a5cff');
  }

  function buildWorld() {
    const T = V.T, sc = V.scene;
    D3.grass = V.ground(120, 80, '#7cc46a', -0.01);
    // road and sidewalks
    const road = V.tex(128, 64, (c) => { c.fillStyle = '#4a4f57'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#f2f2f2'; c.fillRect(0, 30, 64, 4); }, [16, 1]);
    const r = new T.Mesh(new T.PlaneGeometry(84, 6), new T.MeshStandardMaterial({ map: road, roughness: 0.9 })); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.01, 2); r.receiveShadow = true; sc.add(r);
    for (const z of [-1.5, 5.5]) V.box(84, 0.12, 1, '#c9cdd4', 0, 0.06, z, sc, false);
    V.box(1.6, 0.04, 4, '#c9cdd4', -6.3, 0.02, -4, sc, false); // path to the door
    V.box(1.6, 0.04, 2, '#c9cdd4', 12, 0.02, 7, sc, false);
    // your house
    D3.house = building({ x0: -14, x1: 2, z0: -20, z1: -6, wall: '#f6ead6', floor: '#c99a66', roof: '#b5533c',
      walls: [[-14, 2, -6, 'h', [[-7, -5.6]]], [-14, 2, -20, 'h'], [-20, -6, -14, 'v'], [-20, -6, 2, 'v'], [-14, -6, -13, 'h', [[-11, -9.8]]], [-6, 2, -13, 'h', [[-3, -1.8]]], [-20, -13, -6, 'v']] });
    const tiles = new T.Mesh(new T.PlaneGeometry(8, 7), V.M('#e3e8f0', { roughness: 0.4 })); tiles.rotation.x = -Math.PI / 2; tiles.position.set(-2, 0.03, -16.5); tiles.receiveShadow = true; sc.add(tiles);
    const kt = new T.Mesh(new T.PlaneGeometry(8, 7), V.M('#eadfcf', { roughness: 0.5 })); kt.rotation.x = -Math.PI / 2; kt.position.set(-2, 0.03, -9.5); kt.receiveShadow = true; sc.add(kt);
    V.box(1.4, 2.2, 0.12, '#8b5a33', -6.3, 1.1, -5.9, sc, false).visible = false;
    const mail = V.box(0.35, 0.3, 0.5, '#2f6bff', -3.5, 1, -2.6); V.cyl(0.04, 0.04, 0.9, '#5d6680', -3.5, 0.45, -2.6, sc, 6);
    D3.sign = V.sprite('🏠 Your house', 3.4, 0.8, 'rgba(22,32,61,.75)'); D3.sign.position.set(-6.3, 4.1, -5.6);
    furniture();
    // supermarket
    D3.market = building({ x0: 4, x1: 22, z0: 8, z1: 22, wall: '#e8f1fb', floor: '#e9edf4', roof: '#2f6bff', trim: '#2f6bff', walls: [[4, 22, 8, 'h', [[11, 13]]], [4, 22, 22, 'h'], [8, 22, 4, 'v'], [8, 22, 22, 'v']] });
    const ms = V.sprite('🛒 LSP Market', 4.2, 1, '#2f6bff'); ms.position.set(12, 4.2, 7.6);
    D3.itemSprites = [];
    SHELVES.forEach((row, ri) => {
      const z = 13.5 + ri * 4;
      V.box(12, 1.6, 0.9, '#d9dee8', 13.5, 0.8, z); for (let k = 0; k < 3; k++) V.box(12, 0.05, 0.95, '#ffffff', 13.5, 0.4 + k * 0.5, z, sc, false); addCol(7.5, z - 0.5, 19.5, z + 0.5);
      row.forEach((id, i) => {
        const x = 8.6 + i * 2.45, f = FOODS[id];
        for (let k = 0; k < 6; k++) V.box(0.28, 0.32, 0.22, ['#ff8a3d', '#ffd23f', '#14c79a', '#ff4d8b', '#2f6bff'][(i + k + ri) % 5], x - 0.7 + (k % 3) * 0.35, 0.62 + Math.floor(k / 3) * 0.5, z - 0.3, sc, false);
        const sp = V.sprite(f.icon, 0.7, 0.7); sp.position.set(x, 2.05, z); D3.itemSprites.push(sp);
        obj({ x, z: z - 0.95, r: 1.2, where: 'market', label: () => `${f.icon} ${f.name} — $${f.price}  (E to add)`, use: () => addToCart(id) });
      });
    });
    V.box(2.4, 1, 1, '#14c79a', 6.5, 0.5, 11); addCol(5.3, 10.5, 7.7, 11.5);
    D3.cashier = V.person('#14c79a', '#2d3a5c', '#c68642', '#14c79a'); D3.cashier.position.set(6.5, 0, 12.2); D3.cashier.rotation.y = Math.PI; D3.cashier.scale.setScalar(0.95);
    obj({ x: 6.5, z: 10, r: 1.4, where: 'market', label: () => (cart.length ? `💳 Pay $${cartTotal()} at the till` : '🧑 Cashier: "Grab a basket and shop!"'), use: checkout });
    // park
    V.box(20, 0.04, 14, '#8fd26f', -29, 0.02, 15, sc, false);
    for (const [x, z] of [[-36, 10], [-22, 21], [-33, 20], [-24, 9], [-38, 16]]) V.tree(x, z, 1 + Math.random() * 0.4);
    const pond = V.cyl(3, 3, 0.06, V.M('#5fb6ef', { roughness: 0.1 }), -29, 0.05, 15, sc, 32);
    for (const [x, z, r] of [[-25, 12, 0], [-33, 12, 0]]) { V.box(2, 0.12, 0.6, '#8b6b4a', x, 0.5, z); V.box(2, 0.6, 0.1, '#8b6b4a', x, 0.85, z + 0.3); obj({ x, z: z - 0.8, r: 1.3, label: () => '🪑 Sit on the bench (E)', use: () => activity('bench', 'Relaxing on the bench', 6, { fun: 3, energy: 2 }, { x, z: z - 0.1, face: Math.PI }) }); addCol(x - 1, z - 0.3, x + 1, z + 0.4); }
    const sw = new T.Group(); sw.position.set(-21, 0, 17); sc.add(sw); for (const x of [-1, 1]) V.cyl(0.06, 0.06, 2.6, '#c0392b', x, 1.3, 0, sw, 6); V.cyl(0.05, 0.05, 2.2, '#c0392b', 0, 2.6, 0, sw, 6).rotation.z = Math.PI / 2; D3.swing = V.box(0.7, 0.06, 0.35, '#ffd23f', 0, 0.6, 0, sw);
    obj({ x: -21, z: 16.2, r: 1.3, label: () => '🎠 Swing (E)', use: () => activity('swing', 'Swinging', 6, { fun: 6 }, { x: -21, z: 17, face: Math.PI }) });
    const psign = V.sprite('🌳 Park', 2.2, 0.7, 'rgba(22,32,61,.7)'); psign.position.set(-19, 3, 8.6);
    // neighbours (just to look at)
    for (const [x0, col, roof] of [[6, '#ffe0c7', '#4f7de0'], [-36, '#e2ffd6', '#8a5cff'], [26, '#fff1c9', '#3fb8a8']]) {
      V.box(14, 3, 12, col, x0 + 7, 1.5, -14); const rf = new T.Mesh(new T.ConeGeometry(10.5, 2.4, 4), V.M(roof)); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.86); rf.position.set(x0 + 7, 4.2, -14); rf.castShadow = true; sc.add(rf); addCol(x0, -20, x0 + 14, -8);
    }
    for (let i = 0; i < 14; i++) V.tree(-38 + i * 6 + Math.random() * 2, -24 + Math.random() * 2, 0.9 + Math.random() * 0.4);
    // cars on the street
    D3.cars = [0, 1, 2].map((i) => { const c = new T.Group(); const col = ['#d61f30', '#2f6bff', '#ffd23f'][i]; V.box(3.6, 0.7, 1.7, V.M(col, { metalness: 0.4, roughness: 0.35 }), 0, 0.65, 0, c); V.box(2, 0.6, 1.5, V.M('#22303f', { roughness: 0.1 }), -0.2, 1.25, 0, c); for (const [x, z] of [[1.2, 0.85], [-1.2, 0.85], [1.2, -0.85], [-1.2, -0.85]]) { const w = V.cyl(0.33, 0.33, 0.2, '#17181c', x, 0.33, z, c, 12); w.rotation.x = Math.PI / 2; } sc.add(c); return { g: c, x: -40 + i * 28, lane: i % 2 ? 0.6 : 3.4, dir: i % 2 ? 1 : -1, sp: 7 + i }; });
    // townspeople on the sidewalk
    D3.npcs = [0, 1, 2, 3].map((i) => { const p = V.person(['#ff8a3d', '#8a5cff', '#14c79a', '#ff4d8b'][i], '#3d4a6b', ['#f1c27d', '#c68642', '#8d5524', '#e0ac69'][i]); p.scale.setScalar(0.95); return { g: p, x: -30 + i * 18, z: i % 2 ? -1.5 : 5.5, dir: i % 2 ? 1 : -1 }; });
    // home objects
    const home = 'house';
    obj({ x: -12.2, z: -15.8, r: 1.8, where: home, label: () => '🛏️ Sleep (E)', use: () => activity('sleep', 'Sleeping… zzz', 99, { energy: has('goodbed') ? 18 : 12 }, { x: -12.2, z: -17.4, face: 0, lie: true }) });
    obj({ x: 1, z: -18.2, r: 1.3, where: home, label: () => '🚿 Take a shower (E)', use: () => activity('shower', 'Showering', 5, { hygiene: 22 }, { x: 1, z: -19, face: 0 }) });
    obj({ x: -1.2, z: -18.6, r: 1.1, where: home, label: () => '🚽 Use the toilet (E)', use: () => activity('toilet', 'Using the toilet', 3, { hygiene: 4 }, { x: -1.2, z: -19.3, face: 0, sit: true }) });
    obj({ x: -4.4, z: -18.9, r: 1.1, where: home, label: () => '🧼 Wash your hands (E)', use: () => activity('wash', 'Washing hands', 2, { hygiene: 6 }, null) });
    obj({ x: -2.6, z: -15.6, r: 1.4, where: home, need: 'bath', label: () => '🛁 Have a bath (E)', use: () => activity('bath', 'Relaxing in the bath', 7, { hygiene: 16, fun: 5 }, { x: -2.6, z: -16.6, face: Math.PI / 2, lie: true }) });
    obj({ x: -10.5, z: -9.2, r: 1.6, where: home, label: () => `📺 Watch TV (E)`, use: () => activity('tv', 'Watching TV', 99, { fun: has('bigtv') ? 9 : 5, energy: 0.5 }, { x: -10.5, z: -8.2, face: Math.PI, sit: true }) });
    obj({ x: -9.6, z: -11.6, r: 1.1, where: home, need: 'console', label: () => '🎮 Play video games (E)', use: () => activity('console', 'Gaming', 99, { fun: 12, energy: -1 }, { x: -10, z: -8.2, face: Math.PI, sit: true }) });
    obj({ x: -12.9, z: -10.5, r: 1.2, where: home, need: 'shelf', label: () => '📚 Read a book (E)', use: () => activity('read', 'Reading', 99, { fun: 6 }, null) });
    obj({ x: -7, z: -7.4, r: 1.2, where: home, need: 'aquarium', label: () => '🐠 Watch the fish (E)', use: () => activity('fish', 'Watching the fish', 8, { fun: 4, energy: 1 }, null) });
    obj({ x: 1.3, z: -11.6, r: 1.3, where: home, label: () => `🧊 Open the fridge (E)`, use: openFridge });
    obj({ x: -1, z: -11.7, r: 1.2, where: home, label: () => '🍳 Cook a meal (E)', use: openStove });
    obj({ x: -4.8, z: -11.8, r: 1, where: home, need: 'coffee', label: () => '☕ Make coffee (E)', use: () => activity('coffee', 'Making coffee', 3, { energy: 9 }, null) });
    obj({ x: -7.4, z: -14.5, r: 1.3, where: home, label: () => '💻 Use your laptop (E)', use: () => { stopActivity(); place({ x: -7.4, z: -14.6, face: Math.PI, sit: true }); openLaptop('jobs'); } });
    obj({ x: -3.5, z: -2.0, r: 1.2, label: () => '📬 Check the mail (E)', use: checkMail });
    V.camera.fov = 50; V.camera.updateProjectionMatrix(); V.follow = new T.Vector3();
    D3.hemi = sc.children.find((o) => o.isHemisphereLight); D3.bg = sc.background; D3.night = new T.Color('#0c1630');
  }
  V.onReady((V) => { buildWorld(); P = { x: -6.3, z: -7.5, h: Math.PI, vx: 0, vz: 0, walk: 0, m: V.person('#2f6bff', '#2d3a5c', '#f1c27d') }; });

  /* ================= game state ================= */
  let act = null, cart = [], ui = null, mailT = 0, tick = 0, lastHour = -1;
  const cartTotal = () => cart.reduce((a, id) => a + FOODS[id].price, 0);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fmt$ = (n) => '$' + Math.floor(n).toLocaleString();
  const hour = () => Math.floor(S.time / 60), clock = () => { const h = hour(), m = Math.floor(S.time % 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  function say(msg, ms) { toast(msg, ms || 2600); }
  function inside(b, x, z) { return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1; }

  function start() {
    S = DB.load(); cart = []; act = null; closeUi();
    A.play(); V.init(); A.run(step); hud();
    if (!S.welcomed) { S.welcomed = true; save(); setTimeout(() => say('Welcome home! Walk with WASD, press E to use things. Your laptop is in the bedroom.', 5000), 800); }
  }
  A.onAgain = start;
  A.onLeave = A.onQuit = () => { if (S) save(); stopActivity(); closeUi(); };

  /* ---------- needs ---------- */
  const NEEDS = [['hunger', '🍔', '#ff8a3d'], ['energy', '⚡', '#8a5cff'], ['hygiene', '🫧', '#4fb6f0'], ['fun', '🎉', '#14c79a']];
  function addNeeds(d, k = 1) { for (const n in d) if (S.needs[n] != null) S.needs[n] = clamp(S.needs[n] + d[n] * k, 0, 100); }
  function mood() { const n = S.needs; return (n.hunger + n.energy + n.hygiene + n.fun) / 4; }

  /* ---------- activities ---------- */
  function place(spot) { if (!spot || !P) return; P.x = spot.x; P.z = spot.z; P.h = spot.face; P.pose = spot.lie ? 'lie' : spot.sit ? 'sit' : null; }
  function activity(id, text, secs, gain, spot) {
    stopActivity(); act = { id, text, t: 0, secs, gain, spot }; place(spot);
    $('#lf-act').hidden = false; $('#lf-act-t').textContent = text; LSPG.sfx && LSPG.sfx('click');
  }
  function stopActivity() { if (!act) return; act = null; if (P) P.pose = null; $('#lf-act').hidden = true; if (D3.furn) D3.furn.tvScreen.material = V.M('#0b0d12'); }
  $('#lf-act-x').onclick = stopActivity;

  /* ---------- shopping, cooking, eating ---------- */
  function addToCart(id) {
    if (!marketOpen()) return say('The market is closed. It opens at 8 AM.');
    if (cart.length >= 12) return say('Your basket is full. Pay at the till first.');
    cart.push(id); LSPG.sfx && LSPG.sfx('pop'); say(`${FOODS[id].icon} ${FOODS[id].name} in your basket. Total ${fmt$(cartTotal())}`, 1800); hud();
  }
  const marketOpen = () => hour() >= 8 && hour() < 22;
  function checkout() {
    if (!cart.length) return say('Pick food from the shelves first.');
    const total = cartTotal(); if (S.cash < total) return say(`Not enough money. You need ${fmt$(total)} but have ${fmt$(S.cash)}. Work on your laptop!`);
    S.cash -= total; for (const id of cart) S.pantry[id] = (S.pantry[id] || 0) + 1;
    say(`Paid ${fmt$(total)}. ${cart.length} items are waiting in your fridge at home.`, 3200); cart = []; LSPG.sfx && LSPG.sfx('cash'); save(); hud();
  }
  function openFridge() {
    stopActivity();
    const list = Object.keys(FOODS).filter((id) => S.pantry[id] > 0);
    openUi(`<div class="lf-top"><h3>🧊 Fridge</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body">${list.length ? list.map((id) => { const f = FOODS[id]; return `<div class="lf-food"><span>${f.icon} ${f.name} ×${S.pantry[id]}</span>${f.ingredient ? '<small class="muted">for cooking</small>' : `<button class="btn primary" data-eat="${id}" style="height:38px;font-size:14px">Eat</button>`}</div>`; }).join('') : '<p class="muted">Your fridge is empty. Go to the LSP Market across the street!</p>'}</div>`);
    $$('[data-eat]').forEach((b) => (b.onclick = () => { const id = b.dataset.eat, f = FOODS[id]; S.pantry[id]--; closeUi(); activity('eat', `Eating ${f.name.toLowerCase()}`, 3, { hunger: f.fill / 3, energy: (f.energy || 0) / 3, fun: (f.fun || 0) / 3 }, null); LSPG.sfx && LSPG.sfx('eat'); save(); }));
  }
  function openStove() {
    stopActivity();
    openUi(`<div class="lf-top"><h3>🍳 Cook</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body"><div class="lf-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${RECIPES.map((r) => {
      const ok = Object.entries(r.need).every(([k, n]) => (S.pantry[k] || 0) >= n);
      return `<div class="lf-card"><span class="ic">${r.icon}</span><b>${r.name}</b><p>Needs ${Object.keys(r.need).map((k) => FOODS[k].icon + ' ' + FOODS[k].name).join(' + ')}. Very filling.</p><button class="btn ${ok ? 'primary' : 'ghost'}" data-cook="${r.id}" ${ok ? '' : 'disabled'}>${ok ? 'Cook' : 'Missing food'}</button></div>`; }).join('')}</div></div>`);
    $$('[data-cook]').forEach((b) => (b.onclick = () => { const r = RECIPES.find((x) => x.id === b.dataset.cook); for (const [k, n] of Object.entries(r.need)) S.pantry[k] -= n; closeUi(); save(); activity('cook', `Cooking ${r.name.toLowerCase()}`, 5, { hunger: r.fill / 5, fun: r.fun / 5 }, { x: -1, z: -11.7, face: Math.PI }); }));
  }
  function checkMail() {
    const now = Date.now();
    if (now - (S.mailAt || 0) < 10 * 60 * 1000) return say('No new mail. Check again later.');
    S.mailAt = now; const gift = 20 + Math.floor(Math.random() * 30); S.cash += gift; save(); hud(); LSPG.sfx && LSPG.sfx('cash');
    say(`📬 A letter from Grandma with ${fmt$(gift)} inside!`, 3200);
  }

  /* ---------- the laptop: jobs, shop, bank ---------- */
  let shift = null;
  function openLaptop(tab) {
    const appsBar = `<div class="lf-apps">${[['jobs', '💼 Jobs'], ['shop', '🛋️ Home shop'], ['bank', '🏦 Bank']].map(([id, l]) => `<button data-app="${id}" class="${tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'jobs') body = `<p style="opacity:.75;margin:0 0 10px">Work a 60 second shift. Better work, a pro laptop and a good mood all pay more. Every shift also earns ⭐ LSP points.</p><div class="lf-grid">${JOBS.map((j) => { const lv = 1 + Math.floor((S.jobs[j.id] || 0) / 5); return `<div class="lf-card"><span class="ic">${j.icon}</span><b>${j.name}</b><p>${j.desc}</p><p>Level ${lv} · ${S.jobs[j.id] || 0} tasks done</p><button class="btn primary" data-job="${j.id}">Start shift</button></div>`; }).join('')}</div>`;
    else if (tab === 'shop') body = `<div class="lf-grid">${FURNI.map((f) => `<div class="lf-card"><span class="ic">${f.icon}</span><b>${f.name}</b><p>${f.desc}</p><button class="btn ${has(f.id) ? 'ghost' : 'gold'}" data-buy="${f.id}" ${has(f.id) || S.cash < f.price ? 'disabled' : ''}>${has(f.id) ? 'In your house' : 'Buy ' + fmt$(f.price)}</button></div>`).join('')}</div>`;
    else body = `<div class="lf-card" style="max-width:420px"><span class="ic">🏦</span><b>Balance: ${fmt$(S.cash)}</b><p>Total earned from jobs: ${fmt$(S.earned)} in ${S.shifts} shifts.</p><p>Swap money for LSP points: $50 → ⭐ 10.</p><button class="btn gold" data-swap="1" ${S.cash < 50 ? 'disabled' : ''}>Swap $50 for ⭐ 10</button></div>`;
    openUi(`<div class="lf-top"><h3>💻 LSP OS</h3><span class="pill" style="background:#2f3850;color:#fff;border:0">${fmt$(S.cash)}</span><button class="x" data-ui="close">✕</button></div><div class="lf-body">${appsBar}<div style="margin-top:12px">${body}</div></div>`, true);
    $$('[data-app]').forEach((b) => (b.onclick = () => openLaptop(b.dataset.app)));
    $$('[data-job]').forEach((b) => (b.onclick = () => startShift(b.dataset.job)));
    $$('[data-buy]').forEach((b) => (b.onclick = () => { const f = FURNI.find((x) => x.id === b.dataset.buy); if (S.cash < f.price) return; S.cash -= f.price; S.owned.push(f.id); save(); applyFurniture(); hud(); LSPG.sfx && LSPG.sfx('cash'); say(`${f.icon} ${f.name} delivered to your house!`); openLaptop('shop'); }));
    $$('[data-swap]').forEach((b) => (b.onclick = () => { if (S.cash < 50) return; S.cash -= 50; Wallet.add(10); save(); hud(); refreshPoints(); LSPG.sfx && LSPG.sfx('coin'); openLaptop('bank'); }));
  }
  function startShift(id) {
    if (S.needs.hunger < 8) return say('You are too hungry to work. Eat something first!');
    if (S.needs.energy < 8) return say('You are too tired to work. Get some sleep!');
    shift = { id, t: 60, pay: 0, done: 0, good: 0, task: null }; nextTask(); tickShift();
  }
  const payMult = () => (has('pc') ? 1.25 : 1) * (mood() >= 60 ? 1.2 : mood() < 30 ? 0.8 : 1) * (1 + 0.1 * Math.floor((S.jobs[shift.id] || 0) / 5));
  function nextTask() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (shift.id === 'type') shift.task = { s: pick(SENTENCES) };
    else if (shift.id === 'code') shift.task = pick(CODE);
    else shift.task = pick(SUPPORT);
    renderShift();
  }
  function renderShift() {
    const s = shift, j = JOBS.find((x) => x.id === s.id); let body = '';
    if (s.id === 'type') body = `<div class="lf-task"><div class="q">Type this exactly:</div><div class="lf-type" id="lf-target">${s.task.s}</div><input class="lf-in" id="lf-typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Start typing… press Enter when done"></div>`;
    else if (s.id === 'code') body = `<div class="lf-task"><div class="q">What does this code print?</div><pre>${s.task.c.replace(/</g, '&lt;')}</pre><div class="lf-opts">${s.task.o.map((o, i) => `<button data-opt="${i}">${o}</button>`).join('')}</div></div>`;
    else body = `<div class="lf-task"><div class="q">💬 Customer: "${s.task.q}"</div><div class="lf-opts">${s.task.o.map((o, i) => `<button data-opt="${i}">${o}</button>`).join('')}</div></div>`;
    openUi(`<div class="lf-top"><h3>${j.icon} ${j.name} shift</h3><button class="x" data-ui="endshift" title="End shift">✕</button></div><div class="lf-body">${body}<div class="lf-shift"><span>⏱️ <span id="lf-st">${Math.ceil(s.t)}</span>s left</span><span>Earned ${fmt$(s.pay)}</span><span>${s.good}/${s.done} good</span></div></div>`, true);
    if (s.id === 'type') {
      const inp = $('#lf-typed'), tgt = s.task.s; setTimeout(() => inp.focus(), 30);
      inp.oninput = () => { const v = inp.value; $('#lf-target').innerHTML = tgt.split('').map((ch, i) => i < v.length ? `<span class="${v[i] === ch ? 'ok' : 'no'}">${ch}</span>` : ch).join(''); };
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { const v = inp.value; let ok = 0; for (let i = 0; i < tgt.length; i++) if (v[i] === tgt[i]) ok++; const acc = ok / tgt.length; const pay = Math.round(ok * 0.2 * acc * payMult()); s.pay += pay; s.done++; if (acc > 0.9) s.good++; LSPG.sfx && LSPG.sfx(acc > 0.9 ? 'ding' : 'click'); nextTask(); } };
    } else $$('[data-opt]').forEach((b) => (b.onclick = () => {
      const right = +b.dataset.opt === s.task.a; s.done++; if (right) { s.good++; s.pay += Math.round((s.id === 'code' ? 12 : 9) * payMult()); }
      b.classList.add(right ? 'good' : 'bad'); if (!right) $$('[data-opt]')[s.task.a].classList.add('good'); LSPG.sfx && LSPG.sfx(right ? 'ding' : 'hurt', { volume: 0.5 });
      $$('[data-opt]').forEach((x) => (x.disabled = true)); setTimeout(() => shift && nextTask(), 700);
    }));
  }
  function tickShift() { if (!shift) return; const e = $('#lf-st'); if (e) e.textContent = Math.ceil(shift.t); }
  function endShift() {
    const s = shift; if (!s) return; shift = null;
    S.cash += s.pay; S.earned += s.pay; S.shifts++; S.jobs[s.id] = (S.jobs[s.id] || 0) + s.good; addNeeds({ energy: -12, hunger: -8, fun: -4 });
    const pts = s.pay > 0 ? Wallet.add(Math.max(1, Math.round(s.pay / 4))) : 0; save(); hud(); refreshPoints(); LSPG.sfx && LSPG.sfx(s.pay ? 'cash' : 'lose');
    openUi(`<div class="lf-top"><h3>Shift over</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="text-align:center"><p class="big" style="font-family:Fredoka,system-ui,sans-serif;font-size:40px;font-weight:700;color:#14c79a;margin:6px 0">${fmt$(s.pay)}</p><p>${s.good} of ${s.done} tasks done well · ⭐ +${pts}</p><div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button class="btn primary" data-app2="jobs">Another shift</button><button class="btn ghost" data-ui="close">Done</button></div></div>`, true);
    $$('[data-app2]').forEach((b) => (b.onclick = () => openLaptop('jobs')));
  }

  /* ---------- pop-up windows ---------- */
  function openUi(html, laptop) {
    ui = true; const w = $('#lf-win'); w.className = 'lf-win' + (laptop ? ' laptop' : ''); w.innerHTML = html; $('#lf-ui').hidden = false;
    w.querySelectorAll('[data-ui]').forEach((b) => (b.onclick = () => (b.dataset.ui === 'endshift' ? endShift() : closeUi())));
    for (const k in A.keys) A.keys[k] = false;
  }
  function closeUi() { ui = null; const u = $('#lf-ui'); if (u) u.hidden = true; if (P && P.pose === 'sit' && !act) P.pose = null; }
  $('#lf-ui').addEventListener('pointerdown', (e) => { if (e.target.id === 'lf-ui' && !shift) closeUi(); });

  /* ---------- input ---------- */
  A.onKey = (k) => {
    if (ui) { if (k === 'Escape' && !shift) closeUi(); return; }
    if (k === 'KeyE' || k === 'Enter') useNear();
  };
  let actHeld = false;
  function nearest() {
    if (!P) return null; let best = null, bd = 1e9;
    for (const o of OBJ) { if (o.need && !has(o.need)) continue; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < o.r && d < bd) { bd = d; best = o; } }
    return best;
  }
  function useNear() { const o = nearest(); if (o) { if (act && act.id === 'sleep' && o.label().startsWith('🛏')) return stopActivity(); o.use(); } }

  /* ---------- simulation ---------- */
  function step(dt) {
    if (!V.ready || !P) { drawLoading(); return; }
    if (dt > 0 && !A.over) update(dt);
    draw3(dt);
  }
  function update(dt) {
    const sleeping = act && act.id === 'sleep';
    const speedUp = sleeping ? 15 : 1;
    S.time += dt * MIN_PER_SEC * speedUp;
    if (S.time >= DAY_MIN) { S.time -= DAY_MIN; S.day++; save(); say(`☀️ Day ${S.day} begins!`); }
    // needs drift (sleeping slows hunger)
    addNeeds({ hunger: -0.11 * (sleeping ? 0.3 : 1), energy: sleeping ? 0 : -0.06, hygiene: -0.045 * (sleeping ? 0.3 : 1), fun: -0.07 * (sleeping ? 0.2 : 1) }, dt * speedUp * (sleeping ? 0.15 : 1));
    if (shift) { shift.t -= dt; tickShift(); if (shift.t <= 0) endShift(); }
    if (act) {
      act.t += dt; addNeeds(act.gain, dt);
      $('#lf-act-b').style.width = (act.secs < 90 ? Math.min(1, act.t / act.secs) : (act.id === 'sleep' ? S.needs.energy / 100 : (S.needs.fun) / 100)) * 100 + '%';
      if (act.id === 'sleep' && (S.needs.energy >= 100 || (hour() === 7 && S.needs.energy > 60))) { stopActivity(); say('😊 Good morning! You feel rested.'); }
      else if (act.secs < 90 && act.t >= act.secs) stopActivity();
      else if (act.id === 'tv' || act.id === 'console') { if (D3.furn) D3.furn.tvScreen.material = V.M('#5fb6ef', { emissive: ['#2f6bff', '#ff4d8b', '#14c79a'][Math.floor(act.t) % 3], emissiveIntensity: 1.2 }); if (S.needs.fun >= 100) stopActivity(); }
      else if (act.id === 'read' && S.needs.fun >= 100) stopActivity();
    }
    // walking
    const k = A.keys, t = A.tin;
    let mx = (k.KeyD || k.ArrowRight || t.right ? 1 : 0) - (k.KeyA || k.ArrowLeft || t.left ? 1 : 0), mz = (k.KeyS || k.ArrowDown || t.down ? 1 : 0) - (k.KeyW || k.ArrowUp || t.up ? 1 : 0);
    if (ui) mx = mz = 0;
    if ((mx || mz) && act && act.id !== 'eat') stopActivity();
    const len = Math.hypot(mx, mz); if (len) { mx /= len; mz /= len; }
    const tired = S.needs.energy < 10 ? 0.6 : 1, sp = (k.ShiftLeft || k.ShiftRight ? 7 : 4.2) * tired;
    P.vx += (mx * sp - P.vx) * Math.min(1, dt * 12); P.vz += (mz * sp - P.vz) * Math.min(1, dt * 12);
    if (len) { P.h = Math.atan2(mx, mz); P.pose = null; }
    P.x += P.vx * dt; P.z += P.vz * dt; collide(P, 0.35);
    P.walk += Math.hypot(P.vx, P.vz) * dt * 2.4;
    if (t.act && !actHeld) useNear(); actHeld = !!t.act;
    // cars stop for you on the road
    for (const c of D3.cars) { const ahead = (P.x - c.x) * c.dir, onLane = Math.abs(P.z - c.lane) < 1.6; const stop = onLane && ahead > 0 && ahead < 6; c.v = stop ? 0 : c.sp; c.x += c.dir * c.v * dt; if (c.x > 44) c.x = -44; if (c.x < -44) c.x = 44; }
    for (const n of D3.npcs) { n.x += n.dir * 1.3 * dt; if (n.x > 40 || n.x < -40) n.dir *= -1; }
    // little reminders
    tick -= dt; if (tick <= 0) { tick = 1; hud(); const low = NEEDS.find(([n]) => S.needs[n] < 15); if (low && Math.floor(S.time) % 120 < 2) say({ hunger: '🍔 You are hungry. Check the fridge!', energy: '⚡ You are tired. Time for bed?', hygiene: '🫧 You need a shower.', fun: '🎉 You are bored. Do something fun!' }[low[0]]); }
    mailT += dt; if (mailT > 20) { mailT = 0; save(); }
  }
  function collide(o, r) {
    for (const b of COL) {
      const px = clamp(o.x, b.x0, b.x1), pz = clamp(o.z, b.z0, b.z1), dx = o.x - px, dz = o.z - pz, d = Math.hypot(dx, dz);
      if (d < r) { if (d > 1e-6) { o.x = px + (dx / d) * r; o.z = pz + (dz / d) * r; } else o.z = b.z1 + r; }
    }
    o.x = clamp(o.x, W.x0, W.x1); o.z = clamp(o.z, W.z0, W.z1);
  }

  /* ---------- drawing ---------- */
  function drawLoading() { const v = A.view; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#9fd0f5'; g.fillRect(0, 0, v.w, v.h); g.fillStyle = '#16203d'; g.font = `700 ${22 * v.d}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('Loading your neighbourhood…', v.w / 2, v.h / 2); }
  let camX = null, camZ = null;
  function draw3(dt) {
    const T = V.T, m = P.m, now = performance.now() / 1000;
    m.position.set(P.x, P.pose === 'sit' ? 0.12 : 0, P.z); m.rotation.set(P.pose === 'lie' ? -Math.PI / 2 : 0, P.h, 0);
    if (P.pose === 'lie') m.position.y = 0.62;
    const u = m.userData;
    if (P.pose === 'sit') { u.legs[0].rotation.x = u.legs[1].rotation.x = -1.4; u.arms[0].rotation.x = u.arms[1].rotation.x = act && (act.id === 'console') ? -1.2 : -0.3; m.position.y = 0.05; }
    else if (P.pose === 'lie') { V.walk(m, 0, 0); }
    else V.walk(m, P.walk, Math.min(1, Math.hypot(P.vx, P.vz) / 3));
    if (act && (act.id === 'eat' || act.id === 'cook' || act.id === 'coffee' || act.id === 'wash')) u.arms[1].rotation.x = -1.2 + Math.sin(now * 10) * 0.4;
    if (act && act.id === 'shower' && Math.random() < 0.5) V.puff(P.x + (Math.random() - 0.5) * 0.6, 2.1, P.z + (Math.random() - 0.5) * 0.6, '#bfe8ff', 0.15, 0.5, 0, -4, 0, 0, 0.8);
    if (act && act.id === 'sleep' && Math.random() < 0.03) V.puff(P.x, 1.6, P.z, '#ffffff', 0.4, 1.5, 0.2, 0.6, 0, 0.3, 0.7);
    if (D3.swing) D3.swing.position.z = act && act.id === 'swing' ? Math.sin(now * 3) * 0.6 : 0;
    if (act && act.id === 'swing') { P.z = 17 + Math.sin(now * 3) * 0.6; }
    for (const c of D3.cars) { c.g.position.set(c.x, 0, c.lane); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; }
    for (const n of D3.npcs) { n.g.position.set(n.x, 0, n.z); n.g.rotation.y = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2; V.walk(n.g, now * 7 + n.x, 1); }
    if (D3.furn && D3.furn.fish) D3.furn.fish.forEach((f, i) => (f.position.x = Math.sin(now * (0.6 + i * 0.3) + i) * 0.5));
    // cutaway walls when inside, like Bloxburg
    D3.sign.visible = !inside(BUILD[0], P.x, P.z);
    for (const b of BUILD) { const inn = inside(b, P.x, P.z); b.walls.scale.y += ((inn ? 0.12 : 1) - b.walls.scale.y) * Math.min(1, dt * 8); b.roof.visible = !inn; }
    // day and night
    const h = S.time / 60, day = clamp(Math.sin(((h - 6) / 24) * Math.PI * 2) * 1.6 + 0.35, 0, 1);
    V.sun.intensity = 0.25 + 1.9 * day; if (D3.hemi) D3.hemi.intensity = 0.3 + 0.75 * day;
    V.scene.background = day < 0.25 ? D3.night : D3.bg; if (V.scene.fog) V.scene.fog.color.set(day < 0.25 ? '#0c1630' : '#cfe7f8');
    D3.lights.forEach((l) => (l.intensity = day < 0.5 ? 6 : 0));
    V.sun.position.set(P.x + 12 * Math.cos(h / 24 * 6.28), 24, P.z + 14);
    // camera: north-up, behind and above
    if (camX == null) { camX = P.x; camZ = P.z; }
    camX += (P.x - camX) * Math.min(1, dt * 6); camZ += (P.z - camZ) * Math.min(1, dt * 6);
    const insideAny = BUILD.some((b) => inside(b, P.x, P.z)), dist = insideAny ? 9 : 11;
    V.camera.position.set(camX, dist, camZ + dist * 0.8); V.camera.lookAt(camX, 0.6, camZ - 0.4); V.follow.set(P.x, 0, P.z);
    V.frame();
    // labels
    const o = nearest();
    $('#lf-prompt').textContent = ui ? '' : o ? (L.isTouch() ? o.label().replace('(E)', '(USE)').replace('E to', 'USE to') : o.label()) : '';
    if (cart.length && BUILD[1] && inside(BUILD[1], P.x, P.z)) V.label(P.x, 2.3, P.z, `🛒 ${cart.map((id) => FOODS[id].icon).join('')}`, { size: 16, bg: '#ffffff' });
    if (act && act.id === 'sleep') V.label(P.x, 1.6, P.z, 'Z z z', { size: 22, color: '#ffffff', stroke: 'rgba(0,0,0,.4)' });
  }
  function hud() {
    if (!S) return;
    $('#lf-cash').textContent = fmt$(S.cash); $('#lf-clock').textContent = `${hour() >= 6 && hour() < 19 ? '☀️' : '🌙'} Day ${S.day} ${clock()}`;
    const c = $('#lf-cart'); c.hidden = !cart.length; c.textContent = `🛒 ${cart.length} · ${fmt$(cartTotal())}`;
    $('#lf-needs').innerHTML = NEEDS.map(([n, ic, col]) => { const v = S.needs[n]; return `<div class="lf-need"><span>${ic}</span><div class="bar"><i style="width:${v}%;background:${v < 20 ? '#ff4d5e' : col}"></i></div></div>`; }).join('');
  }

  window.LSPLife = { _tp(x, z) { if (P) { P.x = x; P.z = z; } }, _use: () => useNear(), _S: () => S };

  /* ---------- lobby ---------- */
  A.onTab = () => {
    S = DB.load();
    A.panel('play').innerHTML = `${L.playCard('🏡', 'Your life in LSP Town', 'Walk around your house and press E to use things: sleep, shower, cook, watch TV. Shop for food at the LSP Market across the street. Work real jobs on your laptop (typing, coding, customer support) to earn money, then buy furniture and turn money into ⭐ points.', [`💵 ${fmt$(S.cash)}`, `📅 Day ${S.day}`, `🛋️ ${S.owned.length} furniture`, `💼 ${S.shifts} shifts`], 'lf-go', S.shifts || S.day > 1 ? 'Go home' : 'Move in')}`;
    $('#lf-go').onclick = start;
  };
})();
