// Meetset voor Melo: dezelfde vaste vragen (melo-vragen.json) aan de echte AI van Chrome, met automatische controles.
// Draai dit na elke wijziging aan Melo's instructies (chat/chat.js: CAN, BASE, taskHint) en vergelijk met de vorige run.
// Niet in `npm test`: het heeft de echte AI nodig (Gemini Nano, 4 GB) en duurt een paar minuten.
//
//   node tests/browser/melo-eval.mjs <chrome-profiel-met-AI> [--editie gratis|business] [--alleen id,id] [--keer 3] [--lab pad/naar/lab.mjs]
//
//   <chrome-profiel-met-AI>  een Chrome-map met OptGuideOnDeviceModel, bijv. "~/Library/Application Support/Google/Chrome".
//                            Er wordt alleen gelezen: het script maakt er een klein profiel van (alleen het model, met
//                            `cp -c`, kost geen ruimte, plus het blok optimization_guide uit Local State).
//   --lab                    meet de Melo van een andere werkkopie (standaard: lab.mjs naast dit script).
//   --keer N                 elke vraag N keer (de AI antwoordt elke keer iets anders); een vraag slaagt pas als alle keren slagen.
//
// Wat het doet: start het testlab (lab.mjs, route POST /melo) met een eigen tijdelijke map, stelt eerst een wegwerpvraag
// (de eerste vraag haalt de 120 s niet: het model moet laden), dan elke vraag als eigen gesprek. Per vraag: grafiek alleen
// als erom gevraagd is, formules als MathML, geen opvulzin aan het eind, geen "Hallo!/Goede vraag" aan het begin, juiste
// taal (nl, en, de, fr, es), juiste uitkomst, geen bekende fout uit een feitenkaartje (chat/kennis.js). Na afloop gaan het lab en
// zijn tijdelijke map (met de profielkopie) weg.
//
// Rapport: tests/browser/melo-eval/laatste.txt en .json (Business: laatste-business.*; gaan mee in git: de vergelijking voor de volgende run) en een kopie
// per run in melo-eval/runs/ (niet in git). Afsluitcode 0 als de run gelukt is, ook als er vragen mislukken.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf('--' + name); return i < 0 ? null : argv.splice(i, 2)[1]; };
const EDITION = opt('editie') || 'gratis';
const ONLY = (opt('alleen') || '').split(',').filter(Boolean);
const TIMES = Math.max(1, parseInt(opt('keer') || '1', 10));
const LAB = path.resolve(opt('lab') || path.join(here, 'lab.mjs'));
const OUT = path.resolve(opt('uit') || path.join(here, 'melo-eval'));
const SET = JSON.parse(fs.readFileSync(path.resolve(opt('vragen') || path.join(here, 'melo-vragen.json')), 'utf8'));
const PROFILE = argv[0] && path.resolve(argv[0].replace(/^~(?=\/)/, os.homedir()));
if (!PROFILE || !fs.existsSync(path.join(PROFILE, 'OptGuideOnDeviceModel'))) {
  console.error('Gebruik: node tests/browser/melo-eval.mjs <chrome-map met OptGuideOnDeviceModel>\n' +
    '(bijv. "~/Library/Application Support/Google/Chrome"; het model staat er als Chrome\'s AI een keer gedownload is)');
  process.exit(2);
}
// editie: een vraag alleen voor de gratis editie of alleen voor Business (Melo's onderdelen verschillen per editie).
const vragen = SET.vragen.filter(v => (!ONLY.length || ONLY.includes(v.id)) && (!v.editie || v.editie === EDITION));

