// Draai met: node tests/chat-page.test.js
// Melo, "Lees deze pagina" (chat/page.js): welke pagina's Melo nooit leest, waar hij eerst vraagt, en welke getypte
// vragen over de pagina gaan. Het lezen zelf (extract) draait in een echte pagina: tests/browser/lees-pagina.test.mjs.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const P = require('../chat/page.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}

console.log('Lees deze pagina');
test('nooit: pagina\'s van de browser, extensies, bestanden en extensiewinkels', () => {
  for (const url of ['chrome://settings', 'chrome://newtab/', 'edge://settings', 'about:blank', 'chrome-extension://abc/chat/chat.html',
    'file:///home/x/brief.html', 'view-source:https://example.com', 'data:text/html,hoi', 'https://chromewebstore.google.com/detail/x',
    'https://chrome.google.com/webstore/detail/x', 'https://microsoftedge.microsoft.com/addons/detail/x', 'https://addons.mozilla.org/nl/firefox/', 'geen adres']) {
    assert.equal(P.classify(url), 'cant', url);
  }
});
test('gewone pagina\'s mag hij lezen (na een klik)', () => {
  for (const url of ['https://www.nu.nl/artikel', 'http://localhost:8080/', 'https://www.thuisarts.nl/hoofdpijn', 'https://chrome.google.com/intl/nl/chrome/',
    'https://www.denhaag.nl/nl/brief', 'https://www.apotheek.nl/medicijnen/paracetamol']) {
    assert.equal(P.classify(url), 'ok', url);
  }
});
test('eerst vragen: mail en berichten', () => {
  for (const url of ['https://mail.google.com/mail/u/0/#inbox', 'https://outlook.live.com/mail/0/', 'https://outlook.office.com/mail/',
    'https://mail.proton.me/u/0/inbox', 'https://webmail.ziggo.nl/', 'https://email.t-online.de/', 'https://web.whatsapp.com/',
    'https://www.icloud.com/mail/', 'https://www.linkedin.com/messaging/thread/1', 'https://mijn.overheid.nl/berichtenbox/inbox', 'https://web.de/']) {
    assert.equal(P.risk(url), 'mail', url);
  }
});
test('eerst vragen: bank en betalen', () => {
  for (const url of ['https://bankieren.rabobank.nl/', 'https://mijn.ing.nl/banking', 'https://www.abnamro.nl/mijn', 'https://www.paypal.com/myaccount',
    'https://app.bunq.com/', 'https://www.sparkasse.de/', 'https://www.bnpparibas.fr/', 'https://wise.com/home', 'https://web.bitvavo.com/']) {
    assert.equal(P.risk(url), 'bank', url);
  }
});
test('eerst vragen: een wachtwoordveld of kaartveld op de pagina', () => {
  assert.equal(P.risk('https://shop.example/checkout', { card: true, password: true }), 'card');
  assert.equal(P.risk('https://forum.example/login', { password: true }), 'password');
});
test('gewoon lezen: nieuws, een bijsluiter, een brief van de gemeente, een gezondheidssite', () => {
  for (const url of ['https://nos.nl/artikel/1', 'https://www.thuisarts.nl/hoofdpijn', 'https://www.denhaag.nl/nl/brief',
    'https://www.apotheek.nl/medicijnen/paracetamol', 'https://www.mail-online.example/', 'https://www.linkedin.com/feed/', 'https://www.ingredients.example/']) {
    assert.equal(P.risk(url, { password: false, card: false }), '', url);
  }
});
test('getypte vragen over deze pagina, in vijf talen', () => {
  for (const q of ['Wat staat hier?', 'wat staat er in deze brief', 'Waar gaat dit artikel over?', 'Vat deze pagina samen', 'kun je deze bijsluiter uitleggen',
    'What is on this page?', "What's written here?", 'Summarize this article please', 'What does this letter say?',
    'Was steht hier?', 'Fass diesen Artikel zusammen', 'Worum geht es auf dieser Seite?',
    'Qu’est-ce qui est écrit ici ?', 'Résumez cette page', 'De quoi parle cet article ?',
    '¿Qué dice esta carta?', 'Resume esta página', '¿De qué trata este artículo?', '¿Qué pone aquí?']) {
    assert.ok(P.wantsPage(q), q);
  }
});
test('gewone vragen gaan niet over de pagina', () => {
  for (const q of ['Wat staat er in de grondwet over privacy?', 'Ik heb hoofdpijn sinds gisteren', 'Schrijf een brief aan mijn huisbaas',
    'What is a page fault?', 'Write a letter to my landlord', 'Hier ist mein Problem', 'Hallo', 'Wat is 2 + 2?', 'Was ist hier los mit mir, ich bin so müde', '']) {
    assert.ok(!P.wantsPage(q), q);
  }
});
test('probe en extract zijn losse functies (chrome.scripting stuurt alleen de functie zelf mee)', () => {
  for (const fn of [P.probe, P.extract]) {
    const copy = vm.runInNewContext(`(${fn.toString()})`);
    assert.equal(typeof copy, 'function');
    assert.doesNotMatch(fn.toString(), /\b(MAX_CHARS|onHost|MAIL_HOSTS|BANK|classify|risk|root)\b/);
  }
});
test('de lengte past bij de AI op dit apparaat, net als bij bestanden', () => {
  assert.equal(P.MAX_CHARS, 6000);
});

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failed) process.exit(1);
