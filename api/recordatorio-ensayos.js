// /api/recordatorio-ensayos.js
//
// Recordatorios push de la Pauta de Ensayo (listas de cantos para ensayar), 2 veces al día,
// para quienes aún no han abierto una lista publicada y vigente.
//
// Cómo funciona (sin plan pagado): el cron diario de la mañana (recordatorio-pautas) llama a
// recordarEnsayos(): envía el aviso de la mañana y deja PROGRAMADO en OneSignal (send_after)
// el de la tarde (19:00 Chile) para cada persona que tiene listas pendientes.
// Cuando el integrante abre la lista, la app llama a /api/recordatorio-ensayos?mid=<id>&visto=1
// y, si ya no le queda ninguna lista por revisar, se cancela su aviso de la tarde.
//
// Datos: config "pensayo_<id>" (lista), "pauta_acceso_<id>" (acceso), "pv_<id>_<integrante>" (revisión),
//        config "ensayo_rec_<YYYY-MM-DD>" = { <integranteId>: <idNotificaciónTarde> }
//
//   /api/recordatorio-ensayos?dry=1   → solo muestra qué haría

const SB_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YmlwYmhmc3djd3dnY3dhaXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA1MDExNiwiZXhwIjoyMDk0NjI2MTE2fQ.brVGJoNX6dBEC7Z6wQIQ4RxrqrxkGt7EFkAjpZmqCMs";
const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
const OS_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = "https://coromisionerosdejesus.cl";
const HORA_TARDE = "19:00";
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
async function guardarConfig(key, value) {
  await sb("config", {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value: JSON.stringify(value) }),
  });
}

// Listas vigentes y, por integrante, cuáles le faltan por revisar
async function pendientes(hoy, soloMid) {
  const rows = (await sb(`config?select=key,value&key=like.${encodeURIComponent("pensayo_")}*`)) || [];
  const listas = rows
    .filter((r) => r.key.startsWith("pensayo_"))
    .map((r) => ({ ...(parse(r.value) || {}), id: r.key.slice("pensayo_".length) }))
    .filter((l) => l.publicada && !l.cerrada && !l.borrada && (!l.fecha || l.fecha >= hoy));
  if (!listas.length) return { listas, pend: {} };

  let miembros = ((await sb("integrantes?select=id,cuerda,acceso&acceso=eq.aprobado")) || []).filter(
    (m) => m.cuerda && m.cuerda.trim() !== "" && m.cuerda !== "Admin" && m.cuerda !== "Músico" && m.cuerda !== "Visita"
  );
  if (soloMid) miembros = miembros.filter((m) => String(m.id) === String(soloMid));

  const pend = {};
  for (const l of listas) {
    const acc = await sb(`config?select=value&key=eq.${encodeURIComponent("pauta_acceso_" + l.id)}&limit=1`);
    const ac = acc && acc[0] ? parse(acc[0].value) : null;
    const permitidos = ac && ac.restringida ? new Set((ac.ids || []).map(String)) : null;
    const pref = "pv_" + l.id + "_";
    const vistos = new Set(
      ((await sb(`config?select=key&key=like.${encodeURIComponent(pref)}*`)) || [])
        .filter((r) => r.key.startsWith(pref))
        .map((r) => r.key.slice(pref.length).split("_")[0])
    );
    for (const m of miembros) {
      const mid = String(m.id);
      if (permitidos && !permitidos.has(mid)) continue;
      if (vistos.has(mid)) continue;
      (pend[mid] = pend[mid] || []).push(l);
    }
  }
  return { listas, pend };
}

function textos(ls) {
  const title = ls.length === 1 ? "🎶 Cantos para ensayar" : `🎶 Tienes ${ls.length} listas de ensayo por revisar`;
  const body =
    ls.length === 1
      ? `Aún no revisas la lista «${ls[0].titulo}» (${(ls[0].canciones || []).length} cantos). Ábrela y prepárate para el ensayo.`
      : "Aún no revisas: " + ls.map((l) => l.titulo).join(" · ");
  return { title, body, url: SITE_URL + (ls.length === 1 ? `/?ensayo=${encodeURIComponent(ls[0].id)}` : "/") };
}

