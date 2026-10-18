// Draai met: node tests/device.test.js
// Private Chat op dit apparaat (chat/device.js): de juiste laag per browser, eerst vragen dan downloaden, een vraag in
// elke taal, en bij elke fout niets versturen. Met nagebootste browsers, zonder echt model.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../chat/device.js');

let passed = 0, failed = 0;
console.warn = () => {}; // de verwachte waarschuwingen uit device.js niet tonen
const queue = [];
const test = (name, fn) => queue.push([name, fn]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
function promptEnv({ ok = ['en', 'es', 'de', 'fr', 'ja'], state = 'available', throws = false, create } = {}) {
  const calls = [];
  const LM = {
    async availability(o) {
      if (throws) throw new Error('boom');
      const l = o.expectedInputs[0].languages[0];
      calls.push(['availability', l]);
      return ok.includes(l) ? state : 'unavailable';
    },
    create: create || (o => { calls.push(['create', o]); return Promise.resolve(session(['Hel', 'lo'])); }),
  };
  const env = { LanguageModel: LM };
  return { env, calls };
}
function session(chunks) {
  return { destroyed: false, destroy() { this.destroyed = true; }, async *promptStreaming() { for (const c of chunks) yield c; } };
}
function firefoxEnv({ version = '157.0.1', granted = false, stored, createEngine, runEngine, withTrial = true } = {}) {
  const store = stored ? { pchatFxModel: stored } : {};
  const calls = [];
  const B = {
    runtime: { getBrowserInfo: async () => ({ name: 'Firefox', version }) },
    permissions: {
      contains: async () => granted,
      request: async p => { calls.push(['request', p]); return true; },
    },
    storage: { local: {
      get: async k => ({ [k]: store[k] }),
      set: async o => Object.assign(store, o),
      remove: async k => { delete store[k]; },
    } },
  };
  if (withTrial) {
    B.trial = { ml: {
      onProgress: { addListener() {}, removeListener() {} },
      createEngine: createEngine || (async o => { calls.push(['createEngine', o]); }),
      runEngine: runEngine || (async ({ args }) => { calls.push(['runEngine', args]); return [{ generated_text: [...args[0], { role: 'assistant', content: '<think></think>Hallo [PERSON_1].' }] }]; }),
      deleteCachedModels: async () => { calls.push(['delete']); },
    } };
  }
  return { env: { browser: B }, calls, store };
}

// ---------- welke laag ----------
test('zonder AI in de browser: geen laag, en niets kan', async () => {
  const dev = K.create({ env: {} });
  assert.equal(dev.backend, 'none');
  assert.equal((await dev.detect()).state, 'unavailable');
  await assert.rejects(dev.ask('x'), e => e.device === 'failed');
});
test('geen chip meer (16 okt 2026): ?engine=chip laat de AI op dit apparaat gewoon staan', async () => {
  assert.equal(K.create({ env: promptEnv().env, force: 'chip' }).backend, 'prompt-api');
});
test('Chrome en Edge: Prompt API; Firefox: trial.ml', () => {
  assert.equal(K.create({ env: promptEnv().env, browserId: 'edge' }).backend, 'prompt-api');
  assert.equal(K.create({ force: 'device', env: firefoxEnv().env }).backend, 'firefox-ml');
});

// ---------- Prompt API (Chrome en Edge) ----------
test('Prompt API: Nederlands geweigerd, de vijf officiële talen wel', async () => {
  const { env } = promptEnv();
  const info = await K.create({ env, lang: 'nl' }).detect();
  assert.equal(info.state, 'available');
  assert.deepEqual(info.langs, ['en', 'es', 'de', 'fr', 'ja']);
});
test('Prompt API: Nederlands doet vanzelf mee zodra de browser het toestaat', async () => {
  const { env } = promptEnv({ ok: ['nl', 'en'] });
  assert.deepEqual((await K.create({ env, lang: 'nl' }).detect()).langs, ['nl', 'en']);
});
test('Edge zonder werkend model: LanguageModel bestaat, maar alles "unavailable" of een fout', async () => {
  assert.equal((await K.create({ env: promptEnv({ ok: [] }).env, browserId: 'edge' }).detect()).state, 'unavailable');
  assert.equal((await K.create({ env: promptEnv({ throws: true }).env, browserId: 'edge' }).detect()).state, 'unavailable');
});
test('Prompt API: Edge vraagt 20 GB vrije ruimte, Chrome 22', async () => {
  assert.equal((await K.create({ env: promptEnv().env, browserId: 'edge' }).detect()).download.freeGB, 20);
  assert.equal((await K.create({ env: promptEnv().env, browserId: 'chrome' }).detect()).download.freeGB, 22);
});
test('prepare() roept create() meteen aan, binnen de klik (geen await ervoor)', async () => {
  let called = false;
  const { env } = promptEnv({ create: () => { called = true; return Promise.resolve(session([])); } });
  const dev = K.create({ env });
  const p = dev.prepare();
  assert.equal(called, true);
  await p;
  assert.equal(dev.ready, true);
});
test('create() met de talen die werken en de systeemprompt', async () => {
  const { env, calls } = promptEnv({ ok: ['en', 'de'] });
  const dev = K.create({ env, system: 'SYS' });
  await dev.detect();
  await dev.prepare();
  const o = calls.find(c => c[0] === 'create')[1];
  assert.deepEqual(o.expectedInputs[0].languages, ['en', 'de']);
  assert.deepEqual(o.initialPrompts, [{ role: 'system', content: 'SYS' }]);
});
test('create() mislukt: een foutcode, en niet klaar', async () => {
  const fail = n => promptEnv({ create: () => Promise.reject(Object.assign(new Error(n), { name: n })) }).env;
  for (const n of ['NotAllowedError', 'NotSupportedError', 'NetworkError']) {
    const dev = K.create({ env: fail(n) });
    await assert.rejects(dev.prepare(), e => e.device === 'failed');
    assert.equal(dev.ready, false);
  }
  await assert.rejects(K.create({ env: fail('AbortError') }).prepare(), e => e.device === 'aborted');
});
test('downloadvoortgang: een fractie of bytes', () => {
  assert.equal(K.pct({ loaded: 0.5, total: 1 }), 50);
  assert.equal(K.pct({ loaded: 512, total: 1024 }), 50);
  assert.equal(K.pct({ loaded: 0.3 }), 30);
});
test('streamen: de stukjes achter elkaar, ook als een stuk met de vorige tekst begint', async () => {
  const seen = [];
  const { env } = promptEnv({ create: () => Promise.resolve(session(['Hel', 'lo', ' Hel', 'lo'])) });
  const out = await K.create({ env }).ask('vraag', t => seen.push(t));
  assert.equal(out, 'Hello Hello');
  assert.deepEqual(seen, ['Hel', 'Hello', 'Hello Hel', 'Hello Hello']);
});
test('een fout bij een vraag is iets anders dan "kan niet starten"', async () => {
  const failing = name => ({ destroy() {}, async *promptStreaming() { throw Object.assign(new Error(name), { name }); } });
  const code = async name => {
    const { env } = promptEnv({ create: () => Promise.resolve(failing(name)) });
    try { await K.create({ env }).ask('vraag'); } catch (e) { return e.device; }
  };
  assert.equal(await code('QuotaExceededError'), 'toolong');
  assert.equal(await code('NotSupportedError'), 'language');
  assert.equal(await code('UnknownError'), 'prompt');
  assert.equal(await code('AbortError'), 'aborted');
});
// ---------- snel en zuinig op een gewone laptop ----------
const longSession = (n, log) => ({ destroyed: false, destroy() { this.destroyed = true; log?.push('destroy'); },
  async *promptStreaming(_t, o) { for (let i = 0; i < n; i++) { if (o?.signal?.aborted) throw Object.assign(new Error('stop'), { name: 'AbortError' }); yield `Zin nummer ${i} is klaar. `; } } });
test('een lang antwoord stopt bij de grens, netjes na een hele zin, en zonder foutmelding', async () => {
  const log = [];
  const { env } = promptEnv({ create: () => Promise.resolve(longSession(500, log)) });
  const d = K.create({ env, system: 'SYS' });
  await d.detect();
  const out = await d.ask('Vertel veel', null);
  assert.ok(out.length <= K.MAX_CHARS + 2, `te lang: ${out.length}`);
  assert.ok(out.endsWith('…') && /\. …$/.test(out), 'eindigt na een hele zin met …');
  assert.equal(d.stats.cut, true);
  assert.equal(d.ready, false, 'na een afgekapt antwoord opnieuw beginnen');
  assert.deepEqual(log, ['destroy']);
});
test('loslaten geeft het geheugen terug; de volgende vraag gaat verder met het gesprek', async () => {
  const made = [];
  const { env } = promptEnv({ create: o => { made.push(o); return Promise.resolve(session(['Hoi ', '[PERSON_1].'])); } });
  const d = K.create({ env, system: 'SYS' });
  await d.detect();
  assert.equal(await d.ask('Hallo, ik ben [PERSON_1]', null), 'Hoi [PERSON_1].');
  assert.equal(d.ready, true);
  d.release();
  assert.equal(d.ready, false);
  await d.ask('En nu?', null);
  assert.equal(made.length, 2);
  assert.deepEqual(made[1].initialPrompts, [
    { role: 'system', content: 'SYS' },
    { role: 'user', content: 'Hallo, ik ben [PERSON_1]' },
    { role: 'assistant', content: 'Hoi [PERSON_1].' },
  ]);
});
test('stats: hoe lang laden, eerste woord en het hele antwoord duurden', async () => {
  const { env } = promptEnv();
  const d = K.create({ env, system: 'SYS' });
  await d.detect();
  await d.ask('Hi', null);
  for (const k of ['loadMs', 'firstMs', 'ms', 'chars']) assert.equal(typeof d.stats[k], 'number', k);
  assert.equal(d.stats.chars, 5);
  assert.equal(d.stats.cut, false);
});
test('reset vergeet ook het gesprek', async () => {
  const made = [];
  const { env } = promptEnv({ create: o => { made.push(o); return Promise.resolve(session(['ok'])); } });
  const d = K.create({ env, system: 'SYS' });
  await d.detect();
  await d.ask('een', null); d.reset(); await d.ask('twee', null);
  assert.deepEqual(made[1].initialPrompts, [{ role: 'system', content: 'SYS' }]);
});
test('een Nederlandse vraag gaat gewoon naar de AI op dit apparaat, zonder taalmelding', async () => {
  const dev = K.create({ env: promptEnv().env });
  await dev.detect();
  assert.equal(dev.supports, undefined);
  assert.equal(await dev.ask('Mijn vriendin is al weken somber, wat kan ik doen?'), 'Hello');
});

// ---------- Firefox (trial.ml) ----------
test('Firefox staat uit zolang zijn AI te traag is: dan de tijdelijke chat, met de reden', async () => {
  if (K.FX_ENABLED) return;
  const dev = K.create({ env: firefoxEnv().env });
  assert.equal(dev.backend, 'none');
  assert.equal((await dev.detect()).why, 'slow');
});
test('Firefox ouder dan 140: niet beschikbaar', async () => {
  assert.equal((await K.create({ force: 'device', env: firefoxEnv({ version: '139.0' }).env }).detect()).state, 'unavailable');
});
test('Firefox: zonder toestemming eerst aanbieden; met toestemming en model klaar', async () => {
  assert.equal((await K.create({ force: 'device', env: firefoxEnv().env }).detect()).state, 'downloadable');
  const id = K.FX_MODELS[K.FX_DEFAULT].modelId;
  assert.equal((await K.create({ force: 'device', env: firefoxEnv({ granted: true, stored: id }).env }).detect()).state, 'available');
  assert.equal((await K.create({ force: 'device', env: firefoxEnv({ granted: true, stored: 'iets/anders' }).env }).detect()).state, 'downloadable');
});
test('Firefox vraagt alleen trialML, los van andere toestemmingen', async () => {
  const { env, calls } = firefoxEnv();
  await K.create({ force: 'device', env }).requestPermission();
  assert.deepEqual(calls.find(c => c[0] === 'request')[1], { permissions: ['trialML'] });
});
test('Firefox: Qwen3 van onnx-community, en het model wordt onthouden', async () => {
  const { env, calls, store } = firefoxEnv();
  const dev = K.create({ force: 'device', env });
  await dev.prepare();
  const o = calls.find(c => c[0] === 'createEngine')[1];
  assert.match(o.modelId, /^onnx-community\/Qwen3-/);
  assert.equal(o.taskName, 'text-generation');
  assert.equal(store.pchatFxModel, o.modelId);
  assert.equal(dev.ready, true);
});
test('Firefox: foutmeldingen worden foutcodes', async () => {
  const fx = msg => firefoxEnv({ createEngine: async () => { throw new Error(msg); } }).env;
  await K.create({ force: 'device', env: fx('Engine already created') }).prepare(); // na herladen: geen fout
  await assert.rejects(K.create({ force: 'device', env: fx('Trial ML API is disabled. Check browser.ml.enable') }).prepare(), e => e.device === 'blocked');
  await assert.rejects(K.create({ force: 'device', env: fx('Exceeding cache size limit of 4GiB') }).prepare(), e => e.device === 'space');
  await assert.rejects(K.create({ force: 'device', env: firefoxEnv({ withTrial: false }).env }).prepare(), e => e.device === 'reload');
});
test('Firefox: annuleren stopt meteen met wachten en ruimt op zodra Firefox klaar is', async () => {
  const ac = new AbortController();
  let finish;
  const { env, calls, store } = firefoxEnv({ createEngine: () => new Promise(r => { finish = r; }) });
  const p = K.create({ force: 'device', env }).prepare({ signal: ac.signal });
  await sleep(1);
  ac.abort();
  await assert.rejects(p, e => e.device === 'aborted'); // zonder op de download te wachten
  assert.ok(!calls.some(c => c[0] === 'delete'));
  finish();
  await sleep(1);
  assert.ok(calls.some(c => c[0] === 'delete'));
  assert.equal(store.pchatFxModel, undefined);
});
test('Firefox: al afgebroken voor de start, dan begint er niets', async () => {
  const ac = new AbortController(); ac.abort();
  const { env, calls } = firefoxEnv();
  await assert.rejects(K.create({ force: 'device', env }).prepare({ signal: ac.signal }), e => e.device === 'aborted');
  assert.ok(!calls.some(c => c[0] === 'createEngine'));
});
test('Firefox: toestemming al gegeven maar geen klik (na herladen) telt als ja', async () => {
  const { env } = firefoxEnv({ granted: true });
  env.browser.permissions.request = () => { throw new Error('permissions.request may only be called from a user input handler'); };
  assert.equal(await K.create({ force: 'device', env }).requestPermission(), true);
});
test('Firefox: echte foutteksten van Firefox worden de juiste codes', async () => {
  assert.equal(K.codeOf(new Error('Trial ML is only available in Nightly')), 'blocked');
  assert.equal(K.codeOf(new Error('Not enough physical memory available')), 'memory');
});
test('Firefox: antwoord zonder <think>, systeemprompt met /no_think, hooguit 6 eerdere berichten', async () => {
  const { env, calls } = firefoxEnv();
  const dev = K.create({ force: 'device', env, system: 'SYS' });
  for (let i = 0; i < 5; i++) assert.equal(await dev.ask(`vraag ${i}`), 'Hallo [PERSON_1].');
  const last = calls.filter(c => c[0] === 'runEngine').at(-1)[1][0];
  assert.equal(last[0].content, 'SYS /no_think');
  assert.equal(last.length, 1 + 6 + 1);
});
test('Firefox: onverwacht antwoord geeft een fout, niet iets halfs', async () => {
  for (const res of ['tekst', [], [{ generated_text: 'tekst' }], [{ generated_text: [{ role: 'user', content: 'x' }] }]]) {
    const dev = K.create({ force: 'device', env: firefoxEnv({ runEngine: async () => res }).env });
    await assert.rejects(dev.ask('vraag'), e => e.device === 'failed');
  }
});

// ---------- regels ----------
test('veto: een antwoord in de verkeerde taal stopt meteen, telt niet mee, en de AI begint opnieuw', async () => {
  let made = 0;
  const { env } = promptEnv({ create: () => { made++; return Promise.resolve(session(['Okay, ', "let's ", 'solve ', 'this.'])); } });
  const d = K.create({ env, lang: 'nl', system: 's' });
  await d.detect();
  const seen = [];
  const r = await d.ask('Los op', t => seen.push(t), null, { veto: t => t.length > 8 });
  assert.equal(r, null);
  assert.ok(d.stats.vetoed);
  assert.ok(seen.every(t => t.length <= 8), 'wat na het veto komt, wordt niet getoond');
  assert.equal(d.ready, false, 'de sessie is losgelaten');
  const again = await d.ask('Los op', null, null, {});
  assert.equal(again, "Okay, let's solve this.");
  assert.equal(made, 2);
});
test('rust-timer: een lang antwoord op een nieuwe sessie wordt niet halverwege afgebroken', async () => {
  const real = { set: globalThis.setTimeout, clear: globalThis.clearTimeout };
  const timers = new Set();
  globalThis.setTimeout = (fn, ms) => { const t = { fn, ms, unref() {} }; if (ms === K.IDLE_MS) timers.add(t); else return real.set(fn, ms); return t; };
  globalThis.clearTimeout = t => { if (!timers.delete(t)) real.clear(t); };
  try {
    let destroyed = false, pendingIdle = null;
    const s = { destroy() { destroyed = true; },
      async *promptStreaming() { for (const w of ['een ', 'lang ', 'antwoord']) { pendingIdle ??= timers.size; if (destroyed) throw new DOMException('weg', 'AbortError'); yield w; } } };
    const { env } = promptEnv({ create: () => Promise.resolve(s) });
    const d = K.create({ env, system: 's' });
    await d.detect();
    assert.equal(await d.ask('Schrijf een lange brief', null, null, {}), 'een lang antwoord');
    assert.equal(pendingIdle, 0, 'geen rust-timer terwijl het antwoord nog loopt');
  } finally { Object.assign(globalThis, { setTimeout: real.set, clearTimeout: real.clear }); }
});
test('undo: de laatste vraag en het antwoord terugnemen voor een tweede poging', async () => {
  const turns = [];
  const { env } = promptEnv({ create: o => { turns.push(o.initialPrompts.length); return Promise.resolve(session(['Hoi'])); } });
  const d = K.create({ env, lang: 'nl', system: 's' });
  await d.detect();
  await d.ask('een', null, null, {});
  d.undo();
  await d.ask('twee', null, null, {});
  assert.deepEqual(turns, [1, 1], 'de tweede sessie begint zonder de teruggenomen beurt');
  assert.doesNotThrow(() => K.create({ env: {} }).undo());
});
test('device.js doet zelf geen netwerkverzoeken', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'chat', 'device.js'), 'utf8');
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts|\beval\(|new Function/);
});
test('strings: alle nieuwe teksten in het Engels en Nederlands; Firefox wordt herkend', () => {
  const vm = require('node:vm');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'strings.js'), 'utf8');
  const load = root => { const ctx = { ...root }; ctx.globalThis = ctx; vm.runInNewContext(src, ctx); return ctx.PrivacyI18n; };
  const I = load({ navigator: { userAgent: 'Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/157.0', language: 'en' } });
  assert.equal(I.BROWSER.id, 'firefox');
  assert.equal(load({ navigator: { userAgent: 'Mozilla/5.0 Chrome/155.0 Safari/537.36 Edg/155.0', language: 'en' } }).BROWSER.id, 'edge');
  const keys = Object.keys(I.STRINGS.en).filter(k => k.startsWith('pchat'));
  for (const k of keys) assert.ok(I.STRINGS.nl[k], `nl mist ${k}`);
  assert.doesNotMatch(I.STRINGS.en.pchatDeviceInfo, /Gemini/);
  assert.match(I.STRINGS.en.pchatDeviceInfo, /\{browser\}/);
});

