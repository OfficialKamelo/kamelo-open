// Kamelo — content script.
// Schermt persoonsgegevens af in alles wat naar een AI gaat:
//  - op AI-sites (ChatGPT, Gemini, Claude, …) in elk tekstveld;
//  - op andere sites (Gmail, Slack, Notion, …) alleen in AI-velden, zoals "Help me schrijven";
//  - in verzoeken die een pagina rechtstreeks naar een AI-API stuurt (zie net-main.js);
//  - op sites die de gebruiker zelf als AI heeft gemarkeerd, in elk tekstveld.
// Gewone berichten aan mensen blijven onaangeroerd.
//
// 1. Plakken: gegevens worden direct vervangen door placeholders.
// 2. Versturen (Enter of verstuurknop): staan er nog gegevens in, dan wordt het bericht eerst
//    afgeschermd en tegengehouden, zodat de gebruiker kan controleren.
// 3. Antwoorden: placeholders op de pagina worden lokaal teruggezet naar de echte waarden.
(() => {
  'use strict';
  const D = globalThis.PrivacyDetector;
  const C = globalThis.PrivacyConfig;
  const S = globalThis.PrivacySites;
  const I = globalThis.PrivacyI18n;
  const T = globalThis.PrivacyTopics;
  // Al actief in dit frame (bijv. ook ingevoegd na installeren)? Dan niets doen, tenzij die versie geen verbinding
  // met de extensie meer heeft. Oudere versies zetten hier true in plaats van een functie.
  const prev = globalThis.__privacyfilterActive;
  if (!D || !C || !S || (typeof prev === 'function' && prev())) return;
  const alive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
  globalThis.__privacyfilterActive = alive;

  // Na een update draait de vorige versie in open tabs nog door, zonder verbinding met de extensie (zie background.js).
  // Zodra een nieuwere versie zich meldt, laat die oude alles aan de nieuwe over; zolang er geen nieuwere is, blijft hij
  // afschermen met wat hij in het geheugen heeft. Alleen een losgekoppelde versie wijkt, zodat een site Kamelo zo niet uitzet.
  const INSTANCE = Math.random().toString(36).slice(2);
  let superseded = false;
  document.addEventListener('pf:hello', e => { if (e.detail !== INSTANCE && !alive()) superseded = true; });
  document.dispatchEvent(new CustomEvent('pf:hello', { detail: INSTANCE }));

  let settings = { ...C.DEFAULT_SETTINGS };
  let vault = D.emptyVault();
  let aiSite = S.siteFor(location.hostname); // de AI-site (zie sites.js), of null op een gewone site
  let internalPaste = false;

  // Kluis per site (zie inScope in detector.js): gegevens die hier worden afgeschermd, komen alleen hier terug.
  // Bekende AI-sites met meerdere adressen (chatgpt.com en chat.openai.com) delen één bereik. Gegevens van vóór
  // de kluis per site gelden alleen op bekende AI-sites, want daar zijn ze ooit afgeschermd.
  const KNOWN_AI = S.siteFor(location.hostname);
  const SCOPE = KNOWN_AI ? `ai:${KNOWN_AI.name}` : location.hostname.replace(/^www\./, '');
  const LEGACY = !!KNOWN_AI;

  const EDITOR_SEL = 'textarea, [contenteditable]:not([contenteditable="false"])';
  const NEVER_RESTORE_SEL = 'script, style, noscript, [data-pf-raw]';
  const HINT_ATTRS = ['placeholder', 'aria-label', 'aria-placeholder', 'data-placeholder', 'title', 'data-testid', 'name', 'id'];

  function applySettings(next) {
    settings = { ...C.DEFAULT_SETTINGS, ...(next || {}) };
    aiSite = S.siteFor(location.hostname, settings.customAiSites);
    if (aiSite) startRestoring();
  }

  // Na het herladen of bijwerken van de extensie blijft dit script actief in tabs die al open stonden,
  // maar zonder verbinding met de extensie: elke chrome.*-aanroep geeft dan "Extension context invalidated".
  // Het afschermen blijft werken met wat al in het geheugen staat; opslaan slaan we stil over.
  const store = (area, data) => { if (alive()) chrome.storage[area].set(data).catch(() => {}); };

  // Firefox laat content scripts niet bij storage.session (geen setAccessLevel). Daar lopen lezen en
  // schrijven van de kluis via de achtergrond, en komen wijzigingen als bericht binnen (pf:vault).
  const RELAY = chrome.runtime.getURL('').startsWith('moz-extension:');

  // De kluis staat in het werkgeheugen (chrome.storage.session); de achtergrond schrijft hem
  // (zo nodig versleuteld) naar schijf. Eerst wachten tot die hem heeft klaargezet.
  const ready = (async () => {
    await chrome.runtime.sendMessage({ type: 'pf:init' }).catch(() => {});
    const [{ settings: s, noticesSeen: seen }, { vault: v }] = await Promise.all([
      chrome.storage.local.get(['settings', 'noticesSeen']),
      RELAY ? chrome.runtime.sendMessage({ type: 'pf:vault-get' }).then(vault => ({ vault })) : chrome.storage.session.get('vault'),
    ]);
    if (v) vault = v;
    noticesSeen = Number(seen) || 0;
    applySettings(s);
    if (aiSite && window === window.top) {
      const before = JSON.stringify(vault.lastUsed || null);
      D.prune(vault, settings.retentionDays);
      if (JSON.stringify(vault.lastUsed) !== before) saveVault();
    }
  })().catch(() => {}); // geen verbinding met de extensie: verder met de standaardinstellingen

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.vault) vault = changes.vault.newValue || D.emptyVault();
    if (area === 'local' && changes.settings) applySettings(changes.settings.newValue);
    if (area === 'local' && changes.noticesSeen) noticesSeen = Number(changes.noticesSeen.newValue) || 0;
    if (restoring) restoreIn(document.body);
  });

  const opts = () => ({ customTerms: settings.customTerms, allowList: settings.allowList, scope: SCOPE, legacy: LEGACY });
  const restoreText = text => D.restore(text, vault, { scope: SCOPE, legacy: LEGACY });
  const saveVault = () => {
    if (!RELAY) return store('session', { vault });
    if (alive()) chrome.runtime.sendMessage({ type: 'pf:vault-set', vault }).catch(() => {});
  };

  // ---------- Editors ----------

  function findEditor(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const hit = el?.closest(EDITOR_SEL);
    if (!hit) return null;
    if (hit.tagName === 'TEXTAREA') return hit;
    let top = hit;
    while (top.parentElement?.isContentEditable) top = top.parentElement;
    return top;
  }

  // Gaat de inhoud van dit veld naar een AI?
  const aiFieldCache = new WeakMap();
  function goesToAi(ed) {
    return !!aiSite || hinted(ed);
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

  const getText = ed => (ed.tagName === 'TEXTAREA' ? ed.value : ed.innerText);

  // Voegt tekst in op de cursor (of vervangt alles). Voor rich-text editors (ProseMirror,
  // Quill) sturen we een synthetisch paste-event, zodat de editor zijn eigen state bijwerkt.
  function insertText(ed, text, replaceAll) {
    ed.focus();
    if (ed.tagName === 'TEXTAREA') {
      if (replaceAll) ed.select();
      if (!document.execCommand('insertText', false, text)) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
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
    startRestoring();
    count(items);
    toast(items, ctx);
  }

  // Voor het maandoverzicht in de popup: alleen hoeveel per soort, nooit de waarden (zie stats.js).
  function count(items) {
    const counts = {};
    for (const it of uniqueItems(items)) counts[it.type] = (counts[it.type] || 0) + 1;
    if (alive()) chrome.runtime.sendMessage({ type: 'pf:count', counts }).catch(() => {});
  }

  // Schermt de inhoud van het veld af. Geeft true terug als er iets is afgeschermd.
  function guard(ed) {
    const result = D.mask(getText(ed), vault, opts());
    if (!result.items.length) return false;
    insertText(ed, result.text, true);
    afterMask(result.items, { ed, segment: result.text, items: result.items });
    return true;
  }

  window.addEventListener('paste', e => {
    if (superseded) return;
    if (internalPaste || !settings.enabled) return;
    const ed = aiEditor(e.target);
    const text = ed && e.clipboardData?.getData('text/plain');
    if (!text) return;
    const result = D.mask(text, vault, opts());
    typedIn.add(ed);
    if (!result.items.length) return checkTopics(text, ed);
    e.preventDefault();
    e.stopImmediatePropagation();
    insertText(ed, result.text, false);
    afterMask(result.items, { ed, segment: result.text, items: result.items });
    checkTopics(text, ed); // na de melding hierboven
  }, true);

  window.addEventListener('keydown', e => {
    if (superseded) return;
    if (!settings.enabled || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const ed = aiEditor(e.target);
    if (ed && guard(ed)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  const SEND_LABEL = /send|verzend|verstuur|submit|stuur|ask|vraag|generate|genereer|create|maken|maak/i;

  function isSendButton(btn) {
    const label = [btn.getAttribute('aria-label'), btn.getAttribute('data-testid'), btn.title, btn.textContent]
      .filter(Boolean).join(' ');
    return SEND_LABEL.test(label) && !/stop/i.test(label);
  }

  function editorNear(btn) {
    let n = btn;
    for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
      const ed = n.querySelector?.(EDITOR_SEL);
      if (ed) return findEditor(ed);
    }
    return findEditor(document.activeElement);
  }

  window.addEventListener('click', e => {
    if (superseded) return;
    if (!settings.enabled) return;
    const btn = e.target.closest?.('button, [role="button"]');
    if (!btn || !isSendButton(btn)) return;
    const ed = editorNear(btn);
    if (ed && goesToAi(ed) && guard(ed)) {
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

  function maskRequestBody(text) {
    const items = [];
    const maskString = s => {
      if (s.length > 1000 && !/\s/.test(s)) return s; // base64-afbeeldingen en andere binaire data
      const r = D.mask(s, vault, opts());
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

  // De popup vraagt hier op welke site we draaien, zodat hij niet hoeft te raden aan de hand van de url.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'pf:vault' && RELAY) {
      vault = msg.vault || D.emptyVault();
      if (restoring) restoreIn(document.body);
      return;
    }
    if (msg?.type !== 'pf:status' || window !== window.top) return;
    ready.then(() => reply({ host: location.hostname, aiSite: S.siteFor(location.hostname)?.name ?? null }));
    return true;
  });

  // Let op: dit event kan ook door de pagina zelf worden gestuurd (net-main.js draait in de pagina). Daarom:
  // - wat hier wordt afgeschermd, komt in het bereik van deze site (en kan dus niets van andere sites onthullen);
  // - een budget per pagina, zodat een site de kluis niet kan volstoppen tot echte gegevens eruit vallen;
  // - de naam in de melding moet eruitzien als een hostnaam.
  let apiBudget = 500;
  document.addEventListener('pf:mask', async e => {
    if (superseded) return;
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    await ready;
    let body = msg.body, items = [];
    if (settings.enabled && typeof body === 'string' && apiBudget > 0) ({ body, items } = maskRequestBody(body));
    apiBudget -= uniqueItems(items).length;
    document.dispatchEvent(new CustomEvent('pf:masked', { detail: JSON.stringify({ id: msg.id, body }) }));
    if (items.length) afterMask(items);
  });

  // ---------- Terugzetten in antwoorden ----------
  // Op AI-sites altijd; op andere sites pas zodra hier iets is afgeschermd. Antwoorden die in
  // een gewoon veld belanden (bijv. een AI-concept in Gmail) worden ook teruggezet, zodat de
  // ontvanger de echte gegevens krijgt. In het AI-veld zelf blijven de placeholders staan.

  let restoring = false;

  function fixTextNode(n) {
    const v = n.nodeValue;
    const parent = n.parentElement;
    if (!v || !parent || !D.hasPlaceholder(v) || parent.closest(NEVER_RESTORE_SEL)) return;
    const ed = findEditor(parent);
    if (ed && isComposer(ed)) return;
    const restored = restoreText(v);
    if (restored !== v) n.nodeValue = restored;
  }

  // Op AI-sites is niet elk bewerkbaar veld het invoerveld: ChatGPT zet bijv. e-mailconcepten in een bewerkbaar
  // blok in het antwoord. Placeholders blijven alleen staan in het veld waarin de gebruiker typt of plakt.
  // De selector uit sites.js is het snelst en het zekerst; zonder (of als die niet meer klopt) raden we.
  const typedIn = new WeakSet();
  window.addEventListener('input', e => {
    const ed = findEditor(e.target);
    if (!ed) return;
    typedIn.add(ed);
    if (!superseded && settings.enabled && goesToAi(ed)) checkTopicsSoon(ed);
  }, true);
  function isComposer(ed) {
    if (!aiSite) return hinted(ed);
    if (matchesComposer(ed)) return true;
    const active = document.activeElement;
    return typedIn.has(ed) || (active && ed.contains(active)) || !!ed.closest('form') || hinted(ed);
  }
  function matchesComposer(ed) {
    const sel = aiSite.composer;
    if (!sel) return false;
    try { return !!(ed.closest(sel) || ed.querySelector(sel)); } catch { return false; } // ongeldige selector
  }

  function restoreIn(root) {
    if (!root || !settings.enabled || !settings.restore) return;
    if (root.nodeType === Node.TEXT_NODE) return fixTextNode(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) fixTextNode(n);
  }

  function startRestoring() {
    if (restoring) return;
    restoring = true;
    restoreIn(document.body);
    const pending = new Set();
    let scheduled = false;
    new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'characterData') pending.add(m.target);
        else m.addedNodes.forEach(n => pending.add(n));
      }
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        const nodes = [...pending];
        pending.clear();
        nodes.forEach(n => n.isConnected && restoreIn(n));
      }, 30);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  // ---------- Kopiëren ----------
  // De kopieerknop van een AI-site kopieert de tekst uit zijn eigen gegevens, met placeholders. net-main.js vraagt
  // hier (synchroon, zodat de klik als gebruikersactie blijft gelden) om de echte waarden terug te zetten.
  // Ook dit event kan de pagina zelf sturen. Daarom alleen tijdens een echte gebruikersactie (een klik of toets,
  // die een pagina niet kan namaken) en alleen met gegevens van deze site.
  document.addEventListener('pf:restore', e => {
    if (superseded) return;
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    if (typeof msg?.text !== 'string') return;
    const allowed = restoring && settings.enabled && settings.restore && navigator.userActivation?.isActive !== false;
    const text = allowed ? restoreText(msg.text) : msg.text;
    document.dispatchEvent(new CustomEvent('pf:restored', { detail: JSON.stringify({ id: msg.id, text }) }));
  });
  // Kopiëren via execCommand: de site zet de tekst in het copy-event; wij zetten daarna de echte waarden terug.
  window.addEventListener('copy', e => {
    if (superseded) return;
    if (!restoring || !settings.enabled || !settings.restore || !e.clipboardData) return;
    let changed = false;
    for (const type of ['text/plain', 'text/html']) {
      const data = e.clipboardData.getData(type);
      if (!data || !D.hasPlaceholder(data)) continue;
      e.clipboardData.setData(type, restoreText(data));
      changed = true;
    }
    if (changed) e.preventDefault();
  });

  // ---------- Melding ----------
  // Een pil vlak boven het invoerveld: het eerste gegeven doorgestreept → zijn placeholder, "+N meer", Bekijk en ×.
  // Na vijf keer alleen nog "N afgeschermd". Bekijk opent op dezelfde plek een kaart: per gegeven wat de AI ziet.
  // Neemt nooit de focus over; Esc sluit hem.

  const LOGO = `<svg viewBox="0 0 128 128" aria-hidden="true"><path transform="translate(-35.29 -36.75) scale(0.19469) translate(0 1024) scale(.1 -.1)" fill="#1A8CFF" fill-rule="evenodd" d="M6313 7694 c-70 -26 -126 -84 -178 -186 -142 -276 -218 -293 -685 -152 -1562 470 -3188 -605 -3414 -2258 -163 -1187 218 -2103 1043 -2514 1165 -579 2347 337 1884 1461 -25 61 -67 170 -94 243 -67 185 -102 243 -229 377 -274 288 -170 479 253 463 203 -8 269 -43 522 -274 260 -238 317 -293 445 -430 285 -304 426 -361 516 -208 93 158 18 335 -174 414 -247 103 -361 236 -323 378 33 122 83 132 711 142 782 13 980 51 1280 247 496 325 401 1004 -210 1491 -52 42 -194 173 -315 291 -423 415 -797 601 -1032 515z m-2514 -2709 c230 -118 251 -394 46 -579 -313 -283 -388 -441 -332 -703 102 -477 828 -555 828 -89 0 215 -213 286 -337 113 -95 -132 -167 -143 -204 -31 -76 231 185 458 448 390 743 -190 352 -1281 -425 -1186 -687 84 -1063 743 -816 1433 149 419 571 767 792 652z M7030 6440 a300 300 0 1 0 600 0 a300 300 0 1 0 -600 0z"/></svg>`;
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

  // Waar de melding komt: vlak boven het invoerveld, links gelijk met de tekst. Is het veld er niet (bijv. bij een
  // verzoek aan een AI-API) of staat het buiten beeld, dan rechtsonder.
  let anchorEd = null;
  function anchor(need = 60) {
    const ed = anchorEd?.isConnected ? anchorEd : null;
    if (!ed) return null;
    const r = ed.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const form = ed.closest('form')?.getBoundingClientRect();
    const top = form && form.top <= r.top && form.height < r.height + 200 ? form.top : r.top;
    if (top - need < 8 || top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
    return { left: Math.round(Math.max(12, Math.min(r.left - 8, innerWidth - 240))), bottom: Math.round(innerHeight - top + 10), room: top - 18 };
  }
  function place(box, need) {
    const a = anchor(need);
    Object.assign(box.style, a
      ? { left: `${a.left}px`, right: 'auto', bottom: `${a.bottom}px`, maxWidth: `${innerWidth - a.left - 12}px` }
      : { left: 'auto', right: '20px', bottom: '20px', maxWidth: `${innerWidth - 40}px` });
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
      const a = anchor(need);
      const key = a ? `${a.left},${a.bottom}` : 'corner';
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
        /* Gevoelig onderwerp: dezelfde melding, met een zin en twee knoppen */
        .t.card { border-radius: 14px; align-items: flex-start; white-space: normal; max-width: 400px; padding: 10px 10px 10px 12px; }
        .t.card > svg:first-child { width: 22px; height: 22px; }
        .c { min-width: 0; }
        .c b { display: block; font-weight: 600; }
        .c .m { display: block; margin-top: 2px; color: var(--dim); font-size: 12px; line-height: 16px; }
        .k { display: flex; gap: 6px; margin-top: 8px; }
        .k button { font-size: 12px; font-weight: 500; background: var(--hover); border-radius: 999px; padding: 4px 11px; white-space: nowrap; }
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

  // Hoe vaak de volledige melding al is getoond (alleen een getal, in chrome.storage.local).
  let noticesSeen = 0;

  function toast(items, ctx) {
    const unique = uniqueItems(items);
    if (!unique.length) return;
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
  // Eén keer per onderwerp per pagina; "Niet meer tonen" zet dat onderwerp voorgoed uit (terug te zetten in de instellingen).

  const warnedTopics = new Set();
  let topicTimer;
  function checkTopicsSoon(ed) {
    clearTimeout(topicTimer);
    topicTimer = setTimeout(() => ed.isConnected && checkTopics(getText(ed), ed), 900);
  }

  function checkTopics(text, ed = null) {
    if (!T || !settings.enabled || !settings.topicWarnings) return;
    const muted = settings.mutedTopics || [];
    const topic = T.sensitiveTopics(text).find(k => !warnedTopics.has(k) && !muted.includes(k));
    if (!topic) return;
    // Staat er al een melding (bijv. "2 afgeschermd" bij hetzelfde plakken)? Dan erna.
    if (toastShown() || panel) return void setTimeout(() => checkTopics(text, ed), 1500);
    warnedTopics.add(topic);
    anchorEd = ed;
    showToast('card', [
      el('div', { className: 'c' },
        el('b', { textContent: I.t('topicTitle') }),
        el('span', { className: 'm', textContent: `${I.t(`topic_${topic}`)} ${I.t('topicAdvice')}` }),
        el('div', { className: 'k' },
          textButton('', I.t('topicOk'), hideToast),
          textButton('', I.t('topicMute'), () => {
            settings.mutedTopics = [...new Set([...(settings.mutedTopics || []), topic])];
            store('local', { settings });
            hideToast();
          }))),
    ], 9000);
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
      if (ctx?.ed) {
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
    const lower = word.toLowerCase();
    if (!settings.allowList.some(w => w.toLowerCase() === lower)) settings.allowList = [...settings.allowList, word];
    settings.allowMeta = { ...(settings.allowMeta || {}), [lower]: { site: location.hostname, at: Date.now() } };
    store('local', { settings });
    return ctx && unmaskInField(ctx, lower);
  }

  function undoKeep(word, ctx, before) {
    const lower = word.toLowerCase();
    settings.allowList = settings.allowList.filter(w => w.toLowerCase() !== lower);
    if (settings.allowMeta) { const { [lower]: _, ...rest } = settings.allowMeta; settings.allowMeta = rest; }
    store('local', { settings });
    if (before && ctx?.ed?.isConnected) {
      const cur = getText(ctx.ed), i = cur.lastIndexOf(ctx.segment);
      if (i !== -1) {
        insertText(ctx.ed, cur.slice(0, i) + before.segment + cur.slice(i + ctx.segment.length), true);
        ctx.segment = before.segment;
        ctx.items = before.items;
      }
    }
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
