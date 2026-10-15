// Laat niets vertrekken waar een geheim in zit. Zoekt naar de echte waarden uit kamelo.env (elke sleutel, ook die
// zonder herkenbaar patroon, zoals Tinfoil of Ko-fi) en naar bekende sleutelpatronen. Noemt bij een vondst alleen
// de naam van de sleutel en de plek, nooit de waarde.
//
//   node tools/check-secrets.mjs --staged            wat je nu gaat committen (git pre-commit)
//   node tools/check-secrets.mjs --range A..B        commits die je gaat pushen (git pre-push)
//   node tools/check-secrets.mjs pad [pad …]         bestanden, mappen of zips (sync naar kamelo-open, store-pakket)
//
// kamelo.env wordt gevonden met tools/env.mjs: $KAMELO_ENV, anders de hoofdmap van deze repo en de mappen erboven
// (zo ook vanuit werkmappen/<naam>/). Ontbreekt hij (bijvoorbeeld in CI), dan controleren we alleen de patronen.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { findEnv, readEnv } from './env.mjs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
let root = process.cwd();
try { root = git('rev-parse', '--show-toplevel').trim(); } catch {}

function loadSecrets() {
  const file = findEnv();
  if (!file) return { file: null, values: {} };
  const out = {};
  for (const [k, v] of Object.entries(readEnv(file))) {
    // ID's (account, product, client-id) zijn niet geheim en staan soms terecht in code.
    if (v.length >= 16 && !/_ID$/.test(k)) out[k] = v;
  }
  return { file, values: out };
}
const { file: envFile, values } = loadSecrets();

// Sleutels buiten kamelo.env, in ~/.kamelo: de Google-serviceaccount (Chrome Web Store) en de ondertekensleutel van de
// extensie (.pem). Elke regel van de sleutel telt als vingerafdruk, zodat ook een stuk ervan wordt herkend.
const KEY_DIR = process.env.KAMELO_KEYS || path.join(os.homedir(), '.kamelo');
function pemLines(pem, label) {
  String(pem).split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 40 && /^[A-Za-z0-9+/=]+$/.test(l))
    .forEach((l, i) => { values[`${label} (regel ${i + 1})`] = l; });
}
try {
  for (const f of fs.readdirSync(KEY_DIR)) {
    const full = path.join(KEY_DIR, f);
    if (f.endsWith('.pem')) pemLines(fs.readFileSync(full, 'utf8'), f);
    if (f.endsWith('.json')) {
      const j = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (j.private_key) pemLines(j.private_key, `${f} private_key`);
      if (j.private_key_id) values[`${f} private_key_id`] = j.private_key_id;
    }
  }
} catch {}

// Vaste vormen van sleutels. Waar een sleutel geen herkenbare vorm heeft (Cloudflare, ElevenLabs, Chrome Web Store,
// Microsoft/Edge, Tinfoil), vangt 'Sleutel in toewijzing' hieronder hem op aan de naam ervoor.
const PATTERNS = {
  // Anthropic: sk-ant-api03-…, sk-ant-admin01-…, sk-ant-oat01-… (base64url, dus ook - en _).
  'Anthropic-sleutel': /\bsk-ant-(?:(?:api|admin|oat|ort)\d\d-)?[A-Za-z0-9_-]{20,}/,
  // OpenAI: sk-proj-…, sk-svcacct-…, sk-admin-… en de oude vorm sk-<48 tekens>.
  'OpenAI-sleutel': /\bsk-(?:proj|svcacct|admin|None)-[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9]{32,}/,
  'ElevenLabs-sleutel': /\bsk_[a-f0-9]{48}\b/,
  'Stripe-sleutel': /\b[rs]k_live_[A-Za-z0-9]{20,}/,
  'AWS-sleutel': /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  'Google-sleutel': /\bAIza[0-9A-Za-z_-]{35}\b/,
  'Google OAuth-geheim': /\bGOCSPX-[A-Za-z0-9_-]{20,}/,
  'Google-token': /\bya29\.[A-Za-z0-9_-]{30,}|(?<![\w/])1\/\/0[A-Za-z0-9_-]{30,}/,
  'GitHub-token': /\bgh[pousr]_[A-Za-z0-9]{36,}|\bgithub_pat_[A-Za-z0-9_]{40,}/,
  'npm-token': /\bnpm_[A-Za-z0-9]{36}\b/,
  'Hugging Face-token': /\bhf_[A-Za-z]{34,}\b/,
  'Slack-token': /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  'Discord-webhook': /discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{30,}/,
  'Discord-bottoken': /\b[MN][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,38}\b/,
  'Privésleutel': /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/,
};

