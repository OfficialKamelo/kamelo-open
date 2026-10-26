// Draai met: node tests/geen-netwerk.test.mjs
// "De extensie praat met geen enkele server" controleerbaar maken (docs/KOERS.md, prioriteit 1: elke claim een bewijs).
// De test bouwt de gratis editie precies zoals hij naar de winkels gaat (tools/pack.mjs, Chrome/Edge en Firefox) en
// leest elk bestand in dat pakket. Eén regel erbij die verbinding maakt of code van buiten uitvoert: de test faalt.
//
// Wat níét mag in de gratis editie:
//   - zelf een verbinding openen: fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, WebRTC, WebTransport,
//     een (Shared)Worker, dynamische import(), native messaging, of een bericht aan een andere extensie;
//   - code uitvoeren die niet in het pakket staat: eval, new Function, setTimeout/setInterval met tekst;
//   - een script, stylesheet, lettertype, afbeelding of frame van buiten laden (HTML en CSS alleen eigen bestanden);
//   - rechten om verkeer te zien of te sturen (webRequest, declarativeNetRequest, proxy, nativeMessaging, …), en een
//     script in de pagina zelf (world MAIN).
// Wat wel mag, bij naam (een nieuwe uitzondering laat de test falen, en hoort dan hier met de reden erbij):
//   - importScripts in src/background.js, alleen met vaste namen van eigen bestanden (MV3 laadt nooit code van buiten);
//   - een afbeelding uit het geheugen: de grafiek als PNG (blob:, chat/export.js) en een bijlage (data:, chat/chat.js);
//   - adressen in de code alleen van: de AI-chatsites uit src/sites.js (de tijdelijke chat opent daar in een tabblad),
//     kamelo.eu (welkomstpagina na installeren, afscheidspagina na verwijderen: een gewoon tabblad, zonder gegevens),
//     pagina's van de browser zelf (chrome://extensions),
//     XML-naamruimten (een naam, geen verbinding), en de bronnen in chat/kennis.js (alleen voor ons, nooit gelezen).
//   - native messaging naar precies één programma: melo-brug in Melo voor Mac (eu.kamelo.melo, repo melo-mac), op dezelfde
//     Mac, geen server. Alleen sendNativeMessage in src/background.js (nooit connectNative), en het recht nativeMessaging
//     alleen optioneel (je zet het zelf aan in de popup); in Safari een gewoon recht, want daar zit de extensie in Melo.app.
// Wat deze test niet kan zien: wat de browser zelf doet. Chrome downloadt zijn AI-model bij Google, en een link die je
// aanklikt, opent gewoon een pagina. Een statische test is een vangnet, geen bewijs tegen opzet: daarom ook geen eval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { aiSitePatterns } from '../tools/pack.mjs';
import { test, passed, pkg, files, read, code, hits, urlsIn, FORBIDDEN, NET_PERMISSIONS } from './netwerk-regels.mjs';

