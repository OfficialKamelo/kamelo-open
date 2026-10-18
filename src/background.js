// Achtergrond.
// - Opent de welkomstpagina na installatie.
// - Brengt een vraag naar een tijdelijke chat of naar Private Chat (beide edities).
// - Alleen Kamelo Business: controleert de licentie (src/licence.js) voor de content scripts en Private Chat, en zet
//   een rode "!" op het icoon zolang Kamelo Business niet actief is.
// - Alleen Kamelo Business: beheert de kluis. De actuele kluis staat in chrome.storage.session (alleen in het
//   werkgeheugen); deze service schrijft hem altijd versleuteld naar schijf: met de sleutel van de kluisbeveiliging als
//   die aanstaat, anders met de apparaatsleutel (zie vaultcrypto.js).
// - Alleen de gratis editie: ruimt na een update alles op wat 1.4.x en eerder voor het afschermen bewaarde.
// In Firefox laadt het manifest deze bestanden zelf (background.scripts); daar bestaat importScripts niet.
if (typeof importScripts === 'function') {
  importScripts('edition.js', 'sites.js', 'config.js');
  // De gratis editie heeft de bestanden voor het afschermen niet (zie tools/pack.mjs).
  if (globalThis.KameloEdition !== 'public') importScripts('policy.js', 'teams/ai-apps.js', 'licence.js', 'vaultcrypto.js', 'vaultstore.js', 'stats.js', 'teams/terms-index.js', 'detector.js', 'vaultscope.js', 'teams/doclayer.js', 'teams/ocr-host.js');
  // Alleen de gratis editie: de AI van Chrome op dit apparaat als tweede kans voor gevoelige onderwerpen.
  else importScripts('topic-ai.js');
}
const TEAMS = globalThis.KameloEdition !== 'public';

// Na verwijderen opent de browser kamelo.eu/goodbye: waarom weg, met een oplossing per reden. Een gewone pagina, zonder gegevens erbij.
chrome.runtime.setUninstallURL('https://kamelo.eu/goodbye');

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install' && reason !== 'update') return;
  if (!TEAMS) forgetMasking();
  // Kamelo Business had tot 1.5.0 een proefperiode vanaf installeren; die is weg (zonder licentie niet actief).
  if (TEAMS) chrome.storage.local.remove('teamsSince').catch(() => {});
  injectIntoOpenTabs();
  // Na installatie: de bedankpagina op kamelo.eu. Dat is een gewoon tabblad; Kamelo stuurt zelf niets.
  // Welkomstpagina in de taal van de browser, als kamelo.eu die taal heeft (testpanel 13 okt: altijd Engels was verwarrend).
  if (reason === 'install') {
    const lang = (chrome.i18n?.getUILanguage?.() || 'en').slice(0, 2).toLowerCase();
    chrome.tabs.create({ url: `https://kamelo.eu/${['nl', 'de', 'fr', 'es'].includes(lang) ? lang + '/' : ''}welcome` });
  }
});

// De gratis editie schermt niets meer af (sinds 12 okt 2026). Wat versie 1.4.x en eerder daarvoor op dit apparaat
// bewaarde, gaat weg: de kluis (ook versleuteld), de kluisbeveiliging, het maandoverzicht en de eigen woordenlijsten.
// Bij elke update en elke start, zodat er ook na een onderbroken update niets persoonlijks blijft staan.
const MASKING_KEYS = ['vault', 'vaultEnc', 'vaultBox', 'vaultCounters', 'protect', 'stats', 'noticesSeen'];
const MASKING_SETTINGS = ['restore', 'customTerms', 'allowList', 'allowMeta', 'customAiSites', 'retentionDays',
  // De gratis popup heeft geen knoppen meer voor de meldingen per onderwerp: die gaan terug naar de standaard (aan),
  // anders kan iemand die ze ooit uitzette ze nooit meer aanzetten. Aan/uit van Kamelo zelf blijft zoals het was.
  'topicWarnings', 'mutedTopics'];
async function forgetMasking() {
  try {
    await chrome.storage.local.remove(MASKING_KEYS);
    await chrome.storage.session.remove(['vault', 'key', 'locked', 'ready', 'vaultLoaded']);
    // De apparaatsleutel (zie vaultcrypto.js) is zonder kluis ook niet meer nodig.
    if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('kamelo-kluis');
    const { settings } = await chrome.storage.local.get('settings');
    if (settings && MASKING_SETTINGS.some(k => k in settings)) {
      const kept = Object.fromEntries(Object.entries(settings).filter(([k]) => !MASKING_SETTINGS.includes(k)));
      await chrome.storage.local.set({ settings: kept });
    }
  } catch (err) { console.error('[Kamelo] opruimen mislukt', err); }
}
if (!TEAMS) chrome.runtime.onStartup.addListener(forgetMasking);

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
      if (cs.css) chrome.scripting.insertCSS({ target: { tabId: tab.id, allFrames: true }, files: cs.css }).catch(() => {});
    }
  }
}

// De bètaversie (tools/pack.mjs --beta) draagt een β op het icoon, zodat hij niet te verwarren is met de gewone.
const BETA = /beta/i.test(chrome.runtime.getManifest().version_name || '');
if (BETA) {
  chrome.action.setBadgeText({ text: 'β' });
  chrome.action.setBadgeBackgroundColor({ color: '#6e6e73' });
}

