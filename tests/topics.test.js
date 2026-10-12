// Draai met: node tests/topics.test.js
const assert = require('node:assert/strict');
const { sensitiveTopics } = require('../src/topics.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
const topics = text => assert.deepEqual.bind(null, sensitiveTopics(text));

console.log('Gevoelige onderwerpen');
test('over jezelf of iemand om je heen', () => {
  topics('Ik heb sinds vorig jaar diabetes, wat mag ik eten?')(['HEALTH']);
  topics('Mijn dochter is net gediagnosticeerd met autisme')(['HEALTH']);
  topics('I have been struggling with depression lately')(['MENTAL']);
  topics('My therapist says I should journal more')(['MENTAL']);
  topics('Ik heb schulden en de deurwaarder staat voor de deur')(['MONEY']);
  topics('Hoe vertel ik mijn ouders dat ik homo ben?')(['SEXUALITY']);
  topics('Als moslim wil ik tijdens de ramadan …. ik werk in de zorg')(['RELIGION']);
  topics('I have a criminal record, can I still get a visa?')(['LEGAL']);
});
test('de voorbeelden van kamelo.eu (moeten altijd een melding geven)', () => {
  topics('I found a lump in my breast this morning. Should I be worried?')(['HEALTH']);
  topics('i found a lump in my breast should i be worried?')(['HEALTH']);
  topics('My partner has been low for weeks. How do I bring it up without making it worse?')(['MENTAL']);
  topics('I’m €4,000 behind on my bills and too ashamed to tell anyone. Where do I start?')(['MONEY']);
});
test('gewone woorden voor klachten, niet alleen diagnoses', () => {
  topics('My doctor says I need a blood test')(['HEALTH']);
  topics('Ik heb een knobbel in mijn borst gevonden')(['HEALTH']);
  topics('Ik sta rood en kan de huur niet betalen')(['MONEY']);
  topics('I paid a lump sum last year')([]);
  topics('I made a rash decision at work')([]);
});
test('zoals mensen echt typen: zonder hoofdletters of apostrof', () => {
  topics('im $4000 behind on bills and idk what to do')(['MONEY']);
  topics('ive had chest pain since yesterday')(['HEALTH']);
  topics('cant pay rent this month what do i do')(['MONEY']);
  topics('mn moeder heeft kanker')(['HEALTH']);
  topics('kheb al weken hoofdpijn')(['HEALTH']);
  topics('im behind on the project schedule')([]);
});
test('samenstellingen, woordgroepen die het zelf zeggen, en huiswerk of fictie', () => {
  topics('mijn zoon heeft al dagen oorpijn')(['HEALTH']); // *pijn: woordeinde
  topics('the police questioned me about a fight')(['LEGAL']); // !questioned_me: geen ik/mijn nodig
  topics('behind on rent again')(['MONEY']);
  topics('explain the five pillars of islam for my homework')([]); // NOT: homework
  topics('in mijn boek wordt de hoofdpersoon gearresteerd')([]);
  topics('cant stop crying')([]); // zonder ik: geen melding
  topics('i cant stop crying')(['MENTAL']); // can't_stop_crying telt ook zonder apostrof
});
test('vergeetachtigheid en geloof verlaten (uit het testen van Lucas)', () => {
  topics('my wife keeps forgetting things lately and im scared its something serious')(['HEALTH']);
  topics('mijn vader vergeet steeds dingen, ik ben bang dat het ernstig is')(['HEALTH']);
  topics('ik durf mijn ouders niet te vertellen dat ik niet meer geloof')(['RELIGION']);
  topics('im worried its something serious with my car engine')([]);
  topics('ik geloof niet meer dat dit project lukt')([]);
});
test('woordgroepen over meerdere woorden', () => {
  topics('I had a heart attack last spring')(['HEALTH']);
  topics('My sexual orientation is none of their business')(['SEXUALITY']);
  topics('heart is fine, I just had an attack of laughter')([]);
});
test('meerdere onderwerpen, in vaste volgorde', () => {
  topics('Ik ben overspannen. En mijn huisarts wil dat ik medicatie neem')(['HEALTH', 'MENTAL']);
});
test('algemene vragen zonder ik of mijn: geen melding', () => {
  topics('Wat zijn de symptomen van diabetes?')([]);
  topics('Explain the history of the Catholic church')([]);
  topics('Write an essay about depression in teenagers')([]);
});
test('werkjargon geeft geen melding', () => {
  topics('Our technical debt is getting out of hand')([]);
  topics('My button is disabled after the first click')([]);
  topics('I work in hospitality and need a schedule')([]);
  topics('I ran diagnostics on my server')([]);
  topics('Ik wil mijn automatische incasso aanpassen')([]);
  topics('Ik geloof dat mijn code klopt')([]);
  topics('Help us understand the US market')([]);
});
test('ik/mijn en het onderwerp moeten in dezelfde zin staan', () => {
  topics('Ik schrijf een artikel. Diabetes komt veel voor bij ouderen.')([]);
});
test('andere talen: een zin over jezelf geeft een melding', () => {
  const cases = [
    ['Ich habe seit letztem Jahr Diabetes', 'HEALTH'], ["J'ai une dépression depuis des mois", 'MENTAL'],
    ['Tengo cáncer y estoy muy cansado', 'HEALTH'], ['Ho la depressione da un anno', 'MENTAL'],
    ['Eu tenho muitas dívidas no banco', 'MONEY'], ['Mam depresję od roku', 'MENTAL'], ['У меня диабет и я устал', 'HEALTH'],
    ['У мене депресія вже рік', 'MENTAL'], ['Benim kanserim var ve çok yorgunum', 'HEALTH'],
    ['أنا أعاني من الاكتئاب منذ سنة', 'MENTAL'], ['אני בהריון ולא יודעת מה לעשות', 'HEALTH'], ['من افسردگی دارم', 'MENTAL'],
    ['मुझे लगता है मैं अवसाद में हूँ', 'MENTAL'], ['我得了糖尿病，该吃什么？', 'HEALTH'], ['私はうつ病と診断されました', 'MENTAL'],
    ['저는 우울증이 있어요', 'MENTAL'], ['ผมเป็นโรคซึมเศร้า', 'MENTAL'], ['Tôi bị trầm cảm', 'MENTAL'],
    ['Saya punya utang yang banyak', 'MONEY'], ['Mimi nina kisukari', 'HEALTH'], ['Jag har cancer och är trött', 'HEALTH'],
    ['Minulla on masennus', 'MENTAL'], ['Εγώ έχω κατάθλιψη', 'MENTAL'], ['আমার ক্যান্সার হয়েছে', 'HEALTH'],
    ['میں ڈپریشن کا شکار ہوں', 'MENTAL'], ['እኔ የስኳር በሽታ አለብኝ', 'HEALTH'],
  ];
  for (const [text, topic] of cases) assert.ok(sensitiveTopics(text).includes(topic), `${topic} niet gevonden in "${text}"`);
});
test('korte woorden uit een andere taal tellen niet mee', () => {
  topics('Takes 10 min to explain diabetes symptoms')([]); // "min" is Zweeds/Deens voor "mijn"
  topics('Ma il terapeuta dice che è normale')([]); // "ma" is Ests voor "ik"
  topics('Tell me about allergies please')([]);
  topics('Explícame qué es la diabetes')([]);
  topics("Mi spieghi cos'è la depressione?")([]);
  topics('Wie funktioniert eine Chemotherapie?')([]);
});
test('alle 82 talen geladen', () => assert.equal(require('../src/topics.js').LANGUAGES.length, 82));
test('snel genoeg voor tijdens het typen', () => {
  const long = 'I wrote a long report about the market and our plans for next year. '.repeat(280);
  const start = process.hrtime.bigint();
  sensitiveTopics(long);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(ms < 100, `${Math.round(ms)} ms voor ${long.length} tekens`);
});
test('lege tekst', () => {
  topics('')([]);
  topics(undefined)([]);
});

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failed) process.exit(1);
