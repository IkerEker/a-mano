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

## 2. Cómo se usa (2.31)

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

### 2.19 — el texto no se recoloca; cajas de negativo que no pisan; R limpias; cursiva Infantil B
- «Cuando cambio de estilo o de tipo el texto se recoloca por completo»: el reparto en líneas (envolventes) se
  decide con una letra neutra fija (`__plantilla`, minúsculas, `inkPad` 0,04 → `o.canon` en `layout.js`) y se
  impone a la letra real (`bestBlock(..., fixed)`). Cambiar estilo, modo o técnica ya no cambia qué palabra va en
  qué línea; solo el dibujo y algo la escala. (El `inkPad` real vuelve a depender de la técnica: con trazo gordo
  hace falta aire. En siluetas y en autoencajar el reparto sigue dependiendo de la letra.)
- Caja de negativo: si una palabra vecina está pegada, la caja se queda a medio camino (antes no se recortaba y la
  pisaba); la máscara de letras vecinas es más ancha (cubre el desplazamiento por trazo de la 2.18).
- R de las muestras de Infantil A y B retiradas (traían un ojal o un trazo dentro).
- Cursiva de Infantil B: ya no es Hershey Script; es la propia, gorda, redonda, baja y derecha (cuerpo 0,74, astas
  cortas). La de Infantil A, más alta y desigual.

### 2.20 — botón siempre visible; nuevas minúsculas de Infantil B y Adulta A
- Panel: el contenido se desplaza (`#mainScroll`) y las acciones («Escribir en la forma», «Otra variación») quedan
  fijas abajo; antes, con el panel bajo, el botón se cortaba.
- Minúsculas de Infantil B: referencia `infantilb_principle.png` (picuda, inclinada, desigual, astas largas; mete
  alguna mayúscula entre minúsculas: `capMix` + tabla `mix`, una de cada tres variantes de r, d, t).
- Minúsculas de Adulta A: referencias `adultaa_goodthings.png` (tabla `minus`) y `adultaa_future.png` (`minus2`, se
  funden como variantes): t en cruz, g de bastón, o estrecha, n, m, s, h.
- De esas muestras se descartaron las letras que no se leían en texto corrido (a que parecía o, u ligada, h, N).

### 2.21 — cursiva: lazos y enlaces naturales y distintos cada vez
- La «e» de `adultaa_future` (con una raya que la cruzaba y puntos en los extremos) retirada.
- Letras redondas (a, d, g, q, c, o): la entrada sube por fuera y pasa por arriba del óvalo (antes lo cruzaba por
  dentro y «ad» se leía «ael»).
- Cada letra cursiva sale distinta (`cv` en `printGlyph`, `loopVar` por estilo): lazo más gordo o casi cerrado, asta
  más alta o baja, cola más larga o corta, entrada y salida a otra altura; 5 variantes por letra (`NVAR` 5) y la
  tensión de cada enlace cambia (`joinCursive`).
- Fallo arreglado: la imperfección «trazo en dos golpes» partía a veces una letra ligada y el enlace salía de
  media asta («la» se leía «ta»); ya no se aplica a letras ligadas. Los enlaces se suavizan (sin escalón).
- Manos sin bucles: al empezar palabra, l, b, h, k, f bajan directamente (antes el rabito de entrada hacía que «la»
  se leyera «ta»).

### 2.22 — enlaces de cursiva de un solo gesto
Pedido (recortes de enlaces largos, planos y con temblor): «a veces son demasiado largos o tiemblan donde deberían
ser trazos limpios siguiendo el movimiento de la mano».
- `joinCursive`: se recortan la colita de salida y el rabito de entrada (0,035–0,055 em) y los dos cuerpos se unen
  con una sola curva (Hermite con las direcciones reales de la mano en esos puntos). Antes se sumaban tres curvitas
  (salida + puente + entrada): eses, escalones y tramos planos.
- Más cortos: la entrada empieza donde acaba la salida (hueco 0,004 en vez de 0,035); `trackS`/`scriptW` bajados en
  Elegante B, Nerviosa A y Adulta B. Tras a, d, g, q, u, una letra de asta (l, b, h, k, f, t) deja algo más de aire
  («al» pegadas se leían «d»).
- Trazos limpios: en cursiva la deformación de la letra baja al 30 % y el pulso es más lento y menor (×0,45).

