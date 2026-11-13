# A mano · traspaso para seguir en un chat nuevo (13 nov 2026, versión 2.31.0)

Pega este archivo al empezar el chat nuevo. Todo lo demás está en el repositorio.

## Qué es
«A mano»: plugin UXP para Photoshop (2024+) que escribe texto a mano dentro de una forma (pestaña GENERAR) o pinta a
mano encima de capas de texto (CALCAR). Repositorio: **github.com/IkerEker/a-mano** (rama principal, último commit
`2.31`). En el entorno de trabajo: `/home/claude/a-mano`.

## Cómo trabajar (reglas del usuario)
- Todo en español (respuestas, interfaz, comentarios, commits).
- Cada versión: subir versión en `src/manifest.json`, `python3 tools/build.py` → `dist/A_mano_vX.Y.Z.ccx`, copiar la
  anterior a `versiones/`, pasar `node tests/sim/harness.js` (59/59), actualizar `CONTEXTO_A_MANO.md`,
  `src/LEEME.txt` y `README.md`, regenerar `estado_actual.png`, commit + push, y entregar el .ccx y la imagen.
- Commits como IkerEker <ikergarcia.arte@gmail.com>.
- «LO DEMÁS DÉJALO IGUAL»: no tocar lo que ya está aprobado (sobre todo el relleno de los negativos).
- Nada de letras locas, cortadas ni claramente digitales. Legibles, pero no iguales, regulares ni sintéticas.
- Mirar siempre el resultado en imagen antes de entregar (el simulador no dibuja el panel ni es Photoshop real).

## Dónde está cada cosa
- `CONTEXTO_A_MANO.md`: historial completo, versión a versión, con las palabras del usuario, arquitectura y
  pendientes. **Leer primero** (secciones 2.15 a 2.22 = todo lo de tipografías).
- `js/` (se une con `tools/build.py`): `fonts.js` (8 estilos, `STYLES`, letras de referencia, cursiva, `setWord`,
  `joinCursive`), `skeleton.js` (letras genéricas y cursiva `CURS`), `refglyphs.js` (generado), `writer.js`
  (variación, enlaces, plan de trazos), `ink.js` (motor de tinta), `layout.js`/`autofit.js` (encaje),
  `negativo.js` (palabras en negativo), `main.js` + `src/index.html` + `src/styles.css` (panel).
- `tools/glyphref.py` + `tools/glyphspec.json` → `js/refglyphs.js`: saca letras de las imágenes de
  `referencias/tipos/` (`annotate` numera las piezas; `build` genera; `skip` descarta las ilegibles).
- Pruebas: `tests/sim/harness.js` (Photoshop simulado), `tests/node/preview.js` (render sin Photoshop).

