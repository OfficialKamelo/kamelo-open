// Draai met: npm run test:browser
// De gratis editie (tools/pack.mjs zonder --teams) in een echte Chrome: geen afschermen, wel de melding bij een
// persoonlijk onderwerp met de tijdelijke chat en Private Chat, en alleen op AI-chatsites.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../tools/pack.mjs';
import { launch, mockPage, paste, textOf, waitForShadow, shadowHTML, clickText, SAMPLE, fakeLanguageModel, askMelo } from './kamelo.mjs';

const CHAT = `<!doctype html><title>Chat</title>
<main><div id="answer"></div></main>
<form><div id="prompt-textarea" contenteditable="true"></div><button type="submit" aria-label="Send">↑</button></form>`;
const SHOP = `<!doctype html><title>Shop</title>
<textarea id="assistant" placeholder="Ask AI about this product"></textarea>`;
const HEALTH = `I have been struggling with depression lately. My name is ${SAMPLE.name}, IBAN ${SAMPLE.iban}.`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-public-'));
let browser, worker, downloads;
before(async () => {
  build(path.join(dir, 'ext'));
  ({ browser, worker, downloads } = await launch({ extension: path.join(dir, 'ext') }));
});
after(async () => { await browser?.close(); fs.rmSync(dir, { recursive: true, force: true }); });

// Kamelo draait in het tabblad zodra het content script antwoordt op de vraag van de popup (pf:status).
const running = url => worker.evaluate(async url => {
  const [tab] = await chrome.tabs.query({ url });
  if (!tab) return false;
  try { return !!(await chrome.tabs.sendMessage(tab.id, { type: 'pf:status' })); } catch { return false; }
}, url);
const ready = url => async () => {
  const end = Date.now() + 10_000;
  while (Date.now() < end) { if (await running(url)) return; await new Promise(r => setTimeout(r, 200)); }
  throw new Error(`Kamelo draait niet op ${url}`);
};

// Zoals een gebruiker plakt: het paste-event, en daarna de tekst in het veld (de pagina zelf voegt hem in).
async function pasteText(page, selector, text) {
  const taken = await paste(page, selector, text);
  if (!taken) await page.$eval(selector, (el, text) => { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }, text);
  return taken;
}

test('gratis: de editie is public en laadt niets om af te schermen', async () => {
  assert.equal(await worker.evaluate(() => globalThis.KameloEdition), 'public');
  assert.equal(await worker.evaluate(() => typeof globalThis.PrivacyDetector), 'undefined');
  const m = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.ok(!JSON.stringify(m).includes('<all_urls>'));
  assert.doesNotMatch(m.name, /teams/i);
});

test('gratis: een persoonlijk onderwerp geeft de melding met tijdelijke chat en Private Chat; er wordt niets afgeschermd', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT, undefined, ready('https://chatgpt.com/'));
  const taken = await pasteText(page, '#prompt-textarea', HEALTH);
  assert.equal(taken, false, 'Kamelo nam het plakken over');
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  assert.match(html, /Temporary chat|Tijdelijke chat/);
  assert.match(html, /Ask Melo|Vraag het Melo/); // Private Chat, alleen in Chrome
  assert.match(html, /class="p melo"><svg viewBox="0 -18 240 240"/); // met het Melo-logo
  assert.doesNotMatch(html, /\[PERSON_|\[IBAN_|protected|afgeschermd|mask/i);
  await new Promise(r => setTimeout(r, 400));
  const text = await textOf(page, '#prompt-textarea');
  assert.ok(text.includes(SAMPLE.name) && text.includes(SAMPLE.iban), text);
  assert.equal(await page.evaluate(() => CSS.highlights.size), 0, 'markeringen in de pagina');
  await page.close();
});

test('gratis: in Edge en Firefox zegt de melding eerlijk waarom er een tijdelijke chat is in plaats van Private Chat', async () => {
  // ?browser=edge: strings.js doet dan of dit Edge is (zoals in de previews).
  const url = 'https://chatgpt.com/c/edge?browser=edge';
  const page = await mockPage(browser, url, CHAT, undefined, ready(url));
  await pasteText(page, '#prompt-textarea', HEALTH);
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  assert.match(html, /Edge doesn’t have a built-in AI that Kamelo can use yet|Edge heeft nog geen ingebouwde AI die Kamelo kan gebruiken/);
  assert.doesNotMatch(html, /Ask Melo|Vraag het Melo/);
  await page.close();
});

