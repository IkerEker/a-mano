'use strict';
// Motor de pintado de A mano.
// Cada trazo es una CINTA continua (no círculos estampados: sin lobulados ni rayas en las curvas) forrada con
// una textura de trazo real sacada de TRAZOS/ (js/texdata.js): el inicio del trazo usa el inicio real del
// escaneo, el final usa su final (carga, colas secas, goteos) y el medio se recorre sin repetir costuras.
// Encima, efectos propios de cada herramienta: grano de papel pegado al papel (lápiz, carboncillo, cera),
// borde húmedo y acumulación donde se montan (rotulador, aguada), sequedad progresiva (pincel seco),
// presión según la dirección (el pincel engorda al bajar).
// Sin dependencias de Photoshop.

const R = require('./rng.js');
const RD = require('./render.js');
const TD = require('./texdata.js');

// ------------------------------------------------------------------ herramientas y packs
// w: medio ancho del trazo en em; dens: opacidad; tIn/tOut: grosor al entrar/salir (fracción);
// inL/outL: longitud de la entrada/salida (en medios anchos); press: variación de presión;
// down: engorda al bajar; grain: grano de papel; wet: borde húmedo; pool: carga al empezar/acabar;
// dry: se seca a lo largo; tremor: temblor; up: probabilidad de empezar por abajo los trazos verticales;
// lift: probabilidad de que el trazo no llegue del todo (la mano levanta antes)
// tone: cuánto oscurece la presión (aprieta al bajar, en las curvas y al frenar; afloja en las subidas rápidas)
// load: cuánta carga pierde a lo largo del trazo (el pincel empieza cargado y acaba seco)
// blend: 'multiply' tinta transparente (se monta y oscurece) u 'over' pintura que tapa (guache, óleo)
// fuse: el repasado se funde (más pigmento) en vez de verse como líneas sueltas
const BASE = { capSkip: 0.15, fams: ['rotu'], w: 0.03, dens: 0.92, tIn: 0.6, tOut: 0.5, inL: 1.5, outL: 2.5, press: 0.12, down: 0, grain: 0, wet: 0, pool: 0, dry: 0, tremor: 1, up: 0, lift: 0.2, minR: 0.55, light: 0, tone: 0.2, load: 0, blend: 'multiply', fuse: false, vW: 0.12, vInk: 0.9, fly: 0.3 };
const TOOLS = {
  lapiz: {
    label: 'Lápiz', presets: {
      hb: { label: 'HB', fams: ['lapiz'], w: 0.019, dens: 1.15, tIn: 0.65, tOut: 0.5, inL: 2.5, outL: 4, press: 0.2, down: 0.06, grain: 0.5, tremor: 1.1, lift: 0.3, tone: 0.4 },
      blando: { label: 'Blando 6B', fams: ['lapiz'], w: 0.03, dens: 1.3, tIn: 0.7, tOut: 0.55, inL: 2, outL: 3.5, press: 0.18, down: 0.08, grain: 0.4, tremor: 1.05, lift: 0.25, tone: 0.4 },
      nervioso: { label: 'Nervioso', fams: ['lapiz'], w: 0.021, dens: 1.1, tIn: 0.6, tOut: 0.45, inL: 2, outL: 3.5, press: 0.22, down: 0.06, grain: 0.45, tremor: 1.3, lift: 0.45, tone: 0.45, extraPass: 1 }
    }
  },
  carbon: {
    label: 'Carboncillo', presets: {
      suave: { label: 'Suave', fams: ['carbon'], w: 0.045, dens: 1.0, tIn: 0.8, tOut: 0.7, inL: 1, outL: 2, press: 0.12, down: 0.05, grain: 0.5, tremor: 1.0, tone: 0.35, load: 0.2 },
      fuerte: { label: 'Fuerte', fams: ['carbon'], w: 0.052, dens: 1.35, tIn: 0.85, tOut: 0.75, inL: 1, outL: 1.6, press: 0.1, down: 0.05, grain: 0.32, tremor: 1.0, tone: 0.3, load: 0.15 },
      fino: { label: 'Fino', fams: ['carbon'], w: 0.03, dens: 1.15, tIn: 0.75, tOut: 0.6, inL: 1.2, outL: 2, press: 0.12, down: 0.05, grain: 0.45, tremor: 1.0, tone: 0.35, load: 0.15 }
    }
  },
  cera: {
    label: 'Cera', presets: {
      oleo: { label: 'Gruesa', fams: ['cera'], w: 0.06, dens: 1.25, tIn: 0.92, tOut: 0.85, inL: 0.6, outL: 1, press: 0.06, grain: 0.2, tremor: 0.85, tone: 0.18, load: 0.35, blend: 'over', fuse: true },
      cera: { label: 'Blanda', fams: ['cera'], w: 0.045, dens: 1.15, tIn: 0.9, tOut: 0.8, inL: 0.6, outL: 1, press: 0.06, grain: 0.42, tremor: 0.9, tone: 0.22, load: 0.2, fuse: true },
      fina: { label: 'Fina', fams: ['cera'], w: 0.032, dens: 1.2, tIn: 0.88, tOut: 0.78, inL: 0.8, outL: 1.2, press: 0.07, grain: 0.32, tremor: 0.9, tone: 0.22, load: 0.25, blend: 'over', fuse: true }
    }
  },
  boli: {
    label: 'Bolígrafo', presets: {
      // boli: línea fina y constante (no se afila), borde limpio con dos carriles algo más cargados (el surco de
      // la bola), más oscura donde aprieta, algún salto de la bola y algún grumo al empezar
      bic: { label: 'BIC', proc: 'marker', pen: true, w: 0.0068, dens: 0.9, tIn: 0.95, tOut: 0.9, inL: 1, outL: 1.5, press: 0.04, grain: 0.1, pool: 0.25, wet: 0.5, streak: 0.15, skip: 0.35, tremor: 0.6, lift: 0.2, tone: 0.5, minR: 0.6 },
      fino: { label: 'Fino', proc: 'marker', pen: true, w: 0.0048, dens: 0.88, tIn: 0.95, tOut: 0.9, inL: 1, outL: 1.5, press: 0.03, grain: 0.1, pool: 0.25, wet: 0.45, streak: 0.12, skip: 0.4, tremor: 0.6, lift: 0.2, tone: 0.45, minR: 0.55 },
      gel: { label: 'Gel', proc: 'marker', w: 0.016, dens: 1.0, tIn: 0.9, tOut: 0.85, inL: 1.2, outL: 2, press: 0.06, wet: 0.25, pool: 0.35, tremor: 0.95, lift: 0.15, tone: 0.3, grain: 0.04, fuse: true }
    }
  },
  rotulador: {
    label: 'Rotulador', presets: {
      fino: { label: 'Fino', proc: 'marker', load: 0.15, w: 0.022, dens: 0.93, tIn: 0.95, tOut: 0.92, inL: 1, outL: 1.2, press: 0.04, wet: 0.1, pool: 0.4, tremor: 0.75, lift: 0.1, tone: 0.12, grain: 0.06, fuse: true },
      gordo: { label: 'Gordo', useFont: true, proc: 'marker', load: 0.18, w: 0.055, dens: 0.9, tIn: 0.97, tOut: 0.95, inL: 0.8, outL: 1, press: 0.03, wet: 0.1, pool: 0.35, tremor: 0.7, lift: 0.08, tone: 0.1, grain: 0.07, fuse: true },
      gastado: { label: 'Gastado', proc: 'marker', w: 0.05, dens: 0.95, tIn: 0.95, tOut: 0.9, inL: 0.8, outL: 1, press: 0.05, wet: 0.15, pool: 0.15, dry: 0.75, tremor: 0.3, lift: 0.1, tone: 0.15, load: 0.3, grain: 0.12, fuse: true }
    }
  },
  pincel: {
    label: 'Pincel', presets: {
      fino: { label: 'Fino', fams: ['pincelfino', 'guache'], w: 0.036, dens: 1.1, tIn: 0.6, tOut: 0.5, inL: 2, outL: 3.5, press: 0.12, down: 0.3, tremor: 0.85, up: 0.5, lift: 0.15, tone: 0.3, load: 0.45, blend: 'over', fuse: true },
      gordo: { label: 'Gordo', useFont: true, fams: ['pincel'], w: 0.08, dens: 1.15, tIn: 0.8, tOut: 0.65, inL: 1, outL: 1.8, press: 0.07, down: 0.1, tremor: 0.8, up: 0.5, lift: 0.1, tone: 0.25, load: 0.5, blend: 'over', fuse: true },
      seco: { label: 'Seco', useFont: true, fams: ['pincel', 'guache', 'brocha'], w: 0.07, dens: 1.15, tIn: 0.85, tOut: 0.7, inL: 1, outL: 1.6, press: 0.08, down: 0.08, dry: 0.75, grain: 0.15, tremor: 0.85, up: 0.5, lift: 0.1, tone: 0.25, load: 0.55, blend: 'over', fuse: true },
      humedo: { label: 'Húmedo', useFont: true, fams: ['aguada'], w: 0.07, dens: 1.15, tIn: 0.8, tOut: 0.7, inL: 1, outL: 1.6, press: 0.08, down: 0.08, wet: 0.12, tremor: 0.8, up: 0.5, lift: 0.1, tone: 0.2, load: 0.4, fuse: true }
    }
  }
};
const TOOL_ORDER = ['lapiz', 'carbon', 'cera', 'boli', 'rotulador', 'pincel'];
// SPRAY (bote de pintura) y MOP (rotulador de goteo). core: hasta dónde tapa del todo (en radios); soft: franja en
// que se deshace en motas; mist: nube de alrededor; drip: cuánto chorrea; spit: gotas que escupe la boquilla;
// fill: cuánto tapa el cuerpo (seco: deja ver la pared); haze: velo de color alrededor; flare: finales que se van
TOOLS.spray = {
  label: 'Spray', presets: {
    gordo: { label: 'Gordo', proc: 'spray', w: 0.07, dens: 1, core: 0.6, soft: 0.42, mist: 1, drip: 1, spit: 1, fill: 1, haze: 0.6, flare: 0.3, blend: 'over', tremor: 0.5, lift: 0, minR: 1 },
    fino: { label: 'Fino', proc: 'spray', w: 0.032, dens: 1, core: 0.74, soft: 0.24, mist: 0.5, drip: 0.4, spit: 0.5, fill: 1, haze: 0.2, flare: 0.45, blend: 'over', tremor: 0.5, lift: 0, minR: 1 },
    seco: { label: 'Seco', proc: 'spray', w: 0.065, dens: 1, core: 0.5, soft: 0.55, mist: 0.9, drip: 0, spit: 0.3, fill: 0.6, haze: 0.35, flare: 0.5, blend: 'over', tremor: 0.5, lift: 0, minR: 1 },
    mop: { label: 'Mop', proc: 'spray', mop: true, w: 0.055, dens: 1, core: 0.95, soft: 0.06, mist: 0, drip: 1.25, spit: 0.8, fill: 1, haze: 0, flare: 0, blend: 'over', tremor: 0.5, lift: 0, minR: 1 },
    // punta plana: rotulador biselado o brocha (la herramienta de las firmas); nib: ángulo del filo; thick: su grosor; dry: vetas
    plano: { label: 'Plano', proc: 'spray', flat: true, w: 0.085, dens: 1, nib: -0.62, thick: 0.2, dry: 0.5, drip: 0.5, blend: 'over', tremor: 0.4, lift: 0, minR: 1.2 },
    rastro: { label: 'Barra', proc: 'spray', flat: true, w: 0.08, dens: 1, nib: -0.45, thick: 0.3, dry: 0.85, drip: 0, blend: 'over', tremor: 0.4, lift: 0, minR: 1.2 },
    // empapado: bote sobre tela o papel que chupa: la pintura cala y se corre, sin borde, con la trama a la vista
    empapado: { label: 'Empapado', proc: 'spray', soak: true, w: 0.1, padK: 1.35, dens: 1, drip: 0, spit: 1.5, blend: 'over', tremor: 0.5, lift: 0, minR: 1.5 },
    // rodillo de tóner: banda ancha, translúcida y rayada, con los cantos cargados (se suma al cruzarse)
    rodillo: { label: 'Rodillo', proc: 'spray', band: true, w: 0.085, dens: 1, drip: 0, blend: 'multiply', tremor: 0.15, lift: 0, minR: 3 }
  }
};
TOOL_ORDER.push('spray');

