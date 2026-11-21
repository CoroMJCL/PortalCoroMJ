// ═══════════════════════════════════════════════════════════════
//  CURSO DE UKELELE LITÚRGICO — contenido (notación latina: Do, Re, Mi…)
//  Afinación estándar (de la 4ª a la 1ª cuerda): Sol – Do – Mi – La
//  frets: traste por cuerda (4ª→1ª). 0 = al aire.
//  fingers: dedo de la mano izquierda (1 índice, 2 medio, 3 anular, 4 meñique).
//  Acordes: clave interna (C, Am, G7…) que se muestra siempre en latino.
// ═══════════════════════════════════════════════════════════════

export const OPEN_MIDI = [67, 60, 64, 69]; // Sol4 Do4 Mi4 La4 (afinación re-entrante)
export const CUERDAS = [
  { n: 4, es: "Sol", desc: "la más cercana a tu cara" },
  { n: 3, es: "Do", desc: "la más grave" },
  { n: 2, es: "Mi", desc: "" },
  { n: 1, es: "La", desc: "la más cercana al suelo" },
];

export const CHORDS = {
  C: { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], tip: "¡Un solo dedo! El anular en el 3er traste de la 1ª cuerda." },
  Am: { frets: [2, 0, 0, 0], fingers: [2, 0, 0, 0], tip: "Un solo dedo: el medio en el 2º traste de la 4ª cuerda." },
  F: { frets: [2, 0, 1, 0], fingers: [2, 0, 1, 0], tip: "Lam más el índice en la 2ª cuerda. Dos dedos en diagonal." },
  G: { frets: [0, 2, 3, 2], fingers: [0, 1, 3, 2], tip: "Un pequeño triángulo. Es el acorde que más cuesta al principio: ve lento." },
  G7: { frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3], tip: "Un triángulo “al revés” que Sol. Lleva naturalmente a Do." },
  C7: { frets: [0, 0, 0, 1], fingers: [0, 0, 0, 1], tip: "Índice en el 1er traste de la 1ª cuerda. Anuncia que viene Fa." },
  Em: { frets: [0, 4, 3, 2], fingers: [0, 3, 2, 1], tip: "Tres dedos en escalera: índice, medio y anular." },
  Em7: { frets: [0, 2, 0, 2], fingers: [0, 1, 0, 2], tip: "Más fácil que Mim y con un color suave." },
  Dm: { frets: [2, 2, 1, 0], fingers: [2, 3, 1, 0], tip: "Fa con un dedo más en la 3ª cuerda. Suena recogido." },
  D: { frets: [2, 2, 2, 0], fingers: [1, 2, 3, 0], tip: "Tres dedos en fila en el 2º traste. Si no caben, usa un solo dedo plano." },
  D7: { frets: [2, 0, 2, 0], fingers: [1, 0, 2, 0], tip: "Dos dedos en el 2º traste. Lleva a Sol." },
  A: { frets: [2, 1, 0, 0], fingers: [2, 1, 0, 0], tip: "Dos dedos: el índice en la 3ª cuerda y el medio en la 4ª." },
  A7: { frets: [0, 1, 0, 0], fingers: [0, 1, 0, 0], tip: "¡Un solo dedo! Lleva a Re o a Rem." },
  E7: { frets: [1, 2, 0, 2], fingers: [1, 2, 0, 3], tip: "Tres dedos. Lleva con fuerza a Lam." },
  Am7: { frets: [0, 0, 0, 0], fingers: [0, 0, 0, 0], tip: "Todas las cuerdas al aire. Sonido abierto y luminoso." },
  Cmaj7: { frets: [0, 0, 0, 2], fingers: [0, 0, 0, 2], tip: "Do con un color dulce; precioso en comuniones." },
  Gm: { frets: [0, 2, 3, 1], fingers: [0, 2, 3, 1], tip: "Como Sol, pero el índice baja al 1er traste." },
  "F#m": { frets: [2, 1, 2, 0], fingers: [2, 1, 3, 0], tip: "Tres dedos; se usa en el tono de La." },
  Bb: { frets: [3, 2, 1, 1], fingers: [3, 2, 1, 1], barre: { fret: 1, from: 2, to: 1 }, tip: "Tu primera cejilla: el índice aplana las cuerdas 2ª y 1ª en el 1er traste." },
  Bm: { frets: [4, 2, 2, 2], fingers: [3, 1, 1, 1], barre: { fret: 2, from: 3, to: 1 }, tip: "Cejilla de índice en el 2º traste (3 cuerdas) y anular en la 4ª." },
};

