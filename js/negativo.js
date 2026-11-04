'use strict';
// NEGATIVOS: se pinta la caja de fuera y las letras quedan libres (el papel).
// 1. Máscara de las letras (en px del documento): trazos gordos de la letra (GENERAR) o el contorno de la
//    fuente (CALCAR).
// 2. Campo de distancia hacia fuera de las letras: con él se sacan
//    · los contornos desplazados (el trazo que «dibuja» cada letra por fuera, a la distancia justa para que su
//      canto toque la letra) por marching squares, y
//    · la máscara del relleno (el relleno llega hasta el contorno y nunca entra en la letra; los huecos de la
//      O, la A o la B se rellenan porque están lejos de la tinta).
// 3. Cajas (una por línea): se rellenan a mano. Lápiz: garabato denso en diagonal (dos capas) y la caja
//    perfilada. Pincel: pinceladas anchas a lo largo de la línea que se salen un poco de la caja, más otra
//    capa cruzada. Las pinceladas siguen la línea (en un arco, se curvan con él).
// Devuelve trazos con el mismo formato que writer.plan, así se pintan por franjas igual que el resto.
// Sin dependencias de Photoshop.

const R = require('./rng.js');
const INK = require('./ink.js');
const ST = require('./strokes.js');
const { Raster } = require('./raster.js');

const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ máscara de letras
function makeGrid(bounds, maxPx) {
  const W = bounds.right - bounds.left, H = bounds.bottom - bounds.top;
  const s = Math.min(1, Math.sqrt((maxPx || 3.2e6) / Math.max(1, W * H)));
  const w = Math.max(4, Math.ceil(W * s)), h = Math.max(4, Math.ceil(H * s));
  return { x0: bounds.left, y0: bounds.top, w, h, s, d: new Float32Array(w * h) };
}
// trazos gordos: cápsulas (radio r·w de cada punto)
function stampCapsules(G, strokes) {
  const { s, w, h } = G;
  for (const st of strokes) {
    const P = st.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = (P[i].x - G.x0) * s, ay = (P[i].y - G.y0) * s, bx = (P[i + 1].x - G.x0) * s, by = (P[i + 1].y - G.y0) * s;
      const ra = st.r * (P[i].w == null ? 1 : P[i].w) * s, rb = st.r * (P[i + 1].w == null ? 1 : P[i + 1].w) * s;
      const rm = Math.max(ra, rb) + 1;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rm)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + rm));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - rm)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + rm));
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = ((px - ax) * dx + (py - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + dx * t - px, qy = ay + dy * t - py;
        const rr = ra + (rb - ra) * t;
        const c = Math.max(0, Math.min(1, rr - Math.sqrt(qx * qx + qy * qy) + 0.5));
        const k = y * w + x;
        if (c > G.d[k]) G.d[k] = c;
      }
    }
  }
}
// polígonos rellenos (contornos de la fuente), regla no nula
function stampPolys(G, polys) {
  const r = new Raster(G.w, G.h);
  for (const p of polys) {
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { q[i] = (p[i] - G.x0) * G.s; q[i + 1] = (p[i + 1] - G.y0) * G.s; }
    r.poly(q);
  }
  const cov = r.coverage();
  for (let i = 0; i < G.d.length; i++) if (cov[i] > G.d[i]) G.d[i] = cov[i];
}

