// Draai met: npm run test:browser
// De gratis editie (tools/pack.mjs zonder --teams) in een echte Chrome: geen afschermen, wel de melding bij een
// persoonlijk onderwerp met de tijdelijke chat en Private Chat, en alleen op AI-chatsites.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../tools/pack.mjs';
import { launch, mockPage, paste, textOf, waitForShadow, shadowHTML, clickText, noticeRect, SAMPLE, fakeLanguageModel, askMelo } from './kamelo.mjs';

const CHAT = `<!doctype html><title>Chat</title>
<main><div id="answer"></div></main>
<form><div id="prompt-textarea" contenteditable="true"></div><button type="submit" aria-label="Send">↑</button></form>`;
const SHOP = `<!doctype html><title>Shop</title>
<textarea id="assistant" placeholder="Ask AI about this product"></textarea>`;
// Zonder IBAN: een IBAN geeft in de gratis editie eerst de melding over gevoelige gegevens (zie de tests onderaan).
const HEALTH = `I have been struggling with depression lately. My name is ${SAMPLE.name}.`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-public-'));
let browser, worker, downloads;
before(async () => {
  build(path.join(dir, 'ext'));
  ({ browser, worker, downloads } = await launch({ extension: path.join(dir, 'ext') }));
  // De echte AI van Chrome, vóór een test hem nabootst (fakeModel) of weghaalt.
  await worker.evaluate(() => { globalThis.__realLM = globalThis.LanguageModel; });
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

// De knoppen in Kamelo's melding (gesloten shadow root) met hun plek, via CDP.
async function buttonBoxes(page) {
  const cdp = await page.createCDPSession();
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    const found = [];
    const walk = (node, inShadow) => {
      if (inShadow && node.nodeName === 'BUTTON') found.push(node);
      for (const c of node.children || []) walk(c, inShadow);
      for (const sr of node.shadowRoots || []) walk(sr, true);
    };
    walk(root, false);
    const out = [];
    for (const n of found) {
      const label = (n.children || []).filter(c => c.nodeType === 3).map(c => c.nodeValue).join('').trim();
      const { model } = await cdp.send('DOM.getBoxModel', { nodeId: n.nodeId }).catch(() => ({}));
      if (!model) continue;
      const xs = model.border.filter((_, i) => i % 2 === 0);
      out.push({ label, x: Math.min(...xs), width: Math.max(...xs) - Math.min(...xs) });
    }
    return out;
  } finally { await cdp.detach(); }
}

test('gratis: de editie is public en laadt niets om af te schermen', async () => {
  assert.equal(await worker.evaluate(() => globalThis.KameloEdition), 'public');
  assert.equal(await worker.evaluate(() => typeof globalThis.PrivacyDetector), 'undefined');
  const m = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.ok(!JSON.stringify(m).includes('<all_urls>'));
  assert.doesNotMatch(m.name, /teams/i);
});

test('gratis: een persoonlijk onderwerp geeft de melding met tijdelijke chat en Private Chat; er wordt niets afgeschermd', async () => {
  await fakeModel('available', '{"personal":false,"topic":"NONE"}'); // de AI van Chrome draait hier (anders geen "Ask Melo")
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT, undefined, ready('https://chatgpt.com/'));
  const taken = await pasteText(page, '#prompt-textarea', HEALTH);
  assert.equal(taken, false, 'Kamelo nam het plakken over');
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  assert.match(html, /Temporary chat|Tijdelijke chat/);
  assert.match(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/); // Private Chat, alleen in Chrome
  assert.match(html, /class="p melo"><svg viewBox="0 -18 240 240"/); // met het Melo-logo
  assert.doesNotMatch(html, /\[PERSON_|\[IBAN_|protected|afgeschermd|mask/i);
  await new Promise(r => setTimeout(r, 400));
  const text = await textOf(page, '#prompt-textarea');
  assert.ok(text.includes(SAMPLE.name), text);
  // Sinds 21 okt registreert de gratis editie een markeerlaag voor gevoelige gegevens (blauw); bij alleen een naam blijft die leeg.
  assert.equal(await page.evaluate(() => [...CSS.highlights.values()].reduce((n, h) => n + h.size, 0)), 0, 'markeringen in de pagina');
  await page.close();
});

// Sinds 21 okt (83928ba) is de melding kort: "Sensitive info" en de knoppen, zonder uitlegzin. In Edge en Firefox (zonder
// Melo voor Mac) is de tijdelijke chat dan de hoofdknop.
test('gratis: in Edge en Firefox biedt de melding de tijdelijke chat in plaats van Melo', async () => {
  // ?browser=edge: strings.js doet dan of dit Edge is (zoals in de previews).
  const url = 'https://chatgpt.com/c/edge?browser=edge';
  const page = await mockPage(browser, url, CHAT, undefined, ready(url));
  await pasteText(page, '#prompt-textarea', HEALTH);
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  assert.match(html, /<button type="button" class="p">(Temporary chat|Tijdelijke chat)<\/button>/);
  assert.match(html, /<b>(Sensitive info|Gevoelige info)<\/b>/);
  assert.doesNotMatch(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/);
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

// Gemini heeft geen adres voor een tijdelijke chat maar een knop (temp-chat-button). Is die er niet (niet ingelogd, of
// hernoemd) of opent hij niets, dan moet de vraag terug in het veld: eerst was het veld leeg en de vraag weg (audit 17 okt).
const GEMINI = (button = '') => `<!doctype html><title>Gemini</title>
<chat-window><rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea></chat-window>${button}`;
const geminiText = page => page.$eval('.ql-editor', el => el.innerText);

test('gratis: Gemini zonder knop voor een tijdelijke chat: de vraag komt terug in het veld', async () => {
  const chat = 'https://gemini.google.com/app/1a2b3c4d5e6f7a8b';
  const page = await mockPage(browser, chat, GEMINI(), req => {
    if (req.url() === 'https://gemini.google.com/app') req.respond({ status: 200, contentType: 'text/html', body: GEMINI() });
  }, ready(chat));
  await pasteText(page, '.ql-editor', HEALTH);
  await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), clickText(page, /^(Temporary chat|Tijdelijke chat)$/)]);
  assert.equal(page.url(), 'https://gemini.google.com/app');
  // De knop wordt 10 s gezocht (Gemini laadt traag), daarna staat de vraag er weer.
  await page.waitForFunction(() => document.querySelector('.ql-editor')?.innerText.includes('depression'), { timeout: 20_000 })
    .catch(() => {});
  const text = await geminiText(page);
  assert.ok(text.includes('depression') && text.includes(SAMPLE.name), `vraag weg: "${text}"`);
  const html = await waitForShadow(page, h => /Couldn’t open a temporary chat|De tijdelijke chat ging niet open/.test(h), 3_000);
  assert.match(html, /Couldn’t open a temporary chat|De tijdelijke chat ging niet open/);
  // De melding komt niet meteen terug, en biedt hier geen tijdelijke chat meer aan (die werkt hier niet).
  await new Promise(r => setTimeout(r, 1500));
  assert.doesNotMatch(await shadowHTML(page), />(Temporary chat|Tijdelijke chat)</);
  await page.close();
});

test('gratis: Gemini-knop opent geen tijdelijke chat: de vraag komt terug in het veld', async () => {
  const page = await mockPage(browser, 'https://gemini.google.com/app', GEMINI('<temp-chat-button><button aria-label="Temporary chat">tmp</button></temp-chat-button>'),
    undefined, ready('https://gemini.google.com/app'));
  await pasteText(page, '.ql-editor', HEALTH);
  await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await clickText(page, /^(Temporary chat|Tijdelijke chat)$/);
  await page.waitForFunction(() => document.querySelector('.ql-editor')?.innerText.includes('depression'), { timeout: 12_000 })
    .catch(() => {});
  const text = await geminiText(page);
  assert.ok(text.includes('depression'), `vraag weg: "${text}"`);
  await page.close();
});

// De gratis melding komt bij elk bericht terug. "Niet meer in dit gesprek" zet hem uit voor dit tabblad en dit gesprek,
// alleen in het geheugen: niets in chrome.storage, en een ander gesprek krijgt hem weer.
test('gratis: "Niet meer in dit gesprek" zet de melding uit tot een ander gesprek, zonder iets te bewaren', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT, undefined, ready('https://chatgpt.com/'));
  const visible = h => /class="t card(?: light)? show"/.test(h);
  const before = await worker.evaluate(() => chrome.storage.local.get(null));
  const ask = async () => {
    await page.$eval('#prompt-textarea', el => { el.textContent = ''; });
    await new Promise(r => setTimeout(r, 1300)); // zoals na versturen: leeg veld, de melding mag weer
    await page.click('#prompt-textarea');
    await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  };
  await ask();
  const html = await waitForShadow(page, visible, 6_000);
  assert.ok(visible(html), 'eerste melding');
  assert.match(html, /class="q">(Don’t show in this chat|Niet meer in dit gesprek)</);
  await clickText(page, /^(Don’t show in this chat|Niet meer in dit gesprek)$/);
  assert.ok(!visible(await waitForShadow(page, h => !visible(h), 2_000)), 'melding blijft staan');

  await ask();
  await new Promise(r => setTimeout(r, 2500));
  assert.ok(!visible(await shadowHTML(page)), 'melding terug in hetzelfde gesprek');
  // Na het eerste bericht krijgt een nieuwe chat een eigen adres: nog steeds hetzelfde gesprek.
  await page.evaluate(() => history.pushState(null, '', '/c/68f1a2b3-0c4d-8e5f-9a0b-1c2d3e4f5a6b'));
  await ask();
  await new Promise(r => setTimeout(r, 2500));
  assert.ok(!visible(await shadowHTML(page)), 'melding terug na het eerste bericht (nieuw adres)');
  assert.deepEqual(await worker.evaluate(() => chrome.storage.local.get(null)), before, 'er is iets bewaard');

  // Een ander gesprek: de melding is er weer.
  await page.evaluate(() => history.pushState(null, '', '/c/77aa0000-1111-2222-3333-444455556666'));
  await ask();
  assert.ok(visible(await waitForShadow(page, visible, 6_000)), 'geen melding in een ander gesprek');
  await page.close();
});

