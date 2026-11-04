'use strict';
// De una forma rellena (glifo) a TRAZOS como los haría una persona:
// esqueleto -> grafo (puntas y cruces) -> se unen los tramos que siguen rectos en los cruces
// -> cada trazo con dirección (de arriba abajo / izquierda a derecha; los óvalos en sentido antihorario)
// y su grosor local. Sin dependencias de Photoshop.

const { Raster } = require('./raster.js');

function edt(bin, w, h) {
  // distancia euclídea aproximada (chamfer 5-7-11 / 5)
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = bin[i] ? INF : 0;
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  const fw = [[-1, 0, 5], [0, -1, 5], [-1, -1, 7], [1, -1, 7], [-2, -1, 11], [-1, -2, 11], [1, -2, 11], [2, -1, 11]];
  const bw = fw.map(([a, b, c]) => [-a, -b, c]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i]; for (const [a, b, c] of fw) v = Math.min(v, g(x + a, y + b) + c); d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i]; for (const [a, b, c] of bw) v = Math.min(v, g(x + a, y + b) + c); d[i] = v;
  }
  for (let i = 0; i < w * h; i++) d[i] /= 5;
  return d;
}

function thin(img, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
  let changed = true, guard = 0;
  const del = [];
  while (changed && guard++ < 400) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!img[y * w + x]) continue;
        const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
        const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        const sq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0; for (let k = 0; k < 8; k++) if (!sq[k] && sq[k + 1]) A++;
        if (A !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) : (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0)) del.push(y * w + x);
      }
      if (del.length) changed = true;
      for (const i of del) img[i] = 0;
    }
  }
  return img;
}

const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// Quita píxeles redundantes (escalones de 4-conexión): un píxel sobra si sus vecinos siguen unidos sin él
function cleanSkeleton(sk, w, h) {
  const comps = (list) => {
    const seen = new Array(list.length).fill(false);
    let c = 0;
    for (let i = 0; i < list.length; i++) {
      if (seen[i]) continue;
      c++; const st = [i]; seen[i] = true;
      while (st.length) {
        const k = st.pop();
        for (let j = 0; j < list.length; j++) if (!seen[j] && Math.abs(list[j][0] - list[k][0]) <= 1 && Math.abs(list[j][1] - list[k][1]) <= 1) { seen[j] = true; st.push(j); }
      }
    }
    return c;
  };
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!sk[y * w + x]) continue;
      const n = [];
      for (const [a, b] of N8) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx]) n.push([xx, yy]); }
      if (n.length < 2) continue;
      if (comps(n) !== 1) continue;
      // no acortar puntas: si algún vecino quedaría como punta nueva, se respeta
      let makesEnd = false;
      for (const [xx, yy] of n) {
        let c = 0;
        for (const [a, b] of N8) { const x2 = xx + a, y2 = yy + b; if ((x2 !== x || y2 !== y) && x2 >= 0 && y2 >= 0 && x2 < w && y2 < h && sk[y2 * w + x2]) c++; }
        if (c <= 1 && n.length <= 2) { makesEnd = true; break; }
      }
      if (makesEnd) continue;
      sk[y * w + x] = 0; changed = true;
    }
    if (!changed) break;
  }
  return sk;
}

