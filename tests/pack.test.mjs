// Draai met: node tests/pack.test.mjs
// Het Firefox-pakket: Firefox' eigen AI (trialML) alleen als optionele toestemming, en geen zijpaneel (dat kent Firefox
// niet). Chrome en Edge houden hun zijpaneel en krijgen geen onbekende toestemming.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firefoxManifest, publicEdition } from '../tools/pack.mjs';
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
test('gratis editie: teams wordt public; al public (kamelo-open) mag; onbekend of teams blijft stopt', () => {
  const T = "  root.KameloEdition = 'teams';\n", P = "  root.KameloEdition = 'public';\n";
  assert.equal(publicEdition(T), P);
  assert.equal(publicEdition(P), P);
  assert.throws(() => publicEdition('  root.KameloEdition = "teams";\n'));
  assert.throws(() => publicEdition(P + '  root.KameloEdition = "teams";\n'));
  assert.throws(() => publicEdition('niets\n'));
});
console.log(`\n${passed} geslaagd`);
