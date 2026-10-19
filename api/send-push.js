// /api/send-push.js  —  versión definitiva
//
// Envía notificaciones push de forma confiable evitando el bug de OneSignal en
// el que el envío por segmento ("Subscribed Users") devuelve recipients: 0 por
// API aunque sí funcione desde el dashboard.
//
// Estrategia (en orden):
//   1) Si te pasan subscriptionIds, envía directo a ellos.
//   2) Pregunta a OneSignal la lista REAL de dispositivos suscritos y envía a
//      sus subscription IDs (include_subscription_ids). Esto siempre funciona.
//   3) Como último recurso, intenta el segmento clásico (sin target_channel).
//
// Variables de entorno en Vercel:
//   ONESIGNAL_APP_ID  = 6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab
//   ONESIGNAL_API_KEY = REST API Key de esa app (os_v2_app_... o legacy)
//   ONESIGNAL_LEGACY_KEY = (opcional) Legacy REST API Key, solo si la key
//                          os_v2 no pudiera listar dispositivos.

const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
const API_KEY = process.env.ONESIGNAL_API_KEY;
const LEGACY_KEY = process.env.ONESIGNAL_LEGACY_KEY || "";
const SITE_URL = "https://coromisionerosdejesus.cl";

function authHeader(key) {
  return key.startsWith("os_v2_") ? `Key ${key}` : `Basic ${key}`;
}

// Pide a OneSignal la lista de subscriptions y devuelve los IDs realmente suscritos.
async function listarSuscritos() {
  return (await listarSuscritosDetalle()).map((x) => x.id);
}

// Igual que listarSuscritos pero devuelve también el external_id (id del integrante) de cada dispositivo.
async function listarSuscritosDetalle() {
  const ids = [];
  const limit = 300;
  const keysAProbar = LEGACY_KEY ? [LEGACY_KEY, API_KEY] : [API_KEY];

  for (const key of keysAProbar) {
    ids.length = 0;
    let offset = 0;
    let ok = true;
    for (let pagina = 0; pagina < 10; pagina++) {
      const r = await fetch(
        `https://onesignal.com/api/v1/players?app_id=${APP_ID}&limit=${limit}&offset=${offset}`,
        { headers: { Authorization: authHeader(key) } }
      );
      if (!r.ok) { ok = false; break; } // esta key no sirve para listar, probar la otra
      const data = await r.json();
      const players = data.players || [];
      for (const p of players) {
        if (!p.id) continue;
        const subscrito =
          typeof p.notification_types === "number"
            ? p.notification_types > 0
            : p.invalid_identifier === false;
        if (subscrito) ids.push({ id: p.id, ext: p.external_user_id || null });
      }
      if (players.length < limit) break;
      offset += limit;
    }
    if (ok) return ids; // logramos listar con esta key
  }
  throw new Error("No se pudo listar dispositivos con la(s) key(s) disponibles.");
}

async function enviar(payload) {
  const r = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(API_KEY) },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  if (!API_KEY) return res.status(500).json({ ok: false, error: "Falta ONESIGNAL_API_KEY en Vercel." });

  try {
    const { title, body, url, subscriptionIds } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: "Falta el título" });

    const destinoUrl = url ? (url.startsWith("http") ? url : `${SITE_URL}${url}`) : `${SITE_URL}/`;
    const base = {
      app_id: APP_ID,
      headings: { en: title, es: title },
      contents: { en: body || title, es: body || title },
      url: destinoUrl,
    };

    // 0) Integrantes concretos (external_id = id del integrante): solo a ellos.
    const { externalIds } = req.body || {};
    if (Array.isArray(externalIds) && externalIds.length > 0) {
      const ids = externalIds.map(String);
      let recipients = 0;
      let ultimo = null;
      let via = "external_ids";
      let detalle = null;
      for (let i = 0; i < ids.length; i += 1000) {
        const r = await enviar({ ...base, target_channel: "push", include_aliases: { external_id: ids.slice(i, i + 1000) } });
        ultimo = r.data;
        recipients += r.data?.recipients || 0;
      }
      if (recipients === 0) {
        // Plan B: buscar los dispositivos suscritos que pertenecen a esos integrantes y enviarles por su ID de dispositivo.
        try {
          const subs = await listarSuscritosDetalle();
          const set = new Set(ids);
          const subIds = subs.filter((x) => x.ext && set.has(String(x.ext))).map((x) => x.id);
          if (subIds.length > 0) {
            via = "dispositivos_por_integrante";
            for (let i = 0; i < subIds.length; i += 1000) {
              const r = await enviar({ ...base, target_channel: "push", include_subscription_ids: subIds.slice(i, i + 1000) });
              ultimo = r.data;
              recipients += r.data?.recipients || 0;
            }
          } else if (req.body.fallbackTodos && subs.length > 0) {
            // Pauta sin restricción: si ningún dispositivo está identificado con su integrante, se avisa a todos los dispositivos suscritos.
            via = "todos_los_dispositivos";
            const todos = subs.map((x) => x.id);
            for (let i = 0; i < todos.length; i += 1000) {
              const r = await enviar({ ...base, target_channel: "push", include_subscription_ids: todos.slice(i, i + 1000) });
              ultimo = r.data;
              recipients += r.data?.recipients || 0;
            }
          } else {
            detalle = { dispositivos_suscritos: subs.length, identificados_con_integrante: subs.filter((x) => x.ext).length, integrantes_a_avisar: ids.length };
          }
        } catch (e) {
          detalle = { error: String(e?.message || e) };
        }
      }
      return res.status(200).json({ ok: recipients > 0, via, recipients, detalle, onesignal: ultimo });
    }

    // 1) IDs explícitos (si los pasan).
    if (Array.isArray(subscriptionIds) && subscriptionIds.length > 0) {
      const r = await enviar({ ...base, target_channel: "push", include_subscription_ids: subscriptionIds });
      const recipients = r.data?.recipients || 0;
      return res.status(200).json({ ok: recipients > 0, via: "ids_explicitos", recipients, onesignal: r.data });
    }

    // 2) Listar suscritos reales y enviar a sus IDs (camino confiable).
    let listaError = null;
    try {
      const ids = await listarSuscritos();
      if (ids.length > 0) {
        const r = await enviar({ ...base, target_channel: "push", include_subscription_ids: ids });
        const recipients = r.data?.recipients || 0;
        if (r.ok && recipients > 0) {
          return res.status(200).json({ ok: true, via: "lista_suscritos", recipients, id: r.data.id, total_dispositivos: ids.length });
        }
        listaError = { intento: "lista_suscritos", total_ids: ids.length, onesignal: r.data };
      } else {
        listaError = { intento: "lista_suscritos", total_ids: 0, nota: "OneSignal no devolvió dispositivos suscritos." };
      }
    } catch (e) {
      listaError = { intento: "lista_suscritos", error: String(e?.message || e) };
    }

    // 3) Último recurso: segmento clásico SIN target_channel.
    const seg = await enviar({ ...base, included_segments: ["Subscribed Users"] });
    const segRecipients = seg.data?.recipients || 0;
    if (seg.ok && segRecipients > 0) {
      return res.status(200).json({ ok: true, via: "segmento", recipients: segRecipients, id: seg.data.id });
    }

    return res.status(200).json({
      ok: false,
      error: "No se encontraron destinatarios. Revisa el detalle.",
      app_id: APP_ID,
      auth_usado: API_KEY.startsWith("os_v2_") ? "Key (nueva)" : "Basic (legacy)",
      detalle_lista: listaError,
      detalle_segmento: seg.data,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
