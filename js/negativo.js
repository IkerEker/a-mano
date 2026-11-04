'use strict';
// NEGATIVOS: se pinta la caja de fuera y las letras quedan libres (el papel).
// 1. Máscara de las letras (en px del documento): trazos gordos de la letra (GENERAR) o el contorno de la
//    fuente (CALCAR).
// 2. Campo de distancia hacia fuera de las letras: con él se sacan
//    · los contornos desplazados (el trazo que «dibuja» cada letra por fuera, a la distancia justa para que su
//      canto toque la letra) por marching squares, y
//    · la máscara del relleno (el relleno llega hasta el contorno y nunca entra en la letra; los huecos de la
//      O, la A o la B se rellenan porque están lejos de la tinta).
// 3. Cajas (una por palabra marcada como «negativo»; en CALCAR, una por línea): cada técnica rellena a su
//    manera, como se haría a mano:
//    · lápiz: sombreado en zigzag (vaivén con vueltas redondas), por parches que se solapan, dos capas cruzadas;
//    · carboncillo: barrido ancho con el canto, en zigzag largo, más algún golpe suelto;
//    · cera: zigzag casi vertical, apretado, con el grano del papel;
//    · boli: garabato de bucles (el boli no rellena: se «enrosca») en filas que se solapan;
//    · rotulador: pasadas paralelas a lo largo, que se solapan y dejan bandas más oscuras;
//    · pincel: pinceladas anchas a lo largo que se salen un poco, más una capa cruzada.
//    Y el perfil de cada letra con una versión fina de la misma técnica, pegado a la letra (no la come).
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

// ------------------------------------------------------------------ estilos de relleno por técnica
// Cómo se pinta un negativo a mano (y así se hace aquí):
//  1. la caja: un cuadrilátero con las esquinas algo movidas, perfilado lado a lado con trazos que se pasan en
//     las esquinas;
//  2. primero se perfila cada letra por fuera con uno o dos trazos que siguen su borde (el canto toca la letra);
//  3. luego se rellena el resto a parches: cada parche son trazos paralelos (o un zigzag) cuya dirección sigue
//     la forma del hueco: junto a una letra, a lo largo de su borde; junto al borde de la caja, a lo largo del
//     borde; con una segunda capa algo cruzada que cierra el tono.
// r*: en em; gap: separación entre trazos (en diámetros); kind: zigzag (lápiz, cera), paralelos (carboncillo,
// rotulador, pincel) o bucles (boli)
const STYLE = {
  lapiz: { fill: ['lapiz', 'blando'], rFill: 0.017, gap: 0.8, kind: 'zig', len: 0.5 },
  carbon: { fill: ['carbon', 'suave'], rFill: 0.04, gap: 0.95, kind: 'par', len: 0.7 },
  cera: { fill: ['cera', 'cera'], rFill: 0.03, gap: 0.9, kind: 'zig', len: 0.5 },
  boli: { fill: ['boli', 'bic'], rFill: 0.0065, gap: 1.6, kind: 'loops', len: 0.45 },
  rotulador: { fill: ['rotulador', 'gordo'], rFill: 0.045, gap: 0.8, kind: 'par', len: 0.75 },
  pincel: { fill: ['pincel', 'seco'], rFill: 0.07, gap: 0.8, kind: 'par', len: 0.6 }
};
function styleFor(tool, preset) {
  const S = STYLE[tool] || STYLE.lapiz;
  const fill = INK.TOOLS[tool] && INK.TOOLS[tool].presets[preset] ? [tool, preset] : S.fill;
  // (relleno: menos carga en los extremos, si no cada trazo corto deja un punto oscuro)
  const fp = INK.preset(fill[0], fill[1]);
  return Object.assign({}, S, { fillP: Object.assign({}, fp, { pool: (fp.pool || 0) * 0.25, tIn: Math.max(fp.tIn, 0.8), tOut: Math.max(fp.tOut, 0.7) }) });
}

