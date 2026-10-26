// Leert de gewogen woordenlijst van src/topic-model.js en schrijft src/topic-weights.js.
//
//   node tools/detectie-leer.mjs            leren en schrijven (daarna: npm run meet:detectie)
//   node tools/detectie-leer.mjs --proef    alleen leren, niets schrijven
//
// Bron (tools/detectie-bron.mjs): tests/detectie/leer/ (~15.000 zinnen van Sonnet en Haiku, 19 okt: persoonlijk,
// algemeen over een gevoelig onderwerp, alledaags, moeilijke en dubbelzinnige gevallen, dekking, korte zinnen), de
// ontwikkelsets ontwikkel/ en schrijver2/, en kort/ (de korte zinnen uit de corpustests). Nooit apart/, blind/, vers/ of
// vers2/: daarop meten we (tests/detectie-meting.mjs).
//
// Het model: per kenmerk (woord, woordpaar, woorddeel; zie features() in topic-model.js) acht gewichten voor de
// onderwerpen (geen, gezondheid, …, zelfbeschadiging) en één voor "persoonlijk". Logistische regressie met AdaGrad,
// daarna alleen de sterkste kenmerken bewaren en de gewichten als bytes. Altijd hetzelfde resultaat: vaste volgorde, vaste
// startwaarde.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { SOURCES, fingerprint } from './detectie-bron.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { features, CLASSES } = require('../src/topic-model.js');
const ROOT = new URL('../', import.meta.url);
const LETTER = { O: 'NONE', H: 'HEALTH', M: 'MENTAL', S: 'SEXUALITY', R: 'RELIGION', G: 'MONEY', L: 'LEGAL', X: 'SELFHARM' };

const EPOCHS = +(process.env.EPOCHS || 30);
const LR = +(process.env.LR || 0.5);
const L2 = +(process.env.L2 || 2e-5);
const MIN_DF = +(process.env.MIN_DF || 2);          // een kenmerk moet in minstens zoveel zinnen staan
const NORM_MIN = +(process.env.NORM_MIN || 1);     // zie score() in topic-model.js
const NONE_WEIGHT = +(process.env.NONE_WEIGHT || 1); // alledaagse zinnen samen zo zwaar als de gevoelige (1 = even zwaar)
const KEEP = +(process.env.KEEP || 100000);       // zoveel kenmerken bewaren (de sterkste)
// Grenzen voor een melding (zie sensitiveTopics in topics.js). Gekozen op 19 okt op apart/, blind/ en vers/ (en de korte
// corpuszinnen, toen nog niet geleerd): zoveel mogelijk terecht, daarna zo weinig mogelijk onterecht. vers2/ niet gebruikt.
const MIN_TOPIC = 0.3;    // kans op een van de zes onderwerpen samen, voor het onderwerp van het model
const MIN_PERSONAL = 0.7; // kans op persoonlijk, om onderwerpwoorden zonder ik/mijn of het onderwerp van het model te laten tellen
const MAX_NONE = 0.7;     // onderwerpwoorden zonder ik/mijn en het onderwerp van het model tellen alleen onder deze kans op 'geen onderwerp'
const EVERYDAY = 0.9;     // zo zeker 'geen onderwerp': dan telt ook de woordenlijst niet
const MIN_WORDS = 4;      // kortere alinea's: alleen de woordenlijst
const MIN_KEEP = 0.2;     // daaronder telt ook de woordenlijst niet (duidelijk algemeen)

export function readSet(file) {
  const items = [];
  let kind = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('# ')) continue;
    if (s === '#P' || s === '#G') { kind = s === '#P' ? 'personal' : 'general'; continue; }
    const at = s.indexOf('|');
    const letter = s.slice(0, at).trim();
    const text = s.slice(at + 1).trim();
    if (!kind || at < 1 || !LETTER[letter] || !text) continue;
    if (kind === 'personal' && letter === 'O') continue;
    items.push({ kind, topic: LETTER[letter], text });
  }
  return items;
}

const files = SOURCES.flatMap(dir => readdirSync(new URL(`tests/detectie/${dir}/`, ROOT)).filter(f => f.endsWith('.txt')).sort()
  .map(f => new URL(`tests/detectie/${dir}/${f}`, ROOT)));
const data = files.flatMap(f => readSet(f));


// Woordenboek: kenmerken die vaak genoeg voorkomen.
const df = new Map();
const feats = data.map(d => features(d.text));
for (const fs of feats) for (const f of fs) df.set(f, (df.get(f) || 0) + 1);
const K = CLASSES.length + 1;

