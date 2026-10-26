// Kamelo Private Chat: antwoorden op dit apparaat, met de AI van de browser zelf. De vraag verlaat het apparaat niet.
// Eén laag voor drie browsers:
// - Chrome en Edge: de Prompt API (LanguageModel). Chrome draait Gemini Nano, Edge Phi-4-mini. Of het op deze computer
//   kan, zegt alleen availability(); dat LanguageModel bestaat, zegt niets (Edge toont hem soms zonder model).
// - Firefox 140+: browser.trial.ml met een klein open model (Qwen3) dat Firefox zelf één keer downloadt van Hugging Face.
//   Vraagt de optionele toestemming 'trialML', alleen na een klik.
// Dit bestand doet zelf geen netwerkverzoeken; de browser haalt het model op. Faalt er iets, dan wordt er niets verstuurd.
(() => {
  'use strict';

  // Uit (11 okt 2026): op een MacBook Air M2 met 8 GB duurde één kort antwoord 3 minuten en werd de laptop traag;
  // het model van 1,7 GB startte niet. Firefox krijgt daarom de tijdelijke chat, tot Firefox' eigen AI sneller is.
  // Aanzetten (true) zet ook de optionele toestemming 'trialML' in het Firefox-pakket (tools/pack.mjs).
  const FX_ENABLED = false;
  const FX_MIN = 140; // daarvoor staat extensions.ml.enabled uit
  const FX_MODELS = {
    'qwen3-0.6b': { modelId: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q8', device: 'wasm', gb: 0.62 },
    'qwen3-0.6b-gpu': { modelId: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q4f16', device: 'gpu', gb: 0.57 },
    'qwen3-1.7b': { modelId: 'onnx-community/Qwen3-1.7B-ONNX', dtype: 'q8', device: 'wasm', gb: 1.74 },
    'qwen3-1.7b-gpu': { modelId: 'onnx-community/Qwen3-1.7B-ONNX', dtype: 'q4f16', device: 'gpu', gb: 1.43 },
  };
  const FX_DEFAULT = 'qwen3-1.7b';
  const FX_MAX_TOKENS = 400, HISTORY_KEEP = 6;
  // Chrome en Edge: een antwoord stopt na zoveel tekens (de Prompt API kent geen maximum aantal tokens). Kort = snel op
  // een gewone laptop. En na zoveel tijd zonder vraag laten we de AI los, zodat de computer zijn geheugen terugkrijgt;
  // de volgende vraag maakt hem opnieuw aan, met het gesprek tot nu toe.
  // 2400 tekens (22 okt, was 1200): een antwoord in de stijl van June (kopjes, tips, huisartsblok, slotvraag) is 150–300 woorden.
  const MAX_CHARS = 2400, IDLE_MS = 2 * 60 * 1000;
  // Een grafiek (```chart … ```) die nog open staat, mag afmaken: een halve grafiek is niets waard.
  const openFence = t => (t.match(/^\s*```/gm) || []).length % 2 === 1;
  const roomFor = (t, max) => (openFence(t) ? max + 800 : max);
  // Afgekapt: tot de laatste hele zin, of tot het eind van de laatste hele grafiek.
  function shorten(out, max) {
    if (!openFence(out) && /```\s*$/.test(out.trimEnd())) return out;
    out = out.slice(0, roomFor(out, max));
    if (openFence(out)) out = out.slice(0, out.lastIndexOf('```')).trimEnd();
    const end = Math.max(out.lastIndexOf('. '), out.lastIndexOf('.\n'), out.lastIndexOf('! '), out.lastIndexOf('? ')) + 1;
    const fence = out.lastIndexOf('```\n') + 3;
    const at = Math.max(end, fence);
    return (at > out.length * .5 ? out.slice(0, at) : out) + ' …';
  }
  // Talen die de Prompt API officieel kent. De taal van de interface proberen we eerst, zodat Nederlands vanzelf
  // meedoet zodra Chrome of Edge het toestaat. De vraag zelf mag in elke taal: in de praktijk antwoordt de AI ook
  // goed in het Nederlands (11 okt 2026), dus geen melding meer over de taal.
  const PROMPT_LANGS = ['en', 'es', 'de', 'fr', 'ja'];

  const lmOpts = langs => ({
    expectedInputs: [{ type: 'text', languages: langs }],
    expectedOutputs: [{ type: 'text', languages: langs }],
  });
  // downloadprogress: volgens de spec is total 1 en loaded een fractie; oudere versies geven bytes.
  const pct = e => Math.max(0, Math.min(100, Math.round(100 * (e.loaded || 0) / (e.total || 1))));
  // Foutcodes. Bij het klaarzetten: kan deze AI hier niet starten? Bij een vraag: alleen deze vraag lukt niet.
  function codeOf(e, asking = false) {
    const m = String(e?.message || ''), n = e?.name || '';
    if (n === 'AbortError') return 'aborted';
    if (/Trial ML (API is disabled|is only available)/.test(m)) return 'blocked';
    if (/Exceeding cache size limit/.test(m)) return 'space';
    if (/NotEnoughMemory|Not enough physical memory|out of memory/i.test(n + m)) return 'memory';
    if (asking && n === 'QuotaExceededError') return 'toolong';
    if (asking && n === 'NotSupportedError') return 'language';
    return asking ? 'prompt' : 'failed';
  }
  const tag = (e, code) => Object.assign(e instanceof Error ? e : new Error(String(e)), { device: code });
  const aborted = () => tag(new DOMException('cancelled', 'AbortError'), 'aborted');
  const base = code => String(code || '').toLowerCase().split(/[-_]/)[0];

  function none(browserId, why = 'none') {
    const fail = () => Promise.reject(tag(new Error('no on-device AI'), 'failed'));
    return {
      backend: 'none', ready: false,
      detect: async () => ({ state: 'unavailable', why, browser: browserId, langs: [], backend: 'none', download: {} }),
      prepare: fail, ask: fail, askImage: fail, canSee: async () => false, requestPermission: async () => false, remove: async () => {}, reset() {}, undo() {}, useTurns() {},
    };
  }

  function promptApi({ env, LM, lang, system, browserId, onProgress, sampling }) {
    let langs = ['en'], session = null, idle = null, pending = null;
    let turns = []; // het gesprek, om na het loslaten verder te kunnen (per gesprek, zie useTurns)
    const release = () => { clearTimeout(idle); idle = null; session?.destroy?.(); session = null; };
    const later = () => { clearTimeout(idle); idle = setTimeout(release, IDLE_MS); idle?.unref?.(); }; // unref: houdt Node (tests) niet open
    const download = { freeGB: browserId === 'edge' ? 20 : 22 };
    const info = (state, l) => ({ state, why: state === 'unavailable' ? 'device' : '', browser: browserId, langs: l, backend: 'prompt-api', download });
    return {
      backend: 'prompt-api',
      get ready() { return !!session; },
      async detect() {
        const ok = [];
        let state = 'unavailable';
        // Alle talen tegelijk vragen: na elkaar kost dat bij het openen merkbaar tijd.
        const all = [...new Set([lang, ...PROMPT_LANGS])];
        const found = await Promise.all(all.map(l => Promise.resolve().then(() => LM.availability(lmOpts([l])))
          .catch(e => { console.warn('Kamelo device: availability', browserId, l, e); return null; })));
        all.forEach((l, i) => {
          const s = found[i];
          if (s && s !== 'unavailable') { ok.push(l); if (state === 'unavailable' || s === 'available') state = s; }
        });
        // (14 okt) Alleen talen die al klaarstaan. Een taal die nog 'downloadable' is laat create() wachten
        // op een download die op een webpagina niet start: dan bleef "Bijna klaar" staan.
        const ready = all.filter((l, i) => found[i] === 'available');
        if (ok.length) langs = state === 'available' && ready.length ? ready : ok;
        return info(state, ok);
      },
      // Niet async: create() moet binnen de klik worden aangeroepen, anders weigert de browser de download.
      prepare({ onProgress: p = onProgress, signal, langs: only } = {}) {
        if (session) return Promise.resolve();
        if (pending) return pending; // al bezig (opwarmen bij het openen): daarop wachten, niet nog een keer aanmaken
        if (only) langs = only;
        // Afgebroken: meteen vrijgeven, ook als Chrome de create() niet afsluit; anders wacht een nieuwe poging op de oude
        signal?.addEventListener('abort', () => { pending = null; }, { once: true });
        let made;
        try {
          made = LM.create({
            ...lmOpts(langs), ...(sampling || {}), signal,
            initialPrompts: [{ role: 'system', content: system }, ...turns.slice(-HISTORY_KEEP)],
            monitor: m => m.addEventListener('downloadprogress', e => p?.(pct(e))),
          });
        } catch (e) { return Promise.reject(tag(e, codeOf(e))); }
        const mine = Promise.resolve(made).then(s => {
          if (signal?.aborted) { s?.destroy?.(); throw tag(new DOMException('aborted', 'AbortError'), 'aborted'); }
          session = s; later();
        }, e => { throw tag(e, codeOf(e)); })
          .finally(() => { if (pending === mine) pending = null; });
        pending = mine;
        return mine;
      },
      // Geeft het antwoord terug; in stats staat hoe snel het ging (voor "te traag op deze computer").
      stats: null,
      // hint: alleen voor de AI (bv. "Reply in Dutch."), niet in het gesprek bewaard. max: langer voor een document.
      // veto(tekst): onderweg nakijken (bv. verkeerde taal). Zegt hij ja, dan stopt het antwoord, telt het niet mee in het
      // gesprek en geeft ask() null terug: dan kan chat.js het opnieuw vragen.
      async ask(text, onChunk, signal, { hint, max = MAX_CHARS, veto = null } = {}) {
        clearTimeout(idle);
        const t0 = Date.now();
        await this.prepare({ signal });
        // prepare() zet de rust-timer (later()) bij een nieuwe sessie: niet tijdens het antwoord de sessie weggooien.
        clearTimeout(idle);
        const t1 = Date.now();
        const stop = new AbortController();
        const both = signal && AbortSignal.any ? AbortSignal.any([signal, stop.signal]) : stop.signal;
        signal?.addEventListener?.('abort', () => stop.abort(), { once: true });
        let out = '', first = 0, cut = false, vetoed = false;
        try {
          for await (const c of session.promptStreaming(hint ? `${text}\n\n(${hint})` : text, { signal: both })) {
            if (!first) first = Date.now();
            out += c;
            if (veto?.(out)) { vetoed = true; stop.abort(); break; }
            onChunk?.(out);
            if (out.length >= roomFor(out, max)) { cut = true; stop.abort(); break; }
          }
        } catch (e) {
          if (!((cut || vetoed) && e?.name === 'AbortError')) { later(); throw tag(e, codeOf(e, true)); }
        }
        const done = Date.now();
        // De sessie heeft het half afgemaakte antwoord gezien: opnieuw beginnen met het gesprek zonder deze beurt.
        if (vetoed) { this.stats = { loadMs: t1 - t0, firstMs: (first || done) - t1, ms: done - t1, chars: out.length, vetoed: true }; release(); return null; }
        if (cut) out = shorten(out, max);
        this.stats = { loadMs: t1 - t0, firstMs: (first || done) - t1, ms: done - t1, chars: out.length, cut };
        turns.push({ role: 'user', content: text }, { role: 'assistant', content: out.trim() });
        // Een sessie die na een afgekapt antwoord doorloopt, kent het einde niet: opnieuw beginnen met het gesprek.
        if (cut) release(); else later();
        return out.trim();
      },
      // Opwarmen: de eerste vraag na het openen duurde ~12 s (model laden). Een wegwerpkopie zegt alvast "Hi",
      // terwijl iemand nog typt; daarna ~1 s tot het eerste woord. Het echte gesprek blijft schoon.
      async warm() {
        try { const s = await session?.clone?.(); if (s) { await s.prompt('Hi'); s.destroy(); } } catch {}
      },
      // Kan de AI hier naar afbeeldingen kijken? Alleen als dat zonder download kan: nooit een extra model ophalen.
      async canSee() {
        try { return (await LM.availability({ ...lmOpts(langs), expectedInputs: [...lmOpts(langs).expectedInputs, { type: 'image' }] })) === 'available'; }
        catch { return false; }
      },
      // Een vraag met afbeeldingen: een eigen sessie die ook beelden aanneemt, met het gesprek tot nu toe, en daarna weg.
      // Los van de gewone sessie, zodat tekstvragen niet op het beeldmodel wachten. In het gesprek blijft alleen de tekst.
      async askImage(text, images, label, onChunk, signal) {
        clearTimeout(idle);
        const t0 = Date.now();
        let s;
        try {
          s = await LM.create({
            ...lmOpts(langs), ...(sampling || {}), signal, expectedInputs: [...lmOpts(langs).expectedInputs, { type: 'image' }],
            initialPrompts: [{ role: 'system', content: system }, ...turns.slice(-HISTORY_KEEP)],
          });
        } catch (e) { throw tag(e, codeOf(e, true)); }
        const t1 = Date.now();
        const stop = new AbortController();
        signal?.addEventListener?.('abort', () => stop.abort(), { once: true });
        let out = '', first = 0, cut = false;
        try {
          const msg = [{ role: 'user', content: [{ type: 'text', value: text }, ...images.map(value => ({ type: 'image', value }))] }];
          for await (const c of s.promptStreaming(msg, { signal: stop.signal })) {
            if (!first) first = Date.now();
            out += c; onChunk?.(out);
            if (out.length >= MAX_CHARS) { cut = true; stop.abort(); break; }
          }
        } catch (e) {
          if (!(cut && e?.name === 'AbortError')) throw tag(e, codeOf(e, true));
        } finally { s.destroy?.(); later(); }
        if (cut) { out = out.slice(0, MAX_CHARS); const end = Math.max(out.lastIndexOf('. '), out.lastIndexOf('! '), out.lastIndexOf('? ')); out = (end > MAX_CHARS * .5 ? out.slice(0, end + 1) : out) + ' …'; }
        const done = Date.now();
        this.stats = { loadMs: t1 - t0, firstMs: (first || done) - t1, ms: done - t1, chars: out.length, cut, image: true };
        turns.push({ role: 'user', content: `${text}\n${label}` }, { role: 'assistant', content: out.trim() });
        // De gewone sessie kent deze beurt niet: opnieuw beginnen, met het gesprek inclusief deze vraag.
        release();
        return out.trim();
      },
      release,
      requestPermission: async () => true,
      remove: async () => {},
      reset() { release(); turns.length = 0; },
      // De laatste vraag en het antwoord terugnemen (een tweede poging met een betere aanwijzing komt ervoor in de plaats).
      undo() { if (turns.at(-1)?.role === 'assistant') turns.splice(-2); release(); },
      // Ander gesprek: de AI begint opnieuw, met wat in dat gesprek al gezegd is.
      useTurns(list) { if (list !== turns) { release(); turns = list; } },
    };
  }

  function firefoxMl({ B, system, fxModel, onProgress }) {
    const model = FX_MODELS[fxModel] || FX_MODELS[FX_DEFAULT];
    const download = { gb: model.gb, host: 'huggingface.co', model: 'Qwen3' };
    const info = (state, why = '') => ({ state, why, browser: 'firefox', langs: ['*'], backend: 'firefox-ml', download });
    let turns = [];
    let ready = false;
    // Voortgang over alle bestanden samen. Zolang Firefox nog niet alle groottes kent, rekenen we met de bekende
    // modelgrootte, zodat het percentage niet terugspringt.
    const progress = p => {
      const seen = {};
      let started = false;
      return ev => {
        const d = ev?.data || ev;
        if (d?.type === 'downloading' && d.total) {
          started = true;
          seen[d.id || d.file || 'x'] = [d.totalLoaded || d.loaded || 0, d.total];
          const [l, t] = Object.values(seen).reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
          p?.(Math.min(99, Math.round(100 * l / Math.max(t, model.gb * 1e9))));
        } else if (!started) p?.(null);
      };
    };
    const api = {
      backend: 'firefox-ml',
      get ready() { return ready; },
      canSee: async () => false, // het kleine Firefox-model leest alleen tekst
      askImage: () => Promise.reject(tag(new Error('no images'), 'prompt')),
      async detect() {
        try {
          const { version } = await B.runtime.getBrowserInfo();
          if (parseInt(version, 10) < FX_MIN) return info('unavailable', 'old');
          const granted = await B.permissions.contains({ permissions: ['trialML'] });
          const { pchatFxModel } = await B.storage.local.get('pchatFxModel');
          return info(granted && pchatFxModel === model.modelId ? 'available' : 'downloadable');
        } catch (e) { console.warn('Kamelo device: firefox detect', e); return info('unavailable', 'device'); }
      },
      // Alleen, en als eerste in de klik: Firefox vraagt 'trialML' nooit samen met een andere toestemming. Zonder klik
      // (na herladen, of al eerder gegeven) weigert Firefox de vraag; dan telt of de toestemming er al is.
      requestPermission() {
        const want = { permissions: ['trialML'] };
        let asked;
        try { asked = B.permissions.request(want); } catch (e) { asked = Promise.reject(e); }
        return Promise.resolve(asked).catch(e => B.permissions.contains(want).then(ok => { if (ok) return true; throw e; }));
      },
      async prepare({ onProgress: p = onProgress, signal } = {}) {
        if (ready) return;
        if (signal?.aborted) throw aborted();
        if (!B.trial?.ml) throw tag(new Error('trial.ml not available yet'), 'reload');
        const onP = progress(p);
        B.trial.ml.onProgress.addListener(onP);
        const made = B.trial.ml.createEngine({ taskName: 'text-generation', modelHub: 'huggingface', modelId: model.modelId, dtype: model.dtype, device: model.device })
          // De engine leeft langer dan de pagina: na herladen bestaat hij al.
          .catch(e => { if (!/Engine already created/.test(String(e?.message))) throw tag(e, codeOf(e)); });
        // Firefox kan een download niet afbreken: bij Annuleren stoppen we meteen met wachten en ruimen we op zodra
        // Firefox klaar is.
        const stop = new Promise((_, reject) => {
          if (signal?.aborted) return reject(aborted());
          signal?.addEventListener('abort', () => reject(aborted()), { once: true });
        });
        try {
          await Promise.race([made, stop]);
        } catch (e) {
          if (e.device === 'aborted') {
            made.then(() => B.trial.ml.deleteCachedModels(), () => {}).catch(() => {});
            await B.storage.local.remove('pchatFxModel');
          }
          throw e;
        } finally { made.finally(() => B.trial.ml.onProgress.removeListener(onP)).catch(() => {}); }
        if (signal?.aborted) { // afgebroken op het moment dat Firefox klaar was
          await B.trial.ml.deleteCachedModels().catch(() => {});
          await B.storage.local.remove('pchatFxModel');
          throw aborted();
        }
        await B.storage.local.set({ pchatFxModel: model.modelId });
        ready = true;
      },
      async ask(text, onChunk, signal) {
        await api.prepare({ signal });
        const messages = [{ role: 'system', content: `${system} /no_think` }, ...turns.slice(-HISTORY_KEEP), { role: 'user', content: text }];
        let res;
        // Is het model intussen weggehaald (about:addons), dan haalt Firefox het hier opnieuw op: dat blijft zichtbaar.
        const onP = progress(onProgress);
        B.trial.ml.onProgress.addListener(onP);
        try {
          res = await B.trial.ml.runEngine({ args: [messages], options: { max_new_tokens: FX_MAX_TOKENS, do_sample: true, temperature: 0.7, top_p: 0.8, top_k: 20 } });
        } catch (e) { throw tag(e, codeOf(e, true)); } finally { B.trial.ml.onProgress.removeListener(onP); }
        if (signal?.aborted) throw aborted();
        const out = res?.[0]?.generated_text, last = Array.isArray(out) ? out.at(-1) : null;
        if (last?.role !== 'assistant' || typeof last.content !== 'string') throw tag(new Error('unexpected output'), 'failed');
        const answer = last.content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '').trim();
        turns.push({ role: 'user', content: text }, { role: 'assistant', content: answer });
        onChunk?.(answer);
        return answer;
      },
      async remove() { await B.trial.ml.deleteCachedModels(); await B.storage.local.remove('pchatFxModel'); ready = false; },
      reset() { turns.length = 0; },
      undo() { if (turns.at(-1)?.role === 'assistant') turns.splice(-2); },
      useTurns(list) { turns = list; },
    };
    return api;
  }

  // Kiest de laag op wat de browser kan, niet op de user agent.
  function create({ env = globalThis, lang = 'en', force = null, system = '', browserId = 'chrome', fxModel = null, onProgress = null, sampling = null } = {}) {
    const B = env.browser;
    if (typeof B?.runtime?.getBrowserInfo === 'function') return FX_ENABLED || force === 'device' ? firefoxMl({ B, system, fxModel, onProgress }) : none('firefox', 'slow');
    if (typeof env.LanguageModel !== 'undefined') return promptApi({ env, LM: env.LanguageModel, lang, system, browserId, onProgress, sampling });
    return none(browserId);
  }

  const api = { create, pct, codeOf, FX_ENABLED, FX_MODELS, FX_DEFAULT, PROMPT_LANGS, MAX_CHARS, IDLE_MS };
  globalThis.KameloDevice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
