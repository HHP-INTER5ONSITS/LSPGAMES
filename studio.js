'use strict';
/*
 * LSP Studio: players build their own 3D games, publish them, and earn points.
 *
 * A game is a list of parts (blocks, ramps, coins, cars, lava, finish line...) plus a few settings.
 * Players can make a game free or set a price in points. When someone buys it, the points go
 * straight from the buyer's wallet to the creator's wallet. A buyer owns the game for good.
 *
 * Players never see each other's emails: games only carry the creator's username.
 */
const crypto = require('crypto');

const MAX_GAMES = 25, MAX_PARTS = 2500, MAX_SIGNS = 60, MAX_PRICE = 10000;
const TYPES = new Set(['block', 'ramp', 'cyl', 'ball', 'wall', 'glass', 'spawn', 'check', 'finish', 'coin', 'lava', 'jump', 'speed', 'move', 'spin', 'bot', 'car', 'tree', 'lamp', 'house', 'water', 'gem', 'heal', 'cone']);
const SKIES = new Set(['day', 'sunset', 'night', 'space', 'storm']);
const GROUNDS = new Set(['grass', 'sand', 'snow', 'city', 'lava', 'none']);
const GOALS = new Set(['finish', 'coins', 'survive', 'race', 'free']);
const MATS = new Set(['plastic', 'wood', 'metal', 'brick', 'stone', 'neon', 'grass', 'concrete', 'ice']);

const num = (v, lo, hi, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 4) / 4)) : d; };

