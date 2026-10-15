// Draai met: node tests/sites.test.js
// De lijst met AI-sites (src/sites.js): geen dubbele domeinen, nette hostnamen, en de juiste site bij een hostnaam.
const assert = require('node:assert/strict');
const { SITES, siteFor } = require('../src/sites.js');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('elk domein hoort bij precies één site', () => {
  const seen = new Map();
  for (const site of SITES) for (const host of site.hosts) {
    assert.ok(!seen.has(host), `${host} staat bij ${seen.get(host)} en ${site.name}`);
    seen.set(host, site.name);
  }
});

test('hostnamen zijn kaal en in kleine letters', () => {
  for (const site of SITES) for (const host of site.hosts) {
    assert.match(host, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/, `${site.name}: "${host}"`);
  }
});

test('elke site heeft een naam; een live-pagina is https op een eigen domein', () => {
  for (const site of SITES) {
    assert.ok(site.name?.trim(), JSON.stringify(site.hosts));
    if (!site.live) continue;
    const url = new URL(site.live);
    assert.equal(url.protocol, 'https:', site.name);
    assert.equal(siteFor(url.hostname), site, `${site.live} hoort bij ${site.name}`);
    assert.ok(site.composer, `${site.name} heeft een live-pagina maar geen composer-selector`);
  }
});

test('siteFor: subdomeinen tellen mee, lookalikes niet', () => {
  assert.equal(siteFor('chatgpt.com').name, 'ChatGPT');
  assert.equal(siteFor('www.perplexity.ai').name, 'Perplexity');
  assert.equal(siteFor('copilot.com').name, 'Copilot');
  assert.equal(siteFor('notchatgpt.com'), null);
  assert.equal(siteFor('chatgpt.com.evil.example'), null);
});

test('scopeFor: één bereik per dienst, per domein bij perHost, null op een gewone site', () => {
  const { scopeFor } = require('../src/sites.js');
  assert.equal(scopeFor('chatgpt.com'), 'ai:ChatGPT');
  assert.equal(scopeFor('chat.openai.com'), 'ai:ChatGPT');
  assert.equal(scopeFor('shop.example'), null);
  const bots = SITES.find(s => s.perHost);
  const scopes = bots.hosts.map(h => scopeFor(h));
  assert.equal(new Set(scopes).size, bots.hosts.length, 'twee chatbot-bedrijven delen een bereik');
  assert.equal(scopeFor('widget.' + bots.hosts[0]), scopes[0]);
});

test('send en composer zijn geldige CSS-selectors', () => {
  for (const site of SITES) for (const key of ['composer', 'send']) {
    if (!site[key]) continue;
    assert.equal(typeof site[key], 'string', `${site.name}.${key}`);
    assert.doesNotMatch(site[key], /[{}]/, `${site.name}.${key}`);
  }
});

test('siteFor: sites die de gebruiker zelf als AI markeert', () => {
  assert.equal(siteFor('help.shop.example', ['shop.example']).name, 'help.shop.example');
  assert.equal(siteFor('shop.example'), null);
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log(`  ✓ ${name}`); } catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
console.log(`\n${tests.length - failed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
