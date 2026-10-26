// De leerzinnen van de gewogen lijst (src/topic-model.js) en hun vingerafdruk. tools/detectie-leer.mjs zet die
// vingerafdruk in src/topic-weights.js; tests/detectie-meting.mjs mislukt als hij niet meer klopt (zinnen of leerscript
// veranderd, maar niet opnieuw geleerd).
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
// Nooit apart/, blind/, vers/ of vers2/: daarop meten we.
export const SOURCES = ['leer', 'ontwikkel', 'schrijver2', 'kort'];

export function fingerprint() {
  const h = createHash('sha256');
  for (const dir of SOURCES) {
    for (const f of readdirSync(new URL(`tests/detectie/${dir}/`, ROOT)).filter(f => f.endsWith('.txt')).sort()) {
      h.update(`${dir}/${f}\n`).update(readFileSync(new URL(`tests/detectie/${dir}/${f}`, ROOT)));
    }
  }
  h.update(readFileSync(new URL('tools/detectie-leer.mjs', ROOT)));
  return h.digest('hex').slice(0, 16);
}