test('gratis: in het Frans past elke knop van de melding in de kaart, ook als het venster smal is (zoals bij 200% zoom)', async () => {
  const url = 'https://chatgpt.com/c/fr?lang=fr';
  const page = await mockPage(browser, url, CHAT, undefined, ready(url));
  await page.setViewport({ width: 360, height: 700 }); // zoals 200% zoom in een smal venster
  await pasteText(page, '#prompt-textarea', HEALTH);
  await waitForShadow(page, h => /Discussion temporaire/.test(h), 6_000);
  await new Promise(r => setTimeout(r, 400)); // de kaart schuift in beeld
  const boxes = await buttonBoxes(page);
  const card = await noticeRect(page);
  assert.ok(card && boxes.length >= 3, `kaart ${JSON.stringify(card)}, knoppen ${boxes.length}`);
  for (const b of boxes) assert.ok(b.x >= card.left - 1 && b.x + b.width <= card.right + 1, `"${b.label}" valt buiten de kaart (${JSON.stringify({ b, card })})`);
  assert.ok(boxes.some(b => b.label === 'Discussion temporaire'));
  await page.close();
});

// WhatsApp Web, nagebouwd: links de chats, rechts (#main) de open chat met kop en invoerveld. Wisselen van chat vervangt
// #main, zoals WhatsApp doet. Meta AI is een chat zoals elke andere; Kamelo mag alleen daar iets doen.
const WHATSAPP = `<!doctype html><title>WhatsApp</title>
<div id="app"><div id="side"><button id="to-meta">Meta AI</button><button id="to-anna">Anna</button></div><div id="slot"></div></div>
<script>
  // Zoals de echte pagina op 17 okt 2026: de naam in de kop (Meta AI met een label "AI" ernaast), het invoerveld met de
  // naam van de chat in zijn label.
  const chat = (name, id) => '<div id="main"><header><div title="Profielgegevens" role="button"><span dir="auto">' + name +
    '</span>' + (name === 'Meta AI' ? '<span title="">AI</span>' : '') + '</div><button aria-label="Ask Meta AI">✦</button>' +
    '<button aria-label="Zoeken">⌕</button></header><div role="application"><div data-id="true_' + id + '_3EB0A1"><span>hoi</span></div></div>' +
    '<footer><div contenteditable="true" role="textbox" aria-label="Typ een chatbericht aan ' + name + '" aria-placeholder="Typ een bericht" ' +
    'data-tab="10" data-lexical-editor="true"><p><br></p></div><button aria-label="Verzenden">➤</button></footer></div>';
  const open = (name, id) => { document.getElementById('slot').innerHTML = chat(name, id); };
  document.getElementById('to-meta').onclick = () => open('Meta AI', 'A1B2C3D4E5@lid');
  document.getElementById('to-anna').onclick = () => open('Anna', '31612345678@c.us');
  open('Anna', '31612345678@c.us');
</script>`;
const WA_FIELD = '#main footer [contenteditable="true"]';
const DOCTOR = 'My doctor says I might have diabetes, what should I eat?';

