'use strict';
// Dibujo: lienzo RGBA, composición, mapa de cada línea al documento y letras limpias.
// Sin dependencias de Photoshop.

const { Raster } = require('./raster.js');
const G = require('./geom.js');

function hexToRgb(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function makeCanvas(x0, y0, w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  return { x0: Math.floor(x0), y0: Math.floor(y0), w, h, data: new Uint8ClampedArray(w * h * 4) };
}

// cobertura (Float32 bw*bh, 0..1) -> lienzo, operador "sobre"
function composite(canvas, cov, bx, by, bw, bh, rgb, alphaMul) {
  const D = canvas.data, W = canvas.w, H = canvas.h;
  const am = alphaMul == null ? 1 : alphaMul;
  for (let y = 0; y < bh; y++) {
    const cy = by + y - canvas.y0;
    if (cy < 0 || cy >= H) continue;
    const row = y * bw;
    for (let x = 0; x < bw; x++) {
      const a = cov[row + x] * am;
      if (a <= 0.002) continue;
      const cx = bx + x - canvas.x0;
      if (cx < 0 || cx >= W) continue;
      const i = (cy * W + cx) * 4;
      const da = D[i + 3] / 255;
      const oa = a + da * (1 - a);
      const k = a / oa;
      D[i] += (rgb[0] - D[i]) * k; D[i + 1] += (rgb[1] - D[i + 1]) * k; D[i + 2] += (rgb[2] - D[i + 2]) * k;
      D[i + 3] = oa * 255;
    }
  }
}

function polysBBox(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (let i = 0; i < p.length; i += 2) {
    if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
    if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
  }
  return [x0, y0, x1, y1];
}

// rasteriza polígonos (ya en coordenadas del documento) a una cobertura local
function rasterLocal(polys, clip, pad) {
  let [x0, y0, x1, y1] = polysBBox(polys);
  if (!isFinite(x0)) return null;
  pad = pad || 1;
  x0 = Math.floor(x0) - pad; y0 = Math.floor(y0) - pad; x1 = Math.ceil(x1) + pad; y1 = Math.ceil(y1) + pad;
  if (clip) { x0 = Math.max(x0, clip.x0); y0 = Math.max(y0, clip.y0); x1 = Math.min(x1, clip.x0 + clip.w); y1 = Math.min(y1, clip.y0 + clip.h); }
  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0 || bw * bh > 6e7) return null;
  const r = new Raster(bw, bh);
  for (const p of polys) {
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { q[i] = p[i] - x0; q[i + 1] = p[i + 1] - y0; }
    r.poly(q);
  }
  return { cov: r.coverage(), x0, y0, w: bw, h: bh };
}

function fillPolys(canvas, polys, rgb, alphaMul) {
  const r = rasterLocal(polys, canvas, 1);
  if (r) composite(canvas, r.cov, r.x0, r.y0, r.w, r.h, rgb, alphaMul);
}

// ------------------------------------------------------------------ líneas
// Coloca palabras en una línea: devuelve instancias de glifo con x en espacio natural de línea
// (x desde el borde izquierdo de la tinta de la línea, y desde la línea base, hacia abajo)
function lineGlyphs(words, line) {
  const out = [];
  let pen = 0;
  for (let k = line.start; k < line.end; k++) {
    const w = words[k];
    for (const g of (w.glyphs || [])) out.push({ word: k, g, dx: pen, color: w.color, em: g.em || w.em || 20 });
    pen += w.w + (k < line.end - 1 ? w.gap : 0);
  }
  return out;
}