### 2.23 — repaso letra a letra de los 8 estilos (pangrama en los 3 modos)
Se revisó cada estilo con «el veloz murciélago hindú comía feliz cardillo y kiwi zarza jaque exige whisky ñu bobo
allí» en mayúsculas, minúsculas y cursiva, y se corrigió lo que no se leía:
- Cursiva: el punto de la i y la j se tomaba como salida y el enlace salía del punto («hindú» → «hi ndú», «exige» →
  «exi ge»); ahora es una marca (`s.dot`). En manos sin bucles, más aire antes de l, b, h, k, f, t.
- Punto de la i y la j de molde: más alto y más visible (la i se confundía con la l).
- Picos (`peak`) en letra de molde: solo en n, m, u, r y mayúsculas (la «a» y la «e» picudas no se leían).
- Letras de muestra retiradas: E de Infantil A (parecía F), E de Nerviosa A, H de Nerviosa B, h y g de Adulta A,
  f de Elegante B (parecía una cruz).
- Infantil B: mayúsculas derechas y parejas (`slantCap`, `hVarCap`), minúsculas inclinadas y desiguales.
- Adulta A: más aire entre minúsculas (`minGap`), mayúsculas algo inclinadas.

### 2.24 — cada mano construye las letras a su manera
Pedido: «corrígelo todo, más diferentes, más realistas». El problema de fondo: tras descartar las letras de muestra
ilegibles, casi todo salía del mismo esqueleto genérico estirado o inclinado. Ahora cada estilo tiene:
- **Formas propias** (`SK.FORMS` en `skeleton.js`, `forms` en cada estilo; van después de las letras de muestra y
  antes del esqueleto genérico): `capsKid`/`lowKid` (palo y bola, trazos sueltos), `capsBrush`/`lowLoop` (de un solo
  trazo, con salida), `capsTall`/`lowTall` (M y W de lados rectos, J con sombrero, Z con raya, f con cola),
  `capsFast`/`lowFast` (travesaños que cruzan y se pasan, t de raya que se escapa), `lowPrinciple` (l de lazo, p y f
  de «The Principle is simple»), `lowTail` (a con salida: sin ella, estrecha, se leía «o»), `lowDesign`.
- **Punto de la i** (`dot`/`dotS`: punto, redondel `o`, raya `dash`, tilde suelta `tick`; `dotH`, `dotDx`), tildes
  largas (`accK`), raya de la t escapada en cursiva (`tbar`).
- **Esquinas redondeadas** (`round`), **grosor propio de la cursiva** (`weightS`), **mayúsculas con su espaciado**
  (`trackCap`), **líneas que suben o bajan** (`rise`), **lazos más gordos** (`loopW`), **rasgos de entrada y salida**
  en la cursiva de invitación (`lead`).
- Arreglos: los huecos entre letras se miden sin las colas (la y de Elegante A ya no se separa: «whisk y»); el punto
  de la i no se recorta nunca; el travesaño de la H no puede caer al suelo; en cursiva hacia atrás, aire antes de
  las astas («el»); Nerviosa A cursiva menos tumbada (0,6); fuera la mezcla de mayúsculas de Infantil B; espacio
  entre palabras proporcional al cuerpo de la letra.
- Pruebas: `one.js`/`sheet.py` (pangrama, 8 estilos × 3 modos, con rotulador para ver los grosores) y `alpha.js`
  (abecedario) en el borrador de la sesión; conviene pasarlos a `tests/node/` si se sigue con las letras.

### 2.25 — GRAFFITI: técnica Spray y letra Graffiti con sus firmas
Pedido (con tres referencias: abecedario a brocha amarilla, «SMOKE SWIG SWEAR» a zarpazos, «BANKSY CUT & RUN» a
spray negro chorreando): «una tipografía nueva y una técnica nueva, Graffiti, con varias sub-tipografías (sin
mayúsculas ni minúsculas); que cuando se seleccione cambie la interfaz; infórmate de cómo funciona un graffiti».
Cómo funciona (lo que se aplicó):
- Letra de firma (handstyle): una sola caja (la minúscula se construye como mayúscula), peso y anchura parecidos en
  todas las letras, y las letras se tocan o se montan un poco en vez de dejar huecos; el estilo es exagerar una base
  correcta, no añadir adornos (theartistblock.ink, «Graffiti Handstyle Fundamentals»).
- Bote: más deprisa, línea más fina; despacio y cerca, chorretones y salpicaduras; lejos, borde borroso; si el bote
  se inclina, el trazo se abre por un lado (flare) (machinestudio.com, «3 steps to better can control»).
