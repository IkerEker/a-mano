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
const NG = require('./negativo.js');

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

// parte un trazo (en px) en los vértices muy cerrados; cada lado llega afilado al pico
function splitAtPeaks(pts, r, lim, sharp, overR) {
  const n = pts.length;
  if (n < 5) return [pts];
  // dirección media a cada lado, en una ventana de ~1,2 anchos
  let L = 0; const S = [0];
  for (let i = 1; i < n; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); S.push(L); }
  const win = Math.max(2, r * 2.4);
  const turn = new Float32Array(n);
  let j0 = 0, j1 = 0;
  for (let i = 1; i < n - 1; i++) {
    while (j0 < i && S[i] - S[j0] > win) j0++;
    while (j1 < n - 1 && S[j1] - S[i] < win) j1++;
    const ax = pts[i].x - pts[j0].x, ay = pts[i].y - pts[j0].y, bx = pts[j1].x - pts[i].x, by = pts[j1].y - pts[i].y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < win * 0.5 || lb < win * 0.5) continue;
    turn[i] = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))));
  }
  const cuts = [];
  const LIM = lim || 1.95; // ~112°: vértices de A, M, N, V, W, Z (no las esquinas de la E o la L)
  for (let i = 2; i < n - 2; i++) {
    if (turn[i] < LIM) continue;
    let best = i; while (best + 1 < n - 2 && turn[best + 1] >= turn[best]) best++;
    if (turn[best] >= LIM && (!cuts.length || S[best] - S[cuts[cuts.length - 1]] > win)) cuts.push(best);
    i = best + 1;
  }
  if (!cuts.length) return [pts];
  // cada lado sigue un poco más allá del pico (se montan: el pico queda lleno, nunca cortado) y sin adelgazar
  // en el corte (los extremos del corte no se afilan ni salen «al vuelo»: cont0/cont1)
  const out = [];
  const over = (overR || r) * 0.55;
  const extend = (seg, atEnd) => {
    const m = seg.length; if (m < 3) return seg;
    const e = atEnd ? seg[m - 1] : seg[0], b = atEnd ? seg[Math.max(0, m - 4)] : seg[Math.min(m - 1, 3)];
    const dx = e.x - b.x, dy = e.y - b.y, l = Math.hypot(dx, dy) || 1;
    const q = { x: e.x + dx / l * over, y: e.y + dy / l * over, w: e.w };
    return atEnd ? seg.concat([q]) : [q].concat(seg);
  };
  let a = 0;
  cuts.push(n - 1);
  for (let k = 0; k < cuts.length; k++) {
    const c = cuts[k];
    let seg = pts.slice(a, c + 1).map(q => Object.assign({}, q));
    if (k > 0) seg = extend(seg, false);
    if (k < cuts.length - 1) seg = extend(seg, true);
    if (sharp !== false) { if (k > 0) sharpen(seg, r, true, false); if (k < cuts.length - 1) sharpen(seg, r, false, true); }
    seg.cont0 = k > 0; seg.cont1 = k < cuts.length - 1;
    out.push(seg); a = c;
  }
  return out;
}
// afila un extremo: el grosor baja hacia la punta (start: el inicio, end: el final)
function sharpen(pc, r, start, end) {
  const n = pc.length; if (n < 2) return;
  const D = r * 2.2;
  const go = (from, step) => {
    let acc = 0;
    for (let k = from; k >= 0 && k < n; k += step) {
      if (k !== from) acc += Math.hypot(pc[k].x - pc[k - step].x, pc[k].y - pc[k - step].y);
      if (acc > D) break;
      const t = acc / D;
      pc[k].w = Math.min(pc[k].w == null ? 1 : pc[k].w, 0.72 + 0.28 * t * t * (3 - 2 * t));
    }
  };
  if (start) go(0, 1);
  if (end) go(n - 1, -1);
}
function taperEnds(pc, r, flick, rs) {
  const n = pc.length; if (n < 3) return;
  // casi siempre el final; a veces también la entrada
  let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(pc[i].x - pc[i - 1].x, pc[i].y - pc[i - 1].y);
  const D = Math.min(L * 0.3, r * (3 + 3 * rs()) * flick);
  const go = (from, step, min) => {
    let acc = 0;
    for (let k = from; k >= 0 && k < n; k += step) {
      if (k !== from) acc += Math.hypot(pc[k].x - pc[k - step].x, pc[k].y - pc[k - step].y);
      if (acc > D) break;
      const t = acc / D;
      pc[k].w = Math.min(pc[k].w == null ? 1 : pc[k].w, min + (1 - min) * Math.sqrt(t));
    }
  };
  if (!pc.cont1 && rs() < 0.75) go(n - 1, -1, 0.3);
  if (!pc.cont0 && rs() < 0.3) go(0, 1, 0.5);
}

