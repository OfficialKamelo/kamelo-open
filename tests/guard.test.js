// Draai met: node tests/guard.test.js
// Melo's vangrails (chat/guard.js en chat/kennis.js): de juiste taal, geen opvulzinnen of invulplekken, geen losse LaTeX,
// en bekende fouten van de AI van Chrome herkend en rechtgezet. De voorbeelden komen uit de meetset van 15 okt.
const assert = require('node:assert/strict');
const G = require('../chat/guard.js');
const K = require('../chat/kennis.js');

let ok = 0, bad = 0;
const test = (name, fn) => { try { fn(); ok++; console.log(`  ✓ ${name}`); } catch (e) { bad++; console.log(`  ✗ ${name}\n    ${e.message}`); } };

console.log('Taal (chat/guard.js)');
test('korte vragen in vijf talen, ook met een Engelse browser', () => {
  const cases = { 'Wat is 2 + 2?': 'nl', 'Los op: 3x + 7 = 22': 'nl', 'Waarom is de lucht blauw?': 'nl', 'Teken de grafiek van y = x^2 - 4': 'nl',
    'Mijn hond is gisteren overleden.': 'nl', 'What is 15% of 80?': 'en', 'I feel sad': 'en', 'Plot y = 2x + 1 for x from -3 to 3.': 'en',
    'Was ist 25% von 80?': 'de', 'Ich bin traurig': 'de', 'Résous 2x + 3 = 11': 'fr', 'Je suis triste': 'fr', '¿Cuánto es 15 por 4?': 'es', 'Estoy triste': 'es' };
  for (const [q, l] of Object.entries(cases)) assert.equal(G.pickLang(q, { ui: 'en' }), l, q);
});
test('spreektaal en losse woorden houden de vorige taal', () => {
  assert.equal(G.pickLang('nee grapje melo ily', { ui: 'en', last: 'nl' }), 'nl');
  assert.equal(G.pickLang('ok', { ui: 'nl' }), 'nl');
  assert.equal(G.pickLang('haha', { ui: 'en', last: 'de' }), 'de');
  assert.equal(G.pickLang('👍', { ui: 'fr' }), 'fr');
});
test('de taalherkenner van Chrome telt mee, maar niet bij korte zinnen tegen de eigen woorden in', () => {
  assert.equal(G.pickLang('ciao come stai oggi amico mio caro', { ui: 'nl', chrome: { detectedLanguage: 'it', confidence: 0.99 } }), 'nl', 'Italiaans kent Melo niet');
  assert.equal(G.pickLang('zzz qqq rrr', { ui: 'nl', chrome: { detectedLanguage: 'fr', confidence: 0.6 } }), 'nl');
  assert.equal(G.pickLang('zzz qqq rrr', { ui: 'nl', chrome: { detectedLanguage: 'de', confidence: 0.99 } }), 'de');
});
test('aanwijzing in het Engels én in de taal zelf; streng bij een tweede poging', () => {
  assert.equal(G.langHint('nl'), 'Reply in Dutch. Antwoord in het Nederlands.');
  assert.equal(G.langHint('en'), 'Reply in English.');
  assert.match(G.langHint('de', true), /only in German.*nie auf Englisch/);
});
test('verkeerde taal in een (half) antwoord, maar niet bij formules of een paar woorden', () => {
  assert.ok(G.wrongLang("Okay, let's solve for x: Subtract 7 from both sides of the equation and then divide by three.", 'nl'));
  assert.ok(!G.wrongLang('Okay, let’s', 'nl'), 'te kort om te zeggen');
  assert.ok(!G.wrongLang('De lucht is blauw door Rayleighverstrooiing van zonlicht in de dampkring.', 'nl'));
  assert.ok(!G.wrongLang('$3x + 7 = 22$\n$3x = 15$\n$x = 5$ en dus is het antwoord vijf.', 'nl'));
  assert.ok(G.wrongLang("2 + 2 = 4. That's a simple one! I'm glad you asked.", 'nl', { min: 25 }));
});

