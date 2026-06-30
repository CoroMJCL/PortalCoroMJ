// /api/send-push.js
//
// IMPORTANTE: el App ID DEBE ser el mismo que usa el frontend (AppMax.jsx),
// porque ahí es donde los dispositivos quedan suscritos. El frontend usa
// 6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab. Si aquí se apunta a otra app de
// OneSignal, el envío "no encuentra destinatarios" (recipients: 0) aunque
// haya gente suscrita.
const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
// La REST API Key NO se hardcodea (es secreta y debe pertenecer a la MISMA app
// 6a0eb997…). Se toma solo de la variable de entorno ONESIGNAL_API_KEY en Vercel.
const API_KEY = process.env.ONESIGNAL_API_KEY;

const SITE_URL = "https://coromisionerosdejesus.cl";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  if (!API_KEY) {
    return res.status(500).json({
      ok: false,
      error:
        "Falta ONESIGNAL_API_KEY en Vercel. Debe ser la REST API Key de la app 6a0eb997… (Settings → Keys & IDs de esa app).",
    });
  }
  try {
    const { title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: "Falta el título" });

    const destinoUrl = url
      ? (url.startsWith("http") ? url : `${SITE_URL}${url}`)
      : `${SITE_URL}/`;

    const osResp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${API_KEY}`,
      },
      body: JSON.stringify({
        app_id: APP_ID,
        target_channel: "push",
        included_segments: ["Subscribed Users"],
        headings: { en: title, es: title },
        contents: { en: body || title, es: body || title },
        url: destinoUrl,
      }),
    });

    const data = await osResp.json();

    if (!osResp.ok) {
      return res.status(osResp.status).json({ ok: false, app_id: APP_ID, onesignal: data });
    }
    if (!data.recipients || data.recipients === 0) {
      return res.status(200).json({
        ok: false,
        error:
          "OneSignal aceptó la notificación pero no encontró destinatarios (recipients: 0). Verifica que ONESIGNAL_APP_ID y ONESIGNAL_API_KEY correspondan a la app 6a0eb997… (la misma del frontend).",
        app_id: APP_ID,
        onesignal: data,
      });
    }
    return res.status(200).json({ ok: true, recipients: data.recipients ?? null, id: data.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
