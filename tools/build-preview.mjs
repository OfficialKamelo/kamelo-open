// Maakt demo/popup-preview.html uit popup/popup.html: dezelfde popup, maar met een nagebootste chrome-API en
// voorbeeldgegevens, zodat hij buiten de extensie te openen is (voor screenshots). Nooit met de hand aanpassen.
// Gebruik: node tools/build-preview.mjs        (tests/preview.test.js controleert of hij bijgewerkt is)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${root}demo/popup-preview.html`;

// Eerst de nagebootste extensie (seed, chrome-API, achtergrond), dan de scripts van de popup zelf.
const SHIM = ['popup-seed.js', 'chrome-shim.js', '../src/vaultcrypto.js', '../src/vaultstore.js', '../src/background.js'];

export function buildPreview(popupHtml) {
  const body = popupHtml.slice(popupHtml.indexOf('<body>') + 6, popupHtml.indexOf('  <script'));
  const popupScripts = [...popupHtml.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m => (m[1].startsWith('../') ? m[1] : `../popup/${m[1]}`));
  const scripts = [...new Set([...SHIM, ...popupScripts])];
  return `<!doctype html>
<!-- Gemaakt door tools/build-preview.mjs uit popup/popup.html. Niet met de hand aanpassen. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Popup preview</title>
  <style>html { background: #555 !important } body { margin: 24px auto !important; border-radius: 12px }</style>
  <link rel="stylesheet" href="../popup/popup.css">
</head>
<body>${body}${scripts.map(src => `  <script src="${src}"></script>\n`).join('')}</body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUT, buildPreview(fs.readFileSync(`${root}popup/popup.html`, 'utf8')));
  console.log('demo/popup-preview.html');
}
