// Draai met: node tests/release.test.mjs
// De rekenstukjes van tools/release.mjs: de volgende versie en het bijwerken van de changelog.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nextVersion, releaseChangelog } from '../tools/release.mjs';
import { entries, updatePage } from '../tools/news.mjs';

const CHANGELOG = `# Changelog

## [Unreleased]

### Fixed
- Something.

## [1.1.3] - 2026-10-06

### Fixed
- Older.

[Unreleased]: https://github.com/owner/repo/compare/v1.1.3...HEAD
[1.1.3]: https://github.com/owner/repo/compare/v1.1.2...v1.1.3
`;

const tests = {
  'volgende versie': () => {
    assert.equal(nextVersion('1.1.3', 'patch'), '1.1.4');
    assert.equal(nextVersion('1.1.3', 'minor'), '1.2.0');
    assert.equal(nextVersion('1.1.3', 'major'), '2.0.0');
    assert.equal(nextVersion('1.1.3', '1.5.0'), '1.5.0');
    assert.equal(nextVersion('1.1.3', 'v1.5'), null);
    assert.equal(nextVersion('1.1.3', undefined), null);
  },
  'changelog: [Unreleased] wordt de nieuwe versie, met links': () => {
    const out = releaseChangelog(CHANGELOG, '1.1.4', '2026-10-07');
    assert.match(out, /## \[Unreleased\]\n\n## \[1\.1\.4\] - 2026-10-07\n\n### Fixed\n- Something\./);
    assert.match(out, /\[Unreleased\]: https:\/\/github\.com\/owner\/repo\/compare\/v1\.1\.4\.\.\.HEAD\n\[1\.1\.4\]: https:\/\/github\.com\/owner\/repo\/compare\/v1\.1\.3\.\.\.v1\.1\.4\n\[1\.1\.3\]/);
  },
  'changelog: lege [Unreleased] wordt geweigerd': () => {
    assert.equal(releaseChangelog(CHANGELOG.replace('### Fixed\n- Something.\n\n', ''), '1.1.4', '2026-10-07'), null);
  },
  'nieuws: elke versie, nieuwste eerst, eigen titel of het eerste vetgedrukte punt': () => {
    const log = releaseChangelog(CHANGELOG.replace('- Something.', '- **Faster masking.** Twice as fast.'), '1.1.4', '2026-10-07');
    const list = entries(log, { versions: { '1.1.3': { title: 'Older fix', text: 'Text.' } },
      milestones: [{ date: '2026-10-06', kind: 'Company', title: 'Milestone', text: '', label: 'M', url: 'https://kamelo.eu' }] });
    assert.deepEqual(list.map(e => e.title), ['Faster masking', 'Older fix', 'Milestone']);
    assert.equal(list[0].text, 'Twice as fast.');
    assert.equal(list[0].kind, 'Release');
    assert.match(list[0].url, /CHANGELOG\.md#114---2026-10-07$/);
  },
  'nieuws: alleen beveiliging telt als Security': () => {
    const log = '## [2.0.1] - 2026-11-01\n\n### Security\n- **Safer.** Yes.\n\n## [2.0.0] - 2026-10-30\n\n### Security\n- A.\n\n### Added\n- B.\n';
    assert.deepEqual(entries(log, {}).map(e => e.kind), ['Security', 'Release']);
  },
  'nieuws: news.html heeft de markeringen en is bijgewerkt': () => {
    if (!fs.existsSync(new URL('../website/news.html', import.meta.url))) return; // openbare repo: geen website
    const html = fs.readFileSync(new URL('../website/news.html', import.meta.url), 'utf8');
    const list = entries(fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'),
      JSON.parse(fs.readFileSync(new URL('../tools/news-items.json', import.meta.url), 'utf8')));
    assert.equal(updatePage(html, list), html, 'draai node tools/news.mjs');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✓ ${name}`); } catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
console.log(`\n${Object.keys(tests).length - failed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
