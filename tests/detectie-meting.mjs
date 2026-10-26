// Draai met: node tests/detectie-meting.mjs            (getallen; mislukt als een taal onder de grens zakt)
//            npm run meet:detectie                     (ook de missers en valse meldingen van de ontwikkelsets)
// Bij elke release (zit in npm test). Na een wijziging in de leerzinnen eerst: node tools/detectie-leer.mjs.
//
// Vaste meting van de onderwerpherkenning (KOERS prioriteit 2): hoe vaak geeft Kamelo terecht een melding bij een
// persoonlijke vraag, en hoe vaak onterecht bij een gewone vraag. Dezelfde functie als de content script
// (PrivacyTopics.sensitiveTopics: woordenlijst + gewogen lijst), zonder de AI-tweede kans: dit is de hele bescherming in
// Edge en Firefox. De kolom "alleen woordenlijst" laat zien wat de gewogen lijst toevoegt.
//
// Sets in tests/detectie/, per taal een of meer tekstbestanden (<taal>.txt of <taal>-<schrijver>.txt; regel =
// onderwerp|zin, #P persoonlijk, #G gewoon). Wat telt is of een set ooit als bron is gebruikt:
//  - leer/: ~15.000 zinnen van Sonnet en Haiku (19 okt), waaruit tools/detectie-leer.mjs de gewogen lijst leert. Niet in
//    deze meting: daarop meten zegt niets.
//  - ontwikkel/ (17 okt, vóór het lezen van de woordenlijst) en schrijver2/ (een tweede schrijver): bron voor woorden
//    én leerzinnen voor de gewogen lijst. Ze laten alleen zien dat er niets stuk is.
//  - apart/ en blind/ (17 okt, 20 + 20 per taal): nooit als bron gebruikt, ook niet voor de gewogen lijst. Wel gebruikt
//    om de grenzen van de gewogen lijst te kiezen (samen met vers/).
//  - vers/ (19 okt, Opus en Fable, 54 + 54 per taal per schrijver): andere modellen dan de leerzinnen, nooit als bron.
//    Wel gebruikt om de grenzen te kiezen en te zien waar het misging (daarna kwamen er leerzinnen bij).
//  - kort2/ (19 okt, Haiku, 60 + 70 per taal): korte berichten van 4–11 woorden, nooit als bron; wel gebruikt om de
//    grenzen te kiezen (vooral vanaf hoeveel woorden de gewogen lijst meekijkt).
//  - kort/: de korte zinnen uit tests/topics*.test.js, als leerzinnen (staat bij de bronnen, niet in deze meting).
//  - vers2/ en kort3/ (19 okt, Opus en Fable, zelfde opdracht als vers/ en kort2/): de eindtoetsen, voor lange en korte
//    berichten. Op 19 okt één keer gemeten; daarna (21 okt) gebruikt om bij te leren en de grootte van de lijst te kiezen,
//    dus nu validatie.
//  - vers3/ en kort4/ (21 okt, Opus en Fable, blind: de schrijvers zagen geen lijsten en geen andere sets): de eindtoetsen
//    van 21 okt, één keer gemeten nadat alles af was. Wie hierna nog iets afstelt, laat eerst nieuwe sets schrijven
//    (vers4/, kort5/) en meet daar opnieuw.
// Onderwerp X = zelfbeschadiging: bewust geen melding (src/topic-words.js, src/topic-model.js), telt niet mee.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sensitiveTopics } = require('../src/topics.js');

