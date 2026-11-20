# A mano · reglas para Claude

Plugin UXP de Photoshop que escribe texto a mano (y panel de After Effects en `ae/`). Todo en español: respuestas,
interfaz, comentarios, commits y documentos. Contexto completo: `CONTEXTO_A_MANO.md` y `TRASPASO.md`.
Ficha de texturas: `TEXTURAS_A_MANO.md`.

## Biblioteca y velocidad (orden de Iker, 20-11-2026; texto completo: TEXTURAS/plugins/ORDEN_PLUGINS.md)
- Material SOLO de la biblioteca IkerEker/TEXTURAS (rama atlas) + Biblioteca/ local (TEXTURAS_ROOT). Nada de bancos propios.
- Buscar SIEMPRE con TEXTURAS/tools/atlas/buscar.py v3 y el método de Biblioteca/CLAUDE.md: 2–4 palabras --ver →
  ≥3 búsquedas desde lados distintos + filtro de papel (--tileable/--alfa/--clase) → mirar la hoja → elegir con
  VARIEDAD (6–12 variantes por efecto, ≥3 familias, una por familia, ACIDBITE cuenta, no copiar lo que «ya lo usa»
  otro plugin) → --plugin <yo> --apuntar ids. Nunca carpetas, catalogo.json ni el índice a mano cogiendo los primeros.
- Para lo nuevo, usar los tx: con recorte_mejorado. Pasar un efecto existente de or: a tx: = cambia el resultado
  → antes/después y sí de Iker.
- Construir leyendo por id (or:/tx:/ab:) vía indice/indice.json. El plugin lleva dentro lo que usa: funciona sin Claude ni internet.
- Si falta algo: «PEDIDO PARA LA BIBLIOTECA:» al final de la respuesta; nunca dibujarlo/descargarlo dentro del plugin.
- Prueba exacta antes y después de todo cambio; cualquier diferencia → Iker decide con antes/después.
- Velocidad: medir con el banco de pruebas en el PC de Iker; GPU donde se pueda, con camino CPU de respaldo;
  una versión GPU que no dé idéntico queda apagada hasta que Iker diga sí. Gráficas de Iker: 2 × RTX 4090 (24 GB c/u), 64 GB RAM.
- El código, las herramientas y las pruebas se quedan en este repo; solo se quitan carpetas de material ya migradas.

## Cómo se aplica aquí
- Las fotos fuente se leen por id en `tools/extract_textures.py` (lista `SOURCES`) y `tools/grumos.py` (lista `PLAN`),
  a través de `tools/biblioteca.py`. El orden de `SOURCES` forma parte del resultado: no reordenar.
- La biblioteca está en el PC de Iker en `C:\Users\ikerg\Biblioteca` (sin `TEXTURAS_ROOT`, las herramientas buscan `~/Biblioteca`).
- **Prueba exacta**:
  - `python3 tools/extract_textures.py && md5sum js/texdata.js` → `efd2021b0614bfa478f8b1e111b3aa78` (77 cintas; hasta la 2.38.0, con 88, era `182e0cdb…`)
  - `python3 tools/grumos.py && md5sum js/grumosdata.js` → `d3ca0cf24cb8a2ba3fa4b8a3869c2eba`
  - `node tests/node/huella.js` → «HUELLA IDÉNTICA» (27 renders contra `tests/node/huella_ref.json`)
  - `node tests/node/franjas.js` → «FRANJAS IDÉNTICAS» · `node tests/sim/harness.js` (67) · `node tests/ae/harness.js` (19) · `node tests/node/letras/bandtest.js gordo c` (0 distintos)
- Banco de velocidad: `banco.bat` (o `node tests/banco/banco.js`) → `tests/banco/resultado.json`.
- Rama de trabajo; no fusionar en `main` sin el OK de Iker (el 20-11-2026 dio el OK a la rama `biblioteca`).

## Casa local (orden de Iker, 20-11-2026; texto: TEXTURAS/plugins/ORDEN_CARPETA_LOCAL.md)
- El plugin vive en C:\Users\ikerg\Biblioteca\plugins\a-mano\ (git local, sin GitHub). Única carpeta conectada: Biblioteca.
- Copia de seguridad: git bundle --all en Biblioteca\plugins\_respaldos\ tras cada sesión (guardar 3).
- Material SOLO por id desde Biblioteca\TEXTURAS (buscar.py, método de la ORDEN 1); nada repetido dentro del plugin.
  Lo nuevo → «PEDIDO PARA LA BIBLIOTECA».
- No tocar otros plugins, TEXTURAS, ACIDBITE, originales ni _fuentes. Borrar solo con permiso de Iker.
- Prueba exacta antes y después de cada cambio. El plugin construido funciona solo, sin Claude ni internet.
- Sin terminal en el PC de Iker: los comandos se dejan en un `.bat` dentro de esta carpeta (`MUDANZA.bat`, `RESPALDO.bat`,
  `PRUEBAS.bat`, `banco.bat`) y los ejecuta él; cada uno escribe su informe en un `.txt` al lado.
