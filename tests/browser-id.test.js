// Draai met: node tests/browser-id.test.js
// Welke browser is dit (src/strings.js, BROWSER)? Safari zit sinds 22 okt 2026 in Melo voor Mac en praat altijd met de app;
// een Chrome die zich voor Safari aanziet zou dat ook doen. Vooral: "HeadlessChrome" en Chrome op iOS (CriOS) zijn geen Safari.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(require.resolve('../src/strings.js'), 'utf8');
const id = (userAgent, extra = {}) => {
  const ctx = { navigator: { userAgent, language: 'en' }, ...extra };
  ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInNewContext(src, ctx);
  return ctx.PrivacyI18n.BROWSER.id;
};
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const cases = [
  [`${MAC} Version/26.0 Safari/605.1.15`, 'safari'],
  [`${MAC} Chrome/141.0.0.0 Safari/537.36`, 'chrome'],
  [`${MAC} HeadlessChrome/141.0.0.0 Safari/537.36`, 'chrome'],
  [`${MAC} CriOS/141.0 Mobile/15E148 Safari/604.1`, 'chrome'],
  [`${MAC} Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0`, 'edge'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0', 'firefox'],
];
for (const [ua, want] of cases) assert.equal(id(ua), want, ua);
console.log(`  ✓ browser herkend: ${cases.length} user-agents (Safari alleen als het echt Safari is)`);
