// Testlab voor agents: de echte extensie (gratis + Business) met de echte AI van Chrome, onzichtbaar, achter een kleine
// HTTP-server op 127.0.0.1. Agents sturen vragen en krijgen terug wat een gebruiker zou zien.
//
//   node tests/browser/lab.mjs <chrome-profiel-met-AI> [poort]
//
//   POST /notice {edition:'gratis'|'business', site:'chatgpt.com', text, how:'paste'|'type', answer?}
//        → { notice, noticeText, buttons, field, answerShown }   (Kamelo's melding en wat er in het invoerveld staat)
//   POST /melo   {edition, messages:[...], debug? } → { transcript:[{q,a,ms,drawn}], console? }   (Melo in de zijbalk, met de echte AI;
//                meetset: melo-eval.mjs). debug: chat.html?debug, en wat Melo in de console schrijft komt mee terug.
//                images: [{name, base64}] gaat als gesleepte afbeelding mee met de eerste vraag (chat/beeld.js, 22 okt);
//                attach: of de paperclip zichtbaar was. shot: true geeft png (base64), het hele gesprek op paneelbreedte.
//   POST /mac    {messages:[...]}            → { transcript }               (Melo voor Mac, Apple's AI; zie tools in scratch)
//   GET  /sites                              → lijst met nagebootste sites
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import puppeteer from 'puppeteer';
import { build } from '../../tools/pack.mjs';
import { setLicence } from './licence.mjs';
import { shadowHTML } from './kamelo.mjs';

const [PROFILE, PORT = '8790', MAC_CLI = ''] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-lab-'));
// De kopie van het profiel kan 4 GB zijn: altijd opruimen, ook bij Ctrl-C (FRICTION 15–16 okt).
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, async () => {
  // AI en ED bestaan pas verderop (const/let): een signaal tijdens het opstarten mag daar niet op vastlopen.
  const open = []; try { open.push(AI); } catch {} try { open.push(...Object.values(ED).map(e => e?.browser)); } catch {}
  await Promise.allSettled(open.filter(Boolean).map(b => b.close()));
  process.exit(130);
});

// Per site het invoerveld zoals de echte site het heeft (selectors uit src/sites.js).
const FIELD = {
  'chatgpt.com': '<div id="prompt-textarea" contenteditable="true"></div>',
  'gemini.google.com': '<rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea>',
  'claude.ai': '<fieldset><div class="ProseMirror" contenteditable="true"></div></fieldset>',
  'copilot.microsoft.com': '<textarea id="userInput"></textarea>',
  'www.perplexity.ai': '<textarea id="ask-input"></textarea>',
  'chat.mistral.ai': '<div class="ProseMirror" contenteditable="true"></div>',
  'grok.com': '<textarea></textarea>',
  'chat.deepseek.com': '<textarea id="chat-input"></textarea>',
};
const SEL = { 'chatgpt.com': '#prompt-textarea', 'gemini.google.com': '.ql-editor', 'claude.ai': '.ProseMirror', 'copilot.microsoft.com': '#userInput',
  'www.perplexity.ai': '#ask-input', 'chat.mistral.ai': '.ProseMirror', 'grok.com': 'textarea', 'chat.deepseek.com': '#chat-input' };
const page = host => `<!doctype html><meta charset="utf-8"><title>${host}</title>
<main><div id="answer"></div></main><form>${FIELD[host]}<button type="submit" aria-label="Send">Send</button></form>`;