Qué se construyó:
- `ink.js` · `paintSpray` (`proc: 'spray'`, técnica `spray` en `TOOLS`): cuerpo opaco, borde que se deshace en
  motas, nube y neblina alrededor, gotas que escupe la boquilla, trazo que se deshace al retirarse y **chorretones**
  que nacen donde se carga la pintura (arranques, esquinas, tramos tumbados) y caen en vertical con su gota al
  final (~un tercio del ancho del trazo). Boquillas: `gordo`, `fino`, `seco`, `mop`. Parámetros del usuario:
  `goteo` y `nube` (deslizadores `slGoteo`, `slNube`, solo visibles con spray). Sin ganchos de entrada con spray.
  La caja de cada trazo se alarga hacia abajo para que los chorretones no se corten al pintar por franjas.
- `fonts.js` · estilos `graffiti_a…d` (`sub`: Tag, Rabia, Bomba, De un trazo) sobre la base `GRAF`: `gmode` (modo
  interno: mayúsculas o cursiva), `overlap` (hueco entre letras, puede ser negativo), `lowerAll`. Formas propias en
  `skeleton.js`: `capsTag` (e e i de minúscula a la altura de las demás, travesaños que cruzan) y `capsRabia` (todo
  rectas, S en rayo, O en rombo).
- Interfaz (`main.js` `syncGraf`, `styleKey`, `curMode`; `index.html` `grafSeg`, `grafHint`, `sprayBox`): al elegir
  Graffiti se ocultan A/B y la caja, salen las firmas, el panel se pone amarillo (`body.graf`) y se coge el spray;
  al salir vuelve la técnica anterior. Ajustes nuevos: `gsub`, `goteo`, `nube`.
- `negativo.js`: relleno a spray para las cajas de negativo. Pruebas: 5 nuevas en `tests/sim/harness.js` (64).
- Pendiente: letra de pompa (throw-up, con contorno), adornos de firma (flecha, subrayado, comillas, corona),
  y llevar el Graffiti al panel de After Effects.

### 2.26 — Graffiti, segunda vuelta: que parezca pintura de verdad
Pedido: «son una mierda; mira cómo es la tipografía de un graffiti de verdad, mira cómo es su textura; búsqueda muy
extensa; muchísimo más realista». Lo que fallaba: eran mayúsculas normales con textura de aerógrafo.
Lo aprendido (búsqueda sobre firmas, estilos regionales, boquillas, mops y brocha plana):
- La herramienta de las firmas es el **rotulador de punta biselada** (y la brocha plana): el trazo sale gordo en una
  dirección y fino en la otra y acaba en corte recto. Sin eso no parece un tag.
- Estilos: Filadelfia (letras estiradas en vertical, de uno o pocos trazos, que se enganchan y se montan), São Paulo
  (altas, estrechas, angulosas, negras), cholo de Los Ángeles (de un solo trazo, con remates), busflow de San
  Francisco (redondas, ligadas, de una línea, todas del mismo tamaño, con lazos), Nueva York (firma rápida a rotulador
  biselado). En todos: el abecedario de debajo se sigue reconociendo; consistencia de peso y anchura; las
  extensiones solo si sirven a la estructura.
- Bote: despacio y cerca chorrea y salpica; deprisa afina; lejos emborrona; inclinado se abre por un lado.
Qué se cambió:
- `ink.js` · `paintFlat` (puntas `plano` y `rastro` «Barra», `flat: true`): la punta es un filo con ángulo fijo que se
  arrastra; anchura según la dirección, extremos en corte recto, vetas a lo largo (el «peine» de la punta, el mismo
  en todo el trazo, más abiertas hacia el final y en los bordes), chorretones donde la punta se para.
- `ink.js` · cobertura del spray rehecha: el borde ya no es un círculo perfecto (se ondula a dos escalas); del
  cuerpo a la nube no hay degradado gris sino motas juntas que se separan, de tres tamaños; el final al vuelo se
  estrecha y se deshace en motas; neblina desigual. Chorretones más finos (gordos solo en el mop) y a veces en grupo.
  `drawDrips` es común al spray y a la punta plana.
- Firmas: cada una trae su punta (`pre`): Tag → Plano, Rabia → Barra, Bomba → Gordo, De un trazo → Mop; más peso, más
  montadas; Rabia mucho más alta y estrecha.
- Pendiente: letra de pompa (throw-up), adornos de firma, brocha con color translúcido que se suma al cruzarse.
Fuentes: en.wikipedia.org/wiki/Handstyle; theartistblock.ink (5 tipos de tags; fundamentos del handstyle; guía de
extensiones); machinestudio.com (control del bote); sprayplanet.com (boquillas).