// ------------------------------------------------------------------ plan: trazos en px del documento
// lay: layoutInShape(...). Devuelve [{ pts:[{x,y}], r, seed, P, box, alpha }]
function plan(lay, p, seed) {
  const P = INK.preset(p.tool, p.preset);
  const persona = FN.styleOf(p.persona);
  // (la cursiva de algunas manos tiene su propio grosor: gorda la redondita, fina la de invitación)
  const wK = p.mode === 'cursiva' && persona.weightS ? persona.weightS : persona.weight;
  const auto = !!lay.auto;
  // en «autoencajar» las letras ya están encajadas al milímetro: la variación es más contenida
  const c = chaosOf(p) * (auto ? 0.55 : 1);
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
    const k = auto ? 0 : 1;   // en autoencajar las palabras no se mueven ni crecen (se montarían)
    wordT.set(L.word, { rot: g(r) * (0.006 + 0.05 * c) * k, sc: Math.exp(g(r) * (0.015 + 0.06 * c) * k), dy: g(r) * (0.01 + 0.06 * c) * persona.bounce * k, dx: g(r) * 0.03 * c * k, slant: (p.prisa || 0) * 0.3 + g(r) * 0.05 * c * (auto ? 0.3 : 1) });
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
  // ritmo (no en autoencajar: ahí todo está medido): cada línea con su pendiente (la mano sube o baja al escribir) y,
  // a lo largo del texto, la inclinación y el tamaño derivan despacio (no letra a letra)
  const lineX0 = new Map(), lineSlope = new Map();
  for (const L of letters) { const x = L.x; if (!lineX0.has(L.line) || x < lineX0.get(L.line)) lineX0.set(L.line, x); }
  for (const [ln] of lineX0) { const rl = R.mulberry32(seed + ln * 4241 + 9); lineSlope.set(ln, auto ? 0 : g(rl) * (0.006 + 0.016 * c) + (p.prisa || 0) * -0.006 + (persona.rise || 0)); }
  // autoencajar: tamaños y posiciones ya están medidos al milímetro; lo que mueve o agranda letras casi no actúa
  const cp = auto ? c * 0.25 : c;
  // ---- letras -> trazos (en el espacio de maquetación)
  const cursiveLetters = [];
  letters.forEach((L, li) => {
    const r = R.mulberry32(seed + li * 104729 + 17);
    const W = wordT.get(L.word), WC = wordC.get(L.word);
    const em = L.size;
    const rot = g(r) * (0.01 + 0.07 * c) * (0.6 + 0.4 * persona.bounce);
    const drift = auto ? 0 : 1;
    const sc = Math.exp(g(r) * (0.02 + 0.09 * cp) * persona.sizeVar * (auto ? 0.4 : 1) + drift * R.noise1(li * 0.09, seed + 661) * (0.025 + 0.035 * c));
    const ax = Math.exp(g(r) * (0.02 + 0.07 * c));
    const shear = g(r) * (0.02 + 0.06 * c) + drift * R.noise1(li * 0.13, seed + 551) * (0.025 + 0.05 * c);
    const ldy = g(r) * (0.008 + 0.05 * cp) * persona.bounce * (auto ? 0.4 : 1);
    const ldx = g(r) * (0.005 + 0.035 * cp);
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
      let X = L.x + x * em * L.sx, Y = L.base + y * em * (L.sy || 1);
      // palabra
      const wcx = (WC.x0 + WC.x1) / 2;
      let U = (X - wcx) * W.sc, V = (Y - L.base) * W.sc;
      U -= V * W.slant;
      const cw = Math.cos(W.rot), sw = Math.sin(W.rot);
      X = wcx + cw * U - sw * V + W.dx * em; Y = L.base + sw * U + cw * V + W.dy * em;
      // línea base que ondula
      if (!auto) Y += em * (0.012 + 0.05 * c) * persona.bounce * R.noise1(X / 3.2, lineSeed(L.line)) + (X - (lineX0.get(L.line) || 0)) * (lineSlope.get(L.line) || 0);
      return [X, Y];
    };
    const strokes = L.g.strokes.map((s, si) => {
      const rs = R.mulberry32(seed + li * 1009 + si * 97 + 5);
      let pts = s.pts;
      if (s.fill) return { pts: pts.map(([x, y]) => [x + g(rs) * 0.006, y + g(rs) * 0.006]).map(tf), closed: true, fill: true, joinable: false, mark: !!s.mark };
      // trazo: pequeño desplazamiento y giro propio (las piezas de la letra no encajan perfecto)
      let mx = 0, my = 0; for (const q of pts) { mx += q[0]; my += q[1]; } mx /= pts.length; my /= pts.length;
      const pcs = persona.piece || 1, jx = g(rs) * (0.003 + 0.015 * c) * pcs, jy = g(rs) * (0.003 + 0.015 * c) * pcs, jr = g(rs) * (0.008 + 0.035 * c);
      const cj = Math.cos(jr), sj = Math.sin(jr);
      pts = pts.map(([x, y]) => [mx + cj * (x - mx) - sj * (y - my) + jx, my + sj * (x - mx) + cj * (y - my) + jy]);
      // poco legible: la mano simplifica
      if (c > 0.35) pts = lowpass(pts, (c - 0.35) * 0.09);
      // extremos: se pasa o se queda corto; los óvalos no siempre cierran
      if (s.closed) {
        // en em: abre un poco el óvalo o se pasa de largo al cerrarlo
        // (rodillo: el lazo siempre se cierra pisándose un poco: queda la costura, no un hueco)
        const open = (0.015 + 0.09 * c) * (0.4 + persona.open) * (P.band ? -1.6 : rs() < 0.6 ? 1 : -0.5);
        pts = trimEnds(pts, 0, -open);
      } else if (pts.length > 3 && !s.mark && !(isScript && L.g.script)) {
        const e0 = Math.max(-0.05, Math.min(0.04, g(rs) * (0.008 + 0.03 * c))), e1 = Math.max(-0.06, Math.min(0.05, g(rs) * (0.01 + 0.035 * c) + (rs() < P.lift ? -0.025 : 0)));
        pts = trimEnds(pts, e0, e1);
      }
      // ---- entradas y salidas de la mano (sutiles): la mano llega al papel desde donde estaba (un ganchito en la
      // dirección de llegada) y al soltar ya va hacia el trazo siguiente (una salida que se afila)
      let tipIn = 0, tipOut = 0;
      if (!s.closed && !s.mark && !(isScript && L.g.script) && pts.length > 3 && plen(pts) > 0.12) {
        const pr = p.prisa || 0, kH = (persona.hook == null ? 1 : persona.hook) * (P.pen ? 0.25 : P.proc === 'spray' ? 0 : 1);   // (el boli apenas hace ganchos; el spray, ninguno)
        const nxt = L.g.strokes[si + 1], prv = L.g.strokes[si - 1];
        const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
        if (rs() < (0.07 + 0.2 * c + 0.12 * pr) * kH) {
          // de dónde llega la mano: del trazo anterior o, si es el primero, de la letra anterior (a la izquierda)
          const st0 = pts[0], t0 = unit(pts[Math.min(3, pts.length - 1)][0] - st0[0], pts[Math.min(3, pts.length - 1)][1] - st0[1]);
          let d = prv && prv.pts && prv.pts.length ? unit(st0[0] - prv.pts[prv.pts.length - 1][0], st0[1] - prv.pts[prv.pts.length - 1][1]) : [1, 0.25];
          d = unit(d[0] * 0.5 + t0[0] * 0.5, d[1] * 0.5 + t0[1] * 0.5);           // nunca un pico cerrado
          const Lh = (0.015 + 0.025 * rs()) * (1 + c);
          pts = [[st0[0] - d[0] * Lh, st0[1] - d[1] * Lh], [st0[0] - d[0] * Lh * 0.4 + t0[0] * Lh * 0.1, st0[1] - d[1] * Lh * 0.4 + t0[1] * Lh * 0.1]].concat(pts);
          tipIn = 2;
        }
        if (rs() < (0.12 + 0.24 * c + 0.2 * pr) * kH) {
          const n = pts.length, e = pts[n - 1], t = unit(e[0] - pts[n - 4][0], e[1] - pts[n - 4][1]);
          let d = nxt && nxt.pts && nxt.pts.length ? unit(nxt.pts[0][0] - e[0], nxt.pts[0][1] - e[1]) : unit(1, -0.5);
          d = unit(t[0] * 0.6 + d[0] * 0.4, t[1] * 0.6 + d[1] * 0.4);
          const Lf = (0.018 + 0.03 * rs()) * (1 + c);
          pts = pts.concat([[e[0] + t[0] * Lf * 0.45 + d[0] * Lf * 0.1, e[1] + t[1] * Lf * 0.45 + d[1] * Lf * 0.1], [e[0] + t[0] * Lf * 0.4 + d[0] * Lf * 0.6, e[1] + t[1] * Lf * 0.4 + d[1] * Lf * 0.6]]);
          tipOut = 2;
        }
      }
      return { pts: pts.map(tf), closed: s.closed, joinable: true, mark: !!s.mark, extra: !!s.extra, tipIn, tipOut };
    });
    // ---- imperfecciones (pocas y sutiles, como las de cualquier mano):
    //  · 1 de cada ~20 letras: un trazo se repasa encima, como cuando sale flojo o torcido y se vuelve a pasar
    //  · 1 de cada ~35: un trazo largo se hace en dos golpes (la mano se levanta y sigue un poco montada)
    const ri = R.mulberry32((seed + li * 7907 + 71) >>> 0);
    const body = strokes.map((st, k) => ({ k, L: st.fill || st.mark ? 0 : plen(st.pts) })).sort((a, b) => b.L - a.L);
    if (body.length && body[0].L > 0.12 * em) {
      if (ri() < 0.05 && !(isScript && L.g.script)) {
        // el palo (el trazo largo) casi siempre; a veces otro
        const pick = body[ri() < 0.7 ? 0 : Math.min(body.length - 1, 1)];
        if (pick.L > 0.12 * em) strokes[pick.k].retrace = true;
      } else if (ri() < 0.03 && P.proc && !(isScript && L.g.script) && body[0].L > 0.45 * em && !strokes[body[0].k].closed) {
        const st0 = strokes[body[0].k], pts = st0.pts, n = pts.length;
        const cut = Math.max(2, Math.min(n - 3, Math.round(n * (0.35 + 0.3 * ri()))));
        const back = Math.max(1, Math.round(n * 0.04));
        const a = pts[cut], b = pts[Math.min(n - 1, cut + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const off = 0.008 * em * (ri() < 0.5 ? -1 : 1);
        const second = pts.slice(Math.max(0, cut - back)).map(q => [q[0] - (b[1] - a[1]) / tl * off, q[1] + (b[0] - a[0]) / tl * off]);
        strokes.splice(body[0].k, 1, Object.assign({}, st0, { pts: pts.slice(0, cut + 1) }), Object.assign({}, st0, { pts: second }));
      }
    }
    const letter = { strokes, joinable: L.g.script && /[a-zñáéíóúü]/i.test(L.g.ch), L, size: em, word: L.word };
    cursiveLetters.push(letter);
  });
  // ---- huecos reales dentro de cada palabra (ya con la variación): ni se tocan ni parecen espacios
  if (!isScript && !auto) {
    const inkW = Math.max(P.w * (p.width == null ? 1 : p.width) * wK, (persona.absW || 0) * (p.width == null ? 1 : p.width));
    const byW = new Map();
    for (const l of cursiveLetters) { if (!byW.has(l.word)) byW.set(l.word, []); byW.get(l.word).push(l); }
    for (const [, ls] of byW) {
      if (ls.length < 2) continue;
      const sl = p.mode === 'mayus' && persona.slantCap != null ? persona.slantCap : persona.slant || 0;
      // (sin las colas: lo que baja de la línea no cuenta para el hueco)
      const ext = ls.map(l => { const run = band => { let a = Infinity, b = -Infinity; for (const s of l.strokes) if (!s.mark || l.strokes.every(t => t.mark)) for (const q of s.pts) { if (band && q[1] > l.L.base + 0.07 * l.size) continue; const x0 = q[0] + (q[1] - l.L.base) * sl; if (x0 < a) a = x0; if (x0 > b) b = x0; } return [a, b]; }; const r = run(true); return isFinite(r[0]) ? r : run(false); });
      const shift = new Array(ls.length).fill(0);
      for (let k = 1; k < ls.length; k++) {
        if (!isFinite(ext[k][0]) || !isFinite(ext[k - 1][1])) { shift[k] = shift[k - 1]; continue; }
        const sz = ls[k].size;
        const narrow = (ext[k][1] - ext[k][0] < 0.14 * sz) || (ext[k - 1][1] - ext[k - 1][0] < 0.14 * sz);
        const minG = persona.overlap != null ? (persona.overlap + 1.6 * inkW) * sz : (Math.min(0.055, (persona.minGap || 0.04) + 0.012) + 2 * inkW + (narrow ? 0.02 : 0)) * sz;
        const maxG = persona.overlap != null ? (persona.overlap + 1.6 * inkW + 0.06) * sz : (0.15 + 2 * inkW + Math.max(0, p.track || 0) + 0.05 * c) * sz;
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
    for (const [wk, ls] of byWord) FN.joinCursive(ls, 0.09 * (1 + c), { joinP: persona.joinP, track: persona.trackS, noLoopA: persona.noLoopA, lead: persona.lead, rnd: R.mulberry32((seed + wk * 7717 + 41) >>> 0) });
  }
  // ---- subrayados: una raya a mano bajo la palabra (sigue las bases de sus letras, se pasa un poco)
  const wordsInfo = lay.words || [];
  const byWordL = new Map();
  for (const l of cursiveLetters) { if (!byWordL.has(l.word)) byWordL.set(l.word, []); byWordL.get(l.word).push(l); }
  for (const [wi, ls] of byWordL) {
    const W = wordsInfo[wi];
    if (!W || !W.under || W.neg || !ls.length) continue;
    const rs = R.mulberry32(seed + wi * 6151 + 99);
    // puntos guía: bajo cada letra, a su base (más el descendente si lo tiene, para no cortarlo del todo)
    const guide = [];
    let x0 = Infinity, x1 = -Infinity;
    for (const l of ls) {
      let a = Infinity, b = -Infinity;
      for (const s of l.strokes) if (!s.mark) for (const q of s.pts) { if (q[0] < a) a = q[0]; if (q[0] > b) b = q[0]; }
      if (!isFinite(a)) continue;
      x0 = Math.min(x0, a); x1 = Math.max(x1, b);
      guide.push([a, l.L.base + 0.11 * l.size, l.size]); guide.push([b, l.L.base + 0.11 * l.size, l.size]);
    }
    if (guide.length < 1 || !isFinite(x0)) continue;
    const sz = guide.reduce((t, q) => t + q[2], 0) / guide.length;
    // recta que mejor sigue las bases (la mano no hace escalones), con una curva suave y caída al final
    let mx = 0, my = 0; for (const q of guide) { mx += q[0]; my += q[1]; } mx /= guide.length; my /= guide.length;
    let sxy = 0, sxx = 0; for (const q of guide) { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) * (q[0] - mx); }
    const slope = (sxx > 1e-9 ? sxy / sxx : 0) + g(rs) * 0.02;
    // la raya pasa por debajo de todas las letras (no se mete en ninguna)
    let below = 0; for (const q of guide) below = Math.max(below, q[1] - (my + (q[0] - mx) * slope));
    my += below;
    const xa = x0 - (0.03 + 0.05 * rs()) * sz, xb = x1 + (0.05 + 0.1 * rs()) * sz;
    const bow = (g(rs) * 0.012 + 0.006) * (xb - xa), drop = (0.01 + 0.02 * rs()) * sz;
    const pts = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16, x = xa + (xb - xa) * t;
      pts.push([x, my + (x - mx) * slope + bow * 4 * t * (1 - t) * -1 + drop * Math.pow(t, 3) + 0.012 * sz * R.noise1(t * 3, seed + wi)]);
    }
    const L0 = ls[0].L;
    const fakeL = Object.assign({}, L0, { x: xa, base: my, size: sz, g: { box: { left: 0, right: (xb - xa) / sz, top: -0.04, bottom: 0.04 }, strokes: [] }, lv: { passes: W.bold ? 2 : 1, w: 0.9 } });
    cursiveLetters.push({ strokes: [{ pts, closed: false, joinable: false, mark: false, under: true }], L: fakeL, size: sz, word: wi, under: true });
    // a veces, con prisa, dos rayas
    if (W.under === 2 || (p.prisa > 0.5 && rs() < 0.25)) {
      const pts2 = pts.map(([x, y], k) => [x + 0.03 * sz, y + 0.1 * sz + 0.02 * sz * (k / 16)]);
      cursiveLetters.push({ strokes: [{ pts: pts2.slice(1), closed: false, joinable: false, mark: false, under: true }], L: fakeL, size: sz, word: wi, under: true });
    }
  }
  // ---- a píxeles del documento, con temblor y repasado
  const widthMul = p.width == null ? 1 : p.width;
  const passMul = p.repasado == null ? 1 : p.repasado;
  // repasado: «fundido» (más pigmento en el mismo trazo) o «visible» (pasadas sueltas encima, como cuando se
  // repasa una palabra para ponerla en negrita). Por defecto: fundido solo con pintura que tapa (pincel, óleo)
  // (graffiti: repasar es cargar —más pintura en la misma pasada—, nunca copias desplazadas)
  const fuse = P.proc === 'spray' ? true : p.repaso === 'fundido' ? true : p.repaso === 'visible' ? false : P.blend === 'over';
  const flick = persona.flick || 0;
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
    if (P.extraPass && !l.under) passes += P.extraPass;
    // grosor: el de la herramienta (por el del estilo); las letras de piezas tienen grosor propio
    const wEm = Math.max(P.w * widthMul * wK, (persona.absW || 0) * widthMul);
    const hw = wEm * (lv.w || 1) * Math.sqrt(L.size); // medio ancho en unidades de maqueta
    l.strokes.forEach((s, si) => {
      if (!s.pts || s.pts.length < 2) return;
      const extra = s.fill ? 0 : passes - 1;
      let np = s.fill || fuse ? 1 : passes;
      if (s.retrace && !s.fill && P.proc !== 'spray') np = Math.max(np, 2);
      // centro del trazo (para el pequeño giro de cada pasada)
      let smx = 0, smy = 0; for (const q of s.pts) { smx += q[0]; smy += q[1]; } smx /= s.pts.length; smy /= s.pts.length;
      for (let pass = 0; pass < np; pass++) {
        const rs = R.mulberry32(seed + li * 3301 + si * 211 + pass * 7919 + 11);
        let pts = s.pts;
        if (pass > 0) {
          // la otra pasada: el mismo gesto otra vez, algo desplazado y girado, que se pasa o se queda corto en
          // los extremos (nunca un trozo suelto a mitad de la letra)
          const ang = rs() * 6.283, d = (s.retrace && passes < 2 ? 0.3 + 0.3 * rs() : 0.15 + 0.35 * rs()) * hw * 1.4;
          const ox = Math.cos(ang) * d, oy = Math.sin(ang) * d, rot = g(rs) * 0.008, cr = Math.cos(rot), sr = Math.sin(rot);
          const lam = (0.25 + 0.2 * rs()) * L.size, ns = (seed + li * 31 + si * 7 + pass * 101) | 0, A = 0.5 * hw;
          let acc = 0;
          pts = pts.map((q, k) => {
            if (k) acc += Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]);
            const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
            const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
            const o = A * R.noise1(acc / lam, ns);
            const x = q[0] - smx, y = q[1] - smy;
            return [smx + cr * x - sr * y + ox - ty / tl * o, smy + sr * x + cr * y + oy + tx / tl * o];
          });
          if (!s.closed && pts.length > 3) pts = trimEnds(pts, -(0.01 + 0.04 * rs()) * L.size, (rs() - 0.6) * 0.05 * L.size);
        }
        // pincel: algunos trazos verticales empiezan por abajo
        if (P.up && !s.fill && pts.length > 2) {
          const a = pts[0], b = pts[pts.length - 1];
          if (Math.abs(b[1] - a[1]) > 1.6 * Math.abs(b[0] - a[0]) && b[1] > a[1] && rs() < P.up) pts = pts.slice().reverse();
        }
        // al documento, con un pulso lento (no un temblorcillo: la mano ondula, no vibra)
        const scr = isScript && L.g.script;
        const tremA = emPx * (0.0008 + 0.004 * (p.pulso == null ? 0.4 : p.pulso)) * P.tremor * (scr ? 0.45 : 1), tremL = emPx * (scr ? 0.7 : 0.32);
        const dpts = pts.map(q => map(q[0], q[1]));
        let acc = 0;
        let fin = dpts.map((q, k) => {
          if (k > 0) acc += Math.hypot(q[0] - dpts[k - 1][0], q[1] - dpts[k - 1][1]);
          const a = dpts[Math.max(0, k - 1)], b = dpts[Math.min(dpts.length - 1, k + 1)];
          const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
          const nn = tremA * R.noise1(acc / tremL, seed + li * 3 + si * 17 + pass);
          return { x: q[0] - ty / tl * nn, y: q[1] + tx / tl * nn, w: 1 };
        });
        // (los ganchos y las salidas se afilan: la mano apenas apoya)
        if (pass === 0 && s.tipIn && fin.length > s.tipIn + 2) for (let k = 0; k <= s.tipIn; k++) fin[k].w = 0.35 + 0.65 * k / s.tipIn;
        if (pass === 0 && s.tipOut && fin.length > s.tipOut + 2) for (let k = 0; k <= s.tipOut; k++) fin[fin.length - 1 - k].w = 0.3 + 0.7 * k / s.tipOut;
        let r = Math.max(0.5, wEm * emPx * (lv.w || 1) / Math.max(0.5, Math.sqrt(L.size)));
        if (pass > 0) r *= 0.88 + 0.12 * rs();
        // (graffiti: la boquilla no puede ser más gorda de lo que la letra de esa firma aguanta sin cegarse)
        if (P.proc === 'spray' && persona.nibMax) r = Math.min(r, persona.nibMax * (P.band || P.soak ? 0.8 : 1) * emPx * (lv.w || 1));
        if (s.extra) r *= 0.8;
        if (s.under) r *= 0.9;
        if (fuse && extra > 0) r *= 1 + 0.05 * Math.min(3, extra);
        // picos: en los vértices cerrados (A, M, N, V...) la mano da la vuelta en seco: el trazo se parte y
        // los dos lados llegan afilados al pico (en vez de una curva o un codo redondeado)
        // (rotulador y boli no se afilan: en las esquinas cerradas se paran y la tinta se carga en el punto)
        const blunt = !!P.proc;
        const pieces = s.fill ? [fin] : splitAtPeaks(fin, P.band ? r * 0.3 : r, blunt ? 1.15 : 1.95, !blunt, P.band ? r * 1.1 : 0);   // (rodillo: solo se parte en las esquinas de verdad, y las bandas se cruzan allí)
        // la mano suelta el trazo al final (sobre todo en letra rabiosa): la punta se afila
        if (flick && !s.fill && !blunt) for (const pc of pieces) taperEnds(pc, r, flick, rs);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const q of fin) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
        // (spray: la nube llega más lejos y los chorretones cuelgan hacia abajo)
        const m = r * (P.proc === 'spray' ? 4.4 : 2.5) + 3, mB = P.proc === 'spray' ? r * 38 : 0;
        const blob = !!P.proc && pass === 0 && !s.fill && rs() < 0.04;
        pieces.forEach((pc, pi) => {
          if (pc.length < 2) return;
          out.push({ under: !!s.under, blob: blob && pi === 0, pts: pc, cont0: !!pc.cont0, cont1: !!pc.cont1, r, fill: !!s.fill, seed: (seed + li * 7 + si * 131 + pass * 1777 + pi * 53) >>> 0, P, box: { left: x0 - m, top: y0 - m, right: x1 + m, bottom: y1 + m + mB }, alpha: pass > 0 ? 0.9 : 1, ink: fuse && extra > 0 ? 1 + 0.32 * Math.min(3, extra) : 1, letter: li, line: L.line, word: L.word == null ? 0 : L.word , sk: si, pass });
        });
      }
    });
  });
  // palabras en negativo: en vez de escribirlas, se pinta su caja alrededor de ellas (con la misma técnica)
  const wordExt = new Map();
  for (const l of cursiveLetters) {
    if (l.under) continue;
    const e = wordExt.get(l.word) || { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const st of l.strokes) for (const q of st.pts) { if (q[0] < e.x0) e.x0 = q[0]; if (q[0] > e.x1) e.x1 = q[0]; if (q[1] < e.y0) e.y0 = q[1]; if (q[1] > e.y1) e.y1 = q[1]; }
    wordExt.set(l.word, e);
  }
  return snugUnder(blockDrift(NG.planWords(lay, out, p, seed, wordExt), letters, p, seed, auto));
}

