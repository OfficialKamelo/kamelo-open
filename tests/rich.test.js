// Melo's opmaak (chat/rich.js) en bewaren (chat/export.js): grafieken, formules, tabellen en het Word-bestand.
const assert = require('node:assert');
const R = require('../chat/rich.js');
globalThis.KameloRich = R;
const X = require('../chat/export.js');

let ok = 0, bad = 0;
const pass = name => { ok++; console.log(`  ✓ ${name}`); }, fail = (name, e) => { bad++; console.log(`  ✗ ${name}\n    ${e.message}`); };
const pending = [];
const test = (name, fn) => { try { const r = fn(); if (r?.then) pending.push(r.then(() => pass(name), e => fail(name, e))); else pass(name); } catch (e) { fail(name, e); } };
const tags = nodes => nodes.map(n => (typeof n === 'string' ? '#' : n.tag));
const find = (n, tag) => (typeof n === 'string' ? [] : [...(n.tag === tag ? [n] : []), ...n.kids.flatMap(k => find(k, tag))]);

test('rekenen: Kamelo rekent functies zelf uit, zonder eval', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  near(R.compile('x^2 - 4')(3), 5);
  near(R.compile('y = 2x² − 4')(3), 14);
  near(R.compile('f(x) = sin(pi/2) + 3x')(1), 4);
  near(R.compile('(x+1)(x-1)')(3), 8);
  near(R.compile('-x^2')(2), -4);
  near(R.compile('e^-x')(0), 1);
  near(R.compile('|x - 3|')(1), 2);
  near(R.compile('sqrt x')(9), 3);
  near(R.compile('\\frac{1}{x}')(4), 0.25);
  assert.ok(Number.isNaN(R.compile('1/x')(0)));
  assert.equal(R.compile('alert(1)'), null);
  assert.equal(R.compile('x +'), null);
});

test('grafiek in regels: staaf, gestapeld, lijn, taart', () => {
  const s = R.parseChart('type: stacked bar\ntitle: Omzet (× €1000)\nx: 2022, 2023, 2024\nProduct A: 120, 150, 180\nProduct B: 80, 95, 110');
  assert.equal(s.type, 'stacked');
  assert.deepEqual(s.labels, ['2022', '2023', '2024']);
  assert.deepEqual(s.series.map(x => x.data), [[120, 150, 180], [80, 95, 110]]);
  assert.equal(R.parseChart('type: taartdiagram\nlabels: Huur, Eten, Rest\nUitgaven: 900; 400; 300').type, 'pie');
  assert.equal(R.parseChart('Temperatuur: 3, 5, 9, 14, 18, 21, 23, 22, 18, 13, 8, 4').type, 'line'); // veel punten: een lijn
  assert.deepEqual(R.parseChart('type: bar\nx: a, b\nOmzet: €1.200, €2.450,50').series[0].data, [1200, 2450.5]);
  assert.equal(R.parseChart('nothing here'), null);
});

test('grafiek van een functie, ook als "y = …" of JSON', () => {
  const f = R.parseChart('type: function\nf: x^2 - 4\nx: -5 to 5');
  assert.equal(f.type, 'function');
  assert.deepEqual(f.range, [-5, 5]);
  assert.equal(f.fns[0].name, 'f(x) = x^2 - 4');
  assert.equal(R.parseChart('y = x^2 - 4').type, 'function');
  assert.deepEqual(R.parseChart('type: function\ny = sin(x)\nrange: -2π to 2π').range.map(v => +v.toFixed(3)), [-6.283, 6.283]);
  const j = R.parseChart(JSON.stringify({ type: 'bar', data: { labels: ['a', 'b'], datasets: [{ label: 'A', data: [1, 2] }] } }));
  assert.deepEqual(j.series[0].data, [1, 2]);
});