// Het werkgeheugen (de kluis en, als die beveiligd is, de sleutel) is alleen voor Kamelo zelf: de achtergrond, de popup
// en het kluisvenster. Content scripts draaien in elke website; zij krijgen via berichten alleen het deel van hun eigen
// site (zie vaultscope.js). chrome.storage.local kunnen content scripts wél lezen (ook die van een gekraakte website):
// daar staat de kluis daarom alleen versleuteld, en de sleutel staat in de IndexedDB van de extensie, waar een website
// niet bij kan.
chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });

// Berichten komen alleen van Kamelo zelf, maar content scripts draaien in websites. Daarom:
// - de kluis lezen en schrijven kan alleen voor de site van de afzender, zoals de browser die doorgeeft;
// - vergrendelen, wegschrijven en Private Chat-teksten ophalen alleen vanuit Kamelo's eigen pagina's (popup, kluisvenster, chat).
const fromExtensionPage = sender => sender.id === chrome.runtime.id && !!sender.url?.startsWith(chrome.runtime.getURL(''));

// Alleen Kamelo Business: de kluis. In een eigen blok, zodat namen niet botsen als dit script samen met een pagina
// wordt geladen (previews).
if (TEAMS) {
const PC = globalThis.PrivacyCrypto;

const { emptyVault } = globalThis.PrivacyVault;
const VS = globalThis.PrivacyVaultScope;
const D = globalThis.PrivacyDetector;

const deviceKey = PC.deviceKey(globalThis.KameloDeviceKeyStore); // tests geven een eigen opslag mee

// Op schijf (chrome.storage.local) staat de kluis nooit leesbaar:
// - zonder kluisbeveiliging: vaultBox, versleuteld met de apparaatsleutel, met vaultCounters ernaast;
// - met kluisbeveiliging: vaultEnc, versleuteld met de kluissleutel K, met protect.counters ernaast.
// (Tellers per soort zijn geen gevoelige gegevens.) Tot en met 1.5.0 stond `vault` hier onversleuteld: die wordt bij
// het laden één keer versleuteld weggeschreven en gewist.
const PLAIN = 'vault';

// Eén keer per browsersessie de kluis van schijf in het werkgeheugen zetten. `vaultLoaded` zegt dat de achtergrond dat
// gedaan heeft; pas dan mag persist() schrijven. Een pagina die niet op de achtergrond kon wachten zet met initSession
// (vaultstore.js) alleen een lege kluis klaar: die wordt hier samengevoegd met wat op schijf staat, niet overschreven.
let initPromise = null;
const init = () => (initPromise ??= loadSession().catch(err => {
  initPromise = null; // de volgende vraag probeert het opnieuw
  console.error('[Kamelo] kluis laden mislukt', err);
}));

async function loadSession() {
  const { vaultLoaded } = await chrome.storage.session.get('vaultLoaded');
  if (!vaultLoaded) {
    const { [PLAIN]: plain, vaultBox, vaultCounters, protect } = await chrome.storage.local.get([PLAIN, 'vaultBox', 'vaultCounters', 'protect']);
    const { vault: pending, ready } = await chrome.storage.session.get(['vault', 'ready']);
    if (protect) {
      // Beveiligd: start vergrendeld; alleen de tellers gaan mee, zodat nieuwe placeholders niet botsen.
      await chrome.storage.session.set(ready ? { vaultLoaded: true }
        : { vault: emptyVault(protect.counters || {}), locked: true, ready: true, vaultLoaded: true });
    } else {
      let stored = plain || null;
      if (!stored && vaultBox) {
        const key = await deviceKey(); // een fout van IndexedDB gaat omhoog: dan niets overschrijven, later opnieuw
        try { stored = await PC.decryptJSON(key, vaultBox); }
        catch {
          // Sleutel weg of gegevens kapot: de kluis begint leeg (met de tellers), afgeschermde teksten blijven afgeschermd.
          console.warn('[Kamelo] de kluis op schijf is niet meer te openen; Kamelo begint met een lege kluis');
          stored = emptyVault(vaultCounters || {});
        }
      }
      const vault = ready && pending ? PC.mergeVaults(stored || emptyVault(), pending) : (stored || emptyVault());
      await chrome.storage.session.set({ vault, locked: false, ready: true, vaultLoaded: true });
    }
  }
  // Altijd één keer wegschrijven: zo verdwijnt een onversleutelde kluis van een oudere versie meteen.
  const { vault } = await chrome.storage.session.get('vault');
  await persist(vault);
}

// Wijzigingen in de kluis naar schijf schrijven, en de kluisbeveiliging aan- of uitzetten: één tegelijk, in volgorde.
let queue = Promise.resolve();
function enqueue(job) {
  const run = queue.then(job);
  queue = run.catch(err => console.error('[Kamelo] kluis opslaan mislukt', err));
  return run;
}
const persist = vault => enqueue(() => writeVault(vault)).catch(() => {});

async function writeVault(vault) {
  if (!vault) return;
  const { vaultLoaded, key } = await chrome.storage.session.get(['vaultLoaded', 'key']);
  if (!vaultLoaded) return; // de kluis van schijf is nog niet geladen: niet overschrijven
  const { protect } = await chrome.storage.local.get('protect');
  if (!protect) {
    const vaultBox = await PC.encryptJSON(await deviceKey(), vault);
    await chrome.storage.local.set({ vaultBox, vaultCounters: vault.counters || {} });
    await chrome.storage.local.remove([PLAIN, 'vaultEnc']);
    return;
  }
  protect.counters = vault.counters; // tellers zijn geen gevoelige gegevens
  await chrome.storage.local.remove(PLAIN);
  if (!key) return chrome.storage.local.set({ protect }); // vergrendeld: oude versleutelde kluis blijft staan
  const vaultEnc = await PC.encryptJSON(await PC.importAesRaw(PC.unb64(key)), vault);
  await chrome.storage.local.set({ vaultEnc, protect });
  await chrome.storage.local.remove(['vaultBox', 'vaultCounters']);
}

// Kluisbeveiliging aanzetten (vanuit het kluisvenster, unlock.js): de pagina maakt de sleutel K en pakt hem in met
// Touch ID of een wachtwoord; hier wordt de kluis met K versleuteld en verdwijnt de kopie met de apparaatsleutel.
async function protectOn({ protect, key }) {
  if (!protect || typeof key !== 'string' || !(protect.touch || protect.password)) throw new Error('ongeldige beveiliging');
  await init(); // buiten de rij: init() schrijft zelf ook via de rij
  return enqueue(async () => {
    const { vault } = await chrome.storage.session.get('vault');
    const current = vault || emptyVault();
    const entry = { ...protect, counters: current.counters || {} };
    const vaultEnc = await PC.encryptJSON(await PC.importAesRaw(PC.unb64(key)), current);
    await chrome.storage.session.set({ key, locked: false });
    await chrome.storage.local.set({ protect: entry, vaultEnc });
    await chrome.storage.local.remove([PLAIN, 'vaultBox', 'vaultCounters']);
    lastActivity = 0; // de wekker voor vergrendelen meteen zetten
    touchActivity();
  });
}

// Een tweede methode (Touch ID of wachtwoord) toevoegen; alleen als de kluis open is.
function protectAdd({ method, entry }) {
  return enqueue(async () => {
    const { protect } = await chrome.storage.local.get('protect');
    const { key } = await chrome.storage.session.get('key');
    if (!protect || !key || !['touch', 'password'].includes(method) || !entry?.wrapped) throw new Error('kluis niet open');
    protect[method] = entry;
    await chrome.storage.local.set({ protect });
  });
}

// Kluisbeveiliging uitzetten; alleen als de kluis open is (anders zou de versleutelde kluis verloren gaan).
// Eerst de kluis met de apparaatsleutel wegschrijven, dan pas de beveiligde kopie wissen.
function protectOff() {
  return enqueue(async () => {
    const { key, locked, vault } = await chrome.storage.session.get(['key', 'locked', 'vault']);
    const { protect } = await chrome.storage.local.get('protect');
    if (!protect) return;
    if (!key || locked) throw new Error('kluis vergrendeld');
    const current = vault || emptyVault();
    const vaultBox = await PC.encryptJSON(await deviceKey(), current);
    await chrome.storage.local.set({ vaultBox, vaultCounters: current.counters || {} });
    await chrome.storage.local.remove(['protect', 'vaultEnc', PLAIN]);
    await chrome.storage.session.remove('key');
    await chrome.storage.session.set({ locked: false });
    chrome.alarms?.clear?.(AUTOLOCK);
  });
}

// Een beveiligde kluis die open staat, gaat na AUTOLOCK_MINUTES zonder gebruik vanzelf op slot (chrome.alarms, dus ook
// als de achtergrond intussen slaapt). Gebruik = een website of Kamelo's eigen pagina leest of schrijft de kluis.
const AUTOLOCK = 'kamelo-autolock';
const AUTOLOCK_MINUTES = 30;
let lastActivity = 0;
function touchActivity() {
  if (Date.now() - lastActivity < 60000) return; // hooguit één keer per minuut de wekker verzetten
  lastActivity = Date.now();
  chrome.storage.session.get(['key', 'locked']).then(({ key, locked }) => {
    if (key && !locked) chrome.alarms?.create(AUTOLOCK, { delayInMinutes: AUTOLOCK_MINUTES });
  }).catch(() => {});
}
chrome.alarms?.onAlarm.addListener(alarm => { if (alarm.name === AUTOLOCK) lock().catch(() => {}); });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.vault) {
    // Iets gewist buiten updateVault om (de popup: "Kluis wissen", bewaartermijn): oude kopieën in tabbladen gelden niet meer.
    if (!changes.vaultCleared && removedFrom(changes.vault.oldValue, changes.vault.newValue))
      chrome.storage.session.set({ vaultCleared: Date.now() }).catch(() => {});
    persist(changes.vault.newValue);
    announceChange();
  }
  if (area === 'session' && changes.docs) {
    // Gewist (vergrendeld, "Kluis wissen"): een nieuw tijdperk, zodat tabbladen ook hun originelen vergeten.
    if (changes.docs.newValue === undefined) chrome.storage.session.set({ docsEpoch: Date.now() }).catch(() => {});
    if (!changes.vault) announceChange();
  }
  // Net ontgrendeld: oude gegevens uit de versleutelde kluis meteen opschonen, en de wekker voor vergrendelen zetten.
  if (area === 'session' && changes.locked && changes.locked.newValue === false) { prune(); lastActivity = 0; touchActivity(); }
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
// vaultCleared: wanneer er voor het laatst iets uit de kluis is verdwenen (wissen, opschonen, vergrendelen). Een tabblad
// dat nog een oude kopie heeft, mag dat niet terugzetten (zie mergeSlice): alleen wat daarna is gebruikt telt als nieuw.
let vaultQueue = Promise.resolve();
function inVaultQueue(job) {
  const run = vaultQueue.then(job);
  vaultQueue = run.catch(err => console.error('[Kamelo] kluis bijwerken mislukt', err));
  return run;
}
const removedFrom = (before, after) => Object.keys(before?.byPlaceholder || {}).some(ph => !(ph in (after?.byPlaceholder || {})));
function updateVault(change) {
  return inVaultQueue(async () => {
    await init();
    const { vault, vaultCleared = 0 } = await chrome.storage.session.get(['vault', 'vaultCleared']);
    const v = vault || emptyVault();
    const before = { byPlaceholder: { ...v.byPlaceholder } };
    if (!change(v, vaultCleared)) return;
    await chrome.storage.session.set(removedFrom(before, v) ? { vault: v, vaultCleared: Date.now() } : { vault: v });
  });
}

