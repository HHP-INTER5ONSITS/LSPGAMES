require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const DBM = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.OTP_SECRET || crypto.randomBytes(32).toString('hex');
const MAIL_FROM = process.env.MAIL_FROM || 'LSPGames <onboarding@resend.dev>';
// "true", "TRUE", "yes", "1" or "on" all count, ignoring stray spaces.
const isOn = (v) => /^(true|yes|1|on)$/i.test(String(v || '').trim());
const DEV_SHOW_OTP = isOn(process.env.DEV_SHOW_OTP);
// Demo mode: the sign-in code is shown on the page, so sign-in works even when email
// doesn't. Anyone can then sign in as ANY email address, so keep it off for real players.
const DEMO_MODE = isOn(process.env.DEMO_MODE) || DEV_SHOW_OTP;

const OTP_TTL = 5 * 60 * 1000;          // code valid 5 minutes
const RESEND_GAP = 30 * 1000;           // 30s between sends per email
const MAX_ATTEMPTS = 5;                 // wrong guesses per code
const SESSION_TTL = 30 * 24 * 3600 * 1000; // stay logged in 30 days

app.set('trust proxy', 1);
app.disable('x-powered-by');
const smallJson = express.json({ limit: '10kb', verify: (req, res, buf) => { req.rawBody = buf; } });
const studioJson = express.json({ limit: '400kb' }); // LSP Studio games can be bigger
app.use((req, res, next) => (req.path === '/api/studio/save' ? studioJson : smallJson)(req, res, next));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
// no-cache: browsers always check for the newest game files after you deploy
// downloadable apps live on the GitHub release "apps" (built by .github/workflows/apps.yml)
const APP_FILES = { windows: 'LSP-Games-Setup.exe', mac: 'LSP-Games.dmg', linux: 'LSP-Games.AppImage', android: 'LSP-Games.apk' };
const appReady = new Map(); // file -> { ok, t }
app.get('/download/:os', async (req, res) => {
  const os = String(req.params.os).toLowerCase(), f = APP_FILES[os];
  if (!f) return res.redirect('/#download');
  const url = `https://github.com/HHP-INTER5ONSITS/lspgames/releases/download/apps/${f}`;
  let c = appReady.get(f);
  if (!c || Date.now() - c.t > (c.ok ? 30 * 60e3 : 60e3)) {
    try { const r = await fetch(url, { method: 'HEAD', redirect: 'manual' }); c = { ok: r.status >= 200 && r.status < 400, t: Date.now() }; } catch (e) { c = { ok: true, t: Date.now() }; }
    appReady.set(f, c);
  }
  if (!c.ok) return res.redirect(`/?soon=${os}#download`);
  res.redirect(302, url);
});
app.use(express.static(path.join(__dirname, 'public'), { etag: true, lastModified: true, setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));

// In-memory stores (reset when the server restarts)
const otps = new Map();     // email -> { hash, exp, attempts, dob, age }
const ipLog = new Map();
const emailLog = new Map();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const hashCode = (email, code) =>
  crypto.createHmac('sha256', SECRET).update(email + ':' + code).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function allow(map, key, limit, windowMs) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { map.set(key, arr); return false; }
  arr.push(now);
  map.set(key, arr);
  return true;
}

function parseDob(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d)) age--;
  if (age < 5 || age > 120) return null;
  return { dob: s, age };
}

// ---------- Email providers ----------
let smtp = null;
if (process.env.SMTP_HOST) {
  const port = Number(process.env.SMTP_PORT || 587);
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function provider() {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (smtp) return 'smtp';
  return null;
}

function fromParts() {
  const m = /^(.*)<([^>]+)>\s*$/.exec(MAIL_FROM);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || 'LSPGames', email: m[2].trim() };
  return { name: 'LSPGames', email: MAIL_FROM.trim() };
}