### 2.27 — Graffiti como técnica propia; firmas Borrón (empapado en tela) y Rodillo (rodillo de tóner)
Pedido: «añade esta tipografía (mira cómo la letra se humedece y entra en la tela); te recuerdo que Graffiti es una
técnica aparte, no está hecha de lápiz, boli, cera: es propia» y «añade también este graffiti: está escrito con el
rollo de un tóner». Referencias en `referencias/tipos/graffiti_*.png`.
- **Técnica propia**: Graffiti ya no es una «letra» que se combine con las técnicas. Es el último botón de la fila
  de técnicas (`data-v="spray"`); `isGraf()` = `st.tool === 'spray'`. Al elegirla: se ocultan las cuatro letras de
  mano, A/B y la caja; salen las firmas (`grafSeg`) y las puntas (`presetSeg`); panel amarillo. Para salir, otra
  técnica. Los ajustes guardados con `persona: 'graffiti'` se migran.
- **Empapado** (`soak`, firma Borrón, `graffiti_e`, `capsBlob`): la pintura cala; no hay borde, sino un degradado
  ancho que la trama de la tela (dos senos cruzados + grano) rompe en puntitos; zonas más y menos cargadas; el
  trazo se hincha donde la mano para (`swell`, `puls`); gotas que calan como manchitas blandas (`spotK`). Sin
  chorretones (la tela chupa).
- **Rodillo** (`band`, `paintBand`, firma Rodillo, `graffiti_f`): banda perpendicular al camino (no punta de ángulo
  fijo): aguada translúcida en multiplicar, hilos a lo largo que siguen las curvas, cantos cargados (raya oscura a
  cada lado), raya donde arranca y donde se levanta, corte recto en los extremos, carga de tóner que se agota, a
  veces traqueteo en zigzag; al cruzarse dos bandas se suman. Letra geométrica con vueltas anchas (`roundR`).
- Pruebas: las 6 firmas en `tests/sim/harness.js` (66).

### 2.28 — Borrón y Rodillo rehechos (letra y pintura)
Pedido (con capturas de la 2.27): «esta tipografía no se parece en nada a la muestra; el efecto tóner tiene que ser
muchísimo más realista» y, de Borrón, «lo mismo: la tipo está mal y a la tinta le falta muchísimo realismo;
ultrarrealista, detallado, finísimo». Lo que fallaba: eran las mayúsculas de siempre con otra textura; el rodillo
salía casi hueco (parecía letra de contorno) y el empapado era un desenfoque gris.
- **Letras propias** (`skeleton.js`): `geoPath()` construye letras con rectas y arcos de círculo. `RODILLO`
  (`capsRodillo`, A–Z y 0–9): como se pinta con rodillo: barras rectas con corte a escuadra que se cruzan y se pasan
  un poco en las uniones, y vueltas de medio círculo (la W de cuatro barras, el 2 de arco + diagonal + base, el 4 de
  tres barras...). `BLOB` (`capsBlob`): redonda, de una caja (i con punto, n y m de arcos, e de dos panzas, O
  circular); lo que falta lo toma de `capsRodillo`. Estilos: `zoom` y `bigO` (cada letra de un tamaño; O, Q y 0
  enormes).
- **Empapado** (`paintSoak`): ya no hay «tubo» con borde. Se suma en una rejilla la pintura que cae (chorro + nube;
  más donde la mano arranca, para o gira) y cada píxel se mancha o no con probabilidad 1 − e^(−pintura) contra un
  umbral de grano fino + grumos + trama de la tela. Resultado: centro negro, borde de grano (no difuminado), trama en
  las medias tintas, hilos que se llevan la pintura a lo largo y a lo ancho, motas, gotas negras y borrones grises.
  La rejilla va anclada al documento (sale igual por franjas). En trazos muy pequeños el borde se suaviza.
- **Rodillo** (`paintBand`): cientos de hilos finos a lo largo, cada uno con su carga, que se abren y se juntan;
  aguada clara a franjas; zonas cargadas en negro con hilos secos; cantos con raya negra irregular (a veces otra por
  dentro) que ondulan por separado; costuras en el arranque, al levantar y en paradas a medio trazo (tras cada una
  los hilos no casan); extremos en corte recto algo torcido; motas; traqueteo. Los lazos se cierran pisándose. En
  multiplicar: los cruces se suman. Banda más estrecha (0,085 em) para que las letras respiren.
