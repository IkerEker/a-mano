// el cartel de prueba del usuario con una boquilla.  node poster.js BOQUILLA [firma=a] [W=1100] [goteo=0.45] [seed]
const boq = process.argv[2], sub = process.argv[3] || 'a', W = +(process.argv[4] || 1100), go = +(process.argv[5] || 0.45), seed = +(process.argv[6] || 21);
process.argv[2] = 'poster';
const PV = require('/home/claude/a-mano/tests/node/preview.js');
const FN = require('/home/claude/a-mano/js/fonts.js'), INK = require('/home/claude/a-mano/js/ink.js');
const k = 'graffiti_' + sub, S = FN.styleOf(k), H = Math.round(W * 1.42), m = Math.round(W * 0.07);
PV.render('p_' + boq + '_' + sub + (W !== 1100 ? '_' + W : ''), { text: 'Nadie había\ncerrado\nla puerta\ndel sótano\nNadie había\ncerrado\nla puerta\ndel sótano', levels: process.env.LV ? JSON.parse(process.env.LV) : [], shape: 'rect',
  p: { persona: k, mode: S.gmode, tool: 'spray', preset: boq, legib: 0.7, goteo: go, nube: 0.5, deriva: process.env.DER == null ? 0.5 : +process.env.DER, relieve: process.env.REL == null ? 0.4 : +process.env.REL, color: process.env.COL || '#161616', inkPad: INK.preset('spray', boq).w * ((S.gmode === 'cursiva' && S.weightS) || S.weight) },
  W, H, box: { left: m, top: m, right: W - m, bottom: H - m }, showShape: false, seed });
