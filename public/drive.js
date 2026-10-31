/* LSP Drive: open-city driving RPG in 3D.
 *
 * Walk up to your ride, get in, and drive a whole city: delivery jobs, street
 * races, an off-road park with jumps, and the Red Vipers gang who chase you
 * when you carry risky packages. Lose them by breaking their line of sight or
 * by hiding in a hideout. Points buy new cars and bikes, upgrades and paint.
 *
 * Three.js is loaded only when the player opens the game, so the hub stays fast.
 * Uses the globals from index.html: $, $$, show, toast, Wallet, profile, enterHub, refreshPoints, LSPG.
 */
(function () {
  'use strict';

  /* ================= data ================= */
  const VEH = [
    { id: 'hatch', name: 'City Hatch', icon: '🚗', type: 'car', cost: 0, top: 30, acc: 7, grip: 11, turn: 1, hp: 100, mass: 1, color: '#2f6bff', desc: 'Small and easy to drive. Perfect for learning the city.', body: { L: 3.7, W: 1.75, H: 0.62, clr: 0.3, cabL: 2.0, cabH: 0.64, cabZ: -0.25, wr: 0.33, ww: 0.24 } },
    { id: 'sedan', name: 'Cruiser Sedan', icon: '🚘', type: 'car', cost: 2500, top: 36, acc: 8, grip: 11.5, turn: 1, hp: 125, mass: 1.15, color: '#d9dce3', desc: 'Comfortable, tougher and quicker on the straights.', body: { L: 4.6, W: 1.85, H: 0.62, clr: 0.3, cabL: 2.35, cabH: 0.6, cabZ: -0.2, wr: 0.34, ww: 0.25 } },
    { id: 'sports', name: 'Viper GT', icon: '🏎️', type: 'car', cost: 8000, top: 46, acc: 11, grip: 13, turn: 1.08, hp: 110, mass: 1, color: '#e3263a', desc: 'Low, fast and sharp in the corners.', body: { L: 4.4, W: 1.95, H: 0.5, clr: 0.2, cabL: 1.95, cabH: 0.5, cabZ: -0.35, wr: 0.35, ww: 0.3, spoiler: true } },
    { id: 'super', name: 'Hyper S', icon: '🚀', type: 'car', cost: 20000, top: 58, acc: 14, grip: 14, turn: 1.12, hp: 115, mass: 1.05, color: '#ffb31a', desc: 'The fastest car in the city. Handle with care.', body: { L: 4.6, W: 2.0, H: 0.45, clr: 0.17, cabL: 1.75, cabH: 0.45, cabZ: -0.25, wr: 0.36, ww: 0.32, spoiler: true } },
    { id: 'jeep', name: 'Trail Jeep', icon: '🚙', type: 'car', off: true, cost: 6000, top: 33, acc: 8.5, grip: 11, turn: 0.95, hp: 175, mass: 1.45, color: '#4f7a3a', desc: 'Built for dirt and jumps, and very hard to wreck.', body: { L: 4.1, W: 1.95, H: 0.8, clr: 0.6, cabL: 2.3, cabH: 0.78, cabZ: -0.3, wr: 0.48, ww: 0.34, spare: true, rack: true } },
    { id: 'scooter', name: 'Scooty', icon: '🛵', type: 'bike', cost: 1500, top: 24, acc: 7, grip: 11, turn: 1.15, hp: 60, mass: 0.5, color: '#14c79a', desc: 'Cheap and nimble. Squeeze through traffic.', body: { L: 1.8, wr: 0.26, ww: 0.12, scoot: true } },
    { id: 'street', name: 'Street 350', icon: '🏍️', type: 'bike', cost: 5000, top: 40, acc: 11, grip: 12, turn: 1.15, hp: 70, mass: 0.55, color: '#23283a', desc: 'A proper motorbike with real pull.', body: { L: 2.1, wr: 0.33, ww: 0.14 } },
    { id: 'superbike', name: 'Ninja R', icon: '🏍️', type: 'bike', cost: 15000, top: 60, acc: 15, grip: 13, turn: 1.2, hp: 70, mass: 0.55, color: '#7a3cff', desc: 'Superbike. Nothing in the city is quicker off the line.', body: { L: 2.1, wr: 0.33, ww: 0.17, fair: true } },
    { id: 'dirt', name: 'Dirt Rider', icon: '🏍️', type: 'bike', off: true, cost: 4000, top: 36, acc: 11, grip: 11.5, turn: 1.2, hp: 80, mass: 0.5, color: '#ff8a3d', desc: 'Light off-road bike that flies over the jumps.', body: { L: 2.0, wr: 0.36, ww: 0.14, high: true } },
  ];
  const UPG = [
    { id: 'engine', name: 'Engine', icon: '⚙️', desc: '+7% top speed per level' },
    { id: 'turbo', name: 'Turbo', icon: '💨', desc: '+10% acceleration per level' },
    { id: 'tires', name: 'Tires', icon: '🛞', desc: 'More grip and sharper steering' },
    { id: 'armor', name: 'Armor', icon: '🛡️', desc: '+12% toughness and less damage per hit' },
    { id: 'nitro', name: 'Nitro', icon: '🔥', desc: 'Bigger nitro tank that refills faster' },
  ];
  const UCOST = [300, 650, 1100, 1800, 2800], UMAX = 5;
  const PAINTS = [
    { id: 'factory', name: 'Factory colour', color: null, cost: 0 },
    { id: 'white', name: 'Pearl white', color: '#f2f3f5', cost: 200 },
    { id: 'black', name: 'Midnight black', color: '#15171c', cost: 200 },
    { id: 'red', name: 'Racing red', color: '#d61f30', cost: 300 },
    { id: 'blue', name: 'Ocean blue', color: '#1f5fd6', cost: 300 },
    { id: 'green', name: 'Lime', color: '#7ad61f', cost: 400 },
    { id: 'orange', name: 'Sunset orange', color: '#ff7a1a', cost: 400 },
    { id: 'pink', name: 'Hot pink', color: '#ff4fa3', cost: 500 },
    { id: 'purple', name: 'Royal purple', color: '#6a2fd6', cost: 500 },
    { id: 'gold', name: 'Gold', color: '#d4a21a', cost: 1500 },
  ];
  const JOBS = [
    { name: 'Parcel run', heat: 0, base: 60, color: '#ffd23f', icon: '📦', note: 'An easy delivery.' },
    { name: 'Hot delivery', heat: 1, base: 130, color: '#ff9f1c', icon: '🎒', note: 'One Red Viper car will chase you.' },
    { name: 'Risky package', heat: 2, base: 230, color: '#ff4d5e', icon: '💼', note: 'Two Red Viper cars will chase you.' },
  ];
  const GANG = 'Red Vipers';

  /* ================= city layout ================= */
  const CELL = 72, ROAD = 14, HALF = ROAD / 2, NB = 6, R0 = -216, LANE = 3.5;
  const RX = (i) => R0 + i * CELL;
  const PARK_X0 = 223;
  const BOUND = { x0: -236, x1: 332, z0: -236, z1: 236 };
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrapA = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ord = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const lotC = (bx, bz, lx, lz) => [RX(bx) + HALF + 14.5 + lx * 29, RX(bz) + HALF + 14.5 + lz * 29];
  const PARKS = ['3,0', '0,4'];
  const HIDEOUTS = [[2, 4], [4, 1], [0, 2]].map(([a, b]) => { const [x, z] = lotC(a, b, 0, 0); return { x, z }; });
  const GARAGE = (() => { const [x, z] = lotC(1, 1, 0, 0); return { x, z }; })();
  const TURF = { x0: RX(4) + 5, x1: RX(6) - 5, z0: RX(2) + 5, z1: RX(3) - 5 };
  const inTurf = (x, z) => x > TURF.x0 && x < TURF.x1 && z > TURF.z0 && z < TURF.z1;
  const RAMPS = [
    { x: 238, z: 46, dx: 0, dz: -1, len: 11, w: 9, h: 2.4 },
    { x: 238, z: -76, dx: 0, dz: -1, len: 11, w: 9, h: 2.8 },
    { x: 309, z: -100, dx: 0.177, dz: 0.984, len: 10, w: 9, h: 2.2 },
    { x: 281, z: 42, dx: 0.484, dz: 0.875, len: 10, w: 9, h: 2.4 },
  ];
  function ground(x, z) {
    if (x < PARK_X0 + 3) return 0;
    const e = smooth(PARK_X0 + 3, PARK_X0 + 20, x);
    let h = e * (1.6 * Math.sin(x * 0.085) * Math.sin(z * 0.06) + 1.1 * Math.sin(z * 0.13 + x * 0.04) + 1.4 + 0.5 * Math.sin(x * 0.31 + z * 0.23));
    for (const r of RAMPS) {
      const px = x - r.x, pz = z - r.z, a = px * r.dx + pz * r.dz, b = -px * r.dz + pz * r.dx;
      if (a > 0 && a < r.len && Math.abs(b) < r.w / 2) h += r.h * (a / r.len) * smooth(r.w / 2, r.w / 2 - 1.5, Math.abs(b));
    }
    return h;
  }
  const RACES = [
    { id: 'city', name: 'City Sprint', laps: 1, rad: 11, reward: [300, 180, 100, 40], bots: 'car',
      start: { x: RX(0) + 40, z: RX(0) }, grid: { x: RX(0) + 30, z: RX(0), h: Math.PI / 2 },
      cps: [[RX(3), RX(0)], [RX(3), RX(2)], [RX(6), RX(2)], [RX(6), RX(5)], [RX(2), RX(5)], [RX(2), RX(3)], [RX(0), RX(3)], [RX(0), RX(0)], [RX(0) + 40, RX(0)]] },
    { id: 'rally', name: 'Dirt Rally', laps: 1, rad: 13, reward: [400, 240, 120, 50], bots: 'off',
      start: { x: 236, z: -200 }, grid: { x: 236, z: -212, h: 0 },
      cps: [[300, -150], [318, -50], [258, 0], [305, 85], [248, 150], [310, 205], [240, 120], [238, -40], [236, -195]] },
  ];

  /* ================= save ================= */
  const DEF = { owned: ['hatch'], cur: 'hatch', upg: {}, paint: {}, paints: ['factory'], stats: { jobs: 0, races: 0, wins: 0, escapes: 0, wrecks: 0, rivals: 0, earned: 0 } };
  let SV = null, saver = null;
  function load() { saver = LSPG.store('drive', DEF); SV = saver.load(); if (!VEH.some((v) => v.id === SV.cur)) SV.cur = 'hatch'; if (!SV.owned.includes('hatch')) SV.owned.unshift('hatch'); }
  const save = () => { if (saver) saver.save(SV); };
  const specOf = (id) => VEH.find((v) => v.id === id) || VEH[0];
  const upgOf = (id) => Object.assign({ engine: 0, turbo: 0, tires: 0, armor: 0, nitro: 0 }, SV.upg[id] || {});
  const ucost = (spec, lv) => Math.round((UCOST[lv] * (1 + spec.cost / 20000)) / 10) * 10;
  function statsOf(id) {
    const s = specOf(id), u = upgOf(id);
    return { top: s.top * (1 + 0.07 * u.engine), acc: s.acc * (1 + 0.1 * u.turbo), grip: s.grip * (1 + 0.07 * u.tires), turn: s.turn * (1 + 0.04 * u.tires), armor: u.armor, hp: Math.round(s.hp * (1 + 0.12 * u.armor)), ncap: 1 + 0.25 * u.nitro, nref: 1 + 0.2 * u.nitro, off: !!s.off, bike: s.type === 'bike', mass: s.mass };
  }
  const paintOf = (id) => { const p = PAINTS.find((x) => x.id === (SV.paint[id] || 'factory')); return (p && p.color) || specOf(id).color; };

  /* ================= screens ================= */
  const css = `
  #s-drive{position:fixed;inset:0;background:#9fd0f5;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
  #drive-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
  #s-drive .hud{z-index:3}
  .d-hp{min-width:150px}
  .d-heat{color:#d61f30;letter-spacing:1px}
  .d-heat.off{color:#b9c0d0}
  .d-obj{position:absolute;left:50%;transform:translateX(-50%);top:calc(64px + env(safe-area-inset-top,0px));background:rgba(22,32,61,.82);color:#fff;font-weight:800;font-size:15px;padding:7px 14px;border-radius:12px;max-width:min(560px,80vw);text-align:center;pointer-events:none;z-index:2}
  .d-obj:empty{display:none}
  .d-prompt{position:absolute;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#fff;border:2px solid var(--line);color:var(--ink);font-weight:800;font-size:15px;padding:8px 14px;border-radius:12px;pointer-events:none;white-space:nowrap;z-index:2}
  .d-prompt:empty{display:none}
  .d-map{position:absolute;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:170px;height:170px;border-radius:50%;border:3px solid rgba(255,255,255,.9);box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;z-index:2}
  .d-speedo{position:absolute;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));background:rgba(22,32,61,.82);color:#fff;border-radius:16px;padding:8px 14px 10px;min-width:150px;pointer-events:none;z-index:2}
  .d-speedo .spd{font-family:Fredoka,system-ui,sans-serif;font-size:38px;font-weight:700;line-height:1}
  .d-speedo .unit{font-size:13px;font-weight:800;opacity:.7;margin-left:4px}
  .d-speedo .gear{float:right;font-family:Fredoka,system-ui,sans-serif;font-size:22px;font-weight:700;background:rgba(255,255,255,.14);border-radius:8px;padding:0 8px;margin-top:6px}
  .d-speedo .bar{height:7px;margin-top:6px;background:rgba(255,255,255,.18)}
  .d-speedo .bar i{background:linear-gradient(90deg,#3ad1ff,#7a5cff)}
  .d-speedo .lbl{font-size:11px;font-weight:800;opacity:.7;margin-top:5px}
  .d-race{position:absolute;right:16px;top:calc(64px + env(safe-area-inset-top,0px));background:rgba(22,32,61,.82);color:#fff;border-radius:14px;padding:8px 14px;font-weight:800;text-align:right;pointer-events:none;z-index:2}
  .d-race b{font-family:Fredoka,system-ui,sans-serif;font-size:30px;line-height:1}
  .d-race:empty{display:none}
  .d-count{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-family:Fredoka,system-ui,sans-serif;font-size:110px;font-weight:700;color:#fff;text-shadow:0 6px 0 rgba(22,32,61,.45);pointer-events:none;z-index:3}
  .d-pop{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-family:Fredoka,system-ui,sans-serif;font-size:30px;font-weight:700;color:#fff;text-shadow:0 3px 0 rgba(22,32,61,.5);pointer-events:none;opacity:0;transition:opacity .3s,top .3s;white-space:nowrap;z-index:3}
  .d-pop.on{opacity:1;top:26%}
  .d-acts{position:absolute;right:14px;top:calc(120px + env(safe-area-inset-top,0px));display:none;flex-direction:column;gap:10px;z-index:3}
  .touch .d-acts{display:flex}
  .d-acts button{width:58px;height:58px;border-radius:16px;background:#fff;border:2px solid var(--line);box-shadow:0 4px 0 var(--line);font-family:Fredoka,system-ui,sans-serif;font-weight:700;font-size:20px;color:var(--ink)}
  .d-acts button.e{background:var(--brand);color:#fff;border-color:var(--brand);box-shadow:0 4px 0 var(--brand-d)}
  #s-drive .gpad{z-index:3}
  .touch .d-map{width:116px;height:116px;left:14px;top:calc(62px + env(safe-area-inset-top,0px));bottom:auto}
  .touch .d-obj{max-width:calc(100vw - 300px);font-size:13px}
  .touch .d-speedo{right:auto;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));min-width:120px;padding:6px 12px 8px}
  .touch .d-speedo .spd{font-size:28px}
  .touch .d-race{top:calc(190px + env(safe-area-inset-top,0px))}
  .touch .d-prompt{bottom:calc(110px + env(safe-area-inset-bottom,0px))}
  .touch #s-drive .help{display:none}
  .d-load{position:absolute;inset:0;display:grid;place-items:center;background:#9fd0f5;color:#16203d;font-family:Fredoka,system-ui,sans-serif;font-size:22px;font-weight:700;z-index:6}
  .d-load[hidden]{display:none}
  .vstats{display:grid;gap:4px;margin-top:2px}
  .vtag{display:inline-block;font-size:12px;font-weight:800;padding:2px 8px;border-radius:99px;background:#eef3ff;color:var(--brand);margin-right:4px}
  .vtag.off{background:#f3ecdf;color:#8a5a1f}.vtag.bike{background:#e3faf3;color:#0b8f6e}
  .dhow{margin-top:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
  .dhow div{background:#fff;border:2px solid var(--line);border-radius:16px;padding:14px;font-size:14px;color:var(--muted)}
  .dhow b{display:block;color:var(--ink);font-size:16px;margin-bottom:4px}
  @media (max-width:720px){.d-obj{font-size:13px;top:calc(110px + env(safe-area-inset-top,0px))}}
  `;
  const stEl = document.createElement('style'); stEl.textContent = css; document.head.appendChild(stEl);

  document.body.insertAdjacentHTML('beforeend', `
  <section class="screen" id="s-drive-l" style="overflow:auto">
    <header class="topbar"><div class="topbar-in">
      <button class="iconbtn" id="drive-back" aria-label="Back to games">‹</button>
      <h2 style="font-size:20px">LSP Drive</h2><div class="spacer"></div>
      <span class="pill" title="LSP points">⭐ <span class="js-points">0</span></span>
    </div></header>
    <main class="wrap">
      <div class="tabs" role="tablist">
        <button class="tab on" data-t="play" role="tab">Play</button>
        <button class="tab" data-t="garage" role="tab">Garage</button>
        <button class="tab" data-t="upgrades" role="tab">Upgrades</button>
        <button class="tab" data-t="paint" role="tab">Paint</button>
      </div>
      <div class="gpanel on" data-p="play" id="drive-p-play"></div>
      <div class="gpanel" data-p="garage" id="drive-p-garage"></div>
      <div class="gpanel" data-p="upgrades" id="drive-p-upgrades"></div>
      <div class="gpanel" data-p="paint" id="drive-p-paint"></div>
    </main>
  </section>
  <section class="screen" id="s-drive">
    <canvas id="drive-cv"></canvas>
    <div class="hud">
      <button class="iconbtn" id="drive-pause" aria-label="Pause">⏸</button>
      <div class="hp d-hp"><span id="d-hp-t">Health</span><div class="bar"><i id="d-hp" style="width:100%"></i></div></div>
      <span class="hudpill d-heat off" id="d-heat" title="Red Vipers heat">☆☆☆</span>
      <span class="hudpill" id="d-earned">⭐ +0</span>
      <button class="iconbtn" id="d-cam" aria-label="Change camera" title="Camera (C)">📷</button>
      <button class="iconbtn" id="d-mute" aria-label="Sound on or off" title="Sound">🔊</button>
    </div>
    <div class="d-obj" id="d-obj"></div>
    <div class="d-race" id="d-race"></div>
    <div class="d-prompt" id="d-prompt"></div>
    <div class="d-count" id="d-count"></div>
    <div class="d-pop" id="d-pop"></div>
    <canvas class="d-map" id="d-map" width="340" height="340"></canvas>
    <div class="d-speedo" id="d-speedo"><span class="gear" id="d-gear">N</span><span class="spd" id="d-spd">0</span><span class="unit">km/h</span>
      <div class="lbl">NITRO</div><div class="bar"><i id="d-nitro" style="width:100%"></i></div></div>
    <div class="d-acts"><button class="e" id="d-e" aria-label="Get in or out">🚪</button><button id="d-horn" aria-label="Horn">📯</button></div>
    <div class="gpad gpad-l"><button class="kbtn" data-k="left" aria-label="Steer left">◀</button><button class="kbtn" data-k="right" aria-label="Steer right">▶</button></div>
    <div class="gpad gpad-r"><button class="kbtn nitro" data-k="nitro" aria-label="Nitro">🔥</button><button class="kbtn brake" data-k="brake">BRAKE</button><button class="kbtn gas" data-k="gas">GAS</button></div>
    <div class="help">W A S D drive · Space handbrake · Shift nitro · E get in/out · C camera · H horn · Esc pause</div>
    <div class="rotate hudpill">Turn your phone sideways to drive</div>
    <div class="d-load" id="d-load" hidden>Loading the city…</div>
    <div class="modal" id="drive-modal"><div class="modal-card"></div></div>
  </section>`);

  const TIN = {};
  LSPG.holdButtons('#s-drive', TIN);
  const setTab = LSPG.tabs('#s-drive-l', (t) => { renderLobby(t); refreshPoints(); });
  const sfx = (n, o) => { if (LSPG.sfx) LSPG.sfx(n, o); };

  /* ================= lobby ================= */
  function bar(label, v) { return `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.round(clamp(v, 0.04, 1) * 100)}%"></i></div></div>`; }
  function vehStats(id) {
    const s = statsOf(id);
    return `<div class="vstats">${bar('Speed', s.top / 66)}${bar('Accel', s.acc / 17)}${bar('Handling', (s.grip * s.turn) / 17)}${bar('Toughness', s.hp / 220)}</div>`;
  }
  function renderLobby(tab) {
    if (!SV) load();
    const cur = specOf(SV.cur), pts = Wallet.get();
    if (tab === 'play') {
      const st = SV.stats;
      $('#drive-p-play').innerHTML = `
        <div class="item" style="margin-top:18px;max-width:640px">
          <div class="item-head"><div class="ico" style="font-size:28px">${cur.icon}</div><div><h3>Your ride: ${cur.name}</h3><p>${cur.desc}</p></div></div>
          <div class="statline"><span class="pill">📦 ${st.jobs} jobs</span><span class="pill">🏁 ${st.wins} race wins</span><span class="pill">🕶️ ${st.escapes} escapes</span><span class="pill">💥 ${st.rivals} Vipers wrecked</span></div>
          <button class="btn primary" id="drive-go">Enter the city</button>
        </div>
        <div class="dhow">
          <div><b>🚪 Get in</b>Walk up to your ride and press E (or tap 🚪). Press C (📷) to sit inside and drive from the driver's seat.</div>
          <div><b>📦 Delivery jobs</b>Drive into a glowing marker to take a job, then deliver it before the timer runs out.</div>
          <div><b>🐍 ${GANG}</b>Risky jobs, or driving into their red turf, send gang cars after you. Break their line of sight for a few seconds, or hide in a 🅷 hideout, to lose them.</div>
          <div><b>🏁 Races</b>City Sprint starts near your garage. Dirt Rally is in the off-road park east of the city. Off-road rides are much faster on dirt.</div>
          <div><b>🔧 Garage</b>Stop in your garage to repair. Buy cars and bikes here, then upgrade the engine, turbo, tires, armor and nitro.</div>
        </div>`;
      $('#drive-go').onclick = startCity;
    } else if (tab === 'garage') {
      $('#drive-p-garage').innerHTML = `<div class="items">${VEH.map((v) => {
        const has = SV.owned.includes(v.id), on = SV.cur === v.id;
        const btn = on ? '<button class="btn ghost" disabled>Driving this</button>' : has ? `<button class="btn primary" data-dv="${v.id}">Drive this</button>` : `<button class="btn gold" data-dv="${v.id}" ${pts < v.cost ? 'disabled' : ''}>Buy for ⭐ ${v.cost.toLocaleString()}</button>`;
        return `<div class="item${on ? ' eq' : ''}"><div class="item-head"><div class="ico" style="font-size:26px;background:${v.color}22">${v.icon}</div><div><h3>${v.name}</h3><p><span class="vtag ${v.type === 'bike' ? 'bike' : ''}">${v.type === 'bike' ? 'Bike' : 'Car'}</span>${v.off ? '<span class="vtag off">Off-road</span>' : ''}</p></div></div><p>${v.desc}</p>${vehStats(v.id)}${btn}</div>`;
      }).join('')}</div>`;
      $$('[data-dv]').forEach((b) => (b.onclick = () => {
        const v = specOf(b.dataset.dv);
        if (!SV.owned.includes(v.id)) { if (!Wallet.spend(v.cost)) return; SV.owned.push(v.id); toast(v.name + ' is yours!'); sfx('cash'); }
        SV.cur = v.id; save(); renderLobby('garage');
      }));
    } else if (tab === 'upgrades') {
      const u = upgOf(cur.id), costs = UCOST.map((_, i) => ucost(cur, i));
      $('#drive-p-upgrades').innerHTML = `<p class="note" style="margin-top:18px">Upgrading your <b>${cur.icon} ${cur.name}</b>. Each car and bike keeps its own upgrades. Switch rides in the Garage tab.</p><div class="items">${LSPG.upgradeCards(UPG, u, costs, UMAX, 'data-du')}</div>`;
      $$('[data-du]').forEach((b) => (b.onclick = () => {
        const id = b.dataset.du, uu = upgOf(cur.id), c = costs[uu[id]];
        if (uu[id] >= UMAX || !Wallet.spend(c)) return;
        uu[id]++; SV.upg[cur.id] = uu; save(); toast('Upgrade installed'); sfx('ding'); renderLobby('upgrades');
      }));
    } else if (tab === 'paint') {
      const curPaint = SV.paint[cur.id] || 'factory';
      const list = PAINTS.map((p) => ({ id: p.id, name: p.name, cost: p.cost, color: p.color || cur.color }));
      $('#drive-p-paint').innerHTML = `<p class="note" style="margin-top:18px">Paint for your <b>${cur.icon} ${cur.name}</b>. Buy a colour once and use it on any ride.</p><div class="items">${LSPG.skinCards(list, SV.paints, curPaint, 'data-dp')}</div>`;
      $$('[data-dp]').forEach((b) => (b.onclick = () => {
        const p = PAINTS.find((x) => x.id === b.dataset.dp);
        if (!SV.paints.includes(p.id)) { if (!Wallet.spend(p.cost)) return; SV.paints.push(p.id); sfx('cash'); }
        SV.paint[cur.id] = p.id; save(); renderLobby('paint');
      }));
    }
  }
  function openLobby(tab) {
    stopCity();
    load(); show('s-drive-l'); setTab(tab || 'play'); refreshPoints();
    import('./vendor/three.module.min.js').catch(() => {}); // warm the cache while they browse
  }
  $('#drive-back').onclick = () => { stopCity(); enterHub(); };

  /* ================= 3D world ================= */
  let T = null, renderer = null, scene = null, camera = null, sun = null, built = false, loading = null;
  const MC = {};
  const M = (color, o) => { const k = color + JSON.stringify(o || {}); return MC[k] || (MC[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}))); };
  function box(w, h, d, mat, x, y, z, parent, shadow = true) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = false;
    if (parent) parent.add(m); return m;
  }
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    if (rep) t.repeat.set(rep[0], rep[1]); return t;
  }
  function textSprite(text, bg, fg, sx, sy, font) {
    const w = 512, h = Math.round((512 * sy) / sx);
    const tex = canvasTex(w, h, (g) => {
      if (bg) { g.fillStyle = bg; LSPG.rr(g, 6, 6, w - 12, h - 12, Math.min(40, h / 3)); g.fill(); }
      g.fillStyle = fg; g.font = font || `700 ${Math.round(h * 0.52)}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + h * 0.04);
    });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false })); s.scale.set(sx, sy, 1); return s;
  }
  function merge(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      pos.set(p.array, vo * 3); nor.set(n.array, vo * 3); if (u) uv.set(u.array, vo * 2);
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
      else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
      vo += p.count; g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere(); return out;
  }

  /* ---- colliders: axis-aligned boxes in a spatial hash ---- */
  const CG = new Map(), CGS = 24, EMPTY = [];
  function addCol(x0, z0, x1, z1) {
    const b = { x0, z0, x1, z1 };
    for (let i = Math.floor((x0 - 2) / CGS); i <= Math.floor((x1 + 2) / CGS); i++)
      for (let j = Math.floor((z0 - 2) / CGS); j <= Math.floor((z1 + 2) / CGS); j++) { const k = i * 1000 + j; let l = CG.get(k); if (!l) CG.set(k, (l = [])); l.push(b); }
  }
  const nearCols = (x, z) => CG.get(Math.floor(x / CGS) * 1000 + Math.floor(z / CGS)) || EMPTY;
  function solidAt(x, z) { for (const b of nearCols(x, z)) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true; return x < BOUND.x0 || x > BOUND.x1 || z < BOUND.z0 || z > BOUND.z1; }
  function los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 4);
    for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  // Push a circle out of buildings and the world edge. Returns {impact} and fixes v's velocity.
  function collideWorld(o, cx, cz, r) {
    let impact = 0;
    const hit = (nx, nz, pen) => {
      o.x += nx * pen; o.z += nz * pen; cx += nx * pen; cz += nz * pen;
      const vn = o.vx * nx + o.vz * nz;
      if (vn < 0) { o.vx -= 1.3 * vn * nx; o.vz -= 1.3 * vn * nz; o.vx *= 0.9; o.vz *= 0.9; impact = Math.max(impact, -vn); }
    };
    for (const b of nearCols(cx, cz)) {
      const px = clamp(cx, b.x0, b.x1), pz = clamp(cz, b.z0, b.z1), dx = cx - px, dz = cz - pz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { // centre inside the box: leave by the nearest face
        const opts = [[cx - b.x0, -1, 0], [b.x1 - cx, 1, 0], [cz - b.z0, 0, -1], [b.z1 - cz, 0, 1]].sort((a, c) => a[0] - c[0])[0];
        hit(opts[1], opts[2], opts[0] + r);
      } else { const d = Math.sqrt(d2); hit(dx / d, dz / d, r - d); }
    }
    if (cx - r < BOUND.x0) hit(1, 0, BOUND.x0 - (cx - r)); if (cx + r > BOUND.x1) hit(-1, 0, cx + r - BOUND.x1);
    if (cz - r < BOUND.z0) hit(0, 1, BOUND.z0 - (cz - r)); if (cz + r > BOUND.z1) hit(0, -1, cz + r - BOUND.z1);
    return impact;
  }

  /* ---- models ---- */
  function wheelMesh(r, w, lite) {
    const g = new T.Group();
    const tg = new T.CylinderGeometry(r, r, w, lite ? 10 : 16); tg.rotateZ(Math.PI / 2);
    const tire = new T.Mesh(tg, M('#17181c', { roughness: 0.95 })); tire.castShadow = true; g.add(tire);
    if (!lite) {
      const rg = new T.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 12); rg.rotateZ(Math.PI / 2);
      g.add(new T.Mesh(rg, M('#b8bec8', { metalness: 0.7, roughness: 0.3 })));
      g.add(box(w + 0.04, r * 1.1, 0.07, M('#7d838d', { metalness: 0.6, roughness: 0.4 }), 0, 0, 0, null, false));
      g.add(box(w + 0.04, 0.07, r * 1.1, M('#7d838d', { metalness: 0.6, roughness: 0.4 }), 0, 0, 0, null, false));
    }
    return g;
  }
  const GLASS = () => M('#22303f', { metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.55 });
  function person(shirt, pants, skin, hat) {
    const g = new T.Group(), sk = M(skin || '#f1c27d'), pm = M(pants || '#2d3a5c'), sm = M(shirt || '#2f6bff');
    const leg = (x) => { const p = new T.Group(); p.position.set(x, 0.9, 0); box(0.24, 0.9, 0.26, pm, 0, -0.45, 0, p); g.add(p); return p; };
    const arm = (x) => { const p = new T.Group(); p.position.set(x, 1.5, 0); box(0.18, 0.62, 0.22, sm, 0, -0.29, 0, p); box(0.17, 0.14, 0.2, sk, 0, -0.66, 0, p); g.add(p); return p; };
    g.userData.legs = [leg(-0.13), leg(0.13)]; g.userData.arms = [arm(-0.38), arm(0.38)];
    box(0.56, 0.62, 0.32, sm, 0, 1.21, 0, g);
    const head = box(0.38, 0.38, 0.38, sk, 0, 1.73, 0, g);
    box(0.06, 0.07, 0.02, M('#16203d'), -0.08, 1.77, 0.2, g, false); box(0.06, 0.07, 0.02, M('#16203d'), 0.08, 1.77, 0.2, g, false);
    box(0.16, 0.03, 0.02, M('#a0522d'), 0, 1.65, 0.2, g, false);
    if (hat) box(0.42, 0.1, 0.42, M(hat), 0, 1.96, 0, g);
    g.userData.head = head;
    return g;
  }
  // Seated driver: torso and head only (legs are hidden under the dash).
  function seated(shirt, skin, helmet) {
    const g = new T.Group();
    box(0.46, 0.5, 0.28, M(shirt || '#2f6bff'), 0, 0.27, 0, g);
    box(0.32, 0.32, 0.32, M(helmet || skin || '#f1c27d'), 0, 0.7, 0.02, g);
    return g;
  }
  function carModel(b, color, o = {}) {
    const g = new T.Group(); g.rotation.order = 'YXZ';
    const paint = new T.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.32 });
    const trim = M('#26292f', { roughness: 0.6 }), y0 = b.clr;
    box(b.W, b.H, b.L, paint, 0, y0 + b.H / 2, 0, g);
    box(b.W + 0.04, 0.24, 0.16, trim, 0, y0 + 0.13, b.L / 2 + 0.02, g, false);
    box(b.W + 0.04, 0.24, 0.16, trim, 0, y0 + 0.13, -b.L / 2 - 0.02, g, false);
    const glass = GLASS(), cg = new T.BoxGeometry(b.W * 0.88, b.cabH, b.cabL), p = cg.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setZ(i, p.getZ(i) * 0.74 - b.cabL * 0.04); p.setX(i, p.getX(i) * 0.93); }
    cg.computeVertexNormals();
    const cab = new T.Mesh(cg, [glass, glass, paint, paint, glass, glass]); cab.position.set(0, y0 + b.H + b.cabH / 2, b.cabZ); cab.castShadow = true; g.add(cab);
    if (o.stripe) { box(0.36, 0.02, b.L + 0.01, M(o.stripe), 0, y0 + b.H + 0.005, 0, g, false); box(0.36, 0.02, b.cabL * 0.72, M(o.stripe), 0, y0 + b.H + b.cabH + 0.01, b.cabZ - b.cabL * 0.04, g, false); }
    if (o.taxi) { box(0.6, 0.18, 0.3, M('#ffd23f', { emissive: '#ffb800', emissiveIntensity: 0.4 }), 0, y0 + b.H + b.cabH + 0.09, b.cabZ, g, false); }
    const head = M('#fffbe6', { emissive: '#fff4c2', emissiveIntensity: 1.2 });
    const tail = new T.MeshStandardMaterial({ color: '#c81d2a', emissive: '#ff1a2a', emissiveIntensity: 0.5 });
    if (o.lite) {
      box(b.W * 0.9, 0.12, 0.04, head, 0, y0 + b.H * 0.62, b.L / 2 + 0.01, g, false);
      box(b.W * 0.9, 0.12, 0.04, tail, 0, y0 + b.H * 0.66, -b.L / 2 - 0.01, g, false);
    } else {
      for (const sx of [-1, 1]) {
        box(0.4, 0.14, 0.05, head, sx * (b.W / 2 - 0.32), y0 + b.H * 0.62, b.L / 2 + 0.01, g, false);
        box(0.4, 0.13, 0.05, tail, sx * (b.W / 2 - 0.3), y0 + b.H * 0.66, -b.L / 2 - 0.01, g, false);
        box(0.08, 0.1, 0.2, paint, sx * (b.W / 2 + 0.04), y0 + b.H + 0.08, b.cabZ + b.cabL * 0.38, g, false); // mirrors
      }
      box(b.W * 0.5, 0.14, 0.04, M('#2a2d33'), 0, y0 + 0.28, b.L / 2 + 0.07, g, false); // grille
    }
    if (b.spoiler) { box(b.W * 0.9, 0.06, 0.32, trim, 0, y0 + b.H + 0.32, -b.L / 2 + 0.2, g); for (const sx of [-1, 1]) box(0.06, 0.3, 0.12, trim, sx * b.W * 0.3, y0 + b.H + 0.15, -b.L / 2 + 0.2, g, false); }
    if (b.rack) for (const sz of [-0.5, 0.2]) box(b.W * 0.9, 0.05, 0.05, trim, 0, y0 + b.H + b.cabH + 0.08, b.cabZ + sz, g, false);
    if (b.spare) { const sp = wheelMesh(b.wr * 0.9, b.ww, true); sp.rotation.y = Math.PI / 2; sp.position.set(0, y0 + b.H * 0.8, -b.L / 2 - b.ww / 2 - 0.05); g.add(sp); }
    // wheels
    const wheels = [], steer = [];
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const pivot = new T.Group(); pivot.position.set(sx * (b.W / 2 - b.ww / 2 + 0.03), b.wr, sz * (b.L / 2 - b.wr - 0.32));
      const w = wheelMesh(b.wr, b.ww, o.lite); pivot.add(w); g.add(pivot); wheels.push(w); if (sz > 0) steer.push(pivot);
    }
    // driver (right-hand drive: India drives on the left, so the driver sits on the right = local -x)
    const seatX = -b.W * 0.22, seatY = y0 + b.H - 0.05, seatZ = b.cabZ + 0.05;
    const drv = seated(o.shirt, o.skin, o.helmet); drv.position.set(seatX, seatY - 0.15, seatZ - 0.1); g.add(drv);
    const parts = { g, paint, tail, wheels, steer, driver: drv, bike: false, wr: b.wr };
    if (!o.lite) {
      // cockpit, only shown from the driver's seat
      const ck = new T.Group(); ck.visible = false; g.add(ck);
      const dark = M('#1c1e24', { roughness: 0.7 });
      const dashZ = b.cabZ + b.cabL / 2 - 0.22, dashY = y0 + b.H + 0.06;
      box(b.W * 0.86, 0.2, 0.42, dark, 0, dashY, dashZ, ck, false);
      box(0.5, 0.12, 0.06, M('#0e1116', { emissive: '#1a3a5a', emissiveIntensity: 0.6 }), seatX, dashY + 0.12, dashZ - 0.2, ck, false); // instrument panel
      const wheel = new T.Mesh(new T.TorusGeometry(0.17, 0.028, 8, 24), dark);
      wheel.position.set(seatX, dashY + 0.12, dashZ - 0.42); wheel.rotation.x = 0.45; ck.add(wheel);
      box(0.3, 0.035, 0.02, dark, 0, 0, 0, wheel, false); box(0.035, 0.17, 0.02, dark, 0, -0.08, 0, wheel, false);
      const top = y0 + b.H + b.cabH, wsZ = b.cabZ + (b.cabL / 2) * (0.74 + 1) / 2 - b.cabL * 0.02, slope = Math.atan((b.cabL / 2) * 0.26 / b.cabH);
      for (const sx of [-1, 1]) { const pl = box(0.07, b.cabH * 1.08, 0.07, dark, sx * b.W * 0.4, y0 + b.H + b.cabH / 2, wsZ, ck, false); pl.rotation.x = -slope; }
      const liner = new T.Mesh(new T.PlaneGeometry(b.W * 0.8, b.cabL * 0.7), M('#8b8f98', { side: T.DoubleSide })); liner.rotation.x = Math.PI / 2; liner.position.set(0, top - 0.02, b.cabZ - b.cabL * 0.04); ck.add(liner);
      box(0.26, 0.07, 0.03, dark, 0, top - 0.1, b.cabZ + b.cabL * 0.3, ck, false); // rear-view mirror
      box(b.W * 0.8, 0.05, 0.05, dark, 0, top - 0.03, b.cabZ + b.cabL * 0.34, ck, false);
      parts.cockpit = ck; parts.wheel = wheel;
      const eye = y0 + b.H + b.cabH * 0.6;
      parts.seat = new T.Vector3(seatX, eye, seatZ - 0.05);
      parts.look = new T.Vector3(seatX, eye - 0.25, seatZ + 12);
      parts.exhaust = new T.Vector3(b.W * 0.3, y0 + 0.15, -b.L / 2 - 0.2);
    }
    parts.L = b.L; parts.W = b.W;
    return parts;
  }
  function bikeModel(b, color, o = {}) {
    const g = new T.Group(); g.rotation.order = 'YXZ';
    const paint = new T.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.3 });
    const dark = M('#1c1e24', { roughness: 0.6 }), chrome = M('#b8bec8', { metalness: 0.8, roughness: 0.25 });
    const lift = b.high ? 0.12 : 0, fz = b.L / 2 - b.wr, rz = -b.L / 2 + b.wr;
    const wheels = [];
    const rw = wheelMesh(b.wr, b.ww); rw.position.set(0, b.wr, rz); g.add(rw); wheels.push(rw);
    if (b.scoot) {
      box(0.36, 0.3, 0.9, paint, 0, b.wr + 0.22, -0.2, g); box(0.34, 0.12, 0.62, dark, 0, b.wr + 0.43, -0.25, g);
      box(0.3, 0.08, 0.5, paint, 0, b.wr + 0.08, 0.3, g); // footboard
    } else {
      box(0.18, 0.18, b.L * 0.5, dark, 0, b.wr + 0.32 + lift, -0.05, g); // frame
      box(0.34, 0.26, 0.5, paint, 0, b.wr + 0.56 + lift, 0.2, g); // tank
      box(0.28, 0.1, 0.62, dark, 0, b.wr + 0.58 + lift, -0.36, g); // seat
      box(0.24, 0.12, 0.42, paint, 0, b.wr + 0.55 + lift, -0.78, g); // tail
      box(0.1, 0.1, 0.7, chrome, 0.17, b.wr + 0.12, -0.45, g, false); // exhaust
      box(0.3, 0.32, 0.36, dark, 0, b.wr + 0.22 + lift, 0.05, g); // engine
      if (b.fair) { box(0.44, 0.42, 0.46, paint, 0, b.wr + 0.52, 0.58, g); box(0.36, 0.2, 0.06, GLASS(), 0, b.wr + 0.82, 0.74, g, false); }
    }
    // front fork + handlebars steer together
    const fork = new T.Group(); fork.position.set(0, b.wr, fz); g.add(fork);
    const fw = wheelMesh(b.wr, b.ww); fork.add(fw); wheels.push(fw);
    for (const sx of [-1, 1]) { const f = box(0.05, 0.85 + lift, 0.05, chrome, sx * 0.12, 0.42, -0.12, fork, false); f.rotation.x = -0.35; }
    box(0.72, 0.04, 0.04, dark, 0, 0.82 + lift, -0.36, fork, false);
    for (const sx of [-1, 1]) box(0.1, 0.06, 0.06, M('#2a2d33'), sx * 0.34, 0.82 + lift, -0.36, fork, false);
    box(0.16, 0.14, 0.1, M('#fffbe6', { emissive: '#fff4c2', emissiveIntensity: 1.2 }), 0, 0.62 + lift, -0.12, fork, false);
    box(0.2, 0.1, 0.12, M('#0e1116', { emissive: '#1a3a5a', emissiveIntensity: 0.6 }), 0, 0.84 + lift, -0.26, fork, false); // clocks
    const tail = new T.MeshStandardMaterial({ color: '#c81d2a', emissive: '#ff1a2a', emissiveIntensity: 0.5 });
    box(0.16, 0.08, 0.04, tail, 0, b.wr + 0.55 + lift, -b.L / 2 + 0.02, g, false);
    // rider
    const rider = new T.Group(); rider.position.set(0, b.wr + 0.62 + lift, -0.35); g.add(rider);
    const shirt = M(o.shirt || '#2f6bff'), pants = M('#2d3a5c');
    const torso = box(0.44, 0.58, 0.28, shirt, 0, 0.3, 0.05, rider); torso.rotation.x = b.scoot ? 0.1 : 0.45;
    box(0.36, 0.36, 0.38, M(o.helmet || '#ffffff', { metalness: 0.3, roughness: 0.25 }), 0, 0.72, b.scoot ? 0.08 : 0.26, rider);
    box(0.3, 0.12, 0.04, GLASS(), 0, 0.72, b.scoot ? 0.28 : 0.46, rider, false);
    for (const sx of [-1, 1]) {
      const a = box(0.14, 0.14, 0.55, shirt, sx * 0.26, 0.42, 0.32, rider, false); a.rotation.x = 0.35;
      const l = box(0.18, 0.18, 0.6, pants, sx * 0.18, -0.05, 0.22, rider, false); l.rotation.x = -0.25;
    }
    return { g, paint, tail, wheels, steer: [fork], driver: rider, bike: true, wr: b.wr, L: b.L, W: 0.7,
      seat: new T.Vector3(0, b.wr + 1.38 + lift, -0.2), look: new T.Vector3(0, b.wr + 1.1 + lift, 12), exhaust: new T.Vector3(0.17, b.wr + 0.12, -0.85) };
  }
  const TBODY = {
    hatch: VEH[0].body, sedan: VEH[1].body,
    van: { L: 4.8, W: 1.95, H: 0.95, clr: 0.34, cabL: 3.7, cabH: 0.9, cabZ: -0.45, wr: 0.36, ww: 0.26 },
    suv: { L: 4.5, W: 1.95, H: 0.8, clr: 0.45, cabL: 2.8, cabH: 0.72, cabZ: -0.3, wr: 0.4, ww: 0.28 },
    truck: { L: 7.2, W: 2.3, H: 1.0, clr: 0.5, cabL: 5.0, cabH: 1.5, cabZ: -0.9, wr: 0.48, ww: 0.32 },
  };
  const TCOLORS = ['#f2f3f5', '#c9ccd3', '#15171c', '#8a1c22', '#1f4e8c', '#5a6472', '#7d5a3c', '#2f6b4f', '#e3d3b4'];

  /* ---- world ---- */
  const WORLD = { lamps: [] };
  function buildWorld() {
    const cv = $('#drive-cv'), touch = LSPG.isTouch();
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.25 : 1.5));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f93d8'); gr.addColorStop(0.55, '#a9d4f5'); gr.addColorStop(1, '#dcebf5'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.background.wrapS = scene.background.wrapT = T.ClampToEdgeWrapping;
    scene.fog = new T.Fog('#c9e1f2', 140, 620);
    camera = new T.PerspectiveCamera(62, 1, 0.1, 1000);
    scene.add(new T.HemisphereLight('#e6f2ff', '#6d7a5a', 1.0));
    sun = new T.DirectionalLight('#fff3df', 2.2); sun.position.set(80, 120, 50);
    if (renderer.shadowMap.enabled) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const c = sun.shadow.camera; c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 10; c.far = 320; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    }
    scene.add(sun); scene.add(sun.target);

    // grass
    const grass = new T.Mesh(new T.PlaneGeometry(1600, 1600), M('#6ea85a')); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.03; grass.receiveShadow = true; scene.add(grass);

    // roads
    const roadTex = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#3d4046'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 3, w, 2); g.fillRect(0, h - 5, w, 2);
      for (let x = 0; x < w; x += 64) g.fillRect(x, h / 2 - 1.5, 34, 3);
    }, [446 / 16, 1]);
    const roadMat = new T.MeshStandardMaterial({ map: roadTex, roughness: 0.92 });
    for (let i = 0; i <= NB; i++) {
      const a = new T.Mesh(new T.PlaneGeometry(446, ROAD), roadMat); a.rotation.x = -Math.PI / 2; a.position.set(0, 0.01, RX(i)); a.receiveShadow = true; scene.add(a);
      const b = new T.Mesh(new T.PlaneGeometry(446, ROAD), roadMat); b.rotation.set(-Math.PI / 2, 0, Math.PI / 2); b.position.set(RX(i), 0.012, 0); b.receiveShadow = true; scene.add(b);
    }
    const xing = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#3d4046'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e8e8'; for (let x = 4; x < w; x += 9) { g.fillRect(x, 0, 5, 7); g.fillRect(x, h - 7, 5, 7); g.fillRect(0, x, 7, 5); g.fillRect(w - 7, x, 7, 5); } });
    xing.wrapS = xing.wrapT = T.ClampToEdgeWrapping;
    const xm = new T.MeshStandardMaterial({ map: xing, roughness: 0.92 });
    for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) { const p = new T.Mesh(new T.PlaneGeometry(ROAD + 0.2, ROAD + 0.2), xm); p.rotation.x = -Math.PI / 2; p.position.set(RX(i), 0.016, RX(j)); p.receiveShadow = true; scene.add(p); }

    // window textures: a 4x4 sheet of slightly different windows per palette
    const pal = [
      { wall: '#d9cbb3', win: '#5b7ea6' }, { wall: '#9aa7b8', win: '#2d4a6b' }, { wall: '#e9e4da', win: '#6c8fb5' },
      { wall: '#b7836a', win: '#3e5872' }, { wall: '#7fa6c9', win: '#c4ddf2', glass: true }, { wall: '#6b2a2a', win: '#2b2b33', turf: true },
    ];
    for (const p of pal) {
      p.tex = canvasTex(256, 256, (g) => {
        g.fillStyle = p.wall; g.fillRect(0, 0, 256, 256);
        for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 4; cy++) {
          const x = cx * 64, y = cy * 64, lit = Math.random();
          g.fillStyle = p.glass ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.12)'; g.fillRect(x, y + 60, 64, 4);
          const grd = g.createLinearGradient(0, y + 10, 0, y + 52); grd.addColorStop(0, lit > 0.85 ? '#ffe9a8' : p.win); grd.addColorStop(1, lit > 0.85 ? '#f2c86b' : '#1d2a3a');
          g.fillStyle = grd; p.glass ? g.fillRect(x + 3, y + 3, 58, 56) : g.fillRect(x + 10, y + 12, 44, 38);
          if (!p.glass) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 31, y + 12, 2, 38); if (Math.random() < 0.3) { g.fillStyle = 'rgba(240,230,210,.8)'; g.fillRect(x + 10, y + 12, 14, 38); } }
        }
        g.fillStyle = p.wall; g.fillRect(0, 0, 6, 6); // roof samples this corner
      });
      p.mat = new T.MeshStandardMaterial({ map: p.tex, roughness: p.glass ? 0.25 : 0.85, metalness: p.glass ? 0.4 : 0 });
      p.geos = [];
    }
    const roofGeos = [], walkGeos = [], parkGeos = [], trees = [], lamps = [];
    const R = LSPG.rng(20260);
    const special = new Set([...HIDEOUTS.map((h) => h.x + ',' + h.z), GARAGE.x + ',' + GARAGE.z]);
    for (let bx = 0; bx < NB; bx++) for (let bz = 0; bz < NB; bz++) {
      const x0 = RX(bx) + HALF, z0 = RX(bz) + HALF, S = CELL - ROAD, cx = x0 + S / 2, cz = z0 + S / 2;
      const sw = new T.BoxGeometry(S, 0.16, S); sw.translate(cx, 0.08, cz); walkGeos.push(sw);
      // street lamps on the block edge
      for (let k = 0; k < 3; k++) { const t = 9 + k * 20; lamps.push([x0 + t, z0 + 1, 0], [x0 + t, z0 + S - 1, Math.PI], [x0 + 1, z0 + t, Math.PI / 2], [x0 + S - 1, z0 + t, -Math.PI / 2]); }
      if (PARKS.includes(bx + ',' + bz)) {
        const pg = new T.BoxGeometry(S - 4, 0.06, S - 4); pg.translate(cx, 0.19, cz); parkGeos.push(pg);
        for (let i = 0; i < 26; i++) { const tx = x0 + 5 + R() * (S - 10), tz = z0 + 5 + R() * (S - 10); trees.push([tx, tz, 0.8 + R() * 0.7]); addCol(tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4); }
        continue;
      }
      const turf = inTurf(cx, cz);
      for (let lx = 0; lx < 2; lx++) for (let lz = 0; lz < 2; lz++) {
        const [px, pz] = lotC(bx, bz, lx, lz);
        if (special.has(px + ',' + pz)) continue;
        const d = Math.hypot(px, pz), w = 18 + R() * 5, dd = 18 + R() * 5;
        let h = 10 + 50 * Math.exp(-(d * d) / (150 * 150)) * (0.45 + R() * 0.8) + R() * 8; h = Math.max(7, Math.round(h / 3.5) * 3.5 + 0.8);
        const p = turf ? pal[5] : pal[Math.floor(R() * (h > 38 ? 5 : 4))];
        const g = new T.BoxGeometry(w, h, dd), uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          const f = Math.floor(i / 4);
          if (f === 2 || f === 3) { uv.setXY(i, 0.01, 0.99); continue; }
          const span = f < 2 ? dd : w; uv.setXY(i, uv.getX(i) * span / 20, uv.getY(i) * h / 14);
        }
        g.translate(px, h / 2 + 0.16, pz); p.geos.push(g);
        const rg = new T.BoxGeometry(w - 1.2, 0.7, dd - 1.2); rg.translate(px, h + 0.16 + 0.35, pz); roofGeos.push(rg);
        if (R() < 0.5) { const ac = new T.BoxGeometry(2.4, 1.4, 2.4); ac.translate(px + (R() - 0.5) * (w - 6), h + 0.16 + 1.2, pz + (R() - 0.5) * (dd - 6)); roofGeos.push(ac); }
        addCol(px - w / 2, pz - dd / 2, px + w / 2, pz + dd / 2);
        if (R() < 0.35) { const side = R() < 0.5 ? 1 : -1; trees.push([px + side * (w / 2 + 2.2), pz + (R() - 0.5) * 10, 0.7]); }
      }
    }
    for (const p of pal) if (p.geos.length) { const m = new T.Mesh(merge(p.geos), p.mat); m.castShadow = m.receiveShadow = true; scene.add(m); }
    const addMerged = (geos, mat, cast) => { const m = new T.Mesh(merge(geos), mat); m.castShadow = !!cast; m.receiveShadow = true; scene.add(m); return m; };
    addMerged(roofGeos, M('#6c717a'), true);
    addMerged(walkGeos, M('#b9bec7', { roughness: 0.95 }), false);
    addMerged(parkGeos, M('#5f9e4b'), false);

    // shelters: home garage + hideouts
    const shelter = (c, roofCol, padCol, label, labelBg) => {
      const roof = box(19, 0.5, 19, M(roofCol), c.x, 5.4, c.z, scene); roof.receiveShadow = true;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { box(0.6, 5.2, 0.6, M('#4a4f57'), c.x + sx * 9.2, 2.7, c.z + sz * 9.2, scene); addCol(c.x + sx * 9.2 - 0.3, c.z + sz * 9.2 - 0.3, c.x + sx * 9.2 + 0.3, c.z + sz * 9.2 + 0.3); }
      box(19, 5.2, 0.4, M('#8a8f98'), c.x, 2.7, c.z + 9.6, scene); addCol(c.x - 9.5, c.z + 9.4, c.x + 9.5, c.z + 9.8);
      box(0.4, 5.2, 19, M('#8a8f98'), c.x + 9.6, 2.7, c.z, scene); addCol(c.x + 9.4, c.z - 9.5, c.x + 9.8, c.z + 9.5);
      const pad = new T.Mesh(new T.PlaneGeometry(17, 17), M(padCol, { emissive: padCol, emissiveIntensity: 0.25 })); pad.rotation.x = -Math.PI / 2; pad.position.set(c.x, 0.18, c.z); pad.receiveShadow = true; scene.add(pad);
      const s = textSprite(label, labelBg, '#fff', 9, 2.2); s.position.set(c.x - 2, 7.4, c.z - 2); scene.add(s);
    };
    shelter(GARAGE, '#2b6b4f', '#7fd6a8', '🔧 GARAGE', '#14c79a');
    for (const h of HIDEOUTS) shelter(h, '#25304a', '#5d7bd6', '🅷 HIDEOUT', '#2f6bff');
    for (const [x, z] of [[TURF.x0, (TURF.z0 + TURF.z1) / 2], [TURF.x1, (TURF.z0 + TURF.z1) / 2], [RX(5), TURF.z0], [RX(5), TURF.z1]]) { const s = textSprite('🐍 RED VIPERS TURF', '#b3162a', '#fff', 11, 2.0); s.position.set(x, 8, z); scene.add(s); }

    // lamps (instanced)
    {
      const pole = new T.CylinderGeometry(0.1, 0.13, 6.5, 6); pole.translate(0, 3.25, 0);
      const arm = new T.BoxGeometry(0.12, 0.12, 2.2); arm.translate(0, 6.4, 1.0);
      const lamp = new T.BoxGeometry(0.5, 0.18, 0.8); lamp.translate(0, 6.3, 2.0);
      const im1 = new T.InstancedMesh(merge([pole, arm]), M('#5a6070', { metalness: 0.5, roughness: 0.5 }), lamps.length);
      const im2 = new T.InstancedMesh(lamp, M('#fffbe6', { emissive: '#fff1c2', emissiveIntensity: 0.6 }), lamps.length);
      const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1);
      lamps.forEach(([x, z, r], i) => { q.setFromEuler(e.set(0, r, 0)); m.compose(new T.Vector3(x, 0.16, z), q, one); im1.setMatrixAt(i, m); im2.setMatrixAt(i, m); });
      im1.castShadow = true; scene.add(im1); scene.add(im2);
    }
    // trees (instanced)
    const addTrees = (list) => {
      const trunk = new T.CylinderGeometry(0.18, 0.26, 2.2, 6); trunk.translate(0, 1.1, 0);
      const leaf = new T.IcosahedronGeometry(1.7, 0); leaf.translate(0, 3.3, 0);
      const t1 = new T.InstancedMesh(trunk, M('#6b4a2f'), list.length), t2 = new T.InstancedMesh(leaf, M('#3f8a3a', { flatShading: true }), list.length);
      const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
      list.forEach(([x, z, s], i) => { q.setFromEuler(e.set(0, Math.random() * 6, 0)); m.compose(new T.Vector3(x, ground(x, z) + 0.1, z), q, new T.Vector3(s, s, s)); t1.setMatrixAt(i, m); t2.setMatrixAt(i, m); t2.setColorAt(i, c.setHSL(0.27 + Math.random() * 0.08, 0.45, 0.3 + Math.random() * 0.12)); });
      t1.castShadow = t2.castShadow = true; scene.add(t1); scene.add(t2);
    };

    // off-road park
    {
      const W = BOUND.x1 + 4 - PARK_X0, H = BOUND.z1 - BOUND.z0 + 8, cx = PARK_X0 + W / 2;
      const g = new T.PlaneGeometry(W, H, Math.round(W / 1.5), Math.round(H / 1.5)); g.rotateX(-Math.PI / 2); g.translate(cx, 0, 0);
      const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color(), dirt = new T.Color('#a8794a'), dark = new T.Color('#7d5634'), green = new T.Color('#6ea85a'), wood = new T.Color('#c89b5e');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), h = ground(x, z); p.setY(i, h);
        c.copy(dirt).lerp(dark, clamp(0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.4) * Math.sin(z * 0.9), 0, 1) * 0.5);
        c.lerp(green, 1 - smooth(PARK_X0, PARK_X0 + 12, x));
        if (RAMPS.some((r) => { const px = x - r.x, pz = z - r.z, a = px * r.dx + pz * r.dz, b = -px * r.dz + pz * r.dx; return a > -0.5 && a < r.len + 0.5 && Math.abs(b) < r.w / 2; })) c.copy(wood);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
      const sign = textSprite('⛰️ OFF-ROAD PARK', '#8a5a1f', '#fff', 12, 2.4); sign.position.set(PARK_X0 + 6, 9, RX(2)); scene.add(sign);
      for (let i = 0; i < 60; i++) { const x = PARK_X0 + 14 + Math.random() * (W - 20), z = BOUND.z0 + 10 + Math.random() * (H - 30); if (RACES[1].cps.some(([a, b]) => Math.hypot(a - x, b - z) < 20) || Math.abs(x - 238) < 10) continue; trees.push([x, z, 0.8 + Math.random() * 0.6]); addCol(x - 0.4, z - 0.4, x + 0.4, z + 0.4); }
      // rally flags
      for (const [x, z] of RACES[1].cps) for (const s of [-1, 1]) { const f = box(0.15, 3, 0.15, M('#ffffff'), x + s * 8, ground(x + s * 8, z) + 1.5, z, scene); const fl = box(0.05, 0.8, 1.2, M(s > 0 ? '#ff4d5e' : '#2f6bff'), 0, 1.1, 0.6, f, false); fl.castShadow = false; }
    }
    addTrees(trees);
    // boundary barriers
    const bar2 = M('#c7cbd2');
    box(BOUND.x1 - BOUND.x0 + 4, 1.2, 1, bar2, (BOUND.x0 + BOUND.x1) / 2, 0.6, BOUND.z0 - 0.5, scene);
    box(BOUND.x1 - BOUND.x0 + 4, 1.2, 1, bar2, (BOUND.x0 + BOUND.x1) / 2, 0.6, BOUND.z1 + 0.5, scene);
    box(1, 1.2, BOUND.z1 - BOUND.z0, bar2, BOUND.x0 - 0.5, 0.6, 0, scene);
    box(1, 9, BOUND.z1 - BOUND.z0, M('#9a8a73'), BOUND.x1 + 0.5, 2, 0, scene);
    // distant hills
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU + Math.random() * 0.1, r = 560 + Math.random() * 80, h = 50 + Math.random() * 110;
      const c = new T.Mesh(new T.ConeGeometry(70 + Math.random() * 70, h, 7), M('#6d8f7a', { flatShading: true })); c.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); scene.add(c);
    }
    initFx();
    buildMiniBase();
    addEventListener('resize', resize);
  }

  /* ---- particles ---- */
  const PARTS = [];
  function initFx() {
    const tex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    for (let i = 0; i < 110; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); PARTS.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, a: 1 }); }
  }
  let partI = 0;
  function puff(x, y, z, color, size, life, vx = 0, vy = 0, vz = 0, grow = 1, a = 0.8) {
    const p = PARTS[partI++ % PARTS.length];
    p.s.position.set(x, y, z); p.s.scale.set(size, size, 1); p.s.material.color.set(color); p.s.material.opacity = a; p.s.visible = true;
    Object.assign(p, { life, max: life, vx, vy, vz, grow, a });
  }
  function updFx(dt) {
    for (const p of PARTS) {
      if (p.life <= 0) continue;
      p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.vx *= 0.96; p.vz *= 0.96;
      const sc = p.s.scale.x + p.grow * dt; p.s.scale.set(sc, sc, 1); p.s.material.opacity = (p.life / p.max) * p.a;
    }
  }
  function boom(x, y, z) {
    for (let i = 0; i < 18; i++) puff(x, y + 1, z, i % 3 ? '#ff8a1a' : '#ffd23f', 1.5 + Math.random(), 0.6 + Math.random() * 0.4, rand(-6, 6), rand(2, 8), rand(-6, 6), 3, 1);
    for (let i = 0; i < 10; i++) puff(x, y + 1.5, z, '#3a3a40', 2, 1.6 + Math.random(), rand(-2, 2), rand(1, 3), rand(-2, 2), 2.5, 0.7);
  }

  /* ================= vehicles ================= */
  function makeVeh(id, kind, stats, parts) {
    const b = specOf(id).body || {};
    const v = { id, kind, s: stats, m: parts, x: 0, z: 0, y: 0, vy: 0, h: 0, vx: 0, vz: 0, st: 0, vF: 0, slip: 0, hp: stats.hp, nitro: 1, nOn: false, air: false, pitch: 0, roll: 0, spin: 0, brk: 0, dead: false, ai: {} };
    if (stats.bike) { v.cr = 0.5; v.co = [-0.55, 0.55]; }
    else { const L = parts.L || b.L || 4, W = parts.W || b.W || 1.9; v.cr = W / 2; const n = Math.max(2, Math.round((L - W) / v.cr) + 1); v.co = []; for (let i = 0; i < n; i++) v.co.push(-(L / 2 - v.cr) + (i * (L - W)) / (n - 1)); }
    scene.add(parts.g);
    return v;
  }
  const fwdSpeed = (v) => v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h);
  const NOIN = { thr: 0, brk: 0, steer: 0, hand: true, nitro: false };
  function stepVeh(v, inp, dt) {
    const s = v.s, sh = Math.sin(v.h), ch = Math.cos(v.h);
    let vF = v.vx * sh + v.vz * ch, vS = -v.vx * ch + v.vz * sh;
    const dirt = v.x > PARK_X0 + 2;
    const tm = dirt ? (s.off ? 0.97 : 0.58) : s.off ? 0.94 : 1, gm = dirt ? (s.off ? 0.95 : 0.55) : 1;
    v.nOn = !!(inp.nitro && v.nitro > 0.02 && inp.thr > 0 && !v.air);
    if (v.nOn) v.nitro = Math.max(0, v.nitro - (dt * 0.3) / s.ncap); else v.nitro = Math.min(1, v.nitro + dt * 0.05 * s.nref);
    const top = s.top * tm * (v.nOn ? 1.3 : 1) * (v.ai.topMul || 1), acc = s.acc * (dirt && !s.off ? 0.7 : 1) * (v.nOn ? 1.7 : 1);
    v.brk = inp.brk > 0 && vF > 0.5 ? 1 : 0;
    if (!v.air) {
      if (inp.thr > 0) { if (vF < -0.5) vF += 20 * dt * inp.thr; else vF += acc * inp.thr * Math.max(0, 1 - (vF / top) * (vF / top)) * dt; }
      if (inp.brk > 0) { if (vF > 0.5) vF -= 24 * inp.brk * dt; else vF = Math.max(-top * 0.28, vF - acc * 0.6 * inp.brk * dt); }
      if (vF > top) vF -= (vF - top) * 1.2 * dt;
      const idle = inp.thr <= 0 && inp.brk <= 0;
      vF -= vF * (idle ? 0.3 : 0.02) * dt; if (idle && Math.abs(vF) < 0.3) vF = 0;
      if (inp.hand) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 9 * dt);
      v.st += (inp.steer - v.st) * Math.min(1, dt * (s.bike ? 6 : 8));
      const ang = ((0.55 * s.turn) / (1 + Math.abs(vF) / 8)) * v.st;
      v.h -= (vF / (s.bike ? 1.45 : 2.6)) * Math.tan(ang) * (inp.hand && Math.abs(vF) > 5 ? 1.5 : 1) * dt;
      vS *= Math.exp(-s.grip * gm * (inp.hand ? 0.15 : 1) * dt);
      v.slip = Math.abs(vS);
    } else { v.st += (inp.steer - v.st) * Math.min(1, dt * 4); vF -= vF * 0.01 * dt; v.slip = 0; }
    v.vx = sh * vF - ch * vS; v.vz = ch * vF + sh * vS; v.vF = vF;
    v.x += v.vx * dt; v.z += v.vz * dt;
    // vertical: follow the ground, or fly off crests and ramps
    const gy = ground(v.x, v.z);
    if (v.air) {
      v.vy -= 22 * dt; v.y += v.vy * dt;
      if (v.y <= gy) { const imp = -v.vy; v.y = gy; v.air = false; v.vy = 0; if (imp > 6) { hurt(v, (imp - 6) * 2.5); if (v === P) { sfx('land'); G.shake = Math.min(1, imp / 14); } } }
    } else {
      const pred = v.y + v.vy * dt - 11 * dt * dt;
      if (pred > gy + 0.06 && Math.abs(vF) > 6) { v.air = true; v.vy -= 22 * dt; v.y = pred; }
      else { v.vy = clamp((gy - v.y) / dt, -30, 25); v.y = gy; }
    }
    v.spin += (vF / (v.m.wr || 0.34)) * dt;
    // buildings and world edge
    let impact = 0;
    for (const o of v.co) impact = Math.max(impact, collideWorld(v, v.x + Math.sin(v.h) * o, v.z + Math.cos(v.h) * o, v.cr));
    if (impact > 3) onImpact(v, impact);
  }
  function onImpact(v, impact) {
    hurt(v, Math.max(0, impact - 4) * 2.4 * (v.s.bike ? 1.5 : 1) * (v.kind === 'rival' ? 0.45 : 1));
    if (v === P || v.kind !== 'traffic') {
      const near = P && Math.hypot(v.x - P.x, v.z - P.z) < 60;
      if (near && v.ai.sndT === undefined) v.ai.sndT = 0;
      if (near && G.t - (v.ai.sndT || 0) > 0.25) { v.ai.sndT = G.t; sfx(impact > 9 ? 'crash' : 'hit', { volume: v === P ? 1 : 0.5 }); }
      if (impact > 7) for (let i = 0; i < 6; i++) puff(v.x, v.y + 0.7, v.z, '#ffd27a', 0.35, 0.35, rand(-5, 5), rand(1, 5), rand(-5, 5), -0.5, 1);
      if (v === P) G.shake = Math.min(1, G.shake + impact / 16);
    }
  }
  function hurt(v, n) {
    if (!(n > 0) || v.dead || v.kind === 'traffic') return;
    if (v === P && (G.mode !== 'drive' || G.race)) { if (v === P && G.race) n *= 0.5; else return; }
    if (v === P) n = Math.min(n, 30); // one hit never takes more than 30
    v.hp -= n * (1 - 0.1 * (v.s.armor || 0));
    if (v.hp <= 0) { v.hp = 0; wreck(v); }
  }
  function wreck(v) {
    if (v.dead) return; v.dead = true; boom(v.x, v.y, v.z);
    if (Math.hypot(v.x - (P ? P.x : 0), v.z - (P ? P.z : 0)) < 120) sfx('explode');
    v.m.paint.color.set('#2a2a2e'); v.ai.deadT = 0;
    if (v === P) { SV.stats.wrecks++; save(); setTimeout(() => { if (!G.on) return; G.paused = true; G.over = true; modal(`<h2>Wrecked!</h2><p class="muted">Your ${specOf(P.id).name} is towed back to your garage and repaired for free. Any job you had is lost.</p><div class="modal-actions"><button class="btn primary" data-a="tow">Tow me to the garage</button></div>`, { tow: () => { closeModal(); respawn(); } }); }, 1200); }
    else if (v.kind === 'rival') { SV.stats.rivals++; save(); reward(50, 'Viper wrecked'); }
  }

  /* ---- traffic ---- */
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const okNode = (i, j) => i >= 0 && i <= NB && j >= 0 && j <= NB;
  function laneP(i, j, d, entry) { const [dx, dz] = DIRS[d], k = entry ? -HALF - 1 : HALF + 1; return [RX(i) + dx * k + dz * LANE, RX(j) + dz * k - dx * LANE]; }
  function makeTraffic() {
    const kind = pick(['hatch', 'hatch', 'sedan', 'sedan', 'suv', 'van', 'truck', 'taxi']);
    const b = TBODY[kind === 'taxi' ? 'hatch' : kind], col = kind === 'taxi' ? '#1b1d22' : kind === 'truck' ? pick(['#d6dbe3', '#2f6bff', '#d61f30']) : pick(TCOLORS);
    const parts = carModel(b, col, { lite: true, taxi: kind === 'taxi', shirt: pick(['#ffffff', '#ff8a3d', '#2f6bff', '#14c79a', '#16203d']), skin: pick(['#f1c27d', '#c68642', '#8d5524', '#e0ac69']) });
    if (kind === 'taxi') { const y = new T.MeshStandardMaterial({ color: '#ffd23f', metalness: 0.3, roughness: 0.4 }); box(b.W + 0.01, b.H * 0.55, b.L * 0.55, y, 0, b.clr + b.H * 0.72, b.cabZ, parts.g, false); }
    const t = { kind: 'traffic', m: parts, sp: 0, max: kind === 'truck' ? rand(8, 10) : rand(9.5, 13), x: 0, z: 0, y: 0, h: 0, vx: 0, vz: 0, path: [], stopT: 0, waitT: 0, ghostT: 0, s: { mass: kind === 'truck' ? 4 : 2.5 }, ai: {} };
    t.cr = b.W / 2; const n = Math.max(2, Math.round((b.L - b.W) / t.cr) + 1); t.co = []; for (let k = 0; k < n; k++) t.co.push(-(b.L / 2 - t.cr) + (k * (b.L - b.W)) / (n - 1));
    scene.add(parts.g); placeTraffic(t); return t;
  }
  function placeTraffic(t, far) {
    for (let tries = 0; tries < 30; tries++) {
      const i = Math.floor(Math.random() * 7), j = Math.floor(Math.random() * 7), d = Math.floor(Math.random() * 4), ni = i + DIRS[d][0], nj = j + DIRS[d][1];
      if (!okNode(ni, nj)) continue;
      const [ax, az] = laneP(i, j, d, false), [bx, bz] = laneP(ni, nj, d, true), f = Math.random();
      const x = ax + (bx - ax) * f, z = az + (bz - az) * f;
      if (far && P && Math.hypot(x - P.x, z - P.z) < 120) continue;
      if (G.traffic.some((o) => o !== t && Math.hypot(o.x - x, o.z - z) < 14)) continue;
      t.x = x; t.z = z; t.h = Math.atan2(DIRS[d][0], DIRS[d][1]); t.d = d; t.ni = ni; t.nj = nj; t.path = [{ p: [bx, bz], turn: false }]; t.sp = t.max * 0.6; return;
    }
  }
  function stepTraffic(t, dt) {
    if (!t.path.length) {
      const opts = [0, 1, 2, 3].filter((k) => k !== (t.d + 2) % 4 && okNode(t.ni + DIRS[k][0], t.nj + DIRS[k][1]));
      const nd = Math.random() < 0.5 && opts.includes(t.d) ? t.d : pick(opts);
      t.path.push({ p: laneP(t.ni, t.nj, nd, false), turn: nd !== t.d });
      t.ni += DIRS[nd][0]; t.nj += DIRS[nd][1]; t.d = nd;
      t.path.push({ p: laneP(t.ni, t.nj, nd, true), turn: false });
    }
    const seg = t.path[0], dx = seg.p[0] - t.x, dz = seg.p[1] - t.z, dist = Math.hypot(dx, dz);
    // look ahead for anything in the lane
    const fx = Math.sin(t.h), fz = Math.cos(t.h);
    let blocked = false, byPlayer = false;
    const check = (o, isTraffic) => {
      if (o === t || (isTraffic && t.ghostT > 0)) return;
      const ox = o.x - t.x, oz = o.z - t.z, ahead = ox * fx + oz * fz, side = Math.abs(-ox * fz + oz * fx);
      if (ahead > 0 && ahead < 11 + t.sp * 0.4 && side < 2.4) { blocked = true; if (o === P || o === F) byPlayer = true; }
    };
    if (P) check(P); if (G.mode === 'foot') check(F);
    for (const o of G.rivals) check(o); for (const o of G.bots) check(o);
    for (const o of G.traffic) check(o, true);
    if (t.ghostT > 0) t.ghostT -= dt;
    let want = seg.turn || (t.path[1] && t.path[1].turn && dist < 14) ? 6 : t.max;
    if (blocked || t.stopT > 0) want = 0;
    if (t.stopT > 0) t.stopT -= dt;
    if (blocked) { t.waitT += dt; if (t.waitT > 4 && !byPlayer) { t.ghostT = 2; t.waitT = 0; } if (byPlayer && t.waitT > 1.5 && Math.random() < dt * 0.6 && Math.hypot(P.x - t.x, P.z - t.z) < 40) sfx('horn', { volume: 0.3 }); }
    else t.waitT = 0;
    t.sp += clamp(want - t.sp, -14 * dt, 4 * dt);
    const step = t.sp * dt;
    if (dist <= step + 0.05) { t.x = seg.p[0]; t.z = seg.p[1]; t.path.shift(); }
    else { t.x += (dx / dist) * step; t.z += (dz / dist) * step; }
    if (dist > 0.3) t.h += wrapA(Math.atan2(dx, dz) - t.h) * Math.min(1, dt * 7);
    t.vx = Math.sin(t.h) * t.sp; t.vz = Math.cos(t.h) * t.sp;
  }

  /* ---- AI driving ---- */
  function steerTo(v, tx, tz, want) {
    const d = wrapA(Math.atan2(tx - v.x, tz - v.z) - v.h), sp = fwdSpeed(v);
    const inp = { thr: 1, brk: 0, steer: clamp(-d * 2.4, -1, 1), hand: false, nitro: false };
    if (Math.abs(d) > 1.1 && sp > 12) { inp.thr = 0; inp.brk = 0.7; }
    if (want != null && sp > want) { inp.thr = 0; inp.brk = clamp((sp - want) / 6, 0, 1); }
    // stuck against something: back up and turn
    const a = v.ai;
    if (a.rev > 0) { a.rev -= 1 / 60; return { thr: 0, brk: 1, steer: a.revSteer, hand: false, nitro: false }; }
    if (Math.abs(sp) < 1.2 && inp.thr > 0) { a.stuck = (a.stuck || 0) + 1 / 60; if (a.stuck > 1.4) { a.stuck = 0; a.rev = 1.3; a.revSteer = d > 0 ? 1 : -1; } } else a.stuck = 0;
    return inp;
  }
  const nearestNode = (x, z) => [clamp(Math.round((x - R0) / CELL), 0, NB), clamp(Math.round((z - R0) / CELL), 0, NB)];
  function rivalAI(v, dt) {
    const a = v.ai, px = G.mode === 'drive' ? P.x : F.x, pz = G.mode === 'drive' ? P.z : F.z, dist = Math.hypot(px - v.x, pz - v.z);
    if (a.knowT > 0) { a.knowT -= dt; a.last = [px, pz]; }
    a.sees = !G.hidden && dist < 150 && los(v.x, v.z, px, pz);
    if (a.leaving) { if (!a.home) a.home = nearestNode(v.x + rand(-150, 150), v.z + rand(-150, 150)); const [i, j] = a.home; return steerTo(v, RX(i), RX(j), 16); }
    if (a.sees) {
      a.last = [px, pz];
      const lead = G.mode === 'drive' ? Math.min(1, dist / 30) : 0;
      v.ai.topMul = dist > 90 ? 1.25 : 1;
      const inp = steerTo(v, px + P.vx * lead * (G.mode === 'drive' ? 1 : 0), pz + P.vz * lead * (G.mode === 'drive' ? 1 : 0));
      inp.nitro = dist < 40 && dist > 8; return inp;
    }
    v.ai.topMul = 1;
    // no sight: follow the road grid towards where they last saw you
    const goal = a.last || [px, pz];
    if (v.x > PARK_X0) return steerTo(v, goal[0], goal[1], 18);
    if (!a.node || Math.hypot(RX(a.node[0]) - v.x, RX(a.node[1]) - v.z) < 9) {
      const [ci, cj] = a.node || nearestNode(v.x, v.z); let best = null, bd = 1e9;
      if (Math.hypot(goal[0] - v.x, goal[1] - v.z) < 12) a.last = [rand(-200, 200), rand(-200, 200)]; // reached it: search somewhere else
      for (const [dx, dz] of DIRS) { const ni = ci + dx, nj = cj + dz; if (!okNode(ni, nj)) continue; const dd = Math.hypot(RX(ni) - goal[0], RX(nj) - goal[1]) + Math.random() * 30; if (dd < bd) { bd = dd; best = [ni, nj]; } }
      a.node = a.node ? best : [ci, cj];
    }
    return steerTo(v, RX(a.node[0]), RX(a.node[1]), 20);
  }
  function botAI(v) {
    const r = G.race, cps = r.def.cps, c = cps[v.ai.cp], next = cps[(v.ai.cp + 1) % cps.length];
    const d = Math.hypot(c[0] - v.x, c[1] - v.z);
    const turn = next ? Math.abs(wrapA(Math.atan2(next[0] - c[0], next[1] - c[1]) - Math.atan2(c[0] - v.x, c[1] - v.z))) : 0;
    const want = d < 30 && turn > 0.6 ? (r.def.id === 'rally' ? 15 : 13) + (1.6 - Math.min(1.6, turn)) * 8 : null;
    // rubber band so races stay close
    const lead = progress(v) - progress(P);
    v.ai.topMul = lead > 0.6 ? 0.88 : lead < -0.6 ? 1.12 : 1;
    const off = v.ai.lane * (d > 30 ? 3 : 0);
    const nx = c[0] - v.x, nz = c[1] - v.z, nl = Math.hypot(nx, nz) || 1;
    return steerTo(v, c[0] + (nz / nl) * off, c[1] - (nx / nl) * off, want);
  }

  /* ================= game state ================= */
  const G = { on: false, paused: false, over: false, mode: 'foot', cam: 'chase', camH: 0, heat: 0, rivals: [], traffic: [], bots: [], offers: [], job: null, race: null, earned: 0, escT: 0, heatT: 0, hidden: false, shake: 0, t: 0, spawnT: 0, hudT: 0, mapT: 0, skidT: 0, dustT: 0, repairMsg: 0 };
  let P = null, engine = null, raf = 0, last = 0;
  const F = { x: 0, z: 0, y: 0, h: 0, vx: 0, vz: 0, hp: 100, walk: 0, hitT: 0, m: null };
  let arrow = null, ring = null, markGroup = null;

  function modal(html, actions) { LSPG.modal('drive-modal', html, actions); }
  function closeModal() { LSPG.closeModal('drive-modal'); }
  let popT = 0;
  function pop(text) { const e = $('#d-pop'); e.textContent = text; e.classList.add('on'); clearTimeout(popT); popT = setTimeout(() => e.classList.remove('on'), 1800); }
  function reward(n, why) { const got = Wallet.add(n); G.earned += got; SV.stats.earned += got; save(); sfx('cash'); pop(`+${got.toLocaleString()} ⭐ ${why}`); return got; }

  function setPlayerVehicle() {
    if (P) { scene.remove(P.m.g); }
    const st = statsOf(SV.cur), sp = specOf(SV.cur), col = paintOf(SV.cur);
    const shirt = '#2f6bff';
    const parts = st.bike ? bikeModel(sp.body, col, { shirt, helmet: col === '#ffffff' ? '#16203d' : '#ffffff' }) : carModel(sp.body, col, { shirt });
    P = makeVeh(SV.cur, 'player', st, parts);
    P.x = GARAGE.x; P.z = GARAGE.z; P.h = Math.PI; P.y = 0;
    parts.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  function respawn() {
    if (P) { P.dead = false; }
    setPlayerVehicle();
    clearHeat(true); G.job = null; endRace(true);
    G.mode = 'foot'; F.x = GARAGE.x + 2.6; F.z = GARAGE.z; F.h = Math.PI; F.hp = 100; F.m.visible = true; P.m.driver.visible = false;
    G.over = false; G.paused = false; G.camH = F.h; camPos.init = false; stopEngine();
    refreshOffers();
  }

  /* ---- jobs ---- */
  function roadSpot(minDist, from) {
    for (let k = 0; k < 60; k++) {
      const axis = Math.random() < 0.5, i = Math.floor(Math.random() * 7), t = rand(-205, 205);
      if ([0, 1, 2, 3, 4, 5, 6].some((q) => Math.abs(t - RX(q)) < 14)) continue;
      const side = Math.random() < 0.5 ? -1 : 1, x = axis ? t : RX(i) + side * 4.5, z = axis ? RX(i) + side * 4.5 : t;
      if (from && Math.hypot(x - from[0], z - from[1]) < minDist) continue;
      if (P && !from && Math.hypot(x - P.x, z - P.z) < 50) continue;
      return [x, z];
    }
    return [RX(3) + 4.5, RX(3) + 30];
  }
  function markerMesh(color, icon) {
    const g = new T.Group();
    const cyl = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 2.4, 28, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, side: T.DoubleSide, depthWrite: false }));
    cyl.position.y = 1.2; g.add(cyl);
    const disc = new T.Mesh(new T.CircleGeometry(2.6, 28), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; g.add(disc);
    const s = textSprite(icon, null, '#000', 2.4, 2.4, '400 360px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'); s.position.y = 4; g.add(s); g.userData.icon = s;
    scene.add(g); return g;
  }
  function refreshOffers() {
    for (const o of G.offers) scene.remove(o.mesh);
    G.offers = JOBS.map((j, i) => { const [x, z] = roadSpot(0); const mesh = markerMesh(j.color, j.icon); mesh.position.set(x, 0, z); return { tier: i, x, z, mesh }; });
  }
  function takeJob(o) {
    const j = JOBS[o.tier], [x, z] = roadSpot(220, [o.x, o.z]), dist = Math.hypot(x - o.x, z - o.z);
    for (const q of G.offers) scene.remove(q.mesh); G.offers = [];
    const mesh = markerMesh('#14c79a', '🏠'); mesh.position.set(x, 0, z);
    G.job = { tier: o.tier, x, z, mesh, time: Math.round(dist / 10 + 35), reward: Math.round(j.base + dist * 0.35), dist };
    sfx('pop'); pop(`${j.icon} ${j.name} picked up`);
    if (j.heat) setHeat(Math.max(G.heat, j.heat), `The ${GANG} want that package!`);
  }
  function finishJob(ok) {
    const J = G.job; if (!J) return; scene.remove(J.mesh); G.job = null;
    if (ok) { SV.stats.jobs++; reward(J.reward + (G.heat ? 40 : 0), 'Delivered'); sfx('win', { volume: 0.6 }); }
    else { sfx('lose', { volume: 0.6 }); pop('Too slow. The job was cancelled.'); }
    refreshOffers();
  }

  /* ---- heat / rivals ---- */
  function setHeat(n, why) {
    if (G.race) return;
    if (n > G.heat) { if (!G.heat) G.heatT = 0; G.heat = clamp(n, 0, 3); G.escT = 0; sfx('siren', { volume: 0.5 }); if (why) toast('🐍 ' + why, 3000); }
  }
  function clearHeat(silent) {
    for (const r of G.rivals) { r.ai.leaving = true; r.ai.home = r.ai.home || nearestNode(r.x + rand(-150, 150), r.z + rand(-150, 150)); r.ai.leaveT = 0; }
    if (!silent && G.heat) { SV.stats.escapes++; reward(40 * G.heat, `You lost the ${GANG}`); }
    G.heat = 0; G.escT = 0;
  }
  function spawnRival() {
    const px = G.mode === 'drive' ? P.x : F.x, pz = G.mode === 'drive' ? P.z : F.z;
    let best = null;
    for (let k = 0; k < 40; k++) { const i = Math.floor(Math.random() * 7), j = Math.floor(Math.random() * 7), d = Math.hypot(RX(i) - px, RX(j) - pz); if (d > 90 && d < 190 && !los(RX(i), RX(j), px, pz)) { best = [i, j]; break; } if (!best && d > 80) best = [i, j]; }
    if (!best) return;
    const parts = carModel(VEH[2].body, '#141418', { stripe: '#e3263a', shirt: '#e3263a', helmet: '#141418' });
    const st = { top: 34 + G.heat * 4, acc: 10, grip: 12, turn: 1.05, armor: 0, hp: 70, ncap: 1, nref: 1, off: false, bike: false, mass: 1.1 };
    const v = makeVeh('sports', 'rival', st, parts);
    v.x = RX(best[0]); v.z = RX(best[1]); v.h = Math.atan2(px - v.x, pz - v.z); v.ai = { node: null, last: [px, pz], knowT: 8 };
    G.rivals.push(v);
  }

  /* ---- races ---- */
  const progress = (v) => { const r = G.race; if (!r) return 0; const c = r.def.cps[Math.min(v.ai.cp, r.def.cps.length - 1)]; return v.ai.lap * r.def.cps.length + v.ai.cp - Math.min(1, Math.hypot(c[0] - v.x, c[1] - v.z) / 400); };
  function askRace(def) {
    if (G.heat) { pop(`Lose the ${GANG} first`); return; }
    if (G.job) { pop('Finish your delivery first'); return; }
    G.paused = true;
    const off = def.id === 'rally', tip = off && !P.s.off ? '<p class="muted"><b>Tip:</b> your ride is not built for dirt. An off-road jeep or dirt bike is much faster here.</p>' : '';
    modal(`<h2>${def.name}</h2><p class="muted">Race 3 rivals through ${def.cps.length} checkpoints. Win ⭐ ${def.reward[0]} for 1st, ${def.reward[1]} for 2nd, ${def.reward[2]} for 3rd.</p>${tip}<div class="modal-actions"><button class="btn primary" data-a="go">Start race</button><button class="btn ghost" data-a="no">Not now</button></div>`,
      { go: () => { closeModal(); G.paused = false; startRace(def); }, no: () => { closeModal(); G.paused = false; G.raceCool = 6; } });
  }
  function startRace(def) {
    clearHeat(true); for (const r of G.rivals) scene.remove(r.m.g); G.rivals = [];
    const gh = def.grid.h, fx = Math.sin(gh), fz = Math.cos(gh), rx = -Math.cos(gh), rz = Math.sin(gh);
    const slot = (k) => [def.grid.x - fx * (k >> 1) * 9 + rx * ((k & 1) ? 3.5 : -3.5), def.grid.z - fz * (k >> 1) * 9 + rz * ((k & 1) ? 3.5 : -3.5)];
    const [px, pz] = slot(0); Object.assign(P, { x: px, z: pz, h: gh, vx: 0, vz: 0, y: ground(px, pz), vy: 0, air: false, hp: P.s.hp, nitro: 1 });
    P.ai.cp = 0; P.ai.lap = 0; P.ai.done = 0; G.camH = gh; camPos.init = false;
    const base = P.s.top * (def.id === 'rally' ? 0.97 : 1);
    G.bots = [0, 1, 2].map((k) => {
      const off = def.bots === 'off', bodyId = off ? (k === 1 ? 'dirt' : 'jeep') : pick(['sports', 'sedan', 'sports']);
      const sp = specOf(bodyId), col = ['#ff8a3d', '#7a3cff', '#14c79a'][k];
      const parts = sp.type === 'bike' ? bikeModel(sp.body, col, { shirt: col, helmet: '#ffffff' }) : carModel(sp.body, col, { shirt: col });
      const st = { top: base * (0.84 + 0.06 * k), acc: Math.max(8, P.s.acc * 0.95), grip: 12, turn: 1.05, armor: 2, hp: 999, ncap: 1, nref: 1, off, bike: sp.type === 'bike', mass: sp.mass };
      const v = makeVeh(bodyId, 'bot', st, parts), [x, z] = slot(k + 1);
      Object.assign(v, { x, z, h: gh, y: ground(x, z) }); v.ai = { cp: 0, lap: 0, lane: [-1, 1, 0][k], done: 0, name: ['Blaze', 'Nova', 'Turbo'][k] };
      return v;
    });
    G.race = { def, t: 0, count: 3.5, finished: [], placed: 0 };
    if (G.cam === 'seat' && P.s.bike) G.cam = 'chase';
    if (!ring) { ring = new T.Mesh(new T.TorusGeometry(6.2, 0.35, 8, 40), new T.MeshBasicMaterial({ color: '#3ad1ff', transparent: true, opacity: 0.85 })); scene.add(ring); }
    ring.visible = true;
    for (const o of G.offers) o.mesh.visible = false;
  }
  function endRace(silent) {
    if (!G.race) return;
    for (const b of G.bots) scene.remove(b.m.g); G.bots = []; G.race = null; if (ring) ring.visible = false;
    for (const o of G.offers) o.mesh.visible = true;
    $('#d-race').innerHTML = ''; $('#d-count').textContent = '';
    if (!silent) refreshOffers();
  }
  function passCheckpoints(v) {
    const r = G.race, cps = r.def.cps;
    if (v.ai.done) return;
    const c = cps[v.ai.cp];
    if (Math.hypot(c[0] - v.x, c[1] - v.z) < r.def.rad) {
      v.ai.cp++;
      if (v === P) sfx('ding', { volume: 0.6 });
      if (v.ai.cp >= cps.length) { v.ai.cp = 0; v.ai.lap++; if (v.ai.lap >= r.def.laps) { v.ai.done = 1; v.ai.cp = cps.length - 1; r.finished.push(v); if (v === P) finishRace(); } }
    }
  }
  function finishRace() {
    const r = G.race, place = r.finished.indexOf(P) + 1, got = reward(r.def.reward[place - 1] || 20, `${ord(place)} place`);
    SV.stats.races++; if (place === 1) SV.stats.wins++; save();
    sfx(place <= 3 ? 'win' : 'lose');
    const t = r.t, time = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    setTimeout(() => {
      if (!G.on) return; G.paused = true;
      modal(`<h2>${place === 1 ? 'You won!' : `You finished ${ord(place)}`}</h2><p class="big">⭐ +${got.toLocaleString()}</p><p class="muted">${r.def.name} in ${time}.${place > 1 ? ' Upgrades in the garage make a big difference.' : ''}</p><div class="modal-actions"><button class="btn primary" data-a="again">Race again</button><button class="btn ghost" data-a="city">Back to the city</button></div>`,
        { again: () => { closeModal(); G.paused = false; const d = r.def; endRace(true); startRace(d); }, city: () => { closeModal(); G.paused = false; endRace(); G.raceCool = 6; } });
    }, 900);
  }

  /* ---- entering and leaving the city ---- */
  async function startCity() {
    const btn = $('#drive-go'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
    show('s-drive'); $('#d-load').hidden = built;
    $('#s-drive').classList.toggle('touch', LSPG.isTouch());
    try {
      if (!built) {
        if (!loading) loading = import('./vendor/three.module.min.js').then((mod) => { T = mod; buildWorld(); built = true; });
        await loading;
      }
    } catch (e) {
      console.error(e); loading = null; $('#d-load').hidden = true; openLobby('play'); toast("Couldn't load the 3D city. Check your connection and try again.", 4000); return;
    }
    $('#d-load').hidden = true;
    if (!F.m) { F.m = person('#2f6bff', '#2d3a5c', '#f1c27d'); F.m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(F.m); }
    if (!arrow) {
      arrow = new T.Group(); const cone = new T.Mesh(new T.ConeGeometry(0.42, 1.3, 14), new T.MeshBasicMaterial({ color: '#ffd23f' })); cone.rotation.x = Math.PI / 2; arrow.add(cone); scene.add(arrow);
    }
    const n = LSPG.isTouch() ? 11 : 18;
    while (G.traffic.length < n) G.traffic.push(makeTraffic());
    G.earned = 0; G.on = true; G.cam = 'chase';
    respawn();
    pop('Walk to your ride and get in');
    resize();
    $('#d-mute').textContent = LSPG.muted && LSPG.muted() ? '🔇' : '🔊';
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stopCity() {
    if (!G.on) return;
    G.on = false; cancelAnimationFrame(raf); stopEngine(); closeModal();
    for (const k in K) K[k] = false; for (const k in TIN) TIN[k] = false;
    if (G.race) endRace(true);
    for (const r of G.rivals) scene.remove(r.m.g); G.rivals = []; G.heat = 0;
    if (G.job) { scene.remove(G.job.mesh); G.job = null; }
  }
  function togglePause() {
    if (!G.on || G.over) return;
    if (G.paused) { G.paused = false; closeModal(); return; }
    G.paused = true;
    modal(`<h2>Paused</h2><p class="muted">You keep every point you've earned.</p><div class="modal-actions"><button class="btn primary" data-a="r">Resume</button>${G.race ? '<button class="btn ghost" data-a="q">Quit race</button>' : ''}<button class="btn ghost" data-a="g">Garage &amp; upgrades</button><button class="btn ghost" data-a="l">Leave the city</button></div>`,
      { r: togglePause, q: () => { closeModal(); G.paused = false; endRace(); G.raceCool = 6; }, g: () => openLobby('garage'), l: () => { stopCity(); enterHub(); } });
  }
  function startEngine() { stopEngine(); if (LSPG.engine) engine = LSPG.engine(P.s.bike ? 'bike' : P.s.off ? 'big' : 'car'); }
  function stopEngine() { if (engine) { engine.stop(); engine = null; } }

  function action() {
    if (!G.on || G.paused || G.over) return;
    if (G.mode === 'foot') {
      if (Math.hypot(F.x - P.x, F.z - P.z) < (P.s.bike ? 2.6 : 3.6)) {
        G.mode = 'drive'; F.m.visible = false; P.m.driver.visible = true; sfx('door'); startEngine(); G.camH = P.h;
        if (!G.helped) { G.helped = true; pop(LSPG.isTouch() ? 'GAS to drive · 📷 to sit inside' : 'W to drive · C to sit inside'); }
      } else pop('Walk up to your ride to get in');
    } else {
      if (G.race) { pop('Finish the race first'); return; }
      if (Math.abs(fwdSpeed(P)) > 4) { pop('Slow down to get out'); return; }
      const rx = -Math.cos(P.h), rz = Math.sin(P.h), side = (P.s.bike ? 1.1 : P.m.W / 2 + 0.9);
      let ex = P.x + rx * side, ez = P.z + rz * side;
      if (solidAt(ex, ez)) { ex = P.x - rx * side; ez = P.z - rz * side; }
      F.x = ex; F.z = ez; F.h = P.h; F.vx = F.vz = 0; G.mode = 'foot'; F.m.visible = true; P.m.driver.visible = false; sfx('door'); stopEngine();
      if (G.cam === 'seat') G.cam = 'chase';
    }
  }
  function cycleCam() { if (G.mode !== 'drive') { pop('Get in your ride to change the camera'); return; } G.cam = G.cam === 'chase' ? 'seat' : G.cam === 'seat' ? 'far' : 'chase'; pop(G.cam === 'seat' ? "Driver's seat" : G.cam === 'far' ? 'Far camera' : 'Chase camera'); }
  $('#drive-pause').onclick = togglePause;
  $('#d-cam').onclick = cycleCam;
  $('#d-e').onclick = action;
  $('#d-horn').onclick = () => sfx('horn');
  $('#d-mute').onclick = () => { if (!LSPG.setMuted) return; LSPG.setMuted(!LSPG.muted()); $('#d-mute').textContent = LSPG.muted() ? '🔇' : '🔊'; if (LSPG.muted()) stopEngine(); else if (G.mode === 'drive') startEngine(); };

  const K = {};
  addEventListener('keydown', (e) => {
    if (!LSPG.isActive('s-drive')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); return; }
    K[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') action();
    if (e.code === 'KeyC') cycleCam();
    if (e.code === 'KeyH') sfx('horn');
  });
  addEventListener('keyup', (e) => { K[e.code] = false; });
  addEventListener('blur', () => { for (const k in K) K[k] = false; });
  $('#drive-cv').addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !$('#s-drive').classList.contains('touch')) $('#s-drive').classList.add('touch'); });
  function input() {
    const l = K.KeyA || K.ArrowLeft || TIN.left, r = K.KeyD || K.ArrowRight || TIN.right;
    const inp = { thr: K.KeyW || K.ArrowUp || TIN.gas ? 1 : 0, brk: K.KeyS || K.ArrowDown || TIN.brake ? 1 : 0, steer: (r ? 1 : 0) - (l ? 1 : 0), hand: !!K.Space, nitro: !!(K.ShiftLeft || K.ShiftRight || TIN.nitro) };
    // on a phone, braking hard while steering at speed pulls the handbrake for a drift
    if (TIN.brake && inp.steer && P && fwdSpeed(P) > 14) { inp.hand = true; inp.brk = 0; }
    return inp;
  }
  function resize() {
    if (!renderer) return;
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    $('#s-drive').classList.toggle('portrait', h > w);
  }

  /* ================= main loop ================= */
  function frame(t) {
    if (!LSPG.isActive('s-drive') || !G.on) { if (G.on) stopCity(); return; }
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    const dt = G.paused ? 0 : real;
    if (dt > 0) { const n = Math.ceil(dt / 0.017); for (let i = 0; i < n; i++) physics(dt / n); logic(dt); }
    draw(real);
  }
  function physics(dt) {
    G.t += dt;
    const inp = input(), counting = G.race && G.race.count > 0;
    let pin = G.mode === 'drive' && !P.dead && !counting ? inp : NOIN;
    stepVeh(P, pin, dt);
    for (const r of G.rivals) stepVeh(r, r.dead ? NOIN : rivalAI(r, dt), dt);
    for (const b of G.bots) stepVeh(b, counting ? NOIN : b.ai.done ? { thr: 0, brk: 1, steer: 0, hand: false } : botAI(b), dt);
    if (counting) for (const v of [P, ...G.bots]) { v.vx = v.vz = 0; }
    for (const tr of G.traffic) stepTraffic(tr, dt);
    // vehicle vs vehicle
    const phys = [P, ...G.rivals, ...G.bots];
    for (let i = 0; i < phys.length; i++) {
      for (let j = i + 1; j < phys.length; j++) bump(phys[i], phys[j], false);
      for (const tr of G.traffic) bump(phys[i], tr, true);
    }
    if (G.mode === 'foot') stepFoot(inp, dt, phys);
  }
  function circles(b) { const s = Math.sin(b.h), c = Math.cos(b.h); return b.co.map((o) => [b.x + s * o, b.z + c * o]); }
  function bump(a, b, kin) {
    if (Math.abs(a.x - b.x) > 9 || Math.abs(a.z - b.z) > 9 || Math.abs(a.y - b.y) > 1.8) return;
    const ca = circles(a), cb = circles(b), rr = a.cr + b.cr; let best = null;
    for (const p of ca) for (const q of cb) { const dx = p[0] - q[0], dz = p[1] - q[1], d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-3, pen = rr - d; if (!best || pen > best[2]) best = [dx / d, dz / d, pen]; } }
    if (!best) return;
    const [nx, nz, pen] = best, ma = a.s.mass, mb = b.s.mass, inv = 1 / ma + 1 / mb;
    a.x += nx * pen * (1 / ma / inv); a.z += nz * pen * (1 / ma / inv);
    b.x -= nx * pen * (1 / mb / inv); b.z -= nz * pen * (1 / mb / inv);
    const vrel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (vrel >= 0) return;
    const j = (-1.3 * vrel) / inv;
    a.vx += (j / ma) * nx; a.vz += (j / ma) * nz;
    if (!kin) { b.vx -= (j / mb) * nx; b.vz -= (j / mb) * nz; } else { b.stopT = 2.5; b.sp *= 0.3; }
    const imp = -vrel;
    if (imp > 3) {
      onImpact(a, imp * (mb / (ma + mb)) * 1.6); if (!kin) onImpact(b, imp * (ma / (ma + mb)) * 1.6);
      // rivals take a beating when you ram them
      if (a === P && b.kind === 'rival') hurt(b, imp * 2.2); if (b === P && a.kind === 'rival') hurt(a, imp * 2.2);
    }
  }
  function stepFoot(inp, dt, phys) {
    const run = K.ShiftLeft || K.ShiftRight || TIN.nitro, sp = run ? 8.5 : 5;
    F.h -= inp.steer * 2.8 * dt;
    const mv = inp.thr ? 1 : inp.brk ? -0.6 : 0, fx = Math.sin(F.h), fz = Math.cos(F.h);
    F.vx += (fx * mv * sp - F.vx) * Math.min(1, dt * 10); F.vz += (fz * mv * sp - F.vz) * Math.min(1, dt * 10);
    F.x += F.vx * dt; F.z += F.vz * dt; F.walk += Math.hypot(F.vx, F.vz) * dt * 2.2;
    collideWorld(F, F.x, F.z, 0.4);
    F.y = ground(F.x, F.z);
    F.hitT -= dt; F.hp = Math.min(100, F.hp + dt * 3);
    for (const v of [...phys, ...G.traffic]) {
      if (Math.abs(v.x - F.x) > 7 || Math.abs(v.z - F.z) > 7) continue;
      for (const [cx, cz] of circles(v)) {
        const dx = F.x - cx, dz = F.z - cz, d = Math.hypot(dx, dz), r = v.cr + 0.4;
        if (d >= r) continue;
        const nx = dx / (d || 1), nz = dz / (d || 1); F.x += nx * (r - d); F.z += nz * (r - d);
        const spd = Math.hypot(v.vx, v.vz);
        if (spd > 5 && F.hitT <= 0 && v !== P) { F.hitT = 1; F.hp -= spd * 2.2; F.vx = nx * 9; F.vz = nz * 9; sfx('hurt'); G.shake = 0.6; if (F.hp <= 0) knockedOut(); }
      }
    }
  }
  function knockedOut() {
    F.hp = 0; G.paused = true; G.over = true;
    modal(`<h2>Knocked down!</h2><p class="muted">You got hit by a car. Stay on the pavement, or get in your ride!</p><div class="modal-actions"><button class="btn primary" data-a="ok">Back to the garage</button></div>`, { ok: () => { closeModal(); respawn(); } });
  }

  function logic(dt) {
    const me = G.mode === 'drive' ? P : F, speed = G.mode === 'drive' ? Math.abs(fwdSpeed(P)) : 0;
    // hideouts
    G.hidden = !G.race && HIDEOUTS.some((h) => Math.abs(me.x - h.x) < 9 && Math.abs(me.z - h.z) < 9) && speed < 4;
    // garage repair
    const inGarage = Math.abs(me.x - GARAGE.x) < 9 && Math.abs(me.z - GARAGE.z) < 9;
    if (inGarage && G.mode === 'drive' && speed < 3 && P.hp < P.s.hp) { P.hp = Math.min(P.s.hp, P.hp + dt * 30); if (G.t - G.repairMsg > 3) { G.repairMsg = G.t; sfx('ding', { volume: 0.4 }); } }
    // rival turf
    if (!G.race && !G.heat && inTurf(me.x, me.z)) setHeat(1, `You drove into ${GANG} turf!`);
    // rivals
    if (G.heat > 0) {
      const alive = G.rivals.filter((r) => !r.dead && !r.ai.leaving).length;
      G.spawnT -= dt;
      if (alive < G.heat && G.spawnT <= 0) { spawnRival(); G.spawnT = 6; }
      // For the first few seconds they know exactly where you are. After that,
      // you lose them by staying out of sight (and not too close), or by hiding.
      G.heatT += dt;
      const active = G.rivals.filter((r) => !r.dead && !r.ai.leaving);
      const seen = active.some((r) => r.ai.sees), close = active.some((r) => Math.hypot(r.x - me.x, r.z - me.z) < 60), tracking = active.some((r) => r.ai.knowT > 0);
      if (seen || tracking || G.heatT < 9 || !active.length || (close && !G.hidden)) G.escT = Math.max(0, G.escT - dt * 2); else G.escT += dt * (G.hidden ? 2.5 : 1);
      if (G.escT >= 8) clearHeat(false);
    }
    for (let i = G.rivals.length - 1; i >= 0; i--) {
      const r = G.rivals[i];
      if (r.dead) { r.ai.deadT += dt; if (Math.random() < dt * 8) puff(r.x, r.y + 1, r.z, '#2b2b30', 1.4, 2, rand(-0.5, 0.5), 2, rand(-0.5, 0.5), 1.5, 0.6); }
      const far = Math.hypot(r.x - me.x, r.z - me.z);
      if ((r.dead && r.ai.deadT > 10) || (r.ai.leaving && ((r.ai.leaveT += dt) > 12 || far > 140))) { scene.remove(r.m.g); G.rivals.splice(i, 1); }
    }
    // jobs
    if (!G.race) {
      if (G.job) {
        G.job.time -= dt;
        if (Math.hypot(me.x - G.job.x, me.z - G.job.z) < 4.6) finishJob(true);
        else if (G.job.time <= 0) finishJob(false);
      } else for (const o of G.offers) if (Math.hypot(me.x - o.x, me.z - o.z) < 4.2) { takeJob(o); break; }
      // race starts
      G.raceCool = Math.max(0, (G.raceCool || 0) - dt);
      if (G.mode === 'drive' && !G.raceCool && !G.paused) for (const d of RACES) if (Math.hypot(P.x - d.start.x, P.z - d.start.z) < 7) { G.raceCool = 6; askRace(d); break; }
    } else {
      const r = G.race;
      if (r.count > 0) {
        const before = Math.ceil(r.count); r.count -= dt; const now = Math.ceil(r.count);
        if (now !== before) { if (now > 0) sfx('beep'); else sfx('go'); }
        $('#d-count').textContent = r.count > 0 ? (now > 3 ? '' : now) : 'GO!';
      } else {
        r.t += dt; if (r.count > -1) { r.count -= dt; if (r.count <= -1) $('#d-count').textContent = ''; }
        for (const v of [P, ...G.bots]) passCheckpoints(v);
      }
    }
    // effects tied to driving
    if (G.mode === 'drive' && !P.dead) {
      const sp = Math.abs(fwdSpeed(P));
      if (P.slip > 5 && sp > 8 && !P.air) {
        if (G.t - G.skidT > 0.32) { G.skidT = G.t; sfx('skid', { volume: 0.45 }); }
        if (P.x <= PARK_X0) puff(P.x, 0.4, P.z, '#e8e8e8', 1.1, 0.9, rand(-1, 1), 0.6, rand(-1, 1), 2.2, 0.45);
      }
      if (P.x > PARK_X0 && sp > 8 && Math.random() < dt * 20) puff(P.x - P.vx * 0.05, P.y + 0.4, P.z - P.vz * 0.05, '#c9a57a', 1.2, 1.1, rand(-1, 1), 0.8, rand(-1, 1), 2.4, 0.55);
      if (P.nOn && Math.random() < dt * 40) { const ex = P.m.exhaust; if (ex) { const w = ex.clone(); P.m.g.localToWorld(w); puff(w.x, w.y, w.z, Math.random() < 0.5 ? '#3ad1ff' : '#ff9f1c', 0.5, 0.25, -P.vx * 0.2, 0.2, -P.vz * 0.2, -0.6, 1); } }
      if (P.nOn && !G.nitroSnd) { G.nitroSnd = true; sfx('nitro', { volume: 0.6 }); } if (!P.nOn) G.nitroSnd = false;
      if (P.hp < P.s.hp * 0.35 && Math.random() < dt * 10) puff(P.x, P.y + 1.1, P.z, P.hp < P.s.hp * 0.15 ? '#3a3036' : '#9a9aa0', 0.9, 1.4, rand(-0.4, 0.4), 1.6, rand(-0.4, 0.4), 1.4, 0.5);
    }
    // keep traffic around the player
    for (const tr of G.traffic) if (Math.hypot(tr.x - me.x, tr.z - me.z) > 260 && Math.random() < dt) placeTraffic(tr, true);
  }

  /* ================= drawing ================= */
  function poseVeh(v, dt) {
    const g = v.m.g, s = v.s;
    let tp = 0, tr = 0;
    if (!v.air) {
      const sh = Math.sin(v.h), ch = Math.cos(v.h), half = s.bike ? 0.9 : 1.4;
      tp = Math.atan2(ground(v.x + sh * half, v.z + ch * half) - ground(v.x - sh * half, v.z - ch * half), half * 2);
      if (!s.bike) tr = Math.atan2(ground(v.x - ch * 0.9, v.z + sh * 0.9) - ground(v.x + ch * 0.9, v.z - sh * 0.9), 1.8);
    } else tp = clamp(v.vy * 0.03, -0.35, 0.35);
    v.pitch += (tp - v.pitch) * Math.min(1, dt * 10);
    const sp = v.vF || fwdSpeed(v);
    const lean = s.bike ? clamp(v.st * Math.min(1, Math.abs(sp) / 12) * 0.55, -0.6, 0.6) : -v.st * Math.min(1, Math.abs(sp) / 25) * 0.04;
    v.roll += (lean + tr - v.roll) * Math.min(1, dt * 8);
    g.position.set(v.x, v.y, v.z); g.rotation.set(-v.pitch, v.h, v.roll);
    for (const w of v.m.wheels) w.rotation.x = v.spin;
    const steerA = (-v.st * 0.5) / (1 + Math.abs(sp) / 20);
    for (const p of v.m.steer) p.rotation.y = steerA;
    if (v.m.wheel) v.m.wheel.rotation.z = -v.st * 1.8;
    v.m.tail.emissiveIntensity = v.brk ? 2.6 : 0.5;
  }
  function draw(dt) {
    if (!renderer) return;
    for (const v of [P, ...G.rivals, ...G.bots]) poseVeh(v, dt || 0.016);
    for (const tr of G.traffic) { const g = tr.m.g; g.position.set(tr.x, 0, tr.z); g.rotation.set(0, tr.h, 0); tr.m.tail.emissiveIntensity = tr.sp < tr.max * 0.5 ? 2.2 : 0.5; }
    // on-foot character
    if (G.mode === 'foot') {
      F.m.position.set(F.x, F.y, F.z); F.m.rotation.y = F.h;
      const sw = Math.sin(F.walk) * Math.min(1, Math.hypot(F.vx, F.vz) / 3) * 0.7, u = F.m.userData;
      u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; u.arms[0].rotation.x = -sw; u.arms[1].rotation.x = sw;
    }
    const seat = G.mode === 'drive' && G.cam === 'seat';
    if (P.m.cockpit) P.m.cockpit.visible = seat;
    P.m.driver.visible = G.mode === 'drive' && !seat;
    // markers bob and the objective arrow
    const bobY = Math.sin(G.t * 3) * 0.3;
    for (const o of G.offers) o.mesh.userData.icon.position.y = 4 + bobY;
    let target = null;
    if (G.race && ring) { const c = G.race.def.cps[P.ai.cp], n = G.race.def.cps[Math.max(0, P.ai.cp - 1)]; ring.position.set(c[0], ground(c[0], c[1]) + 4.5, c[1]); ring.rotation.y = Math.atan2(c[0] - (P.ai.cp ? n[0] : P.x), c[1] - (P.ai.cp ? n[1] : P.z)); target = c; }
    else if (G.job) { G.job.mesh.userData.icon.position.y = 4 + bobY; target = [G.job.x, G.job.z]; }
    const me = G.mode === 'drive' ? P : F;
    arrow.visible = !!target && !seat && Math.hypot(target[0] - me.x, target[1] - me.z) > 12;
    if (arrow.visible) { arrow.position.set(me.x, me.y + (G.mode === 'drive' ? (P.s.bike ? 2.6 : 3.1) : 2.8) + bobY * 0.3, me.z); arrow.rotation.y = Math.atan2(target[0] - me.x, target[1] - me.z); }
    updFx(dt);
    updCam(dt);
    sun.position.set(me.x + 60, 110, me.z + 40); sun.target.position.set(me.x, 0, me.z);
    renderer.render(scene, camera);
    // audio
    if (engine) {
      const sp = Math.abs(fwdSpeed(P)), frac = clamp(sp / (P.s.top * 1.05), 0, 1), gears = P.s.bike ? 5 : 6, gp = frac * gears, gear = Math.min(gears - 1, Math.floor(gp));
      const rpm = sp < 0.5 ? 0.05 : clamp(0.25 + (gp - gear) * 0.7, 0, 1), inp = input();
      engine.set(G.paused ? 0 : rpm, G.paused ? 0 : inp.thr ? 1 : 0.2);
      G.gear = fwdSpeed(P) < -0.5 ? 'R' : sp < 0.5 && !inp.thr ? 'N' : String(gear + 1);
    }
    G.hudT -= dt; if (G.hudT <= 0) { G.hudT = 0.1; hud(); }
    G.mapT -= dt; if (G.mapT <= 0) { G.mapT = 1 / 20; drawMini(); }
  }
  const camPos = { x: 0, y: 5, z: -10, init: false };
  function updCam(dt) {
    const k = 1 - Math.exp(-dt * 6);
    let fov = 62;
    if (G.mode === 'drive' && G.cam === 'seat' && P.m.seat) {
      const s = P.m.g; s.updateMatrixWorld();
      const p = P.m.seat.clone(); s.localToWorld(p); const l = P.m.look.clone(); s.localToWorld(l);
      camera.position.copy(p); camera.lookAt(l); fov = 70 + Math.min(12, Math.abs(fwdSpeed(P)) * 0.15) + (P.nOn ? 6 : 0);
      camPos.init = false;
    } else {
      const b = G.mode === 'drive' ? P : F, drive = G.mode === 'drive';
      const sp = drive ? Math.abs(fwdSpeed(P)) : 0;
      if (!(drive && fwdSpeed(P) < -2)) G.camH += wrapA(b.h - G.camH) * Math.min(1, dt * (drive ? 3.5 : 5));
      const far = G.cam === 'far' && drive, dist = drive ? (P.s.bike ? 4.8 : 6.4) * (far ? 1.7 : 1) + sp * 0.05 : 4.4, ht = drive ? (far ? 4.2 : 2.3) : 2.2;
      const fx = Math.sin(G.camH), fz = Math.cos(G.camH);
      const ox = b.x, oy = b.y + 1.5, oz = b.z;
      let dx = b.x - fx * dist, dz = b.z - fz * dist, dy = b.y + ht;
      for (let i = 1; i <= 8; i++) { const t = i / 8, x = ox + (dx - ox) * t, z = oz + (dz - oz) * t; if (solidAt(x, z)) { const tt = Math.max(0.15, (i - 1.3) / 8); dx = ox + (dx - ox) * tt; dz = oz + (dz - oz) * tt; dy = oy + (dy - oy) * tt + 0.6; break; } }
      dy = Math.max(dy, ground(dx, dz) + 0.8);
      if (!camPos.init) { camPos.x = dx; camPos.y = dy; camPos.z = dz; camPos.init = true; }
      camPos.x += (dx - camPos.x) * k; camPos.y += (dy - camPos.y) * k; camPos.z += (dz - camPos.z) * k;
      camera.position.set(camPos.x, camPos.y, camPos.z);
      camera.lookAt(b.x + fx * 3, b.y + 1.2, b.z + fz * 3);
      fov = 62 + sp * 0.28 + (drive && P.nOn ? 8 : 0);
    }
    if (G.shake > 0.01) { camera.position.x += (Math.random() - 0.5) * G.shake * 0.5; camera.position.y += (Math.random() - 0.5) * G.shake * 0.5; G.shake *= Math.exp(-dt * 7); }
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  }
  function hud() {
    const drive = G.mode === 'drive', hp = drive ? P.hp / P.s.hp : F.hp / 100;
    $('#d-hp-t').textContent = drive ? `${specOf(P.id).name}  ${Math.ceil(P.hp)} / ${P.s.hp}` : `You  ${Math.ceil(F.hp)} / 100`;
    const bar = $('#d-hp'); bar.style.width = clamp(hp, 0, 1) * 100 + '%'; bar.style.background = hp < 0.3 ? '#ff4d5e' : hp < 0.6 ? '#ffb31a' : '#14c79a';
    const ht = $('#d-heat'); ht.textContent = '★'.repeat(G.heat) + '☆'.repeat(3 - G.heat); ht.classList.toggle('off', !G.heat);
    $('#d-earned').textContent = `⭐ +${G.earned.toLocaleString()}`;
    const sp = drive ? Math.abs(fwdSpeed(P)) * 3.6 : Math.hypot(F.vx, F.vz) * 3.6;
    $('#d-spd').textContent = Math.round(sp); $('#d-gear').textContent = drive ? G.gear || 'N' : '🚶';
    $('#d-nitro').style.width = (drive ? P.nitro : 0) * 100 + '%';
    // objective
    let obj = '';
    if (G.race) { const r = G.race; obj = r.count > 0 ? `${r.def.name} — get ready` : `🏁 ${r.def.name}: follow the blue rings`; }
    else if (G.job) { const j = JOBS[G.job.tier], d = Math.round(Math.hypot(G.job.x - P.x * (drive ? 1 : 0) - F.x * (drive ? 0 : 1), G.job.z - (drive ? P.z : F.z))); obj = `${j.icon} Deliver to 🏠 · ${d} m · ⏱ ${Math.max(0, Math.ceil(G.job.time))}s · ⭐ ${G.job.reward}`; }
    else if (!drive) obj = '🚶 On foot. Walk to your ride and get in.';
    else obj = '📦 Drive into a glowing marker for a job · 🏁 races start at the checkered flags on the map';
    if (G.heat && !G.race) { const left = Math.max(0, 8 - G.escT); obj = (G.rivals.some((r) => r.ai.knowT > 0 && !r.dead && !r.ai.leaving) ? `🐍 The ${GANG} are tracking you. Drive!` : G.rivals.some((r) => r.ai.sees && !r.dead) ? `🐍 The ${GANG} can see you! Break their line of sight.` : G.hidden ? `🅷 Hidden… ${left.toFixed(1)}s` : `🐍 Out of sight… ${left.toFixed(1)}s to lose them`) + (G.job ? ' · ' + obj : ''); }
    $('#d-obj').textContent = obj;
    // prompt
    let pr = '';
    const me = drive ? P : F;
    if (!drive && Math.hypot(F.x - P.x, F.z - P.z) < (P.s.bike ? 2.6 : 3.6)) pr = LSPG.isTouch() ? 'Tap 🚪 to get in' : 'Press E to get in';
    else if (drive && Math.abs(me.x - GARAGE.x) < 9 && Math.abs(me.z - GARAGE.z) < 9) pr = P.hp < P.s.hp ? '🔧 Repairing… stay stopped' : '🔧 Garage · switch rides and upgrade from the pause menu';
    else if (G.hidden && G.heat) pr = '🅷 Stay still to hide';
    $('#d-prompt').textContent = pr;
    // race board
    if (G.race) {
      const r = G.race, all = [P, ...G.bots].sort((a, b) => (b.ai.done ? 100 - r.finished.indexOf(b) : 0) - (a.ai.done ? 100 - r.finished.indexOf(a) : 0) || progress(b) - progress(a));
      const pos = all.indexOf(P) + 1, t = r.t;
      $('#d-race').innerHTML = `<b>${ord(pos)}</b> / 4<br>Checkpoint ${Math.min(r.def.cps.length, P.ai.cp + (P.ai.done ? 1 : 0))} / ${r.def.cps.length}<br>${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    }
  }

  /* ---- minimap ---- */
  let miniBase = null;
  const MX = BOUND.x1 + 4, MZ = BOUND.z1 + 4;
  function buildMiniBase() {
    const W = MX - (BOUND.x0 - 4), H = MZ - (BOUND.z0 - 4), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), X = (x) => MX - x, Z = (z) => MZ - z;
    g.fillStyle = '#7fb66a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b48a5c'; g.fillRect(0, 0, X(PARK_X0), H);
    g.fillStyle = '#c3c8d0';
    for (let bx = 0; bx < NB; bx++) for (let bz = 0; bz < NB; bz++) { const x0 = RX(bx) + HALF, z0 = RX(bz) + HALF, S = CELL - ROAD; g.fillStyle = PARKS.includes(bx + ',' + bz) ? '#6aa857' : '#c3c8d0'; g.fillRect(X(x0 + S), Z(z0 + S), S, S); }
    g.fillStyle = 'rgba(214,31,48,.35)'; g.fillRect(X(TURF.x1), Z(TURF.z1), TURF.x1 - TURF.x0, TURF.z1 - TURF.z0);
    g.fillStyle = '#9aa2b0';
    for (const b of new Set([].concat(...CG.values()))) if (b.x1 - b.x0 > 3) g.fillRect(X(b.x1), Z(b.z1), b.x1 - b.x0, b.z1 - b.z0);
    g.fillStyle = '#4d525b';
    for (let i = 0; i <= NB; i++) { g.fillRect(X(223), Z(RX(i) + HALF), 446, ROAD); g.fillRect(X(RX(i) + HALF), Z(223), ROAD, 446); }
    g.fillStyle = 'rgba(160,110,60,.7)'; g.lineWidth = 6; g.strokeStyle = 'rgba(120,80,40,.55)';
    g.beginPath(); RACES[1].cps.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); g.stroke();
    miniBase = c;
  }
  function drawMini() {
    const cv = $('#d-map'), g = cv.getContext('2d'), W = cv.width, H = cv.height, me = G.mode === 'drive' ? P : F;
    const zoom = (W / 2) / 130, rot = G.cam === 'seat' ? me.h : G.camH;
    g.save(); g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, TAU); g.clip();
    g.fillStyle = '#7fb66a'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2); g.rotate(rot); g.scale(zoom, zoom);
    g.drawImage(miniBase, -(MX - me.x), -(MZ - me.z));
    g.restore();
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (x, z, clampEdge) => { const dx = me.x - x, dy = me.z - z; let sx = (dx * cr - dy * sr) * zoom, sy = (dx * sr + dy * cr) * zoom; const d = Math.hypot(sx, sy), lim = W / 2 - 12; if (d > lim) { if (!clampEdge) return null; sx *= lim / d; sy *= lim / d; } return [W / 2 + sx, H / 2 + sy]; };
    const dot = (x, z, col, r, edge, label) => { const p = at(x, z, edge); if (!p) return; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill(); g.stroke(); if (label) { g.fillStyle = '#fff'; g.font = `700 ${r * 1.3}px Fredoka, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, p[0], p[1] + 1); } };
    dot(GARAGE.x, GARAGE.z, '#14c79a', 11, true, '🔧');
    for (const h of HIDEOUTS) dot(h.x, h.z, '#2f6bff', 10, false, 'H');
    if (!G.race) for (const d of RACES) dot(d.start.x, d.start.z, '#16203d', 11, true, '🏁');
    for (const tr of G.traffic) dot(tr.x, tr.z, '#e6e8ee', 4, false);
    if (!G.race && !G.job) for (const o of G.offers) dot(o.x, o.z, JOBS[o.tier].color, 9, true);
    if (G.job) dot(G.job.x, G.job.z, '#14c79a', 12, true, '🏠');
    if (G.race) { const c = G.race.def.cps[P.ai.cp]; dot(c[0], c[1], '#3ad1ff', 11, true); for (const b of G.bots) dot(b.x, b.z, '#ff8a3d', 7, false); }
    for (const r of G.rivals) if (!r.dead) dot(r.x, r.z, '#e3263a', 8, true);
    if (G.mode === 'foot') dot(P.x, P.z, '#ffd23f', 8, true, '');
    // player arrow
    g.save(); g.translate(W / 2, H / 2); g.rotate(rot - me.h);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#16203d'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  /* ================= hub card ================= */
  function drawHubArt() {
    const cv = $('#hub-art-drive'); if (!cv) return; const r = cv.getBoundingClientRect(); if (!r.width) return;
    const d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, Rn = LSPG.rng(7);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#4f93d8'); sky.addColorStop(1, '#cfe6f7'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const bw = W * (0.05 + Rn() * 0.06), bh = H * (0.2 + Rn() * 0.5), x = Rn() * W; g.fillStyle = ['#8fa3bd', '#7b8fab', '#a6b6cb'][i % 3]; g.fillRect(x, H * 0.72 - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.35)'; for (let wy = H * 0.72 - bh + 8 * d; wy < H * 0.7; wy += 12 * d) for (let wx = x + 5 * d; wx < x + bw - 6 * d; wx += 10 * d) g.fillRect(wx, wy, 5 * d, 6 * d); }
    g.fillStyle = '#3d4046'; g.fillRect(0, H * 0.72, W, H * 0.28); g.fillStyle = '#e8e8e8'; for (let x = 0; x < W; x += 60 * d) g.fillRect(x, H * 0.85, 32 * d, 4 * d);
    g.fillStyle = '#b9bec7'; g.fillRect(0, H * 0.7, W, H * 0.03);
    const car = (x, y, s, col, rival) => {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 22, 70, 8, 0, 0, TAU); g.fill();
      g.fillStyle = col; LSPG.rr(g, -70, -6, 140, 26, 10); g.fill();
      g.beginPath(); g.moveTo(-36, -6); g.lineTo(-20, -28); g.lineTo(28, -28); g.lineTo(44, -6); g.closePath(); g.fill();
      g.fillStyle = '#22303f'; g.beginPath(); g.moveTo(-28, -8); g.lineTo(-17, -24); g.lineTo(4, -24); g.lineTo(4, -8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(10, -8); g.lineTo(10, -24); g.lineTo(25, -24); g.lineTo(36, -8); g.closePath(); g.fill();
      if (rival) { g.fillStyle = '#e3263a'; g.fillRect(-70, 2, 140, 5); }
      g.fillStyle = '#fff4c2'; g.fillRect(62, 0, 8, 6); g.fillStyle = '#ff1a2a'; g.fillRect(-70, 0, 6, 6);
      for (const wx of [-42, 42]) { g.fillStyle = '#17181c'; g.beginPath(); g.arc(wx, 20, 13, 0, TAU); g.fill(); g.fillStyle = '#b8bec8'; g.beginPath(); g.arc(wx, 20, 6, 0, TAU); g.fill(); }
      g.restore();
    };
    car(W * 0.62, H * 0.8, W / 900, '#2f6bff', false);
    car(W * 0.22, H * 0.86, W / 1100, '#141418', true);
    g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++) g.fillRect(W * 0.62 - W * (0.12 + i * 0.03), H * (0.74 + i * 0.02), W * 0.05, 2 * d);
  }
  LSPG.onHub(() => {
    load();
    const p = $('#hub-drive-progress'); if (p) p.textContent = `${SV.owned.length} of ${VEH.length} rides · ${SV.stats.jobs} jobs · ${SV.stats.wins} race wins`;
    requestAnimationFrame(drawHubArt);
  });
  addEventListener('resize', () => { if (LSPG.isActive('s-hub')) drawHubArt(); });
  const card = $('#play-drive'); if (card) card.onclick = () => openLobby('play');
  window.LSPDrive = { open: openLobby, _G: G, _P: () => P,
    // test hook: run the simulation without rendering. keys = {thr, steer, ...}
    _sim(n, keys) { const save = Object.assign({}, K); Object.assign(K, keys || {}); let t0 = performance.now(); for (let i = 0; i < n; i++) { physics(1 / 60); if (i % 4 === 0) logic(4 / 60); } const ms = performance.now() - t0; for (const k in K) delete K[k]; Object.assign(K, save); return ms / n; },
    _render() { const t0 = performance.now(); draw(1 / 60); return performance.now() - t0; } };
})();