// Esqueleto -> lista de tramos (polilíneas de píxeles) entre nodos
function graphOf(sk, w, h) {
  cleanSkeleton(sk, w, h);
  const nb = (i) => { const x = i % w, y = (i / w) | 0, o = []; for (const [a, b] of N8) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx]) o.push(yy * w + xx); } return o; };
  const deg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (sk[i]) deg[i] = nb(i).length;
  const nodeId = new Int32Array(w * h).fill(-1);
  const nodes = [];
  for (let i = 0; i < w * h; i++) {
    if (!sk[i] || deg[i] === 2 || nodeId[i] >= 0) continue;
    const id = nodes.length, stack = [i], px = [];
    nodeId[i] = id;
    while (stack.length) {
      const c = stack.pop(); px.push(c);
      if (deg[c] >= 3) for (const n of nb(c)) if (deg[n] >= 3 && nodeId[n] < 0) { nodeId[n] = id; stack.push(n); }
    }
    let sx = 0, sy = 0; for (const p of px) { sx += p % w; sy += (p / w) | 0; }
    nodes.push({ id, x: sx / px.length, y: sy / px.length, px, end: deg[i] === 1 });
  }
  const used = new Uint8Array(w * h);
  const edges = [];
  for (const n of nodes) {
    for (const p of n.px) for (const q0 of nb(p)) {
      if (nodeId[q0] === n.id || used[q0]) continue;
      const path = [];
      let prev = p, cur = q0, to = -1;
      for (let guard = 0; guard < w * h; guard++) {
        if (nodeId[cur] >= 0) { to = nodeId[cur]; break; }
        path.push(cur); used[cur] = 1;
        const nx = nb(cur).filter(m => m !== prev && (!used[m] || nodeId[m] >= 0) && !(nodeId[m] === n.id && path.length < 2));
        if (!nx.length) break;
        // si hay varias opciones, la que sigue la dirección
        let best = nx[0];
        if (nx.length > 1) {
          const dx0 = (cur % w) - (prev % w), dy0 = ((cur / w) | 0) - ((prev / w) | 0);
          let bs = -9;
          for (const m of nx) { const dx = (m % w) - (cur % w), dy = ((m / w) | 0) - ((cur / w) | 0); const sc = (dx * dx0 + dy * dy0) / (Math.hypot(dx, dy) * Math.hypot(dx0, dy0) || 1) + (nodeId[m] >= 0 ? 0.5 : 0); if (sc > bs) { bs = sc; best = m; } }
        }
        prev = cur; cur = best;
      }
      if (path.length || to >= 0) edges.push({ a: n.id, b: to, px: path });
    }
  }
  // bucles sin nodos (o, 0)
  for (let i = 0; i < w * h; i++) {
    if (!sk[i] || used[i] || nodeId[i] >= 0) continue;
    const loop = [];
    let prev = -1, cur = i;
    for (let guard = 0; guard < w * h; guard++) {
      loop.push(cur); used[cur] = 1;
      const nx = nb(cur).filter(m => m !== prev && !used[m]);
      if (!nx.length) break;
      prev = cur; cur = nx[0];
    }
    if (loop.length > 6) edges.push({ a: -1, b: -1, px: loop, loop: true });
  }
  return { nodes, edges };
}

function smoothPts(pts, win) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    let sx = 0, sy = 0, sr = 0, c = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(pts.length - 1, i + win); k++) { sx += pts[k].x; sy += pts[k].y; sr += pts[k].r; c++; }
    out.push({ x: i === 0 || i === pts.length - 1 ? pts[i].x : sx / c, y: i === 0 || i === pts.length - 1 ? pts[i].y : sy / c, r: sr / c });
  }
  return out;
}
function resample(pts, step, closed) {
  if (pts.length < 2) return pts;
  const src = closed ? pts.concat([pts[0]]) : pts;
  const out = [src[0]];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1], b = src[i];
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    let t0 = 0;
    while (acc + d * (1 - t0) >= step) {
      const need = step - acc;
      const t = t0 + need / d;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: a.r + (b.r - a.r) * t });
      t0 = t; acc = 0;
      if (t0 >= 1) break;
    }
    acc += d * (1 - t0);
  }
  if (!closed) { const l = src[src.length - 1]; const o = out[out.length - 1]; if (Math.hypot(l.x - o.x, l.y - o.y) > step * 0.3) out.push(l); }
  return out;
}
const dirOf = (pts, fromStart, n) => {
  const k = Math.min(pts.length - 1, n);
  if (fromStart) { const a = pts[0], b = pts[k]; const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return [(b.x - a.x) / l, (b.y - a.y) / l]; }
  const a = pts[pts.length - 1], b = pts[pts.length - 1 - k]; const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return [(b.x - a.x) / l, (b.y - a.y) / l];
};

