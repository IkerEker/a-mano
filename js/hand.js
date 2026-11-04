'use strict';
// A MANO: cada letra se pinta encima de donde está, como la haría una persona.
//  - herramientas de trazo (boli, rotulador, pincel, lápiz): la letra se reconstruye como trazos
//    con dirección, presión, entrada y salida, y se pinta con el modelo de la herramienta
//  - herramientas de relleno (brocha, sello): se conserva la silueta de la letra con borde vivo y
//    textura de pincel seco o de sello/linograbado
//  - variación por letra, por palabra y por línea, sin mover la maqueta: cada letra varía alrededor
//    de su sitio y cada palabra se queda donde estaba
// Sin dependencias de Photoshop.

const R = require('./rng.js');
const ST = require('./strokes.js');
const RD = require('./render.js');
const G = require('./geom.js');
const INK = require('./ink.js');
const CA = require('./calco.js');

const TOOLS = {
  boli: { kind: 'stroke', width: 0.03, useFont: false, density: 0.84, inP: 0.75, inLen: 2, outP: 0.55, outLen: 3, pVar: 0.12, bead: 1.45, edgeDark: 0.06, soft: 0.6, grain: 0.45, skip: 0.5, bristles: 0, dry: 0, rough: 0.04, tremor: 1 },
  rotulador: { kind: 'stroke', width: 0.065, useFont: true, density: 0.86, inP: 0.92, inLen: 1.2, outP: 0.8, outLen: 1.5, pVar: 0.05, bead: 1.1, edgeDark: 0.12, soft: 0.8, grain: 0.12, skip: 0, bristles: 0.06, dry: 0, rough: 0.05, tremor: 0.7 },
  pincel: { kind: 'stroke', width: 0.08, useFont: true, density: 0.95, inP: 0.5, inLen: 1.6, outP: 0.2, outLen: 4, pVar: 0.16, bead: 1, edgeDark: 0, soft: 0.9, grain: 0.15, skip: 0, bristles: 1, dry: 0.75, rough: 0.16, tremor: 0.8 },
  lapiz: { kind: 'stroke', width: 0.022, useFont: false, density: 0.58, inP: 0.6, inLen: 3, outP: 0.4, outLen: 4, pVar: 0.2, bead: 1, edgeDark: 0, soft: 1.4, grain: 1, skip: 0, bristles: 0, dry: 0, rough: 0.12, tremor: 1.3 },
  brocha: { kind: 'fill', density: 0.96, edgeLow: 0.012, edgeHigh: 0.006, edgeHash: 0, bristles: 1, dry: 0.85, grain: 0.18, inP: 0.75, inLen: 1.2, outP: 0.35, outLen: 3, pVar: 0.12, bead: 1, edgeDark: 0, soft: 0.8, rough: 0.12, skip: 0 },
  sello: { kind: 'fill', density: 0.94, edgeLow: 0.010, edgeHigh: 0.009, edgeHash: 0.004, specks: 1, grain: 0.35 }
};

const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const grainTiles = new Map();
function grainTile(seed) {
  let t = grainTiles.get(seed);
  if (t) return t;
  t = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const f = R.noise2(x / 5.5, y / 2.2, seed + 9) * 0.5 + 0.5;
    t[y * 256 + x] = 0.45 * R.hash2(x, y, seed) + 0.3 * (R.noise2(x / 2.6, y / 2.6, seed + 3) * 0.5 + 0.5) + 0.25 * f;
  }
  if (grainTiles.size > 8) grainTiles.clear();
  grainTiles.set(seed, t);
  return t;
}

// ------------------------------------------------------------------ un trazo
function makeBuf(x0, y0, x1, y1) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0 || w * h > 4e7) return null;
  return { x0, y0, w, h, depth: new Float32Array(w * h).fill(-1e9), ink: new Float32Array(w * h) };
}

