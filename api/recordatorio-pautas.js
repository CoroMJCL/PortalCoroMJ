// /api/recordatorio-pautas.js
//
// Recordatorio push para quienes aún no han revisado una pauta publicada.
// Lo ejecuta Vercel Cron dos veces al día (ver vercel.json). Cada integrante
// recibe el aviso solo mientras NO exista su registro de revisión
// (config.pv_<pautaId>_<integranteId>); apenas ve la pauta, deja de recibirlo.
// La pauta deja de recordarse después del día de la misa.
//
// Variables en Vercel: ONESIGNAL_API_KEY (ya existe). Opcionales:
//   SUPABASE_SERVICE_KEY, CRON_SECRET (si la defines, Vercel la envía sola).
// Prueba sin enviar nada: /api/recordatorio-pautas?dry=1

const SB_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YmlwYmhmc3djd3dnY3dhaXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA1MDExNiwiZXhwIjoyMDk0NjI2MTE2fQ.brVGJoNX6dBEC7Z6wQIQ4RxrqrxkGt7EFkAjpZmqCMs";
const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
const OS_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = "https://coromisionerosdejesus.cl";

const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
async function sb(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]}: ${r.status}`);
  return r.json();
}

// Fecha de hoy en Chile (YYYY-MM-DD)
function hoyChile() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}
function fechaLarga(f) {
  return new Date(f + "T12:00:00Z").toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.query?.key !== secret) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }
  const dry = req.query?.dry === "1";
  if (!OS_KEY && !dry) return res.status(500).json({ ok: false, error: "Falta ONESIGNAL_API_KEY" });
  try {
    const hoy = hoyChile();
    const pautas = await sb(`pautas_misa?select=id,titulo,fecha,publicada&publicada=eq.true&fecha=gte.${hoy}&order=fecha.asc`);
    if (!pautas.length) return res.status(200).json({ ok: true, enviados: 0, nota: "Sin pautas vigentes" });

    const miembros = (await sb("integrantes?select=id,nombre,cuerda,acceso&acceso=eq.aprobado"))
      .filter((m) => m.cuerda && m.cuerda.trim() !== "" && m.cuerda !== "Admin");

    // Revisiones registradas por pauta
    const vistas = {};
    for (const p of pautas) {
      const rows = await sb(`config?select=key&key=like.${encodeURIComponent("pv_" + p.id + "_")}*`);
      vistas[p.id] = new Set(rows.map((r) => r.key.slice(("pv_" + p.id + "_").length).split("_")[0]));
    }

    // Pautas restringidas por el admin: solo se recuerda a quienes pueden verlas
    const acceso = {};
    try {
      const rows = await sb(`config?select=key,value&key=like.${encodeURIComponent("pauta_acceso_")}*`);
      for (const r of rows) {
        try {
          acceso[r.key.slice("pauta_acceso_".length)] = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
        } catch (e) {}
      }
    } catch (e) {}
    const puede = (p, m) => {
      const ac = acceso[p.id];
      return !ac || !ac.restringida || (ac.ids || []).map(String).includes(String(m.id));
    };

    // Pendientes por integrante → agrupa para mandar un solo mensaje por persona
    const grupos = {};
    for (const m of miembros) {
      const pend = pautas.filter((p) => puede(p, m) && !vistas[p.id].has(String(m.id)));
      if (!pend.length) continue;
      const k = pend.map((p) => p.id).join(",");
      (grupos[k] = grupos[k] || { pend, ids: [] }).ids.push(String(m.id));
    }

    const resumen = [];
    let enviados = 0;
    for (const g of Object.values(grupos)) {
      const title = g.pend.length === 1 ? "🎼 Revisa la pauta de la misa" : `🎼 Tienes ${g.pend.length} pautas por revisar`;
      const body = g.pend.length === 1
        ? `Aún no has revisado la pauta del ${fechaLarga(g.pend[0].fecha)}. Entra y prepárate.`
        : "Aún no has revisado: " + g.pend.map((p) => fechaLarga(p.fecha)).join(" · ");
      resumen.push({ title, para: g.ids.length });
      if (dry) continue;
      for (let i = 0; i < g.ids.length; i += 1000) {
        const r = await fetch("https://api.onesignal.com/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: OS_KEY.startsWith("os_v2_") ? `Key ${OS_KEY}` : `Basic ${OS_KEY}`,
          },
          body: JSON.stringify({
            app_id: APP_ID,
            target_channel: "push",
            include_aliases: { external_id: g.ids.slice(i, i + 1000) },
            headings: { en: title, es: title },
            contents: { en: body, es: body },
            url: SITE_URL + "/",
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) enviados += d.recipients || 0;
      }
    }
    return res.status(200).json({ ok: true, dry, enviados, grupos: resumen });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