test('gratis: ook tijdens typen komt de melding', async () => {
  const page = await mockPage(browser, 'https://claude.ai/new', CHAT.replace('id="prompt-textarea"', 'id="prompt-textarea" data-testid="chat-input"'),
    undefined, ready('https://claude.ai/new'));
  await page.click('#prompt-textarea');
  await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  assert.match(html, /Temporary chat|Tijdelijke chat/);
  await page.close();
});

test('gratis: na een leeg veld (verstuurd of gewist) komt de melding bij het volgende bericht terug', async () => {
  const page = await mockPage(browser, 'https://claude.ai/chat/2', CHAT.replace('id="prompt-textarea"', 'id="prompt-textarea" data-testid="chat-input"'),
    undefined, ready('https://claude.ai/chat/2'));
  // Zichtbaar = de kaart heeft de klasse "show" (verborgen blijft hij in de DOM staan).
  const visible = h => /class="t card(?: light)? show"/.test(h);
  const shown = () => waitForShadow(page, visible, 6_000);
  const hidden = () => waitForShadow(page, h => !visible(h), 3_000);
  const close = () => page.keyboard.press('Escape');
  await page.click('#prompt-textarea');
  await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  assert.ok(visible(await shown()), 'eerste melding');
  await close();
  assert.ok(!visible(await hidden()), 'melding gesloten');
  // Zoals na versturen: de site maakt het veld zelf leeg, zonder input-event.
  await page.$eval('#prompt-textarea', el => { el.textContent = ''; });
  await new Promise(r => setTimeout(r, 1600));
  await page.click('#prompt-textarea');
  await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  assert.ok(visible(await shown()), 'melding komt terug bij het volgende bericht');
  await page.close();
});

test('gratis: "Tijdelijke chat" neemt de tekst ongewijzigd mee naar een tijdelijke chat', async () => {
  const temp = 'https://chatgpt.com/?temporary-chat=true';
  const page = await mockPage(browser, 'https://chatgpt.com/c/public', CHAT, req => {
    if (req.url() === temp) req.respond({ status: 200, contentType: 'text/html', body: CHAT });
  }, ready('https://chatgpt.com/c/public'));
  await pasteText(page, '#prompt-textarea', HEALTH);
  await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), clickText(page, /^(Temporary chat|Tijdelijke chat)$/)]);
  assert.equal(page.url(), temp);
  await page.waitForFunction(() => document.querySelector('#prompt-textarea').innerText.includes('depression'), { timeout: 10_000 });
  const text = await textOf(page, '#prompt-textarea');
  assert.ok(text.includes(SAMPLE.name), `niet ongewijzigd: ${text}`);
  assert.doesNotMatch(text, /\[PERSON_/);
  await page.close();
});

test('gratis: verzoeken aan een AI-API gaan ongewijzigd weg (geen netwerkfilter)', async () => {
  let body = null;
  const page = await mockPage(browser, 'https://chatgpt.com/c/api', CHAT, req => {
    if (req.url().startsWith('https://api.openai.com/')) body = req.postData() ?? body;
  }, ready('https://chatgpt.com/c/api'));
  await page.evaluate(text => fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: text }] }) }).catch(() => {}), SAMPLE.text);
  await new Promise(r => setTimeout(r, 500));
  assert.ok(body?.includes(SAMPLE.name), `verzoek: ${body}`);
  await page.close();
});

// Tweede kans (src/topic-ai.js): de woordenlijst mist deze zin; de AI van Chrome op dit apparaat (hier nagebootst in
// de achtergrond) herkent hem wel. Zonder model ('downloadable') wordt er niets gedownload en komt er geen melding.
const MISSED = 'Lately everything feels pointless and I cannot get out of bed in the morning';
const fakeModel = (state, answer) => worker.evaluate((state, answer) => {
  const calls = globalThis.__lmCalls = { availability: 0, create: 0, prompt: [] };
  const session = () => ({ clone: async () => session(), prompt: async t => { calls.prompt.push(t); return answer; }, destroy() {} });
  globalThis.LanguageModel = {
    availability: async () => { calls.availability++; return state; },
    create: async () => { calls.create++; return session(); },
  };
}, state, answer);
const lmCalls = () => worker.evaluate(() => globalThis.__lmCalls);

test('gratis: de AI van Chrome bestaat in de achtergrond (service worker) van de extensie', async () => {
  assert.equal(await worker.evaluate(() => typeof LanguageModel), 'function');
});