- `padK` en una punta: aire extra en el encaje (el empapado mancha más ancho que su trazo).
- Pruebas visuales: `tests/node/letras/graf3.js` (pocas letras grandes, una frase, y la frase a 520 px).

### 2.29 — Empapado: tinta que cala (tono continuo, aguadas, manchas), no ruido
Pedido (con la muestra «GERONIMO» otra vez): «la tinta entra y empapa, no es solo ruido; mira los difuminados, las
manchas, las aguadas; es pigmento y spray; muchísimo más fino y realista». La 2.28 era un punteado binario.
Se midió la muestra ampliada: negros de 0–5, degradados anchos y suaves con grano fino encima (no puntos duros),
velos grises amplios solo en algunos tramos, redondeles de tinta aguada de distintos grises con borde blando, gotas
negras con satélites, contornos abultados.
`paintSoak` rehecho:
- **Tono continuo**: densidad D = chorro (rejilla, gaussiana) + velo + manchas; tono = 1 − e^(−D) con una curva de
  contraste (lo muy tenue se pierde, lo denso llega antes a negro). Encima, grano fino aditivo (ruido de píxel +
  ruido suave de ~2 px + un poco de trama), proporcional a t·(1−t): manda en las medias tintas y conserva el tono
  medio (el umbral de la 2.28 comprimía los degradados a 6–8 px).
- **Pigmento desigual**: un tercio de los trazos van aguados (carbón, no negro); la carga cambia a lo largo del
  trazo; el bote se acerca y se aleja (`far`, `K`: bordes casi limpios o muy difuminados); charcos en el arranque,
  al final, en las dudas a medio trazo y en los giros; el charco no cae justo en la línea (contorno abultado).
- **Velo**: gaussiana ancha solo a ratos y descentrada (el bote va ladeado).
- **Manchas** (`stains`, a resolución completa): aguadas (redondeles de contorno irregular, grises claros, medios u
  oscuros, borde blando, a veces con cerco), chorreos que se alargan hacia abajo y se agotan, gotas de pigmento con
  reguero de satélites y motas. «Goteo» regula manchas y chorreos; «Nube», el velo.
- Absorción desigual de la tela (a manchas) y capilaridad a lo largo de los hilos, como antes.
Comparación a tamaño de muestra: `tests/node/letras/graf4.js` (600 px).

### 2.30 — Graffiti rehecho: aerosol de verdad, chorretones que nacen del trazo, brillo plano, firmas de mano
Pedido (13 nov, una tanda de capturas del cartel «Nadie había cerrado / la puerta del sótano»): las gotas no tocan
las letras y no son realistas; el spray punteado «es una mierda»; el fino «no es un graffiti para nada»; Mop «la
tipo bien, las letras mal»; Barra y Plano «son NADA graffiti»; el Empapado «apenas se lee»; el Rodillo «fatal: los
repintes, la textura, poco legible»; las N y las A (de Infantil B) mal. Después: una opción de textura solo en modo
graffiti —y, visto el primer intento con volumen, «no: el graffiti es plano; brillante, pero plano; solo se acumula
un poco más de pintura en algunos puntos»—; esconder en modo graffiti lo que no se usa; y cinco hojas de abecedarios
de tags para rehacer «las firmas que se ven iguales y mal», con variaciones dentro de cada una.

**Aerosol (`ink.paintSpray`, nuevo; desaparece `paintFlat`).** La pintura se SUMA: cada muestra del trazo deja una
huella (supergaussiana `exp(-ρ^m)`, `m` = `edge`) en una rejilla anclada al documento (celda r/7; r/11 si `hard`);
tono = 1 − e^(−D). `lam` es la carga en el centro; `sig` se calcula para que la media tinta caiga a r. Por muestra:
`W` (pintura: 1 + giro − `speed` en mitad de los tramos largos + pulso + charcos de arranque y parada `dwell`), `K`
(tamaño de la huella: `swell`, `wav`, `q.w`), salidas y entradas al vuelo (`flare`, `flareIn`: el flujo cae a casi
nada y la huella se estrecha). Encima: deformación del dominio (`rag`: el borde ondula; mucho en el chorro), grano
(ruido de píxel + ruido de ~2 px, proporcional a t·(1−t): solo en el borde), nube (segunda rejilla gaussiana,
descentrada, pintada como motas de tres tamaños), gotas que escupe la boquilla y salpicaduras (`splash`).
`hard` (mop, extintor): borde neto por umbral; por dentro, más o menos cargado (`thin`). `fan` + `nib`: huella
elíptica (boquilla plana). La caja del trazo ya NO se recorta al lienzo (sale igual por franjas o de una vez).

