// Gedeelde hulpjes voor de browsertests: Chrome starten met Kamelo, pagina's nabootsen en tekst plakken.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';

export const EXTENSION = fileURLToPath(new URL('../..', import.meta.url));

// Verzonnen testgegevens; het IBAN is een geldig voorbeeldnummer, dus de checksum klopt.
export const SAMPLE = {
  name: 'Sarah Miller',
  iban: 'GB82 WEST 1234 5698 7654 32',
  text: 'Write a reminder to Sarah Miller, IBAN GB82 WEST 1234 5698 7654 32',
};

// extension: de map met de uitgepakte extensie; standaard de broncode (Kamelo for teams, zie src/edition.js).
export async function launch({ headless = true, extension = EXTENSION } = {}) {
  const browser = await puppeteer.launch({
    headless,
    pipe: true,
    enableExtensions: [extension],
    args: ['--no-first-run', '--no-default-browser-check', '--window-size=1280,900', '--lang=en-US'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const target = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/src/background.js'));
  const worker = await target.worker();
  // De welkomstpagina opent na installatie; die zit de tests alleen in de weg.
  for (const page of await browser.pages()) if (page.url().startsWith('chrome-extension://')) await page.close();
  return { browser, worker };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };

// Opent `url`, maar serveert `html` in plaats van de echte site: zo draait Kamelo op de echte hostnaam,
// zonder dat de test van internet of van de opmaak van die site afhangt. `onRequest` ziet de overige verzoeken.
// `ready`: wacht tot Kamelo in de pagina draait (standaard: tot het afschermen reageert, alleen in Kamelo for teams).
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

// Kamelo is klaar zodra het content script reageert op een kopieerverzoek (zie net-main.js en content.js).
export async function waitForKamelo(page, timeout = 10_000) {
  await page.waitForFunction(() => new Promise(resolve => {
    const id = Math.random().toString(36).slice(2);
    const done = e => { try { if (JSON.parse(e.detail).id === id) resolve(true); } catch {} };
    document.addEventListener('pf:restored', done, { once: true });
    document.dispatchEvent(new CustomEvent('pf:restore', { detail: JSON.stringify({ id, text: '' }) }));
    setTimeout(() => resolve(false), 200);
  }), { timeout, polling: 250 });
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
