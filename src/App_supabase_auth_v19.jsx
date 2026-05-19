import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════
//  SUPABASE CONFIG
// ══════════════════════════════════════════
const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";

// Código secreto para registrarse como Admin
const SECRET_ADMIN_CODE = "CoroCJM2026!";

// ── Google Calendar API (pública, solo lectura) ───────────────────────
const GCAL_CALENDAR_ID = "coromisionerosdjesuscl@gmail.com";
const GCAL_API_KEY = "AIzaSyAFSJguKkIY1shCYA1HIFwv9OtaYGnu45k";

async function fetchGoogleCalendarEvents() {
  try {
    const now = new Date().toISOString();
    const calId = encodeURIComponent(GCAL_CALENDAR_ID);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?key=${GCAL_API_KEY}&timeMin=${now}&maxResults=20&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, { signal: (()=>{ const c=new AbortController(); setTimeout(()=>c.abort(),8000); return c.signal; })() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => {
      const start = item.start?.dateTime || item.start?.date || "";
      const isDateTime = !!item.start?.dateTime;
      const fecha = start.split("T")[0];
      const hora = isDateTime
        ? new Date(item.start.dateTime).toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit", hour12:false })
        : "";
      const titulo = item.summary || "Sin título";
      const tl = titulo.toLowerCase();
      const tipo = tl.includes("ensayo") ? "ensayo"
        : (tl.includes("misa") || tl.includes("vigilia") || tl.includes("corpus") || tl.includes("pentecost") || tl.includes("pascua")) ? "misa"
        : "evento";
      return { id: item.id, titulo, fecha, hora, tipo, lugar: item.location || "", descripcion: item.description || "" };
    });
  } catch (e) {
    console.warn("Error cargando Google Calendar:", e);
    return [];
  }
}

// Token de sesión activo (se actualiza al hacer login)
let _authToken = null;
let _refreshToken = null;

async function refreshSession() {
  if (!_refreshToken) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    _authToken = data.access_token;
    _refreshToken = data.refresh_token;
    // Persistir en localStorage para sobrevivir recargas
    localStorage.setItem("sb_access_token", data.access_token);
    localStorage.setItem("sb_refresh_token", data.refresh_token);
    return true;
  } catch { return false; }
}

// Intentar restaurar sesión desde localStorage al cargar
(function restoreSession() {
  const at = localStorage.getItem("sb_access_token");
  const rt = localStorage.getItem("sb_refresh_token");
  if (at) _authToken = at;
  if (rt) _refreshToken = rt;
})();

async function supabase(table, options = {}) {
  const { method = "GET", body, select = "*", filters = "", order = "" } = options;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters}${order}`;
  const makeHeaders = () => ({
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${_authToken || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "",
  });
  let res = await fetch(url, { method, headers: makeHeaders(), body: body ? JSON.stringify(body) : undefined });
  // Si JWT expiró, intentar renovar y reintentar una vez
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await fetch(url, { method, headers: makeHeaders(), body: body ? JSON.stringify(body) : undefined });
    }
  }
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

// Renovar token automáticamente cada 50 minutos (expira en 1 hora)
setInterval(() => { if (_refreshToken) refreshSession(); }, 50 * 60 * 1000);
async function authSignUp(email, password, nombre, cuerda, cumpleanos) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { nombre, cuerda } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.message || "Error al registrar");
  if (!data.access_token) throw new Error("Cuenta creada. Revisa tu correo para confirmarla antes de ingresar.");
  _authToken = data.access_token;
  _refreshToken = data.refresh_token;
  localStorage.setItem("sb_access_token", data.access_token);
  localStorage.setItem("sb_refresh_token", data.refresh_token);
  const uid = data.user?.id;
  // cuerda ya viene calculada (Soprano/Contralto/Tenor/Bajo/Admin)
  await fetch(`${SUPABASE_URL}/rest/v1/integrantes`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${_authToken}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ nombre, email, cuerda: cuerda || "Soprano", cumpleanos: cumpleanos || "", auth_id: uid }),
  });
  return data;
}

async function authSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Credenciales incorrectas");
  _authToken = data.access_token;
  _refreshToken = data.refresh_token;
  localStorage.setItem("sb_access_token", data.access_token);
  localStorage.setItem("sb_refresh_token", data.refresh_token);
  return data;
}

async function authResetPassword(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.msg || "Error"); }
}

async function authSignOut() {
  if (!_authToken) return;
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${_authToken}` },
  });
  _authToken = null;
  _refreshToken = null;
  localStorage.removeItem("sb_access_token");
  localStorage.removeItem("sb_refresh_token");
}

// ══════════════════════════════════════════
//  LOGO — pega aquí tu base64 completo
// ══════════════════════════════════════════
const LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH BwYIDAoMCwsKCwsNCxAQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAyADIDASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAABQYDBAcCAQj/xAAsEAACAQMDAwMEAwEAAAAAAAABAgMABBEFEiExBhNBUWEicYGRBxQjMv/EABkBAAIDAQAAAAAAAAAAAAAAAAIDAAEEBf/EACERAAICAgIDAQEAAAAAAAAAAAABAhEDIRIxQQQiUf/aAAwDAQACEQMRAD8A6nooorQCijAozQAooorQAoorNADmiioLi6it0LzSJGo7s2KAJetR3F1DbIXmkWNB3ZsCuTb+INNt2KtdI7D+lPMaVuI4bW+V5GUHqp2r8Vpu1jg3Y39K0wuLi3lW4t5HicdHRip/FdD4d8RXL3C21+4lWThZGHMbeD/ANrjFqrTVNHsrxjzTQqW/wBqjdH1K50a9W5t2OPqRuwkX0Iq6naO2OzW51FYqLR7zUViimWaOOVD8rIGH5rN1zxXZ2DNFb/r3A7IGwqn1Y9q4NP1+01G2E9vKCPxKfmQ+hqn1y6hF2sqQKpkAEjIDn3FXpVT+jFljRvH8bGe2K1sJtQcR2yF2xk9gPc1C8X6xBpGkEhAJZuERWGST6enXFZfg7UoZJJLaW5VHVDsLnOW7gH0q54w0b+pWizRMFuIO3UOpOD7d66MfsJL2cZPe2zOBTjGzmvPfFPMnjP3aMNNvrWdj5QgLPIOpx0HoM1YwandafFMsUjBZkKSD1BIqBM62dqnIY7R+TXN+Ic4dBbi7kSRLhz5yVb6gOgPfPt3rRiqmZJN2WvFmqT3yXFvdTMyyqW+Vj9WPQe9aq1xf/AEbxWkMVxOkIb/kKyxxntk9TWYDJrqHhHSbWTTFvJbd5J5CcSSsCVUnoBjj61V8Ivwrv/PwNj8mkzs9FFFc5uFFFFABRRRQAV//Z";

const C = {
  primary: "#1D9E75", primaryDark: "#157a5a", primaryLight: "#e8f7f2",
  gold: "#B8922A", goldLight: "#fdf8ee",
  dark: "#111827", gray: "#6b7280", light: "#f9fafb", border: "#e5e7eb",
  white: "#ffffff", danger: "#ef4444", purple: "#8b5cf6",
};

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
  body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #f1f1f1; } ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
  input, textarea, button { font-family: 'Inter', sans-serif; }
  a { text-decoration: none; }
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .show-mobile { display: flex !important; }
    .grid-stats { grid-template-columns: 1fr !important; }
    .grid-dash-main { grid-template-columns: 1fr !important; }
    .grid-dash-sub  { grid-template-columns: 1fr !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr 1fr !important; }
    .perfil-grid { grid-template-columns: 1fr !important; }
    .section-title-row { flex-direction: column !important; align-items: flex-start !important; gap:8px !important; }
    .links-bar { flex-wrap: wrap !important; }
    .main-content { padding: 14px !important; padding-bottom: 76px !important; }
    .topbar { padding: 0 12px !important; }
    .topbar-greeting { display: none !important; }
    .bottom-nav { display: flex !important; }
  }
  @media (min-width: 769px) {
    .show-mobile { display: none !important; }
    .bottom-nav { display: none !important; }
  }
