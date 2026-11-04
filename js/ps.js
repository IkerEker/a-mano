'use strict';
// Puente con Photoshop (A mano): contornos de las capas de texto, imagen resultante, copias a mano.

const ps = require('photoshop');
const { app, core, action, imaging, constants } = ps;
const G = require('./geom.js');
const GL = require('./glyphs.js');
const HM = require('./handmade.js');
const RD = require('./render.js');

class UserError extends Error {}

async function bp(descs) {
  const res = await action.batchPlay(Array.isArray(descs) ? descs : [descs], {});
  for (const r of res) if (r && r._obj === 'error') throw new Error(r.message || 'Photoshop rechazó la orden.');
  return res;
}
async function tryGet(target) {
  try {
    const r = await action.batchPlay([{ _obj: 'get', _target: target }], {});
    const x = r && r[0];
    return x && x._obj !== 'error' ? x : null;
  } catch (e) { return null; }
}
const num = v => (typeof v === 'number' ? v : v && typeof v._value === 'number' ? v._value : 0);

// un solo paso de historial; si algo falla, se deshace lo hecho
async function runModal(name, fn) {
  return core.executeAsModal(async (ctx) => {
    const doc = app.activeDocument;
    if (!doc) throw new UserError('Abre un documento primero.');
    let hid = null;
    try { hid = await ctx.hostControl.suspendHistory({ documentID: doc.id, name }); } catch (e) { hid = null; }
    let ok = false;
    try { const r = await fn(ctx, doc); ok = true; return r; }
    finally { if (hid != null) { try { await ctx.hostControl.resumeHistory(hid, ok); } catch (e) { /* nada */ } } }
  }, { commandName: name });
}

function bounds(layer) {
  const b = layer.boundsNoEffects || layer.bounds;
  return { left: num(b.left), top: num(b.top), right: num(b.right), bottom: num(b.bottom) };
}

// ------------------------------------------------------------------ selección (respaldo)
async function getSelectionBounds() {
  const r = await tryGet([{ _property: 'selection' }, { _ref: 'document', _enum: 'ordinal', _value: 'targetEnum' }]);
  const s = r && r.selection;
  if (!s || s.top == null) return null;
  const b = { left: Math.floor(num(s.left)), top: Math.floor(num(s.top)), right: Math.ceil(num(s.right)), bottom: Math.ceil(num(s.bottom)) };
  return b.right - b.left >= 4 && b.bottom - b.top >= 4 ? b : null;
}

// ------------------------------------------------------------------ forma del usuario
function pathBBox(comps) {
  const polys = [];
  for (const c of comps) for (const s of c.subpaths) polys.push(G.flattenSegs(G.segmentsOf(Object.assign({}, s, { closed: true })), 1));
  return G.polyBBox(polys);
}

// ------------------------------------------------------------------ fuentes
// Una sola llamada a Photoshop para toda la lista (recorrer app.fonts una a una es lento)
let fontList = null, fontMap = null;

// ------------------------------------------------------------------ capas de texto
function hexToRgb(hex) { const c = RD.hexToRgb(hex); return { r: c[0], g: c[1], b: c[2] }; }
function colorHex(c) {
  if (!c) return '#000000';
  const h = v => Math.max(0, Math.min(255, Math.round(v || 0))).toString(16).padStart(2, '0');
  if (c.red !== undefined) return '#' + h(c.red) + h(c.grain !== undefined ? c.grain : c.green) + h(c.blue);
  if (c.gray !== undefined) { const v = h(255 * (1 - num(c.gray) / 100)); return '#' + v + v + v; }
  if (c.cyan !== undefined) {
    const C = num(c.cyan) / 100, M = num(c.magenta) / 100, Y = num(c.yellowColor !== undefined ? c.yellowColor : c.yellow) / 100, K = num(c.black) / 100;
    return '#' + h(255 * (1 - C) * (1 - K)) + h(255 * (1 - M) * (1 - K)) + h(255 * (1 - Y) * (1 - K));
  }
  return '#000000';
}

// guarda el trazado de trabajo del usuario y lo deja como estaba al terminar
async function withWorkPath(fn) {
  const saved = await tryGet([{ _ref: 'path', _property: 'workPath' }]);
  try { return await fn(); }
  finally {
    try {
      if (saved && saved.pathContents) await bp({ _obj: 'set', _target: [{ _ref: 'path', _property: 'workPath' }], to: saved.pathContents });
    } catch (e) { /* no se pudo restaurar */ }
  }
}

// contornos de una capa de texto (crea un trazado de trabajo, lo lee y lo borra)
async function outlinesOf(doc, layer) {
  await selectLayer(layer.id);
  await bp({ _obj: 'make', _target: [{ _ref: 'path' }], from: { _ref: 'textLayer', _enum: 'ordinal', _value: 'targetEnum' } });
  const r = await tryGet([{ _ref: 'path', _property: 'workPath' }]);
  try { await bp({ _obj: 'delete', _target: [{ _ref: 'path', _property: 'workPath' }] }); } catch (e) { /* nada */ }
  if (!r || !r.pathContents) throw new UserError('Photoshop no ha dado los contornos del texto.');
  const comps = G.readPathContents(r.pathContents, doc.resolution || 72);
  GL.calibrate(comps, bounds(layer), doc.resolution || 72);
  return comps;
}

