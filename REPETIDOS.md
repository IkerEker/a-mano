# REPETIDOS · A mano

Comprobado el 20-11-2026 contra `Biblioteca\TEXTURAS\indice\indice.json` (rama `atlas`, commit `81d455d`): md5 de cada
imagen, vídeo y fuente de la rama `main` (commit de la 2.38.1).

**Repetidos: 0.** Las carpetas de material (`TRAZOS/`, 80 imágenes, 165 MB, y las 4 fotos de `referencias/texturas/`)
ya se quitaron en la 2.38.1; la construcción las lee por id (`or:<md5>`) de la biblioteca. El historial de git las conserva.

## Lo que queda en el repo y NO está en la biblioteca

| Carpeta | Archivos | Peso | Qué es | Qué se hace |
|---|---|---|---|---|
| `referencias/tipos/` | 19 | 11,6 MB | muestras de letra; las lee `tools/glyphref.py` para generar `js/refglyphs.js` | **pedido a la biblioteca**; se quedan aquí hasta que tengan id |
| `referencias/*.png, *.jpg` | 15 | 4,2 MB | referencias visuales que no lee ningún programa | pedido a la biblioteca (opcional) |
| `referencias/texturas/_grumos_recortados.png` | 1 | 0,3 MB | hoja de control generada por `tools/grumos.py` | se queda (es una salida, no material) |
| `fonts/svg/` | 6 | 0,3 MB | fuentes de trazo único (EMS, Hershey; licencias en `src/LICENCIAS.txt`), entrada de `tools/make_fonts.py` | se quedan (entrada de construcción de la tipografía) |
| `icons/` | 4 | — | iconos del panel | se quedan (van dentro del `.ccx`) |
| `*.png` de la raíz | 12 | 11,6 MB | imágenes de prueba de versiones anteriores | se quedan (salidas de prueba) |
| `dist_ae/a_mano_ae_prueba.mp4` | 1 | 0,1 MB | vídeo de prueba del panel de After Effects | se queda |
