// Melo's antwoorden met opmaak: kopjes, lijsten, tabellen, code, formules (LaTeX → MathML) en grafieken (SVG).
// De AI van Chrome is klein: hij schrijft alleen tekst. Kamelo tekent die tekst hier, op dit apparaat:
//   ```chart                       ```chart
//   type: bar                      type: function
//   title: Omzet (× €1000)         f: x^2 - 4
//   x: 2022, 2023, 2024            x: -5 to 5
//   Product A: 120, 150, 180       ```
//   ```
// en $a^2 + b^2 = c^2$ (in de zin) of $$\frac{1}{2}mv^2$$ (op een eigen regel). Functies rekent Kamelo zelf uit, dus
// een parabool klopt altijd, ook als de AI zich verrekent.
// Veilig: alles wordt als tekst of als element opgebouwd, nooit als HTML; geen eval (mag ook niet in een extensie).
(() => {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg', MML = 'http://www.w3.org/1998/Math/MathML';

  // ---------- kleine boom, daarna pas DOM (zo is alles ook zonder browser te testen) ----------
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids: kids.flat(Infinity).filter(k => k != null && k !== false && k !== '') });
  function toDom(node, doc, ns) {
    if (typeof node === 'string' || typeof node === 'number') return doc.createTextNode(String(node));
    const space = node.tag === 'svg' ? SVG : node.tag === 'math' ? MML : ns;
    const el = space ? doc.createElementNS(space, node.tag) : doc.createElement(node.tag);
    for (const [k, v] of Object.entries(node.attrs)) if (v != null && v !== false) el.setAttribute(k, String(v));
    for (const k of node.kids) el.append(toDom(k, doc, space));
    return el;
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const toXml = node => typeof node === 'string' || typeof node === 'number' ? esc(node)
    : `<${node.tag}${Object.entries(node.attrs).filter(([, v]) => v != null && v !== false).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')}>${node.kids.map(toXml).join('')}</${node.tag}>`;

  // ---------- rekenen: een formule als f(x), zonder eval ----------
  const FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, wortel: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log,
    log: Math.log10, log10: Math.log10, log2: Math.log2, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  };
  const CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E, tau: 2 * Math.PI };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  // "y = 2x² − 4", "f(x)=sin(x)/x", "\frac{1}{x}": allemaal naar één vorm die de parser kent.
  function tidyExpr(src) {
    return String(src).trim()
      .replace(/^\s*(?:[a-z]\s*\(\s*x\s*\)|y)\s*=\s*/i, '')
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\(cdot|times)/g, '*').replace(/\\(left|right)/g, '').replace(/\\([a-z]+)/gi, '$1').replace(/[{}]/g, m => (m === '{' ? '(' : ')'))
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, m => `^(${[...m].map(c => SUP[c]).join('')})`)
      .replace(/[−–]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt').replace(/,(?=\d)/g, '.');
  }
  function compile(src) {
    const s = tidyExpr(src);
    const toks = [];
    const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|([a-zπ]+\d*)|(\*\*|[-+*/^()|!]))/giy;
    let m, at = 0;
    while (at < s.length) {
      re.lastIndex = at;
      m = re.exec(s);
      if (!m || m.index !== at) { if (/^\s*$/.test(s.slice(at))) break; return null; }
      at = re.lastIndex;
      if (m[1]) toks.push({ n: parseFloat(m[1]) });
      else if (m[2]) {
        // "xsin" of "2pix": losse namen uit elkaar halen (x, constanten en functies)
        let w = m[2].toLowerCase();
        while (w) {
          const f = Object.keys(FN).sort((a, b) => b.length - a.length).find(k => w.startsWith(k));
          const c = Object.keys(CONST).sort((a, b) => b.length - a.length).find(k => w.startsWith(k));
          if (f && (!c || f.length >= c.length)) { toks.push({ f }); w = w.slice(f.length); }
          else if (c) { toks.push({ n: CONST[c] }); w = w.slice(c.length); }
          else if (w[0] === 'x' || w[0] === 't') { toks.push({ x: 1 }); w = w.slice(1); }
          else return null;
        }
      } else toks.push({ o: m[3] === '**' ? '^' : m[3] });
    }
    let i = 0;
    const peek = () => toks[i], take = () => toks[i++];
    const startsAtom = t => t && (t.n != null || t.x || t.f || t.o === '(' || t.o === '|');
    // expr := term (('+'|'-') term)* ; term := unary (('*'|'/'|naast elkaar) unary)* ; unary := '-' unary | power
    // power := postfix ('^' unary)? ; postfix := atom '!'?
    function expr() {
      let a = term();
      while (peek()?.o === '+' || peek()?.o === '-') { const o = take().o, b = term(), l = a; a = o === '+' ? x => l(x) + b(x) : x => l(x) - b(x); }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        const t = peek();
        if (t?.o === '*' || t?.o === '/') { take(); const b = unary(), l = a; a = t.o === '*' ? x => l(x) * b(x) : x => l(x) / b(x); }
        else if (startsAtom(t) && !(t.o === '|' && inAbs)) { const b = power(), l = a; a = x => l(x) * b(x); } // 2x, 3sin(x), (x+1)(x-1)
        else return a;
      }
    }
    function unary() {
      if (peek()?.o === '-') { take(); const a = unary(); return x => -a(x); }
      if (peek()?.o === '+') { take(); return unary(); }
      return power();
    }
    function power() {
      const a = postfix();
      if (peek()?.o === '^') { take(); const b = unary(); return x => Math.pow(a(x), b(x)); }
      return a;
    }
    function postfix() {
      let a = atom();
      while (peek()?.o === '!') { take(); const l = a; a = x => { const n = l(x); if (n < 0 || n > 170 || n % 1) return NaN; let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; }; }
      return a;
    }
    let inAbs = false;
    function atom() {
      const t = take();
      if (!t) throw 0;
      if (t.n != null) return () => t.n;
      if (t.x) return x => x;
      if (t.f) {
        const fn = FN[t.f];
        // sin x, sin(x), sin^2 x
        let p = null;
        if (peek()?.o === '^') { take(); const e = atom(); p = e; }
        const arg = peek()?.o === '(' ? atom() : power();
        return p ? x => Math.pow(fn(arg(x)), p(x)) : x => fn(arg(x));
      }
      if (t.o === '(') { const a = expr(); if (take()?.o !== ')') throw 0; return a; }
      if (t.o === '|') { const was = inAbs; inAbs = true; const a = expr(); inAbs = was; if (take()?.o !== '|') throw 0; return x => Math.abs(a(x)); }
      throw 0;
    }
    try {
      const f = expr();
      if (i !== toks.length) return null;
      return x => { const y = f(x); return Number.isFinite(y) ? y : NaN; };
    } catch { return null; }
  }

  // ---------- grafiek: tekst → beschrijving ----------
  const TYPES = [
    [/stack|gestapel|opgestapel|apil|gestapelt|empil/i, 'stacked'],
    [/pie|taart|cirkel|donut|kreis|camembert|circular|tarta|quesito/i, 'pie'],
    [/func|plot|parab|formule|formula|fonction|funci/i, 'function'],
    [/line|lijn|linie|ligne|l[ií]nea|trend|area/i, 'line'],
    [/bar|staaf|kolom|column|s[äa]ule|balken|barre|histo|barra|columna/i, 'bar'],
  ];
  const normType = t => (TYPES.find(([re]) => re.test(t)) || [])[1] || '';
  const KEY = {
    type: /^(type|soort|kind|chart|grafiek|typ|tipo)$/i,
    title: /^(title|titel|titre|t[ií]tulo|naam|name)$/i,
    labels: /^(x|labels?|categor\w*|kategorie\w*|cat[ée]gories?|jaren|years?|maanden|months?|etiquetas|x[- ]?(as|axis|achse|axe|eje)|x[- ]?labels?)$/i,
    unit: /^(y|unit|eenheid|einheit|unit[ée]|unidad|y[- ]?(as|axis|achse|axe|eje)|y[- ]?label)$/i,
    range: /^(range|bereik|domain|domein|x[- ]?range|from|van|interval|intervalle|rango|bereich)$/i,
    source: /^(source|bron|quelle|fuente|note|noot)$/i,
  };
  // Getallen zoals de AI ze schrijft: 1.234,5 (nl/de), 1,234.5 (en), €120k, 45%, −3.
  function num(v) {
    let s = String(v).trim().replace(/[−–]/g, '-').replace(/\s/g, '');
    const k = /[0-9](k|K|duizend)$/.test(s) ? 1e3 : /[0-9](m|M|mln|miljoen)$/.test(s) ? 1e6 : /[0-9](bn|mld|miljard)$/i.test(s) ? 1e9 : 1;
    s = s.replace(/[^0-9.,-]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n * k : null;
  }
  const splitList = v => String(v).replace(/^\s*\[|\]\s*$/g, '').split(/\s*[;|]\s*|,\s+|\t|\s{2,}|,(?=\D)|(?<=\D),/).map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const numbers = v => { const l = splitList(v).map(num); return l.length && l.every(n => n != null) ? l : null; };
  // "-5 to 5", "-5..5", "van -2π tot 2π", "[0, 10]": de eerste twee getallen (met π) in de tekst.
  function rangeOf(v) {
    const found = String(v).replace(/[−–]/g, '-').match(/-?\s*(?:\d+(?:[.,]\d+)?\s*)?(?:π|pi\b)|-?\s*(?:π|pi\b)|-?\d+(?:[.,]\d+)?/gi);
    if (!found || found.length < 2) return null;
    const val = t => { t = t.replace(/\s/g, '').replace(/pi/i, 'π'); if (!t.includes('π')) return num(t); const k = t.replace('π', ''); return (k === '' ? 1 : k === '-' ? -1 : num(k)) * Math.PI; };
    const a = val(found[0]), b = val(found[1]);
    return a != null && b != null && a !== b ? [Math.min(a, b), Math.max(a, b)] : null;
  }
  const looksLikeFn = v => /x/i.test(v) && /[x\d)]\s*([-+*/^²³]|$)|sin|cos|tan|sqrt|log|ln|exp|\|x/i.test(v) && !!compile(v);

  function parseChart(body, hint = '') {
    const src = String(body || '').trim();
    if (!src) return null;
    if (/^[{[]/.test(src)) { try { return fromJson(JSON.parse(src)); } catch { /* geen JSON: toch als regels proberen */ } }
    const spec = { type: normType(hint), title: '', labels: null, unit: '', series: [], fns: [], range: null, source: '' };
    for (const raw of src.split('\n')) {
      const line = raw.replace(/^\s*[-*•]\s+/, '').trim();
      if (!line || /^```/.test(line)) continue;
      // "y = x^2 - 4" of "f(x) = ..." zonder dubbele punt
      const eq = line.match(/^((?:[a-z]\s*\(\s*x\s*\))|y\d?)\s*=\s*(.+)$/i);
      if (eq && compile(eq[2])) { spec.fns.push({ name: line.replace(/\s+/g, ' '), f: compile(eq[2]) }); continue; }
      const m = line.match(/^([^:=]{1,60}?)\s*[:=]\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim().replace(/^\*+|\*+$/g, ''), val = m[2].trim();
      if (KEY.type.test(key)) { spec.type = normType(val) || spec.type; continue; }
      if (KEY.title.test(key)) { spec.title = val.replace(/^["']|["']$/g, ''); continue; }
      if (KEY.range.test(key)) { spec.range = rangeOf(val) || spec.range; continue; }
      if (KEY.source.test(key)) { spec.source = val; continue; }
      const isFn = spec.type === 'function' || (!spec.type && looksLikeFn(val) && !numbers(val));
      if (/^x$/i.test(key) && rangeOf(val) && !numbers(val)?.length) { spec.range = rangeOf(val); continue; }
      if (/^x$/i.test(key) && isFn && rangeOf(val)) { spec.range = rangeOf(val); continue; }
      if (KEY.labels.test(key) && !(isFn && /^x$/i.test(key))) { spec.labels = splitList(val); continue; }
      if (isFn && looksLikeFn(val)) {
        const k2 = key.replace(/\s+/g, '');
        const nm = /^[a-z]\(x\)$|^y\d?$/i.test(k2) ? `${k2} = ${val}` : /^[a-z]\d?$/i.test(k2) ? `${k2}(x) = ${val}` : `${key}: ${val}`;
        spec.fns.push({ name: nm, f: compile(val) });
        continue;
      }
      if (KEY.unit.test(key) && !numbers(val)) { spec.unit = val; continue; }
      const ns = numbers(val);
      if (ns) spec.series.push({ name: key, data: ns });
    }
    return finish(spec);
  }
  function fromJson(j) {
    if (Array.isArray(j)) j = { series: j };
    const d = j.data && !Array.isArray(j.data) ? j.data : j; // Chart.js-vorm: { type, data: { labels, datasets } }
    const spec = { type: normType(String(j.type || j.kind || j.chart || '')), title: String(j.title || j.options?.plugins?.title?.text || j.name || ''),
      labels: (d.labels || d.x || d.categories || j.labels || null)?.map?.(String) || null, unit: String(j.unit || j.yLabel || j.y_label || j.yAxis || ''),
      series: [], fns: [], range: null, source: String(j.source || '') };
    const list = d.datasets || d.series || (Array.isArray(j.data) ? [{ name: spec.title, data: j.data }] : []);
    for (const s of list) {
      const data = (s.data || s.values || s.y || []).map(v => (typeof v === 'object' && v ? num(v.y ?? v.value) : num(v)));
      if (data.length && data.every(v => v != null)) spec.series.push({ name: String(s.label || s.name || ''), data });
    }
    if (!spec.series.length && j.values && typeof j.values === 'object') {
      spec.labels = Object.keys(j.values); spec.series.push({ name: spec.title, data: Object.values(j.values).map(num) });
    }
    for (const f of [].concat(j.functions || j.function || j.f || j.fn || j.expression || j.expr || [])) {
      const e = typeof f === 'string' ? f : f.expr || f.f || f.expression;
      const c = e && compile(e);
      if (c) spec.fns.push({ name: typeof f === 'string' ? `y = ${tidyExpr(f)}` : f.name || f.label || `y = ${e}`, f: c });
    }
    if (j.range || j.domain || j.x) spec.range = rangeOf([].concat(j.range || j.domain || j.x).join(' to ')) || null;
    if (j.xmin != null && j.xmax != null) spec.range = [num(j.xmin), num(j.xmax)];
    return finish(spec);
  }
  function finish(spec) {
    if (spec.fns.length) { spec.type = 'function'; spec.range ||= [-5, 5]; spec.fns = spec.fns.slice(0, 4); return spec; }
    if (!spec.series.length) return null;
    const n = Math.max(...spec.series.map(s => s.data.length));
    if (!spec.labels || spec.labels.length < n) spec.labels = Array.from({ length: n }, (_, i) => spec.labels?.[i] ?? String(i + 1));
    spec.labels = spec.labels.slice(0, n);
    spec.series = spec.series.slice(0, 8);
    if (!spec.type || spec.type === 'function') spec.type = n > 8 && spec.series.length <= 3 ? 'line' : 'bar';
    if (spec.type === 'pie') spec.series = spec.series.slice(0, 1);
    return spec;
  }

  // ---------- grafiek: beschrijving → SVG ----------
  const W = 340, H = 210;
  function niceTicks(lo, hi, want = 4) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const raw = (hi - lo) / want, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    const step = (r >= 5 ? 10 : r >= 2.5 ? 5 : r >= 2 ? 2.5 : r >= 1 ? 2 : 1) * mag;
    const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step;
    const ticks = [];
    for (let v = a; v <= b + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : +v.toPrecision(12));
    return ticks;
  }
  const fmt = (lang, v) => new Intl.NumberFormat(lang, { maximumFractionDigits: Math.abs(v) < 10 && v % 1 ? 2 : 1, notation: Math.abs(v) >= 1e5 ? 'compact' : 'standard' }).format(v);
  // Balk met afgeronde kop (4px), recht op de basislijn.
  function barPath(x, y0, w, y1, r = 4) {
    const up = y1 < y0, hgt = Math.abs(y1 - y0), rr = Math.min(r, w / 2, hgt);
    if (hgt < 0.5) return '';
    if (up) return `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 + rr}V${y0}Z`;
    return `M${x},${y0}V${y1 - rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 - rr}V${y0}Z`;
  }
  // In de legenda: x^2 → x², * → ·, sqrt → √
  const SUPC = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const pretty = s => s.replace(/\^\(?(-?\d+)\)?/g, (_, d) => [...d].map(c => SUPC[c]).join('')).replace(/\*/g, '·').replace(/sqrt/g, '√').replace(/(\d) ?- ?(\d)/g, '$1 − $2').replace(/ - /g, ' − ');
  const text = (x, y, s, attrs = {}) => h('text', { x: +x.toFixed(1), y: +y.toFixed(1), ...attrs }, s);
  const short = (s, n = 12) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  function chartTree(spec, lang = 'en') {
    const kids = [];
    const label = [spec.title, spec.type].filter(Boolean).join(' · ');
    if (spec.type === 'pie') return pieTree(spec, lang, label);
    const L = 38, R = 12, T = 12, B = spec.type === 'function' ? 22 : 30, iw = W - L - R, ih = H - T - B;
    let xs, ys, lo, hi, x0, x1;
    if (spec.type === 'function') {
      [x0, x1] = spec.range;
      const N = 240;
      const curves = spec.fns.map(fn => Array.from({ length: N + 1 }, (_, i) => { const x = x0 + (x1 - x0) * i / N; return [x, fn.f(x)]; }));
      // Bereik van y zonder de uitschieters (tan, 1/x): het middelste deel van de waarden, met wat lucht.
      const all = curves.flat().map(p => p[1]).filter(Number.isFinite).sort((a, b) => a - b);
      if (!all.length) return null;
      const q = p => all[Math.min(all.length - 1, Math.max(0, Math.round(p * (all.length - 1))))];
      lo = Math.min(q(0.02), 0); hi = Math.max(q(0.98), 0);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      ys = niceTicks(lo, hi, 5); lo = ys[0]; hi = ys.at(-1);
      xs = niceTicks(x0, x1, 6).filter(v => v >= x0 - 1e-9 && v <= x1 + 1e-9);
      const X = x => L + (x - x0) / (x1 - x0) * iw, Y = y => T + ih - (y - lo) / (hi - lo) * ih;
      kids.push(...ys.map(v => h('line', { class: v === 0 ? 'axis' : 'grid', x1: L, x2: L + iw, y1: +Y(v).toFixed(1), y2: +Y(v).toFixed(1) })));
      kids.push(...xs.map(v => h('line', { class: v === 0 ? 'axis' : 'grid', y1: T, y2: T + ih, x1: +X(v).toFixed(1), x2: +X(v).toFixed(1) })));
      kids.push(...ys.map(v => text(L - 6, Y(v) + 3.5, fmt(lang, v), { class: 'tick', 'text-anchor': 'end' })));
      kids.push(...xs.map(v => text(X(v), T + ih + 15, fmt(lang, v), { class: 'tick', 'text-anchor': 'middle' })));
      curves.forEach((pts, si) => {
        let d = '', pen = false;
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = pts[i];
          const ok = Number.isFinite(y) && y >= lo - (hi - lo) && y <= hi + (hi - lo);
          // sprong (bv. bij tan of 1/x): de lijn onderbreken
          const jump = pen && Math.abs(y - pts[i - 1][1]) > (hi - lo) * 0.9;
          if (!ok || jump) { pen = false; if (!ok) continue; }
          const cy = Math.max(T - 4, Math.min(T + ih + 4, Y(y)));
          d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)},${cy.toFixed(1)}`;
          pen = true;
        }
        kids.push(h('path', { class: `ln s${si + 1}`, d }, h('title', {}, spec.fns[si].name)));
      });
      kids.unshift(h('clipPath', { id: 'c' }, h('rect', { x: L, y: T, width: iw, height: ih })));
      const lines = kids.filter(k => k.tag === 'path');
      lines.forEach(p => { p.attrs['clip-path'] = 'url(#c)'; });
      return frame(kids, label, spec, spec.fns.map(f => pretty(f.name)));
    }
    // staaf, gestapeld, lijn
    const stacked = spec.type === 'stacked' && spec.series.length > 1;
    const n = spec.labels.length;
    const sums = spec.labels.map((_, i) => spec.series.reduce((a, s) => a + Math.max(0, s.data[i] || 0), 0));
    const vals = stacked ? [...sums, 0] : [...spec.series.flatMap(s => s.data), 0];
    lo = Math.min(...vals); hi = Math.max(...vals);
    if (spec.type === 'line' && lo > 0 && lo > hi * 0.4) lo = lo - (hi - lo) * 0.2; // lijn hoeft niet bij 0 te beginnen
    ys = niceTicks(lo, hi); lo = ys[0]; hi = ys.at(-1);
    const Y = y => T + ih - (y - lo) / (hi - lo) * ih;
    kids.push(...ys.map(v => h('line', { class: v === 0 ? 'axis' : 'grid', x1: L, x2: L + iw, y1: +Y(v).toFixed(1), y2: +Y(v).toFixed(1) })));
    kids.push(...ys.map(v => text(L - 6, Y(v) + 3.5, fmt(lang, v), { class: 'tick', 'text-anchor': 'end' })));
    const band = iw / n;
    const every = Math.ceil(n / Math.floor(iw / 34)); // labels niet over elkaar
    spec.labels.forEach((l, i) => { if (i % every === 0) kids.push(text(L + band * (i + .5), T + ih + 15, short(l, Math.max(4, Math.floor(band * every / 6))), { class: 'tick', 'text-anchor': 'middle' }, h('title', {}, l))); });
    const tip = (s, i) => `${s.name ? `${s.name} · ` : ''}${spec.labels[i]}: ${fmt(lang, s.data[i])}${spec.unit ? ` ${spec.unit}` : ''}`;
    if (spec.type === 'line') {
      const X = i => L + band * (i + .5);
      spec.series.forEach((s, si) => {
        kids.push(h('path', { class: `ln s${si + 1}`, d: s.data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('') }));
        if (n <= 16) kids.push(...s.data.map((v, i) => h('circle', { class: `dot s${si + 1}`, cx: +X(i).toFixed(1), cy: +Y(v).toFixed(1), r: 4 }, h('title', {}, tip(s, i)))));
      });
    } else if (stacked) {
      const bw = Math.min(42, band * 0.62);
      spec.labels.forEach((_, i) => {
        let acc = 0;
        const top = spec.series.reduce((t, s, si) => ((s.data[i] || 0) > 0 ? si : t), -1);
        spec.series.forEach((s, si) => {
          const v = Math.max(0, s.data[i] || 0);
          if (!v) return;
          const ya = Y(acc), yb = Y(acc + v);
          acc += v;
          const x = L + band * (i + .5) - bw / 2;
          // 2px wit tussen de lagen; alleen de bovenste laag heeft een ronde kop
          kids.push(h('path', { class: `bar s${si + 1}`, d: barPath(x, ya - (si ? 1 : 0), bw, yb + (si === top ? 0 : 1), si === top ? 4 : 0) }, h('title', {}, tip(s, i))));
        });
      });
    } else {
      const k = spec.series.length, gw = Math.min(band * 0.78, 22 * k + 2 * (k - 1)), bw = (gw - 2 * (k - 1)) / k;
      spec.series.forEach((s, si) => s.data.forEach((v, i) => {
        const x = L + band * (i + .5) - gw / 2 + si * (bw + 2);
        kids.push(h('path', { class: `bar s${si + 1}`, d: barPath(x, Y(Math.max(lo, 0)), bw, Y(v)) }, h('title', {}, tip(s, i))));
      }));
    }
    return frame(kids, label, spec, spec.series.length > 1 ? spec.series.map(s => s.name) : []);
  }
  function pieTree(spec, lang, label) {
    const s = spec.series[0], total = s.data.reduce((a, v) => a + Math.max(0, v), 0);
    if (!total) return null;
    const cx = W / 2, cy = H / 2, r = 84, r0 = 50, kids = [];
    let a = -Math.PI / 2;
    s.data.forEach((v, i) => {
      if (v <= 0) return;
      const da = v / total * Math.PI * 2, b = a + da, big = da > Math.PI ? 1 : 0;
      const P = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`;
      const d = da >= Math.PI * 2 - 1e-6
        ? `M${P(r, a)}A${r},${r} 0 1 1 ${P(r, a + Math.PI)}A${r},${r} 0 1 1 ${P(r, a)}M${P(r0, a)}A${r0},${r0} 0 1 0 ${P(r0, a + Math.PI)}A${r0},${r0} 0 1 0 ${P(r0, a)}Z`
        : `M${P(r, a)}A${r},${r} 0 ${big} 1 ${P(r, b)}L${P(r0, b)}A${r0},${r0} 0 ${big} 0 ${P(r0, a)}Z`;
      kids.push(h('path', { class: `slice s${(i % 8) + 1}`, d }, h('title', {}, `${spec.labels[i]}: ${fmt(lang, v)} (${Math.round(v / total * 100)}%)`)));
      a = b;
    });
    kids.push(text(cx, cy + 5, fmt(lang, total), { class: 'total', 'text-anchor': 'middle' }));
    return frame(kids, label, spec, spec.labels.map((l, i) => `${l} · ${Math.round(Math.max(0, s.data[i]) / total * 100)}%`), true);
  }
  // Kop, legenda (vanaf twee reeksen) en de grafiek zelf; kleuren via CSS (.s1 … .s8), dus licht en donker kloppen vanzelf.
  function frame(kids, label, spec, legend, pie = false) {
    return h('figure', { class: `chart${pie ? ' pie' : ''}` },
      spec.title ? h('figcaption', {}, spec.title) : null,
      legend.length > 1 ? h('div', { class: 'legend' }, legend.map((l, i) => h('span', {}, h('i', { class: `s${(i % 8) + 1}` }), l))) : null,
      h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label }, kids),
      spec.unit || spec.source ? h('div', { class: 'cnote' }, [spec.unit, spec.source].filter(Boolean).join(' · ')) : null);
  }

  // ---------- formules: LaTeX → MathML (Chrome tekent MathML zelf) ----------
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', hbar: 'ℏ', ell: 'ℓ', infty: '∞', partial: '∂', nabla: '∇' };
  const OPS = { cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', sim: '∼', equiv: '≡', propto: '∝',
    to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', mapsto: '↦',
    in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', circ: '∘', degree: '°',
    sum: '∑', prod: '∏', int: '∫', iint: '∬', oint: '∮', lim: 'lim', cdots: '⋯', ldots: '…', dots: '…', angle: '∠', perp: '⊥', parallel: '∥', triangle: '△',
    langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', ast: '∗', star: '⋆', bullet: '•', percent: '%', '%': '%', '$': '$', '#': '#', '&': '&',
    '{': '{', '}': '}', '|': '‖', lvert: '|', rvert: '|', lbrace: '{', rbrace: '}', setminus: '∖', emptyset: '∅', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ' };
  const FUNCS = /^(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|lg|exp|max|min|det|gcd|deg|dim|ker|arg|sup|inf|mod|Pr)$/;
  const BIG = /^(sum|prod|int|iint|oint|lim|max|min|sup|inf)$/;
  const ACCENT = { vec: '→', hat: '^', bar: '¯', overline: '¯', tilde: '~', dot: '˙', ddot: '¨', widehat: '^', overrightarrow: '→' };
  const SPACE = { ',': '0.17em', ':': '0.22em', ';': '0.28em', ' ': '0.25em', quad: '1em', qquad: '2em', '!': '0em', enspace: '0.5em' };

  function texTree(src, display = false) {
    const s = String(src);
    let i = 0;
    const ws = () => { while (/\s/.test(s[i] || '')) i++; };
    function readCmd() { // na de backslash
      if (/[a-zA-Z]/.test(s[i])) { let n = ''; while (/[a-zA-Z]/.test(s[i] || '')) n += s[i++]; return n; }
      return s[i++] || '';
    }
    function rawGroup() { // {tekst} letterlijk
      ws();
      if (s[i] !== '{') { const c = s[i++] || ''; return c; }
      let depth = 0, out = '';
      for (; i < s.length; i++) {
        if (s[i] === '{') { if (depth++) out += '{'; continue; }
        if (s[i] === '}') { if (--depth === 0) { i++; break; } out += '}'; continue; }
        out += s[i];
      }
      return out;
    }
    function arg() { ws(); if (s[i] === '{') { i++; const r = row('}'); i++; return r; } return atom() || h('mrow', {}); }
    function row(end) {
      const items = [];
      for (;;) {
        ws();
        if (i >= s.length || s[i] === end || (end === 'right' && s.startsWith('\\right', i))) break;
        if (s[i] === '}' && end !== '}') { i++; continue; }
        if (s[i] === '&') { i++; items.push(h('mspace', { width: '1em' })); continue; }
        if (s.startsWith('\\\\', i)) { i += 2; items.push(h('mspace', { width: '1em' })); continue; }
        let a = atom();
        if (!a) continue;
        a = scripts(a);
        items.push(a);
      }
      return items.length === 1 ? items[0] : h('mrow', {}, items);
    }
    function scripts(base) {
      let sub = null, sup = null;
      for (;;) {
        ws();
        if (s[i] === '^' && !sup) { i++; sup = arg(); }
        else if (s[i] === '_' && !sub) { i++; sub = arg(); }
        else if (s[i] === "'" ) { i++; sup = h('mo', {}, '′'); }
        else break;
      }
      if (!sub && !sup) return base;
      const big = base.big && display;
      if (sub && sup) return h(big ? 'munderover' : 'msubsup', {}, base, sub, sup);
      if (sub) return h(big ? 'munder' : 'msub', {}, base, sub);
      return h(big ? 'mover' : 'msup', {}, base, sup);
    }
    function atom() {
      ws();
      const c = s[i];
      if (c == null) return null;
      if (c === '{') { i++; const r = row('}'); i++; return h('mrow', {}, r); }
      if (/[0-9.]/.test(c)) { let n = ''; while (/[0-9]/.test(s[i] || '') || (s[i] === '.' && /[0-9]/.test(s[i + 1] || '')) || (s[i] === ',' && /[0-9]/.test(s[i + 1] || '') && /[0-9]/.test(s[i - 1] || ''))) n += s[i++]; if (!n) { i++; return h('mo', {}, '.'); } return h('mn', {}, n); }
      if (/[a-zA-ZͰ-Ͽ]/.test(c)) { i++; return h('mi', {}, c); }
      if (c === '\\') {
        i++;
        const n = readCmd();
        if (n in SPACE) return h('mspace', { width: SPACE[n] });
        if (/^[dt]?frac$|^cfrac$/.test(n)) { const a = arg(), b = arg(); return h('mfrac', {}, a, b); }
        if (n === 'binom') { const a = arg(), b = arg(); return h('mrow', {}, h('mo', {}, '('), h('mfrac', { linethickness: '0' }, a, b), h('mo', {}, ')')); }
        if (n === 'sqrt') { ws(); if (s[i] === '[') { i++; const idx = row(']'); i++; return h('mroot', {}, arg(), idx); } return h('msqrt', {}, arg()); }
        if (/^(text|textrm|mbox|textit|textbf|operatorname|mathrm|mathbf|mathit|mathbb|mathcal|unit)$/.test(n)) {
          const t = rawGroup();
          if (n === 'mathbb') return h('mi', { mathvariant: 'double-struck' }, t);
          if (n === 'mathbf' || n === 'textbf') return h('mi', { mathvariant: 'bold' }, t);
          if (n === 'operatorname' || n === 'mathrm') return h('mi', { mathvariant: 'normal' }, t);
          return h('mtext', {}, t);
        }
        if (n in ACCENT) return h('mover', { accent: 'true' }, arg(), h('mo', { stretchy: 'true' }, ACCENT[n]));
        if (n === 'underline') return h('munder', {}, arg(), h('mo', {}, '_'));
        if (n === 'left' || n === 'right' || n === 'big' || n === 'Big' || n === 'bigg' || n === 'Bigg' || n === 'bigl' || n === 'bigr') {
          ws();
          let f = s[i] === '\\' ? (i++, readCmd()) : s[i++];
          f = f === '.' ? '' : OPS[f] || f;
          if (n !== 'left') return f ? h('mo', { stretchy: 'true' }, f) : null;
          const inner = row('right');
          let g = '';
          if (s.startsWith('\\right', i)) { i += 6; ws(); g = s[i] === '\\' ? (i++, readCmd()) : s[i++]; g = g === '.' ? '' : OPS[g] || g; }
          return h('mrow', {}, f ? h('mo', { stretchy: 'true' }, f) : null, inner, g ? h('mo', { stretchy: 'true' }, g) : null);
        }
        if (n === 'begin') { // matrices en uitlijnen: rijen en kolommen als tabel
          const env = rawGroup();
          const end = s.indexOf(`\\end{${env}}`, i);
          const body = s.slice(i, end < 0 ? s.length : end);
          i = end < 0 ? s.length : end + `\\end{${env}}`.length;
          const rows = body.split('\\\\').map(r => r.trim()).filter(Boolean)
            .map(r => h('mtr', {}, r.split('&').map(cell => h('mtd', {}, texTree(cell).kids))));
          const tbl = h('mtable', {}, rows);
          const fence = { pmatrix: ['(', ')'], bmatrix: ['[', ']'], vmatrix: ['|', '|'], cases: ['{', ''] }[env.replace('*', '')];
          return fence ? h('mrow', {}, h('mo', { stretchy: 'true' }, fence[0]), tbl, fence[1] ? h('mo', { stretchy: 'true' }, fence[1]) : null) : tbl;
        }
        if (n === 'end') { rawGroup(); return null; }
        if (n in GREEK) return h('mi', {}, GREEK[n]);
        if (FUNCS.test(n)) { const m = h(BIG.test(n) ? 'mo' : 'mi', BIG.test(n) ? { movablelimits: 'true' } : { mathvariant: 'normal' }, n); m.big = BIG.test(n); return m; }
        if (n in OPS) { const m = h('mo', BIG.test(n) ? { largeop: 'true', movablelimits: 'true' } : {}, OPS[n]); m.big = BIG.test(n); return m; }
        if (n === 'displaystyle' || n === 'limits' || n === 'nolimits' || n === 'textstyle') return null;
        return h('mtext', {}, n); // onbekend: de naam als tekst, zodat er niets verdwijnt
      }
      i++;
      if (c === '}') return null;
      if ('+-−=<>≤≥≠≈±×÷·()[]|,;:!/*→'.includes(c)) return h('mo', c === '-' ? {} : {}, c === '-' ? '−' : c === '*' ? '·' : c);
      if (c === '~') return h('mspace', { width: '0.25em' });
      return h('mo', {}, c);
    }
    const body = row(null);
    return h('math', display ? { display: 'block' } : {}, body.tag === 'mrow' ? body.kids : [body]);
  }
  // Voor kopiëren en Word: een formule als leesbare tekst (x², √x, a/b).
  const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ', i: 'ⁱ' };
  const SUBS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '-': '₋', '+': '₊' };
  function treeText(n) {
    if (typeof n === 'string') return n;
    const k = n.kids.map(treeText);
    const sm = (t, map) => ([...t].every(c => c in map) ? [...t].map(c => map[c]).join('') : null);
    const wrap = t => (t.length > 1 ? `(${t})` : t);
    switch (n.tag) {
      case 'mfrac': return n.attrs.linethickness === '0' ? `C(${k[0]}, ${k[1]})` : `(${k[0]})/(${k[1]})`.replace(/\(([\w.,]+)\)/g, '$1');
      case 'msqrt': return `√${wrap(k.join(''))}`;
      case 'mroot': return `${k[1]}√${wrap(k[0])}`;
      case 'msup': case 'mover': return n.attrs.accent ? `${k[0]}${k[1] === '→' ? '⃗' : ''}` : k[0] + (sm(k[1], SUPS) ?? `^${wrap(k[1])}`);
      case 'msub': case 'munder': return k[0] + (sm(k[1], SUBS) ?? `_${wrap(k[1])}`);
      case 'msubsup': case 'munderover': return k[0] + (sm(k[1], SUBS) ?? `_${wrap(k[1])}`) + (sm(k[2], SUPS) ?? `^${wrap(k[2])}`);
      case 'mspace': return ' ';
      case 'mo': return /^[=<>≤≥≠≈±×÷→⇒⇔∈+−]$/.test(k[0]) ? ` ${k[0]} ` : k[0] === ',' ? ', ' : k.join('');
      case 'mtr': return k.join('  ') + '\n';
      default: return k.join('');
    }
  }
  const texText = (src) => treeText(texTree(src)).replace(/ {2,}/g, ' ').trim();

  // ---------- tekst met opmaak ----------
  // Inline: `code`, $formule$ of \(formule\), **vet**, *schuin*. Een $ voor een bedrag ($5 en $10) blijft gewoon tekst.
  const INLINE = /`([^`\n]+)`|\\\((.+?)\\\)|\$(?!\s)([^$\n]*?[^\s$\\])\$(?!\d)|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g;
  const mathy = t => /[\\^_=+\-*/<>]|^[a-zA-Z]$|\d[a-zA-Z]|[a-zA-Z]\d/.test(t) && !/^\d+([.,]\d+)?$/.test(t);
  function inlineTree(str, plain) {
    const out = [];
    let last = 0;
    for (const m of str.matchAll(INLINE)) {
      const mathSrc = m[2] ?? (m[3] != null && mathy(m[3]) ? m[3] : null);
      const bare = m[3] != null && /^-?\d[\d.,\s]*$/.test(m[3]); // $299,792,458$: gewoon het getal
      if (m[3] != null && mathSrc == null && !bare) continue; // geen formule, gewoon tekst met dollartekens
      if (bare) { if (m.index > last) out.push(...plain(str.slice(last, m.index))); out.push(...plain(m[3])); last = m.index + m[0].length; continue; }
      if (m.index > last) out.push(...plain(str.slice(last, m.index)));
      if (m[1] != null) out.push(h('code', {}, m[1]));
      else if (mathSrc != null) out.push(texTree(mathSrc));
      else if (m[4] != null || m[5] != null) out.push(h('b', {}, inlineTree(m[4] ?? m[5], plain)));
      else out.push(h('i', {}, inlineTree(m[6], plain)));
      last = m.index + m[0].length;
    }
    if (last < str.length) out.push(...plain(str.slice(last)));
    return out;
  }
  const FENCE = /^\s*(```+|~~~+)\s*([\w+-]*)\s*(.*)$/;
  const LIST = /^(\s*)([-*•+]|\d+[.)])\s+(.*)$/;
  const isHr = l => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
  const isTableRow = l => /^\s*\|.*\|\s*$/.test(l) || (/\|/.test(l) && l.split('|').length >= 3 && !/`/.test(l));
  const isTableSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  // Tekst → boom. plain(tekst) geeft de stukjes gewone tekst terug (chat.js zet daar de echte gegevens terug).
  // drawing: wat er staat zolang een grafiek nog binnenkomt (woord voor woord).
  function parse(text, { lang = 'en', plain = t => [t], streaming = false, drawing = '…' } = {}) {
    const lines = String(text).replace(/\r/g, '').split('\n');
    const out = [];
    const startsBlock = (l, next) => FENCE.test(l) || /^\s*(type|soort)\s*:\s*(stacked|stapel|bar|staaf|line|lijn|pie|taart|function|functie)/i.test(l) || /^\s*(\$\$|\\\[)/.test(l) || /^\s{0,3}#{1,6}\s/.test(l) || isHr(l) || LIST.test(l) || (isTableRow(l) && next != null && isTableSep(next));
    for (let i = 0; i < lines.length;) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = l.match(FENCE))) {
        const mark = m[1][0], lang2 = (m[2] || '').toLowerCase();
        const body = [];
        let closed = false;
        if (m[3] && !/^```/.test(m[3])) body.push(m[3]);
        for (i++; i < lines.length; i++) {
          if (new RegExp(`^\\s*${mark === '`' ? '```' : '~~~'}`).test(lines[i])) { closed = true; i++; break; }
          body.push(lines[i]);
        }
        const src = body.join('\n');
        const wantsChart = /^(chart|graph|grafiek|plot|diagram|diagramm|graphique|gr[aá]fico|bar|line|pie|function)$/.test(lang2) || (/^(json|yaml|)$/.test(lang2) && /\b(type|series|datasets|labels|functions?)\b/i.test(src));
        if (wantsChart && !closed && streaming) { out.push(h('div', { class: 'chart drawing' }, drawing)); continue; }
        const spec = wantsChart ? parseChart(src, lang2) : null;
        const tree = spec && chartTree(spec, lang);
        if (tree) { out.push(tree); continue; }
        if (/^(math|latex|tex|katex)$/.test(lang2)) { out.push(h('div', { class: 'mathblock' }, texTree(src, true))); continue; }
        out.push(h('pre', {}, h('code', lang2 ? { 'data-lang': lang2 } : {}, src)));
        continue;
      }
      if (/^\s*(type|soort)\s*:\s*(stacked|stapel|bar|staaf|line|lijn|pie|taart|function|functie)/i.test(l)) {
        const body = [];
        for (; i < lines.length && lines[i].trim() && /^[^:]{1,60}:/.test(lines[i]); i++) body.push(lines[i]);
        if (streaming && i >= lines.length) { out.push(h('div', { class: 'chart drawing' }, drawing)); continue; }
        const tree = (s => s && chartTree(s, lang))(parseChart(body.join('\n')));
        if (tree) out.push(tree);
        continue;
      }
      if ((m = l.match(/^\s*(\$\$|\\\[)(.*)$/))) { // formule op een eigen regel, ook over meer regels
        const close = m[1] === '$$' ? '$$' : '\\]';
        let rest = m[2], body = '';
        if (rest.includes(close)) { body = rest.slice(0, rest.indexOf(close)); i++; }
        else {
          const parts = [rest];
          let closed = false;
          for (i++; i < lines.length; i++) { const at = lines[i].indexOf(close); if (at >= 0) { parts.push(lines[i].slice(0, at)); closed = true; i++; break; } parts.push(lines[i]); }
          body = parts.join(' ');
          if (!closed && streaming) { out.push(h('p', { class: 'think' }, '…')); continue; }
        }
        out.push(h('div', { class: 'mathblock' }, texTree(body, true)));
        continue;
      }
      if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { out.push(h(m[1].length <= 2 ? 'h3' : 'h4', {}, inlineTree(m[2], plain))); i++; continue; }
      if (isHr(l)) { out.push(h('hr')); i++; continue; }
      if (isTableRow(l) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        const head = cells(l), aligns = cells(lines[i + 1]).map(c => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : null));
        const rows = [];
        for (i += 2; i < lines.length && isTableRow(lines[i]) && lines[i].trim(); i++) rows.push(cells(lines[i]));
        const numeric = head.map((_, c) => rows.length && rows.every(r => !r[c] || num(r[c]) != null && /^[\s\d.,%€$£+−-]+[a-z%]*$/i.test(r[c])));
        const td = (tag, txt, c) => h(tag, { style: null, class: aligns[c] === 'center' ? 'c' : aligns[c] === 'right' || numeric[c] ? 'r' : null }, inlineTree(txt || '', plain));
        out.push(h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, head.map((c, k) => td('th', c, k)))),
          h('tbody', {}, rows.map(r => h('tr', {}, head.map((_, k) => td('td', r[k], k))))))));
        continue;
      }
      if (LIST.test(l)) {
        // lijst, met één niveau inspringen
        const ordered = /^\s*\d/.test(l);
        const root = h(ordered ? 'ol' : 'ul', {});
        const baseIndent = l.match(LIST)[1].length;
        let lastLi = null;
        for (; i < lines.length; i++) {
          const li = lines[i];
          if (!li.trim()) { if (i + 1 < lines.length && LIST.test(lines[i + 1])) continue; break; }
          const lm = li.match(LIST);
          if (!lm) { if (lastLi && /^\s{2,}\S/.test(li)) { lastLi.kids.push(' ', ...inlineTree(li.trim(), plain)); continue; } break; }
          if (lm[1].length > baseIndent + 1 && lastLi) {
            let sub = lastLi.kids.find(k => k.tag === 'ul' || k.tag === 'ol');
            if (!sub) { sub = h(/^\d/.test(lm[2]) ? 'ol' : 'ul', {}); lastLi.kids.push(sub); }
            sub.kids.push(h('li', {}, inlineTree(lm[3], plain)));
            continue;
          }
          if (/^\d/.test(lm[2]) !== ordered && root.kids.length) break;
          lastLi = h('li', {}, inlineTree(lm[3], plain));
          if (ordered && root.kids.length === 0 && parseInt(lm[2], 10) > 1) root.attrs.start = parseInt(lm[2], 10);
          root.kids.push(lastLi);
        }
        out.push(root);
        continue;
      }
      // alinea: tot een lege regel of het begin van een blok
      const para = [];
      for (; i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(lines[i], lines[i + 1])); i++) para.push(lines[i]);
      const p = h('p', {});
      para.forEach((pl, k) => { if (k) p.kids.push(h('br')); p.kids.push(...inlineTree(pl.trim(), plain)); });
      out.push(p);
    }
    return out;
  }

  // In de pagina: tekst → elementen in el. plain(tekst, ouder) mag zelf iets toevoegen (bijv. groene teruggezette gegevens).
  function render(text, el, { lang = 'en', plain = null, streaming = false, drawing = '…' } = {}) {
    const doc = el.ownerDocument;
    let n = 0;
    const holders = new Map();
    // plain geeft een element terug: we zetten een merkteken in de boom en vullen het daarna met de echte DOM.
    const mark = t => { if (!plain) return [t]; const id = `p${n++}`; holders.set(id, t); return [h('kamelo-t', { 'data-i': id })]; };
    const frag = doc.createDocumentFragment();
    for (const node of parse(text, { lang, plain: mark, streaming, drawing })) frag.append(toDom(node, doc));
    if (plain) for (const ph of frag.querySelectorAll('kamelo-t')) { const span = doc.createDocumentFragment(); plain(holders.get(ph.dataset.i), span); ph.replaceWith(span); }
    // Elke grafiek een eigen clipPath-id (er kunnen er meer op het scherm staan).
    for (const svg of frag.querySelectorAll('svg')) {
      const cp = svg.querySelector('clipPath');
      if (!cp) continue;
      const id = `c${Math.random().toString(36).slice(2, 9)}`;
      cp.id = id;
      svg.querySelectorAll('[clip-path]').forEach(p => p.setAttribute('clip-path', `url(#${id})`));
    }
    el.append(frag);
  }

  const api = { compile, parseChart, chartTree, texTree, texText, treeText, parse, render, toXml, num };
  globalThis.KameloRich = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
