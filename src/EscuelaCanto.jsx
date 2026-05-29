import { useState, useRef, useEffect } from "react";

// ══════════════════════════════════════════════════════════════
//  ESCUELA DE CANTO — Módulo para cantantes litúrgicos
//  Acceso: Invitado (pantalla completa) + Integrantes (menú lateral)
// ══════════════════════════════════════════════════════════════

// ── Paleta y tokens visuales propios del módulo ──────────────
const EC = {
  bg:         "#f7f5f2",
  card:       "#ffffff",
  primary:    "#1e3a5f",
  primaryDk:  "#152d4a",
  gold:       "#c8971a",
  goldLight:  "#fdf6e3",
  blue:       "#0071e3",
  blueLight:  "#e8f1fc",
  purple:     "#7c3aed",
  purpleLight:"#f3eeff",
  red:        "#d03030",
  redLight:   "#ffeaea",
  dark:       "#1c1c1e",
  gray:       "#8e8e93",
  border:     "rgba(60,60,67,0.12)",
  shadow:     "0 2px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
};

// ── Datos de las partes de la misa ───────────────────────────
const PARTES_MISA = [
  {
    id: "entrada",
    nombre: "Canto de Entrada",
    emoji: "🚶",
    color: "#1e3a5f",
    colorLight: "#eef2f9",
    tiempo: "Procesión de entrada",
    descripcion: "El canto de entrada acompaña la procesión del sacerdote y ministros desde la sacristía al altar. Su función es abrir la celebración, congregar al pueblo y preparar los corazones para encontrarse con Dios.",
    proposito: "Unir a la asamblea, crear ambiente de oración y manifestar la fe de la comunidad reunida.",
    caracteristicas: [
      "Debe ser conocido por toda la asamblea para que todos puedan participar.",
      "Ritmo procesional: ni muy lento ni muy rápido.",
      "Texto relacionado con el tiempo litúrgico o la fiesta del día.",
      "Se canta mientras el sacerdote y ministros llegan al altar.",
    ],
    ejemplos: ["Juntos como hermanos", "Pueblo de reyes", "Venid y vamos todos"],
    duracion: "El tiempo que dura la procesión (~2–3 min)",
  },
  {
    id: "kyrie",
    nombre: "Kyrie (Señor, ten piedad)",
    emoji: "🙏",
    color: "#7c3aed",
    colorLight: "#f3eeff",
    tiempo: "Acto penitencial",
    descripcion: "El Kyrie es una súplica al Señor pidiendo su misericordia. Proviene del griego Kyrie Eleison (Señor, ten piedad). Es uno de los cantos más antiguos de la liturgia cristiana, conservado en griego como recuerdo de los primeros tiempos de la Iglesia.",
    proposito: "Reconocer ante Dios nuestra condición de pecadores y pedir su perdón y misericordia.",
    caracteristicas: [
      "Se canta en forma de diálogo: el cantor entona y la asamblea responde.",
      "Estructura tripartita: Kyrie – Christe – Kyrie (o sus equivalentes en español).",
      "Tono de humildad y petición, no de tristeza paralizante.",
      "Puede omitirse si el acto penitencial tiene otra forma.",
    ],
    ejemplos: ["Kyrie de la Misa de Ángeles", "Señor, ten piedad (gregoriano)"],
    duracion: "Aprox. 1–2 min",
  },
  {
    id: "gloria",
    nombre: "Gloria",
    emoji: "✨",
    color: "#c8971a",
    colorLight: "#fdf6e3",
    tiempo: "Rito de entrada (domingos y fiestas)",
    descripcion: "El Gloria es un himno de alabanza a la Trinidad: primero al Padre, luego al Hijo y una conclusión trinitaria. Es uno de los himnos más solemnes de la misa. Se omite en el Adviento, la Cuaresma y las misas de difuntos.",
    proposito: "Glorificar a Dios Padre y a Jesucristo por su grandeza, su amor y su obra salvadora.",
    caracteristicas: [
      "Solo se canta en domingos (fuera de Adviento y Cuaresma) y en solemnidades y fiestas.",
      "Su carácter es jubiloso y festivo.",
      "Toda la asamblea debe poder cantarlo o responder.",
      "Comienza siempre con las palabras del canto de los ángeles en Belén (Lc 2,14).",
    ],
    ejemplos: ["Gloria de Misa Criolla", "Gloria in excelsis Deo (gregoriano)", "Gloria festivo"],
    duracion: "Aprox. 2–3 min",
  },
  {
    id: "salmo",
    nombre: "Salmo Responsorial",
    emoji: "📖",
    color: "#0071e3",
    colorLight: "#e8f1fc",
    tiempo: "Liturgia de la Palabra",
    descripcion: "El salmo responsorial es la respuesta de la asamblea a la primera lectura. Se toma directamente del libro de los Salmos de la Biblia. El cantor o el coro entona las estrofas y la asamblea canta el estribillo (antífona) que se repite.",
    proposito: "Meditar y responder a la Palabra de Dios escuchada en la primera lectura.",
    caracteristicas: [
      "Estructura: Antífona (asamblea) – Estrofa (cantor) – Antífona – Estrofa…",
      "El texto es siempre bíblico, no se puede cambiar por otro.",
      "El cantor proclama las estrofas desde el ambón (o facistol).",
      "Debe haber un silencio breve antes de comenzar.",
    ],
    ejemplos: ["Ps 23: El Señor es mi pastor", "Ps 136: Dad gracias al Señor"],
    duracion: "Aprox. 2–3 min",
  },
  {
    id: "aleluya",
    nombre: "Aleluya / Aclamación al Evangelio",
    emoji: "🕊️",
    color: "#c8971a",
    colorLight: "#fdf6e3",
    tiempo: "Antes del Evangelio",
    descripcion: "El Aleluya es una aclamación de júbilo que prepara la proclamación del Evangelio. Significa 'alabad a Yahvé'. En Cuaresma se reemplaza por otra aclamación (ej: 'Gloria y alabanza a Ti, Señor Jesús') ya que el Aleluya expresa alegría pascual.",
    proposito: "Recibir con júbilo la Palabra de Cristo que está por proclamarse en el Evangelio.",
    caracteristicas: [
      "Siempre debe cantarse, nunca recitarse (si no se canta, se omite).",
      "La asamblea repite el Aleluya después de que el cantor lo entona.",
      "El versículo del medio lo canta solo el cantor o el coro.",
      "En Cuaresma: se sustituye por aclamaciones apropiadas al tiempo.",
    ],
    ejemplos: ["Aleluya simple (gregoriano)", "Aleluya festivo", "Honor y gloria a Ti, Señor (Cuaresma)"],
    duracion: "Aprox. 1 min",
  },
  {
    id: "ofertorio",
    nombre: "Canto del Ofertorio",
    emoji: "🎁",
    color: "#1e3a5f",
    colorLight: "#eef2f9",
    tiempo: "Liturgia Eucarística",
    descripcion: "El canto del ofertorio acompaña la preparación de los dones: pan y vino que serán consagrados. Mientras los fieles llevan las ofrendas y el sacerdote prepara el altar, el coro canta para unir espiritualmente este momento.",
    proposito: "Acompañar la presentación de los dones y disponernos para la acción eucarística.",
    caracteristicas: [
      "Texto que hable de la ofrenda, el sacrificio o la entrega a Dios.",
      "Duración variable: termina cuando el sacerdote concluye la preparación.",
      "Puede ser cantado solo por el coro (no necesita respuesta de la asamblea).",
      "Carácter contemplativo o de preparación.",
    ],
    ejemplos: ["Toma, Señor, y recibe", "Pan de vida", "Acepta Señor"],
    duracion: "Variable, ~3–5 min",
  },
  {
    id: "santo",
    nombre: "Santo (Sanctus)",
    emoji: "🌟",
    color: "#c8971a",
    colorLight: "#fdf6e3",
    tiempo: "Plegaria Eucarística",
    descripcion: "El Santo es la gran aclamación de la asamblea en el corazón de la plegaria eucarística. Es el canto de los ángeles ante Dios (Is 6,3) unido al canto de bienvenida a Jesús en Jerusalén (Mt 21,9). Toda la asamblea sin excepción debe cantarlo.",
    proposito: "Unirse al cántico de alabanza de toda la creación ante la presencia de Dios que se hace presente en la Eucaristía.",
    caracteristicas: [
      "TODA la asamblea canta este himno, no solo el coro.",
      "No puede omitirse en ninguna circunstancia.",
      "Se divide en dos partes: 'Santo, Santo, Santo' y 'Hosanna/Bendito'.",
      "Conecta directamente con la consagración.",
    ],
    ejemplos: ["Santo de Misa popular", "Sanctus gregoriano", "Santo de Misa Criolla"],
    duracion: "Aprox. 1–2 min",
  },
  {
    id: "memorial",
    nombre: "Aclamación Memorial",
    emoji: "✝️",
    color: "#7c3aed",
    colorLight: "#f3eeff",
    tiempo: "Después de la Consagración",
    descripcion: "La aclamación memorial es cantada inmediatamente después de la consagración. El sacerdote invita: 'Este es el Misterio de la Fe' (o similar) y toda la asamblea responde aclamando el misterio de la muerte y resurrección de Cristo presente en el altar.",
    proposito: "Proclamar el misterio pascual de Cristo presente en la Eucaristía.",
    caracteristicas: [
      "Siempre después de la consagración.",
      "Toda la asamblea responde, no solo el coro.",
      "Fórmulas aprobadas: 'Anunciamos tu muerte…', 'Cada vez que comemos…', etc.",
      "Carácter de proclamación y fe.",
    ],
    ejemplos: ["Anunciamos tu muerte, Señor", "Cristo nos salvó"],
    duracion: "Aprox. 30 seg",
  },
  {
    id: "comunion",
    nombre: "Canto de Comunión",
    emoji: "🍞",
    color: "#1e3a5f",
    colorLight: "#eef2f9",
    tiempo: "Distribución de la Comunión",
    descripcion: "El canto de comunión acompaña la procesión de los fieles que se acercan a recibir el Cuerpo y Sangre de Cristo. Expresa la unidad del Cuerpo de Cristo y la alegría del encuentro con el Señor. Es uno de los momentos más importantes para el coro.",
    proposito: "Expresar y fortalecer la unión espiritual de quienes comulgan y acompañar el encuentro personal con Cristo.",
    caracteristicas: [
      "Preferiblemente conocido por toda la asamblea.",
      "Carácter contemplativo o de acción de gracias.",
      "Se puede cantar más de un canto si la comunión es larga.",
      "Texto relacionado con la Eucaristía, la unidad, el amor de Dios.",
    ],
    ejemplos: ["Pan de vida eterna", "Ven, Señor Jesús", "Alma de Cristo", "Como el padre me amó"],
    duracion: "Variable según comunión, ~5–10 min",
  },
  {
    id: "accion_gracias",
    nombre: "Canto de Acción de Gracias",
    emoji: "💛",
    color: "#c8971a",
    colorLight: "#fdf6e3",
    tiempo: "Después de la Comunión",
    descripcion: "Tras la distribución de la comunión y un momento de silencio sagrado, se puede cantar un himno de acción de gracias. El silencio después de comulgar es también muy valioso. Este canto cierra el tiempo de adoración personal.",
    proposito: "Agradecer a Dios por el don de la Eucaristía recibida.",
    caracteristicas: [
      "Puede omitirse en favor del silencio sagrado.",
      "Carácter tranquilo, de interioridad y gratitud.",
      "No debe ser un canto animado o festivo en exceso.",
      "Puede cantarlo solo el coro mientras la asamblea ora en silencio.",
    ],
    ejemplos: ["Gracias, Señor", "Te alabaré, Señor", "Magnificat"],
    duracion: "Aprox. 2–3 min",
  },
  {
    id: "salida",
    nombre: "Canto de Salida",
    emoji: "🌅",
    color: "#0071e3",
    colorLight: "#e8f1fc",
    tiempo: "Rito de conclusión",
    descripcion: "El canto de salida acompaña la procesión de salida del sacerdote y ministros. Cierra la celebración enviando a los fieles a vivir lo que han celebrado. Técnicamente el IGMR no lo exige, pero es una tradición muy arraigada.",
    proposito: "Enviar a la asamblea con alegría a vivir el Evangelio en su vida diaria.",
    caracteristicas: [
      "Carácter alegre y misionero.",
      "Puede ser más animado que otros cantos de la misa.",
      "Relacionado con el envío o la misión cristiana.",
      "Puede continuar mientras la gente sale del templo.",
    ],
    ejemplos: ["Id y enseñad", "Juntos en la misión", "Somos el pueblo que camina"],
    duracion: "Aprox. 2–3 min",
  },
];

