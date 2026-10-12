// Vindt kamelo.env (de lokale sleutels, nooit in git) en leest hem, zonder iets te tonen of te loggen.
//
//   import { findEnv, readEnv } from './env.mjs';
//   findEnv()   pad naar kamelo.env, of null
//   readEnv()   { SLEUTEL: waarde, … } uit dat bestand, of null als er geen is
//
// Zoekvolgorde: $KAMELO_ENV (als dat bestand bestaat), anders de hoofdmap van deze repo en daarna elke map erboven.
// Zo werkt het ook vanuit een werkkopie in werkmappen/<naam>/: die vindt KAMELO/kamelo.env twee mappen hoger.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// De hoofdmap van de repo waar dit bestand in staat (tools/..).
export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

export function findEnv(start = REPO_ROOT) {
  const given = process.env.KAMELO_ENV;
  if (given && fs.existsSync(given)) return path.resolve(given);
  let dir = path.resolve(start);
  for (;;) {
    const file = path.join(dir, 'kamelo.env');
    if (fs.existsSync(file)) return file;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// Regels als `SLEUTEL=waarde`, `export SLEUTEL="waarde"` of `SLEUTEL=waarde # opmerking`. Lege regels en
// opmerkingen tellen niet mee. Geeft alleen de gelezen waarden terug; dit bestand print nooit iets.
export function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    const q = v[0];
    if ((q === '"' || q === "'") && v.length > 1 && v.endsWith(q)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    out[m[1]] = v;
  }
  return out;
}

export function readEnv(file = findEnv()) {
  return file ? parseEnv(fs.readFileSync(file, 'utf8')) : null;
}
