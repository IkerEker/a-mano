# A mano · contexto completo del proyecto

Plugin de Photoshop (UXP, instalable como `.ccx`) que **escribe a mano**: genera desde cero texto escrito con
lápiz, carboncillo, boli, rotulador o pincel dentro de una forma que el usuario coloca y deforma (GENERAR), o
pinta a mano, encima, el texto de capas de texto que ya existen (CALCAR).

Este documento sirve para continuar el trabajo en una conversación nueva sin perder nada.

- Usuario: escribe en español. Las respuestas, el panel y los textos van en español.
- Versión actual: **A mano 2.1.0** (`dist/A_mano_v2.1.0.ccx`), id `com.amano.handlettering`.
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

### 4 de noviembre de 2026, tarde: correcciones sobre la 2.0 → 2.1
- «Los repasados funcionan fatal, se ven muy feos.» (eran copias rígidas desplazadas del trazo)
- «Cuando se escribe en color, sobre todo en pincel, la gracia es que conserve la veta interior, el registro,
  un cambio de tono, saturación, más pigmentado por partes.»
- «El bolígrafo igual: la gracia está en que cambie un poco el tono en las letras, más oscuro por donde aprieta.»
- «La tipografía rabiosa es una mierda, se ve muy formal.» «Las tipografías (las autogeneradas) no me gustan mucho.»
- «La función de calcar todavía funciona mal, la línea no va por donde debería.» «El calco de lápiz resulta
  ilegible, le falta intensidad.»
- Mandó referencias de letra (en `referencias/` no están; se describen aquí): póster TONYA HARDINGS (mayúsculas
  altas y estrechas, desbordadas), abecedario de niño, abecedario geométrico de piezas (triángulos, medios
  círculos), «Sorry for the late reply» (mayúsculas temblonas), pimiento y Doodle Club (letra de ilustrador),
  Good Room (letras huecas), «You're single because…» (pincel, letras encajadas llenando el cartel).
  Pidió **«2 versiones de cada una (adulta, infantil, nerviosa y elegante)»**; la rabiosa pasa a llamarse nerviosa.
- **Autoencajar:** «en la casilla de texto una opción "Autoencajar" que ignore lo de palabras importantes y que
  se concentre en que las letras llenen el mayor espacio posible, jugando con los tamaños entre ellas,
  encajándolas en los huecos de las de arriba y abajo, dejando claros los espacios de barra espaciadora, pero lo
  demás encajándolo al máximo».

---

## 2. Cómo se usa (2.2)

**GENERAR** (de arriba abajo):
1. **Forma**: Recto, Arco, Bandera, Abanico, Círculo o Selección. Crea una capa de forma `◇ Forma · Arco`
   (naranja, 35 %). El usuario la mueve, gira, voltea o deforma con Photoshop. Si hay una selección, las formas
   se ajustan a ella; «Selección» usa la selección (lazo) como forma. Cualquier capa de forma suya también vale.
2. **Texto**: casilla + barra (pequeña · normal · importante · ¡LA MÁS!) + recuadro de palabras (chips) para
   marcarlas. Al editar el texto, cada palabra conserva su importancia.
3. **Estilo**: herramienta + pack (lápiz HB/blando/nervioso, carboncillo suave/fuerte/cera, boli BIC/fino/gel,
   rotulador fino/gordo/gastado, pincel fino/gordo/seco/húmedo) + color (toma el color frontal).
4. **Letra**: infantil, adulta, nerviosa, elegante, cada una en **versión A o B**, × MAYÚSCULAS, minúsculas,
   cursiva. Adulta A segura y compacta (pimiento), Adulta B suelta y saltarina (Doodle Club), Infantil A de niño,
   Infantil B de piezas (triángulos y medios círculos rellenos), Nerviosa A alta, estrecha y desbordada (Tonya),
   Nerviosa B temblona (Sorry…), Elegante A alta y tranquila, Elegante B fina de ilustrador.
