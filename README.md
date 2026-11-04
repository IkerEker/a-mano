# A mano · plugin de Photoshop

- `CONTEXTO_A_MANO.md`: todo el historial, decisiones, arquitectura y pendientes. **Leer primero.**
- `dist/`: el .ccx listo para instalar y el LEEME para el usuario.
- `js/`: código (se une en un solo main.js con `python3 tools/build.py`).
  - `texdata.js` y `fontdata.js` son generados (no editar a mano).
  - `skeleton.js`: las letras dibujadas trazo a trazo; `fonts.js`: los 8 estilos; `calco.js`: calco guiado; `autofit.js`: autoencajar letra a letra.
- `src/`: index.html, styles.css, manifest.json, LEEME.txt, LICENCIAS.txt.
- `TRAZOS/`: trazos reales y generados que manda el usuario (fuente de las texturas).
- `fonts/svg/`: fuentes de trazo único de partida (EMS y Hershey).
- `tools/`: `build.py` (empaqueta), `extract_textures.py` (TRAZOS → js/texdata.js),
  `make_fonts.py` (fonts/svg → js/fontdata.js), `png.js` (PNG para vistas previas).
- `tests/`: Photoshop simulado y pruebas de extremo a extremo (`tests/sim`), vista previa sin Photoshop
  (`tests/node/preview.js`).
- `referencias/`: carteles de referencia del usuario.
- `estado_actual.png`: muestra de cómo sale ahora.