// ── Datos ejercicios vocales ──────────────────────────────────
const EJERCICIOS = [
  {
    id: "respiracion",
    categoria: "Fundamentos",
    titulo: "Respiración Diafragmática",
    emoji: "💨",
    nivel: "Básico",
    duracion: "5 min",
    descripcion: "La base de toda buena emisión vocal. El diafragma es el músculo principal de la respiración y el soporte del sonido.",
    pasos: [
      "Colócate de pie o sentado/a con la espalda recta.",
      "Pon una mano en el pecho y otra en el abdomen.",
      "Inhala lentamente por la nariz: solo el abdomen debe subir, el pecho permanece quieto.",
      "Retén el aire 3 segundos.",
      "Exhala lentamente por la boca con un sonido 'sss' suave y continuo.",
      "Repite 8 veces. Aumenta gradualmente la duración de la exhalación.",
    ],
    tip: "Si el pecho sube antes que el abdomen, todavía estás respirando de forma clavicular. ¡Practica frente al espejo!",
    color: "#1e3a5f",
  },
  {
    id: "calentamiento",
    categoria: "Calentamiento",
    titulo: "Bocca Chiusa (Boca Cerrada)",
    emoji: "🎵",
    nivel: "Básico",
    duracion: "5 min",
    descripcion: "El zumbido con boca cerrada (bocca chiusa) calienta las cuerdas vocales suavemente, sin forzarlas.",
    pasos: [
      "Relaja la mandíbula y el cuello completamente.",
      "Con los labios cerrados (sin apretar), emite un sonido 'mmm' continuo.",
      "Siente la vibración en los labios, la nariz y los pómulos.",
      "Desliza el sonido hacia arriba y hacia abajo en tu registro (glissando).",
      "Realiza 5 glissandos ascendentes y 5 descendentes.",
      "Aumenta el rango poco a poco, sin forzar los extremos.",
    ],
    tip: "Si sientes la vibración solo en la garganta, relaja más la mandíbula y dirige el sonido hacia la 'máscara' (frente y nariz).",
    color: "#0071e3",
  },
  {
    id: "vocalizacion",
    categoria: "Técnica Vocal",
    titulo: "Vocalización con 'Mi–Ma–Mo'",
    emoji: "🎤",
    nivel: "Intermedio",
    duracion: "8 min",
    descripcion: "Este ejercicio trabaja la apertura de la boca, la colocación del sonido y la homogeneidad entre vocales.",
    pasos: [
      "Comienza en un tono cómodo (ni muy agudo ni muy grave).",
      "Canta la secuencia: Mi – Ma – Mo en una sola nota o en una escala sencilla.",
      "La 'i' coloca el sonido adelante (brillante), la 'a' lo abre, la 'o' lo redondea.",
      "Asegúrate de que el volumen sea igual en las tres vocales.",
      "Sube de semitono en semitono hasta el límite cómodo de tu registro.",
      "Baja también hacia las notas graves. Total: 10 tonos arriba, 10 abajo.",
    ],
    tip: "En la vocal 'a', cuida que la mandíbula baje y la laringe no suba. Imagina que tienes una ciruela debajo de la lengua.",
    color: "#7c3aed",
  },
  {
    id: "legato",
    categoria: "Técnica Vocal",
    titulo: "Legato con 'Aaah'",
    emoji: "🌊",
    nivel: "Intermedio",
    duracion: "7 min",
    descripcion: "El legato es la capacidad de unir notas sin interrupciones. Es fundamental para el canto litúrgico, que requiere frases largas y fluidas.",
    pasos: [
      "Toma una respiración diafragmática profunda.",
      "Emite 'Aaah' en una sola nota durante toda la exhalación.",
      "El sonido debe ser perfectamente continuo, sin ondulaciones ni cortes.",
      "Ahora canta una escala ascendente de 5 notas (Do-Re-Mi-Fa-Sol) en legato.",
      "Baja de la misma forma (Sol-Fa-Mi-Re-Do).",
      "Aumenta el rango: escalas de una octava completa.",
    ],
    tip: "Imagina que el sonido es un hilo de seda que jala suavemente desde tu boca. Si el hilo se rompe, el legato se perdió.",
    color: "#c8971a",
  },
  {
    id: "articulacion",
    categoria: "Técnica Vocal",
    titulo: "Articulación con Consonantes",
    emoji: "💬",
    nivel: "Intermedio",
    duracion: "6 min",
    descripcion: "Una buena articulación hace que el texto sea comprensible. En el canto litúrgico, la asamblea debe entender las palabras que se cantan.",
    pasos: [
      "Di en voz alta, muy lento: 'Pa – Ta – Ka – Pa – Ta – Ka' (15 veces).",
      "Ahora más rápido, manteniendo claridad: 30 seg sin parar.",
      "Canta en una sola nota: 'La-le-li-lo-lu' con claridad en cada vocal.",
      "Repite en diferentes notas de tu registro.",
      "Practica con un texto real: una estrofa de un canto, muy despacio.",
      "Grábate y escucha: ¿entiendes todas las palabras?",
    ],
    tip: "Las consonantes 'T', 'D', 'P', 'B' se forman en la parte delantera de la boca. Si las articulan desde atrás, el texto se vuelve borroso.",
    color: "#d03030",
  },
  {
    id: "afinacion",
    categoria: "Oído y Afinación",
    titulo: "Práctica de Afinación por Intervalos",
    emoji: "🎯",
    nivel: "Avanzado",
    duracion: "10 min",
    descripcion: "La afinación precisa es la marca de un buen coro. Este ejercicio desarrolla el oído interno para cantar en afinación sin depender del instrumento.",
    pasos: [
      "Con un teclado o app de piano, toca una nota y cántala.",
      "Sin el teclado, canta la misma nota desde el silencio.",
      "Verifica tocando de nuevo: ¿afinaste?",
      "Ahora practica intervalos: Do-Sol (quinta), Do-Mi (tercera mayor), Do-Fa (cuarta).",
      "Canta el primer sonido con el teclado, el segundo solo con tu voz.",
      "Aumenta la dificultad: séptimas, octavas, intervalos menores.",
    ],
    tip: "Asocia cada intervalo con una melodía conocida: la cuarta es el inicio de 'Here Comes the Bride', la quinta es 'Twinkle Twinkle'. Esto activa el oído musical de forma natural.",
    color: "#1e3a5f",
  },
];

