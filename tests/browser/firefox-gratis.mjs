// Draai met: npm run test:firefox  (eenmalig eerst: npx puppeteer browsers install firefox)
// (npm run test:firefox draait dit na firefox.mjs, de test van Kamelo Business.)
// De gratis editie in een echte Firefox: het Firefox-pakket (tools/pack.mjs --firefox) installeren, op een nagebootste
// ChatGPT een persoonlijke zin typen en dan de melding "Sensitive topic" met de knop voor een tijdelijke chat zien,
// zonder Melo (die bestaat alleen in Chrome). Een algemene vraag geeft geen melding.
// De melding staat in een gesloten shadow root. CDP bestaat niet in Firefox; WebDriver BiDi kan die wel uitlezen
// (includeShadowTree: 'all').
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { pack } from '../../tools/pack.mjs';
import { mockPage, EXTENSION } from './kamelo.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-firefox-'));
execFileSync('unzip', ['-q', path.join(EXTENSION, pack({ firefox: true })), '-d', dir]);

const CHAT = `<!doctype html><title>Chat</title>
<main><div id="answer"></div></main>
<form><div id="prompt-textarea" contenteditable="true"></div><button type="submit" aria-label="Send">↑</button></form>`;
const PERSONAL = 'My doctor says I might have diabetes, what should I eat?';
const GENERAL = 'What is the capital of France?';

// Kamelo's melding zoals hij in beeld staat: de tekst in de shadow roots van de pagina (zonder stijlen), en of de
// kaart zichtbaar is (klasse "show", net als in public.test.mjs).
async function notice(browser, page) {
  const { result: { result } } = await browser.connection.send('script.callFunction', {
    functionDeclaration: '() => document.documentElement',
    target: { context: page.mainFrame()._id },
    awaitPromise: false,
    resultOwnership: 'none',
    serializationOptions: { maxDomDepth: 100, includeShadowTree: 'all' },
  });
  const texts = [];
  let shown = false;
  const walk = (node, inShadow) => {
    const v = node?.value;
    if (!v || v.localName === 'style') return;
    if (inShadow && v.nodeType === 3 && v.nodeValue.trim()) texts.push(v.nodeValue.trim());
    const cls = (v.attributes?.class || '').split(' ');
    if (inShadow && cls.includes('t') && cls.includes('show')) shown = true;
    for (const c of v.children || []) walk(c, inShadow);
    if (v.shadowRoot) walk(v.shadowRoot, true);
  };
  walk(result, false);
  return { text: texts.join(' '), shown };
}
async function waitForNotice(browser, page, test, timeout) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await notice(browser, page);
    if (test(last)) return last;
    await new Promise(r => setTimeout(r, 200));
  }
  return last;
}
const topic = n => n.shown && /Sensitive topic|Gevoelig onderwerp/.test(n.text) && /Temporary chat|Tijdelijke chat/.test(n.text);

async function type(page, text) {
  await page.click('#prompt-textarea');
  await page.keyboard.type(text);
}

const browser = await puppeteer.launch({ browser: 'firefox', headless: true, executablePath: process.env.FIREFOX || undefined });
let passed = 0, failed = 0;
const check = (label, ok, got) => { console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `: ${JSON.stringify(got)}`}`); ok ? passed++ : failed++; };
try {
  await browser.installExtension(dir);
  await new Promise(r => setTimeout(r, 1500));

  // Een persoonlijke vraag: de melding met de knop voor een tijdelijke chat, en geen Melo.
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT, undefined, async () => {});
  await type(page, PERSONAL);
  const n = await waitForNotice(browser, page, topic, 10_000);
  check('een persoonlijke vraag geeft de melding "Sensitive topic" met een tijdelijke chat', topic(n), n);
  // De extensie heet Melo (17 okt), dus de naam mag in de melding staan; de chat met Melo (de knop "Ask Melo") niet.
  check('de melding belooft in Firefox geen chat met Melo', topic(n) && !/Ask Melo|Vraag het Melo|Frag Melo|Demander à Melo|Pregúntale a Melo/i.test(n.text), n.text);
  check('de melding heeft "Niet meer in dit gesprek"', /Don’t show in this chat|Niet meer in dit gesprek/.test(n.text), n.text);
  const field = await page.$eval('#prompt-textarea', el => el.innerText.trim());
  check('de tekst blijft ongewijzigd (niets afgeschermd)', field === PERSONAL, field);

  // Een algemene vraag: geen melding. Daarna een persoonlijke zin in hetzelfde veld, om te zien dat Kamelo hier wel draaide.
  const page2 = await mockPage(browser, 'https://chatgpt.com/c/general', CHAT, undefined, async () => {});
  await new Promise(r => setTimeout(r, 1000));
  await type(page2, GENERAL);
  await new Promise(r => setTimeout(r, 3000));
  const quiet = await notice(browser, page2);
  await type(page2, ` ${PERSONAL}`);
  const later = await waitForNotice(browser, page2, topic, 10_000);
  check('een algemene vraag geeft geen melding', !quiet.shown && !/Sensitive topic|Gevoelig onderwerp/.test(quiet.text) && topic(later), { quiet, later });
} finally {
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
