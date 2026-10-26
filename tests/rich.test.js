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

test('formules: \\boxed{5} in een kader, onbekende commando\'s met {inhoud} zonder de naam (was "boxed5")', () => {
  const box = R.texTree('x = \\boxed{5}');
  assert.ok(find(box, 'mrow').some(n => n.attrs.class === 'boxed'), 'kader');
  assert.equal(R.texText('x = \\boxed{5}'), 'x = 5');
  assert.ok(find(R.texTree('\\boxed{5}'), 'mrow').some(n => n.attrs.class === 'boxed'), 'ook als hij alleen staat');
  assert.equal(R.texText('\\textcolor{red}{x+1}'), 'x + 1');
  assert.equal(R.texText('\\mathsf{AB}'), 'AB');
  assert.equal(R.texText('\\therefore x = 3'), '∴x = 3');
  assert.equal(R.texText('\\foo'), 'foo', 'zonder groep: de naam blijft staan, er verdwijnt niets');
});
test('kopiëren en bestandsnaam', () => {
  assert.equal(X.plainText('Dus **$x = 5$**.'), 'Dus x = 5.');
  assert.equal(X.plainText('```js\nlet a = 1;\n```'), '```js\nlet a = 1;\n```', 'codeblok houdt zijn sluiter');
  assert.equal(X.plainText('```chart\ntype: bar\nA: 1, 2\n```'), 'type: bar\nA: 1, 2', 'grafiek: alleen de getallen');
  assert.equal(X.fileName('Brief: bijbaan/supermarkt?', 'docx'), 'Brief bijbaan supermarkt.docx');
  assert.equal(X.titleOf('## Mijn CV\nTekst', 'vraag'), 'Mijn CV');
});

// ---------- Melo's onderdelen (generatieve UI), gratis editie ----------
const FREE = ['letter', 'checklist', 'steps', 'compare'];
const part = (src, parts = FREE, opts = {}) => R.parse(src, { parts, ...opts });
const kinds = nodes => nodes.filter(n => n.attrs?.class?.startsWith('part')).map(n => n.attrs['data-kind']);
const fields = n => find(n, 'input').filter(i => i.attrs.class?.startsWith('fld'));
const LETTER = '```letter\nOnderwerp: Verwarming kapot\nBeste [naam huisbaas],\n\nDe verwarming op de [adres] doet het sinds [datum] niet. Wilt u een monteur sturen?\n\nMet vriendelijke groet,\n```';

test('brief: [naam] wordt een invulveld, hetzelfde veld één sleutel, een groet zonder naam krijgt een veld', () => {
  const [card] = part(LETTER);
  assert.equal(card.attrs['data-kind'], 'letter');
  const f = fields(card);
  assert.deepEqual(f.map(i => i.attrs['data-k']), ['naam huisbaas', 'adres', 'datum', 'your name']);
  assert.equal(f[0].attrs.placeholder, 'naam huisbaas');
  assert.match(R.toXml(card), /<p class="subj">Verwarming kapot<\/p>/);
  assert.match(R.toXml(card), /4 to fill in/);
  // in vijf talen: de teksten komen van chat.js (I.t)
  assert.match(R.toXml(part(LETTER, FREE, { t: k => ({ pchatPartLetter: 'Brief', pchatPartToFill: 'Nog {n} in te vullen', pchatPartYourName: 'je naam' })[k] })[0]), /Brief.*Nog 4 in te vullen.*placeholder="je naam"/);
  // Business-placeholders en vinkjes zijn geen invulveld
  assert.equal(fields(part('```letter\nBeste [PERSON_1],\n\nIk kom [x] morgen langs om de sleutel te halen. Tot dan!\n```')[0]).length, 0);
});

test('brief: wat iemand invulde blijft staan als het antwoord opnieuw getekend wordt', () => {
  const st = { 0: { f: { datum: '3 maart', 'naam huisbaas': 'meneer Jansen' } } };
  const f = fields(part(LETTER, FREE, { state: st })[0]);
  assert.equal(f[0].attrs.value, 'meneer Jansen');
  assert.equal(f[0].attrs.class, 'fld on');
  assert.equal(f[2].attrs.value, '3 maart');
  assert.match(R.toXml(part(LETTER, FREE, { state: st })[0]), /2 to fill in/);
});

