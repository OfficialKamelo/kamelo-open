// Draai met: node tests/preview.test.mjs
// demo/popup-preview.html wordt gemaakt uit popup/popup.html. Loopt hij achter, dan kloppen de screenshots niet meer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPreview } from '../tools/build-preview.mjs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
try {
  assert.equal(read('demo/popup-preview.html'), buildPreview(read('popup/popup.html')), 'draai: node tools/build-preview.mjs');
  console.log('  ✓ popup-preview is bijgewerkt\n\n1 geslaagd, 0 mislukt');
} catch (e) {
  console.log(`  ✗ popup-preview is bijgewerkt\n    ${e.message.split('\n')[0]}\n\n0 geslaagd, 1 mislukt`);
  process.exit(1);
}
