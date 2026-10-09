// Draai met: npm run test:firefox  (eenmalig eerst: npx puppeteer browsers install firefox)
// Kamelo in een echte Firefox: het Firefox-pakket (tools/pack.mjs --firefox) installeren, echt plakken met het
// toetsenbord, het antwoord terugzetten, de kluis delen met een nieuw tabblad en niets teruggeven aan een andere site.
// In Firefox loopt de kluis via de achtergrond (content scripts zien storage.session daar niet).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { pack } from '../../tools/pack.mjs';
import { mockPage, waitForText, SAMPLE, EXTENSION } from './kamelo.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-firefox-'));
execFileSync('unzip', ['-q', path.join(EXTENSION, pack({ firefox: true })), '-d', dir]);

const CHAT = `<!doctype html><title>Chat</title><main><div id="answer"></div></main>
<textarea id="src"></textarea><form><div id="prompt-textarea" contenteditable="true"></div></form>`;
const masked = t => /\[PERSON_\d+\]/.test(t) && /\[IBAN_\d+\]/.test(t) && !t.includes(SAMPLE.name);
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const combo = async (page, key) => { await page.keyboard.down(MOD); await page.keyboard.press(key); await page.keyboard.up(MOD); };

const browser = await puppeteer.launch({ browser: 'firefox', headless: true, executablePath: process.env.FIREFOX || undefined });
let failed = 0;
const check = (label, ok, got) => { console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `: ${JSON.stringify(got)}`}`); if (!ok) failed++; };
try {
  await browser.installExtension(dir);
  await new Promise(r => setTimeout(r, 1500));
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await page.$eval('#src', (el, t) => { el.value = t; }, SAMPLE.text);
  await page.click('#src'); await combo(page, 'a'); await combo(page, 'c');
  await page.click('#prompt-textarea'); await combo(page, 'v');
  const text = await waitForText(page, '#prompt-textarea', masked);
  check('plakken wordt afgeschermd', masked(text), text);

  const [person, iban] = text.match(/\[[A-Z]+_\d+\]/g) ?? [];
  await page.evaluate((p, i) => { answer.innerHTML = `<p>Hi ${p}, please pay via ${i}.</p>`; }, person, iban);
  const back = await waitForText(page, '#answer', t => t.includes(SAMPLE.name));
  check('het antwoord krijgt de echte waarden', back === `Hi ${SAMPLE.name}, please pay via ${SAMPLE.iban}.`, back);

  const page2 = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await page2.evaluate(p => { answer.innerHTML = `<p>About ${p}</p>`; }, person);
  check('een nieuw tabblad kent de kluis', (await waitForText(page2, '#answer', t => t.includes(SAMPLE.name))).includes(SAMPLE.name));

  const page3 = await mockPage(browser, 'https://gemini.google.com/', CHAT);
  await page3.evaluate(p => { answer.innerHTML = `<p>About ${p}</p>`; }, person);
  await new Promise(r => setTimeout(r, 1200));
  const other = await page3.$eval('#answer', el => el.innerText);
  check('een andere site krijgt niets terug', !other.includes(SAMPLE.name), other);
} finally {
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${4 - failed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
