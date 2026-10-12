import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { OPEN_MIDI, CUERDAS_NOMBRE, CHORDS, NIVEL_ACORDES, NIVELES } from "./CursoGuitarraData";

// ═══════════════════════════════════════════════════════════════
//  MOTOR DE AUDIO — guitarra sintetizada (Karplus-Strong), sin archivos
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
  const len = Math.floor(sr * 3.2);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const line = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 2 - 1;
    prev = prev * 0.45 + r * 0.55; // excitación algo suavizada: más cálida
    line[i] = prev;
  }
  const decay = freq < 200 ? 0.9992 : freq < 400 ? 0.999 : 0.9985;
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
  const fade = Math.floor(sr * 0.25);
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
  lp.frequency.value = 5200;
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(when);
}
const notasDeAcorde = (frets) =>
  frets.map((f, i) => (f >= 0 ? { cuerda: i, midi: OPEN_MIDI[i] + f } : null)).filter(Boolean);

// style: "down" | "up" | "arp" | "block" ; opts.gap en segundos, opts.vol, opts.soloAgudas
function tocarAcorde(frets, style = "down", when = null, opts = {}) {
  const c = audioCtx();
  if (!c || !frets) return;
  const t0 = when != null ? when : c.currentTime + 0.02;
  let notas = notasDeAcorde(frets);
  if (opts.soloAgudas) notas = notas.filter((n) => n.cuerda >= 2);
  if (!notas.length) return;
  const vol = (opts.vol != null ? opts.vol : 0.34) / Math.sqrt(notas.length / 2);
  if (style === "up") notas = [...notas].reverse();
  const gap = style === "arp" ? 0.3 : style === "block" ? 0.004 : opts.gap || 0.028;
  notas.forEach((n, i) => {
    const v = style === "arp" ? vol * 1.6 : vol * (0.85 + 0.15 * Math.random());
    playNote(c, midiHz(n.midi), t0 + i * gap, v);
  });
}
function tocarCuerdaAbierta(i) {
  const c = audioCtx();
  if (!c) return;
  playNote(c, midiHz(OPEN_MIDI[i]), c.currentTime + 0.02, 0.5);
}
function click(c, when, accent) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, when + 0.003);
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