async function sendOtpEmail(to, code) {
  const subject = `${code} is your LSPGames code`;
  const text = `Your LSPGames verification code is ${code}. It expires in 5 minutes. If you didn't ask for this code, you can ignore this email.`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f6fc;padding:32px">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border:2px solid #dfe5f1;border-radius:20px;padding:28px">
      <div style="font-size:24px;font-weight:bold;color:#16203d">🎮 LSPGames</div>
      <p style="color:#66708f;font-size:15px">Use this code to finish signing in:</p>
      <div style="font-size:38px;letter-spacing:10px;font-weight:bold;color:#2f6bff;background:#eef3ff;border-radius:14px;padding:16px;text-align:center">${code}</div>
      <p style="color:#66708f;font-size:13px">It expires in 5 minutes. If you didn't ask for this code, you can ignore this email.</p>
    </div>
  </div>`;

  const p = provider();
  if (p === 'brevo') {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: fromParts(), to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!r.ok) throw new Error('Brevo error ' + r.status + ': ' + (await r.text()));
    return;
  }
  if (p === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html, text }),
    });
    if (!r.ok) throw new Error('Resend error ' + r.status + ': ' + (await r.text()));
    return;
  }
  if (p === 'smtp') {
    await smtp.sendMail({ from: MAIL_FROM, to, subject, text, html });
    return;
  }
  if (DEV_SHOW_OTP) {
    console.log(`[DEV] OTP for ${to}: ${code}`);
    return;
  }
  throw new Error('No email provider configured. Set BREVO_API_KEY, RESEND_API_KEY or SMTP_* variables.');
}

// ---------- API ----------
app.get('/healthz', (req, res) => res.json({ ok: true }));

let db = null;
const ageOf = (dob) => (parseDob(dob) || { age: 0 }).age;

/* ---------------- Username + password accounts (like Roblox) ----------------
   Username accounts get an internal id that looks like an email
   (name@player.lspgames.invalid) so every other part of LSPGames works unchanged.
   .invalid is a reserved domain, so nothing is ever sent there. */
const USER_DOMAIN = 'player.lspgames.invalid';
const UNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const idOfName = (u) => String(u || '').trim().toLowerCase() + '@' + USER_DOMAIN;
const isNameAccount = (email) => String(email || '').endsWith('@' + USER_DOMAIN);
function hashPass(p) { const salt = crypto.randomBytes(16); return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(p, salt, 32).toString('hex'); }
function checkPass(p, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const got = crypto.scryptSync(String(p), Buffer.from(salt, 'hex'), 32), want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
function nameProblem(u) {
  if (!u) return 'Pick a username.';
  if (u.length < 3 || u.length > 20) return 'Usernames are 3 to 20 characters.';
  if (!UNAME_RE.test(u)) return 'Use only letters, numbers and _ in your username.';
  if (/^_|_$/.test(u) || /__/.test(u)) return "Usernames can't start or end with _ or use __.";
  if (/^(admin|support|lspgames|lsppay|moderator|system)/i.test(u)) return 'That username is not allowed.';
  return '';
}
function passProblem(p, u) {
  if (!p || p.length < 8) return 'Your password needs at least 8 characters.';
  if (p.length > 72) return 'Your password is too long (72 characters max).';
  if (u && p.toLowerCase().includes(u.toLowerCase())) return "Your password can't contain your username.";
  if (/^(.)\1+$/.test(p) || /^(12345678|password|qwerty)/i.test(p)) return 'That password is too easy to guess.';
  return '';
}
async function startSession(email, dob) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, email, dob, Date.now() + SESSION_TTL);
  return token;
}
app.get('/api/username-free', async (req, res) => {
  if (!allow(ipLog, 'uf:' + req.ip, 120, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
  const u = String(req.query.u || '').trim(), problem = nameProblem(u);
  if (problem) return res.json({ free: false, error: problem });
  const taken = (await db.getUser(idOfName(u))) || (await db.findByUname(u.toLowerCase()));
  res.json({ free: !taken, error: taken ? 'That username is taken. Try another one.' : '' });
});
app.post('/api/signup', async (req, res) => {
  const u = String(req.body.username || '').trim(), p = String(req.body.password || ''), dob = parseDob(req.body.dob);
  if (!dob) return res.status(400).json({ error: 'Pick your birthday (you need to be 5 or older).' });
  const np = nameProblem(u); if (np) return res.status(400).json({ error: np });
  const pp = passProblem(p, u); if (pp) return res.status(400).json({ error: pp });
  if (!allow(ipLog, 'signup:' + req.ip, 10, 3600 * 1000)) return res.status(429).json({ error: 'Too many new accounts from here. Try again in an hour.' });
  const id = idOfName(u);
  if ((await db.getUser(id)) || (await db.findByUname(u.toLowerCase()))) return res.status(409).json({ error: 'That username is taken. Try another one.' });
  const user = await db.upsertUser(id, dob.dob);
  await db.setUserFields(id, { username: u, uname: u.toLowerCase(), pass: hashPass(p) });
  const token = await startSession(id, dob.dob);
  res.json({ token, email: id, username: u, dob: dob.dob, points: user.points, migrated: true });
});
app.post('/api/login', async (req, res) => {
  const u = String(req.body.username || '').trim(), p = String(req.body.password || '');
  if (!u || !p) return res.status(400).json({ error: 'Enter your username and password.' });
  if (!allow(ipLog, 'login:' + req.ip, 40, 15 * 60 * 1000) || !allow(ipLog, 'login:' + u.toLowerCase(), 10, 15 * 60 * 1000))
    return res.status(429).json({ error: 'Too many tries. Wait 15 minutes and try again.' });
  const id = idOfName(u), user = UNAME_RE.test(u) ? await db.getUser(id) : null;
  if (!user || !checkPass(p, user.pass)) return res.status(400).json({ error: 'Wrong username or password.' });
  if (user.banned) return res.status(403).json({ error: 'This account is banned.' });
  const token = await startSession(id, user.dob);
  res.json({ token, email: id, username: user.username || u, dob: user.dob, points: user.points, migrated: true, lsppay: !!user.lsppay, admin: !!user.admin });
});

async function auth(req, res, next) {
  try {
    const m = /^Bearer (\w+)$/.exec(req.get('Authorization') || '');
    const s = m && (await db.getSession(m[1]));
    if (!s) return res.status(401).json({ error: 'Please sign in again.' });
    const u = await db.getUser(s.email);
    if (u && u.banned) return res.status(403).json({ error: 'This account is banned.' });
    req.session = s; req.token = m[1]; req.user = u;
    next();
  } catch (e) { next(e); }
}

app.get('/api/me', auth, async (req, res) => {
  const u = await db.getUser(req.session.email);
  res.json({ email: req.session.email, username: (u && u.username) || null, dob: req.session.dob, points: u ? u.points : 0, migrated: !!(u && (u.migrated || u.username)), lsppay: !!(u && u.lsppay), admin: !!(u && u.admin) });
});

/* ---------------- Admin account ----------------
   The admin username and password come from environment variables
   (ADMIN_USERNAME, default "admin", and ADMIN_PASSWORD), never from the code,
   so nobody reading the repo can sign in as admin. */
const ADMIN_NAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
async function seedAdmin() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return console.log('Admin account: off (set ADMIN_PASSWORD to turn it on).');
  if (!UNAME_RE.test(ADMIN_NAME)) return console.warn('ADMIN_USERNAME must be 3-20 letters, numbers or _.');
  const id = idOfName(ADMIN_NAME), u = await db.getUser(id);
  if (!u) await db.upsertUser(id, '2000-01-01');
  const fields = { username: ADMIN_NAME, uname: ADMIN_NAME.toLowerCase(), admin: true, banned: false };
  if (!u || !checkPass(pw, u.pass)) fields.pass = hashPass(pw);
  await db.setUserFields(id, fields);
  console.log(`Admin account: ${ADMIN_NAME} is ready.`);
}
function adminOnly(req, res, next) { if (!req.user || !req.user.admin) return res.status(403).json({ error: 'Admins only.' }); next(); }
app.post('/api/admin/points', auth, adminOnly, async (req, res) => {
  const n = Math.max(1, Math.min(10000000, Math.floor(Number(req.body.amount) || 1000)));
  const r = await db.addPoints(req.session.email, n);
  const u = await db.getUser(req.session.email);
  res.json({ ok: true, added: n, points: u ? u.points : (r && r.points) || 0 });
});
app.post('/api/admin/ban', auth, adminOnly, async (req, res) => {
  const name = String(req.body.username || '').trim(), ban = req.body.ban !== false;
  if (!UNAME_RE.test(name)) return res.status(400).json({ error: 'Type a username.' });
  let u = await db.getUser(idOfName(name)); if (!u) u = await db.findByUname(name.toLowerCase());
  if (!u) return res.status(404).json({ error: `No player called ${name}.` });
  if (u.admin) return res.status(400).json({ error: "Admins can't be banned." });
  const id = u.email || idOfName(name);
  await db.setUserFields(id, { banned: !!ban });
  if (ban && FR.kick) FR.kick(id);
  res.json({ ok: true, username: u.username || name, banned: !!ban });
});
app.post('/api/logout', auth, async (req, res) => { await db.deleteSession(req.token); res.json({ ok: true }); });

/* ---------------- Sign in with LSP-Pay (OAuth 2.0 + PKCE) ----------------
   1. /auth/lsppay           → send the player to LSP-Pay's consent screen, with a
                               random `state` (also in a cookie) and a PKCE challenge.
   2. /auth/lsppay/callback  → check the state matches the cookie (stops login CSRF),
                               swap the code for a token server-side using the client
                               secret, read the player's verified email, sign them in.
   3. The browser gets a one-time handoff code, never the token in a URL.
   The client secret is only ever used server to server. */
const LSPID = { id: process.env.LSPPAY_CLIENT_ID || '', secret: process.env.LSPPAY_CLIENT_SECRET || '' };
const lspLoginOn = () => Boolean(LSPID.id && LSPID.secret);
const oauthStates = new Map(); // state -> { dob, verifier, exp }
const handoffs = new Map();    // one-time code -> { login, exp }
const STATE_COOKIE = 'lspg_oauth';
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const cookieOf = (req, name) => {
  const hit = String(req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
};
const lspCallbackUrl = (req) => publicUrl(req) + '/auth/lsppay/callback';
const sweep = (map) => { const now = Date.now(); for (const [k, v] of map) if (now > v.exp) map.delete(k); };

const NEED_BDAY = 'New to LSPGames? Open Sign up, pick your birthday, then press the same button there.';
const OAUTH = {
  google: { name: 'Google', id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET, pkce: true,
    auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', user: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile', extra: { prompt: 'select_account' } },
  github: { name: 'GitHub', id: process.env.GITHUB_CLIENT_ID, secret: process.env.GITHUB_CLIENT_SECRET,
    auth: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', user: 'https://api.github.com/user', scope: 'read:user user:email' },
  yahoo: { name: 'Yahoo', id: process.env.YAHOO_CLIENT_ID, secret: process.env.YAHOO_CLIENT_SECRET, basic: true,
    auth: 'https://api.login.yahoo.com/oauth2/request_auth', token: 'https://api.login.yahoo.com/oauth2/get_token', user: 'https://api.login.yahoo.com/openid/v1/userinfo', scope: 'openid email profile' },
};
const oauthOn = (p) => Boolean(OAUTH[p] && OAUTH[p].id && OAUTH[p].secret);
const UA = { 'User-Agent': 'LSPGames/1.0 (+https://lspgames.onrender.com)', Accept: 'application/json' };

app.get('/api/auth/providers', (req, res) => res.json({ lsppay: lspLoginOn(), google: oauthOn('google'), github: oauthOn('github'), yahoo: oauthOn('yahoo') }));

app.get('/auth/:p(google|github|yahoo)', (req, res) => {
  const P = OAUTH[req.params.p], bounce = (msg) => res.redirect('/?login_error=' + encodeURIComponent(msg));
  if (!oauthOn(req.params.p)) return bounce(`Sign in with ${P.name} is not set up yet.`);
  if (!allow(ipLog, 'oauth:' + req.ip, 30, 10 * 60 * 1000)) return bounce('Too many sign-in attempts. Try again in a few minutes.');
  const dob = parseDob(req.query.dob);
  sweep(oauthStates);
  const state = crypto.randomBytes(16).toString('hex'), verifier = b64url(crypto.randomBytes(32));
  oauthStates.set(state, { p: req.params.p, dob: dob ? dob.dob : null, verifier, exp: Date.now() + 10 * 60 * 1000 });
  res.cookie(STATE_COOKIE + '_' + req.params.p, state, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 10 * 60 * 1000, path: '/auth/' + req.params.p });
  const url = new URL(P.auth);
  url.searchParams.set('client_id', P.id); url.searchParams.set('redirect_uri', publicUrl(req) + `/auth/${req.params.p}/callback`);
  url.searchParams.set('response_type', 'code'); url.searchParams.set('scope', P.scope); url.searchParams.set('state', state);
  if (P.pkce) { url.searchParams.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest())); url.searchParams.set('code_challenge_method', 'S256'); }
  for (const [k, v] of Object.entries(P.extra || {})) url.searchParams.set(k, v);
  res.redirect(url.toString());
});

app.get('/auth/:p(google|github|yahoo)/callback', async (req, res) => {
  const p = req.params.p, P = OAUTH[p], bounce = (msg) => res.redirect('/?login_error=' + encodeURIComponent(msg));
  res.clearCookie(STATE_COOKIE + '_' + p, { path: '/auth/' + p });
  if (req.query.error) return bounce(`${P.name} sign-in was cancelled.`);
  const state = String(req.query.state || ''), rec = oauthStates.get(state);
  oauthStates.delete(state);
  if (!rec || rec.p !== p || Date.now() > rec.exp || !state || cookieOf(req, STATE_COOKIE + '_' + p) !== state) return bounce('That sign-in expired or did not match. Please try again.');
  const code = String(req.query.code || ''); if (!code) return bounce(`${P.name} did not send a sign-in code. Please try again.`);
  try {
    const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: publicUrl(req) + `/auth/${p}/callback` });
    const headers = { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' };
    if (P.basic) headers.Authorization = 'Basic ' + Buffer.from(P.id + ':' + P.secret).toString('base64');
    else { form.set('client_id', P.id); form.set('client_secret', P.secret); }
    if (P.pkce) form.set('code_verifier', rec.verifier);
    const tr = await fetch(P.token, { method: 'POST', headers, body: form, signal: AbortSignal.timeout(20000) });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok || !tok.access_token) throw new Error(`token: ${tr.status} ${tok.error || ''} ${tok.error_description || ''}`);
    const auth2 = { ...UA, Authorization: 'Bearer ' + tok.access_token };
    const ur = await fetch(P.user, { headers: auth2, signal: AbortSignal.timeout(15000) });
    const me = await ur.json().catch(() => ({}));
    if (!ur.ok) throw new Error(`userinfo: ${ur.status}`);
    let email = normEmail(me.email), verified = me.email_verified !== false && me.email_verified !== 'false';
    if (p === 'github') { // GitHub keeps the verified addresses in a separate list
      const er = await fetch('https://api.github.com/user/emails', { headers: auth2, signal: AbortSignal.timeout(15000) });
      const list = er.ok ? await er.json().catch(() => []) : [];
      const best = list.find((e) => e.primary && e.verified) || list.find((e) => e.verified);
      email = best ? normEmail(best.email) : ''; verified = !!best;
    }
    if (!EMAIL_RE.test(email) || !verified || isNameAccount(email)) return bounce(`${P.name} did not share a verified email address. Check your ${P.name} account and try again.`);
    const known = await db.getUser(email), dobv = (known && known.dob) || rec.dob;
    if (!dobv) return bounce(NEED_BDAY);
    const user = await db.upsertUser(email, dobv);
    const token = await startSession(email, dobv);
    sweep(handoffs);
    const handoff = crypto.randomBytes(24).toString('hex');
    handoffs.set(handoff, { login: { token, email, dob: dobv, points: user.points, migrated: !!user.migrated, lsppay: !!user.lsppay, via: P.name }, exp: Date.now() + 60 * 1000 });
    res.redirect('/?login=' + handoff);
  } catch (e) {
    console.error(`[${p}-login]`, e.message);
    bounce(`Couldn't finish signing in with ${P.name}. Please try again.`);
  }
});

