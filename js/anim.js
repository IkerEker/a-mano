'use strict';
// ANIMACIÓN (After Effects): el plan de trazos se pinta en el orden y al ritmo de la mano, con el motor de tinta
// de siempre, y se sacan fotogramas:
//   0 … nw        la letra se escribe (0 = papel vacío, nw = texto entero)
//   nw+1 … nw+ne  la letra se borra por donde empezó (solo con borrado «inicio»; nw+ne = vacío)
// Cada fotograma es la tinta de verdad (no una máscara sobre un trazo vectorial): lo que ya está escrito se queda
// como quedó, y el trazo que se está haciendo aparece hasta donde llega la punta.

const RD = require('./render.js');
const WR = require('./writer.js');

// ------------------------------------------------------------------ orden de escritura
// palabra a palabra; la raya del subrayado, al acabar su palabra; la caja de un negativo, donde va su palabra
function order(strokes) {
  return strokes.map((s, i) => ({ s, i, k: (s.word || 0) + (s.under ? 0.5 : 0) }))
    .sort((a, b) => a.k - b.k || a.i - b.i).map(o => o.s);
}

// ------------------------------------------------------------------ el tiempo de la mano
function resample(pts, step) {
  const X = [pts[0].x], Y = [pts[0].y], S = [0];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x, ay = pts[i - 1].y, dx = pts[i].x - ax, dy = pts[i].y - ay, d = Math.hypot(dx, dy);
    if (d < 1e-6) continue;
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) { X.push(ax + dx * k / n); Y.push(ay + dy * k / n); S.push(s + d * k / n); }
    s += d;
  }
  return { X: Float32Array.from(X), Y: Float32Array.from(Y), S: Float32Array.from(S), len: s };
}

