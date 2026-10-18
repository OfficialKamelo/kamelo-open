// Maakt de pakketten voor Chrome, Edge en Firefox: alleen de extensie zelf (geen demo, tests, marketing of sleutels).
//
// Twee edities uit dezelfde broncode (zie src/edition.js):
//   gratis (standaard)  de versie in de winkels: Private Chat en de melding bij persoonlijke onderwerpen op AI-chatsites.
//                       Zonder de bestanden voor het afschermen, en alleen toegang tot de AI-chatsites uit src/sites.js.
//   Kamelo Business    --teams: alles, zoals de broncode (afschermen, kluis, alle instellingen) plus Private Chat.
//
// Elke store heeft een eigen map in web-store-uploaden/, met het pakket, de afbeeldingen en INVULLEN-*.md:
//   node tools/pack.mjs           → Google Chrome/ en Microsoft Edge/kamelo-store-<versie>.zip (dezelfde code; Edge met de
//                                   naam en beschrijving zonder chat, zie noChatNames)
//   node tools/pack.mjs --beta    → Google Chrome/kamelo-beta-<versie>.zip
//   node tools/pack.mjs --firefox → Firefox/kamelo-firefox-<versie>.zip (voor addons.mozilla.org)
//   node tools/pack.mjs --teams   → Kamelo Business/kamelo-teams-<versie>.zip (met --firefox: kamelo-teams-firefox-…)
//   --test                        → naam "Melo (test)" of "Kamelo Business (test)", om naast de echte te laden
//
// De gratis editie heet Melo ("Melo: private AI chat, by Kamelo", sinds 17 okt 2026): Melo is het product, de extensie is hoe
// je Melo aan je browser toevoegt. Kamelo blijft de maker, en Kamelo Business heet zo.
// De bètaversie heet "Melo Beta" en toont een β op het icoon, zodat je hem naast de gewone versie herkent.
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
export const STORES = { chrome: 'Google Chrome', edge: 'Microsoft Edge', firefox: 'Firefox', teams: 'Kamelo Business' };
const require = createRequire(import.meta.url);
const { FX_ENABLED } = require('../chat/device.js');
const { SITES } = require('../src/sites.js');

// Alleen in Kamelo Business: alles voor het afschermen, de kluis en het maandoverzicht. Ook vendor/ (tesseract, de OCR
// van afbeeldingen) en de popup van teams.
export const TEAMS_ONLY = [
  'src/detector.js', 'src/vaultcrypto.js', 'src/vaultstore.js', 'src/vaultlock.js', 'src/vaultscope.js', 'src/stats.js',
  'src/net-main.js', 'src/ai-hosts.js', 'src/marks.css', 'unlock', 'vendor', 'popup/popup.html', 'popup/popup.js',
  // Beheerd beleid van de organisatie (chrome.storage.managed) en het schema daarvan.
  'src/policy.js', 'src/managed-schema.json',
  // Licentie van de organisatie, offline gecontroleerd (alleen de openbare sleutel).
  'src/licence.js',
  // Opmaak voor beleid en licentie in de popup van teams.
  'popup/teams.css',
  // Nieuwe modules van teams (ronde 1 en later): bestanden afschermen, klantenlijst, AI-beleid. De hele map.
  'src/teams',
  // Bestanden en afbeeldingen in Private Chat (leest met de lezers uit src/teams).
  'chat/read.js',
  // Melo's zakelijke onderdelen: e-mail met afgeschermde gegevens, actiepunten, beslissing (de gratis editie heeft eigen onderdelen in rich.js).
  'chat/rich-werk.js',
];
// Hoort dit bestand (of deze map) alleen bij teams? Ook bestanden ín een map uit TEAMS_ONLY (src/teams/files.js).
export const teamsOnly = f => TEAMS_ONLY.some(t => f === t || f.startsWith(`${t}/`));
// Alleen in de gratis editie: de eigen, eenvoudige popup.
export const PUBLIC_ONLY = ['popup/public.html', 'popup/public.js', 'popup/public.css'];

// De achtergrondscripts per editie, in dezelfde volgorde als importScripts in background.js (voor Firefox).
const BACKGROUND = {
  public: ['src/edition.js', 'src/sites.js', 'src/config.js', 'src/topic-ai.js', 'src/background.js'],
  teams: ['src/edition.js', 'src/sites.js', 'src/config.js', 'src/policy.js', 'src/teams/ai-apps.js', 'src/licence.js', 'src/vaultcrypto.js', 'src/vaultstore.js', 'src/stats.js',
    'src/teams/terms-index.js', 'src/detector.js', 'src/vaultscope.js', 'src/teams/doclayer.js', 'src/background.js'],
};

