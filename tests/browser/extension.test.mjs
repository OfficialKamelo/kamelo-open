// Draai met: npm run test:browser
// Kamelo in een echte Chrome, op nagebootste pagina's met echte hostnamen: afschermen, terugzetten, kopiëren en
// verzoeken aan AI-API's. Hangt niet af van internet of van de opmaak van echte sites (dat doet tests/live/sites.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, mockPage, paste, textOf, waitForText, clickText, waitForShadow, noticeRect, rectOf, SAMPLE } from './kamelo.mjs';

const CHAT = `<!doctype html><title>Chat</title>
<main>
  <div id="answer"></div>
  <div id="draft" contenteditable="true"></div>
</main>
<form><div id="prompt-textarea" contenteditable="true"></div><button type="submit" aria-label="Send">↑</button></form>`;

const SHOP = `<!doctype html><title>Shop</title>
<textarea id="message" placeholder="Message to the seller"></textarea>
<textarea id="assistant" placeholder="Ask AI about this product"></textarea>`;

let browser, worker;
before(async () => ({ browser, worker } = await launch()));
after(() => browser?.close());

const masked = text => /\[PERSON_\d+\]/.test(text) && /\[IBAN_\d+\]/.test(text) && !text.includes(SAMPLE.name);
const placeholdersIn = text => text.match(/\[[A-Z]+_\d+\]/g) ?? [];

test('AI-site: plakken schermt af, het invoerveld houdt de placeholders', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const text = await waitForText(page, '#prompt-textarea', masked);
  assert.ok(masked(text), `niet afgeschermd: "${text}"`);
  await new Promise(r => setTimeout(r, 300)); // het terugzetten loopt met een kleine vertraging
  assert.ok(masked(await textOf(page, '#prompt-textarea')), 'placeholders in het invoerveld zijn teruggezet');
  await page.close();
});

test('AI-site: antwoorden en bewerkbare blokken in het antwoord krijgen de echte waarden', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const [person, iban] = placeholdersIn(await waitForText(page, '#prompt-textarea', masked));
  await page.evaluate((person, iban) => {
    answer.innerHTML = `<p>Hi ${person}, please pay via ${iban}.</p>`;
    draft.innerHTML = `<p>Dear ${person},</p>`;
  }, person, iban);
  const restored = t => t.includes(SAMPLE.name);
  assert.equal(await waitForText(page, '#answer', restored), `Hi ${SAMPLE.name}, please pay via ${SAMPLE.iban}.`);
  assert.equal(await waitForText(page, '#draft', restored), `Dear ${SAMPLE.name},`);
  await page.close();
});

test('AI-site: de kopieerknop kopieert de echte waarden', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await browser.defaultBrowserContext().overridePermissions('https://chatgpt.com', ['clipboard-read', 'clipboard-sanitized-write']);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const [person] = placeholdersIn(await waitForText(page, '#prompt-textarea', masked));
  // Een echte klik: Kamelo zet alleen tijdens een gebruikersactie terug (een pagina kan dat niet namaken).
  await page.evaluate(text => {
    const b = Object.assign(document.createElement('button'), { id: 'copyApi', textContent: 'Copy' });
    b.addEventListener('click', () => navigator.clipboard.writeText(text));
    document.body.append(b);
  }, `Hi ${person}`);
  await page.bringToFront();
  await page.click('#copyApi');
  await new Promise(r => setTimeout(r, 200));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `Hi ${SAMPLE.name}`);
  await page.close();
});

test('AI-site: een kopieerknop met een eigen copy-handler (zoals ChatGPT) kopieert de echte waarden', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT + '<button id="copy">Copy</button>');
  await browser.defaultBrowserContext().overridePermissions('https://chatgpt.com', ['clipboard-read', 'clipboard-sanitized-write']);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const [person] = placeholdersIn(await waitForText(page, '#prompt-textarea', masked));
  // Zoals de bibliotheek copy-to-clipboard: verborgen element, eigen handler die het event tegenhoudt, dan execCommand.
  await page.evaluate(text => document.getElementById('copy').addEventListener('click', () => {
    const mark = Object.assign(document.createElement('span'), { textContent: text });
    mark.addEventListener('copy', e => { e.stopPropagation(); e.preventDefault(); e.clipboardData.setData('text/plain', text); });
    document.body.append(mark);
    const range = document.createRange(); range.selectNodeContents(mark);
    getSelection().removeAllRanges(); getSelection().addRange(range);
    document.execCommand('copy');
    mark.remove();
  }), `Dear ${person},`);
  await page.bringToFront();
  await page.click('#copy');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `Dear ${SAMPLE.name},`);
  await page.close();
});

