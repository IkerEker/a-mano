// abecedario de cada estilo: mayúsculas y minúsculas de molde (variante 0), trazo fino. node alpha.js OUT [estilos]
const FN = require('/home/claude/a-mano/js/fonts.js');
const RD = require('/home/claude/a-mano/js/render.js');
const { writePNG, flatten } = require('/home/claude/a-mano/tools/png.js');
const styles = (process.argv[3] || 'infantil_a,infantil_b,adulta_a,adulta_b,nerviosa_a,nerviosa_b,elegante_a,elegante_b').split(',');
const rows = [['mayus', 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'], ['minus', 'abcdefghijklmnñopqrstuvwxyz íú']];
const em = 46, W = 2000, rowH = 84, H = styles.length * rows.length * rowH + 30;
const cv = RD.makeCanvas(0, 0, W, H);
let y = 0;
for (const sk of styles) for (const [mode, txt] of rows) {
  y += rowH; let x = 16, i = 0;
  for (const ch of Array.from(txt)) {
    if (ch === ' ') { x += em * 0.5; continue; }
    const g = FN.glyph(sk, mode, ch, (i++) % 5);
    if (!g) { x += em * 0.4; continue; }
    const wd = 1.5 * (FN.STYLES[sk].weight || 1);
    for (const s of g.strokes) {
      const pts = s.pts.map(([a, b]) => [x - g.body.left * em + a * em, y - 22 + b * em]);
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
        const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * wd, ny = dx / l * wd;
        RD.fillPolys(cv, [new Float64Array([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny])], [20, 20, 20]);
      }
    }
    x += (g.body.right - g.body.left + 0.34) * em;
  }
}
writePNG(process.argv[2], W, H, flatten(cv));
