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

## 2. Cómo se usa (2.18)

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

### Tras probar la 2.2 en Photoshop (capturas: rotulador azul con bordes que ondulan, letras con vértices de polígono)
- «El temblorcillo del boli queda fatal.» «Los picos en las letras están mal» (O y S hechas de tramos rectos).
- Mandó cuatro muestras suyas: dos de **letra rabiosa** (ESTA / NO LA / ADIVINAS / MURCIÉLAGO: mayúsculas altas y
  estrechas a lápiz de color, vértices en pico, puntas que se sueltan; y ESTA NO LA ADIVINAS: más loca, trazos que
  se pasan y se repiten), una palabra **repasada en negrita** (PRUEBA: dos o tres pasadas translúcidas un poco
  desplazadas, que se oscurecen al montarse) y **cursiva normal** (escritura rápida, estrecha, inclinada).
- «Añade el subrayado.» «Que dentro del autoencajar se puedan también hacer negritas y subrayados.»
- «MEJORA TODO, más REALISTA.»

### Qué se hizo en la 2.3
- Sin temblorcillo: `wobF` (temblor fino de la letra) a 0 en todos los estilos; el pulso de la mano en `writer.js`
  ahora ondula despacio (longitud de onda 0,32 em) y mucho menos; el borde del rotulador ya no ondula.
- Sin polígonos: `angular` a 0 en todos los estilos (las curvas siguen siendo curvas; la S de «tonya» es curva).
- **Picos** (`splitAtPeaks` en `writer.js`): en los vértices de más de ~112° (A, M, N, V, W, Z) el trazo se parte y
  cada lado llega afilado al pico. **Puntas sueltas** (`flick` del estilo, `taperEnds`): el final del trazo se afila.
- **Nerviosa A** = rabiosa alta y estrecha (OVR `rab`, `wide` 0,38); **Nerviosa B** = rabiosa a lo loco (OVR `wild`:
  se pasa de largo, travesaños que cruzan, E de dos golpes; `double` 0,32 con la segunda pasada que sale del mismo
  sitio y se abre).
- **Repasado visible** por defecto (fundido solo con pintura que tapa: pincel y óleo): cada pasada repite el gesto
  entero, algo desplazada (0,2–0,6 del grosor) y girada, y se pasa o se queda corta en los extremos.
- **Negrita y subrayado** (`st.marks`, una cadena por palabra: 'b', 'u'): negrita = +2 pasadas visibles y ×1,15 de
  grosor (y más aire entre letras); subrayado = raya a mano bajo la palabra (sigue la inclinación de las bases, pasa
  por debajo de todas las letras, se pasa al final; con mucha prisa a veces dos rayas). En la maqueta normal reserva
  sitio debajo (desc + 0,2); en autoencajar cada letra de la palabra lleva ese hueco en su celda. El panel tiene una
  segunda fila (negrita / subrayada / sin marcas) que también se ve en autoencajar.
- **Boli procedural** (`proc: 'marker'` con `streak` bajo y `skip`: la bola salta a ratos).
- **Cursiva más rápida**: `scriptW` (más estrecha), `scriptSmooth` (redondea los rizos pequeños), más inclinación;
  la raya de la t ya no se toma como salida al ligar; tolerancia de ligado mayor; en cursiva la línea no separa letras.

### Tras probar la 2.3 (nuevas referencias: cartel Good Room a lápiz, cartel WRONG a pincel rojo)
- «Dale más realismo, en general.» «La cursiva más natural, mejor hecha, curratelo mucho más.»
- «La técnica BOLI no parece boli para nada.» «La técnica ÓLEO cámbiale el nombre a CERA.» «Al rotulador le sigue
  faltando textura.»
- «A una letra de cada 20 haz que uno solo de sus trazos esté remarcado (el palito de la P), como si al escribirlo
  hubieses fallado y escrito encima.» «Busca pequeñas imperfecciones (muy pocas, muy sutiles, no te pases).»
- **NEGATIVOS**: «pintar la caja de fuera y dejar el espacio de dentro libre; calcular los trazos para hacer la letra
  alrededor; en dos modos, pincel y lápiz».

### Qué se hizo en la 2.4
- **Boli** (`pen: true` en el modelo procedural): línea fina y constante (0,0068 em), canto nítido, dos carriles algo
  más cargados (el surco de la bola), más oscuro donde aprieta, saltos de la bola, grumo al empezar a veces.
- **Rotulador**: fibras a tres escalas (franjas de la punta, fibras finas, fibra seca más clara), moteado del papel
  más fuerte, se va descargando a lo largo; no se afila nunca: en las esquinas cerradas se para y la tinta se carga
  en el punto (dos trazos que se montan, como un rotulador de verdad).
