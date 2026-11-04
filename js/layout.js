'use strict';
// Maquetación del texto escrito a mano dentro de una forma.
//  - el texto viene con niveles por palabra (pequeña, normal, importante, la más importante)
//  - se eligen los cortes de línea para que el bloque tenga la proporción de la forma
//  - envolvente: el bloque se mete en la forma con el parche de Coons (el texto se curva con ella)
//  - silueta: las líneas se reparten en los huecos que deja la forma, a la mayor letra que quepa
// Devuelve letras con sus trazos en un espacio común y un mapa a píxeles del documento.
// Sin dependencias de Photoshop.

const FN = require('./fonts.js');
const SH = require('./shapes.js');

// niveles: tamaño relativo, pasadas (repasado) y grosor del trazo
const LEVELS = {
  '-1': { size: 0.66, passes: 1, w: 0.88 },
  '0': { size: 1, passes: 1, w: 1 },
  '1': { size: 1.38, passes: 2, w: 1.12 },
  '2': { size: 1.85, passes: 3, w: 1.25 }
};
function levelOf(l, contrast) {
  const L = LEVELS[String(l)] || LEVELS['0'];
  const c = contrast == null ? 1 : contrast;
  return { size: Math.pow(L.size, c), passes: L.passes, w: 1 + (L.w - 1) * c };
}

// ------------------------------------------------------------------ texto -> palabras
// text: con saltos de línea; levels: nivel por palabra (en orden)
function tokenize(text) {
  const out = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((ln, li) => {
    const ws = ln.split(/[ \t]+/).filter(w => w.length);
    ws.forEach((w, k) => out.push({ text: w, brk: k === 0 && li > 0 && out.length > 0 }));
    if (!ws.length && li > 0 && out.length) out.push({ text: '', brk: true, empty: true });
  });
  return out.filter(t => !t.empty);
}

// mide las palabras con la tipografía elegida
function measure(tokens, levels, o) {
  const met = FN.metrics(o.persona, o.mode);
  return tokens.map((t, i) => {
    const lv = levelOf(levels[i] || 0, o.contrast);
    // el grosor de la herramienta también ocupa: más aire entre letras y entre líneas con trazo gordo
    const pad = o.inkPad || 0;
    const sw = FN.setWord(o.persona, o.mode, FN.caseText(t.text, o.mode), o.track || 0, pad);
    const caps = o.mode === 'mayus';
    const asc = (caps ? FN.CAP + 0.12 : met.asc) + pad * 1.1, desc = (caps ? 0.1 : met.desc) + pad * 0.9;
    return { text: t.text, brk: t.brk, level: levels[i] || 0, lv, size: lv.size, set: sw, w: sw.width * lv.size, asc: asc * lv.size, desc: desc * lv.size };
  });
}

// ------------------------------------------------------------------ cortes de línea
// Programación dinámica: líneas lo más parecidas a targetW, respetando los saltos que puso el usuario
function breakLines(words, targetW, space) {
  const n = words.length;
  const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let width = 0;
    for (let i = j - 1; i >= 0; i--) {
      // la línea va de i a j-1; no puede cruzar un salto del usuario
      if (i < j - 1 && words[i + 1].brk) break;
      width += words[i].w + (i < j - 1 ? space * (words[i].size + words[i + 1].size) / 2 : 0);
      if (i > 0 && !words[i].brk && false) continue;
      const over = width - targetW;
      let c = over > 0 ? over * over * 6 + (i < j - 1 ? 0 : 0) : over * over;
      if (i === j - 1 && over > 0) c = over * over * 1.5; // una palabra sola nunca es imposible
      // la palabra más importante tiende a ir sola o con poca compañía
      const total = best[i] + c + 0.02 * targetW * targetW;
      if (i > 0 && !words[i].brk && best[i] === Infinity) continue;
      if (total < best[j] && (i === 0 || best[i] < Infinity)) { best[j] = total; prev[j] = i; }
      if (width > targetW * 2.5) break;
    }
    // si el usuario cortó aquí, la línea siguiente debe empezar en j
  }
  const lines = [];
  let j = n;
  while (j > 0) { const i = prev[j]; if (i < 0) break; lines.unshift([i, j]); j = i; }
  // respeta los saltos del usuario (por si acaso)
  const out = [];
  for (const [a, b] of lines) {
    let s = a;
    for (let k = a + 1; k < b; k++) if (words[k].brk) { out.push([s, k]); s = k; }
    out.push([s, b]);
  }
  return out;
}

function lineBoxes(words, ranges, space, leading) {
  return ranges.map(([a, b]) => {
    let w = 0, asc = 0, desc = 0;
    for (let k = a; k < b; k++) {
      w += words[k].w + (k > a ? space * (words[k - 1].size + words[k].size) / 2 : 0);
      asc = Math.max(asc, words[k].asc); desc = Math.max(desc, words[k].desc);
    }
    return { a, b, w, asc: asc * leading, desc: desc * leading };
  });
}

