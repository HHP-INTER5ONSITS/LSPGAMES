/* LSP Drive · Law & order.
 *
 *  👮 Police get out of their cars
 *       ★1  you get pulled over: an officer walks up and writes you a ticket (pay it, or refuse and run)
 *       ★2  officers run up to arrest you
 *       ★3+ (or if you pull a gun) officers draw their guns and shoot
 *       Knock officers out or blast them with grenades and they're gone, but more police keep coming
 *  ⚖️ City Hall in the middle of town, where Judge Henry Carter runs the court
 *       get arrested → BUSTED → court: plead guilty, plead not guilty, or pay bail
 *  🔒 LSP State Prison on the east side of town
 *       serve your time: rest in your cell, eat, shower, shoot hoops, lift weights, mop for time off,
 *       call a lawyer. Quitting the game doesn't get you out: your time waits for you.
 *  ⚡ Super Speed Chip, $20,000 in the LSP Turbo app: buy it, get in your car, it installs itself
 */
(function () {
  'use strict';
  const L = window.LSPG; if (!window.LSPDriveRP) return;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let K = null, E = null, T = null;
  const GTA = () => window.LSPDriveGTA;
  const LAW = { officers: [], stop: null, cut: false, jail: null, npcs: [], tracers: [], task: null, ready: false };
  const NAMES = ['Officer Patel', 'Officer Brooks', 'Officer Khan', 'Officer Reyes', 'Officer Singh', 'Officer Miller', 'Officer Chen', 'Officer Davis', 'Officer Iyer', 'Officer Lopez'];
  const SKINS = ['#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffdbac'];
  const JUDGE = 'Judge Henry Carter';
  let CH = null, PR = null; // City Hall and prison positions

  const me = () => (E.G.mode === 'drive' ? E.getP() : E.getF());
  const solid = (x, z) => (E.solidAt ? E.solidAt(x, z) : false);
  const fmt$ = (n) => (K ? K.fmt$(n) : '$' + n);
  const rec = () => K.S.record || (K.S.record = { arrests: 0, tickets: 0, served: 0, dismissed: 0 });
  const armed = () => { const u = document.getElementById('cb-ui'); return !!u && !u.hidden; };

  /* ================= styles + HUD ================= */
  function ui() {
    if (document.getElementById('law-css')) return;
    const st = document.createElement('style'); st.id = 'law-css';
    st.textContent = `
    #law-timer{position:absolute;left:50%;top:calc(70px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:21;background:#ff7a1add;color:#fff;font:800 17px system-ui,sans-serif;padding:8px 16px;border-radius:999px;box-shadow:0 3px 0 #0003;pointer-events:none;display:none;white-space:nowrap}
    #law-task{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:21;background:#16203dd9;color:#fff;font:800 16px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;display:none}
    .court{background:linear-gradient(#5a3a22,#3b2414);border-radius:16px;padding:16px;color:#fff;text-align:center;margin-bottom:10px;position:relative;overflow:hidden}
    .court .bench{font-size:64px;line-height:1}.court .plate{display:inline-block;background:#d4af37;color:#2a1a0c;font-weight:900;border-radius:8px;padding:3px 12px;margin-top:6px}
    .court .say{background:#fff;color:#16203d;border-radius:12px;padding:10px 12px;margin-top:10px;text-align:left;font-weight:600}
    .law-charges{text-align:left;margin:8px 0}.law-charges li{margin:2px 0}
    .law-btns{display:grid;gap:8px;margin-top:10px}.law-btns .btn{height:auto;min-height:48px;padding:8px 12px;white-space:normal}
    .law-ticket{background:#fffbe6;border:2px dashed #b08a00;border-radius:12px;padding:12px;color:#16203d;text-align:left}
    .law-ticket b.big{font-size:28px;display:block}`;
    document.head.appendChild(st);
    document.getElementById('s-drive').insertAdjacentHTML('beforeend', '<div id="law-timer"></div><div id="law-task"></div>');
  }
  const ok = (t) => `<div class="lf-top"><h3>${t}</h3></div>`;

  /* ================= police officers on foot ================= */
  function makeOfficer(x, z, h) {
    const m = E.person('#1d3461', '#141c2e', pick(SKINS), '#141c2e');
    const V = K.adapter(m);
    V.box(0.08, 0.08, 0.02, E.M('#d4af37', { metalness: 0.9, roughness: 0.2 }), 0.1, 1.38, 0.155, m, false); // badge
    V.box(0.46, 0.06, 0.3, '#111', 0, 0.98, 0, m, false); // duty belt
    const arm = m.userData.arms[1], gun = K.adapter(arm).box(0.06, 0.13, 0.24, '#151515', 0, -0.6, 0.1, arm, false); gun.visible = false;
    m.position.set(x, 0, z); m.rotation.y = h; E.scene.add(m);
    return { m, gun, x, z, h, hp: 100, state: 'idle', cool: rnd(0.8, 1.6), ph: 0, name: pick(NAMES), t: 0 };
  }
  function removeOfficer(o) { E.scene.remove(o.m); LAW.officers.splice(LAW.officers.indexOf(o), 1); }
  function deploy(c, n, state) {
    c.mode = 'block'; c.blockT = 1e9; c.deployed = true; c.v = 0;
    for (let k = 0; k < n; k++) {
      const side = k === 0 ? 1 : -1, ox = Math.cos(c.h) * 1.6 * side, oz = -Math.sin(c.h) * 1.6 * side;
      const o = makeOfficer(c.x + ox, c.z + oz, c.h); o.car = c; o.state = state; LAW.officers.push(o);
    }
    E.sfx && E.sfx('door', { volume: 0.5 });
  }
  function walkTo(o, tx, tz, sp, dt, stopAt = 0.3) {
    const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
    if (d <= stopAt) { o.moving = false; return true; }
    const step = Math.min(sp * dt, d - stopAt), nx = o.x + (dx / d) * step, nz = o.z + (dz / d) * step;
    if (!solid(nx, nz)) { o.x = nx; o.z = nz; } else if (!solid(nx, o.z)) o.x = nx; else if (!solid(o.x, nz)) o.z = nz;
    o.h = Math.atan2(dx, dz); o.moving = sp; return false;
  }
  function animate(o, dt) {
    const m = o.m, u = m.userData;
    if (o.state === 'down') return;
    m.position.set(o.x, 0, o.z); m.rotation.y = o.h;
    o.ph += dt * (o.moving || 0) * 2.2; const a = o.moving ? Math.sin(o.ph) * 0.7 : 0;
    u.legs[0].rotation.x = a; u.legs[1].rotation.x = -a; u.arms[0].rotation.x = -a * 0.8;
    u.arms[1].rotation.x = o.gun.visible ? -1.45 : a * 0.8; // gun arm points forward
  }
  function tracer(ax, ay, az, bx, by, bz) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([ax, ay, az, bx, by, bz], 3));
    const l = new T.Line(g, new T.LineBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9 })); E.scene.add(l); LAW.tracers.push({ l, t: 0.07 });
  }
  function hurtPlayer(n) {
    if (E.G.mode === 'drive') { const p = E.getP(); p.hp -= n * 0.7; return; }
    const F = E.getF(); F.hp -= n; E.G.shake = 0.25; L.sfx && L.sfx('hurt', { volume: 0.35 });
    const h = document.getElementById('cb-hit'); if (h) { h.hidden = false; clearTimeout(LAW.hitT); LAW.hitT = setTimeout(() => (h.hidden = true), 160); }
    if (F.hp <= 0) { LAW.officers.slice().forEach(removeOfficer); window.LSPDrive.fail('The LSP Police took you down.'); }
  }
  function stepOfficer(o, dt) {
    const W = GTA().W, m = me(), dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz), drive = E.G.mode === 'drive';
    o.t += dt;
    if (o.state === 'down') {
      o.m.rotation.x = Math.max(-Math.PI / 2, o.m.rotation.x - dt * 5); o.m.position.y = 0.25;
      if (o.t > 4) { o.m.scale.multiplyScalar(1 - dt * 3); if (o.t > 5) removeOfficer(o); }
      return;
    }
    if (o.state === 'flee') { o.gun.visible = false; walkTo(o, o.x - dx * 10, o.z - dz * 10, 6.5, dt); if (o.t > 5 || d > 45) removeOfficer(o); return; }
    // nobody's wanted any more: back to the car
    if (!W.stars && o.state !== 'ticket' && o.state !== 'talk') o.state = 'back';
    if (o.state === 'back') {
      o.gun.visible = false;
      const c = o.car && GTA().W.cops.includes(o.car) ? o.car : null;
      if (!c) { walkTo(o, o.x + Math.sin(o.h) * 10, o.z + Math.cos(o.h) * 10, 3, dt); if (o.t > 6) removeOfficer(o); return; }
      if (walkTo(o, c.x, c.z, 5, dt, 1.4) || o.t > 12) { removeOfficer(o); if (!LAW.officers.some((q) => q.car === c)) { c.deployed = false; c.blockT = 0; c.mode = W.stars ? 'chase' : 'leave'; c.leaveT = 0; } }
      return;
    }
    if (o.state === 'ticket') {
      // walk up to the driver's window (or to you on foot)
      const p = E.getP(), tx = drive ? p.x - Math.cos(p.h) * 1.9 : m.x, tz = drive ? p.z + Math.sin(p.h) * 1.9 : m.z;
      if (walkTo(o, tx, tz, 3.2, dt, drive ? 0.4 : 1.6)) { o.state = 'talk'; o.h = Math.atan2(m.x - o.x, m.z - o.z); ticketUi(o); }
      return;
    }
    if (o.state === 'talk') { o.h = Math.atan2(dx, dz); o.moving = false; if (!K.isUi() && o.t > 0.5 && LAW.stop && !LAW.stop.decided) { o.t = 0; ticketUi(o); } return; }
    // fight: shoot if it's serious or you have a gun out, otherwise run in to arrest you
    if (d > 60) { o.state = 'back'; o.t = 0; return; }
    const shoot = W.stars >= 3 || armed();
    o.gun.visible = shoot;
    if (shoot) {
      const sees = d < 34 && GTA().los(o.x, o.z, m.x, m.z);
      if (!sees || d > 13) walkTo(o, m.x, m.z, 5.2, dt, 9); else { o.moving = false; o.h = Math.atan2(dx, dz); }
      o.cool -= dt;
      if (sees && o.cool <= 0 && d < 30) {
        o.cool = rnd(1.1, 1.9); o.h = Math.atan2(dx, dz);
        const fy = 1.35, hit = Math.random() < (drive && Math.hypot(E.getP().vx, E.getP().vz) > 8 ? 0.22 : 0.42) * (d < 12 ? 1 : 0.7);
        tracer(o.x + Math.sin(o.h) * 0.6, fy, o.z + Math.cos(o.h) * 0.6, m.x + (hit ? 0 : rnd(-1.5, 1.5)), 1.2, m.z + (hit ? 0 : rnd(-1.5, 1.5)));
        GTA().rawSfx('rifle', { volume: 0.22 });
        if (hit) hurtPlayer(rnd(5, 9));
      }
    } else walkTo(o, m.x, m.z, 5.6, dt, 1.2);
  }

  /* things your weapons can hit */
  function hitOfficer(o, n, blast) {
    if (o.state === 'down') return;
    o.hp -= n; GTA().crime(1, 'Attacking a police officer', 3);
    for (const q of LAW.officers) if (q.state === 'ticket' || q.state === 'talk' || q.state === 'back') q.state = 'fight';
    if (LAW.stop) { LAW.stop = null; K.closeUi(); }
    if (o.hp <= 0) { o.state = 'down'; o.t = 0; o.gun.visible = false; L.sfx && L.sfx('hurt', { volume: 0.4 }); LAW.down = (LAW.down || 0) + 1; K.say(pick(['👮 Officer down! More police are on the way.', '🚔 Backup is coming!', '📻 "Officer down, send everyone!"']), 2200); }
    else if (blast && o.hp < 60) { o.state = 'flee'; o.t = 0; K.say('👮 An officer runs for cover!', 1600); }
  }
  function hitCar(c, n) {
    c.hp = (c.hp == null ? 320 : c.hp) - n; GTA().crime(1, 'Attacking a police car', 3);
    if (c.hp <= 0 && GTA().W.cops.includes(c)) {
      E.wreckFx(c.x, c.z); L.sfx && L.sfx('explode');
      for (const o of LAW.officers) if (o.car === c && o.state !== 'down') { o.state = 'flee'; o.t = 0; }
      GTA().removeCop(c);
    }
  }
  function targets() {
    const out = [];
    for (const o of LAW.officers) if (o.state !== 'down') out.push({ x: o.x, z: o.z, hit: (n) => hitOfficer(o, n, false) });
    for (const c of GTA().W.cops) out.push({ x: c.x, z: c.z, car: true, hit: (n) => hitCar(c, n * 0.5) });
    return out;
  }
  function blast(x, z, dmg, r) {
    for (const o of LAW.officers.slice()) { const d = Math.hypot(o.x - x, o.z - z); if (d < r + 1) hitOfficer(o, dmg * (1 - d / (r + 1) * 0.6), true); }
    for (const c of GTA().W.cops.slice()) { const d = Math.hypot(c.x - x, c.z - z); if (d < r + 2.5) hitCar(c, dmg * (1 - d / (r + 2.5) * 0.5)); }
  }

  /* ================= ★1: traffic stops and tickets ================= */
  function ticketPrice(ch) {
    const c = (ch || []).join(' ').toLowerCase();
    return c.includes('hitting') ? 400 : c.includes('reckless') ? 250 : c.includes('speeding') ? 150 : 200;
  }
  function ticketUi(o) {
    if (!LAW.stop || LAW.stop.decided) return;
    const W = GTA().W, ch = W.charges && W.charges.length ? W.charges : ['Breaking traffic rules'], price = ticketPrice(ch);
    K.openUi(`${ok('🚔 Traffic stop')}<div class="lf-body" style="max-width:440px">
      <p><b>👮 ${o.name}:</b> "License, please. I pulled you over for <b>${ch[ch.length - 1].toLowerCase()}</b>."</p>
      <div class="law-ticket"><small>LSP POLICE · TRAFFIC TICKET</small><b class="big">${fmt$(price)}</b>${ch.map((c) => `• ${c}`).join('<br>')}</div>
      <div class="law-btns">
        <button class="btn primary" data-t="pay">💵 Pay the ticket (${fmt$(price)})</button>
        <button class="btn ghost" data-t="cant">🙁 I can't pay</button>
        <button class="btn ghost" data-t="run" style="color:#d61f30">🏃 Refuse and drive off (more stars!)</button>
      </div></div>`);
    document.querySelectorAll('#rp-win [data-t]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.t; LAW.stop.decided = true; K.closeUi();
      if (a === 'pay') {
        if (!K.pay(price, '🚔 Traffic ticket')) { K.say("You don't have enough money. The officer is arresting you.", 2500); arrestFromStop(o); return; }
        rec().tickets++; K.save(); GTA().clearWanted(); K.say(`✅ "Thanks. Drive safe out there." — ${o.name}`, 3000);
        o.state = 'back'; o.t = 0; LAW.stop = null;
      } else if (a === 'cant') arrestFromStop(o);
      else { o.state = 'fight'; LAW.stop = null; GTA().W.crimeCd = 0; GTA().crime(1, 'Refusing a traffic ticket', 2); K.say('🚨 You refused the ticket! The police are after you.', 2500); }
    }));
  }
  function arrestFromStop(o) { LAW.stop = null; o.state = 'fight'; const W = GTA().W; W.crimeCd = 0; GTA().crime(1, 'Not paying a ticket', 2); }
  function tickStop(dt) {
    const W = GTA().W, m = me(), drive = E.G.mode === 'drive';
    if (W.stars !== 1) { if (LAW.stop && W.stars === 0) LAW.stop = null; return; }
    if (!LAW.stop) {
      const slow = !drive || Math.hypot(E.getP().vx, E.getP().vz) < 3;
      const c = W.cops.find((q) => q.mode === 'chase' && Math.hypot(q.x - m.x, q.z - m.z) < 16);
      LAW.slowT = slow && c ? (LAW.slowT || 0) + dt : 0;
      if (c && LAW.slowT > 0.8) {
        deploy(c, 1, 'ticket'); LAW.stop = { cop: c, decided: false };
        K.say('🚔 You got pulled over. Wait in your car for the officer.', 3000);
      }
      return;
    }
    // drive off before the officer reaches you = fleeing the police
    const o = LAW.officers.find((q) => q.state === 'ticket' || q.state === 'talk');
    if (!o) { LAW.stop = null; return; }
    if (Math.hypot(o.x - m.x, o.z - m.z) > 14 && !LAW.stop.decided) {
      LAW.stop = null; K.closeUi(); o.state = 'back'; W.crimeCd = 0; GTA().crime(1, 'Fleeing a traffic stop', 2);
    }
  }

  /* ================= arrest → court → prison ================= */
  function arrest(stars, charges) {
    if (LAW.cut || LAW.jail) return;
    LAW.cut = true; LAW.stop = null; K.closeUi();
    window.LSPDriveCity && LSPDriveCity.holster && LSPDriveCity.holster();
    GTA().bigText('busted'); L.sfx && L.sfx('lose', { volume: 0.5 });
    LAW.officers.slice().forEach(removeOfficer); GTA().reset(); GTA().Radio.stop();
    rec().arrests++; K.save();
    setTimeout(() => { GTA().clearBig(); court(stars, charges.length ? charges : ['Running from the police']); }, 2800);
  }
  function court(stars, charges) {
    window.LSPDrive.place(CH.x, CH.z + 13, Math.PI, PR.carX, PR.carZ, Math.PI);
    const base = Math.min(300, 40 * stars + 12 * charges.length), bail = 300 * stars;
    const say = (t) => `<div class="court"><div class="bench">👨🏽‍⚖️</div><div class="plate">THE HONORABLE ${JUDGE.toUpperCase()}</div><div class="say">${t}</div></div>`;
    const show = (html, wire) => { K.openUi(`${ok('⚖️ LSP City Hall · Court')}<div class="lf-body" style="max-width:480px">${html}</div>`); wire && wire(); };
    const intro = () => show(`${say(`Order in the court! You were brought in by the LSP Police at <b>${'★'.repeat(stars)}</b>. The charges are:`)}
      <ul class="law-charges">${charges.map((c) => `<li>⚠️ ${c}</li>`).join('')}</ul>
      <p class="muted">The sentence is about <b>${fmtT(base)}</b> in LSP State Prison.</p>
      <div class="law-btns">
        <button class="btn primary" data-c="guilty">🙋 Plead guilty (shorter sentence)</button>
        <button class="btn ghost" data-c="not">🙅 Plead not guilty (risky: could go free, could get longer)</button>
        <button class="btn ghost" data-c="bail" ${K.canPay(bail) ? '' : 'disabled'}>💵 Pay bail: ${fmt$(bail)} and walk free</button>
      </div>`, () => document.querySelectorAll('#rp-win [data-c]').forEach((b) => (b.onclick = () => choose(b.dataset.c))));
    const done = (html, then) => show(`${html}<div class="law-btns"><button class="btn primary" data-go>${then[0]}</button></div>`, () => (document.querySelector('#rp-win [data-go]').onclick = () => { K.closeUi(); then[1](); }));
    function choose(c) {
      if (c === 'guilty') { const t = Math.round(base * 0.7); done(say(`Thank you for being honest. I sentence you to <b>${fmtT(t)}</b> in LSP State Prison. Use the time well.`), ['🔒 Go to prison', () => prison(t)]); }
      if (c === 'not') {
        L.sfx && L.sfx('click');
        if (Math.random() < 0.3) { rec().dismissed++; done(say('After looking at the evidence... <b>NOT GUILTY!</b> Case dismissed. You are free to go.'), ['🚶 Leave City Hall', () => free(true)]); }
        else { const t = Math.round(base * 1.25); done(say(`The court finds you <b>GUILTY</b> on all charges. I sentence you to <b>${fmtT(t)}</b> in LSP State Prison.`), ['🔒 Go to prison', () => prison(t)]); }
      }
      if (c === 'bail') { if (!K.pay(bail, '⚖️ Bail at City Hall')) return; done(say('Bail is paid. You are free to go, but stay out of trouble!'), ['🚶 Leave City Hall', () => free(true)]); }
    }
    LAW.court = true; intro();
    // the court screen stays until you choose
    LAW.courtT = setInterval(() => { if (LAW.court && !K.isUi()) intro(); }, 1500);
  }
  const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  function endCourt() { LAW.court = false; clearInterval(LAW.courtT); }
  function free(atCityHall) {
    endCourt(); LAW.cut = false; GTA().W.busted = false;
    if (atCityHall) { const p = E.getP(); window.LSPDrive.place(CH.x, CH.z + 13, Math.PI, CH.x + 6, CH.z + 17, Math.PI / 2); void p; K.say('🚶 You walk out of City Hall. Your car is parked out front.', 3500); }
  }
  function prison(secs) {
    endCourt(); LAW.cut = false; GTA().W.busted = false;
    LAW.jail = { left: secs, total: secs, rest: 0, lawyer: false };
    K.S.jail = { left: secs }; K.save();
    window.LSPDrive.place(PR.cellX, PR.cellZ, -Math.PI / 2);
    K.say('🔒 Welcome to LSP State Prison. Do jobs to get out sooner.', 4000);
  }
  function release() {
    const served = LAW.jail ? LAW.jail.total : 0; LAW.jail = null; delete K.S.jail; rec().served += Math.round(served); K.save();
    document.getElementById('law-timer').style.display = 'none';
    window.LSPDrive.place(PR.gateX, PR.gateZ, -Math.PI / 2, PR.carX, PR.carZ, Math.PI);
    K.say("🔓 You served your time. You're free! Your car is parked by the gate.", 4500); L.sfx && L.sfx('win', { volume: 0.5 });
  }
  function tickJail(dt) {
    const J = LAW.jail, F = E.getF();
    J.left -= dt; J.rest -= dt; K.S.jail.left = J.left;
    if ((LAW.saveT = (LAW.saveT || 0) - dt) <= 0) { LAW.saveT = 5; K.save(); }
    // no escaping: the yard and the cells only
    if (E.G.mode === 'drive') window.LSPDrive.place(PR.cellX, PR.cellZ, -Math.PI / 2);
    F.x = clamp(F.x, PR.in[0], PR.in[2]); F.z = clamp(F.z, PR.in[1], PR.in[3]);
    if (LAW.task) { LAW.task.t -= dt; const el = document.getElementById('law-task'); el.style.display = 'block'; el.textContent = `${LAW.task.text} ${Math.max(0, LAW.task.t).toFixed(1)}s`; if (LAW.task.t <= 0) { el.style.display = 'none'; const t = LAW.task; LAW.task = null; t.done(); } }
    const el = document.getElementById('law-timer'); el.style.display = 'block'; el.textContent = `🔒 LSP State Prison · ${fmtT(Math.max(0, J.left))} left`;
    if (J.left <= 0) release();
  }
  function task(text, secs, done) { if (LAW.task) return K.say('Finish what you are doing first.'); LAW.task = { text, t: secs, done }; }

  /* ================= City Hall ================= */
  function buildCityHall() {
    const [x, z] = E.lotC(...E.RP_LOTS.cityhall); CH = { x, z };
    const g = new T.Group(); g.position.set(x, 0, z); E.scene.add(g); const V = K.adapter(g);
    const stone = E.M('#ebe5d6', { roughness: 0.8 }), stone2 = E.M('#d8d0bd', { roughness: 0.85 }), dark = E.M('#3a3226', { roughness: 0.6 });
    V.box(28, 0.2, 28, '#cfc7b4', 0, 0.12, 0, g, false); // plaza
    for (let k = 0; k < 4; k++) V.box(24 - k * 0.6, 0.35, 4 - k * 0.8, stone2, 0, 0.35 + k * 0.35, 7.6 - k * 0.4, g); // steps
    V.box(22, 9, 13, stone, 0, 6.2, -1, g); // main hall
    V.box(22.4, 0.6, 13.4, stone2, 0, 10.9, -1, g); V.box(22.4, 0.5, 13.4, stone2, 0, 1.9, -1, g);
    for (let i = 0; i < 6; i++) V.cyl(0.45, 0.5, 7.6, '#f4efe2', -8.75 + i * 3.5, 5.6, 6.2, g, 18); // columns
    V.box(21, 0.6, 2.6, stone2, 0, 9.7, 6.2, g);
    { const sh = new T.Shape(); sh.moveTo(-10.6, 0); sh.lineTo(10.6, 0); sh.lineTo(0, 2.6); sh.closePath(); const geo = new T.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: false }); const pd = new T.Mesh(geo, stone); pd.position.set(0, 10, 4.9); pd.castShadow = true; g.add(pd); }
    V.cyl(4.8, 4.8, 3, stone2, 0, 12.6, -1, g, 32); // drum
    const dome = new T.Mesh(new T.SphereGeometry(4.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), E.M('#7fa89a', { metalness: 0.6, roughness: 0.35 })); dome.position.set(0, 14.1, -1); dome.castShadow = true; g.add(dome);
    V.cyl(0.12, 0.12, 4, '#d4af37', 0, 20.5, -1, g, 8);
    const flag = new T.Mesh(new T.PlaneGeometry(2.4, 1.4), new T.MeshStandardMaterial({ map: flagTex(), side: T.DoubleSide })); flag.position.set(1.25, 21.6, -1); g.add(flag); LAW.flag = flag;
    V.box(3, 4.6, 0.3, dark, 0, 4.4, 5.55, g, false); V.box(3.3, 0.3, 0.32, '#d4af37', 0, 6.8, 5.55, g, false); // doors
    const title = E.textSprite('⚖️ CITY HALL', '#ebe5d6', '#3a3226', 9, 1.3); title.position.set(0, 9.7, 7.7); g.add(title);
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) V.box(1.6, 2.6, 0.2, E.M('#9fc8e8', { metalness: 0.5, roughness: 0.1, emissive: '#3a2c14', emissiveIntensity: 0.3 }), sx * (3.5 + i * 2.1), 6, 5.52, g, false);
    // fountain on the plaza
    V.cyl(2.2, 2.4, 0.7, stone2, -10, 0.5, 9.5, g, 24); V.cyl(1.9, 1.9, 0.1, E.M('#4aa3df', { metalness: 0.3, roughness: 0.05 }), -10, 0.82, 9.5, g, 24); V.cyl(0.25, 0.35, 1.8, stone2, -10, 1.6, 9.5, g, 12);
    E.addCol(x - 11.2, z - 7.6, x + 11.2, z + 6.8); E.addCol(x - 12.3, z + 8.2, x - 7.7, z + 10.8);
    K.places.push({ name: 'City Hall · Court', icon: '⚖️', x, z: z + 10 });
    K.obj({ x, z: z + 8.6, r: 2.6, when: () => E.G.mode === 'foot' && !LAW.jail && !LAW.cut, label: () => `⚖️ City Hall · ${JUDGE}'s court`, use: cityHallUi });
  }
  let ft = null;
  function flagTex() { if (ft) return ft; const c = document.createElement('canvas'); c.width = 128; c.height = 76; const x = c.getContext('2d'); x.fillStyle = '#2f6bff'; x.fillRect(0, 0, 128, 76); x.fillStyle = '#ffc21a'; x.fillRect(0, 30, 128, 16); x.fillStyle = '#fff'; x.font = '900 26px system-ui'; x.textAlign = 'center'; x.fillText('LSP', 64, 24); ft = new T.CanvasTexture(c); ft.colorSpace = T.SRGBColorSpace; return ft; }
  function cityHallUi() {
    const r = rec();
    K.openUi(`<div class="lf-top"><h3>⚖️ City Hall</h3><button class="x" data-ui="close">✕</button></div><div class="lf-body" style="max-width:460px">
      <div class="court"><div class="bench">👨🏽‍⚖️</div><div class="plate">${JUDGE.toUpperCase()}</div><div class="say">Welcome to City Hall. This is where I hold court. If the police arrest you, you come to me first. Keep your record clean!</div></div>
      <div class="lf-card"><b>📋 Your record</b><p>🚔 Arrests: ${r.arrests} · 🎫 Tickets paid: ${r.tickets} · 🔒 Prison time: ${fmtT(r.served)} · ✅ Cases dismissed: ${r.dismissed}</p></div>
      <p class="muted" style="font-size:13px">★1 = a ticket. ★2 or more = arrest, court and prison. Hitting someone by accident at low speed is not a crime.</p></div>`);
  }

  /* ================= LSP State Prison ================= */
  function buildPrison() {
    const lots = E.RP_LOTS.prison.map((l) => E.lotC(...l)), xs = lots.map((p) => p[0]), zs = lots.map((p) => p[1]);
    const x0 = Math.min(...xs) - 13, x1 = Math.max(...xs) + 13, z0 = Math.min(...zs) - 13, z1 = Math.max(...zs) + 13, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = new T.Group(); E.scene.add(g); const V = K.adapter(g);
    const conc = E.M('#b9b4a8', { roughness: 0.9 }), conc2 = E.M('#9a958a', { roughness: 0.9 }), steel = E.M('#5d646e', { metalness: 0.7, roughness: 0.4 }), orange = '#ff7a1a';
    // walls with razor wire, gate on the west side
    const H = 5.5, th = 0.7;
    const wall = (ax, az, bx, bz) => { const w = Math.abs(bx - ax) || th, d = Math.abs(bz - az) || th; V.box(w, H, d, conc, (ax + bx) / 2, H / 2, (az + bz) / 2, g); V.cyl(0.22, 0.22, Math.max(w, d), steel, (ax + bx) / 2, H + 0.25, (az + bz) / 2, g, 6).rotation.set(w > d ? 0 : Math.PI / 2, 0, w > d ? Math.PI / 2 : 0); E.addCol(Math.min(ax, bx) - th / 2, Math.min(az, bz) - th / 2, Math.max(ax, bx) + th / 2, Math.max(az, bz) + th / 2); };
    wall(x0, z0, x1, z0); wall(x0, z1, x1, z1); wall(x1, z0, x1, z1); wall(x0, z0, x0, z1);
    V.box(0.4, 4.4, 7, steel, x0 - 0.5, 2.2, cz, g, false); for (let k = -3; k <= 3; k++) V.box(0.12, 4.4, 0.12, '#30353c', x0 - 0.75, 2.2, cz + k, g, false); // gate
    const sign = E.textSprite('🔒 LSP STATE PRISON', '#16203d', '#ff7a1a', 12, 1.6); sign.position.set(x0 - 0.9, 7.2, cz); g.add(sign);
    // guard towers
    for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) V.box(0.3, 8, 0.3, steel, tx + a * 1.3, 4, tz + b * 1.3, g, false);
      V.box(3.6, 2.4, 3.6, conc2, tx, 9.2, tz, g); V.box(4.2, 0.3, 4.2, '#2b3038', tx, 10.55, tz, g); V.box(3.7, 0.9, 3.7, E.M('#9fc8e8', { metalness: 0.4, roughness: 0.1 }), tx, 9.6, tz, g, false);
      const s = new T.Sprite(new T.SpriteMaterial({ map: GTA().glowTex(), color: '#fff6dd', transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(3, 3, 1); s.position.set(tx, 10.9, tz); g.add(s);
    }
    // the yard
    V.box(x1 - x0 - 2, 0.06, z1 - z0 - 2, '#5b5e66', cx, 0.19, cz, g, false);
    const ct = { x: cx - 6, z: cz + 12 }; V.box(14, 0.02, 12, '#9a5a3a', ct.x, 0.23, ct.z, g, false); V.box(13, 0.03, 0.12, '#fff', ct.x, 0.24, ct.z, g, false);
    V.box(0.18, 3.2, 0.18, steel, ct.x, 1.6, ct.z + 6, g); V.box(1.8, 1.1, 0.08, '#f4f6fa', ct.x, 3.4, ct.z + 5.9, g); V.cyl(0.24, 0.24, 0.03, '#ff5a1f', ct.x, 3.05, ct.z + 5.6, g, 16);
    V.box(2, 0.5, 0.6, '#30353c', x0 + 6, 0.45, z0 + 7, g); V.box(1.6, 0.08, 0.08, steel, x0 + 6, 1.4, z0 + 7, g, false); // weight bench
    // cell block along the east wall, with six open cells facing the yard
    const bx0 = x1 - 15, cells = [];
    V.box(14, 9, z1 - z0 - 10, conc2, x1 - 7.5, 4.5, cz, g); E.addCol(x1 - 14.5, z0 + 5, x1 - 0.5, z1 - 5);
    for (let i = 0; i < 8; i++) V.box(0.1, 0.6, 1.6, '#2b3038', bx0 + 0.94, 7, z0 + 8 + i * 5.5, g, false);
    const cellW = 4.6, c0 = z0 + 8;
    for (let i = 0; i < 6; i++) {
      const zc = c0 + i * 5.2;
      for (const s of [-1, 1]) { V.box(3.4, 3.2, 0.25, conc, bx0 - 1.2, 1.6, zc + s * cellW / 2, g); E.addCol(bx0 - 2.9, zc + s * cellW / 2 - 0.15, bx0 + 0.5, zc + s * cellW / 2 + 0.15); }
      V.box(3.4, 0.25, cellW, conc, bx0 - 1.2, 3.3, zc, g, false);
      for (let k = 0; k < 9; k++) { const bz = zc - cellW / 2 + 0.3 + k * 0.5; if (bz > zc + 0.5 && bz < zc + 1.9) continue; V.cyl(0.04, 0.04, 3.1, steel, bx0 - 2.9, 1.6, bz, g, 6); }
      E.addCol(bx0 - 3, zc - cellW / 2, bx0 - 2.8, zc + 0.5); E.addCol(bx0 - 3, zc + 1.9, bx0 - 2.8, zc + cellW / 2);
      V.box(1, 0.45, 2, '#e8e2d4', bx0 - 0.4, 0.45, zc - 1.1, g); V.box(1, 0.12, 2, '#7a8fa8', bx0 - 0.4, 0.73, zc - 1.1, g, false); // bunk
      V.box(0.5, 0.5, 0.5, '#d8dde8', bx0 - 0.3, 0.25, zc + 1.6, g); // toilet
      const n = E.textSprite(`CELL ${i + 1}`, '#16203d', '#fff', 1.6, 0.4); n.position.set(bx0 - 2.95, 3.6, zc); g.add(n);
      cells.push(zc);
    }
    // cafeteria + showers
    V.box(14, 4.4, 10, conc, x0 + 8.5, 2.2, z0 + 15, g); E.addCol(x0 + 1.5, z0 + 10, x0 + 15.5, z0 + 20);
    V.box(4, 1, 0.8, '#d8dde8', x0 + 15.8, 0.9, z0 + 15, g); const cs = E.textSprite('🍽️ CAFETERIA', '#16203d', '#fff', 4, 0.8); cs.position.set(x0 + 16, 4.4, z0 + 15); g.add(cs);
    V.box(8, 3.4, 6, conc, x0 + 5, 1.7, z1 - 5, g); E.addCol(x0 + 1, z1 - 8, x0 + 9, z1 - 2); const ss = E.textSprite('🚿 SHOWERS', '#16203d', '#fff', 3.2, 0.7); ss.position.set(x0 + 9.4, 3.4, z1 - 5); g.add(ss);
    V.box(0.5, 1.1, 0.3, '#16203d', x0 + 0.9, 1.4, cz + 9, g, false); // payphone
    PR = { x: cx, z: cz, in: [x0 + 1.4, z0 + 1.4, bx0 + 0.6, z1 - 1.4], cellX: bx0 - 1.2, cellZ: cells[0] + 0.6, gateX: x0 - 3, gateZ: cz, carX: x0 - 6.5, carZ: cz - 9 };
    K.places.push({ name: 'LSP State Prison', icon: '🔒', x: x0 - 3, z: cz });
    // things to do inside
    const J = () => !!LAW.jail && E.G.mode === 'foot';
    K.obj({ x: bx0 - 0.9, z: cells[0] - 0.6, r: 1.8, when: J, label: () => (LAW.jail.rest > 0 ? `🛏️ Rest again in ${Math.ceil(LAW.jail.rest)}s` : '🛏️ Rest on your bunk (−15 s)'), use: () => { if (LAW.jail.rest > 0) return; task('😴 Resting…', 3, () => { LAW.jail.left -= 15; LAW.jail.rest = 25; K.addNeeds({ energy: 15 }); K.say('😴 You rested. 15 seconds off.'); }); } });
    K.obj({ x: bx0 - 4.5, z: cz, r: 2.6, when: J, label: () => '🧹 Mop the cell block (job · −20 s, +$5)', use: () => task('🧹 Mopping…', 5, () => { LAW.jail.left -= 20; K.S.cash += 5; K.txn('🧹 Prison job', 5); K.hud(); K.say('🧹 Spotless! 20 seconds off and $5.'); }) });
    K.obj({ x: x0 + 16.6, z: z0 + 15, r: 2.4, when: J, label: () => '🍽️ Eat prison food', use: () => task('🍽️ Eating…', 3, () => { K.addNeeds({ hunger: 40 }); K.say(pick(['🍽️ Mashed potatoes again. Filling, at least.', '🍽️ Rice and beans. Not bad!', '🍽️ Mystery stew... you ate it anyway.'])); }) });
    K.obj({ x: x0 + 9.6, z: z1 - 5, r: 2.4, when: J, label: () => '🚿 Take a shower', use: () => task('🚿 Showering…', 3, () => { K.addNeeds({ hygiene: 50 }); K.say('🚿 Fresh and clean.'); }) });
    K.obj({ x: ct.x, z: ct.z + 3, r: 3, when: J, label: () => '🏀 Shoot hoops', use: () => task('🏀 Shooting hoops…', 3, () => { K.addNeeds({ fun: 20 }); K.say(Math.random() < 0.6 ? '🏀 Swish! Nothing but net.' : '🏀 Missed... the other inmates laugh.'); }) });
    K.obj({ x: x0 + 6, z: z0 + 8.4, r: 2.2, when: J, label: () => '🏋️ Lift weights', use: () => task('🏋️ Lifting…', 4, () => { K.addNeeds({ fun: 10, energy: -8 }); K.say('💪 You feel stronger.'); }) });
    K.obj({ x: x0 + 1.8, z: cz + 9, r: 2, when: J, label: () => (LAW.jail.lawyer ? '📞 Your lawyer already helped' : '📞 Call a lawyer ($200 · −30% time)'), use: () => { if (LAW.jail.lawyer) return; if (!K.pay(200, '📞 Lawyer')) return K.say('Not enough money for a lawyer.'); LAW.jail.lawyer = true; LAW.jail.left *= 0.7; K.say('📞 Your lawyer got your time cut by 30%.'); } });
    K.obj({ x: x0 - 2.5, z: cz, r: 3, when: () => !LAW.jail && E.G.mode === 'foot', label: () => '🔒 LSP State Prison · no visitors', use: () => K.say('🔒 The guard says: "No visitors today."') });
    // guards and inmates who live here
    const add = (shirt, pants, hat, path, speed) => { const m = E.person(shirt, pants, pick(SKINS), hat); E.scene.add(m); LAW.npcs.push({ m, path, i: 0, x: path[0][0], z: path[0][1], speed, ph: Math.random() * 6 }); };
    add('#3a4a5a', '#2a3340', '#2a3340', [[x0 + 4, z0 + 4], [bx0 - 4, z0 + 4], [bx0 - 4, z1 - 10], [x0 + 12, z1 - 10]], 2.2);
    add('#3a4a5a', '#2a3340', '#2a3340', [[cx, z0 + 24], [cx, z1 - 12]], 1.8);
    for (let k = 0; k < 6; k++) { const a = [rnd(x0 + 4, bx0 - 6), rnd(z0 + 22, z1 - 10)], b = [rnd(x0 + 4, bx0 - 6), rnd(z0 + 22, z1 - 10)]; add(orange, orange, null, [a, b], k < 2 ? 0 : rnd(1, 1.8)); }
  }
  function tickNpcs(dt) {
    for (const n of LAW.npcs) {
      const u = n.m.userData;
      if (n.speed) { const [tx, tz] = n.path[n.i], dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < 0.5) n.i = (n.i + 1) % n.path.length; else { n.x += dx / d * n.speed * dt; n.z += dz / d * n.speed * dt; n.m.rotation.y = Math.atan2(dx, dz); } n.ph += dt * n.speed * 2.2; }
      else n.ph += dt * 3;
      const a = n.speed ? Math.sin(n.ph) * 0.6 : 0; u.legs[0].rotation.x = a; u.legs[1].rotation.x = -a; u.arms[0].rotation.x = n.speed ? -a : Math.sin(n.ph) * 0.5; u.arms[1].rotation.x = n.speed ? a : -Math.abs(Math.sin(n.ph * 1.3)) * 1.6;
      n.m.position.set(n.x, 0.2, n.z);
    }
  }

  /* ================= ⚡ Super Speed Chip ================= */
  const CHIP = 20000;
  const turboApp = {
    id: 'turbo', icon: '⚡', label: 'LSP Turbo',
    html() {
      const s = K.S.turbo;
      return `<div class="ph-card" style="background:linear-gradient(135deg,#16203d,#00b4ff)"><small>LSP Turbo</small><b>⚡ Super Speed Chip</b><small>Top speed +35% · acceleration +40%</small></div>
        <p style="margin:8px 0">A tiny chip that plugs into your car. Buy it here, then get into your car and it installs itself.</p>
        ${!s ? `<button class="btn primary" data-chip="buy" style="width:100%">Buy for ${fmt$(CHIP)}</button>` : s === 'bought' ? '<p><b>📦 Bought!</b> Get into your car to install it.</p>' : `<p><b>✅ Installed</b> · it's ${s === 'on' ? 'ON' : 'OFF'}</p><button class="btn ${s === 'on' ? 'ghost' : 'primary'}" data-chip="toggle" style="width:100%">${s === 'on' ? 'Turn it off' : 'Turn it on'}</button>`}`;
    },
    wire() {
      const b = document.querySelector('#rp-win [data-chip]'); if (!b) return;
      b.onclick = () => {
        if (b.dataset.chip === 'buy') { if (!K.pay(CHIP, '⚡ Super Speed Chip')) return K.say(`You need ${fmt$(CHIP)} for the chip.`); K.S.turbo = 'bought'; K.save(); K.say('📦 Super Speed Chip bought! Get in your car to install it.', 3500); }
        else { K.S.turbo = K.S.turbo === 'on' ? 'off' : 'on'; K.save(); K.say(K.S.turbo === 'on' ? '⚡ Turbo ON' : 'Turbo off'); }
        K.openPhone('turbo');
      };
    },
  };
  function tickTurbo() {
    const s = K.S.turbo, p = E.getP(); if (!p || !p.s) return;
    if (s === 'bought' && E.G.mode === 'drive') { K.S.turbo = 'on'; K.save(); K.say('⚡ Super Speed Chip installed! Top speed +35%, acceleration +40%.', 4000); L.sfx && L.sfx('nitro', { volume: 0.6 }); }
    const want = K.S.turbo === 'on';
    if (want && !p.s._turbo) { p.s._turbo = true; p.s.top *= 1.35; p.s.acc *= 1.4; }
    if (!want && p.s._turbo) { p.s._turbo = false; p.s.top /= 1.35; p.s.acc /= 1.4; }
  }

  /* ================= every frame ================= */
  function tick(dt) {
    if (!K || !LAW.ready || !E.G.on || E.G.paused || E.G.over) return;
    dt = Math.min(dt, 0.1);
    tickNpcs(dt);
    if (LAW.flag) LAW.flag.rotation.y = Math.sin(performance.now() / 600) * 0.25;
    for (const t of LAW.tracers.slice()) { t.t -= dt; if (t.t <= 0) { E.scene.remove(t.l); LAW.tracers.splice(LAW.tracers.indexOf(t), 1); } }
    tickTurbo();
    if (LAW.cut) { const p = E.getP(); if (p) { p.vx = p.vz = 0; } return; }
    if (LAW.jail) { tickJail(dt); return; }
    const gta = GTA(); if (!gta) return;
    const W = gta.W, m = me();
    tickStop(dt);
    // serious crimes: officers get out once their car stops near you
    if (W.stars >= 2) for (const c of W.cops) {
      if (c.mode !== 'chase' || c.deployed) continue;
      const d = Math.hypot(c.x - m.x, c.z - m.z);
      if (d < 24 && c.v < 4 && LAW.officers.length < 8) deploy(c, 2, 'fight');
    }
    for (const o of LAW.officers.slice()) { stepOfficer(o, dt); if (LAW.officers.includes(o)) animate(o, dt); }
    // a police car waits while its officers are out
    for (const o of LAW.officers) if (o.car && W.cops.includes(o.car)) { o.car.mode = 'block'; o.car.blockT = 1e9; o.car.v = 0; }
  }

  window.LSPDriveRP.ext({
    build(kit) {
      K = kit; E = kit.E; T = E.T; ui();
      buildCityHall(); buildPrison();
      K.S.apps = [...new Set([...(K.S.apps || []), 'turbo'])];
      LAW.ready = true;
    },
    tick(dt) { try { tick(dt); } catch (e) { console.error('law', e); } },
    apps: [turboApp],
    inFight: () => LAW.officers.some((o) => o.state === 'fight'),
    enter() { if (K) K.S.apps = [...new Set([...(K.S.apps || []), 'turbo'])]; setTimeout(() => { if (K && K.S.jail && K.S.jail.left > 0 && !LAW.jail) { LAW.cut = false; LAW.jail = { left: K.S.jail.left, total: K.S.jail.left, rest: 0, lawyer: false }; window.LSPDrive.place(PR.cellX, PR.cellZ, -Math.PI / 2); K.say('🔒 You still have prison time to serve.', 4000); } }, 800); },
    respawned() { LAW.officers.slice().forEach(removeOfficer); LAW.stop = null; },
    leave() { if (!K) return; LAW.officers.slice().forEach(removeOfficer); LAW.stop = null; LAW.cut = false; endCourt(); document.getElementById('law-timer').style.display = 'none'; if (LAW.jail) { K.S.jail = { left: LAW.jail.left }; K.save(); LAW.jail = null; } },
    drawMap(g, R, X, Z) { for (const o of LAW.officers) { g.fillStyle = '#2f6bff'; g.beginPath(); g.arc(X(o.x), Z(o.z), 4, 0, 7); g.fill(); } },
  });

  window.LSPDriveLaw = {
    LAW, arrest, targets, blast, prison, release,
    busy: () => LAW.cut || !!LAW.jail || !!LAW.court,
    officerNear: (x, z, r) => LAW.officers.some((o) => o.state === 'fight' && Math.hypot(o.x - x, o.z - z) < r),
  };
})();
