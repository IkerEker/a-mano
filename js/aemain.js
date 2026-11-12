'use strict';
// Panel de A mano para After Effects (panel CEP).
//  forma -> texto con importancias -> estilo -> letra -> «Escribir»: se pinta la escritura fotograma a fotograma
//  con el motor de tinta, se guarda como secuencia PNG y se pone en la composición como un clip con dos
//  marcadores: hasta «entrada» se escribe, desde «salida» se borra.

const R = require('./rng.js');
const INK = require('./ink.js');
const SH = require('./shapes.js');
const LY = require('./layout.js');
const WR = require('./writer.js');
const GEO = require('./geom.js');
const FN = require('./fonts.js');
const AN = require('./anim.js');
const PNG = require('./png.js');

const VERSION = '@VERSION@';
const $ = id => document.getElementById(id);
const show = (el, on) => { if (el) { if (on) el.classList.remove('hidden'); else el.classList.add('hidden'); } };
const cls = (el, name, on) => { if (el) { if (on) el.classList.add(name); else el.classList.remove(name); } };
class UserError extends Error { }

// ------------------------------------------------------------------ After Effects y disco
const cep = typeof window !== 'undefined' ? window.__adobe_cep__ : null;
function nodeReq(name) {
  try { if (typeof window !== 'undefined' && window.cep_node && window.cep_node.require) return window.cep_node.require(name); } catch (e) { /* sigue */ }
  try { return require(name); } catch (e) { return null; }
}
const fs = nodeReq('fs'), np = nodeReq('path'), os = nodeReq('os'), zlib = nodeReq('zlib');
function jsLiteral(s) {
  return JSON.stringify(s).replace(/[\u007f-￿]/g, c => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
}
function evalHost(script) {
  return new Promise(res => {
    if (!cep || !cep.evalScript) return res('{"error":"Este panel solo funciona dentro de After Effects."}');
    cep.evalScript(script, r => res(r));
  });
}
let hostReady = false;
async function ensureHost() {
  if (hostReady) return;
  const t = await evalHost('typeof amano_info');
  if (t !== 'function') {
    // (por si After Effects no ha cargado host.jsx al abrir el panel)
    let dir = '';
    try { dir = cep.getSystemPath('extension'); } catch (e) { dir = ''; }
    dir = decodeURI(String(dir || '')).replace(/^file:\/{2,3}(?=[A-Za-z]:)/, '').replace(/^file:\/\//, '');
    await evalHost('$.evalFile(' + jsLiteral(dir + '/host.jsx') + ')');
  }
  hostReady = true;
}
async function host(fn, arg) {
  await ensureHost();
  const r = await evalHost(fn + '(' + (arg === undefined ? '' : jsLiteral(JSON.stringify(arg))) + ')');
  let o = null;
  try { o = JSON.parse(r); } catch (e) { throw new Error('After Effects no ha respondido bien (' + String(r).slice(0, 120) + ').'); }
  if (o && o.error) throw new UserError(o.error);
  return o;
}

// ------------------------------------------------------------------ guardado
const store = {
  get(k, d) { try { const v = localStorage.getItem('amanoae.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('amanoae.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const DEF = {
  shape: 'rect', tool: 'rotulador', preset: 'fino', color: '#1d1d1f', persona: 'adulta', version: 'a', mode: 'minus', textMode: 'importancia', repaso: 'auto', legib: 70,
  grosor: 0, tinta: 55, pulso: 40, repasado: 50, locura: 50, prisa: 15, tight: 0,
  contraste: 50, inter: 100, llenar: 30, margen: 5, align: 'center', colorMode: 'uno', colorVar: 45, tupido: 60,
  dur: 3, tIn: 1.2, tOut: 0.8, erase: 'inicio', blend: 'auto', escala: 100,
  text: 'Nadie había cerrado\nla puerta del sótano', levels: [0, 2, 1, 0, 0, -1, 0], marks: []
};
const st = Object.assign({}, DEF, store.get('settings', {}));
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('settings', st), 250); }

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
  for (const id of ['btnGo', 'btnNew']) { const b = $(id); if (!b) continue; if (on) b.setAttribute('disabled', ''); else b.removeAttribute('disabled'); }
}
async function work(msg, fn) {
  if (busy) return;
  setBusy(true);
  status(msg, '');
  const t0 = Date.now();
  try { await fn(t0); }
  catch (e) { if (e instanceof UserError) status(e.message, 'err'); else { status('Algo ha fallado: ' + String((e && e.message) || e), 'err'); try { console.error(e); } catch (x) { /* nada */ } } }
  finally { setBusy(false); }
}
const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
const tick = () => new Promise(r => setTimeout(r, 0));

// ------------------------------------------------------------------ parámetros (los mismos que en Photoshop)
function genParams() {
  return {
    persona: st.persona + '_' + st.version, mode: st.mode, tool: st.tool, preset: st.preset, color: st.color,
    colorVar: st.colorMode === 'letras' ? Math.max(0.02, st.colorVar / 100) : 0, tupido: st.tupido / 100,
    auto: st.textMode === 'auto', repaso: st.repaso, marks: st.marks || [],
    legib: st.legib / 100, locura: st.locura / 50, pulso: st.pulso / 100, prisa: st.prisa / 100,
    width: Math.pow(2, st.grosor / 50), repasado: st.repasado / 50, tinta: st.tinta / 100,
    contrast: st.contraste / 50, leading: st.inter / 100, align: st.align, stretch: 1 + st.llenar / 100,
    xFill: st.llenar / 150, margin: st.margen / 100, track: st.tight / 50 * 0.07,
    inkPad: INK.preset(st.tool, st.preset).w * FN.styleOf(st.persona + '_' + st.version).weight * Math.pow(2, st.grosor / 50)
  };
}

// ------------------------------------------------------------------ segmentados y deslizadores
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
const sliders = {};
function buildSliders() {
  for (const el of Array.from(document.querySelectorAll('.sl'))) {
    const k = el.getAttribute('data-k');
    const h = document.createElement('div'); h.className = 'slh';
    const l = document.createElement('span'); l.textContent = el.getAttribute('data-label');
    const v = document.createElement('span'); v.className = 'slv';
    h.appendChild(l); h.appendChild(v);
    const r = document.createElement('input'); r.type = 'range'; r.min = el.getAttribute('data-min'); r.max = el.getAttribute('data-max'); r.step = '1'; r.id = 'sl_' + k;
    el.appendChild(h); el.appendChild(r);
    sliders[k] = { r, v };
    const on = () => { const x = Number(r.value); if (!isNaN(x)) { st[k] = x; v.textContent = String(x); save(); } };
    r.addEventListener('input', on); r.addEventListener('change', on);
  }
}

// ------------------------------------------------------------------ texto con importancias
let chipSel = new Set();
function tokens() { return LY.tokenize(st.text); }
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
function syncNeg() { show($('negBox'), (st.marks || []).some(m => m && m.indexOf('n') >= 0)); }
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
  save(); renderBoard();
}
function wordsInSelection() {
  const t = $('txt');
  let a = 0, b = 0;
  try { a = t.selectionStart; b = t.selectionEnd; } catch (e) { return []; }
  if (a == null || b == null || a === b) return [];
  const v = st.text.replace(/\r\n?/g, '\n');
  const out = [];
  let k = 0;
  const re = /[^ \t\n]+/g; let m;
  while ((m = re.exec(v))) { const s = m.index, e = s + m[0].length; if (e > a && s < b) out.push(k); k++; }
  return out;
}
function pickWords() {
  let idx = [...chipSel];
  if (!idx.length) idx = wordsInSelection();
  if (!idx.length) status('Toca antes una o varias palabras (abajo) o selecciónalas en la casilla.', '');
  return idx;
}
function applyMark(kind) {
  const idx = pickWords(); if (!idx.length) return;
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
  save(); renderBoard(); status('', '');
}
function applyLevel(lv) {
  const idx = pickWords(); if (!idx.length) return;
  for (const i of idx) st.levels[i] = lv;
  chipSel = new Set();
  save(); renderBoard(); status('', '');
}

// ------------------------------------------------------------------ escribir
function snippet(text, n) {
  const w = String(text || '').replace(/\s+/g, ' ').trim().split(' ').slice(0, n || 4).join(' ');
  return w.length > 34 ? w.slice(0, 33) + '…' : w;
}
function slug(text) {
  const s = snippet(text, 3).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return s || 'texto';
}
function stamp() {
  const d = new Date(), p2 = n => ('0' + n).slice(-2);
  return String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
}
function baseDir(info) {
  const root = info.projDir || np.join(os.homedir(), 'Documents');
  return np.join(root, 'A mano AE');
}
// la expresión de la reasignación de tiempo: lee los marcadores y elige el fotograma
function expression(nw, ne, back) {
  return [
    '// A mano: hasta el primer marcador se escribe; desde el último, se borra.',
    'var NW = ' + nw + ', NE = ' + ne + ', ATRAS = ' + (back ? 1 : 0) + ';',
    'var fd = thisLayer.source.frameDuration;',
    'var a = inPoint, b = outPoint - thisComp.frameDuration;',
    'var m = thisLayer.marker, n = m.numKeys;',
    'var tIn = a + 1, tOut = b - 1;',
    'if (n >= 1) tIn = m.key(1).time;',
    'if (n >= 2) tOut = m.key(n).time; else if (n == 1) tOut = outPoint;',
    'tIn = Math.min(Math.max(tIn, a), b);',
    'tOut = Math.max(tOut, tIn);',
    'var f = NW;',
    'if (time < tIn) { f = tIn > a ? NW * (time - a) / (tIn - a) : NW; }',
    'else if (time > tOut && tOut < b) { var u = Math.min(1, (time - tOut) / (b - tOut)); f = ATRAS ? NW * (1 - u) : NW + NE * u; }',
    'f = Math.max(0, Math.min(NW + NE, Math.round(f)));',
    '(f + 0.5) * fd;'
  ].join('\n');
}
const SAVED_KEYS = ['shape', 'text', 'levels', 'marks', 'tupido', 'persona', 'version', 'mode', 'textMode', 'tool', 'preset', 'color', 'colorMode', 'colorVar', 'legib', 'erase'];

async function doWrite(fresh) {
  await work('Leyendo la composición…', async (t0) => {
    if (!fs || !np) throw new UserError('El panel no tiene acceso al disco (Node.js desactivado en la extensión).');
    if (!st.text.trim()) throw new UserError('Escribe el texto en la casilla.');
    const dur = Number(st.dur) || 3, tIn = Number(st.tIn) || 1, tOut = Math.max(0, Number(st.tOut) || 0);
    if (tIn + tOut > dur) throw new UserError('El clip dura ' + dur + ' s y no caben ' + tIn + ' s de escritura más ' + tOut + ' s de borrado. Alarga el clip o acorta los tiempos.');
    const info = await host('amano_info');
    if (!info.comp) throw new UserError('Abre una composición (o haz clic en su línea de tiempo) y vuelve a pulsar.');
    const sel = info.sel || null;
    const mine = !!(sel && sel.amano), data = (mine && sel.data) || null;
    const K = Math.max(1, Math.min(2, (Number(st.escala) || 100) / 100));
    // dónde va: la caja de la capa que ya estaba escrita, la de la capa seleccionada (sólido o forma) o el centro
    let box = null;
    if (data && data.box && data.shape === st.shape) box = data.box;
    else if (sel && sel.rect) box = sel.rect;
    if (!box) { const b = SH.defaultBox(st.shape, info.w, info.h, null); box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; }
    const kb = { left: box.left * K, top: box.top * K, right: box.right * K, bottom: box.bottom * K };
    const s = SH.makeShape(st.shape, kb);
    const shape = SH.readShape(GEO.readPathContents(SH.toPathContents(s.anchors, 72, 'px'), 72), st.shape);
    if (!shape) throw new UserError('No se ha podido crear la forma.');
    status('Colocando el texto…', ''); await tick();
    const gp = genParams();
    const lay = LY.layoutInShape(st.text, st.levels, shape, gp);
    if (!lay || !lay.letters.length) throw new UserError('El texto no cabe en la forma. Prueba con menos texto.');
    const seed = (!fresh && data && data.seed != null) ? data.seed : R.newSeed();
    gp.colorSeed = seed;
    const strokes = WR.plan(lay, gp, seed);
    if (!strokes.length) throw new UserError('No hay nada que escribir.');
    // fotogramas de sobra para poder alargar la escritura o el borrado sin que se note
    const fps = info.fps || 25;
    const nw = Math.max(12, Math.min(160, Math.round(fps * tIn * 1.5)));
    const ne = Math.max(8, Math.min(120, Math.round(fps * Math.max(0.3, tOut) * 1.5)));
    const A = AN.build(strokes, gp, { nw, ne, erase: st.erase });
    if (!A) throw new UserError('No hay nada que escribir.');
    let dir = np.join(baseDir(info), slug(st.text) + '_' + stamp());
    for (let k = 2; fs.existsSync(dir) && k < 500; k++) dir = dir.replace(/(_v\d+)?$/, '_v' + k);
    fs.mkdirSync(dir, { recursive: true });
    const file = i => np.join(dir, 'amano_' + ('00000' + i).slice(-5) + '.png');
    let n = 0, prev = null;
    for (const f of A.frames()) {
      const dst = file(f.index);
      if (f.same && prev && fs.copyFileSync) fs.copyFileSync(prev, dst);
      else fs.writeFileSync(dst, PNG.encode(A.w, A.h, f.data, zlib, 3));
      prev = dst; n++;
      if (n % 3 === 0) { status('Pintando… ' + n + ' / ' + A.count, ''); await tick(); }
    }
    status('Poniendo el clip en la composición…', ''); await tick();
    const P = INK.preset(st.tool, st.preset);
    const rgb = [1, 3, 5].map(i => parseInt(String(st.color).slice(i, i + 2), 16) || 0);
    const dark = Math.max(rgb[0], rgb[1], rgb[2]) < 190;
    const multiply = st.blend === 'multiply' || (st.blend === 'auto' && P.blend === 'multiply' && dark);
    const saved = {}; for (const k of SAVED_KEYS) saved[k] = st[k];
    const cx = (A.x0 + A.w / 2) / K, cy = (A.y0 + A.h / 2) / K;
    const name = '✍ ' + snippet(st.text);
    const r = await host('amano_place', {
      first: file(0), name, nw: A.nw, ne: A.ne, expr: expression(A.nw, A.ne, st.erase === 'atras'),
      dur, tIn, tOut, cx, cy, scale: 100 / K, multiply, blend: st.blend, replace: mine,
      data: JSON.stringify({ v: VERSION, seed, box, shape: st.shape, cx, cy, dir, st: saved })
    });
    status((r.isNew ? 'Escrito' : 'Reescrito') + ' en ' + secs(t0) + ' (' + A.count + ' fotogramas). Mueve los marcadores «entrada» y «salida» del clip para cambiar los tiempos.', 'ok');
  });
}

async function doLoad() {
  await work('Leyendo la capa…', async () => {
    const info = await host('amano_info');
    const d = info.sel && info.sel.amano && info.sel.data;
    if (!d || !d.st) throw new UserError('Selecciona en la línea de tiempo un clip hecho con A mano.');
    for (const k of SAVED_KEYS) if (d.st[k] != null) st[k] = Array.isArray(d.st[k]) ? d.st[k].slice() : d.st[k];
    save(); syncControls();
    status('Ajustes cargados de «' + info.sel.name + '». «Escribir» lo rehace en el mismo clip.', 'ok');
  });
}

// borra del disco las secuencias de «A mano AE» que el proyecto ya no usa
async function doClean() {
  await work('Buscando fotogramas sin usar…', async () => {
    if (!fs || !np) throw new UserError('El panel no tiene acceso al disco.');
    const info = await host('amano_info');
    const used = new Set(((await host('amano_used')).dirs || []).map(d => np.resolve(d)));
    const base = baseDir(info);
    let n = 0;
    if (fs.existsSync(base)) {
      for (const d of fs.readdirSync(base)) {
        const full = np.join(base, d);
        if (used.has(np.resolve(full))) continue;
        let files;
        try { if (!fs.statSync(full).isDirectory()) continue; files = fs.readdirSync(full); } catch (e) { continue; }
        // solo carpetas que sean enteras de fotogramas de A mano
        if (!files.length || !files.every(f => /^amano_\d{5}\.png$/.test(f))) continue;
        for (const f of files) fs.unlinkSync(np.join(full, f));
        fs.rmdirSync(full);
        n++;
      }
    }
    status(n ? 'Borradas ' + n + (n === 1 ? ' secuencia' : ' secuencias') + ' que este proyecto ya no usa.' : 'No hay fotogramas sin usar.', 'ok');
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
function setColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  st.color = hex.toLowerCase(); save();
  const a = $('inColor'), b = $('inHex');
  if (a && a.value !== st.color) a.value = st.color;
  if (b && b.value.toLowerCase() !== st.color) b.value = st.color;
}
function setShape(v) {
  st.shape = v; save();
  for (const el of Array.from(document.querySelectorAll('#shapeGrid .shp'))) cls(el, 'on', el.getAttribute('data-v') === v);
}
const NUMS = { nDur: 'dur', nIn: 'tIn', nOut: 'tOut' };
function syncText() {
  const auto = st.textMode === 'auto';
  show($('importBar'), !auto); show($('autoHint'), auto);
  renderBoard();
  const vh = $('versionHint'); if (vh) vh.textContent = (FN.styleOf(st.persona + '_' + st.version).hint) || '';
}
function syncControls() {
  setShape(SH.SHAPES[st.shape] && st.shape !== 'lazo' ? st.shape : 'rect');
  segSet('toolSeg', st.tool); renderPresets(); segSet('fontSeg', st.persona); segSet('caseSeg', st.mode);
  segSet('versionSeg', st.version); segSet('colorModeSeg', st.colorMode); show($('multiBox'), st.colorMode === 'letras'); segSet('textModeSeg', st.textMode); segSet('repasoSeg', st.repaso);
  segSet('alignSeg', st.align); segSet('eraseSeg', st.erase); segSet('blendSeg', st.blend);
  for (const k of Object.keys(sliders)) { sliders[k].r.value = st[k]; sliders[k].v.textContent = String(st[k]); }
  for (const id of Object.keys(NUMS)) { const el = $(id); if (el) el.value = st[NUMS[id]]; }
  const t = $('txt'); if (t && t.value !== st.text) t.value = st.text;
  setColor(st.color);
  syncText();
}
function showAdv(on) { show($('viewMain'), !on); show($('viewAdv'), on); }
function bind() {
  $('btnAdv').addEventListener('click', () => showAdv(true));
  $('btnBack').addEventListener('click', () => showAdv(false));
  $('btnReset').addEventListener('click', () => {
    for (const k of ['grosor', 'tinta', 'pulso', 'repasado', 'repaso', 'locura', 'prisa', 'tight', 'contraste', 'inter', 'llenar', 'margen', 'align', 'blend', 'escala']) st[k] = DEF[k];
    save(); syncControls(); status('Ajustes avanzados restablecidos.', 'ok');
  });
  const seg = (id, key, after) => segBind(id, v => { st[key] = v; save(); segSet(id, v); if (after) after(v); });
  segBind('toolSeg', v => { st.tool = v; st.preset = Object.keys(INK.TOOLS[v].presets)[0]; save(); segSet('toolSeg', v); renderPresets(); });
  seg('presetSeg', 'preset'); seg('colorModeSeg', 'colorMode', v => show($('multiBox'), v === 'letras'));
  seg('fontSeg', 'persona', syncText); seg('versionSeg', 'version', syncText); seg('textModeSeg', 'textMode', syncText);
  seg('repasoSeg', 'repaso'); seg('caseSeg', 'mode'); seg('alignSeg', 'align'); seg('eraseSeg', 'erase'); seg('blendSeg', 'blend');
  $('shapeGrid').addEventListener('click', ev => {
    let t = ev.target;
    while (t && t.classList && !t.classList.contains('shp')) t = t.parentNode;
    if (t && t.getAttribute) setShape(t.getAttribute('data-v'));
  });
  for (const id of Object.keys(NUMS)) {
    const el = $(id);
    el.addEventListener('change', () => { const v = Number(String(el.value).replace(',', '.')); if (!isNaN(v) && v >= 0) { st[NUMS[id]] = v; save(); } else el.value = st[NUMS[id]]; });
  }
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
  $('inColor').addEventListener('input', () => setColor($('inColor').value));
  $('inHex').addEventListener('change', () => { let v = $('inHex').value.trim(); if (v && v.charAt(0) !== '#') v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) setColor(v); else $('inHex').value = st.color; });
  $('btnGo').addEventListener('click', () => doWrite(false));
  $('btnNew').addEventListener('click', () => doWrite(true));
  $('btnLoad').addEventListener('click', doLoad);
  $('btnClean').addEventListener('click', doClean);
}

function init() { buildSliders(); bind(); syncControls(); }
if (typeof document !== 'undefined') init();

module.exports = { _test: { st, doWrite, doLoad, doClean, genParams, expression } };
