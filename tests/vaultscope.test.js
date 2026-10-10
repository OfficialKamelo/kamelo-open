// Draai met: node tests/vaultscope.test.js
// De achtergrond geeft elk content script alleen het deel van de kluis van zijn eigen site, en neemt alleen dat terug.
const assert = require('node:assert/strict');
require('../src/sites.js');
const D = require('../src/detector.js');
globalThis.PrivacyDetector = D;
require('../src/vaultscope.js');
const VS = globalThis.PrivacyVaultScope;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}

const chat = { url: 'https://chatgpt.com/c/1', tab: { url: 'https://chatgpt.com/c/1' } };
const evil = { url: 'https://evil.example/', tab: { url: 'https://evil.example/' } };
const evilFrame = { url: 'about:srcdoc', origin: 'https://evil.example', tab: { url: 'https://evil.example/' } };
const evilData = { url: 'data:text/html,x', origin: 'null', tab: { url: 'https://evil.example/' } };

function filled() {
  const v = D.emptyVault();
  const where = VS.scopeOfSender(chat);
  D.mask('Mail sarah.miller@example.com, IBAN NL91ABNA0417164300', v, where);
  D.mask('Bel 0612345678', v); // een oud gegeven, zonder site
  return v;
}

console.log('Bereik van de afzender');
test('AI-site, gewone site en vensters zonder eigen adres', () => {
  assert.deepEqual(VS.scopeOfSender(chat), { scope: 'ai:ChatGPT', legacy: true });
  assert.deepEqual(VS.scopeOfSender({ url: 'https://chat.openai.com/' }), { scope: 'ai:ChatGPT', legacy: true });
  assert.deepEqual(VS.scopeOfSender(evil), { scope: 'evil.example', legacy: false });
  assert.deepEqual(VS.scopeOfSender(evilFrame), { scope: 'evil.example', legacy: false });
  assert.deepEqual(VS.scopeOfSender(evilData), { scope: 'evil.example', legacy: false });
  assert.equal(VS.scopeOfSender({ url: 'file:///home/x/a.html' }), null);
});

console.log('Lezen');
test('een andere site krijgt niets uit de kluis, alleen de tellers', () => {
  const v = filled();
  for (const s of [evil, evilFrame, evilData]) {
    const slice = VS.sliceVault(v, VS.scopeOfSender(s));
    assert.deepEqual(slice.byPlaceholder, {});
    assert.deepEqual(slice.byKey, {});
    assert.deepEqual(slice.counters, v.counters);
  }
  assert.deepEqual(VS.sliceVault(v, null).byPlaceholder, {});
});
test('de eigen site krijgt haar eigen gegevens en de oude', () => {
  const v = filled();
  const slice = VS.sliceVault(v, VS.scopeOfSender(chat));
  assert.deepEqual(Object.values(slice.byPlaceholder).sort(), ['0612345678', 'NL91ABNA0417164300', 'sarah.miller@example.com']);
  assert.equal(D.restore('[EMAIL_1]', slice, VS.scopeOfSender(chat)), 'sarah.miller@example.com');
});

console.log('Schrijven');
test('nieuwe gegevens van deze site worden overgenomen', () => {
  const v = filled(), where = VS.scopeOfSender(evil);
  const slice = VS.sliceVault(v, where);
  D.mask('mail jan@example.org', slice, where);
  assert.equal(VS.mergeSlice(v, slice, where), true);
  assert.ok(Object.values(v.byPlaceholder).includes('jan@example.org'));
  assert.equal(v.byPlaceholder['[EMAIL_1]'], 'sarah.miller@example.com');
});
test('een site kan gegevens van een andere site niet overschrijven of overnemen', () => {
  const v = filled(), where = VS.scopeOfSender(evil);
  const before = JSON.stringify(v.byPlaceholder);
  const forged = D.emptyVault();
  forged.byPlaceholder['[EMAIL_1]'] = 'attacker@evil.example';
  forged.sites['[EMAIL_1]'] = 'evil.example';
  forged.byPlaceholder['[IBAN_1]'] = 'NL91ABNA0417164300';
  forged.sites['[IBAN_1]'] = 'ai:ChatGPT';
  forged.byPlaceholder['[PHONE_1]'] = '0612345678'; // oud gegeven: alleen bekende AI-sites
  forged.byKey['ai:ChatGPT|EMAIL|sarah.miller@example.com'] = '[EMAIL_9]';
  VS.mergeSlice(v, forged, where);
  assert.equal(JSON.stringify(v.byPlaceholder), before);
  assert.equal(v.sites['[EMAIL_1]'], 'ai:ChatGPT');
  assert.equal(v.sites['[PHONE_1]'], undefined);
  assert.notEqual(v.byKey['ai:ChatGPT|EMAIL|sarah.miller@example.com'], '[EMAIL_9]');
});
test('wat een site weglaat, wordt niet gewist', () => {
  const v = filled(), where = VS.scopeOfSender(chat);
  const n = Object.keys(v.byPlaceholder).length;
  VS.mergeSlice(v, D.emptyVault(), where);
  assert.equal(Object.keys(v.byPlaceholder).length, n);
});
test('tellers gaan alleen omhoog', () => {
  const v = filled(), where = VS.scopeOfSender(evil);
  const s = D.emptyVault();
  s.counters = { EMAIL: 0, IBAN: 500 };
  VS.mergeSlice(v, s, where);
  assert.equal(v.counters.EMAIL, 1);
  assert.equal(v.counters.IBAN, 500);
});

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