// Cada trazo: cuánto tarda (la mano frena en las curvas cerradas —ley de los dos tercios—, arranca y frena en
// cada trazo) y cuánto se para antes (levantar, ir por el aire hasta el siguiente, cambiar de palabra).
// El relleno de un negativo es un garabato rápido.
function timeline(strokes) {
  const lens = [];
  const items = strokes.map(s => {
    const q = resample(s.pts, Math.max(1, Math.min(4, s.r * 0.5)));
    if (!s.mask && !s.under && q.len > 0) lens.push(q.len);
    return { s, q };
  });
  lens.sort((a, b) => a - b);
  const ell = Math.max(8, lens.length ? lens[lens.length >> 1] : 40);   // tamaño típico de un trazo de letra
  let t = 0, prev = null, drawT = 0, drawL = 0;
  for (const it of items) {
    const { q, s } = it, n = q.S.length;
    const fast = s.mask ? 3.6 : 1;
    // pausa
    let pause = 0;
    if (prev) {
      const pq = prev.q, d = Math.hypot(q.X[0] - pq.X[pq.X.length - 1], q.Y[0] - pq.Y[pq.Y.length - 1]);
      if (s.mask && prev.s.mask) pause = 0.04 * ell + d / 5;
      else pause = (d < s.r * 1.2 ? 0.05 : 0.28) * ell + d / 2.6 + ((prev.s.word || 0) !== (s.word || 0) ? 0.55 * ell : 0);
    }
    t += pause;
    it.t0 = t;
    const T = new Float32Array(n);
    const win = Math.max(1, Math.round(ell * 0.12 / Math.max(1e-6, q.len / Math.max(1, n - 1))));
    for (let i = 1; i < n; i++) {
      const a = Math.max(0, i - win), b = Math.min(n - 1, i + win), m = i;
      const ux = q.X[m] - q.X[a], uy = q.Y[m] - q.Y[a], vx = q.X[b] - q.X[m], vy = q.Y[b] - q.Y[m];
      const ul = Math.hypot(ux, uy), vl = Math.hypot(vx, vy);
      let kap = 0;
      if (ul > 1e-6 && vl > 1e-6) kap = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (ul * vl)))) / Math.max(1e-6, (ul + vl) / 2);
      let v = Math.min(1, Math.pow(Math.max(1e-6, kap * ell * 0.5), -1 / 3));
      v = Math.max(0.38, v);
      // arranca y frena
      const u = q.S[i] / Math.max(1e-6, q.len), edge = Math.min(u / 0.14, (1 - u) / 0.18, 1);
      v *= 0.5 + 0.5 * Math.max(0, edge);
      T[i] = T[i - 1] + (q.S[i] - q.S[i - 1]) / (v * fast);
    }
    it.T = T;
    it.dur = T[n - 1] || 0;
    t += it.dur;
    it.t1 = t;
    drawT += it.dur; drawL += q.len;
    prev = it;
  }
  const total = Math.max(1e-6, t);
  for (const it of items) { it.t0 /= total; it.t1 /= total; it.k = it.dur > 0 ? (it.t1 - it.t0) / it.dur : 0; }
  // BORRADO: la goma pasa una sola vez. Las pasadas de repaso (negrita, palabras importantes) se van a la vez
  // que la primera: su tiempo de borrado es el de la primera pasada de ese mismo trazo.
  const spans = new Map();
  for (const it of items) {
    const s = it.s;
    if (s.sk == null || s.mask) continue;
    const key = s.letter + '/' + s.sk + '/' + (s.pass || 0);
    const e = spans.get(key) || { a: Infinity, b: -Infinity };
    e.a = Math.min(e.a, it.t0); e.b = Math.max(e.b, it.t1); spans.set(key, e);
  }
  for (const it of items) {
    const s = it.s;
    it.e0 = it.t0; it.e1 = it.t1;
    if (s.sk == null || s.mask || !s.pass) continue;
    const own = spans.get(s.letter + '/' + s.sk + '/' + s.pass), first = spans.get(s.letter + '/' + s.sk + '/0');
    if (!own || !first || own.b - own.a < 1e-9) continue;
    const f = x => first.a + (x - own.a) / (own.b - own.a) * (first.b - first.a);
    it.e0 = f(it.t0); it.e1 = f(it.t1);
  }
  // (el rato que en la escritura se fue en repasar no se queda en blanco al borrar: se quitan los huecos largos)
  const iv = items.map(it => [it.e0, it.e1]).sort((x, y) => x[0] - y[0]), seg = [];
  for (const [x, y] of iv) { const L = seg[seg.length - 1]; if (L && x <= L[1]) L[1] = Math.max(L[1], y); else seg.push([x, y]); }
  const cap = 0.012, knots = [[0, 0]];
  let acc = 0, last = 0;
  for (const [x, y] of seg) { acc += Math.min(cap, Math.max(0, x - last)); knots.push([x, acc]); acc += y - x; knots.push([y, acc]); last = y; }
  const gmap = x => {
    let lo = 0, hi = knots.length - 1;
    if (x >= knots[hi][0]) return 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (knots[m][0] <= x) lo = m; else hi = m; }
    const d = knots[hi][0] - knots[lo][0];
    return (knots[lo][1] + (d > 1e-12 ? (x - knots[lo][0]) / d : 0) * (knots[hi][1] - knots[lo][1])) / Math.max(1e-9, acc);
  };
  for (const it of items) { it.e0 = gmap(it.e0); it.e1 = Math.max(it.e0, gmap(it.e1)); }
  return { items, total, softT: drawL > 0 ? 2.5 * (drawT / drawL) / total : 0.002 };
}
// longitud recorrida del trazo en el instante t (0..1 global)
function lenAt(it, t) {
  const T = it.T, S = it.q.S, n = T.length;
  if (t <= it.t0) return 0;
  if (t >= it.t1 || it.k <= 0) return it.q.len;
  const x = (t - it.t0) / it.k;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= x) lo = m; else hi = m; }
  const d = T[hi] - T[lo];
  return S[lo] + (S[hi] - S[lo]) * (d > 1e-9 ? (x - T[lo]) / d : 1);
}
function timeAtLen(it, L) {
  const T = it.T, S = it.q.S, n = S.length;
  if (L <= 0) return it.t0;
  if (L >= it.q.len) return it.t1;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= L) lo = m; else hi = m; }
  const d = S[hi] - S[lo];
  return it.t0 + it.k * (T[lo] + (T[hi] - T[lo]) * (d > 1e-9 ? (L - S[lo]) / d : 1));
}
function eraseAtLen(it, L) {
  const d = it.t1 - it.t0;
  return d > 1e-9 ? it.e0 + (timeAtLen(it, L) - it.t0) / d * (it.e1 - it.e0) : it.e0;
}

