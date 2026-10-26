// Draai met: node --test tests/browser/mac.test.mjs (zit in npm run test:browser)
// Melo voor Mac (src/background.js, repo melo-mac): "Ask Melo" stuurt de vraag via native messaging naar het programma
// melo-brug in Melo.app. Hier speelt een klein Node-programma melo-brug na (het schrijft elk bericht weg en zegt ok), zodat
// de test niet van Melo.app afhangt. Met MELO_BRUG=<pad naar melo-brug> praat de test met de echte (die opent Melo).
// Chrome zoekt het manifest van het programma in <profiel>/NativeMessagingHosts; zo raakt de test je eigen Chrome niet.
// Het recht nativeMessaging is in de winkel optioneel (je zet het aan in de popup); hier staat het vast in het manifest,
// omdat een test de vraag van Chrome niet kan wegklikken.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../tools/pack.mjs';
import { launch, mockPage, paste, textOf, waitForShadow, clickText } from './kamelo.mjs';

const CHAT = `<!doctype html><title>Chat</title>
<main><div id="answer"></div></main>
<form><div id="prompt-textarea" contenteditable="true"></div><button type="submit" aria-label="Send">↑</button></form>`;
const HEALTH = 'I have been struggling with depression lately and I do not know who to talk to.';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-mac-'));
const log = path.join(dir, 'berichten.jsonl');
let browser, worker, profile, id;

// De nep-melo-brug: leest één bericht (4 bytes lengte + JSON), schrijft het weg, antwoordt { ok: true }.
function fakeHost() {
  const js = path.join(dir, 'brug.mjs');
  fs.writeFileSync(js, `import fs from 'node:fs';
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {});
const tick = setInterval(() => {
  const b = Buffer.concat(chunks);
  if (b.length < 4 || b.length < 4 + b.readUInt32LE(0)) return;
  clearInterval(tick);
  fs.appendFileSync(${JSON.stringify(log)}, b.subarray(4, 4 + b.readUInt32LE(0)).toString() + '\\n');
  const out = Buffer.from(JSON.stringify({ ok: true }));
  const head = Buffer.alloc(4); head.writeUInt32LE(out.length);
  process.stdout.write(Buffer.concat([head, out]), () => process.exit(0));
}, 10);
`);
  const sh = path.join(dir, 'melo-brug');
  fs.writeFileSync(sh, `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`, { mode: 0o755 });
  return sh;
}
const messages = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []);
function installHost(on = true) {
  const file = path.join(profile, 'NativeMessagingHosts', 'eu.kamelo.melo.json');
  fs.rmSync(file, { force: true });
  if (!on) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ name: 'eu.kamelo.melo', description: 'Melo', path: process.env.MELO_BRUG || fakeHost(), type: 'stdio', allowed_origins: [`chrome-extension://${id}/`] }));
}
const setMac = on => worker.evaluate(async on => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...settings, meloMac: on } });
  globalThis.LanguageModel = undefined; // geen AI van Chrome: alleen Melo voor Mac kan antwoorden
}, on);

before(async () => {
  const ext = path.join(dir, 'ext');
  build(ext);
  const mf = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8'));
  assert.ok(mf.optional_permissions.includes('nativeMessaging'), 'in de winkel optioneel');
  mf.permissions.push('nativeMessaging', 'contextMenus');
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(mf));
  ({ browser, worker, profile } = await launch({ extension: ext }));
  id = new URL(worker.url()).host;
});
after(async () => { await browser?.close(); fs.rmSync(dir, { recursive: true, force: true }); });

async function notice(url) {
  const page = await mockPage(browser, url, CHAT, undefined, async p => { await p.waitForFunction(() => true); await new Promise(r => setTimeout(r, 800)); });
  if (!(await paste(page, '#prompt-textarea', HEALTH))) await page.$eval('#prompt-textarea', (el, t) => { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }, HEALTH);
  return { page, html: await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 8_000) };
}

test('Melo voor Mac aan: "Ask Melo" ook zonder AI van Chrome, en de klik stuurt de vraag naar de app', async () => {
  installHost(true);
  await setMac(true);
  const { page, html } = await notice('https://chatgpt.com/c/mac-aan');
  assert.match(html, /Ask Melo|Vraag het Melo/);
  await clickText(page, /^(Ask Melo|Vraag het Melo)$/);
  const end = Date.now() + 5000;
  while (!messages().some(m => m.type === 'vraag') && Date.now() < end) await new Promise(r => setTimeout(r, 100));
  const vraag = messages().find(m => m.type === 'vraag');
  if (!process.env.MELO_BRUG) {
    assert.ok(vraag, JSON.stringify(messages()));
    assert.equal(vraag.tekst, HEALTH);
    assert.equal(typeof vraag.direct, 'boolean');
    assert.ok(messages().some(m => m.type === 'ping'), 'eerst gevraagd of Melo er is');
  }
  // Het veld is leeg: de vraag staat nu in Melo, niet meer klaar om naar de AI-site te gaan.
  await page.waitForFunction(() => !document.querySelector('#prompt-textarea').textContent.trim(), { timeout: 3000 });
  assert.equal(await textOf(page, '#prompt-textarea'), '');
  await page.close();
});