function prepStroke(pts, tool, seed) {
  if (pts.length < 2) return null;
  const arc = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const Ls = arc[arc.length - 1];
  if (Ls < 0.5) return null;
  const rMed = pts.map(p => p.r).sort((a, b) => a - b)[pts.length >> 1];
  const step = Math.max(0.8, rMed * 0.6);
  const P = [];
  let j = 0;
  for (let a = 0; a <= Ls + 1e-6; a += step) {
    while (j < arc.length - 2 && arc[j + 1] < a) j++;
    const t = (a - arc[j]) / Math.max(1e-9, arc[j + 1] - arc[j]);
    const A = pts[j], B = pts[j + 1];
    P.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, r: A.r + (B.r - A.r) * t, a });
  }
  const l = pts[pts.length - 1];
  if (Ls - P[P.length - 1].a > step * 0.3) P.push({ x: l.x, y: l.y, r: l.r, a: Ls });
  const r0 = Math.max(0.6, rMed);
  const inL = Math.min(tool.inLen * r0, Ls * 0.28), outL = Math.min(tool.outLen * r0, Ls * 0.38);
  for (const q of P) {
    const ent = tool.inP + (1 - tool.inP) * smooth01(0, inL, q.a);
    const ext = tool.outP + (1 - tool.outP) * smooth01(0, outL, Ls - q.a);
    const mid = 1 + tool.pVar * R.noise1(q.a / (5 * r0), seed + 11);
    let rr = q.r * Math.min(ent, ext) * mid;
    if (tool.bead > 1 && q.a < 1.2 * r0) rr *= 1 + (tool.bead - 1) * (1 - q.a / (1.2 * r0));
    q.rr = Math.max(0.45, rr);
  }
  return { P, Ls, r0 };
}

// pinta el trazo en buf (guarda, por píxel, la "profundidad" dentro del trazo y la tinta)
function strokeInto(buf, S, tool, seed, opts) {
  const { P, Ls, r0 } = S;
  const rnd = R.mulberry32(seed);
  const load0 = 0.92 + rnd() * 0.16;
  const sDen = tool.density * (0.95 + rnd() * 0.1) * (opts.inkMul || 1);
  const nB = 28, bristleCap = new Float32Array(nB);
  for (let b = 0; b < nB; b++) bristleCap[b] = 0.55 + rnd() * 0.7;
  const soft = tool.soft;
  const grain = tool.grain && !opts.noGrain ? grainTile(opts.paperSeed || 99) : null;
  const edgeN = P.map(q => [R.noise2(q.a / Math.max(1, q.rr * 0.7), 7.3, seed + 5), R.noise2(q.a / Math.max(1, q.rr * 0.7), -7.3, seed + 5)]);
  const useBr = tool.bristles > 0;
  const brN = useBr ? P.map(q => { const a = new Float32Array(nB); for (let b = 0; b < nB; b++) a[b] = R.noise2(b * 3.71 + 0.5, q.a / Math.max(1.5, q.rr * 1.1), seed + 17) * 0.5 + 0.5; return a; }) : null;
  const { x0, y0, w: bw, h: bh, depth, ink: inkB } = buf;
  const clip = opts.clip || null;
  for (let i = 0; i < P.length - 1; i++) {
    const A = P[i], B = P[i + 1];
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1e-9, Ln = Math.sqrt(L2);
    const eA = edgeN[i], eB = edgeN[i + 1], bA = useBr ? brN[i] : null, bB = useBr ? brN[i + 1] : null;
    const rMax = Math.max(A.rr, B.rr) * (1 + tool.rough) + soft + 1, rMax2 = rMax * rMax;
    const sx0 = Math.max(x0, Math.floor(Math.min(A.x, B.x) - rMax)), sx1 = Math.min(x0 + bw - 1, Math.ceil(Math.max(A.x, B.x) + rMax));
    const sy0 = Math.max(y0, Math.floor(Math.min(A.y, B.y) - rMax)), sy1 = Math.min(y0 + bh - 1, Math.ceil(Math.max(A.y, B.y) + rMax));
    for (let py = sy0; py <= sy1; py++) {
      for (let px = sx0; px <= sx1; px++) {
        const qx = px + 0.5 - A.x, qy = py + 0.5 - A.y;
        let t = (qx * dx + qy * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = qx - dx * t, cy = qy - dy * t, d2 = cx * cx + cy * cy;
        if (d2 > rMax2) continue;
        const dist = Math.sqrt(d2);
        const rad = A.rr + (B.rr - A.rr) * t;
        const a = A.a + Ln * t;
        const side = (dx * qy - dy * qx) >= 0 ? 1 : -1;
        const en = side > 0 ? eA[0] + (eB[0] - eA[0]) * t : eA[1] + (eB[1] - eA[1]) * t;
        const radE = rad * (1 + tool.rough * en);
        if (radE + soft * 0.5 - dist <= 0) continue;
        const k = (py - y0) * bw + (px - x0);
        if (clip && clip[k] <= 0) continue;
        const dep = radE - dist;
        if (dep <= depth[k]) continue;
        const l = Math.min(1, dist / Math.max(0.3, radE)) * side;
        let ink = sDen;
        if (tool.edgeDark) ink += tool.edgeDark * smooth01(0.55, 1, Math.abs(l));
        if (useBr) {
          const b = Math.max(0, Math.min(nB - 1, Math.floor((l * 0.5 + 0.5) * nB)));
          const streak = bA[b] + (bB[b] - bA[b]) * t;
          ink *= 1 - tool.bristles * 0.18 * (1 - bristleCap[b]) - (tool.bristles < 0.5 ? 0.25 * streak * tool.bristles : 0);
          if (tool.dry) {
            const tt = Math.max(0, (a / Ls - 0.25) / 0.75);
            const dr = tool.dry * (opts.dryness || 1) * Math.pow(tt, 1.2) * load0 + 0.35 * tool.dry * Math.abs(l) * Math.abs(l) * tt;
            const v = dr * (1.45 - bristleCap[b]) - (1 - streak) * 0.55;
            ink *= 1 - 0.95 * smooth01(-0.04, 0.04, v);
          }
        }
        if (tool.skip) { const n1 = R.noise2(a / 2.2, side * 0.3, seed + 23); if (n1 > 0.45) ink *= 1 - tool.skip * smooth01(0.45, 0.85, n1); }
        if (grain) { const g = grain[((py & 255) << 8) | (px & 255)]; ink *= 1 - tool.grain * (tool.grain >= 1 ? 0.75 : 0.5) * Math.pow(g, tool.grain >= 1 ? 1.2 : 2); }
        ink *= 1 - 0.12 * (1 - smooth01(0, r0 * 1.2, Ls - a)) * (1 - tool.inP);
        depth[k] = dep; inkB[k] = Math.max(0, Math.min(1, ink));
      }
    }
  }
}

function bufToCov(buf, soft) {
  const n = buf.w * buf.h, cov = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const d = buf.depth[k];
    if (d <= -1e8) continue;
    cov[k] = (soft > 0 ? Math.max(0, Math.min(1, (d + soft * 0.5) / soft)) : (d >= 0 ? 1 : 0)) * buf.ink[k];
  }
  return cov;
}

