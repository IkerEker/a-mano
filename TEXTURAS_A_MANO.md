# A MANO — ficha para la base común de texturas

Fecha: 19-11-2026 · versión del plugin **2.38.0** · repositorio `IkerEker/a-mano`, rama `main`

Documento para la conversación que va a unificar las texturas de todos los plugins. Explica qué hace A mano,
cómo pinta, **qué texturas usa, de dónde salen, en qué formato las guarda y cómo las lee**, y qué necesitaría para
pasar a leerlas de un repositorio común.

---

## 1. Qué es A mano

- Plugin **UXP para Photoshop** (2024 o posterior) que **escribe texto a mano**. Hay además un panel CEP de After
  Effects en el mismo repositorio (`ae/`), que comparte el motor.
- Dos pestañas:
  - **Generar**: escribe desde cero el texto que pongas, dentro de una forma (recto, arco, bandera, abanico,
    círculo o una selección). Deja una sola capa de píxeles «✍ texto».
  - **Calcar**: pinta a mano, encima, el texto de capas de texto que ya existen.
- No usa fuentes para escribir: cada letra es un **esqueleto de trazos** (orden, dirección) que se varía y se pinta.
- **Técnicas**: lápiz, carbón, cera, boli, rotulador, pincel y graffiti (bote gordo, fino y seco, mop, boquilla
  plana, extintor, empapado, rodillo de tóner).
- **Letras**: 8 manos (infantil, adulta, nerviosa y elegante, cada una A y B, en mayúsculas, minúsculas y cursiva)
  y 7 firmas de graffiti (Tag, Bisel, Flechas, Bomba, De un trazo, Rodillo, Borrón).

## 2. Cómo está montado

```
js/            módulos del motor y del panel (se unen en un solo main.js)
  skeleton.js  esqueletos de las letras          fonts.js    estilos de mano y variación de cada letra
  layout.js    maqueta dentro de la forma        writer.js   plan de trazos (deriva, subrayados, líneas)
  ink.js       pintura de cada trazo             render.js   lienzo, mezcla de pigmento, textura de pintura
  hand.js / calco.js   calco de capas de texto   main.js     panel
  texdata.js     ← TEXTURAS de trazo y grano de papel (GENERADO)
  grumosdata.js  ← GRUMOS de pintura (GENERADO)
  refglyphs.js   ← letras sacadas de muestras de escritura (GENERADO; no es textura)
  fontdata.js    ← contornos de 4 fuentes de apoyo (GENERADO; no es textura)
src/           index.html, styles.css, manifest.json, LEEME.txt
tools/         build.py (empaqueta el .ccx), extract_textures.py, grumos.py, glyphref.py…
TRAZOS/        fotos fuente de las texturas de trazo (158 MB, 81 archivos)
referencias/   muestras de letra y fotos de superficie pintada (20 MB)
dist/          el .ccx de la versión actual      versiones/  los anteriores
```

- Lenguajes: **JavaScript** sin dependencias (motor y panel) y **Python 3** con numpy, Pillow, scipy y
  scikit-image (herramientas que generan los datos).
- `python3 tools/build.py` une los módulos y crea `dist/A_mano_vX.Y.Z.ccx` (~1,2 MB).
- Pruebas: `node tests/sim/harness.js` (Photoshop simulado, 67 comprobaciones) y `node tests/ae/harness.js` (19).

## 3. Cómo usa las texturas (lo importante)

**A mano no carga ninguna imagen cuando se ejecuta.** No lee archivos ni accede a ningún repositorio desde
Photoshop. Todas las texturas se **procesan antes**, con las herramientas de Python, y quedan **incrustadas en el
código** como datos en base64 (8 bits por píxel) dentro de dos módulos generados. El plugin las descodifica en
memoria la primera vez que las necesita.

Por eso el .ccx pesa 1,2 MB aunque las fotos fuente pesen 158 MB: de cada foto solo se guarda lo que se usa.

Tampoco usa texturas como imagen de fondo ni como capa superpuesta. Usa dos tipos de recorte:

### 3.1 Cintas de trazo (`js/texdata.js`, 1,5 MB)

- **Qué son**: cada trazo real de las fotos de `TRAZOS/`, recortado y **enderezado** en una cinta: las filas van a
  lo largo del trazo (de inicio a final) y las columnas a lo ancho. Se guarda solo la **densidad de tinta**
  (0 = papel, 255 = tinta plena), separada del color y del papel de la foto.
