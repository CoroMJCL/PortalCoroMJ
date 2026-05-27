// ═══════════════════════════════════════════════
//  Service Worker — Coro MJ Push Notifications
//  Coloca este archivo en: public/sw.js
// ═══════════════════════════════════════════════

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// Recibir notificación push
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data?.json() || {};
  } catch {
    data = { title: "Coro MJ", body: e.data?.text() || "" };
  }

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    vibrate: [200, 100, 200],
    tag: "coro-mj",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Ver" },
      { action: "close", title: "Cerrar" },
    ],
  };

  e.waitUntil(
    self.registration.showNotification(data.title || "📢 Coro MJ", options)
  );
});

// Clic en la notificación
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "close") return;
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
