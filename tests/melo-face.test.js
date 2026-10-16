// Melo's gezicht (chat/melo-face.js): 20 emoties, tekening in lagen, en de eenvoudige regels voor wat Melo laat zien.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../chat/melo-face.js');

let ok = 0, bad = 0;
const test = (name, fn) => { try { fn(); ok++; console.log(`  ✓ ${name}`); } catch (e) { bad++; console.log(`  ✗ ${name}\n    ${e.message}`); } };

test('20 emoties, met de zes van het voorbeeld, plus praten en slapen', () => {
  assert.equal(M.EMOTIONS.length, 20);
  for (const n of ['tevreden', 'lachend', 'sceptisch', 'verdrietig', 'verrast', 'knipoog']) assert.ok(M.EMOTIONS.includes(n), n);
  assert.deepEqual(M.STATES, ['pratend', 'slapend']);
  for (const n of M.MOODS) assert.ok(M.INFO[n].en && M.INFO[n].wat, `${n} heeft een naam en uitleg`);
});

test('elke uitdrukking is te mengen met elke andere (zelfde vorm van getallen, geen sprongen)', () => {
  const shape = o => (typeof o === 'number' ? 0 : typeof o === 'string' ? '' : Array.isArray(o) ? `[${o.map(shape)}]`
    : `{${Object.keys(o).sort().map(k => `${k}:${shape(o[k])}`)}}`);
  const first = shape(M.params('neutraal'));
  for (const n of M.MOODS) assert.equal(shape(M.params(n)), first, n);
  // De mond heeft altijd dezelfde opbouw (M … C … C … Z), dus elke tussenstand is een geldige vorm.
  for (const n of M.MOODS) assert.match(M.paint(M.params(n)).mouth.d, /^M[\d. -]+C[\d. -]+C[\d. -]+Z$/, n);
});

test('pupillen blijven in het oog, ook als hij ver opzij kijkt', () => {
  const p = M.paint(M.params('neutraal'), { look: [80, -80] });
  assert.ok(Math.abs(p.pupilL.cx - 43) <= 29 && Math.abs(p.pupilL.cy - 102.5) <= 30.5);
  assert.ok(Math.abs(p.pupilR.cx - 195) <= 30 && Math.abs(p.pupilR.cy - 101.5) <= 32);
});

test('knipperen doet de oogleden dicht; praten doet de mond open', () => {
  const open = M.paint(M.params('neutraal')), shut = M.paint(M.params('neutraal'), { blink: 1 });
  const lidY = d => +d.match(/^M[\d.-]+ ([\d.-]+)/)[1];
  assert.ok(lidY(shut.ulidL.d) > lidY(open.ulidL.d) + 25);
  const talk = M.paint(M.params('pratend'), { talk: 1 }), still = M.paint(M.params('pratend'));
  assert.notEqual(talk.mouth.d, still.mouth.d);
  assert.ok(talk.tongue.opacity > 0);
});

test('regels: een bedankje → dankbaar, iets persoonlijks → meelevend, een vraag → nieuwsgierig', () => {
  assert.equal(M.classify('Thanks, that helps!'), 'dankbaar');
  assert.equal(M.classify('Dankjewel'), 'dankbaar');
  assert.equal(M.classify('Merci beaucoup'), 'dankbaar');
  assert.equal(M.classify('My mother is sick and I feel scared'), 'meelevend');
  assert.equal(M.classify('Mijn vader is overleden en ik weet niet wat ik moet doen'), 'meelevend');
  assert.equal(M.classify('Ich fühle mich so allein'), 'meelevend');
  assert.equal(M.classify('How do I write a polite email?'), 'nieuwsgierig');
  assert.equal(M.classify('waarom is de lucht blauw'), 'nieuwsgierig');
  assert.equal(M.classify('Write a haiku about autumn'), null);
  assert.equal(M.classify(''), null);
});