// "Na 30 dagen gewist" (instelling retentionDays, 0 = nooit): hier gegarandeerd, bij het starten, elke 12 uur en na
// ontgrendelen, ook als je een tijd geen AI-site opent. Een vergrendelde kluis wordt na ontgrendelen opgeschoond.
// Het beleid van de organisatie (policy.js, retentionDays) wint van de eigen instelling.
async function prune() {
  const [{ settings }, policy] = await Promise.all([chrome.storage.local.get('settings'), globalThis.KameloPolicy.read()]);
  const days = globalThis.KameloPolicy.merge(settings, policy).retentionDays;
  const { locked } = await chrome.storage.session.get('locked');
  if (locked) return;
  return updateVault(v => D.prune(v, days) > 0);
}
chrome.alarms?.create('kamelo-prune', { periodInMinutes: 720 });
globalThis.KameloPolicy.watch(() => prune());
chrome.alarms?.onAlarm.addListener(alarm => { if (alarm.name === 'kamelo-prune') prune(); });

async function lock() {
  chrome.alarms?.clear?.(AUTOLOCK);
  if (!(await chrome.storage.local.get('protect')).protect) return;
  // In de rij met updateVault: een wijziging die al onderweg is, kan de volle kluis anders na het vergrendelen terugzetten.
  return inVaultQueue(async () => {
    await queue; // eerst de laatste wijzigingen versleuteld wegschrijven
    const [{ protect }, { vault }] = await Promise.all([chrome.storage.local.get('protect'), chrome.storage.session.get('vault')]);
    if (!protect) return;
    // De hoogste tellers houden (die van de kluis in het werkgeheugen kunnen nog niet op schijf staan).
    const counters = { ...(protect.counters || {}) };
    for (const [type, n] of Object.entries(vault?.counters || {})) if (n > (counters[type] || 0)) counters[type] = n;
    await chrome.storage.session.remove(['key', 'docs']); // documenten: ook weg (op slot = niets terug te zetten)
    await chrome.storage.session.set({ locked: true, vault: emptyVault(counters), vaultCleared: Date.now() });
  });
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

// ---------- Licentie (src/licence.js) ----------
// Content scripts en Private Chat vragen hier of Kamelo Business actief is (pf:licence). Hier, en niet in elke pagina:
// de achtergrond leest de code en het beleid zelf en controleert de handtekening, dus een pagina of een aangepaste
// waarde in de opslag kan niets aanzetten. Het antwoord is alleen { active, until }.
// Niet actief: een rode "!" op het icoon (geen meldingen in websites; de popup legt het uit).
const LIC = globalThis.KameloLicence;
const NOT_ACTIVE = { state: 'none', active: false, until: 0 };
let badgeOff = null;
async function licence() {
  const s = await LIC.check(await globalThis.KameloPolicy.read()).catch(() => NOT_ACTIVE);
  const off = !s.active;
  if (off !== badgeOff) {
    badgeOff = off;
    const lang = /^nl\b/i.test(chrome.i18n?.getUILanguage?.() || '') ? 'nl' : 'en';
    const title = chrome.runtime.getManifest().action?.default_title || '';
    const normal = /^__MSG_(\w+)__$/.test(title) ? chrome.i18n?.getMessage(title.slice(6, -2)) || 'Kamelo' : title;
    const quiet = fn => { try { fn()?.catch?.(() => {}); } catch {} };
    quiet(() => chrome.action.setBadgeText({ text: off ? '!' : BETA ? 'β' : '' }));
    quiet(() => chrome.action.setBadgeBackgroundColor({ color: off ? '#d70015' : '#6e6e73' }));
    quiet(() => chrome.action.setBadgeTextColor?.({ color: '#ffffff' }));
    quiet(() => chrome.action.setTitle({ title: off ? LIC.STRINGS[lang].inactiveTitle : normal }));
  }
  return s;
}
licence().catch(() => {});
globalThis.KameloPolicy.watch(() => licence().catch(() => {}));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.licence || changes.testLicenceKeys)) licence().catch(() => {});
});
// Een licentie verloopt ook als niemand iets doet: elk uur opnieuw kijken (voor het icoon).
chrome.alarms?.create('kamelo-licence', { periodInMinutes: 60 });
chrome.alarms?.onAlarm.addListener(alarm => { if (alarm.name === 'kamelo-licence') licence().catch(() => {}); });

