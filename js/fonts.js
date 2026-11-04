'use strict';
// Tipografías propias de A mano: cada letra es una lista de trazos de escritura (orden y dirección de la
// mano), no un contorno. Aquí se decodifican, se suavizan sin perder las esquinas y se les da la
// personalidad de cada tipografía (infantil, adulta, rabiosa, elegante).
// Unidades: em (1 = cuerpo), y hacia abajo, línea base en y = 0.
// Sin dependencias de Photoshop.

const FD = require('./fontdata.js');

// personalidad de cada tipografía
//  print / script: fuente base para mayúsculas-minúsculas y para la cursiva
//  slant: inclinación (tangente), wide: anchura, xh: altura de x deseada (proporción de la mayúscula)
//  angular: las curvas se vuelven tramos rectos; round: más redonda; track: espacio entre letras (em)
//  bounce: baile de línea base y tamaño (propio de la tipografía, además de la variación general)
const PERSONAS = {
  infantil: { label: 'Infantil', print: 'readability', script: 'script', slant: -0.02, slantS: 0.05, wide: 1.1, xh: 0.74, xhS: 0.62, angular: 0, round: 1, track: 0.06, trackS: 0, bounce: 1.6, sizeVar: 1.5, open: 0 },
  adulta: { label: 'Adulta', print: 'tech', script: 'script', slant: 0.04, slantS: 0.22, wide: 1, xh: 0.66, xhS: 0.52, angular: 0, round: 0, track: 0.025, trackS: 0, bounce: 0.8, sizeVar: 0.8, open: 0.2 },
  rabiosa: { label: 'Rabiosa', print: 'felix', script: 'script', slant: 0.16, slantS: 0.34, wide: 1.04, xh: 0.66, xhS: 0.55, angular: 1, round: 0, track: 0.035, trackS: -0.01, bounce: 1.4, sizeVar: 1.3, open: 0.6 },
  elegante: { label: 'Elegante', print: 'elfin', script: 'allure', slant: 0.08, slantS: 0.12, wide: 1, xh: 0.62, xhS: 0.48, angular: 0, round: 0, track: 0.03, trackS: 0, bounce: 0.5, sizeVar: 0.5, open: 0 }
};

// base64 -> nada; los datos ya vienen como números
const CAP = 0.7; // altura de mayúscula en em, igual en todas las fuentes

const cache = new Map();

function fontOf(key) { return FD[key] || FD.tech; }

// ------------------------------------------------------------------ suavizado con esquinas
function turnAt(p, k) {
  const ax = p[k][0] - p[k - 1][0], ay = p[k][1] - p[k - 1][1], bx = p[k + 1][0] - p[k][0], by = p[k + 1][1] - p[k][1];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la < 1e-9 || lb < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))));
}

// Catmull-Rom centrípeto por tramos entre esquinas, remuestreado cada `step`
function smoothPolyline(p, closed, step, cornerDeg) {
  if (p.length < 3) return resample(p, step);
  const lim = (cornerDeg || 52) * Math.PI / 180;
  const cuts = [0];
  for (let k = 1; k < p.length - 1; k++) if (turnAt(p, k) > lim) cuts.push(k);
  cuts.push(p.length - 1);
  const out = [];
  for (let c = 0; c < cuts.length - 1; c++) {
    const seg = p.slice(cuts[c], cuts[c + 1] + 1);
    const sm = catmull(seg, step);
    if (out.length) sm.shift();
    for (const q of sm) out.push(q);
  }
  return out;
}

