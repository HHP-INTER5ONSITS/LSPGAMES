/* Admin console: only shows for the admin account (the server decides who that is).
 *   sudo money [n]     add game cash (LSP Drive / LSP Life), default 10,000
 *   sudo points [n]    add points to your account, default 10,000
 *   sudo ban <name>    ban a player (sudo unban <name> to undo)
 *   sudo fly           fly in LSP Drive (Space/Q up, X/Z down, through walls)
 *   sudo killbots      defeat every bot in the game you are playing
 *   sudo help          list the commands
 * In LSP Drive you can also type them in the chat box.
 */
(function () {
  'use strict';
  const isAdmin = () => { try { return !!(profile && profile.admin); } catch (e) { return false; } };
  const num = (v, d) => { const n = Math.floor(Number(String(v || '').replace(/[,$]/g, ''))); return n > 0 ? n : d; };
  const HELP = 'sudo money [n] · sudo points [n] · sudo ban <player> · sudo unban <player> · sudo fly · sudo killbots';

  async function run(line) {
    if (!isAdmin()) return 'Only the admin account can use sudo.';
    const [w0, cmd, ...rest] = String(line).trim().split(/\s+/);
    if ((w0 || '').toLowerCase() !== 'sudo') return 'Commands start with sudo. ' + HELP;
    const c = (cmd || 'help').toLowerCase(), arg = rest.join(' ');
    if (c === 'help') return HELP;
    if (c === 'money' || c === 'cash') {
      const n = num(arg, 10000), rp = window.LSPDriveRP;
      if (rp && rp.ready && rp._S && rp._S()) rp.addCash(n);
      else { const db = LSPG.store('life', { cash: 250 }), s = db.load(); s.cash = (s.cash || 0) + n; db.save(s); }
      return `💵 Added $${n.toLocaleString()} game cash.`;
    }
    if (c === 'points' || c === 'getpoints') {
      const r = await api('/api/admin/points', { amount: num(arg, 10000) });
      Wallet.sync(r.points); return `⭐ Added ${r.added.toLocaleString()} points. You have ${r.points.toLocaleString()}.`;
    }
    if (c === 'ban' || c === 'unban' || c === 'run') {
      const name = arg.replace(/^@/, '').trim(); if (!name) return `Who? Try: sudo ${c === 'unban' ? 'unban' : 'ban'} PlayerName`;
      const r = await api('/api/admin/ban', { username: name, ban: c !== 'unban' });
      return r.banned ? `🔨 ${r.username} is banned.` : `✅ ${r.username} is unbanned.`;
    }
    if (c === 'fly') { window.LSPG_FLY = !window.LSPG_FLY; return window.LSPG_FLY ? '🕊️ Fly ON. In LSP Drive get out of the car: Space or Q up, X or Z down. Walls don\'t stop you.' : '🕊️ Fly OFF.'; }
    if (c === 'killbots' || c === 'win' || c === 'defeat') {
      let n = 0;
      try { if (typeof M !== 'undefined' && M && M.bots) for (const b of M.bots) if (!b.dead) { killBot(b); n++; } } catch (e) {}
      try { if (window.LSPDrive && LSPDrive._wreckRivals) n += LSPDrive._wreckRivals(); } catch (e) {}
      return n ? `💥 Defeated ${n} bot${n === 1 ? '' : 's'}.` : 'No bots to defeat right now. Start a game first.';
    }
    return 'Unknown command. ' + HELP;
  }
  async function exec(line) { let msg; try { msg = await run(line); } catch (e) { msg = '⚠️ ' + (e.message || 'That failed.'); } toast(msg, 4000); return msg; }
  window.LSPAdmin = { run: exec, isAdmin };

  // floating console
  const css = document.createElement('style');
  css.textContent = '#adm-btn{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9000;background:#16203d;color:#ffb31a;border:2px solid #ffb31a;border-radius:12px;padding:6px 10px;font:700 13px ui-monospace,monospace;cursor:pointer}#adm-box{position:fixed;right:12px;bottom:calc(56px + env(safe-area-inset-bottom,0px));z-index:9001;width:min(420px,calc(100vw - 24px));background:#0d1426;border:2px solid #ffb31a;border-radius:12px;padding:10px;color:#e7ecf7;font:13px ui-monospace,monospace;box-shadow:0 10px 40px #0008}#adm-box input{width:100%;box-sizing:border-box;background:#16203d;color:#fff;border:1px solid #36456e;border-radius:8px;padding:8px;font:inherit}#adm-log{max-height:150px;overflow:auto;margin-bottom:8px;white-space:pre-wrap}#adm-log div{padding:2px 0;border-bottom:1px dashed #22305a}';
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'adm-btn'; btn.textContent = '>_ sudo'; btn.hidden = true; btn.title = 'Admin console';
  const box = document.createElement('div'); box.id = 'adm-box'; box.hidden = true;
  box.innerHTML = '<div id="adm-log"><div>Admin console. Type sudo help.</div></div><form id="adm-f"><input id="adm-in" autocomplete="off" spellcheck="false" placeholder="sudo money 5000"></form>';
  document.body.append(btn, box);
  const inp = box.querySelector('#adm-in'), log = box.querySelector('#adm-log');
  btn.onclick = () => { box.hidden = !box.hidden; if (!box.hidden) inp.focus(); };
  box.querySelector('#adm-f').onsubmit = async (e) => {
    e.preventDefault(); const t = inp.value.trim(); if (!t) return; inp.value = '';
    const line = /^sudo\b/i.test(t) ? t : 'sudo ' + t;
    const add = (s) => { const d = document.createElement('div'); d.textContent = s; log.appendChild(d); log.scrollTop = 1e9; };
    add('> ' + line); add(await exec(line));
  };
  // keys typed in the console must not drive the car
  ['keydown', 'keyup'].forEach((ev) => box.addEventListener(ev, (e) => e.stopPropagation()));
  setInterval(() => { const a = isAdmin(); btn.hidden = !a; if (!a) { box.hidden = true; window.LSPG_FLY = false; } }, 1000);
})();