// SUBRAYADOS PEGADOS A SU PALABRA. La raya se planea sobre la maqueta, pero luego cada letra baila, la línea se
// inclina y el bloque deriva: al final se mira dónde han quedado de verdad las letras de la palabra (el pie de cada
// una, sin contar las que cuelgan —g, j, p, q, y—) y la raya se lleva justo debajo, siguiendo su inclinación y
// conservando su propia curva: tan cerca como dejan los dos grosores.
function snugUnder(strokes) {
  const unders = strokes.filter(s => s.under && !s.fill && s.pts && s.pts.length > 1);
  if (!unders.length) return strokes;
  const ink = new Map();        // palabra -> { pts: [[x, y]...], r }
  for (const s of strokes) {
    if (s.under || s.fill || s.mask || s.word == null) continue;
    let e = ink.get(s.word); if (!e) { e = { pts: [], rs: [] }; ink.set(s.word, e); }
    e.rs.push(s.r);
    for (let i = 0; i < s.pts.length; i++) {
      const q = s.pts[i]; e.pts.push([q.x, q.y]);
      if (i) { const o = s.pts[i - 1], n = Math.min(40, Math.floor(Math.hypot(q.x - o.x, q.y - o.y) / 3)); for (let k = 1; k < n; k++) e.pts.push([o.x + (q.x - o.x) * k / n, o.y + (q.y - o.y) * k / n]); }
    }
  }
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  for (const u of unders) {
    const w = ink.get(u.word); if (!w || w.pts.length < 2) continue;
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const q of w.pts) { if (q[0] < X0) X0 = q[0]; if (q[0] > X1) X1 = q[0]; if (q[1] < Y0) Y0 = q[1]; if (q[1] > Y1) Y1 = q[1]; }
    // el pie de la palabra, por tramos a lo ancho (da igual cómo estén repartidos los trazos: también vale en cursiva)
    const nb = Math.max(2, Math.min(24, Math.round((X1 - X0) / Math.max(4, 0.4 * (Y1 - Y0))))), bw = (X1 - X0) / nb || 1;
    let F = [];
    for (let k = 0; k < nb; k++) F.push({ x0: X0 + k * bw, x1: X0 + (k + 1) * bw, bot: -Infinity, top: Y0, r: med(w.rs) });
    for (const q of w.pts) { const e = F[Math.min(nb - 1, Math.max(0, Math.floor((q[0] - X0) / bw)))]; if (q[1] > e.bot) e.bot = q[1]; }
    F = F.filter(e => isFinite(e.bot));
    if (!F.length) continue;
    const hgt = Y1 - Y0, b0 = med(F.map(e => e.bot));
    // (fuera los tramos que cuelgan por debajo —g, j, p, q, y— y los que solo tienen algo que flota)
    const base = F.filter(e => e.bot < b0 + 0.16 * hgt && e.bot > b0 - 0.25 * hgt);
    if (base.length) F = base;
    let mx = 0, my = 0; for (const e of F) { mx += (e.x0 + e.x1) / 2; my += e.bot; } mx /= F.length; my /= F.length;
    let sxy = 0, sxx = 0; for (const e of F) { const dx = (e.x0 + e.x1) / 2 - mx; sxy += dx * (e.bot - my); sxx += dx * dx; }
    const sl = sxx > 1e-6 && F.length > 2 ? Math.max(-0.2, Math.min(0.2, sxy / sxx)) : 0;
    // la recta pasa por debajo del pie de todas (no se mete en ninguna) y se separa lo justo
    let low = 0; for (const e of F) low = Math.max(low, e.bot - (my + ((e.x0 + e.x1) / 2 - mx) * sl));
    const gap = med(F.map(e => e.r)) + u.r + Math.max(1, 0.05 * hgt);
    // la raya, tal como venía: su propia recta (se le quita) y su curva (se le deja)
    const P = u.pts, a = P[0], b = P[P.length - 1], us = Math.abs(b.x - a.x) > 1e-6 ? (b.y - a.y) / (b.x - a.x) : 0;
    let dyMin = Infinity, dyMax = -Infinity;
    for (const q of P) {
      const own = a.y + (q.x - a.x) * us, ny = my + (q.x - mx) * sl + low + gap + (q.y - own), d = ny - q.y;
      if (d < dyMin) dyMin = d; if (d > dyMax) dyMax = d;
      q.y = ny;
    }
    if (u.box) { u.box.top += Math.min(0, dyMin); u.box.bottom += Math.max(0, dyMax); }
  }
  return strokes;
}

