// Draai met: node tests/pack.test.mjs
// Het Firefox-pakket: Firefox' eigen AI (trialML) alleen als optionele toestemming, en geen zijpaneel (dat kent Firefox
// niet). Chrome en Edge houden hun zijpaneel en krijgen geen onbekende toestemming. De gratis editie belooft in Firefox
// geen Melo (die bestaat daar niet). Safari (in Melo voor Mac) en het optionele recht voor Melo voor Mac.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, firefoxManifest, manifestFor, publicEdition } from '../tools/pack.mjs';
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
test('Safari (Melo voor Mac): eigen beschrijving van hooguit 112 tekens in elke taal (eis van de App Store)', () => {
  assert.equal(manifestFor(manifest, { safari: true }).description, '__MSG_extDescriptionSafari__');
  for (const lang of fs.readdirSync(new URL('../_locales', import.meta.url))) {
    const msgs = JSON.parse(fs.readFileSync(new URL(`../_locales/${lang}/messages.json`, import.meta.url), 'utf8'));
    assert.ok(msgs.extDescriptionSafari.message.length <= 112, lang);
    assert.match(msgs.extDescriptionSafari.message, /Melo/, lang);
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
test('Melo voor Mac: nativeMessaging alleen optioneel (Chrome, Edge, Firefox), in Safari een gewoon recht zonder zijpaneel; Business niet', () => {
  for (const m of [manifestFor(manifest), manifestFor(manifest, { edge: true }), manifestFor(manifest, { firefox: true })]) {
    assert.ok(m.optional_permissions.includes('nativeMessaging') && m.optional_permissions.includes('contextMenus'));
    assert.ok(!m.permissions.includes('nativeMessaging') && !m.permissions.includes('contextMenus'), 'geen nieuwe waarschuwing bij bijwerken');
  }
  const sf = manifestFor(manifest, { safari: true });
  assert.deepEqual(sf.permissions, ['storage', 'scripting', 'activeTab', 'nativeMessaging', 'contextMenus']);
  assert.equal(sf.side_panel, undefined);
  assert.equal(sf.optional_permissions, undefined);
  assert.equal(sf.name, '__MSG_extName__', 'Safari heeft Melo (via de app): de naam met chat');
  const teams = manifestFor(manifest, { teams: true });
  assert.ok(![...teams.permissions, ...(teams.optional_permissions || [])].some(p => p === 'nativeMessaging' || p === 'contextMenus'));
  assert.throws(() => build(fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-sf-')), { safari: true, teams: true }));
});
test('Melo voor Mac: de schakelaar in de popup staat aan (de app staat op kamelo.eu/app)', () => {
  assert.match(fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8'), /const MELO_MAC_IN_POPUP = true;/);
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
test('geen werkaantekeningen in een pakket: geen CLAUDE.md, geen .DS_Store (beide edities, Chrome en Firefox)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-pack-'));
  try {
    for (const opts of [{}, { firefox: true }, { teams: true }, { teams: true, firefox: true }]) {
      const dir = path.join(tmp, JSON.stringify(opts).replace(/\W/g, '') || 'gratis');
      build(dir, opts);
      const bad = fs.readdirSync(dir, { recursive: true }).filter(f => ['CLAUDE.md', '.DS_Store'].includes(path.basename(String(f))));
      assert.deepEqual(bad, [], JSON.stringify(opts));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
console.log(`\n${passed} geslaagd`);
