'use strict';
// Dibujo: lienzo RGBA, composición, mapa de cada línea al documento y letras limpias.
// Sin dependencias de Photoshop.

const { Raster } = require('./raster.js');
const G = require('./geom.js');
const R2 = require('./rng.js');

function hexToRgb(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// una letra de cada color: parte del color base y cambia tono, saturación y luz según «v» (0..1).
// La sucesión áurea hace que dos letras seguidas nunca salgan casi iguales.
function rgbToHsl(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const f = (t) => { t = ((t % 1) + 1) % 1; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return s === 0 ? [l * 255, l * 255, l * 255].map(Math.round) : [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(x => Math.round(Math.max(0, Math.min(1, x)) * 255));
}
function letterColor(rgb, i, v, seed) {
  if (!v) return rgb;
  const [h, s, l] = rgbToHsl(rgb);
  const fr = x => x - Math.floor(x);
  const a = fr(i * 0.6180339 + (seed % 997) * 0.01371) * 2 - 1;
  const b = fr(i * 0.4142136 + (seed % 991) * 0.02713) * 2 - 1;
  const c = fr(i * 0.7320508 + (seed % 983) * 0.01913) * 2 - 1;
  const nh = h + a * v * 0.22;                                   // hasta ±80°
  const ns = Math.max(0, Math.min(1, s + b * v * 0.45 * (s < 0.08 ? 0 : 1)));
  // la luz se mueve sobre todo hacia arriba en colores oscuros y hacia abajo en los claros
  const nl = Math.max(0.04, Math.min(0.92, l + c * v * 0.22 + (l < 0.25 ? Math.abs(c) * v * 0.12 : 0)));
  return hslToRgb(nh, ns, nl);
}

// Lienzo de pigmento: cada píxel guarda cómo se ve sobre papel blanco (W, por canal, 1 = blanco) y cuánto
// está cubierto (A). Las tintas transparentes se acumulan como veladuras (multiplican: donde se montan,
// más oscuro y más saturado; donde hay poco pigmento, más claro y lavado). Al terminar, finalize() lo pasa
// a RGBA: el color y la opacidad que, sobre blanco, dan exactamente ese aspecto.
function makeCanvas(x0, y0, w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  return { x0: Math.floor(x0), y0: Math.floor(y0), w, h, data: new Uint8ClampedArray(w * h * 4), W: null, A: null };
}
function pig(canvas) {
  if (!canvas.W) { canvas.W = new Float32Array(canvas.w * canvas.h * 3).fill(1); canvas.A = new Float32Array(canvas.w * canvas.h); }
  return canvas;
}

// cobertura (Float32 bw*bh, 0..1) -> lienzo, como pintura que tapa (operador «sobre»)
function composite(canvas, cov, bx, by, bw, bh, rgb, alphaMul) {
  pig(canvas);
  const Wb = canvas.W, Ab = canvas.A, CW = canvas.w, CH = canvas.h;
  const am = alphaMul == null ? 1 : alphaMul;
  const T = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  for (let y = 0; y < bh; y++) {
    const cy = by + y - canvas.y0;
    if (cy < 0 || cy >= CH) continue;
    const row = y * bw;
    for (let x = 0; x < bw; x++) {
      const a = cov[row + x] * am;
      if (a <= 0.002) continue;
      const cx = bx + x - canvas.x0;
      if (cx < 0 || cx >= CW) continue;
      const k = cy * CW + cx, i = k * 3;
      Wb[i] += (T[0] - Wb[i]) * a; Wb[i + 1] += (T[1] - Wb[i + 1]) * a; Wb[i + 2] += (T[2] - Wb[i + 2]) * a;
      Ab[k] = 1 - (1 - Ab[k]) * (1 - a);
    }
  }
}

// pigmento (Float32 bw*bh, cantidad: 1 = el color tal cual, <1 más claro, >1 más oscuro y saturado)
// mode 'multiply': tinta transparente (veladura); 'over': pintura que tapa (guache, óleo)
function compositePigment(canvas, dens, bx, by, bw, bh, rgb, mode, alphaMul, hb) {
  pig(canvas);
  // (brillo: el spray apunta además cuánta pintura hay en cada punto —hb, 0,5 = película normal—; ver applyRelief)
  const Hb = hb && canvas.relief ? (canvas.Hh || (canvas.Hh = new Float32Array(canvas.w * canvas.h))) : null;
  const Wb = canvas.W, Ab = canvas.A, CW = canvas.w, CH = canvas.h;
  const am = alphaMul == null ? 1 : alphaMul;
  const T = [Math.max(0.02, rgb[0] / 255), Math.max(0.02, rgb[1] / 255), Math.max(0.02, rgb[2] / 255)];
  const L = [Math.log(T[0]), Math.log(T[1]), Math.log(T[2])];
  const paint = mode === 'paint', stain = mode === 'stain', over = mode === 'over' || stain;
  for (let y = 0; y < bh; y++) {
    const cy = by + y - canvas.y0;
    if (cy < 0 || cy >= CH) continue;
    const row = y * bw;
    for (let x = 0; x < bw; x++) {
      const d = dens[row + x] * am;
      if (d <= 0.004) continue;
      const cx = bx + x - canvas.x0;
      if (cx < 0 || cx >= CW) continue;
      const k = cy * CW + cx, i = k * 3;
      if (Hb) { const hv = hb[row + x]; if (hv > Hb[k]) Hb[k] = hv; }
      if (paint) {
        // pintura de bote: cada gotita es del color entero (poca pintura = menos puntos, no un color más pálido) y
        // todo lo que se junta es UNA película: una pasada sobre otra del mismo color solo puede tapar más, nunca
        // deja cerco claro
        const a = 1 - Math.exp(-3.4 * d);
        Wb[i] += (T[0] - Wb[i]) * a; Wb[i + 1] += (T[1] - Wb[i + 1]) * a; Wb[i + 2] += (T[2] - Wb[i + 2]) * a;
        Ab[k] = 1 - (1 - Ab[k]) * (1 - a);
      } else if (over) {
        // pintura opaca: tapa según la carga; el tono va de lavado (poca) a profundo (mucha)
        const a = 1 - Math.exp(-3.4 * d);
        const e = 0.2 + 0.8 * Math.min(2.2, d);
        // (una capa fina de pintura no aclara lo que ya está pintado debajo: el borde de una pincelada sobre otra
        //  no deja un cerco claro; solo el centro, bien cargado, tapa del todo)
        const kl = a * a * a;
        for (let c = 0; c < 3; c++) {
          const t = Math.exp(L[c] * e), w0 = Wb[i + c];
          let w = w0 + (t - w0) * a;
          if (w > w0) w = stain ? w0 : w0 + (w - w0) * kl;      // (tinta que cala: solo oscurece)
          Wb[i + c] = w;
        }
        Ab[k] = 1 - (1 - Ab[k]) * (1 - a);
      } else {
        Wb[i] *= Math.exp(L[0] * d); Wb[i + 1] *= Math.exp(L[1] * d); Wb[i + 2] *= Math.exp(L[2] * d);
        const a = 1 - Math.exp(-3 * d);
        Ab[k] = 1 - (1 - Ab[k]) * (1 - a);
      }
    }
  }
}

// lienzo de pigmento -> RGBA (color y opacidad que sobre blanco dan el mismo aspecto)
function finalize(canvas) {
  if (!canvas.W) return canvas;
  const Wb = canvas.W, Ab = canvas.A, D = canvas.data, n = canvas.w * canvas.h;
  for (let k = 0; k < n; k++) {
    const i = k * 3;
    const r = Wb[i], g = Wb[i + 1], b = Wb[i + 2];
    let a = Ab[k];
    const need = 1 - Math.min(r, g, b);
    if (need > a) a = need;
    if (a < 0.004) { D[4 * k + 3] = 0; continue; }
    D[4 * k] = (1 - (1 - r) / a) * 255; D[4 * k + 1] = (1 - (1 - g) / a) * 255; D[4 * k + 2] = (1 - (1 - b) / a) * 255;
    D[4 * k + 3] = a * 255;
  }
  canvas.W = null; canvas.A = null;
  if (canvas.Hh) { applyRelief(canvas); canvas.Hh = null; }
  return canvas;
}

// TEXTURA DE LA PINTURA (solo graffiti). El interior de una letra de bote es PLANO —una película de esmalte, sin
// volumen ni destellos de canto— pero no es un color de ordenador:
//  · donde cayó pintura de más (el punto en que la mano apretó parada, un giro lento, el cordón de un chorretón
//    y su gota) el color queda algo más hondo y mojado, en manchas suaves, sin contorno;
//  · el esmalte brilla: la luz resbala en bandas anchas y blandas que cruzan las letras enteras (dependen del
//    sitio del documento, no de cada trazo: en las uniones no se nota nada);
//  · de cerca tiene piel: un granillo fino y alguna pompita.
// canvas.Hh (lo apunta compositePigment): 0,5 = película normal; hasta 1 = pintura acumulada.
// canvas.relief = { amount 0..1, size: escala en px (según el grosor del trazo) }
function applyRelief(canvas) {
  const w = canvas.w, h = canvas.h, D = canvas.data, H0 = canvas.Hh, n = w * h;
  const amount = Math.max(0, Math.min(1, canvas.relief.amount || 0)), s = Math.max(1.5, canvas.relief.size || 3);
  if (amount <= 0) return;
  // (la carga, suavizada: manchas, no perfiles)
  let a = H0, b = new Float32Array(n);
  for (let t = 0, T = s > 6 ? 4 : s > 3 ? 3 : 2; t < T; t++) {
    for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x < w; x++) { const l = x > 0 ? a[r + x - 1] : a[r + x], rr = x < w - 1 ? a[r + x + 1] : a[r + x]; b[r + x] = (l + 2 * a[r + x] + rr) * 0.25; } }
    const c = a === H0 ? new Float32Array(n) : a;
    for (let y = 0; y < h; y++) { const r = y * w, ru = y > 0 ? r - w : r, rd = y < h - 1 ? r + w : r; for (let x = 0; x < w; x++) c[r + x] = (b[ru + x] + 2 * b[r + x] + b[rd + x]) * 0.25; }
    a = c;
  }
  // un poco de relieve: la película tiene su grosor (poco), lo acumulado abulta, el chorretón es un cordón y su
  // gota una pompa. Se ilumina desde arriba a la izquierda: claro en lo que mira a la luz, oscuro al otro lado
  const blurN = (src, times) => {
    let q = src, t = new Float32Array(n);
    for (let k = 0; k < times; k++) {
      for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x < w; x++) { const l = x > 0 ? q[r + x - 1] : q[r + x], rr = x < w - 1 ? q[r + x + 1] : q[r + x]; t[r + x] = (l + 2 * q[r + x] + rr) * 0.25; } }
      const c = q === src ? new Float32Array(n) : q;
      for (let y = 0; y < h; y++) { const r = y * w, ru = y > 0 ? r - w : r, rd = y < h - 1 ? r + w : r; for (let x = 0; x < w; x++) c[r + x] = (t[ru + x] + 2 * t[r + x] + t[rd + x]) * 0.25; }
      q = c;
    }
    return q;
  };
  const Hs1 = blurN(H0, 2), depth = s * 0.3, Z = new Float32Array(n);
  for (let k = 0; k < n; k++) { const v = Hs1[k]; if (v > 0) Z[k] = depth * (0.95 * Math.min(1, v * 2) + 2.2 * Math.max(0, v - 0.5) + 4 * Math.max(0, a[k] - 0.5)); }
  const dl = Math.max(1, Math.round(s * 0.22));        // paso del gradiente hacia la luz
  const f1 = 1 / (s * 15), f2 = 1 / (s * 5.5), f3 = 1 / Math.max(1.5, s * 0.5), cell = Math.max(3, Math.round(s * 2.2));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, v = H0[k], i = k * 4;
    if ((v < 0.3 && Hs1[k] < 0.2) || !D[i + 3]) continue;
    const m = v >= 0.48 ? 1 : Math.max(0, Math.min(1, (Math.max(v, Hs1[k] * 1.3) - 0.2) / 0.28));
    const X = canvas.x0 + x, Y = canvas.y0 + y;
    const acc = Math.max(0, Math.min(1, (a[k] - 0.52) * 2.6));     // pintura de más
    // brillo: bandas anchas (inclinadas, como la luz que resbala) + un aguado más corto
    const sheen = 0.6 * R2.noise2((X + Y * 0.6) * f1, (Y - X * 0.25) * f1 * 1.9, 913) + 0.4 * R2.noise2(X * f2, Y * f2, 915);
    // piel del esmalte y pompitas (muy pocas: un puntito claro con su sombra)
    let li = amount * (0.2 * sheen + 0.07 * R2.noise2(X * f3, Y * f3, 917) + 0.04 * (R2.hash2(X, Y, 919) - 0.5));
    const cx = Math.floor(X / cell), cy = Math.floor(Y / cell);
    if (R2.hash2(cx, cy, 921) < 0.035) { const px = (cx + 0.25 + 0.5 * R2.hash2(cx, cy, 923)) * cell, py = (cy + 0.25 + 0.5 * R2.hash2(cx, cy, 925)) * cell, dd = Math.hypot(X - px, Y - py); if (dd < 1.1) li += amount * 0.22; else if (dd < 2.1 && Y > py) li -= amount * 0.1; }
    li = (li - amount * 0.32 * acc) * m;
    // la luz: lo que mira arriba-izquierda aclara, lo de enfrente oscurece; más donde la pintura está cargada y
    // mojada (y a rachas: no brilla igual en todas partes)
    { const xa = x >= dl ? x - dl : 0, ya = y >= dl ? y - dl : 0, xb = x + dl < w ? x + dl : w - 1, yb = y + dl < h ? y + dl : h - 1;
      const e = Math.max(-1, Math.min(1, (Z[yb * w + xb] - Z[ya * w + xa]) / (dl * 2.83) * 4));     // >0: sube hacia abajo-derecha = mira a la luz
      const wet = Math.max(0.5, Math.min(1.5, 0.55 + 1.1 * acc + 0.55 * sheen + 1.3 * Math.max(0, v - 0.5)));
      // (y el destello: un punto de luz neto donde el cordón o la gota miran de lleno a la luz)
      li += amount * (e > 0 ? 0.8 * wet * e + 0.7 * wet * Math.max(0, e - 0.5) * Math.max(0, e - 0.5) : 0.5 * e); }
    for (let c = 0; c < 3; c++) { let u = D[i + c]; u += li > 0 ? (255 - u) * li : u * li; D[i + c] = u < 0 ? 0 : u > 255 ? 255 : u; }
  }
}

