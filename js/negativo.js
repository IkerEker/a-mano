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
// r*: en em; fill: pack del relleno (si la herramienta del usuario es de esa técnica, se usa la suya); line: perfil
const STYLE = {
  lapiz: { fill: ['lapiz', 'blando'], line: ['lapiz', 'hb'], rFill: 0.016, rLine: 0.0095, method: 'hatch' },
  carbon: { fill: ['carbon', 'suave'], line: ['carbon', 'fino'], rFill: 0.04, rLine: 0.013, method: 'smear' },
  cera: { fill: ['cera', 'cera'], line: ['cera', 'fina'], rFill: 0.03, rLine: 0.013, method: 'zigzag' },
  boli: { fill: ['boli', 'bic'], line: ['boli', 'bic'], rFill: 0.0065, rLine: 0.0065, method: 'loops' },
  rotulador: { fill: ['rotulador', 'gordo'], line: ['rotulador', 'fino'], rFill: 0.05, rLine: 0.013, method: 'rows' },
  pincel: { fill: ['pincel', 'seco'], line: ['pincel', 'fino'], rFill: 0.085, rLine: 0.02, method: 'brush' }
};
function styleFor(tool, preset) {
  const S = STYLE[tool] || STYLE.lapiz;
  // el relleno con el pack que tiene el usuario (si es de rellenar: el pincel fino o el boli también valen)
  const fill = INK.TOOLS[tool] && INK.TOOLS[tool].presets[preset] ? [tool, preset] : S.fill;
  return Object.assign({}, S, { fillP: INK.preset(fill[0], fill[1]), lineP: INK.preset(S.line[0], S.line[1]) });
}

