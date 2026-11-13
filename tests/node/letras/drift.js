// deriva del bloque según la cantidad de texto.  node drift.js NOMBRE DERIVA "texto" [firma=a] [boquilla=mop] [seed]
const name = process.argv[2], der = +process.argv[3], text = process.argv[4].replace(/\\n/g, '\n'), sub = process.argv[5] || 'a', boq = process.argv[6] || 'mop', seed = +(process.argv[7] || 21);
process.argv[2] = 'drift';
const PV = require('/home/claude/a-mano/tests/node/preview.js');
const FN = require('/home/claude/a-mano/js/fonts.js'), INK = require('/home/claude/a-mano/js/ink.js');
const k = 'graffiti_' + sub, S = FN.styleOf(k), W = 900, H = 1100, m = 70;
PV.render(name, { text, levels: [], shape: 'rect', p: { persona: k, mode: S.gmode, tool: 'spray', preset: boq, color: '#161616', legib: 0.7, goteo: 0.3, nube: 0.5, relieve: 0.35, deriva: der, inkPad: INK.preset('spray', boq).w * S.weight }, W, H, box: { left: m, top: m, right: W - m, bottom: H - m }, showShape: false, seed });
