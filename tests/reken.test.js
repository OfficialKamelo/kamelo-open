// Draai met: node tests/reken.test.js
// Melo rekent niet zelf, Kamelo rekent (chat/reken.js): sommen, procenten, vergelijkingen, meetkunde, afgeleiden en
// eenheden, in vijf talen, met getallen zoals je ze in die taal schrijft. En: wat géén rekenvraag is, blijft voor de AI.
const assert = require('node:assert/strict');
globalThis.KameloRich = require('../chat/rich.js');
const K = require('../chat/reken.js');

let ok = 0, bad = 0;
const test = (name, fn) => { try { fn(); ok++; console.log(`  ✓ ${name}`); } catch (e) { bad++; console.log(`  ✗ ${name}\n    ${e.message}`); } };
const solve = (q, lang = 'nl') => K.solve(q, lang);
const bold = r => (r.text.match(/\*\*([^*]+)\*\*/g) || []).at(-1)?.replace(/\*\*/g, '');

console.log('Rekenen in code (chat/reken.js)');
test('getallen lezen zoals je ze schrijft: 2.340 euro, 2,5, 1,234.5', () => {
  assert.equal(K.num('2.340', 'nl'), 2340);
  assert.equal(K.num('2.340', 'en'), 2.34);
  assert.equal(K.num('2,5', 'nl'), 2.5);
  assert.equal(K.num('1,234.5', 'en'), 1234.5);
  assert.equal(K.num('1.234,50', 'de'), 1234.5);
});
test('getallen tonen per taal: 397,80 (geld), 78,54, 2.5 in het Engels', () => {
  assert.equal(K.fmt(397.8, 'nl', { money: true }), '397,80');
  assert.equal(K.fmt(Math.PI * 25, 'nl'), '78,54');
  assert.equal(K.fmt(2.5, 'en'), '2.5');
  assert.equal(K.fmt(12, 'de'), '12');
});
test('sommen: 2 + 2, 7 x 8, 12,5 : 4, √144, 2^10, 1/3 + 1/4', () => {
  assert.equal(bold(solve('Wat is 2 + 2?')), '4');
  assert.equal(bold(solve('Hoeveel is 7 x 8?')), '56');
  assert.equal(bold(solve('wat is 12,5 : 4')), '3,125');
  assert.equal(bold(solve('Wat is de wortel van 144?')), '12');
  assert.equal(bold(solve('Wat is 2^10?')), '1024');
  assert.equal(bold(solve('Wat is 5 tot de macht 3?')), '125');
  assert.equal(bold(solve('Wat is 1/3 + 1/4?')), '7/12');
  assert.equal(bold(solve('What is 10 divided by 4?', 'en')), '2.5');
  assert.equal(bold(solve('¿Cuánto es 15 por 4?', 'es')), '60');
  assert.equal(bold(solve('Was ist 3 mal 7?', 'de')), '21');
});
test('procenten: van, korting, erbij, welk percentage, stijging', () => {
  assert.equal(bold(solve('Hoeveel is 17% van 2340 euro?')), '397,80 euro');
  assert.equal(bold(solve('What is 15% of 80?', 'en')), '12');
  assert.equal(bold(solve('Was ist 25% von 80?', 'de')), '20');
  assert.equal(bold(solve('50 euro met 20% korting')), '40 euro');
  assert.equal(bold(solve('100 euro plus 21% btw')), '121 euro');
  assert.equal(bold(solve('Hoeveel procent is 30 van 120?')), '25%');
  assert.match(bold(solve('De prijs ging van 80 naar 100 euro. Hoeveel procent stijging is dat?')), /^25% stijging$/);
  assert.match(bold(solve('Van 100 naar 80, hoeveel procent daling?')), /^20% daling$/);
});
test('vergelijkingen: lineair met stappen, met haakjes, kwadratisch, geen en elke oplossing', () => {
  const r = solve('Los op: 3x + 7 = 22');
  assert.equal(r.kind, 'vergelijking'); assert.equal(r.value, 5); assert.equal(bold(r), 'x = 5');
  assert.match(r.text, /\$3x = 15\$/);
  assert.equal(solve('2(x - 3) = 10').value, 8);
  assert.equal(bold(solve('Résous 2x + 3 = 11', 'fr')), 'x = 4');
  assert.equal(bold(solve('3x = 7')), 'x = 7/3 ≈ 2,33');
  assert.equal(bold(solve('Solve x^2 - 5x + 6 = 0', 'en')), 'x = 2 or x = 3');
  assert.equal(bold(solve('x² = 9')), 'x = -3 of x = 3');
  assert.match(solve('x^2 + 1 = 0').text, /Geen oplossing met gewone getallen/);
  assert.match(solve('x + 1 = x + 2', 'en').text, /No solution/);
  assert.match(solve('2x + 2 = 2(x + 1)', 'en').text, /Every number x works/);
  assert.equal(solve('x^3 = 8'), null, 'derdegraads: niet zelf, de AI legt uit');
});
test('meetkunde: cirkel (straal, diameter, omtrek), Pythagoras (beide kanten), rechthoek', () => {
  const c = solve('Bereken de oppervlakte van een cirkel met een straal van 5 cm.');
  assert.equal(bold(c), '≈ 78,54 cm²'); assert.match(c.text, /\\pi r\^2/);
  assert.equal(bold(solve('Wat is de omtrek van een cirkel met een diameter van 10 cm?')), '≈ 31,42 cm');
  assert.equal(bold(solve('Area of a circle with radius 2 m?', 'en')), '≈ 12.57 m²');
  assert.equal(bold(solve('Een rechthoekige driehoek heeft rechthoekszijden van 3 cm en 4 cm. Hoe lang is de schuine zijde?')), '5 cm');
  assert.equal(bold(solve('De schuine zijde is 13 en een andere zijde 5. Hoe lang is de derde zijde van de rechthoekige driehoek?')), '12');
  assert.equal(bold(solve('Rechthoek van 4 bij 6 cm, wat is de oppervlakte?')), '24 cm²');
  assert.equal(bold(solve('Omtrek van een rechthoek van 4 bij 6 cm?')), '20 cm');
});
test('afgeleide en primitieve van een veelterm', () => {
  const d = solve('Wat is de afgeleide van x^3 + 2x?');
  assert.equal(d.kind, 'afgeleide'); assert.equal(bold(d), "$f'(x) = 3x^2 + 2$");
  assert.equal(bold(solve('Derivative of 3x² − 4x + 1', 'en')), "$f'(x) = 6x - 4$");
  assert.equal(bold(solve('Wat is de primitieve van 3x^2 + 4x?')), '$F(x) = x^3 + 2x^2 + C$');
  assert.equal(solve('Wat is de afgeleide van sin(x)?'), null, 'geen veelterm: de AI legt uit');
});
test('eenheden: °C/°F, km/h en m/s, mijl, kg en pond, inch', () => {
  assert.equal(bold(solve('Hoeveel is 30 graden Celsius in Fahrenheit?')), '86 °F');
  assert.equal(bold(solve('Convert 100 km/h to m/s', 'en')), '27.8 m/s');
  assert.equal(bold(solve('10 miles in km', 'en')), '16.1 km');
  assert.equal(bold(solve('Hoeveel is 98,6 °F in Celsius?')), '37 °C');
});
test('geen rekenvraag: persoonlijk, uitleg zonder getallen, grafieken, losse getallen', () => {
  for (const q of ['Waarom is de lucht blauw?', 'Ik voel me somber', 'Hoe lang moet ik een ei koken?', 'Hoeveel is 2 + 2 als je bang bent?',
    'Plot y = 2x + 1 for x from -3 to 3.', 'Teken de grafiek van y = x^2 - 4', 'Mijn vriend is 3 jaar en ik 5', 'Ik heb 3 x per dag hoofdpijn',
    'Leg de stelling van Pythagoras uit met een voorbeeld.', 'Wat is 5?', 'Schrijf een brief aan mijn huisbaas over 2 kapotte ramen'])
    assert.equal(solve(q), null, q);
});
test('uitleg gevraagd: dan schrijft de AI, met Kamelo\'s uitkomst', () => {
  assert.ok(K.wantsExplain('Leg uit hoe je 17% van 2340 uitrekent'));
  assert.ok(K.wantsExplain('Show the calculation please'));
  assert.ok(K.wantsExplain('Erkläre Schritt für Schritt'));
  assert.ok(!K.wantsExplain('Hoeveel is 17% van 2340 euro?'));
  assert.match(solve('Leg uit hoe je 17% van 2340 uitrekent').fact, /= 397\.8/);
});
test('staat de uitkomst in het antwoord van de AI? (met komma of punt, x² of x^2, los getal)', () => {
  const p = solve('Hoeveel is 17% van 2340 euro?');
  assert.ok(K.has('Dat is 397,80 euro.', p)); assert.ok(K.has('= 397.8', p));
  assert.ok(!K.has('Dat is 398 euro.', p)); assert.ok(!K.has('1397,8', p));
  const d = solve('Wat is de afgeleide van x^3 + 2x?');
  assert.ok(K.has('De afgeleide is 3x^2 + 2.', d)); assert.ok(K.has('3x² + 2', d)); assert.ok(!K.has('3x + 2', d));
  const q = solve('Solve x^2 - 5x + 6 = 0', 'en');
  assert.ok(K.has('x = 2 or x = 3', q)); assert.ok(!K.has('x = 12 or x = 3', q));
});
test('elke uitkomst staat er één keer, vetgedrukt (geen "= 12" en daarna nog eens "12")', () => {
  for (const [q, l] of [['What is 15% of 80?', 'en'], ['Los op: 3x + 7 = 22', 'nl'], ['Bereken de oppervlakte van een cirkel met een straal van 5 cm.', 'nl'],
    ['Hoeveel is 30 graden Celsius in Fahrenheit?', 'nl'], ['50 euro met 20% korting', 'nl'], ['Wat is de afgeleide van x^3 + 2x?', 'nl']]) {
    const r = solve(q, l), plain = r.text.replace(/\*\*[^*]+\*\*/g, '');
    for (const s of r.show.flat()) assert.ok(!K.has(plain, { show: [s] }), `${q}: ${s} staat ook buiten de vette uitkomst`);
  }
});
test('grafiekvragen: snijpunten en top van een lijn of parabool, met x eerst', () => {
  assert.equal(K.functionFacts('Teken de grafiek van y = x^2 - 4'), 'For y = x² - 4: it crosses the y-axis at (0, -4) (points are written as (x, y), x first). It is a parabola that opens upwards, with its lowest point (vertex) at (0, -4). It crosses the x-axis at (-2, 0) and (2, 0).');
  assert.match(K.functionFacts('Plot y = 2x + 1 for x from -3 to 3.'), /y-axis at \(0, 1\).*slope 2 and crosses the x-axis at \(-0\.5, 0\)/);
  assert.match(K.functionFacts('Zeichne die Funktion y = -x^2 + 2x'), /opens downwards, with its highest point \(vertex\) at \(1, 1\)/);
  assert.equal(K.functionFacts('Maak een grafiek van de omzet van 3 producten'), null);
  assert.equal(K.functionFacts('Teken y = sin(x)'), null);
});
test('veelterm lezen en schrijven', () => {
  assert.deepEqual(K.parsePoly('x^3 + 2x'), [[3, 1], [1, 2]]);
  assert.deepEqual(K.parsePoly('3x² − 4x + 1'), [[2, 3], [1, -4], [0, 1]]);
  assert.equal(K.parsePoly('sin(x)'), null);
  assert.equal(K.poly([[2, 1], [1, -1], [0, 0]]), 'x^2 - x');
});

console.log(`\n${ok} geslaagd, ${bad} mislukt`);
process.exit(bad ? 1 : 0);
