const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let state = { loggedIn: false, role: null, username: null, games: [], category: 'All' };
const palette = ['#e4eaff', '#ffe5ee', '#fff0c9', '#dcf5e7', '#e9e1ff', '#d9f2f4'];
function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  return fetch(path, { credentials: 'same-origin', ...options, headers }).then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: r.status, data }); return data; });
}
function deviceHeader() {
  let id = localStorage.getItem('btrcc-device-id');
  if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; localStorage.setItem('btrcc-device-id', id); }
  return { 'X-Device-ID': id };
}
function notify(message) { const t = $('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => t.classList.remove('show'), 2600); }
function open(id) { $(`#${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeAll() { $$('.modal').forEach(m => m.classList.add('hidden')); document.body.style.overflow = ''; }
function categories() {
  const list = ['All', ...new Set(state.games.map(g => g.category || 'Games'))];
  $('#categories').innerHTML = list.map(c => `<button class="category ${state.category === c ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function renderGames() {
  const search = $('#search').value.trim().toLowerCase();
  const games = state.games.filter(g => (state.category === 'All' || g.category === state.category) && `${g.title} ${g.description} ${g.category}`.toLowerCase().includes(search));
  $('#game-grid').innerHTML = games.length ? games.map((g, i) => `<a class="game-card-tile" data-game="${esc(g.id)}" href="${esc(g.url || '#')}" target="_blank" rel="noopener noreferrer" aria-label="Play ${esc(g.title)}" title="${esc(g.title)}"><div class="game-thumb" style="--game-color:${/^#[\da-f]{6}$/i.test(g.color) ? g.color : palette[i % palette.length]}"><span class="game-fallback" aria-hidden="true">${esc((g.title || '?').trim().slice(0, 1))}</span><img class="game-logo" src="${esc(g.logo || '/games/' + encodeURIComponent(g.id) + '/logo.png')}" alt="" aria-hidden="true" onload="this.parentElement.classList.add('has-logo')" onerror="this.remove()"><span class="game-play" aria-hidden="true">▶</span></div><span class="sr-only">${esc(g.title)}</span></a>`).join('') : `<div class="empty-state">No games found yet. Add a game from the admin panel.</div>`;
}
async function refresh() {
  const s = await api('/api/session'); state.loggedIn = s.loggedIn; state.username = s.username; state.role = s.role; state.plan = s.plan; state.deviceSlots = s.deviceSlots;
  if (s.loggedIn) { const g = await api('/api/games'); state.games = g.games; }
  else { state.games = []; }
  $('#welcome').textContent = s.loggedIn ? `Hi, ${s.username}` : '';
  $('#account-button').textContent = s.loggedIn ? 'My account' : 'Log in';
  document.body.classList.toggle('locked', !s.loggedIn);
  $('#lock-screen').style.display = s.loggedIn ? 'none' : '';
  categories(); renderGames();
}
$('#account-button').addEventListener('click', () => state.loggedIn ? (state.role === 'admin' ? (open('admin-modal'), refreshAdminAccounts()) : showAccount()) : open('login-modal'));
function showAccount() { $('#account-title').textContent = `Hi, ${state.username}`; $('#account-plan').textContent = `Plan: ${state.plan || 'none'} · Device slots: ${state.deviceSlots || 1}`; $('#purchase-message').textContent = ''; open('account-modal'); }
document.addEventListener('click', async e => {
  if (e.target.matches('[data-close]')) closeAll();
  const cat = e.target.closest('[data-category]'); if (cat) { state.category = cat.dataset.category; categories(); renderGames(); }
  const tile = e.target.closest('[data-game]'); if (tile) { const game = state.games.find(g => g.id === tile.dataset.game); if (!state.loggedIn) { e.preventDefault(); open('login-modal'); return; } if (!game?.url) { e.preventDefault(); launchGame(game); } }
  const tab = e.target.closest('[data-tab]'); if (tab) { $$('.tab').forEach(x => x.classList.toggle('active', x === tab)); $$('.tab-pane').forEach(x => x.classList.toggle('hidden', x.id !== `tab-${tab.dataset.tab}`)); if (tab.dataset.tab === 'games') renderAdminGames(); if (tab.dataset.tab === 'accounts') refreshAdminAccounts(); }
  const remove = e.target.closest('[data-delete-game]'); if (remove) { try { await api(`/api/admin/games/${encodeURIComponent(remove.dataset.deleteGame)}`, { method: 'DELETE' }); await refresh(); renderAdminGames(); } catch (err) { notify(err.message); } }
  const purchase = e.target.closest('[data-purchase]'); if (purchase) { try { const result = await api('/api/purchase', { method: 'POST', body: JSON.stringify({ item: purchase.dataset.purchase }) }); if (result.deviceSlots) state.deviceSlots = result.deviceSlots; if (result.plan) state.plan = result.plan; $('#account-plan').textContent = `Plan: ${state.plan || 'none'} · Device slots: ${state.deviceSlots || 1}`; $('#purchase-message').textContent = result.note; } catch (err) { $('#purchase-message').textContent = err.message; } }
});
$('#search').addEventListener('input', renderGames);
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#login-error').textContent = '';
  const form = e.currentTarget; const fd = new FormData(form); const username = String(fd.get('username')).trim();
  try { const result = await api('/api/login', { method: 'POST', headers: deviceHeader(), body: JSON.stringify({ username, password: fd.get('password') }) }); closeAll(); await refresh(); form.reset(); if (result.role === 'admin') open('admin-modal'); else notify(`Welcome, ${result.username}!`); }
  catch (err) { $('#login-error').textContent = err.message; }
});
$('#login-modal [data-close]').addEventListener('click', resetLogin);
function resetLogin() { $('.secret-admin', $('#login-modal'))?.classList.remove('secret-admin'); $('h2', $('#login-modal')).textContent = 'Log in to play'; $('p', $('#login-modal')).textContent = 'Sign in to open your games and account.'; $('input[name="username"]', $('#login-form')).readOnly = false; $('.purchase-box', $('#login-modal')).classList.remove('hidden'); $('#login-form').reset(); $('#login-error').textContent = ''; }
$('#account-form').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const msg = $('#account-message'); msg.textContent = ''; const fd = new FormData(form); try { await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }) }); msg.textContent = 'Account created.'; form.reset(); await refreshAdminAccounts(); } catch (err) { msg.textContent = err.message; } });
$('#refresh-accounts').addEventListener('click', refreshAdminAccounts);
async function refreshAdminAccounts() { const list = $('#admin-account-list'); if (!list) return; list.innerHTML = '<p class="admin-list-note">Loading accounts…</p>'; try { const result = await api('/api/admin/users'); list.innerHTML = result.users.length ? result.users.map(u => `<article class="admin-account-row"><div><strong>${esc(u.username)}</strong><small>${esc(u.role)} · ${esc(u.plan || 'no plan')} · ${u.activeDevices}/${u.deviceSlots} device${u.deviceSlots === 1 ? '' : 's'}</small></div><div class="account-presence ${u.online ? 'online' : ''}"><i></i>${u.online ? 'Online' : 'Offline'}<small>${u.lastLoginAt ? `Last login ${esc(new Date(u.lastLoginAt).toLocaleString())}` : 'Never logged in'}</small></div></article>`).join('') : '<p class="admin-list-note">No accounts yet.</p>'; } catch (err) { list.innerHTML = `<p class="error">${esc(err.message)}</p>`; } }
$('#upload-form').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const msg = $('#upload-message'); const button = $('#upload-button'); msg.textContent = ''; button.disabled = true; button.textContent = 'Uploading…'; try { const result = await fetch('/api/admin/games/upload', { method: 'POST', credentials: 'same-origin', body: new FormData(form) }); const data = await result.json().catch(() => ({})); if (!result.ok) throw new Error(data.error || 'Upload failed.'); msg.textContent = `Added ${data.title}. Launch page found: ${data.entry}`; form.reset(); await refresh(); renderAdminGames(); } catch (err) { msg.textContent = err.message; } finally { button.disabled = false; button.textContent = 'Upload game'; } });
$('#game-form').addEventListener('submit', async e => { e.preventDefault(); const form = e.currentTarget; const msg = $('#game-message'); msg.textContent = ''; const fd = new FormData(form); try { await api('/api/admin/games', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) }); msg.textContent = 'Game added.'; form.reset(); await refresh(); renderAdminGames(); } catch (err) { msg.textContent = err.message; } });
function renderAdminGames() { $('#admin-game-list').innerHTML = state.games.map(g => `<div class="admin-game-row"><span>${esc(g.title)} <small>· ${esc(g.category)}</small></span><button data-delete-game="${esc(g.id)}">Remove</button></div>`).join(''); }
function launchGame(g) {
  if (!g) return;
  if (!state.loggedIn) { open('login-modal'); return; }
  if (g.url) return;
  $('#game-content').innerHTML = `<div class="game-placeholder"><div><span class="eyebrow">COMING SOON</span><h2>${esc(g.title)}</h2><p>${esc(g.description || 'This game is ready for its webpage or game link. Add one from the admin panel.')}</p><button class="primary-button" data-close>Back to games</button></div></div>`;
  open('game-modal');
}
$('#logout-button').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); closeAll(); await refresh(); resetLogin(); notify('You’re logged out.'); });
let calc = '0', fresh = true;
function secretLogin() { calc = '0'; fresh = true; $('#lock-display').textContent = '0'; open('login-modal'); }
function calcKey(k) { const d = $('#lock-display'); if (!document.body.classList.contains('locked')) return; if (k === 'clear') { calc = '0'; fresh = true; } else if (k === 'back') { calc = calc.length > 1 ? calc.slice(0, -1) : '0'; } else if (k === 'equals') { if (calc === '1010') return secretLogin(); try { if (!/^[\d.+*/()\s-]+$/.test(calc) || !/[+*/-]/.test(calc.slice(1))) return; const result = Function(`"use strict";return (${calc})`)(); if (!Number.isFinite(result)) throw Error(); calc = String(Number(result.toPrecision(12))); fresh = true; } catch { calc = 'Error'; fresh = true; } } else if ('+-*/'.includes(k)) { if (calc === 'Error') calc = '0'; calc = calc.replace(/[+*/-]$/, '') + k; fresh = false; } else { if (calc === 'Error' || fresh && !'+-*/'.includes(k)) calc = '0'; if (k === '.' && calc.split(/[+*/-]/).at(-1).includes('.')) return; calc = calc === '0' && k !== '.' ? k : calc + k; fresh = false; if (calc === '1010') return secretLogin(); } d.textContent = calc.length > 17 ? calc.slice(0, 17) : calc; }
$$('.lock-keys button').forEach(b => b.addEventListener('click', () => calcKey(b.dataset.lockKey)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); resetLogin(); } const lockedCalc = document.body.classList.contains('locked') && $('#login-modal').classList.contains('hidden'); if (lockedCalc && ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/'].includes(e.key)) calcKey(e.key); if (lockedCalc && e.key === 'Enter') calcKey('equals'); if (lockedCalc && e.key === 'Backspace') calcKey('back'); });
refresh().catch(() => notify('Could not connect to BtrccStudy. Start the server and refresh.'));

