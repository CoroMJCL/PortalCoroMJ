// /api/send-push.js
const APP_ID = process.env.ONESIGNAL_APP_ID || "1a1810db-f41f-4b1f-95ac-a887eed0c100";
const API_KEY = process.env.ONESIGNAL_API_KEY || "os_v2_app_dimbbw7ud5fr7fnmvcd65ugbaaqq47nxpvvuqee6a6s4lbzvsjkrr6mrjtb6gukmjsnlrhayze2phre25ndzkwpczhoeetgocc5do7q";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  try {
    const { title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ error: "Falta el título" });
    const destinoUrl = url
      ? (url.startsWith("http") ? url : `https://portal-coro-mj.vercel.app${url}`)
      : "https://portal-coro-mj.vercel.app/";
    const osResp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${API_KEY}` },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ["Subscribed Users"],
        headings: { en: title, es: title },
        contents: { en: body || title, es: body || title },
        url: destinoUrl,
      }),
    });
    const data = await osResp.json();
    if (!osResp.ok) return res.status(osResp.status).json({ ok: false, onesignal: data });
    if (!data.recipients || data.recipients === 0) {
      return res.status(200).json({ ok: false, error: "OneSignal aceptó la notificación pero no encontró destinatarios (recipients: 0). Revisa el segmento configurado.", onesignal: data });
    }
    return res.status(200).json({ ok: true, recipients: data.recipients ?? null, id: data.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