const LANGS = ['en', 'nl', 'de', 'fr', 'es'];
const DEV = ['ontwikkel', 'schrijver2']; // geleerd; --waarom toont hun missers
const TOPIC = { H: 'HEALTH', M: 'MENTAL', S: 'SEXUALITY', R: 'RELIGION', G: 'MONEY', L: 'LEGAL', O: 'OTHER', X: 'SELFHARM' };
// Groepen in de uitvoer, belangrijkste eerst. Per groep de ondergrens terecht en bovengrens onterecht per taal: iets onder
// (boven) de stand van 19 okt, zodat npm test een terugval ziet. Dit zijn vangnetten, niet het doel; het doel (≥99% terecht
// per taal op de eindtoetsen) staat onderaan de uitvoer. Gaat een getal omhoog, zet de grens dan mee.
// Stand 21 okt (100.000 kenmerken, ~28.000 leerzinnen), eindtoetsen één keer gemeten, terecht/onterecht per taal:
//   vers3 96–98 / 1–5 (alle 97 / 3)   kort4 93–99 / 4–6 (alle 95 / 5)
//   Alleen de woordenlijst (zoals v1.7.2): vers3 69 / 12, kort4 43 / 6.
// Stand 19 okt, terecht/onterecht in procenten, laagste en hoogste taal:
//   vers2 96–99 / 5–8   kort3 93–99 / 2–8   vers 99–100 / 3–4   kort2 95–100 / 0–11   apart+blind 98–100 / 0–3
// Stand van v1.7.1 (17 okt), alleen woordenlijst: apart en 80/0 nl 45/0 de 25/5 fr 10/5 es 30/5; blind en 80/5 nl 80/0
// de 25/0 fr 25/5 es 30/0.
const GOAL = 0.99;
const GROUPS = [
  { name: 'vers3', sets: ['vers3'], about: 'eindtoets 21 okt, berichten van een paar zinnen (Opus, Fable, blind)', min: 0.95, max: 0.06, goal: true },
  { name: 'kort4', sets: ['kort4'], about: 'eindtoets 21 okt, korte berichten van 3–11 woorden (Opus, Fable, blind)', min: 0.92, max: 0.07, goal: true },
  { name: 'vers2', sets: ['vers2'], about: 'validatie (eindtoets van 19 okt), berichten van een paar zinnen', min: 0.97, max: 0.04 },
  { name: 'kort3', sets: ['kort3'], about: 'validatie (eindtoets van 19 okt), korte berichten', min: 0.93, max: 0.04 },
  { name: 'vers', sets: ['vers'], about: 'validatie, berichten van een paar zinnen (Opus, Fable)', min: 0.98, max: 0.04 },
  { name: 'kort2', sets: ['kort2'], about: 'validatie, korte berichten (Haiku)', min: 0.96, max: 0.06 },
  { name: 'apart+blind', sets: ['apart', 'blind'], about: 'validatie, 17 okt', min: 0.97, max: 0.05 },
  { name: 'ontwikkel', sets: DEV, about: 'geleerd (laat alleen zien dat niets stuk is)', min: 0.99, max: 0.01 },
];

// Per set en taal: <taal>.txt, of meerdere schrijvers als <taal>-<schrijver>.txt (vers/en-opus.txt, vers/en-fable.txt).
function read(set, lang) {
  const files = readdirSync(new URL(`detectie/${set}/`, import.meta.url)).filter(f => f === `${lang}.txt` || f.startsWith(`${lang}-`)).sort();
  return files.flatMap(f => readFile(`${set}/${f}`));
}
function readFile(name) {
  const items = [];
  let kind = null;
  readFileSync(new URL(`detectie/${name}`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('# ')) return; // '# …' = opmerking
    if (line === '#P' || line === '#G') { kind = line === '#P' ? 'personal' : 'general'; return; }
    const [t, text] = line.split('|');
    if (!kind || !TOPIC[t] || !text) throw new Error(`detectie/${name}:${i + 1}: verwacht #P, #G of onderwerp|zin`);
    items.push({ where: `${name}:${i + 1}`, kind, topic: TOPIC[t], text, found: sensitiveTopics(text), words: sensitiveTopics(text, { model: false }) });
  });
  return items;
}

// De gewogen lijst moet uit de huidige leerzinnen komen.
{
  const { fingerprint } = await import('../tools/detectie-bron.mjs');
  const W = require('../src/topic-weights.js');
  if (W.source !== fingerprint()) {
    console.error('src/topic-weights.js hoort niet bij de huidige leerzinnen of tools/detectie-leer.mjs: draai node tools/detectie-leer.mjs');
    process.exit(1);
  }
}

