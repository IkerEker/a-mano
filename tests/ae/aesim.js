// After Effects simulado (para el navegador de pruebas): objetos de ExtendScript que usa host.jsx, disco en memoria
// y el puente CEP. No es After Effects: comprueba que el panel y host.jsx se entienden y qué le piden.
(function () {
  const files = new Map(), dirs = new Set(['/']);
  const norm = p => String(p).replace(/\\/g, '/').replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
  const fsm = {
    mkdirSync(p) { p = norm(p); const parts = p.split('/'); for (let i = 2; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/')); },
    writeFileSync(p, data) { files.set(norm(p), data.slice ? data.slice() : data); },
    copyFileSync(a, b) { files.set(norm(b), files.get(norm(a))); },
    existsSync(p) { p = norm(p); return files.has(p) || dirs.has(p); },
    readdirSync(p) { p = norm(p) + '/'; const out = new Set(); for (const k of [...files.keys(), ...dirs]) if (k.indexOf(p) === 0 && k.length > p.length) out.add(k.slice(p.length).split('/')[0]); return [...out].sort(); },
    statSync(p) { p = norm(p); return { isDirectory: () => dirs.has(p) }; },
    unlinkSync(p) { files.delete(norm(p)); },
    rmdirSync(p) { dirs.delete(norm(p)); }
  };
  const pathm = { join() { return norm(Array.prototype.join.call(arguments, '/')); }, resolve(p) { return norm(p); } };
  const mods = { fs: fsm, path: pathm, os: { homedir: () => '/Users/sim' } };
  window.require = name => { if (mods[name]) return mods[name]; throw new Error('sin módulo ' + name); };

  // ---- objetos de After Effects
  const log = [];
  function Prop(v) { this.value = v; this.expression = ''; this.numKeys = 0; this.keys = []; }
  Prop.prototype.setValue = function (v) { this.value = v; };
  Prop.prototype.setValueAtTime = function (t, v) { this.keys.push({ time: t, value: v }); this.keys.sort((a, b) => a.time - b.time); this.numKeys = this.keys.length; };
  function Layer(comp, source) {
    this.comp = comp; this.source = source; this.name = source ? source.name : 'capa'; this.comment = ''; this.selected = false;
    this.startTime = 0; this.inPoint = 0; this.outPoint = source ? source.duration : comp.duration; this.timeRemapEnabled = false; this.blendingMode = 'NORMAL';
    this.width = source ? source.width : comp.width; this.height = source ? source.height : comp.height;
    const tg = { 'ADBE Position': new Prop([comp.width / 2, comp.height / 2]), 'ADBE Anchor Point': new Prop([this.width / 2, this.height / 2]), 'ADBE Scale': new Prop([100, 100]) };
    this.props = { 'ADBE Transform Group': { property: n => tg[n] }, 'ADBE Time Remapping': new Prop(0), 'ADBE Marker': new Prop(null) };
  }
  Layer.prototype.property = function (n) { return this.props[n]; };
  Layer.prototype.replaceSource = function (item) { this.source.users.delete(this); this.source = item; item.users.add(this); this.width = item.width; this.height = item.height; log.push('replaceSource'); };
  Layer.prototype.sourceRectAtTime = function () { return { left: 0, top: 0, width: this.width, height: this.height }; };
  function ShapeLayer() { }
  function SolidSource() { }
  function Item(name) { this.name = name; this.parentFolder = null; this.users = new Set(); const me = this; Object.defineProperty(this, 'usedIn', { get() { return [...me.users]; } }); }
  Item.prototype.remove = function () { const i = project.list.indexOf(this); if (i >= 0) project.list.splice(i, 1); log.push('remove ' + this.name); };
  function FolderItem(name) { Item.call(this, name); } FolderItem.prototype = Object.create(Item.prototype);
  function FootageItem(name) { Item.call(this, name); } FootageItem.prototype = Object.create(Item.prototype);
  function CompItem(w, h, fps, dur) {
    Item.call(this, 'Comp 1'); this.width = w; this.height = h; this.frameRate = fps; this.duration = dur; this.time = 0; this.list = [];
    const me = this;
    this.layers = { add(item) { const L = new Layer(me, item); item.users.add(L); me.list.unshift(L); log.push('layers.add'); return L; } };
    Object.defineProperty(this, 'numLayers', { get() { return me.list.length; } });
    Object.defineProperty(this, 'selectedLayers', { get() { return me.list.filter(l => l.selected); } });
  }
  CompItem.prototype = Object.create(Item.prototype);
  CompItem.prototype.layer = function (i) { return this.list[i - 1]; };
  const root = new FolderItem('Raíz');
  const project = {
    file: null, list: [], rootFolder: root, activeItem: null,
    item(i) { return this.list[i - 1]; },
    items: { addFolder(n) { const f = new FolderItem(n); f.parentFolder = root; project.list.push(f); return f; } },
    importFile(io) {
      const dir = io.file.fsName.replace(/\/[^/]*$/, ''), names = fsm.readdirSync(dir);
      if (!io.sequence) throw new Error('se esperaba una secuencia');
      const it = new FootageItem(names[0]);
      const png = files.get(io.file.fsName), dv = new DataView(png.buffer, png.byteOffset);
      it.width = dv.getUint32(16); it.height = dv.getUint32(20); it.frames = names.length;
      it.mainSource = { file: { parent: { fsName: dir } }, conformFrameRate: 30, alphaMode: '' };
      Object.defineProperty(it, 'duration', { get() { return it.frames / it.mainSource.conformFrameRate; } });
      Object.defineProperty(it, 'frameDuration', { get() { return 1 / it.mainSource.conformFrameRate; } });
      it.parentFolder = root; project.list.push(it); log.push('importFile ' + names.length);
      return it;
    }
  };
  Object.defineProperty(project, 'numItems', { get() { return project.list.length; } });
  function File(p) { this.fsName = norm(p); this.exists = files.has(this.fsName); this.parent = { fsName: this.fsName.replace(/\/[^/]*$/, '') }; }
  function ImportOptions(f) { this.file = f; this.sequence = false; }
  ImportOptions.prototype.canImportAs = () => true;
  function MarkerValue(c) { this.comment = c; }
  let undo = 0;
  Object.assign(window, {
    app: { project, beginUndoGroup() { undo++; }, endUndoGroup() { undo--; } },
    CompItem, FolderItem, FootageItem, ShapeLayer, SolidSource, File, ImportOptions, MarkerValue,
    ImportAsType: { FOOTAGE: 'FOOTAGE' }, AlphaMode: { STRAIGHT: 'STRAIGHT' }, BlendingMode: { MULTIPLY: 'MULTIPLY', NORMAL: 'NORMAL' }
  });
  window.__adobe_cep__ = {
    evalScript(script, cb) { let r; try { r = String((0, eval)(script)); } catch (e) { console.error('evalScript: ' + e.message); r = 'EvalScript error.'; } setTimeout(() => cb(r), 0); },
    getSystemPath() { return 'file:///ext'; }
  };
  window.AESIM = {
    files, log, project, undoDepth: () => undo,
    newComp(w, h, fps, dur) { const c = new CompItem(w, h, fps, dur); project.list.push(c); project.activeItem = c; return c; },
    addSolid(x0, y0, x1, y1) { const c = project.activeItem, it = new FootageItem('Sólido'); it.width = x1 - x0; it.height = y1 - y0; it.duration = c.duration; it.mainSource = new SolidSource(); const L = new Layer(c, it); it.users.add(L); L.props['ADBE Transform Group'].property('ADBE Position').value = [(x0 + x1) / 2, (y0 + y1) / 2]; c.list.unshift(L); return L; },
    // evalúa la expresión de la reasignación de tiempo de una capa en un instante: devuelve el número de fotograma
    frameAt(L, time) {
      const mk = L.props['ADBE Marker'];
      const thisLayer = { source: L.source, marker: { numKeys: mk.numKeys, key: i => mk.keys[i - 1] } }, thisComp = { frameDuration: 1 / L.comp.frameRate };
      const v = new Function('thisLayer', 'thisComp', 'inPoint', 'outPoint', 'time', 'return eval(' + JSON.stringify(L.props['ADBE Time Remapping'].expression) + ')')(thisLayer, thisComp, L.inPoint, L.outPoint, time);
      return Math.floor(v / L.source.frameDuration + 1e-6);
    }
  };
})();
