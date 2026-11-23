# A MANO · TRASPASO COMPLETO

**Para seguir en una conversación nueva o para informar a otra conversación** (TEXTURAS, otros plugins).
Escrito el 23-11-2026. Versión del plugin **2.38.2** · panel de After Effects **0.2.0**.
Sustituye a todos los traspasos anteriores. Lo que aquí se dice como «comprobado» se ha ejecutado o medido; lo que
no se ha podido comprobar va marcado **«sin verificar»**.

---

## 0. Cómo usar este documento

**Si eres la conversación nueva de A mano:**

1. Lee entero este archivo. Lleva lo esencial de 5 documentos y de unas semanas de conversación.
2. Pon en marcha el entorno (§14, «Primeros pasos»): clonar el repo, clonar la biblioteca, montar `TEXTURAS_ROOT`.
3. Lee `CLAUDE.md` del repo (reglas permanentes) y `Biblioteca/CLAUDE.md` (método de búsqueda de material).
4. Para el detalle de cualquier versión: `CONTEXTO_A_MANO.md` (más de 1000 líneas, historial con las palabras de
   Iker). Para las texturas, con tabla cinta a cinta: `TEXTURAS_A_MANO.md` + `TEXTURAS_A_MANO.json`.

**Si eres otra conversación (TEXTURAS, otro plugin):** lee §1, §5 (texturas), §6 (biblioteca), §7 (tipos de
archivo), §12 (necesidades) y §13 (pedidos). Lo demás es interno de A mano.

---

## 1. Identidad y estado

| | |
|---|---|
| Nombre | **A mano** · id UXP `com.amano.handlettering` · panel `amanoPanel` · Photoshop 25.0 o posterior (manifiesto v5) |
| Qué es | Plugin UXP de Photoshop que **escribe texto a mano** (sin fuentes: esqueletos de trazos pintados con un motor de tinta propio) |
| Versión | **2.38.2** (`src/manifest.json`) · `.ccx` = `dist/A_mano_v2.38.2.ccx`, 1 116 895 bytes |
| Panel de After Effects | «A mano AE» **0.2.0**, panel CEP en `ae/`, mismo motor (§3.6) |
| Dueño | Iker García (usuario de GitHub `IkerEker`) |
| Repositorio en GitHub | `IkerEker/a-mano`, rama `main`, último commit `9dae134` (23-11-2026: 65 commits en total). **Es PÚBLICO** (debería ser privado; no lo puedo cambiar desde aquí) |
| Ramas en GitHub | `main` (`9dae134`) y `biblioteca` (`f6f764b`, ya fusionada; quedó porque el borrado remoto falló). Etiqueta `v2.13.0`: solo en local y en el respaldo |
| Casa local (desde el 20-11-2026) | `C:\Users\ikerg\Biblioteca\plugins\a-mano\` en el PC de Iker: repo completo con `.git` |
| Estado de la casa local | Clonada y verificada el 20-11 (ramas, commits y 173 archivos iguales a GitHub). **Va por detrás**: tiene la 2.38.1 (commit `f6f764b`); le faltan 2.38.2 y el `CLAUDE.md` de la ORDEN 3. Se pone al día con doble clic en `ACTUALIZAR.bat` (en esa carpeta; **no está en git**, ver §10) |
| Respaldo | `C:\Users\ikerg\Biblioteca\plugins\_respaldos\a-mano_2026-11-20.bundle` (238 MB, historial completo, verificado en su PC). Hay que renovarlo tras cada sesión (`RESPALDO.bat`, guarda 3) |
| Entorno de la nube (sandbox) | `/home/claude/a-mano` (repo), `/home/claude/ikereker/texturas` (biblioteca, rama `atlas`) |
| Pruebas | Huella 27/27 idéntica · franjas 27/27 idénticas · Photoshop simulado 67/67 · After Effects simulado 19/19 · `bandtest` 0 distintos |
| Visto en Photoshop real | **No desde la 2.15** por Claude. Iker sí lo usa; los mensajes nuevos (cronómetro, etc.) están sin verificar en Photoshop real |

---

## 2. Iker y cómo trabajar con él (reglas que ha ido dando)

### 2.1 Forma de trabajar
- **Todo en español**: respuestas, interfaz, comentarios del código, commits, documentos.
- **Commits** con identidad `git -c user.name=IkerEker -c user.email=ikergarcia.arte@gmail.com commit …`.
  Mensaje en español y al final:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01VPHARAUhx1iCr3dazRNKtN
  ```
  (las líneas de atribución las fija cada sesión; usa las que te indique la tuya). Antes de `push`:
  `git pull -q --rebase origin main`.
- **Cada versión entregada**: subir versión en `src/manifest.json` → `git mv -k dist/A_mano_vX.ccx versiones/` →
  `python3 tools/build.py` → pruebas (§8) → actualizar `CONTEXTO_A_MANO.md` (sección de la versión), `src/LEEME.txt`
  (y `README.md` si cambia el uso) → commit + push → **entregar el `.ccx`** (y una imagen si hay cambio visual).
- **Mira siempre el resultado en imagen antes de entregar** (render con `tests/node/preview.js` o los scripts de
  `tests/node/letras/`). El simulador no es Photoshop real.
- **Sé honesto con lo flojo**: decir qué no se ha probado y qué sigue mal. Iker lo agradece y lo exige.
- Iker escribe rápido, con erratas y a veces en mayúsculas cuando algo no le gusta («HAZLO BIEN», «NADA
  REALISTA»). No es enfado contigo: quiere **realismo** y que se arregle de raíz.
- Iker quiere que **resuelvas tú solo** lo que puedas («son mogollón de cosas, intenta solucionarlas tú solo»);
  pregunta solo lo que de verdad cambia un resultado ya entregado o es irreversible.
- Cuando dice «no me hagas el ccx aún», no se empaqueta hasta que diga «dame el ccx».
- Si pide un «descargable», entrégalo como archivo (`.md` normalmente) con `SendUserFile` y guárdalo también en el
  proyecto «PHOTOSHOP» de claude.ai (`claude/<NOMBRE>.md`).

### 2.2 Criterios de calidad que ha dejado claros
- Letras **legibles pero no regulares ni sintéticas**: nada de letras locas, cortadas o claramente digitales.
- **Elegante A no se toca** (es la «correcta», de fuente).
- «**LO DEMÁS DÉJALO IGUAL**»: no tocar lo que ya está aprobado (por ejemplo, el relleno de los negativos).
- Graffiti: **realismo**. La pintura de bote es **plana**, brillante pero plana, con algo de brillo y relieve solo
  donde se acumula; nada de volumen tipo «pompa» en toda la letra. Los chorretones **nacen dentro de la pintura**
  (sin corte plano) y solo abultan en la gota del final. Sin cercos claros donde se unen pasadas.
- Grumos: recortados de fotos reales, **solo donde hay más densidad de pintura**, sutiles, no en líneas.
- En modo graffiti el panel **esconde** lo que no se usa (tinta, repasado, relleno, seguir grosor).
- Cambios **en vivo**: al soltar el ratón se aplica, sin botón «Aplicar».
- Al escribir queda **solo la imagen** (sin grupo ni capa de forma).
- Interfaz **amable, elegante, con pocos controles a la vista**; color en barra grande con paleta.

### 2.3 Órdenes permanentes de Iker (20-11-2026)
Textos completos en el repo de la biblioteca: `TEXTURAS/plugins/ORDEN_PLUGINS.md`, `ORDEN_CARPETA_LOCAL.md`,
`ORDEN_BUSCAR.md`. Resumen:
- **ORDEN 1 (biblioteca única + velocidad/GPU)**: el material sale **solo** de la biblioteca, por id; prueba exacta
  antes y después de cada cambio; banco de velocidad en su PC; GPU donde se pueda con camino CPU de respaldo; una
  versión GPU que no dé idéntico queda apagada hasta su sí. Hardware: **2 × RTX 4090 (24 GB c/u), CPU ~4,9 GHz,
  64 GB RAM, SSD NVMe, Windows**.
