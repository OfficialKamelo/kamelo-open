// Draai met: node tests/vaultcrypto.test.js
const assert = require('node:assert/strict');
const C = require('../src/vaultcrypto.js');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}

const vault = {
  byKey: { 'PERSON|sarah miller': '[PERSON_1]' }, byPlaceholder: { '[PERSON_1]': 'Sarah Miller' },
  counters: { PERSON: 1 }, lastUsed: { '[PERSON_1]': 1 },
};

(async () => {
  console.log('Versleuteling van de kluis');

  await test('versleutelen en ontsleutelen geeft dezelfde kluis terug', async () => {
    const key = await C.importAesRaw(C.randomBytes(32));
    const box = await C.encryptJSON(key, vault);
    assert.ok(!box.data.includes('Sarah'));
    assert.deepEqual(await C.decryptJSON(key, box), vault);
  });

  await test('met het verkeerde wachtwoord lukt ontsleutelen niet', async () => {
    const salt = C.b64(C.randomBytes(16));
    const raw = C.randomBytes(32);
    const wrapped = await C.encryptBytes(await C.keyFromPassword('goed-wachtwoord', salt), raw);
    assert.deepEqual(await C.decryptBytes(await C.keyFromPassword('goed-wachtwoord', salt), wrapped), raw);
    await assert.rejects(C.decryptBytes(await C.keyFromPassword('fout-wachtwoord', salt), wrapped));
  });

  await test('sleutel uit Touch ID-bytes (PRF): zelfde bytes → zelfde sleutel', async () => {
    const prf = C.randomBytes(32);
    const raw = C.randomBytes(32);
    const wrapped = await C.encryptBytes(await C.keyFromPrf(prf), raw);
    assert.deepEqual(await C.decryptBytes(await C.keyFromPrf(prf), wrapped), raw);
    await assert.rejects(C.decryptBytes(await C.keyFromPrf(C.randomBytes(32)), wrapped));
  });

  await test('vergrendeld gemaakte regels worden samengevoegd zonder botsingen', async () => {
    const pending = {
      byKey: { 'PERSON|daniel': '[PERSON_2]' }, byPlaceholder: { '[PERSON_2]': 'Daniel' },
      counters: { PERSON: 2, EMAIL: 1 }, lastUsed: { '[PERSON_2]': 5 }, sites: { '[PERSON_2]': 'ai:Claude' },
    };
    const merged = C.mergeVaults(vault, pending);
    assert.deepEqual(merged.sites, { '[PERSON_2]': 'ai:Claude' });
    assert.deepEqual(merged.byPlaceholder, { '[PERSON_1]': 'Sarah Miller', '[PERSON_2]': 'Daniel' });
    assert.deepEqual(merged.counters, { PERSON: 2, EMAIL: 1 });
  });

  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  process.exit(failed ? 1 : 0);
})();
