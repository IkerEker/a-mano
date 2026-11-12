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

// EL TEMPO. Lo que se sabe de la escritura a mano (cinemática):
//  · se escribe a golpes: cada golpe (un tramo entre dos frenadas: una subida, una bajada, una vuelta) tiene un
//    perfil de velocidad en campana y dura más o menos lo mismo, unas 5 por segundo;
//  · isocronía: un golpe más largo se hace más deprisa, así que tarda casi lo mismo que uno corto (por eso una
//    letra grande y una pequeña llevan el mismo compás);
//  · homotecia: las proporciones de tiempo entre letras se mantienen al escribir más rápido o más lento;
//  · levantar el boli dentro de una palabra cuesta más o menos un golpe; entre palabras, algo más.
// Así que aquí el tiempo NO sale de la distancia recorrida: sale de contar golpes. La unidad es un golpe (τ = 1).
const BEAT = { exp: 0.3, base: 0.5, pass: 0.42, mask: 0.3, under: 0.8 };

// corta el recorrido en golpes: donde la mano cambia de sentido en vertical o dobla una esquina
function beats(q, minLen) {
  const n = q.S.length, cuts = [0];
  if (n < 3) return [0, n - 1];
  const step = q.len / Math.max(1, n - 1), w = Math.max(1, Math.round(minLen * 0.35 / Math.max(1e-6, step)));
  let lastS = 0, prevSign = 0;
  for (let i = w; i < n - w; i++) {
    const ax = q.X[i] - q.X[i - w], ay = q.Y[i] - q.Y[i - w], bx = q.X[i + w] - q.X[i], by = q.Y[i + w] - q.Y[i];
    const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by);
    if (al < 1e-6 || bl < 1e-6) continue;
    const turn = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (al * bl))));
    const sa = Math.abs(ay) > 0.25 * al ? Math.sign(ay) : 0, sb = Math.abs(by) > 0.25 * bl ? Math.sign(by) : 0;
    if (sa) prevSign = sa;
    const flip = sb && prevSign && sb !== prevSign;
    if ((flip || turn > 1.15) && q.S[i] - lastS >= minLen && q.len - q.S[i] >= minLen) {
      // el corte va en el punto de más giro de la zona
      cuts.push(i); lastS = q.S[i]; if (sb) prevSign = sb;
    }
  }
  cuts.push(n - 1);
  return cuts;
}
// campana: fracción de recorrido hecha a la fracción u del tiempo del golpe (no llega a pararse en los empalmes)
function bell(u, b) { return (b * u + (1 - b) * (1 - Math.cos(Math.PI * u)) / Math.PI) / (b + 2 * (1 - b) / Math.PI); }
function bellInv(f, b) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (bell(m, b) < f) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

