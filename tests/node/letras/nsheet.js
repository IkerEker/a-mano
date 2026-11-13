// la N (y la Ñ) de cada estilo, sus 5 variantes, en mayúsculas y como mayúscula de cursiva.  node nsheet.js OUT [letras]
const FN = require('/home/claude/a-mano/js/fonts.js');
const RD = require('/home/claude/a-mano/js/render.js');
const { writePNG, flatten } = require('/home/claude/a-mano/tools/png.js');
const styles = ['infantil_a','infantil_b','adulta_a','adulta_b','nerviosa_a','nerviosa_b','elegante_a','elegante_b','graffiti_a','graffiti_b','graffiti_c','graffiti_d','graffiti_e','graffiti_f'];
const chars = Array.from(process.argv[3] || 'N');
const em = 80, cw = 86, W = 60 + cw * 5 * 2 * chars.length + 40, H = styles.length * 96 + 20;
const cv = RD.makeCanvas(0, 0, W, H);
styles.forEach((sk, si) => {
  const y = 20 + si * 96 + 66; let x = 30;
  for (const ch of chars) for (const mode of ['mayus', 'cursiva']) for (let v = 0; v < 5; v++) {
    const g = FN.glyph(sk, FN.styleOf(sk).gmode && mode === 'mayus' ? FN.styleOf(sk).gmode : mode, FN.caseText(ch, FN.styleOf(sk).gmode || 'mayus', sk), v);
    if (g) for (const s of g.strokes) {
      const pts = s.pts.map(([a, b]) => [x - g.body.left * em + a * em, y + b * em]);
      for (let k = 1; k < pts.length; k++) { const [ax, ay] = pts[k - 1], [bx, by] = pts[k]; const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 1.4, ny = dx / l * 1.4; RD.fillPolys(cv, [new Float64Array([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny])], mode === 'mayus' ? [20, 20, 20] : [150, 40, 40]); }
    }
    x += cw;
  }
});
writePNG(process.argv[2], W, H, flatten(cv));
console.log(styles.join(' | '));
