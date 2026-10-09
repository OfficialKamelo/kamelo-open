// Zet worker.js online als Cloudflare Worker "kamelo-feedback" met de KV-opslag, op api.kamelo.eu.
// Gebruikt CLOUDFLARE_API_TOKEN en CLOUDFLARE_ACCOUNT_ID uit kamelo.env. Gebruik: node feedback-worker/deploy.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const env = Object.fromEntries(fs.readFileSync(path.join(here, '../kamelo.env'), 'utf8').split('\n').map(l => l.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*["']?([^"'\s]*)/)).filter(Boolean).map(m => [m[1], m[2]]));
const { CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A } = env;
const KV = '62f376b9e2204836936bc46010f4305f', NAME = 'kamelo-feedback', HOST = 'api.kamelo.eu';
const api = (p, o = {}) => fetch(`https://api.cloudflare.com/client/v4${p}`, { ...o, headers: { Authorization: `Bearer ${T}`, ...(o.headers || {}) } }).then(r => r.json());

const fd = new FormData();
fd.append('metadata', new Blob([JSON.stringify({
  main_module: 'worker.js', compatibility_date: '2026-09-01',
  bindings: [{ type: 'kv_namespace', name: 'FEEDBACK', namespace_id: KV }],
  observability: { enabled: false },
})], { type: 'application/json' }));
fd.append('worker.js', new Blob([fs.readFileSync(path.join(here, 'worker.js'))], { type: 'application/javascript+module' }), 'worker.js');
const up = await api(`/accounts/${A}/workers/scripts/${NAME}`, { method: 'PUT', body: fd });
console.log('script:', up.success, up.errors?.map(e => e.message).join('; ') || '');

const zones = await api('/zones?name=kamelo.eu');
const zone = zones.result?.[0]?.id;
const dom = await api(`/accounts/${A}/workers/domains`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hostname: HOST, service: NAME, zone_id: zone, environment: 'production' }) });
console.log('domain:', dom.success, dom.errors?.map(e => e.message).join('; ') || HOST);
