// Winkellinks: vul ze in zodra Kamelo live staat. Leeg = de knoppen staan er wel, maar zijn (nog) niet klikbaar.
const STORE = {
  chrome: '',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/kjjenbhncoomobcdpbhljmhfcmanhbkj',
};

document.querySelectorAll('[data-store-link]').forEach(a => {
  const url = STORE[a.dataset.storeLink];
  if (url) a.href = url;
  else { a.removeAttribute('href'); a.classList.add('pending'); a.title = 'Coming soon'; }
});
