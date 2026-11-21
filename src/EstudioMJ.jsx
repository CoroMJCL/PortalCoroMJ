import { useState } from "react";
import CursoGuitarra from "./CursoGuitarra";
import CursoTeclado, { KEY_TECLADO } from "./CursoTeclado";
import { NIVELES as NIVELES_GUITARRA } from "./CursoGuitarraData";
import { NIVELES as NIVELES_TECLADO } from "./CursoTecladoData";
import CursoUkelele, { KEY_UKELELE } from "./CursoUkelele";
import { NIVELES as NIVELES_UKELELE } from "./CursoUkeleleData";

// ═══════════════════════════════════════════════════════════════
//  ESTUDIO MJ — todos los cursos del coro en un solo lugar
// ═══════════════════════════════════════════════════════════════
const NAVY = "#0f2744";
const ORO = "#c9a227";

function progreso(key, niveles) {
  try {
    const st = JSON.parse(localStorage.getItem(key) || "{}") || {};
    const done = st.done || {};
    const mods = niveles.flatMap((n) => n.modulos);
    const hechos = mods.filter((m) => done[m.id]).length;
    return { hechos, total: mods.length, pct: Math.round((hechos / mods.length) * 100) };
  } catch {
    return null;
  }
}

const ICONOS = {
  canto: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  guitarra: (
    <>
      <path d="M14 4l6 6" />
      <path d="M17 7l-5.5 5.5" />
      <path d="M11.5 12.5a3.5 3.5 0 1 0-1.4 4.6A3 3 0 1 1 6.9 13.9a3.5 3.5 0 0 0 4.6-1.4z" />
    </>
  ),
  teclado: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M7 5v14M12 5v14M17 5v14" />
      <path d="M5.5 5v8M9 5v8M15 5v8M18.5 5v8" strokeWidth="2.6" />
    </>
  ),
  ukelele: (
    <>
      <circle cx="8.5" cy="15.5" r="4.5" />
      <path d="M11.7 12.3 19 5" />
      <path d="M17.5 3.5l3 3" />
      <circle cx="8.5" cy="15.5" r="1.2" />
    </>
  ),
};

const CURSOS = [
  { id: "canto", titulo: "Canto Litúrgico", desc: "Técnica vocal, las partes de la misa y ejercicios para cantar mejor en el coro.", etiqueta: "Voz" },
  { id: "guitarra", titulo: "Guitarra", desc: "Del primer acorde al acompañamiento: diagramas, ritmos y audio.", etiqueta: "Instrumento", key: "curso_guitarra_progreso_v1", niveles: NIVELES_GUITARRA },
  { id: "teclado", titulo: "Teclado", desc: "Notas, acordes y patrones para acompañar al coro, con teclado interactivo.", etiqueta: "Instrumento", key: KEY_TECLADO, niveles: NIVELES_TECLADO, nuevo: true },
  { id: "ukelele", titulo: "Ukelele", desc: "El instrumento más amable para empezar: acordes de uno o dos dedos, rasgueos y audio.", etiqueta: "Instrumento", key: KEY_UKELELE, niveles: NIVELES_UKELELE, nuevo: true },
];