// Hoe vaak de volledige melding al is getoond (na vijf keer wordt hij compact).
const setNoticesSeen = n => worker.evaluate(n => chrome.storage.local.set({ noticesSeen: n }), n);
const pillShown = html => /class="t pill show"/.test(html);

test('melding: het eerste gegeven doorgestreept, met zijn placeholder en "+1 more"', async () => {
  await setNoticesSeen(0);
  const page = await mockPage(browser, 'https://chatgpt.com/?lang=en', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const html = await waitForShadow(page, pillShown);
  assert.ok(pillShown(html), 'geen melding in beeld');
  assert.match(html, /<span class="real">Sarah Miller<\/span>/);
  assert.match(html, /<span class="tag">\[PERSON_\d+\]<\/span>/);
  assert.match(html, /<span class="more">\+1 more<\/span>/);
  assert.match(html, />Details<\/button>/);
  assert.match(html, /aria-label="Close"/);
  await page.close();
});

test('melding: na vijf keer alleen nog "N protected"', async () => {
  await setNoticesSeen(4);
  let page = await mockPage(browser, 'https://chatgpt.com/?lang=en', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  assert.ok(pillShown(await waitForShadow(page, pillShown)), 'de vijfde keer is nog de volledige melding');
  assert.equal((await worker.evaluate(() => chrome.storage.local.get('noticesSeen'))).noticesSeen, 5);
  await page.close();
  page = await mockPage(browser, 'https://chatgpt.com/?lang=en', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  const html = await waitForShadow(page, h => /class="t compact show"/.test(h));
  assert.match(html, /class="t compact show"/);
  assert.match(html, />2 protected<\/button>/);
  assert.ok(!html.includes('Sarah Miller'), 'de compacte melding toont een waarde');
  await page.close();
  await setNoticesSeen(0);
});

test('melding: Esc sluit hem, zonder de focus uit het veld te halen', async () => {
  await setNoticesSeen(0);
  const page = await mockPage(browser, 'https://chatgpt.com/?lang=en', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  await waitForShadow(page, pillShown);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'prompt-textarea', 'de melding nam de focus over');
  await page.keyboard.press('Escape');
  const html = await waitForShadow(page, h => !pillShown(h));
  assert.ok(!pillShown(html), 'melding staat nog in beeld na Esc');
  await page.close();
});

test('kaart "What the AI sees": elk gegeven met soort, waarde en placeholder; Esc sluit', async () => {
  await setNoticesSeen(0);
  const page = await mockPage(browser, 'https://chatgpt.com/?lang=en', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  await waitForShadow(page, pillShown);
  await clickText(page, 'Details');
  const html = await waitForShadow(page, h => h.includes('role="dialog"'));
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /What the AI sees/);
  assert.equal((html.match(/<li>/g) || []).length, 2, 'niet precies twee regels');
  assert.match(html, /<span class="val">Sarah Miller<\/span><span class="tag">\[PERSON_\d+\]<\/span>/);
  assert.match(html, /<span class="val">GB82 •••• •••• 7654 32<\/span><span class="tag">\[IBAN_\d+\]<\/span>/);
  assert.equal((html.match(/>Keep visible</g) || []).length, 2);
  await page.keyboard.press('Escape');
  assert.ok(!(await waitForShadow(page, h => !h.includes('role="dialog"'))).includes('role="dialog"'), 'kaart niet gesloten met Esc');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'prompt-textarea', 'focus niet terug in het veld');
  await page.close();
});

test('melding: "Bekijk" toont wat is afgeschermd; zichtbaar laten en ongedaan maken', async () => {
  await setNoticesSeen(0);
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  await waitForText(page, '#prompt-textarea', masked);
  await clickText(page, /^(Details|Bekijk)$/);
  await clickText(page, /^(Keep visible|Zichtbaar laten)$/);
  assert.ok((await textOf(page, '#prompt-textarea')).includes(SAMPLE.name), 'naam niet teruggezet in het veld');
  await clickText(page, /·/);
  assert.ok(!(await textOf(page, '#prompt-textarea')).includes(SAMPLE.name), 'ongedaan maken werkte niet');
  await page.close();
});

// Een invoerbalk zoals op Claude, Gemini en Perplexity: geen <form>, het veld zit in een scrollvak binnen een balk met
// achtergrond, rand en schaduw, met binnenruimte en een knoppenrij. `top` zet de balk ergens anders dan onderaan.
const BAR = ({ top = null, maxHeight = '320px', id = 'chat-input' } = {}) => `<!doctype html><title>Chat</title>
<style>body { margin: 0; height: 100vh; display: flex; flex-direction: column; font: 16px/24px sans-serif; }
  .spacer { flex: 1; } fieldset { border: 0; margin: 0 auto 16px; padding: 0; width: 680px; ${top == null ? '' : `position: fixed; top: ${top}px; left: 300px;`} }
  #bar { background: #fff; border: 1px solid #ddd; border-radius: 20px; padding: 16px 14px 48px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .scroll { max-height: ${maxHeight}; overflow-y: auto; } [contenteditable] { outline: none; min-height: 24px; }</style>
<div class="spacer"></div>
<fieldset><div id="bar"><div class="scroll"><div data-testid="${id}" contenteditable="true"></div></div></div></fieldset>`;
const ED = '[contenteditable]';
const lines = n => Array.from({ length: n }, (_, i) => `Line ${i + 1} of a long message.`).join('\n');
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

// De melding staat boven de balk, met ruimte ertussen, en links gelijk met de balk.
async function assertAbove(page, step) {
  await frames(page);
  const [n, bar] = [await noticeRect(page), await rectOf(page, '#bar')];
  assert.ok(n, `${step}: geen melding`);
  assert.ok(n.bottom <= bar.top - 4, `${step}: melding (onderkant ${n.bottom}) overlapt de balk (bovenkant ${bar.top})`);
  assert.ok(Math.abs(n.left - bar.left) <= 1, `${step}: melding (${n.left}) niet links gelijk met de balk (${bar.left})`);
}

test('melding: blijft boven de balk terwijl die groeit, ook zonder <form> (Claude, Gemini, Perplexity)', async () => {
  const page = await mockPage(browser, 'https://claude.ai/new', BAR());
  await paste(page, ED, SAMPLE.text);
  await waitForShadow(page, html => html.includes('[PERSON_1]'));
  await assertAbove(page, 'na plakken');
  // Typen met Shift+Enter, en een lange tekst erbij: de balk groeit omhoog, tot het scrollvak vol is.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
    await page.keyboard.type(`more ${i}`);
  }
  await assertAbove(page, 'na typen');
  await page.$eval(ED, (el, t) => { el.innerText += '\n' + t; }, lines(30));
  await assertAbove(page, 'na een lange tekst (scrollvak vol)');
  await page.close();
});

test('melding: geen ruimte boven de balk, dan eronder (gecentreerde balk op een nieuw gesprek)', async () => {
  const page = await mockPage(browser, 'https://gemini.google.com/app', BAR({ top: 40 }));
  await paste(page, ED, SAMPLE.text);
  await waitForShadow(page, html => html.includes('[PERSON_1]'));
  await frames(page);
  const [n, bar] = [await noticeRect(page), await rectOf(page, '#bar')];
  assert.ok(n.top >= bar.bottom + 4, `melding (bovenkant ${n.top}) overlapt de balk (onderkant ${bar.bottom})`);
  await page.close();
});

test('melding: een balk zo hoog als het scherm: ernaast als dat past, anders klein op de rand; nooit over de tekst', async () => {
  for (const width of [1600, 1280]) {
    const page = await mockPage(browser, 'https://claude.ai/new', BAR({ top: 20, maxHeight: 'none' }));
    await page.setViewport({ width, height: 900 });
    await page.$eval(ED, (el, t) => { el.innerText = t; }, lines(40));
    await paste(page, ED, SAMPLE.text);
    await waitForShadow(page, html => html.includes('[PERSON_1]'));
    await frames(page); await frames(page);
    const [n, bar, text] = [await noticeRect(page), await rectOf(page, '#bar'), await rectOf(page, ED)];
    if (width === 1600) {
      assert.ok(n.left >= bar.right + 4 || n.right <= bar.left - 4, `${width}: melding (${n.left}–${n.right}) staat over de balk (${bar.left}–${bar.right})`);
    } else {
      assert.ok(n.bottom <= text.top, `${width}: melding (onderkant ${n.bottom}) staat over de tekst (bovenkant ${text.top})`);
      assert.ok(n.right - n.left < 160, `${width}: melding op de rand is niet klein (${n.right - n.left}px breed)`);
    }
    await page.close();
  }
});

test('melding: vervangt de site het invoerveld na plakken (Grok), dan blijft hij bij de balk', async () => {
  const page = await mockPage(browser, 'https://claude.ai/new', BAR());
  await paste(page, ED, SAMPLE.text);
  await waitForShadow(page, html => html.includes('[PERSON_1]'));
  await page.$eval(ED, el => {
    const copy = el.cloneNode(true);
    el.replaceWith(copy);
    copy.focus();
  });
  await page.$eval(ED, (el, t) => { el.innerText += '\n' + t; }, lines(8));
  await assertAbove(page, 'na vervangen');
  await page.close();
});

test('elke site: verzoeken aan een AI-API worden afgeschermd voordat ze vertrekken', async () => {
  let sent = null;
  const page = await mockPage(browser, 'https://shop.example/', SHOP, req => {
    if (req.method() === 'POST' && req.url().startsWith('https://api.openai.com/')) sent = req.postData();
  });
  await page.evaluate(text => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-x', messages: [{ role: 'user', content: text }] }),
  }), SAMPLE.text);
  assert.ok(sent, 'het verzoek is niet verstuurd');
  const content = JSON.parse(sent).messages[0].content;
  assert.ok(masked(content), `niet afgeschermd: "${content}"`);
  await page.close();
});