export const NIVEL_ACORDES = {
  basico: ["C", "Am", "F", "G", "G7", "C7", "Am7"],
  intermedio: ["Em", "Em7", "Dm", "D", "D7", "A", "A7", "E7", "Cmaj7"],
  acompanamiento: ["Bb", "Bm", "Gm", "F#m"],
};

const C8 = ["1", "y", "2", "y", "3", "y", "4", "y"];

export const NIVELES = [
  // ───────────────────────────── BÁSICO ─────────────────────────────
  {
    id: "basico",
    nombre: "Básico",
    lema: "Tus primeros cantos",
    color: "#2f6fb5",
    descripcion: "El ukelele es el instrumento más amable para empezar: cuatro cuerdas suaves y acordes de uno o dos dedos. En 3 semanas acompañarás cantos sencillos.",
    duracion: "3 semanas · 15 min diarios",
    modulos: [
      {
        id: "u1",
        titulo: "Conoce tu ukelele",
        resumen: "Partes, las cuatro cuerdas Sol – Do – Mi – La, afinación con audio y postura.",
        bloques: [
          { t: "p", x: "El ukelele tiene tres zonas: la **caja** (donde nace el sonido), el **mástil** con sus trastes (donde la mano izquierda arma los acordes) y la **cabeza** con las clavijas (donde se afina). Es pequeño y liviano: se toca sentado o de pie." },
          { t: "h", x: "Las cuatro cuerdas" },
          { t: "p", x: "Sosteniéndolo para tocar, de arriba (cerca de tu cara) hacia abajo, las cuerdas son **Sol – Do – Mi – La**. Se numeran al revés: la de abajo es la **1ª (La)** y la de arriba la **4ª (Sol)**." },
          { t: "tip", x: "Una curiosidad: la 4ª cuerda (Sol) suena **más aguda** que la 3ª (Do). Por eso el ukelele tiene ese sonido tan brillante y alegre." },
          { t: "tip", x: "Para recordar el orden, canta: “**Sol – Do – Mi – La**, mi ukelele ya está”. Cuanto más tonta la frase, mejor se queda." },
          { t: "h", x: "Afina con el audio" },
          { t: "p", x: "Toca cada nota de referencia y gira la clavija hasta que tu cuerda suene igual. Si tu cuerda suena **más grave**, apriétala; si suena **más aguda**, suéltala un poco. Siempre afina subiendo hacia la nota." },
          { t: "tuning" },
          {
            t: "postura",
            cards: [
              { titulo: "Sostenerlo sin apretar", hacer: "Apoya el ukelele contra tu pecho con el antebrazo derecho, que lo sujeta suavemente. El mástil apunta un poco hacia arriba.", error: "Sostenerlo con la mano izquierda: así no puedes mover los dedos libremente.", corrige: "La mano izquierda solo arma los acordes. El peso lo sostienen el pecho y el antebrazo derecho." },
              { titulo: "Mano izquierda: dedos curvados", hacer: "El pulgar descansa detrás del mástil. Los dedos presionan con la **punta**, curvados, justo detrás del traste.", error: "Dedos planos que apagan las cuerdas vecinas.", corrige: "Arquea cada dedo como si sostuvieras una pelota pequeña." },
              { titulo: "Mano derecha: el índice", hacer: "Rasguea con la uña del **índice** hacia abajo y con la yema hacia arriba, sobre la unión del mástil con la caja (no sobre el agujero).", error: "Rasguear con toda la mano o con el brazo rígido.", corrige: "El movimiento sale de la muñeca, suelta, como sacudiendo gotas de agua." },
            ],
          },
          { t: "checklist", items: ["Sé el nombre de las cuatro cuerdas", "Puedo afinar con el audio de referencia", "Sostengo el ukelele sin usar la mano izquierda"] },
        ],
      },
      {
        id: "u2",
        titulo: "Primeros acordes: Do, Lam y Fa",
        resumen: "Tres acordes de uno y dos dedos con los que ya puedes acompañar.",
        bloques: [
          { t: "p", x: "El diagrama se lee así: las **líneas verticales son las cuerdas** (la 4ª, Sol, a la izquierda) y las horizontales son los trastes. Los **círculos** indican dónde poner los dedos, con el número del dedo (1 índice, 2 medio, 3 anular, 4 meñique). Una **O** arriba significa cuerda al aire." },
          { t: "chords", names: ["C", "Am", "F"] },
          { t: "h", x: "Cómo practicarlos" },
          { t: "ul", items: ["Arma el acorde, **toca cada cuerda una a una** y escucha que todas suenen limpias.", "Si alguna suena apagada, revisa que ningún dedo la esté rozando.", "Luego rasguea suave hacia abajo, una vez por pulso.", "Entre **Lam y Fa** el dedo medio no se mueve: es tu “dedo guía”."] },
          { t: "prog", chords: ["C", "Am", "F", "C"], patron: "cuatro", bpm: 66, label: "Do – Lam – Fa – Do: cuatro golpes hacia abajo por acorde" },
          { t: "checklist", items: ["Do suena limpio", "Lam y Fa suenan limpios", "Cambio de Lam a Fa sin levantar el dedo medio"] },
        ],
      },
      {
        id: "u3",
        titulo: "Sol y Sol7: la familia completa",
        resumen: "Con Do, Lam, Fa y Sol se acompañan cientos de cantos.",
        bloques: [
          { t: "p", x: "**Sol** es el acorde que más cuesta al principio porque usa tres dedos. Pero vale la pena: junto a Do, Lam y Fa forma la familia de acordes más usada en los cantos de la misa." },
          { t: "chords", names: ["G", "G7", "C7"] },
          { t: "tip", x: "Si Sol te cuesta mucho, usa **Sol7** mientras tanto: tiene la misma función (llevar a Do) y es más cómodo." },
          { t: "prog", chords: ["C", "G", "Am", "F"], patron: "cuatro", bpm: 66, label: "Do – Sol – Lam – Fa: la progresión de los cantos actuales" },
          { t: "prog", chords: ["C", "F", "G7", "C"], patron: "cuatro", bpm: 66, label: "Do – Fa – Sol7 – Do: la base de los cantos tradicionales" },
          { t: "ensayo", titulo: "Ensayo guiado · Cambios de acorde (8 min)", pasos: [{ t: "Manos sueltas", min: 1, txt: "Abre y cierra las manos; afina tu ukelele.", bpm: 0 }, { t: "Do ↔ Lam", min: 2, txt: "Un acorde cada 4 pulsos. Busca soltar y poner los dedos a la vez.", bpm: 60 }, { t: "Fa ↔ Sol", min: 2, txt: "El cambio más difícil. Muy lento: precisión antes que velocidad.", bpm: 50 }, { t: "Do – Sol – Lam – Fa", min: 3, txt: "La progresión completa. Si fallas, sigue el pulso y entra en el siguiente acorde.", bpm: 60 }] },
          { t: "checklist", items: ["Sol suena limpio", "Cambio de Fa a Sol en menos de 3 segundos", "Toco Do – Sol – Lam – Fa con el audio"] },
        ],
      },
      {
        id: "u4",
        titulo: "Tu primer rasgueo",
        resumen: "Abajo y arriba con el pulso: el rasgueo que sirve para casi todo.",
        bloques: [
          { t: "p", x: "Rasguear es mover la mano como un péndulo **constante**: baja en cada pulso y sube entre pulsos. El truco es que la mano **nunca se detiene**: a veces toca las cuerdas y a veces pasa “en el aire”." },
          { t: "rasgueo", pattern: "D-D-D-D-", conteo: C8, chord: "C", label: "Paso 1: cuatro golpes hacia abajo (1 – 2 – 3 – 4)" },
          { t: "rasgueo", pattern: "DUDUDUDU", conteo: C8, chord: "C", label: "Paso 2: abajo y arriba (“1 y 2 y 3 y 4 y”)" },
          { t: "rasgueo", pattern: "D-DU-UDU", conteo: C8, chord: "C", label: "Paso 3: el rasgueo universal (abajo, abajo-arriba, arriba-abajo-arriba)" },
          { t: "warn", x: "En el rasgueo universal, en el pulso 3 la mano **baja sin tocar**. No te detengas: sigue el movimiento en el aire y vuelve a tocar subiendo." },
          { t: "h", x: "Ahora con acordes" },
          { t: "prog", chords: ["C", "G", "Am", "F"], patron: "universal", bpm: 72, label: "Do – Sol – Lam – Fa con rasgueo universal" },
          { t: "checklist", items: ["Mantengo la mano en movimiento constante", "Toco el rasgueo universal 4 compases sin parar", "Cambio de acorde sin perder el ritmo"] },
        ],
      },
    ],
  },
  // ─────────────────────────── INTERMEDIO ───────────────────────────
  {
    id: "intermedio",
    nombre: "Intermedio",
    lema: "Más tonos, más cantos",
    color: "#b8892b",
    descripcion: "Nuevos tonos para adaptarte a las voces del coro, los acordes menores y de séptima, y un rasgueo distinto para cada momento de la misa.",
    duracion: "4 semanas · 20 min diarios",
    modulos: [
      {
        id: "u5",
        titulo: "El tono de Sol",
        resumen: "Mim, Re y Re7: los acordes para cantar en Sol, muy cómodo para las voces.",
        bloques: [
          { t: "p", x: "Muchos cantos litúrgicos están en **Sol**. Sus acordes principales son **Sol, Do, Re (o Re7) y Mim**. Ya conoces dos: solo te faltan los otros." },
          { t: "chords", names: ["Em", "Em7", "D", "D7"] },
          { t: "prog", chords: ["G", "C", "D7", "G"], patron: "universal", bpm: 72, label: "Sol – Do – Re7 – Sol" },
          { t: "prog", chords: ["G", "D", "Em", "C"], patron: "universal", bpm: 72, label: "Sol – Re – Mim – Do: la progresión actual en Sol" },
          { t: "tip", x: "Re con tres dedos en fila es incómodo al principio. Muchos ukelelistas lo tocan con **un solo dedo plano** (índice o medio) sobre las tres cuerdas. ¡Vale!" },
          { t: "quiz", opciones: ["C", "Am", "F", "G", "Em", "D"], label: "Desafío: ¿qué acorde muestra el diagrama?" },
          { t: "checklist", items: ["Toco Mim y Re limpios", "Toco Sol – Do – Re7 – Sol con rasgueo", "Acierto 8 acordes seguidos en el desafío"] },
        ],
      },
      {
        id: "u6",
        titulo: "Menores y séptimas",
        resumen: "Rem, La, La7 y Mi7: acordes para Cuaresma, perdón y los tonos menores.",
        bloques: [
          { t: "p", x: "Los acordes **menores** suenan más recogidos, ideales para cantos penitenciales. Los de **séptima** crean una tensión que pide resolverse: Mi7 empuja hacia Lam, La7 hacia Re, Re7 hacia Sol." },
          { t: "chords", names: ["Dm", "E7", "A", "A7"] },
          { t: "prog", chords: ["Am", "Dm", "E7", "Am"], patron: "cuatro", bpm: 60, label: "Lam – Rem – Mi7 – Lam: el tono menor" },
          { t: "prog", chords: ["Am", "F", "C", "G"], patron: "universal", bpm: 70, label: "Lam – Fa – Do – Sol: menor pero con esperanza" },
          { t: "chords", names: ["Am7", "Cmaj7"] },
          { t: "tip", x: "**Lam7** (todas al aire) y **Domaj7** son acordes “de color”. Cambia Lam por Lam7 o Do por Domaj7 en una comunión y escucha cómo se vuelve más íntima." },
          { t: "checklist", items: ["Toco Rem y Mi7 limpios", "Siento cómo Mi7 resuelve en Lam", "Uso Lam7 o Domaj7 como color"] },
        ],
      },
      {
        id: "u7",
        titulo: "Rasgueos para la misa",
        resumen: "Vals, marcha y punteo: un ritmo para cada momento de la celebración.",
        bloques: [
          { t: "p", x: "El mismo canto cambia de carácter según el rasgueo. Estos son los que más usarás en la liturgia." },
          { t: "h", x: "Vals (3/4): cantos marianos" },
          { t: "rasgueo", pattern: "D-DUDU", conteo: ["1", "", "2", "y", "3", "y"], chord: "G", label: "Vals: “UN – dos y – tres y”", pasos: 6 },
          { t: "prog", chords: ["G", "C", "D7", "G"], patron: "vals", bpm: 96, label: "Sol – Do – Re7 – Sol en vals" },
          { t: "h", x: "Marcha: entradas y salidas alegres" },
          { t: "rasgueo", pattern: "D-DUD-DU", conteo: C8, chord: "C", label: "Marcha: firme, con acento en el 1 y el 3" },
          { t: "prog", chords: ["C", "F", "G7", "C"], patron: "marcha", bpm: 100, label: "Do – Fa – Sol7 – Do en marcha" },
          { t: "h", x: "Punteo (arpegio): comunión y oración" },
          { t: "p", x: "En vez de rasguear, pulsa las cuerdas una a una: **pulgar** en la 4ª y 3ª, **índice** en la 2ª, **medio** en la 1ª. Suena íntimo y deja espacio a las voces." },
          { t: "prog", chords: ["C", "Am", "F", "G"], patron: "arpegio", bpm: 66, label: "Punteo sobre Do – Lam – Fa – Sol" },
          { t: "warn", x: "El ukelele nunca debe tapar a las voces. En momentos de recogimiento, rasguea más suave o usa el punteo." },
          { t: "ensayo", titulo: "Ensayo guiado · Rasgueos (10 min)", pasos: [{ t: "Universal", min: 2, txt: "Do – Sol – Lam – Fa con el rasgueo universal.", bpm: 72 }, { t: "Vals", min: 3, txt: "Sol – Do – Re7 – Sol. Acento solo en el primer tiempo.", bpm: 84 }, { t: "Marcha", min: 2, txt: "Do – Fa – Sol7 – Do con energía, sin golpear.", bpm: 92 }, { t: "Punteo", min: 3, txt: "Do – Lam – Fa – Sol, cuerda por cuerda, muy suave.", bpm: 60 }] },
          { t: "checklist", items: ["Toco un vals sin perder el “UN – dos – tres”", "Toco la marcha con firmeza", "Hago un punteo suave"] },
        ],
      },
    ],
  },
  // ───────────────────────── ACOMPAÑAMIENTO ─────────────────────────
  {
    id: "acompanamiento",
    nombre: "Acompañamiento",
    lema: "Al servicio del coro",
    color: "#9a3b2e",
    descripcion: "Tus primeras cejillas para poder tocar en cualquier tono, y todo lo necesario para acompañar al coro con seguridad en la misa.",
    duracion: "3 semanas · 20 min diarios",
    modulos: [
      {
        id: "u8",
        titulo: "Primeras cejillas",
        resumen: "Sib, Sim y Solm: los acordes que abren los tonos de Fa y Re.",
        bloques: [
          { t: "p", x: "En la **cejilla** el dedo índice se acuesta sobre varias cuerdas a la vez. En el ukelele son mucho más fáciles que en la guitarra porque las cuerdas son suaves y pocas." },
          { t: "chords", names: ["Bb", "Bm", "Gm"] },
          { t: "ul", items: ["Apoya el índice **de lado** (la parte más huesuda), no con la yema plana.", "Ponlo justo detrás del traste y deja que el peso del brazo haga la fuerza.", "Toca cuerda por cuerda: si alguna no suena, mueve el índice un milímetro."] },
          { t: "prog", chords: ["F", "Dm", "Bb", "C7"], patron: "universal", bpm: 70, label: "Fa – Rem – Sib – Do7: el tono de Fa" },
          { t: "prog", chords: ["D", "Bm", "G", "A7"], patron: "universal", bpm: 70, label: "Re – Sim – Sol – La7: el tono de Re" },
          { t: "checklist", items: ["Sib suena limpio", "Sim suena limpio", "Toco el tono de Fa completo"] },
        ],
      },
      {
        id: "u9",
        titulo: "Acompañar al coro",
        resumen: "Dar el tono, introducciones, leer cantos con acordes y cambiar de tono.",
        bloques: [
          { t: "p", x: "El ukelele en la misa sostiene el ritmo y el ánimo del coro. Estas herramientas te harán un acompañante confiable." },
          { t: "h", x: "1. Dar el tono" },
          { t: "p", x: "Antes de empezar, rasguea **una vez el acorde del tono** del canto (por ejemplo Do) para que el coro escuche dónde parte." },
          { t: "h", x: "2. La introducción" },
          { t: "p", x: "Toca **los últimos dos compases del canto** o la progresión del tono (Do – Fa – Sol7 – Do) con el rasgueo que usarás. Mira al director para entrar juntos." },
          { t: "prog", chords: ["C", "F", "G7", "C"], patron: "universal", bpm: 72, label: "Introducción tipo: Do – Fa – Sol7 – Do" },
          { t: "h", x: "3. Leer un canto con acordes" },
          { t: "p", x: "En los cantorales los acordes van **sobre la sílaba** donde cambian. Cambia justo en esa sílaba y mantén el rasgueo hasta el siguiente acorde. Toca los acordes del ejemplo:" },
          { t: "cifrado", lineas: ["[C]Santo, santo, [F]santo es el [G]Señor,", "[Am]Dios del uni[F]verso, [G7]llenos están el [C]cielo y la tierra"] },
          { t: "h", x: "4. Cambiar de tono" },
          { t: "p", x: "Si un canto queda muy agudo o grave para el coro, cámbialo de tono: todos los acordes se mueven juntos. Elige un tono y mira cómo cambian las formas:" },
          { t: "transponer" },
          { t: "h", x: "5. Servir al canto" },
          { t: "ul", items: ["Mira al director en las entradas y en el final.", "Para terminar, frena poco a poco (**ritardando**) y deja sonar un último acorde.", "Si el coro se adelanta o se atrasa, síguelo: el acompañante se adapta.", "Si no escuchas las voces, estás tocando muy fuerte."] },
          { t: "checklist", items: ["Doy el tono antes de un canto", "Hago una introducción de 4 compases", "Leo un canto con acordes", "Toco una misma progresión en dos tonos"] },
        ],
      },
    ],
  },
];

// Progresión I – vi – IV – V7 en los tonos cómodos para ukelele
export const TONOS = [
  { t: "Do", chords: ["C", "Am", "F", "G7"] },
  { t: "Re", chords: ["D", "Bm", "G", "A7"] },
  { t: "Fa", chords: ["F", "Dm", "Bb", "C7"] },
  { t: "Sol", chords: ["G", "Em", "C", "D7"] },
  { t: "La", chords: ["A", "F#m", "D", "E7"] },
];