// Sleutels zonder vaste vorm, herkend aan de naam waar ze aan worden toegekend, in elke schrijfwijze:
//   CLOUDFLARE_API_TOKEN=…   export EDGE_API_KEY="…"   apiKey: '…'   "client_secret": "…"   secret = '…'
//   refresh-token: …   'xi-api-key': '…'   Authorization: Bearer …
// De naam moet eindigen op zo'n woord (dus niet tokenCount of secretLength) en de waarde moet op een sleutel lijken:
// lang genoeg, letters én cijfers en genoeg willekeur (entropie). Zo blijven process.env.API_KEY, een functieaanroep
// of een gewoon woord buiten schot.
const NAME = String.raw`[A-Za-z0-9_.-]*?(?:api[_-]?key|apikey|api[_-]?token|access[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|bot[_-]?token|bearer[_-]?token|client[_-]?secret|private[_-]?key|secret[_-]?key|secret|token|passwd|password)`;
const ASSIGN = [
  // naam = waarde, naam: waarde, met of zonder aanhalingstekens om naam en waarde (env, YAML, JSON, JS).
  new RegExp(String.raw`(?<![A-Za-z0-9])["']?(?<name>${NAME})["']?\s*(?::|=|:=)\s*["'\x60]?(?<v>[A-Za-z0-9_\-./+=~]{16,})(?![A-Za-z0-9_\-./+=~]*\()`, 'gi'),
  // Authorization: Bearer <token>
  /\bBearer\s+(?<v>[A-Za-z0-9_\-.~+/=]{24,})/g,
];

// Shannon-entropie in bits per teken.
function entropy(s) {
  const n = {}; for (const c of s) n[c] = (n[c] || 0) + 1;
  return Object.values(n).reduce((e, k) => e - (k / s.length) * Math.log2(k / s.length), 0);
}
// Lijkt deze waarde op een sleutel? Letters en cijfers, geen pad of punt-naam (process.env.X, a.b.c), genoeg willekeur.
function looksLikeKey(v) {
  v = v.replace(/[=.]+$/, '');
  if (v.length < 16) return false;
  if (!/[0-9]/.test(v) || !/[A-Za-z]/.test(v)) return false;
  if (/^[A-Za-z_$]+\d{0,3}$/.test(v)) return false;                        // naam van een variabele (cacheSecret2)
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(v)) return false;   // process.env.API_KEY, config.auth.token
  if (/^(?:\.{0,2}\/)?[\w.-]+(?:\/[\w.-]+)+\/?$/.test(v) && !/[+=~]/.test(v) && v.split('/').every(p => p.length < 16)) return false; // pad
  if (/^[0-9a-f]{32,}$/i.test(v)) return entropy(v) >= 3.0;                // hex (sha, md5): 16 tekens → max 4 bits
  return entropy(v) >= 3.5;
}

// Duidelijk nep (testgegevens, voorbeelden in de docs): een oplopende reeks, herhaling of een woord als EXAMPLE.
// Geldt alleen voor de patronen en wordt alleen op de waarde getest (niet op de naam ervoor: LATEST_API_KEY is niet nep);
// een echte waarde uit kamelo.env wordt altijd tegengehouden.
const FAKE = /abcdefgh|bcdefghi|0123456|123456789|(.)\1{7}|x{6}|X{6}|example|EXAMPLE|dummy|DUMMY|fake|FAKE|test|TEST|your[-_]?key|YOUR[-_]?KEY|placeholder|PLACEHOLDER|redacted|REDACTED/;

// Bekende onschuldige treffers, precies per bestand en sleutelnaam: [bestand (relatief), naam van het patroon, waarde-regex].
// Liever de waarde duidelijk nep maken dan hier iets toevoegen.
const ALLOW = [];
const allowed = (where, name, v) => ALLOW.some(([f, n, rx]) => where.endsWith(f) && n === name && rx.test(v));

const hits = [];
const warnings = [];
function scan(where, text) {
  if (!text) return;
  for (const [name, v] of Object.entries(values)) if (text.includes(v)) hits.push(`${name} (echte waarde uit kamelo.env) in ${where}`);
  for (const [name, rx] of Object.entries(PATTERNS)) {
    for (const m of text.matchAll(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'))) {
      if (!FAKE.test(m[0]) && !allowed(where, name, m[0])) { hits.push(`${name} in ${where}`); break; }
    }
  }
  const name = 'Sleutel in toewijzing';
  outer: for (const rx of ASSIGN) {
    for (const m of text.matchAll(new RegExp(rx.source, rx.flags))) {
      const v = m.groups.v;
      if (FAKE.test(v) || !looksLikeKey(v) || allowed(where, name, v)) continue;
      hits.push(`${name}${m.groups.name ? ` (${m.groups.name})` : ' (Bearer)'} in ${where}`); break outer;
    }
  }
}

// Alleen toegevoegde regels uit een diff, per bestand. Een regel '+++ …' is alleen een kop direct na 'diff --git'
// (een toegevoegde regel die zelf met '++ ' begint, is geen nieuw bestand).
function scanDiff(label, diff) {
  let file = '?', buf = [], head = false;
  const flush = () => { if (buf.length) scan(`${label}: ${file}`, buf.join('\n')); buf = []; };
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ') || line.startsWith('diff --cc ') || line.startsWith('diff --combined ')) { flush(); head = true; continue; }
    if (head) {
      if (line.startsWith('+++ ')) { file = line.replace(/^\+\+\+ (b\/)?/, ''); continue; }
      if (!line.startsWith('@@')) continue;
      head = false; continue;
    }
    if (line.startsWith('+')) buf.push(line.slice(1));
  }
  flush();
}

