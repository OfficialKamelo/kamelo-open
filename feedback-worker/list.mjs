// Toont de antwoorden van kamelo.eu/goodbye: telling per reden en de berichten, nieuwste eerst.
// Gebruik: node feedback-worker/list.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const env = Object.fromEntries(fs.readFileSync(path.join(here, '../kamelo.env'), 'utf8').split('\n').map(l => l.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*["']?([^"'\s]*)/)).filter(Boolean).map(m => [m[1], m[2]]));
const { CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A } = env, KV = '62f376b9e2204836936bc46010f4305f';
const base = `https://api.cloudflare.com/client/v4/accounts/${A}/storage/kv/namespaces/${KV}`;
const h = { Authorization: `Bearer ${T}` };
const keys = []; let cursor = '';
do { const r = await (await fetch(`${base}/keys?limit=1000${cursor ? `&cursor=${cursor}` : ''}`, { headers: h })).json(); keys.push(...r.result.map(k => k.name)); cursor = r.result_info?.cursor; } while (cursor);
const items = await Promise.all(keys.map(async k => JSON.parse(await (await fetch(`${base}/values/${encodeURIComponent(k)}`, { headers: h })).text())));
items.sort((a, b) => b.at.localeCompare(a.at));
const LABEL = { site: "Didn't work on a site", 'too-much': 'Hid too much', missed: 'Missed something', slow: 'Site broke / slow', trust: "Didn't trust it", 'not-using': "Don't use AI much", other: 'Something else' };
const count = {}; items.forEach(i => { count[i.reason || 'other'] = (count[i.reason || 'other'] || 0) + 1; });
console.log(`${items.length} antwoorden\n`);
Object.entries(count).sort((a, b) => b[1] - a[1]).forEach(([r, n]) => console.log(`${String(n).padStart(4)}  ${LABEL[r] || r}`));
console.log('\nBerichten:');
items.filter(i => i.message).forEach(i => console.log(`- ${i.at.slice(0, 10)} [${LABEL[i.reason] || '—'}] ${i.message}`));
