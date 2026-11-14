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
const NG = require('./negativo.js');
const GEO = require('./geom.js');
const FN = require('./fonts.js');
// (los grumos de pintura del graffiti: se entregan al dibujo una vez)
const RDm = require('./render.js');
RDm.setLumps(require('./grumosdata.js'));
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
  contraste: 50, inter: 100, llenar: 30, margen: 5, align: 'center', kind: 'imagen', colorMode: 'uno', colorVar: 45, tupido: 60, goteo: 45, nube: 50, relieve: 50, deriva: 40, gsub: 'a',
  text: 'Nadie había cerrado\nla puerta del sótano', levels: [0, 2, 1, 0, 0, -1, 0], marks: []
};
const st = Object.assign({}, DEF, store.get('settings2', {}));
if (st.persona === 'rabiosa') st.persona = 'nerviosa';
if (st.tool === 'carbon' && st.preset === 'cera') { st.tool = 'cera'; st.preset = 'cera'; }
if (st.tool === 'negativo') { st.tool = 'lapiz'; st.preset = 'blando'; }
if (!/^[ab]$/.test(st.version)) st.version = 'a';
if (!FN.STYLES['graffiti_' + st.gsub]) st.gsub = 'a';
// estilo de letra en uso: las cuatro manos tienen versión A/B; el graffiti, sus firmas (una sola caja)
// GRAFFITI es una técnica propia: se elige en la fila de técnicas y trae sus puntas y sus firmas (no se mezcla con
// lápiz, boli, cera... ni con las cuatro letras de mano)
if (st.persona === 'graffiti') { st.persona = 'adulta'; st.tool = 'spray'; }
function isGraf() { return st.tool === 'spray'; }
function styleKey() { return isGraf() ? 'graffiti_' + st.gsub : st.persona + '_' + st.version; }
function curMode() { return FN.styleOf(styleKey()).gmode || st.mode; }
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
  finally { setBusy(false); scheduleRefresh(); if (livePending) { livePending = false; live(60); } }
}
// EN VIVO: cualquier cambio del panel se aplica solo (al soltar el ratón; al dejar de teclear), sin pulsar el
// botón. En «Generar», si hay una forma seleccionada y texto; en «Calcar», solo si lo seleccionado ya está pasado
// a mano (no convierte capas por su cuenta). Si pilla a Photoshop pintando, espera y aplica lo último.
let liveTimer = null, livePending = false;
function live(ms) { clearTimeout(liveTimer); liveTimer = setTimeout(runLive, ms == null ? 150 : ms); }
async function runLive() {
  if (busy) { livePending = true; return; }
  try {
    const doc = app.activeDocument; if (!doc) return;
    const sel = Array.from(doc.activeLayers || []);
    if (st.tab === 'gen') { if (!st.text.trim() || !(await resolveGen(doc, sel))) return; await doWrite(false); }
    else { if (!sel.some(P.isHandCopy)) return; await doHand(false); }
  } catch (e) { /* sin documento o sin destino: nada que aplicar */ }
}
const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
const docKey = doc => String((doc && (doc.title || doc.id)) || '');

// ------------------------------------------------------------------ parámetros
function chaos() { return Math.max(0, 1 - st.legib / 100); }
// relieve de la pintura (solo graffiti): 0..1; con él, las franjas se pintan con margen (RELIEF_M) para que casen
function relieve() { return isGraf() ? Math.max(0, Math.min(1, (st.relieve == null ? 50 : st.relieve) / 100)) : 0; }
const RELIEF_M = 48;
function genParams() {
  return {
    persona: styleKey(), mode: curMode(), goteo: st.goteo / 100, nube: st.nube / 100, relieve: relieve(), deriva: (st.deriva == null ? 40 : st.deriva) / 100, tool: st.tool, preset: st.preset, color: st.color,
    colorVar: st.colorMode === 'letras' ? Math.max(0.02, st.colorVar / 100) : 0, tupido: st.tupido / 100,
    auto: st.textMode === 'auto', repaso: st.repaso, marks: st.marks || [],
    legib: st.legib / 100, locura: st.locura / 50, pulso: st.pulso / 100, prisa: st.prisa / 100,
    width: Math.pow(2, st.grosor / 50), repasado: st.repasado / 50, tinta: st.tinta / 100,
    contrast: st.contraste / 50, leading: st.inter / 100, align: st.align, stretch: 1 + st.llenar / 100,
    xFill: st.llenar / 150, margin: st.margen / 100, track: st.tight / 50 * 0.07,
    // (el grosor de la técnica pide su aire entre letras; el reparto en líneas no depende de él: layout.canon)
    inkPad: INK.preset(st.tool, st.preset).w * (INK.preset(st.tool, st.preset).padK || 1) * (curMode() === 'cursiva' && FN.styleOf(styleKey()).weightS || FN.styleOf(styleKey()).weight) * Math.pow(2, st.grosor / 50)
  };
}
function handParams() {
  // la legibilidad manda; «locura» la escala (50 = normal)
  const loc = Math.min(1.4, chaos() * 1.8 * (st.locura / 50));
  return { goteo: st.goteo / 100, nube: st.nube / 100, relieve: relieve(), tupido: st.tupido / 100, colorVar: st.colorMode === 'letras' ? Math.max(0.02, st.colorVar / 100) : 0, tool: st.tool, preset: st.preset, fill: st.fill || '', follow: st.follow, repaso: st.repaso, width: Math.pow(2, st.grosor / 50), locura: loc, pulso: st.pulso / 100, prisa: st.prisa / 100, tight: st.tight / 150, ink: st.tinta / 100 };
}

