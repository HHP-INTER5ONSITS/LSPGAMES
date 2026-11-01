/* LSPGames friends: find players by username, friend requests, who is online,
 * invites, and a live connection (WebSocket) that games use to play together.
 *
 *   Social.on('state', fn)   game data from others in your room
 *   Social.join(room) / Social.leave() / Social.state(d) / Social.chat(text) / Social.presence(game)
 *   Social.me()              your username (or null)
 *   Social.openGame(game, room)  open a game in multiplayer (used by invites and Join)
 */
(function () {
  'use strict';
  const L = LSPG;
  const css = `
  .fr-btn{position:relative}
  .fr-badge{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:#ff4d5e;color:#fff;font:800 12px Nunito,system-ui,sans-serif;display:grid;place-items:center;padding:0 5px;border:2px solid #fff}
  .fr-badge[hidden]{display:none}
  .fr-search{display:flex;gap:10px;margin-top:16px}
  .fr-search input{flex:1;height:50px;border:2px solid var(--line);border-radius:14px;padding:0 16px;font:700 17px Nunito,system-ui,sans-serif}
  .fr-search input:focus{border-color:var(--brand);outline:none}
  .fr-list{display:grid;gap:10px;margin-top:12px}
  .fr-row{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid var(--line);border-radius:16px;padding:10px 12px;flex-wrap:wrap}
  .fr-av{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;color:#fff;font:700 20px Fredoka,system-ui,sans-serif;flex:none;position:relative}
  .fr-dot{position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:50%;border:3px solid #fff;background:#b9c0d0}
  .fr-dot.on{background:#14c79a}
  .fr-info{flex:1;min-width:120px}.fr-info b{font-family:Fredoka,system-ui,sans-serif;font-size:17px;font-weight:600}
  .fr-info p{font-size:13px;color:var(--muted);font-weight:700;margin:0}
  .fr-info p.play{color:#0b8f6e}
  .fr-acts{display:flex;gap:6px;flex-wrap:wrap}
  .fr-acts .btn{height:40px;font-size:14px;padding:0 14px}
  .fr-empty{color:var(--muted);font-weight:700;font-size:14px;margin-top:10px}
  .fr-pop{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;background:#fff;border:2px solid var(--line);border-radius:18px;padding:14px;width:min(340px,calc(100vw - 32px));box-shadow:0 10px 30px rgba(22,32,61,.2);display:grid;gap:10px;animation:frIn .25s}
  .fr-pop b{font-family:Fredoka,system-ui,sans-serif;font-size:17px}
  .fr-pop .row2{display:flex;gap:8px}.fr-pop .btn{flex:1;height:42px;font-size:15px}
  @keyframes frIn{from{transform:translateY(20px);opacity:0}}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const colorOf = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h},62%,52%)`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- screen ---------- */
  document.body.insertAdjacentHTML('beforeend', `
  <section class="screen" id="s-friends" style="overflow:auto">
    <header class="topbar"><div class="topbar-in">
      <button class="iconbtn" id="fr-back" aria-label="Back to games">‹</button>
      <h2 style="font-size:20px">Friends</h2><div class="spacer"></div>
      <span class="pill" id="fr-me"></span>
    </div></header>
    <main class="wrap" style="max-width:720px">
      <div id="fr-pick"></div>
      <div id="fr-main">
        <form class="fr-search" id="fr-form" autocomplete="off"><input id="fr-q" placeholder="Type a friend's username" maxlength="20" autocapitalize="off" spellcheck="false"><button class="btn primary" type="submit">Search</button></form>
        <div class="fr-list" id="fr-results"></div>
        <h2 class="section-title" id="fr-req-h" hidden>Friend requests</h2><div class="fr-list" id="fr-req"></div>
        <h2 class="section-title">Your friends</h2><div class="fr-list" id="fr-list"><p class="fr-empty">Loading…</p></div>
        <h2 class="section-title" id="fr-out-h" hidden>Requests you sent</h2><div class="fr-list" id="fr-out"></div>
      </div>
    </main>
  </section>`);
  $('#fr-back').onclick = () => enterHub();
  // Friends button in the hub's top bar
  (function addButton() {
    const bar = $('#s-hub .topbar-in'); if (!bar) return;
    const b = document.createElement('button'); b.className = 'iconbtn fr-btn'; b.id = 'fr-open'; b.setAttribute('aria-label', 'Friends'); b.title = 'Friends';
    b.innerHTML = '👥<span class="fr-badge" id="fr-badge" hidden>0</span>';
    const av = bar.querySelector('.avatar'); bar.insertBefore(b, av || null); b.onclick = openFriends;
  })();

  let data = { friends: [], incoming: [], outgoing: [], username: null };
  function row(name, sub, acts, on, play) {
    return `<div class="fr-row"><div class="fr-av" style="background:${colorOf(name)}">${esc(name[0].toUpperCase())}${on != null ? `<span class="fr-dot${on ? ' on' : ''}"></span>` : ''}</div>
      <div class="fr-info"><b>${esc(name)}</b>${sub ? `<p class="${play ? 'play' : ''}">${esc(sub)}</p>` : ''}</div><div class="fr-acts">${acts}</div></div>`;
  }
  const btn = (label, act, name, cls = 'ghost', extra = '') => `<button class="btn ${cls}" data-fa="${act}" data-fn="${esc(name)}" ${extra}>${label}</button>`;
  function render() {
    $('#fr-me').textContent = data.username ? '@' + data.username : '';
    $('#fr-pick').innerHTML = data.username ? '' : `<div class="item" style="margin-top:18px"><div class="item-head"><div class="ico">🏷️</div><div><h3>Pick a username</h3><p>Friends find you by your username. Don't use your real name. You can't change it later.</p></div></div>
      <form id="fr-uform" class="fr-search" style="margin-top:4px"><input id="fr-uname" maxlength="20" placeholder="Username" autocapitalize="off" spellcheck="false"><button class="btn primary">Save</button></form><p class="err" id="fr-uerr"></p></div>`;
    $('#fr-main').hidden = !data.username;
    const uf = $('#fr-uform');
    if (uf) uf.onsubmit = async (e) => { e.preventDefault(); try { const r = await api('/api/username', { username: $('#fr-uname').value.trim() }); data.username = r.username; profile.username = r.username; store.set('lsp_profile', profile); toast('Your username is ' + r.username); reconnect(); load(); } catch (x) { $('#fr-uerr').textContent = x.message; } };
    $('#fr-req-h').hidden = !data.incoming.length;
    $('#fr-req').innerHTML = data.incoming.map((f) => row(f.username, 'Wants to be your friend', btn('Accept', 'accept', f.username, 'primary') + btn('Decline', 'decline', f.username))).join('');
    $('#fr-out-h').hidden = !data.outgoing.length;
    $('#fr-out').innerHTML = data.outgoing.map((f) => row(f.username, 'Waiting for them to accept', btn('Cancel', 'cancel', f.username))).join('');
    $('#fr-list').innerHTML = data.friends.length ? data.friends.map((f) => {
      const sub = f.online ? (f.gameName ? `Playing ${f.gameName}` : 'Online') : 'Offline';
      let acts = '';
      if (f.online && f.room && f.game === 'drive') acts += btn('Join', 'join', f.username, 'primary', `data-room="${esc(f.room)}"`);
      if (f.online) acts += btn('🚗 Drive together', 'inv-drive', f.username, f.room ? 'ghost' : 'primary') + btn('🔴 Four in a Row', 'inv-c4', f.username);
      acts += btn('✕', 'remove', f.username, 'ghost', 'title="Remove friend" aria-label="Remove friend"');
      return row(f.username, sub, acts, !!f.online, f.online && f.gameName);
    }).join('') : '<p class="fr-empty">No friends yet. Search for a friend\'s username above and send a request.</p>';
    const n = data.incoming.length, b = $('#fr-badge'); if (b) { b.hidden = !n; b.textContent = n; }
    bindActs(document.getElementById('s-friends'));
  }
  function bindActs(root) {
    root.querySelectorAll('[data-fa]').forEach((b) => (b.onclick = async () => {
      const a = b.dataset.fa, name = b.dataset.fn;
      if (a === 'join') return Social.openGame('drive', b.dataset.room);
      if (a === 'inv-drive') { Social.send({ t: 'invite', to: name, game: 'drive' }); toast(`Invited ${name}. Opening LSP Drive…`); return Social.openGame('drive', null); }
      if (a === 'inv-c4') { Social.send({ t: 'invite', to: name, game: 'c4' }); return Social.openGame('c4', 'c4:' + (data.username || '').toLowerCase(), name); }
      if (a === 'remove' && !confirmRemove(name)) return;
      b.disabled = true;
      try { await api('/api/friends/' + (a === 'add' ? 'request' : a), { username: name }); if (a === 'add') toast('Friend request sent to ' + name); if (a === 'accept') { toast(`You and ${name} are friends now!`); LSPG.sfx && LSPG.sfx('ding'); } await load(); search(); }
      catch (x) { toast(x.message); b.disabled = false; }
    }));
  }
  let removeAsk = null;
  function confirmRemove(name) { if (removeAsk === name) { removeAsk = null; return true; } removeAsk = name; toast(`Press ✕ again to remove ${name}`); setTimeout(() => (removeAsk = null), 3000); return false; }
  async function load() {
    try { data = await api('/api/friends'); if (data.username && profile && !profile.username) { profile.username = data.username; store.set('lsp_profile', profile); } render(); } catch (e) { /* signed out */ }
  }
  let sT = 0;
  async function search() {
    const q = $('#fr-q').value.trim(), box = $('#fr-results');
    if (q.length < 2) { box.innerHTML = ''; return; }
    try {
      const r = await api('/api/users/search?q=' + encodeURIComponent(q));
      box.innerHTML = r.users.length ? r.users.map((u) => {
        const acts = u.rel === 'you' ? '<span class="pill">You</span>' : u.rel === 'friend' ? '<span class="pill">✓ Friends</span>' : u.rel === 'incoming' ? btn('Accept', 'accept', u.username, 'primary') : u.rel === 'outgoing' ? '<span class="pill">Request sent</span>' : btn('Add friend', 'add', u.username, 'primary');
        return row(u.username, '', acts, u.online);
      }).join('') : `<p class="fr-empty">No player called "${esc(q)}". Check the spelling.</p>`;
      bindActs(box);
    } catch (e) { box.innerHTML = `<p class="fr-empty">${esc(e.message)}</p>`; }
  }
  $('#fr-q').addEventListener('input', () => { clearTimeout(sT); sT = setTimeout(search, 300); });
  $('#fr-form').onsubmit = (e) => { e.preventDefault(); search(); };
  function openFriends() { show('s-friends'); render(); load(); setTimeout(() => { const i = data.username ? $('#fr-q') : $('#fr-uname'); if (i) i.focus(); }, 50); }

  /* ---------- popups ---------- */
  let popEl = null, popT = 0;
  function popup(html, acts, ms = 15000) {
    if (popEl) popEl.remove(); clearTimeout(popT);
    popEl = document.createElement('div'); popEl.className = 'fr-pop'; popEl.setAttribute('role', 'alert'); popEl.innerHTML = html; document.body.appendChild(popEl);
    popEl.querySelectorAll('[data-pa]').forEach((b) => (b.onclick = () => { const f = acts[b.dataset.pa]; if (popEl) popEl.remove(); popEl = null; if (f) f(); }));
    popT = setTimeout(() => { if (popEl) popEl.remove(); popEl = null; }, ms);
  }

  /* ---------- live connection ---------- */
  const handlers = {};
  let ws = null, wantOpen = false, retry = 0, room = null, game = null, authed = false, myName = null, queue = [];
  const Social = window.Social = {
    on(t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
    off(t, fn) { handlers[t] = (handlers[t] || []).filter((f) => f !== fn); },
    send(m) { if (ws && ws.readyState === 1 && authed) ws.send(JSON.stringify(m)); else if (m.t !== 'state') queue.push(m); },
    me: () => myName || (profile && profile.username) || null,
    room: () => room,
    presence(g) { game = g || null; Social.send({ t: 'presence', game }); },
    join(r) { room = r; Social.send({ t: 'join', room: r }); },
    leave() { room = null; Social.send({ t: 'leave' }); },
    state(d) { if (room) Social.send({ t: 'state', d }); },
    chat(text) { if (room) Social.send({ t: 'chat', text }); },
    start() { wantOpen = true; if (!ws) connect(); load(); },
    stop() { wantOpen = false; authed = false; room = null; if (ws) ws.close(); ws = null; },
    openGame(g, r, friend) {
      if (!Social.me()) { openFriends(); toast('Pick a username first'); return; }
      if (g === 'drive' && window.LSPDrive) window.LSPDrive.playWith(r);
      else if (g === 'c4' && window.C4Online) window.C4Online.start(r, friend);
    },
  };
  function emit(t, m) { for (const f of handlers[t] || []) try { f(m); } catch (e) { console.error(e); } }
  function connect() {
    const tok = store.get('lsp_token'); if (!tok || !wantOpen) return;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { return; }
    ws.onopen = () => { retry = 0; ws.send(JSON.stringify({ t: 'auth', token: tok })); };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.t === 'auth') { authed = !!m.ok; myName = m.username; if (authed) { if (game) ws.send(JSON.stringify({ t: 'presence', game })); if (room) ws.send(JSON.stringify({ t: 'join', room })); const q = queue; queue = []; q.forEach((x) => Social.send(x)); } return; }
      if (m.t === 'friends') { load(); }
      else if (m.t === 'friendreq') { load(); LSPG.sfx && LSPG.sfx('pop'); popup(`<b>👋 ${esc(m.from)}</b><span>wants to be your friend.</span><div class="row2"><button class="btn primary" data-pa="yes">Accept</button><button class="btn ghost" data-pa="see">See requests</button></div>`, { yes: async () => { try { await api('/api/friends/accept', { username: m.from }); toast(`You and ${m.from} are friends now!`); load(); } catch (e) { toast(e.message); } }, see: openFriends }); }
      else if (m.t === 'friendyes') { load(); toast(`🎉 ${m.from} accepted your friend request!`); }
      else if (m.t === 'invite') {
        LSPG.sfx && LSPG.sfx('ding');
        popup(`<b>🎮 ${esc(m.from)}</b><span>invited you to play <b>${esc(m.gameName)}</b> together.</span><div class="row2"><button class="btn primary" data-pa="go">Join</button><button class="btn ghost" data-pa="no">Not now</button></div>`, { go: () => Social.openGame(m.game, m.room, m.from) }, 30000);
      }
      emit(m.t, m);
    };
    ws.onclose = () => { ws = null; authed = false; if (wantOpen) setTimeout(connect, Math.min(15000, 1000 * 2 ** retry++)); };
    ws.onerror = () => {};
  }
  function reconnect() { if (ws) ws.close(); else connect(); }
  // start once signed in (the hub calls LSPG.runHub after login)
  LSPG.onHub(() => { if (!wantOpen) Social.start(); else load(); });
  const lo = $('#logout'); if (lo) lo.addEventListener('click', () => Social.stop(), true);
})();