// ------------------------------------------------------------------ plan
// o: { tool, preset, em (px por em), boxes: [{ toDoc(u, v), W, H, letter }], letterStrokes?, letterPolys?, grow?,
//      width (multiplica grosores), seed }
function plan(o) {
  const rnd = R.mulberry32((o.seed * 2654435761) >>> 0);
  const g = () => R.gauss(rnd);
  const em = o.em, wm = o.width || 1;
  const S = styleFor(o.tool, o.preset);
  const rFill = Math.max(0.8, S.rFill * em * wm), rLine = Math.max(0.7, S.rLine * em * Math.sqrt(wm));
  // el perfil va pegado a la letra: su canto interior toca la letra y no la come
  const dOut = rLine * 1.05;
  const dFill = rLine * 0.9;
  // límites
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const B of o.boxes) for (let k = 0; k <= 16; k++) for (const [u, v] of [[B.W * k / 16, 0], [B.W * k / 16, B.H], [0, B.H * k / 16], [B.W, B.H * k / 16]]) {
    const q = B.toDoc(u, v); bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]);
  }
  const marg = rFill * 4 + em * 0.15;
  const G = makeGrid({ left: bx0 - marg, top: by0 - marg, right: bx1 + marg, bottom: by1 + marg });
  if (o.letterStrokes) stampCapsules(G, o.letterStrokes);
  if (o.letterPolys) stampPolys(G, o.letterPolys);
  const bin = new Uint8Array(G.w * G.h);
  for (let i = 0; i < bin.length; i++) bin[i] = G.d[i] < 0.5 ? 1 : 0;
  const D = ST.edt(bin, G.w, G.h);
  for (let i = 0; i < D.length; i++) D[i] /= G.s;
  if (o.grow > 0) for (let i = 0; i < D.length; i++) { const c = smooth01(o.grow + 0.7, o.grow - 0.7, D[i]); if (c > G.d[i]) G.d[i] = c; D[i] = Math.max(0, D[i] - o.grow); }
  const mk = (a, b) => { const d = new Float32Array(D.length); for (let i = 0; i < D.length; i++) d[i] = smooth01(a, b, D[i]) * (1 - G.d[i]); return { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d, out: 1 }; };
  const Mfill = mk(dFill * 0.6, dFill * 1.15 + 0.5);
  // el relleno no sale de su caja (si no, se come las palabras de al lado): borde a mano, con ondas suaves
  {
    const ras = new Raster(G.w, G.h);
    o.boxes.forEach((B, bi) => {
      const q0 = B.toDoc(B.W / 2, B.H / 2), q1 = B.toDoc(B.W / 2 + 1, B.H / 2), ku = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
      const e = rFill * 0.5 / ku, amp = Math.max(rFill * 0.8, em * 0.02) / ku;
      const per = [];
      const N = 96, sd = (o.seed + bi * 17) | 0;
      for (let k = 0; k < N; k++) per.push([-e + (B.W + 2 * e) * k / N, -e, k, 0]);
      for (let k = 0; k < N / 4; k++) per.push([B.W + e, -e + (B.H + 2 * e) * k / (N / 4), k, 1]);
      for (let k = 0; k < N; k++) per.push([B.W + e - (B.W + 2 * e) * k / N, B.H + e, k, 2]);
      for (let k = 0; k < N / 4; k++) per.push([-e, B.H + e - (B.H + 2 * e) * k / (N / 4), k, 3]);
      const poly = new Float64Array(per.length * 2);
      per.forEach(([u, v, k, side], i) => {
        const n = amp * (R.noise1(k * 0.35 + side * 11.3, sd) + 0.45 * R.noise1(k * 1.7 + side * 5.1, sd + 3));
        const uu = side === 1 ? u + n : side === 3 ? u - n : u, vv = side === 0 ? v - n : side === 2 ? v + n : v;
        const q = B.toDoc(uu, vv);
        poly[2 * i] = (q[0] - G.x0) * G.s; poly[2 * i + 1] = (q[1] - G.y0) * G.s;
      });
      ras.poly(poly);
    });
    const cov = ras.coverage();
    for (let i = 0; i < Mfill.d.length; i++) Mfill.d[i] *= cov[i];
    Mfill.out = 0;
  }
  const Mline = mk(0.15, 0.9);
  const out = [];
  let seedK = (o.seed * 31 + 7) >>> 0;
  const push = (pts, P, r, mask, alpha, letter) => {
    if (pts.length < 2) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    const m = r * 3 + 3;
    seedK = (seedK + 7919) >>> 0;
    out.push({ pts, r, P, seed: seedK, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m }, alpha: alpha || 1, mask, letter: letter || 0, word: 0 });
  };
  o.boxes.forEach((B, bi) => fillBox(B, S, rFill, Mfill, push, rnd, g, B.letter == null ? bi : B.letter));
  // ---- perfil de las letras
  const lines = isoLines(D, G.w, G.h, dOut);
  const toDoc = p => [G.x0 + p[0] / G.s, G.y0 + p[1] / G.s];
  const bm = dOut * G.s + 3;
  for (let poly of lines) {
    if (poly.some(p => p[0] < bm || p[1] < bm || p[0] > G.w - 1 - bm || p[1] > G.h - 1 - bm)) continue;
    poly = poly.map(toDoc);
    const closed = Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 2 / G.s + 1;
    if (plen(poly) < rLine * 5) continue;
    poly = smoothPoly(resamplePoly(poly, Math.max(0.8, rLine * 0.6)), 2, closed);
    // a trozos, como se perfila a mano (cada trozo se monta un poco con el siguiente)
    const L = plen(poly), chunk = em * (0.3 + 0.25 * rnd());
    const nCh = Math.max(1, Math.round(L / chunk));
    const n = poly.length;
    for (let c = 0; c < nCh; c++) {
      const a = Math.floor(n * c / nCh), b = Math.min(n - 1 + (closed ? 3 : 0), Math.ceil(n * (c + 1) / nCh) + 2);
      const seg = [];
      for (let i = a; i <= b; i++) { const q = poly[closed ? i % n : Math.min(n - 1, i)]; seg.push({ x: q[0], y: q[1] }); }
      push(seg, S.lineP, rLine * (0.9 + 0.2 * rnd()), Mline, 1, 0);
      if (S.method === 'hatch' && rnd() < 0.3) push(seg.map(q => ({ x: q.x + g() * 0.25, y: q.y + g() * 0.25 })), S.lineP, rLine * 0.85, Mline, 0.75, 0);
    }
  }
  return { strokes: out, mask: Mfill };
}

