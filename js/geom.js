'use strict';
// Geometría vectorial: trazados de Photoshop, curvas Bézier, esquinas, perspectiva y parche de Coons.
// Sin dependencias de Photoshop.

// ------------------------------------------------------------------ unidades y lectura de trazados
function unitPx(v, res) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const x = typeof v._value === 'number' ? v._value : 0;
  const u = v._unit;
  if (u === 'distanceUnit' || u === 'pointsUnit') return x * res / 72;
  if (u === 'millimetersUnit') return x / 25.4 * res;
  if (u === 'inchesUnit') return x * res;
  return x;
}
function pt(p, res) {
  if (!p) return null;
  if (Array.isArray(p)) return [p[0], p[1]];
  return [unitPx(p.horizontal, res), unitPx(p.vertical, res)];
}

// pathContents de Photoshop -> [{op, subpaths:[{closed, pts:[{a,f,b}]}]}] (px del documento)
function readPathContents(pc, res) {
  const out = [];
  const comps = (pc && (pc.pathComponents || pc.pathComponent)) || [];
  for (const c of comps) {
    const op = (c.shapeOperation && c.shapeOperation._value) || 'add';
    const subs = [];
    for (const s of (c.subpathListKey || [])) {
      const pts = [];
      for (const p of (s.points || [])) {
        const a = pt(p.anchor, res);
        if (!a) continue;
        const f = pt(p.forward, res) || a.slice(), b = pt(p.backward, res) || a.slice();
        pts.push({ a, f, b, smooth: !!p.smooth });
      }
      if (pts.length) subs.push({ closed: s.closedSubpath !== false, pts });
    }
    if (subs.length) out.push({ op, subpaths: subs });
  }
  return out;
}

// Escala todas las coordenadas (para corregir unidades si hace falta)
function scaleComponents(comps, k, ox, oy) {
  const S = p => [ox + (p[0] - ox) * k, oy + (p[1] - oy) * k];
  for (const c of comps) for (const s of c.subpaths) for (const p of s.pts) { p.a = S(p.a); p.f = S(p.f); p.b = S(p.b); }
}

// subpath -> lista de segmentos cúbicos [x0,y0,x1,y1,x2,y2,x3,y3]
function segmentsOf(sub) {
  const P = sub.pts, n = P.length, segs = [];
  const last = sub.closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const A = P[i], B = P[(i + 1) % n];
    segs.push([A.a[0], A.a[1], A.f[0], A.f[1], B.b[0], B.b[1], B.a[0], B.a[1]]);
  }
  return segs;
}

function isLine(s) {
  const eps = 1e-6;
  return Math.abs(s[2] - s[0]) + Math.abs(s[3] - s[1]) < eps && Math.abs(s[4] - s[6]) + Math.abs(s[5] - s[7]) < eps;
}

// aplana un cúbico en puntos (sin el primero). tol en px
function flattenSeg(s, tol, out, maxLen) {
  if (isLine(s)) {
    if (maxLen) {
      const d = Math.hypot(s[6] - s[0], s[7] - s[1]), n = Math.max(1, Math.ceil(d / maxLen));
      for (let k = 1; k <= n; k++) out.push(s[0] + (s[6] - s[0]) * k / n, s[1] + (s[7] - s[1]) * k / n);
    } else out.push(s[6], s[7]);
    return;
  }
  const d = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
  let n = Math.max(2, Math.min(200, Math.ceil(Math.sqrt(d / Math.max(1e-6, tol)) * 1.1)));
  if (maxLen) n = Math.max(n, Math.ceil(d / maxLen));
  for (let k = 1; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push(u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6],
             u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]);
  }
}
function flattenSegs(segs, tol, maxLen) {
  if (!segs.length) return new Float64Array(0);
  const out = [segs[0][0], segs[0][1]];
  for (const s of segs) flattenSeg(s, tol, out, maxLen);
  return out;
}

function polyArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; a += p[i] * p[j + 1] - p[j] * p[i + 1]; }
  return a / 2;
}
function polyBBox(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (let i = 0; i < p.length; i += 2) {
    if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
    if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
  }
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

// ------------------------------------------------------------------ máscara a partir de componentes
const { Raster } = require('./raster.js');

function rasterPolys(polys, x0, y0, cell, w, h) {
  const r = new Raster(w, h);
  for (const p of polys) {
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { q[i] = (p[i] - x0) / cell; q[i + 1] = (p[i + 1] - y0) / cell; }
    r.poly(q);
  }
  return r.coverage();
}

// comps -> máscara {w,h,data,x0,y0,cellX,cellY}
function maskFromComponents(comps, maxCells) {
  const polysAll = [];
  const per = comps.map(c => {
    const polys = c.subpaths.filter(s => s.closed || s.pts.length > 2).map(s => flattenSegs(segmentsOf(Object.assign({}, s, { closed: true })), 0.5));
    for (const p of polys) polysAll.push(p);
    return { op: c.op, polys };
  });
  const bb = polyBBox(polysAll);
  const W = bb.right - bb.left, H = bb.bottom - bb.top;
  if (!(W > 1 && H > 1)) return null;
  const cell = Math.max(W, H) / (maxCells || 300);
  const w = Math.max(2, Math.ceil(W / cell) + 2), h = Math.max(2, Math.ceil(H / cell) + 2);
  const x0 = bb.left - cell, y0 = bb.top - cell;
  let acc = null;
  per.forEach((c, k) => {
    const cov = rasterPolys(c.polys, x0, y0, cell, w, h);
    if (!acc) { acc = cov; return; }
    const op = c.op;
    for (let i = 0; i < acc.length; i++) {
      const a = acc[i], b = cov[i];
      if (/subtract/i.test(op)) acc[i] = a * (1 - b);
      else if (/intersect/i.test(op)) acc[i] = Math.min(a, b);
      else if (/xor/i.test(op)) acc[i] = Math.abs(a - b);
      else acc[i] = Math.max(a, b);
    }
  });
  const data = new Uint8Array(w * h);
  let n = 0;
  for (let i = 0; i < data.length; i++) if (acc[i] >= 0.5) { data[i] = 1; n++; }
  if (!n) return null;
  return { w, h, data, x0, y0, cellX: cell, cellY: cell };
}

// ------------------------------------------------------------------ esquinas
function norm(v) { const l = Math.hypot(v[0], v[1]); return l > 1e-9 ? [v[0] / l, v[1] / l] : null; }
function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 1e-4;

// tangentes de entrada y salida en cada ancla de un subtrazado cerrado
function tangents(sub) {
  const P = sub.pts, n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const A = P[i], prev = P[(i - 1 + n) % n], next = P[(i + 1) % n];
    let tin = null, tout = null;
    if (!near(A.b, A.a)) tin = norm(sub2(A.a, A.b));
    else if (!near(prev.f, A.a)) tin = norm(sub2(A.a, prev.f));
    else tin = norm(sub2(A.a, prev.a));
    if (!near(A.f, A.a)) tout = norm(sub2(A.f, A.a));
    else if (!near(next.b, A.a)) tout = norm(sub2(next.b, A.a));
    else tout = norm(sub2(next.a, A.a));
    out.push({ tin, tout });
  }
  return out;
}

// índices de anclas que son esquinas (cambio de dirección > minDeg)
function cornerIndices(sub, minDeg) {
  const lim = Math.cos((minDeg || 28) * Math.PI / 180);
  const T = tangents(sub), idx = [];
  T.forEach((t, i) => {
    if (!t.tin || !t.tout) return;
    if (t.tin[0] * t.tout[0] + t.tin[1] * t.tout[1] < lim) idx.push(i);
  });
  return idx;
}

// quita anclas duplicadas (puntos superpuestos)
function cleanSubpath(sub) {
  const P = [];
  for (const p of sub.pts) {
    const last = P[P.length - 1];
    if (last && near(last.a, p.a)) { last.f = p.f; continue; }
    P.push({ a: p.a.slice(), f: p.f.slice(), b: p.b.slice(), smooth: p.smooth });
  }
  if (sub.closed && P.length > 1 && near(P[0].a, P[P.length - 1].a)) { P[0].b = P[P.length - 1].b; P.pop(); }
  return { closed: sub.closed, pts: P };
}

// cadena de segmentos entre dos esquinas (índices de ancla) de un subtrazado cerrado
function sideSegments(sub, i0, i1) {
  const P = sub.pts, n = P.length, segs = [];
  for (let i = i0; i !== i1; i = (i + 1) % n) {
    const A = P[i], B = P[(i + 1) % n];
    segs.push([A.a[0], A.a[1], A.f[0], A.f[1], B.b[0], B.b[1], B.a[0], B.a[1]]);
  }
  return segs;
}

function polyLen(p) { let L = 0; for (let i = 2; i < p.length; i += 2) L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return L; }
function reversePoly(p) { const q = new Array(p.length); for (let i = 0, n = p.length / 2; i < n; i++) { q[2 * i] = p[2 * (n - 1 - i)]; q[2 * i + 1] = p[2 * (n - 1 - i) + 1]; } return q; }
function straightness(p) {
  const x0 = p[0], y0 = p[1], x1 = p[p.length - 2], y1 = p[p.length - 1];
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let m = 0;
  for (let i = 0; i < p.length; i += 2) m = Math.max(m, Math.abs((p[i] - x0) * (y1 - y0) - (p[i + 1] - y0) * (x1 - x0)) / L);
  return m / L;
}

