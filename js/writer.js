'use strict';
// Escritura a mano (pestaña GENERAR): de letras colocadas a trazos pintados.
//  - variación por línea (línea base que ondula), por palabra (giro, tamaño, altura) y por letra
//    (giro, tamaño, inclinación, deformación suave), según la LEGIBILIDAD
//  - variación por trazo: no empiezan ni acaban exactamente donde deberían, los óvalos no siempre cierran,
//    algunos trazos verticales del pincel empiezan por abajo
//  - repasado: las palabras importantes se escriben varias veces encima, con pequeñas diferencias
//  - el camino del texto se deforma con la forma; el grosor de la herramienta no (como una mano de verdad)
// Sin dependencias de Photoshop.

const R = require('./rng.js');
const FN = require('./fonts.js');
const INK = require('./ink.js');
const RD = require('./render.js');

// p: { persona, mode, tool, preset, legib (0..1), locura (0..2), pulso (0..1), prisa (0..1), width (mult),
//      repasado (0..2), tinta (0..1), color }
function chaosOf(p) {
  const c = Math.max(0, Math.min(1, 1 - p.legib));
  return c * (p.locura == null ? 1 : p.locura);
}

// suavizado fuerte (letra muy poco legible: la mano simplifica)
function lowpass(pts, sigma) {
  if (sigma <= 0 || pts.length < 5) return pts;
  // sigma en las mismas unidades que pts; paso medio
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const st = L / (pts.length - 1) || 1;
  const k = Math.max(1, Math.round(sigma / st));
  const out = pts.map(q => q.slice());
  for (let i = 1; i < pts.length - 1; i++) {
    let sx = 0, sy = 0, sw = 0;
    for (let j = -k * 2; j <= k * 2; j++) {
      const q = pts[Math.max(0, Math.min(pts.length - 1, i + j))];
      const w = Math.exp(-(j * j) / (2 * k * k));
      sx += q[0] * w; sy += q[1] * w; sw += w;
    }
    out[i] = [sx / sw, sy / sw];
  }
  return out;
}

// longitud
function plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
// recorta o alarga los extremos (a, b: distancia en las unidades de pts; negativa = recorta)
// nunca recorta más de un tercio del trazo (una letra de un solo trazo, como la «a», no pierde el palo)
function trimEnds(p, a, b) {
  const L = plen(p);
  if (L < 1e-9) return p;
  a = Math.max(a, -L * 0.3); b = Math.max(b, -L * 0.3);
  let out = p;
  const cut = (arr, d) => { let acc = 0, k = arr.length - 1; while (k > 1 && acc < d) { acc += Math.hypot(arr[k][0] - arr[k - 1][0], arr[k][1] - arr[k - 1][1]); k--; } return arr.slice(0, k + 1); };
  const ext = (arr, d) => { const n = arr.length, A = arr[n - 1], B = arr[Math.max(0, n - 4)]; const dx = A[0] - B[0], dy = A[1] - B[1], l = Math.hypot(dx, dy) || 1; return arr.concat([[A[0] + dx / l * d * 0.5, A[1] + dy / l * d * 0.5], [A[0] + dx / l * d, A[1] + dy / l * d]]); };
  if (b < 0) out = cut(out, -b); else if (b > 0) out = ext(out, b);
  out = out.slice().reverse();
  if (a < 0) out = cut(out, -a); else if (a > 0) out = ext(out, a);
  return out.reverse();
}