- **Texto: «Por importancia» o «Autoencajar»** (este último ignora las importancias y llena la forma).
- **Legibilidad** (garabato ↔ muy legible).
- **Escribir en la forma**: crea el grupo `✍ A mano · <texto>` con la capa de píxeles `✍ <texto>` encima de la
  forma, que pasa a opacidad 0. Volver a pulsar con el grupo seleccionado lo rehace (lee la forma tal como esté).
  **Otra variación**: otra semilla. **Mostrar/ocultar la forma**: opacidad 0 ↔ 35.
- Cada forma recuerda su texto y su estilo (localStorage `amano.shape|<doc>|<id>`): al seleccionar un grupo ya
  escrito, el panel lo recupera.

**CALCAR**: como la 1.0 (capas de texto → copia `✍ <nombre>` encima, original oculto), ahora con el motor de
pintado nuevo y las mismas herramientas; Relleno: brocha o sello (de la 1.0). Resultado imagen o editable (en
Avanzado).

**Avanzado ›**: grosor, tinta, pulso, repasado (cantidad y tipo: auto, fundido, visible), locura, prisa, apretadas/sueltas; en GENERAR además diferencia
de tamaño entre importancias, interlineado, llenar la forma, margen y alineación; en CALCAR, resultado y grosor
(de la herramienta o de la letra).

### Tras probar la 2.1 en Photoshop (capturas: nerviosa con carboncillo, elegante con lápiz, rotulador gordo y fino
en azul, pincel en azul y burdeos, autoencajar en arco con líneas montadas)
- «Evita los lobulados o giros extremos en la nerviosa.» «Cuidado con los lobulados en general.»
- «La elegante es muy poco elegante, me gustaba más la de antes» (la de la 2.0, hecha con EMS Elfin).
- «Al rotulador gordo le falta textura y realismo.» «A rotulador, todos, le falta realismo en general.»
- «Pincel hace alguna cosa rara, pero está mejor.» «Los biberones de pincel al final de los trazos… mejor no.»
- «Ultrarrealista: te pasé imágenes de trazos de ceras (óleo en barra)» (carpeta `TRAZOS/CERAS`).
- **Una letra de cada color**: «que tome el tono base, y un slider que me pregunte cuánta variación de todo
  (saturación, etc.) para cada diferencia de letra; estas opciones solo se abren si marcas "Una letra de cada color"».
- «La opción de AUTOENCAJAR podría funcionar mil veces mejor. AUTOENCAJAR es letra a letra, de forma inteligente.»
- «En general haz que TODO SEA MEJOR Y MÁS REALISTA, pero VAS MUY BIEN.»

### Qué se hizo en la 2.2
- **Biberones y lóbulos**: venían de (1) colas finas de los escaneos al principio y al final de las cintas
  (ahora `extract_textures.py` recorta las filas de menos de media anchura y deja solo el redondeo real),
  (2) el medio círculo de remate que repetía la última fila (ahora solo se añade si la cinta se corta a mitad o el
  trazo es fino, y usa el perfil real girado), (3) las pasadas «fundidas» del repasado, que eran trazos más anchos
  y a veces parciales encima (ahora el repasado fundido es el mismo trazo con más pigmento y un pelo más ancho) y
  (4) entradas y salidas muy afiladas y el engorde al bajar (presets con `tIn/tOut` altos y `down` bajo).
  Además, la curvatura del tono se mide en una ventana de ~1,5 anchos (antes cada vértice dejaba una banda).
- **Rotulador procedural** (`P.proc = 'marker'` en `ink.js`): borde nítido con sangrado de fibra, vetas a lo
  largo que derivan, moteado de absorción del papel, línea de borde algo más cargada, punto de carga donde se
  para, y el gastado abre claros a trozos (más hacia el final y en un lado) en vez de rayas limpias. También el boli de gel.
- **Óleo en barra** (herramienta nueva `cera`: Óleo en barra, Cera, Fina) con las cintas de `TRAZOS/CERAS` a más
  resolución (MH 20) y normalizadas por la mediana alta (las barras claras cubren igual).
- Pincel y aguada con cintas a más resolución (bordes sin escalones).
- **Elegante**: vuelve la de la 2.0 (EMS Elfin) como A; la B es la misma letra más alta, estrecha y espaciada.
- **Nerviosa**: menos deformación y temblor fino, angulosidad moderada y sin trazos dobles sueltos.
- **Una letra de cada color** (`RD.letterColor`): tono ±80°, saturación y luz según el deslizador, con la
  sucesión áurea para que dos letras seguidas nunca salgan iguales; en GENERAR y en CALCAR.
