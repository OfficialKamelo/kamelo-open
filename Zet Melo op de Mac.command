#!/bin/bash
# Dubbelklik: Melo voor Mac bouwen en in Programma's zetten (22 okt 2026, Lucas: "zet de melo app op mijn laptop").
# Stuurt niets naar buiten. Wat er gebeurt staat ook in werkmappen/melo-mac/installeer.txt, zodat Claude kan meelezen.
# Vooraf: Xcode 26 (Settings → Accounts ingelogd met het Kamelo-team) en Apple Intelligence aan op de Mac.
cd "$HOME/KAMELO/werkmappen/melo-mac" || { echo "Map niet gevonden"; read x; exit 1; }
LOG="$PWD/installeer.txt"; : > "$LOG"
exec > >(tee -a "$LOG") 2>&1
stop() { echo; echo "✗ $1"; echo "Zeg het tegen Claude: die leest werkmappen/melo-mac/installeer.txt."; read -p "Enter om te sluiten. " x; exit 1; }

echo "== 1. Melo bouwen (branch $(git branch --show-current 2>/dev/null))"
if ! sh bouw.sh; then
  [ -d Melo.app ] || stop "Bouwen mislukt en er is geen oudere Melo.app."
  printf "\nBouwen mislukt. De oudere Melo.app van %s gebruiken? (j/n) " "$(stat -f %Sm -t '%d %b' Melo.app)"; read a
  [ "$a" = j ] || stop "Gestopt: bouwen mislukt."
fi

echo; echo "== 2. In Programma's zetten"
DOEL=/Applications/Melo.app
osascript -e 'tell application id "eu.kamelo.melo" to quit' >/dev/null 2>&1; sleep 1
if [ -d "$DOEL" ]; then
  printf "Er staat al een Melo in Programma's. Vervangen door deze? (j/n) "; read a
  [ "$a" = j ] || stop "Gestopt: bestaande Melo niet vervangen."
  rm -rf "$DOEL" || stop "Oude Melo weghalen lukt niet."
fi
ditto Melo.app "$DOEL" || stop "Kopiëren naar Programma's mislukt."
codesign --verify --strict "$DOEL" || stop "Handtekening klopt niet."
echo "✓ $(plutil -extract CFBundleShortVersionString raw "$DOEL/Contents/Info.plist") staat in Programma's"

echo; echo "== 3. Melo openen"
open "$DOEL"
echo "✓ Melo staat in Programma's en in Launchpad. Vastzetten in het Dock: rechtsklik op het icoon → Opties → Houd in Dock."
read -p "Klaar. Enter om te sluiten. " x