- **Cera** (antes «Óleo en barra»): packs Gruesa, Blanda, Fina.
- **Imperfecciones** (`writer.js`): 1 de cada ~20 letras con un trazo repasado encima (el palo casi siempre);
  1 de cada ~35 con un trazo largo hecho en dos golpes (levanta y sigue un poco montado); grumo al empezar en
  1 de cada ~25 trazos de boli o rotulador.
- **Cursiva propia** (`SK.CURS` en `skeleton.js`, estilos con `script: 'own'`: adulta A/B y nerviosa A/B): minúsculas
  dibujadas trazo a trazo, entran por la base a la izquierda y salen a la derecha (se ligan sin saltos), bucles
  de ascendentes y descendentes, palos que suben y bajan casi por el mismo sitio, r de dos picos. Las mayúsculas en
  cursiva son las de molde. Infantil sigue con Hershey Script (de colegio) y elegante con EMS Allure.
- **NEGATIVOS** (`js/negativo.js`, herramienta `negativo` con modos lápiz y pincel, en GENERAR y CALCAR):
  máscara de las letras (GENERAR: trazos gordos de la letra, ~0,085 em, menos en letras estrechas; CALCAR: el
  contorno de la fuente con la variación de la mano, engordado un poco) → campo de distancia hacia fuera →
  contornos desplazados por marching squares (el trazo que dibuja cada letra por fuera, con su canto tocando la
  letra; los huecos de O/A/B se rellenan) → máscara del relleno. Una caja por línea (en GENERAR sigue la forma:
  en un arco se curva; en CALCAR, rectángulo orientado de la línea). Lápiz: garabato denso en diagonal (dos capas),
  caja perfilada, contornos a lápiz blando en trozos con alguna segunda pasada. Pincel: pinceladas anchas a lo
  largo que se salen un poco de la caja + capa cruzada; el canto de la letra lo hace la misma pintura (sin raya).
  `ink.paintStroke` acepta `opts.mask` (rejilla 0..1) para no pintar dentro de las letras.

### Tras probar la 2.4
- «Los negativos son terribles. HAZLOS MEJOR.» «No tienen que ser una técnica: tienen que estar donde la negrita,
  pequeña… Tengo que poder usarlos para resaltar.» «Su textura interna es terriblemente mala, hazla 100000 veces
  más realista.» «Su trazado vuelve la letra ilegible.» «Cada técnica (carbón, ceras, pincel, boli) tiene que poder
  hacer bien el trazado, con formas distintas de hacerlo.»

### Qué se hizo en la 2.5
- **Negativo = marca de palabra** ('n' en `st.marks`, botón «negativo» junto a negrita/subrayada, vale en
  autoencajar). En CALCAR es una opción de **Relleno** (No / Brocha / Sello / Negativo) con la técnica elegida.
  Ya no es una herramienta (los ajustes guardados con `tool: 'negativo'` pasan a lápiz).
- `writer.plan` termina con `NG.planWords`: los trazos de las palabras en negativo no se pintan; con ellos se hace
  la máscara (cada trazo con su grosor o, como mínimo, 0,042 em: letras finas y legibles, huecos abiertos) y se
  pinta la caja de la palabra (sigue la forma: en un arco se curva). La maqueta les reserva sitio alrededor.
- **Relleno según la técnica** (`STYLE` y `fillBox` en `negativo.js`): lápiz = sombreado en zigzag con vueltas
  redondas, por parches solapados, dirección dominante y segunda capa casi paralela; carboncillo = barrido ancho en
  zigzag largo y golpes sueltos; cera = zigzag apretado casi vertical + otra pasada; boli = garabato de bucles en
  filas (dos capas); rotulador = pasadas paralelas que se montan; pincel = pinceladas anchas + capa cruzada. El
  relleno usa el pack que tenga el usuario de esa técnica.
- **Perfil** de cada letra con una versión fina de la misma técnica (lápiz HB, carboncillo fino, cera fina, boli,
  rotulador fino, pincel fino), pegado a la letra (su canto interior la toca: no la come).
- El relleno no sale de su caja (máscara con borde a mano, ondulado a dos escalas): no se come las palabras vecinas.

