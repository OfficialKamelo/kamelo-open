// Draai met: node tests/topic-ai.test.js
// Gevoelige onderwerpen, tweede kans (src/topic-ai.js): wanneer Kamelo de AI van Chrome op dit apparaat iets vraagt, en
// dat hij nooit een download start. Met een nagebootste LanguageModel en een eigen klok, zonder echt model.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../src/topic-ai.js');
const { sensitiveTopics } = require('../src/topics.js');

let passed = 0, failed = 0;
const queue = [];
const test = (name, fn) => queue.push([name, fn]);

// Een klok met timers die we zelf vooruitzetten.
function clock() {
  let t = 1_000_000, id = 0;
  const timers = new Map();
  const c = {
    now: () => t,
    setTimer: (f, ms) => { timers.set(++id, { at: t + ms, f }); return id; },
    clearTimer: i => { timers.delete(i); },
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const next = [...timers].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        t = next[1].at;
        next[1].f();
        await flush();
      }
      t = end;
      await flush();
    },
  };
  return c;
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

// Een LanguageModel zoals Chrome hem geeft, met een vast antwoord.
function fakeLM({ state = 'available', answer = '{"personal":true,"topic":"MENTAL"}', clone = true, rejectSampling = false, throws = null } = {}) {
  const calls = { availability: [], create: [], prompt: [], destroyed: 0 };
  const session = () => ({
    async prompt(text, o) { calls.prompt.push({ text, o }); if (throws) throw throws; return typeof answer === 'function' ? answer(text) : answer; },
    ...(clone ? { async clone() { calls.clones = (calls.clones || 0) + 1; return session(); } } : {}),
    destroy() { calls.destroyed++; },
  });
  const LM = {
    async availability(o) { calls.availability.push(o); return state; },
    async create(o) {
      calls.create.push(o);
      if (rejectSampling && 'topK' in o) throw new TypeError('topK not supported');
      return session();
    },
  };
  return { LM, calls };
}

const PERSONAL = 'Lately everything feels pointless and I cannot get out of bed in the morning';

// ---------- hulpjes ----------
test('snippet: de laatste alinea\'s, hooguit 600 tekens; lange tekst vanaf een heel woord', () => {
  assert.equal(A.snippet('Hallo.\n\nMijn vraag is dit.'), 'Hallo.\nMijn vraag is dit.');
  const long = `${'intro '.repeat(200)}\n\n${'word '.repeat(300)}end`;
  const s = A.snippet(long);
  assert.ok(s.length <= A.MAX_CHARS && s.endsWith('end') && s.startsWith('word'), s.slice(0, 20));
  assert.ok(!s.includes('intro'));
  assert.equal(A.snippet(''), '');
});
test('genoeg woorden: minstens 4, of 8 tekens in talen zonder spaties', () => {
  assert.equal(A.enough('help me please'), false);
  assert.equal(A.enough('my dad is ill'), true);
  assert.equal(A.enough('我最近总是睡不着觉怎么办'), true);
});
test('antwoord: alleen personal=true met een van de zes onderwerpen telt', () => {
  assert.equal(A.parse('{"personal":true,"topic":"MONEY"}'), 'MONEY');
  assert.equal(A.parse('{"personal":false,"topic":"MONEY"}'), null);
  assert.equal(A.parse('{"personal":true,"topic":"NONE"}'), null);
  assert.equal(A.parse('{"personal":true,"topic":"SELF_HARM"}'), null);
  assert.equal(A.parse('niet eens json'), null);
  assert.equal(A.parse('```json\n{"personal":true,"topic":"LEGAL"}\n```'), 'LEGAL');
});
test('de vraag aan de AI: kort, Engels, JSON-schema met de zes onderwerpen en NONE', () => {
  assert.ok(A.SYSTEM.length < 1500);
  assert.match(A.SYSTEM, /any language/);
  assert.deepEqual(A.SCHEMA.properties.topic.enum, [...A.TOPICS, 'NONE']);
  assert.deepEqual(A.TOPICS, ['HEALTH', 'MENTAL', 'SEXUALITY', 'RELIGION', 'MONEY', 'LEGAL']);
});
test('de voorbeeldzin vindt de woordenlijst niet (daar is de tweede kans voor)', () => {
  assert.deepEqual(sensitiveTopics(PERSONAL), []);
});