test('gratis: mist de woordenlijst een persoonlijk onderwerp, dan vraagt Kamelo de AI op dit apparaat', async () => {
  await fakeModel('available', '{"personal":true,"topic":"MENTAL"}');
  const page = await mockPage(browser, 'https://chatgpt.com/c/device', CHAT, undefined, ready('https://chatgpt.com/c/device'));
  await page.click('#prompt-textarea');
  await page.keyboard.type(MISSED);
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 8_000);
  assert.match(html, /Temporary chat|Tijdelijke chat/);
  const calls = await lmCalls();
  assert.equal(calls.prompt.length, 1, 'één vraag na de pauze, niet per toetsaanslag');
  assert.equal(calls.prompt[0], MISSED);
  await page.close();
});

test('gratis: vindt de woordenlijst het al, dan wordt de AI niet gevraagd', async () => {
  await fakeModel('available', '{"personal":true,"topic":"MENTAL"}');
  const page = await mockPage(browser, 'https://chatgpt.com/c/words', CHAT, undefined, ready('https://chatgpt.com/c/words'));
  await page.click('#prompt-textarea');
  await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await new Promise(r => setTimeout(r, 1500));
  assert.equal((await lmCalls()).availability, 0);
  await page.close();
});

test('gratis: model nog niet op dit apparaat: geen download, geen melding', async () => {
  await fakeModel('downloadable', '{"personal":true,"topic":"MENTAL"}');
  const page = await mockPage(browser, 'https://chatgpt.com/c/nomodel', CHAT, undefined, ready('https://chatgpt.com/c/nomodel'));
  await page.click('#prompt-textarea');
  await page.keyboard.type(MISSED);
  await new Promise(r => setTimeout(r, 3000));
  const calls = await lmCalls();
  assert.equal(calls.availability, 1);
  assert.equal(calls.create, 0, 'create() zou een download starten');
  assert.doesNotMatch(await shadowHTML(page), /Temporary chat|Tijdelijke chat/);
  await page.close();
});

test('gratis: op een gewone site draait Kamelo niet, ook niet in AI-velden', async () => {
  const page = await mockPage(browser, 'https://shop.example/', SHOP, undefined, async () => {});
  await new Promise(r => setTimeout(r, 800));
  assert.equal(await running('https://shop.example/'), false);
  assert.equal(await paste(page, '#assistant', HEALTH), false);
  await new Promise(r => setTimeout(r, 1500));
  assert.doesNotMatch(await shadowHTML(page), /Temporary chat|Tijdelijke chat|Sensitive topic|Gevoelig onderwerp/);
  await page.close();
});