app.get('/auth/lsppay', (req, res) => {
  const bounce = (msg) => res.redirect('/?login_error=' + encodeURIComponent(msg));
  if (!lspLoginOn()) return bounce('Sign in with LSP-Pay is not set up yet.');
  const dob = parseDob(req.query.dob); // only needed for a brand-new player
  if (!allow(ipLog, 'oauth:' + req.ip, 30, 10 * 60 * 1000)) return bounce('Too many sign-in attempts. Try again in a few minutes.');

  sweep(oauthStates);
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = b64url(crypto.randomBytes(32));
  oauthStates.set(state, { dob: dob ? dob.dob : null, verifier, exp: Date.now() + 10 * 60 * 1000 });
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 10 * 60 * 1000, path: '/auth/lsppay' });

  const url = new URL(LSP.url + '/oauth/authorize');
  url.searchParams.set('client_id', LSPID.id);
  url.searchParams.set('redirect_uri', lspCallbackUrl(req));
  url.searchParams.set('scope', 'profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest()));
  res.redirect(url.toString());
});

app.get('/auth/lsppay/callback', async (req, res) => {
  const bounce = (msg) => res.redirect('/?login_error=' + encodeURIComponent(msg));
  res.clearCookie(STATE_COOKIE, { path: '/auth/lsppay' });
  if (req.query.error) return bounce('LSP-Pay sign-in was cancelled.');

  const state = String(req.query.state || '');
  const rec = oauthStates.get(state);
  oauthStates.delete(state);
  // The cookie proves this browser started the sign-in, so nobody can plant theirs on you.
  if (!rec || Date.now() > rec.exp || !state || cookieOf(req, STATE_COOKIE) !== state)
    return bounce('That sign-in expired or did not match. Please try again.');
  const code = String(req.query.code || '');
  if (!code) return bounce('LSP-Pay did not send a sign-in code. Please try again.');

  try {
    const tr = await lspFetch(LSP.url + '/oauth/token', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code', code, redirect_uri: lspCallbackUrl(req),
        client_id: LSPID.id, client_secret: LSPID.secret, code_verifier: rec.verifier,
      }),
    });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok || !tok.access_token) throw new Error(`token exchange failed: ${tr.status} ${tok.error || ''} ${tok.error_description || ''}`);

    const ur = await lspFetch(LSP.url + '/oauth/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(15000) });
    const me = await ur.json().catch(() => ({}));
    if (!ur.ok) throw new Error(`userinfo failed: ${ur.status} ${me.error || ''}`);
    const email = normEmail(me.email);
    if (!EMAIL_RE.test(email) || me.email_verified === false) return bounce('LSP-Pay did not share a verified email. Allow "Your email address" and try again.');

    const known = await db.getUser(email), dobv = (known && known.dob) || rec.dob;
    if (!dobv) return bounce(NEED_BDAY);
    const user = await db.upsertUser(email, dobv);
    await db.markLspPay(email);
    const token = await startSession(email, dobv);

    sweep(handoffs);
    const handoff = crypto.randomBytes(24).toString('hex');
    handoffs.set(handoff, { login: { token, email, dob: dobv, points: user.points, migrated: !!user.migrated, lsppay: true, via: 'LSP-Pay' }, exp: Date.now() + 60 * 1000 });
    res.redirect('/?login=' + handoff);
  } catch (e) {
    console.error('[lsppay-login]', e.message);
    bounce("Couldn't finish signing in with LSP-Pay. Try again, or use your username and password.");
  }
});

