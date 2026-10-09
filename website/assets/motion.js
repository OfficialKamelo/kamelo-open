// Animaties van kamelo.eu. Geen bibliotheken, geen externe bestanden.
// Bij "minder beweging" (prefers-reduced-motion) tonen we alles meteen in de eindstand.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---------- Navigatie: achtergrond zodra je scrolt ----------
  const nav = $('#nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', scrollY > 10); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- Kop: woord voor woord omhoog ----------
  $$('[data-split]').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((w, i) => {
      const o = document.createElement('span'); o.className = 'w';
      const n = document.createElement('span'); n.className = 'wi'; n.textContent = w;
      n.style.transitionDelay = `${120 + i * 70}ms`;
      o.appendChild(n); h.appendChild(o);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('in')));
  });

  // ---------- Verschijnen bij scrollen ----------
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const d = Number(el.dataset.delay || 0);
    if (d) el.style.transitionDelay = `${d * 90}ms`;
    io.observe(el);
  });

  // Hulpmiddel: doe iets zolang een element in beeld is.
  const whenVisible = (el, cb, threshold = .2) => {
    const o = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { threshold });
    o.observe(el);
  };

  // ---------- Demo-venster kantelt een beetje mee met de muis ----------
  const device = $('#device');
  const stage = $('.stage');
  if (device && stage && !reduce && matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      device.style.setProperty('--ry', `${x * 6}deg`); device.style.setProperty('--rx', `${-y * 6}deg`);
    });
    stage.addEventListener('pointerleave', () => { device.style.setProperty('--ry', '0deg'); device.style.setProperty('--rx', '0deg'); });
  }

  // ---------- Live demo: typen, herkennen, afschermen, versturen, terugzetten ----------
  const SCENES = [
    { you: 'Write a payment reminder to {Sarah Miller|PERSON_1}, IBAN {GB82 WEST 1234 5698 7654 32|IBAN_1}.',
      ai: 'Hi {PERSON_1}, a friendly reminder that invoice 2291 is still open. Could you transfer the amount to {IBAN_1} by Friday?' },
    { you: 'Email my landlord {Mark de Vries|PERSON_1} about the broken heating at {Prinsengracht 263|ADDRESS_1}.',
      ai: 'Dear {PERSON_1}, the heating at {ADDRESS_1} has stopped working. Could you send an engineer this week?' },
    { you: 'Summarize for my accountant: {Kiki Jansen|PERSON_1}, {kiki@studio.nl|EMAIL_1}, phone {+31 6 1234 5678|PHONE_1}.',
      ai: 'Client: {PERSON_1}. Contact: {EMAIL_1} or {PHONE_1}. Next step: send the Q3 overview.' },
  ];
  const parse = s => s.split(/(\{[^}]+\})/).filter(Boolean).map(p => {
    const m = p.match(/^\{(?:(.+)\|)?(.+)\}$/);
    return m ? { real: m[1], ph: `[${m[2]}]` } : { t: p };
  });
  const realOf = sc => Object.fromEntries(parse(sc.you).filter(p => p.ph).map(p => [p.ph, p.real]));

  const thread = $('#thread'), input = $('#input'), toast = $('#toast'), toastN = $('#toastN'), extCount = $('#extCount'), send = $('.send');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const phChip = text => el('span', 'ph', text);

  // Wachten, maar alleen tellen terwijl de demo in beeld is en het tabblad open staat.
  let demoVisible = false;
  const sleep = ms => new Promise(res => {
    let left = ms, last = performance.now();
    const tick = now => {
      if (demoVisible && !document.hidden) left -= now - last;
      last = now;
      left <= 0 ? res() : requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  async function typeInto(node, text, caret) {
    for (const ch of text) {
      node.textContent += ch;
      send.classList.add('ready');
      await sleep(ch === ' ' ? 34 : 22 + Math.random() * 30);
    }
  }

  async function play(sc) {
    const parts = parse(sc.you);
    input.textContent = '';
    const caret = el('span', 'caret'); input.appendChild(caret);
    const piis = [];
    for (const p of parts) {
      const node = p.ph ? el('span', 'pii') : document.createTextNode('');
      if (p.ph) { node.dataset.ph = p.ph; piis.push(node); }
      input.insertBefore(node, caret);
      await typeInto(node, p.ph ? p.real : p.t, caret);
    }
    await sleep(450);

    // Herkennen: rood oplichten, teller in de werkbalk loopt op.
    for (const [i, p] of piis.entries()) {
      p.classList.add('flag'); extCount.textContent = i + 1; extCount.classList.add('on');
      await sleep(160);
    }
    await sleep(600);

    // Afschermen: een lichtstreep gaat over de tekst, elk gegeven wordt een placeholder.
    input.classList.add('scan');
    const w = input.clientWidth || 1;
    await Promise.all(piis.map(async p => {
      await sleep(clamp(p.offsetLeft / w) * 750 + 80);
      p.classList.add('out');
      await sleep(220);
      p.replaceWith(phChip(p.dataset.ph));
    }));
    await sleep(500);
    input.classList.remove('scan');
    toastN.textContent = piis.length; toast.classList.add('show');
    await sleep(1500);

    // Versturen: alleen de placeholders gaan naar de AI.
    send.classList.add('press'); await sleep(140); send.classList.remove('press', 'ready');
    const user = el('div', 'msg user');
    user.appendChild(el('span', 'lbl', 'What the AI sees'));
    caret.remove();
    [...input.childNodes].forEach(n => user.appendChild(n.cloneNode(true)));
    input.textContent = ''; input.appendChild(caret);
    thread.appendChild(user); requestAnimationFrame(() => user.classList.add('show'));
    toast.classList.remove('show');
    await sleep(700);

    // Antwoord van de AI, met placeholders.
    const ai = el('div', 'msg ai');
    const lbl = el('span', 'lbl', 'AI answer'); ai.appendChild(lbl);
    const dots = el('span', 'typing'); dots.append(el('i'), el('i'), el('i')); ai.appendChild(dots);
    thread.appendChild(ai); requestAnimationFrame(() => ai.classList.add('show'));
    await sleep(1100);
    dots.remove();
    const body = el('span'); ai.appendChild(body);
    for (const p of parse(sc.ai)) {
      if (p.ph) { body.appendChild(phChip(p.ph)); await sleep(90); continue; }
      for (const word of p.t.split(/(\s+)/)) { body.appendChild(document.createTextNode(word)); if (word.trim()) await sleep(38); }
    }
    await sleep(800);

    // Terugzetten: alleen op jouw scherm komen de echte gegevens terug.
    const real = realOf(sc);
    lbl.textContent = 'Only on your screen'; lbl.classList.add('mine');
    for (const chip of $$('.ph', ai)) {
      const back = el('span', 'ph back', real[chip.textContent] || chip.textContent);
      chip.replaceWith(back);
      await sleep(260);
    }
    await sleep(3000);

    thread.classList.add('fade'); await sleep(600);
    thread.textContent = ''; thread.classList.remove('fade');
    extCount.classList.remove('on');
    await sleep(300);
  }

  // Statische eindstand voor "minder beweging".
  function still(sc) {
    const real = realOf(sc);
    const user = el('div', 'msg user show'); user.appendChild(el('span', 'lbl', 'What the AI sees'));
    parse(sc.you).forEach(p => user.appendChild(p.ph ? phChip(p.ph) : document.createTextNode(p.t)));
    const ai = el('div', 'msg ai show'); ai.appendChild(el('span', 'lbl mine', 'Only on your screen'));
    parse(sc.ai).forEach(p => ai.appendChild(p.ph ? el('span', 'ph back', real[p.ph]) : document.createTextNode(p.t)));
    thread.append(user, ai);
  }

  if (thread && input) {
    if (reduce) still(SCENES[0]);
    else {
      whenVisible(device, v => { demoVisible = v; }, .3);
      (async () => { await sleep(900); for (let i = 0; ; i = (i + 1) % SCENES.length) await play(SCENES[i]); })();
    }
  }

  // ---------- Hoe het werkt: de kaarten lichten om de beurt op en spelen hun animatie ----------
  const cards = $$('#howCards .how-card');
  const typed = $('#howCards .typed');
  const sentence = typed ? typed.textContent : '';
  async function typeSentence() {
    typed.textContent = '';
    for (const ch of sentence) { typed.textContent += ch; await new Promise(r => setTimeout(r, 38)); }
  }
  const playCard = c => { c.classList.remove('play'); void c.offsetWidth; c.classList.add('play'); };
  if (cards.length && !reduce) {
    let i = 0, running = false, timer;
    const next = () => {
      cards.forEach((c, k) => c.classList.toggle('on', k === i));
      playCard(cards[i]);
      if (i === 0 && typed) typeSentence();
      i = (i + 1) % cards.length;
      timer = setTimeout(next, 2600);
    };
    whenVisible($('#howCards'), v => {
      if (v && !running) { running = true; i = 0; timer = setTimeout(next, 500); }
      else if (!v && running) { running = false; clearTimeout(timer); cards.forEach(c => c.classList.remove('on')); }
    }, .35);
  }

  // ---------- Tegels: echt gegeven wordt placeholder, en terug ----------
  const tiles = $$('#tiles .tile');
  tiles.forEach(t => { const b = $('b', t); b.append(el('span', 'r', t.dataset.real), el('span', 'p', t.dataset.ph)); });
  if (tiles.length && !reduce) {
    let on = false, timer;
    const cycle = () => {
      tiles.forEach((t, i) => setTimeout(() => t.classList.toggle('flip'), i * 120));
      timer = setTimeout(cycle, 2600);
    };
    whenVisible($('#tiles'), v => { if (v && !on) { on = true; timer = setTimeout(cycle, 900); } else if (!v && on) { on = false; clearTimeout(timer); } });
  }

  // ---------- Banner op Over: logo komt op zodra het in beeld is ----------
  const art = $('#aboutArt');
  if (art) whenVisible(art, v => { if (v) art.classList.add('in'); }, .35);

  // ---------- Business: schakelaars in de console gaan om de beurt aan ----------
  // Daarna kun je ze zelf om zetten: elke soort telt mee in het getal, en het getal loopt mee.
  const cons = $('#console');
  if (cons) {
    const total = $('#cTotal'), live = $('#cLive'), tgs = $$('.tg', cons);
    const fmt = n => n.toLocaleString('en-US');
    const sum = () => Number(total.dataset.base) + tgs.reduce((n, t) => n + (t.getAttribute('aria-checked') === 'true' ? Number(t.dataset.items) : 0), 0);
    let shown = 0, raf = 0;
    const countTo = (to, dur) => {
      cancelAnimationFrame(raf);
      if (reduce) { shown = to; total.textContent = fmt(to); return; }
      const from = shown, t0 = performance.now();
      const step = now => {
        const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        shown = Math.round(from + (to - from) * e); total.textContent = fmt(shown);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    total.textContent = fmt(0);
    let started = false;
    whenVisible(cons, v => {
      if (!v || started) return; started = true;
      cons.classList.add('on'); countTo(sum(), 1600);
      setTimeout(() => cons.classList.add('ready'), 1300);
    }, .4);
    const flip = t => {
      const on = t.getAttribute('aria-checked') !== 'true';
      t.setAttribute('aria-checked', String(on));
      const any = tgs.some(x => x.getAttribute('aria-checked') === 'true');
      live.setAttribute('aria-label', any ? 'Active' : 'Paused'); live.title = any ? 'Active' : 'Paused'; live.classList.toggle('off', !any);
      cons.classList.add('on', 'ready'); started = true;
      countTo(sum(), 600);
    };
    $$('.c-toggles li', cons).forEach(li => li.addEventListener('click', e => flip(li.querySelector('.tg'))));
  }

  // ---------- Cijfers tellen op ----------
  $$('[data-count]').forEach(b => {
    const to = Number(b.dataset.count), from = Number(b.dataset.from || 0), suf = b.dataset.suffix || '';
    const fmt = n => n.toLocaleString('en-US') + suf;
    if (reduce) { b.textContent = fmt(to); return; }
    b.textContent = fmt(from);
    let done = false;
    whenVisible(b, v => {
      if (!v || done) return; done = true;
      const t0 = performance.now(), dur = 1600;
      const step = now => {
        const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        b.textContent = fmt(Math.round(from + (to - from) * e));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, .6);
  });
})();