// Logistische regressie met AdaGrad op een gegeven woordenboek. Geeft de gewichten (per kenmerk K getallen) en de bias.
function train(vocab) {
  const id = new Map(vocab.map((f, i) => [f, i]));
  const examples = data.map((d, i) => ({
    idx: Int32Array.from(feats[i].map(f => id.get(f)).filter(v => v !== undefined)),
    x: 1 / Math.sqrt(Math.max(NORM_MIN, feats[i].length)),
    y: CLASSES.indexOf(d.topic),
    p: d.kind === 'personal' ? 1 : 0,
  }));
  // Er zijn veel meer zinnen over gevoelige onderwerpen dan alledaagse; zonder tegenwicht leert het model dat bijna
  // alles gevoelig is ("mijn fiets heeft een lekke band"). Daarom wegen alledaagse zinnen samen even zwaar (maal NONE_WEIGHT).
  const none = examples.filter(e => e.y === 0).length;
  const wNone = NONE_WEIGHT * (examples.length - none) / none;
  const W = new Float32Array(vocab.length * K), G = new Float32Array(vocab.length * K).fill(1e-6);
  const bias = new Float64Array(K), GB = new Float64Array(K).fill(1e-6);
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const order = examples.map((_, i) => i);
  const z = new Float64Array(K), g = new Float64Array(K);
  const nC = K - 1;
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const n of order) {
      const ex = examples[n];
      z.set(bias);
      for (const f of ex.idx) for (let k = 0; k < K; k++) z[k] += W[f * K + k] * ex.x;
      let top = -Infinity;
      for (let k = 0; k < nC; k++) top = Math.max(top, z[k]);
      let sum = 0;
      for (let k = 0; k < nC; k++) sum += (g[k] = Math.exp(z[k] - top));
      const w = ex.y === 0 ? wNone : 1;
      for (let k = 0; k < nC; k++) g[k] = w * (g[k] / sum - (k === ex.y ? 1 : 0));
      // "Persoonlijk" leert alleen van zinnen over een gevoelig onderwerp: gaat het over de schrijver, of is het een les,
      // folder of verhaal? Alledaagse zinnen ("mijn vader zoekt een fiets") zouden anders leren dat "mijn vader" algemeen is.
      g[nC] = ex.y === 0 ? 0 : 1 / (1 + Math.exp(-z[nC])) - ex.p;
      for (let k = 0; k < K; k++) { GB[k] += g[k] * g[k]; bias[k] -= LR * g[k] / Math.sqrt(GB[k]); }
      for (const f of ex.idx) {
        for (let k = 0; k < K; k++) {
          const a = f * K + k;
          const grad = g[k] * ex.x + L2 * W[a];
          G[a] += grad * grad;
          W[a] -= LR * grad / Math.sqrt(G[a]);
        }
      }
    }
  }
  return { W, bias };
}
const strength = (W, f) => { let m = 0; for (let k = 0; k < K; k++) m = Math.max(m, Math.abs(W[f * K + k])); return m; };

// Eerst alles leren, dan alleen de KEEP sterkste kenmerken bewaren en daarmee opnieuw leren (kleiner bestand).
const all = [...df].filter(([, n]) => n >= MIN_DF).map(([f]) => f).sort();
const first = train(all);
const vocab = all.map((f, i) => [f, strength(first.W, i)]).sort((a, b) => b[1] - a[1]).slice(0, KEEP).map(([f]) => f).sort();
const { W, bias } = train(vocab);

// Als bytes: een schaal zo dat 99,9% van de gewichten precies past (de grootste worden afgekapt).
const mags = Float32Array.from(W, Math.abs).sort();
const scale = mags[Math.floor(mags.length * 0.999)] / 127;
const bytes = Int8Array.from(W, v => Math.max(-127, Math.min(127, Math.round(v / scale))));
const weights = {
  version: 1,
  source: fingerprint(),
  normMin: NORM_MIN,
  features: vocab.join('\n'),
  weights: Buffer.from(bytes.buffer).toString('base64'),
  scale: +scale.toPrecision(6),
  bias: [...bias].map(v => +v.toFixed(4)),
  minTopic: MIN_TOPIC,
  minPersonal: MIN_PERSONAL,
  minKeep: MIN_KEEP,
  maxNone: MAX_NONE,
  minWords: MIN_WORDS,
  everyday: EVERYDAY,
};
const js = `// Gemaakt door tools/detectie-leer.mjs uit ${data.length} voorbeeldzinnen (${SOURCES.map(s => `tests/detectie/${s}/`).join(', ')}).
// Niet met de hand aanpassen: verander de zinnen of het script en draai het opnieuw. Uitleg: src/topic-model.js.
(function (root) {
  const W = ${JSON.stringify(weights)};
  root.PrivacyTopicWeights = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
console.log(`${data.length} zinnen uit ${files.length} bestanden, ${all.length} kenmerken, ${vocab.length} bewaard, ${(js.length / 1024).toFixed(0)} KB`);
if (!process.argv.includes('--proef')) {
  writeFileSync(new URL('src/topic-weights.js', ROOT), js);
  console.log('src/topic-weights.js geschreven');
}