function timeline(strokes) {
  const hs = [];
  const items = strokes.map(s => {
    const q = resample(s.pts, Math.max(1, Math.min(4, s.r * 0.5)));
    if (!s.mask && !s.under && q.len > 0) { let a = Infinity, b = -Infinity; for (let i = 0; i < q.Y.length; i++) { if (q.Y[i] < a) a = q.Y[i]; if (q.Y[i] > b) b = q.Y[i]; } hs.push(Math.max(b - a, q.len * 0.3)); }
    return { s, q };
  });
  hs.sort((a, b) => a - b);
  const ell0 = Math.max(6, hs.length ? hs[hs.length >> 1] : 40);   // alto típico de un trazo de letra
  // golpes de cada trazo y su tamaño típico
  const bl = [];
  for (const it of items) {
    it.cuts = beats(it.q, ell0 * 0.3);
    if (!it.s.mask && !it.s.under) for (let k = 1; k < it.cuts.length; k++) bl.push(it.q.S[it.cuts[k]] - it.q.S[it.cuts[k - 1]]);
  }
  bl.sort((a, b) => a - b);
  const ell = Math.max(4, bl.length ? bl[bl.length >> 1] : ell0);
  let t = 0, prev = null, drawT = 0, drawL = 0;
  for (const it of items) {
    const { q, s } = it, n = q.S.length;
    const k0 = s.mask ? BEAT.mask : (s.pass ? BEAT.pass : 1) * (s.under ? BEAT.under : 1);
    // pausa (en golpes): seguir el mismo gesto, levantar dentro de la letra, pasar a otra letra, a otra palabra
    let pause = 0;
    if (prev) {
      const pq = prev.q, d = Math.hypot(q.X[0] - pq.X[pq.X.length - 1], q.Y[0] - pq.Y[pq.Y.length - 1]);
      const air = Math.sqrt(Math.min(9, d / ell0));
      if (s.mask && prev.s.mask) pause = 0.1 + 0.08 * air;
      else if ((prev.s.word || 0) !== (s.word || 0) || !!s.mask !== !!prev.s.mask) pause = 1.05 + 0.3 * air;
      else if (d < Math.max(s.r, prev.s.r) * 1.3) pause = 0;
      else if (prev.s.letter === s.letter && !s.pass === !prev.s.pass) pause = 0.4 + 0.25 * air;
      else pause = 0.55 + 0.28 * air;
      if (s.pass || s.mask) pause *= 0.7;
    }
    t += pause;
    it.t0 = t;
    const T = new Float32Array(n);
    let tb = 0;
    for (let k = 1; k < it.cuts.length; k++) {
      const i0 = it.cuts[k - 1], i1 = it.cuts[k], L = q.S[i1] - q.S[i0];
      if (L <= 0) { for (let i = i0; i <= i1; i++) T[i] = tb; continue; }
      const dur = k0 * Math.max(0.4, Math.min(2.4, Math.pow(L / ell, BEAT.exp)));
      for (let i = i0 + 1; i <= i1; i++) T[i] = tb + dur * bellInv((q.S[i] - q.S[i0]) / L, BEAT.base);
      tb += dur;
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

// LA PUNTA. Para cada píxel del recuadro: en qué punto del recorrido lo toca la punta de la herramienta.
// La punta es un disco del ancho del trazo que avanza por el centro: toca antes lo que tiene delante en el eje y
// algo después lo de los lados, así que el frente es redondo (no un corte recto). Un grano fijo al papel
// descoloca ese frente: el borde de la punta queda irregular, con la textura de la herramienta.
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
function arrival(it, rx, ry, rw, rh, rr, R, rough) {
  const q = it.q, n = q.S.length, N = rw * rh;
  const D = new Float32Array(N).fill(1e12), A = new Float32Array(N).fill(1e12), Un = new Float32Array(N).fill(q.len);
  const R2 = R * R, r2 = rr * rr;
  for (let i = 0; i < n; i++) {
    const cx = q.X[i] - rx, cy = q.Y[i] - ry, s = q.S[i];
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(rw - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(rh - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, row = y * rw;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, d = dx * dx + dy * dy;
        if (d >= R2) continue;
        const j = row + x;
        if (d < D[j]) { D[j] = d; Un[j] = s; }
        if (d < r2) { const a = s + rr - Math.sqrt(r2 - d); if (a < A[j]) A[j] = a; }
      }
    }
  }
  const sc = 1 / Math.max(1.5, rr * 0.55);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const j = y * rw + x;
      if (A[j] > 1e11) A[j] = Un[j] + rr;          // tinta que se sale del ancho del trazo: llega con el borde de la punta
      const gx = rx + x, gy = ry + y;
      A[j] += rr * rough * ((vnoise(gx * sc, gy * sc) - 0.5) * 1.1 + (hash2(gx, gy) - 0.5) * 0.5);
    }
  }
  return { A, D };
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
      const rr = s.r * 1.12 + 0.75, PP = s.P || {}, mult = PP.blend !== 'over';
      const rough = Math.min(0.85, 0.3 + 0.5 * (PP.grain || 0) + 0.35 * (PP.dry || 0));
      const NL = need ? arrival(it, x0 + rx, y0 + ry, rw, rh, rr, Math.max(4, s.r * (s.mask ? 3 : 2.5) + 3), rough) : null, U = NL && NL.A, core = s.r * s.r;
      const full = it.q.len + rr;
      // fotogramas a mitad de este trazo: lo de antes + el trazo hasta donde va la punta
      while (k <= nw && k / nw < it.t1) {
        // (la punta llega hasta el final del trazo, remate incluido, justo cuando el trazo acaba)
        const L0 = lenAt(it, k / nw), L = L0 * full / Math.max(1e-6, it.q.len), fresh = mult && !s.mask ? 0.22 : 0, zone = rr * 1.7;
        Gb.set(F);
        for (let y = 0; y < rh; y++) {
          for (let x = 0; x < rw; x++) {
            const j = y * rw + x;
            const m = (L - U[j]) / 1.6 + 0.5;
            if (m <= 0) continue;
            const a = j * 4, d = ((ry + y) * w + rx + x) * 4;
            if (m >= 1) {
              Gb[d] = after[a]; Gb[d + 1] = after[a + 1]; Gb[d + 2] = after[a + 2];
              // donde se apoya la punta la tinta está recién puesta: un pelo más cargada
              const near = fresh ? 1 - (L - U[j]) / zone : 0;
              Gb[d + 3] = near > 0 ? Math.min(255, after[a + 3] * (1 + fresh * near)) : after[a + 3];
              continue;
            }
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
              const te = eraseAtLen(it, Math.max(0, Math.min(it.q.len, U[y * rw + x] * it.q.len / full))), e = (ry + y) * w + rx + x;
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