function polysBBox(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (let i = 0; i < p.length; i += 2) {
    if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
    if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
  }
  return [x0, y0, x1, y1];
}

// rasteriza polígonos (ya en coordenadas del documento) a una cobertura local
function rasterLocal(polys, clip, pad) {
  let [x0, y0, x1, y1] = polysBBox(polys);
  if (!isFinite(x0)) return null;
  pad = pad || 1;
  x0 = Math.floor(x0) - pad; y0 = Math.floor(y0) - pad; x1 = Math.ceil(x1) + pad; y1 = Math.ceil(y1) + pad;
  if (clip) { x0 = Math.max(x0, clip.x0); y0 = Math.max(y0, clip.y0); x1 = Math.min(x1, clip.x0 + clip.w); y1 = Math.min(y1, clip.y0 + clip.h); }
  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0 || bw * bh > 6e7) return null;
  const r = new Raster(bw, bh);
  for (const p of polys) {
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { q[i] = p[i] - x0; q[i + 1] = p[i + 1] - y0; }
    r.poly(q);
  }
  return { cov: r.coverage(), x0, y0, w: bw, h: bh };
}

function fillPolys(canvas, polys, rgb, alphaMul) {
  const r = rasterLocal(polys, canvas, 1);
  if (r) composite(canvas, r.cov, r.x0, r.y0, r.w, r.h, rgb, alphaMul);
}

