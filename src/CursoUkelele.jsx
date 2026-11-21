import { useState, useEffect, useRef, useCallback } from "react";
import { OPEN_MIDI, CUERDAS, CHORDS, NIVEL_ACORDES, NIVELES, TONOS } from "./CursoUkeleleData";

// ═══════════════════════════════════════════════════════════════
//  MOTOR DE AUDIO — ukelele sintetizado (Karplus-Strong), sin archivos
// ═══════════════════════════════════════════════════════════════
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let _ctx = null;
function audioCtx() {
  try {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}
const _bufCache = {};
function pluckBuffer(c, freq) {
  const key = c.sampleRate + "_" + Math.round(freq * 100);
  if (_bufCache[key]) return _bufCache[key];
  const sr = c.sampleRate;
  const N = Math.max(2, Math.round(sr / freq - 0.5));
  const real = sr / (N + 0.5);
  const len = Math.floor(sr * 1.8);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const line = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 2 - 1;
    prev = prev * 0.35 + r * 0.65;
    line[i] = prev;
  }
  const decay = 0.9965; // cuerdas de nylon cortas: se apagan rápido
  let idx = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const out = line[idx];
    d[i] = out;
    const nxt = line[(idx + 1) % N];
    line[idx] = (out + nxt) * 0.5 * decay;
    idx = (idx + 1) % N;
    const a = Math.abs(out);
    if (a > peak) peak = a;
  }
  const g = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(sr * 0.2);
  for (let i = 0; i < len; i++) {
    let v = d[i] * g;
    if (i > len - fade) v *= (len - i) / fade;
    d[i] = v;
  }
  const res = { buf, rate: freq / real };
  _bufCache[key] = res;
  return res;
}
function playNote(c, freq, when, vol = 0.3) {
  const { buf, rate } = pluckBuffer(c, freq);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = vol;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5600;
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(when);
}
const notasDeAcorde = (frets) => frets.map((f, i) => ({ cuerda: i, midi: OPEN_MIDI[i] + f }));
// style: "down" | "up" | "arp"
function tocarAcorde(frets, style = "down", when = null, opts = {}) {
  const c = audioCtx();
  if (!c || !frets) return;
  const t0 = when != null ? when : c.currentTime + 0.02;
  let notas = notasDeAcorde(frets);
  const vol = opts.vol != null ? opts.vol : 0.34;
  if (style === "up") notas = [...notas].reverse();
  const gap = style === "arp" ? 0.28 : opts.gap || 0.022;
  notas.forEach((n, i) => playNote(c, midiHz(n.midi), t0 + i * gap, (style === "arp" ? vol * 1.5 : vol) * (0.85 + 0.15 * Math.random())));
}
function tocarCuerda(i, fret = 0, when = null, vol = 0.45) {
  const c = audioCtx();
  if (!c) return;
  playNote(c, midiHz(OPEN_MIDI[i] + fret), when != null ? when : c.currentTime + 0.02, vol);
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
function alSonar(timers, c, t, fn) {
  timers.current.push(setTimeout(fn, Math.max(0, (t - c.currentTime) * 1000)));
}

// ═══════════════════════════════════════════════════════════════
//  NOTACIÓN LATINA
// ═══════════════════════════════════════════════════════════════
const LATINO = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
function aLatino(nombre) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(String(nombre));
  if (!m) return nombre;
  return LATINO[m[1]] + m[2] + m[3];
}
const NOMBRES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Sib", "Si"];
const notaNombre = (m) => NOMBRES[((m % 12) + 12) % 12];

