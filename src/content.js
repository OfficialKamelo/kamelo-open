// Content script.
// In beide edities (zie edition.js): op AI-chatsites een rustige melding bij een persoonlijk onderwerp, met de knop
// naar een tijdelijke chat en (in Chrome) naar Private Chat. Alleen in Kamelo Business (MASK) daarnaast:
// schermt persoonsgegevens af in alles wat naar een AI gaat:
//  - op AI-sites (ChatGPT, Gemini, Claude, …) in elk tekstveld;
//  - op andere sites (Gmail, Slack, Notion, …) alleen in AI-velden, zoals "Help me schrijven";
//  - in verzoeken die een pagina rechtstreeks naar een AI-API stuurt (zie net-main.js);
//  - op sites die de gebruiker zelf als AI heeft gemarkeerd, in elk tekstveld.
// Gewone berichten aan mensen blijven onaangeroerd.
//
// 1. Plakken: gegevens worden direct vervangen door placeholders.
// 2. Versturen (Enter of verstuurknop): staan er nog gegevens in, dan wordt het bericht eerst
//    afgeschermd en tegengehouden, zodat de gebruiker kan controleren.
// 3. Antwoorden: de placeholders blijven op de pagina staan. De echte waarden zie je alleen in Kamelo's eigen kaart
//    (de Kamelo-knop bij het antwoord, in een gesloten shadow root), nooit in iets wat de site kan uitlezen.
(() => {
  'use strict';
  const D = globalThis.PrivacyDetector;
  const C = globalThis.PrivacyConfig;
  const S = globalThis.PrivacySites;
  const I = globalThis.PrivacyI18n;
  const T = globalThis.PrivacyTopics;
  const TA = globalThis.KameloTopicAi;
  // Gevoelige gegevens (BSN, IBAN, kaart, paspoort, wachtwoord, sleutel) herkennen: alleen voor de melding in de gratis
  // editie (identifiers.js). Kamelo Business schermt ze af met detector.js.
  const ID = globalThis.PrivacyIdentifiers;
  // Alleen Kamelo Business: beheerd beleid van de organisatie (policy.js). In de gratis editie ontbreekt het.
  const P = globalThis.KameloPolicy;
  // Alleen Kamelo Business: beleid per AI-app (teams/ai-apps.js): masked, allowed of blocked.
  const AA = globalThis.KameloAiApps;
  // Alleen Kamelo Business: nieuwe nummers voor placeholders legt de achtergrond vast (vaultscope.js, owned).
  const VS = globalThis.PrivacyVaultScope;
  // Afschermen alleen in Kamelo Business. De gratis editie laadt detector.js niet, en schermt nergens iets af.
  const MASK = !!D && globalThis.KameloEdition !== 'public';
  // Kamelo Business doet alleen iets met een geldige licentie (src/licence.js). De achtergrond controleert hem
  // (pf:licence); tot het antwoord er is, en zonder licentie, doet dit script niets: niet afschermen, geen knoppen,
  // geen bestanden, geen kaarten of meldingen. Alleen deze ene vraag aan de achtergrond, geen detectiewerk.
  let licensed = MASK ? null : true; // null: nog niet bekend
  let licensedUntil = MASK ? 0 : Infinity;
  const active = () => !MASK || (licensed === true && Date.now() <= licensedUntil);
  // Al actief in dit frame (bijv. ook ingevoegd na installeren)? Dan niets doen, tenzij die versie geen verbinding
  // met de extensie meer heeft. Oudere versies zetten hier true in plaats van een functie.
  const prev = globalThis.__privacyfilterActive;
  if (!C || !S || (typeof prev === 'function' && prev())) return;
  const alive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
  globalThis.__privacyfilterActive = alive;

  // Na een update draait de vorige versie in open tabs nog door, zonder verbinding met de extensie (zie background.js).
  // Zodra een nieuwere versie zich meldt, laat die oude alles aan de nieuwe over; zolang er geen nieuwere is, blijft hij
  // afschermen met wat hij in het geheugen heeft. Alleen een losgekoppelde versie wijkt, zodat een site Kamelo zo niet uitzet.
  const INSTANCE = Math.random().toString(36).slice(2);
  let superseded = false;
  document.addEventListener('pf:hello', e => { if (e.detail !== INSTANCE && !alive()) superseded = true; });
  document.dispatchEvent(new CustomEvent('pf:hello', { detail: INSTANCE }));

  // userSettings: wat de gebruiker zelf instelde (wordt opgeslagen). settings: wat geldt, met het beleid van de
  // organisatie erover (alleen teams). Zonder beleid zijn ze gelijk.
  let userSettings = { ...C.DEFAULT_SETTINGS };
  let settings = MASK ? { ...userSettings, enabled: false } : userSettings;
  let policy = {};
  let vault = MASK ? D.emptyVault() : { byPlaceholder: {} };
  // Alleen teams: de documentlaag (teams/doclayer.js). Placeholders uit geüploade documenten, alleen in het werkgeheugen
  // van de browser, nooit in de kluis op schijf. Antwoorden en de Kamelo-kaart kennen ze wel.
  const DL = globalThis.KameloDocLayer;
  let docs = MASK ? D.emptyVault() : { byPlaceholder: {} };
  let docsEpoch;
  const docsPending = new Set(); // nog onderweg naar de achtergrond: een eerdere kopie van daar mag ze niet wegvagen
  let aiSite = S.siteFor(location.hostname); // de AI-site (zie sites.js), of null op een gewone site
  // Praat je hier nu met de AI? Op een AI-site altijd; in WhatsApp Web alleen als de chat met Meta AI open staat
  // (`only` in sites.js), nooit in een chat met iemand anders.
  const aiHere = () => !!aiSite && S.aiChatOpen(aiSite, document);
  let appMode = null; // de stand van deze AI-app volgens de organisatie (teams/ai-apps.js), of null
  let internalPaste = false;

  // Kluis per site (zie inScope in detector.js): gegevens die hier worden afgeschermd, komen alleen hier terug.
  // Bekende AI-sites met meerdere adressen (chatgpt.com en chat.openai.com) delen één bereik; chatbot-widgets van
  // verschillende bedrijven niet (S.scopeFor, dezelfde indeling als de achtergrond in vaultscope.js). Gegevens van
  // vóór de kluis per site (zonder site) gelden nergens meer: ze blijven afgeschermd en verlopen vanzelf.
  // Een venster zonder eigen adres (about:blank, srcdoc, data:, blob:, file:) hoort bij de pagina eromheen.
  // Kunnen we die niet bepalen, dan krijgt het venster een eigen, leeg bereik: nooit de hele kluis.
  const HOST = pageHost();
  const SCOPE = (HOST && S.scopeFor(HOST)) || (HOST ? HOST.replace(/^www\./, '') : `frame:${Math.random().toString(36).slice(2)}`);
  const LEGACY = false;

  function pageHost() {
    if (location.hostname) return location.hostname;
    try {
      const anc = location.ancestorOrigins;
      if (anc?.length) return new URL(anc[0]).hostname;
    } catch {}
    try { return window.parent.location.hostname; } catch {} // zelfde herkomst (Firefox heeft geen ancestorOrigins)
    return '';
  }

  // Tekstvelden: textarea, contenteditable en een gewone invoerregel (type text, search of zonder type). Andere soorten
  // (wachtwoord, e-mail, telefoon, nummer) en velden voor inloggen of betalen (autocomplete) blijven buiten schot.
  const EDITOR_SEL = 'textarea, input:not([type]), input[type="" i], input[type="text" i], input[type="search" i], ' +
    '[contenteditable]:not([contenteditable="false"])';
  const LOGIN_AUTOCOMPLETE = /\b(?:username|email|tel|one-time-code|current-password|new-password|cc-[a-z-]+|webauthn)\b/i;
  const isField = ed => ed.tagName === 'TEXTAREA' || ed.tagName === 'INPUT';
  const SKIP_SEL = 'script, style, noscript, textarea, [data-pf-raw]';
  const HINT_ATTRS = ['placeholder', 'aria-label', 'aria-placeholder', 'data-placeholder', 'title', 'data-testid', 'name', 'id'];

  const effective = () => {
    settings = P ? P.merge(userSettings, policy) : userSettings;
    appMode = MASK && AA && active() ? AA.modeFor(HOST, policy) : null;
    // Teams zonder geldige licentie: alles uit. Een AI-app die de organisatie toestaat (bijv. Harvey): Kamelo doet
    // daar niets, ook niet in verzoeken aan AI-API's. Geblokkeerd: niets afschermen, de pagina gaat weg (blockHere).
    if (!active() || appMode === 'allowed' || appMode === 'blocked') settings = { ...settings, enabled: false };
  };
  function applySettings(next) {
    userSettings = { ...C.DEFAULT_SETTINGS, ...(next || {}) };
    effective();
    aiSite = appMode === 'allowed' ? null : S.siteFor(location.hostname, settings.customAiSites)
      // Een AI-app die Kamelo kent zonder invoerveld (teams/ai-apps.js) of die de organisatie noemt: elk tekstveld.
      || (appMode === 'masked' && location.hostname ? { name: AA.nameFor(HOST), hosts: [HOST] } : null);
    if (appMode === 'blocked') blockHere();
    if (!settings.enabled) try { dataMarks?.clear?.(); } catch {} // uitgezet: geen blauwe markering laten staan (try: dataMarks staat verderop)
    if (MASK && active() && !MARKS) MARKS = makeMarks();
    if (aiSite && MASK && active()) startAnswers();
    repaintAll();
    if (watching) rescanAnswers();
  }

  // Na het herladen of bijwerken van de extensie blijft dit script actief in tabs die al open stonden,
  // maar zonder verbinding met de extensie: elke chrome.*-aanroep geeft dan "Extension context invalidated".
  // Het afschermen blijft werken met wat al in het geheugen staat; opslaan slaan we stil over.
  const store = (area, data) => { if (alive()) chrome.storage[area].set(data).catch(() => {}); };

  // De kluis loopt altijd via de achtergrond (zie vaultscope.js): dit script krijgt alleen het deel van deze site,
  // en wat het terugschrijft wordt alleen voor deze site overgenomen. Bij een wijziging komt pf:vault-changed binnen.
  const fetchVault = () => chrome.runtime.sendMessage({ type: 'pf:vault-get' });
  // De documentlaag van deze site. Gewist (vergrendeld, "Kluis wissen"): dan ook de originelen weg (teams/originals.js).
  const fetchDocs = () => (DL ? chrome.runtime.sendMessage({ type: 'pf:docs-get' }).then(d => {
    if (!d || typeof d !== 'object') return;
    if (docsEpoch !== undefined && d.epoch !== docsEpoch) globalThis.KameloOriginals?.clear();
    docsEpoch = d.epoch;
    delete d.epoch;
    for (const add of docsPending) DL.apply(d, add, SCOPE, vault);
    docs = d;
  }).catch(() => {}) : Promise.resolve());

  // De kluis staat in het werkgeheugen (chrome.storage.session); de achtergrond schrijft hem
  // (zo nodig versleuteld) naar schijf. Eerst wachten tot die hem heeft klaargezet.
  // Teams: eerst de licentie. Zonder geldige licentie wordt verder niets geladen (geen kluis, geen instellingen).
  let licenceTimer = 0;
  async function checkLicence() {
    if (!MASK) return true;
    const r = alive() ? await chrome.runtime.sendMessage({ type: 'pf:licence' }).catch(() => null) : null;
    licensed = r?.active === true;
    licensedUntil = Number(r?.until) || 0;
    // Loopt de licentie af terwijl deze pagina openstaat (na de 14 dagen na de vervaldag), dan stopt het hier ook.
    clearTimeout(licenceTimer);
    const left = licensedUntil - Date.now();
    if (licensed && left < 2 ** 31 - 2000) licenceTimer = setTimeout(() => applySettings(userSettings), Math.max(0, left) + 1000);
    return active();
  }
  let loaded = false;
  // Kamelo Business op een AI-site, nog bezig met opstarten (licentie, kluis, instellingen): dan gaat er niets ongemerkt
  // onafgeschermd weg. Plakken, Enter, de verstuurknop en uploaden wachten even, met een korte melding. Hooguit 15 s,
  // zodat een haperende achtergrond de site nooit blijvend dichtzet. Zonder licentie (licensed false) doet Kamelo niets.
  let started = !MASK;
  const startedAt = Date.now();
  const starting = () => MASK && !started && !superseded && !!S.siteFor(location.hostname) && licensed !== false
    && Date.now() - startedAt < 15000;
  function holdWhileStarting(e) {
    if (!starting()) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    showToast('compact', [el('span', { textContent: I.t('starting') })], 2500);
    return true;
  }
  // Een licentie die net is ingevuld (popup) of via het beleid binnenkomt: meteen aan, zonder de pagina te herladen.
  async function recheckLicence() {
    if (!MASK || superseded || !alive()) return;
    const was = active();
    const now = await checkLicence();
    if (now && !loaded) await load().catch(() => {});
    else if (now !== was) applySettings(userSettings);
  }

  const ready = (async () => {
    if (!(await checkLicence())) return;
    await load();
  })().catch(() => {}); // geen verbinding met de extensie: verder met de standaardinstellingen (teams: niets)

  async function load() {
    loaded = true;
    if (MASK) await chrome.runtime.sendMessage({ type: 'pf:init' }).catch(() => {});
    const [{ settings: s, noticesSeen: seen }, { vault: v }, p] = await Promise.all([
      chrome.storage.local.get(['settings', 'noticesSeen']),
      MASK ? fetchVault().then(vault => ({ vault })) : {},
      P ? P.read() : {},
      MASK ? fetchDocs() : null,
    ]);
    if (v && typeof v === 'object') vault = v;
    policy = p || {};
    noticesSeen = Number(seen) || 0;
    applySettings(s);
    started = true;
  }

  P?.watch(p => { policy = p; applySettings(userSettings); recheckLicence(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.licence || changes.testLicenceKeys)) recheckLicence();
    if (area === 'local' && changes.settings) applySettings(changes.settings.newValue);
    if (area === 'local' && changes.noticesSeen) noticesSeen = Number(changes.noticesSeen.newValue) || 0;
  });

  const opts = () => ({ customTerms: settings.customTerms, allowList: settings.allowList, types: settings.types, scope: SCOPE, legacy: LEGACY });
  // Mag de gebruiker een gegeven zelf zichtbaar laten? De organisatie kan dat uitzetten (allowKeepVisible).
  const mayKeep = () => settings.allowKeepVisible !== false;
  const restoreText = text => D.restore(D.restore(text, vault, { scope: SCOPE, legacy: LEGACY }), docs, { scope: SCOPE, legacy: LEGACY });
  // De echte waarde achter een placeholder van deze site (kluis of documentlaag), of undefined.
  const valueOf = ph => vault.byPlaceholder[ph] ?? docs.byPlaceholder?.[ph];
  const saveVault = () => {
    if (alive()) chrome.runtime.sendMessage({ type: 'pf:vault-set', vault }).catch(() => {});
  };
  // Afschermen met nummers die alleen van dit tabblad zijn: een ander tabblad van deze site kan anders hetzelfde
  // nummer aan iemand anders geven (zie owned in vaultscope.js). run(kluis) schermt af; { result } of { result, wait }.
  const ask = msg => (alive() ? chrome.runtime.sendMessage(msg) : Promise.resolve(null));
  const vaultTab = { get: () => vault, set: v => { vault = v; }, ask };
  const maskOwned = run => VS.owned(vaultTab, run);

  // ---------- Bestanden (alleen teams, src/teams/upload.js) ----------
  // Vóór de luisteraar voor plakken hieronder: een geplakt bestand gaat eerst langs het afschermen van bestanden.
  // Hetzelfde bereik en dezelfde nummering als getypte tekst (en dezelfde Kamelo-knop bij het antwoord), maar wat alleen in
  // een document staat gaat naar de documentlaag in het werkgeheugen, niet naar de kluis (docSession hieronder).
  const fileOpts = terms => (terms ? { ...opts(), customTerms: terms, types: [] } : opts());
  // Een document afschermen zonder iets in de kluis op schijf te zetten: een werkkopie (kluis + documentlaag), en
  // daarna alleen het nieuwe naar de documentlaag (in het werkgeheugen) en de tellers naar de kluis. Eerder getypte
  // gegevens houden hun placeholder.
  function docSession() {
    if (!DL) return null;
    const work = DL.working(vault, docs);
    const start = { ...work.counters };
    return {
      mask: (text, terms) => D.mask(text, work, fileOpts(terms)),
      // Nieuwe nummers vastleggen voordat de bestanden de pagina in gaan. false: een ander tabblad had ze al; de
      // tellers gaan dan omhoog en upload.js schermt opnieuw af.
      claim: async () => {
        const c = VS.newNumbers(start, work.counters);
        const r = c && await ask({ type: 'pf:claim', ...c }).catch(() => null);
        if (!r || typeof r !== 'object' || r.ok) return true;
        vault.counters = DL.maxCounters(vault.counters, r.counters);
        return false;
      },
      end: (files, results) => {
        const add = DL.harvest(work, vault, docs);
        DL.apply(docs, add, SCOPE, vault);
        if ((Object.keys(add.entries).length || Object.keys(add.keys).length) && alive()) {
          const sent = { entries: add.entries, keys: add.keys, counters: add.counters };
          docsPending.add(sent);
          chrome.runtime.sendMessage({ type: 'pf:docs-add', add: sent }).catch(() => {})
            .then(() => fetchDocs()).finally(() => docsPending.delete(sent));
        }
        if (add.changed) saveVault();
        // Het origineel onthouden (alleen in dit script), om te bekijken en bij downloaden terug te zetten.
        results.forEach((r, i) => {
          if (r.status !== 'unreadable' && r.file !== files[i]) globalThis.KameloOriginals?.keep(files[i], r.file).catch(() => {});
        });
      },
    };
  }
  if (MASK) globalThis.KameloUpload?.install({
    // Elke AI-dienst die Kamelo afschermt, niet alleen de sites met `files: true`: anders ging een bestand op een
    // afgeschermde AI-app zonder die vlag (Harvey, Julius, eigen AI-tools van de organisatie) ongewijzigd mee.
    // upload.js vangt de gewone events (kiezen, slepen, plakken), dus dat werkt op elke site. Niet in WhatsApp (only).
    active: () => !superseded && settings.enabled && settings.maskFiles !== false && !!aiSite && !aiSite.only,
    starting: () => starting(),
    unreadable: () => settings.unreadableFiles || 'ask',
    begin: docSession,
    mask: (text, terms) => D.mask(text, vault, fileOpts(terms)),
    done: items => { saveVault(); startAnswers(); count(items); },
    fallbackTarget: () => liveEditor(),
    compact: text => showToast('compact', [el('span', { textContent: text })], 6000),
    details: items => openDetails(uniqueItems(items), null, false),
    card: fileCard,
  });

  // Het origineel bekijken en downloads met de echte gegevens (alleen teams, src/teams/originals.js). Alleen op AI-sites
  // met uploaden, met een geldige licentie en Kamelo aan.
  const lookupPh = ph => { const v = restoreText(ph); return v === ph ? null : v; };
  if (MASK) globalThis.KameloOriginals?.install({
    active: () => !superseded && active() && settings.enabled && settings.maskFiles !== false && !!aiSite?.files,
    lookup: lookupPh,
    shadowHost: () => shadowHost(),
    logo: () => LOGO,
    dark: () => pageIsDark(),
    toast: text => showToast('compact', [el('span', { textContent: text })], 6000),
    t: (k, v) => I.t(k, v),
  });

  // Een kaart in de stijl van de melding: kop, tekst, knoppen. wait: pas klaar na een keuze (of sluiten: undefined).
  function fileCard({ title, text, buttons = [], ms = 15000, wait = false }) {
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };
      const body = el('div', { className: 'c' }, el('b', { textContent: title }));
      body.style.maxWidth = '360px'; // zo breed als de melding bij een gevoelig onderwerp, ook met een lange bestandsnaam
      body.style.overflowWrap = 'anywhere';
      if (text) { const m = el('span', { className: 'm', textContent: text }); m.style.whiteSpace = 'pre-line'; body.append(m); }
      if (buttons.length) {
        body.append(el('div', { className: 'k' }, ...buttons.map(b => textButton(b.primary ? 'p' : '', b.label, () => { hideToast(); b.run?.(); finish(b.value); }))));
      }
      showToast('card', [body, iconButton('x', I.t('detailsClose'), () => { hideToast(); finish(undefined); })], wait ? 600000 : ms);
      if (!wait) return finish(undefined);
      // Weg zonder keuze (Esc, een andere melding): dan geldt het als annuleren.
      const check = setInterval(() => { if (!body.isConnected || !toastShown()) { clearInterval(check); finish(undefined); } }, 300);
    });
  }

  // ---------- AI-beleid van de organisatie (alleen teams, src/teams/ai-policy.js) ----------
  // Met aiPolicyAck: bij de eerste klik in een tekstveld op een AI-site een kaart met "Ik heb het gelezen" en "Beleid lezen",
  // één keer per pagina, tot je het hebt gelezen (of het adres verandert). Alleen op dit apparaat bewaard.
  const AIP = globalThis.KameloAiPolicy;
  let policyAsked = false;
  if (MASK && AIP && window === window.top) window.addEventListener('focusin', e => {
    if (policyAsked || superseded || !aiHere() || !active()) return;
    const ed = findEditor(e.target);
    if (!ed) return;
    policyAsked = true;
    ready.then(async () => {
      if (!(await AIP.needed(policy, await AIP.read()).catch(() => false))) return;
      anchorEd = ed;
      const body = el('div', { className: 'c' }, el('b', { textContent: I.t('aiPolicy') }), el('span', { className: 'm', textContent: I.t('aiPolicyAckText') }),
        el('div', { className: 'k' },
          textButton('p', I.t('aiPolicyAcked'), () => { hideToast(); AIP.acknowledge(policy).catch(() => {}); }),
          textButton('', I.t('aiPolicyRead'), () => { const url = AIP.url(policy); if (url) window.open(url, '_blank', 'noopener'); })));
      showToast('card', [body, iconButton('x', I.t('detailsClose'), hideToast)], 60000);
    });
  }, true);

  // ---------- AI-apps die de organisatie blokkeert (alleen teams, src/teams/ai-apps.js) ----------
  // Ook als de medewerker het afschermen uitzette: blokkeren is een regel van de organisatie. De achtergrond stuurt
  // het tabblad meestal al door voordat dit script zover is (tabs.onUpdated); dit is de vangrail. Een venster in een
  // andere pagina (iframe) krijgt hier een melding in plaats van de app.
  let blockedHere = false;
  function blockHere() {
    if (blockedHere || superseded) return;
    blockedHere = true;
    try { window.stop(); } catch {}
    if (window === window.top && alive()) chrome.runtime.sendMessage({ type: 'pf:block' }).catch(() => {});
    const box = el('div', {},
      el('b', { textContent: I.t('blockedTitle', { app: AA.nameFor(HOST) }) }),
      el('p', { textContent: I.t('blockedText') }),
      el('p', { textContent: policy.supportContact ? I.t('blockedAsk', { contact: P.support(policy).value }) : I.t('blockedAskIt') }));
    box.setAttribute('style', 'max-width:420px;margin:15vh auto;padding:0 24px;font:15px/1.5 system-ui,-apple-system,sans-serif;color:#1d1d1f');
    const body = document.createElement('body');
    body.setAttribute('style', 'margin:0;background:#fff');
    body.dataset.pfBlocked = '';
    body.append(box);
    const html = document.documentElement || document.appendChild(document.createElement('html'));
    html.replaceChildren(document.createElement('head'), body);
  }

  // ---------- Editors ----------

  function findEditor(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const hit = el?.closest(EDITOR_SEL);
    if (!hit) return null;
    if (hit.tagName === 'INPUT') return hit.readOnly || hit.disabled || LOGIN_AUTOCOMPLETE.test(hit.autocomplete || '') ? null : hit;
    if (hit.tagName === 'TEXTAREA') return hit;
    let top = hit;
    while (top.parentElement?.isContentEditable) top = top.parentElement;
    return top;
  }

  // Gaat de inhoud van dit veld naar een AI?
  const aiFieldCache = new WeakMap();
  function goesToAi(ed) {
    if (aiHere()) return true;
    // In een chat met iemand anders (WhatsApp) nooit, ook niet als er "AI" in het label van het veld staat.
    if (aiSite?.only && ed.closest?.(aiSite.only.root)) return false;
    return hinted(ed);
  }

  function hinted(ed) {
    if (aiFieldCache.has(ed)) return aiFieldCache.get(ed);
    let hit = false;
    for (let n = ed, i = 0; n && i < 4 && !hit; n = n.parentElement, i++) {
      const text = HINT_ATTRS.map(a => n.getAttribute?.(a)).filter(Boolean).join(' ');
      hit = C.AI_FIELD_HINT.test(text);
    }
    // Rich-text editors (ProseMirror, Lexical) zetten de placeholder op een kind-element.
    if (!hit) {
      const ph = ed.querySelector?.('[data-placeholder], [placeholder]');
      hit = !!ph && C.AI_FIELD_HINT.test(ph.getAttribute('data-placeholder') || ph.getAttribute('placeholder'));
    }
    aiFieldCache.set(ed, hit);
    return hit;
  }

  function aiEditor(node) {
    const ed = findEditor(node);
    return ed && goesToAi(ed) ? ed : null;
  }

  const getText = ed => (isField(ed) ? ed.value : ed.innerText);

  // Voegt tekst in op de cursor (of vervangt alles). Voor rich-text editors (ProseMirror,
  // Quill) sturen we een synthetisch paste-event, zodat de editor zijn eigen state bijwerkt.
  function insertText(ed, text, replaceAll) {
    ed.focus();
    if (isField(ed)) {
      if (replaceAll) ed.select();
      if (!document.execCommand('insertText', false, text)) {
        // De eigen setter van de browser (niet die van React e.d.), en dan een input-event zodat de site het ziet.
        const proto = ed.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        const { selectionStart: s, selectionEnd: e, value } = ed;
        setter.call(ed, replaceAll ? text : value.slice(0, s) + text + value.slice(e));
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }
    if (replaceAll) {
      const range = document.createRange();
      range.selectNodeContents(ed);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    internalPaste = true;
    try { ed.dispatchEvent(ev); } finally { internalPaste = false; }
    if (!ev.defaultPrevented) document.execCommand('insertText', false, text);
  }

  // ctx: het veld en de afgeschermde tekst die erin is gezet, zodat een klik in de melding iets kan terugzetten.
  function afterMask(items, ctx = null) {
    saveVault();
    startAnswers();
    count(items);
    toast(items, ctx);
    if (ctx?.ed) paintSoon(ctx.ed);
  }

  // Voor het maandoverzicht in de popup: alleen hoeveel per soort, nooit de waarden (zie stats.js).
  function count(items) {
    const counts = {};
    for (const it of uniqueItems(items)) counts[it.type] = (counts[it.type] || 0) + 1;
    if (alive()) chrome.runtime.sendMessage({ type: 'pf:count', counts }).catch(() => {});
  }

  // Schermt de inhoud van het veld af. Geeft true terug als er iets is afgeschermd. Met nieuwe nummers komt de
  // afgeschermde tekst erin zodra de achtergrond ze heeft vastgelegd (tot dan is versturen tegengehouden).
  function guard(ed) {
    const text = getText(ed);
    const m = maskOwned(v => D.mask(text, v, opts()));
    if (!m.result.items.length) return false;
    const put = r => { insertText(ed, r.text, true); afterMask(r.items, { ed, segment: r.text, items: r.items }); };
    if (!m.wait) put(m.result);
    else m.wait.then(r => { if (getText(ed) === text) put(r); }).catch(() => {});
    return true;
  }

  window.addEventListener('paste', e => {
    if (superseded) return;
    if (!internalPaste && (e.clipboardData?.types || []).length && aiEditor(e.target) && holdWhileStarting(e)) return;
    if (internalPaste || !settings.enabled) return;
    const ed = aiEditor(e.target);
    const text = ed && e.clipboardData?.getData('text/plain');
    if (!text) return;
    byUser.set(ed, e.isTrusted);
    if (!MASK) { typedIn.add(ed); return checkTopics(text, ed); }
    const m = maskOwned(v => D.mask(text, v, opts()));
    typedIn.add(ed);
    if (!m.result.items.length) return checkTopics(text, ed);
    e.preventDefault();
    e.stopImmediatePropagation();
    const put = r => { insertText(ed, r.text, false); afterMask(r.items, { ed, segment: r.text, items: r.items }); };
    if (!m.wait) put(m.result);
    else m.wait.then(put).catch(() => {});
    checkTopics(text, ed); // na de melding hierboven
  }, true);

  window.addEventListener('keydown', e => {
    if (superseded) return;
    if (MASK && e.key === 'Enter' && !e.shiftKey && !e.isComposing && aiEditor(e.target) && holdWhileStarting(e)) return;
    if (!MASK || !settings.enabled || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const ed = aiEditor(e.target);
    if (ed && guard(ed)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Verstuurknoppen in veel talen (en, nl, de, fr, es, it, pt, pl, cs, sv, da, no, fi, tr, ru, …). Een woord telt alleen
  // aan het begin van een woord (of na een kleine letter, zoals btnSend): anders was "Tasks" of "Mask" ook een verstuurknop.
  const SEND_LABEL = new RegExp('send|absenden|verzend|verstuur|submit|stuur|ask|vraag|generate|genereer|create|maken|maak|' +
    'abschicken|fragen|erstellen|envoyer|envoi|soumettre|demander|enviar|envía|envia|preguntar|invia|inviare|invio|chiedi|' +
    'perguntar|wyślij|wyslij|odeslat|odeslání|skicka|lähetä|gönder|отправ|послать|发送|送信|전송|إرسال|שלח', 'giu');
  const DENSE_SCRIPT = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  const NOT_SEND = /stop|new[\s_-]*(?:chat|conversation|thread)|nieuwe[\s_-]*chat|neue[nr]?[\s_-]*chat|nouvelle[\s_-]*(?:discussion|conversation)|nuevo[\s_-]*chat/i;
  function hasSendWord(label) {
    for (const m of label.matchAll(SEND_LABEL)) {
      const prev = label[m.index - 1] || '', first = label[m.index];
      if (DENSE_SCRIPT.test(m[0]) || !/\p{L}/u.test(prev) || (/\p{Ll}/u.test(prev) && /\p{Lu}/u.test(first))) return true;
    }
    return false;
  }
  const BUTTON_SEL = 'button, [role="button"], input[type="submit" i], input[type="button" i], input[type="image" i]';

  function isSendButton(btn) {
    if (aiSite?.send) try { if (btn.matches(aiSite.send)) return true; } catch {} // ongeldige selector: op het label
    const label = [btn.getAttribute('aria-label'), btn.getAttribute('data-testid'), btn.title, btn.textContent,
      btn.tagName === 'INPUT' ? btn.value : ''].filter(Boolean).join(' ');
    return hasSendWord(label) && !NOT_SEND.test(label);
  }

  // De velden bij een knop: op het eerste niveau (van binnen naar buiten) waar er velden zijn, allemaal.
  function editorsNear(btn) {
    let n = btn;
    for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
      const eds = [...(n.querySelectorAll?.(EDITOR_SEL) || [])].map(findEditor).filter(Boolean);
      if (eds.length) return [...new Set(eds)];
    }
    const ed = findEditor(document.activeElement);
    return ed ? [ed] : [];
  }

  // Schermt elk van deze velden af dat naar een AI gaat. true: er is iets afgeschermd, dus het versturen tegenhouden.
  function guardAll(eds) {
    let hit = false;
    for (const ed of eds) if (goesToAi(ed) && guard(ed)) hit = true;
    return hit;
  }

  window.addEventListener('click', e => {
    if (superseded) return;
    if (!MASK) return;
    const btn = e.target.closest?.(BUTTON_SEL);
    if (!btn || !isSendButton(btn)) return;
    if (holdWhileStarting(e)) return;
    if (!settings.enabled) return;
    if (guardAll(editorsNear(btn))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Vangnet voor een knop die we niet herkennen (alleen een pictogram, een taal die hierboven ontbreekt): het formulier
  // rond het veld wordt verzonden. Ook dan eerst afschermen en tegenhouden, zodat de gebruiker kan controleren.
  window.addEventListener('submit', e => {
    if (superseded) return;
    if (!MASK || !(e.target instanceof HTMLFormElement)) return;
    if (e.target.querySelector(EDITOR_SEL) && holdWhileStarting(e)) return;
    if (!settings.enabled) return;
    const eds = [...new Set([...e.target.querySelectorAll(EDITOR_SEL)].map(findEditor).filter(Boolean))];
    if (guardAll(eds)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // ---------- Verzoeken naar AI-API's (via net-main.js) ----------
  // De pagina stuurt de body van een verzoek aan bijv. api.openai.com; wij schermen alle
  // tekstwaarden in de JSON af en sturen de nieuwe body terug.

  const TECHNICAL_KEYS = new Set([
    'model', 'role', 'type', 'id', 'tool_call_id', 'object', 'stop', 'response_format', 'format',
    'mime_type', 'mimeType', 'media_type', 'encoding', 'detail', 'voice', 'service_tier',
  ]);

  function maskRequestBody(text, v) {
    const items = [];
    const maskString = s => {
      if (s.length > 1000 && !/\s/.test(s)) return s; // base64-afbeeldingen en andere binaire data
      const r = D.mask(s, v, opts());
      items.push(...r.items);
      return r.text;
    };
    const walk = (value, key) => {
      if (typeof value === 'string') return TECHNICAL_KEYS.has(key) ? value : maskString(value);
      if (Array.isArray(value)) return value.map(v => walk(v, key));
      if (value && typeof value === 'object') {
        for (const k of Object.keys(value)) value[k] = walk(value[k], k);
      }
      return value;
    };
    let json;
    try { json = JSON.parse(text); } catch { return { body: maskString(text), items }; }
    const out = walk(json, '');
    return { body: items.length ? JSON.stringify(out) : text, items };
  }

  let refetchTimer = 0;
  // De popup vraagt hier op welke site we draaien, zodat hij niet hoeft te raden aan de hand van de url.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'pf:vault-changed' && MASK) {
      clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        if (!alive()) return;
        Promise.all([fetchVault().then(v => { vault = v || D.emptyVault(); }).catch(() => {}), fetchDocs()])
          .then(() => { if (watching) rescanAnswers(); });
      }, 50);
      return;
    }
    if (window !== window.top) return;
    if (msg?.type === 'pf:private-open' && aiSite?.private && !inPrivateChat()) { ready.then(() => goPrivate(liveEditor())); return; }
    if (msg?.type !== 'pf:status') return;
    ready.then(() => reply({ host: location.hostname, aiSite: S.siteFor(location.hostname)?.name ?? null, private: inPrivateChat() }));
    return true;
  });

  // Let op: dit event kan ook door de pagina zelf worden gestuurd (net-main.js draait in de pagina). Daarom:
  // - wat hier wordt afgeschermd, komt in het bereik van deze site (en kan dus niets van andere sites onthullen);
  // - een budget per pagina, zodat een site de kluis niet kan volstoppen tot echte gegevens eruit vallen;
  // - de naam in de melding moet eruitzien als een hostnaam.
  // Afschermen is vast (dezelfde waarde krijgt op deze site steeds dezelfde placeholder), dus een site kan hiermee een
  // gok controleren: komt 'Jan Jansen' terug als de [PERSON_3] die al in het gesprek staat? Dat is onvermijdelijk zolang
  // net-main.js in de pagina draait (de pagina kan dit event altijd namaken). Het antwoord bevat alleen de afgeschermde
  // versie van wat de pagina zelf meestuurde, nooit iets uit de kluis; het budget hieronder houdt het aantal gokken per
  // pagina klein, en het werkt alleen binnen de kluis van deze site.
  let apiBudget = 500;
  if (MASK) document.addEventListener('pf:ping', () => { if (!superseded) document.dispatchEvent(new CustomEvent('pf:pong')); });
  if (MASK) document.addEventListener('pf:mask', async e => {
    if (superseded) return;
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    await ready;
    let body = msg.body, items = [], blocked = false;
    if (settings.enabled && typeof body === 'string') {
      // Budget op: niet afschermen, maar ook niet onafgeschermd laten vertrekken als er iets persoonlijks in staat.
      if (apiBudget > 0) {
        const m = maskOwned(v => maskRequestBody(msg.body, v));
        try { ({ body, items } = m.wait ? await m.wait : m.result); } catch { blocked = true; }
      } else blocked = D.detect(body, opts()).length > 0;
    }
    apiBudget -= uniqueItems(items).length;
    document.dispatchEvent(new CustomEvent('pf:masked', { detail: JSON.stringify({ id: msg.id, body, blocked }) }));
    if (items.length) afterMask(items);
  });

  // Op AI-sites is niet elk bewerkbaar veld het invoerveld: ChatGPT zet bijv. e-mailconcepten in een bewerkbaar
  // blok in het antwoord. Alleen in het veld waarin de gebruiker typt of plakt krijgen placeholders een label (paint);
  // elders (antwoorden, ook bewerkbare blokken daarin) komt de Kamelo-knop erbij.
  // De selector uit sites.js is het snelst en het zekerst; zonder (of als die niet meer klopt) raden we.
  const typedIn = new WeakSet();
  // Kwam de laatste wijziging in dit veld van de gebruiker zelf (een echte toets of plakactie)? Een pagina kan zelf tekst
  // in het veld zetten en input-events sturen; dan vragen we de AI op dit apparaat niets (geen rekenwerk op commando
  // van de site), en wordt een vraag die naar Private Chat gaat niet vanzelf gesteld.
  const byUser = new WeakMap();
  window.addEventListener('input', e => {
    if (!active()) return;
    const ed = findEditor(e.target);
    if (!ed) return;
    typedIn.add(ed);
    byUser.set(ed, e.isTrusted);
    if (!superseded && settings.enabled && goesToAi(ed)) checkTopicsSoon(ed);
    paintSoon(ed);
  }, true);
  // Niet elke editor stuurt een input-event bij typen: sommige handelen elke toets zelf af (beforeinput met
  // preventDefault) en zetten de tekst er zelf in. Dan kwam de melding pas bij een later event, zoals een klik in het veld.
  // Daarom ook na elke toets en na een samengesteld teken (IME) kijken. checkTopicsSoon wacht zelf tot het typen even
  // stopt en kijkt naar de tekst, dus een extra aanroep kost niets; een melding die er al was, komt niet dubbel.
  const afterKey = e => {
    if (!active() || superseded || !settings.enabled) return;
    const ed = findEditor(e.target);
    if (!ed || !goesToAi(ed)) return;
    typedIn.add(ed);
    if (e.isTrusted) byUser.set(ed, true);
    checkTopicsSoon(ed);
  };
  window.addEventListener('keyup', afterKey, true);
  window.addEventListener('compositionend', afterKey, true);
  function isComposer(ed) {
    if (!aiHere()) return hinted(ed);
    if (matchesComposer(ed)) return true;
    const active = document.activeElement;
    return typedIn.has(ed) || (active && ed.contains(active)) || !!ed.closest('form') || hinted(ed);
  }
  function matchesComposer(ed) {
    const sel = aiSite.composer;
    if (!sel) return false;
    try { return !!(ed.closest(sel) || ed.querySelector(sel)); } catch { return false; } // ongeldige selector
  }

  // ---------- Antwoorden: placeholders blijven staan ----------
  // Strikte modus: Kamelo schrijft nooit echte waarden in de pagina (tekst, DOM, events of het klembord via de site),
  // want alles wat daar staat kan de site uitlezen. Een site kan zelf '[PERSON_1]' in een verborgen blok zetten en
  // kijken wat ervan wordt. Het antwoord houdt dus zijn placeholders. Bij elk blok met een placeholder uit de kluis van
  // deze site zet Kamelo een kleine knop (gesloten shadow root); een klik opent een kaart met dat antwoord mét de echte
  // gegevens, en een knop Kopiëren. Muis op een placeholder: het kaartje met de echte waarde (zie showHint).
  // Wat de pagina wél kan zien: dát er een knop of markering staat, dus dat een placeholder in de kluis van deze site
  // staat. Nooit de waarde.
  // Op AI-sites altijd; op andere sites pas zodra hier iets is afgeschermd.

  let watching = false;
  // Placeholders zoals detector.js ze maakt, ook met een samengestelde soort.
  const PH_ANY = /\[[A-Z]+(?:_[A-Z]+)*_\d+\]/g;
  // Waar een antwoord (of een bericht) begint, op de bekende chatsites en in veel chatwidgets. Het binnenste blok dat
  // hierop past is het antwoord; past niets, dan het dichtstbijzijnde blok (alinea, lijst, …).
  const ANSWER_SEL = '[data-message-author-role], [data-message-id], message-content, model-response, user-query, ' +
    '.markdown, .prose, [data-testid*="message" i], [data-testid*="turn" i], article, [role="article"], ' +
    '[class*="message" i], [class*="response" i], [class*="answer" i]';
  const answers = new Map(); // blok → { host, btn, key }
  const phMarks = new WeakMap(); // tekstknoop → zijn ph-markeringen
  const answerRanges = new Set(); // alle ph-markeringen buiten het invoerveld, om ze samen weg te halen
  const known = ph => restoreText(ph) !== ph; // staat deze placeholder in de kluis van deze site?
  const hasKnown = text => !!text && D.hasPlaceholder(text) && (text.match(PH_ANY) || []).some(known);
  const answersOn = () => watching && !superseded && settings.enabled && settings.answerButton !== false;

  function startAnswers() {
    if (watching) return;
    watching = true;
    rescanAnswers();
    const pending = new Set();
    let scheduled = false;
    new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'characterData') pending.add(m.target);
        else m.addedNodes.forEach(n => { if (!(n.nodeType === 1 && n.hasAttribute('data-pf-raw'))) pending.add(n); });
      }
      if (scheduled || !pending.size) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        const nodes = [...pending];
        pending.clear();
        nodes.forEach(n => n.isConnected && scanAnswers(n));
        pruneAnswers();
        pruneMarks();
      }, 30);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    addEventListener('scroll', placeSoon, { capture: true, passive: true });
    addEventListener('resize', placeSoon, { passive: true });
    // De site kan blokken verschuiven zonder dat er tekst verandert (zijbalk open, afbeelding geladen).
    setInterval(() => { if (answers.size) placeSoon(); }, 500);
  }

  function rescanAnswers() {
    if (!watching) return;
    pruneAnswers();
    if (!answersOn()) { for (const r of answerRanges) MARKS?.ph.delete(r); answerRanges.clear(); return; }
    scanAnswers(document.body);
  }

  function scanAnswers(root) {
    if (!root || !answersOn()) return;
    if (root.nodeType === Node.TEXT_NODE) return scanText(root);
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(SKIP_SEL)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) scanText(n);
    placeSoon();
  }

  function scanText(n) {
    for (const r of phMarks.get(n) || []) { MARKS?.ph.delete(r); answerRanges.delete(r); }
    phMarks.delete(n);
    const v = n.nodeValue, parent = n.parentElement;
    if (!v || !parent || !D.hasPlaceholder(v) || parent.closest(SKIP_SEL)) return;
    const ed = findEditor(parent);
    if (ed && isComposer(ed)) return; // het invoerveld: daar geeft paint() de placeholders een label
    let hit = false;
    const marks = [];
    for (const m of v.matchAll(PH_ANY)) {
      if (!known(m[0])) continue;
      hit = true;
      addMark('ph', n, m.index, n, m.index + m[0].length, { placeholder: m[0] }, marks); // zonder Highlight API: niets
    }
    if (marks.length) { phMarks.set(n, marks); marks.forEach(r => answerRanges.add(r)); }
    if (hit) addAnswer(answerRoot(parent));
  }

  // Het blok waar de knop bij hoort. Nooit de hele pagina, en nooit een blok met het invoerveld erin.
  function answerRoot(el) {
    const bad = r => !r || r === document.body || r === document.documentElement || !!r.closest(SKIP_SEL)
      || [...r.querySelectorAll(EDITOR_SEL)].some(e => { const ed = findEditor(e); return ed && isComposer(ed); });
    let root = null;
    try { root = el.closest(ANSWER_SEL); } catch {}
    if (bad(root)) {
      root = el;
      while (root && root !== document.body && !BLOCK_TAGS.test(root.tagName)) root = root.parentElement;
    }
    return bad(root) ? null : root;
  }

  function addAnswer(root) {
    if (!root || answers.has(root)) return;
    // Zit het al in een blok met een knop, dan geen tweede; omvat het blokken met een knop, dan neemt dit ze over.
    for (const [r, a] of answers) {
      if (r.contains(root)) return;
      if (root.contains(r)) { a.host.remove(); answers.delete(r); }
    }
    const [host, sr] = shadowHost();
    sr.innerHTML = `
      <style>
        :host { all: initial; }
        .b { position: fixed; z-index: 2147483646; width: 26px; height: 26px; display: none; place-items: center; padding: 0; margin: 0;
             border: 0; border-radius: 50%; cursor: pointer; background: #fff; box-shadow: 0 0 0 .5px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.12);
             opacity: .9; transition: opacity .15s, transform .15s; }
        .b.dark { background: #2c2c2e; box-shadow: 0 0 0 .5px rgba(255,255,255,.16), 0 2px 8px rgba(0,0,0,.4); }
        .b.on { display: grid; }
        .b:hover { opacity: 1; transform: scale(1.06); }
        .b:focus-visible { outline: 2px solid #0071e3; outline-offset: 2px; }
        svg { width: 16px; height: 16px; }
        @media (prefers-reduced-motion: reduce) { .b { transition: none; } }
      </style>
      <button type="button" class="b">${LOGO}</button>`;
    const btn = sr.querySelector('.b');
    btn.title = I.t('answerShow');
    btn.setAttribute('aria-label', I.t('answerShow'));
    btn.classList.toggle('dark', pageIsDark());
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openAnswer(root, e.detail === 0); });
    document.documentElement.appendChild(host);
    answers.set(root, { host, btn, key: '' });
  }

  function removeAnswer(root) {
    answers.get(root)?.host.remove();
    answers.delete(root);
    if (panel?.answer === root) closeDetails(false);
  }

  // Weg met knoppen bij blokken die er niet meer zijn of geen bekende placeholder meer hebben.
  function pruneAnswers() {
    for (const root of [...answers.keys()]) {
      if (!answersOn() || !root.isConnected || !hasKnown(root.textContent)) removeAnswer(root);
    }
    for (const r of answerRanges) if (!r.startContainer.isConnected) { MARKS?.ph.delete(r); answerRanges.delete(r); }
  }

  let placeFrame = 0;
  function placeSoon() {
    if (!placeFrame && answers.size) placeFrame = requestAnimationFrame(() => { placeFrame = 0; placeAnswers(); });
  }
  // Rechts naast het blok, gelijk met de bovenkant (en meeschuivend als je door een lang antwoord scrolt); past dat
  // niet, dan binnen de rechterrand. Alleen schrijven als de plek echt verandert.
  function placeAnswers() {
    for (const [root, a] of answers) {
      const r = root.getBoundingClientRect();
      const seen = r.width > 0 && r.height > 0 && r.bottom > 8 && r.top < innerHeight - 8
        && (root.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
      const left = Math.round(r.right + 6 + 26 <= innerWidth - 4 ? r.right + 6 : Math.max(4, r.right - 30));
      const top = Math.round(Math.max(4, Math.min(r.top, r.bottom - 26, innerHeight - 30)));
      const key = seen ? `${left},${top}` : 'off';
      if (key === a.key) continue;
      a.key = key;
      a.btn.classList.toggle('on', seen);
      if (seen) Object.assign(a.btn.style, { left: `${left}px`, top: `${top}px` });
    }
  }

  // De kaart: het antwoord met de echte gegevens, alleen voor de gebruiker (gesloten shadow root). Alles met
  // textContent en tekstknopen; de tekst is niet te selecteren, want een selectie kan de pagina uitlezen. Kopiëren
  // gaat via de knop, rechtstreeks vanuit dit script naar het klembord (de pagina ziet daar geen copy-event van).
  function openAnswer(root, viaKeyboard) {
    if (!root?.isConnected) return;
    closeDetails(false);
    const source = root.innerText || root.textContent || '';
    const restored = restoreText(source);
    const [host, sr] = shadowHost();
    sr.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .card { position: fixed; z-index: 2147483647; display: flex; flex-direction: column; border-radius: 16px;
                background: var(--bg); color: var(--fg); font: 13px/19px ${FONT}; -webkit-font-smoothing: antialiased;
                box-shadow: 0 0 0 .5px var(--edge), 0 18px 50px rgba(0,0,0,.2); overflow: hidden; outline: none;
                animation: pop .22s cubic-bezier(.2,.9,.3,1.1);
                --bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --line: rgba(0,0,0,.06); --edge: rgba(0,0,0,.12); --fill: #f2f2f7;
                --real-bg: #e8f1fd; --real-fg: #0a5cc2; --accent: #0071e3; }
        .card.dark { --bg: #1c1c1e; --fg: #f5f5f7; --muted: #98989d; --line: rgba(255,255,255,.08); --edge: rgba(255,255,255,.14); --fill: #2c2c2e;
                     --real-bg: rgba(10,132,255,.18); --real-fg: #64b0ff; --accent: #0a84ff;
                     box-shadow: 0 0 0 .5px var(--edge), 0 18px 50px rgba(0,0,0,.5); }
        header { display: flex; align-items: center; gap: 8px; padding: 12px 12px 4px 14px; flex: none; }
        header svg { width: 20px; height: 20px; flex: none; }
        h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
        .x { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; border: 0; padding: 0; background: var(--fill); color: var(--muted);
             display: grid; place-items: center; cursor: pointer; flex: none; }
        .x:hover { color: var(--fg); }
        .x svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
        .note { padding: 0 14px 10px; color: var(--muted); font-size: 12px; line-height: 16px; }
        .txt { padding: 10px 14px; border-top: 1px solid var(--line); overflow-y: auto; white-space: pre-wrap; overflow-wrap: anywhere;
               user-select: none; -webkit-user-select: none; }
        .r { color: var(--real-fg); background: var(--real-bg); border-radius: 4px; padding: 0 3px; }
        footer { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--line); flex: none; }
        .p { font: inherit; font-size: 12px; font-weight: 500; border: 0; cursor: pointer; border-radius: 999px; background: var(--accent); color: #fff; padding: 5px 14px; }
        .p:hover { filter: brightness(1.08); }
        .s { color: var(--muted); font-size: 12px; }
        button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        @keyframes pop { from { opacity: 0; transform: translateY(6px); } }
        @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
      </style>
      <section class="card answer" role="dialog" aria-modal="true" aria-labelledby="h" tabindex="-1">
        <header>${LOGO}<h2 id="h"></h2></header>
        <div class="note"></div>
        <div class="txt"></div>
        <footer></footer>
      </section>`;
    const card = sr.querySelector('.card');
    card.classList.toggle('dark', pageIsDark());
    sr.querySelector('#h').textContent = I.t('answerTitle');
    sr.querySelector('.note').textContent = I.t('answerOnlyYou', { site: aiSite?.name || location.hostname });
    const close = iconButton('x', I.t('detailsClose'), () => closeDetails(true));
    sr.querySelector('header').append(close);
    // De tekst: gewone stukken als tekstknoop, elke teruggezette waarde gemarkeerd, met zijn placeholder als titel.
    const parts = [];
    let at = 0;
    for (const m of source.matchAll(PH_ANY)) {
      const value = restoreText(m[0]);
      if (value === m[0]) continue;
      if (m.index > at) parts.push(document.createTextNode(source.slice(at, m.index)));
      parts.push(el('span', { className: 'r', textContent: value, title: m[0] }));
      at = m.index + m[0].length;
    }
    parts.push(document.createTextNode(source.slice(at)));
    const txt = sr.querySelector('.txt');
    txt.replaceChildren(...parts);
    const status = el('span', { className: 's' });
    status.setAttribute('role', 'status');
    const copy = textButton('p', I.t('answerCopy'), async () => {
      try {
        await navigator.clipboard.writeText(restored);
        status.textContent = I.t('copied');
      } catch { status.textContent = I.t('answerCopyFailed'); }
    });
    sr.querySelector('footer').append(copy, status);

    // Bij het antwoord: links gelijk met het blok, onder de bovenkant; zo breed als past.
    const r = root.getBoundingClientRect();
    const width = Math.min(560, innerWidth - 24);
    const left = Math.round(Math.max(12, Math.min(r.left, innerWidth - width - 12)));
    const top = Math.round(Math.max(12, Math.min(r.top, innerHeight - 260)));
    Object.assign(card.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, maxHeight: `${innerHeight - top - 12}px` });

    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDetails(false); return; }
      if (e.key !== 'Tab' || !card.contains(sr.activeElement)) return;
      e.preventDefault();
      (sr.activeElement === close ? copy : close).focus();
    };
    const onDown = e => { if (!e.composedPath().includes(host)) closeDetails(false); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    document.documentElement.appendChild(host);
    panel = { host, onKey, onDown, ed: null, answer: root };
    if (viaKeyboard) copy.focus({ preventScroll: true });
  }


  // ---------- Zichtbaar in de pagina ----------
  // Twee markeringen, getekend met de CSS Custom Highlight API (stijl in src/marks.css). De DOM van de site blijft
  // onaangeroerd: editors als ProseMirror draaien eigen wijzigingen terug, en een extra <span> breekt React. De pagina
  // kan zien wélke tekst gemarkeerd is, maar die tekst staat al op haar eigen pagina; echte waarden achter een
  // placeholder staan alleen in het kaartje, in een gesloten shadow root.
  //   pending   golflijn onder wat je typt en bij versturen wordt afgeschermd (zoals Grammarly, maar blauw: geen fout);
  //   ph        placeholders uit de kluis als blauw label, in het invoerveld en in antwoorden.
  // Muis erop: een kaartje met uitleg (bij een placeholder de echte waarde, in een gesloten shadow root), en bij een
  // golflijn "Nu afschermen" of "Zichtbaar laten".
  // Een browser zonder de API (Firefox vóór 140) slaat dit over; afschermen en de Kamelo-knop werken gewoon.

  // Pas aangemaakt zodra Kamelo Business actief is (applySettings): zonder licentie verandert er niets aan de pagina.
  let MARKS = null;
  const makeMarks = () => {
    if (!MASK) return null;
    try {
      if (!globalThis.CSS?.highlights || typeof Highlight !== 'function') return null;
      const m = { pending: new Highlight(), ph: new Highlight() };
      for (const [kind, h] of Object.entries(m)) CSS.highlights.set(`kamelo-${kind}`, h);
      return m;
    } catch { return null; }
  };
  const markInfo = new WeakMap(); // Range → { kind, … }

  function addMark(kind, startNode, start, endNode, end, info, list) {
    if (!MARKS) return;
    try {
      const r = document.createRange();
      r.setStart(startNode, start);
      r.setEnd(endNode, end);
      MARKS[kind].add(r);
      markInfo.set(r, { kind, ...info });
      list?.push(r);
    } catch {} // knoop net veranderd
  }

  // Een range op tekst die de site heeft vervangen, klapt dicht of hangt los: weg ermee.
  let pruneAt = 0;
  function pruneMarks() {
    if (!MARKS || Date.now() - pruneAt < 2000) return;
    pruneAt = Date.now();
    for (const h of Object.values(MARKS)) {
      for (const r of h) if (r.collapsed || !r.startContainer.isConnected) h.delete(r);
    }
  }

  // Het invoerveld: placeholders als label, en een golflijn onder wat bij versturen wordt afgeschermd. Per blok
  // (alinea), zodat een aanwijzing als "mijn naam is" in dezelfde zin meetelt. Een <textarea> heeft geen tekstknopen
  // die je kunt markeren; daar alleen de melding, zoals nu.
  const BLOCK_TAGS = /^(P|DIV|LI|H[1-6]|PRE|BLOCKQUOTE|TD|TH)$/;
  const PH_IN_TEXT = /\[[A-Z]+_\d+\]/g;
  const painted = new Map(); // veld → zijn ranges
  const paintTimers = new WeakMap();

  function paintSoon(ed) {
    if (!MARKS || !ed) return;
    clearTimeout(paintTimers.get(ed));
    paintTimers.set(ed, setTimeout(() => paint(ed), 250));
  }

  function unpaint(ed) {
    for (const r of painted.get(ed) || []) { MARKS.pending.delete(r); MARKS.ph.delete(r); }
    painted.delete(ed);
  }

  function repaintAll() {
    if (!MARKS) return;
    for (const ed of [...painted.keys()]) paint(ed);
  }

  function paint(ed) {
    if (!MARKS) return;
    unpaint(ed);
    if (superseded || !ed.isConnected || isField(ed) || !settings.enabled || !goesToAi(ed)) return;
    const mine = [];
    painted.set(ed, mine);
    const blocks = new Map();
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      let b = n.parentElement;
      while (b && b !== ed && !BLOCK_TAGS.test(b.tagName)) b = b.parentElement;
      if (!blocks.has(b)) blocks.set(b, []);
      blocks.get(b).push(n);
    }
    for (const nodes of blocks.values()) {
      const text = nodes.map(n => n.nodeValue).join('');
      if (!text.trim()) continue;
      // Plek in de bloktekst → [tekstknoop, plek daarin]. Een einde valt in de knoop ervóór, niet aan het begin van de volgende.
      const at = (i, isEnd) => {
        let acc = 0;
        for (const n of nodes) {
          const len = n.nodeValue.length;
          if (i < acc + len || (isEnd && i === acc + len)) return [n, i - acc];
          acc += len;
        }
        return [nodes.at(-1), nodes.at(-1).nodeValue.length];
      };
      const mark = (kind, start, end, info) => addMark(kind, ...at(start), ...at(end, true), { ed, ...info }, mine);
      for (const m of text.matchAll(PH_IN_TEXT)) {
        if (valueOf(m[0]) !== undefined) mark('ph', m.index, m.index + m[0].length, { placeholder: m[0] });
      }
      let found = [];
      // Heel lange tekst (een heel document geplakt): geen golflijnen, dat kost te veel bij elke toetsaanslag.
      if (text.length <= 20000) try { found = D.detect(text, { ...opts(), vault }); } catch {}
      for (const d of found) mark('pending', d.start, d.end, { type: d.type, value: d.value });
    }
  }

  // ----- Kaartje bij de muis -----
  let hint = null, hintRange = null, hintTimer = 0, hintFrame = 0;

  function markAt(x, y) {
    let node, offset;
    if (document.caretPositionFromPoint) ({ offsetNode: node, offset } = document.caretPositionFromPoint(x, y) || {});
    else ({ startContainer: node, startOffset: offset } = document.caretRangeFromPoint?.(x, y) || {});
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const near = r => [...r.getClientRects()].some(b => x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 2 && y <= b.bottom + 2);
    for (const kind of ['pending', 'ph']) {
      for (const r of MARKS[kind]) {
        try { if (r.isPointInRange(node, offset) && near(r)) return r; } catch {}
      }
    }
    return null;
  }

  document.addEventListener('mousemove', e => {
    if (!MARKS || hintFrame || superseded) return;
    if (!(MARKS.pending.size || MARKS.ph.size)) return;
    if (hint && e.composedPath().includes(hint.host)) return; // op het kaartje zelf
    const { clientX: x, clientY: y } = e;
    hintFrame = setTimeout(() => { // hooguit eens per 40 ms kijken wat er onder de muis staat
      hintFrame = 0;
      const r = markAt(x, y);
      if (r && r === hintRange) return void clearTimeout(hintTimer);
      if (r) return showHint(r);
      if (hint) hideHintIn(250);
    }, 40);
  }, { capture: true, passive: true });
  document.addEventListener('click', e => {
    if (!MARKS || superseded || !(MARKS.pending.size || MARKS.ph.size)) return;
    if (hint && e.composedPath().includes(hint.host)) return;
    const r = markAt(e.clientX, e.clientY);
    if (r && r !== hintRange) showHint(r);
  }, { capture: true, passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && hint) hideHint(); }, true);
  addEventListener('scroll', () => hint && hideHint(), { capture: true, passive: true });

  function hideHint() {
    clearTimeout(hintTimer);
    hint?.host.remove();
    hint = hintRange = null;
  }
  function hideHintIn(ms) {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, ms);
  }

  function showHint(r) {
    const info = markInfo.get(r);
    if (!info) return;
    hideHint();
    const [host, root] = shadowHost();
    root.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .h { position: fixed; z-index: 2147483647; max-width: 300px; padding: 10px 12px; border-radius: 12px; background: var(--bg); color: var(--fg);
             font: 13px/18px ${FONT}; -webkit-font-smoothing: antialiased; box-shadow: 0 0 0 .5px var(--edge), 0 10px 30px rgba(0,0,0,.16);
             animation: in .14s ease-out;
             --bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --edge: rgba(0,0,0,.14); --ph-bg: #e8f1fd; --ph-fg: #0a5cc2; --btn: #0071e3; --link: #0066cc; }
        .h.dark { --bg: #2c2c2e; --fg: #f5f5f7; --muted: #a1a1a6; --edge: rgba(255,255,255,.16); --ph-bg: rgba(10,132,255,.22); --ph-fg: #8cc4ff; --link: #4da3ff;
                  box-shadow: 0 0 0 .5px var(--edge), 0 10px 30px rgba(0,0,0,.5); }
        .top { display: flex; align-items: center; gap: 6px; font-weight: 600; }
        .top svg { width: 16px; height: 16px; flex: none; }
        .m { margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 16px; }
        .v { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tag { font: 500 11.5px ui-monospace, "SF Mono", Menlo, monospace; color: var(--ph-fg); background: var(--ph-bg); padding: 1px 5px; border-radius: 5px; white-space: nowrap; }
        .k { display: flex; align-items: center; gap: 12px; margin-top: 9px; }
        button { font: inherit; font-size: 12px; font-weight: 500; border: 0; cursor: pointer; border-radius: 999px; }
        .p { background: var(--btn); color: #fff; padding: 4px 12px; }
        .p:hover { filter: brightness(1.08); }
        .l { background: none; color: var(--link); padding: 4px 0; }
        .l:hover { text-decoration: underline; }
        button:focus-visible { outline: 2px solid var(--btn); outline-offset: 2px; }
        @keyframes in { from { opacity: 0; transform: translateY(3px); } }
        @media (prefers-reduced-motion: reduce) { .h { animation: none; } }
      </style>
      <div class="h" role="tooltip"></div>`;
    const box = root.querySelector('.h');
    box.classList.toggle('dark', pageIsDark());
    const tag = text => el('span', { className: 'tag', textContent: text });
    const line = (...kids) => el('div', { className: 'm' }, ...kids);
    const top = text => { const t = el('div', { className: 'top' }); t.innerHTML = LOGO; t.append(el('span', { textContent: text })); return t; };
    if (info.kind === 'ph') {
      const value = valueOf(info.placeholder);
      const type = info.placeholder.slice(1, info.placeholder.lastIndexOf('_'));
      box.append(top(capital(I.typeLabel(type))));
      if (value !== undefined) box.append(el('div', { className: 'v', textContent: shownValue({ type, value }) }));
      box.append(line(`${I.t('markAiSees')} `, tag(info.placeholder)));
      // In het veld waarin je typt: klik en kies. Namen e.d. mag je toch zichtbaar laten; gevaarlijke gegevens niet.
      if (value !== undefined && info.ed?.isConnected) {
        if (D.ALWAYS.has(type)) box.append(line(I.t('markAlways')));
        else if (mayKeep()) box.append(el('div', { className: 'k' }, textButton('l', I.t('detailsKeep'), () => {
          hideHint(); keepVisible(String(value), null); showRealIn(info.ed, info.placeholder, String(value)); })));
      }
    } else {
      const always = D.ALWAYS.has(info.type);
      box.append(top(capital(I.typeLabel(info.type))), line(I.t(always ? 'markAlways' : 'markPending')),
        el('div', { className: 'k' },
          textButton('p', I.t('markMaskNow'), () => { hideHint(); if (info.ed.isConnected) guard(info.ed); }),
          ...(always || !mayKeep() ? [] : [textButton('l', I.t('detailsKeep'), () => { hideHint(); keepVisible(info.value, null); paint(info.ed); })])));
    }
    box.addEventListener('mouseenter', () => clearTimeout(hintTimer));
    box.addEventListener('mouseleave', () => hideHintIn(250));
    document.documentElement.appendChild(host);
    // Boven het woord, links gelijk; past dat niet (bovenin het scherm), dan eronder.
    const rect = r.getClientRects()[0] || r.getBoundingClientRect();
    const left = Math.round(Math.max(8, Math.min(rect.left - 4, innerWidth - box.offsetWidth - 8)));
    const above = rect.top - box.offsetHeight - 8 >= 8;
    Object.assign(box.style, { left: `${left}px`, top: `${Math.round(above ? rect.top - box.offsetHeight - 8 : rect.bottom + 8)}px` });
    hint = { host };
    hintRange = r;
  }

  // ---------- Kopiëren ----------
  // Wat je van de pagina kopieert (selectie of de kopieerknop van de site), houdt de placeholders: Kamelo verandert
  // niets aan het klembord van de site en geeft de pagina geen weg om echte waarden op te vragen (geen pf:restore
  // meer). De versie met de echte gegevens kopieer je met de knop in Kamelo's eigen kaart (openAnswer).

  // ---------- Melding ----------
  // Een pil vlak boven het invoerveld: het eerste gegeven doorgestreept → zijn placeholder, "+N meer", Bekijk en ×.
  // Na vijf keer alleen nog "N afgeschermd". Bekijk opent op dezelfde plek een kaart: per gegeven wat de AI ziet.
  // Neemt nooit de focus over; Esc sluit hem.

  const LOGO = `<svg viewBox="0 0 128 128" aria-hidden="true"><path transform="translate(-35.29 -36.75) scale(0.19469) translate(0 1024) scale(.1 -.1)" fill="#1A8CFF" fill-rule="evenodd" d="M6313 7694 c-70 -26 -126 -84 -178 -186 -142 -276 -218 -293 -685 -152 -1562 470 -3188 -605 -3414 -2258 -163 -1187 218 -2103 1043 -2514 1165 -579 2347 337 1884 1461 -25 61 -67 170 -94 243 -67 185 -102 243 -229 377 -274 288 -170 479 253 463 203 -8 269 -43 522 -274 260 -238 317 -293 445 -430 285 -304 426 -361 516 -208 93 158 18 335 -174 414 -247 103 -361 236 -323 378 33 122 83 132 711 142 782 13 980 51 1280 247 496 325 401 1004 -210 1491 -52 42 -194 173 -315 291 -423 415 -797 601 -1032 515z m-2514 -2709 c230 -118 251 -394 46 -579 -313 -283 -388 -441 -332 -703 102 -477 828 -555 828 -89 0 215 -213 286 -337 113 -95 -132 -167 -143 -204 -31 -76 231 185 458 448 390 743 -190 352 -1281 -425 -1186 -687 84 -1063 743 -816 1433 149 419 571 767 792 652z M7030 6440 a300 300 0 1 0 600 0 a300 300 0 1 0 -600 0z"/></svg>`;
  // Het Melo-logo (brand/melo/melo-head.svg, glimlach als boog) op de knop "Ask Melo".
  const MELO_ICON = '<svg viewBox="0 -18 240 240" fill="currentColor" aria-hidden="true"><clipPath id="melo-ask"><path clip-rule="evenodd" d="M-20 -30H260V250H-20ZM11 100.5a34 36.5 0 1 0 68 0a34 36.5 0 1 0 -68 0ZM157.5 99a35.5 38 0 1 0 71 0a35.5 38 0 1 0 -71 0ZM84 140C100 156 136 156 152 140A6 6 0 0 1 152 152C136 168 100 168 84 152A6 6 0 0 1 84 140Z"/></clipPath><g clip-path="url(#melo-ask)"><ellipse cx="43" cy="98" rx="37" ry="45"/><ellipse cx="197" cy="98" rx="38" ry="45.5"/><path d="M57 57C75 42 95 24 112 13C124 5 146 0 156 11C164 22 172 38 188 55L214 130 210 140C210 175 175 196 118 196C62 196 31 178 31 140L28 120Z"/></g><ellipse cx="48" cy="104.5" rx="17.4" ry="19.5"/><ellipse cx="190" cy="103.5" rx="18" ry="20.5"/></svg>';
  const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const COMPACT_AFTER = 5; // zo vaak de volledige melding, daarna de compacte

  const uniqueItems = items => [...new Map(items.map(it => [it.placeholder, it])).values()];
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

  // Bankrekeningen en betaalkaarten half verborgen, wachtwoorden helemaal: genoeg om ze te herkennen.
  function shownValue(it) {
    const v = String(it.value);
    if (it.type === 'IBAN' || it.type === 'BANK') {
      const groups = v.trim().split(/\s+/);
      if (groups.length >= 4) return `${groups[0]} •••• •••• ${groups.slice(-2).join(' ')}`;
      const c = v.replace(/\s/g, '');
      return c.length > 10 ? `${c.slice(0, 4)} •••• •••• ${c.slice(-6)}` : v;
    }
    if (it.type === 'CARD') return `•••• ${v.replace(/\D/g, '').slice(-4)}`;
    if (it.type === 'SECRET') return '••••••••';
    return v;
  }

  // Waar de melding komt (zoals Grammarly, 1Password en DLP-extensies: naast het veld, nooit over de tekst):
  //   1. boven de zichtbare balk om het invoerveld, links gelijk met de balk (de balk, niet het veld: eromheen zitten
  //      nog rand, knoppen en bijlagen);
  //   2. past dat niet (een lange tekst maakt de balk hoog, of de balk staat bovenin), dan eronder;
  //   3. dan ernaast, gelijk met de bovenkant (op een breed scherm is daar ruimte genoeg);
  //   4. pas als niets past (smal scherm, balk zo hoog als het scherm): klein (logo, Bekijk, ×) half over de bovenrand
  //      van de balk, waar alleen binnenruimte zit.
  // Zonder veld (bijv. een verzoek aan een AI-API) of met het veld buiten beeld: rechtsonder.
  let anchorEd = null;
  const GAP = 8;
  const hasBox = s => (s.backgroundColor !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(s.backgroundColor))
    || parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none';
  // De balk: de dichtstbijzijnde voorouder met een eigen achtergrond, rand of schaduw die niet veel groter is dan het
  // zichtbare deel van het veld. Het veld zelf telt alleen voor zover het niet weggescrold is.
  function composerBar(ed) {
    const own = ed.getBoundingClientRect();
    let top = own.top, bottom = own.bottom, bar = null;
    for (let n = ed.parentElement, d = 0; n && n !== document.body && d < 12; n = n.parentElement, d++) {
      const r = n.getBoundingClientRect();
      const s = getComputedStyle(n);
      if (s.overflowY !== 'visible') { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
      if (!bar && r.height && r.height <= bottom - top + 260 && r.width <= own.width + 480 && hasBox(s)) bar = r;
    }
    // Geen balk met eigen opmaak gevonden: dan het formulier eromheen, als dat niet veel groter is.
    const form = !bar && ed.closest('form')?.getBoundingClientRect();
    if (form && form.height && form.height <= bottom - top + 260 && form.width <= own.width + 480) bar = form;
    return bar
      ? { top: Math.min(bar.top, top), bottom: Math.max(bar.bottom, bottom), left: bar.left, right: bar.right }
      : { top, bottom, left: own.left, right: own.right };
  }
  // Het veld van de laatste melding; vervangt de site het (Grok doet dat na plakken), dan het nieuwe.
  function liveEditor() {
    if (anchorEd?.isConnected) return anchorEd;
    let ed = findEditor(document.activeElement);
    if (!ed && aiSite?.composer) try { ed = findEditor(document.querySelector(aiSite.composer)); } catch {}
    if (ed) anchorEd = ed;
    return ed;
  }
  // prev: de vorige plek. Terug naar boven pas bij 16px extra ruimte, zodat hij niet bij elke regel heen en weer springt.
  // need: hoogte die de melding nodig heeft; width: zijn breedte.
  function anchor(need = 60, prev, width = 240) {
    const ed = liveEditor();
    if (!ed) return null;
    const own = ed.getBoundingClientRect();
    if (!own.width || !own.height) return null;
    const b = composerBar(ed);
    if (b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) return null;
    const left = Math.round(Math.max(12, Math.min(b.left, innerWidth - 240)));
    if (b.top - GAP - need >= 8 + (prev === 'below' ? 16 : 0)) {
      return { side: 'above', left, bottom: Math.round(innerHeight - b.top + GAP), room: b.top - GAP - 8 };
    }
    if (b.bottom + GAP + need <= innerHeight - 8) {
      return { side: 'below', left, top: Math.round(b.bottom + GAP), room: innerHeight - b.bottom - GAP - 8 };
    }
    const top = Math.round(Math.max(8, b.top));
    const room = innerHeight - top - 8;
    if (b.right + GAP + width <= innerWidth - 8) return { side: 'right', left: Math.round(b.right + GAP), top, room };
    if (b.left - GAP - width >= 8) return { side: 'left', left: Math.round(b.left - GAP - width), top, room };
    const edge = Math.round(Math.max(8, b.top - 14));
    return { side: 'edge', left: left + 12, top: edge, room: innerHeight - edge - 8 };
  }
  // De volle breedte, ook als hij klein op de rand staat: anders past hij klein wel ernaast, en springt hij heen en weer.
  function fullWidth(box) {
    if (box.dataset.side !== 'edge' && box.offsetWidth) box.dataset.w = box.offsetWidth;
    return +box.dataset.w || undefined;
  }
  function place(box, need) {
    const a = anchor(need, box.dataset.side, fullWidth(box));
    box.dataset.side = a ? a.side : '';
    Object.assign(box.style, a
      ? { left: `${a.left}px`, right: 'auto', top: a.top == null ? 'auto' : `${a.top}px`, bottom: a.top == null ? `${a.bottom}px` : 'auto', maxWidth: `${innerWidth - a.left - 12}px` }
      : { left: 'auto', right: '20px', top: 'auto', bottom: '20px', maxWidth: `${innerWidth - 40}px` });
    return a;
  }

  // Het invoerveld groeit mee met de tekst (typen, een lange tekst plakken) en de pagina kan scrollen: zolang de
  // melding of kaart open is, schuift hij elke frame mee. Alleen schrijven als de plek echt verandert.
  // Eén lus per vak: een nieuwe melding terwijl de vorige nog openstaat, stopt de oude lus.
  const followers = new WeakMap();
  function follow(box, need, isOpen) {
    let last = '';
    const id = (followers.get(box) || 0) + 1;
    followers.set(box, id);
    const tick = () => {
      if (followers.get(box) !== id || !box.isConnected || !isOpen()) return;
      const a = anchor(need, box.dataset.side, fullWidth(box));
      const key = a ? `${a.side},${a.left},${a.bottom},${a.top}` : 'corner';
      if (key !== last) { last = key; place(box, need); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Licht of donker zoals de site zelf (ChatGPT kan donker zijn terwijl het systeem licht staat): de achtergrond
  // midden op de pagina bepaalt het; lukt dat niet, dan de systeeminstelling.
  function pageIsDark() {
    for (let node of [document.elementFromPoint(innerWidth / 2, innerHeight / 2), document.body, document.documentElement]) {
      for (; node; node = node.parentElement) {
        const [r, g, b, a = 1] = (getComputedStyle(node).backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (r !== undefined && a > .5) return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
      }
    }
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Eigen element met een gesloten shadow root: de pagina kan er niet in kijken en zijn stijlen komen er niet in.
  function shadowHost() {
    const host = document.createElement('div');
    host.setAttribute('data-pf-raw', '');
    host.setAttribute('style', 'all: initial !important');
    return [host, host.attachShadow({ mode: 'closed' })];
  }

  let toastHost, toastRoot, toastTimer;
  function toastBox() {
    if (toastHost?.isConnected) return toastRoot.querySelector('.t');
    [toastHost, toastRoot] = shadowHost();
    toastRoot.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .t { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; display: flex; align-items: center; gap: 10px;
             padding: 7px 8px 7px 10px; border-radius: 999px; background: rgba(29,29,31,.92); color: #fff;
             -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); font: 13px/18px ${FONT}; -webkit-font-smoothing: antialiased;
             box-shadow: 0 8px 24px rgba(0,0,0,.18); white-space: nowrap;
             opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; pointer-events: none;
             --dim: rgba(255,255,255,.62); --faint: rgba(255,255,255,.45); --tag-bg: rgba(10,132,255,.28); --tag: #a9d3ff;
             --link: #4da3ff; --hover: rgba(255,255,255,.12); --ring: #fff; }
        .t.light { background: rgba(255,255,255,.96); color: #1d1d1f; box-shadow: 0 0 0 .5px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.3);
                   --dim: #6e6e73; --faint: #6e6e73; --tag-bg: #e8f1fd; --tag: #0a5cc2; --link: #0066cc; --hover: rgba(0,0,0,.06); --ring: #0071e3; }
        .t.show { opacity: 1; transform: none; pointer-events: auto; }
        svg { width: 18px; height: 18px; flex: none; }
        .what { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .real { color: var(--dim); text-decoration: line-through; text-decoration-color: var(--faint); overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
        .arrow { color: var(--faint); }
        .tag { background: var(--tag-bg); color: var(--tag); padding: 0 6px; border-radius: 5px; font-weight: 500; }
        .more { color: var(--dim); }
        button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
        .act { color: var(--link); font-weight: 600; padding: 2px 4px; border-radius: 6px; }
        .act:hover { text-decoration: underline; }
        .x { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: var(--dim); flex: none; }
        .x:hover { background: var(--hover); }
        .x svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
        button:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
        .t.compact { padding: 5px 6px 5px 8px; gap: 6px; font-size: 12px; }
        .t.compact > svg:first-child { width: 16px; height: 16px; }
        /* Klein op de rand van de balk, als er nergens anders plek is (zie anchor) */
        .t.pill[data-side="edge"] { padding: 2px 4px 2px 8px; gap: 6px; }
        .t.pill[data-side="edge"] :is(.what, .more) { display: none; }
        /* Gevoelig onderwerp: dezelfde melding, met een zin en twee knoppen */
        .t.card { border-radius: 14px; align-items: flex-start; white-space: normal; max-width: 400px; padding: 10px 10px 10px 12px; }
        .t.card > svg:first-child { width: 22px; height: 22px; }
        .c { min-width: 0; }
        .c b { display: block; font-weight: 600; }
        .c .m { display: block; margin-top: 2px; color: var(--dim); font-size: 12px; line-height: 16px; }
        /* wrap: bij 200% zoom in het Frans of Spaans viel "Discussion temporaire" anders buiten de kaart */
        .k { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .k button { font-size: 12px; font-weight: 500; background: var(--hover); border-radius: 999px; padding: 4px 11px; white-space: nowrap; }
        .k .p { background: #0071e3; color: #fff; }
        .k .p:hover { filter: brightness(1.08); }
        .k .melo { display: inline-flex; align-items: center; gap: 5px; padding-left: 8px; }
        .k .melo svg { width: 17px; height: 15px; fill: currentColor; }
        .k .q { background: none; color: var(--dim); padding: 4px 6px; }
        .k .q:hover { text-decoration: underline; }
        button.done { display: flex; background: none; padding: 0; cursor: pointer; } button.done:hover { text-decoration: underline; }
        .c .done { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 12px; color: var(--dim); }
        .c .done::before { content: ""; width: 8px; height: 4px; margin-top: -2px; border: solid #34c759; border-width: 0 0 1.6px 1.6px; transform: rotate(-45deg); }
        @media (prefers-reduced-motion: reduce) { .t { transform: none; transition: opacity .15s; } }
      </style>
      <div class="t" role="status" aria-live="polite"></div>`;
    const box = toastRoot.querySelector('.t');
    // Met de muis of het toetsenbord erop blijft hij staan.
    box.addEventListener('mouseenter', () => clearTimeout(toastTimer));
    box.addEventListener('mouseleave', () => { if (!box.contains(toastRoot.activeElement)) hideToastIn(2500); });
    box.addEventListener('focusin', () => clearTimeout(toastTimer));
    box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget) && !box.matches(':hover')) hideToastIn(2500); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !panel && box.classList.contains('show')) hideToast();
    }, true);
    addEventListener('resize', () => { if (box.classList.contains('show')) place(box); });
    document.documentElement.appendChild(toastHost);
    return box;
  }

  const toastShown = () => !!toastRoot?.querySelector('.t.show');
  function hideToast() {
    clearTimeout(toastTimer);
    toastRoot?.querySelector('.t').classList.remove('show');
  }
  function hideToastIn(ms) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms);
  }

  // kind: 'pill' | 'compact' | 'card'; kids: de inhoud na het logo.
  function showToast(kind, kids, ms) {
    const box = toastBox();
    box.className = `t ${kind}`;
    box.classList.toggle('light', pageIsDark());
    box.innerHTML = LOGO;
    box.append(...kids);
    place(box);
    void box.offsetWidth; // reflow, zodat de overgang ook bij de eerste melding speelt
    box.classList.add('show');
    follow(box, undefined, () => box.classList.contains('show'));
    hideToastIn(ms);
  }

  function iconButton(cls, label, onClick) {
    const b = el('button', { type: 'button', className: cls, title: label });
    b.setAttribute('aria-label', label);
    b.innerHTML = X_ICON;
    b.addEventListener('click', onClick);
    return b;
  }
  function textButton(cls, label, onClick) {
    const b = el('button', { type: 'button', className: cls, textContent: label });
    b.addEventListener('click', onClick);
    return b;
  }
  // "Ask Melo" met Melo's kop ervoor.
  function meloButton(onClick) {
    const b = textButton('p melo', I.t('topicProtect'), onClick);
    b.insertAdjacentHTML('afterbegin', MELO_ICON);
    return b;
  }

  // Hoe vaak de volledige melding al is getoond (alleen een getal, in chrome.storage.local).
  let noticesSeen = 0;

  // De laatste melding "afgeschermd", zodat de kaart bij een gevoelig onderwerp er nog naartoe kan (Wat de AI ziet).
  let lastMasked = null;
  function toast(items, ctx) {
    const unique = uniqueItems(items);
    if (!unique.length) return;
    lastMasked = { unique, ctx };
    anchorEd = ctx?.ed || null;
    // Met het toetsenbord geopend (een klik zonder muis): de focus gaat naar de kaart, en daarna terug.
    const details = e => { hideToast(); openDetails(unique, ctx, e.detail === 0); };
    const close = iconButton('x', I.t('detailsClose'), hideToast);
    if (noticesSeen >= COMPACT_AFTER) {
      showToast('compact', [textButton('sum', I.t('toastCompact', { n: unique.length }), details), close], 6000);
      return;
    }
    noticesSeen += 1;
    store('local', { noticesSeen });
    const [first] = unique;
    const what = el('span', { className: 'what' },
      el('span', { className: 'real', textContent: shownValue(first) }),
      el('span', { className: 'arrow', textContent: '→' }),
      el('span', { className: 'tag', textContent: first.placeholder }));
    const kids = [what];
    if (unique.length > 1) kids.push(el('span', { className: 'more', textContent: I.t('toastMoreN', { n: unique.length - 1 }) }));
    kids.push(textButton('act', I.t('toastMore'), details), close);
    showToast('pill', kids, 6000);
  }

  // ---------- Gevoelige onderwerpen ----------
  // Gezondheid, geloof, geldzorgen, …: niet te vervangen door een placeholder, dus alleen een rustige melding.
  // Teams: één keer per onderwerp per pagina. Gratis (de melding is daar het hele product): één keer per bericht. Is het
  // veld weer leeg (verstuurd of gewist), of staat het onderwerp er niet meer in, dan komt de melding de volgende keer terug.

  const warnedTopics = new Set();
  const byWords = new Set(); // onderwerpen die de woordenlijst vond (die van de AI vergeten we pas bij een leeg veld)
  const PER_MESSAGE = !MASK;
  function forgetTopics(text, found) {
    if (!PER_MESSAGE || !warnedTopics.size) return;
    if (!text.trim()) { warnedTopics.clear(); byWords.clear(); return; }
    for (const k of [...byWords]) if (!found.includes(k)) { warnedTopics.delete(k); byWords.delete(k); }
  }
  // Na versturen maakt de site het veld zelf leeg, vaak zonder input-event: zolang er een melding is geweest, kijken we
  // af en toe of het veld leeg is.
  let emptyWatch = 0;
  function watchEmpty(ed) {
    if (!PER_MESSAGE || !ed || emptyWatch) return;
    emptyWatch = setInterval(() => {
      if (!warnedTopics.size) { clearInterval(emptyWatch); emptyWatch = 0; return; }
      if (!ed.isConnected || !getText(ed).trim()) { forgetTopics('', []); clearInterval(emptyWatch); emptyWatch = 0; }
    }, 1000);
  }
  let topicTimer;
  // "Niet meer in dit gesprek": alleen in dit tabblad en alleen in het geheugen (er wordt niets bewaard). Het gesprek is
  // het pad van de pagina. Een nieuwe chat krijgt na het eerste bericht een eigen adres (chatgpt.com/ → /c/…,
  // claude.ai/new → /chat/…, gemini…/app → /app/…): dat is nog hetzelfde gesprek. Elk ander pad zet de melding weer aan.
  let mutedChat = null;
  const hasChatId = p => /[0-9a-f]{8}|[\w-]{16}/i.test(p);
  function mutedHere() {
    if (!mutedChat) return false;
    const now = location.pathname;
    if (now === mutedChat) return true;
    if (!hasChatId(mutedChat) && hasChatId(now)) { mutedChat = now; return true; }
    mutedChat = null;
    return false;
  }
  function muteChat() {
    mutedChat = location.pathname;
    dataMarks?.clear?.();
    hideToast();
    clearTimeout(topicTimer);
    deviceTopics?.cancel();
  }
  const topicsOn = () => !!T && settings.enabled && settings.topicWarnings && !inPrivateChat() && !mutedHere();
  // Gevoelige gegevens (gratis editie) ook in een tijdelijke chat: daar gaat een BSN of IBAN nog steeds naar het AI-bedrijf.
  const dataOn = () => !MASK && !!ID && settings.enabled && settings.topicWarnings && !mutedHere();
  const freshTopic = k => !warnedTopics.has(k) && !(settings.mutedTopics || []).includes(k);
  function checkTopicsSoon(ed) {
    clearTimeout(topicTimer);
    deviceTopics?.cancel();
    topicTimer = setTimeout(() => {
      if (!ed.isConnected || !goesToAi(ed)) return; // intussen naar een andere chat (WhatsApp)
      const text = getText(ed);
      if (!text.trim()) { dataMarks?.clear?.(); return void forgetTopics('', []); }
      if (!checkTopics(text, ed)) askDevice(ed);
    }, 900);
  }

  // Geeft true als de woordenlijst een onderwerp vond (ook als de melding daarvoor al is geweest of uitstaat).
  // Gratis editie: eerst gevoelige gegevens (een BSN of IBAN gaat voor: dat is een nummer dat je makkelijk weghaalt of
  // bij Melo houdt). Die staan als 'DATA:IBAN' enz. in dezelfde lijsten als de onderwerpen, zodat ze net zo per bericht
  // terugkomen en met "Niet meer in dit gesprek" stil zijn.
  // Een gevonden gegeven telt niet als onderwerp: de tweede kans (de AI op dit apparaat) mag dan nog naar onderwerpen kijken.
  function checkTopics(text, ed = null) {
    const withData = dataOn(), withTopics = topicsOn();
    if (!withData && !withTopics) return false;
    const data = withData ? ID.kinds(text).map(k => `DATA:${k}`) : [];
    if (withData) markData(ed);
    const topics = withTopics ? T.sensitiveTopics(text) : [];
    const found = [...data, ...topics];
    forgetTopics(text, found);
    const topic = found.find(freshTopic);
    if (topic) {
      if (topic.startsWith('DATA:')) showData(topic.slice(5), ed); else showTopic(topic, ed);
      if (warnedTopics.has(topic) && PER_MESSAGE) byWords.add(topic);
    }
    return topics.length > 0;
  }

  // Tweede kans (zie topic-ai.js): vond de woordenlijst niets, dan de AI van Chrome op dit apparaat, als die er al is.
  // Alleen in de gratis editie en alleen in Chrome. De tekst gaat alleen naar Kamelo's eigen achtergrond.
  const deviceTopics = TA && globalThis.KameloEdition === 'public' && I.BROWSER.id === 'chrome'
    ? TA.gate({ ask: text => (alive() ? chrome.runtime.sendMessage({ type: 'pf:topic-ai', text }) : Promise.resolve(null)) })
    : null;
  function askDevice(ed) {
    if (!deviceTopics || !topicsOn() || !byUser.get(ed) || !TA.TOPICS.some(freshTopic)) return;
    deviceTopics.schedule({
      read: () => (ed.isConnected && !superseded ? getText(ed) : ''),
      onTopic: topic => showTopic(topic, ed),
      waited: 900,
    });
  }

  // Kan Melo hier antwoorden (de AI van Chrome op deze computer, of 'mac': Melo voor Mac)? null = nog niet gevraagd. De
  // achtergrond vraagt alleen availability(), dus dit start nooit een download. Bij elke melding opnieuw gevraagd, voor de volgende.
  let meloReady = null, meloCheck = null;
  // Melo kan hier misschien antwoorden: in Chrome op het apparaat, en in elke browser met Melo voor Mac (src/background.js).
  const meloHere = () => I.BROWSER.id === 'chrome' || I.BROWSER.id === 'safari' || settings.meloMac === true;
  // De knop "Vraag het Melo op je Mac": gratis editie, op een Mac in Chrome, Edge of Firefox, Melo voor Mac nog niet aan,
  // en geen andere Melo in deze melding. Met Melo voor Mac aan biedt de melding gewoon "Vraag het Melo".
  const onMacOS = /Mac/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const macTip = (canProtect, ed) => !MASK && !!ed && !canProtect && onMacOS && I.BROWSER.id !== 'safari' &&
    !!settings.privateChat && settings.meloMac !== true;
  function checkMelo() {
    meloCheck ??= (alive() ? chrome.runtime.sendMessage({ type: 'pf:melo-ready' }) : Promise.resolve(false))
      .then(r => (r === 'mac' ? r : r === true), () => false)
      .then(r => { meloReady = r; meloCheck = null; return r; });
    return meloCheck;
  }

  function showTopic(topic, ed = null) {
    if (!topicsOn() || !freshTopic(topic)) return;
    // Staat er al een melding (bijv. "2 afgeschermd" bij hetzelfde plakken)? Dan erna.
    // Het detailvenster staat open? Dan erna. Een gewone "afgeschermd"-melding wordt vervangen: de keuze voor Private Chat
    // is belangrijker, en de kaart zegt zelf hoeveel er is afgeschermd.
    if (panel) return void setTimeout(() => showTopic(topic, ed), 1500);
    // Met een veld: "Ask Melo" brengt de vraag naar Melo, de privéchat van Kamelo (docs/private-chat/PLAN-PRIVE-CHAT.md).
    // In Chrome, of met Melo voor Mac: Edge en Firefox hebben (nog) geen AI op het apparaat; daar biedt de melding anders
    // alleen de tijdelijke chat.
    const wantsMelo = !!ed && !!settings.privateChat && meloHere();
    // En alleen als de AI van Chrome op deze computer kan draaien; anders leidde "Ask Melo" naar "Geen AI op dit apparaat".
    // De eerste keer even op het antwoord wachten (meestal een paar ms, hooguit 1,5 s; geen antwoord = geen Melo).
    if (wantsMelo && meloReady === null) {
      return void Promise.race([checkMelo(), sleep(1500).then(() => false)]).then(r => { meloReady ??= r; showTopic(topic, ed); });
    }
    if (wantsMelo) checkMelo();
    warnedTopics.add(topic);
    watchEmpty(ed);
    anchorEd = ed;
    const canProtect = wantsMelo && meloReady;
    // Ging de tijdelijke chat op deze pagina net niet open (zie takePrivate), dan bieden we hem hier niet opnieuw aan.
    const offerPrivate = !!ed && !!aiSite?.private && !privateFailed;
    // Alleen Business schermt af; in de gratis editie kan "[STAP_1]" in een prompt nooit "1 afgeschermd" worden.
    const masked = MASK && ed?.isConnected ? new Set(getText(ed).match(/\[[A-Z]+(?:_[A-Z]+)*_\d+\]/g) || []).size : 0;
    showToast('card', [
      el('div', { className: 'c' },
        el('b', { textContent: I.t('topicTitle') }),
        // Kort (Lucas, 21 okt): alleen "Sensitive info" en de knoppen. Geen onderwerp noemen: het model kan het verkeerde
        // kiezen, en bij een ruzie of geweld is een verkeerd woord pijnlijk. De knoppen zeggen zelf wat je kunt doen.
        ...(masked ? [lastMasked && lastMasked.ctx?.ed === ed
          ? textButton('done', I.t('toastCompact', { n: masked }), e => { const m = lastMasked; hideToast(); openDetails(m.unique, m.ctx, e.detail === 0); })
          : el('span', { className: 'done', textContent: I.t('toastCompact', { n: masked }) })] : []),
        el('div', { className: 'k' },
          ...(canProtect ? [meloButton(() => { hideToast(); goPrivateChat(ed); })] : []),
          // Tweede keuze: een tijdelijke chat in dezelfde AI (voor wie z'n eigen ChatGPT wil houden).
          ...(offerPrivate ? [textButton(canProtect ? '' : 'p', I.t('topicPrivate'), () => { hideToast(); goPrivate(ed); })] : []),
          // Op een Mac zonder Melo hier: zeg dat Melo voor Mac dit op je eigen Mac kan beantwoorden (26 okt 2026). De klik
          // opent de popup met de schakelaar; daar staat ook waar je de app krijgt.
          ...(macTip(canProtect, ed) ? [textButton('', I.t('topicMac'), () => { hideToast(); chrome.runtime.sendMessage({ type: 'pf:mac-koppel' }).catch(() => {}); })] : []),
          // Stil, als laatste: de gratis melding komt bij elk bericht terug, en wil je hem hier niet meer, dan kan dat.
          ...(PER_MESSAGE ? [textButton('q', I.t('topicMuteChat'), muteChat)] : []),
        )),
      // Sluiten met het kruisje of Esc (alleen deze keer). Gratis: "Niet meer in dit gesprek" (hierboven) of Kamelo uit in
      // de popup; de gratis popup heeft geen instelling per onderwerp (background.js zet die bij elke start terug).
      // Teams: de instelling Waarschuwen bij gevoelige onderwerpen in de popup.
      iconButton('x', I.t('detailsClose'), hideToast),
    // Publiek is deze melding het hele product: langer laten staan. Teams toont daarnaast al de placeholders.
    ], MASK ? 15000 : 40000);
  }

  // ---------- Gratis: gevoelige gegevens blauw in het veld ----------
  // Een BSN, IBAN, wachtwoord … krijgt in het invoerveld een blauwe markering (src/gegevens.css), zodat je ziet wat je kunt
  // weghalen. Alleen markeren met de CSS Highlight API: de tekst en de pagina veranderen niet. Per blok (alinea), zoals
  // paint() voor Business. Een <textarea> heeft geen tekstknopen; daar alleen de melding. Elke controle tekent opnieuw.
  let dataMarks = null;
  function dataHighlight() {
    if (dataMarks === null) {
      try {
        dataMarks = globalThis.CSS?.highlights && typeof Highlight === 'function' ? new Highlight() : false;
        if (dataMarks) CSS.highlights.set('kamelo-gevoelig', dataMarks);
      } catch { dataMarks = false; }
    }
    return dataMarks;
  }
  function markData(ed) {
    const h = dataHighlight();
    if (!h) return;
    h.clear();
    if (!ed?.isConnected || isField(ed) || !dataOn()) return;
    const blocks = new Map();
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      let b = n.parentElement;
      while (b && b !== ed && !BLOCK_TAGS.test(b.tagName)) b = b.parentElement;
      if (!blocks.has(b)) blocks.set(b, []);
      blocks.get(b).push(n);
    }
    for (const nodes of blocks.values()) {
      const text = nodes.map(n => n.nodeValue).join('');
      if (!text.trim() || text.length > 20000) continue;
      const at = (i, isEnd) => {
        let acc = 0;
        for (const n of nodes) {
          const len = n.nodeValue.length;
          if (i < acc + len || (isEnd && i === acc + len)) return [n, i - acc];
          acc += len;
        }
        return [nodes.at(-1), nodes.at(-1).nodeValue.length];
      };
      for (const f of ID.find(text)) {
        try {
          const r = document.createRange();
          r.setStart(...at(f.start));
          r.setEnd(...at(f.end, true));
          h.add(r);
        } catch {} // knoop net veranderd
      }
    }
  }

  // Gevoelig gegeven (gratis editie): dezelfde kaart, met Melo als die hier kan antwoorden. Geen tijdelijke chat: die stuurt
  // het nummer nog steeds naar het AI-bedrijf. Zonder Melo (Edge, Firefox, Chrome zonder AI op deze computer) het eerlijke
  // advies om het weg te halen: de AI heeft het niet nodig om te helpen.
  function showData(kind, ed = null) {
    const key = `DATA:${kind}`;
    if (!dataOn() || !freshTopic(key)) return;
    if (panel) return void setTimeout(() => showData(kind, ed), 1500);
    const wantsMelo = !!ed && !!settings.privateChat && meloHere();
    if (wantsMelo && meloReady === null) {
      return void Promise.race([checkMelo(), sleep(1500).then(() => false)]).then(r => { meloReady ??= r; showData(kind, ed); });
    }
    if (wantsMelo) checkMelo();
    warnedTopics.add(key);
    watchEmpty(ed);
    anchorEd = ed;
    const canProtect = wantsMelo && meloReady;
    showToast('card', [
      el('div', { className: 'c' },
        // Kort: alleen "Sensitive info". Wát en waar laat de blauwe markering in het veld zien (markData).
        el('b', { textContent: I.t('dataTitle') }),
        // Zonder Melo (Edge, Firefox, Chrome zonder AI hier, of in een tijdelijke chat) het eerlijke advies.
        ...(canProtect ? [] : [el('span', { className: 'm', textContent: I.t('dataAdviceRemove') })]),
        el('div', { className: 'k' },
          ...(canProtect ? [meloButton(() => { hideToast(); goPrivateChat(ed); })] : []),
          ...(PER_MESSAGE ? [textButton('q', I.t('topicMuteChat'), muteChat)] : []),
        )),
      iconButton('x', I.t('detailsClose'), hideToast),
    ], 40000);
  }

  // ---------- Tijdelijke chat (Ask privately) ----------
  // Een persoonlijke vraag in een tijdelijke chat van dezelfde site: niet in je geschiedenis, niet in het geheugen van
  // de AI en niet gebruikt voor training. De tekst gaat via de achtergrond mee (alleen in het werkgeheugen, alleen
  // dit tabblad), en wordt in de tijdelijke chat weer in het veld gezet, afgeschermd zoals altijd.

  function inPrivateChat() {
    const p = aiSite?.private;
    if (!p) return false;
    if (p.onUrl && location.href.includes(p.onUrl)) return true;
    try { return !!(p.onSel && document.querySelector(p.onSel)); } catch { return false; }
  }

  let privateFailed = false; // zie giveBack
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitFor(fn, ms = 10000) {
    for (let t = 0; t < ms; t += 250) { const v = fn(); if (v) return v; await sleep(250); }
    return null;
  }
  const privateButton = () => { try { return document.querySelector(aiSite.private.button); } catch { return null; } };

  // Naar Kamelo Private Chat: de tekst gaat via de achtergrond (alleen werkgeheugen) naar Kamelo's eigen chatpagina,
  // het veld hier wordt leeg. Er gaat niets naar deze AI. Synchroon versturen, zodat de klik als gebruikersactie telt.
  function goPrivateChat(ed) {
    // De echte tekst, niet die met de placeholders van deze site: het paneel heeft een eigen kluis, en anders kunnen
    // twee mensen daar allebei [PERSON_1] worden. Hij gaat alleen via het werkgeheugen van de achtergrond.
    const text = ed.isConnected ? (MASK ? restoreText(getText(ed)) : getText(ed)).trim() : '';
    if (!alive()) return;
    // Het veld pas leeg als de achtergrond de tekst heeft (anders was de vraag weg). Het paneel opent al bij ontvangst.
    // Met Melo voor Mac gaat de vraag naar de app; antwoordt die niet, dan de volgende keer opnieuw kijken.
    const mac = meloReady === 'mac';
    chrome.runtime.sendMessage({ type: mac ? 'pf:mac-vraag' : 'pf:pchat-open', text, typed: byUser.get(ed) === true })
      .then(ok => { if (ok === true && ed.isConnected) clearField(ed); else if (mac) meloReady = null; }, () => {});
  }

  // ed: het veld met de vraag; uit de popup kan dat leeg zijn of ontbreken (dan gewoon een nieuwe tijdelijke chat).
  async function goPrivate(ed) {
    const p = aiSite.private;
    const text = ed?.isConnected ? getText(ed).trim() : '';
    if (text) {
      // Alleen verder als de tekst echt is meegegeven (een tabblad met het script van vóór een update kan dat niet):
      // anders is de vraag weg. Het concept blijft dan gewoon staan.
      const stored = alive() && await chrome.runtime.sendMessage({ type: 'pf:private-set', host: location.hostname, text }).then(r => r === true, () => false);
      if (!stored) return;
      clearField(ed); // geen concept in de gewone chat laten staan
    }
    if (p.url) return location.assign(p.url);
    if (!text) { // niets mee te nemen: alleen de tijdelijke chat openen
      const button = privateButton();
      return button ? button.click() : location.assign(p.start);
    }
    // Een knop op de pagina (Gemini): meteen indrukken als hij er is, anders eerst naar een nieuwe chat.
    if (privateButton()) return takePrivate();
    location.assign(p.start);
  }

  function clearField(ed) {
    if (isField(ed)) return insertText(ed, '', true);
    ed.focus();
    const range = document.createRange();
    range.selectNodeContents(ed);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    document.execCommand('delete');
  }

  // In de tijdelijke chat (of op de pagina waar de knop zit): de meegenomen tekst terugzetten zodra het veld er is.
  async function takePrivate() {
    const p = aiSite?.private;
    if (!p || !alive() || window !== window.top) return;
    if (!p.button && !inPrivateChat()) return;
    const text = await chrome.runtime.sendMessage({ type: 'pf:private-take', host: location.hostname }).catch(() => null);
    if (!text) return;
    if (!inPrivateChat() && p.button) {
      // Geen knop (niet ingelogd, of de site heeft hem hernoemd) of hij opent geen tijdelijke chat: dan de vraag terug in
      // het gewone veld, anders was hij weg (goPrivate heeft het veld al leeggemaakt).
      const button = await waitFor(privateButton);
      button?.click();
      if (!button || !await waitFor(inPrivateChat, 5000)) return giveBack(text);
      anchorEd = null; // de site zet een nieuw veld neer
      await sleep(300);
    }
    const ed = await waitFor(liveEditor);
    if (!ed) return;
    let result = { text, items: [] };
    if (MASK && settings.enabled) {
      const m = maskOwned(v => D.mask(text, v, opts()));
      result = m.wait ? await m.wait.catch(() => null) : m.result;
      if (!result) return;
    }
    insertText(ed, result.text, true);
    typedIn.add(ed);
    if (result.items.length) { saveVault(); startAnswers(); }
    anchorEd = ed;
    showToast('compact', [el('span', { textContent: I.t('privateReady') })], 6000);
  }
  ready.then(() => { if (active()) takePrivate(); });

  // De tijdelijke chat ging niet open: de vraag weer in het veld, ongewijzigd en niet verstuurd. De melding voor deze
  // tekst is al geweest, en de knop voor de tijdelijke chat komt op deze pagina niet meer (hij werkt hier niet).
  async function giveBack(text) {
    privateFailed = true;
    const ed = await waitFor(liveEditor);
    if (!ed) return;
    const result = MASK && settings.enabled ? D.mask(text, vault, opts()) : { text, items: [] }; // Teams: afgeschermd, zoals ervoor
    insertText(ed, result.text, true);
    typedIn.add(ed);
    if (result.items.length) { saveVault(); startAnswers(); }
    for (const k of T?.sensitiveTopics(text) || []) { warnedTopics.add(k); byWords.add(k); }
    watchEmpty(ed);
    anchorEd = ed;
    showToast('compact', [el('span', { textContent: I.t('privateFailed') })], 8000);
  }

  // ---------- Kaart "Wat de AI ziet" ----------
  // Per gegeven: soort, jouw waarde (bankgegevens half verborgen) en de placeholder die de AI krijgt, met
  // "Zichtbaar laten". Op dezelfde plek als de melding. In een gesloten shadow root, zodat de pagina de echte
  // waarden hier niet kan uitlezen.

  let panel = null;
  function openDetails(unique, ctx, viaKeyboard) {
    closeDetails(false);
    const [host, root] = shadowHost();
    root.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .card { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; width: 360px; display: flex; flex-direction: column;
                border-radius: 16px; background: var(--bg); color: var(--fg); font: 13px/18px ${FONT}; -webkit-font-smoothing: antialiased;
                box-shadow: 0 0 0 .5px var(--edge), 0 18px 50px rgba(0,0,0,.2); overflow: hidden; outline: none;
                animation: pop .22s cubic-bezier(.2,.9,.3,1.1);
                --bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --line: rgba(0,0,0,.06); --edge: rgba(0,0,0,.12); --fill: #f2f2f7;
                --ph-bg: #e8f1fd; --ph-fg: #0a5cc2; --accent: #0071e3; --accent-text: #0066cc; }
        .card.dark { --bg: #1c1c1e; --fg: #f5f5f7; --muted: #98989d; --line: rgba(255,255,255,.08); --edge: rgba(255,255,255,.14); --fill: #2c2c2e;
                     --ph-bg: rgba(10,132,255,.18); --ph-fg: #64b0ff; --accent: #0a84ff; --accent-text: #4da3ff;
                     box-shadow: 0 0 0 .5px var(--edge), 0 18px 50px rgba(0,0,0,.5); }
        header { display: flex; align-items: center; gap: 8px; padding: 12px 12px 8px 14px; flex: none; }
        header svg { width: 20px; height: 20px; flex: none; }
        h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
        .x { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; border: 0; padding: 0; background: var(--fill); color: var(--muted);
             display: grid; place-items: center; cursor: pointer; flex: none; }
        .x:hover { color: var(--fg); }
        .x svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
        ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
        li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; padding: 9px 14px; border-top: 1px solid var(--line); }
        .type { grid-area: 1 / 1; font-size: 11px; line-height: 16px; color: var(--muted); }
        .type i { font-style: normal; margin-left: 6px; padding: 0 6px; border-radius: 999px; background: var(--fill); }
        .keep { grid-area: 1 / 2; justify-self: end; border: 0; background: none; padding: 0; color: var(--accent-text);
                font: inherit; font-size: 11px; line-height: 16px; font-weight: 500; cursor: pointer; white-space: nowrap; }
        .keep:hover { text-decoration: underline; }
        .always { grid-area: 1 / 2; justify-self: end; color: var(--muted); font-size: 12px; }
        .val { grid-area: 2 / 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tag { grid-area: 2 / 2; justify-self: end; font-weight: 500; color: var(--ph-fg); background: var(--ph-bg); padding: 0 6px; border-radius: 5px; white-space: nowrap; }
        li.kept .tag { text-decoration: line-through; opacity: .5; }
        button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        @keyframes pop { from { opacity: 0; transform: translateY(6px); } }
        @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
      </style>
      <section class="card" role="dialog" aria-modal="true" aria-labelledby="h" tabindex="-1">
        <header>${LOGO}<h2 id="h"></h2></header>
        <ul></ul>
      </section>`;
    const card = root.querySelector('.card');
    root.querySelector('#h').textContent = I.t('detailsTitle');
    const close = iconButton('x', I.t('detailsClose'), () => closeDetails(true));
    root.querySelector('header').append(close);
    card.classList.toggle('dark', pageIsDark());
    const list = root.querySelector('ul');
    list.replaceChildren(...unique.map(it => {
      const type = el('span', { className: 'type', textContent: capital(I.typeLabel(it.type)) });
      if (it.remembered) type.append(el('i', { textContent: I.t('detailsRemembered') }));
      const li = el('li', {}, type,
        el('span', { className: 'val', textContent: shownValue(it) }),
        el('span', { className: 'tag', textContent: it.placeholder }));
      // Alleen bij een veld: dit gegeven toch zichtbaar laten, met "Ongedaan maken" op dezelfde plek.
      if (ctx?.ed && D.ALWAYS.has(it.type)) li.append(el('span', { className: 'always', textContent: I.t('markAlways').split(':')[0] }));
      else if (ctx?.ed && mayKeep()) {
        let before = null, kept = false;
        const keep = el('button', { type: 'button', className: 'keep' });
        const label = () => { keep.textContent = kept ? `${I.t('detailsKept')} · ${I.t('toastUndo')}` : I.t('detailsKeep'); };
        keep.addEventListener('click', () => {
          if (kept) undoKeep(it.value, ctx, before); else before = keepVisible(it.value, ctx);
          kept = !kept;
          li.classList.toggle('kept', kept);
          label();
        });
        label();
        li.append(keep);
      }
      return li;
    }));
    anchorEd = ctx?.ed || null;
    const a = place(card, 160);
    list.style.maxHeight = `${Math.max(120, Math.min(420, (a ? a.room : innerHeight - 40) - 50))}px`;

    // Esc sluit; Tab blijft binnen de kaart; klikken ernaast sluit (zonder de focus te verplaatsen).
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDetails(true); return; }
      if (e.key !== 'Tab' || !card.contains(root.activeElement)) return;
      const items = [...card.querySelectorAll('button')];
      const i = items.indexOf(root.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.at(-1) : items[i - 1]) : (i === items.length - 1 ? items[0] : items[i + 1]);
      e.preventDefault();
      next.focus();
    };
    const onDown = e => { if (!e.composedPath().includes(host)) closeDetails(false); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    document.documentElement.appendChild(host);
    panel = { host, onKey, onDown, ed: ctx?.ed };
    follow(card, 160, () => panel?.host === host);
    if (viaKeyboard) close.focus();
  }

  // refocus: na sluiten met × of Esc gaat de focus terug naar het veld (waar hij voor het openen was).
  function closeDetails(refocus) {
    if (!panel) return;
    document.removeEventListener('keydown', panel.onKey, true);
    document.removeEventListener('pointerdown', panel.onDown, true);
    panel.host.remove();
    if (refocus && panel.ed?.isConnected) panel.ed.focus();
    panel = null;
  }

  // Een woord dat onterecht is afgeschermd: in het veld terugzetten en op de lijst "Nooit afschermen" zetten,
  // met de site en datum erbij, zodat een misklik terug te vinden is. Geeft de vorige tekst terug voor ongedaan maken.
  function keepVisible(word, ctx) {
    if (!mayKeep()) return null;
    const lower = word.toLowerCase();
    const u = userSettings;
    if (!u.allowList.some(w => w.toLowerCase() === lower)) u.allowList = [...u.allowList, word];
    u.allowMeta = { ...(u.allowMeta || {}), [lower]: { site: location.hostname, at: Date.now() } };
    effective();
    store('local', { settings: u });
    return ctx && unmaskInField(ctx, lower);
  }

  function undoKeep(word, ctx, before) {
    const lower = word.toLowerCase();
    const u = userSettings;
    u.allowList = u.allowList.filter(w => w.toLowerCase() !== lower);
    if (u.allowMeta) { const { [lower]: _, ...rest } = u.allowMeta; u.allowMeta = rest; }
    effective();
    store('local', { settings: u });
    if (before && ctx?.ed?.isConnected) {
      const cur = getText(ctx.ed), i = cur.lastIndexOf(ctx.segment);
      if (i !== -1) {
        insertText(ctx.ed, cur.slice(0, i) + before.segment + cur.slice(i + ctx.segment.length), true);
        ctx.segment = before.segment;
        ctx.items = before.items;
      }
    }
  }

  // Klik op een placeholder in het veld → 'Zichtbaar laten': overal in dit veld de echte waarde terug.
  function showRealIn(ed, placeholder, value) {
    if (!ed?.isConnected) return;
    const cur = getText(ed);
    if (!cur.includes(placeholder)) return;
    insertText(ed, cur.split(placeholder).join(value), true);
    paintSoon(ed);
  }

  // Zet in het veld de placeholders terug die bij dit woord horen. Geeft de vorige versie van de tekst terug.
  function unmaskInField(ctx, lower) {
    const ed = ctx.ed;
    if (!ed?.isConnected) return null;
    const cur = getText(ed), i = cur.lastIndexOf(ctx.segment);
    if (i === -1) return null;
    let seg = ctx.segment, shift = 0;
    const kept = [];
    for (const it of ctx.items) {
      const at = it.at + shift;
      if (it.value.toLowerCase() === lower && seg.slice(at, at + it.placeholder.length) === it.placeholder) {
        seg = seg.slice(0, at) + it.value + seg.slice(at + it.placeholder.length);
        shift += it.value.length - it.placeholder.length;
      } else kept.push({ ...it, at });
    }
    if (seg === ctx.segment) return null;
    const before = { segment: ctx.segment, items: ctx.items };
    insertText(ed, cur.slice(0, i) + seg + cur.slice(i + ctx.segment.length), true);
    ctx.segment = seg;
    ctx.items = kept;
    return before;
  }
})();
