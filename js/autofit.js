'use strict';
// AUTOENCAJAR, letra a letra.
// Sin importancias: las letras llenan la forma al máximo, cada una con su propio tamaño. Se resuelve como un
// sistema que se relaja: cada letra mira el hueco que le queda en vertical (entre las letras de la línea de
// arriba, las de abajo y el borde de la forma) y quiere crecer hasta llenarlo; como la línea tiene un ancho
// fijo, las que crecen empujan a las vecinas, que se encogen. Al final, debajo de una letra baja hay una letra
// alta, y al revés, como en un cartel hecho a mano. Las letras conservan su forma (solo se estiran un poco en
// vertical), los espacios entre palabras se ven siempre y nada se monta.
// Trabaja en el marco de la forma (px): envolventes (rect, arco, bandera, abanico) y siluetas (círculo, lazo).
// Sin dependencias de Photoshop.

const R = require('./rng.js');
const SH = require('./shapes.js');

const NC = 240;           // columnas del perfil

function lettersOf(words, ink) {
  // cada letra: ancho de tinta + grosor, alto total de tinta (con tilde y descendente)
  // (palabra subrayada: la raya va en un hueco reservado debajo de cada letra; negrita: más grosor)
  return words.map((w, wi) => w.set.glyphs.map((q, j) => {
    const b = q.g.box, bd = q.g.body;
    // (negativo: cada letra lleva alrededor el hueco de la caja pintada)
    const ik = ink * (w.bold ? 1.6 : 1) + (w.neg ? 0.2 : 0);
    const bw = Math.max(0.06, bd.right - bd.left) + ik;
    const top = -b.top, desc = Math.max(0, b.bottom);
    const ul = w.under && !w.neg ? 0.2 : 0;
    // todas las letras cuentan al menos con la altura de mayúscula (signos y minúsculas cortas no se agigantan)
    const ht = Math.max(0.7 * 0.97, top + desc) + ik + ul;
    return { q, g: q.g, word: wi, first: j === 0, bw, ht, a: bw / ht, desc: desc + ul, ink: ik, bold: !!w.bold };
  }));
}

