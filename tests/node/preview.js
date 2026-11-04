// Vista previa sin Photoshop: forma -> maquetación -> trazos -> PNG.  node tests/node/preview.js OUTDIR
const path = require('path');
const J = f => require(path.join(__dirname, '..', '..', 'js', f));
const SH = J('shapes.js'), LY = J('layout.js'), WR = J('writer.js'), G = J('geom.js'), RD = J('render.js'), INK = J('ink.js');
const { writePNG, flatten } = require(path.join(__dirname, '..', '..', 'tools', 'png.js'));
const OUT = process.argv[2] || '/tmp/prev';
require('fs').mkdirSync(OUT, { recursive: true });

function shapeFromType(type, box) {
  const s = SH.makeShape(type, box);
  const pc = SH.toPathContents(s.anchors, 300, 'px');
  const comps = G.readPathContents(pc, 300);
  return { s, rd: SH.readShape(comps, type), comps };
}
function outlineOf(comps, cv) {
  for (const c of comps) for (const sub of c.subpaths) {
    const poly = G.flattenSegs(G.segmentsOf(Object.assign({}, sub, { closed: true })), 0.5);
    RD.fillPolys(cv, [poly], [235, 228, 215]);
  }
}
function render(name, opts) {
  const W = opts.W || 1600, H = opts.H || 900;
  const cv = RD.makeCanvas(0, 0, W, H);
  const { rd, comps } = shapeFromType(opts.shape || 'rect', opts.box || { left: 100, top: 100, right: W - 100, bottom: H - 100 });
  if (opts.showShape !== false) outlineOf(comps, cv);
  const p = Object.assign({ persona: 'adulta', mode: 'minus', tool: 'rotulador', preset: 'fino', legib: 0.7, locura: 1, pulso: 0.4, prisa: 0.15, width: 1, repasado: 1, tinta: 0.55, color: '#1d1d1f', contrast: 1, leading: 1.05, align: 'center' }, opts.p || {});
  const t0 = Date.now();
  const lay = LY.layoutInShape(opts.text, opts.levels || [], rd, p);
  const strokes = WR.plan(lay, p, opts.seed || 12345);
  WR.paint(cv, strokes, p);
  writePNG(path.join(OUT, name + '.png'), W, H, flatten(cv));
  console.log(name, strokes.length, 'trazos', Date.now() - t0, 'ms');
}
module.exports = { render };
if (require.main === module) {
  const txt = 'Nadie había cerrado\nla puerta del sótano';
  const lv = [0, 2, 1, 0, 0, -1, 0];
  for (const tool of INK.TOOL_ORDER) for (const pk of Object.keys(INK.TOOLS[tool].presets)) {
    render(tool + '_' + pk, { text: txt, levels: lv, shape: 'rect', p: { tool, preset: pk }, W: 1400, H: 620, box: { left: 60, top: 60, right: 1340, bottom: 560 } });
  }
}