- **Autoencajar letra a letra** (`js/autofit.js`, ver arquitectura).

---

## 3. Arquitectura (carpeta `js/`, se une en un solo `main.js` con `tools/build.py`)

| Módulo | Qué hace |
|---|---|
| `main.js` | Panel: pestañas, vista avanzada, ajustes (`amano.settings2`), casilla de texto con niveles, crear forma, escribir, calcar. |
| `ps.js` | Puente con Photoshop. Nuevo en 2.0: `vectorMaskOf` (lee y calibra unidades), `resolveShape` (forma/grupo desde la selección), `makeShapeLayer` (prueba px y pt y comprueba límites y máscara), `selectionToWorkPath`, `deselect`. |
| `shapes.js` | Genera las formas (anclas en orden conocido: empieza arriba a la izquierda, sentido horario) y las lee: **envolventes** (4 esquinas → parche de Coons; si está volteada no escribe en espejo: elige cambiar izq/der o arriba/abajo según hacia dónde quede «arriba») y **siluetas** (círculo con su «arriba», selección, formas libres). |
| `autofit.js` | (2.2) **Autoencajar letra a letra**: perfil de la forma por columnas (envolvente o silueta); se prueban 1…12 líneas (cortes exactos por programación dinámica, respetando los saltos del usuario); cada letra se relaja hacia el hueco vertical que le dejan la línea de arriba, la de abajo y el borde (puede meterse un tercio en la franja vecina, nunca ocupar dos); la línea llena su ancho ensanchando o estrechando las letras (×0,8–1,32) y si sobra se centra; al final nada se monta (si no cabe, la letra encoge entera). Gana el número de líneas que más área llena sin letras diminutas ni aplastadas. Los signos cuentan como letras de altura de mayúscula. |
| `layout.js` | (cualquier salto de línea cuenta; `o.auto` → `autofit.js`) Texto → palabras con nivel (tamaño, pasadas, grosor) → cortes de línea por programación dinámica buscando la proporción de la forma → bloque dentro de la envolvente (estira hasta ×1,3) o líneas que caben en la silueta (búsqueda binaria del tamaño, prueba varias alturas de arranque). Reserva el grosor de la herramienta (`inkPad`). |
| `skeleton.js` | **Letras dibujadas a mano trazo a trazo** en un mini lenguaje (`M/L/S/F/Z`): mayúsculas, minúsculas, números, signos, alternativas (a y g de dos pisos) y marcas (tildes, diéresis, virgulilla, cedilla). |
| `fonts.js` | 8 estilos (`STYLES`: `adulta_a` … `elegante_b`) que transforman el esqueleto: anchura, inclinación, alturas desiguales, deformación, temblor, curvas angulosas o geométricas, travesaños que se pasan, palos que sobresalen, óvalos que no cierran, trazos dobles, letras propias (`OVR`: kid, geo, tonya, fine). 3 variantes por letra. Cursiva con `fontdata.js` (Hershey Script y EMS Allure). `templates(ch)` da la letra neutra para el calco. |
| `calco.js` | **Calco guiado** (CALCAR): plantilla del carácter → encaje afín al esqueleto real de la letra (puntos cercanos en los dos sentidos, con rigidez) → ajuste fino por punto → grosor de la propia letra. Si no cubre bien la letra (calidad < 0,9), se usa el esqueleto antiguo. |
| `writer.js` | GENERAR: variación por línea/palabra/letra/trazo según la legibilidad, corrección de huecos tras la variación, **repasado nuevo** (pasadas casi encima con desviación lenta menor que el grosor, a veces parciales; fundido en pincel y rotulador), rellenos (`paintFill`), grosor del estilo, escala vertical por letra (autoencajar), temblor, plan y pintado por franjas. |
| `render.js` | Desde 2.1 el lienzo es **de pigmento**: guarda cómo se ve sobre blanco (transmitancia por canal) y la cobertura; las tintas se acumulan como veladuras (`compositePigment`, modo multiplicar) o tapan (guache/óleo); `finalize` lo pasa a RGBA. |
| `ink.js` + `texdata.js` | **Motor de pintado** (2.1: pigmento por presión —aprieta al bajar, en curvas y al frenar— y por carga del pincel; textura sin recortar, conserva la veta; `blend` multiply/over por pack; `fuse` para el repasado; `paintFill` rellena a pinceladas): cada trazo es una cinta continua (triángulos con coordenadas a lo largo/a lo ancho) forrada con una cinta real de `TRAZOS/`; inicio real, final real, medio sin costuras; presión (entrada/salida, ondulación, engorda al bajar); grano de papel pegado al papel; borde húmedo; carga al empezar; sequedad progresiva. Packs en `TOOLS`. |
| `hand.js` | CALCAR: variación sin mover la maqueta (de la 1.0). Los trazos se pintan con `ink.js`; brocha y sello siguen con el motor de relleno de la 1.0. |
| `strokes.js`, `glyphs.js`, `instances.js`, `handmade.js` | CALCAR (de la 1.0): esqueleto de las letras de la fuente, contornos de la capa de texto, modo editable. |
| `render.js`, `geom.js`, `raster.js`, `rng.js` | Lienzo y composición, trazados y Coons, rasterizado, azar reproducible. |