// frame: { W, H, colTop: Float64Array(NC), colBot, lineIv(y0, y1) -> [xa, xb] | null }
function solve(frame, words, L, ranges, o, seed) {
  const { W, H } = frame;
  const rnd = R.mulberry32((seed * 31 + L * 977) >>> 0);
  const gapIn = 0.05, sp = o.sp;                 // en fracción de la altura de la letra
  const lines = ranges.map(([a, b]) => {
    const its = [];
    for (let k = a; k < b; k++) for (const l of words[k]) its.push({ l, want: Math.exp(R.gauss(rnd) * 0.16), sxr: Math.exp(R.gauss(rnd) * 0.05) });
    return { its };
  });
  // franjas de partida (repartidas en el alto útil de la forma)
  let yTop = Infinity, yBot = -Infinity;
  for (let k = 0; k < NC; k++) if (frame.colBot[k] > frame.colTop[k]) { yTop = Math.min(yTop, frame.colTop[k]); yBot = Math.max(yBot, frame.colBot[k]); }
  if (!isFinite(yTop)) return null;
  // en siluetas, la primera y la última franja no van al mismo borde (ahí casi no hay ancho)
  const pad = frame.sil ? (yBot - yTop) * 0.04 : 0;
  yTop += pad; yBot -= pad;
  const bandH = (yBot - yTop) / L;
  lines.forEach((ln, i) => {
    ln.y0 = yTop + i * bandH; ln.y1 = ln.y0 + bandH;
    const iv = frame.lineIv(ln.y0 + bandH * 0.22, ln.y1 - bandH * 0.22);
    ln.iv = iv;
    for (const it of ln.its) { it.h = bandH * 0.86 * it.want; it.top = ln.y0 + bandH * 0.07; }
  });
  if (lines.some(ln => !ln.iv)) return null;
  const col = x => Math.max(0, Math.min(NC - 1, Math.round(x / W * (NC - 1))));
  // perfil (abajo de la línea de arriba, arriba de la de abajo) a partir de lo colocado
  const prof = (ln, which) => {
    const P = new Float64Array(NC).fill(which === 'bot' ? -Infinity : Infinity);
    for (const it of ln.its) {
      if (it.x == null) continue;
      const c0 = col(it.x), c1 = col(it.x + it.w);
      for (let c = c0; c <= c1; c++) {
        if (which === 'bot') P[c] = Math.max(P[c], it.top + it.H);
        else P[c] = Math.min(P[c], it.top);
      }
    }
    return P;
  };
  const SXMIN = 0.8, SXMAX = 1.32;
  const gapOf = (ln, i) => { const it = ln.its[i]; if (!i) return 0; return it.l.first ? sp : gapIn * (it.l.bw - it.l.ink < 0.16 || ln.its[i - 1].l.bw - ln.its[i - 1].l.ink < 0.16 ? 2.5 : 1); };
  const place = (ln) => {
    // anchos a partir de los altos deseados; la línea llena su hueco ensanchando o estrechando las letras
    // (dentro de lo razonable); si aun así sobra, la línea se centra (las letras no se separan)
    const [xa, xb] = ln.iv;
    let hm = 0; for (const it of ln.its) hm += it.h; hm /= ln.its.length;
    let nat = 0, gaps = 0;
    ln.its.forEach((it, i) => { nat += it.l.a * it.h * it.sxr; gaps += gapOf(ln, i) * hm; });
    const A = xb - xa;
    let sx = (A - gaps) / Math.max(1e-6, nat), f = 1;
    if (sx > SXMAX) sx = SXMAX;
    else if (sx < SXMIN) { f = sx / SXMIN; sx = SXMIN; }
    const used = nat * sx * f + gaps * f;
    let x = xa + Math.max(0, A - used) / 2;
    ln.its.forEach((it, i) => {
      x += gapOf(ln, i) * hm * f;
      it.x = x; it.nh = it.h * f; it.w = it.l.a * it.nh * sx * it.sxr; it.sx = sx * it.sxr;
      x += it.w;
    });
  };
  const VG = () => bandH * 0.06;
  const iters = 26;
  for (let t = 0; t < iters; t++) {
    for (const ln of lines) place(ln);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const above = i > 0 ? prof(lines[i - 1], 'bot') : null;
      const below = i < lines.length - 1 ? prof(lines[i + 1], 'top') : null;
      const vg = VG();
      for (const it of ln.its) {
        const c0 = col(it.x), c1 = col(it.x + it.w);
        let up = -Infinity, dn = Infinity;
        for (let c = c0; c <= c1; c++) {
          up = Math.max(up, frame.colTop[c], above && isFinite(above[c]) ? above[c] + vg : -Infinity);
          dn = Math.min(dn, frame.colBot[c], below && isFinite(below[c]) ? below[c] - vg : Infinity);
        }
        // cada letra puede meterse en la franja de al lado, pero no ocupar dos líneas
        const reach = t === 0 ? 0 : 0.32 * bandH;
        up = Math.max(up, ln.y0 - reach); dn = Math.min(dn, ln.y1 + reach);
        // primera y última línea: no se pegan al borde de la forma más de la cuenta
        const avail = Math.max(bandH * 0.15, dn - up);
        it.up = up; it.dn = dn; it.avail = avail;
        // la letra crece (o encoge) hacia su hueco; su forma manda: estirado vertical como mucho ×1,25
        it.h += (avail * it.want * 0.97 - it.h) * 0.3;
        it.h = Math.max(bandH * 0.55, Math.min(bandH * 1.38, it.h));
        it.H = Math.max(Math.min(avail, it.nh), Math.min(it.nh * 0.9, avail));
        // posición vertical: centrada en su hueco
        it.top = up + (avail - it.H) * 0.5;
      }
    }
  }
  // ajuste final: nada se monta (si no cabe, la letra encoge)
  for (const ln of lines) place(ln);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const above = i > 0 ? prof(lines[i - 1], 'bot') : null;
      const below = i < lines.length - 1 ? prof(lines[i + 1], 'top') : null;
      const vg = VG() * 0.6;
      for (const it of ln.its) {
        const c0 = col(it.x + it.w * 0.04), c1 = col(it.x + it.w * 0.96);
        let up = -Infinity, dn = Infinity;
        for (let c = c0; c <= c1; c++) {
          up = Math.max(up, frame.colTop[c], above && isFinite(above[c]) ? above[c] + vg : -Infinity);
          dn = Math.min(dn, frame.colBot[c], below && isFinite(below[c]) ? below[c] - vg : Infinity);
        }
        if (it.top < up) { it.H -= up - it.top; it.top = up; }
        if (it.top + it.H > dn) it.H = dn - it.top;
        it.H = Math.max(it.H, 1e-3);
        // no se aplasta más de la cuenta: si no cabe, la letra entera encoge (centrada en su sitio)
        if (it.H < it.nh * 0.9) {
          const k = it.H / (it.nh * 0.9), nw = it.w * k;
          it.x += (it.w - nw) / 2; it.w = nw; it.nh *= k;
        }
      }
    }
  }
  // puntuación: área llena (cajas de las letras), castiga letras diminutas o aplastadas
  let area = 0, minR = Infinity, sq = 0, n = 0;
  const hs = [];
  for (const ln of lines) for (const it of ln.its) {
    area += it.w * it.H; hs.push(it.H);
    if (it.sx < 0.95) sq += 0.95 - it.sx;
    if (it.sx > 1.15) sq += (it.sx - 1.15) * 0.5;
    n++;
  }
  hs.sort((a, b) => a - b);
  const med = hs[hs.length >> 1] || 1;
  const tiny = hs.filter(h => h < med * 0.5).length / Math.max(1, hs.length);
  const score = area / (frame.area || W * H) - 0.6 * sq / Math.max(1, n) - 0.8 * tiny;
  return { lines, score, bandH };
}

