// Maakt losse SVG's van Melo's gezicht uit chat/melo-face.js (dezelfde getallen, geen tweede tekening).
//   node tools/melo-svg.mjs <uitmap>            → <uitmap>/melo-<uitdrukking>.svg voor alle 20 emoties + pratend/slapend
//   node tools/melo-svg.mjs --icoon <bestand>   → één vierkant icoon (tevreden), zonder clipPath (ook voor macOS/NSImage)
//   node tools/melo-svg.mjs --glyph [id]        → het kleine icoon in één kleur (popup, "Ask Melo"), om in te plakken
// Gebruikt voor icons/melo.svg (favicon van de chat), de Mac-app (melo-kop.svg) en brand/mascotte.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const M = createRequire(import.meta.url)('../chat/melo-face.js');
const S = M.SHAPE, C = M.COL;

export function svg(name, { viewBox = M.VIEW, title = `Melo · ${name}` } = {}) {
  const f = M.params(name), p = M.paint(f);
  const e = (a, attrs = '') => `<ellipse cx="${a[0]}" cy="${a[1]}" rx="${a[2]}" ry="${a[3]}"${attrs}/>`;
  const defs = [], id = `m-${name}`;
  const out = [];
  out.push(`<g fill="${f.skin}">${e(S.BULGE.L)}${e(S.BULGE.R)}<path d="${S.BODY}"/></g>`);
  out.push(`<path d="${S.MUZZLE}" fill="${C.muzzle}"/>`);
  if (f.lip > 0) out.push(`<path d="${p.lip.d}" fill="${f.skin}"${f.lip < 1 ? ` opacity="${f.lip}"` : ''}/>`);
  if (f.blush > 0) for (const s of ['L', 'R']) out.push(e(S.BLUSH[s], ` fill="${C.blush}" opacity="${p[`blush${s}`].opacity}"`));
  for (const s of ['L', 'R']) {
    out.push(e(S.RING[s], ` fill="${C.ring}"`), e(S.WHITE[s], ' fill="#fff"'));
    const q = p[`pupil${s}`], g = p[`glint${s}`];
    if (q.opacity) out.push(`<ellipse cx="${q.cx}" cy="${q.cy}" rx="${q.rx}" ry="${q.ry}" fill="${C.ink}"/>`);
    if (g.opacity) out.push(`<circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="#fff"/>`);
    // Oogleden alleen als ze te zien zijn (dan met een clipPath op de ring).
    const lids = [['ulid', 'uedge', 2.4], ['llid', 'ledge', 2]].filter(([, edge]) => p[`${edge}${s}`].opacity > 0);
    if (lids.length) {
      defs.push(`<clipPath id="${id}-${s}">${e(S.RING[s])}</clipPath>`);
      out.push(`<g clip-path="url(#${id}-${s})">` + lids.map(([lid, edge, w]) => `<path d="${p[`${lid}${s}`].d}" fill="${C.ring}"/><path d="${p[`${edge}${s}`].d}" stroke="${C.edge}" stroke-width="${w}" fill="none" stroke-linecap="round"${p[`${edge}${s}`].opacity < 1 ? ` opacity="${p[`${edge}${s}`].opacity}"` : ''}/>`).join('') + '</g>');
    }
    const a = p[`arc${s}`];
    if (a.opacity > 0) out.push(`<path d="${a.d}" stroke="${C.ink}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`);
  }
  out.push(`<path d="${p.mouth.d}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${p.mouth['stroke-width']}" stroke-linecap="round" stroke-linejoin="round"/>`);
  if (p.tongue.opacity > 0) {
    defs.push(`<clipPath id="${id}-m"><path d="${p.mclip.d}"/></clipPath>`);
    out.push(`<ellipse cx="${p.tongue.cx}" cy="${p.tongue.cy}" rx="${p.tongue.rx}" ry="${p.tongue.ry}" fill="${C.tongue}" clip-path="url(#${id}-m)"/>`);
  }
  const t = p.all.transform.replace(/translate\(0 0\) rotate\(0 [\d.]+ [\d.]+\)/, '').trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><title>${title}</title>` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') + (t ? `<g transform="${t}">${out.join('')}</g>` : out.join('')) + '</svg>\n';
}

// Eén kleur (currentColor) voor kleine plekken: de tegel in de popup, de knop "Ask Melo" in de melding. Kop met de ogen
// (ring + oogwit) uitgespaard, de pupillen naar binnen en een glimlach; leesbaar vanaf 15 px.
export function glyph(id = 'melo-g') {
  const r = n => Math.round(n * 10) / 10;
  const e = (a, x = '') => `<ellipse cx="${r(a[0])}" cy="${r(a[1])}" rx="${r(a[2])}" ry="${r(a[3])}"${x}/>`;
  const pup = s => { const w = S.WHITE[s], dx = s === 'L' ? 5 : -5; return e([w[0] + dx, w[1] + 2, w[2] * .6, w[3] * .64]); };
  // Uitsparingen met een clipPath (evenodd): het vlak min de ogen en de glimlach. Geen <mask>: dan staat het woord "mask"
  // in de melding, en de test van de gratis editie controleert juist dat daar niets over afschermen staat.
  const hole = ([cx, cy, rx, ry]) => `M${r(cx - rx)} ${r(cy)}a${r(rx)} ${r(ry)} 0 1 0 ${r(2 * rx)} 0a${r(rx)} ${r(ry)} 0 1 0 ${r(-2 * rx)} 0Z`;
  const smile = 'M84 140C100 156 136 156 152 140A6 6 0 0 1 152 152C136 168 100 168 84 152A6 6 0 0 1 84 140Z';
  return `<svg viewBox="0 -18 240 240" fill="currentColor" aria-hidden="true"><clipPath id="${id}"><path clip-rule="evenodd" d="M-20 -30H260V250H-20Z${hole(S.RING.L)}${hole(S.RING.R)}${smile}"/></clipPath>` +
    `<g clip-path="url(#${id})">${e(S.BULGE.L)}${e(S.BULGE.R)}<path d="${S.BODY}"/></g>${pup('L')}${pup('R')}</svg>`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [a, b] = process.argv.slice(2);
  if (a === '--glyph') {
    console.log(glyph(b));
  } else if (a === '--icoon') {
    // Vierkant, de kop gecentreerd (kop loopt van x 6 tot 235 en y 2 tot 196).
    fs.writeFileSync(b, svg('tevreden', { viewBox: '0.5 -18 240 240', title: 'Melo' }).replace('<svg ', '<svg width="512" height="512" '));
    console.log(`icoon → ${b}`);
  } else {
    const dir = a || 'uit';
    fs.mkdirSync(dir, { recursive: true });
    for (const n of M.MOODS) fs.writeFileSync(path.join(dir, `melo-${n}.svg`), svg(n));
    console.log(`${M.MOODS.length} SVG's → ${dir}`);
  }
}
