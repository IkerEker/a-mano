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
const R = require('./rng.js');

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
  // cualquier salto de línea cuenta (Photoshop puede usar \r, \u2028, \u0003...)
  const lines = String(text || '').replace(/\r\n?|[\u2028\u2029\u0003\u000b\u000c\u0085]/g, '\n').split('\n');
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
    let lv = levelOf(levels[i] || 0, o.contrast);
    // marcas de la palabra: negrita (repasada con pasadas que se ven, algo más gruesa) y subrayado
    const mk = (o.marks && o.marks[i]) || '';
    const bold = mk.indexOf('b') >= 0, under = mk.indexOf('u') >= 0, neg = mk.indexOf('n') >= 0;
    if (bold) lv = { size: lv.size, passes: lv.passes + 2, w: lv.w * 1.15 };
    // el grosor de la herramienta también ocupa: más aire entre letras y entre líneas con trazo gordo
    const mk0 = (o.marks && o.marks[i]) || '';
    const pad = (o.inkPad || 0) * (mk0.indexOf('b') >= 0 ? 1.8 : 1) + (mk0.indexOf('n') >= 0 ? 0.05 : 0);
    // (negativo: letra de bloque, gruesa y recta, con aire para el perfil)
    const isNeg = mk0.indexOf('n') >= 0;
    const sw = FN.setWord(isNeg ? 'neg:' + o.persona : o.persona, isNeg && o.mode === 'cursiva' ? 'mayus' : o.mode, FN.caseText(t.text, isNeg && o.mode === 'cursiva' ? 'mayus' : o.mode), o.track || 0, isNeg ? pad + 0.07 : pad, i + 1);
    const caps = o.mode === 'mayus';
    // las letras de alturas desiguales (infantil, nerviosa) necesitan más aire entre líneas
    const hv = FN.styleOf(o.persona).hVar || 0;
    const asc = (caps ? FN.CAP * (1 + hv * 1.5) + 0.12 : met.asc) + pad * 1.1, desc = (caps ? 0.1 + hv * 0.12 : met.desc) + pad * 0.9;
    // el subrayado necesita sitio debajo; el negativo, su caja alrededor
    let descU = under && !neg ? Math.max(desc, 0.1) + 0.2 : desc, ascN = asc, set = sw;
    if (neg) {
      const NP = 0.24 + pad;
      set = Object.assign({}, sw, { width: sw.width + 2 * NP, glyphs: sw.glyphs.map(q => Object.assign({}, q, { x: q.x + NP })) });
      ascN += NP * 0.9; descU += NP * 0.9;
    }
    return { text: t.text, brk: t.brk, level: levels[i] || 0, lv, size: lv.size, set, w: set.width * lv.size, asc: ascN * lv.size, desc: descU * lv.size, bold, under, neg };
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
  if (o.auto) return require('./autofit.js').autoFit(words, shape, space, o);
  if (shape.kind === 'env') return inEnvelope(words, shape, space, leading, o);
  return inSilhouette(words, shape, space, leading, o, met);
}