function paintStroke(canvas, pts, tool, rgb, seed, opts) {
  const S = prepStroke(pts, tool, seed);
  if (!S) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of S.P) { x0 = Math.min(x0, q.x - q.rr); x1 = Math.max(x1, q.x + q.rr); y0 = Math.min(y0, q.y - q.rr); y1 = Math.max(y1, q.y + q.rr); }
  const pad = 3 + tool.soft;
  const buf = makeBuf(Math.max(canvas.x0, x0 - pad), Math.max(canvas.y0, y0 - pad), Math.min(canvas.x0 + canvas.w, x1 + pad), Math.min(canvas.y0 + canvas.h, y1 + pad));
  if (!buf) return;
  strokeInto(buf, S, tool, seed, opts);
  RD.composite(canvas, bufToCov(buf, tool.soft), buf.x0, buf.y0, buf.w, buf.h, rgb, 1);
}

// ------------------------------------------------------------------ variación (sin mover la maqueta)
function planVariation(insts, p, seed) {
  const L = p.locura, pr = p.prisa;
  const fillTool = !!(p.fill && TOOLS[p.fill]);
  const g = R.gauss;
  // líneas: línea base
  const lines = new Map();
  insts.forEach((it, i) => { if (!lines.has(it.line)) lines.set(it.line, []); lines.get(it.line).push(i); });
  const lineBase = new Map();
  for (const [li, idx] of lines) {
    const known = idx.find(i => insts[i].base != null);
    if (known != null) { lineBase.set(li, insts[known].base); continue; }
    const bots = idx.map(i => insts[i].bbox.bottom).sort((a, b) => a - b);
    lineBase.set(li, bots[Math.floor(bots.length * 0.4)]);
  }
  // palabras
  const words = new Map();
  insts.forEach((it, i) => { const k = it.line + ':' + it.word; if (!words.has(k)) words.set(k, []); words.get(k).push(i); });
  const plan = new Array(insts.length);
  let wk = 0;
  for (const [, idx] of words) {
    wk++;
    const r = R.mulberry32(seed + wk * 7919 + 3);
    idx.sort((a, b) => insts[a].bbox.left - insts[b].bbox.left);
    let x0 = Infinity, x1 = -Infinity, em = 0;
    for (const i of idx) { x0 = Math.min(x0, insts[i].bbox.left); x1 = Math.max(x1, insts[i].bbox.right); em += insts[i].em; }
    em /= idx.length;
    const base = lineBase.get(insts[idx[0]].line);
    // en carteles de interlineado apretado, menos baile vertical (no se pisan las líneas)
    const room = insts[idx[0]].room;
    const vf = room == null ? 1 : Math.max(0.3, Math.min(1, 0.3 + 3 * room));
    const Lw = L * vf * (fillTool ? 0.8 : 1);
    const W = {
      cx: (x0 + x1) / 2, base, em, vf,
      rot: g(r) * (0.02 + 0.07 * Lw), sc: Math.exp(-Math.abs(g(r)) * (0.02 + 0.05 * Lw)),
      dy: g(r) * (0.025 + 0.07 * Lw) * em, dx: g(r) * (0.01 + 0.035 * L) * em, shear: pr * 0.28 + g(r) * 0.05 * L
    };
    // espaciado vivo dentro de la palabra: cada letra se mueve un poco por su cuenta (se juntan o se
    // separan) sin que la palabra se desplace; "apretadas/sueltas" escala los huecos respecto al centro
    const sig = em * (0.02 + 0.075 * L), n = idx.length;
    const shifts = idx.map((i, k) => {
      const it = insts[i];
      let e = g(r) * sig;
      if (k === 0 || k === n - 1) e *= 0.5;
      const cx = (it.bbox.left + it.bbox.right) / 2;
      return e + (cx - (x0 + x1) / 2) * (p.tight || 0) * 0.9;
    });
    for (let k = 1; k < n; k++) {
      const a = insts[idx[k - 1]], b = insts[idx[k]];
      const nat = b.bbox.left - a.bbox.right;
      const minGap = -(a.bbox.right - a.bbox.left) * (0.04 + 0.05 * L);
      // las letras se juntan y se separan, pero un hueco dentro de la palabra nunca parece un espacio
      const maxGap = Math.max(nat, 0) + em * (0.03 + 0.07 * L) + Math.max(0, p.tight || 0) * em * 0.25;
      const gapNow = (b.bbox.left + shifts[k]) - (a.bbox.right + shifts[k - 1]);
      if (gapNow < minGap) shifts[k] += minGap - gapNow;
      else if (gapNow > maxGap) shifts[k] -= gapNow - maxGap;
    }
    const mean = shifts.reduce((s, v) => s + v, 0) / Math.max(1, n);
    idx.forEach((i, k) => {
      const it = insts[i];
      const rl = R.mulberry32(seed + i * 104729 + 17);
      plan[i] = {
        word: W, shift: shifts[k] - mean,
        cx: (it.bbox.left + it.bbox.right) / 2,
        rot: g(rl) * (0.02 + 0.12 * Lw), sc: Math.min(room == null ? 9 : 1 + 1.2 * room, Math.exp(g(rl) * (0.03 + 0.1 * Lw))), ax: Math.exp(g(rl) * (0.03 + 0.08 * L)),
        dy: g(rl) * (0.015 + 0.06 * Lw) * it.em, shear: g(rl) * 0.06 * L,
        warpA: (0.01 + 0.045 * L) * it.em, warpL: 0.35 * it.em, seed: seed + i * 31 + 7
      };
    });
  }
  const waveSeed = new Map();
  for (const [li] of lines) waveSeed.set(li, seed + 977 * (Number(li) + 1));
  const pv = { plan, lineBase, waveSeed, L };
  tightenWords(pv, insts, words, p);
  keepWordGaps(pv, insts, lines);
  return pv;
}