- **Cómo se sacan** (`tools/extract_textures.py`): se estima el papel de la foto y se divide por él; se localiza
  cada trazo como una mancha; se sigue su eje y se remuestrea a un ancho fijo por familia; se descartan los que
  tocan el borde o son demasiado cortos; de cada familia se conservan las cintas más distintas entre sí.
- **Formato de cada cinta**: `{ f: familia, w: ancho en px, h: largo en px (máx. 520), mh: medio ancho del trazo
  en columnas, ar: proporción, d: base64 de w×h bytes }`.
- **Cómo se usan** (`ink.js → paintStroke`): cada técnica tiene una o varias familias. Para cada trazo de una
  letra se elige una cinta al azar de su familia y se **estira a lo largo del trazo**: la coordenada a lo ancho
  del trazo lee una columna de la cinta y la coordenada a lo largo, una fila. El color lo pone el usuario; la
  cinta solo dice cuánta tinta hay en cada punto. Encima van la presión, la entrada y la salida, el temblor, etc.

| Familia | Cintas | Ancho (px) | Largo (px) | Peso | La usa |
|---|---|---|---|---|---|
| `lapiz` | 10 | 30 | 233–510 | 124 KB | Lápiz |
| `carbon` | 10 | 42 | 163–338 | 111 KB | Carbón |
| `cera` | 12 | 58 | 304–520 | 389 KB | Cera |
| `boli` | 8 | 13 | 518–520 | 70 KB | Boli |
| `rotu` | 3 | 22 | 520 | 45 KB | Rotulador (base) |
| `pincel` | 14 | 39 | 177–520 | 209 KB | Pincel gordo y seco |
| `pincelfino` | 5 | 34 | 404–520 | 107 KB | Pincel fino |
| `guache` | 12 | 39 | 218–287 | 153 KB | Pincel fino y seco |
| `brocha` | 2 | 27 | 118–135 | 9 KB | Pincel seco |
| `aguada` | 12 | 46 | 184–408 | 216 KB | Pincel húmedo |

Total: **88 cintas**, 1,4 MB en base64.

- **Grano de papel**: `texdata.js` lleva además una baldosa de 256×256 (un byte por píxel) repetible. Modula la
  tinta de lápiz, carbón y cera para que el trazo «salte» sobre el grano.

### 3.2 Grumos de pintura (`js/grumosdata.js`, 76 KB)

- **Qué son**: bultos sueltos (pompas, granos, gotas gordas ya secas) recortados uno a uno de 4 fotos de
  superficie pintada (`referencias/texturas/`). Cada uno es un **sello de sombreado**: cuánto aclara u oscurece el
  bulto bajo la luz, con el borde fundido a nada.
- **Cómo se sacan** (`tools/grumos.py`): se quita la luz general de la foto, se buscan relieves concentrados y
  aislados, se descartan hoyos y costras, se funde el borde con una ventana redonda y se iguala la fuerza.
- **Formato**: `{ cls: [[lado, cuántos], …], d: base64 }`. Hay **50 sellos** en tres tamaños: 24 de 20×20,
  18 de 36×36 y 8 de 56×56. Un byte por píxel (128 = nada, más = luz, menos = sombra; luz desde arriba).
- **Cómo se usan** (`render.js → stampLumps`): solo en graffiti, y solo donde la pintura va más densa
  (acumulaciones, cruces de pasadas, vértices). Se estampan en una rejilla con azar anclada al documento.

### 3.3 Lo que NO son texturas

Todo lo demás del graffiti es **generado por código**, sin ninguna imagen: la niebla y el grano del bote, los
chorretones, el empapado en tela, los hilos del rodillo de tóner, el brillo y el relieve de la pintura.

`refglyphs.js` (formas de letras sacadas de muestras de escritura) y `fontdata.js` (contornos de 4 fuentes de
apoyo) son datos generados, pero son **tipografía**, no textura.

## 4. Fuentes: qué hay en el repositorio