// ------------------------------------------------------------------ líneas
// Coloca palabras en una línea: devuelve instancias de glifo con x en espacio natural de línea
// (x desde el borde izquierdo de la tinta de la línea, y desde la línea base, hacia abajo)
function lineGlyphs(words, line) {
  const out = [];
  let pen = 0;
  for (let k = line.start; k < line.end; k++) {
    const w = words[k];
    for (const g of (w.glyphs || [])) out.push({ word: k, g, dx: pen, color: w.color, em: g.em || w.em || 20 });
    pen += w.w + (k < line.end - 1 ? w.gap : 0);
  }
  return out;
}

// Mapa natural de línea -> documento. Si la línea se ensancha, parte del ancho extra va al espaciado.
function lineMapper(line, frame, align, insts, tau) {
  const n = line.nat, w = Math.max(1e-6, n.w), H = Math.max(1e-6, n.asc + n.desc);
  const xe = line.xStretch || 1;
  const fw = Math.min(1, line.fillW == null ? 1 : line.fillW);
  const off = align === 'left' ? 0 : align === 'right' ? 1 - fw : (1 - fw) / 2;
  const q = line.quad;
  // reparto del estiramiento entre letras y huecos
  let remap = x => x / w;
  if (xe > 1.02 && tau > 0 && insts && insts.length > 1) {
    const iv = insts.map(it => [it.dx + it.g.bbox.left, it.dx + it.g.bbox.right]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [a, b] of iv) { const L = merged[merged.length - 1]; if (L && a <= L[1]) L[1] = Math.max(L[1], b); else merged.push([a, b]); }
    let G0 = 0; for (const [a, b] of merged) G0 += b - a;
    const gapTot = Math.max(0, w - G0);
    if (gapTot > w * 0.02) {
      const gx = Math.pow(xe, 1 - tau);
      const total = xe * w;
      const kg = Math.max(0.3, (total - gx * G0) / gapTot);
      const tot2 = gx * G0 + kg * gapTot;
      const knots = [[0, 0]];
      let X = 0, prev = 0;
      for (const [a, b] of merged) {
        X += Math.max(0, a - prev) * kg; knots.push([a, X]);
        X += (b - a) * gx; knots.push([b, X]); prev = b;
      }
      X += Math.max(0, w - prev) * kg; knots.push([w, X]);
      remap = x => {
        if (x <= 0) return (x * kg) / tot2;
        let lo = 0, hi = knots.length - 1;
        if (x >= knots[hi][0]) return (knots[hi][1] + (x - knots[hi][0]) * kg) / tot2;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (knots[m][0] <= x) lo = m; else hi = m; }
        const [xa, Xa] = knots[lo], [xb, Xb] = knots[hi];
        return (Xa + (x - xa) * (Xb - Xa) / ((xb - xa) || 1)) / tot2;
      };
    }
  }
  return (x, y) => {
    const u = off + remap(x) * fw, v = (y + n.asc) / H;
    const tx = q.tl[0] + (q.tr[0] - q.tl[0]) * u, ty = q.tl[1] + (q.tr[1] - q.tl[1]) * u;
    const bx = q.bl[0] + (q.br[0] - q.bl[0]) * u, by = q.bl[1] + (q.br[1] - q.bl[1]) * u;
    return frame.toDoc(tx + (bx - tx) * v, ty + (by - ty) * v);
  };
}