// ---------- AI-apps die de organisatie blokkeert (src/teams/ai-apps.js, docs/teams/AI-APPS.md) ----------
// Zonder nieuwe rechten: met de toegang tot alle sites geeft tabs.onUpdated het adres van elk tabblad. Gaat een tabblad
// naar een geblokkeerde AI-app, dan komt de blokpagina van Kamelo ervoor in de plaats (alleen de host gaat mee, nooit het
// hele adres). Het content script vraagt hetzelfde (pf:block) als vangrail; hier telt alleen het adres van de afzender.
// Alleen met een geldige licentie, net als de rest van Kamelo Business.
const AA = globalThis.KameloAiApps;
const BLOCKED_PAGE = 'src/teams/blocked.html';
let policyNow = null;
globalThis.KameloPolicy.watch(p => { policyNow = Promise.resolve(p); });
async function blockedHost(url) {
  let u;
  try { u = new URL(url); } catch { return ''; }
  if (!/^https?:$/.test(u.protocol) || !AA) return '';
  const policy = await (policyNow ??= globalThis.KameloPolicy.read());
  if (AA.modeFor(u.hostname, policy) !== 'blocked') return '';
  return (await licence()).active ? u.hostname : '';
}
async function sendToBlocked(tabId, url) {
  const host = await blockedHost(url).catch(() => '');
  if (!host) return false;
  await chrome.tabs.update(tabId, { url: chrome.runtime.getURL(`${BLOCKED_PAGE}?host=${encodeURIComponent(host)}`) }).catch(() => {});
  return true;
}
chrome.tabs.onUpdated?.addListener((tabId, change) => { if (change.url) sendToBlocked(tabId, change.url); });

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === 'pf:block') {
    if (sender.tab?.id == null || sender.frameId !== 0 || !sender.url) { reply(false); return; }
    sendToBlocked(sender.tab.id, sender.url).then(reply, () => reply(false));
    return true;
  }
  if (msg?.type === 'pf:licence') { licence().then(s => reply({ active: !!s.active, until: s.until || 0 }), () => reply({ active: false, until: 0 })); return true; }
  if (msg?.type === 'pf:count') { count(msg.counts).then(() => reply(true)); return true; }
  if (msg?.type === 'pf:init') { init().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:vault-get') {
    // Geen touchActivity: elk frame van elke pagina haalt dit bij het laden op, en dan ging de kluis nooit vanzelf op slot.
    const where = VS.scopeOfSender(sender);
    init().then(() => chrome.storage.session.get('vault')).then(({ vault }) => reply(VS.sliceVault(vault, where)))
      .catch(() => reply(null));
    return true;
  }
  if (msg?.type === 'pf:vault-set' && msg.vault) {
    const where = VS.scopeOfSender(sender);
    if (!where) { reply(false); return; }
    touchActivity();
    updateVault((v, cleared) => VS.mergeSlice(v, msg.vault, where, cleared)).then(() => reply(true), () => reply(false));
    return true;
  }
  // Nieuwe nummers voor placeholders vastleggen, voordat een tabblad ze gebruikt (zie claim in vaultscope.js).
  if (msg?.type === 'pf:claim') {
    if (!VS.scopeOfSender(sender)) { reply(null); return; }
    let out = { ok: false, counters: {} };
    updateVault(v => (out = VS.claim(v, msg.from, msg.to)).ok).then(() => reply(out), () => reply({ ok: false, counters: {} }));
    return true;
  }
  if (msg?.type === 'pf:lock' && fromExtensionPage(sender)) { lock().then(() => reply(true)); return true; }
  if (msg?.type === 'pf:flush' && fromExtensionPage(sender)) { queue.then(() => reply(true)); return true; }
  // Kluisbeveiliging aan, uit of een methode erbij: alleen vanuit het kluisvenster, en in de rij met persist().
  const done = p => { p.then(() => reply(true), err => reply({ error: String(err?.message || err) })); return true; };
  if (msg?.type === 'pf:protect-on' && fromExtensionPage(sender)) return done(protectOn(msg));
  if (msg?.type === 'pf:protect-add' && fromExtensionPage(sender)) return done(protectAdd(msg));
  if (msg?.type === 'pf:protect-off' && fromExtensionPage(sender)) return done(protectOff());
});

