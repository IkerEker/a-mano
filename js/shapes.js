'use strict';
// Formas de A mano: se crean como capas de forma (vectoriales) que el usuario gira, voltea o deforma con
// las herramientas de Photoshop; luego se leen tal como hayan quedado y deciden dónde va el texto.
//  - envolventes (4 lados: rectángulo, arco, bandera, abanico): el texto se curva con la forma
//    (parche de Coons: cada punto del texto va a su sitio dentro de la forma deformada)
//  - siluetas (círculo, desde la selección, cualquier otra forma): el texto se reparte en líneas que caben
// El trazado se genera con un orden de anclas conocido (empieza arriba a la izquierda y va en el sentido
// de las agujas del reloj), así se sabe qué lado es «arriba» aunque la forma se gire o se deforme.
// Sin dependencias de Photoshop.

const G = require('./geom.js');

const SHAPES = {
  rect: { label: 'Rectángulo', kind: 'env' },
  arco: { label: 'Arco', kind: 'env' },
  bandera: { label: 'Bandera', kind: 'env' },
  abanico: { label: 'Abanico', kind: 'env' },
  circulo: { label: 'Círculo', kind: 'sil' },
  lazo: { label: 'Selección', kind: 'sil' }
};
const SHAPE_PREFIX = '◇ ';
const nameFor = type => SHAPE_PREFIX + 'Forma · ' + (SHAPES[type] ? SHAPES[type].label : 'Libre');
function typeFromName(name) {
  const m = /Forma · (.+)$/.exec(String(name || ''));
  if (!m) return null;
  for (const k of Object.keys(SHAPES)) if (SHAPES[k].label === m[1].trim()) return k;
  return null;
}

// ------------------------------------------------------------------ generar
// Cada lado se muestrea como polilínea y se convierte en Bézier (Catmull-Rom -> cúbica) con anclas suaves
// dentro del lado y esquinas en los extremos.
function sideCurve(f, n) { const p = []; for (let i = 0; i <= n; i++) p.push(f(i / n)); return p; }

function anchorsFromSides(sides) {
  // sides: 4 polilíneas [[x,y]...] encadenadas (fin de una = inicio de la siguiente)
  const anchors = [];
  for (const side of sides) {
    const n = side.length;
    for (let i = 0; i < n - 1; i++) {
      const p = side[i];
      const prev = side[Math.max(0, i - 1)], next = side[i + 1];
      // tangente Catmull-Rom (en las esquinas: solo hacia dentro del lado)
      let fx, fy, bx, by;
      const nx = side[Math.min(n - 1, i + 1)];
      const tx = (nx[0] - prev[0]) / 2, ty = (nx[1] - prev[1]) / 2;
      if (i === 0) { fx = p[0] + (next[0] - p[0]) / 3; fy = p[1] + (next[1] - p[1]) / 3; bx = null; by = null; }
      else { fx = p[0] + tx / 3; fy = p[1] + ty / 3; bx = p[0] - tx / 3; by = p[1] - ty / 3; }
      anchors.push({ a: p, f: [fx, fy], b: bx == null ? null : [bx, by], corner: i === 0 });
    }
  }
  // en cada esquina la manilla de entrada viene del lado anterior
  const m = anchors.length;
  for (let k = 0; k < m; k++) {
    const A = anchors[k];
    if (A.b) continue;
    const P = anchors[(k - 1 + m) % m];
    // último tramo del lado anterior: de P a A
    A.b = [A.a[0] + (P.a[0] - A.a[0]) / 3, A.a[1] + (P.a[1] - A.a[1]) / 3];
    // si el lado anterior es curvo, la manilla sigue la curva
    if (!P.corner) { const tx = (A.a[0] - P.a[0]), ty = (A.a[1] - P.a[1]); A.b = [A.a[0] - tx / 3, A.a[1] - ty / 3]; }
  }
  return anchors;
}