async function getTextKey(id) {
  const r = await bp({ _obj: 'get', _target: [{ _ref: 'layer', _id: id }] });
  return r[0] && r[0].textKey;
}

// datos de una capa de texto existente: contenido, color y tamaño de cada carácter, contornos
async function textLayerData(doc, layer) {
  const tk = await getTextKey(layer.id);
  if (!tk) return null;
  const res = doc.resolution || 72;
  const text = String(tk.textKey || '').replace(/\r\n?/g, '\r');
  let tscale = 1;
  const T = tk.transform;
  if (T && T.xx != null) tscale = Math.sqrt(Math.abs(num(T.xx) * num(T.yy) - num(T.xy) * num(T.yx))) || 1;
  const ranges = (tk.textStyleRange || []).map(r => {
    const st = r.textStyle || {};
    const pt = st.impliedFontSize ? num(st.impliedFontSize) : num(st.size) * tscale;
    return { from: r.from, to: r.to, color: colorHex(st.color), sizePx: (pt || 12) * res / 72 };
  });
  const charInfo = i => ranges.find(r => i >= r.from && i < r.to) || ranges[ranges.length - 1] || { color: '#000000', sizePx: 24 };
  const comps = await outlinesOf(doc, layer);
  return { text, charInfo, comps, tk };
}

// ------------------------------------------------------------------ salida
async function selectLayer(id) { await bp({ _obj: 'select', _target: [{ _ref: 'layer', _id: id }], makeVisible: false }); }
async function selectLayers(ids) {
  const list = ids.filter(id => id != null);
  if (!list.length) return;
  await selectLayer(list[0]);
  for (const id of list.slice(1)) await bp({ _obj: 'select', _target: [{ _ref: 'layer', _id: id }], selectionModifier: { _enum: 'selectionModifierType', _value: 'addToSelection' }, makeVisible: false });
}

function depthBits(doc) {
  const b = String(doc.bitsPerChannel || '');
  return /32/.test(b) ? 32 : /16/.test(b) ? 16 : 8;
}
const isGray = doc => /gray/i.test(String(doc.mode || ''));

// RGBA 8 bits recortado -> píxeles de la capa (en el modo y la profundidad del documento)
async function putInto(doc, layer, img, blend) {
  const bits = depthBits(doc);
  let data = img.data, comps = 4, space = 'RGB';
  if (isGray(doc)) {
    const n = img.w * img.h, g = new Uint8Array(n * 2);
    for (let i = 0; i < n; i++) { g[2 * i] = Math.round(0.299 * data[4 * i] + 0.587 * data[4 * i + 1] + 0.114 * data[4 * i + 2]); g[2 * i + 1] = data[4 * i + 3]; }
    data = g; comps = 2; space = 'Grayscale';
  }
  const opts = { width: img.w, height: img.h, components: comps, colorSpace: space, chunky: true };
  if (space === 'RGB') opts.colorProfile = 'sRGB IEC61966-2.1';
  let id;
  try { id = await imaging.createImageDataFromBuffer(RD.toDepth(data, bits), opts); }
  catch (e) { delete opts.colorProfile; id = await imaging.createImageDataFromBuffer(RD.toDepth(data, bits), opts); }
  try {
    await imaging.putPixels({ documentID: doc.id, layerID: layer.id, imageData: id, targetBounds: { left: img.x0, top: img.y0 }, replace: !blend });
  } catch (e) {
    if (/cmyk|lab|index|bitmap|multi/i.test(String(doc.mode || ''))) throw new UserError('Para sacar imagen el documento tiene que estar en RGB o escala de grises (Imagen › Modo).');
    throw e;
  } finally { try { id.dispose(); } catch (e) { /* nada */ } }
}

// Dibuja por franjas (memoria contenida aunque el documento sea enorme) y crea una capa de píxeles.
// draw(canvas) pinta en la franja; bounds en píxeles del documento.
async function putBands(doc, name, bounds, draw, progress) {
  const x0 = Math.max(0, Math.floor(bounds.left)), y0 = Math.max(0, Math.floor(bounds.top));
  const x1 = Math.min(doc.width, Math.ceil(bounds.right)), y1 = Math.min(doc.height, Math.ceil(bounds.bottom));
  if (x1 <= x0 || y1 <= y0) return null;
  const W = x1 - x0;
  const bandH = Math.max(64, Math.floor(6e6 / W));
  const nb = Math.ceil((y1 - y0) / bandH);
  let layer = null, k = 0;
  for (let y = y0; y < y1; y += bandH, k++) {
    if (progress) progress(k, nb);
    const canvas = RD.makeCanvas(x0, y, W, Math.min(bandH, y1 - y));
    draw(canvas);
    const img = RD.trimCanvas(canvas);
    if (!img) continue;
    if (!layer) layer = typeof doc.createPixelLayer === 'function' ? await doc.createPixelLayer({ name }) : await doc.createLayer({ name });
    await putInto(doc, layer, img, k > 0);
  }
  return layer;
}

