'use strict';
/*
 * Friends, presence and play-together for LSPGames.
 *
 * Friends are stored on each user as lists of account ids:
 *   friends: [...], reqIn: [...] (they asked me), reqOut: [...] (I asked them)
 * Players only ever see usernames, never emails.
 *
 * A WebSocket at /ws carries live things: who is online and what they play,
 * friend-request pings, game invites, chat, and game state inside a room.
 * A room belongs to a host ("drive:alex", "c4:alex"); only the host and the
 * host's friends may join it.
 */
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const MAX_FRIENDS = 200, MAX_PENDING = 50;
const GAMES = { drive: 'LSP Drive', c4: 'Four in a Row' };

// A light chat filter for a game with kids on it: no links, emails or phone numbers, and mask rude words.
const RUDE = ['fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy', 'cunt', 'slut', 'whore', 'nigger', 'faggot', 'retard', 'madarchod', 'bhenchod', 'chutiya', 'gandu', 'randi'];
// LSP rules: no online dating, nothing sexual. These messages are blocked completely.
const NOT_ALLOWED = ['date me', 'dating', 'e-date', 'edate', 'online date', 'be my gf', 'be my bf', 'be my girlfriend', 'be my boyfriend', 'my girlfriend', 'my boyfriend', 'girlfriend', 'boyfriend', 'wanna date', 'go out with me', 'marry me', 'kiss me', 'kiss you', 'love you', 'i love u', 'ily', 'luv u', 'cuddle', 'hook up', 'hookup', 'sex', 'sexy', 'seggs', 'nude', 'nudes', 'naked', 'horny', 'boobs', 'porn', 'send pics', 'send pic', 'onlyfans', 'strip', 'bae', 'babe', 'hot girl', 'hot boy', 'snap me', 'add me on snap', 'rizz', 'smash', 'thirsty', 'baby girl', 'daddy'];
function blockedChat(t) { const s = ' ' + String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ') + ' '; return NOT_ALLOWED.some((w) => s.includes(' ' + w + ' ') || (w.length > 4 && s.includes(w))); }
function cleanChat(t) {
  let s = String(t || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
  if (!s) return '';
  s = s.replace(/(https?:\/\/|www\.)\S+/gi, '###').replace(/\S+@\S+\.\S+/g, '###').replace(/(\d[\s-]?){6,}/g, '###');
  for (const w of RUDE) s = s.replace(new RegExp(w.split('').join('[^a-z]?'), 'gi'), (m) => '#'.repeat(m.length));
  return s;
}

module.exports = function friends(app, { getDb, auth, allow, ipLog, nameProblem, idOfName }) {
  const online = new Map(); // account id -> { socks:Set, game, room, uname, username }
  const rooms = new Map();  // room id -> Set of account ids

  async function me(req) {
    const db = getDb(), u = await db.getUser(req.session.email);
    if (u && u.username && !u.uname) { u.uname = u.username.toLowerCase(); await db.setUserFields(u.email, { uname: u.uname }); }
    return u;
  }
  const pub = (u) => (u ? u.username : null);
  async function byName(name) {
    const db = getDb(), n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    return (await db.findByUname(n)) || (await db.getUser(idOfName(n)));
  }
  function send(id, msg) { const o = online.get(id); if (o) for (const ws of o.socks) try { ws.send(JSON.stringify(msg)); } catch (_) {} }
  const status = (id) => { const o = online.get(id); return o ? { online: true, game: o.game || null, gameName: GAMES[o.game] || null, room: o.room || null } : { online: false }; };

  /* ---------- usernames for everyone ---------- */
  app.post('/api/username', auth, async (req, res) => {
    const db = getDb(), u = await me(req), name = String(req.body.username || '').trim();
    if (!u) return res.status(401).json({ error: 'Please sign in again.' });
    if (u.username) return res.status(400).json({ error: 'You already have a username.' });
    const p = nameProblem(name); if (p) return res.status(400).json({ error: p });
    if (!allow(ipLog, 'uname:' + req.ip, 20, 3600 * 1000)) return res.status(429).json({ error: 'Too many tries. Try again later.' });
    if (await byName(name)) return res.status(409).json({ error: 'That username is taken. Try another one.' });
    try { await db.setUserFields(u.email, { username: name, uname: name.toLowerCase() }); }
    catch (e) { return res.status(409).json({ error: 'That username is taken. Try another one.' }); }
    res.json({ username: name });
  });

  /* ---------- friends ---------- */
  app.get('/api/friends', auth, async (req, res) => {
    const db = getDb(), u = await me(req); if (!u) return res.status(401).json({ error: 'Please sign in again.' });
    const load = async (ids) => (await Promise.all((ids || []).map((id) => db.getUser(id)))).filter((x) => x && x.username);
    const [fr, inc, out] = await Promise.all([load(u.friends), load(u.reqIn), load(u.reqOut)]);
    res.json({
      username: u.username || null,
      friends: fr.map((f) => ({ username: f.username, ...status(f.email) })).sort((a, b) => (b.online - a.online) || a.username.localeCompare(b.username)),
      incoming: inc.map((f) => ({ username: f.username })), outgoing: out.map((f) => ({ username: f.username })),
    });
  });
  app.get('/api/users/search', auth, async (req, res) => {
    if (!allow(ipLog, 'search:' + req.session.email, 60, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
    const db = getDb(), u = await me(req), q = String(req.query.q || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (q.length < 2) return res.json({ users: [] });
    const hits = (await db.searchUnames(q, 12)).filter((x) => x.username);
    const exact = await byName(q); if (exact && exact.username && !hits.some((h) => h.email === exact.email)) hits.unshift(exact);
    res.json({ users: hits.slice(0, 12).map((x) => ({
      username: x.username,
      rel: x.email === u.email ? 'you' : (u.friends || []).includes(x.email) ? 'friend' : (u.reqIn || []).includes(x.email) ? 'incoming' : (u.reqOut || []).includes(x.email) ? 'outgoing' : 'none',
      online: (u.friends || []).includes(x.email) ? status(x.email).online : undefined,
    })) });
  });
  async function pair(req, res) {
    const u = await me(req); if (!u) { res.status(401).json({ error: 'Please sign in again.' }); return null; }
    if (!u.username) { res.status(400).json({ error: 'Pick a username first.' }); return null; }
    const t = await byName(req.body.username);
    if (!t || !t.username) { res.status(404).json({ error: 'No player has that username.' }); return null; }
    if (t.email === u.email) { res.status(400).json({ error: "That's you!" }); return null; }
    return [u, t];
  }
  const ping = (...ids) => ids.forEach((id) => send(id, { t: 'friends' }));
  app.post('/api/friends/request', auth, async (req, res) => {
    if (!allow(ipLog, 'freq:' + req.session.email, 30, 3600 * 1000)) return res.status(429).json({ error: 'Too many friend requests. Try again later.' });
    const p = await pair(req, res); if (!p) return; const [u, t] = p, db = getDb();
    if ((u.friends || []).includes(t.email)) return res.json({ ok: true, rel: 'friend' });
    if ((u.reqIn || []).includes(t.email)) return accept(u, t, res); // they already asked you: just be friends
    if ((u.friends || []).length >= MAX_FRIENDS) return res.status(400).json({ error: `You can have up to ${MAX_FRIENDS} friends.` });
    if ((u.reqOut || []).length >= MAX_PENDING || (t.reqIn || []).length >= MAX_PENDING) return res.status(400).json({ error: 'Too many requests are waiting. Try again later.' });
    await db.updateLists(u.email, { $addToSet: { reqOut: t.email } });
    await db.updateLists(t.email, { $addToSet: { reqIn: u.email } });
    send(t.email, { t: 'friendreq', from: u.username }); ping(u.email);
    res.json({ ok: true, rel: 'outgoing' });
  });
  async function accept(u, t, res) {
    const db = getDb();
    if (!(u.reqIn || []).includes(t.email)) return res.status(400).json({ error: 'That friend request is gone.' });
    await db.updateLists(u.email, { $pull: { reqIn: t.email } }); await db.updateLists(u.email, { $pull: { reqOut: t.email } }); await db.updateLists(u.email, { $addToSet: { friends: t.email } });
    await db.updateLists(t.email, { $pull: { reqOut: u.email } }); await db.updateLists(t.email, { $pull: { reqIn: u.email } }); await db.updateLists(t.email, { $addToSet: { friends: u.email } });
    send(t.email, { t: 'friendyes', from: u.username }); ping(u.email, t.email);
    res.json({ ok: true, rel: 'friend' });
  }
  app.post('/api/friends/accept', auth, async (req, res) => { const p = await pair(req, res); if (p) accept(p[0], p[1], res); });
  const drop = (field1, field2) => async (req, res) => {
    const p = await pair(req, res); if (!p) return; const [u, t] = p, db = getDb();
    await db.updateLists(u.email, { $pull: { [field1]: t.email } }); await db.updateLists(t.email, { $pull: { [field2]: u.email } });
    ping(u.email, t.email); res.json({ ok: true, rel: 'none' });
  };
  app.post('/api/friends/decline', auth, drop('reqIn', 'reqOut'));
  app.post('/api/friends/cancel', auth, drop('reqOut', 'reqIn'));
  app.post('/api/friends/remove', auth, drop('friends', 'friends'));

  /* ---------- live: presence, invites, rooms ---------- */
  function leaveRoom(id) {
    const o = online.get(id); if (!o || !o.room) return;
    const r = rooms.get(o.room); if (r) { r.delete(id); for (const m of r) send(m, { t: 'left', room: o.room, who: o.username }); if (!r.size) rooms.delete(o.room); }
    o.room = null;
  }
  function tellFriends(u) { for (const f of u.friends || []) if (online.has(f)) send(f, { t: 'friends' }); }

  function attach(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });
    wss.on('connection', (ws, req) => {
      let id = null, user = null, budget = 40, lastFill = Date.now();
      const kill = setTimeout(() => { if (!id) ws.close(); }, 10000);
      ws.on('message', async (raw) => {
        // simple token bucket: about 25 messages a second
        const now = Date.now(); budget = Math.min(40, budget + ((now - lastFill) / 1000) * 25); lastFill = now;
        if (budget < 1) return; budget--;
        let m; try { m = JSON.parse(raw); } catch (_) { return; }
        if (!id) {
          if (m.t !== 'auth') return;
          const db = getDb(), s = await db.getSession(String(m.token || ''));
          if (!s) { ws.send(JSON.stringify({ t: 'auth', ok: false })); return ws.close(); }
          user = await db.getUser(s.email); if (!user) return ws.close();
          if (user.banned) { ws.send(JSON.stringify({ t: 'auth', ok: false, banned: true })); return ws.close(); }
          id = s.email; clearTimeout(kill);
          let o = online.get(id); const wasOff = !o;
          if (!o) online.set(id, (o = { socks: new Set(), game: null, room: null }));
          o.socks.add(ws); o.username = user.username || null;
          ws.send(JSON.stringify({ t: 'auth', ok: true, username: user.username || null }));
          if (wasOff) tellFriends(user);
          return;
        }
        const o = online.get(id); if (!o) return;
        if (m.t === 'presence') {
          o.game = GAMES[m.game] ? m.game : null; if (!o.game) leaveRoom(id);
          user = (await getDb().getUser(id)) || user; tellFriends(user);
        } else if (m.t === 'invite') {
          user = (await getDb().getUser(id)) || user;
          const t = await byName(m.to); if (!t || !(user.friends || []).includes(t.email) || !GAMES[m.game]) return;
          send(t.email, { t: 'invite', from: user.username, game: m.game, gameName: GAMES[m.game], room: `${m.game}:${(user.username || '').toLowerCase()}` });
        } else if (m.t === 'join') {
          // room "game:hostname": host may always join; others must be the host's friend
          const [game, host] = String(m.room || '').split(':'); if (!GAMES[game] || !host) return;
          user = (await getDb().getUser(id)) || user;
          const h = await byName(host); if (!h || !h.username) return;
          if (h.email !== id && !(h.friends || []).includes(id)) { ws.send(JSON.stringify({ t: 'joined', ok: false, error: 'You can only join friends.' })); return; }
          if (game === 'c4' && h.email !== id && (rooms.get(m.room) || new Set()).size >= 2 && !(rooms.get(m.room) || new Set()).has(id)) { ws.send(JSON.stringify({ t: 'joined', ok: false, error: 'That game is already full.' })); return; }
          leaveRoom(id); o.room = m.room; o.game = game;
          let r = rooms.get(m.room); if (!r) rooms.set(m.room, (r = new Set())); r.add(id);
          const members = [...r].map((x) => (online.get(x) || {}).username).filter(Boolean);
          ws.send(JSON.stringify({ t: 'joined', ok: true, room: m.room, host: h.username, members, seed: m.room === `${game}:${(user.username || '').toLowerCase()}` }));
          for (const x of r) if (x !== id) send(x, { t: 'hello', room: m.room, who: user.username });
          tellFriends(user);
        } else if (m.t === 'leave') { leaveRoom(id); tellFriends(user); }
        else if (m.t === 'state' || m.t === 'chat') {
          const r = o.room && rooms.get(o.room); if (!r) return;
          let out;
          if (m.t === 'chat') {
            if (o.mutedUntil && Date.now() < o.mutedUntil) return ws.send(JSON.stringify({ t: 'chatBlocked', why: `You are muted for breaking the rules. Try again in ${Math.ceil((o.mutedUntil - Date.now()) / 60000)} min.` }));
            if (blockedChat(m.text)) { o.strikes = (o.strikes || 0) + 1; if (o.strikes >= 3) { o.mutedUntil = Date.now() + 10 * 60000; o.strikes = 0; } return ws.send(JSON.stringify({ t: 'chatBlocked', why: o.mutedUntil > Date.now() ? 'Muted for 10 minutes: no dating or sexual talk in LSP Games.' : `Not sent. No dating, flirting or sexual talk is allowed in LSP Games. (Warning ${o.strikes}/3)` })); }
            const text = cleanChat(m.text); if (!text) return; out = { t: 'chat', who: o.username, text };
          }
          else out = { t: 'state', who: o.username, d: m.d };
          const s = JSON.stringify(out);
          for (const x of r) if (x !== id || m.t === 'chat') { const oo = online.get(x); if (oo) for (const w of oo.socks) try { w.send(s); } catch (_) {} }
        }
      });
      ws.on('close', () => {
        clearTimeout(kill); if (!id) return;
        const o = online.get(id); if (!o) return; o.socks.delete(ws);
        if (!o.socks.size) { leaveRoom(id); online.delete(id); if (user) tellFriends(user); }
      });
    });
    // keep idle connections alive through Render's proxy
    setInterval(() => { for (const ws of wss.clients) try { ws.ping(); } catch (_) {} }, 25000).unref();
  }
  // throw a banned player out of every open connection
  function kick(id) { const o = online.get(id); if (o) for (const w of o.socks) { try { w.send(JSON.stringify({ t: 'banned' })); w.close(); } catch {} } }
  return { attach, cleanChat, blockedChat, kick };
};
