#!/bin/sh
# Dubbelklik: Melo voor kamelo.eu proberen op deze Mac, met WhatsApp, Berichten, Slack en Mail (23 okt 2026). Stuurt niets weg.
# Melo leest alleen als jij ⌃⌥M indrukt, alleen het venster vooraan, en verstuurt nooit zelf.
APP="$HOME/KAMELO/werkmappen/melo-mac-yourai/build-direct/Melo.app"
[ -d "$APP" ] || { echo "Nog niet gebouwd: vraag Claude 'bouw Melo voor kamelo.eu'."; read x; exit 1; }
osascript -e 'tell application "Melo" to quit' 2>/dev/null; sleep 1
open "$APP"
cat <<TEKST

Melo voor kamelo.eu staat open. Zo probeer je het:
1. Systeeminstellingen › Privacy en beveiliging › Toegankelijkheid: zet Melo aan (macOS vraagt het ook de eerste keer).
2. Open WhatsApp en een chat met een vraag erin.
3. Druk ⌃⌥M. Melo laat drie antwoorden zien; klik er één, dan staat het in het invoerveld. Versturen doe jij.
4. In Mail: selecteer een bericht en druk ⌃⌥M; je kiest een antwoord en Mail opent een concept.
Zeg tegen Claude wat er goed en fout ging (geen inhoud van je chats nodig).
TEKST
read x