// respuesta a la velocidad de la mano, por herramienta: vW grosor (más ancho donde va despacio), vInk tinta,
// fly: cuántos trazos empiezan o acaban «al vuelo» (la mano entra o sale moviéndose: punta afilada y más clara)
const SPEED = { lapiz: { vW: 0.05, vInk: 1.0, fly: 0.5 }, carbon: { vW: 0.08, vInk: 0.8, fly: 0.35 }, cera: { vW: 0.06, vInk: 0.7, fly: 0.2 },
  boli: { vW: 0.1, vInk: 1.1, fly: 0.45 }, rotulador: { vW: 0.07, vInk: 0.35, fly: 0.3 }, pincel: { vW: 0.28, vInk: 0.6, fly: 0.18 } };
function preset(tool, pk) {
  const T = TOOLS[tool] || TOOLS.rotulador;
  const keys = Object.keys(T.presets);
  const p = T.presets[pk] || T.presets[keys[0]];
  return Object.assign({}, BASE, SPEED[tool] || {}, p, { tool: TOOLS[tool] ? tool : 'rotulador', preset: T.presets[pk] ? pk : keys[0] });
}

// ------------------------------------------------------------------ texturas
function b64(s) {
  const T = new Uint8Array(128);
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < 64; i++) T[A.charCodeAt(i)] = i;
  let n = s.length; while (n && s[n - 1] === '=') n--;
  const out = new Uint8Array((n * 3) >> 2);
  let o = 0;
  for (let i = 0; i < n; i += 4) {
    const a = T[s.charCodeAt(i)], b = T[s.charCodeAt(i + 1)], c = i + 2 < n ? T[s.charCodeAt(i + 2)] : 0, d = i + 3 < n ? T[s.charCodeAt(i + 3)] : 0;
    const v = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (v >> 16) & 255;
    if (o < out.length) out[o++] = (v >> 8) & 255;
    if (o < out.length) out[o++] = v & 255;
  }
  return out;
}

let strips = null, byFam = null, paper = null;
function load() {
  if (strips) return;
  strips = TD.strips.map(s => ({ fam: s.f, w: s.w, h: s.h, mh: s.mh, ar: s.ar, raw: s.d, data: null, blur: {} }));
  byFam = {};
  strips.forEach((s, i) => { (byFam[s.fam] = byFam[s.fam] || []).push(i); });
  if (TD.paper) { const d = b64(TD.paper.d); paper = new Float32Array(d.length); for (let i = 0; i < d.length; i++) paper[i] = d[i] / 255; }
  else { paper = new Float32Array(65536); for (let i = 0; i < 65536; i++) paper[i] = R.hash2(i & 255, i >> 8, 5); }
}
function stripData(S) {
  if (!S.data) { const d = b64(S.raw); S.data = new Float32Array(d.length); for (let i = 0; i < d.length; i++) S.data[i] = d[i] / 255; S.raw = null; }
  return S.data;
}
// versión desenfocada a lo ancho (para trazos de pocos píxeles: evita dientes de sierra)
function stripBlur(S, rad) {
  if (rad <= 0) return stripData(S);
  if (S.blur[rad]) return S.blur[rad];
  const src = stripData(S), W = S.w, H = S.h, out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let k = -rad; k <= rad; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += src[row + xx]; n++; } }
      out[row + x] = s / n;
    }
  }
  S.blur[rad] = out;
  return out;
}
function pickStrip(fams, rnd) {
  load();
  const list = [];
  for (const f of fams) if (byFam[f]) for (const i of byFam[f]) list.push(i);
  if (!list.length) return strips[0];
  return strips[list[Math.floor(rnd() * list.length) % list.length]];
}
function famAvailable(f) { load(); return !!byFam[f]; }

// ------------------------------------------------------------------ geometría del trazo
const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function resample(pts, step) {
  const out = [{ x: pts[0].x, y: pts[0].y, w: pts[0].w == null ? 1 : pts[0].w, s: 0 }];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-9) continue;
    const m = Math.max(1, Math.ceil(L / step));
    const wa = a.w == null ? 1 : a.w, wb = b.w == null ? 1 : b.w;
    for (let k = 1; k <= m; k++) {
      const t = k / m;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: wa + (wb - wa) * t, s: acc + L * t });
    }
    acc += L;
  }
  return out;
}

