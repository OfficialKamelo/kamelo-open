const D = globalThis.PrivacyDetector;
const { t, typeLabel, typesLabel, applyI18n } = globalThis.PrivacyI18n;
const C = globalThis.PrivacyConfig;
const S = globalThis.PrivacySites;
const $ = id => document.getElementById(id);
const DEFAULT_SETTINGS = C.DEFAULT_SETTINGS;

let settings = { ...DEFAULT_SETTINGS };
let vault = D.emptyVault();
// Het actieve tabblad: een AI-site, een gewone website, of een pagina waar extensies niet mogen draaien.
let site = { kind: 'none', name: '', host: '' };
let protect = null;   // instellingen van de kluisbeveiliging (of null als die uit staat)
let locked = false;   // kluis beveiligd en nog niet ontgrendeld
let stats = {};       // maandoverzicht: alleen tellingen per soort (zie stats.js)

// De kluis staat in het werkgeheugen; de achtergrond schrijft hem (zo nodig versleuteld) naar schijf.
const saveVault = () => chrome.storage.session.set({ vault });

const typeOf = ph => ph.slice(1, ph.lastIndexOf('_'));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
// Korte sitenaam voor de kop: het registreerbare domein (shop.example.co.uk → example.co.uk), zonder www.
// Benadering zonder lijst: een korte tweede laag onder een landcode (co.uk, com.au) telt mee.
function shortHost(host) {
  const parts = host.replace(/^www\./, '').split('.');
  if (parts.length <= 2 || /^\d+$/.test(parts.at(-1))) return parts.join('.');
  const n = parts.at(-1).length === 2 && parts.at(-2).length <= 3 ? 3 : 2;
  return parts.slice(-n).join('.');
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function item(primary, secondary, onRemove) {
  const text = el('div', { className: 'item-text' }, el('strong', { textContent: primary }));
  if (secondary) text.append(el('span', { textContent: secondary }));
  const row = el('div', { className: 'item' });
  if (onRemove) {
    const remove = el('button', { className: 'remove', type: 'button', ariaLabel: t('remove', { item: primary }) });
    remove.addEventListener('click', onRemove);
    row.append(remove);
  }
  row.append(text);
  return row;
}

// ---------- Weergave ----------

// Ooit iets afgeschermd? Zo niet, dan staat er een knop om het te proberen in plaats van het getal.
const everMasked = () => Object.values(stats || {}).some(m => Object.values(m || {}).some(n => n > 0));

// Hoofdscherm: alleen aan (groen, "Beschermd") of uit (grijs). Geen sitenaam, geen uitleg.
function renderMain() {
  const custom = site.kind === 'web' && settings.customAiSites.includes(site.name);
  const name = site.kind === 'none' ? '' : shortHost(site.host);
  const reload = site.kind !== 'none' && !site.running;
  const state = !settings.enabled ? 'off' : reload ? 'reload' : site.kind === 'none' ? 'none' : 'on';
  $('status').dataset.state = state;
  $('stateText').textContent = t({ on: 'statusProtected', none: 'statusNone', off: 'statusOff' }[state] || 'statusProtected');
  $('state').hidden = state === 'reload';
  $('reloadTab').hidden = state !== 'reload';
  $('enabled').checked = settings.enabled;

  const { total } = PrivacyStats.month(stats);
  const first = !everMasked();
  $('proof').hidden = first;
  $('ready').hidden = !first;
  $('statsValue').textContent = total.toLocaleString(PrivacyI18n.LANG);

  // Vergrendeld staat één keer in beeld: onderaan bij de kluis.
  $('footVault').parentElement.classList.toggle('locked', locked);
  $('total').textContent = locked ? t('locked') : Object.keys(vault.byPlaceholder).length;
  $('securityValue').textContent = !protect ? t('off') : protect.touch ? t('methodTouch') : t('password');
  $('securityTile').className = `tile ${protect ? 'blue' : 'gray'}`;
  // "Elk tekstveld afschermen" staat in Instellingen, onder deze site.
  $('siteRow').hidden = site.kind !== 'web';
  $('siteSection').textContent = t('thisSite', { site: name });
  $('siteAi').checked = custom;
}

// Maandoverzicht: het totaal en de vier soorten die het vaakst zijn afgeschermd, met een balkje.
function renderStats() {
  const { total, types } = PrivacyStats.month(stats);
  const month = new Date().toLocaleDateString(PrivacyI18n.LANG, { month: 'long' });
  $('statsTotal').textContent = total.toLocaleString(PrivacyI18n.LANG);
  $('statsTotal').hidden = !total;
  $('statsCaption').textContent = t(total ? 'statsCaption' : 'statsEmpty', { month });
  const top = types.slice(0, 4);
  const rest = types.slice(4).reduce((sum, [, n]) => sum + n, 0);
  if (rest) top.push(['OTHER', rest]);
  const max = Math.max(1, ...top.map(([, n]) => n));
  $('statsList').replaceChildren(...top.map(([type, n]) => {
    const fill = el('span');
    fill.style.width = `${Math.max(4, Math.round((n / max) * 100))}%`;
    return el('div', { className: 'stat' },
      el('span', { className: 'stat-label', textContent: typesLabel(type) }),
      el('span', { className: 'stat-bar' }, fill),
      el('span', { className: 'stat-n', textContent: n.toLocaleString(PrivacyI18n.LANG) }));
  }));
}

// Echte waarden in de kluis zijn standaard vervaagd (schermdelen); het oogje rechtsboven toont ze.
let revealed = false;
function renderVault() {
  const q = $('search').value.trim().toLowerCase();
  const entries = Object.entries(vault.byPlaceholder).reverse().filter(([ph, v]) =>
    !q || v.toLowerCase().includes(q) || ph.toLowerCase().includes(q) || typeLabel(typeOf(ph)).includes(q));
  $('vaultList').classList.toggle('blurred', !revealed);
  $('vaultReveal').setAttribute('aria-pressed', String(revealed));
  $('vaultReveal').title = t(revealed ? 'vaultHide' : 'vaultShow');
  $('vaultReveal').setAttribute('aria-label', $('vaultReveal').title);
  $('vaultReveal').hidden = locked || !entries.length;
  $('vaultList').replaceChildren(...(locked ? []
    : entries.length
      ? entries.map(([ph, value]) => item(value, `${capitalize(typeLabel(typeOf(ph)))} · ${ph}`))
      : [el('p', { className: 'empty', textContent: q ? t('noResults') : t('vaultEmpty') })]));
  // Vergrendeld: alleen het ontgrendelpaneel. Open en beveiligd: ook een knop om te vergrendelen.
  $('lockPanel').hidden = !locked;
  for (const id of ['searchBox', 'vaultList', 'vaultActions']) $(id).hidden = locked;
  $('unlockTouch').hidden = !protect?.touch;
  $('unlockPassword').hidden = !protect?.password;
  $('lockNow').hidden = !protect;
}

function renderSettings() {
  $('restore').checked = settings.restore;
  $('retention').value = String(settings.retentionDays);
  $('topicWarnings').checked = settings.topicWarnings;
  for (const list of ['customTerms', 'allowList', 'customAiSites']) {
    $(`${list}List`).replaceChildren(...settings[list].map((term, i) => item(term, list === 'allowList' ? origin(term) : '', () => {
      settings[list] = settings[list].filter((_, j) => j !== i);
      if (list === 'allowList' && settings.allowMeta) delete settings.allowMeta[term.toLowerCase()];
      saveSettings();
    })));
  }
  $('markedAiSection').hidden = !settings.customAiSites.length; // lege sectie niet tonen
  $('sitesEmpty').hidden = !!settings.customAiSites.length || site.kind === 'web';

  // Op de categorieën: kort wat er nu ingesteld staat.
  const terms = settings.customTerms.length + settings.allowList.length;
  $('catMaskValue').textContent = terms ? String(terms) : '';
  $('catVaultValue').textContent = t({ 1: 'after1', 7: 'after7', 30: 'after30', 90: 'after90', 0: 'never' }[settings.retentionDays] || 'after30');
  $('catSitesValue').textContent = settings.customAiSites.length ? String(settings.customAiSites.length) : '';
  $('versionNote').textContent = `Kamelo ${chrome.runtime?.getManifest?.().version || ''}`.trim();
}

// Waar een uitzondering vandaan komt (een klik in de melding op een site), zodat een misklik terug te vinden is.
function origin(term) {
  const meta = settings.allowMeta?.[term.toLowerCase()];
  if (!meta) return '';
  const date = new Date(meta.at).toLocaleDateString(PrivacyI18n.LANG, { day: 'numeric', month: 'short' });
  return t('exceptionFrom', { site: meta.site, date });
}

// ---------- Tekst afschermen (voor plekken waar Kamelo niet bij kan) ----------
// Eén vak: gewone tekst wordt afgeschermd, een AI-antwoord met placeholders krijgt de echte gegevens terug.
// De voorvertoning rekent op een kopie van de kluis; pas bij kopiëren komen nieuwe gegevens in de kluis.
const PH_RE = /\[[A-Z]+_\d+\]/g;
// Eigen plek in de kluis ('popup'): geen website kan deze gegevens terugvragen (zie de kluis per site in 1.3.0).
// Terugzetten gebeurt hier zonder plek, dus met alles uit de kluis: de popup is van jou, niet van een website.
const maskOpts = () => ({ customTerms: settings.customTerms, allowList: settings.allowList, scope: 'popup' });
const known = text => (text.match(PH_RE) || []).filter(ph => ph in vault.byPlaceholder);
let maskState = { mode: 'none', out: '' };

function renderMask() {
  const input = $('maskInput').value;
  $('maskLocked').hidden = !locked;
  for (const id of ['composer', 'maskCopy', 'maskHint']) $(id).hidden = locked;
  if (locked) return;
  const restore = known(input).length > 0;
  let out = input, n = 0, marks = [];
  if (restore) {
    n = new Set(known(input)).size;
    out = D.restore(input, vault);
    for (const ph of new Set(known(input))) marks.push(vault.byPlaceholder[ph]);
  } else if (input.trim()) {
    const r = D.mask(input, structuredClone(vault), maskOpts());
    out = r.text; n = new Set(r.items.map(it => it.placeholder)).size;
    marks = r.items.map(it => it.placeholder);
  }
  maskState = { mode: !input.trim() ? 'none' : restore ? 'restore' : n ? 'mask' : 'plain', out };
  $('maskResult').hidden = maskState.mode === 'none';
  $('maskResult').dataset.mode = maskState.mode;
  $('maskSummary').textContent = restore ? t(n === 1 ? 'restoreFoundOne' : 'restoreFound', { n })
    : n ? t(n === 1 ? 'maskFoundOne' : 'maskFound', { n }) : t('maskNone');
  $('maskPreview').replaceChildren(...highlight(out, marks, restore ? 'real' : 'ph'));
  $('maskCopy').disabled = maskState.mode === 'none';
  $('maskCopyLabel').textContent = t(restore ? 'copyRestored' : n ? 'copyMasked' : 'copyAsIs');
}

// Zet de afgeschermde (of teruggezette) stukken in een gekleurd label; de rest blijft gewone tekst.
function highlight(text, marks, cls) {
  const want = [...new Set(marks)].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!want.length) return [text];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.split(new RegExp(`(${want.map(esc).join('|')})`, 'g'))
    .map((part, i) => (i % 2 ? el('span', { className: cls, textContent: part }) : part));
}

