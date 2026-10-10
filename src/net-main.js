// Netwerkfilter (draait in de pagina zelf, vóór de scripts van de site).
// Verzoeken die de pagina rechtstreeks naar een AI-API stuurt (OpenAI, Anthropic, Google, …)
// worden eerst afgeschermd. Het afschermen zelf gebeurt in het content script, waar de kluis
// staat; deze kant stuurt alleen de tekst heen en krijgt de afgeschermde versie terug.
(() => {
  'use strict';
  const C = window.PrivacyAiHosts;
  if (!C || window.__privacyfilterNet) return;
  window.__privacyfilterNet = true;

  const TIMEOUT_MS = 5000;
  const pending = new Map();
  let seq = 0;

  document.addEventListener('pf:masked', e => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch { return; }
    const done = pending.get(msg.id);
    if (done) { pending.delete(msg.id); done(msg.body); }
  });

  // Antwoordt de extensie niet binnen 5 seconden, dan gaat het verzoek ongewijzigd door,
  // zodat de site niet vastloopt.
  function maskBody(body, host) {
    return new Promise(resolve => {
      const id = `${++seq}:${Math.random().toString(36).slice(2)}`;
      const timer = setTimeout(() => {
        pending.delete(id);
        console.warn('[Kamelo] Geen antwoord van de extensie; verzoek niet afgeschermd.');
        resolve(body);
      }, TIMEOUT_MS);
      pending.set(id, masked => { clearTimeout(timer); resolve(typeof masked === 'string' ? masked : body); });
      document.dispatchEvent(new CustomEvent('pf:mask', { detail: JSON.stringify({ id, body, host }) }));
    });
  }

  function aiHost(url) {
    try {
      const { hostname } = new URL(url, location.href);
      return C.isAiApiHost(hostname) ? hostname : null;
    } catch { return null; }
  }

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = input instanceof Request ? input.url : String(input);
    const host = aiHost(url);
    if (!host) return origFetch.apply(this, arguments);

    if (init && typeof init.body === 'string') {
      return origFetch.call(this, input, { ...init, body: await maskBody(init.body, host) });
    }
    if (input instanceof Request && input.body && !(init && 'body' in init)) {
      const masked = await maskBody(await input.clone().text(), host);
      return origFetch.call(this, new Request(input, { body: masked }), init);
    }
    return origFetch.apply(this, arguments);
  };

  // ---------- Klembord ----------
  // De kopieerknop van een AI-site schrijft de tekst met placeholders naar het klembord. We vragen het content
  // script (synchroon, via een event) om de echte waarden terug te zetten, zodat de klik als gebruikersactie geldt.
  const HAS_PLACEHOLDER = /\[[A-Z]+_\d+\]/;
  function restoreText(text) {
    if (typeof text !== 'string' || !HAS_PLACEHOLDER.test(text)) return text;
    const id = `${++seq}:${Math.random().toString(36).slice(2)}`;
    let out = text;
    const onReply = e => { try { const m = JSON.parse(e.detail); if (m.id === id) out = m.text; } catch {} };
    document.addEventListener('pf:restored', onReply);
    document.dispatchEvent(new CustomEvent('pf:restore', { detail: JSON.stringify({ id, text }) }));
    document.removeEventListener('pf:restored', onReply);
    return out;
  }
  // Kopiëren via een copy-event: sites (en bibliotheken als copy-to-clipboard) zetten de tekst zelf met setData en
  // houden het event vaak tegen, zodat de luisteraar van het content script het niet ziet. Daarom: tijdens een copy-
  // of cut-event zet setData de echte waarden terug, en een gewone selectie met placeholders vangen we vooraf op.
  let inCopy = false;
  const startCopy = e => {
    inCopy = true;
    setTimeout(() => { inCopy = false; });
    const sel = String(window.getSelection?.() || '');
    if (e.clipboardData && HAS_PLACEHOLDER.test(sel)) {
      const restored = restoreText(sel);
      if (restored !== sel) { e.clipboardData.setData('text/plain', restored); e.preventDefault(); }
    }
  };
  window.addEventListener('copy', startCopy, true);
  window.addEventListener('cut', e => { inCopy = true; setTimeout(() => { inCopy = false; }); }, true);
  const origSetData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (format, data) {
    if (inCopy && /^text\/(plain|html)$|^text$/i.test(format)) data = restoreText(data);
    return origSetData.call(this, format, data);
  };

  if (window.Clipboard) {
    const origWriteText = Clipboard.prototype.writeText;
    Clipboard.prototype.writeText = function (text) { return origWriteText.call(this, restoreText(text)); };
    const origWrite = Clipboard.prototype.write;
    Clipboard.prototype.write = async function (items) {
      try {
        items = await Promise.all([...items].map(async item => {
          const data = {};
          for (const type of item.types) {
            const blob = await item.getType(type);
            data[type] = type === 'text/plain' || type === 'text/html'
              ? new Blob([restoreText(await blob.text())], { type }) : blob;
          }
          return new ClipboardItem(data);
        }));
      } catch {} // lukt het niet, dan gaat de oorspronkelijke inhoud ongewijzigd naar het klembord
      return origWrite.call(this, items);
    };
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, async) {
    this.__pfHost = async === false ? null : aiHost(url); // synchrone verzoeken kunnen we niet uitstellen
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__pfHost || typeof body !== 'string') return origSend.apply(this, arguments);
    maskBody(body, this.__pfHost).then(masked => origSend.call(this, masked));
  };
})();