module.exports = function studio(app, { getDb, auth, allow, ipLog, cleanChat, blockedChat }) {
  const db = () => getDb();
  const ruleMsg = 'LSP rules: no dating, nothing sexual and no swearing. Change that text and try again.';

  function cleanText(t, max) {
    if (blockedChat(t)) throw new Error(ruleMsg);
    return cleanChat(String(t || '').slice(0, max)).slice(0, max);
  }

  // Checks a game sent from the editor and returns a safe copy.
  function cleanData(d) {
    if (!d || typeof d !== 'object') throw new Error('That game is empty.');
    const parts = Array.isArray(d.parts) ? d.parts : [];
    if (parts.length > MAX_PARTS) throw new Error(`Games can have up to ${MAX_PARTS} parts.`);
    const out = {
      v: 1,
      sky: SKIES.has(d.sky) ? d.sky : 'day',
      ground: GROUNDS.has(d.ground) ? d.ground : 'grass',
      goal: GOALS.has(d.goal) ? d.goal : 'finish',
      time: num(d.time, 0, 900, 0) | 0,
      lives: num(d.lives, 0, 99, 0) | 0,
      parts: [],
      signs: [],
    };
    for (const p of parts) {
      if (!Array.isArray(p) || !TYPES.has(p[0])) continue;
      out.parts.push([
        p[0],
        num(p[1], -250, 250), num(p[2], -20, 150), num(p[3], -250, 250),
        num(p[4], 0.25, 80, 1), num(p[5], 0.25, 80, 1), num(p[6], 0.25, 80, 1),
        /^#[0-9a-f]{6}$/i.test(p[7]) ? p[7].toLowerCase() : '#9aa4b8',
        (num(p[8], 0, 3) | 0),
        MATS.has(p[9]) ? p[9] : 'plastic',
      ]);
    }
    const signs = Array.isArray(d.signs) ? d.signs.slice(0, MAX_SIGNS) : [];
    for (const s of signs) {
      if (!Array.isArray(s)) continue;
      const text = cleanText(s[3], 60).trim(); if (!text) continue;
      out.signs.push([num(s[0], -250, 250), num(s[1], -20, 150), num(s[2], -250, 250), text, num(s[4], 0, 3) | 0]);
    }
    return out;
  }

  // What everyone may see about a game (never the creator's email).
  const pub = (g, me) => ({
    id: g.id, title: g.title, desc: g.desc, emoji: g.emoji, color: g.color, price: g.price || 0,
    by: g.ownerName || 'player', plays: g.plays || 0, likes: g.likes || 0, goal: g.goal, parts: g.partCount || 0,
    published: !!g.published, updatedAt: g.updatedAt,
    ...(me && g.owner === me ? { mine: true, sales: g.sales || 0, earned: g.earned || 0 } : {}),
  });
  const canPlay = (g, u) => !!u && (!g.price || g.owner === u.email || u.admin || (u.ownedGames || []).includes(g.id));

  app.get('/api/studio/games', auth, async (req, res) => {
    const list = await db().listGames(80);
    const u = req.user || {};
    res.json(list.map((g) => ({ ...pub(g, u.email), owned: canPlay(g, u), liked: (u.likedGames || []).includes(g.id) })));
  });

  app.get('/api/studio/mine', auth, async (req, res) => {
    const list = await db().listGamesBy(req.session.email);
    res.json(list.map((g) => pub(g, req.session.email)));
  });

  app.get('/api/studio/game/:id', auth, async (req, res) => {
    const g = await db().getGame(String(req.params.id));
    const u = req.user;
    if (!g || (g.removed && !(u && u.admin)) || (!g.published && g.owner !== req.session.email && !(u && u.admin))) return res.status(404).json({ error: 'That game is not available.' });
    const ok = canPlay(g, u);
    res.json({ game: { ...pub(g, req.session.email), owned: ok, liked: ((u && u.likedGames) || []).includes(g.id) }, data: ok ? g.data : null });
  });

  app.post('/api/studio/save', auth, async (req, res) => {
    try {
      if (!allow(ipLog, 'studio:' + req.session.email, 40, 60 * 1000)) return res.status(429).json({ error: 'Saving too fast. Wait a moment.' });
      const me = req.session.email, b = req.body || {};
      let g = b.id ? await db().getGame(String(b.id)) : null;
      if (g && g.owner !== me) return res.status(403).json({ error: "That isn't your game." });
      if (!g && (await db().countGamesBy(me)) >= MAX_GAMES) return res.status(400).json({ error: `You can have up to ${MAX_GAMES} games. Delete one to make room.` });
      const title = cleanText(b.title, 40).trim();
      if (title.length < 3) return res.status(400).json({ error: 'Give your game a name (at least 3 letters).' });
      const data = cleanData(b.data);
      const publish = !!b.publish;
      if (publish) {
        if (!data.parts.some((p) => p[0] === 'spawn')) return res.status(400).json({ error: 'Add a 🟢 Spawn so players know where to start.' });
        if (data.goal === 'finish' && !data.parts.some((p) => p[0] === 'finish')) return res.status(400).json({ error: 'Your goal is "Reach the finish" — add a 🏁 Finish part, or pick another goal.' });
        if (data.goal === 'coins' && !data.parts.some((p) => p[0] === 'coin')) return res.status(400).json({ error: 'Your goal is "Collect all coins" — add some 🪙 coins.' });
        if (data.goal === 'race' && !data.parts.some((p) => p[0] === 'car')) return res.status(400).json({ error: 'Race games need a 🚗 car for the player.' });
        if (data.goal === 'survive' && !data.time) return res.status(400).json({ error: 'Survive games need a time limit (Settings).' });
      }
      const now = new Date().toISOString();
      const fields = {
        title,
        desc: cleanText(b.desc, 200).trim(),
        emoji: String(b.emoji || '🎮').slice(0, 4),
        color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#2f6bff',
        price: Math.max(0, Math.min(MAX_PRICE, Math.floor(Number(b.price) || 0))),
        published: publish || (g ? !!g.published && b.publish !== false : false),
        goal: data.goal, partCount: data.parts.length,
        data, updatedAt: now, ownerName: (req.user && req.user.username) || 'player',
      };
      if (!g) g = { id: crypto.randomBytes(5).toString('hex'), owner: me, createdAt: now, plays: 0, likes: 0, sales: 0, earned: 0 };
      Object.assign(g, fields);
      await db().saveGame(g);
      res.json({ ok: true, game: pub(g, me) });
    } catch (e) { res.status(400).json({ error: e.message || 'Could not save.' }); }
  });

  app.post('/api/studio/delete/:id', auth, async (req, res) => {
    const g = await db().getGame(String(req.params.id));
    if (!g) return res.json({ ok: true });
    if (g.owner !== req.session.email) return res.status(403).json({ error: "That isn't your game." });
    await db().deleteGame(g.id); res.json({ ok: true });
  });

  // Buying: points move from the buyer straight to the creator.
  app.post('/api/studio/buy/:id', auth, async (req, res) => {
    const me = req.session.email, u = req.user;
    if (!allow(ipLog, 'buy:' + me, 20, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
    const g = await db().getGame(String(req.params.id));
    if (!g || !g.published || g.removed) return res.status(404).json({ error: 'That game is not available.' });
    if (canPlay(g, u)) return res.json({ ok: true, already: true, points: u.points, data: g.data });
    const price = g.price;
    const r = await db().spendPoints(me, price);
    if (!r.ok) return res.status(400).json({ error: `You need ⭐ ${price.toLocaleString('en-IN')} points for this game.`, points: r.points });
    await db().updateLists(me, { $addToSet: { ownedGames: g.id } });
    const paid = await db().addPoints(g.owner, price, null);
    await db().incGame(g.id, { sales: 1, earned: (paid && paid.added) || 0 });
    console.log(`Studio: ${u.username || 'player'} bought ${g.id} for ${price}; creator got ${(paid && paid.added) || 0}`);
    res.json({ ok: true, points: r.points, data: g.data });
  });

  const recentPlays = new Map();
  app.post('/api/studio/play/:id', auth, async (req, res) => {
    const k = req.session.email + ':' + req.params.id, now = Date.now();
    if (now - (recentPlays.get(k) || 0) > 30 * 60 * 1000) { recentPlays.set(k, now); await db().incGame(String(req.params.id), { plays: 1 }); }
    if (recentPlays.size > 50000) recentPlays.clear();
    res.json({ ok: true });
  });

  app.post('/api/studio/like/:id', auth, async (req, res) => {
    const id = String(req.params.id), me = req.session.email;
    const g = await db().getGame(id); if (!g) return res.status(404).json({ error: 'Not found.' });
    const liked = ((req.user && req.user.likedGames) || []).includes(id);
    await db().updateLists(me, liked ? { $pull: { likedGames: id } } : { $addToSet: { likedGames: id } });
    await db().incGame(id, { likes: liked ? -1 : 1 });
    res.json({ liked: !liked, likes: Math.max(0, (g.likes || 0) + (liked ? -1 : 1)) });
  });

  // Admins can take a game down if it breaks the LSP rules.
  app.post('/api/studio/remove/:id', auth, async (req, res) => {
    if (!req.user || !req.user.admin) return res.status(403).json({ error: 'Admins only.' });
    const g = await db().getGame(String(req.params.id)); if (!g) return res.status(404).json({ error: 'Not found.' });
    g.removed = req.body.restore ? false : true; await db().saveGame(g); res.json({ ok: true, removed: g.removed });
  });
};