// Geen chip (besluit Lucas, 16 okt 2026): Melo draait alleen op dit apparaat. Geen Tinfoil-bundel, geen relay, geen
// verzegelde-chip-route en geen tekst die nog over een chip praat. ("graphics chip" in de hardware-eisen is iets anders.)
test('geen chip-route: geen Tinfoil, geen relay, Melo zegt nergens dat hij op een chip draait', () => {
  const root = path.join(__dirname, '..');
  for (const f of ['vendor/tinfoil.js', 'relay']) assert.ok(!fs.existsSync(path.join(root, f)), `${f} hoort weg te zijn`);
  const code = ['chat/chat.js', 'chat/chat.html', 'chat/device.js', 'src/config.js', 'src/strings.js']
    .map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
  for (const [f, text] of code) {
    assert.doesNotMatch(text, /tinfoil|SecureClient|privateChatPlus|privateChatRelay|engine === 'chip'|FACTS_CHIP|enclave/i, f);
    assert.doesNotMatch(text, /\b(sealed|secure|encrypted|versleutelde|beveiligde|afgesloten|versiegelte[nm]?|sicheren|sellado|cifrado) (chip|puce)|puce chiffrée/i, f);
  }
  const ctx = { navigator: { userAgent: 'Mozilla/5.0 Chrome/155.0 Safari/537.36', language: 'en' } }; ctx.globalThis = ctx;
  require('node:vm').runInNewContext(code.find(([f]) => f === 'src/strings.js')[1], ctx);
  const I = ctx.PrivacyI18n;
  for (const lang of Object.keys(I.STRINGS)) {
    for (const [k, v] of Object.entries(I.STRINGS[lang])) {
      if (k.startsWith('pchat') && !/^pchatNeeds/.test(k)) assert.doesNotMatch(String(v), /\bchip|\bpuce|grafikchip/i, `${lang}.${k}`);
    }
  }
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.stack || e.message}`); }
  }
  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  if (failed) process.exit(1);
})();
