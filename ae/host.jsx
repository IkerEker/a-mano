// A mano AE: lado de After Effects (ExtendScript). El panel llama a estas funciones con evalScript.
// Todas reciben un texto JSON y devuelven un texto JSON.

function amano_str(v) {
  var t = typeof v, i, o, k, c, h, first;
  if (v === null || v === undefined) return 'null';
  if (t === 'number') return isFinite(v) ? String(v) : 'null';
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'string') {
    o = '"';
    for (i = 0; i < v.length; i++) {
      c = v.charCodeAt(i);
      if (c === 34 || c === 92) o += '\\' + v.charAt(i);
      else if (c < 32 || c > 126) { h = c.toString(16); while (h.length < 4) h = '0' + h; o += '\\u' + h; }
      else o += v.charAt(i);
    }
    return o + '"';
  }
  if (v instanceof Array) {
    o = '[';
    for (i = 0; i < v.length; i++) o += (i ? ',' : '') + amano_str(v[i]);
    return o + ']';
  }
  o = '{'; first = true;
  for (k in v) {
    if (!v.hasOwnProperty(k)) continue;
    o += (first ? '' : ',') + amano_str(String(k)) + ':' + amano_str(v[k]);
    first = false;
  }
  return o + '}';
}
function amano_arg(s) { return (s === undefined || s === null || s === '') ? {} : eval('(' + s + ')'); }
function amano_err(e) { return amano_str({ error: String(e && e.message ? e.message : e) + (e && e.line ? ' (host.jsx, línea ' + e.line + ')' : '') }); }

var AMANO_TAG = 'A mano|';
function amano_isMine(L) {
  try { return String(L.comment || '').indexOf(AMANO_TAG) === 0; } catch (e) { return false; }
}
function amano_data(L) {
  try { return eval('(' + String(L.comment).substring(AMANO_TAG.length) + ')'); } catch (e) { return null; }
}
function amano_comp() {
  var c = app.project ? app.project.activeItem : null;
  return (c && c instanceof CompItem) ? c : null;
}
// rectángulo de una capa en la composición (sin giro ni capas padre)
function amano_rect(L, c) {
  try {
    var r = null, tr, pos, anc, sc, sx, sy, out;
    try { r = L.sourceRectAtTime(c.time, false); } catch (e1) { r = null; }
    if (!r || !(r.width > 0)) { if (L.width > 0) r = { left: 0, top: 0, width: L.width, height: L.height }; else return null; }
    tr = L.property('ADBE Transform Group');
    pos = tr.property('ADBE Position').value; anc = tr.property('ADBE Anchor Point').value; sc = tr.property('ADBE Scale').value;
    sx = sc[0] / 100; sy = sc[1] / 100;
    out = { left: pos[0] + (r.left - anc[0]) * sx, top: pos[1] + (r.top - anc[1]) * sy };
    out.right = out.left + r.width * sx; out.bottom = out.top + r.height * sy;
    if (out.right < out.left) { sx = out.left; out.left = out.right; out.right = sx; }
    if (out.bottom < out.top) { sy = out.top; out.top = out.bottom; out.bottom = sy; }
    if (out.right - out.left < 20 || out.bottom - out.top < 20) return null;
    return out;
  } catch (e) { return null; }
}

function amano_info() {
  try {
    var out = { comp: false, projDir: '' }, c, sl, L, isBox;
    try { if (app.project && app.project.file) out.projDir = app.project.file.parent.fsName; } catch (e0) { out.projDir = ''; }
    c = amano_comp();
    if (c) {
      out.comp = true; out.w = c.width; out.h = c.height; out.fps = c.frameRate; out.time = c.time; out.dur = c.duration; out.name = c.name;
      sl = c.selectedLayers;
      if (sl && sl.length) {
        L = sl[0];
        out.sel = { name: L.name, amano: amano_isMine(L) };
        if (out.sel.amano) out.sel.data = amano_data(L);
        else {
          // solo sólidos y capas de forma sirven de caja para el texto
          isBox = false;
          try { isBox = (L instanceof ShapeLayer) || (L.source && L.source.mainSource instanceof SolidSource); } catch (e2) { isBox = false; }
          if (isBox) out.sel.rect = amano_rect(L, c);
        }
      }
    }
    return amano_str(out);
  } catch (e) { return amano_err(e); }
}

