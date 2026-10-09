// Raster met AI-apps: één logo tegelijk licht rustig op in kleur, alleen als het raster in beeld is.
// Bij "minder beweging" staan alle logo's gewoon in kleur.
(() => {
  const grid = document.getElementById('aiGrid');
  if (!grid) return;
  const items = [...grid.children];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { grid.classList.add('still'); return; }
  let i = -1, timer = null, paused = false;
  const step = () => { if (paused) return; items.forEach(li => li.classList.remove('on')); i = (i + 1) % items.length; items[i].classList.add('on'); };
  grid.addEventListener('mouseenter', () => { paused = true; items.forEach(li => li.classList.remove('on')); });
  grid.addEventListener('mouseleave', () => { paused = false; });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) { step(); timer = setInterval(step, 1500); }
    else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
  }, { threshold: .3 }).observe(grid);
})();
