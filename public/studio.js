/* LSP Studio: make your own 3D games, publish them, and earn points when people buy them.
 *
 *   Discover  - play games other players made (free or paid with points)
 *   My games  - build in the 3D editor, test, save, publish, see plays/sales/earnings
 *
 * A game = settings + parts [type, x, y(bottom), z, w, h, d, color, rot(0-3), material] + signs.
 * The same part builder draws the editor and the game, so what you build is what players get.
 */
(function () {
  'use strict';
  const L = LSPG;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ===================== part catalogue ===================== */
  const PARTS = {
    block: { n: 'Block', i: '🧱', s: [4, 1, 4], c: '#9aa4b8', m: 'plastic', solid: 1 },
    ramp: { n: 'Ramp', i: '📐', s: [4, 2, 6], c: '#9aa4b8', m: 'concrete', solid: 1 },
    wall: { n: 'Wall', i: '🏛️', s: [8, 4, 1], c: '#b5533c', m: 'brick', solid: 1 },
    cyl: { n: 'Pillar', i: '🛢️', s: [2, 3, 2], c: '#d8dde8', m: 'stone', solid: 1 },
    ball: { n: 'Ball', i: '⚪', s: [2, 2, 2], c: '#ff8a3d', m: 'plastic', solid: 1 },
    glass: { n: 'Glass', i: '🪟', s: [4, 3, 0.25], c: '#bfe3ff', m: 'plastic', solid: 1 },
    spawn: { n: 'Spawn', i: '🟢', s: [4, 0.3, 4], c: '#14c79a', m: 'plastic', solid: 1 },
    check: { n: 'Checkpoint', i: '🚩', s: [4, 0.3, 4], c: '#2f6bff', m: 'plastic', solid: 1 },
    finish: { n: 'Finish', i: '🏁', s: [6, 0.3, 4], c: '#ffffff', m: 'plastic', solid: 1 },
    coin: { n: 'Coin', i: '🪙', s: [1, 1, 1], c: '#ffc21a', fixed: 1 },
    gem: { n: 'Gem', i: '💎', s: [1, 1, 1], c: '#5ad1ff', fixed: 1 },
    heal: { n: 'Health', i: '❤️', s: [1, 1, 1], c: '#ff4d5e', fixed: 1 },
    lava: { n: 'Lava', i: '🌋', s: [4, 0.4, 4], c: '#ff5a1f', m: 'neon', solid: 1 },
    water: { n: 'Water', i: '🌊', s: [8, 1, 8], c: '#2a8fd6' },
    jump: { n: 'Jump pad', i: '⏫', s: [3, 0.4, 3], c: '#b04dff', m: 'neon', solid: 1 },
    speed: { n: 'Speed pad', i: '⏩', s: [3, 0.2, 5], c: '#ffd21a', m: 'neon', solid: 1 },
    move: { n: 'Mover', i: '↔️', s: [4, 0.6, 4], c: '#14c79a', m: 'metal', solid: 1 },
    spin: { n: 'Spinner', i: '🌀', s: [10, 0.6, 0.6], c: '#ff4d5e', m: 'metal' },
    bot: { n: 'Enemy bot', i: '🤖', s: [1, 2, 1], c: '#ff4d5e', fixed: 1 },
    car: { n: 'Car', i: '🚗', s: [2.2, 1.4, 4.4], c: '#2f6bff', fixed: 1 },
    tree: { n: 'Tree', i: '🌳', s: [3, 7, 3], c: '#3f8a3a' },
    lamp: { n: 'Street lamp', i: '💡', s: [0.4, 5, 0.4], c: '#3a4258', fixed: 1 },
    house: { n: 'House', i: '🏠', s: [8, 6, 8], c: '#e8dcc6', m: 'concrete', solid: 1 },
    cone: { n: 'Cone', i: '🔶', s: [0.6, 0.9, 0.6], c: '#ff7a1a', fixed: 1 },
  };
  const GROUPS = [
    ['Build', ['block', 'ramp', 'wall', 'cyl', 'ball', 'glass', 'house', 'tree', 'lamp', 'cone', 'water']],
    ['Game', ['spawn', 'check', 'finish', 'coin', 'gem', 'heal', 'car']],
    ['Danger', ['lava', 'spin', 'bot', 'move', 'jump', 'speed']],
  ];
  const COLORS = ['#f4f6fa', '#9aa4b8', '#4a5068', '#16203d', '#ff4d5e', '#ff8a3d', '#ffc21a', '#14c79a', '#3f8a3a', '#2f6bff', '#5ad1ff', '#b04dff', '#ff7ac0', '#8b5a2b', '#e8dcc6', '#c9b18a'];
  const MATS = [['plastic', 'Plastic'], ['concrete', 'Concrete'], ['brick', 'Brick'], ['wood', 'Wood'], ['stone', 'Stone'], ['metal', 'Metal'], ['grass', 'Grass'], ['ice', 'Ice'], ['neon', 'Neon']];
  const GOALS = { finish: '🏁 Reach the finish', coins: '🪙 Collect all coins', race: '🏎️ Race: checkpoints then finish', survive: '⏱️ Survive the timer', free: '🌍 Free roam (no goal)' };
  const SKIES = { day: '☀️ Day', sunset: '🌇 Sunset', night: '🌙 Night', storm: '⛈️ Storm', space: '🌌 Space' };
  const GROUNDS = { grass: '🌱 Grass', sand: '🏖️ Sand', snow: '❄️ Snow', city: '🛣️ Asphalt', lava: '🌋 Lava floor', none: '🕳️ No floor (void)' };
  const EMOJIS = ['🎮', '🏃', '🏎️', '🪙', '⚔️', '🏙️', '🌋', '❄️', '🚀', '🏰', '🌴', '👾', '🎯', '🧱', '⭐', '🐉'];

  const footprint = (p) => (p[8] & 1 ? [p[6], p[4]] : [p[4], p[6]]);

  /* ===================== templates ===================== */
  function tmpl(kind) {
    const P = [], S = [], add = (t, x, y, z, w, h, d, c, r = 0, m) => { const D = PARTS[t]; P.push([t, x, y, z, w ?? D.s[0], h ?? D.s[1], d ?? D.s[2], c || D.c, r, m || D.m || 'plastic']); };
    const set = { sky: 'day', ground: 'grass', goal: 'free', time: 0, lives: 0 };
    if (kind === 'blank') { add('block', 0, 0, 0, 40, 1, 40, '#9aa4b8', 0, 'concrete'); add('spawn', 0, 1, 0); S.push([0, 1, -6, 'My new game!', 0]); }
    if (kind === 'obby') {
      Object.assign(set, { goal: 'finish', ground: 'lava', sky: 'sunset' });
      add('block', 0, 0, 0, 10, 4, 10, '#9aa4b8', 0, 'stone'); add('spawn', 0, 4, 0);
      const cols = ['#ff4d5e', '#ff8a3d', '#ffc21a', '#14c79a', '#2f6bff', '#b04dff'];
      let z = 9, y = 4;
      for (let i = 0; i < 6; i++) { add('block', (i % 2 ? 2 : -2), y - 1, z, 3, 1, 3, cols[i]); z += 5; y += 0.5; }
      add('block', 0, y - 1, z + 2, 8, 1, 8, '#9aa4b8', 0, 'stone'); add('check', 0, y, z + 2); add('lava', 0, y, z + 6, 8, 0.4, 2); z += 10;
      add('move', 0, y - 0.6, z + 3); z += 10; add('block', 0, y - 1, z, 8, 1, 6, '#9aa4b8', 0, 'stone'); add('jump', 0, y, z);
      y += 6; z += 9; add('block', 0, y - 1, z, 10, 1, 10, '#9aa4b8', 0, 'stone'); add('spin', 0, y, z, 9, 0.6, 0.6); add('coin', 3, y + 0.8, z - 3); add('coin', -3, y + 0.8, z + 3);
      z += 8; add('ramp', 0, y - 1, z + 3, 4, 3, 6, '#14c79a', 0, 'plastic'); z += 9; y += 2;
      add('block', 0, y - 1, z, 12, 1, 8, '#f4f6fa', 0, 'plastic'); add('finish', 0, y, z); S.push([0, y + 3.5, z + 3, 'FINISH!', 2]);
      S.push([0, 7.5, 4.5, 'Reach the finish. Avoid the lava!', 0]);
    }
    if (kind === 'coins') {
      Object.assign(set, { goal: 'coins', time: 240, sky: 'day' });
      add('spawn', 0, 0, 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, x = Math.round(Math.cos(a) * 22), z = Math.round(Math.sin(a) * 22); add('house', x, 0, z, 8, 6, 8, ['#e8dcc6', '#f4f6fa', '#c9b18a', '#ffc9a8'][i % 4], (i % 4), 'concrete'); add('coin', x, 6.4, z); add('ramp', x + (i % 2 ? 6 : -6), 0, z, 3, 3.8, 6, '#8b5a2b', i % 2 ? 3 : 1, 'wood'); }
      for (let i = 0; i < 14; i++) { const a = i * 2.3, r = 8 + (i % 4) * 4; add('coin', Math.round(Math.cos(a) * r), 0.8, Math.round(Math.sin(a) * r)); }
      for (let i = 0; i < 12; i++) add('tree', Math.round(Math.cos(i) * 36), 0, Math.round(Math.sin(i) * 36));
      S.push([0, 1.2, -5, 'Find every coin! Some are on the roofs.', 0]);
    }
    if (kind === 'race') {
      Object.assign(set, { goal: 'race', ground: 'grass', time: 0, sky: 'sunset' });
      const R = 46, W = 12;
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, x = Math.round(Math.cos(a) * R * 1.4), z = Math.round(Math.sin(a) * R); add('block', x, 0, z, W, 0.2, W, '#3a3f4b', 0, 'concrete'); }
      add('spawn', Math.round(R * 1.4) + 4, 0.2, -6); add('car', Math.round(R * 1.4), 0.2, -6, null, null, null, '#ff4d5e');
      [Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((a) => add('check', Math.round(Math.cos(a) * R * 1.4), 0.2, Math.round(Math.sin(a) * R), 12, 0.3, 3, null, Math.abs(Math.cos(a)) > 0.5 ? 0 : 1));
      add('finish', Math.round(R * 1.4), 0.2, -14, 12, 0.3, 3);
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; add('cone', Math.round(Math.cos(a) * (R - 7) * 1.4), 0.2, Math.round(Math.sin(a) * (R - 7))); }
      for (let i = 0; i < 18; i++) { const a = i * 0.9; add('tree', Math.round(Math.cos(a) * 90), 0, Math.round(Math.sin(a) * 66)); }
      S.push([Math.round(R * 1.4) + 8, 3, -6, 'Press E to get in the car', 3]);
    }
    if (kind === 'arena') {
      Object.assign(set, { goal: 'survive', time: 90, sky: 'storm', ground: 'city' });
      add('block', 0, 0, 0, 50, 0.2, 50, '#4a5068', 0, 'concrete');
      [[0, -25, 50, 0], [0, 25, 50, 0], [-25, 0, 50, 1], [25, 0, 50, 1]].forEach(([x, z, w, r]) => add('wall', x, 0, z, w, 5, 1, '#9aa4b8', r, 'concrete'));
      add('spawn', 0, 0.2, 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add('bot', Math.round(Math.cos(a) * 18), 0.2, Math.round(Math.sin(a) * 18)); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6; add('heal', Math.round(Math.cos(a) * 10), 1, Math.round(Math.sin(a) * 10)); add('cyl', Math.round(Math.cos(a) * 14), 0.2, Math.round(Math.sin(a) * 14), 2, 3, 2, '#9aa4b8', 0, 'concrete'); }
      for (let i = 0; i < 4; i++) add('lamp', i < 2 ? -22 : 22, 0.2, i % 2 ? -22 : 22);
      S.push([0, 6.5, -24, 'Survive 90 seconds! Click or F to shoot.', 0]);
    }
    if (kind === 'city') {
      Object.assign(set, { goal: 'free', ground: 'grass', sky: 'sunset' });
      for (let i = -2; i <= 2; i++) { add('block', i * 30, 0, 0, 10, 0.2, 150, '#3a3f4b', 0, 'concrete'); add('block', 0, 0, i * 30, 150, 0.2, 10, '#3a3f4b', 0, 'concrete'); }
      const hc = ['#e8dcc6', '#f4f6fa', '#c9b18a', '#ffc9a8', '#9aa4b8'];
      for (let gx = -2; gx < 2; gx++) for (let gz = -2; gz < 2; gz++) {
        const cx = gx * 30 + 15, cz = gz * 30 + 15, k = (gx * 7 + gz * 3 + 20) % 5;
        if (k === 0) { add('block', cx, 0, cz, 18, 0.3, 18, '#5f9e4a', 0, 'grass'); add('tree', cx - 4, 0.3, cz - 3); add('tree', cx + 5, 0.3, cz + 4); add('coin', cx, 1, cz); }
        else if (k === 1) add('block', cx, 0, cz, 14, 18 + ((gx + gz + 4) % 3) * 8, 14, ['#9aa4b8', '#c9b18a', '#5ad1ff'][(gx + 4) % 3], 0, (gx + gz) % 2 ? 'concrete' : 'brick');
        else { add('house', cx - 5, 0, cz - 5, 8, 6, 8, hc[k], 0); add('house', cx + 5, 0, cz + 5, 8, 6, 8, hc[(k + 2) % 5], 2); }
        add('lamp', cx - 10, 0, cz - 10);
      }
      add('spawn', 4, 0.2, 4); add('car', -3, 0.2, 6, null, null, null, '#ffc21a'); add('car', 30, 0.2, -6, null, null, null, '#2f6bff', 2);
      S.push([4, 3, -2, 'Welcome to my city! Press E near a car to drive.', 0]);
    }
    return { ...set, parts: P, signs: S };
  }
  const TEMPLATES = [
    ['blank', '⬜', 'Blank baseplate', 'An empty floor. Build anything.'],
    ['obby', '🌋', 'Obby', 'Jump across platforms over lava to the finish.'],
    ['coins', '🪙', 'Coin hunt', 'Houses, ramps and coins to collect before time runs out.'],
    ['race', '🏎️', 'Race track', 'A car, a track and checkpoints. Like LSP Drive!'],
    ['arena', '⚔️', 'Arena', 'Survive enemy bots in a walled arena.'],
    ['city', '🏙️', 'Mini city', 'Roads, houses, towers and cars to drive.'],
  ];

  /* ===================== screens ===================== */
  const css = `
  #s-studio{overflow:auto}
  .st-hero{border-radius:24px;padding:22px;background:linear-gradient(135deg,#16203d,#2f3f8f 60%,#6a3dc9);color:#fff;display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:6px}
  .st-hero h1{font-size:30px}.st-hero p{opacity:.85;max-width:560px}
  .sg-card{position:relative;text-align:left;border:2px solid var(--line);background:#fff;border-radius:18px;overflow:hidden;padding:0;cursor:pointer;font:inherit;color:inherit;box-shadow:0 5px 0 var(--line);display:flex;flex-direction:column}
  .sg-card:active{transform:translateY(3px);box-shadow:0 2px 0 var(--line)}
  .sg-card .thumb{height:110px;display:grid;place-items:center;font-size:52px;width:100%}
  .sg-card .meta{padding:10px 12px 12px}.sg-card h3{font-size:17px}.sg-card .by{font-size:13px;color:var(--muted);font-weight:700}
  .sg-card .stats{display:flex;gap:10px;font-size:13px;font-weight:800;color:var(--muted);margin-top:6px}
  .sg-price{position:absolute;top:8px;right:8px;background:#fff;border-radius:999px;padding:3px 10px;font-weight:800;font-size:13px;box-shadow:0 2px 6px #0002}
  .sg-price.free{background:#e3faf3;color:#0b8f6e}.sg-price.own{background:#eef3ff;color:#1f4fd1}
  .my-row{display:flex;gap:12px;align-items:center;background:#fff;border:2px solid var(--line);border-radius:18px;padding:12px;margin-top:10px;flex-wrap:wrap}
  .my-row .ic{width:64px;height:64px;border-radius:14px;display:grid;place-items:center;font-size:34px;flex:none}
  .my-row .grow{flex:1;min-width:160px}.my-row .btn{height:42px;font-size:15px;padding:0 14px}
  .st-badge{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 8px;background:#eef1f6;color:var(--muted)}.st-badge.live{background:#e3faf3;color:#0b8f6e}
  .st-earn{font-weight:800;color:#b07800}
  .tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:12px}
  .tpl{border:2px solid var(--line);background:#fff;border-radius:16px;padding:12px;text-align:left;cursor:pointer;font:inherit}
  .tpl.on{border-color:var(--brand);background:#eef3ff}.tpl b{display:block;font-size:30px}.tpl small{color:var(--muted);font-size:12px}
  .st-modal{position:fixed;inset:0;background:#0008;z-index:60;display:none;align-items:center;justify-content:center;padding:16px}
  .st-modal.open{display:flex}
  .st-card{background:#fff;border-radius:22px;padding:20px;max-width:560px;width:100%;max-height:92vh;overflow:auto;position:relative}
  .st-card h2{font-size:24px}.st-card label{display:block;font-weight:800;font-size:14px;margin-top:12px}
  .st-card input,.st-card select,.st-card textarea{width:100%;border:2px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:16px;margin-top:4px;background:#fff}
  .st-card .row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}.st-card .row .btn{flex:1;height:48px;font-size:16px}
  .st-x{position:absolute;right:12px;top:12px;border:0;background:#eef1f6;border-radius:12px;width:36px;height:36px;font-size:16px;cursor:pointer}
  .emo-pick{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.emo-pick button{width:40px;height:40px;border-radius:10px;border:2px solid var(--line);background:#fff;font-size:22px;cursor:pointer}.emo-pick button.on{border-color:var(--brand);background:#eef3ff}

  #s-sgame{position:fixed;inset:0;background:#000;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
  #sg-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
  .sg-ui{position:absolute;inset:0;pointer-events:none;font-family:Fredoka,system-ui,sans-serif}
  .sg-ui>*{pointer-events:auto}
  .sg-top{position:absolute;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top,0px));display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .sg-b{height:40px;border:0;border-radius:12px;padding:0 12px;font:600 15px Fredoka,system-ui,sans-serif;background:#ffffffee;color:#16203d;box-shadow:0 3px 0 #0003;cursor:pointer;white-space:nowrap}
  .sg-b.pri{background:#2f6bff;color:#fff}.sg-b.gold{background:#ffb31a}.sg-b.on{background:#16203d;color:#fff}.sg-b.red{background:#ff4d5e;color:#fff}
  .sg-title{flex:1;min-width:120px;height:40px;border-radius:12px;border:0;padding:0 12px;font:700 16px Fredoka,system-ui,sans-serif;background:#ffffffee}
  .sg-tools{position:absolute;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;overflow-x:auto;padding:6px;background:#16203dcc;border-radius:16px;scrollbar-width:thin}
  .sg-tool{flex:none;width:62px;height:58px;border-radius:12px;border:2px solid transparent;background:#ffffff18;color:#fff;font:600 11px Fredoka,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer}
  .sg-tool span{font-size:22px;line-height:1}.sg-tool.on{border-color:#ffc21a;background:#ffffff33}
  .sg-sep{flex:none;width:2px;background:#ffffff33;margin:4px 2px;border-radius:2px}
  .sg-prop{position:absolute;right:8px;top:calc(60px + env(safe-area-inset-top,0px));width:230px;background:#ffffffee;border-radius:16px;padding:10px;font-size:13px;max-height:calc(100% - 160px);overflow:auto}
  .sg-prop h4{font-size:14px;margin:6px 0 4px}.sg-prop .sw{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}
  .sg-prop .sw button{aspect-ratio:1;border-radius:6px;border:2px solid #0002;cursor:pointer}.sg-prop .sw button.on{border-color:#16203d;box-shadow:0 0 0 2px #fff inset}
  .sg-prop select{width:100%;height:34px;border-radius:8px;border:2px solid #dfe5f1;font:inherit}
  .sg-step{display:flex;align-items:center;gap:4px;margin-top:4px}.sg-step b{width:16px}.sg-step button{width:30px;height:28px;border-radius:8px;border:0;background:#eef1f6;font-weight:800;cursor:pointer}.sg-step span{flex:1;text-align:center;font-weight:800}
  .sg-prop .acts{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}.sg-prop .acts .sg-b{height:32px;font-size:13px;padding:0 8px;box-shadow:none;background:#eef1f6}
  .sg-prop.min .body{display:none}
  .sg-prop .ptog{float:right;border:0;background:#eef1f6;border-radius:8px;width:28px;height:24px;cursor:pointer;font-weight:800}
  @media (max-width:700px){
    .sg-top .lbl{display:none}.sg-top{flex-wrap:nowrap}.sg-title{min-width:60px;font-size:14px}.sg-b{padding:0 10px}
    .sg-prop{top:auto;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:210px;max-height:46%}
    .sg-help{max-width:62%;font-size:11px}
  }
  .sg-help{position:absolute;left:8px;top:calc(56px + env(safe-area-inset-top,0px));background:#16203dcc;color:#fff;border-radius:12px;padding:8px 10px;font-size:12px;max-width:300px;pointer-events:none}
  .sg-hud{position:absolute;left:8px;top:calc(56px + env(safe-area-inset-top,0px));display:flex;gap:6px;flex-wrap:wrap;pointer-events:none}
  .sg-pill{background:#16203dcc;color:#fff;border-radius:999px;padding:6px 12px;font-weight:700;font-size:15px}
  .sg-hp{width:150px;height:12px;border-radius:8px;background:#ffffff44;overflow:hidden;margin-top:4px}.sg-hp i{display:block;height:100%;background:#14c79a;transition:width .2s}
  .sg-msg{position:absolute;left:50%;top:22%;transform:translateX(-50%);background:#16203dd9;color:#fff;font-weight:700;font-size:20px;padding:10px 18px;border-radius:14px;pointer-events:none;opacity:0;transition:opacity .25s;text-align:center}
  .sg-msg.show{opacity:1}
  .sg-cross{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #0006;pointer-events:none}
  .sg-pad{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom,0px));display:none;gap:10px;align-items:flex-end}
  .touch .sg-pad{display:flex}.sg-pad.l{left:18px}.sg-pad.r{right:18px}
  .sg-joy{width:130px;height:130px;border-radius:50%;background:#ffffff26;border:2px solid #ffffff55;position:relative}
  .sg-joy i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px;border-radius:50%;background:#ffffffcc}
  .sg-kb{width:74px;height:74px;border-radius:50%;border:0;background:#ffffffcc;font:700 15px Fredoka,system-ui,sans-serif;color:#16203d}
  .sg-kb.big{width:92px;height:92px;background:#2f6bff;color:#fff}
  .sg-end{position:absolute;inset:0;background:#0009;display:none;align-items:center;justify-content:center;padding:16px}
  .sg-end.open{display:flex}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  document.body.insertAdjacentHTML('beforeend', `
  <section class="screen" id="s-studio">
    <header class="topbar"><div class="topbar-in">
      <button class="iconbtn" id="stu-back" aria-label="Back to games">‹</button>
      <h2 style="font-size:20px">🛠️ LSP Studio</h2><div class="spacer"></div>
      <span class="pill" title="Points">⭐ <span class="js-points">0</span></span>
    </div></header>
    <main class="wrap">
      <div class="st-hero"><div style="flex:1;min-width:240px"><h1>Make your own game</h1>
        <p>Build a 3D game with blocks, ramps, cars, coins, lava and enemy bots. Publish it for everyone. Make it free or set a price — when players buy your game, the points go to you.</p></div>
        <button class="btn gold" id="stu-new">＋ Create a game</button></div>
      <div class="tabs" role="tablist" style="margin-top:16px">
        <button class="tab on" data-t="disc">🔥 Discover</button><button class="tab" data-t="mine">🧰 My games</button><button class="tab" data-t="how">❓ How it works</button>
      </div>
      <div class="gpanel on" data-p="disc"><div class="grid" id="stu-disc"><p class="muted">Loading games…</p></div></div>
      <div class="gpanel" data-p="mine"><div id="stu-mine"></div></div>
      <div class="gpanel" data-p="how"><div class="my-row" style="display:block;line-height:1.6">
        <b>1. Create.</b> Pick a starter (Obby, Race track, Coin hunt, Arena, Mini city or Blank).<br>
        <b>2. Build.</b> Pick a part at the bottom, then click or tap to place it. Drag to turn the camera, scroll or pinch to zoom. Choose colours, materials and sizes on the right.<br>
        <b>3. Test.</b> Press ▶ Test to play your game right away.<br>
        <b>4. Publish.</b> Give it a name, a picture and a price (free or up to ⭐ 10,000). It shows up in Discover for everyone.<br>
        <b>5. Earn.</b> Every time someone buys your game, the points go straight into your wallet. See your plays, sales and earnings in My games.<br>
        <span class="muted">LSP rules apply to every game: no dating, nothing sexual and no swearing. Games that break the rules are taken down.</span>
      </div></div>
    </main>
  </section>
  <section class="screen" id="s-sgame">
    <canvas id="sg-cv"></canvas>
    <div class="sg-ui" id="sg-edit">
      <div class="sg-top">
        <button class="sg-b" id="ed-exit">‹ Exit</button>
        <input class="sg-title" id="ed-title" maxlength="40" placeholder="Name your game">
        <button class="sg-b" id="ed-undo" title="Undo (Ctrl+Z)">↩️</button>
        <button class="sg-b" id="ed-set" title="Settings">⚙️<span class="lbl"> Settings</span></button>
        <button class="sg-b gold" id="ed-test" title="Test">▶<span class="lbl"> Test</span></button>
        <button class="sg-b" id="ed-save" title="Save">💾<span class="lbl"> Save</span></button>
        <button class="sg-b pri" id="ed-pub" title="Publish">🚀<span class="lbl"> Publish</span></button>
      </div>
      <div class="sg-help" id="ed-help" style="transition:opacity .6s">Pick a part below, then click to place it. Drag to turn the camera · scroll/pinch to zoom · WASD to move · R to rotate · Delete to remove.</div>
      <div class="sg-prop" id="ed-prop"></div>
      <div class="sg-tools" id="ed-tools"></div>
    </div>
    <div class="sg-ui" id="sg-play" hidden>
      <div class="sg-top"><button class="sg-b" id="pl-exit">‹ Exit</button><div class="spacer" style="flex:1"></div><span class="sg-pill" id="pl-name"></span></div>
      <div class="sg-hud"><div class="sg-pill"><span id="pl-hp-t">❤️ 100</span><div class="sg-hp"><i id="pl-hp"></i></div></div><span class="sg-pill" id="pl-goal"></span><span class="sg-pill" id="pl-time"></span></div>
      <div class="sg-msg" id="pl-msg"></div>
      <div class="sg-cross" id="pl-cross" hidden></div>
      <div class="sg-pad l"><div class="sg-joy" id="pl-joy"><i></i></div></div>
      <div class="sg-pad r"><button class="sg-kb" id="pl-e">E</button><button class="sg-kb" id="pl-f">🔫</button><button class="sg-kb big" id="pl-jump">Jump</button></div>
      <div class="sg-end" id="pl-end"><div class="st-card" id="pl-end-card" style="text-align:center"></div></div>
    </div>
  </section>
  <div class="st-modal" id="st-modal"><div class="st-card" id="st-mcard"></div></div>`);

  const modal = (html) => { $('#st-mcard').innerHTML = '<button class="st-x" data-x>✕</button>' + html; $('#st-modal').classList.add('open'); $('#st-mcard [data-x]').onclick = closeModal; return $('#st-mcard'); };
  const closeModal = () => $('#st-modal').classList.remove('open');
  $('#st-modal').addEventListener('click', (e) => { if (e.target.id === 'st-modal') closeModal(); });

  /* ===================== hub entry ===================== */
  const hubWrap = document.querySelector('#s-hub main.wrap');
  const after = $('#play-intercode');
  if (hubWrap && after) {
    after.insertAdjacentHTML('afterend', `
    <button class="featured" id="play-studio">
      <div class="art" style="background:linear-gradient(135deg,#16203d,#6a3dc9);display:grid;place-items:center;font-size:90px">🛠️</div>
      <div class="info"><span class="tag" style="background:#f1e9ff;color:#6a3dc9">New · Make games</span><h2>LSP Studio</h2>
        <p class="muted">Build your own 3D games — obbies, races, coin hunts, arenas, whole cities — and publish them. When players buy your game, you get the points.</p>
        <span class="btn primary">Open Studio</span></div>
    </button>
    <h2 class="section-title">🎮 Made by players</h2><div class="grid" id="hub-player-games"><p class="muted">Loading…</p></div>`);
    $('#play-studio').onclick = () => openStudio('disc');
  }
  L.onHub(() => loadDiscover(true));

  let discList = [];
  const card = (g) => {
    const tag = g.mine ? '<span class="sg-price own">Yours</span>' : g.owned && g.price ? '<span class="sg-price own">Owned</span>' : g.price ? `<span class="sg-price">⭐ ${g.price.toLocaleString()}</span>` : '<span class="sg-price free">Free</span>';
    return `<button class="sg-card" data-g="${esc(g.id)}"><div class="thumb" style="background:${esc(g.color)}">${esc(g.emoji)}</div>${tag}
      <div class="meta"><h3>${esc(g.title)}</h3><div class="by">by @${esc(g.by)}</div><div class="stats"><span>▶ ${L.fmt(g.plays)}</span><span>👍 ${L.fmt(g.likes)}</span></div></div></button>`;
  };
  async function loadDiscover(hubOnly) {
    try { discList = await api('/api/studio/games'); } catch (e) { discList = []; }
    const empty = '<p class="muted">No player games yet. Be the first — open LSP Studio and make one!</p>';
    const hub = $('#hub-player-games'); if (hub) { hub.innerHTML = discList.length ? discList.slice(0, 8).map(card).join('') : empty; bindCards(hub); }
    if (!hubOnly) { const d = $('#stu-disc'); d.innerHTML = discList.length ? discList.map(card).join('') : empty; bindCards(d); }
  }
  const bindCards = (root) => root.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => gameInfo(b.dataset.g)));

  async function gameInfo(id) {
    let r; try { r = await api('/api/studio/game/' + encodeURIComponent(id)); } catch (e) { return toast(e.message); }
    const g = r.game;
    const btn = r.data ? `<button class="btn primary" data-a="play">▶ Play</button>` : `<button class="btn gold" data-a="buy">Buy for ⭐ ${g.price.toLocaleString()}</button>`;
    const c = modal(`<div style="height:120px;border-radius:16px;background:${esc(g.color)};display:grid;place-items:center;font-size:70px;margin:20px 0 12px">${esc(g.emoji)}</div>
      <h2>${esc(g.title)}</h2><p class="muted" style="font-weight:700">by @${esc(g.by)} · ${esc(GOALS[g.goal] || '')}</p>
      <p style="margin-top:8px">${esc(g.desc) || '<span class="muted">No description.</span>'}</p>
      <div class="statline"><span class="pill">▶ ${L.fmt(g.plays)} plays</span><span class="pill">👍 ${L.fmt(g.likes)}</span><span class="pill">${g.price ? '⭐ ' + g.price.toLocaleString() : 'Free'}</span></div>
      ${!r.data ? `<p class="muted" style="margin-top:10px;font-size:14px">You pay once and keep the game. The points go to @${esc(g.by)}, who made it.</p>` : ''}
      <div class="row">${btn}<button class="btn ghost" data-a="like">${g.liked ? '👍 Liked' : '👍 Like'}</button>
      ${profile && profile.admin && !g.mine ? '<button class="btn ghost" data-a="rm" style="color:#ff4d5e">🗑 Remove (admin)</button>' : ''}</div>`);
    c.querySelectorAll('[data-a]').forEach((b) => (b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'play') { closeModal(); play(r.data, g); }
      if (a === 'buy') {
        if (Wallet.get() < g.price) return toast(`You need ⭐ ${g.price.toLocaleString()} points. Get more in the points store.`, 3500);
        setBusy(b, true);
        try { const x = await api('/api/studio/buy/' + g.id, {}); Wallet.sync(x.points); toast(`Bought! @${g.by} got your ⭐ ${g.price.toLocaleString()} points.`, 3500); closeModal(); loadDiscover(); play(x.data, g); }
        catch (e) { toast(e.message); setBusy(b, false); }
      }
      if (a === 'like') { try { const x = await api('/api/studio/like/' + g.id, {}); b.textContent = x.liked ? '👍 Liked' : '👍 Like'; loadDiscover(); } catch (e) { toast(e.message); } }
      if (a === 'rm') { try { await api('/api/studio/remove/' + g.id, {}); toast('Game removed.'); closeModal(); loadDiscover(); } catch (e) { toast(e.message); } }
    }));
  }

  /* ===================== studio screen ===================== */
  const setTab = L.tabs('#s-studio', (t) => { if (t === 'mine') loadMine(); if (t === 'disc') loadDiscover(); });
  function openStudio(tab) { refreshPoints(); show('s-studio'); setTab(tab || 'disc'); api('/api/wallet').then((w) => Wallet.sync(w.points)).catch(() => {}); }
  $('#stu-back').onclick = () => { show('s-hub'); enterHub(); };
  $('#stu-new').onclick = newGame;
  if (location.hash === '#studio') setTimeout(() => { if (profile) openStudio('disc'); }, 800);

  async function loadMine() {
    const box = $('#stu-mine'); box.innerHTML = '<p class="muted">Loading…</p>';
    let list = []; try { list = await api('/api/studio/mine'); } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
    const total = list.reduce((a, g) => a + (g.earned || 0), 0);
    box.innerHTML = `<div class="my-row"><div class="grow"><b>Your earnings from games</b><div class="st-earn" style="font-size:22px">⭐ ${total.toLocaleString()}</div></div><button class="btn gold" id="stu-new2">＋ New game</button></div>` +
      (list.length ? list.map((g) => `<div class="my-row"><div class="ic" style="background:${esc(g.color)}">${esc(g.emoji)}</div>
        <div class="grow"><b style="font-size:17px">${esc(g.title)}</b> <span class="st-badge ${g.published ? 'live' : ''}">${g.published ? 'Published' : 'Draft'}</span>
        <div class="muted" style="font-size:13px;font-weight:700">${g.price ? '⭐ ' + g.price.toLocaleString() : 'Free'} · ▶ ${g.plays} plays · 👍 ${g.likes} · 🛒 ${g.sales} sold · <span class="st-earn">⭐ ${(g.earned || 0).toLocaleString()} earned</span></div></div>
        <button class="btn primary" data-ed="${g.id}">✏️ Edit</button><button class="btn ghost" data-pl="${g.id}">▶ Play</button><button class="btn ghost" data-del="${g.id}" style="color:#ff4d5e">🗑</button></div>`).join('')
        : '<p class="muted" style="margin-top:14px">You haven\'t made a game yet. Press ＋ New game to start.</p>');
    $('#stu-new2').onclick = newGame;
    box.querySelectorAll('[data-ed]').forEach((b) => (b.onclick = async () => { try { const r = await api('/api/studio/game/' + b.dataset.ed); edit(r.data, r.game); } catch (e) { toast(e.message); } }));
    box.querySelectorAll('[data-pl]').forEach((b) => (b.onclick = async () => { try { const r = await api('/api/studio/game/' + b.dataset.pl); play(r.data, r.game); } catch (e) { toast(e.message); } }));
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      const c = modal(`<h2>Delete this game?</h2><p class="muted" style="margin-top:8px">It will be gone for good, including for players who bought it.</p><div class="row"><button class="btn ghost" data-x2>Keep it</button><button class="btn" style="background:#ff4d5e;color:#fff" data-y>Delete</button></div>`);
      c.querySelector('[data-x2]').onclick = closeModal;
      c.querySelector('[data-y]').onclick = async () => { try { await api('/api/studio/delete/' + b.dataset.del, {}); closeModal(); loadMine(); toast('Game deleted'); } catch (e) { toast(e.message); } };
    }));
  }

  function newGame() {
    let pick = 'obby';
    const c = modal(`<h2>Create a game</h2><p class="muted">Pick a starter. You can change everything later.</p>
      <div class="tpl-grid">${TEMPLATES.map(([k, e, n, d]) => `<button class="tpl${k === pick ? ' on' : ''}" data-k="${k}"><b>${e}</b><strong>${n}</strong><br><small>${d}</small></button>`).join('')}</div>
      <label>Game name<input id="ng-name" maxlength="40" placeholder="My awesome game"></label>
      <div class="row"><button class="btn primary" id="ng-go">Start building</button></div>`);
    c.querySelectorAll('.tpl').forEach((b) => (b.onclick = () => { pick = b.dataset.k; c.querySelectorAll('.tpl').forEach((x) => x.classList.toggle('on', x === b)); }));
    c.querySelector('#ng-go').onclick = () => {
      const name = c.querySelector('#ng-name').value.trim() || TEMPLATES.find((t) => t[0] === pick)[2] + ' by ' + (profile.username || 'me');
      closeModal();
      const t = TEMPLATES.find((x) => x[0] === pick);
      edit(tmpl(pick), { title: name.slice(0, 40), emoji: t[1], color: ['#2f6bff', '#ff4d5e', '#14c79a', '#b04dff', '#ff8a3d'][Math.floor(Math.random() * 5)], price: 0, desc: '' });
    };
  }

  /* ===================== 3D engine (shared by editor + player) ===================== */
  const G = { T: null, R: null, scene: null, cam: null, mode: null, raf: 0, last: 0 };
  const texCache = {}, matCache = {};
  function detailTex(kind) {
    if (texCache[kind]) return texCache[kind];
    const T = G.T, n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
    const noise = (a, b, k = 2600, sz = 2) => { for (let i = 0; i < k; i++) { const v = a + Math.random() * (b - a); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * n, Math.random() * n, sz, sz); } };
    g.fillStyle = '#fff'; g.fillRect(0, 0, n, n);
    if (kind === 'brick') { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, n, n); for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const v = 200 + Math.random() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(k * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26); } noise(150, 255, 1500); }
    else if (kind === 'wood') { for (let y = 0; y < n; y += 2) { const v = 200 + Math.sin(y * 0.15) * 25 + Math.random() * 20; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, n, 2); } for (let k = 0; k < 4; k++) { g.fillStyle = '#9998'; g.fillRect(0, k * 64, n, 2); } }
    else if (kind === 'concrete' || kind === 'stone') { noise(195, 255, 7000, 2); if (kind === 'stone') { g.strokeStyle = '#999'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(Math.random() * n, 0); g.lineTo(Math.random() * n, n); g.stroke(); } } else { g.fillStyle = '#bbb'; g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n); } }
    else if (kind === 'grass') { noise(140, 255, 12000, 2); }
    else if (kind === 'metal') { for (let y = 0; y < n; y++) { const v = 215 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, n, 1); } }
    else if (kind === 'sand' || kind === 'snow') noise(215, 255, 9000, 2);
    else if (kind === 'asphalt') { g.fillStyle = '#ddd'; g.fillRect(0, 0, n, n); noise(150, 255, 14000, 2); }
    else noise(238, 255, 900, 3);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
    return (texCache[kind] = t);
  }
  function mat(color, m, extra) {
    const k = color + m + (extra || ''); if (matCache[k]) return matCache[k];
    const T = G.T; const o = { color, roughness: 0.75, metalness: 0 };
    if (m !== 'neon' && m !== 'ice') o.map = detailTex(m);
    if (m === 'plastic') o.roughness = 0.45;
    if (m === 'metal') { o.metalness = 0.85; o.roughness = 0.32; }
    if (m === 'brick') o.roughness = 0.9;
    if (m === 'wood') o.roughness = 0.7;
    if (m === 'neon') { o.emissive = new T.Color(color); o.emissiveIntensity = 1.2; o.roughness = 0.4; }
    if (m === 'ice') { o.roughness = 0.08; o.metalness = 0.1; o.transparent = true; o.opacity = 0.82; }
    if (extra === 'glass') { o.transparent = true; o.opacity = 0.32; o.roughness = 0.05; o.metalness = 0.2; delete o.map; }
    if (extra === 'water') { o.transparent = true; o.opacity = 0.62; o.roughness = 0.08; o.metalness = 0.1; delete o.map; }
    return (matCache[k] = new T.MeshStandardMaterial(o));
  }
  function boxGeo(w, h, d) { // UVs in metres so textures keep their real size on any block
    const g = new G.T.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / 2, uv.getY(i) * dims[f][1] / 2); }
    return g;
  }
  function rampGeo(w, h, d) {
    const T = G.T, s = new T.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(d / 2, h); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(w / 2, 0, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    g.computeVertexNormals(); return g;
  }
  const mesh = (geo, m, x, y, z, parent) => { const o = new G.T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o; };
  let flagTex = null;
  function checkerTex() {
    if (flagTex) return flagTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); }
    flagTex = new G.T.CanvasTexture(c); flagTex.magFilter = G.T.NearestFilter; flagTex.colorSpace = G.T.SRGBColorSpace; flagTex.wrapS = flagTex.wrapT = G.T.RepeatWrapping; return flagTex;
  }
  function person(shirt, pants = '#2d3a5c', skin = '#f1c27d') {
    const T = G.T, g = new T.Group(), sk = mat(skin, 'plastic'), pm = mat(pants, 'plastic'), sm = mat(shirt, 'plastic');
    const limb = (x, y, w, h, m) => { const p = new T.Group(); p.position.set(x, y, 0); mesh(boxGeo(w, h, w + 0.02), m, 0, -h / 2, 0, p); g.add(p); return p; };
    g.userData.legs = [limb(-0.13, 0.9, 0.24, 0.9, pm), limb(0.13, 0.9, 0.24, 0.9, pm)];
    g.userData.arms = [limb(-0.38, 1.5, 0.18, 0.62, sm), limb(0.38, 1.5, 0.18, 0.62, sm)];
    mesh(boxGeo(0.56, 0.62, 0.32), sm, 0, 1.21, 0, g); mesh(boxGeo(0.4, 0.4, 0.4), sk, 0, 1.74, 0, g);
    const eye = mat('#16203d', 'plastic'); mesh(new T.BoxGeometry(0.06, 0.07, 0.02), eye, -0.08, 1.78, 0.21, g); mesh(new T.BoxGeometry(0.06, 0.07, 0.02), eye, 0.08, 1.78, 0.21, g);
    return g;
  }
  function carModel(color) {
    const T = G.T, g = new T.Group(), paint = new T.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.08 });
    mesh(boxGeo(2.1, 0.6, 4.3), paint, 0, 0.65, 0, g); mesh(boxGeo(1.8, 0.55, 2.2), paint, 0, 1.22, -0.2, g);
    const glass = mat('#1b2433', 'plastic', 'glass'); const gl = mesh(boxGeo(1.84, 0.45, 2.0), new T.MeshStandardMaterial({ color: '#1b2433', roughness: 0.05, metalness: 0.4 }), 0, 1.24, -0.2, g); gl.scale.set(1.01, 0.9, 1.01); void glass;
    const tire = mat('#16181d', 'plastic'), rim = mat('#c9cfd8', 'metal'), wg = new T.CylinderGeometry(0.38, 0.38, 0.3, 18); wg.rotateZ(Math.PI / 2);
    g.userData.wheels = [];
    for (const [x, z] of [[-1, 1.35], [1, 1.35], [-1, -1.35], [1, -1.35]]) { const w = new T.Group(); w.position.set(x, 0.38, z); mesh(wg, tire, 0, 0, 0, w); const rr = mesh(new T.CylinderGeometry(0.2, 0.2, 0.32, 10), rim, 0, 0, 0, w); rr.rotation.z = Math.PI / 2; g.add(w); g.userData.wheels.push(w); }
    const hl = new T.MeshStandardMaterial({ color: '#fff', emissive: '#fff8e0', emissiveIntensity: 1.5 }), tl = new T.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff1010', emissiveIntensity: 0.8 });
    mesh(new T.BoxGeometry(0.42, 0.16, 0.05), hl, -0.65, 0.75, 2.16, g); mesh(new T.BoxGeometry(0.42, 0.16, 0.05), hl, 0.65, 0.75, 2.16, g);
    mesh(new T.BoxGeometry(0.42, 0.14, 0.05), tl, -0.65, 0.78, -2.16, g); mesh(new T.BoxGeometry(0.42, 0.14, 0.05), tl, 0.65, 0.78, -2.16, g);
    return g;
  }

  // Build the 3D object for one part. Returns a Group placed in the world.
  function buildPart(p) {
    const T = G.T, [t, x, y, z, w, h, d, c, r, m] = p, root = new T.Group();
    root.position.set(x, y, z); root.rotation.y = r * Math.PI / 2;
    const D = PARTS[t];
    switch (t) {
      case 'block': case 'wall': case 'move': mesh(boxGeo(w, h, d), mat(c, m), 0, h / 2, 0, root); break;
      case 'glass': mesh(boxGeo(w, h, d), mat(c, 'plastic', 'glass'), 0, h / 2, 0, root).castShadow = false; break;
      case 'water': { const o = mesh(boxGeo(w, h, d), mat(c, 'plastic', 'water'), 0, h / 2, 0, root); o.castShadow = false; break; }
      case 'ramp': mesh(rampGeo(w, h, d), mat(c, m), 0, 0, 0, root); break;
      case 'cyl': mesh(new T.CylinderGeometry(w / 2, w / 2, h, 24), mat(c, m), 0, h / 2, 0, root); break;
      case 'ball': mesh(new T.SphereGeometry(Math.min(w, h, d) / 2, 28, 20), mat(c, m), 0, h / 2, 0, root); break;
      case 'lava': { const o = mesh(boxGeo(w, h, d), new T.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3a00', emissiveIntensity: 1.4, roughness: 0.6, map: detailTex('stone') }), 0, h / 2, 0, root); root.userData.lava = o; break; }
      case 'spawn': case 'check': {
        mesh(boxGeo(w, h, d), mat(t === 'spawn' ? '#d8f7ee' : '#dfe8ff', 'plastic'), 0, h / 2, 0, root);
        mesh(new T.CylinderGeometry(Math.min(w, d) * 0.35, Math.min(w, d) * 0.35, 0.04, 32), mat(c, 'neon'), 0, h + 0.02, 0, root);
        if (t === 'check') { mesh(new T.CylinderGeometry(0.06, 0.06, 3, 8), mat('#dfe3ea', 'metal'), w / 2 - 0.3, h + 1.5, 0, root); mesh(new T.BoxGeometry(0.05, 0.7, 1), mat(c, 'plastic'), w / 2 - 0.3, h + 2.6, 0.5, root); }
        break;
      }
      case 'finish': {
        const fm = new T.MeshStandardMaterial({ map: checkerTex(), roughness: 0.6 }); fm.map.repeat.set(w, d);
        mesh(boxGeo(w, h, d), fm, 0, h / 2, 0, root);
        const pm = mat('#f4f6fa', 'metal'); mesh(new T.CylinderGeometry(0.15, 0.15, 4, 10), pm, -w / 2, h + 2, 0, root); mesh(new T.CylinderGeometry(0.15, 0.15, 4, 10), pm, w / 2, h + 2, 0, root);
        const ban = new T.MeshStandardMaterial({ map: checkerTex(), roughness: 0.6, side: T.DoubleSide }); mesh(new T.BoxGeometry(w, 0.8, 0.1), ban, 0, h + 3.8, 0, root);
        break;
      }
      case 'coin': { const o = mesh(new T.CylinderGeometry(0.45, 0.45, 0.1, 28), new T.MeshStandardMaterial({ color: '#ffc21a', metalness: 0.9, roughness: 0.25, emissive: '#5a3a00', emissiveIntensity: 0.4 }), 0, 0.5, 0, root); o.rotation.x = Math.PI / 2; root.userData.spinner = o; break; }
      case 'gem': { const o = mesh(new T.OctahedronGeometry(0.45), new T.MeshStandardMaterial({ color: c, metalness: 0.3, roughness: 0.05, emissive: c, emissiveIntensity: 0.35 }), 0, 0.6, 0, root); root.userData.spinner = o; break; }
      case 'heal': { const g2 = new T.Group(); g2.position.y = 0.6; const hm = mat('#ff4d5e', 'neon'); mesh(new T.BoxGeometry(0.7, 0.22, 0.22), hm, 0, 0, 0, g2); mesh(new T.BoxGeometry(0.22, 0.7, 0.22), hm, 0, 0, 0, g2); root.add(g2); root.userData.spinner = g2; break; }
      case 'jump': { mesh(boxGeo(w, h * 0.5, d), mat('#3a4258', 'metal'), 0, h * 0.25, 0, root); mesh(new T.CylinderGeometry(Math.min(w, d) * 0.42, Math.min(w, d) * 0.42, h * 0.5, 28), mat(c, 'neon'), 0, h * 0.75, 0, root); break; }
      case 'speed': { mesh(boxGeo(w, h, d), mat('#3a4258', 'metal'), 0, h / 2, 0, root); for (let k = -1; k <= 1; k++) { const a = mesh(new T.ConeGeometry(Math.min(w, 2) * 0.35, 0.8, 3), mat(c, 'neon'), 0, h + 0.02, k * d * 0.28, root); a.rotation.x = Math.PI / 2; a.scale.y = 0.2; } break; }
      case 'spin': { mesh(new T.CylinderGeometry(0.4, 0.5, 1.2, 16), mat('#3a4258', 'metal'), 0, 0.6, 0, root); const bar = new T.Group(); bar.position.y = 1.0; mesh(boxGeo(w, h, d), mat(c, m), 0, 0, 0, bar); root.add(bar); root.userData.bar = bar; break; }
      case 'bot': { const b = person(c, '#16203d', '#9aa4b8'); root.add(b); root.userData.body = b; const eye = mat('#ff2020', 'neon'); mesh(new T.BoxGeometry(0.3, 0.06, 0.02), eye, 0, 1.78, 0.215, b); break; }
      case 'car': { const cm = carModel(c); root.add(cm); root.userData.car = cm; break; }
      case 'tree': {
        const s = h / 7; mesh(new T.CylinderGeometry(0.18 * s, 0.3 * s, 3 * s, 8), mat('#6b4a2f', 'wood'), 0, 1.5 * s, 0, root);
        const lm = new T.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
        [[0, 3.6, 0, 1.9], [0.7, 4.8, 0.3, 1.4], [-0.6, 5.1, -0.4, 1.2], [0, 6, 0, 1]].forEach(([a, b2, cc, rr]) => mesh(new T.IcosahedronGeometry(rr * s * (w / 3), 1), lm, a * s, b2 * s, cc * s, root));
        break;
      }
      case 'lamp': {
        const pm = mat('#3a4258', 'metal'); mesh(new T.CylinderGeometry(0.09, 0.14, 5, 10), pm, 0, 2.5, 0, root); mesh(new T.BoxGeometry(0.1, 0.1, 1.2), pm, 0, 4.95, 0.5, root);
        const bulb = mesh(new T.BoxGeometry(0.4, 0.12, 0.5), new T.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffd890', emissiveIntensity: 0 }), 0, 4.85, 1.0, root); root.userData.bulb = bulb; break;
      }
      case 'house': {
        const wh = h * 0.62, rm = mat('#7a3b2e', 'wood');
        mesh(boxGeo(w, wh, d), mat(c, m), 0, wh / 2, 0, root);
        const roof = mesh(new T.ConeGeometry(Math.hypot(w, d) / 2 * 1.02, h - wh, 4, 1), rm, 0, wh + (h - wh) / 2, 0, root); roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414);
        mesh(new T.BoxGeometry(1.1, 2.1, 0.08), mat('#6b4a2f', 'wood'), 0, 1.05, d / 2 + 0.04, root);
        const win = new T.MeshStandardMaterial({ color: '#9fc8e8', roughness: 0.1, metalness: 0.3, emissive: '#ffcf7a', emissiveIntensity: 0 }); root.userData.windows = win;
        for (const sx of [-1, 1]) { mesh(new T.BoxGeometry(1.2, 1.1, 0.08), win, sx * w * 0.28, wh * 0.55, d / 2 + 0.04, root); mesh(new T.BoxGeometry(1.2, 1.1, 0.08), win, sx * w * 0.28, wh * 0.55, -d / 2 - 0.04, root); }
        break;
      }
      case 'cone': { mesh(new T.ConeGeometry(0.3, 0.85, 16), mat('#ff7a1a', 'plastic'), 0, 0.45, 0, root); mesh(new T.BoxGeometry(0.6, 0.05, 0.6), mat('#ff7a1a', 'plastic'), 0, 0.025, 0, root); mesh(new T.CylinderGeometry(0.17, 0.2, 0.12, 16), mat('#f4f6fa', 'plastic'), 0, 0.5, 0, root); break; }
    }
    void D;
    return root;
  }
  function signMesh(s) {
    const T = G.T, [x, y, z, text, r] = s, c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#16203d'; L.rr(g, 0, 0, 512, 128, 18); g.fill(); g.strokeStyle = '#ffc21a'; g.lineWidth = 6; L.rr(g, 6, 6, 500, 116, 14); g.stroke();
    g.fillStyle = '#fff'; let fs = 56; g.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; while (g.measureText(text).width > 470 && fs > 18) { fs -= 2; g.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    const root = new T.Group(); root.position.set(x, y, z); root.rotation.y = r * Math.PI / 2;
    const sm = new T.MeshStandardMaterial({ map: tx, roughness: 0.6, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0.25 });
    mesh(new T.PlaneGeometry(4, 1), sm, 0, 0, 0.02, root).castShadow = false;
    const back = mesh(new T.PlaneGeometry(4, 1), sm, 0, 0, -0.02, root); back.rotation.y = Math.PI; back.castShadow = false;
    mesh(new T.BoxGeometry(4.1, 1.1, 0.03), mat('#16203d', 'plastic'), 0, 0, 0, root);
    return root;
  }

  // Sky, light, fog and floor for a game.
  const SKY = {
    day: { g: ['#2c6fc4', '#8fc0ea', '#dfeaf2'], sun: '#fff1dc', si: 2.8, hemi: [1.0, '#dfefff', '#6f6a55'], fog: '#cfdeea', far: 320, sunPos: [60, 90, 40], exp: 1.0 },
    sunset: { g: ['#1e2457', '#c4607a', '#ffb479'], sun: '#ffb070', si: 2.2, hemi: [0.7, '#ffcfa8', '#4a3a4a'], fog: '#e9a88a', far: 280, sunPos: [-80, 22, -40], exp: 1.05 },
    night: { g: ['#02040b', '#0a1430', '#18234a'], sun: '#9fb6ff', si: 0.35, hemi: [0.28, '#5a6fb0', '#141820'], fog: '#0b1228', far: 200, sunPos: [40, 70, -30], exp: 1.1, stars: 1, lamps: 1 },
    storm: { g: ['#3a414e', '#5b6372', '#7d8592'], sun: '#cfd8e8', si: 0.9, hemi: [0.75, '#9aa6b8', '#3a3f48'], fog: '#6d7583', far: 170, sunPos: [30, 80, 20], exp: 1.0, rain: 1, lamps: 1 },
    space: { g: ['#000', '#05030f', '#120a2a'], sun: '#ffffff', si: 2.2, hemi: [0.35, '#8a7dff', '#100820'], fog: '#05030f', far: 600, sunPos: [80, 60, 60], exp: 1.0, stars: 1 },
  };
  const GROUND_LOOK = { grass: ['#5c8f45', 'grass', 18], sand: ['#e2c58d', 'sand', 14], snow: ['#f2f6fb', 'snow', 14], city: ['#4b505b', 'asphalt', 10], lava: ['#ff5a1f', 'lava', 10] };

  async function boot() {
    if (G.R) return true;
    try { G.T = await L.three(); } catch (e) { toast('3D could not load on this device.'); return false; }
    const T = G.T, cv = $('#sg-cv'), touch = L.isTouch();
    try { G.R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { toast('Your device does not support 3D (WebGL).'); return false; }
    G.R.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.5 : 2));
    G.R.toneMapping = T.ACESFilmicToneMapping; G.R.outputColorSpace = T.SRGBColorSpace;
    G.R.shadowMap.enabled = true; G.R.shadowMap.type = T.PCFSoftShadowMap;
    G.cam = new T.PerspectiveCamera(60, 1, 0.1, 1200);
    addEventListener('resize', resize);
    return true;
  }
  function resize() { if (!G.R) return; const s = $('#s-sgame'), w = s.clientWidth || innerWidth, h = s.clientHeight || innerHeight; G.R.setSize(w, h, false); G.cam.aspect = w / h; G.cam.updateProjectionMatrix(); }

  function buildWorld(data) {
    const T = G.T, scene = new T.Scene(); G.scene = scene;
    const sk = SKY[data.sky] || SKY.day; G.sky = sk;
    const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
    sk.g.forEach((col, i) => gr.addColorStop(i / (sk.g.length - 1), col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
    const bg = new T.CanvasTexture(c); bg.colorSpace = T.SRGBColorSpace; scene.background = bg;
    scene.fog = new T.Fog(sk.fog, 30, sk.far);
    G.R.toneMappingExposure = sk.exp;
    // a soft environment so metal, glass and paint have something to reflect
    const pm = new T.PMREMGenerator(G.R), envScene = new T.Scene(); envScene.background = bg; scene.environment = pm.fromScene(envScene, 0.04).texture; pm.dispose();
    scene.add(new T.HemisphereLight(sk.hemi[1], sk.hemi[2], sk.hemi[0]));
    const sun = new T.DirectionalLight(sk.sun, sk.si); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -60; sc.right = sc.top = 60; sc.near = 1; sc.far = 400; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target); G.sun = sun;
    if (sk.stars) { const n = 1500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.48 * Math.PI, r = 500; pos[i * 3] = Math.cos(a) * Math.cos(b) * r; pos[i * 3 + 1] = Math.sin(b) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r; } const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); const pts = new T.Points(geo, new T.PointsMaterial({ color: '#fff', size: 1.6, sizeAttenuation: false, fog: false })); scene.add(pts); G.stars = pts; } else G.stars = null;
    if (data.ground !== 'none') {
      const [col, kind, rep] = GROUND_LOOK[data.ground] || GROUND_LOOK.grass;
      let gm;
      if (kind === 'lava') gm = new T.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3000', emissiveIntensity: 1.1, map: detailTex('stone'), roughness: 0.7 });
      else { const t = detailTex(kind).clone(); t.needsUpdate = true; t.repeat.set(600 / rep, 600 / rep); gm = new T.MeshStandardMaterial({ color: col, map: t, roughness: kind === 'snow' ? 0.6 : 0.95 }); }
      const gp = new T.Mesh(new T.PlaneGeometry(600, 600), gm); gp.rotation.x = -Math.PI / 2; gp.receiveShadow = true; scene.add(gp); G.groundMesh = gp;
    } else G.groundMesh = null;
    if (sk.rain) { const n = 2500, pos = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 120, y = Math.random() * 60, z = (Math.random() - 0.5) * 120; pos.set([x, y, z, x + 0.1, y - 0.9, z], i * 6); } const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); G.rain = new T.LineSegments(geo, new T.LineBasicMaterial({ color: '#c9d6ea', transparent: true, opacity: 0.45 })); scene.add(G.rain); } else G.rain = null;
    // lamps light up at night: a few real lights move to the nearest lamps
    G.lampLights = [];
    if (sk.lamps) for (let i = 0; i < 6; i++) { const l = new T.PointLight('#ffd08a', 0, 22, 1.6); scene.add(l); G.lampLights.push(l); }
  }
  function placeSun(x, y, z) { const s = G.sky.sunPos; G.sun.position.set(x + s[0], y + s[1], z + s[2]); G.sun.target.position.set(x, y, z); }
  function updateLamps(objs, cx, cz) {
    if (!G.lampLights.length) return;
    const lamps = objs.filter((o) => o.p[0] === 'lamp').map((o) => ({ o, d: (o.g.position.x - cx) ** 2 + (o.g.position.z - cz) ** 2 })).sort((a, b) => a.d - b.d);
    G.lampLights.forEach((l, i) => { const L2 = lamps[i]; if (!L2) { l.intensity = 0; return; } const g = L2.o.g; const v = new G.T.Vector3(0, 4.7, 1.0); g.localToWorld(v); l.position.copy(v); l.intensity = 30; });
  }
  function lightsOn(objs) { const night = !!G.sky.lamps; for (const o of objs) { if (o.g.userData.bulb) o.g.userData.bulb.material.emissiveIntensity = night ? 2.2 : 0; if (o.g.userData.windows) o.g.userData.windows.emissiveIntensity = night ? 0.9 : 0; } }

  function loop(fn) {
    cancelAnimationFrame(G.raf); G.last = performance.now();
    const step = (now) => { if (!L.isActive('s-sgame')) return; const dt = Math.max(0, Math.min(0.05, (now - G.last) / 1000)); G.last = now; fn(dt); G.R.render(G.scene, G.cam); G.raf = requestAnimationFrame(step); };
    G.raf = requestAnimationFrame(step);
  }

  /* ===================== editor ===================== */
  const E = { parts: [], signs: [], meta: null, data: null, objs: [], tool: 'block', color: null, mat: null, size: null, rot: 0, sel: null, undo: [], dirty: false, cam: { x: 0, y: 0, z: 0, yaw: 0.8, pitch: 0.75, dist: 40 }, keys: {} };
  async function edit(data, meta) {
    if (!(await boot())) return;
    E.meta = { id: meta.id || null, title: meta.title || '', desc: meta.desc || '', emoji: meta.emoji || '🎮', color: meta.color || '#2f6bff', price: meta.price || 0, published: !!meta.published };
    E.data = { sky: data.sky, ground: data.ground, goal: data.goal, time: data.time || 0, lives: data.lives || 0 };
    E.parts = data.parts.map((p) => p.slice()); E.signs = (data.signs || []).map((s) => s.slice());
    E.undo = []; E.sel = null; E.dirty = false;
    const sp = E.parts.find((p) => p[0] === 'spawn'); Object.assign(E.cam, { x: sp ? sp[1] : 0, y: sp ? sp[2] : 0, z: sp ? sp[3] : 0, dist: 40, yaw: 0.8, pitch: 0.75 });
    $('#ed-title').value = E.meta.title;
    show('s-sgame'); $('#sg-edit').hidden = false; $('#sg-play').hidden = true; resize();
    $('#ed-prop').classList.toggle('min', innerWidth < 700);
    const help = $('#ed-help'); help.style.opacity = 1; clearTimeout(E.helpT); E.helpT = setTimeout(() => (help.style.opacity = 0), 9000);
    rebuildEditor(); toolbar(); setTool(E.tool); loop(edTick);
  }
  function rebuildEditor() {
    buildWorld(E.data);
    const T = G.T;
    if (G.groundMesh || E.data.ground === 'none') { const grid = new T.GridHelper(400, 200, '#ffffff', '#ffffff'); grid.material.transparent = true; grid.material.opacity = 0.13; grid.position.y = 0.02; G.scene.add(grid); }
    E.objs = E.parts.map((p) => { const g = buildPart(p); g.userData.part = p; G.scene.add(g); return { p, g }; });
    E.signObjs = E.signs.map((s) => { const g = signMesh(s); g.userData.sign = s; G.scene.add(g); return { s, g }; });
    lightsOn(E.objs);
    E.ghost = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: '#ffc21a', transparent: true, opacity: 0.35, depthWrite: false })); E.ghost.visible = false; G.scene.add(E.ghost);
    E.selBox = new T.Box3Helper(new T.Box3(), new T.Color('#ffc21a')); E.selBox.visible = false; G.scene.add(E.selBox);
    E.hitPlane = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshBasicMaterial({ visible: false })); E.hitPlane.rotation.x = -Math.PI / 2; G.scene.add(E.hitPlane);
    markSel();
  }
  function addObj(p) { const g = buildPart(p); g.userData.part = p; G.scene.add(g); E.objs.push({ p, g }); lightsOn([{ g }]); }
  function removeObj(p) { const i = E.objs.findIndex((o) => o.p === p); if (i >= 0) { G.scene.remove(E.objs[i].g); E.objs.splice(i, 1); } }
  function refreshObj(p) { removeObj(p); addObj(p); }
  const snapshot = () => { E.undo.push(JSON.stringify([E.parts, E.signs])); if (E.undo.length > 60) E.undo.shift(); E.dirty = true; };
  function doUndo() {
    const s = E.undo.pop(); if (!s) return toast('Nothing to undo');
    const [p, sg] = JSON.parse(s); E.parts = p; E.signs = sg; E.sel = null; rebuildEditor(); renderProp();
  }

  function toolbar() {
    let h = `<button class="sg-tool" data-tool="select"><span>👆</span>Select</button><button class="sg-tool" data-tool="erase"><span>🧽</span>Erase</button><button class="sg-tool" data-tool="sign"><span>🪧</span>Sign</button>`;
    for (const [, list] of GROUPS) { h += '<div class="sg-sep"></div>'; for (const t of list) h += `<button class="sg-tool" data-tool="${t}"><span>${PARTS[t].i}</span>${PARTS[t].n}</button>`; }
    $('#ed-tools').innerHTML = h;
    $$('#ed-tools [data-tool]').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  }
  function setTool(t) {
    E.tool = t; $$('#ed-tools [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    if (PARTS[t]) { const D = PARTS[t]; E.color = D.c; E.mat = D.m || 'plastic'; E.size = D.s.slice(); E.rot = 0; }
    if (t !== 'select') { E.sel = null; markSel(); }
    renderProp();
  }
  const propTog = () => `<button class="ptog" data-tog aria-label="Show or hide options">${$('#ed-prop').classList.contains('min') ? '▾' : '▴'}</button>`;
  $('#ed-prop').addEventListener('click', (e) => { if (e.target.closest('[data-tog]')) { $('#ed-prop').classList.toggle('min'); renderProp(); } });
  function renderProp() {
    const box = $('#ed-prop'), sel = E.sel, p = sel && sel.p;
    const t = p ? p[0] : E.tool, D = PARTS[t];
    if (sel && sel.s) { box.innerHTML = `${propTog()}<h4>🪧 Sign</h4><p>${esc(sel.s[3])}</p><div class="acts"><button class="sg-b" data-a="rot">⟳ Rotate</button><button class="sg-b" data-a="up">⬆</button><button class="sg-b" data-a="down">⬇</button><button class="sg-b" data-a="del" style="color:#ff4d5e">🗑 Delete</button></div>`; bindProp(); return; }
    if (!D) { box.innerHTML = `${propTog()}<h4>${t === 'select' ? '👆 Select' : t === 'erase' ? '🧽 Erase' : '🪧 Sign'}</h4><p class="body">${t === 'select' ? 'Click a part to change its colour, size, height or rotation.' : t === 'erase' ? 'Click parts to remove them.' : 'Click where you want a sign, then type its text.'}</p>`; return; }
    const color = p ? p[7] : E.color, m = p ? p[9] : E.mat, size = p ? [p[4], p[5], p[6]] : E.size;
    box.innerHTML = `${propTog()}<h4>${D.i} ${D.n}${p ? ' (selected)' : ''}</h4><div class="body">
      ${['coin', 'heal', 'bot', 'cone', 'spawn', 'check', 'finish', 'lava', 'jump', 'speed'].includes(t) ? '' : `<div class="sw">${COLORS.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === color ? 'on' : ''}" aria-label="colour ${c}"></button>`).join('')}</div>`}
      ${D.m && !['lava', 'jump', 'speed', 'spawn', 'check', 'finish'].includes(t) ? `<h4>Material</h4><select data-m>${MATS.map(([k, n]) => `<option value="${k}" ${k === m ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}
      ${D.fixed ? '' : `<h4>Size</h4>${['W', 'H', 'D'].map((a, i) => `<div class="sg-step"><b>${a}</b><button data-sz="${i}" data-dv="-1">−</button><span>${size[i]}</span><button data-sz="${i}" data-dv="1">+</button></div>`).join('')}`}
      <div class="acts"><button class="sg-b" data-a="rot">⟳ Rotate</button>${p ? '<button class="sg-b" data-a="up">⬆ Up</button><button class="sg-b" data-a="down">⬇ Down</button><button class="sg-b" data-a="dup">⧉ Copy</button><button class="sg-b" data-a="del" style="color:#ff4d5e">🗑 Delete</button>' : ''}</div>
      <p class="muted" style="margin-top:6px;font-size:12px">${E.parts.length} / 2500 parts</p></div>`;
    bindProp();
  }
  function bindProp() {
    const box = $('#ed-prop'), sel = E.sel, p = sel && sel.p;
    box.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { if (p) { snapshot(); p[7] = b.dataset.c; refreshObj(p); markSel(); } else E.color = b.dataset.c; renderProp(); }));
    const ms = box.querySelector('[data-m]'); if (ms) ms.onchange = () => { if (p) { snapshot(); p[9] = ms.value; refreshObj(p); } else E.mat = ms.value; };
    box.querySelectorAll('[data-sz]').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.sz, dv = +b.dataset.dv, arr = p ? null : E.size;
      const cur = p ? p[4 + i] : arr[i], step = cur < 1 || (cur === 1 && dv < 0) ? 0.25 : cur < 4 || (cur === 4 && dv < 0) ? 0.5 : cur < 20 ? 1 : 4;
      const nv = Math.max(0.25, Math.min(80, cur + dv * step));
      if (p) { snapshot(); p[4 + i] = nv; refreshObj(p); markSel(); } else arr[i] = nv;
      renderProp();
    }));
    box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a)));
  }
  function act(a) {
    const sel = E.sel;
    if (a === 'rot') { if (sel) { snapshot(); const o = sel.p || sel.s, k = sel.p ? 8 : 4; o[k] = (o[k] + 1) % 4; sel.p ? refreshObj(o) : rebuildSigns(); markSel(); } else E.rot = (E.rot + 1) % 4; return; }
    if (!sel) return;
    const o = sel.p || sel.s, yi = sel.p ? 2 : 1;
    if (a === 'up' || a === 'down') { snapshot(); o[yi] = Math.max(-20, Math.min(150, o[yi] + (a === 'up' ? 0.5 : -0.5))); sel.p ? refreshObj(o) : rebuildSigns(); markSel(); }
    if (a === 'dup' && sel.p) { if (E.parts.length >= 2500) return toast('That is the 2,500 part limit.'); snapshot(); const c = sel.p.slice(); const [fw] = footprint(c); c[1] += fw; E.parts.push(c); addObj(c); E.sel = { p: c }; markSel(); renderProp(); }
    if (a === 'del') { snapshot(); if (sel.p) { E.parts.splice(E.parts.indexOf(sel.p), 1); removeObj(sel.p); } else { E.signs.splice(E.signs.indexOf(sel.s), 1); rebuildSigns(); } E.sel = null; markSel(); renderProp(); }
  }
  function rebuildSigns() { (E.signObjs || []).forEach((o) => G.scene.remove(o.g)); E.signObjs = E.signs.map((s) => { const g = signMesh(s); g.userData.sign = s; G.scene.add(g); return { s, g }; }); }
  function markSel() {
    if (!E.selBox) return;
    const sel = E.sel; if (!sel) { E.selBox.visible = false; return; }
    const obj = sel.p ? (E.objs.find((o) => o.p === sel.p) || {}).g : (E.signObjs.find((o) => o.s === sel.s) || {}).g;
    if (!obj) { E.selBox.visible = false; return; }
    E.selBox.box.setFromObject(obj); E.selBox.box.expandByScalar(0.05); E.selBox.visible = true;
  }

  // pointer: drag = turn camera, tap = use tool
  const ray = { r: null, v: null };
  function pickAt(cx, cy) {
    const T = G.T; if (!ray.r) { ray.r = new T.Raycaster(); ray.v = new T.Vector2(); }
    const rc = $('#sg-cv').getBoundingClientRect(); ray.v.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
    ray.r.setFromCamera(ray.v, G.cam);
    const list = E.objs.map((o) => o.g).concat((E.signObjs || []).map((o) => o.g));
    const hits = ray.r.intersectObjects(list, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.part && !o.userData.sign) o = o.parent; if (o) return { h, part: o.userData.part, sign: o.userData.sign, g: o }; }
    const gh = ray.r.intersectObject(E.hitPlane); if (gh[0]) return { h: gh[0], ground: true };
    return null;
  }
  function placementFor(hit) {
    const t = E.tool, sz = E.size, rot = E.rot, odd = rot & 1, fw = odd ? sz[2] : sz[0], fd = odd ? sz[0] : sz[2], h = sz[1];
    const pt = hit.h.point.clone(); let n = hit.ground ? new G.T.Vector3(0, 1, 0) : (hit.h.face ? hit.h.face.normal.clone().transformDirection(hit.h.object.matrixWorld) : new G.T.Vector3(0, 1, 0));
    let x, y, z;
    const snap = (v, s) => (Math.round(v - s / 2) + s / 2);
    if (n.y > 0.5) { x = snap(pt.x, fw); z = snap(pt.z, fd); y = Math.round(pt.y * 4) / 4; if (hit.part && PARTS[hit.part[0]].solid && hit.part[0] !== 'ramp') { const top = hit.part[2] + (hit.part[0] === 'house' ? hit.part[5] * 0.62 : hit.part[5]); if (Math.abs(top - pt.y) < 0.3) y = top; } }
    else if (n.y < -0.5) { x = snap(pt.x, fw); z = snap(pt.z, fd); y = Math.round((pt.y - h) * 4) / 4; }
    else { x = snap(pt.x + n.x * fw / 2, fw); z = snap(pt.z + n.z * fd / 2, fd); y = hit.part ? hit.part[2] : Math.max(0, Math.round((pt.y - h / 2) * 2) / 2); }
    if (['coin', 'gem', 'heal'].includes(t) && n.y > 0.5) y += 0.5;
    return { x, y, z, fw, fd, h };
  }
  function useTool(cx, cy) {
    const hit = pickAt(cx, cy); const t = E.tool;
    if (t === 'select') { E.sel = hit && (hit.part || hit.sign) ? (hit.part ? { p: hit.part } : { s: hit.sign }) : null; markSel(); renderProp(); return; }
    if (t === 'erase') { if (hit && hit.part) { snapshot(); E.parts.splice(E.parts.indexOf(hit.part), 1); removeObj(hit.part); } else if (hit && hit.sign) { snapshot(); E.signs.splice(E.signs.indexOf(hit.sign), 1); rebuildSigns(); } renderProp(); return; }
    if (!hit) return;
    if (t === 'sign') {
      if (E.signs.length >= 60) return toast('Up to 60 signs per game.');
      const c = modal(`<h2>🪧 New sign</h2><label>What should it say?<input id="sgn-t" maxlength="60" placeholder="Welcome to my game!"></label><div class="row"><button class="btn primary" id="sgn-ok">Add sign</button></div>`);
      const pt = hit.h.point; setTimeout(() => c.querySelector('#sgn-t').focus(), 50);
      c.querySelector('#sgn-ok').onclick = () => { const v = c.querySelector('#sgn-t').value.trim(); if (!v) return; snapshot(); E.signs.push([Math.round(pt.x * 2) / 2, Math.round(pt.y * 2) / 2 + 2, Math.round(pt.z * 2) / 2, v.slice(0, 60), E.rot]); rebuildSigns(); closeModal(); };
      return;
    }
    if (E.parts.length >= 2500) return toast('That is the 2,500 part limit for one game.');
    const D = PARTS[t]; if (!D) return;
    if (t === 'spawn') { const old = E.parts.find((p) => p[0] === 'spawn'); if (old) { snapshot(); E.parts.splice(E.parts.indexOf(old), 1); removeObj(old); toast('Moved your spawn'); } }
    const q = placementFor(hit);
    const p = [t, q.x, q.y, q.z, E.size[0], E.size[1], E.size[2], E.color, E.rot, E.mat || 'plastic'];
    if (t !== 'spawn') snapshot(); E.parts.push(p); addObj(p); renderProp();
  }
  function hover(cx, cy) {
    if (!PARTS[E.tool]) { E.ghost.visible = false; return; }
    const hit = pickAt(cx, cy); if (!hit) { E.ghost.visible = false; return; }
    const q = placementFor(hit); E.ghost.visible = true; E.ghost.scale.set(q.fw, q.h, q.fd); E.ghost.position.set(q.x, q.y + q.h / 2, q.z);
  }
  (function pointer() {
    const cv = $('#sg-cv'), pts = new Map(); let down = null, pinch = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (G.mode === 'play') { P.look = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; return; }
      if (pts.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, btn: e.button, shift: e.shiftKey };
      else { down = null; const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    cv.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId);
      if (G.mode === 'play') { const l = P.look; if (l && l.id === e.pointerId) { const dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; l.moved += Math.abs(dx) + Math.abs(dy); P.yaw -= dx * 0.006; P.pitch = Math.max(-0.4, Math.min(1.2, P.pitch + dy * 0.004)); } else if (!L.isTouch()) { /* mouse look only while dragging */ } return; }
      if (!prev) { hover(e.clientX, e.clientY); return; }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; prev.x = e.clientX; prev.y = e.clientY;
      if (pts.size >= 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) E.cam.dist = Math.max(4, Math.min(220, E.cam.dist * pinch / d)); pinch = d; panBy(-dx * 0.5, -dy * 0.5); return; }
      if (down) { down.moved += Math.abs(dx) + Math.abs(dy); if (down.moved > 6) { if (down.btn === 1 || down.shift) panBy(dx, dy); else { E.cam.yaw -= dx * 0.006; E.cam.pitch = Math.max(0.08, Math.min(1.5, E.cam.pitch + dy * 0.005)); } } }
      hover(e.clientX, e.clientY);
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (G.mode === 'play') { const l = P.look; if (l && l.id === e.pointerId) { if (l.moved < 8 && performance.now() - l.t < 300 && !L.isTouch()) P.fire = true; P.look = null; } return; }
      if (down && down.moved <= 6 && performance.now() - down.t < 600 && e.type === 'pointerup' && down.btn !== 2) useTool(e.clientX, e.clientY);
      if (pts.size < 2) pinch = 0; down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); if (G.mode === 'edit') E.cam.dist = Math.max(4, Math.min(220, E.cam.dist * (e.deltaY > 0 ? 1.12 : 0.89))); else P.zoom = Math.max(4, Math.min(22, P.zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  })();
  function panBy(dx, dy) { const s = E.cam.dist * 0.0018, c = Math.cos(E.cam.yaw), sn = Math.sin(E.cam.yaw); E.cam.x -= (dx * c - dy * sn) * s * 1.2; E.cam.z -= (-dx * sn - dy * c) * s * 1.2 * -1; }
  addEventListener('keydown', (e) => {
    if (!L.isActive('s-sgame') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (G.mode === 'edit') {
      E.keys[k] = true;
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); }
      else if (k === 'r') act('rot'); else if (k === 'delete' || k === 'backspace') act('del');
      else if (k === 'escape') { E.sel = null; markSel(); renderProp(); }
    } else if (G.mode === 'play') { P.keys[k] = true; if (k === ' ') e.preventDefault(); if (k === 'e') P.use = true; if (k === 'f') P.fire = true; if (k === 'escape') exitPlay(); }
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); E.keys[k] = false; P.keys[k] = false; });

  function edTick(dt) {
    const c = E.cam, K = E.keys, sp = c.dist * 0.9 * dt, f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0), s = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0);
    if (f || s) { c.x += (-Math.sin(c.yaw) * f + Math.cos(c.yaw) * s) * sp; c.z += (-Math.cos(c.yaw) * f - Math.sin(c.yaw) * s) * sp; }
    if (K.q) c.y = Math.max(-10, c.y - sp * 0.6); if (K.e) c.y = Math.min(140, c.y + sp * 0.6);
    G.cam.position.set(c.x + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, c.y + Math.sin(c.pitch) * c.dist, c.z + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist);
    G.cam.lookAt(c.x, c.y, c.z); placeSun(c.x, c.y, c.z);
    for (const o of E.objs) if (o.g.userData.spinner) o.g.userData.spinner.rotation.y += dt * 2;
    updateLamps(E.objs, c.x, c.z);
  }
  const gameData = () => ({ ...E.data, parts: E.parts, signs: E.signs });

  $('#ed-undo').onclick = doUndo;
  $('#ed-test').onclick = () => { E.meta.title = $('#ed-title').value.trim() || E.meta.title; play(gameData(), { ...E.meta, by: profile.username || 'you' }, true); };
  $('#ed-save').onclick = () => save(false);
  $('#ed-pub').onclick = () => publishDialog();
  $('#ed-set').onclick = () => settingsDialog();
  $('#ed-exit').onclick = () => {
    if (!E.dirty) return leaveEditor();
    const c = modal(`<h2>Save before leaving?</h2><p class="muted" style="margin-top:6px">You have changes that are not saved.</p><div class="row"><button class="btn ghost" data-n>Leave without saving</button><button class="btn primary" data-y>💾 Save and leave</button></div>`);
    c.querySelector('[data-n]').onclick = () => { closeModal(); leaveEditor(); };
    c.querySelector('[data-y]').onclick = async () => { closeModal(); if (await save(false)) leaveEditor(); };
  };
  function leaveEditor() { cancelAnimationFrame(G.raf); G.mode = null; openStudio('mine'); }

  async function save(publish, btn) {
    E.meta.title = $('#ed-title').value.trim();
    if (E.meta.title.length < 3) { toast('Give your game a name first (top of the screen).'); $('#ed-title').focus(); return false; }
    const b = btn || $('#ed-save'); setBusy(b, true);
    try {
      const r = await api('/api/studio/save', { id: E.meta.id, title: E.meta.title, desc: E.meta.desc, emoji: E.meta.emoji, color: E.meta.color, price: E.meta.price, publish: publish ? true : (E.meta.published ? undefined : false), data: gameData() });
      E.meta.id = r.game.id; E.meta.published = r.game.published; E.dirty = false;
      toast(publish ? '🚀 Published! Your game is live in Discover.' : '💾 Saved', 3000); return true;
    } catch (e) { toast(e.message, 4500); return false; } finally { setBusy(b, false); }
  }
  function settingsDialog() {
    const d = E.data, opt = (o, v) => Object.entries(o).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('');
    const c = modal(`<h2>⚙️ Game settings</h2>
      <label>Goal<select id="gs-goal">${opt(GOALS, d.goal)}</select></label>
      <label>Time limit (seconds, 0 = none)<input id="gs-time" type="number" min="0" max="900" value="${d.time}"></label>
      <label>Lives (0 = unlimited)<input id="gs-lives" type="number" min="0" max="99" value="${d.lives}"></label>
      <label>Sky<select id="gs-sky">${opt(SKIES, d.sky)}</select></label>
      <label>Floor<select id="gs-ground">${opt(GROUNDS, d.ground)}</select></label>
      <div class="row"><button class="btn primary" id="gs-ok">Done</button></div>`);
    c.querySelector('#gs-ok').onclick = () => {
      const look = d.sky + d.ground;
      d.goal = c.querySelector('#gs-goal').value; d.time = Math.max(0, Math.min(900, +c.querySelector('#gs-time').value | 0)); d.lives = Math.max(0, Math.min(99, +c.querySelector('#gs-lives').value | 0));
      d.sky = c.querySelector('#gs-sky').value; d.ground = c.querySelector('#gs-ground').value; E.dirty = true;
      closeModal(); if (look !== d.sky + d.ground) rebuildEditor();
    };
  }
  function publishDialog() {
    const m = E.meta; m.title = $('#ed-title').value.trim() || m.title;
    const c = modal(`<h2>🚀 Publish your game</h2><p class="muted">Everyone on LSP Games will be able to find it in Discover.</p>
      <label>Name<input id="pb-title" maxlength="40" value="${esc(m.title)}"></label>
      <label>Description<textarea id="pb-desc" maxlength="200" rows="3" placeholder="What do players do in your game?">${esc(m.desc)}</textarea></label>
      <label>Picture</label><div class="emo-pick" id="pb-emo">${EMOJIS.map((e) => `<button class="${e === m.emoji ? 'on' : ''}">${e}</button>`).join('')}</div>
      <label>Colour</label><div class="emo-pick" id="pb-col">${['#2f6bff', '#ff4d5e', '#14c79a', '#b04dff', '#ff8a3d', '#16203d', '#ffc21a', '#5ad1ff'].map((cc) => `<button data-c="${cc}" style="background:${cc}" class="${cc === m.color ? 'on' : ''}"></button>`).join('')}</div>
      <label>Price in points (0 = free, max 10,000)<input id="pb-price" type="number" min="0" max="10000" step="50" value="${m.price}"></label>
      <p class="muted" style="font-size:13px;margin-top:6px">When someone buys your game, all of the points go into your wallet.</p>
      <p class="muted" style="font-size:13px">LSP rules: no dating, nothing sexual, no swearing.</p>
      <div class="row">${m.published ? '<button class="btn ghost" id="pb-un">Unpublish</button>' : ''}<button class="btn primary" id="pb-go">${m.published ? 'Update game' : '🚀 Publish'}</button></div>`);
    c.querySelectorAll('#pb-emo button').forEach((b) => (b.onclick = () => { m.emoji = b.textContent; c.querySelectorAll('#pb-emo button').forEach((x) => x.classList.toggle('on', x === b)); }));
    c.querySelectorAll('#pb-col button').forEach((b) => (b.onclick = () => { m.color = b.dataset.c; c.querySelectorAll('#pb-col button').forEach((x) => x.classList.toggle('on', x === b)); }));
    const read = () => { m.title = c.querySelector('#pb-title').value.trim(); $('#ed-title').value = m.title; m.desc = c.querySelector('#pb-desc').value.trim(); m.price = Math.max(0, Math.min(10000, Math.floor(+c.querySelector('#pb-price').value || 0))); };
    c.querySelector('#pb-go').onclick = async (ev) => { read(); if (await save(true, ev.currentTarget)) closeModal(); };
    const un = c.querySelector('#pb-un'); if (un) un.onclick = async () => { read(); m.published = false; try { const r = await api('/api/studio/save', { id: m.id, title: m.title, desc: m.desc, emoji: m.emoji, color: m.color, price: m.price, publish: false, data: gameData() }); m.published = r.game.published; toast('Unpublished. Only you can see it now.'); closeModal(); } catch (e) { toast(e.message); } };
  }

  /* ===================== player ===================== */
  const P = { keys: {}, yaw: 0, pitch: 0.35, zoom: 9, joy: { x: 0, y: 0 } };
  let msgT = 0;
  const say = (t, ms = 1800) => { const m = $('#pl-msg'); m.textContent = t; m.classList.add('show'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('show'), ms); };

  async function play(data, meta, test) {
    if (!data) return toast('This game could not be opened.');
    if (!(await boot())) return;
    if (!test && meta.id) api('/api/studio/play/' + meta.id, {}).catch(() => {});
    Object.assign(P, { data, meta, test: !!test, keys: {}, use: false, fire: false, look: null, ended: false, t: 0, coins: 0, kills: 0, hp: 100, lives: data.lives || 0, nextCheck: 0, zoom: 9, pitch: 0.35, pl: null, car: null, bolts: [], hurtT: 0 });
    G.mode = 'play'; show('s-sgame'); $('#sg-edit').hidden = true; $('#sg-play').hidden = false; $('#pl-end').classList.remove('open');
    $('#s-sgame').classList.toggle('touch', L.isTouch()); $('#pl-name').textContent = `${meta.emoji || '🎮'} ${meta.title || 'Game'}${meta.by ? ' · by @' + meta.by : ''}${test ? ' · TEST' : ''}`;
    $('#pl-f').hidden = !data.parts.some((p) => p[0] === 'bot'); $('#pl-e').hidden = !data.parts.some((p) => p[0] === 'car');
    resize(); buildWorld(data);
    P.objs = data.parts.map((p) => { const g = buildPart(p); G.scene.add(g); return { p, g, alive: true, ox: p[1], oy: p[2], oz: p[3], hp: 3, cd: 0 }; });
    (data.signs || []).forEach((s) => G.scene.add(signMesh(s)));
    lightsOn(P.objs);
    P.solids = P.objs.filter((o) => PARTS[o.p[0]].solid || ['tree', 'lamp', 'car'].includes(o.p[0]));
    P.coinsTotal = P.objs.filter((o) => o.p[0] === 'coin').length;
    P.checks = P.objs.filter((o) => o.p[0] === 'check');
    const sp = P.objs.find((o) => o.p[0] === 'spawn');
    P.spawn = sp ? { x: sp.p[1], y: sp.p[2] + sp.p[5] + 0.05, z: sp.p[3], yaw: Math.PI - sp.p[8] * Math.PI / 2 } : { x: 0, y: 2, z: 0, yaw: Math.PI };
    P.check = { ...P.spawn };
    P.body = person(['#2f6bff', '#14c79a', '#ff8a3d', '#b04dff'][Math.floor(Math.random() * 4)]); G.scene.add(P.body);
    P.pos = new G.T.Vector3(P.spawn.x, P.spawn.y, P.spawn.z); P.vel = new G.T.Vector3(); P.yaw = P.spawn.yaw; P.face = P.yaw + Math.PI; P.ground = null;
    // bolts for shooting
    P.boltMesh = new G.T.MeshBasicMaterial({ color: '#7df9ff' });
    hud(); say(goalText(), 3500); loop(plTick);
  }
  const goalText = () => ({ finish: 'Reach the 🏁 finish!', coins: `Collect all ${P.coinsTotal} coins!`, race: 'Get in the car (E), pass every 🚩 checkpoint, then cross the 🏁 finish!', survive: `Survive for ${P.data.time} seconds!`, free: 'Explore! Press E near a car to drive.' })[P.data.goal];
  function hud() {
    $('#pl-hp').style.width = Math.max(0, P.hp) + '%'; $('#pl-hp-t').textContent = `❤️ ${Math.max(0, Math.ceil(P.hp))}${P.data.lives ? ' · ' + '💗'.repeat(Math.min(P.lives, 5)) + (P.lives > 5 ? '+' + (P.lives - 5) : '') : ''}`;
    const g = P.data.goal; $('#pl-goal').textContent = g === 'coins' ? `🪙 ${P.coins}/${P.coinsTotal}` : g === 'race' ? `🚩 ${P.nextCheck}/${P.checks.length}` : g === 'survive' ? `🤖 ${P.kills} beaten` : P.coinsTotal ? `🪙 ${P.coins}` : '🌍 Free roam';
    const tl = P.data.time; $('#pl-time').textContent = '⏱ ' + (tl ? fmtT(Math.max(0, tl - P.t)) : fmtT(P.t));
  }
  const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // collision helpers (parts are boxes; ramps slope along their local +z)
  function topAt(o, x, z) {
    const p = o.p, t = p[0], gx = o.g.position.x, gz = o.g.position.z, gy = o.g.position.y;
    const [fw, fd] = t === 'tree' ? [0.6, 0.6] : t === 'lamp' ? [0.35, 0.35] : t === 'car' ? (p[8] & 1 ? [4.3, 2.1] : [2.1, 4.3]) : footprint(p);
    const dx = x - gx, dz = z - gz; if (Math.abs(dx) > fw / 2 || Math.abs(dz) > fd / 2) return null;
    if (t === 'ramp') { const a = p[8] * Math.PI / 2, lz = dx * Math.sin(a) + dz * Math.cos(a); return gy + p[5] * Math.max(0, Math.min(1, (lz + p[6] / 2) / p[6])); }
    if (t === 'house') { const k = Math.max(Math.abs(dx) / (fw / 2), Math.abs(dz) / (fd / 2)); return gy + p[5] * 0.62 + p[5] * 0.38 * (1 - k); }
    if (t === 'car') return gy + 1.2;
    if (t === 'spin') return null;
    return gy + p[5];
  }
  function groundAt(x, z, feet, r) {
    let best = P.data.ground === 'none' ? -1e9 : 0, who = null;
    const pts = r ? [[x, z], [x + r, z], [x - r, z], [x, z + r], [x, z - r]] : [[x, z]];
    for (const o of P.solids) { if (o === P.car || !o.alive) continue; for (const [px, pz] of pts) { const top = topAt(o, px, pz); if (top != null && top <= feet + 0.6 && top > best) { best = top; who = o; } } }
    return { y: best, o: who };
  }
  function blocked(x, z, feet, head, r) {
    for (const o of P.solids) {
      if (o === P.car || !o.alive) continue;
      const bottom = o.g.position.y; if (head < bottom) continue;
      for (const [px, pz] of [[x + r, z], [x - r, z], [x, z + r], [x, z - r], [x + r * 0.7, z + r * 0.7], [x - r * 0.7, z - r * 0.7], [x + r * 0.7, z - r * 0.7], [x - r * 0.7, z + r * 0.7]]) {
        const top = topAt(o, px, pz); if (top != null && top > feet + 0.6) return true;
      }
    }
    return false;
  }
  function die(why) {
    if (P.ended) return;
    if (P.car) leaveCar();
    if (P.data.lives) { P.lives--; if (P.lives <= 0) return end(false, why + ' — no lives left.'); }
    say(why + ' Back to your checkpoint.'); P.hp = 100; P.pos.set(P.check.x, P.check.y, P.check.z); P.vel.set(0, 0, 0); P.yaw = P.check.yaw; hud();
  }
  function enterCar(o) { P.car = o; o.speed = 0; o.yaw = o.p[8] * Math.PI / 2; P.body.visible = false; say('🚗 Driving! W/S = gas/brake, A/D = steer, E = get out'); }
  function leaveCar() { const o = P.car; P.car = null; P.body.visible = true; const sx = Math.cos(o.yaw) * 2.2, sz = -Math.sin(o.yaw) * 2.2; P.pos.set(o.g.position.x + sx, o.g.position.y + 0.1, o.g.position.z + sz); P.vel.set(0, 0, 0); }

  function plTick(dt) {
    if (P.ended) return;
    const T = G.T, K = P.keys, d = P.data;
    P.t += dt;
    // movers, spinners, pickups, bots
    for (const o of P.objs) {
      const u = o.g.userData, t = o.p[0];
      if (u.spinner) u.spinner.rotation.y += dt * 2.2;
      if (t === 'move') { const a = o.p[8] * Math.PI / 2, amp = Math.max(4, o.p[4] * 1.5), off = Math.sin(P.t * 0.8) * amp, nx = o.ox + Math.cos(a) * off, nz = o.oz - Math.sin(a) * off; o.dx = nx - o.g.position.x; o.dz = nz - o.g.position.z; o.g.position.x = nx; o.g.position.z = nz; }
      if (t === 'spin') u.bar.rotation.y += dt * 1.6;
      if (t === 'lava' || d.ground === 'lava') { /* glow pulse */ if (u.lava) u.lava.material.emissiveIntensity = 1.2 + Math.sin(P.t * 3) * 0.25; }
      if (t === 'bot' && o.alive) {
        const dx = P.pos.x - o.g.position.x, dz = P.pos.z - o.g.position.z, dist = Math.hypot(dx, dz);
        if (dist < 30 && !P.car) { const sp = 4.2 + Math.min(3, P.t / 40); o.g.position.x += (dx / dist) * sp * dt; o.g.position.z += (dz / dist) * sp * dt; o.g.rotation.y = Math.atan2(dx, dz); o.walk = (o.walk || 0) + dt * 9; walkAnim(u.body, o.walk, 1); }
        o.cd -= dt; if (dist < 1.1 && Math.abs(P.pos.y - o.g.position.y) < 1.8 && o.cd <= 0) { o.cd = 0.9; P.hp -= 18; P.hurtT = 0.3; P.vel.x += (dx / (dist || 1)) * 9; P.vel.z += (dz / (dist || 1)) * 9; P.vel.y = 5; hud(); if (P.hp <= 0) die('A bot got you!'); }
      }
      if (!o.alive) continue;
      if (t === 'coin' || t === 'gem' || t === 'heal') {
        const gx = o.g.position.x - P.pos.x, gy = o.g.position.y + 0.5 - (P.pos.y + 0.9), gz = o.g.position.z - P.pos.z;
        const rr = P.car ? 2.4 : 1.3;
        if (gx * gx + gy * gy + gz * gz < rr * rr) {
          o.alive = false; o.g.visible = false;
          if (t === 'coin') { P.coins++; if (window.SFX && SFX.coin) SFX.coin(); if (d.goal === 'coins' && P.coins >= P.coinsTotal) end(true, 'You collected every coin!'); }
          if (t === 'gem') say('💎 Gem!');
          if (t === 'heal') { P.hp = Math.min(100, P.hp + 40); say('❤️ +40 health'); }
          hud();
        }
      }
      if (t === 'spin' && !P.car) {
        const bar = u.bar, a = -bar.rotation.y - o.p[8] * Math.PI / 2, lx = P.pos.x - o.g.position.x, lz = P.pos.z - o.g.position.z;
        const along = lx * Math.cos(a) + lz * Math.sin(a), across = -lx * Math.sin(a) + lz * Math.cos(a), by = o.g.position.y + 1;
        if (Math.abs(along) < o.p[4] / 2 && Math.abs(across) < 0.6 && P.pos.y < by + 0.4 && P.pos.y + 1.8 > by - 0.3) { P.vel.x += -Math.sin(a) * 14 * Math.sign(across || 1); P.vel.z += Math.cos(a) * 14 * Math.sign(across || 1); P.vel.y = 8; P.hp -= 10; hud(); if (P.hp <= 0) die('Knocked out by a spinner!'); }
      }
    }
    // shooting
    if (P.fire) {
      P.fire = false;
      if (P.objs.some((o) => o.p[0] === 'bot')) { const dir = new T.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); const m = new T.Mesh(new T.SphereGeometry(0.15, 8, 6), P.boltMesh); m.position.set(P.pos.x, P.pos.y + 1.3, P.pos.z); G.scene.add(m); P.bolts.push({ m, dir, life: 1.2 }); P.face = Math.atan2(dir.x, dir.z); }
    }
    for (const b of P.bolts) {
      b.life -= dt; b.m.position.addScaledVector(b.dir, 42 * dt);
      for (const o of P.objs) if (o.p[0] === 'bot' && o.alive && b.life > 0 && o.g.position.distanceTo(b.m.position.clone().setY(o.g.position.y + 1)) < 0.9 && Math.abs(b.m.position.y - (o.g.position.y + 1)) < 1.2) { b.life = 0; if (--o.hp <= 0) { o.alive = false; o.g.visible = false; P.kills++; hud(); } }
      if (b.life <= 0) G.scene.remove(b.m);
    }
    P.bolts = P.bolts.filter((b) => b.life > 0);

    // input
    const jx = P.joy.x, jy = P.joy.y;
    const f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0) - jy, s = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + jx;
    if (P.use) {
      P.use = false;
      if (P.car) leaveCar();
      else { const near = P.objs.find((o) => o.p[0] === 'car' && o.g.position.distanceTo(P.pos) < 3.6); if (near) enterCar(near); }
    }
    if (P.car) driveCar(dt, f, s);
    else walk(dt, f, s, K[' '] || P.jumpBtn, K.shift);

    // triggers under the player
    const on = P.car ? P.car.under : P.ground;
    if (on) {
      const t = on.p[0];
      if (t === 'lava') die('🌋 Ouch, lava!');
      if (t === 'jump' && !P.car && P.vel.y <= 0.1) { P.vel.y = 22; say('⏫ Boing!', 800); }
      if (t === 'speed') { const a = on.p[8] * Math.PI / 2, bx = Math.sin(a), bz = Math.cos(a); if (P.car) P.car.speed = Math.max(P.car.speed, 38); else { P.vel.x = bx * 26; P.vel.z = bz * 26; } }
      if (t === 'check' && (P.check.o !== on)) {
        const ci = P.checks.indexOf(on);
        if (d.goal === 'race') { if (ci === P.nextCheck) { P.nextCheck++; say(`🚩 Checkpoint ${P.nextCheck}/${P.checks.length}`); P.check = { x: on.g.position.x, y: on.g.position.y + on.p[5] + 0.1, z: on.g.position.z, yaw: P.car ? P.car.yaw + Math.PI : P.yaw, o: on }; hud(); } }
        else { P.check = { x: on.g.position.x, y: on.g.position.y + on.p[5] + 0.1, z: on.g.position.z, yaw: P.yaw, o: on }; say('🚩 Checkpoint saved'); }
      }
      if (t === 'finish') {
        if (d.goal === 'finish') end(true, 'You reached the finish!');
        else if (d.goal === 'race') { if (P.nextCheck >= P.checks.length) end(true, 'You won the race!'); else if (!P.warnT || P.t - P.warnT > 3) { P.warnT = P.t; say(`Pass all the checkpoints first (${P.nextCheck}/${P.checks.length})`); } }
      }
    }
    // water
    const inWater = P.objs.some((o) => o.p[0] === 'water' && Math.abs(P.pos.x - o.g.position.x) < footprint(o.p)[0] / 2 && Math.abs(P.pos.z - o.g.position.z) < footprint(o.p)[1] / 2 && P.pos.y < o.g.position.y + o.p[5] && P.pos.y > o.g.position.y - 0.5);
    P.swim = inWater;
    if (d.ground === 'lava' && P.pos.y < 0.05 && !P.ground && !P.car) die('🌋 You fell in the lava!');
    if (P.pos.y < -30) die('You fell off the world!');
    if (d.time && P.t >= d.time && !P.ended) { if (d.goal === 'survive') end(true, `You survived ${d.time} seconds!`); else end(false, "Time's up!"); }
    if ((P.tk = (P.tk || 0) + dt) > 0.25) { P.tk = 0; hud(); updateLamps(P.objs, P.pos.x, P.pos.z); }

    // camera: third person, pulled in if a wall is in the way
    const tgt = P.car ? P.car.g.position.clone().add(new T.Vector3(0, 1.6, 0)) : P.pos.clone().add(new T.Vector3(0, 1.6, 0));
    const yaw = P.car && !P.look ? (P.camYaw = lerpAngle(P.camYaw ?? P.yaw, P.car.yaw + Math.PI, Math.min(1, dt * 3))) : (P.camYaw = P.yaw);
    if (P.car && !P.look) P.yaw = yaw;
    const zoom = P.car ? Math.max(P.zoom, 9) : P.zoom, cp = Math.max(-0.2, P.pitch);
    let dist = zoom;
    const dir = new T.Vector3(Math.sin(yaw) * Math.cos(cp), Math.sin(cp), Math.cos(yaw) * Math.cos(cp));
    for (let k = 1; k <= 8; k++) { const q = tgt.clone().addScaledVector(dir, (zoom * k) / 8); const gnd = groundAt(q.x, q.z, q.y + 0.3); if (gnd.y > q.y - 0.3 && gnd.o) { dist = Math.max(2, (zoom * (k - 1)) / 8); break; } }
    G.cam.position.copy(tgt).addScaledVector(dir, dist); if (G.cam.position.y < 0.4 && d.ground !== 'none') G.cam.position.y = 0.4;
    G.cam.lookAt(tgt); placeSun(tgt.x, tgt.y, tgt.z);
    const tf = P.car ? 60 + Math.min(18, Math.abs(P.car.speed) * 0.5) : 60; if (Math.abs(G.cam.fov - tf) > 0.2) { G.cam.fov += (tf - G.cam.fov) * Math.min(1, dt * 4); G.cam.updateProjectionMatrix(); }
    if (G.rain) { G.rain.position.set(tgt.x, 0, tgt.z); const a = G.rain.geometry.attributes.position; for (let i = 0; i < a.count; i += 2) { let y = a.getY(i) - dt * 30; if (y < 0) y += 60; a.setY(i, y); a.setY(i + 1, y - 0.9); } a.needsUpdate = true; }
    if (G.stars) G.stars.position.set(tgt.x, 0, tgt.z);
  }
  const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
  function walkAnim(b, ph, amt) { const s = Math.sin(ph) * 0.7 * amt, u = b.userData; u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s; u.arms[0].rotation.x = -s; u.arms[1].rotation.x = s; }

  function walk(dt, f, s, jump, run) {
    const T = G.T, sp = (run ? 13 : 8.5) * (P.swim ? 0.55 : 1), len = Math.hypot(f, s);
    let mx = 0, mz = 0;
    if (len > 0.05) { const k = Math.min(1, len) / len; mx = (-Math.sin(P.yaw) * f + Math.cos(P.yaw) * s) * k; mz = (-Math.cos(P.yaw) * f - Math.sin(P.yaw) * s) * k; P.face = lerpAngle(P.face, Math.atan2(mx, mz), Math.min(1, dt * 12)); }
    const grounded = !!P.onGround, accel = grounded ? 14 : 4;
    P.vel.x += (mx * sp - P.vel.x) * Math.min(1, accel * dt); P.vel.z += (mz * sp - P.vel.z) * Math.min(1, accel * dt);
    if (jump && (grounded || P.swim) && P.jumpCd <= 0) { P.vel.y = P.swim ? 6 : 11.5; P.jumpCd = 0.25; }
    P.jumpCd = (P.jumpCd || 0) - dt;
    P.vel.y -= (P.swim ? 9 : 32) * dt; if (P.swim) P.vel.y = Math.max(P.vel.y, -3);
    const r = 0.38, feet = P.pos.y, head = feet + 1.8;
    // ride movers
    if (P.ground && P.ground.p[0] === 'move' && P.ground.dx != null) { P.pos.x += P.ground.dx; P.pos.z += P.ground.dz; }
    const nx = P.pos.x + P.vel.x * dt; if (!blocked(nx, P.pos.z, feet, head, r)) P.pos.x = nx; else P.vel.x = 0;
    const nz = P.pos.z + P.vel.z * dt; if (!blocked(P.pos.x, nz, feet, head, r)) P.pos.z = nz; else P.vel.z = 0;
    let ny = P.pos.y + P.vel.y * dt;
    if (P.vel.y > 0) { for (const o of P.solids) { if (!o.alive || o === P.car) continue; const top = topAt(o, P.pos.x, P.pos.z); if (top == null) continue; const bot = o.g.position.y; if (bot >= head - 0.05 && ny + 1.8 > bot) { ny = bot - 1.8; P.vel.y = 0; } } }
    const g = groundAt(P.pos.x, P.pos.z, Math.max(ny, feet), r * 0.6);
    if (ny <= g.y + 0.001 && P.vel.y <= 0) { ny = g.y; P.vel.y = 0; P.onGround = true; P.ground = g.o; }
    else if (ny - g.y < 0.3 && P.vel.y <= 0 && P.onGround) { ny = g.y; P.vel.y = 0; P.ground = g.o; } // stick to slopes and steps going down
    else { P.onGround = false; P.ground = null; }
    P.pos.y = ny;
    P.body.position.copy(P.pos); P.body.rotation.y = P.face;
    const moving = Math.hypot(P.vel.x, P.vel.z); P.ph = (P.ph || 0) + dt * moving * 1.4; walkAnim(P.body, P.ph, P.onGround ? Math.min(1, moving / 6) : 0.3);
    if (P.hurtT > 0) P.hurtT -= dt;
  }
  function driveCar(dt, f, s) {
    const c = P.car, g = c.g, maxF = 42, maxR = -12;
    if (f > 0.1) c.speed += (c.speed < 0 ? 40 : 16) * f * dt; else if (f < -0.1) c.speed += (c.speed > 0 ? -38 : -10) * -f * dt; else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 6 * dt);
    c.speed = Math.max(maxR, Math.min(maxF, c.speed));
    const steer = -s * Math.min(1.6, 1.6 * (6 / (6 + Math.abs(c.speed) * 0.35))) * Math.sign(c.speed || 1);
    c.yaw += steer * Math.min(1, Math.abs(c.speed) / 4) * dt;
    const vx = Math.sin(c.yaw) * c.speed * dt, vz = Math.cos(c.yaw) * c.speed * dt, feet = g.position.y, head = feet + 1.4, r = 1.15;
    const nx = g.position.x + vx; if (!blocked(nx, g.position.z, feet, head, r)) g.position.x = nx; else c.speed *= -0.3;
    const nz = g.position.z + vz; if (!blocked(g.position.x, nz, feet, head, r)) g.position.z = nz; else c.speed *= -0.3;
    c.vy = (c.vy || 0) - 30 * dt; let ny = feet + c.vy * dt;
    const gr = groundAt(g.position.x, g.position.z, Math.max(ny, feet), 0.9);
    if (ny <= gr.y || (feet - gr.y < 0.5 && c.vy <= 0)) { ny = gr.y; c.vy = 0; c.under = gr.o; } else c.under = null;
    g.position.y = ny; g.rotation.y = c.yaw;
    // tilt with the ramp under the car
    const ahead = groundAt(g.position.x + Math.sin(c.yaw) * 1.6, g.position.z + Math.cos(c.yaw) * 1.6, ny + 1.2).y, behind = groundAt(g.position.x - Math.sin(c.yaw) * 1.6, g.position.z - Math.cos(c.yaw) * 1.6, ny + 1.2).y;
    c.g.userData.car.rotation.x = c.vy === 0 ? -Math.atan2(ahead - behind, 3.2) : c.g.userData.car.rotation.x * 0.98;
    c.g.userData.car.rotation.z = -steer * Math.min(1, Math.abs(c.speed) / 30) * 0.05;
    for (const w of c.g.userData.car.userData.wheels) w.children.forEach((m) => (m.rotation.x += c.speed * dt / 0.38));
    P.pos.set(g.position.x, g.position.y, g.position.z);
    if (window.SFX && SFX.engine) try { SFX.engine(Math.abs(c.speed) / maxF); } catch (_) {}
  }

  function end(win, why) {
    if (P.ended) return; P.ended = true;
    if (P.car) P.car.speed = 0;
    const m = P.meta;
    $('#pl-end-card').innerHTML = `<div style="font-size:64px">${win ? '🏆' : '💥'}</div><h2>${win ? 'You win!' : 'Game over'}</h2><p class="muted" style="margin-top:6px">${esc(why)}</p>
      <div class="statline" style="justify-content:center"><span class="pill">⏱ ${fmtT(P.t)}</span>${P.coinsTotal ? `<span class="pill">🪙 ${P.coins}/${P.coinsTotal}</span>` : ''}${P.kills ? `<span class="pill">🤖 ${P.kills}</span>` : ''}</div>
      <div class="row"><button class="btn primary" data-a="again">↻ Play again</button>${!P.test && m.id ? `<button class="btn ghost" data-a="like">👍 Like</button>` : ''}<button class="btn ghost" data-a="exit">${P.test ? '✏️ Back to editor' : 'Exit'}</button></div>`;
    $('#pl-end').classList.add('open');
    $('#pl-end-card').querySelectorAll('[data-a]').forEach((b) => (b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'again') play(P.data, P.meta, P.test);
      if (a === 'exit') exitPlay();
      if (a === 'like') { try { const x = await api('/api/studio/like/' + m.id, {}); b.textContent = x.liked ? '👍 Liked' : '👍 Like'; } catch (e) { toast(e.message); } }
    }));
  }
  function exitPlay() {
    cancelAnimationFrame(G.raf); $('#pl-end').classList.remove('open');
    if (P.test) { G.mode = 'edit'; $('#sg-edit').hidden = false; $('#sg-play').hidden = true; rebuildEditor(); loop(edTick); return; }
    G.mode = null; openStudio('disc');
  }
  $('#pl-exit').onclick = exitPlay;
  // touch controls
  (function touchPad() {
    const joy = $('#pl-joy'), knob = joy.querySelector('i'); let id = null, cx = 0, cy = 0;
    joy.addEventListener('pointerdown', (e) => { id = e.pointerId; joy.setPointerCapture(id); const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
    const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), mx = 50; if (d > mx) { dx *= mx / d; dy *= mx / d; } P.joy.x = dx / mx; P.joy.y = dy / mx; knob.style.transform = `translate(${dx}px,${dy}px)`; };
    joy.addEventListener('pointermove', move);
    const up = (e) => { if (e.pointerId !== id) return; id = null; P.joy.x = P.joy.y = 0; knob.style.transform = ''; };
    joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
    const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); }); el.addEventListener('pointerup', off || (() => {})); el.addEventListener('pointercancel', off || (() => {})); };
    hold($('#pl-jump'), () => { P.jumpBtn = true; }, () => { P.jumpBtn = false; });
    hold($('#pl-e'), () => { P.use = true; });
    hold($('#pl-f'), () => { P.fire = true; });
  })();

  window.LSPStudio = { open: openStudio, edit, play, tmpl, _E: E, _P: P, _G: G };
})();