// ═══════════════════════════════════════════════════════════════
//  NOTACIÓN
// ═══════════════════════════════════════════════════════════════
const LATINO = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
function aLatino(nombre) {
  return String(nombre)
    .split("/")
    .map((p) => {
      const m = /^([A-G])([#b]?)(.*)$/.exec(p);
      if (!m) return p;
      return LATINO[m[1]] + m[2] + m[3];
    })
    .join("/");
}
const SOSTENIDOS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LAT_A_US = { do: "C", re: "D", mi: "E", fa: "F", sol: "G", la: "A", si: "B" };
function parseAcorde(txt) {
  let s = txt.trim();
  if (!s) return null;
  const partes = s.split("/");
  const out = partes.map((p) => {
    const low = p.toLowerCase();
    let raiz = null;
    let resto = "";
    for (const k of ["sol", "do", "re", "mi", "fa", "la", "si"]) {
      if (low.startsWith(k)) {
        raiz = LAT_A_US[k];
        resto = p.slice(k.length);
        break;
      }
    }
    if (!raiz) {
      const m = /^([A-Ga-g])(.*)$/.exec(p);
      if (!m) return null;
      raiz = m[1].toUpperCase();
      resto = m[2];
    }
    let semi = SEMI[raiz];
    const a = /^([#b])(.*)$/.exec(resto);
    if (a) {
      semi += a[1] === "#" ? 1 : -1;
      resto = a[2];
    }
    return { semi: ((semi % 12) + 12) % 12, resto };
  });
  if (out.some((x) => !x)) return null;
  return out;
}
const NOMBRE_SEMI = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function transponer(txt, n) {
  const p = parseAcorde(txt);
  if (!p) return txt;
  return p.map((x) => NOMBRE_SEMI[(((x.semi + n) % 12) + 12) % 12] + x.resto).join("/");
}

// ═══════════════════════════════════════════════════════════════
//  DIAGRAMA DE ACORDE (SVG)
// ═══════════════════════════════════════════════════════════════
function ChordDiagram({ chord, color = "#1e3a5f", width = 120 }) {
  const W = 120;
  const H = 142;
  const left = 22;
  const top = 30;
  const sp = 15; // separación de cuerdas
  const fh = 20; // alto de traste
  const frets = chord.frets;
  const pos = frets.filter((f) => f > 0);
  const maxF = pos.length ? Math.max(...pos) : 0;
  const minF = pos.length ? Math.min(...pos) : 1;
  const base = maxF <= 5 ? 1 : minF;
  const X = (i) => left + i * sp;
  const Y = (f) => top + (f - base + 0.5) * fh;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} role="img" aria-label="Diagrama de acorde" style={{ display: "block" }}>
      {base === 1 ? (
        <rect x={left - 1} y={top - 3} width={sp * 5 + 2} height={4} rx={1} fill={color} />
      ) : (
        <text x={left - 14} y={top + fh * 0.62} fontSize="10" fontWeight="700" fill={color} textAnchor="middle">
          {base}º
        </text>
      )}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={"s" + i} x1={X(i)} y1={top} x2={X(i)} y2={top + fh * 5} stroke="#94a3b8" strokeWidth={1 + (5 - i) * 0.12} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={"f" + i} x1={left} y1={top + i * fh} x2={left + sp * 5} y2={top + i * fh} stroke="#cbd5e1" strokeWidth="1" />
      ))}
      {chord.barre && (
        <rect
          x={X(6 - chord.barre.from) - 6}
          y={Y(chord.barre.fret) - 6}
          width={X(6 - chord.barre.to) - X(6 - chord.barre.from) + 12}
          height={12}
          rx={6}
          fill={color}
        />
      )}
      {frets.map((f, i) => {
        if (f < 0)
          return (
            <text key={"m" + i} x={X(i)} y={top - 9} fontSize="11" fontWeight="700" fill="#b91c1c" textAnchor="middle">
              ×
            </text>
          );
        if (f === 0)
          return <circle key={"o" + i} cx={X(i)} cy={top - 12} r={4} fill="none" stroke="#475569" strokeWidth="1.4" />;
        const fin = chord.fingers[i];
        return (
          <g key={"d" + i}>
            <circle cx={X(i)} cy={Y(f)} r={6.6} fill={color} />
            {fin > 0 && (
              <text x={X(i)} y={Y(f) + 3.4} fontSize="9.5" fontWeight="800" fill="#fff" textAnchor="middle">
                {fin}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENTES DEL CURSO
// ═══════════════════════════════════════════════════════════════
const NAVY = "#0f2744";
const ORO = "#c9a227";

function Boton({ children, onClick, activo, color = "#1e3a5f", pequeno, title }) {
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

function ChordCard({ nombre, latino, color }) {
  const ch = CHORDS[nombre];
  if (!ch) return null;
  return (
    <div className="cg-chord">
      <div className="cg-chord-name">
        {latino ? aLatino(nombre) : nombre}
        <small>{latino ? nombre : aLatino(nombre)}</small>
      </div>
      <ChordDiagram chord={ch} color={color} width={112} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <Boton pequeno color={color} onClick={() => tocarAcorde(ch.frets, "down")} title="Escuchar rasgueo">
          ⬇ Rasgueo
        </Boton>
        <Boton pequeno color={color} onClick={() => tocarAcorde(ch.frets, "arp")} title="Escuchar cuerda por cuerda">
          ♪ Arpegio
        </Boton>
      </div>
      <div className="cg-chord-tip">{ch.tip}</div>
      <div className="cg-chord-str">
        {ch.frets.map((f, i) => (
          <span key={i} title={`Cuerda ${6 - i}`}>
            {f < 0 ? "×" : f}
          </span>
        ))}
      </div>
    </div>
  );
}

function Afinacion() {
  return (
    <div className="cg-panel">
      <div className="cg-panel-t">🎵 Afinación de referencia (toca para escuchar)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CUERDAS_NOMBRE.map((c, i) => (
          <button key={i} className="cg-string" onClick={() => tocarCuerdaAbierta(i)}>
            <b>{c.n}ª</b>
            <span>{c.es}</span>
            <small>{c.us}</small>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
        Afinación estándar: Mi – La – Re – Sol – Si – Mi (E A D G B E), de la 6ª a la 1ª cuerda.
      </div>
    </div>
  );
}

function Progresion({ chords, bpm: bpm0, label, latino, color }) {
  const [bpm, setBpm] = useState(bpm0 || 70);
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const parar = useRef(null);
  const timers = useRef([]);
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
    // 1 compás por acorde; 2 golpes por pulso (corcheas): D - D U - U D U
    const patron = "D-DU-UDU".split("");
    const pasos = 8;
    parar.current = iniciarBucle(bpm, 2, (i, t) => {
      const compas = Math.floor(i / pasos) % chords.length;
      const paso = i % pasos;
      const ch = CHORDS[chords[compas]];
      if (paso === 0) {
        const espera = Math.max(0, (t - c.currentTime) * 1000);
        timers.current.push(setTimeout(() => setActivo(compas), espera));
      }
      if (paso % 2 === 0) click(c, t, paso === 0);
      const g = patron[paso];
      if (g === "D" && ch) tocarAcorde(ch.frets, "down", t, { vol: paso === 0 ? 0.4 : 0.3 });
      if (g === "U" && ch) tocarAcorde(ch.frets, "up", t, { vol: 0.22, soloAgudas: true, gap: 0.018 });
    });
    return limpiar;
  }, [sonando, bpm, chords]);
  return (
    <div className="cg-panel">
      <div className="cg-panel-t">🎼 {label}</div>
      <div className="cg-prog">
        {chords.map((n, i) => (
          <div key={i} className={"cg-prog-c" + (activo === i ? " on" : "")} style={activo === i ? { background: color, borderColor: color } : null}>
            {latino ? aLatino(n) : n}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar y practicar"}
        </Boton>
        <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
          Velocidad {bpm} BPM
          <input type="range" min={40} max={130} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function Ritmo({ pattern, conteo, bpm: bpm0, chord, label, latino, color, stepsPerBeat = 2 }) {
  const [bpm, setBpm] = useState(bpm0 || 70);
  const [acorde, setAcorde] = useState(chord || "Em");
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
    parar.current = iniciarBucle(bpm, stepsPerBeat, (i, t) => {
      const paso = i % pasos;
      const espera = Math.max(0, (t - c.currentTime) * 1000);
      timers.current.push(setTimeout(() => setActivo(paso), espera));
      if (paso % stepsPerBeat === 0) click(c, t, paso === 0);
      const g = pattern[paso];
      if (g === "D" && ch) tocarAcorde(ch.frets, "down", t, { vol: paso % stepsPerBeat === 0 ? 0.4 : 0.3 });
      if (g === "U" && ch) tocarAcorde(ch.frets, "up", t, { vol: 0.22, soloAgudas: true, gap: 0.018 });
    });
    return limpiar;
  }, [sonando, bpm, acorde, pattern, pasos, stepsPerBeat]);
  const chordOpts = ["Em", "Am", "E", "A", "D", "C", "G", "Dm"];
  return (
    <div className="cg-panel">
      <div className="cg-panel-t">🥁 {label}</div>
      <div className="cg-pat" style={{ gridTemplateColumns: `repeat(${pasos}, minmax(0,1fr))` }}>
        {pattern.split("").map((g, i) => (
          <div key={i} className={"cg-pat-s" + (activo === i ? " on" : "")} style={activo === i ? { background: color, color: "#fff", borderColor: color } : null}>
            <span className="cg-pat-g">{g === "D" ? "⬇" : g === "U" ? "⬆" : "·"}</span>
            <span className="cg-pat-n">{conteo[i] || ""}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Practicar con audio"}
        </Boton>
        <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
          Acorde
          <select value={acorde} onChange={(e) => setAcorde(e.target.value)} style={{ border: "1px solid #d6dee9", borderRadius: 8, padding: "4px 6px", fontSize: 12 }}>
            {chordOpts.map((n) => (
              <option key={n} value={n}>
                {latino ? aLatino(n) : n}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
          {bpm} BPM
          <input type="range" min={40} max={130} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
      </div>
    </div>
  );
}

// Arpegio p-i-m-a-m-i : cuerdas relativas al bajo del acorde
function Arpegio({ chords, bpm: bpm0, latino, color }) {
  const [bpm, setBpm] = useState(bpm0 || 60);
  const [idx, setIdx] = useState(0);
  const [sonando, setSonando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const parar = useRef(null);
  const timers = useRef([]);
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
    // 8 corcheas por compás: p i m a m i m i  → bajo, 3ª, 2ª, 1ª, 2ª, 3ª, 2ª, 3ª
    const orden = ["bajo", 3, 4, 5, 4, 3, 4, 3];
    parar.current = iniciarBucle(bpm, 2, (i, t) => {
      const compas = Math.floor(i / 8) % chords.length;
      const paso = i % 8;
      const ch = CHORDS[chords[compas]];
      if (!ch) return;
      const notas = notasDeAcorde(ch.frets);
      const bajo = notas[0];
      let n = null;
      if (orden[paso] === "bajo") n = bajo;
      else n = notas.find((x) => x.cuerda === orden[paso]);
      if (paso === 0) {
        const espera = Math.max(0, (t - c.currentTime) * 1000);
        timers.current.push(setTimeout(() => setActivo(compas), espera));
      }
      if (paso % 2 === 0) click(c, t, paso === 0);
      if (n) playNote(c, midiHz(n.midi), t, paso === 0 ? 0.5 : 0.36);
    });
    return limpiar;
  }, [sonando, bpm, chords]);
  return (
    <div className="cg-panel">
      <div className="cg-panel-t">🎶 Arpegio p-i-m-a-m-i sobre la progresión</div>
      <div className="cg-prog">
        {chords.map((n, i) => (
          <div key={i} className={"cg-prog-c" + (activo === i ? " on" : "")} style={activo === i ? { background: color, borderColor: color } : null}>
            {latino ? aLatino(n) : n}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <Boton color={color} activo={sonando} onClick={() => setSonando((v) => !v)}>
          {sonando ? "■ Detener" : "▶ Escuchar y practicar"}
        </Boton>
        <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
          {bpm} BPM
          <input type="range" min={40} max={110} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function Transpositor({ latino }) {
  const [txt, setTxt] = useState("G D Em C");
  const [capo, setCapo] = useState(2);
  const lista = txt.split(/[\s,\-–]+/).filter(Boolean);
  const formas = lista.map((a) => transponer(a, -capo));
  const sonando = lista.map((a) => transponer(a, 0));
  const fmt = (a) => (latino ? aLatino(a) : a);
  return (
    <div className="cg-panel">
      <div className="cg-panel-t">🔁 Transpositor y capo</div>
      <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 8 }}>
        Escribe los acordes de la canción (en letras o en Do-Re-Mi). Elige en qué traste pondrás el capo y verás qué formas debes tocar.
      </div>
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d6dee9", borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}
        placeholder="Ej: G D Em C"
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Boton key={n} pequeno activo={capo === n} onClick={() => setCapo(n)}>
            {n === 0 ? "Sin capo" : `Capo ${n}`}
          </Boton>
        ))}
      </div>
      <div className="cg-trans">
        <div>
          <small>Suena (original)</small>
          <div className="cg-trans-r">{sonando.map((a, i) => <span key={i}>{fmt(a)}</span>)}</div>
        </div>
        <div>
          <small>Tocas estas formas{capo ? ` con capo en el traste ${capo}` : ""}</small>
          <div className="cg-trans-r on">{formas.map((a, i) => <span key={i}>{fmt(a)}</span>)}</div>
        </div>
      </div>
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
  // cuenta regresiva
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
      if (pasoRef.current + 1 >= pasos.length) {
        setCorriendo(false);
      } else {
        setPaso(pasoRef.current + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [corriendo, pasos]);
  // al cambiar de paso: reinicia la cuenta y el metrónomo de ese paso
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
  const actual = pasos[paso];
  return (
    <div className="cg-ensayo" style={{ borderColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="cg-ensayo-k" style={{ color }}>ENSAYO GUIADO · {total} min</div>
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
      <ol className="cg-steps">
        {pasos.map((p, i) => (
          <li key={i} className={i === paso && corriendo ? "on" : ""} style={i === paso && corriendo ? { borderColor: color, background: "#fff" } : null}>
            <div className="cg-step-h">
              <b>{p.t}</b>
              <span>{i === paso && corriendo ? `${mm}:${ss}` : `${p.min} min`}{p.bpm > 0 ? ` · ${p.bpm} BPM` : ""}</span>
            </div>
            <div className="cg-step-t">{p.txt}</div>
          </li>
        ))}
      </ol>
      {corriendo && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
          Ahora: <b>{actual.t}</b>. Suena una campana al pasar al siguiente paso.
        </div>
      )}
    </div>
  );
}

function Render({ b, latino, color, check, setCheck, mod }) {
  switch (b.t) {
    case "p":
      return <p className="cg-p" dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />;
    case "h":
      return <h4 className="cg-h">{b.x}</h4>;
    case "ul":
      return (
        <ul className="cg-ul">
          {b.items.map((x, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: negritas(x) }} />
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className="cg-note tip">
          <span>💡</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "warn":
      return (
        <div className="cg-note warn">
          <span>⚠️</span>
          <div dangerouslySetInnerHTML={{ __html: negritas(b.x) }} />
        </div>
      );
    case "tuning":
      return <Afinacion />;
    case "chords":
      return (
        <div className="cg-chords">
          {b.names.map((n) => (
            <ChordCard key={n} nombre={n} latino={latino} color={color} />
          ))}
        </div>
      );
    case "prog":
      return <Progresion chords={b.chords} bpm={b.bpm} label={b.label} latino={latino} color={color} />;
    case "rhythm":
      return <Ritmo pattern={b.pattern} conteo={b.conteo} bpm={b.bpm} chord={b.chord} label={b.label} latino={latino} color={color} stepsPerBeat={b.stepsPerBeat || 2} />;
    case "arpegio":
      return <Arpegio chords={b.chords} bpm={b.bpm} latino={latino} color={color} />;
    case "capo":
      return <Transpositor latino={latino} />;
    case "ensayo":
      return <EnsayoGuiado titulo={b.titulo} pasos={b.pasos} color={color} />;
    case "postura":
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {b.cards.map((c, i) => (
            <div key={i} className="cg-post">
              <div className="cg-post-h" style={{ background: color }}>
                <span>{i + 1}</span>
                {c.titulo}
              </div>
              <div className="cg-post-b">
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
        <div className="cg-panel">
          <div className="cg-panel-t">✅ Marca lo que ya dominas</div>
          {b.items.map((x, i) => {
            const k = mod.id + ":" + x;
            return (
              <label key={i} className="cg-check">
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
function negritas(s) {
  const esc = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ═══════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const KEY = "curso_guitarra_progreso_v1";
function leer() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function guardar(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}

export default function CursoGuitarra() {
  const [estado, setEstado] = useState(leer);
  const [nivelId, setNivelId] = useState(estado.nivel || "basico");
  const [modId, setModId] = useState(null);
  const [vista, setVista] = useState("curso"); // curso | acordes
  const [latino, setLatino] = useState(estado.latino !== false);
  const [filtroAcordes, setFiltroAcordes] = useState("basico");
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
  useEffect(() => {
    set({ latino });
  }, [latino, set]);

  const mod = nivel.modulos.find((m) => m.id === modId) || null;
  const idxMod = mod ? nivel.modulos.indexOf(mod) : -1;
  const progresoNivel = (n) => {
    const hechos = n.modulos.filter((m) => done[m.id]).length;
    return { hechos, total: n.modulos.length, pct: Math.round((hechos / n.modulos.length) * 100) };
  };
  const totalAcordes = Object.keys(CHORDS).length;
  const abrirModulo = (id) => {
    setModId(id);
    setTimeout(() => {
      const narrow = window.matchMedia && window.matchMedia("(max-width:900px)").matches;
      const el = narrow ? contRef.current : topRef.current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  const css = `
.cg{max-width:1100px;font-family:inherit;color:#1e293b}
.cg *{box-sizing:border-box}
.cg-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px 22px;color:#fff;background:radial-gradient(120% 140% at 85% 0%,#2a4d7a 0%,#0f2744 55%,#08162b 100%);box-shadow:0 14px 40px rgba(15,39,68,.28)}
.cg-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:220px;height:220px;border-radius:50%;border:1px solid rgba(201,162,39,.35);box-shadow:0 0 0 24px rgba(201,162,39,.06),0 0 0 54px rgba(201,162,39,.04)}
.cg-kick{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:${ORO};font-weight:700}
.cg-title{font-family:Georgia,'Times New Roman',serif;font-size:clamp(20px,2.6vw,26px);line-height:1.1;margin:0 0 6px;font-weight:700}
.cg-sub{max-width:620px;font-size:13.5px;line-height:1.6;color:rgba(255,255,255,.82)}
.cg-stats{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px}
.cg-stats div{font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.06em;text-transform:uppercase}
.cg-stats b{display:block;font-size:18px;color:#fff;letter-spacing:0;font-family:Georgia,serif}
.cg-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:16px 0 12px}
.cg-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.cg-level{text-align:left;border:1.5px solid #e2e8f0;background:#fff;border-radius:18px;padding:14px 16px;cursor:pointer;font-family:inherit;transition:transform .15s,box-shadow .15s}
.cg-level:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(15,39,68,.12)}
.cg-level.on{box-shadow:0 10px 26px rgba(15,39,68,.14)}
.cg-level h3{margin:0;font-size:16px;font-family:Georgia,serif}
.cg-level p{margin:4px 0 8px;font-size:12px;color:#64748b;line-height:1.4}
.cg-prog-bar{height:6px;background:#eef2f7;border-radius:6px;overflow:hidden}
.cg-prog-bar i{display:block;height:100%;border-radius:6px}
.cg-main{display:grid;grid-template-columns:290px minmax(0,1fr);gap:16px;align-items:start}
.cg-list{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:8px;position:sticky;top:10px}
.cg-mod{width:100%;display:flex;gap:10px;align-items:flex-start;text-align:left;border:none;background:transparent;border-radius:12px;padding:9px 10px;cursor:pointer;font-family:inherit}
.cg-mod:hover{background:#f5f8fc}
.cg-mod.on{background:#eef4fb}
.cg-mod .cg-mod-n{flex:0 0 26px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;margin:0;line-height:1}
.cg-mod b{display:block;font-size:13px;color:#0f2744;line-height:1.25}
.cg-mod div span{display:block;font-size:11.5px;color:#64748b;line-height:1.35;margin-top:2px}
.cg-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:22px 24px;box-shadow:0 6px 20px rgba(15,39,68,.05)}
.cg-card h2{font-family:Georgia,serif;font-size:clamp(20px,2.6vw,26px);margin:2px 0 4px;color:#0f2744}
.cg-p{font-size:14px;line-height:1.7;color:#334155;margin:12px 0}
.cg-h{font-family:Georgia,serif;font-size:16px;color:#0f2744;margin:20px 0 4px}
.cg-ul{margin:8px 0 12px;padding-left:20px;font-size:13.5px;line-height:1.7;color:#334155}
.cg-ul li{margin:4px 0}
.cg-note{display:flex;gap:10px;border-radius:14px;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.6}
.cg-note.tip{background:#fdf7e3;border:1px solid #efdca0;color:#6b5513}
.cg-note.warn{background:#fdf0f0;border:1px solid #f2c4c4;color:#7f2a2a}
.cg-panel{background:#f7f9fc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin:14px 0}
.cg-panel-t{font-size:13px;font-weight:800;color:#0f2744;margin-bottom:10px}
.cg-chords{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin:14px 0}
.cg-chord{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center}
.cg-chord-name{font-family:Georgia,serif;font-size:20px;font-weight:700;color:#0f2744}
.cg-chord-name small{display:block;font-family:inherit;font-size:10.5px;font-weight:600;color:#94a3b8;letter-spacing:.08em}
.cg-chord-tip{font-size:11.5px;line-height:1.5;color:#64748b;margin-top:8px}
.cg-chord-str{display:flex;gap:7px;margin-top:8px;font-size:10.5px;color:#94a3b8;font-weight:700;font-variant-numeric:tabular-nums}
.cg-string{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:62px;border:1px solid #d6dee9;background:#fff;border-radius:14px;padding:8px 10px;cursor:pointer;font-family:inherit}
.cg-string:hover{background:#eef4fb;border-color:#2f6fb5}
.cg-string b{font-size:10px;color:#94a3b8}.cg-string span{font-size:17px;font-weight:800;color:#0f2744;font-family:Georgia,serif}.cg-string small{font-size:10px;color:#64748b}
.cg-prog{display:flex;gap:8px;flex-wrap:wrap}
.cg-prog-c{min-width:64px;text-align:center;padding:11px 16px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-family:Georgia,serif;font-size:19px;font-weight:700;color:#0f2744;transition:background .12s,color .12s}
.cg-prog-c.on{color:#fff}
.cg-pat{display:grid;gap:5px}
.cg-pat-s{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid #cbd5e1;border-radius:10px;padding:6px 0;background:#fff;color:#0f2744;transition:background .1s}
.cg-pat-g{font-size:18px;font-weight:800;line-height:1.1}.cg-pat-n{font-size:11px;font-weight:700;opacity:.65}
.cg-trans{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.cg-trans small{display:block;font-size:10.5px;color:#64748b;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}
.cg-trans-r{display:flex;gap:6px;flex-wrap:wrap}
.cg-trans-r span{padding:8px 14px;border-radius:10px;background:#fff;border:1px solid #d6dee9;font-family:Georgia,serif;font-size:18px;font-weight:700;color:#0f2744}
.cg-trans-r.on span{background:#0f2744;color:#fff;border-color:#0f2744}
.cg-ensayo{border:2px solid;border-radius:18px;padding:16px 18px;margin:18px 0;background:linear-gradient(180deg,#fbfcfe,#f3f6fb)}
.cg-ensayo-k{font-size:10.5px;font-weight:800;letter-spacing:.18em}
.cg-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.cg-steps li{border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;background:#f9fafc}
.cg-step-h{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:#0f2744}
.cg-step-h span{font-variant-numeric:tabular-nums;font-weight:700;color:#475569}
.cg-step-t{font-size:12.5px;color:#64748b;line-height:1.5;margin-top:3px}
.cg-post{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff}
.cg-post-h{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:14px;padding:10px 14px}
.cg-post-h span{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:12px}
.cg-post-b{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px 14px}
.cg-post-b p{margin:4px 0 0;font-size:12.8px;line-height:1.6;color:#334155}
.cg-post-b b{font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.cg-post-b .ok{color:#1f6f43}.cg-post-b .mal{color:#a63232}.cg-post-b .fix{color:#2f5d9a}
.cg-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#334155;padding:5px 0;cursor:pointer;line-height:1.45}
.cg-check input{width:17px;height:17px;margin-top:1px;accent-color:#0f2744}
.cg-acordes-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
@media(max-width:900px){.cg-main{grid-template-columns:1fr}.cg-list{position:static}.cg-hero{padding:20px}.cg-card{padding:16px}}
`;

  return (
    <div className="cg" ref={topRef}>
      <style>{css}</style>
      <div className="cg-hero">
        <div className="cg-title">Curso de Guitarra</div>
        <div className="cg-sub">
          Del primer acorde al acompañamiento profesional. Cada acorde con diagrama, dedos y <b>audio</b>; cada nivel con ensayos guiados, ritmos con metrónomo y autoevaluación.
        </div>
        <div className="cg-stats">
          <div><b>{NIVELES.reduce((s, n) => s + n.modulos.length, 0)}</b>módulos</div>
          <div><b>{totalAcordes}</b>acordes con audio</div>
          <div><b>3</b>niveles</div>
          <div><b>{NIVELES.reduce((s, n) => s + n.modulos.reduce((a, m) => a + m.bloques.filter((b) => b.t === "ensayo").length, 0), 0)}</b>ensayos guiados</div>
        </div>
      </div>

      <div className="cg-bar">
        <Boton activo={vista === "curso"} onClick={() => setVista("curso")}>📘 Curso</Boton>
        <Boton activo={vista === "acordes"} onClick={() => setVista("acordes")}>🎸 Biblioteca de acordes</Boton>
        <span style={{ flex: 1 }} />
        <Boton pequeno activo={latino} onClick={() => setLatino(true)} title="Do Re Mi">Do-Re-Mi</Boton>
        <Boton pequeno activo={!latino} onClick={() => setLatino(false)} title="C D E">C-D-E</Boton>
      </div>

      {vista === "acordes" ? (
        <div className="cg-card">
          <h2>Biblioteca de acordes</h2>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Toca “Rasgueo” o “Arpegio” para escuchar cada acorde.</div>
          <div className="cg-acordes-filtros">
            {NIVELES.map((n) => (
              <Boton key={n.id} color={n.color} activo={filtroAcordes === n.id} onClick={() => setFiltroAcordes(n.id)}>
                {n.nombre} ({NIVEL_ACORDES[n.id].length})
              </Boton>
            ))}
          </div>
          <div className="cg-chords">
            {NIVEL_ACORDES[filtroAcordes].map((n) => (
              <ChordCard key={n} nombre={n} latino={latino} color={(NIVELES.find((x) => x.id === filtroAcordes) || {}).color} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="cg-levels">
            {NIVELES.map((n) => {
              const p = progresoNivel(n);
              const on = n.id === nivelId;
              return (
                <button key={n.id} className={"cg-level" + (on ? " on" : "")} style={{ borderColor: on ? n.color : undefined }} onClick={() => cambiarNivel(n.id)}>
                  <h3 style={{ color: n.color }}>{n.nombre}</h3>
                  <p><b>{n.lema}</b> · {n.duracion}</p>
                  <div className="cg-prog-bar"><i style={{ width: p.pct + "%", background: n.color }} /></div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>{p.hechos} de {p.total} módulos</div>
                </button>
              );
            })}
          </div>

          <div className="cg-main">
            <div className="cg-list">
              {nivel.modulos.map((m, i) => (
                <button key={m.id} className={"cg-mod" + (m.id === modId ? " on" : "")} onClick={() => abrirModulo(m.id)}>
                  <span className="cg-mod-n" style={{ background: done[m.id] ? "#1f6f43" : nivel.color }}>{done[m.id] ? "✓" : i + 1}</span>
                  <div>
                    <b>{m.titulo}</b>
                    <span>{m.resumen}</span>
                  </div>
                </button>
              ))}
            </div>

            <div ref={contRef}>
              {!mod ? (
                <div className="cg-card">
                  <div className="cg-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre}</div>
                  <h2>{nivel.lema}</h2>
                  <p className="cg-p">{nivel.descripcion}</p>
                  <div className="cg-note tip"><span>🎧</span><div>Activa el sonido de tu dispositivo: cada acorde, ritmo y progresión se puede <b>escuchar</b> y practicar con metrónomo.</div></div>
                  <Boton color={nivel.color} activo onClick={() => abrirModulo(nivel.modulos[0].id)}>Comenzar el módulo 1 →</Boton>
                </div>
              ) : (
                <div className="cg-card">
                  <div className="cg-kick" style={{ color: nivel.color }}>Nivel {nivel.nombre} · módulo {idxMod + 1} de {nivel.modulos.length}</div>
                  <h2>{mod.titulo}</h2>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{mod.resumen}</div>
                  {mod.bloques.map((b, i) => (
                    <Render key={mod.id + i} b={b} latino={latino} color={nivel.color} check={check} setCheck={alternarCheck} mod={mod} />
                  ))}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22, alignItems: "center" }}>
                    {idxMod > 0 && <Boton onClick={() => abrirModulo(nivel.modulos[idxMod - 1].id)}>← Anterior</Boton>}
                    <Boton color="#1f6f43" activo={!!done[mod.id]} onClick={() => marcarModulo(mod.id)}>
                      {done[mod.id] ? "✓ Módulo completado" : "Marcar como completado"}
                    </Boton>
                    {idxMod < nivel.modulos.length - 1 && (
                      <Boton color={nivel.color} activo onClick={() => abrirModulo(nivel.modulos[idxMod + 1].id)}>Siguiente módulo →</Boton>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 14 }}>
        Los audios son una guitarra sintetizada para guiar el oído; la afinación y la sonoridad de tu instrumento real pueden variar. Tu progreso se guarda en este dispositivo.
      </div>
    </div>
  );
}