console.log('Vorm (chat/guard.js)');
test('opvulzin na een grafiek weg, ook als er nog een echte zin achter staat', () => {
  const t = G.tidy('Natuurlijk, ik kan een grafiek voor je maken. Hier is de omzet:\n\n```chart\ntype: bar\nx: 2022, 2023\nA: 1, 2\n```\n\nIk hoop dat deze grafiek je helpt! Laat het me weten als je nog andere grafieken nodig hebt.', { lang: 'nl' });
  assert.ok(t.startsWith('Hier is de omzet:'), t);
  assert.ok(t.endsWith('```'), t);
  const e = G.tidy('Here is the plot:\n\n```chart\ntype: function\nf: 2x+1\n```\n\nI hope this helps visualize the function! It’s a straight line with a slope of 2.', { lang: 'en' });
  assert.ok(e.endsWith('It’s a straight line with a slope of 2.'), e);
});
test('opvulzinnen in vijf talen; warme zinnen en echte vragen blijven', () => {
  for (const s of ['Ik hoop dat dit je helpt!', 'Laat het me weten als je meer wilt weten.', 'Is er nog iets anders waarmee ik je kan helpen?', 'I hope this helps!', 'Let me know if you need more.',
    'Feel free to ask!', "Is there anything specific you'd like to know about how you spend your day?", 'Is er iets specifieks dat je wilt weten?', 'Ich hoffe, das hilft dir weiter.', 'J’espère que cela t’aide.', 'N’hésite pas à demander.', 'Espero que esto te ayude.', 'That’s a simple one!', 'Goede vraag!'])
    assert.ok(G.isFiller(s), s);
  for (const s of ['Ik hoop dat het snel beter met je gaat.', 'Hoe gaat het nu met je?', 'Wil je vertellen wat er gebeurd is?', 'I hope you feel better soon.'])
    assert.ok(!G.isFiller(s), s);
  assert.equal(G.tidy('Wat verdrietig. Hoe gaat het nu met je? Laat het me weten als je wilt praten.', { lang: 'nl' }), 'Wat verdrietig. Hoe gaat het nu met je?');
  assert.equal(G.tidy('2 + 2 = 4\nThat’s a simple one! I’m glad you asked. 😊', { lang: 'en' }), '2 + 2 = 4');
});
test('loze aanloop weg, een gewone eerste zin blijft', () => {
  assert.equal(G.tidy("Okay, let's solve for x:\n\n$3x = 15$", { lang: 'en' }), '$3x = 15$');
  assert.equal(G.tidy('Oké, laten we dat stap voor stap berekenen.\nEerst 17% = 0,17.', { lang: 'nl' }), 'Eerst 17% = 0,17.');
  assert.equal(G.tidy('Natuurlijk ben je verdrietig. Dat is heel normaal.', { lang: 'nl' }), 'Natuurlijk ben je verdrietig. Dat is heel normaal.');
  assert.equal(G.tidy('Natuurlijk, ik help je graag.', { lang: 'nl' }), 'Natuurlijk, ik help je graag.', 'niets erachter: laten staan');
});
test('invulplekken: brief in het Nederlands (meetset "sollicitatie")', () => {
  const t = G.tidy('# Sollicitatiebrief\n\nGeachte [naam],\n\nMet interesse heb ik uw vacature gelezen. Ik werk graag bij [bedrijf].\n\nIk ben graag bereid om een gesprek te voeren. U kunt mij bereiken via [jouw telefoonnummer] of [jouw e-mailadres].\n\nMet vriendelijke groet,\n\n[Je naam]', { lang: 'nl' });
  assert.ok(!/\[/.test(t), t);
  assert.match(t, /^# Sollicitatiebrief\n\nGeachte heer\/mevrouw,/);
  assert.match(t, /Ik werk graag\./);
  assert.match(t, /Ik ben graag bereid om een gesprek te voeren\.\n\nMet vriendelijke groet,$/);
});
test('invulplekken: e-mail in het Engels (meetset "huisbaas-en")', () => {
  const t = G.tidy("Subject: Heating Issue at [Your Address]\n\nDear [Landlord's Name],\n\nI am writing to inform you that the heating in my apartment at [Your Address] isn't working properly.\n\nSincerely,\n[Your Name]", { lang: 'en' });
  assert.equal(t, "Subject: Heating Issue\n\nDear Sir or Madam,\n\nI am writing to inform you that the heating in my apartment isn't working properly.\n\nSincerely,");
});
test('invulplekken: Business-placeholders, lijstjes, bronnen en links blijven', () => {
  const t = '[PERSON_1] woont in [CITY_2]. Lijstje [x] klaar, [ ] nog niet, bron [1] en [kamelo.eu](https://kamelo.eu).';
  assert.equal(G.tidy(t, { lang: 'nl' }), t);
});
test('losse LaTeX wordt een formule: \\boxed{5}, \\frac, x^{2}; in code niets', () => {
  assert.equal(G.tidy('Therefore, the solution is \\boxed{5}.', { lang: 'en' }), 'Therefore, the solution is **$5$**.');
  assert.equal(G.tidy('$x = \\boxed{5}$', { lang: 'en' }), '$x = 5$');
  assert.equal(G.tidy('De helft is \\frac{1}{2} van het geheel, en x^{2} is x keer x.', { lang: 'nl' }), 'De helft is $\\frac{1}{2}$ van het geheel, en $x^{2}$ is x keer x.');
  const code = '```\nprint("\\frac{1}{2}")\n```';
  assert.equal(G.tidy(code, { lang: 'en' }), code);
});
test('formules als platte tekst worden een formule (meetset: Pythagoras zonder $-tekens)', () => {
  assert.equal(G.tidy('Dit schrijven we als: a^2+b^2=c^2.', { lang: 'nl' }), 'Dit schrijven we als: $a^2+b^2=c^2$.');
  assert.equal(G.tidy('Dan geldt:\n3^2+4^2=c^2\n9+16=c^2\nc=√(25)=5', { lang: 'nl' }), 'Dan geldt:\n$3^2+4^2=c^2$\n$9+16=c^2$\n$c=√(25)=5$');
  for (const t of ['Het is 3 uur.', 'Bel 0800-0113.', 'Prijs: 2,50 euro', 'x = 5 is de oplossing.', 'De score was 3-2.', '$a^2$ staat al goed.'])
    assert.equal(G.tidy(t, { lang: 'nl' }), t, t);
});
test('problems(): wat er nog mis is', () => {
  assert.deepEqual(G.problems('Bel me op [telefoon].', { lang: 'nl' }), ['invulplek']);
  assert.deepEqual(G.problems('Sure, here is the answer to your question about the sky being blue.', { lang: 'nl' }), ['taal']);
  assert.deepEqual(G.problems('Alles goed hier.', { lang: 'nl' }), []);
});

test('vangnet: bij woorden over niet meer willen leven staat de hulplijn er altijd onder', () => {
  for (const q of ['Ik zie het niet meer zitten. Soms wil ik gewoon niet meer wakker worden.', 'Ik denk aan zelfmoord', 'I want to die', 'Ich will nicht mehr leben', 'J’ai envie de mourir', 'No quiero vivir'])
    assert.ok(G.crisis(q), q);
  for (const q of ['Mijn hond is dood', 'Ik ben doodmoe', 'Hoe lang leeft een kat?', 'I could die for a pizza', 'Wat is 2 + 2?']) assert.ok(!G.crisis(q), q);
  const a = G.withHelp('Wat zwaar dat je je zo voelt. Wil je vertellen wat er speelt?', 'Soms wil ik gewoon niet meer wakker worden.', 'nl');
  assert.match(a, /113 Zelfmoordpreventie\*\* op 0800-0113/); assert.match(a, /\*\*112\*\*/);
  assert.equal(G.withHelp('Bel 113 of 0800-0113.', 'ik wil dood', 'nl'), 'Bel 113 of 0800-0113.', 'staat er al: niet dubbel');
  assert.equal(G.withHelp('Gewoon antwoord.', 'Wat is 2 + 2?', 'nl'), 'Gewoon antwoord.');
  assert.match(G.withHelp('Das klingt schwer.', 'Ich will nicht mehr leben', 'de'), /TelefonSeelsorge/);
});

console.log('Feitenkaartjes (chat/kennis.js)');
test('het juiste kaartje bij de vraag, niets bij persoonlijke vragen', () => {
  const ids = q => K.find(q).map(c => c.id);
  assert.deepEqual(ids('Leg de stelling van Pythagoras uit met een voorbeeld.'), ['pythagoras']);
  assert.deepEqual(ids('How long does it take light from the Sun to reach Earth? Show the calculation.'), ['licht-zon', 'zon-aarde']);
  assert.deepEqual(ids('Waarom is de lucht blauw?'), ['lucht-blauw']);
  assert.deepEqual(ids('Waarom hebben we seizoenen?'), ['seizoenen']);
  assert.deepEqual(ids('Is 1 een priemgetal?'), ['priemgetal']);
  assert.deepEqual(ids('Leg uit wat fotosynthese is, voor een kind van 10.'), ['fotosynthese']);
  assert.deepEqual(ids('How does compound interest work?'), ['rente']);
  for (const q of ['Ik voel me somber', 'Ik heb lichte hoofdpijn en pijn in mijn mond', 'Mijn hond is gisteren overleden.', 'Wat is de omtrek van een rechthoek?'])
    assert.deepEqual(ids(q), [], q);
});
test('elk kaartje: een bron, een kort feit, en waar een fout herkend wordt een juiste zin in vijf talen', () => {
  for (const c of K.CARDS) {
    assert.match(c.bron, /^https:\/\//, c.id);
    assert.ok(c.fact.length > 40 && c.fact.length < 700, `${c.id}: ${c.fact.length} tekens`);
    if (c.wrong) for (const l of ['nl', 'en', 'de', 'fr', 'es']) assert.ok(c.say?.[l], `${c.id}: say.${l}`);
  }
});
test('Pythagoras: de fout uit de meetset herkend en vervangen; juiste zinnen niet', () => {
  const cards = K.find('Pythagoras');
  const fout = 'De stelling beschrijft de zijden. De zijde waar de rechte hoek is, noemen we de schuine zijde (c). De andere twee zijden noemen we de benen.';
  const w = K.wrongs(fout, cards);
  assert.equal(w.length, 1);
  assert.equal(K.correct(fout, w, 'nl'), 'De stelling beschrijft de zijden. De schuine zijde is de langste zijde en ligt tegenover de rechte hoek; de twee andere zijden vormen samen de rechte hoek. De andere twee zijden noemen we de benen.');
  for (const s of ['The side next to the right angle is the hypotenuse.', 'De schuine zijde grenst aan de rechte hoek.', 'The hypotenuse is the shortest side.']) assert.equal(K.wrongs(s, cards).length, 1, s);
  for (const s of ['De schuine zijde ligt tegenover de rechte hoek.', 'Elke zijde aan de rechte hoek is korter dan de schuine zijde.', 'The hypotenuse is the side opposite the right angle.', 'De schuine zijde ligt niet aan de rechte hoek.'])
    assert.equal(K.wrongs(s, cards).length, 0, s);
});
test('andere bekende fouten: seizoenen, priemgetal 1, vallen, maan, lucht', () => {
  const w = (q, a) => K.wrongs(a, K.find(q)).length;
  assert.equal(w('seizoenen', 'In de zomer staat de aarde dichter bij de zon.'), 1);
  assert.equal(w('seizoenen', 'Het komt niet doordat de aarde dichter bij de zon staat.'), 0);
  assert.equal(w('priemgetal', '1 is een priemgetal.'), 1);
  assert.equal(w('priemgetal', '1 is geen priemgetal.'), 0);
  assert.equal(w('zwaartekracht', 'Zware dingen vallen sneller.'), 1);
  assert.equal(w('zwaartekracht', 'Door de luchtweerstand valt een zware steen sneller dan een veer.'), 0);
  assert.equal(w('schijngestalten van de maan', 'De fases komen door de schaduw van de aarde.'), 1);
  assert.equal(w('waarom is de lucht blauw', 'De lucht weerspiegelt de zee.'), 1);
});
test('vragen over Melo zelf: eerlijk, en nooit "niet goed in emoties"', () => {
  const ids = q => K.find(q).map(c => c.id);
  for (const q of ['melo hoe goed ben je vergeleken met het beste model van chatgpt?', 'waar ben je niet goed in?', 'Ben je slimmer dan ChatGPT?', 'What can you do?', 'Bist du besser als ChatGPT?'])
    assert.ok(ids(q).includes('melo-zelf'), q);
  for (const q of ['Kun je me helpen met een brief?', 'Ik ben niet goed in wiskunde', 'Mijn vriend is goed in tekenen']) assert.ok(!ids(q).includes('melo-zelf'), q);
  const cards = K.find('waar ben je niet goed in?');
  const fout = 'Ik ben een AI-model en ik ben niet goed in het begrijpen van complexe emoties of het geven van persoonlijke advies.';
  assert.match(K.correct(fout, K.wrongs(fout, cards), 'nl'), /^Luisteren en praten over persoonlijke dingen is juist waar ik goed in ben/);
  assert.equal(K.wrongs('Ik ben minder goed in ingewikkelde sommen en lange teksten.', cards).length, 0);
});
test('wat met de vraag meegaat naar de AI', () => {
  assert.equal(K.hint([]), '');
  assert.match(K.hint(K.find('Pythagoras')), /^ Checked facts \(use them, never contradict them\): Pythagoras: .*OPPOSITE the right angle/);
});

console.log(`\n${ok} geslaagd, ${bad} mislukt`);
process.exit(bad ? 1 : 0);
