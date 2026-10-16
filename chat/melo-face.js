// Melo's gezicht: de blauwe kameleonkop van 16 okt (brand/mascotte/referentie-nieuw-16okt.webp), met de hand getekend in lagen.
// Kop (twee oogbollen + kuif + kaak), snuit, per oog: ring, oogwit, pupil met lichtpuntje, oogleden en een dicht-oog-boogje;
// mond (één vorm: lijn, open met tong, of een "o") en blosjes. Elke uitdrukking is een set getallen; tussen twee uitdrukkingen
// worden alle getallen geleidelijk omgezet (geen sprongen), in elke browser, zonder CSS-animatie of iets van buiten.
//
// In de chat kijkt Melo mee (geen koppeling in chat.js nodig; Melo Chat op kamelo.eu roept watchChat aan met eigen opties):
//   je typt                         → luisterend, de ogen lezen mee met de cursor
//   je verstuurt een vraag          → even nieuwsgierig        een bedankje → dankbaar     een persoonlijk verhaal → meelevend
//   wachten op het eerste woord     → nadenkend, de ogen draaien rond (bij een persoonlijk verhaal blijft hij meelevend)
//   het antwoord komt binnen        → pratend (de mond beweegt op de tekst), daarna even tevreden
//   namen/gegevens afgeschermd      → knipoog          vraag uit de melding → verrast          nieuw gesprek / AI klaar → lachend
//   niet verstuurd / fout           → bezorgd          paneel een minuut weg of uitgezet → slapend, wakker bij een klik of toets
//   verder                          → neutraal: ademt, knippert, kijkt soms met één oog rond
// Verdrietig gebruikt hij nooit uit zichzelf. prefers-reduced-motion: wel de juiste uitdrukking, maar zonder beweging.
(() => {
  'use strict';
  // ---------- vorm (tekening in 0 0 240 200, gemeten op het voorbeeld; het svg-vlak VIEW heeft ruimte rondom) ----------
  const COL = { skin: '#0C88FE', ring: '#78C8FC', muzzle: '#A6DEFC', ink: '#03225A', tongue: '#FD8177', blush: '#FF9F91', edge: '#2F9BFF' };
  const BODY = 'M57 57C75 42 95 24 112 13C124 5 146 0 156 11C164 22 172 38 188 55L214 130 210 140C210 175 175 196 118 196C62 196 31 178 31 140L28 120Z';
  const BULGE = { L: [43, 98, 37, 45], R: [197, 98, 38, 45.5] };
  const RING = { L: [45, 100.5, 34, 36.5], R: [193, 99, 35.5, 38] };
  const WHITE = { L: [43, 102.5, 29, 30.5], R: [195, 101.5, 30, 32] };
  // Snuit: breed en plat (gemeten op referentie-monden-16okt.png): rechte bovenkant op 147, ronde hoeken, onderkant precies
  // langs de kaak (uitgerekend, dus geen clipPath nodig; ook macOS kan hem zo tekenen).
  const MUZZLE = 'M44.15 174.66C45.68 158.41 58.45 147 80 147H153C176 147 189 160 189 178V178.76C173.1 189.89 148.75 196 118 196C83.2 196 58.05 189.05 44 174.66Z';
  const BLUSH = { L: [66, 168, 10, 5], R: [167, 168, 10, 5] };   // op de snuit: perzik, geen paarse vlek op het blauw
  const PIVOT = [120, 196];   // onderkant van de kaak: ademen en indeuken gebeurt vanaf hier
  const TURN = [120, 112];    // midden van de kop: kantelen, zodat de oogbollen niet ver naar buiten zwaaien
  // Het vlak heeft ruimte rondom (15 opzij, 18 boven en 7 onder), zodat kantelen, stuiteren en ademen nooit afgesneden worden.
  const VIEW = '-15 -18 270 225';

  // ---------- mond: altijd 12 getallen (begin, boven 2 handvatten, eind, onder 2 handvatten), dus altijd te mengen ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  // Een mond met een open onderkant: `top` en `bottom` = hoe ver het midden zakt (negatief = omhoog, een frons).
  function mouth(x1, y1, x2, y2, top, bottom = top) {
    const k = 4 / 3, c = (t, d) => [lerp(x1, x2, t), lerp(y1, y2, t) + d * k];
    return [x1, y1, ...c(1 / 3, top), ...c(2 / 3, top), x2, y2, ...c(2 / 3, bottom), ...c(1 / 3, bottom)];
  }
  const line = (x1, y1, x2, y2, sag) => mouth(x1, y1, x2, y2, sag);
  // Een golfje (verward, bezorgd): de twee handvatten zakken verschillend.
  const wave = (x1, y1, x2, y2, a, b) => [x1, y1, lerp(x1, x2, 1 / 3), y1 + a, lerp(x1, x2, 2 / 3), y2 + b, x2, y2, lerp(x1, x2, 2 / 3), y2 + b, lerp(x1, x2, 1 / 3), y1 + a];
  const oval = (cx, cy, rx, ry) => [cx - rx, cy, cx - rx, cy - ry * 4 / 3, cx + rx, cy - ry * 4 / 3, cx + rx, cy, cx + rx, cy + ry * 4 / 3, cx - rx, cy + ry * 4 / 3];

  // ---------- uitdrukkingen ----------
  // Per oog: h = bovenooglid (-1.3 open … 0 half … .2 dicht), tilt = binnenkant hoger (+) of lager (-), bow = doorzakken,
  // lo = onderooglid (1.3 weg … .5 knijpen), arc = dicht oog als boogje (1), bend = 1 lachend ∩ / 0 rustig ∪,
  // x/y = pupil extra, ps = pupilgrootte. look = waar beide ogen heen kijken, conv = naar binnen (naar jou toe kijken).
  const E = o => ({ h: -1.3, tilt: 0, bow: 2, lo: 1.3, lb: 3, arc: 0, bend: 1, x: 0, y: 0, ps: 1, ...o });
  // lip = 1: de mond is de bovenrand van de snuit (erboven blauw, zoals op het voorbeeld); 0 bij een "o": de snuit blijft plat.
  const F = o => ({ look: [0, 1], conv: 3, mw: 3.8, tongue: 0, blush: 0, lip: 1, tilt: 0, lift: 0, skin: COL.skin, ...o, L: E(o.L), R: E(o.R ?? o.L) });
  const SMILE = line(72, 145, 158, 144, 13);
  const EMOTIONS = {
    neutraal: { face: F({ m: line(98, 146, 136, 146, 5) }), en: 'Neutral', wat: 'Rustig, kijkt je aan' },
    tevreden: { face: F({ look: [7, 2], conv: 0, m: SMILE }), en: 'Content', wat: 'Zachte glimlach (voorbeeld 1)' },
    lachend: { face: F({ L: { arc: 1 }, m: mouth(81, 144.5, 159, 143.5, 7, 32), tongue: 1 }), en: 'Laughing', wat: 'Ogen dicht, mond open (voorbeeld 2)', react: 'bounce' },
    knipoog: { face: F({ look: [5, 0], L: {}, R: { arc: 1 }, m: line(78, 144.5, 154, 141, 14) }), en: 'Winking', wat: 'Eén oog dicht, glimlach (voorbeeld 6)' },
    verrast: { face: F({ conv: 2, L: { h: -1.45, ps: .88 }, m: oval(120.5, 160.5, 9.5, 14.5), lip: 0 }), en: 'Surprised', wat: 'Grote ogen, kleine o (voorbeeld 5)', react: 'pop' },
    verdrietig: { face: F({ look: [0, 7], conv: 6, L: { h: -.57, tilt: .3 }, m: line(99, 148, 146, 148, -5.5) }), en: 'Sad', wat: 'Oogleden omlaag, frons (voorbeeld 4)' },
    bezorgd: { face: F({ look: [0, -5], conv: 1, L: { h: -.95, tilt: .5, bow: 0, ps: .86 }, m: wave(100, 147.5, 140, 147.5, -5, 4) }), en: 'Worried', wat: 'Ogen omhoog, golfje' },
    sceptisch: { face: F({ look: [0, 0], conv: 0, L: { h: -.45, tilt: .32, bow: 1, x: 4, y: -2 }, R: { x: 9, y: -12 }, m: line(118, 156, 155, 142.5, 3.8) }), en: 'Sceptical', wat: 'Eén ooglid half dicht (voorbeeld 3)' },
    nadenkend: { face: F({ look: [-9, -12], conv: 0, m: wave(108, 148, 134, 145, -3, 2), tilt: -3 }), en: 'Thinking', wat: 'Kijkt omhoog, ogen draaien rond', think: true },
    luisterend: { face: F({ conv: 5, L: { ps: 1.06 }, m: line(100, 147, 138, 147, 6), tilt: 3 }), en: 'Listening', wat: 'Ogen iets dicht, warm' },
    meelevend: { face: F({ look: [0, 3], conv: 5, L: { h: -1.0, tilt: .16 }, m: line(98, 147.5, 140, 147.5, 6), tilt: 5 }), en: 'Sympathetic', wat: 'Zachte blik, hoofd scheef' },
    trots: { face: F({ look: [0, 2], L: { h: -.4, tilt: -.05, bow: 0 }, m: line(74, 143, 158, 142, 15), tilt: -4, lift: -2 }), en: 'Proud', wat: 'Ogen half dicht, brede lach' },
    verlegen: { face: F({ look: [-8, 8], conv: 2, m: line(98, 147.5, 124, 147.5, 4), blush: 1, tilt: -5 }), en: 'Shy', wat: 'Kijkt weg, blosjes' },
    slaperig: { face: F({ look: [0, 5], L: { h: -.08, tilt: -.12 }, m: oval(119, 156, 4.5, 3.5), lip: 0 }), en: 'Sleepy', wat: 'Zware oogleden' },
    verward: { face: F({ conv: 0, L: { ps: .85, x: -6, y: -7 }, R: { ps: 1.12, x: 5, y: 6 }, m: wave(96, 148, 140, 146, -8, 8), tilt: 6 }), en: 'Confused', wat: 'Ogen alle kanten op, golfje' },
    nieuwsgierig: { face: F({ look: [6, -3], L: { h: -1.45, ps: 1.1 }, m: oval(121, 157, 5, 6.5), lip: 0, tilt: 6 }), en: 'Curious', wat: 'Hoofd scheef, grote pupillen' },
    enthousiast: { face: F({ conv: 3, L: { h: -1.45, ps: 1.14 }, m: mouth(76, 142, 160, 142, 6, 34), tongue: 1 }), en: 'Excited', wat: 'Grote ogen, grote lach', react: 'bounce' },
    opgelucht: { face: F({ L: { arc: 1, bend: 0 }, m: line(88, 145, 150, 145, 12) }), en: 'Relieved', wat: 'Ogen rustig dicht, zucht', react: 'sigh' },
    vastberaden: { face: F({ conv: 5, L: { h: -.62, tilt: -.2, bow: 0, ps: .94 }, m: line(100, 148, 138, 145, 3), lift: -3 }), en: 'Determined', wat: 'Rechte oogleden, vaste mond' },
    dankbaar: { face: F({ L: { arc: 1 }, m: line(88, 145, 150, 145, 13), blush: .7, tilt: 4 }), en: 'Grateful', wat: 'Ogen dicht van blijdschap, blosjes', react: 'nod' },
  };
  // Twee toestanden voor de chat, geen emotie: praten (een mond die beweegt op de tekst) en slapen.
  const STATES = {
    pratend: { face: F({ m: line(96, 147, 142, 147, 7) }), en: 'Talking', wat: 'Mond beweegt terwijl het antwoord binnenkomt', talk: true },
    slapend: { face: F({ L: { arc: 1, bend: 0 }, m: line(108, 147.5, 130, 147.5, 3), lift: 2 }), en: 'Asleep', wat: 'Ogen dicht, ademt rustig' },
  };
  const MOODS = { ...EMOTIONS, ...STATES };
  const ALIAS = { blij: 'lachend' };   // oude naam (1.6.0)
  const known = name => MOODS[ALIAS[name] || name] ? ALIAS[name] || name : null;

  // ---------- wat er gezegd wordt: alleen grove herkenning op het apparaat, om een gezicht te kiezen ----------
  // Melo beoordeelt niets: dit kiest alleen hoe hij kijkt terwijl hij luistert. Een vraag maakt hem nieuwsgierig,
  // een bedankje dankbaar, een persoonlijk verhaal meelevend. Nooit verdrietig.
  const THANKS = /\b(thanks?|thank you|thx|ty|cheers|(heel |erg )?bedankt|dank( je| u)?( wel)?|dankjewel|merci|danke( schön| sehr)?|vielen dank|gracias|muchas gracias)\b/i;
  const PERSONAL = new RegExp('\\b(' + [
    'i feel', "i'm (so )?(sad|scared|afraid|anxious|lonely|depressed|worried|stressed|hurt)", 'i am (so )?(sad|scared|afraid|anxious|lonely|depressed|worried|stressed)',
    'my (mom|mother|dad|father|wife|husband|partner|girlfriend|boyfriend|son|daughter|friend|grandma|grandpa)', 'passed away', 'died', 'divorce', 'break ?up', 'broke up', 'grief', 'panic',
    'ik voel me', 'ik ben (zo |erg )?(bang|verdrietig|eenzaam|somber|gestrest|ongerust|boos)', 'mijn (moeder|vader|vrouw|man|partner|vriend|vriendin|zoon|dochter|oma|opa)', 'overleden', 'scheiding', 'uit elkaar', 'verdriet', 'rouw', 'angst', 'paniek',
    'ich fühle mich', 'meine? (mutter|vater|frau|mann|freundin|freund)', 'gestorben', 'trennung', 'je me sens', 'ma mère|mon père|mon mari|ma femme', 'décédé', 'me siento', 'mi (madre|padre|esposa|esposo|pareja)', 'falleció',
  ].join('|') + ')\\b', 'i');
  const QUESTION = /\?\s*$|^\s*(what|why|how|when|where|who|which|can|could|is|are|do|does|should|wat|waarom|hoe|wanneer|waar|wie|welke|kan|kun|mag|moet|is|zijn|was|warum|wie|wo|wer|pourquoi|comment|quand|qué|por qué|cómo|cuándo)\b/i;
  function classify(text = '') {
    const t = String(text).trim();
    if (!t) return null;
    if (PERSONAL.test(t)) return 'meelevend';
    if (THANKS.test(t) && t.length < 80) return 'dankbaar';
    if (QUESTION.test(t)) return 'nieuwsgierig';
    return null;
  }

  // ---------- mengen ----------
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const rgb = a => `rgb(${a.map(Math.round).join(',')})`;
  function mix(a, b, t) {
    if (typeof a === 'number') return lerp(a, b, t);
    if (typeof a === 'string') return t < 1 ? rgb(hex(a.startsWith('#') ? a : toHex(a)).map((v, i) => lerp(v, hex(b.startsWith('#') ? b : toHex(b))[i], t))) : b;
    if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], t));
    const o = {};
    for (const k in b) o[k] = mix(a[k] ?? b[k], b[k], t);
    return o;
  }
  const toHex = s => '#' + s.match(/\d+/g).map(n => (+n).toString(16).padStart(2, '0')).join('');
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);   // zacht beginnen en zacht landen
  const r2 = n => Math.round(n * 100) / 100;

  // ---------- van getallen naar tekening (puur, ook te testen zonder browser) ----------
  // Geeft per laag de attributen terug. `o` = extra's van dit moment: knipperen, praten, rondkijken, reactie.
  function paint(f, o = {}) {
    const out = {};
    const blink = o.blink || 0, talk = o.talk || 0;
    for (const s of ['L', 'R']) {
      const e = f[s], [wx, wy, wrx, wry] = WHITE[s], side = s === 'L' ? 1 : -1;
      const w = o.wander?.[s] || [0, 0], extra = o.look || [0, 0];
      // Pupil: waar hij kijkt, binnen het oogwit gehouden (een randje mag wegvallen achter de ring, zoals op het voorbeeld).
      const ps = e.ps, prx = wrx * .53 * ps, pry = wry * .56 * ps * Math.max(.02, 1 - e.arc * 1.15), shown = e.arc < .75 ? 1 : 0;
      let dx = f.look[0] + extra[0] + f.conv * side + e.x + w[0], dy = f.look[1] + extra[1] + e.y + w[1];
      const mx = wrx - prx - 1.5, my = wry - pry - 1.5, n = Math.hypot(dx / mx, dy / my);
      if (n > 1) { dx /= n; dy /= n; }
      const px = wx + dx, py = wy + dy;
      out[`pupil${s}`] = { cx: r2(px), cy: r2(py + e.arc * 6), rx: r2(prx), ry: r2(pry), opacity: shown };
      out[`glint${s}`] = { cx: r2(px - 4.5 * ps), cy: r2(py - 7 * ps), r: r2(3.4 * ps), opacity: e.arc < .3 ? 1 : 0 };
      // Dicht oog als boogje: ∩ (lachen) of ∪ (rustig, slapen).
      const b = e.bend, ey = lerp(2, 11, b) + wy, cy = lerp(15, -9, b) + wy;
      out[`arc${s}`] = { d: `M${r2(wx - 20)} ${r2(ey)}C${r2(wx - 13)} ${r2(cy)} ${r2(wx + 13)} ${r2(cy)} ${r2(wx + 20)} ${r2(ey)}`, opacity: r2(Math.max(0, Math.min(1, (e.arc - .35) / .45))) };
      // Oogleden (kleur van de ring), binnen de ring. Knipperen: beide leden naar elkaar toe.
      const h = lerp(e.h, .12, blink), lo = lerp(e.lo, .2, blink);
      const top = x => h * wry - e.tilt * x * side, Y = x => r2(wy + top(x - wx));
      const yl = wy + lo * wry;
      out[`ulid${s}`] = { d: `M${wx - 42} ${Y(wx - 42)}Q${wx} ${r2(wy + h * wry + e.bow * 2)} ${wx + 42} ${Y(wx + 42)}L${wx + 42} ${wy - 60}L${wx - 42} ${wy - 60}Z` };
      out[`uedge${s}`] = { d: `M${wx - 42} ${Y(wx - 42)}Q${wx} ${r2(wy + h * wry + e.bow * 2)} ${wx + 42} ${Y(wx + 42)}`, opacity: r2(Math.max(0, Math.min(1, (h + 1.05) * 4))) };
      out[`llid${s}`] = { d: `M${wx - 42} ${r2(yl)}Q${wx} ${r2(yl - e.lb * 2)} ${wx + 42} ${r2(yl)}L${wx + 42} ${wy + 60}L${wx - 42} ${wy + 60}Z` };
      out[`ledge${s}`] = { d: `M${wx - 42} ${r2(yl)}Q${wx} ${r2(yl - e.lb * 2)} ${wx + 42} ${r2(yl)}`, opacity: r2(Math.max(0, Math.min(1, (1.05 - lo) * 4))) };
    }
    // Mond. Praten: de onderkant zakt mee met de tekst.
    const m = f.m.slice();
    if (talk) { m[9] += talk * 9; m[11] += talk * 9; m[1] -= talk; m[7] -= talk; }
    const P = i => `${r2(m[i])} ${r2(m[i + 1])}`;
    const d = `M${P(0)}C${P(2)} ${P(4)} ${P(6)}C${P(8)} ${P(10)} ${P(0)}Z`;
    out.mouth = { d, 'stroke-width': r2(f.mw) };
    // Boven de mondlijn is het blauw: de snuit begint pas onder de mond.
    // Ligt een mondhoek lager dan de bovenkant van de snuit, dan loopt de rand er vloeiend naartoe (in het verlengde van de mond).
    const lt = Math.min(140, m[1] - 2, m[7] - 2), TOP = 147;
    const side = (x, y, dir) => {   // dir -1 = links, 1 = rechts: een zachte S van de platte rand naar de mondhoek
      const k = Math.max(0, y - TOP) * 5, ox = x + dir * k;   // lang en zacht, zoals bij de scheve lach van het voorbeeld
      return { ox, curve: `C${r2(x + dir * k * .45)} ${TOP} ${r2(x + dir * k * .4)} ${r2(y)} ${r2(x)} ${r2(y)}`, back: `C${r2(x + dir * k * .4)} ${r2(y)} ${r2(x + dir * k * .45)} ${TOP} ${r2(ox)} ${TOP}` };
    };
    const Ls = side(m[0], m[1], -1), Rs = side(m[6], m[7], 1);
    out.lip = { d: `M${r2(Ls.ox)} ${r2(lt)}L${r2(Ls.ox)} ${TOP}${Ls.curve}C${P(2)} ${P(4)} ${P(6)}${Rs.back}L${r2(Rs.ox)} ${r2(lt)}Z`, opacity: r2(f.lip), fill: f.skin };
    out.mclip = { d };
    const bottom = (m[1] + 3 * m[11] + 3 * m[9] + m[7]) / 8, top = (m[1] + 3 * m[3] + 3 * m[5] + m[7]) / 8, cx = (m[0] + m[6]) / 2;
    const gap = bottom - top, ty = Math.max(0, Math.min(1, (gap - 5) / 6));   // pas een tong als de mond echt open is
    out.tongue = { cx: r2(cx), cy: r2(bottom + 2), rx: r2(Math.abs(m[6] - m[0]) * .3), ry: r2(Math.max(1, gap * .75)), opacity: r2(Math.max(f.tongue, talk ? .9 : 0) * ty) };
    for (const s of ['L', 'R']) out[`blush${s}`] = { opacity: r2(Math.min(1, f.blush * 1.4)) };
    out.skin = { fill: f.skin };
    const re = o.react || {};
    out.all = { transform: `translate(${r2(re.x || 0)} ${r2(f.lift + (re.y || 0))}) rotate(${r2(f.tilt + (re.r || 0))} ${TURN[0]} ${TURN[1]})` +
      (re.s ? ` translate(${PIVOT[0]} ${PIVOT[1]}) scale(${r2(1 + (re.s[0] || 0))} ${r2(1 + (re.s[1] || 0))}) translate(${-PIVOT[0]} ${-PIVOT[1]})` : '') };
    return out;
  }

  // Korte reacties (één keer): x/y verschuiven, r draaien, s = [breder, hoger]. t loopt van 0 tot 1.
  const wobble = (t, n, decay = 3) => Math.sin(t * Math.PI * n) * Math.exp(-t * decay);
  const REACT = {
    bounce: { ms: 720, f: t => ({ y: -Math.abs(wobble(t, 3, 3.2)) * 7, s: [wobble(t, 6, 4) * .025, -wobble(t, 6, 4) * .025] }) },
    nod: { ms: 760, f: t => ({ y: Math.abs(wobble(t, 2, 2.4)) * 4, r: wobble(t, 2, 2.4) * -1.2 }) },
    shake: { ms: 640, f: t => ({ r: wobble(t, 4, 3) * 4 }) },
    pop: { ms: 420, f: t => ({ s: [Math.sin(t * Math.PI) * .035, Math.sin(t * Math.PI) * .04], y: -Math.sin(t * Math.PI) * 2 }) },
    sigh: { ms: 1300, f: t => ({ s: [Math.sin(t * Math.PI) * .02, -Math.sin(t * Math.PI) * .035], y: Math.sin(t * Math.PI) * 2 }) },
    tilt: { ms: 900, f: t => ({ r: Math.sin(t * Math.PI) * 6 }) },
  };

  const API = { EMOTIONS: Object.keys(EMOTIONS), STATES: Object.keys(STATES), MOODS: Object.keys(MOODS), INFO: MOODS, COL, VIEW, SHAPE: { BODY, BULGE, RING, WHITE, MUZZLE, BLUSH, PIVOT, TURN }, REACT, classify, paint, params: n => MOODS[known(n)]?.face, known };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = API; return; }

  // ---------- tekenen in de pagina ----------
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    kids.forEach(k => n.append(k));
    return n;
  };
  const ell = (a, attrs) => el('ellipse', { cx: a[0], cy: a[1], rx: a[2], ry: a[3], ...attrs });
  function build() {
    const id = `mf${++uid}`, refs = {};
    const ref = (name, node) => (refs[name] = node);
    const clip = (cid, node) => el('clipPath', { id: `${id}${cid}` }, [node]);
    const defs = el('defs', {}, [
      clip('rL', ell(RING.L)), clip('rR', ell(RING.R)),
      clip('wL', ell(WHITE.L)), clip('wR', ell(WHITE.R)), clip('m', ref('mclip', el('path'))),
    ]);
    // Kop: als één vorm in de kleur van de huid (ook de oogbollen).
    const head = ref('skin', el('g', { fill: COL.skin }, [ell(BULGE.L), ell(BULGE.R), el('path', { d: BODY })]));
    const muzzle = el('path', { d: MUZZLE, fill: COL.muzzle });
    const blush = ['L', 'R'].map(s => ref(`blush${s}`, ell(BLUSH[s], { fill: COL.blush, opacity: 0 })));
    const eyes = ['L', 'R'].map(s => el('g', { class: `mf-eye mf-eye${s}` }, [
      ell(RING[s], { fill: COL.ring }), ell(WHITE[s], { fill: '#fff' }),
      el('g', { 'clip-path': `url(#${id}w${s})` }, [ref(`pupil${s}`, el('ellipse', { fill: COL.ink })), ref(`glint${s}`, el('circle', { fill: '#fff' }))]),
      el('g', { 'clip-path': `url(#${id}r${s})` }, [
        ref(`ulid${s}`, el('path', { fill: COL.ring })), ref(`uedge${s}`, el('path', { stroke: COL.edge, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' })),
        ref(`llid${s}`, el('path', { fill: COL.ring })), ref(`ledge${s}`, el('path', { stroke: COL.edge, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' })),
      ]),
      ref(`arc${s}`, el('path', { stroke: COL.ink, 'stroke-width': 4.6, fill: 'none', 'stroke-linecap': 'round' })),
    ]));
    const mouth = ref('mouth', el('path', { fill: COL.ink, stroke: COL.ink, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const tongue = ref('tongue', el('ellipse', { fill: COL.tongue, 'clip-path': `url(#${id}m)` }));
    // Ademen: SMIL (werkt overal, ook met een strenge CSP), alleen als beweging mag.
    const breath = el('g');
    if (!reduced.matches) breath.append(el('animateTransform', { attributeName: 'transform', type: 'scale', values: '1 1;1.008 1.016;1 1', dur: '4.4s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '.45 0 .55 1;.45 0 .55 1' }));
    const lip = ref('lip', el('path', { fill: COL.skin }));
    breath.append(el('g', { transform: `translate(${-PIVOT[0]} ${-PIVOT[1]})` }, [head, muzzle, lip, ...blush, ...eyes, mouth, tongue]));
    // stroke="none": een algemene regel als `svg { stroke: currentColor }` (kamelo.eu) zou anders elke vorm een rand geven.
    const all = ref('all', el('g', { class: 'mf-all', stroke: 'none' }, [el('g', { transform: `translate(${PIVOT[0]} ${PIVOT[1]})` }, [breath])]));
    const svg = el('svg', { viewBox: VIEW, fill: 'none', 'aria-hidden': 'true', focusable: 'false', class: 'mf' }, [defs, all]);
    return { svg, refs };
  }
  function apply(refs, out) {
    for (const [k, attrs] of Object.entries(out)) {
      const node = refs[k];
      if (!node) continue;
      for (const [a, v] of Object.entries(attrs)) node.setAttribute(a, v);
    }
  }

  // ---------- één gezicht: een eigen bestuurder ----------
  // face(host) → { set(naam), react(naam), look(x, y), talk(aan), blink(), wander(oog, x, y), mood, svg }
  const active = new Set();
  let ticking = false, clock = () => performance.now();
  const instant = () => reduced.matches || document.hidden || API.still;
  function face(host, { mood = 'neutraal', still = false } = {}) {
    if (host.__meloFace) return host.__meloFace;
    const { svg, refs } = build();
    host.replaceChildren(svg);
    const start = MOODS[known(mood) || 'neutraal'].face;
    const c = {
      svg, refs, mood: known(mood) || 'neutraal', still,
      cur: start, from: start, to: start, t0: 0, dur: 0,
      lookT: [0, 0], lookC: [0, 0], wanderT: { L: [0, 0], R: [0, 0] }, wanderC: { L: [0, 0], R: [0, 0] },
      talkOn: false, talkC: 0, thinking: false, blinkAt: -1, anim: null,
      set(name, { ms = 280, react = true } = {}) {
        const n = known(name);
        if (!n || (n === c.mood && !c.dur)) return c;
        const prev = c.mood;
        c.mood = n;
        c.from = c.cur; c.to = MOODS[n].face; c.t0 = clock(); c.dur = instant() || c.still ? 0 : ms;
        c.thinking = !!MOODS[n].think;
        svg.dataset.mood = n;
        if (react && MOODS[n].react && prev !== n) c.react_(MOODS[n].react);
        // Bij een wissel tussen twee open-oog-gezichten soms even knipperen: dat maakt de overgang levendig.
        else if (c.dur && !MOODS[n].face.L.arc && !c.from.L.arc && Math.random() < .35) c.blink();
        wake(c);
        return c;
      },
      react_(name) { if (!instant() && !c.still && REACT[name]) { c.anim = { ...REACT[name], t0: clock() }; wake(c); } return c; },
      react(name) { return c.react_(name); },
      look(x = 0, y = 0) { c.lookT = [x, y]; if (instant()) c.lookC = [x, y]; wake(c); return c; },
      wander(s, x = 0, y = 0) { if (s) c.wanderT[s] = [x, y]; else c.wanderT = { L: [0, 0], R: [0, 0] }; wake(c); return c; },
      talk(on = true) { if (c.talkOn !== !!on) { c.talkOn = !!on; wake(c); } return c; },
      blink() { if (!instant() && !c.still && !c.cur.L.arc && !c.cur.R.arc) { c.blinkAt = clock(); wake(c); } return c; },
    };
    host.__meloFace = c;
    svg.dataset.mood = c.mood;
    frame(c, clock());
    return c;
  }
  function wake(c) {
    if (instant() || c.still) { c.cur = c.to; c.dur = 0; c.lookC = c.lookT.slice(); c.wanderC = { L: c.wanderT.L.slice(), R: c.wanderT.R.slice() }; frame(c, clock()); return; }
    active.add(c);
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  let last = 0;
  function tick() {
    const now = clock(), dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    for (const c of active) if (!frame(c, now, dt)) active.delete(c);
    if (active.size && !document.hidden) requestAnimationFrame(tick);
    else { ticking = false; last = 0; for (const c of active) { c.cur = c.to; frame(c, now); } active.clear(); }
  }
  // Teken één moment; geeft terug of er nog iets beweegt.
  function frame(c, now, dt = 1) {
    let busy = false;
    if (c.dur) {
      const t = Math.min(1, (now - c.t0) / c.dur);
      c.cur = t < 1 ? mix(c.from, c.to, ease(t)) : c.to;
      if (t < 1) busy = true; else c.dur = 0;
    } else c.cur = c.to;
    // Ogen volgen soepel (een veer zonder doorschieten).
    const k = Math.min(1, dt * 10);
    const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < .05;
    c.lookC = c.lookC.map((v, i) => lerp(v, c.lookT[i], k));
    if (!near(c.lookC, c.lookT)) busy = true; else c.lookC = c.lookT.slice();
    for (const s of ['L', 'R']) {
      c.wanderC[s] = c.wanderC[s].map((v, i) => lerp(v, c.wanderT[s][i], Math.min(1, dt * 7)));
      if (!near(c.wanderC[s], c.wanderT[s])) busy = true; else c.wanderC[s] = c.wanderT[s].slice();
    }
    const o = { look: c.lookC.slice(), wander: c.wanderC };
    // Nadenken: de ogen draaien langzaam rond.
    if (c.thinking && !c.dur && !instant()) {
      const a = now / 1000 * 2.1;
      o.look[0] += Math.cos(a) * 6; o.look[1] += Math.sin(a) * 4;
      busy = true;
    }
    // Praten: de mond gaat open en dicht in een onregelmatig ritme, zoals lettergrepen.
    const talking = MOODS[c.mood].talk || c.talkOn;
    const want = talking && !instant() && !c.still ? Math.max(0, .5 + .5 * Math.sin(now / 1000 * 15) * Math.sin(now / 1000 * 4.3 + 1)) : 0;
    c.talkC = lerp(c.talkC, want, Math.min(1, dt * 18));
    if (talking || c.talkC > .01) { o.talk = c.talkC; busy = true; } else c.talkC = 0;
    // Knipperen: snel dicht (90 ms), iets rustiger open (140 ms).
    if (c.blinkAt >= 0) {
      const t = now - c.blinkAt;
      o.blink = t < 90 ? ease(t / 90) : t < 230 ? 1 - ease((t - 90) / 140) : 0;
      if (t < 230) busy = true; else c.blinkAt = -1;
    }
    if (c.anim) {
      const t = (now - c.anim.t0) / c.anim.ms;
      if (t < 1) { o.react = c.anim.f(t); busy = true; } else c.anim = null;
    }
    apply(c.refs, paint(c.cur, o));
    return busy;
  }
  const faceImpl = face;

  // ---------- alle "levende" gezichten op de pagina volgen één stemming ----------
  const live = new Set();
  let mood = 'neutraal', look = [0, 0];
  function mount(host) {
    if (host.__meloFace) return host.__meloFace.svg;
    const c = faceImpl(host, { mood });
    c.look(...look);
    live.add(c);
    return c.svg;
  }
  const eachLive = fn => live.forEach(c => (c.svg.isConnected ? fn(c) : live.delete(c)));
  function setMood(name, x = 0, y = 0) {
    const n = known(name);
    if (!n) return;
    mood = n; look = [x, y];
    eachLive(c => { c.set(n); c.look(x, y); });
  }
  const setWander = w => eachLive(c => (w ? c.wander(w.s, w.dx, w.dy) : c.wander()));
  const react = name => eachLive(c => c.react(name));
  // Een los, stilstaand gezicht (overzicht, blad, preview); doet niet mee met de chat.
  function render(host, name) { host.__meloFace = null; return faceImpl(host, { mood: name, still: true }).svg; }

  // Knipperen: om de 3 à 6 seconden, soms twee keer achter elkaar. Alleen als het in beeld is.
  (function blinkLoop() {
    setTimeout(() => {
      if (!document.hidden) { eachLive(c => c.blink()); if (Math.random() < .2) setTimeout(() => eachLive(c => c.blink()), 320); }
      blinkLoop();
    }, 2800 + Math.random() * 3400);
  })();

  // ---------- meekijken met de chat ----------
  // Standaard voor de chat van de extensie (chat/chat.js). Melo Chat op kamelo.eu (melo/melo.js) geeft eigen opties:
  //   msgs      id van de lijst met berichten          thinking  selector van "nog geen woord" in een antwoord
  //   worried   (note) → true bij "niet verstuurd"     waiting   (note) → true terwijl de AI wordt klaargezet
  //   readyText tekst in de melding als de AI klaarstaat (even lachend)
  function watchChat(opts = {}) {
    const $ = id => document.getElementById(id);
    const T = (k, v) => globalThis.PrivacyI18n?.t(k, v) || '';
    const progress = [T('pchatPreparing'), T('pchatDownloading', { p: '§' }).split('§')[0]].filter(Boolean);
    const o = {
      msgs: 'msgs', thinking: '.dots', readyText: T('pchatDeviceReady'),
      worried: n => n.classList.contains('bad') || (!!T('pchatNotSentTitle') && n.querySelector('b')?.textContent === T('pchatNotSentTitle')),
      waiting: n => progress.some(p => n.textContent.startsWith(p)),
      ...opts,
    };
    const input = $('input'), msgs = $(o.msgs), noteEl = $('note'), form = $('form');
    let pulse = null, lastTalk = -1e9, doneAt = -1e9, asleep = false, sleepTimer = null, typedValue = input?.value || '', lastNote = '';
    let tone = null, greeted = false, glanceUntil = 0, glance = 0;
    const now = () => performance.now();
    // Even een andere uitdrukking, daarna weer wat er echt aan de hand is.
    const flash = (name, ms) => { pulse = { name, until: now() + ms }; evaluate(); setTimeout(evaluate, ms + 20); };

    function mountAll(root = document) { root.querySelectorAll?.('[data-melo]').forEach(mount); }
    const answers = () => [...(msgs?.querySelectorAll('.a') || [])].filter(a => !a.closest('.thread[hidden]'));
    function lastAnswer() { const all = answers(); return all.length ? all[all.length - 1] : null; }

    // Melo's hoofdje naast elk antwoord. Alleen het nieuwste hoofdje leeft mee; oudere staan stil en kijken vriendelijk.
    let syncing = false;
    function syncRows() {
      if (syncing || !msgs) return;
      syncing = true;
      for (const row of msgs.querySelectorAll('.mf-row')) if (!row.querySelector('.a')) row.remove();
      for (const a of msgs.querySelectorAll('.a')) {
        if (a.parentElement?.classList.contains('mf-row')) continue;
        const row = Object.assign(document.createElement('div'), { className: 'mf-row' });
        const f = Object.assign(document.createElement('span'), { className: 'melo-face mf-msg' });
        f.setAttribute('aria-hidden', 'true');
        a.replaceWith(row); row.append(f, a);
      }
      const liveFace = lastAnswer()?.parentElement.querySelector('.mf-msg');
      for (const f of msgs.querySelectorAll('.mf-msg')) {
        if (f === liveFace) { if (!f.__meloFace || f.__meloFace.still) { f.__meloFace = null; mount(f); } }
        else if (!f.__meloFace || !f.__meloFace.still) { if (f.__meloFace) live.delete(f.__meloFace); render(f, 'neutraal'); }
      }
      syncing = false;
    }
    function evaluate() {
      const t = now();
      if (document.documentElement.dataset.engine === 'off' || form?.hidden) return setMood('slapend');
      if (asleep) return setMood('slapend');
      handedOver();
      const noteOn = noteEl && !noteEl.hidden;
      if (noteOn && o.worried(noteEl)) return setMood('bezorgd');
      if (pulse && t < pulse.until) return setMood(pulse.name);
      pulse = null;
      const a = lastAnswer();
      if (a?.querySelector(o.thinking)) a.__meloAsked = true;
      // Wachten op het eerste woord: nadenken (of meelevend blijven bij iets persoonlijks).
      if (a?.__meloAsked && a.querySelector(o.thinking) || (noteOn && o.waiting(noteEl))) return setMood(tone === 'meelevend' ? 'meelevend' : 'nadenkend');
      if (t - lastTalk < 600) { eachLive(c => c.talk(true)); return setMood(tone === 'meelevend' ? 'meelevend' : 'pratend'); }
      eachLive(c => c.talk(false));
      const text = input?.value || '';
      if (text.trim()) {
        // Meelezen: de pupillen schuiven met de cursor mee, van links in de tekst naar rechts.
        const pos = input.selectionStart ?? text.length;
        return setMood('luisterend', input === document.activeElement ? r2(-5 + 10 * Math.min(1, (pos % 60) / 60)) : 0, 2);
      }
      // Net klaar met een antwoord: even tevreden (of nog even meelevend).
      if (t - doneAt < 2200) return setMood(tone === 'meelevend' ? 'meelevend' : 'tevreden');
      tone = null;
      setMood('neutraal', t < glanceUntil ? glance : 0, 0);
    }

    // Wat er op het scherm verandert.
    new MutationObserver(list => {
      syncRows();
      for (const m of list) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          mountAll(n.parentNode || n);
          if (n.matches?.('.seen') || n.querySelector?.('.seen')) flash('knipoog', 1100);
          if (n.matches?.('.a') && n.querySelector(o.thinking)) n.__meloAsked = true;
        }
        const a = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest?.('.a');
        if (a && a.__meloAsked && a === lastAnswer() && !a.querySelector(o.thinking) && a.textContent.trim()) { lastTalk = now(); doneAt = now() + 600; }
      }
      evaluate();
      setTimeout(evaluate, 620);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    if (noteEl) new MutationObserver(() => {
      const text = noteEl.hidden ? '' : noteEl.textContent;
      if (text && text !== lastNote && o.readyText && text === o.readyText) flash('lachend', 1500);
      lastNote = text;
      evaluate();
    }).observe(noteEl, { attributes: true, attributeFilter: ['hidden', 'class'] });

    // Wat je verstuurt bepaalt kort het gezicht (vóór chat.js het veld leegmaakt: daarom in de capture-fase).
    const sent = () => {
      const kind = classify(input?.value);
      tone = kind === 'meelevend' ? 'meelevend' : null;
      if (kind === 'dankbaar') flash('dankbaar', 1600);
      else if (kind === 'nieuwsgierig') flash('nieuwsgierig', 900);
      else if (kind === 'meelevend') flash('meelevend', 900);
    };
    if (input) {
      document.addEventListener('submit', e => { if (e.target === form) sent(); }, true);
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && input.value.trim()) sent(); }, true);
      $('send')?.addEventListener('click', () => { if (input.value.trim()) sent(); }, true);
      const typed = () => { typedValue = input.value; wake_(); evaluate(); };
      ['input', 'keyup', 'click', 'focus', 'blur', 'select'].forEach(ev => input.addEventListener(ev, typed));
    }
    // Een vraag uit de melding ("Ask Melo") verschijnt in het veld zonder dat je typt: even verrast.
    function handedOver() {
      if (!input || input.value === typedValue) return false;
      const grew = input.value.trim() && input.value.length > typedValue.length;
      typedValue = input.value;
      if (grew) pulse = { name: 'verrast', until: now() + 800 }, setTimeout(evaluate, 820);
      return grew;
    }
    setInterval(() => { if (input && input.value !== typedValue) evaluate(); }, 250);
    $('newChat')?.addEventListener('click', () => flash('lachend', 1200));

    // Slapen zoals de AI: een minuut niet in beeld en hij laat los (chat.js). Wakker bij de eerste klik of toets.
    function wake_() {
      if (!asleep) return;
      asleep = false;
      flash('verrast', 600);
    }
    document.addEventListener('visibilitychange', () => {
      clearTimeout(sleepTimer);
      if (document.hidden) sleepTimer = setTimeout(() => { if (mood !== 'pratend' && mood !== 'nadenkend') { asleep = true; evaluate(); } }, 60 * 1000);
    });
    ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, wake_, true));

    // Als er niets gebeurt kijkt hij rond: meestal met één oog tegelijk (het andere blijft bij jou), soms allebei even opzij.
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const idle = () => mood === 'neutraal' && !document.hidden && !reduced.matches;
    (function lookAround() {
      setTimeout(() => {
        if (idle()) {
          if (Math.random() < .7) {
            const first = pick(['L', 'R']), other = first === 'L' ? 'R' : 'L';
            const roam = s => ({ s, dx: pick([-9, -6, 6, 8]), dy: pick([-9, -5, 4]) });
            setWander(roam(first));
            const hold = 1300 + Math.random() * 900;
            if (Math.random() < .35) setTimeout(() => { if (idle()) setWander(roam(other)); }, hold);
            setTimeout(() => setWander(null), hold * (Math.random() < .35 ? 2 : 1) + 50);
          } else {
            glance = Math.random() < .5 ? -7 : 5; glanceUntil = now() + 1300;
            evaluate(); setTimeout(evaluate, 1350);
          }
        }
        lookAround();
      }, 6000 + Math.random() * 6000);
    })();

    syncRows();
    mountAll();
    evaluate();
    setTimeout(() => {
      if (!greeted && !input?.value.trim() && document.querySelector('.melo-face.big')?.offsetParent) { greeted = true; flash('knipoog', 900); }
    }, 700);
  }

  Object.assign(API, { face: faceImpl, mount, render, setMood, setWander, react, watchChat, setClock: fn => { clock = fn || (() => performance.now()); } });
  globalThis.KameloMelo = API;
  if (document.getElementById('msgs')) watchChat();   // chat van de extensie (en de demo); Melo Chat start hem zelf
  else document.querySelectorAll('[data-melo]').forEach(mount);
})();