## Estado de las 8 letras (2.24: ver sección 2.24 de CONTEXTO, formas propias por estilo)
| Estilo | Carácter | De dónde salen las letras |
|---|---|---|
| Infantil A | de niño: grande, redonda, a trozos | abecedario de niño; «Let it be»; cursiva de colegio con bucles |
| Infantil B | a su aire: picuda, inclinada, desigual, mezcla mayúsculas | «hello» (mayús.); «The Principle is simple» (minús.); cursiva gorda, redonda y baja |
| Adulta A | suelta, de rotulador, astas altas | «MENU» (mayús.); «good things take time» + «The future is yours» (minús.); cursiva inclinada sin bucles |
| Adulta B | alta y estrecha, astas larguísimas | esqueleto genérico (Tryin' salía rota); cursiva que levanta el boli |
| Nerviosa A | picuda, fina, apretada, inclinada | «Tonya» (mayús.); cursiva muy tumbada |
| Nerviosa B | hacia atrás, desigual y saltona | «mysterious» (mayús.); cursiva angulosa hacia atrás |
| Elegante A | la «correcta», de fuente (no tocar) | EMS Elfin / Allure |
| Elegante B | de cartel, redonda y bailona | Matisse; cursiva de invitación |

Cursiva (2.21–2.22): entradas por fuera del óvalo, 5 variantes por letra con lazos/astas/colas distintos, enlaces de
un solo gesto (se recortan colita y rabito y se une con una curva), enlaces altos tras o/b/v/w/r, manos adultas sin
bucles, sin temblor en trazos ligados.

Otros cambios recientes: el reparto en líneas no cambia al cambiar de estilo o técnica (solo en Recto, Arco,
Bandera, Abanico); cajas de negativo que no pisan letras vecinas; la letra del negativo es la del estilo elegido;
botón «Escribir en la forma» fijo abajo.

## Pendiente / flojo (dicho al usuario)
1. **Sin probar en Photoshop real** desde la 2.15: sobre todo el botón fijo del panel (2.20) y el rotulador gastado.
2. Nerviosa A en cursiva cuesta de leer (muy tumbada). En Infantil B cursiva, la «e» final puede leerse «c».
3. Adulta A minúsculas: la «g» puede leerse «q». Infantil B minúsculas: la «f» casi sin travesaño; la mezcla de
   mayúsculas («NaDie», «Del») está pendiente de que el usuario diga si la quiere.
4. Mayúsculas de Adulta A y Adulta B aún se parecen.
5. El reparto fijo de líneas no se aplica en Círculo, Selección ni Autoencajar.
6. Cursiva con rotulador gordo en líneas pequeñas se emborrona.
7. Negativos: el usuario los veía «superfalsos»; se cambió letra y canto (2.18) pero el relleno no; sin veredicto.
8. Letras de cursiva sacadas directamente de las muestras (Menu, Comme, Vlaminck): no se usan (salían a trozos).
9. La etiqueta git `v2.13.0` solo existe en local (el push de etiquetas falló); el .ccx está en `versiones/`.

## A mano AE (After Effects) — 0.2.0
Panel CEP que escribe y borra el texto animado (secuencia PNG + marcadores «entrada»/«salida»). Ver la sección 6
de `CONTEXTO_A_MANO.md`. `python3 tools/build_ae.py`, `node tests/ae/harness.js` (19/19). La 0.1.0 cargó y pintó en After real; la 0.2.0 (tempo por golpes, punta redonda con textura) está sin ver allí.

## 2.32 EN CURSO (sin .ccx: el usuario pidió no empaquetar todavía)
Correcciones de graffiti tras la 2.31: una sola película de pintura (sin cercos en las uniones), repasar = cargar,
Seco y Empapado rehechos, chorretones que nacen dentro de la pintura y solo abultan en la gota, textura con algo
de brillo y relieve, y GRUMOS recortados de fotos (`tools/grumos.py` → `js/grumosdata.js`) que se estampan solo
donde la pintura va más densa. El .ccx de `dist/` sigue siendo el 2.31.0 de antes de estas correcciones. Detalle:
sección 2.32 de CONTEXTO_A_MANO.md.

## 2.31: deriva del bloque (prueba)
`writer.blockDrift`: con poco texto, recto; con mucho, cada línea falla, copia a la de arriba y la corrige (pendiente,
comba, tamaño que se apura al final, margen). Deslizador «Deriva del texto largo» en modo graffiti. Sección 2.31 de
CONTEXTO_A_MANO.md. Pendiente de la opinión del usuario.

## 2.30: Graffiti rehecho
Aerosol nuevo (la pintura se suma en una rejilla: borde con grano, nube, arranques cargados, salidas al vuelo),
chorretones que nacen dentro del trazo, Plano = bote de boquilla plana, Barra → Extintor, Mop de borde neto,
Empapado legible, Rodillo de interior claro con cantos negros. «Brillo del esmalte» (solo graffiti): pintura PLANA,
solo brilla lo acumulado (el usuario rechazó el volumen). En modo graffiti se esconden tinta, repasado, relleno y
grosor de la letra. Firmas: Tag, Bisel (antes Rabia), Flechas (nueva, `graffiti_g`), Bomba, De un trazo, Rodillo,
Borrón; las cuatro primeras con varias formas por letra y salidas que se pasan de largo (`over`). Infantil B sin
las N, A y W de muestra. Detalle: sección 2.30 de CONTEXTO_A_MANO.md.

## 2.25–2.29: Graffiti (técnica propia, 8 puntas, 6 firmas)
Técnica Spray (6 puntas, entre ellas la plana biselada; goteo y nube) y letra Graffiti con 4 firmas (Tag, Rabia, Bomba, De un trazo); al
elegirla cambia la interfaz. Detalle y pendientes en la sección 2.25 de CONTEXTO_A_MANO.md.
