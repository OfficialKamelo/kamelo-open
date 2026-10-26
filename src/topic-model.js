// Gevoelige onderwerpen, tweede lijst: gewogen woorden en woorddelen (Engels, Nederlands, Duits, Frans, Spaans).
// De woordenlijst (topic-words.js) kent precieze woorden en woordgroepen; mensen schrijven hun vraag op duizend manieren
// ("sinds mijn man ons spaargeld aan de gokkast heeft verloren slaap ik niet meer"). Deze lijst kent per woord, woordpaar en
// woorddeel (4–5 letters, zodat ook vervoegingen en samenstellingen meetellen) een gewicht per onderwerp, geleerd uit
// duizenden voorbeeldzinnen (tests/detectie/leer/, tools/detectie-leer.mjs). Twee uitkomsten per tekst:
//  - welk onderwerp (gezondheid, mentaal, seksualiteit, geloof, geld, justitie, zelfbeschadiging of geen);
//  - persoonlijk: gaat het over de schrijver of iemand om hem heen, of is het een algemene vraag, huiswerk of verhaal.
// Hoe die samen met de woordenlijst beslissen: sensitiveTopics in topics.js. Zelfbeschadiging geeft bewust geen melding
// (zoals topic-words.js).
//
// Gewoon rekenen in JavaScript: geen AI, geen download, niets verstuurd. Werkt dus ook in Edge en Firefox.
// De gewichten staan in topic-weights.js (gemaakt door tools/detectie-leer.mjs, niet met de hand aanpassen).
(function (root) {
  'use strict';

  const CLASSES = ['NONE', 'HEALTH', 'MENTAL', 'SEXUALITY', 'RELIGION', 'MONEY', 'LEGAL', 'SELFHARM'];
  const MAX_CHARS = 800;

  // Kleine letters, zonder accenten (veel mensen typen ze niet), ß = ss, cijfers als 0.
  const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[’`´]/g, "'").replace(/ß/g, 'ss').replace(/\d/g, '0');

  // Woorden; met een apostrof ook de delen (j'ai → jai, j, ai; l'hopital → lhopital, l, hopital).
  function tokens(text) {
    const out = [];
    for (const t of fold(text).match(/[\p{L}\p{N}']+/gu) || []) {
      const parts = t.split("'").filter(Boolean);
      if (!parts.length) continue;
      out.push(parts.join(''));
      if (parts.length > 1) out.push(...parts);
    }
    return out;
  }

  // Kenmerken van een tekst: woorden (w), woordparen (b) en woorddelen van 4 en 5 letters met < en > aan de randen (c).
  function features(text) {
    const toks = tokens(String(text).slice(-MAX_CHARS));
    const f = new Set();
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      f.add('w' + t);
      if (i + 1 < toks.length) f.add('b' + t + ' ' + toks[i + 1]);
      if (t.length >= 3) {
        const p = '<' + t + '>';
        for (const n of [4, 5]) for (let j = 0; j + n <= p.length; j++) f.add('c' + p.slice(j, j + n));
      }
    }
    return [...f];
  }

  // Gewichten uitpakken: per kenmerk CLASSES.length + 1 getallen (onderwerpen, dan persoonlijk), als bytes met een schaal.
  let model = null;
  function load() {
    if (model !== null) return model;
    const W = root.PrivacyTopicWeights || (typeof require === 'function' ? (() => { try { return require('./topic-weights.js'); } catch { return null; } })() : null);
    // Niet onthouden: in Kamelo Business komen de gewichten als apart script (alleen bovenste frame, tools/pack.mjs), mogelijk
    // net ná dit script. In een iframe blijven ze weg en geldt de woordenlijst.
    if (!W) return false;
    const K = CLASSES.length + 1;
    const bin = typeof atob === 'function' ? atob(W.weights) : Buffer.from(W.weights, 'base64').toString('binary');
    const bytes = new Int8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const index = new Map();
    W.features.split('\n').forEach((name, i) => index.set(name, i * K));
    model = { K, bytes, index, normMin: W.normMin || 1, scale: W.scale, bias: W.bias, minTopic: W.minTopic, minPersonal: W.minPersonal, minKeep: W.minKeep, maxNone: W.maxNone, everyday: W.everyday, minWords: W.minWords };
    return model;
  }

  // Kansen voor een tekst: { topic: 'HEALTH' | … | 'NONE', p: kans op dat onderwerp, personal: kans op persoonlijk }.
  function score(text) {
    const m = load();
    if (!m) return null;
    const f = features(text);
    // Elk kenmerk telt 1/√n, met n minstens normMin: een korte tekst levert zo ook weinig bewijs, in plaats van dat elk
    // woord extra zwaar gaat wegen ("i feel great today" is geen geloofsvraag).
    const x = 1 / Math.sqrt(Math.max(m.normMin, f.length));
    const z = m.bias.slice();
    for (const name of f) {
      const at = m.index.get(name);
      if (at === undefined) continue;
      for (let k = 0; k < m.K; k++) z[k] += m.bytes[at + k] * m.scale * x;
    }
    const n = CLASSES.length;
    const top = Math.max(...z.slice(0, n));
    const e = z.slice(0, n).map(v => Math.exp(v - top));
    const sum = e.reduce((a, b) => a + b, 0);
    const best = e.indexOf(Math.max(...e));
    return { topic: CLASSES[best], p: e[best] / sum, personal: 1 / (1 + Math.exp(-z[n])), probs: e.map(v => v / sum) };
  }

  // Oordeel over een alinea: { topic, p, none, sensitive, personal, selfharm } met topic = het beste gevoelige onderwerp
  // (niet geen, niet zelfbeschadiging), p = de kans daarop, sensitive = de kans op een van de zes samen, personal = de kans dat het over de schrijver of iemand om hem heen gaat (als het
  // over een gevoelig onderwerp gaat), none = de kans op geen gevoelig onderwerp, selfharm = zelfbeschadiging is het
  // waarschijnlijkst. Plus de grenzen (limits).
  function judge(text) {
    const s = score(text);
    if (!s) return null;
    let k = 1;
    for (let i = 2; i <= 6; i++) if (s.probs[i] > s.probs[k]) k = i;
    return { topic: CLASSES[k], p: s.probs[k], none: s.probs[0], sensitive: 1 - s.probs[0] - s.probs[7], personal: s.personal, selfharm: s.topic === 'SELFHARM' };
  }
  const limits = () => { const m = load(); return m ? { topic: m.minTopic, personal: m.minPersonal, keep: m.minKeep, none: m.maxNone, everyday: m.everyday, words: m.minWords } : null; };

  const api = { features, score, judge, limits, CLASSES, ready: () => !!load() };
  root.PrivacyTopicModel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
