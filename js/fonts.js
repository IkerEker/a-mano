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
const NVAR = 5;

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
  adulta_a: { label: 'Adulta A', hint: 'suelta, de rotulador: redondeada, con salidas', ref: 'adulta_a', wide: 0.9, slant: 0.12, slantVar: 0.03, hVar: 0.08, wVar: 0.05, wob: 0.01, wobF: 0, angular: 0, geo: 0, os: 0.02, osVar: 0.025, stem: 0.02, cb: 0.04, cbShift: 0.1, open: 0.2, xh: 0.62, track: 0.035, minGap: 0.045, weight: 1.3, bounce: 1.0, sizeVar: 0.6, double: 0, ovr: null, refW: 1.0, asc: 1.2, desc: 1.25, alt: null, ascS: 1.0, noLoopA: 1, slantCap: 0.12, forms: ['capsBrush', 'lowLoop'], round: 0.85, dot: 'dash', dotDx: 0.04, trackCap: 0.02, weightS: 0.8, script: 'own', xhS: 0.4, slantS: 0.36, trackS: 0, scriptW: 0.95, scriptSmooth: 0.03, flick: 0.4 },
  // Adulta B: alta, estrecha y suelta, palos largos que se pasan (Tryin' to make the best of the hometown blues);
  // cursiva casi derecha, estrecha y alta
  adulta_b: { label: 'Adulta B', hint: 'alta y estrecha, de astas larguísimas', ref: null, wide: 0.5, slant: 0.0, slantVar: 0.04, hVar: 0.08, wVar: 0.09, wob: 0.012, wobF: 0, angular: 0, geo: 0, os: 0.03, osVar: 0.05, stem: 0.05, cb: 0.08, cbShift: -0.1, open: 0.3, xh: 0.44, track: 0.09, minGap: 0.05, weight: 0.75, bounce: 1.0, sizeVar: 1.2, double: 0, ovr: null, refW: 0.6, asc: 1.55, desc: 1.6, ascS: 1.25, joinP: 0.65, noLoopA: 1, noLoopD: 1, forms: ['capsTall', 'lowTall', 'lowTail'], dotH: 0.14, trackCap: 0.13, hVarCap: 0.1, script: 'own', xhS: 0.34, slantS: 0.04, trackS: 0.0, scriptW: 0.7, scriptSmooth: 0.03, flick: 0.4 },
  // Infantil A: el abecedario de un niño (tamaños desiguales, redonda, abierta) y minúsculas gordas separadas
  // (Let it be unpolished...); cursiva redonda, derecha y grande (Comme des Garçons)
  infantil_a: { label: 'Infantil A', hint: 'de niño: grande, redonda, a trozos', ref: 'infantil_a', wide: 1.1, slant: 0, slantVar: 0.1, hVar: 0.11, wVar: 0.1, wob: 0.02, wobF: 0, angular: 0, geo: 0, os: 0.02, osVar: 0.04, stem: 0.03, cb: 0.08, cbShift: 0, open: 0.3, xh: 0.8, track: 0.13, minGap: 0.06, weight: 1.3, bounce: 1.7, sizeVar: 1.3, double: 0, ovr: null, refW: 1.05, asc: 1.05, desc: 0.8, piece: 2.6, peak: 0, ascS: 1.1, joinP: 0.8, slantVarS: 0.09, forms: ['capsKid', 'lowKid'], rise: 0.008, loopVar: 1.3, weightS: 1.1, script: 'own', xhS: 0.54, slantS: 0.05, trackS: 0.02, scriptW: 0.98, scriptSmooth: 0.05, flick: 0.3 },
  // Infantil B: la de un chaval aplicado: mayúsculas rectas y estrechas, bien puestas (hello. this is a reminder);
  // cursiva de colegio, redonda y derecha
  infantil_b: { label: 'Infantil B', hint: 'a su aire: picuda e inclinada; cursiva redondita', ref: 'infantil_b', wide: 0.72, slant: 0.16, slantVar: 0.1, hVar: 0.13, wVar: 0.12, wob: 0.01, wobF: 0, angular: 0, geo: 0, os: 0.01, osVar: 0.02, stem: 0.01, cb: 0.04, cbShift: 0, open: 0.2, xh: 0.6, track: 0.06, minGap: 0.03, weight: 0.8, bounce: 1.8, sizeVar: 1.2, double: 0, ovr: null, refW: 1.3, asc: 1.45, desc: 1.3, piece: 1.4, slantVarS: 0.02, scriptW: 1.5, ascS: 0.7, peak: 0.35, capMix: '', slantCap: 0, hVarCap: 0.06, forms: ['lowPrinciple', 'lowTail'], dotS: 'o', weightS: 1.25, trackCap: 0.1, loopW: 1.25, script: 'own', xhS: 0.78, slantS: -0.1, trackS: 0.02, flick: 0.2 },
  // Nerviosa A: mayúsculas muy altas y estrechas, de alturas desiguales, palos rectos (Tonya Harding's); cursiva
  // tumbada, baja y estirada, escrita a toda prisa (Anthropology of world mapping)
  nerviosa_a: { label: 'Nerviosa A', hint: 'picuda: fina, apretada, inclinada, a tirones', ref: 'nerviosa_a', wide: 0.5, slant: 0.3, slantVar: 0.07, hVar: 0.16, wVar: 0.1, wob: 0.008, wobF: 0, angular: 0, geo: 0, os: 0.09, osVar: 0.05, stem: 0.09, cb: 0.1, cbShift: -0.04, open: 0.25, xh: 0.64, track: 0.0, minGap: 0.008, weight: 0.62, bounce: 1.0, sizeVar: 1.0, double: 0, flick: 0.8, ovr: null, refW: 0.66, asc: 1.15, desc: 1.2, peak: 1, peakS: 0.6, forms: ['capsFast', 'lowFast'], rise: -0.03, dot: 'dash', dotDx: 0.16, accK: 1.7, tbar: 0.35, trackCap: 0, script: 'own', xhS: 0.34, slantS: 0.6, slantVarS: 0.06, trackS: 0.01, scriptW: 1.3, scriptSmooth: 0.06 },
  // Nerviosa B: mayúsculas finas y desiguales, que no paran quietas (I want to be mysterious); cursiva tumbada y
  // más alta, temblona
  nerviosa_b: { label: 'Nerviosa B', hint: 'a lo loco: hacia atrás, desigual y saltona', ref: 'nerviosa_b', wide: 0.92, slant: -0.2, slantVar: 0.15, hVar: 0.2, wVar: 0.2, wob: 0.02, wobF: 0, angular: 0, geo: 0, os: 0.05, osVar: 0.05, stem: 0.06, cb: 0.12, cbShift: -0.02, open: 0.35, xh: 0.72, track: 0.09, minGap: 0.03, weight: 0.85, bounce: 2.0, sizeVar: 1.6, double: 0, flick: 0.6, ovr: null, refW: 1.0, asc: 0.95, desc: 1.0, peak: 0.8, peakS: 1, joinP: 0.75, noLoopA: 1, alt: { t: 0, y: 0 }, dot: 'tick', forms: ['lowTail'], script: 'own', xhS: 0.5, slantS: -0.12, slantVarS: 0.1, trackS: 0.0, scriptW: 0.85, scriptSmooth: 0.035 },
  elegante_a: { label: 'Elegante A', hint: 'la de siempre: fina y tranquila', print: 'elfin', wide: 1, slant: 0.08, slantVar: 0.015, hVar: 0.02, wVar: 0.02, wob: 0.004, wobF: 0, angular: 0, geo: 0, os: 0, osVar: 0, stem: 0, cb: 0, cbShift: 0, open: 0, xh: 0.62, track: 0.03, minGap: 0.05, weight: 0.85, bounce: 0.5, sizeVar: 0.5, double: 0, ovr: null, script: 'allure', xhS: 0.48, slantS: 0.12, trackS: 0 },
  // Elegante B: mayúsculas de cartel de museo, redondas y bailonas, cada letra a su altura (Matisse, Calder...);
  // cursiva derecha y abierta
  elegante_b: { label: 'Elegante B', hint: 'de cartel: redonda y bailona; cursiva de invitación', ref: 'elegante_b', refW: 0.9, wide: 0.98, slant: 0, slantVar: 0.05, hVar: 0.09, wVar: 0.07, wob: 0.008, wobF: 0, angular: 0, geo: 0, os: 0.01, osVar: 0.02, stem: 0.01, cb: 0.05, cbShift: 0, open: 0.1, xh: 0.8, track: 0.11, minGap: 0.06, weight: 1.0, bounce: 1.2, sizeVar: 1.1, double: 0, ovr: null, asc: 0.7, desc: 0.8, ascS: 1.6, slantVarS: 0.02, forms: ['lowDesign'], alt: { a: 0, t: 0 }, round: 0.6, weightS: 0.7, lead: 0.1, loopVar: 0.8, trackCap: 0.05, script: 'own', xhS: 0.27, slantS: 0.55, trackS: 0.1, scriptW: 1.3, flick: 0.2 }
};
// letra de bloque para las palabras en NEGATIVO (gruesa y recta: se pinta alrededor); no sale en el panel
STYLES.bloque = { label: 'Bloque', hint: '', wide: 1.0, slant: 0.02, slantVar: 0.012, hVar: 0.035, wVar: 0.03, wob: 0.006, wobF: 0, angular: 0, geo: 0, os: 0, osVar: 0.008, stem: 0, cb: 0.02, cbShift: 0, open: 0, xh: 0.74, track: 0.1, minGap: 0.07, weight: 1, bounce: 0.5, sizeVar: 0.4, double: 0, flick: 0, ovr: null, script: 'script', xhS: 0.6, slantS: 0.05, trackS: 0.02 };