test('checklist: vinkjes, [x] staat al aan, kopjes; voortgang', () => {
  const [card] = part('```checklist\ntitle: Naar de huisarts\n- Verzekeringspas\n- [x] Lijst met medicijnen\nVragen:\n- Wat zijn de bijwerkingen?\n```');
  const boxes = find(card, 'input');
  assert.equal(boxes.length, 3);
  assert.equal(boxes[1].attrs.checked, '');
  assert.match(R.toXml(card), /<div class="pt">Naar de huisarts<\/div>/);
  assert.match(R.toXml(card), /<div class="grp">Vragen<\/div>/);
  assert.match(R.toXml(card), /1 of 3 done/);
  assert.match(R.toXml(part('```checklist\n- a\n- b\n```', FREE, { state: { 0: { c: { 0: true, 1: true } } } })[0]), /2 of 2 done/);
});

test('stappenplan: genummerd, "kop: uitleg", vetgedrukte kop, losse regel hoort bij de stap erboven', () => {
  const [card] = part('```steps\ntitle: Huurtoeslag aanvragen\n1. **DigiD**: vraag een DigiD aan\n2. Inloggen: log in op toeslagen.nl\nHoud je inkomen bij de hand.\n3. Aanvragen\n```');
  const items = find(card, 'li');
  assert.equal(items.length, 3);
  assert.match(R.toXml(items[0]), /<b>DigiD<\/b><p>Vraag een DigiD aan<\/p>/);
  assert.match(R.toXml(items[1]), /Log in op toeslagen\.nl Houd je inkomen bij de hand\./);
  assert.equal(find(card, 'button').length, 3);
  assert.ok(!/<a /.test(R.toXml(card)), 'geen link: niets in een onderdeel opent iets');
});

test('vergelijking: twee opties, voor- en nadelen, ook als + en −', () => {
  const [card] = part('```compare\ntitle: Huren of kopen\noption: Huren\npro: Flexibel\ncon: Je bouwt geen vermogen op\noption: Kopen\n+ Vermogen opbouwen\n− Hoge bijkomende kosten\n```');
  assert.equal(card.attrs['data-kind'], 'compare');
  const xml = R.toXml(card);
  assert.equal(find(card, 'div').filter(d => d.attrs.class === 'opt').length, 2);
  assert.match(xml, /Huren.*Flexibel.*Je bouwt geen vermogen op.*Kopen.*Vermogen opbouwen.*Hoge bijkomende kosten/);
  // in het Nederlands: "Voordelen:" als kopje, opsomming eronder
  assert.ok(R.parse('```compare\nHuren:\nVoordelen:\n- flexibel\nNadelen:\n- duur\nKopen:\nVoordelen:\n- bezit\n```', { parts: FREE })[0].attrs['data-kind'] === 'compare');
});

test('brief: een lange uitleg tussen haken wordt een kort veld, met de uitleg als tooltip (meetset 16 okt)', () => {
  const [card] = part('```letter\nGeachte [Naam contactpersoon, indien bekend, anders: Afdeling HR],\n\nIk ben [votre situation actuelle - par exemple, étudiant(e)] en werk graag.\n\nGroet,\n[je naam]\n```');
  const f = fields(card);
  assert.deepEqual(f.map(i => i.attrs.placeholder), ['Naam contactpersoon', 'votre situation actuelle', 'je naam']);
  assert.equal(f[0].attrs.title, 'Naam contactpersoon, indien bekend, anders: Afdeling HR');
  assert.match(R.flatten('```letter\nGeachte [Naam contactpersoon, indien bekend],\n\nDit is een brief met genoeg woorden erin.\n```', { parts: FREE, state: { 0: { f: { 'naam contactpersoon': 'mevrouw De Wit' } } } }), /Geachte mevrouw De Wit,/);
});

test('vergelijking: voordelen op één regel met komma\'s worden losse punten (meetset 16 okt)', () => {
  const [card] = part('```compare\noption: Huren\npro: Flexibiliteit, minder onderhoud, lagere kosten (borg, makelaar).\ncon: Geen vermogen\noption: Kopen\npro: Vermogen opbouwen\n```');
  const items = find(card, 'ul')[0].kids.map(li => li.kids[1].kids[0]);
  assert.deepEqual(items, ['Flexibiliteit', 'Minder onderhoud', 'Lagere kosten (borg, makelaar)']);
});

test('kapotte blokken worden gewone tekst: er verdwijnt niets en er komt geen kaart', () => {
  const cases = [
    '```checklist\nalleen één ding\n```',                       // te weinig
    '```steps\nGeen nummers, alleen tekst.\n```',
    '```compare\noption: Huren\npro: flexibel\n```',             // één optie
    '```letter\nHoi\n```',                                      // te kort
    '```decision\nwat moet ik kiezen\n```',                     // onbekend in deze editie
  ];
  for (const c of cases) {
    const nodes = part(c);
    assert.deepEqual(kinds(nodes), [], c);
    assert.ok(!nodes.some(n => n.tag === 'pre'), `geen codeblok: ${c}`);
    const body = c.split('\n').slice(1, -1).join(' ');
    for (const w of body.match(/\p{L}{3,}/gu) || []) assert.ok(JSON.stringify(nodes).includes(w), `"${w}" verdween uit ${c}`);
  }
  // HTML blijft tekst: geen script- of img-element
  const evil = part('```letter\nBeste [naam] <img src=x onerror=alert(1)>,\n\nDit is een test met <script>alert(1)</script> erin.\n\nGroet,\n[naam]\n```');
  assert.equal(find(evil[0], 'script').length + find(evil[0], 'img').length, 0);
  assert.match(R.toXml(evil[0]), /&lt;img src=x/);
});