function catmull(P, step) {
  if (P.length < 3) return resample(P, step);
  const out = [P[0].slice()];
  const n = P.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(1, Math.ceil(L / step));
    // tangentes (centrípeto simplificado: Catmull-Rom uniforme con tensión 0.5 y extremos reflejados)
    const t1 = [(p2[0] - p0[0]) * 0.5, (p2[1] - p0[1]) * 0.5], t2 = [(p3[0] - p1[0]) * 0.5, (p3[1] - p1[1]) * 0.5];
    // limita las tangentes para que no se pasen en tramos de longitudes muy distintas
    const lim = (t, Lr) => { const l = Math.hypot(t[0], t[1]); const mx = Lr * 1.2; return l > mx ? [t[0] / l * mx, t[1] / l * mx] : t; };
    const a = lim(t1, L), b = lim(t2, L);
    for (let k = 1; k <= m; k++) {
      const t = k / m, t2_ = t * t, t3 = t2_ * t;
      const h1 = 2 * t3 - 3 * t2_ + 1, h2 = -2 * t3 + 3 * t2_, h3 = t3 - 2 * t2_ + t, h4 = t3 - t2_;
      out.push([h1 * p1[0] + h2 * p2[0] + h3 * a[0] + h4 * b[0], h1 * p1[1] + h2 * p2[1] + h3 * a[1] + h4 * b[1]]);
    }
  }
  return out;
}

function resample(p, step) {
  if (p.length < 2) return p.map(q => q.slice());
  const out = [p[0].slice()];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= m; k++) out.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]);
  }
  return out;
}

// Douglas-Peucker: para la letra rabiosa (curvas -> tramos rectos con esquinas)
function simplify(p, tol) {
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    let md = 0, mi = -1;
    const ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay, L2 = dx * dx + dy * dy || 1e-12;
    for (let k = a + 1; k < b; k++) {
      let t = ((p[k][0] - ax) * dx + (p[k][1] - ay) * dy) / L2; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p[k][0] - ax - dx * t, p[k][1] - ay - dy * t);
      if (d > md) { md = d; mi = k; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((q, k) => keep[k]);
}

// ------------------------------------------------------------------ glifos
// Devuelve { adv, strokes: [{ pts: [[x,y]...], closed }], box } en em, ya con la personalidad aplicada
function glyph(personaKey, mode, ch) {
  const P = PERSONAS[personaKey] || PERSONAS.adulta;
  const isScript = mode === 'cursiva';
  const fk = isScript ? P.script : P.print;
  const key = personaKey + '|' + mode + '|' + ch;
  if (cache.has(key)) return cache.get(key);
  let F = fontOf(fk), g = F.g[ch];
  if (!g) { F = fontOf(isScript ? 'script' : 'readability'); g = F.g[ch]; }
  if (!g) { const r = ch === ' ' ? null : fallbackGlyph(personaKey, mode, ch); cache.set(key, r); return r; }
  const m = F.m;
  const s0 = CAP / m.cap;                       // unidades de fuente -> em
  // alturas: la x se lleva a la proporción de la tipografía; ascendentes y descendentes se ajustan
  const xhWant = (isScript ? P.xhS : P.xh) * CAP;
  const xh = m.xh * s0, asc = Math.max(m.asc, m.cap) * s0, desc = m.desc * s0;
  const kx = xhWant / xh;
  const isLower = ch !== ch.toUpperCase() || /[a-zñ]/.test(ch);
  const capE = m.cap * s0;
  const mapY = y => {
    // y en em, hacia arriba
    if (!isLower) {
      // tildes y diéresis de mayúscula: pegadas a la letra (las fuentes originales las ponen altísimas)
      if (y > capE * 1.04) return capE * 1.04 + (y - capE * 1.04) * 0.5 - Math.min(0.08, (y - capE * 1.04) * 0.25);
      return y;
    }
    if (y <= 0) return y * Math.min(1.25, 0.6 + 0.4 * kx);
    if (y <= xh) return y * kx;
    const top = Math.max(asc, xh + 0.05);
    return xhWant + (y - xh) * Math.max(0.45, (top - xhWant) / Math.max(1e-6, top - xh));
  };
  const slant = isScript ? P.slantS : P.slant;
  const wide = P.wide * (isScript ? 1 : 1);
  const step = 0.012;
  const strokes = [];
  for (const [closed, flat] of g[1]) {
    let pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] * s0, flat[i + 1] * s0]);
    // personalidad: angulosa o redonda
    if (P.angular && pts.length > 3) pts = simplify(pts, 0.022);
    pts = P.angular ? resample(pts, step) : smoothPolyline(pts, !!closed, step, P.round ? 75 : 52);
    // proporciones: altura de x, anchura e inclinación; y pasa a ir hacia abajo
    pts = pts.map(([x, y]) => { const Y = mapY(y); return [x * wide + Y * slant, -Y]; });
    if (pts.length >= 2) strokes.push({ pts, closed: !!closed });
  }
  // tildes, puntos y diéresis: trazos enteros por encima del cuerpo de la letra (no cuentan para el espaciado)
  const bodyTop = -(isLower ? xhWant * 0.93 : CAP * 1.02);
  for (const s of strokes) { let lowest = -Infinity; for (const q of s.pts) if (q[1] > lowest) lowest = q[1]; s.mark = lowest < bodyTop && strokes.length > 1; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!strokes.length) { x0 = 0; x1 = g[0] * s0 * wide; y0 = -xhWant; y1 = 0; }
  let bx0 = Infinity, bx1 = -Infinity;
  for (const s of strokes) if (!s.mark) for (const q of s.pts) { if (q[0] < bx0) bx0 = q[0]; if (q[0] > bx1) bx1 = q[0]; }
  if (!isFinite(bx0)) { bx0 = x0; bx1 = x1; }
  const adv = g[0] * s0 * wide;
  const r = { adv, strokes, box: { left: x0, top: y0, right: x1, bottom: y1 }, body: { left: bx0, right: bx1 }, script: isScript, lower: isLower, ch };
  cache.set(key, r);
  return r;
}