test('gratis: WhatsApp Web, in de chat met Meta AI komt de melding met Ask Melo', async () => {
  const url = 'https://web.whatsapp.com/';
  const page = await mockPage(browser, url, WHATSAPP, undefined, ready(url));
  await page.click('#to-meta');
  await page.click(WA_FIELD);
  await page.keyboard.type(DOCTOR);
  const html = await waitForShadow(page, h => /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/.test(h), 6_000);
  assert.match(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/);
  assert.doesNotMatch(html, /Temporary chat|Tijdelijke chat/, 'WhatsApp heeft (nog) geen tijdelijke chat die Kamelo kan openen');
  await page.close();
});

test('gratis: WhatsApp Web, in een chat met iemand anders nooit een melding, ook niet na een wissel', async () => {
  const url = 'https://web.whatsapp.com/?chat=anna';
  const page = await mockPage(browser, url, WHATSAPP, undefined, ready(url));
  const visible = h => /class="t card(?: light)? show"/.test(h);
  await page.click(WA_FIELD);
  await page.keyboard.type(DOCTOR);
  await new Promise(r => setTimeout(r, 2500));
  assert.ok(!visible(await shadowHTML(page)), 'melding in de chat met Anna');
  // Eerst Meta AI, dan terug naar Anna: daar weer niets.
  await page.click('#to-meta');
  await page.click(WA_FIELD);
  await page.keyboard.type(DOCTOR);
  assert.ok(visible(await waitForShadow(page, visible, 6_000)), 'melding in de chat met Meta AI');
  await page.keyboard.press('Escape');
  await page.click('#to-anna');
  await page.click(WA_FIELD);
  await page.keyboard.type('Mijn therapeut zegt dat ik een depressie heb.');
  await new Promise(r => setTimeout(r, 2500));
  assert.ok(!visible(await shadowHTML(page)), 'melding na terug naar Anna');
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

// Tweede kans (src/topic-ai.js): de woordenlijst mist deze zin, en voor de gewogen lijst is hij te kort (topic-model.js);
// de AI van Chrome op dit apparaat (hier nagebootst in de achtergrond) herkent hem wel. Zonder model ('downloadable')
// wordt er niets gedownload en komt er geen melding.
const MISSED = 'Everything feels pointless lately';
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
  assert.equal(await worker.evaluate(() => typeof globalThis.__realLM), 'function');
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
  // availability() mag wel (de melding vraagt of "Ask Melo" kan), maar de AI krijgt de tekst niet.
  const calls = await lmCalls();
  assert.equal(calls.create, 0);
  assert.deepEqual(calls.prompt, []);
  await page.close();
});