// copia opacidad, fusión y estilo de capa de una capa a otra (si se puede)
async function copyLook(src, dst) {
  try { dst.opacity = src.opacity; } catch (e) { /* nada */ }
  try { dst.blendMode = src.blendMode; } catch (e) { /* nada */ }
  try {
    await bp({ _obj: 'copyEffects', _target: [{ _ref: 'layer', _id: src.id }] });
    await bp({ _obj: 'pasteEffects', _target: [{ _ref: 'layer', _id: dst.id }], allowPasteFXOnLayerSet: true });
  } catch (e) { /* la capa no tiene estilo */ }
}

// ------------------------------------------------------------------ árbol de capas
const BLOCK_RE = /#([a-z0-9]{4,8})$/;
const HAND_PREFIX = '✍ ';
const isHandCopy = l => !!(l && l.name && l.name.indexOf(HAND_PREFIX) === 0);
function allLayers(doc) {
  const out = [];
  const walk = ls => { for (const l of ls) { out.push(l); if (l.layers) walk(Array.from(l.layers)); } };
  walk(Array.from(doc.layers));
  return out;
}
function siblingsOf(doc, layer) { return layer.parent ? Array.from(layer.parent.layers) : Array.from(doc.layers); }
function textLayersIn(layer, out) {
  out = out || [];
  if (layer.kind === constants.LayerKind.TEXT) out.push(layer);
  else if (layer.kind === constants.LayerKind.GROUP && layer.layers) for (const c of Array.from(layer.layers)) textLayersIn(c, out);
  return out;
}
function originalOf(doc, copy) {
  const want = copy.name.slice(HAND_PREFIX.length);
  const sib = siblingsOf(doc, copy);
  const i = sib.findIndex(l => l.id === copy.id);
  if (i >= 0 && sib[i + 1] && sib[i + 1].name === want) return sib[i + 1];
  return sib.find(l => l.id !== copy.id && l.name === want) || null;
}
function handCopyOf(doc, orig) {
  const want = HAND_PREFIX + orig.name;
  const sib = siblingsOf(doc, orig);
  const i = sib.findIndex(l => l.id === orig.id);
  if (i > 0 && sib[i - 1] && sib[i - 1].name === want) return sib[i - 1];
  return sib.find(l => l.name === want) || null;
}
// lo seleccionado -> capas de texto (dentro de grupos también; una copia a mano cuenta como su original)
function resolveTargets(doc, selected) {
  const texts = new Map();
  const walk = x => {
    if (isHandCopy(x)) { const o = originalOf(doc, x); if (o && o.kind === constants.LayerKind.TEXT) texts.set(o.id, o); }
    else if (x.kind === constants.LayerKind.TEXT) texts.set(x.id, x);
    else if (x.kind === constants.LayerKind.GROUP && x.layers) for (const c of Array.from(x.layers)) walk(c);
  };
  for (const l of selected) walk(l);
  return [...texts.values()];
}


async function setTextStyles(id, textKey, ranges) {
  const strip = rs => rs.map(r => { const t = JSON.parse(JSON.stringify(r)); delete t.textStyle.stylisticAlternates; return t; });
  const attempts = [
    () => Object.assign({}, textKey, { _obj: 'textLayer', textStyleRange: ranges }),
    () => Object.assign({}, textKey, { _obj: 'textLayer', textStyleRange: strip(ranges) }),
    () => ({ _obj: 'textLayer', textKey: textKey.textKey, textStyleRange: strip(ranges), paragraphStyleRange: textKey.paragraphStyleRange })
  ];
  let last = null;
  for (const make of attempts) {
    try { await bp({ _obj: 'set', _target: [{ _ref: 'textLayer', _id: id }], to: make() }); return; } catch (e) { last = e; }
  }
  throw last || new Error('No se pudo variar el texto.');
}

// A mano "editable": copia del texto con variación letra a letra (sigue siendo texto)
async function handEditable(doc, orig, p, seed) {
  const old = handCopyOf(doc, orig);
  if (old) old.delete();
  const tk = await getTextKey(orig.id);
  if (!tk) throw new UserError('«' + orig.name + '» no es una capa de texto.');
  const copy = await orig.duplicate();
  copy.name = HAND_PREFIX + orig.name;
  copy.visible = true;
  orig.visible = false;
  const ranges = HM.varyTextStyles(String(tk.textKey || ''), tk.textStyleRange || [], { pulso: Math.min(1, p.locura * 1.4), prisa: p.prisa, alternates: true }, seed);
  await setTextStyles(copy.id, tk, ranges);
  return copy;
}
module.exports = {
  UserError, runModal, bp, tryGet, bounds, hexToRgb, colorHex, withWorkPath, outlinesOf, getTextKey, textLayerData,
  selectLayer, selectLayers, putBands, putInto, copyLook,
  allLayers, textLayersIn, originalOf, handCopyOf, resolveTargets, isHandCopy, handEditable, setTextStyles,
  HAND_PREFIX, constants, app, core, action
};