// para cada píxel del recuadro: a qué punto del recorrido (longitud) pertenece = el del centro de trazo más cercano
function nearestLen(it, rx, ry, rw, rh, R) {
  const q = it.q, n = q.S.length;
  const D = new Float32Array(rw * rh).fill(1e12), U = new Float32Array(rw * rh).fill(q.len);
  const R2 = R * R;
  for (let i = 0; i < n; i++) {
    const cx = q.X[i] - rx, cy = q.Y[i] - ry, s = q.S[i];
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(rw - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(rh - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, row = y * rw;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, d = dx * dx + dy * dy;
        if (d < R2 && d < D[row + x]) { D[row + x] = d; U[row + x] = s; }
      }
    }
  }
  return { U, D };
}

// lienzo de pigmento -> RGBA de un recuadro (sin cerrar el lienzo: se sigue pintando encima)
function finalizeRect(cv, rx, ry, rw, rh, out) {
  const Wb = cv.W, Ab = cv.A, CW = cv.w;
  if (!Wb) { out.fill(0); return out; }
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const k = (ry + y) * CW + rx + x, i = k * 3, o = (y * rw + x) * 4;
      const r = Wb[i], g = Wb[i + 1], b = Wb[i + 2];
      let a = Ab[k];
      const need = 1 - Math.min(r, g, b);
      if (need > a) a = need;
      if (a < 0.004) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
      out[o] = (1 - (1 - r) / a) * 255; out[o + 1] = (1 - (1 - g) / a) * 255; out[o + 2] = (1 - (1 - b) / a) * 255; out[o + 3] = a * 255;
    }
  }
  return out;
}