// ------------------------------------------------------------------ plan: trazos en px del documento
// lay: layoutInShape(...). Devuelve [{ pts:[{x,y}], r, seed, P, box, alpha }]
function plan(lay, p, seed) {
  const P = INK.preset(p.tool, p.preset);
  const persona = FN.PERSONAS[p.persona] || FN.PERSONAS.adulta;
  const c = chaosOf(p);
  const g = R.gauss;
  const out = [];
  const isScript = p.mode === 'cursiva';
  const letters = lay.letters;
  const map = lay.map;
  // ---- por palabra y por línea
  const wordT = new Map();
  for (const L of letters) {
    if (wordT.has(L.word)) continue;
    const r = R.mulberry32(seed + L.word * 7919 + 3);
    wordT.set(L.word, { rot: g(r) * (0.006 + 0.05 * c), sc: Math.exp(g(r) * (0.015 + 0.06 * c)), dy: g(r) * (0.01 + 0.06 * c) * persona.bounce, dx: g(r) * 0.03 * c, slant: (p.prisa || 0) * 0.3 + g(r) * 0.05 * c });
  }
  // centro de cada palabra (en el espacio de maquetación)
  const wordC = new Map();
  for (const L of letters) {
    const box = L.g.box;
    const x0 = L.x + box.left * L.size * L.sx, x1 = L.x + box.right * L.size * L.sx;
    const w = wordC.get(L.word) || { x0: Infinity, x1: -Infinity, base: L.base, size: L.size };
    w.x0 = Math.min(w.x0, x0); w.x1 = Math.max(w.x1, x1);
    wordC.set(L.word, w);
  }
  const lineSeed = li => seed + 977 * (li + 1);
  // ---- letras -> trazos (en el espacio de maquetación)
  const cursiveLetters = [];
  letters.forEach((L, li) => {
    const r = R.mulberry32(seed + li * 104729 + 17);
    const W = wordT.get(L.word), WC = wordC.get(L.word);
    const em = L.size;
    const rot = g(r) * (0.012 + 0.11 * c) * (0.6 + 0.4 * persona.bounce);
    const sc = Math.exp(g(r) * (0.02 + 0.09 * c) * persona.sizeVar);
    const ax = Math.exp(g(r) * (0.02 + 0.07 * c));
    const shear = g(r) * (0.025 + 0.1 * c);
    const ldy = g(r) * (0.008 + 0.05 * c) * persona.bounce;
    const ldx = g(r) * (0.005 + 0.035 * c);
    const warpA = 0.006 + 0.045 * c, warpL = 0.33;
    const wseed = seed + li * 31 + 7;
    const box = L.g.box, cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const tf = ([x, y]) => {
      x += warpA * R.noise2(x / warpL, y / warpL, wseed);
      y += warpA * R.noise2(x / warpL + 9.1, y / warpL, wseed + 1);
      let u = (x - cx) * sc * ax, v = (y - cy) * sc / Math.sqrt(ax);
      u -= v * shear;
      x = cx + cr * u - sr * v + ldx; y = cy + sr * u + cr * v + ldy;
      // a la línea
      let X = L.x + x * em * L.sx, Y = L.base + y * em;
      // palabra
      const wcx = (WC.x0 + WC.x1) / 2;
      let U = (X - wcx) * W.sc, V = (Y - L.base) * W.sc;
      U -= V * W.slant;
      const cw = Math.cos(W.rot), sw = Math.sin(W.rot);
      X = wcx + cw * U - sw * V + W.dx * em; Y = L.base + sw * U + cw * V + W.dy * em;
      // línea base que ondula
      Y += em * (0.012 + 0.05 * c) * persona.bounce * R.noise1(X / 3.2, lineSeed(L.line));
      return [X, Y];
    };
    const strokes = L.g.strokes.map((s, si) => {
      const rs = R.mulberry32(seed + li * 1009 + si * 97 + 5);
      let pts = s.pts;
      // trazo: pequeño desplazamiento y giro propio (las piezas de la letra no encajan perfecto)
      let mx = 0, my = 0; for (const q of pts) { mx += q[0]; my += q[1]; } mx /= pts.length; my /= pts.length;
      const jx = g(rs) * (0.004 + 0.028 * c), jy = g(rs) * (0.004 + 0.028 * c), jr = g(rs) * (0.012 + 0.07 * c);
      const cj = Math.cos(jr), sj = Math.sin(jr);
      pts = pts.map(([x, y]) => [mx + cj * (x - mx) - sj * (y - my) + jx, my + sj * (x - mx) + cj * (y - my) + jy]);
      // poco legible: la mano simplifica
      if (c > 0.35) pts = lowpass(pts, (c - 0.35) * 0.09);
      // extremos: se pasa o se queda corto; los óvalos no siempre cierran
      if (s.closed) {
        // en em: abre un poco el óvalo o se pasa de largo al cerrarlo
        const open = (0.015 + 0.09 * c) * (0.4 + persona.open) * (rs() < 0.6 ? 1 : -0.5);
        pts = trimEnds(pts, 0, -open);
      } else if (pts.length > 3) {
        const e0 = Math.max(-0.05, Math.min(0.04, g(rs) * (0.008 + 0.03 * c))), e1 = Math.max(-0.06, Math.min(0.05, g(rs) * (0.01 + 0.035 * c) + (rs() < P.lift ? -0.025 : 0)));
        pts = trimEnds(pts, e0, e1);
      }
      return { pts: pts.map(tf), closed: s.closed, joinable: true, mark: !!s.mark };
    });
    const letter = { strokes, joinable: L.g.script && /[a-zñáéíóúü]/i.test(L.g.ch), L, size: em, word: L.word };
    cursiveLetters.push(letter);
  });
  // ---- huecos reales dentro de cada palabra (ya con la variación): ni se tocan ni parecen espacios
  if (!isScript) {
    const inkW = P.w * (p.width == null ? 1 : p.width);
    const byW = new Map();
    for (const l of cursiveLetters) { if (!byW.has(l.word)) byW.set(l.word, []); byW.get(l.word).push(l); }
    for (const [, ls] of byW) {
      if (ls.length < 2) continue;
      const ext = ls.map(l => { let a = Infinity, b = -Infinity; for (const s of l.strokes) if (!s.mark || l.strokes.every(t => t.mark)) for (const q of s.pts) { if (q[0] < a) a = q[0]; if (q[0] > b) b = q[0]; } return [a, b]; });
      const shift = new Array(ls.length).fill(0);
      for (let k = 1; k < ls.length; k++) {
        if (!isFinite(ext[k][0]) || !isFinite(ext[k - 1][1])) { shift[k] = shift[k - 1]; continue; }
        const sz = ls[k].size;
        const narrow = (ext[k][1] - ext[k][0] < 0.14 * sz) || (ext[k - 1][1] - ext[k - 1][0] < 0.14 * sz);
        const minG = (0.055 + 2 * inkW + (narrow ? 0.025 : 0)) * sz;
        const maxG = (0.15 + 2 * inkW + Math.max(0, p.track || 0) + 0.05 * c) * sz;
        const gap = (ext[k][0] + shift[k - 1]) - (ext[k - 1][1] + shift[k - 1]);
        shift[k] = shift[k - 1] + (gap < minG ? minG - gap : gap > maxG ? maxG - gap : 0);
      }
      const mid = (shift[0] + shift[shift.length - 1]) / 2;
      ls.forEach((l, k) => { const d = shift[k] - mid; if (d) for (const s of l.strokes) s.pts = s.pts.map(q => [q[0] + d, q[1]]); });
    }
    // entre palabras de una misma línea: el espacio siempre se ve
    const lines = new Map();
    for (const [w, ls] of byW) { const li = ls[0].L.line; if (!lines.has(li)) lines.set(li, []); lines.get(li).push({ w, ls }); }
    for (const [, ws] of lines) {
      const E = ws.map(o => { let a = Infinity, b = -Infinity; for (const l of o.ls) for (const s of l.strokes) for (const q of s.pts) { if (q[0] < a) a = q[0]; if (q[0] > b) b = q[0]; } return { o, a, b, sz: o.ls[0].size }; }).filter(e => isFinite(e.a)).sort((x, y) => x.a - y.a);
      for (let k = 1; k < E.length; k++) {
        const want = (p.mode === 'mayus' ? 0.36 : 0.26) * (E[k].sz + E[k - 1].sz) / 2 + 2 * inkW;
        const gap = E[k].a - E[k - 1].b;
        if (gap < want) {
          const d = (want - gap) / 2;
          for (let j = 0; j < E.length; j++) {
            const dd = j < k ? -d : d;
            for (const l of E[j].o.ls) for (const s of l.strokes) s.pts = s.pts.map(q => [q[0] + dd, q[1]]);
            E[j].a += dd; E[j].b += dd;
          }
        }
      }
    }
  }
  // ---- cursiva: une las letras de cada palabra (en el espacio de maquetación, ya con la variación)
  if (isScript) {
    const byWord = new Map();
    for (const l of cursiveLetters) { if (!byWord.has(l.word)) byWord.set(l.word, []); byWord.get(l.word).push(l); }
    for (const [, ls] of byWord) FN.joinCursive(ls, 0.09 * (1 + c));
  }
  // ---- a píxeles del documento, con temblor y repasado
  const widthMul = p.width == null ? 1 : p.width;
  const passMul = p.repasado == null ? 1 : p.repasado;
  cursiveLetters.forEach((l, li) => {
    const L = l.L;
    const lv = L.lv || { passes: 1, w: 1 };
    // escala local (px por unidad de maquetación) en el centro de la letra
    const box = L.g.box;
    const cx = L.x + (box.left + box.right) / 2 * L.size, cy = L.base + (box.top + box.bottom) / 2 * L.size;
    const p0 = map(cx, cy), pa = map(cx + 0.05, cy), pb = map(cx, cy + 0.05);
    const J = [(pa[0] - p0[0]) / 0.05, (pa[1] - p0[1]) / 0.05, (pb[0] - p0[0]) / 0.05, (pb[1] - p0[1]) / 0.05];
    const ux = Math.sqrt(Math.abs(J[0] * J[3] - J[1] * J[2])) || 1;
    const emPx = ux * L.size;
    let passes = 1 + Math.round((lv.passes - 1) * passMul);
    if (P.extraPass) passes += P.extraPass;
    l.strokes.forEach((s, si) => {
      if (!s.pts || s.pts.length < 2) return;
      for (let pass = 0; pass < passes; pass++) {
        const rs = R.mulberry32(seed + li * 3301 + si * 211 + pass * 7919 + 11);
        let pts = s.pts;
        if (pass > 0) {
          // repasado: otra pasada casi encima (se desvía un poco, no empieza ni acaba en el mismo sitio)
          const amp = (0.012 + 0.02 * c) * (pass === 1 ? 1 : 1.35);
          const dx = g(rs) * amp, dy = g(rs) * amp, rr = g(rs) * 0.03;
          let mx = 0, my = 0; for (const q of pts) { mx += q[0]; my += q[1]; } mx /= pts.length; my /= pts.length;
          const cr = Math.cos(rr), sr = Math.sin(rr);
          pts = pts.map(([x, y]) => [mx + cr * (x - mx) - sr * (y - my) + dx * L.size, my + sr * (x - mx) + cr * (y - my) + dy * L.size]);
          if (pts.length > 3) pts = trimEnds(pts, g(rs) * 0.02 * L.size, g(rs) * 0.025 * L.size);
        }
        // pincel: algunos trazos verticales empiezan por abajo
        if (P.up && pts.length > 2) {
          const a = pts[0], b = pts[pts.length - 1];
          if (Math.abs(b[1] - a[1]) > 1.6 * Math.abs(b[0] - a[0]) && b[1] > a[1] && rs() < P.up) pts = pts.slice().reverse();
        }
        // al documento, con temblor perpendicular
        const tremA = emPx * (0.0015 + 0.008 * (p.pulso == null ? 0.4 : p.pulso)) * P.tremor, tremL = emPx * 0.06;
        const dpts = pts.map(q => map(q[0], q[1]));
        let acc = 0;
        const fin = dpts.map((q, k) => {
          if (k > 0) acc += Math.hypot(q[0] - dpts[k - 1][0], q[1] - dpts[k - 1][1]);
          const a = dpts[Math.max(0, k - 1)], b = dpts[Math.min(dpts.length - 1, k + 1)];
          const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
          const nn = tremA * R.noise1(acc / tremL, seed + li * 3 + si * 17 + pass);
          return { x: q[0] - ty / tl * nn, y: q[1] + tx / tl * nn };
        });
        const r = Math.max(0.5, P.w * emPx * widthMul * lv.w / Math.max(0.5, Math.sqrt(L.size)) * (pass > 0 ? 0.92 + 0.12 * rs() : 1));
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const q of fin) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
        const m = r * 2.5 + 3;
        out.push({ pts: fin, r, seed: (seed + li * 7 + si * 131 + pass * 1777) >>> 0, P, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m }, alpha: pass > 0 ? 0.92 : 1 });
      }
    });
  });
  return out;
}

// pinta el plan en un lienzo (solo los trazos que caen en él)
function paint(canvas, strokes, p) {
  const rgb = RD.hexToRgb(p.color || '#1b1b1b');
  const ink = p.tinta == null ? 0.55 : p.tinta;
  let n = 0;
  for (const s of strokes) {
    const b = s.box;
    if (b.right < canvas.x0 || b.left > canvas.x0 + canvas.w || b.bottom < canvas.y0 || b.top > canvas.y0 + canvas.h) continue;
    INK.paintStroke(canvas, s.pts, s.P, s.r, rgb, s.seed, { inkMul: 0.88 + 0.24 * ink, dryMul: 0.45 + 1.1 * ink, alphaMul: s.alpha });
    n++;
  }
  return n;
}

function bounds(strokes) {
  let b = null;
  for (const s of strokes) b = b ? { left: Math.min(b.left, s.box.left), top: Math.min(b.top, s.box.top), right: Math.max(b.right, s.box.right), bottom: Math.max(b.bottom, s.box.bottom) } : Object.assign({}, s.box);
  return b;
}

module.exports = { plan, paint, bounds, chaosOf };
