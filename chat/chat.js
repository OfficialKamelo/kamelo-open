// Kamelo Private Chat (zie docs/private-chat/PLAN-PRIVE-CHAT.md).
// 1. Alleen Kamelo Business: namen en gegevens worden afgeschermd met een kluis die alleen in dit venster leeft (dicht = weg).
// 2. Gratis: de AI van de browser zelf beantwoordt de vraag op dit apparaat (Chrome, Gemini Nano; zie device.js).
//    Kan dat niet (Edge, Firefox, te zwakke computer, te traag), dan biedt Kamelo een tijdelijke chat aan.
// 3. Alleen Kamelo Plus (staat uit): Tinfoil's SecureClient controleert de enclave en versleutelt de vraag;
//    die gaat via Kamelo's relay, die alleen versleutelde tekst ziet. Faalt de controle, dan gaat er niets weg.
// 4. In het antwoord zet Kamelo de echte gegevens terug, alleen op dit scherm.
(() => {
  'use strict';
  const I = globalThis.PrivacyI18n, C = globalThis.PrivacyConfig;
  // De gratis editie (zie src/edition.js) schermt niets af en heeft detector.js niet: dan gaat de tekst ongewijzigd door.
  const D = globalThis.KameloEdition !== 'public' && globalThis.PrivacyDetector || {
    emptyVault: () => ({ byPlaceholder: {} }), mask: text => ({ text, items: [] }), restore: text => text,
  };
  // Alleen voor Plus (de chip); het Firefox-pakket heeft vendor/ niet, dan blijft de chip-route gewoon uit.
  const { SecureClient } = globalThis.TinfoilKit || {};
  const $ = id => document.getElementById(id);
  // Meetgegevens in de console alleen met ?debug in de adresbalk.
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const debug = (...a) => { if (DEBUG) console.info('Kamelo Private Chat:', ...a); };

  // Testopzet: de relay draait lokaal (node relay/dev.mjs). Later: https://relay.kamelo.eu.
  const RELAY_DEFAULT = 'http://127.0.0.1:8787';
  // Gemma 4: sneller en zuiniger dan gpt-oss (geen verborgen "nadenken"), en het beste antwoord in onze test (11 okt).
  const MODEL = 'gemma4-31b';
  const FREE_PER_DAY = 25;
  const HANDOFF_MAX_AGE = 2 * 60 * 1000;
  // Kort gehouden: hij gaat met elke vraag mee (en kost dus elke keer tokens).
  const SYSTEM = 'Kind, practical assistant. Placeholders like [PERSON_1] stand for hidden real details: use them as written, never ask what they mean. ' +
    'Reply in the user’s language, briefly (under 200 words). For health, mental health or legal issues, suggest a professional when wise; if someone may be in danger, point to emergency help.';
  // Op dit apparaat korter: elk woord kost op een gewone laptop merkbaar tijd (en de AI van Chrome is klein).
  const DEVICE_SYSTEM = SYSTEM.replace('briefly (under 200 words)', 'briefly (under 100 words, a few short paragraphs at most)');
  // "Te traag op deze computer": eerste woord na meer dan 15 s, minder dan 12 tekens per seconde, of langer dan 40 s.
  // Twee keer achter elkaar te traag: voortaan de tijdelijke chat aanbieden (terug via het slotje: "Toch op dit apparaat").
  const isSlow = st => st && (st.firstMs > 15000 || st.ms > 40000 || (st.chars > 150 && st.chars / Math.max(1, st.ms - st.firstMs) * 1000 < 12));
  // Kosten per vraag laag houden (docs/private-chat/PLAN-PRIVE-CHAT.md): weinig "nadenken", een korte bovengrens, en alleen de laatste berichten meesturen.
  const MAX_TOKENS = 600, HISTORY_KEEP = 6;

  const vault = D.emptyVault();      // alleen in dit venster
  let history = [];                  // wat de AI te zien krijgt in het huidige gesprek: alleen placeholders
  let settings = { ...C.DEFAULT_SETTINGS }, relay = RELAY_DEFAULT, client = null, verified = null, busy = false;

  I.applyI18n();
  const input = $('input'), form = $('form'), msgs = $('msgs');

  // ---------- gesprekken in dit venster ----------
  // Elke nieuwe vraag uit de melding (en "+") begint een eigen gesprek, met een eigen geheugen voor de AI. Alleen in het
  // geheugen van dit venster: dicht = weg (gesprekken bewaren is voor Plus).
  const convs = [];
  let conv = null;
  const emptyState = () => { const e = $('emptyTpl').content.cloneNode(true); I.applyI18n(e); return e.firstElementChild; };
  const shortTitle = text => { const t = text.replace(/\s+/g, ' ').trim(); return t.length > 42 ? `${t.slice(0, 40).replace(/\s+\S*$/, '')}…` : t; };
  function setTitle(c, text) {
    c.title = text ? shortTitle(text) : '';
    if (c === conv) $('convTitle').textContent = c.title || I.t('pchatTitle');
  }
  function syncConvButtons() {
    $('newChat').hidden = !history.length;
    $('newChat').disabled = busy;
    $('convBtn').disabled = busy || convs.filter(c => c.history.length).length < 2;
    $('convBtn').classList.toggle('many', !$('convBtn').disabled);
  }
  function showConv(c) {
    if (conv === c) return;
    convs.forEach(x => { x.thread.hidden = x !== c; });
    conv = c; history = c.history;
    dev.useTurns?.(c.turns);
    $('convTitle').textContent = c.title || I.t('pchatTitle');
    closeConvList();
    syncConvButtons();
    msgs.scrollTop = msgs.scrollHeight;
  }
  function newConv() {
    // Een leeg gesprek hergebruiken in plaats van er nog een te maken.
    const empty = convs.find(c => !c.history.length);
    if (empty) return showConv(empty);
    const thread = Object.assign(document.createElement('div'), { className: 'thread' });
    thread.append(emptyState());
    msgs.append(thread);
    const c = { thread, history: [], turns: [], title: '' };
    convs.unshift(c);
    showConv(c);
    clearNote();
  }
  function closeConvList() { $('convList').hidden = true; $('convBtn').setAttribute('aria-expanded', 'false'); }
  $('convBtn').addEventListener('click', () => {
    const list = $('convList');
    if (!list.hidden) return closeConvList();
    list.replaceChildren(...convs.filter(c => c.history.length).map(c => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'conv' + (c === conv ? ' on' : '') });
      b.append(Object.assign(document.createElement('span'), { textContent: c.title }));
      b.addEventListener('click', () => showConv(c));
      return b;
    }), Object.assign(document.createElement('p'), { className: 'convnote', textContent: I.t('pchatChatsGone') }));
    list.hidden = false;
    $('convBtn').setAttribute('aria-expanded', 'true');
  });
  $('newChat').addEventListener('click', () => { if (!busy) { newConv(); input.focus(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeConvList(); });

  // ---------- teller (lokaal; later anoniem via Privacy Pass) ----------
  const today = () => new Date().toISOString().slice(0, 10);
  async function quota() {
    const { pchatQuota: q } = await chrome.storage.local.get('pchatQuota');
    return q?.day === today() ? q.used : 0;
  }
  async function useOne() {
    const used = (await quota()) + 1;
    await chrome.storage.local.set({ pchatQuota: { day: today(), used } });
    showLeft(used);
  }
  function showLeft(used) {
    $('hint').textContent = I.t('pchatLeft', { n: Math.max(0, FREE_PER_DAY - used), max: FREE_PER_DAY });
  }

  // ---------- welke AI antwoordt ----------
  // Gratis: de AI van de browser zelf, op dit apparaat (chat/device.js: Chrome en Edge via de Prompt API, Firefox via
  // trial.ml). De vraag verlaat het apparaat dan niet. Kan dat niet (hardware, browser of taal), dan bieden we de
  // tijdelijke chat van de AI-site aan. De verzegelde chip is voor Kamelo Plus (nu: settings.privateChatPlus).
  // ?engine=chip of ?engine=device dwingt een keuze af (om te testen); ?fxmodel=qwen3-0.6b kiest een ander Firefox-model.
  const params = new URLSearchParams(location.search);
  const FORCE = params.get('engine');
  const dev = KameloDevice.create({ lang: I.LANG, force: FORCE, system: DEVICE_SYSTEM, browserId: I.BROWSER.id, fxModel: params.get('fxmodel'), onProgress: showProgress });
  let engine = 'none', devInfo = { state: 'unavailable', backend: 'none', langs: [], download: {} };
  let devAbort = null, preparing = false, onChunk = null, sourceHost = '', offReason = '';
  const chipAllowed = () => FORCE === 'chip' || settings.privateChatPlus === true;
  const fmtGB = gb => `${new Intl.NumberFormat(I.LANG, { maximumFractionDigits: 1 }).format(gb)} GB`;
  const btn = (text, onclick, ghost = false) => Object.assign(document.createElement('button'), { type: 'button', className: `btn${ghost ? ' ghost' : ''}`, textContent: text, onclick });

  // Eerst vragen, dan downloaden: de browser haalt de AI pas op na een klik, met de grootte erbij.
  function offerDevice(resend) {
    const text = devInfo.backend === 'firefox-ml'
      ? I.t('pchatDeviceOfferFx', { size: fmtGB(devInfo.download.gb) })
      : I.t('pchatDeviceOffer', { free: devInfo.download.freeGB });
    note(I.t('pchatDeviceOfferTitle'), text, { buttons: [
      btn(I.t('pchatDeviceDownload'), () => startDownload(resend)),
      btn(I.t('pchatDeviceNotNow'), async () => {
        await chrome.storage.local.set({ pchatDevice: 'declined' });
        useFallback();
      }, true),
    ] });
  }
  // Moet synchroon in de klik beginnen: beide browsers controleren dat er een gebruikersactie is.
  function startDownload(resend) {
    devAbort = new AbortController(); preparing = true;
    const signal = devAbort.signal;
    const go = dev.backend === 'firefox-ml'
      ? dev.requestPermission().then(ok => {
        if (!ok) throw Object.assign(new Error('denied'), { device: 'denied' });
        return dev.prepare({ signal });
      })
      : dev.prepare({ signal });
    showProgress(null);
    // Eerst de vlaggen terugzetten, anders wordt de vraag hieronder niet verstuurd.
    go.finally(() => { preparing = false; devAbort = null; }).then(() => {
      devInfo.state = document.documentElement.dataset.device = 'available'; offReason = ''; clearNote();
      if (resend && input.value.trim()) form.requestSubmit(); // blijft op dit apparaat
      else note('', I.t('pchatDeviceReady'));
    }, err => deviceFailed(err));
  }
  // Voortgang van de download. Tijdens een vraag (zonder Annuleren) alleen echte percentages, zodat "wordt beantwoord"
  // blijft staan.
  function showProgress(p) {
    if (devAbort?.signal.aborted || (!devAbort && p == null)) return;
    note(p == null ? I.t('pchatPreparing') : I.t('pchatDownloading', { p }), '',
      { buttons: devAbort ? [btn(I.t('pchatCancel'), () => devAbort?.abort(), true)] : [] });
  }
  // De echte tekst, zonder de placeholders van dit venster: die betekenen buiten deze kluis iets anders.
  const realText = () => D.restore(input.value.trim(), vault);
  // Liever niet versturen: na een fout op dit apparaat gaat er nooit vanzelf iets anders weg.
  async function deviceFailed(err) {
    const code = err?.device || 'failed';
    console.warn('Kamelo Private Chat: device', I.BROWSER.id, dev.backend, code, err);
    document.documentElement.dataset.deviceError = `${code}: ${String(err?.message || err).slice(0, 200)}`;
    if (code === 'reload') { // Firefox geeft browser.trial pas na de toestemming: herladen en meteen verder
      await chrome.storage.session.set({ pchatReload: { text: realText(), host: sourceHost, at: Date.now() } });
      return location.reload();
    }
    if (code === 'aborted') return note(I.t('pchatNotSentTitle'), I.t('pchatDeviceCancelled'));
    // Alleen deze vraag lukte niet: de AI op dit apparaat blijft aan.
    if (code === 'toolong' || code === 'prompt' || code === 'language') {
      return offerOther(I.t('pchatNotSentTitle'), I.t({ toolong: 'pchatTooLong', prompt: 'pchatDeviceCant', language: 'pchatDeviceCant' }[code]));
    }
    dev.reset();
    if (code === 'denied') await chrome.storage.local.set({ pchatDevice: 'declined' });
    offReason = code;
    useFallback(I.t('pchatNotSentTitle'));
  }
  // Waarom er hier geen AI op dit apparaat is, in gewone woorden.
  function offText() {
    if (offReason === 'declined' || offReason === 'denied') return I.t(offReason === 'denied' ? 'pchatDeviceDenied' : 'pchatNoDeviceDeclined');
    const fail = { blocked: 'pchatDeviceBlocked', space: 'pchatDeviceSpace', memory: 'pchatDeviceMemory', failed: 'pchatDeviceFailed' }[offReason];
    if (fail) return I.t(fail);
    if (offReason === 'slow') return I.t('pchatDeviceSlow');
    if (devInfo.why === 'old') return I.t('pchatOldFirefox');
    if (devInfo.why === 'slow') return I.t('pchatSlowFirefox');
    if (devInfo.why === 'none') return I.t('pchatNoApi');
    return I.t('pchatNoDevice', { needs: I.t(I.BROWSER.id === 'edge' ? 'pchatNeedsEdge' : 'pchatNeedsChrome') });
  }
  // Geen antwoord op dit apparaat: Plus gaat naar de chip, anders de tijdelijke chat (pas na een klik).
  function useFallback(title) {
    engine = chipAllowed() ? 'chip' : 'none';
    if (engine === 'chip') { quota().then(showLeft); connect(); if (offReason) note(title || I.t('pchatNotSentTitle'), offText(), { bad: true }); else clearNote(); return; }
    connect();
    offerOther(title || I.t('pchatNoDeviceTitle'), offText());
  }
  function offerOther(title, text, extra = []) {
    note(title, text, { buttons: [btn(I.t('pchatTempChat', { site: siteName() }), openTempChat), ...extra] });
  }
  const siteName = () => (globalThis.PrivacySites?.siteFor(sourceHost)?.private ? globalThis.PrivacySites.siteFor(sourceHost).name : 'ChatGPT');
  // De echte tekst gaat via de achtergrond (werkgeheugen) naar de tijdelijke chat; daar schermt Kamelo hem af met de
  // kluis van die site. De vraag blijft hier staan tot je hem zelf weghaalt.
  async function openTempChat() {
    const site = await chrome.runtime.sendMessage({ type: 'pf:pchat-temp', text: realText(), host: sourceHost }).catch(() => null);
    if (!site) return note(I.t('pchatNotSentTitle'), I.t('pchatError'), { bad: true });
    note('', I.t('pchatTempOpened', { site }));
  }

  // ---------- verbinding controleren ----------
  // Zonder tekst alleen het slotje; de tekst blijft dan het label voor schermlezers.
  function setLock(state, text, label) {
    const lock = $('lock'), t = $('lockText');
    lock.dataset.state = state; t.textContent = text; t.hidden = !text;
    if (label) lock.setAttribute('aria-label', lock.title = label); else { lock.removeAttribute('aria-label'); lock.removeAttribute('title'); }
  }
  async function connect() {
    if (engine === 'device') return setLock('ok', '', I.t('pchatOnDevice'));
    if (engine === 'none') return setLock('off', '', I.t('pchatNoDeviceTitle'));
    setLock('checking', I.t('pchatChecking'));
    const opts = { baseURL: relay.replace(/\/?$/, '/') };
    // Het attestatiebewijs moet over https; lokaal (http) halen we het direct bij Tinfoil op.
    if (relay.startsWith('https://')) opts.attestationBundleURL = relay.replace(/\/$/, '');
    try {
      client = new SecureClient(opts);
      await client.ready();
      verified = client.getVerificationDocument();
      if (!verified?.securityVerified) throw new Error('not verified');
      setLock('ok', I.t('pchatVerified'));
    } catch (e) {
      client = null; verified = null;
      setLock('bad', I.t('pchatNotVerified'));
      console.warn('Kamelo Private Chat: verification failed', e);
    }
  }
  $('lock').addEventListener('click', () => {
    const box = $('lockInfo');
    if (!box.hidden) return void (box.hidden = true);
    box.replaceChildren();
    const small = text => Object.assign(document.createElement('div'), { className: 'small', textContent: text });
    if (engine === 'device') {
      const fx = dev.backend === 'firefox-ml';
      const have = dev.ready || devInfo.state === 'available';
      box.append(Object.assign(document.createElement('p'), { textContent: fx && !have ? I.t('pchatDeviceOfferFx', { size: fmtGB(devInfo.download.gb) }) : I.t(fx ? 'pchatDeviceInfoFx' : 'pchatDeviceInfo') }));
      if (fx && have && !busy) {
        const rm = Object.assign(document.createElement('a'), { href: '#', textContent: I.t('pchatRemoveModel', { size: fmtGB(devInfo.download.gb) }) });
        rm.onclick = async e => {
          e.preventDefault();
          try { await dev.remove(); } catch { return void box.replaceChildren(small(I.t('pchatError'))); }
          devInfo.state = 'downloadable';
          box.replaceChildren(small(I.t('pchatModelRemoved')));
        };
        const s = small(''); s.append(rm); box.append(s);
      }
    } else if (engine === 'none') {
      box.append(Object.assign(document.createElement('p'), { textContent: offText() }));
      if (devInfo.state !== 'unavailable' && !['blocked', 'space'].includes(offReason)) {
        const use = Object.assign(document.createElement('a'), { href: '#', textContent: I.t('pchatUseDevice') });
        use.onclick = async e => {
          e.preventDefault();
          await chrome.storage.local.remove('pchatDevice');
          engine = 'device'; offReason = ''; box.hidden = true; connect();
          if (devInfo.state === 'downloadable') offerDevice(false); else clearNote();
        };
        const s = small(''); s.append(use); box.append(s);
      }
    } else if (verified) {
      // Kort voor iedereen; de technische details staan achter de link (de openbare code van de enclave).
      box.append(Object.assign(document.createElement('p'), { textContent: I.t('pchatInfo') }));
      const small = document.createElement('div');
      small.className = 'small';
      const time = new Date(verified.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const link = Object.assign(document.createElement('a'), {
        href: `https://github.com/${verified.configRepo}/releases/tag/${verified.releaseTag}`,
        target: '_blank', rel: 'noopener', textContent: I.t('pchatViewCode'),
      });
      small.append(I.t('pchatCheckedAt', { time }), ' · ', link);
      box.append(small);
    } else {
      box.textContent = I.t('pchatNotVerifiedInfo');
    }
    box.hidden = false;
  });

  // ---------- tekst uit de melding overnemen ----------
  async function takeHandoff() {
    const got = await chrome.runtime.sendMessage({ type: 'pf:pchat-take' }).catch(() => null);
    const text = typeof got === 'string' ? got : got?.text;
    if (got?.host) sourceHost = got.host; // voor de tijdelijke chat: dezelfde AI-site als waar de vraag vandaan kwam
    if (!text) return false;
    handedTyped = got?.typed === true;
    if (history.length && !busy) newConv(); // een nieuwe vraag uit de melding: een eigen gesprek
    const masked = D.mask(text, vault, maskOpts()).text;
    input.value = input.value ? `${input.value}\n${masked}` : masked;
    input.focus();
    autosize();
    return true;
  }
  // De vraag komt uit de melding ("Ask Melo"): je koos al voor Melo, dus meteen stellen als de AI op
  // dit apparaat klaarstaat. Anders blijft hij in het veld staan (download aanbieden, of de tijdelijke chat).
  // Alleen als de gebruiker de tekst zelf typte of plakte; zette de site hem in het veld, dan eerst laten zien.
  let handedTyped = false;
  const canAskNow = () => handedTyped && engine === 'device' && devInfo.state === 'available' && !busy && !preparing;
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session' && changes.pchat?.newValue && await takeHandoff() && canAskNow()) form.requestSubmit();
  });
  // Alvast opstarten zodra het venster opent: de eerste vraag hoeft dan niet op de AI te wachten. Alleen als het model er
  // al is (nooit een download zonder klik).
  function warmUp() { if (engine === 'device' && devInfo.state === 'available' && !dev.ready) dev.prepare().catch(() => {}); }

  const maskOpts = () => ({ customTerms: settings.customTerms, allowList: settings.allowList, types: settings.types });

  // ---------- weergave ----------
  const PH = /\[[A-Z]+(?:_[A-Z]+)*_\d+\]/g;
  function withChips(text, el) {
    let last = 0;
    for (const m of text.matchAll(PH)) {
      el.append(text.slice(last, m.index), Object.assign(document.createElement('span'), { className: 'chip', textContent: m[0] }));
      last = m.index + m[0].length;
    }
    el.append(text.slice(last));
  }
  // Placeholders terug naar de echte waarde, groen gemarkeerd (alleen op dit scherm).
  function withRestored(text, el) {
    let last = 0;
    for (const m of text.matchAll(PH)) {
      const real = vault.byPlaceholder[m[0]];
      el.append(text.slice(last, m.index), real
        ? Object.assign(document.createElement('span'), { className: 'back', textContent: real, title: m[0] })
        : m[0]);
      last = m.index + m[0].length;
    }
    el.append(text.slice(last));
  }
  // Heel eenvoudige opmaak: alinea's, opsommingen en **vet**. Alles als tekst, nooit als HTML.
  function renderAnswer(text, el) {
    const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
    for (const block of blocks) {
      if (/^\s*([-*_])\1{2,}\s*$/.test(block)) { el.append(document.createElement('hr')); continue; }
      const lines = block.split('\n').filter(l => !/^\s*([-*_])\1{2,}\s*$/.test(l));
      if (!lines.length) continue;
      const isList = lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l));
      if (isList) {
        const ul = document.createElement(/^\s*\d/.test(lines[0]) ? 'ol' : 'ul');
        for (const l of lines) { const li = document.createElement('li'); inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''), li); ul.append(li); }
        el.append(ul);
      } else {
        const p = document.createElement('p');
        lines.forEach((l, i) => { if (i) p.append(document.createElement('br')); inline(l.replace(/^#+\s*/, ''), p); });
        el.append(p);
      }
    }
  }
  function inline(text, el) {
    text.split(/(\*\*[^*]+\*\*)/).forEach(part => {
      if (/^\*\*[^*]+\*\*$/.test(part)) { const b = document.createElement('b'); withRestored(part.slice(2, -2), b); el.append(b); }
      else withRestored(part, el);
    });
  }
  function bubble(cls) {
    conv.thread.querySelector('.empty')?.remove();
    const d = document.createElement('div');
    d.className = cls;
    conv.thread.append(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function note(title, text, { bad = false, button = null, buttons = [] } = {}) {
    const n = $('note');
    n.className = 'note' + (bad ? ' bad' : '');
    n.replaceChildren();
    if (title) n.append(Object.assign(document.createElement('b'), { textContent: title }));
    n.append(text);
    const all = [button, ...buttons].filter(Boolean);
    if (all.length) {
      const row = Object.assign(document.createElement('div'), { className: 'btns' });
      row.append(...all);
      n.append(row);
    }
    n.hidden = false;
  }
  const clearNote = () => { $('note').hidden = true; };
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, innerHeight * .4) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });

  // ---------- versturen ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw || busy || preparing) return;
    // Op dit apparaat: eerst de download (na een klik). Er gaat niets weg.
    if (engine === 'device' && !dev.ready && devInfo.state === 'downloadable') return offerDevice(true);
    if (engine === 'none') return useFallback();
    if (engine === 'chip' && (await quota()) >= FREE_PER_DAY) {
      const plus = btn(I.t('pchatPlus'), null);
      plus.disabled = true;
      return note(I.t('pchatLimitTitle', { max: FREE_PER_DAY }), I.t('pchatLimit'), { button: plus });
    }
    if (engine === 'chip' && !client) await connect();
    if (engine === 'chip' && !client) return note(I.t('pchatNotVerified'), I.t('pchatNotSent'), { bad: true });

    const masked = D.mask(raw, vault, maskOpts()).text;
    if (!conv.title) setTitle(conv, D.restore(masked, vault));
    history.push({ role: 'user', content: masked });
    const u = bubble('u');
    withChips(masked, u);
    if (PH.test(masked)) u.append(Object.assign(document.createElement('span'), { className: 'seen', textContent: I.t('pchatSeen') }));
    PH.lastIndex = 0;
    input.value = ''; autosize(); clearNote();

    busy = true; $('send').disabled = true; syncConvButtons();
    const a = bubble('a');
    a.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    const t0 = performance.now();
    try {
      if (engine === 'device') {
        // Firefox geeft het antwoord in één keer; Chrome en Edge woord voor woord.
        if (dev.backend === 'firefox-ml') note('', I.t('pchatThinkingDevice'));
        // Eén keer per beeldje tekenen: woord voor woord opnieuw opbouwen laat het antwoord haperen.
        let latest = '', frame = 0;
        onChunk = text => {
          latest = text;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const follow = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
            a.replaceChildren(); renderAnswer(latest, a);
            if (follow) msgs.scrollTop = msgs.scrollHeight;
          });
        };
        const answer = await dev.ask(masked, text => onChunk?.(text));
        onChunk = null; cancelAnimationFrame(frame);
        clearNote();
        history.push({ role: 'assistant', content: answer });
        a.replaceChildren();
        renderAnswer(answer || '…', a);
        const st = dev.stats;
        debug(`op dit apparaat (${dev.backend}), ${((performance.now() - t0) / 1000).toFixed(1)} s`, st);
        if (st?.cut) note('', I.t('pchatCutShort'));
        await checkSpeed(st, performance.now() - t0);
        return;
      }
      const res = await client.fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, max_tokens: MAX_TOKENS, stream: true, stream_options: { include_usage: true },
          messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-HISTORY_KEEP)],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw Object.assign(new Error(`HTTP ${res.status}`), { code: body?.error?.code, status: res.status });
      }
      // Woord voor woord: het eerste stuk staat er meestal binnen een halve seconde.
      let answer = '', cut = false, usage = null, buf = '';
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const m = line.match(/^data: (.*)$/);
          if (!m || m[1] === '[DONE]') continue;
          let j; try { j = JSON.parse(m[1]); } catch { continue; }
          const d = j.choices?.[0]?.delta?.content;
          if (j.choices?.[0]?.finish_reason === 'length') cut = true;
          if (j.usage) usage = j.usage;
          if (d) { answer += d; a.replaceChildren(); renderAnswer(answer, a); msgs.scrollTop = msgs.scrollHeight; }
        }
      }
      answer = answer.trim();
      if (usage) debug('tokens', usage, `${((performance.now() - t0) / 1000).toFixed(1)} s`);
      history.push({ role: 'assistant', content: answer });
      a.replaceChildren();
      renderAnswer(answer || '…', a);
      if (cut) note('', I.t('pchatCut'));
      await useOne();
    } catch (err) {
      history.pop();
      a.remove();
      u.remove();
      if (!history.length) { setTitle(conv, ''); if (!conv.thread.children.length) conv.thread.append(emptyState()); }
      input.value = raw; autosize();
      if (err.device) return void deviceFailed(err);
      console.warn('Kamelo Private Chat:', err);
      const msg = err.code === 'no_key' ? I.t('pchatNoKey')
        : err.status === 401 ? I.t('pchatBadKey')
        : err.name === 'AttestationError' ? I.t('pchatNotVerified')
        : err instanceof TypeError ? I.t('pchatNoRelay', { relay })
        : I.t('pchatError');
      note(I.t('pchatNotSentTitle'), msg, { bad: true });
    } finally {
      busy = false; $('send').disabled = false; syncConvButtons();
      msgs.scrollTop = msgs.scrollHeight;
    }
  });

  // ---------- snelheid en geheugen ----------
  // Te traag: eerst een melding, de tweede keer achter elkaar voortaan de tijdelijke chat (alleen op deze computer).
  async function checkSpeed(st, totalMs) {
    if (!st || dev.backend !== 'prompt-api') return;
    const { pchatSlow = 0 } = await chrome.storage.local.get('pchatSlow');
    if (!isSlow(st)) { if (pchatSlow) await chrome.storage.local.remove('pchatSlow'); return; }
    if (pchatSlow >= 1) {
      await chrome.storage.local.set({ pchatDevice: 'slow' });
      await chrome.storage.local.remove('pchatSlow');
    } else await chrome.storage.local.set({ pchatSlow: 1 });
    note('', I.t('pchatSlowNote', { s: Math.round(totalMs / 1000) }));
  }
  // Paneel een minuut niet in beeld, of dicht: de AI loslaten, zodat de computer zijn geheugen terugkrijgt.
  let hiddenTimer = null;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(hiddenTimer);
    if (document.hidden && !busy) hiddenTimer = setTimeout(() => { if (!busy) dev.release?.(); }, 60 * 1000);
  });
  addEventListener('pagehide', () => dev.release?.());

  // ---------- start ----------
  (async () => {
    newConv();
    const { settings: s } = await chrome.storage.local.get('settings');
    settings = { ...C.DEFAULT_SETTINGS, ...(s || {}) };
    // Kamelo Business: het beleid van de organisatie (policy.js) geldt ook hier, bijv. eigen termen die altijd worden afgeschermd.
    if (globalThis.KameloPolicy) {
      // Niets laden, geen vraag aannemen; alleen een regel uitleg.
      const off = async text => {
        await chrome.storage.session.remove('pchat').catch(() => {});
        const note = document.createElement('p');
        note.className = 'org-off';
        note.textContent = text;
        msgs.replaceChildren(note);
        form.hidden = true;
        document.documentElement.dataset.engine = 'off';
      };
      // Kamelo Business zonder geldige licentie (src/licence.js, gecontroleerd in de achtergrond): ook geen Private Chat.
      const licence = await chrome.runtime.sendMessage({ type: 'pf:licence' }).catch(() => null);
      if (licence?.active !== true) return off(I.t('pchatInactive'));
      const policy = await globalThis.KameloPolicy.read();
      settings = globalThis.KameloPolicy.merge(settings, policy);
      // De organisatie heeft Private Chat uitgezet.
      if (policy.privateChat === false) return off(I.t('pchatOffByOrg'));
    }
    relay = settings.privateChatRelay || RELAY_DEFAULT;
    // De vraag uit de melding meteen in beeld, terwijl we nagaan welke AI kan antwoorden.
    const handed = await takeHandoff();
    devInfo = await dev.detect();
    const { pchatDevice } = await chrome.storage.local.get('pchatDevice');
    const usable = devInfo.state !== 'unavailable';
    // 'declined': je koos "Niet nu"; 'slow': op deze computer twee keer te traag. Allebei terug te draaien via het slotje.
    const turnedOff = pchatDevice === 'declined' || pchatDevice === 'slow';
    engine = FORCE !== 'chip' && usable && (FORCE === 'device' || !turnedOff) ? 'device'
      : chipAllowed() ? 'chip' : 'none';
    debug(I.BROWSER.id, dev.backend, devInfo.state, devInfo.langs.join(','), '→', engine);
    Object.assign(document.documentElement.dataset, { engine, backend: dev.backend, device: devInfo.state }); // voor tests en schermlezers niet zichtbaar
    if (engine === 'chip') showLeft(await quota()); else $('hint').textContent = '';
    if (engine === 'none' && turnedOff) offReason = pchatDevice;
    warmUp();
    // Na herladen voor Firefox' toestemming: de vraag terug (opnieuw afgeschermd) en meteen verder met de download.
    const { pchatReload: back } = await chrome.storage.session.get('pchatReload');
    if (back) await chrome.storage.session.remove('pchatReload');
    const resume = back && Date.now() - back.at < 60000;
    if (resume) {
      if (back.host) sourceHost = back.host;
      if (back.text) { input.value = D.mask(back.text, vault, maskOpts()).text; autosize(); }
    }
    connect();
    // Bij het openen nooit downloaden: alleen aanbieden. Kan het hier niet, dan meteen zeggen wat wel kan.
    if (engine === 'device' && devInfo.state === 'downloadable' && resume) startDownload(!!input.value.trim());
    else if (engine === 'device' && devInfo.state === 'downloadable') offerDevice(false);
    else if (engine === 'none') useFallback();
    else if (handed && canAskNow()) form.requestSubmit();
  })();
})();
