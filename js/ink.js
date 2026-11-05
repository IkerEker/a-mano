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
const BASE = { capSkip: 0.15, fams: ['rotu'], w: 0.03, dens: 0.92, tIn: 0.6, tOut: 0.5, inL: 1.5, outL: 2.5, press: 0.12, down: 0, grain: 0, wet: 0, pool: 0, dry: 0, tremor: 1, up: 0, lift: 0.2, minR: 0.55, light: 0, tone: 0.2, load: 0, blend: 'multiply', fuse: false };
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
      gastado: { label: 'Gastado', proc: 'marker', w: 0.05, dens: 0.95, tIn: 0.95, tOut: 0.9, inL: 0.8, outL: 1, press: 0.05, wet: 0.15, pool: 0.15, dry: 0.75, tremor: 0.75, lift: 0.1, tone: 0.15, load: 0.3, grain: 0.12, fuse: true }
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

function preset(tool, pk) {
  const T = TOOLS[tool] || TOOLS.rotulador;
  const keys = Object.keys(T.presets);
  const p = T.presets[pk] || T.presets[keys[0]];
  return Object.assign({}, BASE, p, { tool: TOOLS[tool] ? tool : 'rotulador', preset: T.presets[pk] ? pk : keys[0] });
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
  // presión: entrada, salida, ondulación lenta, dirección (el pincel engorda al bajar)
  const pSeed = seed + 13;
  const inL = Math.min(P.inL * r, Ls * 0.32), outL = Math.min(P.outL * r, Ls * 0.42);
  for (const q of Q) {
    const ent = P.tIn + (1 - P.tIn) * smooth01(0, inL, q.s);
    const ext = P.tOut + (1 - P.tOut) * smooth01(0, outL, Ls - q.s);
    const pr = 1 + P.press * R.noise1(q.s / (r * 7 + 1), pSeed) + P.press * 0.4 * R.noise1(q.s / (r * 2.2 + 1), pSeed + 3);
    const dir = 1 + P.down * (q.ty > 0 ? q.ty : q.ty * 0.55);
    q.h = Math.max(P.minR, r * q.w * Math.min(ent, ext) * pr * dir);
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
    const slow = sl / sn;
    const down = q.ty > 0 ? q.ty : 0, up = q.ty < 0 ? -q.ty : 0;
    let tone = 1 + P.tone * (0.5 * down - 0.45 * up + 0.8 * slow + 0.45 * R.noise1(q.s / (r * 4 + 1), pSeed + 9));
    if (P.pool) tone *= 1 + P.pool * (1 - smooth01(0, r * 2.2, q.s)) * 1.2;
    tone = Math.max(0.45, Math.min(1.9, tone));
    const load = 1 + (P.load || 0) * (0.45 - q.s / Ls) * (opts.loadMul == null ? 1 : opts.loadMul);
    q.pig = tone * Math.max(0.3, load);
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
  const mSeed = (seed * 7 + 3) | 0;
  // rotulador: vetas a lo largo (la fibra de la punta), deriva lenta; el borde se come un poco el papel
  const marker = (s, v, px, py) => {
    let cap = 0, ve = Math.abs(v);
    if (s < 0) { ve = Math.hypot(v, -s / hEnd0); cap = 1; }
    else if (s > Ls) { ve = Math.hypot(v, (s - Ls) / hEnd1); cap = 1; }
    // carga en los extremos: donde el rotulador se para, la tinta se extiende y oscurece
    const de = Math.min(s, Ls - s), hh = s < Ls / 2 ? hEnd0 : hEnd1;
    let bleed = P.pool ? (1 - smooth01(0, hh * 1.6, Math.max(0, de))) * P.pool * Math.min(1, Ls / (hh * 8)) : 0;
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
  const skipIn = rnd() < P.capSkip ? rnd() * Math.max(0, Math.min(Lr - need, Lr * 0.15)) : 0;
  const skipOut = rnd() < P.capSkip ? rnd() * Math.max(0, Math.min(Lr - need - skipIn, Lr * 0.15)) : 0;
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
  if (P.wet > 0) wetEdge(buf, bw, bh, Math.max(1, Math.round(r * 0.45)), P.wet);
  // máscara (negativos): donde vale 0 no se pinta (las letras quedan libres)
  if (opts.mask) applyMask(buf, bx0, by0, bw, bh, opts.mask);
  RD.compositePigment(canvas, buf, bx0, by0, bw, bh, rgb, opts.blend || P.blend, opts.alphaMul == null ? 1 : opts.alphaMul);
}
// mask: { x0, y0, w, h, s (px de máscara por px de documento), d: Float32Array (0..1) }
function maskAt(M, X, Y) {
  const x = (X - M.x0) * M.s - 0.5, y = (Y - M.y0) * M.s - 0.5;
  if (x < 0 || y < 0 || x > M.w - 1 || y > M.h - 1) return M.out == null ? 1 : M.out;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, x1 = Math.min(M.w - 1, x0 + 1), y1 = Math.min(M.h - 1, y0 + 1);
  const a = M.d[y0 * M.w + x0], b = M.d[y0 * M.w + x1], c = M.d[y1 * M.w + x0], d = M.d[y1 * M.w + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function applyMask(buf, bx0, by0, bw, bh, M) {
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const k = y * bw + x;
    if (buf[k] <= 0) continue;
    buf[k] *= maskAt(M, bx0 + x + 0.5, by0 + y + 0.5);
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
