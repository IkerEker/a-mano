'use strict';
// Letras de A mano. Mayúsculas y minúsculas: dibujadas trazo a trazo (skeleton.js) y transformadas por el
// estilo (proporciones, curvas redondas o angulosas o geométricas, travesaños que se pasan, palos que
// sobresalen, óvalos que no cierran, temblor, letras propias del estilo). Cada letra tiene 3 variantes.
// Cursiva: fuentes de trazo ligado (fontdata.js) con el comportamiento del estilo.
// Unidades de salida: em, y hacia abajo, línea base en y = 0. Mayúscula = CAP.
// Sin dependencias de Photoshop.

const SK = require('./skeleton.js');
const FD = require('./fontdata.js');
const RG = require('./refglyphs.js');
const R = require('./rng.js');

const CAP = 0.7;
const NVAR = 3;

// ------------------------------------------------------------------ estilos (4 personalidades × 2 versiones)
// wide: anchura; slant (+ slantVar por letra): inclinación; hVar/wVar: tamaños desiguales entre letras;
// wob: deformación de la letra; wobF: temblor fino; angular: 0 redonda .. 1 angulosa; geo: piezas geométricas;
// os/osVar: travesaños que se pasan; stem: palos que sobresalen; cb: altura de travesaños variable;
// cbShift: travesaños altos (+) o bajos (-); open: óvalos sin cerrar; xh: altura de x (de la mayúscula);
// track/minGap: espacio entre letras; weight: grosor relativo del trazo; bounce/sizeVar: baile al escribir;
// double: trazos dobles sueltos; ovr: letras propias
const STYLES = {
  // Adulta A: mayúsculas de pincel estrechas y apretadas, travesaños altos (MENU); cursiva inclinada de cuerpo
  // pequeño y astas largas, de pluma rápida (Menu: Inspiration...)
  adulta_a: { label: 'Adulta A', hint: 'segura y compacta', ref: 'adulta_a', wide: 0.84, slant: 0.03, slantVar: 0.025, hVar: 0.05, wVar: 0.05, wob: 0.01, wobF: 0, angular: 0, geo: 0, os: 0.02, osVar: 0.025, stem: 0.02, cb: 0.04, cbShift: 0.04, open: 0.2, xh: 0.68, track: 0.04, minGap: 0.03, weight: 1, bounce: 0.6, sizeVar: 0.6, double: 0, ovr: null, script: 'own', xhS: 0.4, slantS: 0.3, trackS: 0, scriptW: 0.98, scriptSmooth: 0.03, flick: 0.4 },
  // Adulta B: alta, estrecha y suelta, palos largos que se pasan (Tryin' to make the best of the hometown blues);
  // cursiva casi derecha, estrecha y alta
  adulta_b: { label: 'Adulta B', hint: 'alta, suelta y estrecha', ref: null, wide: 0.64, slant: 0.03, slantVar: 0.06, hVar: 0.1, wVar: 0.09, wob: 0.012, wobF: 0, angular: 0, geo: 0, os: 0.03, osVar: 0.05, stem: 0.07, cb: 0.08, cbShift: 0.02, open: 0.3, xh: 0.62, track: 0.06, minGap: 0.04, weight: 1, bounce: 1.3, sizeVar: 1.2, double: 0, ovr: null, script: 'own', xhS: 0.5, slantS: 0.07, trackS: 0.01, scriptW: 0.78, scriptSmooth: 0.03, flick: 0.4 },
  // Infantil A: el abecedario de un niño (tamaños desiguales, redonda, abierta) y minúsculas gordas separadas
  // (Let it be unpolished...); cursiva redonda, derecha y grande (Comme des Garçons)
  infantil_a: { label: 'Infantil A', hint: 'de niño', ref: 'infantil_a', wide: 0.95, slant: 0, slantVar: 0.09, hVar: 0.15, wVar: 0.1, wob: 0.02, wobF: 0, angular: 0, geo: 0, os: 0.02, osVar: 0.04, stem: 0.03, cb: 0.08, cbShift: 0, open: 0.3, xh: 0.74, track: 0.12, minGap: 0.06, weight: 1.1, bounce: 1.5, sizeVar: 1.2, double: 0, ovr: null, script: 'own', xhS: 0.62, slantS: 0.04, trackS: 0.02, scriptW: 1.12, scriptSmooth: 0.05, flick: 0.3 },
  // Infantil B: la de un chaval aplicado: mayúsculas rectas y estrechas, bien puestas (hello. this is a reminder);
  // cursiva de colegio, redonda y derecha
  infantil_b: { label: 'Infantil B', hint: 'aplicada: recta y estrecha', ref: 'infantil_b', wide: 0.8, slant: 0, slantVar: 0.03, hVar: 0.06, wVar: 0.05, wob: 0.01, wobF: 0, angular: 0, geo: 0, os: 0.01, osVar: 0.02, stem: 0.01, cb: 0.04, cbShift: 0, open: 0.15, xh: 0.74, track: 0.07, minGap: 0.045, weight: 1, bounce: 0.7, sizeVar: 0.6, double: 0, ovr: null, script: 'script', xhS: 0.6, slantS: 0, trackS: 0.02, flick: 0.2 },
  // Nerviosa A: mayúsculas muy altas y estrechas, de alturas desiguales, palos rectos (Tonya Harding's); cursiva
  // tumbada, baja y estirada, escrita a toda prisa (Anthropology of world mapping)
  nerviosa_a: { label: 'Nerviosa A', hint: 'rabiosa: alta, estrecha, a picos', ref: 'nerviosa_a', wide: 0.55, slant: 0.02, slantVar: 0.05, hVar: 0.13, wVar: 0.1, wob: 0.008, wobF: 0, angular: 0, geo: 0, os: 0.04, osVar: 0.04, stem: 0.05, cb: 0.1, cbShift: -0.04, open: 0.25, xh: 0.8, track: 0.035, minGap: 0.025, weight: 0.85, bounce: 1.0, sizeVar: 1.0, double: 0, flick: 0.6, ovr: null, script: 'own', xhS: 0.27, slantS: 1.0, slantVarS: 0.06, trackS: 0.03, scriptW: 1.7, scriptSmooth: 0.06 },
  // Nerviosa B: mayúsculas finas y desiguales, que no paran quietas (I want to be mysterious); cursiva tumbada y
  // más alta, temblona
  nerviosa_b: { label: 'Nerviosa B', hint: 'a lo loco: desigual y saltona', ref: 'nerviosa_b', wide: 0.7, slant: 0.02, slantVar: 0.08, hVar: 0.15, wVar: 0.11, wob: 0.012, wobF: 0, angular: 0, geo: 0, os: 0.05, osVar: 0.05, stem: 0.06, cb: 0.12, cbShift: -0.02, open: 0.3, xh: 0.82, track: 0.05, minGap: 0.025, weight: 0.8, bounce: 1.5, sizeVar: 1.3, double: 0, flick: 0.6, ovr: null, script: 'own', xhS: 0.46, slantS: 0.32, slantVarS: 0.1, trackS: 0.01, scriptW: 0.92, scriptSmooth: 0.035 },
  elegante_a: { label: 'Elegante A', hint: 'la de siempre: fina y tranquila', print: 'elfin', wide: 1, slant: 0.08, slantVar: 0.015, hVar: 0.02, wVar: 0.02, wob: 0.004, wobF: 0, angular: 0, geo: 0, os: 0, osVar: 0, stem: 0, cb: 0, cbShift: 0, open: 0, xh: 0.62, track: 0.03, minGap: 0.05, weight: 0.85, bounce: 0.5, sizeVar: 0.5, double: 0, ovr: null, script: 'allure', xhS: 0.48, slantS: 0.12, trackS: 0 },
  // Elegante B: mayúsculas de cartel de museo, redondas y bailonas, cada letra a su altura (Matisse, Calder...);
  // cursiva derecha y abierta
  elegante_b: { label: 'Elegante B', hint: 'de cartel: redonda y bailona', ref: 'elegante_b', refW: 0.86, wide: 0.92, slant: 0, slantVar: 0.05, hVar: 0.09, wVar: 0.07, wob: 0.008, wobF: 0, angular: 0, geo: 0, os: 0.01, osVar: 0.02, stem: 0.01, cb: 0.05, cbShift: 0, open: 0.1, xh: 0.66, track: 0.04, minGap: 0.04, weight: 0.95, bounce: 1.2, sizeVar: 1.1, double: 0, ovr: null, script: 'allure', xhS: 0.6, slantS: 0, trackS: 0.03, scriptW: 1.12, flick: 0.2 }
};
// letra de bloque para las palabras en NEGATIVO (gruesa y recta: se pinta alrededor); no sale en el panel
STYLES.bloque = { label: 'Bloque', hint: '', wide: 1.0, slant: 0.02, slantVar: 0.012, hVar: 0.035, wVar: 0.03, wob: 0.006, wobF: 0, angular: 0, geo: 0, os: 0, osVar: 0.008, stem: 0, cb: 0.02, cbShift: 0, open: 0, xh: 0.74, track: 0.1, minGap: 0.07, weight: 1, bounce: 0.5, sizeVar: 0.4, double: 0, flick: 0, ovr: null, script: 'script', xhS: 0.6, slantS: 0.05, trackS: 0.02 };
// compatibilidad con ajustes guardados de la 2.0
const ALIAS = { infantil: 'infantil_a', adulta: 'adulta_a', rabiosa: 'nerviosa_a', nerviosa: 'nerviosa_a', elegante: 'elegante_a' };
const PERSONAS = new Proxy(STYLES, { get: (t, k) => t[k] || t[ALIAS[k]] || undefined });
function styleOf(k) { return STYLES[k] || STYLES[ALIAS[k]] || STYLES.adulta_a; }

