const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data.json');
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 150 * 1024 * 1024;
const MAX_ZIP_FILES = 1200;
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
function readRawBody(req, limit) { return new Promise((resolve, reject) => { const chunks = []; let size = 0; req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Upload is too large. ZIP files must be under 50 MB.')); req.destroy(); return; } chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); }); }
function parseMultipart(body, boundary) {
  const marker = Buffer.from(`--${boundary}`); const result = {}; let pos = body.indexOf(marker);
  while (pos !== -1) { pos += marker.length; if (body.subarray(pos, pos + 2).toString() === '--') break; if (body.subarray(pos, pos + 2).toString() === '\r\n') pos += 2; const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos); if (headerEnd < 0) throw new Error('Invalid upload form.'); const headers = body.subarray(pos, headerEnd).toString('utf8'); const next = body.indexOf(marker, headerEnd + 4); if (next < 0) throw new Error('Invalid upload form.'); let dataEnd = next; if (body.subarray(dataEnd - 2, dataEnd).toString() === '\r\n') dataEnd -= 2; const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || ''; const name = disposition.match(/(?:^|;)\s*name="([^"]*)"/i)?.[1]; const filename = disposition.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1]; if (name) result[name] = filename !== undefined ? { filename, data: body.subarray(headerEnd + 4, dataEnd) } : body.subarray(headerEnd + 4, dataEnd).toString('utf8'); pos = next; }
  return result;
}
function crc32(buf) { let c = 0xffffffff; for (const byte of buf) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function extractZip(zip, target) {
  if (zip.length < 22) throw new Error('That ZIP file looks incomplete.');
  let eocd = -1; const scanStart = Math.max(0, zip.length - 65557); for (let i = zip.length - 22; i >= scanStart; i--) if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Could not read the ZIP directory.');
  const disk = zip.readUInt16LE(eocd + 4), cdDisk = zip.readUInt16LE(eocd + 6), entries = zip.readUInt16LE(eocd + 10), cdSize = zip.readUInt32LE(eocd + 12), cdOffset = zip.readUInt32LE(eocd + 16);
  if (disk || cdDisk || entries === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff || entries > MAX_ZIP_FILES || cdOffset + cdSize > eocd) throw new Error('This ZIP format is not supported or has too many files.');
  let cursor = cdOffset, total = 0; const paths = new Set(), indexes = [];
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > zip.length || zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error('The ZIP file directory is damaged.');
    const flags = zip.readUInt16LE(cursor + 8), method = zip.readUInt16LE(cursor + 10), crc = zip.readUInt32LE(cursor + 16), compressed = zip.readUInt32LE(cursor + 20), size = zip.readUInt32LE(cursor + 24), nameLen = zip.readUInt16LE(cursor + 28), extraLen = zip.readUInt16LE(cursor + 30), commentLen = zip.readUInt16LE(cursor + 32), external = zip.readUInt32LE(cursor + 38), localOffset = zip.readUInt32LE(cursor + 42);
    if (flags & 1 || ![0, 8].includes(method)) throw new Error('Encrypted ZIPs and this compression method are not supported.');
    if (cursor + 46 + nameLen + extraLen + commentLen > zip.length) throw new Error('The ZIP file directory is damaged.');
    const rawName = zip.subarray(cursor + 46, cursor + 46 + nameLen); let name; try { name = rawName.toString(flags & 0x800 ? 'utf8' : 'latin1'); } catch { throw new Error('A ZIP filename could not be read.'); }
    cursor += 46 + nameLen + extraLen + commentLen;
    if (!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[a-z]:/i.test(name)) throw new Error('The ZIP contains an unsafe file path.');
    const isDir = name.endsWith('/'); const clean = isDir ? name.slice(0, -1) : name; const parts = clean.split('/');
    if (parts.some(p => !p || p === '.' || p === '..') || parts.some(p => p.startsWith('.'))) { if (parts.some(p => p === '..' || p === '.')) throw new Error('The ZIP contains an unsafe file path.'); if (parts.some(p => p.startsWith('.'))) continue; }
    if (/(^|\/)__MACOSX(\/|$)/i.test(name) || /(^|\/)\.DS_Store$/i.test(name)) continue;
    const unixMode = external >>> 16; if ((unixMode & 0xf000) === 0xa000) throw new Error('ZIP symbolic links are not supported.');
    if (isDir) { fs.mkdirSync(path.join(target, ...parts), { recursive: true }); continue; }
    if (size > MAX_UNZIPPED_BYTES || (total += size) > MAX_UNZIPPED_BYTES) throw new Error('The unzipped game is too large (150 MB limit).');
    const normalized = parts.join('/').toLowerCase(); if (paths.has(normalized)) throw new Error('The ZIP has duplicate file paths.'); paths.add(normalized);
    if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('A ZIP file entry is damaged.');
    const localNameLen = zip.readUInt16LE(localOffset + 26), localExtraLen = zip.readUInt16LE(localOffset + 28), dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + compressed > zip.length) throw new Error('A ZIP file entry is damaged.');
    const compressedData = zip.subarray(dataStart, dataStart + compressed); let data;
    try { data = method === 0 ? Buffer.from(compressedData) : zlib.inflateRawSync(compressedData, { maxOutputLength: size + 1 }); } catch { throw new Error('A game file could not be unzipped.'); }
    if (data.length !== size || crc32(data) !== crc) throw new Error('A ZIP file failed its integrity check.');
    const full = path.resolve(target, ...parts); if (!full.startsWith(path.resolve(target) + path.sep)) throw new Error('The ZIP contains an unsafe file path.');
    fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, data);
    if (path.basename(full).toLowerCase() === 'index.html') indexes.push(parts);
  }
  if (!indexes.length) throw new Error('No index.html was found in that ZIP.');
  indexes.sort((a, b) => a.length - b.length || a.join('/').localeCompare(b.join('/')));
  return indexes[0].map(encodeURIComponent).join('/');
}
function userFor(req) { const sid = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('bg_session='))?.slice(11); const session = sessions.get(sid); if (!session) return {}; if (session.expiresAt <= Date.now()) { sessions.delete(sid); const expiredUser = db.users.find(x => x.username === session.username); if (expiredUser) { expiredUser.devices = expiredUser.devices.filter(x => x !== session.device); save(db); } return {}; } session.lastSeenAt = Date.now(); return { sid, user: db.users.find(x => x.username === session.username) }; }
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
      if (!u.devices.includes(dev)) { u.devices.push(dev); }
      u.lastLoginAt = Date.now(); save(db);
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { username: u.username, device: dev, lastSeenAt: Date.now(), expiresAt: Date.now() + 604800000 });
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
    if (req.method === 'GET' && url.pathname === '/api/admin/users') {
      if (!adminOnly(user, res)) return;
      const now = Date.now(); const active = [...sessions.values()].filter(s => s.expiresAt > now && now - s.lastSeenAt < 15 * 60 * 1000);
      return json(res, 200, { users: db.users.map(u => ({ username: u.username, role: u.role, plan: u.plan, deviceSlots: u.deviceSlots || 1, activeDevices: (u.devices || []).length, online: active.some(s => s.username === u.username), lastLoginAt: u.lastLoginAt || null })) });
    }
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
    if (req.method === 'POST' && url.pathname === '/api/admin/games/upload') {
      if (!adminOnly(user, res)) return;
      const contentType = String(req.headers['content-type'] || ''); const boundary = contentType.match(/multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i); if (!boundary) return json(res, 400, { error: 'Choose a ZIP file to upload.' });
      let parts; try { parts = parseMultipart(await readRawBody(req, MAX_ZIP_BYTES + 1_000_000), boundary[1] || boundary[2]); } catch (err) { return json(res, 400, { error: err.message || 'Could not read the upload.' }); }
      const title = String(parts.title || '').trim(), category = String(parts.category || 'Games').trim().slice(0, 30) || 'Games', description = String(parts.description || '').trim().slice(0, 160), upload = parts.gameZip;
      if (!title || title.length > 80) return json(res, 400, { error: 'Enter a game title (up to 80 characters).' });
      if (!upload?.data?.length || !/\.zip$/i.test(upload.filename)) return json(res, 400, { error: 'Choose a valid .zip file.' });
      if (upload.data.length > MAX_ZIP_BYTES) return json(res, 413, { error: 'ZIP files must be under 50 MB.' });
      const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'game'; let slug = base, suffix = 2;
      while (db.games.some(g => g.storage === slug) || fs.existsSync(path.join(ROOT, 'public', 'games', slug))) slug = `${base}-${suffix++}`;
      const gamesRoot = path.join(ROOT, 'public', 'games'), staging = path.join(gamesRoot, `.upload-${crypto.randomUUID()}`), finalDir = path.join(gamesRoot, slug); fs.mkdirSync(staging, { recursive: true });
      let entry; try { entry = extractZip(upload.data, staging); fs.renameSync(staging, finalDir); } catch (err) { fs.rmSync(staging, { recursive: true, force: true }); return json(res, 400, { error: err.message || 'Could not extract that ZIP.' }); }
      const id = slug; db.games.unshift({ id, title, url: `/games/${encodeURIComponent(slug)}/${entry}`, storage: slug, category, description, color: '#7658ed' });
      try { save(db); } catch (err) { db.games = db.games.filter(g => g.id !== id); fs.rmSync(finalDir, { recursive: true, force: true }); return json(res, 500, { error: 'The game files were unpacked, but the game could not be added.' }); }
      return json(res, 201, { ok: true, id, title, entry });
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/games/')) {
      if (!adminOnly(user, res)) return;
      const id = decodeURIComponent(url.pathname.slice('/api/admin/games/'.length)); const game = db.games.find(g => g.id === id); db.games = db.games.filter(g => g.id !== id); save(db); if (game?.storage && /^[a-z0-9-]+$/.test(game.storage)) fs.rmSync(path.join(ROOT, 'public', 'games', game.storage), { recursive: true, force: true }); return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Not found.' });
  }
  let decodedPath; try { decodedPath = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad request'); }
  if (decodedPath.startsWith('/games/')) {
    if (!userFor(req).user) return send(res, 401, '<!doctype html><meta charset="utf-8"><title>Nuh uh buddy</title><style>body{margin:0;background:#101015;color:#f4f1fa;font:600 20px system-ui;display:grid;place-items:center;height:100vh;text-align:center}.hint{font:14px system-ui;color:#aaa}</style><main>Nuh uh buddy.<p class="hint">Log in to BtrccStudy to play. Go back to the home page and enter 1010.</p></main>', 'text/html; charset=utf-8');
  }
  let file = decodedPath === '/' ? '/index.html' : decodedPath;
  if (file === '/admin' || file === '/admin/') file = '/index.html';
  if (/(^|\/)\.git(\/|$)/i.test(file)) return send(res, 404, 'Not found');
  if (file.endsWith('/') || !path.extname(file)) file = `${file.replace(/\/$/, '')}/index.html`;
  const full = path.resolve(ROOT, 'public', `.${file}`);
  const publicRoot = path.resolve(ROOT, 'public');
  if (!full.startsWith(publicRoot + path.sep)) return send(res, 400, 'Bad request');
  fs.readFile(full, (err, data) => err ? send(res, 404, 'Not found') : send(res, 200, data, mime[path.extname(full)] || 'application/octet-stream'));
});
server.listen(PORT, () => console.log(`BtrccStudy is running at http://localhost:${PORT}`));