// ------------------------------------------------------------------ plan
// o: { tool, preset, em (px por em), boxes: [{ toDoc(u, v), W, H, letter }], letterStrokes?, letterPolys?, grow?,
//      width, seed }
function plan(o) {
  const rnd = R.mulberry32((o.seed * 2654435761) >>> 0);
  const g = () => R.gauss(rnd);
  const em = o.em, wm = o.width || 1;
  const S = styleFor(o.tool, o.preset), P = S.fillP;
  const rF = Math.max(0.8, S.rFill * em * Math.sqrt(wm));
  // cajas: cuadriláteros con las esquinas movidas (en unidades de la caja) y su mapa al documento
  const quads = o.boxes.map(B => {
    const j = () => g() * 0.07 * B.H;
    const c = [[j(), j()], [B.W + j(), j()], [B.W + j(), B.H + j()], [j(), B.H + j()]];
    const uv = (s, t) => [(1 - s) * (1 - t) * c[0][0] + s * (1 - t) * c[1][0] + s * t * c[2][0] + (1 - s) * t * c[3][0], (1 - s) * (1 - t) * c[0][1] + s * (1 - t) * c[1][1] + s * t * c[2][1] + (1 - s) * t * c[3][1]];
    const at = (s, t) => { const q = uv(s, t); return B.toDoc(q[0], q[1]); };
    const a = at(0.5, 0), b = at(0.5, 1), l = at(0, 0.5), rr = at(1, 0.5);
    return { B, at, Hpx: Math.hypot(b[0] - a[0], b[1] - a[1]), Wpx: Math.hypot(rr[0] - l[0], rr[1] - l[1]), letter: B.letter };
  });
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const Q of quads) for (let k = 0; k <= 20; k++) for (const [u, v] of [[k / 20, 0], [k / 20, 1], [0, k / 20], [1, k / 20]]) {
    const q = Q.at(u, v); bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]);
  }
  const marg = rF * 4 + em * 0.15;
  const G = makeGrid({ left: bx0 - marg, top: by0 - marg, right: bx1 + marg, bottom: by1 + marg });
  if (o.letterStrokes) stampCapsules(G, o.letterStrokes);
  if (o.letterPolys) stampPolys(G, o.letterPolys);
  const binL = new Uint8Array(G.w * G.h);
  for (let i = 0; i < binL.length; i++) binL[i] = G.d[i] < 0.5 ? 1 : 0;
  const D = ST.edt(binL, G.w, G.h);
  for (let i = 0; i < D.length; i++) D[i] /= G.s;
  if (o.grow > 0) for (let i = 0; i < D.length; i++) { const c = smooth01(o.grow + 0.7, o.grow - 0.7, D[i]); if (c > G.d[i]) G.d[i] = c; D[i] = Math.max(0, D[i] - o.grow); }
  // caja rasterizada (bordes casi rectos, con un temblor mínimo) y distancia a su borde
  const ras = new Raster(G.w, G.h);
  quads.forEach((Q, qi) => {
    const pts = [], N = 40, amp = em * 0.004, sd = (o.seed + qi * 17) | 0;
    const edge = (s0, t0, s1, t1, side) => { for (let k = 0; k < N; k++) { const f = k / N, q = Q.at(s0 + (s1 - s0) * f, t0 + (t1 - t0) * f); pts.push([q[0], q[1], amp * R.noise1(f * 3 + side * 7, sd)]); } };
    edge(0, 0, 1, 0, 0); edge(1, 0, 1, 1, 1); edge(1, 1, 0, 1, 2); edge(0, 1, 0, 0, 3);
    const poly = new Float64Array(pts.length * 2);
    pts.forEach(([x, y, n], i) => { poly[2 * i] = (x - G.x0) * G.s + n; poly[2 * i + 1] = (y - G.y0) * G.s + n; });
    ras.poly(poly);
  });
  const cov = ras.coverage();
  const binB = new Uint8Array(G.w * G.h);
  for (let i = 0; i < binB.length; i++) binB[i] = cov[i] > 0.5 ? 1 : 0;
  const DB = ST.edt(binB, G.w, G.h);
  for (let i = 0; i < DB.length; i++) DB[i] /= G.s;
  // máscaras: relleno (dentro de la caja, fuera de las letras) y perfiles (solo fuera de las letras)
  const dIn = Math.max(0.6, rF * 0.12);
  const Mfill = { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d: new Float32Array(D.length), out: 0 };
  const Mline = { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d: new Float32Array(D.length), out: 1 };
  for (let i = 0; i < D.length; i++) {
    const lt = smooth01(dIn * 0.3, dIn + 0.6, D[i]) * (1 - G.d[i]);
    Mline.d[i] = lt; Mfill.d[i] = lt * cov[i];
  }
  // letras vecinas (de otras palabras) que se meten en la caja: el relleno las rodea, no las tapa
  if (o.avoidStrokes && o.avoidStrokes.length) {
    const A = { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d: new Float32Array(G.w * G.h) };
    stampCapsules(A, o.avoidStrokes.map(st => ({ pts: st.pts, r: st.r + rF * 0.9 + em * 0.015 })));
    for (let i = 0; i < A.d.length; i++) { const k = 1 - A.d[i]; Mfill.d[i] *= k; Mline.d[i] *= k; }
  }
  const fAt = (F, x, y) => { const ix = Math.max(0, Math.min(G.w - 1, Math.round((x - G.x0) * G.s - 0.5))), iy = Math.max(0, Math.min(G.h - 1, Math.round((y - G.y0) * G.s - 0.5))); return F[iy * G.w + ix]; };
  const out = [];
  let seedK = (o.seed * 31 + 7) >>> 0;
  const push = (pts, r, mask, alpha, letter) => {
    if (pts.length < 2) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    const m = r * 3 + 3;
    seedK = (seedK + 7919) >>> 0;
    out.push({ pts, r, P, seed: seedK, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m }, alpha: alpha || 1, mask, letter: letter || 0, word: 0 });
  };
  const L0 = quads[0] ? quads[0].letter || 0 : 0;
  // ---- 1. perfil de las letras: uno o dos trazos que siguen el borde
  const toDoc = p => [G.x0 + p[0] / G.s, G.y0 + p[1] / G.s];
  const bm = 3;
  for (const [lev, prob, rk] of [[rF * 0.95 + dIn, 1, 0.95], [rF * 2.5 + dIn, 0.4, 0.9]]) {
    for (let poly of isoLines(D, G.w, G.h, lev)) {
      if (poly.some(p => p[0] < bm || p[1] < bm || p[0] > G.w - 1 - bm || p[1] > G.h - 1 - bm)) continue;
      poly = poly.map(toDoc);
      const closed = Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 2 / G.s + 1;
      if (plen(poly) < rF * 4) continue;
      poly = smoothPoly(resamplePoly(poly, Math.max(0.8, rF * 0.5)), 2, closed);
      const L = plen(poly), chunk = em * (0.5 + 0.4 * rnd());
      const nCh = Math.max(1, Math.round(L / chunk));
      const n = poly.length;
      for (let c = 0; c < nCh; c++) {
        if (rnd() > prob) continue;
        const a = Math.floor(n * c / nCh), b = Math.min(n - 1 + (closed ? 3 : 0), Math.ceil(n * (c + 1) / nCh) + 2);
        const seg = [];
        for (let i = a; i <= b; i++) { const q = poly[closed ? i % n : Math.min(n - 1, i)]; seg.push({ x: q[0], y: q[1] }); }
        // fuera de la caja no hay perfil
        if (fAt(cov, seg[seg.length >> 1].x, seg[seg.length >> 1].y) < 0.5) continue;
        push(seg, rF * rk * (0.9 + 0.2 * rnd()), Mfill, 1, L0);
      }
    }
  }
  // ---- 2. la caja perfilada: cada lado, uno o dos trazos que se pasan un poco en las esquinas
  for (const Q of quads) {
    const cs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let k = 0; k < 4; k++) {
      const A = cs[k], B = cs[(k + 1) % 4];
      const passes = rnd() < 0.55 ? 2 : 1;
      for (let ps = 0; ps < passes; ps++) {
        const e0 = -0.03 - 0.05 * rnd(), e1 = 1.03 + 0.05 * rnd();
        const pts = [];
        for (let j = 0; j <= 10; j++) {
          const f = e0 + (e1 - e0) * j / 10, s = A[0] + (B[0] - A[0]) * f, t = A[1] + (B[1] - A[1]) * f;
          // hacia dentro lo justo para que el trazo quede sobre el borde
          const q = Q.at(s, t), c = Q.at(0.5, 0.5), dx = c[0] - q[0], dy = c[1] - q[1], dl = Math.hypot(dx, dy) || 1;
          const inset = rF * (0.7 + 0.3 * ps) + g() * rF * 0.12;
          pts.push({ x: q[0] + dx / dl * inset, y: q[1] + dy / dl * inset });
        }
        if (rnd() < 0.5) pts.reverse();
        push(pts, rF * (0.85 + 0.2 * rnd()), Mline, 0.95, L0);
      }
    }
  }
  // ---- 3. relleno a parches orientados por la forma del hueco
  for (const Q of quads) {
    const Hp = Math.max(4, Q.Hpx), Wp = Math.max(4, Q.Wpx);
    const step = Hp * 0.28;
    const ns = Math.max(2, Math.round(Wp / step)), nt = Math.max(2, Math.round(Hp / step));
    for (let pass = 0; pass < 2; pass++) {
      const cross = pass === 1;
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        if (cross && rnd() < 0.7) continue;
        const c = Q.at((i + 0.5 + (rnd() - 0.5) * 0.7) / ns, (j + 0.5 + (rnd() - 0.5) * 0.7) / nt);
        const dl = fAt(D, c[0], c[1]), db = fAt(DB, c[0], c[1]);
        if (fAt(cov, c[0], c[1]) < 0.5 || dl < rF * 1.0) continue;
        // dirección: a lo largo del borde más cercano (letra o caja)
        const F = dl < db * 1.4 ? D : DB, h = Math.max(1.5, 1.5 / G.s);
        const gx = fAt(F, c[0] + h, c[1]) - fAt(F, c[0] - h, c[1]), gy = fAt(F, c[0], c[1] + h) - fAt(F, c[0], c[1] - h);
        let ang = Math.hypot(gx, gy) > 1e-6 ? Math.atan2(gx, -gy) : rnd() * Math.PI;
        ang += g() * 0.18 + (cross ? (rnd() < 0.5 ? 1 : -1) * (0.8 + 0.35 * rnd()) : 0);
        const tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
        // tamaño del parche: lo que da el hueco (sin pasarse mucho)
        const free = Math.min(dl, db) * 2 + rF * 2;
        const Ls = Math.min(Hp * S.len * (0.85 + 0.45 * rnd()), Math.max(rF * 7, free * 2.2 + step * 0.6));
        const Wpatch = step * (1.15 + 0.35 * rnd());
        patch(c, tx, ty, nx, ny, Ls, Wpatch, cross);
      }
    }
  }
  function patch(c, tx, ty, nx, ny, Ls, Wpatch, cross) {
    const gap = rF * 2 * S.gap * (cross ? 1.35 : 1);
    // tinta que se monta (multiplica): cada trazo algo más ligero, si no la caja se vuelve un bloque
    const alpha = (P.blend === 'over' ? 1 : P.proc ? 0.6 : 0.72) * (cross ? 0.8 : 1);
    if (S.kind === 'loops') {
      // boli: bucles pequeños que avanzan a lo largo del parche, en dos o tres filas
      const R0 = Math.max(rF * 3, Wpatch * 0.11);
      for (let row = -3; row <= 3; row++) {
        const pts = [], o = row * R0 * 1.25 + g() * R0 * 0.2, n = Math.ceil(Ls / (R0 * 0.45));
        for (let k = 0; k <= n * 10; k++) {
          const t = k / 10, a = -Ls / 2 + t * R0 * 0.45, th = t * 6.283 * (row % 2 ? -1 : 1) + 0.6 * R.noise1(t * 0.2, row + 9);
          const rr = R0 * (0.7 + 0.4 * (0.5 + 0.5 * R.noise1(t * 0.3, row)));
          const u = a + rr * Math.cos(th), v = o + rr * Math.sin(th) * 0.85;
          pts.push({ x: c[0] + tx * u + nx * v, y: c[1] + ty * u + ny * v });
        }
        push(pts, rF, Mfill, alpha, L0);
      }
      return;
    }
    const k0 = -Wpatch / 2;
    if (S.kind === 'zig') {
      // zigzag de un tirón, con vueltas redondas y algo de arco (la muñeca gira)
      const pts = [];
      let dir = rnd() < 0.5 ? 1 : -1;
      for (let o = k0; o < Wpatch / 2; o += gap * (0.8 + 0.4 * rnd())) {
        const la = Ls / 2 * (0.8 + 0.4 * rnd());
        for (let s = 0; s <= 4; s++) {
          const f = s / 4, a = dir * (-la + 2 * la * f), bow = Ls * 0.04 * 4 * f * (1 - f);
          pts.push({ x: c[0] + tx * a + nx * (o + bow), y: c[1] + ty * a + ny * (o + bow) });
        }
        // vuelta
        pts.push({ x: c[0] + tx * dir * (la + gap * 0.3) + nx * (o + gap * 0.5), y: c[1] + ty * dir * (la + gap * 0.3) + ny * (o + gap * 0.5) });
        dir = -dir;
      }
      push(pts, rF * (0.9 + 0.2 * rnd()), Mfill, alpha, L0);
    } else {
      // trazos paralelos sueltos, en vaivén
      let dir = 1;
      for (let o = k0; o < Wpatch / 2; o += gap * (0.85 + 0.3 * rnd())) {
        const la = Ls / 2 * (0.75 + 0.5 * rnd()), sh = g() * Ls * 0.08, tilt = g() * 0.05;
        const pts = [];
        for (let s = 0; s <= 6; s++) {
          const f = s / 6, a = dir * (-la + 2 * la * f) + sh, v = o + a * tilt;
          pts.push({ x: c[0] + tx * a + nx * v, y: c[1] + ty * a + ny * v });
        }
        push(pts, rF * (0.85 + 0.3 * rnd()), Mfill, alpha, L0);
        dir = -dir;
      }
    }
  }
  return { strokes: out, mask: Mfill };
}

