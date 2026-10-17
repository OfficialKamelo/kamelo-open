// Melo's vangrails: wat de kleine AI van Chrome vaak fout doet, zet Kamelo in code recht. Op dit apparaat, zonder netwerk.
// - Taal: de Prompt API kent Nederlands niet officieel en antwoordt op korte Nederlandse vragen vaak in het Engels.
//   detect() herkent nl, en, de, fr en es aan veelgebruikte woorden, ook in korte zinnen ("Wat is 2 + 2?");
//   pickLang() kiest de taal van het antwoord; langHint() zegt het de AI in zijn eigen taal én in het Engels.
// - Vorm: tidy() haalt opvulzinnen weg ("Ik hoop dat dit helpt!", "Laat het me weten"), een loze aanloop ("Natuurlijk, ik
//   kan een grafiek voor je maken."), invulplekken als [jouw telefoonnummer], en zet losse LaTeX (\boxed{5}) om.
// Alles hier zijn gewone functies op tekst: te testen zonder browser (tests/guard.test.js).
(() => {
  'use strict';
  const LANGS = ['nl', 'en', 'de', 'fr', 'es'];
  const NAME = { nl: 'Dutch', en: 'English', de: 'German', fr: 'French', es: 'Spanish' };

  // ---------- taal ----------
  // Veelgebruikte woorden per taal. Woorden die in meer talen voorkomen (de, is, was, wie, en) tellen voor elk daarvan; de
  // woorden die maar in één taal staan beslissen.
  const WORDS = {
    nl: 'de het een en van ik je jij jouw mijn wat hoe hoeveel waarom waar wie welke welk niet dat dit is zijn met voor op ook maar heb heeft hebben kan kun kunt wil wordt worden mij me ons onze hun er nog al naar bij uit om te dan als zo geen wel moet moeten zou zal kunnen doen gaat ga weet vind graag echt even nu hier daar deze die dus want omdat toch iets niets veel meer heel erg goed jaar keer bereken leg uit los vandaag morgen gisteren beter nee ja nou hoor joh voel voelt verdrietig moe bang boos blij teken grafiek schrijf brief help helpen vraag vragen',
    en: 'the a an and of i you your my what how why where who which not that this is are was were with for on also but have has had can could would should will me us our their there still to from by if so no yes do does did be been it its about just really very good thanks please explain calculate solve today tomorrow yesterday better feel feeling sad tired scared angry happy draw chart write letter help question',
    de: 'der die das den dem des ein eine einen und von ich du dein deine mein meine was wie warum wo wer welche welcher nicht dass ist sind war mit für auf auch aber habe hast hat kann kannst will wird mir mich uns unser ihr es noch zu nach bei aus um dann wenn so kein keine muss sollte bitte gut sehr heute morgen gestern erkläre berechne löse besser bin bist fühle traurig müde angst wütend froh zeichne schreibe brief hilfe frage ja nein',
    fr: 'le la les un une et de du des je tu ton ta tes mon ma mes quoi comment pourquoi où qui quel quelle quels ne pas que qu est sont était avec pour sur aussi mais ai as peux veux sera moi toi nous notre leur il elle en au aux si non oui très bien merci aujourd demain hier explique calcule résous mieux suis es sens triste fatigué peur content dessine écris lettre aide question',
    es: 'el la los las un una y de del yo tu tú mi mis qué que cómo como por porque dónde quién cuál no es son era con para en también pero tengo tienes tiene puedo quiero será me nos nuestro su sus hay si sí muy bien gracias hoy mañana ayer explica calcula resuelve mejor estoy estás está siento triste cansado miedo feliz dibuja escribe carta ayuda pregunta',
  };
  const DICT = new Map();
  for (const l of LANGS) for (const w of WORDS[l].split(' ')) DICT.set(w, [...(DICT.get(w) || []), l]);
  // Tekens die bij één taal horen.
  const MARKS = { de: /[äöüß]/g, fr: /[àâçéèêëîïôûœ]|\bl['’]|\bd['’]|\bj['’]|\bqu['’]|\bc['’]est/g, es: /[ñ¿¡]|[áíóú](?![a-z]*[äöü])/g, nl: /\bij\w|\w+ij\b|\b'(?:t|s)\b/g };
  // Wat geen taal is: code, formules, getallen, links.
  const strip = t => String(t || '').replace(/(?<!\p{L})[a-z](?=\s*[=^+\-*/(<>²³])|(?<=[=+\-*/^(]\s*)[a-z](?!\p{L})/gu, ' ').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\(.*?\\\)|`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ').replace(/\[[A-Z][A-Z_]*_\d+\]/g, ' ').replace(/[\d.,:;+\-*/^=()%€$]+/g, ' ');
  function detect(text) {
    const score = { nl: 0, en: 0, de: 0, fr: 0, es: 0 };
    const t = strip(text).toLowerCase();
    let words = 0;
    for (const w of t.match(/\p{L}+(?:['’]\p{L}+)?/gu) || []) {
      words++;
      const ls = DICT.get(w);
      if (ls) for (const l of ls) score[l] += 1 / ls.length;
    }
    for (const l of LANGS) if (MARKS[l]) score[l] += Math.min(3, (t.match(MARKS[l]) || []).length * 0.5);
    const ranked = LANGS.slice().sort((a, b) => score[b] - score[a]);
    const best = ranked[0], s1 = score[best], s2 = score[ranked[1]];
    // zeker: genoeg bewijs én duidelijk meer dan de tweede taal
    const sure = s1 >= 1.5 && s1 >= s2 * 1.6 + 0.3;
    return { lang: s1 > 0 ? best : null, sure, score, words, margin: s1 - s2 };
  }
  // Taal van het antwoord. Volgorde: een duidelijke vraag (eigen woorden of de taalherkenner van Chrome), anders het vorige
  // bericht, anders de taal van de browser. Korte, losse berichten ("ok", "haha", "nee grapje melo ily") houden de vorige taal.
  function pickLang(q, { ui = 'en', last = null, chrome = null } = {}) {
    const own = detect(q);
    const keep = LANGS.includes(last) ? last : LANGS.includes(ui) ? ui : 'en';
    if (own.sure) return own.lang;
    const words = own.words;
    if (chrome && LANGS.includes(chrome.detectedLanguage) && words >= 3) {
      const need = chrome.detectedLanguage === keep ? 0.5 : words >= 8 ? 0.85 : 0.97;
      if (chrome.confidence >= need && (!own.lang || own.score[chrome.detectedLanguage] >= own.score[own.lang] - 0.5)) return chrome.detectedLanguage;
    }
    // Een beetje bewijs telt alleen als het de vorige taal niet tegenspreekt of er duidelijk boven zit.
    if (own.lang && own.margin >= 1 && own.score[own.lang] >= 1.5) return own.lang;
    return keep;
  }
  // De taalaanwijzing in het Engels (dat leest de AI het best) én in de taal zelf (dat volgt hij beter).
  const SAY = { nl: 'Antwoord in het Nederlands.', en: 'Answer in English.', de: 'Antworte auf Deutsch.', fr: 'Réponds en français.', es: 'Responde en español.' };
  const STRONG = { nl: 'Antwoord alleen in het Nederlands, nooit in het Engels.', en: 'Answer only in English.', de: 'Antworte nur auf Deutsch, nie auf Englisch.', fr: 'Réponds uniquement en français, jamais en anglais.', es: 'Responde solo en español, nunca en inglés.' };
  function langHint(lang, strong = false) {
    if (!LANGS.includes(lang)) return 'Reply in the language of the user’s message.';
    return strong ? `Reply only in ${NAME[lang]}, not in any other language. ${STRONG[lang]}` : `Reply in ${NAME[lang]}. ${lang === 'en' ? '' : SAY[lang]}`.trim();
  }
  // Is dit (gedeeltelijke) antwoord duidelijk in een andere taal? Pas na genoeg tekst: formules en getallen tellen niet mee.
  function wrongLang(answer, lang, { min = 60 } = {}) {
    if (!LANGS.includes(lang)) return false;
    const plain = strip(answer);
    if (plain.replace(/\s+/g, ' ').trim().length < min) return false;
    const d = detect(answer);
    return !!d.lang && d.lang !== lang && d.sure && d.score[d.lang] >= d.score[lang] * 2 + 1;
  }

  // ---------- opvulzinnen ----------
  // Zinnen die niets zeggen, aan het eind (en soms midden in de laatste alinea). Een echte vraag aan de gebruiker blijft.
  const FILLER = [
    /^(ik hoop|hopelijk)\b.{0,80}\b(helpt|duidelijk|nuttig|bruikbaar|handig|verder|op weg|antwoord op je vraag)\b/i,
    /^laat (het )?(me|mij) (gerust |vooral )?weten\b/i, /^(vraag|stel)( het| je vraag| gerust)? gerust\b/i, /^(je kunt|u kunt) (me|mij) (altijd |gerust )?(iets )?(vragen|meer vragen)\b/i,
    /^(is er|heb je|kan ik|wil je|zijn er)\s+(nog\s+)?(iets anders|andere vragen|verder nog iets|meer vragen|ergens anders|nog vragen)\b/i, /^(nog )?(andere |meer )?vragen\?/i,
    /^is there anything (specific|particular|more|in particular)\b[^?]*\b(know|ask|help)\b/i, /^(would you like|do you want) (to know|me to) (more|anything)\b/i,
    /^is er (nog )?iets (specifieks|bepaalds|in het bijzonder)\b[^?]*\b(weten|vragen|helpen)\b/i, /^(wil je|wilt u) (er )?(nog )?(meer )?(weten|iets weten)\b/i,
    /^gibt es (etwas|noch etwas) (bestimmtes|besonderes)\b/i, /^y a-t-il quelque chose (de particulier|en particulier)\b/i, /^¿?hay algo (en particular|espec[íi]fico)\b/i,
    /^(i )?hope (this|that|it)\b/i, /^(i['’]?m |i am )?glad you asked\b/i, /^that['’]?s an? (simple|good|great|easy|nice|interesting) (one|question)\b/i, /^(what an? |that['’]?s an? )?(good|great|excellent|interesting) question\b/i,
    /^(wat een |dat is een )?(goede|leuke|mooie|interessante|makkelijke|simpele) (vraag|som)\b/i, /^hopefully (this|that|it)\b/i, /^let me know\b/i, /^feel free\b/i, /^(is there )?anything else\b/i, /^(do you have )?any (other|more|further) questions\b/i,
    /^(i['’]?m |i am )?(happy|glad) (i could |to )?help\b/i, /^(if you have|should you have) (any )?(other |more |further )?questions\b/i, /^don['’]?t hesitate\b/i,
    /^(ich hoffe|hoffentlich)\b.{0,60}\b(hilft|hilfreich|weiter|klar)\b/i, /^lass (es )?mich wissen\b/i, /^(gibt es|hast du) (noch )?(etwas anderes|weitere fragen|andere fragen)\b/i, /^(melde dich|frag) (gerne|ruhig)\b/i, /^wenn du (noch )?(weitere |andere )?fragen hast\b/i,
    /^j['’]esp[èe]re que (cela|ça|cette|ce|c['’])\b.{0,40}\b(aide|utile|clair)\b/i, /^n['’]h[ée]site[sz]? pas\b/i, /^(y a-t-il|as-tu|avez-vous) (autre chose|d['’]autres questions)\b/i, /^si (tu as|vous avez) (d['’]autres|des) questions\b/i,
    /^espero que (esto|esta|te|le|haya)\b.{0,40}\b(ayud|[úu]til|sirv|claro)\w*/i, /^no dudes\b/i, /^(av[íi]same|dime) si\b/i, /^¿?(hay|tienes) algo m[áa]s\b/i, /^si tienes (m[áa]s|otras) preguntas\b/i,
  ];
  const isFiller = s => FILLER.some(re => re.test(s.trim().replace(/^[*_]+|[*_]+$/g, '')));
  // Een loze aanloop aan het begin ("Natuurlijk, ik kan een grafiek voor je maken.", "Okay, let's solve for x:").
  const OPENER = [
    /^(natuurlijk|zeker|prima|ok[eé]?|tuurlijk|goed|ja)[,!.]?\s+(ik (kan|zal|help|maak|teken|schrijf|leg|reken)|hier (is|zijn|komt)|laten we|laat ik|dat kan|dat doe ik|met plezier|graag)\b[^.!?\n]*[.!:]\s*/i,
    /^ik (kan|zal|ga) (een |de |je )?(grafiek|diagram|brief|tekst|berekening)\b[^.!?\n]*[.!:]\s*/i,
    /^(sure|certainly|of course|okay|ok|absolutely|alright|great)[,!.]?\s+(i (can|will|'ll|'d be|would be)|here('s| is| are)|let['’]?s|that['’]?s|happy|glad)\b[^.!?\n]*[.!:]\s*/i,
    /^i (can|will|'ll) (make|draw|create|write|plot) (a |the |you a )?(chart|graph|plot|letter|diagram)\b[^.!?\n]*[.!:]\s*/i,
    /^(natürlich|klar|gerne|gern|sicher|okay|ok)[,!.]?\s+(ich (kann|werde|helfe|zeichne|schreibe|rechne)|hier (ist|sind)|lass(t)? uns)\b[^.!?\n]*[.!:]\s*/i,
    /^(bien s[ûu]r|d['’]accord|certainement|ok|okay|avec plaisir)[,!.]?\s+(je (peux|vais)|voici|voil[àa]|allons-y|calculons)\b[^.!?\n]*[.!:]\s*/i,
    /^(claro|por supuesto|vale|de acuerdo|ok|okay|con gusto)[,!.]?\s+(puedo|voy a|aqu[íi] (est[áa]|tienes)|vamos a)\b[^.!?\n]*[.!:]\s*/i,
  ];

  // ---------- invulplekken ----------
  // [jouw telefoonnummer], [Your Address], [Naam bedrijf]. Niet: [PERSON_1] (Business), [x] en [ ] (lijstjes), [1] (bron),
  // [tekst](link).
  const PH = /\[(?![A-Z][A-Z_]*_\d+\])(?!\s*[xX]?\s*\])(?=[^\]\n]*\p{L})([^[\]\n]{2,60})\](?!\()/gu;
  const hasPH = t => { PH.lastIndex = 0; const r = PH.test(t); PH.lastIndex = 0; return r; };
  const GREET = {
    nl: [[/^(\s*)(geachte|zeer geachte)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Geachte heer/mevrouw,'], [/^(\s*)(beste|hallo|hoi|lieve)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Hallo,']],
    en: [[/^(\s*)(dear)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Dear Sir or Madam,'], [/^(\s*)(hi|hello|hey)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Hello,']],
    de: [[/^(\s*)(sehr geehrte[rn]?)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Sehr geehrte Damen und Herren,'], [/^(\s*)(liebe[rs]?|hallo|hi)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Hallo,']],
    fr: [[/^(\s*)(madame|monsieur|cher|ch[èe]re)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Madame, Monsieur,'], [/^(\s*)(bonjour|salut)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Bonjour,']],
    es: [[/^(\s*)(estimad[oa]s?)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Estimado/a señor/a:'], [/^(\s*)(hola|querid[oa]s?)\b[^,\n:]*\[[^\]]+\][^,\n:]*([,:]?)/im, '$1Hola:']],
  };
  // Zinnen om je te bereiken met een invulplek: de hele zin eruit (er is niets in te vullen).
  const CONTACT = /bereik|contact|telefoon|e-?mail|mail|bel(len)?\b|reach|call me|phone|erreich|kontakt|telefon|joindre|t[ée]l[ée]phone|contactar|llamar|tel[ée]fono|correo/i;
  // "bij [bedrijf]", "at [Your Address]": het stukje met het voorzetsel eruit.
  const PREP = /[ \t]*(?:\b(?:op|in|bij|aan|via|te|van|naar|voor|uit|at|on|via|to|from|for|of|with|an|bei|von|zu|f[üu]r|aus|mit|am|im|chez|par|pour|avec|au|aux|en|para|desde|con|del)\s+)(?:(?:de|het|the|der|die|das|dem|den|le|la|les|l['’]|el|los|las|mijn|my|mein|mon|ma|mi)\s+)?\[[^\]\n]{2,60}\](?!\()/gi;
  function placeholders(text, lang) {
    if (!hasPH(text)) return text;
    let t = text;
    for (const [re, to] of GREET[lang] || GREET.en) t = t.replace(re, to);
    const lines = t.split('\n').map(line => {
      if (!hasPH(line)) return line;
      // Alleen invulplekken (en eventueel een label): weg. "[Je naam]", "Datum: [datum]", "[Postcode] [Plaats]".
      const rest = line.replace(PH, '').replace(/^[\s>*\-•]*(?:[\p{L} ]{1,25}:)?/u, '').replace(/[\s,;:.\-–|*_]+/g, '');
      if (!rest) return null;
      // per zin
      const parts = line.match(/[^.!?]+[.!?]*\s*/g) || [line];
      const out = [];
      for (let p of parts) {
        if (!hasPH(p)) { out.push(p); continue; }
        if (CONTACT.test(p) || (p.match(PH) || []).length > 1) continue;
        p = p.replace(PREP, '');
        if (hasPH(p)) continue;
        out.push(p);
      }
      const joined = out.join('').replace(/\s+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trimEnd();
      return joined.trim() ? joined : null;
    });
    return lines.filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  }

  // ---------- losse LaTeX ----------
  // In de tekst (niet tussen $…$) een \boxed{5}, \frac{1}{2} of x^{2}: als formule laten tekenen, anders ziet iemand de code.
  const TEXCMD = /\\(?:boxed|d?frac|tfrac|sqrt|cdot|times|div|pm|approx|neq?|leq?|geq?|pi|alpha|beta|gamma|theta|lambda|mu|sigma|omega|Delta|infty|sum|int|text|mathrm|mathbf|left|right|quad|Rightarrow|rightarrow|to|degree|circ|angle)(?![a-zA-Z])(?:\s*\{(?:[^{}]|\{[^{}]*\})*\}|\s*\[[^\]]*\]|\d)*|[a-zA-Z0-9)]\^\{[^{}]*\}/g;
  function looseTex(text) {
    // alles wat al een formule, code of grafiek is overslaan
    return text.split(/(```[\s\S]*?(?:```|$)|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|`[^`\n]*`)/).map((part, i) => {
      if (i % 2) return part.replace(/\\boxed\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
      return part.replace(/\\boxed\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, '**$$$1$$**').replace(TEXCMD, m => `$${m}$`).replace(/\*\*\$\$([^$]*)\$\$\*\*/g, (m, x) => `**$${x}$**`)
        // Een formule als platte tekst: een regel met alleen rekentekens ("9+16=c^2", "c=√(25)=5"), of in een zin "a^2+b^2=c^2".
        .replace(/^([ \t]*)([\w+\-*/=^()√.,² ³·×−]+?)[ \t]*$/gm, (m, ind, x) => ((/[\^√²³]/.test(x) || (/=/.test(x) && /(?<!\p{L})[a-z](?!\p{L})/u.test(x))) && !/\p{L}{3,}/u.test(x) && /[-+*/=^]/.test(x) ? `${ind}$${x.trim()}$` : m))
        .replace(/(?<![\w$\\^])((?:[a-zA-Z0-9]|\([^()\s]{1,12}\))+\^\d+(?:\s*[-+*/=]\s*(?:[a-zA-Z0-9]|\([^()\s]{1,12}\))+(?:\^\d+)?)+)(?![\w$^])/g, m => `$${m}$`);
    }).join('');
  }

  // ---------- vangnet bij zelfdoding ----------
  // Bij woorden over niet meer willen leven staat de hulplijn er altijd onder, ook als de AI hem vergeet (meetset 16 okt:
  // "Soms wil ik gewoon niet meer wakker worden" kreeg geen 113). Zelfde vangnet als Melo voor Mac. In code, niet in de
  // instructies: zo hangt het niet af van wat de kleine AI doet.
  // Onderzoek 17 okt: "Je ne veux plus vivre", "Ich will sterben", "I want to end it" en zelfbeschadiging ("I cut myself",
  // "Ik snijd mezelf") vielen erdoor; "end my subscription" en "een einde aan het contract" gaven juist een hulplijn.
  // Zelfbeschadiging zonder ongeluk-woorden erachter: "I cut myself while cooking" is geen crisis.
  const CRISIS = new RegExp([
    'zelfmoord', 'su[iï]cid', 'niet meer (willen )?leven', 'niet meer (wakker|op) (te )?(worden|staan)', '(wil|willen|wilde) (graag )?dood', 'dood (willen|wil) ',
    'mezelf (iets )?(aan ?doen|doden|ombrengen|van kant)', 'een eind(e)? (aan|maken( aan)?) (mijn leven|alles|het)(?=\\s*([.!?,]|$))', 'er niet meer (willen |wil )?zijn', '(ik )?zie het (echt |gewoon )?niet meer zitten', 'uit het leven',
    'snijd mezelf', 'mezelf (iets )?aan te doen', 'er een eind(e)? aan (willen )?maken', 'mezelf (te )?(snijden|krassen|beschadigen|pijn (te )?doen)', 'dat ik dood (was|ben|zou zijn)', 'geen zin meer (in|om te) leven',
    'kill myself', 'end (it all|my (own )?life)', '(want|going|planning) to end it(?=\\s*([.!?,]|$))', 'want(ed)? to die', "don['’]?t want to (live|be alive|wake up|be here)", 'self[- ]?harm', 'hurt(ing)? myself', 'no reason to live', 'better off dead',
    'wish (i|that i) (was|were) dead', 'wish i (had )?never (been born|woke up)', 'take my (own )?life', "can['’]?t go on (any ?more|living)",
    '(cutting|burning) myself', '(i )?(cut|burn) myself(?! (off|out|while|on|with|by|when|shaving|cooking|accidentally))',
    'umbringen', 'selbstmord', 'suizid', 'nicht mehr leben', 'sterben (will|möchte)', '(will|möchte|wollte) (nur noch |einfach )?sterben', 'nicht mehr aufwachen', 'mir etwas antun',
    'ritze mich', 'mich (selbst )?(ritzen|verletzen)', 'lieber tot', 'kein(en)? (grund|sinn) mehr (zu leben|im leben)',
    'me suicider', 'suicide', 'en finir', 'ne plus vivre', '(veux|veut|voulais) plus vivre', 'plus envie de vivre', 'envie de mourir', 'veux mourir', 'me faire du mal', 'me fais du mal',
    '(veux|vais|voudrais|envie de) me tuer', 'me scarifi', '(voudrais|veux|préférerais) être mort',
    'quitarme la vida', 'no quiero vivir', 'no quiero seguir vivi(r|endo)', 'quiero morir', 'hacerme da[ñn]o', 'acabar con (todo|mi vida)',
    '(quiero|voy a|pienso en|ganas de) matarme', 'me quiero matar', 'autolesi', 'me corto(?! (el pelo|el cabello|las uñas|la barba|el dedo|un dedo|con))', 'cortarme (las venas|los brazos|las muñecas)', 'ojal[aá] (estuviera|estar) muert',
  ].join('|'), 'i');
  const crisis = q => CRISIS.test(String(q || ''));
  const HELP = {
    nl: 'Wil je erover praten met iemand? Bel **113 Zelfmoordpreventie** op 0800-0113 (gratis, dag en nacht) of chat via 113.nl. In België: 1813. Ben je nu in gevaar, bel dan **112**.',
    en: 'If you want to talk to someone: please reach out to a crisis line in your country. If you are in danger right now, call **112** (Europe) or your local emergency number.',
    de: 'Wenn du mit jemandem reden möchtest: **TelefonSeelsorge** 0800 111 0 111 (kostenlos, rund um die Uhr). Bist du jetzt in Gefahr, ruf die **112** an.',
    fr: 'Si tu veux en parler à quelqu’un : appelle le **3114** (gratuit, 24 h/24). Si tu es en danger maintenant, appelle le **112**.',
    es: 'Si quieres hablar con alguien: llama al **024** (gratis, las 24 horas). Si estás en peligro ahora mismo, llama al **112**.',
  };
  const HELP_NR = /\b(113|1813|112|0800[- ]?0113|0800 111 0 111|3114|024|988|116 ?123)\b/;
  // De hulplijn onder het antwoord, als hij er nog niet in staat.
  function withHelp(answer, q, lang) {
    if (!crisis(q) || HELP_NR.test(answer)) return answer;
    return `${String(answer || '').trim()}\n\n${HELP[lang] || HELP.en}`.trim();
  }

  // ---------- alles samen ----------
  // Per alinea, zonder code of grafieken aan te raken.
  function tidy(text, { lang = 'en' } = {}) {
    let t = String(text || '').replace(/\r/g, '');
    if (!t.trim()) return t.trim();
    // code en grafieken eruit halen, daarna terugzetten
    const keep = [];
    t = t.replace(/```[\s\S]*?(?:```|$)/g, m => `\u0000${keep.push(m) - 1}\u0000`);
    // aanloop: alleen als er daarna nog iets komt
    for (const re of OPENER) { const m = t.match(re); if (m && t.slice(m[0].length).trim()) { t = t.slice(m[0].length); break; } }
    t = placeholders(t, lang);
    t = looseTex(t);
    // opvulzinnen: in de laatste twee alinea's, per zin
    const paras = t.split(/\n{2,}/);
    for (let k = Math.max(0, paras.length - 2); k < paras.length; k++) {
      if (/^\s*(\u0000|\||#|```)/.test(paras[k])) continue;
      const lines = paras[k].split('\n');
      const last = lines.length - 1;
      const sents = lines[last].match(/[^.!?]+[.!?]*\s*/g) || [lines[last]];
      let kept = sents.filter(s => !isFiller(s));
      // wat er dan nog over is aan losse emoji of leestekens: ook weg
      if (kept.length !== sents.length) kept = kept.filter(s => /[\p{L}\p{N}]/u.test(s));
      if (kept.length !== sents.length) lines[last] = kept.join('').trimEnd();
      paras[k] = lines.filter((l, i) => i < last || l.trim()).join('\n');
    }
    t = paras.filter(p => p.trim()).join('\n\n');
    t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }
  // Wat er nog mis is met een antwoord (voor een tweede poging of de meetset).
  function problems(text, { lang } = {}) {
    const t = String(text || '');
    const out = [];
    if (lang && wrongLang(t, lang, { min: 25 })) out.push('taal');
    if (hasPH(t.replace(/```[\s\S]*?```/g, ''))) out.push('invulplek');
    return out;
  }

  const api = { LANGS, NAME, detect, pickLang, langHint, wrongLang, tidy, placeholders, looseTex, isFiller, problems, crisis, withHelp };
  globalThis.KameloGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