// box: {left, top, right, bottom} en px del documento
function makeShape(type, box) {
  const x0 = box.left, y0 = box.top, x1 = box.right, y1 = box.bottom, W = x1 - x0, H = y1 - y0;
  const lerp = (a, b, t) => a + (b - a) * t;
  let sides;
  if (type === 'rect') {
    sides = [sideCurve(t => [lerp(x0, x1, t), y0], 3), sideCurve(t => [x1, lerp(y0, y1, t)], 2), sideCurve(t => [lerp(x1, x0, t), y1], 3), sideCurve(t => [x0, lerp(y1, y0, t)], 2)];
  } else if (type === 'arco') {
    // arcos concéntricos (como el estilo «Arco» de Photoshop, pero de verdad concéntricos)
    const phi = 0.42, cx = (x0 + x1) / 2;
    const Ro = (W / 2) / Math.sin(phi);
    const th = H * 0.62;                    // grosor de la banda
    const cy = y0 + Ro;                     // centro del círculo (por debajo)
    const Ri = Ro - th;
    const P = (R, a) => [cx + R * Math.sin(a), cy - R * Math.cos(a)];
    const yShift = (y1 - (cy - Ri * Math.cos(phi))) * 0; // la caja manda arriba
    sides = [sideCurve(t => P(Ro, lerp(-phi, phi, t)), 8), sideCurve(t => P(lerp(Ro, Ri, t), phi), 2), sideCurve(t => P(Ri, lerp(phi, -phi, t)), 8), sideCurve(t => P(lerp(Ri, Ro, t), -phi), 2)];
    void yShift;
  } else if (type === 'bandera') {
    const amp = H * 0.14;
    const wv = t => Math.sin(t * Math.PI * 2) * amp;
    sides = [sideCurve(t => [lerp(x0, x1, t), y0 + amp + wv(t)], 10), sideCurve(t => [x1, lerp(y0 + amp, y1 - amp, t)], 2), sideCurve(t => [lerp(x1, x0, t), y1 - amp + wv(1 - t)], 10), sideCurve(t => [x0, lerp(y1 - amp, y0 + amp, t)], 2)];
  } else if (type === 'abanico') {
    const phi = 0.95, cx = (x0 + x1) / 2;
    const Ro = (W / 2) / Math.sin(phi);
    const cy = y0 + Ro;
    const Ri = Ro * 0.5;
    const P = (R, a) => [cx + R * Math.sin(a), cy - R * Math.cos(a)];
    sides = [sideCurve(t => P(Ro, lerp(-phi, phi, t)), 12), sideCurve(t => P(lerp(Ro, Ri, t), phi), 2), sideCurve(t => P(Ri, lerp(phi, -phi, t)), 10), sideCurve(t => P(lerp(Ri, Ro, t), -phi), 2)];
  } else {
    // círculo / óvalo: 4 anclas, la primera arriba
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = W / 2, ry = H / 2, k = 0.5523;
    const pts = [[cx, y0], [x1, cy], [cx, y1], [x0, cy]];
    const anchors = [
      { a: pts[0], f: [cx + rx * k, y0], b: [cx - rx * k, y0] },
      { a: pts[1], f: [x1, cy + ry * k], b: [x1, cy - ry * k] },
      { a: pts[2], f: [cx - rx * k, y1], b: [cx + rx * k, y1] },
      { a: pts[3], f: [x0, cy - ry * k], b: [x0, cy + ry * k] }
    ];
    return { type: 'circulo', anchors };
  }
  return { type, anchors: anchorsFromSides(sides) };
}

// caja por defecto para cada forma (si no hay selección): centrada, proporción propia
function defaultBox(type, docW, docH, sel) {
  const ar = { rect: 2.2, arco: 2.4, bandera: 2.6, abanico: 1.9, circulo: 1 }[type] || 2;
  let W, H;
  if (sel) { W = sel.right - sel.left; H = sel.bottom - sel.top; return { left: sel.left, top: sel.top, right: sel.right, bottom: sel.bottom, W, H }; }
  W = docW * 0.7; H = W / ar;
  if (H > docH * 0.7) { H = docH * 0.7; W = H * ar; }
  const cx = docW / 2, cy = docH / 2;
  return { left: cx - W / 2, top: cy - H / 2, right: cx + W / 2, bottom: cy + H / 2 };
}

