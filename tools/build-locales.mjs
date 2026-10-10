// Maakt _locales/<taal>/messages.json uit src/strings.js (naam, beschrijving en knoptitel in Chrome).
// Gebruik: node tools/build-locales.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { STRINGS } = createRequire(import.meta.url)('../src/strings.js');
for (const [lang, strings] of Object.entries(STRINGS)) {
  const messages = Object.fromEntries(['extName', 'extDescription', 'actionTitle'].map(k => [k, { message: strings[k] }]));
  fs.mkdirSync(`_locales/${lang}`, { recursive: true });
  fs.writeFileSync(`_locales/${lang}/messages.json`, JSON.stringify(messages, null, 2) + '\n');
  console.log(`_locales/${lang}: beschrijving ${strings.extDescription.length} tekens (max 132)`);
}