// ------------------------------------------------------------------ contornos (marching squares)
// iso-línea de F (rejilla w×h) al nivel lev; devuelve polilíneas en coordenadas de rejilla
function isoLines(F, w, h, lev) {
  const segs = [];
  const at = (x, y) => F[y * w + x];
  const lerp = (a, b, va, vb) => { const t = (lev - va) / ((vb - va) || 1e-9); return a + (b - a) * t; };
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const idx = (a > lev ? 1 : 0) | (b > lev ? 2 : 0) | (c > lev ? 4 : 0) | (d > lev ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = [lerp(x, x + 1, a, b), y], Rr = [x + 1, lerp(y, y + 1, b, c)], B = [lerp(x, x + 1, d, c), y + 1], L = [x, lerp(y, y + 1, a, d)];
    const add = (p, q) => segs.push([p, q]);
    switch (idx) {
      case 1: case 14: add(L, T); break;
      case 2: case 13: add(T, Rr); break;
      case 3: case 12: add(L, Rr); break;
      case 4: case 11: add(Rr, B); break;
      case 6: case 9: add(T, B); break;
      case 7: case 8: add(L, B); break;
      case 5: add(L, T); add(Rr, B); break;
      case 10: add(T, Rr); add(L, B); break;
    }
  }
  // unir segmentos en polilíneas
  const key = p => Math.round(p[0] * 64) + ',' + Math.round(p[1] * 64);
  const ends = new Map();
  segs.forEach((sg, i) => { for (const e of [0, 1]) { const k = key(sg[e]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  const used = new Uint8Array(segs.length);
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const cand = (ends.get(key(tip)) || []).find(j => !used[j]);
        if (cand == null) break;
        used[cand] = 1;
        const sg = segs[cand];
        const nx = key(sg[0]) === key(tip) ? sg[1] : sg[0];
        if (dir) line.push(nx); else line.unshift(nx);
      }
    }
    out.push(line);
  }
  return out;
}
function resamplePoly(p, step) {
  const out = [p[0]];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    acc += L;
    if (acc >= step) { out.push(b); acc = 0; }
  }
  if (out[out.length - 1] !== p[p.length - 1]) out.push(p[p.length - 1]);
  return out;
}
function smoothPoly(p, k, closed) {
  const n = p.length;
  return p.map((q, i) => {
    if (!closed && (i === 0 || i === n - 1)) return q;
    let sx = 0, sy = 0, c = 0;
    for (let j = -k; j <= k; j++) { let m = i + j; if (closed) m = (m + n) % n; else m = Math.max(0, Math.min(n - 1, m)); sx += p[m][0]; sy += p[m][1]; c++; }
    return [sx / c, sy / c];
  });
}
function plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }

// ------------------------------------------------------------------ plan
// o: { mode: 'lapiz' | 'pincel', em (px de una letra), boxes: [{ toDoc(u, v), W, H }], letterStrokes?, letterPolys?,
//      width (multiplica grosores), seed }
function plan(o) {
  const rnd = R.mulberry32((o.seed * 2654435761) >>> 0);
  const g = () => R.gauss(rnd);
  const em = o.em, wm = o.width || 1, lap = o.mode !== 'pincel';
  // herramientas
  const Pfill = lap ? INK.preset('lapiz', 'blando') : INK.preset('pincel', 'seco');
  // (a pincel, el contorno es la misma pintura que el fondo: el canto de la letra lo hace el pincel, sin raya)
  const Pline = lap ? INK.preset('lapiz', 'blando') : INK.preset('pincel', 'seco');
  const Pbox = lap ? INK.preset('lapiz', 'hb') : null;
  const rFill = (lap ? 0.026 : 0.11) * em * wm;
  const rLine = (lap ? 0.022 : 0.05) * em * wm;
  const dOut = lap ? rLine * 1.25 : rLine * 0.95;   // centro del contorno: su canto toca la letra
  const dFill = lap ? dOut * 0.95 : dOut * 0.85;
  // límites: las cajas (con margen para lo que se sale)
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const B of o.boxes) for (let k = 0; k <= 24; k++) for (const [u, v] of [[B.W * k / 24, 0], [B.W * k / 24, B.H], [0, B.H * k / 24], [B.W, B.H * k / 24]]) {
    const q = B.toDoc(u, v); bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]);
  }
  const marg = rFill * 4 + em * 0.2;
  const G = makeGrid({ left: bx0 - marg, top: by0 - marg, right: bx1 + marg, bottom: by1 + marg });
  if (o.letterStrokes) stampCapsules(G, o.letterStrokes);
  if (o.letterPolys) stampPolys(G, o.letterPolys);
  // distancia hacia fuera (px del documento)
  const bin = new Uint8Array(G.w * G.h);
  for (let i = 0; i < bin.length; i++) bin[i] = G.d[i] < 0.5 ? 1 : 0;
  const D = ST.edt(bin, G.w, G.h);
  for (let i = 0; i < D.length; i++) D[i] /= G.s;
  // letras de la fuente (CALCAR): se engordan un poco para que el negativo se lea
  if (o.grow > 0) for (let i = 0; i < D.length; i++) { const c = smooth01(o.grow + 0.7, o.grow - 0.7, D[i]); if (c > G.d[i]) G.d[i] = c; D[i] = Math.max(0, D[i] - o.grow); }
  // máscaras: relleno (hasta el contorno) y contorno (nunca dentro de la letra)
  const mk = (a, b) => { const d = new Float32Array(D.length); for (let i = 0; i < D.length; i++) d[i] = smooth01(a, b, D[i]) * (1 - G.d[i]); return { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d, out: 1 }; };
  const Mfill = mk(dFill - Math.max(1, rFill * 0.15), dFill + Math.max(1, rFill * 0.25));
  const Mline = mk(0.2, 1.2);
  const out = [];
  let seedK = o.seed * 31 + 7;
  const push = (pts, P, r, mask, alpha, letter) => {
    if (pts.length < 2) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    const m = r * 3 + 3;
    out.push({ pts, r, P, seed: (seedK += 7919) >>> 0, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m }, alpha: alpha || 1, mask, letter: letter || 0, word: 0 });
  };
  // ---- relleno de cada caja (en su marco: u a lo largo de la línea, v a lo alto)
  o.boxes.forEach((B, bi) => {
    const W = B.W, H = B.H, map = (u, v) => { const q = B.toDoc(u, v); return { x: q[0], y: q[1] }; };
    // escala del marco (px por unidad) para pasar distancias en px a unidades de la caja
    const q0 = B.toDoc(W / 2, H / 2), q1 = B.toDoc(W / 2 + 1, H / 2), ku = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
    const rF = rFill / ku;
    if (lap) {
      // garabato: rayas en diagonal que van y vienen, densas; dos capas algo cruzadas
      for (const [ang0, dens] of [[1.05 + g() * 0.08, 1], [1.32 + g() * 0.08, 0.75]]) {
        const cot = 1 / Math.tan(ang0), gap = rF * (1.45 + 0.25 * rnd()) / dens;
        let k = 0;
        for (let u = -H * cot - rF * 2; u < W + rF * 2; u += gap * (0.8 + 0.4 * rnd()), k++) {
          const ov0 = (rnd() - 0.3) * 0.08 * H, ov1 = (rnd() - 0.3) * 0.08 * H;
          const va = -ov0, vb = H + ov1;
          const pts = [];
          for (let j = 0; j <= 8; j++) {
            const v = va + (vb - va) * j / 8;
            const uu = u + v * cot + g() * rF * 0.15;
            if (uu < -rF * 2 || uu > W + rF * 2) continue;
            pts.push(map(uu, v));
          }
          if (k % 2) pts.reverse();
          push(pts, Pfill, rFill * (0.85 + 0.3 * rnd()), Mfill, 0.85 + 0.15 * rnd(), bi);
        }
      }
      // la caja perfilada a lápiz (cada lado de un golpe, se pasa en las esquinas)
      const side = (a, b) => { const pts = []; for (let j = 0; j <= 12; j++) { const t = -0.03 + 1.06 * j / 12; pts.push(map(a[0] + (b[0] - a[0]) * t + g() * rF * 0.2, a[1] + (b[1] - a[1]) * t + g() * rF * 0.2)); } return pts; };
      const c = [[0, 0], [W, 0], [W, H], [0, H]];
      for (let i = 0; i < 4; i++) for (let pass = 0; pass < (rnd() < 0.5 ? 2 : 1); pass++) push(side(c[i], c[(i + 1) % 4]), Pbox, rLine * 0.8, Mline, 0.9, bi);
    } else {
      // pinceladas a lo largo de la línea, que se salen un poco de la caja
      const gapv = rF * 1.25;
      for (let v = rF * 0.4; v < H + rF * 0.5; v += gapv * (0.8 + 0.35 * rnd())) {
        let u = -rF * (0.5 + rnd());
        while (u < W) {
          const len = Math.min(W - u + rF * (0.4 + rnd()), W * (0.45 + 0.6 * rnd()));
          const pts = [];
          const tilt = g() * 0.05 * H;
          for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push(map(u + len * t, v + tilt * (t - 0.5) + g() * rF * 0.06)); }
          if (rnd() < 0.5) pts.reverse();
          push(pts, Pfill, rFill * (0.8 + 0.4 * rnd()), Mfill, 1, bi);
          u += len * (0.75 + 0.15 * rnd());
        }
      }
      // segunda capa cruzada, más suelta (tapa los huecos y deja el gesto)
      const n2 = Math.ceil(W / (rF * 2.5));
      for (let k = 0; k < n2; k++) {
        const u = W * (k + rnd()) / n2, a = (rnd() - 0.5) * 0.9;
        const pts = [];
        for (let j = 0; j <= 8; j++) { const t = j / 8, v = -rF * 0.4 + (H + rF * 0.8) * t; pts.push(map(u + (v - H / 2) * a, v)); }
        if (rnd() < 0.5) pts.reverse();
        push(pts, Pfill, rFill * (0.6 + 0.3 * rnd()), Mfill, 0.9, bi);
      }
    }
  });
  // ---- contornos: el trazo que dibuja cada letra por fuera
  const lines = isoLines(D, G.w, G.h, dOut * G.s / G.s * 1);  // D ya está en px del documento
  const toDoc = p => [G.x0 + p[0] / G.s, G.y0 + p[1] / G.s];
  for (let poly of lines) {
    // (el borde de la rejilla no es una letra)
    const bm = dOut * G.s + 3;
    if (poly.some(p => p[0] < bm || p[1] < bm || p[0] > G.w - 1 - bm || p[1] > G.h - 1 - bm)) continue;
    poly = poly.map(toDoc);
    const closed = Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 2 / G.s + 1;
    if (plen(poly) < rLine * 6) continue;
    poly = smoothPoly(resamplePoly(poly, Math.max(1, rLine * 0.5)), 2, closed);
    // en trozos, como se dibuja a mano (con algún solape)
    const L = plen(poly), chunk = em * (lap ? 0.55 : 0.75);
    const nCh = Math.max(1, Math.round(L / chunk));
    const n = poly.length;
    for (let c = 0; c < nCh; c++) {
      const a = Math.floor(n * c / nCh), b = Math.min(n - 1 + (closed ? 3 : 0), Math.ceil(n * (c + 1) / nCh) + 2);
      const seg = [];
      for (let i = a; i <= b; i++) { const q = poly[closed ? i % n : Math.min(n - 1, i)]; seg.push({ x: q[0], y: q[1] }); }
      push(seg, Pline, rLine * (0.9 + 0.2 * rnd()), Mline, 1, 0);
      // a lápiz, a veces otra pasada
      if (lap && rnd() < 0.35) push(seg.map(q => ({ x: q.x + g() * 0.3, y: q.y + g() * 0.3 })), Pline, rLine * 0.8, Mline, 0.8, 0);
    }
  }
  return { strokes: out, mask: Mfill };
}

