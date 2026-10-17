try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (e) {}

// ── Modo sin conexión (Modo Misa) ─────────────────────────────────────────
// Guarda la aplicación en el teléfono para que abra sin internet (capilla).
// Las letras (PDF) y la pauta se guardan aparte desde la propia app.
const MJ_CACHE = "mj-offline-v1";
const MJ_BASE = ["/manifest.json", "/LOGOMJ2.png", "/pdfjs/pdf.min.js", "/pdfjs/pdf.worker.min.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const c = await caches.open(MJ_CACHE);
        const r = await fetch("/", { cache: "reload" });
        const html = await r.clone().text();
        await c.put("/", r);
        const assets = [...html.matchAll(/(?:src|href)="(\/static\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all([...MJ_BASE, ...assets].map((u) => c.add(u).catch(() => {})));
      } catch (e) {}
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const ks = await caches.keys();
        await Promise.all(ks.filter((k) => k.startsWith("mj-offline-") && k !== MJ_CACHE).map((k) => caches.delete(k)));
      } catch (e) {}
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mismo = url.origin === self.location.origin;
  const cdn = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!mismo && !cdn) return;
  if (mismo && (url.pathname.startsWith("/api/") || url.pathname.includes("OneSignal"))) return;

  // Páginas: primero la red (con límite de espera); sin red, la copia guardada
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const c = await caches.open(MJ_CACHE);
        try {
          const res = await Promise.race([
            fetch(req),
            new Promise((_, rej) => setTimeout(() => rej(new Error("lento")), 4000)),
          ]);
          if (res && res.ok) c.put("/", res.clone()).catch(() => {});
          return res;
        } catch (e) {
          const guardada = (await c.match("/")) || (await caches.match("/"));
          if (guardada) return guardada;
          return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })()
    );
    return;
  }

  // Archivos de la app, pdf.js y tipografías: copia guardada primero y se actualiza en segundo plano
  event.respondWith(
    (async () => {
      const c = await caches.open(MJ_CACHE);
      const guardada = await c.match(req);
      const red = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      if (guardada) return guardada;
      const res = await red;
      return res || new Response("", { status: 504 });
    })()
  );
});
