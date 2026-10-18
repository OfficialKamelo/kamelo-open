// Draai met: node tests/pack.test.mjs
// Het Firefox-pakket: Firefox' eigen AI (trialML) alleen als optionele toestemming, en geen zijpaneel (dat kent Firefox
// niet). Chrome en Edge houden hun zijpaneel en krijgen geen onbekende toestemming. De gratis editie belooft in Firefox
// geen Melo (die bestaat daar niet).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firefoxManifest, manifestFor, publicEdition } from '../tools/pack.mjs';
import { createRequire } from 'node:module';
const { FX_ENABLED } = createRequire(import.meta.url)('../chat/device.js');

const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const fx = firefoxManifest(manifest);
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };

test('Chrome/Edge: geen trialML, wel het zijpaneel', () => {
  assert.doesNotMatch(JSON.stringify(manifest), /trialML/);
  assert.ok(manifest.side_panel && manifest.permissions.includes('sidePanel'));
});
test('Firefox: trialML alleen optioneel, en alleen als Firefox\' eigen AI aan staat', () => {
  assert.deepEqual(fx.optional_permissions || [], FX_ENABLED ? ['trialML'] : []);
  assert.ok(!fx.permissions.includes('trialML'));
});
test('Firefox: geen zijpaneel-sleutels', () => {
  assert.equal(fx.side_panel, undefined);
  assert.ok(!fx.permissions.includes('sidePanel'));
});
test('het Chrome-manifest wordt niet aangepast', () => {
  assert.ok(manifest.side_panel);
});
test('Firefox, gratis editie: eigen beschrijving zonder Melo; Chrome/Edge en Kamelo Business houden de hunne', () => {
  assert.equal(manifestFor(manifest, { firefox: true }).description, '__MSG_extDescriptionFirefox__');
  assert.equal(manifestFor(manifest).description, '__MSG_extDescription__');
  // Kamelo Business bestaat alleen in kamelo-prive; in kamelo-open (al de gratis editie) is er geen teams-pakket.
  const openTree = fs.readFileSync(new URL('../src/edition.js', import.meta.url), 'utf8').includes("KameloEdition = 'public'");
  if (!openTree) assert.equal(manifestFor(manifest, { teams: true, firefox: true }).description, '__MSG_extDescriptionTeams__');
  for (const lang of fs.readdirSync(new URL('../_locales', import.meta.url))) {
    const msgs = JSON.parse(fs.readFileSync(new URL(`../_locales/${lang}/messages.json`, import.meta.url), 'utf8'));
    assert.doesNotMatch(msgs.extDescriptionFirefox.message, /Melo|mask|afscherm/i, lang);
    assert.match(msgs.extDescriptionFirefox.message, /tempor|tijdelijke/i, lang);
    assert.ok(msgs.extDescriptionFirefox.message.length <= 132, lang);
  }
});
test('Melo-naam: Chrome "private AI chat"; Edge en Firefox (geen chat met Melo) de naam zonder chat; bèta en test blijven herkenbaar', () => {
  assert.equal(manifestFor(manifest).name, '__MSG_extName__');
  for (const opts of [{ edge: true }, { firefox: true }]) {
    const m = manifestFor(manifest, opts);
    assert.equal(m.name, '__MSG_extNameFirefox__', JSON.stringify(opts));
    assert.equal(m.description, '__MSG_extDescriptionFirefox__', JSON.stringify(opts));
    assert.equal(m.short_name, 'Melo');
  }
  // Edge houdt verder alles van Chrome (zijpaneel, rechten).
  const { name, description, ...chrome } = manifestFor(manifest);
  const { name: n2, description: d2, ...edge } = manifestFor(manifest, { edge: true });
  assert.deepEqual(edge, chrome);
  assert.equal(manifestFor(manifest, { edge: true, test: true }).name, 'Melo (test)');
  assert.equal(manifestFor(manifest, { beta: true }).name, 'Melo Beta');
  for (const lang of fs.readdirSync(new URL('../_locales', import.meta.url))) {
    const msgs = JSON.parse(fs.readFileSync(new URL(`../_locales/${lang}/messages.json`, import.meta.url), 'utf8'));
    assert.doesNotMatch(msgs.extNameFirefox.message, /chat|discussion/i, lang);
    assert.ok(msgs.extName.message.length <= 45 && msgs.extNameFirefox.message.length <= 45, lang);
  }
});
test('gratis editie in Chrome/Edge: precies deze rechten, met activeTab (Lees deze pagina) en geen toegang tot alle sites', () => {
  const m = manifestFor(manifest);
  assert.deepEqual(m.permissions, ['storage', 'scripting', 'activeTab', 'sidePanel']);
  assert.ok(!JSON.stringify(m).includes('<all_urls>'));
  assert.ok(m.host_permissions.every(h => /^https:\/\/(\*\.)?[a-z0-9.-]+\/\*$/.test(h)), 'alleen AI-chatsites');
  assert.equal(m.optional_host_permissions, undefined);
});
test('Firefox: geen activeTab zolang Melo daar uit staat', () => {
  assert.equal(manifestFor(manifest, { firefox: true }).permissions.includes('activeTab'), FX_ENABLED);
});
test('gratis editie: teams wordt public; al public (kamelo-open) mag; onbekend of teams blijft stopt', () => {
  const T = "  root.KameloEdition = 'teams';\n", P = "  root.KameloEdition = 'public';\n";
  assert.equal(publicEdition(T), P);
  assert.equal(publicEdition(P), P);
  assert.throws(() => publicEdition('  root.KameloEdition = "teams";\n'));
  assert.throws(() => publicEdition(P + '  root.KameloEdition = "teams";\n'));
  assert.throws(() => publicEdition('niets\n'));
});
console.log(`\n${passed} geslaagd`);