// letras propias de cada estilo (sustituyen al esqueleto). 'lower:x' = usar la minúscula x a tamaño de mayúscula
const OVR = {
  kid: {
    I: [0.46, 'M 0.02 1 L 0.44 1 M 0.23 1 L 0.23 0 M 0 0 L 0.46 0'],
    J: [0.56, 'M 0.08 1 L 0.56 1 M 0.36 1 L 0.36 0.22 S 0.26 0.02 S 0.08 0.04 S 0 0.2'],
    K: [0.58, 'M 0 1 L 0 0 M 0.52 1 L 0.06 0.5 L 0.58 0'],
    M: [0.8, 'M 0 0 L 0 1 L 0.4 0.4 L 0.8 1 L 0.8 0'],
    G: [0.7, 'M 0.66 0.84 S 0.46 1 S 0.18 0.95 S 0.02 0.66 S 0.06 0.24 S 0.3 0.02 S 0.56 0.04 S 0.7 0.3 L 0.4 0.32'],
    Q: [0.82, 'M 0.42 1 S 0.12 0.9 S 0 0.5 S 0.12 0.08 S 0.4 0 S 0.68 0.1 S 0.78 0.5 S 0.68 0.9 S 0.42 1 Z M 0.5 0.16 L 0.66 -0.24'],
    a: [0.62, 'M 0.56 0.82 S 0.38 1 S 0.12 0.92 S 0.02 0.5 S 0.12 0.08 S 0.3 0 S 0.5 0.1 S 0.58 0.4 M 0.6 1 L 0.6 0.1 S 0.64 0 S 0.72 0.02'],
    y: [0.6, 'M 0 1 L 0.3 0.1 M 0.6 1 L 0.26 -0.55']
  },
  geo: {
    A: [0.8, 'F 0 0 L 0.4 1 L 0.8 0 Z'],
    M: [0.98, 'F 0 0 L 0.28 1 L 0.56 0 Z F 0.42 0 L 0.7 1 L 0.98 0 Z'],
    V: [0.76, 'F 0 1 L 0.76 1 L 0.38 0 Z'],
    W: [1.08, 'F 0 1 L 0.58 1 L 0.29 0 Z F 0.5 1 L 1.08 1 L 0.79 0 Z'],
    D: [0.66, 'M 0.02 1 L 0.02 0 F 0.14 1 S 0.46 0.94 S 0.66 0.5 S 0.46 0.06 S 0.14 0 Z'],
    E: 'lower:e', H: 'lower:h', I: 'lower:i', J: 'lower:j', U: 'lower:u',
    C: [0.6, 'M 0.58 0.88 S 0.36 1 S 0.1 0.86 S 0 0.5 S 0.1 0.14 S 0.36 0 S 0.58 0.12'],
    O: [0.8, 'M 0.4 1 S 0.12 0.88 S 0 0.5 S 0.12 0.12 S 0.4 0 S 0.68 0.12 S 0.8 0.5 S 0.68 0.88 S 0.4 1 Z'],
    i: [0.16, 'M 0.08 1 L 0.08 0 F 0.08 1.5 S 0.0 1.42 S 0.08 1.34 S 0.16 1.42 Z'],
    j: [0.34, 'M 0.26 1 L 0.26 -0.25 S 0.18 -0.5 S 0.02 -0.48 F 0.26 1.5 S 0.18 1.42 S 0.26 1.34 S 0.34 1.42 Z'],
    '.': [0.18, 'F 0.09 0.18 S 0 0.09 S 0.09 0 S 0.18 0.09 Z']
  },
  tonya: {
    A: [0.62, 'M 0 0 L 0.32 1 L 0.62 0 M 0.08 0.3 L 0.58 0.34'],
    M: [0.78, 'M 0 0 L 0.06 1 L 0.38 0.28 L 0.72 1 L 0.78 0'],
    N: [0.6, 'M 0 0 L 0.02 1 L 0.58 0 L 0.6 1'],
    O: [0.62, 'M 0.32 1 S 0.06 0.86 S 0 0.5 S 0.08 0.1 S 0.3 0 S 0.54 0.1 S 0.62 0.5 S 0.56 0.88 S 0.32 1 Z'],
    S: [0.56, 'M 0.54 0.88 S 0.32 1 S 0.08 0.92 S 0.05 0.7 S 0.26 0.54 S 0.5 0.42 S 0.56 0.18 S 0.38 0.01 S 0.12 0.02 S 0 0.14'],
    G: [0.64, 'M 0.6 0.9 S 0.4 1 S 0.12 0.9 S 0 0.5 S 0.1 0.08 S 0.34 0 S 0.6 0.12 L 0.62 0.46 L 0.36 0.46'],
    D: [0.6, 'M 0.02 1 L 0 0 M 0.02 1 L 0.26 0.98 S 0.52 0.82 S 0.6 0.46 S 0.5 0.12 S 0.24 0 L 0 0.02'],
    E: [0.5, 'M 0.5 1 L 0.02 1 L 0 0 L 0.5 0.02 M 0.02 0.5 L 0.46 0.52'],
    R: [0.56, 'M 0 0 L 0 1 L 0.26 1 S 0.5 0.9 S 0.54 0.72 S 0.44 0.55 S 0.24 0.5 L 0 0.5 M 0.2 0.5 L 0.56 0']
  },
  // rabiosa (A): alta y estrecha, vértices en pico, curvas que siguen siendo curvas
  rab: {
    A: [0.62, 'M 0 0 L 0.31 1 L 0.62 0 M 0.1 0.3 L 0.54 0.33'],
    M: [0.78, 'M 0 0 L 0.03 1 L 0.39 0.14 L 0.74 1 L 0.78 0'],
    N: [0.62, 'M 0 0 L 0.02 1 L 0.6 0 L 0.62 1'],
    V: [0.64, 'M 0 1 L 0.32 0 L 0.64 1'],
    W: [0.92, 'M 0 1 L 0.2 0 L 0.46 0.82 L 0.72 0 L 0.92 1'],
    E: [0.5, 'M 0.5 1 L 0.02 1 L 0 0 L 0.5 0.02 M 0.01 0.54 L 0.42 0.56'],
    S: [0.54, 'M 0.52 0.88 S 0.32 1 S 0.08 0.92 S 0.05 0.7 S 0.26 0.54 S 0.48 0.42 S 0.54 0.18 S 0.36 0.01 S 0.12 0.02 S 0 0.14'],
    O: [0.62, 'M 0.32 1 S 0.06 0.86 S 0 0.5 S 0.08 0.1 S 0.32 0 S 0.56 0.1 S 0.62 0.5 S 0.54 0.88 S 0.32 1 Z'],
    C: [0.58, 'M 0.56 0.86 S 0.36 1 S 0.1 0.9 S 0 0.5 S 0.1 0.1 S 0.34 0 S 0.58 0.12'],
    G: [0.62, 'M 0.6 0.86 S 0.4 1 S 0.1 0.9 S 0 0.5 S 0.1 0.1 S 0.34 0 S 0.58 0.1 L 0.6 0.44 L 0.32 0.44'],
    D: [0.6, 'M 0.02 1 L 0 0 M 0.02 1 S 0.44 0.94 S 0.6 0.5 S 0.44 0.06 S 0 0'],
    R: [0.56, 'M 0 0 L 0 1 L 0.24 1 S 0.5 0.9 S 0.52 0.7 S 0.36 0.56 L 0 0.54 M 0.2 0.55 L 0.56 0']
  },
  // rabiosa a lo loco (B): se pasa de largo, travesaños que cruzan, E de dos golpes
  wild: {
    A: [0.62, 'M 0 -0.02 L 0.32 1.08 L 0.62 -0.04 M 0.02 0.36 L 0.66 0.42'],
    E: [0.52, 'M 0.52 1 L 0.02 1 L 0.02 0.5 L 0.42 0.52 M 0.02 0.5 L 0 0 L 0.54 0.02'],
    N: [0.6, 'M 0 -0.02 L 0.02 1.06 L 0.58 0 L 0.6 1.1'],
    M: [0.8, 'M 0 0 L 0.03 1.06 L 0.4 0.08 L 0.76 1.08 L 0.8 -0.02'],
    V: [0.64, 'M -0.02 1.08 L 0.32 0 L 0.66 1.1'],
    S: [0.54, 'M 0.54 0.9 S 0.32 1.02 S 0.06 0.92 S 0.04 0.7 S 0.26 0.54 S 0.48 0.42 S 0.54 0.18 S 0.36 0 S 0.1 0.02 S -0.02 0.16'],
    O: [0.62, 'M 0.4 0.98 S 0.06 0.9 S 0 0.5 S 0.08 0.08 S 0.32 0 S 0.56 0.1 S 0.62 0.5 S 0.54 0.9 S 0.26 1.02 S 0.12 0.94'],
    T: [0.66, 'M -0.04 1 L 0.7 1.04 M 0.32 1.06 L 0.3 -0.04'],
    H: [0.62, 'M 0 1.06 L 0 0 M 0.62 1.08 L 0.6 -0.02 M -0.04 0.5 L 0.68 0.54'],
    I: [0.1, 'M 0.05 1.08 L 0.05 -0.04'],
    L: [0.5, 'M 0 1.08 L 0 0 L 0.54 0.02']
  },
  fine: {
    B: [0.58, 'M 0 1 L 0 0 M 0 1 L 0.26 1 S 0.44 0.95 S 0.48 0.82 S 0.4 0.7 L 0.24 0.66 L 0 0.66 M 0.24 0.66 S 0.52 0.58 S 0.58 0.3 S 0.48 0.06 L 0.28 0 L 0 0'],
    K: [0.58, 'M 0 1 L 0 0 M 0.56 1 L 0.02 0.5 M 0.2 0.62 L 0.58 0'],
    R: [0.6, 'M 0 0 L 0 1 L 0.28 1 S 0.48 0.94 S 0.54 0.8 S 0.46 0.66 S 0.28 0.6 L 0 0.6 M 0.24 0.6 L 0.6 0']
  }
};