test('alleen de onderdelen van deze editie: een onbekend of Business-blok wordt gewone tekst', () => {
  assert.deepEqual(kinds(part('```actions\n[PERSON_1] | Offerte sturen | vrijdag\n```')), []);
  assert.deepEqual(kinds(part('```decision\ncriteria: a | b\nX: 1 | 2\nY: 2 | 1\n```')), []);
  assert.deepEqual(kinds(R.parse(LETTER)), [], 'zonder parts (afdrukpagina): geen onderdelen');
  assert.equal(R.partOf('email', FREE), 'letter', '```email in de gratis editie: een brief');
  assert.equal(R.partOf('chart', FREE), null);
});

test('onderdeel dat nog binnenkomt: "Aan het schrijven…", velden pas daarna; tijdens het schrijven niet invulbaar', () => {
  const half = part('Hier:\n```checklist\n- a\n- b', FREE, { streaming: true, t: k => (k === 'pchatPartWriting' ? 'Aan het schrijven…' : null) });
  assert.equal(half[1].attrs.class, 'part drawing');
  assert.equal(half[1].kids[0], 'Aan het schrijven…');
  const whole = part(LETTER, FREE, { streaming: true });
  assert.ok(fields(whole[0]).every(i => i.attrs.disabled === ''));
});

test('flatten: kopiëren, pdf en Word krijgen wat er is ingevuld en aangevinkt', () => {
  const text = `Hier is je brief.\n\n${LETTER}\n\n\`\`\`checklist\n- Pas\n- Lijst\n\`\`\`\n\n\`\`\`steps\n1. Een: eerst\n2. Twee: dan\n\`\`\``;
  const flat = R.flatten(text, { parts: FREE, state: { 0: { f: { 'naam huisbaas': 'meneer Jansen', datum: '3 maart' } }, 1: { c: { 1: true } }, 2: { c: { 0: true } } } });
  assert.match(flat, /^Hier is je brief\./);
  assert.match(flat, /Beste meneer Jansen,/);
  assert.match(flat, /sinds 3 maart niet/);
  assert.match(flat, /op de \[adres\]/, 'niet ingevuld: zoals de AI het schreef');
  assert.match(flat, /- ☐ Pas\n- ☑ Lijst/);
  assert.match(flat, /1\. ✓ Een: Eerst\n2\. Twee: Dan/);
  assert.ok(!/```/.test(flat));
  assert.equal(R.flatten(text), text, 'zonder parts verandert er niets');
  // het antwoord zelf (wat de AI te zien krijgt) verandert niet
  assert.match(text, /Beste \[naam huisbaas\]/);
  // een kapot blok: gewoon de regels
  assert.equal(R.flatten('```steps\nkapot\n```', { parts: FREE }), 'kapot');
});

test('flatten → Word: ingevulde brief en vinkjes in het document', async () => {
  const flat = R.flatten(`${LETTER}\n\n\`\`\`checklist\n- Pas\n- Lijst\n\`\`\``, { parts: FREE, state: { 0: { f: { 'naam huisbaas': 'meneer Jansen' } }, 1: { c: { 0: true } } } });
  const buf = Buffer.from(await (await X.docx(flat, { title: 'Brief', lang: 'nl' })).arrayBuffer());
  const text = buf.toString('utf8');
  assert.match(text, /Beste meneer Jansen,/);
  assert.match(text, /☑/);
  assert.match(X.plainText(flat), /Beste meneer Jansen,/);
});