function inEnvelope(words, shape, space, leading, o) {
  const m = o.margin == null ? 0.05 : o.margin;
  const Wp = shape.W * (1 - 2 * m), Hp = shape.H * (1 - 2 * m);
  const block = bestBlock(words, Wp / Hp, space, leading);
  // (en cursiva las letras van ligadas: no se separan para llenar la línea)
  const letters = placeBlock(words, block, space, o.align || 'center', o.mode === 'cursiva' ? 0 : o.xFill == null ? 0.2 : o.xFill);
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

// ------------------------------------------------------------------ AUTOENCAJAR
// Sin importancias: las letras llenan la forma al máximo. Cada línea ocupa todo el ancho (las líneas con
// menos letras salen más grandes); cada letra sube a ocupar el hueco que dejan las de la línea de arriba
// (perfil de lo ya colocado) y se estira hacia abajo hasta la línea siguiente. Los espacios entre palabras
// se ven siempre; dentro de la palabra, todo apretado.
function autoLines(words, space, aspect, o) {
  // letras de cada palabra (ancho propio, altura de su tinta)
  const isLower = o.mode !== 'mayus';
  const ink = (o.inkPad || 0) * 1.8;               // el trazo ocupa: cada letra cuenta su grosor
  const gapIn = 0.035, sp = space * 0.9;
  const W = words.map(w => {
    const ls = w.set.glyphs.map(q => {
      const b = q.g.box, bd = q.g.body;
      return { q, w: Math.max(0.06, bd.right - bd.left) + ink, ink, left: bd.left, top: -b.top, bottom: -b.bottom };
    });
    let width = 0; ls.forEach((l, k) => { width += l.w + (k ? gapIn : 0); });
    return { ls, width };
  });
  const n = words.length;
  const forced = words.filter(w => w.brk).length + 1;
  let total = 0; for (const w of W) total += w.width + sp;
  let best = null;
  for (let L = forced; L <= Math.min(n, 12); L++) {
    const target = Math.max(total / L, Math.max(...W.map(w => w.width)));
    const ranges = breakLines(words.map((w, i) => Object.assign({}, w, { w: W[i].width, size: 1 })), target, sp);
    const res = stackAuto(W, ranges, sp, gapIn, o.seed || 1, isLower);
    const score = Math.abs(Math.log((res.W / res.H) / aspect)) + (res.lines.length > 1 ? 0 : 0.05);
    if (!best || score < best.score) best = Object.assign({ score }, res);
  }
  return best;
}
function stackAuto(W, ranges, sp, gapIn, seed, isLower, band) {
  // band(y, h) -> [x0, x1]: hueco disponible para una línea que empieza en y con altura h (siluetas)
  const BW = band ? band.W : 10;                  // ancho del bloque (unidades)
  const rnd = R.mulberry32(seed * 7 + ranges.length * 131);
  const N = 400, sky = new Float64Array(N);        // perfil: lo más bajo ocupado en cada x
  const lines = [];
  let y0 = 0;
  ranges.forEach(([a, b], li) => {
    // cada letra con su escala horizontal propia (un poco distinta), y la línea llena el ancho
    const items = [];
    for (let k = a; k < b; k++) {
      W[k].ls.forEach((l, j) => items.push({ l, word: k, first: j === 0, wf: Math.exp(R.gauss(rnd) * 0.12), hf: Math.exp(R.gauss(rnd) * 0.1) }));
    }
    // las letras de un solo palo (I, L, 1...) necesitan algo más de aire para no pegarse a la vecina
    const narrow = it => it && it.l.w - (it.l.ink || 0) < 0.13;
    items.forEach((it, i) => { it.gap = i ? (it.first ? sp : gapIn * (narrow(it) || narrow(items[i - 1]) ? 3 : 1)) : 0; });
    let nat = 0; items.forEach((it, i) => { nat += it.l.w * it.wf + it.gap; });
    let s = BW / nat, xs = 0;
    if (band) {
      // la línea va en su franja de la forma, con el ancho que hay ahí (y no más alta que la franja)
      const pl = band.plan[li];
      s = Math.min((pl.iv[1] - pl.iv[0]) / nat, pl.sMax);
      xs = (pl.iv[0] + pl.iv[1]) / 2 - nat * s / 2;
    }
    let x = xs;
    const Hl = 0.72 * s;                           // altura base de la línea (mayúscula a esa escala)
    const placed = [];
    items.forEach((it, i) => {
      if (i) x += it.gap * s;
      const w = it.l.w * it.wf * s;
      const i0 = Math.max(0, Math.floor(x / BW * N)), i1 = Math.min(N - 1, Math.ceil((x + w) / BW * N));
      let top = 0; for (let k = i0; k <= i1; k++) top = Math.max(top, sky[k]);
      placed.push({ it, x, w, top });
      x += w;
    });
    // fondo común de la línea: la letra más baja de arriba + la altura base; cada letra crece hacia arriba
    // hasta el hueco que tenga encima (como mucho ×1,7)
    const gapV = Hl * 0.08;
    let base = 0; for (const p of placed) base = Math.max(base, p.top + gapV + Hl * p.it.hf);
    if (li === 0) base = (band ? band.plan[0].y : 0) + Math.max(...placed.map(p => Hl * p.it.hf));
    else if (band) base = Math.max(base, band.plan[li].y + Hl * 0.95);
    for (const p of placed) {
      const room = base - (li === 0 ? base - Hl * p.it.hf : p.top + gapV);
      p.h = Math.min(room, Hl * p.it.hf * 1.7);
      p.base = base;
    }
    for (const p of placed) {
      const i0 = Math.max(0, Math.floor(p.x / BW * N)), i1 = Math.min(N - 1, Math.ceil((p.x + p.w) / BW * N));
      for (let k = i0; k <= i1; k++) sky[k] = Math.max(sky[k], p.base);
    }
    lines.push({ placed, base, Hl });
    y0 = base;
  });
  // las letras de una línea también bajan hasta la siguiente (rellenan el hueco de abajo)
  for (let li = 0; li < lines.length - 1; li++) {
    const nx = lines[li + 1];
    for (const p of lines[li].placed) {
      let lowTop = Infinity;
      for (const q of nx.placed) if (q.x < p.x + p.w && q.x + q.w > p.x) lowTop = Math.min(lowTop, q.base - q.h);
      if (!isFinite(lowTop)) continue;
      const extra = Math.max(0, lowTop - nx.Hl * 0.08 - p.base);
      if (extra > 0) { const add = Math.min(extra, p.h * 0.35); p.base += add; p.h += add; }
    }
  }
  let H = 0; for (const ln of lines) for (const p of ln.placed) H = Math.max(H, p.base);
  return { lines, W: BW, H, isLower };
}
// silueta: líneas en los huecos de la forma, tan grandes como quepan (búsqueda del ancho usado)
function autoSilhouette(words, shape, space, o) {
  const up = shape.up || [0, -1];
  const ex = [-up[1], up[0]], ey = [-up[0], -up[1]];
  const conv = p => { const q = new Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = p[i] * ex[0] + p[i + 1] * ex[1]; q[i + 1] = p[i] * ey[0] + p[i + 1] * ey[1]; } return q; };
  const poly = conv(shape.poly), holes = (shape.holes || []).map(conv);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < poly.length; i += 2) { x0 = Math.min(x0, poly[i]); x1 = Math.max(x1, poly[i]); y0 = Math.min(y0, poly[i + 1]); y1 = Math.max(y1, poly[i + 1]); }
  const Ws = x1 - x0, Hs = y1 - y0, m = (o.margin == null ? 0.04 : o.margin) * Math.min(Ws, Hs);
  // en unidades del bloque: x desde x0, y desde y0
  const at = (y, h) => {
    const iv = SH.bandIntervals([poly], holes, y0 + y, y0 + y + h, 5).filter(a => a[1] - a[0] > 2 * m);
    if (!iv.length) return null;
    const w = iv.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
    return [w[0] - x0 + m, w[1] - x0 - m];
  };
  const isLower = o.mode !== 'mayus';
  const ink = (o.inkPad || 0) * 1.8;
  const gapIn = 0.035, sp = space * 0.9;
  const Wd = words.map(w => { const ls = w.set.glyphs.map(q => { const b = q.g.box, bd = q.g.body; return { q, w: Math.max(0.06, bd.right - bd.left) + ink, ink, left: bd.left, top: -b.top, bottom: -b.bottom }; }); let width = 0; ls.forEach((l, k) => { width += l.w + (k ? gapIn : 0); }); return { ls, width }; });
  let best = null;
  const forced = words.filter(w => w.brk).length + 1;
  let total = 0; for (const w of Wd) total += w.width + sp;
  for (let L = forced; L <= Math.min(words.length, 12); L++) {
    const target = Math.max(total / L, Math.max(...Wd.map(w => w.width)));
    const ranges = breakLines(words.map((w, i) => Object.assign({}, w, { w: Wd[i].width, size: 1 })), target, sp);
    // altura de línea que más llena: las líneas se reparten a lo alto de la forma y cada una toma su ancho
    let sol = null, bestA = -1;
    const nL = ranges.length;
    for (let k = 1; k <= 14; k++) {
      const Hl = (Hs - 2 * m) / (nL * 1.12) * (0.35 + 0.65 * k / 14);
      const start = m + ((Hs - 2 * m) - nL * Hl * 1.12) / 2;
      const plan = [];
      let ok = true;
      for (let i = 0; i < nL; i++) {
        const y = start + i * Hl * 1.12;
        const iv = at(y, Hl);
        if (!iv) { ok = false; break; }
        plan.push({ y, iv, sMax: Hl / 0.72 });
      }
      if (!ok) continue;
      const res = stackAuto(Wd, ranges, sp, gapIn, o.seed || 1, isLower, { W: Ws, plan });
      if (res.H > Hs - m * 0.5) continue;
      // área ocupada por las letras (lo que más llena gana)
      let area = 0; for (const ln of res.lines) for (const p of ln.placed) area += p.w * p.h;
      if (area > bestA) { bestA = area; sol = res; }
    }
    if (!sol) continue;
    let area = 0; for (const ln of sol.lines) for (const p of ln.placed) area += p.w * p.h;
    const score = -area;
    if (!best || score < best.score) best = Object.assign({ score }, sol);
  }
  if (!best) return null;
  const letters = [];
  const dy = 0;
  best.lines.forEach((ln, li) => {
    for (const p of ln.placed) {
      const g = p.it.l.q.g, bd = g.body;
      const desc = Math.max(0, g.box.bottom);
      const capH = Math.max(0.2, -g.box.top + desc);
      const inkW = p.it.l.ink, bodyW = Math.max(0.06, bd.right - bd.left);
      const size = p.w / (bodyW + inkW);
      const hIn = Math.max(p.h * 0.4, p.h - inkW * size);
      const sy2 = Math.max(0.5, Math.min(2.4, hIn / (capH * size)));
      letters.push({ g, x: x0 + p.x + inkW * size / 2 - bd.left * size, base: y0 + dy + p.base - inkW * size / 2 - desc * size * sy2, size, sx: 1, sy: sy2, word: p.it.word, line: li, level: 0, lv: { passes: 1, w: 1 } });
    }
  });
  // a unidades de letra (como el resto de maquetas): K px por unidad
  const sizes = letters.map(l => l.size).sort((a, b) => a - b);
  const K = sizes[sizes.length >> 1] || 1;
  for (const l of letters) { l.x /= K; l.base /= K; l.size /= K; }
  const map = (u, v) => { u *= K; v *= K; return [u * ex[0] + v * ey[0], u * ex[1] + v * ey[1]]; };
  return { letters, words, map, unit: K, lineCount: best.lines.length, auto: true };
}
function autoFit(words, shape, space, o, met) {
  const m = o.margin == null ? 0.04 : o.margin;
  let Wp, Hp;
  if (shape.kind !== 'env') return autoSilhouette(words, shape, space, o);
  if (shape.kind === 'env') { Wp = shape.W * (1 - 2 * m); Hp = shape.H * (1 - 2 * m); }
  else {
    // silueta: su caja (en el marco de la forma) y luego se recorta a la forma con el mapa
    const up = shape.up || [0, -1];
    const ex = [-up[1], up[0]], ey = [-up[0], -up[1]];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < shape.poly.length; i += 2) { const X = shape.poly[i], Y = shape.poly[i + 1]; const u = X * ex[0] + Y * ex[1], v = X * ey[0] + Y * ey[1]; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    Wp = (x1 - x0) * 0.78; Hp = (y1 - y0) * 0.78;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    shape = { kind: 'env', W: Wp, H: Hp, map: (u, v) => { const U = cx + (u - 0.5) * Wp, V = cy + (v - 0.5) * Hp; return [U * ex[0] + V * ey[0], U * ex[1] + V * ey[1]]; } };
    Wp = shape.W; Hp = shape.H;
  }
  const res = autoLines(words, space, Wp / Hp, o);
  if (!res) return null;
  // el bloque llena el hueco (se estira lo que haga falta, hasta ×1,5 en un sentido)
  let sx = Wp / res.W, sy = Hp / res.H;
  const lim = Math.max(1.5, o.stretch || 1.3);
  if (sx / sy > lim) sx = sy * lim; else if (sy / sx > lim) sy = sx * lim;
  const ox = (shape.W - res.W * sx) / 2, oy = (shape.H - res.H * sy) / 2;
  const map = (x, y) => shape.map((ox + x * sx) / shape.W, (oy + y * sy) / shape.H);
  // a letras: cada una con su tamaño (em) y su escala vertical propia
  const letters = [];
  res.lines.forEach((ln, li) => {
    for (const p of ln.placed) {
      const g = p.it.l.q.g;
      const bd = g.body;
      const desc = Math.max(0, g.box.bottom);                         // descendente (p, g, y...)
      const capH = Math.max(0.2, -g.box.top + desc);
      const inkW = p.it.l.ink, bodyW = Math.max(0.06, bd.right - bd.left);
      const size = p.w / (bodyW + inkW);                              // em por anchura (sin el grosor)
      const hIn = Math.max(p.h * 0.4, p.h - inkW * size);
      const sy2 = Math.max(0.5, Math.min(2.4, hIn / (capH * size)));  // estirado vertical
      letters.push({ g, x: p.x + inkW * size / 2 - bd.left * size, base: p.base - inkW * size / 2 - desc * size * sy2, size, sx: 1, sy: sy2, word: p.it.word, line: li, level: 0, lv: { passes: 1, w: 1 } });
    }
  });
  return { letters, words, map, unit: Math.sqrt(sx * sy), lineCount: res.lines.length, auto: true };
}

module.exports = { autoFit, LEVELS, levelOf, tokenize, measure, breakLines, bestBlock, placeBlock, layoutInShape };