// Licht houden (de Mac liep vol met twee Chromes met elk de AI van 4 GB):
//  - meldingen en afschermen: per editie een lichte test-Chrome zonder AI (puppeteer's eigen Chrome)
//  - Melo-gesprekken: één echte Chrome met de AI, met beide edities geladen (alleen hun chat.html wordt gebruikt)
for (const ed of ['gratis', 'business']) build(path.join(tmp, ed), { teams: ed === 'business', test: true });
const workerOf = async (browser, edition) => {
  for (let i = 0; i < 100; i++) {
    for (const t of browser.targets().filter(t => t.type() === 'service_worker' && t.url().endsWith('/src/background.js'))) {
      const w = await t.worker(); const e = await w.evaluate(() => globalThis.KameloEdition).catch(() => null);
      if ((edition === 'gratis') === (e === 'public')) return { worker: w, id: new URL(t.url()).host };
    }
    await wait(200);
  }
  throw new Error('geen service worker voor ' + edition);
};
const closeExtra = async browser => { for (const p of await browser.pages()) if (p.url().startsWith('chrome-extension://') || /kamelo\.eu/.test(p.url())) await p.close().catch(() => {}); };
async function light(edition) {
  const browser = await puppeteer.launch({ headless: true, pipe: true, protocolTimeout: 600000, enableExtensions: [path.join(tmp, edition)],
    args: ['--no-first-run', '--window-size=1280,900', '--lang=nl-NL'] });
  const { worker, id } = await workerOf(browser, edition);
  if (edition === 'business') await setLicence(worker, {});
  await closeExtra(browser);
  return { browser, worker, id };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
// De AI-Chrome start pas bij het eerste Melo-gesprek en gaat dicht voor de Mac-tests (8 GB: niet twee AI's tegelijk).
// FICLONE: op APFS een kloon (kost geen tijd of ruimte), anders een gewone kopie.
const prof = path.join(tmp, 'prof'); fs.cpSync(PROFILE, prof, { recursive: true, mode: fs.constants.COPYFILE_FICLONE });
let AI = null, AIX = null;
async function aiOn() {
  if (AI) return;
  AI = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, pipe: true, protocolTimeout: 600000,
    enableExtensions: [path.join(tmp, 'gratis'), path.join(tmp, 'business')], ignoreDefaultArgs: true,
    args: ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging', '--use-angle=metal',
      '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--window-size=1280,900'],
  });
  AIX = { gratis: await workerOf(AI, 'gratis'), business: await workerOf(AI, 'business') };
  await setLicence(AIX.business.worker, {});
  await closeExtra(AI);
}
async function aiOff() { if (AI) { await AI.close().catch(() => {}); AI = null; AIX = null; } }
const ED = { gratis: await light('gratis'), business: await light('business') };

// Eenvoudige wachtrij per editie: hooguit 4 sitepagina's en 1 Melo-gesprek tegelijk (de AI zit op één GPU).
function limiter(n) { let busy = 0; const q = []; const next = () => { if (busy >= n || !q.length) return; busy++; const [fn, ok, ko] = q.shift(); fn().then(ok, ko).finally(() => { busy--; next(); }); };
  return fn => new Promise((ok, ko) => { q.push([fn, ok, ko]); next(); }); }
const AILIM = limiter(1);
const LIM = { gratis: { site: limiter(5), ai: AILIM }, business: { site: limiter(5), ai: AILIM } };

