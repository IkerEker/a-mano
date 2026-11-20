// ¿Sale IDÉNTICO pintado por franjas (como hace el plugin en Photoshop, js/ps.js putBands) que pintado de una vez?
//   node tests/node/franjas.js        los 27 presets, franjas de 300 px de alto con el margen que pone el plugin
// Tiene que dar 0 valores distintos en todos. (También lo usa el banco de velocidad: pintar().)
const path = require('path'), J = f => require(path.join(__dirname, '..', '..', 'js', f));
const SH = J('shapes.js'), LY = J('layout.js'), WR = J('writer.js'), G = J('geom.js'), RD = J('render.js'), INK = J('ink.js');

// lo mismo que putBands: franjas de px píxeles, cada una pintada con su margen y recortada
function pintar(strokes, p, W, H, px, margen) {
  const M = margen == null ? WR.bandMargin(strokes, p) : margen, bandH = px ? Math.max(64, Math.floor(px / W)) : H;
  const data = new Uint8ClampedArray(W * H * 4); let franjas = 0;
  for (let y = 0; y < H; y += bandH, franjas++) {
    const hB = Math.min(bandH, H - y), mT = Math.min(M, y), mB = Math.min(M, H - y - hB);
    const c = RD.makeCanvas(0, y - mT, W, hB + mT + mB); WR.paint(c, strokes, p); RD.finalize(c);
    data.set(c.data.subarray(mT * W * 4, (mT + hB) * W * 4), y * W * 4);
  }
  return { data, franjas };
}
module.exports = { pintar };

if (require.main === module) {
  RD.setLumps(J('grumosdata.js'));
  const W = 2000, H = 1200; let mal = 0, n = 0;
  for (const tool of INK.TOOL_ORDER) for (const preset of Object.keys(INK.TOOLS[tool].presets)) {
    const p = Object.assign({ persona: 'adulta', mode: 'minus', tool, preset, legib: 0.7, locura: 1, pulso: 0.4, prisa: 0.15, width: 1, repasado: 1, tinta: 0.55, color: '#1d1d1f', contrast: 1, leading: 1.05, align: 'center' },
      tool === 'spray' ? { persona: 'graffiti_c', mode: 'mayus', color: '#3f7a2a', relieve: 0.5 } : {});
    const s = SH.makeShape('rect', { left: 100, top: 100, right: W - 100, bottom: H - 100 }), rd = SH.readShape(G.readPathContents(SH.toPathContents(s.anchors, 300, 'px'), 300), 'rect');
    const strokes = WR.plan(LY.layoutInShape('Nadie había cerrado\nla puerta del sótano\ny el frío subía despacio', [0, 2, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0], rd, p), p, 12345);
    const a = pintar(strokes, p, W, H, 0, 0).data, b = pintar(strokes, p, W, H, 300 * W).data;
    let d = 0, peor = 0; for (let i = 0; i < a.length; i++) { const x = Math.abs(a[i] - b[i]); if (x) { d++; if (x > peor) peor = x; } }
    n++; if (d) { mal++; console.log(tool + '_' + preset, 'DISTINTO:', d, 'valores, peor', peor, '(margen', WR.bandMargin(strokes, p) + ')'); }
  }
  console.log(mal ? 'FRANJAS: ' + mal + ' de ' + n + ' presets no casan' : 'FRANJAS IDÉNTICAS (' + n + ' presets: por franjas = de una vez)');
  process.exit(mal ? 1 : 0);
}