async function copyMask() {
  const btn = $('maskCopy');
  if (btn.disabled) return;
  let out = maskState.out;
  if (maskState.mode === 'mask') {
    const r = D.mask($('maskInput').value, vault, maskOpts());
    out = r.text;
    await saveVault();
    const counts = {};
    for (const ph of new Set(r.items.map(it => it.placeholder))) { const type = typeOf(ph); counts[type] = (counts[type] || 0) + 1; }
    chrome.runtime.sendMessage({ type: 'pf:count', counts }).catch(() => {});
  }
  try { await navigator.clipboard.writeText(out); } catch {}
  btn.classList.add('done');
  $('maskCopyLabel').textContent = t('copied');
  clearTimeout(copyMask.timer);
  copyMask.timer = setTimeout(() => { btn.classList.remove('done'); renderMask(); }, 1400);
}

$('maskInput').addEventListener('input', renderMask);
$('maskInput').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); copyMask(); } });
$('maskCopy').addEventListener('click', copyMask);

function render() { renderMain(); renderStats(); renderVault(); renderSettings(); renderMask(); }

function saveSettings() {
  chrome.storage.local.set({ settings });
  render();
}

// ---------- Navigatie ----------

function open(view) {
  for (const name of ['main', 'stats', 'vault', 'settings', 'set-mask', 'set-vault', 'set-sites', 'mask']) $(`view-${name}`).hidden = name !== view;
  if (revealed && view !== 'vault') { revealed = false; renderVault(); } // weer vervagen zodra je de kluis verlaat
  if (view === 'mask' && !locked) $('maskInput').focus();
}
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => open(b.dataset.open)));

