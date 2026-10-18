// Draai met: node tests/detectie-meting.mjs            (getallen; mislukt als een taal onder de grens zakt)
//            npm run meet:detectie                     (ook de missers en valse meldingen van de ontwikkelsets)
//
// Vaste meting van de onderwerpherkenning (KOERS prioriteit 2): hoe vaak geeft de woordenlijst terecht een melding bij
// een persoonlijke vraag, en hoe vaak onterecht bij een gewone vraag. Dezelfde functie als de content script
// (PrivacyTopics.sensitiveTopics), zonder de AI-tweede kans: dit is de hele bescherming in Edge en Firefox.
//
// Vier sets, per taal een tekstbestand in tests/detectie/ (regel = onderwerp|zin; #P persoonlijk, #G gewoon):
//  - ontwikkel/: 17 okt geschreven vóór het lezen van de woordenlijst (42 + 42 per taal, plus 12 lastige gewone
//    zinnen per taal). Missers hieruit mogen woorden opleveren, dus deze set gaat vanzelf op de lijst lijken.
//  - apart/: houd-apart-set (20 + 20 per taal, zelfde schrijver als ontwikkel/), geschreven vóór de woorden van 17 okt.
//    Gebruik hem nooit als bron voor woorden: alleen dan zegt hij iets over zinnen die we nog niet kennen. Daarom toont
//    --waarom hem niet.
//  - schrijver2/: 20 + 20 per taal van een tweede schrijver (een apart AI-model dat de woordenlijst en de andere sets
//    niet zag). Eerst blind gemeten, daarna als bron gebruikt (vooral voor lastige gewone zinnen).
//  - blind/: 20 + 20 per taal van een derde schrijver (weer een apart model, zelfde opdracht), pas gemeten na alle
//    woorden van 17 okt. Zelfde regel als apart/: nooit als bron, en ook niet in --waarom.
// Nieuwe zinnen erbij liefst van weer een andere schrijver; na een ronde woorden uit missers een nieuwe set apart zetten.
// Onderwerp X = zelfbeschadiging: bewust geen melding (src/topic-words.js), telt niet mee.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sensitiveTopics } = require('../src/topics.js');

const LANGS = ['en', 'nl', 'de', 'fr', 'es'];
const SETS = ['ontwikkel', 'schrijver2', 'apart', 'blind'];
const DEV = ['ontwikkel', 'schrijver2']; // mogen woorden opleveren; de rest niet
const TOPIC = { H: 'HEALTH', M: 'MENTAL', S: 'SEXUALITY', R: 'RELIGION', G: 'MONEY', L: 'LEGAL', O: 'OTHER', X: 'SELFHARM' };
// Ondergrens terecht gemeld per set en taal (iets onder de stand van 17 okt, na de nieuwe woorden), en bovengrens
// onterecht per taal over alle sets samen. Gaat een getal omhoog, zet de grens dan mee omhoog.
// Stand van v1.7.1 (17 okt, vóór de nieuwe woorden), terecht/onterecht in procenten:
//   apart  en 80/0  nl 45/0  de 25/5  fr 10/5  es 30/5
//   blind  en 80/5  nl 80/0  de 25/0  fr 25/5  es 30/0
const MIN_TERECHT = {
  ontwikkel: { en: 0.95, nl: 0.95, de: 0.95, fr: 0.9, es: 0.9 },
  schrijver2: { en: 0.9, nl: 0.9, de: 0.9, fr: 0.9, es: 0.9 },
  apart: { en: 0.8, nl: 0.75, de: 0.9, fr: 0.85, es: 0.9 },
  blind: { en: 0.8, nl: 0.85, de: 0.9, fr: 0.7, es: 0.85 },
};
const MAX_ONTERECHT = 0.03;

function read(set, lang) {
  const items = [];
  let kind = null;
  readFileSync(new URL(`detectie/${set}/${lang}.txt`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('# ')) return; // '# …' = opmerking
    if (line === '#P' || line === '#G') { kind = line === '#P' ? 'personal' : 'general'; return; }
    const [t, text] = line.split('|');
    if (!kind || !TOPIC[t] || !text) throw new Error(`detectie/${set}/${lang}.txt:${i + 1}: verwacht #P, #G of onderwerp|zin`);
    items.push({ where: `${set}/${lang}.txt:${i + 1}`, kind, topic: TOPIC[t], text, found: sensitiveTopics(text) });
  });
  return items;
}

const pct = (a, b) => `${Math.round((100 * a) / b)}%`.padStart(4);
const why = process.argv.includes('--waarom');
const fails = [];
const all = {};
for (const set of SETS) for (const lang of LANGS) all[`${set}/${lang}`] = read(set, lang);

console.log('Onderwerpherkenning (woordenlijst, zonder AI-tweede kans)\n');
console.log('taal | ' + SETS.map(s => `${s}: terecht`.padEnd(22) + 'onterecht'.padEnd(13)).join('| '));
for (const lang of LANGS) {
  const cells = [];
  let gen = 0, wrong = 0;
  for (const set of SETS) {
    const items = all[`${set}/${lang}`];
    const P = items.filter(r => r.kind === 'personal' && r.topic !== 'SELFHARM');
    const G = items.filter(r => r.kind === 'general');
    const hit = P.filter(r => r.found.length).length, fp = G.filter(r => r.found.length).length;
    gen += G.length; wrong += fp;
    cells.push(`${pct(hit, P.length)} (${hit}/${P.length})`.padStart(22) + `${pct(fp, G.length)} (${fp}/${G.length})`.padStart(13));
    if (hit / P.length < MIN_TERECHT[set][lang]) fails.push(`${set} ${lang}: terecht ${pct(hit, P.length).trim()} < ${Math.round(MIN_TERECHT[set][lang] * 100)}%`);
  }
  if (wrong / gen > MAX_ONTERECHT) fails.push(`${lang}: onterecht ${wrong}/${gen} > ${MAX_ONTERECHT * 100}%`);
  console.log(`${lang}   |${cells.join(' |')}`);
}

if (why) {
  const dev = DEV.flatMap(s => LANGS.flatMap(l => all[`${s}/${l}`]));
  console.log('\nGemist (ontwikkelsets):');
  dev.filter(r => r.kind === 'personal' && r.topic !== 'SELFHARM' && !r.found.length).forEach(r => console.log(`  ${r.where} ${r.topic} | ${r.text}`));
  console.log('Onterecht (ontwikkelsets):');
  dev.filter(r => r.kind === 'general' && r.found.length).forEach(r => console.log(`  ${r.where} → ${r.found.join(',')} | ${r.text}`));
  console.log('Zelfbeschadiging toch gemeld:');
  dev.filter(r => r.topic === 'SELFHARM' && r.found.length).forEach(r => console.log(`  ${r.where} → ${r.found.join(',')} | ${r.text}`));
}

if (fails.length) {
  console.error(`\nOnder de grens:\n  ${fails.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAlles binnen de grenzen.');