### Texturas (`tools/extract_textures.py` → `js/texdata.js`, ~1,2 MB)
- Densidad de tinta independiente del color y del papel (papel estimado a baja resolución con ventana grande).
- Cada trazo recto se endereza siguiendo su centro y se guarda como cinta (filas = a lo largo, desde el inicio).
- Familias (2.2): `aguada` (12), `cera` (12, MH 20), `guache` (12), `lapiz` (10), `carbon` (10), `pincel` (14),
  `pincelfino` (5), `brocha` (2), `rotu` (3, solo respaldo), `boli` (8). `gastado` y `oleo` ya no se extraen
  (el rotulador es procedural). Las colas finas de los extremos se recortan. Tabla `SOURCES` = qué archivo es qué.
- Papel: grano sintético con espectro de papel de dibujo (el de las imágenes de Gemini era ruido de generación).
- Para añadir material: subirlo a `TRAZOS/`, añadirlo a `SOURCES` y `python3 tools/extract_textures.py --preview DIR`
  (tarda unos 2 minutos; mirar las hojas `fam_*.png`).

### Tipografías
- Desde 2.1 las mayúsculas y minúsculas son propias (`js/skeleton.js` + estilos en `js/fonts.js`).
  Para ver todas: `node` con el muestrario (ver `tests/node/preview.js` y el patrón de `estado_actual.png`).
- `tools/make_fonts.py` → `js/fontdata.js` (~66 KB) solo genera ya las cursivas ligadas (Hershey Script, EMS Allure)
  y una fuente de respaldo para signos raros (EMS Readability).
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
python3 tools/build.py              # dist/plugin y dist/A_mano_v2.2.0.ccx
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
- 2.1 añade: 8 combinaciones de estilo y versión, capa en Multiplicar, autoencajar en rectángulo y círculo.
- 2.2 añade: óleo en barra, rotulador gastado con la elegante B, una letra de cada color (y que el deslizador solo
  aparezca al marcarla).
- Último resultado: **48/48 bien, sin errores de modal**.

---

## 5. Pendiente e ideas

1. La 2.1 ya se probó en Photoshop real (capturas del usuario). Falta ver la 2.2 allí.
2. Letra hueca de bloque (referencia Good Room) como estilo o versión aparte: no está.
3. Cursivas: siguen saliendo de fuentes de plóter (Hershey/Allure) con el comportamiento del estilo; si no
   gustan, dibujarlas también en `skeleton.js` con entradas y salidas para ligar.
4. CALCAR: el calco guiado acepta ~92 % de las letras de prueba; las decorativas (cursiva de Chorus) caen al
   esqueleto. La variación de CALCAR (planVariation) puede subir o bajar letras sueltas de más con legibilidad baja.
5. Goteo de la brocha (The New Pop), papel rasgado (AVONAT) y las manchas de TRAZOS: aún no.
6. Si el usuario escribe su propio alfabeto, se puede convertir al mini lenguaje de `skeleton.js`.