const cache = new Map();

// ------------------------------------------------------------------ mini lenguaje de trazos
function parsePath(d) {
  const t = d.trim().split(/\s+/);
  const strokes = [];
  let cur = null;
  for (let i = 0; i < t.length;) {
    const c = t[i++];
    if (c === 'Z') { if (cur) cur.closed = true; continue; }
    const x = parseFloat(t[i++]), y = parseFloat(t[i++]);
    if (c === 'M' || c === 'F') { cur = { pts: [[x, y, true]], closed: false, fill: c === 'F' }; strokes.push(cur); }
    else if (cur) cur.pts.push([x, y, c === 'L']);
  }
  for (const s of strokes) { const n = s.pts.length; if (n) { s.pts[0][2] = true; s.pts[n - 1][2] = true; } }
  return strokes;
}

// Catmull-Rom entre esquinas, remuestreado cada `step`
function densify(pts, step) {
  if (pts.length < 2) return pts.map(p => [p[0], p[1]]);
  const out = [[pts[0][0], pts[0][1]]];
  let a = 0;
  for (let k = 1; k < pts.length; k++) {
    if (!pts[k][2] && k < pts.length - 1) continue;
    const seg = pts.slice(a, k + 1);
    const sm = catmull(seg.map(p => [p[0], p[1]]), step);
    sm.shift();
    for (const q of sm) out.push(q);
    a = k;
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
    let t1 = [(p2[0] - p0[0]) * 0.5, (p2[1] - p0[1]) * 0.5], t2 = [(p3[0] - p1[0]) * 0.5, (p3[1] - p1[1]) * 0.5];
    const lim = t => { const l = Math.hypot(t[0], t[1]), mx = L * 1.2; return l > mx ? [t[0] / l * mx, t[1] / l * mx] : t; };
    t1 = lim(t1); t2 = lim(t2);
    for (let k = 1; k <= m; k++) {
      const t = k / m, tt = t * t, ttt = tt * t;
      const h1 = 2 * ttt - 3 * tt + 1, h2 = -2 * ttt + 3 * tt, h3 = ttt - 2 * tt + t, h4 = ttt - tt;
      out.push([h1 * p1[0] + h2 * p2[0] + h3 * t1[0] + h4 * t2[0], h1 * p1[1] + h2 * p2[1] + h3 * t1[1] + h4 * t2[1]]);
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
function plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function cutEnd(p, frac) {
  const L = plen(p) * frac; let acc = 0, k = p.length - 1;
  while (k > 1 && acc < L) { acc += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); k--; }
  return p.slice(0, k + 1);
}

// ------------------------------------------------------------------ definición de cada carácter
function defFor(st, base, cursive, v) {
  if (cursive) { const c = SK.CURS[base]; return c ? { w: c[0], d: c[1], lower: true, cursive: true } : null; }
  const rf = refDef(st, base, v);
  if (rf) return rf;
  const ov = st.ovr && OVR[st.ovr] ? OVR[st.ovr][base] : null;
  if (ov) {
    if (typeof ov === 'string' && ov.indexOf('lower:') === 0) { const l = SK.LOWER[ov.slice(6)]; return l ? { w: l[0], d: l[1], lower: true, asCap: true } : null; }
    return { w: ov[0], d: ov[1], lower: /[a-zñ]/.test(base) };
  }
  if (SK.LOWER[base]) return { w: SK.LOWER[base][0], d: SK.LOWER[base][1], lower: true, wk: autoWide(st, true) };
  if (SK.CAPS[base]) return { w: SK.CAPS[base][0], d: SK.CAPS[base][1], lower: false, wk: autoWide(st, false) };
  return null;
}

// ------------------------------------------------------------------ letras de referencia (escritura real)
// refglyphs.js: esqueletos sacados de muestras de escritura de verdad (tools/glyphref.py). Cada estilo usa las
// suyas; lo que falta sale del esqueleto genérico con las proporciones de esas muestras (autoWide).
// Se normalizan: mayúsculas sobre la base y de altura 1 (conservan algo de su desigualdad); minúsculas con
// altura de x 1, ascendentes y descendentes ~1,55.
const ASC = 'bdfhklt', DESC = 'gjpqy';
const refCache = new Map();
function refTable(st, lower) { const R0 = st.ref && RG[st.ref]; return R0 ? R0[lower ? 'minus' : 'mayus'] || null : null; }
function refKeys(tab, base) {
  const ks = [];
  if (tab[base]) ks.push(base);
  for (let i = 2; tab[base + '#' + i]; i++) ks.push(base + '#' + i);
  return ks;
}
function refDef(st, base, v) {
  const lower = /[a-zñ]/.test(base);
  const tab = refTable(st, lower);
  if (!tab) return null;
  const ks = refKeys(tab, base);
  if (!ks.length) return null;
  const key = st.ref + (lower ? '|m|' : '|M|') + ks[(v || 0) % ks.length];
  if (!refCache.has(key)) refCache.set(key, normRef(tab[ks[(v || 0) % ks.length]], base, lower));
  const r = refCache.get(key);
  return { w: r.w, strokes: r.strokes, lower, ref: true };
}
function normRef(g, base, lower) {
  const strokes = parsePath(g[1]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of strokes) for (const q of s.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const h = Math.max(0.05, y1 - y0);
  let target = 1, bottom = 0, top = null;
  if (lower) {
    if (ASC.indexOf(base) >= 0) target = base === 't' ? 1.3 : 1.55;
    else if (DESC.indexOf(base) >= 0) { target = 1.55; top = 1; }
  } else if (base === 'Q') { top = 1; target = Math.min(1.25, Math.max(1, h)); }
  // (se conserva un poco de la desigualdad de la muestra)
  const k = Math.pow(target / h, 0.88);
  const H = h * k;
  const dy = top != null ? top - H : bottom;
  for (const s of strokes) for (const q of s.pts) { q[0] = (q[0] - x0) * k; q[1] = (q[1] - y0) * k + dy; }
  return { w: (x1 - x0) * k, strokes };
}
// anchura de las letras del esqueleto genérico para que casen con las de la muestra (mediana de proporciones)
const wideCache = new Map();
function autoWide(st, lower) {
  const tab = refTable(st, lower) || (lower ? refTable(st, false) : null);
  if (!tab) return st.wide;
  const key = st.ref + (lower ? 'm' : 'M');
  if (wideCache.has(key)) return wideCache.get(key);
  const rs = [];
  for (const k of Object.keys(tab)) {
    const b = k.split('#')[0];
    const sk = lower && /[a-zñ]/.test(b) ? SK.LOWER[b] : !lower && SK.CAPS[b] ? SK.CAPS[b] : SK.LOWER[b] || SK.CAPS[b];
    if (!sk || 'IJijlft1'.indexOf(b) >= 0) continue;
    const r = normRef(tab[k], b, /[a-zñ]/.test(b));
    rs.push(r.w / Math.max(0.2, sk[0]));
  }
  rs.sort((a, b) => a - b);
  const v = rs.length ? Math.max(0.5, Math.min(1.25, rs[rs.length >> 1])) : st.wide;
  wideCache.set(key, v);
  return v;
}

// glifo de molde (mayúsculas/minúsculas), variante v. Devuelve null si el carácter no está.
function printGlyph(styleKey, ch, v, altIdx, cursive, capS) {
  const st = styleOf(styleKey);
  const nfd = ch.normalize ? ch.normalize('NFD') : ch;
  let base = nfd[0];
  const marks = Array.from(nfd.slice(1));
  if (ch === 'ñ' || ch === 'Ñ') { base = ch === 'ñ' ? 'n' : 'N'; if (!marks.length) marks.push('̃'); }
  let def = altIdx != null && SK.ALT[base] && SK.ALT[base][altIdx] ? { w: SK.ALT[base][altIdx][0], d: SK.ALT[base][altIdx][1], lower: true } : defFor(st, base, cursive, v);
  if (!def) return null;
  const rnd = R.mulberry32((hashStr(styleKey + (cursive ? '|c|' : '|') + ch) + v * 7919 + 13) >>> 0);
  const g = () => R.gauss(rnd);
  let strokes = def.strokes ? def.strokes.map(s => ({ pts: s.pts.map(q => q.slice()), closed: s.closed, fill: s.fill })) : parsePath(def.d);
  // sin punto si lleva tilde (í, ï)
  if (marks.length && (base === 'i' || base === 'j')) strokes = strokes.filter(s => !(s.pts.length === 2 && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 0.05) && !(s.fill && s.pts[0][1] > 1.2));
  // ---- variación estructural (propia de la variante)
  const H = def.lower && !def.asCap ? 1 : 1;
  const wob = st.wob * (def.ref ? 0.35 : 1), seedW = (rnd() * 1e6) | 0;
  for (const s of strokes) {
    const P = s.pts;
    const n = P.length;
    if (n === 2 && !s.fill && !def.ref) {
      const dx = P[1][0] - P[0][0], dy = P[1][1] - P[0][1], L = Math.hypot(dx, dy) || 1;
      const horiz = Math.abs(dy) < 0.3 * Math.abs(dx), vert = Math.abs(dx) < 0.3 * Math.abs(dy);
      if (horiz && L > 0.15) {
        // travesaño: altura variable y se pasa de largo
        const midY = (P[0][1] + P[1][1]) / 2;
        if (midY > 0.12 * H && midY < 0.88 * H) { const sh = g() * st.cb + st.cbShift * (1 - Math.abs(midY - 0.5) * 2); P[0][1] += sh; P[1][1] += sh + g() * st.cb * 0.4; }
        const o0 = Math.max(0, st.os + g() * st.osVar), o1 = Math.max(0, st.os + g() * st.osVar);
        P[0][0] -= dx / L * o0 * (0.4 + rnd()); P[0][1] -= dy / L * o0 * 0.3;
        P[1][0] += dx / L * o1 * (0.4 + rnd()); P[1][1] += dy / L * o1 * 0.3;
      } else if (vert && st.stem) {
        const e0 = st.stem * (rnd() * 1.3 - 0.3), e1 = st.stem * (rnd() * 1.3 - 0.3);
        P[0][0] -= dx / L * e0; P[0][1] -= dy / L * e0; P[1][0] += dx / L * e1; P[1][1] += dy / L * e1;
      }
    }
    // deformación de la letra (por puntos de control)
    for (const q of P) {
      q[0] += wob * R.noise2(q[0] * 2.2, q[1] * 2.2, seedW) * 1.4;
      q[1] += wob * R.noise2(q[0] * 2.2 + 7.7, q[1] * 2.2, seedW + 1) * 1.4;
    }
    // angulosa: las curvas se vuelven tramos rectos
    if (st.angular) for (let k = 1; k < n - 1; k++) if (!P[k][2] && rnd() < st.angular) P[k][2] = true;
  }
  // tildes y marcas
  let bx0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const s of strokes) for (const q of s.pts) { if (q[0] < bx0) bx0 = q[0]; if (q[0] > bx1) bx1 = q[0]; if (q[1] > by1) by1 = q[1]; }
  const bodyTop = def.lower && !def.asCap ? Math.min(by1, 1.05) : Math.min(by1, 1.02);
  const markStrokes = [];
  for (const mk of marks) {
    const md = SK.MARKS[mk]; if (!md) continue;
    const cx = (bx0 + bx1) / 2 + (def.lower ? 0.02 : 0);
    const below = mk === '̧';
    for (const s of parsePath(md)) {
      for (const q of s.pts) { q[0] = cx + q[0] * (def.lower ? 1 : 1.1); q[1] = below ? q[1] : bodyTop + q[1] * (def.lower ? 1.05 : 0.9) + (def.lower ? 0.08 : 0.04); q[0] += g() * st.wob; }
      s.mark = !below;
      markStrokes.push(s);
    }
  }
  strokes = strokes.concat(markStrokes);
  // ---- a em
  // (cursiva: altura de x, anchura e inclinación de la cursiva del estilo; menos desigualdad)
  const unit = cursive ? CAP * st.xhS : def.lower && !def.asCap ? CAP * st.xh : CAP;
  const hS = Math.exp(g() * st.hVar * (cursive ? 0.45 : 1)), wS = Math.exp(g() * st.wVar * (cursive ? 0.5 : 1)) * (cursive ? (st.scriptW || 0.8) : def.ref ? (st.refW || 1) : (def.wk || st.wide) * (st.refW || 1));
  const slant = (cursive || capS ? st.slantS : st.slant) + g() * (cursive ? (st.slantVarS != null ? st.slantVarS : st.slantVar * 0.5) : st.slantVar);
  const step = 0.012 / unit;
  const out = [];
  for (const s of strokes) {
    let pts = st.angular >= 1 && !st.geo ? resample(s.pts.map(p => [p[0], p[1]]), step) : densify(s.pts, step);
    if (s.closed && !s.fill && st.open && rnd() < 0.7) pts = cutEnd(pts, st.open * (0.05 + 0.12 * rnd()));
    // temblor fino (la mano, al trazar)
    if (st.wobF) { let acc = 0; pts = pts.map((q, k) => { if (k) acc += Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]); return [q[0] + st.wobF * R.noise1(acc * 9, seedW + 5), q[1] + st.wobF * R.noise1(acc * 9 + 40, seedW + 6)]; }); }
    pts = pts.map(([x, y]) => { const Y = y * unit * hS; return [x * unit * wS + Y * slant, -Y]; });
    const o = { pts, closed: s.closed, fill: !!s.fill, mark: !!s.mark };
    out.push(o);
    // trazo doble suelto (nerviosa)
    if (st.double && !cursive && !s.fill && !s.mark && rnd() < st.double && pts.length > 3) {
      // la segunda pasada sale del mismo sitio y se abre un poco (se pasa de largo o se queda corta)
      const p0 = pts[0], rot = (rnd() - 0.5) * 0.12, off = 0.008 + 0.012 * rnd(), ang = rnd() * 6.28, ext = 1 + (rnd() - 0.3) * 0.12;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      out.push({ pts: pts.map(([x, y]) => { const dx = (x - p0[0]) * ext, dy = (y - p0[1]) * ext; return [p0[0] + cr * dx - sr * dy + Math.cos(ang) * off, p0[1] + sr * dx + cr * dy + Math.sin(ang) * off]; }), closed: s.closed, fill: false, mark: false, extra: true });
    }
  }
  const fg = finishGlyph(out, def.w * unit * wS, ch, !!cursive, def.lower && !def.asCap, !!cursive);
  if (cursive) fg.own = true;
  return fg;
}

