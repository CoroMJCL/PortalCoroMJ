// /api/contar-dispositivos.js
// Función de servidor (Vercel) que consulta OneSignal el número real de
// dispositivos suscritos. Se hace desde el servidor porque el navegador
// no puede llamar a la API de OneSignal directamente (lo bloquea CORS).

export default async function handler(req, res) {
  const APP_ID = process.env.ONESIGNAL_APP_ID || "1a1810db-f41f-4b1f-95ac-a887eed0c100";
  const API_KEY = process.env.ONESIGNAL_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: "Falta ONESIGNAL_API_KEY en variables de entorno" });
  }

  try {
    const r = await fetch(`https://api.onesignal.com/apps/${APP_ID}`, {
      headers: { Authorization: `Key ${API_KEY}` },
    });
    const data = await r.json();

    // OneSignal puede devolver el conteo en distintos campos según versión.
    // Probamos varios y nos quedamos con el primero que exista.
    const total =
      data.messageable_players ??
      data.players ??
      data.basic_players ??
      data.subscribed_users ??
      0;

    return res.status(200).json({
      ok: true,
      total,
      // datos crudos por si se quieren inspeccionar
      raw: { players: data.players, messageable_players: data.messageable_players },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
