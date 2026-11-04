#!/usr/bin/env python3
"""Empaqueta A mano: une los módulos en un solo main.js y genera el .ccx (python3 tools/build.py)"""
import os, re, zipfile, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js')
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'dist')
MODS = ['rng', 'raster', 'geom', 'glyphs', 'render', 'strokes', 'texdata', 'ink', 'skeleton', 'fontdata', 'fonts', 'calco', 'hand', 'handmade', 'instances', 'shapes', 'layout', 'writer', 'ps', 'main']

def bundle():
    parts = ["'use strict';", '(function () {', '  const __mods = {}, __cache = {};',
             '  function __req(name) {',
             "    if (name.charAt(0) !== '.') return require(name);",
             "    const key = name.replace(/^.*\\//, '').replace(/\\.js$/, '');",
             '    if (__cache[key]) return __cache[key].exports;',
             "    if (!__mods[key]) throw new Error('Módulo no encontrado: ' + name);",
             '    const module = { exports: {} }; __cache[key] = module;',
             '    __mods[key](module, module.exports, __req);',
             '    return module.exports;', '  }']
    for m in MODS:
        src = open(os.path.join(JS, m + '.js'), encoding='utf-8').read()
        src = re.sub(r"^'use strict';\s*", '', src)
        # comprobar que solo se piden módulos incluidos
        for req in re.findall(r"require\('(\.[^']+)'\)", src):
            k = re.sub(r'^.*/', '', req).replace('.js', '')
            if k not in MODS: sys.exit('falta el módulo ' + k + ' (pedido por ' + m + ')')
        parts.append("  __mods['%s'] = function (module, exports, require) {" % m)
        parts.append(src.rstrip())
        parts.append('  };')
    parts.append("  try { __req('./main'); } catch (e) { try { console.error(e); const s = document.getElementById('status'); if (s) { s.textContent = 'Error al cargar: ' + (e && e.message); s.className = 'status err'; } } catch (x) { } }")
    parts.append('})();')
    return '\n'.join(parts) + '\n'

def main():
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    stage = os.path.join(OUT, 'plugin')
    os.makedirs(os.path.join(stage, 'icons'))
    for f in ['index.html', 'styles.css', 'manifest.json', 'LEEME.txt', 'LICENCIAS.txt']:
        shutil.copy(os.path.join(SRC, f), os.path.join(stage, f))
    for f in os.listdir(os.path.join(ROOT, 'icons')):
        shutil.copy(os.path.join(ROOT, 'icons', f), os.path.join(stage, 'icons', f))
    open(os.path.join(stage, 'main.js'), 'w', encoding='utf-8').write(bundle())
    import json
    ver = json.load(open(os.path.join(SRC, 'manifest.json')))['version']
    ccx = os.path.join(OUT, 'A_mano_v%s.ccx' % ver)
    with zipfile.ZipFile(ccx, 'w', zipfile.ZIP_DEFLATED) as z:
        for dp, dn, fn in os.walk(stage):
            for f in sorted(fn):
                full = os.path.join(dp, f)
                z.write(full, os.path.relpath(full, stage))
    shutil.copy(os.path.join(SRC, 'LEEME.txt'), os.path.join(OUT, 'LEEME.txt'))
    print(ccx, os.path.getsize(ccx), 'bytes')

if __name__ == '__main__':
    main()
