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

// ------------------------------------------------------------------ distancia exacta y rápida (Felzenszwalb)
// bin: 1 = se mide (distancia al 0 más cercano), 0 = origen. Fuera de la rejilla no hay origen. Devuelve píxeles.
function fastEDT(bin, w, h) {
  const INF = 1e20, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h));
  const v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const D = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) D[i] = bin[i] ? INF : 0;
  const pass = (n, get, set) => {
    for (let q = 0; q < n; q++) f[q] = get(q);
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      if (f[q] >= INF) { continue; }
      let s0;
      for (;;) {
        const p = v[k];
        if (f[p] >= INF) { s0 = -INF; } else s0 = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
        if (k > 0 && s0 <= z[k]) { k--; continue; }
        if (f[p] >= INF) { v[k] = q; z[k] = -INF; z[k + 1] = INF; break; }
        k++; v[k] = q; z[k] = s0; z[k + 1] = INF; break;
      }
    }
    if (f[v[0]] >= INF) { for (let q = 0; q < n; q++) set(q, INF); return; }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
    for (let q = 0; q < n; q++) set(q, d[q]);
  };
  for (let x = 0; x < w; x++) pass(h, y => D[y * w + x], (y, val) => { D[y * w + x] = val; });
  for (let y = 0; y < h; y++) { const o = y * w; pass(w, x => D[o + x], (x, val) => { D[o + x] = val; }); }
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = D[i] >= INF * 0.5 ? 1e9 : Math.sqrt(D[i]);
  return out;
}