// ---------- Documenten (teams/doclayer.js, teams/originals.js) ----------
// De documentlaag: placeholders uit geüploade documenten, alleen in het werkgeheugen (storage.session `docs`), per
// site. Nooit in de kluis op schijf; alleen de tellers gaan daarheen (zodat nummers niet botsen). Weg bij afsluiten,
// vergrendelen en "Kluis wissen".
const DL = globalThis.KameloDocLayer;
let docsQueue = Promise.resolve();
function addDocs(add, where) {
  const run = docsQueue.then(async () => {
    await init();
    const { docs, vault } = await chrome.storage.session.get(['docs', 'vault']);
    const all = docs && typeof docs === 'object' ? docs : {};
    const mine = all[where.scope] || DL.empty();
    if (DL.apply(mine, add, where.scope, VS.sliceVault(vault, where))) {
      all[where.scope] = mine;
      await chrome.storage.session.set({ docs: all });
    }
    // De tellers wel naar de kluis (en dus naar schijf): een nummer uit een document wordt nooit opnieuw uitgedeeld.
    await updateVault(v => {
      let changed = false;
      v.counters = v.counters || {};
      for (const [type, n] of Object.entries(add.counters || {})) {
        if (/^[A-Z_]+$/.test(type) && Number.isInteger(n) && n > (v.counters[type] || 0) && n < 1e9) { v.counters[type] = n; changed = true; }
      }
      return changed;
    });
  });
  docsQueue = run.catch(err => console.error('[Kamelo] documentlaag bijwerken mislukt', err));
  return run;
}

