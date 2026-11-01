/* LSPGames shared 3D layer for the games built with LSPG.makeGame.
 *
 *   const V = LSPG.g3d(A, { sky, fog, shadows })   // call once, after makeGame
 *   V.ready                -> true once Three.js has loaded and the scene exists
 *   V.onReady(fn)          -> build your 3D scene in fn(V)
 *   V.frame()              -> render this frame (also clears the 2D overlay canvas)
 *   V.pick(e, plane)       -> where a pointer event hits a plane: {y:h} (floor) or {z:d} (wall)
 *   V.label(x,y,z,text,o)  -> draw text on the 2D overlay at a 3D point (call after frame())
 *   V.pool(make)           -> keep a list of meshes in step with a list of objects
 *   V.box / V.ball / V.M / V.person / V.tree / V.sprite / V.puff
 *
 * Three.js is the same vendored copy LSP Drive uses, loaded only when a game is played.
 * If WebGL is missing the game keeps drawing in 2D, so it always works.
 */
(function () {
  'use strict';
  let threeP = null;
  LSPG.three = () => threeP || (threeP = import('./vendor/three.module.min.js'));

  LSPG.g3d = function (A, o = {}) {
    const V = { ready: false, A, hooks: [] };
    const cv3 = document.createElement('canvas');
    cv3.className = 'gcv'; cv3.style.pointerEvents = 'none';
    A.scr.insertBefore(cv3, A.cv);
    V.canvas = cv3;
    V.onReady = (fn) => { if (V.ready) fn(V); else V.hooks.push(fn); };

    async function init() {
      if (V.ready || V.loading) return;
      V.loading = true;
      let T;
      try { T = await LSPG.three(); } catch (e) { console.warn('3D unavailable', e); return; }
      const touch = LSPG.isTouch();
      let R;
      try { R = new T.WebGLRenderer({ canvas: cv3, antialias: !touch, alpha: false, powerPreference: 'high-performance' }); }
      catch (e) { console.warn('WebGL unavailable', e); return; }
      R.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.25 : 1.75));
      R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
      R.shadowMap.enabled = o.shadows !== false && !touch; R.shadowMap.type = T.PCFSoftShadowMap;
      const scene = new T.Scene();
      const sky = o.sky || ['#4f93d8', '#a9d4f5', '#e4eff7'];
      if (o.background) scene.background = new T.Color(o.background);
      else {
        const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
        sky.forEach((col, i) => gr.addColorStop(i / (sky.length - 1), col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
        scene.background = new T.CanvasTexture(c); scene.background.colorSpace = T.SRGBColorSpace;
      }
      if (o.fog !== false) scene.fog = new T.Fog(o.fogColor || sky[sky.length - 1], o.fogNear || 40, o.fogFar || 160);
      const camera = new T.PerspectiveCamera(o.fov || 50, 1, 0.1, 600);
      scene.add(new T.HemisphereLight(o.skyLight || '#e6f2ff', o.groundLight || '#7a6f5a', o.hemi || 1.0));
      const sun = new T.DirectionalLight('#fff3df', o.sunPower || 2.1); sun.position.set(12, 24, 14);
      if (R.shadowMap.enabled) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const s = sun.shadow.camera; const r = o.shadowSize || 25; s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 120; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; }
      scene.add(sun); scene.add(sun.target);
      Object.assign(V, { T, R, scene, camera, sun });
      const MC = {};
      V.M = (color, x) => { const k = color + JSON.stringify(x || {}); return MC[k] || (MC[k] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, x || {}))); };
      V.box = (w, h, d, mat, x = 0, y = 0, z = 0, parent, shadow = true) => {
        const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof mat === 'string' ? V.M(mat) : mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; (parent || scene).add(m); return m;
      };
      V.ball = (r, mat, x = 0, y = 0, z = 0, parent, seg = 20) => {
        const m = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * 0.7)), typeof mat === 'string' ? V.M(mat) : mat); m.position.set(x, y, z); m.castShadow = true; (parent || scene).add(m); return m;
      };
      V.cyl = (r1, r2, h, mat, x = 0, y = 0, z = 0, parent, seg = 16) => {
        const m = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), typeof mat === 'string' ? V.M(mat) : mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
      };
      V.ground = (w, d, color, y = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), V.M(color)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };
      V.tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
      V.sprite = (text, sx, sy, bg, fg = '#fff', font) => {
        const w = 512, h = Math.max(32, Math.round((512 * sy) / sx));
        const t = V.tex(w, h, (g) => { if (bg) { g.fillStyle = bg; LSPG.rr(g, 6, 6, w - 12, h - 12, Math.min(40, h / 3)); g.fill(); } g.fillStyle = fg; g.font = font || `700 ${Math.round(h * 0.55)}px Fredoka, system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + h * 0.04); });
        t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
        const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(sx, sy, 1); scene.add(s); return s;
      };
      // Blocky player character (same style as LSP Drive).
      V.person = (shirt = '#2f6bff', pants = '#2d3a5c', skin = '#f1c27d', hat) => {
        const g = new T.Group(), sk = V.M(skin), pm = V.M(pants), sm = V.M(shirt);
        const limb = (x, y, w, h, mat, hand) => { const p = new T.Group(); p.position.set(x, y, 0); V.box(w, h, w + 0.02, mat, 0, -h / 2, 0, p); if (hand) V.box(w - 0.01, 0.14, w, sk, 0, -h - 0.04, 0, p); g.add(p); return p; };
        g.userData.legs = [limb(-0.13, 0.9, 0.24, 0.9, pm), limb(0.13, 0.9, 0.24, 0.9, pm)];
        g.userData.arms = [limb(-0.38, 1.5, 0.18, 0.6, sm, true), limb(0.38, 1.5, 0.18, 0.6, sm, true)];
        V.box(0.56, 0.62, 0.32, sm, 0, 1.21, 0, g);
        g.userData.head = V.box(0.38, 0.38, 0.38, sk, 0, 1.73, 0, g);
        V.box(0.06, 0.07, 0.02, '#16203d', -0.08, 1.77, 0.2, g, false); V.box(0.06, 0.07, 0.02, '#16203d', 0.08, 1.77, 0.2, g, false);
        V.box(0.16, 0.03, 0.02, '#a0522d', 0, 1.65, 0.2, g, false);
        if (hat) V.box(0.42, 0.1, 0.42, hat, 0, 1.96, 0, g);
        scene.add(g); return g;
      };
      V.walk = (p, phase, amount = 1) => { const s = Math.sin(phase) * 0.7 * amount, u = p.userData; u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s; u.arms[0].rotation.x = -s; u.arms[1].rotation.x = s; };
      V.tree = (x, z, s = 1, y = 0) => {
        const g = new T.Group(); V.cyl(0.18 * s, 0.25 * s, 2 * s, '#6b4a2f', 0, s, 0, g, 6);
        const leaf = new T.Mesh(new T.IcosahedronGeometry(1.5 * s, 0), V.M('#3f8a3a', { flatShading: true })); leaf.position.y = 2.9 * s; leaf.castShadow = true; g.add(leaf);
        g.position.set(x, y, z); scene.add(g); return g;
      };
      // particles
      const glow = V.tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
      glow.wrapS = glow.wrapT = T.ClampToEdgeWrapping;
      const parts = []; let pi = 0;
      for (let i = 0; i < 90; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: glow, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); parts.push({ s, life: 0 }); }
      V.puff = (x, y, z, color, size = 0.5, life = 0.6, vx = 0, vy = 0, vz = 0, grow = 0.5, a = 1, grav = 0) => {
        const p = parts[pi++ % parts.length]; p.s.position.set(x, y, z); p.s.scale.set(size, size, 1); p.s.material.color.set(color); p.s.material.opacity = a; p.s.visible = true;
        Object.assign(p, { life, max: life, vx, vy, vz, grow, a, grav });
      };
      V.burst = (x, y, z, colors, n = 14, speed = 4, size = 0.3) => { for (let i = 0; i < n; i++) V.puff(x, y, z, colors[i % colors.length], size, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * speed * 2, Math.random() * speed * 1.4, (Math.random() - 0.5) * speed * 2, -0.2, 1, 9); };
      let lastT = performance.now();
      V.stepFx = () => {
        const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; } p.vy -= p.grav * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; const sc = Math.max(0.01, p.s.scale.x + p.grow * dt); p.s.scale.set(sc, sc, 1); p.s.material.opacity = (p.life / p.max) * p.a; }
        return dt;
      };
      // Keep meshes matched to a list of game objects (by identity).
      V.pool = (make) => {
        const map = new Map();
        return {
          sync(list, update) {
            const seen = new Set();
            for (const it of list) { let m = map.get(it); if (!m) { m = make(it); map.set(it, m); } seen.add(it); m.visible = true; if (update) update(m, it); }
            for (const [it, m] of map) if (!seen.has(it)) { scene.remove(m); map.delete(it); }
          },
          clear() { for (const m of map.values()) scene.remove(m); map.clear(); },
          get: (it) => map.get(it),
        };
      };
      const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(), hit = new T.Vector3();
      V.pick = (e, pl) => {
        const r = cv3.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        if (pl.z != null) plane.set(new T.Vector3(0, 0, 1), -pl.z); else plane.set(new T.Vector3(0, 1, 0), -(pl.y || 0));
        return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
      };
      const pv = new T.Vector3();
      V.toScreen = (x, y, z) => { pv.set(x, y, z).project(camera); const d = A.view.d || 1; return { x: ((pv.x + 1) / 2) * A.cv.width, y: ((1 - pv.y) / 2) * A.cv.height, behind: pv.z > 1, d }; };
      V.label = (x, y, z, text, st = {}) => {
        const p = V.toScreen(x, y, z); if (p.behind) return; const g = A.g, d = p.d;
        g.save(); g.globalAlpha = st.alpha == null ? 1 : st.alpha; g.font = `${st.weight || 700} ${(st.size || 18) * d}px ${st.family || 'Fredoka, system-ui, sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (st.bg) { const w = g.measureText(text).width + 16 * d, h = (st.size || 18) * d * 1.5; g.fillStyle = st.bg; LSPG.rr(g, p.x - w / 2, p.y - h / 2, w, h, 8 * d); g.fill(); }
        if (st.stroke) { g.lineWidth = 4 * d; g.strokeStyle = st.stroke; g.strokeText(text, p.x, p.y); }
        g.fillStyle = st.color || '#16203d'; g.fillText(text, p.x, p.y); g.restore();
      };
      V.resize = () => {
        const w = A.scr.clientWidth || innerWidth, h = A.scr.clientHeight || innerHeight; R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      V.frame = () => {
        if (cv3.width !== Math.round(A.scr.clientWidth * R.getPixelRatio())) V.resize();
        V.stepFx();
        if (V.follow) { sun.position.set(V.follow.x + 12, V.follow.y + 24, V.follow.z + 14); sun.target.position.copy(V.follow); }
        R.render(scene, camera);
        const g = A.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, A.cv.width, A.cv.height);
      };
      addEventListener('resize', () => { if (V.ready) V.resize(); });
      V.resize();
      try { for (const f of V.hooks) f(V); } catch (e) { console.error(e); return; }
      V.ready = true; cv3.style.display = 'block';
      A.scr.style.background = '#000';
    }
    V.init = init;
    // Start loading as soon as the player opens the game's lobby.
    const card = document.getElementById('card-' + A.key); if (card) card.addEventListener('click', init);
    return V;
  };
})();
