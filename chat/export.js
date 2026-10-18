// Een antwoord van Melo bewaren: als Word-bestand (.docx), als pdf (via de afdrukpagina chat/doc.html) of gekopieerd.
// Alles gebeurt op dit apparaat; er gaat niets naar een server. Het Word-bestand bouwen we zelf (een docx is een zip met
// een paar XML-bestanden); grafieken gaan erin als plaatje, formules als leesbare tekst (x², √x).
(() => {
  'use strict';
  const R = globalThis.KameloRich;

  // ---------- zip (zonder compressie: Word leest dat prima, en het blijft klein genoeg) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) { // [{ name, data: Uint8Array }]
    const enc = new TextEncoder(), parts = [], dir = [];
    let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const head = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, name.length, 2], [28, 0, 2]]
        .forEach(([o, v, s]) => (s === 4 ? head.setUint32(o, v, true) : head.setUint16(o, v, true)));
      parts.push(new Uint8Array(head.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, name.length, 2],
        [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]].forEach(([o, v, s]) => (s === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true)));
      dir.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + n;
    }
    const size = dir.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, off, 4]].forEach(([o, v, s]) => (s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
    return new Blob([...parts, ...dir, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- grafiek als plaatje (voor Word): de SVG met vaste, lichte kleuren op een canvas ----------
  const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  function svgString(fig) {
    const svg = fig.kids.find(k => k.tag === 'svg');
    const paint = n => {
      if (typeof n === 'string') return n;
      const cls = n.attrs.class || '', s = cls.match(/\bs(\d)\b/), col = s ? COLORS[s[1] - 1] : null;
      const a = { ...n.attrs };
      if (/\bgrid\b/.test(cls)) Object.assign(a, { stroke: '#ececef', 'stroke-width': 1 });
      if (/\baxis\b/.test(cls)) Object.assign(a, { stroke: '#c7c7cc', 'stroke-width': 1 });
      if (/\btick\b/.test(cls)) Object.assign(a, { fill: '#6e6e73', 'font-size': 10, 'font-family': 'Helvetica, Arial, sans-serif' });
      if (/\btotal\b/.test(cls)) Object.assign(a, { fill: '#1d1d1f', 'font-size': 18, 'font-weight': 600, 'font-family': 'Helvetica, Arial, sans-serif' });
      if (/\bln\b/.test(cls)) Object.assign(a, { fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      if (/\b(bar)\b/.test(cls)) Object.assign(a, { fill: col });
      if (/\b(dot|slice)\b/.test(cls)) Object.assign(a, { fill: col, stroke: '#fff', 'stroke-width': 2 });
      return { ...n, attrs: a, kids: n.kids.filter(k => k.tag !== 'title').map(paint) };
    };
    const out = paint(svg);
    out.attrs = { ...out.attrs, xmlns: 'http://www.w3.org/2000/svg', width: 680, height: 420 };
    return R.toXml(out);
  }
  async function png(fig) {
    const url = URL.createObjectURL(new Blob([svgString(fig)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = url; });
      const c = Object.assign(document.createElement('canvas'), { width: 1360, height: 840 });
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
      return new Uint8Array(await blob.arrayBuffer());
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- boom (chat/rich.js) → WordprocessingML ----------
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Formule (MathML-boom) als leesbare tekst: x², √x, (a)/(b).
  const mathText = n => R.treeText(n).replace(/ {2,}/g, ' ').trim();
  const plainOf = n => (typeof n === 'string' ? n : n.tag === 'math' ? mathText(n) : n.tag === 'br' ? '\n' : n.kids.map(plainOf).join(''));
  function runs(nodes, fmt = {}) {
    const out = [];
    for (const n of nodes) {
      if (typeof n === 'string') { out.push(run(n, fmt)); continue; }
      if (n.tag === 'b') out.push(...runs(n.kids, { ...fmt, b: true }));
      else if (n.tag === 'i') out.push(...runs(n.kids, { ...fmt, i: true }));
      else if (n.tag === 'code') out.push(run(plainOf(n), { ...fmt, code: true }));
      else if (n.tag === 'math') out.push(run(mathText(n), { ...fmt, math: true }));
      else if (n.tag === 'br') out.push('<w:r><w:br/></w:r>');
      else out.push(...runs(n.kids, fmt));
    }
    return out;
  }
  function run(t, f) {
    const pr = [f.b && '<w:b/>', f.i && '<w:i/>', f.code && '<w:rFonts w:ascii="Menlo" w:hAnsi="Menlo" w:cs="Menlo"/><w:sz w:val="20"/>',
      f.math && '<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>'].filter(Boolean).join('');
    return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  }
  const para = (inner, style = '', extra = '') => `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>` : ''}${inner}</w:p>`;
  async function body(nodes, media) {
    const out = [];
    for (const n of nodes) {
      if (n.tag === 'h3') out.push(para(runs(n.kids).join(''), 'Heading1'));
      else if (n.tag === 'h4') out.push(para(runs(n.kids).join(''), 'Heading2'));
      else if (n.tag === 'p') out.push(para(runs(n.kids).join('')));
      else if (n.tag === 'hr') out.push(para('', '', '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="E5E5EA"/></w:pBdr>'));
      else if (n.tag === 'ul' || n.tag === 'ol') {
        const list = (l, depth) => l.kids.forEach((li, k) => {
          const sub = li.kids.filter(c => c.tag === 'ul' || c.tag === 'ol');
          const mark = l.tag === 'ol' ? `${(l.attrs.start || 1) + k}.\t` : '•\t';
          out.push(para(run(mark, {}) + runs(li.kids.filter(c => !sub.includes(c))).join(''), '', `<w:ind w:left="${360 + depth * 360}" w:hanging="360"/>`));
          sub.forEach(s => list(s, depth + 1));
        });
        list(n, 0);
      } else if (n.tag === 'pre') {
        plainOf(n).split('\n').forEach(l => out.push(para(run(l, { code: true }), '', '<w:spacing w:after="0"/>')));
      } else if (n.attrs?.class === 'mathblock') {
        out.push(para(run(mathText(n.kids[0]), { math: true }), '', '<w:jc w:val="center"/>'));
      } else if (n.attrs?.class === 'tablewrap') {
        const t = n.kids[0], rows = [...t.kids[0].kids, ...t.kids[1].kids];
        const cell = (c, head) => `<w:tc><w:tcPr><w:tcBorders><w:bottom w:val="single" w:sz="4" w:color="E5E5EA"/></w:tcBorders></w:tcPr>${para(runs(c.kids, head ? { b: true } : {}).join(''), '', c.attrs.class === 'r' ? '<w:jc w:val="right"/>' : '')}</w:tc>`;
        out.push(`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblCellMar><w:right w:w="160" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows.map((r, i) => `<w:tr>${r.kids.map(c => cell(c, i === 0)).join('')}</w:tr>`).join('')}</w:tbl>`, para(''));
      } else if (n.tag === 'figure') {
        const cap = n.kids.find(k => k.tag === 'figcaption');
        if (cap) out.push(para(runs(cap.kids, { b: true }).join('')));
        try {
          const data = await png(n), id = media.length + 1;
          media.push({ name: `word/media/image${id}.png`, data });
          const cx = 5486400, cy = Math.round(cx * 210 / 340); // 15,24 cm breed
          out.push(para(`<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Grafiek ${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="image${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="img${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`));
        } catch (e) { console.warn('Kamelo: grafiek als plaatje', e); }
        const legend = n.kids.find(k => k.attrs?.class === 'legend');
        if (legend) out.push(para(run(legend.kids.map(plainOf).join(' · '), { i: true })));
      } else if (n.kids?.length) out.push(para(runs(n.kids).join('')));
    }
    return out.join('');
  }

  // text: het antwoord zoals de AI het schreef (met de echte gegevens al teruggezet); title: bovenaan en als bestandsnaam.
  async function docx(text, { title = '', lang = 'en' } = {}) {
    const nodes = R.parse(text, { lang });
    const media = [];
    const first = nodes[0]?.tag === 'h3' ? '' : title ? para(run(title, {}), 'Title') : '';
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${first}${await body(nodes, media)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const enc = new TextEncoder();
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="${x(lang)}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style></w:styles>';
    const rels = media.map((m, i) => `<Relationship Id="img${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.png"/>`).join('');
    return zip([
      { name: '[Content_Types].xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>') },
      { name: '_rels/.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
      { name: 'word/_rels/document.xml.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels}</Relationships>`) },
      { name: 'word/document.xml', data: enc.encode(xml) },
      { name: 'word/styles.xml', data: enc.encode(styles) },
      ...media,
    ]);
  }

  // Bestandsnaam uit de titel: "Sollicitatiebrief supermarkt.docx".
  const fileName = (title, ext) => `${(title || 'Melo').replace(/[\\/:*?"<>|#%\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Melo'}.${ext}`;
  // Een titel voor het document: het eerste kopje, anders de vraag.
  const titleOf = (text, fallback) => (String(text).match(/^\s{0,3}#{1,3}\s+(.+?)\s*#*\s*$/m)?.[1] || fallback || '').replace(/\*\*/g, '');
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  // Kopiëren: als tekst met formules leesbaar (geen LaTeX-codes) en grafieken als hun getallen.
  function plainText(text) {
    return String(text).replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => R.texText(a ?? b))
      .replace(/\\\((.+?)\\\)/g, (_, a) => R.texText(a))
      .replace(/(?<!\$)\$(?!\s)([^$\n]*?[^\s$\\])\$(?!\d)/g, (m, a) => (/[\\^_=+\-*/]/.test(a) ? R.texText(a) : m))
      // Alleen de hekjes van een grafiekblok weg (opener met zijn eigen sluiter); codeblokken houden de hunne.
      .replace(/^[ \t]*```+[ \t]*(?:chart|graph|grafiek|plot)[ \t]*\n([\s\S]*?)(?:^[ \t]*```+[ \t]*$|(?![\s\S]))/gim, '$1')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1').trim();
  }

  const api = { docx, zip, crc32, fileName, titleOf, download, plainText, svgString };
  globalThis.KameloExport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