// Een bestandsnaam die chrome.downloads accepteert: geen mappen, geen tekens die Windows of macOS weigeren.
function safeName(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*\u007f]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 200);
  return base || 'download';
}

// Een download die Kamelo zelf start (de teruggezette versie). Een adres voor de bytes: in Firefox (achtergrondpagina)
// een blob-adres, in Chrome via het offscreen-document (teams/ocr-host.js), anders een data:-adres voor kleine bestanden.
const ownDownloads = new Set();
// Chrome: met een eigen onDeterminingFilename-luisteraar (hieronder) negeert Chrome de naam uit downloads.download,
// dus geeft de luisteraar die naam zelf terug (names: adres → naam). Ook voor "Openen" in de viewer (pf:dl-name).
const names = new Map();
async function saveFile({ b64, name, mime: type }) {
  if (typeof b64 !== 'string' || !b64) throw new Error('leeg');
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(type || '') ? type : 'application/octet-stream';
  let url = null;
  if (typeof document !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else if (globalThis.KameloOffscreen) {
    const r = await globalThis.KameloOffscreen.run({ blob: { b64, type: mime } }).catch(() => null);
    url = r?.url || null;
  }
  if (!url && b64.length < 4 * 1024 * 1024) url = `data:${mime};base64,${b64}`;
  if (!url) throw new Error('geen adres voor de download');
  names.set(url, safeName(name));
  const id = await chrome.downloads.download({ url, filename: safeName(name), conflictAction: 'uniquify' });
  ownDownloads.add(id);
  return id;
}

// Downloads die de pagina zelf start (een blob van de site, een link naar een bestand): op een AI-site met uploaden
// vraagt de achtergrond het tabblad om de echte gegevens terug te zetten. Lukt dat (en stond er iets in), dan gaat de
// download van de site niet door en komt de teruggezette versie ervoor in de plaats. Lukt het niet: de download van
// de site gewoon. Wat de content script zelf al afhandelde (teams/originals.js) heeft byExtensionId of staat in `passes`.
const passes = new Map(); // adres → tijd: de content script laat deze download bewust door
const hostOfUrl = u => { try { const x = new URL(u.startsWith('blob:') ? u.slice(5) : u); return /^https?:$/.test(x.protocol) ? x.hostname : ''; } catch { return ''; } };
const fileSite = host => { const s = host && globalThis.PrivacySites.siteFor(host); return s?.files ? s : null; };
const RESTORABLE = /\.(?:txt|md|markdown|log|csv|tsv|json|html?|eml|rtf|pdf|docx|xlsx|pptx|odt|ods|odp)$/i;

async function restoreDownload(item) {
  if (item.byExtensionId || ownDownloads.has(item.id)) return null;
  const url = item.finalUrl || item.url || '';
  const t = passes.get(url);
  if (t && Date.now() - t < 20000) return null;
  const pageHost = fileSite(hostOfUrl(url)) ? hostOfUrl(url) : hostOfUrl(item.referrer || '');
  if (!fileSite(pageHost)) return null;
  const name = String(item.filename || '').split(/[\\/]/).pop() || decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || '');
  if (!RESTORABLE.test(name) && !/^(?:text\/|application\/(?:json|pdf|rtf|vnd\.openxmlformats|vnd\.oasis)|message\/rfc822)/.test(item.mime || '')) return null;
  if (!(await licence().catch(() => NOT_ACTIVE)).active) return null;
  const scope = globalThis.PrivacySites.scopeFor(pageHost);
  const tabs = (await chrome.tabs.query({}).catch(() => [])).filter(tab => {
    const h = hostOfUrl(tab.url || '');
    return h && (h === pageHost || (scope && globalThis.PrivacySites.scopeFor(h) === scope));
  });
  if (!tabs.length) return null;
  // Alleen een bestand dat al in de pagina staat (blob: of data:): dat leest het tabblad zelf, zonder netwerk. Een
  // bestand op een webadres (ook bij de AI-dienst zelf) haalt Kamelo niet opnieuw op: de extensie doet geen eigen
  // netwerkverzoeken. Die download gaat door zoals de site hem maakte, en het tabblad zegt dat er nog placeholders
  // in kunnen staan.
  if (!/^(?:blob|data):/i.test(url)) {
    const tab = tabs.find(t => t.active);
    if (tab) chrome.tabs.sendMessage(tab.id, { type: 'pf:dl-remote' }, { frameId: 0 }).catch(() => {});
    return null;
  }
  for (const tab of tabs) {
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'pf:dl-restore', url, name, mime: item.mime || '' }, { frameId: 0 }).catch(() => null);
    if (r?.b64) return r;
  }
  return null;
}

async function replaceDownload(item, r) {
  await chrome.downloads.cancel(item.id).catch(() => {});
  if (item.state === 'complete') await chrome.downloads.removeFile?.(item.id).catch(() => {});
  await chrome.downloads.erase({ id: item.id }).catch(() => {});
  await saveFile(r);
}

