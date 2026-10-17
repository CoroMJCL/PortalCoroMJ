// /api/cerrar-checkin.js
//
// Cierra el Check in de la misa: quienes no marcaron presente antes de la hora de término
// quedan AUSENTES automáticamente en Asistencia. No pisa registros existentes
// (presente / justificado / excluido / nuevo) ni toca a quienes tienen asistencia especial.
// Lo ejecuta Vercel Cron una vez al día (ver vercel.json) y también se puede abrir a mano:
//   /api/cerrar-checkin          → cierra lo que ya terminó
//   /api/cerrar-checkin?dry=1    → solo muestra qué haría
// Solo actúa cuando la hora de término ya pasó, así que es seguro ejecutarlo varias veces.

const SB_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YmlwYmhmc3djd3dnY3dhaXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA1MDExNiwiZXhwIjoyMDk0NjI2MTE2fQ.brVGJoNX6dBEC7Z6wQIQ4RxrqrxkGt7EFkAjpZmqCMs";
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sb(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]}: ${r.status} ${await r.text().catch(() => "")}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function ahoraChile() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
function restarDias(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  const dry = req.query?.dry === "1";
  try {
    const { fecha: hoy, hora: ahora } = ahoraChile();

    // Horario configurado en Administración → Check in
    let cfg = { desde: "17:00", hasta: "19:59", fecha: "" };
    try {
      const c = await sb("config?select=value&key=eq.checkin_config&limit=1");
      if (c && c[0] && c[0].value) cfg = { ...cfg, ...(typeof c[0].value === "string" ? JSON.parse(c[0].value) : c[0].value) };
    } catch (e) {}

    const pautas = (await sb(`pautas_misa?select=id,titulo,fecha,hora,lugar,publicada&publicada=eq.true&fecha=gte.${restarDias(hoy, 2)}&order=fecha.asc`)) || [];
    // Si el admin fijó otra fecha para el Check in, vale para la próxima misa (igual que en la app)
    const proxima = pautas.find((p) => p.fecha >= hoy);
    const efectiva = pautas.map((p) => ({ ...p, fecha: cfg.fecha && proxima && proxima.id === p.id ? cfg.fecha : p.fecha }));

    // Cerradas = ya pasó su día, o es hoy y ya pasó la hora de término
    const cerradas = efectiva.filter((p) => p.fecha < hoy || (p.fecha === hoy && ahora > cfg.hasta));
    if (!cerradas.length) return res.status(200).json({ ok: true, dry, nota: "Nada que cerrar todavía", hoy, ahora, hasta: cfg.hasta });

    const integrantes = ((await sb("integrantes?select=id,nombre,cuerda,acceso,asistencia_especial&acceso=eq.aprobado")) || []).filter(
      (m) => m.cuerda && m.cuerda.trim() !== "" && m.cuerda !== "Admin" && !m.asistencia_especial
    );

    const resumen = [];
    for (const p of cerradas) {
      const marca = `checkin_cerrado_${p.id}_${p.fecha}`;
      const ya = await sb(`config?select=key&key=eq.${encodeURIComponent(marca)}&limit=1`);
      if (ya && ya.length) continue;

      // Solo quienes podían ver la pauta (si el admin la restringió)
      let permitidos = null;
      try {
        const a = await sb(`config?select=value&key=eq.${encodeURIComponent("pauta_acceso_" + p.id)}&limit=1`);
        if (a && a[0] && a[0].value) {
          const v = typeof a[0].value === "string" ? JSON.parse(a[0].value) : a[0].value;
          if (v && v.restringida) permitidos = new Set((v.ids || []).map(String));
        }
      } catch (e) {}
      const objetivo = integrantes.filter((m) => !permitidos || permitidos.has(String(m.id)));

      // Evento de misa de ese día (el que usa el admin para pasar lista); si no existe, se crea
      const evs = (await sb(`eventos?select=id,tipo&fecha=eq.${p.fecha}`)) || [];
      let ev = evs.find((e) => e.tipo === "misa");
      if (!ev && !dry) {
        const nv = await sb("eventos", {
          method: "POST",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify({ titulo: p.titulo || "Misa", fecha: p.fecha, hora: p.hora || "", lugar: p.lugar || "", tipo: "misa", descripcion: "Creado por Check in" }),
        });
        ev = Array.isArray(nv) ? nv[0] : nv;
      }
      if (!ev) {
        resumen.push({ pauta: p.titulo, fecha: p.fecha, ausentes: objetivo.length, nota: dry ? "simulación (se crearía el evento)" : "sin evento" });
        continue;
      }
      const eid = String(ev.id);
      const reg = (await sb(`asistencia?select=member_id&evento_id=eq.${encodeURIComponent(eid)}`)) || [];
      const con = new Set(reg.map((r) => String(r.member_id)));
      const faltan = objetivo.filter((m) => !con.has(String(m.id)));

      if (!dry && faltan.length) {
        await sb("asistencia?on_conflict=evento_id,member_id", {
          method: "POST",
          headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify(faltan.map((m) => ({ evento_id: eid, member_id: m.id, estado: "ausente" }))),
        });
      }
      if (!dry) {
        await sb("config", {
          method: "POST",
          headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ key: marca, value: JSON.stringify({ ausentes: faltan.length, en: new Date().toISOString() }) }),
        });
      }
      resumen.push({ pauta: p.titulo, fecha: p.fecha, ausentes: faltan.length, nombres: dry ? faltan.map((m) => m.nombre) : undefined });
    }
    return res.status(200).json({ ok: true, dry, hoy, ahora, resumen });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
