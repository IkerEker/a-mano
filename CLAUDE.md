# A mano · reglas para Claude

Plugin UXP de Photoshop que escribe texto a mano (y panel de After Effects en `ae/`). Todo en español: respuestas,
interfaz, comentarios, commits y documentos. Contexto completo: `CONTEXTO_A_MANO.md` y `TRASPASO.md`.
Ficha de texturas: `TEXTURAS_A_MANO.md`.

## Biblioteca y velocidad (orden de Iker, 20-11-2026; texto completo: TEXTURAS/plugins/ORDEN_PLUGINS.md)
- Material SOLO de la biblioteca IkerEker/TEXTURAS (rama atlas) + Biblioteca/ local (TEXTURAS_ROOT). Nada de bancos propios.
- Buscar SIEMPRE con el método de 7 pasos de ORDEN_PLUGINS.md (varias palabras → --resumen → abrir familias → recorrer
  clases → filtrar con --donde/--min → --parecidos → ficha + mirar la `hoja`). Incluye ab:, collage, vídeo y sonido.
  No revisar bancos enteros: las fichas ya están hechas. Releer el índice en cada conversación.
- Construir leyendo por id (or:/tx:/ab:) vía indice/indice.json. El plugin lleva dentro lo que usa: funciona sin Claude ni internet.
- Si falta algo: «PEDIDO PARA LA BIBLIOTECA:» al final de la respuesta; nunca dibujarlo/descargarlo dentro del plugin.
- Prueba exacta antes y después de todo cambio; cualquier diferencia → Iker decide con antes/después.
- Velocidad: medir con el banco de pruebas en el PC de Iker; GPU donde se pueda, con camino CPU de respaldo;
  una versión GPU que no dé idéntico queda apagada hasta que Iker diga sí. Gráficas de Iker: 2 × RTX 4090 (24 GB c/u), 64 GB RAM.
- El código, las herramientas y las pruebas se quedan en este repo; solo se quitan carpetas de material ya migradas.

## Cómo se aplica aquí
- Las fotos fuente se leen por id en `tools/extract_textures.py` (lista `SOURCES`) y `tools/grumos.py` (lista `PLAN`),
  a través de `tools/biblioteca.py`. El orden de `SOURCES` forma parte del resultado: no reordenar.
- **Prueba exacta** (con `TEXTURAS_ROOT` puesto):
  - `python3 tools/extract_textures.py && md5sum js/texdata.js` → `182e0cdba680cba58fea00c0dd254ca5`
  - `python3 tools/grumos.py && md5sum js/grumosdata.js` → `d3ca0cf24cb8a2ba3fa4b8a3869c2eba`
  - `node tests/node/huella.js` → «HUELLA IDÉNTICA» (27 renders contra `tests/node/huella_ref.json`)
  - `node tests/sim/harness.js` (67) · `node tests/ae/harness.js` (19) · `node tests/node/letras/bandtest.js gordo c` (0 distintos)
- Banco de velocidad: `banco.bat` (o `node tests/banco/banco.js`) → `tests/banco/resultado.json`.
- Rama de trabajo; no fusionar en `main` sin el OK de Iker.