const withTimeout = (p, ms) => Promise.race([p, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
if (chrome.downloads?.onDeterminingFilename) {
  // Chrome: de download wacht op een naam, dus er komt niets op schijf zolang Kamelo kijkt.
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    const own = names.get(item.url);
    if (own) { names.delete(item.url); suggest({ filename: own, conflictAction: 'uniquify' }); return; }
    if (item.byExtensionId || ownDownloads.has(item.id)) return;
    if (!fileSite(hostOfUrl(item.finalUrl || item.url || '')) && !fileSite(hostOfUrl(item.referrer || ''))) return;
    withTimeout(restoreDownload(item).catch(() => null), 15000).then(async r => {
      if (!r) { try { suggest(); } catch {} return; }
      try { await replaceDownload(item, r); } catch { try { suggest(); } catch {} }
    });
    return true;
  });
} else if (chrome.downloads?.onCreated) {
  // Firefox: geen onDeterminingFilename; de download loopt al, en wordt vervangen als het terugzetten lukt.
  chrome.downloads.onCreated.addListener(item => {
    restoreDownload(item).then(r => r && replaceDownload(item, r)).catch(() => {});
  });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === 'pf:docs-get') {
    const where = VS.scopeOfSender(sender);
    chrome.storage.session.get(['docs', 'docsEpoch']).then(({ docs, docsEpoch }) => reply({ ...DL.slice(docs, where?.scope), epoch: docsEpoch || 0 }), () => reply(null));
    return true;
  }
  if (msg?.type === 'pf:docs-add' && msg.add && typeof msg.add === 'object') {
    const where = VS.scopeOfSender(sender);
    if (!where || !sender.tab) { reply(false); return; }
    addDocs(msg.add, where).then(() => reply(true), () => reply(false));
    return true;
  }
  // Het origineel bekijken: Kamelo's eigen pagina (teams/viewer.html) in een nieuw tabblad. Die vraagt het bestand
  // zelf op bij het content script van dit tabblad en frame; de achtergrond geeft alleen door welk.
  if (msg?.type === 'pf:view' && sender.tab && typeof msg.id === 'string' && /^[\w-]{6,64}$/.test(msg.id)) {
    const url = chrome.runtime.getURL(`src/teams/viewer.html#${sender.tab.id}:${sender.frameId || 0}:${msg.id}`);
    chrome.tabs.create({ url, openerTabId: sender.tab.id, index: sender.tab.index + 1 })
      .catch(() => chrome.tabs.create({ url })).then(() => reply(true), () => reply(false));
    return true;
  }
  // Een teruggezet bestand bewaren (teams/originals.js): alleen vanuit een tabblad op een AI-site met uploaden.
  if (msg?.type === 'pf:save' && sender.tab && chrome.downloads) {
    if (!fileSite(VS.senderHost(sender))) { reply({ error: 'site' }); return; }
    saveFile(msg).then(id => reply({ id }), err => reply({ error: String(err?.message || err) }));
    return true;
  }
  // De viewer (Kamelo's eigen pagina) start zelf een download ("Openen"): de naam erbij.
  if (msg?.type === 'pf:dl-name' && fromExtensionPage(sender) && typeof msg.url === 'string') {
    names.set(msg.url, safeName(msg.name));
    reply(true);
    return;
  }
  if (msg?.type === 'pf:dl-pass' && sender.tab && typeof msg.url === 'string') {
    passes.set(msg.url, Date.now());
    for (const [u, at] of passes) if (Date.now() - at > 60000) passes.delete(u);
    reply(true);
    return;
  }
});

init().then(prune);
}