// carácter que no está: se compone (letra + tilde) o se omite
function fallbackGlyph(personaKey, mode, ch) {
  const base = ch.normalize ? ch.normalize('NFD') : ch;
  if (base.length > 1 && base[0] !== ch) {
    const g = glyph(personaKey, mode, base[0]);
    if (g) return g;
  }
  return null;
}

// métricas de la tipografía en em (y hacia abajo: cap y xh negativos)
function metrics(personaKey, mode) {
  const P = PERSONAS[personaKey] || PERSONAS.adulta;
  const isScript = mode === 'cursiva';
  const F = fontOf(isScript ? P.script : P.print);
  const s0 = CAP / F.m.cap;
  const xh = (isScript ? P.xhS : P.xh) * CAP;
  return { cap: CAP, xh, asc: Math.max(CAP, xh + (Math.max(F.m.asc, F.m.cap) * s0 - F.m.xh * s0) * 0.9), desc: Math.min(0.42, -F.m.desc * s0), space: (isScript ? 0.27 : mode === 'mayus' ? 0.5 : 0.36) * P.wide };
}

// texto según el modo: MAYÚSCULAS, minúsculas (tal cual) o cursiva (tal cual, ligada)
function caseText(text, mode) {
  return mode === 'mayus' ? text.toLocaleUpperCase('es') : text;
}

