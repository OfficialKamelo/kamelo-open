// Kamelo — maandoverzicht: hoe vaak per soort gegeven er is afgeschermd, per maand.
// Alleen tellingen: geen waarden, geen sites, geen tijden. Staat los van de kluis, dus wissen of het maximum
// van de kluis (MAX_ENTRIES) heeft er geen invloed op. Draait in de achtergrond, de popup en in Node (tests).
(function (root) {
  'use strict';

  const KEEP_MONTHS = 12;
  const monthKey = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Telt `counts` ({ PERSON: 2, IBAN: 1 }) op bij de huidige maand. Geeft de nieuwe stats terug.
  function add(stats, counts, now = new Date()) {
    const out = stats && typeof stats === 'object' ? { ...stats } : {};
    const key = monthKey(now);
    const month = { ...(out[key] || {}) };
    for (const [type, n] of Object.entries(counts || {})) {
      if (/^[A-Z_]{2,20}$/.test(type) && Number.isInteger(n) && n > 0) month[type] = (month[type] || 0) + n;
    }
    out[key] = month;
    for (const old of Object.keys(out).sort().slice(0, -KEEP_MONTHS)) delete out[old];
    return out;
  }

  // De huidige maand, gesorteerd van vaak naar weinig: { total, types: [[type, n], …] }.
  function month(stats, now = new Date()) {
    const types = Object.entries(stats?.[monthKey(now)] || {}).sort((a, b) => b[1] - a[1]);
    return { total: types.reduce((sum, [, n]) => sum + n, 0), types };
  }

  const api = { add, month, monthKey, KEEP_MONTHS };
  root.PrivacyStats = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
