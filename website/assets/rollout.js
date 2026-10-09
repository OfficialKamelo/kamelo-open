// Business-pagina: het podium "Live for the whole office in an afternoon."
// Speelt drie scènes na elkaar af (installeren, beleid, werken), met tabbladen en een voortgangsbalk.
// Speelt alleen als het podium in beeld is. Bij "minder beweging" staat elke scène meteen in de eindstand.
(() => {
  const roll = document.getElementById('roll');
  if (!roll) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = [...roll.querySelectorAll('.scene')];
  const tabs = [...roll.querySelectorAll('[role="tab"]')];
  const DUR = 7000;
  const TEXT = 'Draft a reply to De Vries BV about invoice 2291.';
  roll.style.setProperty('--roll-dur', `${DUR}ms`);
  if (reduce) roll.classList.add('still');

  let current = 0, timers = [], visible = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, reduce ? 0 : ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  const reset = scene => {
    scene.querySelectorAll('.ok, .done').forEach(el => el.classList.remove('ok', 'done'));
    const count = scene.querySelector('#rollCount'); if (count) count.textContent = '0';
    const type = scene.querySelector('#rollType'); if (type) type.textContent = '';
  };

  const play = {
    install(scene) {
      const pcs = [...scene.querySelectorAll('.pc')];
      const count = scene.querySelector('#rollCount');
      // In een golf van linksboven naar rechtsonder
      const cols = getComputedStyle(scene.querySelector('.pcs')).gridTemplateColumns.split(' ').length;
      pcs.forEach((pc, i) => later(500 + ((i % cols) + Math.floor(i / cols)) * 160 + i * 25, () => {
        pc.classList.add('ok');
        count.textContent = scene.querySelectorAll('.pc.ok').length;
      }));
    },
    policy(scene) {
      scene.querySelectorAll('.pol-row').forEach((r, i) => later(500 + i * 380, () => r.classList.add('ok')));
      scene.querySelectorAll('.pol-chips span').forEach((c, i) => later(1800 + i * 220, () => c.classList.add('ok')));
      later(2900, () => scene.querySelector('.sc-pill').classList.add('ok'));
    },
    work(scene) {
      const out = scene.querySelector('#rollType');
      const me = out.parentElement;
      if (reduce) out.textContent = TEXT;
      else [...TEXT].forEach((ch, i) => later(400 + i * 34, () => { out.textContent += ch; }));
      const t = 400 + TEXT.length * 34;
      later(t + 300, () => me.classList.add('done'));
      later(t + 500, () => scene.querySelector('.rl-sent').classList.add('ok'));
      later(t + 700, () => scene.querySelector('.rsent').classList.add('ok'));
      later(t + 1700, () => scene.querySelector('.rai').classList.add('ok'));
      later(t + 1900, () => scene.querySelector('.rl-back').classList.add('ok'));
    },
  };
  const order = ['install', 'policy', 'work'];

  const go = (i, { focus = false } = {}) => {
    clear();
    current = (i + scenes.length) % scenes.length;
    scenes.forEach((s, j) => { s.classList.toggle('on', j === current); if (j !== current) reset(s); });
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', 'false');
      t.tabIndex = j === current ? 0 : -1;
    });
    void roll.offsetWidth; // voortgangsbalk opnieuw laten beginnen
    tabs[current].setAttribute('aria-selected', 'true');
    if (focus) tabs[current].focus();
    reset(scenes[current]);
    play[order[current]](scenes[current]);
    if (!reduce && visible) later(DUR, () => go(current + 1));
  };

  tabs.forEach((t, j) => {
    t.addEventListener('click', () => go(j));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, { focus: true }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1, { focus: true }); }
    });
  });

  // Alleen afspelen zolang het podium in beeld is
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    roll.classList.toggle('paused', !visible);
    if (visible) go(current); else clear();
  }, { threshold: .35 }).observe(roll);

  go(0);
})();
