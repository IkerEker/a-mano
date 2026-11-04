'use strict';
// Letras a partir de los contornos que da Photoshop (trazado de trabajo creado desde una capa de texto).
// Cada componente del trazado es un glifo; sus subtrazados son los contornos (exterior y huecos).
// Sin dependencias de Photoshop.

const G = require('./geom.js');

// componentes -> glifos { contours: [[seg...]...], bbox }
function componentsToGlyphs(comps) {
  const out = [];
  for (const c of comps) {
    const contours = [];
    for (const s0 of c.subpaths) {
      const s = G.cleanSubpath(s0);
      if (s.pts.length < 2) continue;
      contours.push(G.segmentsOf(Object.assign({}, s, { closed: true })));
    }
    if (!contours.length) continue;
    const bb = segsBBox(contours);
    if (!(bb.right - bb.left > 0.01 || bb.bottom - bb.top > 0.01)) continue;
    out.push({ contours, bbox: bb });
  }
  return out;
}

// Si Photoshop diera acentos o puntos como piezas sueltas, se unen a su letra (solo si sobran piezas)
function mergeMarks(glyphs, expected) {
  if (!(expected > 0) || glyphs.length <= expected) return glyphs;
  const gs = glyphs.slice();
  while (gs.length > expected) {
    let bi = -1, bj = -1, bs = 0.45;
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < Math.min(gs.length, i + 4); j++) {
      const a = gs[i].bbox, b = gs[j].bbox;
      const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const wmin = Math.min(a.right - a.left, b.right - b.left);
      const hA = a.bottom - a.top, hB = b.bottom - b.top;
      const vgap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
      if (!(wmin > 0) || ov <= 0 || vgap > 0.8 * Math.max(hA, hB)) continue;
      const sc = ov / wmin * (Math.min(hA, hB) < 0.6 * Math.max(hA, hB) ? 1 : 0.5);
      if (sc > bs) { bs = sc; bi = i; bj = j; }
    }
    if (bi < 0) break;
    const a = gs[bi], b = gs[bj];
    gs[bi] = { contours: a.contours.concat(b.contours), bbox: { left: Math.min(a.bbox.left, b.bbox.left), top: Math.min(a.bbox.top, b.bbox.top), right: Math.max(a.bbox.right, b.bbox.right), bottom: Math.max(a.bbox.bottom, b.bbox.bottom) } };
    gs.splice(bj, 1);
  }
  return gs;
}

function segsBBox(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const segs of contours) {
    const p = G.flattenSegs(segs, 0.3);
    for (let i = 0; i < p.length; i += 2) {
      if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
      if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
    }
  }
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

function allBBox(glyphs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of glyphs) { x0 = Math.min(x0, g.bbox.left); y0 = Math.min(y0, g.bbox.top); x1 = Math.max(x1, g.bbox.right); y1 = Math.max(y1, g.bbox.bottom); }
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

// Corrige unidades si el trazado no coincide con los límites de la capa en píxeles
// Solo corrige un error de unidades claro (puntos frente a píxeles)
function calibrate(comps, layerBounds, res) {
  const glyphs = componentsToGlyphs(comps);
  if (!glyphs.length || !layerBounds || !res || Math.abs(res - 72) < 0.5) return 1;
  const bb = allBBox(glyphs);
  const lw = layerBounds.right - layerBounds.left, pw = bb.right - bb.left;
  if (!(lw > 1 && pw > 0)) return 1;
  const k = lw / pw;
  for (const cand of [res / 72, 72 / res]) {
    if (Math.abs(k / cand - 1) < 0.05 && Math.abs(bb.left * cand - layerBounds.left) < 0.05 * lw + 4) { G.scaleComponents(comps, cand, 0, 0); return cand; }
  }
  return 1;
}

const isSep = ch => /[\s\u0003 ​]/.test(ch);

