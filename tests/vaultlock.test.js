// Draai met: node tests/vaultlock.test.js
// Ontgrendelen en vergrendelen zoals de popup het doet, met echte versleuteling en een nagebootste chrome.storage.
const assert = require('node:assert/strict');

const store = { local: {}, session: {} };
const area = name => ({
  get: async keys => Object.fromEntries([].concat(keys).filter(k => k in store[name]).map(k => [k, store[name][k]])),
  set: async obj => { Object.assign(store[name], structuredClone(obj)); },
});
const sent = [];
globalThis.chrome = {
  storage: { local: area('local'), session: area('session') },
  runtime: { sendMessage: async msg => { sent.push(msg); return true; } },
};
globalThis.PrivacyI18n = { t: key => key };
const PC = require('../src/vaultcrypto.js');
globalThis.PrivacyCrypto = PC;
require('../src/vaultstore.js');
require('../src/vaultlock.js');
const L = globalThis.PrivacyVaultLock;

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}

(async () => {
  console.log('Kluis ontgrendelen en vergrendelen');

  // Een kluis beveiligd met een wachtwoord, zoals unlock.js hem aanmaakt; nu vergrendeld.
  const rawKey = PC.randomBytes(32);
  const salt = PC.b64(PC.randomBytes(16));
  const saved = { byKey: { 'PERSON|jan de vries': '[PERSON_1]' }, byPlaceholder: { '[PERSON_1]': 'Jan de Vries' }, counters: { PERSON: 1 }, lastUsed: {} };
  store.local = {
    protect: { password: { salt, wrapped: await PC.encryptBytes(await PC.keyFromPassword('goed-wachtwoord', salt), rawKey) }, counters: { PERSON: 1 } },
    vaultEnc: await PC.encryptJSON(await PC.importAesRaw(rawKey), saved),
  };
  // Intussen (vergrendeld) afgeschermd: een IBAN.
  store.session = { ready: true, locked: true, vault: { byKey: { 'IBAN|nl91abna0417164300': '[IBAN_1]' }, byPlaceholder: { '[IBAN_1]': 'NL91 ABNA 0417 1643 00' }, counters: { PERSON: 1, IBAN: 1 }, lastUsed: {} } };

  await test('een verkeerd wachtwoord ontgrendelt niets', async () => {
    await assert.rejects(L.unlockPassword('fout-wachtwoord'), { message: 'msgWrong' });
    assert.equal(store.session.locked, true);
    assert.equal(store.session.key, undefined);
  });

  await test('het goede wachtwoord ontgrendelt en voegt samen wat vergrendeld is afgeschermd', async () => {
    await L.unlockPassword('goed-wachtwoord');
    assert.equal(store.session.locked, false);
    assert.equal(store.session.key, PC.b64(rawKey));
    assert.equal(store.session.vault.byPlaceholder['[PERSON_1]'], 'Jan de Vries');
    assert.equal(store.session.vault.byPlaceholder['[IBAN_1]'], 'NL91 ABNA 0417 1643 00');
  });

  await test('vergrendelen vraagt de achtergrond om de kluis weg te schrijven en de sleutel te wissen', async () => {
    await L.lock();
    assert.deepEqual(sent.at(-1), { type: 'pf:lock' });
  });

  await test('zonder kluisbeveiliging is er niets te ontgrendelen', async () => {
    delete store.local.protect;
    await assert.rejects(L.unlockPassword('goed-wachtwoord'), { message: 'titleOff' });
  });

  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  process.exit(failed ? 1 : 0);
})();