const pct = (a, b) => `${b ? Math.round((100 * a) / b) : 0}%`;
const why = process.argv.includes('--waarom');
const fails = [];
const short = []; // onder het doel van ≥99%
const count = (items, key) => {
  const P = items.filter(r => r.kind === 'personal' && r.topic !== 'SELFHARM');
  const G = items.filter(r => r.kind === 'general');
  const O = G.filter(r => r.topic === 'OTHER');
  return {
    hit: P.filter(r => r[key].length).length, P: P.length, fp: G.filter(r => r[key].length).length, G: G.length,
    fpO: O.filter(r => r[key].length).length, O: O.length,
  };
};
const cell = (a, b) => `${pct(a, b)} (${a}/${b})`;

console.log('Onderwerpherkenning zonder AI-tweede kans (zo werkt het in Edge en Firefox, en in Chrome zonder model).');
console.log('terecht = persoonlijke vragen met een melding; onterecht = gewone vragen met een melding (waarvan alledaags).');
for (const g of GROUPS) {
  const sum = { found: {}, words: {} };
  console.log(`\n${g.name}: ${g.about}`);
  console.log('taal  terecht           onterecht        waarvan alledaags | alleen woordenlijst: terecht  onterecht');
  for (const lang of LANGS) {
    const items = g.sets.flatMap(set => read(set, lang));
    const c = count(items, 'found'), w = count(items, 'words');
    for (const [key, v] of [['found', c], ['words', w]]) for (const k in v) sum[key][k] = (sum[key][k] || 0) + v[k];
    console.log(`${lang}    ${cell(c.hit, c.P).padEnd(17)} ${cell(c.fp, c.G).padEnd(16)} ${cell(c.fpO, c.O).padEnd(17)} | ${pct(w.hit, w.P).padStart(28)}  ${pct(w.fp, w.G).padStart(9)}`);
    if (c.hit / c.P < g.min) fails.push(`${g.name} ${lang}: terecht ${pct(c.hit, c.P)} < ${Math.round(g.min * 100)}%`);
    if (g.goal && c.hit / c.P < GOAL) short.push(`${g.name} ${lang} ${pct(c.hit, c.P)}`);
    if (c.fp / c.G > g.max) fails.push(`${g.name} ${lang}: onterecht ${pct(c.fp, c.G)} > ${Math.round(g.max * 100)}%`);
  }
  const c = sum.found, w = sum.words;
  console.log(`alle  ${cell(c.hit, c.P).padEnd(17)} ${cell(c.fp, c.G).padEnd(16)} ${cell(c.fpO, c.O).padEnd(17)} | ${pct(w.hit, w.P).padStart(28)}  ${pct(w.fp, w.G).padStart(9)}`);
}

console.log(short.length
  ? `\nDoel ≥${GOAL * 100}% terecht per taal op de eindtoetsen: nog niet gehaald (${short.join(', ')}).`
  : `\nDoel ≥${GOAL * 100}% terecht per taal op de eindtoetsen: gehaald.`);

if (why) {
  const dev = DEV.flatMap(s => LANGS.flatMap(l => read(s, l)));
  console.log('\nGemist (ontwikkelsets):');
  dev.filter(r => r.kind === 'personal' && r.topic !== 'SELFHARM' && !r.found.length).forEach(r => console.log(`  ${r.where} ${r.topic} | ${r.text}`));
  console.log('Onterecht (ontwikkelsets):');
  dev.filter(r => r.kind === 'general' && r.found.length).forEach(r => console.log(`  ${r.where} → ${r.found.join(',')} | ${r.text}`));
  console.log('Zelfbeschadiging toch gemeld:');
  dev.filter(r => r.topic === 'SELFHARM' && r.found.length).forEach(r => console.log(`  ${r.where} → ${r.found.join(',')} | ${r.text}`));
}

if (fails.length) {
  console.error(`\nBuiten de grens:\n  ${fails.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAlles binnen de grenzen.');
