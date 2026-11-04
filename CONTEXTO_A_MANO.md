# A mano · contexto completo del proyecto

Plugin de Photoshop (UXP, instalable como `.ccx`) que **pinta a mano, encima, el texto de tus capas de texto**,
como lo haría una persona: con boli, rotulador, pincel, lápiz, brocha seca o sello.

Este documento sirve para continuar el trabajo en una conversación nueva sin perder nada.
Hasta ahora A mano era la segunda pestaña del plugin **Cartelator**. El 4 de noviembre de 2026 el usuario pidió
separarlos en **dos plugins distintos**, cada uno con su propia conversación. Esta es la de **A mano**.

- Usuario: escribe en español. Las respuestas, el panel y los textos van en español.
- Versión actual: **A mano 1.0.0** (`dist/A_mano_v1.0.0.ccx`), con id `com.amano.handlettering`.
- Cartelator sigue en su conversación (3.1.0, id `com.cartelator.handlettering`). Los dos se pueden instalar a la vez.
- **Ojo:** solo se ha probado en un Photoshop simulado (ver «Pruebas»), **nunca en Photoshop de verdad**.

---

## 1. Lo que ha pedido el usuario (historial, con sus palabras)

**Idea de partida.** Quería «estilos de imprenta» y añadir el «handmade»: pasar a mano algunos textos, también
los que salen de Cartelator.

**Primera versión → sus quejas:**
- «Va muy lento y es muy pesado.»
- «Muchísima más variación: que las letras se peguen más entre ellas y se separen
  (que los espacios de barra espaciadora entre palabras estén claros).»
- «Que su variación sea muchísimo mayor… más loca… por palabra también.»
- «Con respecto al color y la textura, lo que has hecho es una mierda, no parecen trazos de ninguna forma.»
- «En general es muy poco realista, muy deficiente. Si necesitas algo concreto que REALMENTE vaya a hacerlo
  increíble (imágenes de trazos reales, lo que sea) dímelo.»
  (Se le pidieron escaneos de trazos, alfabetos o fuentes; de momento solo ha mandado carteles de referencia.)

**Segunda versión → sus quejas:**
- «Repiénsala entera. Detalle por detalle, cómo hacerlo mejor, más rápida, más estable, más lógica.»
- «No puedo ni ver cómo quedan las letras hechas a mano. Selecciono un texto que tiene un tamaño y un formato,
  y cuando lo aplico se convierte en una sola línea minúscula. Tiene que conservar el orden del texto, la forma
  y el tamaño. Es hacer (pintar encima) una variación, no inventarte dónde va el texto, respetando sus columnas
  y orden.»
- «PIENSA MUCHO, HAZLO BIEN.»

**Tercera versión (la actual), hecha a partir de esas quejas.** Pinta encima de cada letra en su sitio.
Se conservan las líneas, las columnas, el tamaño, el color y el orden. Las palabras quedan separadas. Hay
herramientas de trazo y de relleno. En la carpeta `referencias/` están sus referencias de aspecto a mano:
- Once Upon a Time in Hollywood: tipo sello o linóleo.
- The Crucible: pincel.
- The New Pop: brocha con goteos.
- JUST DO IT: brocha.
- AVONAT: letras de papel rasgado.

---

## 2. Cómo se usa (lo que ve el usuario)

1. En Capas, selecciona capas de texto o un grupo que las contenga, por ejemplo un bloque editable de Cartelator.
   Sirve cualquier fuente, también texto de párrafo, varias columnas o texto girado.
2. Elige la herramienta:
   - Trazo: boli, rotulador, pincel o lápiz.
   - Relleno: brocha seca o sello.
3. Elige el grosor, que solo cuenta en las de trazo: Auto, Fuente, Fino, Medio o Grueso.
4. Ajusta los deslizadores:
   - Locura: variación de letras y palabras.
   - Pulso: temblor.
   - Prisa: inclinación.
   - Apretadas ↔ sueltas.
   - Tinta: textura y sequedad.
5. Elige el resultado:
   - **Imagen:** trazos reales.
   - **Editable:** sigue siendo texto; solo cambian el tamaño, la altura y el espaciado de cada letra.
6. Los botones:
   - **Aplicar:** crea una capa `✍ <nombre>` encima del original y oculta el original.
   - **Otra variación:** cambia la semilla.
   - **Volver al original:** borra la copia y muestra el original.

---

## 3. Arquitectura (carpeta `js/`, se une en un solo `main.js`)