### Tras probar la 2.5 (captura: cajas en arco que cortaban la última letra, rayado en rejilla, letras finas)
- Mandó cómo debe verse un negativo (`referencias/negativo_bien_hecho_NOTA.png`): «mira las direcciones de los
  trazos», «la letra más gruesa y más recta para poder pintar alrededor», «los cuadros tienen los vértices un poco
  movidos, no rectos». Pidió buscar cómo se hace: en el *negative lettering* a mano primero se perfilan las letras
  por fuera, pegado a ellas, y después se rellena hacia fuera (lettering.org/negative-lettering).

### Qué se hizo en la 2.6
- La caja salía más corta que la palabra: el escritor corrige huecos y mueve letras después de maquetar; ahora la
  caja se mide con los trazos reales de la palabra (`wordExt` en `writer.plan`).
- Letras del negativo: estilo interno `bloque` (gruesa y recta, sin temblor) y grosor de máscara 0,062 em.
- Caja = cuadrilátero con las cuatro esquinas movidas (±7 % de su alto), bordes casi rectos, perfilada lado a lado
  con trazos que se pasan en las esquinas.
- Orden de pintado como a mano: 1) perfil de cada letra con uno o dos trazos que siguen su borde; 2) caja;
  3) relleno a **parches orientados**: la dirección de cada parche es la del borde más cercano (campo de distancia
  a las letras o a la caja → tangente), con una segunda capa cruzada en ~30 % de los parches. Lápiz y cera en
  zigzag con vueltas redondas, carboncillo/rotulador/pincel con trazos paralelos en vaivén, boli con bucles
  pequeños. Las tintas que se montan van algo más ligeras (si no, la caja se vuelve un bloque) y sin carga en los
  extremos (si no, cada trazo corto deja un punto).
- Las letras vecinas que se meten en la caja se respetan (el relleno las rodea); en autoencajar las letras en
  negativo no se meten en otras líneas.

### Tras probar la 2.6 (referencias: `referencias/negativo_TEA_boli_rotu_lapiz.png`, `relleno_garabato_a_mano.png`)
- «Dos palabras juntas en negativo: la caja tiene que unirse.» «Las esquinas de la letra del negativo tienen que
  ser duras, trazos rectos.» «La textura muchísimo más realista.» «El boli que haga bolitas o espirales, quítalo.»
  «Las esquinas de las cajas, todas iguales, es terrible: muchísima más variedad.»
- Cómo se hace a mano: las letras primero con línea, luego la caja, luego se rellena entre medias. Los bordes de la
  caja son irregulares: a veces cierran, a veces no, a veces se cruzan, y al rellenar se marcan más. El relleno es
  un garabato de ida y vuelta sin levantar el boli (un muelle apretado); con eso se llena ~80 %, el resto son rayas
  sueltas que remarcan y huecos (más con boli: da pereza rellenar).

### Qué se hizo en la 2.7 (`js/negativo.js`)
- **Caja única** para palabras en negativo seguidas en la misma línea (`planWords` agrupa).
- **Letra de esquinas duras**: el estilo `bloque` es poligonal (`angular: 1`); los trazos se simplifican
  (Douglas-Peucker) y se estampan con su contorno en inglete (`stampBlocks`: esquinas vivas, bisel solo en picos
  muy agudos, remates cuadrados); los trozos que el escritor parte en los picos se vuelven a unir. Grosor 0,072 em.
- **Orden de pintado**: 1) perfil de las letras en tramos rectos que se pasan (o no llegan) en cada punta; 2) caja
  lado a lado, cada punta con su salida al azar (corta, justa, poco, mucho; en em) y a veces dos pasadas torcidas;
  3) fondo (solo rotulador y pincel: pasadas largas casi seguidas); 4) **garabatos** donde aún falta (rejilla de
  cobertura; se elige el hueco más grande; idas y vueltas con vuelta redonda, un extremo «ancla» y el otro en
  abanico; dirección = borde más cercano, a veces cruzada; se parte cada `split` idas para que se monte la tinta)
  hasta `cover`; 5) rayas sueltas que remarcan junto a los lados de la caja y por dentro.
- Parámetros por técnica en `STYLE` (boli: líneas finas, muchas idas, huecos; rotulador: base + pasadas largas
  sueltas; lápiz: más gris; carboncillo, cera, pincel). Sin bucles ni espirales.

### Tras probar la 2.7
- «Las líneas de la caja no pueden ser completamente rectas: hechas a mano, irregulares, ligerísimamente curvas,
  nunca dos iguales.» «Los garabatos de relleno muy regulares: son siempre distintos, con más o menos trazos; en una
  zona pequeña se apelotonan más; tienen forma de abanico.» «Los que llegan a los bordes a veces se salen un poco.»
  «En las esquinas no se cortan como con una máscara: se adaptan a la forma.» «El rotulador sigue poco realista.»