**Chorretones (`dripExit`, `drawDrips`).** Se decide antes dónde (peso: carga del punto, lo más bajo del tramo,
tramos tumbados) y, ya pintado el trazo, cada gota baja por la columna de pintura hasta su borde de abajo: nace
dentro y sale por ahí (si en su sitio no hay pintura, no hay gota: nunca flotan). Forma: embudo de salida, hilo
recto que adelgaza un poco y ondula apenas, lágrima (se ensancha poco a poco hasta la gota). Casi todas cortas
(colgajos), alguna larga; van en grupos de dos o tres. Presets: `drip`, `dripW`, `dripL`.

**Boquillas.** Gordo, Fino y Seco (parámetros nuevos); Mop (`hard`, w 0,046); **Plano** = bote con boquilla plana
(`fan: 3`): conserva el gordo/fino de las firmas a bisel pero es spray; **`rastro` pasa de «Barra» a «Extintor»**
(chorro líquido: borde roto, ancho a golpes, salpicaduras, cortina de regueros finos). Empapado: huella más ceñida
(`sc` 0,46 r), menos charcos y aguadas más pequeñas y más lejos (se lee con texto largo). Rodillo: interior claro
(aguada ×0,45) con hilos, cantos negros siempre (también en pequeño), menos zonas cargadas, w 0,078 y las bandas
se pasan menos en las esquinas (`overR` 1,1 r): los cruces ya no son rectángulos negros.

**Brillo del esmalte (`render.applyRelief`, deslizador «Brillo», solo graffiti; `st.relieve`, 35).** Primer intento
(almohadillado desde el borde + brillo interior + sombra): rechazado, «así no es un graffiti». Ahora la película es
PLANA: `compositePigment` admite un búfer de altura (0,5 = película normal; hasta 1 = pintura acumulada: exceso de
`lc/lam`, cruces de pasadas, cordón del chorretón y su gota); `applyRelief` (en `finalize`) solo ilumina esas
pendientes (brillo suave, exponente 12) y añade un satinado mínimo. Sin sombra, sin bisel. Empapado y Rodillo son
`matte` (no apuntan altura; el deslizador se esconde). Con brillo, `ps.putBands` pinta cada franja con 24 px de
margen y recorta. El ancho de referencia sale del trazo mediano del plan (`writer.paint`).

**Interfaz en modo graffiti.** Se esconden `slTinta`, `repasoBox` y, al calcar, `fillRow` y `followRow`; aparece
`slRelieve` (si la boquilla no es mate). Las firmas ocupan dos filas.

**Firmas (handstyles).** `skeleton.FORMS`: una letra puede ser `[[ancho, trazos], …]` (varias maneras de hacerla);
`fonts.defFor` elige según la variante. `capsTag` rehecha (rotulador redondo: zigzag, travesaños que cruzan con
rizo), `capsBisel` (punta plana, angulosa: sustituye a Rabia), `capsFlechas` (redonda, remates en flecha; firma
nueva `graffiti_g`), `capsBomba` (gorda y sencilla; Bomba ya tiene abecedario propio). Parámetro de estilo `over`:
cada trazo largo de una forma se pasa de largo al entrar y, sobre todo, al salir, distinto en cada variante; las
puntas de flecha (trazos de 3 puntos cortos) crecen (`arrowK`) y se van con el trazo que rematan. Las hojas de
muestra sirvieron para analizar cómo se construyen esas letras; los abecedarios están dibujados de nuevo, no calcados.
Orden: Tag (fino), Bisel (plano), Flechas (mop), Bomba (gordo), De un trazo (mop), Rodillo, Borrón.

**Infantil B.** Fuera las N, A y W sacadas de la muestra «hello» (N con joroba, A de travesaño descolgado, W de
ondas con pico): usa las genéricas con sus proporciones (`glyphspec.json` → `skip`).

Pruebas: sim 67/67 (firmas a, b, g, c, d, e, f; controles escondidos), AE 19/19. Sin ver en Photoshop real.
Pendiente: extras de tag (corona, comillas, subrayado, estrella), throw-up de contorno, más alternativas por
letra, cifras y signos propios de cada firma, Graffiti en el panel de After Effects.