// ------------------------------------------------------------------ capa de medida
// words: [{text, font, sizePx, tier, color}] -> descripción del texto a crear en Photoshop
function buildMeasure(words, doc) {
  const maxSize = Math.max(...words.map(w => w.sizePx));
  const rowsMaxW = doc.width * 0.86;
  const rows = [];
  let cur = [], curW = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const est = (w.text.length * 0.62 + 0.35) * w.sizePx;
    if (cur.length && (curW + est > rowsMaxW || cur.length >= 14)) { rows.push(cur); cur = []; curW = 0; }
    cur.push(i); curW += est;
  }
  if (cur.length) rows.push(cur);
  const leadingPx = maxSize * 1.35;
  let text = '';
  const ranges = [];
  rows.forEach((row, r) => {
    if (r > 0) { ranges.push({ from: text.length, to: text.length + 1, word: row[0], sep: true }); text += '\r'; }
    row.forEach((wi, k) => {
      if (k > 0) {
        // el espacio, al tamaño de la palabra más pequeña de las dos
        const a = words[row[k - 1]], b = words[wi];
        ranges.push({ from: text.length, to: text.length + 1, word: a.sizePx <= b.sizePx ? row[k - 1] : wi, sep: true });
        text += ' ';
      }
      ranges.push({ from: text.length, to: text.length + words[wi].text.length, word: wi });
      text += words[wi].text;
    });
  });
  const x = doc.width * 0.04, y = maxSize * 1.2 + doc.height * 0.02;
  return { text, ranges, rows, leadingPx, x, y, maxSize };
}

// tamaño base para que la capa de medida quepa en el documento
function measureBaseSize(words, doc, ratios) {
  let chars = 0; for (const w of words) chars += w.text.length + 1;
  const rmax = Math.max(1, ...Object.values(ratios));
  const perRow = Math.min(chars, 40);
  const rowsN = Math.max(1, Math.ceil(chars / 40));
  let s = Math.min(140, (doc.width * 0.84) / (perRow * 0.62 * rmax), (doc.height * 0.9) / (rowsN * 1.4 * rmax + 1));
  return Math.max(4, s);
}

// Caja de la palabra para el interlineado: los acentos de mayúsculas y las comas
// pueden invadir un poco el hueco entre líneas (como en los carteles de interlineado apretado)
const UPPER_ACCENT = new Set('ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÝŸŃŚŹŻĆČŠŽŘĚŮ'.split(''));
const LOW_MARK = new Set(',;‚„'.split(''));
function coreMetrics(gs, chs, base) {
  let topCore = Infinity, topAcc = Infinity, botCore = -Infinity, botLow = -Infinity;
  gs.forEach((g, i) => {
    const ch = chs ? chs[i] : null;
    if (ch && UPPER_ACCENT.has(ch)) topAcc = Math.min(topAcc, g.bbox.top); else topCore = Math.min(topCore, g.bbox.top);
    if (ch && LOW_MARK.has(ch)) botLow = Math.max(botLow, g.bbox.bottom); else botCore = Math.max(botCore, g.bbox.bottom);
  });
  let top = topCore;
  if (isFinite(topAcc)) top = isFinite(topCore) ? Math.min(topCore, topCore + 0.3 * (topAcc - topCore)) : topAcc + 0.25 * (base - topAcc);
  let bot = botCore;
  if (isFinite(botLow)) bot = isFinite(botCore) ? Math.max(botCore, base + 0.3 * (botLow - base)) : base;
  return { asc: Math.max(0, base - top), desc: Math.max(0, bot - base) };
}

function modeCluster(vals, tol) {
  if (!vals.length) return null;
  const v = vals.slice().sort((a, b) => a - b);
  let best = v[0], bc = 0;
  for (let i = 0; i < v.length; i++) {
    let c = 0;
    for (let j = 0; j < v.length; j++) if (Math.abs(v[j] - v[i]) <= tol) c++;
    if (c > bc || (c === bc && v[i] < best)) { bc = c; best = v[i]; }
  }
  return best;
}