// GENERAR: palabras marcadas como negativo. out: trazos del escritor (se quitan los de esas palabras y se
// devuelven los del negativo). Las letras se ensanchan para la máscara lo justo para leerse bien.
function planWords(lay, out, p, seed, wordExt) {
  const neg = new Set();
  (lay.words || []).forEach((w, i) => { if (w && w.neg) neg.add(i); });
  if (!neg.size) return out;
  const keep = [], byWord = new Map();
  for (const s of out) {
    if (neg.has(s.word) && !s.under) { if (!byWord.has(s.word)) byWord.set(s.word, []); byWord.get(s.word).push(s); }
    else if (!(neg.has(s.word) && s.under)) keep.push(s);
  }
  const res = keep;
  let k = 0;
  for (const wi of neg) {
    const ls = lay.letters.filter(L => L.word === wi);
    if (!ls.length) continue;
    // px por em (medido con el mapa de la forma)
    const ems = ls.map(L => { const a = lay.map(L.x, L.base), b = lay.map(L.x + L.size, L.base), c = lay.map(L.x, L.base - L.size); return Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - a[0], c[1] - a[1])); }).sort((a, b) => a - b);
    const em = ems[ems.length >> 1] || 100;
    const fat = 0.062 * em * (p.width || 1);
    const strokes = (byWord.get(wi) || []).map(s => ({ pts: s.pts, r: Math.max(s.r, fat) }));
    // caja de la palabra (en el espacio de maqueta, con su mapa: en un arco se curva)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sz = 0;
    for (const L of ls) {
      const b = L.g.box, sx = L.sx || 1, sy = L.sy || 1;
      x0 = Math.min(x0, L.x + b.left * L.size * sx); x1 = Math.max(x1, L.x + b.right * L.size * sx);
      y0 = Math.min(y0, L.base + b.top * L.size * sy); y1 = Math.max(y1, L.base + b.bottom * L.size * sy); sz += L.size;
    }
    sz /= ls.length;
    // lo que de verdad ocupan los trazos (el escritor mueve letras al corregir huecos)
    const E = wordExt && wordExt.get(wi);
    if (E) { x0 = Math.min(x0, E.x0); x1 = Math.max(x1, E.x1); y0 = Math.min(y0, E.y0); y1 = Math.max(y1, E.y1); }
    const rnd = R.mulberry32((seed + wi * 977 + 404) >>> 0);
    const pad = sz * (0.16 + 0.062);
    const X0 = x0 - pad * (1 + 0.3 * rnd()), X1 = x1 + pad * (1 + 0.3 * rnd()), Y0 = y0 - pad * (0.8 + 0.3 * rnd()), Y1 = y1 + pad * (0.8 + 0.3 * rnd());
    const box = { W: X1 - X0, H: Y1 - Y0, letter: ls[0] ? lay.letters.indexOf(ls[0]) : 0, toDoc: (u, v) => lay.map(X0 + u, Y0 + v) };
    // trazos de otras palabras que caen cerca de la caja
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [u, v] of [[0, 0], [box.W, 0], [box.W, box.H], [0, box.H], [box.W / 2, 0], [box.W / 2, box.H]]) { const q = box.toDoc(u, v); bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]); }
    const mm = em * 0.3;
    const avoid = keep.filter(s2 => s2.box.right > bx0 - mm && s2.box.left < bx1 + mm && s2.box.bottom > by0 - mm && s2.box.top < by1 + mm && !s2.mask).map(s2 => ({ pts: s2.pts, r: s2.r }));
    const r = plan({ tool: p.tool, preset: p.preset, em, boxes: [box], letterStrokes: strokes, avoidStrokes: avoid, width: p.width || 1, seed: (seed + wi * 131 + k++) >>> 0 });
    for (const s of r.strokes) { s.word = wi; res.push(s); }
  }
  return res;
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
  return plan({ tool: p.tool, preset: p.preset, em, boxes, letterPolys: polys, grow: em * 0.012 * (p.width || 1), width: 1, seed });
}

module.exports = { plan, planWords, fromInstances, isoLines, STYLE };