### 2.31 — Deriva del bloque según la cantidad de texto (prueba)
Pedido: «falta una ecuación de cómo se comporta un texto de graffiti en conjunto según cuánto texto tenga: con poco
suele ir recto, regular; con mucho coge una forma entera, porque la mano va fallando y el texto siguiente intenta
resolver lo que falló el anterior. Infórmate, especula y hazme una prueba».
Lo que se sabe de escribir sin pauta (terapia ocupacional, escritura infantil): el margen se va corriendo hacia el
centro línea a línea; las palabras se apelotonan al final de la línea porque no se calcula el sitio que piden; el
tamaño no se mantiene; y el ojo salta a la letra más cercana de la línea de arriba, no al principio de la
siguiente: cada línea se refiere a la anterior, no a un plan. Con poco texto se ve entero y se planta de una vez.
`writer.blockDrift` (al final de `plan`; solo spray, sin autoencajar, sin negativos; `p.deriva` 0..1, deslizador
«Deriva del texto largo», 50):
- carga λ = (1 − e^(−(N − 12)/45)) · 2·deriva (N letras: hasta 12 no pasa nada; 30 → 0,33; 60 → 0,66; 170 → 0,97);
- cada línea: error propio e(u) = pendiente·(u − ½) + comba·4u(1−u) + ruido lento (más, con muchas letras);
  pendiente = vicio de la mano − g·(lo torcido que va el bloque) + azar (g: cuánto corrige, 0,45–0,85);
  desplazamiento D_l(u) = c·D_(l−1)(u) + λ·e_l(u) (c: cuánto copia a la de arriba, 0,55–0,85);
  tamaño s = S_l·(1 − κ_l·h(u)): h vale 0 hasta media línea y sube a 1 al final (κ mayor si la línea es larga); si
  la línea anterior acabó apretada, la siguiente empieza más pequeña (S); el margen se corre y se corrige a medias;
- las líneas se miden sobre los trazos ya colocados en el documento (la base, donde apoyan las letras) y todo se
  aplica como deformación suave de los puntos (el ancho se integra para que las letras encogidas no se pisen).
Prueba: `tests/node/letras/drift.js` (6, 18, 54 y 168 letras; con y sin deriva; dos tiradas).
Sin hacer: que el texto se parta de otra manera al quedarse sin sitio (palabra que baja o se corta), líneas que
esquivan los chorretones y astas de la de arriba, límite duro contra el borde de la forma.

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
python3 tools/build.py              # dist/plugin y dist/A_mano_v2.31.0.ccx
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

---

## 6. A mano AE (After Effects, animado) — 0.1.0, 12 nov 2026

Pedido: «lo mismo pero para After Effects, y las quiero animadas. Al añadirlo me das un clip de unos 3 segundos con
dos marcadores, uno de entrada y otro de salida: desde el principio del clip hasta el marcador de entrada la letra
se dibuja; desde el segundo marcador hasta la salida se desdibuja, se borra desde detrás; entre los dos se mantiene.
Prefiero que quede muchísimo más realista y que no sea tan fácilmente editable.»

Decisiones:
- **Panel CEP** (HTML + ExtendScript), no UXP: en noviembre de 2026 UXP para After Effects está en beta pública
  (AE 27 beta); CEP es lo que cargan las versiones publicadas. Sin firmar: se instala copiando la carpeta y
  activando `PlayerDebugMode` (lo hacen los instaladores). El motor es el mismo; pasar a UXP será cambiar el puente.
- **Realista, no editable**: nada de capas de forma. El motor de tinta pinta la escritura fotograma a fotograma y
  el clip es una **secuencia PNG con alfa**. La capa lleva reasignación de tiempo con una expresión que lee sus
  marcadores: mover «entrada»/«salida» o recortar el clip retima la animación sin regenerar.
- Solo GENERAR (CALCAR depende de las capas de texto de Photoshop). 5 formas (sin «Selección»); la forma no es
  una capa: el texto va al centro de la composición o al rectángulo del sólido / capa de forma seleccionados.

Cómo está hecho:
- `js/anim.js`: `order` (palabra a palabra; el subrayado tras su palabra; la caja de un negativo donde va su
  palabra), `timeline` (cada trazo dura según su recorrido y su curvatura —ley de los dos tercios—, arranca y
  frena; pausas al levantar, ir por el aire y cambiar de palabra; el relleno de un negativo va ×3,6 de rápido) y
  `build` → generador de fotogramas: pinta cada trazo con `WR.paint` en el lienzo de pigmento; un fotograma a
  mitad de trazo = lo de antes + el trazo nuevo hasta donde llega la punta (cada píxel pertenece al punto más
  cercano del recorrido). Fotogramas 0…NW escritura; NW+1…NW+NE borrado «por donde empezó» (cada píxel se va
  cuando pasa el último trazo que lo pintó; las pasadas de repaso se van con la primera y se quitan los tiempos
  muertos). Con borrado «marcha atrás» no hay fotogramas de borrado: la expresión recorre la escritura al revés.
