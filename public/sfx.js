/* LSPGames sound effects, synthesised with Web Audio (no audio files to download).
 *
 *   LSPG.sfx('coin')                 one-shot effect
 *   LSPG.sfx('hit', { volume: .5 })  quieter
 *   LSPG.engine()                    a looping engine whose pitch follows .set(rpm 0..1, load 0..1)
 *   LSPG.muted() / LSPG.setMuted(b)  remembered per browser
 *
 * Browsers only allow sound after the player interacts with the page, so the
 * audio context is created lazily on the first effect after a tap or key press.
 */
(function () {
  'use strict';
  if (!window.LSPG) window.LSPG = {};
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('lsp_muted') === '1'; } catch (_) {}

  function ac() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    // A gentle limiter so stacked effects never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  // Unlock audio on the first interaction anywhere.
  const unlock = () => { ac(); };
  addEventListener('pointerdown', unlock, { once: false, passive: true });
  addEventListener('keydown', unlock, { passive: true });

  function env(g, t, a, peak, d, end = 0.0001) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
  }
  function tone(type, f0, f1, dur, vol, t0 = 0, attack = 0.005) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + t0;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, attack, vol, dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function noise(dur, vol, filterType, f0, f1, t0 = 0, q = 0.8) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); env(g, t, 0.004, vol, dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const FX = {
    click: (v) => tone('triangle', 900, 700, 0.05, 0.25 * v),
    coin: (v) => { tone('square', 988, 988, 0.07, 0.18 * v); tone('square', 1319, 1319, 0.22, 0.18 * v, 0.07); },
    ding: (v) => { tone('sine', 1568, 1568, 0.5, 0.3 * v); tone('sine', 2093, 2093, 0.4, 0.12 * v, 0.02); },
    pop: (v) => tone('sine', 300, 900, 0.08, 0.35 * v),
    jump: (v) => tone('square', 260, 620, 0.16, 0.18 * v),
    land: (v) => noise(0.08, 0.35 * v, 'lowpass', 600, 200),
    shoot: (v) => { noise(0.12, 0.55 * v, 'bandpass', 2400, 500, 0, 0.7); tone('square', 180, 60, 0.09, 0.25 * v); },
    rifle: (v) => { noise(0.07, 0.5 * v, 'bandpass', 3200, 900, 0, 0.9); tone('sawtooth', 220, 80, 0.06, 0.2 * v); },
    shotgun: (v) => { noise(0.3, 0.8 * v, 'lowpass', 2600, 300); tone('sine', 90, 40, 0.25, 0.5 * v); },
    laser: (v) => tone('sawtooth', 1800, 200, 0.18, 0.18 * v),
    hit: (v) => { noise(0.1, 0.5 * v, 'bandpass', 900, 400, 0, 1.2); tone('sine', 160, 70, 0.1, 0.35 * v); },
    hurt: (v) => { tone('sawtooth', 220, 110, 0.22, 0.25 * v); noise(0.15, 0.25 * v, 'lowpass', 900, 300); },
    explode: (v) => { noise(0.9, 0.9 * v, 'lowpass', 1800, 80); tone('sine', 120, 30, 0.7, 0.6 * v); },
    crash: (v) => { noise(0.45, 0.85 * v, 'lowpass', 3000, 200); noise(0.25, 0.5 * v, 'highpass', 3000, 6000, 0.02); tone('square', 110, 50, 0.2, 0.3 * v); },
    skid: (v) => noise(0.35, 0.22 * v, 'bandpass', 1400, 1100, 0, 4),
    horn: (v) => { tone('square', 415, 415, 0.32, 0.16 * v, 0, 0.02); tone('square', 494, 494, 0.32, 0.14 * v, 0, 0.02); },
    whoosh: (v) => noise(0.4, 0.45 * v, 'bandpass', 400, 2400, 0, 1.5),
    nitro: (v) => { noise(0.7, 0.5 * v, 'bandpass', 600, 3000, 0, 1.2); tone('sawtooth', 120, 260, 0.6, 0.12 * v); },
    splash: (v) => { noise(0.45, 0.5 * v, 'bandpass', 1500, 400, 0, 0.8); tone('sine', 500, 180, 0.2, 0.15 * v); },
    reel: (v) => noise(0.05, 0.2 * v, 'highpass', 4000, 4000),
    bounce: (v) => tone('sine', 140, 70, 0.14, 0.5 * v),
    swish: (v) => noise(0.3, 0.35 * v, 'highpass', 1800, 5000, 0, 0.6),
    place: (v) => { tone('triangle', 520, 520, 0.06, 0.25 * v); noise(0.05, 0.2 * v, 'lowpass', 1200, 600); },
    line: (v) => { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.09, 0.14 * v, i * 0.06)); },
    drop: (v) => { tone('sine', 300, 120, 0.14, 0.4 * v); noise(0.06, 0.25 * v, 'lowpass', 800, 300); },
    eat: (v) => tone('triangle', 600, 1200, 0.06, 0.2 * v),
    cash: (v) => { tone('square', 1319, 1319, 0.05, 0.14 * v); tone('square', 1760, 1760, 0.12, 0.14 * v, 0.05); noise(0.08, 0.15 * v, 'highpass', 6000, 6000, 0.03); },
    win: (v) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, i === 4 ? 0.5 : 0.12, 0.22 * v, i * 0.1)); },
    lose: (v) => { [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.98, i === 3 ? 0.6 : 0.18, 0.2 * v, i * 0.17)); },
    beep: (v) => tone('square', 660, 660, 0.12, 0.18 * v),
    go: (v) => tone('square', 1320, 1320, 0.35, 0.2 * v),
    door: (v) => { noise(0.08, 0.4 * v, 'lowpass', 900, 300); tone('sine', 180, 120, 0.08, 0.3 * v, 0.03); },
    siren: (v) => { for (let i = 0; i < 4; i++) tone('sine', i % 2 ? 960 : 720, i % 2 ? 720 : 960, 0.3, 0.12 * v, i * 0.3); },
    zap: (v) => { tone('sawtooth', 2400, 600, 0.12, 0.15 * v); noise(0.1, 0.2 * v, 'highpass', 5000, 5000); },
    freeze: (v) => { tone('sine', 2200, 1600, 0.25, 0.12 * v); noise(0.2, 0.1 * v, 'highpass', 7000, 7000); }
  };

  LSPG.sfx = function (name, opts) {
    if (muted) return;
    const f = FX[name]; if (!f) return;
    if (!ac()) return;
    try { f((opts && opts.volume != null) ? opts.volume : 1); } catch (_) {}
  };

  /** A looping engine sound. set(rpm 0..1, load 0..1); stop() when done. */
  LSPG.engine = function (kind = 'car') {
    const c = ac(); if (!c) return { set() {}, stop() {} };
    const base = kind === 'bike' ? 70 : kind === 'big' ? 38 : 50;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.Q.value = 2;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g).connect(master);
    o1.start(); o2.start();
    let stopped = false;
    return {
      set(rpm, load = 0.5) {
        if (stopped) return;
        const t = c.currentTime, fr = base * (1 + rpm * 4.2);
        o1.frequency.setTargetAtTime(fr, t, 0.05);
        o2.frequency.setTargetAtTime(fr * 0.5 * (1 + 0.01 * Math.sin(t * 7)), t, 0.05);
        f.frequency.setTargetAtTime(300 + rpm * 1600 + load * 900, t, 0.06);
        g.gain.setTargetAtTime(muted ? 0 : 0.035 + load * 0.05 + rpm * 0.03, t, 0.08);
      },
      stop() {
        if (stopped) return; stopped = true;
        const t = c.currentTime; g.gain.setTargetAtTime(0, t, 0.05);
        o1.stop(t + 0.3); o2.stop(t + 0.3);
      }
    };
  };

  // A soft click for menu buttons everywhere.
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.btn, .tab, .gcard.play, .lvl, .featured, .iconbtn');
    if (b && !b.disabled) LSPG.sfx('click', { volume: 0.45 });
  }, true);

  LSPG.muted = () => muted;
  LSPG.setMuted = (m) => {
    muted = !!m;
    try { localStorage.setItem('lsp_muted', muted ? '1' : '0'); } catch (_) {}
    if (master) master.gain.value = muted ? 0 : 0.55;
  };
  LSPG.sfxNames = Object.keys(FX);
})();