function finishGlyph(strokes, adv, ch, script, lower, exact) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, bx0 = Infinity, bx1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (!s.mark) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; }
  }
  if (!strokes.length) { x0 = 0; x1 = adv; y0 = -CAP; y1 = 0; }
  if (!isFinite(bx0)) { bx0 = x0; bx1 = x1; }
  // avance: la anchura dibujada manda (las letras se colocan por su tinta)
  // (cursiva ligada: el avance es la salida de la letra; las astas inclinadas no empujan a la siguiente)
  return { adv: exact ? adv : Math.max(adv, bx1 - Math.min(0, bx0)), strokes, box: { left: x0, top: y0, right: x1, bottom: y1 }, body: { left: bx0, right: bx1 }, script, lower, ch };
}

// ------------------------------------------------------------------ cursiva (fuentes ligadas)
function fontOf(key) { return FD[key] || FD.script; }
// (también sirve para estilos de molde hechos con una fuente de trazo: la elegante, con EMS Elfin)
function scriptGlyph(styleKey, ch, v, printFont) {
  const st = styleOf(styleKey);
  let F = fontOf(printFont ? st.print : st.script), g = F.g[ch];
  if (!g && printFont) return null;
  if (!g) { F = FD.script; g = F.g[ch]; }
  if (!g) { const nfd = ch.normalize ? ch.normalize('NFD') : ch; if (nfd.length > 1 && nfd[0] !== ch) return scriptGlyph(styleKey, nfd[0], v); return null; }
  const m = F.m, s0 = CAP / m.cap;
  const xhWant = (printFont ? st.xh : st.xhS) * CAP, xh = m.xh * s0, asc = Math.max(m.asc, m.cap) * s0;
  const kx = xhWant / xh;
  const isLower = ch !== ch.toUpperCase() || /[a-zñ]/.test(ch);
  const capE = m.cap * s0;
  const mapY = y => {
    if (!isLower) { if (y > capE * 1.04) return capE * 1.04 + (y - capE * 1.04) * 0.5 - Math.min(0.08, (y - capE * 1.04) * 0.25); return y; }
    if (y <= 0) return y * Math.min(1.25, 0.6 + 0.4 * kx);
    if (y <= xh) return y * kx;
    const top = Math.max(asc, xh + 0.05);
    return xhWant + (y - xh) * Math.max(0.45, (top - xhWant) / Math.max(1e-6, top - xh));
  };
  const rnd = R.mulberry32((hashStr(styleKey + (printFont ? '|p|' : '|s|') + ch) + v * 7919) >>> 0);
  const seedW = (rnd() * 1e6) | 0;
  const slant = (printFont ? st.slant : st.slantS) + R.gauss(rnd) * st.slantVar * 0.6;
  const hS = Math.exp(R.gauss(rnd) * st.hVar * 0.5);
  const strokes = [];
  for (const [closed, flat] of g[1]) {
    let pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] * s0, flat[i + 1] * s0, false]);
    if (pts.length) { pts[0][2] = true; pts[pts.length - 1][2] = true; }
    
    pts = densify(pts.map(p => [p[0] + st.wob * 0.5 * R.noise2(p[0] * 3, p[1] * 3, seedW), p[1] + st.wob * 0.5 * R.noise2(p[0] * 3 + 5, p[1] * 3, seedW + 1), p[2]]), 0.012);
    // cursiva rápida: la mano redondea los rizos pequeños y no remata las esquinas (suavizado a lo largo)
    if (!printFont && st.scriptSmooth) pts = smoothPts(pts, st.scriptSmooth);
    pts = pts.map(([x, y]) => { const Y = mapY(y) * hS; return [x * (printFont ? 0.9 + 0.1 * st.wide : (st.scriptW || 0.9)) + Y * slant, -Y]; });
    if (pts.length >= 2) strokes.push({ pts, closed: !!closed, fill: false, mark: false });
  }
  const bodyTop = -(isLower ? xhWant * 0.93 : CAP * 1.02);
  for (const s of strokes) { let lowest = -Infinity; for (const q of s.pts) if (q[1] > lowest) lowest = q[1]; s.mark = lowest < bodyTop && strokes.length > 1; }
  return finishGlyph(strokes, g[0] * s0 * (printFont ? 0.9 + 0.1 * st.wide : (st.scriptW || 0.9)), ch, !printFont, isLower);
}