// contornos de Photoshop -> palabras con métricas y glifos (en espacio de palabra: x desde el borde izquierdo
// de la tinta, y desde la línea base, hacia abajo)
function wordsFromOutlines(comps, measure, words) {
  let nch = 0; for (const w of words) for (const ch of w.text) if (!isSep(ch)) nch++;
  const glyphs = mergeMarks(componentsToGlyphs(comps), nch);
  const rows = measure.rows;
  // línea base esperada de cada fila
  const base = rows.map((r, k) => measure.y + k * measure.leadingPx);
  // asignar glifos a filas por cercanía a la línea base
  const byRow = rows.map(() => []);
  for (const g of glyphs) {
    const cy = (g.bbox.top + g.bbox.bottom) / 2;
    let bk = 0, bd = Infinity;
    for (let k = 0; k < base.length; k++) {
      const d = Math.abs(cy - (base[k] - measure.maxSize * 0.3));
      if (d < bd) { bd = d; bk = k; }
    }
    byRow[bk].push(g);
  }
  // corrección global de la línea base con las bases reales de los glifos
  const offs = [];
  byRow.forEach((gs, k) => {
    const sz = Math.max(...rows[k].map(i => words[i].sizePx));
    const bottoms = gs.filter(g => g.bbox.bottom - g.bbox.top > sz * 0.3).map(g => g.bbox.bottom);
    if (bottoms.length >= 4) { const m = modeCluster(bottoms, sz * 0.025); if (m != null && Math.abs(m - base[k]) < sz * 0.3) offs.push(m - base[k]); }
  });
  if (offs.length) { offs.sort((a, b) => a - b); const o = offs[offs.length >> 1]; for (let k = 0; k < base.length; k++) base[k] += o; }
  // repartir glifos entre palabras de cada fila
  const out = words.map(w => ({ glyphs: [], src: w }));
  rows.forEach((row, k) => {
    const gs = byRow[k].sort((a, b) => (a.bbox.left + a.bbox.right) - (b.bbox.left + b.bbox.right));
    const counts = row.map(i => [...words[i].text].filter(ch => !isSep(ch)).length);
    const total = counts.reduce((a, b) => a + b, 0);
    let groups = [];
    if (gs.length === total) {
      let p = 0;
      groups = counts.map(c => { const g = gs.slice(p, p + c); p += c; return g; });
    } else {
      // por huecos: los (palabras-1) huecos más grandes
      const gaps = [];
      for (let i = 1; i < gs.length; i++) gaps.push({ i, d: gs[i].bbox.left - gs[i - 1].bbox.right });
      const cut = gaps.sort((a, b) => b.d - a.d).slice(0, row.length - 1).map(g => g.i).sort((a, b) => a - b);
      let p = 0;
      groups = row.map((_, q) => { const e = q < cut.length ? cut[q] : gs.length; const g = gs.slice(p, e); p = e; return g; });
    }
    row.forEach((wi, q) => {
      const g = groups[q] || [];
      const ow = out[wi];
      ow.row = k;
      if (!g.length) { ow.empty = true; ow.inkL = 0; ow.inkR = words[wi].sizePx * 0.3; ow.asc = words[wi].sizePx * 0.7; ow.desc = 0; return; }
      const bb = allBBox(g);
      ow.inkL = bb.left; ow.inkR = bb.right;
      const chs = [...words[wi].text].filter(ch => !isSep(ch));
      const exact = chs.length === g.length;
      const m = coreMetrics(g, exact ? chs : null, base[k]);
      ow.asc = m.asc; ow.desc = m.desc; ow.inkAsc = Math.max(0, base[k] - bb.top); ow.inkDesc = Math.max(0, bb.bottom - base[k]);
      ow.glyphs = g.map((gl, gi) => ({
        ch: exact ? chs[gi] : null,
        contours: gl.contours.map(segs => segs.map(s => [s[0] - bb.left, s[1] - base[k], s[2] - bb.left, s[3] - base[k], s[4] - bb.left, s[5] - base[k], s[6] - bb.left, s[7] - base[k]])),
        bbox: { left: gl.bbox.left - bb.left, right: gl.bbox.right - bb.left, top: gl.bbox.top - base[k], bottom: gl.bbox.bottom - base[k] },
        em: words[wi].sizePx
      }));
    });
  });
  // huecos entre palabras
  const ratioGaps = [];
  rows.forEach(row => {
    for (let q = 0; q < row.length - 1; q++) {
      const a = out[row[q]], b = out[row[q + 1]];
      const d = b.inkL - a.inkR, s = Math.min(words[row[q]].sizePx, words[row[q + 1]].sizePx);
      if (!a.empty && !b.empty && s > 0) ratioGaps.push(d / s);
    }
  });
  ratioGaps.sort((a, b) => a - b);
  const typ = ratioGaps.length ? ratioGaps[ratioGaps.length >> 1] : 0.3;
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out[i + 1];
    const s = b ? Math.min(words[i].sizePx, words[i + 1].sizePx) : words[i].sizePx;
    let gap = typ * s;
    if (b && a.row === b.row && !a.empty && !b.empty) gap = b.inkL - a.inkR;
    a.gap = Math.max(0.12 * s, gap);
    a.w = Math.max(1e-3, a.inkR - a.inkL);
  }
  return out;
}

