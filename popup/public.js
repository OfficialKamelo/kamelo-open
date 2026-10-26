// Popup van de gratis editie (zie src/edition.js en public.html). Kamelo Business gebruikt popup.js.
const { t, applyI18n, BROWSER } = globalThis.PrivacyI18n;
const C = globalThis.PrivacyConfig;
const S = globalThis.PrivacySites;
const $ = id => document.getElementById(id);

let settings = { ...C.DEFAULT_SETTINGS };
// Alleen deze instellingen horen bij de gratis editie; de rest (van het afschermen) schrijft deze popup niet terug.
const OWN = ['enabled', 'meloMac'];
let stored = {};
const load = s => { stored = s || {}; settings = { ...C.DEFAULT_SETTINGS, ...stored }; };
// Het actieve tabblad: een AI-site (waar Kamelo draait) of iets anders.
let site = { kind: 'none', host: '' };

const openTab = url => (chrome.tabs?.create ? chrome.tabs.create({ url }) : window.open(url, '_blank'));

function render() {
  const reload = site.kind === 'ai' && !site.running;
  const state = !settings.enabled ? 'off' : reload ? 'reload' : site.kind === 'ai' ? 'on' : 'ready';
  $('status').dataset.state = state;
  $('stateText').textContent = t(state === 'off' ? 'statusOff' : 'statusProtected');
  $('state').hidden = state === 'reload';
  $('reloadTab').hidden = state !== 'reload';
  $('enabled').checked = settings.enabled;
  $('tempChat').hidden = !!site.private;
  // Melo alleen als hij hier kan antwoorden: zelfde regel als "Ask Melo" in de melding (src/background.js, meloReady).
  $('openPrivateChat').hidden = !meloReady;
  $('macList').hidden = !onMac;
  $('meloMac').checked = !!settings.meloMac;
  // Aan, maar Melo voor Mac antwoordt niet: zeg waar je hem aanzet.
  const hint = !!settings.meloMac && meloReady !== null && meloReady !== 'mac';
  $('macSub').textContent = t(hint ? 'macHint' : 'macSub');
  $('macSub').classList.toggle('hint', hint);
}

function save() {
  stored = { ...stored, ...Object.fromEntries(OWN.map(k => [k, settings[k]])) };
  chrome.storage.local.set({ settings: stored });
  render();
}

$('enabled').addEventListener('change', e => { settings.enabled = e.target.checked; save(); });

// Tijdelijke chat: op een AI-site met een tijdelijke chat gaat dit tabblad erheen, met wat er al in het veld stond;
// anders een nieuw tabblad met een tijdelijke chat in ChatGPT.
$('tempChat').addEventListener('click', async () => {
  if (site.kind === 'ai' && site.running && S.siteFor(site.host)?.private) {
    try { await chrome.tabs.sendMessage(site.tab, { type: 'pf:private-open' }); } catch {}
  } else {
    openTab(S.SITES.find(s => s.name === 'ChatGPT').private.url);
  }
  window.close();
});

$('reloadTab').addEventListener('click', async () => {
  try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); if (tab) await chrome.tabs.reload(tab.id); } catch {}
  window.close();
});


// Melo als hij hier kan antwoorden: in Chrome als de AI van Chrome op deze computer kan draaien, en in elke browser met
// Melo voor Mac ('mac'). Anders brengt de melding je naar een tijdelijke chat. Tot de achtergrond antwoordt (een paar ms;
// dit start nooit een download) staat Melo er niet.
let meloReady = null; // null = nog geen antwoord
function askMelo() {
  chrome.runtime.sendMessage({ type: 'pf:melo-ready' }).then(r => { meloReady = r === 'mac' ? r : r === true; render(); }, () => {});
}
askMelo();

// Melo voor Mac (src/background.js): alleen op een Mac en niet in Safari (daar zit de extensie al in de app;
// PrivacyConfig.MELO_MAC_IN_POPUP). De rechten nativeMessaging en contextMenus (het menu "Melo, doe hier iets mee") zijn
// optioneel: Chrome vraagt ze pas bij deze klik, en wie Melo voor Mac niet heeft, ziet nooit een vraag.
let onMac = false;
chrome.runtime.getPlatformInfo?.().then(p => { onMac = C.MELO_MAC_IN_POPUP && p.os === 'mac' && BROWSER.id !== 'safari'; render(); }, () => {});
$('meloMac').addEventListener('change', e => {
  const on = e.target.checked;
  // Eerst de vraag om het recht (moet direct bij de klik), dan pas de instelling. Firefox sluit de popup bij die vraag:
  // daarom staat de instelling al aan, en controleert de achtergrond het recht zelf (macAllowed).
  const perms = { permissions: ['nativeMessaging', 'contextMenus'] };
  const asked = on ? chrome.permissions.request(perms) : chrome.permissions.remove(perms);
  settings.meloMac = on;
  save();
  asked.then(granted => { if (on && !granted) { settings.meloMac = false; save(); } }, () => {}).then(askMelo);
});
// sidePanel.open moet zonder await ervoor, anders telt de klik niet meer als gebruikersactie; daarom het venster-ID vooraf.
let pchatWindowId = null;
chrome.windows?.getCurrent().then(w => { pchatWindowId = w.id; }, () => {});
$('openPrivateChat').addEventListener('click', () => {
  if (meloReady === 'mac') return void chrome.runtime.sendMessage({ type: 'pf:mac-open' }).catch(() => {}).then(() => window.close());
  const fallback = () => chrome.runtime.sendMessage({ type: 'pf:pchat-window' }).catch(() => {}).then(() => window.close());
  if (chrome.sidePanel?.open && pchatWindowId != null) {
    chrome.sidePanel.open({ windowId: pchatWindowId }).then(() => window.close(), fallback);
  } else fallback();
  // Deze klik op het icoon gaf Melo toegang tot dit tabblad (activeTab): wachtte "Lees deze pagina" daarop, dan leest
  // Melo nu verder (chat/chat.js).
  chrome.storage.session.set({ pchatPopup: Date.now() }).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) { load(changes.settings.newValue); render(); }
});

// Dezelfde scripts als in manifest.json (zoals background.js bij installeren doet). Alleen op AI-chatsites: alleen
// daar heeft deze editie toegang.
async function inject(tabId) {
  for (const cs of chrome.runtime.getManifest().content_scripts || []) {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: cs.js, world: cs.world || 'ISOLATED' }).catch(() => {});
    // Ook de css (blauwe markering van gevoelige gegevens), net als background.js bij installeren.
    if (cs.css?.length) await chrome.scripting.insertCSS({ target: { tabId, allFrames: true }, files: cs.css }).catch(() => {});
  }
}

// Vraagt eerst het content script in het tabblad; lukt dat niet, dan de url (die deze editie alleen van AI-sites ziet).
async function detectSite() {
  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); } catch {}
  if (!tab) return { kind: 'none', host: '' };
  let status = null;
  try { status = await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' }); } catch {}
  let host = status?.host || '';
  if (!host) try { const url = new URL(tab.url); if (/^https?:$/.test(url.protocol)) host = url.hostname; } catch {}
  if (!host || !S.siteFor(host)) return { kind: 'none', host: '' };
  if (!status) { // tabblad dat al openstond voordat Kamelo werd geïnstalleerd of bijgewerkt
    await inject(tab.id);
    try { status = await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' }); } catch {}
  }
  return { kind: 'ai', host, running: !!status, private: !!status?.private, tab: tab.id };
}

applyI18n();
(async () => {
  load((await chrome.storage.local.get('settings')).settings);
  render();
  site = await detectSite();
  render();
})();
