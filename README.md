# A mano · plugin de Photoshop

- `CONTEXTO_A_MANO.md`: todo el historial, decisiones, arquitectura y pendientes. **Leer primero.**
- `dist/`: el .ccx listo para instalar y el LEEME para el usuario.
- `js/`: código (se une en un solo main.js con `python3 tools/build.py`).
- `src/`: index.html, styles.css, manifest.json, LEEME.txt.
- `icons/`, `tools/build.py`.
- `tests/`: motor de texto falso (fakeText + otf), Photoshop simulado (`tests/sim/psim.js`) y pruebas de extremo a extremo (`tests/sim/harness.js`).
- `referencias/`: los carteles de referencia del usuario.
- `estado_actual.png`: cómo salen las pruebas ahora.