// extensión horizontal de una letra ya transformada (en el espacio de su línea)
function extentX(pv, insts, i) {
  const f = letterTransform(pv, insts, i), b = insts[i].bbox, my = (b.top + b.bottom) / 2;
  let l = Infinity, r = -Infinity;
  for (const [x, y] of [[b.left, b.top], [b.left, my], [b.left, b.bottom], [b.right, b.top], [b.right, my], [b.right, b.bottom]]) { const q = f(x, y); l = Math.min(l, q[0]); r = Math.max(r, q[0]); }
  return [l, r];
}

// dentro de una palabra, ningún hueco (ya con giros y tamaños) debe parecer un espacio
function tightenWords(pv, insts, words, p) {
  const L = p.locura;
  for (const [, idx] of words) {
    const n = idx.length;
    if (n < 2) continue;
    const W = pv.plan[idx[0]].word, em = W.em;
    let removed = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k < n; k++) {
        const a = insts[idx[k - 1]], b = insts[idx[k]];
        const nat = Math.max(0, b.bbox.left - a.bbox.right);
        const maxGap = nat + em * (0.04 + 0.06 * L) + Math.max(0, p.tight || 0) * em * 0.3;
        const ea = extentX(pv, insts, idx[k - 1]), eb = extentX(pv, insts, idx[k]);
        const g = eb[0] - ea[1];
        // tampoco se pisan de más (con giros y tamaños ya aplicados)
        const minGap = Math.min(nat, 0) - Math.min(ea[1] - ea[0], eb[1] - eb[0]) * (0.05 + 0.05 * L);
        if (g > maxGap) {
          const d = (g - maxGap) / Math.max(0.3, W.sc);
          for (let j = k; j < n; j++) pv.plan[idx[j]].shift -= d;
          removed += d;
        } else if (g < minGap) {
          const d = (minGap - g) / Math.max(0.3, W.sc);
          for (let j = k; j < n; j++) pv.plan[idx[j]].shift += d;
          removed -= d;
        }
      }
    }
    if (removed) for (const i of idx) pv.plan[i].shift += removed / 2;
  }
}

