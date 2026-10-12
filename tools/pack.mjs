// Maakt de pakketten voor Chrome, Edge en Firefox: alleen de extensie zelf (geen demo, tests, marketing of sleutels).
//
// Twee edities uit dezelfde broncode (zie src/edition.js):
//   gratis (standaard)  de versie in de winkels: Private Chat en de melding bij persoonlijke onderwerpen op AI-chatsites.
//                       Zonder de bestanden voor het afschermen, en alleen toegang tot de AI-chatsites uit src/sites.js.
//   Kamelo for teams    --teams: alles, zoals de broncode (afschermen, kluis, alle instellingen) plus Private Chat.
//
// Elke store heeft een eigen map in web-store-uploaden/, met het pakket, de afbeeldingen en INVULLEN-*.md:
//   node tools/pack.mjs           → Google Chrome/ en Microsoft Edge/kamelo-store-<versie>.zip (hetzelfde pakket)
//   node tools/pack.mjs --beta    → Google Chrome/kamelo-beta-<versie>.zip
//   node tools/pack.mjs --firefox → Firefox/kamelo-firefox-<versie>.zip (voor addons.mozilla.org)
//   node tools/pack.mjs --teams   → Kamelo for teams/kamelo-teams-<versie>.zip (met --firefox: kamelo-teams-firefox-…)
//   --test                        → naam "Kamelo (test)" of "Kamelo for teams (test)", om naast de echte te laden
//
// De bètaversie heet "Kamelo Beta" en toont een β op het icoon, zodat je hem naast de gewone versie herkent.
// Hij is bedoeld voor een aparte, verborgen vermelding in de Web Store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENTS = ['manifest.json', '_locales', 'src', 'popup', 'unlock', 'icons', 'chat', 'vendor'];
const OUT_DIR = path.join(ROOT, 'web-store-uploaden');
export const STORES = { chrome: 'Google Chrome', edge: 'Microsoft Edge', firefox: 'Firefox', teams: 'Kamelo for teams' };
const require = createRequire(import.meta.url);
const { FX_ENABLED } = require('../chat/device.js');
const { SITES } = require('../src/sites.js');

// Alleen in Kamelo for teams: alles voor het afschermen, de kluis en het maandoverzicht. Ook vendor/ (de Tinfoil-bundel
// voor de "chip" van Kamelo Plus, die met placeholders werkt) en de popup van teams.
export const TEAMS_ONLY = [
  'src/detector.js', 'src/vaultcrypto.js', 'src/vaultstore.js', 'src/vaultlock.js', 'src/vaultscope.js', 'src/stats.js',
  'src/net-main.js', 'src/ai-hosts.js', 'src/marks.css', 'unlock', 'vendor', 'popup/popup.html', 'popup/popup.js',
];
// Alleen in de gratis editie: de eigen, eenvoudige popup.
export const PUBLIC_ONLY = ['popup/public.html', 'popup/public.js', 'popup/public.css'];

// De achtergrondscripts per editie, in dezelfde volgorde als importScripts in background.js (voor Firefox).
const BACKGROUND = {
  public: ['src/edition.js', 'src/sites.js', 'src/config.js', 'src/topic-ai.js', 'src/background.js'],
  teams: ['src/edition.js', 'src/sites.js', 'src/config.js', 'src/vaultcrypto.js', 'src/vaultstore.js', 'src/stats.js',
    'src/detector.js', 'src/vaultscope.js', 'src/background.js'],
};

// De AI-chatsites uit sites.js als adrespatronen: het domein zelf en elk subdomein. Zonder de sites die alleen voor
// teams zijn (ontwikkelaarsconsoles, chatbot-widgets).
export const aiSitePatterns = () => [...new Set(SITES.filter(s => !s.teams).flatMap(s => s.hosts.flatMap(h => [`https://${h}/*`, `https://*.${h}/*`])))];

// De gratis editie: geen afschermen, dus geen netwerkfilter, geen markeringen en geen kluis. Content scripts en
// toegang alleen op de AI-chatsites, in plaats van op elke site. Geen alarms meer (die waren voor het opschonen van
// de kluis); scripting blijft, om Kamelo na installeren of bijwerken in al open AI-tabbladen te starten.
export function publicManifest(manifest) {
  const m = structuredClone(manifest);
  m.name = '__MSG_extName__';
  m.description = '__MSG_extDescription__';
  m.permissions = m.permissions.filter(p => p !== 'alarms');
  const sites = aiSitePatterns();
  m.host_permissions = sites;
  const isolated = m.content_scripts.find(cs => !cs.world || cs.world === 'ISOLATED');
  m.content_scripts = [{
    ...isolated,
    matches: sites,
    js: isolated.js.filter(f => !TEAMS_ONLY.includes(f)),
  }];
  delete m.content_scripts[0].css;
  m.action.default_popup = 'popup/public.html';
  return m;
}