// ------------------------------------------------------------------ análisis de la forma
// Devuelve { kind: 'quad'|'free', quad?, mask, outer (polígono), corners }
function analyzeShape(comps, opts) {
  opts = opts || {};
  const mask = maskFromComponents(comps, opts.maxCells || 300);
  if (!mask) return null;
  // contorno exterior: el subtrazado cerrado de mayor área entre los que suman
  let best = null, bestA = 0;
  for (const c of comps) {
    if (/subtract/i.test(c.op)) continue;
    for (const s0 of c.subpaths) {
      const s = cleanSubpath(s0);
      if (s.pts.length < 2) continue;
      const poly = flattenSegs(segmentsOf(Object.assign({}, s, { closed: true })), 0.5);
      const A = Math.abs(polyArea(poly));
      if (A > bestA) { bestA = A; best = { sub: s, poly }; }
    }
  }
  const res = { kind: 'free', mask, outer: best ? best.poly : null, corners: 0 };
  if (!best) return res;
  const cidx = cornerIndices(best.sub, 28);
  res.corners = cidx.length;
  // una sola componente "sencilla" con 4 esquinas -> cuadrilátero (recto o curvo)
  const nAdd = comps.filter(c => !/subtract/i.test(c.op)).reduce((a, c) => a + c.subpaths.length, 0);
  if (cidx.length === 4 && nAdd === 1 && opts.allowQuad !== false) {
    const sides = [];
    for (let k = 0; k < 4; k++) sides.push(flattenSegs(sideSegments(best.sub, cidx[k], cidx[(k + 1) % 4]), 0.4));
    const q = orientQuad(sides, best.sub.pts.map(p => p.a), cidx, opts.forceHorizontal);
    if (q) { res.kind = 'quad'; res.quad = q; }
  }
  return res;
}

// Ordena el cuadrilátero: lados superior/inferior en el sentido de lectura
function orientQuad(sides, anchors, cidx, forceHorizontal) {
  // sentido horario en pantalla (y hacia abajo)
  const all = [];
  for (const s of sides) for (let i = 0; i < s.length - 2; i++) all.push(s[i]);
  let area = 0;
  {
    const P = [];
    for (const s of sides) for (let i = 0; i < s.length - 2; i += 2) P.push(s[i], s[i + 1]);
    area = polyArea(P);
  }
  let S = sides.map(s => s.slice());
  if (area < 0) { S = [reversePoly(S[3]), reversePoly(S[2]), reversePoly(S[1]), reversePoly(S[0])]; }
  const end = p => [p[p.length - 2], p[p.length - 1]];
  const start = p => [p[0], p[1]];
  const dir = p => norm(sub2(end(p), start(p))) || [1, 0];
  const L = S.map(polyLen);
  // pares opuestos: (0,2) y (1,3). En sentido horario, S0 y S2 van en direcciones opuestas.
  const pairs = [[0, 2], [1, 3]].map(([a, b]) => {
    const da = dir(S[a]), db = dir(S[b]);
    const d = norm([da[0] - db[0], da[1] - db[1]]) || da;
    return { a, b, d, len: (L[a] + L[b]) / 2 };
  });
  let pick;
  const r = pairs[0].len / Math.max(1e-6, pairs[1].len);
  if (!forceHorizontal && (r > 2.2 || r < 1 / 2.2)) pick = r > 1 ? pairs[0] : pairs[1];
  else pick = Math.abs(pairs[0].d[0]) >= Math.abs(pairs[1].d[0]) ? pairs[0] : pairs[1];
  let d = pick.d;
  if (Math.abs(d[0]) < 0.15) { if (d[1] > 0) d = [-d[0], -d[1]]; } // casi vertical: se lee de abajo arriba
  else if (d[0] < 0) d = [-d[0], -d[1]];
  const up = [d[1], -d[0]];
  const mid = p => { const a = start(p), b = end(p); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const proj = (p, v) => p[0] * v[0] + p[1] * v[1];
  let top = S[pick.a], bot = S[pick.b];
  if (proj(mid(bot), up) > proj(mid(top), up)) { const t = top; top = bot; bot = t; }
  if (proj(start(top), d) > proj(end(top), d)) top = reversePoly(top);
  if (proj(start(bot), d) > proj(end(bot), d)) bot = reversePoly(bot);
  const other = pick.a === 0 ? [S[1], S[3]] : [S[0], S[2]];
  const TL = start(top), TR = end(top), BL = start(bot), BR = end(bot);
  const closeTo = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  let left = null, right = null;
  for (let s of other) {
    const a = start(s), b = end(s);
    if (closeTo(a, TL) + closeTo(b, BL) < 1e-3 * (1 + L[0])) left = s;
    else if (closeTo(b, TL) + closeTo(a, BL) < 1e-3 * (1 + L[0])) left = reversePoly(s);
    else if (closeTo(a, TR) + closeTo(b, BR) < 1e-3 * (1 + L[0])) right = s;
    else if (closeTo(b, TR) + closeTo(a, BR) < 1e-3 * (1 + L[0])) right = reversePoly(s);
  }
  if (!left || !right) {
    // tolerancia mayor
    for (let s of other) {
      const a = start(s), b = end(s);
      const dl = Math.min(closeTo(a, TL) + closeTo(b, BL), closeTo(b, TL) + closeTo(a, BL));
      const dr = Math.min(closeTo(a, TR) + closeTo(b, BR), closeTo(b, TR) + closeTo(a, BR));
      if (dl < dr) left = closeTo(a, TL) < closeTo(b, TL) ? s : reversePoly(s);
      else right = closeTo(a, TR) < closeTo(b, TR) ? s : reversePoly(s);
    }
  }
  if (!left || !right) return null;
  const straight = [top, bot, left, right].every(p => straightness(p) < 0.018);
  const W = (polyLen(top) + polyLen(bot)) / 2, H = (polyLen(left) + polyLen(right)) / 2;
  return { TL, TR, BL, BR, top, bottom: bot, left, right, straight, W, H, dir: d };
}

// ------------------------------------------------------------------ mapas: homografía y Coons
// cuadrado unidad -> cuadrilátero (TL, TR, BR, BL)
function homography(TL, TR, BR, BL) {
  const [x0, y0] = TL, [x1, y1] = TR, [x2, y2] = BR, [x3, y3] = BL;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, c, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0; b = x3 - x0; c = x0; d = y1 - y0; e = y3 - y0; f = y0; g = 0; h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0;
    d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
  }
  return (s, t) => { const w = g * s + h * t + 1; return [(a * s + b * t + c) / w, (d * s + e * t + f) / w]; };
}