| Carpeta | Contenido | Archivos | Peso |
|---|---|---|---|
| `TRAZOS/AGUADAS` | trazos de aguada | 7 | 19 MB |
| `TRAZOS/CERAS` | trazos de cera | 5 | 16 MB |
| `TRAZOS/GUACHE` | trazos de guache | 9 | 24 MB |
| `TRAZOS/LAPIZ` | lápiz y carbón | 7 | 21 MB |
| `TRAZOS/OLEO` | óleo (no se usa ahora) | 3 | 8,6 MB |
| `TRAZOS/` (raíz) | pinceladas, líneas de boli y rotulador, garabatos | 50 | ~70 MB |
| `referencias/texturas` | 4 fotos de superficie pintada con grumos | 4 | 4,2 MB |
| `referencias/tipos` | muestras de escritura y de graffiti (referencia visual) | ~19 | ~15 MB |

- Son JPG y PNG, la mayoría generados con Gemini o subidos por Iker (nombres del tipo
  `Gemini_Generated_Image_….jpg`, `Pinceladas azules sobre blanco.png`).
- Qué archivo va a qué familia está escrito a mano en la lista `SOURCES` de `tools/extract_textures.py`
  (archivo o patrón → familia, por dónde empieza el trazo, margen lateral). Los garabatos y `OLEO` no se usan.
- Las 4 fotos de grumos y su plan de recorte están en `PLAN`, dentro de `tools/grumos.py`.

## 5. Qué necesita A mano de una base común

Como las texturas se incrustan al generar y no al ejecutar, el cambio es pequeño y **solo toca las herramientas**:

1. **Dónde están las fotos fuente.** Hoy: `TRAZOS/` y `referencias/texturas/` dentro del repositorio. Con la base
   común, `extract_textures.py` y `grumos.py` leerían de la ruta que se acuerde (por ejemplo una variable de
   entorno o un archivo de configuración con la raíz de la base).
2. **Cómo se identifican.** Hoy por nombre de archivo, en listas escritas a mano. Si la base común trae un índice
   (nombre estable, categoría, orientación del trazo), las dos listas se sustituyen por consultas a ese índice.
3. **Qué categorías necesita.** Trazos sueltos sobre fondo claro de: lápiz, carbón, cera, boli, rotulador, pincel,
   pincel fino, guache, brocha y aguada. Fotos de superficie pintada con relieve, para los grumos. Un grano de papel.
4. **El plugin no cambia.** Seguiría llevando sus dos módulos generados; solo cambia de dónde se generan.

Si la decisión fuese que los plugins carguen las texturas **al ejecutarse** desde una carpeta compartida, sería un
cambio mayor: A mano tendría que leer archivos desde UXP (hoy no lo hace) y el .ccx dejaría de ser autónomo.

### Preguntas para la conversación de la base común

- ¿Ruta y estructura de carpetas de la base? ¿Hay un índice (JSON) con nombre, categoría y metadatos?
- ¿Se guardan las fotos originales, los recortes ya procesados, o las dos cosas? A mano necesita **cintas
  enderezadas de densidad** y **sellos de sombreado**: ¿los genera cada plugin o se comparten ya hechos?
- ¿Formato común para lo procesado (PNG de 8 bits, `.bin` con índice como NEONIZADOR, base64 en JS)?
- ¿Cómo se nombran las familias? A mano usa `lapiz, carbon, cera, boli, rotu, pincel, pincelfino, guache, brocha,
  aguada`; NEONIZADOR usa nombres como `trazo_seco1-8`, `trazo_guache1-14`, `trazo_aguada1-10`, `pincel_vert`,
  `papel_fibra`. Es probable que parte del material sea el mismo y convenga un solo nombre.
- ¿Las texturas van incrustadas en cada plugin o se cargan de una carpeta compartida al ejecutarse?

## 6. Coincidencias probables con otros plugins

No he podido comparar archivos; esto sale solo de los nombres que aparecen en el traspaso de NEONIZADOR:

- **Trazos de guache y de aguada**: A mano tiene `TRAZOS/GUACHE` y `TRAZOS/AGUADAS`; NEONIZADOR tiene
  `trazo_guache1-14` y `trazo_aguada1-10`. Muy probablemente salen de las mismas fotos.
- **Pinceladas**: `Pincelada vertical gris sobre blanco.png` aquí y `pincel_vert` allí.
- **Papel**: aquí una baldosa de grano de 256×256; allí `papel_fibra`, `papel_rugoso`, `papel_periodico`.
- **Goteos**: NEONIZADOR tiene goteos de foto (`gt_*`); A mano los genera por código.
