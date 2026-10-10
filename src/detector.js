// Detectie en maskering van persoonsgegevens, wereldwijd.
// Draait volledig lokaal: in de browser (content script / popup) en in Node (tests).
//
// Placeholders zijn Engelstalig ([PERSON_1], [IBAN_1], …): één taal die elke AI begrijpt.
// Waar mogelijk controleren we een controlegetal (IBAN, Luhn, elfproef, SSN-regels, …), zodat
// willekeurige getallen niet onterecht worden afgeschermd.
(function (root) {
  'use strict';

  // ---------- Woordenlijsten ----------

  const FIRST_NAMES = new Set(`
    jan piet kees henk peter thomas daan sem lucas levi finn noah liam luuk bram tim tom lars jesse
    ruben sander bas stijn niels joost maarten martijn jeroen rob robert erik eric hans gerard
    willem wim johan jos joris koen kevin dennis patrick michiel wouter vincent jasper bart dirk arjen
    arjan marco paul rick roy stefan sven milan julian sam adam mohammed mohamed muhammad ahmed ali
    omar youssef mustafa hassan ibrahim emma julia mila sophie tess zoë zoe sara sarah anna eva lisa
    lotte fleur sanne anouk iris femke laura linda sandra monique petra ingrid marieke annemarie maria
    marie els anja karin esther inge ellen saskia nicole kim demi britt isa noa lieke nina yara fatima
    amira aisha nora eline ilse judith mirjam marloes wendy marjolein hanneke jolanda yvonne carla
    mieke joke ria truus astrid charlotte elise emily olivia john james michael david daniel chris
    sophia mia hendrik gert gijs hugo jelle jop job teun thijs floris olaf ivo menno pieter rutger
    simone suzanne mariska renate gerda margreet bianca chantal mandy priscilla manon jessica
    william richard joseph charles christopher matthew anthony donald steven andrew joshua kenneth
    george edward brian ronald timothy jason jeffrey ryan jacob gary nicholas jonathan stephen larry
    justin scott brandon benjamin samuel gregory alexander alex patrick jack dennis jerry tyler aaron
    jose henry nathan douglas zachary peter kyle walter ethan jeremy harold keith roger
    oliver harry charlie oscar archie leo freddie alfie arthur theo isaac logan mason elijah aiden
    jennifer elizabeth barbara susan margaret dorothy lisa nancy karen betty helen sandra donna carol
    ruth sharon michelle sarah kimberly deborah amy angela melissa brenda rebecca stephanie
    katherine kathleen christine samantha janet catherine emma amelia isla ava ella lily
    chloe evie poppy isabella hannah abigail ashley megan lauren rachel natalie
    hans klaus jürgen stefan wolfgang michael andreas thomas markus matthias lukas felix jonas leon
    maximilian paul elias luis anna sophie lena lea hanna emilia ursula monika petra sabine
    jean pierre michel philippe alain nicolas françois louis gabriel raphaël arthur jules hugo
    camille léa manon chloé inès zoé juliette louise alice claire nathalie isabelle
    josé antonio manuel francisco juan javier carlos miguel alejandro pablo diego sergio jorge
    lucía carmen ana isabel laura cristina marta elena paula sofía valentina
    giuseppe giovanni luca marco francesco alessandro andrea matteo lorenzo giulia chiara francesca
    raj rahul amit vikram arjun rohan aditya priya ananya pooja neha divya kavya aarav vivaan
    wei jing li ming hui yan chen yuki hiroshi takashi haruto sakura aiko ji-ho min-jun seo-yeon
    olga natasha anastasia dmitri ivan sergei vladimir ekaterina irina mehmet ahmet ayşe fatma emre
    joão pedro tiago gonçalo beatriz inês piotr krzysztof tomasz paweł agnieszka katarzyna małgorzata
    anders nils karl magnus erik ingrid astrid sigrid freya mikael jukka mikko aino ville
    александр сергей дмитрий андрей алексей иван михаил николай наталья елена ольга анна мария татьяна екатерина
    γιώργος νίκος δημήτρης κώστας μαρία ελένη κατερίνα σοφία
  `.split(/\s+/).filter(Boolean));

  // Woorden met een hoofdletter die geen achternaam zijn ("Jan Heeft ..." → alleen "Jan").
  const STOP = new Set(`
    de het een en is ik je jij u hij zij ze we wij jullie dit dat die deze er maar of dus want ook
    nu dan als wat wie waar hoe in op met van voor naar bij om te tot uit aan door over onder na
    zonder heeft hebben wil kan zal gaat moet was had graag hallo hoi beste dag dank bedankt groet
    groeten daarom verder toen omdat hier daar alle geen niet wel mijn jouw zijn haar ons onze hun
    mvg vriendelijke bijvoorbeeld
    the a an and or but is are was were be has have had will would can could should may might must
    i you he she it we they my your his her our their this that these those there here what who
    when where why how hi hello dear thanks thank regards best please yes no not also just
    der die das und ist ein eine le la les et un une est el los las y es il lo gli e
    january february march april may june july august september october november december
    januari februari maart mei juni juli augustus oktober
    monday tuesday wednesday thursday friday saturday sunday
    maandag dinsdag woensdag donderdag vrijdag zaterdag zondag
  `.split(/\s+/).filter(Boolean));

  // Namen die ook een gewoon woord zijn ("Will you…", "mark this", "in May", "a job"). Die schermen we alleen af
  // als de context duidelijk op een persoon wijst (zie STRONG_CUE).
  const WORD_NAMES = new Set(`
    will may mark rose bill grace hope june april august art faith joy summer dawn ray rich frank sue pat gene
    chase jack sky iris lily ivy daisy poppy ruby amber jade pearl olive violet holly job rob bas jan roos mei wei
    fleur isla leo noa sam kim tom tim ben don ted max guy lee
  `.split(/\s+/).filter(Boolean));
  // Woorden vlak vóór een naam die duidelijk op een persoon wijzen: aanhef, communicatie, familie en werk.
  const STRONG_CUE = new RegExp('(?:^|[^\\p{L}])(?:dear|hi|hello|hey|thanks|thank you|cc|ask|asked|tell|told|email|e-mail|mail|call|called|text|' +
    'remind|message|meet|met|beste|lieve|hoi|hallo|bedankt|vraag|bel|' +
    '(?:my|our|your|his|her|mijn|onze|jouw|zijn|haar)\\s+(?:son|daughter|wife|husband|mom|mum|mother|dad|father|brother|sister|friend|colleague|' +
    'client|customer|boss|manager|partner|kid|child|neighbo(?:u)?r|landlord|teacher|doctor|zoon|dochter|vrouw|man|moeder|vader|broer|zus|' +
    'vriend|vriendin|collega|klant|baas|buurman|buurvrouw|huisbaas|leraar|juf|meester|dokter|kind))\\s+$', 'iu');
  // Zwakkere aanwijzing: een voorzetsel. Genoeg voor een naam die geen gewoon woord is ("to sarah").
  const WEAK_CUE = /(?:^|[^\p{L}])(?:to|for|from|with|and|by|via|aan|voor|van|met|en|door|bij|naar)\s+$/iu;

  const TUSSEN = "(?:van|de|der|den|ter|ten|te|het|'t|in|op|von|zu|du|da|di|dos|das|del|della|la|le|el|al|bin|ibn|mac|mc|o')";
  const NAMEWORD = "\\p{Lu}[\\p{Ll}']+(?:-\\p{Lu}\\p{Ll}+)?";
  const TITLES = [
    'dhr\\.?', 'mevr\\.?', 'mevrouw', 'meneer', 'de heer', 'mr\\.?', 'mrs\\.?', 'ms\\.?', 'miss', 'mx\\.?',
    'dr\\.?', 'prof\\.?', 'ir\\.?', 'ing\\.?', 'sir', 'dame', 'herr', 'frau', 'monsieur', 'madame', 'mme\\.?',
    'mlle\\.?', 'señor', 'señora', 'sr\\.', 'sra\\.', 'signor', 'signora', 'sig\\.', 'sig\\.ra',
    'senhor', 'senhora', 'dona', 'pan', 'pani', 'bay', 'bayan', 'herrn', 'господин', 'госпожа', 'г-н', 'г-жа', 'κύριος', 'κυρία',
  ];

  // ---------- Types ----------

  // Hogere prioriteit wint bij overlap.
  const PRIORITY = {
    SECRET: 110, CONFIDENTIAL: 100, EMAIL: 90, IBAN: 86, BANK: 85, WALLET: 81, CARD: 80, ID: 78,
    PHONE: 70, BIRTHDATE: 68, IP: 65, ADDRESS: 60, COMPANY: 58, POSTCODE: 55, PERSON: 50,
  };

  // Labels in de interface (Nederlands). Oude Nederlandse type-namen blijven leesbaar voor bestaande kluizen.
  const LABELS = {
    PERSON: 'persoon', EMAIL: 'e-mail', PHONE: 'telefoon', IBAN: 'IBAN', BANK: 'bankgegevens',
    CARD: 'betaalkaart', ID: 'ID-nummer', BIRTHDATE: 'geboortedatum', ADDRESS: 'adres', POSTCODE: 'postcode',
    IP: 'IP-adres', WALLET: 'cryptowallet', SECRET: 'wachtwoord of sleutel', CONFIDENTIAL: 'eigen term', COMPANY: 'bedrijf',
    PERSOON: 'persoon', TELEFOON: 'telefoon', CREDITCARD: 'betaalkaart', BSN: 'BSN', ADRES: 'adres',
    VERTROUWELIJK: 'eigen term',
  };

  // Lengtes van IBAN's per land (SWIFT IBAN-register).
  const IBAN_LEN = {
    AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27, BR: 29, BY: 28,
    CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DJ: 27, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18,
    FK: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28,
    IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20,
    LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20, MR: 27, MT: 31, MU: 30, NI: 28,
    NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29, QA: 29, RO: 24, RU: 33, SA: 24, SC: 31, SD: 18,
    SE: 24, SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22,
    VG: 24, XK: 20, YE: 30,
  };
  const COUNTRIES = new Set([...Object.keys(IBAN_LEN), 'US', 'CA', 'AU', 'NZ', 'JP', 'CN', 'HK', 'SG', 'IN', 'KR', 'MX', 'ZA', 'AR', 'CL', 'CO', 'PE', 'ID', 'MY', 'TH', 'PH', 'VN', 'NG', 'KE', 'MA']);

  const PLACEHOLDER_RE = /\[([A-Z]+)_(\d+)\]/g;

  // Trefwoorden in veel talen die aangeven dat er een identiteitsnummer, bankgegeven, geboortedatum of
  // wachtwoord volgt. De gegevens zelf (IBAN, kaartnummers, ID's met controlegetal, e-mail, telefoon) zijn
  // taalonafhankelijk; deze woorden vangen de rest op, ook in schriften zonder spaties (Chinees, Japans).
  const ID_WORDS = [
    // en / nl / de / fr / es / pt / it
    'passport(?: no| number)?', 'paspoort(?:nummer)?', 'reisepass(?:nummer)?', 'passnummer', 'passeport', 'pasaporte', 'passaporto', 'passaporte',
    'id card', 'identity card', 'identiteitskaart', 'id-kaart', 'personalausweis(?:nummer)?', 'ausweisnummer', "carte d'identité",
    'documento de identidad', "carta d'identità", 'cédula', 'cedula', 'número de identidade', 'rg',
    "driver'?s licen[cs]e", 'driving licen[cs]e', 'rijbewijs', 'führerschein', 'permis de conduire', 'patente',
    'licen[cs]e (?:no|number)', 'document (?:no|number)', 'documentnummer',
    'ssn', 'social security(?: number)?', 'national insurance(?: number)?', 'nino', 'national id', 'tax id', 'tin', 'itin', 'ein',
    'bsn', 'burgerservicenummer', 'rijksregisternummer', 'steuer-?id', 'steuernummer', 'steueridentifikationsnummer',
    'sozialversicherungsnummer', 'numéro de sécurité sociale', 'sécurité sociale', 'número de seguridad social',
    'nif', 'nie', 'dni', 'nir', 'codice fiscale', 'cpf', 'medicare', 'nhs number', 'patient id', 'sin',
    // nordisch / oost-europees / overig Latijns schrift
    'personnummer', 'fødselsnummer', 'cpr(?:-nummer)?', 'henkilötunnus', 'passi', 'pesel', 'dowód osobisty', 'paszport',
    'rodné číslo', 'občanský průkaz', 'tc kimlik(?: no)?', 'kimlik numarası', 'pasaport', 'aadhaar', 'pan',
    // niet-Latijnse schriften
    'паспорт', 'снилс', 'инн', 'номер паспорта', 'διαβατήριο', 'αφμ', 'דרכון', 'תעודת זהות', 'جواز السفر', 'رقم الهوية',
    'पासपोर्ट', 'आधार', '护照', '護照', '身份证号?', '身分證', '旅券', 'パスポート', 'マイナンバー', '여권', '주민등록번호',
  ];
  const BANK_WORDS = [
    'account', 'acct', 'a/c', 'bank account', 'rekening(?:nummer)?', 'bankrekening', 'konto(?:nummer)?', 'bankverbindung', 'blz',
    'compte', 'rib', 'cuenta', 'clabe', 'cbu', 'conta', 'agência', 'conto', 'numer rachunku', 'rachunek', 'hesap(?: no)?',
    'clearingnummer', 'bankgiro', 'kontonummer', 'routing', 'aba', 'rtn', 'sort code', 'bsb', 'ifsc', 'bic', 'swift',
    'счёт', 'счет', 'бик', 'λογαριασμός', 'رقم الحساب', 'खाता', '银行账户', '銀行帳戶', '账号', '帳號', '卡号', '口座(?:番号)?', '계좌(?:번호)?',
  ];
  const DOB_WORDS = [
    'born', 'date of birth', 'dob', 'd\\.o\\.b\\.?', 'birthday', 'birth date', 'geboren(?: am| op)?', 'geb\\.', 'geboortedatum',
    'geburtsdatum', 'né(?:e)? le', 'date de naissance', 'fecha de nacimiento', 'nacid[oa] el', 'data de nascimento',
    'nascid[oa] em', 'data di nascita', 'nat[oa] il', 'data urodzenia', 'urodzon[ya]', 'doğum tarihi', 'född', 'født',
    'syntymäaika', 'syntynyt', 'datum narození', 'дата рождения', 'родил(?:ся|ась)', 'ημερομηνία γέννησης',
    'تاريخ الميلاد', 'जन्म तिथि', '出生日期', '生日', '生年月日', '생년월일',
  ];
  const SECRET_WORDS = [
    'password', 'passwd', 'pwd', 'passcode', 'wachtwoord', 'passwort', 'kennwort', 'mot de passe', 'contraseña', 'senha',
    'hasło', 'şifre', 'lösenord', 'adgangskode', 'passord', 'salasana', 'heslo', 'jelszó', 'parola', 'пароль', 'κωδικός',
    'סיסמה', 'كلمة المرور', 'पासवर्ड', '密码', '密碼', 'パスワード', '비밀번호', 'pin(?:code)?', 'api[ _-]?key', 'secret', 'token',
  ];

  // Bouwt een trefwoordpatroon: woorden in gespatieerde schriften moeten los staan; Chinees, Japans en
  // Koreaans hebben geen spaties en mogen direct aan andere tekens vastzitten.
  const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  function keyword(list) {
    const spaced = list.filter(w => !CJK.test(w)), dense = list.filter(w => CJK.test(w));
    return `(?:(?<![\\p{L}\\p{N}])(?:${spaced.join('|')})(?![\\p{L}])${dense.length ? `|(?:${dense.join('|')})` : ''})`;
  }
  // Wat er tussen trefwoord en waarde mag staan: "number", "nr.", ":", "is", "ist", "是", "は", …
  const LINK_WORD = '(?:is|ist|est|es|è|é|er|är|jest|je|on|это)';
  const FILLER = `(?:\\.?\\s*(?:no\\.?|nr\\.?|number|nummer|numéro|número|numero|numer|номер|#|号码|號碼|番号|번호))?\\s*(?:[:：#=]|(?<![\\p{L}])${LINK_WORD}(?![\\p{L}])|是|为|為|は|은|는|이)?\\s*`;
  // Waarde: begint met hoogstens 3 letters en dan een cijfer, eindigt nooit op een leesteken.
  const TOKEN = '([A-Z]{0,3}\\d(?:[A-Z0-9.-]*[A-Z0-9])?(?:\\s\\d(?:[A-Z0-9.-]*[A-Z0-9])?)*)';

  const MONTHS = [
    'jan(?:uary|uari|uar)?', 'janvier', 'enero', 'gennaio', 'janeiro', 'feb(?:ruary|ruari|ruar)?', 'février', 'febrero',
    'febbraio', 'fevereiro', 'mar(?:ch)?', 'maart', 'märz', 'mars', 'marzo', 'março', 'apr(?:il|ile)?', 'avril', 'abril',
    'may', 'mei', 'mai', 'mayo', 'maggio', 'maio', 'jun[ei]?', 'juni', 'juin', 'junio', 'giugno', 'junho', 'jul[iy]?',
    'juli', 'juillet', 'julio', 'luglio', 'julho', 'aug(?:ust|ustus)?', 'août', 'agosto', 'sep(?:t(?:ember)?)?',
    'septembre', 'septiembre', 'settembre', 'setembro', 'o[ck]t(?:ober)?', 'octobre', 'octubre', 'ottobre', 'outubro',
    'nov(?:ember)?', 'novembre', 'noviembre', 'novembro', 'dec(?:ember)?', 'dez(?:ember)?', 'décembre', 'diciembre',
    'dicembre', 'dezembro',
  ].join('|');
  const DATE = [
    '\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}', '\\d{4}-\\d{2}-\\d{2}',
    `\\d{1,2}\\.? (?:de )?(?:${MONTHS})\\.?,? (?:de )?\\d{4}`, `(?:${MONTHS})\\.? \\d{1,2},? \\d{4}`,
    '\\d{4}\\s?年\\s?\\d{1,2}\\s?月\\s?\\d{1,2}\\s?日', '\\d{4}년\\s?\\d{1,2}월\\s?\\d{1,2}일',
  ].map(d => `(?:${d})`).join('|');

  const RE = {
    email: /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/giu,
    ibanStart: /(?<![A-Za-z0-9])([A-Za-z]{2})\d{2}/g,
    phone: /(?<![\w+(])(?:\+\d|\(?0)[\d \-().]{7,18}\d(?!\d)/g,
    phoneNanp: /(?<![\w+-])(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\d-])/g,
    card: /(?<![\dA-Za-z])(?:\d[ -]?){12,18}\d(?![\dA-Za-z])/g,
    nineDigits: /(?<![\d.-])(?:\d{9}|\d{3}[. ]\d{3}[. ]\d{3}|\d{4}[. ]\d{2}[. ]\d{3})(?![\d])/g,
    ssn: /(?<![\d-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\d-])/g,
    nino: /\b(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/g,
    beNational: /(?<![\d.])\d{2}\.?\d{2}\.?\d{2}-?\d{3}\.?\d{2}(?![\d.])/g,
    esDni: /\b(\d{8}|[XYZ]\d{7})-?([A-Z])\b/g,
    itFiscal: /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/g,
    frNir: /(?<!\d)[12] ?\d{2} ?(?:0[1-9]|1[0-2]|[2-9]\d) ?(?:\d{2}|2A|2B) ?\d{3} ?\d{3} ?\d{2}(?!\d)/g,
    aadhaar: /(?<!\d)[2-9]\d{3} \d{4} \d{4}(?!\d)/g,
    inPan: /\b[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]\b/g,
    brCpf: /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g,
    cnId: /(?<!\d)\d{17}[\dX](?!\d)/g,
    idByWord: new RegExp(`${keyword(ID_WORDS)}${FILLER}${TOKEN}`, 'giu'),
    bankByWord: new RegExp(`${keyword(BANK_WORDS)}(?:\\s*code)?${FILLER}${TOKEN}`, 'giu'),
    bic: /\b[A-Z]{4}([A-Z]{2})[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
    ifsc: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    cvv: /\b(?:cvv2?|cvc2?|security code|beveiligingscode)\s*[:#]?\s*(\d{3,4})\b/gi,
    dob: new RegExp(`${keyword(DOB_WORDS)}\\s*(?:on|op|am|le|el|il|em|den|der)?\\s*[:：,]?\\s*(${DATE})`, 'giu'),
    ipv4: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])/g,
    eth: /\b0x[a-fA-F0-9]{40}\b/g,
    btc: /\b(?:bc1[a-z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
    apiKey: /(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|glpat-[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g,
    privateKey: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    secretByWord: new RegExp(`${keyword(SECRET_WORDS)}\\s*([:：=]|${LINK_WORD}(?![\\p{L}])|是|为|為|は|은|는)\\s*["'「]?([^\\s"',;」]{3,})`, 'giu'),
    postcodeNl: /\b[1-9]\d{3} ?(?!SA|SD|SS)[A-Z]{2}\b/g,
    postcodeUk: /\b(?:GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})\b/g,
    postcodeCa: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d\b/g,
    usStateZip: /\b(?:A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY]) \d{5}(?:-\d{4})?\b/g,
    addressNl: new RegExp(
      "(?<!\\p{L})\\p{Lu}[\\p{L}'-]*(?:straat|straße|strasse|weg|laan|plein|platz|gracht|kade|dijk|singel|pad|steeg|gasse|hof|dreef|markt|park|baan|wal|veld|ring|allee|plantsoen|boulevard|burgwal|haven)" +
      '[ \\t]+\\d{1,5}(?:[ \\t]?[a-zA-Z](?!\\p{L}))?(?:-\\d{1,4})?', 'gu'),
    addressEn: /\b\d{1,5}[A-Za-z]?(?: [A-Z][a-z]+){1,3} (?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Close|Crescent|Square|Sq)\b\.?/g,
    addressFr: /\b\d{1,4}(?: ?(?:bis|ter))?,? (?:rue|avenue|boulevard|place|chemin|allée|impasse|quai) (?:de |du |des |la |le |l')*(?:[\p{Lu}][\p{L}'-]+ ?){1,4}/gu,
    addressEs: /\b(?:Calle|Avenida|Av\.|Paseo|Plaza|Carrer|Via|Viale|Piazza|Corso|Rua) (?:(?:de |del |la |da |do |di )?[\p{Lu}][\p{L}'-]+ ?){1,4},? \d{1,4}\b/gu,
    title: new RegExp(`(?<!\\p{L})(?:${TITLES.map(t => `[${t[0].toUpperCase()}${t[0]}]${t.slice(1)}`).join('|')})[ \\t]+((?:\\p{Lu}\\.[ \\t]?){0,4}(?:${TUSSEN}[ \\t]+)*${NAMEWORD}(?:[ \\t]+${NAMEWORD})?)`, 'gu'),
    initials: new RegExp(`(?<![\\p{L}.])(?:\\p{Lu}\\.[ \\t]?){1,4}(?:${TUSSEN}[ \\t]+)*${NAMEWORD}`, 'gu'),
    nameToken: new RegExp(`(?<![\\p{L}\\d])${NAMEWORD}`, 'gu'),
    nameTail: new RegExp(`^[ \\t]+((?:${TUSSEN}[ \\t]+)*)(${NAMEWORD})`, 'u'),
    // Bedrijfsnaam: 1 tot 4 woorden met een hoofdletter (of cijfer), gevolgd door een rechtsvorm.
    company: /(?<![\p{L}\d])((?:[\p{Lu}\d][\p{L}\d&'.-]*[ \t]+(?:&[ \t]+)?){1,4})(Inc\.?|Incorporated|Ltd\.?|Limited|LLC|L\.L\.C\.|LLP|PLC|Corp\.?|Corporation|GmbH|AG|KG|B\.V\.|BV|N\.V\.|NV|V\.O\.F\.|VOF|S\.A\.|SAS|SARL|S\.r\.l\.|Srl|S\.p\.A\.|SpA|Pty\.? Ltd\.?|Oy|A\/S|ApS|& Co\.)(?![\p{L}\d])/gu,
    word: /\p{L}[\p{L}'-]*/gu,
  };

  // ---------- Controlegetallen ----------

  const digits = s => s.replace(/\D/g, '');
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lastWord = s => s.split(/[ \t.]+/).filter(Boolean).pop() || '';

  function luhn(d) {
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  // Nederlands BSN.
  function elfproef(d) {
    if (!/^\d{9}$/.test(d) || /^0+$/.test(d)) return false;
    let s = 0;
    for (let i = 0; i < 8; i++) s += +d[i] * (9 - i);
    return (s - +d[8]) % 11 === 0;
  }

  function mod97(numeric) {
    let rem = 0;
    for (const c of numeric) rem = (rem * 10 + +c) % 97;
    return rem;
  }

  function ibanValid(iban) {
    const r = iban.slice(4) + iban.slice(0, 4);
    return mod97(r.replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55))) === 1;
  }

  // Amerikaans ABA-routingnummer.
  function abaValid(d) {
    if (!/^\d{9}$/.test(d)) return false;
    const n = [...d].map(Number);
    return (3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8])) % 10 === 0;
  }

  // Belgisch rijksregisternummer (ook voor geboortes vanaf 2000).
  function beValid(d) {
    if (d.length !== 11) return false;
    const body = d.slice(0, 9), check = +d.slice(9);
    return 97 - mod97(body) === check || 97 - mod97('2' + body) === check;
  }

  function esDniValid(num, letter) {
    const n = +num.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
    return 'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23] === letter;
  }

  function frNirValid(raw) {
    const s = raw.replace(/ /g, '');
    if (s.length !== 15) return false;
    const body = s.slice(0, 13).replace('2A', '19').replace('2B', '18');
    return 97 - mod97(body) === +s.slice(13);
  }

  const VERHOEFF_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VERHOEFF_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  // Indiaas Aadhaar-nummer.
  function verhoeff(d) {
    let c = 0;
    [...d].reverse().forEach((ch, i) => { c = VERHOEFF_D[c][VERHOEFF_P[i % 8][+ch]]; });
    return c === 0;
  }

  // Braziliaans CPF.
  function cpfValid(d) {
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const check = len => {
      let s = 0;
      for (let i = 0; i < len; i++) s += +d[i] * (len + 1 - i);
      const r = (s * 10) % 11;
      return (r === 10 ? 0 : r) === +d[len];
    };
    return check(9) && check(10);
  }

  // Chinees identiteitsnummer (ISO 7064 MOD 11-2).
  function cnIdValid(s) {
    const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const sum = w.reduce((acc, wi, i) => acc + wi * +s[i], 0);
    return '10X98765432'[sum % 11] === s[17];
  }

  // ---------- Detectie ----------

  function each(re, text, fn) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      fn(m);
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  // Positie van capture-groep `g` (of van de hele match).
  function span(m, g) {
    if (g === undefined || m[g] === undefined) return [m.index, m.index + m[0].length];
    const start = m.index + m[0].lastIndexOf(m[g]);
    return [start, start + m[g].length];
  }

  // Wijst de tekst vóór positie `at` erop dat het woord `w` een naam is?
  // Gewone woorden (Will, May, mark) alleen bij een sterke aanwijzing; andere namen ook na een voorzetsel.
  function nameContext(text, at, w) {
    const before = text.slice(Math.max(0, at - 40), at);
    if (STRONG_CUE.test(before)) return true;
    return !WORD_NAMES.has(w.toLowerCase()) && WEAK_CUE.test(before);
  }

  // Index van de kluis voor het geheugen: volledige waarden (personen, bedrijven, eigen termen) en losse
  // voor- en achternamen van personen. Een los naamdeel dat bij twee personen hoort, is dubbelzinnig en telt niet.
  // Alleen gegevens van de huidige site tellen mee (zie inScope).
  const memoryCache = new WeakMap();
  function memoryIndex(vault, opts = {}) {
    const sig = `${Object.keys(vault.byPlaceholder || {}).length}|${Object.keys(vault.sites || {}).length}`;
    const scopeKey = `${opts.scope || ''}|${opts.legacy ? 1 : 0}`;
    let perScope = memoryCache.get(vault);
    if (!perScope) memoryCache.set(vault, perScope = new Map());
    const hit = perScope.get(scopeKey);
    if (hit && hit.sig === sig) return hit;
    const full = new Map(), parts = new Map();
    for (const [ph, value] of Object.entries(vault.byPlaceholder || {})) {
      if (!inScope(vault, ph, opts)) continue;
      const type = ph.slice(1, ph.lastIndexOf('_'));
      if (!['PERSON', 'PERSOON', 'COMPANY', 'CONFIDENTIAL'].includes(type)) continue;
      const v = String(value).replace(/\s+/g, ' ').trim();
      if (v.length >= 3) full.set(v.toLowerCase(), { ph, type: type === 'PERSOON' ? 'PERSON' : type, value: v });
      if (type !== 'PERSON' && type !== 'PERSOON') continue;
      for (const part of v.split(/[ \t.]+/)) {
        const p = part.toLowerCase();
        if (p.length < 3 || (STOP.has(p) && !WORD_NAMES.has(p)) || new RegExp(`^${TUSSEN}$`, 'i').test(p) || !/^\p{L}[\p{L}'-]*$/u.test(part)) continue;
        parts.set(p, parts.has(p) && parts.get(p) !== ph ? null : ph);
      }
    }
    const index = { sig, full, parts };
    perScope.set(scopeKey, index);
    return index;
  }

  // Treffers uit het geheugen. Volledige waarden altijd (in elke schrijfwijze); losse naamdelen alleen als ze er
  // als naam uitzien: met een hoofdletter (en geen gewoon woord), of met een aanwijzing ervoor.
  function remembered(text, vault, opts) {
    const { full, parts } = memoryIndex(vault, opts);
    const out = [];
    const lower = text.toLowerCase();
    for (const [key, { ph, type }] of full) {
      let i = lower.indexOf(key);
      while (i !== -1) {
        const end = i + key.length;
        if (!/[\p{L}\d]/u.test(text[i - 1] || '') && !/[\p{L}\d]/u.test(text[end] || '')) {
          out.push({ type, start: i, end, priority: PRIORITY[type] + 2, value: text.slice(i, end), placeholder: ph, remembered: true });
        }
        i = lower.indexOf(key, i + 1);
      }
    }
    each(RE.word, text, m => {
      const w = m[0], p = w.toLowerCase(), ph = parts.get(p);
      if (!ph) return;
      const capital = w[0] !== w[0].toLowerCase();
      // Gewone woorden (Will, May, Mark) alleen met een sterke aanwijzing; andere naamdelen met een hoofdletter
      // altijd, en in kleine letters na een aanwijzing ("to sarah").
      const ok = WORD_NAMES.has(p) ? STRONG_CUE.test(text.slice(Math.max(0, m.index - 40), m.index))
        : capital || nameContext(text, m.index, w);
      if (ok) out.push({ type: 'PERSON', start: m.index, end: m.index + w.length, priority: PRIORITY.PERSON - 1, value: w, placeholder: ph, remembered: true });
    });
    return out;
  }

  function detect(text, opts = {}) {
    const found = [];
    const add = (type, [start, end], priority = PRIORITY[type]) => {
      if (end > start) found.push({ type, start, end, priority, value: text.slice(start, end) });
    };
    const addIf = (type, re, test = () => true, g, priority) =>
      each(re, text, m => { if (test(m)) add(type, span(m, g), priority); });
    // Staat er een trefwoord voor ("ID-nummer: …", "account …"), dan wint dat van een kaartnummer-gok.
    const BY_KEYWORD = 82;

    for (const raw of opts.customTerms || []) {
      const term = raw.trim();
      if (term.length < 2) continue;
      addIf('CONFIDENTIAL', new RegExp(`(?<![\\p{L}\\d])${escapeRe(term)}(?![\\p{L}\\d])`, 'giu'));
    }

    // Wachtwoorden en sleutels
    addIf('SECRET', RE.privateKey);
    addIf('SECRET', RE.apiKey);
    // Na een los woord als "is" alleen als de waarde een cijfer bevat ("the token is valid" is geen wachtwoord).
    addIf('SECRET', RE.secretByWord, m => !/^\[[A-Z]+_\d+\]$/.test(m[2]) && (/^[:：=]$/.test(m[1]) || /\d/.test(m[2])), 2);

    addIf('EMAIL', RE.email);

    // Bankgegevens
    each(RE.ibanStart, text, m => {
      const len = IBAN_LEN[m[1].toUpperCase()];
      if (!len) return;
      let j = m.index, chars = '', lastSpace = false;
      while (j < text.length && chars.length < len) {
        const c = text[j];
        if (/[A-Za-z0-9]/.test(c)) { chars += c.toUpperCase(); lastSpace = false; }
        else if (c === ' ' && !lastSpace) lastSpace = true;
        else break;
        j++;
      }
      if (chars.length !== len || (j < text.length && /[A-Za-z0-9]/.test(text[j]))) return;
      if (ibanValid(chars)) add('IBAN', [m.index, j]);
    });
    addIf('BANK', RE.bankByWord, m => m[1].replace(/\W/g, '').length >= 5, 1, BY_KEYWORD);
    addIf('BANK', RE.nineDigits, m => abaValid(digits(m[0])) && /\b(?:routing|aba|rtn)\b/i.test(text.slice(Math.max(0, m.index - 30), m.index)));
    addIf('BANK', RE.bic, m => COUNTRIES.has(m[1]) && (/\d/.test(m[0].slice(6, 8)) || /\b(?:bic|swift)\b/i.test(text.slice(Math.max(0, m.index - 20), m.index))));
    addIf('BANK', RE.ifsc);

    // Betaalkaarten
    addIf('CARD', RE.card, m => { const d = digits(m[0]); return d.length >= 13 && d.length <= 19 && luhn(d); });
    addIf('CARD', RE.cvv, () => true, 1);

    // Identiteitsnummers
    addIf('ID', RE.nineDigits, m => elfproef(digits(m[0])));
    addIf('ID', RE.ssn);
    addIf('ID', RE.nino);
    addIf('ID', RE.beNational, m => beValid(digits(m[0])));
    addIf('ID', RE.esDni, m => esDniValid(m[1], m[2]));
    addIf('ID', RE.itFiscal);
    addIf('ID', RE.frNir, m => frNirValid(m[0]));
    addIf('ID', RE.aadhaar, m => verhoeff(digits(m[0])));
    addIf('ID', RE.inPan);
    addIf('ID', RE.brCpf, m => cpfValid(digits(m[0])));
    addIf('ID', RE.cnId, m => cnIdValid(m[0]));
    addIf('ID', RE.idByWord, m => m[1].replace(/\W/g, '').length >= 5, 1, BY_KEYWORD);

    // Crypto, IP, geboortedatum
    addIf('WALLET', RE.eth);
    addIf('WALLET', RE.btc, m => /\d/.test(m[0]) && /[a-zA-Z]/.test(m[0]));
    addIf('IP', RE.ipv4);
    addIf('BIRTHDATE', RE.dob, () => true, 1);

    // Telefoon
    each(RE.phone, text, m => {
      const s = m[0], d = digits(s);
      let ok;
      if (s.startsWith('+')) ok = d.startsWith('31') ? d.length === 11 : d.length >= 9 && d.length <= 15;
      else if (d.startsWith('0031')) ok = d.length === 13;
      else if (d.startsWith('00')) ok = d.length >= 11 && d.length <= 17;
      else ok = d.length === 10;
      if (ok) add('PHONE', span(m));
    });
    addIf('PHONE', RE.phoneNanp);

    // Adressen en postcodes
    for (const re of [RE.addressNl, RE.addressEn, RE.addressFr, RE.addressEs]) addIf('ADDRESS', re);
    for (const re of [RE.postcodeNl, RE.postcodeUk, RE.postcodeCa, RE.usStateZip]) addIf('POSTCODE', re);

    // Namen
    each(RE.title, text, m => {
      if (STOP.has(lastWord(m[1]).toLowerCase())) return;
      add('PERSON', span(m, 1));
    });
    each(RE.initials, text, m => {
      if (STOP.has(lastWord(m[0]).toLowerCase())) return;
      add('PERSON', span(m));
    });
    each(RE.nameToken, text, m => {
      const word = m[0].toLowerCase();
      if (!FIRST_NAMES.has(word) && !FIRST_NAMES.has(word.split('-')[0])) return;
      // "1 Jan 2025" is een datum en "San Francisco" een plaats, geen persoon.
      const before = text.slice(Math.max(0, m.index - 8), m.index);
      if (/\d[ \t]*$/.test(before) || /\b(?:San|Santa|Santo|São|St\.?|Saint|Sainte|Sankt)[ \t]+$/.test(before)) return;
      // Voornaam + maximaal twee volgende naamwoorden (tweede voornaam en/of achternaam).
      let end = m.index + m[0].length;
      for (let k = 0; k < 2; k++) {
        const tail = RE.nameTail.exec(text.slice(end, end + 80));
        if (!tail || STOP.has(tail[2].toLowerCase())) break;
        end += tail[0].length;
      }
      add('PERSON', [m.index, end]);
    });

    // Bedrijven: naam + rechtsvorm ("Acme Inc.", "Jansen BV", "Müller GmbH"). Lidwoorden vooraan horen er niet bij.
    each(RE.company, text, m => {
      let lead = m[1];
      const words = lead.split(/[ \t]+/).filter(Boolean);
      let skip = 0;
      while (skip < words.length && STOP.has(words[skip].toLowerCase())) skip++;
      if (skip === words.length) return;
      for (let k = 0; k < skip; k++) lead = lead.slice(lead.indexOf(words[k]) + words[k].length).replace(/^[ \t]+/, '');
      const start = m.index + m[0].indexOf(lead);
      add('COMPANY', [start, m.index + m[0].length]);
    });

    // Voornamen in kleine letters ("to sarah", "dear mark"), alleen met een aanwijzing ervoor.
    each(RE.word, text, m => {
      const w = m[0];
      if (w.length < 3 || w !== w.toLowerCase() || !FIRST_NAMES.has(w) || STOP.has(w)) return;
      if (nameContext(text, m.index, w)) add('PERSON', [m.index, m.index + w.length]);
    });

    // Geheugen: wat eerder is afgeschermd, wordt ook in andere schrijfwijzen herkend.
    if (opts.vault) found.push(...remembered(text, opts.vault, opts));

    const allow = new Set((opts.allowList || []).map(s => s.trim().toLowerCase()).filter(Boolean));
    const existing = [];
    each(PLACEHOLDER_RE, text, m => existing.push([m.index, m.index + m[0].length]));

    const candidates = found.filter(d =>
      !allow.has(d.value.toLowerCase()) &&
      !existing.some(([s, e]) => d.start < e && d.end > s)
    );
    candidates.sort((a, b) =>
      b.priority - a.priority || (b.end - b.start) - (a.end - a.start) || a.start - b.start);

    const picked = [];
    for (const d of candidates) {
      if (!picked.some(p => d.start < p.end && d.end > p.start)) picked.push(d);
    }
    return picked.sort((a, b) => a.start - b.start);
  }

  // ---------- Kluis ----------

  function emptyVault() {
    return { byKey: {}, byPlaceholder: {}, counters: {}, lastUsed: {}, sites: {} };
  }

  // Kluis per site: elk gegeven onthoudt op welke site het is afgeschermd (vault.sites[placeholder]).
  // Terugzetten, hergebruiken en het geheugen werken alleen op diezelfde site (opts.scope), zodat een
  // andere website de kluis niet kan uitlezen door zelf placeholders aan te bieden. Gegevens van vóór
  // deze indeling hebben geen site; die gelden alleen waar opts.legacy is gezet (bekende AI-sites).
  // Zonder opts.scope (popup, kluisvenster, tests) telt alles. Een leeg bereik ('') telt nergens: zo kan een
  // venster zonder adres nooit de hele kluis terugzetten.
  function inScope(vault, ph, opts = {}) {
    if (opts.scope === undefined) return true;
    if (!opts.scope) return false;
    const site = vault.sites?.[ph];
    return site === undefined ? !!opts.legacy : site === opts.scope;
  }

  const DAY = 24 * 60 * 60 * 1000;

  // Wist koppelingen die `days` dagen niet zijn gebruikt. Tellers blijven staan, zodat een
  // placeholder nooit opnieuw wordt uitgedeeld aan een ander gegeven. Geeft het aantal gewiste terug.
  function prune(vault, days, now = Date.now()) {
    vault.lastUsed = vault.lastUsed || {};
    if (!days) return 0;
    let removed = 0;
    for (const ph of Object.keys(vault.byPlaceholder)) {
      const used = vault.lastUsed[ph] ?? (vault.lastUsed[ph] = now);
      if (now - used < days * DAY) continue;
      delete vault.byPlaceholder[ph];
      delete vault.lastUsed[ph];
      if (vault.sites) delete vault.sites[ph];
      removed++;
    }
    if (removed) {
      for (const [key, ph] of Object.entries(vault.byKey)) {
        if (!(ph in vault.byPlaceholder)) delete vault.byKey[key];
      }
    }
    return removed;
  }

  function keyFor(type, value, scope) {
    const v = ['IBAN', 'PHONE', 'ID', 'CARD', 'BANK'].includes(type)
      ? value.replace(/[^A-Za-z0-9+]/g, '').toUpperCase()
      : value.replace(/\s+/g, ' ').trim().toLowerCase();
    return scope ? `${scope}|${type}|${v}` : `${type}|${v}`;
  }

  // Vervangt gevonden gegevens door placeholders. Dezelfde waarde krijgt altijd dezelfde
  // placeholder, zodat de AI het verband tussen berichten behoudt. Muteert `vault`.
  function mask(text, vault, opts = {}) {
    const dets = detect(text, { ...opts, vault });
    if (!dets.length) return { text, items: [] };
    let out = '', last = 0;
    const items = [];
    for (const d of dets) {
      const key = keyFor(d.type, d.value, opts.scope);
      let ph = d.placeholder && d.placeholder in vault.byPlaceholder && inScope(vault, d.placeholder, opts)
        ? d.placeholder : vault.byKey[key];
      // Een gegeven van vóór de kluis per site: alleen hergebruiken waar dat mag (opts.legacy).
      if (!ph && opts.scope && opts.legacy) ph = vault.byKey[keyFor(d.type, d.value)];
      if (ph && !(ph in vault.byPlaceholder && inScope(vault, ph, opts))) ph = undefined;
      let fromMemory = !!d.remembered;
      // Een naam die al in de kluis staat (ook als los voor- of achternaam) krijgt dezelfde placeholder.
      if (!ph && (d.type === 'PERSON' || d.type === 'COMPANY')) {
        const idx = memoryIndex(vault, opts), lower = d.value.replace(/\s+/g, ' ').trim().toLowerCase();
        ph = idx.full.get(lower)?.ph || (d.type === 'PERSON' && !/\s/.test(lower) ? idx.parts.get(lower) : null) || undefined;
        if (ph) fromMemory = true;
      }
      if (!ph) {
        const n = (vault.counters[d.type] || 0) + 1;
        vault.counters[d.type] = n;
        ph = `[${d.type}_${n}]`;
        vault.byKey[key] = ph;
        vault.byPlaceholder[ph] = d.value;
      }
      if (opts.scope) {
        vault.sites = vault.sites || {};
        if (vault.sites[ph] === undefined) vault.sites[ph] = opts.scope; // nieuw, of een oud gegeven dat hier wordt gebruikt
        vault.byKey[key] = ph;
      }
      (vault.lastUsed = vault.lastUsed || {})[ph] = Date.now();
      out += text.slice(last, d.start);
      items.push({ type: d.type, value: d.value, placeholder: ph, at: out.length, remembered: fromMemory });
      out += ph;
      last = d.end;
    }
    limit(vault, MAX_ENTRIES, new Set(items.map(it => it.placeholder)));
    return { text: out + text.slice(last), items };
  }

  // Chrome geeft een extensie 10 MB opslag; één gegeven kost ~150 bytes (versleuteld meer). Daarom een vaste
  // grens: daarboven verdwijnen de langst niet gebruikte gegevens eerst. Tellers blijven staan, zodat een
  // placeholder nooit opnieuw wordt uitgedeeld. Geeft het aantal gewiste gegevens terug.
  const MAX_ENTRIES = 10000;
  function limit(vault, max = MAX_ENTRIES, keep = new Set()) {
    const phs = Object.keys(vault.byPlaceholder);
    if (phs.length <= max) return 0;
    vault.lastUsed = vault.lastUsed || {};
    const old = phs.filter(ph => !keep.has(ph)).sort((a, b) => (vault.lastUsed[a] || 0) - (vault.lastUsed[b] || 0));
    const drop = new Set(old.slice(0, phs.length - max));
    for (const ph of drop) { delete vault.byPlaceholder[ph]; delete vault.lastUsed[ph]; if (vault.sites) delete vault.sites[ph]; }
    for (const [key, ph] of Object.entries(vault.byKey)) if (drop.has(ph)) delete vault.byKey[key];
    return drop.size;
  }

  function restore(text, vault, opts = {}) {
    return text.replace(PLACEHOLDER_RE, m => (inScope(vault, m, opts) ? vault.byPlaceholder[m] ?? m : m));
  }

  function hasPlaceholder(text) {
    PLACEHOLDER_RE.lastIndex = 0;
    return PLACEHOLDER_RE.test(text);
  }

  const api = {
    detect, mask, restore, prune, limit, hasPlaceholder, emptyVault, inScope, MAX_ENTRIES,
    LABELS, IBAN_COUNTRIES: Object.keys(IBAN_LEN).length,
    _internal: { elfproef, luhn, ibanValid, abaValid, verhoeff, cpfValid, cnIdValid, beValid, frNirValid },
  };
  root.PrivacyDetector = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