function smoothPts(p, sigma) {
  if (p.length < 4) return p;
  const n = p.length, S = [0];
  for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return p.map((q, i) => {
    if (i === 0 || i === n - 1) return q;
    let sx = 0, sy = 0, sw = 0;
    for (let j = i; j >= 0 && S[i] - S[j] < sigma * 2.5; j--) { const w = Math.exp(-((S[i] - S[j]) ** 2) / (2 * sigma * sigma)); sx += p[j][0] * w; sy += p[j][1] * w; sw += w; }
    for (let j = i + 1; j < n && S[j] - S[i] < sigma * 2.5; j++) { const w = Math.exp(-((S[j] - S[i]) ** 2) / (2 * sigma * sigma)); sx += p[j][0] * w; sy += p[j][1] * w; sw += w; }
    return [sx / sw, sy / sw];
  });
}

// ------------------------------------------------------------------ API
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// glifo de un carácter en un estilo y modo; v: variante (0..NVAR-1)
function glyph(styleKey, mode, ch, v) {
  v = (v || 0) % NVAR;
  const key = styleKey + '|' + mode + '|' + ch + '|' + v;
  if (cache.has(key)) return cache.get(key);
  let r = null;
  if (ch === ' ') r = null;
  else if (mode === 'cursiva' && styleOf(styleKey).script === 'own') r = printGlyph(styleKey, ch, v, null, true) || printGlyph(styleKey, ch, v, null, false, true);
  else if (mode === 'cursiva') r = scriptGlyph(styleKey, ch, v) || printGlyph(styleKey, ch, v);
  else r = (styleOf(styleKey).print ? scriptGlyph(styleKey, ch, v, true) : null) || printGlyph(styleKey, ch, v) || scriptFallback(ch);
  if (cache.size > 6000) cache.clear();
  cache.set(key, r);
  return r;
}
function scriptFallback(ch) {
  const F = FD.readability || FD.script; const g = F && F.g[ch];
  if (!g) return null;
  const s0 = CAP / F.m.cap;
  const strokes = g[1].map(([closed, flat]) => { const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] * s0, -flat[i + 1] * s0]); return { pts, closed: !!closed, fill: false, mark: false }; }).filter(s => s.pts.length > 1);
  return finishGlyph(strokes, g[0] * s0, ch, false, false);
}