// De kluispagina opent in een eigen venster: een popup sluit zodra Touch ID om je vingerafdruk vraagt.
document.querySelectorAll('[data-security]').forEach(b => b.addEventListener('click', () => {
  const url = chrome.runtime?.getURL ? chrome.runtime.getURL('unlock/unlock.html') : '../unlock/unlock.html';
  if (chrome.windows?.create) chrome.windows.create({ url, type: 'popup', width: 420, height: 640 });
  else window.open(url, '_blank', 'width=420,height=640');
  window.close();
}));

// Een e-mail aan de ontwikkelaar met de site, versie en browser al ingevuld. Alleen de hostnaam: geen pad, geen tekst, geen kluis.
$('report').addEventListener('click', () => {
  const ua = navigator.userAgentData;
  const brand = ['Microsoft Edge', 'Google Chrome', 'Chromium'].map(name => ua?.brands?.find(b => b.brand === name)).find(Boolean);
  const details = [
    `Site: ${site.host || '-'}`,
    `Kamelo: ${chrome.runtime.getManifest().version}`,
    `Browser: ${[brand && `${brand.brand.replace(/^(Google|Microsoft) /, '')} ${brand.version}`, ua?.platform].filter(Boolean).join(', ') || '-'}`,
  ];
  const body = `${t('reportBody')}\n\n\n---\n${details.join('\n')}`;
  const url = `mailto:${C.SUPPORT_EMAIL}?subject=${encodeURIComponent(t('reportSubject', { site: site.host || 'Kamelo' }))}&body=${encodeURIComponent(body)}`;
  Object.assign(document.createElement('a'), { href: url }).click();
  window.close();
});

