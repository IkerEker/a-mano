# TEXTURAS · A MANO

Documento para la conversación que unifica las texturas de todos los plugins en la biblioteca común (repo TEXTURAS).
Escrito el 19-11-2026 analizando el código tal como está; **no se ha cambiado nada del plugin**.

Cómo leer las marcas:

- **Comprobado**: lo he ejecutado o medido hoy sobre el repositorio (se dice cómo).
- **«sin verificar»**: lo deduzco de nombres o de documentos de otros plugins, sin haber comparado archivos.

**Resumen en seis líneas**

1. A mano **no lee ninguna imagen al ejecutarse**. Todo va incrustado en `main.js` como base64 de 8 bits.
2. Solo tiene **tres assets de imagen**: 88 cintas de trazo (`js/texdata.js`), 50 sellos de grumo (`js/grumosdata.js`)
   y una baldosa de grano de papel de 256×256 que **es sintética** (no sale de ninguna foto).
3. De las 80 imágenes de `TRAZOS/` se usan de verdad **46**; de `referencias/texturas/`, las **4** fotos.
4. Todo el graffiti (niebla, borde, chorretones, empapado, rodillo, brillo) y el boli y el rotulador son **100 % código**.
5. Las 80 imágenes de `TRAZOS/` son **las mismas** que `APOYO/TRAZOS/` de PAPELATOR (md5 comprobado en 12 de 12 muestras).
6. Para pasar a la biblioteca solo hay que tocar **dos herramientas de Python**; el `.ccx` seguiría siendo autónomo.
   Hay prueba exacta de que nada cambia: los dos módulos generados se regeneran **byte a byte** (comprobado hoy).

---

## 1. IDENTIDAD

| | |
|---|---|
| Nombre | **A mano** (id UXP `com.amano.handlettering`, panel `amanoPanel`) |
| Versión | **2.38.0** (`src/manifest.json`); Photoshop 25.0 o posterior, manifiesto v5 |
| Repositorio y rama | `IkerEker/a-mano`, rama `main` |
| Commit analizado | `8a8bf667e35094346a246f7aad10e9d71d86675f` (el código del plugin no cambia desde `5a54d14`, versión 2.38) |
| Otro producto en el mismo repo | Panel CEP de After Effects «A mano AE» 0.2.0 (`ae/`, `dist_ae/`): comparte motor y las cintas, **no** lleva grumos |

**Qué hace.** Escribe texto «a mano» en Photoshop. No usa fuentes: cada letra es un esqueleto de trazos (orden y dirección
de la mano) que se deforma con variación propia y se pinta trazo a trazo con un motor de pintura por software. El
resultado es una sola capa de píxeles.

- **Generar**: escribe el texto que se le da dentro de una forma (Recto, Arco, Bandera, abanico, círculo o la selección).
- **Calcar**: repinta a mano, encima, capas de texto que ya existen (con relleno, negativo, etc.).

**Técnicas y presets** (`js/ink.js`, tabla `TOOLS`):

| Técnica | Presets | ¿Usa imagen? |
|---|---|---|
| Lápiz | HB, Blando 6B, Nervioso | cintas `lapiz` + grano de papel |
| Carbón | Suave, Fuerte, Fino | cintas `carbon` + grano de papel |
| Cera | Gruesa, Blanda, Fina | cintas `cera` + grano de papel |
| Bolígrafo | BIC, Fino, Gel | **no** (procedural `proc:'marker'`); solo el grano de papel como moteado |
| Rotulador | Fino, Gordo, Gastado | **no** (procedural `proc:'marker'`); solo el grano de papel como moteado |
| Pincel | Fino, Gordo, Seco, Húmedo | cintas `pincelfino`+`guache` / `pincel` / `pincel`+`guache`+`brocha` / `aguada` |
| Graffiti | Gordo, Fino, Seco, Mop, Plano, Extintor, Empapado, Rodillo | **no** (procedural); solo los grumos, con «Textura de la pintura» > 0 |

**Letras**: 8 manos (infantil, adulta, nerviosa, elegante; cada una A y B; mayúsculas, minúsculas y cursiva) y 7 firmas de
graffiti (Tag, Bisel, Flechas, Bomba, De un trazo, Rodillo, Borrón). Son tipografía, no textura.

---

## 2. ESTRUCTURA

```
a-mano/
├─ js/                     motor y panel (JavaScript, módulos CommonJS; se unen en un solo main.js)
│   ├─ ink.js              PINTURA: paintStroke (cintas), paintSpray, paintSoak, paintBand, drawDrips, paintFill
│   ├─ render.js           lienzo, compositePigment, applyRelief, stampLumps (grumos)
│   ├─ writer.js           plan de trazos y pintado (deriva del bloque, subrayados, líneas)
│   ├─ skeleton.js fonts.js layout.js autofit.js shapes.js   letras y maquetación
│   ├─ hand.js calco.js negativo.js                           calco de capas de texto, negativos
│   ├─ ps.js main.js       Photoshop (imaging.putPixels por franjas) y panel
│   ├─ texdata.js      ←  GENERADO · 88 cintas + grano de papel      1 560 367 bytes
│   ├─ grumosdata.js   ←  GENERADO · 50 sellos de grumo                  77 802 bytes
│   ├─ refglyphs.js    ←  generado · letras de muestras reales (tipografía, no textura)
│   └─ fontdata.js     ←  generado · fuentes de trazo único EMS/Hershey (tipografía, no textura)
├─ src/                    index.html, styles.css, manifest.json, LEEME.txt, LICENCIAS.txt
├─ icons/                  4 PNG del panel (únicos archivos de imagen que viajan en el .ccx)
├─ tools/
│   ├─ extract_textures.py   TRAZOS/ → js/texdata.js
│   ├─ grumos.py             referencias/texturas/ → js/grumosdata.js
│   ├─ glyphref.py + glyphspec.json   referencias/tipos/ → js/refglyphs.js
│   ├─ make_fonts.py         fonts/svg/ → js/fontdata.js
│   ├─ build.py              empaqueta el .ccx       build_ae.py   empaqueta el panel de AE
│   └─ png.js                escritor de PNG para las pruebas
├─ TRAZOS/                 FUENTES de las cintas: 80 imágenes + LEEME.md · 165 MB
│   ├─ AGUADAS/ (7)  CERAS/ (5)  GUACHE/ (9)  LAPIZ/ (7)  OLEO/ (3)
│   └─ (raíz) 49 imágenes
├─ referencias/
│   ├─ texturas/           FUENTES de los grumos: 4 JPG (4,3 MB) + hoja de control
│   ├─ tipos/              muestras de letra (para glyphref.py y como referencia visual)
│   └─ *.png, *.jpg        referencias visuales sueltas (no las lee ningún programa)
├─ fonts/svg/              6 fuentes SVG de trazo único (EMS ×5, Hershey Script)
├─ tests/                  sim/ (Photoshop simulado), ae/, node/ (vistas previas sin Photoshop)
├─ dist/                   A_mano_v2.38.0.ccx + plugin/ descomprimido
├─ versiones/              los .ccx anteriores (2.13 a 2.37)
└─ ae/, dist_ae/           panel de After Effects
```

- **Lenguajes**: JavaScript sin ninguna dependencia (ni npm ni librerías) para el plugin; Python 3 para las herramientas.
- **Dependencias de las herramientas**: numpy, Pillow, scipy (`extract_textures.py`, `grumos.py`) y scikit-image (solo
  `glyphref.py`). Versiones con las que se ha comprobado hoy la regeneración exacta: numpy 2.5.3, Pillow 12.3.0, scipy 1.18.1.
- **Construcción**: `python3 tools/build.py`. Une los 24 módulos de la lista `MODS` en un `main.js` (un mini `require`
  propio), copia `src/` e `icons/` y comprime en `dist/A_mano_v<versión>.ccx`. No hay paso de minificado.
- **Pesos**:

| Cosa | Peso |
|---|---|
| `.ccx` 2.38.0 | **1 185 345 bytes** (1,2 MB) |
| `main.js` dentro del `.ccx` | 2 296 349 bytes sin comprimir (1 160 165 comprimido) |
| de ellos, texturas | `texdata.js` 1 560 367 + `grumosdata.js` 77 802 = **71 % del `main.js`** |
| Fuentes de cintas `TRAZOS/` | 165 324 798 bytes (165 MB), 80 imágenes |
| Fuentes de grumos `referencias/texturas/` | 4,3 MB (4 JPG) + 0,3 MB (hoja de control) |

---

## 3. CÓMO USA LAS TEXTURAS

### 3.0 Lo esencial

- **Nada se lee al ejecutarse.** El plugin no usa `uxp.storage`, ni `localFileSystem`, ni `fetch`, ni carpetas de
  assets. Las únicas API de Photoshop que toca son `photoshop.imaging` (`createImageDataFromBuffer`, `putPixels`) y el
  DOM de capas. Comprobado buscando en `js/ps.js` y `js/main.js`.
- **Todo va incrustado al construir**, como **base64 de un byte por píxel** dentro de dos módulos JavaScript generados
  (`js/texdata.js`, `js/grumosdata.js`) que `build.py` mete en `main.js`. No hay `.bin`, ni PNG de textura, ni índice aparte.
- Se descodifica **en memoria la primera vez que hace falta** (`ink.js → load()`, `stripData()`; `render.js → lumps()`).
- **No hay texturas a color, ni overlays, ni mapas de desplazamiento, ni vídeo, ni audio.** Las texturas solo dicen
  *cuánta tinta* o *cuánta luz* hay en cada punto; el color lo pone siempre el usuario.

Hay exactamente tres assets:

| Asset | Módulo | Origen | Lo usa |
|---|---|---|---|
| **Cintas de trazo** (88) | `js/texdata.js` → `strips` | fotos de `TRAZOS/` | `ink.js → paintStroke` |
| **Grano de papel** (1 baldosa 256×256) | `js/texdata.js` → `paper` | **sintético** (ruido filtrado) | `ink.js → paintStroke` y su `marker()` |
| **Grumos de pintura** (50 sellos) | `js/grumosdata.js` | 4 fotos de `referencias/texturas/` | `render.js → stampLumps`, desde `applyRelief` |

### 3.1 Cintas de trazo

**Qué son.** Cada trazo recto de una foto, recortado y **enderezado**: las **filas van a lo largo** del trazo (fila 0 = por
donde empieza la mano) y las **columnas a lo ancho**. Se guarda solo la **densidad de tinta** (0 = papel, 255 = tinta
plena), separada del color de la foto y del papel.

**Para qué.** Dan a cada trazo de cada letra el arranque, el cuerpo y el final de un trazo real: la carga al empezar,
la veta del pincel, el borde roto del carbón, las colas secas.

**Script**: `tools/extract_textures.py` (312 líneas). Paso a paso, con sus números:

1. `density(im)` — **quitar el papel y el color**. Papel = máximo local por canal a 1/8 de resolución (ventana 65,
   gaussiana 8), suelo 0,3. Densidad = `1 − min_canales(foto / papel)`. Se resta un suelo de ruido
   (percentil 55 + 0,025) y se reescala a 0–1.
2. `components(d, start)` — **localizar cada trazo**. Umbral 0,16; cierre ×3 y apertura ×2; etiquetado. Se descarta lo
   que tiene menos de 1500 px, lo que toca el borde de la imagen (margen 3 px) y lo que no es alargado
   (largo/ancho < 4,5 por análisis de componentes principales). El eje se orienta según `start`: `top` (el trazo empieza
   arriba) o `left` (empieza a la izquierda).
3. `strip_of(...)` — **enderezar**. Medio ancho `mh` = mediana, por tramos, del ancho entre percentiles 5 y 95. Se sigue
   el centro real del trazo (centroide de tinta por fila, suavizado) para tragar curvas suaves. Se remuestrea
   (bilineal) a una rejilla donde el medio ancho ocupa `MH[familia]` columnas y la cinta abarca ±`E` medios anchos:
   **columnas = round(2·E·MH)**. Como mucho `MAXROWS = 520` filas; si el trazo es más largo se comprime a lo largo
   promediando 3 muestras y se anota el factor en `ar`.
4. **Limpieza**: recorte de filas vacías (< 2 % del máximo); normalización dividiendo por el percentil 99,3 del núcleo
   (percentil 80 en ceras y óleo); recorte de colas finas en los extremos (se empieza donde la fila tiene al menos
   media anchura, más 0,7·MH filas de remate); se **descarta** la cinta si tiene tinta fuerte en los bordes laterales
   (vecinos o sombras: media del 12 % exterior > 0,22 × el centro).
5. **Selección**: de cada familia se cogen cintas por turnos, una de cada archivo, hasta el tope `CAP[familia]`.
6. **Salida**: `js/texdata.js` = `module.exports = {"strips":[…],"paper":{…}}`.