// relleno de una caja (marco: u a lo largo, v a lo alto), según la técnica
function fillBox(B, S, rFill, M, push, rnd, g, letter) {
  const W = B.W, H = B.H;
  const map = (u, v) => { const q = B.toDoc(u, v); return { x: q[0], y: q[1] }; };
  const q0 = B.toDoc(W / 2, H / 2), q1 = B.toDoc(W / 2 + 1, H / 2), ku = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
  const r = rFill / ku;                         // grosor del relleno en unidades de la caja
  const P = S.fillP;
  const add = (pts, rr, alpha) => push(pts.map(([u, v]) => map(u, v)), P, (rr || 1) * rFill, M, alpha, letter);
  // zigzag con vueltas redondas: de abajo arriba y vuelta, avanzando; ang: inclinación de los trazos (rad, 0 = vertical)
  const zigzag = (u0, u1, gap, ang, ov, arc) => {
    const pts = [], t = Math.tan(ang);
    let up = rnd() < 0.5, k = 0;
    for (let u = u0; u < u1; u += gap * (0.75 + 0.5 * rnd()), k++) {
      const va = -ov * (0.3 + rnd()), vb = H + ov * (0.3 + rnd());
      const a = up ? vb : va, b = up ? va : vb;
      // trazo (algo curvo: la muñeca gira) y vuelta redonda
      for (let j = 0; j <= 6; j++) {
        const s = j / 6, v = a + (b - a) * s;
        pts.push([u + (v - H / 2) * t + arc * gap * 4 * s * (1 - s) * (up ? 1 : -1), v]);
      }
      const ve = b, sg = up ? -1 : 1;
      pts.push([u + (ve - H / 2) * t + gap * 0.35, ve + sg * gap * 0.25]);
      up = !up;
    }
    return pts;
  };
  if (S.method === 'hatch') {
    // lápiz: parches de zigzag en diagonal, solapados; segunda capa con otro ángulo (más clara)
    // (una dirección dominante, como sombrea la mano; la segunda capa casi en la misma, para cerrar el tono)
    for (const [ang, gapK, alpha] of [[0.55 + g() * 0.06, 0.78, 1], [0.25 + g() * 0.08, 1.05, 0.7]]) {
      let u = -H * Math.abs(Math.tan(ang)) - r * 2;
      while (u < W + r * 2) {
        const len = H * (0.6 + 0.8 * rnd());
        add(zigzag(u, u + len, r * 2 * gapK, ang, H * 0.04, 0.4), 0.9 + 0.2 * rnd(), alpha * (0.8 + 0.2 * rnd()));
        u += len * (0.82 + 0.1 * rnd());
      }
    }
  } else if (S.method === 'smear') {
    // carboncillo: barridos anchos en zigzag largo, poco inclinados, y algún golpe suelto encima
    let u = -r * 2;
    while (u < W + r) {
      const len = H * (1 + rnd());
      add(zigzag(u, u + len, r * 1.05, 0.35 + g() * 0.1, H * 0.08, 0.8), 1, 0.9);
      u += len * 0.85;
    }
    for (let k = 0; k < Math.ceil(W / (H * 0.7)); k++) {
      const u = W * rnd(), v = H * rnd(), L = H * (0.6 + rnd()), a = g() * 0.5;
      add([[u - L / 2 * Math.cos(a), v - L / 2 * Math.sin(a)], [u, v + g() * r], [u + L / 2 * Math.cos(a), v + L / 2 * Math.sin(a)]], 0.8, 0.7);
    }
  } else if (S.method === 'zigzag') {
    // cera: zigzag apretado casi vertical, de un tirón, y otra pasada más suelta
    add(zigzag(-r, W + r, r * 1.35, 0.12 + g() * 0.06, H * 0.05, 0.25), 1, 1);
    add(zigzag(-r, W + r, r * 3.2, -0.35 + g() * 0.06, H * 0.03, 0.3), 0.8, 0.7);
  } else if (S.method === 'loops') {
    // boli: bucles que avanzan en filas (garabato apretado), dos capas
    for (const [rowK, Rk, alpha] of [[0.55, 0.42, 1], [0.8, 0.55, 0.8]]) {
      const R0 = Math.max(r * 6, H * 0.11) * Rk / 0.42;
      const rows = Math.max(1, Math.ceil((H + R0) / (R0 * rowK * 2)));
      for (let i = 0; i < rows; i++) {
        const vc = -R0 * 0.3 + (H + R0 * 0.6) * (rows === 1 ? 0.5 : i / (rows - 1)) + g() * R0 * 0.15;
        const pts = [];
        const dir = i % 2 ? -1 : 1;
        const n = Math.ceil((W + 2 * R0) / (R0 * 0.55));
        for (let k = 0; k <= n * 10; k++) {
          const t = k / 10, uc = dir > 0 ? -R0 + t * R0 * 0.55 : W + R0 - t * R0 * 0.55;
          const rr = R0 * (0.75 + 0.5 * (0.5 + 0.5 * R.noise1(t * 0.23, i * 13 + 5)));
          const th = (t + 0.35 * R.noise1(t * 0.17, i * 7 + 3)) * 6.283 * dir;
          pts.push([uc + rr * Math.cos(th) * 0.9, vc + rr * Math.sin(th) * (0.95 + 0.1 * R.noise1(t * 0.5, i))]);
          // el boli se levanta de vez en cuando
          if (pts.length > 140 && rnd() < 0.02) { add(pts.splice(0), 1, alpha); pts.push(pts.length ? pts[0] : [uc, vc]); }
        }
        add(pts, 1, alpha);
      }
    }
  } else if (S.method === 'rows') {
    // rotulador: pasadas paralelas a lo largo, que se montan un poco (bandas más oscuras)
    const gap = r * 2 * 0.62;
    let i = 0;
    for (let v = r * 0.6; v < H + r * 0.4; v += gap * (0.93 + 0.12 * rnd()), i++) {
      const ua = -r * (0.2 + 0.8 * rnd()), ub = W + r * (0.2 + 0.8 * rnd()), tilt = g() * r * 0.6;
      const pts = [];
      for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([ua + (ub - ua) * t, v + tilt * (t - 0.5) + g() * r * 0.04]); }
      if (i % 2) pts.reverse();
      add(pts, 1, 1);
    }
  } else {
    // pincel: pinceladas anchas a lo largo que se salen un poco de la caja, y otra capa cruzada más suelta
    const gapv = r * 1.3;
    for (let v = r * 0.4; v < H + r * 0.5; v += gapv * (0.8 + 0.35 * rnd())) {
      let u = -r * (0.5 + rnd());
      while (u < W) {
        const len = Math.min(W - u + r * (0.4 + rnd()), W * (0.45 + 0.6 * rnd()));
        const pts = [], tilt = g() * 0.05 * H;
        for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([u + len * t, v + tilt * (t - 0.5) + g() * r * 0.05]); }
        if (rnd() < 0.5) pts.reverse();
        add(pts, 0.8 + 0.4 * rnd(), 1);
        u += len * (0.75 + 0.15 * rnd());
      }
    }
    const n2 = Math.ceil(W / (r * 2.6));
    for (let k = 0; k < n2; k++) {
      const u = W * (k + rnd()) / n2, a = (rnd() - 0.5) * 0.9, pts = [];
      for (let j = 0; j <= 8; j++) { const t = j / 8, v = -r * 0.4 + (H + r * 0.8) * t; pts.push([u + (v - H / 2) * a, v]); }
      if (rnd() < 0.5) pts.reverse();
      add(pts, 0.6 + 0.3 * rnd(), 0.9);
    }
  }
}