// ------------------------------------------------------------------ un trazo
// pts: [{x, y, w?}] en píxeles del documento (w: factor de grosor opcional por punto)
// P: pack (preset); r: medio ancho nominal en px; rgb; seed
// opts: { inkMul, dryMul, paperScale, alphaMul, startUp }
function paintStroke(canvas, pts, P, r, rgb, seed, opts) {
  opts = opts || {};
  if (!pts || pts.length < 2) return;
  if (P.proc === 'spray') return paintSpray(canvas, pts, P, r, rgb, seed, opts);
  load();
  const rnd = R.mulberry32(seed >>> 0);
  r = Math.max(P.minR, r);
  const step = Math.max(0.5, Math.min(r * 0.35, 3));
  const Q = resample(pts, step);
  const n = Q.length;
  if (n < 2) return;
  const Ls = Q[n - 1].s;
  if (Ls < 0.3) return;
  // tangentes suavizadas y normales
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 2)], b = Q[Math.min(n - 1, i + 2)];
    let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1;
    Q[i].tx = tx / tl; Q[i].ty = ty / tl;
  }
  // ---- VELOCIDAD DE LA MANO (cinemática de la escritura): la mano frena en las curvas cerradas (ley de los dos
  // tercios: v ∝ curvatura^(-1/3)), arranca acelerando y frena al final (perfil lognormal de cada trazo). Donde va
  // despacio deja más tinta y algo más de ancho; donde va deprisa, el trazo es más fino y más claro.
  // Algunos trazos entran o salen «al vuelo»: la mano ya se mueve cuando toca el papel o aún se mueve al soltar:
  // punta afilada y más clara (lo que distingue una escritura suelta de una dibujada despacio).
  {
    const kw2 = Math.max(2, Math.round(r * 1.2 / step));
    const kap = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Q[Math.max(0, i - kw2)], b = Q[Math.min(n - 1, i + kw2)];
      kap[i] = Math.acos(Math.max(-1, Math.min(1, a.tx * b.tx + a.ty * b.ty))) / Math.max(1e-6, b.s - a.s);
    }
    var flyIn0, flyOut0;
    const shortS = Ls < r * 7;      // puntos y tildes: nunca al vuelo (se quedarían en nada)
    const flyIn = !shortS && !opts.contIn && rnd() < (P.fly || 0) * 0.6 * (opts.flyMul == null ? 1 : opts.flyMul), flyOut = !shortS && !opts.contOut && rnd() < (P.fly || 0) * (opts.flyMul == null ? 1 : opts.flyMul);
    flyIn0 = flyIn; flyOut0 = flyOut;
    const accL = Math.min(Ls * 0.22, r * 4.5), decL = Math.min(Ls * 0.28, r * 5.5);
    const vs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let km = 0, kn = 0; for (let k = Math.max(0, i - kw2); k <= Math.min(n - 1, i + kw2); k++) { km += kap[k]; kn++; }
      const vk = Math.min(1, Math.pow(km / kn * r * 6 + 0.03, -1 / 3) / Math.pow(0.03, -1 / 3) * 1.9);
      const q = Q[i];
      const e0 = flyIn || opts.contIn ? 1 : 0.3 + 0.7 * smooth01(0, accL, q.s), e1 = flyOut || opts.contOut ? 1 : 0.35 + 0.65 * smooth01(0, decL, Ls - q.s);
      vs[i] = Math.max(0.15, vk * Math.min(e0, e1));
    }
    const flyL0 = Math.min(Ls * 0.22, r * (2 + 2 * rnd())), flyL1 = Math.min(Ls * 0.3, r * (2.5 + 3 * rnd()));
    for (let i = 0; i < n; i++) {
      const q = Q[i];
      q.v = vs[i];
      q.fw = 1; q.fi = 1;
      // (fieltro: al vuelo apenas adelgaza; se aclara. Boli, lápiz, pincel: la punta se afila)
      const felt = P.proc && !P.pen, brush = P.blend === 'over', wmin0 = felt ? 0.82 : brush ? 0.65 : 0.4, wmin1 = felt ? 0.78 : brush ? 0.6 : 0.3;
      if (flyIn) { const t = smooth01(0, flyL0, q.s); q.fw *= wmin0 + (1 - wmin0) * t; q.fi *= (P.pen ? 0.25 : 0.55) + (P.pen ? 0.75 : 0.45) * t; }
      if (flyOut) { const t = smooth01(0, flyL1, Ls - q.s); q.fw *= wmin1 + (1 - wmin1) * t; q.fi *= (felt ? 0.6 : 0.5) + (felt ? 0.4 : 0.5) * t; }
    }
  }
  // presión: entrada, salida, ondulación lenta, dirección (el pincel engorda al bajar)
  const pSeed = seed + 13;
  const inL = Math.min(P.inL * r, Ls * 0.32), outL = Math.min(P.outL * r, Ls * 0.42);
  for (const q of Q) {
    const ent = opts.contIn ? 1 : P.tIn + (1 - P.tIn) * smooth01(0, inL, q.s);
    const ext = opts.contOut ? 1 : P.tOut + (1 - P.tOut) * smooth01(0, outL, Ls - q.s);
    const pr = 1 + P.press * R.noise1(q.s / (r * 7 + 1), pSeed) + P.press * 0.4 * R.noise1(q.s / (r * 2.2 + 1), pSeed + 3);
    const dir = 1 + P.down * (q.ty > 0 ? q.ty : q.ty * 0.55);
    const vw = 1 + (P.vW || 0) * ((1 - q.v) - 0.4);
    q.h = Math.max(P.minR, r * q.w * Math.min(ent, ext) * pr * dir * vw * q.fw);
  }
  // pigmento a lo largo del trazo: presión (aprieta al bajar, en las curvas y al frenar; afloja en las subidas
  // rápidas) y carga (el pincel empieza cargado y se va quedando seco)
  // curvatura medida en una ventana de ~1.5 anchos y suavizada (si no, cada vértice deja una banda)
  const kw = Math.max(2, Math.round(r * 1.5 / step));
  const slowA = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - kw)], b = Q[Math.min(n - 1, i + kw)];
    const turn = Math.acos(Math.max(-1, Math.min(1, a.tx * b.tx + a.ty * b.ty))) / Math.max(1e-6, b.s - a.s);
    slowA[i] = smooth01(0.02, 0.3, turn * r);
  }
  for (let i = 0; i < n; i++) {
    const q = Q[i];
    let sl = 0, sn = 0; for (let k = Math.max(0, i - kw); k <= Math.min(n - 1, i + kw); k++) { sl += slowA[k]; sn++; }
    const slow = 0.35 * (sl / sn) + (P.vInk == null ? 0.9 : P.vInk) * (1 - q.v - 0.3);
    const down = q.ty > 0 ? q.ty : 0, up = q.ty < 0 ? -q.ty : 0;
    let tone = 1 + P.tone * (0.5 * down - 0.45 * up + 0.8 * slow + 0.45 * R.noise1(q.s / (r * 4 + 1), pSeed + 9));
    if (P.pool) tone *= 1 + P.pool * (1 - smooth01(0, r * 2.2, q.s)) * 1.2;
    tone = Math.max(0.45, Math.min(1.9, tone));
    const load = 1 + (P.load || 0) * (0.45 - q.s / Ls) * (opts.loadMul == null ? 1 : opts.loadMul);
    q.pig = tone * Math.max(0.3, load) * q.fi;
  }
  // textura: cinta escogida, mapa a lo largo (inicio real, final real, medio sin costuras)
  const proc = P.proc || null;                       // 'marker': rotulador procedural (sin cinta)
  const S = proc ? { w: 23, h: 64, mh: 10, ar: 1 } : pickStrip(P.fams, rnd);
  const W = S.w, Hs = S.h, mh = S.mh;
  const E = (W - 1) / 2 / mh;                       // la cinta abarca ±E medios anchos
  const cpp = mh / r;                                // columnas por píxel (a lo ancho)
  const rpp = cpp / S.ar;                            // filas por píxel (a lo largo)
  const Lr = Hs - 1;
  const need = Ls * rpp;
  const blurRad = cpp > 2.2 ? Math.min(6, Math.round(cpp / 2.2)) : 0;
  const tex = proc ? null : stripBlur(S, blurRad);
  const hEnd0 = Q[0].h, hEnd1 = Q[n - 1].h;
  // (solo algunos extremos se quedan quietos un momento y cargan tinta; los que salen al vuelo, nunca)
  const endK0 = flyIn0 ? 0 : rnd() < 0.45 ? 1 : 0.15, endK1 = flyOut0 ? 0 : rnd() < 0.5 ? 1 : 0.15;
  const mSeed = (seed * 7 + 3) | 0;
  // rotulador: vetas a lo largo (la fibra de la punta), deriva lenta; el borde se come un poco el papel
  const marker = (s, v, px, py) => {
    let cap = 0, ve = Math.abs(v);
    if (s < 0) { ve = Math.hypot(v, -s / hEnd0); cap = 1; }
    else if (s > Ls) { ve = Math.hypot(v, (s - Ls) / hEnd1); cap = 1; }
    // carga en los extremos: donde el rotulador se para, la tinta se extiende y oscurece
    const de = Math.min(s, Ls - s), hh = s < Ls / 2 ? hEnd0 : hEnd1;
    let bleed = P.pool ? (1 - smooth01(0, hh * 1.6, Math.max(0, de))) * P.pool * Math.min(1, Ls / (hh * 8)) * (s < Ls / 2 ? endK0 : endK1) : 0;
    // grumo: la punta se ha quedado un momento quieta al empezar y suelta un punto de tinta
    if (opts.blob && s < Ls / 2) bleed += (1 - smooth01(0, hh * 1.3, Math.max(0, s))) * 0.9;
    // borde: casi limpio (el fieltro y la bola no tiemblan); solo el diente del papel lo muerde un poco
    // (rotulador: el fieltro sangra un poco en el papel: canto algo deshilachado a dos escalas)
    const rough = P.pen ? 0.016 * R.noise1(s / (r * 2.5 + 1), mSeed + (v > 0 ? 1 : 2)) + 0.03 * (R.hash2(px, py, mSeed) - 0.5)
      : 0.03 * R.noise1(s / (r * 1.2 + 1), mSeed + (v > 0 ? 1 : 2)) + 0.045 * R.noise1(s / (r * 0.25 + 0.5), mSeed + (v > 0 ? 3 : 4)) + 0.05 * (R.hash2(px, py, mSeed) - 0.5);
    const edge = 1 + rough + 0.14 * bleed;
    const aa = Math.max(0.04, (P.pen ? 0.55 : 0.7) / Math.max(1, r));
    const inside = smooth01(edge + aa, edge - aa, ve);
    if (inside <= 0) return 0;
    // vetas: la punta de fieltro deja franjas algo más claras a lo largo, que derivan despacio
    const vs = v + 0.25 * R.noise1(s / (r * 7 + 1), mSeed + 5);
    // (tres escalas: franjas anchas de la punta, fibras finas y alguna fibra seca más clara)
    const fib = R.noise1(vs * 16 + s / (r * 60 + 1), mSeed + 31);
    const streak = 0.12 * R.noise1(vs * 3.1, mSeed + 7) + 0.09 * R.noise1(vs * 8.5 + s / (r * 30 + 1), mSeed + 9)
      + 0.07 * fib - 0.12 * smooth01(0.55, 0.85, fib);
    // absorción del papel: moteado fino
    const mott = 0.1 * (paper[(((py * 0.7) & 255) << 8) | ((px * 0.7) & 255)] - 0.5);
    // borde: una línea fina un poco más cargada donde la tinta se seca antes
    const rim = P.pen ? (P.wet || 0) * (smooth01(0.25, 0.75, ve / edge) - 0.35) * 0.5   // carriles del surco
      : (P.wet || 0) * 0.55 * smooth01(0.8, 0.97, ve / edge) * (1 - smooth01(0.97, 1.02, ve / edge) * 0.5);
    let a = inside * (0.86 + (P.streak == null ? 1 : P.streak) * streak + mott + rim) * (1 + 0.3 * bleed);
    // rotulador: moteado fino y claro (el papel no absorbe igual en todas partes)
    if (!P.pen) { const pf = paper[(((py * 1.7 + 31) & 255) << 8) | ((px * 1.7 + 17) & 255)]; a *= 1 - 0.28 * smooth01(0.58, 0.85, pf); }
    // pasada rápida: al soltar, la punta se abre en fibras secas (más cuanto más cerca del final)
    if (P.endDry) {
      const dl = Ls - s, Lz = Math.min(Ls * 0.45, hEnd1 * (3 + 3 * R.hash2(3, 7, mSeed))), Lz0 = Math.min(Ls * 0.3, hEnd0 * (1.5 + 2 * R.hash2(5, 9, mSeed)));
      // (al soltar se abre en fibras; al entrar en marcha, algo menos)
      const e = Math.max(1 - smooth01(-hEnd1 * 0.6, Lz, dl), 0.7 * (1 - smooth01(-hEnd0 * 0.6, Lz0, s)));
      if (e > 0.01) {
        const z = 0.5 + 0.5 * R.noise1(vs * 9 + 0.15 * R.noise1(s / (r * 3 + 1), mSeed + 41), mSeed + 43);
        a *= smooth01(e * P.endDry * 0.9, e * P.endDry * 0.9 + 0.2, z) * (1 - 0.3 * e);
      }
    }
    // boli: la bola salta a ratos (claros finos a lo ancho), más en los trazos rápidos
    if (P.skip) {
      const z = 0.5 + 0.5 * R.noise1(s / (r * 4 + 1), mSeed + 23), z2 = R.hash2(Math.floor(s / Math.max(1, r * 0.8)), 3, mSeed + 29);
      a *= 1 - P.skip * smooth01(0.7, 0.88, z) * (0.55 + 0.45 * z2);
    }
    // gastado: la punta seca deja vetas sin tinta, más hacia el final
    if (P.dry > 0) {
      // rotulador gastado: la tinta no llega a todo el fieltro; se abren claros a trozos (no rayas limpias),
      // más hacia el final y en un lado; el grano del papel se queda sin tinta
      const t = Math.max(0, Math.min(1, s / Ls));
      const side = 0.5 + 0.5 * R.noise1(s / (r * 5 + 1), mSeed + 17);
      const z = 0.5 + 0.38 * R.noise2(vs * 2.6, s / (r * 2.2 + 1), mSeed + 13) + 0.18 * R.noise2(vs * 7, s / (r * 0.9 + 1), mSeed + 19)
        - 0.25 * Math.max(0, v * (side - 0.5) * 2);
      const g = paper[(((py * 0.9) & 255) << 8) | ((px * 0.9) & 255)];
      const thr = P.dry * (0.1 + 0.55 * t) + (1 - g) * 0.25 * P.dry;
      a *= 0.25 + 0.75 * smooth01(thr, thr + 0.22, z);
      a *= smooth01(thr * 0.6, thr * 0.6 + 0.25, z + 0.15);
    }
    return a * (cap ? 1 : 1);
  };
  // no siempre se usa el inicio exacto: a veces el trazo «entra» ya cargado
  // (skipCaps: relleno de negativos; se salta el arranque cargado del escaneo)
  const skipIn = P.skipCaps ? Math.max(0, Math.min(Lr - need, Lr * 0.22)) * (0.7 + 0.3 * rnd()) : rnd() < P.capSkip ? rnd() * Math.max(0, Math.min(Lr - need, Lr * 0.15)) : 0;
  const skipOut = P.skipCaps ? Math.max(0, Math.min(Lr - need - skipIn, Lr * 0.15)) * rnd() : rnd() < P.capSkip ? rnd() * Math.max(0, Math.min(Lr - need - skipIn, Lr * 0.15)) : 0;
  const capR = Math.min(Lr * 0.3, Math.max(4, Lr * 0.18));
  const midA = capR, midB = Lr - capR, midL = Math.max(1, midB - midA);
  const midOff = rnd() * midL * 2;
  const pp = u => { u = ((u % (2 * midL)) + 2 * midL) % (2 * midL); return midA + (u < midL ? u : 2 * midL - u); };
  // devuelve [u1, u2, peso de u2]
  const uMap = (s) => {
    if (need <= Lr - skipIn - skipOut) {
      const half = Ls / 2, X = Math.max(step * 2, Ls * 0.18);
      const uA = skipIn + s * rpp, uB = Lr - skipOut - (Ls - s) * rpp;
      return [uA, uB, smooth01(half - X, half + X, s)];
    }
    const a = s * rpp, b = (Ls - s) * rpp;
    if (a < capR) return [a, pp(capR + midOff - capR), smooth01(capR * 0.6, capR, a)];
    const um = pp(a + midOff - capR);
    if (b < capR * 1.5) return [um, Lr - b, smooth01(capR * 1.5, capR * 0.8, b)];
    return [um, um, 0];
  };
  const sampleT = (u, c) => {
    if (c < 0 || c > W - 1) return 0;
    if (u < 0) u = 0; if (u > Lr) u = Lr;
    const u0 = u | 0, c0 = c | 0, fu = u - u0, fc = c - c0;
    const u1 = u0 < Lr ? u0 + 1 : u0, c1 = c0 < W - 1 ? c0 + 1 : c0;
    const a = tex[u0 * W + c0], b = tex[u0 * W + c1], d = tex[u1 * W + c0], e = tex[u1 * W + c1];
    return (a + (b - a) * fc) * (1 - fu) + (d + (e - d) * fc) * fu;
  };
  // caja del trazo
  let hx = 0; for (const q of Q) if (q.h > hx) hx = q.h;
  const pad = hx * E + 2;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of Q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
  bx0 = Math.max(canvas.x0, Math.floor(bx0 - pad)); by0 = Math.max(canvas.y0, Math.floor(by0 - pad));
  bx1 = Math.min(canvas.x0 + canvas.w, Math.ceil(bx1 + pad)); by1 = Math.min(canvas.y0 + canvas.h, Math.ceil(by1 + pad));
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw <= 0 || bh <= 0 || bw * bh > 5e7) return;
  const buf = new Float32Array(bw * bh);
  const dens = P.dens * (opts.inkMul || 1);
  // sequedad: el pincel seco se va abriendo a lo largo del trazo
  const dry = P.dry * (opts.dryMul == null ? 1 : opts.dryMul);
  const pool = P.pool;
  // cada tramo es un cuadrilátero (dos triángulos) con coordenadas (s, v) interpoladas
  const tri = (ax, ay, as, av, bx, by, bs, bv, cx, cy, cs, cv) => {
    const minx = Math.max(bx0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(bx1 - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(by0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(by1 - 1, Math.ceil(Math.max(ay, by, cy)));
    if (minx > maxx || miny > maxy) return;
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-9) return;
    const id = 1 / den;
    for (let py = miny; py <= maxy; py++) {
      const y = py + 0.5;
      for (let px = minx; px <= maxx; px++) {
        const x = px + 0.5;
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) * id;
        if (l1 < -1e-6) continue;
        const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) * id;
        if (l2 < -1e-6) continue;
        const l3 = 1 - l1 - l2;
        if (l3 < -1e-6) continue;
        const s = l1 * as + l2 * bs + l3 * cs, v = l1 * av + l2 * bv + l3 * cv;
        let t0;
        if (proc) t0 = marker(s, v, px, py);
        else {
          // en los remates (fuera del trazo) se usa la última fila real girada: el final redondo tiene el mismo
          // borde que el trazo (sin cuellos ni «biberones»)
          let vv = v, ss = s;
          if (s < 0) { vv = Math.sign(v || 1) * Math.hypot(v, -s / hEnd0); ss = 0; }
          else if (s > Ls) { vv = Math.sign(v || 1) * Math.hypot(v, (s - Ls) / hEnd1); ss = Ls; }
          const c = (W - 1) / 2 + vv * mh;
          const um = uMap(ss);
          t0 = sampleT(um[0], c);
          if (um[2] > 0) t0 += (sampleT(um[1], c) - t0) * um[2];
        }
        if (t0 <= 0.002) continue;
        const qi = Q[Math.max(0, Math.min(n - 1, Math.round(Math.max(0, Math.min(Ls, s)) / step)))];
        let a = t0 * dens * (qi ? qi.pig : 1);
        if (pool && !proc) a *= 1 + pool * 0.5 * (1 - smooth01(0, r * 1.6, Ls - s));
        if (dry > 0 && !proc) {
          const t = s / Ls, thr = dry * (0.12 + 0.75 * t * t);
          a = a * smooth01(thr, thr + 0.22, t0);
        }
        const k = (py - by0) * bw + (px - bx0);
        if (a > buf[k]) buf[k] = a > 2.6 ? 2.6 : a;
      }
    }
  };
  for (let i = 0; i < n - 1; i++) {
    const A = Q[i], B = Q[i + 1];
    const ea = A.h * E, eb = B.h * E;
    const Lx = A.x + A.ty * ea, Ly = A.y - A.tx * ea, Rx = A.x - A.ty * ea, Ry = A.y + A.tx * ea;
    const Lx2 = B.x + B.ty * eb, Ly2 = B.y - B.tx * eb, Rx2 = B.x - B.ty * eb, Ry2 = B.y + B.tx * eb;
    // v en medios anchos LOCALES: la textura se estrecha con la presión
    tri(Lx, Ly, A.s, -E, Rx, Ry, A.s, E, Lx2, Ly2, B.s, -E);
    tri(Rx, Ry, A.s, E, Rx2, Ry2, B.s, E, Lx2, Ly2, B.s, -E);
  }
  // remates redondeados en los extremos (sin ellos el trazo acaba en corte recto)
  // (abanico de medio círculo: del borde izquierdo, por delante, al borde derecho)
  // (con textura y trazo ancho, el inicio y el final reales de la cinta ya son el remate: solo se añade
  //  el medio círculo si la cinta se ha cortado a mitad o el trazo es fino)
  for (const [q, sgn] of [[Q[0], -1], [Q[n - 1], 1]]) {
    if (!proc && r >= 4 && (sgn < 0 ? skipIn : skipOut) === 0) continue;
    const e = q.h * E, segs = 10;
    let prev = null;
    for (let k = 0; k <= segs; k++) {
      const th = Math.PI * k / segs, ct = Math.cos(th), st = Math.sin(th);
      const dx = ct * q.ty + st * sgn * q.tx, dy = -ct * q.tx + st * sgn * q.ty;
      const pt = [q.x + dx * e, q.y + dy * e, -E * ct, q.s + sgn * st * e];
      if (prev) tri(q.x, q.y, q.s, 0, prev[0], prev[1], prev[3], prev[2], pt[0], pt[1], pt[3], pt[2]);
      prev = pt;
    }
  }
  // grano de papel: el lápiz y el carboncillo se quedan en los relieves del papel
  // en trazos de pocos píxeles el grano pesa menos (si no, el lápiz fino desaparece)
  const G = P.grain * (opts.grainMul == null ? 1 : opts.grainMul) * Math.max(0.35, Math.min(1, r / 3.5));
  if (G > 0) {
    const ps = opts.paperScale || 1;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const k = y * bw + x, d = buf[k];
      if (d <= 0) continue;
      const a = Math.min(1, d);
      const gx = ((bx0 + x) / ps) & 255, gy = ((by0 + y) / ps) & 255;
      const g = paper[(gy << 8) | gx];
      const thr = (1 - g) * G;
      const na = Math.max(0, Math.min(1, (a - thr * (0.55 + 0.45 * (1 - a))) / (1 - thr * 0.45)));
      buf[k] = d * na / a;
    }
  }
  // borde húmedo: la tinta se acumula en el borde de la mancha
  if (P.wet > 0.05) wetEdge(buf, bw, bh, Math.max(1, Math.round(r * 0.45)), P.wet);
  // máscara (negativos): donde vale 0 no se pinta (las letras quedan libres)
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask, seed);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, opts.blend || P.blend, opts.alphaMul == null ? 1 : opts.alphaMul);
}
// chorretones: un hilo que baja, algo más ancho donde nace, con su gota al final (para el spray y la punta plana)
function drawDrips(buf, bx0, by0, bx1, by1, bw, drips, dens) {
  for (const d of drips) {
    const yA = Math.max(by0, Math.floor(d.y)), yB = Math.min(by1 - 1, Math.ceil(d.y + d.len + d.w * 1.5));
    const bead = d.w * 1.25, yb = d.y + d.len;
    for (let Y = yA; Y <= yB; Y++) {
      const yy = Y + 0.5 - d.y, t = yy / d.len;
      let hw = t <= 1 ? d.w * (1 - 0.3 * t) * (1 + 0.6 * Math.exp(-yy / (d.w * 3))) : 0;
      const dyb = Y + 0.5 - yb; if (Math.abs(dyb) < bead) hw = Math.max(hw, Math.sqrt(bead * bead - dyb * dyb));
      if (hw <= 0) continue;
      const xc = d.x + d.w * 0.5 * R.noise1(yy / (d.w * 9 + 2), d.sd);
      const xA = Math.max(bx0, Math.floor(xc - hw - 1)), xB = Math.min(bx1 - 1, Math.ceil(xc + hw + 1));
      for (let X = xA; X <= xB; X++) { const al = Math.max(0, Math.min(1, hw - Math.abs(X + 0.5 - xc) + 0.5)) * dens, k = (Y - by0) * bw + (X - bx0); if (al > buf[k]) buf[k] = al; }
    }
  }
}

