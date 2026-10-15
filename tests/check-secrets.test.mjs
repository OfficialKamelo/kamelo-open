// Geheimencontrole (tools/check-secrets.mjs): herkent sleutels in elke vorm, laat gewone code en duidelijk nep met rust,
// controleert ook binaire bestanden, merges en grote bestanden. Alle sleutels hier worden pas tijdens de test gemaakt
// (willekeurig, in stukken aan elkaar geplakt), zodat dit bestand zelf geen sleutel bevat en de controle niet laat afgaan.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CHECK = fileURLToPath(new URL('../tools/check-secrets.mjs', import.meta.url));
let pass = 0, fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); c ? pass++ : fail++; };

// Willekeurige tekens uit een alfabet, zonder iets wat de controle als 'nep' ziet (test, 0123456, xxxxxx, …).
const NEPISH = /abcdefgh|bcdefghi|0123456|123456789|(.)\1{7}|x{6}|X{6}|example|dummy|fake|test|your[-_]?key|placeholder|redacted/i;
function rand(n, abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  for (;;) {
    const s = [...crypto.randomBytes(n)].map(b => abc[b % abc.length]).join('');
    if (!NEPISH.test(s) && (!/\d/.test(abc) || /\d/.test(s)) && (!/[A-Za-z]/.test(abc) || /[A-Za-z]/.test(s))) return s;
  }
}
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-check-secrets-'));
// Lege sleutelmap: de test leest niets uit ~/.kamelo.
const keys = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-keys-'));
const env = { ...process.env, KAMELO_KEYS: keys, CI: '1' };
const run = (args, cwd = tmp) => spawnSync(process.execPath, [CHECK, ...args], { cwd, env, encoding: 'utf8' });

const S = (...p) => p.join('');
const positive = {
  'anthropic.txt': S('sk', '-ant-', 'api03-', rand(90, B64URL), 'AA'),
  'anthropic-admin.txt': S('key: ', 'sk', '-ant-', 'admin01-', rand(80, B64URL)),
  'openai-proj.txt': S('sk', '-proj-', rand(120, B64URL)),
  'openai-old.txt': S('sk', '-', rand(48)),
  'github.txt': S('gh', 'p_', rand(36)),
  'github-pat.txt': S('github', '_pat_', rand(82, B64URL.replace('-', ''))),
  'google.txt': S('AI', 'za', rand(35, B64URL)),
  'stripe.txt': S('sk', '_live_', rand(30)),
  'slack.txt': S('xo', 'xb-', rand(12, '0123456789'), '-', rand(24)),
  'aws.txt': S('AK', 'IA', rand(16, UPPER)),
  'aws-sts.txt': S('AS', 'IA', rand(16, UPPER)),
  'pem.txt': S('-----BEGIN ', 'PRIVATE KEY-----\n', rand(64), '\n'),
  'pem-openssh.txt': S('-----BEGIN ', 'OPENSSH PRIVATE KEY-----\n'),
  'camel.js': S('const apiKey = "', rand(40), '";'),
  'json.json': S('{ "token": "', rand(40), '" }'),
  'yaml.yml': S('client_secret: ', rand(40)),
  'js-secret.js': S("secret = '", rand(32), "'"),
  'cloudflare.sh': S('export CLOUDFLARE', '_API_TOKEN=', rand(40, B64URL)),
  // Vroeger keurde de nep-filter de hele vondst, dus ook de naam: LATEST bevat 'TEST' en de sleutel ging erdoor.
  'latest.env.txt': S('LATEST', '_API_KEY=', rand(40)),
  'elevenlabs.js': S("headers: { 'xi-api-key': '", rand(32, '0123456789abcdef'), "' }"),
  'elevenlabs-raw.txt': S('sk', '_', rand(48, '0123456789abcdef')),
  'ms-secret.txt': S('EDGE_CLIENT', '_SECRET=', rand(8), '~', rand(31, B64URL)),
  'cws.json': S('{"client', '_secret": "', 'GOC', 'SPX-', rand(28, B64URL), '"}'),
  'bearer.txt': S('Authorization: Bear', 'er ', rand(48, B64URL)),
};
const negative = {
  'env-ref.js': 'const apiKey = process.env.ELEVENLABS_API_KEY;\nconst token = config.auth.refreshToken;\n',
  'call.js': 'const token = await getAccessToken(clientId2);\nsecret = makeSecretForRequest42(x);\n',
  'ident.js': 'export { loadOrPersistUserCacheSecret: () => loadOrPersistUserCacheSecret2 };\nx = { cacheSecret: cacheSecretValue2 };\n',
  'counts.js': 'const tokenCount = 98213749182734981; const secretLength = 7f3a9c2e4b1d8f6a;\n',
  'fake.env.txt': S('API_KEY=your-key-goes-here-123\n', 'CLOUDFLARE', '_API_TOKEN=', 'x'.repeat(40), '\n', 'sk', '-ant-api03-', 'X'.repeat(60), '\n'),
  'docs.md': 'Zet `TINFOIL_API_KEY=tk_…` in kamelo.env.\npassword: hunter2\nsecret: ./config/secrets/local.json\n',
  'words.txt': 'The task-runner had a disk-based cache; ask-anything mode.\n',
};
for (const [f, t] of Object.entries({ ...positive, ...negative })) fs.writeFileSync(path.join(tmp, f), t);

