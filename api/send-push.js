// /api/send-push.js
const APP_ID = process.env.ONESIGNAL_APP_ID || "6a0eb997-07a6-4de5-b4dd-98fc75a4a3ab";
const API_KEY = process.env.ONESIGNAL_API_KEY;

const SITE_URL = "https://coromisionerosdejesus.cl";

// OneSignal tiene dos formatos de REST API Key:
//  - "Legacy API Key": usa el header  Authorization: Basic <key>
//  - Key nueva (os_v2_app_...): usa    Authorization: Key <key>
// Para no depender de cuál pegaste en Vercel, detectamos el formato.
function authHeader(key) {
  return key.startsWith("os_v2_") ? `Key ${key}` : `Basic ${key}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  if (!API_KEY) {
    return res.status(500).json({
      ok: false,
      error: "Falta ONESIGNAL_API_KEY en Vercel (REST API Key de la app 6a0eb997…).",
    });
  }
  try {
    const { title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: "Falta el título" });

    const destinoUrl = url
      ? (url.startsWith("http") ? url : `${SITE_URL}${url}`)
      : `${SITE_URL}/`;

    const payload = {
      app_id: APP_ID,
      target_channel: "push",
      included_segments: ["Subscribed Users"],
      headings: { en: title, es: title },
      contents: { en: body || title, es: body || title },
      url: destinoUrl,
    };

    const osResp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(API_KEY),
      },
      body: JSON.stringify(payload),
    });

    const data = await osResp.json();

    if (!osResp.ok) {
      return res.status(osResp.status).json({ ok: false, app_id: APP_ID, onesignal: data });
    }
    if (!data.recipients || data.recipients === 0) {
      return res.status(200).json({
        ok: false,
        error: "OneSignal aceptó pero recipients: 0. Revisa que la REST API Key sea de la app 6a0eb997… y esté activa.",
        app_id: APP_ID,
        auth_usado: API_KEY.startsWith("os_v2_") ? "Key (nueva)" : "Basic (legacy)",
        onesignal: data,
      });
    }
    return res.status(200).json({ ok: true, recipients: data.recipients ?? null, id: data.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