| Módulo | Qué hace |
|---|---|
| `main.js` | Panel: ajustes guardados en localStorage con la clave `amano.*`, contexto, aplicar, otra variación, volver al original. |
| `ps.js` | Puente con Photoshop (ver más abajo). |
| `glyphs.js` | Convierte los contornos del trazado de trabajo en glifos. `analyzeTextOutlines` asigna cada glifo a su carácter, palabra y línea, calcula el ángulo del texto, une acentos sueltos (`mergeMarks`) y corrige un `em` poco fiable. |
| `instances.js` | `fromTextLayer`: convierte los glifos en «instancias» `{contours, bbox, em, color, word, line, ch, map}`. El espacio natural es el documento girado para que las líneas queden horizontales. `docBounds`. Tiene también `fromLayout`, que viene de Cartelator y aquí no se usa. |
| `hand.js` | Motor a mano (ver más abajo). |
| `strokes.js` | Convierte la letra en trazos: la rasteriza (unos 170 px por em), saca el esqueleto (EDT y adelgazado), arma el grafo y lo pasa a trazos con radio. Guarda en caché las formas relativas al em por `contourKey` y añade el palo de la «a» de un piso. |
| `handmade.js` | `varyTextStyles`: variación del modo «Editable» (tamaño, desplazamiento de la línea base, tracking y alternativos por letra). |
| `render.js` | Lienzo RGBA, composición «sobre», rasterizado de polígonos, `trimCanvas`, `toDepth` (8, 16 o 32 bits). |
| `geom.js` | Lee `pathContents` (unidades px o distanceUnit), segmentos Bézier y aplanado. |
| `raster.js`, `rng.js` | Rasterizador por acumulación de área. Azar reproducible y ruido. |

### Flujo de «Aplicar» (modo imagen)

1. `ps.textLayerData(doc, layer)`:
   - Lee `textKey`: el texto y, por carácter, el color y el tamaño (con `impliedFontSize`).
   - `outlinesOf`: selecciona la capa, crea un trazado de trabajo desde el texto (como «Crear trazado de
     trabajo»), lo lee y lo borra. Antes lo envuelve en `withWorkPath`, que guarda y luego restaura el trazado
     de trabajo del usuario.
   - `GL.calibrate`: corrige si las unidades del trazado no casan con los límites de la capa.
2. `GL.analyzeTextOutlines`: cada componente del trazado es un glifo. Los glifos se asignan a los caracteres
   que no son separadores. Si sobran piezas, se unen los acentos. Si faltan (ligaduras), el color se toma por
   posición. Las líneas se agrupan según la coordenada perpendicular al ángulo del texto.
3. `IN.fromTextLayer`: instancias en un espacio isótropo.
4. `HD.planVariation(insts, p, seed)`: variación **sin mover la maqueta**.
   - **Por línea:** línea base ondulada.
   - **Por palabra:** giro, escala (solo encoge), dy, dx e inclinación (prisa).
   - **Por letra:** giro, escala, proporción, dy, inclinación, una pequeña distorsión de ruido y un desplazamiento
     que no se acumula (las letras se juntan y se separan).
   - `tightenWords`: dentro de una palabra ningún hueco parece un espacio y las letras no se pisan de más.
     Se mide con las letras ya transformadas.
   - `keepWordGaps`: el hueco entre palabras se mantiene al menos en el 75 % del natural.
   - Si las instancias traen `room` (espacio libre con las líneas vecinas), el baile vertical se reduce.
5. `HD.renderHand(canvas, insts, p, seed, only, pv)`:
   - **Trazo:** `drawStrokes`. Saca los trazos de la letra; si viene estirada (`ax`), los saca sin estirar y
     luego los estira. Aplica a cada trazo un pequeño desplazamiento y giro, recorta o alarga los extremos,
     añade temblor y lo pinta con `paintStroke`.
   - **Pintado:** `prepStroke` y `strokeInto` simulan presión, cerdas, sequedad y grano de papel. `bufToCov`
     convierte el resultado en cobertura.
   - **Relleno:** `drawFill`. La brocha deja vetas que siguen la dirección de los trazos de la letra, recortadas
     a la silueta, con borde vivo (`roughOutline`). El sello mete tinta irregular, motas, rayas de gubia y grano.
6. `ps.putBands`: dibuja por franjas de unos 6 MP, recorta y hace `putPixels` en una sola capa (`replace` solo en
   la primera franja). `only(i)` evita dibujar en cada franja las letras que no caen en ella, y `pv` mantiene la
   misma variación en todas.
