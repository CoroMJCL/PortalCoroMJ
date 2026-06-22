import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/publico`;

const SYS = `Eres el asistente del Coro Misioneros de Jesús, ensemble vocal de música litúrgica profesional en Maipú, Chile. Responde en español, de forma concisa (máx 2-3 oraciones), profesional y cercana. Solo respondes sobre el coro: ingreso, ensayos (sábados), nivel musical, repertorio litúrgico contemporáneo, cuerdas SATB. Para contacto dirígelos al formulario del sitio.`;

const DEFAULT_CONTENT = {
  hero_titulo: "Misioneros",
  hero_titulo2: "de Jesús",
  hero_kicker: "Coro · Maipú · Chile",
  hero_sub: "Ensemble vocal de música litúrgica contemporánea. Quince años de presencia y excelencia musical en Maipú.",
  hero_img: `${BUCKET}/Misioneros.jpg`,
  about_titulo: "Un ensemble con identidad propia",
  about_texto1: "Somos un coro de música litúrgica con más de 15 años en actividad. Cuatro cuerdas vocales —soprano, contralto, tenor y bajo— acompañadas de instrumentos en vivo, construyendo un sonido propio semana a semana.",
  about_texto2: "Nuestra disciplina musical y compromiso con el repertorio nos definen como un conjunto vocal de alto nivel dentro de la tradición litúrgica contemporánea.",
  about_img: `${BUCKET}/Misioneros.jpg`,
  stat1_n: "15+", stat1_l: "Años activos",
  stat2_n: "30+", stat2_l: "Voces",
  stat3_n: "400+", stat3_l: "Presentaciones",
  gal1_label: "Navidad 2023", gal1_sub: "Diciembre", gal1_img: "",
  gal2_label: "Semana Santa 2024", gal2_sub: "Abril", gal2_img: "",
  gal3_label: "Fiesta Patronal", gal3_sub: "Agosto", gal3_img: "",
  gal4_label: "Corpus Christi", gal4_sub: "Junio", gal4_img: "",
  gal5_label: "Vigilia Pascual", gal5_sub: "Marzo", gal5_img: "",
  contacto_dir: "Maipú, Santiago, Chile · Capilla Sagrada Familia",
  contacto_ensayo: "Sábados · Capilla Misioneros de Jesús",
  whatsapp: "56912345678",
  footer_texto: "Ensemble vocal de música litúrgica. Maipú, Santiago de Chile.",
};

async function dbGet() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/landing_content?select=key,value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await r.json();
    if (!Array.isArray(rows)) return DEFAULT_CONTENT;
    const obj = { ...DEFAULT_CONTENT };
    rows.forEach(({ key, value }) => { obj[key] = value; });
    return obj;
  } catch { return DEFAULT_CONTENT; }
}

async function dbSet(key, value) {
  await fetch(`${SUPABASE_URL}/rest/v1/landing_content`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({ key, value })
  });
}

async function uploadImg(file, name) {
  const ext = file.name.split(".").pop();
  const path = `${name}.${ext}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/publico/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file
  });
  if (!r.ok) throw new Error("Upload failed");
  return `${BUCKET}/${path}?t=${Date.now()}`;
}

