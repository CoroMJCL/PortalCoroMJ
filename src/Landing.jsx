import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/publico`;
const SYS = `Eres el asistente del Coro Misioneros de Jesús, ensemble vocal de música litúrgica en Maipú, Chile. Responde en español, de forma concisa (máx 2-3 oraciones), cálida y cercana. Solo respondes sobre el coro.

Información clave:
- El coro es abierto a todos, no se requiere experiencia musical previa.
- Los requisitos son: compromiso, estudio del repertorio, y responsabilidad en la asistencia.
- Las misas regulares son dos sábados al mes: el segundo y el último sábado.
- El coro llega a las 18:00 hrs y la misa es de 20:00 a 21:00 hrs.
- También participamos en misas especiales en nuestra parroquia, que pueden requerir ensayos en otras fechas.
- Los ensayos son los sábados en la Capilla Misioneros de Jesús, Maipú.
- Para unirse deben contactarnos por el formulario del sitio o WhatsApp.`;

const DEFAULT = {
  hero_img: `${BUCKET}/Misioneros.jpg`,
  about_img: `${BUCKET}/Misioneros.jpg`,
  hero_titulo: "Misioneros", hero_titulo2: "de Jesús",
  hero_kicker: "Coro · Maipú · Chile",
  hero_sub: "Ensemble vocal de música litúrgica contemporánea. Quince años animando la fe en Maipú.",
  about_titulo: "Un ensemble con identidad propia",
  about_texto1: "Coro Misioneros de Jesús nació en 2024, formado por integrantes con más de 15 años de experiencia en coros litúrgicos. Soprano, contralto, tenor y bajo, acompañados de instrumentos en vivo.",
  about_texto2: "Nuestra disciplina musical y compromiso con el repertorio nos definen como un conjunto vocal de alto nivel dentro de la tradición litúrgica contemporánea.",
  stat1_n:"15+",stat1_l:"Años de experiencia",stat2_n:"30+",stat2_l:"Voces",stat3_n:"400+",stat3_l:"Presentaciones",
  gal1_label:"Navidad 2023",gal1_sub:"Diciembre",gal1_img:"",gal1_pos:"center top",
  gal2_label:"Semana Santa",gal2_sub:"Abril",gal2_img:"",gal2_pos:"center top",
  gal3_label:"Fiesta Patronal",gal3_sub:"Agosto",gal3_img:"",gal3_pos:"center top",
  gal4_label:"Corpus Christi",gal4_sub:"Junio",gal4_img:"",gal4_pos:"center top",
  gal5_label:"Vigilia Pascual",gal5_sub:"Marzo",gal5_img:"",gal5_pos:"center top",
  contacto_dir:"Maipú, Santiago, Chile · Capilla Sagrada Familia",
  contacto_ensayo:"Sábados · Capilla Misioneros de Jesús",
  whatsapp:"56912345678",
  evento_nombre:"", evento_fecha:"", evento_hora:"", evento_lugar:"",
  instagram_url:"",
  tiktok_url:"",
  youtube_url:"",
  facebook_url:"",
  footer_texto:"Ensemble vocal de música litúrgica. Maipú, Santiago de Chile.",
  srv1_title:"Matrimonios", srv1_desc:"Animamos tu matrimonio con música litúrgica en vivo, desde el ingreso hasta la salida. Coordinamos el repertorio con el sacerdote y adaptamos cada momento de la ceremonia.",
  srv2_title:"Misas de acción de gracias", srv2_desc:"Celebra un aniversario de bodas, cumpleaños especial o cualquier ocasión de gratitud con la presencia musical del coro. Repertorio seleccionado según el momento.",
  srv3_title:"Celebraciones parroquiales", srv3_desc:"Acompañamos fiestas patronales, misas solemnes y eucaristías especiales de parroquias y capillas de Maipú y comunas aledañas.",
  srv4_title:"Jornadas y retiros espirituales", srv4_desc:"Música sacra para encuentros de fe, retiros, jornadas vocacionales y cualquier instancia de oración comunitaria que requiera una atmósfera de recogimiento.",
  srv5_title:"Conciertos de música sacra", srv5_desc:"Ofrecemos conciertos y cantatas en vivo para parroquias, colegios y espacios culturales. Repertorio que abarca desde polifonía clásica hasta música litúrgica contemporánea.",
  srv6_title:"Comuniones, Confirmaciones y Adviento", srv6_desc:"Animamos Primeras Comuniones, Confirmaciones y las celebraciones de Adviento y Navidad con cantatas y repertorio festivo adaptado a cada etapa del año litúrgico.",
};

async function dbGet() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/landing_content?select=key,value`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const rows = await r.json();
    if (!Array.isArray(rows)) return DEFAULT;
    const obj = { ...DEFAULT };
    rows.forEach(({ key, value }) => { obj[key] = value; });
    return obj;
  } catch { return DEFAULT; }
}
async function dbSet(key, value) {
  await fetch(`${SUPABASE_URL}/rest/v1/landing_content`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key, value }) });
}
async function uploadImg(file, name) {
  const ext = file.name.split(".").pop();
  const path = `${name}.${ext}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/publico/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type, "x-upsert": "true" }, body: file });
  if (!r.ok) throw new Error("Upload failed");
  return `${BUCKET}/${path}?t=${Date.now()}`;
}

// Campos de edición — fuera del AdminPanel para evitar remount en cada render
function AdminField({ label, k, ta, type, editing, setEditing, saving, saveF, C }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      {ta
        ? <textarea
            value={editing[k] ?? C[k] ?? ""}
            onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))}
            style={{ width: "100%", border: "1px solid #e0e6f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, outline: "none", display: "block", boxSizing: "border-box" }}
          />
        : <input
            type={type || "text"}
            value={editing[k] ?? C[k] ?? ""}
            onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))}
            style={{ width: "100%", border: "1px solid #e0e6f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", display: "block", boxSizing: "border-box" }}
          />
      }
      <button onClick={() => saveF(k)} disabled={saving[k]} style={{ marginTop: 5, background: "#08122d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: saving[k] ? 0.6 : 1 }}>
        {saving[k] ? "..." : "Guardar"}
      </button>
    </div>
  );
}

function AdminImgField({ label, k, name, upKey, handleImg, C }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {C[k] && <img src={C[k]} alt="" style={{ width: "100%", maxHeight: 100, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />}
      <label style={{ display: "inline-block", background: "#f0f4ff", border: "1px solid #d0d8f0", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer", color: "#08122d" }}>
        {upKey === k ? "Subiendo..." : "📁 Subir imagen"}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleImg(k, e.target.files[0], name)} />
      </label>
    </div>
  );
}

// Componente admin separado para evitar remount de inputs
function AdminPanel({ onClose, C, editing, setEditing, saving, saveF, upKey, handleImg }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pautas, setPautas] = useState([]);
  const [selectedPauta, setSelectedPauta] = useState(C.proximo_evento_id || "");

  // Cargar pautas publicadas para el selector
  useEffect(() => {
    if (!auth) return;
    fetch(`${SUPABASE_URL}/rest/v1/pautas_misa?publicada=eq.true&order=fecha.asc&limit=20`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json()).then(rows => { if (Array.isArray(rows)) setPautas(rows); }).catch(() => {});
  }, [auth]);

  const check = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw })
      });
      const d = await r.json();
      if (d.access_token) {
        setAuth(true);
      } else {
        setError(d.error_description || d.msg || "Correo o contraseña incorrectos.");
      }
    } catch { setError("Error de conexión."); }
    setLoading(false);
  };

  const fp = { editing, setEditing, saving, saveF, C };
  const ifp = { upKey, handleImg, C };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 520, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ background: "#08122d", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>⚙️ Editor del sitio</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {!auth ? (
          <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#08122d" }}>Acceso de administrador</div>
            <div style={{ fontSize: 13, color: "#888" }}>Ingresa con tu cuenta del portal (debes tener rol de administrador).</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico"
              style={{ border: "1px solid #dde4f0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Contraseña"
              onKeyDown={e => e.key === "Enter" && check()}
              style={{ border: "1px solid #dde4f0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            {error && <div style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 14px" }}>{error}</div>}
            <button onClick={check} disabled={loading} style={{ background: "#08122d", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: "24px 24px 40px", flex: 1 }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>

            {/* PRÓXIMO EVENTO */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>📅 Próximo evento (contador hero)</div>
            <AdminField {...fp} label="Nombre del evento" k="evento_nombre" />
            <AdminField {...fp} label="Fecha (ej: 2026-07-16)" k="evento_fecha" />
            <AdminField {...fp} label="Hora (ej: 15:30)" k="evento_hora" />
            <AdminField {...fp} label="Lugar" k="evento_lugar" />

            {/* HERO */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Hero</div>
            <AdminImgField {...ifp} label="Imagen fondo" k="hero_img" name="landing_hero" />
            <AdminField {...fp} label="Título 1" k="hero_titulo" /><AdminField {...fp} label="Título 2 italic" k="hero_titulo2" /><AdminField {...fp} label="Subtexto" k="hero_sub" ta />

            {/* NOSOTROS */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>👥 Nosotros</div>
            <AdminImgField {...ifp} label="Imagen nosotros" k="about_img" name="landing_about" />
            <AdminField {...fp} label="Título" k="about_titulo" /><AdminField {...fp} label="Párrafo 1" k="about_texto1" ta /><AdminField {...fp} label="Párrafo 2" k="about_texto2" ta />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              {[1,2,3].map(n => <div key={n}><AdminField {...fp} label={`Stat ${n} número`} k={`stat${n}_n`} /><AdminField {...fp} label="Label" k={`stat${n}_l`} /></div>)}
            </div>

            {/* GALERÍA */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Galería</div>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ background: "#f8f9fc", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: "#666", marginBottom: 8 }}>Foto {n}</div>
                <AdminImgField {...ifp} label="Imagen" k={`gal${n}_img`} name={`landing_gal${n}`} />
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#888",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Posición foto</div>
                  <select value={editing[`gal${n}_pos`] ?? C[`gal${n}_pos`] ?? "center top"}
                    onChange={e=>setEditing(p=>({...p,[`gal${n}_pos`]:e.target.value}))}
                    style={{width:"100%",border:"1px solid #e0e6f0",borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",marginBottom:4}}>
                    <option value="center top">Arriba (personas)</option>
                    <option value="center center">Centro</option>
                    <option value="center bottom">Abajo</option>
                    <option value="left center">Izquierda</option>
                    <option value="right center">Derecha</option>
                  </select>
                  <button onClick={()=>saveF(`gal${n}_pos`)} disabled={saving[`gal${n}_pos`]} style={{background:"#08122d",color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    {saving[`gal${n}_pos`] ? "..." : "Guardar"}
                  </button>
                </div>
                <AdminField {...fp} label="Título" k={`gal${n}_label`} /><AdminField {...fp} label="Subtítulo" k={`gal${n}_sub`} />
              </div>
            ))}

            {/* SERVICIOS */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🎵 Textos de servicios</div>
            {[1,2,3,4,5,6].map(n => (
              <div key={n} style={{ background: "#f8f9fc", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: "#666", marginBottom: 8 }}>Servicio {n}</div>
                <AdminField {...fp} label="Título" k={`srv${n}_title`} />
                <AdminField {...fp} label="Descripción" k={`srv${n}_desc`} ta />
              </div>
            ))}

            {/* REDES Y CONTACTO */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🔗 Redes sociales</div>
            <AdminField {...fp} label="WhatsApp (solo números, ej: 56912345678)" k="whatsapp" />
            <AdminField {...fp} label="Instagram URL" k="instagram_url" />
            <AdminField {...fp} label="TikTok URL" k="tiktok_url" />
            <AdminField {...fp} label="YouTube URL" k="youtube_url" />
            <AdminField {...fp} label="Facebook URL" k="facebook_url" />

            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>📍 Contacto</div>
            <AdminField {...fp} label="Dirección" k="contacto_dir" />
            <AdminField {...fp} label="Ensayos" k="contacto_ensayo" />
            <AdminField {...fp} label="Texto footer" k="footer_texto" ta />
          </div>
        )}
      </div>
    </div>
  );
}

// ── COUNTDOWN PRÓXIMA MISA ─────────────────
function HeroCountdown({ evento }) {
  const [time, setTime] = useState({ d:0, h:0, m:0, s:0 });

  useEffect(() => {
    if (!evento?.fecha) return;
    const tick = () => {
      const [h, m] = (evento.hora || "10:00").split(":").map(Number);
      const target = new Date(`${evento.fecha}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
      const diff = target - new Date();
      if (diff <= 0) { setTime({ d:0,h:0,m:0,s:0 }); return; }
      setTime({
        d: Math.floor(diff/86400000),
        h: Math.floor((diff%86400000)/3600000),
        m: Math.floor((diff%3600000)/60000),
        s: Math.floor((diff%60000)/1000)
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [evento]);

  if (!evento?.fecha || !evento?.nombre) return null;

  const fecha = new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div className="hero-countdown">
      <div className="hcd-label">Próxima celebración</div>
      <div className="hcd-event">{evento.nombre}</div>
      <div className="hcd-date">{fecha}{evento.hora ? ` · ${evento.hora} hrs` : ""}{evento.lugar ? ` · ${evento.lugar}` : ""}</div>
      <div className="hcd-timer">
        <div className="hcd-unit"><span className="hcd-num">{String(time.d).padStart(2,"0")}</span><div className="hcd-txt">días</div></div>
        <div className="hcd-sep">:</div>
        <div className="hcd-unit"><span className="hcd-num">{String(time.h).padStart(2,"0")}</span><div className="hcd-txt">hrs</div></div>
        <div className="hcd-sep">:</div>
        <div className="hcd-unit"><span className="hcd-num">{String(time.m).padStart(2,"0")}</span><div className="hcd-txt">min</div></div>
        <div className="hcd-sep">:</div>
        <div className="hcd-unit"><span className="hcd-num">{String(time.s).padStart(2,"0")}</span><div className="hcd-txt">seg</div></div>
      </div>
    </div>
  );
}

