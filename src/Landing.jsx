import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/publico`;
const SYS = `Eres el asistente del Coro Misioneros de Jesús, ensemble vocal de música litúrgica profesional en Maipú, Chile. Responde en español, de forma concisa (máx 2-3 oraciones), profesional y cercana. Solo respondes sobre el coro: ingreso, ensayos (sábados), nivel musical, repertorio litúrgico contemporáneo, cuerdas SATB. Para contacto dirígelos al formulario del sitio.`;

const DEFAULT = {
  hero_img: `${BUCKET}/Misioneros.jpg`,
  about_img: `${BUCKET}/Misioneros.jpg`,
  hero_titulo: "Misioneros", hero_titulo2: "de Jesús",
  hero_kicker: "Coro · Maipú · Chile",
  hero_sub: "Ensemble vocal de música litúrgica contemporánea. Quince años animando la fe en Maipú.",
  about_titulo: "Un ensemble con identidad propia",
  about_texto1: "Somos un coro de música litúrgica con más de 15 años en actividad. Soprano, contralto, tenor y bajo, acompañados de instrumentos en vivo.",
  about_texto2: "Nuestra disciplina musical y compromiso con el repertorio nos definen como un conjunto vocal de alto nivel dentro de la tradición litúrgica contemporánea.",
  stat1_n:"15+",stat1_l:"Años activos",stat2_n:"30+",stat2_l:"Voces",stat3_n:"400+",stat3_l:"Presentaciones",
  gal1_label:"Navidad 2023",gal1_sub:"Diciembre",gal1_img:"",
  gal2_label:"Semana Santa",gal2_sub:"Abril",gal2_img:"",
  gal3_label:"Fiesta Patronal",gal3_sub:"Agosto",gal3_img:"",
  gal4_label:"Corpus Christi",gal4_sub:"Junio",gal4_img:"",
  gal5_label:"Vigilia Pascual",gal5_sub:"Marzo",gal5_img:"",
  contacto_dir:"Maipú, Santiago, Chile · Capilla Sagrada Familia",
  contacto_ensayo:"Sábados · Capilla Misioneros de Jesús",
  whatsapp:"56912345678",
  footer_texto:"Ensemble vocal de música litúrgica. Maipú, Santiago de Chile.",
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

const ADMIN_PASS = "coromj2026";

export default function Landing({ onPortal }) {
  const [C, setC] = useState(DEFAULT);
  const [chat, setChat] = useState([{ role: "bot", text: "Hola, soy el asistente del Coro MJ. ¿En qué te puedo orientar?" }]);
  const [inp, setInp] = useState(""); const [typing, setTyping] = useState(false); const [hist, setHist] = useState([]);
  const [formOk, setFormOk] = useState(false);
  const [admin, setAdmin] = useState(false); const [adminAuth, setAdminAuth] = useState(false);
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
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYS, messages: nh }) });
      const d = await r.json(); const reply = d.content?.[0]?.text || "Intenta nuevamente.";
      setTyping(false); setChat(p => [...p, { role: "bot", text: reply }]); setHist(p => [...p, { role: "assistant", content: reply }]);
    } catch { setTyping(false); setChat(p => [...p, { role: "bot", text: "Error de conexión." }]); }
  }
  async function saveF(key) {
    setSaving(s => ({ ...s, [key]: true }));
    await dbSet(key, editing[key] ?? C[key]);
    setC(c => ({ ...c, [key]: editing[key] ?? c[key] }));
    setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    setSaving(s => ({ ...s, [key]: false }));
  }
  async function handleImg(key, file, name) {
    setUpKey(key);
    try { const url = await uploadImg(file, name); await dbSet(key, url); setC(c => ({ ...c, [key]: url })); }
    catch (e) { alert("Error: " + e.message); }
    setUpKey(null);
  }

  const F = ({ label, k, ta }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      {ta ? <textarea value={editing[k] ?? C[k]} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", border: "1px solid #e0e6f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 72, outline: "none" }} />
          : <input value={editing[k] ?? C[k]} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", border: "1px solid #e0e6f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />}
      <button onClick={() => saveF(k)} disabled={saving[k]} style={{ marginTop: 5, background: "#08122d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: saving[k] ? 0.6 : 1 }}>{saving[k] ? "..." : "Guardar"}</button>
    </div>
  );
  const IF = ({ label, k, name }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {C[k] && <img src={C[k]} alt="" style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />}
      <label style={{ display: "inline-block", background: "#f0f4ff", border: "1px solid #d0d8f0", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer", color: "#08122d" }}>
        {upKey === k ? "Subiendo..." : "📁 Subir"}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleImg(k, e.target.files[0], name)} />
      </label>
    </div>
  );

  const AdminPanel = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setAdmin(false)}>
      <div style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 520, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ background: "#08122d", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>⚙️ Editor del sitio</div>
          <button onClick={() => setAdmin(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>
        {!adminAuth ? (
          <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#08122d" }}>Contraseña de acceso</div>
            <input type="password" id="adm-pw" placeholder="Contraseña" style={{ border: "1px solid #dde4f0", borderRadius: 10, padding: "12px 16px", fontSize: 15, fontFamily: "inherit", outline: "none" }} onKeyDown={e => e.key === "Enter" && (document.getElementById("adm-pw").value === ADMIN_PASS ? setAdminAuth(true) : alert("Incorrecta"))} />
            <button onClick={() => document.getElementById("adm-pw").value === ADMIN_PASS ? setAdminAuth(true) : alert("Contraseña incorrecta")} style={{ background: "#08122d", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Entrar</button>
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: "24px 24px 40px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Hero</div>
            <IF label="Imagen fondo" k="hero_img" name="landing_hero" />
            <F label="Título 1" k="hero_titulo" /><F label="Título 2 italic" k="hero_titulo2" /><F label="Subtexto" k="hero_sub" ta />
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>👥 Nosotros</div>
            <IF label="Imagen nosotros" k="about_img" name="landing_about" />
            <F label="Título" k="about_titulo" /><F label="Párrafo 1" k="about_texto1" ta /><F label="Párrafo 2" k="about_texto2" ta />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              {[1,2,3].map(n => <div key={n}><F label={`Stat ${n} #`} k={`stat${n}_n`} /><F label="Label" k={`stat${n}_l`} /></div>)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Galería</div>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ background: "#f8f9fc", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: "#666", marginBottom: 8 }}>Foto {n}</div>
                <IF label="Imagen" k={`gal${n}_img`} name={`landing_gal${n}`} />
                <F label="Título" k={`gal${n}_label`} /><F label="Subtítulo" k={`gal${n}_sub`} />
              </div>
            ))}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#08122d", margin: "20px 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>📍 Contacto</div>
            <F label="WhatsApp (ej: 56912345678)" k="whatsapp" /><F label="Dirección" k="contacto_dir" /><F label="Ensayos" k="contacto_ensayo" /><F label="Footer texto" k="footer_texto" ta />
          </div>
        )}
      </div>
    </div>
  );

  const gColors = ["linear-gradient(135deg,#0a1628,#1e3a6e)","linear-gradient(135deg,#1a0a2e,#3d1a6e)","linear-gradient(135deg,#0a2818,#1a5c3a)","linear-gradient(135deg,#2e1a0a,#6e3d1a)","linear-gradient(135deg,#0a1a2e,#1a3d5c)"];

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',sans-serif", background: "#fff", color: "#0a0a14", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      {admin && <AdminPanel />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,300&family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400;1,9..144,700&display=swap');
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
        .nav-cta{background:#fff;color:#08122d;border:none;border-radius:980px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;margin-left:8px;letter-spacing:0.01em}
        .nav-cta:hover{background:#e8f0fc;transform:translateY(-1px)}

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
        .ticker{background:#08122d;padding:0;overflow:hidden;white-space:nowrap;position:relative}
        .ticker::before,.ticker::after{content:'';position:absolute;top:0;bottom:0;width:80px;z-index:2}
        .ticker::before{left:0;background:linear-gradient(to right,#08122d,transparent)}
        .ticker::after{right:0;background:linear-gradient(to left,#08122d,transparent)}
        .ticker-track{display:inline-flex;animation:tick 25s linear infinite;padding:14px 0}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .t-item{display:inline-flex;align-items:center;gap:10px;padding:0 28px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4)}
        .t-dot{width:3px;height:3px;border-radius:50%;background:#5a8fff;flex-shrink:0}

        /* NOSOTROS */
        .about{padding:112px 60px;background:#fff;position:relative;overflow:hidden}
        .about::before{content:'';position:absolute;top:-120px;right:-120px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(90,143,255,0.06) 0%,transparent 70%);pointer-events:none}
        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;max-width:1140px;margin:0 auto}
        .ey{font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#5a8fff;margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .ey::before{content:'';width:20px;height:2px;background:#5a8fff;border-radius:2px}
        .h2{font-size:clamp(36px,4.2vw,56px);font-weight:800;line-height:1.08;letter-spacing:-0.025em;color:#0a0a14;margin-bottom:22px}
        .h2 em{font-family:'Fraunces',serif;font-style:italic;font-weight:400;color:#08122d}
        .bp{font-size:15px;font-weight:300;line-height:1.85;color:#555}
        .about-img{position:relative;aspect-ratio:3/4;border-radius:24px;overflow:hidden;background:#eef2fb}
        .about-img-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.22}
        .about-img-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(6,14,36,0.92) 100%)}
        .about-img-badge{position:absolute;bottom:0;left:0;right:0;padding:28px 32px}
        .badge-l{font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)}
        .badge-v{font-size:44px;font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1}
        .about-img-accent{position:absolute;top:24px;right:24px;background:rgba(90,143,255,0.15);backdrop-filter:blur(8px);border:1px solid rgba(90,143,255,0.3);border-radius:12px;padding:12px 16px;text-align:center}
        .acc-n{font-size:22px;font-weight:800;color:#fff}
        .acc-l{font-size:9px;color:rgba(255,255,255,0.55);letter-spacing:0.1em;text-transform:uppercase;margin-top:2px}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:44px;border-top:1px solid #eaeef5;padding-top:36px;gap:0}
        .stat{padding-right:24px;border-right:1px solid #eaeef5}
        .stat:last-child{padding-left:24px;padding-right:0;border-right:none}
        .stat:nth-child(2){padding:0 24px}
        .stat-n{font-size:44px;font-weight:900;color:#08122d;line-height:1;letter-spacing:-0.03em}
        .stat-n sup{font-size:20px;color:#5a8fff}
        .stat-l{font-size:11px;color:#aaa;margin-top:5px;font-weight:500}

        /* GALERÍA */
        .gal{padding:0 0 112px;background:#fff}
        .gal-head{padding:112px 60px 56px;display:flex;justify-content:space-between;align-items:flex-end;max-width:1140px;margin:0 auto}
        .gal-note{font-size:14px;font-weight:300;color:#888;max-width:220px;text-align:right;line-height:1.7}
        .gal-strip{display:flex;gap:0;overflow-x:auto;scrollbar-width:none;padding:0 60px}
        .gal-strip::-webkit-scrollbar{display:none}
        .gi{flex-shrink:0;position:relative;cursor:pointer;overflow:hidden;border-radius:20px;margin-right:16px}
        .gi:nth-child(1){width:420px;height:520px}
        .gi:nth-child(2){width:280px;height:520px}
        .gi:nth-child(3){width:340px;height:520px}
        .gi:nth-child(4){width:280px;height:520px}
        .gi:nth-child(5){width:380px;height:520px}
        .gi-bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform .6s ease}
        .gi:hover .gi-bg{transform:scale(1.04)}
        .gi-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,14,36,0.9) 0%,rgba(6,14,36,0.2) 55%,transparent 100%);transition:opacity .3s}
        .gi-tag{position:absolute;top:20px;left:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);border-radius:980px;padding:5px 14px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.8)}
        .gi-cap{position:absolute;bottom:0;left:0;right:0;padding:24px}
        .gi-label{font-size:17px;font-weight:700;color:#fff;line-height:1.2}
        .gi-sub{font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.1em;text-transform:uppercase;margin-top:5px}
        .gi-hov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s}
        .gi:hover .gi-hov{opacity:1}
        .gi-hov-btn{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,0.6);border-radius:980px;padding:9px 22px;backdrop-filter:blur(4px)}

        /* BOT */
        .bot{padding:112px 60px;background:linear-gradient(160deg,#060e24 0%,#0d1f45 100%);position:relative;overflow:hidden}
        .bot::before{content:'♪';position:absolute;top:-20px;right:60px;font-size:320px;color:rgba(255,255,255,0.02);font-family:'Fraunces',serif;line-height:1;pointer-events:none;user-select:none}
        .bot::after{content:'';position:absolute;bottom:-80px;left:-80px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(90,143,255,0.08) 0%,transparent 70%);pointer-events:none}
        .bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;max-width:1140px;margin:0 auto;position:relative;z-index:1}
        .bot-ey{color:rgba(90,143,255,0.8)}
        .bot-ey::before{background:rgba(90,143,255,0.8)}
        .bot-h2{color:#fff}
        .bot-h2 em{color:rgba(255,255,255,0.85)}
        .bot-p{color:rgba(255,255,255,0.5)}
        .bfeats{margin-top:44px}
        .bfeat{padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;gap:18px;align-items:flex-start}
        .bfeat:first-child{border-top:1px solid rgba(255,255,255,0.07)}
        .bnum{font-size:11px;font-weight:700;color:rgba(90,143,255,0.5);flex-shrink:0;padding-top:2px;letter-spacing:0.1em}
        .btitle{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
        .bdesc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;font-weight:300}
        .chat{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;backdrop-filter:blur(10px)}
        .chat-hd{background:rgba(255,255,255,0.06);padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .chat-av{width:34px;height:34px;border-radius:50%;background:rgba(90,143,255,0.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .chat-nm{font-size:13px;font-weight:600;color:#fff}
        .chat-sm{font-size:10.5px;color:rgba(255,255,255,0.35)}
        .chat-dot{width:7px;height:7px;border-radius:50%;background:#34d399;margin-left:auto}
        .chat-msgs{padding:16px;min-height:240px;max-height:270px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
        .cm{display:flex;gap:8px}.cm-u{flex-direction:row-reverse}
        .cm-av{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px}
        .cm-b{max-width:82%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.5}
        .cm-bot{background:rgba(255,255,255,0.08);color:#fff;border-radius:4px 14px 14px 14px}
        .cm-usr{background:#5a8fff;color:#fff;border-radius:14px 4px 14px 14px}
        .tdots{display:flex;gap:4px;padding:10px 14px}
        .tdots span{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.3);animation:td 1.2s infinite}
        .tdots span:nth-child(2){animation-delay:.2s}.tdots span:nth-child(3){animation-delay:.4s}
        @keyframes td{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
        .chat-pills{display:flex;gap:6px;padding:10px 16px 8px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.06)}
        .cpill{border:1px solid rgba(255,255,255,0.15);border-radius:980px;padding:5px 12px;font-size:11.5px;color:rgba(255,255,255,0.7);cursor:pointer;background:transparent;font-family:inherit;transition:all .15s}
        .cpill:hover{background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.3)}
        .chat-ft{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,0.07)}
        .cin{flex:1;border:1px solid rgba(255,255,255,0.12);border-radius:980px;padding:9px 16px;font-size:13.5px;font-family:inherit;color:#fff;outline:none;background:rgba(255,255,255,0.07);transition:border-color .2s}
        .cin:focus{border-color:rgba(90,143,255,0.5)}
        .cin::placeholder{color:rgba(255,255,255,0.25)}
        .csnd{width:36px;height:36px;border-radius:50%;background:#5a8fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s}
        .csnd:hover{background:#7aa3ff}

        /* CONTACTO */
        .ct{padding:112px 60px;background:#f5f7fc;position:relative;overflow:hidden}
        .ct::after{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(to right,#5a8fff,#08122d,#5a8fff)}
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
        .fg input:focus,.fg textarea:focus,.fg select:focus{border-color:#5a8fff;background:#fff}
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
        .foot-bp{font-size:13px;color:rgba(255,255,255,0.28);font-weight:300;line-height:1.7;max-width:220px}
        .foot-cols{display:flex;gap:56px}
        .foot-col h4{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:16px}
        .foot-col a{display:block;font-size:13.5px;color:rgba(255,255,255,0.4);text-decoration:none;margin-bottom:10px;font-weight:300;cursor:pointer;transition:color .2s}
        .foot-col a:hover{color:#fff}
        .foot-btm{display:flex;justify-content:space-between;align-items:center;padding-top:28px;max-width:1140px;margin:0 auto}
        .foot-copy{font-size:11.5px;color:rgba(255,255,255,0.16)}
        .foot-adm{font-size:11px;color:rgba(255,255,255,0.05);cursor:pointer;padding:4px 8px;user-select:none;letter-spacing:0.2em;transition:color .4s}
        .foot-adm:hover{color:rgba(255,255,255,0.25)}

        /* FABS */
        .fabs{position:fixed;bottom:28px;right:24px;z-index:9000;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
        .fab{width:50px;height:50px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);transition:all .2s;position:relative;text-decoration:none;flex-shrink:0}
        .fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.3)}
        .fab-wa{background:#25D366}
        .fab-adm{background:#08122d;border:1px solid rgba(255,255,255,0.12)}
        .fab-tip{position:absolute;right:58px;background:rgba(6,14,36,0.9);color:#fff;font-size:11px;font-weight:500;padding:4px 10px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none}
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
          .hero-c{padding:0 24px 56px;flex-direction:column;align-items:flex-start;gap:24px}
          .hero-right{align-items:flex-start;max-width:100%}
          .hero-sub{text-align:left}
        }
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <a onClick={() => go("nosotros")}>Nosotros</a>
          <a onClick={() => go("galeria")}>Galería</a>
          <a onClick={() => go("bot")}>Únete</a>
          <a onClick={() => go("contacto")}>Contacto</a>
        </div>
        <div className="nav-logo" onClick={() => go("inicio")}>
          <img src="/LOGOMJ2.png" alt="Coro MJ" onError={e => e.target.style.display="none"}/>
        </div>
        <div className="nav-right">
          <button className="nav-soc"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.7)" stroke="none"/></svg></button>
          <button className="nav-soc"><svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg></button>
          <button className="nav-soc"><svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg></button>
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
          {["Música litúrgica","Maipú · Chile","15 años","4 voces SATB","400+ presentaciones","Ensemble vocal","Música litúrgica","Maipú · Chile","15 años","4 voces SATB","400+ presentaciones","Ensemble vocal"].map((t,i) => (
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
              <div className="badge-l">Desde</div>
              <div className="badge-v">2010</div>
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
            const img = C[`gal${n}_img`]; const label = C[`gal${n}_label`]; const sub = C[`gal${n}_sub`];
            return (
              <div key={n} className="gi">
                <div className="gi-bg" style={{ backgroundImage: img ? `url('${img}')` : "none", background: img ? undefined : gColors[n-1] }}/>
                <div className="gi-ov"/>
                <div className="gi-tag">{sub}</div>
                <div className="gi-cap"><div className="gi-label">{label}</div></div>
                <div className="gi-hov"><div className="gi-hov-btn">Ver foto</div></div>
              </div>
            );
          })}
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

      {/* CONTACTO */}
      <section className="ct" id="contacto">
        <div className="ct-grid">
          <div>
            <div className="ey">Contacto</div>
            <h2 className="h2">Hablemos<br/><em>directamente</em></h2>
            <p className="bp">¿Quieres invitarnos o tienes alguna consulta?</p>
            <div style={{marginTop:36}}>
              <div className="ct-item"><div className="ct-ico">📍</div><div><div className="ct-t">Ubicación</div><div className="ct-s">{C.contacto_dir}</div></div></div>
              <div className="ct-item"><div className="ct-ico">🎵</div><div><div className="ct-t">Ensayos</div><div className="ct-s">{C.contacto_ensayo}</div></div></div>
              <div className="ct-item"><div className="ct-ico">📲</div><div><div className="ct-t">Redes sociales</div><div className="ct-s">Síguenos en nuestras plataformas</div></div></div>
            </div>
            <div className="socs"><div className="soc">📸</div><div className="soc">📘</div><div className="soc">▶️</div><div className="soc">🎧</div></div>
          </div>
          <div className="cform">
            <div className="cform-h">Envíanos<br/>un mensaje</div>
            <div className="frow">
              <div className="fg"><label>Nombre</label><input type="text" placeholder="Juan"/></div>
              <div className="fg"><label>Apellido</label><input type="text" placeholder="González"/></div>
            </div>
            <div className="fg"><label>Correo</label><input type="email" placeholder="tu@correo.cl"/></div>
            <div className="fg"><label>Asunto</label><select><option>Quiero unirme al coro</option><option>Invitación a celebración</option><option>Consulta general</option><option>Otro</option></select></div>
            <div className="fg"><label>Mensaje</label><textarea placeholder="Cuéntanos..."/></div>
            <button className="fsub" onClick={()=>{setFormOk(true);setTimeout(()=>setFormOk(false),3e3)}}>{formOk?"✓ Enviado":"Enviar mensaje"}</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="foot-top">
          <div>
            <img src="/LOGOMJ2.png" className="foot-logo" alt="Logo" onError={e=>e.target.style.display="none"}/>
            <div className="foot-bn">Coro Misioneros de Jesús</div>
            <p className="foot-bp">{C.footer_texto}</p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Sitio</h4>
              <a onClick={()=>go("nosotros")}>Nosotros</a>
              <a onClick={()=>go("galeria")}>Galería</a>
              <a onClick={()=>go("bot")}>Únete</a>
              <a onClick={()=>go("contacto")}>Contacto</a>
            </div>
            <div className="foot-col">
              <h4>Redes</h4>
              <a>Instagram</a><a>TikTok</a><a>YouTube</a><a>Spotify</a>
            </div>
          </div>
        </div>
        <div className="foot-btm">
          <span className="foot-copy">© 2026 Coro Misioneros de Jesús · Desarrollado por TEMPVS7®</span>
          <span className="foot-adm" onClick={()=>setAdmin(true)}>· · ·</span>
        </div>
      </footer>

      {/* FABS */}
      <div className="fabs">
        <button className="fab fab-adm" onClick={()=>setAdmin(true)}>
          <span className="fab-tip">Editar sitio</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
        <a className="fab fab-wa" href={`https://wa.me/${C.whatsapp}?text=Hola,%20me%20interesa%20el%20Coro%20Misioneros%20de%20Jes%C3%BAs`} target="_blank" rel="noopener noreferrer">
          <span className="fab-tip">WhatsApp</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </a>
      </div>
    </div>
  );
}