// contornos de un glifo transformados por map (con subdivisión para mapas no lineales)
function mapContours(contours, map, tolNat, maxLen) {
  return contours.map(segs => {
    const p = G.flattenSegs(segs, tolNat, maxLen);
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { const d = map(p[i], p[i + 1]); q[i] = d[0]; q[i + 1] = d[1]; }
    return q;
  });
}

function localScale(map, x, y, e) {
  const p = map(x, y), a = map(x + e, y), b = map(x, y + e);
  const j = [(a[0] - p[0]) / e, (a[1] - p[1]) / e, (b[0] - p[0]) / e, (b[1] - p[1]) / e];
  return { s: Math.sqrt(Math.abs(j[0] * j[3] - j[1] * j[2])) || 1, sx: Math.hypot(j[0], j[1]), sy: Math.hypot(j[2], j[3]) };
}

// Texto limpio encajado (modo imagen sin efecto a mano)
function renderPlain(canvas, words, sol, frame, align, tau) {
  let n = 0;
  for (const line of sol.lines) {
    const insts = lineGlyphs(words, line);
    const map = lineMapper(line, frame, align, insts, tau);
    const H = line.nat.asc + line.nat.desc;
    for (const it of insts) {
      const m = (x, y) => map(x + it.dx, y);
      const cx = (it.g.bbox.left + it.g.bbox.right) / 2, cy = (it.g.bbox.top + it.g.bbox.bottom) / 2;
      const ls = localScale(m, cx, cy, H * 0.05);
      const tol = 0.2 / Math.max(1e-6, Math.max(ls.sx, ls.sy));
      const polys = mapContours(it.g.contours, m, tol, frame.affine && isRectQuad(line.quad) ? 0 : H / 14);
      fillPolys(canvas, polys, hexToRgb(it.color));
      n++;
    }
  }
  return n;
}
function isRectQuad(q) { return Math.abs(q.tl[0] - q.bl[0]) < 1e-6 && Math.abs(q.tr[0] - q.br[0]) < 1e-6; }

function trimCanvas(canvas) {
  finalize(canvas);
  const { w, h, data } = canvas;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) if (data[row + x * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) out.set(data.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + nw) * 4), y * nw * 4);
  return { x0: canvas.x0 + x0, y0: canvas.y0 + y0, w: nw, h: nh, data: out };
}

// 8 bits -> profundidad del documento
function toDepth(data, bits) {
  if (bits === 16) { const o = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) o[i] = Math.round(data[i] * 32768 / 255); return o; }
  if (bits === 32) { const o = new Float32Array(data.length); for (let i = 0; i < data.length; i++) o[i] = data[i] / 255; return o; }
  return data;
}

module.exports = { hexToRgb, letterColor, makeCanvas, composite, compositePigment, finalize, rasterLocal, fillPolys, lineGlyphs, lineMapper, mapContours, localScale, renderPlain, trimCanvas, toDepth, polysBBox };