const openTab = url => (chrome.tabs?.create ? chrome.tabs.create({ url }) : window.open(url, '_blank'));
$('openWelcome').addEventListener('click', () => openTab('https://kamelo.eu/#how'));
$('tryIt').addEventListener('click', () => openTab('https://chatgpt.com/'));
// Tabblad dat Kamelo nog niet kent (bijv. geopend vóór installeren): verversen zet hem aan.
$('reloadTab').addEventListener('click', async () => {
  try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); if (tab) await chrome.tabs.reload(tab.id); } catch {}
  window.close();
});

// ---------- Kluis ontgrendelen en vergrendelen ----------

const L = globalThis.PrivacyVaultLock;
const lockMsg = (text, error = false) => { $('lockMsg').textContent = text; $('lockMsg').classList.toggle('error', error); };

$('unlockPassword').addEventListener('submit', async e => {
  e.preventDefault();
  lockMsg('');
  try {
    await L.unlockPassword($('pw').value);
    $('pw').value = '';
  } catch (err) {
    lockMsg(err.message, true);
    $('pw').select();
  }
});

// Touch ID in een eigen klein venster, dat meteen om je vingerafdruk vraagt en daarna weer sluit.
$('unlockTouch').addEventListener('click', () => {
  const url = chrome.runtime.getURL('unlock/unlock.html?touch');
  chrome.windows.create({ url, type: 'popup', width: 420, height: 640 });
  window.close();
});

$('lockNow').addEventListener('click', async () => {
  await L.lock();
  $('search').value = '';
});

// ---------- Acties ----------

