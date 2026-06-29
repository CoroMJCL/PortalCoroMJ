// /api/contar-dispositivos.js
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "1a1810db-f41f-4b1f-95ac-a887eed0c100";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || "os_v2_app_dimbbw7ud5fr7fnmvcd65ugbaaqq47nxpvvuqee6a6s4lbzvsjkrr6mrjtb6gukmjsnlrhayze2phre25ndzkwpczhoeetgocc5do7q";

export default async function handler(req, res) {
  try {
    const r = await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}`, {
      headers: { Authorization: `Key ${ONESIGNAL_API_KEY}` },
    });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: await r.text() });
    const data = await r.json();
    return res.status(200).json({ ok: true, total: data.players ?? data.subscribers ?? 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