// ------------------------------------------------------------------ máscara de letras
function makeGrid(bounds, maxPx) {
  const W = bounds.right - bounds.left, H = bounds.bottom - bounds.top;
  const s = Math.min(1, Math.sqrt((maxPx || 2.4e6) / Math.max(1, W * H)));
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
//  1. las letras se perfilan con línea: tramos rectos que se pasan un poco en las esquinas;
//  2. la caja, lado a lado: cada lado de un golpe (a veces dos), que unas veces cierra, otras se queda corto y
//     otras se cruza con el siguiente; cada esquina distinta;
//  3. se rellena «entre medias» con GARABATOS: la mano va y viene sin levantar el lápiz (un muelle apretado,
//     las idas y vueltas montadas unas sobre otras), cada garabato a lo largo del borde más cercano (de la letra
//     o de la caja). Con ellos se llena ~80 %; el resto son rayas sueltas que remarcan (sobre todo junto a los
//     bordes) y huecos sin pintar (más con boli: da pereza rellenar con algo tan fino).
// rFill/rLine: grosor (em); step: avance entre ida y vuelta (en diámetros); legs: idas y vueltas por garabato;
// len: largo de cada ida (em); cover: cuánto se llena; loose: rayas sueltas; cross: garabatos cruzados;
// split: cada cuántas idas se parte el trazo (donde se monta, la tinta oscurece); alpha: carga de cada garabato
const STYLE = {
  boli: { fill: ['boli', 'bic'], rFill: 0.0065, lineK: 1, step: 1.15, legs: [8, 28], len: [0.2, 0.5], cover: 0.88, loose: 0.35, cross: 0.3, split: 8, alpha: 1 },
  rotulador: { fill: ['rotulador', 'gordo'], rFill: 0.03, lineK: 0.75, step: 0.95, legs: [3, 7], len: [0.5, 1.0], cover: 0.92, loose: 0.25, cross: 0.3, split: 2, alpha: 0.55, base: 0.5 },
  lapiz: { fill: ['lapiz', 'blando'], rFill: 0.016, lineK: 0.9, step: 0.85, legs: [8, 16], len: [0.3, 0.6], cover: 0.92, loose: 0.25, cross: 0.25, split: 5, alpha: 0.72 },
  carbon: { fill: ['carbon', 'suave'], rFill: 0.032, lineK: 0.7, step: 0.8, legs: [5, 9], len: [0.35, 0.7], cover: 0.95, loose: 0.2, cross: 0.25, split: 3, alpha: 0.85 },
  cera: { fill: ['cera', 'cera'], rFill: 0.024, lineK: 0.8, step: 0.8, legs: [5, 11], len: [0.3, 0.65], cover: 0.9, loose: 0.3, cross: 0.35, split: 3, alpha: 0.62, extra: 2.2, glaze: true },
  // pincel: pinceladas gordas y secas, sueltas, en todas direcciones (como el cartel WRONG); el borde de la caja lo
  // hacen las propias pinceladas al acabar (sin raya)
  pincel: { fill: ['pincel', 'seco'], rFill: 0.1, lineK: 0.5, step: 1.05, legs: [1, 2], len: [0.7, 1.5], cover: 0.95, loose: 0.12, cross: 0.5, split: 1, alpha: 1, free: true, noBox: true }
};
function styleFor(tool, preset) {
  const S = STYLE[tool] || STYLE.lapiz;
  let fill = INK.TOOLS[tool] && INK.TOOLS[tool].presets[preset] ? [tool, preset] : S.fill;
  if (tool === 'pincel' && preset !== 'humedo') fill = ['pincel', 'seco'];
  // (relleno: sin carga en los extremos ni puntas afiladas, si no cada vuelta deja un punto o un hueco)
  const fp = INK.preset(fill[0], fill[1]), lp = fp;
  const soft = q => Object.assign({}, q, { endDry: q.proc && !q.pen ? 0.85 : 0, wet: (q.wet || 0) * 0.3, pool: (q.pool || 0) * 0.2, tIn: Math.max(q.tIn, 0.9), tOut: Math.max(q.tOut, 0.85), up: 0, dry: (q.dry || 0) * (tool === 'pincel' ? 1.1 : 0.5), skipCaps: !q.proc && tool !== 'pincel', tone: (q.tone || 0) * (q.blend === 'over' ? 0.35 : 1), load: (q.load || 0) * (q.blend === 'over' ? 0.4 : 1), down: 0 });
  const F = soft(fp);
  // cera: las pasadas se montan (veladura): donde se insiste, más oscuro; con el grano a la vista
  if (S.glaze) Object.assign(F, { blend: 'multiply', grain: Math.max(F.grain || 0, 0.35), tone: 0.45 });
  // pincel: el relleno con las pinceladas secas de verdad (cerdas abiertas, entradas y salidas de los escaneos)
  if (tool === 'pincel' && preset !== 'humedo') Object.assign(F, { fams: ['pincel', 'brocha'], tIn: 0.75, tOut: 0.6, capSkip: 0 });
  return Object.assign({}, S, { fillP: F, lineP: Object.assign(soft(lp), { endDry: 0 }) });
}

// Douglas-Peucker (tramos rectos)
function simplify(p, tol) {
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    let md = 0, mi = -1;
    const ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay, L2 = dx * dx + dy * dy || 1e-12;
    for (let k = a + 1; k < b; k++) {
      let t = ((p[k][0] - ax) * dx + (p[k][1] - ay) * dy) / L2; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p[k][0] - ax - dx * t, p[k][1] - ay - dy * t);
      if (d > md) { md = d; mi = k; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((q, k) => keep[k]);
}
// trazos de letra con cantos y esquinas DUROS: cada tramo recto es un rectángulo que se alarga r por los dos
// lados (las uniones salen en esquina, no redondas)
function stampBlocks(G, strokes, seed) {
  // letra de bloque DIBUJADA A MANO (como un TEA hecho con rotulador): cada palo con su grosor (más ancho en una
  // punta, a veces abierto en las dos), los dos cantos con su propio temblor (no paralelos), remates cortados en
  // sesgo; esquinas vivas en los cambios de dirección
  const ras = new Raster(G.w, G.h);
  let si = 0;
  for (const st of strokes) {
    si++;
    let P0 = st.pts.map(q => [(q[0] - G.x0) * G.s, (q[1] - G.y0) * G.s]);
    P0 = P0.filter((q, i) => i === 0 || Math.hypot(q[0] - P0[i - 1][0], q[1] - P0[i - 1][1]) > 0.5);
    if (P0.length < 2) continue;
    const r = st.r * G.s, sd = ((seed || 1) * 131 + si * 977) | 0;
    const rnd = R.mulberry32(sd >>> 0);
    // densifica (para que el grosor y el temblor varíen a lo largo) guardando las esquinas
    const P = [P0[0]], corner = [true];
    for (let i = 1; i < P0.length; i++) {
      const a = P0[i - 1], b = P0[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / Math.max(1.5, r * 0.5)));
      for (let k = 1; k <= m; k++) { P.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]); corner.push(k === m); }
    }
    const n = P.length;
    const S = [0]; for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const Lt = S[n - 1] || 1;
    // grosor a lo largo: una punta más ancha que otra, y a veces se abre en los extremos
    const wa = 0.82 + 0.4 * rnd(), wb = 0.82 + 0.4 * rnd(), fl = rnd() < 0.55 ? 0.15 + 0.3 * rnd() : 0;
    const width = f => (wa + (wb - wa) * f) * (1 + fl * (Math.pow(1 - f, 6) + Math.pow(f, 6)));
    const edgeN = (f, sg) => 0.14 * R.noise1(f * Lt / (r * 2.2 + 1), sd + (sg > 0 ? 3 : 7)) + 0.05 * R.noise1(f * Lt / (r * 0.6 + 1), sd + (sg > 0 ? 11 : 13));
    const dir = i => { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
    // remates en sesgo: cuánto adelanta un canto respecto al otro en cada punta
    const skew0 = (rnd() - 0.5) * 0.9 * r, skew1 = (rnd() - 0.5) * 0.9 * r;
    const side = sg => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const f = S[i] / Lt, rr = r * Math.max(0.55, width(f) + edgeN(f, sg));
        if (i === 0 || i === n - 1) {
          const d = dir(i === 0 ? 0 : n - 2), nx = -d[1] * sg, ny = d[0] * sg, e = (i === 0 ? -1 : 1) * (r * 0.85 + sg * (i === 0 ? skew0 : skew1));
          out.push([P[i][0] + nx * rr + d[0] * e, P[i][1] + ny * rr + d[1] * e]);
          continue;
        }
        const d0 = dir(i - 1), d1 = dir(i);
        const n0 = [-d0[1] * sg, d0[0] * sg], n1 = [-d1[1] * sg, d1[0] * sg];
        const mx = n0[0] + n1[0], my = n0[1] + n1[1], ml = Math.hypot(mx, my);
        const cosH = ml / 2;
        if (cosH > 0.38) { const k = rr / cosH; out.push([P[i][0] + mx / ml * k, P[i][1] + my / ml * k]); }
        else { out.push([P[i][0] + n0[0] * rr, P[i][1] + n0[1] * rr]); out.push([P[i][0] + n1[0] * rr, P[i][1] + n1[1] * rr]); }
      }
      return out;
    };
    void corner;
    const L = side(1), Rr = side(-1).reverse();
    const poly = L.concat(Rr);
    let area = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) poly.reverse();
    const f = new Float64Array(poly.length * 2);
    poly.forEach((q, i) => { f[2 * i] = q[0]; f[2 * i + 1] = q[1]; });
    ras.poly(f);
  }
  const cov = ras.coverage();
  for (let i = 0; i < G.d.length; i++) { const c = Math.min(1, Math.abs(cov[i])); if (c > G.d[i]) G.d[i] = c; }
}