// bin: Uint8 (1 = tinta). Devuelve trazos en píxeles: [{pts:[{x,y,r}], closed}]
function strokesFromBitmap(bin, w, h) {
  const dt = edt(bin, w, h);
  const sk = thin(bin.slice(), w, h);
  const { nodes, edges } = graphOf(sk, w, h);
  const R = i => Math.max(0.6, dt[i]);
  let E = edges.map(e => ({
    a: e.a, b: e.b, loop: !!e.loop,
    pts: e.px.map(i => ({ x: (i % w) + 0.5, y: ((i / w) | 0) + 0.5, r: R(i) }))
  }));
  // añade la posición del nodo en los extremos (para que los tramos lleguen al cruce)
  for (const e of E) {
    if (e.loop) continue;
    if (e.a >= 0) { const n = nodes[e.a]; e.pts.unshift({ x: n.x + 0.5, y: n.y + 0.5, r: e.pts[0] ? e.pts[0].r : 1 }); }
    if (e.b >= 0) { const n = nodes[e.b]; e.pts.push({ x: n.x + 0.5, y: n.y + 0.5, r: e.pts[e.pts.length - 1] ? e.pts[e.pts.length - 1].r : 1 }); }
  }
  const medR = (() => { const a = []; for (const e of E) for (const p of e.pts) a.push(p.r); a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 1; })();
  // poda de espuelas: tramos cortos que acaban en punta y salen de un cruce
  const degree = new Map();
  const bump = id => degree.set(id, (degree.get(id) || 0) + 1);
  for (const e of E) { if (e.a >= 0) bump(e.a); if (e.b >= 0) bump(e.b); }
  E = E.filter(e => {
    if (e.loop) return true;
    const len = e.pts.length;
    const aEnd = e.a >= 0 && nodes[e.a].end, bEnd = e.b >= 0 && nodes[e.b].end;
    const toJ = (aEnd && e.b >= 0 && (degree.get(e.b) || 0) >= 3) || (bEnd && e.a >= 0 && (degree.get(e.a) || 0) >= 3);
    if (toJ && len < Math.max(4, medR * 1.6)) { if (e.a >= 0) degree.set(e.a, degree.get(e.a) - 1); if (e.b >= 0) degree.set(e.b, degree.get(e.b) - 1); return false; }
    if (aEnd && bEnd && len < 3) return false;
    return true;
  });
  // suaviza y limita el grosor en los cruces (allí la distancia se infla)
  for (const e of E) {
    const rs = e.pts.map(p => p.r).sort((x, y) => x - y);
    const med = rs[rs.length >> 1] || medR;
    for (const p of e.pts) p.r = Math.min(p.r, med * 1.25);
    e.pts = smoothPts(e.pts, 2);
  }
  // emparejar tramos en cada nodo: el que sigue más recto continúa el mismo trazo
  const ends = new Map(); // nodo -> [{e, atStart}]
  E.forEach((e, k) => {
    if (e.loop) return;
    if (e.a >= 0) { if (!ends.has(e.a)) ends.set(e.a, []); ends.get(e.a).push({ k, atStart: true }); }
    if (e.b >= 0) { if (!ends.has(e.b)) ends.set(e.b, []); ends.get(e.b).push({ k, atStart: false }); }
  });
  const link = new Map(); // "k:s" -> {k, atStart}
  for (const [, list] of ends) {
    if (list.length < 2) continue;
    const dirs = list.map(x => dirOf(E[x.k].pts, x.atStart, 6));
    const pairs = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (list[i].k === list[j].k) continue;
      const s = -(dirs[i][0] * dirs[j][0] + dirs[i][1] * dirs[j][1]);
      pairs.push({ i, j, s });
    }
    pairs.sort((a, b) => b.s - a.s);
    const taken = new Set();
    for (const p of pairs) {
      if (p.s < (list.length === 2 ? 0.2 : 0.55) || taken.has(p.i) || taken.has(p.j)) continue;
      taken.add(p.i); taken.add(p.j);
      const A = list[p.i], B = list[p.j];
      link.set(A.k + ':' + (A.atStart ? 0 : 1), B);
      link.set(B.k + ':' + (B.atStart ? 0 : 1), A);
    }
  }
  // recorrer cadenas
  const done = new Set();
  const strokes = [];
  const orient = (e, atStart) => (atStart ? e.pts : e.pts.slice().reverse());
  for (let k = 0; k < E.length; k++) {
    if (done.has(k)) continue;
    const e = E[k];
    if (e.loop) { done.add(k); strokes.push({ pts: e.pts, closed: true }); continue; }
    // ir al principio de la cadena
    let ck = k, cStart = true, guard = 0;
    for (;;) {
      const back = link.get(ck + ':' + (cStart ? 0 : 1));
      if (!back || back.k === k || guard++ > 50) break;
      ck = back.k; cStart = !back.atStart;
    }
    let pts = [];
    let cur = { k: ck, atStart: cStart };
    let closed = false;
    guard = 0;
    while (cur && !done.has(cur.k) && guard++ < 60) {
      done.add(cur.k);
      const seg = orient(E[cur.k], cur.atStart);
      pts = pts.length ? pts.concat(seg.slice(1)) : seg.slice();
      const nxt = link.get(cur.k + ':' + (cur.atStart ? 1 : 0));
      if (nxt && nxt.k === ck && pts.length > 8) { closed = true; break; }
      cur = nxt ? { k: nxt.k, atStart: nxt.atStart } : null;
    }
    if (pts.length >= 2) strokes.push({ pts, closed });
  }
  // puntos sueltos (i, j, :, .): manchas sin trazo -> trazo muy corto
  const covered = new Uint8Array(w * h);
  for (const e of E) for (const p of e.pts) covered[(p.y | 0) * w + (p.x | 0)] = 1;
  {
    const lab = new Int32Array(w * h).fill(-1);
    let nl = 0;
    for (let i = 0; i < w * h; i++) {
      if (!bin[i] || lab[i] >= 0) continue;
      const st = [i]; lab[i] = nl; const px = [];
      while (st.length) { const c = st.pop(); px.push(c); const x = c % w, y = (c / w) | 0; for (const [a, b] of N8) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { const j = yy * w + xx; if (bin[j] && lab[j] < 0) { lab[j] = nl; st.push(j); } } } }
      nl++;
      const hasStroke = strokes.some(s => s.pts.some(p => lab[(p.y | 0) * w + (p.x | 0)] === nl - 1));
      if (!hasStroke && px.length >= 3) {
        let sx = 0, sy = 0, rmax = 0;
        for (const c of px) { sx += c % w; sy += (c / w) | 0; rmax = Math.max(rmax, dt[c]); }
        const cx = sx / px.length + 0.5, cy = sy / px.length + 0.5, rr = Math.max(0.8, rmax * 0.9);
        strokes.push({ pts: [{ x: cx - rr * 0.25, y: cy - rr * 0.2, r: rr }, { x: cx + rr * 0.25, y: cy + rr * 0.2, r: rr }], closed: false, dot: true });
      }
    }
  }
  const junctions = nodes.filter(n => !n.end && (degree.get(n.id) || 0) >= 3);
  const nearJ = (p) => junctions.some(n => Math.hypot(n.x + 0.5 - p.x, n.y + 0.5 - p.y) < Math.max(2, p.r * 1.2));
  for (const s of strokes) if (!s.closed && !s.dot) { s.startJ = nearJ(s.pts[0]); s.endJ = nearJ(s.pts[s.pts.length - 1]); }
  // dirección y orden de escritura
  for (const s of strokes) {
    if (s.dot) { s.key = Math.round(s.pts[0].x / 6) * 1000 + s.pts[0].y; continue; }
    s.pts = resample(s.pts, 1.5, s.closed);
    if (s.closed) {
      let top = 0;
      for (let i = 1; i < s.pts.length; i++) if (s.pts[i].y < s.pts[top].y - 0.01 || (Math.abs(s.pts[i].y - s.pts[top].y) < 0.01 && s.pts[i].x > s.pts[top].x)) top = i;
      s.pts = s.pts.slice(top).concat(s.pts.slice(0, top));
      // antihorario visto en pantalla: desde arriba hacia la izquierda
      const n = s.pts.length, a = s.pts[Math.min(n - 1, 4)];
      if (a.x > s.pts[0].x) s.pts = [s.pts[0]].concat(s.pts.slice(1).reverse());
    } else {
      const a = s.pts[0], b = s.pts[s.pts.length - 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const flip = Math.abs(dx) > Math.abs(dy) * 1.2 ? dx < 0 : dy < 0;
      if (flip) { s.pts.reverse(); const t = s.startJ; s.startJ = s.endJ; s.endJ = t; }
    }
    let minx = Infinity, miny = Infinity;
    for (const p of s.pts) { minx = Math.min(minx, p.x); miny = Math.min(miny, p.y); }
    s.key = Math.round(minx / 6) * 1000 + miny;
  }
  strokes.sort((a, b) => a.key - b.key);
  return { strokes, medR };
}