// De AI-chatsites uit sites.js als adrespatronen: het domein zelf en elk subdomein. Zonder de sites die alleen voor
// teams zijn (ontwikkelaarsconsoles, chatbot-widgets).
export const aiSitePatterns = () => [...new Set(SITES.filter(s => !s.teams).flatMap(s => s.hosts.flatMap(h => [`https://${h}/*`, `https://*.${h}/*`])))];

// De gratis editie: geen afschermen, dus geen netwerkfilter, geen markeringen en geen kluis. Content scripts en
// toegang alleen op de AI-chatsites, in plaats van op elke site. Geen alarms meer (die waren voor het opschonen van
// de kluis); scripting blijft, om Kamelo na installeren of bijwerken in al open AI-tabbladen te starten.
// Naam: Melo (zie boven). Melo is een naam en wordt nooit vertaald, dus de korte naam en de knoptitel staan er letterlijk.
export const PUBLIC_NAME = 'Melo';
export function publicManifest(manifest) {
  const m = structuredClone(manifest);
  m.name = '__MSG_extName__';
  m.short_name = PUBLIC_NAME;
  m.description = '__MSG_extDescription__';
  m.action.default_title = PUBLIC_NAME;
  // Geen OCR van afbeeldingen (teams/ocr-host.js) in de gratis editie: geen offscreen-document, en geen wasm in de
  // extensiepagina's (de standaard-CSP van MV3, zonder 'wasm-unsafe-eval').
  // Geen downloads: het terugzetten van gegevens in bestanden (teams/originals.js) is alleen voor Kamelo Business.
  m.permissions = m.permissions.filter(p => p !== 'alarms' && p !== 'offscreen' && !p.startsWith('downloads'));
  delete m.content_security_policy;
  const sites = aiSitePatterns();
  m.host_permissions = sites;
  const isolated = m.content_scripts.find(cs => !cs.world || cs.world === 'ISOLATED');
  m.content_scripts = [{
    ...isolated,
    matches: sites,
    js: isolated.js.filter(f => !teamsOnly(f)),
  }];
  delete m.content_scripts[0].css;
  m.action.default_popup = 'popup/public.html';
  return m;
}

