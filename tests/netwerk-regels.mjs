// Gedeelde regels voor tests/geen-netwerk.test.mjs (de gratis editie) en de test van de editie voor organisaties:
// wat een verbinding opent of code van buiten uitvoert, en hulp om een gebouwd pakket te lezen. Zelf geen test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../tools/pack.mjs';

let count = 0;
export const test = (name, fn) => { fn(); count++; console.log(`  ✓ ${name}`); };
export const passed = () => count;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kamelo-netwerk-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
export const pkg = (name, opts) => { const dir = path.join(tmp, name); return { dir, manifest: build(dir, opts) }; };
export const files = (dir, ext) => fs.readdirSync(dir, { recursive: true }).map(f => f.split(path.sep).join('/'))
  .filter(f => ext.some(e => f.endsWith(e))).sort();
export const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');

// Code zonder commentaarregels: een regel die met // begint, of een blok /* … */ dat aan het begin van een regel staat.
// Alleen hele regels, zodat er nooit code wegvalt achter een "//" in een string. Wat in commentaar staat, draait niet.
export function code(text) {
  const out = [];
  let block = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (block) { out.push(''); if (t.includes('*/')) block = false; continue; }
    if (t.startsWith('//')) { out.push(''); continue; }
    if (t.startsWith('/*')) { out.push(''); block = !t.includes('*/'); continue; }
    out.push(line);
  }
  return out.join('\n');
}
export const hits = (text, re) => text.split('\n').flatMap((l, i) => (re.test(l) ? [`${i + 1}: ${l.trim().slice(0, 160)}`] : []));

// Wat een verbinding opent of code van buiten uitvoert.
export const FORBIDDEN = {
  fetch: /(?<![\w$.])fetch\s*\(|\.fetch\s*\(/,
  XMLHttpRequest: /\bXMLHttpRequest\b/,
  WebSocket: /\bWebSocket\b/,
  EventSource: /\bEventSource\b/,
  sendBeacon: /\bsendBeacon\b/,
  WebRTC: /\bRTC(PeerConnection|DataChannel)\b/,
  WebTransport: /\bWebTransport\b/,
  Worker: /\bnew\s+(Shared)?Worker\s*\(|serviceWorker\s*\.\s*register/,
  'import()': /(?<![\w$.])import\s*\(/,
  'native messaging': /\b(connectNative|sendNativeMessage)\b/,
  'andere extensie': /runtime\s*\.\s*(sendMessage|connect)\s*\(\s*['"`]/,
  eval: /(?<![\w$.])eval\s*\(/,
  'new Function': /(?<![\w$.])(new\s+)?Function\s*\(/,
  'setTimeout met tekst': /\bset(Timeout|Interval)\s*\(\s*['"`]/,
  'script/frame van buiten': /createElement\s*\(\s*['"`](script|iframe|frame|object|embed|link|video|audio|source|track)['"`]/,
  'document.write': /\bdocument\s*\.\s*write(ln)?\s*\(/,
};
// Rechten waarmee een extensie verkeer ziet, stuurt of omleidt, of met andere programma's praat.
export const NET_PERMISSIONS = ['webRequest', 'webRequestBlocking', 'webRequestAuthProvider', 'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess', 'declarativeNetRequestFeedback', 'proxy', 'nativeMessaging', 'identity',
  'cookies', 'debugger', 'downloads', 'webNavigation', 'tabCapture', 'desktopCapture', 'gcm', 'vpnProvider', 'dns'];

// Elk adres in de code, met de plek.
export function urlsIn(text) {
  return text.split('\n').flatMap((line, i) => [...line.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`)<>\\]*/gi)].map(m => ({ url: m[0], line: i + 1, text: line.trim() })))
    .concat(text.split('\n').flatMap((line, i) => [...line.matchAll(/(?<=['"`(=]\s*)\/\/[a-z0-9-]+\.[a-z]/gi)].map(m => ({ url: m[0], line: i + 1, text: line.trim() }))));
}