// anclas -> pathContents de Photoshop (unidad: 'px' o 'pt')
function toPathContents(anchors, res, unit) {
  const k = unit === 'pt' ? 72 / (res || 72) : 1;
  const u = unit === 'pt' ? 'distanceUnit' : 'pixelsUnit';
  const P = p => ({ _obj: 'paint', horizontal: { _unit: u, _value: p[0] * k }, vertical: { _unit: u, _value: p[1] * k } });
  return {
    _obj: 'pathClass',
    pathComponents: [{
      _obj: 'pathComponent', shapeOperation: { _enum: 'shapeOperation', _value: 'add' },
      subpathListKey: [{ _obj: 'subpathsList', closedSubpath: true, points: anchors.map(A => ({ _obj: 'pathPoint', anchor: P(A.a), forward: P(A.f), backward: P(A.b), smooth: !A.corner })) }]
    }]
  };
}
function anchorsBBox(anchors) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const A of anchors) for (const p of [A.a, A.f, A.b]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

// ------------------------------------------------------------------ leer
// comps: G.readPathContents(...) de la máscara vectorial. type: el de la capa (o null si es una forma ajena)
// Devuelve { kind: 'env', quad, map(u,v) } o { kind: 'sil', poly, up:[x,y] }
function readShape(comps, type) {
  if (!comps || !comps.length) return null;
  // contorno principal: el subtrazado cerrado de mayor área
  let best = null, bestA = 0;
  for (const c of comps) {
    if (/subtract/i.test(c.op)) continue;
    for (const s0 of c.subpaths) {
      const s = G.cleanSubpath(s0);
      if (s.pts.length < 2) continue;
      const poly = G.flattenSegs(G.segmentsOf(Object.assign({}, s, { closed: true })), 0.5);
      const A = Math.abs(G.polyArea(poly));
      if (A > bestA) { bestA = A; best = { sub: s, poly }; }
    }
  }
  if (!best) return null;
  const kind = type && SHAPES[type] ? SHAPES[type].kind : null;
  if (kind === 'sil' || (!kind && G.cornerIndices(best.sub, 28).length !== 4)) {
    // silueta: «arriba» del círculo = hacia su primera ancla; de una selección o forma libre, arriba de la pantalla
    let up = [0, -1];
    if (type === 'circulo') {
      let cx = 0, cy = 0; const n = best.poly.length / 2;
      for (let i = 0; i < n; i++) { cx += best.poly[2 * i]; cy += best.poly[2 * i + 1]; }
      cx /= n; cy /= n;
      const a = best.sub.pts[0].a; const d = Math.hypot(a[0] - cx, a[1] - cy) || 1;
      up = [(a[0] - cx) / d, (a[1] - cy) / d];
      // un círculo casi derecho se deja derecho
      if (up[1] < -0.985) up = [0, -1];
    }
    // otras capas de la forma (huecos) cuentan para el reparto
    const holes = [];
    for (const c of comps) if (/subtract/i.test(c.op)) for (const s of c.subpaths) holes.push(G.flattenSegs(G.segmentsOf(Object.assign({}, G.cleanSubpath(s), { closed: true })), 0.5));
    return { kind: 'sil', poly: best.poly, holes, up };
  }
  // envolvente: las 4 esquinas en el orden del trazado
  const quad = quadFromSub(best.sub, kind === 'env');
  if (!quad) {
    const an = G.analyzeShape(comps, {});
    if (an && an.kind === 'quad') return { kind: 'env', quad: an.quad, map: G.coons(an.quad), W: an.quad.W, H: an.quad.H };
    return { kind: 'sil', poly: best.poly, holes: [], up: [0, -1] };
  }
  return { kind: 'env', quad, map: G.coons(quad), W: quad.W, H: quad.H };
}

function quadFromSub(sub, ours) {
  const n = sub.pts.length;
  let cidx = G.cornerIndices(sub, 28);
  if (cidx.length !== 4) {
    // con la deformación algunas esquinas se suavizan: las 4 más marcadas
    const cand = G.cornerIndices(sub, 12);
    if (cand.length < 4) return null;
    const T = tangentsTurn(sub);
    cidx = cand.sort((a, b) => T[b] - T[a]).slice(0, 4).sort((a, b) => a - b);
  }
  // la primera ancla (arriba a la izquierda al crearla) manda, si es una esquina
  let k0 = 0;
  if (ours) { let bestD = Infinity; cidx.forEach((c, k) => { const d = Math.min(c, n - c); if (d < bestD) { bestD = d; k0 = k; } }); }
  const C = [0, 1, 2, 3].map(k => cidx[(k0 + k) % 4]);
  const side = (a, b) => G.flattenSegs(sideSegmentsSafe(sub, a, b), 0.4);
  const S = [side(C[0], C[1]), side(C[1], C[2]), side(C[2], C[3]), side(C[3], C[0])];
  const rev = G.reversePoly || (p => { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); return q; });
  let top = S[0], right = S[1], bottom = rev(S[2]), left = rev(S[3]);
  if (!ours) {
    // forma ajena: que «arriba» sea el lado más alto en pantalla
    const an = null; void an;
  }
  const P0 = p => [p[0], p[1]], P1 = p => [p[p.length - 2], p[p.length - 1]];
  let q = { TL: P0(top), TR: P1(top), BL: P0(bottom), BR: P1(bottom), top, bottom, left, right };
  // ¿espejo? (al voltear la forma): no se escriben letras en espejo
  const area = signedArea([q.TL, q.TR, q.BR, q.BL]);
  if (area < 0) {
    const upV = [(q.TL[0] + q.TR[0] - q.BL[0] - q.BR[0]) / 2, (q.TL[1] + q.TR[1] - q.BL[1] - q.BR[1]) / 2];
    // a) cambiar izquierda y derecha (el «arriba» se queda)  b) cambiar arriba y abajo (el «arriba» se invierte)
    const keepUp = -upV[1]; // cuánto apunta «arriba» hacia arriba en pantalla
    if (keepUp >= 0) {
      q = { TL: P1(top), TR: P0(top), BL: P1(bottom), BR: P0(bottom), top: rev(top), bottom: rev(bottom), left: right, right: left };
    } else {
      q = { TL: P0(bottom), TR: P1(bottom), BL: P0(top), BR: P1(top), top: bottom, bottom: top, left: rev(left), right: rev(right) };
    }
  }
  q.W = (G.polyLen(q.top) + G.polyLen(q.bottom)) / 2;
  q.H = (G.polyLen(q.left) + G.polyLen(q.right)) / 2;
  return q;
}
function signedArea(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function tangentsTurn(sub) {
  const P = sub.pts, n = P.length, out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const A = P[i], prev = P[(i - 1 + n) % n], next = P[(i + 1) % n];
    const tin = norm2(sub2(A.a, near2(A.b, A.a) ? prev.a : A.b)), tout = norm2(sub2(near2(A.f, A.a) ? next.a : A.f, A.a));
    out[i] = tin && tout ? 1 - (tin[0] * tout[0] + tin[1] * tout[1]) : 0;
  }
  return out;
}
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const norm2 = v => { const l = Math.hypot(v[0], v[1]); return l > 1e-9 ? [v[0] / l, v[1] / l] : null; };
const near2 = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 1e-4;
function sideSegmentsSafe(sub, i0, i1) {
  const P = sub.pts, n = P.length, segs = [];
  let i = i0, guard = 0;
  do {
    const A = P[i], B = P[(i + 1) % n];
    segs.push([A.a[0], A.a[1], A.f[0], A.f[1], B.b[0], B.b[1], B.a[0], B.a[1]]);
    i = (i + 1) % n;
  } while (i !== i1 && ++guard < n + 2);
  return segs;
}

// ------------------------------------------------------------------ siluetas: huecos por línea
// intervalos [x0,x1] donde el polígono (en el marco de la forma) cubre la franja [ya, yb]
function intervalsAt(polys, holes, y) {
  const xs = [];
  const add = p => {
    const n = p.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * ((i + 1) % n)], by = p[2 * ((i + 1) % n) + 1];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
    }
  };
  for (const p of polys) add(p);
  for (const p of holes || []) add(p);
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
function bandIntervals(polys, holes, ya, yb, samples) {
  let cur = null;
  const ns = samples || 5;
  for (let k = 0; k < ns; k++) {
    const y = ya + (yb - ya) * k / (ns - 1);
    const iv = intervalsAt(polys, holes, y);
    if (!cur) { cur = iv; continue; }
    const nx = [];
    for (const a of cur) for (const b of iv) { const l = Math.max(a[0], b[0]), r = Math.min(a[1], b[1]); if (r > l) nx.push([l, r]); }
    cur = nx;
  }
  return cur || [];
}

module.exports = { SHAPES, SHAPE_PREFIX, nameFor, typeFromName, makeShape, defaultBox, toPathContents, anchorsBBox, readShape, intervalsAt, bandIntervals, signedArea };