// mejor reparto para una proporción ancho/alto (aspect) del hueco
function bestBlock(words, aspect, space, leading) {
  const n = words.length;
  if (!n) return null;
  const forced = words.filter(w => w.brk).length + 1;
  let total = 0; for (const w of words) total += w.w + space * w.size;
  let best = null;
  const maxLines = Math.min(n, 14);
  for (let L = forced; L <= maxLines; L++) {
    const target = Math.max(total / L, Math.max(...words.map(w => w.w)));
    const ranges = breakLines(words, target, space);
    const boxes = lineBoxes(words, ranges, space, leading);
    const W = Math.max(...boxes.map(b => b.w));
    const H = boxes.reduce((s, b) => s + b.asc + b.desc, 0);
    // ragged: diferencia de anchos (con relleno de líneas se perdona algo)
    let rag = 0; for (const b of boxes) rag += Math.pow(1 - b.w / W, 2);
    rag /= boxes.length;
    const score = Math.abs(Math.log((W / H) / aspect)) + rag * 0.9 + (boxes.length > 1 ? 0 : 0);
    if (!best || score < best.score) best = { score, ranges, boxes, W, H };
  }
  return best;
}

// ------------------------------------------------------------------ colocar letras
// Pone cada letra de cada línea; xFill: cuánto se ensanchan las líneas cortas (0..0.4)
function placeBlock(words, block, space, align, xFill) {
  const letters = [];
  let y = 0;
  const W = block.W;
  block.boxes.forEach((bx, li) => {
    const sc = Math.min(1 + (xFill || 0), Math.max(1, (W / Math.max(1e-6, bx.w)))) ;
    const lineW = bx.w * (align === 'justify' ? sc : 1);
    const off = align === 'left' ? 0 : align === 'right' ? W - lineW : (W - lineW) / 2;
    // con «justificar», el ancho extra va a los espacios y un poco a las letras
    const extra = align === 'justify' ? lineW - bx.w : 0;
    const gaps = bx.b - bx.a - 1;
    const gapAdd = gaps > 0 ? extra * 0.75 / gaps : 0;
    const letterK = gaps > 0 ? 1 + extra * 0.25 / Math.max(1e-6, bx.w) : sc;
    y += bx.asc;
    let x = off;
    for (let k = bx.a; k < bx.b; k++) {
      const w = words[k];
      for (const q of w.set.glyphs) letters.push({ g: q.g, x: x + q.x * w.size * letterK, base: y, size: w.size, sx: letterK, word: k, line: li, level: w.level, lv: w.lv });
      x += w.w * letterK + (k < bx.b - 1 ? space * (w.size + words[k + 1].size) / 2 + gapAdd : 0);
    }
    y += bx.desc;
  });
  return letters;
}

// ------------------------------------------------------------------ en la forma
// shape: SH.readShape(...). o: { persona, mode, contrast, leading, align, xFill, margin, track }
function layoutInShape(text, levels, shape, o) {
  const tokens = tokenize(text);
  const words = measure(tokens, levels || [], o);
  if (!words.length) return null;
  const met = FN.metrics(o.persona, o.mode);
  const space = met.space * (o.spaceMul || 1) + 2 * (o.inkPad || 0);
  const leading = o.leading || 1;
  if (shape.kind === 'env') return inEnvelope(words, shape, space, leading, o);
  return inSilhouette(words, shape, space, leading, o, met);
}

function inEnvelope(words, shape, space, leading, o) {
  const m = o.margin == null ? 0.05 : o.margin;
  const Wp = shape.W * (1 - 2 * m), Hp = shape.H * (1 - 2 * m);
  const block = bestBlock(words, Wp / Hp, space, leading);
  const letters = placeBlock(words, block, space, o.align || 'center', o.xFill == null ? 0.2 : o.xFill);
  // el bloque llena el hueco; se permite estirar un poco (el trazo no se deforma: solo el camino)
  let sx = Wp / block.W, sy = Hp / block.H;
  const lim = o.stretch == null ? 1.3 : o.stretch;
  if (sx / sy > lim) sx = sy * lim; else if (sy / sx > lim) sy = sx * lim;
  const ox = (shape.W - block.W * sx) / 2, oy = (shape.H - block.H * sy) / 2;
  const map = (x, y) => shape.map((ox + x * sx) / shape.W, (oy + y * sy) / shape.H);
  return { letters, words, block, map, unit: Math.sqrt(sx * sy), lineCount: block.boxes.length };
}