// shape: la forma leída (env o silueta). Devuelve letras + mapa como el resto de maquetas.
function autoFit(words, shape, space, o) {
  const ink = (o.inkPad || 0) * 1.6;
  const W0 = lettersOf(words, ink);
  let frame, toDoc;
  const m = o.margin == null ? 0.04 : o.margin;
  if (shape.kind === 'env') {
    const W = shape.W, H = shape.H, mx = W * m, my = H * m;
    const colTop = new Float64Array(NC).fill(my), colBot = new Float64Array(NC).fill(H - my);
    for (let k = 0; k < NC; k++) { const x = k / (NC - 1) * W; if (x < mx || x > W - mx) { colTop[k] = H / 2; colBot[k] = H / 2; } }
    frame = { W, H, colTop, colBot, lineIv: () => [mx, W - mx], area: (W - 2 * mx) * (H - 2 * my), sil: false };
    toDoc = (x, y) => shape.map(x / W, y / H);
  } else {
    const up = shape.up || [0, -1];
    const ex = [-up[1], up[0]], ey = [-up[0], -up[1]];
    const conv = p => { const q = new Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = p[i] * ex[0] + p[i + 1] * ex[1]; q[i + 1] = p[i] * ey[0] + p[i + 1] * ey[1]; } return q; };
    const poly = conv(shape.poly), holes = (shape.holes || []).map(conv);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < poly.length; i += 2) { x0 = Math.min(x0, poly[i]); x1 = Math.max(x1, poly[i]); y0 = Math.min(y0, poly[i + 1]); y1 = Math.max(y1, poly[i + 1]); }
    const W = x1 - x0, H = y1 - y0, mm = m * Math.min(W, H);
    // columnas: alto disponible de la forma en cada x (el tramo más largo)
    const swap = p => { const q = new Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = p[i + 1]; q[i + 1] = p[i]; } return q; };
    const sp = swap(poly), sh = holes.map(swap);
    const colTop = new Float64Array(NC), colBot = new Float64Array(NC);
    let area = 0;
    for (let k = 0; k < NC; k++) {
      const x = x0 + (k + 0.5) / NC * W;
      const iv = SH.bandIntervals([sp], sh, x - W / NC * 0.5, x + W / NC * 0.5, 3).filter(a => a[1] - a[0] > 2 * mm);
      if (!iv.length) { colTop[k] = H / 2; colBot[k] = H / 2; continue; }
      const b = iv.sort((a, c) => (c[1] - c[0]) - (a[1] - a[0]))[0];
      colTop[k] = b[0] - y0 + mm; colBot[k] = b[1] - y0 - mm;
      area += (colBot[k] - colTop[k]) * W / NC;
    }
    const lineIv = (ya, yb) => {
      const iv = SH.bandIntervals([poly], holes, y0 + ya, y0 + yb, 5).filter(a => a[1] - a[0] > 2 * mm);
      if (!iv.length) return null;
      const b = iv.sort((a, c) => (c[1] - c[0]) - (a[1] - a[0]))[0];
      return [b[0] - x0 + mm, b[1] - x0 - mm];
    };
    frame = { W, H, colTop, colBot, lineIv, area, sil: true };
    toDoc = (x, y) => { const U = x + x0, V = y + y0; return [U * ex[0] + V * ey[0], U * ex[1] + V * ey[1]]; };
  }
  // cortes de línea: se prueban varios números de líneas y se queda el que más llena
  const sp = Math.max(0.28, space * 0.9 / 0.72);         // espacio entre palabras (fracción del alto de letra)
  const wNat = W0.map(ls => { let s = 0; ls.forEach((l, k) => { s += l.a + (k ? 0.05 : 0); }); return s; });
  const forced = words.filter(w => w.brk).length + 1;
  let total = 0; for (const w of wNat) total += w + sp;
  const aspect = frame.W / frame.H;
  let best = null;
  const maxL = Math.min(words.length + 6, 12);
  for (let L = forced; L <= maxL; L++) {
    // ancho objetivo de línea (en altos de letra): el que da L líneas en esta proporción
    const ranges = breakExact(words, wNat, L, sp);
    if (!ranges) continue;
    const nL = ranges.length;
    // líneas de una sola palabra muy larga en formas muy bajas: se descartan pronto
    if (nL > 1 && aspect > 6 && nL > 2) continue;
    const res = solve(frame, W0, nL, ranges, { sp }, (o.seed || 1) + L);
    if (!res) continue;
    if (!best || res.score > best.score) best = res;
  }
  if (!best) return null;
  // a letras: tamaño (em por px) por el ancho; estirado vertical propio
  const letters = [];
  best.lines.forEach((ln, li) => {
    for (const it of ln.its) {
      const l = it.l, g = l.g, bd = g.body;
      const size = it.H / l.ht;                                     // em por px (por el alto)
      const sx = Math.max(0.7, Math.min(1.45, it.w / (l.bw * size)));  // ancho propio
      const inkPx = l.ink * size;
      // origen: el cuerpo empieza en x; la base deja el descendente por debajo
      letters.push({ g, x: it.x + inkPx / 2 * sx - bd.left * size * sx, base: it.top + it.H - inkPx / 2 - l.desc * size, size, sx, sy: 1, word: l.word, line: li, level: 0, lv: l.bold ? { passes: 3, w: 1.15 } : { passes: 1, w: 1 } });
    }
  });
  // a unidades de letra (como el resto de maquetas): K px por unidad
  const sizes = letters.map(l => l.size).sort((a, b) => a - b);
  const K = sizes[sizes.length >> 1] || 1;
  for (const l of letters) { l.x /= K; l.base /= K; l.size /= K; }
  const map = (u, v) => toDoc(u * K, v * K);
  return { letters, words, map, unit: K, lineCount: best.lines.length, auto: true };
}

