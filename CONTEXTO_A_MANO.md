# A mano · contexto completo del proyecto

Plugin de Photoshop (UXP, instalable como `.ccx`) que **escribe a mano**: genera desde cero texto escrito con
lápiz, carboncillo, boli, rotulador o pincel dentro de una forma que el usuario coloca y deforma (GENERAR), o
pinta a mano, encima, el texto de capas de texto que ya existen (CALCAR).

Este documento sirve para continuar el trabajo en una conversación nueva sin perder nada.

- Usuario: escribe en español. Las respuestas, el panel y los textos van en español.
- Versión actual: **A mano 2.0.0** (`dist/A_mano_v2.0.0.ccx`), id `com.amano.handlettering`.
- Repositorio: **github.com/IkerEker/a-mano** (privado). El usuario sube material a `TRAZOS/` desde la web.
- Cartelator es otro plugin, con su propia conversación (id `com.cartelator.handlettering`); se pueden instalar los dos.
- **Ojo:** solo se ha probado en un Photoshop simulado y en vistas previas sin Photoshop, **nunca en Photoshop de verdad**.

---

## 1. Lo que ha pedido el usuario (historial, con sus palabras)

### Antes (A mano 1.0, cuando era una pestaña de Cartelator)
- «Va muy lento y es muy pesado.» «Muchísima más variación… más loca… por palabra también.»
- «Con respecto al color y la textura, lo que has hecho es una mierda, no parecen trazos de ninguna forma.»
- «Tiene que conservar el orden del texto, la forma y el tamaño. Es hacer (pintar encima) una variación.»
- Referencias en `referencias/`: Once Upon a Time in Hollywood (sello), The Crucible (pincel), The New Pop
  (brocha con goteos), JUST DO IT (brocha), AVONAT (papel rasgado).

### 4 de noviembre de 2026: A mano pasa a ser un plugin propio y se rehace (2.0)
- «Lo primero, el plugin que has creado ya está bastante bien, así que tenlo en cuenta.»
- **Dos pestañas arriba:** «GENERAR (que generes tú la tipografía desde cero) o CALCAR (hace como lo hace
  ahora, con un texto ya generado lo calca)».
- **Forma primero:** «cuando encienda el plugin me aparezca una opción de generar forma básica… arco,
  cuadrado, una forma un poco más compleja… una forma vectorial que yo genero, que tiene esa cuadrícula dentro
  en la que puedo deformarlo… puedo girarla, ponerla boca abajo… 5 formas distintas más la opción a partir de
  la selección (lazo)».
- **Texto debajo, como en Cartelator:** «seleccionar palabras y decir: esta es importante, esta va más
  pequeña, esta es la más importante… el efecto tiene que ser como si alguien hubiese trazado varias veces esa
  palabra».
- **Estilo:** «lápiz, carboncillo, bolígrafo, rotulador y pincel… packs básicos: pincel, pincel seco, pincel
  húmedo, muy fino, muy gordo… muy pocas opciones en la ventana principal y luego la ventana secundaria con las
  opciones avanzadas».
- **Tipografía propia:** «genera tú la tipografía… más control sobre todas las curvas… mayúscula, minúscula o
  cursiva (ligada)… 4 tipografías: más infantil, más adulta, más rabiosa y otra».
- **Legibilidad:** «otro slider, LEGIBILIDAD, que la letra sea más o menos legible».
- **Sobre la versión 1 (con imágenes):**
  - Boli: «esas líneas blancas en sus curvas no me gustan nada… falta muchísimo realismo».
  - Rotulador: «mola muchísimo que cuando se monten los trazos sea más oscuro… el borde humedecido me gusta».
  - Pincel: «está muy bien… variar más desde dónde se empieza cada letra (manteniendo realista que la mayoría
    empiecen desde abajo) y evitar los lobulados en el trazo».
  - Lápiz: «es el peor. Le falta realismo y carácter».
- **TRAZOS:** el usuario ha subido ~80 imágenes (escaneos y Gemini) a `TRAZOS/`: aguadas, ceras, guache, óleo,
  lápiz, carboncillo, bolis, rotuladores, pincel seco. Se le dieron prompts de Gemini (fondo blanco plano,
  negro, 16:9, hojas de rectas, curvas, inicios/finales y repasado).

---

## 2. Cómo se usa (2.0)

**GENERAR** (de arriba abajo):
1. **Forma**: Recto, Arco, Bandera, Abanico, Círculo o Selección. Crea una capa de forma `◇ Forma · Arco`
   (naranja, 35 %). El usuario la mueve, gira, voltea o deforma con Photoshop. Si hay una selección, las formas
   se ajustan a ella; «Selección» usa la selección (lazo) como forma. Cualquier capa de forma suya también vale.
2. **Texto**: casilla + barra (pequeña · normal · importante · ¡LA MÁS!) + recuadro de palabras (chips) para
   marcarlas. Al editar el texto, cada palabra conserva su importancia.