// los espacios entre palabras se mantienen claros: si dos palabras se acercan demasiado, se separan
function keepWordGaps(pv, insts, lines) {
  for (const [, idx] of lines) {
    const ws = new Map();
    for (const i of idx) { const w = pv.plan[i].word; if (!ws.has(w)) ws.set(w, []); ws.get(w).push(i); }
    const list = [...ws.entries()].map(([W, ii]) => {
      let nl = Infinity, nr = -Infinity;
      for (const i of ii) { nl = Math.min(nl, insts[i].bbox.left); nr = Math.max(nr, insts[i].bbox.right); }
      return { W, ii, nl, nr };
    }).sort((a, b) => a.nl - b.nl);
    const extent = o => {
      let l = Infinity, r = -Infinity;
      for (const i of o.ii) {
        const f = letterTransform(pv, insts, i), b = insts[i].bbox, my = (b.top + b.bottom) / 2;
        for (const [x, y] of [[b.left, b.top], [b.left, my], [b.left, b.bottom], [b.right, b.top], [b.right, my], [b.right, b.bottom]]) { const q = f(x, y); l = Math.min(l, q[0]); r = Math.max(r, q[0]); }
      }
      return [l, r];
    };
    for (let k = 1; k < list.length; k++) {
      const a = list[k - 1], b = list[k];
      const nat = b.nl - a.nr;
      if (!(nat > 0)) continue;
      const ea = extent(a), eb = extent(b);
      const want = nat * 0.75, now = eb[0] - ea[1];
      if (now < want) { const d = (want - now) / 2; a.W.dx -= d; b.W.dx += d; }
    }
  }
}

// transformación natural -> natural de la letra i
function letterTransform(pv, insts, i) {
  const P = pv.plan[i], W = P.word, it = insts[i];
  const base = W.base, L = pv.L;
  const cr = Math.cos(P.rot), sr = Math.sin(P.rot), cw = Math.cos(W.rot), sw = Math.sin(W.rot);
  const sx = P.sc * P.ax, sy = P.sc / Math.sqrt(P.ax);
  const ws = pv.waveSeed.get(it.line);
  const waveA = W.em * (0.03 + 0.06 * L) * (W.vf == null ? 1 : W.vf), waveL = W.em * 4.5;
  return (x, y) => {
    x += P.warpA * R.noise2(x / P.warpL, y / P.warpL, P.seed);
    y += P.warpA * R.noise2(x / P.warpL + 9.1, y / P.warpL, P.seed + 1);
    let u = (x - P.cx) * sx, v = (y - base) * sy;
    u -= v * P.shear;
    let X = cr * u - sr * v + P.cx + P.shift, Y = sr * u + cr * v + base + P.dy;
    u = (X - W.cx) * W.sc; v = (Y - base) * W.sc;
    u -= v * W.shear;
    X = cw * u - sw * v + W.cx + W.dx; Y = sw * u + cw * v + base + W.dy;
    Y += waveA * R.noise1(X / waveL, ws);
    return [X, Y];
  };
}