test('liever niet versturen dan onafgeschermd: is het afschermen op, dan gaat een verzoek met gegevens niet weg', async () => {
  const sent = [];
  const page = await mockPage(browser, 'https://flood.example/', SHOP, req => {
    if (req.method() === 'POST' && req.url().startsWith('https://api.openai.com/')) sent.push(req.postData());
  });
  const post = text => page.evaluate(text => fetch('https://api.openai.com/v1/x', { method: 'POST', body: text })
    .then(() => 'sent', e => `blocked: ${e.message}`), text);
  // Een site die het budget opmaakt (500 nieuwe gegevens per pagina).
  const flood = Array.from({ length: 501 }, (_, i) => `user${i}@flood.example`).join(' ');
  assert.equal(await post(flood), 'sent');
  const result = await post(SAMPLE.text);
  assert.match(result, /^blocked: Kamelo/);
  assert.ok(!sent.some(b => b.includes(SAMPLE.name)), 'de echte gegevens zijn toch verstuurd');
  assert.equal(await post('hello there'), 'sent'); // zonder gegevens gaat alles gewoon door
  await page.close();
});

test('gewone site: alleen AI-velden worden afgeschermd, berichten aan mensen niet', async () => {
  const page = await mockPage(browser, 'https://shop.example/', SHOP);
  assert.equal(await paste(page, '#message', SAMPLE.text), false, 'Kamelo greep in bij een bericht aan een mens');
  assert.equal(await paste(page, '#assistant', SAMPLE.text), true, 'Kamelo greep niet in bij het AI-veld');
  assert.ok(masked(await waitForText(page, '#assistant', masked)), 'AI-veld niet afgeschermd');
  await page.close();
});