3. **Estilo**: herramienta + pack (lápiz HB/blando/nervioso, carboncillo suave/fuerte/cera, boli BIC/fino/gel,
   rotulador fino/gordo/gastado, pincel fino/gordo/seco/húmedo) + color (toma el color frontal).
4. **Letra**: infantil, adulta, rabiosa, elegante × MAYÚSCULAS, minúsculas, cursiva.
- **Legibilidad** (garabato ↔ muy legible).
- **Escribir en la forma**: crea el grupo `✍ A mano · <texto>` con la capa de píxeles `✍ <texto>` encima de la
  forma, que pasa a opacidad 0. Volver a pulsar con el grupo seleccionado lo rehace (lee la forma tal como esté).
  **Otra variación**: otra semilla. **Mostrar/ocultar la forma**: opacidad 0 ↔ 35.
- Cada forma recuerda su texto y su estilo (localStorage `amano.shape|<doc>|<id>`): al seleccionar un grupo ya
  escrito, el panel lo recupera.

**CALCAR**: como la 1.0 (capas de texto → copia `✍ <nombre>` encima, original oculto), ahora con el motor de
pintado nuevo y las mismas herramientas; Relleno: brocha o sello (de la 1.0). Resultado imagen o editable (en
Avanzado).

**Avanzado ›**: grosor, tinta, pulso, repasado, locura, prisa, apretadas/sueltas; en GENERAR además diferencia
de tamaño entre importancias, interlineado, llenar la forma, margen y alineación; en CALCAR, resultado y grosor
(de la herramienta o de la letra).

---

## 3. Arquitectura (carpeta `js/`, se une en un solo `main.js` con `tools/build.py`)

| Módulo | Qué hace |
|---|---|
| `main.js` | Panel: pestañas, vista avanzada, ajustes (`amano.settings2`), casilla de texto con niveles, crear forma, escribir, calcar. |
| `ps.js` | Puente con Photoshop. Nuevo en 2.0: `vectorMaskOf` (lee y calibra unidades), `resolveShape` (forma/grupo desde la selección), `makeShapeLayer` (prueba px y pt y comprueba límites y máscara), `selectionToWorkPath`, `deselect`. |
| `shapes.js` | Genera las formas (anclas en orden conocido: empieza arriba a la izquierda, sentido horario) y las lee: **envolventes** (4 esquinas → parche de Coons; si está volteada no escribe en espejo: elige cambiar izq/der o arriba/abajo según hacia dónde quede «arriba») y **siluetas** (círculo con su «arriba», selección, formas libres). |
| `layout.js` | Texto → palabras con nivel (tamaño, pasadas, grosor) → cortes de línea por programación dinámica buscando la proporción de la forma → bloque dentro de la envolvente (estira hasta ×1,3) o líneas que caben en la silueta (búsqueda binaria del tamaño, prueba varias alturas de arranque). Reserva el grosor de la herramienta (`inkPad`). |
| `fonts.js` + `fontdata.js` | Tipografías de trazo. 4 personalidades (`PERSONAS`) sobre 6 fuentes base. Suavizado con esquinas, letra angulosa (rabiosa), altura de x propia, tildes de mayúscula pegadas, espaciado por el cuerpo de la letra (sin tildes), unión de cursiva. |
| `writer.js` | GENERAR: variación por línea/palabra/letra/trazo según la legibilidad, recorte de extremos en em, óvalos que no cierran, corrección de huecos tras la variación (dentro de la palabra y entre palabras), repasado, pincel que empieza por abajo, temblor, plan de trazos en px y pintado por franjas. |
| `ink.js` + `texdata.js` | **Motor de pintado**: cada trazo es una cinta continua (triángulos con coordenadas a lo largo/a lo ancho) forrada con una cinta real de `TRAZOS/`; inicio real, final real, medio sin costuras; presión (entrada/salida, ondulación, engorda al bajar); grano de papel pegado al papel; borde húmedo; carga al empezar; sequedad progresiva. Packs en `TOOLS`. |
| `hand.js` | CALCAR: variación sin mover la maqueta (de la 1.0). Los trazos se pintan con `ink.js`; brocha y sello siguen con el motor de relleno de la 1.0. |
| `strokes.js`, `glyphs.js`, `instances.js`, `handmade.js` | CALCAR (de la 1.0): esqueleto de las letras de la fuente, contornos de la capa de texto, modo editable. |
| `render.js`, `geom.js`, `raster.js`, `rng.js` | Lienzo y composición, trazados y Coons, rasterizado, azar reproducible. |

### Texturas (`tools/extract_textures.py` → `js/texdata.js`, ~1,2 MB)
- Densidad de tinta independiente del color y del papel (papel estimado a baja resolución con ventana grande).
- Cada trazo recto se endereza siguiendo su centro y se guarda como cinta (filas = a lo largo, desde el inicio).
- Familias: `aguada` (12), `cera` (8), `guache` (12), `oleo` (8), `lapiz` (10), `carbon` (10), `pincel` (14),
  `pincelfino` (5), `brocha` (2), `gastado` (8), `rotu` (8), `boli` (8). Tabla `SOURCES` = qué archivo es qué.