// EMPAPADO: pigmento y spray sobre tela o papel que chupa. No es un trazo con borde ni un punteado: es tinta.
//  · Se suma la pintura que cae (más donde la mano arranca, duda, gira o se para: charcos redondos). Donde hay
//    mucha, la tela se satura (negro); alrededor la tinta cala y se va en degradado. El bote se acerca y se aleja:
//    hay bordes casi limpios y otros muy difuminados.
//  · Neblina a ratos: un velo gris amplio y suave alrededor de algunos tramos (no de todos).
//  · Manchas: gotas de tinta aguada que la tela chupa (redondeles grises de borde blando, unos más cargados que
//    otros, a veces con cerco), chorreos cortos hacia abajo, gotas negras con sus satélites y alguna mota.
//  · Todo es tono continuo; encima, el grano fino de la tela (más visible en las medias tintas) y su absorción
//    desigual. Las capas se suman como aguadas.
function paintSoak(canvas, pts, P, r, rgb, seed, opts) {
  const rnd = R.mulberry32(((seed >>> 0) ^ 0x2545f491) >>> 0);
  r = Math.max(P.minR || 1.5, r);
  const nube = opts.nube == null ? 0.5 : opts.nube, goteo = opts.goteo == null ? 0.45 : opts.goteo, isFill = !!opts.mask;
  const Q = resample(pts, Math.max(0.6, r * 0.25)), n = Q.length;
  if (n < 2) return;
  const Ls = Q[n - 1].s;
  // ---- este trazo: a qué distancia va el bote, cuánto pigmento lleva, cuánta neblina suelta
  const far = 0.8 + 0.45 * rnd() + (rnd() < 0.25 ? 0.45 * rnd() : 0);
  const thin = !isFill && rnd() < 0.34;                                   // trazo aguado: no llega a negro
  const lam0 = (thin ? 1.1 + 1.8 * rnd() : 4.5 + 5 * rnd()) * (P.dens || 1) * (opts.inkMul == null ? 1 : opts.inkMul);
  const fog = isFill ? 0 : (rnd() < 0.7 ? 0.3 + 1.2 * rnd() : 0.05) * (0.3 + 1.4 * nube);
  const sc = 0.55 * r, sH = (1.5 + 0.9 * nube) * r;
  const fa = rnd() * 6.283, fd = r * (0.3 + 1.1 * rnd()), fox = Math.cos(fa) * fd, foy = Math.sin(fa) * fd;
  const dw0 = isFill || opts.contIn ? 0 : 1 + 3.6 * rnd() * rnd(), dw1 = isFill || opts.contOut ? 0 : 0.6 + 3 * rnd() * rnd();
  const fade = !isFill && !opts.contOut && Ls > r * 4 && rnd() < 0.2;    // a veces el trazo se va al vuelo
  const pools = [];
  if (!isFill && Ls > r * 5) { const m = (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0); for (let k = 0; k < m; k++) pools.push({ s: Ls * (0.15 + 0.7 * rnd()), a: 1 + 3 * rnd() }); }
  const W = new Float32Array(n), K = new Float32Array(n), F = new Float32Array(n), C = new Float32Array(n);
  let wTot = 0;
  for (let i = 0; i < n; i++) {
    const q = Q[i], a = Q[Math.max(0, i - 5)], b = Q[Math.min(n - 1, i + 5)];
    const ds = i === 0 ? (Q[1].s - q.s) / 2 : i === n - 1 ? (q.s - Q[n - 2].s) / 2 : (Q[i + 1].s - Q[i - 1].s) / 2;
    let turn = 0;
    const ux = q.x - a.x, uy = q.y - a.y, vx = b.x - q.x, vy = b.y - q.y, lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu > 1e-6 && lv > 1e-6) turn = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)))) / Math.PI;
    let dwell = dw0 * Math.exp(-q.s / (r * 0.7)) + (fade ? 0 : dw1 * Math.exp(-(Ls - q.s) / (r * 0.7)));
    for (const p of pools) { const e = (q.s - p.s) / (r * 0.6); dwell += p.a * Math.exp(-e * e); }
    let w = (1 + 1.4 * turn + 0.3 * R.noise1(q.s / (r * 3.5 + 1), seed + 3) + 0.35 * R.noise1(q.s / (r * 1.3 + 1), seed + 4)) * (1 + dwell);
    let k = far * (1 + 0.24 * R.noise1(q.s / (r * 5 + 1), seed + 5));
    if (fade) { const t = smooth01(0, Math.min(Ls * 0.45, r * 5), Ls - q.s); w *= 0.1 + 0.9 * t; k *= 1.5 - 0.5 * t; }
    W[i] = ds * w; K[i] = k; wTot += W[i];
    C[i] = isFill ? 1 : 0.5 + 0.8 * (0.5 + 0.5 * R.noise1(q.s / (r * 4.5 + 1), seed + 9));     // carga de pigmento a lo largo
    F[i] = fog * Math.max(0, -0.15 + 1.5 * R.noise1(q.s / (r * 3.5 + 1), seed + 7));
  }
  // (un toque de bote —punto, tilde— deja al menos su charco)
  if (Ls < r * 2 && !isFill) { const want = r * (1.5 + 1.2 * rnd()), f = want / Math.max(1e-6, wTot); if (f > 1) for (let i = 0; i < n; i++) W[i] *= f; }
  // ---- manchas: tinta aguada que cae y cala, chorreos, gotas de pigmento, motas
  const stains = [];
  if (!isFill) {
    const at = () => Q[Math.floor(rnd() * n)];
    const lenK = Math.min(1.6, 0.4 + Ls / (r * 8));
    let m = (0.45 + 2.3 * goteo) * lenK; m = Math.floor(m) + (rnd() < m - Math.floor(m) ? 1 : 0);
    for (let k = 0; k < m; k++) {          // aguadas
      const q = at(), a = rnd() * 6.283, d = r * (0.7 + 2.3 * rnd()), u = rnd();
      stains.push({ x: q.x + Math.cos(a) * d, y: q.y + Math.abs(Math.sin(a)) * d * 1.1 + (rnd() - 0.3) * r, r: r * (0.35 + 0.8 * rnd() * rnd() + 0.3 * rnd()), ay: 1, d: u < 0.45 ? 0.25 + 0.35 * rnd() : u < 0.82 ? 0.6 + 0.8 * rnd() : 1.8 + 2.4 * rnd(), soft: 0.4 + 0.45 * rnd(), ring: rnd() < 0.3 ? 0.3 + 0.6 * rnd() : 0, sd: (seed + k * 53 + 3) | 0 });
    }
    if (rnd() < 0.3 * (0.3 + 1.6 * goteo)) {     // chorreo que la tela chupa: se alarga hacia abajo y se va
      const q = rnd() < 0.6 ? Q[n - 1] : at(), ay = 2 + 3 * rnd(), rr = r * (0.3 + 0.35 * rnd());
      stains.push({ x: q.x + (rnd() - 0.5) * r * 0.6, y: q.y + rr * ay * 0.8, r: rr, ay, d: 0.6 + 2 * rnd(), soft: 0.6, ring: 0, sd: (seed + 611) | 0 });
    }
    m = Math.floor((P.spit || 0) * (0.5 + nube) * (0.3 + 2.4 * rnd() * rnd()) * lenK);
    for (let k = 0; k < m; k++) {          // gotas de pigmento, a veces con su reguero de satélites
      const q = at(), a = rnd() * 6.283, d = r * (1.1 + 3 * rnd() * rnd()), x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d * 0.9 + d * 0.3, rr = Math.max(0.8, r * (0.06 + 0.26 * Math.pow(rnd(), 2.6)));
      stains.push({ x, y, r: rr, ay: 1, d: 3.5 + 3 * rnd(), soft: 0.3 + 0.2 * rnd(), ring: 0, sd: (seed + k * 37 + 5) | 0 });
      if (rnd() < 0.35) { const b = rnd() * 6.283, ns = 2 + Math.floor(rnd() * 4); for (let j = 1; j <= ns; j++) stains.push({ x: x + Math.cos(b) * rr * (1.6 + 1.5 * j) + (rnd() - 0.5) * rr, y: y + Math.sin(b) * rr * (1.6 + 1.5 * j) + (rnd() - 0.5) * rr, r: Math.max(0.6, rr * (0.2 + 0.4 * rnd())), ay: 1, d: 2.5 + 3 * rnd(), soft: 0.4, ring: 0, sd: (seed + k * 37 + j) | 0 }); }
    }
    m = Math.floor((0.4 + 1.6 * nube) * (1 + Ls / (r * 2.5)) * (0.4 + rnd()));
    for (let k = 0; k < m; k++) {          // motas sueltas
      const q = at(), a = rnd() * 6.283, d = r * (1 + 3.6 * rnd());
      stains.push({ x: q.x + Math.cos(a) * d, y: q.y + Math.sin(a) * d, r: Math.max(0.9, r * (0.015 + 0.045 * rnd() * rnd())), ay: 1, d: 0.6 + 2.4 * rnd(), soft: 0.7, ring: 0, sd: (seed + k) | 0 });
    }
  }
  // ---- caja
  const pad = Math.max(3.1 * sH + fd, 3.1 * sc * far * 1.9) + 4;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of Q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
  bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
  for (const d of stains) { const ex = d.r * 1.3 + 2, ey = d.r * d.ay * 1.3 + 2; bx0 = Math.min(bx0, d.x - ex); bx1 = Math.max(bx1, d.x + ex); by0 = Math.min(by0, d.y - ey); by1 = Math.max(by1, d.y + ey); }
  bx0 = Math.max(canvas.x0, Math.floor(bx0)); by0 = Math.max(canvas.y0, Math.floor(by0));
  bx1 = Math.min(canvas.x0 + canvas.w, Math.ceil(bx1)); by1 = Math.min(canvas.y0 + canvas.h, Math.ceil(by1));
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw <= 0 || bh <= 0 || bw * bh > 5e7) return;
  // ---- la pintura que cae, sumada en una rejilla (anclada al documento: sale igual se pinte por franjas o entera)
  const q = Math.max(1, r / 7), ox = Math.floor(bx0 / q) * q, oy = Math.floor(by0 / q) * q;
  const gw = Math.ceil((bx1 - ox) / q) + 2, gh = Math.ceil((by1 - oy) / q) + 2;
  const GC = new Float32Array(gw * gh), GH = new Float32Array(gw * gh);
  const splat = (G, px, py, sig, A) => {
    const cx = (px - ox) / q, cy = (py - oy) / q, sg = sig / q, R3 = 3 * sg, i2 = 1 / (2 * sg * sg);
    const x0 = Math.max(0, Math.floor(cx - R3)), x1 = Math.min(gw - 1, Math.ceil(cx + R3)), y0 = Math.max(0, Math.floor(cy - R3)), y1 = Math.min(gh - 1, Math.ceil(cy + R3));
    for (let gy = y0; gy <= y1; gy++) { const dy = gy - cy, row = gy * gw; for (let gx = x0; gx <= x1; gx++) { const dx = gx - cx, d2 = dx * dx + dy * dy; if (d2 < R3 * R3) G[row + gx] += A * Math.exp(-d2 * i2); } }
  };
  for (let i = 0; i < n; i++) {
    const p = Q[i], k = K[i];
    const jx = r * 0.16 * R.noise1(p.s / (r * 1.6 + 1), seed + 13), jy = r * 0.16 * R.noise1(p.s / (r * 1.6 + 1) + 40, seed + 14);
    splat(GC, p.x + jx, p.y + jy, sc * k, lam0 * C[i] * W[i] / (sc * 2.5066 * k * k));
    if (i % 2 === 0) { const f = F[i] * W[i] + (i + 1 < n ? F[i + 1] * W[i + 1] : 0); if (f > 0) splat(GH, p.x + fox, p.y + foy, sH, 0.85 * f / (sH * 2.5066)); }
  }
  // ---- las manchas, a resolución completa
  const DS = new Float32Array(bw * bh);
  for (const d of stains) {
    const ex = d.r * 1.3 + 2, ey = d.r * d.ay * 1.3 + 2;
    const xA = Math.max(bx0, Math.floor(d.x - ex)), xB = Math.min(bx1 - 1, Math.ceil(d.x + ex)), yA = Math.max(by0, Math.floor(d.y - ey)), yB = Math.min(by1 - 1, Math.ceil(d.y + ey));
    const nf = 1 / (d.r * 0.9 + 1.5), so = d.sd % 89;
    for (let Y = yA; Y <= yB; Y++) for (let X = xA; X <= xB; X++) {
      const dx = X + 0.5 - d.x, dy = (Y + 0.5 - d.y) / d.ay, dist = Math.hypot(dx, dy);
      const t = dist / (d.r * (1 + 0.15 * R.noise2(dx * nf + so, dy * nf, d.sd)));     // contorno irregular
      if (t >= 1.3) continue;
      let v = d.d * (1 - smooth01(1 - d.soft, 1.28, t));
      if (d.ring) v *= 1 + d.ring * smooth01(0.5, 0.92, t);                            // cerco: la aguada seca más oscura en el borde
      if (d.ay > 1) v *= 1 - 0.75 * smooth01(-0.3, 1, dy / d.r);                       // el chorreo se va agotando hacia abajo
      DS[(Y - by0) * bw + (X - bx0)] += v;
    }
  }
  // ---- cuánto tiñe cada punto de la tela
  const buf = new Float32Array(bw * bh);
  const hs = (seed % 9973) + 11, fine = Math.max(1, r * 0.02), wvP = Math.max(2.4, r * 0.06), wf = 6.2832 / wvP;
  const grK = 2.3 * (0.4 + 0.6 * smooth01(4, 16, r));                  // (trazo muy pequeño: menos grano)
  const wvK = 0.16 * smooth01(5, 16, r);
  for (let y = 0; y < bh; y++) {
    const Y = by0 + y + 0.5, gyf = (Y - oy) / q, gy0 = Math.floor(gyf), fy = gyf - gy0;
    if (gy0 < 0 || gy0 >= gh - 1) continue;
    for (let x = 0; x < bw; x++) {
      const X = bx0 + x + 0.5, gxf = (X - ox) / q, gx0 = Math.floor(gxf), fx = gxf - gx0;
      if (gx0 < 0 || gx0 >= gw - 1) continue;
      const i00 = gy0 * gw + gx0, i10 = i00 + 1, i01 = i00 + gw, i11 = i01 + 1;
      const lc = (GC[i00] * (1 - fx) + GC[i10] * fx) * (1 - fy) + (GC[i01] * (1 - fx) + GC[i11] * fx) * fy;
      const lh = (GH[i00] * (1 - fx) + GH[i10] * fx) * (1 - fy) + (GH[i01] * (1 - fx) + GH[i11] * fx) * fy;
      const ds = DS[y * bw + x];
      if (lc + lh + ds < 0.004) continue;
      // la tela no chupa igual en todas partes (a manchas), y los hilos se llevan la tinta a lo largo y a lo ancho
      const m1 = R.noise2(X / (r * 1.6 + 1), Y / (r * 1.6 + 1), hs + 21), m2 = R.noise2(X / (r * 0.42 + 1), Y / (r * 0.42 + 1), hs + 22);
      const th = Math.max(R.noise2(X / (r * 0.7 + 2), Y / (fine * 1.5), 77), R.noise2(X / (fine * 1.5), Y / (r * 0.7 + 2), 78));
      const D = lc * (1 + 0.34 * m1 + 0.2 * m2 + 0.26 * th) + lh * (1 + 0.7 * m1 + 0.35 * m2) + ds * (1 + 0.3 * m1 + 0.25 * m2);
      // (curva con contraste: lo muy tenue se pierde en el blanco y lo denso llega antes a negro, como la tinta al secar)
      const t = smooth01(0.04, 0.92, 1 - Math.exp(-D));
      if (t <= 0) continue;
      // grano fino de la tela (y un poco de su trama): manda en las medias tintas; en lo claro deja motas, en lo oscuro poros
      const g1 = R.hash2(Math.floor(X / fine), Math.floor(Y / fine), hs + 1);
      const g = 0.42 * (g1 * 2 - 1) + 0.5 * R.noise2(X / (fine * 1.7), Y / (fine * 1.7), hs + 2) + wvK * 0.5 * (Math.sin((X + Y * 0.31) * wf) + Math.sin((Y - X * 0.31) * wf));
      let a = t + g * (grK * t * (1 - t) + 0.25 * Math.min(t, 0.12));
      if (g1 < 0.01) a -= 0.45 * t * (1 - t) * 4 + 0.1 * t;                                 // algún poro
      buf[y * bw + x] = a < 0 ? 0 : a > 1 ? 1 : a;
    }
  }
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask, seed);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, 'over', opts.alphaMul == null ? 1 : opts.alphaMul);
}