// Doorgegeven tekst (naar de tijdelijke chat of Private Chat) staat alleen in het werkgeheugen en verloopt. Wordt hij nooit
// opgehaald (tabblad dicht, paneel niet open), dan ruimen we hem alsnog op. Slaapt de achtergrond eerder, dan wist de
// browser het werkgeheugen bij afsluiten, en kijkt de volgende ophaalpoging naar de leeftijd.
function expireLater(key, ms) {
  setTimeout(async () => {
    const { [key]: h } = await chrome.storage.session.get(key).catch(() => ({}));
    if (h && Date.now() - h.at >= ms) await chrome.storage.session.remove(key).catch(() => {});
  }, ms + 1000);
}
chrome.tabs.onRemoved?.addListener(async tabId => {
  const { handoff: h } = await chrome.storage.session.get('handoff').catch(() => ({}));
  if (h?.tab === tabId) await chrome.storage.session.remove('handoff').catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  // "Vraag het privé": de tekst gaat mee naar de tijdelijke chat in hetzelfde tabblad. Alleen in het werkgeheugen,
  // alleen voor dit tabblad en deze site (zoals de browser die doorgeeft, niet zoals het bericht zegt), hooguit een minuut.
  const senderHost = () => { try { return new URL(sender.url).hostname; } catch { return ''; } };
  if (msg?.type === 'pf:private-set' && sender.tab) {
    chrome.storage.session.set({ handoff: { tab: sender.tab.id, host: senderHost(), text: String(msg.text || '').slice(0, 20000), at: Date.now() } })
      .then(() => { expireLater('handoff', 60000); reply(true); });
    return true;
  }
  if (msg?.type === 'pf:private-take' && sender.tab) {
    chrome.storage.session.get('handoff').then(async ({ handoff: h }) => {
      const mine = h && h.tab === sender.tab.id && h.host === senderHost() && Date.now() - h.at < 60000;
      if (mine || (h && Date.now() - h.at >= 60000)) await chrome.storage.session.remove('handoff');
      reply(mine ? h.text : null);
    });
    return true;
  }
  // Melo, de privéchat (docs/private-chat/PLAN-PRIVE-CHAT.md): "Ask Melo" in de melding. Het zijpaneel moet meteen open, zonder
  // await ervoor, anders telt de klik niet meer als gebruikersactie. Lukt dat niet (Firefox, oud Chrome), dan een klein venster.
  // De tekst staat alleen in het werkgeheugen en alleen Kamelo's eigen chatpagina kan hem ophalen, één keer, binnen 2 minuten.
  // "Ask Melo" in de melding alleen als Melo hier ook kan antwoorden (docs/KOERS.md, prioriteit 1). Anders leidde de
  // knop naar "Geen AI op dit apparaat"; nu biedt de melding dan alleen de tijdelijke chat. De popup vraagt hetzelfde.
  if (msg?.type === 'pf:melo-ready' && (sender.tab || fromExtensionPage(sender))) {
    meloReady().then(reply, () => reply(false));
    return true;
  }
  if (msg?.type === 'pf:pchat-open' && sender.tab) {
    // De klik moet meteen het paneel openen (gebruikersactie), dus de instelling wordt in de content script al gecontroleerd.
    openPrivateChat(sender.tab);
    chrome.storage.session.set({ pchat: { text: String(msg.text || '').slice(0, 20000), host: senderHost(), typed: msg.typed === true, at: Date.now() } })
      .then(() => { expireLater('pchat', 120000); reply(true); });
    return true;
  }
  if (msg?.type === 'pf:pchat-take' && fromExtensionPage(sender)) {
    chrome.storage.session.get('pchat').then(async ({ pchat: h }) => {
      if (h) await chrome.storage.session.remove('pchat');
      reply(h && Date.now() - h.at < 120000 ? { text: h.text, host: h.host || '', typed: h.typed === true } : null);
    });
    return true;
  }
  // Private Chat kan hier niet antwoorden (geen AI op dit apparaat, of een taal die hij niet kent): de vraag gaat naar
  // de tijdelijke chat van dezelfde AI-site (anders ChatGPT). Zelfde weg als "Tijdelijke chat" in de melding: de tekst
  // staat alleen in het werkgeheugen, voor dat ene nieuwe tabblad, en wordt daar afgeschermd ingevuld.
  if (msg?.type === 'pf:pchat-temp' && fromExtensionPage(sender)) {
    const S = globalThis.PrivacySites;
    const from = S.siteFor(String(msg.host || ''));
    const site = from?.private ? from : S.SITES.find(x => x.name === 'ChatGPT');
    const url = site.private.url || site.private.start;
    chrome.tabs.create({ url: 'about:blank', active: true }).then(async tab => {
      const text = String(msg.text || '').slice(0, 20000);
      if (text) { await chrome.storage.session.set({ handoff: { tab: tab.id, host: new URL(url).hostname, text, at: Date.now() } }); expireLater('handoff', 60000); }
      await chrome.tabs.update(tab.id, { url });
      reply(site.name);
    }, () => reply(null));
    return true;
  }
  if (msg?.type === 'pf:pchat-window' && fromExtensionPage(sender)) { openChatWindow(); reply(true); return; }
});

// Alleen de gratis editie: een gevoelig onderwerp dat de woordenlijst miste, aan de AI van Chrome op dit apparaat
// vragen (zie topic-ai.js). Alleen vanuit een tabblad; de tekst blijft in het werkgeheugen en wordt nergens bewaard of gelogd.
// Is het model er niet (nog niet gedownload, Edge, Firefox), dan antwoordt dit { topic: null } en wordt er niets gedownload.
if (!TEAMS && globalThis.KameloTopicAi) {
  const deviceTopics = globalThis.KameloTopicAi.model();
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (sender.id !== chrome.runtime.id || msg?.type !== 'pf:topic-ai' || !sender.tab) return;
    deviceTopics.ask(String(msg.text || ''), sender.tab.id).then(reply, () => reply({ topic: null }));
    return true;
  });
}

// ---------- Private Chat openen ----------
// Kan Melo op deze computer antwoorden? Ja als de AI van Chrome er al is, of na een klik in Melo te downloaden is
// ('available', 'downloadable', 'downloading'). Nee bij 'unavailable' (bijv. te weinig geheugen) of zonder LanguageModel.
// Alleen availability(), zoals Melo zelf (chat/device.js) voor het Engels: deze vraag start nooit een download.
async function meloReady() {
  const LM = globalThis.LanguageModel;
  if (typeof LM?.availability !== 'function') return false;
  const en = [{ type: 'text', languages: ['en'] }];
  try { return (await LM.availability({ expectedInputs: en, expectedOutputs: en })) !== 'unavailable'; } catch { return false; }
}
const CHAT_URL = chrome.runtime.getURL('chat/chat.html');
function openChatWindow() {
  chrome.windows.create({ url: CHAT_URL, type: 'popup', width: 440, height: 760, focused: true }).catch(() => chrome.tabs.create({ url: CHAT_URL }));
}
function openPrivateChat(tab) {
  try {
    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(openChatWindow);
      return;
    }
  } catch {}
  openChatWindow();
}