7. La copia se coloca encima del original, `copyLook` copia la opacidad, el modo de fusión y los efectos, y el
   original se oculta. Todo cuenta como **un solo paso de historial** (`runModal` con
   `suspendHistory`/`resumeHistory`; si algo falla, se deshace).

### Herramientas (`hand.js → TOOLS`)

- `boli`, `rotulador`, `pincel`, `lapiz`: tipo `stroke`, con su ancho, densidad, entrada y salida, cerdas,
  sequedad, grano, rugosidad y temblor.
- `brocha`, `sello`: tipo `fill`.
- Grosor: `auto` usa el de la fuente o el de la herramienta, según cada una (`useFont`). `fino` multiplica por
  0,6 y `grueso` por 1,45.

### Puente con Photoshop (`ps.js`): llamadas que usa

- `batchPlay`:
  - `get` de la capa (`textKey`) y del `workPath`.
  - `make` de path desde `textLayer` y `delete` / `set` del workPath.
  - `select` de capa, también con `addToSelection`.
  - `set textLayer`, para el modo editable.
  - `copyEffects` / `pasteEffects`.
- `core.executeAsModal` con `hostControl.suspendHistory`.
- `imaging.createImageDataFromBuffer` y `imaging.putPixels`. En documentos en escala de grises se usan
  2 componentes; CMYK y Lab dan un aviso.
- DOM: `doc.createPixelLayer`, `layer.move`, `layer.duplicate`, `layer.delete`, `visible`, `opacity` y
  `blendMode`.

---

## 4. Pruebas

Requisitos: Node 22, Playwright con Chromium y las fuentes del sistema
(`/usr/share/fonts/...`, rutas en `tests/fakeText.js`).

```bash
python3 tools/build.py            # genera dist/plugin y dist/A_mano_v1.0.0.ccx
node tests/sim/buildsim.js        # genera tests/sim/sim.js (Photoshop simulado + fuentes)
node tests/sim/harness.js         # panel real en Chromium + Photoshop simulado; imágenes en tests/sim/out/
```

- `tests/sim/psim.js` es el Photoshop simulado. Tiene capas, grupos, texto (motor falso `fakeText.js` sobre
  `otf.js`), trazado de trabajo desde texto, `putPixels`, modal e historial, y comprueba que no se toque nada
  fuera de la orden modal. Para probar casos raros se pueden activar `SIM.quirk = 'small'|'big'` (tamaños de
  texto mal interpretados) y `SIM.units`.
- `harness.js` prueba:
  - Las 6 herramientas sobre dos columnas de párrafo y un titular.
  - Otra variación, volver al original y el modo editable.
  - Un grupo de texto con un titular girado.
  - Que sin selección aparezca un aviso.
  - Un documento de 16 bits.

  Último resultado: todo bien y sin errores de modal; entre 0,1 y 1,1 s por aplicación.

---

## 5. Pendiente e ideas

1. **Probar en Photoshop real.** Puntos de riesgo:
   - Las unidades del trazado de trabajo (hay calibración).
   - `impliedFontSize`.
   - `putPixels` en documentos que no son RGB.
   - `copyEffects` en capas sin efectos (está protegido con try).
2. En titulares condensados el espacio entre palabras puede quedar justo (en la prueba, «NOTAS DEL» casi se
   pega). Hay que reforzar `keepWordGaps` frente a la variación de dentro de la palabra.
3. En fuentes muy condensadas, el esqueleto de la M o la N con boli o rotulador a veces sale raro.
4. Los bloques de Cartelator en **imagen** (MODO EXTREMO) no se pueden pasar a mano: son píxeles y Cartelator
   guarda sus datos aparte. Ideas:
   - Que Cartelator saque las letras deformadas como **capa de forma vectorial** y que A mano lea capas de forma
     (cada componente es una letra).
   - O pasar a mano desde los píxeles.
5. Efectos de sus referencias que aún no están: **goteo** de la brocha (The New Pop) y **papel rasgado** (AVONAT).
6. Para que quede de verdad realista: **escaneos de trazos reales** (pinceladas, rotulador, sello) para usarlos
   como textura o pincel. El usuario no los ha mandado todavía.

---

## 6. Mensaje para empezar la conversación nueva

> Te paso el proyecto **A mano** (plugin de Photoshop). Antes era una pestaña de Cartelator; ahora es un plugin
> aparte y esta conversación es solo para él. Lee `CONTEXTO_A_MANO.md` del zip: ahí está todo lo que te he
> pedido, cómo está hecho, cómo probarlo y qué queda pendiente. Descomprímelo, compílalo y pasa las pruebas
> antes de cambiar nada.
