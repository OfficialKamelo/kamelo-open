// Brengt een gemaakte versie uit in de stores, via hun officiële API's. Eerst `npm run release`, dan dit.
//
//   node tools/publish.mjs edge [versie]     uploadt web-store-uploaden/Microsoft Edge/kamelo-store-<versie>.zip
//                                            naar Edge Add-ons en dient hem in (Microsoft beoordeelt hem daarna)
//   node tools/publish.mjs chrome [versie]   uploadt web-store-uploaden/Google Chrome/kamelo-store-<versie>.crx (ondertekend;
//                                            anders de .zip) naar de Chrome Web Store en dient hem in
//   node tools/publish.mjs chrome-status     toont welke versie in de Chrome Web Store staat (verandert niets)
//   … --dry-run                              controleert alleen of alles klaarstaat
//
// Sleutels staan in kamelo.env (nooit in git): EDGE_CLIENT_ID, EDGE_API_KEY, EDGE_PRODUCT_ID; CWS_PUBLISHER_ID, CWS_ITEM_ID.
// Chrome logt in met een serviceaccount (~/.kamelo/cws-service-account.json, toegevoegd in het dashboard onder Instellingen),
// omdat Geavanceerde beveiliging op het Google-account gewone OAuth-apps blokkeert. Firefox volgt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [store, versionArg] = args.filter(a => !a.startsWith('--'));
const version = versionArg || JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version;

function fail(text) {
  console.error(`\n✗ ${text}`);
  process.exit(1);
}

function env() {
  const file = path.join(ROOT, 'kamelo.env');
  if (!fs.existsSync(file)) fail('kamelo.env ontbreekt.');
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Edge Add-ons (API v1.1) ----------

async function edge() {
  const { EDGE_CLIENT_ID: clientId, EDGE_API_KEY: apiKey, EDGE_PRODUCT_ID: productId } = env();
  if (!clientId || !apiKey || !productId) fail('Zet EDGE_CLIENT_ID, EDGE_API_KEY en EDGE_PRODUCT_ID in kamelo.env.');
  const zip = path.join(ROOT, 'web-store-uploaden', 'Microsoft Edge', `kamelo-store-${version}.zip`);
  if (!fs.existsSync(zip)) fail(`Pakket niet gevonden: ${path.relative(ROOT, zip)}`);
  console.log(`▸ Edge: ${path.relative(ROOT, zip)}`);
  if (dryRun) return console.log('  (dry run: niets verstuurd)');

  const base = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions`;
  const headers = { Authorization: `ApiKey ${apiKey}`, 'X-ClientID': clientId };

  // Wacht tot een operatie klaar is; geeft het eindantwoord terug.
  async function wait(url, label) {
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const res = await fetch(url, { headers });
      const body = await res.json().catch(() => ({}));
      if (body.status === 'InProgress') { process.stdout.write('.'); continue; }
      process.stdout.write('\n');
      if (body.status !== 'Succeeded') fail(`${label} mislukt: ${JSON.stringify(body)}`);
      return body;
    }
    fail(`${label}: na 5 minuten nog geen antwoord.`);
  }

  const up = await fetch(`${base}/draft/package`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: fs.readFileSync(zip),
  });
  if (up.status !== 202) fail(`Uploaden mislukt (${up.status}): ${await up.text()}`);
  process.stdout.write('  uploaden');
  await wait(`${base}/draft/package/operations/${up.headers.get('location')}`, 'Uploaden');

  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const section = changelog.split(`## [${version}]`)[1]?.split('\n## [')[0] ?? '';
  const notes = `Kamelo ${version}. ${section.replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim()}`.slice(0, 1900);
  const pub = await fetch(base, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
  });
  if (pub.status !== 202) fail(`Indienen mislukt (${pub.status}): ${await pub.text()}`);
  process.stdout.write('  indienen');
  await wait(`${base}/operations/${pub.headers.get('location')}`, 'Indienen');
  console.log(`✓ Edge: ${version} ingediend. Microsoft beoordeelt hem (meestal binnen een paar dagen); store-watch meldt wanneer hij live staat.`);
}


// ---------- Chrome Web Store (API v2, serviceaccount) ----------

async function chromeApi() {
  const { CWS_PUBLISHER_ID: publisher, CWS_ITEM_ID: item } = env();
  if (!publisher || !item) fail('Zet CWS_PUBLISHER_ID en CWS_ITEM_ID in kamelo.env.');
  const keyFile = path.join(os.homedir(), '.kamelo', 'cws-service-account.json');
  if (!fs.existsSync(keyFile)) fail('Serviceaccount-sleutel ontbreekt: ~/.kamelo/cws-service-account.json');
  const sa = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/chromewebstore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
  const assertion = `${unsigned}.${crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url')}`;
  const token = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })).json();
  if (!token.access_token) fail(`Inloggen bij Google mislukt: ${token.error} ${token.error_description || ''}`);
  const name = `publishers/${publisher}/items/${item}`;
  const call = async (url, init = {}) => {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token.access_token}`, ...init.headers } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) fail(`Chrome Web Store (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    return body;
  };
  return { name, call, status: () => call(`https://chromewebstore.googleapis.com/v2/${name}:fetchStatus`) };
}

function describe(st) {
  const live = st.publishedItemRevisionStatus;
  const review = st.submittedItemRevisionStatus;
  const line = (label, r) => r && console.log(`  ${label}: ${r.state}, versie ${r.distributionChannels?.map(c => `${c.crxVersion} (${c.deployPercentage}%)`).join(', ') || '?'}`);
  line('live', live);
  line('ingediend', review);
  if (st.lastAsyncUploadState) console.log(`  laatste upload: ${st.lastAsyncUploadState}`);
}

async function chromeStatus() {
  const api = await chromeApi();
  console.log('▸ Chrome Web Store');
  describe(await api.status());
}

async function chrome() {
  const dir = path.join(ROOT, 'web-store-uploaden', 'Google Chrome');
  const file = [`kamelo-store-${version}.crx`, `kamelo-store-${version}.zip`].map(f => path.join(dir, f)).find(f => fs.existsSync(f));
  if (!file) fail(`Pakket niet gevonden: kamelo-store-${version}.crx of .zip in ${path.relative(ROOT, dir)}`);
  const api = await chromeApi();
  console.log(`▸ Chrome: ${path.relative(ROOT, file)}`);
  describe(await api.status());
  if (dryRun) return console.log('  (dry run: niets verstuurd)');

  const up = await api.call(`https://chromewebstore.googleapis.com/upload/v2/${api.name}:upload`, {
    method: 'POST', headers: { 'Content-Type': file.endsWith('.crx') ? 'application/x-chrome-extension' : 'application/zip' }, body: fs.readFileSync(file),
  });
  let state = up.uploadState;
  process.stdout.write(`  uploaden (${state})`);
  for (let i = 0; i < 60 && state === 'IN_PROGRESS'; i++) {
    await sleep(5000);
    state = (await api.status()).lastAsyncUploadState;
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  if (state !== 'SUCCEEDED') fail(`Uploaden mislukt: ${state} ${JSON.stringify(up)}`);
  const pub = await api.call(`https://chromewebstore.googleapis.com/v2/${api.name}:publish`, { method: 'POST' });
  console.log(`✓ Chrome: ${version} ingediend (${pub.state || 'ok'}). Google beoordeelt hem; store-watch meldt wanneer hij live staat.`);
}

const stores = { edge, chrome, 'chrome-status': chromeStatus };
if (!stores[store]) fail(`Gebruik: node tools/publish.mjs ${Object.keys(stores).join(' | ')} [versie] [--dry-run]`);
await stores[store]();