// ---------- controles ----------
// Taal en feiten met dezelfde modules als Melo zelf (chat/guard.js, chat/kennis.js), uit de werkkopie die we meten.
const req = createRequire(path.join(path.dirname(LAB), '..', '..', 'chat', 'x.js'));
const Guard = req('./guard.js'), Kennis = req('./kennis.js');
function language(text) {
  const d = Guard.detect(text);
  return d.sure && d.words >= 4 ? d.lang : null;
}
// Wat de instructies verbieden (CAN in chat/chat.js): "Hallo!" of "Goede vraag" vooraan, "Is er nog iets anders…?" achteraan.
const OPENER = /^(hallo|hoi|hey|hi|hello)( daar| there| melo)?\s*[!.]|^(wat een )?(goede|leuke|mooie|interessante) vraag|^(what an? |that'?s an? )?(great|good|excellent|interesting) question/i;
const FILLER = /is er (nog )?(iets|wat) (anders|meer)|heb je (nog )?(andere|meer|verdere) vragen|kan ik (je|u) (nog )?(ergens|verder|met iets)|laat (het )?(me|mij) (gerust )?weten|(ik hoop|hopelijk)\b.{0,40}\b(helpt|duidelijk|nuttig)|vraag (het )?gerust|(is there|can i help (you )?with|do you need) anything (else|specific)|anything else (i can|you'?d like|you need)|any (other|more|further) questions|let me know|hope (this|that|it)\b.{0,30}\bhelp|feel free to|happy to help/i;
// LaTeX die niet als formule getekend is ($…$, \frac, \cdot): dan ziet de gebruiker de code.
const LATEX = /\$[^$\n]*[\\^_{}][^$\n]*\$|\\(frac|cdot|times|sqrt|pi|text|left|right|approx)\b|\^\{/;

function check(v, t) {
  const a = t.a || '', drawn = t.drawn || {}, out = [];
  const add = (name, ok, why = '') => out.push({ name, ok: !!ok, why });
  if (!t.answered) { add('antwoord', false, a); return out; }
  const flat = a.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  const lines = a.split('\n').map(s => s.trim()).filter(Boolean);
  add('grafiek', v.chart ? drawn.charts > 0 : !drawn.charts, v.chart ? `gevraagd, ${drawn.charts || 0} getekend` : `niet gevraagd, ${drawn.charts} getekend`);
  if (v.math) add('formule', drawn.math > 0, `${drawn.math || 0} formules als MathML`);
  // Melo's onderdelen (chat/rich.js): het gevraagde onderdeel, en anders geen (een persoonlijk verhaal krijgt geen checklist).
  const parts = drawn.parts || [];
  if (v.part) add('onderdeel', parts.some(k => new RegExp(`^(${v.part})$`).test(k)), `verwacht ${v.part}, getekend: ${parts.join(', ') || 'geen'}`);
  else add('onderdeel', !parts.length, `niet gevraagd, getekend: ${parts.join(', ')}`);
  if (v.velden) add('velden', (drawn.fields || 0) >= v.velden, `${drawn.fields || 0} invulvelden (minstens ${v.velden})`);
  const tex = a.match(LATEX); add('latex', !tex, tex ? `losse LaTeX: ${tex[0]}` : '');
  const end = lines.at(-1) || '', fill = end.match(FILLER); add('einde', !fill, fill ? `opvulzin: "${end.slice(-90)}"` : '');
  if (!v.allowGreeting) { const op = lines[0]?.match(OPENER); add('begin', !op, op ? `begint met "${op[0]}"` : ''); }
  const lang = language(a); add('taal', !lang || lang === v.lang, lang && lang !== v.lang ? `antwoord in ${lang}, vraag in ${v.lang}` : '');
  for (const re of v.expect || []) add('uitkomst', new RegExp(re, 'u').test(flat), `verwacht ${v.uitkomst || re}`);
  for (const re of v.forbid || []) { const m = flat.match(new RegExp(re, 'u')); add('verboden', !m, m ? `bevat "${m[0]}"` : ''); }
  // Een bekende fout uit een feitenkaartje (bijv. "de zijde waar de rechte hoek is, heet de schuine zijde").
  const wrong = Kennis.wrongs(a, Kennis.find(v.q));
  add('feit', !wrong.length, wrong.map(x => `fout: "${x.sentence.slice(0, 90)}"`).join('; '));
  if (v.maxChars) add('lengte', a.length <= v.maxChars, `${a.length} tekens (max ${v.maxChars})`);
  // Persoonlijk verhaal zonder vraag om tips: Melo luistert. Hij vraagt iets terug en geeft (nog) geen lijstje met tips.
  if (v.luister) {
    add('vraagt door', /\?/.test(a), 'geen vraag terug');
    const tips = flat.match(/hierzijn|eenpaar(dingen|tips|ideeën)|probeer|jekunt|hereare|afew(things|tips|ideas)|youcould|tryto|youcantry|consider/gu) || [];
    add('geen tips', !(drawn.items > 1) && tips.length < 2, `${drawn.items || 0} opsommingspunten, tipwoorden: ${tips.join(', ') || 'geen'}`);
  }
  return out;
}

// ---------- lab starten met een eigen tijdelijke map ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-eval-'));
let lab = null;
async function cleanup() {
  if (lab && lab.exitCode === null) {
    // SIGINT: puppeteer sluit dan zijn Chromes en stopt het proces (bij SIGTERM blijft de server draaien)
    lab.kill('SIGINT');
    await Promise.race([new Promise(r => lab.once('exit', r)), wait(15000)]);
    if (lab.exitCode === null) lab.kill('SIGKILL');
  }
  // Chromes die nog in onze map werken (alleen die: herkenbaar aan het pad op hun opdrachtregel)
  try { execFileSync('pkill', ['-f', tmp]); await wait(1000); } catch {}
  if (path.dirname(tmp) === path.resolve(os.tmpdir()) && path.basename(tmp).startsWith('kamelo-eval-')) fs.rmSync(tmp, { recursive: true, force: true });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
process.on('SIGINT', () => { console.log('\nafgebroken, opruimen…'); cleanup().finally(() => process.exit(130)); });

function slimProfile() {
  const dir = path.join(tmp, 'model');
  fs.mkdirSync(dir);
  execFileSync('cp', ['-c', '-R', path.join(PROFILE, 'OptGuideOnDeviceModel'), dir + '/']);
  const state = JSON.parse(fs.readFileSync(path.join(PROFILE, 'Local State'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'Local State'), JSON.stringify({ optimization_guide: state.optimization_guide }));
  return dir;
}
const freePort = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
async function startLab(prof, port) {
  lab = spawn(process.execPath, [LAB, prof, String(port)], { cwd: path.join(path.dirname(LAB), '..', '..'), env: { ...process.env, TMPDIR: tmp + '/' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  lab.stderr.on('data', d => { log = (log + d).slice(-5000); });
  await new Promise((ok, ko) => {
    const timer = setTimeout(() => ko(new Error('lab niet klaar binnen 5 min\n' + log.slice(-2000))), 300000);
    lab.stdout.on('data', d => { if (/lab klaar/.test(d)) { clearTimeout(timer); ok(); } });
    lab.once('exit', c => { clearTimeout(timer); ko(new Error(`lab stopte (${c})\n` + log.slice(-2000))); });
  });
}
// Eén gesprek: de vraag plus eventuele vervolgberichten (vervolg); gecontroleerd wordt het laatste antwoord.
async function ask(port, q, vervolg = []) {
  const t0 = Date.now();
  try {
    const r = await fetch(`http://127.0.0.1:${port}/melo`, { method: 'POST', body: JSON.stringify({ edition: EDITION, messages: [q, ...vervolg] }) }).then(r => r.json());
    if (r.error) return { q, a: 'fout van het lab: ' + r.error, answered: false, ms: Date.now() - t0 };
    const t = r.transcript.at(-1);
    return { ...t, eerder: r.transcript.slice(0, -1), answered: !/^\(geen antwoord/.test(t.a) };
  } catch (e) { return { q, a: 'fout: ' + e.message, answered: false, ms: Date.now() - t0 }; }
}

// ---------- wat er gemeten wordt (welke code) ----------
const repo = path.join(path.dirname(LAB), '..', '..');
const git = (...a) => { try { return execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim(); } catch { return ''; } };
const chatJs = path.join(repo, 'chat', 'chat.js');
const code = {
  repo, branch: git('rev-parse', '--abbrev-ref', 'HEAD'), commit: git('rev-parse', '--short', 'HEAD'),
  changed: !!git('status', '--porcelain', 'chat/'),
  // Melo's instructies en vangrails: alle scripts in chat/ samen (chat.js, guard.js, reken.js, kennis.js, …)
  chatJs: fs.existsSync(chatJs) ? crypto.createHash('sha1').update(fs.readdirSync(path.dirname(chatJs)).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(path.dirname(chatJs), f))).join('\n')).digest('hex').slice(0, 10) : '',
};
const chrome = (() => { try { return execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--version'], { encoding: 'utf8' }).trim(); } catch { return ''; } })();

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// ---------- de run ----------
const results = [];
const started = new Date();
try {
  console.log(`Melo-meetset: ${vragen.length} vragen, editie ${EDITION}, code ${code.branch}@${code.commit}${code.changed ? ' (+ lokale wijzigingen in chat/)' : ''}`);
  const prof = slimProfile();
  const port = await freePort();
  await startLab(prof, port);
  console.log('lab draait; opwarmen (model laden)…');
  for (let i = 0; i < 3; i++) { const w = await ask(port, SET.opwarmen); console.log(`  opwarmvraag: ${w.answered ? 'antwoord' : 'nog geen antwoord'} na ${Math.round(w.ms / 1000)} s`); if (w.answered) break; }
  for (const v of vragen) {
    // Elke keer een eigen gesprek. Bewaard wordt de eerste mislukte keer (of de laatste als alles lukt).
    let keep = null, passed = 0, ms = [];
    for (let k = 0; k < TIMES; k++) {
      const t = await ask(port, v.q, v.vervolg);
      const checks = check(v, t);
      const ok = checks.every(c => c.ok);
      if (ok) passed++;
      ms.push(t.ms);
      if (!keep || (keep.ok && !ok)) keep = { t, checks, ok };
      if (TIMES > 1) console.log(`  ${ok ? '✓' : '✗'} ${v.id} (${k + 1}/${TIMES}) ${checks.filter(c => !c.ok).map(c => `${c.name}: ${c.why}`).join('; ')}`);
    }
    const { t, checks } = keep, ok = passed === TIMES;
    results.push({ id: v.id, soort: v.soort, lang: v.lang, q: v.q, vervolg: v.vervolg, eerder: t.eerder, ok, keer: TIMES, geslaagd: passed, checks, a: t.a, drawn: t.drawn || {}, ms: median(ms), note: t.note || '' });
    console.log(`${ok ? '✓' : '✗'} ${v.id.padEnd(14)} ${String(Math.round(median(ms) / 100) / 10).padStart(5)} s${TIMES > 1 ? `  ${passed}/${TIMES}` : ''}  ${checks.filter(c => !c.ok).map(c => `${c.name}: ${c.why}`).join('; ')}`);
  }
} catch (e) {
  console.error('\nRun mislukt: ' + e.message);
  await cleanup();
  process.exit(1);
}
await cleanup();

// ---------- rapport + vergelijking met de vorige run ----------
fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });
const SUFFIX = EDITION === 'gratis' ? '' : `-${EDITION}`; // elke editie een eigen vergelijking
const prevFile = path.join(OUT, `laatste${SUFFIX}.json`);
const prev = fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, 'utf8')) : null;
const sum = rs => ({ vragen: rs.filter(r => r.ok).length, van: rs.length, controles: rs.flatMap(r => r.checks).filter(c => c.ok).length, controlesVan: rs.flatMap(r => r.checks).length });
const report = { datum: started.toISOString(), editie: EDITION, keer: TIMES, chrome, code, totaal: sum(results), medianMs: median(results.map(r => r.ms)), resultaten: results };

const L = [];
const fmtSum = s => `${s.vragen}/${s.van} vragen geslaagd (${s.controles}/${s.controlesVan} controles)`;
L.push(`Melo-meetset · ${started.toISOString().slice(0, 16).replace('T', ' ')} UTC · editie ${EDITION}${TIMES > 1 ? ` · elke vraag ${TIMES} keer` : ''} · ${chrome}`);
L.push(`Code: ${code.branch}@${code.commit}${code.changed ? ' + lokale wijzigingen in chat/' : ''} · chat/*.js ${code.chatJs}`);
L.push(`Resultaat: ${fmtSum(report.totaal)} · mediaan ${(report.medianMs / 1000).toFixed(1)} s per antwoord`);
if (prev) {
  L.push(`Vorige run: ${fmtSum(prev.totaal)} · ${prev.datum.slice(0, 16).replace('T', ' ')} · ${prev.code.branch}@${prev.code.commit} · chat.js ${prev.code.chatJs}${prev.code.chatJs === code.chatJs ? ' (zelfde instructies)' : ''}`);
  const before = Object.fromEntries(prev.resultaten.map(r => [r.id, r]));
  const fails = r => r.checks.filter(c => !c.ok).map(c => c.name).join(', ');
  const diff = [];
  for (const r of results) {
    const p = before[r.id];
    if (!p) diff.push(`  nieuw     ${r.id}: ${r.ok ? 'geslaagd' : 'mislukt (' + fails(r) + ')'}`);
    else if (p.ok && !r.ok) diff.push(`  − slechter ${r.id}: nu mislukt (${fails(r)})`);
    else if (!p.ok && r.ok) diff.push(`  + beter    ${r.id}: nu geslaagd (was ${fails(p)})`);
    else if (!p.ok && !r.ok && fails(p) !== fails(r)) diff.push(`  ~ anders   ${r.id}: mislukt op ${fails(r)} (was ${fails(p)})`);
  }
  L.push(diff.length ? 'Verschil:\n' + diff.join('\n') : 'Verschil: geen (zelfde vragen geslaagd en mislukt)');
} else L.push('Vorige run: geen (dit is de eerste)');
const soorten = [...new Set(results.map(r => r.soort))];
L.push('Per soort: ' + soorten.map(s => { const rs = results.filter(r => r.soort === s); return `${s} ${rs.filter(r => r.ok).length}/${rs.length}`; }).join(' · '));
L.push('');
for (const r of results) {
  const bad = r.checks.filter(c => !c.ok);
  const d = r.drawn || {};
  L.push(`${r.ok ? '✓' : '✗'} ${r.id} (${r.soort}, ${r.lang})${r.keer > 1 ? ` · ${r.geslaagd}/${r.keer} keer goed` : ''} · ${(r.ms / 1000).toFixed(1)} s · grafieken ${d.charts || 0}, formules ${d.math || 0}, tabellen ${d.tables || 0}${d.parts?.length ? `, onderdelen ${d.parts.join('+')} (${d.fields || 0} velden)` : ''}`);
  for (const c of bad) L.push(`  ✗ ${c.name}: ${c.why}`);
  const say = (who, x) => L.push(`  ${who}: ` + x.replace(/\n{2,}/g, '\n').split('\n').join('\n     '));
  say('V', r.q);
  (r.vervolg || []).forEach((q, i) => { say('A', r.eerder?.[i]?.a || ''); say('V', q); });
  say('A', r.a);
  L.push('');
}
const text = L.join('\n');
const stamp = started.toISOString().slice(0, 19).replace(/[:T]/g, '-');
fs.writeFileSync(path.join(OUT, 'runs', stamp + '.json'), JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(OUT, 'runs', stamp + '.txt'), text);
if (!ONLY.length) { fs.writeFileSync(prevFile, JSON.stringify(report, null, 1)); fs.writeFileSync(path.join(OUT, `laatste${SUFFIX}.txt`), text); }
console.log('\n' + L.slice(0, L.indexOf('')).join('\n'));
console.log(`\nRapport: ${path.relative(process.cwd(), path.join(OUT, ONLY.length ? 'runs/' + stamp + '.txt' : `laatste${SUFFIX}.txt`))}`);