// Llamado por el cron diario: aviso de la mañana + aviso de la tarde programado
export async function recordarEnsayos({ dry = false } = {}) {
  const { fecha: hoy, hora: ahora } = ahoraChile();
  const { listas, pend } = await pendientes(hoy);
  if (!listas.length) return { ok: true, nota: "Sin listas de ensayo vigentes" };

  const regKey = "ensayo_rec_" + hoy;
  const regRow = await sb(`config?select=value&key=eq.${encodeURIComponent(regKey)}&limit=1`);
  const reg = (regRow && regRow[0] && parse(regRow[0].value)) || {};
  const tarde = chileAUtc(hoy, HORA_TARDE);
  const programarTarde = ahora < HORA_TARDE;
  let enviados = 0;
  let programados = 0;

  // Mañana: un mensaje por grupo de personas con las mismas listas pendientes
  const grupos = {};
  for (const [mid, ls] of Object.entries(pend)) {
    const k = ls.map((l) => l.id).join(",");
    (grupos[k] = grupos[k] || { ls, ids: [] }).ids.push(mid);
  }
  for (const g of Object.values(grupos)) {
    const t = textos(g.ls);
    if (dry || !OS_KEY) {
      enviados += g.ids.length;
      continue;
    }
    for (let i = 0; i < g.ids.length; i += 1000) {
      const r = await onesignal("notifications", "POST", {
        app_id: APP_ID,
        target_channel: "push",
        include_aliases: { external_id: g.ids.slice(i, i + 1000) },
        headings: { en: t.title, es: t.title },
        contents: { en: t.body, es: t.body },
        url: t.url,
      });
      if (r.ok) enviados += r.data.recipients || 0;
    }
  }

  // Tarde: programado por persona, para poder cancelarlo si revisa la lista durante el día
  if (programarTarde) {
    for (const [mid, ls] of Object.entries(pend)) {
      if (reg[mid]) continue;
      programados++;
      if (dry || !OS_KEY) continue;
      const t = textos(ls);
      const r = await onesignal("notifications", "POST", {
        app_id: APP_ID,
        target_channel: "push",
        include_aliases: { external_id: [mid] },
        headings: { en: t.title, es: t.title },
        contents: { en: t.body, es: t.body },
        url: t.url,
        send_after: fmtOneSignal(tarde),
      });
      if (r.ok && r.data && r.data.id) reg[mid] = r.data.id;
    }
    if (!dry && OS_KEY) await guardarConfig(regKey, reg);
  }
  return { ok: true, dry, listas: listas.map((l) => l.titulo), pendientes: Object.keys(pend).length, enviados, programados };
}

// El integrante abrió una lista: si ya no le queda ninguna pendiente, se cancela su aviso de la tarde
async function alVerLista(mid) {
  const { fecha: hoy, hora: ahora } = ahoraChile();
  if (ahora >= HORA_TARDE) return { ok: true, nota: "El aviso de la tarde ya salió" };
  const regKey = "ensayo_rec_" + hoy;
  const regRow = await sb(`config?select=value&key=eq.${encodeURIComponent(regKey)}&limit=1`);
  const reg = (regRow && regRow[0] && parse(regRow[0].value)) || {};
  if (!reg[mid]) return { ok: true, nota: "Sin aviso programado" };
  const { pend } = await pendientes(hoy, mid);
  if (pend[mid] && pend[mid].length) return { ok: true, nota: "Aún tiene listas por revisar" };
  if (OS_KEY) await onesignal(`notifications/${reg[mid]}?app_id=${APP_ID}`, "DELETE").catch(() => {});
  delete reg[mid];
  await guardarConfig(regKey, reg);
  return { ok: true, cancelado: true };
}

export default async function handler(req, res) {
  const dry = req.query?.dry === "1";
  const mid = req.query?.mid ? String(req.query.mid).replace(/[^0-9a-zA-Z-]/g, "") : null;
  try {
    if (mid && req.query?.visto) return res.status(200).json(await alVerLista(mid));
    // Envío manual: protegido igual que el cron (si hay CRON_SECRET); la vista previa (dry) es libre
    const secret = process.env.CRON_SECRET;
    if (!dry && secret && req.headers.authorization !== `Bearer ${secret}` && req.query?.key !== secret) {
      return res.status(401).json({ ok: false, error: "No autorizado" });
    }
    if (!OS_KEY && !dry) return res.status(500).json({ ok: false, error: "Falta ONESIGNAL_API_KEY" });
    return res.status(200).json(await recordarEnsayos({ dry }));
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