// ------------------------------------------------------------------ capas de texto ya hechas (A mano)
// Asigna glifos a caracteres no separadores, y agrupa en palabras y líneas.
// text: contenido (con \r); charInfo(i) -> {color, sizePx} del carácter i
function analyzeTextOutlines(comps, text, charInfo) {
  const chars = [];
  for (let i = 0; i < text.length; i++) if (!isSep(text[i])) chars.push(i);
  const glyphs = mergeMarks(componentsToGlyphs(comps), chars.length);
  // palabras por índice de carácter
  const wordOfChar = new Int32Array(text.length).fill(-1);
  let wi = -1, inWord = false;
  for (let i = 0; i < text.length; i++) {
    if (isSep(text[i])) { inWord = false; continue; }
    if (!inWord) { wi++; inWord = true; }
    wordOfChar[i] = wi;
  }
  const mapped = glyphs.length === chars.length;
  // dirección de las líneas: media de los vectores entre letras consecutivas de la misma palabra
  let dx = 0, dy = 0;
  const order = glyphs.map((g, k) => k);
  if (mapped) {
    for (let k = 1; k < glyphs.length; k++) {
      if (wordOfChar[chars[k]] !== wordOfChar[chars[k - 1]]) continue;
      const a = glyphs[k - 1].bbox, b = glyphs[k].bbox;
      const vx = (b.left + b.right - a.left - a.right) / 2, vy = (b.top + b.bottom - a.top - a.bottom) / 2;
      const l = Math.hypot(vx, vy); if (l > 0) { dx += vx / l; dy += vy / l; }
    }
  }
  let ang = Math.hypot(dx, dy) > 0.5 ? Math.atan2(dy, dx) : 0;
  if (Math.abs(ang) < 0.02) ang = 0;
  const c = Math.cos(-ang), s = Math.sin(-ang);
  const toLocal = (x, y) => [c * x - s * y, s * x + c * y];
  const glyphInfo = glyphs.map((g, k) => {
    const ci = mapped ? chars[k] : -1;
    const cx = (g.bbox.left + g.bbox.right) / 2, cy = (g.bbox.top + g.bbox.bottom) / 2;
    const lc = toLocal(cx, cy);
    // sin correspondencia exacta (ligaduras): color y tamaño del carácter en la posición proporcional
    const info = ci >= 0 ? charInfo(ci) : charInfo(chars[Math.min(chars.length - 1, Math.round(k * chars.length / Math.max(1, glyphs.length)))] || 0);
    return { g, ci, word: ci >= 0 ? wordOfChar[ci] : -1, lc, color: info.color, em: info.sizePx || (g.bbox.bottom - g.bbox.top) / 0.7 };
  });
  // tamaño de letra fiable: si el declarado no casa con el dibujo (unidades raras), manda el dibujo
  const ems = glyphInfo.map(q => q.em).sort((a, b) => a - b);
  let em = ems.length ? ems[ems.length >> 1] : 20;
  const hs = glyphs.map(g => g.bbox.bottom - g.bbox.top).sort((a, b) => a - b);
  if (hs.length >= 2) {
    const est = hs[hs.length >> 1] / 0.62;
    const k = est / em;
    if (k > 1.8 || k < 0.55) { for (const q of glyphInfo) q.em *= k; em *= k; }
  }
  // líneas: agrupar por la coordenada local perpendicular
  const sorted = glyphInfo.slice().sort((a, b) => a.lc[1] - b.lc[1]);
  let line = -1, lastY = -Infinity;
  for (const q of sorted) { if (q.lc[1] - lastY > em * 0.55) line++; q.line = line; lastY = q.lc[1]; }
  // palabras si no hay mapeo: por huecos dentro de cada línea
  if (!mapped) {
    let wcount = 0;
    const lines = new Map();
    for (const q of glyphInfo) { if (!lines.has(q.line)) lines.set(q.line, []); lines.get(q.line).push(q); }
    for (const [, qs] of lines) {
      qs.sort((a, b) => a.lc[0] - b.lc[0]);
      for (let k = 0; k < qs.length; k++) {
        if (k === 0 || qs[k].lc[0] - qs[k - 1].lc[0] - (qs[k].g.bbox.right - qs[k].g.bbox.left + qs[k - 1].g.bbox.right - qs[k - 1].g.bbox.left) / 2 > em * 0.22) wcount++;
        qs[k].word = wcount - 1;
      }
    }
  }
  return { glyphs: glyphInfo, angle: ang, em, mapped };
}

module.exports = { mergeMarks, componentsToGlyphs, segsBBox, allBBox, calibrate, buildMeasure, measureBaseSize, wordsFromOutlines, analyzeTextOutlines, isSep };
