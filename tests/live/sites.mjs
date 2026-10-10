// Controleert Kamelo op de echte AI-sites: opent elke site met een `live`-pagina uit src/sites.js (zonder in te loggen),
// plakt verzonnen gegevens in het invoerveld en kijkt of ze worden afgeschermd en in een antwoord teruggezet.
// Er wordt niets verstuurd: de tekst blijft in het invoerveld staan en het tabblad gaat dicht.
//
//   npm run test:sites                     alle sites
//   npm run test:sites -- chatgpt grok     alleen deze sites
//   npm run test:sites -- --show           met zichtbaar browservenster
//
// Uitkomst per site:  ok · stuk (Kamelo werkt daar niet meer, of het invoerveld is verplaatst: zie src/sites.js)
//                     · overgeslagen (inlogscherm, cookiemelding of botcontrole: zegt niets over Kamelo)
// Het script faalt alleen als een site stuk is.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { launch, paste, textOf, waitForText, waitForKamelo, SAMPLE } from '../browser/kamelo.mjs';

const { SITES } = createRequire(import.meta.url)('../../src/sites.js');

const args = process.argv.slice(2);
const wanted = args.filter(a => !a.startsWith('--')).map(a => a.toLowerCase());
const sites = SITES.filter(s => s.live && (!wanted.length || wanted.some(w => s.name.toLowerCase().includes(w))));

// Een botcontrole (Cloudflare en dergelijke) of een inlogscherm: dan zegt de site niets over Kamelo. Zo'n controle omzeilen
// we bewust niet; lokaal met --show komt een gewone browser er meestal vanzelf doorheen.
const BLOCKED = /just a moment|attention required|verify you are human|are you a robot|captcha|sign in|log in|before you continue/i;
const isChallenge = page => page.evaluate(() => !!(window._cf_chl_opt
  || document.querySelector('#challenge-form, #challenge-running, [name="cf-turnstile-response"], script[src*="challenges.cloudflare.com"], iframe[src*="captcha"]')));
// Zoekt het invoerveld zelf, keer op keer: waitForSelector raakt de draad kwijt als de site tijdens het laden nog eens navigeert (Gemini).
// Het veld moet ook even blijven staan: Grok toont eerst een tijdelijk textarea en vervangt dat na het laden door het echte veld.
async function findComposer(page, selector, timeout = 20_000, stable = 1_500) {
  const end = Date.now() + timeout;
  let current = null, since = 0;
  while (Date.now() < end) {
    const el = await page.$(selector).catch(() => null);
    const visible = el && await el.isVisible().catch(() => false);
    const same = visible && current && await page.evaluate((a, b) => a === b, el, current).catch(() => false);
    if (!visible) current = null;
    else if (!same) { current = el; since = Date.now(); }
    else if (Date.now() - since >= stable) return current;
    await new Promise(r => setTimeout(r, 250));
  }
  return current;
}
const masked = text => text.includes('[IBAN_') && !text.includes(SAMPLE.iban);

async function check(browser, site) {
  const page = await browser.newPage();
  try {
    await page.goto(site.live, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const composer = await findComposer(page, site.composer);
    if (!composer) {
      const title = await page.title();
      const elsewhere = !site.hosts.some(h => new URL(page.url()).hostname.endsWith(h));
      if (await isChallenge(page).catch(() => false)) return { status: 'skipped', note: 'Botcontrole van de site' };
      if (elsewhere || BLOCKED.test(title)) return { status: 'skipped', note: title || page.url() };
      return { status: 'broken', note: `Invoerveld niet gevonden (${site.composer}). Pas "composer" aan in src/sites.js.` };
    }
    await waitForKamelo(page);

    // Afschermen: wat in het invoerveld staat, is wat de site zou versturen.
    const selector = await composer.evaluate(el => {
      el.dataset.kameloCheck = '1';
      return '[data-kamelo-check]';
    });
    await paste(page, selector, SAMPLE.text);
    const text = await waitForText(page, selector, masked, 8_000);
    if (!masked(text)) return { status: 'broken', note: `Niet afgeschermd. Invoerveld bevat: "${text.slice(0, 80)}"` };

    // Terugzetten: een antwoord met de placeholder moet de echte waarde laten zien.
    const iban = text.match(/\[IBAN_\d+\]/)[0];
    await page.evaluate(ph => {
      const answer = Object.assign(document.createElement('p'), { id: 'kamelo-check-answer', textContent: `Pay via ${ph}.` });
      document.body.append(answer);
    }, iban);
    const answer = await waitForText(page, '#kamelo-check-answer', t => t.includes(SAMPLE.iban));
    if (!answer.includes(SAMPLE.iban)) return { status: 'broken', note: `Afgeschermd, maar niet teruggezet: "${answer}"` };
    return { status: 'ok', note: '' };
  } catch (err) {
    return { status: 'skipped', note: err.message.split('\n')[0] };
  } finally {
    await page.close().catch(() => {});
  }
}

const ICON = { ok: '✅', broken: '❌', skipped: '⚪️' };
const { browser } = await launch({ headless: !args.includes('--show') });
const results = [];
for (const site of sites) {
  const result = await check(browser, site);
  results.push({ site, ...result });
  console.log(`${ICON[result.status]} ${site.name.padEnd(12)} ${result.status}${result.note ? `  ${result.note}` : ''}`);
}
await browser.close();

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) {
  const rows = results.map(r => `| ${ICON[r.status]} | ${r.site.name} | ${r.status} | ${r.note.replace(/\|/g, '\\|')} |`);
  fs.appendFileSync(summary, ['### Kamelo op echte AI-sites', '', '| | Site | Uitkomst | Toelichting |', '|---|---|---|---|', ...rows, ''].join('\n'));
}
process.exit(results.some(r => r.status === 'broken') ? 1 : 0);
