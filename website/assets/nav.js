// Menu op de telefoon: de knop klapt de links uit en weer in.
(() => {
  const nav = document.querySelector('.nav'), btn = document.querySelector('.nav-toggle');
  if (!nav || !btn) return;
  let timer;
  // Bij sluiten houdt 'closing' de balk even zonder blur, zodat het menu niet wordt afgeknipt terwijl het vervaagt.
  const set = open => {
    clearTimeout(timer);
    if (!open && nav.classList.contains('open')) { nav.classList.add('closing'); timer = setTimeout(() => nav.classList.remove('closing'), 420); }
    nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
  };
  btn.addEventListener('click', () => set(!nav.classList.contains('open')));
  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width: 641px)').addEventListener('change', e => { if (e.matches) set(false); });
})();
