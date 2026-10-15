// Gevoelige onderwerpen herkennen: gezondheid, mentale gezondheid, seksualiteit, geloof, geldzorgen en justitie.
// Dat zijn grotendeels "bijzondere persoonsgegevens" in de AVG. Ze zijn niet te vervangen door een placeholder,
// dus Kamelo waarschuwt alleen, één keer per onderwerp per pagina.
//
// Alleen als het over de gebruiker of iemand om hem heen gaat ("ik heb", "mijn dochter", "my doctor"), in dezelfde zin.
// Een algemene vraag als "Wat zijn de symptomen van diabetes?" geeft dus geen melding. Uitzonderingen:
//  - een woordgroep met ! zegt het zelf al ("behind on rent", "de politie heeft me verhoord"): geen ik/mijn nodig;
//  - een NOT-woord in de zin (huiswerk, roman, personage, pain point) betekent: het gaat niet over de schrijver.
//
// Werkt in 82 talen (woordenlijsten in topic-words.js). Per zin eerst een lichte taalherkenning op veelgebruikte woorden,
// zodat een kort woord als "min" (Zweeds: mijn) of "ma" (Ests: ik) niet meetelt in een Engelse of Italiaanse zin.
//
// Snel genoeg voor tijdens het typen: een zin wordt één keer in woorden gesplitst en die worden opgezocht in één index
// voor alle talen (woorden, woordbegin bij woord*, woordeinde bij *woord, en woordgroepen). Alleen talen zonder spaties (Chinees, Thai, …)
// gebruiken een gewone zoekopdracht. Zinnen die al gecontroleerd zijn, worden onthouden.
// Draait volledig lokaal: in de browser (content script) en in Node (tests).
(function (root) {
  'use strict';

  const W = root.PrivacyTopicWords || (typeof require === 'function' ? require('./topic-words.js') : null);
  const TOPICS = ['HEALTH', 'MENTAL', 'SEXUALITY', 'RELIGION', 'MONEY', 'LEGAL'];
  const KINDS = ['words', 'self', 'NOT', ...TOPICS];
  const MAX_LENGTH = 20000; // bij heel lange teksten alleen het begin
  const TOKEN = /[\p{L}\p{M}\p{N}'’-]+/gu;
  const norm = s => s.normalize('NFC').toLowerCase().replace(/’/g, "'");

  // ---------- Index opbouwen ----------
  // exact: "woord" of "woord woord" → [[taal, soort], …]; prefix: idem voor woordbegin (term met * of eindigend op ');
  // suffix: woordeinde (term die met * begint), voor samenstellingen als keelpijn, blaasontsteking, gokverslaafd.
  const exact = new Map(), prefix = new Map(), suffix = new Map();
  const dense = []; // [{ code, words: RegExp(g), self: RegExp, topics: [[soort, RegExp]] }]
  const loose = new Set(W?.LOOSE || []);
  let maxWords = 1, minPrefix = Infinity, minSuffix = Infinity, maxPrefix = 0, maxSuffix = 0;
  const add = (map, key, entry) => (map.get(key) || map.set(key, []).get(key)).push(entry);
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const [code, lang] of Object.entries(W?.LANGS || {})) {
    const terms = kind => (kind === 'words' ? `${lang.words} ${lang.self}` : lang[kind] || '').trim().split(/\s+/).filter(Boolean);
    if (W.DENSE.includes(code)) {
      const re = (kind, flags = 'u') => new RegExp(terms(kind).map(t => escape(norm(t.replace(/^!?\*?|\*$/g, '')))).join('|'), flags);
      dense.push({ code, words: re('words', 'gu'), self: re('self'), topics: TOPICS.filter(k => lang[k]).map(k => [k, re(k)]) });
      continue;
    }
    for (const kind of KINDS) {
      for (let term of terms(kind)) {
        // !woordgroep: zegt op zichzelf al dat het over de schrijver gaat ("behind on rent"), ook zonder ik/mijn.
        const alone = term.startsWith('!');
        if (alone) term = term.slice(1);
        const open = term.endsWith('*') || /['’]$/.test(term);
        const end = term.startsWith('*');
        const key = norm(term.replace(/^\*|\*$/g, '')).replace(/_/g, ' ');
        maxWords = Math.max(maxWords, key.split(' ').length);
        if (open) { minPrefix = Math.min(minPrefix, key.length); maxPrefix = Math.max(maxPrefix, key.length); }
        if (end) { minSuffix = Math.min(minSuffix, key.length); maxSuffix = Math.max(maxSuffix, key.length); }
        const entry = [code, kind, alone];
        if (end) { add(suffix, key, entry); continue; }
        add(open ? prefix : exact, key, entry);
        // Woordgroepen ook zonder apostrof, zoals op een telefoon getypt: can't_pay → cant pay.
        if (key.includes(' ') && key.includes("'")) add(open ? prefix : exact, key.replace(/'/g, ''), entry);
      }
    }
  }

  // ---------- Zoeken ----------

  // Alle sleutels van een zin: woorden en woordgroepen (tot maxWords woorden). Bij Arabisch en Hebreeuws ook zonder
  // vastgeschreven voorvoegsels (و، ب، ال، ה، ב, …): die sleutels tellen alleen voor die talen.
  function* keys(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      for (let n = 1; n <= maxWords && i + n <= tokens.length; n++) {
        const key = tokens.slice(i, i + n).join(' ');
        yield [key, false];
        if (n === 1) for (let cut = 1; cut <= 4 && key.length - cut >= 3; cut++) yield [key.slice(cut), true];
      }
    }
  }

  // Per taal: hoeveel veelgebruikte woorden, of er een "ik/mijn" in staat, en welke onderwerpen.
  function hitsIn(sentence) {
    const hits = new Map();
    const hit = code => hits.get(code)
      || hits.set(code, { score: 0, self: false, not: false, topics: new Set(), alone: new Set() }).get(code);
    const record = (entries, stripped) => {
      for (const [code, kind, alone] of entries || []) {
        if (stripped && !loose.has(code)) continue;
        const h = hit(code);
        if (kind === 'words') h.score++;
        else if (kind === 'self') h.self = true;
        else if (kind === 'NOT') h.not = true;
        else (alone ? h.alone : h.topics).add(kind);
      }
    };
    const lower = norm(sentence);
    for (const [key, stripped] of keys(lower.match(TOKEN) || [])) {
      record(exact.get(key), stripped);
      // Alleen woordbegin en -einde zo lang als de langste term: een heel lang 'woord' (40.000 letters zonder spatie)
      // kost zo per positie een vaste hoeveelheid werk in plaats van zijn hele lengte.
      for (let len = Math.min(key.length, maxPrefix); len >= minPrefix; len--) record(prefix.get(key.slice(0, len)), stripped);
      if (!stripped && !key.includes(' ')) {
        for (let cut = Math.max(1, key.length - maxSuffix); key.length - cut >= minSuffix; cut++) record(suffix.get(key.slice(cut)), false);
      }
    }
    for (const d of dense) {
      const score = (lower.match(d.words) || []).length;
      if (!score) continue;
      const h = hit(d.code);
      h.score += score;
      h.self = d.self.test(lower);
      for (const [k, re] of d.topics) if (re.test(lower)) h.topics.add(k);
    }
    return hits;
  }

  // De talen die het best bij de zin passen: de meeste treffers, of minstens de helft daarvan (en dan minstens twee).
  // Een woordgroep met ! telt altijd (die is lang genoeg om bij één taal te horen). Staat er een NOT-woord in de zin
  // (huiswerk, roman, personage, pain point), dan telt die taal niet: het gaat dan niet over de schrijver zelf.
  function topicsIn(sentence) {
    const hits = [...hitsIn(sentence).values()];
    const best = Math.max(0, ...hits.map(h => h.score));
    const found = new Set();
    for (const h of hits) {
      if (h.not) continue;
      h.alone.forEach(k => found.add(k));
      if (!best || !h.self || !(h.score === best || (h.score >= 2 && h.score >= best / 2))) continue;
      h.topics.forEach(k => found.add(k));
    }
    return [...found];
  }

  // Tijdens het typen wordt dezelfde tekst steeds opnieuw gecontroleerd: zinnen die al gecontroleerd zijn, onthouden we.
  const seen = new Map();
  function cachedTopicsIn(sentence) {
    let result = seen.get(sentence);
    if (!result) {
      result = topicsIn(sentence);
      if (seen.size > 2000) seen.clear();
      seen.set(sentence, result);
    }
    return result;
  }

  // Geeft de gevonden onderwerpen terug, in vaste volgorde: ['HEALTH', 'MENTAL', …].
  function sensitiveTopics(text) {
    if (!text) return [];
    const found = new Set();
    for (const s of text.slice(0, MAX_LENGTH).split(/[.!?;\n。！？；।॥።။؟]+/)) {
      if (!s.trim()) continue;
      for (const k of cachedTopicsIn(s.trim())) found.add(k);
      if (found.size === TOPICS.length) break;
    }
    return TOPICS.filter(k => found.has(k));
  }

  const api = { sensitiveTopics, TOPICS, LANGUAGES: Object.keys(W?.LANGS || {}) };
  root.PrivacyTopics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
