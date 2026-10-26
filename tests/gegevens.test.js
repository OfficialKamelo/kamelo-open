// Draai met: node tests/gegevens.test.js
// Gevoelige gegevens herkennen voor de melding in de gratis editie (src/identifiers.js): wat moet gevonden worden, en
// vooral wat níet (bestelnummers, telefoonnummers, bedragen, datums, gewone zinnen over wachtwoorden).
// Alle nummers hieronder zijn verzonnen; ze kloppen alleen qua controlegetal (testnummers uit de openbare regels).
const assert = require('node:assert/strict');
const { kinds, _internal: X } = require('../src/identifiers.js');

let n = 0;
const yes = (text, kind) => { n++; assert.deepEqual(kinds(text).includes(kind), true, `verwacht ${kind}: ${text} → ${kinds(text)}`); };
const no = text => { n++; assert.deepEqual(kinds(text), [], `geen melding verwacht: ${text} → ${kinds(text)}`); };

// ---------- Controlegetallen ----------
assert.ok(X.elfproef('111222333'));
assert.ok(!X.elfproef('111222334'));
assert.ok(X.ibanValid('NL91ABNA0417164300'));
assert.ok(X.ibanValid('DE89 3704 0044 0532 0130 00'));
assert.ok(!X.ibanValid('NL91ABNA0417164301'));
assert.ok(X.dniValid('12345678Z'));
assert.ok(X.dniValid('X1234567L'));
assert.ok(!X.dniValid('12345678A'));
assert.ok(X.ssnValid('123-45-6789'));
assert.ok(!X.ssnValid('666-45-6789'));
assert.ok(X.steuerIdValid('86095742719'));
assert.ok(!X.steuerIdValid('86095742718'));
assert.ok(X.luhn('4111111111111111'));

// ---------- Wel een melding ----------
// BSN alleen met een woord ervoor (een los getal van 9 cijfers haalt de elfproef in 1 op 11 gevallen).
yes('Mijn BSN is 111222333, kun je dit formulier voor me invullen?', 'NATIONAL_ID');
yes('bsn: 111 222 333', 'NATIONAL_ID');
yes('burgerservicenummer 111.22.2333 staat op de brief van de Belastingdienst', 'NATIONAL_ID');
yes('My SSN is 123-45-6789, is that safe to put on the form?', 'NATIONAL_ID');
yes('meine Steuer-ID lautet 86095742719', 'NATIONAL_ID');
yes('mi DNI es 12345678Z y me piden el NIE de mi pareja X1234567L', 'NATIONAL_ID');
yes('rijksregisternummer 85.07.30-033.28, wat betekent dat getal?', 'NATIONAL_ID');
yes('my national insurance number is AB 12 34 56 C', 'NATIONAL_ID');
yes('Kun je controleren of NL91ABNA0417164300 een geldig rekeningnummer is?', 'IBAN');
yes('IBAN DE89 3704 0044 0532 0130 00, BIC COBADEFFXXX', 'IBAN');
yes('mijn rekening nl91 abna 0417 1643 00 staat rood', 'IBAN');
yes('card 4111 1111 1111 1111 exp 12/27 cvc 123', 'CARD');
yes('5555-5555-5555-4444', 'CARD');
yes('mijn paspoortnummer is NW7K12345, verloopt die binnenkort?', 'PASSPORT');
yes('passport number: 123456789', 'PASSPORT');
yes('Reisepassnummer C01X00T47 für das Visum', 'PASSPORT');
yes('mijn wachtwoord is Zomer2026! kun je zeggen of dat sterk genoeg is', 'PASSWORD');
yes('password: hunter22', 'PASSWORD');
yes('Passwort lautet Ki7#fussball', 'PASSWORD');
yes('mon mot de passe est soleil123, il est bon ?', 'PASSWORD');
yes('mi contraseña es Gato_2019', 'PASSWORD');
yes('pincode 4821 werkt niet meer bij de automaat', 'PASSWORD');
yes('waarom werkt deze code niet: client = OpenAI(api_key="sk-proj-abcdefghijklmnopqrstuvwxyz123456")', 'SECRET');
yes('token ' + ['ghp', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ12'].join('_'), 'SECRET'); // in stukken: sync-open.sh ziet anders een echte sleutel
yes(['-----BEGIN', 'OPENSSH', 'PRIVATE', 'KEY-----'].join(' ') + '\nNEP-VOORBEELD', 'SECRET'); // in stukken: check-secrets ziet anders een echte sleutel
yes(['AKIA', 'IOSFODNN7EXAMPLE'].join('') + ' is mijn access key', 'SECRET'); // idem

// ---------- Geen melding ----------
no('Mijn bestelnummer is 111222333, wanneer komt het pakket?'); // haalt de elfproef, maar geen BSN-woord
no('bel me op 0612345678 of +31 6 12345678');
no('Het kost € 1.234.567,89 en de btw is 21%');
no('afspraak op 12-10-2026 om 14:30');
no('ik ben mijn wachtwoord vergeten, hoe reset ik het');
no('what makes a strong password?');
no('password reset link werkt niet');
no('Passwort ändern bei Gmail');
no('le mot de passe du wifi est sur la box ?');
no('wat is een BSN en waar vind ik het?');
no('my order 4111 1111 1111 1112 has not arrived'); // geen Luhn
no('ISBN 978-0-306-40615-7');
no('postcode 1234 AB, huisnummer 56');
no('referentie NL12 en 34 stuks');
no('de pin van de vlag zit los');
no('Hoeveel is 123-45-0000 min 1000?'); // ongeldig SSN
no('Hoeveel is 123-45-6789 min 1000?'); // geldig SSN, maar midden in een som
no('My password manager is 1Password');
no('I need an id number for 2024 form');
no('Order ID number XK-998877 has not shipped');
no('my tracking number is 5105105105105100'); // haalt Luhn, maar na "tracking number"
no('Version 12345678Z released');
no('versie 1.7.2 van de extensie, build 20261021');
no('mijn paspoort is verlopen, hoe vraag ik een nieuwe aan');
no('Wat betekent DNI in Spanje?');
no('sk-learn of scikit-learn, wat moet ik installeren');

// ---------- De blauwe markering: alleen het gegeven, niet de punt of komma erachter ----------
const { find } = require('../src/identifiers.js');
const marked = text => find(text).map(f => text.slice(f.start, f.end));
n++; assert.deepEqual(marked('password: hunter22.'), ['hunter22']);
n++; assert.deepEqual(marked('De pincode is 4821, toch?'), ['4821']);
n++; assert.deepEqual(marked('mijn wachtwoord is Zomer2026! kun je kijken'), ['Zomer2026!']);
n++; assert.deepEqual(marked('my ID number is X1234567.'), ['X1234567']);

console.log(`gegevens: ${n} zinnen goed`);
