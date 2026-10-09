// Brengt een nieuwe versie uit, in één keer en altijd op dezelfde manier.
//
//   npm run release -- patch            1.1.3 → 1.1.4  (fixes)
//   npm run release -- minor            1.1.3 → 1.2.0  (nieuwe functies)
//   npm run release -- 2.0.0            een exacte versie
//   … --dry-run                         laat zien wat er zou gebeuren, verandert niets
//   … --push                            pusht de commit en tag ook naar GitHub
//
// Stappen: controles (main, schone werkmap, bijgewerkt, iets in [Unreleased]) → versie ophogen in manifest.json,
// package.json en package-lock.json → CHANGELOG bijwerken → alle tests → pakketten (store en bèta) → commit en tag.
// Uploaden naar de Web Store doe je daarna zelf: zie docs/RELEASING.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pack } from './pack.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bump = args.find(a => !a.startsWith('--'));

const file = name => path.join(ROOT, name);
const read = name => fs.readFileSync(file(name), 'utf8');
const write = (name, text) => dryRun || fs.writeFileSync(file(name), text);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (cmd, a) => execFileSync(cmd, a, { cwd: ROOT, stdio: 'inherit' });
const step = text => console.log(`\n▸ ${text}`);
function fail(text) {
  console.error(`\n✗ ${text}`);
  process.exit(1);
}

// ---------- Versie ----------

export function nextVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(bump ?? '')) return bump;
  return null;
}

const newer = (a, b) => {
  const [x, y] = [a, b].map(v => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// ---------- Changelog ----------

// Zet [Unreleased] onder een kop met de nieuwe versie en datum, met een lege [Unreleased] erboven.
export function releaseChangelog(text, version, date) {
  const match = text.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|\n\[Unreleased\]:)/);
  if (!match || !match[1].trim()) return null;
  const repo = text.match(/\[Unreleased\]: (https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\/v([\d.]+)\.\.\.HEAD/);
  let out = text.replace('## [Unreleased]\n', `## [Unreleased]\n\n## [${version}] - ${date}\n`);
  if (repo) {
    const [line, url, previous] = repo;
    out = out.replace(line, `[Unreleased]: ${url}/compare/v${version}...HEAD\n[${version}]: ${url}/compare/v${previous}...v${version}`);
  }
  return out.replace(/\n{3,}/g, '\n\n');
}

// ---------- Uitvoeren ----------

async function main() {
  const manifest = JSON.parse(read('manifest.json'));
  const current = manifest.version;
  const version = nextVersion(current, bump);
  if (!version) fail('Gebruik: npm run release -- patch | minor | major | x.y.z  [--dry-run] [--push]');
  if (!newer(version, current)) fail(`${version} is niet hoger dan de huidige versie ${current}.`);

  step('Controles');
  if (git('branch', '--show-current') !== 'main') fail('Brengt alleen uit vanaf main.');
  if (git('status', '--porcelain')) fail('Er staan nog niet-gecommitte wijzigingen. Commit of bewaar die eerst.');
  let online = true;
  try { git('fetch', '--quiet', 'origin', 'main'); } catch { online = false; }
  if (!online) console.log('  (GitHub niet bereikbaar: controle op nieuwere commits overgeslagen)');
  else if (git('rev-list', '--count', 'HEAD..origin/main') !== '0') fail('origin/main heeft nieuwere commits. Haal die eerst binnen (git pull).');
  if (git('tag', '--list', `v${version}`)) fail(`De tag v${version} bestaat al.`);
  const date = new Date().toISOString().slice(0, 10);
  const changelog = releaseChangelog(read('CHANGELOG.md'), version, date);
  if (!changelog) fail('Onder [Unreleased] in CHANGELOG.md staat nog niets. Schrijf eerst op wat er veranderd is.');
  console.log(`  ${current} → ${version}`);

  step('Versie ophogen');
  write('manifest.json', read('manifest.json').replace(`"version": "${current}"`, `"version": "${version}"`));
  const pkg = JSON.parse(read('package.json'));
  write('package.json', `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  if (fs.existsSync(file('package-lock.json'))) {
    const lock = JSON.parse(read('package-lock.json'));
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  }
  write('CHANGELOG.md', changelog);
  console.log('  manifest.json, package.json, package-lock.json, CHANGELOG.md');

  if (dryRun) {
    console.log('\n(dry run: niets veranderd)\n');
    console.log(changelog.slice(0, changelog.indexOf('\n## [', changelog.indexOf(`## [${version}]`) + 5)));
    return;
  }

  try {
    step('Tests');
    run('npm', ['test', '--silent']);
    run('npm', ['run', 'test:browser', '--silent']);
  } catch {
    git('checkout', '--', '.');
    fail('Tests mislukt. De versie is teruggezet; er is niets uitgebracht.');
  }

  step('Pakketten');
  console.log(`  ${pack()} (ook in Microsoft Edge/)\n  ${pack({ beta: true })}\n  ${pack({ firefox: true })}`);

  step('Commit en tag');
  git('commit', '--quiet', '--all', '--message', `Release ${version}`);
  git('tag', '--annotate', `v${version}`, '--message', `Kamelo ${version}`);
  console.log(`  v${version}`);

  if (args.includes('--push')) {
    step('Naar GitHub');
    run('git', ['push', '--quiet', '--follow-tags', 'origin', 'main']);
  }

  console.log(`
✓ Kamelo ${version} staat klaar.
${args.includes('--push') ? '' : '  git push --follow-tags          (naar GitHub)\n'}  1. Bèta: upload web-store-uploaden/Google Chrome/kamelo-beta-${version}.zip en probeer hem zelf.
  2. Chrome en Edge: upload kamelo-store-${version}.zip uit Google Chrome/ en Microsoft Edge/, eventueel gefaseerd (zie docs/RELEASING.md).
  3. Firefox: upload web-store-uploaden/Firefox/kamelo-firefox-${version}.zip op addons.mozilla.org.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
