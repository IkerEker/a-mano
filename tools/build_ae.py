#!/usr/bin/env python3
"""Empaqueta A mano AE (panel CEP para After Effects): python3 tools/build_ae.py -> dist_ae/A_mano_AE_vX.Y.Z.zip"""
import os, re, sys, shutil, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js'); AE = os.path.join(ROOT, 'ae'); OUT = os.path.join(ROOT, 'dist_ae')
VERSION = open(os.path.join(AE, 'VERSION'), encoding='utf-8').read().strip()
MODS = ['rng', 'raster', 'geom', 'render', 'strokes', 'texdata', 'ink', 'skeleton', 'fontdata', 'refglyphs', 'fonts', 'shapes', 'autofit', 'layout', 'negativo', 'writer', 'png', 'anim', 'aemain']
ID = 'com.amano.ae'

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
        src = re.sub(r"^'use strict';\s*", '', src).replace('@VERSION@', VERSION)
        for req in re.findall(r"require\('(\.[^']+)'\)", src):
            k = re.sub(r'^.*/', '', req).replace('.js', '')
            if k not in MODS: sys.exit('falta el módulo ' + k + ' (pedido por ' + m + ')')
        parts.append("  __mods['%s'] = function (module, exports, require) {" % m)
        parts.append(src.rstrip())
        parts.append('  };')
    parts.append("  try { window.__amano = __req('./aemain'); } catch (e) { try { console.error(e); const s = document.getElementById('status'); if (s) { s.textContent = 'Error al cargar: ' + (e && e.message); s.className = 'status err'; } } catch (x) { } }")
    parts.append('})();')
    return '\n'.join(parts) + '\n'

MAC = '''#!/bin/bash
# Instala «A mano AE» en After Effects (Mac). Doble clic; si macOS no deja, clic derecho > Abrir.
cd "$(dirname "$0")"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/%s"
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
rm -rf "$DEST"
cp -R "%s" "$DEST"
for v in 9 10 11 12 13; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
killall cfprefsd 2>/dev/null
echo ""
echo "Instalado en: $DEST"
echo "Cierra After Effects del todo, vuelve a abrirlo y busca el panel en"
echo "Ventana > Extensiones > A mano   (en algunas versiones: Extensiones (heredadas))."
echo ""
read -n 1 -s -r -p "Pulsa una tecla para cerrar."
''' % (ID, ID)
WIN = '''@echo off\r
rem Instala "A mano AE" en After Effects (Windows). Doble clic.\r
set "DEST=%%APPDATA%%\\Adobe\\CEP\\extensions\\%s"\r
if exist "%%DEST%%" rmdir /s /q "%%DEST%%"\r
xcopy "%%~dp0%s" "%%DEST%%\\" /e /i /y /q >nul\r
for %%%%v in (9 10 11 12 13) do reg add "HKCU\\Software\\Adobe\\CSXS.%%%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul\r
echo.\r
echo Instalado en: %%DEST%%\r
echo Cierra After Effects del todo, vuelve a abrirlo y busca el panel en\r
echo Ventana ^> Extensiones ^> A mano   (en algunas versiones: Extensiones (heredadas)).\r
echo.\r
pause\r
''' % (ID, ID)

def main():
    # (se limpia lo empaquetado antes; el vídeo de muestra se queda)
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            full = os.path.join(OUT, f)
            if f.startswith('A_mano_AE_v'): shutil.rmtree(full) if os.path.isdir(full) else os.remove(full)
    top = os.path.join(OUT, 'A_mano_AE_v' + VERSION)
    ext = os.path.join(top, ID)
    os.makedirs(os.path.join(ext, 'CSXS'))
    man = open(os.path.join(AE, 'CSXS', 'manifest.xml'), encoding='utf-8').read().replace('@VERSION@', VERSION)
    open(os.path.join(ext, 'CSXS', 'manifest.xml'), 'w', encoding='utf-8').write(man)
    shutil.copy(os.path.join(AE, 'index.html'), ext)
    shutil.copy(os.path.join(AE, 'host.jsx'), ext)
    css = open(os.path.join(ROOT, 'src', 'styles.css'), encoding='utf-8').read() + open(os.path.join(AE, 'extra.css'), encoding='utf-8').read()
    open(os.path.join(ext, 'styles.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(ext, 'main.js'), 'w', encoding='utf-8').write(bundle())
    shutil.copy(os.path.join(ROOT, 'src', 'LICENCIAS.txt'), ext)
    leeme = open(os.path.join(AE, 'LEEME_AE.txt'), encoding='utf-8').read().replace('@VERSION@', VERSION)
    open(os.path.join(top, 'LEEME.txt'), 'w', encoding='utf-8').write(leeme)
    open(os.path.join(top, 'Instalar (Mac).command'), 'w', encoding='utf-8', newline='\n').write(MAC)
    open(os.path.join(top, 'Instalar (Windows).bat'), 'w', encoding='utf-8', newline='').write(WIN)
    os.chmod(os.path.join(top, 'Instalar (Mac).command'), 0o755)
    z = os.path.join(OUT, 'A_mano_AE_v%s.zip' % VERSION)
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for dp, dn, fn in os.walk(top):
            for f in sorted(fn):
                full = os.path.join(dp, f)
                zi = zipfile.ZipInfo.from_file(full, os.path.relpath(full, OUT))
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = (0o755 if f.endswith('.command') else 0o644) << 16
                zf.writestr(zi, open(full, 'rb').read())
    print(z, os.path.getsize(z), 'bytes')

if __name__ == '__main__':
    main()