// métricas (em, y hacia arriba en los valores)
function metrics(styleKey, mode) {
  const st = styleOf(styleKey);
  if (mode === 'cursiva' && st.script === 'own') {
    const xh = st.xhS * CAP;
    return { cap: CAP, xh, asc: Math.max(CAP * 1.05, xh * 2.05), desc: xh * 1.0, space: 0.2 * (0.8 + 0.2 * (st.scriptW || 0.8)) };
  }
  if (mode === 'cursiva' || st.print) {
    const pf = mode !== 'cursiva';
    const F = fontOf(pf ? st.print : st.script), s0 = CAP / F.m.cap;
    const xh = (pf ? st.xh : st.xhS) * CAP;
    return { cap: CAP, xh, asc: Math.max(CAP * 1.04, xh + (Math.max(F.m.asc, F.m.cap) * s0 - F.m.xh * s0) * 0.9), desc: Math.min(0.42, -F.m.desc * s0), space: (pf ? (mode === 'mayus' ? 0.4 : 0.3) : 0.27) * (0.8 + 0.2 * st.wide) };
  }
  const xh = st.xh * CAP;
  const hv = 1 + st.hVar * 1.2;
  return { cap: CAP, xh, asc: Math.max(CAP * hv, xh * 1.55 * hv), desc: xh * 0.58, space: (mode === 'mayus' ? 0.42 : 0.32) * (0.55 + 0.45 * st.wide) };
}

