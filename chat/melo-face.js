// Melo's gezicht in de chat: de blauwe kameleonkop uit brand/mascotte/avatars, als één bewegend gezicht.
// Eén vaste kopvorm; alleen ogen, wenkbrauwen en mond bewegen, en vloeien zacht over van de ene uitdrukking in de andere.
// Melo kijkt mee met het scherm (geen koppeling in chat.js nodig; Melo Chat op kamelo.eu roept watchChat aan met eigen opties) en beoordeelt nooit wat je vraagt of wat de AI zegt:
//   je typt                       → luisterend (en leest mee met de cursor)
//   wachten op het eerste woord   → nadenkend (ook tijdens het klaarzetten of downloaden van de AI)
//   het antwoord komt binnen      → pratend
//   namen/gegevens afgeschermd    → even een knipoog
//   vraag uit de melding          → even verrast
//   nieuw gesprek, AI klaar       → even blij
//   niet verstuurd / fout         → bezorgd
//   paneel een minuut weg (AI losgelaten) of uitgezet door de organisatie → slapend; wakker bij de eerste klik of toets
//   verder                        → neutraal, met knipperen
// prefers-reduced-motion: geen overgangen, geen knipperen, geen pratende mond (wel de juiste uitdrukking).
(() => {
  'use strict';
  // Iets rondere kop (16 okt, Lucas koos versie 2 van 3); ogen en mond op dezelfde plek.
  const HEAD = 'M8 66C8 44 26 28 44 24C47 16 53 12 60 13C67 14 72 19 76 22C100 24 120 40 122 62C124 84 104 100 66 102C30 104 8 90 8 66Z';
  const BLUE = '#1A8CFF', INK = '#072A62';
  // De ogen zoals in de losse SVG's: pupil = 49% × 67% van het oogwit, lichtpuntje linksboven in de pupil.
  const EYE = { L: { cx: 48, cy: 65, rx: 12.5, ry: 16 }, R: { cx: 91, cy: 56, rx: 11, ry: 14.5 } };
  const LID = { L: 'M37 65Q47 75 58 63', R: 'M82 56Q91 66 101 54' };          // gesloten oog (boogje)
  const BROW = { L: 'M38 44Q47 40 55 42', R: 'M80 34Q89.5 37 99 40' };
  const SMILE = 'M70 82Q78 88 86 79';
  const open = (dx = 3, dy = 0, big = 0) => ({ open: true, dx, dy, big });
  const shut = lid => ({ open: false, lid });
  // Precies de acht gezichten uit brand/mascotte (build_avatars.py), plus "pratend" voor een antwoord dat binnenkomt.
  const MOODS = {
    neutraal: { L: open(), R: open(), mouth: [SMILE, 3.5] },
    luisterend: { L: open(0, 1), R: open(0, 1), mouth: ['M73 83Q79 86 84 81', 3] },
    nadenkend: { L: open(1, -3), R: open(1, -3), browL: [BROW.L, 2.5], mouth: ['M75 84Q81 80 86 82', 3] },
    bezorgd: { L: open(0, 1), R: open(0, 1), browL: ['M37 46Q46 43.5 55 41', 2.7], browR: [BROW.R, 2.7], mouth: ['M72 86Q79 80 86 83', 3] },
    verrast: { L: open(0, 0, 2), R: open(0, 0, 2.5), o: [79, 84, 5, 6.5] },
    blij: { L: shut('M37 66Q47 53 58 64'), R: shut('M82 57Q90 45 100 55'), mouth: ['M68 79Q78 94 89 76', 4] },
    knipoog: { L: shut('M37 65Q47 75 58 63'), R: open(), mouth: [SMILE, 3.5] },
    slapend: { L: shut('M37 65Q47 76 58 64'), R: shut('M82 56Q91 66 101 54'), mouth: ['M74 83Q79 86 84 81', 3] },
    pratend: { L: open(), R: open(), o: [79, 83, 4.6, 3.6], talk: true },
  };

  // Van kleur veranderen, zoals een kameleon: per moment een kleine verschuiving in het blauw, zacht overvloeiend.
  const SKIN = {
    neutraal: BLUE, luisterend: BLUE, pratend: BLUE,
    nadenkend: '#2F82F6',   // een tikje dieper
    blij: '#12A6F6',        // helderder, naar turquoise
    knipoog: '#1E9EFA',
    verrast: '#4F87FF',     // een flits naar paars
    bezorgd: '#3D7ADB',     // donkerder en doffer
    slapend: '#6A90CC',     // grijzig, rustig
  };
  const NS = 'http://www.w3.org/2000/svg';
  // Knipperen: een bovenooglid zakt over het oog en een onderooglid komt een stukje omhoog; waar ze elkaar raken een
  // donker lijntje. Alles binnen het oogwit (clipPath), zodat het oog zelf niet vervormt. Elk gezicht eigen id's.
  let uid = 0;
  const rig = () => {
    const id = `mf${++uid}`;
    return `<svg xmlns="${NS}" viewBox="0 0 128 112" fill="none" aria-hidden="true" focusable="false"><defs>` +
      ['L', 'R'].map(s => `<clipPath id="${id}${s}"><ellipse class="mf-clip${s}"/></clipPath>`).join('') + `</defs><g class="mf-all">` +
      `<path class="mf-head mf-skin" d="${HEAD}" fill="${BLUE}"/>` +
      ['L', 'R'].map(s => `<g class="mf-eye mf-eye${s}"><ellipse class="mf-white" fill="#fff"/><ellipse class="mf-pupil" fill="${INK}"/>` +
        `<circle class="mf-glint" r="2.1" fill="#fff"/></g>` +
        `<g class="mf-lids mf-lids${s}" clip-path="url(#${id}${s})"><g transform="translate(${EYE[s].cx} ${EYE[s].cy})">` +
        `<g class="mf-llid"><path class="mf-skin" d="M-17 40H17V1Q0 -3 -17 1Z" fill="${BLUE}"/></g>` +
        `<g class="mf-ulid"><path class="mf-skin" d="M-17 -64H17V-2Q0 6 -17 -2Z" fill="${BLUE}"/><path d="M-17 -2Q0 6 17 -2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g></g></g>` +
        `<path class="mf-lid mf-lid${s}" stroke="${INK}" stroke-width="3.5"/><path class="mf-brow mf-brow${s}" stroke="${INK}"/>`).join('') +
      `<path class="mf-mouth" stroke="${INK}"/><ellipse class="mf-o" fill="${INK}"/></g></svg>`;
  };

  // Attribuut voor browsers zonder CSS-geometrie, stijl voor de vloeiende overgang.
  function put(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'd') { el.setAttribute('d', v); el.style.d = `path("${v}")`; }
      else if (k === 'opacity') el.style.opacity = v;
      else { el.setAttribute(k, v); el.style.setProperty(k, typeof v === 'number' ? `${v}px` : v); }
    }
  }
  const r2 = n => Math.round(n * 100) / 100;

  // Eén gezicht tekenen. `look` schuift de pupillen een klein beetje (meelezen met de cursor, even opzij kijken).
  // `wander`: één oog kijkt even ergens anders heen terwijl het andere blijft kijken, zoals bij een echte kameleon.
  function draw(svg, name, look = 0, wander = null) {
    const m = MOODS[name] || MOODS.neutraal;
    const q = sel => svg.querySelector(sel);
    svg.querySelectorAll('.mf-skin').forEach(el => { el.style.fill = SKIN[name] || BLUE; });
    for (const s of ['L', 'R']) {
      const e = EYE[s], st = m[s], g = q(`.mf-eye${s}`);
      const w = wander?.s === s ? wander : { dx: 0, dy: 0 };
      if (st.open) {
        const ry = e.ry + (st.big || 0), dx = st.dx + look + w.dx, px = e.cx + dx, py = e.cy + st.dy + w.dy;
        put(g.querySelector('.mf-white'), { cx: e.cx, cy: e.cy, rx: e.rx, ry });
        put(q(`.mf-clip${s}`), { cx: e.cx, cy: e.cy, rx: e.rx + 1.2, ry: ry + 1.2 });   // net groter: geen wit randje
        q(`.mf-lids${s}`).style.setProperty('--ry', ry);
        q(`.mf-lids${s}`).style.opacity = 1;
        q(`.mf-lids${s}`).classList.remove('mf-shut');
        g.style.transitionDelay = '0s';   // open: het oog is er meteen, de oogleden schuiven weg
        g.style.opacity = 1;
        put(g.querySelector('.mf-pupil'), { cx: r2(px), cy: py, rx: r2(e.rx * .49), ry: r2(ry * .67) });
        put(g.querySelector('.mf-glint'), { cx: r2(px - 1.9), cy: r2(py - 4.1) });
        g.style.setProperty('--open', 1);
        put(q(`.mf-lid${s}`), { d: LID[s], opacity: 0 });
      } else {
        // Dicht oog: het oog staat wel op zijn plek (anders staat het oogwit op 0,0 als een streepje linksboven).
        put(g.querySelector('.mf-white'), { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry });
        put(g.querySelector('.mf-pupil'), { cx: e.cx + 3, cy: e.cy, rx: r2(e.rx * .49), ry: r2(e.ry * .67) });
        put(g.querySelector('.mf-glint'), { cx: r2(e.cx + 1.1), cy: r2(e.cy - 4.1) });
        put(q(`.mf-clip${s}`), { cx: e.cx, cy: e.cy, rx: e.rx + 1.2, ry: e.ry + 1.2 });
        // Dicht doen met de oogleden (zoals bij knipperen), en daarna het oog zelf weg: er blijft geen wit over.
        g.style.setProperty('--open', 1);
        g.style.transitionDelay = '0s, .13s';   // eerst de oogleden dicht, dan pas het oog weg
        g.style.opacity = 0;
        q(`.mf-lids${s}`).style.setProperty('--ry', e.ry);
        q(`.mf-lids${s}`).style.opacity = 1;
        q(`.mf-lids${s}`).classList.add('mf-shut');
        put(q(`.mf-lid${s}`), { d: st.lid, opacity: 1 });
      }
      const brow = m[`brow${s}`];
      put(q(`.mf-brow${s}`), brow ? { d: brow[0], 'stroke-width': brow[1], opacity: 1 } : { d: BROW[s], opacity: 0 });
    }
    const mouth = q('.mf-mouth'), o = q('.mf-o');
    if (m.mouth) put(mouth, { d: m.mouth[0], 'stroke-width': m.mouth[1], opacity: 1 });
    else put(mouth, { opacity: 0 });
    if (m.o) put(o, { cx: m.o[0], cy: m.o[1], rx: m.o[2], ry: m.o[3], opacity: 1 });
    else put(o, { cx: 79, cy: 84, rx: 3, ry: 1.5, opacity: 0 });
    svg.classList.toggle('mf-talk', !!m.talk);
    svg.classList.toggle('mf-asleep', name === 'slapend');
    svg.dataset.mood = name;
  }

  // ---------- alle gezichten op de pagina ----------
  const faces = new Set();
  let mood = 'neutraal', look = 0, wander = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function mount(host) {
    if (host.__melo) return host.__melo;
    host.innerHTML = rig();
    const svg = host.firstElementChild;
    host.__melo = svg;
    faces.add(svg);
    // Eerst zonder overgang op de huidige uitdrukking zetten, dan pas de overgangen aan.
    draw(svg, mood, look, wander);
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('mf-ready')));
    return svg;
  }
  function setMood(name, nextLook = 0, { pop = false } = {}) {
    if (!MOODS[name]) return;
    if (name === mood && Math.abs(nextLook - look) < .05) return;
    const changed = name !== mood;
    if (changed) wander = null;
    const blinkNow = changed && OPEN_EYES(mood) && OPEN_EYES(name) && Math.random() < .6;
    mood = name; look = nextLook;
    if (blinkNow) blink();
    for (const svg of faces) {
      if (!svg.isConnected) { faces.delete(svg); continue; }
      draw(svg, mood, look, wander);
      if (changed && pop && !reduced.matches) {
        svg.classList.remove('mf-pop'); void svg.getBoundingClientRect(); svg.classList.add('mf-pop');
      }
    }
  }
  function setWander(w) {
    wander = w;
    eachFace(svg => draw(svg, mood, look, wander));
  }
  const eachFace = fn => faces.forEach(svg => (svg.isConnected ? fn(svg) : faces.delete(svg)));
  const OPEN_EYES = name => !['blij', 'slapend', 'knipoog'].includes(name);
  function blink() {
    if (reduced.matches || document.hidden || !OPEN_EYES(mood)) return;
    eachFace(s => { s.classList.remove('mf-blink'); void s.getBoundingClientRect(); s.classList.add('mf-blink'); });
    clearTimeout(blink.t); blink.t = setTimeout(() => eachFace(s => s.classList.remove('mf-blink')), 260);
  }

  // Knipperen: om de 3 à 6 seconden, soms twee keer achter elkaar. Alleen met open ogen en als het paneel in beeld is.
  function blinkLoop() {
    setTimeout(() => {
      blink();
      if (Math.random() < .2) setTimeout(blink, 340);
      blinkLoop();
    }, 2800 + Math.random() * 3400);
  }

  // ---------- meekijken met de chat ----------
  // Standaard voor de chat van de extensie (chat/chat.js). Melo Chat op kamelo.eu (melo/melo.js) geeft eigen opties:
  //   msgs      id van de lijst met berichten          thinking  selector van "nog geen woord" in een antwoord
  //   worried   (note) → true bij "niet verstuurd"     waiting   (note) → true terwijl de AI wordt klaargezet
  //   readyText tekst in de melding als de AI klaarstaat (even blij)
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
    let pulse = null, lastTalk = -1e9, asleep = false, sleepTimer = null, typedValue = input?.value || '', lastNote = '';
    let greeted = false, glance = 0, glanceUntil = 0;
    const now = () => performance.now();
    // Even een andere uitdrukking, daarna weer wat er echt aan de hand is.
    const flash = (name, ms) => { pulse = { name, until: now() + ms }; evaluate(); setTimeout(evaluate, ms + 20); };

    function mountAll(root = document) { root.querySelectorAll?.('[data-melo]').forEach(mount); }
    const answers = () => [...(msgs?.querySelectorAll('.a') || [])].filter(a => !a.closest('.thread[hidden]'));
    function lastAnswer() { const all = answers(); return all.length ? all[all.length - 1] : null; }

    // Melo's hoofdje naast elk antwoord, alsof het echt van hem komt. Het antwoord gaat met het hoofdje in een rij
    // (.mf-row); hetzelfde element, dus chat.js/melo.js houden het gewoon vast. Alleen het nieuwste hoofdje leeft mee
    // (denkt, praat); oudere staan stil en kijken vriendelijk.
    let syncing = false;
    function syncRows() {
      if (syncing || !msgs) return;
      syncing = true;
      for (const row of msgs.querySelectorAll('.mf-row')) if (!row.querySelector('.a')) row.remove();
      for (const a of msgs.querySelectorAll('.a')) {
        if (a.parentElement?.classList.contains('mf-row')) continue;
        const row = Object.assign(document.createElement('div'), { className: 'mf-row' });
        const face = Object.assign(document.createElement('span'), { className: 'melo-face mf-msg' });
        face.setAttribute('aria-hidden', 'true');
        a.replaceWith(row); row.append(face, a);
      }
      const live = lastAnswer()?.parentElement.querySelector('.mf-msg');
      for (const face of msgs.querySelectorAll('.mf-msg')) {
        if (face === live) { if (!face.__melo) mount(face); }
        else if (face.__melo || !face.firstChild) { faces.delete(face.__melo); render(face, 'neutraal'); }
      }
      syncing = false;
    }
    function evaluate() {
      const t = now();
      if (document.documentElement.dataset.engine === 'off' || form?.hidden) return setMood('slapend');
      if (asleep) return setMood('slapend');
      handedOver();
      // Niet verstuurd (ook als de vraag daarna weer in het veld komt): bezorgd, vóór elke korte reactie.
      const noteOn = noteEl && !noteEl.hidden;
      if (noteOn && o.worried(noteEl)) return setMood('bezorgd');
      if (pulse && t < pulse.until) return setMood(pulse.name, 0, { pop: true });
      pulse = null;
      const a = lastAnswer();
      if (a?.querySelector(o.thinking)) a.__meloAsked = true;
      if (a?.__meloAsked && a.querySelector(o.thinking) || (noteOn && o.waiting(noteEl))) return setMood('nadenkend');
      if (t - lastTalk < 600) return setMood('pratend');
      const text = input?.value || '';
      if (text.trim()) {
        // Meelezen: de pupillen schuiven met de cursor mee, van links in de tekst naar rechts.
        const pos = input.selectionStart ?? text.length;
        return setMood('luisterend', input === document.activeElement ? r2(-1.5 + 3.5 * Math.min(1, (pos % 60) / 60)) : 0);
      }
      setMood('neutraal', t < glanceUntil ? glance : 0);
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
        // Tekst die in het laatste antwoord bijkomt: Melo praat. Alleen bij een vraag die net gesteld is, niet als een
        // oud gesprek opnieuw in beeld komt.
        const a = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest?.('.a');
        if (a && a.__meloAsked && a === lastAnswer() && !a.querySelector(o.thinking) && a.textContent.trim()) lastTalk = now();
      }
      evaluate();
      setTimeout(evaluate, 620);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    if (noteEl) new MutationObserver(() => {
      const text = noteEl.hidden ? '' : noteEl.textContent;
      if (text && text !== lastNote && o.readyText && text === o.readyText) flash('blij', 1500);
      lastNote = text;
      evaluate();
    }).observe(noteEl, { attributes: true, attributeFilter: ['hidden', 'class'] });

    if (input) {
      const typed = () => { typedValue = input.value; wake(); evaluate(); };
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
    $('newChat')?.addEventListener('click', () => flash('blij', 1200));

    // Slapen zoals de AI: een minuut niet in beeld en hij laat los (chat.js). Wakker bij de eerste klik of toets.
    function wake() {
      if (!asleep) return;
      asleep = false;
      flash('verrast', 600);
    }
    document.addEventListener('visibilitychange', () => {
      clearTimeout(sleepTimer);
      if (document.hidden) sleepTimer = setTimeout(() => { if (mood !== 'pratend' && mood !== 'nadenkend') { asleep = true; evaluate(); } }, 60 * 1000);
    });
    ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, wake, true));

    // Als er niets gebeurt kijkt hij rond: meestal met één oog tegelijk (het andere blijft bij jou), soms allebei even
    // opzij. En één knipoog als begroeting bij het openen.
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const idle = () => mood === 'neutraal' && !document.hidden && !reduced.matches;
    (function lookAround() {
      setTimeout(() => {
        if (idle()) {
          if (Math.random() < .7) {
            const first = pick(['L', 'R']), other = first === 'L' ? 'R' : 'L';
            const roam = s => ({ s, dx: pick([-3.5, -2.5, 2.5, 3]), dy: pick([-3.5, -2, 1.5]) });
            setWander(roam(first));
            const hold = 1300 + Math.random() * 900;
            if (Math.random() < .35) setTimeout(() => { if (idle()) setWander(roam(other)); }, hold);
            setTimeout(() => { if (wander) setWander(null); }, hold * (Math.random() < .35 ? 2 : 1) + 50);
          } else {
            glance = Math.random() < .5 ? -2.5 : 1.5; glanceUntil = now() + 1300;
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

  // Een los, stilstaand gezicht (voor een overzicht of preview); doet niet mee met de chat.
  function render(host, name) { host.__melo = null; host.innerHTML = rig(); draw(host.firstElementChild, name); return host.firstElementChild; }

  globalThis.KameloMelo = { MOODS: Object.keys(MOODS), mount, render, setMood, setWander, watchChat };
  blinkLoop();
  if (document.getElementById('msgs')) watchChat();   // chat van de extensie (en de demo); Melo Chat start hem zelf
  else document.querySelectorAll('[data-melo]').forEach(mount);
})();
