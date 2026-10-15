// Afdrukpagina (chat/doc.html): Melo's antwoord als net document, en meteen het afdrukvenster ("Bewaren als pdf").
// De tekst komt via het werkgeheugen (storage.session) uit de chat en wordt na het lezen meteen gewist.
(async () => {
  'use strict';
  const I = globalThis.PrivacyI18n;
  I.applyI18n();
  const key = new URLSearchParams(location.search).get('k') || '';
  const got = (await chrome.storage.session.get(key))[key];
  await chrome.storage.session.remove(key);
  const page = document.getElementById('page');
  if (!got?.text) { page.textContent = I.t('pchatDocGone'); document.getElementById('bar').hidden = true; return; }
  document.documentElement.lang = got.lang || 'en';
  document.title = got.title || 'Melo';
  // Begint het antwoord niet met een kopje, dan de titel bovenaan.
  if (got.title && !/^\s{0,3}#{1,3}\s/.test(got.text)) page.append(Object.assign(document.createElement('h1'), { className: 'title', textContent: got.title }));
  KameloRich.render(got.text, page, { lang: got.lang });
  // Het eerste kopje (# …) is de titel van het document.
  const first = page.firstElementChild;
  if (first?.tagName === 'H3' && /^\s{0,3}#\s/.test(got.text)) first.replaceWith(Object.assign(document.createElement('h1'), { className: 'title', textContent: first.textContent }));
  document.getElementById('print').addEventListener('click', () => print());
  // Even wachten tot de formules en grafieken getekend zijn.
  requestAnimationFrame(() => setTimeout(() => print(), 250));
})();
