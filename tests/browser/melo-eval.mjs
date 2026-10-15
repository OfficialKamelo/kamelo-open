// Meetset voor Melo: dezelfde vaste vragen (melo-vragen.json) aan de echte AI van Chrome, met automatische controles.
// Draai dit na elke wijziging aan Melo's instructies (chat/chat.js: CAN, BASE, taskHint) en vergelijk met de vorige run.
// Niet in `npm test`: het heeft de echte AI nodig (Gemini Nano, 4 GB) en duurt een paar minuten.
//
//   node tests/browser/melo-eval.mjs <chrome-profiel-met-AI> [--editie gratis|business] [--alleen id,id] [--lab pad/naar/lab.mjs]
//
//   <chrome-profiel-met-AI>  een Chrome-map met OptGuideOnDeviceModel, bijv. "~/Library/Application Support/Google/Chrome".
//                            Er wordt alleen gelezen: het script maakt er een klein profiel van (alleen het model, met
//                            `cp -c`, kost geen ruimte, plus het blok optimization_guide uit Local State).
//   --lab                    meet de Melo van een andere werkkopie (standaard: lab.mjs naast dit script).
//
// Wat het doet: start het testlab (lab.mjs, route POST /melo) met een eigen tijdelijke map, stelt eerst een wegwerpvraag
// (de eerste vraag haalt de 120 s niet: het model moet laden), dan elke vraag als eigen gesprek. Per vraag: grafiek alleen
// als erom gevraagd is, formules als MathML, geen opvulzin aan het eind, geen "Hallo!/Goede vraag" aan het begin, juiste
// taal, juiste uitkomst. Na afloop gaan het lab en zijn tijdelijke map (met de profielkopie) weg.
//
// Rapport: tests/browser/melo-eval/laatste.txt en .json (gaan mee in git: de vergelijking voor de volgende run) en een kopie
// per run in melo-eval/runs/ (niet in git). Afsluitcode 0 als de run gelukt is, ook als er vragen mislukken.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf('--' + name); return i < 0 ? null : argv.splice(i, 2)[1]; };
const EDITION = opt('editie') || 'gratis';
const ONLY = (opt('alleen') || '').split(',').filter(Boolean);
const LAB = path.resolve(opt('lab') || path.join(here, 'lab.mjs'));
const OUT = path.resolve(opt('uit') || path.join(here, 'melo-eval'));
const SET = JSON.parse(fs.readFileSync(path.resolve(opt('vragen') || path.join(here, 'melo-vragen.json')), 'utf8'));
const PROFILE = argv[0] && path.resolve(argv[0].replace(/^~(?=\/)/, os.homedir()));
if (!PROFILE || !fs.existsSync(path.join(PROFILE, 'OptGuideOnDeviceModel'))) {
  console.error('Gebruik: node tests/browser/melo-eval.mjs <chrome-map met OptGuideOnDeviceModel>\n' +
    '(bijv. "~/Library/Application Support/Google/Chrome"; het model staat er als Chrome\'s AI een keer gedownload is)');
  process.exit(2);
}
const vragen = SET.vragen.filter(v => !ONLY.length || ONLY.includes(v.id));

// ---------- controles ----------
const NL = new Set('de het een en je jij jouw van dat niet op voor met zijn wat ik kan kunt ook als bij naar dit maar wordt hoe er om uit te die deze wij heb hebt heeft wil dan meer zo nog door waar elke welke omdat'.split(' '));
const EN = new Set('the a an and you your of that not on for with are what i can also if at to this or but it how be have has will by from more so do there which about they my when because each'.split(' '));
function language(text) {
  let nl = 0, en = 0;
  for (const w of text.toLowerCase().match(/\p{L}+/gu) || []) { if (NL.has(w)) nl++; if (EN.has(w)) en++; }
  return nl + en < 3 ? null : nl > en ? 'nl' : 'en';
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
  const tex = a.match(LATEX); add('latex', !tex, tex ? `losse LaTeX: ${tex[0]}` : '');
  const end = lines.at(-1) || '', fill = end.match(FILLER); add('einde', !fill, fill ? `opvulzin: "${end.slice(-90)}"` : '');
  if (!v.allowGreeting) { const op = lines[0]?.match(OPENER); add('begin', !op, op ? `begint met "${op[0]}"` : ''); }
  const lang = language(a); add('taal', !lang || lang === v.lang, lang && lang !== v.lang ? `antwoord in ${lang}, vraag in ${v.lang}` : '');
  for (const re of v.expect || []) add('uitkomst', new RegExp(re, 'u').test(flat), `verwacht ${v.uitkomst || re}`);
  for (const re of v.forbid || []) { const m = flat.match(new RegExp(re, 'u')); add('verboden', !m, m ? `bevat "${m[0]}"` : ''); }
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
  chatJs: fs.existsSync(chatJs) ? crypto.createHash('sha1').update(fs.readFileSync(chatJs)).digest('hex').slice(0, 10) : '',
};
const chrome = (() => { try { return execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--version'], { encoding: 'utf8' }).trim(); } catch { return ''; } })();

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
    const t = await ask(port, v.q, v.vervolg);
    const checks = check(v, t);
    const ok = checks.every(c => c.ok);
    results.push({ id: v.id, soort: v.soort, lang: v.lang, q: v.q, vervolg: v.vervolg, eerder: t.eerder, ok, checks, a: t.a, drawn: t.drawn || {}, ms: t.ms, note: t.note || '' });
    console.log(`${ok ? '✓' : '✗'} ${v.id.padEnd(14)} ${String(Math.round(t.ms / 100) / 10).padStart(5)} s  ${checks.filter(c => !c.ok).map(c => `${c.name}: ${c.why}`).join('; ')}`);
  }
} catch (e) {
  console.error('\nRun mislukt: ' + e.message);
  await cleanup();
  process.exit(1);
}
await cleanup();

// ---------- rapport + vergelijking met de vorige run ----------
fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });
const prevFile = path.join(OUT, 'laatste.json');
const prev = fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, 'utf8')) : null;
const sum = rs => ({ vragen: rs.filter(r => r.ok).length, van: rs.length, controles: rs.flatMap(r => r.checks).filter(c => c.ok).length, controlesVan: rs.flatMap(r => r.checks).length });
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const report = { datum: started.toISOString(), editie: EDITION, chrome, code, totaal: sum(results), medianMs: median(results.map(r => r.ms)), resultaten: results };

const L = [];
const fmtSum = s => `${s.vragen}/${s.van} vragen geslaagd (${s.controles}/${s.controlesVan} controles)`;
L.push(`Melo-meetset · ${started.toISOString().slice(0, 16).replace('T', ' ')} UTC · editie ${EDITION} · ${chrome}`);
L.push(`Code: ${code.branch}@${code.commit}${code.changed ? ' + lokale wijzigingen in chat/' : ''} · chat.js ${code.chatJs}`);
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
  L.push(`${r.ok ? '✓' : '✗'} ${r.id} (${r.soort}, ${r.lang}) · ${(r.ms / 1000).toFixed(1)} s · grafieken ${d.charts || 0}, formules ${d.math || 0}, tabellen ${d.tables || 0}`);
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
if (!ONLY.length) { fs.writeFileSync(prevFile, JSON.stringify(report, null, 1)); fs.writeFileSync(path.join(OUT, 'laatste.txt'), text); }
console.log('\n' + L.slice(0, L.indexOf('')).join('\n'));
console.log(`\nRapport: ${path.relative(process.cwd(), path.join(OUT, ONLY.length ? 'runs/' + stamp + '.txt' : 'laatste.txt'))}`);
