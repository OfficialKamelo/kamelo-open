// Kamelo Private Chat (zie docs/private-chat/PLAN-PRIVE-CHAT.md).
// 1. Alleen Kamelo Business: namen en gegevens worden afgeschermd met een kluis die alleen in dit venster leeft (dicht = weg).
// 2. Gratis: de AI van de browser zelf beantwoordt de vraag op dit apparaat (Chrome, Gemini Nano; zie device.js).
//    Kan dat niet (Edge, Firefox, te zwakke computer, te traag), dan biedt Kamelo een tijdelijke chat aan.
// 3. Alleen Kamelo Plus (staat uit): Tinfoil's SecureClient controleert de enclave en versleutelt de vraag;
//    die gaat via Kamelo's relay, die alleen versleutelde tekst ziet. Faalt de controle, dan gaat er niets weg.
// 4. In het antwoord zet Kamelo de echte gegevens terug, alleen op dit scherm.
(() => {
  'use strict';
  const I = globalThis.PrivacyI18n, C = globalThis.PrivacyConfig;
  // De gratis editie (zie src/edition.js) schermt niets af en heeft detector.js niet: dan gaat de tekst ongewijzigd door.
  const D = globalThis.KameloEdition !== 'public' && globalThis.PrivacyDetector || {
    emptyVault: () => ({ byPlaceholder: {} }), mask: text => ({ text, items: [] }), restore: text => text,
  };
  // Alleen voor Plus (de chip); het Firefox-pakket heeft vendor/ niet, dan blijft de chip-route gewoon uit.
  const { SecureClient } = globalThis.TinfoilKit || {};
  const $ = id => document.getElementById(id);
  // Meetgegevens in de console alleen met ?debug in de adresbalk.
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const debug = (...a) => { if (DEBUG) console.info('Kamelo Private Chat:', ...a); };

  // Testopzet: de relay draait lokaal (node relay/dev.mjs). Later: https://relay.kamelo.eu.
  const RELAY_DEFAULT = 'http://127.0.0.1:8787';
  // Gemma 4: sneller en zuiniger dan gpt-oss (geen verborgen "nadenken"), en het beste antwoord in onze test (11 okt).
  const MODEL = 'gemma4-31b';
  const FREE_PER_DAY = 25;
  const HANDOFF_MAX_AGE = 2 * 60 * 1000;
  // Kort gehouden: hij gaat met elke vraag mee (en kost dus elke keer tokens). Getest op de AI van Chrome (13 okt):
  // "suggest a professional / emergency help" zonder voorwaarde gaf bij elke "hallo" een verwijzing naar 112,
  // en zonder taal antwoordde hij op een groet in het Duits of Russisch. Nu: luisteren en raad geven; hulplijn alleen bij ernst.
  const LANG_NAME = { en: 'English', nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish' };
  const CRISIS = {
    en: 'a local crisis line', nl: '113 Zelfmoordpreventie (0800-0113, free, day and night)',
    de: 'TelefonSeelsorge (0800 111 0 111, free, day and night)', fr: '3114 (free, day and night)', es: '024 (free, day and night)',
  };
  const WORK = globalThis.KameloEdition !== 'public';
  // Gratis: iemand die luistert en raad geeft (persoonlijke vragen). Business: een gewone, zakelijke assistent voor werk.
  // Persoonlijk (verdriet, liefde, gezondheid, zorgen, eenzaamheid): eerst luisteren en het gesprek aangaan, tips pas als iemand
  // erom vraagt (Lucas 15 okt: "er echt zijn voor iemand, niet een snelle oplossing sturen"). Getest op de AI van Chrome: met
  // "één zin begrip, dan 2 of 3 tips" gaf hij bij elk verdriet een lijstje met drie tips. Praktische vragen: direct antwoord.
  // Wat waar is over Melo zelf, vóóraan (getest 14 okt op de AI van Chrome: anders verzon hij "je info gaat versleuteld naar
  // mijn servers"). Per AI: die op deze computer, of de versleutelde chip van Plus (Tinfoil). Gesprekken staan nergens.
  const FACTS_DEVICE = 'The only true facts about you: you are Melo, the AI built into Chrome, and you run on this computer. Nothing the user types ' +
    'leaves this computer: not to Kamelo, not to Google, not to anyone. Nothing is saved; the chat disappears when this panel closes. ';
  const FACTS_CHIP = 'The only true facts about you: you are Melo, running on an encrypted, secure chip (Kamelo Plus) that nobody can look into, ' +
    'not even Kamelo. Nothing is saved; the chat disappears when this panel closes. ';
  const BASE = (WORK
    ? 'You are Melo, a helpful, professional assistant for work. Answer clearly and to the point, in a friendly tone, in simple, correct words. ' +
      'If the message is only a greeting, greet back and ask how you can help. No warnings or disclaimers unless really needed. ' +
      'Placeholders like [PERSON_1] stand for hidden real details: use them as written, never ask what they mean. ' +
      'In emails and letters, never invent details the user didn’t give (times, dates, names, reasons): leave them out. ' +
      'Start with the direct answer. Short paragraphs, concrete next steps. '
    : 'You are Melo, a calm, warm friend who really listens. Write naturally and kindly, in simple, correct words, without slang. ' +
      'Never assume a problem they didn’t mention. Short, casual messages (a joke, a remark, slang) are not a personal problem: reply lightly and naturally, and if you’re not sure what they mean, ask. Read a short follow-up as a reaction to your own last answer. When someone shares something personal (grief, love, health, worries, loneliness), ' +
      'don’t rush to fix it: say in your own words what you hear, then ask one open question about them. No tips or lists unless they ask; ' +
      'if they ask, 1 or 2 ideas that fit their story. A practical question gets a direct answer. No disclaimers. For health: be careful and supportive, ' +
      'you are not a doctor; for complaints that are serious, last long or get worse (like a lump, chest pain, weeks of bad sleep): kindly add that the GP can help. ' +
      `Only if someone mentions suicide, self-harm or wanting to die: kindly mention ${CRISIS[I.LANG] || CRISIS.en}, and 112 if they are in danger now. ` +
      'Never write placeholders in brackets. ') +
    'Short paragraphs. If you are not sure about something, say so honestly. ' +
    'Don’t start with “Yes” unless they asked a yes/no question. ' +
    `Answer in the language of the user’s message (if unclear, in ${LANG_NAME[I.LANG] || 'English'}), briefly (under 200 words).`;
  // Wat Melo kan laten zien (Kamelo tekent het, chat/rich.js): formules, grafieken en hele documenten (bewaren als pdf of Word).
  // Getest 15 okt op de AI van Chrome: zonder dit zei hij bij "teken de grafiek" alleen hoe de grafiek eruit zou zien, en sloot hij
  // elk antwoord af met "Heb je nog andere vragen?".
  const CAN = 'No greeting or compliment at the start (“Hello!”, “Good question”), and never end with “anything else?”. ' +
    'Math: formulas in LaTeX between $ signs (like $a^2+b^2=c^2$), the final answer in **bold**. A simple sum gets just the answer. ' +
    'You can show charts (Kamelo draws them), but only when the user asks for a chart, graph or plot: never say you cannot draw. ' +
    'For a document (letter, CV, report, summary): write all of it, with a # title and ## headings; the user can save it as PDF or Word. ';
  // Het grafiekformaat alleen bij een vraag om een grafiek (met de vraag mee, niet in de vaste instructies): met voorbeelden
  // in de vaste instructies tekende de AI van Chrome ook bij "2 + 2" en "waarom is de lucht blauw" een grafiek (15 okt).
  const CHART_HOW = ' Add the chart as a block exactly like this, with the ``` lines, and don’t talk about the block itself:\n' +
    '```chart\ntype: bar\ntitle: Sales (× €1000)\nx: 2022, 2023, 2024\nProduct A: 120, 150, 180\nProduct B: 80, 95, 110\n```\n' +
    'type is bar, stacked, line or pie. For the graph of a function:\n```chart\ntype: function\nf: x^2 - 4\nx: -5 to 5\n```';
  const SYSTEM = FACTS_CHIP + CAN + BASE;
  // Op dit apparaat korter: elk woord kost op een gewone laptop merkbaar tijd (en de AI van Chrome is klein).
  const DEVICE_SYSTEM = FACTS_DEVICE + CAN + BASE.replace('briefly (under 200 words)', 'briefly (under 100 words, a few short paragraphs at most)');
  // Temperatuur 0.4: minder rare woorden van de kleine AI (getest 14 okt).
  const SAMPLING = { temperature: 0.4, topK: 3 };

  // Vragen over Melo zelf (waar gaat mijn info heen, is dit privé, leest iemand mee) beantwoordt Melo met vaste feiten,
  // niet de AI. Zelfde regels als Melo Chat op kamelo.eu (melo/melo.js). JS-\b kent geen é of ö: eigen woordgrenzen.
  const w = x => `(?<!\\p{L})(${x})(?!\\p{L})`;
  const DATA = w('info|informatie|data|gegevens|berichten|vragen|gesprek(ken)?|chats?|information|messages?|questions?|conversations?|daten|nachrichten|fragen|donn[ée]es|datos|mensajes|preguntas|conversaci[oó]n');
  const PRIVACY = new RegExp([
    `${w('waar|where|wohin|wo|o[uù]|d[oó]nde|ad[oó]nde')}.{0,30}${DATA}`,
    `${w('wie|who|wer|qui|qui[eé]n')}.{0,20}${w('leest|lezen|ziet|zien|kijkt|reads?|sees?|liest|lesen|sieht|lit|voit|lee|ve')}`,
    `${w('is|ist|est|es|blijft|stays|bleibt|reste|really|echt')}.{0,20}${w('priv[eéa]|private|privat|priv[ée]e|privado|anoniem|anonymous|anonym|anonyme|an[oó]nimo')}`,
    `${w('bewaar|bewaart|sla|slaat')}\\s+${w('je|jij|melo|kamelo|google|chrome|het|jullie')}`,
    w('opgeslagen|stored|gespeichert|enregistr\\w*|guardad[oa]s?|almacenad[oa]s?'),
    `${w('do|does|will|can|did')}\\s+${w('you|melo|kamelo|google|chrome|it|anyone')}\\s+${w('store|save|keep|record|log')}\\s+${w('this|that|it|my|what|anything|everything|chats?|messages?|data')}`,
    w('speicherst|speichert|merkst'),
    w('meekijkt|meekijken|meekijk|meelezen|meeleest|meelees|mitlesen|liest mit'),
    `${w('kijkt|leest|luistert')}.{0,20}${w('iemand|er iemand|anyone')}.{0,10}${w('mee')}`,
    `${w('niemand|nobody|no one|personne|nadie')}.{0,30}${w('leest|lezen|ziet|zien|reads?|sees?|liest|lesen|sieht|lit|voit|lee|ve')}`,
    `${w('google|kamelo|openai|chatgpt|chrome')}.{0,30}${w('mee|meelezen|lezen|leest|zien|ziet|see|read|data|gegevens|daten|donn[ée]es|datos')}`,
    `${w('veilig|safe|sicher|s[uû]r|seguro')}.{0,30}${w('hier|here|dit|this|melo|chat|praten|typen|vertellen')}|${w('hier|here|dit|this|melo|chat')}.{0,20}${w('veilig|safe|sicher|s[uû]r|seguro')}`,
  ].join('|'), 'iu');
  const isPrivacy = q => q.length <= 120 && PRIVACY.test(q);

  // De kleine AI schakelt soms naar Engels of Duits: per bericht een korte aanwijzing die alleen de AI ziet (taal van het
  // bericht via de taalherkenner van Chrome, anders de vorige, anders die van de browser), plus bij alarmsignalen de huisarts.
  let lastLang = LANG_NAME[I.LANG] ? I.LANG : 'en', detector = null;
  const ALARM = /knobbel|bult|lump|pijn op de borst|druk op de borst|chest pain|blut im stuhl|bloed (in|bij) (mijn )?(ontlasting|urine|plas)|blood in (my )?(stool|urine)|scheve mond|krachtverlies|uitval|knoten|brustschmerz|grosseur|douleur thoracique|bulto|dolor en el pecho/i;
  const CHEST = /pijn op de borst|druk op de borst|chest pain|brustschmerz|douleur thoracique|dolor en el pecho/i;
  // Wat voor vraag is het? Per soort een korte aanwijzing voor de AI, en een document mag langer zijn.
  const WANTS_CHART = /grafiek|diagram|chart|graph|plot|visuali|taartdiagram|staafdiagram|teken |zeichne|diagramm|graphique|trace |gr[aá]fic|dibuja/i;
  const WANTS_DOC = /(schrijf|maak|stel .{0,10}op|write|draft|create|make|schreib|erstell|[ée]cri[st]|r[ée]dige|escribe|redacta|crea).{0,50}(brief|letter|cv|curriculum|document|verslag|rapport|report|samenvatting|summary|essay|werkstuk|opstel|offerte|motivatie|sollicitatie|speech|toespraak|betoog|handleiding|lettre|carta|informe|resumen|zusammenfassung|bericht|anschreiben|bewerbung)|\bpdf\b|\bword\b.{0,15}(bestand|document|file)|\bdocx\b/i;
  const WANTS_MATH = /bereken|\breken (uit|na)|calculat|compute|los op|solve|afgeleide|derivative|integra|vergelijking|equation|formule|formula|berechne|lös(e|en)\b|ableitung|calcul|r[ée]sou|d[ée]riv|[ée]quation|resuelve|derivada|ecuaci[oó]n|\d\s*[+*/^×÷]\s*\d|\d\s+-\s+\d|\d\s*%|\bx\s*[=+^²]/i;
  // "Is er nog iets anders waar ik je mee kan helpen?" en dergelijke: de kleine AI zet dit onder bijna elk antwoord, ook als
  // de instructies het verbieden (getest 15 okt). Kamelo haalt zo'n laatste zin weg; een echte vervolgvraag blijft staan.
  const FILLER = /^(is er|heb je|kan ik|wil je)? ?(nog )?(iets anders|andere vragen|verder nog iets|meer vragen)[^\n]*\?\s*$|^(is there )?anything else[^\n]*\?\s*$|^(do you have|any) (any )?(other|more) questions[^\n]*\?\s*$|^(gibt es|hast du) (noch )?(etwas anderes|weitere fragen)[^\n]*\?\s*$|^(y a-t-il|avez-vous) (autre chose|d.autres questions)[^\n]*\?\s*$|^¿(hay|tienes) algo más[^\n]*\?\s*$/i;
  function trimFiller(text) {
    const parts = text.trimEnd().split(/\n{2,}/);
    if (parts.length < 2) return text.trimEnd();
    const last = parts.at(-1).trim();
    // ook als het achter een korte zin staat: "Het is een mooi principe! Is er iets anders…?"
    const tail = last.split(/(?<=[.!])\s+/).at(-1);
    if (FILLER.test(last)) parts.pop();
    else if (FILLER.test(tail)) parts[parts.length - 1] = last.slice(0, last.length - tail.length).trimEnd();
    else return text.trimEnd();
    return parts.join('\n\n').trimEnd();
  }
  function taskHint(q) {
    if (WANTS_DOC.test(q)) return { hint: ' Write the complete document (up to 350 words), starting with a # title.', max: 3200 };
    if (WANTS_CHART.test(q)) return { hint: CHART_HOW, max: 1600 };
    if (WANTS_MATH.test(q) && q.length > 14) return { hint: ' Explain step by step, one step per line, formulas between $ signs, the answer in bold.', max: 1400 };
    return { hint: '', max: undefined };
  }
  async function langHint(q) {
    try {
      if (!detector && globalThis.LanguageDetector && await LanguageDetector.availability() === 'available') detector = await LanguageDetector.create();
      const top = detector && (await detector.detect(q))[0];
      // Wisselen naar een andere taal dan die van de browser alleen bij een duidelijk, lang genoeg bericht: korte zinnen en
      // spreektaal ("nee grapje melo ily") herkent de taalherkenner vaak verkeerd (gaf Frans; Lucas, 16 okt).
      const words = q.trim().split(/\s+/).length;
      const need = top?.detectedLanguage === I.LANG ? 0.5 : words >= 8 ? 0.85 : 0.97;
      if (top && words >= 3 && LANG_NAME[top.detectedLanguage] && top.confidence >= need) lastLang = top.detectedLanguage;
    } catch {}
    return `Reply in ${LANG_NAME[lastLang]}.` + (!WORK && ALARM.test(q) ? ' Start by kindly advising to call the GP today or tomorrow.' : '') +
      (!WORK && CHEST.test(q) ? ' If the pain is severe or they are short of breath: call 112 now.' : '');
  }
  // Alleen een groet: die beantwoordt Kamelo zelf. De kleine AI van Chrome verzon er anders een probleem bij ("fijn dat je je gelukkig voelt").
  const GREETING = /^(h(allo|oi|ey|i|ello|ola|ej)|bonjour|salut|moin|servus|goe(de)?(morgen|middag|n?avond)|guten (morgen|tag|abend)|buen(os días|as( tardes| noches)?)|good (morning|afternoon|evening))( (daar|there|kamelo))?[\s!.,?👋]*$/iu;
  // "Te traag op deze computer": eerste woord na meer dan 15 s, minder dan 12 tekens per seconde, of langer dan 40 s.
  // Twee keer achter elkaar te traag: voortaan de tijdelijke chat aanbieden (terug via het slotje: "Toch op dit apparaat").
  const isSlow = st => st && (st.firstMs > 15000 || st.ms > 40000 || (st.chars > 150 && st.chars / Math.max(1, st.ms - st.firstMs) * 1000 < 12));
  // Kosten per vraag laag houden (docs/private-chat/PLAN-PRIVE-CHAT.md): weinig "nadenken", een korte bovengrens, en alleen de laatste berichten meesturen.
  const MAX_TOKENS = 600, HISTORY_KEEP = 6;

  const vault = D.emptyVault();      // alleen in dit venster
  let history = [];                  // wat de AI te zien krijgt in het huidige gesprek: alleen placeholders
  let settings = { ...C.DEFAULT_SETTINGS }, relay = RELAY_DEFAULT, client = null, verified = null, busy = false;

  I.applyI18n();
  const input = $('input'), form = $('form'), msgs = $('msgs');

  // ---------- gesprekken in dit venster ----------
  // Elke nieuwe vraag uit de melding (en "+") begint een eigen gesprek, met een eigen geheugen voor de AI. Alleen in het
  // geheugen van dit venster: dicht = weg (gesprekken bewaren is voor Plus).
  const convs = [];
  let conv = null;
  // Lege staat: één regel uitleg en vier optionele beginnetjes (gratis: persoonlijk; Business: werk). Een klik zet het begin
  // van de vraag in het veld; zelf typen kan altijd meteen. Zodra je typt, gaan ze rustig weg.
  function emptyState() {
    const e = $('emptyTpl').content.cloneNode(true);
    I.applyI18n(e);
    const box = e.firstElementChild;
    box.querySelector('.sub').textContent = I.t(WORK ? 'pchatEmptySubWork' : 'pchatEmptySub');
    const sugs = box.querySelector('.sugs');
    for (let n = 1; n <= 4; n++) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'sug', textContent: I.t(`pchatSug${WORK ? 'W' : ''}${n}`) });
      b.addEventListener('click', () => { input.value = I.t(`pchatSug${WORK ? 'W' : ''}${n}Text`); autosize(); input.focus(); input.setSelectionRange(input.value.length, input.value.length); typing(); });
      sugs.append(b);
    }
    return box;
  }
  const typing = () => document.body.classList.toggle('typing', !!input.value.trim());
  const shortTitle = text => { const t = text.replace(/\s+/g, ' ').trim(); return t.length > 42 ? `${t.slice(0, 40).replace(/\s+\S*$/, '')}…` : t; };
  function setTitle(c, text) {
    c.title = text ? shortTitle(text) : '';
    if (c === conv) $('convTitle').textContent = c.title || I.t('pchatTitle');
  }
  function syncConvButtons() {
    $('newChat').hidden = $('clearChat').hidden = !history.length;
    $('newChat').disabled = $('clearChat').disabled = busy;
    $('convBtn').disabled = busy || convs.filter(c => c.history.length).length < 2;
    $('convBtn').classList.toggle('many', !$('convBtn').disabled);
  }
  function showConv(c) {
    if (conv === c) return;
    convs.forEach(x => { x.thread.hidden = x !== c; });
    conv = c; history = c.history;
    dev.useTurns?.(c.turns);
    $('convTitle').textContent = c.title || I.t('pchatTitle');
    closeConvList();
    syncConvButtons();
    msgs.scrollTop = msgs.scrollHeight;
  }
  function newConv() {
    // Een leeg gesprek hergebruiken in plaats van er nog een te maken.
    const empty = convs.find(c => !c.history.length);
    if (empty) return showConv(empty);
    const thread = Object.assign(document.createElement('div'), { className: 'thread' });
    thread.append(emptyState());
    msgs.append(thread);
    const c = { thread, history: [], turns: [], title: '' };
    convs.unshift(c);
    showConv(c);
    clearNote();
  }
  // Gesprek wissen: weg uit dit venster en uit het geheugen van de AI; een ander gesprek of een lege staat blijft over.
  $('clearChat').addEventListener('click', () => {
    if (busy || !conv) return;
    const gone = conv;
    gone.thread.remove();
    convs.splice(convs.indexOf(gone), 1);
    gone.history.length = 0; gone.turns.length = 0;
    dev.release?.();
    conv = null;
    const other = convs.find(c => c.history.length);
    if (other) showConv(other); else newConv();
    clearNote();
    input.focus();
  });
  function closeConvList() { $('convList').hidden = true; $('convBtn').setAttribute('aria-expanded', 'false'); }
  $('convBtn').addEventListener('click', () => {
    const list = $('convList');
    if (!list.hidden) return closeConvList();
    list.replaceChildren(...convs.filter(c => c.history.length).map(c => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'conv' + (c === conv ? ' on' : '') });
      b.append(Object.assign(document.createElement('span'), { textContent: c.title }));
      b.addEventListener('click', () => showConv(c));
      return b;
    }), Object.assign(document.createElement('p'), { className: 'convnote', textContent: I.t('pchatChatsGone') }));
    list.hidden = false;
    $('convBtn').setAttribute('aria-expanded', 'true');
  });
  $('newChat').addEventListener('click', () => { if (!busy) { newConv(); input.focus(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeConvList(); });

  // ---------- teller (lokaal; later anoniem via Privacy Pass) ----------
  const today = () => new Date().toISOString().slice(0, 10);
  async function quota() {
    const { pchatQuota: q } = await chrome.storage.local.get('pchatQuota');
    return q?.day === today() ? q.used : 0;
  }
  async function useOne() {
    const used = (await quota()) + 1;
    await chrome.storage.local.set({ pchatQuota: { day: today(), used } });
    showLeft(used);
  }
  function showLeft(used) {
    $('hint').textContent = I.t('pchatLeft', { n: Math.max(0, FREE_PER_DAY - used), max: FREE_PER_DAY });
  }

  // ---------- welke AI antwoordt ----------
  // Gratis: de AI van de browser zelf, op dit apparaat (chat/device.js: Chrome en Edge via de Prompt API, Firefox via
  // trial.ml). De vraag verlaat het apparaat dan niet. Kan dat niet (hardware, browser of taal), dan bieden we de
  // tijdelijke chat van de AI-site aan. De verzegelde chip is voor Kamelo Plus (nu: settings.privateChatPlus).
  // ?engine=chip of ?engine=device dwingt een keuze af (om te testen); ?fxmodel=qwen3-0.6b kiest een ander Firefox-model.
  const params = new URLSearchParams(location.search);
  const FORCE = params.get('engine');
  const dev = KameloDevice.create({ lang: I.LANG, force: FORCE, system: DEVICE_SYSTEM, sampling: SAMPLING, browserId: I.BROWSER.id, fxModel: params.get('fxmodel'), onProgress: showProgress });
  let engine = 'none', devInfo = { state: 'unavailable', backend: 'none', langs: [], download: {} };
  let devAbort = null, preparing = false, onChunk = null, sourceHost = '', offReason = '';
  const chipAllowed = () => FORCE === 'chip' || settings.privateChatPlus === true;
  const fmtGB = gb => `${new Intl.NumberFormat(I.LANG, { maximumFractionDigits: 1 }).format(gb)} GB`;
  const btn = (text, onclick, ghost = false) => Object.assign(document.createElement('button'), { type: 'button', className: `btn${ghost ? ' ghost' : ''}`, textContent: text, onclick });

  // Eerst vragen, dan downloaden: de browser haalt de AI pas op na een klik, met de grootte erbij.
  function offerDevice(resend) {
    const text = devInfo.backend === 'firefox-ml'
      ? I.t('pchatDeviceOfferFx', { size: fmtGB(devInfo.download.gb) })
      : I.t('pchatDeviceOffer', { free: devInfo.download.freeGB });
    note(I.t('pchatDeviceOfferTitle'), text, { buttons: [
      btn(I.t('pchatDeviceDownload'), () => startDownload(resend)),
      btn(I.t('pchatDeviceNotNow'), async () => {
        await chrome.storage.local.set({ pchatDevice: 'declined' });
        useFallback();
      }, true),
    ] });
  }
  // Moet synchroon in de klik beginnen: beide browsers controleren dat er een gebruikersactie is.
  function startDownload(resend) {
    devAbort = new AbortController(); preparing = true;
    const signal = devAbort.signal;
    const go = dev.backend === 'firefox-ml'
      ? dev.requestPermission().then(ok => {
        if (!ok) throw Object.assign(new Error('denied'), { device: 'denied' });
        return dev.prepare({ signal });
      })
      : dev.prepare({ signal });
    showProgress(null);
    // Eerst de vlaggen terugzetten, anders wordt de vraag hieronder niet verstuurd.
    go.finally(() => { preparing = false; devAbort = null; }).then(() => {
      devInfo.state = document.documentElement.dataset.device = 'available'; offReason = ''; clearNote();
      if (resend && input.value.trim()) form.requestSubmit(); // blijft op dit apparaat
      else note('', I.t('pchatDeviceReady'));
    }, err => deviceFailed(err));
  }
  // Voortgang van de download. Tijdens een vraag (zonder Annuleren) alleen echte percentages, zodat "wordt beantwoord"
  // blijft staan.
  function showProgress(p) {
    if (devAbort?.signal.aborted || (!devAbort && p == null)) return;
    note(p == null ? I.t('pchatPreparing') : I.t('pchatDownloading', { p }), '',
      { buttons: devAbort ? [btn(I.t('pchatCancel'), () => devAbort?.abort(), true)] : [] });
  }
  // De echte tekst, zonder de placeholders van dit venster: die betekenen buiten deze kluis iets anders.
  const realText = () => D.restore(input.value.trim(), vault);
  // Liever niet versturen: na een fout op dit apparaat gaat er nooit vanzelf iets anders weg.
  async function deviceFailed(err) {
    const code = err?.device || 'failed';
    console.warn('Kamelo Private Chat: device', I.BROWSER.id, dev.backend, code, err);
    document.documentElement.dataset.deviceError = `${code}: ${String(err?.message || err).slice(0, 200)}`;
    if (code === 'reload') { // Firefox geeft browser.trial pas na de toestemming: herladen en meteen verder
      await chrome.storage.session.set({ pchatReload: { text: realText(), host: sourceHost, at: Date.now() } });
      return location.reload();
    }
    if (code === 'aborted') return note(I.t('pchatNotSentTitle'), I.t('pchatDeviceCancelled'));
    // Alleen deze vraag lukte niet: de AI op dit apparaat blijft aan.
    if (code === 'toolong' || code === 'prompt' || code === 'language') {
      return offerOther(I.t('pchatNotSentTitle'), I.t({ toolong: 'pchatTooLong', prompt: 'pchatDeviceCant', language: 'pchatDeviceCant' }[code]));
    }
    dev.reset();
    if (code === 'denied') await chrome.storage.local.set({ pchatDevice: 'declined' });
    offReason = code;
    useFallback(I.t('pchatNotSentTitle'));
  }
  // Waarom er hier geen AI op dit apparaat is, in gewone woorden.
  function offText() {
    if (offReason === 'declined' || offReason === 'denied') return I.t(offReason === 'denied' ? 'pchatDeviceDenied' : 'pchatNoDeviceDeclined');
    const fail = { blocked: 'pchatDeviceBlocked', space: 'pchatDeviceSpace', memory: 'pchatDeviceMemory', failed: 'pchatDeviceFailed' }[offReason];
    if (fail) return I.t(fail);
    if (offReason === 'slow') return I.t('pchatDeviceSlow');
    if (devInfo.why === 'old') return I.t('pchatOldFirefox');
    if (devInfo.why === 'slow') return I.t('pchatSlowFirefox');
    if (devInfo.why === 'none') return I.t('pchatNoApi');
    return I.t('pchatNoDevice', { needs: I.t(I.BROWSER.id === 'edge' ? 'pchatNeedsEdge' : 'pchatNeedsChrome') });
  }
  // Geen antwoord op dit apparaat: Plus gaat naar de chip, anders de tijdelijke chat (pas na een klik).
  function useFallback(title) {
    engine = chipAllowed() ? 'chip' : 'none'; syncAttach();
    if (engine === 'chip') { quota().then(showLeft); connect(); if (offReason) note(title || I.t('pchatNotSentTitle'), offText(), { bad: true }); else clearNote(); return; }
    connect();
    offerOther(title || I.t('pchatNoDeviceTitle'), offText());
  }
  function offerOther(title, text, extra = []) {
    note(title, text, { buttons: [btn(I.t('pchatTempChat', { site: siteName() }), openTempChat), ...extra] });
  }
  const siteName = () => (globalThis.PrivacySites?.siteFor(sourceHost)?.private ? globalThis.PrivacySites.siteFor(sourceHost).name : 'ChatGPT');
  // De echte tekst gaat via de achtergrond (werkgeheugen) naar de tijdelijke chat; daar schermt Kamelo hem af met de
  // kluis van die site. De vraag blijft hier staan tot je hem zelf weghaalt.
  async function openTempChat() {
    const site = await chrome.runtime.sendMessage({ type: 'pf:pchat-temp', text: realText(), host: sourceHost }).catch(() => null);
    if (!site) return note(I.t('pchatNotSentTitle'), I.t('pchatError'), { bad: true });
    note('', I.t('pchatTempOpened', { site }));
  }

  // ---------- verbinding controleren ----------
  // Zonder tekst alleen het slotje; de tekst blijft dan het label voor schermlezers.
  function setLock(state, text, label) {
    const lock = $('lock'), t = $('lockText');
    lock.dataset.state = state; t.textContent = text; t.hidden = !text;
    if (label) lock.setAttribute('aria-label', lock.title = label); else { lock.removeAttribute('aria-label'); lock.removeAttribute('title'); }
  }
  // Privacy boven het invoerveld: "Privé op dit apparaat" (of de versleutelde chip van Plus). Rustig; klik voor de uitleg.
  // Het slotje bovenin blijft voor de andere toestanden (controleren, niet gelukt, geen AI hier).
  function syncPrivacy() {
    const on = engine === 'device' || (engine === 'chip' && !!verified);
    $('privacy').hidden = !on;
    $('lock').hidden = engine === 'device';
    if (!on) return;
    $('privText').textContent = I.t(engine === 'device' ? 'pchatPrivateHere' : 'pchatPrivateChip');
  }
  $('privBtn').addEventListener('click', () => {
    const box = $('privInfo'), open = box.hidden;
    $('privBtn').setAttribute('aria-expanded', String(open));
    box.hidden = !open;
    if (!open) return;
    const fx = dev.backend === 'firefox-ml';
    box.replaceChildren(Object.assign(document.createElement('p'), { textContent: engine === 'device' ? I.t(fx ? 'pchatDeviceInfoFx' : 'pchatDeviceInfo') : I.t('pchatInfo') }));
    const facts = Object.assign(document.createElement('ul'), { className: 'facts' });
    for (const k of ['pchatFactAccount', 'pchatFactSaved', 'pchatFactTraining']) facts.append(Object.assign(document.createElement('li'), { textContent: I.t(k) }));
    box.append(facts);
  });
  async function connect() {
    syncPrivacy();
    if (engine === 'device') return setLock('ok', '', I.t('pchatOnDevice'));
    if (engine === 'none') return setLock('off', '', I.t('pchatNoDeviceTitle'));
    setLock('checking', I.t('pchatChecking'));
    const opts = { baseURL: relay.replace(/\/?$/, '/') };
    // Het attestatiebewijs moet over https; lokaal (http) halen we het direct bij Tinfoil op.
    if (relay.startsWith('https://')) opts.attestationBundleURL = relay.replace(/\/$/, '');
    try {
      client = new SecureClient(opts);
      await client.ready();
      verified = client.getVerificationDocument();
      if (!verified?.securityVerified) throw new Error('not verified');
      setLock('ok', I.t('pchatVerified'));
      syncPrivacy();
    } catch (e) {
      client = null; verified = null;
      setLock('bad', I.t('pchatNotVerified'));
      syncPrivacy();
      console.warn('Kamelo Private Chat: verification failed', e);
    }
  }
  $('lock').addEventListener('click', () => {
    const box = $('lockInfo');
    if (!box.hidden) return void (box.hidden = true);
    box.replaceChildren();
    const small = text => Object.assign(document.createElement('div'), { className: 'small', textContent: text });
    if (engine === 'device') {
      const fx = dev.backend === 'firefox-ml';
      const have = dev.ready || devInfo.state === 'available';
      box.append(Object.assign(document.createElement('p'), { textContent: fx && !have ? I.t('pchatDeviceOfferFx', { size: fmtGB(devInfo.download.gb) }) : I.t(fx ? 'pchatDeviceInfoFx' : 'pchatDeviceInfo') }));
      if (fx && have && !busy) {
        const rm = Object.assign(document.createElement('a'), { href: '#', textContent: I.t('pchatRemoveModel', { size: fmtGB(devInfo.download.gb) }) });
        rm.onclick = async e => {
          e.preventDefault();
          try { await dev.remove(); } catch { return void box.replaceChildren(small(I.t('pchatError'))); }
          devInfo.state = 'downloadable';
          box.replaceChildren(small(I.t('pchatModelRemoved')));
        };
        const s = small(''); s.append(rm); box.append(s);
      }
    } else if (engine === 'none') {
      box.append(Object.assign(document.createElement('p'), { textContent: offText() }));
      if (devInfo.state !== 'unavailable' && !['blocked', 'space'].includes(offReason)) {
        const use = Object.assign(document.createElement('a'), { href: '#', textContent: I.t('pchatUseDevice') });
        use.onclick = async e => {
          e.preventDefault();
          await chrome.storage.local.remove('pchatDevice');
          engine = 'device'; offReason = ''; box.hidden = true; syncAttach(); connect();
          if (devInfo.state === 'downloadable') offerDevice(false); else clearNote();
        };
        const s = small(''); s.append(use); box.append(s);
      }
    } else if (verified) {
      // Kort voor iedereen; de technische details staan achter de link (de openbare code van de enclave).
      box.append(Object.assign(document.createElement('p'), { textContent: I.t('pchatInfo') }));
      const small = document.createElement('div');
      small.className = 'small';
      const time = new Date(verified.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const link = Object.assign(document.createElement('a'), {
        href: `https://github.com/${verified.configRepo}/releases/tag/${verified.releaseTag}`,
        target: '_blank', rel: 'noopener', textContent: I.t('pchatViewCode'),
      });
      small.append(I.t('pchatCheckedAt', { time }), ' · ', link);
      box.append(small);
    } else {
      box.textContent = I.t('pchatNotVerifiedInfo');
    }
    box.hidden = false;
  });

  // ---------- tekst uit de melding overnemen ----------
  async function takeHandoff() {
    const got = await chrome.runtime.sendMessage({ type: 'pf:pchat-take' }).catch(() => null);
    const text = typeof got === 'string' ? got : got?.text;
    if (got?.host) sourceHost = got.host; // voor de tijdelijke chat: dezelfde AI-site als waar de vraag vandaan kwam
    if (!text) return false;
    handedTyped = got?.typed === true;
    if (history.length && !busy) newConv(); // een nieuwe vraag uit de melding: een eigen gesprek
    const masked = D.mask(text, vault, maskOpts()).text;
    input.value = input.value ? `${input.value}\n${masked}` : masked;
    input.focus();
    autosize();
    return true;
  }
  // De vraag komt uit de melding ("Ask Melo"): je koos al voor Melo, dus meteen stellen als de AI op
  // dit apparaat klaarstaat. Anders blijft hij in het veld staan (download aanbieden, of de tijdelijke chat).
  // Alleen als de gebruiker de tekst zelf typte of plakte; zette de site hem in het veld, dan eerst laten zien.
  let handedTyped = false;
  const canAskNow = () => handedTyped && engine === 'device' && devInfo.state === 'available' && !busy && !preparing;
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session' && changes.pchat?.newValue && await takeHandoff() && canAskNow()) form.requestSubmit();
  });
  // Alvast opstarten zodra het venster opent: de eerste vraag hoeft dan niet op de AI te wachten. Alleen als het model er
  // al is (nooit een download zonder klik).
  // Klaarzetten en opwarmen: de eerste vraag duurde anders ~12 s (model laden); nu ~3 s.
  function warmUp() { if (engine === 'device' && devInfo.state === 'available' && !dev.ready) dev.prepare().then(() => dev.warm?.(), () => {}); }

  const maskOpts = () => ({ customTerms: settings.customTerms, allowList: settings.allowList, types: settings.types });

  // ---------- weergave ----------
  const PH = /\[[A-Z]+(?:_[A-Z]+)*_\d+\]/g;
  function withChips(text, el) {
    let last = 0;
    for (const m of text.matchAll(PH)) {
      el.append(text.slice(last, m.index), Object.assign(document.createElement('span'), { className: 'chip', textContent: m[0] }));
      last = m.index + m[0].length;
    }
    el.append(text.slice(last));
  }
  // Placeholders terug naar de echte waarde, groen gemarkeerd (alleen op dit scherm).
  function withRestored(text, el) {
    let last = 0;
    for (const m of text.matchAll(PH)) {
      const real = vault.byPlaceholder[m[0]];
      el.append(text.slice(last, m.index), real
        ? Object.assign(document.createElement('span'), { className: 'back', textContent: real, title: m[0] })
        : m[0]);
      last = m.index + m[0].length;
    }
    el.append(text.slice(last));
  }
  // Opmaak (chat/rich.js): kopjes, lijsten, tabellen, formules en grafieken, allemaal als elementen, nooit als HTML.
  // streaming: het antwoord komt nog binnen (een halve grafiek wordt dan nog niet getekend).
  function renderAnswer(text, el, streaming = false) {
    KameloRich.render(text, el, { lang: I.LANG, plain: withRestored, streaming, drawing: I.t('pchatDrawing') });
  }
  // Onder een antwoord: kopiëren, als pdf (afdrukpagina) of als Word-bestand bewaren. Met de echte gegevens erin (alleen hier).
  function tools(a, answer, raw = '') {
    const X = globalThis.KameloExport;
    if (!X) return;
    const real = D.restore(answer, vault);
    const title = X.titleOf(real, conv.title);
    const row = Object.assign(document.createElement('div'), { className: 'tools' });
    const tool = (label, icon, onclick) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'tool', title: label });
      b.setAttribute('aria-label', label);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`; // vaste iconen, geen tekst van buiten
      b.append(Object.assign(document.createElement('span'), { textContent: label }));
      b.addEventListener('click', () => onclick(b));
      row.append(b);
      return b;
    };
    tool(I.t('pchatCopy'), '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>', async b => {
      await navigator.clipboard.writeText(X.plainText(real)).catch(() => {});
      b.lastChild.textContent = I.t('pchatCopied');
      setTimeout(() => { b.lastChild.textContent = I.t('pchatCopy'); }, 1500);
    });
    // Opnieuw: alleen bij het laatste antwoord; de vraag gaat nog een keer, de AI vergeet het vorige antwoord.
    if (raw) tool(I.t('pchatRetry'), '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>', () => {
      const box = row(a);
      if (busy || box !== conv.thread.lastElementChild) return;
      const u = box.previousElementSibling;
      box.remove(); if (u?.classList.contains('u')) u.remove();
      history.splice(-2, 2);
      // Alleen uit het geheugen van de AI halen wat daar echt staat (een gestopt antwoord staat er niet in).
      if (conv.turns.at(-1)?.content === answer.trim()) conv.turns.splice(-2, 2);
      dev.release?.();
      clearNote();
      input.value = raw; autosize();
      form.requestSubmit();
    }).classList.add('retry');
    tool(I.t('pchatPdf'), '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', async () => {
      const k = `meloDoc-${Date.now()}`;
      await chrome.storage.session.set({ [k]: { text: real, title, lang: I.LANG } });
      chrome.tabs.create({ url: chrome.runtime.getURL(`chat/doc.html?k=${k}`) });
    });
    tool(I.t('pchatWord'), '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12l1.2 5 1.8-4 1.8 4 1.2-5"/>', async () => {
      X.download(await X.docx(real, { title, lang: I.LANG }), X.fileName(title, 'docx'));
    });
    a.append(row);
  }
  // melo-face.js zet elk antwoord met Melo's hoofdje in een rij (.mf-row); weghalen en vergelijken gaat dan via die rij.
  const row = a => a.closest('.mf-row') || a;
  function bubble(cls) {
    conv.thread.querySelector('.empty')?.remove();
    const d = document.createElement('div');
    d.className = cls;
    conv.thread.append(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function note(title, text, { bad = false, button = null, buttons = [] } = {}) {
    const n = $('note');
    n.className = 'note' + (bad ? ' bad' : '');
    n.replaceChildren();
    if (title) n.append(Object.assign(document.createElement('b'), { textContent: title }));
    n.append(text);
    const all = [button, ...buttons].filter(Boolean);
    if (all.length) {
      const row = Object.assign(document.createElement('div'), { className: 'btns' });
      row.append(...all);
      n.append(row);
    }
    n.hidden = false;
  }
  const clearNote = () => { $('note').hidden = true; };
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, innerHeight * .4) + 'px'; }
  input.addEventListener('input', () => { autosize(); typing(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });

  // ---------- bestanden en afbeeldingen (alleen Business, alleen de AI op dit apparaat) ----------
  // Paperclip, plakken (⌘V) of slepen. Kamelo leest het bestand op dit apparaat (chat/read.js): een afbeelding gaat als
  // beeld naar de AI, de rest als tekst achter je vraag, afgeschermd net als wat je typt. Nooit naar de chip van Plus,
  // en niet in de gratis editie (die heeft de lezers niet).
  const R = WORK && globalThis.KameloPdf && globalThis.KameloRead;
  // Een functie (geen const): hij wordt ook aangeroepen vanuit code hierboven, zodra bekend is welke AI antwoordt.
  function syncAttach() { $('attach').hidden = !(WORK && globalThis.KameloPdf && globalThis.KameloRead) || engine !== 'device'; }

  const MAX_ATTACH = 3;
  // Zoveel tekst uit bestanden per vraag: de AI op dit apparaat kan maar een paar pagina's tegelijk aan.
  const FILE_CHARS = 6000;
  let atts = [];
  const attBox = $('atts');
  function attStrip(list, el) {
    for (const a of list) {
      const item = Object.assign(document.createElement('span'), { className: 'att' });
      if (a.kind === 'image') item.append(Object.assign(document.createElement('img'), { src: a.dataUrl, alt: '' }));
      else item.append(Object.assign(document.createElement('span'), { className: 'doc', textContent: (a.name.match(/\.(\w+)$/)?.[1] || '').toUpperCase().slice(0, 4) }));
      item.append(Object.assign(document.createElement('span'), { className: 'nm', textContent: a.name }));
      el.append(item);
    }
    return el;
  }
  function drawAtts() {
    attBox.replaceChildren();
    attStrip(atts, attBox);
    [...attBox.children].forEach((item, i) => {
      const x = Object.assign(document.createElement('button'), { type: 'button', className: 'x', textContent: '×', title: I.t('pchatRemove', { name: atts[i].name }) });
      x.setAttribute('aria-label', x.title);
      x.addEventListener('click', () => { atts.splice(i, 1); drawAtts(); input.focus(); });
      item.append(x);
    });
    attBox.hidden = !atts.length;
  }
  async function addFiles(list) {
    if (!R || engine !== 'device') return;
    for (const f of [...list]) {
      if (atts.length >= MAX_ATTACH) { note('', I.t('pchatMaxFiles', { max: MAX_ATTACH })); break; }
      const r = await R.read(f);
      if (r.kind === 'unreadable') { note('', I.t(r.why === 'big' ? 'pchatTooBig' : 'pchatUnreadable', { name: r.name })); continue; }
      atts.push(r);
    }
    drawAtts();
    input.focus();
  }
  if (R) {
    $('file').accept = R.ACCEPT;
    $('attach').addEventListener('click', () => $('file').click());
    $('file').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    // Alleen een plaatje plakken; tekst uit Word komt soms met een plaatje mee, dan gewoon de tekst.
    input.addEventListener('paste', e => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.length && !e.clipboardData.types.includes('text/plain')) { e.preventDefault(); addFiles(files); }
    });
    form.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); form.classList.add('drop'); } });
    form.addEventListener('dragleave', () => form.classList.remove('drop'));
    form.addEventListener('drop', e => { form.classList.remove('drop'); if (e.dataTransfer?.files?.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  }
  syncAttach();

  // ---------- versturen, stoppen ----------
  // Tijdens een antwoord wordt de verstuurknop een stopknop.
  let stopper = null, stopped = false, partial = '';
  const SEND_ICON = $('send').innerHTML;
  function setSend(mode) {
    const b = $('send'), stop = mode === 'stop';
    b.classList.toggle('stop', stop);
    b.innerHTML = stop ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>' : SEND_ICON;
    b.setAttribute('aria-label', b.title = I.t(stop ? 'pchatStop' : 'pchatSend'));
    b.disabled = false;
  }
  $('send').addEventListener('click', e => {
    if (!busy) return;
    e.preventDefault();
    if (stopper && !stopped) { stopped = true; stopper.abort(); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const raw = input.value.trim();
    if ((!raw && !atts.length) || busy || preparing) return;
    // Op dit apparaat: eerst de download (na een klik). Er gaat niets weg.
    if (engine === 'device' && !dev.ready && devInfo.state === 'downloadable') return offerDevice(true);
    if (engine === 'none') return useFallback();
    if (engine === 'chip' && (await quota()) >= FREE_PER_DAY) {
      const plus = btn(I.t('pchatPlus'), null);
      plus.disabled = true;
      return note(I.t('pchatLimitTitle', { max: FREE_PER_DAY }), I.t('pchatLimit'), { button: plus });
    }
    if (engine === 'chip' && !client) await connect();
    if (engine === 'chip' && !client) return note(I.t('pchatNotVerified'), I.t('pchatNotSent'), { bad: true });

    if (atts.length && engine !== 'device') { atts = []; drawAtts(); syncAttach(); }
    const sent = atts, images = sent.filter(x => x.kind === 'image'), docs = sent.filter(x => x.kind === 'text');
    if (images.length && engine === 'device' && !(await dev.canSee())) return note('', I.t('pchatNoImages'));
    // Zonder vraag: "Wat staat hierop?" of "Vat dit samen."
    const question = raw || I.t(images.length && !docs.length ? 'pchatAskImage' : 'pchatAskFile');
    let room = FILE_CHARS;
    const cutNames = [];
    const fileText = docs.map(d => {
      let t = d.text;
      if (t.length > room) { t = t.slice(0, Math.max(0, room)); cutNames.push(d.name); }
      room -= t.length;
      return `\n\n[${d.name}]\n${t}`;
    }).join('');
    const label = sent.map(x => `[${x.name}]`).join(' ');
    const masked = D.mask(question, vault, maskOpts()).text;
    const prompt = masked + (fileText ? D.mask(fileText, vault, maskOpts()).text : '');
    if (!conv.title) setTitle(conv, D.restore(masked, vault));
      const userMsg = { role: 'user', content: prompt };
    history.push(userMsg);
    const u = bubble('u');
    if (sent.length) u.append(attStrip(sent, Object.assign(document.createElement('div'), { className: 'atts sent' })));
    withChips(masked, u);
    if (PH.test(masked)) u.append(Object.assign(document.createElement('span'), { className: 'seen', textContent: I.t('pchatSeen') }));
    PH.lastIndex = 0;
    input.value = ''; autosize(); clearNote();
    atts = []; drawAtts();
    const fixed = sent.length ? '' : GREETING.test(raw) ? I.t(WORK ? 'pchatGreetingWork' : 'pchatGreeting')
      : isPrivacy(raw) ? I.t(engine === 'device' ? 'pchatPrivacyDevice' : 'pchatPrivacyChip') : '';
    if (fixed) {
      const hi = fixed;
      history.push({ role: 'assistant', content: hi });
      renderAnswer(hi, bubble('a'));
      msgs.scrollTop = msgs.scrollHeight;
      return;
    }

    const task = taskHint(raw);
    busy = true; stopper = new AbortController(); stopped = false; partial = '';
    setSend('stop'); syncConvButtons(); typing();
    const signal = stopper.signal;
    const a = bubble('a');
    a.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    const t0 = performance.now();
    try {
      if (engine === 'device') {
        // Firefox geeft het antwoord in één keer; Chrome en Edge woord voor woord.
        if (dev.backend === 'firefox-ml') note('', I.t('pchatThinkingDevice'));
        // Eén keer per beeldje tekenen: woord voor woord opnieuw opbouwen laat het antwoord haperen.
        let latest = '', frame = 0;
        onChunk = text => {
          latest = partial = text;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const follow = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
            a.replaceChildren(); renderAnswer(latest, a, true);
            if (follow) msgs.scrollTop = msgs.scrollHeight;
          });
        };
        if (images.length) note('', I.t('pchatLooking'));
        let answer = images.length
          ? await dev.askImage(prompt, images.map(x => x.blob), label, text => onChunk?.(text), signal)
          : await dev.ask(prompt, text => onChunk?.(text), signal, { hint: (await langHint(raw)) + task.hint, max: task.max });
        onChunk = null; cancelAnimationFrame(frame);
        answer = trimFiller(answer);
        clearNote();
        if (cutNames.length) note('', I.t('pchatFileCut', { name: cutNames.join(', ') }));
        history.push({ role: 'assistant', content: answer });
        a.replaceChildren();
        renderAnswer(answer || '…', a);
        if (answer) tools(a, answer, sent.length ? '' : raw); // opnieuw alleen zonder bijlagen
        const st = dev.stats;
        debug(`op dit apparaat (${dev.backend}), ${((performance.now() - t0) / 1000).toFixed(1)} s`, st);
        if (st?.cut) note('', I.t('pchatCutShort'));
        // Een afbeelding of lang bestand is altijd trager: dat zegt niets over de snelheid van deze computer.
        if (!sent.length) await checkSpeed(st, performance.now() - t0);
        return;
      }
      const res = await client.fetch('/v1/chat/completions', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, max_tokens: MAX_TOKENS, stream: true, stream_options: { include_usage: true },
          // De aanwijzing per soort vraag (bv. het grafiekformaat) alleen bij deze vraag, niet in het gesprek bewaard.
          messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-HISTORY_KEEP).map((m, i, l) => (i === l.length - 1 && task.hint ? { ...m, content: `${m.content}\n\n(${task.hint.trim()})` } : m))],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw Object.assign(new Error(`HTTP ${res.status}`), { code: body?.error?.code, status: res.status });
      }
      // Woord voor woord: het eerste stuk staat er meestal binnen een halve seconde.
      let answer = '', cut = false, usage = null, buf = '';
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const m = line.match(/^data: (.*)$/);
          if (!m || m[1] === '[DONE]') continue;
          let j; try { j = JSON.parse(m[1]); } catch { continue; }
          const d = j.choices?.[0]?.delta?.content;
          if (j.choices?.[0]?.finish_reason === 'length') cut = true;
          if (j.usage) usage = j.usage;
          if (d) { answer += d; partial = answer; a.replaceChildren(); renderAnswer(answer, a, true); msgs.scrollTop = msgs.scrollHeight; }
        }
      }
      answer = trimFiller(answer.trim());
      if (usage) debug('tokens', usage, `${((performance.now() - t0) / 1000).toFixed(1)} s`);
      history.push({ role: 'assistant', content: answer });
      a.replaceChildren();
      renderAnswer(answer || '…', a);
      if (answer) tools(a, answer, raw);
      if (cut) note('', I.t('pchatCut'));
      else if (cutNames.length) note('', I.t('pchatFileCut', { name: cutNames.join(', ') }));
      await useOne();
    } catch (err) {
      // Zelf gestopt: wat er al stond blijft staan (de AI onthoudt het half afgemaakte antwoord niet).
      if (stopped) {
        onChunk = null;
        const text = partial.trim();
        a.replaceChildren();
        if (text) {
          renderAnswer(`${text} …`, a);
          a.append(Object.assign(document.createElement('p'), { className: 'stopped', textContent: I.t('pchatStopped') }));
          history.push({ role: 'assistant', content: text }); tools(a, text, raw);
        } else { row(a).remove(); u.remove(); history.pop(); input.value = raw; autosize(); note('', I.t('pchatStopped')); }
        return;
      }
      history.pop();
      row(a).remove();
      u.remove();
      atts = sent; drawAtts();
      if (!history.length) { setTitle(conv, ''); if (!conv.thread.children.length) conv.thread.append(emptyState()); }
      input.value = raw; autosize();
      if (err.device) return void deviceFailed(err);
      console.warn('Kamelo Private Chat:', err);
      const msg = err.code === 'no_key' ? I.t('pchatNoKey')
        : err.status === 401 ? I.t('pchatBadKey')
        : err.name === 'AttestationError' ? I.t('pchatNotVerified')
        : err instanceof TypeError ? I.t('pchatNoRelay', { relay })
        : I.t('pchatError');
      note(I.t('pchatNotSentTitle'), msg, { bad: true });
    } finally {
      busy = false; stopper = null; setSend('send'); syncConvButtons(); typing();
      msgs.scrollTop = msgs.scrollHeight;
    }
  });

  // ---------- snelheid en geheugen ----------
  // Te traag: eerst een melding, de tweede keer achter elkaar voortaan de tijdelijke chat (alleen op deze computer).
  async function checkSpeed(st, totalMs) {
    if (!st || dev.backend !== 'prompt-api') return;
    const { pchatSlow = 0 } = await chrome.storage.local.get('pchatSlow');
    if (!isSlow(st)) { if (pchatSlow) await chrome.storage.local.remove('pchatSlow'); return; }
    if (pchatSlow >= 1) {
      await chrome.storage.local.set({ pchatDevice: 'slow' });
      await chrome.storage.local.remove('pchatSlow');
    } else await chrome.storage.local.set({ pchatSlow: 1 });
    note('', I.t('pchatSlowNote', { s: Math.round(totalMs / 1000) }));
  }
  // Paneel een minuut niet in beeld, of dicht: de AI loslaten, zodat de computer zijn geheugen terugkrijgt.
  let hiddenTimer = null;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(hiddenTimer);
    if (document.hidden && !busy) hiddenTimer = setTimeout(() => { if (!busy) dev.release?.(); }, 60 * 1000);
  });
  addEventListener('pagehide', () => dev.release?.());

  // ---------- start ----------
  (async () => {
    newConv();
    const { settings: s } = await chrome.storage.local.get('settings');
    settings = { ...C.DEFAULT_SETTINGS, ...(s || {}) };
    // Kamelo Business: het beleid van de organisatie (policy.js) geldt ook hier, bijv. eigen termen die altijd worden afgeschermd.
    if (globalThis.KameloPolicy) {
      // Niets laden, geen vraag aannemen; alleen een regel uitleg.
      const off = async text => {
        await chrome.storage.session.remove('pchat').catch(() => {});
        const note = document.createElement('p');
        note.className = 'org-off';
        note.textContent = text;
        msgs.replaceChildren(note);
        form.hidden = true;
        document.documentElement.dataset.engine = 'off';
      };
      // Kamelo Business zonder geldige licentie (src/licence.js, gecontroleerd in de achtergrond): ook geen Private Chat.
      const licence = await chrome.runtime.sendMessage({ type: 'pf:licence' }).catch(() => null);
      if (licence?.active !== true) return off(I.t('pchatInactive'));
      const policy = await globalThis.KameloPolicy.read();
      settings = globalThis.KameloPolicy.merge(settings, policy);
      // De organisatie heeft Private Chat uitgezet.
      if (policy.privateChat === false) return off(I.t('pchatOffByOrg'));
    }
    relay = settings.privateChatRelay || RELAY_DEFAULT;
    // De vraag uit de melding meteen in beeld, terwijl we nagaan welke AI kan antwoorden.
    const handed = await takeHandoff();
    devInfo = await dev.detect();
    const { pchatDevice } = await chrome.storage.local.get('pchatDevice');
    const usable = devInfo.state !== 'unavailable';
    // 'declined': je koos "Niet nu"; 'slow': op deze computer twee keer te traag. Allebei terug te draaien via het slotje.
    const turnedOff = pchatDevice === 'declined' || pchatDevice === 'slow';
    engine = FORCE !== 'chip' && usable && (FORCE === 'device' || !turnedOff) ? 'device'
      : chipAllowed() ? 'chip' : 'none';
    debug(I.BROWSER.id, dev.backend, devInfo.state, devInfo.langs.join(','), '→', engine);
    Object.assign(document.documentElement.dataset, { engine, backend: dev.backend, device: devInfo.state }); // voor tests en schermlezers niet zichtbaar
    syncAttach();
    if (engine === 'chip') showLeft(await quota()); else $('hint').textContent = '';
    if (engine === 'none' && turnedOff) offReason = pchatDevice;
    warmUp();
    // Na herladen voor Firefox' toestemming: de vraag terug (opnieuw afgeschermd) en meteen verder met de download.
    const { pchatReload: back } = await chrome.storage.session.get('pchatReload');
    if (back) await chrome.storage.session.remove('pchatReload');
    const resume = back && Date.now() - back.at < 60000;
    if (resume) {
      if (back.host) sourceHost = back.host;
      if (back.text) { input.value = D.mask(back.text, vault, maskOpts()).text; autosize(); }
    }
    connect();
    // Bij het openen nooit downloaden: alleen aanbieden. Kan het hier niet, dan meteen zeggen wat wel kan.
    if (engine === 'device' && devInfo.state === 'downloadable' && resume) startDownload(!!input.value.trim());
    else if (engine === 'device' && devInfo.state === 'downloadable') offerDevice(false);
    else if (engine === 'none') useFallback();
    else if (handed && canAskNow()) form.requestSubmit();
  })();
})();