$('enabled').addEventListener('change', e => { settings.enabled = e.target.checked; saveSettings(); });
$('restore').addEventListener('change', e => { settings.restore = e.target.checked; saveSettings(); });
$('topicWarnings').addEventListener('change', e => {
  settings.topicWarnings = e.target.checked;
  if (settings.topicWarnings) settings.mutedTopics = []; // weer aan: ook de onderwerpen die je had uitgezet
  saveSettings();
});
$('search').addEventListener('input', renderVault);
$('vaultReveal').addEventListener('click', () => { revealed = !revealed; renderVault(); });

$('siteAi').addEventListener('change', e => {
  const others = settings.customAiSites.filter(h => h !== site.name);
  settings.customAiSites = e.target.checked ? [...others, site.name] : others;
  saveSettings();
});

$('retention').addEventListener('change', async e => {
  settings.retentionDays = Number(e.target.value);
  saveSettings();
  if (D.prune(vault, settings.retentionDays)) await saveVault();
});

document.querySelectorAll('form.add').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  const input = form.querySelector('input');
  const term = input.value.trim();
  const list = form.dataset.list;
  if (term && !settings[list].some(t => t.toLowerCase() === term.toLowerCase())) {
    settings[list] = [...settings[list], term];
    saveSettings();
  }
  input.value = '';
}));

let clearTimer;
$('clear').addEventListener('click', async () => {
  const btn = $('clear');
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.textContent = t('clearConfirm');
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = t('clearVault'); }, 4000);
    return;
  }
  clearTimeout(clearTimer);
  vault = { ...D.emptyVault(), counters: vault.counters || {} }; // tellers houden: placeholders nooit hergebruiken
  await saveVault();
  btn.dataset.confirm = '';
  btn.textContent = t('clearVault');
  render();
});

// ---------- Laden ----------

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session') {
    if (changes.vault) vault = changes.vault.newValue || D.emptyVault();
    if (changes.locked) locked = !!changes.locked.newValue;
  }
  if (area === 'local') {
    if (changes.settings) settings = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue || {}) };
    if (changes.protect) protect = changes.protect.newValue || null;
    if (changes.stats) stats = changes.stats.newValue || {};
  }
  render();
});

applyI18n();

(async () => {
  await PrivacyVault.ensureReady();
  const [local, session] = await Promise.all([
    chrome.storage.local.get(['settings', 'protect', 'stats']), chrome.storage.session.get(['vault', 'locked']),
  ]);
  settings = { ...DEFAULT_SETTINGS, ...(local.settings || {}) };
  protect = local.protect || null;
  stats = local.stats || {};
  vault = session.vault || D.emptyVault();
  locked = !!session.locked;
  const before = JSON.stringify(vault.lastUsed || null);
  D.prune(vault, settings.retentionDays);
  if (JSON.stringify(vault.lastUsed) !== before) await saveVault();
  site = await detectSite();
  render();
})();

// Dezelfde scripts als in manifest.json, in alle frames van het tabblad (zoals background.js bij installeren doet).
async function inject(tabId) {
  for (const cs of chrome.runtime.getManifest().content_scripts || []) {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: cs.js, world: cs.world || 'ISOLATED' })
      .catch(() => {}); // bijv. de Chrome Web Store, waar extensies niet mogen komen
  }
}

// Vraagt eerst het content script in het tabblad (dat weet zeker of Kamelo daar draait);
// lukt dat niet, dan valt het terug op de url van het tabblad.
async function detectSite() {
  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); } catch {}
  if (!tab) return { kind: 'none', name: '', host: '', running: false };

  let status = null;
  try { status = await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' }); } catch {}
  // Tabblad dat al openstond voordat Kamelo werd geïnstalleerd of bijgewerkt: Kamelo daar nu alsnog starten,
  // zodat niemand eerst hoeft te verversen.
  if (!status && /^https?:/.test(tab.url || '')) {
    await inject(tab.id);
    try { status = await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' }); } catch {}
  }

  let host = status?.host;
  let web = !!status;
  if (!host) {
    try {
      const url = new URL(tab.url);
      host = url.hostname;
      web = /^https?:$/.test(url.protocol);
    } catch {}
  }
  if (!host || !web) return { kind: 'none', name: '', host: '', running: false };
  const ai = S.siteFor(host);
  return ai ? { kind: 'ai', name: ai.name, host, running: !!status } : { kind: 'web', name: host, host, running: !!status };
}