test('asLetter: een brief zonder blok krijgt er een, van de aanhef tot de naam; de rest blijft eromheen', () => {
  const out = R.asLetter('Natuurlijk, hier is je brief.\n\nOnderwerp: Verwarming\n\nBeste [naam],\n\nDe verwarming doet het niet.\n\nMet vriendelijke groet,\n\n[Je naam]\n[Telefoonnummer]\n\nIk hoop dat dit helpt!');
  assert.equal(out, 'Natuurlijk, hier is je brief.\n\n```letter\nOnderwerp: Verwarming\n\nBeste [naam],\n\nDe verwarming doet het niet.\n\nMet vriendelijke groet,\n\n[Je naam]\n[Telefoonnummer]\n```\n\nIk hoop dat dit helpt!');
  assert.match(R.asLetter('Dear [Landlord],\n\nThe heating is broken.\n\nKind regards,\nAnna'), /^```letter\nDear \[Landlord\],[\s\S]*Anna\n```$/);
  // in een blok zonder soort (meetset 16 okt: de sollicitatiebrief stond tussen ``` en ```)
  assert.match(R.asLetter('```\n[Je naam]\n\nGeachte heer/mevrouw,\n\nIk solliciteer graag.\n\nMet vriendelijke groet,\n[Je naam]\n```'), /^```letter\n\[Je naam\]/);
  assert.equal(R.asLetter('```js\nconst a = 1;\n```'), '```js\nconst a = 1;\n```');
  const has = '```letter\nBeste Jan,\n\nGroet\n```';
  assert.equal(R.asLetter(has), has, 'al een blok: niets doen');
  assert.equal(R.asLetter('Waarom is de lucht blauw? Door verstrooiing.'), 'Waarom is de lucht blauw? Door verstrooiing.');
  assert.equal(R.asLetter('Hallo! Leuk dat je er bent. Wat kan ik doen?'), 'Hallo! Leuk dat je er bent. Wat kan ik doen?', 'een groet is geen brief');
  assert.equal(R.asLetter('Beste Jan,\n\n```chart\ntype: bar\nA: 1, 2\n```\n\nGroet,\nAnna'), 'Beste Jan,\n\n```chart\ntype: bar\nA: 1, 2\n```\n\nGroet,\nAnna', 'niet om een ander blok heen');
});

test('grafiek: enorme of bijna gelijke getallen laten de pagina niet hangen; een lijn hoeft niet bij 0 te beginnen', () => {
  const t0 = Date.now();
  R.parse('```chart\ntype: function\nf: x\nx: 10000000000000000 to 10000000000000004\n```', { lang: 'en' });
  R.parse('```chart\n{"type":"function","f":"x","xmin":1e17,"xmax":100000000000000016}\n```', { lang: 'en' });
  assert.ok(Date.now() - t0 < 2000, 'klaar binnen 2 s');
  const ticks = md => find({ tag: 'root', kids: R.parse(md, { lang: 'en' }) }, 'text').filter(n => n.attrs?.class === 'tick' && n.attrs['text-anchor'] === 'end').map(n => Number(n.kids.join('').replace(/[^\d.-]/g, '')));
  const line = ticks('```chart\ntype: line\nlabels: ma, di, wo\nTemp: 100, 101, 102\n```');
  assert.ok(line.length && Math.min(...line) > 0, `lijn vlak bij 100 begint niet bij 0: ${line}`);
  const bar = ticks('```chart\ntype: bar\nlabels: ma, di, wo\nTemp: 100, 101, 102\n```');
  assert.equal(Math.min(...bar), 0, 'staven beginnen wel bij 0');
});

test('formules: gewone haakjes rekken niet mee, \\left( wel; een leesteken blijft bij de formule', () => {
  const psi = R.toXml(R.texTree('\\frac{\\partial}{\\partial t}\\Psi(r,t)'));
  assert.match(psi, /<mo stretchy="false">\(<\/mo>/, 'Ψ(r,t) naast een breuk: haakje zo hoog als de letters');
  assert.match(R.toXml(R.texTree('\\left[ \\frac{1}{2} \\right]')), /<mo stretchy="true">\[<\/mo>/);
  const p = R.parse('Er geldt $a^2+b^2=c^2$, met $c$ de schuine zijde.')[0];
  const nw = find(p, 'span').find(n => n.attrs.class === 'nw');
  assert.ok(nw && tags(nw.kids).join() === 'math,#' && nw.kids[1] === ',', 'de komma zit in hetzelfde blokje als de formule');
  const al = R.toXml(R.texTree('\\begin{aligned} 3x + 7 &= 22 \\\\ 3x &= 15 \\end{aligned}', true));
  assert.match(al, /<mtd columnalign="right"[^>]*displaystyle="true"><mn>3<\/mn>/, 'aligned: links rechts uitgelijnd, op ware grootte');
  assert.match(al, /<mtd columnalign="left"[^>]*><mo>=<\/mo>/, 'aligned: de = links uitgelijnd');
  assert.ok(!find(p, 'span').some(n => find(n, 'mi').some(m => m.kids[0] === 'c' && n.kids.length === 1)), 'zonder leesteken geen blokje');
});

Promise.all(pending).then(() => { console.log(`\n${ok} geslaagd, ${bad} mislukt`); process.exitCode = bad ? 1 : 0; });