function amano_bin() {
  var i, it;
  for (i = 1; i <= app.project.numItems; i++) {
    it = app.project.item(i);
    if (it instanceof FolderItem && it.name === 'A mano' && it.parentFolder === app.project.rootFolder) return it;
  }
  return app.project.items.addFolder('A mano');
}

// a: { first, name, nw, ne, expr, dur, tIn, tOut, cx, cy, scale, multiply, blend, data, replace }
function amano_place(s) {
  var a, c, f, io, item, L = null, old = null, sel, mk, tr, pos, od, t0, t1, isNew = false;
  try {
    a = amano_arg(s);
    c = amano_comp();
    if (!c) throw new Error('No hay ninguna composición abierta.');
    f = new File(a.first);
    if (!f.exists) throw new Error('No encuentro los fotogramas: ' + a.first);
  } catch (e) { return amano_err(e); }
  app.beginUndoGroup('A mano');
  try {
    io = new ImportOptions(f);
    io.sequence = true;
    try { io.forceAlphabetical = true; } catch (e1) { }
    try { if (io.canImportAs(ImportAsType.FOOTAGE)) io.importAs = ImportAsType.FOOTAGE; } catch (e2) { }
    item = app.project.importFile(io);
    try { item.mainSource.conformFrameRate = c.frameRate; } catch (e3) { }
    try { item.mainSource.alphaMode = AlphaMode.STRAIGHT; } catch (e4) { }
    item.name = a.name;
    try { item.parentFolder = amano_bin(); } catch (e5) { }

    if (a.replace) {
      sel = c.selectedLayers;
      if (sel && sel.length && amano_isMine(sel[0])) L = sel[0];
    }
    if (L) {
      od = amano_data(L);
      old = L.source;
      L.replaceSource(item, false);
    } else {
      isNew = true;
      L = c.layers.add(item);
      L.startTime = c.time;
    }
    try { if (!L.timeRemapEnabled) L.timeRemapEnabled = true; } catch (e6) { throw new Error('No se ha podido activar la reasignación de tiempo en la capa.'); }
    tr = L.property('ADBE Time Remapping');
    tr.expression = a.expr;
    pos = L.property('ADBE Transform Group').property('ADBE Position');
    if (isNew) {
      t0 = c.time; t1 = c.time + a.dur;
      L.inPoint = t0; L.outPoint = t1;
      mk = L.property('ADBE Marker');
      mk.setValueAtTime(t0 + a.tIn, new MarkerValue('entrada'));
      mk.setValueAtTime(t1 - a.tOut, new MarkerValue('salida'));
      try { pos.setValue([a.cx, a.cy]); } catch (e7) { }
      try { L.property('ADBE Transform Group').property('ADBE Scale').setValue([a.scale, a.scale]); } catch (e8) { }
      try { L.blendingMode = a.multiply ? BlendingMode.MULTIPLY : BlendingMode.NORMAL; } catch (e9) { }
    } else {
      // la capa se queda donde el usuario la haya puesto: solo se corrige lo que cambia el centro del texto nuevo
      try {
        if (od && od.cx !== undefined && pos.numKeys === 0) {
          var p0 = pos.value;
          pos.setValue([p0[0] + (a.cx - od.cx), p0[1] + (a.cy - od.cy)]);
        }
      } catch (e10) { }
      try { if (a.blend !== 'auto') L.blendingMode = a.multiply ? BlendingMode.MULTIPLY : BlendingMode.NORMAL; } catch (e11) { }
    }
    L.name = a.name;
    L.comment = AMANO_TAG + a.data;
    try { if (old && old !== item && old.usedIn.length === 0) old.remove(); } catch (e12) { }
    try { for (var i = 1; i <= c.numLayers; i++) c.layer(i).selected = false; L.selected = true; } catch (e13) { }
    app.endUndoGroup();
    return amano_str({ ok: true, isNew: isNew, layer: L.name, inPoint: L.inPoint, outPoint: L.outPoint });
  } catch (e) {
    app.endUndoGroup();
    return amano_err(e);
  }
}

// carpetas de fotogramas que el proyecto sigue usando
function amano_used() {
  try {
    var out = [], i, it;
    for (i = 1; i <= app.project.numItems; i++) {
      it = app.project.item(i);
      try { if (it instanceof FootageItem && it.mainSource && it.mainSource.file) out.push(it.mainSource.file.parent.fsName); } catch (e1) { }
    }
    return amano_str({ ok: true, dirs: out });
  } catch (e) { return amano_err(e); }
}
