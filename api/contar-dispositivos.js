// /api/contar-dispositivos.js
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

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
