#!/usr/bin/env node
// Eén lijst voor het vangnet (hulplijn bij woorden over niet meer willen leven), op drie plekken gelijk.
// Bron: tools/vangnet.json. Dit script toetst de lijst (moetRaken / moetStil) en zet hem in
//   - de extensie: chat/guard.js (CRISIS)
//   - Melo voor Mac: <melo-mac>/Melo.swift (Chat.crisis), plus een kopie van vangnet.json voor toets.sh
//   - Melo voor iPhone: <melo-ios>/Gedeeld/MeloGesprek.swift (MeloRegels.crisis), plus een kopie voor toets.sh
// Gebruik:
//   node tools/vangnet.mjs --mac werkmappen/melo-mac --ios werkmappen/melo-ios-proef   bijwerken
//   node tools/vangnet.mjs --check [--mac …] [--ios …]                                   alleen kijken (exit 1 bij verschil)
// Zonder --mac/--ios alleen de extensie (zo draait npm test hem).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const pad = naam => { const i = args.indexOf(naam); return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : null; };

const bron = path.join(root, 'tools/vangnet.json');
const tekst = fs.readFileSync(bron, 'utf8');
const lijst = JSON.parse(tekst);
const fouten = [];

// 1. De lijst zelf: elke crisiszin raakt, geen gewone zin. Patronen die Swift (ICU) anders leest, mogen er niet in.
for (const p of lijst.crisis) {
  if (/\\p\{|\(\?<[^=!]|"#/.test(p)) fouten.push(`patroon werkt niet in alle drie: ${p}`);
  try { new RegExp(p, 'i'); } catch (e) { fouten.push(`ongeldig patroon: ${p} (${e.message})`); }
}
const R = new RegExp(lijst.crisis.join('|'), 'i');
for (const q of lijst.moetRaken) if (!R.test(q)) fouten.push(`geen hulplijn bij: ${q}`);
for (const q of lijst.moetStil) if (R.test(q)) fouten.push(`vals alarm bij: ${q} (raakt "${q.match(R)[0]}")`);

// 2. De lijst als code, regels van hoogstens ~120 tekens.
function regels(items, inspringen, max = 120) {
  const uit = []; let r = '';
  for (const it of items) {
    if (r && inspringen.length + r.length + it.length + 2 > max) { uit.push(inspringen + r.trimEnd()); r = ''; }
    r += it + ', ';
  }
  if (r) uit.push(inspringen + r.trimEnd());
  return uit.join('\n').replace(/,$/, '');
}
const js = p => (p.includes("'") ? `"${p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : `'${p.replace(/\\/g, '\\\\')}'`);
const swift = p => `#"${p}"#`;

const doelen = [{
  naam: 'extensie', bestand: path.join(root, 'chat/guard.js'),
  blok: /(const CRISIS = new RegExp\(\[\n)[\s\S]*?(\n  \]\.join\('\|'\), 'i'\);)/,
  code: regels(lijst.crisis.map(js), '    ') + ',',
}];
for (const [naam, map, swiftBestand] of [['Mac', pad('--mac'), 'Melo.swift'], ['iPhone', pad('--ios'), 'Gedeeld/MeloGesprek.swift']]) {
  if (!map) continue;
  if (!fs.existsSync(path.join(map, swiftBestand))) { fouten.push(`${naam}: ${swiftBestand} niet gevonden in ${map}`); continue; }
  doelen.push({
    naam, bestand: path.join(map, swiftBestand),
    blok: /(static let crisis = try! NSRegularExpression\(pattern: \[\n)[\s\S]*?(\n  \]\.joined\(separator: "\|"\), options: \[\.caseInsensitive\]\))/,
    code: regels(lijst.crisis.map(swift), '    '),
  });
  doelen.push({ naam: `${naam} (kopie)`, bestand: path.join(map, 'vangnet.json'), heel: tekst });
}

const anders = [];
for (const d of doelen) {
  const oud = fs.existsSync(d.bestand) ? fs.readFileSync(d.bestand, 'utf8') : '';
  let nieuw = d.heel;
  if (nieuw === undefined) {
    if (!d.blok.test(oud)) { fouten.push(`${d.naam}: de crisislijst staat niet waar hij hoort in ${d.bestand}`); continue; }
    nieuw = oud.replace(d.blok, (_, a, b) => a + d.code + b);
  }
  if (nieuw === oud) continue;
  anders.push(`${d.naam}: ${path.relative(process.cwd(), d.bestand)}`);
  if (!check) fs.writeFileSync(d.bestand, nieuw);
}

if (fouten.length) { console.error('vangnet:\n  ' + fouten.join('\n  ')); process.exit(1); }
if (check && anders.length) { console.error('vangnet loopt niet gelijk met tools/vangnet.json (draai node tools/vangnet.mjs …):\n  ' + anders.join('\n  ')); process.exit(1); }
console.log(`vangnet: ${lijst.crisis.length} patronen, ${lijst.moetRaken.length} crisiszinnen raak, ${lijst.moetStil.length} gewone zinnen stil` +
  (anders.length ? `; bijgewerkt: ${anders.join(', ')}` : '; alles gelijk'));