test('grafiek tekenen: SVG met reeksen, legenda vanaf twee reeksen, getallen als tooltip', () => {
  const tree = R.chartTree(R.parseChart('type: bar\nx: 2022, 2023\nA: 1, 2\nB: 3, 4'), 'nl');
  const xml = R.toXml(tree);
  assert.match(xml, /<svg viewBox="0 0 340 210"/);
  assert.equal(find(tree, 'path').filter(p => /\bbar\b/.test(p.attrs.class)).length, 4);
  assert.match(xml, /class="legend"/);
  assert.match(xml, /<title>B · 2023: 4<\/title>/);
  const fn = R.toXml(R.chartTree(R.parseChart('y = tan(x)\nx: -3 to 3'), 'en'));
  assert.match(fn, /class="ln s1"[^>]*d="M/); // tan: onderbroken lijn, geen fout
});

test('formules: LaTeX wordt MathML; ook als leesbare tekst', () => {
  const abc = R.toXml(R.texTree('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'));
  assert.match(abc, /^<math><mfrac><mrow><mo>−<\/mo><mi>b<\/mi><mo>±<\/mo><msqrt>/);
  assert.match(R.toXml(R.texTree('\\sum_{i=1}^{n} i', true)), /<math display="block"><munderover>/);
  assert.match(R.toXml(R.texTree('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}')), /<mtable><mtr><mtd><mn>1<\/mn>/);
  assert.equal(R.texText('a^2 + b^2 = c^2'), 'a² + b² = c²');
  assert.equal(R.texText('E = mc^2'), 'E = mc²');
});

test('tekst: kopjes, tabellen, lijsten, formules in de zin; een bedrag met $ blijft tekst', () => {
  const nodes = R.parse('# Titel\nDit is **vet** en $x^2$, maar $5 en $10 blijven.\n\n| a | b |\n|---|---:|\n| 1 | 2 |\n\n- een\n- twee\n  - sub\n\n$$E = mc^2$$');
  assert.deepEqual(tags(nodes), ['h3', 'p', 'div', 'ul', 'div']);
  assert.equal(find(nodes[1], 'math').length, 1);
  assert.match(JSON.stringify(nodes[1]), /\$5 en \$10/);
  assert.equal(find(nodes[2], 'td')[1].attrs.class, 'r');
  assert.equal(find(nodes[3], 'ul').length, 2);
  assert.equal(nodes[4].attrs.class, 'mathblock');
});

test('een grafiek die nog binnenkomt wordt pas getekend als hij af is', () => {
  const half = R.parse('Kijk:\n```chart\ntype: bar\nx: a, b\nA: 1', { streaming: true, drawing: 'tekenen…' });
  assert.equal(half[1].attrs.class, 'chart drawing');
  const whole = R.parse('```chart\ntype: bar\nx: a, b\nA: 1, 2\n```');
  assert.equal(whole[0].tag, 'figure');
  // een kapotte grafiek: gewoon als code, er verdwijnt niets
  assert.equal(R.parse('```chart\nhallo\n```')[0].tag, 'pre');
});

test('Word: een geldig zip-bestand met de tekst, kopjes en tabel', async () => {
  // In Node zonder canvas: een antwoord zonder grafiek.
  const blob = await X.docx('# Sollicitatie\nBeste meneer,\n\n- punt **een**\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nFormule: $a^2+b^2=c^2$', { title: 'Brief', lang: 'nl' });
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.equal(buf.readUInt32LE(0), 0x04034b50);
  const text = buf.toString('utf8');
  assert.match(text, /word\/document\.xml/);
  assert.match(text, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Sollicitatie/);
  assert.match(text, /<w:tbl>/);
  assert.match(text, /a² \+ b² = c²/);
  assert.equal(X.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('kopiëren en bestandsnaam', () => {
  assert.equal(X.plainText('Dus **$x = 5$**.'), 'Dus x = 5.');
  assert.equal(X.fileName('Brief: bijbaan/supermarkt?', 'docx'), 'Brief bijbaan supermarkt.docx');
  assert.equal(X.titleOf('## Mijn CV\nTekst', 'vraag'), 'Mijn CV');
});

Promise.all(pending).then(() => { console.log(`\n${ok} geslaagd, ${bad} mislukt`); process.exitCode = bad ? 1 : 0; });