// ------------------------------------------------------------------ plan
// o: { tool, preset, em (px por em), boxes: [{ toDoc(u, v), W, H, letter }], letterStrokes? (trazos de letra,
//      se estampan con esquinas duras), letterPolys? (contornos de fuente), avoidStrokes?, grow?, width, seed }
function plan(o) {
  const rnd = R.mulberry32((o.seed * 2654435761) >>> 0);
  const g = () => R.gauss(rnd);
  const rr = (a) => a[0] + (a[1] - a[0]) * rnd();
  const em = o.em, wm = o.width || 1;
  const S = styleFor(o.tool, o.preset), P = S.fillP;
  const rF = Math.max(0.8, S.rFill * em * Math.sqrt(wm)), rL = Math.max(0.7, rF * S.lineK);
  // cajas: cuadriláteros con las esquinas movidas (en unidades de la caja) y su mapa al documento
  const quads = o.boxes.map(B => {
    const j = () => Math.max(-0.012, Math.min(0.08, Math.abs(g()) * 0.045 - 0.008)) * B.H;   // hacia dentro (+)
    const c = [[j(), j()], [B.W - j(), j()], [B.W - j(), B.H - j()], [j(), B.H - j()]];
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
  if (o.letterStrokes) stampBlocks(G, o.letterStrokes, o.seed);
  if (o.letterPolys) stampPolys(G, o.letterPolys);
  const binL = new Uint8Array(G.w * G.h);
  for (let i = 0; i < binL.length; i++) binL[i] = G.d[i] < 0.5 ? 1 : 0;
  const D = fastEDT(binL, G.w, G.h);
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
  const DB = fastEDT(binB, G.w, G.h);
  for (let i = 0; i < DB.length; i++) DB[i] /= G.s;
  // distancia por FUERA de la caja (para dejar que el relleno se salga un poco)
  const binO = new Uint8Array(G.w * G.h);
  for (let i = 0; i < binO.length; i++) binO[i] = binB[i] ? 0 : 1;
  const DO = fastEDT(binO, G.w, G.h);
  for (let i = 0; i < DO.length; i++) {
    DO[i] /= G.s;
  }
  // máscaras: relleno (dentro de la caja, fuera de las letras) y perfiles (solo fuera de las letras)
  const dIn = Math.max(0.5, rL * 0.15);
  const Mfill = { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d: new Float32Array(D.length), out: 0 };
  const Mline = { x0: G.x0, y0: G.y0, w: G.w, h: G.h, s: G.s, d: new Float32Array(D.length), out: 1 };
  for (let i = 0; i < D.length; i++) {
    const aw = Math.max(0.6, 1.6 / G.s);
    const lt = smooth01(dIn * 0.3, dIn + aw, D[i]) * (1 - G.d[i]);
    Mline.d[i] = lt; Mfill.d[i] = lt * Math.max(cov[i], 1 - smooth01(rF * 3.4, rF * 3.4 + Math.max(1.2, 2 / G.s), DO[i]));
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
  const push = (pts, PP, r, mask, alpha, letter) => {
    if (pts.length < 2) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    const m = r * 3 + 3;
    seedK = (seedK + 7919) >>> 0;
    out.push({ pts, r, P: PP, seed: seedK, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m }, alpha: alpha || 1, mask, letter: letter || 0, word: 0 });
  };
  const L0 = quads[0] ? quads[0].letter || 0 : 0;
  // línea hecha a mano sobre una polilínea (recta o curva): combada, con una ondulación lenta y un pequeño giro de
  // muñeca al final; distinta cada vez
  const handPoly = (src, PP, r, mask, alpha, hand, bow) => {
    let L = 0; const S0 = [0];
    for (let i = 1; i < src.length; i++) { L += Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]); S0.push(L); }
    if (L < 1) return;
    const n = Math.max(4, Math.ceil(L / Math.max(2, r * 1.5)));
    const hk = hand == null ? 1 : hand;
    const bw = (bow || 0) + hk * g() * L * 0.012;
    const wv = hk * (0.25 + 0.75 * rnd()) * (L * 0.004 + r * 0.35), ws = (rnd() * 1e5) | 0, wf = 1.2 + 2 * rnd();
    const wv2 = hk * (0.3 + 0.7 * rnd()) * (L * 0.002 + r * 0.3), wf2 = (L / Math.max(4, r * 8)) * (0.6 + 0.8 * rnd());
    const hook = hk * (rnd() < 0.35 ? g() * Math.min(L * 0.03, r * 3) : 0);
    const pts = [];
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const d = L * k / n;
      while (j < src.length - 2 && S0[j + 1] < d) j++;
      const a = src[j], b = src[j + 1], sl = (S0[j + 1] - S0[j]) || 1, t = (d - S0[j]) / sl;
      const tx = (b[0] - a[0]) / sl, ty = (b[1] - a[1]) / sl;
      const f = k / n, o = bw * 4 * f * (1 - f) + wv * R.noise1(f * wf, ws) + wv2 * R.noise1(f * wf2, ws + 7) + hook * Math.pow(f, 6);
      pts.push({ x: a[0] + (b[0] - a[0]) * t - ty * o, y: a[1] + (b[1] - a[1]) * t + tx * o, w: 1 });
    }
    push(pts, PP, r, mask, alpha, L0);
  };
  const line = (A, B, PP, r, mask, alpha, bow, hand) => handPoly([A, B], PP, r, mask, alpha, hand, bow);
  const lineStart = out.length;
  // ---- 1. las letras, perfiladas con línea: tramos rectos (esquinas duras) que se pasan un poco
  const toDoc = p => [G.x0 + p[0] / G.s, G.y0 + p[1] / G.s];
  const bm = (dIn + rL * 0.85) * G.s + 3;
  for (let poly of isoLines(D, G.w, G.h, dIn + rL * 0.85)) {
    if (poly.some(p => p[0] < bm || p[1] < bm || p[0] > G.w - 1 - bm || p[1] > G.h - 1 - bm)) continue;
    poly = poly.map(toDoc);
    if (plen(poly) < em * 0.05) continue;
    const closed = Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 2 / G.s + 1;
    const sp = simplify(poly, Math.max(rL * 0.35, em * 0.004));
    if (closed && sp.length > 3) sp.pop();
    const m = sp.length;
    if (m < 2) continue;
    // esquinas: giro fuerte (las curvas de la O o la D giran poco a poco y no cuentan)
    const turn = i => { const a = sp[(i - 1 + m) % m], b = sp[i], c = sp[(i + 1) % m]; const ax = b[0] - a[0], ay = b[1] - a[1], bx = c[0] - b[0], by = c[1] - b[1]; return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1)))); };
    const corners = [];
    for (let i = closed ? 0 : 1; i < (closed ? m : m - 1); i++) if (turn(i) > 0.55) corners.push(i);
    const pieces = [];
    if (closed && !corners.length) {
      // sin esquinas (O): dos o tres trazos que se montan un poco
      const nP = 2 + (rnd() < 0.4 ? 1 : 0), st = (rnd() * m) | 0;
      for (let q = 0; q < nP; q++) { const pc = []; const a0 = st + Math.floor(m * q / nP), a1 = st + Math.ceil(m * (q + 1) / nP) + 1; for (let i = a0; i <= a1; i++) pc.push(sp[i % m]); pieces.push(pc); }
    } else if (closed) {
      for (let q = 0; q < corners.length; q++) { const a0 = corners[q], a1 = corners[(q + 1) % corners.length] + (q + 1 === corners.length ? m : 0); const pc = []; for (let i = a0; i <= a1; i++) pc.push(sp[i % m]); pieces.push(pc); }
    } else {
      const cs = [0].concat(corners, [m - 1]);
      for (let q = 0; q < cs.length - 1; q++) pieces.push(sp.slice(cs[q], cs[q + 1] + 1));
    }
    for (let pc of pieces) {
      if (pc.length < 2 || plen(pc) < rL * 1.5) continue;
      // en las esquinas se pasa (o no llega) siguiendo la tangente, distinto en cada punta
      const A = pc[0], A2 = pc[1], B = pc[pc.length - 1], B2 = pc[pc.length - 2];
      const la = Math.hypot(A[0] - A2[0], A[1] - A2[1]) || 1, lb = Math.hypot(B[0] - B2[0], B[1] - B2[1]) || 1;
      const e0 = rL * (rnd() < 0.75 ? 0.5 + 2.2 * rnd() : -0.5 * rnd()), e1 = rL * (rnd() < 0.75 ? 0.5 + 2.2 * rnd() : -0.5 * rnd());
      pc = [[A[0] + (A[0] - A2[0]) / la * e0, A[1] + (A[1] - A2[1]) / la * e0]].concat(pc.slice(1, -1), [[B[0] + (B[0] - B2[0]) / lb * e1, B[1] + (B[1] - B2[1]) / lb * e1]]);
      if (pc.length > 4) pc = smoothPoly(pc, 1, false);
      if (rnd() < 0.5) pc = pc.slice().reverse();
      handPoly(pc, S.lineP, rL * (0.9 + 0.2 * rnd()), Mline, 1, 0.3);
      if (rnd() < 0.18) handPoly(pc.map(q => [q[0] + g() * rL * 0.4, q[1] + g() * rL * 0.4]), S.lineP, rL * 0.85, Mline, 0.8, 0.3);
    }
    void closed;
  }
  // ---- 2. la caja, lado a lado: de uno a tres golpes por lado (a cachos, a veces con un hueco, a veces montados),
  // cada golpe con su torcedura propia, ni recto ni curvo regular; ~30 % de los lados, repasados
  if (!S.noBox) for (const Q of quads) {
    const cs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const ext = () => { const u = rnd(); return em * (u < 0.22 ? -0.015 - 0.04 * rnd() : u < 0.5 ? 0.008 * rnd() : u < 0.88 ? 0.015 + 0.06 * rnd() : 0.08 + 0.1 * rnd()); };
    for (let k = 0; k < 4; k++) {
      const A0 = cs[k], B0 = cs[(k + 1) % 4];
      const at = f => Q.at(A0[0] + (B0[0] - A0[0]) * f, A0[1] + (B0[1] - A0[1]) * f);
      const p0 = at(0), p1 = at(1), sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      // punto del lado en f (fuera de 0..1 sigue la tangente), desplazado «o» hacia fuera
      const sideAt = (f, o) => {
        const fc = Math.max(0, Math.min(1, f)), q = at(fc), qa = at(Math.min(1, fc + 0.01)), qb = at(Math.max(0, fc - 0.01));
        let tx = qa[0] - qb[0], ty = qa[1] - qb[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const ov = f < 0 ? f * sl : f > 1 ? (f - 1) * sl : 0;
        return [q[0] + tx * ov + ty * o, q[1] + ty * ov - tx * o];
      };
      const passes = rnd() < 0.38 ? 2 : 1;
      for (let ps = 0; ps < passes; ps++) {
        const nCh = rnd() < 0.35 ? 1 : rnd() < 0.6 ? 2 : rnd() < 0.7 ? 3 : 4;
        let fA = -ext() / sl;
        const fEnd = 1 + ext() / sl;
        for (let c = 0; c < nCh; c++) {
          const fB = c === nCh - 1 ? fEnd : fA + (fEnd - fA) * (1 / (nCh - c)) * (0.75 + 0.5 * rnd());
          // torcedura del golpe: entra y sale a distinta distancia del borde, con un combado propio
          const sc = em * 0.012 + rL;
          const oA = g() * sc * 1.6 + (ps ? g() * sc * 1.3 : 0), oB = g() * sc * 1.6 + (ps ? g() * sc * 1.3 : 0);
          const bowc = g() * (sc * 1.3 + (fB - fA) * sl * 0.012), nS = 18, pc = [];
          // un quiebro: a mitad del golpe la mano corrige la dirección
          const kink = rnd() < 0.45 ? { t: 0.25 + 0.5 * rnd(), o: g() * sc * 1.2 } : null;
          for (let j = 0; j <= nS; j++) {
            const t = j / nS, kk = kink ? kink.o * (t < kink.t ? t / kink.t : (1 - t) / (1 - kink.t)) : 0;
            pc.push(sideAt(fA + (fB - fA) * t, oA + (oB - oA) * t + bowc * 4 * t * (1 - t) + kk));
          }
          handPoly(rnd() < 0.5 ? pc : pc.reverse(), S.lineP, rL * (0.8 + 0.5 * rnd()), Mline, 1, 1.6);
          // siguiente golpe: a veces se monta un poco, a veces deja un hueco pequeño
          fA = fB + (rnd() < 0.6 ? -1 : 1) * (0.005 + 0.025 * rnd()) * em / sl;
        }
      }
    }
  }
  const lineEnd = out.length;
  // ---- 3. relleno: garabatos (ida y vuelta sin levantar) donde aún falta, hasta llenar lo que llena la mano
  // rejilla de cobertura (celdas dentro de la caja y fuera de las letras)
  const cell = Math.max(2, em * 0.035);
  const cw = Math.ceil((bx1 - bx0 + 2 * marg) / cell), ch = Math.ceil((by1 - by0 + 2 * marg) / cell);
  const cx0 = bx0 - marg, cy0 = by0 - marg;
  const valid = new Uint8Array(cw * ch), done = new Uint8Array(cw * ch);
  let nValid = 0;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = cx0 + (i + 0.5) * cell, y = cy0 + (j + 0.5) * cell;
    if (fAt(Mfill.d, x, y) > 0.5) { valid[j * cw + i] = 1; nValid++; }
  }
  const tangentAt = (x, y) => {
    const dl = fAt(D, x, y), db = fAt(DB, x, y);
    const F = dl < db * 1.3 ? D : DB, h = Math.max(1.5, 1.5 / G.s);
    const gx = fAt(F, x + h, y) - fAt(F, x - h, y), gy = fAt(F, x, y + h) - fAt(F, x, y - h);
    return Math.hypot(gx, gy) > 1e-6 ? Math.atan2(gx, -gy) : rnd() * Math.PI;
  };
  // ¿se puede pintar aquí? (fuera de las letras y sus vecinas; dentro de la caja o saliéndose un poco)
  const kE = S.free ? 0.85 : P.proc ? 1.0 : 1.2;
  let rCur = rF;   // grosor del garabato que se está pintando
  const okAt = (x, y, over, rr0) => fAt(Mline.d, x, y) > 0.5 && fAt(D, x, y) > dIn + (rr0 || rCur) * kE && fAt(DO, x, y) <= over;
  // hasta dónde se puede ir desde (x, y) en la dirección (dx, dy), como mucho «max»
  const reach = (x, y, dx, dy, max, over) => {
    const st = Math.max(1, rF * 0.6);
    let d = 0;
    while (d < max) { const nd = d + st; if (!okAt(x + dx * nd, y + dy * nd, over)) break; d = nd; }
    return d;
  };
  // un garabato: idas y vueltas sin levantar a lo largo de (tx, ty), avanzando por (nx, ny). Cada ida llega
  // hasta donde hay sitio (la mano se adapta al hueco: no hay trazos cortados por una máscara); a veces se pasa
  // un poco del borde de la caja. En abanico: un extremo casi quieto (el pivote de la muñeca) y el otro abierto.
  const diam = rF * 2;
  // TUPIDO (0..1): cuánto se carga el relleno
  const tup = o.tupido == null ? 0.6 : Math.max(0, Math.min(1, o.tupido));
  const alphaK = 0.75 + 0.45 * tup;
  const scribble = (cx, cy, ang, legs, Lmid, stepK, alpha) => {
    const tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
    const diam = rCur * 2, step = diam * stepK;
    let pts = [], dir = rnd() < 0.5 ? 1 : -1, n = -legs * step / 2;
    const fan = (0.15 + 0.45 * rnd()) * (rnd() < 0.5 ? -1 : 1), lean = g() * 0.1;
    const anchorEnd = rnd() < 0.5 ? 1 : -1;
    const over = S.free ? rCur * (0.4 + 1.6 * rnd()) : rCur * (rnd() < 0.4 ? 1.6 : 0.4);               // si sale del borde, cuánto
    let legCount = 0, used = 0, nMin = Infinity, nMax = -Infinity;
    const flush = () => { if (pts.length > 1) push(pts, P, rCur * (0.9 + 0.2 * rnd()), Mfill, alpha * (0.85 + 0.3 * rnd()), L0); pts = []; legCount = 0; };
    for (let k = 0; k < legs; k++) {
      const f = legs > 1 ? k / (legs - 1) : 0.5;
      const rot = fan * (f - 0.5) + lean, a = ang + rot;
      const ux = Math.cos(a), uy = Math.sin(a);
      // pivote: el extremo ancla se desplaza poco; el otro se abre con el giro
      const px = cx + nx * n * (0.4 + 0.6 * (anchorEnd > 0 ? 1 : 0)), py = cy + ny * n * (0.4 + 0.6 * (anchorEnd > 0 ? 1 : 0));
      const qx = cx + nx * n, qy = cy + ny * n;
      const mx = (px + qx) / 2, my = (py + qy) / 2;
      if (!okAt(mx, my, over)) { flush(); n += step; continue; }
      const want = Lmid * (0.75 + 0.5 * rnd());
      const r1 = reach(mx, my, ux, uy, want * (0.5 + 0.5 * (anchorEnd > 0 ? 1.15 : 0.85)), over);
      const r0 = reach(mx, my, -ux, -uy, want * (0.5 + 0.5 * (anchorEnd > 0 ? 0.85 : 1.15)), over);
      if (r0 + r1 < diam * 1.2) { flush(); n += step; continue; }
      // casi siempre llega al borde del hueco; a veces se queda corta (no hay prisa por llegar)
      const e1 = r1 * (rnd() < 0.65 ? 1 : 0.6 + 0.35 * rnd()) - rCur * 0.3 * rnd(), e0 = r0 * (rnd() < 0.65 ? 1 : 0.6 + 0.35 * rnd()) - rCur * 0.3 * rnd();
      const A = [mx - ux * e0, my - uy * e0], B = [mx + ux * e1, my + uy * e1];
      const s0 = dir > 0 ? A : B, s1 = dir > 0 ? B : A;
      const adv = step * (0.55 + 0.9 * rnd());
      // la ida (algo combada, como gira la muñeca) y la vuelta redonda hacia la siguiente
      const bow = (diam * (0.15 + 0.35 * rnd()) + (e0 + e1) * (0.015 + 0.04 * rnd())) * dir;
      for (let j = 0; j <= 6; j++) {
        const t = j / 6, b = bow * Math.sin(t * Math.PI) + adv * 0.3 * t;
        pts.push({ x: s0[0] + (s1[0] - s0[0]) * t + nx * b, y: s0[1] + (s1[1] - s0[1]) * t + ny * b });
      }
      pts.push({ x: s1[0] + ux * dir * adv * 0.3 + nx * adv * 0.65, y: s1[1] + uy * dir * adv * 0.3 + ny * adv * 0.65 });
      n += adv; dir = -dir; legCount++; used = Math.max(used, r0 + r1);
      nMin = Math.min(nMin, n); nMax = Math.max(nMax, n);
      if (legCount >= S.split && k < legs - 1) { const last = pts[pts.length - 1]; flush(); if (S.split > 2) pts = [last]; }
    }
    flush();
    return { W: isFinite(nMax) ? nMax - nMin + step : 0, L: used };
  };
  let covered = 0;
  const markRect = (cx, cy, ang, L, W) => {
    const tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
    const hl = L * 0.42, hw = W * 0.45;
    const R2 = Math.ceil(Math.hypot(hl, hw) / cell) + 1;
    const ci = Math.floor((cx - cx0) / cell), cj = Math.floor((cy - cy0) / cell);
    for (let j = cj - R2; j <= cj + R2; j++) for (let i = ci - R2; i <= ci + R2; i++) {
      if (i < 0 || j < 0 || i >= cw || j >= ch) continue;
      const x = cx0 + (i + 0.5) * cell - cx, y = cy0 + (j + 0.5) * cell - cy;
      if (Math.abs(x * tx + y * ty) <= hl && Math.abs(x * nx + y * ny) <= hw) { const q = j * cw + i; if (!done[q]) { done[q] = 1; if (valid[q]) covered++; } }
    }
  };
  // fondo (rotulador, pincel): pasadas a lo largo de la caja, casi seguidas, que se paran en las letras y en el borde
  if (S.base) for (const Q of quads) {
    rCur = rF * (S.kind === 'brush' || P.blend === 'over' ? 0.55 : 1);
    const diam = rCur * 2;
    const nRow = Math.max(1, Math.ceil(Q.Hpx / (diam * 0.85)));
    const nU = Math.max(20, Math.ceil(Q.Wpx / Math.max(1, rF * 0.5)));
    for (let i = 0; i < nRow; i++) {
      const t = (i + 0.5) / nRow + (rnd() - 0.5) * 0.5 / nRow, tilt = g() * 0.4 / nRow, ws = (rnd() * 1e5) | 0;
      const rowPt = u => { const q = Q.at(u, t + tilt * (u - 0.5) + 0.15 / nRow * R.noise1(u * 2, ws)); return q; };
      // tramos libres de la fila
      const runs = []; let cur = null;
      for (let k = 0; k <= nU; k++) {
        const u = -0.02 + 1.04 * k / nU, q = rowPt(u);
        if (okAt(q[0], q[1], rF * 0.6)) { if (!cur) cur = [u, u]; else cur[1] = u; } else if (cur) { runs.push(cur); cur = null; }
      }
      if (cur) runs.push(cur);
      for (const [ua, ub] of runs) {
        let s0 = ua;
        while (s0 < ub - 1e-6) {
          const s1 = Math.min(ub, s0 + 0.18 + 0.4 * rnd());
          const pts = [];
          for (let j = 0; j <= 8; j++) { const q = rowPt(s0 + (s1 - s0) * j / 8); pts.push({ x: q[0], y: q[1] }); }
          if (plen(pts.map(q => [q.x, q.y])) > rF * 1.2) push(rnd() < 0.5 ? pts : pts.reverse(), P, rCur * (0.95 + 0.2 * rnd()), Mfill, S.base * alphaK, L0);
          if (s1 >= ub) break;
          s0 = s1 - 0.03 - 0.05 * rnd();
        }
      }
    }
  }
  // PINCEL: como lo hace un pintor. Primero la capa, con pinceladas largas a lo largo de la caja y otra tanda en
  // diagonal; luego, ENCIMA, se recorta con el pincel fino el canto de cada letra y el borde de la caja (el recorte
  // tapa donde acaba la capa: no se ven cortes).
  let guard = 0, nScr = 0;
  const target = Math.min(0.995, S.cover + (tup - 0.5) * 0.2) * nValid;
  // huecos sin pintar (pocos, más cuanto menos tupido): se marcan como hechos y nadie va a buscarlos
  {
    let area = 0; for (const Q of quads) area += Q.Wpx * Q.Hpx;
    const nH = Math.round(area / (em * em) * (0.15 + 0.55 * (1 - tup)) * (0.6 + 0.8 * rnd()));
    for (let h = 0; h < nH; h++) {
      const Q = quads[(rnd() * quads.length) | 0], c = Q.at(0.08 + 0.84 * rnd(), 0.1 + 0.8 * rnd());
      const rad = em * (0.04 + 0.1 * rnd()) * (1.3 - 0.6 * tup), rr2 = rad / cell, ci = Math.floor((c[0] - cx0) / cell), cj = Math.floor((c[1] - cy0) / cell);
      for (let j = Math.floor(cj - rr2); j <= cj + rr2; j++) for (let i = Math.floor(ci - rr2 * 1.6); i <= ci + rr2 * 1.6; i++) {
        if (i < 0 || j < 0 || i >= cw || j >= ch) continue;
        if (((i - ci) / 1.6) ** 2 + (j - cj) ** 2 <= rr2 * rr2) { const q = j * cw + i; if (!done[q]) { done[q] = 1; if (valid[q]) covered++; } }
      }
    }
  }
  const free = [];
  for (let k = 0; k < valid.length; k++) if (valid[k]) free.push(k);
  while (covered < target && guard++ < 1500 && free.length) {
    // de unas cuantas celdas libres al azar, la que tiene más hueco alrededor
    let best = -1, bestN = -1;
    for (let t = 0; t < 24; t++) {
      const k = free[(rnd() * free.length) | 0];
      if (done[k]) continue;
      const i = k % cw, j = (k / cw) | 0;
      let nn = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const q = (j + dj) * cw + i + di; if (q >= 0 && q < valid.length && valid[q] && !done[q]) nn++; }
      if (nn > bestN) { bestN = nn; best = k; }
    }
    if (best < 0) { for (let k = free.length - 1; k >= 0; k--) if (done[free[k]]) free.splice(k, 1); continue; }
    const x = cx0 + ((best % cw) + 0.5) * cell + (rnd() - 0.5) * cell, y = cy0 + (((best / cw) | 0) + 0.5) * cell + (rnd() - 0.5) * cell;
    let ang = tangentAt(x, y) + g() * 0.25;
    if (S.free) {
      // pincel: casi vertical o casi a lo largo de la caja (con su giro), según caiga; junto a una letra, a lo largo de ella
      if (fAt(D, x, y) > rF * 3) { const q0 = quads[0].at(0.5, 0.5), q1 = quads[0].at(0.6, 0.5); const base = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]); ang = base + (rnd() < 0.55 ? Math.PI / 2 : 0) + g() * 0.35; }
    } else if (rnd() < S.cross) ang += (rnd() < 0.5 ? 1 : -1) * (0.4 + 0.8 * rnd());
    // tamaño del hueco: a lo largo y a lo ancho (medido con el trazo más fino); el grosor, el que cabe
    const ux = Math.cos(ang), uy = Math.sin(ang);
    rCur = rF * 0.35;
    { const ac = reach(x, y, -uy, ux, em, rF) + reach(x, y, uy, -ux, em, rF), lo = S.free ? 0.6 : 0.35; rCur = Math.max(rF * lo, Math.min(rF, ac * 0.3 + rF * 0.35 * rnd())); if (S.free) rCur *= 0.55 + 0.75 * rnd(); }
    const along = reach(x, y, ux, uy, em * 2, rF) + reach(x, y, -ux, -uy, em * 2, rF);
    const across = reach(x, y, -uy, ux, em * 2, rF) + reach(x, y, uy, -ux, em * 2, rF);
    const small = Math.min(1, Math.min(along, across) / (em * 0.45));
    // cada garabato distinto: más o menos idas, más o menos apretado; en un hueco pequeño, apelotonado
    const legs = Math.max(2, Math.round(rr(S.legs) * (0.5 + 0.9 * rnd()) * (0.45 + 0.55 * small)));
    const Lm = Math.min(rr(S.len) * em * Math.sqrt(wm) * (0.7 + 0.6 * rnd()), along * 1.1 + diam);
    const stepK = S.step * (0.55 + 0.9 * rnd()) * (0.55 + 0.45 * small) * (1.3 - 0.6 * tup);
    const res = scribble(x, y, ang, legs, Lm, stepK, S.alpha * alphaK);
    if (res.L > 0) markRect(x, y, ang, Math.max(res.L, diam * 2), Math.max(res.W, diam * 2));
    else markRect(x, y, ang, diam * 2, diam * 2);
    nScr++;
  }
  // zonas más cargadas (por partes): otra tanda encima, en sitios al azar
  const nExtra = Math.round(nScr * (0.1 + 0.45 * tup) * (S.extra || 1));
  for (let k = 0; k < nExtra && free.length; k++) {
    const q = free[(rnd() * free.length) | 0], x = cx0 + ((q % cw) + 0.5) * cell, y = cy0 + (((q / cw) | 0) + 0.5) * cell;
    rCur = rF * (0.35 + 0.4 * rnd());
    if (!okAt(x, y, 0)) continue;
    let ang = tangentAt(x, y) + g() * 0.3;
    if (rnd() < S.cross) ang += (rnd() < 0.5 ? 1 : -1) * (0.4 + 0.8 * rnd());
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const along = reach(x, y, ux, uy, em * 2, rF) + reach(x, y, -ux, -uy, em * 2, rF);
    scribble(x, y, ang, Math.max(2, Math.round(rr(S.legs) * (0.4 + 0.6 * rnd()))), Math.min(rr(S.len) * em * 0.8, along * 1.1 + diam), S.step * (0.5 + 0.6 * rnd()), S.alpha * alphaK * 0.9);
  }
  // ---- 4. rayas sueltas que remarcan: sobre todo junto a los lados de la caja y a lo largo de las letras
  const nLoose = Math.round(nScr * S.loose);
  function looseLine(x, y, ang, L) {
    rCur = rF * (0.4 + 0.4 * rnd());
    if (!okAt(x, y, rF)) return;
    const tx = Math.cos(ang), ty = Math.sin(ang);
    const r1 = reach(x, y, tx, ty, L / 2, rF * 0.6), r0 = reach(x, y, -tx, -ty, L / 2, rF * 0.6);
    if (r0 + r1 < diam * 2) return;
    line([x - tx * r0, y - ty * r0], [x + tx * r1, y + ty * r1], P, rCur, Mfill, S.alpha * alphaK * 0.9, g() * rF);
  }
  for (const Q of quads) {
    const cs = [[0, 0], [1, 0], [1, 1], [0, 1]], c = Q.at(0.5, 0.5);
    for (let k = 0; k < 4; k++) {
      if (rnd() < 0.3) continue;
      const A0 = cs[k], B0 = cs[(k + 1) % 4], f0 = rnd() * 0.3, f1 = 0.7 + rnd() * 0.3;
      const a = Q.at(A0[0] + (B0[0] - A0[0]) * f0, A0[1] + (B0[1] - A0[1]) * f0), b = Q.at(A0[0] + (B0[0] - A0[0]) * f1, A0[1] + (B0[1] - A0[1]) * f1);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = c[0] - mx, dy = c[1] - my, dl = Math.hypot(dx, dy) || 1, ins = rF * (1 + 1.5 * rnd());
      const A1 = [a[0] + dx / dl * ins, a[1] + dy / dl * ins], B1 = [b[0] + dx / dl * ins, b[1] + dy / dl * ins];
      looseLine((A1[0] + B1[0]) / 2, (A1[1] + B1[1]) / 2, Math.atan2(B1[1] - A1[1], B1[0] - A1[0]), Math.hypot(B1[0] - A1[0], B1[1] - A1[1]));
    }
  }
  for (let k = 0; k < nLoose && free.length; k++) {
    const q = free[(rnd() * free.length) | 0], x = cx0 + ((q % cw) + 0.5) * cell, y = cy0 + (((q / cw) | 0) + 0.5) * cell;
    looseLine(x, y, tangentAt(x, y) + g() * 0.25, rr(S.len) * em * (1 + 0.8 * rnd()));
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
  // palabras en negativo seguidas en la misma línea: una sola caja
  const lineOf = wi => { const L = lay.letters.find(l => l.word === wi); return L ? L.line : -1; };
  const groups = [];
  for (const wi of [...neg].sort((x, y) => x - y)) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1] === wi - 1 && lineOf(wi - 1) === lineOf(wi)) last.push(wi); else groups.push([wi]);
  }
  let k = 0;
  for (const grp of groups) {
    const ls = lay.letters.filter(L => grp.indexOf(L.word) >= 0);
    if (!ls.length) continue;
    const ems = ls.map(L => { const a = lay.map(L.x, L.base), b = lay.map(L.x + L.size, L.base), c = lay.map(L.x, L.base - L.size); return Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - a[0], c[1] - a[1])); }).sort((a, b) => a - b);
    const em = ems[ems.length >> 1] || 100;
    // letra gruesa y de tramos rectos: se quita el temblor (solo la primera pasada) y se estampa con esquinas
    const fat = 0.072 * em * (p.width || 1);
    const strokes = [];
    for (const wi of grp) for (const s of byWord.get(wi) || []) {
      if (s.alpha != null && s.alpha < 1) continue;
      let pts = s.pts.map(q => [q.x, q.y]);
      // el escritor parte el trazo en los picos (A, M, V): aquí se vuelve a unir para que el pico sea un pico
      const last = strokes[strokes.length - 1];
      if (last && last.raw && Math.hypot(last.raw[last.raw.length - 1][0] - pts[0][0], last.raw[last.raw.length - 1][1] - pts[0][1]) < fat * 0.6) { last.raw = last.raw.concat(pts.slice(1)); continue; }
      strokes.push({ raw: pts, r: fat });
    }
    for (const st of strokes) st.pts = simplify(st.raw, em * 0.005);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sz = 0;
    for (const L of ls) {
      const b = L.g.box, sx = L.sx || 1, sy = L.sy || 1;
      x0 = Math.min(x0, L.x + b.left * L.size * sx); x1 = Math.max(x1, L.x + b.right * L.size * sx);
      y0 = Math.min(y0, L.base + b.top * L.size * sy); y1 = Math.max(y1, L.base + b.bottom * L.size * sy); sz += L.size;
    }
    sz /= ls.length;
    for (const wi of grp) { const E = wordExt && wordExt.get(wi); if (E) { x0 = Math.min(x0, E.x0); x1 = Math.max(x1, E.x1); y0 = Math.min(y0, E.y0); y1 = Math.max(y1, E.y1); } }
    const rnd = R.mulberry32((seed + grp[0] * 977 + 404) >>> 0);
    const pad = sz * (0.17 + 0.072);
    let X0 = x0 - pad * (1 + 0.3 * rnd()), X1 = x1 + pad * (1 + 0.3 * rnd()), Y0 = y0 - pad * (0.8 + 0.3 * rnd()), Y1 = y1 + pad * (0.8 + 0.3 * rnd());
    // la caja no pisa letras de otras palabras: si alguna se mete, se recorta la CAJA (por el lado que menos pierde),
    // sin entrar en las letras propias
    if (wordExt) {
      const gap = sz * 0.07, pmin = sz * 0.07;
      for (const [wj, E] of wordExt) {
        if (grp.indexOf(wj) >= 0 || !isFinite(E.x0)) continue;
        const ex0 = E.x0 - gap, ex1 = E.x1 + gap, ey0 = E.y0 - gap, ey1 = E.y1 + gap;
        if (ex1 <= X0 || ex0 >= X1 || ey1 <= Y0 || ey0 >= Y1) continue;
        const opts = [];
        if (ex1 <= x0 - pmin) opts.push(['X0', ex1, (ex1 - X0) * (Y1 - Y0)]);
        if (ex0 >= x1 + pmin) opts.push(['X1', ex0, (X1 - ex0) * (Y1 - Y0)]);
        if (ey1 <= y0 - pmin) opts.push(['Y0', ey1, (ey1 - Y0) * (X1 - X0)]);
        if (ey0 >= y1 + pmin) opts.push(['Y1', ey0, (Y1 - ey0) * (X1 - X0)]);
        if (!opts.length) continue;             // (no se puede sin tocar las propias: la máscara rodea esas letras)
        opts.sort((a, b) => a[2] - b[2]);
        const [side, v] = opts[0];
        if (side === 'X0') X0 = v; else if (side === 'X1') X1 = v; else if (side === 'Y0') Y0 = v; else Y1 = v;
      }
    }
    const box = { W: X1 - X0, H: Y1 - Y0, letter: lay.letters.indexOf(ls[0]), toDoc: (u, v) => lay.map(X0 + u, Y0 + v) };
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [u, v] of [[0, 0], [box.W, 0], [box.W, box.H], [0, box.H], [box.W / 2, 0], [box.W / 2, box.H]]) { const q = box.toDoc(u, v); bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]); }
    const mm = em * 0.3;
    const avoid = keep.filter(s2 => s2.box.right > bx0 - mm && s2.box.left < bx1 + mm && s2.box.bottom > by0 - mm && s2.box.top < by1 + mm && !s2.mask).map(s2 => ({ pts: s2.pts, r: s2.r }));
    const r = plan({ tool: p.tool, preset: p.preset, em, boxes: [box], letterStrokes: strokes, avoidStrokes: avoid, width: p.width || 1, tupido: p.tupido, seed: (seed + grp[0] * 131 + k++) >>> 0 });
    for (const s of r.strokes) { s.word = grp[0]; res.push(s); }
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
  return plan({ tool: p.tool, preset: p.preset, em, boxes, letterPolys: polys, tupido: p.tupido, grow: em * 0.012 * (p.width || 1), width: 1, seed });
}

module.exports = { plan, planWords, fromInstances, isoLines, STYLE };