// GRAFFITI: una sola caja (ni mayúsculas ni minúsculas: «la minúscula se trata como mayúscula»); las letras se tocan
// o se montan un poco en vez de dejar huecos; anchuras parecidas; el trazo manda. Cada sub-tipografía es una manera
// de firmar. gmode: el modo interno que usa; overlap: hueco mínimo entre letras (puede ser negativo: se montan)
const GRAF = { wide: 0.8, slant: 0.1, slantVar: 0.04, hVar: 0.08, wVar: 0.06, wob: 0.012, wobF: 0, angular: 0, geo: 0, os: 0.04, osVar: 0.04, stem: 0.05, cb: 0.05, cbShift: 0, open: 0.2, xh: 0.74, track: 0, minGap: 0, weight: 1, bounce: 1.2, sizeVar: 1, double: 0, ovr: null, flick: 0, hook: 0, gmode: 'mayus', script: 'own', xhS: 0.56, slantS: 0.3, trackS: 0, scriptW: 1 };
// (firmas de mano —handstyles—: cada una con su abecedario y varias maneras de hacer cada letra; ver skeleton.FORMS)
STYLES.graffiti_a = Object.assign({}, GRAF, { label: 'Graffiti · Tag', sub: 'Tag', hint: 'de rotulador, rápida y picuda: zigzag sin levantar la mano, trazos que se pasan de largo, travesaños que cruzan', pre: 'fino', weight: 1.15, nibMax: 0.04, over: 0.17, forms: ['capsTag'], wide: 0.78, slant: 0.22, slantVar: 0.06, hVar: 0.1, wVar: 0.08, wob: 0.012, round: 0.16, overlap: -0.05, bounce: 1.7, sizeVar: 1.3, os: 0.02, osVar: 0.03, stem: 0.05, cb: 0.05, open: 0 });
STYLES.graffiti_b = Object.assign({}, GRAF, { label: 'Graffiti · Bisel', sub: 'Bisel', hint: 'de punta plana, a golpes rectos: angulosa, panzas en pico, la E y la S en zigzag, la Y en tridente', pre: 'plano', weight: 1, nibMax: 0.043, over: 0.08, forms: ['capsBisel'], wide: 0.76, slant: 0.12, slantVar: 0.04, hVar: 0.07, wVar: 0.06, wob: 0.006, round: 0.05, angular: 0, os: 0.015, osVar: 0.02, stem: 0.04, cb: 0.04, open: 0, overlap: -0.04, bounce: 1.3, sizeVar: 1 });
STYLES.graffiti_g = Object.assign({}, GRAF, { label: 'Graffiti · Flechas', sub: 'Flechas', hint: 'redonda y de lazo, de vuelta amplia; cada letra remata en flecha', pre: 'mop', weight: 1, nibMax: 0.036, over: 0.13, arrowK: 1.7, forms: ['capsFlechas'], wide: 0.9, slant: 0.16, slantVar: 0.05, hVar: 0.09, wVar: 0.07, wob: 0.012, round: 0.4, os: 0.01, osVar: 0.02, stem: 0.03, cb: 0.04, open: 0, overlap: -0.06, bounce: 1.6, sizeVar: 1.2 });
STYLES.graffiti_c = Object.assign({}, GRAF, { label: 'Graffiti · Bomba', sub: 'Bomba', hint: 'gorda, redonda y sencilla: la A de caja, la i con su punto, la O con su raya dentro', pre: 'gordo', nibMax: 0.055, over: 0.03, forms: ['capsBomba'], wide: 0.92, slant: 0.03, slantVar: 0.1, hVar: 0.13, wVar: 0.1, wob: 0.03, round: 0.7, os: 0.02, open: 0, overlap: -0.06, weight: 1.3, bounce: 1.9, sizeVar: 1.5 });
STYLES.graffiti_d = Object.assign({}, GRAF, { label: 'Graffiti · De un trazo', sub: 'De un trazo', hint: 'todo ligado, sin levantar la mano, con lazos y un rasgo final', pre: 'mop', gmode: 'cursiva', lowerAll: true, xhS: 0.62, slantS: 0.34, slantVarS: 0.05, scriptW: 1.25, ascS: 0.85, peakS: 0.4, lead: 0.12, loopVar: 1.4, loopW: 1.2, scriptSmooth: 0.03, bounce: 1.4, weightS: 0.72, trackS: 0.03 });
STYLES.graffiti_f = Object.assign({}, GRAF, { label: 'Graffiti · Rodillo', sub: 'Rodillo', hint: 'de rodillo de tóner: barras a escuadra que se cruzan y vueltas de medio círculo', pre: 'rodillo', forms: ['capsRodillo'], wide: 1, slant: 0, slantVar: 0.012, hVar: 0.02, wVar: 0.02, wob: 0.003, round: 0, os: 0, osVar: 0, stem: 0, cb: 0.015, open: 0, overlap: 0.08, weight: 1, bounce: 0.5, sizeVar: 0.4 });
STYLES.graffiti_e = Object.assign({}, GRAF, { label: 'Graffiti · Borrón', sub: 'Borrón', hint: 'redonda y gordísima, empapada en la tela; cada letra de un tamaño, casi sin huecos', pre: 'empapado', forms: ['capsBlob', 'capsRodillo'], wide: 1, slant: 0, slantVar: 0.06, hVar: 0.1, wVar: 0.1, wob: 0.035, zoom: 0.17, bigO: 1.3, round: 0, os: 0, osVar: 0, stem: 0, cb: 0.04, open: 0, overlap: 0.02, weight: 1, bounce: 2.4, sizeVar: 1.6 });
// compatibilidad con ajustes guardados de la 2.0
const ALIAS = { graffiti: 'graffiti_a', infantil: 'infantil_a', adulta: 'adulta_a', rabiosa: 'nerviosa_a', nerviosa: 'nerviosa_a', elegante: 'elegante_a' };
const PERSONAS = new Proxy(STYLES, { get: (t, k) => t[k] || t[ALIAS[k]] || undefined });
// 'neg:estilo': la letra de bloque de los negativos, con la forma del estilo que la acompaña (sus letras, su
// inclinación, sus picos) pero quieta y con aire: se pinta alrededor
const negCache = {};
function styleOf(k) {
  if (typeof k === 'string' && k.indexOf('neg:') === 0) {
    if (!negCache[k]) {
      const b = styleOf(k.slice(4));
      negCache[k] = Object.assign({}, b, { print: null, alt: null, hVar: Math.min(b.hVar, 0.06), wVar: Math.min(b.wVar, 0.05), slant: Math.max(-0.12, Math.min(0.14, b.slant)), slantVar: Math.min(b.slantVar, 0.03), wob: Math.min(b.wob, 0.008), os: 0, osVar: 0.008, stem: 0, cb: Math.min(b.cb, 0.04), open: 0, track: 0.1, minGap: 0.07, weight: 1, bounce: Math.min(b.bounce, 0.8), sizeVar: Math.min(b.sizeVar, 0.6), flick: 0, piece: 1, xh: Math.max(b.xh, 0.72), asc: 1, desc: 1, wide: Math.max(b.wide, 0.82), refW: Math.max(b.refW || 1, 0.88), peak: (b.peak || 0) * 0.6 });
    }
    return negCache[k];
  }
  return STYLES[k] || STYLES[ALIAS[k]] || STYLES.adulta_a;
}

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
  if (cursive) {
    const c = SK.CURS[base]; if (!c) return null;
    let d = c[1];
    // manos adultas: sin bucles (el asta sube y baja por el mismo sitio; la cola acaba en un gancho y no liga)
    if (st.noLoopA) d = d.replace('S 0.3 0.9 S 0.46 1.6 S 0.36 2.05 S 0.16 1.85 S 0.14 1.2', 'S 0.08 0.8 L 0.15 2.0 L 0.14 1.2').replace('S 0.25 0.8 S 0.42 1.7 S 0.36 2.05 S 0.24 1.8 S 0.22 1.0', 'S 0.12 0.8 L 0.23 2.0 L 0.22 1.0');
    if (st.noLoopD) d = d.replace(/L (0\.\d+) -0\.6 S 0\.\d+ -1\.0 S 0\.\d+ -0\.85 S 0\.\d+ -0\.4 S 0\.\d+ 0\.22/, (m, x) => 'L ' + x + ' -0.62 S ' + (x - 0.1).toFixed(2) + ' -0.95 S ' + (x - 0.3).toFixed(2) + ' -0.88');
    return { w: c[0], d, lower: true, cursive: true };
  }
  const rf = refDef(st, base, v);
  if (rf) return rf;
  // formas propias de la mano (otra manera de construir la letra)
  if (st.forms) for (const name of st.forms) { let f = SK.FORMS[name] && SK.FORMS[name][base]; if (f) { if (Array.isArray(f[0])) f = f[(v || 0) % f.length]; return { w: f[0], d: f[1], lower: /[a-zñ]/.test(base), form: true }; } }
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
const mergedTab = {};
function refTable(st, lower, which) {
  const R0 = st.ref && RG[st.ref]; if (!R0) return null;
  if (which) return R0[which] || null;
  if (!lower) return R0.mayus || null;
  if (!R0.minus2) return R0.minus || null;
  // dos muestras para las minúsculas: se juntan (las letras repetidas pasan a ser variantes)
  if (!mergedTab[st.ref]) {
    const T = Object.assign({}, R0.minus || {});
    for (const k of Object.keys(R0.minus2)) { const b = k.split('#')[0]; let i = 1, key = b; while (T[key]) { i++; key = b + '#' + i; } T[key] = R0.minus2[k]; }
    mergedTab[st.ref] = T;
  }
  return mergedTab[st.ref];
}
function refKeys(tab, base) {
  const ks = [];
  if (tab[base]) ks.push(base);
  for (let i = 2; tab[base + '#' + i]; i++) ks.push(base + '#' + i);
  return ks;
}
function refDef(st, base, v) {
  const lower = /[a-zñ]/.test(base);
  // mezcla de mayúsculas entre las minúsculas (quien escribe «PRiNciple» o «NeeD»): una de cada tres veces
  if (lower && st.capMix && st.capMix.indexOf(base) >= 0 && (v || 0) % 5 === 2) {
    const mt = refTable(st, false, 'mix'), up = base.toUpperCase(), mk = mt ? refKeys(mt, up) : [];
    if (mk.length) { const kk = mk[((v || 0) + base.charCodeAt(0)) % mk.length], ck = st.ref + '|X|' + kk; if (!refCache.has(ck)) refCache.set(ck, normRef(mt[kk], up, false)); const r = refCache.get(ck); return { w: r.w, strokes: r.strokes, lower: false, ref: true, capScale: 0.86 }; }
  }
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
    if (base === 'i') target = 1.38;
    else if (base === 'j') { target = 1.9; top = 1.38; }
    else if (ASC.indexOf(base) >= 0) target = base === 't' ? 1.3 : 1.55;
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
  if (altIdx == null && !cursive && st.alt && st.alt[base] != null) altIdx = st.alt[base];
  let def = altIdx != null && SK.ALT[base] && SK.ALT[base][altIdx] ? { w: SK.ALT[base][altIdx][0], d: SK.ALT[base][altIdx][1], lower: true } : defFor(st, base, cursive, v);
  if (!def) return null;
  const rnd = R.mulberry32((hashStr(styleKey + (cursive ? '|c|' : '|') + ch) + v * 7919 + 13) >>> 0);
  const g = () => R.gauss(rnd);
  let strokes = def.strokes ? def.strokes.map(s => ({ pts: s.pts.map(q => q.slice()), closed: s.closed, fill: s.fill })) : parsePath(def.d);
  // sin punto si lleva tilde (í, ï)
  if (marks.length && (base === 'i' || base === 'j')) strokes = strokes.filter(s => !(s.pts.length === 2 && s.pts[0][1] > 1.2 && s.pts[1][1] > 1.2) && !(s.fill && s.pts[0][1] > 1.2));
  // (el punto de la i y la j: es una marca, no una salida para ligar)
  if (def.lower && (base === 'i' || base === 'j')) for (const s of strokes) if (!s.fill && s.pts.length === 2 && s.pts[0][1] > 1.25 && s.pts[1][1] > 1.25) {
    s.dot = true;
    // cada mano pone el punto a su manera: punto, redondelito, raya que se escapa a la derecha, tilde suelta
    const dk = cursive ? (st.dotS || st.dot) : st.dot;
    const cx = (s.pts[0][0] + s.pts[1][0]) / 2, cy = (s.pts[0][1] + s.pts[1][1]) / 2 + (st.dotH || 0);
    if (dk === 'o') { const r = 0.09; s.pts = [[cx, cy + r, true], [cx - r, cy, false], [cx, cy - r, false], [cx + r, cy, false], [cx, cy + r, true]]; s.closed = true; }
    else if (dk === 'dash') { const dx = st.dotDx == null ? 0.12 : st.dotDx; s.pts = [[cx + dx - 0.03, cy - 0.03, true], [cx + dx + 0.15, cy + 0.07, true]]; }
    else if (dk === 'tick') { const dx = (rnd() - 0.5) * 0.22; s.pts = [[cx + dx - 0.03, cy - 0.06, true], [cx + dx + 0.05, cy + 0.07, true]]; }
    else if (st.dotH) { s.pts[0][1] += st.dotH; s.pts[1][1] += st.dotH; }
  }
  // (cursiva: la raya de la t es una marca aparte; en la letra rápida sale larga y se escapa a la derecha)
  // la T y la t se reconocen por su travesaño: que nunca quede tan corto que el grosor del trazo se lo coma
  if (!cursive && (base === 't' || base === 'T')) {
    let bar = null, bw = 0;
    for (const s of strokes) { if (s.fill || s.dot) continue; let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const q of s.pts) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); } if ((b - a > 1.6 * (d - c) || d - c < 0.16) && b - a >= bw) { bw = b - a; bar = s; } }
    const need = base === 'T' ? 0.52 : 0.42;
    if (bar && bw < need) { let cx = 0; for (const q of bar.pts) cx += q[0]; cx /= bar.pts.length; const k = need / Math.max(0.05, bw); for (const q of bar.pts) q[0] = cx + (q[0] - cx) * k; }
  }
  if (cursive && base === 't') for (const s of strokes) if (s.pts.length === 2 && Math.abs(s.pts[0][1] - s.pts[1][1]) < 0.15) { s.dot = true; if (st.tbar) { s.pts[0][0] += st.tbar * 0.4; s.pts[1][0] += st.tbar; s.pts[1][1] += st.tbar * 0.14; } }
  // (los puntitos de las formas propias son marcas: ni se recortan ni cuentan para los huecos)
  if (def.form && !cursive) for (const s of strokes) if (!s.fill && s.pts.length === 2 && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 0.13) s.dot = true;
  // esquinas redondeadas (letra suelta, de rotulador): la mano no para en la esquina de la E, la L, la P...
  if (st.round && !def.ref && !cursive) for (const s of strokes) {
    if (s.fill || s.pts.length < 3) continue;
    const P = s.pts, Q = [P[0]];
    for (let k = 1; k < P.length - 1; k++) {
      const A = P[k - 1], C = P[k], B = P[k + 1];
      if (!C[2]) { Q.push(C); continue; }
      const ax = A[0] - C[0], ay = A[1] - C[1], bx = B[0] - C[0], by = B[1] - C[1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const cs = (ax * bx + ay * by) / ((la * lb) || 1);
      if (la < 0.2 || lb < 0.2 || Math.abs(cs) > 0.5 || rnd() > st.round) { Q.push(C); continue; }
      const r = Math.min(st.roundR || 0.16, 0.45 * Math.min(la, lb));
      Q.push([C[0] + ax / la * r, C[1] + ay / la * r, false], [C[0] + bx / lb * r, C[1] + by / lb * r, false]);
    }
    Q.push(P[P.length - 1]); s.pts = Q;
  }
  // ---- variación estructural (propia de la variante)
  const H = def.lower && !def.asCap ? 1 : 1;
  const wob = st.wob * (def.ref ? 0.35 : cursive ? 0.3 : 1), seedW = (rnd() * 1e6) | 0;
  const lv_ = st.loopVar == null ? 1 : st.loopVar;
  const cv = cursive ? { loopA: Math.max(0.55, 1 + g() * 0.35 * lv_) * (st.loopW || 1), hA: 1.02 + Math.abs(g()) * 0.1 * lv_, loopD: Math.max(0.3, 1 + g() * 0.35 * lv_), hD: 1 + g() * 0.12 * lv_, in: g() * 0.05 * lv_, out: g() * 0.07 * lv_, outX: g() * 0.04 * lv_ } : null;
  // firmas de graffiti: la mano entra y, sobre todo, sale pasándose de largo (cada vez distinto); las puntas de
  // flecha crecen y se van con el trazo que rematan
  if (st.over && def.form) {
    const slen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
    const arrows = strokes.filter(s => !s.fill && !s.dot && s.pts.length === 3 && slen(s.pts) < 0.5);
    for (const s of strokes) {
      const P = s.pts, n = P.length;
      if (s.fill || s.dot || n < 2 || arrows.indexOf(s) >= 0 || slen(P) < 0.45) continue;
      const ext = (i0, i1, k) => {
        const dx = P[i0][0] - P[i1][0], dy = P[i0][1] - P[i1][1], L = Math.hypot(dx, dy) || 1, ex = dx / L * k, ey = dy / L * k;
        for (const a of arrows) if (Math.hypot(a.pts[1][0] - P[i0][0], a.pts[1][1] - P[i0][1]) < 0.09) for (const q of a.pts) { q[0] += ex; q[1] += ey; }
        P[i0][0] += ex; P[i0][1] += ey;
      };
      // (un asta que arranca arriba no se alarga por encima: la T se volvería una cruz)
      { const k0 = st.over * 0.9 * rnd() * rnd(); if (!(P[0][1] > 0.8 && P[1][1] < P[0][1])) ext(0, 1, k0); }
      ext(n - 1, n - 2, st.over * (0.15 + 1.5 * rnd() * rnd()));
    }
    if (st.arrowK) for (const a of arrows) { const t = a.pts[1], k = st.arrowK * (0.8 + 0.4 * rnd()); for (const i of [0, 2]) { a.pts[i][0] = t[0] + (a.pts[i][0] - t[0]) * k; a.pts[i][1] = t[1] + (a.pts[i][1] - t[1]) * k; } }
  }
  for (const s of strokes) {
    const P = s.pts;
    const n = P.length;
    if (n === 2 && !s.fill && !def.ref && !s.dot) {
      const dx = P[1][0] - P[0][0], dy = P[1][1] - P[0][1], L = Math.hypot(dx, dy) || 1;
      const horiz = Math.abs(dy) < 0.3 * Math.abs(dx), vert = Math.abs(dx) < 0.3 * Math.abs(dy);
      if (horiz && L > 0.15) {
        // travesaño: altura variable y se pasa de largo
        const midY = (P[0][1] + P[1][1]) / 2;
        if (midY > 0.12 * H && midY < 0.88 * H) { const sh = Math.max(-0.13, Math.min(0.13, g() * st.cb)) + st.cbShift * (1 - Math.abs(midY - 0.5) * 2); P[0][1] += sh; P[1][1] += sh + g() * st.cb * 0.4; }
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
    // picuda: los arcos y los óvalos hacen pico arriba y abajo (la mano da la vuelta en seco)
    const pk = cursive ? st.peakS : st.peak;
    if (pk && !s.fill && !s.dot && (cursive || def.ref || 'nmur'.indexOf(base) >= 0 || !def.lower)) {
      const kill = new Set();
      for (let k = 1; k < n - 1; k++) if (!P[k][2] && (P[k][1] - P[k - 1][1]) * (P[k + 1][1] - P[k][1]) < 0 && rnd() < pk) {
        P[k][2] = true;
        // (y los lados del pico, rectos: fuera los puntos de curva de al lado)
        if (!def.ref && !cursive && n > 4 && n <= 6) { if (k - 1 > 0 && !P[k - 1][2]) kill.add(k - 1); if (k + 1 < n - 1 && !P[k + 1][2]) kill.add(k + 1); }
      }
      if (kill.size) { const Q = P.filter((q, k) => !kill.has(k)); P.length = 0; for (const q of Q) P.push(q); }
    }
    // cursiva: cada vez el lazo sale distinto (más gordo o casi cerrado, más alto o más bajo, la cola más larga o
    // más corta) y la letra entra y sale a otra altura: como al escribir de verdad, ninguna igual a la anterior
    if (cursive && !s.mark && !s.dot) {
      let ax = 0, an = 0, dx_ = 0, dn = 0;
      for (const q of P) { if (q[1] > 1.2) { ax += q[0]; an++; } else if (q[1] < -0.15) { dx_ += q[0]; dn++; } }
      if (an) { ax /= an; for (const q of P) if (q[1] > 1.2) { q[0] = ax + (q[0] - ax) * cv.loopA; q[1] = 1.2 + (q[1] - 1.2) * cv.hA; } }
      if (dn) { dx_ /= dn; for (const q of P) if (q[1] < -0.15) { q[0] = dx_ + (q[0] - dx_) * cv.loopD; q[1] = -0.15 + (q[1] + 0.15) * cv.hD; } }
      if (s === strokes[0] && n > 4) {
        P[0][1] += cv.in; P[n - 1][1] += cv.out; P[n - 1][0] += cv.outX;
        if (n > 5) { P[n - 2][1] += cv.out * 0.5; }
      }
    }
    // astas y colas más largas o más cortas
    if (def.lower && !def.asCap) { const ka = cursive ? (st.ascS || 1) : (st.asc || 1), kd = cursive ? (st.ascS || 1) : (st.desc || 1); for (const q of P) { if (q[1] > 1.12) q[1] = 1.12 + (q[1] - 1.12) * ka; else if (q[1] < 0) q[1] *= kd; } }
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
    const aK = mk === '́' ? (st.accK || 1) : 1, aDx = mk === '́' ? (st.dotDx || 0) * 0.4 : 0;
    for (const s of parsePath(md)) {
      for (const q of s.pts) { q[0] = cx + q[0] * (def.lower ? 1 : 1.1) * aK + aDx; q[1] = below ? q[1] : bodyTop + q[1] * (def.lower ? 1.05 : 0.9) * aK + (def.lower ? 0.08 : 0.04); q[0] += g() * st.wob; }
      s.mark = !below;
      markStrokes.push(s);
    }
  }
  strokes = strokes.concat(markStrokes);
  // ---- a em
  // (cursiva: altura de x, anchura e inclinación de la cursiva del estilo; menos desigualdad)
  const unit = cursive ? CAP * st.xhS : def.lower && !def.asCap ? CAP * st.xh : CAP * (def.capScale || 1);
  let hS = Math.exp(g() * (!cursive && !def.lower && st.hVarCap != null ? st.hVarCap : st.hVar) * (cursive ? 0.45 : 1)), wS = Math.exp(g() * st.wVar * (cursive ? 0.5 : 1)) * (cursive ? (st.scriptW || 0.8) : def.ref ? (st.refW || 1) : st.wide);
  // (letras de tamaños muy distintos, y las redondas, enormes: como quien pinta con bote sin medir)
  if (st.zoom && !cursive) { const zm = Math.exp(g() * st.zoom) * (st.bigO && 'OQ0'.indexOf(base) >= 0 ? st.bigO : 1); hS *= zm; wS *= zm; }
  const capL = !cursive && !def.lower;
  const slant = (cursive || capS ? st.slantS : capL && st.slantCap != null ? st.slantCap : st.slant) + g() * (cursive ? (st.slantVarS != null ? st.slantVarS : st.slantVar * 0.5) : st.slantVar);
  const step = 0.012 / unit;
  const out = [];
  for (const s of strokes) {
    let pts = st.angular >= 1 && !st.geo ? resample(s.pts.map(p => [p[0], p[1]]), step) : densify(s.pts, step);
    if (s.closed && !s.fill && st.open && rnd() < 0.7) pts = cutEnd(pts, st.open * (0.05 + 0.12 * rnd()));
    // temblor fino (la mano, al trazar)
    if (st.wobF) { let acc = 0; pts = pts.map((q, k) => { if (k) acc += Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]); return [q[0] + st.wobF * R.noise1(acc * 9, seedW + 5), q[1] + st.wobF * R.noise1(acc * 9 + 40, seedW + 6)]; }); }
    pts = pts.map(([x, y]) => { const Y = y * unit * hS; return [x * unit * wS + Y * slant, -Y]; });
    const o = { pts, closed: s.closed, fill: !!s.fill, mark: !!s.mark || !!s.dot };
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
  // cuerpo sin la inclinación (para medir huecos entre letras inclinadas: se miden a lo largo de la inclinación)
  { let a0 = Infinity, a1 = -Infinity; for (const s of out) if (!s.mark) for (const q of s.pts) { if (q[1] > 0.05) continue; const x0 = q[0] + q[1] * slant; if (x0 < a0) a0 = x0; if (x0 > a1) a1 = x0; } if (isFinite(a0)) fg.body0 = { left: a0, right: a1 }; }
  if (cursive) fg.own = true;
  return fg;
}

function finishGlyph(strokes, adv, ch, script, lower, exact) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, bx0 = Infinity, bx1 = -Infinity, ux0 = Infinity, ux1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (!s.mark) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y <= 0.05) { if (x < ux0) ux0 = x; if (x > ux1) ux1 = x; } }
  }
  if (!strokes.length) { x0 = 0; x1 = adv; y0 = -CAP; y1 = 0; }
  if (!isFinite(bx0)) { bx0 = x0; bx1 = x1; }
  // avance: la anchura dibujada manda (las letras se colocan por su tinta)
  // (cursiva ligada: el avance es la salida de la letra; las astas inclinadas no empujan a la siguiente)
  return { adv: exact ? adv : Math.max(adv, bx1 - Math.min(0, bx0)), strokes, box: { left: x0, top: y0, right: x1, bottom: y1 }, body: { left: bx0, right: bx1 }, bodyUp: isFinite(ux0) ? { left: ux0, right: ux1 } : null, script, lower, ch };
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
  // la T y la t se reconocen por su travesaño: ya con sus proporciones finales, nunca más corto de lo que el
  // grosor de un trazo gordo se comería (se ensancha desde su centro)
  if (r && r.strokes && mode !== 'cursiva' && (ch === 't' || ch === 'T')) {
    let bar = null, bw = 0, H = 0;
    for (const s of r.strokes) { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const q of s.pts) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); } H = Math.max(H, d - c); s._bb = [a, b, c, d]; }
    for (const s of r.strokes) { const [a, b, c, d] = s._bb; if (!s.fill && d - c < 0.3 * H && d - c < (b - a) * 1.2 + 0.02 && b - a >= bw) { bw = b - a; bar = s; } delete s._bb; }
    const need = (ch === 'T' ? 0.62 : 0.44) * H;
    if (bar && bw < need && bw > 1e-4) { let cx = 0; for (const q of bar.pts) cx += q[0]; cx /= bar.pts.length; const k = need / bw; for (const q of bar.pts) q[0] = cx + (q[0] - cx) * k; }
  }
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
    return { cap: CAP, xh, asc: Math.max(CAP * 1.05, xh * (1.12 + 0.93 * (st.ascS || 1))), desc: xh * (st.ascS || 1), space: Math.max(0.2, xh * 0.6 * (st.scriptW || 0.8)) + (st.trackS || 0) * 1.6 };
  }
  if (mode === 'cursiva' || st.print) {
    const pf = mode !== 'cursiva';
    const F = fontOf(pf ? st.print : st.script), s0 = CAP / F.m.cap;
    const xh = (pf ? st.xh : st.xhS) * CAP;
    return { cap: CAP, xh, asc: Math.max(CAP * 1.04, xh + (Math.max(F.m.asc, F.m.cap) * s0 - F.m.xh * s0) * 0.9), desc: Math.min(0.42, -F.m.desc * s0), space: (pf ? (mode === 'mayus' ? 0.4 : 0.3) : 0.27) * (0.8 + 0.2 * st.wide) };
  }
  const xh = st.xh * CAP;
  const hv = 1 + st.hVar * 1.2;
  return { cap: CAP, xh, asc: Math.max(CAP * hv, xh * (1.12 + 0.43 * (st.asc || 1)) * hv), desc: xh * 0.58 * (st.desc || 1), space: (mode === 'mayus' ? 0.42 + (st.trackCap != null ? st.trackCap : st.track) : 0.32 * Math.max(1, st.xh / 0.62) + st.track) * (0.55 + 0.45 * st.wide) };
}

