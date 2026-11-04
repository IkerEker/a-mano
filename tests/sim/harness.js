// Pruebas de extremo a extremo de A mano (panel real + Photoshop simulado). node tests/sim/harness.js
const { open } = require('./setup.js');

(async () => {
  const S = await open(3000, 1900);
  const { run, waitDone, refresh, snap, newDoc, rec } = S;
  const go = async (name, fn) => { await run(fn); await refresh(); };
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
  // 1. cada herramienta sobre tres capas (dos columnas y un titular)
  let ids = await setup();
  await snap('00_original');
  for (const [seg, tool] of [['toolSeg', 'boli'], ['toolSeg', 'rotulador'], ['toolSeg', 'pincel'], ['toolSeg', 'lapiz'], ['toolSeg2', 'brocha'], ['toolSeg2', 'sello']]) {
    await run(([ids, seg, tool]) => { SIM.select(...ids); T.seg(seg, tool); T.seg('kindSeg', 'imagen'); }, [ids, seg, tool]);
    await refresh();
    const t0 = Date.now();
    await run(() => T.click('btnHand'));
    const st = await waitDone();
    console.log(tool, Date.now() - t0, 'ms');
    await rec('1 ' + tool, st); await snap('01_' + tool);
  }
  // 2. otra variación, volver al original, editable
  await run(ids => SIM.select(ids[0]), ids); await run(() => T.click('btnHandNew'));
  await rec('2 otra variación', await waitDone()); await snap('02_otra_variacion');
  await run(ids => SIM.select(...ids), ids); await run(() => T.click('btnHandUndo'));
  await rec('2b volver al original', await waitDone()); await snap('02b_original');
  await run(ids => { SIM.select(ids[1]); T.seg('kindSeg', 'editable'); }, ids); await run(() => T.click('btnHand'));
  await rec('2c editable', await waitDone()); await snap('02c_editable');
  await run(() => T.seg('kindSeg', 'imagen'));
  // 3. grupo con capas de texto (como un bloque editable de Cartelator) y texto girado
  ids = await setup();
  await run(ids => { SIM.rotate(ids[2], -12); const g = SIM.group('Cartel · notas #abc123', [ids[0], ids[1]]); SIM.select(g, ids[2]); T.seg('toolSeg', 'rotulador'); }, ids);
  await refresh();
  console.log('ctx:', await run(() => document.getElementById('ctx').textContent));
  await run(() => T.click('btnHand'));
  await rec('3 grupo + texto girado', await waitDone()); await snap('03_grupo_girado');
  // 4. sin nada seleccionado
  await newDoc(1000, 800); await run(() => SIM.select()); await refresh();
  await run(() => T.click('btnHand'));
  await rec('4 sin selección', await waitDone());
  // 5. documento de 16 bits
  ids = await setup(); await run(() => { SIM.doc().bitsPerChannel = 'bitDepth16'; });
  await run(ids => SIM.select(...ids), ids); await run(() => T.click('btnHand'));
  await rec('5 16 bits', await waitDone());
  await S.page.screenshot({ path: S.OUT + '/panel.png', fullPage: true });
  const rep = await S.close();
  console.log('\nfallos:', rep.filter(r => !r.ok).map(r => r.name), 'errores modal:', rep.reduce((a, r) => a + r.errors.length, 0));
})().catch(e => { console.error(e); process.exit(1); });
