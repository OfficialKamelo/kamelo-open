// Zet het nieuws op kamelo.eu/news (website/news.html) uit CHANGELOG.md en tools/news-items.json.
// Elke versie komt er vanzelf op; npm run release draait dit mee. Met de hand: node tools/news.mjs
// Titel en tekst per versie staan in news-items.json; ontbreken ze, dan het eerste vetgedrukte punt uit de changelog.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHANGELOG_URL = 'https://github.com/OfficialKamelo/kamelo-open/blob/main/CHANGELOG.md';
const ART = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => s.replace(/\*\*|`/g, '').trim();
const shortDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
// Het anker dat GitHub maakt voor "## [1.3.3] - 2026-10-11": "133---2026-10-11".
const anchor = (version, date) => `${version.replace(/\./g, '')}---${date}`;
const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.order - a.order);

// Alle uitgebrachte versies uit de changelog (zonder [Unreleased]), met hun secties.
export function versions(changelog) {
  const out = [];
  const re = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=^## \[|^\[Unreleased\]:|(?![\s\S]))/gm;
  for (const [, version, date, body] of changelog.matchAll(re)) {
    const sections = [...body.matchAll(/^### (\w+)/gm)].map(m => m[1]);
    const bold = body.match(/^- \*\*(.+?)\*\*\s*(.*)$/m);
    const first = body.match(/^- (.+)$/m);
    out.push({ version, date, sections, bold: bold && { title: plain(bold[1]).replace(/[.:]$/, ''), text: plain(bold[2]) }, first: first && plain(first[1]) });
  }
  return out;
}

// Beveiliging als dat het enige is wat er in een versie zit; anders een gewone release.
export function entries(changelog, items) {
  const list = versions(changelog).map(v => {
    const own = items.versions?.[v.version];
    const title = own?.title || v.bold?.title || `Kamelo ${v.version}`;
    const text = own?.text || v.bold?.text || v.first || '';
    const security = v.sections.length > 0 && v.sections.every(s => s === 'Security');
    const [maj, min, pat] = v.version.split('.').map(Number);
    return { date: v.date, order: maj * 1e6 + min * 1e3 + pat + 0.5, kind: security ? 'Security' : 'Release',
      title, text, label: v.version, url: own?.url || `${CHANGELOG_URL}#${anchor(v.version, v.date)}` };
  });
  for (const m of items.milestones || []) list.push({ ...m, order: 0 });
  return list.sort(byNewest);
}

export function render(list) {
  return list.map((e, i) => `        <li class="nw-card" data-kind="${esc(e.kind.toLowerCase())}">
          <a href="${esc(e.url)}">
            <div class="nw-art ${ART[i % ART.length]}"><span>${esc(e.label)}</span></div>
            <h2>${esc(e.title)}</h2>
            <p>${esc(e.text)}</p>
            <div class="nw-meta"><span>${esc(e.kind)}</span><time datetime="${e.date}">${shortDate(e.date)}</time></div>
          </a>
        </li>`).join('\n');
}

// Vervangt alles tussen <!-- news:start --> en <!-- news:end -->.
export function updatePage(html, list) {
  const start = '<!-- news:start -->', end = '<!-- news:end -->';
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error('news.html mist <!-- news:start --> en <!-- news:end -->');
  return `${html.slice(0, a + start.length)}\n${render(list)}\n        ${html.slice(b)}`;
}

// Zonder website/ (zoals in de openbare repo kamelo-open) doet dit niets en geeft het null terug.
export function buildNews(root = ROOT, { write = true } = {}) {
  const file = name => path.join(root, name);
  if (!fs.existsSync(file('website/news.html'))) return null;
  const list = entries(fs.readFileSync(file('CHANGELOG.md'), 'utf8'), JSON.parse(fs.readFileSync(file('tools/news-items.json'), 'utf8')));
  const page = updatePage(fs.readFileSync(file('website/news.html'), 'utf8'), list);
  const map = fs.readFileSync(file('website/sitemap.xml'), 'utf8')
    .replace(/(<loc>https:\/\/kamelo\.eu\/news<\/loc><lastmod>)[\d-]+/, `$1${list[0].date}`);
  if (write) {
    fs.writeFileSync(file('website/news.html'), page);
    fs.writeFileSync(file('website/sitemap.xml'), map);
  }
  return list;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = buildNews();
  if (!list) { console.log('Geen website/news.html: niets te doen.'); process.exit(0); }
  console.log(`website/news.html: ${list.length} berichten, nieuwste: ${list[0].title} (${list[0].date})`);
}