// ── Datos Biblioteca ──────────────────────────────────────────
const BIBLIOTECA_CATS = [
  { id: "partituras", label: "Partituras", emoji: "🎼", color: "#1e3a5f", colorLight: "#eef2f9" },
  { id: "letras",     label: "Letras",     emoji: "📝", color: "#0071e3", colorLight: "#e8f1fc" },
  { id: "audios",     label: "Audios",     emoji: "🎧", color: "#c8971a", colorLight: "#fdf6e3" },
  { id: "recursos",   label: "Recursos",   emoji: "📚", color: "#7c3aed", colorLight: "#f3eeff" },
];

// ══════════════════════════════════════════════════════════════
//  SUB-COMPONENTES
// ══════════════════════════════════════════════════════════════

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      background: "rgba(118,118,128,0.10)",
      borderRadius: 12,
      padding: 3,
      marginBottom: 20,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: "8px 6px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: active === t.id ? 600 : 400,
            background: active === t.id ? "#fff" : "transparent",
            color: active === t.id ? EC.dark : EC.gray,
            boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 13 }}>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Módulo: Ejercicios Vocales ────────────────────────────────
function EjerciciosVocales() {
  const [selected, setSelected] = useState(null);
  const [catFiltro, setCatFiltro] = useState("Todos");
  const categorias = ["Todos", ...new Set(EJERCICIOS.map(e => e.categoria))];
  const lista = catFiltro === "Todos" ? EJERCICIOS : EJERCICIOS.filter(e => e.categoria === catFiltro);

  if (selected) {
    const ej = EJERCICIOS.find(e => e.id === selected);
    return (
      <div style={{ maxWidth: 640 }}>
        <button onClick={() => setSelected(null)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, color: EC.primary, fontWeight: 600,
          padding: "0 0 14px", letterSpacing: "-0.01em",
        }}>
          ← Volver
        </button>

        {/* Header ejercicio */}
        <div style={{
          background: `linear-gradient(145deg, ${ej.color}, ${ej.color}cc)`,
          borderRadius: 18, padding: "20px 20px 16px",
          marginBottom: 14, color: "white",
          boxShadow: `0 4px 20px ${ej.color}44`,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{ej.emoji}</div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            {ej.categoria} · {ej.nivel} · {ej.duracion}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {ej.titulo}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, lineHeight: 1.6 }}>
            {ej.descripcion}
          </div>
        </div>

        {/* Pasos */}
        <div style={{
          background: "white", borderRadius: 16,
          border: `1px solid ${EC.border}`,
          boxShadow: EC.shadow, marginBottom: 12, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${EC.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: EC.dark, letterSpacing: "-0.015em" }}>
              📋 Cómo hacerlo
            </div>
          </div>
          {ej.pasos.map((paso, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "12px 16px",
              borderBottom: i < ej.pasos.length - 1 ? `1px solid ${EC.border}` : "none",
              alignItems: "flex-start",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: `${ej.color}15`, color: ej.color,
                fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 13, color: EC.dark, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
                {paso}
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div style={{
          background: `${ej.color}10`,
          borderLeft: `3px solid ${ej.color}`,
          borderRadius: "0 12px 12px 0",
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ej.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            💡 Consejo del profesor
          </div>
          <div style={{ fontSize: 13, color: EC.dark, lineHeight: 1.65 }}>
            {ej.tip}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {categorias.map(cat => (
          <button key={cat} onClick={() => setCatFiltro(cat)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: catFiltro === cat ? 600 : 400,
            background: catFiltro === cat ? EC.primary : "rgba(60,60,67,0.08)",
            color: catFiltro === cat ? "white" : EC.gray,
            transition: "all 0.12s", letterSpacing: "-0.01em",
          }}>{cat}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map(ej => (
          <button key={ej.id} onClick={() => setSelected(ej.id)} style={{
            background: "white", borderRadius: 16, padding: "14px 16px",
            border: `1px solid ${EC.border}`, boxShadow: EC.shadow,
            cursor: "pointer", textAlign: "left", width: "100%",
            display: "flex", alignItems: "center", gap: 14,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.12)`}
          onMouseLeave={e => e.currentTarget.style.boxShadow = EC.shadow}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: `${ej.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>
              {ej.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: EC.dark, letterSpacing: "-0.016em" }}>
                  {ej.titulo}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: `${ej.color}15`, color: ej.color,
                }}>
                  {ej.nivel}
                </span>
              </div>
              <div style={{ fontSize: 12, color: EC.gray, letterSpacing: "-0.01em" }}>
                {ej.categoria} · {ej.duracion}
              </div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
              <path d="M1 1l5 5-5 5" stroke={EC.dark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Módulo: Partes de la Misa (didáctico) ────────────────────
function PartesLiturgia() {
  const [selected, setSelected] = useState(null);
  const parte = selected ? PARTES_MISA.find(p => p.id === selected) : null;

  if (parte) {
    return (
      <div style={{ maxWidth: 640 }}>
        <button onClick={() => setSelected(null)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, color: EC.primary, fontWeight: 600,
          padding: "0 0 14px", letterSpacing: "-0.01em",
        }}>
          ← Volver
        </button>

        {/* Hero */}
        <div style={{
          background: `linear-gradient(145deg, ${parte.color}ee, ${parte.color}aa)`,
          borderRadius: 20, padding: "20px 20px 18px",
          marginBottom: 14, color: "white",
          boxShadow: `0 6px 24px ${parte.color}44`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            {parte.tiempo}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 40 }}>{parte.emoji}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                {parte.nombre}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{parte.duracion}</div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div style={{
          background: "white", borderRadius: 16, padding: "16px",
          border: `1px solid ${EC.border}`, boxShadow: EC.shadow, marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: parte.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            ¿Qué es?
          </div>
          <div style={{ fontSize: 13.5, color: EC.dark, lineHeight: 1.7, letterSpacing: "-0.01em" }}>
            {parte.descripcion}
          </div>
        </div>

        {/* Propósito */}
        <div style={{
          background: `${parte.color}0d`,
          border: `1px solid ${parte.color}30`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: parte.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            🎯 Propósito litúrgico
          </div>
          <div style={{ fontSize: 13, color: EC.dark, lineHeight: 1.65 }}>
            {parte.proposito}
          </div>
        </div>

        {/* Características */}
        <div style={{
          background: "white", borderRadius: 16,
          border: `1px solid ${EC.border}`, boxShadow: EC.shadow,
          marginBottom: 10, overflow: "hidden",
        }}>
          <div style={{ padding: "13px 16px 10px", borderBottom: `1px solid ${EC.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: EC.dark, letterSpacing: "-0.01em" }}>
              📌 Características para el cantor
            </div>
          </div>
          {parte.caracteristicas.map((c, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "10px 16px",
              borderBottom: i < parte.caracteristicas.length - 1 ? `1px solid ${EC.border}` : "none",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: parte.color, flexShrink: 0, marginTop: 6,
              }} />
              <div style={{ fontSize: 13, color: EC.dark, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
                {c}
              </div>
            </div>
          ))}
        </div>

        {/* Ejemplos */}
        <div style={{
          background: "white", borderRadius: 14, padding: "14px 16px",
          border: `1px solid ${EC.border}`, boxShadow: EC.shadow,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: EC.dark, letterSpacing: "-0.01em", marginBottom: 10 }}>
            🎵 Ejemplos de cantos
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {parte.ejemplos.map((e, i) => (
              <span key={i} style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20,
                background: `${parte.color}12`, color: parte.color, fontWeight: 500,
              }}>
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Intro */}
      <div style={{
        background: "linear-gradient(145deg, #0f2027, #203a43, #2c5364)",
        borderRadius: 18, padding: "16px 18px", marginBottom: 18, color: "white",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
          Guía didáctica
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 6 }}>
          Las partes de la Misa para el cantor
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
          Aprende el rol del coro en cada momento de la celebración eucarística. Toca cualquier parte para ver su explicación completa.
        </div>
      </div>

      {/* Timeline / lista */}
      <div style={{ position: "relative" }}>
        {/* Línea vertical */}
        <div style={{
          position: "absolute", left: 21, top: 12, bottom: 12,
          width: 2, background: "rgba(60,60,67,0.10)", zIndex: 0,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PARTES_MISA.map((p, idx) => (
            <button key={p.id} onClick={() => setSelected(p.id)} style={{
              background: "white", borderRadius: 14,
              border: `1px solid ${EC.border}`, boxShadow: EC.shadow,
              cursor: "pointer", textAlign: "left", width: "100%",
              display: "flex", alignItems: "center", gap: 0,
              padding: 0, overflow: "hidden",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateX(2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
            >
              {/* Número de orden */}
              <div style={{
                width: 44, flexShrink: 0, alignSelf: "stretch",
                background: `${p.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 2,
                borderRight: `1px solid ${p.color}20`,
              }}>
                <span style={{ fontSize: 18 }}>{p.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: p.color }}>{idx + 1}</span>
              </div>
              <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: EC.dark, letterSpacing: "-0.016em", marginBottom: 2 }}>
                  {p.nombre}
                </div>
                <div style={{ fontSize: 11, color: EC.gray, letterSpacing: "-0.01em" }}>
                  {p.tiempo} · {p.duracion}
                </div>
              </div>
              <div style={{ padding: "0 14px", color: `${p.color}80` }}>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M1 1l5 5-5 5" stroke={p.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Módulo: Biblioteca ────────────────────────────────────────
function BibliotecaCantor({ docs = [], user }) {
  const [catActiva, setCatActiva] = useState("partituras");
  const [search, setSearch] = useState("");

  const catMap = { partituras: "Partitura", letras: "PDF", audios: "Audio", recursos: "Recurso" };
  const cat = BIBLIOTECA_CATS.find(c => c.id === catActiva);

  const lista = docs.filter(d => {
    const catMatch = (d.categoria || "").toLowerCase().includes(catMap[catActiva].toLowerCase()) ||
                     (d.categoria || "").toLowerCase() === catActiva;
    const searchMatch = !search || (d.nombre || "").toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const iconCat = (cat) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("audio") || c.includes("mp3") || c.includes("wav")) return "🎧";
    if (c.includes("pdf") || c.includes("letra")) return "📄";
    if (c.includes("partitura") || c.includes("sheet")) return "🎼";
    return "📁";
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Categorías */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {BIBLIOTECA_CATS.map(c => (
          <button key={c.id} onClick={() => setCatActiva(c.id)} style={{
            background: catActiva === c.id ? c.color : "white",
            border: `1px solid ${catActiva === c.id ? c.color : EC.border}`,
            borderRadius: 14, padding: "12px 14px",
            cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: catActiva === c.id ? `0 4px 14px ${c.color}33` : EC.shadow,
            transition: "all 0.15s ease",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: catActiva === c.id ? "rgba(255,255,255,0.2)" : c.colorLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              {c.emoji}
            </div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em",
                color: catActiva === c.id ? "white" : EC.dark,
              }}>
                {c.label}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div style={{
        background: "white", borderRadius: 12, padding: "10px 14px",
        border: `1px solid ${EC.border}`, marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 14, opacity: 0.4 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar en ${cat?.label || ""}…`}
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 14,
            color: EC.dark, background: "transparent", letterSpacing: "-0.01em",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, color: EC.gray, padding: 0,
          }}>×</button>
        )}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 16, padding: "40px 20px",
          border: `1px solid ${EC.border}`, textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{cat?.emoji}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: EC.dark, marginBottom: 4 }}>
            Sin archivos disponibles
          </div>
          <div style={{ fontSize: 12, color: EC.gray }}>
            {search ? "No hay resultados para tu búsqueda." : "El encargado publicará material próximamente."}
          </div>
        </div>
      ) : (
        <div style={{
          background: "white", borderRadius: 16,
          border: `1px solid ${EC.border}`, overflow: "hidden", boxShadow: EC.shadow,
        }}>
          {lista.map((doc, i) => (
            <a
              key={doc.id || i}
              href={doc.url || doc.archivo_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div style={{
                padding: "12px 16px",
                borderBottom: i < lista.length - 1 ? `1px solid ${EC.border}` : "none",
                display: "flex", alignItems: "center", gap: 12,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `${cat?.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {iconCat(doc.categoria)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: EC.dark,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    letterSpacing: "-0.016em",
                  }}>
                    {doc.nombre}
                  </div>
                  {doc.descripcion && (
                    <div style={{ fontSize: 11, color: EC.gray, marginTop: 1 }}>
                      {doc.descripcion.slice(0, 50)}
                    </div>
                  )}
                </div>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
                  <path d="M1 1l5 5-5 5" stroke={EC.dark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Módulo: Pauta de Misa (acceso rápido) ────────────────────
function PautaAccesoRapido({ setSection }) {
  return (
    <div style={{ maxWidth: 680 }}>
      {/* Descripción */}
      <div style={{
        background: "linear-gradient(145deg, #152d4a, #1e3a5f)",
        borderRadius: 18, padding: "20px", marginBottom: 16,
        color: "white", boxShadow: "0 6px 24px rgba(30,58,95,0.35)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎼</div>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.022em", marginBottom: 8, lineHeight: 1.2 }}>
          Pauta de Misa
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.65 }}>
          Aquí encontrarás las pautas de las próximas celebraciones: los cantos asignados para cada parte de la misa, el orden del repertorio y notas del director.
        </div>
        <button
          onClick={() => setSection("pauta_misa")}
          style={{
            marginTop: 14, background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 12, padding: "10px 18px",
            color: "white", fontSize: 13, fontWeight: 600,
            cursor: "pointer", letterSpacing: "-0.015em",
            backdropFilter: "blur(8px)", display: "flex",
            alignItems: "center", gap: 6,
          }}
        >
          Ver pautas disponibles →
        </button>
      </div>

      {/* Qué es una pauta */}
      <div style={{
        background: "white", borderRadius: 16, padding: "16px 18px",
        border: `1px solid ${EC.border}`, boxShadow: EC.shadow, marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: EC.dark, letterSpacing: "-0.015em", marginBottom: 12 }}>
          ¿Qué información tiene una pauta?
        </div>
        {[
          { emoji: "📅", titulo: "Fecha y ocasión", desc: "Día de la misa, tiempo litúrgico y tipo de celebración." },
          { emoji: "🎵", titulo: "Cantos por momento", desc: "El canto asignado para cada parte: entrada, kyrie, gloria, salmo, etc." },
          { emoji: "🎼", titulo: "Tonalidad y tempo", desc: "La clave en que se cantará cada pieza y la velocidad sugerida." },
          { emoji: "📝", titulo: "Notas del director", desc: "Indicaciones especiales, cambios de última hora o gestos de atención." },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, padding: "10px 0",
            borderBottom: i < 3 ? `1px solid ${EC.border}` : "none",
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: EC.dark, letterSpacing: "-0.01em" }}>
                {item.titulo}
              </div>
              <div style={{ fontSize: 12, color: EC.gray, marginTop: 2, lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL: EscuelaCanto
//  Props:
//    user           — usuario actual
//    docs           — array de documentos (de materialEnsayo/biblioteca)
//    setSection     — función para navegar a otras secciones
//    esVisita       — boolean, true si es perfil invitado
// ══════════════════════════════════════════════════════════════
export function EscuelaCanto({ user, docs = [], setSection, esVisita = false }) {
  const [tab, setTab] = useState("pauta");
  const primerNombre = user?.nombre?.split(" ")[0] || "Cantante";

  const TABS = [
    { id: "pauta",      emoji: "🎼", label: "Pauta" },
    { id: "partes",     emoji: "⛪", label: "La Misa" },
    { id: "ejercicios", emoji: "🎤", label: "Ejercicios" },
    { id: "biblioteca", emoji: "📚", label: "Biblioteca" },
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <style>{`
        @keyframes ecFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .ec-fade { animation: ecFade 0.3s ease both; }
      `}</style>

      {/* ── Hero ── */}
      <div className="ec-fade" style={{
        background: "linear-gradient(145deg, #0a1628 0%, #0e2d52 55%, #1a4a7a 100%)",
        borderRadius: 20, padding: "18px 20px 16px",
        marginBottom: 16, position: "relative", overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
      }}>
        {/* Círculos decorativos */}
        <div style={{ position:"absolute", top:-50, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-30, left:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.025)", pointerEvents:"none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.08)", borderRadius: 20,
            padding: "4px 12px", marginBottom: 10,
          }}>
            <span style={{ fontSize: 12 }}>🎤</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Escuela de Canto
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 6 }}>
            {esVisita ? `Bienvenido/a, ${primerNombre}` : "Escuela de Canto"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 360 }}>
            {esVisita
              ? "Tu espacio para aprender, practicar y crecer como cantor litúrgico."
              : "Ejercicios vocales, partes de la misa, biblioteca y recursos para cantores."}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ec-fade" style={{ animationDelay: "0.06s" }}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* ── Contenido ── */}
      <div className="ec-fade" style={{ animationDelay: "0.1s" }}>
        {tab === "pauta"      && <PautaAccesoRapido setSection={setSection} />}
        {tab === "partes"     && <PartesLiturgia />}
        {tab === "ejercicios" && <EjerciciosVocales />}
        {tab === "biblioteca" && <BibliotecaCantor docs={docs} user={user} />}
      </div>
    </div>
  );
}

export default EscuelaCanto;