test('Melo, doe hier iets mee: het menu staat er alleen met Melo voor Mac aan', async () => {
  const menu = on => worker.evaluate(async () => {
    const echt = chrome.contextMenus.create, ids = [];
    chrome.contextMenus.create = (p, cb) => { ids.push(p.id); return echt.call(chrome.contextMenus, p, cb); };
    try { await doeMenu(); } finally { chrome.contextMenus.create = echt; }
    return ids;
  });
  installHost(true);
  await setMac(true);
  assert.deepEqual(await menu(), ['melo', 'melo-agenda', 'melo-herinner', 'melo-rekening']);
  await setMac(false);
  assert.deepEqual(await menu(), []);
});

test('Melo, doe hier iets mee: de gekozen tekst gaat met de opdracht ervoor naar Melo voor Mac', async () => {
  fs.rmSync(log, { force: true });
  installHost(true);
  await setMac(true);
  const tekst = 'Tandarts dinsdag 4 november om 14:30, Dorpsstraat 12';
  assert.equal(await worker.evaluate(t => doeKlikt({ menuItemId: 'melo-agenda', selectionText: t }), tekst), true);
  if (!process.env.MELO_BRUG) {
    const vraag = messages().find(m => m.type === 'vraag');
    assert.ok(vraag, JSON.stringify(messages()));
    assert.match(vraag.tekst, /^(Put this in my calendar:|Zet dit in mijn agenda:)\n\nTandarts dinsdag/);
    assert.equal(vraag.direct, true);
    assert.equal(vraag.actie, 'agenda');
  }
  // Iets anders dan de drie, of geen tekst: niets.
  assert.equal(await worker.evaluate(() => doeKlikt({ menuItemId: 'melo-iets', selectionText: 'x' })), false);
  assert.equal(await worker.evaluate(() => doeKlikt({ menuItemId: 'melo-rekening', selectionText: '  ' })), false);
});

test('Melo voor Mac uit, op een Mac: de melding biedt "Vraag het Melo op je Mac"', { skip: process.platform !== 'darwin' }, async () => {
  installHost(true);
  await setMac(false);
  const { page, html } = await notice('https://chatgpt.com/c/mac-tip');
  assert.match(html, /Ask Melo on your Mac|Vraag het Melo op je Mac/);
  await page.close();
});

test('Melo voor Mac aan: geen "op je Mac"-knop, dan gewoon "Ask Melo"', async () => {
  installHost(true);
  await setMac(true);
  const { page, html } = await notice('https://chatgpt.com/c/mac-tip-aan');
  assert.doesNotMatch(html, /on your Mac|op je Mac/);
  await page.close();
});

test('Melo voor Mac uit: geen bericht naar het programma, en zonder AI van Chrome geen "Ask Melo"', async () => {
  fs.rmSync(log, { force: true });
  installHost(true);
  await setMac(false);
  const { page, html } = await notice('https://chatgpt.com/c/mac-uit');
  assert.doesNotMatch(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/);
  assert.deepEqual(messages(), []);
  await page.close();
});

test('Melo voor Mac aan, maar niet geïnstalleerd: geen "Ask Melo" (geen knop die niets doet)', async () => {
  installHost(false);
  await setMac(true);
  const { page, html } = await notice('https://chatgpt.com/c/mac-weg');
  assert.doesNotMatch(html, /Ask Melo|Vraag het Melo/);
  await page.close();
});

test('popup: op een Mac de rij Melo voor Mac; aan zonder app zegt hij waar je hem aanzet, met app wordt Melo de app', async () => {
  const popup = async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${id}/popup/public.html?lang=en`);
    await page.waitForFunction(() => document.getElementById('stateText').textContent);
    await new Promise(r => setTimeout(r, 500)); // het antwoord van de achtergrond
    const look = await page.evaluate(() => ({ mac: document.getElementById('macList').checkVisibility(), on: document.getElementById('meloMac').checked,
      sub: document.getElementById('macSub').textContent, melo: document.getElementById('openPrivateChat').checkVisibility() }));
    await page.close();
    return look;
  };
  installHost(false);
  await setMac(true);
  const weg = await popup();
  assert.equal(weg.mac, process.platform === 'darwin', 'alleen op een Mac');
  assert.equal(weg.on, true);
  assert.match(weg.sub, /Settings → Connections/);
  assert.equal(weg.melo, false, 'geen Melo-knop die niets doet');
  installHost(true);
  await setMac(true);
  const er = await popup();
  assert.match(er.sub, /Answers in the app on this Mac/);
  assert.equal(er.melo, true, 'Melo opent nu de app');
});