function caseText(text, mode) { return mode === 'mayus' ? text.toLocaleUpperCase('es') : text; }

// palabra: coloca las letras por su tinta (ningún hueco parece un espacio ni se pisan de más)
// seedW: para escoger variantes distintas en cada palabra
function setWord(styleKey, mode, word, trackExtra, inkW, seedW) {
  const st = styleOf(styleKey);
  const isScript = mode === 'cursiva';
  const track = (isScript ? st.trackS : st.track) + (trackExtra || 0) * (isScript ? 0.3 : 1);
  const out = [];
  let x = 0, i = 0;
  const s0 = (seedW || 0) * 31;
  for (const ch of Array.from(word)) {
    const v = (s0 + i * 7 + ch.charCodeAt(0)) % NVAR;
    i++;
    const g = glyph(styleKey, mode, ch, v);
    if (!g) { x += 0.3; continue; }
    // cursiva: cada letra empieza donde acaba la anterior (salida -> entrada), como la mano al ligar
    if (out.length && isScript && g.strokes.length) {
      const pv = out[out.length - 1];
      const ex = pv.g.script && /[a-zñáéíóúü]/i.test(pv.g.ch) ? exitPt(pv.g) : null, en = g.script && /[a-zñáéíóúü]/i.test(g.ch) ? entryPt(g) : null;
      if (ex && en && pv.g.own && g.own) x = pv.x + ex[0] - en[0] + 0.035 + track;
      // (fuentes ligadas: si la letra sale abajo y muy a la izquierda de su avance, como la d, la siguiente se acerca)
      else if (ex && en && ex[1] > -0.1) x = pv.x + Math.max(pv.g.adv * 0.6, band(pv.g, true) - band(g, false) + 0.03, Math.min(pv.g.adv + track, ex[0] + 0.07 + track - Math.min(en[0], 0.04)));
      else {
        // (mayúscula y minúscula no se ligan: un hueco pequeño entre sus cuerpos)
        // (medido en la franja de la altura de x: con la cursiva tumbada, lo de arriba no cuenta)
        const gap = (x + band(g, false)) - (pv.x + band(pv.g, true)), want = 0.05 + track + 2 * (inkW || 0);
        x += want - gap;
      }
    }
    if (out.length && !isScript && g.strokes.length) {
      const pv = out[out.length - 1];
      const gap = (x + g.body.left) - (pv.x + pv.g.body.right);
      const w2 = 2 * (inkW || 0) * st.weight;
      const narrow = gg => gg.body.right - gg.body.left < 0.12;
      const maxGap = st.track + 0.05 + w2 + Math.max(0, trackExtra || 0) * 0.6;
      const minGap = st.minGap + w2 * 0.8 + Math.min(0, trackExtra || 0) + (narrow(pv.g) || narrow(g) ? 0.03 : 0);
      if (gap > maxGap) x -= gap - maxGap; else if (gap < minGap) x += minGap - gap;
    }
    out.push({ g, x });
    x += g.adv + track;
  }
  const last = out[out.length - 1];
  const width = out.length ? Math.max(last.x + last.g.body.right, last.x + last.g.box.right * 0.5) - Math.min(0, out[0].g.body.left) : 0;
  return { glyphs: out, width };
}