### Qué se hizo en la 2.8
- `line()` a mano: combada (±1,2 % del largo), ondulación lenta, a veces la punta se tuerce al soltar; cada línea
  distinta. En los perfiles de letra, más contenida.
- Garabatos que se ADAPTAN: cada ida llega hasta donde hay sitio (`reach` sobre el campo de distancia a letras,
  vecinas y caja), a veces se queda corta, a veces sale un poco de la caja (distancia por fuera `DO`, con el borde
  del lienzo de cálculo descartado). La máscara ya solo es seguridad (canto vivo a ~2,4 grosores de la caja).
- Cada garabato distinto: nº de idas ×0,5–1,4, apretado ×0,55–1,45, abanico de 0,15–0,6 rad con pivote en un
  extremo, idas combadas; en huecos pequeños menos largo, más apretado (`small`).
- Rotulador: sin canto oscuro (wet 0,1), más opaco, canto deshilachado a dos escalas, moteado claro fino; en el
  relleno (`endDry`) la entrada y sobre todo la salida se abren en fibras secas (pasada rápida). Fondo del negativo
  a pasadas cortas, torcidas y onduladas.

### Tras probar la 2.8 (y «LO DEMÁS DÉJALO IGUAL»)
- Rayas sueltas en las cajas curvas; la negrita poco realista; cortes de máscara; O y D demasiado picudas; un punto
  en el palo de la H con pincel; texturas de negativo malas en pincel y rotulador, mejorables en lápiz y boli;
  «más tupido, con zonas en blanco, que no quede todo gris»; un deslizador TUPIDO que solo aparezca si hay alguna
  palabra en negativo. Después: «va muy lento» y «el perfil de cada letra, con la misma técnica (carbón con carbón)».

### Qué se hizo en la 2.9
- Lados de la caja: siguen su borde (en un arco, se curvan) — antes eran rectas entre las esquinas (`handPoly`).
- Perfil de las letras: tramos entre esquinas (giro > 0,55 rad); las curvas siguen la curva, las esquinas se pasan.
  Letra `bloque` otra vez redonda (`angular: 0`, simplificado 0,005 em): solo los picos son picos.
- Perfil con la misma técnica que el relleno (carboncillo, cera, rotulador; boli y lápiz con su punta fina; pincel
  con pincel fino), más grueso en carboncillo/cera/rotulador.
- Sin cortes: el fondo y las rayas sueltas también se adaptan al hueco; cada garabato elige su grosor según el
  hueco (`rCur`: gordo en lo abierto, más fino entre letras); el relleno se salta el arranque cargado de la cinta
  (`skipCaps`).
- PINCEL: como un pintor — capa de pinceladas largas (a lo largo y dos tandas en diagonal, afiladas en los
  extremos, solo dentro de la caja) y encima el recorte con pincel fino de letras y caja (tapa donde acaba la capa).
- TUPIDO (`st.tupido`, deslizador `slTupido` en `negBox`, visible solo con alguna palabra en negativo o con relleno
  Negativo en CALCAR): cobertura, carga, apretado, huecos sin pintar (más cuanto menos tupido) y zonas más
  cargadas por partes (otra tanda de garabatos al azar). Por defecto 60, más tupido que antes.
- Negrita/repasado: la otra pasada casi encima (0,15–0,5 del medio ancho), casi sin giro, entra algo después y
  acaba algo antes o después. El trazo en dos golpes (imperfección) solo con boli y rotulador (con pincel dejaba
  un punto de carga en el palo).
- Velocidad: distancia exacta de Felzenszwalb (`fastEDT`, lineal) en vez del chaflán; rejilla de 1,6 Mpx;
  cobertura incremental; sin borde húmedo cuando no aporta. Un negativo pasa de ~6 s a ~1,3–2,3 s.

### Tras probar la 2.9 (referencia de pincel: cartel WRONG, `referencias/negativo_pincel_wrong.jpg`)
- «Que no se cruce bloque de negativo con letra normal; si se tienen que cruzar, cómete el bloque, no la letra.»
- «Las líneas de los bloques demasiado regulares: más irregulares, a cachos, el 30 % repasadas.»
- «Las líneas que sobredibujan las letras del negativo, iguales a las del relleno (no finísimas, fuera de técnica).»
- «Los bordecitos grises entre pinceladas en ceras y óleo, quítalos.» «El relleno de pincel, entero mal.»

### Qué se hizo en la 2.10
- Caja recortada contra las otras palabras (`planWords`: si una palabra vecina entra, se recorta el lado que menos
  área pierde sin entrar en las letras propias); esquinas que solo se mueven hacia dentro; la maqueta reserva más
  sitio alrededor de las palabras en negativo (0,24 em + grosor).
