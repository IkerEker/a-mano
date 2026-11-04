// Motor de texto falso: maqueta como Photoshop y devuelve el "trazado de trabajo" (pathContents) de la capa.
const fs = require('fs');
const O = require(require('path').join(__dirname, 'otf.js'));

const FONTFILES = {
  'Poppins-Bold': '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
  'Poppins-Medium': '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf',
  'Poppins-Light': '/usr/share/fonts/truetype/google-fonts/Poppins-Light.ttf',
  'Poppins-Regular': '/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf',
  'TeXGyreHerosCn-Bold': '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheroscn-bold.otf',
  'TeXGyreHeros-Bold': '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheros-bold.otf',
  'TeXGyreChorus-MediumItalic': '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrechorus-mediumitalic.otf',
  'Inter-Black': '/usr/share/fonts/opentype/inter/Inter-Black.otf',
  'DejaVuSerif-Bold': '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
};
const cache = {};
function font(ps) {
  if (!cache[ps]) { const p = FONTFILES[ps] || FONTFILES['Poppins-Bold']; const b = fs.readFileSync(p); cache[ps] = O.parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), 0); }
  return cache[ps];
}

const P = (x, y, unit, res) => ({ _obj: 'paint', horizontal: { _unit: unit, _value: unit === 'distanceUnit' ? x * 72 / res : x }, vertical: { _unit: unit, _value: unit === 'distanceUnit' ? y * 72 / res : y } });

// comandos de glifo (unidades fuente, y arriba) -> componente de trazado
function glyphComponent(cmds, ox, oy, sc, unit, res) {
  const subs = [];
  let cur = null, last = null;
  const X = x => ox + x * sc, Y = y => oy - y * sc;
  const close = () => {
    if (!cur || cur.length < 2) { cur = null; return; }
    const f = cur[0], l = cur[cur.length - 1];
    if (Math.abs(f.a[0] - l.a[0]) < 1e-6 && Math.abs(f.a[1] - l.a[1]) < 1e-6) { f.b = l.b; cur.pop(); }
    subs.push(cur); cur = null;
  };
  for (const m of cmds) {
    if (m.t === 'M') { close(); cur = [{ a: [X(m.x), Y(m.y)], f: null, b: null }]; last = cur[0]; }
    else if (m.t === 'L') { const p = { a: [X(m.x), Y(m.y)], f: null, b: null }; cur.push(p); last = p; }
    else if (m.t === 'Q') {
      const p0 = last.a, q = [X(m.x1), Y(m.y1)], p3 = [X(m.x), Y(m.y)];
      last.f = [p0[0] + 2 / 3 * (q[0] - p0[0]), p0[1] + 2 / 3 * (q[1] - p0[1])];
      const p = { a: p3, f: null, b: [p3[0] + 2 / 3 * (q[0] - p3[0]), p3[1] + 2 / 3 * (q[1] - p3[1])] };
      cur.push(p); last = p;
    } else if (m.t === 'C') {
      last.f = [X(m.x1), Y(m.y1)];
      const p = { a: [X(m.x), Y(m.y)], f: null, b: [X(m.x2), Y(m.y2)] };
      cur.push(p); last = p;
    } else if (m.t === 'Z') close();
  }
  close();
  if (!subs.length) return null;
  return {
    _obj: 'pathComponent', shapeOperation: { _enum: 'shapeOperation', _value: 'add' }, windingFill: true,
    subpathListKey: subs.map(s => ({ _obj: 'subpathsList', closedSubpath: true, points: s.map(p => ({ _obj: 'pathPoint', anchor: P(p.a[0], p.a[1], unit, res), forward: P((p.f || p.a)[0], (p.f || p.a)[1], unit, res), backward: P((p.b || p.a)[0], (p.b || p.a)[1], unit, res), smooth: false })) }))
  };
}

// spec: { text, ranges:[{from,to,font,sizePx,color}], x, y (1ª línea base), leadingPx, align, box:{left,top,right,bottom}|null, res, unit }
function layout(spec) {
  const res = spec.res || 72, unit = spec.unit || 'pixelsUnit';
  const styleAt = i => spec.ranges.find(r => i >= r.from && i < r.to) || spec.ranges[spec.ranges.length - 1];
  const text = spec.text;
  // dividir en párrafos y (si hay caja) en líneas
  const paras = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) if (i === text.length || text[i] === '\r' || text[i] === '\n') { paras.push([start, i]); start = i + 1; }
  const glyphAdv = i => { const st = styleAt(i), f = font(st.font); const g = f.glyphIndex(text.codePointAt(i)); return { g, adv: f.advance(g) * st.sizePx / f.unitsPerEm + (st.tracking || 0) / 1000 * st.sizePx, f, st }; };
  const lines = [];
  for (const [a, b] of paras) {
    if (!spec.box) { lines.push([a, b]); continue; }
    const maxW = spec.box.right - spec.box.left;
    let ls = a, w = 0, lastSpace = -1;
    for (let i = a; i < b; i++) {
      const ad = glyphAdv(i).adv;
      if (text[i] === ' ') lastSpace = i;
      if (w + ad > maxW && lastSpace > ls) { lines.push([ls, lastSpace]); ls = lastSpace + 1; w = 0; for (let k = ls; k <= i; k++) w += glyphAdv(k).adv; lastSpace = -1; continue; }
      w += ad;
    }
    lines.push([ls, b]);
  }
  const comps = [];
  let baseline = spec.box ? spec.box.top + (spec.ranges[0].sizePx * 0.95) : spec.y;
  const leading = spec.leadingPx || Math.max(...spec.ranges.map(r => r.sizePx)) * 1.2;
  for (const [a, b] of lines) {
    let w = 0; for (let i = a; i < b; i++) w += glyphAdv(i).adv;
    let x = spec.box ? spec.box.left : spec.x;
    const al = spec.align || 'left';
    if (spec.box) { const bw = spec.box.right - spec.box.left; if (al === 'center') x += (bw - w) / 2; if (al === 'right') x += bw - w; }
    else { if (al === 'center') x -= w / 2; if (al === 'right') x -= w; }
    let prev = -1, prevF = null;
    for (let i = a; i < b; i++) {
      const q = glyphAdv(i);
      if (prev >= 0 && prevF === q.f) x += q.f.kerning(prev, q.g) * q.st.sizePx / q.f.unitsPerEm;
      if (!/\s/.test(text[i])) {
        const c = glyphComponent(q.f.glyphPath(q.g), x, baseline, q.st.sizePx / q.f.unitsPerEm, unit, res);
        if (c) comps.push(c);
      }
      x += q.adv; prev = q.g; prevF = q.f;
    }
    baseline += leading;
  }
  return { _obj: 'pathClass', pathComponents: comps };
}

module.exports = { layout, font, FONTFILES };
