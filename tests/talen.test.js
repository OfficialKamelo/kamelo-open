// Draai met: node tests/talen.test.js
// Elke taal van de extensie heeft alle teksten van het Engels, met dezelfde {invulplekken}; de gratis editie zegt nergens
// dat Kamelo afschermt; en _locales heeft voor elke taal dezelfde sleutels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../src/strings.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
const holes = s => (String(s).match(/\{\w+\}/g) || []).sort().join(' ');
const LANGS = Object.keys(I.STRINGS).filter(l => l !== 'en');

console.log('Talen');
for (const l of LANGS) {
  test(`${l}: alle teksten van het Engels`, () => {
    assert.deepEqual(Object.keys(I.STRINGS.en).filter(k => !(k in I.STRINGS[l])), []);
  });
  test(`${l}: dezelfde invulplekken als het Engels`, () => {
    assert.deepEqual(Object.keys(I.STRINGS.en).filter(k => holes(I.STRINGS.en[k]) !== holes(I.STRINGS[l][k])), []);
  });
  test(`${l}: gratis editie zegt niet dat Kamelo afschermt`, () => {
    assert.ok(I.PUBLIC[l], 'geen PUBLIC-teksten');
    for (const k of ['pchatNoDevice', 'pchatNoApi', 'pchatSlowFirefox', 'pchatDeviceSlow']) assert.notEqual(I.PUBLIC[l][k], I.STRINGS[l][k], k);
    assert.ok(I.PUBLIC[l].statusProtected, 'popup-status');
  });
  test(`${l}: _locales heeft dezelfde sleutels als het Engels`, () => {
    const read = x => Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_locales', x, 'messages.json'), 'utf8'))).sort();
    assert.deepEqual(read(l), read('en'));
  });
}
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failed) process.exit(1);
