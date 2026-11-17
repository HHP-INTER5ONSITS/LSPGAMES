/* LSP Drive · realism layer 3: surface detail.
 * Every textured surface (roads, sidewalks, brick, concrete, wood, grass, building walls) gets a
 * "normal map" made from its own texture, so light catches the bumps: mortar lines sink into brick,
 * asphalt has grain, window frames stand out and grass looks rough. Made once while the city loads,
 * a few textures at a time so the game doesn't stutter.
 */
(function () {
  'use strict';
  const R1 = window.LSPDriveReal; if (!R1) return;
  const base = R1.init;
  R1.init = function (ctx) { base(ctx); setTimeout(() => { try { start(ctx); } catch (e) { console.warn('surface detail off', e); } }, 1200); };

  const made = new Map();
  function start(C) {
    const T = C.T, mats = new Set();
    C.scene.traverse((o) => { const m = o.material; if (!m) return; (Array.isArray(m) ? m : [m]).forEach((x) => mats.add(x)); });
    const todo = [...mats].filter((m) => (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && m.map && !m.normalMap && !m.transparent && m.map.image && m.map.image.width >= 32);
    let i = 0;
    (function step() {
      const t0 = performance.now();
      while (i < todo.length && performance.now() - t0 < 12) {
        const m = todo[i++];
        try { const nm = normalFor(T, m.map); if (nm) { m.normalMap = nm; const k = m.metalness > 0.5 ? 0.35 : 0.85; m.normalScale.set(k, k); m.needsUpdate = true; } } catch (e) { /* skip that one */ }
      }
      if (i < todo.length) setTimeout(step, 30);
    })();
    R1.surfaceDetail = { materials: todo.length };
  }

  function normalFor(T, tex) {
    if (made.has(tex)) return made.get(tex);
    const img = tex.image, s = Math.min(1, 512 / Math.max(img.width, img.height)), w = Math.max(8, Math.round(img.width * s)), h = Math.max(8, Math.round(img.height * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const src = g.getImageData(0, 0, w, h).data, H = new Float32Array(w * h);
    for (let p = 0, q = 0; p < H.length; p++, q += 4) H[p] = (src[q] * 0.299 + src[q + 1] * 0.587 + src[q + 2] * 0.114) / 255;
    const out = g.createImageData(w, h), d = out.data, str = 3.2;
    for (let y = 0; y < h; y++) {
      const yu = (y - 1 + h) % h, yd = (y + 1) % h;
      for (let x = 0; x < w; x++) {
        const xl = (x - 1 + w) % w, xr = (x + 1) % w;
        // a soft Sobel filter on brightness: darker = lower
        const dx = (H[yu * w + xr] + 2 * H[y * w + xr] + H[yd * w + xr]) - (H[yu * w + xl] + 2 * H[y * w + xl] + H[yd * w + xl]);
        const dy = (H[yd * w + xl] + 2 * H[yd * w + x] + H[yd * w + xr]) - (H[yu * w + xl] + 2 * H[yu * w + x] + H[yu * w + xr]);
        let nx = -dx * str, ny = dy * str, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        const o = (y * w + x) * 4; d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
    const nt = new T.CanvasTexture(c);
    nt.wrapS = tex.wrapS; nt.wrapT = tex.wrapT; nt.repeat.copy(tex.repeat); nt.offset.copy(tex.offset); nt.rotation = tex.rotation; nt.center.copy(tex.center);
    nt.anisotropy = tex.anisotropy; nt.flipY = tex.flipY; nt.generateMipmaps = true;
    made.set(tex, nt); return nt;
  }
})();
