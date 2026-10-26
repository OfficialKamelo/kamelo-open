// Melo's feitenkaartjes: korte, nagekeken feiten die met een vraag meegaan, zodat de kleine AI van Chrome ze niet hoeft te
// onthouden (en ze niet verzint). Elk kaartje:
//   keys   woorden in de vraag (nl, en, de, fr, es) die bij dit onderwerp horen
//   fact   het feit in het Engels, kort: dat leest de AI het best (de AI antwoordt zelf in de taal van de vraag)
//   wrong  zinnen die het feit tegenspreken (bekende fouten van de AI); gezocht per zin, niet als er "niet/not" in staat
//   say    de juiste zin in elke taal: komt in de plaats van een foute zin als ook een tweede poging fout is
//   bron   waar het feit vandaan komt
// Alleen feiten die vaststaan. Geen doseringen of medisch advies: daarvoor verwijst Melo naar de huisarts of Thuisarts.nl.
(() => {
  'use strict';
  // Een advieskaartje: het feit is de titel met de tips achter elkaar (voor de toetsen en de tweede poging in de extensie).
  const advies = c => ({ ...c, fact: `${c.titel}: ${c.tips.join('; ')}.${c.note ? ' ' + c.note : ''}` });
  const CARDS = [
    {
      id: 'pythagoras',
      keys: /pythagoras|pythagore|pit[áa]goras|schuine zijde|hypoten|hipotenusa|rechthoekszijde|rechthoekige driehoek|right(?:-angled)? triangle|rechtwinklig|kathete|triangle rectangle|tri[áa]ngulo rect[áa]ngulo|cateto/i,
      fact: 'Pythagoras: in a right triangle, a² + b² = c². The hypotenuse c (Dutch: schuine zijde, German: Hypotenuse, French: hypoténuse, Spanish: hipotenusa) is the longest side and lies OPPOSITE the right angle. The two shorter sides a and b form the right angle (Dutch: rechthoekszijden, German: Katheten, French: côtés de l’angle droit, Spanish: catetos). Example: legs 3 and 4 give hypotenuse 5, because 9 + 16 = 25.',
      wrong: [
        /(schuine zijde|hypotenus\w*|hipotenusa|hypot[ée]nuse)\b[^.!?\n]{0,60}\b(bij|aan|naast|grenst aan|vormt|at|next to|adjacent to|forms?|touch\w*|an|am|neben|bildet|adyacente|junto|forma|pr[èe]s de|forme|touche)\s+(de |het |the |dem |l[ae]? ?|el )?(rechte hoek|right angle|rechten winkel|angle droit|[áa]ngulo recto)/i,
        /(zijde|side|seite|c[ôo]t[ée]|lado)\s+(waar|bij|aan|where|at|next to|wo|an|am|o[uù]|donde|junto a)\s+(de |the |der |l[ae]? ?|el )?(rechte hoek|right angle|rechte winkel|rechten winkel|angle droit|[áa]ngulo recto)[^.!?\n]{0,30}\b(noemen we|noem je|heet|heten|is|wordt|called|is called|is the|hei[ßs]t|ist die|nennt man|s.appelle|est l|on appelle|se llama|es la|llamamos)\s+(?:de |het |the |die |der |la |l['’]|el )?(schuine zijde|hypotenus\w*|hipotenusa|hypot[ée]nuse)/i,
        /(schuine zijde|hypotenus\w*|hipotenusa|hypot[ée]nuse)\b[^.!?\n]{0,30}\b(is |de |the |la |die )?(kortste|shortest|k[üu]rzeste|plus court|m[áa]s cort)/i,
      ],
      say: {
        nl: 'De schuine zijde is de langste zijde en ligt tegenover de rechte hoek; de twee andere zijden vormen samen de rechte hoek.',
        en: 'The hypotenuse is the longest side and lies opposite the right angle; the other two sides form the right angle.',
        de: 'Die Hypotenuse ist die längste Seite und liegt dem rechten Winkel gegenüber; die beiden anderen Seiten bilden den rechten Winkel.',
        fr: 'L’hypoténuse est le côté le plus long, en face de l’angle droit ; les deux autres côtés forment l’angle droit.',
        es: 'La hipotenusa es el lado más largo y está opuesta al ángulo recto; los otros dos lados forman el ángulo recto.',
      },
      bron: 'https://nl.wikipedia.org/wiki/Stelling_van_Pythagoras',
    },
    {
      id: 'cirkel',
      keys: /cirkel|circle|kreis|cercle|c[íi]rculo|\bpi\b|π/i,
      fact: 'Circle with radius r: area A = πr², circumference C = 2πr = πd. The diameter d is twice the radius (d = 2r). π ≈ 3.14159.',
      wrong: [/(oppervlakte|area|fl[äa]che|aire|[áa]rea)\b[^.!?\n]{0,30}=\s*2\s*[·*×]?\s*π\s*r(?![²^2])/i, /(omtrek|circumference|umfang|circonf[ée]rence|circunferencia)\b[^.!?\n]{0,30}=\s*π\s*r\s*(²|\^\s*2)/i],
      say: {
        nl: 'De oppervlakte van een cirkel is πr² en de omtrek is 2πr.', en: 'The area of a circle is πr² and the circumference is 2πr.',
        de: 'Die Fläche eines Kreises ist πr² und der Umfang 2πr.', fr: 'L’aire d’un cercle vaut πr² et son périmètre 2πr.', es: 'El área de un círculo es πr² y la circunferencia mide 2πr.',
      },
      bron: 'https://nl.wikipedia.org/wiki/Cirkel',
    },
    {
      id: 'driehoek',
      keys: /driehoek|triangle|dreieck|tri[áa]ngulo/i,
      fact: 'Triangle: area = ½ × base × height (the height is perpendicular to the base). The three angles of any triangle add up to 180°.',
      wrong: [/(driehoek|triangle|dreieck|tri[áa]ngulo)[^.!?\n]{0,60}\b(samen|opgeteld|add up to|sum to|zusammen|ergeben|somme|font|suman)\b[^.!?\n]{0,15}\b360\s*(°|graden|degrees|grad|degr|grados)/i],
      say: { nl: 'De drie hoeken van een driehoek zijn samen 180°.', en: 'The three angles of a triangle add up to 180°.', de: 'Die drei Winkel eines Dreiecks ergeben zusammen 180°.', fr: 'Les trois angles d’un triangle font 180° au total.', es: 'Los tres ángulos de un triángulo suman 180°.' },
      bron: 'https://nl.wikipedia.org/wiki/Driehoek_(meetkunde)',
    },
    {
      id: 'priemgetal',
      keys: /priem|prime|primzahl|premier|primo/i,
      fact: 'A prime number is a whole number greater than 1 with exactly two divisors: 1 and itself. 1 is NOT a prime number. 2 is the only even prime. The first primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29.',
      wrong: [/(?<![\d.,])1\s+(is|ist|est|es)\s+(een |a |eine |un |une )?(priemgetal|prime|primzahl|nombre premier|n[úu]mero primo)/i],
      say: { nl: '1 is geen priemgetal; 2 is het enige even priemgetal.', en: '1 is not a prime number; 2 is the only even prime.', de: '1 ist keine Primzahl; 2 ist die einzige gerade Primzahl.', fr: '1 n’est pas un nombre premier ; 2 est le seul nombre premier pair.', es: 'El 1 no es primo; el 2 es el único primo par.' },
      bron: 'https://nl.wikipedia.org/wiki/Priemgetal',
    },
    {
      id: 'statistiek',
      keys: /gemiddelde|mediaan|\bmodus\b|average|\bmean\b|median|durchschnitt|mittelwert|moyenne|m[ée]diane|promedio|mediana/i,
      fact: 'Mean (average): add all values and divide by how many there are. Median: the middle value after sorting (with an even count, the mean of the two middle values). Mode: the value that occurs most often.',
      bron: 'https://nl.wikipedia.org/wiki/Mediaan_(statistiek)',
    },
    {
      id: 'kans',
      keys: /\bkans\b|waarschijnlijkheid|probability|chance|wahrscheinlichkeit|probabilit[ée]|probabilidad|dobbelsteen|\bdie\b.{0,10}\broll|w[üu]rfel|\bd[ée]s\b|\bdado|munt(?:je)?|coin|m[üu]nze|pi[èe]ce|moneda/i,
      fact: 'Probability = number of favourable outcomes / number of possible outcomes (if all are equally likely). A fair die: each number has probability 1/6. A fair coin: heads 1/2. For independent events, multiply: two sixes in a row = 1/6 × 1/6 = 1/36.',
      bron: 'https://nl.wikipedia.org/wiki/Kansrekening',
    },
    {
      id: 'rente',
      keys: /rente op rente|samengestelde rente|compound interest|zinseszins|int[ée]r[êe]ts compos[ée]s|inter[ée]s compuesto/i,
      fact: 'Compound interest: the interest is added to the balance, and the next interest is calculated on the new balance. Formula: A = P × (1 + r)^n, with P the starting amount, r the interest rate per period (5% = 0.05) and n the number of periods. Example: €1000 at 5% for 3 years = 1000 × 1.05³ ≈ €1157.63.',
      bron: 'https://nl.wikipedia.org/wiki/Samengestelde_interest',
    },
    {
      id: 'snelheid',
      keys: /snelheid|speed|velocity|geschwindigkeit|vitesse|velocidad|km\/h|km\/u|m\/s/i,
      fact: 'Speed = distance / time (v = s / t), so distance = speed × time and time = distance / speed. 1 m/s = 3.6 km/h.',
      bron: 'https://nl.wikipedia.org/wiki/Snelheid',
    },
    {
      id: 'licht-zon',
      keys: /zonlicht|sunlight|sonnenlicht|lumi[èe]re du soleil|luz del sol|licht (?:van|uit) de zon|light (?:from|of) the sun|lichtsnelheid|snelheid van (?:het )?licht|speed of light|lichtgeschwindigkeit|vitesse de la lumi[èe]re|velocidad de la luz|lichtjaar|light-?year|lichtjahr|ann[ée]e-lumi[èe]re|a[ñn]o luz/i,
      fact: 'The speed of light in vacuum is exactly 299,792,458 m/s (about 300,000 km/s). The average distance from the Sun to the Earth is about 149.6 million km (1 astronomical unit = 149,597,870.7 km). Sunlight therefore takes about 499 seconds, roughly 8 minutes and 20 seconds, to reach the Earth (149,597,870.7 / 299,792.458 ≈ 499). A light-year is a distance (about 9.46 trillion km), not a time.',
      wrong: [/(lichtjaar|light-?year|lichtjahr|ann[ée]e-lumi[èe]re|a[ñn]o luz)\b[^.!?\n]{0,30}\b(is|ist|est|es)\s+(een |a |eine |une |una )?(tijd|time|zeit|temps|tiempo|eenheid van tijd|unit of time)/i],
      say: { nl: 'Een lichtjaar is een afstand (ongeveer 9,46 biljoen km), geen tijd.', en: 'A light-year is a distance (about 9.46 trillion km), not a time.', de: 'Ein Lichtjahr ist eine Entfernung (etwa 9,46 Billionen km), keine Zeit.', fr: 'Une année-lumière est une distance (environ 9 460 milliards de km), pas une durée.', es: 'Un año luz es una distancia (unos 9,46 billones de km), no un tiempo.' },
      bron: 'https://www.iau.org/static/resolutions/IAU2012_English.pdf',
    },
    {
      id: 'zon-aarde',
      keys: /zon\b.{0,30}\baarde|aarde\b.{0,30}\bzon|sun\b.{0,30}\bearth|earth\b.{0,30}\bsun|sonne.{0,30}erde|erde.{0,30}sonne|soleil.{0,30}terre|terre.{0,30}soleil|sol\b.{0,30}tierra|tierra.{0,30}\bsol\b/i,
      fact: 'The average distance between the Earth and the Sun is about 149.6 million km (1 astronomical unit). Sunlight takes about 8 minutes and 20 seconds to reach the Earth. The Earth orbits the Sun once a year (about 365.25 days) and spins on its axis once a day.',
      bron: 'https://nl.wikipedia.org/wiki/Astronomische_eenheid',
    },
    {
      id: 'lucht-blauw',
      keys: /lucht.{0,15}blauw|blauwe lucht|sky.{0,15}blue|blue sky|himmel.{0,15}blau|blauer himmel|ciel.{0,15}bleu|cielo.{0,15}azul|zonsondergang|sunset|sonnenuntergang|coucher de soleil|puesta de sol|avondrood/i,
      fact: 'The sky is blue because of Rayleigh scattering: sunlight contains all colours, and the small gas molecules in the air (mostly nitrogen and oxygen) scatter short wavelengths (blue) much more than long ones (red). At sunset the light travels through much more air, so most blue is scattered away and the remaining light looks red and orange. It is not a reflection of the sea.',
      wrong: [/(weerspiegel\w*|reflect\w*|spiegel\w*|refl[eè]t\w*|refleja\w*)[^.!?\n]{0,40}(zee|oceaan|water|sea|ocean|meer|mer|oc[ée]an|mar)/i],
      say: { nl: 'De lucht is niet blauw door een weerspiegeling van de zee, maar doordat de lucht blauw licht het sterkst verstrooit.', en: 'The sky is not blue because it reflects the sea, but because air scatters blue light the most.', de: 'Der Himmel ist nicht blau, weil er das Meer spiegelt, sondern weil die Luft blaues Licht am stärksten streut.', fr: 'Le ciel n’est pas bleu parce qu’il reflète la mer, mais parce que l’air diffuse surtout la lumière bleue.', es: 'El cielo no es azul porque refleje el mar, sino porque el aire dispersa sobre todo la luz azul.' },
      bron: 'https://nl.wikipedia.org/wiki/Rayleighverstrooiing',
    },
    {
      id: 'seizoenen',
      keys: /seizoen|seasons?\b|jahreszeit|saisons?\b|estaci[óo]n(es)? del a[ñn]o|estaciones|zomer en winter|summer and winter|sommer und winter|[ée]t[ée] et hiver|verano e invierno/i,
      fact: 'Seasons are caused by the tilt of the Earth’s axis (about 23.4°), not by the distance to the Sun. When your half of the Earth is tilted towards the Sun, sunlight hits it more steeply and days are longer: summer. The Earth is actually closest to the Sun in early January, during winter in the northern hemisphere.',
      wrong: [/(seizoen\w*|seasons?|jahreszeit\w*|saisons?|estaci\w*|zomer|summer|sommer|[ée]t[ée]|verano)\b[^.!?\n]{0,80}\b(dichter bij de zon|dichterbij de zon|closer to the sun|nearer (to )?the sun|n[äa]her an der sonne|plus pr[èe]s du soleil|m[áa]s cerca del sol)/i],
      say: { nl: 'De seizoenen komen door de scheve stand van de aardas (ongeveer 23,4°), niet door de afstand tot de zon.', en: 'The seasons come from the tilt of the Earth’s axis (about 23.4°), not from the distance to the Sun.', de: 'Die Jahreszeiten entstehen durch die Neigung der Erdachse (etwa 23,4°), nicht durch den Abstand zur Sonne.', fr: 'Les saisons viennent de l’inclinaison de l’axe de la Terre (environ 23,4°), pas de la distance au Soleil.', es: 'Las estaciones se deben a la inclinación del eje de la Tierra (unos 23,4°), no a la distancia al Sol.' },
      bron: 'https://nl.wikipedia.org/wiki/Seizoen',
    },
    {
      id: 'maan',
      keys: /\bmaan|moon|\b(?:der|den|dem|vom|zum) mond\b|mondphase|\blune\b|\bluna\b|schijngestalte|maanfase|moon phase|mondphase|phase(s)? de la lune|fase(s)? lunar/i,
      fact: 'The Moon’s phases come from how much of its sunlit half we can see from Earth as it orbits us (about 29.5 days from new moon to new moon). They are NOT caused by the Earth’s shadow; the Earth’s shadow only falls on the Moon during a lunar eclipse. The Moon is about 384,400 km away on average.',
      wrong: [/(schijngestalte\w*|fases?|phases?|phasen?)\b[^.!?\n]{0,80}\b(schaduw van de aarde|aardschaduw|earth'?s shadow|shadow of the earth|erdschatten|schatten der erde|ombre de la terre|sombra de la tierra)/i],
      say: { nl: 'De schijngestalten van de maan komen niet door de schaduw van de aarde, maar doordat we steeds een ander deel van de verlichte helft zien.', en: 'The Moon’s phases are not caused by the Earth’s shadow, but by how much of its sunlit half we see.', de: 'Die Mondphasen entstehen nicht durch den Erdschatten, sondern dadurch, wie viel von der beleuchteten Hälfte wir sehen.', fr: 'Les phases de la Lune ne viennent pas de l’ombre de la Terre, mais de la part de sa moitié éclairée que nous voyons.', es: 'Las fases de la Luna no se deben a la sombra de la Tierra, sino a la parte de su mitad iluminada que vemos.' },
      bron: 'https://nl.wikipedia.org/wiki/Schijngestalte',
    },
    {
      id: 'water-koken',
      keys: /kookpunt|kookt water|water kook|boiling point|water boil|siedepunkt|siedet|point d.[ée]bullition|punto de ebullici[óo]n|vriespunt|freezing point|gefrierpunkt|point de cong[ée]lation|punto de congelaci[óo]n/i,
      fact: 'Pure water boils at 100 °C (212 °F) at sea-level air pressure and freezes at 0 °C (32 °F). High in the mountains the air pressure is lower, so water boils at a lower temperature (about 70 °C on top of Mount Everest).',
      bron: 'https://nl.wikipedia.org/wiki/Kookpunt',
    },
    {
      id: 'zwaartekracht',
      keys: /zwaartekracht|valversnelling|gravity|gravitation|schwerkraft|erdbeschleunigung|gravit[ée]|pesanteur|gravedad|vrije val|free fall|freier fall|chute libre|ca[íi]da libre/i,
      unless: /luchtweerstand|air resistance|drag|luftwiderstand|r[ée]sistance de l.air|resistencia del aire/i,
      fact: 'Near the Earth’s surface, gravity accelerates falling objects at about 9.81 m/s² (g). Without air resistance, a heavy and a light object fall equally fast.',
      wrong: [/(zware|zwaardere|heavier|heavy|schwerere?|plus lourds?|m[áa]s pesad[oa]s?)\b[^.!?\n]{0,40}\b(valt|vallen|falls?|fall faster|f[äa]llt|fallen|tombe|tombent|cae|caen)\b[^.!?\n]{0,15}\b(sneller|faster|schneller|plus vite|m[áa]s r[áa]pido)/i],
      say: { nl: 'Zonder luchtweerstand vallen een zwaar en een licht voorwerp even snel.', en: 'Without air resistance, heavy and light objects fall equally fast.', de: 'Ohne Luftwiderstand fallen schwere und leichte Gegenstände gleich schnell.', fr: 'Sans résistance de l’air, un objet lourd et un objet léger tombent aussi vite.', es: 'Sin resistencia del aire, un objeto pesado y uno ligero caen igual de rápido.' },
      bron: 'https://nl.wikipedia.org/wiki/Valversnelling',
    },
    {
      id: 'fotosynthese',
      keys: /fotosynthese|photosynth|fotos[íi]ntesis|bladgroen|chlorofyl|chlorophyll|chlorophyll|chlorophylle|clorofila/i,
      fact: 'Photosynthesis: plants, algae and some bacteria use the energy of light to turn carbon dioxide (CO₂) and water (H₂O) into glucose (sugar) and oxygen (O₂): 6 CO₂ + 6 H₂O + light → C₆H₁₂O₆ + 6 O₂. It happens in the chloroplasts, where the green pigment chlorophyll captures the light. Plants release the oxygen into the air.',
      wrong: [/(planten|plants|pflanzen|plantes|plantas)\b[^.!?\n]{0,40}\b(nemen|take in|absorb|nehmen|absorbent|absorben)\b[^.!?\n]{0,15}\b(zuurstof|oxygen|sauerstoff|oxyg[èe]ne|ox[íi]geno)\b[^.!?\n]{0,40}\b(fotosynthese|photosynth|fotos[íi]ntesis)/i],
      say: { nl: 'Bij fotosynthese nemen planten koolstofdioxide op en geven ze zuurstof af.', en: 'In photosynthesis, plants take in carbon dioxide and give off oxygen.', de: 'Bei der Fotosynthese nehmen Pflanzen Kohlendioxid auf und geben Sauerstoff ab.', fr: 'Pendant la photosynthèse, les plantes absorbent du dioxyde de carbone et rejettent de l’oxygène.', es: 'En la fotosíntesis, las plantas absorben dióxido de carbono y liberan oxígeno.' },
      bron: 'https://nl.wikipedia.org/wiki/Fotosynthese',
    },
    {
      id: 'schrikkeljaar',
      keys: /schrikkeljaar|leap year|schaltjahr|ann[ée]e bissextile|a[ñn]o bisiesto/i,
      fact: 'Leap years: a year divisible by 4 is a leap year (366 days, with 29 February), except years divisible by 100, unless they are also divisible by 400. So 2000 and 2024 were leap years, 1900 and 2100 are not.',
      bron: 'https://nl.wikipedia.org/wiki/Schrikkeljaar',
    },
    {
      // Vragen over Melo zelf ("hoe goed ben je vergeleken met ChatGPT?", "waar ben je niet goed in?"). Eerlijk over de nadelen,
      // maar luisteren en persoonlijke dingen zijn juist waar Melo goed in moet zijn (Lucas, 16 okt).
      id: 'melo-zelf',
      keys: /(hoe goed|how good|wie gut|à quel point|qu[ée] tan buen[oa])\b.{0,30}\b(ben je|ben jij|are you|bist du|es-tu|eres)\b|\b(waar|wat|what|worin|wobei|en quoi|en qu[ée])\b.{0,20}\b(ben je|ben jij|are you|bist du|es-tu|eres)\b.{0,20}\b(goed|good|gut|bon|buen[oa]|slecht|bad|schlecht|mauvais|mal[oa]|sterk|strong|stark|fort|zwak|weak|schwach|faible|d[ée]bil)\b|\b(ben je|ben jij|are you|bist du|es-tu|eres)\s+(net zo |even |as )?(beter|slimmer|goed als|better|smarter|as good|besser|kl[üu]ger|so gut|meilleur|plus intelligent|mejor|m[áa]s list[oa])\b|(vergeleken met|vergelijk|compared? (to|with)|vs\.?|versus|im vergleich|vergleich|par rapport|compar)[^.?!]{0,30}\b(chatgpt|gpt|gemini|claude|copilot|openai)\b|\b(chatgpt|gpt|gemini|claude|copilot)\b[^.?!]{0,30}\b(beter|slimmer|better|smarter|besser|meilleur|mejor|vergele|compar|vergleich)|\b(wat kun je|wat kan je|wat kan melo|what can you do|was kannst du|que peux-tu faire|qu[ée] puedes hacer)\b/i,
      fact: 'About Melo itself (answer honestly): you are Melo, Kamelo’s private chat. You run on Gemini Nano, the small AI built into Chrome, on this computer: nothing the user types leaves it. You are good at listening and at talking about personal things (feelings, grief, worries, relationships, health), calmly, in a safe place. Compared with the best ChatGPT models you know much less, make more mistakes with complex reasoning, maths and long texts, don’t know recent news, and remember only a short conversation; Kamelo itself does sums and checks some facts for you. Never say you are as smart as ChatGPT, and never say you are bad at feelings or personal things.',
      keepNeg: true,
      wrong: [/(niet (zo )?goed|slecht|not (very )?good|bad|nicht (so )?gut|schlecht|pas (tr[èe]s )?bon|mauvais|no (soy )?(muy )?buen[oa]|mal[oa])\b[^.!?\n]{0,40}\b(emoti\w*|gevoel\w*|feelings?|gef[üu]hl\w*|[ée]motion\w*|sentimiento\w*|persoonlijk\w*|personal|pers[öo]nlich\w*|personnel\w*)/i],
      say: {
        nl: 'Luisteren en praten over persoonlijke dingen is juist waar ik goed in ben; minder goed ben ik in veel kennis, ingewikkeld redeneren en lange teksten.',
        en: 'Listening and talking about personal things is exactly what I’m good at; I’m weaker at broad knowledge, complex reasoning and long texts.',
        de: 'Zuhören und über Persönliches reden kann ich gut; schwächer bin ich bei viel Wissen, komplexem Denken und langen Texten.',
        fr: 'Écouter et parler de choses personnelles, c’est justement ce que je fais bien ; je suis moins bon pour les connaissances étendues, les raisonnements complexes et les longs textes.',
        es: 'Escuchar y hablar de cosas personales es justo lo que hago bien; soy más flojo en conocimientos amplios, razonamientos complejos y textos largos.',
      },
      bron: 'https://developer.chrome.com/docs/ai/prompt-api',
    },
    // Advies (22 okt 2026, Lucas: "dit moet echt beter", de inhoud van Melo's antwoorden): korte, nagekeken tips per onderwerp,
    // met de getallen uit de bron, zodat de kleine AI ze niet verzint ("ga elke avond om 22.00 naar bed" bij nachtdiensten).
    // Alleen leefstijladvies uit Thuisarts.nl (NHG), Rijksoverheid/Nibud en universitaire gidsen; geen medicijnen of doses.
    // tips: de punten, het belangrijkste eerst (de AI krijgt ze als genummerde lijst: meting 22 okt, als lopende tekst sloeg
    // hij het dutje van 20 minuten over). note: wat er niet in mag. vraag: de gerichte slotvraag zoals bij June; vergeet de AI
    // die, dan zet Kamelo hem eronder (finish).
    advies({
      id: 'nachtdienst',
      keys: /nachtdienst|nachtwerk|ploegendienst|wisselende diensten|onregelmatige diensten|night ?shifts?|shift work|nachtschicht|schichtarbeit|schichtdienst|travail de nuit|horaires de nuit|turnos? de noche|trabajo nocturno/i,
      titel: 'Night shifts (Thuisarts.nl)',
      tips: [
        'during the shift, a nap (Dutch: dutje, German: Nickerchen) of 20 minutes or less, or a short one before it',
        'after the shift, sleep about 8 hours in a dark, quiet bedroom: blackout curtains or an eye mask',
        'no screens (phone, laptop) in the hour before you sleep',
        'no caffeine, alcohol or energy drinks in the hours before you sleep; at night only a light meal',
        'a healthy schedule: shifts of 8 hours or less, 2 or 3 nights in a row, rotating forward (day, evening, night)',
        'with many complaints, talk to your employer or the company doctor (bedrijfsarts) about fewer night shifts',
      ],
      note: 'A fixed evening bedtime does not fit night shifts, and melatonin does NOT help.',
      vraag: {
        nl: 'Hoeveel nachten draai je meestal achter elkaar, en hoe ziet je slaapkamer eruit als je overdag slaapt? Dan maak ik er een slaapschema voor je van.',
        en: 'How many nights in a row do you usually work, and what is your bedroom like when you sleep during the day? Then I can make a sleep schedule for you.',
        de: 'Wie viele Nächte arbeitest du meistens hintereinander, und wie ist dein Schlafzimmer, wenn du tagsüber schläfst? Dann mache ich dir einen Schlafplan.',
        fr: 'Combien de nuits d’affilée travailles-tu en général, et comment est ta chambre quand tu dors le jour ? Je peux alors te faire un planning de sommeil.',
        es: '¿Cuántas noches seguidas sueles trabajar y cómo es tu habitación cuando duermes de día? Así te hago un horario de sueño.',
      },
      wrong: [/(naar bed|in bed|to bed|go to sleep|ins bett|schlafen gehen|au lit|te coucher|a la cama|acu[ée]state)[^.!?\n]{0,40}(22[.:]00|10 ?pm|tien uur|zehn uhr|22 ?h)/i, /(22[.:]00|10 ?pm|tien uur|zehn uhr|22 ?h)[^.!?\n]{0,30}(naar bed|in bed|to bed|ins bett|au lit|a la cama)/i, /melatonin\w*[^.!?\n]{0,50}\b(helpt|kan helpen|helps?|can help|hilft|aide|ayuda|werkt|works)\b/i],
      say: {
        nl: 'Melatonine helpt niet bij nachtwerk, en een vaste bedtijd in de avond past niet bij nachtdiensten: slaap na je dienst in een donkere kamer en neem tijdens de dienst eventueel een dutje van hooguit 20 minuten.',
        en: 'Melatonin doesn’t help with night work, and a fixed evening bedtime doesn’t fit night shifts: sleep in a dark room after your shift and, if you can, take a nap of 20 minutes or less during the shift.',
        de: 'Melatonin hilft bei Nachtarbeit nicht, und eine feste Schlafenszeit am Abend passt nicht zu Nachtschichten: Schlaf nach der Schicht in einem dunklen Zimmer und mach während der Schicht wenn möglich ein Nickerchen von höchstens 20 Minuten.',
        fr: 'La mélatonine n’aide pas pour le travail de nuit, et une heure de coucher fixe le soir ne convient pas aux nuits : dors dans une chambre sombre après ton service et, si possible, fais une sieste de 20 minutes maximum pendant la nuit.',
        es: 'La melatonina no ayuda con el trabajo nocturno, y una hora fija para acostarse por la noche no encaja con los turnos de noche: duerme en una habitación oscura después del turno y, si puedes, haz una siesta de 20 minutos como máximo durante el turno.',
      },
      bron: 'https://www.thuisarts.nl/nachtdiensten-en-gezondheid/ik-werk-vaak-s-nachts-hoe-blijf-ik-gezond',
    }),
    advies({
      id: 'slaap',
      keys: /slecht slaap|slaap (al )?(weken |maanden )?slecht|slapeloos|niet (in )?slapen|kan niet slapen|wakker lig|doorslapen|inslapen|slaapprobl|insomnia|can'?t sleep|sleep(ing)? (badly|poorly)|trouble sleeping|sleep problem|schlafe? schlecht|schlafprobl|einschlafen|durchschlafen|dors mal|insomnie|troubles du sommeil|duermo mal|insomnio|no puedo dormir/i,
      titel: 'Sleeping badly (Thuisarts.nl)',
      tips: [
        'get up at the same time every day, also at the weekend',
        'no caffeine (coffee, tea, cola, energy drinks) in the 6 hours before sleeping, and no heavy meal in the 2 hours before',
        'no screens in the hour before bed, and the phone out of the bedroom',
        'go outside about an hour a day, preferably in the morning, and move half an hour a day, not right before bed',
        'lying awake: get up and do something calm elsewhere; nap at most half an hour, before 3 pm',
        'see the GP (huisarts) if it lasts for weeks, or with heavy daytime sleepiness and snoring',
      ],
      note: 'Alcohol worsens sleep; melatonin, valerian and sleeping pills are not recommended.',
      vraag: {
        nl: 'Is het vooral het inslapen dat niet lukt, of word je ’s nachts wakker en lig je dan te malen? Dan kijk ik wat bij jou het beste helpt.',
        en: 'Is it mostly falling asleep that’s hard, or do you wake up at night and lie there thinking? Then I can see what helps you most.',
        de: 'Ist es vor allem das Einschlafen, oder wachst du nachts auf und grübelst? Dann schaue ich, was dir am meisten hilft.',
        fr: 'Est-ce surtout l’endormissement qui est difficile, ou te réveilles-tu la nuit en ruminant ? Je regarde alors ce qui t’aide le plus.',
        es: '¿Te cuesta sobre todo dormirte, o te despiertas de noche dándole vueltas a todo? Así veo qué te ayuda más.',
      },
      wrong: [/(melatonin\w*|valeriaan|valerian\w*|baldrian|val[ée]riane)[^.!?\n]{0,50}\b(helpt|kan helpen|helps?|can help|hilft|aide|ayuda|werkt|works)\b/i],
      say: {
        nl: 'Melatonine en valeriaan helpen niet om beter te slapen; vaste opstaantijden, daglicht en geen cafeïne in de 6 uur voor het slapen helpen wel.',
        en: 'Melatonin and valerian don’t help you sleep better; fixed wake-up times, daylight and no caffeine in the 6 hours before bed do.',
        de: 'Melatonin und Baldrian helfen nicht, besser zu schlafen; feste Aufstehzeiten, Tageslicht und kein Koffein in den 6 Stunden vor dem Schlafen helfen schon.',
        fr: 'La mélatonine et la valériane n’aident pas à mieux dormir ; des heures de lever fixes, la lumière du jour et pas de caféine dans les 6 heures avant le coucher, oui.',
        es: 'La melatonina y la valeriana no ayudan a dormir mejor; sí ayudan levantarse siempre a la misma hora, la luz del día y nada de cafeína en las 6 horas antes de dormir.',
      },
      bron: 'https://www.thuisarts.nl/slecht-slapen/ik-wil-beter-slapen-slaapadviezen',
    }),
    advies({
      id: 'stress',
      keys: /stress|overspannen|burn-?out|overwerkt|te druk|overwhelmed|stressed|gestresst|überlastet|überfordert|surmenage|stress[ée]|estresad|agobiad/i,
      titel: 'Stress (Thuisarts.nl)',
      tips: [
        'move at least half an hour a day, like walking or cycling outside',
        'talk early with someone you trust, and about work with your manager or the company doctor (bedrijfsarts)',
        'make a list of what costs you energy, and drop or hand over some of it',
        'write worries down and give worrying a fixed time, like twice a day half an hour',
        'a fixed daily rhythm (getting up, meals, bedtime), enough sleep, and something relaxing every day (music, reading, breathing exercises)',
        'most people recover from being overstrained in about 3 months; if self-help is not enough, see your GP (huisarts)',
      ],
      note: 'Avoid alcohol and drugs.',
      vraag: {
        nl: 'Wat geeft je op je werk de meeste stress: de hoeveelheid werk, een bepaalde situatie of iets anders? Dan zoeken we samen wat je als eerste kunt veranderen.',
        en: 'What causes you the most stress at work: the amount of work, a particular situation, or something else? Then we can find what to change first.',
        de: 'Was stresst dich bei der Arbeit am meisten: die Menge, eine bestimmte Situation oder etwas anderes? Dann suchen wir zusammen, was du zuerst ändern kannst.',
        fr: 'Qu’est-ce qui te stresse le plus au travail : la quantité de travail, une situation précise ou autre chose ? On cherche alors ensemble ce que tu peux changer en premier.',
        es: '¿Qué te causa más estrés en el trabajo: la cantidad de trabajo, una situación concreta u otra cosa? Así buscamos juntos qué cambiar primero.',
      },
      bron: 'https://www.thuisarts.nl/stress/ik-wil-beter-omgaan-met-stress',
    }),
    advies({
      id: 'rouw',
      keys: /overleden|overlijden|gestorven|rouw|begrafenis|crematie|passed away|\bdied\b|grief|grieving|funeral|verstorben|gestorben|trauer|beerdigung|d[ée]c[ée]d[ée]|deuil|enterrement|falleci|duelo|funeral/i,
      titel: 'Grief (Thuisarts.nl)',
      tips: [
        'grief takes time and everyone has their own pace; sadness, anger and trouble concentrating are normal',
        'talk with people you trust, and tell them what help you could use (like groceries or the household)',
        'memories help: look at photos or write things down',
        'keep fixed sleep and wake times, eat well, move every day, and keep doing things you enjoy',
        'peer support helps, also online; in the Netherlands the Rouwzorgloket (033 461 68 86) helps you find it',
        'see the GP (huisarts) if the grief does not get less after about 6 months, or if eating and sleeping no longer work',
      ],
      note: 'Avoid alcohol and sedatives.',
      vraag: {
        nl: 'Wil je iets vertellen over wie je mist? Of zullen we kijken hoe je de komende dagen een beetje doorkomt, met school of werk?',
        en: 'Would you like to tell me about the person you miss? Or shall we look at how to get through the next few days, with school or work?',
        de: 'Möchtest du mir von dem Menschen erzählen, den du vermisst? Oder schauen wir, wie du die nächsten Tage mit Schule oder Arbeit schaffst?',
        fr: 'Veux-tu me parler de la personne qui te manque ? Ou regardons-nous comment passer les prochains jours, avec l’école ou le travail ?',
        es: '¿Quieres contarme sobre la persona que echas de menos? ¿O vemos cómo pasar los próximos días, con los estudios o el trabajo?',
      },
      bron: 'https://www.thuisarts.nl/rouw/ik-rouw',
    }),
    advies({
      id: 'eenzaam',
      keys: /eenzaam|zo alleen|alleen voel|voel me alleen|geen vrienden|lonely|loneliness|feel alone|einsam|allein f[üu]hl|seul|solitude|me siento solo|soledad/i,
      titel: 'Loneliness (Thuisarts.nl)',
      tips: [
        'first figure out what you miss: someone to really talk to, a group, or one close friend',
        'join a club or group that fits your interests, like a walking group, a course, volunteering or the community centre (buurthuis)',
        'say yes to invitations; it takes time, and you often have to try several things',
        'tell someone you trust how you feel; in the Netherlands you can call or chat with De Luisterlijn or the MIND Hulplijn (0900 1450)',
        'if it is very strong, lasts long or comes with low mood, ask the GP (huisarts) or the neighbourhood team (wijkteam) for help',
      ],
      note: 'Loneliness usually does not pass by itself; don’t expect too much of one friendship.',
      vraag: {
        nl: 'Wat mis je het meest als je met je vrienden bent: echt kunnen praten, of het gevoel dat je erbij hoort? Dan denk ik met je mee over een eerste stap.',
        en: 'What do you miss most when you’re with your friends: really being able to talk, or feeling that you belong? Then I can think along about a first step.',
        de: 'Was fehlt dir am meisten, wenn du mit Freunden zusammen bist: wirklich reden zu können oder das Gefühl dazuzugehören? Dann denke ich mit dir über einen ersten Schritt nach.',
        fr: 'Qu’est-ce qui te manque le plus avec tes amis : pouvoir vraiment parler, ou te sentir à ta place ? Je réfléchis alors avec toi à un premier pas.',
        es: '¿Qué echas más de menos cuando estás con tus amigos: poder hablar de verdad o sentir que perteneces? Así pensamos juntos un primer paso.',
      },
      bron: 'https://www.thuisarts.nl/eenzaamheid/ik-voel-me-eenzaam',
    }),
    advies({
      id: 'schulden',
      keys: /schulden|schuld van|€\s?[\d.,]+\s*(euro )?schuld|geldzorgen|betalingsachterstand|achterstand (met|bij|op)|rood sta|aanmaning|incasso|deurwaarder|\bin debt\b|\bdebts?\b|owe money|schulden|mahnung|inkasso|dettes?|endett|deudas?|endeudad/i,
      titel: 'Debts in the Netherlands (Rijksoverheid, Nibud)',
      tips: [
        'free and anonymous help: Geldfit.nl or call 0800-8115',
        'the municipality (gemeente) offers free debt help (schuldhulpverlening) that may never cost money; within 4 weeks you hear what help you get',
        'make an overview of all income, costs and debts',
        'contact the creditor where you are behind, say you are working on a solution, and ask for a payment plan (betalingsregeling)',
        'telling someone you trust helps; many people feel relief after the first step',
      ],
      note: 'Never take a new loan to pay off debts.',
      vraag: {
        nl: 'Weet je bij wie je de schuld hebt, en loopt er al een aanmaning of incasso? Dan help ik je met wat je als eerste kunt doen, of met wat je tegen je ouders kunt zeggen.',
        en: 'Do you know who you owe the money to, and have you had a reminder or debt collection letter yet? Then I can help with a first step, or with what to tell someone close to you.',
        de: 'Weißt du, bei wem du Schulden hast, und kam schon eine Mahnung oder ein Inkasso-Brief? Dann helfe ich dir mit einem ersten Schritt.',
        fr: 'Sais-tu à qui tu dois l’argent, et as-tu déjà reçu un rappel ou une lettre de recouvrement ? Je t’aide alors avec une première étape.',
        es: '¿Sabes a quién debes el dinero y te ha llegado ya algún aviso o carta de cobro? Así te ayudo con un primer paso.',
      },
      wrong: [/(sluit|neem|afsluiten|nemen|take (out )?|get)[^.!?\n]{0,25}\b(nieuwe |extra |een )?(lening|krediet|loan|credit)\b[^.!?\n]{0,40}(af te lossen|te betalen|aflossen|pay (off|back)|to repay)/i],
      say: {
        nl: 'Sluit geen nieuwe lening af om schulden te betalen; vraag liever gratis hulp bij je gemeente of via Geldfit (0800-8115).',
        en: 'Don’t take a new loan to pay off debts; ask for free help from your municipality or via Geldfit (0800-8115) instead.',
        de: 'Nimm keinen neuen Kredit auf, um Schulden zu bezahlen; hol dir lieber kostenlose Hilfe bei einer Schuldnerberatung.',
        fr: 'Ne prends pas de nouveau crédit pour rembourser des dettes ; demande plutôt une aide gratuite à un service de conseil en dettes.',
        es: 'No pidas un nuevo préstamo para pagar deudas; pide mejor ayuda gratuita a un servicio de asesoría de deudas.',
      },
      bron: 'https://www.rijksoverheid.nl/onderwerpen/schulden/vraag-en-antwoord/hoe-kom-ik-van-mijn-schulden-af',
    }),
    advies({
      id: 'presentatie',
      keys: /presentatie|spreekbeurt|presenteren|presentation|present to|präsentation|referat|vortrag|expos[ée]|pr[ée]sentation|presentaci[óo]n|exposici[óo]n/i,
      titel: 'A good presentation (university guides: UvA, RUG, Utrecht, Leiden)',
      tips: [
        'start from one core message: a sentence with a clear point, not just a topic',
        'keep to 3 main points at most, each with an example, and say the structure out loud',
        'slides with little text: keywords, one idea per slide, simple images or graphs',
        'practise out loud alone at least once to check the time, then a full rehearsal with your slides for someone who gives feedback',
        'speak from a cheat sheet with keywords, not a written-out text; pause about 3 seconds after a key point and look at the whole audience',
        'put most care into the opening and the closing',
      ],
      vraag: {
        nl: 'Waar gaat je presentatie over, en hoe lang moet hij duren? Dan maak ik een opzet per dia voor je.',
        en: 'What is your presentation about, and how long should it be? Then I can make an outline per slide for you.',
        de: 'Worum geht es in deiner Präsentation, und wie lang soll sie sein? Dann mache ich dir eine Gliederung pro Folie.',
        fr: 'De quoi parle ta présentation, et combien de temps doit-elle durer ? Je te fais alors un plan diapo par diapo.',
        es: '¿De qué trata tu presentación y cuánto debe durar? Así te hago un esquema por diapositiva.',
      },
      bron: 'https://taalwinkel.uva.nl/studievaardigheden/presenteren/een-presentatie-maken/een-presentatie-maken.html',
    }),
    {
      id: 'hulp-nl',
      keys: /\b112\b|\b113\b|huisartsenpost|spoedeisende|eerste hulp|ambulance|noodnummer|alarmnummer|emergency number|notruf|num[ée]ro d.urgence|n[úu]mero de emergencia|zelfmoord|suïcid|suicid|suizid|suicide/i,
      fact: 'Emergency help in the EU: 112 (free, for danger to life, police, fire or ambulance). In the Netherlands, 113 Zelfmoordpreventie offers free help day and night: call 0800-0113 or chat via 113.nl. In Germany: TelefonSeelsorge 0800 111 0 111. In France: 3114. In Spain: 024. Outside office hours in the Netherlands, the GP out-of-hours service (huisartsenpost) helps with urgent problems that can’t wait.',
      bron: 'https://www.113.nl',
    },
  ];

  // Welke kaartjes passen bij deze vraag (hooguit twee, de vraag zelf en het vorige bericht tellen).
  function find(q, { max = 2 } = {}) {
    const text = String(q || '');
    return CARDS.map(c => ({ c, n: (text.match(new RegExp(c.keys.source, 'gi')) || []).length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, max).map(x => x.c);
  }
  // Zinnen met een bekende fout. Een zin met "niet", "not", "geen" … spreekt de fout juist tegen: die telt niet.
  const NEG = /(?<!\p{L})(niet|geen|nooit|not|no|never|isn['’]t|aren['’]t|doesn['’]t|don['’]t|nicht|kein\w*|nie|pas|ne|jamais|ni|nunca)(?!\p{L})/iu;
  // Een punt tussen twee cijfers (22.00, 1.5) is geen einde van een zin.
  const SENT = /(?:[^.!?\n]|(?<=\d)\.(?=\d))+[.!?]*/g;
  function wrongs(answer, cards) {
    const out = [];
    for (const s of String(answer).match(SENT) || []) {
      const neg = NEG.test(s);
      // keepNeg: de fout zelf zit in een ontkenning ("ik ben niet goed in emoties")
      for (const c of cards) if ((!neg || c.keepNeg) && c.wrong?.some(re => re.test(s)) && !c.unless?.test(s)) out.push({ card: c, sentence: s.trim() });
    }
    return out;
  }
  // Foute zinnen vervangen door de juiste zin (in de taal van het antwoord); zonder vertaling: de zin eruit.
  function correct(answer, found, lang = 'en') {
    let out = String(answer);
    const done = new Set();
    for (const { card, sentence } of found) {
      const fix = done.has(card.id) ? '' : card.say?.[lang] || card.say?.en || '';
      done.add(card.id);
      out = out.replace(sentence, fix);
    }
    return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  // Wat met de vraag meegaat naar de AI. Feiten achter elkaar; adviestips als genummerde lijst om over te nemen, alleen van het
  // best passende advieskaartje (twee lijsten tegelijk worden er te veel voor de kleine AI).
  // lang: de taal van het antwoord. Met alleen "in the language of the question" nam Melo voor Mac de Engelse tips letterlijk
  // over in een Nederlands antwoord ("Free and anonymous help", meting 22 okt); met de naam van de taal vertaalt hij ze.
  const LANG = { nl: 'Dutch', en: 'English', de: 'German', fr: 'French', es: 'Spanish' };
  function hint(cards, lang) {
    if (!cards.length) return '';
    const tips = cards.find(c => c.tips);
    const facts = cards.filter(c => !c.tips).map(c => c.fact);
    let out = facts.length ? ` Checked facts (use them, never contradict them): ${facts.join(' ')}` : '';
    if (tips) out += ` Checked tips, ${tips.titel}. Use these as your points, the first ones first, with their exact numbers, ${LANG[lang] ? `translated into ${LANG[lang]}` : 'written in the language of the question'}: ${tips.tips.map((t, i) => `${i + 1}. ${t}.`).join(' ')}${tips.note ? ' ' + tips.note : ''}`;
    return out;
  }
  // De gerichte slotvraag van het best passende kaartje, in de taal van het antwoord, of ''.
  const ask = (cards, lang = 'en') => { const c = cards.find(x => x.vraag); return c ? c.vraag[lang] || c.vraag.en : ''; };
  // Eindigt het antwoord niet met een vraag (de kleine AI vergeet hem vaak: meting 22 okt), dan komt de slotvraag eronder.
  function close(answer, cards, lang = 'en') {
    const t = String(answer).trim(), v = ask(cards, lang);
    if (!t || !v) return t;
    const last = t.split(/\n\s*\n/).at(-1);
    return /\?/.test(last) ? t : `${t}\n\n${v}`;
  }

  const api = { CARDS, find, wrongs, correct, hint, ask, close };
  globalThis.KameloKennis = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
