// Draai met: node tests/detector.test.js
const assert = require('node:assert/strict');
const D = require('../src/detector.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}
const types = (text, opts) => D.detect(text, opts).map(d => `${d.type}:${d.value}`);
const has = (text, expected) => assert.deepEqual(types(text), expected);

console.log('Nederland');
test('e-mail', () => has('Mail naar info@bakkerij-jansen.example graag', ['EMAIL:info@bakkerij-jansen.example']));
test('IBAN met en zonder spaties', () => {
  has('Rekening NL91ABNA0417164300.', ['IBAN:NL91ABNA0417164300']);
  has('Rekening NL91 ABNA 0417 1643 00 en verder', ['IBAN:NL91 ABNA 0417 1643 00']);
});
test('ongeldige IBAN wordt genegeerd', () => has('NL91ABNA0417164301', []));
test('BSN met elfproef', () => {
  has('BSN 111222333', ['ID:111222333']);
  has('ordernummer 123456789', []);
});
test('telefoonnummers', () => {
  has('Bel 06-12345678 of', ['PHONE:06-12345678']);
  has('Bel +31 6 1234 5678.', ['PHONE:+31 6 1234 5678']);
  has('Tel: (020) 123 4567', ['PHONE:(020) 123 4567']);
});
test('adres en postcode', () => has('Woont op Hoofdstraat 12a, 1234 AB Utrecht', ['ADDRESS:Hoofdstraat 12a', 'POSTCODE:1234 AB']));
test('namen', () => {
  has('Gesprek met Jan de Vries over', ['PERSON:Jan de Vries']);
  has('Cliënt mevrouw Bakker kwam', ['PERSON:Bakker']);
  has('Dossier van dhr. P. van den Berg', ['PERSON:P. van den Berg']);
});
test('geboortedatum', () => has('Sanne (geb. 12-04-1988) belde', ['PERSON:Sanne', 'BIRTHDATE:12-04-1988']));
test('geen valse treffers', () => {
  has('op 1 Jan 2025', []);
  has('in 2024 en daarna', []);
  has('Ben je er morgen?', []);
});

console.log('Banken wereldwijd');
test(`IBAN-lengtes voor ${D.IBAN_COUNTRIES} landen`, () => assert.ok(D.IBAN_COUNTRIES >= 80));
test('IBAN uit het VK, België, Duitsland', () => {
  has('Pay GB82 WEST 1234 5698 7654 32 today', ['IBAN:GB82 WEST 1234 5698 7654 32']);
  has('BE68539007547034', ['IBAN:BE68539007547034']);
  has('DE89370400440532013000', ['IBAN:DE89370400440532013000']);
});
test('VS: routing- en rekeningnummer', () => has('routing 021000021, account 4567890123', ['BANK:021000021', 'BANK:4567890123']));
test('VK: sort code', () => has('sort code 12-34-56', ['BANK:12-34-56']));
test('BIC/SWIFT', () => {
  has('BIC DEUTDEFF', ['BANK:DEUTDEFF']);
  has('code ABNANL2A', ['BANK:ABNANL2A']);
  has('DOCUMENT', []);
});
test('India: IFSC', () => has('IFSC SBIN0001234', ['BANK:SBIN0001234']));
test('creditcard en CVV', () => {
  has('kaart 4111 1111 1111 1111, CVV 123', ['CARD:4111 1111 1111 1111', 'CARD:123']);
  has('kaart 4111 1111 1111 1112', []);
});

console.log('Identiteitsnummers wereldwijd');
test('VS: SSN', () => {
  has('SSN 123-45-6789', ['ID:123-45-6789']);
  has('Her SSN is 123-45-6789 and', ['ID:123-45-6789']);
});
test('VK: National Insurance', () => has('NI AB 12 34 56 C', ['ID:AB 12 34 56 C']));
test('België: rijksregisternummer', () => has('RRN 85.07.30-033.28', ['ID:85.07.30-033.28']));
test('Spanje: DNI', () => has('DNI 12345678Z', ['ID:12345678Z']));
test('Italië: codice fiscale', () => has('CF RSSMRA85T10A562S', ['ID:RSSMRA85T10A562S']));
test('Frankrijk: NIR', () => has('NIR 1 85 05 78 006 084 91', ['ID:1 85 05 78 006 084 91']));
test('India: Aadhaar en PAN', () => {
  has('Aadhaar 2345 6789 0124', ['ID:2345 6789 0124']);
  has('PAN ABCPE1234F', ['ID:ABCPE1234F']);
});
test('Brazilië: CPF', () => has('CPF 529.982.247-25', ['ID:529.982.247-25']));
test('China: identiteitsnummer', () => has('ID 11010519491231002X', ['ID:11010519491231002X']));
test('paspoort en rijbewijs via trefwoord', () => {
  has('passport number X1234567 and more', ['ID:X1234567']);
  has('Reisepass: C01X00T47', ['ID:C01X00T47']);
  has('rijbewijs 5123456789', ['ID:5123456789']);
});

console.log('Overig wereldwijd');
test('namen met aanhef', () => {
  has('Dear Mr. John Smith,', ['PERSON:John Smith']);
  has('Frau Müller ruft an', ['PERSON:Müller']);
});
test('Engelse, Franse en Spaanse adressen', () => {
  has('Lives at 221B Baker Street', ['ADDRESS:221B Baker Street']);
  has('Habite au 12 rue de la Paix', ['ADDRESS:12 rue de la Paix']);
  has('Vive en Calle Mayor 5', ['ADDRESS:Calle Mayor 5']);
});
test('postcodes VK, VS, Canada', () => {
  has('London SW1A 1AA', ['POSTCODE:SW1A 1AA']);
  has('San Francisco, CA 94105', ['POSTCODE:CA 94105']);
  has('Toronto M5V 3L9', ['POSTCODE:M5V 3L9']);
});
test('Amerikaans telefoonnummer', () => has('Call (415) 555-0132', ['PHONE:(415) 555-0132']));
test('geboortedatum in het Engels', () => has('She was born on 12 April 1988.', ['BIRTHDATE:12 April 1988']));
test('IP-adres en cryptowallet', () => {
  has('server 192.168.1.20 down', ['IP:192.168.1.20']);
  has('send to 0x52908400098527886E0F7030069857D2E4169EE7', ['WALLET:0x52908400098527886E0F7030069857D2E4169EE7']);
});
test('API-sleutels en wachtwoorden', () => {
  has('key sk-proj-abcdefghijklmnopqrstuvwxyz123456', ['SECRET:sk-proj-abcdefghijklmnopqrstuvwxyz123456']);
  has('password: Hunter2!', ['SECRET:Hunter2!']);
  has('the token is valid', []);
});

test('voorbeeld uit de launchvideo', () => has(
  'Write a payment reminder to Sarah Miller (sarah.miller@example.com). Her SSN is 123-45-6789 and she pays from IBAN GB82 WEST 1234 5698 7654 32.',
  ['PERSON:Sarah Miller', 'EMAIL:sarah.miller@example.com', 'ID:123-45-6789', 'IBAN:GB82 WEST 1234 5698 7654 32']));

test('voorbeelden uit de launchvideo: familie, adres, kind', () => {
  has('Write a birthday speech for my mom, Margaret Ellen Hughes, turning 70 this June.', ['PERSON:Margaret Ellen Hughes']);
  has('Email my landlord that the heating at 14 Elm Street, London SW1A 1AA is broken.', ['ADDRESS:14 Elm Street', 'POSTCODE:SW1A 1AA']);
  has('Draft a sick note for my son Daniel, born 14 March 2016.', ['PERSON:Daniel', 'BIRTHDATE:14 March 2016']);
});

console.log('Talen');
// Bevat de detectie in elk geval deze treffers? (Andere treffers mogen ook.)
const includes = (text, expected) => {
  const got = types(text);
  for (const e of expected) assert.ok(got.includes(e), `mist ${e} in ${JSON.stringify(got)}`);
};
test('Duits', () => includes('Meine Passnummer ist C01X00T47 und mein Konto DE89370400440532013000.', ['ID:C01X00T47', 'IBAN:DE89370400440532013000']));
test('Frans', () => includes('Je suis née le 12 avril 1988, numéro de sécurité sociale 1 85 05 78 006 084 91.', ['BIRTHDATE:12 avril 1988', 'ID:1 85 05 78 006 084 91']));
test('Spaans', () => includes('Mi DNI es 12345678Z y mi contraseña es Gato2024!', ['ID:12345678Z', 'SECRET:Gato2024!']));
test('Portugees', () => includes('Meu CPF é 529.982.247-25, data de nascimento: 12/04/1988', ['ID:529.982.247-25', 'BIRTHDATE:12/04/1988']));
test('Italiaans', () => includes('Il mio codice fiscale è RSSMRA85T10A562S, nata il 3 marzo 1990', ['ID:RSSMRA85T10A562S', 'BIRTHDATE:3 marzo 1990']));
test('Pools', () => includes('Mój PESEL: 44051401359, hasło: Kot2024', ['ID:44051401359', 'SECRET:Kot2024']));
test('Turks', () => includes('TC kimlik no: 10000000146', ['ID:10000000146']));
test('Zweeds', () => includes('Mitt personnummer är 811228-9874', ['ID:811228-9874']));
test('Russisch', () => includes('Иван Петров, паспорт 4510 123456, пароль: Qwerty123', ['PERSON:Иван Петров', 'ID:4510 123456', 'SECRET:Qwerty123']));
test('Grieks', () => includes('Η Μαρία Παπαδοπούλου, διαβατήριο AK1234567', ['PERSON:Μαρία Παπαδοπούλου', 'ID:AK1234567']));
test('Chinees', () => includes('我的护照号码是E12345678，银行账号6222020200112233445', ['ID:E12345678']));
test('Japans', () => includes('パスワードは Hana2024 です。生年月日：1990年4月12日', ['SECRET:Hana2024', 'BIRTHDATE:1990年4月12日']));
test('Koreaans', () => includes('제 여권번호는 M12345678 입니다', ['ID:M12345678']));
test('Arabisch', () => includes('رقم الهوية: 784-1987-1234567-1', ['ID:784-1987-1234567-1']));
test('Hindi', () => includes('मेरा आधार 2345 6789 0124 है', ['ID:2345 6789 0124']));
test('taalonafhankelijk: e-mail, telefoon, kaart in elke taal', () => includes('邮箱 li.wei@example.cn، هاتف +971 50 123 4567, карта 4111 1111 1111 1111',
  ['EMAIL:li.wei@example.cn', 'PHONE:+971 50 123 4567', 'CARD:4111 1111 1111 1111']));

console.log('Instellingen');
test('eigen termen en nooit-afschermen-lijst', () => {
  assert.deepEqual(types('Project Zonnebloem voor Acme BV', { customTerms: ['Acme BV', 'zonnebloem'] }),
    ['CONFIDENTIAL:Zonnebloem', 'CONFIDENTIAL:Acme BV']);
  assert.deepEqual(types('Groet, Lucas', { allowList: ['Lucas'] }), []);
});
test('bestaande placeholders worden niet opnieuw gemaskeerd', () => has('Beste [PERSON_1], bel [PHONE_2]', []));

console.log('Maskeren en herstellen');
test('maskeert en herstelt rondom', () => {
  const vault = D.emptyVault();
  const input = 'Jan de Vries (jan@devries.example, BSN 111222333) betaalt via NL91ABNA0417164300.';
  const { text, items } = D.mask(input, vault);
  assert.equal(text, '[PERSON_1] ([EMAIL_1], BSN [ID_1]) betaalt via [IBAN_1].');
  assert.equal(items.length, 4);
  assert.equal(D.restore(text, vault), input);
});
test('zelfde waarde → zelfde placeholder, ook in later bericht', () => {
  const vault = D.emptyVault();
  D.mask('Bel 0612345678', vault);
  assert.equal(D.mask('Nogmaals: 06 12 34 56 78 en Sanne', vault).text, 'Nogmaals: [PHONE_1] en [PERSON_1]');
});
test('oude Nederlandse placeholders worden nog steeds teruggezet', () => {
  const vault = { byKey: {}, byPlaceholder: { '[PERSOON_1]': 'Jan' }, counters: {}, lastUsed: {} };
  assert.equal(D.restore('Hoi [PERSOON_1]', vault), 'Hoi Jan');
});

console.log('Automatisch wissen');
const DAY = 24 * 60 * 60 * 1000;
test('prune wist alleen koppelingen die lang niet gebruikt zijn', () => {
  const vault = D.emptyVault();
  D.mask('Jan belt 0612345678', vault);
  vault.lastUsed['[PERSON_1]'] = Date.now() - 31 * DAY;
  assert.equal(D.prune(vault, 30), 1);
  assert.deepEqual(Object.keys(vault.byPlaceholder), ['[PHONE_1]']);
  assert.equal(D.mask('Sanne', vault).text, '[PERSON_2]');
});
test('opnieuw gebruiken houdt een koppeling vers', () => {
  const vault = D.emptyVault();
  D.mask('Jan', vault);
  vault.lastUsed['[PERSON_1]'] = Date.now() - 31 * DAY;
  D.mask('Nog een vraag over Jan', vault);
  assert.equal(D.prune(vault, 30), 0);
});
test('"nooit wissen" (0 dagen) wist niets', () => {
  const vault = D.emptyVault();
  D.mask('Jan', vault);
  vault.lastUsed['[PERSON_1]'] = 0;
  assert.equal(D.prune(vault, 0), 0);
});

console.log('Versie 1.1: geheugen, kleine letters, bedrijven, kluisgrens');
const withVault = (entries) => { const v = D.emptyVault(); for (const t of entries) D.mask(t, v); return v; };
const masked = (text, v, opts) => D.mask(text, v, opts).text;
test('volledige naam uit het geheugen, in elke schrijfwijze', () => {
  const v = withVault(['Remind Sarah Miller about it']);
  assert.equal(masked('can you email sarah miller today', v), 'can you email [PERSON_1] today');
  assert.equal(masked('SARAH MILLER called', v), '[PERSON_1] called');
});
test('losse voor- of achternaam met hoofdletter krijgt dezelfde placeholder', () => {
  const v = withVault(['Remind Sarah Miller about it']);
  assert.equal(masked('Ask Miller to sign', v), 'Ask [PERSON_1] to sign');
  assert.equal(masked('Did Sarah reply?', v), 'Did [PERSON_1] reply?');
});
test('losse naam in kleine letters alleen met een aanwijzing', () => {
  const v = withVault(['Remind Sarah Miller about it']);
  assert.equal(masked('send it to sarah please', v), 'send it to [PERSON_1] please');
  assert.equal(masked('the miller grinds flour', v), 'the miller grinds flour');
});
test('gemarkeerd als onthouden', () => {
  const v = withVault(['Remind Sarah Miller about it']);
  const r = D.mask('email sarah miller', v);
  assert.equal(r.items[0].remembered, true);
});
test('namen die gewone woorden zijn: geen valse treffers', () => {
  const v = withVault(['Dear Mr. Mark Jansen', 'Dear Mr. Will Brooks', 'Dear Ms. May Chen']);
  assert.equal(masked('mark this as done', v), 'mark this as done');
  assert.equal(masked('Mark this as done', v), 'Mark this as done');
  assert.equal(masked('Will you help me?', v), 'Will you help me?');
  assert.equal(masked('May I ask something?', v), 'May I ask something?');
  assert.equal(masked('We start in May.', v), 'We start in May.');
  assert.equal(masked('I want to mark the date', v), 'I want to mark the date');
});
test('namen die gewone woorden zijn: wel bij een duidelijke aanwijzing', () => {
  const v = withVault(['Dear Mr. Mark Jansen', 'Dear Mr. Will Brooks']);
  assert.equal(masked('Dear Mark, thanks', v), 'Dear [PERSON_1], thanks');
  assert.equal(masked('hi will, quick question', v), 'hi [PERSON_2], quick question');
  assert.equal(masked('Ask Mark Jansen', v), 'Ask [PERSON_1]');
});
test('nieuwe voornamen in kleine letters met aanwijzing', () => {
  has('send this to sarah tomorrow', ['PERSON:sarah']);
  has('dear daniel, thanks', ['PERSON:daniel']);
  has('mijn zoon daniel is ziek', ['PERSON:daniel']);
  has('a sarah-like name', []);
  has('I need a new job', []);
  has('for job applications', []);
});
test('Never protect geldt ook voor het geheugen', () => {
  const v = withVault(['Dear Mr. Will Brooks']);
  assert.equal(masked('Dear Will, thanks', v, { allowList: ['Will'] }), 'Dear Will, thanks');
});
test('bedrijven aan hun rechtsvorm', () => {
  has('Contract with Acme Inc. signed', ['COMPANY:Acme Inc.']);
  has('Factuur van Jansen BV ontvangen', ['COMPANY:Jansen BV']);
  has('Order from Müller GmbH', ['COMPANY:Müller GmbH']);
  has('The Smith Ltd office', ['COMPANY:Smith Ltd']);
  has('BV and NV are legal forms', []);
});
test('bedrijf uit het geheugen in kleine letters', () => {
  const v = withVault(['Contract with Acme Inc. signed']);
  assert.equal(masked('what did acme inc. say?', v), 'what did [COMPANY_1] say?');
});
test('posities in de uitvoer (voor ongedaan maken)', () => {
  const v = D.emptyVault();
  const r = D.mask('Mail sarah.miller@example.com now', v);
  assert.equal(r.text.slice(r.items[0].at, r.items[0].at + r.items[0].placeholder.length), '[EMAIL_1]');
});
test('kluisgrens: oudste gegevens verdwijnen, tellers blijven', () => {
  const v = D.emptyVault();
  for (let i = 0; i < 5; i++) { D.mask(`mail user${i}@example.com`, v); v.lastUsed[`[EMAIL_${i + 1}]`] = i; }
  assert.equal(D.limit(v, 3), 2);
  assert.deepEqual(Object.keys(v.byPlaceholder).sort(), ['[EMAIL_3]', '[EMAIL_4]', '[EMAIL_5]']);
  assert.equal(D.mask('mail new@example.com', v).items[0].placeholder, '[EMAIL_6]');
  assert.equal(D.MAX_ENTRIES, 10000);
});

console.log('Kluis per site');
const A = { scope: 'ai:ChatGPT', legacy: true }, B = { scope: 'evil.example' }, A2 = { scope: 'ai:Claude', legacy: true };
test('een andere site kan placeholders niet terugzetten', () => {
  const v = D.emptyVault();
  const r = D.mask('Mijn IBAN is NL91ABNA0417164300 en wachtwoord: Geheim123!', v, A);
  assert.equal(D.restore(r.text, v, A), 'Mijn IBAN is NL91ABNA0417164300 en wachtwoord: Geheim123!');
  assert.equal(D.restore(r.text, v, B), r.text);
  assert.equal(D.restore('[IBAN_1] [SECRET_1] [PERSON_1]', v, B), '[IBAN_1] [SECRET_1] [PERSON_1]');
});
test('een leeg bereik (venster zonder adres) zet niets terug', () => {
  const v = D.emptyVault();
  const r = D.mask('Mail sarah.miller@example.com, IBAN NL91ABNA0417164300', v, A);
  D.mask('Bel 0612345678', v); // ook oude gegevens zonder site
  assert.equal(D.restore(r.text, v, { scope: '' }), r.text);
  assert.equal(D.restore('[PHONE_1]', v, { scope: '', legacy: true }), '[PHONE_1]');
  assert.equal(D.restore(r.text, v), 'Mail sarah.miller@example.com, IBAN NL91ABNA0417164300'); // popup: alles
});
test('hetzelfde gegeven op een andere site krijgt een eigen placeholder', () => {
  const v = D.emptyVault();
  const a = D.mask('mail sarah.miller@example.com', v, A).items[0].placeholder;
  const b = D.mask('mail sarah.miller@example.com', v, B).items[0].placeholder;
  assert.notEqual(a, b);
  assert.equal(D.mask('nog eens sarah.miller@example.com', v, A).items[0].placeholder, a);
  assert.equal(D.restore(a, v, B), a);
  assert.equal(D.restore(b, v, B), 'sarah.miller@example.com');
});
test('het naamgeheugen werkt alleen binnen dezelfde site', () => {
  const v = D.emptyVault();
  D.mask('Email to Sarah Miller please', v, A);
  // Op een andere site levert alleen "Sarah" niet de volledige naam van ChatGPT op.
  const r = D.mask('Hello Sarah', v, B);
  for (const it of r.items) assert.notEqual(D.restore(it.placeholder, v, B), 'Sarah Miller');
  assert.equal(D.restore('[PERSON_1]', v, B), '[PERSON_1]');
});
test('oude gegevens (zonder site) alleen op bekende AI-sites', () => {
  const v = D.emptyVault();
  D.mask('Bel 0612345678', v); // zoals in versies vóór de kluis per site
  assert.equal(D.restore('[PHONE_1]', v, A), '0612345678');
  assert.equal(D.restore('[PHONE_1]', v, B), '[PHONE_1]');
  assert.equal(D.mask('Bel 06 12 34 56 78', v, A2).text, 'Bel [PHONE_1]'); // hergebruikt en voortaan van Claude
  assert.equal(v.sites['[PHONE_1]'], 'ai:Claude');
  assert.equal(D.restore('[PHONE_1]', v, A), '[PHONE_1]');
});
test('opruimen wist ook de site', () => {
  const v = D.emptyVault();
  D.mask('mail a@example.com', v, A); v.lastUsed['[EMAIL_1]'] = 0;
  D.prune(v, 1, 10 * 24 * 60 * 60 * 1000);
  assert.deepEqual(v.sites, {});
});
test('zonder bereik (popup, kluisvenster) telt alles', () => {
  const v = D.emptyVault();
  D.mask('mail a@example.com', v, B);
  assert.equal(D.restore('[EMAIL_1]', v), 'a@example.com');
});

test('tekst afschermen in de popup: geen website krijgt die gegevens terug', () => {
  const v = D.emptyVault();
  const r = D.mask('Mail Sarah Miller, IBAN NL91 ABNA 0417 1643 00', v, { scope: 'popup' });
  assert.equal(r.text, 'Mail [PERSON_1], IBAN [IBAN_1]');
  assert.equal(D.restore(r.text, v, A), r.text);
  assert.equal(D.restore(r.text, v, B), r.text);
  assert.equal(D.restore(r.text, v), 'Mail Sarah Miller, IBAN NL91 ABNA 0417 1643 00');
});

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed ? 1 : 0);