- `js/png.js`: PNG en memoria (zlib de node; sin zlib, sin comprimir).
- `js/aemain.js` + `ae/index.html` + `ae/extra.css`: el panel (mismos controles; sección ANIMACIÓN: clip, se
  escribe en, se borra en, tipo de borrado; Avanzado: modo de fusión y resolución 100–200 %).
- `ae/host.jsx` (ExtendScript, ES3): `amano_info`, `amano_place` (importa la secuencia, crea o sustituye la capa,
  marcadores, expresión, posición, comentario `A mano|{json}` con texto, semilla y ajustes), `amano_used`.
- `writer.js`: cada trazo del plan lleva ahora `sk` (trazo de la letra) y `pass` (pasada); no cambia el pintado.
- `tools/build_ae.py` → `dist_ae/A_mano_AE_vX.Y.Z.zip` (carpeta `com.amano.ae`, instaladores Mac/Windows, LEEME).
  Versión en `ae/VERSION`.
- Pruebas: `node tests/ae/harness.js` (panel real en Chromium + After Effects simulado `tests/ae/aesim.js`,
  19 comprobaciones; evalúa también la expresión). Vídeo de muestra: `dist_ae/a_mano_ae_prueba.mp4`.

Pendiente / dudas:
1. **Sin probar en After Effects real.** Lo más incierto: que el panel cargue (manifiesto CEP, modo depuración),
   la importación de la secuencia por script y la expresión de la reasignación de tiempo.
2. «Se borra desde detrás» se ha entendido como «por donde empezó» (opción por defecto); «marcha atrás» es la otra.
3. Los puntos y tildes se escriben con su letra, no al acabar la palabra.
4. Cada «Escribir» guarda una secuencia nueva (5–12 MB); «Vaciar fotogramas sin usar» borra las viejas.
5. Ideas siguientes: línea viva (3–4 variaciones en bucle), usar una máscara o capa de forma girada como forma.

### AE 0.2.0 — el tempo de una mano y la punta que apoya
Probada la 0.1.0 en After Effects real: carga y pinta («no está nada mal, lo principal lo has conseguido»).
Pedido: «la forma en la que se escribe no parece hecha a mano: hay partes que van muy rápido y partes muy lento;
las letras van más o menos todas al mismo ritmo» y «las letras se van formando desde una línea con un corte recto:
el inicio tiene que parecerse a un punto, texturizado, donde se apoya la herramienta».
Lo que se sabe de la escritura (cinemática): se escribe a golpes con velocidad en campana, unos 5 por segundo
(los más rápidos duran ~0,1 s); **isocronía**: la velocidad se ajusta al tamaño y la duración casi no cambia;
**homotecia**: las proporciones de tiempo entre letras se mantienen; las pausas de ejecución entre letras rondan
los 100–150 ms y la mano sigue moviéndose en el aire.
- `anim.timeline` ya no mide distancia: **cuenta golpes**. `beats` corta cada trazo donde la mano cambia de
  sentido en vertical o dobla una esquina; cada golpe dura τ·(largo/típico)^0,3 (entre 0,4 y 2,4 τ) con perfil en
  campana que no llega a pararse (`bell`). Pausas en golpes: mismo gesto 0; levantar dentro de la letra ~0,4;
  otra letra ~0,55; otra palabra ~1,05 (más un poco según lo lejos, con raíz). Las pasadas de repaso van a 0,42
  y el garabato de un negativo a 0,3 (constantes en `BEAT`). Sin importancias, cada letra tarda casi lo mismo.
- `anim.arrival`: la punta es un disco del ancho del trazo que avanza por el centro; cada píxel aparece cuando el
  disco lo toca (frente redondo; el trazo nace como un punto que crece). Un grano fijo al papel descoloca el
  frente (más con herramientas secas o con grano) y, en tintas transparentes, la zona de apoyo va un pelo más
  cargada. Ya no hay trozos sueltos por delante de la punta. El borrado usa la misma llegada.
Fuentes: Pagliarini et al. 2017 (Scientific Reports, isocronía y homotecia), Teulings (espectro ~5 Hz, golpes de
0,1 s), Plamondon (teoría cinemática, campana asimétrica), Frontiers Psychol. 2022 (pausas de ejecución).
