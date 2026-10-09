// Afscheidspagina: kies een reden, eventueel een bericht, en verstuur naar de Kamelo-feedbackworker (alleen reden + bericht).
// Bij sommige redenen staat er meteen een korte tip onder (een functie die het misschien oplost).
(() => {
  const root = document.getElementById('bye');
  if (!root) return;
  const btns = [...root.querySelectorAll('.reasons button')], tip = document.getElementById('tip');
  const msg = document.getElementById('msg'), send = document.getElementById('send');
  const TIPS = {
    site: 'Tip: on any site you can switch on <b>Mask every text field</b> in Kamelo, and for sidebars and apps there\'s <b>Mask text</b> in the popup.',
    'too-much': 'Tip: add words to <b>Never protect</b> in the settings, like your company name, and Kamelo leaves them alone.',
    missed: 'Tip: add it to <b>Always protect</b> in the settings. If you tell us below what it missed (made-up data please), we can fix it for everyone.',
    slow: 'Tip: next time, switch off <b>Protection</b> in the popup for a moment. Tell us below which site, so we can fix it.',
    trust: 'Everything happens on your own device: no account, no server, no tracking. Read how in the <a href="privacy.html">privacy policy</a>.',
  };
  let reason = null;
  const update = () => { send.disabled = !reason && !msg.value.trim(); };
  btns.forEach(b => b.addEventListener('click', () => {
    reason = b.dataset.r;
    btns.forEach(x => x.setAttribute('aria-checked', String(x === b)));
    if (TIPS[reason]) { tip.innerHTML = TIPS[reason]; tip.hidden = false; tip.style.animation = 'none'; void tip.offsetWidth; tip.style.animation = ''; }
    else tip.hidden = true;
    update();
  }));
  msg.addEventListener('input', update);
  send.addEventListener('click', async () => {
    send.disabled = true; document.getElementById('fail').hidden = true;
    try {
      const r = await fetch('https://kamelo-feedback.kamelo-eu.workers.dev/goodbye', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, message: msg.value.trim() }) });
      if (!r.ok) throw new Error(r.status);
      root.classList.add('sent'); document.getElementById('done').hidden = false;
    } catch { document.getElementById('fail').hidden = false; send.disabled = false; }
  });
})();
