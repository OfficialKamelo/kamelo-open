// Kamelo — achtergrond.
// - Opent de welkomstpagina na installatie.
// - Beheert de kluis: de actuele kluis staat in chrome.storage.session (alleen in het werkgeheugen);
//   deze service schrijft hem naar schijf: versleuteld als de kluisbeveiliging aanstaat, anders gewoon.
// In Firefox laadt het manifest deze bestanden zelf (background.scripts); daar bestaat importScripts niet.
if (typeof importScripts === 'function') importScripts('vaultcrypto.js', 'vaultstore.js', 'stats.js');

// In een eigen blok, zodat namen niet botsen als dit script samen met een pagina wordt geladen (previews).
{
const PC = globalThis.PrivacyCrypto;

const { emptyVault, initSession } = globalThis.PrivacyVault;

// Na verwijderen opent de browser kamelo.eu/goodbye: waarom weg, met een oplossing per reden. Een gewone pagina, zonder gegevens erbij.
chrome.runtime.setUninstallURL('https://kamelo.eu/goodbye');

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install' && reason !== 'update') return;
  injectIntoOpenTabs();
  // Na installatie: de bedankpagina op kamelo.eu. Dat is een gewoon tabblad; Kamelo stuurt zelf niets.
  if (reason === 'install') chrome.tabs.create({ url: 'https://kamelo.eu/welcome' });
});

// Chrome voert content scripts alleen uit op pagina's die na het installeren of bijwerken worden geladen.
// Zonder dit werkt Kamelo niet in tabbladen die al openstonden, tot de gebruiker ze herlaadt.
async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).catch(() => []);
  const entries = chrome.runtime.getManifest().content_scripts || [];
  for (const tab of tabs) {
    if (tab.discarded) continue; // wordt bij het openen opnieuw geladen, en krijgt de scripts dan vanzelf
    for (const cs of entries) {
      chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: cs.js, world: cs.world || 'ISOLATED' })
        .catch(() => {}); // bijv. de Chrome Web Store, waar extensies niet mogen komen
    }
  }
}

// De bètaversie (tools/pack.mjs --beta) draagt een β op het icoon, zodat hij niet te verwarren is met de gewone.
if (/beta/i.test(chrome.runtime.getManifest().version_name || '')) {
  chrome.action.setBadgeText({ text: 'β' });
  chrome.action.setBadgeBackgroundColor({ color: '#6e6e73' });
}

// Content scripts moeten de (ontgrendelde) kluis in het werkgeheugen kunnen lezen.
// Firefox kent setAccessLevel niet: daar geeft deze achtergrond de kluis door (zie RELAY hieronder).
const RELAY = typeof chrome.storage.session.setAccessLevel !== 'function';
if (!RELAY) chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

// Eén keer per browsersessie de kluis in het werkgeheugen zetten (zie vaultstore.js).
let initPromise = null;
const init = () => (initPromise ??= initSession());

// Wijzigingen in de kluis naar schijf schrijven (één tegelijk, in volgorde).
let queue = Promise.resolve();
function persist(vault) {
  queue = queue.then(async () => {
    if (!vault) return;
    const { protect } = await chrome.storage.local.get('protect');
    if (!protect) return chrome.storage.local.set({ vault });
    protect.counters = vault.counters; // tellers zijn geen gevoelige gegevens
    const { key } = await chrome.storage.session.get('key');
    if (!key) return chrome.storage.local.set({ protect }); // vergrendeld: oude versleutelde kluis blijft staan
    const vaultEnc = await PC.encryptJSON(await PC.importAesRaw(PC.unb64(key)), vault);
    await chrome.storage.local.set({ vaultEnc, protect });
  }).catch(err => console.error('[Kamelo] kluis opslaan mislukt', err));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.vault) {
    persist(changes.vault.newValue);
    if (RELAY) broadcastVault(changes.vault.newValue);
  }
});

// Firefox: content scripts krijgen een gewijzigde kluis als bericht, omdat ze storage.session niet zien.
// Alleen de kluis gaat mee, nooit de sleutel.
async function broadcastVault(vault) {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).catch(() => []);
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'pf:vault', vault }).catch(() => {});
}

async function lock() {
  const { protect } = await chrome.storage.local.get('protect');
  if (!protect) return;
  await queue; // eerst de laatste wijzigingen versleuteld wegschrijven
  await chrome.storage.session.remove('key');
  await chrome.storage.session.set({ locked: true, vault: emptyVault(protect.counters || {}) });
}

// Maandoverzicht (zie stats.js): content scripts in alle tabs melden hier hoeveel ze per soort hebben afgeschermd.
// Eén schrijver tegelijk, zodat tellingen uit verschillende tabs elkaar niet overschrijven.
let statsQueue = Promise.resolve();
function count(counts) {
  statsQueue = statsQueue.then(async () => {
    const { stats } = await chrome.storage.local.get('stats');
    await chrome.storage.local.set({ stats: globalThis.PrivacyStats.add(stats, counts) });
  }).catch(err => console.error('[Kamelo] overzicht bijwerken mislukt', err));
  return statsQueue;
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'pf:count') { count(msg.counts).then(() => reply(true)); return true; }
  if (msg?.type === 'pf:init') { init().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:vault-get' && RELAY) {
    init().then(() => chrome.storage.session.get('vault')).then(({ vault }) => reply(vault || null));
    return true;
  }
  if (msg?.type === 'pf:vault-set' && RELAY && msg.vault) {
    chrome.storage.session.set({ vault: msg.vault }).then(() => reply(true));
    return true;
  }
  if (msg?.type === 'pf:lock') { lock().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:flush') { queue.then(() => reply(true)); return true; }
});

init();
}