// silueta: marco de la forma (girado según su «arriba»), líneas horizontales en ese marco
function inSilhouette(words, shape, space, leading, o, met) {
  const up = shape.up || [0, -1];
  // marco: eje x = derecha de la forma, eje y = hacia abajo de la forma
  const ex = [-up[1], up[0]], ey = [-up[0], -up[1]];
  const toF = (x, y) => [x * ex[0] + y * ex[1], x * ey[0] + y * ey[1]];
  const toD = (u, v) => [u * ex[0] + v * ey[0], u * ex[1] + v * ey[1]];
  const conv = p => { const q = new Array(p.length); for (let i = 0; i < p.length; i += 2) { const r = toF(p[i], p[i + 1]); q[i] = r[0]; q[i + 1] = r[1]; } return q; };
  const poly = conv(shape.poly), holes = (shape.holes || []).map(conv);
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (let i = 0; i < poly.length; i += 2) { y0 = Math.min(y0, poly[i + 1]); y1 = Math.max(y1, poly[i + 1]); x0 = Math.min(x0, poly[i]); x1 = Math.max(x1, poly[i]); }
  const Hs = y1 - y0, Ws = x1 - x0;
  const m = (o.margin == null ? 0.05 : o.margin);
  // prueba un tamaño (px por em) y reparte; devuelve null si no cabe
  const tryK = (K, yStart) => {
    const lines = [];
    let k = 0, y = yStart;
    const pad = K * 0.06 + Math.min(Ws, Hs) * m * 0.5;
    while (k < words.length) {
      // altura de la línea según las palabras que entren (se estima con la siguiente palabra)
      let asc = words[k].asc * leading * K, desc = words[k].desc * leading * K;
      let placed = null;
      for (let tries = 0; tries < 3 && !placed; tries++) {
        const iv = SH.bandIntervals([poly], holes, y + K * 0.05, y + asc + desc - K * 0.05, 6).filter(a => a[1] - a[0] > 2 * pad);
        if (!iv.length) break;
        const wide = iv.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
        const avail = wide[1] - wide[0] - 2 * pad;
        let w = 0, j = k, a2 = asc, d2 = desc;
        while (j < words.length) {
          if (j > k && words[j].brk) break;
          const add = words[j].w * K + (j > k ? space * K * (words[j - 1].size + words[j].size) / 2 : 0);
          if (w + add > avail && j > k) break;
          w += add; a2 = Math.max(a2, words[j].asc * leading * K); d2 = Math.max(d2, words[j].desc * leading * K); j++;
        }
        if (j === k) break;
        if (w > avail) { return null; }
        if (a2 + d2 > asc + desc + 1e-6) { asc = a2; desc = d2; continue; } // la línea es más alta: se vuelve a medir
        placed = { a: k, b: j, w, asc, desc, x0: wide[0] + pad, avail, y };
      }
      if (!placed) {
        y += K * 0.25;
        if (y + asc + desc > y1) return null;
        continue;
      }
      lines.push(placed);
      y += placed.asc + placed.desc;
      k = placed.b;
      if (y > y1 + 1) return null;
    }
    return { lines, end: y };
  };
  // mayor tamaño que quepa (búsqueda binaria), probando a empezar a distintas alturas
  // (en formas irregulares lo mejor no siempre es empezar arriba del todo)
  let sol = null;
  for (const f of [0, 0.04, 0.08, 0.13, 0.19, 0.26, 0.34]) {
    const ys = y0 + Hs * (m * 0.5 + f);
    let lo = sol ? sol.K : Hs * 0.01, hi = Hs * 1.2;
    if (sol && !tryK(sol.K * 1.01, ys)) continue;
    for (let it = 0; it < 20; it++) {
      const K = (lo + hi) / 2;
      const r = tryK(K, ys);
      if (r) { lo = K; if (!sol || K > sol.K) sol = { K, r, ys }; } else hi = K;
    }
  }
  if (!sol) return null;
  // centrado vertical: se reparte el sobrante arriba y abajo (si sigue cabiendo)
  const used = sol.r.end - sol.ys;
  const below = y1 - Hs * m * 0.5 - sol.r.end;
  let r2 = sol.r;
  for (const k of [0.5, 0.35, 0.2]) { const t = tryK(sol.K, sol.ys + below * k); if (t) { r2 = t; break; } }
  void used;
  const K = sol.K;
  const letters = [];
  r2.lines.forEach((ln, li) => {
    const off = ln.x0 + (o.align === 'left' ? 0 : o.align === 'right' ? ln.avail - ln.w : (ln.avail - ln.w) / 2);
    let x = off;
    const base = ln.y + ln.asc;
    for (let k = ln.a; k < ln.b; k++) {
      const w = words[k];
      for (const q of w.set.glyphs) letters.push({ g: q.g, x: (x + q.x * w.size * K) / K, base: base / K, size: w.size, sx: 1, word: k, line: li, level: w.level, lv: w.lv });
      x += w.w * K + (k < ln.b - 1 ? space * K * (w.size + words[k + 1].size) / 2 : 0);
    }
  });
  // las letras quedan en em; el mapa las lleva a píxeles del documento
  const map = (x, y) => toD(x * K, y * K);
  return { letters, words, map, unit: K, lineCount: r2.lines.length };
}

module.exports = { LEVELS, levelOf, tokenize, measure, breakLines, bestBlock, placeBlock, layoutInShape };