// ------------------------------------------------------------------ fotogramas
// o: { nw, ne, erase: 'inicio' | 'atras' }
// Devuelve { x0, y0, w, h, count, frames() }: frames() es un generador que va dando
// { index, data (RGBA, se reutiliza: hay que guardarlo antes de pedir el siguiente), same (igual que el anterior) }
function build(strokes0, p, o) {
  const strokes = order(strokes0);
  const bb = WR.bounds(strokes);
  if (!bb) return null;
  const nw = Math.max(2, o.nw | 0), ne = o.erase === 'atras' ? 0 : Math.max(2, o.ne | 0);
  const x0 = Math.floor(bb.left) - 2, y0 = Math.floor(bb.top) - 2;
  let w = Math.ceil(bb.right) + 2 - x0, h = Math.ceil(bb.bottom) + 2 - y0;
  w += w & 1; h += h & 1;
  const tl = timeline(strokes);
  function* frames() {
    const cv = RD.makeCanvas(x0, y0, w, h);
    const F = new Uint8ClampedArray(w * h * 4), Gb = new Uint8ClampedArray(w * h * 4);
    const Emax = ne ? new Float32Array(w * h).fill(-1) : null;
    let k = 0, dirty = true;
    const emit = function* (buf, changed) { yield { index: k, data: buf, same: !changed && k > 0 }; k++; };
    yield* emit(F, true);            // 0: papel vacío
    dirty = false;
    for (const it of tl.items) {
      const s = it.s;
      while (k <= nw && k / nw <= it.t0) { yield* emit(F, dirty); dirty = false; }
      const rx = Math.max(0, Math.floor(s.box.left) - 2 - x0), ry = Math.max(0, Math.floor(s.box.top) - 2 - y0);
      const rw = Math.min(w, Math.ceil(s.box.right) + 2 - x0) - rx, rh = Math.min(h, Math.ceil(s.box.bottom) + 2 - y0) - ry;
      if (rw <= 0 || rh <= 0) continue;
      WR.paint(cv, [s], p);
      const after = finalizeRect(cv, rx, ry, rw, rh, new Uint8ClampedArray(rw * rh * 4));
      const need = Emax || (k <= nw && k / nw < it.t1);
      const NL = need ? nearestLen(it, x0 + rx, y0 + ry, rw, rh, Math.max(4, s.r * (s.mask ? 3 : 2.5) + 3)) : null, U = NL && NL.U, core = s.r * s.r;
      // fotogramas a mitad de este trazo: lo de antes + el trazo hasta donde va la punta
      while (k <= nw && k / nw < it.t1) {
        const L = lenAt(it, k / nw);
        Gb.set(F);
        for (let y = 0; y < rh; y++) {
          for (let x = 0; x < rw; x++) {
            const j = y * rw + x;
            const m = (L - U[j]) / 1.6 + 0.5;
            if (m <= 0) continue;
            const a = j * 4, d = ((ry + y) * w + rx + x) * 4;
            if (m >= 1) { Gb[d] = after[a]; Gb[d + 1] = after[a + 1]; Gb[d + 2] = after[a + 2]; Gb[d + 3] = after[a + 3]; continue; }
            const a0 = Gb[d + 3] * (1 - m), a1 = after[a + 3] * m, at = a0 + a1;
            if (at <= 0) continue;
            Gb[d] = (Gb[d] * a0 + after[a] * a1) / at; Gb[d + 1] = (Gb[d + 1] * a0 + after[a + 1] * a1) / at; Gb[d + 2] = (Gb[d + 2] * a0 + after[a + 2] * a1) / at;
            Gb[d + 3] = at;
          }
        }
        yield* emit(Gb, true);
        dirty = true;
      }
      // el trazo queda hecho
      for (let y = 0; y < rh; y++) {
        const d0 = ((ry + y) * w + rx) * 4, a0 = y * rw * 4;
        if (Emax) {
          for (let x = 0; x < rw; x++) {
            const a = a0 + x * 4, d = d0 + x * 4;
            if (NL.D[y * rw + x] < core || after[a + 3] !== F[d + 3] || after[a] !== F[d] || after[a + 1] !== F[d + 1] || after[a + 2] !== F[d + 2]) {
              const te = eraseAtLen(it, U[y * rw + x]), e = (ry + y) * w + rx + x;
              if (te > Emax[e]) Emax[e] = te;
            }
          }
        }
        F.set(after.subarray(a0, a0 + rw * 4), d0);
      }
      dirty = true;
    }
    while (k <= nw) { yield* emit(F, dirty); dirty = false; }
    // borrado por donde empezó: cada punto se va cuando «pasa» por él el último trazo que lo pintó
    for (let j = 1; j <= ne; j++) {
      const te = j / ne, soft = Math.max(1e-5, tl.softT);
      if (j === ne) Gb.fill(0);
      else {
        Gb.set(F);
        for (let e = 0; e < w * h; e++) {
          const a = Gb[e * 4 + 3];
          if (!a) continue;
          const m = (Emax[e] - te) / soft + 0.5;
          if (m < 1) Gb[e * 4 + 3] = m <= 0 ? 0 : a * m;
        }
      }
      yield* emit(Gb, true);
    }
  }
  return { x0, y0, w, h, count: nw + 1 + ne, nw, ne, frames, strokes: strokes.length };
}

module.exports = { build, order, timeline, lenAt };