test('gratis: model nog niet op dit apparaat: geen download, geen melding', async () => {
  await fakeModel('downloadable', '{"personal":true,"topic":"MENTAL"}');
  const page = await mockPage(browser, 'https://chatgpt.com/c/nomodel', CHAT, undefined, ready('https://chatgpt.com/c/nomodel'));
  await page.click('#prompt-textarea');
  await page.keyboard.type(MISSED);
  await new Promise(r => setTimeout(r, 3000));
  const calls = await lmCalls();
  assert.equal(calls.availability, 2, 'eerst met en/de/fr/es, dan nog één keer met alleen Engels');
  assert.equal(calls.create, 0, 'create() zou een download starten');
  assert.doesNotMatch(await shadowHTML(page), /Temporary chat|Tijdelijke chat/);
  await page.close();
});

// "Ask Melo" alleen als Melo hier kan antwoorden (docs/KOERS.md, prioriteit 1). Kan de AI van Chrome niet op deze
// computer draaien, dan leidde de knop naar "Geen AI op dit apparaat"; nu staat er alleen de tijdelijke chat.
const meloOffer = async (url, state) => {
  if (state) await fakeModel(state, '{"personal":false,"topic":"NONE"}');
  else await worker.evaluate(() => { globalThis.LanguageModel = undefined; });
  const page = await mockPage(browser, url, CHAT, undefined, ready(url));
  await pasteText(page, '#prompt-textarea', HEALTH);
  const html = await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await page.close();
  return html;
};
for (const state of ['unavailable', null]) {
  test(`gratis: ${state ? 'Chrome zegt "unavailable"' : 'geen LanguageModel'}: geen "Ask Melo", alleen de tijdelijke chat`, async () => {
    const html = await meloOffer(`https://chatgpt.com/c/no-ai-${state}`, state);
    assert.doesNotMatch(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)|class="p melo"/);
    assert.match(html, /<button type="button" class="p">(Temporary chat|Tijdelijke chat)<\/button>/); // nu de hoofdknop
    assert.match(html, /<b>(Sensitive info|Gevoelige info)<\/b>/); // kort: geen uitlegzin meer (21 okt)
    assert.doesNotMatch(html, /doesn’t have a built-in AI|heeft nog geen ingebouwde AI/); // dat klopt in Chrome niet
  });
}
test('gratis: model nog te downloaden ("downloadable"): wel "Ask Melo" (Melo biedt de download zelf aan)', async () => {
  const html = await meloOffer('https://chatgpt.com/c/downloadable', 'downloadable');
  assert.match(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/);
  const calls = await lmCalls();
  assert.equal(calls.create, 0, 'de vraag of Melo kan, start geen download');
});

