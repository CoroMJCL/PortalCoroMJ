import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NIVELES, CHORD_TIPS } from "./CursoTecladoData";

// ═══════════════════════════════════════════════════════════════
//  MOTOR DE AUDIO — piano sintetizado (aditivo), sin archivos
// ═══════════════════════════════════════════════════════════════
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let _ctx = null;
let _master = null;
function audioCtx() {
  try {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
      const comp = _ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      const lp = _ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4200;
      lp.connect(comp);
      comp.connect(_ctx.destination);
      _master = lp;
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}
const PARCIALES = [
  [1, 1],
  [2, 0.42],
  [3, 0.18],
  [4, 0.09],
  [5, 0.04],
];
function notaPiano(c, midi, when, vol = 0.22, durMax = 2.4) {
  if (!c || !_master) return;
  const f = midiHz(midi);
  // las notas agudas se apagan antes, como en un piano real
  const dur = Math.max(0.7, Math.min(durMax, 3.2 - (midi - 48) * 0.045));
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.006);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, when + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g.connect(_master);
  PARCIALES.forEach(([k, a]) => {
    if (f * k > 9000) return;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f * k * (1 + (k - 1) * 0.0008);
    const og = c.createGain();
    og.gain.value = a;
    o.connect(og);
    og.connect(g);
    o.start(when);
    o.stop(when + dur + 0.05);
  });
}
function tocar(midis, opts = {}) {
  const c = audioCtx();
  if (!c) return;
  const t0 = opts.when != null ? opts.when : c.currentTime + 0.02;
  const lista = Array.isArray(midis) ? midis : [midis];
  const vol = (opts.vol != null ? opts.vol : 0.26) / Math.sqrt(Math.max(1, lista.length / 1.6));
  lista.forEach((m, i) => notaPiano(c, m, t0 + i * (opts.gap || 0), vol, opts.dur));
}
function click(c, when, accent) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.16, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  o.connect(g);
  g.connect(c.destination);
  o.start(when);
  o.stop(when + 0.08);
}
function campana(c) {
  [880, 1320].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t = c.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + 0.8);
  });
}
// Bucle con adelanto de programación: onStep(i, tiempoAudio, duracionPaso)
function iniciarBucle(bpm, pasosPorPulso, onStep) {
  const c = audioCtx();
  if (!c) return () => {};
  const dur = 60 / bpm / pasosPorPulso;
  let next = c.currentTime + 0.08;
  let i = 0;
  const timer = setInterval(() => {
    while (next < c.currentTime + 0.18) {
      onStep(i, next, dur);
      next += dur;
      i++;
    }
  }, 25);
  return () => clearInterval(timer);
}
// Ejecuta fn en el momento (aprox.) en que suena el tiempo de audio t
function alSonar(timers, c, t, fn) {
  timers.current.push(setTimeout(fn, Math.max(0, (t - c.currentTime) * 1000)));
}