// DERIVA DEL BLOQUE (toda escritura a mano; nació para el graffiti). Quien pinta en una pared no tiene pauta: mira lo que acaba de escribir, no el plan.
// Con poco texto lo ve entero de un golpe y lo planta recto y regular. Con mucho, la mano va fallando —la línea
// se tuerce, el tamaño se le va, el margen se corre, el final de línea se le echa encima— y cada línea nueva se
// apoya en la de arriba (la sigue) mientras intenta arreglar lo que aquella hizo mal. El bloque acaba con forma.
//   carga  λ = (1 − e^(−(N − N0)/Ns)) · deriva      N letras; N0 = 12 (hasta ahí se planea entero); Ns = 45
//   línea l, u ∈ [0,1] a lo ancho:
//     error propio    e_l(u) = a_l·(u − ½) + b_l·4u(1−u) + ruido lento        (a: pendiente; b: comba del brazo)
//     pendiente       a_l = −g·A_(l−1) + ε_l      (A: lo torcido que va el bloque; g: cuánto se corrige; ε ~ λ)
//     desplazamiento  D_l(u) = c·D_(l−1)(u) + e_l(u)                          (c: cuánto copia a la de arriba)
//     tamaño          s_l(u) = S_l · (1 − κ_l·h(u))   h: 0 hasta ~0,55 y sube a 1 al final (se queda sin sitio)
//                     S_l = S_(l−1) + corrección: si la anterior acabó apretada, esta empieza más pequeña
//     margen          m_l = m_(l−1) + deriva hacia dentro − g·m_(l−1)
// Todo es suave en (línea, u): se aplica como una deformación a los trazos ya planeados.
function blockDrift(strokes, letters, p, seed, auto) {
  const k = p.deriva == null ? 0 : p.deriva;
  if (!(k > 0) || auto || !strokes.length || strokes.some(s => s.mask)) return strokes;
  const N = letters.filter(L => !L.under).length, lam = (1 - Math.exp(-Math.max(0, N - 12) / 45)) * Math.min(2, k * 2);
  if (lam < 0.01) return strokes;
  // ---- las líneas, medidas sobre los trazos ya colocados en el documento (base: donde se apoyan las letras)
  const lb = new Map();                      // línea -> letra -> [arriba, abajo]
  for (const s of strokes) {
    const L = s.letter != null ? letters[s.letter] : null;
    if (!L || L.under || s.under || s.fill) continue;
    let m = lb.get(L.line); if (!m) { m = new Map(); lb.set(L.line, m); }
    let e = m.get(s.letter); if (!e) { e = [Infinity, -Infinity]; m.set(s.letter, e); }
    for (const q of s.pts) { if (q.y < e[0]) e[0] = q.y; if (q.y > e[1]) e[1] = q.y; }
  }
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const lines = Array.from(lb.entries()).map(([id, m]) => { const es = Array.from(m.values()), base = med(es.map(e => e[1])), top = med(es.map(e => e[0])); return { id, base, size: Math.max(4, (base - top) * 1.3), x0: Infinity, x1: -Infinity, n: es.length }; }).sort((a, b) => a.base - b.base);
  if (!lines.length) return strokes;
  const idx = new Map(lines.map((l, i) => [l.id, i]));
  const lineOf = s => {
    if (s.line != null && idx.has(s.line)) return idx.get(s.line);
    if (s.letter != null && letters[s.letter] && idx.has(letters[s.letter].line)) return idx.get(letters[s.letter].line);
    let cy = 0; for (const q of s.pts) cy += q.y; cy /= s.pts.length;
    let best = 0, bd = Infinity; lines.forEach((l, i) => { const d = Math.abs(cy - (l.base - 0.4 * l.size)); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const sl = strokes.map(lineOf);
  strokes.forEach((s, i) => { const l = lines[sl[i]]; for (const q of s.pts) { if (q.x < l.x0) l.x0 = q.x; if (q.x > l.x1) l.x1 = q.x; } });
  let X0 = Infinity, X1 = -Infinity; for (const l of lines) { if (l.x0 < X0) X0 = l.x0; if (l.x1 > X1) X1 = l.x1; }
  const WB = Math.max(1, X1 - X0);
  // ---- la mano: cada línea falla y la siguiente copia y corrige
  const rnd = R.mulberry32(((seed >>> 0) ^ 0x6a09e667) >>> 0), g = () => R.gauss(rnd);
  const habit = g() * 0.02, gain = 0.45 + 0.4 * rnd(), copy = 0.55 + 0.3 * rnd();     // (su vicio de torcerse, cuánto corrige, cuánto copia)
  const K = 9, prev = new Float64Array(K);                                             // D de la línea de arriba, en K puntos del ancho del bloque
  let A = 0, S = 1, m = 0, sq = 0;
  lines.forEach((l, i) => {
    const wl = Math.max(1, l.x1 - l.x0), many = Math.min(1.6, Math.sqrt(l.n / 9));     // (muchas letras en la línea: más ocasión de irse)
    const a = (i === 0 ? habit * 2 : habit - gain * A) + g() * 0.03 * many;            // pendiente (rad), ya corregida
    const b = g() * 0.1 * l.size * many, ns = (seed + i * 811) | 0;
    const s3 = g() * 0.07 * l.size * many, ph = rnd() * 0.5;          // la ese: se hunde, lo nota y remonta (o al revés)
    l.a = a * lam; A = A * copy + l.a;
    l.D = new Float64Array(K);
    for (let j = 0; j < K; j++) {
      const xb = X0 + WB * j / (K - 1), u = (xb - l.x0) / wl;
      const own = Math.tan(a) * (u - 0.5) * wl + b * 4 * Math.max(0, Math.min(1, u)) * (1 - Math.max(0, Math.min(1, u))) + s3 * Math.sin(6.2832 * (Math.max(0, Math.min(1, u)) * (0.8 + ph) + ph)) + 0.07 * l.size * many * R.noise1(u * 2.2, ns);
      l.D[j] = copy * prev[j] + lam * own;
      // (la línea ve la de arriba: puede acercarse o alejarse, pero no montarse en ella)
      if (i > 0) { const pitch = Math.max(1, l.base - lines[i - 1].base); l.D[j] = Math.max(prev[j] - 0.22 * pitch, Math.min(prev[j] + 0.45 * pitch, l.D[j])); }
    }
    for (let j = 0; j < K; j++) prev[j] = l.D[j];
    // tamaño: si la de arriba acabó apretada, esta empieza más pequeña; si le sobró, se anima
    S = Math.max(0.84, Math.min(1.2, S * (1 - 0.35 * sq) + lam * g() * 0.05 + (1 - S) * 0.25));
    l.S = S;
    l.kap = Math.min(0.2, Math.max(0, lam * (0.08 + 0.22 * rnd() * rnd() + 0.16 * (wl / WB - 0.8))));   // cuánto se encoge hacia el final (más, si la línea es larga)
    sq = l.kap;
    m = m * (1 - gain * 0.6) + lam * l.size * (0.12 + 0.3 * g());                      // el margen se corre (hacia dentro) y se corrige a medias
    l.m = m;
  });
  // (que el bloque no se vaya de su sitio: se quita el desplazamiento medio)
  let mD = 0, mM = 0, nn = 0; for (const l of lines) { for (let j = 0; j < K; j++) mD += l.D[j]; mM += l.m; nn += K; }
  mD /= nn; mM /= lines.length;
  const h = u => { const t = Math.max(0, Math.min(1, (u - 0.5) / 0.5)); return t * t * (3 - 2 * t); };
  const H = u => { const t = Math.max(0, Math.min(1, (u - 0.5) / 0.5)); return 0.5 * (t * t * t - 0.5 * t * t * t * t); };   // ∫ h
  const Dat = (l, x) => { const f = Math.max(0, Math.min(K - 1.001, (x - X0) / WB * (K - 1))), j = Math.floor(f); return l.D[j] + (l.D[j + 1] - l.D[j]) * (f - j) - mD; };
  return strokes.map((s, i) => {
    const l = lines[sl[i]], wl = Math.max(1, l.x1 - l.x0);
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity, nx0 = Infinity, ny0 = Infinity, nx1 = -Infinity, ny1 = -Infinity;
    const pts = s.pts.map(q => {
      const u = (q.x - l.x0) / wl, uc = Math.max(0, Math.min(1, u)), sc = l.S * (1 - l.kap * h(uc));
      // (las letras encogen a lo alto y a lo ancho: el ancho se integra para que no se pisen)
      const x = l.x0 + (l.m - mM) + wl * (l.S * (uc - l.kap * H(uc)) + (u - uc) * sc) + (1 - l.S) * wl * 0.5;
      const y = l.base + Dat(l, q.x) + (q.y - l.base) * sc;
      if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y;
      if (x < nx0) nx0 = x; if (x > nx1) nx1 = x; if (y < ny0) ny0 = y; if (y > ny1) ny1 = y;
      return Object.assign({}, q, { x, y });
    });
    const o = Object.assign({}, s, { pts, r: s.r * l.S * (1 - 0.5 * l.kap * h(Math.max(0, Math.min(1, ((bx0 + bx1) / 2 - l.x0) / wl)))) });
    if (pc0(s)) { o.pts.cont0 = s.pts.cont0; o.pts.cont1 = s.pts.cont1; }
    o.box = { left: nx0 - (bx0 - s.box.left), top: ny0 - (by0 - s.box.top), right: nx1 + (s.box.right - bx1), bottom: ny1 + (s.box.bottom - by1) };
    return o;
  });
}
function pc0(s) { return s.pts && (s.pts.cont0 != null || s.pts.cont1 != null); }

// pinta el plan en un lienzo (solo los trazos que caen en él)
function paint(canvas, strokes, p) {
  const rgb0 = RD.hexToRgb(p.color || '#1b1b1b');
  const ink = p.tinta == null ? 0.55 : p.tinta;
  let n = 0;
  if (p.relieve > 0 && p.tool === 'spray' && !canvas.relief) {
    if (strokes._rMed == null) { const rs = strokes.filter(s => !s.fill).map(s => s.r).sort((a, b) => a - b); strokes._rMed = rs.length ? rs[rs.length >> 1] : 4; }
    canvas.relief = { amount: p.relieve, size: Math.max(1.6, Math.min(14, strokes._rMed * 0.42)) };
  }
  for (const s of strokes) {
    const b = s.box;
    if (b.right < canvas.x0 || b.left > canvas.x0 + canvas.w || b.bottom < canvas.y0 || b.top > canvas.y0 + canvas.h) continue;
    const rgb = p.colorVar ? RD.letterColor(rgb0, s.letter || 0, p.colorVar, p.colorSeed || 0) : rgb0;
    const o = { inkMul: (0.88 + 0.24 * ink) * (s.ink || 1), dryMul: 0.45 + 1.1 * ink, alphaMul: s.alpha, blob: !!s.blob, mask: s.mask || null, contIn: !!s.cont0, contOut: !!s.cont1, goteo: p.goteo, nube: p.nube };
    if (s.fill) INK.paintFill(canvas, s.pts.map(q => [q.x, q.y]), s.P, s.r, rgb, s.seed, o);
    else INK.paintStroke(canvas, s.pts, s.P, s.r, rgb, s.seed, o);
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
