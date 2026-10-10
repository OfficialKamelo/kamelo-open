// Kluis per site, afgedwongen door de achtergrond.
// Content scripts draaien in elke website en elk venster. Ze krijgen daarom nooit de hele kluis, maar alleen het deel
// van hun eigen site (sliceVault), en wat ze terugschrijven wordt alleen voor die site overgenomen (mergeSlice).
// Welke site dat is, bepaalt de achtergrond zelf uit de afzender van het bericht, niet uit wat het script beweert.
(function (root) {
  'use strict';
  const S = root.PrivacySites;
  const D = root.PrivacyDetector;

  // Zelfde indeling als in content.js: bekende AI-sites met meerdere adressen delen één bereik; gegevens van vóór de
  // kluis per site (zonder site) gelden alleen op bekende AI-sites.
  function scopeOfHost(host) {
    if (!host) return null;
    const known = S.siteFor(host);
    return known ? { scope: `ai:${known.name}`, legacy: true } : { scope: host.replace(/^www\./, ''), legacy: false };
  }

  // Het adres van de afzender. Een venster zonder eigen adres (about:blank, srcdoc) heeft de herkomst van de pagina
  // eromheen; een ondoorzichtig venster (data:, sandbox) valt terug op het tabblad. Geen webadres: geen bereik.
  function senderHost(sender) {
    for (const u of [sender?.url, sender?.origin, sender?.tab?.url]) {
      try {
        const url = new URL(u);
        if (url.protocol === 'http:' || url.protocol === 'https:') return url.hostname;
      } catch {}
    }
    return '';
  }

  const scopeOfSender = sender => scopeOfHost(senderHost(sender));

  // Alleen de gegevens die op deze site horen; de tellers gaan wel mee (die zijn niet gevoelig en voorkomen dat twee
  // sites dezelfde placeholder uitdelen).
  function sliceVault(vault, where) {
    const out = D.emptyVault();
    out.counters = { ...(vault?.counters || {}) };
    if (!vault || !where) return out;
    for (const [ph, value] of Object.entries(vault.byPlaceholder || {})) {
      if (!D.inScope(vault, ph, where)) continue;
      out.byPlaceholder[ph] = value;
      if (vault.lastUsed?.[ph] !== undefined) out.lastUsed[ph] = vault.lastUsed[ph];
      if (vault.sites?.[ph] !== undefined) out.sites[ph] = vault.sites[ph];
    }
    for (const [key, ph] of Object.entries(vault.byKey || {})) if (ph in out.byPlaceholder) out.byKey[key] = ph;
    return out;
  }

  // Neemt wat een content script terugschrijft over, maar alleen voor zijn eigen site:
  // - nieuwe gegevens moeten bij deze site horen;
  // - bestaande gegevens van een andere site worden nooit gewijzigd of overschreven;
  // - een oud gegeven (zonder site) mag op een bekende AI-site aan die site worden gekoppeld;
  // - wissen doet de achtergrond zelf (prune, limit), dus een ontbrekend gegeven wordt niet verwijderd.
  // Geeft true terug als er iets is veranderd.
  function mergeSlice(vault, slice, where) {
    if (!vault || !slice || !where) return false;
    vault.lastUsed = vault.lastUsed || {};
    vault.sites = vault.sites || {};
    let changed = false;
    const accepted = new Set();
    for (const [ph, value] of Object.entries(slice.byPlaceholder || {})) {
      if (typeof value !== 'string') continue;
      const existing = vault.byPlaceholder[ph];
      if (existing === undefined) {
        if (slice.sites?.[ph] !== where.scope) continue;
        vault.byPlaceholder[ph] = value;
        vault.sites[ph] = where.scope;
        changed = true;
      } else {
        if (!D.inScope(vault, ph, where) || existing !== value) continue;
        if (vault.sites[ph] === undefined && slice.sites?.[ph] === where.scope) { vault.sites[ph] = where.scope; changed = true; }
      }
      accepted.add(ph);
      const used = Number(slice.lastUsed?.[ph]);
      if (Number.isFinite(used) && used > (vault.lastUsed[ph] || 0) && used <= Date.now() + 60_000) { vault.lastUsed[ph] = used; changed = true; }
    }
    for (const [key, ph] of Object.entries(slice.byKey || {})) {
      if (!accepted.has(ph) || vault.byKey[key] === ph) continue;
      if (!key.startsWith(`${where.scope}|`)) continue; // sleutels zonder site maakt alleen een oude versie aan
      vault.byKey[key] = ph;
      changed = true;
    }
    vault.counters = vault.counters || {};
    for (const [type, n] of Object.entries(slice.counters || {})) {
      if (Number.isInteger(n) && n > (vault.counters[type] || 0) && n < 1e9) { vault.counters[type] = n; changed = true; }
    }
    if (D.limit(vault, D.MAX_ENTRIES, accepted)) changed = true;
    return changed;
  }

  root.PrivacyVaultScope = { scopeOfHost, senderHost, scopeOfSender, sliceVault, mergeSlice };
})(typeof globalThis !== 'undefined' ? globalThis : this);