// ═══════════════════════════════════════════════════════════════
//  NOTACIÓN LATINA
// ═══════════════════════════════════════════════════════════════
const NOMBRES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const NOMBRES_B = ["Do", "Reb", "Re", "Mib", "Mi", "Fa", "Solb", "Sol", "Lab", "La", "Sib", "Si"];
const NEGRA = new Set([1, 3, 6, 8, 10]);
const esNegra = (m) => NEGRA.has(((m % 12) + 12) % 12);
const nombreNota = (m) => NOMBRES[((m % 12) + 12) % 12];
const SEMI_LAT = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };
function notaAMidi(txt) {
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?(-?\d)$/.exec(String(txt).trim());
  if (!m) return null;
  let s = SEMI_LAT[m[1]];
  if (m[2] === "#") s += 1;
  if (m[2] === "b") s -= 1;
  return 12 * (+m[3] + 1) + s;
}
const LATINO = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
const SEMI_US = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const RAIZ_US = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const CALIDADES = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
};
// "Am", "G7", "F:2" → { raiz, calidad, inv }
function parseAcorde(nombre) {
  const [base, invTxt] = String(nombre).split(":");
  const m = /^([A-G])([#b]?)(.*)$/.exec(base);
  if (!m) return null;
  let semi = SEMI_US[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  semi = ((semi % 12) + 12) % 12;
  const cal = CALIDADES[m[3]] ? m[3] : "";
  return { base, semi, calidad: cal, inv: +(invTxt || 0), raizUs: m[1] + m[2] };
}
function nombreLatino(nombre) {
  const p = parseAcorde(nombre);
  if (!p) return nombre;
  return LATINO[p.raizUs[0]] + p.raizUs.slice(1) + p.calidad;
}
function etiquetaInv(nombre) {
  const p = parseAcorde(nombre);
  if (!p || !p.inv) return "";
  return p.inv === 1 ? "1ª inversión" : "2ª inversión";
}
const RANGO_ACORDES = [55, 79]; // Sol3 – Sol5
// Notas de la mano derecha, en posición cerrada, cerca del centro del teclado
function voicing(nombre) {
  const p = parseAcorde(nombre);
  if (!p) return [];
  let notas = CALIDADES[p.calidad].map((x) => 60 + p.semi + x);
  for (let i = 0; i < p.inv && i < notas.length - 1; i++) {
    const n = notas.shift();
    notas.push(n + 12);
  }
  let mejor = notas;
  let dist = Infinity;
  [-12, 0, 12].forEach((k) => {
    const v = notas.map((n) => n + k);
    if (v[0] < RANGO_ACORDES[0] || v[v.length - 1] > RANGO_ACORDES[1]) return;
    const media = v.reduce((a, b) => a + b, 0) / v.length;
    const d = Math.abs(media - 66);
    if (d < dist) {
      dist = d;
      mejor = v;
    }
  });
  return mejor;
}
const bajoDe = (nombre) => {
  const p = parseAcorde(nombre);
  return p ? 36 + p.semi + (p.semi < 5 ? 12 : 0) : 48;
};
function transponer(nombre, n) {
  const p = parseAcorde(nombre);
  if (!p) return nombre;
  return RAIZ_US[(((p.semi + n) % 12) + 12) % 12] + p.calidad + (p.inv ? ":" + p.inv : "");
}

// ═══════════════════════════════════════════════════════════════
//  TECLADO INTERACTIVO (SVG táctil)
// ═══════════════════════════════════════════════════════════════
const NAVY = "#0f2744";
const ORO = "#c9a227";

function Teclado({ rango = [60, 83], resaltar = [], dedos = {}, activos = [], nombres = true, color = NAVY, onNota, alto = 150, mini }) {
  const [pulsadas, setPulsadas] = useState({});
  const blancas = [];
  for (let m = rango[0]; m <= rango[1]; m++) if (!esNegra(m)) blancas.push(m);
  const W = 40;
  const ancho = blancas.length * W;
  const H = alto;
  const HN = Math.round(H * 0.62);
  const res = new Set(resaltar);
  const act = new Set(activos);
  const pulsar = (m) => {
    tocar(m, { vol: 0.3 });
    setPulsadas((p) => ({ ...p, [m]: true }));
    setTimeout(() => setPulsadas((p) => ({ ...p, [m]: false })), 220);
    if (onNota) onNota(m);
  };
  const negras = [];
  blancas.forEach((b, i) => {
    const n = b + 1;
    if (n <= rango[1] && esNegra(n)) negras.push({ m: n, x: (i + 1) * W - 12 });
  });
  const relleno = (m, negra) => {
    if (act.has(m) || pulsadas[m]) return color;
    if (res.has(m)) return negra ? "#a8841c" : "#f6e7b8";
    return negra ? "#1b2433" : "#fff";
  };
  const textoCol = (m) => (act.has(m) || pulsadas[m] ? "#fff" : "#64748b");
  return (
    <div className="ct-kbd-wrap" style={mini ? { maxWidth: blancas.length * 22 } : { maxWidth: blancas.length * 46 }}>
      <svg viewBox={`0 0 ${ancho + 2} ${H + 2}`} className="ct-kbd" role="img" aria-label="Teclado">
        {blancas.map((m, i) => (
          <g key={m} onPointerDown={(e) => { e.preventDefault(); pulsar(m); }} style={{ cursor: "pointer" }}>
            <rect x={i * W + 1} y={1} width={W - 1.5} height={H} rx={5} fill={relleno(m, false)} stroke="#c7d0dc" strokeWidth={1.2} />
            {dedos[m] != null && (
              <g>
                <circle cx={i * W + 1 + (W - 1.5) / 2} cy={H - (nombres ? 44 : 22)} r={11} fill={act.has(m) || pulsadas[m] ? "#fff" : color} />
                <text x={i * W + 1 + (W - 1.5) / 2} y={H - (nombres ? 40 : 18)} textAnchor="middle" fontSize={13} fontWeight={800} fill={act.has(m) || pulsadas[m] ? color : "#fff"}>{dedos[m]}</text>
              </g>
            )}
            {nombres && !mini && (
              <text x={i * W + 1 + (W - 1.5) / 2} y={H - 10} textAnchor="middle" fontSize={nombreNota(m) === "Do" ? 12 : 11} fontWeight={nombreNota(m) === "Do" ? 800 : 600} fill={textoCol(m)} style={{ pointerEvents: "none" }}>
                {nombreNota(m)}
              </text>
            )}
          </g>
        ))}
        {negras.map(({ m, x }) => (
          <g key={m} onPointerDown={(e) => { e.preventDefault(); pulsar(m); }} style={{ cursor: "pointer" }}>
            <rect x={x} y={1} width={24} height={HN} rx={4} fill={relleno(m, true)} stroke="#0b111b" strokeWidth={1} />
            {dedos[m] != null && (
              <text x={x + 12} y={HN - 10} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff">{dedos[m]}</text>
            )}
            {nombres === "todas" && !mini && (
              <>
                <text x={x + 12} y={HN - 22} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#e2e8f0" style={{ pointerEvents: "none" }}>{NOMBRES[m % 12]}</text>
                <text x={x + 12} y={HN - 10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#94a3b8" style={{ pointerEvents: "none" }}>{NOMBRES_B[m % 12]}</text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENTES DEL CURSO
// ═══════════════════════════════════════════════════════════════
function Boton({ children, onClick, activo, color = NAVY, pequeno, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        border: `1px solid ${activo ? color : "#d6dee9"}`,
        background: activo ? color : "#fff",
        color: activo ? "#fff" : color,
        borderRadius: 10,
        padding: pequeno ? "5px 10px" : "8px 14px",
        fontSize: pequeno ? 11.5 : 12.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function BloqueTeclado({ b, color }) {
  const [ultima, setUltima] = useState(null);
  const resaltar = (b.resaltar || []).map(notaAMidi).filter((x) => x != null);
  const dedos = {};
  Object.entries(b.dedos || {}).forEach(([k, v]) => {
    const m = notaAMidi(k);
    if (m != null) dedos[m] = v;
  });
  const rango = b.rango ? b.rango.map(notaAMidi) : [60, 83];
  return (
    <div className="ct-panel">
      {b.label && <div className="ct-panel-t">🎹 {b.label}</div>}
      <Teclado rango={rango} resaltar={resaltar} dedos={dedos} nombres={b.nombres != null ? b.nombres : true} color={color} onNota={setUltima} />
      <div className="ct-ultima">
        {ultima != null ? (
          <>Tocaste <b>{esNegra(ultima) ? `${NOMBRES[ultima % 12]} / ${NOMBRES_B[ultima % 12]}` : nombreNota(ultima)}</b></>
        ) : (
          "Toca cualquier tecla para escucharla"
        )}
      </div>
    </div>
  );
}

function Dedos({ color }) {
  const mano = (titulo, orden) => (
    <div className="ct-mano">
      <b>{titulo}</b>
      <div className="ct-mano-d">
        {orden.map((n) => (
          <div key={n} style={{ height: n === 1 ? 30 : n === 5 ? 38 : n === 3 ? 56 : 48 }}>
            <span style={{ background: color }}>{n}</span>
          </div>
        ))}
      </div>
      <small>{orden[0] === 1 ? "pulgar → meñique" : "meñique ← pulgar"}</small>
    </div>
  );
  return (
    <div className="ct-panel">
      <div className="ct-panel-t">✋ Números de los dedos</div>
      <div className="ct-manos">
        {mano("Mano izquierda", [5, 4, 3, 2, 1])}
        {mano("Mano derecha", [1, 2, 3, 4, 5])}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>1 pulgar · 2 índice · 3 medio · 4 anular · 5 meñique (igual en ambas manos).</div>
    </div>
  );
}

function AcordeCard({ nombre, color }) {
  const notas = voicing(nombre);
  const p = parseAcorde(nombre);
  const tip = p ? CHORD_TIPS[p.base] : "";
  const inv = etiquetaInv(nombre);
  const dedos = {};
  const dd = notas.length === 4 ? [1, 2, 3, 5] : p && p.inv === 1 ? [1, 2, 5] : [1, 3, 5];
  notas.forEach((m, i) => (dedos[m] = dd[i]));
  return (
    <div className="ct-chord">
      <div className="ct-chord-name">
        {nombreLatino(nombre)}
        {inv && <small>{inv}</small>}
      </div>
      <Teclado rango={RANGO_ACORDES} resaltar={notas} dedos={dedos} nombres={false} color={color} alto={110} mini />
      <div className="ct-chord-notas">{notas.map(nombreNota).join(" – ")}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <Boton pequeno color={color} onClick={() => tocar([bajoDe(nombre), ...notas])}>▶ Escuchar</Boton>
        <Boton pequeno color={color} onClick={() => tocar(notas, { gap: 0.28, vol: 0.4 })}>♪ Arpegio</Boton>
      </div>
      {tip && !inv && <div className="ct-chord-tip">{tip}</div>}
    </div>
  );
}

// Patrones: pasos por compás (corcheas) y qué suena en cada paso
// "B" bajo · "Q" quinta en el bajo · "A" acorde · "a" acorde suave · número = nota del arpegio
const PATRONES = {
  bloque: { pulsos: 4, pasos: ["BA", "", "", "", "", "", "", ""] },
  negras: { pulsos: 4, pasos: ["BA", "", "a", "", "a", "", "a", ""] },
  arpegio: { pulsos: 4, pasos: ["B0", "1", "2", "3", "2", "1", "2", "1"] },
  balada: { pulsos: 4, pasos: ["B", "a", "A", "", "Q", "a", "A", ""] },
  vals: { pulsos: 3, pasos: ["B", "", "a", "", "a", ""] },
  marcha: { pulsos: 4, pasos: ["B", "", "A", "", "Q", "", "A", ""] },
};

function Progresion({ chords, bpm: bpm0, label, color, patron = "bloque" }) {
  const [bpm, setBpm] = useState(bpm0 || 70);
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const parar = useRef(null);
  const timers = useRef([]);
  const pat = PATRONES[patron] || PATRONES.bloque;
  const limpiar = () => {
    if (parar.current) parar.current();
    parar.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => limpiar, []);
  const clave = chords.join(",");
  useEffect(() => {
    if (!sonando) {
      limpiar();
      setActivo(-1);
      return;
    }
    const c = audioCtx();
    if (!c) return;
    const n = pat.pasos.length;
    parar.current = iniciarBucle(bpm, 2, (i, t) => {
      const compas = Math.floor(i / n) % chords.length;
      const paso = i % n;
      const nombre = chords[compas];
      const v = voicing(nombre);
      if (paso === 0) alSonar(timers, c, t, () => setActivo(compas));
      if (paso % 2 === 0) click(c, t, paso === 0);
      const accion = pat.pasos[paso] || "";
      if (accion.includes("B")) tocar(bajoDe(nombre), { when: t, vol: 0.3 });
      if (accion.includes("Q")) tocar(bajoDe(nombre) + 7, { when: t, vol: 0.24 });
      if (accion.includes("A")) tocar(v, { when: t, vol: 0.26 });
      if (accion.includes("a")) tocar(v, { when: t, vol: 0.16 });
      const d = accion.replace(/[BQAa]/g, "");
      if (d !== "") {
        const arp = [...v.slice(0, 3), v[0] + 12];
        tocar(arp[+d % arp.length], { when: t, vol: 0.3 });
      }
    });
    return limpiar;
  }, [sonando, bpm, clave, patron]);
  const actual = activo >= 0 ? chords[activo] : chords[0];
  return (
    <div className="ct-panel">
      <div className="ct-panel-t">🎼 {label}</div>
      <div className="ct-prog">
        {chords.map((n, i) => (
          <button key={i} className={"ct-prog-c" + (activo === i ? " on" : "")} style={activo === i ? { background: color, borderColor: color } : null} onClick={() => tocar([bajoDe(n), ...voicing(n)])}>
            {nombreLatino(n)}
            {etiquetaInv(n) && <small>{etiquetaInv(n).replace(" inversión", "")}</small>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Teclado rango={RANGO_ACORDES} activos={sonando ? voicing(actual) : []} resaltar={sonando ? [] : voicing(actual)} nombres color={color} alto={120} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar y practicar"}
        </Boton>
        <label className="ct-vel">
          Velocidad {bpm}
          <input type="range" min={40} max={140} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
        <span className="ct-chip">{pat.pulsos === 3 ? "3/4" : "4/4"}</span>
      </div>
    </div>
  );
}

function Ritmo({ compases, compas = 4, bpm: bpm0, label, color }) {
  const [bpm, setBpm] = useState(bpm0 || 72);
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(null);
  const parar = useRef(null);
  const timers = useRef([]);
  const limpiar = () => {
    if (parar.current) parar.current();
    parar.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => limpiar, []);
  // pasos de corchea donde empieza cada figura
  const inicios = useMemo(() => {
    const out = [];
    let paso = 0;
    compases.forEach((cp, ci) =>
      cp.forEach((f, fi) => {
        out.push({ paso, ci, fi, d: f.d });
        paso += Math.round(f.d * 2);
      })
    );
    return { out, total: compases.length * compas * 2 };
  }, [compases, compas]);
  useEffect(() => {
    if (!sonando) {
      limpiar();
      setActivo(null);
      return;
    }
    const c = audioCtx();
    if (!c) return;
    parar.current = iniciarBucle(bpm, 2, (i, t, dur) => {
      const p = i % inicios.total;
      if (p % 2 === 0) click(c, t, p % (compas * 2) === 0);
      const f = inicios.out.find((x) => x.paso === p);
      if (f) {
        tocar(72, { when: t, vol: 0.3, dur: Math.max(0.4, f.d * dur * 2) });
        alSonar(timers, c, t, () => setActivo(f.ci + ":" + f.fi));
      }
    });
    return limpiar;
  }, [sonando, bpm, inicios, compas]);
  const conteo = (f, desde) => {
    if (f.d === 0.5) return desde % 2 === 0 ? String(desde / 2 + 1) : "y";
    return String(Math.floor(desde / 2) + 1);
  };
  return (
    <div className="ct-panel">
      <div className="ct-panel-t">🥁 {label}</div>
      <div className="ct-ritmo">
        {compases.map((cp, ci) => {
          let pos = 0;
          return (
            <div key={ci} className="ct-compas">
              {cp.map((f, fi) => {
                const desde = pos;
                pos += Math.round(f.d * 2);
                const on = activo === ci + ":" + fi;
                return (
                  <div key={fi} className={"ct-fig" + (on ? " on" : "")} style={{ flex: f.d, ...(on ? { background: color, borderColor: color, color: "#fff" } : null) }}>
                    <b>{f.n}</b>
                    <span>{conteo(f, desde)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar con metrónomo"}
        </Boton>
        <label className="ct-vel">
          Velocidad {bpm}
          <input type="range" min={40} max={140} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
        <span className="ct-chip">{compas}/4</span>
      </div>
    </div>
  );
}

function Melodia({ notas: txt, bpm: bpm0, label, color, rango: rangoTxt }) {
  const notas = useMemo(
    () =>
      String(txt)
        .split(/\s+/)
        .filter(Boolean)
        .map((tok) => {
          const [n, d, f] = tok.split(":");
          return { m: notaAMidi(n), d: +d || 1, f: f ? +f : null };
        })
        .filter((x) => x.m != null),
    [txt]
  );
  const rango = useMemo(() => {
    if (rangoTxt) return rangoTxt.map(notaAMidi);
    let lo = Math.min(...notas.map((n) => n.m));
    let hi = Math.max(...notas.map((n) => n.m));
    lo -= ((lo % 12) + 12) % 12; // desde el Do de abajo
    hi = Math.max(hi + 2, lo + 11);
    if (esNegra(hi)) hi += 1;
    return [lo, hi];
  }, [notas, rangoTxt]);
  const [bpm, setBpm] = useState(bpm0 || 72);
  const [sonando, setSonando] = useState(false);
  const [idx, setIdx] = useState(-1);
  const timers = useRef([]);
  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => limpiar, []);
  useEffect(() => {
    if (!sonando) {
      limpiar();
      setIdx(-1);
      return;
    }
    const c = audioCtx();
    if (!c) return;
    const pulso = 60 / bpm;
    let t = c.currentTime + 0.1;
    // un compás de entrada con metrónomo
    for (let k = 0; k < 4; k++) click(c, t + k * pulso, k === 0);
    t += 4 * pulso;
    notas.forEach((n, i) => {
      tocar(n.m, { when: t, vol: 0.32, dur: Math.max(0.5, n.d * pulso * 1.4) });
      alSonar(timers, c, t, () => setIdx(i));
      t += n.d * pulso;
    });
    alSonar(timers, c, t + 0.3, () => setSonando(false));
    return limpiar;
  }, [sonando, bpm, notas]);
  const actual = idx >= 0 ? notas[idx] : null;
  const dedos = {};
  if (actual && actual.f) dedos[actual.m] = actual.f;
  if (!actual && notas[0] && notas[0].f) dedos[notas[0].m] = notas[0].f;
  return (
    <div className="ct-panel">
      <div className="ct-panel-t">🎵 {label}</div>
      <Teclado rango={rango} activos={actual ? [actual.m] : []} resaltar={actual ? [] : [notas[0]?.m]} dedos={dedos} color={color} alto={130} />
      <div className="ct-mel">
        {notas.map((n, i) => (
          <span key={i} className={i === idx ? "on" : ""} style={i === idx ? { background: color, borderColor: color, color: "#fff" } : null}>
            {nombreNota(n.m)}
            {n.f && <small>{n.f}</small>}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar"}
        </Boton>
        <label className="ct-vel">
          Velocidad {bpm}
          <input type="range" min={40} max={140} value={bpm} disabled={sonando} onChange={(e) => setBpm(+e.target.value)} />
        </label>
      </div>
      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>El número pequeño es el dedo que usas. Suena un compás de metrónomo antes de empezar.</div>
    </div>
  );
}

function Quiz({ modo, opciones, label, color }) {
  const genera = useCallback(
    (prev) => {
      if (modo === "acorde") {
        let x;
        do x = opciones[Math.floor(Math.random() * opciones.length)];
        while (opciones.length > 1 && x === prev);
        return x;
      }
      const blancas = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
      let x;
      do x = blancas[Math.floor(Math.random() * blancas.length)];
      while (x === prev);
      return x;
    },
    [modo, opciones]
  );
  const [pregunta, setPregunta] = useState(() => genera(null));
  const [resp, setResp] = useState(null);
  const [racha, setRacha] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [total, setTotal] = useState(0);
  const correcta = modo === "acorde" ? pregunta : nombreNota(pregunta);
  const botones = modo === "acorde" ? opciones : ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
  const marcadas = modo === "acorde" ? voicing(pregunta) : [pregunta];
  const responder = (r) => {
    if (resp) return;
    setResp(r);
    setTotal((t) => t + 1);
    if (r === correcta) {
      setAciertos((a) => a + 1);
      setRacha((s) => s + 1);
    } else setRacha(0);
  };
  const siguiente = () => {
    const n = genera(pregunta);
    setPregunta(n);
    setResp(null);
    tocar(modo === "acorde" ? voicing(n) : n);
  };
  return (
    <div className="ct-quiz" style={{ borderColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="ct-ensayo-k" style={{ color }}>MINI DESAFÍO</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{label}</div>
        </div>
        <div className="ct-score">
          <span>Racha <b>{racha}</b></span>
          <span>Aciertos <b>{aciertos}/{total}</b></span>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Teclado rango={modo === "acorde" ? RANGO_ACORDES : [60, 83]} resaltar={marcadas} nombres={!!resp} color={color} alto={120} />
      </div>
      <div className="ct-quiz-ops">
        {botones.map((b) => {
          const etiqueta = modo === "acorde" ? nombreLatino(b) : b;
          const ok = resp && b === correcta;
          const mal = resp === b && b !== correcta;
          return (
            <button key={b} onClick={() => responder(b)} className={"ct-quiz-op" + (ok ? " ok" : "") + (mal ? " mal" : "")}>
              {etiqueta}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton pequeno color={color} onClick={() => tocar(marcadas)}>🔊 Escuchar</Boton>
        {resp && (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: resp === correcta ? NAVY : "#a63232" }}>
              {resp === correcta ? "¡Correcto!" : `Era ${modo === "acorde" ? nombreLatino(correcta) : correcta}`}
            </span>
            <Boton pequeno color={color} activo onClick={siguiente}>Siguiente →</Boton>
          </>
        )}
      </div>
    </div>
  );
}

function Cifrado({ lineas, color }) {
  return (
    <div className="ct-panel">
      <div className="ct-panel-t">📖 Toca los acordes para escucharlos</div>
      {lineas.map((l, li) => {
        const partes = [];
        const re = /\[([^\]]+)\]([^[]*)/g;
        const pre = l.split("[")[0];
        if (pre) partes.push({ a: null, x: pre });
        let m;
        while ((m = re.exec(l))) partes.push({ a: m[1], x: m[2] });
        return (
          <div key={li} className="ct-cif">
            {partes.map((p, i) => (
              <span key={i} className="ct-cif-s">
                {p.a ? (
                  <button className="ct-cif-a" style={{ color }} onClick={() => tocar([bajoDe(p.a), ...voicing(p.a)])}>{nombreLatino(p.a)}</button>
                ) : (
                  <span className="ct-cif-a">&nbsp;</span>
                )}
                <span className="ct-cif-x">{p.x.replace(/ /g, " ")}</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const TONOS = [
  { n: 0, t: "Do" },
  { n: 2, t: "Re" },
  { n: 4, t: "Mi" },
  { n: 5, t: "Fa" },
  { n: 7, t: "Sol" },
  { n: 9, t: "La" },
];
function Transpositor({ chords, color }) {
  const [n, setN] = useState(0);
  const lista = chords.map((c) => transponer(c, n));
  return (
    <div>
      <div className="ct-panel" style={{ marginBottom: 0 }}>
        <div className="ct-panel-t">🔀 Elige el tono de destino</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TONOS.map((t) => (
            <Boton key={t.n} pequeno color={color} activo={n === t.n} onClick={() => setN(t.n)}>{t.t}</Boton>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 10 }}>
          Original en Do: <b>{chords.map(nombreLatino).join(" – ")}</b>
          <br />
          En {TONOS.find((t) => t.n === n).t}: <b style={{ color }}>{lista.map(nombreLatino).join(" – ")}</b>
        </div>
      </div>
      <Progresion key={n} chords={lista} bpm={70} patron="balada" label={`La progresión en el tono de ${TONOS.find((t) => t.n === n).t}`} color={color} />
    </div>
  );
}

function EnsayoGuiado({ titulo, pasos, color }) {
  const [corriendo, setCorriendo] = useState(false);
  const [paso, setPaso] = useState(0);
  const [resta, setResta] = useState(pasos[0].min * 60);
  const paradaMetro = useRef(null);
  const restaRef = useRef(pasos[0].min * 60);
  const pasoRef = useRef(0);
  const total = pasos.reduce((s, p) => s + p.min, 0);
  const pararMetro = () => {
    if (paradaMetro.current) paradaMetro.current();
    paradaMetro.current = null;
  };
  useEffect(() => pararMetro, []);
  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => {
      restaRef.current -= 1;
      if (restaRef.current > 0) {
        setResta(restaRef.current);
        return;
      }
      const c = audioCtx();
      if (c) campana(c);
      if (pasoRef.current + 1 >= pasos.length) setCorriendo(false);
      else setPaso(pasoRef.current + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [corriendo, pasos]);
  useEffect(() => {
    pasoRef.current = paso;
    restaRef.current = pasos[paso].min * 60;
    setResta(restaRef.current);
    pararMetro();
    if (corriendo && pasos[paso].bpm > 0) {
      const c = audioCtx();
      if (c) paradaMetro.current = iniciarBucle(pasos[paso].bpm, 1, (i, t) => click(c, t, i % 4 === 0));
    }
    return pararMetro;
  }, [paso, corriendo, pasos]);
  const mm = String(Math.floor(resta / 60)).padStart(2, "0");
  const ss = String(resta % 60).padStart(2, "0");
  return (
    <div className="ct-ensayo" style={{ borderColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="ct-ensayo-k" style={{ color }}>ENSAYO GUIADO · {total} min</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{titulo.replace(/^Ensayo guiado · /, "")}</div>
        </div>
        <Boton
          color={color}
          activo={corriendo}
          onClick={() => {
            if (!corriendo) {
              audioCtx();
              if (paso !== 0) setPaso(0);
              restaRef.current = pasos[0].min * 60;
              setResta(restaRef.current);
            }
            setCorriendo((v) => !v);
          }}
        >
          {corriendo ? "■ Detener" : "▶ Comenzar ensayo"}
        </Boton>
      </div>
      <ol className="ct-steps">
        {pasos.map((p, i) => (
          <li key={i} className={i === paso && corriendo ? "on" : ""} style={i === paso && corriendo ? { borderColor: color, background: "#fff" } : null}>
            <div className="ct-step-h">
              <b>{p.t}</b>
              <span>{i === paso && corriendo ? `${mm}:${ss}` : `${p.min} min`}{p.bpm > 0 ? ` · ${p.bpm} pulsos/min` : ""}</span>
            </div>
            <div className="ct-step-t">{p.txt}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function negritas(s) {
  const esc = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function Render({ b, color, check, setCheck, mod }) {
  switch (b.t) {
    case "p":
      return <p className="ct-p" dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />;
    case "h":
      return <h4 className="ct-h">{b.x}</h4>;
    case "ul":
      return (
        <ul className="ct-ul">
          {b.items.map((x, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: negritas(x) }} />
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className="ct-note tip">
          <span>💡</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "warn":
      return (
        <div className="ct-note warn">
          <span>⚠️</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "teclado":
      return <BloqueTeclado b={b} color={color} />;
    case "dedos":
      return <Dedos color={color} />;
    case "acordes":
      return (
        <div className="ct-chords">
          {b.names.map((n) => (
            <AcordeCard key={n} nombre={n} color={color} />
          ))}
        </div>
      );
    case "prog":
      return <Progresion chords={b.chords} bpm={b.bpm} label={b.label} patron={b.patron} color={color} />;
    case "ritmo":
      return <Ritmo compases={b.compases} compas={b.compas || 4} bpm={b.bpm} label={b.label} color={color} />;
    case "melodia":
      return <Melodia notas={b.notas} bpm={b.bpm} label={b.label} rango={b.rango} color={color} />;
    case "quiz":
      return <Quiz modo={b.modo} opciones={b.opciones} label={b.label} color={color} />;
    case "cifrado":
      return <Cifrado lineas={b.lineas} color={color} />;
    case "transponer":
      return <Transpositor chords={b.chords} color={color} />;
    case "ensayo":
      return <EnsayoGuiado titulo={b.titulo} pasos={b.pasos} color={color} />;
    case "postura":
      return (
        <div style={{ display: "grid", gap: 12, margin: "14px 0" }}>
          {b.cards.map((c, i) => (
            <div key={i} className="ct-post">
              <div className="ct-post-h" style={{ color }}>
                <span style={{ background: color }}>{i + 1}</span>
                {c.titulo}
              </div>
              <div className="ct-post-b">
                <div>
                  <b className="ok">✔ Qué hacer</b>
                  <p dangerouslySetInnerHTML={{ __html: negritas(c.hacer) }} />
                </div>
                <div>
                  <b className="mal">✘ Error común</b>
                  <p>{c.error}</p>
                </div>
                <div>
                  <b className="fix">↺ Cómo corregirlo</b>
                  <p>{c.corrige}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    case "checklist":
      return (
        <div className="ct-panel">
          <div className="ct-panel-t">✅ Marca lo que ya dominas</div>
          {b.items.map((x, i) => {
            const k = mod.id + ":" + x;
            return (
              <label key={i} className="ct-check">
                <input type="checkbox" checked={!!check[k]} onChange={() => setCheck(k)} />
                <span>{x}</span>
              </label>
            );
          })}
        </div>
      );
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export const KEY_TECLADO = "curso_teclado_progreso_v1";
function leer() {
  try {
    return JSON.parse(localStorage.getItem(KEY_TECLADO) || "{}") || {};
  } catch {
    return {};
  }
}
function guardar(v) {
  try {
    localStorage.setItem(KEY_TECLADO, JSON.stringify(v));
  } catch {}
}

const CSS = `
.ct{max-width:1100px;font-family:inherit;color:#1e293b}
.ct *{box-sizing:border-box}
.ct-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px 22px;background:#fff;border:1px solid #e6ebf2;box-shadow:0 10px 30px rgba(15,39,68,.07)}
.ct-hero:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,${ORO},#e8cf7a)}
.ct-hero-keys{position:absolute;right:16px;top:14px;display:flex;gap:3px;opacity:.9}
.ct-hero-keys i{display:block;width:12px;height:44px;border-radius:0 0 3px 3px;border:1px solid #d9e0ea;background:#fff}
.ct-hero-keys i.n{width:8px;height:28px;background:${NAVY};border-color:${NAVY};margin:0 -7px;position:relative;z-index:1}
.ct-kick{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:${ORO};font-weight:800}
.ct-title{letter-spacing:-.02em;font-size:clamp(20px,2.6vw,26px);line-height:1.1;margin:4px 0 6px;font-weight:800;color:${NAVY}}
.ct-sub{max-width:560px;font-size:13.5px;line-height:1.6;color:#516074}
.ct-stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:12px}
.ct-stats div{font-size:10.5px;color:#7b8796;letter-spacing:.06em;text-transform:uppercase}
.ct-stats b{display:block;font-size:18px;color:${NAVY};letter-spacing:0}
.ct-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:16px 0}
.ct-level{text-align:left;border:1.5px solid #e2e8f0;background:#fff;border-radius:18px;padding:14px 16px;cursor:pointer;font-family:inherit;transition:transform .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent}
.ct-level:active{transform:scale(.99)}
.ct-level.on{box-shadow:0 10px 26px rgba(15,39,68,.12)}
.ct-level h3{margin:0;font-size:16px}
.ct-level p{margin:4px 0 8px;font-size:12px;color:#64748b;line-height:1.4}
.ct-prog-bar{height:6px;background:#eef2f7;border-radius:6px;overflow:hidden}
.ct-prog-bar i{display:block;height:100%;border-radius:6px;transition:width .3s}
.ct-main{display:grid;grid-template-columns:290px minmax(0,1fr);gap:16px;align-items:start}
.ct-list{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:8px;position:sticky;top:10px}
.ct-mod{width:100%;display:flex;gap:10px;align-items:flex-start;text-align:left;border:none;background:transparent;border-radius:12px;padding:9px 10px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.ct-mod.on{background:#f4f6fa}
.ct-mod-n{flex:0 0 26px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff}
.ct-mod b{display:block;font-size:13px;color:${NAVY};line-height:1.25}
.ct-mod div span{display:block;font-size:11.5px;color:#64748b;line-height:1.35;margin-top:2px}
.ct-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:22px 24px;box-shadow:0 6px 20px rgba(15,39,68,.05)}
.ct-card h2{font-size:clamp(20px,2.6vw,26px);margin:2px 0 4px;color:${NAVY};letter-spacing:-.02em}
.ct-p{font-size:14px;line-height:1.7;color:#334155;margin:12px 0}
.ct-h{font-size:16px;color:${NAVY};margin:20px 0 4px;letter-spacing:-.01em}
.ct-ul{margin:8px 0 12px;padding-left:20px;font-size:13.5px;line-height:1.7;color:#334155}
.ct-ul li{margin:4px 0}
.ct-note{display:flex;gap:10px;border-radius:14px;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.6}
.ct-note.tip{background:#fdf7e3;border:1px solid #efdca0;color:#6b5513}
.ct-note.warn{background:#fdf0f0;border:1px solid #f2c4c4;color:#7f2a2a}
.ct-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin:14px 0}
.ct-panel-t{font-size:13px;font-weight:800;color:${NAVY};margin-bottom:10px}
.ct-kbd-wrap{width:100%;margin:0 auto;overflow:hidden;border-radius:8px}
.ct-kbd{display:block;width:100%;height:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.ct-ultima{font-size:12.5px;color:#64748b;margin-top:8px;text-align:center;min-height:18px}
.ct-ultima b{color:${NAVY};font-size:14px}
.ct-manos{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ct-mano{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;text-align:center}
.ct-mano>b{font-size:12px;color:${NAVY}}
.ct-mano small{display:block;font-size:10.5px;color:#94a3b8;margin-top:4px}
.ct-mano-d{display:flex;justify-content:center;align-items:flex-end;gap:6px;margin-top:8px;height:60px}
.ct-mano-d div{width:20px;border-radius:10px 10px 4px 4px;background:#eef2f7;display:flex;justify-content:center;padding-top:3px}
.ct-mano-d span{width:18px;height:18px;border-radius:50%;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.ct-chords{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin:14px 0}
.ct-chord{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center}
.ct-chord-name{font-size:21px;font-weight:800;color:${NAVY};margin-bottom:8px;letter-spacing:-.01em}
.ct-chord-name small{display:block;font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase}
.ct-chord-notas{font-size:12px;font-weight:700;color:#475569;margin-top:8px}
.ct-chord-tip{font-size:11.5px;line-height:1.5;color:#64748b;margin-top:8px}
.ct-prog{display:flex;gap:8px;flex-wrap:wrap}
.ct-prog-c{min-width:64px;text-align:center;padding:9px 14px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-family:inherit;font-size:18px;font-weight:800;color:${NAVY};cursor:pointer;transition:background .12s,color .12s;line-height:1.1}
.ct-prog-c small{display:block;font-size:9.5px;font-weight:700;opacity:.65}
.ct-prog-c.on{color:#fff}
.ct-vel{font-size:12px;color:#475569;display:flex;align-items:center;gap:8px}
.ct-vel input{width:110px;accent-color:${NAVY}}
.ct-chip{font-size:11px;font-weight:800;color:${NAVY};background:#eef2f7;border-radius:8px;padding:4px 8px}
.ct-ritmo{display:flex;gap:8px;flex-wrap:wrap}
.ct-compas{display:flex;gap:4px;flex:1 1 220px;min-width:0;border-left:2px solid ${NAVY};border-right:2px solid ${NAVY};padding:0 4px}
.ct-fig{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1.5px solid #cbd5e1;border-radius:10px;padding:8px 2px;background:#fff;color:${NAVY};min-width:0;transition:background .1s}
.ct-fig b{font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.ct-fig span{font-size:15px;font-weight:800;opacity:.7}
.ct-mel{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}
.ct-mel span{position:relative;font-size:12px;font-weight:700;color:${NAVY};border:1px solid #d6dee9;background:#fff;border-radius:8px;padding:4px 8px 4px 7px;transition:background .1s}
.ct-mel small{font-size:9px;font-weight:800;color:${ORO};margin-left:3px;vertical-align:super}
.ct-mel span.on small{color:#fff}
.ct-quiz{border:2px solid;border-radius:18px;padding:16px 18px;margin:18px 0;background:#fcfcfd}
.ct-score{display:flex;gap:12px;font-size:12px;color:#64748b}
.ct-score b{color:${NAVY};font-size:14px}
.ct-quiz-ops{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;margin-top:12px}
.ct-quiz-op{border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;padding:10px 4px;font-family:inherit;font-size:15px;font-weight:800;color:${NAVY};cursor:pointer;-webkit-tap-highlight-color:transparent}
.ct-quiz-op.ok{background:${NAVY};border-color:${NAVY};color:#fff}
.ct-quiz-op.mal{background:#fdf0f0;border-color:#e8a5a5;color:#a63232}
.ct-cif{display:flex;flex-wrap:wrap;margin:6px 0 10px;row-gap:4px}
.ct-cif-s{display:inline-flex;flex-direction:column}
.ct-cif-a{font-family:inherit;font-size:13px;font-weight:800;border:none;background:none;padding:0 8px 0 0;text-align:left;cursor:pointer;min-height:18px;line-height:18px}
.ct-cif-x{font-size:15px;color:#1e293b;line-height:1.4}
.ct-ensayo{border:2px solid;border-radius:18px;padding:16px 18px;margin:18px 0;background:#fcfcfd}
.ct-ensayo-k{font-size:10.5px;font-weight:800;letter-spacing:.18em}
.ct-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.ct-steps li{border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;background:#f9fafc}
.ct-step-h{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:${NAVY}}
.ct-step-h span{font-variant-numeric:tabular-nums;font-weight:700;color:#475569;white-space:nowrap}
.ct-step-t{font-size:12.5px;color:#64748b;line-height:1.5;margin-top:3px}
.ct-post{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff}
.ct-post-h{display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px;padding:10px 14px;border-bottom:1px solid #eef2f7}
.ct-post-h span{width:24px;height:24px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px}
.ct-post-b{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px 14px}
.ct-post-b p{margin:4px 0 0;font-size:12.8px;line-height:1.6;color:#334155}
.ct-post-b b{font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.ct-post-b .ok{color:${NAVY}}.ct-post-b .mal{color:#a63232}.ct-post-b .fix{color:#8a6a12}
.ct-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#334155;padding:5px 0;cursor:pointer;line-height:1.45}
.ct-check input{width:18px;height:18px;margin-top:1px;accent-color:${NAVY}}
@media(max-width:900px){.ct-main{grid-template-columns:minmax(0,1fr)}.ct-list{position:static}.ct-card{padding:16px}.ct-hero-keys{display:none}}
`;

export default function CursoTeclado() {
  const [estado, setEstado] = useState(leer);
  const [nivelId, setNivelId] = useState(estado.nivel || "basico");
  const [modId, setModId] = useState(null);
  const topRef = useRef(null);
  const contRef = useRef(null);
  const nivel = NIVELES.find((n) => n.id === nivelId) || NIVELES[0];
  const done = estado.done || {};
  const check = estado.check || {};

  const set = useCallback((patch) => {
    setEstado((prev) => {
      const nuevo = { ...prev, ...patch };
      guardar(nuevo);
      return nuevo;
    });
  }, []);
  const marcarModulo = (id) => set({ done: { ...done, [id]: !done[id] } });
  const alternarCheck = (k) => set({ check: { ...check, [k]: !check[k] } });
  const cambiarNivel = (id) => {
    setNivelId(id);
    setModId(null);
    set({ nivel: id });
  };
  const mod = nivel.modulos.find((m) => m.id === modId) || null;
  const idxMod = mod ? nivel.modulos.indexOf(mod) : -1;
  const progresoNivel = (n) => {
    const hechos = n.modulos.filter((m) => done[m.id]).length;
    return { hechos, total: n.modulos.length, pct: Math.round((hechos / n.modulos.length) * 100) };
  };
  const totalMods = NIVELES.reduce((s, n) => s + n.modulos.length, 0);
  const cuenta = (t) => NIVELES.reduce((s, n) => s + n.modulos.reduce((a, m) => a + m.bloques.filter((b) => b.t === t).length, 0), 0);
  const abrirModulo = (id) => {
    setModId(id);
    setTimeout(() => {
      const narrow = window.matchMedia && window.matchMedia("(max-width:900px)").matches;
      const el = narrow ? contRef.current : topRef.current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  return (
    <div className="ct" ref={topRef}>
      <style>{CSS}</style>
      <div className="ct-hero">
        <div className="ct-hero-keys">
          <i /><i className="n" /><i /><i className="n" /><i /><i /><i className="n" /><i /><i className="n" /><i /><i className="n" /><i />
        </div>
        <div className="ct-kick">Estudio MJ</div>
        <div className="ct-title">Curso de Teclado</div>
        <div className="ct-sub">
          De la primera tecla a acompañar al coro en la misa. Teclado interactivo con <b>sonido</b>, acordes, ritmos con metrónomo y desafíos. Todo con notas Do, Re, Mi.
        </div>
        <div className="ct-stats">
          <div><b>{totalMods}</b>módulos</div>
          <div><b>{NIVELES.length}</b>niveles</div>
          <div><b>{cuenta("ensayo")}</b>ensayos guiados</div>
          <div><b>{cuenta("quiz")}</b>desafíos</div>
        </div>
      </div>

      <div className="ct-levels">
        {NIVELES.map((n) => {
          const p = progresoNivel(n);
          const on = n.id === nivelId;
          return (
            <button key={n.id} className={"ct-level" + (on ? " on" : "")} style={{ borderColor: on ? n.color : undefined }} onClick={() => cambiarNivel(n.id)}>
              <h3 style={{ color: n.color }}>{n.nombre}</h3>
              <p><b>{n.lema}</b> · {n.duracion}</p>
              <div className="ct-prog-bar"><i style={{ width: p.pct + "%", background: n.color }} /></div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>{p.hechos} de {p.total} módulos</div>
            </button>
          );
        })}
      </div>

      <div className="ct-main">
        <div className="ct-list">
          {nivel.modulos.map((m) => {
            const num = NIVELES.flatMap((x) => x.modulos).indexOf(m) + 1;
            return (
              <button key={m.id} className={"ct-mod" + (m.id === modId ? " on" : "")} onClick={() => abrirModulo(m.id)}>
                <span className="ct-mod-n" style={{ background: done[m.id] ? NAVY : nivel.color }}>{done[m.id] ? "✓" : num}</span>
                <div>
                  <b>{m.titulo}</b>
                  <span>{m.resumen}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div ref={contRef}>
          {!mod ? (
            <div className="ct-card">
              <div className="ct-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre}</div>
              <h2>{nivel.lema}</h2>
              <p className="ct-p">{nivel.descripcion}</p>
              <div className="ct-note tip"><span>🎧</span><div>Activa el sonido de tu dispositivo: cada tecla, acorde y ritmo se puede <b>escuchar</b>. Puedes practicar con un teclado real o directamente en la pantalla.</div></div>
              <Boton color={nivel.color} activo onClick={() => abrirModulo(nivel.modulos[0].id)}>Comenzar →</Boton>
            </div>
          ) : (
            <div className="ct-card">
              <div className="ct-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre} · módulo {idxMod + 1} de {nivel.modulos.length}</div>
              <h2>{mod.titulo}</h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>{mod.resumen}</div>
              {mod.bloques.map((b, i) => (
                <Render key={mod.id + i} b={b} color={nivel.color} check={check} setCheck={alternarCheck} mod={mod} />
              ))}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22, alignItems: "center" }}>
                {idxMod > 0 && <Boton onClick={() => abrirModulo(nivel.modulos[idxMod - 1].id)}>← Anterior</Boton>}
                <Boton color={NAVY} activo={!!done[mod.id]} onClick={() => marcarModulo(mod.id)}>
                  {done[mod.id] ? "✓ Módulo completado" : "Marcar como completado"}
                </Boton>
                {idxMod < nivel.modulos.length - 1 ? (
                  <Boton color={nivel.color} activo onClick={() => abrirModulo(nivel.modulos[idxMod + 1].id)}>Siguiente módulo →</Boton>
                ) : (
                  NIVELES.indexOf(nivel) < NIVELES.length - 1 && (
                    <Boton color={nivel.color} activo onClick={() => cambiarNivel(NIVELES[NIVELES.indexOf(nivel) + 1].id)}>Siguiente nivel →</Boton>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 14 }}>
        Los sonidos son un piano sintetizado para guiar el oído. Tu progreso se guarda en este dispositivo.
      </div>
    </div>
  );
}
