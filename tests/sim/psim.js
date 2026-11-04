// Photoshop simulado (navegador): capas, trazados, texto (con motor falso), píxeles, modal e historial.
(function () {
  const FT = window.__fakeText;
  const SIM = window.SIM = { log: [], quirk: 'none', units: 'distanceUnit', modal: false, calls: 0, errors: [] };
  let nextId = 10;
  let doc = null;

  const num = v => (typeof v === 'number' ? v : v && typeof v._value === 'number' ? v._value : 0);
  const ptToPx = pt => SIM.quirk === 'small' ? pt : SIM.quirk === 'big' ? pt * Math.pow(doc.resolution / 72, 2) : pt * doc.resolution / 72;
  const pxToPt = px => px * 72 / doc.resolution;
  const hexOf = c => '#' + [c.red, c.grain, c.blue].map(v => Math.max(0, Math.min(255, Math.round(v || 0))).toString(16).padStart(2, '0')).join('');
  const rgbOf = h => { const n = parseInt(h.replace('#', ''), 16); return { _obj: 'RGBColor', red: (n >> 16) & 255, grain: (n >> 8) & 255, blue: n & 255 }; };
  function needModal(what) { if (!SIM.modal) { const e = new Error('Fuera de modal: ' + what); SIM.errors.push(e.message); throw e; } }

  // ---------------------------------------------------------------- trazados
  function mapPC(pc, f) {
    return { _obj: 'pathClass', pathComponents: (pc.pathComponents || []).map(c => Object.assign({}, c, {
      subpathListKey: c.subpathListKey.map(s => Object.assign({}, s, { points: s.points.map(p => {
        const q = {};
        for (const k of Object.keys(p)) {
          if (k === 'anchor' || k === 'forward' || k === 'backward') { const r = f(num(p[k].horizontal), num(p[k].vertical), p[k].horizontal._unit); q[k] = { _obj: 'paint', horizontal: { _unit: r[2], _value: r[0] }, vertical: { _unit: r[2], _value: r[1] } }; }
          else q[k] = p[k];
        }
        return q;
      }) }))
    })) };
  }
  const toPx = pc => mapPC(pc, (x, y, u) => u === 'distanceUnit' ? [x * doc.resolution / 72, y * doc.resolution / 72, 'pixelsUnit'] : [x, y, 'pixelsUnit']);
  const outUnits = pc => SIM.units === 'distanceUnit' ? mapPC(pc, (x, y) => [x * 72 / doc.resolution, y * 72 / doc.resolution, 'distanceUnit']) : pc;
  function pcBBox(pc) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of pc.pathComponents) for (const s of c.subpathListKey) {
      const P = s.points, n = P.length;
      for (let i = 0; i < n; i++) {
        const A = P[i], B = P[(i + 1) % n];
        const a = [num(A.anchor.horizontal), num(A.anchor.vertical)], f = [num(A.forward.horizontal), num(A.forward.vertical)], b = [num(B.backward.horizontal), num(B.backward.vertical)], e = [num(B.anchor.horizontal), num(B.anchor.vertical)];
        for (let t = 0; t <= 1.0001; t += 0.125) {
          const u = 1 - t;
          const x = u * u * u * a[0] + 3 * u * u * t * f[0] + 3 * u * t * t * b[0] + t * t * t * e[0];
          const y = u * u * u * a[1] + 3 * u * u * t * f[1] + 3 * u * t * t * b[1] + t * t * t * e[1];
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    return { left: x0, top: y0, right: x1, bottom: y1 };
  }
  function pathOf(pc, scale) {
    const p = new Path2D();
    for (const c of pc.pathComponents) for (const s of c.subpathListKey) {
      const P = s.points, n = P.length;
      if (!n) continue;
      const X = q => num(q.horizontal) * scale, Y = q => num(q.vertical) * scale;
      p.moveTo(X(P[0].anchor), Y(P[0].anchor));
      for (let i = 0; i < n; i++) {
        const A = P[i], B = P[(i + 1) % n];
        if (i === n - 1 && s.closedSubpath === false) break;
        p.bezierCurveTo(X(A.forward), Y(A.forward), X(B.backward), Y(B.backward), X(B.anchor), Y(B.anchor));
      }
      p.closePath();
    }
    return p;
  }

  // ---------------------------------------------------------------- capas
  class Layer {
    constructor(kind, name) {
      this.id = nextId++; this.kind = kind; this._name = name; this._visible = true; this._opacity = 100; this.blendMode = 'normal';
      this.parent = null; this._sel = false; this._children = kind === 'group' ? [] : null; this._patches = []; this._M = [1, 0, 0, 1, 0, 0]; this._v = 0;
    }
    get name() { return this._name; } set name(v) { needModal('name'); this._name = v; }
    get visible() { return this._visible; } set visible(v) { needModal('visible'); this._visible = !!v; }
    get opacity() { return this._opacity; } set opacity(v) { needModal('opacity'); this._opacity = v; }
    get blend() { return this.blendMode; }
    get layers() { return this._children; }
    get bounds() { return boundsOf(this); }
    get boundsNoEffects() { return boundsOf(this); }
    delete() { needModal('delete'); removeLayer(this); }
    async duplicate() {
      needModal('duplicate');
      const c = new Layer(this.kind, this._name + ' copia');
      c._t = this._t ? JSON.parse(JSON.stringify(this._t)) : null; c._M = this._M.slice(); c._path = this._path; c._color = this._color;
      c._patches = this._patches.slice(); c._visible = this._visible; c._opacity = this._opacity;
      const sib = siblings(this); sib.splice(sib.indexOf(this), 0, c); c.parent = this.parent;
      return c;
    }
    move(rel, where) {
      needModal('move');
      if (rel === this) return;
      const sib = siblings(this); sib.splice(sib.indexOf(this), 1);
      if (where === 'placeInside' && rel.kind === 'group') { rel._children.unshift(this); this.parent = rel; return; }
      const rs = siblings(rel); const i = rs.indexOf(rel);
      rs.splice(where === 'placeAfter' ? i + 1 : i, 0, this); this.parent = rel.parent;
    }
    async scale(sx, sy) { needModal('scale'); const b = boundsOf(this); this._tf(sx / 100, 0, 0, sy / 100, (b.left + b.right) / 2, (b.top + b.bottom) / 2); }
    async rotate(deg) { needModal('rotate'); const b = boundsOf(this); const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); this._tf(c, s, -s, c, (b.left + b.right) / 2, (b.top + b.bottom) / 2); }
    async translate(dx, dy) { needModal('translate'); this._tf(1, 0, 0, 1, 0, 0, num(dx), num(dy)); }
    _tf(a, b, c, d, cx, cy, tx, ty) {
      if (this.kind === 'group') { for (const k of this._children) k._tf(a, b, c, d, cx, cy, tx, ty); return; }
      const M = this._M;
      // M' = T(c) L T(-c) M  (+ traslación)
      const n = [a * M[0] + c * M[1], b * M[0] + d * M[1], a * M[2] + c * M[3], b * M[2] + d * M[3], a * (M[4] - cx) + c * (M[5] - cy) + cx, b * (M[4] - cx) + d * (M[5] - cy) + cy];
      if (tx) n[4] += tx; if (ty) n[5] += ty;
      this._M = n; this._v++; this._cache = null;
      if (this.kind === 'pixel' && this._patches.length) this._patches.forEach(p => { p.x += tx || 0; p.y += ty || 0; });
    }
    async rasterize() { needModal('rasterize'); }
  }
  function siblings(l) { return l.parent ? l.parent._children : doc._top; }
  function allLayers() { const out = []; const w = ls => { for (const l of ls) { out.push(l); if (l._children) w(l._children); } }; w(doc._top); return out; }
  function removeLayer(l) {
    const sib = siblings(l); const i = sib.indexOf(l); if (i < 0) return;
    sib.splice(i, 1);
    if (l._sel) { l._sel = false; const nb = sib[i] || sib[i - 1]; if (nb) nb._sel = true; }
  }
  function insertAbove(l) {
    const act = allLayers().filter(x => x._sel);
    const top = act[0];
    for (const x of allLayers()) x._sel = false;
    if (top) { const sib = siblings(top); sib.splice(sib.indexOf(top), 0, l); l.parent = top.parent; }
    else { doc._top.unshift(l); l.parent = null; }
    l._sel = true;
  }
  function textOutlines(l) {
    if (l._cache) return l._cache;
    const t = l._t;
    const r = FT.layout({ text: t.text, ranges: t.ranges, x: t.x, y: t.y, leadingPx: t.leadingPx, align: t.align, res: doc.resolution, unit: 'pixelsUnit', withChars: true });
    const M = l._M;
    const pc = mapPC(r, (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5], 'pixelsUnit']);
    l._cache = { pc, chars: r.chars };
    return l._cache;
  }
  function boundsOf(l) {
    let b = null;
    if (l.kind === 'text') b = pcBBox(textOutlines(l).pc);
    else if (l._path) b = pcBBox(l._path);
    else if (l.kind === 'group') {
      for (const c of l._children) { const q = boundsOf(c); if (!isFinite(q.left)) continue; b = b ? { left: Math.min(b.left, q.left), top: Math.min(b.top, q.top), right: Math.max(b.right, q.right), bottom: Math.max(b.bottom, q.bottom) } : q; }
    } else if (l._patches.length) {
      for (const p of l._patches) { const q = { left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + p.h }; b = b ? { left: Math.min(b.left, q.left), top: Math.min(b.top, q.top), right: Math.max(b.right, q.right), bottom: Math.max(b.bottom, q.bottom) } : q; }
    }
    if (!b || !isFinite(b.left)) b = { left: 0, top: 0, right: 0, bottom: 0 };
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.right - b.left, height: b.bottom - b.top };
  }

  class Doc {
    constructor(w, h, res) { this.id = 7; this.title = 'Prueba.psd'; this.width = w; this.height = h; this.resolution = res; this.mode = 'RGBColorMode'; this.bitsPerChannel = 'bitDepth8'; this._top = []; this.workPath = null; this.targetPath = null; this.selection = null; }
    get layers() { return this._top; }
    get activeLayers() { return allLayers().filter(l => l._sel); }
    async createPixelLayer(o) { needModal('createPixelLayer'); const l = new Layer('pixel', (o && o.name) || 'Capa'); insertAbove(l); return l; }
    async createLayerGroup(o) {
      needModal('createLayerGroup');
      const g = new Layer('group', o.name || 'Grupo');
      const from = o.fromLayers || [];
      const first = from[0];
      const sib = first ? siblings(first) : doc._top;
      const idx = first ? Math.min(...from.map(l => siblings(l).indexOf(l))) : 0;
      sib.splice(idx, 0, g); g.parent = first ? first.parent : null;
      for (const l of from) { const s = siblings(l); s.splice(s.indexOf(l), 1); g._children.push(l); l.parent = g; }
      for (const x of allLayers()) x._sel = false; g._sel = true;
      return g;
    }
  }

  // ---------------------------------------------------------------- batchPlay
  function err(m) { return { _obj: 'error', message: m, result: -1 }; }
  function byId(id) { return allLayers().find(l => l.id === id) || null; }
  function textKeyOf(l) {
    const t = l._t, M = l._M, sc = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));
    return {
      _obj: 'textLayer', textKey: t.text,
      textStyleRange: t.ranges.map(r => ({ _obj: 'textStyleRange', from: r.from, to: r.to, textStyle: { _obj: 'textStyle', fontPostScriptName: r.font, size: { _unit: 'pointsUnit', _value: r.reqPt != null ? r.reqPt : pxToPt(r.sizePx) }, impliedFontSize: { _unit: 'pointsUnit', _value: (r.reqPt != null ? r.reqPt : pxToPt(r.sizePx)) * sc }, color: rgbOf(r.color) } })),
      paragraphStyleRange: [{ _obj: 'paragraphStyleRange', from: 0, to: t.text.length, paragraphStyle: { _obj: 'paragraphStyle', align: { _enum: 'alignmentType', _value: t.align } } }],
      transform: { _obj: 'transform', xx: M[0], xy: M[1], yx: M[2], yy: M[3], tx: 0, ty: 0 }
    };
  }
  function rangesFrom(tsr, oldRanges) {
    return tsr.map(r => {
      const ts = r.textStyle || {};
      const old = oldRanges ? oldRanges.find(o => r.from >= o.from && r.from < o.to) || oldRanges[0] : null;
      const pt = ts.size ? num(ts.size) : null;
      return {
        from: r.from, to: r.to, font: ts.fontPostScriptName || (old && old.font) || 'Poppins-Bold',
        sizePx: pt != null ? ptToPx(pt) : old.sizePx, reqPt: pt != null ? pt : old.reqPt,
        color: ts.color ? hexOf(ts.color) : old ? old.color : '#000000',
        tracking: ts.tracking ? num(ts.tracking) : 0,
        leadingPx: ts.autoLeading === false && ts.leading ? ptToPx(num(ts.leading)) : null
      };
    });
  }
  function handle(d) {
    const o = d._obj, T = d._target || [];
    const t0 = T[0] || {};
    if (o === 'get') {
      if (t0._ref === 'path' && t0._value === 'vectorMask') { const l = byId(T[1]._id); return l && l._path ? { _obj: 'path', pathContents: outUnits(l._path) } : err('sin máscara vectorial'); }
      if (t0._ref === 'path' && t0._value === 'targetEnum') return doc.targetPath ? { _obj: 'path', pathName: doc.targetPath.name, pathContents: outUnits(doc.targetPath.pc) } : err('sin trazado');
      if (t0._ref === 'path' && t0._property === 'workPath') return doc.workPath ? { _obj: 'path', pathName: 'Trazado de trabajo', pathContents: outUnits(doc.workPath) } : err('sin trazado de trabajo');
      if (t0._property === 'selection') return doc.selection ? { selection: { _obj: 'rectangle', top: { _unit: 'pixelsUnit', _value: doc.selection.top }, left: { _unit: 'pixelsUnit', _value: doc.selection.left }, bottom: { _unit: 'pixelsUnit', _value: doc.selection.bottom }, right: { _unit: 'pixelsUnit', _value: doc.selection.right } } } : {};
      if (t0._property === 'fontList') { const ks = Object.keys(FT.FONTS); return { fontList: { _obj: 'fontList', fontName: ks.map(k => k.replace(/-/g, ' ')), fontPostScriptName: ks, fontFamilyName: ks.map(k => k.split('-')[0]), fontStyleName: ks.map(k => k.split('-')[1] || 'Regular') } }; }
      if (t0._ref === 'layer' && t0._id != null) { const l = byId(t0._id); if (!l) return err('no existe'); const r = { _obj: 'layer', name: l.name, layerID: l.id }; if (l.kind === 'text') r.textKey = textKeyOf(l); return r; }
      return err('get no simulado');
    }
    needModal(o);
    if (o === 'make' && t0._ref === 'textLayer') {
      const u = d.using;
      const t = { text: String(u.textKey), x: num(u.textClickPoint.horizontal) / 100 * doc.width, y: num(u.textClickPoint.vertical) / 100 * doc.height, align: 'left', leadingPx: null };
      t.ranges = rangesFrom(u.textStyleRange || []);
      const lp = t.ranges.find(r => r.leadingPx); if (lp) t.leadingPx = lp.leadingPx;
      const ps = u.paragraphStyleRange && u.paragraphStyleRange[0];
      if (ps && ps.paragraphStyle && ps.paragraphStyle.align) t.align = ps.paragraphStyle.align._value;
      if (t.ranges.some(r => !FT.FONTS[r.font])) return err('fuente desconocida');
      const l = new Layer('text', t.text.slice(0, 30)); l._t = t;
      insertAbove(l);
      SIM.log.push('make text ' + JSON.stringify(t.text.slice(0, 20)));
      return {};
    }
    if (o === 'make' && t0._ref === 'path' && d.from && d.from._ref === 'textLayer') {
      const l = allLayers().find(x => x._sel && x.kind === 'text');
      if (!l) return err('no hay capa de texto');
      doc.workPath = textOutlines(l).pc; return {};
    }
    if (o === 'delete' && t0._ref === 'path' && t0._property === 'workPath') { doc.workPath = null; return {}; }
    if (o === 'select' && t0._ref === 'path' && t0._property === 'workPath') { if (!doc.workPath) return err('sin trazado de trabajo'); doc.pathActive = true; return {}; }
    if (o === 'make' && t0._ref === 'contentLayer') {
      if (!doc.workPath || !doc.pathActive) return err('sin trazado activo');
      const c = d.using.type.color;
      const l = new Layer('solidColor', 'Relleno de color 1');
      l._path = JSON.parse(JSON.stringify(doc.workPath)); l._color = hexOf(c);
      insertAbove(l); SIM.log.push('make shape'); return {};
    }
    if (o === 'make' && t0._ref === 'path' && d.from && d.from._ref === 'selectionClass') {
      if (!doc.selection) return err('sin selección');
      const P = doc.selPoly || [[doc.selection.left, doc.selection.top], [doc.selection.right, doc.selection.top], [doc.selection.right, doc.selection.bottom], [doc.selection.left, doc.selection.bottom]];
      const pt = q => ({ _obj: 'paint', horizontal: { _unit: 'pixelsUnit', _value: q[0] }, vertical: { _unit: 'pixelsUnit', _value: q[1] } });
      doc.workPath = { _obj: 'pathClass', pathComponents: [{ _obj: 'pathComponent', shapeOperation: { _enum: 'shapeOperation', _value: 'add' }, subpathListKey: [{ _obj: 'subpathsList', closedSubpath: true, points: P.map(q => ({ _obj: 'pathPoint', anchor: pt(q), forward: pt(q), backward: pt(q) })) }] }] };
      doc.pathActive = true; return {};
    }
    if (o === 'set' && t0._ref === 'path' && t0._property === 'workPath') { doc.workPath = toPx(d.to); doc.pathActive = true; return {}; }
    if (o === 'set' && t0._ref === 'channel' && t0._property === 'selection') { doc.selection = null; doc.selPoly = null; return {}; }
    if (o === 'set' && t0._ref === 'textLayer') {
      const l = byId(t0._id); if (!l || l.kind !== 'text') return err('no es texto');
      if (d.to.textKey != null) l._t.text = String(d.to.textKey);
      if (d.to.textStyleRange) l._t.ranges = rangesFrom(d.to.textStyleRange, l._t.ranges);
      l._cache = null; return {};
    }
    if (o === 'select' && t0._ref === 'layer') {
      const l = byId(t0._id); if (!l) return err('no existe');
      if (!(d.selectionModifier && d.selectionModifier._value === 'addToSelection')) for (const x of allLayers()) x._sel = false;
      l._sel = true; return {};
    }
    if (o === 'rasterizeLayer') return {};
    if (o === 'copyEffects') return err('la capa no tiene efectos');
    if (o === 'pasteEffects') return err('nada que pegar');
    if (o === 'showColorPicker') return { _obj: 'showColorPicker', RGBFloatColor: { _obj: 'RGBColor', red: 30.5, grain: 120.2, blue: 200.9 } };
    return err('no simulado: ' + o);
  }
  const action = {
    async batchPlay(descs) { SIM.calls += descs.length; await null; return descs.map(d => { try { return handle(d); } catch (e) { if (/Fuera de modal/.test(e.message)) throw e; return err(e.message); } }); },
    addNotificationListener(evts, cb) { SIM.notify = cb; }
  };
  const core = {
    async executeAsModal(fn, opts) {
      if (SIM.modal) throw new Error('modal ya activo');
      SIM.modal = true;
      const ctx = { hostControl: { async suspendHistory(o) { SIM.log.push('suspend ' + o.name); return 1; }, async resumeHistory(id, ok) { SIM.log.push('resume ' + ok); } }, reportProgress() {}, isCancelled: false };
      try { return await fn(ctx); } finally { SIM.modal = false; }
    }
  };
  const imaging = {
    async createImageDataFromBuffer(buf, o) { return { width: o.width, height: o.height, components: o.components, colorSpace: o.colorSpace, _buf: buf, dispose() {}, async getData() { return buf; } }; },
    async putPixels(o) {
      needModal('putPixels');
      const l = byId(o.layerID); const id = o.imageData;
      if (id._buf.length !== id.width * id.height * id.components) throw new Error('tamaño de buffer incorrecto');
      const p = { x: o.targetBounds.left, y: o.targetBounds.top, w: id.width, h: id.height, comps: id.components, data: id._buf };
      if (o.replace) l._patches = [p]; else l._patches.push(p);
      SIM.log.push('putPixels ' + id.width + 'x' + id.height);
    },
    async getSelection() { throw new Error('sin selección'); },
    async getPixels() { throw new Error('no simulado'); }
  };
  const constants = {
    LayerKind: { TEXT: 'text', GROUP: 'group', PIXEL: 'pixel', SOLIDFILL: 'solidColor' },
    ElementPlacement: { PLACEBEFORE: 'placeBefore', PLACEAFTER: 'placeAfter', PLACEINSIDE: 'placeInside' },
    AnchorPosition: { MIDDLECENTER: 'middleCenter' }, RasterizeType: { TEXTCONTENTS: 'textContents' },
    BlendMode: { NORMAL: 'normal', MULTIPLY: 'multiply' }
  };
  const app = { get activeDocument() { return doc; }, foregroundColor: { rgb: { hexValue: '2a6f97' } }, fonts: [] };
  const PS = { app, core, action, imaging, constants };
  window.require = name => { if (name === 'photoshop') return PS; if (name === 'uxp') return { entrypoints: { setup() {} } }; throw new Error('módulo ' + name); };

  // ---------------------------------------------------------------- utilidades de prueba
  SIM.newDoc = (w, h, res) => { doc = new Doc(w, h, res || 300); return doc; };
  SIM.addShape = (name, pcPx, color) => { const l = new Layer('solidColor', name); l._path = pcPx; l._color = color || '#e8dfcc'; SIM.modal = true; insertAbove(l); SIM.modal = false; return l.id; };
  SIM.addText = (spec) => { const l = new Layer('text', spec.name || spec.text.slice(0, 30)); l._t = { text: spec.text, x: spec.x, y: spec.y, align: spec.align || 'left', leadingPx: spec.leadingPx || null, ranges: spec.ranges.map(r => Object.assign({ tracking: 0 }, r)) }; SIM.modal = true; insertAbove(l); SIM.modal = false; return l.id; };
  SIM.group = (name, ids) => { SIM.modal = true; try { const ls = ids.map(byId); const sib = siblings(ls[0]); const g = new Layer('group', name); sib.splice(sib.indexOf(ls[0]), 0, g); g.parent = ls[0].parent; for (const l of ls) { const s2 = siblings(l); s2.splice(s2.indexOf(l), 1); g._children.push(l); l.parent = g; } return g.id; } finally { SIM.modal = false; } };
  SIM.rotate = (id, deg) => { SIM.modal = true; try { const l = byId(id); const b = boundsOf(l); const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); l._tf(c, s, -s, c, (b.left + b.right) / 2, (b.top + b.bottom) / 2); } finally { SIM.modal = false; } };
  SIM.select = (...ids) => { for (const x of allLayers()) x._sel = false; for (const id of ids) { const l = byId(id); if (l) l._sel = true; } };
  SIM.setTargetPath = (name, pcPx) => { doc.targetPath = pcPx ? { name, pc: pcPx } : null; };
  SIM.layer = id => byId(id);
  const mapShape = (id, f) => { const l = byId(id); l._path = mapPC(l._path, (x, y) => { const r = f(x, y); return [r[0], r[1], 'pixelsUnit']; }); };
  const shapeC = id => { const b = pcBBox(byId(id)._path); return [(b.left + b.right) / 2, (b.top + b.bottom) / 2]; };
  SIM.rotateShape = (id, deg) => { const [cx, cy] = shapeC(id), a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); mapShape(id, (x, y) => [cx + c * (x - cx) - s * (y - cy), cy + s * (x - cx) + c * (y - cy)]); };
  SIM.flipShape = (id, how) => { const [cx, cy] = shapeC(id); mapShape(id, (x, y) => how === 'h' ? [2 * cx - x, y] : [x, 2 * cy - y]); };
  SIM.moveShape = (id, dx, dy) => mapShape(id, (x, y) => [x + dx, y + dy]);
  SIM.warpShape = (id, ax, ay) => { const [cx, cy] = shapeC(id); mapShape(id, (x, y) => [x + ax * Math.sin((y - cy) / 150), y + ay * Math.sin((x - cx) / 300)]); };
  SIM.setSelection = (poly) => { if (!poly) { doc.selection = null; doc.selPoly = null; return; } let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } doc.selection = { left: x0, top: y0, right: x1, bottom: y1 }; doc.selPoly = poly; };
  SIM.byName = (re) => allLayers().filter(l => new RegExp(re).test(l.name)).map(l => l.id);
  SIM.tree = () => { const out = []; const w = (ls, d) => { for (const l of ls) { out.push('  '.repeat(d) + (l._sel ? '*' : ' ') + (l._visible ? ' ' : '(oculta) ') + '[' + l.kind + '] ' + l.name + (l._patches.length ? ' {' + l._patches.length + ' parches}' : '')); if (l._children) w(l._children, d + 1); } }; w(doc._top, 0); return out.join('\n'); };
  SIM.doc = () => doc;
  SIM.render = (scale) => {
    const s = scale || 0.25;
    const cv = document.createElement('canvas'); cv.width = Math.round(doc.width * s); cv.height = Math.round(doc.height * s);
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);
    const draw = (ls) => {
      for (let i = ls.length - 1; i >= 0; i--) {
        const l = ls[i];
        if (!l._visible) continue;
        g.globalAlpha = (l._opacity == null ? 100 : l._opacity) / 100;
        if (l.kind === 'group') { draw(l._children); continue; }
        if (l._path) { g.fillStyle = l._color; g.fill(pathOf(l._path, s), 'nonzero'); }
        if (l.kind === 'text') {
          const { pc, chars } = textOutlines(l);
          pc.pathComponents.forEach((c, k) => {
            const ci = chars[k]; const r = l._t.ranges.find(q => ci >= q.from && ci < q.to) || l._t.ranges[0];
            g.fillStyle = r.color; g.fill(pathOf({ pathComponents: [c] }, s), 'nonzero');
          });
        }
        for (const p of l._patches) {
          const id = new ImageData(p.w, p.h);
          if (p.comps === 4) id.data.set(p.data);
          else for (let k = 0; k < p.w * p.h; k++) { id.data[4 * k] = id.data[4 * k + 1] = id.data[4 * k + 2] = p.data[2 * k]; id.data[4 * k + 3] = p.data[2 * k + 1]; }
          const tc = document.createElement('canvas'); tc.width = p.w; tc.height = p.h; tc.getContext('2d').putImageData(id, 0, 0);
          g.save(); g.scale(s, s); g.drawImage(tc, p.x, p.y); g.restore();
        }
      }
      g.globalAlpha = 1;
    };
    draw(doc._top);
    return cv.toDataURL('image/png');
  };
})();
