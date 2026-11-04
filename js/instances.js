'use strict';
// Letras listas para dibujar (limpias o a mano), cada una con su mapa al documento.
// Sin dependencias de Photoshop.

const RD = require('./render.js');

function shiftSegs(contours, dx, dy) {
  return contours.map(segs => segs.map(s => [s[0] + dx, s[1] + dy, s[2] + dx, s[3] + dy, s[4] + dx, s[5] + dy, s[6] + dx, s[7] + dy]));
}

// Bloque de Cartelator: cada letra en el espacio natural de su línea
// proporción con la que se ve la línea en el documento (ancho/alto relativo al espacio natural)
function lineAspect(line, map) {
  const n = line.nat, W = Math.max(1e-6, n.w), H = Math.max(1e-6, n.asc + n.desc), ym = (n.desc - n.asc) / 2;
  let L = 0, prev = map(0, ym);
  for (let k = 1; k <= 8; k++) { const p = map(W * k / 8, ym); L += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; }
  let V = 0;
  for (const f of [0.2, 0.5, 0.8]) { const a = map(W * f, -n.asc), b = map(W * f, n.desc); V += Math.hypot(b[0] - a[0], b[1] - a[1]) / 3; }
  const a = (L / W) / Math.max(1e-6, V / H);
  if (!(a > 0) || !isFinite(a)) return 1;
  // escalones del 5 % (mejor aprovechamiento de la caché de trazos)
  return Math.exp(Math.round(Math.log(Math.max(0.05, Math.min(20, a))) / 0.05) * 0.05);
}

// Bloque de Cartelator: cada letra en el espacio de su línea, con la proporción con la que se ve
// (la variación a mano se calcula así sin que el estiramiento de la línea la exagere)
function fromLayout(words, sol, frame, align, tau) {
  const insts = [];
  const Ls = sol.lines;
  Ls.forEach((line, li) => {
    const lg = RD.lineGlyphs(words, line);
    const lmap = RD.lineMapper(line, frame, align, lg, tau);
    const a = lineAspect(line, lmap);
    // hueco libre con las líneas vecinas, relativo a la altura de esta línea
    const h = Math.max(1e-6, line.yb - line.ya);
    const up = li > 0 ? line.ya - Ls[li - 1].yb : h, dn = li < Ls.length - 1 ? Ls[li + 1].ya - line.yb : h;
    const room = Math.max(0, Math.min(up, dn)) / h;
    const map = a === 1 ? lmap : (x, y) => lmap(x / a, y);
    for (const it of lg) {
      const b = it.g.bbox;
      const contours = it.g.contours.map(segs => segs.map(sg => [(sg[0] + it.dx) * a, sg[1], (sg[2] + it.dx) * a, sg[3], (sg[4] + it.dx) * a, sg[5], (sg[6] + it.dx) * a, sg[7]]));
      const nat = a === 1 ? null : shiftSegs(it.g.contours, it.dx, 0);
      insts.push({
        contours, ax: a, natContours: nat,
        natBbox: nat ? { left: b.left + it.dx, right: b.right + it.dx, top: b.top, bottom: b.bottom } : null,
        bbox: { left: (b.left + it.dx) * a, right: (b.right + it.dx) * a, top: b.top, bottom: b.bottom },
        em: it.em, strokeEm: it.em * Math.min(1, a), color: it.color, word: it.word, line: li, ch: it.g.ch, base: 0, map, room
      });
    }
  });
  return insts;
}

// Capa de texto existente: espacio natural = documento girado para que las líneas queden horizontales
function fromTextLayer(an, text) {
  const ang = an.angle || 0, c = Math.cos(ang), s = Math.sin(ang);
  const toLocal = ang ? (x, y) => [c * x + s * y, -s * x + c * y] : (x, y) => [x, y];
  const map = ang ? (x, y) => [c * x - s * y, s * x + c * y] : (x, y) => [x, y];
  return an.glyphs.map(q => {
    const contours = q.g.contours.map(segs => segs.map(sg => {
      const o = new Array(8);
      for (let i = 0; i < 8; i += 2) { const p = toLocal(sg[i], sg[i + 1]); o[i] = p[0]; o[i + 1] = p[1]; }
      return o;
    }));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const segs of contours) for (const sg of segs) for (let i = 0; i < 8; i += 2) {
      x0 = Math.min(x0, sg[i]); x1 = Math.max(x1, sg[i]); y0 = Math.min(y0, sg[i + 1]); y1 = Math.max(y1, sg[i + 1]);
    }
    return { contours, bbox: { left: x0, top: y0, right: x1, bottom: y1 }, em: q.em, color: q.color, word: q.word, line: q.line, ch: q.ci >= 0 ? text[q.ci] : null, map };
  });
}

// límites (en el documento) de un conjunto de letras
function docBounds(insts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of insts) {
    const b = it.bbox;
    for (const [x, y] of [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]]) {
      const d = it.map(x, y);
      x0 = Math.min(x0, d[0]); x1 = Math.max(x1, d[0]); y0 = Math.min(y0, d[1]); y1 = Math.max(y1, d[1]);
    }
  }
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

module.exports = { fromLayout, fromTextLayer, docBounds, shiftSegs, lineAspect };
