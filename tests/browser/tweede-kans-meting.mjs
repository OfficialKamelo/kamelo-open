// Meting van de tweede kans (src/topic-ai.js) met de echte AI van Chrome (Gemini Nano), op de zinnen van
// tests/detectie/: wat vangt de AI bij persoonlijke vragen die de woordenlijst mist, en hoe vaak meldt hij een gewone
// vraag die de woordenlijst terecht liet gaan? Niet in `npm test`: het heeft de echte AI nodig (4 GB) en duurt minuten.
//
//   node tests/browser/tweede-kans-meting.mjs <chrome-map met OptGuideOnDeviceModel> [--alleen-nieuw] [--waarom]
//
//   <chrome-map>     bijv. "~/Library/Application Support/Google/Chrome". Alleen gelezen: het script maakt er een klein
//                    profiel van (alleen het model, met `cp -c`, kost geen ruimte, plus optimization_guide uit Local State).
//   --alleen-nieuw   alleen de opties van nu (en/de/fr/es); standaard ook die van v1.7.1 (alleen Engels), ter vergelijking.
//   --waarom         ook de zinnen uit de bron-sets (ontwikkel/, schrijver2/) waar de AI zich vergist. apart/ en blind/
//                    nooit: die zijn geen bron (zie tests/detectie-meting.mjs).
//
// Hetzelfde als in de extensie: de gratis editie, de service worker, KameloTopicAi.SYSTEM, SCHEMA, snippet() en parse(),
// topK 1 en temperature 0. Eerst één vraag via model().ask(), zoals de content script hem stelt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { build } from '../../tools/pack.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { sensitiveTopics, notAboutWriter } = require('../../src/topics.js');
const argv = process.argv.slice(2);
const ONLY_NEW = argv.includes('--alleen-nieuw');
const WHY = argv.includes('--waarom');
const PROFILE = argv.find(a => !a.startsWith('--'))?.replace(/^~(?=\/)/, os.homedir());
if (!PROFILE || !fs.existsSync(path.join(PROFILE, 'OptGuideOnDeviceModel'))) {
  console.error('Gebruik: node tests/browser/tweede-kans-meting.mjs <chrome-map met OptGuideOnDeviceModel>');
  process.exit(2);
}

// ---------- de zinnen ----------
const LANGS = ['en', 'nl', 'de', 'fr', 'es'];
const SETS = ['ontwikkel', 'schrijver2', 'apart', 'blind'];
const DEV = ['ontwikkel', 'schrijver2'];
const items = [];
for (const set of SETS) for (const lang of LANGS) {
  let kind = null;
  fs.readFileSync(path.join(here, '..', 'detectie', set, `${lang}.txt`), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('# ')) return;
    if (line === '#P' || line === '#G') { kind = line === '#P' ? 'personal' : 'general'; return; }
    const [t, text] = line.split('|');
    if (t === 'X') return; // zelfbeschadiging: bewust geen melding
    items.push({ set, lang, kind, where: `${set}/${lang}.txt:${i + 1}`, text, list: sensitiveTopics(text).length > 0 });
  });
}
// De AI wordt alleen gevraagd als de woordenlijst niets vond en geen NOT-woord zag (topic-ai.js, gate()).
const asked = items.filter(r => !r.list && !notAboutWriter(r.text));

// ---------- Chrome met het model ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-tweede-kans-'));
let browser = null;
async function cleanup() {
  await browser?.close().catch(() => {});
  try { execFileSync('pkill', ['-f', tmp]); } catch {}
  if (path.basename(tmp).startsWith('kamelo-tweede-kans-')) fs.rmSync(tmp, { recursive: true, force: true });
}
process.on('SIGINT', () => cleanup().finally(() => process.exit(130)));

const prof = path.join(tmp, 'prof');
fs.mkdirSync(prof);
execFileSync('cp', ['-c', '-R', path.join(PROFILE, 'OptGuideOnDeviceModel'), prof + '/']);
const state = JSON.parse(fs.readFileSync(path.join(PROFILE, 'Local State'), 'utf8'));
fs.writeFileSync(path.join(prof, 'Local State'), JSON.stringify({ optimization_guide: state.optimization_guide }));
build(path.join(tmp, 'gratis'), { teams: false, test: true });

