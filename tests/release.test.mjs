// Draai met: node tests/release.test.mjs
// De rekenstukjes van tools/release.mjs: de volgende versie en het bijwerken van de changelog.
import assert from 'node:assert/strict';
import { nextVersion, releaseChangelog } from '../tools/release.mjs';

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
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✓ ${name}`); } catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
console.log(`\n${Object.keys(tests).length - failed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