test('maandoverzicht: afgeschermde gegevens worden per soort geteld, zonder de waarden', async () => {
  await worker.evaluate(() => chrome.storage.local.remove('stats'));
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(page, '#prompt-textarea', SAMPLE.text);
  await waitForText(page, '#prompt-textarea', masked);
  let stats = {};
  for (let i = 0; i < 30 && !Object.keys(stats).length; i++) {
    await new Promise(r => setTimeout(r, 100));
    ({ stats = {} } = await worker.evaluate(() => chrome.storage.local.get('stats')));
  }
  const [month] = Object.values(stats);
  assert.deepEqual(month, { PERSON: 1, IBAN: 1 });
  assert.ok(!JSON.stringify(stats).includes('Sarah'), 'het overzicht bevat een waarde');
  await page.close();
});

test('gevoelig onderwerp: melding, en "Niet meer tonen" zet dat onderwerp uit', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(page, '#prompt-textarea', 'I have been struggling with depression lately');
  await clickText(page, /^(Don’t show again|Niet meer tonen)$/);
  let muted = [];
  for (let i = 0; i < 30 && !muted.length; i++) {
    await new Promise(r => setTimeout(r, 100));
    muted = (await worker.evaluate(() => chrome.storage.local.get('settings'))).settings?.mutedTopics || [];
  }
  assert.deepEqual(muted, ['MENTAL']);
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, mutedTopics: [] } });
  });
  await page.close();
});