// ------------------------------------------------------------------ segmentados
function segSet(id, v) {
  const el = $(id); if (!el) return;
  for (const b of Array.from(el.querySelectorAll('.segb'))) cls(b, 'on', b.getAttribute('data-v') === v);
}
function segBind(id, fn) {
  const el = $(id); if (!el) return;
  el.addEventListener('click', ev => {
    live(150);
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
// el deslizador de «tupido» solo se ve si hay algún negativo (palabra marcada o relleno Negativo en CALCAR)
function syncNeg() {
  const on = st.tab === 'calc' ? st.fill === 'negativo' : (st.marks || []).some(m => m && m.indexOf('n') >= 0);
  show($('negBox'), on);
}
function renderBoard() {
  syncNeg();
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
    c.className = 'chip' + (auto ? '' : lv === -1 ? ' c-small' : lv === 1 ? ' c-bold' : lv === 2 ? ' c-hero' : '') + (mk.indexOf('b') >= 0 ? ' m-b' : '') + (mk.indexOf('u') >= 0 ? ' m-u' : '') + (mk.indexOf('n') >= 0 ? ' m-n' : '') + (chipSel.has(i) ? ' sel' : '');
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
  save(); renderBoard(); live(900);
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
  save(); renderBoard(); live(150);
  status('', '');
}
function applyLevel(lv) {
  let idx = [...chipSel];
  if (!idx.length) idx = wordsInSelection();
  if (!idx.length) { status('Toca antes una o varias palabras (abajo) o selecciónalas en la casilla.', ''); return; }
  for (const i of idx) st.levels[i] = lv;
  chipSel = new Set();
  save(); renderBoard(); live(150);
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
    try { t = await resolveGen(doc, Array.from(doc.activeLayers || [])); } catch (e) { t = null; }
    if (t) {
      if (t.img) ctxG.textContent = 'Texto ya escrito: cualquier cambio lo rehace.';
      else {
        const type = SH.typeFromName(t.shape.name);
        const label = type ? SH.SHAPES[type].label : 'tu forma «' + t.shape.name + '»';
        ctxG.textContent = t.group ? 'Seleccionado: ' + label + ' ya escrita. «Escribir» la rehace con los ajustes de ahora.' : 'Forma: ' + label + '. Colócala o defórmala y escribe.';
      }
      ctxG.className = 'ctx on';
      // si esto ya se escribió, el panel recupera su texto
      const key = t.key;
      if (key !== lastShapeKey) {
        lastShapeKey = key;
        const saved = store.get('shape|' + key, null);
        if (saved && saved.text != null) loadSaved(saved);
      }
    } else {
      lastShapeKey = null;
      ctxG.textContent = 'Elige una forma para empezar.';
      ctxG.className = 'ctx';
    }
  } else {
    let targets = [];
    try { targets = P.resolveTargets(doc, Array.from(doc.activeLayers || [])); } catch (e) { targets = []; }
    if (targets.length) { ctxC.textContent = targets.length + (targets.length === 1 ? ' capa de texto' : ' capas de texto') + ' para pasar a mano.'; ctxC.className = 'ctx on'; }
    else { ctxC.textContent = 'Selecciona en Capas las capas de texto que quieras pasar a mano (o un grupo que las contenga).'; ctxC.className = 'ctx'; }
  }
}
const SAVED_KEYS = ['text', 'levels', 'marks', 'tupido', 'persona', 'version', 'mode', 'textMode', 'tool', 'preset', 'color', 'colorMode', 'colorVar', 'legib', 'gsub', 'goteo', 'nube', 'relieve', 'deriva'];
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

// DESTINO DE «GENERAR». Lo que queda en el documento es solo la imagen del texto (una capa «✍ …»): ni grupo ni
// forma. La forma con que se escribió se guarda en los ajustes del plugin, ligada a esa capa; al seleccionarla,
// se puede reescribir (ajustes nuevos, otra variación) y, si la imagen se ha movido, la forma va con ella.
// También vale una capa de forma sin escribir todavía, o un grupo «✍ A mano» de versiones anteriores.
async function resolveGen(doc, sel) {
  for (const l of sel) {
    if (!P.isHandCopy(l)) continue;
    const m = store.get('img|' + docKey(doc) + '|' + l.id, null);
    if (!m || !m.comps) continue;
    let dx = 0, dy = 0;
    try { const b = l.bounds; dx = Number(b.left) - m.b[0]; dy = Number(b.top) - m.b[1]; } catch (e) { dx = dy = 0; }
    const mv = q => [q[0] + dx, q[1] + dy];
    const comps = Math.abs(dx) + Math.abs(dy) < 0.5 || !isFinite(dx + dy) ? m.comps : m.comps.map(c => ({ op: c.op, subpaths: c.subpaths.map(sp => ({ closed: sp.closed, pts: sp.pts.map(q => ({ a: mv(q.a), f: mv(q.f), b: mv(q.b), smooth: q.smooth })) })) }));
    return { img: l, comps, type: m.type, seed: m.seed, key: docKey(doc) + '|' + l.id };
  }
  const t = await P.resolveShape(doc, sel);
  return t ? Object.assign(t, { key: docKey(doc) + '|' + t.shape.id }) : null;
}
async function doWrite(fresh) {
  await work('Escribiendo…', async (t0) => {
    if (!st.text.trim()) throw new P.UserError('Escribe el texto en la casilla.');
    const gp = genParams();
    await P.runModal('A mano: escribir', async (ctx, doc) => {
      const target = await resolveGen(doc, Array.from(doc.activeLayers || []));
      if (!target) throw new P.UserError('Crea una forma arriba (o selecciona en Capas una forma o un texto ya escrito «✍»).');
      const comps = target.img ? target.comps : await P.vectorMaskOf(doc, target.shape);
      if (!comps) throw new P.UserError('«' + target.shape.name + '» no tiene una forma vectorial que se pueda leer.');
      const shType = target.img ? target.type : SH.typeFromName(target.shape.name);
      const shape = SH.readShape(comps, shType);
      if (!shape) throw new P.UserError('No se ha podido leer la forma.');
      status('Colocando el texto…', '');
      const lay = LY.layoutInShape(st.text, st.levels, shape, gp);
      if (!lay || !lay.letters.length) throw new P.UserError('El texto no cabe en la forma. Prueba con una forma más grande o menos texto.');
      let key = target.key;
      const seed = fresh ? R.newSeed() : target.seed != null ? target.seed : seedFor('g|' + key, false);
      gp.colorSeed = seed;
      // negativos: se pinta alrededor de las letras (las letras quedan libres)
      const strokes = WR.plan(lay, gp, seed);
      const bb = WR.bounds(strokes);
      if (!bb) throw new P.UserError('No hay nada que escribir.');
      // lo escrito antes con esta forma se sustituye
      if (target.group) for (const l of Array.from(target.group.layers || [])) if (l.id !== target.shape.id && P.isHandCopy(l) && l.kind !== constants.LayerKind.GROUP) l.delete();
      try { await P.selectLayer(target.img ? target.img.id : target.shape.id); } catch (e) { /* nada */ }
      status('Pintando…', '');
      const name = P.HAND_PREFIX + snippet(st.text);
      const layer = await P.putBands(doc, name, bb, c => WR.paint(c, strokes, gp), (k, n) => { if (n > 1) { try { ctx.reportProgress({ value: k / n, commandName: 'A mano' }); } catch (e) { /* nada */ } } }, gp.relieve > 0 ? RELIEF_M : 0);
      if (!layer) throw new P.UserError('No ha salido nada visible.');
      const multiply = INK.preset(st.tool, st.preset).blend === 'multiply';
      // tinta transparente: la capa multiplica (sobre un fondo de color se ve como tinta de verdad)
      if (multiply) { try { layer.blendMode = constants.BlendMode.MULTIPLY; } catch (e) { /* nada */ } }
      if (target.group) {
        // (documentos de versiones anteriores: el grupo con su forma invisible se respeta)
        target.group.name = P.GROUP_PREFIX + snippet(st.text);
        layer.move(target.shape, constants.ElementPlacement.PLACEBEFORE);
        try { target.shape.opacity = 0; } catch (e) { /* nada */ }
        try { await P.selectLayer(target.group.id); } catch (e) { /* nada */ }
      } else {
        // solo la imagen: ocupa el sitio de la forma (o de la imagen anterior), que se quita
        const old = target.img || target.shape;
        try { layer.move(old, constants.ElementPlacement.PLACEBEFORE); } catch (e) { /* nada */ }
        if (target.img) { try { layer.opacity = old.opacity; if (!multiply) layer.blendMode = old.blendMode; } catch (e) { /* nada */ } }
        try { old.delete(); } catch (e) { /* nada */ }
        store.set('img|' + key, null);
        key = docKey(doc) + '|' + layer.id;
        let lb = [0, 0]; try { const q = layer.bounds; lb = [Number(q.left), Number(q.top)]; } catch (e) { /* nada */ }
        store.set('img|' + key, { comps, type: shType || null, seed, b: lb });
        try { await P.selectLayer(layer.id); } catch (e) { /* nada */ }
      }
      const saved = {}; for (const k of SAVED_KEYS) saved[k] = st[k];
      store.set('shape|' + key, saved);
      lastShapeKey = key;
    });
    status('Escrito en ' + secs(t0) + '. Con la capa seleccionada, cualquier cambio del panel la rehace.', 'ok');
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
  if (hp.fill === 'negativo') {
    // negativo: la caja de cada línea pintada alrededor de las letras de la fuente
    const neg = NG.fromInstances(HD, GEO, insts, hp, seed);
    const bb = WR.bounds(neg.strokes);
    if (!bb) throw new P.UserError('No ha salido nada visible.');
    const gp = { color: insts[0].color, tinta: hp.ink, colorVar: hp.colorVar, colorSeed: seed, tool: hp.tool, relieve: hp.relieve };
    const layerN = await P.putBands(doc, name, bb, c => WR.paint(c, neg.strokes, gp), progressFor(ctx, 'A mano'), hp.relieve > 0 ? RELIEF_M : 0);
    if (!layerN) throw new P.UserError('No ha salido nada visible.');
    return layerN;
  }
  const pv = HD.planVariation(insts, hp, seed);
  const boxes = insts.map(it => { const b = IN.docBounds([it]); return padBox(b, 0.45 * Math.max(b.right - b.left, b.bottom - b.top) + 3); });
  let all = boxes[0];
  for (const b of boxes) all = { left: Math.min(all.left, b.left), top: Math.min(all.top, b.top), right: Math.max(all.right, b.right), bottom: Math.max(all.bottom, b.bottom) };
  let relS = 0;      // (textura: el ancho de referencia lo fija la primera franja que pinta y vale para las demás)
  const layer = await P.putBands(doc, name, all, c => { if (hp.relieve > 0) c.relief = { amount: hp.relieve, size: relS }; const r = HD.renderHand(c, insts, hp, seed, i => meets(boxes[i], c), pv); if (c.relief && !relS) relS = c.relief.size; return r; }, progressFor(ctx, 'A mano'), hp.relieve > 0 ? RELIEF_M : 0);
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
  if ((!hp.fill || hp.fill === 'negativo') && INK.preset(hp.tool, hp.preset).blend === 'multiply' && /normal/i.test(String(out.blendMode || 'normal'))) { try { out.blendMode = constants.BlendMode.MULTIPLY; } catch (e) { /* nada */ } }
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
  syncNeg();
  syncGraf();
  syncPar();
  scheduleRefresh();
}
function setColor(hex) {
  st.color = hex; save();
  const sw = $('swColor');
  if (sw) {
    sw.style.backgroundColor = hex;
    // (el código se lee sobre cualquier color: letra clara u oscura según lo que haya debajo)
    const c = RDm.hexToRgb(hex), dark = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 140;
    sw.style.color = dark ? '#ffffff' : '#1d1d1f';
    const hx = $('swHex'); if (hx) hx.textContent = String(hex).toUpperCase();
  }
  syncPalette();
}
const SLIDERS = { slGoteo: 'goteo', slNube: 'nube', slRelieve: 'relieve', slDeriva: 'deriva', slTupido: 'tupido', slColorVar: 'colorVar', slLegib: 'legib', slGrosor: 'grosor', slTinta: 'tinta', slPulso: 'pulso', slRepasado: 'repasado', slLocura: 'locura', slPrisa: 'prisa', slTight: 'tight', slContraste: 'contraste', slInter: 'inter', slLlenar: 'llenar', slMargen: 'margen' };
// graffiti: la interfaz cambia. En vez de A/B y de MAYÚSCULAS/minúsculas/cursiva salen sus firmas; el panel se
// pone de amarillo; aparecen el goteo, la nube y el relieve; y se esconde lo que con un bote no pinta nada: la tinta
// (carga, sequedad), el modo de repasado y, al calcar, el relleno de brocha o sello y el grosor «de la letra»
function syncGraf() {
  const g = isGraf();
  show($('fontSeg'), !g); show($('versionRow'), !g); show($('caseSeg'), !g); show($('grafSeg'), g); show($('grafHint'), g);
  show($('sprayBox'), g);
  show($('slTinta'), !g); show($('repasoBox'), !g);
  show($('fillRow'), st.tab === 'calc' && !g); show($('followRow'), st.tab === 'calc' && !g);
  // (la tela se bebe la pintura y el tóner es mate: ahí no hay relieve que valga)
  { const pr = INK.preset(st.tool, st.preset); show($('slRelieve'), g && !pr.matte); }
  const el = $('grafSeg');
  if (el && !el.firstChild) {
    for (const k of Object.keys(FN.STYLES)) {
      if (k.indexOf('graffiti_') !== 0) continue;
      const d = document.createElement('div');
      d.className = 'segb'; d.setAttribute('data-v', k.slice(9)); d.textContent = FN.STYLES[k].sub || k;
      el.appendChild(d);
    }
  }
  segSet('grafSeg', st.gsub);
  const gh = $('grafHint'); if (gh) gh.textContent = g ? (FN.styleOf(styleKey()).hint || '') : '';
  const b = document.body;
  if (b && b.classList) { if (g) b.classList.add('graf'); else b.classList.remove('graf'); }
}
// la paleta: cómo saldrán los colores cuando cada letra va de uno (muestras grandes, las de verdad)
function syncPalette() {
  const el = $('colorStrip'); if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  const base = RDm.hexToRgb(st.color), cv = Math.max(0.02, st.colorVar / 100);
  for (let i = 0; i < 9; i++) {
    const c = RDm.letterColor(base, i * 7 + 1, cv, 1), d = document.createElement('div');
    d.style.backgroundColor = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
    el.appendChild(d);
  }
}
// destacar palabras (plegable)
function syncLvl() { show($('lvlFold'), !!st.lvlOpen); const a = $('lvlArrow'); if (a) a.textContent = st.lvlOpen ? '▾' : '▸'; }
// párrafo (plegable): al cerrarlo, la cabecera resume cómo está
function syncPar() {
  const open = !!st.parOpen, al = { left: 'izquierda', center: 'centro', right: 'derecha', justify: 'llenar líneas' }[st.align] || '';
  show($('parBox'), open);
  { const g = st.tab === 'gen'; show($('alignSeg'), g); show($('slInter'), g); show($('slMargen'), g); }      // (al calcar manda la capa de texto: solo vale el espacio entre letras)
  const a = $('parArrow'); if (a) a.textContent = open ? '▾' : '▸';
  const sm = $('parSum'); if (sm) sm.textContent = open ? '' : (st.tab === 'gen' ? '· ' + al + ' · interlineado ' + st.inter : '') + ' · letras ' + (st.tight > 0 ? '+' : '') + st.tight;
}
function syncControls() {
  syncPar(); syncLvl();
  segSet('toolSeg', st.tool); renderPresets(); segSet('fillSeg', st.fill || ''); segSet('fontSeg', st.persona); segSet('caseSeg', st.mode);
  segSet('versionSeg', st.version); segSet('colorModeSeg', st.colorMode); show($('multiBox'), st.colorMode === 'letras'); segSet('textModeSeg', st.textMode); segSet('repasoSeg', st.repaso); syncText();
  segSet('alignSeg', st.align); segSet('kindSeg', st.kind); segSet('followSeg', st.follow);
  for (const [id, k] of Object.entries(SLIDERS)) { const el = $(id); if (el) el.value = st[k]; }
  const t = $('txt'); if (t && t.value !== st.text) t.value = st.text;
  setColor(st.color);
  syncGraf();
  renderBoard();
}
function syncText() {
  const auto = st.textMode === 'auto';
  show($('importBar'), !auto); show($('autoHint'), auto);
  renderBoard();
  const vh = $('versionHint'); if (vh) vh.textContent = (FN.styleOf(styleKey()).hint) || '';
}
function showAdv(on) { show($('viewMain'), !on); show($('viewAdv'), on); }
function bind() {
  $('tab-gen').addEventListener('click', () => setTab('gen'));
  $('tab-calc').addEventListener('click', () => setTab('calc'));
  $('btnAdv').addEventListener('click', () => showAdv(true));
  $('btnBack').addEventListener('click', () => showAdv(false));
  $('btnReset').addEventListener('click', () => {
    for (const k of ['grosor', 'tinta', 'pulso', 'repasado', 'repaso', 'follow', 'locura', 'prisa', 'tight', 'contraste', 'inter', 'llenar', 'margen', 'align', 'kind']) st[k] = DEF[k];
    save(); syncControls(); status('Ajustes avanzados restablecidos.', 'ok'); live(150);
  });
  segBind('toolSeg', v => { st.tool = v; st.preset = v === 'spray' ? (FN.styleOf('graffiti_' + st.gsub).pre || 'gordo') : Object.keys(INK.TOOLS[v].presets)[0]; save(); segSet('toolSeg', v); renderPresets(); syncGraf(); syncText(); });
  segBind('presetSeg', v => { st.preset = v; save(); segSet('presetSeg', v); syncGraf(); });
  segBind('fillSeg', v => { st.fill = v; save(); segSet('fillSeg', v); syncNeg(); });
  segBind('colorModeSeg', v => { st.colorMode = v; save(); segSet('colorModeSeg', v); show($('multiBox'), v === 'letras'); });
  segBind('fontSeg', v => { st.persona = v; save(); segSet('fontSeg', v); syncText(); });
  // (cada firma trae su punta: la del Tag es plana, la Bomba va a bote gordo...; luego se puede cambiar)
  segBind('grafSeg', v => { st.gsub = v; if (st.tool === 'spray') { st.preset = FN.styleOf('graffiti_' + v).pre || st.preset; renderPresets(); } save(); syncGraf(); });
  segBind('versionSeg', v => { st.version = v; save(); segSet('versionSeg', v); syncText(); });
  segBind('textModeSeg', v => { st.textMode = v; save(); segSet('textModeSeg', v); syncText(); });
  segBind('repasoSeg', v => { st.repaso = v; save(); segSet('repasoSeg', v); });
  segBind('caseSeg', v => { st.mode = v; save(); segSet('caseSeg', v); });
  segBind('alignSeg', v => { st.align = v; save(); segSet('alignSeg', v); });
  $('parHead').addEventListener('click', () => { st.parOpen = !st.parOpen; save(); syncPar(); });
  $('lvlHead').addEventListener('click', () => { st.lvlOpen = !st.lvlOpen; save(); syncLvl(); });
  segBind('kindSeg', v => { st.kind = v; save(); segSet('kindSeg', v); });
  segBind('followSeg', v => { st.follow = v; save(); segSet('followSeg', v); });
  for (const [id, k] of Object.entries(SLIDERS)) {
    const el = $(id); if (!el) continue;
    const h = () => { const v = Number(el.value); if (!isNaN(v)) { st[k] = v; save(); } };
    el.addEventListener('input', () => { h(); live(900); }); el.addEventListener('change', () => { h(); if (k === 'colorVar') syncPalette(); live(80); });
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
  $('stNegv').addEventListener('click', () => applyMark('n'));
  $('stClean').addEventListener('click', () => applyMark(''));
  // color
  $('swColor').addEventListener('click', () => {
    live(150);
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