- **ORDEN 2 (casa local)**: el plugin vive en `Biblioteca\plugins\a-mano\` con git local; respaldo `git bundle --all`
  tras cada sesión en `Biblioteca\plugins\_respaldos\` (guardar 3); no tocar otros plugins, `TEXTURAS`, `ACIDBITE`,
  `originales` ni `_fuentes`; borrar solo con su permiso. Iker borrará el repo de GitHub cuando lo diga (el informe
  de verificación dio «LISTO: SÍ»).
- **ORDEN 3 (buscar con v3)**: buscar material solo con `buscar.py` v3, empezando por `--necesidades`; variedad
  (6–12 variantes por efecto, ≥3 familias, ACIDBITE cuenta); apuntar lo usado con `--plugin a-mano --apuntar`.
- **Nunca cambies un resultado ya entregado sin su sí**: prepara antes/después, pasa la prueba exacta y espera.

---

## 3. Qué hace el plugin (vista del usuario)

### 3.1 Dos pestañas
- **GENERAR**: escribe el texto que se le da dentro de una **forma**: Recto, Arco, Bandera, Abanico, Círculo o
  Selección (lazo). Se crea una capa de forma temporal que el usuario puede mover, girar, voltear o deformar
  **antes** de escribir; al pulsar **«Escribir en la forma»** queda **una sola capa de píxeles «✍ texto»** y la forma
  se borra (2.38). El plugin recuerda la forma en sus ajustes (`store 'img|<doc>|<capa>'`): con esa capa
  seleccionada, cualquier cambio del panel la rehace en su sitio. Girar o escalar la imagen después y reescribir la
  devuelve a como estaba (limitación conocida).
- **CALCAR**: repinta a mano, encima, capas de texto ya existentes (copia `✍ <nombre>` encima y oculta el original).
  Relleno: No, Brocha, Sello, Negativo. Resultado: Imagen (trazos reales) o Editable (solo variación). Grosor: auto,
  de la herramienta o de la letra.

### 3.2 Texto
- Casilla de texto (Intro = nueva línea). Modo **Por importancia** o **Autoencajar** (llena la forma al máximo).
- **Destacar palabras** (plegable): importancia pequeña / normal / importante / ¡LA MÁS!; marcas negrita (repasada),
  subrayada, negativo (la palabra queda en blanco y se pinta alrededor), sin marcas.
- **Párrafo** (plegable): alineación (izquierda, centro, derecha, llenar líneas), interlineado 70–150, espacio entre
  letras −50…50, margen dentro de la forma 0–25.
- **Legibilidad** 0–100.

### 3.3 Técnicas y presets (`js/ink.js → TOOLS`)
| Técnica (clave) | Presets (clave → nombre) | Motor |
|---|---|---|
| Lápiz (`lapiz`) | `hb` HB · `blando` Blando 6B · `nervioso` Nervioso | cintas `lapiz` + grano de papel |
| Carbón (`carbon`) | `suave` · `fuerte` · `fino` | cintas `carbon` + grano |
| Cera (`cera`) | `oleo` Gruesa · `cera` Blanda · `fina` Fina | cintas `cera` + grano (el preset `oleo` NO usa fotos de óleo) |
| Boli (`boli`) | `bic` BIC · `fino` · `gel` | procedural (`proc:'marker'`) |
| Rotulador (`rotulador`) | `fino` · `gordo` · `gastado` | procedural |
| Pincel (`pincel`) | `fino` (pincelfino+guache) · `gordo` (pincel) · `seco` (pincel+guache+brocha) · `humedo` (aguada) | cintas |
| Graffiti (`spray`) | `gordo` · `fino` · `seco` · `mop` · `plano` (boquilla plana) · `rastro` = **Extintor** · `empapado` · `rodillo` (tóner) | procedural + grumos |

Al elegir Graffiti el panel cambia: aparecen **Goteo**, **Nube de spray y salpicaduras** y **Textura de la pintura**
(no en Empapado ni Rodillo, que son mate) y se esconden tinta, repasado, relleno y seguir grosor.

### 3.4 Letras (`js/fonts.js → STYLES`)
- **8 manos**: Infantil, Adulta, Nerviosa, Elegante, cada una en versión **A** o **B**, en **MAYÚSCULAS, minúsculas o
  cursiva**. Claves `infantil_a`, `infantil_b`, `adulta_a`, `adulta_b`, `nerviosa_a`, `nerviosa_b`, `elegante_a`,
  `elegante_b` (alias antiguos: `rabiosa` → `nerviosa_a`).
- **7 firmas de graffiti** (sustituyen A/B y caja): Tag (`graffiti_a`, preset fino), Bisel (`graffiti_b`, plano),
  Flechas (`graffiti_g`, mop), Bomba (`graffiti_c`, gordo), De un trazo (`graffiti_d`, mop, cursiva), Rodillo
  (`graffiti_f`, rodillo), Borrón (`graffiti_e`). Varias formas por letra (`FORMS` con alternativas), salidas que se
  pasan de largo (`over`), flechas (`arrowK`), R de un solo trazo, travesaño mínimo en T/t.
- Estilo interno `bloque` (letra de bloque) y `__plantilla`.
- **Deriva del bloque** (0–100, defecto 40): cuánto se tuerce el bloque de texto como escritura real (§4.3).

### 3.5 Color
Un color (barra grande que toma el color frontal de Photoshop; hex visible) o **una letra de cada color** con
variación 0–100 y paleta de 9 muestras.

### 3.6 Avanzado (`Avanzado ›`)
Grosor (−50…50), Tinta (0–100), Pulso (temblor), Repasado (cantidad y tipo: auto, fundido, visible), Locura (cuánto
varía cada letra), Prisa (inclinación), Diferencia de tamaño entre importancias, Llenar la forma, Restablecer.

### 3.7 Valores por defecto (`js/main.js → DEF`)
`tool rotulador · preset fino · persona adulta · version a · mode mayus · textMode importancia · legib 70 · grosor 0 ·
tinta 55 · pulso 40 · repasado 50 · locura 50 · prisa 15 · tight 0 · contraste 50 · inter 100 · llenar 30 · margen 5 ·
align center · kind imagen · colorMode uno · colorVar 45 · tupido 60 · goteo 45 · nube 50 · relieve 50 · deriva 40`.
Texto de ejemplo: «Nadie había cerrado / la puerta del sótano». Ajustes en `localStorage` con prefijo `amano.`
(`settings2`, `seeds`, `shape|…`, `img|…`).

### 3.8 Comportamiento
- **En vivo** (2.33): cualquier cambio se aplica al soltar el ratón si hay destino (capa ya escrita seleccionada).
- **Mensaje final con cronómetro** (2.38.1): «Escrito en X s (pintar A s, Photoshop B s)». Sirve para saber si lo
  lento es el cálculo o el paso de píxeles a Photoshop. **Iker aún no ha dicho qué le sale.**
- Se pinta **por franjas** (`ps.putBands`): 12 Mpx por franja (8 Mpx con textura de la pintura); si no cabe en
  memoria, vuelve a 3 Mpx. El resultado es idéntico con cualquier tamaño de franja (comprobado).

### 3.9 A mano AE (After Effects) 0.2.0
Panel CEP (no UXP: UXP de AE estaba en beta). Solo GENERAR. Escribe y borra el texto **animado**: secuencia PNG con
alfa + marcadores «entrada»/«salida» + expresión de reasignación de tiempo. Tempo por golpes (~5 por segundo,
isocronía), punta redonda con grano. Construcción `python3 tools/build_ae.py` → `dist_ae/A_mano_AE_v0.2.0.zip`.
La 0.1.0 se probó en AE real (carga y pinta); la 0.2.0 sin ver allí. **No lleva grumos** (no está `grumosdata` en sus
MODS). Detalle: sección 6 de `CONTEXTO_A_MANO.md`.

---

## 4. Arquitectura del código

### 4.1 Construcción
- JavaScript **sin dependencias**; módulos CommonJS en `js/`. `python3 tools/build.py` los une en un solo
  `dist/plugin/main.js` con un mini `require` propio (lista `MODS`, en este orden: `rng, raster, geom, glyphs,
  render, grumosdata, strokes, texdata, ink, skeleton, fontdata, refglyphs, fonts, calco, hand, handmade, instances,
  shapes, autofit, layout, negativo, writer, ps, main`), copia `src/` (index.html, styles.css, manifest.json,
  LEEME.txt, LICENCIAS.txt) e `icons/`, y comprime en `dist/A_mano_v<versión>.ccx` (zip). Sin minificar.
- `main.js` empaquetado ≈ 2,2 MB; las texturas incrustadas son ≈ 70 % de él (`texdata.js` 1,44 MB + `grumosdata.js` 78 KB).
- AE: `tools/build_ae.py` (MODS sin `grumosdata`, con `png, anim, aemain`).

### 4.2 Módulos
| Módulo | Qué hace |
|---|---|
| `main.js` | Panel: estado `st`, `DEF`, `SAVED_KEYS`, `live()`/`runLive()`, `resolveGen()` (destino de escritura), `relieve()`, `syncGraf()`, pliegues `parHead/lvlHead`, paleta, cronómetro `desglose()`, `bandPx()` |
| `ps.js` | Puente con Photoshop: `putBands(doc, name, bounds, draw, progress, margin, bandPx)`, `putInto` (`imaging.createImageDataFromBuffer` + `imaging.putPixels`), `lastTimes`, formas, selección, capas, `runModal` |
| `layout.js`, `autofit.js` | Maqueta del texto en la forma (programación dinámica de cortes; autoencajar letra a letra; interlineado) |
| `shapes.js`, `geom.js` | Formas (envolventes con parche de Coons, siluetas), trazados |
| `skeleton.js` | Letras como trazos en mini lenguaje `M/L/S/F/Z` (mayúsculas, minúsculas, cursiva `CURS`, marcas) |
| `fonts.js` | `STYLES` (manos y firmas), formas de graffiti `capsTag`, `capsBisel`, `capsFlechas`, `capsBomba`, `capsRodillo`; `glyph()` |
| `refglyphs.js` | GENERADO por `tools/glyphref.py` desde `referencias/tipos/` + `tools/glyphspec.json` |
| `fontdata.js` | GENERADO por `tools/make_fonts.py` desde `fonts/svg/` (EMS y Hershey: cursivas ligadas y respaldo de signos) |
| `writer.js` | Plan de trazos: variación, repasado, `blockDrift`, `clearLines`, `snugUnder`, `bandMargin`, `paint` |
| `ink.js` | Motor de pintura: `paintStroke` (cintas), `paintSpray`, `paintSoak`, `paintBand`, `dripExit`/`drawDrips`, `paintFill`, `wetEdge`, `applyMask`, `TOOLS`, `preset()` |
| `render.js` | Lienzo de pigmento, `compositePigment`, `finalize`, `applyRelief`, `setLumps`/`lumps`/`stampLumps` |
| `texdata.js` | GENERADO: 77 cintas + grano de papel (§5.1) |
| `grumosdata.js` | GENERADO: 50 sellos de grumo (§5.3) |
| `calco.js`, `hand.js`, `strokes.js`, `glyphs.js`, `instances.js`, `handmade.js` | CALCAR |
| `negativo.js` | Palabras en negativo (caja pintada alrededor) |
| `rng.js` | Azar reproducible (`mulberry32`, `hash2`, `noise2` con memoria de celda desde 2.38.2) |
| `anim.js`, `png.js`, `aemain.js` | Solo panel de AE |

### 4.3 Escritura (`writer.js`, después de `planWords`)
`snugUnder(clearLines(blockDrift(…)))`:
- `blockDrift`: deriva de todo el bloque según la cantidad de texto (λ crece con el número de letras); pendiente,
  comba, término en S, el tamaño se apura al final de la línea, el margen deriva; cada línea copia parte de la de
  arriba. Deslizador «Deriva del bloque». No en autoencajar ni en máscaras.
- `clearLines`: si la tinta de una línea invade la siguiente, empuja hacia abajo.
- `snugUnder`: subrayados pegados al pie de la palabra.
- `bandMargin(strokes, p)`: margen de franja: 48 px con textura de la pintura; con borde húmedo (`P.wet > 0.05`:
  boli, rotulador, pincel húmedo) 0,45 × el mayor medio ancho + 4 (mínimo 16).

---

## 5. Texturas: qué usa, de dónde salen y cómo

**Lo esencial: A mano NO lee ninguna imagen al ejecutarse.** No usa `uxp.storage`, ni `localFileSystem`, ni `fetch`.
Todo va incrustado en `main.js` como **base64 de 1 byte por píxel**, generado **al construir** con Python desde la
biblioteca. El `.ccx` funciona sin la biblioteca, sin Claude y sin internet. Hay exactamente **tres assets**:

| Asset | Módulo | Origen | Lo usa | md5 de referencia |
|---|---|---|---|---|
| **Cintas de trazo** (77) | `js/texdata.js` → `strips` | 45 fotos de la biblioteca (`or:`; 47 entradas de `SOURCES` procesadas, 2 fotos citadas dos veces) | `ink.js → paintStroke` | `js/texdata.js` = `efd2021b0614bfa478f8b1e111b3aa78` |
| **Grano de papel** (1 baldosa 256×256) | `js/texdata.js` → `paper` | **sintético** (ruido filtrado, semilla 11) | `paintStroke` y el `marker()` de boli/rotulador | bytes = `7592b4f48935c0923aff8118ada37f15` |
| **Grumos de pintura** (50 sellos) | `js/grumosdata.js` | 4 fotos de la biblioteca (`or:`) | `render.js → stampLumps` desde `applyRelief` | `js/grumosdata.js` = `d3ca0cf24cb8a2ba3fa4b8a3869c2eba` |

No hay overlays, ni texturas a color, ni mapas de desplazamiento, ni vídeo, ni audio. Las texturas solo dicen
**cuánta tinta** (cintas, papel) o **cuánta luz** (grumos) hay en cada punto; el color lo pone el usuario.

### 5.1 Cintas de trazo
- **Qué son**: cada trazo recto de una foto, recortado y **enderezado**: **filas a lo largo** (fila 0 = donde empieza
  la mano), **columnas a lo ancho**. Densidad de tinta: **0 = papel, 255 = tinta plena**, sin color ni papel.
- **Script**: `tools/extract_textures.py` (CPU, numpy + Pillow + scipy). Pasos: `density()` quita papel y color
  (papel = máximo local a 1/8, ventana 65, gauss 8; suelo percentil 55 + 0,025); `components()` localiza trazos
  (umbral 0,16, cierre ×3, apertura ×2; fuera < 1500 px, los que tocan el borde y los no alargados, largo/ancho
  < 4,5; orientación por `start` top/left); `strip_of()` endereza siguiendo el centro real, remuestrea a
  `columnas = round(2·E·MH)`, máximo `MAXROWS = 520` filas (si es más largo, comprime promediando 3 y guarda `ar`),
  normaliza (percentil 99,3 del núcleo; 80 en cera y óleo), recorta colas finas y descarta cintas con tinta fuerte
  en los bordes; reparto por turnos, un archivo cada vez, hasta el tope `CAP` de la familia.
- **Parámetros por familia**: `MH` (medio ancho en columnas): boli 3, rotu 7, lápiz 10, carbón 11, cera 20, óleo 16,
  aguada 15, pincel 14, guache 14, pincelfino 12, resto 10. `CAP` (tope): **boli 0, rotu 0** (desde 2.38.1),
  gastado 0, oleo 0, lápiz 10, carbón 10, cera 12, aguada 12, guache 12, pincel 14, pincelfino 5, brocha 2.
- **Formato** de cada cinta en `texdata.js`: `{ f: familia, w: columnas, h: filas, mh, ar, d: base64 de w×h bytes }`.
  Sin nombre ni id: **una cinta es su posición en la lista (#0–#76)**.

| Familia | Cintas (#) | Columnas | Filas | La usa |
|---|---|---|---|---|
| `aguada` | 12 (#0–#11) | 46 | 184–408 | Pincel Húmedo |
| `cera` | 12 (#12–#23) | 58 | 304–520 | Cera |
| `guache` | 12 (#24–#35) | 39 | 218–287 | Pincel Fino y Seco |
| `lapiz` | 10 (#36–#45) | 30 | 233–510 | Lápiz |
| `carbon` | 10 (#46–#55) | 42 | 163–338 | Carbón |
| `pincel` | 14 (#56–#69) | 39 | 177–520 | Pincel Gordo y Seco; relleno de negativos a pincel |
| `brocha` | 2 (#70–#71) | 27 | 118–135 | Pincel Seco; relleno de negativos |
| `pincelfino` | 5 (#72–#76) | 34 | 404–520 | Pincel Fino |

- **Cómo se aplican** (`paintStroke`): `pickStrip(P.fams, rnd)` elige **al azar uniforme** entre las cintas de las
  familias del preset, con `mulberry32(semilla del trazo)`: **el orden de las cintas forma parte del resultado**.
  Escala: `cpp = mh / r` (columnas por píxel; `r` = medio ancho del trazo en px) → la textura **se escala con la
  letra**, sin mm ni ppp. La cinta sigue el trazo (cuadriláteros con coordenadas a lo largo / a lo ancho; se estrecha
  con la presión). Principio real y final real de la cinta; si el trazo es más largo, el medio se recorre en vaivén
  sin costura; `capSkip` 0,15. Trazos finos: copia desenfocada a lo ancho (`stripBlur`). Encima, por código:
  grano de papel, sequedad, carga, borde húmedo, máscara de negativo.
- **Fusión** (`compositePigment`): `multiply` (tinta transparente que se monta: lápiz, carbón, cera Blanda, pincel
  Húmedo; la capa se pone además en Multiplicar en Photoshop) u `over` (pintura que tapa: cera Gruesa y Fina, pincel
  Fino, Gordo, Seco).
- **Duplicados conscientes**: dos fotos están dos veces en la lista (CERAS `…uh9z0x…` con y sin «(1)», GUACHE
  `…t7kg8s…` con y sin «(1)»). Se citan dos veces como siempre y dan cintas repetidas (#14/#15, #19/#20, #31/#32).
  **No deduplicar**: cambiaría el resultado.

### 5.2 Grano de papel
Baldosa repetible 256×256, 1 byte/px, generada por `paper_tile()` (`extract_textures.py`): ruido filtrado en
frecuencia (banda log-normal centrada en 7,5 px, dientes 4–14 px algo alargados en horizontal, 25 % de poro fino de
2,6 px), `tanh`, semilla 11. **No sale de ninguna foto.** Se aplica pegada al documento (`(x & 255, y & 255)`,
1 téxel = 1 px, sin rotación) como **umbral** que se come la tinta en los valles (`grain` del preset: lápiz 0,4–0,5,
carbón 0,32–0,5, cera 0,2–0,42, pincel Seco 0,15, boli/rotulador 0,04–0,12). Boli y rotulador la usan además como
moteado de absorción.

### 5.3 Grumos de pintura (solo Graffiti con «Textura de la pintura» > 0, y no en Empapado ni Rodillo)
- **Qué son**: bultos sueltos (pompas, granos, gotas secas) recortados **uno a uno** de 4 fotos de superficie
  pintada; nunca la foto entera. Cada uno es un **sello de sombreado**: 128 = nada, más = luz, menos = sombra, **luz
  desde arriba**, borde a cero.
- **Script**: `tools/grumos.py` (lista `PLAN`): quita la luz general (`foto / gauss(2,5·R) − 1`), busca relieves
  concentrados y aislados (`candidates`, `patch`), deduce la luz de la foto y voltea si hace falta (en las 4 ya venía
  de arriba), descarta hoyos, costras y migas, funde el borde, iguala la fuerza (percentil 98,5) y reduce con
  Lanczos. Baraja con `RandomState(7)`.
- **Formato**: `{ cls: [[20,24],[36,18],[56,8]], d: base64 }` = 24 sellos S de 20×20, 18 M de 36×36, 8 L de 56×56.
  Al cargar se hacen 2 reducciones (3 niveles).
- **Cómo se aplican** (`applyRelief` → `stampLumps`): solo donde la pintura va cargada (acumulación `Hh` o doble capa
  `Hx`) y por zonas (ruido); rejilla con azar anclada al documento; tamaño = `s` (mediana del medio ancho × 0,42,
  entre 1,6 y 14 px) × 1 / 2 / 3,1; el grumo tiene que caber entero dentro de la pintura; sin rotación ni espejo;
  se suma a la luz: `li += cantidad·m·(v>0 ? 1,5·v : 1,2·v)`.

### 5.4 Todo lo demás es 100 % código (no buscarle textura)
Boli y rotulador (vetas, salto de la bola, punta gastada); niebla, borde, grano, halo y escupitajos del bote;
boquilla plana, Mop, Extintor; **chorretones** (`dripExit`, `drawDrips`); Empapado (`paintSoak`); Rodillo de tóner
(`paintBand`); brillo y relieve de la pintura salvo los grumos (`applyRelief`); borde húmedo (`wetEdge`); temblor,
presión, velocidad de la mano, deriva.

### 5.5 Material que NO es textura y sigue en el repo
- `referencias/tipos/` (19 muestras de letra, 11,6 MB): entrada de `tools/glyphref.py` → `js/refglyphs.js`.
  **Pedido a la biblioteca** (§13); se quedan hasta que tengan id.
- `referencias/*.png|jpg` (15 referencias visuales, 4,2 MB): no las lee ningún programa.
- `referencias/texturas/_grumos_recortados.png`: hoja de control que genera `grumos.py`.
- `fonts/svg/` (6 SVG: EMS Readability, Tech, Felix, Elfin, Allure; Hershey Script 1): entrada de `make_fonts.py`.
  Licencias en `src/LICENCIAS.txt` (SIL OFL / aviso Hershey / hersheytextjs MIT).
- `icons/` (4 PNG del panel), imágenes de prueba en la raíz (`estado_actual.png`, `prueba_*.png`, `panel_actual.png`).

---

## 6. La biblioteca común y cómo la maneja A mano

### 6.1 Qué es y dónde está
- Repo **`IkerEker/TEXTURAS`**, rama **`atlas`** (índice, buscador, fichas, productos, recetas). En la nube se clona
  sin credenciales (`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch atlas https://github.com/IkerEker/texturas`;
  ~6,8 GB de checkout). Último commit visto: `b1740d0` (20-11-2026).
- En el PC de Iker: **`C:\Users\ikerg\Biblioteca\`** = `TEXTURAS_ROOT`:
  ```
  Biblioteca/
  ├── CLAUDE.md            método de búsqueda (se carga solo al abrir la carpeta) — LEER ENTERO
  ├── TEXTURAS/            el repo (índice indice/indice.json, buscador tools/atlas/buscar.py, necesidades)
  ├── ACIDBITE/            2.925 recursos de pago (no redistribuir)
  ├── originales/          fuentes intactas de los plugins, bit a bit (A mano: originales/papelator/APOYO/TRAZOS/…,
  │                        originales/papelator/APOYO/MANCHA CON  FORMA CONCRETA/…, originales/a-mano/referencias/texturas/…)
  ├── generadas/           lo nuevo
  ├── plugins/<plugin>/    casa de cada plugin · plugins/_respaldos/ bundles
  ├── _busquedas/          hojas de miniaturas del buscador
  ├── _uso/<plugin>.json   qué usa cada plugin (lo escribe --apuntar). A mano: _uso/a-mano.json (49 ids)
  ├── _fuentes/ _revision/ AÑADIDOS/   no tocar
  └── ACTUALIZAR_TEXTURAS.bat, MONTAR_BIBLIOTECA.bat, …
  ```
- Índice: **9.031 recursos** revisados a ojo, cada uno con ficha `revision` (qué es, nota 1–5, defectos, familia,
  uso, modo, usar si / evitar si, color, orientación, estilo, medidas, `hoja`). Ids: **`or:<md5>`** original bit a bit,
  **`tx:`** procesado de TEXTURAS, **`ab:`** ACIDBITE, `gen:` generado.

### 6.2 Cómo lee A mano de la biblioteca (desde 2.38.1)
- `tools/biblioteca.py`: `ruta(id)` resuelve el id con `TEXTURAS/indice/indice.json` (campo `archivo`) sobre
  `TEXTURAS_ROOT`; **si es `or:` comprueba el md5** y para si no coincide. Sin `TEXTURAS_ROOT`, usa `~/Biblioteca`.
  `python3 tools/biblioteca.py` comprueba que están todas las fuentes (salida esperada: «biblioteca correcta: 51
  fuentes (49 archivos distintos)» con los topes actuales; con boli y rotu activos eran 60/58).
- `tools/extract_textures.py`: `SOURCES` = lista de `(id, nombre_antiguo, familia, inicio, E)` **en el orden exacto
  de siempre** (Anexo A). `nombre_antiguo` = ruta que tenía en la vieja carpeta `TRAZOS/` (solo para mensajes y
  para el reparto por archivo).
- `tools/grumos.py`: `PLAN` = `(id, nombre, [(clase, radio, cuántos, exigir bulto)])` (Anexo B).
- El material ya **no está en el repo de A mano** (se quitaron `TRAZOS/`, 165 MB, y las 4 fotos de grumos tras pasar la
  prueba exacta leyendo de la biblioteca). El historial de git los conserva.
- Tabla oficial en la biblioteca: `TEXTURAS/plugins/a-mano/uso_id.json` (92 filas: 88 cintas + 4 grumos; 84
  `fuentes_en_orden`). **Está desfasada**: sigue con 88 cintas; desde 2.38.1 A mano usa solo las #0–#76 (ver §13).
- **Productos que A mano publicó en la biblioteca** (los genera `TEXTURAS/tools/atlas/productos_amano.py <a-mano>`):
  `productos/cintas_trazo/` (88 PNG gris 8 bits + `cintas.json`, byte a byte las de la 2.38.0) y
  `productos/sellos_relieve/` (50 PNG, 128 = neutro + `sellos.json`). Otros plugins (PAPELATOR, Trazo) los usan.

### 6.3 Cómo buscar material (ORDEN 3, obligatorio)
```
python TEXTURAS/tools/atlas/buscar.py --version          # tiene que decir v3
python TEXTURAS/tools/atlas/buscar.py --necesidades      # 78 necesidades curadas a ojo, con hoja hecha
python TEXTURAS/tools/atlas/buscar.py --necesidad trazo_pincel     # opciones + «HOJA YA HECHA»
python TEXTURAS/tools/atlas/buscar.py "brocha | pincel seco | brochazo" --ver   # libre; hoja en _busquedas/
python TEXTURAS/tools/atlas/buscar.py --plugin a-mano --apuntar ID ID …        # dejar constancia
```
Método: 2–4 palabras `--ver` → ≥3 búsquedas desde lados distintos + filtro de papel (`--alfa`, `--tileable`,
`--clase`, `--papel`, `--fondo`) → **mirar la hoja con Read** → elegir con variedad (6–12 variantes por efecto, ≥3
familias, una por familia, ACIDBITE cuenta, no copiar lo que «ya lo usa» otro plugin) → `--apuntar`. Nunca elegir
abriendo carpetas, ni con `catalogo.json`, ni leyendo el índice a mano y cogiendo los primeros.
**Para A mano**, que necesita **trazos rectos sobre fondo claro** (o recortes) para enderezar: necesidades
`trazo_lapiz`, `trazo_carbon_cera`, `trazo_pincel`, `trazo_acuarela_aguada`, `trazo_rotulador`, `trazo_boligrafo`,
`trazo_cinta_estirable` (son sus propias cintas); para grumos, `relieve_textura_material`.

### 6.4 Búsquedas ya hechas (20-11-2026) y lo que se vio
- `brocha | pincel seco | brochazo` (hoja `_busquedas/brocha_pincel_seco_brochazo_810521.jpg`, mirada), necesidad
  `trazo_pincel` (mirada): candidatos para ampliar el pincel: pinceladas reales de ACIDBITE (`ab_pincelada`, p. ej.
  `ab:c5ba2bdb37d5`, `ab:f39174cb8b10`), pintura blanca de collage (`co_pintura_blanca`), brochazos con estrías.
- `trazo oleo | pincelada gouache | aguada`, `trazo lapiz | grafito | lapicero` (grafito real de collage
  `co_grafito`), `tiza | pastel | carboncillo` (no hay tiza ni pastel reales), `rotulador | marker | tinta trazo`
  (ACIDBITE `ab_marcador`), `grumos pintura | pegote | empaste` (relieves `sup916_pintura_gris`, `sup916_aguada`,
  sin usar por nadie): hojas generadas, **no miradas**.
- Ninguna propuesta aplicada: todas cambian el resultado → esperan el sí de Iker (§11).
- Ningún `tx:` con recorte mejorado conviene hoy: los 38 trazos mejorados son las mismas fotos con el cerco claro
  quitado, y el extractor ya separa la tinta del papel.

---

## 7. Tipos de archivo

| Tipo | Dónde | Qué es |
|---|---|---|
| `.js` (CommonJS) | `js/` | código del motor y del panel |
| `.js` generado (base64) | `js/texdata.js`, `js/grumosdata.js`, `js/refglyphs.js`, `js/fontdata.js` | datos incrustados; no se editan a mano |
| `.html`, `.css`, `manifest.json`, `.txt` | `src/` | panel UXP, manifiesto v5, LEEME, licencias |
| `.ccx` (zip) | `dist/A_mano_vX.Y.Z.ccx`, anteriores en `versiones/` | el plugin instalable (doble clic → Creative Cloud) |
| `.zip`, carpeta CEP, `.jsx` (ExtendScript) | `ae/`, `dist_ae/` | panel de After Effects |
| `.py` | `tools/` | herramientas de construcción (Python 3: numpy, scipy, Pillow; scikit-image solo `glyphref.py`) |
| `.json` | `tools/glyphspec.json`, `tests/node/huella_ref.json`, `TEXTURAS_A_MANO.json` | ficha de letras, huella de referencia, anexo de texturas |
| `.svg` | `fonts/svg/` | fuentes de trazo único (entrada) |
| `.png`, `.jpg` | `referencias/`, `icons/`, raíz | muestras de letra, referencias visuales, iconos, pruebas |
| `.bat` | raíz | `banco.bat`, `PRUEBAS.bat`, `RESPALDO.bat`, `MUDANZA.bat` (en git); `ACTUALIZAR.bat` (solo en la casa local) |
| `.md` | raíz | `CLAUDE.md`, `CONTEXTO_A_MANO.md`, `TRASPASO.md`, `TEXTURAS_A_MANO.md`, `REPETIDOS.md`, `README.md` |
| `.bundle` | `Biblioteca\plugins\_respaldos\` | respaldo git del historial completo |
| Fotos fuente (JPG/PNG) | **biblioteca**, por id `or:` | trazos y superficies pintadas; nunca dentro del plugin |
| PNG gris 8 bits | `TEXTURAS/productos/cintas_trazo`, `sellos_relieve` | productos que A mano publicó |

Convenciones que A mano comparte: **gris 8 bits**, densidad 0 = papel / 255 = tinta; relieve **128 = neutro**, luz
desde arriba.

---

## 8. Pruebas (prueba exacta antes y después de TODO cambio)

| Orden | Esperado | Qué cubre |
|---|---|---|
| `python3 tools/extract_textures.py && md5sum js/texdata.js` | `efd2021b0614bfa478f8b1e111b3aa78` (hasta 2.38.0, con 88 cintas: `182e0cdb…`) | cintas + papel (tarda ~2 min) |
| `python3 tools/grumos.py && md5sum js/grumosdata.js` | `d3ca0cf24cb8a2ba3fa4b8a3869c2eba` | grumos |
| `git status --short js/` | vacío | nada cambió |
| `node tests/node/huella.js` | `HUELLA IDÉNTICA (27 renders)` | un render 1000×460 por preset, md5 contra `tests/node/huella_ref.json` (`--guardar` solo con el sí de Iker) |
| `node tests/node/franjas.js` | `FRANJAS IDÉNTICAS (27 presets…)` | pintar por franjas = de una vez |
| `node tests/sim/harness.js` | `67 / 67 bien` | panel real en Chromium + Photoshop simulado (necesita **Playwright**; `node tests/sim/buildsim.js` crea `sim.js`) |
| `node tests/ae/harness.js` | `19 / 19 bien` | panel de AE con After simulado (Playwright) |
| `node tests/node/letras/bandtest.js gordo c` | `0` valores distintos | franjas con relieve y grumos |
| `python3 tools/biblioteca.py` | «biblioteca correcta…» | todas las fuentes en la biblioteca con su md5 |

- **Versiones con las que la regeneración sale exacta**: numpy 2.5.3, Pillow 12.3.0, scipy 1.18.1, Node 22+.
- **En el PC de Iker** (`PRUEBAS.bat`, 20-11): Node 26.13.1 ✓, huella ✓, franjas ✓, md5 de `texdata.js` ✓, construcción ✓.
  **Faltan allí**: Playwright (sin él no corren sim ni AE) y numpy/scipy/Pillow (sin ellos no se regeneran las
  texturas). `PRUEBAS.bat` tiene un fallo de paréntesis: escribe «FALTA node» aunque esté y se salta la sección de
  grumos (por arreglar).
- Vistas previas: `node tests/node/preview.js DIR` (todos los presets); scripts en `tests/node/letras/`
  (`poster.js`, `drift.js`, `stylesheet.js`, `nsheet.js`, `graf*.js`, `one.js`).

---

## 9. Velocidad

- **Banco**: `banco.bat` / `node tests/banco/banco.js [--grande] [--rapido] [--solo a,b] [--rep N] [--sale f.json]`
  → `tests/banco/resultado.json` (tiempo por preset y fase: maquetar, planear, pintar, acabar; memoria pico; md5 de
  píxeles; carga del motor y texturas). `--grande` añade 4 casos a 5000×3000 pintados por franjas como Photoshop.
  **No se ha ejecutado aún en el PC de Iker** (las medidas que hay son de la sandbox y solo orientan).
- **Hecho sin cambiar un píxel**:
  - 2.38.1: graffiti con textura en franjas de 8 Mpx (antes 3): 5000×3000 de 10,1 s → 6,5 s; margen de franja en
    tintas de borde húmedo (esto sí corrigió una costura de hasta 10 niveles en textos > 6 Mpx); 11 cintas muertas
    fuera (−70 KB en el `.ccx`).
  - 2.38.2: `noise2` con memoria de la última celda; `paintSpray` solo recorre las columnas con pintura y, si no
    chorrea, solo las filas de la franja; franjas de 12 Mpx sin textura. Total de los 27 presets a 2000×1200:
    15,3 s → 14,0 s (−9 %; Graffiti Fino/Extintor/Rodillo −20 %).
- **Dónde se va el tiempo** (perfil): `paintSpray` 25 %, `noise2` 16 %, `tri` (cintas) 10 %, `paintBand` 9 %,
  `marker` 6 %, `compositePigment` 5 %, recolector 5 %, `applyRelief` 4 %.
- **Lo que queda necesita el sí de Iker** porque cambia píxeles: calcular el ondulado del borde del graffiti solo
  cerca del borde (estimado −30–40 % en graffiti, sin medir); GPU (no se ha comprobado qué deja UXP de Photoshop;
  habría que probarlo en su PC; siempre con camino CPU de respaldo).
- **Falta saber** qué parte es Photoshop: el mensaje final con cronómetro lo dice; Iker aún no lo ha pasado.

---

## 10. GitHub, casa local y archivos `.bat`

- **Sin terminal en el PC de Iker**: Claude solo puede listar, leer (staging) y escribir archivos en
  `C:\Users\ikerg\Biblioteca` (herramientas `device_list_dir`, `device_stage_files`, `device_commit_files`).
  No puede ejecutar git ni Python allí: deja un `.bat` y Iker lo lanza con doble clic; cada uno escribe su informe
  `.txt` al lado.
- Flujo actual mientras exista GitHub: Claude trabaja en la sandbox → commit → push a `IkerEker/a-mano` (`main`) →
  Iker ejecuta `ACTUALIZAR.bat` en la casa local (`git pull --ff-only origin main` + `RESPALDO.bat`).
  **Si Iker borra el repo de GitHub**, este flujo deja de valer: habría que pasar cambios como `.bundle` o parches
  escritos en la carpeta y un `.bat` que los aplique y haga commit. Iker está avisado.
- `.bat` existentes:
  | Archivo | En git | Qué hace |
  |---|---|---|
  | `MUDANZA.bat` | sí | clona/actualiza la casa local desde GitHub, crea ramas, compara con GitHub, verifica el respaldo → `MUDANZA_informe.txt` |
  | `RESPALDO.bat` | sí | `git bundle create ..\_respaldos\a-mano_<fecha>.bundle --all` + verify; guarda 3 |
  | `PRUEBAS.bat` | sí | prueba exacta y pruebas desde la casa local → `PRUEBAS_informe.txt` (fallo de paréntesis, §8) |
  | `banco.bat` | sí | banco de velocidad |
  | `ACTUALIZAR.bat` | **no** (solo en la casa local) | `git pull --ff-only origin main` + `RESPALDO.bat` |
- `.gitignore`: `dist/plugin/`, `tests/sim/sim.js`, `tests/sim/out/`, `tests/ae/out/`, `node_modules/`,
  `__pycache__/`, `dist_ae/A_mano_AE_v*/`, `MUDANZA_informe.txt`, `PRUEBAS_informe.txt`, `tests/banco/resultado.json`.
- `REPETIDOS.md`: 0 repetidos frente a la biblioteca (md5 de cada imagen, vídeo y fuente del repo comprobado).
- Lo que GitHub no deja desde la sandbox: cambiar la visibilidad del repo (403) y, a veces, push de etiquetas y
  borrado de ramas remotas.

---

## 11. Decisiones abiertas de Iker (no hacer sin su sí)

1. **Más variedad en las cintas** (ORDEN 3): activar las 3 fotos de óleo (tope 0), añadir pinceladas reales de
   ACIDBITE y de collage al pincel, grafito real al lápiz. Cambia qué cinta le toca a cada trazo → cambia todo lo
   escrito con esas técnicas. Hay que comprobar antes que el extractor saca cintas útiles (solo acepta trazos rectos).
2. **Más grumos** con los relieves de pintura empastada de la biblioteca → cambia el graffiti con textura.
3. **Familia de rotulador real** (ACIDBITE) como opción nueva.
4. **Grano de papel real** (`productos/papel_gris`, 128 = plano, px/mm conocido) en vez del sintético → cambia
   lápiz, carbón, cera, boli y rotulador.
5. **Chorretones reales** (`productos/piezas_neonizador/goteos`) en vez de los de código.
6. **Velocidad con diferencias invisibles** (borde de graffiti) y **GPU**.
7. **Borrar el repo de GitHub** (verificado «LISTO: SÍ») y **ponerlo privado** mientras exista.
8. **Fusionar la rama `atlas` de TEXTURAS en `main`** (decisión suya en la biblioteca).

---

## 12. Necesidades de A mano respecto a la biblioteca

**Lo que necesita para construir (imprescindible):** las 49 fotos de §6.2 / Anexo A y B (45 de cintas + 4 de grumos), **intactas** (mismo md5,
sin recomprimir ni redimensionar), con su id `or:` estable, y que el índice resuelva `archivo` sobre `TEXTURAS_ROOT`.

**Lo que le vendría bien (material):**
- Trazos **rectos, sueltos, sobre fondo claro** (o recortes RGBA), ≥ 1500 px por el lado largo, de varias manos:
  - **tiza y pastel** (no hay nada);
  - **brocha larga, ancha y seca** (solo 2 cintas, cortas: 118 y 135 filas);
  - **rotulador y boli largos y limpios**, por si vuelven a ser con textura;
  - **óleo** (hay 3 fotos sin usar).
- **Grumos grandes**: fotos de pintura con goterones y pegotes gordos, luz rasante desde arriba, gris, ≥ 2000 px
  (de 14 grumos L pedidos solo salieron 8).
- **Material real de bote**: borde y halo de spray sobre pared, calvas de rodillo de tóner, trama de tela empapada
  (para contrastar o sustituir lo procedural).
- **Trazos curvos** (si algún día el extractor los acepta; hoy los garabatos no sirven).
- Un **grano de papel real** repetible con escala (ya existe: `productos/papel_gris`; pendiente del sí de Iker).

**Lo que prefiere seguir haciendo él**: enderezar cintas (normalización, tope por familia, recorte de colas), sellos
de grumo, empaquetado base64. Lo procesado alimenta al plugin **en CPU y determinista**.

---

## 13. Pedidos a la biblioteca (pendientes)

PEDIDO PARA LA BIBLIOTECA:
- **Muestras de letra**: añadir a `originales/` las 19 imágenes de `a-mano/referencias/tipos/` (PNG/JPG tal cual,
  11,6 MB). Las lee `tools/glyphref.py` para generar `js/refglyphs.js`. Opcional: las 15 referencias visuales de
  `a-mano/referencias/` (4,2 MB).
- **Tiza y pastel**: 6–12 trazos rectos sueltos sobre fondo claro, ≥ 1500 px, al menos 3 manos; se usan como densidad.
- **Brocha larga**: trazos rectos de brocha ancha y seca, > 1500 px de largo.
- **Grumos grandes**: fotos de pintura con goterones y pegotes gordos, luz rasante desde arriba, gris, ≥ 2000 px.
- **Actualizar `plugins/a-mano/uso_id.json`** y la ficha `plugins/a-mano.md`: desde 2.38.1 A mano usa 77 cintas
  (#0–#76); las #77–#87 (`rotu` y `boli`) y sus 7 fotos ya no las usa. `productos/cintas_trazo` puede seguir con las 88
  (otros plugins las usan).

---

## 14. Primeros pasos en una conversación nueva

```bash
# 1. el plugin (público hoy; si ya no existe en GitHub, pedir a Iker el último .bundle de _respaldos)
git clone https://github.com/IkerEker/a-mano /home/claude/a-mano
# 2. la biblioteca (rama atlas, sin LFS)
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch atlas https://github.com/IkerEker/texturas /home/claude/ikereker/texturas
python3 /home/claude/ikereker/texturas/tools/atlas/buscar.py --version      # v3
# 3. TEXTURAS_ROOT en la sandbox: carpeta con TEXTURAS/ (el clon) y originales/ (traído del PC de Iker)
#    Los originales NO están en git: se traen con device_stage_files desde C:\Users\ikerg\Biblioteca\originales\…
#    (rutas exactas: campo «archivo» del índice para cada id de SOURCES/PLAN) y se enlazan:
S=<carpeta de trabajo, p. ej. el scratchpad de la sesión>
mkdir -p $S/Biblioteca && ln -sfn /home/claude/ikereker/texturas $S/Biblioteca/TEXTURAS
ln -sfn /mnt/user-data/uploads/Biblioteca/originales $S/Biblioteca/originales   # o donde se hayan traído
export TEXTURAS_ROOT=$S/Biblioteca && python3 tools/biblioteca.py
# 4. pruebas (§8): huella, franjas, sim, ae, y la prueba exacta de texturas si se toca algo de texturas
```
- Si el cambio no toca texturas, **no hace falta traer los originales**: `js/texdata.js` y `js/grumosdata.js` están
  en git y bastan para construir y probar.
- Conectar la carpeta: la sesión tiene que estar enlazada al PC de Iker y con `C:\Users\ikerg\Biblioteca`
  conectada (ya lo estuvo el 20-11). No pedir otras carpetas.

---

## 15. Historial de versiones (resumen; detalle en `CONTEXTO_A_MANO.md`)

| Versión | Qué |
|---|---|
| 1.0 | Pestaña de Cartelator |
| 2.0–2.1 (4-11) | Plugin propio; esqueletos de letras; motor de tinta con cintas reales; formas con Coons |
| 2.2–2.14 | Pigmento por presión, autoencajar, negrita/subrayado, negativos, calco guiado, repasado; 2.13 etiquetada |
| 2.15–2.24 | Las 8 manos rehechas desde escritura real; cursiva con enlaces de un gesto; cada mano construye sus letras |
| 2.25–2.29 | Graffiti: técnica propia, puntas, firmas, Borrón y Rodillo |
| 2.30 | Graffiti rehecho: aerosol con rejilla de pintura, chorretones que nacen del trazo, brillo plano, firmas de mano (Tag, Bisel, Flechas, Bomba…) |
| 2.31 | Deriva del bloque según la cantidad de texto (prueba, graffiti) |
| 2.32 | Una sola película de pintura, Seco y Empapado rehechos, chorretones mejores, **grumos de fotos** |
| 2.33 | En vivo al soltar; párrafo plegable; R sin palito |
| 2.34 | Subrayados pegados, T reconocible, interlineado en autoencajar, pincel sin cercos |
| 2.35 | Deriva del bloque para toda la escritura (deslizador) |
| 2.36 | Las líneas no se montan; relieve más sutil |
| 2.37 | Rodillo: letra alta y furiosa, tóner irregular |
| 2.38 (14-11) | Solo la imagen en el documento; piel nueva del panel; color en barra con paleta |
| 2.38.1 (20-11) | Biblioteca común por id; 11 cintas muertas fuera; franjas mayores; costura de tintas corregida; cronómetro |
| 2.38.2 (20-11) | Más rápido sin cambiar un píxel |
| AE 0.1.0 / 0.2.0 | Panel de After Effects animado; tempo por golpes y punta redonda |

---

## 16. Pendiente y flojo (dicho a Iker)

- **CALCO**: Iker pidió rehacerlo «más inteligente, que se adapte al texto que calca». **No empezado** (se le pidió un
  ejemplo que falle). Es lo siguiente grande.
- Sin ver en Photoshop real: cronómetro, franjas grandes (memoria), en vivo al soltar en UXP.
- B y P de las firmas de graffiti con muñones a la izquierda; firmas más comedidas que las hojas de referencia; sin
  extras de tag ni números.
- Grumos pequeños; Rodillo con palabras sin repasar algo claras; Plano perdió algo de contraste fino/grueso; el
  subrayado en cursiva puede rozar.
- Tras «solo la imagen», la forma no se puede deformar después de escribir; si se gira o escala la imagen y se
  reescribe, vuelve a su sitio original.
- Letras: Nerviosa A en cursiva difícil de leer; Infantil B cursiva «e» final parece «c»; Adulta A «g» parece «q»;
  mayúsculas de Adulta A y B parecidas; reparto fijo de líneas no se aplica en Círculo, Selección ni Autoencajar.
- AE 0.2.0 sin ver en After real.
- `PRUEBAS.bat` con fallo de paréntesis; `ACTUALIZAR.bat` fuera de git; la casa local va por la 2.38.1.

---

## Anexo A · `SOURCES` (orden exacto; el orden forma parte del resultado)

Columnas: posición, id, nombre antiguo (dentro de la vieja `TRAZOS/`), familia, inicio del trazo, E, cintas que da
(en `texdata.js` 2.38.2), estado.

| # | id | nombre | familia | inicio | E | cintas | estado |
|---|---|---|---|---|---|---|---|
| 0 | `or:20ddea7c0fb3b440354ee377a7c7e34c` | `AGUADAS/Gemini_Generated_Image_6lti5j6lti5j6lti.jpg` | aguada | top | 1.55 | #0, #7 | usada |
| 1 | `or:ac6b1c0c21c3685ebafd50b783f0b0b3` | `AGUADAS/Gemini_Generated_Image_6p6u0m6p6u0m6p6u.jpg` | aguada | top | 1.55 | #1, #8 | usada |
| 2 | `or:2ebff079250c732bac3996e9cd79b633` | `AGUADAS/Gemini_Generated_Image_bygjtubygjtubygj.jpg` | aguada | top | 1.55 | #2, #9 | usada |
| 3 | `or:ff9fd5a027b2672038d83ebb42259fd1` | `AGUADAS/Gemini_Generated_Image_hbkpvbhbkpvbhbkp.jpg` | aguada | top | 1.55 | #3, #10 | usada |
| 4 | `or:4a0a9e9765717d23a03bf7bee0b529c6` | `AGUADAS/Gemini_Generated_Image_nft1n4nft1n4nft1.jpg` | aguada | top | 1.55 | #4, #11 | usada |
| 5 | `or:0c7d294c3416f7b24c426a5b7573a2e7` | `AGUADAS/Gemini_Generated_Image_umv2e3umv2e3umv2.jpg` | aguada | top | 1.55 | #5 | usada |
| 6 | `or:4d7017da88104ffd2d20291e4fb0148f` | `AGUADAS/Gemini_Generated_Image_z82hx1z82hx1z82h.jpg` | aguada | top | 1.55 | #6 | usada |
| 7 | `or:b39356083123b118262bc35200d62d4d` | `CERAS/Gemini_Generated_Image_2an7ri2an7ri2an7.jpg` | cera | top | 1.45 | #12, #17, #22 | usada |
| 8 | `or:53d0437a073d998a7895372b37008a97` | `CERAS/Gemini_Generated_Image_56fr4h56fr4h56fr.jpg` | cera | top | 1.45 | #13, #18, #23 | usada |
| 9 | `or:f8bd0d98d712eee34c871a556b86192d` | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z (1).jpg` | cera | top | 1.45 | #14, #19 | usada |
| 10 | `or:f8bd0d98d712eee34c871a556b86192d` | `CERAS/Gemini_Generated_Image_uh9z0xuh9z0xuh9z.jpg` | cera | top | 1.45 | #15, #20 | usada |
| 11 | `or:e144d33708b20cfa07cdb172e936acce` | `CERAS/Gemini_Generated_Image_y7qljdy7qljdy7ql.jpg` | cera | top | 1.45 | #16, #21 | usada |
| 12 | `or:44adc9c64138f6cd1a55bed4cb5abd05` | `GUACHE/Gemini_Generated_Image_6l56yc6l56yc6l56.jpg` | guache | top | 1.4 | #24, #33 | usada |
| 13 | `or:187140f5d0f9d9f90dbe3d6d4f41b521` | `GUACHE/Gemini_Generated_Image_8ypgc28ypgc28ypg.jpg` | guache | top | 1.4 | #25, #34 | usada |
| 14 | `or:a5baef658ef09e772c1402b130c62c8a` | `GUACHE/Gemini_Generated_Image_gz01rcgz01rcgz01.jpg` | guache | top | 1.4 | #26, #35 | usada |
| 15 | `or:0f00cb3e6dbeb43243962b2aad7ebc1f` | `GUACHE/Gemini_Generated_Image_jfrkuyjfrkuyjfrk.jpg` | guache | top | 1.4 | #27 | usada |
| 16 | `or:a8622af802d9a3c83c25bd60e891586d` | `GUACHE/Gemini_Generated_Image_ksbdqzksbdqzksbd.jpg` | guache | top | 1.4 | #28 | usada |
| 17 | `or:fb33f7dda84a14d3434758806b5b5cfa` | `GUACHE/Gemini_Generated_Image_omhgriomhgriomhg.jpg` | guache | top | 1.4 | #29 | usada |
| 18 | `or:430ed44e661c68c0a1d7a4c760c61c12` | `GUACHE/Gemini_Generated_Image_scmr90scmr90scmr.jpg` | guache | top | 1.4 | #30 | usada |
| 19 | `or:0877b4440f565bc67c81c2c19fa64d44` | `GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg (1).jpg` | guache | top | 1.4 | #31 | usada |
| 20 | `or:0877b4440f565bc67c81c2c19fa64d44` | `GUACHE/Gemini_Generated_Image_t7kg8st7kg8st7kg.jpg` | guache | top | 1.4 | #32 | usada |
| 21 | `or:26c06c0b920161b7a6f75ac8bc51aec7` | `OLEO/Gemini_Generated_Image_9d31iy9d31iy9d31.jpg` | oleo | top | 1.4 | — | tope 0 |
| 22 | `or:fa7773c2e2908f4fe146ab0dffa43844` | `OLEO/Gemini_Generated_Image_br79m9br79m9br79.jpg` | oleo | top | 1.4 | — | tope 0 |
| 23 | `or:f0e4f581040ef0f237b0d8879d7c2e53` | `OLEO/Gemini_Generated_Image_gscen4gscen4gsce.jpg` | oleo | top | 1.4 | — | tope 0 |
| 24 | `or:80dad666f8311d6edb1754c362d75a5d` | `LAPIZ/Gemini_Generated_Image_dgy3xxdgy3xxdgy3.jpg` | lapiz | top | 1.5 | #36, #40, #44 | usada |
| 25 | `or:d3a26863bf136a2b427559a680ae92bc` | `LAPIZ/Gemini_Generated_Image_fd6so0fd6so0fd6s.jpg` | lapiz | top | 1.5 | #37, #41 | usada |
| 26 | `or:8b1330c2a986ae301ae99c56608fc9fe` | `LAPIZ/Gemini_Generated_Image_so6zmwso6zmwso6z.jpg` | lapiz | top | 1.5 | #38, #42, #45 | usada |
| 27 | `or:d3641f94f2fd796c41a4756940e836fb` | `LAPIZ/Gemini_Generated_Image_u2c2txu2c2txu2c2.jpg` | lapiz | top | 1.5 | #39, #43 | usada |
| 28 | `or:46afa9de8ecce9fc9ba79d3e9e6721b3` | `LAPIZ/Gemini_Generated_Image_4vfeh34vfeh34vfe.jpg` | carbon | top | 1.9 | #46, #50, #54 | usada |
| 29 | `or:16105ce5cc4b1d2b200909510e32b70f` | `LAPIZ/Gemini_Generated_Image_i1m1v9i1m1v9i1m1.jpg` | carbon | top | 1.9 | #47, #51, #55 | usada |
| 30 | `or:8b1caba32d3287fa9a08c5de574690c6` | `LAPIZ/Gemini_Generated_Image_uvge2nuvge2nuvge.jpg` | carbon | top | 1.9 | #48, #52 | usada |
| 31 | `or:4473e9c1d6f00ab84b4073cceaf19f51` | `Gemini_Generated_Image_4k0x3g4k0x3g4k0x.jpg` | carbon | left | 1.9 | #49, #53 | usada |
| 32 | `or:1fab4c773c1595efc5c71fa8ba5d003b` | `Gemini_Generated_Image_1m2vhi1m2vhi1m2v.jpg` | pincel | top | 1.4 | #56 | usada |
| 33 | `or:93b2c592d0844bb90bdb735019f8632f` | `Gemini_Generated_Image_dd9o77dd9o77dd9o.jpg` | pincel | top | 1.4 | #57 | usada |
| 34 | `or:8f83c88e63387f8ea7ef103928e1ed63` | `Gemini_Generated_Image_fooa8gfooa8gfooa.jpg` | pincel | top | 1.4 | — | no aporta |
| 35 | `or:f2a1c7dbb7402bd7f31a4c3631b1ce49` | `Gemini_Generated_Image_gtyi67gtyi67gtyi.jpg` | pincel | top | 1.4 | #58 | usada |
| 36 | `or:ea43656231d6b863d67eb6c169032e5b` | `Gemini_Generated_Image_i9od48i9od48i9od.jpg` | pincel | top | 1.4 | #59 | usada |
| 37 | `or:039431753bcad30873ec83cfd64ee744` | `Gemini_Generated_Image_ogccn5ogccn5ogcc.jpg` | pincel | top | 1.4 | #60 | usada |
| 38 | `or:160a8c8a106c89a1bde10f3990e915d2` | `Gemini_Generated_Image_uoqx5fuoqx5fuoqx.jpg` | pincel | top | 1.4 | #61 | usada |
| 39 | `or:7b13ec84a1c7508de63bb6cf144d9b9e` | `Gemini_Generated_Image_xw72ktxw72ktxw72.jpg` | pincel | top | 1.4 | #62 | usada |
| 40 | `or:0e36d27811e2498679e00e8a3bb3a6f9` | `Pincelada gris sobre blanco.png` | brocha | top | 1.35 | #70 | usada |
| 41 | `or:9af81d46749352e1f8119c5bc9358f0b` | `Pincelada vertical gris sobre blanco.png` | brocha | top | 1.35 | #71 | usada |
| 42 | `or:99193ea91cf681edc1b1b5946c6cabb3` | `Cuatro pinceladas rojas sobre blanco.png` | pincel | left | 1.4 | #63 | usada |
| 43 | `or:69c2c2243bb9c323d644d2ad0eab2969` | `Franjas de pintura roja sobre blanco.png` | pincel | left | 1.4 | #64 | usada |
| 44 | `or:aca488fbc8295f59772ed252ea43b671` | `Pinceladas rojas sobre blanco.png` | pincel | left | 1.4 | #65 | usada |
| 45 | `or:0636e9a1be6f0583886c3571a0ea61af` | `Pinceladas azules sobre blanco.png` | pincel | left | 1.4 | #66 | usada |
| 46 | `or:6b53b3ad9f34be43bd013cb4f2c5aba3` | `Trazos azules sobre fondo blanco.png` | pincel | left | 1.4 | #67 | usada |
| 47 | `or:9f80ec4e19ffa2713ad247331ebb036f` | `Muestras de pinceladas azules en blanco.png` | pincel | left | 1.4 | #68 | usada |
| 48 | `or:2b56822cc2af4b0551e9091d4cd41f2b` | `Ocho pinceladas azules sobre blanco.png` | pincel | left | 1.4 | #69 | usada |
| 49 | `or:24e379b7698a72229e7fc58b276b3c58` | `Trazos azules sobre fondo blanco (1).png` | pincelfino | left | 1.4 | #72, #73, #74, #75, #76 | usada |
| 50 | `or:2bcd77b876fd57f6580a35b2bc1f6585` | `Cinco trazos azules sobre blanco.png` | gastado | left | 1.45 | — | tope 0 |
| 51 | `or:783353d66f31e70cc44e7231723dd965` | `Cinco trazos rojos sobre blanco.png` | gastado | left | 1.45 | — | tope 0 |
| 52 | `or:e50cdc4bb37912262f92e93de71dbb50` | `Cuatro trazos rojos texturizados.png` | gastado | left | 1.45 | — | tope 0 |
| 53 | `or:618c499ea623d529c21ef45e511d478e` | `Tres trazos azules texturizados.png` | gastado | left | 1.45 | — | tope 0 |
| 54 | `or:818a69b66f8108734cc8d93bb0615c12` | `Cinco líneas azules dibujadas a mano.png` | rotu | left | 1.6 | — | tope 0 |
| 55 | `or:f59dfd6a89692ca182487365a11e774c` | `Líneas azules sobre fondo blanco.png` | rotu | left | 1.6 | — | tope 0 |
| 56 | `or:2ccd16b4b8ef13017948403488dc78c2` | `Cuatro trazos negros horizontales.png` | rotu | left | 1.6 | — | tope 0 |
| 57 | `or:e0bd2d6160ceb11ef79a8c8eb480e313` | `Tres líneas negras sobre fondo blanco.png` | rotu | left | 1.6 | — | tope 0 |
| 58 | `or:0561622b5e78218be9fb1c09ab07cb05` | `Cinco líneas azules sobre blanco.png` | boli | left | 2.2 | — | tope 0 |
| 59 | `or:7b041383b2b1112cff24a78775d2e49d` | `Líneas azules sobre papel blanco.png` | boli | left | 2.2 | — | tope 0 |
| 60 | `or:14b0c42ba960ff6b03c8c91c0b1db7b2` | `Líneas horizontales dibujadas a mano.png` | boli | left | 2.2 | — | tope 0 |
| 61 | `or:273a3106ba9c7dbacf9a67d4095f0739` | `Líneas rojas sobre papel blanco.png` | boli | left | 2.2 | — | tope 0 |
| 62 | `or:bc3605424110366dd797a920be1bec06` | `Cuatro líneas rojas dibujadas a manoยิงปลา.png` | boli | left | 2.2 | — | tope 0 |