// Zonder AI op deze computer is er in Melo niets aanklikbaar dat niets doet (docs/KOERS.md, prioriteit 1): geen invoerveld,
// geen voorbeeldvragen, geen "Lees deze pagina"; wel de uitleg en de tijdelijke chat. De popup laat Melo dan weg.
const NO_AI = {
  unavailable: () => Object.defineProperty(window, 'LanguageModel', { value: { availability: async () => 'unavailable', create: async () => { throw new Error('unavailable'); } } }),
  'geen LanguageModel': () => Object.defineProperty(window, 'LanguageModel', { value: undefined }),
};
const meloLook = page => page.evaluate(() => {
  const shown = el => !!el && el.checkVisibility();
  return {
    engine: document.documentElement.dataset.engine,
    input: document.getElementById('input').disabled, send: document.getElementById('send').disabled,
    placeholder: document.getElementById('input').placeholder,
    sugs: [...document.querySelectorAll('.sug')].filter(shown).length, title: shown(document.querySelector('.empty h2')),
    readPage: shown(document.getElementById('readPage')),
    note: document.getElementById('note').hidden ? '' : document.getElementById('note').innerText,
    temp: [...document.querySelectorAll('#note .btn')].map(b => b.textContent),
  };
});
for (const [name, noAi] of Object.entries(NO_AI)) {
  test(`gratis: Melo zonder AI (${name}): alles uit behalve de tijdelijke chat`, async () => {
    const id = new URL(worker.url()).host;
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(noAi);
    await page.goto(`chrome-extension://${id}/chat/chat.html?lang=en`);
    await page.waitForFunction(() => document.documentElement.dataset.engine && !document.getElementById('note').hidden, { timeout: 5000 });
    const look = await meloLook(page);
    assert.equal(look.engine, 'none');
    assert.equal(look.input, true, 'het invoerveld staat nog aan');
    assert.equal(look.send, true, 'de verstuurknop staat nog aan');
    assert.equal(look.placeholder, 'Melo can’t answer on this computer');
    assert.equal(look.sugs, 0, 'voorbeeldvragen zonder AI');
    assert.equal(look.title, false, '"What’s on your mind?" zonder AI');
    assert.equal(look.readPage, false, '"Read this page" zonder AI');
    assert.match(look.note, /No AI on this device/);
    assert.deepEqual(look.temp, ['Temporary chat in ChatGPT']);
    // Enter in het (uitgezette) veld verstuurt niets en laat geen bericht achter.
    await page.focus('#input').catch(() => {});
    await page.keyboard.press('Enter');
    assert.equal(await page.$$eval('.thread .u', u => u.length), 0);
    assert.equal(await page.$eval('#note .btn', b => b.disabled), false);
    await page.close();
  });
}
test('gratis: Melo met AI: invoerveld, voorbeeldvragen en "Lees deze pagina" staan aan', async () => {
  const id = new URL(worker.url()).host;
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(fakeLanguageModel, ['Ok.']);
  await page.goto(`chrome-extension://${id}/chat/chat.html?lang=en`);
  await page.waitForFunction(() => document.documentElement.dataset.engine === 'device', { timeout: 5000 });
  const look = await meloLook(page);
  assert.deepEqual([look.input, look.send, look.sugs, look.title, look.readPage, look.placeholder], [false, false, 4, true, true, 'Ask anything']);
  await page.close();
});
// De popup: Melo alleen als de AI van Chrome hier kan draaien, met dezelfde vraag aan de achtergrond als de melding.
for (const state of ['unavailable', null, 'available', 'downloadable']) {
  test(`gratis: de popup ${state === 'unavailable' || !state ? 'laat Melo weg' : 'toont Melo'} (${state || 'geen LanguageModel'})`, async () => {
    if (state) await fakeModel(state, '{}');
    else await worker.evaluate(() => { globalThis.LanguageModel = undefined; });
    const id = new URL(worker.url()).host;
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${id}/popup/public.html`);
    await page.waitForFunction(() => document.getElementById('stateText').textContent);
    await new Promise(r => setTimeout(r, 300)); // het antwoord van de achtergrond
    const rows = await page.$$eval('.pub-row:not(.mac)', r => r.filter(x => x.checkVisibility()).map(x => x.id));
    assert.deepEqual(rows, state === 'unavailable' || !state ? ['tempChat'] : ['openPrivateChat', 'tempChat']);
    if (state) assert.equal((await lmCalls()).create, 0, 'de popup start geen download');
    await page.close();
  });
}

test('gratis: op een gewone site draait Kamelo niet, ook niet in AI-velden', async () => {
  const page = await mockPage(browser, 'https://shop.example/', SHOP, undefined, async () => {});
  await new Promise(r => setTimeout(r, 800));
  assert.equal(await running('https://shop.example/'), false);
  assert.equal(await paste(page, '#assistant', HEALTH), false);
  await new Promise(r => setTimeout(r, 1500));
  assert.doesNotMatch(await shadowHTML(page), /Temporary chat|Tijdelijke chat|Sensitive info|Gevoelige info/);
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
  assert.deepEqual(Object.keys(settings), ['enabled', 'meloMac']); // meloMac: de schakelaar Melo voor Mac in dezelfde popup
  await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: true } }));
  await page.close();
});

// "Praat met geen enkele server", ook in een echte Chrome (naast de statische tests/geen-netwerk.test.mjs): alles wat
// Melo, de popup en de achtergrond laden of versturen, is een eigen bestand van de extensie of iets uit het geheugen.
test('gratis: Melo, de popup en de achtergrond maken geen verbinding naar buiten', async () => {
  const id = new URL(worker.url()).host;
  const seen = [];
  await worker.client.send('Network.enable');
  const onWorker = e => seen.push(e.request.url);
  worker.client.on('Network.requestWillBeSent', onWorker);
  const melo = await browser.newPage();
  melo.on('request', r => seen.push(r.url()));
  await melo.evaluateOnNewDocument(fakeLanguageModel, ['Dat klinkt zwaar. Wil je erover vertellen?']);
  await melo.goto(`chrome-extension://${id}/chat/chat.html?lang=nl&engine=device`);
  await melo.waitForFunction(() => document.documentElement.dataset.engine === 'device', { timeout: 5000 });
  await askMelo(melo, 'Ik voel me de laatste tijd somber en slaap slecht.');
  const popup = await browser.newPage();
  popup.on('request', r => seen.push(r.url()));
  await popup.goto(`chrome-extension://${id}/popup/public.html`);
  await popup.waitForFunction(() => document.getElementById('stateText').textContent);
  // De achtergrond aan het werk: een melding op een AI-site (de pagina zelf telt niet, die is van de site).
  const page = await mockPage(browser, 'https://chatgpt.com/c/net', CHAT, undefined, ready('https://chatgpt.com/c/net'));
  await pasteText(page, '#prompt-textarea', HEALTH);
  await waitForShadow(page, h => /Temporary chat|Tijdelijke chat/.test(h), 6_000);
  await new Promise(r => setTimeout(r, 500));
  worker.client.off('Network.requestWillBeSent', onWorker);
  assert.ok(seen.length >= 10, `maar ${seen.length} verzoeken gezien: kijkt de test wel?`);
  assert.deepEqual(seen.filter(u => !/^(chrome-extension:\/\/|data:|blob:)/.test(u)), []);
  for (const p of [melo, popup, page]) await p.close();
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

// ---------- Melding zonder input-event (21 okt 2026) ----------
// Sommige editors handelen elke toets zelf af (beforeinput + preventDefault) en sturen geen input-event. Daar kwam de
// melding pas na een klik in het veld. Nu kijkt Kamelo ook na elke toets (keyup).
const OWN_EDITOR = `<!doctype html><title>Chat</title><main><div id="answer"></div></main>
<form><div id="prompt-textarea" contenteditable="true" data-testid="chat-input"></div><button type="submit" aria-label="Send">↑</button></form>
<script>
const ed = document.getElementById('prompt-textarea');
ed.addEventListener('beforeinput', e => {
  if (e.inputType !== 'insertText') return;
  e.preventDefault();
  ed.textContent += e.data;
  const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
  getSelection().removeAllRanges(); getSelection().addRange(r);
});
</script>`;
const SAMPLE_IBAN = SAMPLE.iban;
const cardShown = h => /class="t card(?: light)? show"/.test(h);

test('gratis: een editor zonder input-event: de melding komt na het typen, zonder klik', async () => {
  const url = 'https://claude.ai/new';
  const page = await mockPage(browser, url, OWN_EDITOR, undefined, ready(url));
  await page.$eval('#prompt-textarea', el => el.focus()); // geen klik, zoals een veld dat zelf de focus heeft
  await page.keyboard.type('My doctor says I might have diabetes, what should I eat?');
  assert.equal(await textOf(page, '#prompt-textarea'), 'My doctor says I might have diabetes, what should I eat?');
  const html = await waitForShadow(page, cardShown, 6_000);
  assert.match(html, /Sensitive info|Gevoelige info/);
  await page.close();
});

// ---------- Gevoelige gegevens (21 okt 2026, src/identifiers.js) ----------
test('gratis: een IBAN geeft de melding "Sensitive info" met Ask Melo, zonder tijdelijke chat; niets afgeschermd', async () => {
  await fakeModel('available', '{"personal":false,"topic":"NONE"}');
  const url = 'https://chatgpt.com/';
  const page = await mockPage(browser, url, CHAT, undefined, ready(url));
  await pasteText(page, '#prompt-textarea', SAMPLE.text);
  const html = await waitForShadow(page, h => /Sensitive info|Gevoelige info/.test(h), 6_000);
  // Waar het gegeven staat: blauw gemarkeerd in het veld (src/gegevens.css), de tekst zelf blijft gelijk. Na het plakken
  // staat de tekst pas in het veld na het input-event; de controle daarna (na ~0,9 s) markeert.
  await new Promise(r => setTimeout(r, 1500));
  const marked = await page.evaluate(() => [...(CSS.highlights.get('kamelo-gevoelig') || [])].map(r => r.toString()));
  assert.deepEqual(marked, [SAMPLE_IBAN]);
  assert.match(html, /Ask Melo(?! on your Mac)|Vraag het Melo(?! op je Mac)/);
  assert.doesNotMatch(html, /Temporary chat|Tijdelijke chat/); // die stuurt het nummer nog steeds naar het AI-bedrijf
  assert.doesNotMatch(html, /\[IBAN_|\[PERSON_/);
  const text = await textOf(page, '#prompt-textarea');
  assert.ok(text.includes(SAMPLE.iban), `niet ongewijzigd: ${text}`);
  await page.close();
});

test('gratis: zonder AI op dit apparaat: bij een BSN de melding zonder Melo, en het BSN blauw gemarkeerd', async () => {
  await fakeModel('unavailable', '{"personal":false,"topic":"NONE"}');
  const url = 'https://claude.ai/new';
  const page = await mockPage(browser, url, CHAT.replace('id="prompt-textarea"', 'id="prompt-textarea" data-testid="chat-input"'), undefined, ready(url));
  await page.click('#prompt-textarea');
  await page.keyboard.type('Mijn BSN is 111222333, kun je dit formulier invullen?');
  const html = await waitForShadow(page, h => /Sensitive info|Gevoelige info/.test(h), 6_000);
  const marked = await page.evaluate(() => [...(CSS.highlights.get('kamelo-gevoelig') || [])].map(r => r.toString()));
  assert.deepEqual(marked, ['111222333']);
  assert.doesNotMatch(html, /Ask Melo|Vraag het Melo|Temporary chat|Tijdelijke chat/);
  await page.close();
});

test('gratis: een bestelnummer of telefoonnummer geeft geen melding', async () => {
  const url = 'https://claude.ai/new';
  const page = await mockPage(browser, url, CHAT.replace('id="prompt-textarea"', 'id="prompt-textarea" data-testid="chat-input"'), undefined, ready(url));
  await page.click('#prompt-textarea');
  await page.keyboard.type('Mijn bestelnummer is 111222333, bel me op 0612345678 als het pakket er is.');
  await new Promise(r => setTimeout(r, 2500));
  assert.doesNotMatch(await shadowHTML(page), /Sensitive info|Gevoelige info/);
  await page.close();
});
