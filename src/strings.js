// Alle teksten van de interface, in het Engels en het Nederlands.
// De taal volgt de browser: Nederlands als die in het Nederlands staat, anders Engels.
// Gebruik: t('key', { naam: waarde }) en applyI18n() voor elementen met data-i18n*-attributen.
// tools/build-locales.mjs maakt hieruit de _locales-bestanden voor de naam en beschrijving in Chrome.
(function (root) {
  'use strict';

  const STRINGS = {
    en: {
      extName: 'Kamelo: AI privacy software',
      extDescription: 'Private Chat with AI on your own computer, and a nudge to use a temporary chat when you ask AI something personal.',
      actionTitle: 'Kamelo',
      extNameTeams: 'Kamelo for teams',
      extDescriptionTeams: 'Kamelo for teams masks personal and company details on your device before they reach ChatGPT, Gemini, Claude or AI in work apps.',

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
      statusNoneSub: 'Kamelo can’t run on this page.', askPrivatelySub: 'Not in your history, not used for training',

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
      topicPrivate: 'Temporary chat',
      privateReady: 'Temporary chat: not in your history, not used for training.',
      topicProtect: 'Ask in Private Chat',
      topicAdviceChat: 'Ask it in Kamelo’s Private Chat instead.',
      pchatTitle: 'Private Chat', pchatLeft: '{n} of {max} free questions left today',
      pchatNewChat: 'New chat', pchatChatsGone: 'Chats disappear when you close this window.',
      pchatChecking: 'Checking…',
      pchatVerified: 'Sealed',
      pchatNotVerified: 'Not verified',
      pchatNotVerifiedInfo: 'Kamelo couldn’t confirm that the AI runs the published code in a sealed chip, so nothing is sent. Try again in a moment.',
      pchatInfo: 'Your question is sealed on this device: encrypted so only a sealed chip can open it. Not even we can read it. We can see that a question was sent and roughly how long it was.',
      pchatCheckedAt: 'Checked at {time}', pchatViewCode: 'View the code',
      pchatEmptyTitle: 'What’s on your mind?',
      pchatEmptyText: 'Help in confidence',
      pchatFactAccount: 'No account', pchatFactSaved: 'Nothing saved', pchatFactTraining: 'Not used for training',
      pchatPlaceholder: 'Ask anything', pchatHint: 'Names and details are masked first', pchatSend: 'Send',
      pchatMovedTitle: 'Moved here', pchatMoved: 'Nothing was sent to the other AI. Press send when you’re ready.',
      pchatSeen: 'This is what the AI gets',
      pchatLimitTitle: 'You’ve used today’s {max} free questions', pchatLimit: 'More tomorrow. Masking and temporary chats keep working.',
      pchatPlus: 'Kamelo Plus · €4.99 a month incl. VAT (soon)',
      pchatNotSentTitle: 'Not sent', pchatNotSent: 'Nothing was sent.',
      pchatNoKey: 'Private Chat Plus isn’t available right now. Nothing was sent.',
      pchatBadKey: 'Private Chat Plus isn’t available right now. Nothing was sent.',
      pchatNoRelay: 'Private Chat Plus isn’t available right now. Nothing was sent.',
      pchatError: 'Something went wrong.',
      pchatCut: 'The answer was cut short. Ask “go on” for the rest.',
      pchatOnDevice: 'On this device',
      pchatDeviceInfo: 'Your question never leaves this device. The AI built into {browser} answers it right here.',
      pchatDeviceInfoFx: 'Your question never leaves this device. Firefox runs a small open AI model (Qwen3) right here. Firefox downloaded it once from Hugging Face.',
      pchatDownloading: 'Downloading the on-device AI ({p}%)…',
      pchatDeviceOfferTitle: 'Answer on this device?',
      pchatDeviceOffer: '{browser} can answer here for free, and your question never leaves this device. First {browser} downloads its own AI once. It’s a big download: {browser} needs {free} GB of free space.',
      pchatDeviceOfferFx: 'Firefox can answer here for free, and your question never leaves this device. First Firefox downloads an AI model of {size} once, from Hugging Face. Firefox asks for your permission first.',
      pchatDeviceDownload: 'Download', pchatDeviceNotNow: 'Not now', pchatCancel: 'Cancel',
      pchatPreparing: 'Getting the AI on this device ready…',
      pchatDeviceReady: 'The AI on this device is ready.',
      pchatThinkingDevice: 'Answering on this device. The answer appears all at once and can take up to a minute.',
      pchatDeviceFailed: 'The AI in {browser} couldn’t start on this device. Nothing was sent, and your question is still in the box.',
      pchatDeviceBlocked: 'AI is switched off in Firefox’s settings, so it can’t answer on this device. Nothing was sent.',
      pchatDeviceDenied: 'Firefox didn’t get permission, so nothing was downloaded or sent.',
      pchatDeviceCancelled: 'Download stopped. Nothing was sent.',
      pchatDeviceSpace: 'There isn’t enough room for the AI model in Firefox. Nothing was sent.',
      pchatRemoveModel: 'Remove the AI model ({size})', pchatModelRemoved: 'Removed.',
      pchatUseDevice: 'Answer on this device after all',
      pchatNoDeviceTitle: 'No AI on this device',
      pchatNoDevice: '{browser} can’t run its own AI on this computer: it needs {needs}. Ask in a temporary chat instead: it stays out of your history and isn’t used for training. Kamelo masks your details as always.',
      pchatNeedsChrome: 'a graphics chip with more than 4 GB of video memory (or 16 GB of RAM), and 22 GB of free space',
      pchatNeedsEdge: 'Windows 10/11 or macOS 13.3+, a graphics chip with at least 5.5 GB of memory and 20 GB of free space',
      pchatNoApi: '{browser} doesn’t offer its built-in AI to extensions yet. Ask in a temporary chat instead: it stays out of your history and isn’t used for training. Kamelo masks your details as always.',
      pchatOldFirefox: 'Firefox 140 or newer can answer on this device. Update Firefox, or ask in a temporary chat instead.',
      pchatSlowFirefox: 'Firefox’s own AI is still too slow on most computers, so Kamelo doesn’t use it yet. Ask in a temporary chat instead: it stays out of your history and isn’t used for training. Kamelo masks your details as always.',
      pchatDeviceMemory: 'This computer doesn’t have enough free memory for the AI on this device. Nothing was sent.',
      pchatDeviceSlow: 'The AI on this device answered very slowly on this computer, so Kamelo now offers a temporary chat instead: it stays out of your history and isn’t used for training. Kamelo masks your details as always.',
      pchatSlowNote: 'That took {s} seconds. If it stays this slow, Kamelo will offer a temporary chat next time.',
      pchatCutShort: 'Kept short so it stays fast on this device. Ask a follow-up for more.',
      pchatDeviceCant: 'The AI on this device couldn’t answer this one. Nothing was sent, and your question is still in the box.',
      pchatTooLong: 'This is too long for the AI on this device. Nothing was sent. Shorten it, or ask in a temporary chat.',
      pchatNoDeviceDeclined: 'You chose not to download the AI on this device. Ask in a temporary chat instead: it stays out of your history and isn’t used for training.',
      pchatTempChat: 'Temporary chat in {site}',
      pchatTempOpened: 'Opening a temporary chat in {site}, with your question ready to send. Nothing was sent from here.',
      privateChat: 'Private Chat',
      topicWarnings: 'Warn about sensitive topics',
      privateChatSetting: 'Offer Private Chat for personal questions',
      onOff: 'Kamelo on or off', statusOn: 'On', statusTopicsSub: 'Notices personal topics on {site}', statusAiOnlySub: 'Kamelo works on AI chat sites like ChatGPT, Claude and Gemini.',
      tempChatNew: 'Start a temporary chat', mutedTopics: 'Muted topics', privacyPolicy: 'Privacy',
      topicName_HEALTH: 'Health', topicName_MENTAL: 'Mental health', topicName_SEXUALITY: 'Sexuality',
      topicName_RELIGION: 'Faith or religion', topicName_MONEY: 'Money problems', topicName_LEGAL: 'Police or the courts',
      exceptionFrom: 'From {site} · {date}',

      vaultPageTitle: 'Vault · Kamelo',
      titleError: 'Something went wrong. Reload Kamelo in {extensions} and try again.',
      titleOff: 'Vault not locked', titleLocked: 'Vault locked', titleOpen: 'Vault unlocked',
      subOff: 'Encrypt your vault so only you can see the real data.',
      subLocked: 'Protected with {methods}.', subOpen: 'Encrypted on disk, protected with {methods}.',
      methodTouch: 'Touch ID', methodPassword: 'a password', and: 'and',
      setupTouch: 'Lock with Touch ID', usePassword: 'Use your own password',
      newPassword: 'New password (at least 8 characters)', repeatPassword: 'Repeat password', secureVault: 'Lock vault',
      passwordHint: 'Don’t use your email password or any password you already use. If you forget this password, the vault can’t be opened; Kamelo will then start a new one.',
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
      extDescription: 'Private Chat met AI op je eigen computer, en een seintje voor een tijdelijke chat als je AI iets persoonlijks vraagt.',
      actionTitle: 'Kamelo',
      extNameTeams: 'Kamelo for teams',
      extDescriptionTeams: 'Kamelo for teams schermt persoons- en bedrijfsgegevens lokaal af voordat ze ChatGPT, Gemini, Claude of AI in werkapps bereiken.',

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

      toastMore: 'Details', toastMoreN: '+{n} meer', toastCompact: '{n} afgeschermd', detailsTitle: 'Wat de AI ziet',
      detailsClose: 'Sluiten',
      detailsKeep: 'Zichtbaar laten', detailsKept: 'Blijft zichtbaar', detailsRemembered: 'onthouden',
      toastUndo: 'Ongedaan maken',
      markRestored: 'Teruggezet door Kamelo', markAiSaw: 'De AI zag', markAiSees: 'De AI ziet alleen',
      markPending: 'Wordt afgeschermd als je verstuurt.', markMaskNow: 'Nu afschermen',
      statusReady: 'Klaar', statusOnSub: 'op {site}', statusPrivateSub: 'tijdelijke chat op {site}',
      statusReadySub: 'Schermt AI-velden af op {site}', statusOffSub: 'Op alle sites. Persoonsgegevens gaan onafgeschermd naar AI.',
      statusNoneSub: 'Kamelo kan op deze pagina niet werken.', askPrivatelySub: 'Niet in je geschiedenis, niet voor training',

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
      topicPrivate: 'Tijdelijke chat',
      privateReady: 'Tijdelijke chat: niet in je geschiedenis, niet voor training.',
      topicProtect: 'Vraag in Private Chat',
      topicAdviceChat: 'Stel je vraag liever in de Private Chat van Kamelo.',
      pchatTitle: 'Private Chat', pchatLeft: 'Nog {n} van {max} gratis vragen vandaag',
      pchatNewChat: 'Nieuw gesprek', pchatChatsGone: 'Gesprekken verdwijnen als je dit venster sluit.',
      pchatChecking: 'Controleren…',
      pchatVerified: 'Verzegeld',
      pchatNotVerified: 'Niet gecontroleerd',
      pchatNotVerifiedInfo: 'Kamelo kon niet bevestigen dat de AI de openbare code in een afgesloten chip draait, dus er wordt niets verstuurd. Probeer het zo opnieuw.',
      pchatInfo: 'Je vraag wordt verzegeld op dit apparaat: versleuteld, zodat alleen een afgesloten chip hem kan openen. Zelfs wij kunnen hem niet lezen. We zien wel dát er een vraag is verstuurd en ongeveer hoe lang hij was.',
      pchatCheckedAt: 'Gecontroleerd om {time}', pchatViewCode: 'Bekijk de code',
      pchatEmptyTitle: 'Waar zit je mee?',
      pchatEmptyText: 'Hulp in vertrouwen',
      pchatFactAccount: 'Geen account', pchatFactSaved: 'Niets bewaard', pchatFactTraining: 'Niet voor training',
      pchatPlaceholder: 'Vraag maar', pchatHint: 'Namen en gegevens worden eerst afgeschermd', pchatSend: 'Versturen',
      pchatMovedTitle: 'Hierheen verplaatst', pchatMoved: 'Er is niets naar de andere AI gestuurd. Druk op versturen als je klaar bent.',
      pchatSeen: 'Dit krijgt de AI',
      pchatLimitTitle: 'Je hebt je {max} gratis vragen van vandaag gebruikt', pchatLimit: 'Morgen weer. Afschermen en tijdelijke chats blijven werken.',
      pchatPlus: 'Kamelo Plus · €4,99 per maand incl. btw (binnenkort)',
      pchatNotSentTitle: 'Niet verstuurd', pchatNotSent: 'Er is niets verstuurd.',
      pchatNoKey: 'Private Chat Plus is nu niet beschikbaar. Er is niets verstuurd.',
      pchatBadKey: 'Private Chat Plus is nu niet beschikbaar. Er is niets verstuurd.',
      pchatNoRelay: 'Private Chat Plus is nu niet beschikbaar. Er is niets verstuurd.',
      pchatError: 'Er ging iets mis.',
      pchatCut: 'Het antwoord is afgekapt. Vraag “ga door” voor de rest.',
      pchatOnDevice: 'Op dit apparaat',
      pchatDeviceInfo: 'Je vraag verlaat dit apparaat niet. De AI die in {browser} zit, beantwoordt hem hier.',
      pchatDeviceInfoFx: 'Je vraag verlaat dit apparaat niet. Firefox draait hier een klein open AI-model (Qwen3). Dat heeft Firefox één keer gedownload van Hugging Face.',
      pchatDownloading: 'De AI voor op dit apparaat downloaden ({p}%)…',
      pchatDeviceOfferTitle: 'Beantwoorden op dit apparaat?',
      pchatDeviceOffer: '{browser} kan hier gratis antwoorden, en je vraag verlaat dit apparaat niet. Eerst downloadt {browser} één keer zijn eigen AI. Dat is een grote download: {browser} heeft {free} GB vrije ruimte nodig.',
      pchatDeviceOfferFx: 'Firefox kan hier gratis antwoorden, en je vraag verlaat dit apparaat niet. Eerst downloadt Firefox één keer een AI-model van {size}, van Hugging Face. Firefox vraagt eerst je toestemming.',
      pchatDeviceDownload: 'Downloaden', pchatDeviceNotNow: 'Nu niet', pchatCancel: 'Annuleren',
      pchatPreparing: 'De AI op dit apparaat wordt klaargezet…',
      pchatDeviceReady: 'De AI op dit apparaat is klaar.',
      pchatThinkingDevice: 'Wordt op dit apparaat beantwoord. Het antwoord komt in één keer en kan tot een minuut duren.',
      pchatDeviceFailed: 'De AI in {browser} kon op dit apparaat niet starten. Er is niets verstuurd en je vraag staat er nog.',
      pchatDeviceBlocked: 'AI staat uit in de instellingen van Firefox, dus hij kan niet op dit apparaat antwoorden. Er is niets verstuurd.',
      pchatDeviceDenied: 'Firefox kreeg geen toestemming, dus er is niets gedownload of verstuurd.',
      pchatDeviceCancelled: 'Download gestopt. Er is niets verstuurd.',
      pchatDeviceSpace: 'Er is in Firefox niet genoeg ruimte voor het AI-model. Er is niets verstuurd.',
      pchatRemoveModel: 'AI-model verwijderen ({size})', pchatModelRemoved: 'Verwijderd.',
      pchatUseDevice: 'Toch op dit apparaat beantwoorden',
      pchatNoDeviceTitle: 'Geen AI op dit apparaat',
      pchatNoDevice: '{browser} kan op deze computer zelf geen AI draaien. Daarvoor is nodig: {needs}. Stel je vraag in een tijdelijke chat: die komt niet in je geschiedenis en wordt niet gebruikt voor training. Kamelo schermt je gegevens af zoals altijd.',
      pchatNeedsChrome: 'een grafische chip met meer dan 4 GB videogeheugen (of 16 GB werkgeheugen), en 22 GB vrije ruimte',
      pchatNeedsEdge: 'Windows 10/11 of macOS 13.3+, een grafische chip met minstens 5,5 GB geheugen en 20 GB vrije ruimte',
      pchatNoApi: '{browser} biedt zijn ingebouwde AI nog niet aan extensies aan. Stel je vraag in een tijdelijke chat: die komt niet in je geschiedenis en wordt niet gebruikt voor training. Kamelo schermt je gegevens af zoals altijd.',
      pchatOldFirefox: 'Vanaf Firefox 140 kan Firefox op dit apparaat antwoorden. Werk Firefox bij, of stel je vraag in een tijdelijke chat.',
      pchatSlowFirefox: 'De eigen AI van Firefox is op de meeste computers nog te traag, dus Kamelo gebruikt hem nog niet. Stel je vraag in een tijdelijke chat: die komt niet in je geschiedenis en wordt niet gebruikt voor training. Kamelo schermt je gegevens af zoals altijd.',
      pchatDeviceMemory: 'Deze computer heeft niet genoeg vrij geheugen voor de AI op dit apparaat. Er is niets verstuurd.',
      pchatDeviceSlow: 'De AI op dit apparaat antwoordde op deze computer erg traag, dus Kamelo biedt nu een tijdelijke chat aan: die komt niet in je geschiedenis en wordt niet gebruikt voor training. Kamelo schermt je gegevens af zoals altijd.',
      pchatSlowNote: 'Dat duurde {s} seconden. Blijft het zo traag, dan biedt Kamelo de volgende keer een tijdelijke chat aan.',
      pchatCutShort: 'Kort gehouden, zodat het snel blijft op dit apparaat. Vraag door voor meer.',
      pchatDeviceCant: 'De AI op dit apparaat kon deze vraag niet beantwoorden. Er is niets verstuurd en je vraag staat er nog.',
      pchatTooLong: 'Dit is te lang voor de AI op dit apparaat. Er is niets verstuurd. Maak het korter, of stel je vraag in een tijdelijke chat.',
      pchatNoDeviceDeclined: 'Je hebt de AI op dit apparaat niet gedownload. Stel je vraag in een tijdelijke chat: die komt niet in je geschiedenis en wordt niet gebruikt voor training.',
      pchatTempChat: 'Tijdelijke chat in {site}',
      pchatTempOpened: 'Er gaat een tijdelijke chat open in {site}, met je vraag klaar om te versturen. Vanaf hier is niets verstuurd.',
      privateChat: 'Private Chat',
      topicWarnings: 'Waarschuwen bij gevoelige onderwerpen',
      privateChatSetting: 'Private Chat aanbieden bij persoonlijke vragen',
      onOff: 'Kamelo aan of uit', statusOn: 'Aan', statusTopicsSub: 'Let op persoonlijke onderwerpen op {site}', statusAiOnlySub: 'Kamelo werkt op AI-chatsites zoals ChatGPT, Claude en Gemini.',
      tempChatNew: 'Begin een tijdelijke chat', mutedTopics: 'Uitgezette onderwerpen', privacyPolicy: 'Privacy',
      topicName_HEALTH: 'Gezondheid', topicName_MENTAL: 'Mentale gezondheid', topicName_SEXUALITY: 'Seksualiteit',
      topicName_RELIGION: 'Geloof', topicName_MONEY: 'Geldzorgen', topicName_LEGAL: 'Politie of rechter',
      exceptionFrom: 'Van {site} · {date}',

      vaultPageTitle: 'Kluis · Kamelo',
      titleError: 'Er ging iets mis. Herlaad Kamelo via {extensions} en probeer het opnieuw.',
      titleOff: 'Kluis niet beveiligd', titleLocked: 'Kluis vergrendeld', titleOpen: 'Kluis ontgrendeld',
      subOff: 'Versleutel je kluis, zodat alleen jij de echte gegevens kunt zien.',
      subLocked: 'Beveiligd met {methods}.', subOpen: 'Versleuteld op schijf, beveiligd met {methods}.',
      methodTouch: 'Touch ID', methodPassword: 'wachtwoord', and: 'en',
      setupTouch: 'Beveilig met Touch ID', usePassword: 'Gebruik een eigen wachtwoord',
      newPassword: 'Nieuw wachtwoord (minstens 8 tekens)', repeatPassword: 'Herhaal wachtwoord', secureVault: 'Kluis beveiligen',
      passwordHint: 'Gebruik niet je e-mailwachtwoord of een ander wachtwoord dat je al gebruikt. Vergeet je dit wachtwoord, dan is de kluis niet meer te openen; Kamelo maakt dan een nieuwe aan.',
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

  // Chrome, Edge of Firefox: voor teksten als "als je Chrome sluit" en het adres van de extensiepagina. ?browser=edge voor previews.
  function browser() {
    const nav = root.navigator;
    const forced = root.location ? new URLSearchParams(root.location.search).get('browser') : null;
    const firefox = forced ? forced === 'firefox'
      : typeof root.browser?.runtime?.getBrowserInfo === 'function' || /\bFirefox\//.test(nav?.userAgent || '');
    if (firefox) return { id: 'firefox', name: 'Firefox', extensions: 'about:addons' };
    const edge = forced ? forced === 'edge'
      : nav?.userAgentData?.brands ? nav.userAgentData.brands.some(b => b.brand === 'Microsoft Edge')
      : /\bEdg\//.test(nav?.userAgent || '');
    return edge
      ? { id: 'edge', name: 'Edge', extensions: 'edge://extensions' }
      : { id: 'chrome', name: 'Chrome', extensions: 'chrome://extensions' };
  }
  const BROWSER = browser();

  // De gratis editie (zie edition.js) schermt niets af: daar andere woorden waar de gewone tekst over afschermen gaat.
  const MASKS_EN = ' Kamelo masks your details as always.', MASKS_NL = ' Kamelo schermt je gegevens af zoals altijd.';
  const PUBLIC = {
    en: {
      topicAdvice: 'Consider a temporary chat for this.',
      pchatCardSub: 'Answers on your own computer', tempChatSub: 'Not saved in your history',
      statusOffSub: 'No notices about personal topics.',
      pchatLimit: 'More tomorrow. Temporary chats keep working.',
      ...Object.fromEntries(['pchatNoDevice', 'pchatNoApi', 'pchatSlowFirefox', 'pchatDeviceSlow'].map(k => [k, STRINGS.en[k].replace(MASKS_EN, '')])),
    },
    nl: {
      topicAdvice: 'Overweeg hiervoor een tijdelijke chat.',
      pchatCardSub: 'Antwoordt op je eigen computer', tempChatSub: 'Niet in je geschiedenis',
      statusOffSub: 'Geen meldingen bij persoonlijke onderwerpen.',
      pchatLimit: 'Morgen weer. Tijdelijke chats blijven werken.',
      ...Object.fromEntries(['pchatNoDevice', 'pchatNoApi', 'pchatSlowFirefox', 'pchatDeviceSlow'].map(k => [k, STRINGS.nl[k].replace(MASKS_NL, '')])),
    },
  };

  function t(key, vars = {}) {
    const pub = root.KameloEdition === 'public' ? PUBLIC : null;
    const text = pub?.[LANG][key] ?? STRINGS[LANG][key] ?? pub?.en[key] ?? STRINGS.en[key] ?? key;
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

  const api = { STRINGS, PUBLIC, LANG, BROWSER, t, typeLabel, typesLabel, applyI18n };
  root.PrivacyI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
