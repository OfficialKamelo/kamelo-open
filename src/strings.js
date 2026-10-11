// Alle teksten van de interface, in het Engels en het Nederlands.
// De taal volgt de browser: Nederlands als die in het Nederlands staat, anders Engels.
// Gebruik: t('key', { naam: waarde }) en applyI18n() voor elementen met data-i18n*-attributen.
// tools/build-locales.mjs maakt hieruit de _locales-bestanden voor de naam en beschrijving in Chrome.
(function (root) {
  'use strict';

  const STRINGS = {
    en: {
      extName: 'Kamelo: AI privacy software',
      extDescription: 'Talk to AI freely. Kamelo masks your name and personal details on your device before they reach ChatGPT, Gemini, Claude or other AI.',
      actionTitle: 'Kamelo',

      settings: 'Settings', back: 'Back', loading: 'Loading…',
      protection: 'Protection', vaultSecurity: 'Vault lock', off: 'Off',
      treatAsAi: 'Mask every text field', treatAsAiHint: 'For AI features Kamelo doesn’t recognise.',
      howItWorks: 'How does it work?',
      thisSite: 'On {site}', general: 'General',
      catMask: 'Masking', catVault: 'Vault', catSites: 'Sites', sitesEmpty: 'No sites yet.',
      statusProtected: 'Protected', statusOff: 'Off', statusNone: 'Not available',
      statusReload: 'Reload page', monthCaption: 'protected this month', tryIt: 'Try Kamelo',
      locked: 'Locked', password: 'Password',

      maskText: 'Mask text',
      maskPlaceholder: 'Paste or type text. Paste an AI answer to get your details back.',
      maskFound: '{n} masked', maskFoundOne: '1 masked', maskNone: 'Nothing personal found',
      restoreFound: '{n} restored', restoreFoundOne: '1 restored',
      copyMasked: 'Copy masked text', copyRestored: 'Copy with real details', copyAsIs: 'Copy',
      maskFoot: 'Everything happens on this device.',
      maskLocked: 'Unlock the vault to mask or restore text.', openVault: 'Open vault',
      vault: 'Vault', search: 'Search', copied: 'Copied',
      clearVault: 'Clear vault', clearConfirm: 'Click again to clear everything',
      noResults: 'No results', vaultEmpty: 'The vault is empty',
      remove: 'Remove {item}', vaultShow: 'Show real values', vaultHide: 'Hide real values',

      restoreInAnswers: 'Restore in answers', autoDelete: 'Auto-delete',
      after1: 'After 1 day', after7: 'After 7 days', after30: 'After 30 days', after90: 'After 90 days', never: 'Never',
      alwaysMask: 'Always protect', alwaysMaskPlaceholder: 'Add a term, e.g. Acme Ltd',
      neverMask: 'Never protect', neverMaskPlaceholder: 'Add, e.g. your own name',
      markedAi: 'Marked as AI', markedAiHint: 'Every text field on these sites is protected.',
      reportProblem: 'Report a problem',
      reportSubject: 'Problem with Kamelo on {site}', reportBody: 'What happened? (Please use made-up data only.)',

      type_PERSON: 'person', type_EMAIL: 'email', type_PHONE: 'phone', type_IBAN: 'IBAN', type_BANK: 'bank details',
      type_CARD: 'payment card', type_ID: 'ID number', type_BIRTHDATE: 'date of birth', type_ADDRESS: 'address',
      type_POSTCODE: 'postcode', type_IP: 'IP address', type_WALLET: 'crypto wallet', type_SECRET: 'password or key',
      type_CONFIDENTIAL: 'custom term', type_COMPANY: 'company',

      toastMore: 'Details', toastMoreN: '+{n} more', toastCompact: '{n} protected', detailsTitle: 'What the AI sees',
      detailsClose: 'Close',
      detailsKeep: 'Keep visible', detailsKept: 'Stays visible', detailsRemembered: 'remembered',
      toastUndo: 'Undo',
      markRestored: 'Restored by Kamelo', markAiSaw: 'The AI saw', markAiSees: 'The AI only sees',
      markPending: 'Masked when you send.', markMaskNow: 'Mask now',
      statusReady: 'Ready', statusOnSub: 'on {site}', statusPrivateSub: 'temporary chat on {site}',
      statusReadySub: 'Masks AI fields on {site}', statusOffSub: 'On every site. Personal details go to AI unmasked.',
      statusNoneSub: 'Kamelo can’t run on this page.', askPrivatelySub: 'Temporary chat: not in your history',

      thisMonth: 'This month', statsCaption: 'items protected in {month}', statsEmpty: 'Nothing protected yet in {month}.',
      types_PERSON: 'Names', types_EMAIL: 'Email addresses', types_PHONE: 'Phone numbers', types_IBAN: 'IBANs',
      types_BANK: 'Bank details', types_CARD: 'Payment cards', types_ID: 'ID numbers', types_BIRTHDATE: 'Dates of birth',
      types_ADDRESS: 'Addresses', types_POSTCODE: 'Postcodes', types_IP: 'IP addresses', types_WALLET: 'Crypto wallets',
      types_SECRET: 'Passwords and keys', types_CONFIDENTIAL: 'Custom terms', types_COMPANY: 'Companies', types_OTHER: 'Other',

      topicTitle: 'Sensitive topic',
      topic_HEALTH: 'You’re sharing something about health.',
      topic_MENTAL: 'You’re sharing something about mental health.',
      topic_SEXUALITY: 'You’re sharing something about sexuality.',
      topic_RELIGION: 'You’re sharing something about faith or religion.',
      topic_MONEY: 'You’re sharing something about money problems.',
      topic_LEGAL: 'You’re sharing something about police or the courts.',
      topicAdvice: 'Kamelo can’t mask this. Consider a temporary chat.',
      topicOk: 'OK', topicMute: 'Don’t show again',
      topicAdvicePrivate: 'Ask it in a temporary chat: it stays out of your history and isn’t used for training.',
      topicPrivate: 'Ask privately',
      privateReady: 'Temporary chat: not in your history, not used for training.',
      topicWarnings: 'Warn about sensitive topics',
      exceptionFrom: 'From {site} · {date}',

      vaultPageTitle: 'Vault · Kamelo',
      titleError: 'Something went wrong. Reload Kamelo in {extensions} and try again.',
      titleOff: 'Vault not locked', titleLocked: 'Vault locked', titleOpen: 'Vault unlocked',
      subOff: 'Encrypt your vault so only you can see the real data.',
      subLocked: 'Protected with {methods}.', subOpen: 'Encrypted on disk, protected with {methods}.',
      methodTouch: 'Touch ID', methodPassword: 'a password', and: 'and',
      setupTouch: 'Lock with Touch ID', usePassword: 'Use your own password',
      newPassword: 'New password (at least 8 characters)', repeatPassword: 'Repeat password', secureVault: 'Lock vault',
      passwordHint: 'Don’t use your Google password or any password you already use. If you forget this password, the vault can’t be opened; Kamelo will then start a new one.',
      unlockTouch: 'Unlock with Touch ID', passwordField: 'Password', unlock: 'Unlock',
      lockedHint: 'Even while locked, Kamelo keeps protecting your data. You only need to unlock to restore it in answers.',
      lockNow: 'Lock now', addTouch: 'Add Touch ID', addPassword: 'Add password',
      disable: 'Turn off protection', openHint: 'The vault locks automatically when you close {browser}.',
      msgTouchAgain: 'Touch the sensor once more to create the key…',
      msgTouchUnsupported: 'Touch ID can’t be used for encryption on this computer or in this version of {browser}. Use your own password instead.',
      msgWrong: 'That’s not right. Please try again.', msgCancelled: 'Touch ID was cancelled.',
      msgMinChars: 'Use at least {n} characters.', msgMismatch: 'The passwords don’t match.',
      msgDoneTouch: 'Your vault is encrypted and protected with Touch ID.',
      msgDonePassword: 'Your vault is encrypted and protected with your password.',
      msgUnlocked: 'Unlocked.', msgLocked: 'Locked.', msgTouchAdded: 'Touch ID added.', msgPasswordAdded: 'Password added.',
      msgDisableConfirm: 'Turn off protection? The vault will be stored unencrypted on this computer again.',
      msgDisabled: 'Protection is off.',
    },

    nl: {
      extName: 'Kamelo: privacysoftware voor AI',
      extDescription: 'Praat vrij met AI. Kamelo schermt je naam en persoonsgegevens lokaal af voordat ze ChatGPT, Gemini, Claude of andere AI bereiken.',
      actionTitle: 'Kamelo',

      settings: 'Instellingen', back: 'Terug', loading: 'Laden…',
      protection: 'Bescherming', vaultSecurity: 'Kluisbeveiliging', off: 'Uit',
      treatAsAi: 'Elk tekstveld afschermen', treatAsAiHint: 'Voor AI-functies die Kamelo niet herkent.',
      howItWorks: 'Hoe werkt het?',
      thisSite: 'Op {site}', general: 'Algemeen',
      catMask: 'Afschermen', catVault: 'Kluis', catSites: 'Sites', sitesEmpty: 'Nog geen sites.',
      statusProtected: 'Beschermd', statusOff: 'Uit', statusNone: 'Niet beschikbaar',
      statusReload: 'Pagina verversen', monthCaption: 'afgeschermd deze maand', tryIt: 'Probeer Kamelo',
      locked: 'Vergrendeld', password: 'Wachtwoord',

      maskText: 'Tekst afschermen',
      maskPlaceholder: 'Plak of typ tekst. Plak een AI-antwoord om je gegevens terug te krijgen.',
      maskFound: '{n} afgeschermd', maskFoundOne: '1 afgeschermd', maskNone: 'Niets persoonlijks gevonden',
      restoreFound: '{n} teruggezet', restoreFoundOne: '1 teruggezet',
      copyMasked: 'Afgeschermd kopiëren', copyRestored: 'Kopiëren met echte gegevens', copyAsIs: 'Kopiëren',
      maskFoot: 'Alles gebeurt op dit apparaat.',
      maskLocked: 'Ontgrendel de kluis om tekst af te schermen of terug te zetten.', openVault: 'Kluis openen',
      vault: 'Kluis', search: 'Zoeken', copied: 'Gekopieerd',
      clearVault: 'Kluis wissen', clearConfirm: 'Klik nogmaals om alles te wissen',
      noResults: 'Geen resultaten', vaultEmpty: 'De kluis is leeg',
      remove: '{item} verwijderen', vaultShow: 'Echte gegevens tonen', vaultHide: 'Echte gegevens verbergen',

      restoreInAnswers: 'Terugzetten in antwoorden', autoDelete: 'Automatisch wissen',
      after1: 'Na 1 dag', after7: 'Na 7 dagen', after30: 'Na 30 dagen', after90: 'Na 90 dagen', never: 'Nooit',
      alwaysMask: 'Altijd afschermen', alwaysMaskPlaceholder: 'Term toevoegen, bijv. Acme BV',
      neverMask: 'Nooit afschermen', neverMaskPlaceholder: 'Toevoegen, bijv. je eigen naam',
      markedAi: 'Gemarkeerd als AI', markedAiHint: 'Op deze sites wordt elk tekstveld afgeschermd.',
      reportProblem: 'Probleem melden',
      reportSubject: 'Probleem met Kamelo op {site}', reportBody: 'Wat ging er mis? (Gebruik alleen verzonnen gegevens.)',

      type_PERSON: 'persoon', type_EMAIL: 'e-mail', type_PHONE: 'telefoon', type_IBAN: 'IBAN', type_BANK: 'bankgegevens',
      type_CARD: 'betaalkaart', type_ID: 'ID-nummer', type_BIRTHDATE: 'geboortedatum', type_ADDRESS: 'adres',
      type_POSTCODE: 'postcode', type_IP: 'IP-adres', type_WALLET: 'cryptowallet', type_SECRET: 'wachtwoord of sleutel',
      type_CONFIDENTIAL: 'eigen term', type_COMPANY: 'bedrijf',

      toastMore: 'Bekijk', toastMoreN: '+{n} meer', toastCompact: '{n} afgeschermd', detailsTitle: 'Wat de AI ziet',
      detailsClose: 'Sluiten',
      detailsKeep: 'Zichtbaar laten', detailsKept: 'Blijft zichtbaar', detailsRemembered: 'onthouden',
      toastUndo: 'Ongedaan maken',
      markRestored: 'Teruggezet door Kamelo', markAiSaw: 'De AI zag', markAiSees: 'De AI ziet alleen',
      markPending: 'Wordt afgeschermd als je verstuurt.', markMaskNow: 'Nu afschermen',
      statusReady: 'Klaar', statusOnSub: 'op {site}', statusPrivateSub: 'tijdelijke chat op {site}',
      statusReadySub: 'Schermt AI-velden af op {site}', statusOffSub: 'Op alle sites. Persoonsgegevens gaan onafgeschermd naar AI.',
      statusNoneSub: 'Kamelo kan op deze pagina niet werken.', askPrivatelySub: 'Tijdelijke chat zonder geschiedenis',

      thisMonth: 'Deze maand', statsCaption: 'gegevens afgeschermd in {month}', statsEmpty: 'Nog niets afgeschermd in {month}.',
      types_PERSON: 'Namen', types_EMAIL: 'E-mailadressen', types_PHONE: 'Telefoonnummers', types_IBAN: 'IBAN’s',
      types_BANK: 'Bankgegevens', types_CARD: 'Betaalkaarten', types_ID: 'ID-nummers', types_BIRTHDATE: 'Geboortedata',
      types_ADDRESS: 'Adressen', types_POSTCODE: 'Postcodes', types_IP: 'IP-adressen', types_WALLET: 'Cryptowallets',
      types_SECRET: 'Wachtwoorden en sleutels', types_CONFIDENTIAL: 'Eigen termen', types_COMPANY: 'Bedrijven', types_OTHER: 'Overig',

      topicTitle: 'Gevoelig onderwerp',
      topic_HEALTH: 'Je deelt iets over gezondheid.',
      topic_MENTAL: 'Je deelt iets over mentale gezondheid.',
      topic_SEXUALITY: 'Je deelt iets over seksualiteit.',
      topic_RELIGION: 'Je deelt iets over geloof.',
      topic_MONEY: 'Je deelt iets over geldzorgen.',
      topic_LEGAL: 'Je deelt iets over politie of justitie.',
      topicAdvice: 'Dit kan Kamelo niet afschermen. Overweeg een tijdelijke chat.',
      topicOk: 'Oké', topicMute: 'Niet meer tonen',
      topicAdvicePrivate: 'Stel je vraag in een tijdelijke chat: die komt niet in je geschiedenis en wordt niet gebruikt voor training.',
      topicPrivate: 'Vraag het privé',
      privateReady: 'Tijdelijke chat: niet in je geschiedenis, niet voor training.',
      topicWarnings: 'Waarschuwen bij gevoelige onderwerpen',
      exceptionFrom: 'Van {site} · {date}',

      vaultPageTitle: 'Kluis · Kamelo',
      titleError: 'Er ging iets mis. Herlaad Kamelo via {extensions} en probeer het opnieuw.',
      titleOff: 'Kluis niet beveiligd', titleLocked: 'Kluis vergrendeld', titleOpen: 'Kluis ontgrendeld',
      subOff: 'Versleutel je kluis, zodat alleen jij de echte gegevens kunt zien.',
      subLocked: 'Beveiligd met {methods}.', subOpen: 'Versleuteld op schijf, beveiligd met {methods}.',
      methodTouch: 'Touch ID', methodPassword: 'wachtwoord', and: 'en',
      setupTouch: 'Beveilig met Touch ID', usePassword: 'Gebruik een eigen wachtwoord',
      newPassword: 'Nieuw wachtwoord (minstens 8 tekens)', repeatPassword: 'Herhaal wachtwoord', secureVault: 'Kluis beveiligen',
      passwordHint: 'Gebruik niet je Google-wachtwoord of een ander wachtwoord dat je al gebruikt. Vergeet je dit wachtwoord, dan is de kluis niet meer te openen; Kamelo maakt dan een nieuwe aan.',
      unlockTouch: 'Ontgrendel met Touch ID', passwordField: 'Wachtwoord', unlock: 'Ontgrendelen',
      lockedHint: 'Ook vergrendeld blijft Kamelo je gegevens afschermen. Ontgrendelen is alleen nodig om ze in antwoorden terug te zetten.',
      lockNow: 'Nu vergrendelen', addTouch: 'Touch ID toevoegen', addPassword: 'Wachtwoord toevoegen',
      disable: 'Beveiliging uitzetten', openHint: 'De kluis vergrendelt vanzelf als je {browser} sluit.',
      msgTouchAgain: 'Leg je vinger nog één keer op Touch ID om de sleutel te maken…',
      msgTouchUnsupported: 'Touch ID kan op deze computer of in deze versie van {browser} niet gebruikt worden om te versleutelen. Gebruik een eigen wachtwoord.',
      msgWrong: 'Dat klopt niet. Probeer het opnieuw.', msgCancelled: 'Touch ID is afgebroken.',
      msgMinChars: 'Gebruik minstens {n} tekens.', msgMismatch: 'De wachtwoorden zijn niet gelijk.',
      msgDoneTouch: 'Je kluis is versleuteld en beveiligd met Touch ID.',
      msgDonePassword: 'Je kluis is versleuteld en beveiligd met je wachtwoord.',
      msgUnlocked: 'Ontgrendeld.', msgLocked: 'Vergrendeld.', msgTouchAdded: 'Touch ID is toegevoegd.', msgPasswordAdded: 'Wachtwoord toegevoegd.',
      msgDisableConfirm: 'Beveiliging uitzetten? De kluis wordt dan weer onversleuteld op deze computer bewaard.',
      msgDisabled: 'Beveiliging staat uit.',
    },
  };

  // Oude, Nederlandstalige type-namen uit bestaande kluizen.
  const LEGACY_TYPES = { PERSOON: 'PERSON', TELEFOON: 'PHONE', CREDITCARD: 'CARD', BSN: 'ID', ADRES: 'ADDRESS', VERTROUWELIJK: 'CONFIDENTIAL' };

  function language() {
    // ?lang=en of ?lang=nl in de url (alleen voor previews en tests).
    const forced = root.location ? new URLSearchParams(root.location.search).get('lang') : null;
    if (forced === 'en' || forced === 'nl') return forced;
    let lang = '';
    try { lang = root.chrome?.i18n?.getUILanguage?.() || ''; } catch {}
    lang = lang || root.navigator?.language || 'en';
    return /^nl\b/i.test(lang) ? 'nl' : 'en';
  }
  const LANG = language();

  // Chrome of Edge: voor teksten als "als je Chrome sluit" en het adres van de extensiepagina. ?browser=edge voor previews.
  function browser() {
    const nav = root.navigator;
    const forced = root.location ? new URLSearchParams(root.location.search).get('browser') : null;
    const edge = forced ? forced === 'edge'
      : nav?.userAgentData?.brands ? nav.userAgentData.brands.some(b => b.brand === 'Microsoft Edge')
      : /\bEdg\//.test(nav?.userAgent || '');
    return edge
      ? { id: 'edge', name: 'Edge', extensions: 'edge://extensions' }
      : { id: 'chrome', name: 'Chrome', extensions: 'chrome://extensions' };
  }
  const BROWSER = browser();

  function t(key, vars = {}) {
    const text = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
    const all = { browser: BROWSER.name, extensions: BROWSER.extensions, ...vars };
    return text.replace(/\{(\w+)\}/g, (_, k) => (k in all ? all[k] : `{${k}}`));
  }

  const typeLabel = type => t(`type_${LEGACY_TYPES[type] || type}`);
  const typesLabel = type => t(`types_${LEGACY_TYPES[type] || type}`);

  // Vult elementen met data-i18n (tekst), data-i18n-placeholder en data-i18n-title (ook aria-label).
  function applyI18n(rootEl = root.document) {
    if (!rootEl) return;
    rootEl.documentElement?.setAttribute('lang', LANG);
    rootEl.documentElement?.setAttribute('data-browser', BROWSER.id);
    rootEl.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    rootEl.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    rootEl.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', t(el.dataset.i18nTitle));
    });
  }

  const api = { STRINGS, LANG, BROWSER, t, typeLabel, typesLabel, applyI18n };
  root.PrivacyI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