// GENERAR: cajas por línea a partir de la maqueta, y letras gordas con el plan normal del escritor
function fromLayout(WR, lay, p, seed) {
  // letras estrechas (nerviosa) con menos grosor: si no, se cierran los huecos
  const FN = require('./fonts.js');
  const wide = (FN.styleOf(p.persona) || {}).wide || 0.9;
  const fat = (p.preset === 'pincel' ? 0.1 : 0.085) * (p.width || 1) * Math.max(0.55, Math.min(1, wide / 0.85));
  const pl = Object.assign({}, p, { tool: 'rotulador', preset: 'gordo', repaso: 'fundido', width: fat / 0.055, colorVar: 0 });
  const letterStrokes = WR.plan(lay, pl, seed);
  // tamaño de letra (px) y cajas por línea (en el espacio de maqueta, con el mapa de la forma)
  // px por em de cada letra, medido con el mapa de la forma
  const sizes = [];
  for (const L of lay.letters) {
    const a = lay.map(L.x, L.base), b = lay.map(L.x + L.size, L.base), c = lay.map(L.x, L.base - L.size);
    sizes.push(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - a[0], c[1] - a[1])));
  }
  sizes.sort((a, b) => a - b);
  const em = sizes[sizes.length >> 1] || 100;
  const byLine = new Map();
  for (const L of lay.letters) {
    const b = L.g.box, sx = L.sx || 1, sy = L.sy || 1;
    const x0 = L.x + b.left * L.size * sx, x1 = L.x + b.right * L.size * sx, y0 = L.base + b.top * L.size * sy, y1 = L.base + b.bottom * L.size * sy;
    const e = byLine.get(L.line) || { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, sz: 0, n: 0 };
    e.x0 = Math.min(e.x0, x0); e.x1 = Math.max(e.x1, x1); e.y0 = Math.min(e.y0, y0); e.y1 = Math.max(e.y1, y1); e.sz += L.size; e.n++;
    byLine.set(L.line, e);
  }
  const rnd = R.mulberry32(seed + 404);
  const boxes = [];
  for (const [, e] of byLine) {
    const sz = e.sz / e.n, pad = sz * (0.16 + fat * 1.1);
    const X0 = e.x0 - pad * (1 + 0.4 * rnd()), X1 = e.x1 + pad * (1 + 0.4 * rnd()), Y0 = e.y0 - pad * (0.8 + 0.3 * rnd()), Y1 = e.y1 + pad * (0.8 + 0.3 * rnd());
    const tl = (rnd() - 0.5) * 0.06 * (Y1 - Y0);
    boxes.push({ W: X1 - X0, H: Y1 - Y0, toDoc: (u, v) => lay.map(X0 + u, Y0 + v + tl * (u / (X1 - X0) - 0.5)) });
  }
  return plan({ mode: p.preset === 'pincel' ? 'pincel' : 'lapiz', em, boxes, letterStrokes, width: 1, seed });
}