// Firefox kent geen service worker als achtergrond: daar laadt het manifest de scripts zelf, in dezelfde
// volgorde als importScripts in background.js. Verder een vast add-on-ID, de minimale versie
// (world: MAIN en match_origin_as_fallback bestaan pas vanaf Firefox 128) en de verklaring dat
// Kamelo geen gegevens verzamelt (verplicht voor nieuwe add-ons sinds november 2025).
export function firefoxManifest(manifest, { teams = true } = {}) {
  const m = structuredClone(manifest);
  m.background = { scripts: BACKGROUND[teams ? 'teams' : 'public'] };
  m.browser_specific_settings = {
    gecko: { id: teams ? 'teams@kamelo.eu' : 'kamelo@kamelo.eu', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
  };
  // Private Chat op dit apparaat (chat/device.js): Firefox' eigen AI (trial.ml) mag alleen als optionele toestemming,
  // pas gevraagd na een klik op Downloaden, en alleen zolang die aan staat (nu uit: te traag). Firefox kent geen
  // zijpaneel-API: daar opent de chat in een eigen venster.
  if (FX_ENABLED) m.optional_permissions = [...new Set([...(m.optional_permissions || []), 'trialML'])];
  m.permissions = m.permissions.filter(p => p !== 'sidePanel');
  delete m.side_panel;
  return m;
}

// Het manifest van een pakket.
export function manifestFor(manifest, { teams = false, beta = false, firefox = false, test = false } = {}) {
  let m = teams ? structuredClone(manifest) : publicManifest(manifest);
  if (beta) {
    Object.assign(m, { name: 'Kamelo Beta', version_name: `${m.version} beta` });
    m.action.default_title = 'Kamelo Beta';
  }
  if (test) {
    m.name = teams ? 'Kamelo for teams (test)' : 'Kamelo (test)';
    m.action.default_title = m.name;
  }
  if (firefox) m = firefoxManifest(m, { teams });
  return m;
}

// Een <script src> naar een bestand dat niet in het pakket zit (bijv. detector.js in chat.html van de gratis editie): weg.
export function dropMissingScripts(dir) {
  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    const page = path.join(dir, file);
    const html = fs.readFileSync(page, 'utf8');
    const out = html.replace(/^[ \t]*<script src="([^"]+)"><\/script>\n/gm,
      (line, src) => (fs.existsSync(path.resolve(path.dirname(page), src)) ? line : ''));
    if (out !== html) fs.writeFileSync(page, out);
  }
}

// Zet het uitgepakte pakket in `dir` (leeg of nog niet bestaand). Geeft het manifest terug.
export function build(dir, { teams = false, beta = false, firefox = false, test = false } = {}) {
  if (teams && !fs.existsSync(path.join(ROOT, 'src/detector.js'))) throw new Error('Kamelo for teams zit niet in deze repo.');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const skip = new Set(teams ? PUBLIC_ONLY : TEAMS_ONLY);
  // Firefox krijgt geen Private Chat (alleen de tijdelijke chat), dus ook de Tinfoil-bundel voor Plus niet:
  // dat scheelt bijna 1 MB en een broncodevraag bij de keuring van addons.mozilla.org.
  if (firefox) skip.add('vendor');
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of CONTENTS) {
    // De openbare repo kamelo-open heeft alleen de gratis editie: daar ontbreken unlock/ en vendor/.
    if (skip.has(entry) || !fs.existsSync(path.join(ROOT, entry))) continue;
    fs.cpSync(path.join(ROOT, entry), path.join(dir, entry), {
      recursive: true,
      filter: src => path.basename(src) !== '.DS_Store' && !skip.has(path.relative(ROOT, src).split(path.sep).join('/')),
    });
  }
  const m = manifestFor(manifest, { teams, beta, firefox, test });
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`);
  if (!teams) {
    const edition = path.join(dir, 'src/edition.js');
    const before = fs.readFileSync(edition, 'utf8');
    const after = before.replace("root.KameloEdition = 'teams';", "root.KameloEdition = 'public';");
    // Lukt het omzetten niet (edition.js anders opgemaakt), dan nooit stilletjes een teams-pakket als gratis versie bouwen.
    if (after === before || !after.includes("root.KameloEdition = 'public';")) throw new Error('src/edition.js: kan de editie niet op public zetten');
    fs.writeFileSync(edition, after);
  }
  dropMissingScripts(dir);
  return m;
}

// Maakt een zip van een uitgepakt pakket.
export function zipDir(dir, zip) {
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-qrX', path.resolve(zip), ...fs.readdirSync(dir).filter(f => f !== '.DS_Store')], { cwd: dir });
  return zip;
}

export function pack({ beta = false, firefox = false, teams = false, test = false } = {}) {
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-pack-'));
  try {
    const dir = path.join(tmp, 'kamelo');
    build(dir, { teams, beta, firefox, test });
    const kind = teams ? (firefox ? 'teams-firefox' : 'teams') : firefox ? 'firefox' : beta ? 'beta' : 'store';
    const name = `kamelo-${kind}-${version}${test ? '-test' : ''}.zip`;
    const stores = teams ? [STORES.teams] : firefox ? [STORES.firefox] : beta ? [STORES.chrome] : [STORES.chrome, STORES.edge];
    const zip = zipDir(dir, path.join(tmp, name));
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
  const flag = f => process.argv.includes(f);
  console.log(pack({ beta: flag('--beta'), firefox: flag('--firefox'), teams: flag('--teams'), test: flag('--test') }));
}
