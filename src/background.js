// Achtergrond.
// - Opent de welkomstpagina na installatie.
// - Brengt een vraag naar een tijdelijke chat of naar Private Chat (beide edities).
// - Alleen Kamelo Business: controleert de licentie (src/licence.js) voor de content scripts en Private Chat, en zet
//   een rode "!" op het icoon zolang Kamelo Business niet actief is.
// - Alleen Kamelo Business: beheert de kluis. De actuele kluis staat in chrome.storage.session (alleen in het
//   werkgeheugen); deze service schrijft hem naar schijf: versleuteld als de kluisbeveiliging aanstaat, anders gewoon.
// - Alleen de gratis editie: ruimt na een update alles op wat 1.4.x en eerder voor het afschermen bewaarde.
// In Firefox laadt het manifest deze bestanden zelf (background.scripts); daar bestaat importScripts niet.
if (typeof importScripts === 'function') {
  importScripts('edition.js', 'sites.js', 'config.js');
  // De gratis editie heeft de bestanden voor het afschermen niet (zie tools/pack.mjs).
  if (globalThis.KameloEdition !== 'public') importScripts('policy.js', 'licence.js', 'vaultcrypto.js', 'vaultstore.js', 'stats.js', 'teams/terms-index.js', 'detector.js', 'vaultscope.js');
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
  if (reason === 'install') chrome.tabs.create({ url: 'https://kamelo.eu/welcome' });
});

// De gratis editie schermt niets meer af (sinds 12 okt 2026). Wat versie 1.4.x en eerder daarvoor op dit apparaat
// bewaarde, gaat weg: de kluis (ook versleuteld), de kluisbeveiliging, het maandoverzicht en de eigen woordenlijsten.
// Bij elke update en elke start, zodat er ook na een onderbroken update niets persoonlijks blijft staan.
const MASKING_KEYS = ['vault', 'vaultEnc', 'protect', 'stats', 'noticesSeen'];
const MASKING_SETTINGS = ['restore', 'customTerms', 'allowList', 'allowMeta', 'customAiSites', 'retentionDays',
  // De gratis popup heeft geen knoppen meer voor de meldingen per onderwerp: die gaan terug naar de standaard (aan),
  // anders kan iemand die ze ooit uitzette ze nooit meer aanzetten. Aan/uit van Kamelo zelf blijft zoals het was.
  'topicWarnings', 'mutedTopics'];
async function forgetMasking() {
  try {
    await chrome.storage.local.remove(MASKING_KEYS);
    await chrome.storage.session.remove(['vault', 'key', 'locked', 'ready']);
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
// site (zie vaultscope.js). Zo kan een website, ook een gekraakte, nooit de hele kluis of de sleutel bereiken.
chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });

// Berichten komen alleen van Kamelo zelf, maar content scripts draaien in websites. Daarom:
// - de kluis lezen en schrijven kan alleen voor de site van de afzender, zoals de browser die doorgeeft;
// - vergrendelen, wegschrijven en Private Chat-teksten ophalen alleen vanuit Kamelo's eigen pagina's (popup, kluisvenster, chat).
const fromExtensionPage = sender => sender.id === chrome.runtime.id && !!sender.url?.startsWith(chrome.runtime.getURL(''));

// Alleen Kamelo Business: de kluis. In een eigen blok, zodat namen niet botsen als dit script samen met een pagina
// wordt geladen (previews).
if (TEAMS) {
const PC = globalThis.PrivacyCrypto;

const { emptyVault, initSession } = globalThis.PrivacyVault;
const VS = globalThis.PrivacyVaultScope;
const D = globalThis.PrivacyDetector;

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

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === 'pf:licence') { licence().then(s => reply({ active: !!s.active, until: s.until || 0 }), () => reply({ active: false, until: 0 })); return true; }
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