- Perfil y caja con la MISMA herramienta que el relleno (`lineP = fillP`, grosor `rF × lineK`).
- Lados de la caja: 1–3 golpes por lado (a cachos, montados o con un hueco), cada uno con su torcedura (entra y
  sale a distinta distancia, combado propio, ondulación a dos escalas); ~30 % de los lados repasados.
- Pintura que tapa (`compositePigment` modo over): una capa fina no aclara lo que ya está pintado (el aclarado
  solo se permite con a³): sin cercos claros entre pinceladas (cera, óleo, pincel).
- Pincel: sin la capa «de pintor»; pinceladas gordas y secas (texturas pincel + brocha con sus entradas y salidas
  reales, `dry` alto), sueltas, casi verticales o a lo largo de la caja, que se salen de la caja (el borde lo
  hacen ellas, sin raya); recorte de letras con el mismo pincel.

### Tras probar la 2.10
- «La cera se ve rara: más partes oscuras, trazos más realistas.» «Las cajas, aún más irregulares.» «Todos los
  negativos tienen los palos muy regulares: como en `referencias/letra_bloque_a_mano_TEAT.png`.» «Pincel mucho
  mejor; quizá esos bordecitos, y trazos de distinto grosor.»

### Qué se hizo en la 2.11
- `stampBlocks`: letra de bloque dibujada a mano — cada palo con su grosor (una punta más ancha, a veces se abre en
  las dos), los dos cantos con temblor propio (no paralelos), remates cortados en sesgo.
- Lados de la caja: 1–4 golpes, torcedura mayor (en función del em), un quiebro a mitad del golpe en ~45 %,
  grosor variable; ~38 % repasados.
- Cera en negativo: veladura (multiplica) con grano y tono: donde se insiste, más oscuro; más tandas de garabatos
  en zonas (`extra: 2.2`).
- Pincel: grosor de cada pincelada ×0,55–1,3; rejilla de 2,4 Mpx y transiciones de máscara de ≥1,6 celdas (sin
  escalones en los bordes).

### 2.12
- «Más irregular aún la tipografía de negativo, más exagerado el cambio de grosores (no lobulado).» → en
  `stampBlocks` cada palo va de ×0,5 a ×1,55 de grosor en rampa (una punta fina y otra gorda, diferencia mínima
  0,4), se abre en las puntas (hasta +70 %) o se estrecha al medio, remates más sesgados; el temblor de los cantos
  es lento (sin lóbulos).

### 2.13
- «Estas líneas sueltas, sin que el relleno las siga, no. Una cosa es una mano perezosa que no cubre bien, otra una
  línea que no responde a nada.» Venían de lados largos cuyo combado crecía con el largo y se iban hacia fuera, y
  de huecos sin pintar pegados al borde. Ahora: combado y ondulación de `handPoly` con tope (en función del grosor
  y del em); la torcedura de los lados de la caja va hacia dentro (hacia fuera, como mucho 0,35 del grosor);
  antes del relleno general, tandas de garabatos a lo largo de cada lado, pegados a él; los huecos «perezosos»
  solo por dentro (lejos de los lados).

### 2.14 — revisión de «qué es una letra hecha a mano de verdad» (la 2.13 está guardada: etiqueta `v2.13.0` y
`versiones/A_mano_v2.13.0.ccx`)
Pedido: «dedica horas a pensar, revisa la web, entiende lo que es una letra hecha a mano de verdad, piensa cómo
aplicarlo y construye».
Lo aprendido (peritaje de escritura, cinemática de la mano, lettering):
1. **La velocidad lo gobierna todo**: la mano frena en las curvas cerradas (ley de los dos tercios: v ∝ κ^(-1/3),
   Lacquaniti/Viviani) y cada trazo arranca, alcanza velocidad y frena (modelo sigma-lognormal de Plamondon).
   Donde va despacio hay más tinta y más ancho; deprisa, más fino y claro.
2. **Entradas y salidas al vuelo**: en la escritura genuina muchos trazos empiezan y acaban con la mano en
   movimiento (punta fina, «flying finish»); las falsificaciones tienen principios y finales romos y grosor
   uniforme. El boli puede empezar sin tinta («inkless start») y acaba afilándose.
3. **Ganchos**: la mano llega al papel desde donde estaba y al soltar ya va hacia el trazo siguiente.
4. **Ritmo**: cada línea sube o baja; inclinación y tamaño derivan despacio a lo largo del texto (no letra a
   letra); con fatiga, más grande y más suelto.