## Anexo B · `PLAN` de grumos

| id | foto | qué se saca (clase, radio en px de la foto, cuántos) |
|---|---|---|
| `or:b69ffc8930e616f15913986c9876474b` | `pintura_granos_2.jpg` | S R=8 ×7; S R=12 ×6; M R=20 ×2 |
| `or:831b99f6a72ed4b20a52af4e2c100d15` | `pared_piel_4.jpg` | S R=7 ×4; S R=20 ×3 (sin exigir bulto) |
| `or:661b783872e168d3f343baaaa39ff703` | `pintura_grumos_1.jpg` | S R=11 ×4; M R=22 ×5; M R=32 ×5; L R=48 ×4; L R=68 ×4 |
| `or:93a7dba2d4bd0222f7d4055601acafe9` | `pintura_grumos_3.jpg` | M R=22 ×4; M R=32 ×4; L R=52 ×3; L R=76 ×3 |

Clases: S = sello 20×20, M = 36×36, L = 56×56. Resultado: 24 S, 18 M, 8 L.

## Anexo C · Huella de render de referencia (2.38.2, `tests/node/huella_ref.json`)

Render 1000×460, texto «Nadie había cerrado / la puerta del sótano», niveles `[0,2,1,0,0,-1,0]`, semilla 12345;
graffiti con firma Bomba (`graffiti_c`), mayúsculas, color `#3f7a2a`, relieve 0,5. md5 del PNG:

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

## Anexo D · Documentos relacionados

| Dónde | Qué |
|---|---|
| repo `CLAUDE.md` | reglas permanentes (biblioteca, velocidad, casa local, método v3, prueba exacta) |
| repo `CONTEXTO_A_MANO.md` | historial completo versión a versión con las palabras de Iker, arquitectura, AE |
| repo `TEXTURAS_A_MANO.md` + `.json` | ficha de texturas a fondo (cinta a cinta, sello a sello, fuentes no usadas) |
| repo `REPETIDOS.md`, `TRASPASO.md`, `src/LEEME.txt` | repetidos (0), traspaso antiguo, notas al usuario |
| proyecto claude.ai «PHOTOSHOP» | `claude/A_MANO_TEXTURAS.md`, `claude/A_MANO_TEXTURAS_anexo.json` y este traspaso; fichas de PAPELATOR, NEONIZADOR, CARTELATOR |
| biblioteca `TEXTURAS/` | `MAPA.md`, `DECISIONES.md`, `plugins/ORDEN_*.md`, `plugins/a-mano.md`, `plugins/a-mano/uso_id.json`, `plugins/MENSAJES.md`, `productos/README.md` |
| PC `Biblioteca\CLAUDE.md` | método de búsqueda (leer entero) |