export default function Landing({ onPortal }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [chatMsgs, setChatMsgs] = useState([{ role: "bot", text: "Hola, soy el asistente del Coro Misioneros de Jesús. ¿En qué te puedo orientar?" }]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hist, setHist] = useState([]);
  const [formOk, setFormOk] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const msgsRef = useRef(null);
  const ADMIN_PASS = "coromj2026";

  useEffect(() => { dbGet().then(setContent); }, []);
  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [chatMsgs, typing]);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  async function sendMsg(text) {
    const t = (text || chatInput).trim(); if (!t) return;
    setChatInput("");
    const newHist = [...hist, { role: "user", content: t }];
    setChatMsgs(prev => [...prev, { role: "user", text: t }]);
    setHist(newHist); setTyping(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYS, messages: newHist })
      });
      const data = await r.json();
      const reply = data.content?.[0]?.text || "Intenta nuevamente.";
      setTyping(false);
      setChatMsgs(prev => [...prev, { role: "bot", text: reply }]);
      setHist(prev => [...prev, { role: "assistant", content: reply }]);
    } catch { setTyping(false); setChatMsgs(prev => [...prev, { role: "bot", text: "Error de conexión." }]); }
  }

  async function saveField(key) {
    setSaving(s => ({ ...s, [key]: true }));
    await dbSet(key, editing[key] ?? content[key]);
    setContent(c => ({ ...c, [key]: editing[key] ?? c[key] }));
    setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    setSaving(s => ({ ...s, [key]: false }));
  }

  async function handleImgUpload(key, file, storageName) {
    setUploadingKey(key);
    try {
      const url = await uploadImg(file, storageName);
      await dbSet(key, url);
      setContent(c => ({ ...c, [key]: url }));
    } catch (e) { alert("Error subiendo imagen: " + e.message); }
    setUploadingKey(null);
  }

  const F = ({ label, k, textarea }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {textarea
        ? <textarea value={editing[k] ?? content[k]} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))}
            style={{ width: "100%", border: "1px solid #dde4f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 80, outline: "none" }} />
        : <input value={editing[k] ?? content[k]} onChange={e => setEditing(p => ({ ...p, [k]: e.target.value }))}
            style={{ width: "100%", border: "1px solid #dde4f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
      }
      <button onClick={() => saveField(k)} disabled={saving[k]}
        style={{ marginTop: 6, background: "#08122d", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving[k] ? 0.6 : 1 }}>
        {saving[k] ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );

  const ImgF = ({ label, k, storageName }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {content[k] && <img src={content[k]} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
      <label style={{ display: "inline-block", background: "#f0f4ff", border: "1px solid #d0d8f0", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#08122d" }}>
        {uploadingKey === k ? "Subiendo..." : "📁 Subir imagen"}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleImgUpload(k, e.target.files[0], storageName)} />
      </label>
    </div>
  );

  const AdminPanel = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && setShowAdmin(false)}>
      <div style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "#08122d", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>⚙️ Editor de contenido</div>
          <button onClick={() => setShowAdmin(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {!adminAuth ? (
          <div style={{ padding: 36, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#08122d" }}>Acceso al editor</div>
            <input
              type="password"
              placeholder="Contraseña"
              defaultValue=""
              id="admin-pass-input"
              onKeyDown={e => { if (e.key === "Enter") { const v = document.getElementById("admin-pass-input").value; v === ADMIN_PASS ? setAdminAuth(true) : alert("Contraseña incorrecta"); } }}
              style={{ border: "1px solid #dde4f0", borderRadius: 10, padding: "12px 16px", fontSize: 15, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={() => { const v = document.getElementById("admin-pass-input").value; v === ADMIN_PASS ? setAdminAuth(true) : alert("Contraseña incorrecta"); }}
              style={{ background: "#08122d", color: "#fff", border: "none", borderRadius: 10, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Entrar</button>
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: "28px 28px 40px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#08122d", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Hero</div>
            <ImgF label="Imagen de fondo (hero)" k="hero_img" storageName="landing_hero" />
            <F label="Título línea 1" k="hero_titulo" />
            <F label="Título línea 2 (italic)" k="hero_titulo2" />
            <F label="Subtexto hero" k="hero_sub" textarea />

            <div style={{ fontWeight: 700, fontSize: 13, color: "#08122d", margin: "24px 0 16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>👥 Nosotros</div>
            <ImgF label="Imagen nosotros (fondo difuminado)" k="about_img" storageName="landing_about" />
            <F label="Título" k="about_titulo" />
            <F label="Párrafo 1" k="about_texto1" textarea />
            <F label="Párrafo 2" k="about_texto2" textarea />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[[1],[2],[3]].map(([n]) => <div key={n}><F label={`Stat ${n} número`} k={`stat${n}_n`} /><F label={`Stat ${n} label`} k={`stat${n}_l`} /></div>)}
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, color: "#08122d", margin: "24px 0 16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🖼️ Galería</div>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ background: "#f8f9fc", borderRadius: 12, padding: "16px 16px 8px", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#666", marginBottom: 10 }}>Foto {n}</div>
                <ImgF label="Imagen" k={`gal${n}_img`} storageName={`landing_gal${n}`} />
                <F label="Título" k={`gal${n}_label`} />
                <F label="Subtítulo" k={`gal${n}_sub`} />
              </div>
            ))}

            <div style={{ fontWeight: 700, fontSize: 13, color: "#08122d", margin: "24px 0 16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>📍 Contacto</div>
            <F label="WhatsApp (solo números, ej: 56912345678)" k="whatsapp" />
            <F label="Dirección" k="contacto_dir" />
            <F label="Ensayos" k="contacto_ensayo" />
            <F label="Texto footer" k="footer_texto" textarea />
          </div>
        )}
      </div>
    </div>
  );

  const galItems = [1,2,3,4,5].map(n => ({ label: content[`gal${n}_label`], sub: content[`gal${n}_sub`], img: content[`gal${n}_img`] }));
  const galColors = ["linear-gradient(155deg,#0a1628,#1a3460)","linear-gradient(155deg,#0d1f3e,#0d2d55)","linear-gradient(155deg,#081228,#1a2d50)","linear-gradient(155deg,#0f1e38,#162a4a)","linear-gradient(155deg,#0a1828,#0d2540)"];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif", background: "#fff", color: "#0a0a14", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      {showAdmin && <AdminPanel />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .l-nav { position:fixed;top:0;left:0;right:0;z-index:999;height:80px;background:rgba(8,18,45,0.92);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;padding:0 48px; }
        .l-nav-logo { display:flex;align-items:center;gap:14px;text-decoration:none;cursor:pointer; }
        .l-nav-logo-icon { width:54px;height:54px;border-radius:12px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
        .l-nav-logo-icon img { width:54px;height:54px;object-fit:cover;border-radius:12px; }
        .l-nav-logo-text { display:flex;flex-direction:column;line-height:1; }
        .l-nav-logo-coro { font-family:'DM Sans',sans-serif;font-size:20px;font-weight:900;color:#fff;letter-spacing:0.06em;text-transform:uppercase; }
        .l-nav-logo-sub { font-family:'Fraunces',serif;font-style:italic;font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:0.02em; }
        .l-nav-center { position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:36px; }
        .l-nav-links a { font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;color:rgba(255,255,255,0.65);text-decoration:none;cursor:pointer;transition:color .2s; }
        .l-nav-links a:hover { color:#fff; }
        .l-nav-right { display:flex;align-items:center;gap:12px; }
        .l-nav-soc { width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.07);border:0.5px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s; }
        .l-nav-soc:hover { background:rgba(255,255,255,0.18); }
        .l-nav-cta { background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.2);color:#fff;border-radius:980px;padding:8px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s; }
        .l-nav-cta:hover { background:rgba(255,255,255,0.2); }
        .l-hero { height:100vh;position:relative;overflow:hidden;display:flex;align-items:flex-end; }
        .l-hero-bg { position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;background-repeat:no-repeat; }
        .l-hero-ov { position:absolute;inset:0;z-index:1;background:linear-gradient(to bottom,rgba(8,18,45,0.35) 0%,rgba(8,18,45,0.15) 30%,rgba(8,18,45,0.55) 65%,rgba(8,18,45,0.96) 100%); }
        .l-hero-c { position:relative;z-index:2;padding:0 52px 68px;width:100%;display:flex;justify-content:space-between;align-items:flex-end; }
        .l-kicker { font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:14px;display:block; }
        .l-h1 { font-family:'DM Sans',sans-serif;font-size:clamp(64px,9vw,120px);font-weight:800;line-height:0.9;color:#fff;letter-spacing:-0.03em; }
        .l-h1 .ital { font-family:'Fraunces',serif;font-style:italic;font-weight:400;font-size:clamp(60px,8.5vw,112px);color:#fff;display:block;line-height:0.95; }
        .l-hero-right { display:flex;flex-direction:column;align-items:flex-end;gap:18px; }
        .l-hero-sub { font-family:'DM Sans',sans-serif;font-size:15px;font-weight:300;color:rgba(255,255,255,0.6);line-height:1.7;max-width:280px;text-align:right; }
        .l-btns { display:flex;gap:10px; }
        .l-btn-w { background:#fff;color:#08122d;border:none;border-radius:980px;padding:13px 26px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s; }
        .l-btn-w:hover { background:#e8f0fc;transform:translateY(-1px); }
        .l-btn-o { background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.35);border-radius:980px;padding:13px 26px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s; }
        .l-btn-o:hover { border-color:#fff; }
        .l-ticker { background:#08122d;padding:13px 0;overflow:hidden;white-space:nowrap;border-bottom:0.5px solid rgba(255,255,255,0.05); }
        .l-ticker-i { display:inline-flex;animation:tick 30s linear infinite; }
        @keyframes tick { from{transform:translateX(0)}to{transform:translateX(-50%)} }
        .l-titem { display:inline-flex;align-items:center;gap:10px;padding:0 32px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.3); }
        .l-tdot { width:3px;height:3px;border-radius:50%;background:#6aaef5;flex-shrink:0; }
        .l-sec { padding:100px 52px;background:#fff; }
        .l-sec-alt { padding:100px 52px;background:#f6f8fc; }
        .l-in { max-width:1160px;margin:0 auto; }
        .l-ey { font-family:'DM Sans',sans-serif;font-size:10.5px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#08122d;opacity:0.35;margin-bottom:16px; }
        .l-h2 { font-family:'DM Sans',sans-serif;font-size:clamp(36px,4.5vw,60px);font-weight:800;line-height:1.05;letter-spacing:-0.025em;color:#0a0a14;margin-bottom:22px; }
        .l-h2 em { font-family:'Fraunces',serif;font-style:italic;font-weight:400;color:#0a0a14; }
        .l-body { font-family:'DM Sans',sans-serif;font-size:15px;font-weight:300;line-height:1.85;color:#555; }
        .l-about-grid { display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:center; }
        .l-about-img { aspect-ratio:3/4;border-radius:18px;overflow:hidden;position:relative;background:#eef2fb;border:0.5px solid #e8edf5; }
        .l-about-img-bg { position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.18; }
        .l-about-img-badge { position:absolute;bottom:0;left:0;right:0;padding:24px 28px;background:linear-gradient(to top,rgba(8,18,45,0.88),transparent); }
        .l-about-badge-l { font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4); }
        .l-about-badge-v { font-family:'DM Sans',sans-serif;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em; }
        .l-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e4eaf5;border-radius:14px;overflow:hidden;margin-top:44px; }
        .l-stat { background:#fff;padding:26px 22px; }
        .l-stat-n { font-family:'DM Sans',sans-serif;font-size:44px;font-weight:800;color:#0a0a14;line-height:1;letter-spacing:-0.03em; }
        .l-stat-n sup { font-size:20px;vertical-align:super;opacity:0.4; }
        .l-stat-l { font-family:'DM Sans',sans-serif;font-size:11.5px;color:#aaa;margin-top:5px;letter-spacing:0.02em; }
        .l-gal-top { display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:44px; }
        .l-gal { display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:340px 220px;gap:10px; }
        .l-gi { border-radius:12px;overflow:hidden;position:relative;cursor:pointer; }
        .l-gi:nth-child(1){grid-column:span 7} .l-gi:nth-child(2){grid-column:span 5}
        .l-gi:nth-child(3){grid-column:span 4} .l-gi:nth-child(4){grid-column:span 4} .l-gi:nth-child(5){grid-column:span 4}
        .l-gi-fill { position:absolute;inset:0;background-size:cover;background-position:center; }
        .l-gi-ov { position:absolute;inset:0;background:linear-gradient(to top,rgba(8,18,40,0.85) 0%,transparent 55%); }
        .l-gi-cap { position:absolute;bottom:0;left:0;right:0;padding:20px 22px; }
        .l-gi-cap-t { font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:#fff; }
        .l-gi-cap-s { font-family:'DM Sans',sans-serif;font-size:10px;color:rgba(255,255,255,0.45);margin-top:3px;letter-spacing:0.08em;text-transform:uppercase; }
        .l-gi-hov { position:absolute;inset:0;z-index:3;background:rgba(8,18,40,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .22s; }
        .l-gi:hover .l-gi-hov { opacity:1; }
        .l-gi-hov-btn { font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:980px;padding:8px 20px; }
        .l-bot-grid { display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start; }
        .l-bfeat { padding:20px 0;border-bottom:0.5px solid #e4eaf5;display:flex;gap:18px;align-items:flex-start; }
        .l-bfeat:first-child{border-top:0.5px solid #e4eaf5}
        .l-bfeat-num { font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#08122d;opacity:0.2;flex-shrink:0;padding-top:2px; }
        .l-bfeat-t { font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:#0a0a14;margin-bottom:3px; }
        .l-bfeat-d { font-family:'DM Sans',sans-serif;font-size:13.5px;color:#888;line-height:1.6;font-weight:300; }
        .l-chat { background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 40px rgba(8,18,45,0.09);border:0.5px solid #e4eaf5; }
        .l-chat-hd { background:#08122d;padding:16px 20px;display:flex;align-items:center;gap:12px; }
        .l-chat-av { width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0; }
        .l-chat-n { font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#fff; }
        .l-chat-s { font-family:'DM Sans',sans-serif;font-size:10.5px;color:rgba(255,255,255,0.4); }
        .l-chat-dot { width:7px;height:7px;border-radius:50%;background:#34d399;margin-left:auto; }
        .l-chat-msgs { padding:14px;min-height:240px;max-height:280px;overflow-y:auto;background:#f6f8fc;display:flex;flex-direction:column;gap:10px; }
        .l-cm { display:flex;gap:8px; } .l-cm-u{flex-direction:row-reverse}
        .l-cm-av { width:26px;height:26px;border-radius:50%;background:#e4eaf5;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px; }
        .l-cm-b { max-width:82%;padding:9px 13px;border-radius:13px;font-family:'DM Sans',sans-serif;font-size:13.5px;line-height:1.5; }
        .l-cm-bot { background:#fff;color:#0a0a14;border-radius:4px 13px 13px 13px;box-shadow:0 1px 3px rgba(0,0,0,0.06); }
        .l-cm-usr { background:#08122d;color:#fff;border-radius:13px 4px 13px 13px; }
        .l-tdots { display:flex;gap:4px;padding:9px 13px; }
        .l-tdots span { width:6px;height:6px;border-radius:50%;background:#ccc;animation:td 1.2s infinite; }
        .l-tdots span:nth-child(2){animation-delay:.2s} .l-tdots span:nth-child(3){animation-delay:.4s}
        @keyframes td{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
        .l-chat-pills { display:flex;gap:6px;padding:9px 14px 8px;background:#f6f8fc;flex-wrap:wrap;border-top:0.5px solid #eaeff8; }
        .l-cpill { border:0.5px solid #cdd6ea;border-radius:980px;padding:4px 12px;font-size:12px;color:#08122d;cursor:pointer;background:#fff;font-family:'DM Sans',sans-serif;transition:all .15s; }
        .l-cpill:hover { background:#08122d;color:#fff;border-color:#08122d; }
        .l-chat-ft { display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:0.5px solid #eaeff8; }
        .l-cin { flex:1;border:0.5px solid #dde4f0;border-radius:980px;padding:8px 15px;font-size:13.5px;font-family:'DM Sans',sans-serif;color:#0a0a14;outline:none;background:#f6f8fc;transition:border-color .2s; }
        .l-cin:focus { border-color:#08122d;background:#fff; }
        .l-csnd { width:34px;height:34px;border-radius:50%;background:#08122d;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .l-csnd:hover { background:#0d1f45; }
        .l-ct-grid { display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start; }
        .l-ct-item { display:flex;gap:16px;align-items:flex-start;padding:20px 0;border-bottom:0.5px solid #e4eaf5; }
        .l-ct-item:first-of-type { border-top:0.5px solid #e4eaf5; }
        .l-ct-ico { width:40px;height:40px;border-radius:10px;background:#eef2fb;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0; }
        .l-ct-t { font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#0a0a14;margin-bottom:3px; }
        .l-ct-s { font-family:'DM Sans',sans-serif;font-size:13.5px;color:#888;font-weight:300;line-height:1.6; }
        .l-soc-row { display:flex;gap:8px;margin-top:28px; }
        .l-soc { width:38px;height:38px;border-radius:10px;border:0.5px solid #e0e6f0;background:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:all .2s; }
        .l-soc:hover { background:#08122d;border-color:#08122d; }
        .l-cform { background:#f6f8fc;border-radius:18px;padding:40px;border:0.5px solid #e4eaf5; }
        .l-cform h3 { font-family:'DM Sans',sans-serif;font-size:26px;font-weight:800;color:#0a0a14;margin-bottom:28px;letter-spacing:-0.02em;line-height:1.2; }
        .l-fg { margin-bottom:14px; }
        .l-fg label { display:block;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;color:#aaa;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px; }
        .l-fg input,.l-fg textarea,.l-fg select { width:100%;border:0.5px solid #dde4f0;border-radius:10px;padding:11px 14px;font-size:14px;font-family:'DM Sans',sans-serif;background:#fff;color:#0a0a14;outline:none;transition:border-color .2s;-webkit-appearance:none; }
        .l-fg input:focus,.l-fg textarea:focus,.l-fg select:focus { border-color:#08122d; }
        .l-fg input::placeholder,.l-fg textarea::placeholder { color:#c0c8d8; }
        .l-fg textarea { resize:vertical;min-height:90px; }
        .l-frow { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .l-fsub { width:100%;background:#08122d;color:#fff;border:none;border-radius:980px;padding:13px;font-size:13px;font-weight:600;letter-spacing:0.03em;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px;transition:background .2s; }
        .l-fsub:hover { background:#0d1f45; }
        .l-footer { background:#08122d;padding:64px 52px 32px; }
        .l-foot-top { display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:44px;border-bottom:0.5px solid rgba(255,255,255,0.06);max-width:1160px;margin:0 auto; }
        .l-foot-brand-n { font-family:'DM Sans',sans-serif;font-size:16px;font-weight:800;color:#fff;margin-bottom:8px;letter-spacing:-0.01em; }
        .l-foot-brand-p { font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.3);font-weight:300;line-height:1.7;max-width:220px; }
        .l-foot-cols { display:flex;gap:56px; }
        .l-foot-col h4 { font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase;margin-bottom:16px; }
        .l-foot-col a { display:block;font-family:'DM Sans',sans-serif;font-size:13.5px;color:rgba(255,255,255,0.45);text-decoration:none;margin-bottom:10px;font-weight:300;cursor:pointer;transition:color .2s; }
        .l-foot-col a:hover { color:#fff; }
        .l-foot-btm { display:flex;justify-content:space-between;align-items:center;padding-top:24px;max-width:1160px;margin:0 auto; }
        .l-foot-copy { font-family:'DM Sans',sans-serif;font-size:11.5px;color:rgba(255,255,255,0.18); }
        .l-foot-adm { font-size:11px;color:rgba(255,255,255,0.06);cursor:pointer;padding:4px 8px;user-select:none;letter-spacing:0.2em;transition:color .4s; }
        .l-foot-adm:hover { color:rgba(255,255,255,0.3); }
        @media(max-width:900px){
          .l-nav{padding:0 20px} .l-nav-links{display:none}
          .l-hero-c{padding:0 24px 52px;flex-direction:column;align-items:flex-start;gap:24px}
          .l-hero-right{align-items:flex-start} .l-hero-sub{text-align:left}
          .l-sec,.l-sec-alt{padding:72px 24px}
          .l-about-grid,.l-bot-grid,.l-ct-grid{grid-template-columns:1fr;gap:48px}
          .l-gal{grid-template-columns:1fr 1fr;grid-template-rows:auto}
          .l-gi{aspect-ratio:4/3}.l-gi:nth-child(1),.l-gi:nth-child(2),.l-gi:nth-child(3),.l-gi:nth-child(4),.l-gi:nth-child(5){grid-column:span 1}
          .l-stats{grid-template-columns:1fr 1fr}
          .l-frow{grid-template-columns:1fr}.l-cform{padding:24px 20px}
          .l-footer{padding:48px 24px 28px}.l-foot-top{flex-direction:column;gap:36px}.l-foot-cols{gap:28px}
          .l-gal-top{flex-direction:column;gap:14px;align-items:flex-start}
        }
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        .fab-wrap { position:fixed;bottom:38%;left:28px;z-index:9000;display:flex;flex-direction:column;gap:12px;align-items:flex-start; }
        .fab { width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:transform .2s,box-shadow .2s;position:relative;text-decoration:none; }
        .fab:hover { transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.25); }
        .fab-wa { background:#25D366; }
        .fab-admin { background:#08122d; }
        .fab-label { position:absolute;left:60px;background:rgba(10,10,20,0.82);color:#fff;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:500;padding:5px 12px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none;backdrop-filter:blur(8px); }
        .fab:hover .fab-label { opacity:1; }
      `}</style>

      {/* NAV */}
      <nav className="l-nav">
        <div className="l-nav-logo" onClick={() => scrollTo("inicio")}>
          <div className="l-nav-logo-icon">
            <img src="/LOGOMJ2.png" alt="Coro MJ" onError={e => { e.target.style.display="none"; }}/>
          </div>
          <div className="l-nav-logo-text">
            <span className="l-nav-logo-coro">Coro</span>
            <span className="l-nav-logo-sub">Misioneros de Jesús</span>
          </div>
        </div>
        <div className="l-nav-center l-nav-links">
          <a onClick={() => scrollTo("nosotros")}>Nosotros</a>
          <a onClick={() => scrollTo("galeria")}>Galería</a>
          <a onClick={() => scrollTo("bot")}>Únete</a>
          <a onClick={() => scrollTo("contacto")}>Contacto</a>
        </div>
        <div className="l-nav-right">
          <div className="l-nav-soc" title="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.7)" stroke="none"/></svg>
          </div>
          <div className="l-nav-soc" title="TikTok">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>
          </div>
          <div className="l-nav-soc" title="YouTube">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
          </div>
          <button className="l-nav-cta" onClick={onPortal}>Acceso Portal</button>
        </div>
      </nav>

      {/* HERO */}
      <section id="inicio" className="l-hero">
        <div className="l-hero-bg" style={{ backgroundImage: `url('${content.hero_img}')` }} />
        <div className="l-hero-ov" />
        <div className="l-hero-c">
          <div>
            <span className="l-kicker">{content.hero_kicker}</span>
            <h1 className="l-h1">
              {content.hero_titulo}<br/>
              <span className="ital">{content.hero_titulo2}</span>
            </h1>
          </div>
          <div className="l-hero-right">
            <p className="l-hero-sub">{content.hero_sub}</p>
            <div className="l-btns">
              <button className="l-btn-w" onClick={() => scrollTo("nosotros")}>Conócenos</button>
              <button className="l-btn-o" onClick={() => scrollTo("bot")}>Únete</button>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="l-ticker">
        <div className="l-ticker-i">
          {["Música litúrgica contemporánea","Maipú · Chile","15 años de trayectoria","4 cuerdas vocales","400+ presentaciones","Ensemble vocal profesional",
            "Música litúrgica contemporánea","Maipú · Chile","15 años de trayectoria","4 cuerdas vocales","400+ presentaciones","Ensemble vocal profesional"
          ].map((t,i) => <span key={i} className="l-titem"><span className="l-tdot"/>{t}</span>)}
        </div>
      </div>

      {/* NOSOTROS */}
      <section className="l-sec" id="nosotros">
        <div className="l-in">
          <div className="l-about-grid">
            <div>
              <div className="l-ey">Quiénes somos</div>
              <h2 className="l-h2">{content.about_titulo.includes("identidad") ? <>Un ensemble con <em>identidad propia</em></> : content.about_titulo}</h2>
              <p className="l-body">{content.about_texto1}</p>
              <p className="l-body" style={{marginTop:14}}>{content.about_texto2}</p>
              <div className="l-stats">
                <div className="l-stat"><div className="l-stat-n">{content.stat1_n}</div><div className="l-stat-l">{content.stat1_l}</div></div>
                <div className="l-stat"><div className="l-stat-n">{content.stat2_n}</div><div className="l-stat-l">{content.stat2_l}</div></div>
                <div className="l-stat"><div className="l-stat-n">{content.stat3_n}</div><div className="l-stat-l">{content.stat3_l}</div></div>
              </div>
            </div>
            <div className="l-about-img">
              <div className="l-about-img-bg" style={{ backgroundImage: `url('${content.about_img}')` }} />
              <div className="l-about-img-badge">
                <div className="l-about-badge-l">Cuerdas vocales</div>
                <div className="l-about-badge-v">SATB</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      <section className="l-sec-alt" id="galeria">
        <div className="l-in">
          <div className="l-gal-top">
            <div>
              <div className="l-ey">Galería</div>
              <h2 className="l-h2" style={{marginBottom:0}}>Presencia en cada<br/><em>celebración</em></h2>
            </div>
            <p className="l-body" style={{maxWidth:240,textAlign:"right"}}>Momentos que capturan nuestra entrega a la música litúrgica.</p>
          </div>
          <div className="l-gal">
            {galItems.map((g,i) => (
              <div key={i} className="l-gi">
                <div className="l-gi-fill" style={{ backgroundImage: g.img ? `url('${g.img}')` : "none", background: g.img ? undefined : galColors[i] }} />
                <div className="l-gi-ov" />
                <div className="l-gi-cap"><div className="l-gi-cap-t">{g.label}</div><div className="l-gi-cap-s">{g.sub}</div></div>
                <div className="l-gi-hov"><div className="l-gi-hov-btn">Ver foto</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOT */}
      <section className="l-sec" id="bot">
        <div className="l-in">
          <div className="l-bot-grid">
            <div>
              <div className="l-ey">Asistente IA</div>
              <h2 className="l-h2">¿Te sumas<br/>al <em>coro?</em></h2>
              <p className="l-body">Respuestas inmediatas sobre cómo integrarte, ensayos y todo lo que necesitas saber.</p>
              <div style={{marginTop:44}}>
                {[["01","Proceso de ingreso","Cómo postular, qué se evalúa y cuándo son los ensayos de prueba."],
                  ["02","Horarios y ensayos","Frecuencia semanal, lugar y cómo es el proceso de incorporación."],
                  ["03","Repertorio y nivel","Qué cantamos y qué experiencia musical se valora."]
                ].map(([n,t,d]) => (
                  <div key={n} className="l-bfeat">
                    <div className="l-bfeat-num">{n}</div>
                    <div><div className="l-bfeat-t">{t}</div><div className="l-bfeat-d">{d}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="l-chat">
                <div className="l-chat-hd">
                  <div className="l-chat-av">🎵</div>
                  <div><div className="l-chat-n">Coro MJ — Asistente</div><div className="l-chat-s">Responde en español · IA</div></div>
                  <div className="l-chat-dot"/>
                </div>
                <div className="l-chat-msgs" ref={msgsRef}>
                  {chatMsgs.map((m,i) => (
                    <div key={i} className={`l-cm${m.role==="user"?" l-cm-u":""}`}>
                      {m.role==="bot" && <div className="l-cm-av">🎵</div>}
                      <div className={`l-cm-b ${m.role==="bot"?"l-cm-bot":"l-cm-usr"}`}>{m.text}</div>
                      {m.role==="user" && <div className="l-cm-av">👤</div>}
                    </div>
                  ))}
                  {typing && <div className="l-cm"><div className="l-cm-av">🎵</div><div className="l-cm-b l-cm-bot"><div className="l-tdots"><span/><span/><span/></div></div></div>}
                </div>
                <div className="l-chat-pills">
                  {["¿Cómo me uno?","¿Cuándo ensayan?","¿Qué nivel necesito?"].map(p => (
                    <button key={p} className="l-cpill" onClick={() => sendMsg(p)}>{p}</button>
                  ))}
                </div>
                <div className="l-chat-ft">
                  <input className="l-cin" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Escribe tu pregunta..."/>
                  <button className="l-csnd" onClick={()=>sendMsg()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="l-sec-alt" id="contacto">
        <div className="l-in">
          <div className="l-ct-grid">
            <div>
              <div className="l-ey">Contacto</div>
              <h2 className="l-h2">Hablemos<br/><em>directamente</em></h2>
              <p className="l-body">¿Quieres invitarnos o tienes alguna consulta?</p>
              <div style={{marginTop:36}}>
                <div className="l-ct-item"><div className="l-ct-ico">📍</div><div><div className="l-ct-t">Ubicación</div><div className="l-ct-s">{content.contacto_dir}</div></div></div>
                <div className="l-ct-item"><div className="l-ct-ico">🎵</div><div><div className="l-ct-t">Ensayos</div><div className="l-ct-s">{content.contacto_ensayo}</div></div></div>
                <div className="l-ct-item"><div className="l-ct-ico">📲</div><div><div className="l-ct-t">Redes sociales</div><div className="l-ct-s">Síguenos en nuestras plataformas</div></div></div>
              </div>
              <div className="l-soc-row"><div className="l-soc">📸</div><div className="l-soc">📘</div><div className="l-soc">▶️</div><div className="l-soc">🎧</div></div>
            </div>
            <div className="l-cform">
              <h3>Envíanos<br/>un mensaje</h3>
              <div className="l-frow">
                <div className="l-fg"><label>Nombre</label><input type="text" placeholder="Juan"/></div>
                <div className="l-fg"><label>Apellido</label><input type="text" placeholder="González"/></div>
              </div>
              <div className="l-fg"><label>Correo</label><input type="email" placeholder="tu@correo.cl"/></div>
              <div className="l-fg"><label>Asunto</label><select><option>Quiero unirme al coro</option><option>Invitación a celebración</option><option>Consulta general</option><option>Otro</option></select></div>
              <div className="l-fg"><label>Mensaje</label><textarea placeholder="Cuéntanos..."/></div>
              <button className="l-fsub" onClick={()=>{setFormOk(true);setTimeout(()=>setFormOk(false),3000)}}>{formOk?"✓ Enviado":"Enviar"}</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="l-footer">
        <div className="l-foot-top">
          <div>
            <div className="l-foot-brand-n">Coro Misioneros de Jesús</div>
            <p className="l-foot-brand-p">{content.footer_texto}</p>
          </div>
          <div className="l-foot-cols">
            <div className="l-foot-col">
              <h4>Sitio</h4>
              <a onClick={()=>scrollTo("nosotros")}>Nosotros</a>
              <a onClick={()=>scrollTo("galeria")}>Galería</a>
              <a onClick={()=>scrollTo("bot")}>Únete</a>
              <a onClick={()=>scrollTo("contacto")}>Contacto</a>
            </div>
            <div className="l-foot-col">
              <h4>Redes</h4>
              <a>Instagram</a><a>Facebook</a><a>YouTube</a><a>Spotify</a>
            </div>
          </div>
        </div>
        <div className="l-foot-btm">
          <span className="l-foot-copy">© 2026 Coro Misioneros de Jesús · Desarrollado por TEMPVS7®</span>
          <span className="l-foot-adm" onClick={()=>setShowAdmin(true)}>· · ·</span>
        </div>
      </footer>
      {/* BOTONES FLOTANTES */}
      <div className="fab-wrap">
        <button className="fab fab-admin" onClick={() => setShowAdmin(true)} title="Admin">
          <span className="fab-label">Editar sitio</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <a className="fab fab-wa" href={`https://wa.me/${content.whatsapp}?text=Hola,%20me%20interesa%20saber%20m%C3%A1s%20sobre%20el%20Coro%20Misioneros%20de%20Jes%C3%BAs`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
          <span className="fab-label">WhatsApp</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
