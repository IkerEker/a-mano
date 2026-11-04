'use strict';
// CALCO GUIADO: en vez de adivinar el esqueleto de la letra (que rompe la «e», parte la «u», enreda la «m»),
// se parte de una letra de trazo correcta para ese carácter (orden, número y dirección de trazos) y se ajusta
// a la forma de la fuente: se encaja en su caja (probando inclinaciones, para las cursivas) y cada punto se
// desliza hacia el centro del trazo de la fuente, sin perder suavidad. El grosor sale de la propia letra.
// Si el ajuste no es bueno (símbolos raros, letras muy decoradas), devuelve null y se usa el esqueleto.
// Sin dependencias de Photoshop.

const { Raster } = require('./raster.js');
const G = require('./geom.js');
const ST = require('./strokes.js');
const FN = require('./fonts.js');

let lastQ = 0;
const cache = new Map();
const tplCache = new Map();

function templatesFor(ch) {
  if (!tplCache.has(ch)) tplCache.set(ch, FN.templates(ch) || []);
  return tplCache.get(ch);
}

function keyOf(contours, bbox, em, ch) {
  const k = 200 / Math.max(1e-6, em);
  let h = 2166136261 >>> 0, n = 0;
  for (const segs of contours) for (const sg of segs) for (let i = 0; i < 8; i += 2) {
    const x = Math.round((sg[i] - bbox.left) * k), y = Math.round((sg[i + 1] - bbox.top) * k);
    h = Math.imul(h ^ (x & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ (y & 0xffff), 16777619) >>> 0; n++;
  }
  return ch + '|' + h.toString(36) + ':' + n + ':' + Math.round((bbox.right - bbox.left) * k) + 'x' + Math.round((bbox.bottom - bbox.top) * k);
}

// muestreo bilineal
function sampler(a, w, h) {
  return (x, y) => {
    if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1.001) x = w - 1.001; if (y > h - 1.001) y = h - 1.001;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + w] * (1 - fx) + a[i + w + 1] * fx) * fy;
  };
}

// contornos (coordenadas naturales, y hacia abajo) -> trazos [{ closed, pts:[{x,y,r}] }] o null
function guidedStrokes(contours, bbox, em, ch) {
  if (!ch || /\s/.test(ch)) return null;
  const tpls = templatesFor(ch);
  if (!tpls.length) return null;
  const key = keyOf(contours, bbox, em, ch);
  if (cache.has(key)) {
    const rel = cache.get(key);
    return rel ? rel.map(s => ({ closed: s.closed, pts: s.pts.map(p => ({ x: bbox.left + p.x * em, y: bbox.top + p.y * em, r: p.r * em })) })) : null;
  }
  const res = fit(contours, bbox, em, tpls);
  // en caché, relativo a la caja y al cuerpo
  const rel = res ? res.map(s => ({ closed: s.closed, pts: s.pts.map(p => ({ x: (p.x - bbox.left) / em, y: (p.y - bbox.top) / em, r: p.r / em })) })) : null;
  if (cache.size > 4000) cache.clear();
  cache.set(key, rel);
  return res;
}