test('gevoelig onderwerp: "Vraag het privé" opent een tijdelijke chat met dezelfde tekst, afgeschermd', async () => {
  const temp = 'https://chatgpt.com/?temporary-chat=true';
  const page = await mockPage(browser, 'https://chatgpt.com/', CHAT, req => {
    if (req.url() === temp) req.respond({ status: 200, contentType: 'text/html', body: CHAT });
  });
  await paste(page, '#prompt-textarea', `I have been struggling with depression lately. My name is ${SAMPLE.name}.`);
  await waitForShadow(page, html => /Ask privately|Vraag het privé/.test(html), 6_000);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), clickText(page, /^(Ask privately|Vraag het privé)$/)]);
  assert.equal(page.url(), temp);
  await page.waitForFunction(() => document.querySelector('#prompt-textarea').innerText.includes('depression'), { timeout: 10_000 });
  const text = await textOf(page, '#prompt-textarea');
  assert.match(text, /\[PERSON_\d+\]/);
  assert.ok(!text.includes(SAMPLE.name), text);
  // De tekst is maar één keer mee te nemen.
  const again = await worker.evaluate(() => chrome.storage.session.get('handoff'));
  assert.equal(again.handoff, undefined);
  await page.close();
});

test('gevoelig onderwerp: op Claude opent "Vraag het privé" een incognito-chat', async () => {
  const temp = 'https://claude.ai/new?incognito';
  const CLAUDE = CHAT.replace('id="prompt-textarea"', 'id="prompt-textarea" data-testid="chat-input"');
  const page = await mockPage(browser, 'https://claude.ai/new', CLAUDE, req => {
    if (req.url() === temp) req.respond({ status: 200, contentType: 'text/html', body: CLAUDE });
  });
  await paste(page, '#prompt-textarea', `My doctor says I might have diabetes. I'm ${SAMPLE.name}.`);
  await waitForShadow(page, html => /Ask privately|Vraag het privé/.test(html), 6_000);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), clickText(page, /^(Ask privately|Vraag het privé)$/)]);
  assert.equal(page.url(), temp);
  await page.waitForFunction(() => document.querySelector('#prompt-textarea').innerText.includes('diabetes'), { timeout: 10_000 });
  assert.ok(!(await textOf(page, '#prompt-textarea')).includes(SAMPLE.name));
  await page.close();
});

test('gevoelig onderwerp: op Gemini drukt "Vraag het privé" de knop voor een tijdelijke chat in', async () => {
  // Zoals Gemini: een knop op de pagina, geen adres. Na de klik een nieuw, leeg veld in een "tijdelijke" chat.
  const GEMINI = `<!doctype html><title>Gemini</title>
<chat-window><rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea></chat-window>
<temp-chat-button><button aria-label="Temporary chat">tmp</button></temp-chat-button>
<script>
  document.querySelector('temp-chat-button button').addEventListener('click', () => {
    const w = document.querySelector('chat-window');
    w.classList.add('is-temporary-chat');
    w.innerHTML = '<rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea>';
  });
</script>`;
  const page = await mockPage(browser, 'https://gemini.google.com/app', GEMINI);
  await paste(page, '.ql-editor', `I have been struggling with depression lately. I'm ${SAMPLE.name}.`);
  await waitForShadow(page, html => /Ask privately|Vraag het privé/.test(html), 6_000);
  await clickText(page, /^(Ask privately|Vraag het privé)$/);
  await page.waitForFunction(() => document.querySelector('chat-window.is-temporary-chat .ql-editor')?.innerText.includes('depression'), { timeout: 10_000 });
  assert.ok(!(await textOf(page, 'chat-window .ql-editor')).includes(SAMPLE.name));
  await page.close();
});

test('kluis: wat in het ene tabblad is afgeschermd, komt in een ander tabblad van dezelfde AI-site terug', async () => {
  const a = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(a, '#prompt-textarea', SAMPLE.text);
  const phs = placeholdersIn(await waitForText(a, '#prompt-textarea', masked));
  const b = await mockPage(browser, 'https://chat.openai.com/', CHAT);
  await b.evaluate(text => { document.getElementById('answer').textContent = text; }, phs.join(' '));
  const back = await waitForText(b, '#answer', t => t.includes(SAMPLE.name));
  assert.ok(back.includes(SAMPLE.name), `niet teruggezet: "${back}"`);
  await a.close();
  await b.close();
});

