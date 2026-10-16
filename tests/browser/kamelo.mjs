// Gedeelde hulpjes voor de browsertests: Chrome starten met Kamelo, pagina's nabootsen en tekst plakken.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const EXTENSION = fileURLToPath(new URL('../..', import.meta.url));

// Verzonnen testgegevens; het IBAN is een geldig voorbeeldnummer, dus de checksum klopt.
export const SAMPLE = {
  name: 'Sarah Miller',
  iban: 'GB82 WEST 1234 5698 7654 32',
  text: 'Write a reminder to Sarah Miller, IBAN GB82 WEST 1234 5698 7654 32',
};

// extension: de map met de uitgepakte extensie; standaard de broncode (Kamelo Business, zie src/edition.js).
// Een eigen, tijdelijk profiel met een eigen downloadmap (`downloads`): een test zet nooit iets in de echte Downloads.
export async function launch({ headless = true, extension = EXTENSION } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-profile-'));
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-downloads-'));
  fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
  fs.writeFileSync(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
    download: { default_directory: downloads, prompt_for_download: false, directory_upgrade: true },
    savefile: { default_directory: downloads },
  }));
  process.on('exit', () => { for (const d of [profile, downloads]) try { fs.rmSync(d, { recursive: true, force: true }); } catch {} });
  const browser = await puppeteer.launch({
    headless,
    pipe: true,
    userDataDir: profile,
    enableExtensions: [extension],
    args: ['--no-first-run', '--no-default-browser-check', '--window-size=1280,900', '--lang=en-US'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const target = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/src/background.js'));
  const worker = await target.worker();
  // De welkomstpagina opent na installatie; die zit de tests alleen in de weg.
  for (const page of await browser.pages()) if (page.url().startsWith('chrome-extension://')) await page.close();
  return { browser, worker, downloads };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };

// Opent `url`, maar serveert `html` in plaats van de echte site: zo draait Kamelo op de echte hostnaam,
// zonder dat de test van internet of van de opmaak van die site afhangt. `onRequest` ziet de overige verzoeken.
// `ready`: wacht tot Kamelo in de pagina draait (standaard: tot het afschermen reageert, alleen in Kamelo Business).
export async function mockPage(browser, url, html, onRequest = () => {}, ready = waitForKamelo) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.isInterceptResolutionHandled()) return;
    if (req.url() === url) return req.respond({ status: 200, contentType: 'text/html', body: html });
    onRequest(req);
    if (!req.isInterceptResolutionHandled()) req.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}

// Kamelo is klaar zodra het content script reageert op pf:ping (zie net-main.js en content.js; alleen Kamelo Business).
export async function waitForKamelo(page, timeout = 10_000) {
  await page.waitForFunction(() => {
    let here = false;
    const pong = () => { here = true; };
    document.addEventListener('pf:pong', pong);
    document.dispatchEvent(new CustomEvent('pf:ping'));
    document.removeEventListener('pf:pong', pong);
    return here;
  }, { timeout, polling: 250 });
}

// Plakt tekst zoals een gebruiker dat doet: een paste-event met klembordgegevens op het veld.
// Geeft true terug als Kamelo het plakken overnam (en dus iets afschermde).
export function paste(page, selector, text) {
  return page.$eval(selector, (el, text) => {
    el.focus();
    const data = new DataTransfer();
    data.setData('text/plain', text);
    return !el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
}

export const textOf = (page, selector) =>
  page.$eval(selector, el => (el.tagName === 'TEXTAREA' ? el.value : el.innerText).trim());

// Wacht tot de tekst van een element aan `test` voldoet; geeft de laatste tekst terug.
export async function waitForText(page, selector, test, timeout = 5_000) {
  const end = Date.now() + timeout;
  let text = '';
  while (Date.now() < end) {
    text = await textOf(page, selector).catch(() => '');
    if (test(text)) return text;
    await new Promise(r => setTimeout(r, 100));
  }
  return text;
}

// Klikt op een knop waarvan de tekst aan `label` voldoet (tekst of RegExp), ook in de gesloten shadow roots van Kamelo (melding en venster).
export async function clickText(page, label) {
  const cdp = await page.createCDPSession();
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const find = node => {
    if (node.nodeName === 'BUTTON' && (node.children || []).some(c => c.nodeType === 3 && (label instanceof RegExp ? label.test(c.nodeValue.trim()) : c.nodeValue.trim() === label))) return node;
    for (const c of [...(node.children || []), ...(node.shadowRoots || [])]) { const hit = find(c); if (hit) return hit; }
    return null;
  };
  const button = find(root);
  if (!button) throw new Error(`knop "${label}" niet gevonden`);
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: button.nodeId });
  const [x1, y1, , , x3, y3] = model.content;
  await page.mouse.click((x1 + x3) / 2, (y1 + y3) / 2);
  await cdp.detach();
}

// De HTML in de gesloten shadow roots van Kamelo (melding en kaart), zonder de stijlen: wat er in beeld staat.
export async function shadowHTML(page) {
  const cdp = await page.createCDPSession();
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const ids = [];
  const walk = node => {
    for (const sr of node.shadowRoots || []) for (const c of sr.children || []) if (c.nodeName !== 'STYLE') ids.push(c.nodeId);
    for (const c of node.children || []) walk(c);
  };
  walk(root);
  const html = [];
  for (const nodeId of ids) html.push((await cdp.send('DOM.getOuterHTML', { nodeId })).outerHTML);
  await cdp.detach();
  return html.join('\n');
}