/** The app trades the one-time handoff for its session, so the token never sits in a URL. */
app.post(['/api/auth/finish', '/api/auth/lsppay/finish'], (req, res) => {
  const key = String(req.body.handoff || '');
  const h = handoffs.get(key);
  handoffs.delete(key);
  if (!h || Date.now() > h.exp) return res.status(400).json({ error: 'That sign-in link expired. Please sign in again.' });
  res.json(h.login);
});

/* ---------------- Wallet ----------------
   Points from playing are added by the game, so they are limited per call and per day to stop cheating.
   Bought points are ONLY added by the payment webhook below. */
const EARN_PER_CALL = 15000, EARN_PER_DAY = 60000, MIGRATE_MAX = 100000;
const intArg = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

app.get('/api/wallet', auth, async (req, res) => { const u = await db.getUser(req.session.email); res.json({ points: u ? u.points : 0 }); });
app.post('/api/wallet/earn', auth, async (req, res) => {
  const n = Math.min(intArg(req.body.amount), EARN_PER_CALL);
  if (!allow(ipLog, 'earn:' + req.session.email, 120, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
  const r = await db.addPoints(req.session.email, n, EARN_PER_DAY);
  res.json(r || { added: 0, points: 0 });
});
app.post('/api/wallet/spend', auth, async (req, res) => {
  const n = intArg(req.body.amount);
  if (!n) return res.status(400).json({ error: 'Bad amount.' });
  const r = await db.spendPoints(req.session.email, n);
  if (!r.ok) return res.status(400).json({ error: 'Not enough points.', points: r.points });
  res.json(r);
});
/* One-time move of points saved in the browser by older versions of LSPGames. */
app.post('/api/wallet/migrate', auth, async (req, res) => {
  const n = Math.min(intArg(req.body.amount), MIGRATE_MAX);
  if (!(await db.markMigrated(req.session.email))) { const u = await db.getUser(req.session.email); return res.json({ added: 0, points: u.points }); }
  const r = await db.addPoints(req.session.email, n, null);
  res.json(r);
});

/* ---------------- Points store ----------------
   Prices are in rupees. Change them here. */
const PACKS = [
  { id: 'p90k', points: 90000, price: 2000, tag: 'Best value' },
  { id: 'p40k', points: 40000, price: 1609 },
];
const RATE = 45, MIN_RS = 10, MAX_RS = 10000;
// off | demo | live | lsppay  ("lsp-pay", "LSP Pay" etc. also accepted)
const GATEWAY_MODE_RAW = String(process.env.GATEWAY_MODE || 'off').trim();
const GATEWAY_MODE = (() => { const m = GATEWAY_MODE_RAW.toLowerCase().replace(/[^a-z]/g, ''); return ['off', 'demo', 'live', 'lsppay'].includes(m) ? m : 'off'; })();
if (!['off', 'demo', 'live', 'lsppay'].includes(GATEWAY_MODE_RAW.toLowerCase().replace(/[^a-z]/g, ''))) console.warn(`GATEWAY_MODE "${GATEWAY_MODE_RAW}" is not recognised, so payments are OFF. Use lsppay, demo, live or off.`);
const LSP = { url: (process.env.LSP_PAY_URL || 'https://lsp-pay.onrender.com').replace(/\/$/, ''), key: process.env.LSP_PAY_KEY_ID || '', secret: process.env.LSP_PAY_SECRET || '', hook: process.env.LSP_WEBHOOK_SECRET || '' };
// Cloudflare sits in front of every onrender.com site and is stricter with requests
// that look like anonymous scripts, so say clearly who is calling.
const LSP_UA = 'LSPGames/1.0 (+https://lspgames.onrender.com; server-to-server payments)';
const lspFetch = (url, o = {}) => fetch(url, { ...o, headers: { 'User-Agent': LSP_UA, Accept: 'application/json', ...(o.headers || {}) } });
const lspAuth = () => 'Basic ' + Buffer.from(LSP.key + ':' + LSP.secret).toString('base64');
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || (GATEWAY_MODE === 'demo' ? 'demo-secret' : '');
const GATEWAY_NAME = process.env.GATEWAY_NAME || (GATEWAY_MODE === 'lsppay' ? 'LSP-Pay' : 'LSP Pay');
const sign = (buf) => crypto.createHmac('sha256', GATEWAY_SECRET).update(buf).digest('hex');
const publicUrl = (req) => (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// Turn an LSP-Pay failure into a message that says what is actually wrong.
function lspWhy(e) {
  const tail = ' You were not charged.';
  if (e.why === 'keys') return "LSP-Pay doesn't accept LSPGames' API key. This happens when LSP-Pay's data was reset. The site owner must create a new API key in LSP-Pay (Business, then Developers) and put it in LSP_PAY_KEY_ID and LSP_PAY_SECRET on Render." + tail;
  if (e.why === 'down') return "LSP-Pay didn't answer. It may be waking up, which takes up to a minute. Wait a moment and try again." + tail;
  if (e.why === 'busy') return 'LSP-Pay says LSPGames is sending too many requests. Try again in a minute.' + tail;
  if (e.why === 'hostbusy') return "Render (the host LSP-Pay runs on) turned the payment away with 'too many requests', before it reached LSP-Pay. LSP-Pay is probably restarting or asleep. Open lsp-pay.onrender.com, wait until it loads, then try again." + tail;
  if (e.why === 'other') return 'LSP-Pay refused the payment' + (e.said ? ': ' + e.said : '.') + tail;
  return "Couldn't reach LSP-Pay. Try again soon." + tail;
}
// Health check for the site owner: open /api/pay/check to see whether LSP-Pay works.
app.get('/api/pay/check', async (req, res) => {
  if (!allow(ipLog, 'pcheck:' + req.ip, 10, 60 * 1000)) return res.status(429).json({ error: 'Too many checks. Wait a minute.' });
  const out = { mode: GATEWAY_MODE, lspPayUrl: LSP.url, keyIdSet: !!LSP.key, secretSet: !!LSP.secret, webhookSecretSet: !!LSP.hook };
  if (GATEWAY_MODE !== 'lsppay') return res.json({ ...out, ok: false, verdict: 'GATEWAY_MODE is not lsppay, so LSP-Pay is not used.' });
  if (!LSP.key || !LSP.secret) return res.json({ ...out, ok: false, verdict: 'Set LSP_PAY_KEY_ID and LSP_PAY_SECRET on Render.' });
  try {
    const r = await lspFetch(LSP.url + '/api/v1/summary', { headers: { Authorization: lspAuth() }, signal: AbortSignal.timeout(60000) });
    const txt = await r.text().catch(() => ''); let body = {}; try { body = JSON.parse(txt); } catch (_) {}
    out.status = r.status; out.server = r.headers.get('server') || null; out.contentType = r.headers.get('content-type') || null;
    if (!r.ok) out.bodyStart = txt.slice(0, 200).replace(/\s+/g, ' ');
    if (r.status === 429) return res.json({ ...out, ok: false, verdict: body.error ? 'LSP-Pay itself is rate limiting this API key: ' + body.error : "Something in front of LSP-Pay (Render's proxy) answered 429 Too Many Requests. LSP-Pay never saw the request. Open lsp-pay.onrender.com to wake it, and check LSP-Pay's Render logs and events." });
    if (r.ok) return res.json({ ...out, ok: true, verdict: 'LSP-Pay accepts the API key. Payments should work.' });
    if (r.status === 401 || r.status === 403) return res.json({ ...out, ok: false, verdict: 'LSP-Pay rejects the API key (it was probably wiped when LSP-Pay\'s database reset). Create a new API key in LSP-Pay and update LSP_PAY_KEY_ID and LSP_PAY_SECRET.', said: body.error || null });
    return res.json({ ...out, ok: false, verdict: 'LSP-Pay answered with an error.', said: body.error || null });
  } catch (e) {
    return res.json({ ...out, ok: false, verdict: "Couldn't reach LSP-Pay at " + LSP.url + ' (' + (e.name === 'TimeoutError' ? 'timed out' : e.message) + '). Check LSP_PAY_URL and that LSP-Pay is running.' });
  }
});

app.get('/api/store', (req, res) => res.json({ packs: PACKS, rate: RATE, minRs: MIN_RS, maxRs: MAX_RS, gateway: GATEWAY_NAME, demo: GATEWAY_MODE === 'demo' || GATEWAY_MODE === 'lsppay', newTab: GATEWAY_MODE === 'lsppay', walletPay: GATEWAY_MODE === 'lsppay', enabled: ['demo', 'live', 'lsppay'].includes(GATEWAY_MODE), max: DBM.POINTS_MAX }));

app.post('/api/pay/create', auth, async (req, res) => {
  const email = req.session.email;
  if (!allow(ipLog, 'pay:' + email, 10, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many payment attempts. Try again in a few minutes.' });
  let points, rupees, label;
  const pack = PACKS.find((p) => p.id === req.body.pack);
  if (pack) { points = pack.points; rupees = pack.price; label = `${points.toLocaleString('en-IN')} LSP points`; }
  else {
    points = intArg(req.body.points);
    rupees = Math.ceil(points / RATE);
    if (rupees < MIN_RS) return res.status(400).json({ error: `The smallest purchase is ₹${MIN_RS} (${(MIN_RS * RATE).toLocaleString('en-IN')} points).` });
    if (rupees > MAX_RS) return res.status(400).json({ error: `The biggest single purchase is ₹${MAX_RS.toLocaleString('en-IN')}.` });
    label = `${points.toLocaleString('en-IN')} LSP points`;
  }
  const user = await db.getUser(email);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });
  if (user.points + points > DBM.POINTS_MAX) return res.status(400).json({ error: 'That would go over the 10,000,000 point limit.' });
  if (ageOf(req.session.dob) < 18 && req.body.parentOk !== true) return res.status(400).json({ error: 'Players under 18 need a parent or guardian to say yes first.' });
  if (GATEWAY_MODE === 'off' || (GATEWAY_MODE === 'live' && (!process.env.GATEWAY_CREATE_URL || !GATEWAY_SECRET)) || (GATEWAY_MODE === 'lsppay' && (!LSP.key || !LSP.secret))) return res.status(503).json({ error: 'Buying points is coming soon.' });

  const orderId = 'LSP' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();
  const base = publicUrl(req);
  const order = { orderId, email, points, amount: rupees * 100, currency: 'INR', label, status: 'pending', createdAt: new Date() };
  await db.createOrder(order);

  if (GATEWAY_MODE === 'demo') return res.json({ orderId, paymentUrl: `${base}/demo-pay.html?order=${orderId}` });

  if (GATEWAY_MODE === 'lsppay') {
    try {
      // LSP-Pay may be asleep on Render's free plan: wait up to ~70s, retrying on network errors and 5xx.
      // Safe to retry because the Idempotency-Key makes LSP-Pay return the same order.
      const payload = JSON.stringify({ amount: rupees, description: `LSPGames: ${label}`, reference: orderId, customer_email: isNameAccount(email) ? undefined : email, items: [{ name: label, qty: 1, unit: rupees }] });
      let r, data = {}, lastErr = '';
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          r = await lspFetch(LSP.url + '/api/v1/orders', {
            method: 'POST', signal: AbortSignal.timeout(25000),
            headers: { Authorization: lspAuth(), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
            body: payload,
          });
          const txt = await r.text().catch(() => ''); r.bodyText = txt;
          try { data = JSON.parse(txt); } catch (_) { data = {}; }
          if (r.status === 429) {
            // LSP-Pay asked us to slow down: wait as long as it says (max 15s), then try again.
            const wait = Math.min(15, Math.max(2, Number(r.headers.get('retry-after')) || 5));
            lastErr = `HTTP 429 (rate limited, waiting ${wait}s)`; console.warn(`LSP-Pay attempt ${attempt} failed: ${lastErr}`);
            if (attempt < 5) { await new Promise((ok) => setTimeout(ok, (wait + attempt * 2) * 1000)); continue; }
            break;
          }
          if (r.status < 500) break;
          lastErr = 'HTTP ' + r.status;
        } catch (e) { lastErr = e.name === 'TimeoutError' ? 'timed out (LSP-Pay may be waking up)' : e.message; r = null; }
        console.warn(`LSP-Pay attempt ${attempt} failed: ${lastErr}`);
        if (attempt < 5) await new Promise((ok) => setTimeout(ok, 3000));
      }
      if (!r) throw Object.assign(new Error('no answer: ' + lastErr), { why: 'down' });
      if (r.status === 429) { lspCooldownUntil = Date.now() + 30000; const host = !data.error; // LSP-Pay itself always answers in JSON with an "error"
        console.error(`LSP-Pay 429 came from ${host ? 'the host in front of LSP-Pay (not LSP-Pay itself)' : 'LSP-Pay'}: server=${r.headers.get('server') || '?'} type=${r.headers.get('content-type') || '?'} body=${String(r.bodyText || '').slice(0, 300).replace(/\s+/g, ' ')}`);
        throw Object.assign(new Error('LSP-Pay said 429: still rate limited after 5 tries.'), { why: host ? 'hostbusy' : 'busy' }); }
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error(`LSP-Pay said ${r.status}: LSP_PAY_KEY_ID or LSP_PAY_SECRET is wrong. ${JSON.stringify(data).slice(0, 200)}`), { why: 'keys' });
      if (!r.ok || !data.id || !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(data.checkoutUrl || '') || Number(data.amount) !== rupees) throw Object.assign(new Error('LSP-Pay said ' + r.status + ' ' + JSON.stringify(data).slice(0, 300)), { why: 'other', said: String(data.error || data.message || '').slice(0, 160) });
      await db.setOrder(orderId, { gatewayOrderId: data.id });
      // "Pay with LSP-Pay": open LSP-Pay checkout straight on the player's wallet.
      let paymentUrl = data.checkoutUrl;
      if (req.body.wallet === true) { const u = new URL(paymentUrl); u.searchParams.set('method', 'wallet'); paymentUrl = u.toString(); }
      return res.json({ orderId, paymentUrl, newTab: true });
    } catch (e) {
      console.error('LSP-Pay create failed:', e.message);
      await db.setOrder(orderId, { status: 'failed', failReason: 'gateway_error' });
      return res.status(502).json({ error: lspWhy(e) });
    }
  }

  const body = JSON.stringify({ order_id: orderId, amount: order.amount, currency: 'INR', description: label, customer_email: email, return_url: `${base}/?payment=${orderId}`, webhook_url: `${base}/api/pay/webhook` });
  try {
    const headers = { 'Content-Type': 'application/json', 'X-LSP-Signature': sign(body) };
    if (process.env.GATEWAY_API_KEY) headers.Authorization = 'Bearer ' + process.env.GATEWAY_API_KEY;
    const r = await fetch(process.env.GATEWAY_CREATE_URL, { method: 'POST', headers, body });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !/^https:\/\//.test(data.payment_url || '')) throw new Error('Gateway said ' + r.status + ' ' + JSON.stringify(data));
    await db.setOrder(orderId, { gatewayRef: data.payment_id || null });
    res.json({ orderId, paymentUrl: data.payment_url });
  } catch (e) {
    console.error('Gateway create failed:', e.message);
    await db.setOrder(orderId, { status: 'failed', failReason: 'gateway_error' });
    res.status(502).json({ error: "Couldn't reach the payment gateway. You were not charged. Try again soon." });
  }
});

/* Your gateway calls this when a payment finishes. It must sign the raw body with GATEWAY_SECRET. */
async function handlePaid(payload) {
  const o = await db.getOrder(String(payload.order_id || ''));
  if (!o) return { code: 404, body: { error: 'unknown order' } };
  if (payload.status !== 'paid') { await db.setOrder(o.orderId, { status: 'failed', failReason: String(payload.status || 'failed').slice(0, 40) }); return { code: 200, body: { ok: true } }; }
  if (Number(payload.amount) !== o.amount || (payload.currency && payload.currency !== 'INR')) { console.error('Amount mismatch for', o.orderId, payload.amount, o.amount); return { code: 400, body: { error: 'amount mismatch' } }; }
  const claimed = await db.claimPaid(o.orderId, { paymentId: String(payload.payment_id || '').slice(0, 100) });
  if (claimed) { const r = await db.addPoints(o.email, o.points, null); console.log(`Order ${o.orderId} paid: +${r.added} points to ${o.email}`); }
  return { code: 200, body: { ok: true } };
}
app.post('/api/pay/webhook', async (req, res) => {
  const got = String(req.get('X-Gateway-Signature') || '');
  if (!GATEWAY_SECRET || !req.rawBody || !/^[0-9a-f]{64}$/.test(got) || !safeEqual(got, sign(req.rawBody))) return res.status(401).json({ error: 'bad signature' });
  const r = await handlePaid(req.body || {});
  res.status(r.code).json(r.body);
});

/* ---------- LSP-Pay ---------- */
// Apply an LSP-Pay order object (from a verified webhook or our own API call) to our order.
async function applyLspOrder(event, lo) {
  if (!lo || !lo.id) return;
  const o = (lo.reference && (await db.getOrder(String(lo.reference)))) || (await db.getOrderByGateway(String(lo.id)));
  if (!o || o.gatewayOrderId !== lo.id) return;
  const status = event === 'order.refunded' ? 'refunded' : event === 'order.paid' ? 'paid' : lo.status;
  if (status === 'paid') {
    if (Number(lo.amount) * 100 !== o.amount) { console.error('LSP-Pay amount mismatch', o.orderId, lo.amount); return; }
    const claimed = await db.claimPaid(o.orderId, { paymentId: lo.id });
    if (claimed) { const r = await db.addPoints(o.email, o.points, null); console.log(`LSP-Pay order ${o.orderId} paid: +${r.added} points to ${o.email}`); }
  } else if (status === 'refunded') {
    const done = await db.markRefunded(o.orderId);
    if (done) { const t = await db.takePoints(o.email, o.points); console.log(`LSP-Pay order ${o.orderId} refunded: -${t} points from ${o.email}`); }
  } else if (status === 'expired') {
    await db.setOrder(o.orderId, { status: 'failed', failReason: 'expired' });
  }
}
app.post('/api/pay/lsp-webhook', async (req, res) => {
  const given = String(req.get('X-LSP-Signature') || '');
  const expected = LSP.hook && req.rawBody ? crypto.createHmac('sha256', LSP.hook).update(req.rawBody).digest('hex') : '';
  if (!expected || !safeEqual(given, expected)) return res.sendStatus(400);
  try { await applyLspOrder(req.body.event, req.body.order); res.sendStatus(200); }
  catch (e) { console.error('LSP-Pay webhook error:', e.message); res.sendStatus(500); }
});
const lastPoll = new Map();
let lspCooldownUntil = 0; // after a 429, stop polling LSP-Pay for a while
async function pollLsp(o) {
  if (GATEWAY_MODE !== 'lsppay' || o.status !== 'pending' || !o.gatewayOrderId) return;
  // With a webhook secret set, the webhook does the work and we only poll as a slow safety net.
  const every = LSP.hook ? 30000 : 8000;
  if (Date.now() < lspCooldownUntil || Date.now() - (lastPoll.get(o.orderId) || 0) < every) return;
  lastPoll.set(o.orderId, Date.now());
  try {
    const r = await lspFetch(`${LSP.url}/api/v1/orders/${encodeURIComponent(o.gatewayOrderId)}`, { headers: { Authorization: lspAuth() }, signal: AbortSignal.timeout(15000) });
    if (r.status === 429) { lspCooldownUntil = Date.now() + 30000; console.warn('LSP-Pay rate limited a status check; pausing checks for 30s'); return; }
    if (r.ok) await applyLspOrder(null, await r.json());
  } catch (e) { console.error('LSP-Pay poll failed:', e.message); }
}

app.get('/api/pay/status/:id', auth, async (req, res) => {
  let o = await db.getOrder(req.params.id);
  if (!o || o.email !== req.session.email) return res.status(404).json({ error: 'Order not found.' });
  if (o.status === 'pending') { await pollLsp(o); o = await db.getOrder(o.orderId); }
  const u = await db.getUser(o.email);
  res.json({ status: o.status, points: o.points, amount: o.amount, balance: u.points });
});
app.get('/api/pay/history', auth, async (req, res) => {
  const list = await db.listOrders(req.session.email);
  res.json(list.map((o) => ({ orderId: o.orderId, points: o.points, amount: o.amount, status: o.status, createdAt: o.createdAt })));
});

/* Demo gateway, only when GATEWAY_MODE=demo. Lets you test the whole flow without real money. */
if (GATEWAY_MODE === 'demo') {
  app.get('/api/demo-gateway/order/:id', async (req, res) => { const o = await db.getOrder(req.params.id); if (!o) return res.status(404).json({ error: 'not found' }); res.json({ orderId: o.orderId, amount: o.amount, label: o.label, status: o.status }); });
  app.post('/api/demo-gateway/complete', async (req, res) => {
    const o = await db.getOrder(String(req.body.order_id || '')); if (!o) return res.status(404).json({ error: 'not found' });
    const r = await handlePaid({ order_id: o.orderId, status: req.body.pay ? 'paid' : 'failed', amount: o.amount, currency: 'INR', payment_id: 'DEMO-' + Date.now() });
    res.status(r.code).json({ ...r.body, return_url: `/?payment=${o.orderId}` });
  });
}

setInterval(() => { const now = Date.now(); for (const [k, v] of otps) if (now > v.exp) otps.delete(k); }, 10 * 60 * 1000).unref();

const FR = require('./friends')(app, { getDb: () => db, auth, allow, ipLog, nameProblem, idOfName });
require('./studio')(app, { getDb: () => db, auth, allow, ipLog, cleanChat: FR.cleanChat, blockedChat: FR.blockedChat });

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error. Try again.' }); });

DBM.connect().then((store) => {
  db = store;
  seedAdmin().catch((e) => console.error('Admin setup failed:', e.message));
  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`LSPGames running on port ${PORT}`);
    console.log(`Email provider: ${provider() || (DEMO_MODE ? 'none (demo mode: codes shown on screen)' : 'NONE CONFIGURED')}`);
    if (!DEMO_MODE && process.env.DEMO_MODE) console.warn(`DEMO_MODE is "${process.env.DEMO_MODE}", which is not on. Use true to show sign-in codes on screen.`);
    if (DEMO_MODE) console.warn('DEMO MODE ON: sign-in codes are shown on the page, so anyone can sign in as any email. Set DEMO_MODE=false before real players use LSPGames.');
    console.log(`Storage: ${db.kind}. Payments: ${GATEWAY_MODE === 'lsppay' ? `LSP-Pay (${LSP.url}), key ${LSP.key || 'MISSING'}, webhook secret ${LSP.hook ? 'set' : 'MISSING (polling only)'}` : GATEWAY_MODE === 'demo' ? 'DEMO mode (no real money)' : GATEWAY_MODE === 'live' ? 'LIVE via ' + (process.env.GATEWAY_CREATE_URL || 'MISSING GATEWAY_CREATE_URL') : 'OFF'}`);
  });
  FR.attach(httpServer);
}).catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });
