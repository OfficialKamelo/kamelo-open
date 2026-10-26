// Gevoelige gegevens herkennen in de gratis editie: een BSN of ander burger- of ID-nummer, een IBAN, een betaalkaart,
// een paspoort- of ID-kaartnummer, een wachtwoord of pincode, en sleutels (API-sleutels, privésleutels).
// Kamelo schermt in de gratis editie niets af: dit zegt alleen wélk soort gegeven er in het bericht staat, zodat de
// melding kan voorstellen het aan Melo te vragen (op je eigen computer) of het nummer weg te halen.
//
// Zo weinig mogelijk valse meldingen: een nummer telt alleen met een controlegetal dat klopt (IBAN mod-97, Luhn,
// elfproef, DNI-letter, NIR- en rijksregistersleutel, Steuer-ID) of met een woord ervoor dat zegt wat het is
// ("mijn BSN is", "passport number", "Passwort:"). Een bestelnummer, telefoonnummer, bedrag of datum is dus geen melding.
// E-mailadressen en telefoonnummers tellen bewust niet: die staan in elke handtekening.
//
// Draait volledig lokaal (content script en Node-tests), zonder netwerk. Kamelo Business heeft hiervoor src/detector.js
// (afschermen met placeholders); dit bestand is bewust klein en apart, en is open source.
(function (root) {
  'use strict';

  const KINDS = ['NATIONAL_ID', 'IBAN', 'CARD', 'PASSPORT', 'PASSWORD', 'SECRET'];
  const MAX_LENGTH = 20000;
  const digits = s => s.replace(/\D/g, '');

  // ---------- Controlegetallen ----------

  function luhn(d) {
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      let n = +d[d.length - 1 - i];
      if (i % 2) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  }

  // Nederlands BSN: 9 cijfers, 9×d1 + 8×d2 + … + 2×d8 − 1×d9 deelbaar door 11.
  function elfproef(d) {
    if (d.length !== 9 || /^0+$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += (9 - i) * +d[i];
    return (sum - +d[8]) % 11 === 0;
  }

  function mod97(numeric) {
    let r = 0;
    for (const ch of numeric) r = (r * 10 + +ch) % 97;
    return r;
  }

  // Lengtes van IBAN's per land (SWIFT IBAN-register).
  const IBAN_LEN = {
    AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27, BR: 29, BY: 28, CH: 21, CR: 22,
    CY: 28, CZ: 24, DE: 22, DJ: 27, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27, GB: 22,
    GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30,
    KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20,
    MR: 27, MT: 31, MU: 30, NI: 28, NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22,
    RU: 33, SA: 24, SC: 31, SD: 18, SE: 24, SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26,
    UA: 29, VA: 22, VG: 24, XK: 20, YE: 30,
  };
  function ibanValid(raw) {
    const s = raw.replace(/[\s-]/g, '').toUpperCase();
    if (IBAN_LEN[s.slice(0, 2)] !== s.length || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
    const r = s.slice(4) + s.slice(0, 4);
    return mod97(r.replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55))) === 1;
  }

  // Spaans DNI (8 cijfers + letter) en NIE (X/Y/Z + 7 cijfers + letter).
  const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
  function dniValid(s) {
    const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(s.replace(/[\s-]/g, '').toUpperCase());
    if (!m) return false;
    const n = m[1] ? '' + 'XYZ'.indexOf(m[1]) + m[2] : m[2];
    if ((m[1] && m[2].length !== 7) || (!m[1] && m[2].length !== 8)) return false;
    return DNI_LETTERS[+n % 23] === m[3];
  }

  // Frans NIR (sécurité sociale): 13 cijfers + sleutel van 2; Corsica 2A/2B.
  function nirValid(s) {
    let d = s.replace(/[\s.-]/g, '').toUpperCase();
    if (!/^[12]\d{2}(0[1-9]|1[0-2]|[2-9]\d)(\d{2}|2A|2B)\d{6}\d{2}$/.test(d)) return false;
    const key = +d.slice(13);
    d = d.slice(0, 13).replace('2A', '19').replace('2B', '18');
    const sub = d.slice(5, 7) === '19' || d.slice(5, 7) === '18' ? (s.toUpperCase().includes('2A') ? 1000000 : s.toUpperCase().includes('2B') ? 2000000 : 0) : 0;
    let n = 0n;
    try { n = BigInt(d) - BigInt(sub); } catch { return false; }
    return 97 - Number(n % 97n) === key;
  }

  // Belgisch rijksregisternummer: 11 cijfers, sleutel 97 − (eerste 9 mod 97); voor wie na 1999 geboren is met een 2 ervoor.
  function rrnValid(s) {
    const d = digits(s);
    if (d.length !== 11) return false;
    const body = d.slice(0, 9), check = +d.slice(9);
    return 97 - mod97(body) === check || 97 - mod97('2' + body) === check;
  }

  // Amerikaans SSN: 3-2-4, niet 000/666/9xx, niet 00 of 0000.
  function ssnValid(s) {
    const m = /^(\d{3})[- ]?(\d{2})[- ]?(\d{4})$/.exec(s);
    return !!m && m[1] !== '000' && m[1] !== '666' && m[1][0] !== '9' && m[2] !== '00' && m[3] !== '0000';
  }

  // Duitse Steuer-ID: 11 cijfers, ISO 7064 mod 11,10; het eerste cijfer is geen 0.
  function steuerIdValid(s) {
    const d = digits(s);
    if (d.length !== 11 || d[0] === '0') return false;
    let p = 10;
    for (let i = 0; i < 10; i++) {
      let sum = (+d[i] + p) % 10;
      if (sum === 0) sum = 10;
      p = (2 * sum) % 11;
    }
    let check = 11 - p;
    if (check === 10) check = 0;
    return check === +d[10];
  }

  // ---------- Woorden die zeggen wat er volgt (EN, NL, DE, FR, ES) ----------
  // Het nummer moet kort na het woord staan (hooguit ~30 tekens: "mijn BSN is", "BSN: ", "passport no. ").
  const cue = words => new RegExp(`(?:^|[^\\p{L}])(?:${words})(?![\\p{L}])`, 'iu');
  const CUE = {
    NATIONAL_ID: cue([
      'bsn', 'burger ?service ?nummer', 'sofi-?nummer', 'citizen service number', 'ssn', 'social security(?: number| no\\.?)?',
      'national insurance(?: number)?', 'ni number', 'nino', 'rijksregister(?:nummer)?', 'insz(?:-?nummer)?',
      'steuer-?id', 'steuer-?identifikationsnummer', 'steuernummer', 'idnr', 'sozialversicherungsnummer',
      'num[eé]ro de s[eé]curit[eé] sociale', 'n° ?de s[eé]cu', 'nir', 'dni', 'nie', 'n[uú]mero de la seguridad social',
      'nif', 'personnummer', 'pesel', 'codice fiscale',
    ].join('|')),
    PASSPORT: cue([
      'paspoort ?nummer', 'paspoortnr\\.?', 'passport(?: number| no\\.?| nr\\.?| #)', 'reisepass ?nummer', 'reisepassnr\\.?',
      'num[eé]ro de passeport', 'n° de passeport', 'n[uú]mero de pasaporte', 'pasaporte n[uú]mero',
      'id-?kaart ?nummer', 'identiteitskaart ?nummer', 'document ?nummer', 'documentnr\\.?', 'id card number',
      // "id number" alleen als het geen bestel-, klant- of zaaknummer is ("Order ID number XK-998877").
      '(?<!(?:order|tracking|bestel|klant|customer|invoice|factuur|ticket|case|account|user|session|transaction) )id number',
      'personalausweis ?nummer', 'ausweisnummer', 'num[eé]ro de (?:la )?carte d.identit[eé]', 'n[uú]mero de (?:documento|identificaci[oó]n)',
      'rijbewijs ?nummer', 'driver.?s licen[cs]e number', 'f[uü]hrerschein ?nummer',
    ].join('|')),
    PASSWORD: cue([
      'wachtwoord', 'paswoord', 'password', 'passwort', 'kennwort', 'mot de passe', 'mdp', 'contrase[nñ]a', 'clave',
      'pin(?:code|-code| code| number)?', 'inlogcode', 'toegangscode', 'passcode', 'code pin', 'c[oó]digo pin', 'geheimzahl',
    ].join('|')),
  };
  // Wat na het woord als waarde telt: kandidaten in de ~45 tekens erna ("mijn BSN is 1112.22.333", "passport no. X1234567").
  const CANDIDATE = {
    NATIONAL_ID: /(?:\b[A-Z]{1,2} ?)?\d[\d .\-/]{5,16}\d(?: ?[A-Z]\b)?/gi,
    // Elk stuk heeft een cijfer: "id number for 2024 form" is geen nummer, "NW7K12345" en "C01X00T47" wel.
    PASSPORT: /\b(?=[A-Z]*\d)[A-Z0-9]{2,10}(?:[ -](?=[A-Z]*\d)[A-Z0-9]{2,8})?\b/gi,
  };
  // Wachtwoord: wat na "is", ":" of "=" staat, anders het woord direct erna.
  const PASSWORD_VALUE = /^(?:[^\n]{0,25}?(?:\s(?:is|es|est|ist|lautet|was|era|=)|[:=])\s*|\s+)["'“‘]?(\S{4,64})/iu;
  // Een "wachtwoord" dat een gewoon woord is ("password reset", "mijn wachtwoord vergeten"): geen melding.
  const PASSWORD_NOT = /^(?:reset|vergeten|forgot(?:ten)?|forget|manager|kwijt|wijzigen|changed?|veranderen|[aä]ndern|oubli[eé]|olvid[eé]|cambiar|policy|requirements?|eisen|strength|sterkte|field|veld|feld|champ|campo|protected|beveiligd|gesch[uü]tzt|prot[eé]g[eé]|protegid[oa]|incorrect|wrong|fout|falsch|for|voor|f[uü]r|pour|para|of|van|von|de|del|the|het|de|een|a|an|my|mijn|mein|mon|mi|is|and|en|und|et|y|werkt|works|doesn.?t|klopt|not|niet|nicht|pas|no|that|dat|das|que)\b/i;
  // Het woord direct na "wachtwoord" maakt er een onderwerp van, geen wachtwoord ("my password manager is 1Password").
  const PASSWORD_TOPIC = /^\s*(?:reset|vergeten|forgot(?:ten)?|forget|managers?|kluis|vault|kwijt|wijzigen|changed?|veranderen|[aä]ndern|oubli[eé]|olvid[eé]|cambiar|policy|requirements?|eisen|strength|sterkte|generator|hint|hash|protected|beveiligd)(?![\p{L}])/iu;
  const hasDigitOrSymbol = s => /[\d!@#$%^&*_+=?]/.test(s);
  // Een los nummer (kaart, SSN, DNI, NIR) zonder woord ervoor telt niet na "versie", "bestelnummer", "tracking" enz.,
  // en niet midden in een som ("123-45-6789 min 1000").
  const NOT_BEFORE = /(?:^|[^\p{L}])(?:version|versie|versión|build|release|model|order|bestel(?:ling|nummer)?|tracking|track ?(?:&|and|en) ?trace|zending|pakket|parcel|ref(?:erence|erentie)?|factuur|invoice|artikel|item|serial|serie(?:nummer)?)\s*(?:n(?:o|r|um(?:mer|ber)?)\.?\s*)?(?:is\s*)?[:#]?\s*$/iu;
  const SUM_AROUND = (before, after) => /[-+*/×÷=]\s*$/.test(before) || /^\s*(?:[-+*/×÷=]|min(?:us)?\b|plus\b|keer\b|times\b|maal\b|divided\b|gedeeld\b)/i.test(after);
  const looseOk = (s, start, end) => {
    const before = s.slice(Math.max(0, start - 40), start), after = s.slice(end, end + 20);
    return !NOT_BEFORE.test(before) && !SUM_AROUND(before, after);
  };

  // ---------- Herkennen ----------

  // find(text) → [{ kind, start, end }] (posities in de tekst), op volgorde.
  function find(text) {
    const s = String(text || '').slice(0, MAX_LENGTH);
    const out = [];
    const add = (kind, start, end) => { if (!out.some(o => start < o.end && end > o.start)) out.push({ kind, start, end }); };

    // IBAN (met of zonder spaties).
    for (const m of s.matchAll(/\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){10,30}\b/gi)) {
      // Langste passende lengte vanaf het begin: de match kan verder lopen dan het nummer ("NL91ABNA0417164300 graag").
      const raw = m[0];
      const len = IBAN_LEN[raw.slice(0, 2).toUpperCase()];
      if (!len) continue;
      let count = 0, end = 0;
      for (; end < raw.length && count < len; end++) if (/[A-Z0-9]/i.test(raw[end])) count++;
      if (count === len && ibanValid(raw.slice(0, end))) add('IBAN', m.index, m.index + end);
    }

    // Betaalkaart: 13–19 cijfers in groepen, Luhn, begint met 2–6 (Visa, Mastercard, Amex, Discover, …).
    for (const m of s.matchAll(/(?<![\d.,])[2-6]\d{3}(?:[ -]?\d{2,4}){2,4}(?![\d.,]\d)/g)) {
      const d = digits(m[0]);
      if (d.length < 13 || d.length > 19 || /^(\d)\1+$/.test(d) || !luhn(d) || !looseOk(s, m.index, m.index + m[0].length)) continue;
      add('CARD', m.index, m.index + m[0].length);
    }

    // Burger- en ID-nummers met een controlegetal die op zichzelf al duidelijk zijn.
    for (const m of s.matchAll(/(?<![\w-])\d{3}-\d{2}-\d{4}(?![\w-])/g)) if (ssnValid(m[0]) && looseOk(s, m.index, m.index + m[0].length)) add('NATIONAL_ID', m.index, m.index + m[0].length);
    for (const m of s.matchAll(/(?<![\w])[XYZ]?[- ]?\d{7,8}[- ]?[A-Z](?![\w])/g)) if (dniValid(m[0]) && looseOk(s, m.index, m.index + m[0].length)) add('NATIONAL_ID', m.index, m.index + m[0].length);
    for (const m of s.matchAll(/(?<![\d])[12][ .]?\d{2}[ .]?\d{2}[ .]?(?:\d{2}|2A|2B)[ .]?\d{3}[ .]?\d{3}[ .]?\d{2}(?![\d])/gi)) if (nirValid(m[0]) && looseOk(s, m.index, m.index + m[0].length)) add('NATIONAL_ID', m.index, m.index + m[0].length);
    for (const m of s.matchAll(/(?<![\d.])\d{2}\.\d{2}\.\d{2}-\d{3}\.\d{2}(?![\d])/g)) if (rrnValid(m[0])) add('NATIONAL_ID', m.index, m.index + m[0].length);

    // Met een woord ervoor: BSN (elfproef), SSN, NI, rijksregister, Steuer-ID, DNI/NIE, NIR, of een paspoort- of
    // ID-nummer met cijfers, of een wachtwoord.
    const nationalOk = v => {
      const t = v.trim(), d = digits(t);
      return (d.length === 9 && elfproef(d) && !/[A-Z]/i.test(t)) || ssnValid(t) || rrnValid(t) && /^[\d .\-]+$/.test(t)
        || steuerIdValid(t) && /^[\d ]+$/.test(t) || dniValid(t) || nirValid(t)
        || /^[A-CEGHJ-PR-TW-Z]{2} ?\d{2} ?\d{2} ?\d{2} ?[A-D]$/i.test(t); // UK National Insurance
    };
    for (const kind of ['NATIONAL_ID', 'PASSPORT', 'PASSWORD']) {
      const re = new RegExp(CUE[kind].source, 'giu');
      for (const m of s.matchAll(re)) {
        const from = m.index + m[0].length;
        const after = s.slice(from, from + 45);
        if (kind === 'PASSWORD') {
          const v = PASSWORD_VALUE.exec(after);
          if (!v || PASSWORD_TOPIC.test(after)) continue;
          // Leestekens aan het eind horen bij de zin ("hunter2." → hunter2), behalve ! en ? (vaak deel van een wachtwoord).
          const trimmed = v[1].replace(/[.,;:)"'”’]+$/, '');
          const value = trimmed.length >= 4 ? trimmed : v[1];
          if (PASSWORD_NOT.test(value) || !hasDigitOrSymbol(value) && !/^[A-Z]?[a-z]+[A-Z]/.test(value)) continue;
          const start = from + v.index + v[0].length - v[1].length;
          add('PASSWORD', start, start + value.length);
          continue;
        }
        for (const c of after.matchAll(CANDIDATE[kind])) {
          // Ook zonder een letter aan het eind of het begin proberen ("BSN 111222333 A" → 111222333).
          const tries = [c[0], c[0].replace(/ ?[A-Z]$/i, ''), c[0].replace(/^[A-Z]{1,2} ?/i, '')];
          const value = kind === 'NATIONAL_ID'
            ? tries.find(nationalOk)
            : ((c[0].replace(/[\s-]/g, '').match(/\d/g) || []).length >= 2 && c[0].replace(/[\s-]/g, '').length >= 6 ? c[0] : null);
          if (!value) continue;
          const start = from + c.index + c[0].indexOf(value);
          add(kind, start, start + value.length);
          break;
        }
      }
    }

    // Sleutels: privésleutels en API-sleutels met een herkenbaar begin.
    const SECRETS = [
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
      /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g,         // OpenAI, Anthropic
      /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,                    // GitHub
      /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
      /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,                     // AWS
      /\bAIza[0-9A-Za-z_-]{35}\b/g,                         // Google
      /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,                  // Slack
      /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g,               // Stripe
    ];
    for (const re of SECRETS) for (const m of s.matchAll(re)) add('SECRET', m.index, m.index + m[0].length);

    return out.sort((a, b) => a.start - b.start);
  }

  // kinds(text) → de soorten, in vaste volgorde: ['IBAN', 'PASSWORD'].
  function kinds(text) {
    const found = new Set(find(text).map(f => f.kind));
    return KINDS.filter(k => found.has(k));
  }

  const api = { find, kinds, KINDS, _internal: { luhn, elfproef, ibanValid, dniValid, nirValid, rrnValid, ssnValid, steuerIdValid } };
  root.PrivacyIdentifiers = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
