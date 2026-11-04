'use strict';
// Panel de A mano: pinta encima de cada letra de tus capas de texto, como la haría una persona.

const P = require('./ps.js');
const GL = require('./glyphs.js');
const R = require('./rng.js');
const HD = require('./hand.js');
const IN = require('./instances.js');
const { app, action, constants } = require('photoshop');

const $ = id => document.getElementById(id);
const show = (el, on) => { if (el) { if (on) el.classList.remove('hidden'); else el.classList.add('hidden'); } };
const cls = (el, name, on) => { if (el) { if (on) el.classList.add(name); else el.classList.remove(name); } };

// ------------------------------------------------------------------ guardado
const store = {
  get(k, d) { try { const v = localStorage.getItem('amano.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('amano.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const DEF = { tool: 'rotulador', width: 'auto', kind: 'imagen', locura: 55, pulso: 45, prisa: 20, tight: 0, tinta: 55 };
const st = Object.assign({}, DEF, store.get('settings', {}));
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('settings', st), 250); }

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
  for (const id of ['btnHand', 'btnHandNew', 'btnHandUndo']) {
    const b = $(id); if (!b) continue;
    if (on) b.setAttribute('disabled', ''); else b.removeAttribute('disabled');
  }
}
function friendlyError(e) {
  const m = String((e && e.message) || e);
  if (/modal|busy|ocupad/i.test(m)) return 'Photoshop está ocupado (¿hay una herramienta en uso o un diálogo abierto?). Pulsa Intro o Esc y vuelve a probar.';
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

function handParams() {
  return { tool: st.tool, width: st.width, locura: st.locura / 100, pulso: st.pulso / 100, prisa: st.prisa / 100, tight: st.tight / 150, ink: st.tinta / 100 };
}

// ------------------------------------------------------------------ segmentados
function segSet(id, v) {
  const el = $(id); if (!el) return;
  for (const b of Array.from(el.querySelectorAll('.segb'))) cls(b, 'on', b.getAttribute('data-v') === v);
}
function segBind(id, fn) {
  const el = $(id);
  for (const b of Array.from(el.querySelectorAll('.segb'))) b.addEventListener('click', () => fn(b.getAttribute('data-v')));
}

// ------------------------------------------------------------------ contexto
let refreshTimer = null;
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refreshCtx, 220); }
async function refreshCtx() {
  if (busy) return;
  const ctx = $('ctx');
  let doc = null;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { ctx.textContent = 'Abre un documento para empezar.'; ctx.className = 'ctx'; return; }
  let targets = [];
  try { targets = P.resolveTargets(doc, Array.from(doc.activeLayers || [])); } catch (e) { targets = []; }
  if (targets.length) {
    ctx.textContent = targets.length + (targets.length === 1 ? ' capa de texto' : ' capas de texto') + ' para pasar a mano.';
    ctx.className = 'ctx on';
  } else {
    ctx.textContent = 'Selecciona en Capas las capas de texto que quieras pasar a mano (o un grupo que las contenga).';
    ctx.className = 'ctx';
  }
}

// ------------------------------------------------------------------ pintar
function padBox(b, m) { return { left: b.left - m, top: b.top - m, right: b.right + m, bottom: b.bottom + m }; }
const meets = (b, c) => b.right >= c.x0 && b.left <= c.x0 + c.w && b.bottom >= c.y0 && b.top <= c.y0 + c.h;
function progressFor(ctx, label) {
  return (k, n) => { if (n > 1) { try { ctx.reportProgress({ value: k / n, commandName: label }); } catch (e) { /* nada */ } } };
}

// letras a mano -> capa de imagen (por franjas, sin cambiar la variación entre franjas)
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
  const seed = seedFor('l|' + (doc.title || doc.id) + '|' + layer.id, fresh);
  const out = await handImage(doc, ctx, insts, hp, seed, P.HAND_PREFIX + layer.name, say);
  out.move(layer, constants.ElementPlacement.PLACEBEFORE);
  await P.copyLook(layer, out);
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
function setTool(v) {
  st.tool = v; save();
  segSet('toolSeg', v); segSet('toolSeg2', v);
  show($('widthBox'), (HD.TOOLS[v] || {}).kind !== 'fill');
}
function syncControls() {
  segSet('toolSeg', st.tool); segSet('toolSeg2', st.tool); segSet('kindSeg', st.kind); segSet('widthSeg', st.width);
  show($('widthBox'), (HD.TOOLS[st.tool] || {}).kind !== 'fill');
  const sv = (id, v) => { const el = $(id); if (el) el.value = v; };
  sv('slLocura', st.locura); sv('slPulso', st.pulso); sv('slPrisa', st.prisa); sv('slTight', st.tight); sv('slTinta', st.tinta);
}
function bind() {
  segBind('toolSeg', setTool);
  segBind('toolSeg2', setTool);
  segBind('widthSeg', v => { st.width = v; save(); segSet('widthSeg', v); });
  segBind('kindSeg', v => { st.kind = v; save(); segSet('kindSeg', v); });
  const slider = (id, set) => { const el = $(id); const h = () => { const v = Number(el.value); if (!isNaN(v)) { set(v); save(); } }; el.addEventListener('input', h); el.addEventListener('change', h); };
  slider('slLocura', v => { st.locura = v; }); slider('slPulso', v => { st.pulso = v; }); slider('slPrisa', v => { st.prisa = v; });
  slider('slTight', v => { st.tight = v; }); slider('slTinta', v => { st.tinta = v; });
  $('btnHand').addEventListener('click', () => doHand(false));
  $('btnHandNew').addEventListener('click', () => doHand(true));
  $('btnHandUndo').addEventListener('click', doHandUndo);
  for (const ev of ['mouseenter', 'focus']) { try { document.body.addEventListener(ev, scheduleRefresh); } catch (e) { /* nada */ } }
  try { action.addNotificationListener(['select', 'set', 'make', 'delete', 'selectNoLayers', 'open', 'close', 'historyStateChanged'], () => scheduleRefresh()); } catch (e) { /* se refresca al pasar el ratón */ }
}

function init() { bind(); syncControls(); scheduleRefresh(); }

try {
  const { entrypoints } = require('uxp');
  entrypoints.setup({ panels: { amanoPanel: { show() { scheduleRefresh(); } } } });
} catch (e) { /* el panel funciona igual */ }

init();

module.exports = { _test: { st, doHand, doHandUndo, refreshCtx, setTool } };