// ------------------------------------------------------------------ herramientas de trazo
function drawStrokes(canvas, it, f, tool, p, seed) {
  // letras estiradas o estrechadas: los trazos salen de la letra sin deformar y luego se estiran
  // (como haría una mano: el esqueleto se estira, el grosor de la herramienta no)
  const P = INK.preset(p.tool, p.preset);
  const ax = it.ax || 1, useNat = ax !== 1 && it.natContours;
  // calco guiado (letra de trazo correcta ajustada a la forma de la fuente); si no encaja, el esqueleto
  const cs = useNat ? it.natContours : it.contours, cb = useNat ? it.natBbox : it.bbox;
  let gs0 = p.guided === false ? null : (() => { const g = CA.guidedStrokes(cs, cb, it.em, it.ch); return g ? { strokes: g } : null; })();
  if (!gs0) gs0 = ST.strokesForContours(cs, cb, it.em, it.ch);
  const rf = Math.min(1, ax);
  const gs = useNat ? { strokes: gs0.strokes.map(st => Object.assign({}, st, { pts: st.pts.map(q => ({ x: q.x * ax, y: q.y, r: q.r * rf })) })) } : gs0;
  const em = it.em, L = p.locura, pulso = p.pulso;
  const full = (x, y) => { const q = f(x, y); return it.map(q[0], q[1]); };
  const cx = (it.bbox.left + it.bbox.right) / 2, cy = (it.bbox.top + it.bbox.bottom) / 2;
  const ls = RD.localScale(full, cx, cy, em * 0.05).s;
  // grosor: el de la herramienta o el de la letra (p.follow: 'auto' | 'letra' | 'herramienta')
  const follow = p.follow === 'letra' ? true : p.follow === 'herramienta' ? false : !!P.useFont;
  const wMul = p.width == null ? 1 : p.width;
  const toolR = P.w * (it.strokeEm || em) * wMul;
  const rgb = RD.hexToRgb(it.color);
  gs.strokes.forEach((s, si) => {
    const r = R.mulberry32(seed * 13 + si * 977 + 1);
    let mx = 0, my = 0; for (const q of s.pts) { mx += q.x; my += q.y; } mx /= s.pts.length; my /= s.pts.length;
    const jx = R.gauss(r) * em * (0.006 + 0.03 * L), jy = R.gauss(r) * em * (0.006 + 0.03 * L), jr = R.gauss(r) * (0.015 + 0.07 * L);
    const cj = Math.cos(jr), sj = Math.sin(jr);
    let pts = s.pts.map(q => { const dx = q.x - mx, dy = q.y - my; return { x: mx + cj * dx - sj * dy + jx, y: my + sj * dx + cj * dy + jy, r: q.r }; });
    const trim = (arr, rad) => { let acc = 0, k = arr.length - 1; while (k > 2 && acc < rad) { acc += Math.hypot(arr[k].x - arr[k - 1].x, arr[k].y - arr[k - 1].y); k--; } return arr.slice(0, k + 1); };
    if (!s.closed && s.endJ && pts.length > 4) pts = trim(pts, pts[pts.length - 1].r * 0.6);
    if (!s.closed && s.startJ && pts.length > 4) pts = trim(pts.reverse(), pts[0].r * 0.6).reverse();
    if (!s.closed && !s.dot && pts.length > 3) {
      const e0 = Math.max(-0.12, Math.min(0.08, R.gauss(r) * (0.03 + 0.06 * L))), e1 = Math.max(-0.12, Math.min(0.08, R.gauss(r) * (0.03 + 0.06 * L)));
      const extend = (arr, e) => {
        const n = arr.length;
        if (e < 0) { const cut = Math.min(n - 3, Math.round(n * Math.min(0.2, -e))); return arr.slice(0, n - cut); }
        const a = arr[n - 1], b = arr[Math.max(0, n - 4)];
        const dx = a.x - b.x, dy = a.y - b.y, dl = Math.hypot(dx, dy) || 1;
        let total = 0; for (let k = 1; k < n; k++) total += Math.hypot(arr[k].x - arr[k - 1].x, arr[k].y - arr[k - 1].y);
        const add = Math.min(e * total, em * 0.045), nAdd = Math.max(1, Math.round(add / (em * 0.01)));
        const out = arr.slice();
        for (let k = 1; k <= nAdd; k++) out.push({ x: a.x + dx / dl * add * k / nAdd, y: a.y + dy / dl * add * k / nAdd, r: a.r });
        return out;
      };
      pts = extend(pts, e1).reverse();
      pts = extend(pts, e0).reverse();
    }
    // pincel: algunos trazos verticales empiezan por abajo
    if (P.up && pts.length > 2) {
      const a = pts[0], b = pts[pts.length - 1];
      if (Math.abs(b.y - a.y) > 1.6 * Math.abs(b.x - a.x) && r() < P.up) pts = pts.slice().reverse();
    }
    const tremA = em * (0.002 + 0.009 * pulso) * P.tremor, tremL = em * 0.05;
    const rMed = follow ? pts.map(q => q.r).sort((a, b) => a - b)[pts.length >> 1] || toolR : toolR;
    let acc = 0;
    const doc = pts.map((q, k) => {
      if (k > 0) acc += Math.hypot(q.x - pts[k - 1].x, q.y - pts[k - 1].y);
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
      const n = tremA * R.noise1(acc / tremL, seed + si * 3);
      const d = full(q.x - ty / tl * n, q.y + tx / tl * n);
      return { x: d[0], y: d[1], w: follow ? Math.max(0.3, q.r / Math.max(1e-6, rMed)) : 1 };
    });
    INK.paintStroke(canvas, doc, P, Math.max(0.5, rMed * ls * (follow ? wMul : 1)), rgb, (seed * 7 + si) >>> 0, { inkMul: 0.88 + 0.24 * p.ink, dryMul: 0.45 + 1.1 * p.ink });
    // repasado (pack «nervioso»)
    if (P.extraPass) {
      const off = em * 0.012;
      const d2 = doc.map(q => ({ x: q.x + R.gauss(r) * 0 + off * ls, y: q.y - off * ls * 0.6, w: q.w }));
      INK.paintStroke(canvas, d2, P, Math.max(0.5, rMed * ls * (follow ? wMul : 1)) * 0.9, rgb, (seed * 11 + si) >>> 0, { inkMul: 0.8, alphaMul: 0.9 });
    }
  });
}

