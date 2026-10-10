// Vult de nagebootste opslag met voorbeelddata voor de popup-preview.
// ?lang=en geeft Engelstalige voorbeelddata; ?host=… bepaalt welke site het actieve tabblad is (bijv. chatgpt.com).
// ?state=first (net geïnstalleerd, nog niets afgeschermd), ?state=paused (schakelaar uit), ?state=locked (kluis vergrendeld).
const SEED_PARAMS = new URLSearchParams(location.search);
const SEED_EN = SEED_PARAMS.get('lang') === 'en';
const SEED_HOST = SEED_PARAMS.get('host') || (SEED_EN ? 'www.example-shop.com' : 'www.webshop-voorbeeld.nl');
const SEED_STATE = SEED_PARAMS.get('state') || '';
const SEED_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const SEED_COUNTERS = { PERSON: 1, EMAIL: 1, ID: 1, IBAN: 1 };
localStorage.setItem('privacyfilter-demo', JSON.stringify({
  stats: SEED_STATE === 'first' ? {} : { [SEED_MONTH]: { PERSON: 31, EMAIL: 9, PHONE: 3, SECRET: 3, IBAN: 2 } },
  ...(SEED_STATE === 'locked' ? { protect: { password: true, counters: SEED_COUNTERS } } : {}),
  settings: SEED_EN
    ? { enabled: SEED_STATE !== 'paused', restore: true, customTerms: ['Acme Inc.', 'Project Sunflower'], allowList: ['Lucas'], customAiSites: [], retentionDays: 30 }
    : { enabled: SEED_STATE !== 'paused', restore: true, customTerms: ['Acme BV', 'Project Zonnebloem'], allowList: ['Lucas'], customAiSites: [], retentionDays: 30 },
  vault: SEED_STATE === 'first' ? { byKey: {}, counters: {}, lastUsed: {}, byPlaceholder: {} }
    : SEED_EN
      ? { byKey: {}, counters: SEED_COUNTERS, lastUsed: {}, byPlaceholder: {
        '[IBAN_1]': 'GB82 WEST 1234 5698 7654 32', '[ID_1]': '123-45-6789',
        '[EMAIL_1]': 'sarah.miller@example.com', '[PERSON_1]': 'Sarah Miller',
      } }
      : { byKey: {}, counters: SEED_COUNTERS, lastUsed: {}, byPlaceholder: {
        '[IBAN_1]': 'NL91 ABNA 0417 1643 00', '[ID_1]': '111222333',
        '[EMAIL_1]': 'jan.devries@example.com', '[PERSON_1]': 'Jan de Vries',
      } },
}));
localStorage.removeItem('privacyfilter-demo-session'); // werkgeheugen begint leeg, zoals na het opstarten van Chrome
// Doe alsof het actieve tabblad die site is.
window.chrome = window.chrome || {};
window.chrome.tabs = {
  query: async () => [{ id: 1, url: `https://${SEED_HOST}/` }],
  sendMessage: async () => ({ host: SEED_HOST, aiSite: null }),
  create: async () => {},
  reload: async () => {},
};