const CSS = `
.emj{max-width:1100px;font-family:inherit;color:#1e293b}
.emj *{box-sizing:border-box}
.emj-head{position:relative;background:#fff;border:1px solid #e6ebf2;border-radius:22px;padding:18px 22px;box-shadow:0 10px 30px rgba(15,39,68,.06);overflow:hidden}
.emj-head:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,${ORO},#e8cf7a)}
.emj-kick{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:${ORO};font-weight:800}
.emj-title{font-size:clamp(21px,2.8vw,28px);font-weight:800;letter-spacing:-.025em;color:${NAVY};margin:4px 0 4px;line-height:1.1}
.emj-sub{font-size:13.5px;color:#516074;line-height:1.55;max-width:560px}
.emj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:14px}
.emj-card{position:relative;text-align:left;font-family:inherit;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;-webkit-tap-highlight-color:transparent;min-height:178px}
.emj-card:active{transform:scale(.985)}
@media(hover:hover){.emj-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,39,68,.1);border-color:#d3dbe6}}
.emj-card.pronto{cursor:default;border-style:dashed;background:#fcfcfd}
.emj-card.pronto:active{transform:none}
.emj-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.emj-ico{width:42px;height:42px;border-radius:13px;border:1px solid #e3e8ef;background:#f8fafc;display:flex;align-items:center;justify-content:center;color:${NAVY}}
.emj-ico svg{width:22px;height:22px}
.emj-tag{font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8592a3}
.emj-badge{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:4px 8px}
.emj-badge.nuevo{background:${NAVY};color:#fff}
.emj-badge.pronto{background:#fbf3dc;color:#8a6a12;border:1px solid #efdca0}
.emj-card h3{margin:0;font-size:17px;font-weight:800;color:${NAVY};letter-spacing:-.015em}
.emj-card p{margin:0;font-size:12.5px;line-height:1.5;color:#64748b}
.emj-foot{margin-top:auto;display:flex;align-items:center;gap:10px}
.emj-bar{flex:1;height:5px;border-radius:5px;background:#eef2f7;overflow:hidden}
.emj-bar i{display:block;height:100%;background:linear-gradient(90deg,${NAVY},#2f5d9a);border-radius:5px}
.emj-pct{font-size:11px;font-weight:700;color:#64748b;white-space:nowrap}
.emj-cta{font-size:12.5px;font-weight:800;color:${NAVY};white-space:nowrap}
.emj-back{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.emj-back button{display:inline-flex;align-items:center;gap:6px;border:1px solid #d6dee9;background:#fff;color:${NAVY};border-radius:999px;padding:7px 14px 7px 10px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}
.emj-back span{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8}
`;

export default function EstudioMJ({ renderCanto }) {
  const [curso, setCurso] = useState(null);

  if (curso) {
    const c = CURSOS.find((x) => x.id === curso);
    return (
      <div className="emj">
        <style>{CSS}</style>
        <div className="emj-back">
          <button onClick={() => setCurso(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Estudio MJ
          </button>
          <span>{c ? c.titulo : ""}</span>
        </div>
        {curso === "canto" && (renderCanto ? renderCanto() : null)}
        {curso === "guitarra" && <CursoGuitarra />}
        {curso === "teclado" && <CursoTeclado />}
        {curso === "ukelele" && <CursoUkelele />}
      </div>
    );
  }

  return (
    <div className="emj">
      <style>{CSS}</style>
      <div className="emj-head">
        <div className="emj-kick">Estudio MJ</div>
        <div className="emj-title">Aprende y crece en tu servicio</div>
        <div className="emj-sub">Todos los cursos del coro en un solo lugar. Avanza a tu ritmo: tu progreso queda guardado en este dispositivo.</div>
      </div>
      <div className="emj-grid">
        {CURSOS.map((c) => {
          const p = c.key ? progreso(c.key, c.niveles) : null;
          return (
            <button key={c.id} className={"emj-card" + (c.pronto ? " pronto" : "")} onClick={() => !c.pronto && setCurso(c.id)} aria-disabled={c.pronto ? "true" : undefined}>
              <div className="emj-top">
                <div className="emj-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONOS[c.id]}</svg>
                </div>
                {c.nuevo && <span className="emj-badge nuevo">Nuevo</span>}
                {c.pronto && <span className="emj-badge pronto">Próximamente</span>}
                {!c.nuevo && !c.pronto && <span className="emj-tag">{c.etiqueta}</span>}
              </div>
              <div>
                <h3>{c.titulo}</h3>
                <p style={{ marginTop: 4 }}>{c.desc}</p>
              </div>
              <div className="emj-foot">
                {c.pronto ? (
                  <span className="emj-pct">En preparación</span>
                ) : p ? (
                  <>
                    <div className="emj-bar"><i style={{ width: p.pct + "%" }} /></div>
                    <span className="emj-pct">{p.hechos}/{p.total}</span>
                    <span className="emj-cta">{p.hechos ? "Continuar" : "Comenzar"} →</span>
                  </>
                ) : (
                  <span className="emj-cta" style={{ marginLeft: "auto" }}>Entrar →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