function fit(contours, bbox, em, tpls) {
  // raster de la letra
  const E = 120, sc = E / Math.max(1e-6, em), pad = 8;
  const bw = (bbox.right - bbox.left) * sc, bh = (bbox.bottom - bbox.top) * sc;
  const w = Math.ceil(bw) + pad * 2, h = Math.ceil(bh) + pad * 2;
  if (w * h > 1.5e6 || w < 4 || h < 4) return null;
  const rs = new Raster(w, h);
  for (const segs of contours) {
    const pl = G.flattenSegs(segs, 0.35 / sc);
    const q = new Float64Array(pl.length);
    for (let i = 0; i < pl.length; i += 2) { q[i] = (pl[i] - bbox.left) * sc + pad; q[i + 1] = (pl[i + 1] - bbox.top) * sc + pad; }
    rs.poly(q);
  }
  const cov = rs.coverage();
  const bin = new Uint8Array(w * h), inv = new Uint8Array(w * h);
  let inside = 0;
  for (let i = 0; i < w * h; i++) { bin[i] = cov[i] > 0.5 ? 1 : 0; inv[i] = 1 - bin[i]; inside += bin[i]; }
  if (inside < 6) return null;
  const dIn = ST.edt(bin, w, h), dOut = ST.edt(inv, w, h);
  const F = new Float32Array(w * h);
  let maxIn = 0;
  for (let i = 0; i < w * h; i++) { F[i] = dIn[i] - dOut[i]; if (dIn[i] > maxIn) maxIn = dIn[i]; }
  const sF = sampler(F, w, h), sIn = sampler(dIn, w, h);
  const ridge = Math.max(1, maxIn);
  // esqueleto de la letra (puntos del eje del trazo)
  const sk = ST.thin(bin.slice(), w, h);
  const S = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sk[y * w + x]) S.push([x + 0.5, y + 0.5]);
  if (S.length < 3) return null;
  // rejilla para buscar el punto de esqueleto más cercano
  const cell = Math.max(2, Math.round(ridge * 2)), gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Array(gw * gh);
  S.forEach((q, i) => { const k = Math.floor(q[1] / cell) * gw + Math.floor(q[0] / cell); (grid[k] = grid[k] || []).push(i); });
  const nearest = (x, y) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    let bd = Infinity, bi = -1;
    for (let r = 0; r < Math.max(gw, gh); r++) {
      for (let yy = cy - r; yy <= cy + r; yy++) for (let xx = cx - r; xx <= cx + r; xx++) {
        if (yy < 0 || xx < 0 || yy >= gh || xx >= gw) continue;
        if (r && Math.abs(yy - cy) !== r && Math.abs(xx - cx) !== r) continue;
        const lst = grid[yy * gw + xx]; if (!lst) continue;
        for (const i of lst) { const d = (S[i][0] - x) ** 2 + (S[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } }
      }
      if (bi >= 0 && (r * cell) ** 2 > bd) break;
    }
    return bi;
  };
  let best = null;
  for (const t of tpls) {
    const tb = t.box;
    const tw = tb.right - tb.left, th = tb.bottom - tb.top;
    if (!(th > 1e-6)) continue;
    // caja de la plantilla -> caja de la letra (las muy estrechas, por altura y centradas)
    const syk = bh / th;
    const narrow = tw < th * 0.18 || bw < bh * 0.18;
    const sxk = narrow ? syk : bw / Math.max(1e-6, tw);
    const ox = narrow ? pad + bw / 2 - (tb.left + tw / 2) * sxk : pad - tb.left * sxk, oy = pad - tb.top * syk;
    const T0 = t.strokes.filter(s => !s.fill).map(s => ({ closed: s.closed, pts: s.pts.map(([x, y]) => [ox + x * sxk, oy + y * syk]) }));
    if (!T0.length) continue;
    // encaje global (afín) por puntos cercanos en los dos sentidos: la plantilla pasa por el esqueleto y el
    // esqueleto queda cubierto por la plantilla
    const flat = []; for (const st of T0) for (const p of st.pts) flat.push(p);
    let A = [1, 0, 0, 1, 0, 0]; // x' = a x + b y + c ; y' = d x + e y + f
    const ap = (p) => [A[0] * p[0] + A[1] * p[1] + A[4], A[2] * p[0] + A[3] * p[1] + A[5]];
    const step = Math.max(1, Math.floor(flat.length / 160));
    for (let it = 0; it < 14; it++) {
      const pairs = [];
      for (let i = 0; i < flat.length; i += step) { const q = ap(flat[i]); const j = nearest(q[0], q[1]); if (j >= 0) pairs.push([flat[i], S[j], 1]); }
      // del esqueleto a la plantilla (cobertura)
      const tq = flat.filter((_, i) => i % step === 0).map(p => ({ p, q: ap(p) }));
      for (let j = 0; j < S.length; j += Math.max(1, Math.floor(S.length / 160))) {
        let bd = Infinity, bp = null;
        for (const o of tq) { const d = (o.q[0] - S[j][0]) ** 2 + (o.q[1] - S[j][1]) ** 2; if (d < bd) { bd = d; bp = o.p; } }
        if (bp) pairs.push([bp, S[j], 0.7]);
      }
      // mínimos cuadrados con un poco de rigidez (no se deforma más de la cuenta)
      const reg = pairs.length * 0.04;
      const solve = (k) => {
        // incógnitas [u, v, c] para x' (k=0) o y' (k=1): u*x + v*y + c
        const M = [[reg, 0, 0], [0, reg, 0], [0, 0, 1e-6]], Bv = [k === 0 ? reg : 0, k === 1 ? reg : 0, 0];
        for (const [p, q, wgt] of pairs) {
          const r = [p[0], p[1], 1];
          for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) M[i][j] += wgt * r[i] * r[j]; Bv[i] += wgt * r[i] * q[k]; }
        }
        return solve3(M, Bv);
      };
      const X = solve(0), Y = solve(1);
      if (!X || !Y) break;
      A = [X[0], X[1], Y[0], Y[1], X[2], Y[2]];
    }
    // ajuste fino por punto: hacia el esqueleto, suavizado; los extremos no se escapan de la letra
    let strokes = T0.map(st => ({ closed: st.closed, pts: st.pts.map(ap) }));
    for (let it = 0; it < 6; it++) {
      for (const st of strokes) {
        const P = st.pts, n = P.length;
        const np = P.map(([x, y]) => { const j = nearest(x, y); if (j < 0) return [x, y]; const d = Math.hypot(S[j][0] - x, S[j][1] - y); const k = d < ridge * 3 ? 0.5 : 0.15; return [x + (S[j][0] - x) * k, y + (S[j][1] - y) * k]; });
        for (let k = 0; k < n; k++) {
          if (k === 0 || k === n - 1) { P[k] = np[k]; continue; }
          P[k] = [np[k][0] * 0.5 + (np[k - 1][0] + np[k + 1][0]) * 0.25, np[k][1] * 0.5 + (np[k - 1][1] + np[k + 1][1]) * 0.25];
        }
      }
    }
    // calidad: la plantilla dentro de la letra y el esqueleto cubierto
    let ins = 0, tot = 0;
    for (const st of strokes) for (const [x, y] of st.pts) { tot++; if (sF(x, y) > 0.2) ins++; }
    const covFrac = coverageOf(strokes, sk, w, h, ridge);
    const q = Math.min(ins / Math.max(1, tot), covFrac);
    if (!best || q > best.q) best = { q, strokes };
  }
  lastQ = best ? best.q : -1; if (typeof process !== 'undefined' && process.env && process.env.CALCO_DEBUG) console.log('q', best && best.q.toFixed(2));

  if (!best || best.q < 0.9) return null;
  const k = 1 / sc;
  return best.strokes.map(st => ({
    closed: st.closed,
    pts: st.pts.map(([x, y]) => ({ x: (x - pad) * k + bbox.left, y: (y - pad) * k + bbox.top, r: Math.max(0.4, sIn(x, y)) * k }))
  }));
}

function solve3(M, b) {
  const a = M.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k]; }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

// fracción del esqueleto de la letra que queda cerca de algún trazo (no se aceptan calcos que dejan partes)
function coverageOf(strokes, bin, w, h, ridge) {
  const step = 1, rad = ridge * 0.9 + 1.2, r2 = rad * rad;
  let hit = 0, tot = 0;
  const pts = [];
  for (const st of strokes) for (const p of st.pts) pts.push(p);
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (!bin[y * w + x]) continue;
    tot++;
    for (const [px, py] of pts) { const dx = px - x, dy = py - y; if (dx * dx + dy * dy < r2) { hit++; break; } }
  }
  return tot ? hit / tot : 0;
}

module.exports = { guidedStrokes };
