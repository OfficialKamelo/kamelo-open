// Melo: "Lees deze pagina". De tekst van het tabblad waar je naar kijkt, gelezen op dit apparaat, alleen na een klik.
// Er gaat niets weg: de tekst gaat met je vraag naar de AI op deze computer (chat/chat.js), nooit naar een server.
//
// Rechten: alleen activeTab. Chrome geeft dat pas als je op het Kamelo-icoon klikt, en alleen voor dat ene tabblad tot je
// wegnavigeert. De gratis editie heeft verder geen toegang tot websites (alleen tot de AI-chatsites, voor de melding).
//
// De voorzichtige regel (ook in README.md, "Read this page"):
//   nooit         pagina's van de browser zelf (chrome://, edge://, about:, instellingen), extensiewinkels, file://
//   eerst vragen  mail en berichten (Gmail, Outlook, WhatsApp Web, …): daar staat wat anderen jou schreven;
//                 je bank of een betaaldienst (ook crypto); een pagina met een zichtbaar wachtwoordveld of kaartveld
//   altijd        wat je in velden typt (input, textarea, bewerkbare tekst) leest Melo nooit; verborgen tekst ook niet
//
//   classify(url)           → 'ok' | 'cant'
//   risk(url, probe)        → '' | 'mail' | 'bank' | 'card' | 'password'
//   wantsPage(vraag)        → true bij "wat staat hier?", "vat dit artikel samen", …
//   probe() / extract(max)  draaien ín de pagina (chrome.scripting.executeScript): daarom zonder iets van buiten
(function (root) {
  'use strict';

  // Zoveel tekst gaat mee met een vraag: de AI op dit apparaat kan maar een paar pagina's tegelijk aan (zoals bij bestanden).
  const MAX_CHARS = 6000;

  // Pagina's die Melo nooit leest. De browser laat een extensie er ook niet in; zo zegt Melo het netjes.
  const STORES = /^(chromewebstore\.google\.com|microsoftedge\.microsoft\.com|addons\.mozilla\.org)$/i;
  function classify(url) {
    let u;
    try { u = new URL(url); } catch { return 'cant'; }
    if (!/^https?:$/.test(u.protocol)) return 'cant';
    if (STORES.test(u.hostname) || (u.hostname === 'chrome.google.com' && u.pathname.startsWith('/webstore'))) return 'cant';
    return 'ok';
  }

  // Mail en berichten: wat daar staat, schreven anderen aan jou. Ook elk adres dat begint met mail., webmail. of email.
  const MAIL_HOSTS = [
    'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft',
    'mail.yahoo.com', 'mail.proton.me', 'mail.protonmail.com', 'app.tuta.com', 'mail.tutanota.com', 'mail.aol.com',
    'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch', 'gmx.com', 'web.de', 'posteo.de', 'mailbox.org', 'fastmail.com',
    'hey.com', 'kpnmail.nl',
    'web.whatsapp.com', 'messenger.com', 'web.telegram.org', 'app.slack.com', 'teams.microsoft.com', 'teams.live.com',
    'discord.com', 'messages.google.com', 'chat.google.com',
  ];
  // Berichten op een site die verder geen mail is: alleen dat deel van de site.
  const MAIL_PATHS = [
    ['icloud.com', /^\/mail/], ['linkedin.com', /^\/messaging/], ['facebook.com', /^\/messages/], ['instagram.com', /^\/direct/],
    ['x.com', /^\/(i\/chat|messages)/], ['twitter.com', /^\/messages/], ['mijn.overheid.nl', /^\/berichtenbox/],
  ];
  // Banken en betaaldiensten. Liever een keer te vaak vragen dan een keer te weinig: "bank" ergens in het adres telt al.
  const BANK = new RegExp([
    'bank', 'banque', 'banco', 'sparkasse', 'paypal', 'revolut', 'bunq', 'knab', 'triodos', 'klarna', 'tikkie', 'monzo', 'wise\\.com',
    'n26\\.com', 'coinbase', 'bitvavo', 'kraken\\.com', 'binance', 'credit-agricole', 'creditmutuel', 'boursorama', 'caixa',
    '(^|\\.)(ing|abnamro|asnbank|snsbank|kbc|belfius|argenta|hsbc|barclays|lloyds|natwest|santander|bbva|chase|wellsfargo|citi|amex|americanexpress|comdirect|dkb|bnpparibas|lcl|labanquepostale)\\.',
  ].join('|'), 'i');

  const onHost = (host, h) => host === h || host.endsWith(`.${h}`);
  function risk(url, probe = {}) {
    let u;
    try { u = new URL(url); } catch { return ''; }
    const host = u.hostname.toLowerCase();
    if (MAIL_HOSTS.some(h => onHost(host, h)) || /^(web|e)?mail\./.test(host) || MAIL_PATHS.some(([h, p]) => onHost(host, h) && p.test(u.pathname))) return 'mail';
    if (BANK.test(host)) return 'bank';
    if (probe.card) return 'card';
    if (probe.password) return 'password';
    return '';
  }

  // Een getypte vraag over de pagina zelf ("wat staat hier?", "vat dit artikel samen"), in de vijf talen van de interface.
  // Smal gehouden: alleen met "hier" of "deze/dit" + een woord voor pagina, artikel, brief, mail of bijsluiter.
  const THING = {
    nl: '(pagina|webpagina|site|website|artikel|brief|mail|e-mail|tekst|bijsluiter)',
    en: '(page|web ?page|site|website|article|letter|e-?mail|text|leaflet)',
    de: '(seite|webseite|artikel|brief|mail|e-mail|text|beipackzettel)',
    fr: '(page|site|article|lettre|mail|e-mail|courriel|texte|notice)',
    es: '(p[aá]gina|web|art[ií]culo|carta|correo|texto|prospecto)',
  };
  const WANTS_PAGE = new RegExp([
    `wat staat (er )?(hier|op deze ${THING.nl}|in (deze|dit) ${THING.nl})`, `waar gaat (deze|dit) ${THING.nl}`,
    `(vat|lees) (deze|dit) ${THING.nl}`, `(deze|dit) ${THING.nl} (samenvatten|uitleggen|lezen)`,
    `what('s| is) (written )?(here|on this ${THING.en}|in this ${THING.en})`, `what does this ${THING.en} say`,
    `(summari[sz]e|read|explain) this ${THING.en}`, `what is this ${THING.en} about`,
    `was steht (hier|auf dieser ${THING.de}|in diese[mr] ${THING.de})`, `worum geht es (hier|auf dieser ${THING.de}|in diese[mr] ${THING.de})`,
    `(fass|lies|erkl[aä]re?) (diese[nrs]?) ${THING.de}`,
    `qu.est-ce (qu.il y a|qu.on dit|qui est [ée]crit|qui est marqu[ée]) (ici|sur cette ${THING.fr}|dans (cette|cet|ce) ${THING.fr})`, `que dit (cette|cet|ce) ${THING.fr}`,
    `(r[ée]sume|lis|explique)z? (cette|cet|ce) ${THING.fr}`, `de quoi parle (cette|cet|ce) ${THING.fr}`,
    `qu[eé] (dice|pone) (aqu[ií]|en (esta|este) ${THING.es}|(esta|este) ${THING.es})`,
    `(resume|lee|explica)(me)? (esta|este) ${THING.es}`, `de qu[eé] (trata|va) (esta|este) ${THING.es}`,
  ].join('|'), 'i');
  const wantsPage = q => typeof q === 'string' && q.length <= 200 && WANTS_PAGE.test(q);

  // ---------- in de pagina (losse functies: chrome.scripting kopieert alleen de functie zelf) ----------

  // Alleen ja of nee: is er een zichtbaar wachtwoordveld of een veld voor een betaalkaart? Geen tekst, geen waarden.
  function probe() {
    const seen = el => !el.checkVisibility || el.checkVisibility({ visibilityProperty: true });
    const any = sel => [...document.querySelectorAll(sel)].some(seen);
    return {
      url: location.href,
      password: any('input[type="password"]'),
      card: any('input[autocomplete^="cc-"], input[autocomplete*=" cc-"]'),
    };
  }

  // De leesbare hoofdtekst: het artikel (of main), zonder menu's, reclame, knoppen, formulieren, scripts en verborgen tekst.
  // Wat je in velden typt, komt er nooit in. Hooguit `max` tekens; is er meer, dan het begin (cut: true).
  function extract(max) {
    const SKIP = 'script,style,noscript,template,svg,canvas,iframe,frame,object,embed,video,audio,img,picture,map,nav,aside,form,button,' +
      'input,textarea,select,option,label,dialog,menu,[hidden],[aria-hidden="true"],[inert],[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],' +
      '[role="navigation"],[role="banner"],[role="contentinfo"],[role="complementary"],[role="search"],[role="dialog"],[role="alertdialog"],' +
      '[role="menu"],[role="menubar"],[role="toolbar"],[role="tablist"]';
    // Reclame, cookiemeldingen, deelknoppen en dergelijke, herkend aan class of id. Alleen kleine blokken: een grote
    // wrapper met zo'n naam ("content has-ads") bevat vaak het artikel zelf.
    const JUNK = /(^|[\s_-])(ads?|advert\w*|adslot|sponsor\w*|promo\w*|cookies?|consent|gdpr|newsletter|subscribe|share|sharing|social|related|recommend\w*|comments?|popup|modal|paywall|breadcrumbs?|sidebar|skip-?links?|toc)($|[\s_-])/i;
    const BLOCK = /^(P|DIV|SECTION|ARTICLE|MAIN|LI|UL|OL|DL|DT|DD|H[1-6]|BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TR|FIGURE|FIGCAPTION|HEADER|FOOTER|ADDRESS|HR|BR|DETAILS|SUMMARY|CENTER)$/;
    const len = el => (el?.innerText || '').trim().length;
    const ok = el => !el.parentElement?.closest(SKIP);
    const biggest = sel => [...document.querySelectorAll(sel)].filter(ok).sort((a, b) => len(b) - len(a))[0];
    const article = biggest('article, [itemprop="articleBody"]'), main = biggest('main, [role="main"]');
    const top = len(article) >= 200 ? article : len(main) >= 200 ? main : document.body;
    if (!top) return { title: document.title || '', text: '', cut: false };
    // Zonder artikel of main: kop- en voetregels van de site horen er niet bij.
    const bare = top === document.body;
    const lines = [];
    let line = '', size = 0, full = false;
    const flush = () => {
      const t = line.replace(/[ \t ​]+/g, ' ').trim();
      if (t && t !== lines.at(-1)) { lines.push(t); size += t.length + 1; }
      line = '';
    };
    const walk = node => {
      if (full) return;
      if (node.nodeType === 3) { line += node.nodeValue.replace(/\s+/g, ' '); return; }
      if (node.nodeType !== 1) return;
      const el = node;
      if (el !== top && (el.matches(SKIP) || (bare && el.matches('header, footer')))) return;
      if (el !== top && JUNK.test(`${el.id} ${typeof el.className === 'string' ? el.className : ''}`) && len(el) < 600) return;
      // Ook doorzichtige tekst (opacity: 0) telt als verborgen: een pagina kan zo anders een opdracht voor Melo verstoppen.
      if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true })) return;
      const block = BLOCK.test(el.tagName);
      if (block) flush();
      if (/^H[1-6]$/.test(el.tagName)) line += '# ';
      else if (el.tagName === 'LI') line += '- ';
      for (const c of el.childNodes) walk(c);
      if (/^T[DH]$/.test(el.tagName)) line += ' | ';
      if (block) flush();
      if (size > max) full = true;
    };
    walk(top);
    flush();
    let text = lines.filter(l => !/^[#\-|\s]*$/.test(l)).map(l => l.replace(/\s*\|\s*$/, '')).join('\n');
    const cut = full || text.length > max;
    if (text.length > max) {
      // Tot de laatste hele alinea of zin.
      const s = text.slice(0, max);
      const at = Math.max(s.lastIndexOf('\n'), s.lastIndexOf('. '), s.lastIndexOf('? '), s.lastIndexOf('! '));
      text = (at > max * .6 ? s.slice(0, at + 1) : s).trim();
    }
    const h1 = top.querySelector('h1')?.innerText?.trim();
    return { title: (document.title || h1 || location.hostname).trim().slice(0, 140), text, cut };
  }

  const api = { MAX_CHARS, classify, risk, wantsPage, probe, extract };
  root.KameloPage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