// ------------------------------------------------------------------ palabra
// Coloca las letras de una palabra; en cursiva une la salida de cada letra con la entrada de la siguiente.
// Devuelve { glyphs: [{ g, x }], width, joins: [[i, i+1]...] }
function setWord(personaKey, mode, word, trackExtra, inkW) {
  const P = PERSONAS[personaKey] || PERSONAS.adulta;
  const isScript = mode === 'cursiva';
  const track = (isScript ? P.trackS : P.track) + (trackExtra || 0) * (isScript ? 0.3 : 1);
  const out = [];
  let x = 0;
  for (const ch of Array.from(word)) {
    const g = glyph(personaKey, mode, ch);
    if (!g) { x += 0.3; continue; }
    // dentro de la palabra ningún hueco entre letras parece un espacio (ni se pisan): se mide la tinta
    if (out.length && !isScript && g.strokes.length) {
      const pv = out[out.length - 1];
      const gap = (x + g.body.left) - (pv.x + pv.g.body.right);
      // el hueco que se ve es el de los centros menos el grosor del trazo (inkW: medio ancho en em)
      const w2 = 2 * (inkW || 0);
      const maxGap = 0.07 + w2 + Math.max(0, trackExtra || 0) * 0.6 + Math.max(0, P.track) * 0.5;
      // las letras de un solo palo (I, l, i, 1) se confunden con el palo de la vecina: más aire
      const narrow = gg => gg.body.right - gg.body.left < 0.12;
      const minGap = -0.02 + w2 * 0.8 + Math.min(0, trackExtra || 0) + (narrow(pv.g) || narrow(g) ? 0.035 : 0);
      if (gap > maxGap) x -= gap - maxGap; else if (gap < minGap) x += minGap - gap;
    }
    out.push({ g, x });
    x += g.adv + track;
  }
  const width = out.length ? Math.max(x - track, out[out.length - 1].x + out[out.length - 1].g.box.right) : 0;
  return { glyphs: out, width };
}

// En cursiva: une el último trazo de una letra con el primero de la siguiente si se tocan
// (glyphs ya colocados en el espacio de la línea: [{ strokes: [{pts}], ch }])
function joinCursive(letters, emTol) {
  const tol = emTol || 0.09;
  const res = [];
  for (let i = 0; i < letters.length; i++) {
    const L = letters[i];
    res.push(L);
    if (i === 0) continue;
    const A = letters[i - 1];
    if (!A.joinable || !L.joinable) continue;
    // salida de A: el trazo cuyo final está más a la derecha y abajo; entrada de L: el que empieza más a la izquierda
    let ai = -1, best = -Infinity;
    A.strokes.forEach((s, k) => { const e = s.pts[s.pts.length - 1]; const sc = e[0] + e[1] * 0.2; if (!s.closed && sc > best) { best = sc; ai = k; } });
    let bi = -1, bestb = Infinity;
    L.strokes.forEach((s, k) => { const e = s.pts[0]; const sc = e[0] - e[1] * 0.2; if (!s.closed && sc < bestb) { bestb = sc; bi = k; } });
    if (ai < 0 || bi < 0) continue;
    const sa = A.strokes[ai], sb = L.strokes[bi];
    const e = sa.pts[sa.pts.length - 1], b0 = sb.pts[0];
    const d = Math.hypot(b0[0] - e[0], b0[1] - e[1]);
    if (d > tol * (L.size || 1) * 2.2) continue;
    // puente suave (Hermite con las tangentes de llegada y salida)
    const ta = tangent(sa.pts, true), tb = tangent(sb.pts, false);
    const bridge = [];
    const n = Math.max(2, Math.ceil(d / 0.01));
    const k = d * 0.6;
    for (let j = 1; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const h1 = 2 * t3 - 3 * t2 + 1, h2 = -2 * t3 + 3 * t2, h3 = t3 - 2 * t2 + t, h4 = t3 - t2;
      bridge.push([h1 * e[0] + h2 * b0[0] + h3 * ta[0] * k + h4 * tb[0] * k, h1 * e[1] + h2 * b0[1] + h3 * ta[1] * k + h4 * tb[1] * k]);
    }
    // el trazo de entrada de L pasa a continuar el de salida de A (un solo trazo, sin levantar)
    sa.pts = sa.pts.concat(bridge, sb.pts);
    sa.joined = true;
    L.strokes.splice(bi, 1);
    // los trazos sueltos de L (puntos, tildes, travesaños) se quedan en L
  }
  return res;
}
function tangent(p, atEnd) {
  const n = p.length;
  const a = atEnd ? p[Math.max(0, n - 4)] : p[0], b = atEnd ? p[n - 1] : p[Math.min(n - 1, 3)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

module.exports = { PERSONAS, CAP, glyph, metrics, caseText, setWord, joinCursive, smoothPolyline, resample, simplify };
