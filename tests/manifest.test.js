// Draai met: node tests/manifest.test.js
// Chrome laadt hetzelfde bestand maar één keer per pagina. Delen twee content-script-items een bestand (bijv. één
// in de pagina en één in de afgeschermde omgeving), dan krijgt het tweede het niet en stopt het stil.
const assert = require('node:assert/strict');
const m = require('../manifest.json');
const seen = new Map();
for (const [i, cs] of m.content_scripts.entries()) {
  for (const file of cs.js || []) {
    assert.ok(!seen.has(file), `${file} staat in content_scripts[${seen.get(file)}] en [${i}]`);
    seen.set(file, i);
  }
}
const fs = require('node:fs');
for (const file of seen.keys()) assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', file)), `${file} bestaat niet`);
console.log('  ✓ geen gedeelde bestanden tussen content scripts');
console.log('\n1 geslaagd, 0 mislukt');