// polilínea parametrizada por longitud de arco normalizada
function arcParam(p) {
  const n = p.length / 2, acc = new Float64Array(n);
  for (let i = 1; i < n; i++) acc[i] = acc[i - 1] + Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]);
  const L = acc[n - 1] || 1;
  // fuera de [0, 1] se prolonga en línea recta por la tangente del extremo (antes se pegaba al borde y las
  // letras que se salían un poco quedaban aplastadas contra él, como cortadas)
  const ext = (s) => {
    const a = s < 0 ? 0 : n - 1, b = s < 0 ? Math.min(n - 1, 1) : Math.max(0, n - 2);
    let k = b; while (k > 0 && k < n - 1 && Math.hypot(p[2 * k] - p[2 * a], p[2 * k + 1] - p[2 * a + 1]) < L * 0.02) k += s < 0 ? 1 : -1;
    const d = Math.hypot(p[2 * a] - p[2 * k], p[2 * a + 1] - p[2 * k + 1]) || 1;
    const over = (s < 0 ? -s : s - 1) * L;
    return [p[2 * a] + (p[2 * a] - p[2 * k]) / d * over, p[2 * a + 1] + (p[2 * a + 1] - p[2 * k + 1]) / d * over];
  };
  return s => {
    if (n > 1 && (s < 0 || s > 1)) return ext(s);
    const target = Math.max(0, Math.min(1, s)) * L;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] < target) lo = m; else hi = m; }
    const t = (target - acc[lo]) / ((acc[hi] - acc[lo]) || 1);
    return [p[2 * lo] + (p[2 * hi] - p[2 * lo]) * t, p[2 * lo + 1] + (p[2 * hi + 1] - p[2 * lo + 1]) * t];
  };
}

function coons(q) {
  const T = arcParam(q.top), B = arcParam(q.bottom), Lf = arcParam(q.left), Rt = arcParam(q.right);
  const P00 = q.TL, P10 = q.TR, P01 = q.BL, P11 = q.BR;
  return (s, t) => {
    const c0 = T(s), c1 = B(s), d0 = Lf(t), d1 = Rt(t);
    const x = (1 - t) * c0[0] + t * c1[0] + (1 - s) * d0[0] + s * d1[0] - ((1 - s) * (1 - t) * P00[0] + s * (1 - t) * P10[0] + (1 - s) * t * P01[0] + s * t * P11[0]);
    const y = (1 - t) * c0[1] + t * c1[1] + (1 - s) * d0[1] + s * d1[1] - ((1 - s) * (1 - t) * P00[1] + s * (1 - t) * P10[1] + (1 - s) * t * P01[1] + s * t * P11[1]);
    return [x, y];
  };
}

module.exports = {
  unitPx, readPathContents, scaleComponents, segmentsOf, flattenSeg, flattenSegs, polyArea, polyBBox,
  maskFromComponents, rasterPolys, cornerIndices, cleanSubpath, analyzeShape, orientQuad, homography, coons, arcParam, polyLen
};