// RODILLO (rodillo de tóner): una banda ancha que la mano arrastra de canto. Lo que deja no es un gris liso:
//  · cientos de hilos finos a lo largo (los surcos del rodillo), cada uno con su carga, que se abren y se juntan;
//  · una aguada entre ellos, a franjas; zonas donde va cargado y sale negro, con hilos secos en blanco;
//  · el tóner amontonado en los dos cantos (una raya negra irregular, a veces con otra fina por dentro);
//  · una costura oscura donde el rodillo se apoya, donde se levanta y donde se para a medio trazo (y tras cada
//    parada los hilos ya no casan); extremos en corte recto, algo torcido; motas; a ratos, traqueteo en zigzag.
// Se pinta en multiplicar: donde dos bandas se cruzan, se suman.
function paintBand(canvas, pts, P, r, rgb, seed, opts) {
  const rnd = R.mulberry32(((seed >>> 0) ^ 0x7f4a7c15) >>> 0);
  r = Math.max(P.minR || 2, r);
  // (un toque —punto, tilde—: el rodillo no puede dejar menos que un cuadradito)
  { const a = pts[0], b = pts[pts.length - 1]; let L0 = 0; for (let i = 1; i < pts.length; i++) L0 += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (L0 < r * 1.3) { let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy); if (l < 0.5) { dx = 0.2; dy = 1; } const m = Math.hypot(dx, dy), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, h = r * 0.7; pts = [{ x: cx - dx / m * h, y: cy - dy / m * h }, { x: cx + dx / m * h, y: cy + dy / m * h }]; } }
  const Q = resample(pts, Math.max(0.8, r * 0.12)), n = Q.length;
  if (n < 2) return;
  const Ls = Q[n - 1].s;
  if (Ls < 0.5) return;
  const hw0 = r, HWm = hw0 * 1.07, W2 = 2 * hw0;
  const pad = HWm + 3;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of Q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
  bx0 = Math.max(canvas.x0, Math.floor(bx0 - pad)); by0 = Math.max(canvas.y0, Math.floor(by0 - pad));
  bx1 = Math.min(canvas.x0 + canvas.w, Math.ceil(bx1 + pad)); by1 = Math.min(canvas.y0 + canvas.h, Math.ceil(by1 + pad));
  const bw = bx1 - bx0, bh = by1 - by0;
  // ---- cómo viene este trazo (se decide antes de mirar la caja: sale igual se pinte por franjas o entero)
  const ink01 = opts.inkMul == null ? 0.5 : Math.max(0, Math.min(1.6, (opts.inkMul - 0.88) / 0.24));
  // (casi todos los trazos van con poco tóner: aguada clara con los hilos marcados; alguno sale cargado)
  const tone = (rnd() < 0.12 ? 0.42 + 0.35 * rnd() : 0.06 + 0.24 * rnd() * rnd()) * (0.5 + ink01);
  const T1 = Math.max(4, Math.min(190, W2 / 2.2)), px1 = W2 / T1, T2 = T1 * 2.7;
  const fine = smooth01(40, 110, W2), small = 1 - smooth01(14, 60, W2);
  const o1 = rnd() * 997, o2 = rnd() * 997, oB = rnd() * 97, tilt = (rnd() - 0.5) * 0.9;
  const A0 = Q[0], A1 = Q[Math.min(n - 1, 3)], E1 = Q[n - 1], E0 = Q[Math.max(0, n - 4)];
  const dir = (a, b, rot) => { let x = b.x - a.x, y = b.y - a.y; const l = Math.hypot(x, y) || 1; x /= l; y /= l; const c = Math.cos(rot), s2 = Math.sin(rot); return [x * c - y * s2, x * s2 + y * c]; };
  const t0 = dir(A0, A1, (rnd() - 0.5) * 0.14), t1 = dir(E0, E1, (rnd() - 0.5) * 0.14);
  const sk0 = Math.max(1, r * (0.05 + 0.08 * rnd())), sk1 = rnd() < 0.75 ? Math.max(1, r * (0.04 + 0.08 * rnd())) : 0;
  const loop = Math.hypot(A0.x - E1.x, A0.y - E1.y) < hw0 * 1.3 && Ls > hw0 * 5;
  const seams = [];
  if (Ls > r * 8) { const m = (rnd() < 0.6 ? 1 : 0) + (Ls > r * 16 && rnd() < 0.5 ? 1 : 0); for (let k = 0; k < m; k++) seams.push({ s: Ls * (0.18 + 0.64 * rnd()), skew: (rnd() - 0.5) * 0.8, th: Math.max(1.2, r * (0.03 + 0.06 * rnd())), jump: 3 + rnd() * 40, load: rnd() < 0.5 ? 0.3 + 0.5 * rnd() : 0.05 }); seams.sort((a, b) => a.s - b.s); }
  const load0 = rnd() < 0.3 ? 0.25 + 0.45 * rnd() : 0.06 * rnd(), loadLen = r * (1.2 + 4 * rnd());
  const endLoad = rnd() < 0.25 ? 0.15 + 0.4 * rnd() : 0;
  const chat0 = rnd() < 0.35 ? Ls * (0.1 + 0.6 * rnd()) : -1e9, chatL = r * (0.9 + 2.2 * rnd()), chatP = Math.max(3, r * 0.11), chatA = 0.7 + 1.5 * rnd();
  if (bw <= 0 || bh <= 0 || bw * bh > 5e7) return;
  // ---- coordenadas de la banda en cada píxel: u (a lo ancho, con signo) y s (a lo largo)
  const U = new Float32Array(bw * bh).fill(9), S = new Float32Array(bw * bh);
  for (let i = 0; i < n - 1; i++) {
    const a = Q[i], b = Q[i + 1], hw = HWm + 1.5;
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9, dl = Math.sqrt(l2);
    const x0 = Math.max(bx0, Math.floor(Math.min(a.x, b.x) - hw)), x1 = Math.min(bx1 - 1, Math.ceil(Math.max(a.x, b.x) + hw));
    const y0 = Math.max(by0, Math.floor(Math.min(a.y, b.y) - hw)), y1 = Math.min(by1 - 1, Math.ceil(Math.max(a.y, b.y) + hw));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - a.x, py = y + 0.5 - a.y;
      let t = (px * dx + py * dy) / l2;
      if (t < 0) { if (i > 0) t = 0; else continue; } else if (t > 1) { if (i < n - 2) t = 1; else continue; }
      const ex = px - dx * t, ey = py - dy * t, u = Math.hypot(ex, ey) / HWm;
      const k = (y - by0) * bw + (x - bx0);
      if (u < Math.abs(U[k])) { U[k] = dx * ey - dy * ex >= 0 ? u : -u; S[k] = a.s + t * dl; }
    }
  }
  // ---- el tóner
  const buf = new Float32Array(bw * bh);
  const dens = Math.min(1, P.dens || 1), cs = Math.max(1.5, r * 0.04);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const k = y * bw + x;
    if (U[k] > 1 || U[k] < -1) continue;
    let s = S[k];
    const X = bx0 + x + 0.5, Y = by0 + y + 0.5, u = U[k] * 1.07, ua = Math.abs(u), sd = u > 0 ? 0 : 1;
    // los cantos no son paralelos: cada uno ondula por su cuenta
    const side = 1 + 0.035 * R.noise1(s / (r * 1.3 + 1), seed + 55 + sd) + 0.014 * R.noise1(s / (r * 0.28 + 1), seed + 58 + sd);
    const dE = (side - ua) * hw0;
    if (dE < -0.5) continue;
    let aa = Math.min(1, dE + 0.5), d0 = s, d1 = Ls - s;
    // extremos en corte recto (algo torcido y deshilachado). En un lazo, lo que cae detrás del arranque es el final
    // del trazo y lo que pasa del final es el arranque: se pisan (queda la costura, nunca un hueco)
    if (s < hw0 * 1.8) {
      d0 = (X - A0.x) * t0[0] + (Y - A0.y) * t0[1] + r * 0.035 * R.noise1(u * 3.7 + o1, seed + 61);
      if (loop && d0 < 0.5) { s = Ls - 0.01; d0 = 1e9; d1 = 1e9; } else aa = Math.min(aa, d0 + 0.5);
    }
    if (d1 < 1e8 && Ls - s < hw0 * 1.8) {
      d1 = -((X - E1.x) * t1[0] + (Y - E1.y) * t1[1]) + r * 0.035 * R.noise1(u * 3.7 + o2, seed + 62);
      if (loop && d1 < 0.5) { d1 = 1e9; d0 = Math.max(0, (X - A0.x) * t0[0] + (Y - A0.y) * t0[1]); s = Math.max(0.01, d0); } else aa = Math.min(aa, d1 + 0.5);
    }
    if (aa <= 0) continue;
    // paradas a medio trazo: una costura, y a partir de ahí otra pasada (los hilos no casan, la carga vuelve)
    let jump = 0, sl = s, pl = load0, seamA = 0;
    for (const m of seams) {
      const ds = s - (m.s + m.skew * u * hw0);
      if (ds > 0) { jump += m.jump; sl = ds; pl = m.load; }
      if (Math.abs(ds) < m.th * (0.6 + 0.8 * (0.5 + 0.5 * R.noise1(u * 4.1 + m.jump, seed + 75)))) seamA = 0.95;
    }
    // hilos
    const wan = R.noise1(s / (r * 3.5 + 1) + jump, seed + 51);
    let v = (u * 0.5 + 0.5) * T1 + 0.9 * wan + 0.3 * R.noise1(s / (r * 0.8 + 1), seed + 52) + jump;
    if (s > chat0 && s < chat0 + chatL) v += chatA * (Math.abs(((s - chat0) / chatP) % 2 - 1) - 0.5) * Math.min(1, (s - chat0) / (chatL * 0.2), (chat0 + chatL - s) / (chatL * 0.2));
    const j = Math.floor(v), f = Math.abs(v - j - 0.5);
    const h1 = R.hash2(j, 7, seed + 31), h2 = R.hash2(j, 11, seed + 33);
    const dj = Math.pow(h1, 1.6) * Math.max(0, 0.5 + 0.9 * R.noise1(s / (r * 6 + 1) + j * 7.13, seed + 35));
    const wj = 0.1 + 0.26 * h2, e = 0.5 / px1;
    const l1 = 1 - smooth01(wj - e, wj + e, f);
    let l2 = 0;
    if (fine > 0) { const v2 = (u * 0.5 + 0.5) * T2 + 2.4 * wan + jump * 1.7 + 0.37, j2 = Math.floor(v2); l2 = Math.pow(R.hash2(j2, 17, seed + 37), 3) * (1 - smooth01(0.12, 0.34, Math.abs(v2 - j2 - 0.5))) * fine; }
    // aguada a franjas y carga a lo largo
    const B = 0.5 + 0.5 * R.noise1(u * 2.3 + oB + jump * 0.31, seed + 39);
    const load = Math.max(0.03, tone * (1 + 0.5 * tilt * u) + pl * Math.exp(-sl / loadLen) + endLoad * smooth01(Ls - r * 5, Ls, s) + 0.08 * R.noise1(s / (r * 4 + 1), seed + 53));
    let a = load * (0.25 + 0.9 * B * B) + 0.06 * small + l1 * dj * (0.6 + 0.9 * load) * (0.5 + 0.8 * B) + l2 * 0.45 * (0.4 + load);
    // zonas cargadas: negro, con hilos secos
    const th = 0.5 - 0.55 * (load - 0.25), patch = smooth01(th, th + 0.16, R.noise2(s / (r * 4.2 + 1) + o1, u * 1.2 + o2, seed + 71));
    if (patch > 0) a += (1 - a) * patch * (0.95 - 0.7 * (h1 > 0.72 ? l1 : 0) - 0.3 * l2);
    // cantos
    const te = Math.max(1.2 - 0.5 * small, hw0 * (0.06 + 0.045 * R.noise1(s / (r * 1.1 + 1), seed + 63 + sd)));
    if (dE < te) a = Math.max(a, 0.97 - 0.3 * small);
    else {
      a += (1 - a) * 0.38 * Math.exp(-(dE - te) / (te * 1.5));
      const d2 = dE - te * (2.7 + 0.9 * R.noise1(s / (r * 2 + 1), seed + 67));
      if (Math.abs(d2) < Math.max(0.55, te * 0.28) && R.noise1(s / (r * 3 + 1), seed + 68 + sd) > 0.05) a = Math.max(a, 0.72);
    }
    // costuras de arranque y de salida
    if (d0 < sk0 * (0.6 + 0.8 * (0.5 + 0.5 * R.noise1(u * 3.3 + o1, seed + 73)))) a = Math.max(a, 0.95 - 0.35 * small); else if (d0 < sk0 * 5) a += (1 - a) * 0.3 * Math.exp(-(d0 - sk0) / (sk0 * 1.6));
    if (sk1 && d1 < sk1 * (0.6 + 0.8 * (0.5 + 0.5 * R.noise1(u * 3.3 + o2, seed + 74)))) a = Math.max(a, 0.92 - 0.35 * small);
    if (seamA) a = Math.max(a, seamA);
    // motas
    const hsp = R.hash2(Math.floor(X / cs), Math.floor(Y / cs), seed + 81);
    if (hsp < 0.004) a = Math.max(a, 0.8); else if (hsp > 0.9985) a *= 0.4;
    buf[k] = Math.max(0, Math.min(1, a)) * Math.min(1, aa) * dens;
  }
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask, seed);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, 'multiply', opts.alphaMul == null ? 1 : opts.alphaMul);
}