test('gratis: de popup toont alleen Beschermd, Private Chat en een tijdelijke chat', async () => {
  const id = new URL(worker.url()).host;
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${id}/popup/public.html`);
  await page.waitForFunction(() => document.getElementById('stateText').textContent);
  const text = await page.evaluate(() => document.body.innerText);
  assert.match(text, /\bOn\b|\bAan\b/); // de gratis editie schermt niets af: "Aan", niet "Beschermd" (testpanel 13 okt)
  // Eén schild tegelijk, en een blauwe schakelaar als Kamelo aan staat (de stijl staat in public.css, niet in popup.css).
  await new Promise(r => setTimeout(r, 400)); // de schakelaar kleurt met een overgang
  const look = await page.evaluate(() => ({ icons: [...document.querySelectorAll('#state svg')].filter(s => getComputedStyle(s).display !== 'none').length,
    track: getComputedStyle(document.querySelector('#enabled + .track')).backgroundColor, on: document.getElementById('enabled').checked }));
  assert.equal(look.icons, 1);
  assert.equal(/rgba\(120, 120, 128/.test(look.track), !look.on);
  assert.match(text, /Start a temporary chat|Begin een tijdelijke chat/);
  assert.match(text, /Melo/);
  assert.doesNotMatch(text, /Vault|Kluis|Mask text|Tekst afschermen|protected this month|Warn about|Waarschuwen|Privacy|Report|Probleem/);
  // Uitzetten schrijft alleen "enabled" terug, niets van het afschermen.
  await page.click('#enabled');
  await new Promise(r => setTimeout(r, 200));
  const { settings } = await worker.evaluate(() => chrome.storage.local.get('settings'));
  assert.equal(settings.enabled, false);
  assert.deepEqual(Object.keys(settings), ['enabled']);
  await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: true } }));
  await page.close();
});

// ---------- Melo's onderdelen (chat/rich.js): brief met invulvelden, checklist ----------
test('gratis: Melo tekent een brief met invulvelden en een checklist; wat je invult gaat nooit naar de AI, wel mee naar Word', async () => {
  const id = new URL(worker.url()).host;
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(fakeLanguageModel, [
    // geen blok eromheen: Kamelo zet de brief er zelf in
    'Beste [naam huisbaas],\n\nDe verwarming in mijn woning aan de [adres] doet het sinds [datum] niet meer. Wilt u een monteur sturen?\n\nMet vriendelijke groet,\n\n[je naam]',
    'Prima, hier is hij wat formeler.',
    '```checklist\ntitle: Naar de huisarts\n- Verzekeringspas\n- Lijst met medicijnen\n- Je vragen op papier\n```',
    '```decision\ncriteria: a | b\nX: 1 | 2\nY: 2 | 1\n```',
  ]);
  await page.goto(`chrome-extension://${id}/chat/chat.html?lang=nl&engine=device`);
  await page.waitForFunction(() => document.documentElement.dataset.engine === 'device', { timeout: 5000 });
  assert.equal(await page.evaluate(() => typeof globalThis.KameloRich.kit.h), 'function');
  assert.equal(await page.evaluate(() => KameloRich.partOf('decision', ['letter', 'checklist', 'steps', 'compare'])), null);

  await askMelo(page, 'Schrijf een korte brief aan mijn huisbaas dat de verwarming kapot is.');
  assert.match(await page.evaluate(() => window.lm.sent[0]), /```letter/, 'het formaat gaat mee met deze vraag');
  assert.match(await textOf(page, '.part.letter .ph'), /Brief\s*0\/4/);
  assert.equal(await page.$eval('.part.letter .pp', p => p.title), 'Nog 4 in te vullen');
  assert.equal(await page.$eval('.part.letter .ring .rf', c => c.getAttribute('stroke-dashoffset')), await page.$eval('.part.letter .ring .rf', c => c.getAttribute('stroke-dasharray')), 'lege ring');
  await page.type('.part.letter input[data-k="datum"]', '3 maart');
  await page.type('.part.letter input[data-k="je naam"]', 'Anna de Boer');
  assert.equal(await page.$eval('.part.letter .pp', p => p.title), 'Nog 2 in te vullen');
  assert.match(await textOf(page, '.part.letter .ppt'), /2\/4/);
  assert.ok(+await page.$eval('.part.letter .ring .rf', c => c.getAttribute('stroke-dashoffset')) < 30, 'de ring loopt mee');
  assert.equal(await page.$eval('.part.letter input[data-k="datum"]', i => i.classList.contains('on')), true);
  // Word: met wat er is ingevuld (de docx is een zip zonder compressie, dus de tekst staat er leesbaar in)
  const before = new Set(fs.readdirSync(downloads));
  await page.$$eval('.a .tool', bs => bs.find(b => /Word/.test(b.textContent)).click());
  let file = null;
  for (let k = 0; k < 50 && !file; k++) { await new Promise(r => setTimeout(r, 100)); file = fs.readdirSync(downloads).find(f => !before.has(f) && f.endsWith('.docx')); }
  assert.ok(file, 'geen Word-bestand');
  const docx = fs.readFileSync(path.join(downloads, file), 'latin1');
  assert.match(docx, /sinds 3 maart niet meer/);
  assert.match(docx, /Anna de Boer/);
  assert.match(docx, /aan de \[adres\]/);

  // Een vervolgvraag: wat er is ingevuld, staat nergens in wat naar de AI gaat.
  await askMelo(page, 'Maak hem wat formeler.');
  const toAi = await page.evaluate(() => [...window.lm.sent, ...window.lm.initial].join('\n'));
  assert.ok(!toAi.includes('3 maart') && !toAi.includes('Anna de Boer'), 'ingevulde gegevens gingen naar de AI');

  await askMelo(page, 'Wat neem ik mee naar de huisarts? Maak een checklist.');
  assert.match(await page.evaluate(() => window.lm.sent.at(-1)), /```checklist/);
  assert.equal(await page.$eval('.part.checklist .pp', p => p.title), '0 van 3 klaar');
  await page.$eval('.part.checklist label.ck input', i => i.click()); // page.click wacht op een beeldje (het tabblad staat op de achtergrond)
  assert.equal(await page.$eval('.part.checklist .pp', p => p.title), '1 van 3 klaar');
  assert.match(await textOf(page, '.part.checklist .ppt'), /1\/3/);
  assert.equal(await page.$eval('.part.checklist label.ck', l => l.classList.contains('done')), true);

  // Een onderdeel van Business bestaat hier niet: gewone tekst, geen kaart en geen codeblok.
  await askMelo(page, 'En verder?');
  assert.equal(await page.$$eval('.thread:not([hidden]) .a', as => as.at(-1).querySelectorAll('.part, pre').length), 0);
  await page.close();
});
