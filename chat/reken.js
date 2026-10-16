// Melo rekent niet zelf: Kamelo rekent. De kleine AI van Chrome verrekent zich en verzint stappen; deze module herkent
// rekenvragen (sommen, procenten, vergelijkingen, cirkels, Pythagoras, rechthoeken, afgeleiden, eenheden) en rekent ze
// uit in gewone code, op dit apparaat. Uitkomst:
//   { kind, value, text, fact, show }
//   text  het hele antwoord in de taal van de vraag (Markdown met $formules$), voor een vraag die alleen een uitkomst wil
//   fact  dezelfde uitkomst in het Engels, als vaststaand gegeven voor de AI als iemand om uitleg vraagt
//   show  getallen die in het antwoord van de AI moeten staan (anders klopt zijn antwoord niet)
// Geen eval: formules gaan door de parser van chat/rich.js (compile).
(() => {
  'use strict';
  const R = globalThis.KameloRich || (typeof require === 'function' ? require('./rich.js') : null);
  const LOC = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
  const LANGS = Object.keys(LOC);

  // ---------- getallen ----------
  const NUM = '(\\d+(?:[.,]\\d+)*)';
  // "2.340" is in het Nederlands tweeduizend driehonderdveertig, in het Engels 2,34. "2,5" is overal twee en een half.
  function num(s, lang = 'en') {
    s = String(s).replace(/\s/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) && (lang !== 'en' || s.includes(','))) return +s.replace(/\./g, '').replace(',', '.');
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) && (lang === 'en' || s.includes('.'))) return +s.replace(/,/g, '');
    return +s.replace(',', '.');
  }
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  const clean = v => (near(v, Math.round(v)) ? Math.round(v) : +v.toPrecision(12));
  // Getal zoals je het in die taal schrijft: 397,80 (geld), 78,54, 0,25. Groeperen pas vanaf 10.000.
  function fmt(v, lang = 'en', { money = false, digits = 2 } = {}) {
    if (!Number.isFinite(v)) return '?';
    v = clean(v);
    const o = money && !Number.isInteger(v) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: digits };
    return new Intl.NumberFormat(LOC[lang] || 'en-GB', { ...o, useGrouping: Math.abs(v) >= 10000 }).format(v).replace(/−/g, '-');
  }
  // Niet rond: ≈ ervoor.
  const approx = (v, digits = 2) => !near(v, +v.toFixed(digits));
  // Een breuk als dat netjes kan (7/3), voor exacte uitkomsten van vergelijkingen.
  function frac(v) {
    for (let q = 2; q <= 100; q++) { const p = Math.round(v * q); if (near(p / q, v)) return [p, q]; }
    return null;
  }
  const MONEY = /€|\beuros?\b|\beur\b|\$|\bdollars?\b|£|\bpond\b|\bpounds?\b|\bkost|\bprijs|\bprice|\bpreis|\bprix\b|\bprecio/i;

  // ---------- woorden per taal ----------
  const W = {
    nl: { of: 'van', so: 'Dus', step: 'x naar één kant, de getallen naar de andere kant:', div: 'Deel door', disc: 'De discriminant:', or: 'of', none: 'Geen oplossing: er is geen getal x waarvoor dit klopt.', all: 'Elk getal x voldoet: beide kanten zijn altijd gelijk.', noReal: 'Geen oplossing met gewone getallen, want de discriminant is negatief.', hyp: 'De schuine zijde is', leg: 'De andere rechthoekszijde is', area: 'De oppervlakte is', circ: 'De omtrek is', perim: 'De omtrek is', deriv: 'De afgeleide is', integ: 'Een primitieve is', discount: 'korting op', plus: 'plus', rise: 'stijging', fall: 'daling', from: 'Van', to: 'naar', is: 'is' },
    en: { of: 'of', so: 'So', step: 'x on one side, the numbers on the other:', div: 'Divide by', disc: 'The discriminant:', or: 'or', none: 'No solution: no number x makes this true.', all: 'Every number x works: both sides are always equal.', noReal: 'No solution in ordinary (real) numbers, because the discriminant is negative.', hyp: 'The hypotenuse is', leg: 'The other leg is', area: 'The area is', circ: 'The circumference is', perim: 'The perimeter is', deriv: 'The derivative is', integ: 'An antiderivative is', discount: 'off', plus: 'plus', rise: 'increase', fall: 'decrease', from: 'From', to: 'to', is: 'is' },
    de: { of: 'von', so: 'Also', step: 'x auf eine Seite, die Zahlen auf die andere:', div: 'Teile durch', disc: 'Die Diskriminante:', or: 'oder', none: 'Keine Lösung: Für keine Zahl x stimmt das.', all: 'Jede Zahl x passt: Beide Seiten sind immer gleich.', noReal: 'Keine Lösung in den reellen Zahlen, weil die Diskriminante negativ ist.', hyp: 'Die Hypotenuse ist', leg: 'Die andere Kathete ist', area: 'Die Fläche ist', circ: 'Der Umfang ist', perim: 'Der Umfang ist', deriv: 'Die Ableitung ist', integ: 'Eine Stammfunktion ist', discount: 'Rabatt auf', plus: 'plus', rise: 'Anstieg', fall: 'Rückgang', from: 'Von', to: 'auf', is: 'ist' },
    fr: { of: 'de', so: 'Donc', step: 'x d’un côté, les nombres de l’autre :', div: 'On divise par', disc: 'Le discriminant :', or: 'ou', none: 'Pas de solution : aucun nombre x ne convient.', all: 'Tout nombre x convient : les deux côtés sont toujours égaux.', noReal: 'Pas de solution réelle, car le discriminant est négatif.', hyp: 'L’hypoténuse mesure', leg: 'L’autre côté de l’angle droit mesure', area: 'L’aire est', circ: 'Le périmètre est', perim: 'Le périmètre est', deriv: 'La dérivée est', integ: 'Une primitive est', discount: 'de remise sur', plus: 'plus', rise: 'hausse', fall: 'baisse', from: 'De', to: 'à', is: 'est' },
    es: { of: 'de', so: 'Por tanto', step: 'x a un lado, los números al otro:', div: 'Dividimos entre', disc: 'El discriminante:', or: 'o', none: 'No hay solución: ningún número x lo cumple.', all: 'Cualquier número x vale: los dos lados son siempre iguales.', noReal: 'No hay solución real, porque el discriminante es negativo.', hyp: 'La hipotenusa mide', leg: 'El otro cateto mide', area: 'El área es', circ: 'La circunferencia mide', perim: 'El perímetro es', deriv: 'La derivada es', integ: 'Una primitiva es', discount: 'de descuento sobre', plus: 'más', rise: 'aumento', fall: 'disminución', from: 'De', to: 'a', is: 'es' },
  };
  const w = lang => W[lang] || W.en;

  // ---------- procenten ----------
  const PCT = '(?:%|\\s*procent|\\s*percent|\\s*per cent|\\s*prozent|\\s*pour ?cent|\\s*por ?ciento)';
  function percent(q, lang) {
    let m;
    const money = MONEY.test(q);
    const unit = money ? ` ${(q.match(/€|euros?|dollars?|\$|£|pond|pounds?/i) || ['euro'])[0].replace(/^€$/, '€')}` : '';
    const f = v => fmt(v, lang, { money });
    // korting: "20% korting op 50 euro", "50 euro met 20% korting"
    const OFF = '(?:korting|discount|off|rabatt|nachlass|remise|réduction|reduction|descuento|rebaja)';
    if ((m = q.match(new RegExp(`${NUM}${PCT}\\s*${OFF}\\s*(?:op|on|auf|sur|de|en|sobre)?\\s*(?:€|\\$)?\\s*${NUM}`, 'i'))) ||
        (m = q.match(new RegExp(`(?:€|\\$)?\\s*${NUM}\\s*(?:euros?|€|eur|dollars?)?\\s*(?:met|with|mit|avec|con|minus|min)\\s*${NUM}${PCT}\\s*${OFF}`, 'i')))) {
      const [p, n] = m[0].search(new RegExp(`^${NUM}${PCT}`, 'i')) === 0 ? [num(m[1], lang), num(m[2], lang)] : [num(m[2], lang), num(m[1], lang)];
      const off = p / 100 * n, v = n - off;
      return { kind: 'korting', value: v, show: [f(v)], fact: `${p}% discount on ${clean(n)}: ${clean(n)} − ${clean(off)} = ${clean(v)}`,
        text: `${f(p)}% ${w(lang).discount} ${f(n)}${unit}: $${f(n)} - ${f(p / 100)} \\cdot ${f(n)} = ${f(n)} - ${f(off)}$ = **${f(v)}${unit}**` };
    }
    // erbij: "100 euro plus 21% btw", "100 + 21%"
    if ((m = q.match(new RegExp(`(?:€|\\$)?\\s*${NUM}\\s*(?:euros?|€|eur|dollars?)?\\s*(?:plus|\\+|inclusief|incl\\.?|including|met|with|mit|avec|con|más|mas)\\s*${NUM}${PCT}\\s*(?:btw|vat|tax|tip|fooi|mwst|ust|tva|iva|rente|interest|zinsen?|intérêts?|intereses|erbij|extra|meer)?`, 'i')))) {
      const n = num(m[1], lang), p = num(m[2], lang), add = p / 100 * n, v = n + add;
      return { kind: 'erbij', value: v, show: [f(v)], fact: `${clean(n)} plus ${p}%: ${clean(n)} + ${clean(add)} = ${clean(v)}`,
        text: `${f(n)}${unit} ${w(lang).plus} ${f(p)}%: $${f(n)} + ${f(p / 100)} \\cdot ${f(n)} = ${f(n)} + ${f(add)}$ = **${f(v)}${unit}**` };
    }
    // "17% van 2340 euro", "15% of 80"
    if ((m = q.match(new RegExp(`${NUM}${PCT}\\s+(?:van|of|von|de|del|sur)\\s+(?:de |het |the |der |die |das |la |le |el )?(?:€|\\$)?\\s*${NUM}`, 'i')))) {
      const p = num(m[1], lang), n = num(m[2], lang), v = p / 100 * n;
      return { kind: 'procent', value: v, show: [f(v)], fact: `${p}% of ${clean(n)} = ${p / 100} × ${clean(n)} = ${clean(v)}`,
        text: `${f(p)}% ${w(lang).of} ${f(n)}${unit} = $${f(p / 100)} \\cdot ${f(n)}$ = **${f(v)}${unit}**` };
    }
    // "hoeveel procent is 30 van 120", "30 is what percent of 120"
    const WHAT = '(?:hoeveel procent|welk percentage|wat is het percentage|what percent(?:age)?|wie viel prozent|wie viele prozent|welcher prozentsatz|quel pourcentage|combien de pour ?cent|qu[ée] porcentaje|cu[áa]nto por ?ciento)';
    if ((m = q.match(new RegExp(`${WHAT}\\D{0,25}?${NUM}\\s*(?:euros?|€)?\\s*(?:van|of|von|de|sur|del|op)\\s+(?:€\\s*)?${NUM}`, 'i'))) ||
        (m = q.match(new RegExp(`${NUM}\\s*(?:euros?|€)?\\s*(?:is|zijn|ist|sind|est|es|son)\\s+${WHAT}\\s*(?:van|of|von|de|sur|del)\\s+(?:€\\s*)?${NUM}`, 'i')))) {
      const a = num(m[1], lang), b = num(m[2], lang);
      if (!b) return null;
      const v = a / b * 100;
      return { kind: 'welk-procent', value: v, show: [fmt(v, lang)], fact: `${clean(a)} out of ${clean(b)} = ${clean(a)} / ${clean(b)} × 100% = ${clean(v)}%`,
        text: `$\\frac{${fmt(a, lang)}}{${fmt(b, lang)}} \\cdot 100\\%$ ${approx(v) ? '≈' : '='} **${fmt(v, lang)}%**` };
    }
    // "van 80 naar 100 euro, hoeveel procent stijging?"
    if (new RegExp(`${PCT}|stijging|daling|toename|afname|gestegen|gedaald|increase|decrease|rise|drop|steigerung|anstieg|r[üu]ckgang|hausse|baisse|augmentation|aumento|subida|bajada|disminuci[óo]n`, 'i').test(q) &&
        (m = q.match(new RegExp(`(?:van|from|von|de)\\s+(?:€|\\$)?\\s*${NUM}\\s*(?:euros?|€|eur|dollars?|kg|km|mensen|people|leden|users?)?\\s+(?:naar|tot|to|auf|zu|à|a|hasta)\\s+(?:€|\\$)?\\s*${NUM}`, 'i')))) {
      const a = num(m[1], lang), b = num(m[2], lang);
      if (!a) return null;
      const v = (b - a) / a * 100, word = v >= 0 ? w(lang).rise : w(lang).fall;
      return { kind: 'verandering', value: v, show: [fmt(Math.abs(v), lang)], fact: `from ${clean(a)} to ${clean(b)}: (${clean(b)} − ${clean(a)}) / ${clean(a)} × 100% = ${clean(v)}%`,
        text: `${w(lang).from} ${f(a)} ${w(lang).to} ${f(b)}: $\\frac{${f(b)} - ${f(a)}}{${f(a)}} \\cdot 100\\%$ ${approx(v) ? '≈' : '='} **${fmt(Math.abs(v), lang)}% ${word}**` };
    }
    return null;
  }

  // ---------- vergelijkingen ----------
  // Lineair en kwadratisch, in x. Beide kanten gaan door compile(); de vorm lezen we af uit een paar punten (een veelterm
  // van graad ≤ 2 ligt vast door drie punten, het vierde controleert dat).
  const EQ_CHARS = '[-+*/^()\\d\\s.,x²³·×−⋅]';
  function equation(q, lang) {
    const m = q.replace(/[−–]/g, '-').match(new RegExp(`(${EQ_CHARS}*x${EQ_CHARS}*|${EQ_CHARS}+)=(${EQ_CHARS}+)`, 'i'));
    if (!m || !/x/i.test(m[0])) return null;
    const left = m[1].trim(), right = m[2].trim().replace(/[.,]+$/, '');
    if (!left || !right || !/\d|x/.test(left) || !/\d|x/.test(right)) return null;
    // "2x" ja, "x" in een woord nee: alleen wiskundetekens rond de x
    const L = R.compile(left.toLowerCase()), Rt = R.compile(right.toLowerCase());
    if (!L || !Rt) return null;
    const f = x => L(x) - Rt(x);
    const ys = [-1, 0, 1, 2, 3].map(f);
    if (ys.some(y => !Number.isFinite(y))) return null;
    const [ym, y0, y1, y2, y3] = ys;
    const d2 = y1 - 2 * y0 + ym, A = d2 / 2, B = (y1 - ym) / 2, C = y0;
    const fits = x => near(f(x), A * x * x + B * x + C);
    if (!fits(2) || !fits(3) || !fits(-7) || !fits(11)) return null; // geen veelterm van graad ≤ 2
    void y2; void y3;
    const t = w(lang), F = v => fmt(v, lang), shown = `$${tex(left)} = ${tex(right)}$`;
    if (near(A, 0)) {
      if (near(B, 0)) return near(C, 0)
        ? { kind: 'vergelijking', value: NaN, show: [], fact: 'Both sides are always equal: every x is a solution.', text: `${shown}\n\n${t.all}` }
        : { kind: 'vergelijking', value: NaN, show: [], fact: 'This equation has no solution.', text: `${shown}\n\n${t.none}` };
      const x = -C / B, whole = Number.isInteger(clean(x)), fr = whole ? null : frac(x);
      const ax = near(B, 1) ? 'x' : near(B, -1) ? '-x' : `${F(B)}x`;
      const lines = [shown, `${t.step} $${ax} = ${F(-C)}$`];
      if (!near(B, 1)) lines.push(`${t.div} ${F(B)}${lang === 'fr' ? ' :' : ':'} $x = \\frac{${F(-C)}}{${F(B)}}$`);
      lines.push(`**x = ${whole ? F(x) : fr ? `${fr[0]}/${fr[1]}${approx(x) ? ` ≈ ${F(x)}` : ''}` : F(x)}**`);
      return { kind: 'vergelijking', value: x, show: [F(x), ...(fr ? [`${fr[0]}/${fr[1]}`] : [])], fact: `${left} = ${right} has exactly one solution: x = ${clean(x)}${fr ? ` (${fr[0]}/${fr[1]})` : ''}.`, text: lines.join('\n\n') };
    }
    const D = B * B - 4 * A * C;
    const std = `$${poly([[2, A], [1, B], [0, C]], lang)} = 0$`;
    const lines = [shown, ...(near(A, 1) && near(L(0) - y0, Rt(0)) && near(Rt(0), 0) ? [] : [std]),
      `${t.disc} $D = b^2 - 4ac = ${paren(F(B))}^2 - 4 \\cdot ${paren(F(A))} \\cdot ${paren(F(C))} = ${F(D)}$`];
    if (D < -1e-12) { lines.push(t.noReal); return { kind: 'vergelijking', value: NaN, show: [], fact: `${left} = ${right} has no real solution (discriminant ${clean(D)}).`, text: lines.join('\n\n') }; }
    const r1 = (-B - Math.sqrt(Math.max(0, D))) / (2 * A), r2 = (-B + Math.sqrt(Math.max(0, D))) / (2 * A);
    const [a, b] = [r1, r2].sort((p, q2) => p - q2);
    const one = near(a, b);
    lines.push(`$x = \\frac{-b \\pm \\sqrt{D}}{2a}$`, `**${one ? `x = ${F(a)}` : `x = ${F(a)} ${t.or} x = ${F(b)}`}**`);
    return { kind: 'vergelijking', value: one ? a : [a, b], show: one ? [F(a)] : [F(a), F(b)], fact: `${left} = ${right}: ${one ? `x = ${clean(a)}` : `x = ${clean(a)} or x = ${clean(b)}`}.`, text: lines.join('\n\n') };
  }
  const paren = s => (s.startsWith('-') ? `(${s})` : s);
  // De vergelijking zoals iemand hem typte, als LaTeX: 3x + 7, x^2, 2·x.
  const tex = s => s.replace(/\s+/g, ' ').replace(/\*/g, ' \\cdot ').replace(/[×·⋅]/g, ' \\cdot ').replace(/²/g, '^2').replace(/³/g, '^3').trim();

  // ---------- veeltermen (afgeleide, primitieve) ----------
  // "x^3 + 2x", "3x² − 4x + 1", "-x^2 + 5": termen a·x^n. Haakjes of andere functies: dan rekent Kamelo dit niet.
  function parsePoly(src) {
    let s = String(src).replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/[⋅·×*]/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/\^\((\d+)\)/g, '^$1').replace(/\^\{(\d+)\}/g, '^$1')
      .replace(/^(?:f\(x\)|y)=/i, '').replace(/[.?!]+$/, '').toLowerCase();
    if (!s || /[^\dx+\-^.,]/.test(s)) return null;
    const terms = s.match(/[+-]?[^+-]+/g) || [];
    const out = new Map();
    for (const t of terms) {
      const m = t.match(/^([+-]?)(\d+(?:[.,]\d+)?)?(x(?:\^(\d+))?)?$/);
      if (!m || (!m[2] && !m[3])) return null;
      const c = (m[1] === '-' ? -1 : 1) * (m[2] ? +m[2].replace(',', '.') : 1);
      const n = m[3] ? (m[4] ? +m[4] : 1) : 0;
      out.set(n, (out.get(n) || 0) + c);
    }
    return [...out.entries()].filter(([, c]) => !near(c, 0)).sort((a, b) => b[0] - a[0]);
  }
  // [[n, a], …] → "3x^2 + 2", "x^3 - x", "-4"
  function poly(terms, lang = 'en', { frac: fr = false } = {}) {
    const list = terms.filter(([, c]) => !near(c, 0)).sort((a, b) => b[0] - a[0]);
    if (!list.length) return '0';
    return list.map(([n, c], i) => {
      const sign = c < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '');
      const a = Math.abs(c), p = fr && !Number.isInteger(clean(a)) ? frac(a) : null;
      const coef = p ? `\\frac{${p[0]}}{${p[1]}}` : near(a, 1) && n ? '' : fmt(a, lang, { digits: 4 });
      return sign + coef + (n ? (n === 1 ? 'x' : `x^${n}`) : '');
    }).join('');
  }
  const plainPoly = (terms, lang) => poly(terms, lang).replace(/\^(\d+)/g, (m, d) => [...d].map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''));
  function calculus(q, lang) {
    const D = /afgeleide|differenti[eë]er|derivative|differentiate|ableitung|leite\b.*\bab|d[ée]riv[ée]e|d[ée]rive|derivada|deriva\b/i;
    const I = /primitieve|integra(al|eer|te|l)|antiderivative|stammfunktion|integrier|primitive|int[ée]grale|integral\b/i;
    const kind = D.test(q) ? 'afgeleide' : I.test(q) ? 'primitieve' : null;
    if (!kind) return null;
    const m = q.match(/(?:van|of|von|de|uit|from)\s+(?:f\(x\)\s*=\s*|y\s*=\s*)?([-+−\dx\s^².,³*·()\{\}]+?)\s*(?:\?|$|\bdx\b|\bnaar\b|\bwith\b|\bmet\b)/i)
      || q.match(/(?:f\(x\)|y)\s*=\s*([-+−\dx\s^².,³*·()\{\}]+)/i);
    if (!m) return null;
    const p = parsePoly(m[1]);
    if (!p || !p.some(([n]) => n > 0)) return null;
    const t = w(lang);
    if (kind === 'afgeleide') {
      const d = p.filter(([n]) => n > 0).map(([n, c]) => [n - 1, n * c]);
      return { kind, value: d, show: [[plainPoly(d, lang), poly(d, lang)]], fact: `The derivative of ${plainPoly(p, 'en')} is ${plainPoly(d, 'en')} (power rule: d/dx xⁿ = n·xⁿ⁻¹).`,
        text: `$f(x) = ${poly(p, lang)}$\n\n${lang === 'nl' ? 'Met de machtsregel' : lang === 'de' ? 'Mit der Potenzregel' : lang === 'fr' ? 'Avec la règle des puissances' : lang === 'es' ? 'Con la regla de la potencia' : 'With the power rule'} $\\frac{d}{dx} x^n = n \\cdot x^{n-1}$:\n\n${t.deriv} **$f'(x) = ${poly(d, lang)}$**` };
    }
    const i = p.map(([n, c]) => [n + 1, c / (n + 1)]);
    return { kind, value: i, show: [], fact: `An antiderivative of ${plainPoly(p, 'en')} is ${poly(i, 'en', { frac: true })} + C.`,
      text: `$f(x) = ${poly(p, lang)}$\n\n${t.integ} **$F(x) = ${poly(i, lang, { frac: true })} + C$**` };
  }

  // ---------- meetkunde ----------
  const UNIT = '(mm|cm|dm|km|m|meter|meters|metres?|centimeters?|centimetres?|millimeters?|kilometers?|kilometres?|inch(?:es)?|ft|feet)?';
  const unitOf = s => ({ meter: 'm', meters: 'm', metre: 'm', metres: 'm', centimeter: 'cm', centimeters: 'cm', centimetre: 'cm', centimetres: 'cm', millimeter: 'mm', millimeters: 'mm', kilometer: 'km', kilometers: 'km', kilometre: 'km', kilometres: 'km', inches: 'inch', feet: 'ft' }[s?.toLowerCase()] || s || '');
  function geometry(q, lang) {
    let m;
    const t = w(lang), F = v => fmt(v, lang);
    // cirkel: oppervlakte (standaard) of omtrek, met straal of diameter
    if (/cirkel|circle|kreis|cercle|c[íi]rculo|schijf|disk/i.test(q)) {
      const r = q.match(new RegExp(`(straal|radius|rayon|radio|diameter|doorsnede|durchmesser|diam[èe]tre|di[áa]metro)\\D{0,20}?${NUM}\\s*${UNIT}`, 'i'));
      if (!r) return null;
      const dia = /diameter|doorsnede|durchmesser|diam/i.test(r[1]), val = num(r[2], lang), rad = dia ? val / 2 : val, u = unitOf(r[3]);
      const circ = /omtrek|circumference|umfang|p[ée]rim[èe]tre|circonf[ée]rence|per[íi]metro|circunferencia|longitud/i.test(q) && !/oppervlak|area|fl[äa]che|aire|[áa]rea/i.test(q);
      const pre = dia ? `$r = \\frac{${F(val)}}{2} = ${F(rad)}$${u ? ` ${u}` : ''}\n\n` : '';
      if (circ) {
        const v = 2 * Math.PI * rad;
        return { kind: 'cirkel-omtrek', value: v, show: [F(v)], fact: `Circumference of a circle with radius ${clean(rad)}${u ? ' ' + u : ''}: C = 2πr = ${clean(2 * rad)}π ≈ ${clean(+v.toFixed(2))}${u ? ' ' + u : ''}.`,
          text: `${pre}$O = 2 \\pi r = 2 \\cdot \\pi \\cdot ${F(rad)} = ${F(2 * rad)}\\pi$\n\n${t.circ} **≈ ${F(v)}${u ? ` ${u}` : ''}**`.replace('$O =', lang === 'nl' ? '$O =' : lang === 'de' ? '$U =' : lang === 'fr' ? '$P =' : '$C =') };
      }
      const v = Math.PI * rad * rad, u2 = u ? ` ${u}²` : '';
      return { kind: 'cirkel-oppervlakte', value: v, show: [F(v)], fact: `Area of a circle with radius ${clean(rad)}${u ? ' ' + u : ''}: A = πr² = ${clean(rad * rad)}π ≈ ${clean(+v.toFixed(2))}${u2}.`,
        text: `${pre}$A = \\pi r^2 = \\pi \\cdot ${F(rad)}^2 = ${F(rad * rad)}\\pi$\n\n${t.area} **≈ ${F(v)}${u2}**` };
    }
    // Pythagoras: rechthoekige driehoek met twee bekende zijden
    if (/rechthoekige driehoek|rechte hoek|right(?:-angled)? triangle|right angle|rechtwinklig|triangle rectangle|angle droit|tri[áa]ngulo rect[áa]ngulo|[áa]ngulo recto|pythagoras|pythagore|pit[áa]goras|schuine zijde|hypoten|hipotenusa/i.test(q)) {
      const nums = [...q.matchAll(new RegExp(`${NUM}\\s*${UNIT}`, 'g'))].filter(x => !/^9\d$/.test(x[1]) || !/graden|degrees|grad|degr|grados|°/i.test(q.slice(x.index, x.index + 12)));
      if (nums.length !== 2) return null;
      const u = unitOf(nums[0][2] || nums[1][2]), us = u ? ` ${u}` : '';
      const hm = q.match(new RegExp(`(schuine zijde|hypoten\\w*|hipotenusa|langste zijde|longest side)\\D{0,20}?${NUM}`, 'i'));
      const [a, b] = nums.map(x => num(x[1], lang));
      if (hm) {
        const h = num(hm[2], lang), leg = near(h, a) ? b : a;
        if (!(h > leg)) return null;
        const v = Math.sqrt(h * h - leg * leg);
        return { kind: 'pythagoras', value: v, show: [F(v)], fact: `Right triangle with hypotenuse ${clean(h)} and one leg ${clean(leg)}: other leg = √(${clean(h)}² − ${clean(leg)}²) = ${clean(+v.toFixed(4))}. The hypotenuse is the longest side, opposite the right angle.`,
          text: `$a^2 + b^2 = c^2$, ${lang === 'nl' ? 'met $c$ de schuine zijde (tegenover de rechte hoek)' : lang === 'de' ? 'mit $c$ der Hypotenuse (gegenüber dem rechten Winkel)' : lang === 'fr' ? 'où $c$ est l’hypoténuse (en face de l’angle droit)' : lang === 'es' ? 'con $c$ la hipotenusa (opuesta al ángulo recto)' : 'where $c$ is the hypotenuse (opposite the right angle)'}\n\n$b = \\sqrt{c^2 - a^2} = \\sqrt{${F(h)}^2 - ${F(leg)}^2} = \\sqrt{${F(h * h - leg * leg)}}$\n\n${t.leg} **${approx(v) ? '≈ ' : ''}${F(v)}${us}**` };
      }
      const v = Math.sqrt(a * a + b * b);
      return { kind: 'pythagoras', value: v, show: [F(v)], fact: `Right triangle with legs ${clean(a)} and ${clean(b)}: hypotenuse = √(${clean(a)}² + ${clean(b)}²) = ${clean(+v.toFixed(4))}. The hypotenuse is the longest side, opposite the right angle.`,
        text: `$c^2 = a^2 + b^2 = ${F(a)}^2 + ${F(b)}^2 = ${F(a * a)} + ${F(b * b)} = ${F(a * a + b * b)}$\n\n$c = \\sqrt{${F(a * a + b * b)}}$\n\n${t.hyp} **${approx(v) ? '≈ ' : ''}${F(v)}${us}**` };
    }
    // rechthoek: oppervlakte (standaard) of omtrek
    if (/rechthoek|rectangle|rechteck|rect[áa]ngulo|vierkant|square|quadrat|carr[ée]|cuadrado/i.test(q) && !/rechthoekige driehoek|triangle|dreieck|tri[áa]ngulo/i.test(q)) {
      const sq = /vierkant|square|quadrat|carr[ée]|cuadrado/i.test(q) && !/rechthoek|rectangle|rechteck|rect[áa]ngulo/i.test(q);
      m = q.match(new RegExp(`${NUM}\\s*${UNIT}\\s*(?:bij|by|x|×|\\*|mal|par|por|en|and|und|et|y|op)\\s*${NUM}\\s*${UNIT}`, 'i'));
      const one = sq && !m ? q.match(new RegExp(`(?:zijde|zijden|side|seite|c[ôo]t[ée]|lado)\\D{0,15}?${NUM}\\s*${UNIT}`, 'i')) : null;
      if (!m && !one) return null;
      const l = num(m ? m[1] : one[1], lang), b = m ? num(m[3], lang) : l, u = unitOf(m ? m[2] || m[4] : one[2]), us = u ? ` ${u}` : '';
      const per = /omtrek|perimeter|umfang|p[ée]rim[èe]tre|per[íi]metro/i.test(q) && !/oppervlak|area|fl[äa]che|aire|[áa]rea/i.test(q);
      if (per) { const v = 2 * (l + b); return { kind: 'rechthoek-omtrek', value: v, show: [F(v)], fact: `Perimeter: 2 × (${clean(l)} + ${clean(b)}) = ${clean(v)}${us}.`, text: `${t.perim} $2 \\cdot (${F(l)} + ${F(b)})$ = **${F(v)}${us}**` }; }
      const v = l * b, u2 = u ? ` ${u}²` : '';
      return { kind: 'rechthoek-oppervlakte', value: v, show: [F(v)], fact: `Area: ${clean(l)} × ${clean(b)} = ${clean(v)}${u2}.`, text: `${t.area} $${F(l)} \\cdot ${F(b)}$ = **${F(v)}${u2}**` };
    }
    return null;
  }

  // ---------- eenheden ----------
  const CONV = [
    { re: /(-?\d+(?:[.,]\d+)?)\s*(?:°\s*c\b|graden(?: celsius)?|degrees? celsius|grad celsius|degr[ée]s? celsius|grados? celsius|celsius)\D{0,25}?(?:fahrenheit|°\s*f\b)/i, f: c => c * 9 / 5 + 32, from: '°C', to: '°F', how: (a, l) => `${fmt(a, l)} \\cdot \\frac{9}{5} + 32` },
    { re: /(-?\d+(?:[.,]\d+)?)\s*(?:°\s*f\b|graden fahrenheit|degrees? fahrenheit|fahrenheit)\D{0,25}?(?:celsius|°\s*c\b)/i, f: v => (v - 32) * 5 / 9, from: '°F', to: '°C', how: (a, l) => `(${fmt(a, l)} - 32) \\cdot \\frac{5}{9}` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:km\/h|km\/u|kmh|kilometers? per uur|kilometres? per hour|kilometers? per hour)\D{0,25}?(?:m\/s|meters? per seconde|metres? per second|meters? per second)/i, f: v => v / 3.6, from: 'km/h', to: 'm/s', how: (a, l) => `\\frac{${fmt(a, l)}}{3{,}6}` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:m\/s|meters? per seconde|metres? per second|meters? per second)\D{0,25}?(?:km\/h|km\/u|kilometers? per uur|kilometres? per hour)/i, f: v => v * 3.6, from: 'm/s', to: 'km/h', how: (a, l) => `${fmt(a, l)} \\cdot 3{,}6` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:mijl|miles?|meilen?|milles?|millas?|mi\b)\D{0,25}?(?:km|kilomet)/i, f: v => v * 1.609344, from: 'mi', to: 'km', how: (a, l) => `${fmt(a, l)} \\cdot 1{,}609344` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:km|kilometers?|kilometres?|kilometer)\D{0,25}?(?:mijl|miles?|meilen?|milles?|millas?)/i, f: v => v / 1.609344, from: 'km', to: 'mi', how: (a, l) => `\\frac{${fmt(a, l)}}{1{,}609344}` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?s?)\D{0,25}?(?:pond|pounds?|lbs?|pfund|livres?|libras?)/i, f: v => v / 0.45359237, from: 'kg', to: 'lb', how: (a, l) => `\\frac{${fmt(a, l)}}{0{,}45359237}` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:pond|pounds?|lbs?|pfund|livres?|libras?)\D{0,25}?(?:kg|kilo)/i, f: v => v * 0.45359237, from: 'lb', to: 'kg', how: (a, l) => `${fmt(a, l)} \\cdot 0{,}45359237` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:inch(?:es)?|duim|zoll|pouces?|pulgadas?|")\D{0,25}?(?:cm|centimet)/i, f: v => v * 2.54, from: 'inch', to: 'cm', how: (a, l) => `${fmt(a, l)} \\cdot 2{,}54` },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:cm|centimeters?|centimetres?)\D{0,25}?(?:inch|duim|zoll|pouces?|pulgadas?)/i, f: v => v / 2.54, from: 'cm', to: 'inch', how: (a, l) => `\\frac{${fmt(a, l)}}{2{,}54}` },
  ];
  function convert(q, lang) {
    for (const c of CONV) {
      const m = q.match(c.re);
      if (!m) continue;
      const a = num(m[1].replace(/^-/, ''), lang) * (m[1].startsWith('-') ? -1 : 1), v = c.f(a);
      const how = c.how(a, lang).replace(/\{,\}/g, lang === 'en' ? '.' : '{,}');
      return { kind: 'omrekenen', value: v, show: [[fmt(v, lang, { digits: 1 }), fmt(v, lang)]], fact: `${clean(a)} ${c.from} = ${clean(+v.toFixed(3))} ${c.to}.`,
        text: `${fmt(a, lang)} ${c.from} = $${how}$ ${approx(v, 1) ? '≈' : '='} **${fmt(v, lang, { digits: 1 })} ${c.to}**` };
    }
    return null;
  }

  // ---------- gewone sommen ----------
  // "Wat is 2 + 2?", "hoeveel is 7 x 8", "bereken 12,5 : 4", "√144", "3 tot de macht 4". Alleen als de rest van de vraag
  // echt een som is; "hoeveel is 2 + 2 als je bang bent" niet.
  const ASK = /^(?:(?:en |and |und |et |y )?(?:wat|hoeveel) (?:is|zijn|wordt|maakt|geeft)|reken (?:uit|na)|bereken|uitrekenen|what(?:'s| is| does)|how much is|calculate|compute|work out|solve|was (?:ist|sind|ergibt|gibt)|wie ?viel (?:ist|sind|ergibt|gibt)|berechne|rechne(?: aus)?|combien (?:font|fait|vaut|égale?|egale?)|calcule[rsz]?|que (?:vaut|font|fait)|cu[aá]nto (?:es|son|da|hace)|calcula|qu[eé] es)\s*[:,]?\s*/i;
  const WORDOPS = [
    [/\b(?:gedeeld door|delen door|divided by|over|geteilt durch|durch|divis[ée] par|dividido (?:entre|por)|entre)\b/gi, '/'],
    [/\b(?:keer|maal|times|multiplied by|mal|fois|multipli[ée] par|por|multiplicado por)\b/gi, '*'],
    [/\b(?:plus|und|más|mas)\b/gi, '+'], [/\b(?:min|minus|moins|menos|weniger)\b/gi, '-'],
    [/\b(?:tot de macht|to the power of|to the|hoch|puissance|elevado a)\b/gi, '^'],
    [/\b(?:in het kwadraat|kwadraat|squared|zum quadrat|hoch zwei|au carr[ée]|al cuadrado)\b/gi, '^2'],
    [/\b(?:de |the |die |la )?(?:wortel|vierkantswortel|square root|quadratwurzel|wurzel|racine carr[ée]e|racine|ra[íi]z cuadrada|ra[íi]z)\s*(?:van|uit|of|aus|von|de)?\s*(\d+(?:[.,]\d+)?)/gi, 'sqrt($1)'],
  ];
  function arithmetic(q) {
    const typed = q.trim().replace(/^[¿¡]\s*/, '');
    let s = typed.replace(/[?!.=\s]+$/, '').replace(ASK, '').trim();
    for (const [re, to] of WORDOPS) s = s.replace(re, to);
    s = s.replace(/(\d)\s*[x×]\s*(?=[\d(])/gi, '$1*').replace(/(\d)\s*:\s*(?=[\d(])/g, '$1/').replace(/√\s*(\d+(?:[.,]\d+)?)/g, 'sqrt($1)').replace(/[−–]/g, '-').trim();
    if (!/^[\d\s.,+\-*/^()²³%]*(sqrt\([\d.,]+\)[\d\s.,+\-*/^()²³%]*)*$/.test(s)) return null;
    if (!/\d/.test(s) || !/[+\-*/^²³%]|sqrt/.test(s.replace(/^-/, ''))) return null;
    const expr = s.replace(/(\d+(?:[.,]\d+)?)\s*%/g, '($1/100)');
    const f = R.compile(expr);
    if (!f) return null;
    const v = f(0);
    if (!Number.isFinite(v)) return null;
    return { expr: s, value: v, colon: /\d\s*:\s*\d/.test(typed) };
  }
  function sum(q, lang) {
    const a = arithmetic(q);
    if (!a) return null;
    const v = a.value;
    const pretty = a.expr.replace(/sqrt\(([^)]*)\)/g, '√$1').replace(/\*/g, ' × ').replace(/\//g, a.colon ? ' : ' : '/').replace(/\s*([+\-])\s*/g, ' $1 ').replace(/\s*\^\s*/g, '^').replace(/\s{2,}/g, ' ').replace(/^ - /, '-').trim();
    // Een breuk als uitkomst van een som met breuken: 1/3 + 1/4 = 7/12 ≈ 0,5833
    const fr = !Number.isInteger(clean(v)) && approx(v, 4) && /\//.test(a.expr) ? frac(v) : null;
    const F = fmt(v, lang, { digits: 4 });
    const text = fr ? `${pretty} = **${fr[0]}/${fr[1]}** ≈ ${F}` : approx(v, 4) ? `${pretty} ≈ **${F}**` : `${pretty} = **${F}**`;
    return { kind: 'som', value: v, show: [fr ? `${fr[0]}/${fr[1]}` : F], fact: `${a.expr} = ${fr ? `${fr[0]}/${fr[1]} ≈ ` : ''}${clean(+v.toPrecision(10))}`, text };
  }

  // ---------- grafiek van een functie: de belangrijke punten ----------
  // Bij "Teken de grafiek van y = x^2 - 4" tekent Kamelo de grafiek zelf (rich.js), maar de AI schrijft de tekst erbij en
  // haalde x en y door elkaar ("snijpunt met de y-as is (-4, 0)", meetset 16 okt). Voor een rechte lijn of parabool rekent
  // Kamelo de snijpunten en de top uit; die gaan als vast gegeven met de vraag mee.
  function functionFacts(q, lang = 'en') {
    const m = String(q).match(/(?:y|f\s*\(\s*x\s*\))\s*=\s*([-+−\dx\s^².,³*·]+?)(?=\s*(?:$|[?!]|\b(?:for|voor|van|from|von|f[üu]r|pour|para|de|tussen|between|zwischen|entre|met|with|mit|avec|con|and|en|und|et|y)\b))/i);
    const p = m && parsePoly(m[1]);
    if (!p || !p.length) return null;
    const deg = Math.max(...p.map(([n]) => n));
    if (deg < 1 || deg > 2) return null;
    const c = n => p.find(([k]) => k === n)?.[1] || 0;
    const A = deg === 2 ? c(2) : 0, B = c(1), C = c(0);
    const pt = (x, y) => `(${clean(+x.toFixed(4))}, ${clean(+y.toFixed(4))})`;
    const facts = [`For y = ${plainPoly(p, 'en')}: it crosses the y-axis at ${pt(0, C)} (points are written as (x, y), x first).`];
    if (deg === 1) {
      facts.push(`It is a straight line with slope ${clean(B)}${near(B, 0) ? '' : ` and crosses the x-axis at ${pt(-C / B, 0)}`}.`);
    } else {
      const D = B * B - 4 * A * C, vx = -B / (2 * A), vy = A * vx * vx + B * vx + C;
      facts.push(`It is a parabola that opens ${A > 0 ? 'upwards' : 'downwards'}, with its ${A > 0 ? 'lowest' : 'highest'} point (vertex) at ${pt(vx, vy)}.`);
      if (D > 1e-12) { const r = [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)].sort((x, y) => x - y); facts.push(`It crosses the x-axis at ${pt(r[0], 0)} and ${pt(r[1], 0)}.`); }
      else if (Math.abs(D) <= 1e-12) facts.push(`It touches the x-axis only at ${pt(vx, 0)}.`);
      else facts.push('It does not cross the x-axis.');
    }
    void lang;
    return facts.join(' ');
  }

  // Wil iemand alleen de uitkomst, of uitleg? Bij "leg uit", "waarom", "stap voor stap" schrijft de AI het antwoord,
  // met Kamelo's uitkomst als vaststaand gegeven.
  const EXPLAIN = /leg (?:het |me |eens )?uit|uitleg|uitleggen|stap voor stap|stapsgewijs|waarom|hoe (?:kom|werkt|reken|doe|bereken|los)|laat (?:zien|me zien) hoe|explain|step by step|show (?:me |the |your )?(?:how|work|steps|calculation)|walk me through|why|how do (?:i|you)|erkl[äa]r|schritt f[üu]r schritt|warum|wie (?:kommt|rechnet|l[öo]se)|explique|[ée]tape par [ée]tape|pourquoi|comment (?:on|je|faire|calculer)|explica|paso a paso|por qu[ée]|c[óo]mo se/i;
  const wantsExplain = q => EXPLAIN.test(q);

  // Alles proberen, in deze volgorde (een vergelijking eerst: "wat is x als 3x + 7 = 22").
  function solve(q, lang = 'en') {
    if (!R?.compile || typeof q !== 'string' || q.length > 400) return null;
    lang = LANGS.includes(lang) ? lang : 'en';
    for (const fn of [equation, calculus, percent, geometry, convert, sum]) {
      try { const r = fn(q, lang); if (r) return r; } catch (e) { void e; }
    }
    return null;
  }
  // Staat Kamelo's uitkomst in het antwoord van de AI? Zonder spaties, met punt of komma, x² gelijk aan x^2.
  // Elk getal uit show moet erin staan; een lijst binnen show zijn gelijkwaardige schrijfwijzen (3x² + 2 of 3x^2 + 2).
  const squash = t => String(t).normalize('NFKC').replace(/[\s  ]/g, '').replace(/\\,/g, '').replace(/\{,\}/g, ',').replace(/\^/g, '').toLowerCase();
  function forms(v) {
    const base = [v, v.replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '')];
    return [...new Set(base.flatMap(b => [b, b.replace(/,/g, '.'), b.replace(/\./g, ',')]))];
  }
  function has(answer, result) {
    if (!result?.show?.length) return true;
    const flat = squash(answer);
    // los getal: 12 telt niet als 2, 397,80 niet als 97,8
    const esc = t => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const one = s => forms(squash(s)).some(f => new RegExp(`(?<![\\d.,]|[\\d][.,])${esc(f)}(?![\\d]|[.,]\\d)`).test(flat));
    return result.show.every(s => (Array.isArray(s) ? s.some(one) : one(s)));
  }

  const api = { solve, has, wantsExplain, functionFacts, num, fmt, parsePoly, poly, arithmetic };
  globalThis.KameloReken = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