// PUNTA PLANA (rotulador biselado, brocha plana, barra): la herramienta de las firmas. La punta es un filo que la
// mano lleva siempre con el mismo ángulo: el trazo sale gordo en una dirección y fino en la otra, y acaba en corte
// recto; cuando la pintura escasea o la mano corre, los pelos se separan y dejan vetas a lo largo del trazo.
function paintFlat(canvas, pts, P, r, rgb, seed, opts) {
  const rnd = R.mulberry32(((seed >>> 0) ^ 0x51ed270b) >>> 0);
  r = Math.max(P.minR || 1, r);
  const Q = resample(pts, Math.max(0.6, r * 0.2)), n = Q.length;
  if (n < 2) return;
  const Ls = Q[n - 1].s;
  if (Ls < 0.3) return;
  const goteo = opts.goteo == null ? 0.45 : opts.goteo, isFill = !!opts.mask;
  const a0 = (P.nib == null ? -0.62 : P.nib) + (rnd() - 0.5) * 0.2;
  const th = Math.max(0.6, r * (P.thick || 0.16));
  const NX = new Float32Array(n), NY = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = a0 + 0.14 * R.noise1(Q[i].s / (r * 16 + 1), seed + 5);
    const hw = r * (0.94 + 0.1 * R.noise1(Q[i].s / (r * 7 + 1), seed + 9)) * (0.75 + 0.25 * (Q[i].w == null ? 1 : Q[i].w));
    NX[i] = Math.cos(a) * hw; NY[i] = Math.sin(a) * hw;
  }
  // (unos trazos salen cargados y otros a medio gas; siempre más secos hacia el final)
  const dryK = (P.dry || 0) * (0.35 + 1.1 * rnd());
  const drips = [];
  if (!isFill && P.drip && goteo > 0) {
    // la pintura se acumula donde la punta se para: al final de los trazos que bajan y bajo los tramos tumbados
    const e = Q[n - 1], b = Q[Math.max(0, n - 6)], cand = [];
    if (e.y - b.y > Math.abs(e.x - b.x) * 0.5) cand.push(n - 1);
    const nR = Math.floor(P.drip * goteo * (0.4 + Ls / (r * 22)) + rnd());
    for (let k = 0; k < nR; k++) cand.push(Math.floor(rnd() * n));
    for (const i of cand) {
      if (rnd() > Math.min(0.95, P.drip * goteo * 1.3)) continue;
      const w0 = Math.max(0.7, r * (0.12 + 0.13 * rnd())), len = r * (1.2 + 16 * Math.pow(rnd(), 2.2)) * (0.3 + 1.4 * goteo);
      drips.push({ x: Q[i].x + (rnd() - 0.5) * Math.abs(NX[i]) * 1.4, y: Q[i].y + Math.abs(NY[i]) * 0.6, w: w0, len, sd: (seed + i * 131) | 0 });
    }
  }
  const pad = r * 1.15 + th + 3;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of Q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
  bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
  for (const d of drips) { bx0 = Math.min(bx0, d.x - d.w * 2.5); bx1 = Math.max(bx1, d.x + d.w * 2.5); by1 = Math.max(by1, d.y + d.len + d.w * 3); }
  bx0 = Math.max(canvas.x0, Math.floor(bx0)); by0 = Math.max(canvas.y0, Math.floor(by0));
  bx1 = Math.min(canvas.x0 + canvas.w, Math.ceil(bx1)); by1 = Math.min(canvas.y0 + canvas.h, Math.ceil(by1));
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw <= 0 || bh <= 0 || bw * bh > 5e7) return;
  const buf = new Float32Array(bw * bh);
  const dens = Math.min(1, (P.dens || 1) * (opts.inkMul == null ? 1 : Math.max(0.85, opts.inkMul)));
  const sU = (seed % 977) * 0.37, gr = Math.max(1, r * 0.07);
  // cuánta pintura deja el pelo u (−1..1 a lo ancho de la punta) a la altura s del trazo
  const ink = (u, sAt, X, Y) => {
    const f = sAt / Ls;
    const b = 0.5 + 0.5 * (0.62 * R.noise1(u * 6.5 + sU, seed + 31) + 0.38 * R.noise1(u * 19 + sU, seed + 37));     // el peine de la punta: el mismo en todo el trazo
    // (por seco que vaya, casi la mitad de los pelos sigue marcando: el trazo se raya pero no desaparece)
    const thr = Math.min(0.56, dryK * (0.08 + 0.92 * Math.pow(f, 1.4))) + 0.3 * dryK * smooth01(0.7, 1, Math.abs(u)) - 0.12 + 0.1 * R.noise1(sAt / (r * 2.5 + 1) + u * 3, seed + 41);
    let a = smooth01(thr - 0.07, thr + 0.07, b);
    // (la veta no es limpia: el grano del soporte la rompe)
    if (thr > 0.05 && a > 0) a *= R.hash2(Math.floor(X / gr), Math.floor(Y / gr), seed + 43) < 0.3 + 0.7 * a ? 1 : 0.35;
    return a * (0.9 + 0.1 * R.noise1(u * 11 + sU, seed + 47));
  };
  for (let i = 0; i < n - 1; i++) {
    const A = Q[i], B = Q[i + 1], nx = (NX[i] + NX[i + 1]) / 2, ny = (NY[i] + NY[i + 1]) / 2;
    const dx = B.x - A.x, dy = B.y - A.y, dl = Math.hypot(dx, dy) || 1e-9, hw = Math.hypot(nx, ny) || 1e-9;
    const det = dx * ny - dy * nx, wper = Math.abs(det) / dl;
    const x0 = Math.max(bx0, Math.floor(Math.min(A.x, B.x) - Math.abs(nx) - th - 1)), x1 = Math.min(bx1 - 1, Math.ceil(Math.max(A.x, B.x) + Math.abs(nx) + th + 1));
    const y0 = Math.max(by0, Math.floor(Math.min(A.y, B.y) - Math.abs(ny) - th - 1)), y1 = Math.min(by1 - 1, Math.ceil(Math.max(A.y, B.y) + Math.abs(ny) + th + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - A.x, py = y + 0.5 - A.y;
      let cov = 0, u = 0, t = 0;
      if (wper > 0.05) {
        t = (px * ny - py * nx) / det; u = (dx * py - dy * px) / det;
        if (t >= -0.03 && t <= 1.03) {
          cov = Math.min(1, (1 - Math.abs(u)) * wper + 0.5);
          // (los extremos del trazo: corte recto, con el ángulo de la punta)
          if (i === 0 && !opts.contIn) cov = Math.min(cov, t * Math.abs(det) / hw + 0.5);
          if (i === n - 2 && !opts.contOut) cov = Math.min(cov, (1 - t) * Math.abs(det) / hw + 0.5);
          if (cov < 0) cov = 0;
        }
      }
      // el filo tiene su grosor: aunque la mano vaya a lo largo de la punta, queda una línea
      let tc = (px * dx + py * dy) / (dl * dl); tc = tc < 0 ? 0 : tc > 1 ? 1 : tc;
      const ex = px - dx * tc, ey = py - dy * tc, c2 = Math.min(1, th - Math.hypot(ex, ey) + 0.5);
      if (c2 > cov) { cov = c2; t = tc; u = (ex * nx + ey * ny) / (hw * hw); }
      if (cov <= 0) continue;
      const a = cov * ink(u < -1 ? -1 : u > 1 ? 1 : u, A.s + (t < 0 ? 0 : t > 1 ? 1 : t) * dl, x + 0.5, y + 0.5) * dens;
      const k = (y - by0) * bw + (x - bx0);
      if (a > buf[k]) buf[k] = a;
    }
  }
  drawDrips(buf, bx0, by0, bx1, by1, bw, drips, dens);
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask, seed);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, 'over', opts.alphaMul == null ? 1 : opts.alphaMul);
}