// Trazos de un glifo a partir de sus contornos (segmentos cúbicos, y hacia abajo). Cacheado por forma.
const G = require('./geom.js');
const glyphCache = new Map();

function contourKey(contours, bbox, em) {
  const k = 200 / Math.max(1e-6, em);
  let h = 2166136261 >>> 0, n = 0;
  for (const segs of contours) for (const sg of segs) for (let i = 0; i < 8; i += 2) {
    const x = Math.round((sg[i] - bbox.left) * k), y = Math.round((sg[i + 1] - bbox.top) * k);
    h = Math.imul(h ^ (x & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ (y & 0xffff), 16777619) >>> 0; n++;
  }
  return h.toString(36) + ':' + n + ':' + Math.round((bbox.right - bbox.left) * k) + 'x' + Math.round((bbox.bottom - bbox.top) * k);
}

// devuelve los trazos colocados en la posición de este glifo (la caché guarda la forma relativa)
function strokesForContours(contours, bbox, em, ch) {
  const key = contourKey(contours, bbox, em) + (STEM_CHARS.has(ch) ? '|a' : '');
  let rel = glyphCache.get(key);
  if (!rel) {
    const abs = strokesAbs(contours, bbox, em, ch);
    rel = { medR: abs.medR / em, strokes: abs.strokes.map(st => Object.assign({}, st, { pts: st.pts.map(p => ({ x: (p.x - bbox.left) / em, y: (p.y - bbox.top) / em, r: p.r / em })) })) };
    if (glyphCache.size > 5000) glyphCache.clear();
    glyphCache.set(key, rel);
  }
  return { medR: rel.medR * em, strokes: rel.strokes.map(st => Object.assign({}, st, { pts: st.pts.map(p => ({ x: bbox.left + p.x * em, y: bbox.top + p.y * em, r: p.r * em })) })) };
}

function strokesAbs(contours, bbox, em, ch) {
  let res = { strokes: [], medR: 0 };
  let E = 170;
  for (let attempt = 0; attempt < 2; attempt++) {
    const sc = E / Math.max(1e-6, em), pad = 4;
    const w = Math.ceil((bbox.right - bbox.left) * sc) + pad * 2, h = Math.ceil((bbox.bottom - bbox.top) * sc) + pad * 2;
    if (w * h > 2.5e6 || w < 3 || h < 3) break;
    const r = new Raster(w, h);
    for (const segs of contours) {
      const pl = G.flattenSegs(segs, 0.35 / sc);
      const q = new Float64Array(pl.length);
      for (let i = 0; i < pl.length; i += 2) { q[i] = (pl[i] - bbox.left) * sc + pad; q[i + 1] = (pl[i + 1] - bbox.top) * sc + pad; }
      r.poly(q);
    }
    const cov = r.coverage();
    const bin = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) bin[i] = cov[i] > 0.5 ? 1 : 0;
    const out = strokesFromBitmap(bin, w, h);
    if (out.medR < 3.5 && attempt === 0) { E = Math.min(520, Math.round(E * 4 / Math.max(1, out.medR))); continue; }
    const inv = 1 / sc;
    res = {
      medR: out.medR * inv,
      strokes: out.strokes.map(s => ({
        closed: s.closed, dot: !!s.dot, startJ: !!s.startJ, endJ: !!s.endJ,
        pts: s.pts.map(p => ({ x: (p.x - pad) * inv + bbox.left, y: (p.y - pad) * inv + bbox.top, r: p.r * inv }))
      }))
    };
    break;
  }
  if (STEM_CHARS.has(ch)) res = addStem(res);
  return res;
}

// la "a" de un piso se escribe como óvalo + palo (si no, parece una "o")
const STEM_CHARS = new Set('aáàâäãåɑ'.split(''));
function addStem(base) {
  const loops = base.strokes.filter(s => s.closed);
  if (loops.length !== 1 || base.strokes.length > 2) return base;
  const lp = loops[0].pts;
  let x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of lp) { x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const rs = lp.map(q => q.r).sort((a, b) => a - b), r = rs[rs.length >> 1];
  const others = base.strokes.filter(s => !s.closed);
  const covered = others.some(s => { let ya = Infinity, yb = -Infinity, near = 0; for (const q of s.pts) if (q.x > x1 - r * 2) { near++; ya = Math.min(ya, q.y); yb = Math.max(yb, q.y); } return near > 3 && yb - ya > (y1 - y0) * 0.6; });
  if (covered) return base;
  const x = x1 - r * 0.6, n = 24, top = y0 + r * 0.3, bot = y1 + r * 0.9;
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push({ x, y: top + (bot - top) * k / n, r });
  return { medR: base.medR, strokes: base.strokes.concat([{ closed: false, pts }]) };
}

module.exports = { strokesFromBitmap, strokesForContours, edt, thin, graphOf };

