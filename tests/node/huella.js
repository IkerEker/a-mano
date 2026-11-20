// HUELLA DE RENDER: un render por técnica y preset (mismo texto y semilla) y el md5 de sus píxeles, contra la referencia
// guardada. Es la prueba exacta del motor: cualquier cambio de código o de texturas que altere un solo píxel la rompe.
//   node tests/node/huella.js            compara con tests/node/huella_ref.json
//   node tests/node/huella.js --guardar  escribe la referencia (solo con el OK de Iker)
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'amano_huella_'));
const guardar = process.argv.includes('--guardar');
process.argv[2] = OUT;                                   // (preview.js escribe ahí sus PNG)
const PV = require('./preview.js'), INK = require('../../js/ink.js');
const REF = path.join(__dirname, 'huella_ref.json'), res = {};
const log = console.log; console.log = () => { };
for (const tool of INK.TOOL_ORDER) for (const pk of Object.keys(INK.TOOLS[tool].presets)) {
  const name = tool + '_' + pk, p = { tool, preset: pk };
  if (tool === 'spray') Object.assign(p, { persona: 'graffiti_c', mode: 'mayus', color: '#3f7a2a', relieve: 0.5 });
  PV.render(name, { text: 'Nadie había cerrado\nla puerta del sótano', levels: [0, 2, 1, 0, 0, -1, 0], shape: 'rect', p, W: 1000, H: 460, box: { left: 50, top: 50, right: 950, bottom: 410 }, showShape: false, seed: 12345 });
  res[name] = crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, name + '.png'))).digest('hex');
}
console.log = log;
fs.rmSync(OUT, { recursive: true, force: true });
if (guardar) { fs.writeFileSync(REF, JSON.stringify(res, null, 1) + '\n'); console.log('referencia guardada:', Object.keys(res).length, 'renders'); process.exit(0); }
const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
const mal = Object.keys(ref).filter(k => ref[k] !== res[k]);
if (mal.length) { console.log('HUELLA DISTINTA en', mal.length, 'de', Object.keys(ref).length + ':', mal.join(', ')); process.exit(1); }
console.log('HUELLA IDÉNTICA (' + Object.keys(ref).length + ' renders)');