// ═══════════════════════════════════════════════════════════════
//  DIAGRAMA DE ACORDE (4 cuerdas)
// ═══════════════════════════════════════════════════════════════
function ChordDiagram({ chord, color = "#1e3a5f", width = 104 }) {
  const W = 104;
  const H = 140;
  const left = 22;
  const top = 30;
  const sp = 20;
  const fh = 22;
  const frets = chord.frets;
  const X = (i) => left + i * sp;
  const Y = (f) => top + (f - 0.5) * fh;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} role="img" aria-label="Diagrama de acorde" style={{ display: "block" }}>
      <rect x={left - 1} y={top - 3} width={sp * 3 + 2} height={4} rx={1} fill={color} />
      {[0, 1, 2, 3].map((i) => (
        <line key={"s" + i} x1={X(i)} y1={top} x2={X(i)} y2={top + fh * 4.5} stroke="#94a3b8" strokeWidth={1.3} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={"f" + i} x1={left} y1={top + i * fh} x2={left + sp * 3} y2={top + i * fh} stroke="#cbd5e1" strokeWidth="1" />
      ))}
      {chord.barre && (
        <rect x={X(4 - chord.barre.from) - 7} y={Y(chord.barre.fret) - 7} width={X(4 - chord.barre.to) - X(4 - chord.barre.from) + 14} height={14} rx={7} fill={color} />
      )}
      {frets.map((f, i) => {
        if (f === 0) return <circle key={"o" + i} cx={X(i)} cy={top - 12} r={4} fill="none" stroke="#475569" strokeWidth="1.4" />;
        const fin = chord.fingers[i];
        return (
          <g key={"d" + i}>
            <circle cx={X(i)} cy={Y(f)} r={7.4} fill={color} />
            {fin > 0 && (
              <text x={X(i)} y={Y(f) + 3.6} fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle">
                {fin}
              </text>
            )}
          </g>
        );
      })}
      {["Sol", "Do", "Mi", "La"].map((n, i) => (
        <text key={"n" + i} x={X(i)} y={H - 4} fontSize="8.5" fontWeight="700" fill="#94a3b8" textAnchor="middle">{n}</text>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENTES DEL CURSO
// ═══════════════════════════════════════════════════════════════
const NAVY = "#0f2744";
const ORO = "#c9a227";

function Boton({ children, onClick, activo, color = NAVY, pequeno, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        border: `1px solid ${activo ? color : "#d6dee9"}`,
        background: activo ? color : "#fff",
        color: activo ? "#fff" : color,
        borderRadius: 10,
        padding: pequeno ? "5px 10px" : "8px 14px",
        fontSize: pequeno ? 11.5 : 12.5,
        fontWeight: 700,
        cursor: "pointer",
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

function ChordCard({ nombre, color }) {
  const ch = CHORDS[nombre];
  if (!ch) return null;
  return (
    <div className="cu-chord">
      <div className="cu-chord-name">{aLatino(nombre)}</div>
      <ChordDiagram chord={ch} color={color} />
      <div className="cu-chord-notas">{notasDeAcorde(ch.frets).map((n) => notaNombre(n.midi)).join(" · ")}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", justifyContent: "center", whiteSpace: "nowrap" }}>
        <Boton pequeno color={color} onClick={() => tocarAcorde(ch.frets, "down")}>⬇ Rasgueo</Boton>
        <Boton pequeno color={color} onClick={() => tocarAcorde(ch.frets, "arp")}>♪ Cuerdas</Boton>
      </div>
      <div className="cu-chord-tip">{ch.tip}</div>
    </div>
  );
}

function Afinacion() {
  return (
    <div className="cu-panel">
      <div className="cu-panel-t">🎵 Afinación de referencia (toca para escuchar)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CUERDAS.map((c, i) => (
          <button key={i} className="cu-string" onClick={() => tocarCuerda(i)}>
            <b>{c.n}ª</b>
            <span>{c.es}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Afinación estándar: Sol – Do – Mi – La, de la 4ª a la 1ª cuerda.</div>
    </div>
  );
}

// Patrones para las progresiones (pasos de corchea por compás)
const PATRONES = {
  cuatro: { pulsos: 4, p: "D-D-D-D-" },
  universal: { pulsos: 4, p: "D-DU-UDU" },
  marcha: { pulsos: 4, p: "D-DUD-DU" },
  vals: { pulsos: 3, p: "D-DUDU" },
  arpegio: { pulsos: 4, p: "12341234", arp: true },
};
// cuerdas del punteo: 3ª (Do, pulgar) – 4ª – 2ª – 1ª
const ORDEN_ARP = { 1: 1, 2: 0, 3: 2, 4: 3 };

function Progresion({ chords, bpm: bpm0, label, color, patron = "universal" }) {
  const [bpm, setBpm] = useState(bpm0 || 70);
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const parar = useRef(null);
  const timers = useRef([]);
  const pat = PATRONES[patron] || PATRONES.universal;
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
    const n = pat.p.length;
    parar.current = iniciarBucle(bpm, 2, (i, t) => {
      const compas = Math.floor(i / n) % chords.length;
      const paso = i % n;
      const ch = CHORDS[chords[compas]];
      if (paso === 0) alSonar(timers, c, t, () => setActivo(compas));
      if (paso % 2 === 0) click(c, t, paso === 0);
      if (!ch) return;
      const g = pat.p[paso];
      if (pat.arp) {
        const cu = ORDEN_ARP[g];
        tocarCuerda(cu, ch.frets[cu], t, paso === 0 ? 0.5 : 0.38);
      } else if (g === "D") tocarAcorde(ch.frets, "down", t, { vol: paso === 0 ? 0.38 : 0.3 });
      else if (g === "U") tocarAcorde(ch.frets, "up", t, { vol: 0.22, gap: 0.016 });
    });
    return limpiar;
  }, [sonando, bpm, clave, patron]);
  return (
    <div className="cu-panel">
      <div className="cu-panel-t">🎼 {label}</div>
      <div className="cu-prog">
        {chords.map((n, i) => (
          <button key={i} className={"cu-prog-c" + (activo === i ? " on" : "")} style={activo === i ? { background: color, borderColor: color } : null} onClick={() => CHORDS[n] && tocarAcorde(CHORDS[n].frets)}>
            {aLatino(n)}
          </button>
        ))}
      </div>
      <div className="cu-prog-d">
        {chords.map((n, i) =>
          CHORDS[n] ? (
            <div key={i} style={{ opacity: activo === -1 || activo === i ? 1 : 0.35 }}>
              <ChordDiagram chord={CHORDS[n]} color={color} width={64} />
            </div>
          ) : null
        )}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar y practicar"}
        </Boton>
        <label className="cu-vel">
          Velocidad {bpm}
          <input type="range" min={40} max={140} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
        <span className="cu-chip">{pat.pulsos === 3 ? "3/4" : "4/4"}</span>
      </div>
    </div>
  );
}

function Rasgueo({ pattern, conteo, chord, label, color }) {
  const [bpm, setBpm] = useState(70);
  const [acorde, setAcorde] = useState(chord || "C");
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const parar = useRef(null);
  const timers = useRef([]);
  const pasos = pattern.length;
  const limpiar = () => {
    if (parar.current) parar.current();
    parar.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => limpiar, []);
  useEffect(() => {
    if (!sonando) {
      limpiar();
      setActivo(-1);
      return;
    }
    const c = audioCtx();
    if (!c) return;
    const ch = CHORDS[acorde];
    parar.current = iniciarBucle(bpm, 2, (i, t) => {
      const paso = i % pasos;
      alSonar(timers, c, t, () => setActivo(paso));
      if (paso % 2 === 0) click(c, t, paso === 0);
      const g = pattern[paso];
      if (g === "D" && ch) tocarAcorde(ch.frets, "down", t, { vol: paso % 2 === 0 ? 0.38 : 0.3 });
      if (g === "U" && ch) tocarAcorde(ch.frets, "up", t, { vol: 0.22, gap: 0.016 });
    });
    return limpiar;
  }, [sonando, bpm, acorde, pattern, pasos]);
  return (
    <div className="cu-panel">
      <div className="cu-panel-t">🥁 {label}</div>
      <div className="cu-pat" style={{ gridTemplateColumns: `repeat(${pasos}, minmax(0,1fr))` }}>
        {pattern.split("").map((g, i) => (
          <div key={i} className="cu-pat-s" style={activo === i ? { background: color, color: "#fff", borderColor: color } : null}>
            <span className="cu-pat-g">{g === "D" ? "⬇" : g === "U" ? "⬆" : "·"}</span>
            <span className="cu-pat-n">{conteo[i] || ""}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Practicar con audio"}
        </Boton>
        <label className="cu-vel">
          Acorde
          <select value={acorde} onChange={(e) => setAcorde(e.target.value)} className="cu-sel">
            {["C", "Am", "F", "G", "G7", "Em", "D", "Dm"].map((n) => (
              <option key={n} value={n}>{aLatino(n)}</option>
            ))}
          </select>
        </label>
        <label className="cu-vel">
          Velocidad {bpm}
          <input type="range" min={40} max={140} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function Quiz({ opciones, label, color }) {
  const genera = useCallback(
    (prev) => {
      let x;
      do x = opciones[Math.floor(Math.random() * opciones.length)];
      while (opciones.length > 1 && x === prev);
      return x;
    },
    [opciones]
  );
  const [pregunta, setPregunta] = useState(() => genera(null));
  const [resp, setResp] = useState(null);
  const [racha, setRacha] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [total, setTotal] = useState(0);
  const responder = (r) => {
    if (resp) return;
    setResp(r);
    setTotal((t) => t + 1);
    if (r === pregunta) {
      setAciertos((a) => a + 1);
      setRacha((s) => s + 1);
    } else setRacha(0);
  };
  const siguiente = () => {
    setPregunta(genera(pregunta));
    setResp(null);
  };
  return (
    <div className="cu-quiz" style={{ borderColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="cu-k" style={{ color }}>MINI DESAFÍO</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{label}</div>
        </div>
        <div className="cu-score">
          <span>Racha <b>{racha}</b></span>
          <span>Aciertos <b>{aciertos}/{total}</b></span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 4px" }}>
        <ChordDiagram chord={CHORDS[pregunta]} color={color} width={118} />
      </div>
      <div className="cu-quiz-ops">
        {opciones.map((o) => (
          <button key={o} onClick={() => responder(o)} className={"cu-quiz-op" + (resp && o === pregunta ? " ok" : "") + (resp === o && o !== pregunta ? " mal" : "")}>
            {aLatino(o)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton pequeno color={color} onClick={() => tocarAcorde(CHORDS[pregunta].frets)}>🔊 Escuchar</Boton>
        {resp && (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: resp === pregunta ? NAVY : "#a63232" }}>
              {resp === pregunta ? "¡Correcto!" : `Era ${aLatino(pregunta)}`}
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
    <div className="cu-panel">
      <div className="cu-panel-t">📖 Toca los acordes para escucharlos</div>
      {lineas.map((l, li) => {
        const partes = [];
        const pre = l.split("[")[0];
        if (pre) partes.push({ a: null, x: pre });
        const re = /\[([^\]]+)\]([^[]*)/g;
        let m;
        while ((m = re.exec(l))) partes.push({ a: m[1], x: m[2] });
        return (
          <div key={li} className="cu-cif">
            {partes.map((p, i) => (
              <span key={i} className="cu-cif-s">
                {p.a ? (
                  <button className="cu-cif-a" style={{ color }} onClick={() => CHORDS[p.a] && tocarAcorde(CHORDS[p.a].frets)}>{aLatino(p.a)}</button>
                ) : (
                  <span className="cu-cif-a">&nbsp;</span>
                )}
                <span className="cu-cif-x">{p.x.replace(/ /g, " ")}</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Transpositor({ color }) {
  const [i, setI] = useState(0);
  const tono = TONOS[i];
  return (
    <div>
      <div className="cu-panel" style={{ marginBottom: 0 }}>
        <div className="cu-panel-t">🔀 Elige el tono</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TONOS.map((t, k) => (
            <Boton key={t.t} pequeno color={color} activo={i === k} onClick={() => setI(k)}>{t.t}</Boton>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 10 }}>
          La misma progresión (I – vi – IV – V7) en {tono.t}: <b style={{ color }}>{tono.chords.map(aLatino).join(" – ")}</b>
        </div>
      </div>
      <Progresion key={i} chords={tono.chords} bpm={72} patron="universal" label={`Progresión en el tono de ${tono.t}`} color={color} />
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
    <div className="cu-ensayo" style={{ borderColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="cu-k" style={{ color }}>ENSAYO GUIADO · {total} min</div>
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
      <ol className="cu-steps">
        {pasos.map((p, i) => (
          <li key={i} style={i === paso && corriendo ? { borderColor: color, background: "#fff" } : null}>
            <div className="cu-step-h">
              <b>{p.t}</b>
              <span>{i === paso && corriendo ? `${mm}:${ss}` : `${p.min} min`}{p.bpm > 0 ? ` · ${p.bpm} pulsos/min` : ""}</span>
            </div>
            <div className="cu-step-t">{p.txt}</div>
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
      return <p className="cu-p" dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />;
    case "h":
      return <h4 className="cu-h">{b.x}</h4>;
    case "ul":
      return (
        <ul className="cu-ul">
          {b.items.map((x, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: negritas(x) }} />
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className="cu-note tip">
          <span>💡</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "warn":
      return (
        <div className="cu-note warn">
          <span>⚠️</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "tuning":
      return <Afinacion />;
    case "chords":
      return (
        <div className="cu-chords">
          {b.names.map((n) => (
            <ChordCard key={n} nombre={n} color={color} />
          ))}
        </div>
      );
    case "prog":
      return <Progresion chords={b.chords} bpm={b.bpm} label={b.label} patron={b.patron} color={color} />;
    case "rasgueo":
      return <Rasgueo pattern={b.pattern} conteo={b.conteo} chord={b.chord} label={b.label} color={color} />;
    case "quiz":
      return <Quiz opciones={b.opciones} label={b.label} color={color} />;
    case "cifrado":
      return <Cifrado lineas={b.lineas} color={color} />;
    case "transponer":
      return <Transpositor color={color} />;
    case "ensayo":
      return <EnsayoGuiado titulo={b.titulo} pasos={b.pasos} color={color} />;
    case "postura":
      return (
        <div style={{ display: "grid", gap: 12, margin: "14px 0" }}>
          {b.cards.map((c, i) => (
            <div key={i} className="cu-post">
              <div className="cu-post-h" style={{ color }}>
                <span style={{ background: color }}>{i + 1}</span>
                {c.titulo}
              </div>
              <div className="cu-post-b">
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
        <div className="cu-panel">
          <div className="cu-panel-t">✅ Marca lo que ya dominas</div>
          {b.items.map((x, i) => {
            const k = mod.id + ":" + x;
            return (
              <label key={i} className="cu-check">
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
export const KEY_UKELELE = "curso_ukelele_progreso_v1";
function leer() {
  try {
    return JSON.parse(localStorage.getItem(KEY_UKELELE) || "{}") || {};
  } catch {
    return {};
  }
}
function guardar(v) {
  try {
    localStorage.setItem(KEY_UKELELE, JSON.stringify(v));
  } catch {}
}

const CSS = `
.cu{max-width:1100px;font-family:inherit;color:#1e293b}
.cu *{box-sizing:border-box}
.cu-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px 22px;background:#fff;border:1px solid #e6ebf2;box-shadow:0 10px 30px rgba(15,39,68,.07)}
.cu-hero:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,${ORO},#e8cf7a)}
.cu-hero-ico{position:absolute;right:18px;top:16px;color:#e3e8ef}
.cu-kick{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:${ORO};font-weight:800}
.cu-title{letter-spacing:-.02em;font-size:clamp(20px,2.6vw,26px);line-height:1.1;margin:4px 0 6px;font-weight:800;color:${NAVY}}
.cu-sub{max-width:560px;font-size:13.5px;line-height:1.6;color:#516074}
.cu-stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:12px}
.cu-stats div{font-size:10.5px;color:#7b8796;letter-spacing:.06em;text-transform:uppercase}
.cu-stats b{display:block;font-size:18px;color:${NAVY};letter-spacing:0}
.cu-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:16px 0 12px}
.cu-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.cu-level{text-align:left;border:1.5px solid #e2e8f0;background:#fff;border-radius:18px;padding:14px 16px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.cu-level.on{box-shadow:0 10px 26px rgba(15,39,68,.12)}
.cu-level h3{margin:0;font-size:16px}
.cu-level p{margin:4px 0 8px;font-size:12px;color:#64748b;line-height:1.4}
.cu-prog-bar{height:6px;background:#eef2f7;border-radius:6px;overflow:hidden}
.cu-prog-bar i{display:block;height:100%;border-radius:6px}
.cu-main{display:grid;grid-template-columns:290px minmax(0,1fr);gap:16px;align-items:start}
.cu-list{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:8px;position:sticky;top:10px}
.cu-mod{width:100%;display:flex;gap:10px;align-items:flex-start;text-align:left;border:none;background:transparent;border-radius:12px;padding:9px 10px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.cu-mod.on{background:#f4f6fa}
.cu-mod-n{flex:0 0 26px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff}
.cu-mod b{display:block;font-size:13px;color:${NAVY};line-height:1.25}
.cu-mod div span{display:block;font-size:11.5px;color:#64748b;line-height:1.35;margin-top:2px}
.cu-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:22px 24px;box-shadow:0 6px 20px rgba(15,39,68,.05)}
.cu-card h2{font-size:clamp(20px,2.6vw,26px);margin:2px 0 4px;color:${NAVY};letter-spacing:-.02em}
.cu-p{font-size:14px;line-height:1.7;color:#334155;margin:12px 0}
.cu-h{font-size:16px;color:${NAVY};margin:20px 0 4px}
.cu-ul{margin:8px 0 12px;padding-left:20px;font-size:13.5px;line-height:1.7;color:#334155}
.cu-ul li{margin:4px 0}
.cu-note{display:flex;gap:10px;border-radius:14px;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.6}
.cu-note.tip{background:#fdf7e3;border:1px solid #efdca0;color:#6b5513}
.cu-note.warn{background:#fdf0f0;border:1px solid #f2c4c4;color:#7f2a2a}
.cu-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin:14px 0}
.cu-panel-t{font-size:13px;font-weight:800;color:${NAVY};margin-bottom:10px}
.cu-chords{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:14px 0}
.cu-chord{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center}
.cu-chord-name{font-size:21px;font-weight:800;color:${NAVY}}
.cu-chord-notas{font-size:11px;font-weight:700;color:#94a3b8;margin-top:2px}
.cu-chord-tip{font-size:11.5px;line-height:1.5;color:#64748b;margin-top:8px}
.cu-string{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:62px;border:1px solid #d6dee9;background:#fff;border-radius:14px;padding:8px 10px;cursor:pointer;font-family:inherit}
.cu-string b{font-size:10px;color:#94a3b8}.cu-string span{font-size:17px;font-weight:800;color:${NAVY}}
.cu-prog{display:flex;gap:8px;flex-wrap:wrap}
.cu-prog-c{min-width:64px;text-align:center;padding:10px 14px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-family:inherit;font-size:18px;font-weight:800;color:${NAVY};cursor:pointer;transition:background .12s,color .12s}
.cu-prog-c.on{color:#fff}
.cu-prog-d{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.cu-prog-d div{transition:opacity .15s}
.cu-vel{font-size:12px;color:#475569;display:flex;align-items:center;gap:8px}
.cu-vel input{width:110px;accent-color:${NAVY}}
.cu-sel{border:1px solid #d6dee9;border-radius:8px;padding:4px 6px;font-size:12px;font-family:inherit;background:#fff}
.cu-chip{font-size:11px;font-weight:800;color:${NAVY};background:#eef2f7;border-radius:8px;padding:4px 8px}
.cu-pat{display:grid;gap:5px}
.cu-pat-s{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid #cbd5e1;border-radius:10px;padding:6px 0;background:#fff;color:${NAVY};transition:background .1s}
.cu-pat-g{font-size:18px;font-weight:800;line-height:1.1}.cu-pat-n{font-size:11px;font-weight:700;opacity:.65;min-height:13px}
.cu-quiz,.cu-ensayo{border:2px solid;border-radius:18px;padding:16px 18px;margin:18px 0;background:#fcfcfd}
.cu-k{font-size:10.5px;font-weight:800;letter-spacing:.18em}
.cu-score{display:flex;gap:12px;font-size:12px;color:#64748b}
.cu-score b{color:${NAVY};font-size:14px}
.cu-quiz-ops{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;margin-top:8px}
.cu-quiz-op{border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;padding:10px 4px;font-family:inherit;font-size:15px;font-weight:800;color:${NAVY};cursor:pointer;-webkit-tap-highlight-color:transparent}
.cu-quiz-op.ok{background:${NAVY};border-color:${NAVY};color:#fff}
.cu-quiz-op.mal{background:#fdf0f0;border-color:#e8a5a5;color:#a63232}
.cu-cif{display:flex;flex-wrap:wrap;margin:6px 0 10px;row-gap:4px}
.cu-cif-s{display:inline-flex;flex-direction:column}
.cu-cif-a{font-family:inherit;font-size:13px;font-weight:800;border:none;background:none;padding:0 8px 0 0;text-align:left;cursor:pointer;min-height:18px;line-height:18px}
.cu-cif-x{font-size:15px;color:#1e293b;line-height:1.4}
.cu-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.cu-steps li{border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;background:#f9fafc}
.cu-step-h{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:${NAVY}}
.cu-step-h span{font-variant-numeric:tabular-nums;font-weight:700;color:#475569;white-space:nowrap}
.cu-step-t{font-size:12.5px;color:#64748b;line-height:1.5;margin-top:3px}
.cu-post{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff}
.cu-post-h{display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px;padding:10px 14px;border-bottom:1px solid #eef2f7}
.cu-post-h span{width:24px;height:24px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px}
.cu-post-b{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px 14px}
.cu-post-b p{margin:4px 0 0;font-size:12.8px;line-height:1.6;color:#334155}
.cu-post-b b{font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.cu-post-b .ok{color:${NAVY}}.cu-post-b .mal{color:#a63232}.cu-post-b .fix{color:#8a6a12}
.cu-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#334155;padding:5px 0;cursor:pointer;line-height:1.45}
.cu-check input{width:18px;height:18px;margin-top:1px;accent-color:${NAVY}}
@media(max-width:900px){.cu-main{grid-template-columns:minmax(0,1fr)}.cu-list{position:static}.cu-card{padding:16px}.cu-hero-ico{display:none}}
`;

export default function CursoUkelele() {
  const [estado, setEstado] = useState(leer);
  const [nivelId, setNivelId] = useState(estado.nivel || "basico");
  const [modId, setModId] = useState(null);
  const [vista, setVista] = useState("curso");
  const [filtro, setFiltro] = useState("basico");
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
  const todos = NIVELES.flatMap((n) => n.modulos);
  const cuenta = (t) => todos.reduce((a, m) => a + m.bloques.filter((b) => b.t === t).length, 0);
  const abrirModulo = (id) => {
    setModId(id);
    setTimeout(() => {
      const narrow = window.matchMedia && window.matchMedia("(max-width:900px)").matches;
      const el = narrow ? contRef.current : topRef.current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  return (
    <div className="cu" ref={topRef}>
      <style>{CSS}</style>
      <div className="cu-hero">
        <svg className="cu-hero-ico" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8.5" cy="15.5" r="4.5" />
          <path d="M11.7 12.3 19 5" />
          <path d="M17.5 3.5l3 3" />
          <circle cx="8.5" cy="15.5" r="1.2" />
        </svg>
        <div className="cu-kick">Estudio MJ</div>
        <div className="cu-title">Curso de Ukelele</div>
        <div className="cu-sub">
          El instrumento más amable para empezar a acompañar. Acordes con diagrama y <b>audio</b>, rasgueos con metrónomo y desafíos. Todo con notas Do, Re, Mi.
        </div>
        <div className="cu-stats">
          <div><b>{todos.length}</b>módulos</div>
          <div><b>{Object.keys(CHORDS).length}</b>acordes con audio</div>
          <div><b>{cuenta("ensayo")}</b>ensayos guiados</div>
        </div>
      </div>

      <div className="cu-bar">
        <Boton activo={vista === "curso"} onClick={() => setVista("curso")}>📘 Curso</Boton>
        <Boton activo={vista === "acordes"} onClick={() => setVista("acordes")}>🎵 Biblioteca de acordes</Boton>
      </div>

      {vista === "acordes" ? (
        <div className="cu-card">
          <h2>Biblioteca de acordes</h2>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Toca “Rasgueo” o “Cuerdas” para escuchar cada acorde.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {NIVELES.map((n) => (
              <Boton key={n.id} color={n.color} activo={filtro === n.id} onClick={() => setFiltro(n.id)}>
                {n.nombre} ({NIVEL_ACORDES[n.id].length})
              </Boton>
            ))}
          </div>
          <div className="cu-chords">
            {NIVEL_ACORDES[filtro].map((n) => (
              <ChordCard key={n} nombre={n} color={(NIVELES.find((x) => x.id === filtro) || {}).color} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="cu-levels">
            {NIVELES.map((n) => {
              const p = progresoNivel(n);
              const on = n.id === nivelId;
              return (
                <button key={n.id} className={"cu-level" + (on ? " on" : "")} style={{ borderColor: on ? n.color : undefined }} onClick={() => cambiarNivel(n.id)}>
                  <h3 style={{ color: n.color }}>{n.nombre}</h3>
                  <p><b>{n.lema}</b> · {n.duracion}</p>
                  <div className="cu-prog-bar"><i style={{ width: p.pct + "%", background: n.color }} /></div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>{p.hechos} de {p.total} módulos</div>
                </button>
              );
            })}
          </div>
          <div className="cu-main">
            <div className="cu-list">
              {nivel.modulos.map((m) => (
                <button key={m.id} className={"cu-mod" + (m.id === modId ? " on" : "")} onClick={() => abrirModulo(m.id)}>
                  <span className="cu-mod-n" style={{ background: done[m.id] ? NAVY : nivel.color }}>{done[m.id] ? "✓" : todos.indexOf(m) + 1}</span>
                  <div>
                    <b>{m.titulo}</b>
                    <span>{m.resumen}</span>
                  </div>
                </button>
              ))}
            </div>
            <div ref={contRef}>
              {!mod ? (
                <div className="cu-card">
                  <div className="cu-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre}</div>
                  <h2>{nivel.lema}</h2>
                  <p className="cu-p">{nivel.descripcion}</p>
                  <div className="cu-note tip"><span>🎧</span><div>Activa el sonido de tu dispositivo: cada acorde, rasgueo y progresión se puede <b>escuchar</b> y practicar con metrónomo.</div></div>
                  <Boton color={nivel.color} activo onClick={() => abrirModulo(nivel.modulos[0].id)}>Comenzar →</Boton>
                </div>
              ) : (
                <div className="cu-card">
                  <div className="cu-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre} · módulo {idxMod + 1} de {nivel.modulos.length}</div>
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
        </>
      )}
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 14 }}>
        Los sonidos son un ukelele sintetizado para guiar el oído. Tu progreso se guarda en este dispositivo.
      </div>
    </div>
  );
}
