// Draai met: node tests/stats.test.js
const assert = require('node:assert/strict');
const S = require('../src/stats.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
const oct = new Date(2026, 9, 7), nov = new Date(2026, 10, 2);

console.log('Maandoverzicht');
test('telt per soort op bij de huidige maand', () => {
  let stats = S.add({}, { PERSON: 2, IBAN: 1 }, oct);
  stats = S.add(stats, { PERSON: 1 }, oct);
  assert.deepEqual(stats, { '2026-10': { PERSON: 3, IBAN: 1 } });
  assert.deepEqual(S.month(stats, oct), { total: 4, types: [['PERSON', 3], ['IBAN', 1]] });
});
test('een nieuwe maand begint bij nul', () => {
  const stats = S.add(S.add({}, { PERSON: 5 }, oct), { EMAIL: 1 }, nov);
  assert.deepEqual(S.month(stats, nov), { total: 1, types: [['EMAIL', 1]] });
});
test('bewaart alleen de laatste 12 maanden', () => {
  let stats = {};
  for (let m = 0; m < 15; m++) stats = S.add(stats, { PERSON: 1 }, new Date(2026, m, 1));
  assert.equal(Object.keys(stats).length, S.KEEP_MONTHS);
  assert.ok(!('2026-01' in stats) && '2027-03' in stats);
});
test('negeert vreemde invoer', () => {
  assert.deepEqual(S.add(null, { PERSON: -1, 'x y': 3, IBAN: 1.5, EMAIL: 2 }, oct), { '2026-10': { EMAIL: 2 } });
  assert.deepEqual(S.month(undefined, oct), { total: 0, types: [] });
});

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failed) process.exit(1);