// GENERAR: palabras marcadas como negativo. out: trazos del escritor (se quitan los de esas palabras y se
// devuelven los del negativo). Las letras se ensanchan para la máscara lo justo para leerse bien.
function planWords(lay, out, p, seed) {
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
    const fat = 0.042 * em * (p.width || 1);
    const strokes = (byWord.get(wi) || []).map(s => ({ pts: s.pts, r: Math.max(s.r, fat) }));
    // caja de la palabra (en el espacio de maqueta, con su mapa: en un arco se curva)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sz = 0;
    for (const L of ls) {
      const b = L.g.box, sx = L.sx || 1, sy = L.sy || 1;
      x0 = Math.min(x0, L.x + b.left * L.size * sx); x1 = Math.max(x1, L.x + b.right * L.size * sx);
      y0 = Math.min(y0, L.base + b.top * L.size * sy); y1 = Math.max(y1, L.base + b.bottom * L.size * sy); sz += L.size;
    }
    sz /= ls.length;
    const rnd = R.mulberry32((seed + wi * 977 + 404) >>> 0);
    const pad = sz * 0.13;
    const X0 = x0 - pad * (1 + 0.3 * rnd()), X1 = x1 + pad * (1 + 0.3 * rnd()), Y0 = y0 - pad * (0.8 + 0.3 * rnd()), Y1 = y1 + pad * (0.8 + 0.3 * rnd());
    const tl = (rnd() - 0.5) * 0.05 * (Y1 - Y0);
    const box = { W: X1 - X0, H: Y1 - Y0, letter: ls[0] ? lay.letters.indexOf(ls[0]) : 0, toDoc: (u, v) => lay.map(X0 + u, Y0 + v + tl * (u / (X1 - X0) - 0.5)) };
    const r = plan({ tool: p.tool, preset: p.preset, em, boxes: [box], letterStrokes: strokes, width: p.width || 1, seed: (seed + wi * 131 + k++) >>> 0 });
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
