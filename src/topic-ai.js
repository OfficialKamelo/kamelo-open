// Gevoelige onderwerpen, tweede kans: de AI van Chrome op dit apparaat (Gemini Nano, de Prompt API).
// De woordenlijst (topics.js) is snel en vangt het meeste, maar mist nieuwe manieren van zeggen ("sinds ik ons spaargeld
// in het casino ben kwijtgeraakt"). Vindt de woordenlijst niets, dan vragen we de AI op dit apparaat of het een
// persoonlijke vraag is over de schrijver of iemand om hem heen, in een van de zes onderwerpen. Zo ja: dezelfde melding.
//
// Alleen in de gratis editie, alleen in Chrome, alleen op de AI-chatsites. Alles blijft op het apparaat:
// - de AI draait in de achtergrond van Kamelo (service worker). Daar bestaat LanguageModel (getest in Chrome 154 en 155),
//   los van de website en diens Permissions-Policy; er is geen extra toestemming of offscreen-document nodig;
// - nooit een download: alleen als availability() 'available' zegt (bijv. omdat Private Chat het model al ophaalde).
//   Anders, of zonder Prompt API (Edge, Firefox, oudere Chrome): stil alleen de woordenlijst;
// - niets wordt bewaard of gelogd. De content script onthoudt per tekst alleen een hash en het antwoord, in het geheugen.
//
// Twee delen: gate() in de content script (wanneer vragen: na een pauze, genoeg woorden, één keer per tekst, niet te
// vaak, oude antwoorden negeren) en model() in de achtergrond (de AI zelf, met een eigen grens per tabblad).
(function (root) {
  'use strict';

  const TOPICS = ['HEALTH', 'MENTAL', 'SEXUALITY', 'RELIGION', 'MONEY', 'LEGAL'];
  const PAUSE_MS = 1200;     // pas vragen als de gebruiker zo lang niet typt
  const GAP_MS = 3000;       // hooguit één vraag per zoveel tijd per tabblad
  const MIN_WORDS = 4;
  const MAX_CHARS = 600;     // de laatste alinea's, tot zoveel tekens
  const IDLE_MS = 60 * 1000; // daarna de AI loslaten, zodat de computer zijn geheugen terugkrijgt
  const TIMEOUT_MS = 15000;  // trager dan dit: geen melding
  const CACHE_MAX = 200;

  // Kort, in het Engels (dat kent de Prompt API officieel); de tekst zelf mag in elke taal.
  // Zelfbeschadiging hoort er bewust niet bij (zoals in topics.js): geen melding die iemand wegstuurt.
  const SYSTEM = [
    'You check one message that someone is about to send to an AI chatbot.',
    'Answer personal=true only if the writer shares something private about themselves or someone close to them',
    '(partner, child, parent, family member, friend) in one of these topics:',
    'HEALTH: illness, symptoms, injuries, medication, pregnancy, disability.',
    'MENTAL: mental health, low mood, anxiety, stress, loneliness, grief, addiction, therapy.',
    'SEXUALITY: sex life, sexual orientation, gender identity, intimate problems.',
    'RELIGION: personal faith, belief or leaving a religion.',
    'MONEY: debt, money worries, losing savings, gambling losses, unpaid bills, benefits.',
    'LEGAL: police, arrest, court, lawsuit, divorce, immigration status, a crime.',
    'Answer personal=false with topic NONE for general knowledge, homework, school, fiction, news, hypotheticals,',
    'work or business questions, or anything about strangers, even when the subject is sensitive.',
    'Self-harm and suicide: topic NONE.',
    'The message can be in any language.',
  ].join(' ');
  const SCHEMA = {
    type: 'object',
    properties: { personal: { type: 'boolean' }, topic: { type: 'string', enum: [...TOPICS, 'NONE'] } },
    required: ['personal', 'topic'],
    additionalProperties: false,
  };
  // Dezelfde opties voor availability() en create(), zoals de Prompt API vraagt.
  const LM_OPTS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

  // Het stuk dat de AI ziet: de laatste alinea's, samen hooguit MAX_CHARS tekens (de vraag staat meestal aan het eind).
  // Een te lange laatste alinea: het einde, vanaf een heel woord.
  function snippet(text) {
    const paras = String(text || '').slice(-20000).split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    let out = '';
    for (let i = paras.length - 1; i >= 0; i--) {
      const next = out ? `${paras[i]}\n${out}` : paras[i];
      if (next.length > MAX_CHARS) {
        if (!out) { out = paras[i].slice(-MAX_CHARS); const sp = out.indexOf(' '); if (sp > 0 && sp < 40) out = out.slice(sp + 1); }
        break;
      }
      out = next;
    }
    return out;
  }

  // Genoeg tekst om iets te zeggen? Talen zonder spaties (Chinees, Japans, Thai) tellen in tekens.
  function enough(s) {
    const words = (s.match(/[\p{L}\p{N}]+/gu) || []).length;
    const dense = (s.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/gu) || []).length;
    return words >= MIN_WORDS || dense >= 8;
  }

  // Het antwoord van de AI: alleen personal=true met een van de zes onderwerpen telt.
  function parse(raw) {
    try {
      const o = JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
      return o && o.personal === true && TOPICS.includes(o.topic) ? o.topic : null;
    } catch { return null; }
  }

  // FNV-1a: de cache bewaart geen tekst, alleen dit getal en de lengte.
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return `${(h >>> 0).toString(36)}.${s.length}`;
  }

  // ---------- Content script: wanneer vragen ----------
  // ask(text) → Promise<{ topic, skipped }>: stuurt naar de achtergrond. schedule() na de woordenlijst, die niets vond;
  // cancel() bij elke toetsaanslag. read() geeft de tekst van nu: veranderd sinds de vraag, dan telt het antwoord niet.
  function gate({ ask, now = () => Date.now(), setTimer = (f, ms) => setTimeout(f, ms), clearTimer = t => clearTimeout(t) } = {}) {
    const cache = new Map(); // hash → onderwerp of null
    let last = -Infinity, timer = null, gen = 0;
    const remember = (key, topic) => {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, topic);
    };
    function cancel() { gen++; clearTimer(timer); timer = null; }
    // waited: hoe lang de gebruiker al niet typt (de woordenlijst wacht zelf ook al even).
    function schedule({ read, onTopic, waited = 0 }) {
      cancel();
      const my = gen;
      const run = async () => {
        timer = null;
        if (my !== gen) return;
        const s = snippet(read());
        if (!enough(s)) return;
        const key = hash(s);
        if (cache.has(key)) { const t = cache.get(key); if (t) onTopic(t); return; }
        const wait = last + GAP_MS - now();
        if (wait > 0) { timer = setTimer(run, wait); return; }
        last = now();
        let res = null;
        try { res = await ask(s); } catch { res = null; }
        if (!res || res.skipped) return; // te druk of geen verbinding: niet onthouden, de volgende pauze probeert opnieuw
        const topic = TOPICS.includes(res.topic) ? res.topic : null;
        remember(key, topic);
        // Intussen verder getypt? Dan hoort het antwoord bij een oude tekst.
        if (my !== gen || snippet(read()) !== s) return;
        if (topic) onTopic(topic);
      };
      timer = setTimer(run, Math.max(0, PAUSE_MS - waited));
    }
    return { schedule, cancel, get pending() { return !!timer; } };
  }

  // ---------- Achtergrond: de AI op dit apparaat ----------
  // ask(text, tabId) → { topic } of { topic: null, skipped }. LanguageModel wordt bij elke vraag opnieuw opgezocht.
  function model({ env = root, now = () => Date.now(), setTimer = (f, ms) => setTimeout(f, ms), clearTimer = t => clearTimeout(t) } = {}) {
    let base = null, idle = null, busy = false;
    const lastByTab = new Map();
    const release = () => { clearTimer(idle); idle = null; try { base?.destroy?.(); } catch {} base = null; };
    const later = () => { clearTimer(idle); idle = setTimer(release, IDLE_MS); idle?.unref?.(); }; // unref: houdt Node (tests) niet open
    async function create(LM) {
      const opts = { ...LM_OPTS, initialPrompts: [{ role: 'system', content: SYSTEM }] };
      // topK en temperature: alleen samen, en alleen in extensies. Kent deze Chrome ze niet, dan zonder.
      try { return await LM.create({ ...opts, topK: 1, temperature: 0 }); } catch { return LM.create(opts); }
    }
    async function ask(text, tab = 0) {
      const LM = env.LanguageModel;
      if (!LM || typeof LM.availability !== 'function' || typeof LM.create !== 'function') return { topic: null, why: 'absent' };
      const s = snippet(text);
      if (!enough(s)) return { topic: null, why: 'short' };
      const t = now();
      if (t - (lastByTab.get(tab) ?? -Infinity) < GAP_MS) return { topic: null, skipped: 'rate' };
      if (busy) return { topic: null, skipped: 'busy' };
      busy = true;
      lastByTab.set(tab, t);
      if (lastByTab.size > 100) for (const [k, v] of lastByTab) if (t - v >= GAP_MS) lastByTab.delete(k);
      let session = null;
      try {
        // Nooit downloaden: alleen als het model er al is.
        let state;
        try { state = await LM.availability(LM_OPTS); } catch { state = 'unavailable'; }
        if (state !== 'available') { release(); return { topic: null, why: String(state) }; }
        clearTimer(idle);
        base ??= await create(LM);
        session = typeof base.clone === 'function' ? await base.clone() : await create(LM);
        const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
        const raw = await session.prompt(s, { responseConstraint: SCHEMA, signal });
        return { topic: parse(raw) };
      } catch {
        release(); // bijv. te traag of het model is weg: de volgende keer opnieuw beginnen
        return { topic: null, why: 'error' };
      } finally {
        try { if (session && session !== base) session.destroy?.(); } catch {}
        busy = false;
        if (base) later();
      }
    }
    return { ask, release, get ready() { return !!base; } };
  }

  const api = { TOPICS, PAUSE_MS, GAP_MS, MIN_WORDS, MAX_CHARS, IDLE_MS, SYSTEM, SCHEMA, LM_OPTS, snippet, enough, parse, hash, gate, model };
  root.KameloTopicAi = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
