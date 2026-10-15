const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data.json');
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const initial = () => ({
  users: [{ username: 'admin', password: hash(process.env.ADMIN_PASSWORD || '1234'), role: 'admin', plan: 'lifetime', deviceSlots: 1, devices: [] }],
  games: [
    { id: 'example-game', title: 'Your first game', category: 'Featured', url: '', description: 'Add a game link in the admin panel to get started.', color: '#7658ed' }
  ]
});
function load() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { const d = initial(); save(d); return d; }
}
function save(d) { fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); }
let db = load();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2' };
function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers }); res.end(body);
}
function json(res, status, data, headers = {}) { send(res, status, JSON.stringify(data), 'application/json; charset=utf-8', headers); }
function readBody(req) { return new Promise((resolve, reject) => { let s = ''; req.on('data', c => { s += c; if (s.length > 100_000) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function userFor(req) { const sid = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('bg_session='))?.slice(11); const u = sessions.get(sid); return u ? { sid, user: db.users.find(x => x.username === u.username) } : {}; }
function deviceId(req) { return hash(String(req.headers['x-device-id'] || '').slice(0, 200)); }
function adminOnly(u, res) { if (u?.role !== 'admin') { json(res, 403, { error: 'Admin access required.' }); return false; } return true; }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    if (req.method === 'GET' && url.pathname === '/api/session') db = load();
    const { user, sid } = userFor(req);
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { loggedIn: !!user, username: user?.username, role: user?.role, plan: user?.plan, deviceSlots: user?.deviceSlots, games: user ? db.games : undefined });
    if (req.method === 'POST' && url.pathname === '/api/login') {
      let b; try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      const u = db.users.find(x => x.username.toLowerCase() === String(b.username || '').trim().toLowerCase());
      if (!u || u.password !== hash(String(b.password || ''))) return json(res, 401, { error: 'That username or password is incorrect.' });
      const dev = deviceId(req);
      if (!u.devices.includes(dev) && u.devices.length >= u.deviceSlots) return json(res, 409, { error: 'This account is already using its device slot. Add a device slot for £3 to use another device.' , slots: true });
      if (!u.devices.includes(dev)) { u.devices.push(dev); save(db); }
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { username: u.username, device: dev });
      return json(res, 200, { ok: true, username: u.username, role: u.role }, { 'Set-Cookie': `bg_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const session = sid && sessions.get(sid);
      if (session) {
        sessions.delete(sid);
        const account = db.users.find(x => x.username === session.username);
        if (account) { account.devices = account.devices.filter(x => x !== session.device); save(db); }
      }
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'bg_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (!user) return json(res, 401, { error: 'Please log in first.' });
    if (req.method === 'POST' && url.pathname === '/api/purchase') {
      let b; try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      if (b.item === 'device-slot') { user.deviceSlots += 1; save(db); return json(res, 200, { ok: true, deviceSlots: user.deviceSlots, note: 'Demo purchase recorded. Connect a payment provider to collect payment.' }); }
      if (b.item === 'monthly' || b.item === 'lifetime') { user.plan = b.item; save(db); return json(res, 200, { ok: true, plan: user.plan, note: 'Demo purchase recorded. Connect a payment provider to collect payment.' }); }
      return json(res, 400, { error: 'Unknown option.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/games') return json(res, 200, { games: db.games });
    if (req.method === 'POST' && url.pathname === '/api/admin/users') {
      if (!adminOnly(user, res)) return;
      let b; try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      const username = String(b.username || '').trim(); const password = String(b.password || '');
      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username) || password.length < 4) return json(res, 400, { error: 'Use a 3–24 character username and a password of at least 4 characters.' });
      if (db.users.some(x => x.username.toLowerCase() === username.toLowerCase())) return json(res, 409, { error: 'That username already exists.' });
      db.users.push({ username, password: hash(password), role: 'user', plan: 'none', deviceSlots: 1, devices: [] }); save(db); return json(res, 201, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/games') {
      if (!adminOnly(user, res)) return;
      let b; try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      const title = String(b.title || '').trim(); const gameUrl = String(b.url || '').trim();
      if (!title || title.length > 80) return json(res, 400, { error: 'Enter a title (up to 80 characters).' });
      if (gameUrl && !/^https?:\/\//i.test(gameUrl)) return json(res, 400, { error: 'Game links must start with http:// or https://.' });
      db.games.unshift({ id: crypto.randomUUID(), title, url: gameUrl, category: String(b.category || 'Games').slice(0, 30), description: String(b.description || '').slice(0, 160), color: /^#[\da-f]{6}$/i.test(b.color) ? b.color : '#7658ed' }); save(db); return json(res, 201, { ok: true });
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/games/')) {
      if (!adminOnly(user, res)) return;
      db.games = db.games.filter(g => g.id !== decodeURIComponent(url.pathname.slice('/api/admin/games/'.length))); save(db); return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Not found.' });
  }
  if (url.pathname.startsWith('/games/')) {
    if (!userFor(req).user) return send(res, 401, '<!doctype html><meta charset="utf-8"><title>Nuh uh buddy</title><style>body{margin:0;background:#101015;color:#f4f1fa;font:600 20px system-ui;display:grid;place-items:center;height:100vh;text-align:center}.hint{font:14px system-ui;color:#aaa}</style><main>Nuh uh buddy.<p class="hint">Log in to BtrccGames to play. Go back to the home page and enter 1010.</p></main>', 'text/html; charset=utf-8');
  }
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  if (file === '/admin' || file === '/admin/') file = '/index.html';
  if (/(^|\/)\.git(\/|$)/i.test(file)) return send(res, 404, 'Not found');
  if (file.endsWith('/') || !path.extname(file)) file = `${file.replace(/\/$/, '')}/index.html`;
  const full = path.resolve(ROOT, 'public', `.${file}`);
  const publicRoot = path.resolve(ROOT, 'public');
  if (!full.startsWith(publicRoot + path.sep)) return send(res, 400, 'Bad request');
  fs.readFile(full, (err, data) => err ? send(res, 404, 'Not found') : send(res, 200, data, mime[path.extname(full)] || 'application/octet-stream'));
});
server.listen(PORT, () => console.log(`BtrccGames is running at http://localhost:${PORT}`));
