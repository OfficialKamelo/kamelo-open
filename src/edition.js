// Welke editie van Kamelo dit is (besloten 12 okt 2026):
//   'public'  de gratis versie in de winkels: Private Chat en, op AI-chatsites, een rustige melding bij een persoonlijk
//             onderwerp met de knop naar een tijdelijke chat. Geen afschermen, geen kluis.
//   'teams'   Kamelo for teams: afschermen met placeholders, terugzetten, de kluis en alle instellingen, plus Private Chat.
// In de broncode staat 'teams' (alles zit erin). tools/pack.mjs schrijft hier 'public' in het pakket voor de winkels,
// en laat daar de bestanden voor het afschermen weg.
(function (root) {
  'use strict';
  root.KameloEdition = 'public';
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KameloEdition;
})(typeof globalThis !== 'undefined' ? globalThis : this);
