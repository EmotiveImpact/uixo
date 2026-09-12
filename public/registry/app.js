const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
  component: '<path d="m12 3 4 4-4 4-4-4 4-4ZM5 10l4 4-4 4-4-4 4-4ZM19 10l4 4-4 4-4-4 4-4ZM12 17l4 4-4 4-4-4 4-4Z" transform="translate(1 -1) scale(.9)"/>',
  shapes: '<circle cx="7" cy="7" r="4"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="m3 21 4-7 4 7H3ZM14 3h7v7"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  check: '<path d="m7 12 3 3 7-7"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/><circle cx="12" cy="12" r="1"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  terminal: '<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m6 8 4 4-4 4M13 16h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5m0 3v1"/>',
};
function icon(name) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); node.setAttribute('viewBox', '0 0 24 24'); node.setAttribute('fill', 'none'); node.setAttribute('stroke', 'currentColor'); node.setAttribute('stroke-width', '1.4'); node.setAttribute('stroke-linecap', 'round'); node.setAttribute('stroke-linejoin', 'round'); node.setAttribute('aria-hidden', 'true'); node.innerHTML = icons[name] || icons.component; return node; }
$$('[data-icon]').forEach((el) => el.append(icon(el.dataset.icon)));
function el(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = String(text); return n; }
function button(text, className, action) { const n = el('button', className, text); n.type = 'button'; n.addEventListener('click', action); return n; }
function link(text, url, className = '') { const a = el('a', className, text); try { const target = new URL(url, location.origin); if (!['http:', 'https:'].includes(target.protocol)) return el('span', className, text); a.href = target.href; if (target.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } } catch { return el('span', className, text); } return a; }
function date(value) { if (!value || !Number.isFinite(Date.parse(value))) return 'Not verified'; return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)); }
const state = { providers: [], status: null, token: null, abort: null, sequence: 0, last: null, selected: null, review: null, assetSequence: 0, toastTimer: null };
let saved;
try { const raw = JSON.parse(localStorage.getItem('uixo.asset-saves.v2') || '[]'); saved = new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === 'string').slice(0, 200) : []); } catch { saved = new Set(); }
const view = () => new URL(location.href).searchParams.get('view') || 'assets';
const params = () => new URL(location.href).searchParams;
function notify(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { toast.hidden = true; }, 4500); }
async function copy(value, trigger) { try { await navigator.clipboard.writeText(value); notify('Copied to clipboard.'); if (trigger) { const prior = trigger.textContent; trigger.textContent = 'Copied ✓'; setTimeout(() => { trigger.textContent = prior; }, 1600); } } catch { notify('Clipboard unavailable. Select and copy the displayed text.'); } }
function persistSaved() { try { localStorage.setItem('uixo.asset-saves.v2', JSON.stringify([...saved])); } catch { notify('Browser storage is unavailable. Saves will last for this tab only.'); } $('#nav-saved').textContent = saved.size; }
function toggleSaved(id) { if (saved.has(id)) saved.delete(id); else { if (saved.size >= 200) return notify('This browser list holds up to 200 assets. Remove one before adding another.'); saved.add(id); } persistSaved(); $$('[data-save]').forEach((b) => { if (b.dataset.save === id) { b.setAttribute('aria-pressed', String(saved.has(id))); b.setAttribute('aria-label', saved.has(id) ? 'Unsave asset' : 'Save asset'); } }); if (view() === 'saved') void render(); }
function nav(changes = {}, reset = false) { const url = new URL(location.href); if (reset) url.search = ''; Object.entries(changes).forEach(([key, value]) => { if (value === undefined || value === null || value === '' || value === false) url.searchParams.delete(key); else url.searchParams.set(key, String(value)); }); if (!Object.hasOwn(changes, 'offset')) url.searchParams.delete('offset'); history.pushState({}, '', url.pathname + url.search); closeMenu(); void render(); }
window.addEventListener('popstate', () => { closeMenu(); void render(); });
$$('[data-view]').forEach((a) => a.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); nav({ view: a.dataset.view === 'assets' ? null : a.dataset.view }, true); }));
$$('[data-kind]').forEach((a) => a.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); nav({ kind: a.dataset.kind }, true); }));
function closeMenu() { $('#sidebar').classList.remove('open'); $('#menu-backdrop').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false'); }
$('#menu-toggle').addEventListener('click', () => { const opened = $('#sidebar').classList.toggle('open'); $('#menu-backdrop').hidden = !opened; $('#menu-toggle').setAttribute('aria-expanded', String(opened)); if (opened) $('.mobile-close').focus(); });
$('#menu-backdrop').addEventListener('click', closeMenu); $('[data-close-menu]').addEventListener('click', () => { closeMenu(); $('#menu-toggle').focus(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); if (event.key === '/' && !event.metaKey && !event.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.querySelector('dialog[open]') && ['assets', 'saved'].includes(view())) { event.preventDefault(); $('#search').focus(); } });
function theme(light) { document.documentElement.classList.toggle('light', light); $('#theme-toggle span:last-child').textContent = light ? 'Dark appearance' : 'Light appearance'; try { localStorage.setItem('uixo.registry.theme', light ? 'light' : 'dark'); } catch { /* optional storage */ } }
try { theme(localStorage.getItem('uixo.registry.theme') === 'light'); } catch { theme(false); }
$('#theme-toggle').addEventListener('click', () => theme(!document.documentElement.classList.contains('light')));
async function request(action, { method = 'GET', data, query = {}, signal } = {}) {
  const url = new URL('/api/registry', location.origin); url.searchParams.set('action', action);
  Object.entries(query).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, String(v)); });
  const headers = {}; if (state.token) headers.authorization = `Bearer ${state.token}`; if (data !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(url, { method, headers, credentials: 'same-origin', signal, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json().catch(() => ({ error: { message: 'The server returned an invalid response.' } }));
  if (!response.ok) { const error = new Error(result.error?.message || `Request failed (${response.status}).`); error.code = result.error?.code; throw error; } return result;
}
async function refreshStatus(signal) { const [status, providers] = await Promise.all([request('status', { signal }), request('providers', { signal })]); state.status = status; state.providers = providers.items; $('#nav-total').textContent = status.stats.assets; $('#storage-label').textContent = status.readOnly ? 'Read-only source snapshot' : 'Persistent asset registry'; $$('.curator-only').forEach((n) => { n.hidden = status.role !== 'curator'; }); const select = $('#filter-provider'); select.replaceChildren(new Option('Every source', '')); providers.items.forEach((p) => select.add(new Option(p.name, p.id))); return status; }
function skeleton() { const grid = el('div', 'asset-grid'); for (let i = 0; i < 6; i++) grid.append(el('div', 'skeleton')); return grid; }
function empty(title, description, { error = false, retry = true } = {}) { const box = el('section', 'empty-state'); box.append(icon(error ? 'alert' : 'search'), el('h2', '', title), el('p', '', description)); if (retry) box.append(button(error ? 'Try again' : 'Explore all assets', 'secondary-button', () => error ? void render() : nav({}, true))); return box; }
function providerName(id) { return state.providers.find((p) => p.id === id)?.name || id; }
function miniature(asset) {
  const wrap = el('div', 'schematic'); wrap.setAttribute('aria-hidden', 'true');
  const toolbar = '<div class="mini-toolbar"><i></i><i></i><i></i></div>';
  const lines = '<div class="mini-lines"><div class="mini-line"></div><div class="mini-line"></div><div class="mini-line"></div><div class="mini-line"></div></div>';
  const slug = asset.slug;
  // These are UIXO-authored, inert illustrations of component categories, not the upstream code.
  if (/sidebar|navigation|menubar|breadcrumb/.test(slug)) wrap.innerHTML = `<div class="mini-window">${toolbar}<div class="mini-sidebar">${lines}<div class="mini-panel"><div></div><div></div></div></div></div>`;
  else if (/button/.test(slug)) wrap.innerHTML = '<div class="mini-centred"><div class="mini-button">Make something great <span>↗</span></div><br /><div class="mini-button secondary">A quieter alternative</div></div>';
  else if (/accordion|select|command|combobox|menu/.test(slug)) wrap.innerHTML = '<div class="mini-window"><div class="mini-control"><span>A considered detail</span><span>+</span></div><div class="mini-control"><span>Small things matter</span><span>+</span></div><div class="mini-control"><span>Make it your own</span><span>+</span></div></div>';
  else if (/chart/.test(slug)) wrap.innerHTML = `<div class="mini-window">${toolbar}<div class="mini-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>`;
  else if (/progress|slider|skeleton|separator/.test(slug)) wrap.innerHTML = `<div class="mini-window">${toolbar}${lines}<br /><div class="mini-progress"></div></div>`;
  else if (/avatar/.test(slug)) wrap.innerHTML = '<div class="mini-dots"><i></i><i></i><i></i><i></i></div>';
  else if (/badge/.test(slug)) wrap.innerHTML = '<div class="mini-centred"><span class="mini-badge">In the details</span><span class="mini-badge">Thoughtfully made</span></div>';
  else if (/switch|checkbox|radio/.test(slug)) wrap.innerHTML = '<div class="mini-window"><div class="mini-switch"></div></div>';
  else if (/input|form|field|textarea|label/.test(slug)) wrap.innerHTML = `<div class="mini-window">${toolbar}<div class="mini-control">Something worth making</div><div class="mini-control">A little more detail…</div></div>`;
  else wrap.innerHTML = `<div class="mini-window">${toolbar}${lines}<br /><div class="mini-button">A useful little detail <span>↗</span></div></div>`;
  return wrap;
}
function preview(asset, detail = false) {
  const box = el('div', detail ? 'detail-preview' : 'asset-preview');
  if (asset.preview?.kind === 'image' && asset.preview.url) {
    const image = el('img', 'preview-icon'); image.loading = 'lazy'; image.alt = `${asset.name} from ${providerName(asset.providerId)}`;
    try { const url = new URL(asset.preview.url); if (url.origin !== 'https://raw.githubusercontent.com') throw new Error(); image.src = url.href; box.append(image); image.addEventListener('error', () => { const failed = el('span', 'tag', 'Preview unavailable'); image.replaceWith(failed); }); } catch { box.append(el('span', 'tag', 'Preview unavailable')); }
    box.append(el('span', 'preview-label', 'Original SVG · loaded from its source'));
  } else { box.append(miniature(asset), el('span', 'preview-label', 'UIXO schematic · not an upstream preview')); }
  return box;
}
function card(asset) {
  const item = el('article', 'asset-card');
  const open = button('', 'asset-open', () => void openAsset(asset.id)); open.setAttribute('aria-label', `Inspect ${asset.name} from ${providerName(asset.providerId)}`);
  open.append(preview(asset)); const meta = el('div', 'asset-meta'); const source = el('p', 'asset-provider', providerName(asset.providerId)); source.append(el('span', 'tiny-dot'), el('span', '', 'Indexed asset')); meta.append(source);
  const title = el('div', 'asset-title-row'); title.append(el('h2', '', asset.name)); meta.append(title, el('p', 'asset-description', asset.description));
  const bottom = el('div', 'asset-bottom'), tags = el('div', 'tags'); [...new Set(asset.variants.map((v) => v.framework === 'agnostic' ? v.format.toUpperCase() : v.framework[0].toUpperCase() + v.framework.slice(1)))].slice(0, 2).forEach((t) => tags.append(el('span', 'tag', t)));
  bottom.append(tags, el('span', '', asset.price === 'free' ? 'Free · licence terms apply' : asset.price === 'paid' ? 'Paid at source' : 'Access unknown')); meta.append(bottom); open.append(meta); item.append(open);
  const save = button('', 'save-button', () => toggleSaved(asset.id)); save.dataset.save = asset.id; save.setAttribute('aria-pressed', String(saved.has(asset.id))); save.setAttribute('aria-label', saved.has(asset.id) ? 'Unsave asset' : 'Save asset'); save.append(icon('bookmark')); item.append(save); return item;
}
const headers = {
  assets: ['GOOD SOURCES. USEFUL DETAILS.', 'Find your next', 'great detail.', 'Components and icons, with the source left intact. Find it, understand it, make it yours.'],
  saved: ['YOUR OWN LITTLE COLLECTION.', 'The good ones,', 'kept close.', 'Your saved assets stay in this browser. No account or automatic cloud synchronisation is implied.'],
  sources: ['QUALITY STARTS AT THE SOURCE.', 'A smaller list.', 'A better starting point.', 'Selected providers with a reason for being here. Source approval is not an endorsement of every individual asset.'],
  review: ['CURATION IS THE QUALITY GATE.', 'Your judgement.', 'Before publication.', 'Review new assets and changed revisions. Published records stay unchanged until you approve a replacement.'],
  scout: ['GROK FINDS. UIXO ORGANISES.', 'From a discovery', 'to a decision.', 'Keep your existing X scout. Import its findings with their post links and creator attribution intact.'],
  jobs: ['KNOW WHAT THE INDEX IS DOING.', 'Useful work.', 'A visible record.', 'Bounded indexing runs with persisted status and retries. New findings are staged, never automatically endorsed.'],
  connect: ['ONE REGISTRY. MORE WAYS TO USE IT.', 'Good taste,', 'within reach.', 'Give a coding agent access to sources, licence evidence and acquisition instructions through the UIXO MCP server.'],
};
function setHeader(current) { const h = headers[current] || headers.assets; $('#page-eyebrow').textContent = h[0]; $('#page-title').replaceChildren(document.createTextNode(h[1]), el('br'), el('span', '', h[2])); $('#page-description').textContent = h[3]; $('#breadcrumb-current').textContent = current === 'assets' ? 'Assets' : current[0].toUpperCase() + current.slice(1); $('#heading-note').hidden = current !== 'assets'; $('#discovery').hidden = !['assets', 'saved'].includes(current); $('#results-bar').hidden = !['assets', 'saved'].includes(current); $('#pagination').hidden = true; $$('[data-view]').forEach((n) => { n.classList.toggle('selected', n.dataset.view === current && (!params().get('kind') || current !== 'assets')); }); $$('[data-kind]').forEach((n) => { n.classList.toggle('selected', current === 'assets' && n.dataset.kind === params().get('kind')); }); document.title = `${current === 'assets' ? 'Asset library' : $('#breadcrumb-current').textContent} · UIXO`; }
async function render() {
  const seq = ++state.sequence; state.abort?.abort(); state.abort = new AbortController(); const signal = state.abort.signal;
  const current = view(), host = $('#view-content'); setHeader(current); host.setAttribute('aria-busy', 'true'); host.replaceChildren(skeleton());
  try {
    if (!state.status) await refreshStatus(signal);
    if (seq !== state.sequence) return;
    const p = params(); $('#search').value = p.get('q') || ''; ['kind', 'provider', 'framework', 'format'].forEach((key) => { $(`#filter-${key}`).value = p.get(key) || ''; }); $('#filter-commercial').checked = p.get('commercial') === 'true';
    if (['review', 'scout', 'jobs'].includes(current) && state.status.role !== 'curator') { host.replaceChildren(empty('A curator account is required.', 'Sign in through the existing UIXO account experience. Access is checked again on the server.', { retry: false })); host.firstChild.append(link('Go to your account', '/dashboard', 'secondary-button')); return; }
    let content;
    if (current === 'assets' || current === 'saved') content = await renderAssets(current, p, signal);
    else if (current === 'sources') content = renderSources();
    else if (current === 'review') content = await renderReview(signal);
    else if (current === 'scout') content = await renderScout(signal);
    else if (current === 'jobs') content = await renderJobs(signal);
    else if (current === 'connect') content = renderConnect();
    else content = empty('This page is not in the library.', 'Return to assets to continue exploring.');
    if (seq === state.sequence) host.replaceChildren(content);
  } catch (error) { if (error.name !== 'AbortError' && seq === state.sequence) { host.replaceChildren(empty('We could not load this view.', error.message, { error: true })); $('#result-count').textContent = 'Registry unavailable'; } }
  finally { if (seq === state.sequence) host.setAttribute('aria-busy', 'false'); }
}
async function renderAssets(current, p, signal) {
  if (current === 'saved' && !saved.size) { $('#result-count').textContent = '0 saved assets'; return empty('A little space for your favourites.', 'Save any asset using its bookmark button. Your collection will appear here.'); }
  const query = Object.fromEntries(p); delete query.view; query.limit = 12; if (current === 'saved') query.saved = [...saved].join(',');
  const result = await request('search', { query, signal }); state.last = result;
  $('#result-count').textContent = `${result.total.toLocaleString('en-GB')} ${current === 'saved' ? 'saved ' : ''}asset${result.total === 1 ? '' : 's'}${p.get('provider') ? ` from ${providerName(p.get('provider'))}` : ''}`;
  $('#result-method').textContent = 'Selected sources · Weighted keyword search';
  if (!result.items.length) return empty('Nothing quite matches. Yet.', 'Try fewer words or relax a filter. Unknown licence permissions are not treated as commercial-use permission.');
  const root = el('div');
  if (p.get('provider')) { const provider = state.providers.find((x) => x.id === p.get('provider')); if (provider) root.append(el('p', 'notice', `${provider.name}: ${provider.rationale}`)); }
  const grid = el('div', 'asset-grid'); result.items.forEach((a) => grid.append(card(a))); root.append(grid);
  $('#pagination').hidden = result.total <= result.limit; $('#previous-page').disabled = result.offset === 0; $('#next-page').disabled = result.nextOffset === null; $('#page-number').textContent = `${Math.floor(result.offset / result.limit) + 1} / ${Math.max(1, Math.ceil(result.total / result.limit))}`;
  return root;
}
function renderSources() { const root = el('div'), grid = el('div', 'source-grid'); state.providers.forEach((p) => { const card = el('article', 'source-card'); card.append(el('div', 'source-logo', p.id === 'shadcn' ? '∕∕' : p.id === 'lucide' ? '◌' : 'H'), el('h2', '', p.name), el('p', '', p.rationale)); const row = el('div', 'button-row'); row.append(button(`Explore ${p.assetCount} assets →`, 'secondary-button', () => nav({ provider: p.id }, true)), link('Visit source ↗', p.url, 'quiet-button')); card.append(row); grid.append(card); }); root.append(grid, el('p', 'notice', 'The initial library is a recorded source snapshot. Automatic indexing creates reviewable changes; it does not silently replace approved assets. Each asset carries its own licence evidence.')); return root; }
function readOnlyNotice(root) { if (state.status.readOnly) root.append(el('p', 'notice', 'This deployment is read-only. A persistent registry database and authenticated curator access are required to save changes.')); }
async function renderReview(signal) {
  const result = await request('queue', { signal }), root = el('div'); readOnlyNotice(root);
  root.append(el('p', 'notice', `${result.total} pending revision${result.total === 1 ? '' : 's'}. This view shows the oldest ${result.items.length}; the next items appear as decisions are made.`));
  if (!result.items.length) { root.append(empty('The review queue is clear.', 'New indexing runs will stage discoveries and changes here. Nothing receives an editorial endorsement automatically.', { retry: false })); return root; }
  const panel = el('section', 'workspace-panel'); result.items.forEach((item) => { const row = el('div', 'data-row'), main = el('div', 'row-main'); main.append(el('h3', '', item.asset.name), el('p', '', `${providerName(item.asset.providerId)} · ${item.asset.licence.expression} · ${date(item.createdAt)}`), el('small', '', item.asset.description)); const inspect = button('Inspect evidence', 'secondary-button', () => { state.review = item; void showAsset(item.asset, true); }); row.append(main, inspect, button('Review', 'primary-button', () => openReview(item))); panel.append(row); }); root.append(panel); return root;
}
function openReview(item) { state.review = item; $('#review-title').textContent = `Review ${item.asset.name}`; $('#review-summary').textContent = `${providerName(item.asset.providerId)} · ${item.asset.licence.expression}. Approval publishes this revision. It does not make it an editorial pick.`; $('#review-reason').value = ''; $('#review-error').textContent = ''; $('#asset-dialog').close(); $('#review-dialog').showModal(); $('#review-reason').focus(); }
async function decide(decision) { const reason = $('#review-reason').value.trim(); if (reason.length < 10) { $('#review-error').textContent = 'Give a reason of at least 10 characters.'; $('#review-reason').focus(); return; } const buttons = $$('#review-dialog button'); buttons.forEach((b) => { b.disabled = true; }); try { await request('review', { method: 'POST', data: { id: state.review.id, decision, reason } }); $('#review-dialog').close(); notify(decision === 'approve' ? 'Revision approved and published.' : 'Revision rejected.'); state.status = null; void render(); } catch (e) { $('#review-error').textContent = e.message; } finally { buttons.forEach((b) => { b.disabled = false; }); } }
$('#asset-dialog').addEventListener('close', () => { state.assetSequence++; });
$('#approve-revision').addEventListener('click', () => void decide('approve')); $('#reject-revision').addEventListener('click', () => void decide('reject'));
async function renderScout(signal) {
  const result = await request('scout', { signal }), root = el('div'); readOnlyNotice(root); const form = el('form', 'workspace-panel'); form.append(el('h2', '', 'Keep your X scout. Connect its output.'), el('p', '', 'Import an object containing an items array. Each discovery needs a url; postUrl, creator, note and collectedAt are preserved when supplied. Existing candidate exports also accept why as the note. Imports remain pending discoveries.'));
  const label = el('label', '', 'Choose a JSON export'); label.htmlFor = 'scout-file'; const file = el('input'); file.id = 'scout-file'; file.type = 'file'; file.accept = '.json,application/json'; const textarea = el('textarea'); textarea.id = 'scout-json'; textarea.rows = 7; textarea.maxLength = 200000; textarea.setAttribute('aria-label', 'Grok discovery JSON'); textarea.placeholder = '{"items":[{"url":"https://example.dev","postUrl":"https://x.com/creator/status/123","creator":"@creator","note":"A new component library"}]}';
  const error = el('p', 'form-error'); error.setAttribute('role', 'alert'); const submit = el('button', 'primary-button', 'Import discoveries'); submit.type = 'submit'; submit.disabled = state.status.readOnly;
  file.addEventListener('change', async () => { const selected = file.files?.[0]; if (!selected) return; if (selected.size > 200000) { error.textContent = 'The import must be smaller than 200 KB. Split larger exports into batches.'; return; } textarea.value = await selected.text(); error.textContent = ''; });
  form.addEventListener('submit', async (e) => { e.preventDefault(); error.textContent = ''; submit.disabled = true; try { const input = JSON.parse(textarea.value); if (!Array.isArray(input.items) || !input.items.length || input.items.length > 1000) throw new Error('Supply an items array containing 1 to 1,000 discoveries.'); let inserted = 0; for (let offset = 0; offset < input.items.length; offset += 100) { submit.textContent = `Importing batch ${Math.floor(offset / 100) + 1}…`; const response = await request('scout', { method: 'POST', data: { items: input.items.slice(offset, offset + 100) } }); inserted += response.inserted ?? 0; } notify(`${inserted} discoveries imported. Duplicates kept out.`); await render(); } catch (e) { error.textContent = e instanceof SyntaxError ? 'This is not valid JSON.' : e.message; } finally { submit.disabled = state.status.readOnly; } });
  form.append(label, file, textarea, error, submit); root.append(form);
  const panel = el('section', 'workspace-panel'); panel.append(el('h2', '', 'Discovery inbox'), el('p', '', 'These are leads, not approved sources. New provider adapters are added through a reviewed code change.'));
  if (!result.items.length) panel.append(el('p', '', 'No discoveries imported yet.'));
  result.items.forEach((item) => { const row = el('div', 'data-row'), main = el('div', 'row-main'); main.append(link(item.canonicalUrl || item.url, item.canonicalUrl || item.url), el('p', '', `${item.creator || 'Creator not supplied'} · ${date(item.collectedAt || item.createdAt)}`), el('small', '', item.note || 'No research note supplied.')); if (item.postUrl) main.append(link('Original post ↗', item.postUrl, 'quiet-button')); row.append(main, el('span', 'state-tag', item.status || 'pending')); panel.append(row); }); root.append(panel); return root;
}
async function renderJobs(signal) {
  const result = await request('jobs', { signal }), root = el('div'); readOnlyNotice(root);
  const panel = el('section', 'workspace-panel'); panel.append(el('h2', '', 'Index a selected source'), el('p', '', 'A run inspects at most 200 assets and uses a limited request budget. The server records a lease and retries failed runs up to three attempts. Results go to the review queue.'));
  const row = el('div', 'button-row'); state.providers.forEach((p) => { const b = button(`Queue ${p.name}`, 'secondary-button', async () => { b.disabled = true; try { const job = await request('enqueue', { method: 'POST', data: { providerId: p.id } }); notify(`Run queued: ${job.id}. Use Run now to execute it.`); await render(); } catch (e) { notify(e.message); b.disabled = false; } }); b.disabled = state.status.readOnly; row.append(b); }); panel.append(row); root.append(panel);
  const log = el('section', 'workspace-panel'); log.append(el('h2', '', 'Run history')); if (!result.items.length) log.append(el('p', '', 'No indexing runs yet. Queuing a run does not automatically execute it.'));
  result.items.forEach((job) => { const line = el('div', 'data-row'), main = el('div', 'row-main'); main.append(el('h3', '', providerName(job.providerId || job.provider_id)), el('p', '', `${job.id} · attempt ${job.attempts}/3`), el('small', '', `${date(job.updatedAt || job.updated_at)}${job.error ? ` · ${job.error}` : ''}`)); const tag = el('span', `state-tag ${job.status === 'complete' ? 'success' : job.status === 'failed' ? 'failure' : ''}`, job.status); line.append(main, tag); if (job.status === 'complete' && Number.isInteger(job.stats?.nextOffset)) { const more = button('Index next batch', 'secondary-button', async () => { more.disabled = true; try { await request('enqueue', { method: 'POST', data: { providerId: job.providerId || job.provider_id, afterJobId: job.id } }); notify('Next batch queued at the same source revision.'); await render(); } catch (e) { notify(e.message); more.disabled = false; } }); more.disabled = state.status.readOnly; line.append(more); } if (['queued', 'retry', 'running'].includes(job.status)) { const run = button('Run now', 'secondary-button', async () => { run.disabled = true; run.textContent = 'Running…'; try { const response = await request('run', { method: 'POST', data: { id: job.id } }); notify(`Run ${response.status || 'finished'}. Inspect its results before publication.`); await render(); } catch (e) { notify(e.message); await render(); } }); run.disabled = state.status.readOnly; line.append(run); } log.append(line); }); root.append(log); return root;
}
function renderConnect() {
  const root = el('div'), grid = el('div', 'connection-grid'), first = el('section', 'workspace-panel');
  first.append(el('h2', '', 'Bring the library into your workflow.'), el('p', '', 'The MCP interface shares the same registry, licence evidence and acquisition rules as this website. It returns instructions and source references, not silently installed files.'));
  const endpoint = `${location.origin}/api/mcp`; first.append(el('label', '', 'Remote MCP endpoint'), el('pre', 'code-block', endpoint), button('Copy endpoint', 'secondary-button', (e) => void copy(endpoint, e.currentTarget)));
  first.append(el('p', 'detail-section', 'For a local stdio connection, install the repository dependencies and run the registry MCP script. Connection options differ by client; consult docs/REGISTRY.md in the repository.'), el('pre', 'code-block', 'npm run registry:mcp'));
  const tools = el('section', 'workspace-panel'); tools.append(el('h2', '', 'Six tools. One useful loop.')); const list = el('div', 'tool-list'); const entries = [['search_assets', 'Search with hard licence and framework constraints.'], ['inspect_asset', 'Inspect a published asset and its evidence.'], ['get_preview', 'Get the preview reference and its limitations.'], ['check_compatibility', 'Compare declared requirements, without false certainty.'], ['resolve_asset', 'Find the authorised acquisition route.'], ['acquire_asset', 'Return a guarded recipe. Never execute it.']]; entries.forEach(([name, description]) => { const row = el('div'); row.append(el('code', '', name), el('small', '', description)); list.append(row); }); tools.append(list); grid.append(first, tools); root.append(grid);
  const note = el('p', 'notice'); note.append(el('strong', '', 'Eve is orchestration, not the registry. '), document.createTextNode(state.status.eveConfigured ? 'An Eve endpoint is configured. Configuration alone does not prove that a model run or deployment is healthy.' : 'No Eve endpoint is configured on this deployment. Search and acquisition still work independently. The separate Eve integration can inspect discoveries and queue bounded indexing work.')); root.append(note, el('p', 'notice', 'MCP availability must be verified with a real client after deployment. A working website is not proof of a healthy MCP connection.')); return root;
}
async function openAsset(id) { const sequence = ++state.assetSequence; const dialog = $('#asset-dialog'); $('#asset-content').replaceChildren(el('p', 'workspace-panel', 'Loading asset and licence evidence…')); dialog.showModal(); try { const asset = await request('asset', { query: { id } }); if (dialog.open && sequence === state.assetSequence) await showAsset(asset, false); } catch (e) { if (sequence !== state.assetSequence) return; $('#asset-content').replaceChildren(empty('Asset details are unavailable.', e.message, { error: true, retry: false })); } }
function section(title) { const s = el('section', 'detail-section'); s.append(el('h3', '', title)); return s; }
async function showAsset(asset, draft = false) {
  state.selected = asset; const host = $('#asset-content'); host.replaceChildren(preview(asset, true)); const body = el('div', 'detail-body');
  const top = el('div', 'detail-top'), heading = el('div'); heading.append(el('p', 'eyebrow', `${providerName(asset.providerId)} / ${draft ? 'PENDING REVISION' : 'INDEXED ASSET'}`)); const title = el('h2', '', asset.name); title.id = 'asset-title'; heading.append(title); top.append(heading);
  top.append(button(saved.has(asset.id) ? 'Saved ✓' : 'Save asset', 'secondary-button', (e) => { toggleSaved(asset.id); e.currentTarget.textContent = saved.has(asset.id) ? 'Saved ✓' : 'Save asset'; })); body.append(top, el('p', 'detail-description', asset.description));
  const columns = el('div', 'detail-columns'), left = el('div'), right = el('div'); const acquisition = section('Make it part of your project'); const variantLabel = el('label', '', 'Choose a variant'), select = el('select'); select.id = 'asset-variant'; variantLabel.htmlFor = select.id; asset.variants.forEach((v) => select.add(new Option(`${v.framework === 'agnostic' ? 'Framework agnostic' : v.framework} / ${v.format.toUpperCase()}`, v.id))); const desired = asset.variants.find((v) => v.framework === params().get('framework') && (!params().get('format') || v.format === params().get('format'))); if (desired) select.value = desired.id; acquisition.append(variantLabel, select); const resolution = el('div'); acquisition.append(resolution); left.append(acquisition);
  const compatibility = section('Compatibility, without the guesswork.'); compatibility.append(el('p', '', 'Compare the selected variant with a React project using Tailwind. This checks metadata, not whether the component renders successfully.')); const check = button('Check React + Tailwind', 'secondary-button', async () => { check.disabled = true; try { const result = await request('compatibility', { method: 'POST', data: { id: asset.id, variantId: select.value, project: { framework: 'react', css: 'tailwind', packages: {} } } }); output.replaceChildren(el('p', '', result.status), el('p', '', result.reasons.join(' '))); if (result.missingDependencies.length) output.append(el('p', '', `Missing dependencies: ${result.missingDependencies.join(', ')}`)); } catch (e) { output.textContent = e.message; } finally { check.disabled = false; } }); const output = el('div', 'notice'); output.hidden = true; check.addEventListener('click', () => { output.hidden = false; }); compatibility.append(check, output); if (!draft) left.append(compatibility);
  const licence = section('Licence & provenance');
  const dataRows = [['Licence', asset.licence.expression], ['Commercial use', asset.licence.commercial], ['Redistribution', asset.licence.redistribution], ['Source evidence observed', date(asset.verifiedAt)], ['Individual editorial pick', asset.editorialPick ? 'Yes' : 'No']]; dataRows.forEach(([name, value]) => { const row = el('div', 'detail-meta-row'); row.append(el('span', '', name), el('strong', '', value)); licence.append(row); }); licence.append(el('p', '', asset.licence.note)); const details = el('details'); details.append(el('summary', '', 'Read the complete licence notices'), el('pre', 'licence-text', asset.licence.text || 'No licence text is available.')); licence.append(details); right.append(licence);
  const evidence = section('Go to the evidence'), evidenceList = el('div', 'evidence-list'); asset.evidence.forEach((e) => { const item = el('div'); item.append(link(`${e.field} ↗`, e.url), el('p', '', `${e.method} · ${date(e.observedAt)}${e.reference ? ` · ${e.reference.slice(0, 12)}` : ' · mutable source reference'}`)); evidenceList.append(item); }); evidence.append(evidenceList, link('Open original source ↗', asset.sourceUrl, 'secondary-button')); right.append(evidence);
  columns.append(left, right); body.append(columns); if (draft) body.append(button('Review this revision →', 'primary-button', () => openReview(state.review))); host.append(body); if (!$('#asset-dialog').open) $('#asset-dialog').showModal();
  let resolutionSequence = 0;
  async function updateResolution() { const current = ++resolutionSequence; resolution.replaceChildren(el('p', 'notice', draft ? 'Pending revisions cannot be acquired until approved.' : 'Resolving the authorised source…')); if (draft) return; try { const result = await request('resolve', { method: 'POST', data: { id: asset.id, variantId: select.value } }); if (current !== resolutionSequence) return; resolution.replaceChildren(el('p', 'notice', result.message)); const selected = asset.variants.find((v) => v.id === select.value); if (selected.dependencies.length) resolution.append(el('p', 'detail-description', `Dependencies: ${selected.dependencies.join(', ')}`)); if (result.command) { const command = [result.command.executable, ...result.command.arguments].map((part) => /^[a-zA-Z0-9@/.:_=-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`).join(' '); resolution.append(el('pre', 'code-block', command), button('Copy instruction', 'secondary-button', (e) => void copy(command, e.currentTarget))); }
    const links = el('div', 'button-row'); links.append(link(result.status === 'ready' ? 'Open authorised source ↗' : 'Review original source ↗', result.url || asset.sourceUrl, 'secondary-button')); resolution.append(links, el('p', 'detail-description', 'UIXO has not executed this instruction. Review third-party files before integrating them and retain their licence notices.'));
    } catch (e) { if (current === resolutionSequence) resolution.replaceChildren(el('p', 'notice', e.message)); } }
  select.addEventListener('change', () => { output.hidden = true; void updateResolution(); }); await updateResolution();
}
$$('.dialog-close').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$$('dialog').forEach((d) => d.addEventListener('click', (event) => { if (event.target === d) { const r = d.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) d.close(); } }));
let searchTimer; $('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => nav({ q: $('#search').value }), 280); });
$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(searchTimer); nav({ q: $('#search').value }); });
['kind', 'provider', 'framework', 'format'].forEach((key) => $(`#filter-${key}`).addEventListener('change', (e) => nav({ [key]: e.target.value })));
$('#filter-commercial').addEventListener('change', (e) => nav({ commercial: e.target.checked ? 'true' : null })); $('#reset-filters').addEventListener('click', () => nav({ view: view() === 'saved' ? 'saved' : null }, true));
$('#previous-page').addEventListener('click', () => { nav({ offset: Math.max(0, (state.last?.offset || 0) - 12) }); $('#discovery').scrollIntoView({ block: 'start' }); });
$('#next-page').addEventListener('click', () => { if (state.last?.nextOffset !== null) nav({ offset: state.last.nextOffset }); $('#discovery').scrollIntoView({ block: 'start' }); });
persistSaved();
try { const response = await fetch('/api/auth/token', { credentials: 'same-origin' }); if (response.ok) { const data = await response.json(); if (typeof data.token === 'string') state.token = data.token; } } catch { /* browsing remains public */ }
await render();
