/* LSP Drive · realism layer: a real sky with clouds, sun and stars, reflections on cars and
 * glass, sharper city textures, rain and thunderstorms, working traffic lights, people
 * walking on the pavements, parked cars, street furniture, headlights, brake lights and
 * smoke from damaged cars. drive.js calls init() once and frame() every frame.
 */
(function () {
  'use strict';
  const L = window.LSPG;
  let C = null, T = null;
  const R = { day: 1, rain: 0, rainWant: 0, wx: 'auto', wxT: 0, peds: [], flash: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const touch = () => L.isTouch();
  const WX_KEY = 'lspdrive.weather';
  try { R.wx = localStorage.getItem(WX_KEY) || 'auto'; } catch (e) {}

  function init(ctx) {
    C = ctx; T = ctx.T;
    sky(); envMaps(); textures(); lights(); people(); parked(); props(); rain();
    C.scene.fog.near = 160; C.scene.fog.far = 700;
  }

  /* ---------- sky dome with sun, clouds and stars ---------- */
  function sky() {
    const g = new T.SphereGeometry(900, 32, 16);
    R.skyU = { top: { value: new T.Color('#2f7fd6') }, hor: { value: new T.Color('#cfe6f7') }, low: { value: new T.Color('#e9f2f8') }, sun: { value: new T.Vector3(0.5, 0.6, 0.3).normalize() }, sunCol: { value: new T.Color('#fff2d6') }, night: { value: 0 } };
    const m = new T.ShaderMaterial({ uniforms: R.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, hor, low, sunCol, sun; uniform float night; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(hor, low, clamp(-y*4.0,0.0,1.0));
          float s = max(dot(vD, normalize(sun)), 0.0); c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35 * (1.0 - night));
          if (night > 0.0 && y > 0.0) { vec2 q = floor(vD.xz / (y + 0.35) * 260.0); float st = step(0.9975, h(q)); c += vec3(st) * night * smoothstep(0.0, 0.25, y); }
          gl_FragColor = vec4(c, 1.0); }` });
    R.dome = new T.Mesh(g, m); R.dome.renderOrder = -10; R.dome.frustumCulled = false; C.scene.add(R.dome);
    C.scene.background = null;
    // soft clouds drifting overhead
    const tex = C.canvasTex(256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = rnd(40, w - 40), y = rnd(40, h - 30), r = rnd(18, 42), gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    R.cloudM = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    R.clouds = new T.Group(); C.scene.add(R.clouds);
    for (let i = 0; i < 26; i++) { const p = new T.Mesh(new T.PlaneGeometry(1, 0.5), R.cloudM); p.rotation.x = Math.PI / 2; const s = rnd(140, 320); p.scale.set(s, s, 1); p.position.set(rnd(-900, 900), rnd(210, 280), rnd(-900, 900)); p.rotation.z = rnd(0, 6); R.clouds.add(p); }
  }
  // reflections: a small picture of the sky that cars, glass and puddles reflect
  function envMaps() {
    const pm = new T.PMREMGenerator(C.renderer), mk = (top, hor, gnd, sunC) => {
      const s = new T.Scene(), g = new T.SphereGeometry(10, 24, 12), col = [], p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10, c = new T.Color(y > 0 ? hor : gnd).lerp(new T.Color(y > 0 ? top : gnd), Math.max(0, y)); col.push(c.r, c.g, c.b); }
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      s.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
      if (sunC) { const sm = new T.Mesh(new T.SphereGeometry(1.2, 12, 8), new T.MeshBasicMaterial({ color: sunC })); sm.position.set(5, 6, 3); s.add(sm); }
      for (let k = 0; k < 8; k++) { const b = new T.Mesh(new T.BoxGeometry(1.2, rnd(1, 4), 1.2), new T.MeshBasicMaterial({ color: '#5d6672' })); const a = (k / 8) * Math.PI * 2; b.position.set(Math.cos(a) * 8, -1 + b.geometry.parameters.height / 2, Math.sin(a) * 8); s.add(b); }
      const t = pm.fromScene(s, 0.02).texture; return t;
    };
    R.envDay = mk('#3f8ee0', '#dcecf8', '#6b7466', '#fffbe8'); R.envNight = mk('#0b1430', '#1d2a48', '#15171c', null); R.envRain = mk('#5c6773', '#8d98a3', '#3a3f45', null);
    C.scene.environment = R.envDay; pm.dispose();
  }
  /* ---------- sharper roads and buildings ---------- */
  function textures() {
    // asphalt with grain, patches and worn markings
    const road = C.canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#3b3e44'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? `rgba(255,255,255,${rnd(0.02, 0.07)})` : `rgba(0,0,0,${rnd(0.04, 0.12)})`; g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 2.5)); }
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(20,20,24,${rnd(0.15, 0.3)})`; g.fillRect(rnd(0, w), rnd(10, h - 30), rnd(20, 70), rnd(10, 26)); }
      g.strokeStyle = 'rgba(15,15,18,.45)'; g.lineWidth = 1.2; for (let i = 0; i < 5; i++) { g.beginPath(); let x = rnd(0, w), y = rnd(0, h); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-12, 12); y += rnd(-8, 8); g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(235,235,235,.9)'; g.fillRect(0, 6, w, 3); g.fillRect(0, h - 9, w, 3);
      for (let x = 0; x < w; x += 128) { g.fillStyle = `rgba(240,240,240,${rnd(0.7, 0.92)})`; g.fillRect(x, h / 2 - 2.5, 70, 5); }
    }, [446 / 32, 1]);
    C.roadMat.map = road; C.roadMat.roughness = 0.9; C.roadMat.needsUpdate = true; R.roadMat = C.roadMat;
    // buildings: proper window frames, reflections and lit rooms at night
    for (const p of C.pal) {
      if (!p.mat) continue;
      const tex = C.canvasTex(512, 512, (g) => {
        g.fillStyle = p.wall; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 3000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
        for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 4; cy++) {
          const x = cx * 128, y = cy * 128, lit = Math.random();
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + 120, 128, 8); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y + 118, 128, 2);
          const fx = p.glass ? x + 4 : x + 20, fy = p.glass ? y + 4 : y + 22, fw = p.glass ? 120 : 88, fh = p.glass ? 112 : 78;
          g.fillStyle = p.glass ? '#6f8394' : '#e9e6df'; g.fillRect(fx - 4, fy - 4, fw + 8, fh + 8);
          const gr = g.createLinearGradient(fx, fy, fx + fw * 0.6, fy + fh); if (lit > 0.82) { gr.addColorStop(0, '#fff1c4'); gr.addColorStop(1, '#e8b860'); } else { gr.addColorStop(0, p.glass ? '#bcd9ee' : '#9cc0de'); gr.addColorStop(0.45, p.win); gr.addColorStop(1, '#162232'); }
          g.fillStyle = gr; g.fillRect(fx, fy, fw, fh);
          g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(fx, fy + fh * 0.6); g.lineTo(fx + fw * 0.5, fy); g.lineTo(fx + fw * 0.65, fy); g.lineTo(fx, fy + fh * 0.85); g.fill();
          g.fillStyle = p.glass ? '#55687a' : '#d8d4cc'; g.fillRect(fx + fw / 2 - 2, fy, 4, fh); g.fillRect(fx, fy + fh * 0.45, fw, 3);
          if (!p.glass && Math.random() < 0.35) { g.fillStyle = ['rgba(240,230,210,.85)', 'rgba(200,215,235,.85)', 'rgba(230,200,190,.85)'][Math.floor(Math.random() * 3)]; g.fillRect(fx, fy, fw * rnd(0.2, 0.45), fh); }
          if (!p.glass && Math.random() < 0.18) { g.fillStyle = '#5a5f68'; g.fillRect(fx - 6, fy + fh + 2, fw + 12, 6); }
        }
        g.fillStyle = p.wall; g.fillRect(0, 0, 10, 10);
      });
      tex.repeat.copy(p.tex.repeat); p.mat.map = tex; p.mat.roughness = p.glass ? 0.18 : 0.8; p.mat.metalness = p.glass ? 0.55 : 0.02; p.mat.needsUpdate = true;
    }
  }

  /* ---------- traffic lights ---------- */
  const LIGHT_T = 14, AMBER = 3;
  const phase = () => { const t = (C.G.t || 0) % (LIGHT_T * 2); return { xGreen: t < LIGHT_T - AMBER, xAmber: t >= LIGHT_T - AMBER && t < LIGHT_T, zGreen: t >= LIGHT_T && t < LIGHT_T * 2 - AMBER, zAmber: t >= LIGHT_T * 2 - AMBER }; };
  // true when a car driving in direction d (0:+x 1:+z 2:-x 3:-z) must stop before node (i, j)
  function red(i, j, d) { if (R.off.has(i + ',' + j)) return false; const p = phase(); return d % 2 === 0 ? !p.xGreen : !p.zGreen; }
  function lights() {
    R.off = new Set(); const { RX, NB, HALF } = C;
    for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) if (i === 0 || j === 0 || i === NB || j === NB) R.off.add(i + ',' + j);
    const poles = [], heads = [], bulbs = { xr: [], xa: [], xg: [], zr: [], za: [], zg: [] };
    for (let i = 1; i < NB; i++) for (let j = 1; j < NB; j++) {
      const cx = RX(i), cz = RX(j);
      for (const [sx, sz, ax] of [[1, 1, 'x'], [-1, -1, 'x'], [1, -1, 'z'], [-1, 1, 'z']]) {
        const x = cx + sx * (HALF + 0.8), z = cz + sz * (HALF + 0.8);
        const p = new T.CylinderGeometry(0.09, 0.11, 4.6, 8); p.translate(x, 2.3 + 0.16, z); poles.push(p);
        // the head faces traffic coming along its axis
        const hx = ax === 'x' ? x : x, hz = z, face = ax === 'x' ? [-sx, 0] : [0, -sz];
        const hd = new T.BoxGeometry(ax === 'x' ? 0.3 : 0.42, 1.1, ax === 'x' ? 0.42 : 0.3); hd.translate(hx, 4.2, hz); heads.push(hd);
        [['r', 4.55], ['a', 4.2], ['g', 3.85]].forEach(([c, y]) => { const b = new T.SphereGeometry(0.11, 10, 8); b.translate(hx + face[0] * 0.17, y, hz + face[1] * 0.17); bulbs[ax + c].push(b); });
      }
    }
    const add = (geos, mat) => { const m = new T.Mesh(C.merge(geos), mat); m.castShadow = false; C.scene.add(m); return m; };
    add(poles, C.M('#3a3f48', { metalness: 0.5, roughness: 0.5 })); add(heads, C.M('#1d2026', { roughness: 0.6 }));
    R.bm = {};
    for (const k in bulbs) { const col = k[1] === 'r' ? '#ff2d2d' : k[1] === 'a' ? '#ffb31a' : '#2dff6b'; const m = new T.MeshStandardMaterial({ color: '#222', emissive: col, emissiveIntensity: 0 }); R.bm[k] = m; add(bulbs[k], m); }
  }
  function tickLights() {
    const p = phase(), on = 3, off = 0.04;
    R.bm.xg.emissiveIntensity = p.xGreen ? on : off; R.bm.xa.emissiveIntensity = p.xAmber ? on : off; R.bm.xr.emissiveIntensity = !p.xGreen && !p.xAmber ? on : off;
    R.bm.zg.emissiveIntensity = p.zGreen ? on : off; R.bm.za.emissiveIntensity = p.zAmber ? on : off; R.bm.zr.emissiveIntensity = !p.zGreen && !p.zAmber ? on : off;
  }

  /* ---------- people walking on the pavements ---------- */
  const SHIRTS = ['#2f6bff', '#ff4d8b', '#14c79a', '#ffb31a', '#8a5cff', '#ffffff', '#d61f30', '#16203d', '#ff8a3d', '#7a808a', '#3f8a3a', '#f2d16b'];
  const PANTS = ['#2d3a5c', '#16181f', '#6b4a2f', '#4a5568', '#1f3b5c', '#c7b28a'];
  const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0673d'];
  function blockPath(bx, bz) { const x0 = C.RX(bx) + C.HALF + 1.4, z0 = C.RX(bz) + C.HALF + 1.4, s = C.CELL - C.ROAD - 2.8; return { x0, z0, s }; }
  function pedPos(p) { const { x0, z0, s } = blockPath(p.bx, p.bz), u = ((p.u % (4 * s)) + 4 * s) % (4 * s); if (u < s) return [x0 + u, z0, 0]; if (u < 2 * s) return [x0 + s, z0 + u - s, 1]; if (u < 3 * s) return [x0 + s - (u - 2 * s), z0 + s, 2]; return [x0, z0 + s - (u - 3 * s), 3]; }
  function placePed(p, near) {
    const me = near; let bx, bz, tries = 0;
    do { bx = Math.floor(rnd(0, C.NB)); bz = Math.floor(rnd(0, C.NB)); if (me) { const cbx = Math.floor((me.x - C.RX(0)) / C.CELL), cbz = Math.floor((me.z - C.RX(0)) / C.CELL); bx = Math.max(0, Math.min(C.NB - 1, cbx + Math.round(rnd(-1.5, 1.5)))); bz = Math.max(0, Math.min(C.NB - 1, cbz + Math.round(rnd(-1.5, 1.5)))); } } while (C.PARKS.includes(bx + ',' + bz) && tries++ < 8);
    p.bx = bx; p.bz = bz; p.u = rnd(0, 4 * (C.CELL - C.ROAD - 2.8)); p.dir = Math.random() < 0.5 ? 1 : -1; p.sp = rnd(1.1, 1.7); p.down = 0; p.pause = 0;
  }
  function people() {
    const n = touch() ? 12 : 26;
    for (let k = 0; k < n; k++) {
      const m = C.person(SHIRTS[k % SHIRTS.length], PANTS[k % PANTS.length], SKINS[(k * 7) % SKINS.length], k % 5 === 0 ? ['#16203d', '#d61f30', '#f2f2f2'][k % 3] : undefined);
      if (k % 4 === 0) C.box(0.32, 0.4, 0.16, C.M(['#6b4a2f', '#16203d', '#d61f30'][k % 3]), 0, 1.25, -0.2, m, false); // backpack
      C.scene.add(m); const p = { m, ph: rnd(0, 6) }; placePed(p); R.peds.push(p);
    }
  }
  function tickPeople(dt) {
    const F = C.getF(), P = C.getP(), me = C.G.mode === 'drive' ? P : F;
    for (const p of R.peds) {
      const [x, z] = pedPos(p);
      if (Math.hypot(x - me.x, z - me.z) > 200) { placePed(p, me); continue; }
      const m = p.m, u = m.userData;
      if (p.down > 0) { p.down -= dt; m.rotation.x = -Math.PI / 2 * Math.min(1, (2.6 - p.down) * 4); m.position.y = 0.4; if (p.down <= 0) { m.rotation.x = 0; p.sp = rnd(2.2, 2.8); } continue; }
      // get out of the way of cars: a car hitting someone knocks them over
      if (P && C.G.mode === 'drive') { const d = Math.hypot(P.x - m.position.x, P.z - m.position.z), v = Math.hypot(P.vx, P.vz); if (d < 2.2 && v > 4) { p.down = 2.6; L.sfx && L.sfx('hurt', { volume: 0.4 }); continue; } if (d < 7 && v > 2) p.sp = 2.6; }
      if (p.pause > 0) { p.pause -= dt; u.legs[0].rotation.x = u.legs[1].rotation.x = 0; u.arms[0].rotation.x = u.arms[1].rotation.x = 0; continue; }
      if (Math.random() < dt * 0.02) p.pause = rnd(2, 6);
      p.u += p.dir * p.sp * dt; p.sp += (1.4 - p.sp) * dt * 0.3; p.ph += dt * p.sp * 4.2;
      const [nx, nz, side] = pedPos(p);
      m.position.set(nx, 0.16 + Math.abs(Math.sin(p.ph)) * 0.04, nz); m.rotation.set(0, [Math.PI / 2, 0, -Math.PI / 2, Math.PI][side] + (p.dir < 0 ? Math.PI : 0), 0);
      const sw = Math.sin(p.ph) * 0.55; u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; u.arms[0].rotation.x = -sw * 0.8; u.arms[1].rotation.x = sw * 0.8;
    }
  }

  /* ---------- parked cars and street furniture ---------- */
  function parked() {
    const b = C.TBODY.sedan, CB = C.carBody(b), slots = [], { RX, NB, HALF, CELL } = C;
    for (let i = 0; i <= NB; i++) for (let j = 0; j < NB; j++) for (const side of [-1, 1]) {
      if (Math.random() < 0.55) continue;
      const along = RX(j) + HALF + 8 + Math.random() * (CELL - HALF * 2 - 16), off = side * (HALF - 1.25);
      if (Math.random() < 0.5) slots.push([RX(i) + off, along, side > 0 ? 0 : Math.PI]); else slots.push([along, RX(i) + off, side > 0 ? -Math.PI / 2 : Math.PI / 2]);
    }
    const n = slots.length, mk = (geo, mat) => { const m = new T.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; C.scene.add(m); return m; };
    const body = mk(CB.body, new T.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }));
    const glass = mk(CB.glass, C.M('#1a2633', { metalness: 0.6, roughness: 0.05 })), roof = mk(CB.roof, new T.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.3 }));
    const wg = new T.CylinderGeometry(b.wr, b.wr, b.ww, 14); wg.rotateZ(Math.PI / 2);
    const wheels = new T.InstancedMesh(wg, C.M('#17181c', { roughness: 0.95 }), n * 4); C.scene.add(wheels);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1), col = new T.Color(), v = new T.Vector3();
    slots.forEach(([x, z, h], k) => {
      q.setFromEuler(e.set(0, h, 0)); m4.compose(v.set(x, 0, z), q, one); body.setMatrixAt(k, m4); glass.setMatrixAt(k, m4); roof.setMatrixAt(k, m4);
      col.set(C.TCOLORS[k % C.TCOLORS.length]); body.setColorAt(k, col); roof.setColorAt(k, col);
      let w = 0; for (const sz of [1, -1]) for (const sx of [-1, 1]) { const lx = sx * (b.W / 2 - b.ww / 2 + 0.03), lz = sz * (b.L / 2 - b.wr - 0.32), c = Math.cos(h), s = Math.sin(h); m4.compose(v.set(x + lx * c + lz * s, b.wr, z - lx * s + lz * c), q, one); wheels.setMatrixAt(k * 4 + w++, m4); }
      const along = Math.abs(Math.sin(h)) < 0.5; C.addCol(x - (along ? 1 : 2.2), z - (along ? 2.2 : 1), x + (along ? 1 : 2.2), z + (along ? 2.2 : 1));
    });
    for (const m of [body, glass, roof, wheels]) { m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; }
    if (body.instanceColor) body.instanceColor.needsUpdate = true; if (roof.instanceColor) roof.instanceColor.needsUpdate = true;
  }
  function props() {
    const { RX, NB, HALF, CELL } = C, bench = [], bin = [], hyd = [], stop = [];
    for (let bx = 0; bx < NB; bx++) for (let bz = 0; bz < NB; bz++) {
      if (C.PARKS.includes(bx + ',' + bz)) continue;
      const x0 = RX(bx) + HALF, z0 = RX(bz) + HALF, S = CELL - C.ROAD;
      for (let k = 0; k < 2; k++) { const t = 18 + k * 22; bench.push([x0 + t, z0 + 0.6, 0]); bin.push([x0 + t + 3, z0 + 0.5, 0]); hyd.push([x0 + 0.6, z0 + t + 5, 0]); }
      if ((bx + bz) % 3 === 0) stop.push([x0 + S / 2, z0 + S - 0.9, Math.PI]);
    }
    const inst = (parts, list) => { for (const [geo, mat] of parts) { const m = new T.InstancedMesh(geo, mat, list.length); const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1), v = new T.Vector3(); list.forEach(([x, z, r], i) => { q.setFromEuler(e.set(0, r, 0)); m4.compose(v.set(x, 0.16, z), q, one); m.setMatrixAt(i, m4); }); m.castShadow = true; C.scene.add(m); } };
    const G2 = (w, h, d, y, x = 0, z = 0) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
    inst([[C.merge([G2(1.8, 0.08, 0.5, 0.45), G2(1.8, 0.45, 0.06, 0.72, 0, -0.24)]), C.M('#8b6b4a')], [C.merge([G2(0.08, 0.45, 0.45, 0.22, -0.8), G2(0.08, 0.45, 0.45, 0.22, 0.8)]), C.M('#2b2f36', { metalness: 0.6 })]], bench);
    inst([[new T.CylinderGeometry(0.28, 0.24, 0.9, 12).translate(0, 0.45, 0), C.M('#2f6b4f', { metalness: 0.3 })]], bin);
    inst([[C.merge([new T.CylinderGeometry(0.14, 0.17, 0.7, 10).translate(0, 0.35, 0), new T.SphereGeometry(0.15, 10, 6).translate(0, 0.72, 0)]), C.M('#d61f30', { metalness: 0.3, roughness: 0.4 })]], hyd);
    inst([[C.merge([G2(3.2, 0.1, 1.4, 2.6), G2(0.08, 2.6, 0.08, 1.3, -1.5, -0.6), G2(0.08, 2.6, 0.08, 1.3, 1.5, -0.6)]), C.M('#9aa3b5', { metalness: 0.5 })], [G2(3, 2.2, 0.05, 1.3, 0, -0.65), C.M('#bfe4ff', { transparent: true, opacity: 0.35, roughness: 0.05 })], [G2(2.6, 0.08, 0.4, 0.5, 0, -0.35), C.M('#2f6bff')]], stop);
    for (const [x, z] of stop) C.addCol(x - 1.6, z - 0.8, x + 1.6, z + 0.1);
  }

  /* ---------- weather: rain and thunderstorms ---------- */
  function rain() {
    const n = touch() ? 900 : 2200, pos = new Float32Array(n * 6);
    R.drops = []; for (let i = 0; i < n; i++) R.drops.push([rnd(-40, 40), rnd(0, 30), rnd(-40, 40)]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    R.rainM = new T.LineSegments(g, new T.LineBasicMaterial({ color: '#c7d6e6', transparent: true, opacity: 0.45, fog: false })); R.rainM.frustumCulled = false; R.rainM.visible = false; C.scene.add(R.rainM);
  }
  function setWeather(w) { R.wx = w; try { localStorage.setItem(WX_KEY, w); } catch (e) {} if (w === 'clear') R.rainWant = 0; if (w === 'rain') R.rainWant = 1; if (w === 'storm') R.rainWant = 1.4; }
  function tickWeather(dt) {
    if (R.wx === 'auto') { R.wxT -= dt; if (R.wxT <= 0) { R.wxT = rnd(120, 300); R.rainWant = Math.random() < 0.25 ? (Math.random() < 0.3 ? 1.4 : 1) : 0; } } else setWeather(R.wx);
    R.rain += Math.sign(R.rainWant - R.rain) * Math.min(Math.abs(R.rainWant - R.rain), dt * 0.12);
    const wet = Math.min(1, R.rain), cam = C.camera.position;
    R.rainM.visible = wet > 0.05;
    if (R.rainM.visible) {
      const a = R.rainM.geometry.attributes.position.array, fall = 26 * dt, n = Math.floor(R.drops.length * Math.min(1, wet));
      for (let i = 0; i < R.drops.length; i++) { const d = R.drops[i]; d[1] -= fall; if (d[1] < -2) { d[1] = rnd(18, 30); d[0] = rnd(-40, 40); d[2] = rnd(-40, 40); } const k = i * 6; if (i < n) { a[k] = cam.x + d[0]; a[k + 1] = cam.y + d[1] - 10; a[k + 2] = cam.z + d[2]; a[k + 3] = a[k] + 0.05; a[k + 4] = a[k + 1] - 0.7; a[k + 5] = a[k + 2]; } else a[k + 1] = a[k + 4] = -999; }
      R.rainM.geometry.attributes.position.needsUpdate = true;
      if (Math.random() < dt * 0.6) L.sfx && L.sfx('whoosh', { volume: 0.04 * wet });
    }
    // thunder in a storm
    if (R.rain > 1.1 && Math.random() < dt * 0.05) { R.flash = 0.25; setTimeout(() => L.sfx && L.sfx('explode', { volume: 0.25 }), rnd(300, 1500)); }
    R.flash = Math.max(0, R.flash - dt);
    // wet roads shine
    R.roadMat.roughness = 0.9 - wet * 0.6; R.roadMat.color.setScalar(1 - wet * 0.3);
  }

  /* ---------- your car: headlights, brake lights, smoke when damaged ---------- */
  function tickCar(dt) {
    const P = C.getP(); if (!P || !P.m) return;
    const night = R.day < 0.45, dark = night || R.rain > 0.6, K = C.K, TIN = C.TIN;
    if (!R.head) { R.head = new T.SpotLight('#fff6dd', 0, 60, 0.55, 0.5, 1.2); R.headT = new T.Object3D(); C.scene.add(R.head); C.scene.add(R.headT); R.head.target = R.headT; }
    const drive = C.G.mode === 'drive', fx = Math.sin(P.h), fz = Math.cos(P.h);
    R.head.intensity = drive && dark && !P.s.bike ? 60 : drive && dark ? 30 : 0;
    R.head.position.set(P.x + fx * 2.2, 1.0, P.z + fz * 2.2); R.headT.position.set(P.x + fx * 20, 0, P.z + fz * 20);
    const braking = drive && (K.KeyS || K.ArrowDown || TIN.brake || K.Space);
    if (P.m.tail) P.m.tail.emissiveIntensity = braking ? 3 : dark ? 1.2 : 0.4;
    // smoke and fire from a damaged engine
    const hp = P.hp / P.s.hp;
    if (hp < 0.55 && Math.random() < dt * (hp < 0.3 ? 30 : 12)) { const ex = new T.Vector3(0, 1.1, P.m.L ? P.m.L / 2 - 0.6 : 1.4); P.m.g.localToWorld(ex); C.puff(ex.x, ex.y, ex.z, hp < 0.3 ? '#2b2b2b' : '#9a9a9a', 0.35, 0.9, rnd(-0.3, 0.3), rnd(1, 2), rnd(-0.3, 0.3), 2.2, 1.6); }
    if (hp < 0.15 && Math.random() < dt * 20) { const ex = new T.Vector3(rnd(-0.4, 0.4), 1.0, P.m.L ? P.m.L / 2 - 0.5 : 1.4); P.m.g.localToWorld(ex); C.puff(ex.x, ex.y, ex.z, Math.random() < 0.5 ? '#ff8a00' : '#ffd23f', 0.3, 0.6, 0, rnd(1.5, 3), 0, 0, 0.5); }
    // exhaust in cold or wet weather
    if (drive && Math.random() < dt * 6 && P.m.exhaust) { const w = P.m.exhaust.clone(); P.m.g.localToWorld(w); C.puff(w.x, w.y, w.z, '#d9dde3', 0.15, 0.35, -P.vx * 0.05, 0.3, -P.vz * 0.05, 0.5, 1.2); }
    // traffic: lights on at night, brake lights when stopping
    for (const tr of C.G.traffic) if (tr.m && tr.m.tail) tr.m.tail.emissiveIntensity = tr.sp < tr.max * 0.5 ? 2.6 : dark ? 1.1 : 0.4;
  }

  /* ---------- every frame ---------- */
  function frame(dt) {
    if (!C) return; const cam = C.camera.position;
    R.dome.position.copy(cam); R.clouds.position.set(cam.x * 0.6, 0, cam.z * 0.6);
    R.clouds.children.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); if (c.position.x > 900) c.position.x = -900; });
    // the sky follows the sun the clock gives us (drive-rp sets sun intensity from the time of day)
    const rp = window.LSPDriveRP, day = rp && rp.dayF != null ? rp.dayF : 1; R.day = day;
    const wet = Math.min(1, R.rain), U = R.skyU, sunDir = U.sun.value;
    sunDir.set(0.45, -0.25 + day * 0.85, 0.35).normalize();
    const lerp3 = (a, b, c, t) => (t < 0.5 ? new T.Color(a).lerp(new T.Color(b), t * 2) : new T.Color(b).lerp(new T.Color(c), (t - 0.5) * 2));
    U.top.value.copy(lerp3('#050a1c', '#4a5f9c', '#2f7fd6', day)).lerp(new T.Color('#4d5966'), wet * 0.8);
    U.hor.value.copy(lerp3('#101a33', '#f2a46b', '#cfe6f7', day)).lerp(new T.Color('#8a949e'), wet * 0.8);
    U.low.value.copy(lerp3('#0b1022', '#c98a63', '#e9f2f8', day)).lerp(new T.Color('#7f8892'), wet * 0.8);
    U.sunCol.value.set(day < 0.5 ? '#ffb27a' : '#fff2d6'); U.night.value = Math.max(0, 1 - day * 3) * (1 - wet);
    if (R.flash > 0) { U.top.value.lerp(new T.Color('#ffffff'), R.flash * 3); U.hor.value.lerp(new T.Color('#ffffff'), R.flash * 3); }
    C.scene.fog.color.copy(U.hor.value); C.scene.fog.near = 160 - wet * 90; C.scene.fog.far = 700 - wet * 330;
    C.sun.intensity = (0.3 + 1.9 * day) * (1 - wet * 0.65); C.sun.color.set(day < 0.45 ? '#ffc79a' : '#fff3df');
    R.cloudM.opacity = 0.75 + wet * 0.25; R.cloudM.color.setScalar(0.35 + day * 0.65 - wet * 0.35);
    const env = wet > 0.5 ? R.envRain : day < 0.3 ? R.envNight : R.envDay; if (C.scene.environment !== env) C.scene.environment = env;
    tickLights(); tickWeather(dt); tickPeople(dt); tickCar(dt);
  }
  window.LSPDriveReal = { init, frame, red, setWeather, get weather() { return R.wx; }, R };
})();