test('verdrietig nooit uit zichzelf: de chat-regels kiezen het nergens', () => {
  const src = fs.readFileSync(path.join(__dirname, '../chat/melo-face.js'), 'utf8');
  const watch = src.slice(src.indexOf('function watchChat'));
  assert.ok(!/['"]verdrietig['"]/.test(watch), 'watchChat noemt verdrietig niet');
  for (const t of ['I am so sad', 'my dog died', 'ik ben verdrietig']) assert.notEqual(M.classify(t), 'verdrietig');
});

test('oude naam blij werkt nog (lachend)', () => {
  assert.equal(M.known('blij'), 'lachend');
  assert.equal(M.known('bestaat-niet'), null);
});

test('geen code of plaatjes van buiten in het gezicht', () => {
  const src = fs.readFileSync(path.join(__dirname, '../chat/melo-face.js'), 'utf8');
  assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(src), 'geen url behalve de SVG-namespace');
  assert.ok(!/fetch\(|XMLHttpRequest|'image'|eval\(|new Function/.test(src));
  assert.ok(!/url\((?!#)/.test(src.replace(/url\(#\$\{id\}/g, '')), 'alleen url(#…) naar eigen clipPaths');
});

// ---------- geen clipping ----------
const S = M.SHAPE, [vx, vy, vw, vh] = M.VIEW.split(' ').map(Number);
// Omtrek van de kop: de twee oogbollen en de bochten van kuif en kaak uit BODY.
const outline = (() => {
  const pts = [];
  for (const [cx, cy, rx, ry] of Object.values(S.BULGE)) for (let a = 0; a < 6.3; a += .05) pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  const nums = S.BODY.match(/-?[\d.]+/g).map(Number), P = [];
  for (let i = 0; i < nums.length; i += 2) P.push([nums[i], nums[i + 1]]);
  for (const p of P) pts.push(p);
  // C-bochten (start, 2 handvatten, eind) bemonsteren
  const segs = [[P[0], P[1], P[2], P[3]], [P[3], P[4], P[5], P[6]], [P[6], P[7], P[8], P[9]], [P[11], P[12], P[13], P[14]], [P[14], P[15], P[16], P[17]]];
  for (const [a, b, c, d] of segs) for (let t = 0; t <= 1; t += .02) { const u = 1 - t; pts.push([0, 1].map(i => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i])); }
  return pts;
})();
// Past de transform uit paint() toe (translate, rotate om een punt, en eventueel schalen om de kin), plus ademen.
function placed(transform) {
  const n = transform.match(/-?[\d.]+/g).map(Number);
  const [tx, ty, r, ox, oy] = n, sc = n.length > 5 ? [n[7], n[8]] : [1, 1];
  const [px, py] = S.PIVOT, a = r * Math.PI / 180;
  return outline.map(([x, y]) => {
    y = py + (y - py) * 1.016; x = px + (x - px) * 1.008;            // ademen
    x = px + (x - px) * sc[0]; y = py + (y - py) * sc[1];               // indeuken/stuiteren
    const dx = x - ox, dy = y - oy;
    return [ox + dx * Math.cos(a) - dy * Math.sin(a) + tx, oy + dx * Math.sin(a) + dy * Math.cos(a) + ty];
  });
}

test('de kop blijft altijd binnen het vlak: bij elke uitdrukking, kantelen, stuiteren, knikken en ademen', () => {
  for (const n of M.MOODS) {
    const f = M.params(n);
    const moments = [null];
    for (const R of Object.values(M.REACT)) for (let t = 0; t <= 1; t += .02) moments.push(R.f(t));
    for (const re of moments) {
      for (const [x, y] of placed(M.paint(f, { react: re || undefined }).all.transform)) {
        assert.ok(x >= vx && x <= vx + vw && y >= vy && y <= vy + vh, `${n}: punt ${x.toFixed(1)},${y.toFixed(1)} buiten ${M.VIEW}`);
      }
    }
  }
});

test('pupillen en lichtpuntjes vallen helemaal binnen het oogwit (ook bij ver kijken en rondkijken)', () => {
  for (const n of M.MOODS) for (const look of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40], [30, -30], [-30, 30]]) {
    const p = M.paint(M.params(n), { look, wander: { L: [9, -9], R: [-9, 9] } });
    for (const s of ['L', 'R']) {
      const [wx, wy, wrx, wry] = S.WHITE[s], q = p[`pupil${s}`];
      if (!q.opacity) continue;
      // de rand van de pupil (ellips) moet binnen de ellips van het oogwit liggen
      for (let a = 0; a < 6.3; a += .1) {
        const x = q.cx + q.rx * Math.cos(a), y = q.cy + q.ry * Math.sin(a);
        assert.ok(((x - wx) / wrx) ** 2 + ((y - wy) / wry) ** 2 <= 1.001, `${n} ${s} kijkt ${look}: pupil steekt uit het oogwit`);
      }
      const g = p[`glint${s}`];
      if (g.opacity) assert.ok(((g.cx - q.cx) / q.rx) ** 2 + ((g.cy - q.cy) / q.ry) ** 2 < 1, `${n} ${s}: lichtpuntje buiten de pupil`);
    }
  }
});

test('monden zoals het voorbeeld: de mond is de bovenrand van de snuit, zonder trapjes', () => {
  // Bij een lijn of open mond is het erboven blauw (lip = 1). Een mondhoek ligt op de rand van de snuit (de ronde punt van de
  // lijn bedekt de aansluiting) of duidelijk lager met een lange, zachte helling (zoals de scheve lach); niets daartussen,
  // want dan ontstaat er een trapje in de rand. Een "o" laat de snuit plat en kruist de rand of ligt erop.
  const TOP = 147;
  for (const n of M.MOODS) {
    const f = M.params(n), m = f.m, oval = m[0] === m[2] && m[6] === m[4];
    if (oval) {
      assert.equal(f.lip, 0, `${n}: een o laat de snuit plat`);
      assert.ok(m[1] + (m[3] - m[1]) * .75 <= TOP + 12, `${n}: de o hangt te laag`);
      continue;
    }
    assert.equal(f.lip, 1, `${n}: boven de mond hoort blauw`);
    for (const y of [m[1], m[7]]) {
      const below = y - TOP;
      assert.ok(below <= f.mw / 2 + .5 || below >= 6, `${n}: mondhoek ${below.toFixed(1)} onder de rand geeft een trapje`);
    }
    const lip = M.paint(f).lip;
    assert.match(lip.d, /^M[\d. -]+L[\d. -]+C[\d. -]+C[\d. -]+C[\d. -]+L[\d. -]+Z$/, `${n}: lip-vorm`);
  }
});

test('de tong: alleen in een open mond, en nooit bij een dichte mond of een stilstaand pratend gezicht', () => {
  for (const n of M.MOODS) {
    const p = M.paint(M.params(n));
    const open = ['lachend', 'enthousiast'].includes(n);
    assert.equal(p.tongue.opacity > 0, open, `${n}: tong ${p.tongue.opacity}`);
  }
  assert.ok(M.paint(M.params('pratend'), { talk: 1 }).tongue.opacity > 0);
  assert.equal(M.paint(M.params('pratend'), { talk: .1 }).tongue.opacity, 0, 'bijna dichte mond: geen tongstreepje');
});

console.log(`\nmelo-face: ${ok} geslaagd, ${bad} mislukt`);
if (bad) process.exit(1);
