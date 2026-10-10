// De kluis klaarzetten in het werkgeheugen (chrome.storage.session).
// Wordt gebruikt door de achtergrond, de popup en het kluisvenster. Pagina's vragen het eerst aan de
// achtergrond; antwoordt die niet (bijv. vlak na een update), dan zetten ze de kluis zelf klaar,
// zodat er nooit een venster blijft hangen.
(function (root) {
  'use strict';
  const emptyVault = (counters = {}) => ({ byKey: {}, byPlaceholder: {}, counters, lastUsed: {}, sites: {} });

  // Eén keer per browsersessie: de kluis van schijf in het werkgeheugen zetten. Is hij beveiligd,
  // dan start hij vergrendeld; alleen de tellers gaan mee, zodat nieuwe placeholders niet botsen.
  async function initSession() {
    const { ready } = await chrome.storage.session.get('ready');
    if (ready) return;
    const { vault, protect } = await chrome.storage.local.get(['vault', 'protect']);
    await chrome.storage.session.set({
      vault: protect ? emptyVault(protect.counters || {}) : (vault || emptyVault()),
      locked: !!protect,
      ready: true,
    });
  }

  // Voor pagina's: vraag de achtergrond, met een terugval als die niet (op tijd) antwoordt.
  async function ensureReady(timeoutMs = 1500) {
    try {
      const answer = await Promise.race([
        chrome.runtime.sendMessage({ type: 'pf:init' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      if (answer === true) return;
    } catch {}
    await initSession();
  }

  root.PrivacyVault = { emptyVault, initSession, ensureReady };
})(typeof globalThis !== 'undefined' ? globalThis : this);
