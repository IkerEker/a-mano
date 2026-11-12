// Pruebas de A mano AE: el panel real (dist_ae) en Chromium con After Effects simulado.  node tests/ae/harness.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const VER = fs.readFileSync(path.join(__dirname, '..', '..', 'ae', 'VERSION'), 'utf8').trim();
const EXT = path.join(__dirname, '..', '..', 'dist_ae', 'A_mano_AE_v' + VER, 'com.amano.ae');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 330, height: 1100 } });
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.route('http://ae.local/**', async route => {
    const f = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (f === 'index.html') {
      const html = fs.readFileSync(path.join(EXT, 'index.html'), 'utf8').replace('<script src="main.js"></script>', '<script src="aesim.js"></script><script src="host.jsx"></script><script src="main.js"></script>');
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    const p = f === 'aesim.js' ? path.join(__dirname, 'aesim.js') : path.join(EXT, f);
    if (fs.existsSync(p)) return route.fulfill({ status: 200, contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8', body: fs.readFileSync(p, 'utf8') });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://ae.local/index.html');
  await page.waitForTimeout(300);
  const res = [];
  const rec = (name, ok, extra) => { res.push([name, !!ok]); console.log((ok ? ' bien  ' : ' FALLO ') + name + (extra ? '  ' + extra : '')); };
  const done = async () => { await page.waitForFunction(() => !document.getElementById('btnGo').hasAttribute('disabled') && /\b(ok|err)\b/.test(document.getElementById('status').className), null, { timeout: 180000 }); return page.evaluate(() => ({ cls: document.getElementById('status').className, msg: document.getElementById('status').textContent })); };
  const go = async id => { await page.evaluate(i => { document.getElementById('status').className = 'status'; document.getElementById(i).click(); }, id); return done(); };
  const pick = (seg, v) => page.evaluate(([s, x]) => document.querySelector('#' + s + ' [data-v="' + x + '"]').click(), [seg, v]);
  const layerState = () => page.evaluate(() => {
    const c = AESIM.project.activeItem, L = c.selectedLayers[0];
    if (!L) return null;
    const tg = L.property('ADBE Transform Group'), mk = L.property('ADBE Marker');
    return { name: L.name, n: c.numLayers, inP: L.inPoint, outP: L.outPoint, remap: L.timeRemapEnabled, frames: L.source.frames, w: L.source.width, h: L.source.height, pos: tg.property('ADBE Position').value, scale: tg.property('ADBE Scale').value, blend: L.blendingMode, markers: mk.keys.map(k => [k.time, k.value.comment]), comment: L.comment, fps: L.source.mainSource.conformFrameRate, undo: AESIM.undoDepth(), items: AESIM.project.list.map(i => i.name) };
  });
  const frameAt = t => page.evaluate(tt => AESIM.frameAt(AESIM.project.activeItem.selectedLayers[0], tt), t);
  const savePng = async (i, file) => {
    const b64 = await page.evaluate(k => { const L = AESIM.project.activeItem.selectedLayers[0]; const dir = L.source.mainSource.file.parent.fsName; const d = AESIM.files.get(dir + '/amano_' + ('00000' + k).slice(-5) + '.png'); let s = ''; for (let j = 0; j < d.length; j += 8192) s += String.fromCharCode.apply(null, d.subarray(j, j + 8192)); return btoa(s); }, i);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(b64, 'base64'));
  };

  // 0. sin composición: aviso
  let r = await go('btnGo');
  rec('sin composición (aviso)', r.cls.includes('err') && /composición/.test(r.msg), r.msg);

  // 1. clip nuevo: 3 s, marcadores, expresión
  await page.evaluate(() => { const c = AESIM.newComp(1280, 720, 25, 20); c.time = 2; });
  r = await go('btnGo');
  let L = await layerState();
  rec('escribe un clip nuevo', r.cls.includes('ok') && L && L.n === 1, r.msg);
  rec('clip de 3 s donde está el cursor', L && Math.abs(L.inP - 2) < 1e-6 && Math.abs(L.outP - 5) < 1e-6 && L.remap);
  rec('dos marcadores: entrada y salida', L && L.markers.length === 2 && L.markers[0][1] === 'entrada' && Math.abs(L.markers[0][0] - 3.2) < 1e-6 && L.markers[1][1] === 'salida' && Math.abs(L.markers[1][0] - 4.2) < 1e-6, JSON.stringify(L && L.markers));
  const NW = Math.round(25 * 1.2 * 1.5), NE = Math.round(25 * 0.8 * 1.5);
  rec('secuencia con todos los fotogramas, a los fps de la composición', L && L.frames === NW + NE + 1 && L.fps === 25, L && (L.frames + ' fotogramas, ' + L.w + '×' + L.h));
  rec('la capa queda centrada en la composición', L && Math.abs(L.pos[0] - 640) < 60 && Math.abs(L.pos[1] - 360) < 60, JSON.stringify(L && L.pos));
  rec('un solo paso de deshacer, cerrado', L && L.undo === 0);
  const f = [await frameAt(2), await frameAt(2.6), await frameAt(3.2), await frameAt(3.7), await frameAt(4.2), await frameAt(4.6), await frameAt(5 - 1 / 25)];
  rec('expresión: vacío → se escribe → entero → se borra → vacío', f[0] === 0 && f[1] > 0 && f[1] < NW && f[2] === NW && f[3] === NW && f[4] === NW && f[5] > NW && f[5] < NW + NE && f[6] === NW + NE, f.join(' '));
  // mover los marcadores cambia los tiempos sin regenerar
  await page.evaluate(() => { const mk = AESIM.project.activeItem.selectedLayers[0].property('ADBE Marker'); mk.keys[0].time = 4; mk.keys[1].time = 4.5; });
  const g = [await frameAt(3), await frameAt(4), await frameAt(4.75)];
  rec('mover los marcadores retima la animación', g[0] === Math.round(NW / 2) && g[1] === NW && g[2] > NW, g.join(' '));
  for (const [i, n] of [[0, 'a_000'], [Math.round(NW * 0.35), 'a_035'], [Math.round(NW * 0.7), 'a_070'], [NW, 'a_100'], [NW + Math.round(NE * 0.4), 'a_borra40'], [NW + NE, 'a_fin']]) await savePng(i, n + '.png');
  await page.screenshot({ path: path.join(OUT, 'panel.png') });

  // 2. «Escribir» con el clip seleccionado: mismo clip, misma mano; «Otra variación»: otra semilla
  const seed0 = JSON.parse(L.comment.replace(/^A mano\|/, '')).seed;
  await pick('toolSeg', 'pincel'); await pick('caseSeg', 'mayus');
  r = await go('btnGo');
  let L2 = await layerState();
  rec('reescribe en el mismo clip (tiempos y marcadores intactos)', r.cls.includes('ok') && /Reescrito/.test(r.msg) && L2.n === 1 && L2.inP === 2 && L2.outP === 5 && L2.markers.length === 2 && L2.markers[0][0] === 4, r.msg);
  rec('misma semilla al reescribir; la secuencia vieja sale del proyecto', JSON.parse(L2.comment.replace(/^A mano\|/, '')).seed === seed0 && L2.items.filter(n => /amano_/.test(n) || /✍/.test(n)).length === 1, L2.items.join(' | '));
  r = await go('btnNew');
  L2 = await layerState();
  rec('otra variación: otra semilla, mismo clip', r.cls.includes('ok') && L2.n === 1 && JSON.parse(L2.comment.replace(/^A mano\|/, '')).seed !== seed0);
  await savePng(Math.round(L2.frames * 0.3), 'b_pincel.png');

  // 3. marcha atrás, negativo y subrayado, en arco, dentro de un sólido seleccionado, al 200 %
  await page.evaluate(() => { const c = AESIM.project.activeItem; c.list.forEach(l => { l.selected = false; }); AESIM.addSolid(100, 60, 900, 400).selected = true; c.time = 8; });
  await pick('shapeGrid', 'arco'); await pick('eraseSeg', 'atras'); await pick('toolSeg', 'lapiz');
  await page.evaluate(() => { const t = document.getElementById('txt'); const sel = (w, id) => { const i = t.value.indexOf(w); t.focus(); t.setSelectionRange(i, i + w.length); document.getElementById(id).click(); }; sel('cerrado', 'stNegv'); sel('puerta', 'stSub'); const s = document.getElementById('sl_escala'); s.value = 200; s.dispatchEvent(new Event('input')); });
  r = await go('btnGo');
  const L3 = await layerState();
  rec('clip nuevo dentro del sólido seleccionado', r.cls.includes('ok') && L3 && L3.n === 3 && L3.pos[0] > 300 && L3.pos[0] < 700 && L3.pos[1] > 100 && L3.pos[1] < 360, r.msg + ' ' + JSON.stringify(L3 && L3.pos));
  rec('200 %: fotogramas al doble y capa al 50 %', L3 && L3.scale[0] === 50 && L3.w > 600, JSON.stringify(L3 && [L3.scale, L3.w, L3.h]));
  const NW3 = L3.frames - 1;
  const h = [await frameAt(8), await frameAt(9.2), await frameAt(10.6), await frameAt(11 - 1 / 25)];
  rec('marcha atrás: solo fotogramas de escritura; al final, vacío', NW3 === NW && h[0] === 0 && h[1] === NW3 && h[2] < NW3 && h[2] > 0 && h[3] === 0, L3.frames + ' fotogramas; ' + h.join(' '));
  rec('lápiz oscuro: capa en Multiplicar', L3.blend === 'MULTIPLY');
  await savePng(Math.round(NW3 * 0.6), 'c_arco_neg.png'); await savePng(NW3, 'c_arco_fin.png');

  // 4. cargar ajustes de la capa y vaciar fotogramas sin usar
  await pick('toolSeg', 'boli');
  r = await go('btnLoad');
  rec('carga los ajustes del clip', r.cls.includes('ok') && await page.evaluate(() => document.querySelector('#toolSeg .on').getAttribute('data-v') === 'lapiz'), r.msg);
  const before = await page.evaluate(() => new Set([...AESIM.files.keys()].map(k => k.replace(/\/[^/]*$/, ''))).size);
  r = await go('btnClean');
  const after = await page.evaluate(() => new Set([...AESIM.files.keys()].map(k => k.replace(/\/[^/]*$/, ''))).size);
  rec('vacía las secuencias que el proyecto ya no usa', r.cls.includes('ok') && before === 4 && after === 2, before + ' → ' + after + '  ' + r.msg);

  // 5. tiempos imposibles: aviso
  await page.evaluate(() => { const e = document.getElementById('nIn'); e.value = 5; e.dispatchEvent(new Event('change')); });
  r = await go('btnGo');
  rec('tiempos que no caben (aviso)', r.cls.includes('err') && /no caben/.test(r.msg), r.msg);

  const bad = res.filter(x => !x[1]).map(x => x[0]);
  const errs = logs.filter(l => /PAGEERROR|^error/.test(l));
  console.log('\nresultado: ' + (res.length - bad.length) + ' / ' + res.length + ' bien. fallos: ' + JSON.stringify(bad) + ' errores de consola: ' + errs.length);
  if (errs.length) console.log(errs.slice(0, 8).join('\n'));
  await browser.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
