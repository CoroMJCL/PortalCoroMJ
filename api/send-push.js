// /api/send-push.js
// Función serverless de Vercel para enviar notificaciones push vía OneSignal.
// IMPORTANTE: esto se ejecuta en el SERVIDOR, no en el navegador, por eso
// sí puede llamar a la API REST de OneSignal (el navegador la bloquea por CORS).
//
// Coloca este archivo en la carpeta /api de tu proyecto (Vercel lo expone
// automáticamente como el endpoint  https://tu-dominio.vercel.app/api/send-push ).
//
// CONFIGURA estas variables de entorno en Vercel (Settings → Environment Variables):
//   ONESIGNAL_APP_ID   = 1a1810db-f41f-4b1f-95ac-a887eed0c100
//   ONESIGNAL_API_KEY  = (tu REST API Key de OneSignal, la que empieza con os_v2_app_...)
// Si no las configuras, usa los valores de respaldo de abajo (no recomendado por seguridad).

const APP_ID = process.env.ONESIGNAL_APP_ID || "1a1810db-f41f-4b1f-95ac-a887eed0c100";
const API_KEY =
  process.env.ONESIGNAL_API_KEY ||
  "os_v2_app_dimbbw7ud5fr7fnmvcd65ugbaaqq47nxpvvuqee6a6s4lbzvsjkrr6mrjtb6gukmjsnlrhayze2phre25ndzkwpczhoeetgocc5do7q";

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { title, body, url } = req.body || {};

    if (!title) {
      res.status(400).json({ error: "Falta el título de la notificación" });
      return;
    }

    const destinoUrl = url
      ? (url.startsWith("http") ? url : `https://portal-coro-mj.vercel.app${url}`)
      : "https://portal-coro-mj.vercel.app/";

    const osResp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${API_KEY}`,
      },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ["Total Subscriptions"],
        headings: { en: title, es: title },
        contents: { en: body || title, es: body || title },
        url: destinoUrl,
      }),
    });

    const data = await osResp.json();

    if (!osResp.ok) {
      // OneSignal devolvió un error: lo reenviamos para poder diagnosticar
      res.status(osResp.status).json({ ok: false, onesignal: data });
      return;
    }

    // data.recipients indica a cuántos dispositivos se envió
    res.status(200).json({ ok: true, recipients: data.recipients ?? null, id: data.id ?? null, onesignal: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