`;

const NAV = [
  { id:"dashboard", icon:"⊞", label:"Inicio" },
  { id:"perfil", icon:"◎", label:"Mi Perfil" },
  { id:"agenda", icon:"◫", label:"Agenda" },
  { id:"pauta_misa", icon:"🎼", label:"Pauta de Misa" },
  { id:"documentos", icon:"⬇", label:"Documentos" },
  { id:"oraciones", icon:"✦", label:"Oraciones" },
  { id:"noticias", icon:"◈", label:"Avisos" },
  { id:"qanda", icon:"?", label:"Preguntas" },
  { id:"integrantes", icon:"◎", label:"Integrantes" },
  { id:"biblioteca", icon:"▤", label:"Biblioteca" },
  { id:"musica", icon:"♪", label:"Música" },
  { id:"fotos", icon:"◨", label:"Galería" },
  { id:"podcast", icon:"◉", label:"Podcast" },
  { id:"videos", icon:"▷", label:"Videos" },
  { id:"cancionero", icon:"♫", label:"Cancionero" },
  { id:"admin", icon:"⚙", label:"Administración" },
];

const BOTTOM_NAV = [
  { id:"dashboard", icon:"⊞", label:"Inicio" },
  { id:"agenda", icon:"◫", label:"Agenda" },
  { id:"oraciones", icon:"✦", label:"Oraciones" },
  { id:"integrantes", icon:"◎", label:"Coro" },
  { id:"__menu__", icon:"☰", label:"Más" },
];

const CUERDAS = { Soprano:"#ec4899", Contralto:"#8b5cf6", Tenor:"#3b82f6", Bajo:"#1D9E75", Admin:"#6b7280" };
const rolLabel = r => r === "Admin" ? "Encargado de Coro" : (r || "");
const ini = n => n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
const hoyDDMM = () => { const d=new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; };
const fmtFecha = f => new Date(f+"T00:00:00").toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"});

const Chip = ({label, color}) => <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:color+"18",color}}>{label}</span>;
const Badge = ({children, color=C.primary}) => <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:color+"15",color}}>{children}</span>;
const Spinner = () => <div style={{color:C.gray,fontSize:13,padding:"20px 0",textAlign:"center"}}>⏳ Cargando...</div>;

function Card({children, style={}, hover=false, onClick}) {
  const [h,setH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>setH(false)} style={{background:C.white,borderRadius:14,border:`1px solid ${C.border}`,padding:20,boxShadow:h?"0 8px 24px rgba(0,0,0,0.10)":"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.2s",...style}}>{children}</div>;
}

function Btn({children,onClick,style={},variant="primary",disabled=false}) {
  const [h,setH]=useState(false);
  const base = variant==="primary"?{background:h&&!disabled?C.primaryDark:C.primary,color:"white",opacity:disabled?0.6:1}:variant==="ghost"?{background:h?C.light:"transparent",color:C.gray,border:`1px solid ${C.border}`}:{background:h?"#f3f4f6":C.light,color:C.dark};
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",cursor:disabled?"not-allowed":"pointer",fontSize:13,fontWeight:500,transition:"all 0.15s",...base,...style}}>{children}</button>;
}

function SectionTitle({title, subtitle, action}) {
  return (
    <div className="section-title-row" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
      <div>
        <h2 style={{fontSize:20,fontFamily:"'Poppins',sans-serif",fontWeight:600,color:C.dark,marginBottom:2}}>{title}</h2>
        {subtitle && <p style={{fontSize:13,color:C.gray}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function MobileMenu({section, setSection, onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)"}}/>
      <div style={{position:"relative",width:260,background:C.white,height:"100%",overflowY:"auto",padding:"14px 8px",display:"flex",flexDirection:"column",zIndex:301,WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 8px 14px",borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
          <img src={LOGO} alt="Logo" style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontFamily:"'Poppins',sans-serif",fontWeight:600,color:C.dark}}>Coro MJ</div>
            <div style={{fontSize:11,color:C.gray}}>Misioneros de Jesús</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.gray}}>×</button>
        </div>
        {NAV.filter(item => item.id !== "admin" || user?.cuerda === "Admin").map(item=>(
          <button key={item.id} onClick={()=>{setSection(item.id);onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:8,background:section===item.id?C.primaryLight:"transparent",border:"none",cursor:"pointer",color:section===item.id?C.primaryDark:C.gray,marginBottom:2,fontSize:14,fontWeight:section===item.id?600:400,textAlign:"left"}}>
            <span style={{fontSize:16,width:22,textAlign:"center",flexShrink:0}}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  APP PRINCIPAL
// ══════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("login"); // "login" | "register" | "recover" | "app"
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [section, setSection] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Datos desde Supabase
  const [members, setMembers] = useState([]);
  const [eventos, setEventos] = useState([]);
  // Eventos desde Google Calendar (usados en el Dashboard)
  const [gcalEventos, setGcalEventos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [oraciones, setOraciones] = useState([]);
  const [noticias, setNoticias] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [links, setLinks] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [pautas, setPautas] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  const [evangelio, setEvangelio] = useState(null);
  const [santoral, setSantoral] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [noticiasLoading, setNoticiasLoading] = useState(false);
  const [clima, setClima] = useState(null);

  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const fileRef = useRef(null);

  const hoy = hoyDDMM();
  const cumple = members.filter(m=>m.cumpleanos===hoy);

  // Cargar datos de Supabase
  async function loadData() {
    setDbLoading(true);
    try {
      const [m, ev, d, or, n, p, lk, bib, pod, pau] = await Promise.all([
        supabase("integrantes", { order:"&order=nombre.asc" }),
        supabase("eventos", { order:"&order=fecha.asc" }),
        supabase("documentos", { order:"&order=created_at.desc" }),
        supabase("oraciones", { order:"&order=created_at.desc" }),
        supabase("noticias", { order:"&order=created_at.desc" }),
        supabase("preguntas", { order:"&order=created_at.desc" }),
        supabase("links", { order:"&order=orden.asc" }).catch(()=>[]),
        supabase("biblioteca", { order:"&order=created_at.desc" }).catch(()=>[]),
        supabase("podcasts", { order:"&order=created_at.desc" }).catch(()=>[]),
        supabase("pautas_misa", { order:"&order=fecha.desc" }).catch(()=>[]),
      ]);
      setMembers(m||[]); setEventos(ev||[]); setDocs(d||[]);
      setOraciones(or||[]); setAvisos(n||[]); setPreguntas(p||[]);
      setLinks(lk||[]); setBiblioteca(bib||[]); setPodcasts(pod||[]); setPautas(pau||[]);
      // Cargar eventos desde Google Calendar para el Dashboard
      fetchGoogleCalendarEvents().then(gcal => setGcalEventos(gcal));
    } catch(e) { console.error("Error cargando datos:", e); }
    setDbLoading(false);
  }

  useEffect(()=>{
    if(view==="app"){
      loadData();
      fetchDaily();
      // Si la URL tiene ?pauta=ID, navegar directamente a pauta_misa
      const params = new URLSearchParams(window.location.search);
      if(params.get("pauta")) {
        setSection("pauta_misa");
      }
    }
  },[view]);

  // ── Clima (Open-Meteo, sin API key) ──────────────────────
  async function fetchClima() {
    try {
      // Santiago de Chile: -33.45, -70.67
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.67&current=temperature_2m,weathercode,windspeed_10m&timezone=America/Santiago",{signal:(()=>{ const c=new AbortController(); setTimeout(()=>c.abort(),5000); return c.signal; })()});
      if(!r.ok) return;
      const d = await r.json();
      const c = d.current;
      const wmo = {0:"☀️ Despejado",1:"🌤️ Mainly clear",2:"⛅ Parcial",3:"☁️ Nublado",45:"🌫️ Neblina",48:"🌫️ Neblina",51:"🌦️ Llovizna",53:"🌧️ Llovizna",55:"🌧️ Llovizna",61:"🌧️ Lluvia",63:"🌧️ Lluvia",65:"🌧️ Lluvia",71:"🌨️ Nieve",73:"🌨️ Nieve",75:"❄️ Nieve",80:"🌦️ Chubascos",81:"🌧️ Chubascos",82:"⛈️ Chubascos",95:"⛈️ Tormenta",96:"⛈️ Tormenta"};
      const desc = wmo[c.weathercode]||"🌡️";
      setClima({temp:Math.round(c.temperature_2m), desc, wind:Math.round(c.windspeed_10m), ciudad:"Santiago", pais:"Chile"});
    } catch {}
  }

  // ── Santoral desde Supabase ─────────────────────────────
  async function fetchSantoral(today) {
    const mm = String(today.getMonth()+1).padStart(2,"0");
    const dd = String(today.getDate()).padStart(2,"0");
    // Esperar token hasta 3 segundos
    for (let i = 0; i < 15; i++) {
      if (_authToken) break;
      await new Promise(r => setTimeout(r, 200));
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/santoral?select=nombre&dia=eq.${dd}&mes=eq.${mm}&limit=1`;
      const r = await fetch(url, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${_authToken || SUPABASE_KEY}` }
      });
      if (r.ok) {
        const rows = await r.json();
        if (rows?.[0]?.nombre) return rows[0].nombre;
      }
    } catch(e) { console.warn("Santoral fetch error:", e); }
    // Fallback hardcodeado
    const SANTOS = {
      "01/01":"Santa María, Madre de Dios","02/01":"Santos Basilio y Gregorio Nacianceno","03/01":"Santísimo Nombre de Jesús",
      "06/01":"Epifanía del Señor","13/01":"San Hilario, Obispo","17/01":"San Antonio Abad","20/01":"San Fabián y San Sebastián",
      "21/01":"Santa Inés, Virgen y Mártir","24/01":"San Francisco de Sales","25/01":"Conversión de San Pablo",
      "26/01":"Santos Timoteo y Tito","28/01":"Santo Tomás de Aquino","31/01":"San Juan Bosco",
      "02/02":"Presentación del Señor","03/02":"San Blas","05/02":"Santa Águeda","06/02":"San Pablo Miki y compañeros",
      "10/02":"Santa Escolástica","11/02":"Nuestra Señora de Lourdes","14/02":"San Valentín, Mártir",
      "22/02":"Cátedra de San Pedro","23/02":"San Policarpo",
      "04/03":"San Casimiro","07/03":"Santas Perpetua y Felicitas","08/03":"San Juan de Dios",
      "17/03":"San Patricio","18/03":"San Cirilo de Jerusalén","19/03":"San José, Esposo de la Virgen",
      "23/03":"Santo Toribio de Mogrovejo","25/03":"Anunciación del Señor",
      "02/04":"San Francisco de Paula","04/04":"San Isidoro","05/04":"San Vicente Ferrer",
      "07/04":"San Juan Bautista de La Salle","11/04":"San Estanislao","13/04":"San Martín I",
      "21/04":"San Anselmo","23/04":"San Jorge","24/04":"San Fidel de Sigmaringa","25/04":"San Marcos, Evangelista",
      "28/04":"San Pedro Chanel","29/04":"Santa Catalina de Siena","30/04":"San Pío V",
      "01/05":"San José Obrero","02/05":"San Atanasio","03/05":"Santos Felipe y Santiago",
      "10/05":"San Juan de Ávila","12/05":"Santos Nereo y Aquileo","13/05":"Nuestra Señora de Fátima",
      "14/05":"San Matías","15/05":"San Isidro Labrador","18/05":"San Juan I, Papa",
      "20/05":"San Bernardino de Siena","21/05":"San Cristóbal Magallanes","22/05":"Santa Rita de Cascia",
      "23/05":"Vigilia de Pentecostés","24/05":"Pentecostés del Señor","25/05":"San Beda el Venerable",
      "26/05":"San Felipe Neri","27/05":"San Agustín de Canterbury","31/05":"Visitación de la Virgen María",
      "01/06":"San Justino","02/06":"Santos Marcelino y Pedro","03/06":"San Carlos Lwanga y compañeros",
      "05/06":"San Bonifacio","06/06":"San Norberto","09/06":"San Efrén","11/06":"San Bernabé",
      "13/06":"San Antonio de Padua","19/06":"San Romualdo","21/06":"San Luis Gonzaga",
      "22/06":"San Paulino de Nola","24/06":"Natividad de San Juan Bautista","27/06":"San Cirilo de Alejandría",
      "28/06":"San Ireneo","29/06":"San Pedro y San Pablo","30/06":"Los Primeros Mártires de Roma",
      "03/07":"Santo Tomás, Apóstol","05/07":"San Antonio María Zaccaria","06/07":"Santa María Goretti",
      "11/07":"San Benito","13/07":"San Enrique","14/07":"San Camilo de Lelis","15/07":"San Buenaventura",
      "16/07":"Nuestra Señora del Carmen","20/07":"San Apolinar","21/07":"San Lorenzo de Brindis",
      "22/07":"Santa María Magdalena","23/07":"Santa Brígida","25/07":"Santiago, Apóstol",
      "26/07":"Santos Joaquín y Ana","29/07":"Santa Marta","31/07":"San Ignacio de Loyola",
      "01/08":"San Alfonso María de Ligorio","04/08":"San Juan María Vianney","06/08":"Transfiguración del Señor",
      "08/08":"Santo Domingo","10/08":"San Lorenzo, Diácono y Mártir","11/08":"Santa Clara",
      "14/08":"San Maximiliano Kolbe","15/08":"Asunción de la Virgen María","20/08":"San Bernardo",
      "21/08":"San Pío X","22/08":"La Virgen María Reina","23/08":"Santa Rosa de Lima",
      "24/08":"San Bartolomé, Apóstol","27/08":"Santa Mónica","28/08":"San Agustín",
      "29/08":"Martirio de San Juan Bautista",
      "03/09":"San Gregorio Magno","08/09":"Natividad de la Virgen María","09/09":"San Pedro Claver",
      "13/09":"San Juan Crisóstomo","14/09":"Exaltación de la Santa Cruz","15/09":"Nuestra Señora de los Dolores",
      "21/09":"San Mateo, Apóstol","23/09":"San Pío de Pietrelcina","27/09":"San Vicente de Paúl",
      "29/09":"Santos Miguel, Gabriel y Rafael","30/09":"San Jerónimo",
      "01/10":"Santa Teresa del Niño Jesús","02/10":"Santos Ángeles Custodios","04/10":"San Francisco de Asís",
      "07/10":"Nuestra Señora del Rosario","15/10":"Santa Teresa de Ávila","17/10":"San Ignacio de Antioquía",
      "18/10":"San Lucas, Evangelista","22/10":"San Juan Pablo II","28/10":"Santos Simón y Judas",
      "01/11":"Todos los Santos","02/11":"Conmemoración de los Fieles Difuntos","03/11":"San Martín de Porres",
      "04/11":"San Carlos Borromeo","09/11":"Dedicación de la Basílica de Letrán","10/11":"San León Magno",
      "11/11":"San Martín de Tours","21/11":"Presentación de la Virgen María","22/11":"Santa Cecilia",
      "30/11":"San Andrés, Apóstol",
      "03/12":"San Francisco Javier","06/12":"San Nicolás","07/12":"San Ambrosio",
      "08/12":"Inmaculada Concepción de la Virgen María","12/12":"Nuestra Señora de Guadalupe",
      "13/12":"Santa Lucía","14/12":"San Juan de la Cruz","25/12":"Natividad del Señor (Navidad)",
      "26/12":"San Esteban, Primer Mártir","27/12":"San Juan, Apóstol y Evangelista",
      "28/12":"Los Santos Inocentes","31/12":"San Silvestre I",
    };
    return SANTOS[`${dd}/${mm}`] || `Santos y Mártires del ${dd} de ${today.toLocaleDateString("es-CL",{month:"long"})}`;
  }
  // ── Evangelio del próximo domingo ────────────────────────
  async function fetchEvangelioDominical(today) {
    const dow = today.getDay();
    const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    const domingo = new Date(today);
    domingo.setDate(today.getDate() + daysUntilSunday);
    const domingoStr = domingo.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const domingoISO = domingo.toISOString().split("T")[0];

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        signal: controller.signal,
        headers:{
          "Content-Type":"application/json",
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true"
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          tools:[{"type":"web_search_20250305","name":"web_search"}],
          messages:[{role:"user",content:`Busca en internet el evangelio oficial de la misa dominical del ${domingoStr} (${domingoISO}) según el calendario litúrgico romano. Busca en evangelio.es, vaticano.va o catholic.net. Responde SOLO con JSON puro sin markdown:\n{"referencia":"Ej: Jn 15,9-17","texto":"texto del evangelio máximo 150 palabras","reflexion":"reflexión breve de 2 líneas para un coro de música sacra","domingo":"nombre de la celebración litúrgica","fuente":"nombre del sitio web"}`}]
        })
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("API error");
      const d = await res.json();
      const raw = (d.content||[]).filter(i=>i.type==="text").map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.referencia || !parsed.texto) throw new Error("Datos incompletos");
      return parsed;
    } catch(e) {
      console.warn("Evangelio API error:", e.message);
      // Fallback con datos reales del domingo actual
      const EVANGELIOS = {
        // Semana de Pentecostés 2026
        "2026-05-24":{ referencia:"Jn 20,19-23", texto:"Al atardecer de aquel día, el primero de la semana, estando cerradas las puertas del lugar donde se encontraban los discípulos por miedo a los judíos, llegó Jesús, se puso en medio y les dijo: «La paz sea con vosotros.» Dicho esto, les mostró las manos y el costado. Los discípulos se llenaron de alegría al ver al Señor. De nuevo les dijo: «La paz sea con vosotros. Como el Padre me envió, también yo os envío.» Después de decir esto, sopló sobre ellos y les dijo: «Recibid el Espíritu Santo; a quienes les perdonéis los pecados, les quedan perdonados.»", reflexion:"El Espíritu Santo nos anima a cantar con gozo y a ser instrumentos de paz en la liturgia.", domingo:"Pentecostés", fuente:"Calendario litúrgico 2026" },
        "2026-05-31":{ referencia:"Lc 7,11-17", texto:"Jesús se dirigió a una ciudad llamada Naín, e iban con él sus discípulos y mucha gente. Cuando se acercaba a la puerta de la ciudad, resultó que sacaban a enterrar a un muerto, hijo único de su madre, que era viuda. La ciudad acompañaba a la madre. Al verla el Señor, le dio lástima y le dijo: «No llores.» Se acercó y tocó el féretro; los que lo llevaban se detuvieron. Y dijo: «Joven, yo te lo mando: levántate.» El muerto se incorporó y empezó a hablar. Y Jesús se lo entregó a su madre.", reflexion:"Nuestra música proclama la vida que Cristo devuelve y el consuelo que el Señor ofrece a los afligidos.", domingo:"X Domingo del Tiempo Ordinario", fuente:"Calendario litúrgico 2026" },
      };
      return EVANGELIOS[domingoISO] || {
        referencia:"Jn 15,9-17",
        texto:"Como el Padre me amó, yo también os he amado. Permaneced en mi amor. Si guardáis mis mandamientos, permaneceréis en mi amor, lo mismo que yo he guardado los mandamientos de mi Padre y permanezco en su amor. Os he dicho esto para que mi alegría esté en vosotros y vuestra alegría llegue a plenitud.",
        reflexion:"Que nuestra música sea expresión del amor que permanece y de la alegría del Evangelio.",
        domingo:"Domingo del Tiempo Ordinario",
        fuente:"Evangelio según San Juan"
      };
    }
  }

  async function fetchNoticiasCatolicas() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/noticias-rss`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return data.map((n, i) => ({
          id: String(i),
          titulo: n.titulo || "Sin título",
          url: n.url || "https://www.vaticannews.va/es.html",
          fuente: n.fuente || "Vatican News",
        }));
      }
    } catch(e) {
      console.warn("Noticias fetch error:", e.message);
    }
    return [];
  }

  async function fetchDaily() {
    setAiLoading(true);
    fetchClima();

    // Noticias fallback inmediatas (se reemplazan si la API responde)
    const FALLBACK_NOTICIAS = [
      { id:"f0", titulo:"Últimas noticias del Papa y la Iglesia Universal", url:"https://www.vaticannews.va/es.html", fuente:"Vatican News" },
      { id:"f1", titulo:"Iglesia en el mundo: noticias de hoy", url:"https://www.vaticannews.va/es/iglesia.html", fuente:"Vatican News" },
      { id:"f2", titulo:"Documentos y enseñanzas del Magisterio", url:"https://www.vaticannews.va/es/vaticano.html", fuente:"Vatican News" },
    ];
    setNoticias(FALLBACK_NOTICIAS);

    // Intenta cargar noticias reales del día
    setNoticiasLoading(true);
    fetchNoticiasCatolicas().then(data => {
      if (data?.length > 0) setNoticias(data);
      setNoticiasLoading(false);
    }).catch(() => setNoticiasLoading(false));
    try {
      const today = new Date();
      const [santoralData, evangelioData] = await Promise.all([
        fetchSantoral(today),
        fetchEvangelioDominical(today),
      ]);
      setSantoral(santoralData || "Santos del día");
      setEvangelio(evangelioData);
    } catch {
      setSantoral("Santos del día");
      setEvangelio({referencia:"Jn 20,19-23",texto:"Al atardecer de aquel día, el primero de la semana, llegó Jesús, se puso en medio y les dijo: «La paz sea con vosotros.» Dicho esto, les mostró las manos y el costado. Los discípulos se llenaron de alegría al ver al Señor.",reflexion:"El Espíritu Santo nos anima a cantar con gozo y a ser instrumentos de paz en la liturgia.",domingo:"Pentecostés",fuente:"Calendario litúrgico 2026"});
    }
    setAiLoading(false);
  }

  async function handleSignIn(email, password) {
    const data = await authSignIn(email, password);
    const perfil = await supabase("integrantes", { filters:`&email=eq.${encodeURIComponent(email)}` });
    let p = perfil && perfil[0] ? perfil[0] : null;
    // Si no existe en integrantes (confirmó email pero el INSERT del signup falló), crearlo ahora
    if (!p) {
      const uid = data.user?.id;
      const nombre = data.user?.user_metadata?.nombre || email.split("@")[0];
      const cuerda = data.user?.user_metadata?.cuerda || "Soprano";
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/integrantes`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${data.access_token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({ nombre, email, cuerda, auth_id: uid }),
        });
        const perfil2 = await supabase("integrantes", { filters:`&email=eq.${encodeURIComponent(email)}` });
        p = perfil2 && perfil2[0] ? perfil2[0] : { nombre, email, cuerda };
      } catch(e) { p = { nombre, email, cuerda }; }
    }
    setAuthToken(data.access_token);
    setUser(p);
    setView("app");
  }

  async function handleSignUp(email, password, nombre, cuerda, cumpleanos, adminCode) {
    // Si el código secreto es correcto, registrar como Admin
    const finalCuerda = adminCode.trim() === SECRET_ADMIN_CODE ? "Admin" : cuerda;
    const data = await authSignUp(email, password, nombre, finalCuerda, cumpleanos);
    const perfil = await supabase("integrantes", { filters:`&email=eq.${encodeURIComponent(email)}` });
    const p = perfil && perfil[0] ? perfil[0] : { nombre, email, cuerda: finalCuerda };
    setAuthToken(data.access_token);
    setUser(p);
    setView("app");
  }

  async function handleSignOut() {
    await authSignOut();
    setUser(null); setAuthToken(null); setView("login");
  }

  const searchRes = searchQ.length>2?[
    ...members.filter(m=>m.nombre.toLowerCase().includes(searchQ.toLowerCase())).map(m=>({type:"Integrante",label:m.nombre,sub:m.cuerda,color:CUERDAS[m.cuerda]})),
    ...docs.filter(d=>d.nombre.toLowerCase().includes(searchQ.toLowerCase())).map(d=>({type:"Documento",label:d.nombre,sub:d.categoria,color:C.danger})),
    ...oraciones.filter(o=>o.titulo.toLowerCase().includes(searchQ.toLowerCase())).map(o=>({type:"Oración",label:o.titulo,sub:o.autor,color:C.gold})),
  ]:[];

  function handleBottomNav(id) {
    if(id==="__menu__") { setMobileMenu(true); return; }
    setSection(id);
  }

  if(view!=="app") return <AuthScreen view={view} setView={setView} onSignIn={handleSignIn} onSignUp={handleSignUp}/>;

  return (
    <div style={{display:"flex",height:"100dvh",background:"#f3f4f6",overflow:"hidden"}}>
      <style>{G}</style>
      {mobileMenu && <MobileMenu section={section} setSection={setSection} onClose={()=>setMobileMenu(false)}/>}

      {/* Sidebar desktop */}
      <aside className="hide-mobile" style={{width:sideOpen?220:60,background:C.white,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width 0.25s ease",overflow:"hidden",flexShrink:0}}>
        <div style={{padding:"16px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,minHeight:64}}>
          <img src={LOGO} alt="Logo" style={{width:36,height:36,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
          {sideOpen&&<div><div style={{fontSize:13,fontFamily:"'Poppins',sans-serif",fontWeight:600,color:C.dark,lineHeight:1.2}}>Coro MJ</div><div style={{fontSize:11,color:C.gray}}>Misioneros de Jesús</div></div>}
        </div>
        <nav style={{flex:1,overflowY:"auto",padding:"8px 6px"}}>
          {NAV.filter(item => item.id !== "admin" || user?.cuerda === "Admin").map(item=>(
            <button key={item.id} onClick={()=>setSection(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,background:section===item.id?C.primaryLight:"transparent",border:"none",cursor:"pointer",color:section===item.id?C.primaryDark:C.gray,marginBottom:2,transition:"all 0.15s",fontSize:13,fontWeight:section===item.id?600:400,whiteSpace:"nowrap",textAlign:"left"}}>
              <span style={{fontSize:16,flexShrink:0,width:20,textAlign:"center"}}>{item.icon}</span>
              {sideOpen&&item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"10px 8px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px",borderRadius:8,background:C.light}}>
            <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:CUERDAS[user?.cuerda]||C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700,overflow:"hidden"}}>
              {user?.foto_url ? <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",display:"block"}}/> : ini(user?.nombre||"U")}
            </div>
            {sideOpen&&<div style={{overflow:"hidden",flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.dark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.nombre}</div><div style={{fontSize:10,color:C.primary}}>{rolLabel(user?.cuerda)}</div></div>}
          </div>
        </div>
      </aside>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* Topbar */}
        <header className="topbar" style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:60,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button className="hide-mobile" onClick={()=>setSideOpen(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",color:C.gray,fontSize:18,padding:4,borderRadius:6,flexShrink:0}}>☰</button>
          <button className="show-mobile" onClick={()=>setMobileMenu(true)} style={{background:"none",border:"none",cursor:"pointer",color:C.gray,fontSize:22,padding:4,borderRadius:6,flexShrink:0}}>☰</button>
          <img className="show-mobile" src={LOGO} alt="Logo" style={{width:30,height:30,borderRadius:6,objectFit:"cover",flexShrink:0}}/>

          <div style={{flex:1,maxWidth:440,position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:C.light,borderRadius:8,padding:"7px 12px",border:`1px solid ${C.border}`}}>
              <span style={{color:C.gray,fontSize:14}}>🔍</span>
              <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setShowSearch(true);}} onFocus={()=>setShowSearch(true)} onBlur={()=>setTimeout(()=>setShowSearch(false),150)} placeholder="Buscar integrantes, documentos..." style={{background:"none",border:"none",outline:"none",fontSize:13,width:"100%",color:C.dark}}/>
            </div>
            {showSearch&&searchRes.length>0&&(
              <div style={{position:"absolute",top:"110%",left:0,right:0,background:C.white,borderRadius:10,boxShadow:"0 10px 30px rgba(0,0,0,0.12)",zIndex:200,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                {searchRes.map((r,i)=>(
                  <div key={i} onClick={()=>setSearchQ("")} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                    <Badge color={r.color}>{r.type}</Badge>
                    <span style={{fontSize:13,color:C.dark,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="topbar-greeting" style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14}}>
            {clima && (
              <div style={{display:"flex",alignItems:"center",gap:6,background:C.primaryLight,borderRadius:10,padding:"5px 12px",border:`1px solid ${C.primary}25`}}>
                <span style={{fontSize:20,lineHeight:1}}>{clima.desc.split(" ")[0]}</span>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:C.primaryDark,lineHeight:1}}>{clima.temp}°C</div>
                  <div style={{fontSize:10,color:C.gray,lineHeight:1}}>{clima.ciudad}, {clima.pais}</div>
                </div>
              </div>
            )}
            <div style={{textAlign:"right",background:C.goldLight,borderRadius:10,padding:"5px 12px",border:`1px solid ${C.gold}30`}}>
              <div style={{fontSize:14,fontWeight:700,color:C.dark}}>¡Hola, {user?.nombre?.split(" ")[0]}! 👋</div>
              <div style={{fontSize:11,fontWeight:600,color:C.gold,textTransform:"capitalize"}}>{new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{background:C.light,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",color:C.gray,fontSize:13,whiteSpace:"nowrap",marginLeft:"auto"}}>Salir</button>
        </header>

        <main className="main-content" style={{flex:1,overflowY:"auto",padding:24,WebkitOverflowScrolling:"touch"}}>
          {dbLoading ? <Spinner/> : <>
            {section==="dashboard"   && <Dashboard cumple={cumple} evangelio={evangelio} santoral={santoral} loading={aiLoading} noticias={noticias} noticiasLoading={noticiasLoading} eventos={gcalEventos} members={members} docs={docs} links={links} setSection={setSection} user={user} clima={clima} pautas={pautas} avisos={avisos}/>}
            {section==="perfil"      && <Perfil user={user} fileRef={fileRef} members={members} setUser={setUser}/>}
            {section==="agenda"      && <Agenda eventos={eventos} onReload={loadData}/>}
            {section==="pauta_misa"  && <PautaMisa pautas={pautas} members={members} user={user} onReload={loadData} deepPautaId={new URLSearchParams(window.location.search).get("pauta")}/>}
            {section==="documentos"  && <Documentos docs={docs} onReload={loadData}/>}
            {section==="oraciones"   && <Oraciones oraciones={oraciones} user={user} onReload={loadData}/>}
            {section==="noticias"    && <Noticias noticias={avisos} onReload={loadData}/>}
            {section==="qanda"       && <QandA preguntas={preguntas} user={user} onReload={loadData}/>}
            {section==="integrantes" && <Integrantes members={members}/>}
            {section==="biblioteca"  && <Biblioteca biblioteca={biblioteca} onReload={loadData} user={user}/>}
            {section==="musica"      && <Musica/>}
            {section==="fotos"       && <Fotos/>}
            {section==="podcast"     && <Podcast podcasts={podcasts} onReload={loadData} user={user}/>}
            {section==="videos"      && <Videos/>}
            {section==="cancionero"  && <Cancionero/>}
            {section==="admin"       && user?.cuerda === "Admin" && <Admin members={members} eventos={eventos} docs={docs} oraciones={oraciones} noticias={avisos} preguntas={preguntas} links={links} biblioteca={biblioteca} podcasts={podcasts} onReload={loadData} user={user}/>}
            {section==="admin"       && user?.cuerda !== "Admin" && <div style={{padding:40,textAlign:"center",color:"#6b7280"}}><div style={{fontSize:40,marginBottom:12}}>🔒</div><div style={{fontWeight:600,fontSize:16,marginBottom:8}}>Acceso restringido</div><div style={{fontSize:13}}>Solo los administradores pueden acceder a esta sección.</div></div>}
          </>}
        </main>

        <nav className="bottom-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.border}`,height:60,alignItems:"stretch",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
          {BOTTOM_NAV.map(item=>(
            <button key={item.id} onClick={()=>handleBottomNav(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",color:section===item.id&&item.id!=="__menu__"?C.primary:C.gray,fontSize:10,fontWeight:section===item.id&&item.id!=="__menu__"?600:400,padding:"4px 2px"}}>
              <span style={{fontSize:20,lineHeight:1}}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  AUTH SCREEN (Login / Registro / Recuperar)
// ══════════════════════════════════════════
function AuthScreen({view, setView, onSignIn, onSignUp}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // Login
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registro
  const [regEmail, setRegEmail]           = useState("");
  const [regPassword, setRegPassword]     = useState("");
  const [regPassword2, setRegPassword2]   = useState("");
  const [regNombre, setRegNombre]         = useState("");
  const [regCuerda, setRegCuerda]         = useState("Soprano");
  const [regCumple, setRegCumple]         = useState("");
  const [regAdminCode, setRegAdminCode]   = useState("");

  // Recuperar
  const [recEmail, setRecEmail] = useState("");

  const inp = {width:"100%",padding:"11px 14px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box",color:"#111827",background:"white"};
  const lbl = {display:"block",fontSize:12,fontWeight:500,color:"#374151",marginBottom:6};

  async function doLogin(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await onSignIn(loginEmail.trim(), loginPassword); }
    catch(err) { setError(err.message); }
    setLoading(false);
  }

  async function doRegister(e) {
    e.preventDefault(); setError(""); setSuccess("");
    if(regPassword !== regPassword2) { setError("Las contraseñas no coinciden."); return; }
    if(regPassword.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if(!regNombre.trim()) { setError("Ingresa tu nombre completo."); return; }
    setLoading(true);
    try { await onSignUp(regEmail.trim(), regPassword, regNombre.trim(), regCuerda, regCumple, regAdminCode); }
    catch(err) {
      if(err.message.includes("confirma")) { setSuccess(err.message); }
      else { setError(err.message); }
    }
    setLoading(false);
  }

  async function doRecover(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await authResetPassword(recEmail.trim());
      setSuccess("Te enviamos un correo con el enlace para restablecer tu contraseña.");
    } catch(err) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"#ffffff",padding:16}}>
      <style>{G}</style>
      <div style={{width:"100%",maxWidth:420}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src={LOGO} alt="Logo" style={{width:140,height:140,objectFit:"contain",marginBottom:14}}/>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontSize:20,fontWeight:700,color:"#111827",marginBottom:4}}>Coro Misioneros de Jesús</h1>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:8}}>Portal Exclusivo</p>
          <p style={{fontSize:11,color:"#9ca3af",fontStyle:"italic",marginBottom:2}}>Sistema de Gestión Musical para Coros y Liturgia</p>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#1D9E75",marginBottom:0}}>TEMPVS7®</p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:20,background:"#f3f4f6",borderRadius:10,padding:4}}>
          {[["login","Ingresar"],["register","Registrarse"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setView(v);setError("");setSuccess("");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:view===v?600:400,background:view===v?"white":"transparent",color:view===v?"#111827":"#6b7280",boxShadow:view===v?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>

        <div style={{background:"#f9fafb",borderRadius:16,padding:24,boxShadow:"0 4px 24px rgba(0,0,0,0.06)",border:"1px solid #e5e7eb"}}>
          {error && <div style={{background:"#fee2e2",color:"#b91c1c",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,border:"1px solid #fca5a5"}}>{error}</div>}
          {success && <div style={{background:"#d1fae5",color:"#065f46",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,border:"1px solid #6ee7b7"}}>{success}</div>}

          {/* ── LOGIN ── */}
          {view==="login" && (
            <form onSubmit={doLogin}>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Correo electrónico</label>
                <input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="tu@correo.cl" style={inp}/>
              </div>
              <div style={{marginBottom:8}}>
                <label style={lbl}>Contraseña</label>
                <input type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="••••••••" style={inp}/>
              </div>
              <button type="button" onClick={()=>{setView("recover");setError("");setSuccess("");}} style={{background:"none",border:"none",fontSize:12,color:"#1D9E75",cursor:"pointer",padding:"0 0 16px",textDecoration:"underline"}}>¿Olvidaste tu contraseña?</button>
              <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",background:"#1D9E75",border:"none",borderRadius:8,color:"white",fontSize:14,fontFamily:"'Poppins',sans-serif",fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>{loading?"Verificando...":"Ingresar al Portal"}</button>
            </form>
          )}

          {/* ── REGISTRO ── */}
          {view==="register" && (
            <form onSubmit={doRegister}>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Nombre completo *</label>
                <input type="text" required value={regNombre} onChange={e=>setRegNombre(e.target.value)} placeholder="María González" style={inp}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Correo electrónico *</label>
                <input type="email" required value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="tu@correo.cl" style={inp}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lbl}>Cuerda vocal</label>
                  <select value={regCuerda} onChange={e=>setRegCuerda(e.target.value)} style={inp}>
                    {["Soprano","Contralto","Tenor","Bajo"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Cumpleaños (DD/MM)</label>
                  <input type="text" value={regCumple} onChange={e=>setRegCumple(e.target.value)} placeholder="16/05" style={inp}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Contraseña * (mín. 6 caracteres)</label>
                <input type="password" required value={regPassword} onChange={e=>setRegPassword(e.target.value)} placeholder="••••••••" style={inp}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Confirmar contraseña *</label>
                <input type="password" required value={regPassword2} onChange={e=>setRegPassword2(e.target.value)} placeholder="••••••••" style={inp}/>
              </div>
              <div style={{marginBottom:20}}>
                <label style={lbl}>Código de administrador <span style={{color:"#9ca3af",fontWeight:400}}>(opcional)</span></label>
                <input type="password" value={regAdminCode} onChange={e=>setRegAdminCode(e.target.value)} placeholder="Solo si eres administrador" style={{...inp,background:"#f9fafb"}}/>
                <p style={{margin:"5px 0 0",fontSize:11,color:"#9ca3af"}}>Déjalo en blanco si eres integrante normal.</p>
              </div>
              <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",background:"#1D9E75",border:"none",borderRadius:8,color:"white",fontSize:14,fontFamily:"'Poppins',sans-serif",fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>{loading?"Creando cuenta...":"Crear cuenta"}</button>
            </form>
          )}

          {/* ── RECUPERAR ── */}
          {view==="recover" && (
            <form onSubmit={doRecover}>
              <p style={{fontSize:13,color:"#6b7280",marginBottom:16,lineHeight:1.6}}>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div style={{marginBottom:20}}>
                <label style={lbl}>Correo electrónico</label>
                <input type="email" required value={recEmail} onChange={e=>setRecEmail(e.target.value)} placeholder="tu@correo.cl" style={inp}/>
              </div>
              <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",background:"#1D9E75",border:"none",borderRadius:8,color:"white",fontSize:14,fontFamily:"'Poppins',sans-serif",fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>{loading?"Enviando...":"Enviar enlace"}</button>
              <button type="button" onClick={()=>{setView("login");setError("");setSuccess("");}} style={{width:"100%",marginTop:10,padding:"10px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>← Volver al login</button>
            </form>
          )}
        </div>
        <p style={{textAlign:"center",color:"#9ca3af",fontSize:11,marginTop:14}}>Tus datos están protegidos con Supabase Auth</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════

// ── Twitter Timeline Embed ─────────────────────────────
function TwitterTimeline() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const anchor = document.createElement("a");
    anchor.className = "twitter-timeline";
    anchor.setAttribute("data-lang", "es");
    anchor.setAttribute("data-height", "320");
    anchor.setAttribute("data-theme", "light");
    anchor.setAttribute("data-chrome", "noheader nofooter noborders");
    anchor.href = "https://twitter.com/vaticannews_es";
    ref.current.appendChild(anchor);
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    ref.current.appendChild(script);
  }, []);
  return <div ref={ref} style={{background:"#ffffff",minHeight:280}}/>;
}

function Dashboard({cumple,evangelio,santoral,loading,noticias,noticiasLoading,eventos,members,docs,links,setSection,user,clima,pautas,avisos}) {
  const futuros=[...eventos].filter(e=>new Date(e.fecha+"T00:00:00")>=new Date()).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
  const isAdmin = user?.cuerda === "Admin";
  const pautasBorrador = (pautas||[]).filter(p=>!p.publicada);
  const hoyInicio = new Date(); hoyInicio.setHours(0,0,0,0);
  const pautasProximas = (pautas||[]).filter(p=>p.publicada && new Date(p.fecha+"T00:00:00")>=hoyInicio).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
  const proximos=futuros.slice(0,3);
  const tipoC={ensayo:C.primary,misa:C.gold,evento:C.purple};
  const tipoL={ensayo:"Ensayo",misa:"Misa",evento:"Evento"};
  const cc = CUERDAS[user?.cuerda]||C.primary;
  const eventoDestacado = futuros[0];
  const fmtEventoFecha = f => {
    const d = new Date(f+"T00:00:00");
    return d.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});
  };
  return (
    <div style={{maxWidth:1100}}>
      {cumple.length>0&&(
        <div style={{background:`linear-gradient(135deg,#B8922A,#d4a843,#B8922A)`,backgroundSize:"200% 200%",borderRadius:16,padding:"20px 24px",marginBottom:16,border:"2px solid #d4a84360",boxShadow:"0 8px 32px rgba(184,146,42,0.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:52,lineHeight:1,flexShrink:0,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.2))"}}>🎂</div>
            <div style={{flex:1}}>
              <div style={{color:"white",fontFamily:"'Poppins',sans-serif",fontSize:18,fontWeight:700,marginBottom:4,textShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>
                🎉 ¡Feliz Cumpleaños, {cumple.map(c=>c.nombre.split(" ")[0]).join(" y ")}!
              </div>
              <div style={{color:"rgba(255,255,255,0.95)",fontSize:13,lineHeight:1.7,fontStyle:"italic"}}>
                "Que el Señor te bendiga y te guarde en este nuevo año de vida.<br/>
                El coro te abraza con alegría y gratitud por tu presencia y tu voz. 🎵✨"
              </div>
              <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                {cumple.map(c=>(
                  <span key={c.id} style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"3px 12px",fontSize:12,color:"white",fontWeight:600,border:"1px solid rgba(255,255,255,0.4)"}}>
                    🎶 {c.nombre} · {rolLabel(c.cuerda)}
                  </span>
                ))}
              </div>
            </div>
            <div style={{fontSize:32,flexShrink:0,opacity:0.7}}>🕊️</div>
          </div>
        </div>
      )}

      {/* ── Aviso pauta en borrador (solo Admin) ── */}
      {isAdmin && pautasBorrador.length>0 && (
        <div onClick={()=>setSection("pauta_misa")} style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",borderRadius:14,padding:"14px 18px",marginBottom:12,border:"2px solid #fbbf24",cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:"0 4px 16px rgba(251,191,36,0.2)",transition:"box-shadow 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(251,191,36,0.35)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(251,191,36,0.2)"}
        >
          <div style={{width:44,height:44,borderRadius:11,background:"linear-gradient(135deg,#92400e,#f59e0b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🎼</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:2}}>
              {pautasBorrador.length === 1
                ? `Tienes una pauta en borrador`
                : `Tienes ${pautasBorrador.length} pautas en borrador`}
              <span style={{marginLeft:8,fontSize:11,background:"#fef08a",color:"#713f12",padding:"2px 8px",borderRadius:10,fontWeight:600}}>BORRADOR</span>
            </div>
            <div style={{fontSize:12,color:"#b45309"}}>
              {pautasBorrador.map(p=>p.titulo).join(" · ")} — Abre para revisar y publicar
            </div>
          </div>
          <span style={{fontSize:12,color:"#b45309",fontWeight:600,whiteSpace:"nowrap"}}>Revisar →</span>
        </div>
      )}

      {/* ── Avisos pautas publicadas próximas (todas, todos los integrantes) ── */}
      {pautasProximas.map(p=>(
        <div key={p.id} onClick={()=>setSection("pauta_misa")} style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:14,padding:"14px 18px",marginBottom:10,border:`2px solid ${C.primary}50`,cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:`0 4px 16px ${C.primary}20`,transition:"box-shadow 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 6px 24px ${C.primary}35`}
          onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 4px 16px ${C.primary}20`}
        >
          <div style={{width:44,height:44,borderRadius:11,background:`linear-gradient(135deg,#1a3a2a,${C.primary})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{fontSize:14,fontWeight:800,color:"white",lineHeight:1}}>{new Date(p.fecha+"T00:00:00").getDate()}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.8)",textTransform:"uppercase"}}>{new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{month:"short"})}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.primaryDark,marginBottom:2}}>
              🎼 {p.titulo}
              <span style={{marginLeft:8,fontSize:11,background:C.primaryLight,color:C.primaryDark,padding:"2px 8px",borderRadius:10,fontWeight:600}}>✅ PUBLICADA</span>
            </div>
            <div style={{fontSize:12,color:C.gray,textTransform:"capitalize"}}>
              {new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})} · {p.hora} Hrs{p.lugar ? " · "+p.lugar : ""}
            </div>
          </div>
          <span style={{fontSize:12,color:C.primary,fontWeight:600,whiteSpace:"nowrap"}}>Ver pauta →</span>
        </div>
      ))}

      {/* ── Avisos del Coro ── */}
      {avisos&&avisos.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>📢</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark}}>Avisos del Coro</span>
              <span style={{background:C.primary,color:"white",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{avisos.length}</span>
            </div>
            <button onClick={()=>setSection("noticias")} style={{fontSize:12,color:C.primary,background:"none",border:"none",cursor:"pointer",fontWeight:500,padding:0}}>Ver todos →</button>
          </div>
          {/* Afiches con imagen */}
          {avisos.filter(a=>a.imagen_url).length>0&&(
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6,WebkitOverflowScrolling:"touch",marginBottom:10}}>
              {avisos.filter(a=>a.imagen_url).slice(0,4).map(n=>(
                <div key={n.id} onClick={()=>setSection("noticias")} style={{flexShrink:0,width:180,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,cursor:"pointer",background:C.white,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",transition:"transform 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
                >
                  <div style={{position:"relative",paddingTop:"60%",background:C.light,overflow:"hidden"}}>
                    <img src={n.imagen_url} alt={n.titulo} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    {n.fuente&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.55))",padding:"12px 8px 6px"}}>
                      <span style={{fontSize:9,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:"0.06em"}}>{n.fuente}</span>
                    </div>}
                  </div>
                  <div style={{padding:"8px 10px"}}>
                    <div style={{fontSize:11,fontWeight:600,color:C.dark,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{n.titulo}</div>
                    <div style={{fontSize:10,color:C.gray,marginTop:4}}>{new Date(n.created_at).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Avisos simples (sin imagen) */}
          {avisos.filter(a=>!a.imagen_url).slice(0,2).map(n=>(
            <div key={n.id} onClick={()=>setSection("noticias")} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 14px",background:C.white,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8,cursor:"pointer",borderLeft:`3px solid ${C.primary}`,transition:"box-shadow 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
            >
              <span style={{fontSize:20,flexShrink:0,lineHeight:1,marginTop:1}}>📢</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.dark,lineHeight:1.4}}>{n.titulo}</div>
                {n.descripcion&&<div style={{fontSize:11,color:C.gray,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.descripcion}</div>}
                <div style={{fontSize:10,color:C.gray,marginTop:3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {n.fuente&&<Badge>{n.fuente}</Badge>}
                  <span>{new Date(n.created_at).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats con foto de usuario ── */}
      <div className="grid-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {/* Foto + saludo usuario */}
        <Card style={{display:"flex",alignItems:"center",gap:12,padding:14,background:`linear-gradient(135deg,${C.primaryLight},#fff)`}}>
          <div style={{width:48,height:48,borderRadius:"50%",flexShrink:0,background:cc,border:`3px solid ${cc}40`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:16,fontWeight:700}}>
            {user?.foto_url
              ? <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              : ini(user?.nombre||"U")}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,color:C.gray,marginBottom:1}}>Bienvenido/a</div>
            <div style={{fontSize:13,fontWeight:700,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nombre?.split(" ")[0]}</div>
            <div style={{fontSize:11,color:cc,fontWeight:600}}>{rolLabel(user?.cuerda)}</div>
          </div>
        </Card>
        {/* Próximo evento con fecha */}
        <Card style={{display:"flex",alignItems:"center",gap:12,padding:14,gridColumn:"span 2"}}>
          <div style={{width:48,height:48,borderRadius:12,background:C.primary+"15",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:C.primary,flexShrink:0,border:`1px solid ${C.primary}20`}}>
            {eventoDestacado
              ? <><div style={{fontSize:20,fontWeight:800,lineHeight:1,color:C.primary}}>{new Date(eventoDestacado.fecha+"T00:00:00").getDate()}</div>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>{new Date(eventoDestacado.fecha+"T00:00:00").toLocaleDateString("es-CL",{month:"short"})}</div></>
              : <span style={{fontSize:20}}>🎼</span>}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:11,color:C.gray,marginBottom:2}}>Próximo evento</div>
            <div style={{fontSize:13,fontWeight:700,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eventoDestacado?.titulo||"Sin eventos próximos"}</div>
            {eventoDestacado&&<div style={{fontSize:11,color:C.primary,marginTop:2,textTransform:"capitalize"}}>{fmtEventoFecha(eventoDestacado.fecha)}{eventoDestacado.hora?" · "+eventoDestacado.hora:""}</div>}
          </div>
        </Card>
        {/* Documentos */}
        <Card style={{display:"flex",alignItems:"center",gap:12,padding:14}}>
          <div style={{width:40,height:40,borderRadius:10,background:C.gold+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📄</div>
          <div><div style={{fontSize:11,color:C.gray,marginBottom:2}}>Documentos</div><div style={{fontSize:13,fontWeight:600,color:C.dark}}>{docs.length} archivos</div></div>
        </Card>
      </div>

      <div className="grid-dash-main" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>📖</span>
            <div style={{flex:1}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark}}>Evangelio del Domingo</span>
              {evangelio?.domingo && <div style={{fontSize:11,color:C.gray,marginTop:1,fontStyle:"italic"}}>{evangelio.domingo}</div>}
            </div>
          </div>
          {loading?<Spinner/>:evangelio?(
            <>
              <div style={{fontSize:12,fontWeight:600,color:C.gold,marginBottom:8}}>{evangelio.referencia}</div>
              <p style={{fontSize:13,lineHeight:1.75,color:"#374151",marginBottom:12,borderLeft:`3px solid ${C.border}`,paddingLeft:12}}>{evangelio.texto}</p>
              <div style={{background:C.primaryLight,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${C.primary}`}}>
                <p style={{margin:0,fontSize:12,color:C.primaryDark,lineHeight:1.6,fontWeight:500}}>{evangelio.reflexion}</p>
              </div>
              {evangelio.fuente && <div style={{marginTop:8,fontSize:10,color:C.gray,textAlign:"right"}}>Fuente: {evangelio.fuente}</div>}
            </>
          ):null}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:18}}>✨</span><span style={{fontSize:13,fontWeight:600,color:C.dark}}>Santoral del Día</span></div>
            {loading?<Spinner/>:santoral?(
              <div style={{background:`linear-gradient(135deg,${C.goldLight},#fef9e7)`,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.gold}30`}}>
                <div style={{fontSize:12,color:C.gold,fontWeight:700,letterSpacing:"0.05em",marginBottom:4,textTransform:"uppercase"}}>Hoy celebramos</div>
                <div style={{fontSize:13,color:"#374151",lineHeight:1.6,fontWeight:500}}>⭐ {santoral}</div>
              </div>
            ):<div style={{fontSize:13,color:C.gray,fontStyle:"italic"}}>Cargando santoral...</div>}
          </Card>
          <Card style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span>🎵</span><span style={{fontSize:13,fontWeight:600,color:C.dark}}>Playlist</span></div>
            <a href="https://open.spotify.com/playlist/3ssNSNlljyYlw2La83mXZE" target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:"#1DB954",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:16,flexShrink:0}}>▶</div>
              <div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>Playlist Coro MJ</div><div style={{fontSize:11,color:C.gray}}>Abrir en Spotify</div></div>
            </a>
          </Card>
        </div>
      </div>

      <div className="grid-dash-sub" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span>📅</span><span style={{fontSize:14,fontWeight:600,color:C.dark}}>Agenda Coro</span></div>
          <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <iframe
              src="https://calendar.google.com/calendar/embed?src=coromisionerosdjesuscl%40gmail.com&ctz=America%2FSantiago&hl=es&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA"
              style={{width:"100%",height:200,border:0,display:"block"}}
              title="Próximos eventos"
            />
          </div>
          <button onClick={()=>setSection("agenda")} style={{fontSize:12,color:C.primary,background:"none",border:"none",cursor:"pointer",padding:"8px 0 0",fontWeight:500}}>Ver agenda completa →</button>
        </Card>
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span>📰</span>
            <span style={{fontSize:14,fontWeight:600,color:C.dark}}>Noticias Católicas</span>
            {noticiasLoading && noticias.length > 0 && <span style={{fontSize:10,color:C.gray,fontStyle:"italic"}}>actualizando...</span>}
            <a href="https://twitter.com/vaticannews_es" target="_blank" rel="noopener" style={{marginLeft:"auto",fontSize:10,color:C.primary,fontWeight:500,textDecoration:"none"}}>Vatican News →</a>
          </div>
          {noticias.length > 0 ? noticias.slice(0,4).map((n,i)=>(
            <div key={n.id||i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<Math.min(noticias.length,4)-1?`1px solid ${C.border}`:"none"}}>
              <a href={n.url} target="_blank" rel="noopener" style={{textDecoration:"none"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.dark,lineHeight:1.4,marginBottom:3}}>{n.titulo}</div>
                <div style={{fontSize:10,color:C.primary,fontWeight:500}}>{n.fuente || "Vatican News"} →</div>
              </a>
            </div>
          )) : (
            <div style={{fontSize:12,color:C.gray,fontStyle:"italic",textAlign:"center",padding:"12px 0"}}>⏳ Cargando noticias...</div>
          )}
        </Card>
      </div>

      <div className="links-bar" style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {(links.length>0 ? links : [
          {label:"📚 Cancionero Digital", url:"#"},
          {label:"📄 Cancionero PDF", url:"https://drive.google.com/file/d/1reZwCTC6mMJM2Rb1gEnUtYFkmNxijO0e/view?usp=drive_link"},
          {label:"📸 Instagram", url:"#"},
          {label:"🎵 TikTok", url:"#"},
          {label:"💬 WhatsApp", url:"#"},
          {label:"✈️ Telegram", url:"#"},
        ]).map((l,i)=>(
          <a key={i} href={l.url||"#"} target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",padding:"8px 14px",background:C.white,borderRadius:8,border:`1px solid ${C.border}`,color:C.dark,fontSize:12,fontWeight:500}}>{l.label||l.nombre}</a>
        ))}
      </div>

      {/* ── Pauta de Misa vigente con QR ── */}
      {(()=>{
        const publicadas = (pautas||[]).filter(p=>p.publicada).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
        const proxima = publicadas[0];
        if(!proxima) return null;
        const fechaFmt = new Date(proxima.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
        const cancArr = typeof proxima.canciones==="string"?JSON.parse(proxima.canciones||"[]"):(proxima.canciones||[]);
        // URL del QR — página pública sin login
        const qrData = `https://343mhn.csb.app/pauta-publica.html?pauta=${proxima.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}&color=1a3a2a&bgcolor=ffffff&margin=10`;
        return (
          <div style={{marginTop:14}}>
            <Card style={{background:`linear-gradient(135deg,#0f2a1e,#1a3a2a)`,border:"none",padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",flexWrap:"wrap",alignItems:"stretch"}}>
                {/* Info de la pauta */}
                <div style={{flex:1,padding:"20px 24px",minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:20}}>🎼</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Pauta de Misa</div>
                      <div style={{fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,color:"white",lineHeight:1.2}}>{proxima.titulo}</div>
                    </div>
                    <span style={{marginLeft:"auto",background:"#22c55e",color:"white",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>✅ PUBLICADA</span>
                  </div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:4,textTransform:"capitalize"}}>📅 {fechaFmt}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4}}>🕐 {proxima.hora} Hrs{proxima.lugar?` · 📍 ${proxima.lugar}`:""}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:12}}>{proxima.tipo_celebracion} · {cancArr.length} canciones</div>
                  {cancArr.slice(0,3).map((c,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:700,color:"#4ade80",minWidth:20}}>{c.n}.</span>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.orden}</span>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.65)",flex:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.cancion||"—"}</span>
                    </div>
                  ))}
                  {cancArr.length>3 && <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>+{cancArr.length-3} canciones más…</div>}
                  <button onClick={()=>setSection("pauta_misa")} style={{marginTop:14,background:"rgba(255,255,255,0.12)",color:"white",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600}}>Ver pauta completa →</button>
                </div>
                {/* QR */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 24px",background:"rgba(255,255,255,0.05)",borderLeft:"1px solid rgba(255,255,255,0.08)",gap:10,flexShrink:0}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",textAlign:"center"}}>Código QR</div>
                  <div style={{background:"white",borderRadius:12,padding:8,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
                    <img src={qrUrl} alt="QR Pauta" width={130} height={130} style={{display:"block",borderRadius:6}}/>
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textAlign:"center",maxWidth:130}}>Escanea para ver la pauta</div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════
//  PERFIL
// ══════════════════════════════════════════
function Perfil({user, members, setUser}) {
  const cc = CUERDAS[user?.cuerda]||C.primary;
  const [uploading, setUploading] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email||"");
  const [savingEmail, setSavingEmail] = useState(false);
  const [editCumple, setEditCumple] = useState(false);
  const [newCumple, setNewCumple] = useState(user?.cumpleanos||"");
  const [savingCumple, setSavingCumple] = useState(false);
  const [msg, setMsg] = useState("");
  const [editTel, setEditTel] = useState(false);
  const telSinPrefijo = (user?.telefono||"").replace(/^\+56\s?/,"");
  const [newTel, setNewTel] = useState(telSinPrefijo);
  const [savingTel, setSavingTel] = useState(false);
  const fileRef = useRef(null);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setMsg("La foto no puede superar 3 MB."); return; }
    setUploading(true); setMsg("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id || user.auth_id || Date.now()}.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${_authToken}`, "Content-Type": file.type, "x-upsert": "true" },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      const foto_url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
      await updateRecord("integrantes", user.id, { foto_url });
      setUser(p => ({...p, foto_url}));
      setMsg("✅ Foto actualizada.");
    } catch(e) { setMsg("Error: " + e.message); }
    setUploading(false);
  }

  async function saveEmail() {
    if (!newEmail.trim() || newEmail === user.email) { setEditEmail(false); return; }
    setSavingEmail(true); setMsg("");
    try {
      // Actualizar email en Supabase Auth
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${_authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg || d.message || "Error"); }
      // Actualizar también en tabla integrantes
      await updateRecord("integrantes", user.id, { email: newEmail.trim() });
      setUser(p => ({...p, email: newEmail.trim()}));
      setEditEmail(false);
      setMsg("✅ Correo actualizado. Revisa tu nuevo correo para confirmar el cambio.");
    } catch(e) { setMsg("Error: " + e.message); }
    setSavingEmail(false);
  }

  async function saveCumple() {
    if (newCumple === user.cumpleanos) { setEditCumple(false); return; }
    // Validar formato DD/MM
    if (newCumple && !/^\d{2}\/\d{2}$/.test(newCumple)) { setMsg("Formato incorrecto. Usa DD/MM (ej: 25/12)"); return; }
    setSavingCumple(true); setMsg("");
    try {
      await updateRecord("integrantes", user.id, { cumpleanos: newCumple });
      setUser(p => ({...p, cumpleanos: newCumple}));
      setEditCumple(false);
      setMsg("✅ Cumpleaños actualizado.");
    } catch(e) { setMsg("Error: " + e.message); }
    setSavingCumple(false);
  }

  async function saveTelefono() {
    const digits = newTel.replace(/\D/g,"");
    if (!digits) { setMsg("Ingresa un número válido."); return; }
    if (digits.length < 8 || digits.length > 9) { setMsg("El número móvil debe tener 8 o 9 dígitos (ej: 912345678)."); return; }
    const telCompleto = "+56 " + digits;
    if (telCompleto === user.telefono) { setEditTel(false); return; }
    setSavingTel(true); setMsg("");
    try {
      await updateRecord("integrantes", user.id, { telefono: telCompleto });
      setUser(p => ({...p, telefono: telCompleto}));
      setEditTel(false);
      setMsg("✅ Teléfono actualizado.");
    } catch(e) { setMsg("Error: " + e.message); }
    setSavingTel(false);
  }

  const fotoUrl = user?.foto_url;
  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Mi Perfil" subtitle="Tu información en el Coro MJ"/>
      {msg && <div style={{background: msg.startsWith("✅")?"#d1fae5":"#fee2e2", color: msg.startsWith("✅")?"#065f46":"#b91c1c", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14, border:`1px solid ${msg.startsWith("✅")?"#6ee7b7":"#fca5a5"}`}}>{msg}</div>}
      <div className="perfil-grid" style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
        <Card style={{textAlign:"center"}}>
          <div style={{position:"relative",width:100,height:100,margin:"0 auto 14px"}}>
            <div style={{width:100,height:100,borderRadius:"50%",background:cc,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:28,fontWeight:700,border:`3px solid ${cc}40`,overflow:"hidden",flexShrink:0}}>
              {fotoUrl
                ? <img src={fotoUrl} alt="Foto de perfil" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",display:"block",borderRadius:"50%"}}/>
                : ini(user?.nombre||"U")
              }
            </div>
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{position:"absolute",bottom:0,right:0,width:30,height:30,borderRadius:"50%",background:C.primary,border:"2px solid white",color:"white",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
              {uploading ? "⏳" : "📷"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:600,color:C.dark,marginBottom:6}}>{user?.nombre}</div>
          <Chip label={rolLabel(user?.cuerda)} color={cc}/>
          <p style={{color:C.gray,fontSize:11,marginTop:10,lineHeight:1.5}}>Toca 📷 para cambiar tu foto<br/>(máx. 3 MB)</p>
        </Card>
        <Card>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>Información Personal</div>
          {[{label:"Nombre",value:user?.nombre,icon:"👤"},{label:"Rol en el Coro",value:rolLabel(user?.cuerda),icon:"🎵"}].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.light,borderRadius:8,marginBottom:10,border:`1px solid ${C.border}`}}>
              <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
              <div style={{minWidth:0}}><div style={{fontSize:11,color:C.gray,marginBottom:1}}>{f.label}</div><div style={{fontSize:13,color:C.dark,fontWeight:500,wordBreak:"break-all"}}>{f.value||"—"}</div></div>
            </div>
          ))}
          {/* Cumpleaños editable */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.light,borderRadius:8,marginBottom:10,border:`1px solid ${C.border}`}}>
            <span style={{fontSize:18,flexShrink:0}}>🎂</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:C.gray,marginBottom:1}}>Cumpleaños</div>
              {editCumple ? (
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input value={newCumple} onChange={e=>setNewCumple(e.target.value)} placeholder="DD/MM (ej: 25/12)" style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:13,outline:"none",minWidth:0}}/>
                  <button onClick={saveCumple} disabled={savingCumple} style={{padding:"5px 10px",background:C.primary,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>{savingCumple?"...":"✓"}</button>
                  <button onClick={()=>{setEditCumple(false);setNewCumple(user.cumpleanos||"");}} style={{padding:"5px 8px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:user?.cumpleanos?C.dark:"#9ca3af",fontWeight:500}}>{user?.cumpleanos||"Sin registrar"}</span>
                  <button onClick={()=>{setEditCumple(true);setNewCumple(user?.cumpleanos||"");}} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",padding:0,textDecoration:"underline",flexShrink:0}}>Editar</button>
                </div>
              )}
            </div>
          </div>
          {/* Teléfono editable */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.light,borderRadius:8,marginBottom:10,border:`1px solid ${C.border}`}}>
            <span style={{fontSize:18,flexShrink:0}}>📱</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:C.gray,marginBottom:1}}>Teléfono móvil</div>
              {editTel ? (
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.dark,flexShrink:0,padding:"5px 8px",background:"#e5e7eb",borderRadius:"6px 0 0 6px",border:`1px solid ${C.border}`,borderRight:"none"}}>+56</span>
                  <input
                    value={newTel}
                    onChange={e=>setNewTel(e.target.value.replace(/\D/g,"").slice(0,9))}
                    placeholder="912345678"
                    maxLength={9}
                    inputMode="numeric"
                    style={{flex:1,padding:"5px 8px",borderRadius:"0 6px 6px 0",border:`1px solid ${C.border}`,fontSize:13,outline:"none",minWidth:0,letterSpacing:"0.05em"}}
                  />
                  <button onClick={saveTelefono} disabled={savingTel} style={{padding:"5px 10px",background:C.primary,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>{savingTel?"...":"✓"}</button>
                  <button onClick={()=>{setEditTel(false);setNewTel(telSinPrefijo);}} style={{padding:"5px 8px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:user?.telefono?C.dark:"#9ca3af",fontWeight:500}}>{user?.telefono||"Sin registrar"}</span>
                  <button onClick={()=>{setEditTel(true);setNewTel((user?.telefono||"").replace(/^\+56\s?/,""));}} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",padding:0,textDecoration:"underline",flexShrink:0}}>Editar</button>
                </div>
              )}
            </div>
          </div>
          {/* Correo editable */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.light,borderRadius:8,marginBottom:10,border:`1px solid ${C.border}`}}>
            <span style={{fontSize:18,flexShrink:0}}>📧</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:C.gray,marginBottom:1}}>Correo</div>
              {editEmail ? (
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} type="email" style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:13,outline:"none",minWidth:0}}/>
                  <button onClick={saveEmail} disabled={savingEmail} style={{padding:"5px 10px",background:C.primary,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>{savingEmail?"...":"✓"}</button>
                  <button onClick={()=>{setEditEmail(false);setNewEmail(user.email);}} style={{padding:"5px 8px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:C.dark,fontWeight:500,wordBreak:"break-all"}}>{user?.email||"—"}</span>
                  <button onClick={()=>setEditEmail(true)} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",padding:0,textDecoration:"underline",flexShrink:0}}>Cambiar</button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  AGENDA
// ══════════════════════════════════════════
function Agenda({eventos, onReload}) {
  return (
    <div style={{maxWidth:900}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{fontSize:20,fontFamily:"'Poppins',sans-serif",fontWeight:600,color:C.dark,marginBottom:2}}>Agenda del Coro</h2>
          <p style={{fontSize:13,color:C.gray}}>Calendario Coro Misioneros de Jesús</p>
        </div>
        <a href="https://calendar.google.com/calendar/r?cid=coromisionerosdjesuscl@gmail.com" target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"white",border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.dark,fontWeight:500,textDecoration:"none"}}>
          📅 Abrir en Google Calendar
        </a>
      </div>
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 4px 16px rgba(0,0,0,0.08)"}}>
        <iframe
          src="https://calendar.google.com/calendar/embed?src=coromisionerosdjesuscl%40gmail.com&ctz=America%2FSantiago&hl=es&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA"
          style={{width:"100%",height:680,border:0,display:"block"}}
          title="Calendario Coro MJ"
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  DOCUMENTOS
// ══════════════════════════════════════════
function Documentos({docs, onReload}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({nombre:"",url:"",categoria:"Repertorio",size:""});
  const [saving, setSaving] = useState(false);

  async function submit() {
    if(!form.nombre||!form.url) return;
    setSaving(true);
    try {
      await supabase("documentos",{method:"POST",body:form});
      setForm({nombre:"",url:"",categoria:"Repertorio",size:""});
      setShowForm(false); onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Documentos" subtitle="Archivos del coro" action={<Btn onClick={()=>setShowForm(true)}>+ Agregar</Btn>}/>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>Nuevo documento</div>
          <input placeholder="Nombre del archivo *" value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
          <input placeholder="URL (Google Drive, Dropbox...) *" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}>
              {["Repertorio","Partituras","Organización","Comunicados","Otro"].map(c=><option key={c}>{c}</option>)}
            </select>
            <input placeholder="Tamaño (ej: 2.3 MB)" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {docs.map(d=>(
        <Card key={d.id} hover style={{display:"flex",alignItems:"center",gap:14,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:44,height:44,background:"#fee2e2",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📄</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nombre}</div><div style={{fontSize:12,color:C.gray,marginTop:2}}><Badge>{d.categoria}</Badge>{d.size?" · "+d.size:""}</div></div>
          <a href={d.url} target="_blank" rel="noopener"><Btn variant="ghost" style={{flexShrink:0}}>⬇ Abrir</Btn></a>
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
//  ORACIONES
// ══════════════════════════════════════════
function Oraciones({oraciones, user, onReload}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({titulo:"",texto:""});
  const [saving, setSaving] = useState(false);

  async function submit() {
    if(!form.titulo||!form.texto) return;
    setSaving(true);
    try {
      await supabase("oraciones",{method:"POST",body:{...form,autor:user.nombre}});
      setForm({titulo:"",texto:""}); setShowForm(false); onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Oraciones" subtitle="Compartidas por los integrantes" action={<Btn onClick={()=>setShowForm(true)}>+ Nueva</Btn>}/>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`}}>
          <input placeholder="Título *" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
          <textarea value={form.texto} onChange={e=>setForm(p=>({...p,texto:e.target.value}))} placeholder="Texto de la oración..." rows={4} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:"Inter,sans-serif",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:12}}/>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Publicando...":"Publicar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {oraciones.map(o=>(
        <Card key={o.id} style={{marginBottom:12,borderLeft:`4px solid ${C.gold}`}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:8}}>✦ {o.titulo}</div>
          <p style={{lineHeight:1.8,color:"#374151",margin:"0 0 12px",fontSize:14}}>{o.texto}</p>
          <div style={{fontSize:11,color:C.gray}}>👤 {o.autor} · {new Date(o.created_at).toLocaleDateString("es-CL")}</div>
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
//  NOTICIAS
// ══════════════════════════════════════════
function Noticias({noticias, onReload}) {
  const [expandId, setExpandId] = useState(null);

  if(noticias.length===0) return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Avisos del Coro" subtitle="Avisos e información del coro"/>
      <div style={{textAlign:"center",padding:"48px 0",color:C.gray}}>
        <div style={{fontSize:40,marginBottom:10}}>📢</div>
        <div style={{fontSize:14,fontWeight:500}}>No hay avisos publicados aún.</div>
        <div style={{fontSize:12,marginTop:4}}>Los avisos del coro aparecerán aquí.</div>
      </div>
    </div>
  );

  // Separar avisos con imagen (afiches) de los sin imagen
  const afiches = noticias.filter(n=>n.imagen_url);
  const simples = noticias.filter(n=>!n.imagen_url);

  return (
    <div style={{maxWidth:860}}>
      <SectionTitle title="Avisos del Coro" subtitle={`${noticias.length} aviso${noticias.length!==1?"s":""} publicado${noticias.length!==1?"s":""}`}/>

      {/* ── Afiches con imagen ── */}
      {afiches.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>🖼️ Afiches</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
            {afiches.map(n=>(
              <Card key={n.id} hover style={{padding:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                {/* Imagen del afiche */}
                <div style={{position:"relative",paddingTop:"62%",background:C.light,overflow:"hidden"}}>
                  <img
                    src={n.imagen_url}
                    alt={n.titulo}
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                    onError={e=>{e.target.style.display="none";e.target.parentNode.style.background=C.primaryLight;}}
                  />
                  {n.fuente&&(
                    <div style={{position:"absolute",top:10,left:10}}>
                      <span style={{background:C.primary,color:"white",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{n.fuente}</span>
                    </div>
                  )}
                </div>
                {/* Contenido */}
                <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.dark,lineHeight:1.4}}>{n.titulo}</div>
                  {n.descripcion&&(
                    <div style={{fontSize:12,color:"#374151",lineHeight:1.6,
                      ...(expandId!==n.id?{overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}:{})
                    }}>
                      {n.descripcion}
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto",paddingTop:6}}>
                    <span style={{fontSize:11,color:C.gray}}>{new Date(n.created_at).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {n.descripcion&&<button onClick={()=>setExpandId(expandId===n.id?null:n.id)} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",padding:0,textDecoration:"underline"}}>{expandId===n.id?"Ver menos":"Ver más"}</button>}
                      {n.url&&<a href={n.url} target="_blank" rel="noopener" style={{fontSize:11,color:C.primary,fontWeight:600,textDecoration:"none"}}>Ver enlace →</a>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Avisos sin imagen ── */}
      {simples.length>0&&(
        <div>
          {afiches.length>0&&<div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>📋 Avisos</div>}
          {simples.map(n=>(
            <Card key={n.id} hover style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:10,borderLeft:`4px solid ${C.primary}`}}>
              <div style={{width:44,height:44,background:C.primaryLight,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📢</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:C.dark,lineHeight:1.5,marginBottom:4}}>{n.titulo}</div>
                {n.descripcion&&(
                  <div style={{fontSize:12,color:"#374151",lineHeight:1.6,marginBottom:6,
                    ...(expandId!==n.id?{overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}:{})
                  }}>
                    {n.descripcion}
                  </div>
                )}
                <div style={{fontSize:11,color:C.gray,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  {n.fuente&&<Badge>{n.fuente}</Badge>}
                  <span>{new Date(n.created_at).toLocaleDateString("es-CL",{day:"numeric",month:"long",year:"numeric"})}</span>
                  {n.descripcion&&<button onClick={()=>setExpandId(expandId===n.id?null:n.id)} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",padding:0,textDecoration:"underline"}}>{expandId===n.id?"Ver menos":"Ver más"}</button>}
                  {n.url&&<a href={n.url} target="_blank" rel="noopener" style={{fontSize:11,color:C.primary,fontWeight:600,textDecoration:"none"}}>Ver enlace →</a>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  PREGUNTAS
// ══════════════════════════════════════════
function QandA({preguntas, user, onReload}) {
  const [newQ, setNewQ] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if(!newQ.trim()) return;
    setSaving(true);
    try {
      await supabase("preguntas",{method:"POST",body:{pregunta:newQ,autor:user.nombre}});
      setNewQ(""); onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Preguntas y Respuestas" subtitle="Consultas del coro"/>
      <Card style={{marginBottom:16}}>
        <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:12}}>Hacer una pregunta</div>
        <textarea value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder="¿Tienes alguna consulta?" rows={3} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:"Inter,sans-serif",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:10}}/>
        <Btn onClick={submit} disabled={saving}>{saving?"Enviando...":"Publicar pregunta"}</Btn>
      </Card>
      {preguntas.map(q=>(
        <Card key={q.id} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <span style={{fontSize:20,flexShrink:0}}>❓</span>
            <div><div style={{fontSize:14,fontWeight:600,color:C.dark}}>{q.pregunta}</div><div style={{fontSize:11,color:C.gray,marginTop:2}}>{q.autor} · {new Date(q.created_at).toLocaleDateString("es-CL")}</div></div>
          </div>
          {q.respuesta?<div style={{background:C.primaryLight,borderRadius:8,padding:"10px 14px",display:"flex",gap:10}}><span>✅</span><p style={{margin:0,fontSize:13,color:C.primaryDark,lineHeight:1.6}}>{q.respuesta}</p></div>:<div style={{fontSize:12,color:C.gray}}>⏳ Pendiente de respuesta</div>}
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
//  INTEGRANTES
// ══════════════════════════════════════════
function Integrantes({members}) {
  const cuerdas = ["Soprano","Contralto","Tenor","Bajo","Admin"];
  // Agrupar por cuerda, excluyendo Admin de las voces
  const grupos = cuerdas.filter(c=>c!=="Admin").map(c=>({cuerda:c, lista:members.filter(m=>m.cuerda===c&&m.activo!==false)})).filter(g=>g.lista.length>0);
  const admins = members.filter(m=>m.cuerda==="Admin");
  return (
    <div style={{maxWidth:1000}}>
      <SectionTitle title="Integrantes del Coro" subtitle={`${members.filter(m=>m.cuerda!=="Admin").length} voces · Familia MJ`}/>

      {/* Encargados */}
      {admins.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>⚙ Encargados del Coro</div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            {admins.map(m=>{
              const cc=CUERDAS["Admin"];
              return (
                <Card key={m.id} hover style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",flex:"0 1 340px",border:`1px solid ${cc}20`,background:`linear-gradient(135deg,#f9fafb,#fff)`}}>
                  <div style={{width:56,height:56,borderRadius:"50%",flexShrink:0,background:cc,border:`3px solid ${cc}30`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18,fontWeight:700}}>
                    {m.foto_url?<img src={m.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:ini(m.nombre)}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:700,color:C.dark,marginBottom:3}}>{m.nombre}</div>
                    <Chip label="Encargado de Coro" color={cc}/>
                    {m.cumpleanos&&<div style={{fontSize:11,color:C.gray,marginTop:6}}>🎂 {m.cumpleanos}</div>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Voces agrupadas */}
      {grupos.map(({cuerda,lista})=>{
        const cc=CUERDAS[cuerda];
        return (
          <div key={cuerda} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:cc,flexShrink:0}}/>
              <div style={{fontSize:11,fontWeight:700,color:cc,letterSpacing:"0.08em",textTransform:"uppercase"}}>{cuerda}s — {lista.length} {lista.length===1?"voz":"voces"}</div>
            </div>
            <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {lista.map(m=>(
                <Card key={m.id} hover style={{padding:0,overflow:"hidden",border:`1px solid ${cc}20`}}>
                  {/* Foto grande arriba */}
                  <div style={{width:"100%",height:120,background:m.foto_url?`url(${m.foto_url}) center/cover no-repeat`:cc,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                    {!m.foto_url&&<span style={{fontSize:36,fontWeight:700,color:"white",opacity:0.9}}>{ini(m.nombre)}</span>}
                    <div style={{position:"absolute",bottom:0,left:0,right:0,height:40,background:"linear-gradient(to top,rgba(0,0,0,0.35),transparent)"}}/>
                  </div>
                  {/* Info abajo */}
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:13,fontWeight:700,color:C.dark,marginBottom:5}}>{m.nombre}</div>
                    <Chip label={cuerda} color={cc}/>
                    {m.cumpleanos&&<div style={{fontSize:11,color:C.gray,marginTop:7}}>🎂 {m.cumpleanos}</div>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
      {members.length===0&&<p style={{color:C.gray,textAlign:"center",padding:"40px 0"}}>No hay integrantes registrados aún.</p>}
    </div>
  );
}

// ══════════════════════════════════════════
//  SECCIONES ESTÁTICAS
// ══════════════════════════════════════════
function Biblioteca({biblioteca, onReload, user}) {
  const librosDefault=[
    {id:"d1",titulo:"Catecismo de la Iglesia Católica",autor:"Vaticano",year:"1992",emoji:"📕",url:"https://www.vatican.va/archive/catechism_sp/index_sp.html"},
    {id:"d2",titulo:"Sacrosanctum Concilium",autor:"Concilio Vaticano II",year:"1963",emoji:"📗",url:"https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19631204_sacrosanctum-concilium_sp.html"},
    {id:"d3",titulo:"Musicam Sacram",autor:"Santa Sede",year:"1967",emoji:"📘",url:"https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_19670305_musicam-sacram_sp.html"},
    {id:"d4",titulo:"Spiritus et Sponsa",autor:"Juan Pablo II",year:"2003",emoji:"📙",url:"https://www.vatican.va/content/john-paul-ii/es/apostolic_letters/2003/documents/hf_jp-ii_apl_20031204_spiritus-et-sponsa.html"},
  ];
  const todos = [...librosDefault, ...(biblioteca||[])];
  const emojis=["📕","📗","📘","📙","📓","📔","📒","📃"];
  return (
    <div style={{maxWidth:900}}>
      <SectionTitle title="Biblioteca Católica" subtitle="Textos del Magisterio"/>
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {todos.map((l,i)=>(
          <Card key={l.id||i} hover style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{fontSize:36,flexShrink:0}}>{l.emoji||emojis[i%emojis.length]}</div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.dark,marginBottom:4}}>{l.titulo}</div>
              <div style={{fontSize:12,color:C.gray,marginBottom:10}}>{l.autor} · {l.year||l.anio}</div>
              <a href={l.url} target="_blank" rel="noopener"><Btn variant="ghost" style={{fontSize:11,padding:"5px 10px"}}>🔗 Leer</Btn></a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Musica() {
  return (
    <div style={{maxWidth:700}}>
      <SectionTitle title="Música del Coro" subtitle="Playlist oficial en Spotify"/>
      <Card style={{padding:0,overflow:"hidden"}}>
        <iframe
          src="https://open.spotify.com/embed/playlist/3ssNSNlljyYlw2La83mXZE?utm_source=generator&theme=0"
          width="100%"
          height="500"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{display:"block",borderRadius:14}}
          title="Playlist Coro MJ"
        />
      </Card>
      <div style={{marginTop:12,textAlign:"center"}}>
        <a href="https://open.spotify.com/playlist/3ssNSNlljyYlw2La83mXZE" target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 24px",background:"#1DB954",borderRadius:30,color:"white",fontSize:13,fontWeight:600}}>
          ▶ Abrir en Spotify
        </a>
      </div>
    </div>
  );
}

function Fotos() {
  return (
    <div>
      <SectionTitle title="Galería de Fotos" subtitle="Momentos del Coro MJ" action={<Btn>📷 Subir</Btn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {Array.from({length:6},(_,i)=>(
          <div key={i} style={{aspectRatio:"4/3",background:`linear-gradient(135deg,${C.primaryLight},${C.goldLight})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`,cursor:"pointer"}}>
            <div style={{textAlign:"center",color:C.gray}}><div style={{fontSize:26,marginBottom:4}}>🖼️</div><div style={{fontSize:11}}>Foto {i+1}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Podcast({podcasts, onReload, user}) {
  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Podcast del Coro" subtitle="Reflexiones y formación"/>
      {(!podcasts||podcasts.length===0) ? (
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:50,marginBottom:14}}>🎙️</div>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:600,color:C.dark,marginBottom:8}}>Próximamente</div>
          <p style={{color:C.gray,fontSize:13}}>Los episodios del podcast aparecerán aquí.</p>
        </Card>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {podcasts.map(p=>(
            <Card key={p.id} hover style={{display:"flex",gap:14,alignItems:"flex-start"}}>
              <div style={{width:56,height:56,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🎙️</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:C.dark,marginBottom:4}}>{p.titulo}</div>
                {p.descripcion&&<p style={{fontSize:12,color:C.gray,marginBottom:8,lineHeight:1.5}}>{p.descripcion}</p>}
                <div style={{fontSize:11,color:C.gray,marginBottom:10}}>{p.autor&&`👤 ${p.autor} · `}{new Date(p.created_at).toLocaleDateString("es-CL")}</div>
                {p.url&&(
                  <a href={p.url} target="_blank" rel="noopener">
                    <Btn variant="ghost" style={{fontSize:11,padding:"5px 12px"}}>▶ Escuchar</Btn>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Videos() {
  return (
    <div style={{maxWidth:800}}>
      <SectionTitle title="Videos" subtitle="Grabaciones de misas y conciertos"/>
      <Card style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:50,marginBottom:14}}>📹</div>
        <div style={{fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:600,color:C.dark,marginBottom:8}}>Próximamente</div>
        <p style={{color:C.gray,fontSize:13}}>Los videos del coro aparecerán aquí.</p>
      </Card>
    </div>
  );
}

function Cancionero() {
  return (
    <div style={{maxWidth:700}}>
      <SectionTitle title="Cancionero" subtitle="Acceso al repertorio completo"/>
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[{titulo:"Cancionero Digital",desc:"Letras, acordes e interactivo en línea",emoji:"🌐",color:C.primary,label:"Abrir ahora",href:"#"},{titulo:"Cancionero PDF",desc:"Versión completa para imprimir",emoji:"📄",color:C.danger,label:"Ver PDF",href:"https://drive.google.com/file/d/1reZwCTC6mMJM2Rb1gEnUtYFkmNxijO0e/view?usp=drive_link"}].map((c,i)=>(
          <Card key={i} style={{textAlign:"center",padding:24}}>
            <div style={{fontSize:44,marginBottom:12}}>{c.emoji}</div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:600,color:C.dark,marginBottom:8}}>{c.titulo}</div>
            <p style={{fontSize:12,color:C.gray,marginBottom:18,lineHeight:1.6}}>{c.desc}</p>
            <a href={c.href} target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 20px",background:c.color,borderRadius:8,color:"white",fontSize:13,fontWeight:600}}>{c.label}</a>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  ADMINISTRACIÓN
// ══════════════════════════════════════════
const ADMIN_TABS = [
  { id:"integrantes", label:"👥 Integrantes" },
  { id:"documentos",  label:"📄 Documentos" },
  { id:"oraciones",   label:"✦ Oraciones" },
  { id:"noticias",    label:"📢 Avisos" },
  { id:"preguntas",   label:"❓ Preguntas" },
  { id:"links",       label:"🔗 Links" },
  { id:"biblioteca",  label:"📚 Biblioteca" },
  { id:"podcasts",    label:"🎙️ Podcast" },
  { id:"pautas",      label:"🎼 Pautas Misa" },
];

function AdminTab({label, active, onClick}) {
  return (
    <button onClick={onClick} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:active?600:400,background:active?C.primary:"transparent",color:active?"white":C.gray,transition:"all 0.15s",whiteSpace:"nowrap"}}>
      {label}
    </button>
  );
}

function ConfirmBtn({onConfirm, label="🗑 Eliminar"}) {
  const [ask, setAsk] = useState(false);
  if(ask) return (
    <span style={{display:"inline-flex",gap:6}}>
      <button onClick={()=>{ onConfirm(); setAsk(false); }} style={{padding:"4px 10px",fontSize:11,background:C.danger,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>Confirmar</button>
      <button onClick={()=>setAsk(false)} style={{padding:"4px 10px",fontSize:11,background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer"}}>No</button>
    </span>
  );
  return <button onClick={()=>setAsk(true)} style={{padding:"4px 10px",fontSize:11,background:"#fee2e2",color:C.danger,border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>{label}</button>;
}

async function deleteRecord(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:"DELETE",
    headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken || SUPABASE_KEY}`, "Content-Type":"application/json" }
  });
  if(!res.ok) throw new Error(await res.text());
}

async function updateRecord(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:"PATCH",
    headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken || SUPABASE_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
}

function AdminIntegrantes({members, onReload}) {
  const [form, setForm] = useState({nombre:"",email:"",cuerda:"Soprano",cumpleanos:"",foto_url:""});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [roleLoading, setRoleLoading] = useState(null);

  async function submit() {
    if(!form.nombre||!form.email) return;
    setSaving(true);
    try {
      await supabase("integrantes",{method:"POST",body:form});
      setForm({nombre:"",email:"",cuerda:"Soprano",cumpleanos:"",foto_url:""});
      setShowForm(false); onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function saveEdit(id) {
    setSaving(true);
    try { await updateRecord("integrantes", id, editData); setEditId(null); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("integrantes", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  async function toggleAdmin(m) {
    setRoleLoading(m.id);
    const newCuerda = m.cuerda === "Admin" ? "Soprano" : "Admin";
    try { await updateRecord("integrantes", m.id, { cuerda: newCuerda }); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setRoleLoading(null);
  }

  const inputS = {padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",width:"100%",boxSizing:"border-box"};

  const admins = members.filter(m=>m.cuerda==="Admin");
  const integrantes = members.filter(m=>m.cuerda!=="Admin");

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{members.length} integrantes registrados · {admins.length} admin{admins.length!==1?"s":""}</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Nuevo integrante</Btn>
      </div>

      {/* Sección Administradores */}
      {admins.length>0&&(
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:700,color:C.gray,letterSpacing:"0.05em",marginBottom:8,textTransform:"uppercase"}}>⚙ Administradores ({admins.length})</div>
          {admins.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f0fdf4",borderRadius:10,border:`1px solid ${C.primary}30`,marginBottom:6,flexWrap:"wrap"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:CUERDAS["Admin"],display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:11,fontWeight:700,flexShrink:0}}>{ini(m.nombre||"A")}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{m.nombre}</div>
                <div style={{fontSize:11,color:C.gray}}>{m.email}</div>
              </div>
              <Chip label="Encargado de Coro" color={CUERDAS["Admin"]}/>
              <button onClick={()=>toggleAdmin(m)} disabled={roleLoading===m.id} style={{padding:"4px 10px",fontSize:11,background:"#fee2e2",color:"#b91c1c",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontWeight:500,flexShrink:0}}>
                {roleLoading===m.id?"...":"↓ Quitar Admin"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>Nuevo integrante</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <input placeholder="Nombre completo *" value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} style={inputS}/>
            <input placeholder="Email *" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={inputS}/>
            <select value={form.cuerda} onChange={e=>setForm(p=>({...p,cuerda:e.target.value}))} style={inputS}>
              {["Soprano","Contralto","Tenor","Bajo","Admin"].map(c=><option key={c}>{c}</option>)}
            </select>
            <input placeholder="Cumpleaños (DD/MM)" value={form.cumpleanos} onChange={e=>setForm(p=>({...p,cumpleanos:e.target.value}))} style={inputS}/>
            <input placeholder="URL foto (opcional)" value={form.foto_url} onChange={e=>setForm(p=>({...p,foto_url:e.target.value}))} style={{...inputS,gridColumn:"1 / -1"}}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}

      {/* Tabla integrantes normales */}
      <div style={{fontSize:12,fontWeight:700,color:C.gray,letterSpacing:"0.05em",marginBottom:8,textTransform:"uppercase"}}>◎ Integrantes ({integrantes.length})</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:C.light}}>
              {["Nombre","Email","Cuerda","Cumpleaños","Activo","Acciones"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:C.gray,fontSize:11,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {integrantes.map(m=>(
              <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}>
                {editId===m.id ? (
                  <>
                    <td style={{padding:"8px 12px"}}><input value={editData.nombre||""} onChange={e=>setEditData(p=>({...p,nombre:e.target.value}))} style={inputS}/></td>
                    <td style={{padding:"8px 12px"}}><input value={editData.email||""} onChange={e=>setEditData(p=>({...p,email:e.target.value}))} style={inputS}/></td>
                    <td style={{padding:"8px 12px"}}>
                      <select value={editData.cuerda||"Soprano"} onChange={e=>setEditData(p=>({...p,cuerda:e.target.value}))} style={inputS}>
                        {["Soprano","Contralto","Tenor","Bajo"].map(c=><option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"8px 12px"}}><input value={editData.cumpleanos||""} onChange={e=>setEditData(p=>({...p,cumpleanos:e.target.value}))} style={inputS}/></td>
                    <td style={{padding:"8px 12px"}}><input type="checkbox" checked={editData.activo!==undefined?editData.activo:m.activo} onChange={e=>setEditData(p=>({...p,activo:e.target.checked}))}/></td>
                    <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-flex",gap:6}}>
                        <button onClick={()=>saveEdit(m.id)} disabled={saving} style={{padding:"4px 10px",fontSize:11,background:C.primary,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>✓ Guardar</button>
                        <button onClick={()=>setEditId(null)} style={{padding:"4px 10px",fontSize:11,background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer"}}>Cancelar</button>
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{padding:"10px 12px",fontWeight:500,color:C.dark}}>{m.nombre}</td>
                    <td style={{padding:"10px 12px",color:C.gray}}>{m.email}</td>
                    <td style={{padding:"10px 12px"}}><Chip label={rolLabel(m.cuerda)} color={CUERDAS[m.cuerda]||C.gray}/></td>
                    <td style={{padding:"10px 12px",color:C.gray}}>{m.cumpleanos||"-"}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:14}}>{m.activo?"✅":"⬜"}</span></td>
                    <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-flex",gap:6,flexWrap:"wrap"}}>
                        <button onClick={()=>{ setEditId(m.id); setEditData({...m}); }} style={{padding:"4px 10px",fontSize:11,background:C.primaryLight,color:C.primaryDark,border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>✏ Editar</button>
                        <button onClick={()=>toggleAdmin(m)} disabled={roleLoading===m.id} style={{padding:"4px 10px",fontSize:11,background:"#fdf8ee",color:C.gold,border:`1px solid ${C.gold}50`,borderRadius:6,cursor:"pointer",fontWeight:500}}>
                          {roleLoading===m.id?"...":"⚙ Hacer Admin"}
                        </button>
                        <ConfirmBtn onConfirm={()=>del(m.id)}/>
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminEventos({eventos, onReload}) {
  const [form, setForm] = useState({titulo:"",fecha:"",hora:"",lugar:"",tipo:"ensayo",descripcion:""});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputS = {padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",boxSizing:"border-box"};

  async function submit() {
    if(!form.titulo||!form.fecha) return;
    setSaving(true);
    try { await supabase("eventos",{method:"POST",body:form}); setForm({titulo:"",fecha:"",hora:"",lugar:"",tipo:"ensayo",descripcion:""}); setShowForm(false); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("eventos", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  const tipoC={ensayo:C.primary,misa:C.gold,evento:C.purple};
  const tipoL={ensayo:"Ensayo",misa:"Misa",evento:"Evento"};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{eventos.length} eventos</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Nuevo evento</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>Nuevo evento</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <input placeholder="Título *" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} style={inputS}/>
            <input type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))} style={inputS}/>
            <input placeholder="Hora (19:00)" value={form.hora} onChange={e=>setForm(p=>({...p,hora:e.target.value}))} style={inputS}/>
            <input placeholder="Lugar" value={form.lugar} onChange={e=>setForm(p=>({...p,lugar:e.target.value}))} style={inputS}/>
            <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={inputS}>
              <option value="ensayo">Ensayo</option><option value="misa">Misa</option><option value="evento">Evento especial</option>
            </select>
            <input placeholder="Descripción (opcional)" value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} style={inputS}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {[...eventos].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(ev=>(
        <Card key={ev.id} style={{display:"flex",gap:12,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:46,height:46,background:tipoC[ev.tipo]+"18",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{fontSize:16,fontWeight:700,color:tipoC[ev.tipo],lineHeight:1}}>{new Date(ev.fecha+"T00:00:00").getDate()}</div>
            <div style={{fontSize:8,color:tipoC[ev.tipo],fontWeight:600}}>{new Date(ev.fecha+"T00:00:00").toLocaleDateString("es-CL",{month:"short"}).toUpperCase()}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{ev.titulo}</div>
            <div style={{fontSize:11,color:C.gray}}>🕐 {ev.hora} · 📍 {ev.lugar}</div>
          </div>
          <Badge color={tipoC[ev.tipo]}>{tipoL[ev.tipo]}</Badge>
          <ConfirmBtn onConfirm={()=>del(ev.id)}/>
        </Card>
      ))}
    </div>
  );
}

function AdminDocumentos({docs, onReload}) {
  const [form, setForm] = useState({nombre:"",url:"",categoria:"Repertorio",size:""});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputS = {padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",boxSizing:"border-box"};

  async function submit() {
    if(!form.nombre||!form.url) return;
    setSaving(true);
    try { await supabase("documentos",{method:"POST",body:form}); setForm({nombre:"",url:"",categoria:"Repertorio",size:""}); setShowForm(false); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("documentos", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{docs.length} documentos</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Nuevo documento</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <input placeholder="Nombre del archivo *" value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} style={{...inputS,width:"100%",marginBottom:10}}/>
          <input placeholder="URL del archivo *" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={{...inputS,width:"100%",marginBottom:10}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} style={inputS}>
              {["Repertorio","Partituras","Organización","Comunicados","Otro"].map(c=><option key={c}>{c}</option>)}
            </select>
            <input placeholder="Tamaño (ej: 2.3 MB)" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))} style={inputS}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {docs.map(d=>(
        <Card key={d.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:40,height:40,background:"#fee2e2",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📄</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nombre}</div>
            <div style={{fontSize:11,color:C.gray}}><Badge>{d.categoria}</Badge>{d.size?" · "+d.size:""}</div>
          </div>
          <a href={d.url} target="_blank" rel="noopener"><Btn variant="ghost" style={{fontSize:11,padding:"4px 10px"}}>🔗 Abrir</Btn></a>
          <ConfirmBtn onConfirm={()=>del(d.id)}/>
        </Card>
      ))}
    </div>
  );
}

function AdminOraciones({oraciones, onReload}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({titulo:"", texto:"", autor:""});
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandId, setExpandId] = useState(null);

  const inputS = {padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"Inter,sans-serif"};

  async function submit() {
    if(!form.titulo.trim()||!form.texto.trim()) { alert("El título y el texto son obligatorios."); return; }
    setSaving(true);
    try {
      await supabase("oraciones",{method:"POST",body:{titulo:form.titulo.trim(),texto:form.texto.trim(),autor:form.autor.trim()||"Anónimo"}});
      setForm({titulo:"",texto:"",autor:""});
      setShowForm(false);
      onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function saveEdit(id) {
    if(!editData.titulo?.trim()||!editData.texto?.trim()) return;
    setSavingEdit(true);
    try { await updateRecord("oraciones", id, {titulo:editData.titulo.trim(),texto:editData.texto.trim(),autor:editData.autor?.trim()||"Anónimo"}); setEditId(null); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSavingEdit(false);
  }

  async function del(id) {
    try { await deleteRecord("oraciones", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{oraciones.length} oraciones publicadas</span>
        <Btn onClick={()=>{setShowForm(p=>!p);setEditId(null);}}>✦ Nueva oración</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:16,border:`2px solid ${C.gold}50`,background:"#fefdf8"}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.gold,marginBottom:14}}>✦ Nueva Oración</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>TÍTULO (aparece en negrita) *</div>
            <input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ej: Oración antes del ensayo" style={{...inputS,fontWeight:600}}/>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>TEXTO DE LA ORACIÓN *</div>
            <textarea value={form.texto} onChange={e=>setForm(p=>({...p,texto:e.target.value}))} placeholder="Escribe aquí el texto completo de la oración..." rows={6} style={{...inputS,resize:"vertical",lineHeight:1.8}}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>AUTOR / FUENTE</div>
            <input value={form.autor} onChange={e=>setForm(p=>({...p,autor:e.target.value}))} placeholder="Ej: San Agustín, Liturgia de las Horas..." style={inputS}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"✓ Publicar oración"}</Btn>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {oraciones.length===0&&!showForm&&(
        <div style={{textAlign:"center",padding:"32px 0",color:C.gray}}>
          <div style={{fontSize:32,marginBottom:8}}>✦</div>
          <div style={{fontSize:13}}>No hay oraciones publicadas aún.</div>
          <div style={{fontSize:12,marginTop:4}}>Haz clic en "Nueva oración" para agregar la primera.</div>
        </div>
      )}

      {oraciones.map(o=>(
        <Card key={o.id} style={{marginBottom:12,borderLeft:`4px solid ${C.gold}`}}>
          {editId===o.id ? (
            <div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:12,fontWeight:600,color:C.gold,marginBottom:10}}>✏ Editando oración</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>TÍTULO *</div>
                <input value={editData.titulo||""} onChange={e=>setEditData(p=>({...p,titulo:e.target.value}))} style={{...inputS,fontWeight:600}}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>TEXTO *</div>
                <textarea value={editData.texto||""} onChange={e=>setEditData(p=>({...p,texto:e.target.value}))} rows={6} style={{...inputS,resize:"vertical",lineHeight:1.8}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:C.gray,marginBottom:4}}>AUTOR</div>
                <input value={editData.autor||""} onChange={e=>setEditData(p=>({...p,autor:e.target.value}))} style={inputS}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>saveEdit(o.id)} disabled={savingEdit} style={{padding:"7px 14px",background:C.primary,color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600}}>{savingEdit?"Guardando...":"✓ Guardar cambios"}</button>
                <button onClick={()=>setEditId(null)} style={{padding:"7px 14px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",fontSize:12}}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:700,color:C.dark}}>✦ {o.titulo}</div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>{setEditId(o.id);setEditData({titulo:o.titulo,texto:o.texto,autor:o.autor});setShowForm(false);}} style={{padding:"4px 10px",fontSize:11,background:C.primaryLight,color:C.primaryDark,border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>✏ Editar</button>
                  <ConfirmBtn onConfirm={()=>del(o.id)}/>
                </div>
              </div>
              <p style={{fontSize:13,color:"#374151",lineHeight:1.8,margin:"0 0 10px",whiteSpace:"pre-wrap",
                ...(expandId!==o.id?{overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}:{})}}>
                {o.texto}
              </p>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                <div style={{fontSize:11,color:C.gray}}>👤 <strong>{o.autor||"Anónimo"}</strong> · {new Date(o.created_at).toLocaleDateString("es-CL")}</div>
                <button onClick={()=>setExpandId(expandId===o.id?null:o.id)} style={{fontSize:11,background:"none",border:"none",color:C.primary,cursor:"pointer",textDecoration:"underline",padding:0}}>
                  {expandId===o.id?"Ver menos ▲":"Ver texto completo ▼"}
                </button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function AdminNoticias({noticias, onReload}) {
  const [form, setForm] = useState({titulo:"",fuente:"",url:"",descripcion:"",imagen_url:""});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const imgRef = useRef(null);
  const inputS = {padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",boxSizing:"border-box"};

  async function handleImageUpload(file) {
    if(!file) return;
    if(file.size > 5*1024*1024) { alert("La imagen no puede superar 5 MB."); return; }
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `aviso_${Date.now()}.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avisos/${path}`, {
        method:"POST",
        headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken}`, "Content-Type":file.type, "x-upsert":"true" },
        body: file,
      });
      if(!res.ok) throw new Error(await res.text());
      const imagen_url = `${SUPABASE_URL}/storage/v1/object/public/avisos/${path}`;
      setForm(p=>({...p,imagen_url}));
      setImgPreview(URL.createObjectURL(file));
    } catch(e){ alert("Error subiendo imagen: "+e.message); }
    setUploadingImg(false);
  }

  async function submit() {
    if(!form.titulo) return;
    setSaving(true);
    try {
      await supabase("noticias",{method:"POST",body:{
        titulo:form.titulo,
        fuente:form.fuente,
        url:form.url,
        descripcion:form.descripcion,
        imagen_url:form.imagen_url,
      }});
      setForm({titulo:"",fuente:"",url:"",descripcion:"",imagen_url:""});
      setImgPreview(null);
      setShowForm(false);
      onReload();
    } catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("noticias", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{noticias.length} avisos publicados</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Nuevo aviso</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>📢 Nuevo aviso del coro</div>

          {/* Título */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Título *</div>
            <input placeholder="Ej: Ensayo extra este sábado" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} style={{...inputS,width:"100%"}}/>
          </div>

          {/* Descripción */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Descripción (opcional)</div>
            <textarea placeholder="Detalles del aviso..." value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} rows={3}
              style={{...inputS,width:"100%",resize:"vertical",fontFamily:"Inter,sans-serif",lineHeight:1.6}}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Categoría</div>
              <input placeholder="Ej: Ensayo, Misa, General" value={form.fuente} onChange={e=>setForm(p=>({...p,fuente:e.target.value}))} style={{...inputS,width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>URL (enlace externo)</div>
              <input placeholder="https://..." value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={{...inputS,width:"100%"}}/>
            </div>
          </div>

          {/* Subida de imagen / afiche */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.gray,marginBottom:6}}>🖼️ Afiche o imagen (opcional, máx. 5 MB)</div>
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0])}/>
            {imgPreview ? (
              <div style={{position:"relative",display:"inline-block"}}>
                <img src={imgPreview} alt="Preview" style={{width:200,height:120,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,display:"block"}}/>
                <button onClick={()=>{setImgPreview(null);setForm(p=>({...p,imagen_url:""}));}} style={{position:"absolute",top:4,right:4,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"white",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>×</button>
              </div>
            ) : (
              <button onClick={()=>imgRef.current?.click()} disabled={uploadingImg} style={{padding:"8px 16px",borderRadius:8,border:`1px dashed ${C.border}`,background:"white",cursor:"pointer",fontSize:12,color:C.gray,display:"flex",alignItems:"center",gap:8}}>
                {uploadingImg?"⏳ Subiendo...":"📷 Subir afiche / imagen"}
              </button>
            )}
            {form.imagen_url&&!imgPreview&&<div style={{fontSize:11,color:C.primary,marginTop:4}}>✅ Imagen guardada</div>}
          </div>

          <div style={{display:"flex",gap:8}}>
            <Btn onClick={submit} disabled={saving||uploadingImg}>{saving?"Guardando...":"Publicar aviso"}</Btn>
            <Btn variant="ghost" onClick={()=>{setShowForm(false);setImgPreview(null);setForm({titulo:"",fuente:"",url:"",descripcion:"",imagen_url:""});}}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {noticias.map(n=>(
        <Card key={n.id} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10,flexWrap:"wrap"}}>
          {n.imagen_url&&(
            <img src={n.imagen_url} alt="" style={{width:70,height:50,objectFit:"cover",borderRadius:8,flexShrink:0,border:`1px solid ${C.border}`}}/>
          )}
          {!n.imagen_url&&(
            <div style={{width:44,height:44,background:C.primaryLight,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📢</div>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{n.titulo}</div>
            {n.descripcion&&<div style={{fontSize:11,color:C.gray,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:300}}>{n.descripcion}</div>}
            <div style={{fontSize:11,color:C.gray,marginTop:3,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {n.fuente&&<Badge>{n.fuente}</Badge>}
              {n.imagen_url&&<Badge color={C.purple}>🖼️ Con imagen</Badge>}
              <span>{new Date(n.created_at).toLocaleDateString("es-CL")}</span>
            </div>
          </div>
          <ConfirmBtn onConfirm={()=>del(n.id)}/>
        </Card>
      ))}

      {noticias.length===0&&!showForm&&(
        <div style={{textAlign:"center",padding:"32px 0",color:C.gray}}>
          <div style={{fontSize:32,marginBottom:8}}>📢</div>
          <div style={{fontSize:13}}>No hay avisos publicados.</div>
        </div>
      )}

      <div style={{marginTop:16,padding:"12px 14px",background:C.goldLight,borderRadius:8,border:`1px solid ${C.gold}30`,fontSize:11,color:C.gray,lineHeight:1.7}}>
        💡 <strong>Tabla requerida en Supabase:</strong><br/>
        <code style={{display:"block",marginTop:6,fontFamily:"monospace",fontSize:10,background:"#f3f4f6",padding:"6px 10px",borderRadius:6,color:C.dark}}>
          alter table noticias add column if not exists descripcion text;<br/>
          alter table noticias add column if not exists imagen_url text;<br/>
          -- Bucket de Storage (público):<br/>
          -- Panel Supabase → Storage → New bucket → nombre: "avisos" → Public: ON
        </code>
      </div>
    </div>
  );
}

function AdminPreguntas({preguntas, onReload}) {
  const [respId, setRespId] = useState(null);
  const [respText, setRespText] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveResp(id) {
    if(!respText.trim()) return;
    setSaving(true);
    try { await updateRecord("preguntas", id, {respuesta: respText}); setRespId(null); setRespText(""); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("preguntas", id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{fontSize:13,color:C.gray,marginBottom:14}}>{preguntas.length} preguntas · {preguntas.filter(p=>!p.respuesta).length} sin responder</div>
      {preguntas.map(q=>(
        <Card key={q.id} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.dark,marginBottom:4}}>❓ {q.pregunta}</div>
              <div style={{fontSize:11,color:C.gray}}>{q.autor} · {new Date(q.created_at).toLocaleDateString("es-CL")}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {!q.respuesta && <button onClick={()=>{ setRespId(q.id); setRespText(""); }} style={{padding:"4px 10px",fontSize:11,background:C.primaryLight,color:C.primaryDark,border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>✏ Responder</button>}
              <ConfirmBtn onConfirm={()=>del(q.id)}/>
            </div>
          </div>
          {q.respuesta&&(
            <div style={{background:C.primaryLight,borderRadius:8,padding:"10px 14px",display:"flex",gap:8}}>
              <span>✅</span>
              <div>
                <p style={{margin:"0 0 4px",fontSize:13,color:C.primaryDark,lineHeight:1.6}}>{q.respuesta}</p>
                <button onClick={()=>{ setRespId(q.id); setRespText(q.respuesta); }} style={{fontSize:11,background:"none",border:"none",color:C.primaryDark,cursor:"pointer",textDecoration:"underline",padding:0}}>Editar respuesta</button>
              </div>
            </div>
          )}
          {respId===q.id&&(
            <div style={{marginTop:10}}>
              <textarea value={respText} onChange={e=>setRespText(e.target.value)} placeholder="Escribe la respuesta..." rows={3} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:"Inter,sans-serif",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>saveResp(q.id)} disabled={saving} style={{padding:"7px 14px",background:C.primary,color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600}}>{saving?"Guardando...":"Guardar respuesta"}</button>
                <button onClick={()=>setRespId(null)} style={{padding:"7px 14px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",fontSize:12}}>Cancelar</button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function AdminLinks({links, onReload}) {
  const [form, setForm] = useState({label:"",url:"",orden:links.length+1});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const inputS = {padding:"8px 12px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  async function submit() {
    if(!form.label.trim()) { alert("La etiqueta es obligatoria."); return; }
    const urlFinal = form.url.trim() || "#";
    setSaving(true);
    try {
      await supabase("links",{method:"POST",body:{label:form.label.trim(), url:urlFinal, orden:form.orden||links.length+1}});
      setForm({label:"",url:"",orden:links.length+2});
      setShowForm(false);
      onReload();
    } catch(e){ alert("Error al guardar link: "+e.message); }
    setSaving(false);
  }

  async function saveEdit(id) {
    if(!editData.label) { alert("La etiqueta es obligatoria."); return; }
    if(!editData.url || editData.url.trim()==="") { alert("La URL es obligatoria."); return; }
    setSavingEdit(true);
    try {
      // Intentar PATCH primero
      const res = await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${id}`, {
        method:"PATCH",
        headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken||SUPABASE_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" },
        body: JSON.stringify({label:editData.label.trim(), url:editData.url.trim(), orden:editData.orden||0})
      });
      if(!res.ok) {
        // Si PATCH falla (sin política UPDATE), hacer delete + insert
        const errText = await res.text();
        if(errText.includes("policy") || errText.includes("42501") || !res.ok) {
          await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${id}`, {
            method:"DELETE",
            headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken||SUPABASE_KEY}` }
          });
          await fetch(`${SUPABASE_URL}/rest/v1/links`, {
            method:"POST",
            headers:{ "apikey":SUPABASE_KEY, "Authorization":`Bearer ${_authToken||SUPABASE_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" },
            body: JSON.stringify({label:editData.label.trim(), url:editData.url.trim(), orden:editData.orden||0})
          });
        } else {
          throw new Error(errText);
        }
      }
      setEditId(null);
      onReload();
    } catch(e){ alert("Error al guardar: "+e.message); }
    setSavingEdit(false);
  }

  async function del(id) {
    try { await deleteRecord("links",id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{links.length} links en el inicio</span>
        <Btn onClick={()=>{setShowForm(p=>!p);setEditId(null);}}>+ Nuevo link</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:13,fontWeight:600,color:C.dark,marginBottom:12}}>➕ Nuevo link de acceso rápido</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Etiqueta (puedes incluir emoji)</div>
              <input placeholder="ej: 📸 Instagram" value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} style={inputS}/>
            </div>
            <div>
              <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Orden</div>
              <input type="number" min="1" value={form.orden} onChange={e=>setForm(p=>({...p,orden:+e.target.value}))} style={inputS}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.gray,marginBottom:4}}>URL completa *</div>
            <input placeholder="https://..." value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={inputS}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar link"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}

      {links.map(l=>(
        <Card key={l.id} style={{marginBottom:10,border: editId===l.id?`1px solid ${C.primary}60`:`1px solid ${C.border}`}}>
          {editId===l.id ? (
            <div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:12,fontWeight:600,color:C.primaryDark,marginBottom:10}}>✏ Editando link</div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Etiqueta</div>
                  <input value={editData.label||""} onChange={e=>setEditData(p=>({...p,label:e.target.value}))} placeholder="ej: 📸 Instagram" style={inputS}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Orden</div>
                  <input type="number" min="1" value={editData.orden||0} onChange={e=>setEditData(p=>({...p,orden:+e.target.value}))} style={inputS}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.gray,marginBottom:4}}>URL</div>
                <input value={editData.url||""} onChange={e=>setEditData(p=>({...p,url:e.target.value}))} placeholder="https://..." style={inputS}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>saveEdit(l.id)} disabled={savingEdit} style={{padding:"7px 14px",background:C.primary,color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600}}>{savingEdit?"Guardando...":"✓ Guardar cambios"}</button>
                <button onClick={()=>setEditId(null)} style={{padding:"7px 14px",background:C.light,color:C.gray,border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",fontSize:12}}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{width:36,height:36,borderRadius:8,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {l.label?.match(/^\p{Emoji}/u)?.[0] || "🔗"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{l.label}</div>
                <div style={{fontSize:11,color: l.url==="# "||l.url==="#"?C.danger:C.primary,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {l.url==="# "||l.url==="#" ? "⚠️ Sin URL — haz clic en Editar" : l.url}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>{setEditId(l.id);setEditData({label:l.label,url:l.url,orden:l.orden});setShowForm(false);}} style={{padding:"5px 12px",fontSize:12,background:C.primaryLight,color:C.primaryDark,border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>✏ Editar</button>
                <ConfirmBtn onConfirm={()=>del(l.id)}/>
              </div>
            </div>
          )}
        </Card>
      ))}
      {links.length===0&&<p style={{color:C.gray,fontSize:13,textAlign:"center",padding:"20px 0"}}>No hay links. Agrega uno con el botón de arriba.</p>}
    </div>
  );
}

function AdminBiblioteca({biblioteca, onReload}) {
  const [form, setForm] = useState({titulo:"",autor:"",anio:"",url:"",emoji:"📘"});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputS = {padding:"8px 12px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};
  const emojis=["📕","📗","📘","📙","📓","📔","📒","📃","📜"];

  async function submit() {
    if(!form.titulo||!form.url) return;
    setSaving(true);
    try { await supabase("biblioteca",{method:"POST",body:form}); setForm({titulo:"",autor:"",anio:"",url:"",emoji:"📘"}); setShowForm(false); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("biblioteca",id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{biblioteca.length} documentos propios</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Agregar documento</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
            <input placeholder="Título del documento *" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} style={inputS}/>
            <select value={form.emoji} onChange={e=>setForm(p=>({...p,emoji:e.target.value}))} style={inputS}>
              {emojis.map(em=><option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <input placeholder="Autor / Institución" value={form.autor} onChange={e=>setForm(p=>({...p,autor:e.target.value}))} style={inputS}/>
            <input placeholder="Año (ej: 2024)" value={form.anio} onChange={e=>setForm(p=>({...p,anio:e.target.value}))} style={inputS}/>
          </div>
          <input placeholder="URL (Google Drive, Vatican, PDF...) *" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={{...inputS,marginBottom:12}}/>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {biblioteca.map(b=>(
        <Card key={b.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
          <span style={{fontSize:28,flexShrink:0}}>{b.emoji||"📘"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{b.titulo}</div>
            <div style={{fontSize:11,color:C.gray,marginTop:2}}>{b.autor}{b.anio?` · ${b.anio}`:""}</div>
          </div>
          <a href={b.url} target="_blank" rel="noopener"><Btn variant="ghost" style={{fontSize:11,padding:"5px 10px"}}>🔗 Ver</Btn></a>
          <ConfirmBtn onConfirm={()=>del(b.id)}/>
        </Card>
      ))}
      {biblioteca.length===0&&<p style={{color:C.gray,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin documentos propios aún. Los libros del Magisterio siempre se muestran.</p>}
    </div>
  );
}

function AdminPodcasts({podcasts, onReload}) {
  const [form, setForm] = useState({titulo:"",descripcion:"",url:"",autor:""});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputS = {padding:"8px 12px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  async function submit() {
    if(!form.titulo) return;
    setSaving(true);
    try { await supabase("podcasts",{method:"POST",body:form}); setForm({titulo:"",descripcion:"",url:"",autor:""}); setShowForm(false); onReload(); }
    catch(e){ alert("Error: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await deleteRecord("podcasts",id); onReload(); }
    catch(e){ alert("Error: "+e.message); }
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:C.gray}}>{podcasts.length} episodios</span>
        <Btn onClick={()=>setShowForm(p=>!p)}>+ Nuevo episodio</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.primary}40`,background:C.primaryLight}}>
          <input placeholder="Título del episodio *" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} style={{...inputS,marginBottom:10}}/>
          <textarea placeholder="Descripción breve" value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} rows={2} style={{...inputS,resize:"vertical",fontFamily:"Inter,sans-serif",marginBottom:10}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <input placeholder="Autor / Narrador" value={form.autor} onChange={e=>setForm(p=>({...p,autor:e.target.value}))} style={inputS}/>
            <input placeholder="URL (Spotify, SoundCloud, Drive...)" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} style={inputS}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={submit} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
        </Card>
      )}
      {podcasts.map(p=>(
        <Card key={p.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:44,height:44,borderRadius:10,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🎙️</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{p.titulo}</div>
            <div style={{fontSize:11,color:C.gray,marginTop:2}}>{p.autor&&`${p.autor} · `}{new Date(p.created_at).toLocaleDateString("es-CL")}</div>
          </div>
          {p.url&&<a href={p.url} target="_blank" rel="noopener"><Btn variant="ghost" style={{fontSize:11,padding:"5px 10px"}}>▶ Ver</Btn></a>}
          <ConfirmBtn onConfirm={()=>del(p.id)}/>
        </Card>
      ))}
      {podcasts.length===0&&<p style={{color:C.gray,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin episodios aún.</p>}
    </div>
  );
}

// ══════════════════════════════════════════
//  PAUTA DE MISA
// ══════════════════════════════════════════

const ORDEN_LITURGICO_OPTIONS = [
  "Entrada","Perdón (Kyrie)","Gloria","Salmos Responsoriales","Salmo",
  "Aclamación Evangelio","Proclamación Evangelio","Ofertorio","Santo",
  "Cordero de Dios","Comunión","Comunión Espiritual","Canto Final",
  "Acción de Gracias","Otro"
];

const TIPO_CELEBRACION_OPTIONS = [
  "Misa Dominical","Misa de Sábado","Misa Ferial","Misa de Vigilia",
  "Misa de Fiesta","Misa de Exequias","Misa de Matrimonio","Misa de Primera Comunión",
  "Misa de Confirmación","Misa del Crisma","Misa de Navidad","Misa de Pascua",
  "Otro"
];

const TITULO_CELEBRACION_OPTIONS = [
  "— Escribir título personalizado —",
  "Misa Dominical",
  "Misa de Sábado",
  "Domingo de Ramos",
  "Jueves Santo",
  "Viernes Santo",
  "Vigilia Pascual",
  "Domingo de Resurrección",
  "Domingo de Pentecostés",
  "Solemnidad del Cuerpo y Sangre de Cristo",
  "Solemnidad del Sagrado Corazón",
  "Solemnidad de la Santísima Trinidad",
  "Solemnidad de Cristo Rey",
  "Inmaculada Concepción",
  "Navidad del Señor",
  "Epifanía del Señor",
  "Bautismo del Señor",
  "Asunción de la Virgen María",
  "Nuestra Señora de la Merced",
  "Nuestra Señora de Fátima",
  "Nuestra Señora de Guadalupe",
  "San José, Esposo de la Virgen",
  "Anunciación del Señor",
  "Todos los Santos",
  "Fieles Difuntos",
  "Misa de Matrimonio",
  "Misa de Primera Comunión",
  "Misa de Confirmación",
  "Misa de Exequias",
  "Misa Misión / Retiro",
];


function PautaMisa({pautas, members, user, onReload, deepPautaId}) {
  const isAdmin = user?.cuerda === "Admin";
  const [selected, setSelected] = useState(null); // pauta activa
  const [mode, setMode] = useState(null); // null=lista | "new" | "edit" | "view"
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [notifStatus, setNotifStatus] = useState("");

  // Auto-abrir pauta desde QR deeplink
  useEffect(() => {
    if (deepPautaId && pautas && pautas.length > 0 && !selected) {
      const found = pautas.find(p => p.id === deepPautaId);
      if (found) { setSelected(found); setMode("view"); }
    }
  }, [deepPautaId, pautas]);

  // Form nueva pauta
  const emptyPauta = {titulo:"",fecha:"",hora:"",lugar:"",tipo_celebracion:"Misa Dominical",notas:""};
  const [form, setForm] = useState(emptyPauta);
  const [tituloMode, setTituloMode] = useState("select"); // "select" | "custom"
  const [canciones, setCanciones] = useState([]); // filas de la pauta
  const emptyCancion = {n:"",orden:"Entrada",cancion:"",autor:"",salmista:"",url_letra:"",url_audio:"",pendiente:false};

  const inp = {padding:"8px 12px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",background:"white"};

  function addFila(afterIdx) {
    const nueva = {...emptyCancion, n: String(canciones.length+1)};
    const copy = [...canciones];
    copy.splice(afterIdx+1, 0, nueva);
    // renumerar
    setCanciones(copy.map((c,i)=>({...c,n:String(i+1)})));
  }

  function removeFila(idx) {
    const copy = canciones.filter((_,i)=>i!==idx);
    setCanciones(copy.map((c,i)=>({...c,n:String(i+1)})));
  }

  function updateFila(idx, field, val) {
    setCanciones(prev=>prev.map((c,i)=>i===idx?{...c,[field]:val}:c));
  }

  async function saveNewPauta(publish=false) {
    if(!form.titulo||!form.fecha||!form.hora) { setMsg("Completa título, fecha y hora."); return; }
    if(canciones.length===0) { setMsg("Agrega al menos una canción."); return; }
    setSaving(true); setMsg("");
    try {
      const body = {
        titulo: form.titulo.trim(),
        fecha: form.fecha,
        hora: form.hora,
        lugar: form.lugar.trim(),
        tipo_celebracion: form.tipo_celebracion,
        notas: form.notas.trim(),
        canciones: JSON.stringify(canciones),
        publicada: publish,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pautas_misa`, {
        method:"POST",
        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${_authToken}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body: JSON.stringify(body)
      });
      if(!res.ok) throw new Error(await res.text());
      const [created] = await res.json();
      await onReload();
      setMode(publish ? "view" : null);
      setForm(emptyPauta); setCanciones([]);
      setMsg("");
      if(publish) {
        setSelected(created);
        await notificarIntegrantes(created, members);
        setNotifStatus("✅ Notificación WhatsApp lista para enviar.");
      } else {
        setMsg("✅ Pauta guardada como borrador.");
      }
    } catch(e) { setMsg("Error: "+e.message); }
    setSaving(false);
  }

  async function saveEditPauta(pauta, publish=false) {
    setSaving(true); setMsg("");
    try {
      const publicada = publish ? true : pauta.publicada;
      const body = {
        titulo: form.titulo || pauta.titulo,
        fecha: form.fecha || pauta.fecha,
        hora: form.hora || pauta.hora,
        lugar: form.lugar ?? pauta.lugar,
        tipo_celebracion: form.tipo_celebracion || pauta.tipo_celebracion,
        notas: form.notas ?? pauta.notas,
        canciones: JSON.stringify(canciones),
        publicada,
      };
      await updateRecord("pautas_misa", pauta.id, body);
      await onReload();
      const updated = {...pauta, ...body};
      setSelected(updated);
      setMode("view");
      if(publish) {
        await notificarIntegrantes(updated, members);
        setNotifStatus("✅ Pauta publicada. Notificación WhatsApp lista.");
      } else {
        setMsg("✅ Pauta actualizada.");
      }
    } catch(e) { setMsg("Error: "+e.message); }
    setSaving(false);
  }

  async function togglePublicar(pauta) {
    const nuevaPublicada = !pauta.publicada;
    try {
      await updateRecord("pautas_misa", pauta.id, {publicada: nuevaPublicada});
      await onReload();
      if(nuevaPublicada) {
        const updated = {...pauta, publicada:true};
        setSelected(updated);
        setMode("view");
        await notificarIntegrantes(updated, members);
        setNotifStatus("✅ Pauta publicada. Notificación WhatsApp lista.");
      } else {
        setSelected({...pauta, publicada:false});
        setMode("view");
        setMsg("Pauta despublicada.");
      }
    } catch(e) { setMsg("Error: "+e.message); }
  }

  async function deletePauta(id) {
    try { await deleteRecord("pautas_misa", id); await onReload(); setSelected(null); setMode(null); }
    catch(e) { setMsg("Error: "+e.message); }
  }

  // Genera link de WhatsApp para notificar integrantes
  async function notificarIntegrantes(pauta, memberList) {
    const fechaFmt = new Date(pauta.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const qrLink = `https://343mhn.csb.app/pauta-publica.html?pauta=${pauta.id}`;
    const texto = `🎼 *Coro Misioneros de Jesús*\n\nSe ha publicado la *Pauta de Misa* para:\n📅 *${fechaFmt}*\n🕐 *${pauta.hora} Hrs*\n📍 ${pauta.lugar||"lugar por confirmar"}\n\n📋 _${pauta.titulo}_\n\n📱 *Escanea el QR o ingresa al portal del coro para ver la pauta completa.*\n🔗 ${qrLink}\n\n¡Muchas gracias por tu compromiso y entrega!\nSaludos cordiales,\n*Encargado de Coro* 🎵`;
    const encoded = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  // Abrir edición de pauta existente
  function startEdit(pauta) {
    setSelected(pauta);
    setForm({
      titulo: pauta.titulo,
      fecha: pauta.fecha,
      hora: pauta.hora,
      lugar: pauta.lugar||"",
      tipo_celebracion: pauta.tipo_celebracion||"Misa Dominical",
      notas: pauta.notas||"",
    });
    const inList = TITULO_CELEBRACION_OPTIONS.includes(pauta.titulo);
    setTituloMode(inList ? "select" : "custom");
    const c = typeof pauta.canciones === "string" ? JSON.parse(pauta.canciones||"[]") : (pauta.canciones||[]);
    setCanciones(c);
    setMode("edit");
  }

  const thStyle = {padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"white",background:"#1a3a2a",whiteSpace:"nowrap"};
  const tdStyle = {padding:"9px 12px",fontSize:12,color:C.dark,borderBottom:`1px solid ${C.border}`,verticalAlign:"top"};
  const tdEditStyle = {padding:"4px 6px",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle"};
  const inpTd = {padding:"5px 8px",borderRadius:5,border:`1px solid ${C.border}`,fontSize:12,outline:"none",width:"100%",boxSizing:"border-box"};

  // ── Vista lista de pautas ──────────────────────────────────
  if(mode === "new" || mode === "edit") {
    const pautaEdit = mode === "edit" ? selected : null;
    return (
      <div style={{maxWidth:1100}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={()=>setMode(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:C.gray}}>← Volver</button>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontSize:18,fontWeight:600,color:C.dark,margin:0}}>
            {mode==="edit"?"✏️ Editar Pauta":"🎼 Nueva Pauta de Misa"}
          </h2>
        </div>
        {msg && <div style={{background:msg.startsWith("✅")?"#d1fae5":"#fee2e2",color:msg.startsWith("✅")?"#065f46":"#b91c1c",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14}}>{msg}</div>}

        {/* Datos generales */}
        <Card style={{marginBottom:16}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark,marginBottom:14}}>📋 Datos de la Celebración</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Título de Celebración *</label>
              {tituloMode==="custom" ? (
                <div style={{display:"flex",gap:6}}>
                  <input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Escribe el título..." style={{...inp,flex:1}}/>
                  <button onClick={()=>{setTituloMode("select");setForm(p=>({...p,titulo:""}));}} style={{padding:"0 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.light,cursor:"pointer",fontSize:11,color:C.gray,whiteSpace:"nowrap"}}>↩ Lista</button>
                </div>
              ) : (
                <select value={form.titulo} onChange={e=>{
                  const v=e.target.value;
                  if(v===TITULO_CELEBRACION_OPTIONS[0]){setTituloMode("custom");setForm(p=>({...p,titulo:""}));}
                  else setForm(p=>({...p,titulo:v}));
                }} style={inp}>
                  <option value="">Seleccionar celebración...</option>
                  {TITULO_CELEBRACION_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Hora *</label>
              <input type="time" value={form.hora} onChange={e=>setForm(p=>({...p,hora:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Tipo</label>
              <select value={form.tipo_celebracion} onChange={e=>setForm(p=>({...p,tipo_celebracion:e.target.value}))} style={inp}>
                {TIPO_CELEBRACION_OPTIONS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Lugar</label>
              <input value={form.lugar} onChange={e=>setForm(p=>({...p,lugar:e.target.value}))} placeholder="Ej: Capilla Sagrada Familia" style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:C.gray,marginBottom:4}}>Notas generales</label>
              <input value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} placeholder="Indicaciones adicionales para el coro..." style={inp}/>
            </div>
          </div>
        </Card>

        {/* Tabla de canciones */}
        <Card style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:C.dark}}>🎵 Canciones de la Pauta</span>
            <Btn onClick={()=>addFila(canciones.length-1)} style={{fontSize:12,padding:"6px 14px"}}>+ Agregar fila</Btn>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
              <thead>
                <tr>
                  {["N°","Orden Litúrgico","Canción","Autor","Salmista","URL Letra (PDF)","URL Audio Ref.","⚠️",""].map((h,i)=>(
                    <th key={i} style={{...thStyle,width:i===0?"40px":i===7?"50px":i===8?"60px":"auto"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {canciones.length===0 && (
                  <tr><td colSpan={8} style={{padding:"24px",textAlign:"center",color:C.gray,fontSize:13,fontStyle:"italic"}}>Sin canciones. Haz clic en "+ Agregar fila".</td></tr>
                )}
                {canciones.map((c,i)=>(
                  <tr key={i} style={{background:c.pendiente?"#fefce8":i%2===0?C.white:"#f9fafb"}}>
                    <td style={tdEditStyle}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.dark,minWidth:24,textAlign:"center"}}>{c.n}</span>
                      </div>
                    </td>
                    <td style={tdEditStyle}>
                      <select value={c.orden} onChange={e=>updateFila(i,"orden",e.target.value)} style={{...inpTd,minWidth:160}}>
                        {ORDEN_LITURGICO_OPTIONS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={tdEditStyle}><input value={c.cancion} onChange={e=>updateFila(i,"cancion",e.target.value)} placeholder="Nombre de la canción" style={{...inpTd,minWidth:180}}/></td>
                    <td style={tdEditStyle}><input value={c.autor} onChange={e=>updateFila(i,"autor",e.target.value)} placeholder="Autor / Compositor" style={{...inpTd,minWidth:130}}/></td>
                    <td style={tdEditStyle}><input value={c.salmista||""} onChange={e=>updateFila(i,"salmista",e.target.value)} placeholder="Salmista / Cantor" style={{...inpTd,minWidth:120}}/></td>
                    <td style={tdEditStyle}><input value={c.url_letra} onChange={e=>updateFila(i,"url_letra",e.target.value)} placeholder="https://..." style={{...inpTd,minWidth:130}}/></td>
                    <td style={tdEditStyle}><input value={c.url_audio} onChange={e=>updateFila(i,"url_audio",e.target.value)} placeholder="YouTube, Spotify..." style={{...inpTd,minWidth:140}}/></td>
                    <td style={{...tdEditStyle,textAlign:"center"}}>
                      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
                        <input type="checkbox" checked={c.pendiente||false} onChange={e=>updateFila(i,"pendiente",e.target.checked)}/>
                        <span style={{fontSize:10,color:c.pendiente?"#b45309":"#9ca3af"}}>{c.pendiente?"⚠️":""}</span>
                      </label>
                    </td>
                    <td style={{...tdEditStyle,textAlign:"center"}}>
                      <button onClick={()=>removeFila(i)} style={{background:"#fee2e2",color:C.danger,border:"none",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Botones de acción */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {mode === "edit" ? (
            <>
              <Btn onClick={()=>saveEditPauta(selected)} disabled={saving}>{saving?"Guardando...":"💾 Guardar Cambios"}</Btn>
              {!selected?.publicada && <Btn onClick={()=>saveEditPauta(selected,true)} disabled={saving} style={{background:"#059669",color:"white"}}>{saving?"Publicando...":"📢 Guardar y Publicar"}</Btn>}
            </>
          ) : (
            <>
              <Btn onClick={()=>saveNewPauta(false)} disabled={saving} variant="secondary">{saving?"Guardando...":"💾 Guardar Borrador"}</Btn>
              <Btn onClick={()=>saveNewPauta(true)} disabled={saving}>{saving?"Publicando...":"📢 Publicar y Notificar"}</Btn>
            </>
          )}
          <Btn variant="ghost" onClick={()=>setMode(null)}>Cancelar</Btn>
        </div>
        {msg && <div style={{marginTop:12,background:msg.startsWith("✅")?"#d1fae5":"#fee2e2",color:msg.startsWith("✅")?"#065f46":"#b91c1c",borderRadius:8,padding:"10px 14px",fontSize:13}}>{msg}</div>}
      </div>
    );
  }

  // ── Vista detalle de pauta ─────────────────────────────────
  if(mode === "view" && selected) {
    const cancionesData = typeof selected.canciones === "string" ? JSON.parse(selected.canciones||"[]") : (selected.canciones||[]);
    const fechaFmt = new Date(selected.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    return (
      <div style={{maxWidth:1100}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>{setSelected(null);setMode(null);setNotifStatus("");}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:C.gray}}>← Volver</button>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontSize:18,fontWeight:600,color:C.dark,margin:0,flex:1}}>{selected.titulo}</h2>
          {isAdmin && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn onClick={()=>startEdit(selected)} style={{fontSize:12,padding:"6px 14px"}} variant="secondary">✏️ Editar</Btn>
              <Btn onClick={()=>togglePublicar(selected)} style={{fontSize:12,padding:"6px 14px",background:selected.publicada?"#f59e0b":C.primary,color:"white"}} variant="primary">
                {selected.publicada?"📌 Despublicar":"📢 Publicar y Notificar"}
              </Btn>
              <ConfirmBtn onConfirm={()=>deletePauta(selected.id)} label="🗑 Eliminar"/>
            </div>
          )}
        </div>

        {notifStatus && (
          <div style={{background:"#d1fae5",color:"#065f46",borderRadius:10,padding:"10px 16px",fontSize:13,marginBottom:14,border:"1px solid #6ee7b7",display:"flex",alignItems:"center",gap:8}}>
            {notifStatus}
          </div>
        )}
        {msg && <div style={{background:msg.startsWith("✅")?"#d1fae5":"#fee2e2",color:msg.startsWith("✅")?"#065f46":"#b91c1c",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14}}>{msg}</div>}

        {/* Header estilo la imagen */}
        <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{textAlign:"center",padding:"20px 24px 16px",borderBottom:`3px solid #1a3a2a`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
              {!selected.publicada && <span style={{background:"#fbbf24",color:"#78350f",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>BORRADOR</span>}
              {selected.publicada && <span style={{background:C.primaryLight,color:C.primaryDark,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>✅ PUBLICADA</span>}
            </div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:20,fontWeight:700,color:"#1a3a2a",marginBottom:4}}>{selected.titulo}</div>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:600,color:"#2d6a4f"}}>Coro Misioneros de Jesús</div>
                <div style={{fontSize:12,color:C.gray,marginTop:6,textTransform:"capitalize"}}>
                  {fechaFmt} · Horario Coro: {selected.hora} Hrs{selected.lugar?` · ${selected.lugar}`:""}
                </div>
                {selected.notas && <div style={{marginTop:8,fontSize:12,color:"#374151",fontStyle:"italic",background:"#f0fdf4",borderRadius:8,padding:"6px 14px",display:"inline-block"}}>{selected.notas}</div>}
              </div>
              {selected.id && (()=>{
                const qrData = `https://343mhn.csb.app/pauta-publica.html?pauta=${selected.id}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}&color=1a3a2a&bgcolor=ffffff&margin=8`;
                return (
                  <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{background:"white",borderRadius:10,padding:6,border:`2px solid ${selected.publicada?"#1a3a2a":"#fbbf24"}`,boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>
                      <img src={qrUrl} alt="QR Pauta" width={100} height={100} style={{display:"block",borderRadius:4}}/>
                    </div>
                    <div style={{fontSize:9,color:C.gray,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{selected.publicada?"Código QR":"QR (Borrador)"}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead>
                <tr>
                  {["N°","Tr","Orden Litúrgico","Canción","Autor","Salmista","Letra (PDF)","Audio Referencial"].map((h,i)=>(
                    <th key={i} style={{...thStyle,textAlign:i<=1?"center":"left",width:i===0?"40px":i===1?"35px":"auto"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cancionesData.map((c,i)=>{
                  const isSubSalmo = c.orden==="Salmo"||c.orden==="Cántico";
                  return (
                    <tr key={i} style={{background:c.pendiente?"#fefce8":i%2===0?"#ffffff":"#f8fffe"}}>
                      <td style={{...tdStyle,textAlign:"center",fontWeight:700,color:C.primaryDark,width:40}}>{c.n}</td>
                      <td style={{...tdStyle,textAlign:"center",width:35}}>
                        {c.url_audio&&c.url_audio.includes("youtube")&&<span style={{fontSize:14}}>▶</span>}
                        {c.url_audio&&!c.url_audio.includes("youtube")&&c.url_audio.includes("http")&&<span style={{fontSize:14}}>🔗</span>}
                        {(!c.url_audio||!c.url_audio.includes("http"))&&c.url_letra&&c.url_letra.includes("http")&&<span style={{fontSize:14}}>📄</span>}
                      </td>
                      <td style={{...tdStyle,fontWeight:isSubSalmo?400:600,color:isSubSalmo?"#374151":"#1a3a2a",paddingLeft:isSubSalmo?24:12}}>{c.orden}</td>
                      <td style={{...tdStyle,fontWeight:600,color:C.primaryDark}}>{c.cancion||<span style={{color:C.gray,fontStyle:"italic"}}>—</span>}</td>
                      <td style={{...tdStyle,color:"#374151"}}>{c.autor||<span style={{color:C.gray}}>—</span>}</td>
                      <td style={{...tdStyle,color:"#374151"}}>{c.salmista||<span style={{color:C.gray}}>—</span>}</td>
                      <td style={{...tdStyle}}>
                        {c.pendiente
                          ? <span style={{background:"#fef08a",color:"#713f12",fontWeight:600,fontSize:11,padding:"3px 10px",borderRadius:6}}>Letra y Acordes (Pendiente)</span>
                          : c.url_letra && c.url_letra.includes("http")
                            ? <a href={c.url_letra} target="_blank" rel="noopener" style={{color:C.primary,fontSize:12,display:"flex",alignItems:"center",gap:4}}>
                                <span>📄</span>{c.url_letra.split("/").pop()?.slice(0,30)||"Ver PDF"}
                              </a>
                            : c.url_letra
                              ? <span style={{fontSize:12,color:"#374151"}}>{c.url_letra}</span>
                              : <span style={{color:C.gray,fontSize:12}}>—</span>
                        }
                      </td>
                      <td style={{...tdStyle}}>
                        {c.url_audio && c.url_audio.includes("http")
                          ? <a href={c.url_audio} target="_blank" rel="noopener" style={{color:C.danger,fontSize:12,display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:14}}>▶</span>
                              {c.url_audio.includes("youtube")
                                ? <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{c.cancion||"Ver video"}</span>
                                : <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{c.url_audio.split("/").pop()?.slice(0,30)||"Escuchar"}</span>
                              }
                            </a>
                          : c.url_audio
                            ? <span style={{fontSize:12,color:"#374151"}}>{c.url_audio}</span>
                            : <span style={{color:C.gray,fontSize:12}}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div style={{padding:"12px 16px",background:C.primaryLight,borderTop:`1px solid ${C.primary}30`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:C.primaryDark}}>📲 Notificar integrantes por WhatsApp:</span>
              <button onClick={()=>notificarIntegrantes(selected,members)} style={{background:"#25d366",color:"white",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                💬 Abrir mensaje WhatsApp
              </button>
              <span style={{fontSize:11,color:C.gray,fontStyle:"italic"}}>Se abrirá WhatsApp con el mensaje listo para compartir al grupo del coro</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista lista ────────────────────────────────────────────
  const borradores = pautas.filter(p=>!p.publicada);
  const publicadas = pautas.filter(p=>p.publicada);

  return (
    <div style={{maxWidth:1100}}>
      <SectionTitle
        title="🎼 Pauta de Misa"
        subtitle="Repertorio litúrgico para cada celebración del Coro MJ"
        action={isAdmin && <Btn onClick={()=>{setForm(emptyPauta);setCanciones([]);setTituloMode("select");setMode("new");}}>+ Nueva Pauta</Btn>}
      />

      {pautas.length===0 && (
        <Card style={{textAlign:"center",padding:"40px 24px"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎼</div>
          <div style={{fontSize:14,fontWeight:600,color:C.dark,marginBottom:6}}>Sin pautas aún</div>
          <div style={{fontSize:13,color:C.gray}}>{isAdmin?"Crea la primera pauta de misa con el botón de arriba.":"El encargado publicará las pautas aquí próximamente."}</div>
        </Card>
      )}

      {publicadas.length>0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:C.primary,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>✅ Pautas Publicadas</div>
          {publicadas.map(p=>{
            const fechaFmt = new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
            const c = typeof p.canciones==="string"?JSON.parse(p.canciones||"[]"):(p.canciones||[]);
            return (
              <Card key={p.id} hover style={{marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}} onClick={()=>{setSelected(p);setMode("view");}}>
                <div style={{width:52,height:52,borderRadius:12,background:`linear-gradient(135deg,#1a3a2a,${C.primary})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:"white",lineHeight:1}}>{new Date(p.fecha+"T00:00:00").getDate()}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{month:"short"})}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.dark,marginBottom:3}}>{p.titulo}</div>
                  <div style={{fontSize:12,color:C.gray,textTransform:"capitalize"}}>{fechaFmt} · {p.hora} Hrs{p.lugar?` · ${p.lugar}`:""}</div>
                  <div style={{fontSize:11,color:C.primary,marginTop:4}}>{c.length} canciones · {p.tipo_celebracion}</div>
                </div>
                <span style={{fontSize:12,color:C.gray}}>Ver pauta →</span>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && borradores.length>0 && (
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#b45309",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>📝 Borradores</div>
          {borradores.map(p=>{
            const fechaFmt = new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});
            const c = typeof p.canciones==="string"?JSON.parse(p.canciones||"[]"):(p.canciones||[]);
            return (
              <Card key={p.id} hover style={{marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",border:`1px dashed #fbbf24`,background:"#fffbeb"}} onClick={()=>startEdit(p)}>
                <div style={{width:52,height:52,borderRadius:12,background:"linear-gradient(135deg,#92400e,#f59e0b)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:"white",lineHeight:1}}>{new Date(p.fecha+"T00:00:00").getDate()}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{new Date(p.fecha+"T00:00:00").toLocaleDateString("es-CL",{month:"short"})}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#92400e",marginBottom:3}}>{p.titulo} <span style={{fontSize:11,background:"#fef08a",color:"#713f12",padding:"1px 8px",borderRadius:10,fontWeight:600}}>BORRADOR</span></div>
                  <div style={{fontSize:12,color:"#b45309",textTransform:"capitalize"}}>{fechaFmt} · {p.hora} Hrs</div>
                  <div style={{fontSize:11,color:"#b45309",marginTop:4}}>{c.length} canciones</div>
                </div>
                <span style={{fontSize:12,color:C.gray}}>Editar →</span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminPautasMisa({onReload}) {
  const [seccion, setSeccion] = useState("titulos");
  const titulos = [...TITULO_CELEBRACION_OPTIONS.filter(t=>t!==TITULO_CELEBRACION_OPTIONS[0])];
  const tipos = [...TIPO_CELEBRACION_OPTIONS];
  const ordenes = [...ORDEN_LITURGICO_OPTIONS];
  const inputS = {padding:"8px 12px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div>
      <div style={{fontSize:13,color:C.gray,marginBottom:14}}>
        Catálogos predefinidos utilizados en el formulario de Pauta de Misa. Estas listas son configuradas en el código fuente de la aplicación.
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>
        {[["titulos","🎶 Títulos"],["tipos","📋 Tipos"],["ordenes","🎵 Orden Litúrgico"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSeccion(id)} style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:seccion===id?600:400,background:seccion===id?C.primary:"transparent",color:seccion===id?"white":C.gray}}>
            {label}
          </button>
        ))}
      </div>

      {seccion==="titulos" && (
        <div>
          <div style={{fontSize:12,color:C.gray,marginBottom:10}}>
            Estas son las celebraciones preestablecidas que aparecen en el selector de título al crear una pauta. Incluyen: Domingos del año litúrgico, Solemnidades y celebraciones especiales.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {titulos.map((t,i)=>(
              <div key={i} style={{padding:"8px 12px",background:C.light,borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,color:C.dark,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🎼</span>{t}
              </div>
            ))}
          </div>
          <div style={{marginTop:12,padding:"10px 14px",background:C.goldLight,borderRadius:8,border:`1px solid ${C.gold}30`,fontSize:11,color:C.gray}}>
            💡 Al crear una pauta también puedes elegir "Escribir título personalizado" para ingresar cualquier texto libremente.
          </div>
        </div>
      )}

      {seccion==="tipos" && (
        <div>
          <div style={{fontSize:12,color:C.gray,marginBottom:10}}>Tipos de celebración disponibles en el formulario.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {tipos.map((t,i)=>(
              <div key={i} style={{padding:"8px 12px",background:C.light,borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,color:C.dark,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📋</span>{t}
              </div>
            ))}
          </div>
        </div>
      )}

      {seccion==="ordenes" && (
        <div>
          <div style={{fontSize:12,color:C.gray,marginBottom:10}}>Momentos del orden litúrgico disponibles en cada fila de canciones.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {ordenes.map((o,i)=>(
              <div key={i} style={{padding:"8px 12px",background:C.light,borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,color:C.dark,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🎵</span>{o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Admin({members, eventos, docs, oraciones, noticias, preguntas, links, biblioteca, podcasts, onReload, user}) {
  const [tab, setTab] = useState("integrantes");
  const pendientes = preguntas.filter(p=>!p.respuesta).length;

  return (
    <div style={{maxWidth:1000}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`,borderRadius:16,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{width:48,height:48,background:"rgba(255,255,255,0.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>⚙</div>
        <div>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:18,fontWeight:700,color:"white"}}>Panel de Administración</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>Gestiona toda la información del Coro MJ · {user?.nombre}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,flexWrap:"wrap"}}>
          {[{label:"Integrantes",val:members.length},{label:"Sin responder",val:pendientes,alert:pendientes>0}].map((s,i)=>(
            <div key={i} style={{background:s.alert?"#fbbf24":"rgba(255,255,255,0.2)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:"white",lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.85)",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
        {ADMIN_TABS.map(t=>(
          <AdminTab key={t.id} label={`${t.label}${t.id==="preguntas"&&pendientes>0?" ("+pendientes+")":""}`} active={tab===t.id} onClick={()=>setTab(t.id)}/>
        ))}
      </div>

      <Card>
        {tab==="integrantes" && <AdminIntegrantes members={members} onReload={onReload}/>}
        {tab==="documentos"  && <AdminDocumentos docs={docs} onReload={onReload}/>}
        {tab==="oraciones"   && <AdminOraciones oraciones={oraciones} onReload={onReload}/>}
        {tab==="noticias"    && <AdminNoticias noticias={noticias} onReload={onReload}/>}
        {tab==="preguntas"   && <AdminPreguntas preguntas={preguntas} onReload={onReload}/>}
        {tab==="links"       && <AdminLinks links={links} onReload={onReload}/>}
        {tab==="biblioteca"  && <AdminBiblioteca biblioteca={biblioteca} onReload={onReload}/>}
        {tab==="podcasts"    && <AdminPodcasts podcasts={podcasts} onReload={onReload}/>}
        {tab==="pautas"      && <AdminPautasMisa onReload={onReload}/>}
      </Card>

      <div style={{marginTop:16,padding:"12px 16px",background:C.goldLight,borderRadius:10,border:`1px solid ${C.gold}30`,fontSize:12,color:C.gray,lineHeight:1.6}}>
        ⚠️ <strong>Nuevas tablas requeridas en Supabase:</strong><br/>
        <code style={{display:"block",marginTop:6,fontFamily:"monospace",fontSize:11,background:"#f3f4f6",padding:"8px 10px",borderRadius:6,color:C.dark}}>
          -- Columna teléfono (si aún no existe):<br/>
          alter table integrantes add column if not exists telefono text;<br/>
          -- Tablas nuevas (si aún no existen):<br/>
          create table if not exists links (id uuid default gen_random_uuid() primary key, label text, url text, orden int default 0, created_at timestamptz default now());<br/>
          create table if not exists biblioteca (id uuid default gen_random_uuid() primary key, titulo text, autor text, anio text, url text, emoji text, created_at timestamptz default now());<br/>
          create table if not exists podcasts (id uuid default gen_random_uuid() primary key, titulo text, descripcion text, url text, autor text, created_at timestamptz default now());<br/>
          -- Habilitar RLS y políticas para cada tabla (select/insert/delete to authenticated)
        </code>
      </div>
    </div>
  );
}