// ------------------------------------------------------------------ herramientas de relleno
// contornos con borde vivo (ondulación + rugosidad), transformados al documento
function roughOutline(it, full, tool, p, seed) {
  const em = it.em, L = p.locura, ink = p.ink;
  const step = em / 70;
  const out = [];
  it.contours.forEach((segs, ci) => {
    const pl = G.flattenSegs(segs, em / 400, step);
    const n = pl.length / 2;
    if (n < 3) return;
    const q = new Float64Array(pl.length);
    let acc = 0;
    for (let k = 0; k < n; k++) {
      const a = (k - 1 + n) % n, b = (k + 1) % n;
      const tx = pl[2 * b] - pl[2 * a], ty = pl[2 * b + 1] - pl[2 * a + 1], tl = Math.hypot(tx, ty) || 1;
      if (k > 0) acc += Math.hypot(pl[2 * k] - pl[2 * k - 2], pl[2 * k + 1] - pl[2 * k - 1]);
      const s = seed + ci * 13;
      const d = em * ((tool.edgeLow * (0.6 + L)) * R.noise1(acc / (em * 0.22), s) + (tool.edgeHigh * (0.5 + ink)) * R.noise1(acc / (em * 0.03), s + 5)
        + (tool.edgeHash ? tool.edgeHash * (0.4 + ink) * (R.hash2(k, ci, s) * 2 - 1) : 0));
      const x = pl[2 * k] + ty / tl * d, y = pl[2 * k + 1] - tx / tl * d;
      const m = full(x, y);
      q[2 * k] = m[0]; q[2 * k + 1] = m[1];
    }
    out.push(q);
  });
  return out;
}

