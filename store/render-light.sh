#!/bin/sh
# Rendert de lichte winkelafbeeldingen (store/screenshots-light.html) naar store/images-light/{en,nl}/,
# plus het logo van 300×300 voor Microsoft Edge Add-ons.
# Chrome Web Store: screenshot 1–5. Edge (max. 6): 1–6.
# Gebruik: sh store/render-light.sh   (vanuit de projectmap; gebruikt Google Chrome headless)
set -e
cd "$(dirname "$0")/.."
for lang in en nl; do
  out="store/images-light/$lang"; mkdir -p "$out"
  for n in 1 2 3 4 5 6; do node tools/screenshot.mjs "store/screenshots-light.html?shot=$n&lang=$lang" "$out/screenshot-$n.png" 1280 800; done
  node tools/screenshot.mjs "store/screenshots-light.html?shot=marquee&lang=$lang" "$out/promo-marquee-1400x560.png" 1400 560
  node tools/screenshot.mjs "store/screenshots-light.html?shot=small&lang=$lang" "$out/promo-small-440x280.png" 440 280
done
node tools/screenshot.mjs "store/logo.html" "store/images-light/logo-300x300.png" 300 300
