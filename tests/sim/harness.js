// Pruebas de extremo a extremo de A mano 2 (panel real + Photoshop simulado). node tests/sim/harness.js
const { open } = require('./setup.js');

(async () => {
  const S = await open(3000, 1900);
  const { run, waitDone, refresh, snap, newDoc, rec } = S;
  const click = id => run(i => T.click(i), id);
  const shape = async (type) => { await run(v => document.querySelector('#shapeGrid [data-v="' + v + '"]').click(), type); return waitDone(); };
  const sel = (re) => run(r => { const ids = SIM.byName(r); SIM.select(...ids); return ids; }, re);

  // ================================================================ GENERAR
  await run(() => T.click('tab-gen'));
  await run(() => { T.text('Nadie había cerrado\nla puerta del sótano (otra vez)'); });
  await run(() => { T.style('había', 'hero'); T.style('cerrado', 'bold'); T.style('del', 'small'); });
  console.log('chips:', (await run(() => T.chips())).join(' '));

  // 1. sin forma: aviso
  await newDoc(3000, 1900); await refresh();
  await click('btnGo');
  await rec('G0 sin forma (aviso)', await waitDone(), true);

  // 2. cada forma con una herramienta y una letra distintas
  const combos = [
    ['rect', 'rotulador', 'fino', 'adulta', 'minus', 'a'],
    ['arco', 'pincel', 'gordo', 'nerviosa', 'mayus', 'a'],
    ['bandera', 'boli', 'bic', 'elegante', 'cursiva', 'b'],
    ['abanico', 'lapiz', 'hb', 'infantil', 'mayus', 'a'],
    ['circulo', 'carbon', 'suave', 'infantil', 'mayus', 'b'],
    ['rect', 'pincel', 'humedo', 'nerviosa', 'mayus', 'b'],
    ['rect', 'rotulador', 'gordo', 'adulta', 'mayus', 'b'],
    ['rect', 'boli', 'fino', 'elegante', 'minus', 'a']
  ];
  let ci = 0;
  for (const [type, tool, preset, persona, mode, ver] of combos) {
    ci++;
    await newDoc(3000, 1900);
    await refresh();
    const st = await shape(type);
    await rec('G1 forma ' + type, st);
    await run(([tool, preset, persona, mode, ver]) => { T.seg('toolSeg', tool); T.seg('presetSeg', preset); T.seg('fontSeg', persona); T.seg('versionSeg', ver); T.seg('caseSeg', mode); }, [tool, preset, persona, mode, ver]);
    await refresh();
    console.log('ctx:', await run(() => document.getElementById('ctxGen').textContent));
    const t0 = Date.now();
    await click('btnGo');
    const s2 = await waitDone();
    console.log(type, Date.now() - t0, 'ms');
    await rec('G2 escribir ' + type + ' (' + tool + ' ' + preset + ', ' + persona + ' ' + ver.toUpperCase() + ' ' + mode + ')', s2);
    await snap('g_' + ci + '_' + type + '_' + tool + '_' + persona + ver);
  }

  // 3. selección de lazo
  await newDoc(3000, 1900); await refresh();
  await run(() => { const P = []; for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283, r = 520 + 140 * Math.sin(3 * a) + 60 * Math.cos(5 * a); P.push([1500 + r * 1.45 * Math.cos(a), 950 + r * Math.sin(a)]); } SIM.setSelection(P); });
  await rec('G3 forma desde la selección', await shape('lazo'));
  await run(() => { T.seg('toolSeg', 'pincel'); T.seg('presetSeg', 'seco'); T.seg('fontSeg', 'adulta'); T.seg('caseSeg', 'minus'); });
  await click('btnGo');
  await rec('G3b escribir en la selección', await waitDone());
  await snap('g_lazo');
  // lazo sin selección: aviso
  await rec('G3c lazo sin selección (aviso)', await shape('lazo'), true);

  // 4. girar, voltear y deformar la forma ya escrita y volver a escribir (se sustituye lo anterior)
  await newDoc(3000, 1900); await refresh();
  await shape('arco');
  await run(() => { T.seg('toolSeg', 'rotulador'); T.seg('presetSeg', 'gordo'); T.seg('fontSeg', 'adulta'); T.seg('versionSeg', 'a'); T.seg('caseSeg', 'minus'); });
  await click('btnGo'); await waitDone();
  const blend = await run(() => { const l = SIM.byName('^✍ (?!A mano)').map(SIM.layer)[0]; return l && l.blendMode; });
  await rec('G4a capa de rotulador en Multiplicar (' + blend + ')', { text: String(blend), cls: blend === 'multiply' ? 'ok' : 'err' });
  for (const [name, op] of [['girada', 'rot'], ['volteada en vertical', 'flipv'], ['deformada', 'warp']]) {
    await run(op => {
      const id = SIM.byName('^◇ ')[0];
      if (op === 'rot') SIM.rotateShape(id, -20); else if (op === 'flipv') SIM.flipShape(id, 'v'); else SIM.warpShape(id, 60, 120);
      SIM.select(SIM.byName('^✍ A mano')[0]);
    }, op);
    await refresh();
    await click('btnGo');
    await rec('G4 forma ' + name + ' y reescrita', await waitDone());
    await snap('g_arco_' + op);
  }
  const nInGroup = await run(() => SIM.tree().split('\n').filter(l => /\[pixel\]/.test(l)).length);
  await rec('G4b solo queda un resultado (' + nInGroup + ')', { text: 'capas de píxeles: ' + nInGroup, cls: nInGroup === 1 ? 'ok' : 'err' });

  // 5. otra variación
  await click('btnNew');
  await rec('G5 otra variación', await waitDone());
  await snap('g_arco_variacion');

  // 5b. autoencajar (rectángulo y círculo)
  await run(() => { T.text('You are single because you fall for people on the covers of the magazines'); T.seg('textModeSeg', 'auto'); T.seg('toolSeg', 'pincel'); T.seg('presetSeg', 'gordo'); T.seg('fontSeg', 'nerviosa'); T.seg('versionSeg', 'a'); T.seg('caseSeg', 'mayus'); });
  for (const type of ['rect', 'circulo']) {
    await newDoc(2000, 2600); await refresh();
    await shape(type);
    await click('btnGo');
    await rec('G5b autoencajar en ' + type, await waitDone());
    await snap('g_auto_' + type, 0.3);
  }
  await run(() => { T.seg('textModeSeg', 'importancia'); T.text('Nadie había cerrado\nla puerta del sótano (otra vez)'); });

  // 6. sin texto: aviso
  await run(() => T.text('   '));
  await click('btnGo');
  await rec('G6 sin texto (aviso)', await waitDone(), true);
  await run(() => T.text('Nadie había cerrado\nla puerta del sótano (otra vez)'));

  // 7. todas las herramientas y packs, misma forma (hoja de muestras)
  await newDoc(2400, 1000); await refresh();
  await shape('rect');
  const tools = await run(() => Array.from(document.querySelectorAll('#toolSeg .segb')).map(b => b.getAttribute('data-v')));
  for (const tool of tools) {
    await run(t => T.seg('toolSeg', t), tool);
    const presets = await run(() => Array.from(document.querySelectorAll('#presetSeg .segb')).map(b => b.getAttribute('data-v')));
    for (const pk of presets) {
      await run(pk => { T.seg('presetSeg', pk); SIM.select(SIM.byName('^✍ A mano|^◇ ')[0]); }, pk);
      await click('btnGo');
      const s = await waitDone();
      if (!/ok/.test(s.cls)) await rec('G7 ' + tool + ' ' + pk, s);
      await snap('t_' + tool + '_' + pk, 0.5);
    }
  }
  await rec('G7 todas las herramientas', { text: 'hecho', cls: 'ok' });

  // ================================================================ CALCAR
  await run(() => T.click('tab-calc'));
  const para = 'Y entonces me di cuenta\rde que nadie había cerrado\rla puerta del sótano.\r(Otra vez.)';
  const para2 = 'El gato llevaba tres días\rsin aparecer y la vecina\rjuraba que lo había visto\ren el tejado hablando solo.';
  const setup = async () => {
    await newDoc(3000, 1900);
    return run(([a, b]) => [
      SIM.addText({ text: a, x: 160, y: 360, leadingPx: 160, ranges: [{ from: 0, to: a.length, font: 'Poppins-Medium', sizePx: 100, color: '#1b2a6b' }] }),
      SIM.addText({ text: b, x: 1640, y: 360, leadingPx: 160, ranges: [{ from: 0, to: 8, font: 'Poppins-Medium', sizePx: 100, color: '#c0392b' }, { from: 8, to: b.length, font: 'Poppins-Medium', sizePx: 100, color: '#1b2a6b' }] }),
      SIM.addText({ text: 'NOTAS DEL MARTES', name: 'Titular', x: 160, y: 1450, ranges: [{ from: 0, to: 16, font: 'TeXGyreHerosCn-Bold', sizePx: 230, color: '#222222' }] })
    ], [para, para2]);
  };
  let ids = await setup();
  await snap('c_00_original');
  for (const [tool, pk, fill] of [['boli', 'bic', ''], ['rotulador', 'gordo', ''], ['pincel', 'gordo', ''], ['lapiz', 'hb', ''], ['carbon', 'fuerte', ''], ['pincel', 'seco', 'brocha'], ['pincel', 'fino', 'sello']]) {
    await run(([ids, tool, pk, fill]) => { SIM.select(...ids); T.seg('toolSeg', tool); T.seg('presetSeg', pk); T.seg('fillSeg', fill); T.seg('kindSeg', 'imagen'); }, [ids, tool, pk, fill]);
    await refresh();
    const t0 = Date.now();
    await click('btnGo');
    const s = await waitDone();
    console.log('calcar', tool, pk, fill, Date.now() - t0, 'ms');
    await rec('C1 ' + tool + ' ' + pk + (fill ? ' + ' + fill : ''), s); await snap('c_01_' + tool + '_' + pk + (fill ? '_' + fill : ''));
    const nPix = await run(() => SIM.tree().split('\n').filter(l => /\[pixel\]/.test(l)).length);
    if (nPix !== 3) await rec('C1 copias duplicadas tras ' + tool + ' (' + nPix + ')', { text: nPix + ' capas de píxeles', cls: 'err' });
  }
  await run(() => T.seg('fillSeg', ''));
  await run(ids => SIM.select(ids[0]), ids); await click('btnNew');
  await rec('C2 otra variación', await waitDone());
  await run(ids => SIM.select(...ids), ids); await click('btnUndo');
  await rec('C2b volver al original', await waitDone());
  await run(ids => { SIM.select(ids[1]); T.seg('kindSeg', 'editable'); }, ids); await click('btnGo');
  await rec('C2c editable', await waitDone());
  await run(() => T.seg('kindSeg', 'imagen'));
  ids = await setup();
  await run(ids => { SIM.rotate(ids[2], -12); const g = SIM.group('Cartel · notas #abc123', [ids[0], ids[1]]); SIM.select(g, ids[2]); T.seg('toolSeg', 'rotulador'); T.seg('presetSeg', 'fino'); }, ids);
  await refresh();
  await click('btnGo');
  await rec('C3 grupo + texto girado', await waitDone()); await snap('c_03_grupo_girado');
  await newDoc(1000, 800); await run(() => SIM.select()); await refresh();
  await click('btnGo');
  await rec('C4 sin selección (aviso)', await waitDone(), true);
  ids = await setup(); await run(() => { SIM.doc().bitsPerChannel = 'bitDepth16'; });
  await run(ids => SIM.select(...ids), ids); await click('btnGo');
  await rec('C5 16 bits', await waitDone());

  // panel
  await run(() => T.click('tab-gen'));
  await S.page.screenshot({ path: S.OUT + '/panel_generar.png', fullPage: true });
  await run(() => T.click('tab-calc'));
  await S.page.screenshot({ path: S.OUT + '/panel_calcar.png', fullPage: true });
  await run(() => { T.click('tab-gen'); T.click('btnAdv'); });
  await S.page.screenshot({ path: S.OUT + '/panel_avanzado.png', fullPage: true });
  const rep = await S.close();
  const bad = rep.filter(r => !r.ok);
  console.log('\nresultado:', rep.length - bad.length, '/', rep.length, 'bien. fallos:', bad.map(r => r.name + ' → ' + r.status), 'errores modal:', rep.reduce((a, r) => a + r.errors.length, 0));
  if (S.logs.some(l => /PAGEERROR/.test(l))) console.log(S.logs.filter(l => /PAGEERROR|error/i.test(l)).slice(0, 10).join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