{
  const r = run(['.']);
  ok(r.status === 1, 'mappen-modus: stopt bij een sleutel');
  for (const f of Object.keys(positive)) ok(r.stderr.includes(f), `herkend: ${f}`);
  for (const f of Object.keys(negative)) ok(!r.stderr.includes(f), `niet gemeld: ${f}`);
  // Nooit de waarde tonen, alleen de naam en de plek.
  ok(!Object.values(positive).some(v => r.stderr.includes(v.slice(-20)) || r.stdout.includes(v.slice(-20))), 'de waarde zelf staat nergens in de uitvoer');
}

{ // Alleen de nep-bestanden: geen melding.
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-neg-'));
  for (const [f, t] of Object.entries(negative)) fs.writeFileSync(path.join(d, f), t);
  ok(run([d]).status === 0, 'gewone code en duidelijk nep: geslaagd');
  fs.rmSync(d, { recursive: true, force: true });
}

{ // Groot bestand (> 32 MB): niet overgeslagen, ook een sleutel op de grens van twee stukken wordt gevonden.
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-big-'));
  const big = Buffer.alloc(33 * 1024 * 1024, 0x20);
  Buffer.from(S('gh', 'p_', rand(36))).copy(big, 32 * 1024 * 1024 - 10);
  fs.writeFileSync(path.join(d, 'big.bin'), big);
  const r = run([d]);
  ok(r.status === 1 && r.stderr.includes('big.bin'), 'groot bestand: sleutel op de grens van twee stukken gevonden');
  ok(/Let op: .*big\.bin.*groot/.test(r.stderr), 'groot bestand: waarschuwing getoond');
  fs.rmSync(d, { recursive: true, force: true });
}

{ // Git: --staged ziet binaire bestanden en sleutelbestanden; --range ziet wat in een merge is toegevoegd.
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-repo-'));
  const g = (...a) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=T', '-c', 'user.email=t@kamelo.invalid', ...a], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'hallo\n'); g('add', '.'); g('commit', '-q', '-m', 'begin');
  const base = g('rev-parse', 'HEAD').trim();

  fs.writeFileSync(path.join(repo, 'blob.bin'), Buffer.concat([Buffer.from([0, 1, 2, 0, 255]), Buffer.from(S('AI', 'za', rand(35, B64URL))), Buffer.from([0, 0])]));
  g('add', 'blob.bin');
  let r = run(['--staged'], repo);
  ok(r.status === 1 && r.stderr.includes('blob.bin'), '--staged: sleutel in een binair bestand gevonden');
  g('reset', '-q');
  fs.rmSync(path.join(repo, 'blob.bin'));

  fs.writeFileSync(path.join(repo, 'signing.pem'), 'nothing secret inside\n'); g('add', 'signing.pem');
  r = run(['--staged'], repo);
  ok(r.status === 1 && r.stderr.includes('signing.pem'), '--staged: een .pem-bestand wordt tegengehouden');
  g('reset', '-q'); fs.rmSync(path.join(repo, 'signing.pem'));

  fs.writeFileSync(path.join(repo, 'b.txt'), 'gewoon\n'); g('add', '.');
  ok(run(['--staged'], repo).status === 0, '--staged: gewone wijziging gaat door');
  g('commit', '-q', '-m', 'b');

  // Merge met een conflict-oplossing waarin een sleutel wordt toegevoegd (een 'evil merge').
  g('checkout', '-q', '-b', 'zij', base);
  fs.writeFileSync(path.join(repo, 'c.txt'), 'zijtak\n'); g('add', '.'); g('commit', '-q', '-m', 'c');
  g('checkout', '-q', 'main');
  g('merge', '-q', '--no-ff', '--no-commit', 'zij');
  fs.writeFileSync(path.join(repo, 'a.txt'), S('hallo\nconst apiKey = "', rand(40), '";\n')); g('add', 'a.txt');
  g('commit', '-q', '-m', 'merge');
  r = run(['--range', `${base}..HEAD`], repo);
  ok(r.status === 1 && r.stderr.includes('a.txt'), '--range: sleutel die alleen in de merge-commit zit, gevonden');
  fs.rmSync(repo, { recursive: true, force: true });
}

fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(keys, { recursive: true, force: true });
console.log(`\ncheck-secrets: ${pass} geslaagd, ${fail} mislukt`);
if (fail) process.exit(1);
