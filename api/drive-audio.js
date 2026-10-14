// /api/drive-audio?id=<ID_DE_ARCHIVO_DE_DRIVE>
//
// Puente para leer audios/PDF de Google Drive desde el portal. El navegador no
// puede pedirlos directo a la API de Drive (bloqueo CORS); este puente los pide
// desde el servidor y los entrega desde el mismo dominio del portal.
// Corre en el "edge" de Vercel para poder transmitir archivos grandes sin límite de 4.5 MB.
export const config = { runtime: "edge" };

const KEY = process.env.GDRIVE_API_KEY || "AIzaSyAHncVhw60TS60FQIvwUwfGkLsJEO4XTuE";

export default async function handler(req) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) {
    return new Response("id inválido", { status: 400 });
  }
  const headers = {};
  const range = req.headers.get("range");
  if (range) headers.Range = range;
  let r;
  try {
    r = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true&key=${KEY}`,
      { headers }
    );
  } catch (e) {
    return new Response("No se pudo contactar a Drive: " + e.message, { status: 502 });
  }
  if (!r.ok && r.status !== 206) {
    const txt = await r.text().catch(() => "");
    return new Response(`Drive respondió ${r.status}. ${txt.slice(0, 300)}`, {
      status: r.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const out = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges"].forEach((h) => {
    const v = r.headers.get(h);
    if (v) out.set(h, v);
  });
  out.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return new Response(r.body, { status: r.status, headers: out });
}