function drawFill(canvas, it, f, tool, p, seed) {
  const full = (x, y) => { const q = f(x, y); return it.map(q[0], q[1]); };
  const polys = roughOutline(it, full, tool, p, seed);
  const rl = RD.rasterLocal(polys, canvas, 3);
  if (!rl) return;
  const { cov, x0, y0, w, h } = rl;
  const em = it.em;
  const cx = (it.bbox.left + it.bbox.right) / 2, cy = (it.bbox.top + it.bbox.bottom) / 2;
  const emPx = em * RD.localScale(full, cx, cy, em * 0.05).s;
  const ink = p.ink, grain = grainTile(p.paperSeed || 99);
  const rgb = RD.hexToRgb(it.color);
  const out = new Float32Array(w * h);
  if (tool === TOOLS.brocha) {
    // la textura sigue la dirección de los trazos de la letra
    const buf = { x0, y0, w, h, depth: new Float32Array(w * h).fill(-1e9), ink: new Float32Array(w * h) };
    const gs = ST.strokesForContours(it.contours, it.bbox, it.em, it.ch);
    const ls = emPx / em;
    gs.strokes.forEach((s, si) => {
      const pts = s.pts.map(q => { const d = full(q.x, q.y); return { x: d[0], y: d[1], r: Math.max(0.6, q.r * ls * 1.25) }; });
      const S = prepStroke(pts, tool, seed * 5 + si);
      if (S) strokeInto(buf, S, tool, seed * 5 + si, { paperSeed: p.paperSeed, inkMul: 1, dryness: 0.3 + 1.3 * ink, noGrain: true, clip: cov });
    });
    for (let k = 0; k < w * h; k++) {
      const c = cov[k];
      if (c <= 0) continue;
      let v = buf.depth[k] > -1e8 ? buf.ink[k] : tool.density * 0.97;
      const px = x0 + (k % w), py = y0 + ((k / w) | 0);
      const g = grain[((py & 255) << 8) | (px & 255)];
      v *= 1 - tool.grain * (0.3 + 0.7 * ink) * g * g;
      out[k] = c * v;
    }
  } else {
    // sello / linograbado: tinta irregular, motas blancas, rayas de gubia
    const r = R.mulberry32(seed + 77);
    const scr = [];
    if (emPx > 26) {
      const nS = Math.round(R.gauss(r) * 0.8 + 1 + 2.5 * ink);
      for (let s = 0; s < nS; s++) {
        const a = (r() - 0.5) * 0.9 + (r() < 0.5 ? 0 : Math.PI / 2), len = emPx * (0.18 + 0.4 * r());
        const sx = x0 + r() * w, sy = y0 + r() * h;
        scr.push([sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len, Math.max(0.6, emPx * (0.008 + 0.012 * r()))]);
      }
    }
    const sp = Math.max(1.2, emPx * 0.05), thr = 0.72 - 0.2 * ink;
    for (let k = 0; k < w * h; k++) {
      const c = cov[k];
      if (c <= 0) continue;
      const px = x0 + (k % w), py = y0 + ((k / w) | 0);
      let v = tool.density;
      v *= 1 - (0.1 + 0.15 * ink) * (R.fbm2(px / (emPx * 0.9), py / (emPx * 0.9), seed + 3, 2) * 0.5 + 0.5);
      const n = R.noise2(px / sp, py / sp, seed + 11) * 0.6 + (R.hash2(px >> 1, py >> 1, seed) - 0.5) * 0.5;
      v *= 1 - smooth01(thr, thr + 0.1, n);
      for (const [ax, ay, bx, by, wd] of scr) {
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
        if (d < wd + 1) v *= smooth01(wd - 0.5, wd + 1, d);
      }
      const g = grain[((py & 255) << 8) | (px & 255)];
      v *= 1 - tool.grain * (0.3 + 0.7 * ink) * g * g * g;
      out[k] = c * Math.max(0, v);
    }
  }
  RD.composite(canvas, out, x0, y0, w, h, rgb, 1);
}

// ------------------------------------------------------------------ entrada principal
// insts: [{ contours, bbox, em, color, word, line, ch, base?, map(x,y)->[X,Y] }]  (espacio "natural")
// p: { tool, width, locura, pulso, prisa, tight, ink, paperSeed }
// only(i): opcional, dibuja solo algunas letras (para pintar por franjas sin cambiar la variación)
function renderHand(canvas, insts, p, seed, only, pvIn) {
  const tool = p.fill && TOOLS[p.fill] ? TOOLS[p.fill] : { kind: 'stroke' };
  const pv = pvIn || planVariation(insts, p, seed);
  const q = Object.assign({ paperSeed: seed + 5 }, p);
  let n = 0;
  insts.forEach((it, i) => {
    if (only && !only(i)) return;
    const f = letterTransform(pv, insts, i);
    if (tool.kind === 'fill') drawFill(canvas, it, f, tool, q, seed + i * 31 + 7);
    else drawStrokes(canvas, it, f, tool, q, seed + i * 31 + 7);
    n++;
  });
  return n;
}

module.exports = { TOOLS, renderHand, paintStroke, planVariation, letterTransform };