// Mapa natural de línea -> documento. Si la línea se ensancha, parte del ancho extra va al espaciado.
function lineMapper(line, frame, align, insts, tau) {
  const n = line.nat, w = Math.max(1e-6, n.w), H = Math.max(1e-6, n.asc + n.desc);
  const xe = line.xStretch || 1;
  const fw = Math.min(1, line.fillW == null ? 1 : line.fillW);
  const off = align === 'left' ? 0 : align === 'right' ? 1 - fw : (1 - fw) / 2;
  const q = line.quad;
  // reparto del estiramiento entre letras y huecos
  let remap = x => x / w;
  if (xe > 1.02 && tau > 0 && insts && insts.length > 1) {
    const iv = insts.map(it => [it.dx + it.g.bbox.left, it.dx + it.g.bbox.right]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [a, b] of iv) { const L = merged[merged.length - 1]; if (L && a <= L[1]) L[1] = Math.max(L[1], b); else merged.push([a, b]); }
    let G0 = 0; for (const [a, b] of merged) G0 += b - a;
    const gapTot = Math.max(0, w - G0);
    if (gapTot > w * 0.02) {
      const gx = Math.pow(xe, 1 - tau);
      const total = xe * w;
      const kg = Math.max(0.3, (total - gx * G0) / gapTot);
      const tot2 = gx * G0 + kg * gapTot;
      const knots = [[0, 0]];
      let X = 0, prev = 0;
      for (const [a, b] of merged) {
        X += Math.max(0, a - prev) * kg; knots.push([a, X]);
        X += (b - a) * gx; knots.push([b, X]); prev = b;
      }
      X += Math.max(0, w - prev) * kg; knots.push([w, X]);
      remap = x => {
        if (x <= 0) return (x * kg) / tot2;
        let lo = 0, hi = knots.length - 1;
        if (x >= knots[hi][0]) return (knots[hi][1] + (x - knots[hi][0]) * kg) / tot2;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (knots[m][0] <= x) lo = m; else hi = m; }
        const [xa, Xa] = knots[lo], [xb, Xb] = knots[hi];
        return (Xa + (x - xa) * (Xb - Xa) / ((xb - xa) || 1)) / tot2;
      };
    }
  }
  return (x, y) => {
    const u = off + remap(x) * fw, v = (y + n.asc) / H;
    const tx = q.tl[0] + (q.tr[0] - q.tl[0]) * u, ty = q.tl[1] + (q.tr[1] - q.tl[1]) * u;
    const bx = q.bl[0] + (q.br[0] - q.bl[0]) * u, by = q.bl[1] + (q.br[1] - q.bl[1]) * u;
    return frame.toDoc(tx + (bx - tx) * v, ty + (by - ty) * v);
  };
}

// contornos de un glifo transformados por map (con subdivisión para mapas no lineales)
function mapContours(contours, map, tolNat, maxLen) {
  return contours.map(segs => {
    const p = G.flattenSegs(segs, tolNat, maxLen);
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) { const d = map(p[i], p[i + 1]); q[i] = d[0]; q[i + 1] = d[1]; }
    return q;
  });
}

function localScale(map, x, y, e) {
  const p = map(x, y), a = map(x + e, y), b = map(x, y + e);
  const j = [(a[0] - p[0]) / e, (a[1] - p[1]) / e, (b[0] - p[0]) / e, (b[1] - p[1]) / e];
  return { s: Math.sqrt(Math.abs(j[0] * j[3] - j[1] * j[2])) || 1, sx: Math.hypot(j[0], j[1]), sy: Math.hypot(j[2], j[3]) };
}

// Texto limpio encajado (modo imagen sin efecto a mano)
function renderPlain(canvas, words, sol, frame, align, tau) {
  let n = 0;
  for (const line of sol.lines) {
    const insts = lineGlyphs(words, line);
    const map = lineMapper(line, frame, align, insts, tau);
    const H = line.nat.asc + line.nat.desc;
    for (const it of insts) {
      const m = (x, y) => map(x + it.dx, y);
      const cx = (it.g.bbox.left + it.g.bbox.right) / 2, cy = (it.g.bbox.top + it.g.bbox.bottom) / 2;
      const ls = localScale(m, cx, cy, H * 0.05);
      const tol = 0.2 / Math.max(1e-6, Math.max(ls.sx, ls.sy));
      const polys = mapContours(it.g.contours, m, tol, frame.affine && isRectQuad(line.quad) ? 0 : H / 14);
      fillPolys(canvas, polys, hexToRgb(it.color));
      n++;
    }
  }
  return n;
}
function isRectQuad(q) { return Math.abs(q.tl[0] - q.bl[0]) < 1e-6 && Math.abs(q.tr[0] - q.br[0]) < 1e-6; }

function trimCanvas(canvas) {
  const { w, h, data } = canvas;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) if (data[row + x * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) out.set(data.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + nw) * 4), y * nw * 4);
  return { x0: canvas.x0 + x0, y0: canvas.y0 + y0, w: nw, h: nh, data: out };
}

// 8 bits -> profundidad del documento
function toDepth(data, bits) {
  if (bits === 16) { const o = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) o[i] = Math.round(data[i] * 32768 / 255); return o; }
  if (bits === 32) { const o = new Float32Array(data.length); for (let i = 0; i < data.length; i++) o[i] = data[i] / 255; return o; }
  return data;
}

module.exports = { hexToRgb, makeCanvas, composite, rasterLocal, fillPolys, lineGlyphs, lineMapper, mapContours, localScale, renderPlain, trimCanvas, toDepth, polysBBox };