try {
  browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, pipe: true, protocolTimeout: 600000,
    enableExtensions: [path.join(tmp, 'gratis')], ignoreDefaultArgs: true,
    args: ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging', '--use-angle=metal',
      '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run'],
  });
  const target = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/src/background.js'), { timeout: 30000 });
  const worker = await target.worker();
  console.log(`Chrome ${await browser.version()}, ${asked.length} zinnen voor de AI (woordenlijst vond niets, geen NOT-woord)\n`);

  const avail = await worker.evaluate(async () => {
    const A = globalThis.KameloTopicAi, r = {};
    for (const [k, o] of [['en/de/fr/es', A.LM_OPTS], ['en', A.LM_OPTS_EN]]) {
      try { r[k] = await LanguageModel.availability(o); } catch (e) { r[k] = `fout: ${e.name}`; }
    }
    return r;
  });
  console.log('availability():', JSON.stringify(avail));
  if (!Object.values(avail).includes('available')) throw new Error('het model is er niet in deze kopie');

  // Zoals de content script het vraagt (eerste vraag laadt het model: mag lang duren).
  const t0 = Date.now();
  const real = await worker.evaluate(t => globalThis.KameloTopicAi.model().ask(t, 1),
    'Ich habe seit Wochen kaum geschlafen und morgens zittern mir die Hände, was ist los mit mir');
  console.log(`model().ask() met een Duitse zin: ${JSON.stringify(real)} (${Date.now() - t0} ms)\n`);

  const configs = ONLY_NEW ? ['en/de/fr/es'] : ['en', 'en/de/fr/es'];
  const res = {};
  for (const cfg of configs) {
    if (avail[cfg] !== 'available') { console.log(`${cfg}: ${avail[cfg]}, overgeslagen`); continue; }
    await worker.evaluate(async cfg => {
      const A = globalThis.KameloTopicAi;
      const o = { ...(cfg === 'en' ? A.LM_OPTS_EN : A.LM_OPTS), initialPrompts: [{ role: 'system', content: A.SYSTEM }] };
      globalThis.__meet?.destroy?.();
      try { globalThis.__meet = await LanguageModel.create({ ...o, topK: 1, temperature: 0 }); } catch { globalThis.__meet = await LanguageModel.create(o); }
    }, cfg);
    const t1 = Date.now();
    res[cfg] = [];
    for (const [n, r] of asked.entries()) {
      const topic = await worker.evaluate(async text => {
        const A = globalThis.KameloTopicAi, s = await globalThis.__meet.clone();
        try { return A.parse(await s.prompt(A.snippet(text), { responseConstraint: A.SCHEMA, signal: AbortSignal.timeout(30000) })); }
        catch (e) { return `fout: ${e.name}`; } finally { s.destroy(); }
      }, r.text);
      res[cfg].push(topic);
      if ((n + 1) % 50 === 0) process.stdout.write(`  ${cfg}: ${n + 1}/${asked.length}\r`);
    }
    console.log(`${cfg}: ${asked.length} vragen in ${Math.round((Date.now() - t1) / 1000)} s${' '.repeat(20)}`);
  }

  // ---------- uitslag ----------
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-').padStart(4);
  for (const cfg of Object.keys(res)) {
    const got = new Map(asked.map((r, i) => [r, res[cfg][i]]));
    const errors = res[cfg].filter(t => String(t).startsWith('fout')).length;
    console.log(`\n▸ tweede kans met ${cfg}${errors ? ` (${errors} fouten/time-outs, tellen als geen melding)` : ''}`);
    console.log('taal | set        | AI vangt van de missers | AI meldt onterecht | samen terecht | samen onterecht');
    for (const lang of LANGS) for (const set of SETS) {
      const mine = items.filter(r => r.lang === lang && r.set === set);
      const P = mine.filter(r => r.kind === 'personal'), G = mine.filter(r => r.kind === 'general');
      const miss = P.filter(r => asked.includes(r)), quiet = G.filter(r => asked.includes(r));
      const hit = r => r.list || /^[A-Z]+$/.test(String(got.get(r) || ''));
      const caught = miss.filter(hit).length, wrong = quiet.filter(hit).length;
      console.log(`${lang}   | ${set.padEnd(10)} | ${`${caught}/${miss.length}`.padStart(10)} ${pct(caught, miss.length)}       | ${`${wrong}/${quiet.length}`.padStart(8)} ${pct(wrong, quiet.length)}   | ${pct(P.filter(hit).length, P.length)}          | ${pct(G.filter(hit).length, G.length)}`);
    }
    if (WHY) {
      console.log('\nAI mist (bron-sets):');
      for (const r of asked) if (DEV.includes(r.set) && r.kind === 'personal' && !/^[A-Z]+$/.test(String(got.get(r)))) console.log(`  ${r.where} | ${r.text}`);
      console.log('AI meldt onterecht (bron-sets):');
      for (const r of asked) if (DEV.includes(r.set) && r.kind === 'general' && /^[A-Z]+$/.test(String(got.get(r)))) console.log(`  ${r.where} → ${got.get(r)} | ${r.text}`);
    }
  }
} finally {
  await cleanup();
}