const ARCHIVE = /\.(zip|xpi|crx)$/i;
const CHUNK = 32 * 1024 * 1024, OVERLAP = 64 * 1024;

function scanPath(p, label) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== '.git' && e !== 'node_modules') scanPath(path.join(p, e));
    return;
  }
  const where = label || path.relative(root, p) || p;
  if (ARCHIVE.test(label || p)) {
    // Elk bestand in het pakket apart, zodat we kunnen zeggen waar het zit. Een .crx is een zip met een kop ervoor:
    // unzip waarschuwt dan (status 1) maar leest hem wel. Kan hij het pakket niet lezen, dan stoppen we.
    const unz = args => {
      const r = spawnSync('unzip', args, { maxBuffer: 256 * 1024 * 1024 });
      if (r.status > 1 || r.error) throw new Error(`Kan ${path.basename(where)} niet controleren.`);
      return r.stdout;
    };
    const list = unz(['-Z1', p]).toString('utf8').split('\n').filter(n => n && !n.endsWith('/'));
    if (!list.length) throw new Error(`Kan ${path.basename(where)} niet controleren.`);
    for (const n of list) scan(`${path.basename(where)} → ${n}`, unz(['-p', p, n]).toString('latin1'));
    return;
  }
  if (path.basename(p) === 'kamelo.env' && p === envFile) return;
  if (st.size <= CHUNK) { scan(where, fs.readFileSync(p).toString('latin1')); return; }
  // Groot bestand: in stukken (met overlap, zodat een sleutel op de grens niet wegvalt), niet overslaan.
  warnings.push(`${where} is groot (${Math.round(st.size / 1024 / 1024)} MB); in stukken gecontroleerd.`);
  const fd = fs.openSync(p, 'r'), buf = Buffer.alloc(CHUNK + OVERLAP);
  try {
    for (let pos = 0; pos < st.size; pos += CHUNK) {
      const n = fs.readSync(fd, buf, 0, CHUNK + OVERLAP, pos);
      scan(where, buf.subarray(0, n).toString('latin1'));
    }
  } finally { fs.closeSync(fd); }
}

// Bestanden die nooit in git horen, wat er ook in staat.
const KEY_FILE = /(^|\/)kamelo\.env$|(^|\/)\.env(\.|$)|\.env$|\.env\.(bak|old|backup|local|prod|production|dev|development)$|\.(pem|key|p12|pfx)$/i;

const args = process.argv.slice(2);
if (args[0] === '--staged') {
  // --text: ook binaire bestanden (anders staat er alleen 'Binary files differ' en zien we niets).
  scanDiff('commit', git('diff', '--cached', '--no-color', '-U0', '--no-ext-diff', '--text', '--diff-filter=ACMR'));
  const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean);
  for (const f of staged.filter(f => KEY_FILE.test(f))) hits.push(`een sleutelbestand staat klaar om gecommit te worden: ${f}`);
  // Pakketten (zip, xpi, crx): de versie in de index uitpakken en elk bestand erin controleren.
  const archives = staged.filter(f => ARCHIVE.test(f));
  if (archives.length) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-secrets-'));
    try {
      archives.forEach((f, i) => {
        const out = path.join(tmp, `${i}${path.extname(f)}`);
        fs.writeFileSync(out, execFileSync('git', ['cat-file', 'blob', `:${f}`], { maxBuffer: 1024 * 1024 * 1024 }));
        scanPath(out, `commit: ${f}`);
      });
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
} else if (args[0] === '--range') {
  // --diff-merges=first-parent: ook merges (standaard laat git log -p ze leeg), dus ook wat bij het oplossen van een
  // conflict is toegevoegd. --text: ook binaire bestanden.
  scanDiff('push', git('log', '-p', '--no-color', '-U0', '--no-ext-diff', '--text', '--diff-merges=first-parent', ...args.slice(1)));
} else if (args.length) {
  for (const p of args) scanPath(path.resolve(p));
} else {
  console.error('Gebruik: node tools/check-secrets.mjs --staged | --range A..B | pad …'); process.exit(2);
}

for (const w of warnings) console.error(`Let op: ${w}`);
if (hits.length) {
  console.error('\n✋ Gestopt: hier lijkt een geheim in te zitten. Er is niets verstuurd.');
  for (const h of [...new Set(hits)]) console.error(`   • ${h}`);
  console.error('\nHaal het weg (sleutels horen alleen in kamelo.env). Is het een nep-voorbeeld, maak het dan duidelijk nep.\n');
  process.exit(1);
}
if (!envFile && !process.env.CI) console.error('Let op: kamelo.env niet gevonden; alleen op patronen gecontroleerd.');