test('beveiliging: een andere website kan de kluis niet uitlezen', async () => {
  // Eerst iets afschermen op een AI-site.
  const chat = await mockPage(browser, 'https://chatgpt.com/', CHAT);
  await paste(chat, '#prompt-textarea', SAMPLE.text);
  const phs = placeholdersIn(await waitForText(chat, '#prompt-textarea', masked));
  await chat.close();

  // Dan een kwaadaardige site die zich voordoet als net-main.js.
  const evil = await mockPage(browser, 'https://evil.example/', '<!doctype html><button id="go">Click me</button><p id="out"></p><p id="dom"></p>');
  const ask = text => new Promise(resolve => {
    const id = Math.random().toString(36).slice(2);
    const done = e => { const m = JSON.parse(e.detail); if (m.id === id) { document.removeEventListener('pf:restored', done); resolve(m.text); } };
    document.addEventListener('pf:restored', done);
    document.dispatchEvent(new CustomEvent('pf:restore', { detail: JSON.stringify({ id, text }) }));
  });
  const probe = phs.join(' ') + ' [PERSON_1] [IBAN_1] [SECRET_1]';
  // Terugzetten aanzetten met een nep-verzoek, dan vragen om terug te zetten: zonder klik en met een echte klik.
  await evil.evaluate(() => document.dispatchEvent(new CustomEvent('pf:mask', { detail: JSON.stringify({ id: 'x', body: 'mail a@b.example', host: 'api.openai.com' }) })));
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await evil.evaluate(ask, probe), probe, 'zonder klik werd iets teruggezet');
  await evil.evaluate((ask, probe) => {
    document.getElementById('go').addEventListener('click', async () => { document.getElementById('out').textContent = await eval(ask)(probe); });
  }, ask.toString(), probe);
  await evil.click('#go');
  await new Promise(r => setTimeout(r, 300));
  const out = await textOf(evil, '#out');
  assert.ok(!out.includes(SAMPLE.name) && !out.includes('GB82'), `met klik uitgelekt: "${out}"`);
  // En via de pagina zelf: placeholders in de tekst zetten en wachten tot Kamelo ze terugzet.
  await evil.evaluate(text => { document.getElementById('dom').textContent = text; }, probe);
  await new Promise(r => setTimeout(r, 400));
  const dom = await textOf(evil, '#dom');
  assert.ok(!dom.includes(SAMPLE.name) && !dom.includes('GB82'), `via de pagina uitgelekt: "${dom}"`);
  // En via een venster zonder eigen adres (srcdoc, about:blank): dat hoort bij evil.example, niet bij de hele kluis.
  const framed = await evil.evaluate(async probe => {
    const f = document.createElement('iframe');
    f.srcdoc = '<p id="p"></p>';
    document.body.append(f);
    await new Promise(r => f.addEventListener('load', r, { once: true }));
    await new Promise(r => setTimeout(r, 300));
    const doc = f.contentDocument;
    doc.dispatchEvent(new CustomEvent('pf:mask', { detail: JSON.stringify({ id: 'y', body: 'mail a@b.example', host: 'api.openai.com' }) }));
    await new Promise(r => setTimeout(r, 300));
    doc.getElementById('p').textContent = probe;
    await new Promise(r => setTimeout(r, 500));
    return doc.getElementById('p').textContent;
  }, probe);
  assert.ok(!framed.includes(SAMPLE.name) && !framed.includes('GB82'), `via een srcdoc-venster uitgelekt: "${framed}"`);
  await evil.close();
});

// ---------- Zichtbaar in de pagina (CSS Custom Highlight API) ----------
const marks = page => page.evaluate(() => Object.fromEntries(['pending', 'ph', 'restored'].map(k => [k, CSS.highlights.get(`kamelo-${k}`)?.size ?? 0])));
const PROSE = `<!doctype html><title>Chat</title>
<main><div id="answer" style="font:16px/24px sans-serif;padding:20px"></div></main>
<form><div id="prompt-textarea" contenteditable="true" style="font:16px/24px sans-serif;padding:20px"><p><br></p></div><button type="submit" aria-label="Send">↑</button></form>`;