// Firefox kent geen service worker als achtergrond: daar laadt het manifest de scripts zelf, in dezelfde
// volgorde als importScripts in background.js. Verder een vast add-on-ID, de minimale versie
// (world: MAIN en match_origin_as_fallback bestaan pas vanaf Firefox 128) en de verklaring dat
// Kamelo geen gegevens verzamelt (verplicht voor nieuwe add-ons sinds november 2025).
// src/edition.js voor de gratis editie. In kamelo-open staat hij al op 'public' (tools/open-tree.mjs); dat is goed.
// Lukt het omzetten niet (edition.js anders opgemaakt), dan nooit stilletjes een teams-pakket als gratis versie bouwen.
export function publicEdition(text) {
  const out = text.replace("root.KameloEdition = 'teams';", "root.KameloEdition = 'public';");
  if (!out.includes("root.KameloEdition = 'public';") || /KameloEdition\s*=\s*['"]teams['"]/.test(out)) throw new Error('src/edition.js: kan de editie niet op public zetten');
  return out;
}

// In Firefox en Edge kun je (nog) niet met Melo chatten: daar biedt de gratis editie alleen de tijdelijke chat. Een eigen
// naam en beschrijving die geen privéchat beloven ("Melo: personal AI questions, by Kamelo"). De sleutels heten naar
// Firefox, maar gelden ook voor Edge. Een bèta- of testnaam blijft staan.
export function noChatNames(m) {
  if (m.name === '__MSG_extName__') m.name = '__MSG_extNameFirefox__';
  m.description = '__MSG_extDescriptionFirefox__';
  return m;
}

export function firefoxManifest(manifest, { teams = true } = {}) {
  const m = structuredClone(manifest);
  m.background = { scripts: BACKGROUND[teams ? 'teams' : 'public'] };
  m.browser_specific_settings = {
    gecko: { id: teams ? 'teams@kamelo.eu' : 'kamelo@kamelo.eu', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
  };
  // Het add-on-ID blijft kamelo@kamelo.eu, ook nu de extensie Melo heet (een nieuw ID is een nieuwe add-on).
  if (!teams) noChatNames(m);
  // Private Chat op dit apparaat (chat/device.js): Firefox' eigen AI (trial.ml) mag alleen als optionele toestemming,
  // pas gevraagd na een klik op Downloaden, en alleen zolang die aan staat (nu uit: te traag). Firefox kent geen
  // zijpaneel-API: daar opent de chat in een eigen venster.
  if (FX_ENABLED) m.optional_permissions = [...new Set([...(m.optional_permissions || []), 'trialML'])];
  // Firefox kent ook geen offscreen-documenten: daar geen OCR van afbeeldingen (die blijven tegengehouden), en geen
  // vendor/ (zie build), dus ook de bestanden van tesseract niet.
  // activeTab is alleen voor "Lees deze pagina" in Melo (chat/page.js): zolang Melo in Firefox uit staat, ook dat recht niet.
  m.permissions = m.permissions.filter(p => p !== 'sidePanel' && p !== 'offscreen' && (FX_ENABLED || p !== 'activeTab'));
  delete m.content_security_policy;
  delete m.side_panel;
  // Firefox kent storage.managed_schema niet: daar komt beheerd beleid uit policies.json ("3rdparty"), zonder schema.
  delete m.storage;
  return m;
}

// Alleen Kamelo Business: het schema voor beheerd beleid (chrome.storage.managed), zodat IT het via Google Admin,
// Intune of een macOS-profiel kan instellen (docs/teams/UITROLLEN.md). Firefox leest beleid anders (policies.json).
export const MANAGED_SCHEMA = 'src/managed-schema.json';
export function teamsManifest(manifest) {
  const m = structuredClone(manifest);
  m.storage = { ...(m.storage || {}), managed_schema: MANAGED_SCHEMA };
  return m;
}

// Het manifest van een pakket.
export function manifestFor(manifest, { teams = false, beta = false, firefox = false, edge = false, test = false } = {}) {
  let m = teams ? teamsManifest(manifest) : publicManifest(manifest);
  if (edge && !teams) noChatNames(m);
  if (beta) {
    Object.assign(m, { name: `${PUBLIC_NAME} Beta`, version_name: `${m.version} beta` });
    m.action.default_title = m.name;
  }
  if (test) {
    m.name = teams ? 'Kamelo Business (test)' : `${PUBLIC_NAME} (test)`;
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
export function build(dir, { teams = false, beta = false, firefox = false, edge = false, test = false } = {}) {
  if (teams && !fs.existsSync(path.join(ROOT, 'src/detector.js'))) throw new Error('Kamelo Business zit niet in deze repo.');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const skip = new Set(teams ? PUBLIC_ONLY : TEAMS_ONLY);
  // Firefox kent geen offscreen-documenten, dus ook geen OCR: vendor/ (tesseract) gaat niet mee (zie firefoxManifest).
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
  const m = manifestFor(manifest, { teams, beta, firefox, edge, test });
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`);
  // Het nagebootste beleid en licenties met de testsleutel alleen in testversies; in echte pakketten uit.
  if (teams && !test) setTestBuild(dir, false);
  if (!teams) {
    const edition = path.join(dir, 'src/edition.js');
    fs.writeFileSync(edition, publicEdition(fs.readFileSync(edition, 'utf8')));
  }
  dropMissingScripts(dir);
  return m;
}

// Zet `const TEST_BUILD = true;` in de bestanden van teams op `on`. Lukt dat niet, dan stoppen (nooit stilletjes een
// echt pakket met de testhaak bouwen).
export const TEST_BUILD_FILES = ['src/policy.js', 'src/licence.js'];
function setTestBuild(dir, on) {
  for (const f of TEST_BUILD_FILES) {
    const file = path.join(dir, f);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/^(\s*)const TEST_BUILD = (true|false);/m, `$1const TEST_BUILD = ${on};`);
    if (!after.includes(`const TEST_BUILD = ${on};`)) throw new Error(`${f}: kan TEST_BUILD niet op ${on} zetten`);
    fs.writeFileSync(file, after);
  }
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
    const kind = teams ? (firefox ? 'teams-firefox' : 'teams') : firefox ? 'firefox' : beta ? 'beta' : 'store';
    const name = `kamelo-${kind}-${version}${test ? '-test' : ''}.zip`;
    const stores = teams ? [STORES.teams] : firefox ? [STORES.firefox] : beta ? [STORES.chrome] : [STORES.chrome, STORES.edge];
    // Edge krijgt een eigen pakket: dezelfde code, met de naam zonder chat (noChatNames). De bestandsnaam blijft gelijk.
    const outs = stores.map(store => {
      const dir = path.join(tmp, store, 'kamelo');
      build(dir, { teams, beta, firefox, test, edge: store === STORES.edge });
      const zip = zipDir(dir, path.join(tmp, store, name));
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
