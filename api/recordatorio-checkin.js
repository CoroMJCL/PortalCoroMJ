// /api/recordatorio-checkin.js
//
// Recordatorio push "marca tu asistencia" el día de la misa, a la hora en que se abre el
// Check in (Administración → Check in, por defecto 17:00). Solo a quienes confirmaron
// "Sí voy" en la convocatoria de esa misa.
//
// Cómo funciona (sin plan pagado): Vercel Hobby solo permite crons diarios e imprecisos,
// así que el cron de la mañana (recordatorio-pautas) llama a esta función y deja cada
// aviso PROGRAMADO en OneSignal (send_after) para la hora exacta. Si alguien responde
// "Sí" ese mismo día más tarde, la app llama a /api/recordatorio-checkin?mid=<id> y se
// programa solo el suyo. Si su respuesta cambia a "No", se cancela su aviso.
// Es seguro ejecutarlo varias veces: lo ya programado queda guardado en
// config.checkin_recordatorio_<pautaId> y no se repite.
//
//   /api/recordatorio-checkin          → programa los de hoy
//   /api/recordatorio-checkin?dry=1    → solo muestra qué haría

const SB_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YmlwYmhmc3djd3dnY3dhaXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA1MDExNiwiZXhwIjoyMDk0NjI2MTE2fQ.brVGJoNX6dBEC7Z6wQIQ4RxrqrxkGt7EFkAjpZmqCMs";
const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
const OS_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = "https://coromisionerosdejesus.cl";
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sb(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]}: ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const parse = (v) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch (e) {
    return null;
  }
};

function ahoraChile() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
// Fecha y hora de Chile → instante UTC (respeta horario de verano/invierno)
function chileAUtc(fecha, hhmm) {
  const [y, mo, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess)).map((x) => [x.type, x.value])
  );
  const comoChile = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess + (guess - comoChile));
}
const fmtOneSignal = (dt) => dt.toISOString().replace("T", " ").slice(0, 19) + " GMT+0000";

