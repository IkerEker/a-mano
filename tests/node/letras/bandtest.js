// ¿sale igual pintado de una vez que por franjas con margen (como hace Photoshop)?  node bandtest.js [boquilla] [firma]
const path = require('path'), J = f => require(path.join('/home/claude/a-mano/js', f));
const SH = J('shapes.js'), LY = J('layout.js'), WR = J('writer.js'), G = J('geom.js'), RD = J('render.js'), INK = J('ink.js'), FN = J('fonts.js');
RD.setLumps(J('grumosdata.js'));
const boq = process.argv[2] || 'gordo', sub = process.argv[3] || 'c', W = 1400, H = 1700, M = 48;
const k = 'graffiti_' + sub, S = FN.styleOf(k);
const s = SH.makeShape('rect', { left: 90, top: 90, right: W - 90, bottom: H - 90 }), comps = G.readPathContents(SH.toPathContents(s.anchors, 300, 'px'), 300), rd = SH.readShape(comps, 'rect');
const p = { persona: k, mode: S.gmode, tool: 'spray', preset: boq, color: '#3f7a2a', legib: 0.7, locura: 1, pulso: 0.4, prisa: 0.15, width: 1, repasado: 1, tinta: 0.55, contrast: 1, leading: 1.05, align: 'center', goteo: 0.7, nube: 0.5, relieve: 0.5, deriva: 0.5, inkPad: INK.preset('spray', boq).w * S.weight };
const lay = LY.layoutInShape('Nadie había\ncerrado\nla puerta\ndel sótano', [0, 0, 1, 0, 2, 0, 0], rd, p), strokes = WR.plan(lay, p, 21);
const one = RD.makeCanvas(0, 0, W, H); WR.paint(one, strokes, p); RD.finalize(one);
const bandH = 300; let diff = 0, worst = 0, n = 0;
for (let y = 0; y < H; y += bandH) {
  const hB = Math.min(bandH, H - y), mT = Math.min(M, y), mB = Math.min(M, H - y - hB);
  const c = RD.makeCanvas(0, y - mT, W, hB + mT + mB); WR.paint(c, strokes, p); RD.finalize(c);
  for (let yy = 0; yy < hB; yy++) for (let x = 0; x < W; x++) for (let ch = 0; ch < 4; ch++) {
    const a = c.data[((yy + mT) * W + x) * 4 + ch], b = one.data[((y + yy) * W + x) * 4 + ch], d = Math.abs(a - b);
    n++; if (d > 1) { diff++; if (d > worst) worst = d; }
  }
}
console.log(boq, sub, 'valores distintos (>1):', diff, 'de', n, '· peor diferencia:', worst);
