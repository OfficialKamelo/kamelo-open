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
  const SENT = /[^.!?\n]+[.!?]*/g;
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
  // Wat met de vraag meegaat naar de AI.
  const hint = cards => (cards.length ? ` Checked facts (use them, never contradict them): ${cards.map(c => c.fact).join(' ')}` : '');

  const api = { CARDS, find, wrongs, correct, hint };
  globalThis.KameloKennis = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