function caseText(text, mode, styleKey) {
  // (graffiti de un trazo: una sola caja, todo en la letra ligada)
  if (styleKey && styleOf(styleKey).lowerAll) return text.toLocaleLowerCase('es');
  return mode === 'mayus' ? text.toLocaleUpperCase('es') : text;
}

// palabra: coloca las letras por su tinta (ningún hueco parece un espacio ni se pisan de más)
// seedW: para escoger variantes distintas en cada palabra
function setWord(styleKey, mode, word, trackExtra, inkW, seedW) {
  const st = styleOf(styleKey);
  const isScript = mode === 'cursiva';
  // (las mayúsculas pueden ir más juntas o más sueltas que las minúsculas de la misma mano)
  const tr0 = isScript ? st.trackS : mode === 'mayus' && st.trackCap != null ? st.trackCap : st.track;
  const track = tr0 + (trackExtra || 0) * (isScript ? 0.3 : 1);
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
      if (ex && en && pv.g.own && g.own) x = ex[1] > 0.08 ? pv.x + pv.g.adv + 0.02 + track : pv.x + ex[0] - en[0] + 0.004 + track + ('lbhkft'.indexOf(g.ch) >= 0 && (st.noLoopA || 'adgqu'.indexOf(pv.g.ch) >= 0) ? 0.05 * st.xhS / 0.4 : 0) + (st.slantS < 0 && 'lbhkftd'.indexOf(g.ch) >= 0 ? -st.slantS * st.xhS * CAP * 1.1 : 0);   // (a + l pegadas se leen «d»)   // (cola sin bucle: no liga)
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
      // (los huecos se miden sin las colas: la de la y o la g no empuja a la letra de al lado)
      const bl = gg => gg.body0 || gg.bodyUp || gg.body;
      const gap = (x + bl(g).left) - (pv.x + bl(pv.g).right);
      const w2 = 2 * (inkW || 0) * st.weight;
      const narrow = gg => gg.body.right - gg.body.left < 0.12;
      // (graffiti: las letras se tocan; el hueco se mide para que los trazos se rocen o se monten un poco)
      const maxGap = st.overlap != null ? st.overlap + 0.8 * w2 + 0.05 : tr0 + 0.05 + w2 + Math.max(0, trackExtra || 0) * 0.6;
      const minGap = st.overlap != null ? st.overlap + 0.8 * w2 : st.minGap + w2 * 0.8 + Math.min(0, trackExtra || 0) + (narrow(pv.g) || narrow(g) ? 0.03 : 0);
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
// o: { joinP: probabilidad de ligar (la mano se levanta a veces), rnd }
function joinCursive(letters, emTol, o) {
  const tol = emTol || 0.09;
  o = o || {};
  const own = l => l.L && l.L.g && l.L.g.own;
  // lo que sube desde la línea base al empezar la letra (el trazo de entrada)
  const riseLen = (pts, until) => { let k = 0; const lim = Math.floor(pts.length * 0.45); while (k < lim && pts[k + 1][1] < pts[k][1] - 1e-9 && (until == null || pts[k][1] > until)) k++; return k; };
  const entryOf = l => { let bi = -1, bestb = Infinity; l.strokes.forEach((s, k) => { if (s.closed || s.fill || s.mark || s.pts.length < 6) return; const e = s.pts[0]; const sc = e[0] - e[1] * 0.2; if (sc < bestb) { bestb = sc; bi = k; } }); return bi; };
  for (let i = 0; i < letters.length; i++) {
    const L = letters[i], A = letters[i - 1];
    // al empezar palabra (o tras una mayúscula), las letras redondas no traen rabito desde abajo
    if (own(L) && L.joinable && (!A || !A.joinable) && ('acdgoq' + (o.noLoopA ? 'lbhkf' : '')).indexOf((L.L.g.ch.normalize ? L.L.g.ch.normalize('NFD') : L.L.g.ch)[0]) >= 0) {
      const bi = entryOf(L);
      if (bi >= 0) { const k = riseLen(L.strokes[bi].pts, null), round = 'acdgoq'.indexOf((L.L.g.ch.normalize ? L.L.g.ch.normalize('NFD') : L.L.g.ch)[0]) >= 0; const P_ = L.strokes[bi].pts; if (round) { if (k > 2) L.strokes[bi].pts = P_.slice(Math.max(0, k - 2)); } else { let ti = 0; for (let j = 1; j < P_.length * 0.7; j++) if (P_[j][1] < P_[ti][1]) ti = j; if (ti > 2 && ti < P_.length - 3) L.strokes[bi].pts = P_.slice(ti); } }
    }
  }
  if (o.lead && o.rnd) {
    const F = letters.find(l => l.joinable && own(l)), Z = letters.slice().reverse().find(l => l.joinable && own(l));
    if (F) { const bi = entryOf(F); if (bi >= 0) { const P = F.strokes[bi].pts; if (P.length > 8 && P[4][1] < P[0][1] - 1e-6) {
      const len = o.lead * (F.size || 1) * (0.6 + 0.7 * o.rnd()), add = [];
      for (let j = 5; j >= 1; j--) { const f = j / 5; add.push([P[0][0] - len * f, P[0][1] + len * 0.3 * f * f]); }
      F.strokes[bi].pts = add.concat(P); } } }
    if (Z) { let bi = -1, best = -Infinity; Z.strokes.forEach((s, k) => { if (s.closed || s.fill || s.mark || s.pts.length < 8) return; const e = s.pts[s.pts.length - 1]; if (e[0] > best) { best = e[0]; bi = k; } });
      if (bi >= 0) { const P = Z.strokes[bi].pts, n = P.length, e = P[n - 1], a = P[n - 5], l = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1, tx = (e[0] - a[0]) / l, ty = (e[1] - a[1]) / l;
        if (tx > 0.2) { const len = o.lead * (Z.size || 1) * (0.7 + 0.9 * o.rnd()); for (let j = 1; j <= 6; j++) { const f = j / 6; P.push([e[0] + Math.max(0.6, tx) * len * f, e[1] + ty * len * f * 0.5 - len * 0.6 * f * f]); } } } }
  }
  for (let i = 1; i < letters.length; i++) {
    const L = letters[i], A = letters[i - 1];
    if (!A.joinable || !L.joinable) continue;
    if (o.joinP != null && o.rnd && o.rnd() > o.joinP) continue;
    let ai = -1, best = -Infinity;
    // (la raya de la t no cuenta como salida: es corta y casi horizontal)
    const isBar = s => { const a = s.pts[0], e = s.pts[s.pts.length - 1]; return s.pts.length < 40 && Math.abs(e[1] - a[1]) < 0.03 && plen(s.pts) < 0.3; };
    // (los puntos de la i y la j no son salidas)
    const isDot = s => plen(s.pts) < 0.06;
    // (si esta letra ya se ligó a la anterior, su trazo vive en aquella: se sigue desde ahí)
    const cand = A._carry ? A.strokes.concat([A._carry]) : A.strokes;
    cand.forEach((s, k) => { if (s.closed || s.fill || s.mark || (s !== A._carry && (isBar(s) || isDot(s)))) return; const e = s.pts[s.pts.length - 1]; const sc = e[0] + e[1] * 0.2; if (sc > best) { best = sc; ai = k; } });
    let bi = -1, bestb = Infinity;
    L.strokes.forEach((s, k) => { if (s.closed || s.fill || s.mark || plen(s.pts) < 0.06) return; const e = s.pts[0]; const sc = e[0] - e[1] * 0.2; if (sc < bestb) { bestb = sc; bi = k; } });
    if (ai < 0 || bi < 0) continue;
    const sa = cand[ai], sb = L.strokes[bi];
    const e = sa.pts[sa.pts.length - 1];
    // enlace alto (tras o, b, v, w): la siguiente no baja a la línea para volver a subir; entra por arriba
    if (own(L) && own(A)) { const k = riseLen(sb.pts, e[1]); if (k > 2) { sb.pts = sb.pts.slice(k); } }
    const b1 = sb.pts[0];
    if (own(A) && e[1] - b1[1] > 0.1 * (L.size || 1)) continue;      // sale por abajo (cola sin bucle): no se liga
    if (Math.hypot(b1[0] - e[0], b1[1] - e[1]) > (tol * 3.5 + (o.track || 0) * 1.6) * (L.size || 1)) continue;
    // ENLACE: un solo gesto limpio. Se quitan la colita de salida de una letra y el rabito de entrada de la otra
    // (cada una traía su curvita: juntas hacían una ese, un escalón o un tramo plano larguísimo) y se unen los dos
    // cuerpos con una sola curva que sale en la dirección en que iba la mano y llega en la que va a seguir.
    const sz = L.size || 1;
    const cutBack = (pts, len, fromEnd) => {      // índice a `len` de distancia del extremo (a lo largo del trazo)
      let acc = 0, k = fromEnd ? pts.length - 1 : 0;
      const stp = fromEnd ? -1 : 1, lim = fromEnd ? Math.floor(pts.length * 0.6) : Math.floor(pts.length * 0.4);
      while ((fromEnd ? k > lim : k < lim) && acc < len) { acc += Math.hypot(pts[k + stp][0] - pts[k][0], pts[k + stp][1] - pts[k][1]); k += stp; }
      return k;
    };
    const d0 = Math.hypot(sb.pts[0][0] - e[0], sb.pts[0][1] - e[1]);
    const tail = (0.035 + 0.02 * (o.rnd ? o.rnd() : 0.5)) * sz;
    const ia = sa.pts.length > 12 ? cutBack(sa.pts, tail, true) : sa.pts.length - 1;
    const ib = sb.pts.length > 12 ? cutBack(sb.pts, tail, false) : 0;
    const A0 = sa.pts[ia], B0 = sb.pts[ib];
    const dirAt = (pts, i) => { const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    const ta = dirAt(sa.pts, ia), tb = dirAt(sb.pts, ib);
    const d = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]);
    const bridge = [];
    const n = Math.max(3, Math.ceil(d / (0.01 * sz))), k = d * (o.rnd ? 0.75 + 0.35 * o.rnd() : 0.9);
    for (let j = 1; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const h1 = 2 * t3 - 3 * t2 + 1, h2 = -2 * t3 + 3 * t2, h3 = t3 - 2 * t2 + t, h4 = t3 - t2;
      bridge.push([h1 * A0[0] + h2 * B0[0] + h3 * ta[0] * k + h4 * tb[0] * k, h1 * A0[1] + h2 * B0[1] + h3 * ta[1] * k + h4 * tb[1] * k]);
    }
    void d0;
    sa.pts = sa.pts.slice(0, ia + 1).concat(bridge, sb.pts.slice(ib));
    sa.joined = true;
    L._carry = sa;
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

const STYLE_KEYS = ['infantil', 'adulta', 'nerviosa', 'elegante', 'graffiti'];
module.exports = { STYLES, PERSONAS, STYLE_KEYS, CAP, NVAR, styleOf, glyph, metrics, caseText, setWord, joinCursive, templates, resample, parsePath, densify };