5. **Nunca dos letras iguales** (ya se hacía: 3 variantes + variación por letra).
Qué se construyó:
- `ink.js`: modelo de velocidad por trazo (curvatura suavizada → v; aceleración al empezar y frenado al acabar);
  respuesta por herramienta (`SPEED`: vW grosor, vInk tinta, fly probabilidad de entrar/salir al vuelo). Al vuelo
  se afila (boli, lápiz, pincel) o se aclara apenas adelgazando (rotulador). Puntos y tildes nunca al vuelo. En el
  rotulador solo algunos extremos cargan punto de tinta (nunca los que salen al vuelo). Los negativos no usan el
  vuelo (están aprobados así).
- `writer.js`: ganchos de entrada (dirección de llegada) y salidas hacia el trazo siguiente, afilados (tipIn/tipOut
  con `w`); pendiente propia de cada línea y deriva lenta de inclinación y tamaño a lo largo del texto (no en
  autoencajar).
- Cursiva propia: v y w con el pico en su sitio (antes «iv» se leía «w»), punto de la i y la j más visible y nunca
  tomado como salida al ligar, espacio entre palabras más corto.
Fuentes: designrush.com (por qué las letras manuscritas digitales parecen falsas), ojp.gov (morfología del trazo de
bolígrafo), forensicfield.blog (características individuales de la escritura), Lacquaniti et al. 1983 (ley de los
dos tercios), Berio/Leymarie/Plamondon IGS 2017 (sigma-lognormal), ojp.gov (fatiga y escritura).

