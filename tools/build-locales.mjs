// Maakt _locales/<taal>/messages.json uit src/strings.js (naam, beschrijving en knoptitel in Chrome; ook die van Kamelo Business
// en de naam en beschrijving voor Firefox, waar Melo's chat (nog) niet werkt).
// Gebruik: node tools/build-locales.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { STRINGS } = createRequire(import.meta.url)('../src/strings.js');
for (const [lang, strings] of Object.entries(STRINGS)) {
  const messages = Object.fromEntries(['extName', 'extDescription', 'actionTitle', 'extNameTeams', 'extDescriptionTeams', 'extNameFirefox', 'extDescriptionFirefox'].map(k => [k, { message: strings[k] }]));
  fs.mkdirSync(`_locales/${lang}`, { recursive: true });
  fs.writeFileSync(`_locales/${lang}/messages.json`, JSON.stringify(messages, null, 2) + '\n');
  console.log(`_locales/${lang}: naam ${strings.extName.length}, Firefox ${strings.extNameFirefox.length} (max 45), beschrijving ${strings.extDescription.length}, teams ${strings.extDescriptionTeams.length}, Firefox ${strings.extDescriptionFirefox.length} tekens (max 132)`);
}