async function onesignal(path, method, body) {
  const r = await fetch(`https://api.onesignal.com/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: OS_KEY.startsWith("os_v2_") ? `Key ${OS_KEY}` : `Basic ${OS_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

// Programa (o cancela) los recordatorios de Check in de hoy. soloMid: solo esa persona.
export async function programarRecordatoriosCheckin({ dry = false, soloMid = null } = {}) {
  const { fecha: hoy, hora: ahora } = ahoraChile();

  let cfg = { desde: "17:00", hasta: "19:59", fecha: "" };
  try {
    const c = await sb("config?select=value&key=eq.checkin_config&limit=1");
    if (c && c[0] && c[0].value) cfg = { ...cfg, ...(parse(c[0].value) || {}) };
  } catch (e) {}
  if (ahora > cfg.hasta) return { ok: true, nota: "El Check in de hoy ya cerró", hoy, ahora };

  // Pauta de hoy (con la fecha que haya fijado el admin para la próxima misa, igual que la app)
  const pautas = (await sb(`pautas_misa?select=id,titulo,fecha,hora,publicada&publicada=eq.true&fecha=gte.${hoy}&order=fecha.asc`)) || [];
  const proxima = pautas[0];
  const pauta = pautas
    .map((p) => ({ ...p, fecha: cfg.fecha && proxima && proxima.id === p.id ? cfg.fecha : p.fecha }))
    .find((p) => p.fecha === hoy);
  if (!pauta) return { ok: true, nota: "Hoy no hay misa con pauta publicada", hoy };

  // Convocatoria de hoy y respuestas
  const conv = await sb(`config?select=value&key=eq.${encodeURIComponent("misaconv_" + hoy)}&limit=1`);
  const cv = conv && conv[0] ? parse(conv[0].value) : null;
  if (!cv || cv.borrada) return { ok: true, nota: "Hoy no hay convocatoria", hoy };
  const resps = (await sb(`config?select=key,value&key=like.${encodeURIComponent("misaresp_" + hoy + "_")}*`)) || [];
  const resp = {};
  for (const r of resps) {
    const v = parse(r.value);
    if (v && v.r) resp[r.key.slice(("misaresp_" + hoy + "_").length)] = v.r;
  }

  const miembros = ((await sb("integrantes?select=id,cuerda,acceso&acceso=eq.aprobado")) || []).filter(
    (m) => m.cuerda && m.cuerda.trim() !== "" && m.cuerda !== "Admin" && m.cuerda !== "Músico"
  );
  // Misa marcada «Sin Check in» (misa especial de semana): nadie recibe el aviso y se cancela lo ya programado
  let sinCheckin = false;
  try {
    const sc = await sb("config?select=value&key=eq.pautas_sin_checkin&limit=1");
    const arr = sc && sc[0] ? parse(sc[0].value) : [];
    sinCheckin = Array.isArray(arr) && arr.map(String).includes(String(pauta.id));
  } catch (e) {}
  const confirmados = sinCheckin ? new Set() : new Set(miembros.filter((m) => resp[String(m.id)] === "si").map((m) => String(m.id)));

  // Lo ya programado
  const regKey = "checkin_recordatorio_" + pauta.id;
  const regRow = await sb(`config?select=value&key=eq.${encodeURIComponent(regKey)}&limit=1`);
  const reg = (regRow && regRow[0] && parse(regRow[0].value)) || {};

  const candidatos = soloMid ? [String(soloMid)] : [...new Set([...confirmados, ...Object.keys(reg)])];
  const enviarEn = chileAUtc(hoy, cfg.desde);
  const yaAbierto = ahora >= cfg.desde;
  const title = "📍 Marca tu asistencia";
  const body = `Hoy hay misa${pauta.hora ? " a las " + pauta.hora : ""}. Al llegar a la capilla abre el portal y haz tu Check in antes de las ${cfg.hasta}.`;
  const out = { programados: [], cancelados: [], hora: cfg.desde, pauta: pauta.titulo || "Misa" };
  let cambio = false;

  for (const mid of candidatos) {
    const va = confirmados.has(mid);
    if (va && !reg[mid]) {
      out.programados.push(mid);
      if (dry || !OS_KEY) continue;
      const r = await onesignal("notifications", "POST", {
        app_id: APP_ID,
        target_channel: "push",
        include_aliases: { external_id: [mid] },
        headings: { en: title, es: title },
        contents: { en: body, es: body },
        url: SITE_URL + "/",
        ...(yaAbierto ? {} : { send_after: fmtOneSignal(enviarEn) }),
      });
      reg[mid] = r.ok && r.data && r.data.id ? r.data.id : "enviado";
      cambio = true;
    } else if (!va && reg[mid]) {
      // Ya no va (o el Encargado cambió su respuesta): se cancela si aún no salió
      out.cancelados.push(mid);
      if (dry || !OS_KEY) continue;
      if (reg[mid] !== "enviado" && !yaAbierto) {
        await onesignal(`notifications/${reg[mid]}?app_id=${APP_ID}`, "DELETE").catch(() => {});
      }
      delete reg[mid];
      cambio = true;
    }
  }

  if (cambio && !dry) {
    await sb("config", {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: regKey, value: JSON.stringify(reg) }),
    });
  }
  return { ok: true, dry, hoy, ...out, programados: out.programados.length, cancelados: out.cancelados.length };
}

export default async function handler(req, res) {
  const dry = req.query?.dry === "1";
  const mid = req.query?.mid ? String(req.query.mid).replace(/[^0-9a-zA-Z-]/g, "") : null;
  if (!OS_KEY && !dry) return res.status(500).json({ ok: false, error: "Falta ONESIGNAL_API_KEY" });
  try {
    return res.status(200).json(await programarRecordatoriosCheckin({ dry, soloMid: mid }));
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
