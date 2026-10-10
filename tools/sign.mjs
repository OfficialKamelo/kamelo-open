// Ondertekende uploads voor de Chrome Web Store ("Verified CRX uploads"). Is dit aan in het dashboard, dan accepteert
// de Web Store alleen nog pakketten die met onze privésleutel zijn ondertekend. Een gestolen Google-account kan dan
// geen eigen versie van Kamelo uploaden.
//
//   node tools/sign.mjs --init                 maakt de sleutel (één keer) en toont de openbare sleutel voor het dashboard
//   node tools/sign.mjs <pakket.zip>           maakt <pakket>.crx ernaast, ondertekend met de privésleutel
//
// De privésleutel staat buiten de repo: ~/.kamelo/kamelo-crx-key.pem (of KAMELO_CRX_KEY=pad). Nooit in git of de cloud;
// bewaar een kopie offline (bijv. op een usb-stick in een kluis). Kwijt = via de support van de Web Store opnieuw instellen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const KEY = process.env.KAMELO_CRX_KEY || path.join(os.homedir(), '.kamelo', 'kamelo-crx-key.pem');
export const hasKey = () => fs.existsSync(KEY);

function chromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) throw new Error('Google Chrome niet gevonden. Zet CHROME_PATH naar de Chrome-binary.');
  return found;
}

// Chrome pakt zelf in (CRX3), zoals de Web Store aanraadt: --pack-extension met onze sleutel.
export function signCrx(zip) {
  if (!hasKey()) throw new Error(`Geen sleutel in ${KEY}. Maak er een met: node tools/sign.mjs --init`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-crx-'));
  try {
    const dir = path.join(tmp, 'kamelo');
    fs.mkdirSync(dir);
    execFileSync('unzip', ['-q', path.resolve(zip), '-d', dir]);
    execFileSync(chromeBinary(), [`--pack-extension=${dir}`, `--pack-extension-key=${KEY}`, '--no-message-box',
      `--user-data-dir=${path.join(tmp, 'profile')}`], { stdio: 'ignore', timeout: 60_000 });
    const out = zip.replace(/\.zip$/, '.crx');
    fs.copyFileSync(`${dir}.crx`, out);
    return out;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function init() {
  if (hasKey()) {
    console.log(`Er is al een sleutel: ${KEY} (niet overschreven).`);
  } else {
    fs.mkdirSync(path.dirname(KEY), { recursive: true, mode: 0o700 });
    const pem = execFileSync('openssl', ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048'], { encoding: 'utf8' });
    fs.writeFileSync(KEY, pem, { mode: 0o600 });
    console.log(`Nieuwe privésleutel: ${KEY}\nMaak nu een offline kopie (usb-stick) en zet hem nooit in git of de cloud.`);
  }
  const pub = execFileSync('openssl', ['pkey', '-in', KEY, '-pubout'], { encoding: 'utf8' });
  console.log('\nOpenbare sleutel voor het dashboard (Package → Verified CRX uploads):\n');
  console.log(pub);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--init') init();
  else if (arg?.endsWith('.zip')) console.log(signCrx(arg));
  else { console.log('Gebruik: node tools/sign.mjs --init | <pakket.zip>'); process.exit(1); }
}
