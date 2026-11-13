// todas las mayúsculas de un estilo, 5 variantes por letra.  node stylesheet.js OUT estilo [modo=mayus] [letras]
const FN = require('/home/claude/a-mano/js/fonts.js');
const RD = require('/home/claude/a-mano/js/render.js');
const { writePNG, flatten } = require('/home/claude/a-mano/tools/png.js');
const sk = process.argv[3], mode = process.argv[4] || 'mayus', chars = Array.from(process.argv[5] || 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ');
const em = 62, cw = 70, per = 5, cols = 4, W = 30 + cols * (per * cw + 40), rows = Math.ceil(chars.length / cols), H = rows * 92 + 20;
const cv = RD.makeCanvas(0, 0, W, H);
chars.forEach((ch, ci) => {
  const y = 20 + Math.floor(ci / cols) * 92 + 62; let x = 30 + (ci % cols) * (per * cw + 40);
  for (let v = 0; v < per; v++) {
    const g = FN.glyph(sk, mode, FN.caseText(ch, mode, sk), v);
    if (g) for (const s of g.strokes) {
      const pts = s.pts.map(([a, b]) => [x - g.body.left * em + a * em, y + b * em]);
      for (let k = 1; k < pts.length; k++) { const [ax, ay] = pts[k - 1], [bx, by] = pts[k]; const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 1.3, ny = dx / l * 1.3; RD.fillPolys(cv, [new Float64Array([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny])], [20, 20, 20]); }
    }
    x += cw;
  }
});
writePNG(process.argv[2], W, H, flatten(cv));
