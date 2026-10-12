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

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
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

const PATTERNS = {
  'OpenAI/Anthropic-sleutel': /\bsk-(?:proj-|ant-)?[A-Za-z0-9]{32,}/,
  'ElevenLabs-sleutel': /\bsk_[a-f0-9]{48}\b/,
  'Stripe-sleutel': /\b[rs]k_live_[A-Za-z0-9]{20,}/,
  'AWS-sleutel': /\bAKIA[0-9A-Z]{16}\b/,
  'Google-sleutel': /\bAIza[0-9A-Za-z_-]{35}\b/,
  'Google OAuth-geheim': /\bGOCSPX-[A-Za-z0-9_-]{20,}/,
  'GitHub-token': /\bgh[pousr]_[A-Za-z0-9]{36,}|\bgithub_pat_[A-Za-z0-9_]{40,}/,
  'Slack-token': /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  'Discord-webhook': /discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{30,}/,
  'Discord-bottoken': /\b[MN][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,38}\b/,
  'Privésleutel': /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/,
  'Sleutel in env-regel': /\b(?:[A-Z0-9]+_)*(?:API_KEY|API_TOKEN|SECRET|CLIENT_SECRET|BOT_TOKEN|REFRESH_TOKEN|JWT_SECRET)\s*=\s*["']?[A-Za-z0-9_\-./+]{16,}/,
};

// Duidelijk nep (testgegevens, voorbeelden in de docs): een oplopende reeks, herhaling of een woord als EXAMPLE.
// Geldt alleen voor de patronen; een echte waarde uit kamelo.env wordt altijd tegengehouden.
const FAKE = /abcdefgh|bcdefghi|0123456|123456789|(.)\1{7}|x{6}|X{6}|example|EXAMPLE|dummy|DUMMY|fake|FAKE|test|TEST|your[-_]?key|YOUR[-_]?KEY/;

const hits = [];
function scan(where, text) {
  if (!text) return;
  for (const [name, v] of Object.entries(values)) if (text.includes(v)) hits.push(`${name} (echte waarde uit kamelo.env) in ${where}`);
  for (const [name, rx] of Object.entries(PATTERNS)) {
    for (const m of text.matchAll(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'))) {
      if (!FAKE.test(m[0])) { hits.push(`${name} in ${where}`); break; }
    }
  }
}

// Alleen toegevoegde regels uit een diff, per bestand.
function scanDiff(label, diff) {
  let file = '?', buf = [];
  const flush = () => { if (buf.length) scan(`${label}: ${file}`, buf.join('\n')); buf = []; };
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) { flush(); file = line.replace(/^\+\+\+ (b\/)?/, ''); continue; }
    if (line.startsWith('+') && !line.startsWith('+++')) buf.push(line.slice(1));
  }
  flush();
}

function scanPath(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== '.git' && e !== 'node_modules') scanPath(path.join(p, e));
    return;
  }
  if (/\.(zip|xpi|crx)$/i.test(p)) {
    // Elk bestand in het pakket apart, zodat we kunnen zeggen waar het zit. Een .crx is een zip met een kop ervoor:
    // unzip waarschuwt dan (status 1) maar leest hem wel. Kan hij het pakket niet lezen, dan stoppen we.
    const unz = args => {
      const r = spawnSync('unzip', args, { maxBuffer: 256 * 1024 * 1024 });
      if (r.status > 1 || r.error) throw new Error(`Kan ${path.basename(p)} niet controleren.`);
      return r.stdout;
    };
    const list = unz(['-Z1', p]).toString('utf8').split('\n').filter(n => n && !n.endsWith('/'));
    if (!list.length) throw new Error(`Kan ${path.basename(p)} niet controleren.`);
    for (const n of list) scan(`${path.basename(p)} → ${n}`, unz(['-p', p, n]).toString('latin1'));
    return;
  }
  if (st.size > 50 * 1024 * 1024) return;
  if (path.basename(p) === 'kamelo.env' && p === envFile) return;
  scan(path.relative(root, p) || p, fs.readFileSync(p).toString('latin1'));
}

const args = process.argv.slice(2);
if (args[0] === '--staged') {
  scanDiff('commit', git('diff', '--cached', '--no-color', '-U0', '--no-ext-diff', '--diff-filter=ACMR'));
  if (git('diff', '--cached', '--name-only').split('\n').some(f => /(^|\/)kamelo\.env$|(^|\/)\.env(\.|$)/.test(f))) hits.push('een .env-bestand staat klaar om gecommit te worden');
} else if (args[0] === '--range') {
  scanDiff('push', git('log', '-p', '--no-color', '-U0', '--no-ext-diff', ...args.slice(1)));
} else if (args.length) {
  for (const p of args) scanPath(path.resolve(p));
} else {
  console.error('Gebruik: node tools/check-secrets.mjs --staged | --range A..B | pad …'); process.exit(2);
}

if (hits.length) {
  console.error('\n✋ Gestopt: hier lijkt een geheim in te zitten. Er is niets verstuurd.');
  for (const h of [...new Set(hits)]) console.error(`   • ${h}`);
  console.error('\nHaal het weg (sleutels horen alleen in kamelo.env). Is het een nep-voorbeeld, maak het dan duidelijk nep.\n');
  process.exit(1);
}
if (!envFile && !process.env.CI) console.error('Let op: kamelo.env niet gevonden; alleen op patronen gecontroleerd.');