// ------------------------------------------------------------------ SPRAY
// Cómo pinta un bote: la pintura sale en cono. En el centro tapa del todo; hacia fuera se deshace en motas (más
// ancho y más blando con boquilla gorda), y más lejos queda una nube de puntitos. Donde la mano para o va
// despacio (al apretar, en las esquinas, al acabar sin retirar el bote) la pared se carga de pintura y la que
// sobra chorrea hacia abajo; el trazo que se retira deprisa acaba deshaciéndose. La boquilla escupe gotas.
// opts: { goteo 0..1, nube 0..1, mask, alphaMul, inkMul, contIn, contOut }
function paintSpray(canvas, pts, P, r, rgb, seed, opts) {
  if (P.flat) return paintFlat(canvas, pts, P, r, rgb, seed, opts);
  if (P.band) return paintBand(canvas, pts, P, r, rgb, seed, opts);
  if (P.soak) return paintSoak(canvas, pts, P, r, rgb, seed, opts);
  const rnd = R.mulberry32(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  r = Math.max(P.minR || 1, r);
  const Q = resample(pts, Math.max(0.6, r * 0.3)), n = Q.length;
  if (n < 2) return;
  const Ls = Q[n - 1].s;
  if (Ls < 0.3) return;
  const goteo = opts.goteo == null ? 0.45 : opts.goteo, nube = opts.nube == null ? 0.5 : opts.nube;
  const isFill = !!opts.mask;                 // relleno o perfil de un negativo: ni chorretones ni escupitajos
  const short = Ls < r * 2.5;                 // puntos y tildes: un toque de bote
  const flareOut = !opts.contOut && !isFill && !short && rnd() < (P.flare || 0);
  const dwell0 = !opts.contIn, dwell1 = !opts.contOut && !flareOut;
  // ---- por muestra: radio (se abre donde la mano para), densidad (se va en los finales al vuelo), carga
  const K = new Float32Array(n), Dn = new Float32Array(n), Ld = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const q = Q[i], a = Q[Math.max(0, i - 6)], b = Q[Math.min(n - 1, i + 6)];
    let turn = 0;
    const ux = q.x - a.x, uy = q.y - a.y, vx = b.x - q.x, vy = b.y - q.y, lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu > 1e-6 && lv > 1e-6) turn = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)))) / Math.PI;
    const d0 = dwell0 ? Math.exp(-q.s / (r * 1.6)) : 0, d1 = dwell1 ? Math.exp(-(Ls - q.s) / (r * 1.3)) : 0;
    const slow = Math.min(1, d0 + 0.7 * d1 + 0.8 * turn);
    let k = (q.w == null ? 1 : q.w) * (1 + (P.swell == null ? 0.16 : P.swell) * slow + (P.puls == null ? 0.07 : P.puls) * R.noise1(q.s / (r * 7 + 1), seed + 3)), dn = 1;
    if (flareOut) { const t = smooth01(0, Math.min(Ls * 0.4, r * 5), Ls - q.s); k *= 0.55 + 0.45 * t; dn *= 0.2 + 0.8 * t; }
    K[i] = k; Dn[i] = dn; Ld[i] = slow;
  }
  // ---- chorretones: nacen donde hay carga y, sobre todo, bajo los tramos tumbados (la pintura cuelga del borde)
  const drips = [];
  if (!isFill && P.drip && goteo > 0) {
    const want = P.drip * goteo * (short ? 0.12 : 0.22 + Ls / (r * 34));
    let nD = Math.floor(want); if (rnd() < want - nD) nD++;
    nD = Math.min(nD, 6);
    const W = new Float32Array(n); let tot = 0;
    for (let i = 0; i < n; i++) {
      const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      W[i] = 0.15 + 1.6 * Ld[i] + 0.7 * Math.abs(b.x - a.x) / l;
      if (flareOut && Ls - Q[i].s < r * 4) W[i] *= 0.1;
      tot += W[i];
    }
    for (let d = 0; d < nD && tot > 1e-6; d++) {
      let t = rnd() * tot, i = 0; while (i < n - 1 && (t -= W[i]) > 0) i++;
      const q = Q[i], rr = r * K[i];
      const w0 = Math.max(0.7, r * (P.mop ? 0.28 + 0.2 * rnd() : 0.16 + 0.16 * rnd()));   // (fino en el spray, gordo en el mop)
      // (casi todos cortos; alguno se escapa muy abajo; los gordos llevan más pintura y bajan más)
      const len = r * (1.5 + 20 * Math.pow(rnd(), 2.4)) * (0.3 + 1.4 * goteo) * (P.mop ? 1.2 : 1) * (0.6 + w0 / (r * 0.8));
      drips.push({ x: q.x + (rnd() - 0.5) * rr * 0.9, y: q.y + rr * 0.5, w: w0, len, sd: (seed + d * 131) | 0 });
      // (donde chorrea uno suelen chorrear dos o tres, cada uno hasta una altura)
      if (rnd() < 0.45) drips.push({ x: q.x + (rnd() < 0.5 ? -1 : 1) * r * (0.7 + 0.9 * rnd()), y: q.y + rr * 0.45, w: w0 * (0.6 + 0.35 * rnd()), len: len * (0.2 + 0.5 * rnd()), sd: (seed + d * 131 + 77) | 0 });
      for (let j = Math.max(0, i - 8); j < Math.min(n, i + 9); j++) { tot -= W[j] * 0.9; W[j] *= 0.1; }   // no dos pegados
    }
  }
  // ---- gotas que escupe la boquilla (sobre todo al apretar)
  const spots = [];
  if (!isFill && P.spit && nube > 0) {
    const nS = Math.floor(P.spit * nube * (0.6 + 6 * rnd() * rnd()));
    const i0 = rnd() < 0.7 ? 0 : Math.floor(rnd() * n);
    for (let k = 0; k < nS; k++) {
      const q = Q[Math.min(n - 1, Math.max(0, i0 + Math.floor((rnd() - 0.5) * 8)))], a = rnd() * 6.283, d = r * (1.3 + 2.8 * rnd() * rnd());
      spots.push({ x: q.x + Math.cos(a) * d * (P.soak ? 1.5 : 1), y: q.y + Math.sin(a) * d * (P.soak ? 1.5 : 1), r: Math.max(0.5, r * (0.04 + 0.14 * rnd() * rnd()) * (P.spotK || 1)), a: 0.4 + 0.6 * rnd() });
    }
  }
  // ---- caja
  const core = P.core, e1 = core + P.soft, e2 = e1 + (P.mist || 0) * 1.5 * nube + 0.001;
  const pad = r * 1.4 * e2 + 3;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of Q) { if (q.x < bx0) bx0 = q.x; if (q.x > bx1) bx1 = q.x; if (q.y < by0) by0 = q.y; if (q.y > by1) by1 = q.y; }
  bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
  for (const d of drips) { bx0 = Math.min(bx0, d.x - d.w * 2.5); bx1 = Math.max(bx1, d.x + d.w * 2.5); by1 = Math.max(by1, d.y + d.len + d.w * 3); }
  for (const p of spots) { bx0 = Math.min(bx0, p.x - p.r - 1); bx1 = Math.max(bx1, p.x + p.r + 1); by0 = Math.min(by0, p.y - p.r - 1); by1 = Math.max(by1, p.y + p.r + 1); }
  bx0 = Math.max(canvas.x0, Math.floor(bx0)); by0 = Math.max(canvas.y0, Math.floor(by0));
  bx1 = Math.min(canvas.x0 + canvas.w, Math.ceil(bx1)); by1 = Math.min(canvas.y0 + canvas.h, Math.ceil(by1));
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw <= 0 || bh <= 0 || bw * bh > 5e7) return;
  // ---- distancia al trazo (en radios) y densidad del punto más cercano
  const U = new Float32Array(bw * bh).fill(99), DD = new Float32Array(bw * bh);
  for (let i = 0; i < n - 1; i++) {
    const a = Q[i], b = Q[i + 1], ka = r * K[i], kb = r * K[i + 1], R2 = Math.max(ka, kb) * e2 + 1;
    const x0 = Math.max(bx0, Math.floor(Math.min(a.x, b.x) - R2)), x1 = Math.min(bx1 - 1, Math.ceil(Math.max(a.x, b.x) + R2));
    const y0 = Math.max(by0, Math.floor(Math.min(a.y, b.y) - R2)), y1 = Math.min(by1 - 1, Math.ceil(Math.max(a.y, b.y) + R2));
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - a.x, py = y + 0.5 - a.y;
      let t = (px * dx + py * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - dx * t, ey = py - dy * t, u = Math.sqrt(ex * ex + ey * ey) / (ka + (kb - ka) * t);
      const k = (y - by0) * bw + (x - bx0);
      if (u < U[k]) { U[k] = u; DD[k] = Dn[i] + (Dn[i + 1] - Dn[i]) * t; }
    }
  }
  // ---- cobertura: cuerpo, borde que se deshace en motas, nube
  // Un trazo de bote de verdad no es un aerógrafo: el cuerpo tapa del todo; el borde no es un círculo (la presión
  // y la mano lo ondulan); del cuerpo a la nube no hay degradado gris sino motas muy juntas que se van separando,
  // de tamaños distintos; y donde el trazo se va (final al vuelo) el chorro se estrecha y se deshace en motas.
  const buf = new Float32Array(bw * bh);
  const hs = (seed % 9973) + 11, fillP = P.fill == null ? 1 : P.fill;
  const dens = Math.min(1, (P.dens || 1) * (opts.inkMul == null ? 1 : Math.max(0.85, opts.inkMul)));
  const cF = Math.max(1, r * 0.045), cM = Math.max(1.6, r * 0.13), cG = Math.max(3, r * 0.34);
  const dot = (X, Y, cell, sd, p, rad) => {       // ¿cae una mota redonda (de tamaño variable) en este píxel?
    const cx = Math.floor(X / cell), cy = Math.floor(Y / cell), h = R.hash2(cx, cy, sd);
    if (h >= p) return 0;
    const fx = X / cell - cx - (0.2 + 0.6 * R.hash2(cx, cy, sd + 7)), fy = Y / cell - cy - (0.2 + 0.6 * R.hash2(cx, cy, sd + 13)), rr = rad * (0.35 + 0.65 * h / p);
    return fx * fx + fy * fy < rr * rr ? 1 : 0;
  };
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const k = y * bw + x;
    if (U[k] >= e2) continue;
    const X = bx0 + x + 0.5, Y = by0 + y + 0.5, dd = DD[k];
    let u = U[k] * (1 + 0.09 * R.noise2(X / (r * 1.7 + 1), Y / (r * 1.7 + 1), hs + 21) + 0.05 * R.noise2(X / (r * 0.45 + 1), Y / (r * 0.45 + 1), hs + 22));
    if (dd < 0.97) u /= 0.5 + 0.5 * dd;
    let c = 0;
    if (u <= core) {
      c = 1;
      // (seco: el bote va lejos o casi vacío y el grano de la pared se queda sin tapar, a manchas)
      if (fillP < 1) c = R.hash2(Math.floor(X / cM), Math.floor(Y / cM), hs) < fillP * (0.7 + 0.6 * R.noise2(X / (r * 1.6 + 1), Y / (r * 1.6 + 1), hs + 3)) + 0.25 * (1 - u / core) ? 1 : 0;
      if (dd < 0.97 && R.hash2(Math.floor(X / cF), Math.floor(Y / cF), hs + 40) > Math.pow(dd, 1.3) * 1.05) c = dot(X, Y, cM, hs + 41, dd * 0.7, 0.6);
    } else if (u < e1) {
      const t = (u - core) / (e1 - core), p = Math.pow(1 - t, 1.6) * fillP * (dd < 0.97 ? dd : 1);
      c = Math.max(R.hash2(Math.floor(X / cF), Math.floor(Y / cF), hs) < p * 1.1 ? 1 : 0, dot(X, Y, cM, hs + 3, p * 0.75, 0.62));
    } else {
      const q = Math.exp(-3.2 * (u - e1) / (e2 - e1 + 1e-6)) * nube;
      c = Math.max(dot(X, Y, cF * 1.3, hs + 5, 0.16 * q, 0.5), dot(X, Y, cM, hs + 9, 0.1 * q, 0.5), dot(X, Y, cG, hs + 15, 0.035 * q, 0.42));
    }
    // neblina: polvo finísimo alrededor, desigual, que llega hasta el cuerpo
    if (u > core && P.haze) c = Math.max(c, P.haze * 0.15 * nube * Math.exp(-2.4 * (u - core) / (e2 - core)) * (0.6 + 0.5 * R.noise2(X / (r * 2.2 + 1), Y / (r * 2.2 + 1), hs + 30)));
    buf[k] = c * dens;
  }
  drawDrips(buf, bx0, by0, bx1, by1, bw, drips, dens);
  for (const p of spots) {
    const xA = Math.max(bx0, Math.floor(p.x - p.r - 1)), xB = Math.min(bx1 - 1, Math.ceil(p.x + p.r + 1)), yA = Math.max(by0, Math.floor(p.y - p.r - 1)), yB = Math.min(by1 - 1, Math.ceil(p.y + p.r + 1));
    for (let Y = yA; Y <= yB; Y++) for (let X = xA; X <= xB; X++) { const dS = Math.hypot(X + 0.5 - p.x, Y + 0.5 - p.y), al = (P.soak ? (1 - smooth01(p.r * 0.35, p.r + 1, dS)) * (p.a || 1) : Math.max(0, Math.min(1, p.r - dS + 0.5))) * dens, k = (Y - by0) * bw + (X - bx0); if (al > buf[k]) buf[k] = al; }
  }
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask, seed);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, 'over', opts.alphaMul == null ? 1 : opts.alphaMul);
}

