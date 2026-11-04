'use strict';
// Panel de A mano.
//  GENERAR: forma (en el documento, deformable) -> texto con importancias -> estilo -> letra -> escribir
//  CALCAR:  pinta a mano, encima, el texto de tus capas de texto
// Ventana principal con lo básico; «Avanzado ›» con el resto.

const P = require('./ps.js');
const GL = require('./glyphs.js');
const R = require('./rng.js');
const HD = require('./hand.js');
const IN = require('./instances.js');
const INK = require('./ink.js');
const SH = require('./shapes.js');
const LY = require('./layout.js');
const WR = require('./writer.js');
const FN = require('./fonts.js');
const { app, action, constants } = require('photoshop');

const $ = id => document.getElementById(id);
const show = (el, on) => { if (el) { if (on) el.classList.remove('hidden'); else el.classList.add('hidden'); } };
const cls = (el, name, on) => { if (el) { if (on) el.classList.add(name); else el.classList.remove(name); } };

// ------------------------------------------------------------------ guardado
const store = {
  get(k, d) { try { const v = localStorage.getItem('amano.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('amano.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const DEF = {
  tab: 'gen', tool: 'rotulador', preset: 'fino', fill: '', color: '#1d1d1f', persona: 'adulta', version: 'a', mode: 'mayus', textMode: 'importancia', repaso: 'auto', legib: 70,
  grosor: 0, tinta: 55, pulso: 40, repasado: 50, follow: 'auto', locura: 50, prisa: 15, tight: 0,
  contraste: 50, inter: 100, llenar: 30, margen: 5, align: 'center', kind: 'imagen', colorMode: 'uno', colorVar: 45,
  text: 'Nadie había cerrado\nla puerta del sótano', levels: [0, 2, 1, 0, 0, -1, 0], marks: []
};
const st = Object.assign({}, DEF, store.get('settings2', {}));
if (st.persona === 'rabiosa') st.persona = 'nerviosa';
if (st.tool === 'carbon' && st.preset === 'cera') { st.tool = 'cera'; st.preset = 'cera'; }
if (!/^[ab]$/.test(st.version)) st.version = 'a';
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('settings2', st), 250); }

function seedFor(key, fresh) {
  const seeds = store.get('seeds', {});
  if (fresh || seeds[key] == null) {
    seeds[key] = R.newSeed();
    const ks = Object.keys(seeds);
    if (ks.length > 3000) for (const k of ks.slice(0, ks.length - 2500)) delete seeds[k];
    store.set('seeds', seeds);
  }
  return seeds[key];
}

// ------------------------------------------------------------------ estado general
let busy = false;
function status(msg, kind) {
  const el = $('status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'status' + (kind ? ' ' + kind : '');
}
function setBusy(on) {
  busy = on;
  for (const id of ['btnGo', 'btnNew', 'btnUndo']) {
    const b = $(id); if (!b) continue;
    if (on) b.setAttribute('disabled', ''); else b.removeAttribute('disabled');
  }
}
function friendlyError(e) {
  const m = String((e && e.message) || e);
  if (/modal|busy|ocupad/i.test(m)) return 'Photoshop está ocupado (¿hay una herramienta en uso, una transformación sin confirmar o un diálogo abierto?). Pulsa Intro o Esc y vuelve a probar.';
  return 'Algo ha fallado: ' + m;
}
async function work(msg, fn) {
  if (busy) return;
  setBusy(true);
  status(msg, '');
  const t0 = Date.now();
  try { await fn(t0); }
  catch (e) { status(e instanceof P.UserError ? e.message : friendlyError(e), 'err'); try { console.error(e); } catch (x) { /* nada */ } }
  finally { setBusy(false); scheduleRefresh(); }
}
const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
const docKey = doc => String((doc && (doc.title || doc.id)) || '');

// ------------------------------------------------------------------ parámetros
function chaos() { return Math.max(0, 1 - st.legib / 100); }
function genParams() {
  return {
    persona: st.persona + '_' + st.version, mode: st.mode, tool: st.tool, preset: st.preset, color: st.color,
    colorVar: st.colorMode === 'letras' ? Math.max(0.02, st.colorVar / 100) : 0,
    auto: st.textMode === 'auto', repaso: st.repaso, marks: st.marks || [],
    legib: st.legib / 100, locura: st.locura / 50, pulso: st.pulso / 100, prisa: st.prisa / 100,
    width: Math.pow(2, st.grosor / 50), repasado: st.repasado / 50, tinta: st.tinta / 100,
    contrast: st.contraste / 50, leading: st.inter / 100, align: st.align, stretch: 1 + st.llenar / 100,
    xFill: st.llenar / 150, margin: st.margen / 100, track: st.tight / 50 * 0.07,
    inkPad: Math.max(INK.preset(st.tool, st.preset).w * FN.styleOf(st.persona + '_' + st.version).weight, FN.styleOf(st.persona + '_' + st.version).absW || 0) * Math.pow(2, st.grosor / 50)
  };
}
function handParams() {
  // la legibilidad manda; «locura» la escala (50 = normal)
  const loc = Math.min(1.4, chaos() * 1.8 * (st.locura / 50));
  return { colorVar: st.colorMode === 'letras' ? Math.max(0.02, st.colorVar / 100) : 0, tool: st.tool, preset: st.preset, fill: st.fill || '', follow: st.follow, repaso: st.repaso, width: Math.pow(2, st.grosor / 50), locura: loc, pulso: st.pulso / 100, prisa: st.prisa / 100, tight: st.tight / 150, ink: st.tinta / 100 };
}

// ------------------------------------------------------------------ segmentados
function segSet(id, v) {
  const el = $(id); if (!el) return;
  for (const b of Array.from(el.querySelectorAll('.segb'))) cls(b, 'on', b.getAttribute('data-v') === v);
}
function segBind(id, fn) {
  const el = $(id); if (!el) return;
  el.addEventListener('click', ev => {
    let t = ev.target;
    while (t && t !== el && !(t.classList && t.classList.contains('segb'))) t = t.parentNode;
    if (t && t !== el) fn(t.getAttribute('data-v'));
  });
}

// ------------------------------------------------------------------ texto con importancias
let chipSel = new Set();
function tokens() { return LY.tokenize(st.text); }
// al editar, cada palabra conserva su importancia si sigue ahí
function relevel(oldToks, oldLv, newToks) {
  const out = [];
  let j = 0;
  for (const t of newToks) {
    let hit = -1;
    for (let k = j; k < Math.min(oldToks.length, j + 4); k++) if (oldToks[k].text === t.text) { hit = k; break; }
    if (hit >= 0) { out.push(oldLv[hit] || 0); j = hit + 1; }
    else { out.push(j < oldToks.length && oldToks.length === newToks.length ? (oldLv[j] || 0) : 0); if (oldToks.length === newToks.length) j++; }
  }
  return out;
}
function renderBoard() {
  const b = $('board'); if (!b) return;
  const toks = tokens();
  while (b.firstChild) b.removeChild(b.firstChild);
  if (!toks.length) { const e = document.createElement('span'); e.className = 'empty'; e.textContent = 'Escribe arriba el texto.'; b.appendChild(e); return; }
  toks.forEach((t, i) => {
    if (t.brk) { const br = document.createElement('div'); br.className = 'brk'; b.appendChild(br); }
    const c = document.createElement('span');
    const lv = st.levels[i] || 0;
    const mk = (st.marks && st.marks[i]) || '';
    const auto = st.textMode === 'auto';
    c.className = 'chip' + (auto ? '' : lv === -1 ? ' c-small' : lv === 1 ? ' c-bold' : lv === 2 ? ' c-hero' : '') + (mk.indexOf('b') >= 0 ? ' m-b' : '') + (mk.indexOf('u') >= 0 ? ' m-u' : '') + (chipSel.has(i) ? ' sel' : '');
    c.textContent = t.text;
    c.setAttribute('data-i', String(i));
    b.appendChild(c);
  });
}
function onText() {
  const v = $('txt').value;
  const old = tokens();
  st.text = v;
  const nt = tokens();
  st.marks = relevel(old, st.marks || [], nt).map(m => m || '');
  st.levels = relevel(old, st.levels, nt);
  chipSel = new Set();
  save(); renderBoard();
}
// palabras que toca la selección de la casilla
function wordsInSelection() {
  const t = $('txt');
  let a = 0, b = 0;
  try { a = t.selectionStart; b = t.selectionEnd; } catch (e) { return []; }
  if (a == null || b == null || a === b) return [];
  const v = st.text.replace(/\r\n?/g, '\n');
  const out = [];
  let i = 0, k = 0;
  const re = /[^ \t\n]+/g; let m;
  while ((m = re.exec(v))) { const s = m.index, e = s + m[0].length; if (e > a && s < b) out.push(k); k++; i = e; }
  void i;
  return out;
}
// negrita / subrayado (se suman a la importancia; también valen en autoencajar)
function applyMark(kind) {
  let idx = [...chipSel];
  if (!idx.length) idx = wordsInSelection();
  if (!idx.length) { status('Toca antes una o varias palabras (abajo) o selecciónalas en la casilla.', ''); return; }
  st.marks = st.marks || [];
  const has = idx.every(i => (st.marks[i] || '').indexOf(kind) >= 0);
  for (const i of idx) {
    let m = st.marks[i] || '';
    if (kind === '') m = '';
    else if (has) m = m.replace(kind, '');
    else if (m.indexOf(kind) < 0) m += kind;
    st.marks[i] = m;
  }
  for (let i = 0; i < st.marks.length; i++) if (st.marks[i] == null) st.marks[i] = '';
  chipSel = new Set();
  save(); renderBoard();
  status('', '');
}
function applyLevel(lv) {
  let idx = [...chipSel];
  if (!idx.length) idx = wordsInSelection();
  if (!idx.length) { status('Toca antes una o varias palabras (abajo) o selecciónalas en la casilla.', ''); return; }
  for (const i of idx) st.levels[i] = lv;
  chipSel = new Set();
  save(); renderBoard();
  status('', '');
}

// ------------------------------------------------------------------ contexto
let refreshTimer = null, lastShapeKey = null;
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refreshCtx, 220); }
async function refreshCtx() {
  if (busy) return;
  let doc = null;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  const ctxG = $('ctxGen'), ctxC = $('ctxCalc');
  if (!doc) { ctxG.textContent = ctxC.textContent = 'Abre un documento para empezar.'; ctxG.className = ctxC.className = 'ctx'; return; }
  if (st.tab === 'gen') {
    let t = null;
    try { t = await P.resolveShape(doc, Array.from(doc.activeLayers || [])); } catch (e) { t = null; }
    if (t) {
      const type = SH.typeFromName(t.shape.name);
      const label = type ? SH.SHAPES[type].label : 'tu forma «' + t.shape.name + '»';
      ctxG.textContent = t.group ? 'Seleccionado: ' + label + ' ya escrita. «Escribir» la rehace con los ajustes de ahora.' : 'Forma: ' + label + '. Muévela, gírala, voltéala o defórmala (Edición › Transformar › Deformar) y pulsa «Escribir».';
      ctxG.className = 'ctx on';
      // si esta forma ya se escribió, el panel recupera su texto
      const key = docKey(doc) + '|' + t.shape.id;
      if (key !== lastShapeKey) {
        lastShapeKey = key;
        const saved = store.get('shape|' + key, null);
        if (saved && saved.text != null) loadSaved(saved);
      }
    } else {
      lastShapeKey = null;
      ctxG.textContent = 'Elige una forma: aparece en el documento y la puedes mover, girar, voltear o deformar. «Selección» usa la selección que tengas hecha (lazo, marco…).';
      ctxG.className = 'ctx';
    }
  } else {
    let targets = [];
    try { targets = P.resolveTargets(doc, Array.from(doc.activeLayers || [])); } catch (e) { targets = []; }
    if (targets.length) { ctxC.textContent = targets.length + (targets.length === 1 ? ' capa de texto' : ' capas de texto') + ' para pasar a mano.'; ctxC.className = 'ctx on'; }
    else { ctxC.textContent = 'Selecciona en Capas las capas de texto que quieras pasar a mano (o un grupo que las contenga).'; ctxC.className = 'ctx'; }
  }
}
const SAVED_KEYS = ['text', 'levels', 'marks', 'persona', 'version', 'mode', 'textMode', 'tool', 'preset', 'color', 'colorMode', 'colorVar', 'legib'];
function loadSaved(saved) {
  for (const k of SAVED_KEYS) if (saved[k] != null) st[k] = Array.isArray(saved[k]) ? saved[k].slice() : saved[k];
  save(); syncControls();
}

// ------------------------------------------------------------------ GENERAR
function snippet(text, n) {
  const w = String(text || '').replace(/\s+/g, ' ').trim().split(' ').slice(0, n || 4).join(' ');
  return w.length > 34 ? w.slice(0, 33) + '…' : w;
}

async function doMakeShape(type) {
  await work('Creando la forma…', async () => {
    await P.runModal('A mano: forma', async (ctx, doc) => {
      const sel = await P.getSelectionBounds();
      let layer;
      if (type === 'lazo') {
        if (!sel) throw new P.UserError('Haz antes una selección en el documento (lazo, marco elíptico, varita…) y vuelve a pulsar «Selección».');
        layer = await P.withWorkPath(async () => {
          await P.selectionToWorkPath(2);
          try { await P.bp({ _obj: 'select', _target: [{ _ref: 'path', _property: 'workPath' }] }); } catch (e) { /* nada */ }
          const c = [224, 83, 61];
          await P.bp({ _obj: 'make', _target: [{ _ref: 'contentLayer' }], using: { _obj: 'contentLayer', type: { _obj: 'solidColorLayer', color: { _obj: 'RGBColor', red: c[0], grain: c[1], blue: c[2] } } } });
          try { await P.bp({ _obj: 'delete', _target: [{ _ref: 'path', _property: 'workPath' }] }); } catch (e) { /* nada */ }
          const l = Array.from(doc.activeLayers || [])[0];
          if (!l) throw new P.UserError('Photoshop no ha creado la forma.');
          l.name = SH.nameFor('lazo');
          try { l.opacity = 35; } catch (e) { /* nada */ }
          return l;
        });
        await P.deselect();
      } else {
        const box = SH.defaultBox(type, Number(doc.width), Number(doc.height), sel);
        const s = SH.makeShape(type, box);
        layer = await P.withWorkPath(() => P.makeShapeLayer(doc, s.anchors, SH.nameFor(type)));
        if (sel) await P.deselect();
      }
      try { await P.selectLayer(layer.id); } catch (e) { /* nada */ }
    });
    status('Forma creada. Colócala (Ctrl/Cmd+T: mover, girar, voltear; clic derecho › Deformar) y pulsa «Escribir en la forma».', 'ok');
  });
}

async function doWrite(fresh) {
  await work('Escribiendo…', async (t0) => {
    if (!st.text.trim()) throw new P.UserError('Escribe el texto en la casilla.');
    const gp = genParams();
    await P.runModal('A mano: escribir', async (ctx, doc) => {
      const target = await P.resolveShape(doc, Array.from(doc.activeLayers || []));
      if (!target) throw new P.UserError('Crea una forma arriba (o selecciona en Capas una capa de forma o su grupo «✍ A mano»).');
      const comps = await P.vectorMaskOf(doc, target.shape);
      if (!comps) throw new P.UserError('«' + target.shape.name + '» no tiene una forma vectorial que se pueda leer.');
      const shape = SH.readShape(comps, SH.typeFromName(target.shape.name));
      if (!shape) throw new P.UserError('No se ha podido leer la forma.');
      status('Colocando el texto…', '');
      const lay = LY.layoutInShape(st.text, st.levels, shape, gp);
      if (!lay || !lay.letters.length) throw new P.UserError('El texto no cabe en la forma. Prueba con una forma más grande o menos texto.');
      const key = docKey(doc) + '|' + target.shape.id;
      const seed = seedFor('g|' + key, fresh);
      gp.colorSeed = seed;
      const strokes = WR.plan(lay, gp, seed);
      const bb = WR.bounds(strokes);
      if (!bb) throw new P.UserError('No hay nada que escribir.');
      // lo escrito antes con esta forma se sustituye
      if (target.group) for (const l of Array.from(target.group.layers || [])) if (l.id !== target.shape.id && P.isHandCopy(l) && l.kind !== constants.LayerKind.GROUP) l.delete();
      try { await P.selectLayer(target.shape.id); } catch (e) { /* nada */ }
      status('Pintando…', '');
      const name = P.HAND_PREFIX + snippet(st.text);
      const layer = await P.putBands(doc, name, bb, c => WR.paint(c, strokes, gp), (k, n) => { if (n > 1) { try { ctx.reportProgress({ value: k / n, commandName: 'A mano' }); } catch (e) { /* nada */ } } });
      if (!layer) throw new P.UserError('No ha salido nada visible.');
      let group = target.group;
      if (!group) group = await doc.createLayerGroup({ name: P.GROUP_PREFIX + snippet(st.text), fromLayers: [target.shape] });
      else group.name = P.GROUP_PREFIX + snippet(st.text);
      layer.move(target.shape, constants.ElementPlacement.PLACEBEFORE);
      // tinta transparente: la capa multiplica (sobre un fondo de color se ve como tinta de verdad)
      if (INK.preset(st.tool, st.preset).blend === 'multiply') { try { layer.blendMode = constants.BlendMode.MULTIPLY; } catch (e) { /* nada */ } }
      // la forma se queda (para moverla o deformarla y volver a escribir), pero sin verse
      try { target.shape.opacity = 0; } catch (e) { /* nada */ }
      try { await P.selectLayer(group.id); } catch (e) { /* nada */ }
      const saved = {}; for (const k of SAVED_KEYS) saved[k] = st[k];
      store.set('shape|' + key, saved);
      lastShapeKey = key;
    });
    status('Escrito en ' + secs(t0) + '. Para cambiarlo: deforma la forma (está en el grupo, invisible) o cambia ajustes y vuelve a pulsar «Escribir».', 'ok');
  });
}

async function doToggleShape() {
  await work('…', async () => {
    let msg = '';
    await P.runModal('A mano: ver forma', async (ctx, doc) => {
      const t = await P.resolveShape(doc, Array.from(doc.activeLayers || []));
      if (!t) throw new P.UserError('Selecciona la forma o su grupo en Capas.');
      const now = Number(t.shape.opacity) || 0;
      t.shape.opacity = now > 1 ? 0 : 35;
      msg = now > 1 ? 'Forma oculta (sigue en el grupo).' : 'Forma visible.';
    });
    status(msg, 'ok');
  });
}

// ------------------------------------------------------------------ CALCAR
function padBox(b, m) { return { left: b.left - m, top: b.top - m, right: b.right + m, bottom: b.bottom + m }; }
const meets = (b, c) => b.right >= c.x0 && b.left <= c.x0 + c.w && b.bottom >= c.y0 && b.top <= c.y0 + c.h;
function progressFor(ctx, label) {
  return (k, n) => { if (n > 1) { try { ctx.reportProgress({ value: k / n, commandName: label }); } catch (e) { /* nada */ } } };
}
async function handImage(doc, ctx, insts, hp, seed, name, say) {
  if (!insts.length) throw new P.UserError('No hay letras que pasar a mano.');
  say('Pasando a mano…');
  const pv = HD.planVariation(insts, hp, seed);
  const boxes = insts.map(it => { const b = IN.docBounds([it]); return padBox(b, 0.45 * Math.max(b.right - b.left, b.bottom - b.top) + 3); });
  let all = boxes[0];
  for (const b of boxes) all = { left: Math.min(all.left, b.left), top: Math.min(all.top, b.top), right: Math.max(all.right, b.right), bottom: Math.max(all.bottom, b.bottom) };
  const layer = await P.putBands(doc, name, all, c => HD.renderHand(c, insts, hp, seed, i => meets(boxes[i], c), pv), progressFor(ctx, 'A mano'));
  if (!layer) throw new P.UserError('No ha salido nada visible.');
  return layer;
}
async function handText(doc, ctx, layer, hp, fresh, say) {
  const old = P.handCopyOf(doc, layer);
  if (old) old.delete();
  say('Leyendo «' + layer.name + '»…');
  const data = await P.withWorkPath(() => P.textLayerData(doc, layer));
  if (!data || !data.text.trim()) throw new P.UserError('«' + layer.name + '» está vacía.');
  const an = GL.analyzeTextOutlines(data.comps, data.text, data.charInfo);
  if (!an.glyphs.length) throw new P.UserError('«' + layer.name + '» no tiene letras que pasar a mano.');
  const insts = IN.fromTextLayer(an, data.text);
  const seed = seedFor('l|' + docKey(doc) + '|' + layer.id, fresh);
  const out = await handImage(doc, ctx, insts, hp, seed, P.HAND_PREFIX + layer.name.replace(/[\r\n]+/g, ' '), say);
  out.move(layer, constants.ElementPlacement.PLACEBEFORE);
  await P.copyLook(layer, out);
  if (!hp.fill && INK.preset(hp.tool, hp.preset).blend === 'multiply' && /normal/i.test(String(out.blendMode || 'normal'))) { try { out.blendMode = constants.BlendMode.MULTIPLY; } catch (e) { /* nada */ } }
  layer.visible = false;
  return out;
}
async function doHand(fresh) {
  await work('Pasando a mano…', async (t0) => {
    let n = 0;
    const hp = handParams();
    await P.runModal('A mano', async (ctx, doc) => {
      const targets = P.resolveTargets(doc, Array.from(doc.activeLayers || []));
      if (!targets.length) throw new P.UserError('Selecciona en Capas las capas de texto que quieras pasar a mano (o un grupo que las contenga).');
      const made = [];
      let i = 0;
      for (const layer of targets) {
        i++;
        const say = m => status((targets.length > 1 ? '[' + i + '/' + targets.length + '] ' : '') + m, '');
        if (st.kind === 'editable') made.push((await P.handEditable(doc, layer, hp, seedFor('e|' + layer.id, fresh))).id);
        else made.push((await handText(doc, ctx, layer, hp, fresh, say)).id);
        n++;
      }
      try { await P.selectLayers(made); } catch (e) { /* nada */ }
    });
    status('Listo: ' + n + (n === 1 ? ' capa' : ' capas') + ' en ' + secs(t0) + '. El original queda oculto debajo.', 'ok');
  });
}
async function doHandUndo() {
  await work('Volviendo al original…', async () => {
    let n = 0;
    await P.runModal('A mano: original', async (ctx, doc) => {
      const targets = P.resolveTargets(doc, Array.from(doc.activeLayers || []));
      if (!targets.length) throw new P.UserError('Selecciona las capas (o sus copias a mano) en el panel Capas.');
      for (const layer of targets) {
        const c = P.handCopyOf(doc, layer); if (c) c.delete();
        layer.visible = true;
        n++;
      }
      try { await P.selectLayers(targets.map(l => l.id)); } catch (e) { /* nada */ }
    });
    status('Restaurado: ' + n + (n === 1 ? ' capa.' : ' capas.'), 'ok');
  });
}

// ------------------------------------------------------------------ controles
function renderPresets() {
  const el = $('presetSeg'); if (!el) return;
  const T = INK.TOOLS[st.tool] || INK.TOOLS.rotulador;
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const k of Object.keys(T.presets)) {
    const d = document.createElement('div');
    d.className = 'segb'; d.setAttribute('data-v', k); d.textContent = T.presets[k].label;
    el.appendChild(d);
  }
  if (!T.presets[st.preset]) st.preset = Object.keys(T.presets)[0];
  segSet('presetSeg', st.preset);
}
function setTab(t) {
  st.tab = t; save();
  cls($('tab-gen'), 'active', t === 'gen'); cls($('tab-calc'), 'active', t === 'calc');
  show($('pane-gen'), t === 'gen'); show($('pane-gen2'), t === 'gen'); show($('pane-calc'), t === 'calc');
  show($('colorRow'), t === 'gen'); show($('fillRow'), t === 'calc');
  show($('btnUndo'), t === 'calc');
  show($('advGen'), t === 'gen'); show($('advCalc'), t === 'calc'); show($('followRow'), t === 'calc');
  $('numStyle').textContent = t === 'gen' ? '3' : '1';
  const go = $('btnGo'); if (go) go.textContent = t === 'gen' ? 'Escribir en la forma' : 'Aplicar a lo seleccionado';
  lastShapeKey = null;
  scheduleRefresh();
}
function setColor(hex) {
  st.color = hex; save();
  const sw = $('swColor'); if (sw) sw.style.backgroundColor = hex;
}
const SLIDERS = { slColorVar: 'colorVar', slLegib: 'legib', slGrosor: 'grosor', slTinta: 'tinta', slPulso: 'pulso', slRepasado: 'repasado', slLocura: 'locura', slPrisa: 'prisa', slTight: 'tight', slContraste: 'contraste', slInter: 'inter', slLlenar: 'llenar', slMargen: 'margen' };
function syncControls() {
  segSet('toolSeg', st.tool); renderPresets(); segSet('fillSeg', st.fill || ''); segSet('fontSeg', st.persona); segSet('caseSeg', st.mode);
  segSet('versionSeg', st.version); segSet('colorModeSeg', st.colorMode); show($('multiBox'), st.colorMode === 'letras'); segSet('textModeSeg', st.textMode); segSet('repasoSeg', st.repaso); syncText();
  segSet('alignSeg', st.align); segSet('kindSeg', st.kind); segSet('followSeg', st.follow);
  for (const [id, k] of Object.entries(SLIDERS)) { const el = $(id); if (el) el.value = st[k]; }
  const t = $('txt'); if (t && t.value !== st.text) t.value = st.text;
  setColor(st.color);
  renderBoard();
}
function syncText() {
  const auto = st.textMode === 'auto';
  show($('importBar'), !auto); show($('autoHint'), auto);
  renderBoard();
  const vh = $('versionHint'); if (vh) vh.textContent = (FN.styleOf(st.persona + '_' + st.version).hint) || '';
}
function showAdv(on) { show($('viewMain'), !on); show($('viewAdv'), on); }
function bind() {
  $('tab-gen').addEventListener('click', () => setTab('gen'));
  $('tab-calc').addEventListener('click', () => setTab('calc'));
  $('btnAdv').addEventListener('click', () => showAdv(true));
  $('btnBack').addEventListener('click', () => showAdv(false));
  $('btnReset').addEventListener('click', () => {
    for (const k of ['grosor', 'tinta', 'pulso', 'repasado', 'repaso', 'follow', 'locura', 'prisa', 'tight', 'contraste', 'inter', 'llenar', 'margen', 'align', 'kind']) st[k] = DEF[k];
    save(); syncControls(); status('Ajustes avanzados restablecidos.', 'ok');
  });
  segBind('toolSeg', v => { st.tool = v; st.preset = Object.keys(INK.TOOLS[v].presets)[0]; save(); segSet('toolSeg', v); renderPresets(); });
  segBind('presetSeg', v => { st.preset = v; save(); segSet('presetSeg', v); });
  segBind('fillSeg', v => { st.fill = v; save(); segSet('fillSeg', v); });
  segBind('colorModeSeg', v => { st.colorMode = v; save(); segSet('colorModeSeg', v); show($('multiBox'), v === 'letras'); });
  segBind('fontSeg', v => { st.persona = v; save(); segSet('fontSeg', v); syncText(); });
  segBind('versionSeg', v => { st.version = v; save(); segSet('versionSeg', v); syncText(); });
  segBind('textModeSeg', v => { st.textMode = v; save(); segSet('textModeSeg', v); syncText(); });
  segBind('repasoSeg', v => { st.repaso = v; save(); segSet('repasoSeg', v); });
  segBind('caseSeg', v => { st.mode = v; save(); segSet('caseSeg', v); });
  segBind('alignSeg', v => { st.align = v; save(); segSet('alignSeg', v); });
  segBind('kindSeg', v => { st.kind = v; save(); segSet('kindSeg', v); });
  segBind('followSeg', v => { st.follow = v; save(); segSet('followSeg', v); });
  for (const [id, k] of Object.entries(SLIDERS)) {
    const el = $(id); if (!el) continue;
    const h = () => { const v = Number(el.value); if (!isNaN(v)) { st[k] = v; save(); } };
    el.addEventListener('input', h); el.addEventListener('change', h);
  }
  // formas
  $('shapeGrid').addEventListener('click', ev => {
    let t = ev.target;
    while (t && t.classList && !t.classList.contains('shp')) t = t.parentNode;
    if (t && t.getAttribute) doMakeShape(t.getAttribute('data-v'));
  });
  $('btnToggleShape').addEventListener('click', doToggleShape);
  // texto
  $('txt').addEventListener('input', onText);
  $('board').addEventListener('click', ev => {
    const i = ev.target && ev.target.getAttribute ? ev.target.getAttribute('data-i') : null;
    if (i == null) return;
    const k = Number(i);
    if (chipSel.has(k)) chipSel.delete(k); else chipSel.add(k);
    renderBoard();
  });
  $('stSmall').addEventListener('click', () => applyLevel(-1));
  $('stNormal').addEventListener('click', () => applyLevel(0));
  $('stBold').addEventListener('click', () => applyLevel(1));
  $('stHero').addEventListener('click', () => applyLevel(2));
  $('stNeg').addEventListener('click', () => applyMark('b'));
  $('stSub').addEventListener('click', () => applyMark('u'));
  $('stClean').addEventListener('click', () => applyMark(''));
  // color
  $('swColor').addEventListener('click', () => {
    try { const fg = app.foregroundColor; const hx = fg && fg.rgb && fg.rgb.hexValue; if (hx) { setColor('#' + String(hx).replace('#', '').toLowerCase()); status('Color tomado del color frontal.', 'ok'); } }
    catch (e) { status('No se ha podido leer el color frontal.', 'err'); }
  });
  // acciones
  $('btnGo').addEventListener('click', () => (st.tab === 'gen' ? doWrite(false) : doHand(false)));
  $('btnNew').addEventListener('click', () => (st.tab === 'gen' ? doWrite(true) : doHand(true)));
  $('btnUndo').addEventListener('click', doHandUndo);
  for (const ev of ['mouseenter', 'focus']) { try { document.body.addEventListener(ev, scheduleRefresh); } catch (e) { /* nada */ } }
  try { action.addNotificationListener(['select', 'set', 'make', 'delete', 'selectNoLayers', 'open', 'close', 'historyStateChanged', 'transform'], () => scheduleRefresh()); } catch (e) { /* se refresca al pasar el ratón */ }
}

function init() { bind(); syncControls(); setTab(st.tab === 'calc' ? 'calc' : 'gen'); }

try {
  const { entrypoints } = require('uxp');
  entrypoints.setup({ panels: { amanoPanel: { show() { scheduleRefresh(); } } } });
} catch (e) { /* el panel funciona igual */ }

init();

module.exports = { _test: { st, doHand, doHandUndo, doWrite, doMakeShape, refreshCtx, setTab, genParams } };