const { SITES } = createRequire(import.meta.url)('../src/sites.js');
// Een afbeelding uit het geheugen: precies deze twee plekken, elk met waar de afbeelding vandaan komt.
const IMAGES = {
  'chat/export.js': { re: /\bnew Image\s*\(/, why: /URL\.createObjectURL\(new Blob\(/ }, // grafiek → PNG, blob:
  'chat/chat.js': { re: /createElement\(\s*['"]img['"]\s*\)/, why: /src: a\.dataUrl/ }, // bijlage, data:
};
const IMAGE_RE = /\bnew\s+(Image|Audio)\s*\(|createElement\s*\(\s*['"`]img['"`]|\.src\s*=|\bsrcset\b|setAttribute\s*\(\s*['"`](src|href|srcset)['"`]/;

const hostOk = (host, hosts) => hosts.some(h => host === h || host.endsWith(`.${h}`));
const AI_HOSTS = SITES.filter(s => !s.teams).flatMap(s => s.hosts);
function urlOk({ url, text }, file) {
  if (url === 'chrome-extension://' || url.startsWith('//')) return false;
  if (['http://*/*', 'https://*/*'].includes(url)) return file === 'src/background.js' && /tabs\.query\(/.test(text); // een filter op tabbladen
  let u;
  try { u = new URL(url); } catch { return false; }
  // Pagina's van de browser zelf (chrome://extensions in de uitleg): geen verbinding.
  if (['chrome:', 'edge:', 'about:'].includes(u.protocol)) return true;
  // XML-naamruimten (SVG, MathML, Word): een naam, de browser haalt er niets op.
  if (u.protocol === 'http:' && ['www.w3.org', 'schemas.openxmlformats.org'].includes(u.host)) return true;
  if (u.protocol !== 'https:') return false;
  // De AI-chatsites: de tijdelijke chat opent daar in een tabblad.
  if (file === 'src/sites.js' && hostOk(u.host, AI_HOSTS)) return true;
  // kamelo.eu: welkomst- en afscheidspagina, als tabblad, zonder vraagteken (dus zonder gegevens erachter).
  if (file === 'src/background.js' && u.host === 'kamelo.eu' && !url.includes('?')) return true;
  // De bronnen van de nagekeken feiten: alleen als waarde van "bron", en die leest de code nergens (zie hieronder).
  if (file === 'chat/kennis.js' && /^bron: '/.test(text)) return true;
  return false;
}

// Alle controles op één uitgepakt pakket van de gratis editie.
function checkPublic(label, { dir, manifest }) {
  const js = files(dir, ['.js']), html = files(dir, ['.html']), css = files(dir, ['.css']);

  test(`${label}: alleen de bestanden van de gratis editie (geen netwerkfilter, src/teams of OCR)`, () => {
    const all = fs.readdirSync(dir, { recursive: true }).map(f => f.split(path.sep).join('/'));
    for (const f of ['src/net-main.js', 'src/ai-hosts.js', 'src/teams', 'vendor', 'unlock']) assert.ok(!all.some(x => x === f || x.startsWith(`${f}/`)), f);
    assert.ok(js.length >= 20, `maar ${js.length} scripts gevonden`);
  });

  test(`${label}: manifest zonder netwerkrechten, zonder script in de pagina zelf, zonder code van buiten`, () => {
    // Melo voor Mac (zie boven): nativeMessaging optioneel, of in Safari een gewoon recht. Verder geen enkel netwerkrecht.
    const safari = label.includes('Safari');
    assert.ok((safari ? manifest.permissions : manifest.optional_permissions || []).includes('nativeMessaging'), 'nativeMessaging voor Melo voor Mac');
    if (!safari) assert.ok(!manifest.permissions.includes('nativeMessaging'), 'nativeMessaging alleen optioneel');
    const perms = [...(manifest.permissions || []), ...(manifest.optional_permissions || [])];
    assert.deepEqual(perms.filter(p => NET_PERMISSIONS.includes(p) && p !== 'nativeMessaging'), []);
    assert.equal(manifest.externally_connectable, undefined, 'andere extensies of sites mogen niet met Kamelo praten');
    assert.equal(manifest.web_accessible_resources, undefined);
    assert.equal(manifest.update_url, undefined, 'bijwerken alleen via de winkel');
    assert.equal(manifest.content_security_policy, undefined, 'de standaard-CSP van MV3: geen code van buiten, geen eval');
    for (const cs of manifest.content_scripts) {
      assert.notEqual(cs.world, 'MAIN', 'geen script in de pagina zelf');
      assert.ok(cs.js.every(f => !/net-main|ai-hosts|teams\//.test(f)), cs.js.join(', '));
      assert.ok(cs.matches.every(m => aiSitePatterns().includes(m)), 'content scripts alleen op AI-chatsites');
    }
    assert.ok(manifest.host_permissions.every(h => aiSitePatterns().includes(h)), 'toegang alleen tot AI-chatsites');
  });

  test(`${label}: geen enkele verbinding of code van buiten in de scripts`, () => {
    const found = js.flatMap(f => { const c = code(read(dir, f)); return Object.entries(FORBIDDEN).flatMap(([what, re]) => hits(c, re).map(h => `${f}:${h} (${what})`)); });
    // De ene uitzondering: Melo voor Mac, in de achtergrond, naar één vaste naam (zie boven). De andere regel kijkt alleen
    // of de functie er is (zonder het optionele recht ontbreekt hij).
    const mac = found.filter(h => /^src\/background\.js:\d+: .*(chrome\.runtime\.sendNativeMessage\(MAC_HOST, msg\)|typeof chrome\.runtime\.sendNativeMessage !== 'function').* \(native messaging\)$/.test(h));
    assert.equal(mac.length, 2, mac.join('\n'));
    assert.match(code(read(dir, 'src/background.js')), /^const MAC_HOST = 'eu\.kamelo\.melo';$/m);
    assert.deepEqual(found.filter(h => !mac.includes(h)), []);
  });

  test(`${label}: importScripts alleen in de achtergrond, met vaste namen van eigen bestanden`, () => {
    for (const f of js) {
      const c = code(read(dir, f));
      const calls = [...c.matchAll(/\bimportScripts\s*\(([^)]*)\)/g)];
      if (f !== 'src/background.js') { assert.equal(calls.length, 0, f); continue; }
      for (const [, args] of calls) {
        for (const a of args.split(',').map(s => s.trim()).filter(Boolean)) assert.match(a, /^'[\w/-]+\.js'$/, `importScripts(${a})`);
      }
      assert.ok(calls.length >= 1, 'importScripts niet gevonden: is de achtergrond veranderd? Pas dan deze test aan.');
    }
  });

  test(`${label}: afbeeldingen alleen uit het geheugen, op de twee bekende plekken`, () => {
    const found = js.flatMap(f => hits(code(read(dir, f)), IMAGE_RE).map(h => ({ f, h })));
    for (const { f, h } of found) assert.ok(IMAGES[f]?.re.test(h) || (f === 'chat/export.js' && /img\.src = url;/.test(h)), `${f}:${h}`);
    for (const [f, { re, why }] of Object.entries(IMAGES)) {
      const c = code(read(dir, f));
      assert.equal(hits(c, re).length, 1, `${f}: precies één afbeelding`);
      assert.match(c, why, `${f}: waar de afbeelding vandaan komt`);
    }
  });

  test(`${label}: elk adres in de code mag (AI-chatsites, kamelo.eu, XML-naamruimten, bronnen)`, () => {
    const bad = js.flatMap(f => urlsIn(code(read(dir, f))).filter(u => !urlOk(u, f)).map(u => `${f}:${u.line}: ${u.url}`));
    assert.deepEqual(bad, []);
    // De bronnen in kennis.js zijn er alleen voor ons: geen enkel script leest .bron.
    assert.deepEqual(js.flatMap(f => hits(code(read(dir, f)), /\.bron\b|\['bron'\]/).map(h => `${f}:${h}`)), []);
  });

  test(`${label}: HTML en CSS laden alleen eigen bestanden (geen script, stijl, lettertype of beeld van buiten)`, () => {
    for (const f of html) {
      const page = read(dir, f);
      for (const [, attr, value] of page.matchAll(/\b(src|href|srcset|action|data)\s*=\s*["']([^"']*)["']/gi)) {
        assert.doesNotMatch(value, /^[a-z][a-z0-9+.-]*:|^\/\//i, `${f}: ${attr}="${value}"`);
        if (attr === 'src' || attr === 'href') assert.ok(value.startsWith('#') || fs.existsSync(path.resolve(dir, path.dirname(f), value.split(/[?#]/)[0])), `${f}: ${value} bestaat niet`);
      }
      assert.doesNotMatch(page, /<(iframe|frame|object|embed|base)\b/i, f);
      assert.doesNotMatch(page, /http-equiv\s*=\s*["']?refresh/i, f);
    }
    for (const f of [...css, ...html]) {
      for (const [, value] of read(dir, f).matchAll(/url\(\s*["']?([^"')]*)/gi)) assert.match(value, /^(data:|#|\.{0,2}\/?[\w./-]+$)/, `${f}: url(${value.slice(0, 60)})`);
      assert.doesNotMatch(read(dir, f), /@import\b/, `${f}: @import`);
    }
  });
}

const chrome = pkg('chrome', {});
checkPublic('gratis (Chrome/Edge)', chrome);
checkPublic('gratis (Firefox)', pkg('firefox', { firefox: true }));
checkPublic('gratis (Safari, in Melo voor Mac)', pkg('safari', { safari: true }));

test('de test zelf: hij vangt wat hij moet vangen', () => {
  const caught = s => Object.values(FORBIDDEN).some(re => re.test(code(s)));
  for (const s of ["fetch('https://x.example')", 'await window.fetch(u)', 'new XMLHttpRequest()', 'navigator.sendBeacon(u, d)',
    "new WebSocket('wss://x')", "eval('1')", "new Function('return 1')", "Function('return 1')()", "setTimeout('alert(1)', 9)",
    "import('https://x.example/a.js')", "chrome.runtime.sendMessage('abcdefghijklmnop', {})", "document.createElement('script')",
    'new RTCPeerConnection()', "new Worker('w.js')", 'x = 1; fetch(u) // lokaal']) assert.ok(caught(s), s);
  for (const s of ['// geen eval (mag niet)', '  /* fetch(u) */', "chrome.runtime.sendMessage({ type: 'pf:status' })", 'Function.prototype.toString.call(f)',
    "chrome.tabs.sendMessage(tab.id, {})", 'const prefetch = 1;']) assert.ok(!caught(s), s);
  assert.ok(!urlOk({ url: 'https://tracker.example/p.gif', text: "const u = 'https://tracker.example/p.gif'" }, 'src/content.js'));
  assert.ok(!urlOk({ url: 'https://kamelo.eu/hi?q=', text: '' }, 'src/background.js'), 'kamelo.eu met gegevens erachter');
  assert.ok(!urlOk({ url: 'https://chatgpt.com/', text: '' }, 'src/content.js'), 'AI-sites alleen uit sites.js');
  assert.ok(urlOk({ url: 'https://chatgpt.com/?temporary-chat=true', text: '' }, 'src/sites.js'));
});

console.log(`\n${passed()} geslaagd`);