// exactamente L líneas, lo más iguales posible, respetando los saltos del usuario (programación dinámica)
function breakExact(words, wNat, L, sp) {
  const n = words.length;
  if (L > n) return null;
  let total = 0; for (const w of wNat) total += w + sp;
  const target = total / L;
  const INF = Infinity;
  const D = [], Pv = [];
  for (let l = 0; l <= L; l++) { D.push(new Array(n + 1).fill(INF)); Pv.push(new Array(n + 1).fill(-1)); }
  D[0][0] = 0;
  for (let l = 1; l <= L; l++) for (let j = 1; j <= n; j++) {
    let width = 0;
    for (let i = j - 1; i >= 0; i--) {
      if (i < j - 1 && words[i + 1].brk) break;        // la línea no cruza un salto del usuario
      width += wNat[i] + (i < j - 1 ? sp : 0);
      if (D[l - 1][i] === INF) continue;
      if (i > 0 && j < n && false) continue;
      // el salto del usuario obliga a cortar en i
      const d = width - target, c = d * d * (d > 0 ? 1.4 : 1);
      if (D[l - 1][i] + c < D[l][j]) { D[l][j] = D[l - 1][i] + c; Pv[l][j] = i; }
    }
  }
  if (D[L][n] === INF) return null;
  const out = [];
  let j = n;
  for (let l = L; l > 0; l--) { const i = Pv[l][j]; out.unshift([i, j]); j = i; }
  // comprobación: cada salto del usuario es un corte
  for (let k = 1; k < n; k++) if (words[k].brk && !out.some(r => r[0] === k)) return null;
  return out;
}

// cortes de línea por anchos naturales (en altos de letra), respetando los saltos del usuario
function breakWords(words, wNat, target, sp) {
  const n = words.length;
  const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let width = 0;
    for (let i = j - 1; i >= 0; i--) {
      if (i < j - 1 && words[i + 1].brk) break;
      width += wNat[i] + (i < j - 1 ? sp : 0);
      const over = width - target;
      const c = (over > 0 ? over * over * (i === j - 1 ? 1.5 : 5) : over * over) + 0.02 * target * target;
      if (best[i] < Infinity && best[i] + c < best[j]) { best[j] = best[i] + c; prev[j] = i; }
      if (width > target * 2.5) break;
    }
  }
  const out = [];
  let j = n;
  while (j > 0) { const i = prev[j]; if (i < 0) break; out.unshift([i, j]); j = i; }
  return out;
}

module.exports = { autoFit };
