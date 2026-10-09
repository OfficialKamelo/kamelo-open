// Maakt het pakket voor de Chrome Web Store: alleen de extensie zelf (geen demo, tests, marketing of sleutels).
//
// Elke store heeft een eigen map in web-store-uploaden/, met het pakket, de afbeeldingen en INVULLEN-*.md:
//   node tools/pack.mjs           → Google Chrome/ en Microsoft Edge/kamelo-store-<versie>.zip (hetzelfde pakket)
//   node tools/pack.mjs --beta    → Google Chrome/kamelo-beta-<versie>.zip
//   node tools/pack.mjs --firefox → Firefox/kamelo-firefox-<versie>.zip (voor addons.mozilla.org)
//
// De bètaversie heet "Kamelo Beta" en toont een β op het icoon, zodat je hem naast de gewone versie herkent.
// Hij is bedoeld voor een aparte, verborgen vermelding in de Web Store (zie docs/RELEASING.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENTS = ['manifest.json', '_locales', 'src', 'popup', 'unlock', 'icons'];
const OUT_DIR = path.join(ROOT, 'web-store-uploaden');
export const STORES = { chrome: 'Google Chrome', edge: 'Microsoft Edge', firefox: 'Firefox' };

// Firefox kent geen service worker als achtergrond: daar laadt het manifest de scripts zelf, in dezelfde
// volgorde als importScripts in background.js. Verder een vast add-on-ID, de minimale versie
// (world: MAIN en match_origin_as_fallback bestaan pas vanaf Firefox 128) en de verklaring dat
// Kamelo geen gegevens verzamelt (verplicht voor nieuwe add-ons sinds november 2025).
export function firefoxManifest(manifest) {
  const m = structuredClone(manifest);
  m.background = { scripts: ['src/vaultcrypto.js', 'src/vaultstore.js', 'src/stats.js', 'src/background.js'] };
  m.browser_specific_settings = {
    gecko: { id: 'kamelo@kamelo.eu', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
  };
  return m;
}

export function pack({ beta = false, firefox = false } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const { version } = manifest;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-pack-'));
  try {
    for (const entry of CONTENTS) {
      fs.cpSync(path.join(ROOT, entry), path.join(tmp, entry), { recursive: true, filter: src => path.basename(src) !== '.DS_Store' });
    }
    if (beta) {
      Object.assign(manifest, { name: 'Kamelo Beta', version_name: `${version} beta` });
      manifest.action.default_title = 'Kamelo Beta';
    }
    if (beta || firefox) {
      fs.writeFileSync(path.join(tmp, 'manifest.json'), `${JSON.stringify(firefox ? firefoxManifest(manifest) : manifest, null, 2)}\n`);
    }
    const name = `kamelo-${firefox ? 'firefox' : beta ? 'beta' : 'store'}-${version}.zip`;
    const stores = firefox ? [STORES.firefox] : beta ? [STORES.chrome] : [STORES.chrome, STORES.edge];
    const zip = path.join(tmp, name);
    execFileSync('zip', ['-qrX', zip, ...CONTENTS], { cwd: tmp });
    const outs = stores.map(store => {
      const out = path.join(OUT_DIR, store, name);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(zip, out);
      return path.relative(ROOT, out);
    });
    return outs[0];
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(pack({ beta: process.argv.includes('--beta'), firefox: process.argv.includes('--firefox') }));
}