test('zichtbaar: golflijn tijdens typen, label na afschermen, stippellijn onder wat is teruggezet', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/?lang=en', PROSE);
  await page.focus('#prompt-textarea');
  await page.keyboard.type(`Write to ${SAMPLE.name} at sarah.miller@example.com`);
  await page.waitForFunction(() => CSS.highlights.get('kamelo-pending')?.size === 2, { timeout: 5_000 });
  await page.keyboard.press('Enter');
  const sent = await waitForText(page, '#prompt-textarea', t => /\[PERSON_\d+\]/.test(t));
  await page.waitForFunction(() => CSS.highlights.get('kamelo-ph')?.size === 2 && !CSS.highlights.get('kamelo-pending')?.size, { timeout: 5_000 });
  // De pagina zelf blijft onaangeroerd: geen extra elementen in het veld.
  assert.equal(await page.$eval('#prompt-textarea', ed => ed.querySelectorAll('span, mark').length), 0);
  await page.evaluate(text => { document.getElementById('answer').textContent = `Sure, ${text.match(/\[PERSON_\d+\]/)[0]}!`; }, sent);
  await waitForText(page, '#answer', t => t.includes(SAMPLE.name));
  await page.waitForFunction(() => CSS.highlights.get('kamelo-restored')?.size === 1, { timeout: 5_000 });
  // Muis op de teruggezette naam: een kaartje met de placeholder die de AI zag.
  const pos = await page.evaluate(name => {
    const t = document.getElementById('answer').firstChild, i = t.nodeValue.indexOf(name);
    const r = document.createRange(); r.setStart(t, i + 1); r.setEnd(t, i + 3); const b = r.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, SAMPLE.name);
  await page.mouse.move(pos.x - 30, pos.y);
  await page.mouse.move(pos.x, pos.y, { steps: 4 });
  const html = await waitForShadow(page, h => h.includes('role="tooltip"'));
  assert.match(html, /Restored by Kamelo|Teruggezet door Kamelo/);
  assert.match(html, /\[PERSON_\d+\]/);
  await page.close();
});

test('zichtbaar: "Nu afschermen" in het kaartje schermt het veld af; zonder de schakelaar geen markeringen', async () => {
  const page = await mockPage(browser, 'https://chatgpt.com/?lang=en', PROSE);
  await page.focus('#prompt-textarea');
  await page.keyboard.type(`Ask ${SAMPLE.name} about it`);
  await page.waitForFunction(() => CSS.highlights.get('kamelo-pending')?.size === 1, { timeout: 5_000 });
  const pos = await page.evaluate(() => {
    const r = [...CSS.highlights.get('kamelo-pending')][0].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(pos.x - 30, pos.y);
  await page.mouse.move(pos.x, pos.y, { steps: 4 });
  await waitForShadow(page, h => /Mask now|Nu afschermen/.test(h));
  await clickText(page, /^(Mask now|Nu afschermen)$/);
  await waitForText(page, '#prompt-textarea', t => /\[PERSON_\d+\]/.test(t));
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, enabled: false } });
  });
  await page.waitForFunction(() => !CSS.highlights.get('kamelo-ph')?.size && !CSS.highlights.get('kamelo-pending')?.size, { timeout: 5_000 });
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, enabled: true } });
  });
  await page.close();
});

test('popup: "Vraag het privé" brengt het tabblad met de tekst naar een tijdelijke chat', async () => {
  const temp = 'https://chatgpt.com/?temporary-chat=true';
  // Een eigen adres, zodat het bericht naar dit tabblad gaat en niet naar een ander ChatGPT-tabblad.
  const page = await mockPage(browser, 'https://chatgpt.com/c/popup-private', CHAT, req => {
    if (req.url() === temp) req.respond({ status: 200, contentType: 'text/html', body: CHAT });
  });
  await page.$eval('#prompt-textarea', (ed, name) => { ed.textContent = `A question about my landlord, from ${name}`; }, SAMPLE.name);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://chatgpt.com/c/popup-private' });
      await chrome.tabs.sendMessage(tab.id, { type: 'pf:private-open' }).catch(() => {});
    }),
  ]);
  assert.equal(page.url(), temp);
  await page.waitForFunction(() => document.querySelector('#prompt-textarea').innerText.includes('landlord'), { timeout: 10_000 });
  assert.ok(!(await textOf(page, '#prompt-textarea')).includes(SAMPLE.name));
  await page.close();
});