// Wacht tot de HTML van Kamelo's melding aan `test` voldoet; geeft de laatste HTML terug.
export async function waitForShadow(page, test, timeout = 3_000) {
  const end = Date.now() + timeout;
  let html = '';
  while (Date.now() < end) {
    html = await shadowHTML(page);
    if (test(html)) return html;
    await new Promise(r => setTimeout(r, 100));
  }
  return html;
}

// Waar Kamelo's melding (of kaart) in beeld staat, en waar een element van de pagina staat: allebei via CDP, dus in
// dezelfde coördinaten. null als er geen melding open is.
export async function noticeRect(page, cls = 't') {
  const cdp = await page.createCDPSession();
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    let id = null;
    const walk = node => {
      const a = node.attributes || [];
      const c = a[a.indexOf('class') + 1] || '';
      if (a.includes('class') && c.split(' ').includes(cls) && (cls !== 't' || c.split(' ').includes('show'))) id = node.nodeId;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) walk(child);
    };
    walk(root);
    return id ? quad(await cdp.send('DOM.getBoxModel', { nodeId: id })) : null;
  } finally { await cdp.detach(); }
}
export async function rectOf(page, selector) {
  const cdp = await page.createCDPSession();
  try {
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    return quad(await cdp.send('DOM.getBoxModel', { nodeId }));
  } finally { await cdp.detach(); }
}
const quad = ({ model: { border: q } }) => ({ left: q[0], top: q[1], right: q[2], bottom: q[5] });

// De Kamelo-knoppen bij antwoorden (in gesloten shadow roots), via CDP: alleen die in beeld staan (class "b on").
async function answerButtonIds(cdp) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const ids = [];
  const walk = node => {
    const a = node.attributes || [];
    const c = a.includes('class') ? a[a.indexOf('class') + 1].split(' ') : [];
    if (node.nodeName === 'BUTTON' && c.includes('b') && c.includes('on')) ids.push(node.nodeId);
    for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) walk(child);
  };
  walk(root);
  return ids;
}
export async function answerButtons(page) {
  const cdp = await page.createCDPSession();
  try { return (await answerButtonIds(cdp)).length; } finally { await cdp.detach(); }
}
// Wacht tot er `n` Kamelo-knoppen bij antwoorden in beeld staan; geeft het aantal terug.
export async function waitForAnswerButtons(page, n, timeout = 5_000) {
  const end = Date.now() + timeout;
  let count = 0;
  while (Date.now() < end) {
    count = await answerButtons(page);
    if (count === n) return count;
    await new Promise(r => setTimeout(r, 100));
  }
  return count;
}
// Klikt op de Kamelo-knop bij het blok `selector` (de knop die het dichtst bij de bovenkant van dat blok staat).
export async function clickAnswerButton(page, selector) {
  const target = await rectOf(page, selector);
  const cdp = await page.createCDPSession();
  try {
    let best = null;
    for (const nodeId of await answerButtonIds(cdp)) {
      const { model } = await cdp.send('DOM.getBoxModel', { nodeId });
      const [x1, y1, , , x3, y3] = model.content;
      const d = Math.abs(y1 - Math.max(4, target.top));
      if (!best || d < best.d) best = { d, x: (x1 + x3) / 2, y: (y1 + y3) / 2 };
    }
    if (!best) throw new Error(`Kamelo-knop bij ${selector} niet gevonden`);
    await page.mouse.click(best.x, best.y);
  } finally { await cdp.detach(); }
}

// ---------- Melo met een nagebootste AI van Chrome (voor Melo's onderdelen) ----------
// In de pagina (evaluateOnNewDocument): elke vraag krijgt het volgende antwoord uit `answers`, in stukjes zoals de echte AI.
// window.lm.sent: wat er naar de AI ging; window.lm.initial: het gesprek waarmee een sessie begon.
export function fakeLanguageModel(answers) {
  window.lm = { sent: [], initial: [], answers: [...answers] };
  Object.defineProperty(window, 'LanguageModel', { value: {
    availability: async () => 'available',
    create: async o => {
      window.lm.initial.push(JSON.stringify(o?.initialPrompts || []));
      return { destroy() {}, clone: async () => null, prompt: async () => 'ok',
        async *promptStreaming(m) {
          window.lm.sent.push(typeof m === 'string' ? m : JSON.stringify(m));
          for (const w of (window.lm.answers.shift() ?? 'Ok.').match(/[\s\S]{1,16}/g)) { await new Promise(r => setTimeout(r, 5)); yield w; }
        } };
    },
  } });
}
// Een vraag stellen in Melo en wachten tot het antwoord af is (de knoppen eronder staan er).
export async function askMelo(page, q) {
  const before = await page.$$eval('.thread:not([hidden]) .a .tools', t => t.length);
  await page.evaluate(q => { const i = document.getElementById('input'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('form').requestSubmit(); }, q);
  await page.waitForFunction(n => document.querySelectorAll('.thread:not([hidden]) .a .tools').length > n && !document.querySelector('#send.stop'), { timeout: 10000, polling: 100 }, before)
    .catch(async e => { throw new Error(`${e.message}\n${await page.evaluate(() => `${document.querySelector('#note')?.innerText}\n${document.querySelector('.thread:not([hidden])')?.innerText}\n${[...document.querySelectorAll('.a')].at(-1)?.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '')}\n${JSON.stringify(window.lm?.sent)}`)}`); });
}
