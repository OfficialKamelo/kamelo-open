// Maakt een PNG van een HTML-pagina met een losse, headless Chrome (eigen tijdelijk profiel).
// Gebruik: node screenshot.mjs <pagina.html[?query]> <uit.png> [breedte] [hoogte]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [, , htmlPath, outFile, w = '1920', h = '1080'] = process.argv;
if (!htmlPath || !outFile) {
  console.error('Gebruik: node screenshot.mjs <pagina.html> <uit.png> [breedte] [hoogte]');
  process.exit(1);
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--allow-file-access-from-files',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(p => p.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!wsUrl) await sleep(200);
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  // Een querystring (bijv. pagina.html?word=stored.) wordt doorgegeven aan de pagina.
  const [file, query = ''] = htmlPath.split('?');
  await send('Page.navigate', { url: `file://${path.resolve(file)}${query ? `?${query}` : ''}` });
  await sleep(+(process.env.SHOT_WAIT || 2000)); // ruimte voor webfonts; SHOT_WAIT=ms voor een later moment in een animatie
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: +w, height: +h, scale: 1 } });
  fs.writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'));
  ws.close();
  console.log(`klaar: ${outFile}`);
} finally {
  // Eerst wachten tot Chrome echt gestopt is, anders schrijft hij nog in het tijdelijke profiel.
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  // Opruimen mag nooit de render laten mislukken (Chrome schrijft soms nog na in het profiel).
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
}
