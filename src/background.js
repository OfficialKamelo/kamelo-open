// Achtergrond.
// - Opent de welkomstpagina na installatie.
// - Beheert de kluis: de actuele kluis staat in chrome.storage.session (alleen in het werkgeheugen);
//   deze service schrijft hem naar schijf: versleuteld als de kluisbeveiliging aanstaat, anders gewoon.
// In Firefox laadt het manifest deze bestanden zelf (background.scripts); daar bestaat importScripts niet.
if (typeof importScripts === 'function') importScripts('vaultcrypto.js', 'vaultstore.js', 'stats.js', 'sites.js', 'config.js', 'detector.js', 'vaultscope.js');

// In een eigen blok, zodat namen niet botsen als dit script samen met een pagina wordt geladen (previews).
{
const PC = globalThis.PrivacyCrypto;

const { emptyVault, initSession } = globalThis.PrivacyVault;
const VS = globalThis.PrivacyVaultScope;
const D = globalThis.PrivacyDetector;

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

// Het werkgeheugen (de kluis en, als die beveiligd is, de sleutel) is alleen voor Kamelo zelf: de achtergrond, de popup
// en het kluisvenster. Content scripts draaien in elke website; zij krijgen via berichten alleen het deel van hun eigen
// site (zie vaultscope.js). Zo kan een website, ook een gekraakte, nooit de hele kluis of de sleutel bereiken.
chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });

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
    announceChange();
  }
  // Net ontgrendeld: oude gegevens uit de versleutelde kluis meteen opschonen.
  if (area === 'session' && changes.locked && changes.locked.newValue === false) prune();
});

// Tabs horen alleen dát de kluis is veranderd, zonder gegevens. Elk venster haalt daarna zelf zijn eigen deel op.
let announceTimer = 0;
function announceChange() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(async () => {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).catch(() => []);
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'pf:vault-changed' }).catch(() => {});
  }, 50);
}

// Wijzigingen in de kluis in het werkgeheugen, één tegelijk, zodat twee tabs elkaar niet overschrijven.
let vaultQueue = Promise.resolve();
function updateVault(change) {
  const run = vaultQueue.then(async () => {
    await init();
    const { vault } = await chrome.storage.session.get('vault');
    const v = vault || emptyVault();
    if (change(v)) await chrome.storage.session.set({ vault: v });
  });
  vaultQueue = run.catch(err => console.error('[Kamelo] kluis bijwerken mislukt', err));
  return run;
}

// "Na 30 dagen gewist" (instelling retentionDays, 0 = nooit): hier gegarandeerd, bij het starten, elke 12 uur en na
// ontgrendelen, ook als je een tijd geen AI-site opent. Een vergrendelde kluis wordt na ontgrendelen opgeschoond.
async function prune() {
  const { settings } = await chrome.storage.local.get('settings');
  const days = settings?.retentionDays ?? globalThis.PrivacyConfig.DEFAULT_SETTINGS.retentionDays;
  const { locked } = await chrome.storage.session.get('locked');
  if (locked) return;
  return updateVault(v => D.prune(v, days) > 0);
}
chrome.alarms?.create('kamelo-prune', { periodInMinutes: 720 });
chrome.alarms?.onAlarm.addListener(alarm => { if (alarm.name === 'kamelo-prune') prune(); });

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

// Berichten komen alleen van Kamelo zelf, maar content scripts draaien in elke website. Daarom:
// - de kluis lezen en schrijven kan alleen voor de site van de afzender, zoals de browser die doorgeeft;
// - vergrendelen en wegschrijven alleen vanuit Kamelo's eigen pagina's (popup, kluisvenster).
const fromExtensionPage = sender => sender.id === chrome.runtime.id && !!sender.url?.startsWith(chrome.runtime.getURL(''));

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === 'pf:count') { count(msg.counts).then(() => reply(true)); return true; }
  if (msg?.type === 'pf:init') { init().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:vault-get') {
    const where = VS.scopeOfSender(sender);
    init().then(() => chrome.storage.session.get('vault')).then(({ vault }) => reply(VS.sliceVault(vault, where)))
      .catch(() => reply(null));
    return true;
  }
  if (msg?.type === 'pf:vault-set' && msg.vault) {
    const where = VS.scopeOfSender(sender);
    if (!where) { reply(false); return; }
    updateVault(v => VS.mergeSlice(v, msg.vault, where)).then(() => reply(true), () => reply(false));
    return true;
  }
  if (msg?.type === 'pf:lock' && fromExtensionPage(sender)) { lock().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:flush' && fromExtensionPage(sender)) { queue.then(() => reply(true)); return true; }
});

init().then(prune);
}
