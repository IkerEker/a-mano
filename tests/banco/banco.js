// BANCO DE VELOCIDAD de A mano (motor, sin Photoshop). Mismos casos, tamaños y semilla siempre.
//   node tests/banco/banco.js            todos los presets a 2000×1200  → tests/banco/resultado.json
//   node tests/banco/banco.js --grande   añade 4 casos a 5000×3000 (documento de cartel), pintados por franjas como en Photoshop
//   node tests/banco/banco.js --rapido   1000×600 (para probar que funciona)
//   node tests/banco/banco.js --solo spray_gordo,lapiz_hb      --sale otro.json      --rep 3
// Mide, por caso: maquetar, planear los trazos, pintar y acabar (color + textura de la pintura), el pico de memoria y
// el md5 de los píxeles (tiene que ser el mismo en cualquier ordenador). Aparte, la carga: leer el motor y descodificar
// las texturas. Lo que NO puede medir: el intercambio de píxeles con Photoshop (eso se mide dentro del plugin).
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const J = f => require(path.join(__dirname, '..', '..', 'js', f));
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : (process.argv[i + 1] || ''); };
const has = k => process.argv.includes(k);
const ms = t => Number(process.hrtime.bigint() - t) / 1e6, now = () => process.hrtime.bigint();
const r1 = x => Math.round(x * 10) / 10;

// ---- carga: leer los módulos y descodificar todas las texturas
let t = now();
const SH = J('shapes.js'), LY = J('layout.js'), WR = J('writer.js'), G = J('geom.js'), RD = J('render.js'), INK = J('ink.js');
const tModulos = ms(t);
t = now(); RD.setLumps(J('grumosdata.js')); INK._load(); const tTexturas = ms(t);

const TXT = 'Nadie había cerrado\nla puerta del sótano\ny el frío subía despacio', LV = [0, 2, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0];
function caso(nombre, tool, preset, W, H, rep) {
  const p = Object.assign({ persona: 'adulta', mode: 'minus', tool, preset, legib: 0.7, locura: 1, pulso: 0.4, prisa: 0.15, width: 1, repasado: 1, tinta: 0.55, color: '#1d1d1f', contrast: 1, leading: 1.05, align: 'center' },
    tool === 'spray' ? { persona: 'graffiti_c', mode: 'mayus', color: '#3f7a2a', relieve: 0.5 } : {});
  const m = Math.round(W * 0.05), s = SH.makeShape('rect', { left: m, top: m, right: W - m, bottom: H - m });
  const rd = SH.readShape(G.readPathContents(SH.toPathContents(s.anchors, 300, 'px'), 300), 'rect');
  let best = null;
  for (let k = 0; k < rep; k++) {
    const f = {}; let t0 = now();
    const lay = LY.layoutInShape(TXT, LV, rd, p); f.maquetar = ms(t0); t0 = now();
    const strokes = WR.plan(lay, p, 12345); f.planear = ms(t0); t0 = now();
    let cv;
    if (W * H > 6e6) {            // documento grande: por franjas, como hace el plugin en Photoshop (js/ps.js putBands)
      const r = FR.pintar(strokes, p, W, H, p.relieve > 0 ? PXR : 6e6); cv = { data: r.data }; f.pintar = ms(t0); f.acabar = 0; f.franjas = r.franjas;
    } else { cv = RD.makeCanvas(0, 0, W, H); WR.paint(cv, strokes, p); f.pintar = ms(t0); t0 = now(); RD.finalize(cv); f.acabar = ms(t0); }
    f.total = f.maquetar + f.planear + f.pintar + f.acabar;
    if (!best || f.total < best.total) best = Object.assign(f, { trazos: strokes.length, md5: crypto.createHash('md5').update(Buffer.from(cv.data.buffer, cv.data.byteOffset, cv.data.byteLength)).digest('hex') });
  }
  for (const k of ['maquetar', 'planear', 'pintar', 'acabar', 'total']) best[k] = r1(best[k]);
  return Object.assign({ caso: nombre, tecnica: tool, preset, ancho: W, alto: H }, best, { memoria_pico_mb: Math.round(process.resourceUsage().maxRSS / 1024) });
}

const FR = require('../node/franjas.js'), PXR = +(arg('--px-relieve') || 8e6);      // (8e6 = lo que usa js/main.js; 3e6 = antes del 20-11-2026)
const rep = +(arg('--rep') || 2), solo = arg('--solo') ? arg('--solo').split(',') : null;
const [W, H] = has('--rapido') ? [1000, 600] : [2000, 1200];
const casos = [];
for (const tool of INK.TOOL_ORDER) for (const pk of Object.keys(INK.TOOLS[tool].presets)) casos.push([tool + '_' + pk, tool, pk, W, H]);
if (has('--grande')) for (const [tool, pk] of [['lapiz', 'hb'], ['pincel', 'gordo'], ['rotulador', 'gordo'], ['spray', 'gordo']]) casos.push([tool + '_' + pk + '_grande', tool, pk, 5000, 3000]);
const res = [];
for (const c of casos) {
  if (solo && !solo.includes(c[0])) continue;
  const r = caso(c[0], c[1], c[2], c[3], c[4], rep); res.push(r);
  console.log((r.caso + '                        ').slice(0, 26), ('      ' + r.total).slice(-9), 'ms   pintar', r.pintar, '  acabar', r.acabar, '  planear', r.planear);
}
const cpus = os.cpus();
const out = { fecha: new Date().toISOString(), plugin: 'A mano ' + require('../../src/manifest.json').version,
  maquina: { cpu: cpus[0] ? cpus[0].model : '?', nucleos: cpus.length, ram_gb: Math.round(os.totalmem() / 2 ** 30), so: os.platform() + ' ' + os.release(), node: process.version },
  carga_ms: { leer_motor: r1(tModulos), descodificar_texturas: r1(tTexturas) }, repeticiones: rep, casos: res,
  total_ms: r1(res.reduce((a, r) => a + r.total, 0)) };
const sale = arg('--sale') || path.join(__dirname, 'resultado.json');
fs.writeFileSync(sale, JSON.stringify(out, null, 1) + '\n');
console.log('carga: motor', out.carga_ms.leer_motor, 'ms · texturas', out.carga_ms.descodificar_texturas, 'ms · total casos', out.total_ms, 'ms →', sale);
