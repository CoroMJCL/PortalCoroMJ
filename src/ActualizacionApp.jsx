import React, { useEffect, useRef, useState } from "react";

// Actualización obligatoria: si hay una versión nueva publicada, avisa y reinicia la app
// (como las actualizaciones de Windows o del celular). Compara el archivo principal
// de la app que está corriendo con el que publica el servidor.
const REVISAR_CADA_MS = 5 * 60 * 1000;
const CUENTA_S = 120;
const POSPONER_S = 300;

const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";
export const CLAVE_PAUSA = "actualizaciones_pausadas";

// ¿El administrador pausó las actualizaciones? (si no se puede leer, se asume que no)
async function pausado() {
  let tokens = [];
  try {
    tokens = [localStorage.getItem("sb_access_token"), SUPABASE_KEY].filter((v, i, ar) => v && ar.indexOf(v) === i);
  } catch (e) {
    tokens = [SUPABASE_KEY];
  }
  for (const t of tokens) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/config?select=value&key=eq.${CLAVE_PAUSA}&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${t}`, "Cache-Control": "no-cache" },
        cache: "no-store",
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (!Array.isArray(d) || d.length === 0) return false;
      let v = d[0] && d[0].value;
      if (typeof v === "string") {
        try {
          v = JSON.parse(v);
        } catch (e) {}
      }
      return !!(v && (v.pausada === true || v === true || v === "true" || v === "1"));
    } catch (e) {}
  }
  return false;
}

function scriptActual() {
  try {
    const el = [...document.scripts].find((s) => /\/static\/js\/main\.[^/]+\.js/.test(s.src || ""));
    return el ? (el.src.match(/main\.[^/]+\.js/) || [null])[0] : null;
  } catch (e) {
    return null;
  }
}

async function scriptPublicado() {
  const r = await fetch(`/?_v=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) return null;
  const t = await r.text();
  const m = t.match(/\/static\/js\/(main\.[^"'/]+\.js)/);
  return m ? m[1] : null;
}

export default function ActualizacionApp() {
  const [fin, setFin] = useState(null); // hora (ms) en que se reinicia
  const [resta, setResta] = useState(CUENTA_S);
  const [pospuesta, setPospuesta] = useState(false);
  const [oculta, setOculta] = useState(false);
  const ultimo = useRef(0);
  const revisandoFin = useRef(false);
  const actual = useRef(scriptActual());

  const reiniciar = () => {
    try {
      sessionStorage.setItem("mj_reinicio", String(Date.now()));
    } catch (e) {}
    window.location.reload();
  };

  // Revisión periódica y al volver a la app
  useEffect(() => {
    if (!actual.current) return undefined; // en desarrollo no hay archivo con hash
    let vivo = true;
    const revisar = async () => {
      if (!vivo || fin) return;
      const ahora = Date.now();
      if (ahora - ultimo.current < 60 * 1000) return;
      ultimo.current = ahora;
      try {
        const pub = await scriptPublicado();
        if (!vivo || !pub || pub === actual.current) return;
        // Evita un bucle si el navegador siguiera sirviendo la versión anterior tras reiniciar
        let reciente = false;
        try {
          reciente = ahora - Number(sessionStorage.getItem("mj_reinicio") || 0) < 60 * 1000;
        } catch (e) {}
        if (reciente) return;
        if (await pausado()) return; // el administrador pidió no reiniciar a nadie por ahora
        if (!vivo) return;
        setOculta(false);
        setFin(ahora + CUENTA_S * 1000);
      } catch (e) {}
    };
    const t = setInterval(revisar, REVISAR_CADA_MS);
    const vis = () => {
      if (document.visibilityState === "visible") revisar();
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("online", revisar);
    window.addEventListener("focus", revisar);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("online", revisar);
      window.removeEventListener("focus", revisar);
    };
  }, [fin]);

  // Cuenta regresiva basada en la hora real (sirve aunque el sistema pause la página)
  useEffect(() => {
    if (!fin) return undefined;
    const tick = () => {
      const s = Math.ceil((fin - Date.now()) / 1000);
      if (s <= 0) {
        if (!revisandoFin.current) {
          revisandoFin.current = true;
          pausado().then((p) => {
            revisandoFin.current = false;
            if (p) setFin(null);
            else reiniciar();
          });
        }
        return;
      }
      setResta(s);
    };
    tick();
    const t = setInterval(tick, 500);
    // Si el administrador activa la pausa con la cuenta en marcha, se cancela
    const tp = setInterval(() => {
      pausado().then((p) => {
        if (p) setFin(null);
      });
    }, 15000);
    const vis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      clearInterval(tp);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line
  }, [fin]);

  if (!fin || oculta) return null;

  const mm = String(Math.floor(resta / 60));
  const ss = String(resta % 60).padStart(2, "0");
  const total = CUENTA_S;
  const pct = Math.max(0, Math.min(100, (resta / total) * 100));

  const posponer = () => {
    setPospuesta(true);
    setOculta(true);
    setFin(null);
    setTimeout(() => {
      setOculta(false);
      setFin(Date.now() + CUENTA_S * 1000);
    }, POSPONER_S * 1000);
  };

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Actualización disponible"
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(8,18,45,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--font-sans, 'Plus Jakarta Sans', Inter, system-ui, sans-serif)" }}
    >
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,.4)", overflow: "hidden", textAlign: "center" }}>
        <div style={{ padding: "28px 24px 8px" }}>
          <div style={{ width: 54, height: 54, margin: "0 auto 14px", borderRadius: 16, background: "linear-gradient(145deg,#1e3a5f,#0f2744)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(15,39,68,.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e8c76a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12a8 8 0 1 1-2.6-5.9" />
              <path d="M20 4v5h-5" />
            </svg>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a94a6" }}>Actualización disponible</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f2744", letterSpacing: "-0.02em", margin: "6px 0 8px" }}>Hay una versión nueva del portal</div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
            Para seguir usándolo hay que reiniciarlo. Se reiniciará automáticamente en:
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#0f2744", letterSpacing: "-0.03em", margin: "10px 0 6px", fontVariantNumeric: "tabular-nums" }}>
            {mm}:{ss}
          </div>
          <div style={{ height: 5, borderRadius: 999, background: "#e8eef6", overflow: "hidden", margin: "0 8px" }}>
            <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#2a5a9c,#1e3a5f)", transition: "width .5s linear" }} />
          </div>
          <div style={{ fontSize: 12, color: "#8a94a6", margin: "12px 8px 0", lineHeight: 1.45 }}>
            Al reiniciar tendrás que volver a ingresar. Termina lo que estés haciendo antes de actualizar.
          </div>
        </div>
        <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={reiniciar}
            style={{ height: 46, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#1e3a5f,#2a5a9c)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(30,58,95,.35)" }}
          >
            Actualizar ahora
          </button>
          {!pospuesta && (
            <button
              onClick={posponer}
              style={{ height: 42, border: "none", borderRadius: 14, background: "transparent", color: "#475569", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Recordármelo en 5 minutos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