// mask: { x0, y0, w, h, s (px de máscara por px de documento), d: Float32Array (0..1) }
function maskAt(M, X, Y) {
  const x = (X - M.x0) * M.s - 0.5, y = (Y - M.y0) * M.s - 0.5;
  if (x < 0 || y < 0 || x > M.w - 1 || y > M.h - 1) return M.out == null ? 1 : M.out;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, x1 = Math.min(M.w - 1, x0 + 1), y1 = Math.min(M.h - 1, y0 + 1);
  const a = M.d[y0 * M.w + x0], b = M.d[y0 * M.w + x1], c = M.d[y1 * M.w + x0], d = M.d[y1 * M.w + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function applyMask(buf, bx0, by0, bw, bh, M, seed) {
  // M.jit (px): cada trazo se para en un sitio algo distinto junto al borde (unos se quedan cortos, otros se meten
  // un pelo): el canto lo hacen los finales de los trazos, no un corte a cuchilla
  let jx = 0, jy = 0;
  if (M.jit) { const r = R.mulberry32(((seed || 1) * 2654435761) >>> 0), a = r() * 6.283, d = M.jit * Math.sqrt(r()); jx = Math.cos(a) * d; jy = Math.sin(a) * d; }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const k = y * bw + x;
    if (buf[k] <= 0) continue;
    buf[k] *= maskAt(M, bx0 + x + 0.5 + jx, by0 + y + 0.5 + jy);
  }
}

// relleno pintado: la figura se llena a pinceladas (con su textura y sus solapes) y se repasa el borde
// poly: [[x,y]...] en px del documento
function paintFill(canvas, poly, P, r, rgb, seed, opts) {
  if (!poly || poly.length < 3) return;
  const rnd = R.mulberry32((seed ^ 0x5bd1e995) >>> 0);
  let cx = 0, cy = 0; for (const q of poly) { cx += q[0]; cy += q[1]; } cx /= poly.length; cy /= poly.length;
  // dirección de las pinceladas: casi vertical, como se rellena a mano
  const ang = Math.PI / 2 + (rnd() - 0.5) * 0.5, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  let vmin = Infinity, vmax = -Infinity;
  for (const q of poly) { const v = (q[0] - cx) * vx + (q[1] - cy) * vy; if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
  const gap = r * 1.35;
  const n = poly.length;
  let k = 0;
  for (let v = vmin + gap * 0.45; v < vmax; v += gap * (0.85 + 0.3 * rnd()), k++) {
    // cortes de la línea (u) con el polígono
    const ts = [];
    for (let i = 0; i < n; i++) {
      const A = poly[i], B = poly[(i + 1) % n];
      const va = (A[0] - cx) * vx + (A[1] - cy) * vy, vb = (B[0] - cx) * vx + (B[1] - cy) * vy;
      if ((va <= v && vb > v) || (vb <= v && va > v)) {
        const t = (v - va) / (vb - va);
        const X = A[0] + (B[0] - A[0]) * t, Y = A[1] + (B[1] - A[1]) * t;
        ts.push((X - cx) * ux + (Y - cy) * uy);
      }
    }
    ts.sort((a, b) => a - b);
    for (let j = 0; j + 1 < ts.length; j += 2) {
      const u0 = ts[j] + r * 0.35, u1 = ts[j + 1] - r * 0.35;
      if (u1 - u0 < r * 0.5) continue;
      const P0 = [cx + ux * u0 + vx * v, cy + uy * u0 + vy * v], P1 = [cx + ux * u1 + vx * v, cy + uy * u1 + vy * v];
      const flip = k % 2 === 1;
      const a = flip ? P1 : P0, b = flip ? P0 : P1;
      paintStroke(canvas, [{ x: a[0], y: a[1] }, { x: (a[0] + b[0]) / 2 + (rnd() - 0.5) * r * 0.3, y: (a[1] + b[1]) / 2 }, { x: b[0], y: b[1] }], P, r, rgb, (seed + k * 131 + j) >>> 0, opts);
    }
  }
  // borde
  const ring = poly.concat([poly[0]]).map(q => ({ x: q[0], y: q[1] }));
  paintStroke(canvas, ring, P, r * 0.62, rgb, (seed + 999) >>> 0, Object.assign({}, opts, { alphaMul: (opts && opts.alphaMul || 1) * 0.85 }));
}

function wetEdge(buf, w, h, rad, amt) {
  const tmp = new Float32Array(w * h), bl = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -rad; x < w + rad; x++) {
      if (x + rad < w) s += buf[row + Math.min(w - 1, Math.max(0, x + rad))] * (x + rad >= 0 ? 1 : 0);
      if (x - rad - 1 >= 0) s -= buf[row + x - rad - 1];
      if (x >= 0 && x < w) tmp[row + x] = s / (2 * rad + 1);
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -rad; y < h + rad; y++) {
      if (y + rad < h && y + rad >= 0) s += tmp[(y + rad) * w + x];
      if (y - rad - 1 >= 0) s -= tmp[(y - rad - 1) * w + x];
      if (y >= 0 && y < h) bl[y * w + x] = s / (2 * rad + 1);
    }
  }
  for (let k = 0; k < w * h; k++) {
    const a = buf[k];
    if (a <= 0) continue;
    const e = Math.max(0, a - bl[k]);
    buf[k] = a * (1 - amt * 0.18) + e * amt * 1.6;
  }
}

module.exports = { TOOLS, TOOL_ORDER, preset, paintStroke, paintFill, famAvailable, maskAt, _load: load };
