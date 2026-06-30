// ════════════════════════════════════════════════════════════════════════
//  /api/claude.js  —  Proxy de servidor para la API de Anthropic (Claude)
// ════════════════════════════════════════════════════════════════════════
//
//  Por qué existe este archivo:
//  El navegador NO debe llamar a api.anthropic.com directamente, porque eso
//  (a) expone la clave a cualquiera que abra las herramientas de desarrollo y
//  (b) devuelve 401 al desplegar. Esta función corre en el servidor de Vercel,
//  añade la clave desde la variable de entorno ANTHROPIC_API_KEY y reenvía la
//  respuesta tal cual la entrega Anthropic ({ content: [...] }).
//
//  Configuración (una sola vez):
//   1. Vercel → tu proyecto → Settings → Environment Variables
//   2. Agrega:  ANTHROPIC_API_KEY = sk-ant-api03-...   (entorno Production)
//   3. Redeploy.
//
//  Lo usa AppMax.jsx para: el evangelio del domingo y la extracción de
//  acordes desde PDF/imagen. El frontend manda el cuerpo de la Messages API
//  (model, messages, max_tokens, tools…) y aquí solo se le agrega la clave.
// ════════════════════════════════════════════════════════════════════════

export const config = {
  // El evangelio usa web_search y puede tardar; subimos el límite de tiempo.
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS básico (mismo origen, pero por si se llama desde otro front)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Falta ANTHROPIC_API_KEY en Vercel. Agrégala en Settings → Environment Variables y vuelve a desplegar.",
    });
  }

  // El cuerpo puede llegar ya parseado (Vercel lo hace con Content-Type JSON)
  // o como string/stream; lo normalizamos.
  let payload = req.body;
  try {
    if (typeof payload === "string") payload = JSON.parse(payload);
    if (!payload || typeof payload !== "object") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    }
  } catch {
    return res.status(400).json({ error: "Cuerpo JSON inválido." });
  }

  if (!payload.model || !Array.isArray(payload.messages)) {
    return res
      .status(400)
      .json({ error: "Faltan 'model' o 'messages' en la petición." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(() => ({
      error: "Respuesta no-JSON de Anthropic",
    }));

    // Si Anthropic devolvió un error, lo propagamos con su mismo código.
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || data?.error || "Error de Anthropic",
        status: upstream.status,
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res
      .status(502)
      .json({ error: "No se pudo contactar a Anthropic: " + String(e) });
  }
}