async function notice({ edition = 'gratis', site = 'chatgpt.com', text = '', how = 'paste', answer = '' }) {
  const E = ED[edition]; if (!E) throw new Error('edition: gratis of business');
  if (!FIELD[site]) throw new Error('site: ' + Object.keys(FIELD).join(', '));
  const url = `https://${site}/`;
  const p = await E.browser.newPage();
  try {
    await p.setRequestInterception(true);
    p.on('request', r => { if (r.isInterceptResolutionHandled()) return; if (r.url() === url) return r.respond({ status: 200, contentType: 'text/html', body: page(site) }); r.respond({ status: 200, contentType: 'application/json', body: '{}' }); });
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    // wachten tot Kamelo in de pagina draait
    for (let i = 0; i < 50; i++) {
      const ok = await E.worker.evaluate(async u => { const [tab] = await chrome.tabs.query({ url: u }); if (!tab) return false; try { return !!(await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' })); } catch { return false; } }, url);
      if (ok) break; await wait(150);
    }
    const sel = SEL[site];
    await p.focus(sel);
    if (how === 'type') await p.keyboard.type(text, { delay: 5 });
    else {
      const taken = await p.evaluate((sel, text) => {
        const el = document.querySelector(sel); el.focus();
        const dt = new DataTransfer(); dt.setData('text/plain', text);
        const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        const notTaken = el.dispatchEvent(ev);
        if (notTaken) { if ('value' in el) { el.value += text; } else { el.textContent += text; } el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertFromPaste' })); }
        return !notTaken;
      }, sel, text);
      void taken;
    }
    // melding afwachten (hooguit 5 s). Kamelo's melding zit in een gesloten shadow root: lezen via CDP (zoals de tests).
    const read = async () => {
      const html = await shadowHTML(p);
      const card = (html.match(/<div class="[^"]*\bcard\b[^"]*\bshow\b[^"]*"[\s\S]*?(?=<div class="[^"]*\bcard\b|$)/) || [''])[0];
      const strip = h => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      const buttons = [...card.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => strip(m[1]) || (m[0].match(/aria-label="([^"]*)"/) || [])[1]).filter(Boolean);
      const field = await p.evaluate(sel => { const el = document.querySelector(sel); return 'value' in el ? el.value : el.innerText; }, SEL[site]);
      return { notice: !!card, noticeText: strip(card), buttons, field };
    };
    let res = await read();
    for (let i = 0; i < 20 && !res.notice; i++) { await wait(250); res = await read(); }
    if (res.notice) { await wait(300); res = await read(); }
    // Business: zet een AI-antwoord met placeholders op de pagina; Kamelo hoort daar de echte gegevens terug te zetten.
    if (answer) {
      await p.evaluate(a => { const d = document.createElement('div'); d.className = 'markdown'; d.textContent = a; document.getElementById('answer').append(d); }, answer);
      await wait(1200);
      res.answerShown = await p.evaluate(() => document.getElementById('answer').innerText);
    }
    return res;
  } finally { await p.close().catch(() => {}); }
}

async function melo({ edition = 'gratis', messages = [], debug = false, images = [], shot = false }) {
  if (!ED[edition]) throw new Error('edition: gratis of business');
  await aiOn();
  const E = { browser: AI, id: AIX[edition].id };
  const p = await E.browser.newPage();
  const logs = [];
  if (debug) { p.on('console', m => logs.push(`${m.type()}: ${m.text()}`)); p.on('pageerror', e => logs.push(`pageerror: ${e.message}`)); }
  try {
    await p.goto(`chrome-extension://${E.id}/chat/chat.html${debug ? '?debug' : ''}`);
    await wait(1500);
    const transcript = [];
    // De paperclip verschijnt pas als de AI zegt dat hij kan kijken (chat.js, canSee): even laten afronden.
    await p.waitForFunction(() => !document.getElementById('attach')?.hidden, { timeout: 5000 }).catch(() => {});
    const attach = await p.evaluate(() => !document.getElementById('attach')?.hidden);
    if (debug) logs.push('beeld: ' + await p.evaluate(async () => { try { return await LanguageModel.availability({ expectedInputs: [{ type: 'text' }, { type: 'image' }] }); } catch (e) { return String(e); } }));
    // Afbeeldingen zoals iemand ze naar het venster sleept (dezelfde route als plakken en de paperclip: addFiles).
    if (images.length) {
      await p.evaluate(async list => {
        const dt = new DataTransfer();
        for (const im of list.slice(0, 3)) {
          const bytes = Uint8Array.from(atob(im.base64), c => c.charCodeAt(0));
          dt.items.add(new File([bytes], im.name || 'screenshot.png', { type: 'image/png' }));
        }
        document.querySelector('form').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      }, images);
      await wait(1500);
    }
    for (const q of messages.slice(0, 6)) {
      const before = await p.evaluate(() => document.querySelectorAll('.msg.a, .a, [data-role="assistant"]').length);
      const t0 = Date.now();
      await p.evaluate(q => { const i = document.querySelector('textarea'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); (i.form || document.querySelector('form')).requestSubmit(); }, q);
      let a = '', note = '', drawn = {};
      for (let k = 0; k < 240; k++) {
        await wait(500);
        const s = await p.evaluate(() => {
          const as = [...document.querySelectorAll('.msg.a, .a, [data-role="assistant"]')];
          const busy = !!document.querySelector('.dots, .think, #send.stop') || document.getElementById('send')?.disabled;
          const nt = document.querySelector('.note:not([hidden]), #note:not([hidden])');
          const el = as.at(-1);
          // wat Kamelo tekende: grafieken, formules, tabellen, opsommingspunten (de knoppen onder het antwoord tellen niet mee)
          // Melo's onderdelen (brief, checklist, …): welke, en hoeveel invulvelden
          const drawn = el ? { charts: el.querySelectorAll('figure.chart svg').length, math: el.querySelectorAll('math').length, tables: el.querySelectorAll('table').length, items: el.querySelectorAll('li').length,
            parts: [...el.querySelectorAll('.part[data-kind]')].map(p => p.dataset.kind), fields: el.querySelectorAll('.part input.fld').length } : {};
          const clone = el?.cloneNode(true); clone?.querySelectorAll('.tools, figure.chart').forEach(x => x.remove());
          clone?.querySelectorAll('.part input.fld').forEach(i => i.replaceWith(`‹${i.placeholder}›`)); // invulveld leesbaar in het rapport
          clone?.querySelectorAll('.part input[type="checkbox"]').forEach(i => i.replaceWith('☐ '));
          // formules als leesbare tekst (x^2 + 2), anders geeft innerText elk teken op een eigen regel
          const mt = n => {
            const k = [...n.children].map(mt), b = s => s.length > 1 ? `(${s})` : s;
            const tag = n.localName;
            if (!n.children.length) return n.textContent.trim();
            if (tag === 'msup') return `${k[0]}^${b(k[1])}`;
            if (tag === 'msub') return `${k[0]}_${b(k[1])}`;
            if (tag === 'msubsup') return `${k[0]}_${b(k[1])}^${b(k[2])}`;
            if (tag === 'mfrac') return `${b(k[0])}/${b(k[1])}`;
            if (tag === 'msqrt') return `√(${k.join('')})`;
            if (tag === 'mroot') return `${b(k[1])}√(${k[0]})`;
            return k.join(tag === 'mtable' || tag === 'mtr' ? ' ' : '');
          };
          clone?.querySelectorAll('math').forEach(m => m.replaceWith(mt(m).normalize('NFKC')));
          return { n: as.length, last: clone ? (document.body.append(clone), clone.innerText) : '', busy, note: nt?.innerText || '', drawn, clone: clone?.remove() };
        });
        note = s.note;
        // Een antwoord dat alleen een grafiek is (Kamelo haalde de lege aanloop en opvulzin weg), telt ook.
        if (s.n > before && !s.busy && (s.last.trim() || s.drawn.charts)) { a = s.last.trim() || '(alleen een grafiek)'; drawn = s.drawn; break; }
      }
      transcript.push({ q, a: a || '(geen antwoord binnen 120 s)', note, drawn, ms: Date.now() - t0 });
    }
    // shot: een screenshot van het hele gesprek, zo breed als het zijpaneel (22 okt, schrijfstijl naast June).
    const png = shot ? (await p.setViewport({ width: 420, height: 2800 }), await p.screenshot({ fullPage: true, encoding: 'base64' })) : undefined;
    return { transcript, attach, ...(debug ? { console: logs } : {}), ...(png ? { png } : {}) };
  } finally { await p.close().catch(() => {}); }
}

function mac({ messages = [] }) {
  if (!MAC_CLI) throw new Error('mac-cli niet ingesteld');
  return new Promise((ok, ko) => {
    const child = execFile(MAC_CLI, [], { timeout: 300000, maxBuffer: 4 << 20 }, (err, out) => { if (err && !out) return ko(err); try { ok(JSON.parse(out)); } catch (e) { ko(new Error('mac-cli: ' + out.slice(0, 300))); } });
    child.stdin.end(JSON.stringify({ messages: messages.slice(0, 6) }));
  });
}
const macLim = limiter(1);

const ROUTES = {
  '/notice': b => LIM[b.edition || 'gratis'].site(() => notice(b)),
  '/melo': b => LIM[b.edition || 'gratis'].ai(() => melo(b)),
  '/mac': b => AILIM(async () => { await aiOff(); return macLim(() => mac(b)); }),
  '/ai-off': () => AILIM(aiOff).then(() => ({ ok: true })),
};
http.createServer(async (req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'GET' && req.url === '/sites') return send(200, Object.keys(FIELD));
    const route = ROUTES[req.url]; if (!route || req.method !== 'POST') return send(404, { error: 'POST /notice, /melo of /mac' });
    let body = ''; for await (const c of req) body += c;
    send(200, await route(JSON.parse(body || '{}')));
  } catch (e) { send(500, { error: String(e?.message || e) }); }
}).listen(+PORT, '127.0.0.1', () => console.log(`lab klaar op http://127.0.0.1:${PORT}`));