// CALCAR: letras = contorno de la fuente (ya con la variación de la mano); cajas por línea del texto
function fromInstances(HD, G, insts, p, seed) {
  const pv = HD.planVariation(insts, p, seed);
  const polys = [], ems = [], lines = new Map();
  insts.forEach((it, i) => {
    const f = HD.letterTransform(pv, insts, i);
    const full = (x, y) => { const q = f(x, y); return it.map(q[0], q[1]); };
    for (const segs of it.contours) {
      const pl = G.flattenSegs(segs, it.em / 400, it.em / 60);
      const q = new Float64Array(pl.length);
      for (let k = 0; k < pl.length; k += 2) { const m = full(pl[k], pl[k + 1]); q[k] = m[0]; q[k + 1] = m[1]; }
      polys.push(q);
    }
    const a = it.map(it.bbox.left, it.bbox.bottom), b = it.map(it.bbox.left + it.em, it.bbox.bottom);
    const emPx = Math.hypot(b[0] - a[0], b[1] - a[1]);
    ems.push(emPx);
    const e = lines.get(it.line) || { pts: [], em: 0, n: 0, c0: null, c1: null };
    const bx = it.bbox, cs = [[bx.left, bx.top], [bx.right, bx.top], [bx.right, bx.bottom], [bx.left, bx.bottom]].map(([x, y]) => full(x, y));
    for (const c of cs) e.pts.push(c);
    const cen = full((bx.left + bx.right) / 2, bx.bottom);
    if (!e.c0) e.c0 = cen; e.c1 = cen;
    e.em += emPx; e.n++;
    lines.set(it.line, e);
  });
  ems.sort((a, b) => a - b);
  const em = ems[ems.length >> 1] || 100;
  const rnd = R.mulberry32(seed + 404);
  // cajas en el documento: rectángulo orientado de cada línea (dirección: de la primera letra a la última)
  const boxes = [];
  for (const [, e] of lines) {
    const P = e.pts;
    if (!P.length) continue;
    let ax = e.c1[0] - e.c0[0], ay = e.c1[1] - e.c0[1];
    let al = Math.hypot(ax, ay);
    if (al < 1e-6) { ax = 1; ay = 0; al = 1; }
    ax /= al; ay /= al;
    const nx = -ay, ny = ax;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, y] of P) { const u = x * ax + y * ay, v = x * nx + y * ny; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const lem = e.em / e.n, pad = lem * 0.2;
    u0 -= pad * (1 + 0.4 * rnd()); u1 += pad * (1 + 0.4 * rnd()); v0 -= pad * (0.8 + 0.3 * rnd()); v1 += pad * (0.8 + 0.3 * rnd());
    // la v del marco va hacia abajo en la pantalla (como en la maqueta)
    const flip = ny < 0 ? -1 : 1;
    const W = u1 - u0, H = v1 - v0;
    boxes.push({ W, H, toDoc: (u, v) => { const U = u0 + u, V = flip > 0 ? v0 + v : v1 - v; return [U * ax + V * nx, U * ay + V * ny]; } });
  }
  return plan({ mode: p.preset === 'pincel' ? 'pincel' : 'lapiz', em, boxes, letterPolys: polys, grow: em * 0.02 * (p.width || 1), width: 1, seed });
}

module.exports = { plan, fromLayout, fromInstances, isoLines };