No se hace: quitar fondo con transparencia, hacer repetible (tileable), mapa de relieve ni mapa de desplazamiento.

**Formato final de cada cinta**: `{ f: familia, w: columnas, h: filas (≤ 520), mh: medio ancho en columnas, ar: factor de
compresión a lo largo (1 = sin comprimir), d: base64 de w×h bytes, por filas }`. Gris de 8 bits, un canal. No hay
identificador ni nombre: una cinta es **su posición en la lista** (#0 a #87), y esa posición sale del orden de `SOURCES`
y del orden alfabético de los archivos. **El archivo de origen no se guarda en el plugin** (lo he reconstruido para este
documento volviendo a ejecutar la extracción; ver 3.5).

**Familias** (comprobado contra `js/texdata.js`):

| Familia | Cintas | Archivos de origen | Columnas | Filas | MH | E | Medio ancho en la foto (px) | Bytes crudos | La usa |
|---|---|---|---|---|---|---|---|---|---|
| `aguada` | 12 (tope 12) | 7 | 46 | 184–408 | 15 | 1.55 | 72–131 | 161 KB | Pincel Húmedo |
| `cera` | 12 (tope 12) | 5 | 58 | 304–520 | 20 | 1.45 | 71–141 | 291 KB | Cera (Gruesa, Blanda, Fina) |
| `guache` | 12 (tope 12) | 9 | 39 | 218–287 | 14 | 1.4 | 103–126 | 114 KB | Pincel Fino y Seco |
| `lapiz` | 10 (tope 10) | 4 | 30 | 233–510 | 10 | 1.5 | 33–96 | 93 KB | Lápiz (HB, Blando 6B, Nervioso) |
| `carbon` | 10 (tope 10) | 4 | 42 | 163–338 | 11 | 1.9 | 57–128 | 83 KB | Carbón (Suave, Fuerte, Fino) |
| `pincel` | 14 (tope 14) | 14 | 39 | 177–520 | 14 | 1.4 | 26–172 | 156 KB | Pincel Gordo y Seco; relleno de negativos a pincel |
| `brocha` | 2 (tope 2) | 2 | 27 | 118–135 | 10 | 1.35 | 120–139 | 6 KB | Pincel Seco; relleno de negativos a pincel |
| `pincelfino` | 5 (tope 5) | 1 | 34 | 404–520 | 12 | 1.4 | 12–35 | 80 KB | Pincel Fino |
| `rotu` | 3 (tope 3) | 3 | 22 | 520–520 | 7 | 1.6 | 9–15 | 33 KB | INCRUSTADA SIN USO (el rotulador es procedural) |
| `boli` | 8 (tope 8) | 4 | 13 | 518–520 | 3 | 2.2 | 2–4 | 52 KB | INCRUSTADA SIN USO (el boli es procedural desde hace versiones) |

Total: **88 cintas, 1 100 864 bytes crudos**, 1,47 MB en base64.

**Aviso: 11 cintas van incrustadas y no las lee nadie.** Las familias `boli` (8) y `rotu` (3) siguen extrayéndose, pero
los seis presets de Bolígrafo y Rotulador son `proc:'marker'` y no llaman a `pickStrip`. Son unos 118 KB de base64
muertos en el `.ccx`. No lo he tocado (la instrucción era no cambiar código); se puede quitar poniendo su `CAP` a 0.

**Cómo se aplican** (`js/ink.js → paintStroke`, desde la línea 190):

- **Elección al azar**: `pickStrip(P.fams, rnd)` junta todas las cintas de las familias del preset y coge una con
  probabilidad uniforme. `rnd` es `mulberry32(semilla del trazo)`: el mismo texto con la misma semilla da siempre la misma
  cinta. Por eso **el orden de las cintas en `texdata.js` forma parte del resultado**.
- **Escala**: no hay escala real (ni mm ni ppp). La cinta se ajusta al grosor del trazo: `cpp = mh / r` columnas por
  píxel, siendo `r` el medio ancho del trazo en píxeles del documento (`r = P.w` em × tamaño de la letra × grosor).
  A lo largo, `rpp = cpp / ar` filas por píxel. Es decir, la textura **se escala con la letra**.
- **Orientación**: la cinta sigue el trazo. Cada tramo es un cuadrilátero con coordenadas (s a lo largo, v a lo ancho);
  `v` va en medios anchos *locales*, así que la textura se estrecha donde la presión adelgaza el trazo. No hay rotación
  libre ni espejo.
- **A lo largo** (`uMap`): si el trazo cabe en la cinta, el principio lee el principio real de la cinta, el final lee
  el final real, y en medio se funden las dos lecturas (suavizado en ±18 % de la longitud). Si el trazo es más largo
  que la cinta: se usan los remates reales (`capR` = 18 % de la cinta, entre 4 filas y el 30 %) y el medio se recorre
  en vaivén (ida y vuelta, sin costura) con un desfase al azar. Con probabilidad `capSkip` = 0,15 se salta hasta el
  15 % inicial o final (el trazo «entra ya cargado»); en los rellenos de negativo (`skipCaps`) siempre se salta el arranque.
- **Remates**: fuera del trazo se gira la última fila real (medio círculo), para que el final tenga el mismo borde.
- **Trazos finos**: si `cpp > 2,2` se usa una copia de la cinta desenfocada a lo ancho (`stripBlur`, radio hasta 6) para
  que no salgan dientes de sierra.
- **Lectura**: bilineal (`sampleT`). El valor leído `t0` (0–1) se multiplica por la opacidad del preset (`dens`), por la
  tinta del usuario (`inkMul`) y por el pigmento del punto (`q.pig`: presión, velocidad de la mano, carga). Tope 2,6.
- **Mezcla con otras cosas** (todas por código, encima de la cinta): grano de papel (3.2), sequedad (`dry`: umbral
  creciente sobre el propio valor de la cinta), carga en los extremos (`pool`), borde húmedo (`wetEdge`), máscara de negativo.
- **Modo de fusión** (`render.compositePigment`): `P.blend`. `'multiply'` = tinta transparente que oscurece al montarse
  (lápiz, carbón, cera Blanda, pincel Húmedo); `'over'` = pintura que tapa (cera Gruesa y Fina, pincel Fino, Gordo y Seco).
  Si el preset es `multiply`, la capa resultante se pone además en **Multiplicar** en Photoshop (`main.js`, líneas 374 y 456).
- **Sin relación con audio ni con tiempo.** En el panel de After Effects las mismas cintas se usan igual, fotograma a fotograma.

### 3.2 Grano de papel

- **Qué es**: una baldosa repetible de **256×256**, un byte por píxel, que hace de «dientes» del papel.
- **Fotos fuente: ninguna.** La genera `paper_tile()` en `tools/extract_textures.py`: ruido blanco filtrado en frecuencia
  (banda log-normal centrada en 7,5 px, dientes de 4–14 px algo alargados en horizontal, más un 25 % de poro fino de
  2,6 px), pasado por `tanh` para aplanar las crestas. Semilla fija 11. Media 128, rango 5–250. md5 de los bytes:
  `7592b4f48935c0923aff8118ada37f15`. (El comentario del script dice «de las hojas de acuarela y de lápiz»: es antiguo,
  ya no lee ninguna hoja.)
- **Cómo se aplica** (final de `paintStroke`, hacia la línea 465): solo si el preset tiene `grain > 0` (lápiz 0,4–0,5; carbón
  0,32–0,5; cera 0,2–0,42; pincel Seco 0,15; boli y rotulador 0,04–0,12). Va **pegado al documento**: se lee en
  `(x / paperScale) & 255, (y / paperScale) & 255`, y nadie pasa `paperScale`, así que **1 téxel = 1 píxel del
  documento** y se repite cada 256 px. Sin rotación. No es una capa: es un **umbral** que se come la tinta en los valles
  (`thr = (1 − g)·G`, con `G` reducido en trazos de menos de 3,5 px de medio ancho).
- **Segundo uso**: en el boli y el rotulador procedurales (`marker()`), la misma baldosa leída a escalas 0,7, 0,9 y 1,7
  hace de moteado de absorción del papel (±5 %, y claros de hasta el 28 % en el rotulador).

### 3.3 Grumos de pintura

**Qué son.** Bultos sueltos de pintura (pompas, granos, gotas gordas ya secas) recortados **uno a uno** de 4 fotos de
superficie pintada. No se usa ninguna foto entera ni se superpone. Cada uno es un **sello de sombreado**: cuánto aclara
u oscurece ese bulto bajo la luz, con el borde fundido a cero.

**Para qué.** Solo en **Graffiti**, y solo si el deslizador «Textura de la pintura» (`slRelieve`, por defecto 50) es
mayor que 0 y el preset no es mate (Empapado y Rodillo no la tienen). Salen únicamente donde la pintura va cargada.

**Script**: `tools/grumos.py` (159 líneas). Para cada foto, según `PLAN`:

1. Se pasa a gris y se **quita la luz general**: `h = foto / gaussiana(foto, 2,5·R) − 1`.
2. `candidates()` — se buscan sitios donde el relieve se concentra en un redondel de radio `R` y alrededor está
   tranquilo (energía a 0,5·R menos 0,8 × energía a 1,7·R; máximos locales en ventana 3·R).
3. Se deduce **de dónde viene la luz en la foto** (lado claro de 80 bultos medianos) y cada recorte se voltea para
   que la luz le venga de arriba. En las 4 fotos la luz ya venía de arriba: no se ha volteado ninguna (comprobado en la
   salida del script).
4. `patch()` — recorte de lado 2·1,45·R + 1, centrado en el relieve; se descarta si no está aislado (`iso` < 2,2 en
   pequeños, < 1,6 en grandes), si es un hoyo y no un bulto (`along` < 0,06) o, en los grandes, si es costra o miga
   (`liso` < 0,55). No se repiten sitios (distancia mínima 0,9 × suma de radios).
5. Borde fundido con ventana redonda (0,6→1,0 del radio y otra vez 0,86→1,0 ya reducido); **fuerza igualada**
   dividiendo por el percentil 98,5 del valor absoluto; reducción con Lanczos al lado del sello.
6. Se barajan dentro de cada clase (`RandomState(7)`) para mezclar las fotos y se escribe.

**Formato final**: `module.exports = { cls: [[20,24],[36,18],[56,8]], d: '<base64>' }`. Los sellos van seguidos, por
clases: **24 de 20×20, 18 de 36×36, 8 de 56×56 = 50 sellos, 58 016 bytes**. Un byte por píxel con signo desplazado:
**128 = nada, más = luz, menos = sombra**; luz desde arriba. Al cargar, `lumps()` hace además dos reducciones a la
mitad de cada sello (tres niveles) para usarlo pequeño sin que parpadee.

**Cómo se aplican** (`render.js → applyRelief` desde la línea 239, y `stampLumps`, desde la 185):

- **Dónde**: mapa de carga `P = max(pintura de más, 0,5 × doble capa desenfocada)` × ruido de zona (no en todo el
  graffiti: a manchas). «Pintura de más» sale del búfer de altura `canvas.Hh`; «doble capa» del marcador `canvas.Hx`
  (cruces de pasadas, vértices).
- **Tamaño**: no hay escala real. `s = clamp(mediana del medio ancho de los trazos × 0,42; 1,6; 14)` px. Diámetros:
  clase S = 1·s, M = 2·s, L = 3,1·s, cada uno × (0,75 a 1,3). Si el diámetro saldría menor de 2,6 px, esa clase no se pone.
- **Colocación**: rejilla con azar **anclada al documento** (celda = diámetro × 1,25 / 1,3 / 1,6), así las franjas en que
  se pinta casan. Probabilidad máxima por celda 0,8 / 0,65 / 0,45, creciente con la carga a partir de 0,03 / 0,1 / 0,28.
  El grumo tiene que **caber entero dentro de la pintura** (se comprueban cuatro puntos a 0,42 del diámetro).
- **Elección al azar**: `hash2(celda)` elige el sello dentro de su clase. **Sin rotación ni espejo** (la luz del sello
  tiene que coincidir con la del resto del relieve).
- **Fusión**: no es una capa. El valor del sello × fuerza (0,65 a 1,25 según el tamaño y el azar) se suma a la luz del
  píxel: `li += cantidad · m · (v > 0 ? 1,5·v : 1,2·v)`, y luego `color += li > 0 ? (255 − color)·li : color·li` (aclara
  hacia blanco, oscurece hacia negro). `cantidad` = deslizador 0–1.
- En Photoshop, con relieve, las franjas se pintan con 48 px de margen (`RELIEF_M`) para que los grumos no se corten.

### 3.4 Efectos 100 % procedurales (no hay que buscarles textura)

| Efecto | Función | Notas |
|---|---|---|
| Bolígrafo y rotulador (línea, vetas de la punta, salto de la bola, punta gastada, sangrado) | `ink.js → paintStroke`, función interna `marker()` | solo lee el grano de papel sintético |
| Niebla, borde, grano y halo de motas del bote; gotas que escupe; salpicaduras | `ink.js → paintSpray` | rejilla de pintura anclada al documento |
| Boquilla plana (abanico), Mop y Extintor (borde neto, chorro) | `paintSpray` (`fan`, `nib`, `hard`) | |
| **Chorretones** (hilo, lágrima, gota final) | `ink.js → dripExit`, `drawDrips` | NEONIZADOR los tiene de foto (`gt_*`); aquí son código |
| Empapado en tela (calado, trama a la vista, cercos) | `ink.js → paintSoak` | la trama es ruido, no una foto de tela |
| Rodillo de tóner (banda rayada, cantos cargados, calvas) | `ink.js → paintBand` | |
| Brillo y relieve de la pintura (película, bandas de brillo, piel, pompitas, luz direccional) | `render.js → applyRelief` | todo menos los grumos |
| Borde húmedo de la aguada | `ink.js → wetEdge` | |
| Relleno a pinceladas y máscaras de negativo | `ink.js → paintFill`, `applyMask`; `negativo.js` | el relleno a pincel sí usa cintas `pincel` y `brocha` |
| Temblor, presión, velocidad de la mano, deriva del bloque | `ink.js`, `writer.js` | no son textura |

### 3.5 Tabla: archivo fuente → familia → uso → parámetros

Reconstruida **ejecutando hoy la extracción** con un script aparte que anota de qué archivo sale cada cinta (el plugin no
lo guarda). Las 88 cintas reconstruidas coinciden byte a byte con las de `js/texdata.js`.

- «Trazos» = componentes que pasan el filtro de forma; «Válidas» = cintas que superan la limpieza; «Cintas» = las que
  entran en el tope y van incrustadas, con su número de orden.
- md5 abreviado a 8 caracteres (el completo está en el anexo y en `TEXTURAS_A_MANO.json`).

**Fuentes de cintas (`TRAZOS/`, 80 imágenes)**

| Archivo | Píxeles | Peso | md5 | Familia | Parámetros | Trazos | Válidas | Cintas | Estado |
|---|---|---|---|---|---|---|---|---|---|
| `TRAZOS/AGUADAS/Gemini_Generated_Image_6lti5j6lti5j6lti.jpg` | 1536×2752 | 2.6 MB | `20ddea7c` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #0, #7 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_6p6u0m6p6u0m6p6u.jpg` | 1536×2752 | 3.0 MB | `ac6b1c0c` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #1, #8 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_bygjtubygjtubygj.jpg` | 1536×2752 | 2.5 MB | `2ebff079` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #2, #9 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_hbkpvbhbkpvbhbkp.jpg` | 1536×2752 | 2.7 MB | `ff9fd5a0` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #3, #10 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_nft1n4nft1n4nft1.jpg` | 1536×2752 | 3.1 MB | `4a0a9e97` | aguada | inicio=top, E=1.55, MH=15 | 4 | 4 | #4, #11 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_umv2e3umv2e3umv2.jpg` | 1536×2752 | 2.9 MB | `0c7d294c` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #5 | USADA |
| `TRAZOS/AGUADAS/Gemini_Generated_Image_z82hx1z82hx1z82h.jpg` | 1536×2752 | 2.8 MB | `4d7017da` | aguada | inicio=top, E=1.55, MH=15 | 3 | 3 | #6 | USADA |
| `TRAZOS/CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg` | 1536×2752 | 3.2 MB | `b3935608` | cera | inicio=top, E=1.45, MH=20 | 3 | 3 | #12, #17, #22 | USADA |
| `TRAZOS/CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg` | 1536×2752 | 3.0 MB | `53d0437a` | cera | inicio=top, E=1.45, MH=20 | 3 | 3 | #13, #18, #23 | USADA |
| `TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg` | 1536×2752 | 3.2 MB | `f8bd0d98` | cera | inicio=top, E=1.45, MH=20 | 3 | 3 | #14, #19 | USADA |
| `TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg` | 1536×2752 | 3.2 MB | `f8bd0d98` | cera | inicio=top, E=1.45, MH=20 | 3 | 3 | #15, #20 | USADA |
| `TRAZOS/CERAS/Gemini_Generated_Image_y7qljdy7qljdy7ql.jpg` | 1536×2752 | 3.1 MB | `e144d337` | cera | inicio=top, E=1.45, MH=20 | 3 | 3 | #16, #21 | USADA |
| `TRAZOS/Cinco líneas azules dibujadas a mano.png` | 1536×1024 | 1.2 MB | `818a69b6` | rotu | inicio=left, E=1.6, MH=7 | 5 | 5 | #77 | incrustada sin uso |
| `TRAZOS/Cinco líneas azules sobre blanco.png` | 1536×1024 | 1.0 MB | `0561622b` | boli | inicio=left, E=2.2, MH=3 | 6 | 6 | #80, #84 | incrustada sin uso |
| `TRAZOS/Cinco trazos azules sobre blanco.png` | 1536×1024 | 1.9 MB | `2bcd77b8` | gastado | inicio=left, E=1.45, MH=10 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/Cinco trazos rojos sobre blanco.png` | 1536×1024 | 1.5 MB | `783353d6` | gastado | inicio=left, E=1.45, MH=10 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/Composición minimalista de garabatos abstractos-2.png` | 1672×941 | 1.4 MB | `27e823cf` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Cuatro líneas rojas dibujadas a manoยิงปลา.png` | 1535×1024 | 1.1 MB | `bc360542` | boli | inicio=left, E=2.2, MH=3 | 4 | 4 | #83, #87 | incrustada sin uso |
| `TRAZOS/Cuatro pinceladas rojas sobre blanco.png` | 1536×1024 | 1.6 MB | `99193ea9` | pincel | inicio=left, E=1.4, MH=14 | 4 | 4 | #63 | USADA |
| `TRAZOS/Cuatro trazos negros horizontales.png` | 1448×1086 | 1.1 MB | `2ccd16b4` | rotu | inicio=left, E=1.6, MH=7 | 4 | 4 | #79 | incrustada sin uso |
| `TRAZOS/Cuatro trazos rojos texturizados.png` | 1536×1024 | 1.6 MB | `e50cdc4b` | gastado | inicio=left, E=1.45, MH=10 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/Doodles de grafito sobre blanco (1).png` | 1672×941 | 1.1 MB | `0ef89bdf` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Doodles de grafito sobre blanco.png` | 1672×941 | 1.1 MB | `a3c23305` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Franjas de pintura roja sobre blanco.png` | 1536×1024 | 2.0 MB | `69c2c224` | pincel | inicio=left, E=1.4, MH=14 | 4 | 4 | #64 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_6l56yc6l56yc6l56.jpg` | 1536×2752 | 2.8 MB | `44adc9c6` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #24, #33 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_8ypgc28ypgc28ypg.jpg` | 1536×2752 | 3.0 MB | `187140f5` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #25, #34 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_gz01rcgz01rcgz01.jpg` | 1536×2752 | 2.6 MB | `a5baef65` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #26, #35 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_jfrkuyjfrkuyjfrk.jpg` | 1536×2752 | 2.6 MB | `0f00cb3e` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #27 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_ksbdqzksbdqzksbd.jpg` | 1536×2752 | 2.7 MB | `a8622af8` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #28 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_omhgriomhgriomhg.jpg` | 1536×2752 | 2.4 MB | `fb33f7dd` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #29 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_scmr90scmr90scmr.jpg` | 1536×2752 | 2.7 MB | `430ed44e` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #30 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg (1).jpg` | 1536×2752 | 2.9 MB | `0877b444` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #31 | USADA |
| `TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg.jpg` | 1536×2752 | 2.9 MB | `0877b444` | guache | inicio=top, E=1.4, MH=14 | 3 | 3 | #32 | USADA |
| `TRAZOS/Garabato de carbón en curva.png` | 1672×941 | 1.7 MB | `4577ab79` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Garabatos abstractos de grafito.png` | 1672×941 | 1.6 MB | `09dff1bc` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Garabatos abstractos en tinta negra.png` | 1672×941 | 1.6 MB | `8643eb03` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Garabatos de marcador negro sobre blanco.png` | 1672×941 | 1.7 MB | `fade6f08` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Gemini_Generated_Image_1m2vhi1m2vhi1m2v.jpg` | 1536×2752 | 1.3 MB | `1fab4c77` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #56 | USADA |
| `TRAZOS/Gemini_Generated_Image_2tepo62tepo62tep.jpg` | 2752×1536 | 1.7 MB | `83841594` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg` | 2752×1536 | 3.0 MB | `4473e9c1` | carbon | inicio=left, E=1.9, MH=11 | 10 | 10 | #49, #53 | USADA |
| `TRAZOS/Gemini_Generated_Image_dd9o77dd9o77dd9o.jpg` | 1536×2752 | 1.3 MB | `93b2c592` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #57 | USADA |
| `TRAZOS/Gemini_Generated_Image_fooa8gfooa8gfooa.jpg` | 1536×2752 | 1.9 MB | `8f83c88e` | pincel | inicio=top, E=1.4, MH=14 | 1 | 0 | — | procesada, ninguna cinta entra en el tope |
| `TRAZOS/Gemini_Generated_Image_gtyi67gtyi67gtyi.jpg` | 1536×2752 | 1.2 MB | `f2a1c7db` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #58 | USADA |
| `TRAZOS/Gemini_Generated_Image_i9od48i9od48i9od.jpg` | 1536×2752 | 1.2 MB | `ea436562` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #59 | USADA |
| `TRAZOS/Gemini_Generated_Image_ogccn5ogccn5ogcc.jpg` | 1536×2752 | 1.2 MB | `03943175` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #60 | USADA |
| `TRAZOS/Gemini_Generated_Image_uoqx5fuoqx5fuoqx.jpg` | 1536×2752 | 1.3 MB | `160a8c8a` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #61 | USADA |
| `TRAZOS/Gemini_Generated_Image_uy13atuy13atuy13.jpg` | 2752×1536 | 2.1 MB | `9e733a69` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Gemini_Generated_Image_xw72ktxw72ktxw72.jpg` | 1536×2752 | 1.5 MB | `7b13ec84` | pincel | inicio=top, E=1.4, MH=14 | 1 | 1 | #62 | USADA |
| `TRAZOS/Hoja de garabatos de grafito texturizado.png` | 1672×941 | 1.7 MB | `4292e978` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Hoja de garabatos en tinta negra.png` | 1672×941 | 1.1 MB | `d3a9f4ea` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Hoja de pruebas de garabatos en tinta-1.png` | 1672×941 | 1.3 MB | `e3b92141` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Hoja minimalista de garabatos en tinta.png` | 1672×941 | 1.1 MB | `54352859` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg` | 1536×2752 | 3.3 MB | `46afa9de` | carbon | inicio=top, E=1.9, MH=11 | 4 | 3 | #46, #50, #54 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg` | 1536×2752 | 2.9 MB | `80dad666` | lapiz | inicio=top, E=1.5, MH=10 | 3 | 3 | #36, #40, #44 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg` | 1536×2752 | 3.0 MB | `d3a26863` | lapiz | inicio=top, E=1.5, MH=10 | 7 | 2 | #37, #41 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg` | 1536×2752 | 3.3 MB | `16105ce5` | carbon | inicio=top, E=1.9, MH=11 | 3 | 3 | #47, #51, #55 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg` | 1536×2752 | 3.0 MB | `8b1330c2` | lapiz | inicio=top, E=1.5, MH=10 | 3 | 3 | #38, #42, #45 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg` | 1536×2752 | 3.3 MB | `d3641f94` | lapiz | inicio=top, E=1.5, MH=10 | 3 | 2 | #39, #43 | USADA |
| `TRAZOS/LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg` | 1536×2752 | 3.1 MB | `8b1caba3` | carbon | inicio=top, E=1.9, MH=11 | 3 | 3 | #48, #52 | USADA |
| `TRAZOS/Líneas azules sobre fondo blanco.png` | 1536×1024 | 1.1 MB | `f59dfd6a` | rotu | inicio=left, E=1.6, MH=7 | 4 | 4 | #78 | incrustada sin uso |
| `TRAZOS/Líneas azules sobre papel blanco.png` | 1672×941 | 2.1 MB | `7b041383` | boli | inicio=left, E=2.2, MH=3 | 5 | 5 | #81, #85 | incrustada sin uso |
| `TRAZOS/Líneas horizontales dibujadas a mano.png` | 1536×1024 | 1.6 MB | `14b0c42b` | boli | inicio=left, E=2.2, MH=3 | 0 | 0 | — | procesada, ninguna cinta entra en el tope |
| `TRAZOS/Líneas rojas sobre papel blanco.png` | 1536×1024 | 2.0 MB | `273a3106` | boli | inicio=left, E=2.2, MH=3 | 6 | 6 | #82, #86 | incrustada sin uso |
| `TRAZOS/Muestras abstractas de pincel seco en grises.png` | 1672×941 | 1.6 MB | `fbf9018e` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Muestras de pinceladas azules en blanco.png` | 1536×1024 | 1.8 MB | `9f80ec4e` | pincel | inicio=left, E=1.4, MH=14 | 4 | 4 | #68 | USADA |
| `TRAZOS/OLEO/Gemini_Generated_Image_9d31iy9d31iy9d31.jpg` | 1536×2752 | 3.0 MB | `26c06c0b` | oleo | inicio=top, E=1.4, MH=16 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/OLEO/Gemini_Generated_Image_br79m9br79m9br79.jpg` | 1536×2752 | 3.0 MB | `fa7773c2` | oleo | inicio=top, E=1.4, MH=16 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/OLEO/Gemini_Generated_Image_gscen4gscen4gsce.jpg` | 1536×2752 | 2.9 MB | `f0e4f581` | oleo | inicio=top, E=1.4, MH=16 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |
| `TRAZOS/Ocho pinceladas azules sobre blanco.png` | 1536×1024 | 1.3 MB | `2b56822c` | pincel | inicio=left, E=1.4, MH=14 | 7 | 7 | #69 | USADA |
| `TRAZOS/Pincelada gris sobre blanco.png` | 941×1672 | 1.4 MB | `0e36d278` | brocha | inicio=top, E=1.35, MH=10 | 1 | 1 | #70 | USADA |
| `TRAZOS/Pincelada vertical gris sobre blanco.png` | 941×1672 | 1.6 MB | `9af81d46` | brocha | inicio=top, E=1.35, MH=10 | 1 | 1 | #71 | USADA |
| `TRAZOS/Pinceladas azules sobre blanco.png` | 1536×1024 | 1.7 MB | `0636e9a1` | pincel | inicio=left, E=1.4, MH=14 | 6 | 6 | #66 | USADA |
| `TRAZOS/Pinceladas rojas sobre blanco.png` | 1536×1024 | 1.3 MB | `aca488fb` | pincel | inicio=left, E=1.4, MH=14 | 4 | 4 | #65 | USADA |
| `TRAZOS/Pruebas abstractas de rotulador seco (1).png` | 1672×941 | 1.6 MB | `775202a0` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Pruebas abstractas de rotulador seco.png` | 1672×941 | 1.6 MB | `775202a0` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Trazo serpenteante de carbón.png` | 1672×941 | 1.5 MB | `c3fe876b` | — | — | — | — | — | NO USADA (no está en SOURCES) |
| `TRAZOS/Trazos azules sobre fondo blanco (1).png` | 1536×1024 | 1.7 MB | `24e379b7` | pincelfino | inicio=left, E=1.4, MH=12 | 5 | 5 | #72, #73, #74, #75, #76 | USADA |
| `TRAZOS/Trazos azules sobre fondo blanco.png` | 1536×1024 | 1.6 MB | `6b53b3ad` | pincel | inicio=left, E=1.4, MH=14 | 4 | 4 | #67 | USADA |
| `TRAZOS/Tres líneas negras sobre fondo blanco.png` | 1536×1024 | 1.1 MB | `e0bd2d61` | rotu | inicio=left, E=1.6, MH=7 | 3 | 3 | — | procesada, ninguna cinta entra en el tope |
| `TRAZOS/Tres trazos azules texturizados.png` | 1536×1024 | 1.6 MB | `618c499e` | gastado | inicio=left, E=1.45, MH=10 | — | — | — | en SOURCES pero la familia tiene tope 0: no se procesa |

Resumen: **46 archivos usados de verdad** (dan 77 cintas), **7 archivos que solo dan cintas muertas** (`boli`, `rotu`:
11 cintas), **3 procesados que no aportan nada**, **7 en la lista pero con tope 0** (`OLEO/` ×3 y `gastado` ×4) y
**17 que no están en la lista** (garabatos, doodles, hojas de pruebas, dos Gemini sueltos, «pincel seco en grises»,
«rotulador seco» ×2, dos trazos de carbón en curva). Los garabatos no sirven a este extractor porque solo acepta
trazos rectos.

Rarezas a tener en cuenta al unificar:

- **Tres parejas de archivos idénticos** (mismo md5): `CERAS/…uh9z0x….jpg` y su `(1)`, `GUACHE/…t7kg8s….jpg` y su `(1)`,
  `Pruebas abstractas de rotulador seco.png` y su `(1)`. Las dos primeras parejas **se procesan las dos**, así que hay
  cintas repetidas: #14/#15 y #19/#20 (cera), y #31/#32 (guache). Si la biblioteca deduplica por md5, el resultado
  cambia salvo que A mano conserve esas repeticiones en su selección.
- Un nombre con caracteres tailandeses: `Cuatro líneas rojas dibujadas a manoยิงปลา.png` (en `SOURCES` se busca con comodín).
- Dos archivos casi homónimos que van a familias distintas: `Trazos azules sobre fondo blanco.png` → `pincel` y
  `Trazos azules sobre fondo blanco (1).png` → `pincelfino` (no son duplicados).
- `LAPIZ/` contiene lápiz (4 archivos) **y carbón** (3 archivos); un cuarto carbón está en la raíz.

**Fuentes de grumos (`referencias/texturas/`)**

| Archivo | Píxeles | Peso | md5 | Familia | Plan de recorte (clase, radio en px de la foto, cuántos) | Sellos obtenidos | Estado |
|---|---|---|---|---|---|---|---|
| `referencias/texturas/_grumos_recortados.png` | 2706×472 | 0.29 MB | `32eef6a3` | — | hoja de control generada por `grumos.py` (no es fuente) | — | no es fuente |
| `referencias/texturas/pared_piel_4.jpg` | 1254×1254 gris | 0.36 MB | `831b99f6` | grumo | S R=7 ×4, S R=20 ×3 (sin exigir bulto) | 7 (S 7, M 0, L 0) | USADA |
| `referencias/texturas/pintura_granos_2.jpg` | 1254×1254 gris | 0.33 MB | `b69ffc89` | grumo | S R=8 ×7, S R=12 ×6, M R=20 ×2 (0 válidos) | 13 (S 13, M 0, L 0) | USADA |
| `referencias/texturas/pintura_grumos_1.jpg` | 2048×2048 gris | 1.88 MB | `661b7838` | grumo | S R=11 ×4, M R=22 ×5, M R=32 ×5, L R=48 ×4, L R=68 ×4 (3 válidos) | 21 (S 4, M 10, L 7) | USADA |
| `referencias/texturas/pintura_grumos_3.jpg` | 2048×2048 gris | 1.74 MB | `93a7dba2` | grumo | M R=22 ×4, M R=32 ×4, L R=52 ×3 (1 válido), L R=76 ×3 (0 válidos) | 9 (S 0, M 8, L 1) | USADA |

Las 4 fotos las subió Iker al chat y se guardaron en gris con estos nombres; no conservo el nombre original
(«sin verificar» si coinciden con algo de otro repositorio; ver 4).

**Otras carpetas con imágenes que NO son textura**: `referencias/tipos/` (19 muestras de letra: las lee `glyphref.py`
para sacar esqueletos de letras, y sirven de referencia visual), `referencias/*.png|jpg` (15 referencias visuales que
no lee ningún programa), `fonts/svg/` (6 fuentes), `icons/` (4 PNG del panel).

### 3.6 Las 88 cintas, una a una

| # | Familia | Col × filas | ar | Medio ancho en la foto (px) | Archivo de origen (dentro de `TRAZOS/`) | md5 de los bytes |
|---|---|---|---|---|---|---|
| #0 | aguada | 46×368 | 1.0 | 91.7 | `AGUADAS/Gemini_Generated_Image_6lti5j6lti5j6lti.jpg` | `195de6a5` |
| #1 | aguada | 46×184 | 1.0 | 116.0 | `AGUADAS/Gemini_Generated_Image_6p6u0m6p6u0m6p6u.jpg` | `ea9d7fc3` |
| #2 | aguada | 46×387 | 1.0 | 89.0 | `AGUADAS/Gemini_Generated_Image_bygjtubygjtubygj.jpg` | `6a84b61f` |
| #3 | aguada | 46×294 | 1.0 | 112.0 | `AGUADAS/Gemini_Generated_Image_hbkpvbhbkpvbhbkp.jpg` | `df0a6bb9` |
| #4 | aguada | 46×270 | 1.0 | 131.0 | `AGUADAS/Gemini_Generated_Image_nft1n4nft1n4nft1.jpg` | `2389e130` |
| #5 | aguada | 46×288 | 1.0 | 119.2 | `AGUADAS/Gemini_Generated_Image_umv2e3umv2e3umv2.jpg` | `713af0df` |
| #6 | aguada | 46×234 | 1.0 | 110.5 | `AGUADAS/Gemini_Generated_Image_z82hx1z82hx1z82h.jpg` | `a6a8a604` |
| #7 | aguada | 46×339 | 1.0 | 89.6 | `AGUADAS/Gemini_Generated_Image_6lti5j6lti5j6lti.jpg` | `ee92b198` |
| #8 | aguada | 46×199 | 1.0 | 115.5 | `AGUADAS/Gemini_Generated_Image_6p6u0m6p6u0m6p6u.jpg` | `a30daedb` |
| #9 | aguada | 46×408 | 1.0 | 72.0 | `AGUADAS/Gemini_Generated_Image_bygjtubygjtubygj.jpg` | `5346db5f` |
| #10 | aguada | 46×307 | 1.0 | 108.0 | `AGUADAS/Gemini_Generated_Image_hbkpvbhbkpvbhbkp.jpg` | `7050dc8e` |
| #11 | aguada | 46×320 | 1.0 | 103.0 | `AGUADAS/Gemini_Generated_Image_nft1n4nft1n4nft1.jpg` | `9c200b6e` |
| #12 | cera | 58×321 | 1.0 | 135.0 | `CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg` | `5b534ee2` |
| #13 | cera | 58×437 | 1.0 | 70.5 | `CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg` | `0abd244a` |
| #14 | cera | 58×518 | 1.0981 | 81.0 | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg` | `43c95d41` |
| #15 | cera | 58×518 | 1.0981 | 81.0 | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg` | `43c95d41` |
| #16 | cera | 58×448 | 1.0 | 107.5 | `CERAS/Gemini_Generated_Image_y7qljdy7qljdy7ql.jpg` | `f9298577` |
| #17 | cera | 58×316 | 1.0 | 141.0 | `CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg` | `00e5d19d` |
| #18 | cera | 58×394 | 1.0 | 73.5 | `CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg` | `58a34dfa` |
| #19 | cera | 58×520 | 1.1038 | 80.0 | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg` | `0b711291` |
| #20 | cera | 58×520 | 1.1038 | 80.0 | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg` | `0b711291` |
| #21 | cera | 58×494 | 1.0 | 97.0 | `CERAS/Gemini_Generated_Image_y7qljdy7qljdy7ql.jpg` | `a366e1db` |
| #22 | cera | 58×304 | 1.0 | 128.4 | `CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg` | `ce96dd38` |
| #23 | cera | 58×365 | 1.0 | 74.3 | `CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg` | `377e635f` |
| #24 | guache | 39×240 | 1.0 | 126.5 | `GUACHE/Gemini_Generated_Image_6l56yc6l56yc6l56.jpg` | `389dc991` |
| #25 | guache | 39×241 | 1.0 | 109.0 | `GUACHE/Gemini_Generated_Image_8ypgc28ypgc28ypg.jpg` | `4a520787` |
| #26 | guache | 39×241 | 1.0 | 114.0 | `GUACHE/Gemini_Generated_Image_gz01rcgz01rcgz01.jpg` | `b785cb54` |
| #27 | guache | 39×249 | 1.0 | 110.5 | `GUACHE/Gemini_Generated_Image_jfrkuyjfrkuyjfrk.jpg` | `b3cc150b` |
| #28 | guache | 39×231 | 1.0 | 121.5 | `GUACHE/Gemini_Generated_Image_ksbdqzksbdqzksbd.jpg` | `65f5367e` |
| #29 | guache | 39×287 | 1.0 | 112.4 | `GUACHE/Gemini_Generated_Image_omhgriomhgriomhg.jpg` | `f867b435` |
| #30 | guache | 39×218 | 1.0 | 103.0 | `GUACHE/Gemini_Generated_Image_scmr90scmr90scmr.jpg` | `d65f35f4` |
| #31 | guache | 39×271 | 1.0 | 111.0 | `GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg (1).jpg` | `d9cdfc56` |
| #32 | guache | 39×271 | 1.0 | 111.0 | `GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg.jpg` | `d9cdfc56` |
| #33 | guache | 39×240 | 1.0 | 124.0 | `GUACHE/Gemini_Generated_Image_6l56yc6l56yc6l56.jpg` | `9bab311c` |
| #34 | guache | 39×267 | 1.0 | 107.5 | `GUACHE/Gemini_Generated_Image_8ypgc28ypgc28ypg.jpg` | `09d6dc8c` |
| #35 | guache | 39×257 | 1.0 | 116.0 | `GUACHE/Gemini_Generated_Image_gz01rcgz01rcgz01.jpg` | `f18aa19d` |
| #36 | lapiz | 30×268 | 1.0 | 74.5 | `LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg` | `f966f3c7` |
| #37 | lapiz | 30×233 | 1.0 | 95.5 | `LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg` | `294280fb` |
| #38 | lapiz | 30×315 | 1.0 | 68.5 | `LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg` | `f0d0b716` |
| #39 | lapiz | 30×330 | 1.0 | 70.5 | `LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg` | `69fe141e` |
| #40 | lapiz | 30×335 | 1.0 | 55.5 | `LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg` | `fdba18c5` |
| #41 | lapiz | 30×296 | 1.0 | 70.5 | `LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg` | `727e6e15` |
| #42 | lapiz | 30×293 | 1.0 | 73.5 | `LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg` | `466992af` |
| #43 | lapiz | 30×281 | 1.0 | 83.0 | `LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg` | `e3c4fdc8` |
| #44 | lapiz | 30×510 | 1.075 | 33.0 | `LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg` | `5b2d74fd` |
| #45 | lapiz | 30×326 | 1.0 | 63.4 | `LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg` | `c6e1cbe3` |
| #46 | carbon | 42×165 | 1.0 | 128.0 | `LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg` | `341198ec` |
| #47 | carbon | 42×177 | 1.0 | 119.0 | `LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg` | `82c32773` |
| #48 | carbon | 42×215 | 1.0 | 100.4 | `LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg` | `b6fe8d5d` |
| #49 | carbon | 42×197 | 1.0 | 57.0 | `Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg` | `2b9d2af3` |
| #50 | carbon | 42×180 | 1.0 | 99.3 | `LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg` | `ccf5e406` |
| #51 | carbon | 42×338 | 1.0 | 66.0 | `LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg` | `30a916a7` |
| #52 | carbon | 42×163 | 1.0 | 99.4 | `LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg` | `0fa1e5e2` |
| #53 | carbon | 42×166 | 1.0 | 66.8 | `Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg` | `3ff4e9ec` |
| #54 | carbon | 42×239 | 1.0 | 91.0 | `LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg` | `8030efc6` |
| #55 | carbon | 42×198 | 1.0 | 101.1 | `LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg` | `0833a8cb` |
| #56 | pincel | 39×199 | 1.0 | 161.0 | `Gemini_Generated_Image_1m2vhi1m2vhi1m2v.jpg` | `f6b405a0` |
| #57 | pincel | 39×229 | 1.0 | 148.0 | `Gemini_Generated_Image_dd9o77dd9o77dd9o.jpg` | `7458caa7` |
| #58 | pincel | 39×177 | 1.0 | 159.1 | `Gemini_Generated_Image_gtyi67gtyi67gtyi.jpg` | `38091beb` |
| #59 | pincel | 39×178 | 1.0 | 163.0 | `Gemini_Generated_Image_i9od48i9od48i9od.jpg` | `54ce384b` |
| #60 | pincel | 39×192 | 1.0 | 159.0 | `Gemini_Generated_Image_ogccn5ogccn5ogcc.jpg` | `ba21f5b1` |
| #61 | pincel | 39×212 | 1.0 | 148.5 | `Gemini_Generated_Image_uoqx5fuoqx5fuoqx.jpg` | `8d2e136b` |
| #62 | pincel | 39×197 | 1.0 | 171.5 | `Gemini_Generated_Image_xw72ktxw72ktxw72.jpg` | `887a2d15` |
| #63 | pincel | 39×369 | 1.0 | 41.5 | `Cuatro pinceladas rojas sobre blanco.png` | `652c14c0` |
| #64 | pincel | 39×249 | 1.0 | 73.1 | `Franjas de pintura roja sobre blanco.png` | `35fb9b66` |
| #65 | pincel | 39×421 | 1.0 | 39.5 | `Pinceladas rojas sobre blanco.png` | `a3372bc0` |
| #66 | pincel | 39×409 | 1.0 | 49.5 | `Pinceladas azules sobre blanco.png` | `c74b44e2` |
| #67 | pincel | 39×256 | 1.0 | 69.5 | `Trazos azules sobre fondo blanco.png` | `80caa77e` |
| #68 | pincel | 39×498 | 1.0 | 38.5 | `Muestras de pinceladas azules en blanco.png` | `9d166b13` |
| #69 | pincel | 39×520 | 1.3654 | 26.4 | `Ocho pinceladas azules sobre blanco.png` | `ecb8e57c` |
| #70 | brocha | 27×135 | 1.0 | 120.5 | `Pincelada gris sobre blanco.png` | `c706d344` |
| #71 | brocha | 27×118 | 1.0 | 138.5 | `Pincelada vertical gris sobre blanco.png` | `5526f67d` |
| #72 | pincelfino | 34×480 | 1.0 | 30.0 | `Trazos azules sobre fondo blanco (1).png` | `1bd547ad` |
| #73 | pincelfino | 34×404 | 1.0 | 35.1 | `Trazos azules sobre fondo blanco (1).png` | `2a13b153` |
| #74 | pincelfino | 34×497 | 1.0 | 28.5 | `Trazos azules sobre fondo blanco (1).png` | `72bd717d` |
| #75 | pincelfino | 34×520 | 1.0788 | 25.5 | `Trazos azules sobre fondo blanco (1).png` | `e90f4843` |
| #76 | pincelfino | 34×520 | 2.2173 | 12.0 | `Trazos azules sobre fondo blanco (1).png` | `d835d86a` |
| #77 | rotu | 22×520 | 1.1212 | 15.0 | `Cinco líneas azules dibujadas a mano.png` | `179de284` |
| #78 | rotu | 22×520 | 2.0385 | 8.8 | `Líneas azules sobre fondo blanco.png` | `02c08096` |
| #79 | rotu | 22×520 | 1.5462 | 11.0 | `Cuatro trazos negros horizontales.png` | `6edf2462` |
| #80 | boli | 13×520 | 2.8827 | 2.0 | `Cinco líneas azules sobre blanco.png` | `8fbbc939` |
| #81 | boli | 13×520 | 1.225 | 2.1 | `Líneas azules sobre papel blanco.png` | `3bead1f2` |
| #82 | boli | 13×518 | 2.1654 | 3.5 | `Líneas rojas sobre papel blanco.png` | `363be5af` |
| #83 | boli | 13×520 | 2.3635 | 3.0 | `Cuatro líneas rojas dibujadas a manoยิงปลา.png` | `46cb756f` |
| #84 | boli | 13×520 | 2.3288 | 2.5 | `Cinco líneas azules sobre blanco.png` | `c32167b7` |
| #85 | boli | 13×520 | 2.3635 | 2.0 | `Líneas azules sobre papel blanco.png` | `334b6d79` |
| #86 | boli | 13×520 | 2.2115 | 3.4 | `Líneas rojas sobre papel blanco.png` | `91e9e9a2` |
| #87 | boli | 13×520 | 2.3365 | 3.0 | `Cuatro líneas rojas dibujadas a manoยิงปลา.png` | `dcd45321` |

### 3.7 Los 50 sellos de grumo, uno a uno

Orden en el que van en `js/grumosdata.js` (ya barajados). `R` = radio del bulto en la foto; posición = centro en la foto.

| # | Clase y nº | Tamaño | Foto (dentro de `referencias/texturas/`) | R | Centro (x, y) |
|---|---|---|---|---|---|
| 0 | S 0 | 20×20 | `pintura_granos_2.jpg` | 8 | (187, 576) |
| 1 | S 1 | 20×20 | `pintura_granos_2.jpg` | 8 | (853, 797) |
| 2 | S 2 | 20×20 | `pintura_granos_2.jpg` | 12 | (538, 1185) |
| 3 | S 3 | 20×20 | `pared_piel_4.jpg` | 7 | (251, 82) |
| 4 | S 4 | 20×20 | `pintura_granos_2.jpg` | 8 | (17, 174) |
| 5 | S 5 | 20×20 | `pintura_grumos_1.jpg` | 11 | (1572, 433) |
| 6 | S 6 | 20×20 | `pintura_granos_2.jpg` | 12 | (1150, 147) |
| 7 | S 7 | 20×20 | `pared_piel_4.jpg` | 7 | (859, 899) |
| 8 | S 8 | 20×20 | `pintura_granos_2.jpg` | 12 | (108, 1175) |
| 9 | S 9 | 20×20 | `pintura_granos_2.jpg` | 8 | (910, 123) |
| 10 | S 10 | 20×20 | `pintura_grumos_1.jpg` | 11 | (540, 79) |
| 11 | S 11 | 20×20 | `pintura_granos_2.jpg` | 8 | (818, 233) |
| 12 | S 12 | 20×20 | `pintura_grumos_1.jpg` | 11 | (1628, 1721) |
| 13 | S 13 | 20×20 | `pared_piel_4.jpg` | 20 | (967, 168) |
| 14 | S 14 | 20×20 | `pintura_grumos_1.jpg` | 11 | (550, 702) |
| 15 | S 15 | 20×20 | `pintura_granos_2.jpg` | 12 | (865, 215) |
| 16 | S 16 | 20×20 | `pared_piel_4.jpg` | 20 | (1057, 1093) |
| 17 | S 17 | 20×20 | `pintura_granos_2.jpg` | 12 | (729, 414) |
| 18 | S 18 | 20×20 | `pared_piel_4.jpg` | 7 | (69, 192) |
| 19 | S 19 | 20×20 | `pintura_granos_2.jpg` | 12 | (258, 31) |
| 20 | S 20 | 20×20 | `pared_piel_4.jpg` | 20 | (741, 133) |
| 21 | S 21 | 20×20 | `pintura_granos_2.jpg` | 8 | (64, 382) |
| 22 | S 22 | 20×20 | `pintura_granos_2.jpg` | 8 | (1131, 232) |
| 23 | S 23 | 20×20 | `pared_piel_4.jpg` | 7 | (283, 217) |
| 24 | M 0 | 36×36 | `pintura_grumos_3.jpg` | 22 | (1053, 913) |
| 25 | M 1 | 36×36 | `pintura_grumos_1.jpg` | 32 | (1428, 1794) |
| 26 | M 2 | 36×36 | `pintura_grumos_3.jpg` | 32 | (1525, 1886) |
| 27 | M 3 | 36×36 | `pintura_grumos_3.jpg` | 32 | (1709, 1711) |
| 28 | M 4 | 36×36 | `pintura_grumos_3.jpg` | 32 | (1736, 1852) |
| 29 | M 5 | 36×36 | `pintura_grumos_1.jpg` | 22 | (772, 1375) |
| 30 | M 6 | 36×36 | `pintura_grumos_1.jpg` | 22 | (1228, 487) |
| 31 | M 7 | 36×36 | `pintura_grumos_3.jpg` | 22 | (1698, 354) |
| 32 | M 8 | 36×36 | `pintura_grumos_1.jpg` | 22 | (764, 1483) |
| 33 | M 9 | 36×36 | `pintura_grumos_1.jpg` | 32 | (962, 614) |
| 34 | M 10 | 36×36 | `pintura_grumos_1.jpg` | 32 | (1703, 1830) |
| 35 | M 11 | 36×36 | `pintura_grumos_1.jpg` | 32 | (873, 1329) |
| 36 | M 12 | 36×36 | `pintura_grumos_1.jpg` | 22 | (679, 599) |
| 37 | M 13 | 36×36 | `pintura_grumos_1.jpg` | 22 | (820, 811) |
| 38 | M 14 | 36×36 | `pintura_grumos_3.jpg` | 22 | (127, 1527) |
| 39 | M 15 | 36×36 | `pintura_grumos_3.jpg` | 22 | (1583, 461) |
| 40 | M 16 | 36×36 | `pintura_grumos_3.jpg` | 32 | (1366, 1015) |
| 41 | M 17 | 36×36 | `pintura_grumos_1.jpg` | 32 | (1282, 199) |
| 42 | L 0 | 56×56 | `pintura_grumos_1.jpg` | 48 | (375, 791) |
| 43 | L 1 | 56×56 | `pintura_grumos_1.jpg` | 48 | (1297, 975) |
| 44 | L 2 | 56×56 | `pintura_grumos_1.jpg` | 48 | (1295, 1505) |
| 45 | L 3 | 56×56 | `pintura_grumos_1.jpg` | 68 | (367, 556) |
| 46 | L 4 | 56×56 | `pintura_grumos_1.jpg` | 68 | (455, 1716) |
| 47 | L 5 | 56×56 | `pintura_grumos_1.jpg` | 68 | (384, 1087) |
| 48 | L 6 | 56×56 | `pintura_grumos_3.jpg` | 52 | (1038, 126) |
| 49 | L 7 | 56×56 | `pintura_grumos_1.jpg` | 48 | (1810, 349) |

---

## 4. NOMBRES

**Cómo llama A mano a sus cosas**

- Familias de cinta (clave `f`): `lapiz`, `carbon`, `cera`, `pincel`, `pincelfino`, `guache`, `brocha`, `aguada`, y las
  muertas `boli`, `rotu`. En el extractor existen además `oleo` y `gastado` (tope 0).
- Clases de grumo: `S` (20 px), `M` (36 px), `L` (56 px).
- Grano de papel: `paper`.
- Técnicas (clave `tool`): `lapiz`, `carbon`, `cera`, `boli`, `rotulador`, `pincel`, `spray` (se muestra «Graffiti»).
- Carpetas de fuentes: `TRAZOS/AGUADAS`, `CERAS`, `GUACHE`, `LAPIZ`, `OLEO`; `referencias/texturas`.
- Ojo con un nombre engañoso: el preset `cera.oleo` se muestra «Gruesa» y usa la familia `cera`; **no** usa `TRAZOS/OLEO`.
  Y el preset `spray.rastro` se muestra «Extintor».

**Material que es el mismo en otros plugins**

| Material de A mano | Otro plugin | Certeza |
|---|---|---|
| Las 80 imágenes de `TRAZOS/` (con sus subcarpetas) | **PAPELATOR**: `APOYO/TRAZOS/` | **Comprobado**: mismos nombres y 12 md5 de 12 comparados idénticos (incluidas las tres parejas duplicadas). PAPELATOR solo usa 2 de ellas («Garabatos abstractos en tinta negra», «Garabatos de marcador negro sobre blanco»), que A mano no usa |
| 10 de esas imágenes (8 Gemini de pincelada + «Pincelada gris…» y «Pincelada vertical gris sobre blanco») | **PAPELATOR**: además repetidas en `APOYO/MANCHA CON  FORMA CONCRETA/` | Comprobado por md5 en su inventario |
| Cintas `guache` y `aguada` | **NEONIZADOR**: `trazo_guache1-14`, `trazo_aguada1-10` | «sin verificar»: por el nombre, muy probablemente las mismas fotos de `GUACHE/` y `AGUADAS/` |
| Cintas `pincel`/`brocha` (pincel seco) | **NEONIZADOR**: `trazo_seco1-8`, `pincel_vert` | «sin verificar» |
| Fotos de grumos `pintura_grumos_1/3`, `pintura_granos_2`, `pared_piel_4` | **PAPELATOR**: `NUEVAS SUPERFICIES/Textura de pintura gris con grumos y relieves.png` y los estucos / paredes blancas | «sin verificar»: aquí están en gris y JPG, el md5 no puede coincidir aunque fuese la misma imagen |
| Grano de papel (sintético) | **PAPELATOR**: `texturas_tileables/` (papel acuarela, blanco fino…); **NEONIZADOR**: `papel_fibra`, `papel_rugoso` | No es el mismo material: el de A mano no sale de foto. Podría sustituirse por uno real |
| Chorretones (por código) | **NEONIZADOR**: goteos de foto `gt_*` | Mismo concepto, distinto método |
| — | **Analog FX**, **Trazo** | «sin verificar»: no tengo ningún documento de esos plugins. Por el nombre, **Trazo** podría usar la misma carpeta `TRAZOS/` |

Propuesta de nombre común para lo que A mano llama «cinta»: **cinta de trazo** (trazo recto enderezado, gris, filas a lo
largo). Es un concepto distinto de un «trazo» recortado con transparencia, que es lo que parecen usar los otros plugins.

---

## 5. QUÉ NECESITA DE LA BIBLIOTECA COMÚN

### 5.1 Qué tendría que cambiar

Solo las herramientas de construcción. **El motor, el panel y el `.ccx` no cambian**, y el plugin sigue siendo 100 %
autónomo: las texturas siguen yendo incrustadas, sin Claude y sin internet.

| Archivo | Hoy | Con `Biblioteca/` + índice JSON |
|---|---|---|
| `tools/extract_textures.py` | `TR = <repo>/TRAZOS`; lista `SOURCES` escrita a mano con (archivo o patrón, familia, inicio, E) | raíz configurable (variable de entorno, p. ej. `TEXTURAS_ROOT`, o argumento) y `SOURCES` sustituida por una **selección** que cita ids del índice. Unas 15 líneas |
| `tools/grumos.py` | `REF = <repo>/referencias/texturas`; lista `PLAN` con (archivo, [(clase, radio, cuántos, bulto)]) | lo mismo: raíz configurable y `PLAN` por id. Unas 5 líneas |
| `TRAZOS/`, `referencias/texturas/` | dentro del repo de A mano (165 MB + 4,6 MB) | se podrían borrar del repo de A mano |
| `TRAZOS/LEEME.md`, `src/LICENCIAS.txt` (última línea), `CONTEXTO_A_MANO.md` | dicen «carpeta TRAZOS del proyecto» | actualizar el texto |
| `js/texdata.js`, `js/grumosdata.js` | generados y **versionados en git** | igual; siguen versionados, así el plugin se construye aunque la biblioteca no esté a mano |

Lo que A mano necesita que traiga el índice para cada imagen de trazos: **id estable**, ruta, md5, **familia**
(lápiz, carbón, cera, pincel, pincel fino, guache, brocha, aguada…) y **por dónde empieza el trazo** (`top` o `left`).
Los demás parámetros (`E`, `MH`, topes) son decisiones de A mano y prefiero que sigan en su herramienta.

### 5.2 Tres condiciones para que el resultado no cambie ni un píxel

1. **Los mismos píxeles de origen.** Mismo archivo (md5), sin recomprimir ni redimensionar. Un JPG vuelto a guardar
   cambia las cintas.
2. **El mismo orden.** La cinta que le toca a cada trazo depende de su posición en la lista. Hoy el orden es: orden de
   `SOURCES`, dentro de cada patrón orden alfabético de archivo, dentro de cada archivo orden de etiquetado, y luego el
   reparto por turnos. La selección de A mano tiene que fijar ese orden explícitamente y no depender de cómo ordene la
   biblioteca.
3. **Los duplicados cuentan.** Las dos parejas idénticas de `CERAS/` y `GUACHE/` dan cintas repetidas (ver 3.5). O se
   conservan en la selección, o se acepta un cambio mínimo y medible.

### 5.3 Qué recibiría mejor ya procesado y común, y qué prefiere procesar él

| Cosa | Preferencia |
|---|---|
| **Fotos originales intactas** con índice (id, md5, familia, inicio del trazo) | **Imprescindible.** Es lo único que garantiza el mismo resultado |
| **Cintas de trazo ya enderezadas** (PNG gris 8 bits, filas a lo largo, + JSON con `mh`, `ar`, familia, archivo de origen) | Me vendría bien **como producto común nuevo**, porque es lo que otros plugins de trazo también necesitarían. Pero solo las adoptaría si son exactamente las de la tabla 3.6 (se pueden comparar por md5) o aceptando regenerar las referencias |
| **Sellos de grumo** (PNG gris 8 bits, 128 = neutro, luz desde arriba, borde a cero) | Igual: útil como producto común («sellos de relieve»). A mano puede publicar los 50 que ya tiene |
| **Tileables de papel a escala real** | Sí, ya procesados. A mano solo necesita una baldosa gris repetible de grano; hoy la inventa |
| Recortes RGBA de manchas, bordes, pliegues, overlays, mapas de desplazamiento | No los usa |
| Empaquetado a base64, elección y tope por familia, normalización (percentil 99,3; 80 en ceras), recorte de colas | Prefiere seguir haciéndolo él: depende de cómo lee su motor las cintas |

### 5.4 Qué le falta o le gustaría tener

- **Grano de papel real**, repetible y con escala conocida (acuarela, verjurado, papel de dibujo), para sustituir el
  sintético y poder elegir papel.
- **Más `brocha`**: solo hay 2 cintas, y cortas (118 y 135 filas).
- **Óleo**: hay 3 fotos en `TRAZOS/OLEO` sin usar (tope 0); haría falta decidir una técnica que las use.
- **Trazos reales de rotulador y de boli largos y limpios**: hoy son procedurales; las cintas `rotu` y `boli` que hay
  (3 y 8) se abandonaron por pocas y finas (medio ancho de 2 a 15 px en la foto).
- **Tiza y pastel** sobre superficie rugosa: no hay nada.
- **Grumos grandes**: de los 14 de clase L pedidos solo salieron 8 (de `pintura_grumos_3.jpg`, 1 de 6). Hacen falta
  fotos de pintura con goterones gordos, luz rasante desde arriba.
- **Material real de bote** para contrastar o sustituir lo procedural: borde y halo de spray sobre pared, chorretones
  reales (los `gt_*` de NEONIZADOR podrían valer), calvas de rodillo de tóner, trama de tela empapada.
- **Trazos curvos**: el extractor solo acepta rectos, por eso no se aprovechan los garabatos.

---

## 6. CÓMO COMPROBAR QUE NO SE ROMPE

Todo lo de esta sección se ha ejecutado hoy sobre el commit analizado.

**A. Los módulos generados tienen que salir idénticos** (prueba exacta, la más fuerte)

```
python3 tools/extract_textures.py && md5sum js/texdata.js     # 182e0cdba680cba58fea00c0dd254ca5
python3 tools/grumos.py           && md5sum js/grumosdata.js  # d3ca0cf24cb8a2ba3fa4b8a3869c2eba
git status --short js/                                         # no debe listar nada
```

- `grumos.py`: regenerado hoy, **archivo idéntico** (mismo md5).
- `extract_textures.py`: regeneradas hoy las 88 cintas y la baldosa de papel con sus mismas funciones, **las 89 piezas
  idénticas byte a byte**. No he ejecutado el script tal cual para no reescribir un archivo del repo; el md5 del archivo
  completo debería salir el indicado («sin verificar» solo ese último paso).
- Depende de las versiones de numpy, scipy y Pillow. Con las indicadas en el apartado 2 sale exacto; con otras podría
  variar algún byte por redondeo, sin que sea un fallo de la biblioteca.

**B. Huella de render** (por si A no sale exacta y hay que medir cuánto cambia)

Un render de 1000×460 por cada técnica y preset, mismo texto y semilla, y el md5 del PNG. Es determinista (dos pasadas
seguidas dan lo mismo) y **sí depende de las texturas**: en `spray_gordo`, sin grumos el md5 pasa a `daebb730…` y sin
relieve a `2eac18e0…`. Valores de referencia de la 2.38.0:

```json
{
 "lapiz_hb": "bd07e86121a648905bd00649a0252ab2",
 "lapiz_blando": "772963b4faed7e6a6d8b76a15372006a",
 "lapiz_nervioso": "f32d02841cf3f13e2cf8666d233826c5",
 "carbon_suave": "414ba0dfda49ae2088e6ffcfef9e3f4c",
 "carbon_fuerte": "65d6e10c1f05dc64326e76c63820592f",
 "carbon_fino": "d99cd1a2271b63b2a90ba5ce9645063e",
 "cera_oleo": "ae4693a734e4c52f8006be248ed25ac9",
 "cera_cera": "419f400620cbaa1d79017da0f22ca424",
 "cera_fina": "b7721a6af4dd4c2535d99f0792ec8842",
 "boli_bic": "2592489cf7379a6badff36c353a2dff5",
 "boli_fino": "bbfd0dc14cbfcf4056637c7fdc0a45e0",
 "boli_gel": "2ff951edc650ae7938fba3fec868dd0a",
 "rotulador_fino": "89b99412eb07b47d823bf1162e7f3731",
 "rotulador_gordo": "f7436227d34aa22096ae646b2f60d40e",
 "rotulador_gastado": "aa8e07584996b957c72d52b552f312ed",
 "pincel_fino": "26c0764da23f582fd5276f15f568be47",
 "pincel_gordo": "ba1533f5907cc9e725378795685d5c74",
 "pincel_seco": "247ee03b34151da2b9421ae91a95dab3",
 "pincel_humedo": "493e0eaa30bdf3626b1529a888198a44",
 "spray_gordo": "bab9090258af198733e9d0c59c5e76dc",
 "spray_fino": "474eef907cee7fe87265af33785f0ffd",
 "spray_seco": "fc63ec60016b8169ed2f3479bcbe29d8",
 "spray_mop": "22c4faab248be89659a82e6fb332ed30",
 "spray_plano": "f0e3b57590d9d823378f1c88e03e3120",
 "spray_rastro": "c14ba674d871157d8cbc45608e6eeaac",
 "spray_empapado": "ac471ef37c3c4f16d1dd6bac377ca2de",
 "spray_rodillo": "009040ee53d5622f5fe8f21b3d0b7d7c"
}
```

Script usado (no está en el repo porque no debía cambiar nada; se puede guardar como `tests/node/huella.js`):

```js
// Huella de referencia: un render por técnica y preset; md5 del PNG.  node huella.js DIR_SALIDA
process.argv[2] = process.argv[2] || '/tmp/huella';
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const ROOT = process.env.AMANO || '/home/claude/a-mano';
const PV = require(path.join(ROOT, 'tests/node/preview.js')), INK = require(path.join(ROOT, 'js/ink.js'));
const OUT = process.argv[2], res = {};
for (const tool of INK.TOOL_ORDER) for (const pk of Object.keys(INK.TOOLS[tool].presets)) {
  const name = tool + '_' + pk, p = { tool, preset: pk };
  if (tool === 'spray') Object.assign(p, { persona: 'graffiti_c', mode: 'mayus', color: '#3f7a2a', relieve: 0.5 });
  PV.render(name, { text: 'Nadie había cerrado\nla puerta del sótano', levels: [0, 2, 1, 0, 0, -1, 0], shape: 'rect', p, W: 1000, H: 460, box: { left: 50, top: 50, right: 950, bottom: 410 }, showShape: false, seed: 12345 });
  res[name] = crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, name + '.png'))).digest('hex');
}
fs.writeFileSync(path.join(OUT, 'huella.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
```

Qué presets cubren qué asset: `lapiz_*`, `carbon_*`, `cera_*`, `pincel_*` → cintas; los mismos más `boli_*` y
`rotulador_*` → grano de papel; `spray_gordo|fino|seco|mop|plano|rastro` → grumos. `spray_empapado` y `spray_rodillo` no
tocan ninguna textura.

**C. Pruebas que ya existen en el repo**

| Orden | Qué comprueba | Resultado hoy |
|---|---|---|
| `node tests/sim/harness.js` | el plugin entero contra un Photoshop simulado | 67 de 67 |
| `node tests/ae/harness.js` | el panel de After Effects | 19 de 19 |
| `node tests/node/letras/bandtest.js gordo c` | que pintar por franjas (como en Photoshop) da lo mismo que de una vez, con relieve y grumos | 0 píxeles distintos |
| `python3 tools/extract_textures.py --preview DIR` | hojas de contacto `fam_<familia>.png` y `paper.png`, para mirar | — |
| `python3 tools/grumos.py hoja.png` | hoja de contacto de los 50 sellos (hay una guardada: `referencias/texturas/_grumos_recortados.png`) | — |

**D. Límite honesto**: nada de esto se ha visto en un Photoshop real desde esta conversación; las pruebas son con el
motor en Node y con el Photoshop simulado. Como las texturas no pasan por ninguna API de Photoshop, A y B bastan para
garantizar que el cambio de origen no altera el resultado.

---

## 7. ANEXO JSON

Una entrada por cada imagen fuente (usada o no) más el grano de papel sintético. El mismo contenido, junto con la lista
de las 88 cintas, los 50 sellos y la huella de render, está en el archivo **`TEXTURAS_A_MANO.json`** que acompaña a este
documento (raíz del repo), para cruzarlo automáticamente.

Campos: `fuente` (ruta en el repo de A mano), `md5` (completo), `px` [ancho, alto], `familia`, `uso`, `estado`,
`duplicada_con`, `formato_final`, `parametros`.

```json
[
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_6lti5j6lti5j6lti.jpg", "md5": "20ddea7c0fb3b440354ee377a7c7e34c", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [0, 7]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_6p6u0m6p6u0m6p6u.jpg", "md5": "ac6b1c0c21c3685ebafd50b783f0b0b3", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [1, 8]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_bygjtubygjtubygj.jpg", "md5": "2ebff079250c732bac3996e9cd79b633", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [2, 9]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_hbkpvbhbkpvbhbkp.jpg", "md5": "ff9fd5a027b2672038d83ebb42259fd1", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [3, 10]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_nft1n4nft1n4nft1.jpg", "md5": "4a0a9e9765717d23a03bf7bee0b529c6", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 2, "ids_cinta": [4, 11]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_umv2e3umv2e3umv2.jpg", "md5": "0c7d294c3416f7b24c426a5b7573a2e7", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [5]}},
{"fuente": "TRAZOS/AGUADAS/Gemini_Generated_Image_z82hx1z82hx1z82h.jpg", "md5": "4d7017da88104ffd2d20291e4fb0148f", "px": [1536, 2752], "familia": "aguada", "uso": "Pincel Húmedo", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 46 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.55, "MH": 15, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [6]}},
{"fuente": "TRAZOS/CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg", "md5": "b39356083123b118262bc35200d62d4d", "px": [1536, 2752], "familia": "cera", "uso": "Cera (Gruesa, Blanda, Fina)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 58 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.45, "MH": 20, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [12, 17, 22]}},
{"fuente": "TRAZOS/CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg", "md5": "53d0437a073d998a7895372b37008a97", "px": [1536, 2752], "familia": "cera", "uso": "Cera (Gruesa, Blanda, Fina)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 58 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.45, "MH": 20, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [13, 18, 23]}},
{"fuente": "TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg", "md5": "f8bd0d98d712eee34c871a556b86192d", "px": [1536, 2752], "familia": "cera", "uso": "Cera (Gruesa, Blanda, Fina)", "estado": "USADA", "duplicada_con": ["TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg"], "formato_final": "cinta gris 8 bits 58 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.45, "MH": 20, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [14, 19]}},
{"fuente": "TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg", "md5": "f8bd0d98d712eee34c871a556b86192d", "px": [1536, 2752], "familia": "cera", "uso": "Cera (Gruesa, Blanda, Fina)", "estado": "USADA", "duplicada_con": ["TRAZOS/CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg"], "formato_final": "cinta gris 8 bits 58 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.45, "MH": 20, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [15, 20]}},
{"fuente": "TRAZOS/CERAS/Gemini_Generated_Image_y7qljdy7qljdy7ql.jpg", "md5": "e144d33708b20cfa07cdb172e936acce", "px": [1536, 2752], "familia": "cera", "uso": "Cera (Gruesa, Blanda, Fina)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 58 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.45, "MH": 20, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [16, 21]}},
{"fuente": "TRAZOS/Cinco líneas azules dibujadas a mano.png", "md5": "818a69b66f8108734cc8d93bb0615c12", "px": [1536, 1024], "familia": "rotu", "uso": "INCRUSTADA SIN USO (el rotulador es procedural)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 22 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.6, "MH": 7, "trazos_detectados": 5, "cintas_validas": 5, "cintas_incrustadas": 1, "ids_cinta": [77]}},
{"fuente": "TRAZOS/Cinco líneas azules sobre blanco.png", "md5": "0561622b5e78218be9fb1c09ab07cb05", "px": [1536, 1024], "familia": "boli", "uso": "INCRUSTADA SIN USO (el boli es procedural desde hace versiones)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 13 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 2.2, "MH": 3, "trazos_detectados": 6, "cintas_validas": 6, "cintas_incrustadas": 2, "ids_cinta": [80, 84]}},
{"fuente": "TRAZOS/Cinco trazos azules sobre blanco.png", "md5": "2bcd77b876fd57f6580a35b2bc1f6585", "px": [1536, 1024], "familia": "gastado", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 1.45, "MH": 10, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Cinco trazos rojos sobre blanco.png", "md5": "783353d66f31e70cc44e7231723dd965", "px": [1536, 1024], "familia": "gastado", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 1.45, "MH": 10, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Composición minimalista de garabatos abstractos-2.png", "md5": "27e823cf0f448308928b2779bf9bf1ac", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Cuatro líneas rojas dibujadas a manoยิงปลา.png", "md5": "bc3605424110366dd797a920be1bec06", "px": [1535, 1024], "familia": "boli", "uso": "INCRUSTADA SIN USO (el boli es procedural desde hace versiones)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 13 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 2.2, "MH": 3, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 2, "ids_cinta": [83, 87]}},
{"fuente": "TRAZOS/Cuatro pinceladas rojas sobre blanco.png", "md5": "99193ea91cf681edc1b1b5946c6cabb3", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [63]}},
{"fuente": "TRAZOS/Cuatro trazos negros horizontales.png", "md5": "2ccd16b4b8ef13017948403488dc78c2", "px": [1448, 1086], "familia": "rotu", "uso": "INCRUSTADA SIN USO (el rotulador es procedural)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 22 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.6, "MH": 7, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [79]}},
{"fuente": "TRAZOS/Cuatro trazos rojos texturizados.png", "md5": "e50cdc4bb37912262f92e93de71dbb50", "px": [1536, 1024], "familia": "gastado", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 1.45, "MH": 10, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Doodles de grafito sobre blanco (1).png", "md5": "0ef89bdf930e7280939d0a5629de709f", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Doodles de grafito sobre blanco.png", "md5": "a3c23305d2bd31814148a888a1d9bd2e", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Franjas de pintura roja sobre blanco.png", "md5": "69c2c2243bb9c323d644d2ad0eab2969", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [64]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_6l56yc6l56yc6l56.jpg", "md5": "44adc9c64138f6cd1a55bed4cb5abd05", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [24, 33]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_8ypgc28ypgc28ypg.jpg", "md5": "187140f5d0f9d9f90dbe3d6d4f41b521", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [25, 34]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_gz01rcgz01rcgz01.jpg", "md5": "a5baef658ef09e772c1402b130c62c8a", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [26, 35]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_jfrkuyjfrkuyjfrk.jpg", "md5": "0f00cb3e6dbeb43243962b2aad7ebc1f", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [27]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_ksbdqzksbdqzksbd.jpg", "md5": "a8622af802d9a3c83c25bd60e891586d", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [28]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_omhgriomhgriomhg.jpg", "md5": "fb33f7dda84a14d3434758806b5b5cfa", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [29]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_scmr90scmr90scmr.jpg", "md5": "430ed44e661c68c0a1d7a4c760c61c12", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [30]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg (1).jpg", "md5": "0877b4440f565bc67c81c2c19fa64d44", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": ["TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg.jpg"], "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [31]}},
{"fuente": "TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg.jpg", "md5": "0877b4440f565bc67c81c2c19fa64d44", "px": [1536, 2752], "familia": "guache", "uso": "Pincel Fino y Seco", "estado": "USADA", "duplicada_con": ["TRAZOS/GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg (1).jpg"], "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 1, "ids_cinta": [32]}},
{"fuente": "TRAZOS/Garabato de carbón en curva.png", "md5": "4577ab799bee7c1b12bb895a8a8d61c2", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Garabatos abstractos de grafito.png", "md5": "09dff1bc625eed40d42070332e58982f", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Garabatos abstractos en tinta negra.png", "md5": "8643eb03406fa2e9fc578ec60614d7df", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Garabatos de marcador negro sobre blanco.png", "md5": "fade6f08c5b1066e60ed4a83a0dde801", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Gemini_Generated_Image_1m2vhi1m2vhi1m2v.jpg", "md5": "1fab4c773c1595efc5c71fa8ba5d003b", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [56]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_2tepo62tepo62tep.jpg", "md5": "838415947966cceb4e5c32c175f66d01", "px": [2752, 1536], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg", "md5": "4473e9c1d6f00ab84b4073cceaf19f51", "px": [2752, 1536], "familia": "carbon", "uso": "Carbón (Suave, Fuerte, Fino)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 42 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.9, "MH": 11, "trazos_detectados": 10, "cintas_validas": 10, "cintas_incrustadas": 2, "ids_cinta": [49, 53]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_dd9o77dd9o77dd9o.jpg", "md5": "93b2c592d0844bb90bdb735019f8632f", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [57]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_fooa8gfooa8gfooa.jpg", "md5": "8f83c88e63387f8ea7ef103928e1ed63", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "procesada, ninguna cinta entra en el tope", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 0, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Gemini_Generated_Image_gtyi67gtyi67gtyi.jpg", "md5": "f2a1c7dbb7402bd7f31a4c3631b1ce49", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [58]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_i9od48i9od48i9od.jpg", "md5": "ea43656231d6b863d67eb6c169032e5b", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [59]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_ogccn5ogccn5ogcc.jpg", "md5": "039431753bcad30873ec83cfd64ee744", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [60]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_uoqx5fuoqx5fuoqx.jpg", "md5": "160a8c8a106c89a1bde10f3990e915d2", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [61]}},
{"fuente": "TRAZOS/Gemini_Generated_Image_uy13atuy13atuy13.jpg", "md5": "9e733a69d85f09cfcff0ba14c22956ad", "px": [2752, 1536], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Gemini_Generated_Image_xw72ktxw72ktxw72.jpg", "md5": "7b13ec84a1c7508de63bb6cf144d9b9e", "px": [1536, 2752], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.4, "MH": 14, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [62]}},
{"fuente": "TRAZOS/Hoja de garabatos de grafito texturizado.png", "md5": "4292e9785e8e8864442e2cf5218c600c", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Hoja de garabatos en tinta negra.png", "md5": "d3a9f4ea8f61eda0311f144520df5431", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Hoja de pruebas de garabatos en tinta-1.png", "md5": "e3b921410f5a34d000d9ff326b13d8fd", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Hoja minimalista de garabatos en tinta.png", "md5": "543528593844bbbeba90678eeec4402c", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg", "md5": "46afa9de8ecce9fc9ba79d3e9e6721b3", "px": [1536, 2752], "familia": "carbon", "uso": "Carbón (Suave, Fuerte, Fino)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 42 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.9, "MH": 11, "trazos_detectados": 4, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [46, 50, 54]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg", "md5": "80dad666f8311d6edb1754c362d75a5d", "px": [1536, 2752], "familia": "lapiz", "uso": "Lápiz (HB, Blando 6B, Nervioso)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 30 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.5, "MH": 10, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [36, 40, 44]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg", "md5": "d3a26863bf136a2b427559a680ae92bc", "px": [1536, 2752], "familia": "lapiz", "uso": "Lápiz (HB, Blando 6B, Nervioso)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 30 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.5, "MH": 10, "trazos_detectados": 7, "cintas_validas": 2, "cintas_incrustadas": 2, "ids_cinta": [37, 41]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg", "md5": "16105ce5cc4b1d2b200909510e32b70f", "px": [1536, 2752], "familia": "carbon", "uso": "Carbón (Suave, Fuerte, Fino)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 42 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.9, "MH": 11, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [47, 51, 55]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg", "md5": "8b1330c2a986ae301ae99c56608fc9fe", "px": [1536, 2752], "familia": "lapiz", "uso": "Lápiz (HB, Blando 6B, Nervioso)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 30 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.5, "MH": 10, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 3, "ids_cinta": [38, 42, 45]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg", "md5": "d3641f94f2fd796c41a4756940e836fb", "px": [1536, 2752], "familia": "lapiz", "uso": "Lápiz (HB, Blando 6B, Nervioso)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 30 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.5, "MH": 10, "trazos_detectados": 3, "cintas_validas": 2, "cintas_incrustadas": 2, "ids_cinta": [39, 43]}},
{"fuente": "TRAZOS/LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg", "md5": "8b1caba32d3287fa9a08c5de574690c6", "px": [1536, 2752], "familia": "carbon", "uso": "Carbón (Suave, Fuerte, Fino)", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 42 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.9, "MH": 11, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 2, "ids_cinta": [48, 52]}},
{"fuente": "TRAZOS/Líneas azules sobre fondo blanco.png", "md5": "f59dfd6a89692ca182487365a11e774c", "px": [1536, 1024], "familia": "rotu", "uso": "INCRUSTADA SIN USO (el rotulador es procedural)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 22 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.6, "MH": 7, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [78]}},
{"fuente": "TRAZOS/Líneas azules sobre papel blanco.png", "md5": "7b041383b2b1112cff24a78775d2e49d", "px": [1672, 941], "familia": "boli", "uso": "INCRUSTADA SIN USO (el boli es procedural desde hace versiones)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 13 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 2.2, "MH": 3, "trazos_detectados": 5, "cintas_validas": 5, "cintas_incrustadas": 2, "ids_cinta": [81, 85]}},
{"fuente": "TRAZOS/Líneas horizontales dibujadas a mano.png", "md5": "14b0c42ba960ff6b03c8c91c0b1db7b2", "px": [1536, 1024], "familia": "boli", "uso": "INCRUSTADA SIN USO (el boli es procedural desde hace versiones)", "estado": "procesada, ninguna cinta entra en el tope", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 2.2, "MH": 3, "trazos_detectados": 0, "cintas_validas": 0, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Líneas rojas sobre papel blanco.png", "md5": "273a3106ba9c7dbacf9a67d4095f0739", "px": [1536, 1024], "familia": "boli", "uso": "INCRUSTADA SIN USO (el boli es procedural desde hace versiones)", "estado": "incrustada sin uso", "duplicada_con": null, "formato_final": "cinta gris 8 bits 13 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 2.2, "MH": 3, "trazos_detectados": 6, "cintas_validas": 6, "cintas_incrustadas": 2, "ids_cinta": [82, 86]}},
{"fuente": "TRAZOS/Muestras abstractas de pincel seco en grises.png", "md5": "fbf9018ebd9a09f86ce0bf279568f07e", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Muestras de pinceladas azules en blanco.png", "md5": "9f80ec4e19ffa2713ad247331ebb036f", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [68]}},
{"fuente": "TRAZOS/OLEO/Gemini_Generated_Image_9d31iy9d31iy9d31.jpg", "md5": "26c06c0b920161b7a6f75ac8bc51aec7", "px": [1536, 2752], "familia": "oleo", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "top", "E": 1.4, "MH": 16, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/OLEO/Gemini_Generated_Image_br79m9br79m9br79.jpg", "md5": "fa7773c2e2908f4fe146ab0dffa43844", "px": [1536, 2752], "familia": "oleo", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "top", "E": 1.4, "MH": 16, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/OLEO/Gemini_Generated_Image_gscen4gscen4gsce.jpg", "md5": "f0e4f581040ef0f237b0d8879d7c2e53", "px": [1536, 2752], "familia": "oleo", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "top", "E": 1.4, "MH": 16, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Ocho pinceladas azules sobre blanco.png", "md5": "2b56822cc2af4b0551e9091d4cd41f2b", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 7, "cintas_validas": 7, "cintas_incrustadas": 1, "ids_cinta": [69]}},
{"fuente": "TRAZOS/Pincelada gris sobre blanco.png", "md5": "0e36d27811e2498679e00e8a3bb3a6f9", "px": [941, 1672], "familia": "brocha", "uso": "Pincel Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 27 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.35, "MH": 10, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [70]}},
{"fuente": "TRAZOS/Pincelada vertical gris sobre blanco.png", "md5": "9af81d46749352e1f8119c5bc9358f0b", "px": [941, 1672], "familia": "brocha", "uso": "Pincel Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 27 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "top", "E": 1.35, "MH": 10, "trazos_detectados": 1, "cintas_validas": 1, "cintas_incrustadas": 1, "ids_cinta": [71]}},
{"fuente": "TRAZOS/Pinceladas azules sobre blanco.png", "md5": "0636e9a1be6f0583886c3571a0ea61af", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 6, "cintas_validas": 6, "cintas_incrustadas": 1, "ids_cinta": [66]}},
{"fuente": "TRAZOS/Pinceladas rojas sobre blanco.png", "md5": "aca488fbc8295f59772ed252ea43b671", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [65]}},
{"fuente": "TRAZOS/Pruebas abstractas de rotulador seco (1).png", "md5": "775202a00bc42c360c57992507165aa6", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": ["TRAZOS/Pruebas abstractas de rotulador seco.png"], "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Pruebas abstractas de rotulador seco.png", "md5": "775202a00bc42c360c57992507165aa6", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": ["TRAZOS/Pruebas abstractas de rotulador seco (1).png"], "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Trazo serpenteante de carbón.png", "md5": "c3fe876be3dc01ae739045ae74704df7", "px": [1672, 941], "familia": null, "uso": "no usada", "estado": "NO USADA (no está en SOURCES)", "duplicada_con": null, "formato_final": null, "parametros": null},
{"fuente": "TRAZOS/Trazos azules sobre fondo blanco (1).png", "md5": "24e379b7698a72229e7fc58b276b3c58", "px": [1536, 1024], "familia": "pincelfino", "uso": "Pincel Fino", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 34 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 12, "trazos_detectados": 5, "cintas_validas": 5, "cintas_incrustadas": 5, "ids_cinta": [72, 73, 74, 75, 76]}},
{"fuente": "TRAZOS/Trazos azules sobre fondo blanco.png", "md5": "6b53b3ad9f34be43bd013cb4f2c5aba3", "px": [1536, 1024], "familia": "pincel", "uso": "Pincel Gordo y Seco; relleno de negativos a pincel", "estado": "USADA", "duplicada_con": null, "formato_final": "cinta gris 8 bits 39 col × ≤520 filas, base64 en js/texdata.js", "parametros": {"inicio": "left", "E": 1.4, "MH": 14, "trazos_detectados": 4, "cintas_validas": 4, "cintas_incrustadas": 1, "ids_cinta": [67]}},
{"fuente": "TRAZOS/Tres líneas negras sobre fondo blanco.png", "md5": "e0bd2d6160ceb11ef79a8c8eb480e313", "px": [1536, 1024], "familia": "rotu", "uso": "INCRUSTADA SIN USO (el rotulador es procedural)", "estado": "procesada, ninguna cinta entra en el tope", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 1.6, "MH": 7, "trazos_detectados": 3, "cintas_validas": 3, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "TRAZOS/Tres trazos azules texturizados.png", "md5": "618c499ea623d529c21ef45e511d478e", "px": [1536, 1024], "familia": "gastado", "uso": "NO SE EXTRAE (CAP = 0)", "estado": "en SOURCES pero la familia tiene tope 0: no se procesa", "duplicada_con": null, "formato_final": null, "parametros": {"inicio": "left", "E": 1.45, "MH": 10, "trazos_detectados": null, "cintas_validas": null, "cintas_incrustadas": 0, "ids_cinta": []}},
{"fuente": "referencias/texturas/pared_piel_4.jpg", "md5": "831b99f6a72ed4b20a52af4e2c100d15", "px": [1254, 1254], "familia": "grumo", "uso": "sellos de sombreado de grumos de pintura (solo Graffiti con «Textura de la pintura» > 0)", "estado": "USADA", "formato_final": "sellos cuadrados 20/36/56 px, 1 byte/px con signo desplazado (128 = neutro), base64 en js/grumosdata.js", "parametros": {"plan": "S R=7 ×4, S R=20 ×3 (sin exigir bulto)", "sellos": 7, "por_clase": {"S": 7}}},
{"fuente": "referencias/texturas/pintura_granos_2.jpg", "md5": "b69ffc8930e616f15913986c9876474b", "px": [1254, 1254], "familia": "grumo", "uso": "sellos de sombreado de grumos de pintura (solo Graffiti con «Textura de la pintura» > 0)", "estado": "USADA", "formato_final": "sellos cuadrados 20/36/56 px, 1 byte/px con signo desplazado (128 = neutro), base64 en js/grumosdata.js", "parametros": {"plan": "S R=8 ×7, S R=12 ×6, M R=20 ×2 (0 válidos)", "sellos": 13, "por_clase": {"S": 13}}},
{"fuente": "referencias/texturas/pintura_grumos_1.jpg", "md5": "661b783872e168d3f343baaaa39ff703", "px": [2048, 2048], "familia": "grumo", "uso": "sellos de sombreado de grumos de pintura (solo Graffiti con «Textura de la pintura» > 0)", "estado": "USADA", "formato_final": "sellos cuadrados 20/36/56 px, 1 byte/px con signo desplazado (128 = neutro), base64 en js/grumosdata.js", "parametros": {"plan": "S R=11 ×4, M R=22 ×5, M R=32 ×5, L R=48 ×4, L R=68 ×4 (3 válidos)", "sellos": 21, "por_clase": {"S": 4, "M": 10, "L": 7}}},
{"fuente": "referencias/texturas/pintura_grumos_3.jpg", "md5": "93a7dba2d4bd0222f7d4055601acafe9", "px": [2048, 2048], "familia": "grumo", "uso": "sellos de sombreado de grumos de pintura (solo Graffiti con «Textura de la pintura» > 0)", "estado": "USADA", "formato_final": "sellos cuadrados 20/36/56 px, 1 byte/px con signo desplazado (128 = neutro), base64 en js/grumosdata.js", "parametros": {"plan": "M R=22 ×4, M R=32 ×4, L R=52 ×3 (1 válido), L R=76 ×3 (0 válidos)", "sellos": 9, "por_clase": {"M": 8, "L": 1}}},
{"fuente": null, "md5": null, "familia": "papel", "uso": "grano de papel (lápiz, carbón, cera; moteado de rotulador y boli)", "estado": "PROCEDURAL (ruido filtrado, semilla 11)", "formato_final": "baldosa repetible 256×256, 1 byte/px, base64 en js/texdata.js (campo paper), md5 de los bytes 7592b4f48935c0923aff8118ada37f15", "parametros": {"funcion": "tools/extract_textures.py → paper_tile()", "banda_px": "4–14", "escala": "1 téxel = 1 px de documento"}}
]
```