// ---------- achtergrond: model() ----------
test('zonder Prompt API (Edge, Firefox, oude Chrome): geen fout, geen onderwerp', async () => {
  const m = A.model({ env: {} });
  assert.deepEqual(await m.ask(PERSONAL, 1), { topic: null, why: 'absent' });
  const m2 = A.model({ env: { LanguageModel: {} } });
  assert.equal((await m2.ask(PERSONAL, 1)).topic, null);
});
for (const state of ['unavailable', 'downloadable', 'downloading']) {
  test(`model ${state}: nooit create(), dus nooit een download`, async () => {
    const { LM, calls } = fakeLM({ state });
    const c = clock();
    const m = A.model({ env: { LanguageModel: LM }, ...c });
    assert.deepEqual(await m.ask(PERSONAL, 1), { topic: null, why: state });
    // Eerst met en/de/fr/es, dan nog één keer met alleen Engels (misschien kent deze Chrome de talen niet).
    assert.deepEqual(calls.availability, [A.LM_OPTS, A.LM_OPTS_EN]);
    assert.equal(calls.create.length, 0);
    assert.equal(calls.prompt.length, 0);
  });
}
test('tweede kans in en, de, fr en es; kent deze Chrome die talen niet, dan alleen Engels', async () => {
  assert.deepEqual(A.LM_OPTS.expectedInputs[0].languages, ['en', 'de', 'fr', 'es']);
  assert.deepEqual(A.LM_OPTS.expectedOutputs[0].languages, ['en']);
  const { LM, calls } = fakeLM();
  await A.model({ env: { LanguageModel: LM }, ...clock() }).ask(PERSONAL, 1);
  assert.deepEqual(calls.availability, [A.LM_OPTS]);
  assert.deepEqual(calls.create[0].expectedInputs, A.LM_OPTS.expectedInputs);

  const only = fakeLM();
  only.LM.availability = async o => { only.calls.availability.push(o); return o.expectedInputs[0].languages.length > 1 ? 'unavailable' : 'available'; };
  assert.deepEqual(await A.model({ env: { LanguageModel: only.LM }, ...clock() }).ask(PERSONAL, 1), { topic: 'MENTAL' });
  assert.deepEqual(only.calls.availability, [A.LM_OPTS, A.LM_OPTS_EN]);
  assert.deepEqual(only.calls.create[0].expectedInputs, A.LM_OPTS_EN.expectedInputs);
});
test('availability() gooit een fout: telt als niet beschikbaar, geen create()', async () => {
  const LM = { availability: async () => { throw new Error('boom'); }, create: async () => { throw new Error('mag niet'); } };
  assert.equal((await A.model({ env: { LanguageModel: LM }, ...clock() }).ask(PERSONAL, 1)).topic, null);
});
test('model available: één basissessie met systeemprompt, topK 1 en schema; per vraag een kloon', async () => {
  const { LM, calls } = fakeLM();
  const c = clock();
  const m = A.model({ env: { LanguageModel: LM }, ...c });
  assert.deepEqual(await m.ask(PERSONAL, 1), { topic: 'MENTAL' });
  assert.equal(calls.create.length, 1);
  const o = calls.create[0];
  assert.equal(o.initialPrompts[0].role, 'system');
  assert.equal(o.topK, 1);
  assert.deepEqual(o.expectedInputs, calls.availability[0].expectedInputs, 'dezelfde opties als availability()');
  assert.deepEqual(calls.prompt[0].o.responseConstraint, A.SCHEMA);
  assert.equal(calls.prompt[0].text, PERSONAL);
  assert.equal(calls.clones, 1);
  assert.equal(calls.destroyed, 1, 'de kloon is opgeruimd');
  await c.advance(A.GAP_MS);
  await m.ask('My wife found out I lost our savings at the casino', 1);
  assert.equal(calls.create.length, 1, 'de basissessie wordt hergebruikt');
  assert.ok(m.ready);
  await c.advance(A.IDLE_MS);
  assert.equal(m.ready, false, 'na een minuut niets: losgelaten');
});
test('kent deze Chrome topK/temperature niet: zonder opnieuw', async () => {
  const { LM, calls } = fakeLM({ rejectSampling: true });
  assert.equal((await A.model({ env: { LanguageModel: LM }, ...clock() }).ask(PERSONAL, 1)).topic, 'MENTAL');
  assert.equal(calls.create.length, 2);
  assert.ok(!('topK' in calls.create[1]));
});
test('zonder clone(): per vraag een nieuwe sessie (geen gesprek dat groeit)', async () => {
  const { LM, calls } = fakeLM({ clone: false });
  const c = clock();
  const m = A.model({ env: { LanguageModel: LM }, ...c });
  await m.ask(PERSONAL, 1);
  assert.equal(calls.create.length, 2);
  assert.equal(calls.destroyed, 1);
});
test('per tabblad hooguit één vraag per 3 s; een ander tabblad mag wel', async () => {
  const { LM, calls } = fakeLM();
  const c = clock();
  const m = A.model({ env: { LanguageModel: LM }, ...c });
  await m.ask(PERSONAL, 1);
  assert.deepEqual(await m.ask(`${PERSONAL} again`, 1), { topic: null, skipped: 'rate' });
  assert.equal((await m.ask(PERSONAL, 2)).topic, 'MENTAL');
  await c.advance(A.GAP_MS);
  assert.equal((await m.ask(PERSONAL, 1)).topic, 'MENTAL');
  assert.equal(calls.prompt.length, 3);
});
test('één vraag tegelijk: een tweede tijdens de eerste wordt overgeslagen', async () => {
  let release;
  const { LM } = fakeLM({ answer: () => new Promise(r => { release = () => r('{"personal":true,"topic":"MONEY"}'); }) });
  const m = A.model({ env: { LanguageModel: LM }, ...clock() });
  const first = m.ask(PERSONAL, 1);
  await flush();
  assert.deepEqual(await m.ask(PERSONAL, 2), { topic: null, skipped: 'busy' });
  release();
  assert.equal((await first).topic, 'MONEY');
});
test('te korte tekst: geen vraag', async () => {
  const { LM, calls } = fakeLM();
  assert.equal((await A.model({ env: { LanguageModel: LM }, ...clock() }).ask('hi there', 1)).topic, null);
  assert.equal(calls.availability.length, 0);
});
test('een fout bij het vragen: geen onderwerp, sessie opgeruimd', async () => {
  const { LM, calls } = fakeLM({ throws: new DOMException('timeout', 'TimeoutError') });
  const m = A.model({ env: { LanguageModel: LM }, ...clock() });
  assert.deepEqual(await m.ask(PERSONAL, 1), { topic: null, why: 'error' });
  assert.equal(m.ready, false);
  assert.ok(calls.destroyed >= 2);
});
test('lange tekst: de AI ziet hooguit 600 tekens', async () => {
  const { LM, calls } = fakeLM();
  await A.model({ env: { LanguageModel: LM }, ...clock() }).ask(`${'blah '.repeat(500)}${PERSONAL}`, 1);
  assert.ok(calls.prompt[0].text.length <= A.MAX_CHARS && calls.prompt[0].text.endsWith('morning'));
});