// ── METRÓNOMO ──────────────────────────────
function ToolMetronome() {
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [beats, setBeats] = useState(4);
  const iRef = useRef(null);
  const ctx = useRef(null);

  useEffect(() => {
    if (running) {
      ctx.current = new (window.AudioContext || window.webkitAudioContext)();
      let b = 0;
      iRef.current = setInterval(() => {
        const o = ctx.current.createOscillator();
        const g = ctx.current.createGain();
        o.connect(g); g.connect(ctx.current.destination);
        o.frequency.value = b === 0 ? 880 : 440;
        g.gain.setValueAtTime(0.3, ctx.current.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.current.currentTime + 0.08);
        o.start(); o.stop(ctx.current.currentTime + 0.1);
        setBeat(b); b = (b + 1) % beats;
      }, (60 / bpm) * 1000);
    } else {
      clearInterval(iRef.current);
      if (ctx.current) ctx.current.close();
      setBeat(0);
    }
    return () => clearInterval(iRef.current);
  }, [running, bpm, beats]);

  const card = { background:"#f8f9fc", borderRadius:20, padding:28, border:"1px solid #e4eaf5" };
  return (
    <div style={card}>
      <div style={{fontSize:10,fontWeight:700,color:"#F97316",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Metrónomo</div>
      <div style={{fontSize:52,fontWeight:900,color:"#08122d",letterSpacing:"-0.03em",lineHeight:1,marginBottom:4}}>{bpm}</div>
      <div style={{fontSize:11,color:"#aaa",marginBottom:20}}>BPM</div>
      <input type="range" min={40} max={240} value={bpm} onChange={e=>setBpm(+e.target.value)}
        style={{width:"100%",accentColor:"#F97316",marginBottom:16}} />
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[2,3,4,6].map(n => (
          <button key={n} onClick={()=>setBeats(n)} style={{flex:1,padding:"6px 0",border:`1.5px solid ${beats===n?"#F97316":"#e0e6f0"}`,borderRadius:8,background:beats===n?"#F97316":"#fff",color:beats===n?"#fff":"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {n}/4
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {Array.from({length:beats},(_,i)=>(
          <div key={i} style={{flex:1,height:8,borderRadius:4,background:running&&beat===i?"#F97316":"#e0e6f0",transition:"background 0.05s"}}/>
        ))}
      </div>
      <button onClick={()=>setRunning(r=>!r)} style={{width:"100%",background:running?"#08122d":"#F97316",color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
        {running ? "⏹ Detener" : "▶ Iniciar"}
      </button>
    </div>
  );
}

// ── AFINADOR ───────────────────────────────
function ToolTuner() {
  const [note, setNote] = useState("—");
  const [cents, setCents] = useState(0);
  const [active, setActive] = useState(false);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  function freq2note(freq) {
    const n = 12 * Math.log2(freq / 440) + 69;
    const midi = Math.round(n);
    const c = Math.round((n - midi) * 100);
    return { name: NOTES[midi % 12], cents: c };
  }

  function autoCorrelate(buf, sr) {
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.01) return -1;
    let r1=0,r2=buf.length-1;
    for (let i=0;i<buf.length/2;i++) { if (Math.abs(buf[i])<0.2){r1=i;break;} }
    for (let i=1;i<buf.length/2;i++) { if (Math.abs(buf[buf.length-i])<0.2){r2=buf.length-i;break;} }
    buf = buf.slice(r1,r2);
    const c = new Array(buf.length).fill(0);
    for (let i=0;i<buf.length;i++) for (let j=0;j<buf.length-i;j++) c[i]=c[i]+buf[j]*buf[j+i];
    let d=0; while(c[d]>c[d+1]) d++;
    let maxv=-1,maxt=0;
    for (let i=d;i<buf.length;i++) { if (c[i]>maxv){maxv=c[i];maxt=i;} }
    const x1=c[maxt-1],x2=c[maxt],x3=c[maxt+1];
    const a=(x1+x3-2*x2)/2, b2=(x3-x1)/2;
    return sr/(maxt-b2/(2*a));
  }

  async function toggle() {
    if (active) {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setActive(false); setNote("—"); setCents(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        streamRef.current = stream;
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser(); an.fftSize=2048;
        src.connect(an); analyserRef.current = an;
        const buf = new Float32Array(an.fftSize);
        setActive(true);
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          const f = autoCorrelate(buf, ctx.sampleRate);
          if (f > 0) { const {name,cents:c} = freq2note(f); setNote(name); setCents(c); }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch { alert("Necesitas permitir acceso al micrófono"); }
    }
  }

  const color = Math.abs(cents) < 5 ? "#22c55e" : Math.abs(cents) < 15 ? "#f59e0b" : "#ef4444";
  const card = { background:"#f8f9fc", borderRadius:20, padding:28, border:"1px solid #e4eaf5" };
  return (
    <div style={card}>
      <div style={{fontSize:10,fontWeight:700,color:"#F97316",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Afinador cromático</div>
      <div style={{fontSize:72,fontWeight:900,color:active?color:"#e0e6f0",letterSpacing:"-0.03em",lineHeight:1,textAlign:"center",marginBottom:4,transition:"color 0.2s"}}>{note}</div>
      <div style={{position:"relative",height:8,background:"#e0e6f0",borderRadius:4,margin:"16px 0 8px"}}>
        <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:2,background:"#08122d",borderRadius:2}}/>
        <div style={{position:"absolute",left:`calc(50% + ${cents}%)`,top:-3,width:14,height:14,borderRadius:"50%",background:color,transform:"translateX(-50%)",transition:"left 0.1s, background 0.2s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginBottom:20}}>
        <span>-50¢</span><span style={{color,fontWeight:600}}>{active?`${cents>0?"+":""}${cents}¢`:"0¢"}</span><span>+50¢</span>
      </div>
      <button onClick={toggle} style={{width:"100%",background:active?"#08122d":"#F97316",color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
        {active ? "⏹ Detener" : "🎤 Activar micrófono"}
      </button>
    </div>
  );
}

// ── VISUALIZADOR DE ACORDES ───────────────
function ToolChords() {
  const CHORDS = {
    "Lam":  { frets: [-1,0,2,2,1,0], fingers: [0,0,2,3,1,0], name: "La menor" },
    "La":   { frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0], name: "La mayor" },
    "La7":  { frets: [-1,0,2,0,2,0], fingers: [0,0,2,0,3,0], name: "La séptima" },
    "Sim":  { frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], name: "Si menor", barre:2 },
    "Si7":  { frets: [-1,2,1,2,0,2], fingers: [0,2,1,3,0,4], name: "Si séptima" },
    "Do":   { frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0], name: "Do mayor" },
    "Dom":  { frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1], name: "Do menor", barre:3 },
    "Do7":  { frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0], name: "Do séptima" },
    "Re":   { frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2], name: "Re mayor" },
    "Rem":  { frets: [-1,-1,0,2,3,1], fingers: [0,0,0,2,3,1], name: "Re menor" },
    "Re7":  { frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3], name: "Re séptima" },
    "Mi":   { frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0], name: "Mi mayor" },
    "Mim":  { frets: [0,2,2,0,0,0], fingers: [0,2,3,0,0,0], name: "Mi menor" },
    "Mi7":  { frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0], name: "Mi séptima" },
    "Fa":   { frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], name: "Fa mayor", barre:1 },
    "Fam":  { frets: [1,3,3,1,1,1], fingers: [1,3,4,1,1,1], name: "Fa menor", barre:1 },
    "Sol":  { frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3], name: "Sol mayor" },
    "Solm": { frets: [3,5,5,3,3,3], fingers: [1,3,4,1,1,1], name: "Sol menor", barre:3 },
    "Sol7": { frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1], name: "Sol séptima" },
  };

  const [selected, setSelected] = useState("Lam");
  const [search, setSearch] = useState("");

  const chord = CHORDS[selected];
  const filtered = Object.keys(CHORDS).filter(k =>
    k.toLowerCase().includes(search.toLowerCase()) ||
    CHORDS[k].name.toLowerCase().includes(search.toLowerCase())
  );

  const STRINGS = 6;
  const FRETS = 5;
  const W = 160, H = 140;
  const PAD = { l:28, r:14, t:28, b:10 };
  const sw = (W - PAD.l - PAD.r) / (STRINGS - 1);
  const fh = (H - PAD.t - PAD.b) / FRETS;

  const startFret = chord.barre ? chord.barre : 1;
  const dots = [];
  chord.frets.forEach((f, si) => {
    if (f > 0) {
      const x = PAD.l + (STRINGS - 1 - si) * sw;
      const y = PAD.t + (f - startFret + 0.5) * fh;
      dots.push({ x, y, finger: chord.fingers[si], string: si });
    }
  });

  const card = { background:"#f8f9fc", borderRadius:20, padding:28, border:"1px solid #e4eaf5", display:"flex", flexDirection:"column", gap:16 };

  return (
    <div style={card}>
      <div style={{fontSize:10,fontWeight:700,color:"#F97316",letterSpacing:"0.18em",textTransform:"uppercase"}}>Acordes de guitarra</div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar acorde..."
        style={{border:"1px solid #dde4f0",borderRadius:10,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff"}}/>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:100,overflowY:"auto"}}>
        {filtered.map(k => (
          <button key={k} onClick={()=>setSelected(k)}
            style={{padding:"4px 12px",borderRadius:8,border:`1.5px solid ${selected===k?"#F97316":"#e0e6f0"}`,background:selected===k?"#F97316":"#fff",color:selected===k?"#fff":"#08122d",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
            {k}
          </button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Cejilla / nut */}
          <rect x={PAD.l} y={PAD.t - 4} width={(STRINGS-1)*sw} height={startFret===1?5:2} fill={startFret===1?"#08122d":"#ccc"} rx={2}/>
          {/* Trastes */}
          {Array.from({length:FRETS+1},(_,i)=>(
            <line key={i} x1={PAD.l} y1={PAD.t+i*fh} x2={PAD.l+(STRINGS-1)*sw} y2={PAD.t+i*fh} stroke="#dde4f0" strokeWidth={1}/>
          ))}
          {/* Cuerdas */}
          {Array.from({length:STRINGS},(_,i)=>(
            <line key={i} x1={PAD.l+i*sw} y1={PAD.t} x2={PAD.l+i*sw} y2={PAD.t+FRETS*fh} stroke="#bbb" strokeWidth={i===0||i===STRINGS-1?1.5:1}/>
          ))}
          {/* X y O encima */}
          {chord.frets.map((f,si)=>{
            const x = PAD.l + (STRINGS-1-si)*sw;
            if (f===-1) return <text key={si} x={x} y={PAD.t-10} textAnchor="middle" fontSize={11} fill="#ef4444" fontWeight="700">✕</text>;
            if (f===0) return <text key={si} x={x} y={PAD.t-10} textAnchor="middle" fontSize={11} fill="#22c55e" fontWeight="700">○</text>;
            return null;
          })}
          {/* Cejilla barre */}
          {chord.barre && (
            <rect x={PAD.l} y={PAD.t+0.15*fh} width={(STRINGS-1)*sw} height={fh*0.7} fill="#08122d" rx={fh*0.35} opacity={0.85}/>
          )}
          {/* Puntos */}
          {dots.filter(d => !chord.barre || d.finger!==1).map((d,i)=>(
            <g key={i}>
              <circle cx={d.x} cy={d.y} r={fh*0.32} fill="#08122d"/>
              <text x={d.x} y={d.y+4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">{d.finger}</text>
            </g>
          ))}
          {/* Número de traste */}
          {startFret > 1 && <text x={PAD.l-8} y={PAD.t+fh*0.6} textAnchor="end" fontSize={10} fill="#888">{startFret}</text>}
        </svg>
        <div>
          <div style={{fontSize:28,fontWeight:900,color:"#08122d",lineHeight:1,letterSpacing:"-0.02em"}}>{selected}</div>
          <div style={{fontSize:12,color:"#888",marginTop:4}}>{chord.name}</div>
          <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}}>
            {["Mi","La","Re","Sol","Si","mi"].map((s,i)=>(
              <div key={i} style={{textAlign:"center",width:22}}>
                <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>{s}</div>
                <div style={{fontSize:11,fontWeight:700,color:chord.frets[5-i]===-1?"#ef4444":chord.frets[5-i]===0?"#22c55e":"#08122d"}}>
                  {chord.frets[5-i]===-1?"✕":chord.frets[5-i]===0?"○":chord.frets[5-i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onPortal }) {
  const [C, setC] = useState(DEFAULT);
  const [chat, setChat] = useState([{ role: "bot", text: "Hola, soy el asistente del Coro MJ. ¿En qué te puedo orientar?" }]);
  const [inp, setInp] = useState(""); const [typing, setTyping] = useState(false); const [hist, setHist] = useState([]);
  const [formOk, setFormOk] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [editing, setEditing] = useState({}); const [saving, setSaving] = useState({}); const [upKey, setUpKey] = useState(null);
  const msgsRef = useRef(null);
  useEffect(() => { dbGet().then(setC); }, []);
  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [chat, typing]);
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  async function sendMsg(text) {
    const t = (text || inp).trim(); if (!t) return; setInp("");
    const nh = [...hist, { role: "user", content: t }];
    setChat(p => [...p, { role: "user", text: t }]); setHist(nh); setTyping(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYS, messages: nh })
      });
      const d = await r.json();
      const reply = d.content?.[0]?.text || "Sin respuesta.";
      setTyping(false); setChat(p => [...p, { role: "bot", text: reply }]);
      setHist(p => [...p, { role: "assistant", content: reply }]);
    } catch(e) { setTyping(false); setChat(p => [...p, { role: "bot", text: "Error: " + e.message }]); }
  }
  async function saveF(key, valueOverride) {
    setSaving(s => ({ ...s, [key]: true }));
    const val = valueOverride !== undefined ? valueOverride : (editing[key] ?? C[key]);
    await dbSet(key, val);
    setC(c => ({ ...c, [key]: val }));
    setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    setSaving(s => ({ ...s, [key]: false }));
  }
  async function handleImg(key, file, name) {
    setUpKey(key);
    try { const url = await uploadImg(file, name); await dbSet(key, url); setC(c => ({ ...c, [key]: url })); }
    catch (e) { alert("Error: " + e.message); }
    setUpKey(null);
  }

  const gColors = ["linear-gradient(135deg,#0a1628,#1e3a6e)","linear-gradient(135deg,#1a0a2e,#3d1a6e)","linear-gradient(135deg,#0a2818,#1a5c3a)","linear-gradient(135deg,#2e1a0a,#6e3d1a)","linear-gradient(135deg,#0a1a2e,#1a3d5c)"];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif", background: "#fff", color: "#0a0a14", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      {admin && (
        <AdminPanel
          onClose={() => setAdmin(false)}
          C={C} editing={editing} setEditing={setEditing}
          saving={saving} saveF={saveF} upKey={upKey} handleImg={handleImg}
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300&family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400;1,9..144,700;1,9..144,900&display=swap');
        html,body,button,input,textarea,select{font-family:'Plus Jakarta Sans','Inter',sans-serif!important}
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:999;height:80px;background:rgba(6,14,36,0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 40px}
        .nav-left{display:flex;gap:28px;align-items:center}
        .nav-left a{font-size:13px;font-weight:500;color:rgba(255,255,255,0.65);text-decoration:none;cursor:pointer;transition:color .2s;letter-spacing:0.01em}
        .nav-left a:hover{color:#fff}
        .nav-logo{display:flex;justify-content:center;cursor:pointer}
        .nav-logo img{height:64px;width:64px;object-fit:contain}
        .nav-right{display:flex;align-items:center;gap:8px;justify-content:flex-end}
        .nav-soc{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;border:none}
        .nav-soc:hover{background:rgba(255,255,255,0.18)}
        .nav-cta{background:#F97316;color:#fff;border:none;border-radius:980px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-left:8px;letter-spacing:0.01em}
        .nav-cta:hover{background:#ea6c10;transform:translateY(-1px)}

        /* HERO */
        .hero{height:100vh;position:relative;overflow:hidden;display:flex;align-items:flex-end}
        .hero-bg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center}
        .hero-ov{position:absolute;inset:0;z-index:1;background:linear-gradient(160deg,rgba(6,14,36,0.6) 0%,rgba(6,14,36,0.2) 40%,rgba(6,14,36,0.7) 70%,rgba(6,14,36,0.97) 100%)}
        .hero-c{position:relative;z-index:2;padding:0 60px 68px;width:100%;display:flex;justify-content:space-between;align-items:flex-end}
        .hero-kicker{font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:14px;display:flex;align-items:center;gap:10px}
        .hero-kicker::before{content:'';width:28px;height:1px;background:rgba(255,255,255,0.4)}
        .hero-h1{font-size:clamp(70px,9.5vw,124px);font-weight:900;line-height:0.88;color:#fff;letter-spacing:-0.03em}
        .hero-h1 .it{font-family:'Fraunces',serif;font-style:italic;font-weight:400;display:block;line-height:0.92;font-size:clamp(66px,9vw,118px)}
        .hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:20px;max-width:300px}
        .hero-sub{font-size:14.5px;font-weight:300;color:rgba(255,255,255,0.6);line-height:1.75;text-align:right}
        .hero-btns{display:flex;gap:10px}
        .btn-w{background:#fff;color:#08122d;border:none;border-radius:980px;padding:13px 28px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s}
        .btn-w:hover{background:#e8f0fc;transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,255,255,0.2)}
        .btn-o{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4);border-radius:980px;padding:13px 28px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .btn-o:hover{border-color:#fff;background:rgba(255,255,255,0.08)}
        .hero-scroll{position:absolute;bottom:0;left:0;right:0;z-index:2;overflow:hidden;line-height:0}
        .hero-wave{fill:#fff;display:block;width:100%}

        /* TICKER */
        .ticker{background:linear-gradient(90deg,#08122d,#0d2a4a,#08122d);padding:0;overflow:hidden;white-space:nowrap;position:relative}
        .ticker::before,.ticker::after{content:'';position:absolute;top:0;bottom:0;width:80px;z-index:2}
        .ticker::before{left:0;background:linear-gradient(to right,#08122d,transparent)}
        .ticker::after{right:0;background:linear-gradient(to left,#08122d,transparent)}
        .ticker-track{display:inline-flex;animation:tick 25s linear infinite;padding:16px 0}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .t-item{display:inline-flex;align-items:center;gap:10px;padding:0 28px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.5)}
        .t-item:nth-child(3n+1) .t-dot{background:#F97316}
        .t-item:nth-child(3n+2) .t-dot{background:#f59e0b}
        .t-item:nth-child(3n+3) .t-dot{background:#818cf8}
        .t-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}

        /* NOSOTROS */
        .about{padding:112px 60px;background:#fff;position:relative;overflow:hidden}
        .about::before{content:'';position:absolute;top:-120px;right:-120px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.08) 0%,transparent 70%);pointer-events:none}
        .about::after{content:'';position:absolute;bottom:-80px;left:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 70%);pointer-events:none}
        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;max-width:1140px;margin:0 auto;position:relative;z-index:1}
        .ey{font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#F97316;margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .ey::before{content:'';width:20px;height:2px;background:#F97316;border-radius:2px}
        .h2{font-size:clamp(36px,4.2vw,56px);font-weight:800;line-height:1.08;letter-spacing:-0.025em;color:#0a0a14;margin-bottom:22px}
        .h2 em{font-family:'Fraunces',serif;font-style:italic;font-weight:400;color:#08122d}
        .bp{font-size:15px;font-weight:300;line-height:1.85;color:#555}
        .about-img{position:relative;aspect-ratio:3/4;border-radius:24px;overflow:hidden;background:#eef2fb}
        .about-img-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:1}
        .about-img-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(6,14,36,0.92) 100%)}
        .about-img-badge{position:absolute;bottom:0;left:0;right:0;padding:28px 32px}
        .badge-l{font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)}
        .badge-v{font-size:44px;font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1}
        .about-img-accent{position:absolute;top:24px;right:24px;background:rgba(249,115,22,0.2);backdrop-filter:blur(8px);border:1px solid rgba(249,115,22,0.4);border-radius:12px;padding:12px 16px;text-align:center}
        .acc-n{font-size:22px;font-weight:800;color:#fff}
        .acc-l{font-size:9px;color:rgba(255,255,255,0.55);letter-spacing:0.1em;text-transform:uppercase;margin-top:2px}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:44px;border-top:1px solid #eaeef5;padding-top:36px;gap:0}
        .stat{padding-right:24px;border-right:1px solid #eaeef5}
        .stat:last-child{padding-left:24px;padding-right:0;border-right:none}
        .stat:nth-child(2){padding:0 24px}
        .stat-n{font-size:44px;font-weight:900;color:#08122d;line-height:1;letter-spacing:-0.03em}
        .stat-n sup{font-size:20px;color:#F97316}
        .stat-l{font-size:11px;color:#aaa;margin-top:5px;font-weight:500}

        /* GALERÍA */
        .gal{padding:0 0 112px;background:#f8f9fc}
        .gal-head{padding:96px 60px 48px;display:flex;justify-content:space-between;align-items:flex-end;max-width:1140px;margin:0 auto}
        .gal-note{font-size:14px;font-weight:300;color:#888;max-width:220px;text-align:right;line-height:1.7}
        .gal-strip{display:flex;gap:0;overflow-x:auto;scrollbar-width:none;padding:0 60px}
        .gal-strip::-webkit-scrollbar{display:none}
        .gi{flex-shrink:0;position:relative;cursor:pointer;overflow:hidden;border-radius:20px;margin-right:16px}
        .gi:nth-child(1){width:420px;height:520px}
        .gi:nth-child(2){width:280px;height:520px}
        .gi:nth-child(3){width:340px;height:520px}
        .gi:nth-child(4){width:280px;height:520px}
        .gi:nth-child(5){width:380px;height:520px}
        .gi-bg{position:absolute;inset:0}
        .gi:hover .gi-bg{transform:scale(1.04);background-size:cover!important;background-position:center!important}
        .gi-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,14,36,0.92) 0%,rgba(6,14,36,0.1) 55%,transparent 100%)}
        .gi-tag{position:absolute;top:20px;left:20px;backdrop-filter:blur(8px);border-radius:980px;padding:6px 14px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fff}
        .gi:nth-child(1) .gi-tag{background:rgba(249,115,22,0.3);border:1px solid rgba(249,115,22,0.5)}
        .gi:nth-child(2) .gi-tag{background:rgba(245,158,11,0.3);border:1px solid rgba(245,158,11,0.5)}
        .gi:nth-child(3) .gi-tag{background:rgba(129,140,248,0.3);border:1px solid rgba(129,140,248,0.5)}
        .gi:nth-child(4) .gi-tag{background:rgba(239,68,68,0.3);border:1px solid rgba(239,68,68,0.5)}
        .gi:nth-child(5) .gi-tag{background:rgba(249,115,22,0.3);border:1px solid rgba(249,115,22,0.5)}
        .gi-cap{position:absolute;bottom:0;left:0;right:0;padding:24px}
        .gi-label{font-size:17px;font-weight:700;color:#fff;line-height:1.2}
        .gi-sub{font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.1em;text-transform:uppercase;margin-top:5px}
        .gi-hov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s}
        .gi:hover .gi-hov{opacity:1}
        .gi-hov-btn{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,0.6);border-radius:980px;padding:9px 22px;backdrop-filter:blur(4px)}

        /* BOT */
        .bot{padding:112px 60px;background:linear-gradient(160deg,#060e24 0%,#0d1f45 100%);position:relative;overflow:hidden}
        .bot::before{content:'♪';position:absolute;top:-20px;right:60px;font-size:320px;color:rgba(255,255,255,0.02);font-family:'Fraunces',serif;line-height:1;pointer-events:none;user-select:none}
        .bot::after{content:'';position:absolute;bottom:-80px;left:-80px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.08) 0%,transparent 70%);pointer-events:none}
        .bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;max-width:1140px;margin:0 auto;position:relative;z-index:1}
        .bot-ey{color:#F97316}
        .bot-ey::before{background:rgba(249,115,22,0.8)}
        .bot-h2{color:#fff}
        .bot-h2 em{color:rgba(255,255,255,0.85)}
        .bot-p{color:rgba(255,255,255,0.5)}
        .bfeats{margin-top:44px}
        .bfeat{padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;gap:18px;align-items:flex-start}
        .bfeat:first-child{border-top:1px solid rgba(255,255,255,0.07)}
        .bnum{font-size:11px;font-weight:700;color:rgba(249,115,22,0.5);flex-shrink:0;padding-top:2px;letter-spacing:0.1em}
        .btitle{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
        .bdesc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;font-weight:300}
        .chat{background:#fff;border:1px solid #e4eaf5;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.12)}
        .chat-hd{background:#08122d;padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:none}
        .chat-av{width:34px;height:34px;border-radius:50%;background:rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .chat-nm{font-size:13px;font-weight:600;color:#fff}
        .chat-sm{font-size:10.5px;color:rgba(255,255,255,0.35)}
        .chat-dot{width:7px;height:7px;border-radius:50%;background:#34d399;margin-left:auto}
        .chat-msgs{padding:16px;min-height:240px;max-height:270px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:#f8f9fc}
        .cm{display:flex;gap:8px}.cm-u{flex-direction:row-reverse}
        .cm-av{width:26px;height:26px;border-radius:50%;background:#e4eaf5;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px}
        .cm-b{max-width:82%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.5}
        .cm-bot{background:#fff;color:#0a0a14;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-radius:4px 14px 14px 14px}
        .cm-usr{background:#F97316;color:#fff;border-radius:14px 4px 14px 14px}
        .tdots{display:flex;gap:4px;padding:10px 14px}
        .tdots span{width:6px;height:6px;border-radius:50%;background:#ccc;animation:td 1.2s infinite}
        .tdots span:nth-child(2){animation-delay:.2s}.tdots span:nth-child(3){animation-delay:.4s}
        @keyframes td{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
        .chat-pills{display:flex;gap:6px;padding:10px 16px 8px;flex-wrap:wrap;border-top:1px solid #eaeef5;background:#fff}
        .cpill{border:1px solid rgba(249,115,22,0.3);border-radius:980px;padding:5px 12px;font-size:11.5px;color:#F97316;cursor:pointer;background:#fff;font-family:inherit;transition:all .15s}
        .cpill:hover{background:#F97316;color:#fff;border-color:#F97316}
        .chat-ft{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #eaeef5;background:#fff}
        .cin{flex:1;border:1px solid #dde4f0;border-radius:980px;padding:9px 16px;font-size:13.5px;font-family:inherit;color:#0a0a14;outline:none;background:#f8f9fc;transition:border-color .2s}
        .cin:focus{border-color:#F97316;background:#fff}
        .cin::placeholder{color:#aab0c0}
        .csnd{width:36px;height:36px;border-radius:50%;background:#F97316;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s}
        .csnd:hover{background:#ea6c10}

        /* CONTACTO */
        .ct{padding:112px 60px;background:#f5f7fc;position:relative;overflow:hidden}
        .ct::after{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(to right,#F97316,#08122d,#F97316)}
        .ct-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;max-width:1140px;margin:0 auto;align-items:start}
        .ct-item{display:flex;gap:16px;align-items:flex-start;padding:20px 0;border-bottom:1px solid #e4eaf5}
        .ct-item:first-of-type{border-top:1px solid #e4eaf5}
        .ct-ico{width:40px;height:40px;border-radius:12px;background:#fff;border:1px solid #e4eaf5;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
        .ct-t{font-size:12.5px;font-weight:700;color:#0a0a14;margin-bottom:3px;letter-spacing:0.01em}
        .ct-s{font-size:13.5px;color:#888;font-weight:300;line-height:1.6}
        .socs{display:flex;gap:8px;margin-top:28px}
        .soc{width:40px;height:40px;border-radius:12px;border:1px solid #e0e6f0;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
        .soc:hover{background:#08122d;border-color:#08122d;transform:translateY(-2px)}
        .cform{background:#fff;border-radius:20px;padding:40px;border:1px solid #e4eaf5;box-shadow:0 4px 32px rgba(0,0,0,0.06)}
        .cform-h{font-size:26px;font-weight:800;color:#0a0a14;margin-bottom:28px;letter-spacing:-0.02em;line-height:1.2}
        .fg{margin-bottom:14px}
        .fg label{display:block;font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px}
        .fg input,.fg textarea,.fg select{width:100%;border:1px solid #e0e8f5;border-radius:10px;padding:11px 14px;font-size:14px;font-family:inherit;background:#fafbff;color:#0a0a14;outline:none;transition:border-color .2s;-webkit-appearance:none}
        .fg input:focus,.fg textarea:focus,.fg select:focus{border-color:#F97316;background:#fff}
        .fg input::placeholder,.fg textarea::placeholder{color:#c0c8d8}
        .fg textarea{resize:vertical;min-height:90px}
        .frow{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .fsub{width:100%;background:#08122d;color:#fff;border:none;border-radius:980px;padding:14px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:6px;transition:all .2s;letter-spacing:0.02em}
        .fsub:hover{background:#0d1f45;transform:translateY(-1px);box-shadow:0 8px 24px rgba(8,18,45,0.25)}

        /* FOOTER */
        footer{background:#060e24;padding:72px 60px 36px;position:relative;overflow:hidden}
        footer::before{content:'mj';position:absolute;bottom:-60px;right:-20px;font-size:280px;font-weight:900;color:rgba(255,255,255,0.02);line-height:1;letter-spacing:-0.05em;pointer-events:none;user-select:none}
        .foot-top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,0.06);max-width:1140px;margin:0 auto}
        .foot-logo{height:52px;width:52px;object-fit:contain;margin-bottom:16px;display:block}
        .foot-bn{font-size:16px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-0.01em}
        .foot-bp{font-size:13px;color:rgba(255,255,255,0.55);font-weight:300;line-height:1.7;max-width:260px}
        .foot-cols{display:flex;gap:56px}
        .foot-col h4{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:16px}
        .foot-col a{display:block;font-size:13.5px;color:rgba(255,255,255,0.7);text-decoration:none;margin-bottom:10px;font-weight:300;cursor:pointer;transition:color .2s}
        .foot-col a:hover{color:#fff}
        .foot-btm{display:flex;justify-content:space-between;align-items:center;padding-top:28px;max-width:1140px;margin:0 auto}
        .foot-copy{font-size:11.5px;color:rgba(255,255,255,0.4)}
        .foot-adm{font-size:11px;color:rgba(255,255,255,0.05);cursor:pointer;padding:4px 8px;user-select:none;letter-spacing:0.2em;transition:color .4s}
        .foot-adm:hover{color:rgba(255,255,255,0.25)}

        /* FABS */
        .fabs{position:fixed;top:50%;left:24px;transform:translateY(-50%);z-index:9000;display:flex;flex-direction:column;gap:10px;align-items:flex-start}
        .hero-countdown{
          background:rgba(8,18,45,0.7);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:16px;padding:18px 22px;
          min-width:220px;
        }
        .hcd-label{font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px}
        .hcd-event{font-size:13.5px;font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hcd-date{font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:14px}
        .hcd-timer{display:flex;gap:10px}
        .hcd-unit{text-align:center}
        .hcd-num{font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:#F97316;line-height:1;display:block}
        .hcd-txt{font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;margin-top:2px}
        .hcd-sep{font-size:22px;color:rgba(255,255,255,0.2);align-self:center;padding-bottom:8px}
        .fab{width:50px;height:50px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);transition:all .2s;position:relative;text-decoration:none;flex-shrink:0}
        .fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.3)}
        .fab-wa{background:#25D366}
        .fab-adm{background:#08122d;border:1px solid rgba(255,255,255,0.12)}
        .fab-tip{position:absolute;left:58px;background:rgba(6,14,36,0.9);color:#fff;font-size:11px;font-weight:500;padding:4px 10px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none}
        .fab:hover .fab-tip{opacity:1}

        /* RESPONSIVE */
        @media(max-width:900px){
          .nav{padding:0 20px;grid-template-columns:auto 1fr}
          .nav-left{display:none}
          .nav-logo{justify-content:flex-start}
          .about,.ct{padding:72px 24px}
          .bot{padding:72px 24px}
          .gal-head{padding:72px 24px 40px;flex-direction:column;gap:12px;align-items:flex-start}
          .gal-strip{padding:0 24px}
          .about-grid,.bot-grid,.ct-grid{grid-template-columns:1fr;gap:48px}
          .stats{grid-template-columns:1fr 1fr}
          .frow{grid-template-columns:1fr}
          .cform{padding:24px 20px}
          footer{padding:52px 24px 28px}
          .foot-top{flex-direction:column;gap:36px}
          .foot-cols{gap:28px}
          .hero-c{padding:0 24px 56px;flex-direction:column;align-items:flex-start;gap:16px}
          .hero-right{align-items:flex-start;max-width:100%}
          .hero-sub{text-align:left}
          .hero-logo-card{display:none}
          .fabs{bottom:20px;right:16px}
          .tools{padding:72px 24px}
          .tools-grid{grid-template-columns:1fr;gap:20px}
        }
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <a onClick={() => go("nosotros")}>Nosotros</a>
          <a onClick={() => go("galeria")}>Galería</a>
          <a onClick={() => go("servicios")}>Servicios</a>
          <a onClick={() => go("bot")}>Únete</a>
          <a onClick={() => go("contacto")}>Contacto</a>
        </div>
        <div className="nav-logo" onClick={() => go("inicio")}>
          <img src="/LOGOMJ2.png" alt="Coro MJ" onError={e => e.target.style.display="none"}/>
        </div>
        <div className="nav-right">
          {C.instagram_url && <a href={C.instagram_url} target="_blank" rel="noopener noreferrer" className="nav-soc" title="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.75)" stroke="none"/></svg></a>}
          {C.tiktok_url && <a href={C.tiktok_url} target="_blank" rel="noopener noreferrer" className="nav-soc" title="TikTok"><svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg></a>}
          {C.youtube_url && <a href={C.youtube_url} target="_blank" rel="noopener noreferrer" className="nav-soc" title="YouTube"><svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="rgba(6,14,36,0.9)"/></svg></a>}
          <button className="nav-cta" onClick={onPortal}>Acceso Portal</button>
        </div>
      </nav>

      {/* HERO */}
      <section id="inicio" className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url('${C.hero_img}')` }}/>
        <div className="hero-ov"/>
        <div className="hero-c">
          <div>
            <span className="hero-kicker">{C.hero_kicker}</span>
            <h1 className="hero-h1">{C.hero_titulo}<br/><span className="it">{C.hero_titulo2}</span></h1>
          </div>
          <div className="hero-right">
            <HeroCountdown evento={{ nombre: C.evento_nombre, fecha: C.evento_fecha, hora: C.evento_hora, lugar: C.evento_lugar }} />
            <p className="hero-sub">{C.hero_sub}</p>
            <div className="hero-btns">
              <button className="btn-w" onClick={() => go("nosotros")}>Conócenos</button>
              <button className="btn-o" onClick={() => go("bot")}>Únete</button>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-track">
          {["Música litúrgica","Maipú · Chile","Desde 2024","15+ años de experiencia","4 voces SATB","400+ presentaciones","Ensemble vocal","Música litúrgica","Maipú · Chile","Desde 2024","15+ años de experiencia","4 voces SATB","400+ presentaciones","Ensemble vocal"].map((t,i) => (
            <span key={i} className="t-item"><span className="t-dot"/>{t}</span>
          ))}
        </div>
      </div>

      {/* NOSOTROS */}
      <section className="about" id="nosotros">
        <div className="about-grid">
          <div>
            <div className="ey">Quiénes somos</div>
            <h2 className="h2">Un ensemble<br/>con <em>identidad</em><br/>propia</h2>
            <p className="bp">{C.about_texto1}</p>
            <p className="bp" style={{marginTop:14}}>{C.about_texto2}</p>
            <div className="stats">
              <div className="stat"><div className="stat-n">{C.stat1_n.replace("+","")}<sup>+</sup></div><div className="stat-l">{C.stat1_l}</div></div>
              <div className="stat"><div className="stat-n">{C.stat2_n.replace("+","")}<sup>+</sup></div><div className="stat-l">{C.stat2_l}</div></div>
              <div className="stat"><div className="stat-n">{C.stat3_n.replace("+","")}<sup>+</sup></div><div className="stat-l">{C.stat3_l}</div></div>
            </div>
          </div>
          <div className="about-img">
            <div className="about-img-bg" style={{ backgroundImage: `url('${C.about_img}')` }}/>
            <div className="about-img-overlay"/>
            <div className="about-img-accent">
              <div className="acc-n">SATB</div>
              <div className="acc-l">Cuerdas</div>
            </div>
            <div className="about-img-badge">
              <div className="badge-l">Integrantes desde</div>
              <div className="badge-v">2024</div>
            </div>
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      <section id="galeria" className="gal">
        <div className="gal-head">
          <div>
            <div className="ey">Galería</div>
            <h2 className="h2" style={{marginBottom:0}}>Momentos que<br/><em>inspiran</em></h2>
          </div>
          <p className="gal-note">Cada celebración es única. Aquí algunos de nuestros momentos más especiales.</p>
        </div>
        <div className="gal-strip">
          {[1,2,3,4,5].map(n => {
            const img = C[`gal${n}_img`]; const label = C[`gal${n}_label`]; const sub = C[`gal${n}_sub`]; const pos = C[`gal${n}_pos`] || 'center top';
            return (
              <div key={n} className="gi">
                {img
                  ? <div style={{
                      position:"absolute", inset:0,
                      backgroundImage: `url('${img}')`,
                      backgroundSize: "cover",
                      backgroundPosition: pos,
                      backgroundRepeat: "no-repeat",
                      transition: "transform 0.6s ease"
                    }} className="gi-bg"/>
                  : <div className="gi-bg" style={{
                      background: gColors[n-1],
                      position: "absolute", inset: 0
                    }}/>
                }
                <div className="gi-ov"/>
                <div className="gi-tag">{sub}</div>
                <div className="gi-cap"><div className="gi-label">{label}</div></div>
                <div className="gi-hov"><div className="gi-hov-btn">Ver foto</div></div>
              </div>
            );
          })}
        </div>
      </section>


      {/* SERVICIOS */}
      <section id="servicios" style={{padding:"100px 60px",background:"#f8f9fc"}}>
        <div style={{maxWidth:1140,margin:"0 auto"}}>
          <div className="ey">Lo que ofrecemos</div>
          <h2 className="h2">Nuestros <em>servicios</em></h2>
          <p className="bp" style={{marginBottom:52,maxWidth:560}}>Animamos celebraciones con música litúrgica en vivo. Contáctanos para coordinar tu evento.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l2.5 2.5L16 9"/></svg>, title:C.srv1_title, desc:C.srv1_desc},
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, title:C.srv2_title, desc:C.srv2_desc},
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, title:C.srv3_title, desc:C.srv3_desc},
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>, title:C.srv4_title, desc:C.srv4_desc},
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>, title:C.srv5_title, desc:C.srv5_desc},
              {icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, title:C.srv6_title, desc:C.srv6_desc},
            ].map(({icon,title,desc}) => (
              <div key={title} style={{background:"#fff",borderRadius:16,padding:28,border:"1px solid #e4eaf5",transition:"all .2s",cursor:"default"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 32px rgba(8,18,45,0.1)";e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none"}}>
                <div style={{width:48,height:48,borderRadius:12,background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18}}>{icon}</div>
                <div style={{fontSize:15,fontWeight:700,color:"#08122d",marginBottom:8,letterSpacing:"-0.01em"}}>{title}</div>
                <p style={{fontSize:13.5,color:"#888",lineHeight:1.7,fontWeight:300,textAlign:"justify"}}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:48}}>
            <button onClick={() => document.getElementById("contacto").scrollIntoView({behavior:"smooth"})}
              style={{background:"#F97316",color:"#fff",border:"none",borderRadius:980,padding:"14px 36px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Cotizar servicio
            </button>
          </div>
        </div>
      </section>

      {/* BOT */}
      <section className="bot" id="bot">
        <div className="bot-grid">
          <div>
            <div className="ey bot-ey">Asistente IA</div>
            <h2 className="h2 bot-h2">¿Te sumas<br/><em>al coro?</em></h2>
            <p className="bp bot-p">Respuestas inmediatas sobre cómo integrarte, ensayos y todo lo que necesitas saber.</p>
            <div className="bfeats">
              {[["01","Proceso de ingreso","Cómo postular, qué se evalúa y cuándo son los ensayos de prueba."],["02","Horarios y ensayos","Frecuencia semanal, lugar y cómo es el proceso de incorporación."],["03","Repertorio y nivel","Qué cantamos y qué experiencia musical se valora."]].map(([n,t,d]) => (
                <div key={n} className="bfeat"><div className="bnum">{n}</div><div><div className="btitle">{t}</div><div className="bdesc">{d}</div></div></div>
              ))}
            </div>
          </div>
          <div>
            <div className="chat">
              <div className="chat-hd">
                <div className="chat-av">🎵</div>
                <div><div className="chat-nm">Coro MJ — Asistente</div><div className="chat-sm">Responde en español · IA</div></div>
                <div className="chat-dot"/>
              </div>
              <div className="chat-msgs" ref={msgsRef}>
                {chat.map((m,i) => (
                  <div key={i} className={`cm${m.role==="user"?" cm-u":""}`}>
                    {m.role==="bot"&&<div className="cm-av">🎵</div>}
                    <div className={`cm-b ${m.role==="bot"?"cm-bot":"cm-usr"}`}>{m.text}</div>
                    {m.role==="user"&&<div className="cm-av">👤</div>}
                  </div>
                ))}
                {typing&&<div className="cm"><div className="cm-av">🎵</div><div className="cm-b cm-bot"><div className="tdots"><span/><span/><span/></div></div></div>}
              </div>
              <div className="chat-pills">
                {["¿Cómo me uno?","¿Cuándo ensayan?","¿Qué nivel necesito?"].map(p=><button key={p} className="cpill" onClick={()=>sendMsg(p)}>{p}</button>)}
              </div>
              <div className="chat-ft">
                <input className="cin" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Escribe tu pregunta..."/>
                <button className="csnd" onClick={()=>sendMsg()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERRAMIENTAS MUSICALES */}
      <section className="tools" id="herramientas" style={{padding:"100px 60px",background:"#fff"}}>
        <div style={{maxWidth:1140,margin:"0 auto"}}>
          <div className="ey">Herramientas</div>
          <h2 className="h2" style={{marginBottom:8}}>Utilidades <em>musicales</em></h2>
          <p className="bp" style={{marginBottom:48}}>Herramientas para ensayar, afinar y transponer en tiempo real.</p>
          <div className="tools-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>

            {/* METRÓNOMO */}
            <ToolMetronome />

            {/* AFINADOR */}
            <ToolTuner />

            {/* ACORDES GUITARRA */}
            <ToolChords />

          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="ct" id="contacto">
        <div className="ct-grid">
          <div>
            <div className="ey">Contacto</div>
            <h2 className="h2">Hablemos<br/><em>directamente</em></h2>
            <p className="bp">¿Quieres invitarnos o tienes alguna consulta?</p>
            <div style={{marginTop:36}}>
              <div className="ct-item">
                <div className="ct-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08122d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div><div className="ct-t">Ubicación</div><div className="ct-s">{C.contacto_dir}</div></div>
              </div>
              <div className="ct-item">
                <div className="ct-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08122d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <div><div className="ct-t">Ensayos</div><div className="ct-s">{C.contacto_ensayo}</div></div>
              </div>
              <div className="ct-item">
                <div className="ct-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08122d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <div><div className="ct-t">Redes sociales</div><div className="ct-s">Síguenos en nuestras plataformas</div></div>
              </div>
            </div>
            <div className="socs">
              {C.instagram_url && <a href={C.instagram_url} target="_blank" rel="noopener noreferrer" className="soc" title="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08122d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="#08122d" stroke="none"/></svg></a>}
              {C.facebook_url && <a href={C.facebook_url} target="_blank" rel="noopener noreferrer" className="soc" title="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="#08122d"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>}
              {C.youtube_url && <a href={C.youtube_url} target="_blank" rel="noopener noreferrer" className="soc" title="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="#08122d"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff"/></svg></a>}
              {C.tiktok_url && <a href={C.tiktok_url} target="_blank" rel="noopener noreferrer" className="soc" title="TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="#08122d"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg></a>}
            </div>
          </div>
          <div className="cform">
            <div className="cform-h">Envíanos<br/>un mensaje</div>
            <div className="frow">
              <div className="fg"><label>Nombre</label><input type="text" placeholder="Juan"/></div>
              <div className="fg"><label>Apellido</label><input type="text" placeholder="González"/></div>
            </div>
            <div className="fg"><label>Correo</label><input type="email" placeholder="tu@correo.cl"/></div>
            <div className="fg"><label>Servicio o consulta</label><select>
                <option value="">Selecciona una opción</option>
                <optgroup label="Servicios">
                  <option>Matrimonio</option>
                  <option>Misa de acción de gracias o aniversario</option>
                  <option>Celebración parroquial</option>
                  <option>Encuentro o jornada de espiritualidad</option>
                  <option>Concierto de música sacra o religiosa</option>
                  <option>Cantata o celebración de Adviento / Navidad</option>
                  <option>Comunión o Confirmación</option>
                </optgroup>
                <optgroup label="Otro">
                  <option>Quiero unirme al coro</option>
                  <option>Consulta general</option>
                </optgroup>
              </select></div>
            <div className="fg"><label>Mensaje</label><textarea placeholder="Cuéntanos..."/></div>
            <button className="fsub" onClick={()=>{setFormOk(true);setTimeout(()=>setFormOk(false),3e3)}}>{formOk?"✓ Enviado":"Enviar mensaje"}</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="foot-top">
          <div>
            <img src="/LOGOMJ.jpeg" className="foot-logo" alt="Logo" onError={e=>e.target.style.display="none"}/>
            <div className="foot-bn">Coro Misioneros de Jesús</div>
            <p className="foot-bp">{C.footer_texto}</p>
            {/* Redes sociales también en la columna izquierda en mobile */}
            <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
              {C.instagram_url && <a href={C.instagram_url} target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.7)" stroke="none"/></svg></a>}
              {C.tiktok_url && <a href={C.tiktok_url} target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg></a>}
              {C.youtube_url && <a href={C.youtube_url} target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="rgba(6,14,36,0.9)"/></svg></a>}
              {C.facebook_url && <a href={C.facebook_url} target="_blank" rel="noopener noreferrer" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>}
            </div>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Sitio</h4>
              <a onClick={()=>go("nosotros")}>Nosotros</a>
              <a onClick={()=>go("galeria")}>Galería</a>
              <a onClick={()=>go("servicios")}>Servicios</a>
              <a onClick={()=>go("bot")}>Únete</a>
              <a onClick={()=>go("contacto")}>Contacto</a>
            </div>
            <div className="foot-col">
              <h4>Redes</h4>
              {C.instagram_url ? <a href={C.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a> : <a style={{opacity:0.3,cursor:"default"}}>Instagram</a>}
              {C.tiktok_url ? <a href={C.tiktok_url} target="_blank" rel="noopener noreferrer">TikTok</a> : <a style={{opacity:0.3,cursor:"default"}}>TikTok</a>}
              {C.youtube_url ? <a href={C.youtube_url} target="_blank" rel="noopener noreferrer">YouTube</a> : <a style={{opacity:0.3,cursor:"default"}}>YouTube</a>}
              {C.facebook_url ? <a href={C.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a> : <a style={{opacity:0.3,cursor:"default"}}>Facebook</a>}
            </div>
          </div>
        </div>
        <div className="foot-btm">
          <span className="foot-copy">
            © {new Date().getFullYear()} Coro Misioneros de Jesús · Todos los derechos reservados · Desarrollado por{" "}
            <a href="http://www.tempvs7.cl" target="_blank" rel="noopener noreferrer" style={{color:"#F97316",textDecoration:"none",fontWeight:600}}>TEMPVS7®</a>
          </span>
          <span className="foot-adm" onClick={()=>setAdmin(true)}>· · ·</span>
        </div>
      </footer>

      {/* FABS */}
      <div className="fabs">
        <button className="fab fab-adm" onClick={()=>setAdmin(true)}>
          <span className="fab-tip">Editor del sitio</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <a className="fab fab-wa" href={C.whatsapp ? `https://wa.me/${C.whatsapp}?text=Hola,%20me%20interesa%20el%20Coro%20Misioneros%20de%20Jes%C3%BAs` : "#"} target="_blank" rel="noopener noreferrer">
          <span className="fab-tip">WhatsApp</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </a>
      </div>
    </div>
  );
}