// punto de salida y de entrada de una letra ligada (los mismos que usa joinCursive)
function band(gg, right) { let v = right ? -Infinity : Infinity; for (const s of gg.strokes) if (!s.mark) for (const q of s.pts) if (q[1] > -0.3 && q[1] < 0.02) v = right ? Math.max(v, q[0]) : Math.min(v, q[0]); return isFinite(v) ? v : right ? gg.body.right : gg.body.left;}
function exitPt(g) {
  let best = -Infinity, pt = null;
  for (const s of g.strokes) {
    if (s.closed || s.fill || s.mark || plen(s.pts) < 0.06) continue;
    const a = s.pts[0], e = s.pts[s.pts.length - 1];
    if (s.pts.length < 40 && Math.abs(e[1] - a[1]) < 0.03 && plen(s.pts) < 0.3 && g.strokes.length > 1) continue;
    const sc = e[0] + e[1] * 0.2; if (sc > best) { best = sc; pt = e; }
  }
  return pt;
}
function entryPt(g) {
  let best = Infinity, pt = null;
  for (const s of g.strokes) {
    if (s.closed || s.fill || s.mark || plen(s.pts) < 0.06) continue;
    const e = s.pts[0]; const sc = e[0] - e[1] * 0.2; if (sc < best) { best = sc; pt = e; }
  }
  return pt;
}
// cursiva: une la salida de cada letra con la entrada de la siguiente
function joinCursive(letters, emTol) {
  const tol = emTol || 0.09;
  for (let i = 1; i < letters.length; i++) {
    const L = letters[i], A = letters[i - 1];
    if (!A.joinable || !L.joinable) continue;
    let ai = -1, best = -Infinity;
    // (la raya de la t no cuenta como salida: es corta y casi horizontal)
    const isBar = s => { const a = s.pts[0], e = s.pts[s.pts.length - 1]; return s.pts.length < 40 && Math.abs(e[1] - a[1]) < 0.03 && plen(s.pts) < 0.3; };
    // (los puntos de la i y la j no son salidas)
    const isDot = s => plen(s.pts) < 0.06;
    A.strokes.forEach((s, k) => { if (s.closed || s.fill || s.mark || isBar(s) || isDot(s)) return; const e = s.pts[s.pts.length - 1]; const sc = e[0] + e[1] * 0.2; if (sc > best) { best = sc; ai = k; } });
    let bi = -1, bestb = Infinity;
    L.strokes.forEach((s, k) => { if (s.closed || s.fill || s.mark || plen(s.pts) < 0.06) return; const e = s.pts[0]; const sc = e[0] - e[1] * 0.2; if (sc < bestb) { bestb = sc; bi = k; } });
    if (ai < 0 || bi < 0) continue;
    const sa = A.strokes[ai], sb = L.strokes[bi];
    const e = sa.pts[sa.pts.length - 1], b0 = sb.pts[0];
    const d = Math.hypot(b0[0] - e[0], b0[1] - e[1]);
    if (d > tol * (L.size || 1) * 3) continue;
    const ta = tangent(sa.pts, true), tb = tangent(sb.pts, false);
    const bridge = [];
    const n = Math.max(2, Math.ceil(d / 0.01)), k = d * 0.6;
    for (let j = 1; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const h1 = 2 * t3 - 3 * t2 + 1, h2 = -2 * t3 + 3 * t2, h3 = t3 - 2 * t2 + t, h4 = t3 - t2;
      bridge.push([h1 * e[0] + h2 * b0[0] + h3 * ta[0] * k + h4 * tb[0] * k, h1 * e[1] + h2 * b0[1] + h3 * ta[1] * k + h4 * tb[1] * k]);
    }
    sa.pts = sa.pts.concat(bridge, sb.pts);
    sa.joined = true;
    L.strokes.splice(bi, 1);
  }
  return letters;
}
function tangent(p, atEnd) {
  const n = p.length;
  const a = atEnd ? p[Math.max(0, n - 4)] : p[0], b = atEnd ? p[n - 1] : p[Math.min(n - 1, 3)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

// plantillas para el calco (sin estilo ni variación), con alternativas: [{ strokes, box }]
function templates(ch) {
  const out = [];
  const nfd = ch.normalize ? ch.normalize('NFD') : ch;
  const base = (ch === 'ñ' ? 'n' : ch === 'Ñ' ? 'N' : nfd[0]);
  const mk = (alt) => {
    const g = printGlyph('__plantilla', ch, 0, alt);
    return g;
  };
  const g0 = mk(null); if (g0) out.push(g0);
  if (SK.ALT[base]) SK.ALT[base].forEach((a, i) => { const g = mk(i); if (g) out.push(g); });
  return out;
}
STYLES.__plantilla = { label: '', wide: 1, slant: 0, slantVar: 0, hVar: 0, wVar: 0, wob: 0, wobF: 0, angular: 0, geo: 0, os: 0, osVar: 0, stem: 0, cb: 0, cbShift: 0, open: 0, xh: 0.7, track: 0.05, minGap: 0.03, weight: 1, bounce: 0, sizeVar: 0, double: 0, ovr: null, script: 'script', xhS: 0.55, slantS: 0, trackS: 0 };

const STYLE_KEYS = ['infantil', 'adulta', 'nerviosa', 'elegante'];
module.exports = { STYLES, PERSONAS, STYLE_KEYS, CAP, NVAR, styleOf, glyph, metrics, caseText, setWord, joinCursive, templates, resample, parsePath, densify };