// ---------- content script: gate() ----------
function setup({ reply = { topic: 'MENTAL' }, text = PERSONAL } = {}) {
  const c = clock();
  const asked = [], shown = [];
  let current = text;
  const ask = async s => { asked.push(s); return typeof reply === 'function' ? reply(s) : reply; };
  const g = A.gate({ ask, ...c });
  const schedule = (waited = 900) => g.schedule({ read: () => current, onTopic: t => shown.push(t), waited });
  return { c, g, asked, shown, schedule, set: t => { current = t; } };
}
test('pas na een pauze van 1,2 s (samen met de wachttijd van de woordenlijst)', async () => {
  const { c, asked, shown, schedule } = setup();
  schedule(900);
  await c.advance(299);
  assert.equal(asked.length, 0);
  await c.advance(1);
  assert.equal(asked.length, 1);
  assert.deepEqual(shown, ['MENTAL']);
});
test('verder typen annuleert de vraag', async () => {
  const { c, g, asked, schedule } = setup();
  schedule();
  await c.advance(100);
  g.cancel();
  await c.advance(5000);
  assert.equal(asked.length, 0);
});
test('de woordenlijst zag een NOT-woord (verhaal, huiswerk, patiënt): geen vraag aan de AI', async () => {
  for (const text of ['my main character is gay and comes out in chapter 3, does the dialogue sound natural',
    'mon personnage principal est gay et fait son coming out au chapitre 3',
    'soy enfermera y un paciente me pregunta cómo funciona la quimio']) {
    const { c, asked, schedule } = setup({ text });
    schedule();
    await c.advance(2000);
    assert.equal(asked.length, 0, text);
  }
  const { c, asked, schedule } = setup();
  schedule();
  await c.advance(2000);
  assert.equal(asked.length, 1, 'zonder NOT-woord wel');
});
test('minder dan 4 woorden: geen vraag', async () => {
  const { c, asked, schedule } = setup({ text: 'my back hurts' });
  schedule();
  await c.advance(2000);
  assert.equal(asked.length, 0);
});
test('dezelfde tekst wordt maar één keer gevraagd (ook als het antwoord nee was)', async () => {
  const { c, asked, shown, schedule } = setup({ reply: { topic: null } });
  schedule(); await c.advance(400);
  await c.advance(A.GAP_MS);
  schedule(); await c.advance(400);
  assert.equal(asked.length, 1);
  assert.deepEqual(shown, []);
});
test('een eerder ja uit de cache geeft meteen weer de melding (die zelf maar één keer per onderwerp komt)', async () => {
  const { c, asked, shown, schedule } = setup();
  schedule(); await c.advance(400);
  schedule(); await c.advance(400);
  assert.equal(asked.length, 1);
  assert.deepEqual(shown, ['MENTAL', 'MENTAL']);
});
test('hooguit één vraag per 3 s: een nieuwe tekst wacht tot het weer mag', async () => {
  const { c, asked, schedule, set } = setup();
  schedule(); await c.advance(300);
  set('My wife found out I lost our savings at the casino');
  schedule(); await c.advance(300);
  assert.equal(asked.length, 1, 'te snel na de vorige');
  await c.advance(A.GAP_MS);
  assert.equal(asked.length, 2);
});
test('tekst veranderd terwijl de AI nadacht: het oude antwoord telt niet', async () => {
  let answer;
  const { c, asked, shown, schedule, set } = setup({ reply: () => new Promise(r => { answer = r; }) });
  schedule(); await c.advance(300);
  assert.equal(asked.length, 1);
  set(`${PERSONAL}, but`);
  answer({ topic: 'MENTAL' });
  await flush();
  assert.deepEqual(shown, []);
});
test('nieuwe toetsaanslag (cancel) terwijl de AI nadacht: het antwoord telt niet', async () => {
  let answer;
  const { c, g, shown, schedule } = setup({ reply: () => new Promise(r => { answer = r; }) });
  schedule(); await c.advance(300);
  g.cancel();
  answer({ topic: 'MENTAL' });
  await flush();
  assert.deepEqual(shown, []);
});
test('overgeslagen of geen verbinding: niet onthouden, volgende keer opnieuw', async () => {
  let n = 0;
  const { c, asked, shown, schedule } = setup({ reply: () => (n++ ? { topic: 'HEALTH' } : { topic: null, skipped: 'busy' }) });
  schedule(); await c.advance(300);
  await c.advance(A.GAP_MS);
  schedule(); await c.advance(300);
  assert.equal(asked.length, 2);
  assert.deepEqual(shown, ['HEALTH']);
  const g2 = setup({ reply: () => { throw new Error('Extension context invalidated'); } });
  g2.schedule(); await g2.c.advance(300);
  assert.deepEqual(g2.shown, []);
});
test('de cache bewaart geen tekst, alleen een hash', () => {
  assert.match(A.hash(PERSONAL), /^[0-9a-z]+\.\d+$/);
  assert.notEqual(A.hash('a'), A.hash('b'));
});

// ---------- bron ----------
test('topic-ai.js doet geen netwerkverzoeken, bewaart niets en logt niets', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/topic-ai.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts|\beval\(|new Function|storage|console\./);
});
test('content.js vraagt de AI alleen in de gratis editie, in Chrome, en alleen als de woordenlijst niets vond', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/content.js'), 'utf8');
  assert.match(src, /KameloEdition === 'public' && I\.BROWSER\.id === 'chrome'/);
  assert.match(src, /!checkTopics\(text, ed\)\) askDevice\(ed\)/);
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
  }
  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  if (failed) process.exit(1);
})();