- Papel: grano sintético con espectro de papel de dibujo (el de las imágenes de Gemini era ruido de generación).
- Para añadir material: subirlo a `TRAZOS/`, añadirlo a `SOURCES` y `python3 tools/extract_textures.py --preview DIR`
  (tarda unos 2 minutos; mirar las hojas `fam_*.png`).

### Tipografías (`tools/make_fonts.py` → `js/fontdata.js`, ~125 KB)
- Base: EMS Readability (infantil), EMS Tech (adulta; de *Architects Daughter*), EMS Felix (rabiosa),
  EMS Elfin (elegante), Hershey Script (cursiva de las tres primeras), EMS Allure (cursiva elegante).
  Licencias en `src/LICENCIAS.txt` (SIL OFL / Hershey). SVG en `fonts/svg/` (de github.com/techninja/hersheytextjs).
- El conversor une tramos partidos, da dirección de escritura (vertical de arriba abajo, horizontal de izquierda a
  derecha, óvalos antihorarios desde arriba a la derecha; las cursivas conservan su orden), parte en los picos
  muy cerrados (V, M, N) y ordena (cuerpo primero, tildes y puntos al final).

### Photoshop (`ps.js`): llamadas nuevas en 2.0
- `set` workPath con `pathContents` (unidades px; si los límites no casan, se repite en pt), `select` workPath,
  `make contentLayer` con `solidColorLayer` (crea la capa de forma con la máscara vectorial del trazado activo),
  `delete` workPath; todo dentro de `withWorkPath`, que restaura el trazado del usuario.
- `make path from selectionClass` (tolerancia 2 px) para «Selección»; `set selection to none`.
- `get` de `path vectorMask` de la capa para leer la forma; calibración de unidades con los límites de la capa.
- DOM: `doc.createLayerGroup({ name, fromLayers })`, `layer.move(..., PLACEBEFORE)`, `opacity`, `name`, `delete`.
- Todo dentro de `runModal` (un paso de historial; si falla, se deshace).

---

## 4. Pruebas

Requisitos: Node 22, Python 3 con numpy/scipy/Pillow, Playwright con Chromium y las fuentes del sistema
(rutas en `tests/fakeText.js`).

```bash
python3 tools/build.py              # dist/plugin y dist/A_mano_v2.0.0.ccx
node tests/sim/buildsim.js          # tests/sim/sim.js (Photoshop simulado + fuentes)
node tests/sim/harness.js           # panel real en Chromium + Photoshop simulado; imágenes en tests/sim/out/
node tests/node/preview.js DIR      # vista previa sin Photoshop: todos los packs en una forma (PNG)
python3 tests/node/sheet.py DIR hoja.png 2 800   # hoja de contactos
```

- `psim.js` simula ahora también: capa de forma desde el trazado de trabajo, trazado desde la selección
  (`SIM.setSelection(poligono)`), y girar/voltear/mover/deformar formas (`SIM.rotateShape`, `flipShape`,
  `moveShape`, `warpShape`).
- `harness.js` (34 comprobaciones): las 5 formas con herramientas y letras distintas, selección de lazo (y aviso sin
  selección), forma girada/volteada/deformada y reescrita (queda un solo resultado), otra variación, avisos sin
  forma y sin texto, los 16 packs, CALCAR con 5 herramientas + brocha + sello (sin copias duplicadas), otra
  variación, volver al original, editable, grupo con texto girado, aviso sin selección y 16 bits.
- Último resultado: **34/34 bien, sin errores de modal**; 0,1–0,3 s por escritura (1 s el primer calco).

---

## 5. Pendiente e ideas

1. **Probar en Photoshop real**, sobre todo:
   - crear la capa de forma (`make contentLayer` con el trazado activo) y sus unidades;
   - leer la máscara vectorial después de **Deformar** (si Photoshop añade anclas, `quadFromSub` busca las 4
     esquinas más marcadas; si falla, cae a `G.analyzeShape`);
   - `make path` desde la selección; `createLayerGroup` con `fromLayers`; mover la capa dentro del grupo;
   - el selector de texto (`selectionStart` de la casilla) en UXP (si no funciona, los chips sí).
2. CALCAR: el esqueleto de algunas letras (b, n, M, N) sale raro con boli/rotulador (viene de la 1.0).
3. Goteo de la brocha (The New Pop) y papel rasgado (AVONAT): aún no.
4. Más carácter: variantes de letra (2–3 por carácter) en vez de solo deformarlas; ligaduras de cursiva entre
   mayúscula y minúscula.
5. Más texturas: las manchas, salpicaduras y curvas de TRAZOS (garabatos) aún no se usan; se podrían usar para
   goteos, puntos y remates.
6. Si el usuario escanea su propio alfabeto, se puede convertir en una quinta letra.