### 2.15 — las 8 letras, rehechas a partir de escritura real
Pedido (tras probar la 2.14): «Nerviosa A corta las letras», «Nerviosa B exagera mucho, sus A son extrañas»,
«Infantil B con boli sale como rotulador gordo con triángulos rayados y en MAYÚSCULAS mezcla minúsculas (hABÍA,
ceRRADO)», «el boli fino no es un boli», «la cursiva tiene que funcionar muchísimo mejor en todas», «rehaz todas las
tipografías: 8 diferenciadas, ni letras locas, ni cortadas, ni claramente digitales». Después mandó una imagen de
referencia por estilo («solo la tipografía, no la técnica; las autogeneradas, no el calcar») y pidió analizarlas una
a una y usarlas todas.
Cómo se analiza una letra (lo que se miró en cada muestra): proporción (ancho/alto de la O, la N, la H), altura de
x respecto a la mayúscula, astas y colas, inclinación y cuánto cambia, ritmo y espacio entre letras, regularidad de
tamaños y de la línea base, construcción (cuántos trazos, si cierra los óvalos, travesaños altos o bajos), forma de
los vértices (pico o curva), y en cursiva: conexiones, bucles, anchura y rapidez.
Reparto (referencias en `referencias/tipos/`):
| Estilo | MAYÚSCULAS | minúsculas | cursiva |
|---|---|---|---|
| Infantil A | abecedario de niño | «Let it be unpolished» | propia, redonda y derecha (Comme des Garçons) |
| Infantil B | «hello. this is a reminder» | ídem + esqueleto con sus proporciones | Hershey Script derecha (de colegio) |
| Adulta A | «MENU» (pincel estrecho) | esqueleto con sus proporciones | propia inclinada, cuerpo pequeño (Menu) |
| Adulta B | esqueleto alto y estrecho (Tryin') | ídem | propia casi derecha, estrecha y alta |
| Nerviosa A | «Tonya Harding's» | esqueleto estrecho | propia muy tumbada, baja y estirada (Vlaminck) |
| Nerviosa B | «I want to be mysterious» | esqueleto | propia tumbada y temblona |
| Elegante A | la de siempre (Elfin) | Elfin | Allure (no se toca: «me gustaba la de antes») |
| Elegante B | Matisse/Calder… | Matisse | Allure derecha, ancha y abierta |
Qué se construyó:
- `tools/glyphref.py` + `tools/glyphspec.json` → `js/refglyphs.js`: de cada muestra se sacan las letras (piezas
  de tinta numeradas con `annotate`, o cajas), se esqueletizan (skimage), se siguen los trazos (en los cruces, lo más
  recto), se podan los pelos, se buscan los vértices en el trazo sin suavizar (así la A, la M, la N siguen en pico)
  y se suaviza cada tramo por separado (fuera la escalera de píxeles), se simplifica (RDP) y se pasa al mini
  lenguaje de `skeleton.js`. Las mayúsculas pierden las motas sueltas. `skip` en la ficha quita las letras que
  salían rotas o ambiguas (una I que parecía i, una M que era m, una E sin brazo central, una A en Λ…): esas
  salen del esqueleto genérico. Hoja de control: `SHEET=... python3 tools/glyphref.py build`.
  (Los cortes de palabras en cursiva están en la ficha pero no se usan: las letras salían a trozos. `CURSIVA=1`.)
- `fonts.js`: cada estilo tiene `ref`; las letras de referencia se normalizan (mayúsculas sobre la base y altura 1
  conservando algo de su desigualdad; minúsculas con altura de x 1 y astas ~1,55) y se deforman muy poco (son ya
  de mano). Lo que falta sale del esqueleto con la anchura media de las letras de la muestra (`autoWide`).
  Fuera las letras «locas»: sin `OVR` rab/wild/geo, sin trazos dobles, sin piezas rellenas ni grosor propio (`absW`:
  era lo que hacía del boli un rotulador gordo con triángulos en Infantil B, y lo que metía minúsculas).
- Cursiva: cada letra empieza donde acaba la anterior (salida → entrada); el avance ya no lo empuja el asta
  inclinada (antes «Nad ie», «cerrad o»); entre mayúscula y minúscula, un hueco pequeño medido a la altura de x;
  en las fuentes ligadas (Allure, Script) la letra que sale abajo a la izquierda (la d) acerca la siguiente sin
  montarse. En cursiva no se recortan los extremos ni se ponen ganchos en las letras ligadas.
- «Corta las letras»: era el mapa de la forma (`geom.arcParam`): lo que se salía un poco del borde se pegaba a él
  y la letra quedaba aplastada, como cortada. Ahora se prolonga en línea recta. Además, en los picos (A, M, N) cada
  lado se monta un poco sobre el otro y no se afila ni sale «al vuelo» en el corte (`cont0/cont1` → `ink.contIn/
  contOut`); el afilado del pico es más suave.
- Menos variación por letra y por trazo (giro, cizalla, desplazamiento de cada trazo), el hueco mínimo del pintado
  casa con el del estilo (las palabras no crecen al pintarlas) y el boli casi no hace ganchos.

### 2.16 — que cambiar de letra merezca la pena
Pedido: «siguen siendo muy parecidas (las minúsculas de infantiles y nerviosas, casi idénticas; las mayúsculas de
Infantil B, Adultas y Nerviosas, casi iguales). Guíate por los nombres: un niño, más entrecortado y redondeado; una
nerviosa, letras más juntas, más finas, picudas. Una puede ser la más correcta. Y la cursiva está mal hecha».
- Cada estilo tiene ahora rasgos de construcción propios (no solo anchura): `asc`/`desc` (astas y colas largas o
  cortas), `peak`/`peakS` (arcos y óvalos en pico, lados rectos), `alt` (a, g, y de otra forma), `refW` (anchura
  de las letras de muestra), `piece` (trazos sueltos que no casan, de niño), inclinación a la derecha o hacia atrás,
  altura de x de 0,46 a 0,86, espaciado y grosor muy distintos. Tabla en `STYLES` (comentada).
- Cursiva: (1) fallo de fondo arreglado: al ligar tres letras seguidas la segunda se quedaba sin trazo y la
  tercera no se unía (`_carry`); (2) enlace alto: tras o, b, v, w, r la letra siguiente entra por arriba, sin bajar
  a la línea; (3) al empezar palabra, las redondas (a, c, d, g, o, q) no traen rabito desde abajo; (4) la r es
  palo + hombro (antes se leía «v»); (5) `joinP`: algunas manos levantan el boli a media palabra (Adulta B);
  (6) Elegante B tiene cursiva propia de invitación (cuerpo menudo, astas largas, enlaces largos).

### 2.17 — ronda de revisión: cursivas y legibilidad
Pedido: «dedícale un buen rato a mejorarlo todo, sobre todo las cursivas; más diferencia; legibles pero no iguales,
regulares ni sintéticas». Se revisó cada estilo con un texto que tiene todas las letras y los enlaces difíciles
(«el veloz murciélago hindú comía feliz cardillo y kiwi / zarza jaque exige whisky ñu / bobo vive wow obra ojo»).
- Cursiva: la de colegio (Infantil A) conserva todos los bucles; las manos adultas los pierden (`noLoopA`: l, b, h,
  k, f suben y bajan por el mismo palo; `noLoopD`: g, j, y acaban en gancho y no ligan con la siguiente); hombros
  de m, n, h, r redondos (antes hacían un codo al volver a subir); espacio entre palabras proporcional al cuerpo.
- Letra de molde inclinada: los huecos entre letras se miden a lo largo de la inclinación (`body0`), así la Nerviosa
  A queda apretada de verdad; los picos solo enderezan arcos (n, m, h, r), no aplastan los óvalos (b, o, p).
- Letras de muestra retiradas por ilegibles en texto corrido (b, m, h, n, a de Infantil A; l de Infantil B; B de
  Infantil A; V de Adulta A; O con raya de Nerviosa A; V y S de Nerviosa B; E y C con cola de Elegante B).

### 2.18 — negativos menos falsos, encaje estable, R limpia
Pedido (capturas en arco con lápiz y pincel): «quita esas cosas de las R; al cambiar de técnica las letras cambian
muchísimo de colocación y tamaño (en pincel lo hace perfecto); el rotulador gastado es demasiado temblón; los
negativos siguen viéndose superfalsos: mejóralos, incluso su tipografía, que se parezca a la que les acompaña».
- R de Tonya (con un ojal dentro) retirada; también su D, que se leía Q.
- El encaje ya no depende de la técnica: `inkPad` del maquetado es fijo (0,04 × grosor), no el ancho de la
  herramienta. Mismo texto y misma forma → mismas líneas y tamaños con cualquier técnica.
- Rotulador gastado: `tremor` 0,75 → 0,3.
- Negativos: (1) la letra de bloque es la del estilo elegido (`neg:<estilo>` en `fonts.styleOf`: sus letras de
  muestra, su inclinación y sus picos, pero quieta y con aire; adiós al estilo `bloque` único); (2) menos de cómic:
  las cuñas de grosor de cada palo son suaves (0,68–1,18 en vez de 0,55–1,55), menos remates abiertos y en sesgo;
  (3) el canto de las letras ya no es un corte a cuchilla: cada trazo del relleno aplica la máscara desplazada un
  poco (`Mfill.jit`, `ink.applyMask`), así unos se quedan cortos y otros se meten un pelo: el borde lo hacen los
  finales de los trazos.

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
| `fonts.js` | 8 estilos (`STYLES`: `adulta_a` … `elegante_b`). Desde 2.15 cada uno usa sus letras de escritura real (`refglyphs.js`, con `ref`) y el esqueleto con sus proporciones para lo que falta: anchura, inclinación, alturas desiguales, travesaños, palos, óvalos que no cierran. 3 variantes por letra (o las de la muestra). Cursiva propia (`CURS`, encadenada salida → entrada) o con `fontdata.js` (Hershey Script y EMS Allure). `templates(ch)` da la letra neutra para el calco. |
| `refglyphs.js` | (generado, 2.15) letras sacadas de las muestras de `referencias/tipos/` con `tools/glyphref.py` y la ficha `tools/glyphspec.json`. |
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
python3 tools/build.py              # dist/plugin y dist/A_mano_v2.18.0.ccx
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
- 2.3 añade: negrita y subrayado en autoencajar (marcas en el panel).
- 2.4 añade: negativos a lápiz y a pincel en GENERAR y en CALCAR.
- 2.5: negativo como marca con las 6 técnicas en GENERAR y como relleno en CALCAR.
- Último resultado: **58/58 bien, sin errores de modal**.

---

## 5. Pendiente e ideas

1. La 2.1 ya se probó en Photoshop real (capturas del usuario). Falta ver la 2.2 allí.
2. Letra hueca de bloque (referencia Good Room) como estilo o versión aparte: no está.
3. Cursivas: seis estilos usan la cursiva propia (`CURS`) con proporciones sacadas de las muestras; Infantil B y las
   elegantes, Script/Allure. Las letras sueltas de las muestras de cursiva (Menu, Comme, Vlaminck) salen a trozos al
   cortarlas de la palabra; si se quiere usarlas, hay que mejorar el corte (`CURSIVA=1` en glyphref).
3b. Letras de referencia que se quitaron (`skip` en `tools/glyphspec.json`): casi todas las de Tryin' (Adulta B) y
   varias de Tonya, mysterious y Matisse salían rotas. Con fotos más limpias de esas letras se pueden recuperar.
4. CALCAR: el calco guiado acepta ~92 % de las letras de prueba; las decorativas (cursiva de Chorus) caen al
   esqueleto. La variación de CALCAR (planVariation) puede subir o bajar letras sueltas de más con legibilidad baja.
5. Goteo de la brocha (The New Pop), papel rasgado (AVONAT) y las manchas de TRAZOS: aún no.
6. Si el usuario escribe su propio alfabeto, se puede convertir al mini lenguaje de `skeleton.js`.
