// Service Worker para HEHA PWA
const CACHE_NAME = "heha-v1.0.3";
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/firebase-config.js",
  "/manifest.json",
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
];

// Función para agregar cache busting a URLs
function addCacheBusting(url) {
  const separator = url.includes("?") ? "&" : "?";
  return url + separator + "v=" + Date.now();
}

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando nueva versión...");
  // Forzar que el nuevo service worker tome control inmediatamente
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Cacheando archivos");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Service Worker: Error al cachear archivos:", error);
      })
  );
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activando nueva versión...");
  // Tomar control inmediatamente de todas las pestañas
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(
                "Service Worker: Eliminando cache antiguo:",
                cacheName
              );
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las pestañas
      self.clients.claim(),
    ])
  );
});

// Interceptar requests
self.addEventListener("fetch", (event) => {
  // Solo interceptar requests GET
  if (event.request.method !== "GET") {
    return;
  }

  // Estrategia: Cache First para recursos estáticos, Network First para datos dinámicos
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.includes("firebase")
  ) {
    // Para Firebase/Firestore: Network First
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es exitosa, actualizar cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos: Network First con cache busting para recursos críticos
    const isCriticalResource =
      event.request.url.includes("index.html") ||
      event.request.url.includes("app.js") ||
      event.request.url.includes("sw.js");

    if (isCriticalResource) {
      // Para recursos críticos: Network First con cache busting
      event.respondWith(
        fetch(addCacheBusting(event.request.url))
          .then((response) => {
            // Si la respuesta es exitosa, actualizar cache
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Si falla la red, intentar desde cache
            return caches.match(event.request);
          })
      );
    } else {
      // Para otros recursos estáticos: Cache First
      event.respondWith(
        caches.match(event.request).then((response) => {
          // Si está en cache, devolverlo
          if (response) {
            return response;
          }

          // Si no está en cache, hacer fetch y cachear
          return fetch(event.request).then((response) => {
            // Verificar si la respuesta es válida
            if (
              !response ||
              response.status !== 200 ||
              response.type !== "basic"
            ) {
              return response;
            }

            // Clonar la respuesta
            const responseToCache = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
        })
      );
    }
  }
});

// Manejar mensajes del cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CHECK_UPDATE") {
    // Verificar si hay una nueva versión disponible
    self.registration.update().then(() => {
      console.log("Service Worker: Verificación de actualización completada");
    });
  }
});

// Notificar a la aplicación cuando hay una nueva versión
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({
      type: "VERSION_INFO",
      version: CACHE_NAME,
      timestamp: Date.now(),
    });
  }
});

// Notificaciones push para comandas
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push recibido");

  let notificationData = {
    title: "HEHA",
    body: "Nueva notificación de HEHA",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMxMGI5ODEiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDJjNC40MSAwIDggMy41OSA4IDhzLTMuNTkgOC04IDgtOC0zLjU5LTgtOCAzLjU5LTggOC04em0wIDJjLTMuMzEgMC02IDIuNjktNiA2czIuNjkgNiA2IDYgNi0yLjY5IDYtNi0yLjY5LTYtNi02em0wIDJjMi4yMSAwIDQgMS43OSA0IDRzLTEuNzkgNC00IDQtNC0xLjc5LTQtNCAxLjc5LTQgNC00eiIvPgo8L3N2Zz4KPC9zdmc+",
    badge:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMTIiIGZpbGw9IiMxMGI5ODEiLz4KPC9zdmc+",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    silent: false,
    sound:
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuBzvLZizEIHm7A7+OZURE=",
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      type: "comanda",
    },
    actions: [
      {
        action: "view",
        title: "Ver Comanda",
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xNSAzSDZhMiAyIDAgMCAwLTIgMnYxNGEyIDIgMCAwIDAgMiAyaDEwYTIgMiAwIDAgMCAyLTJWNWEyIDIgMCAwIDAtMi0yeiIvPgo8cGF0aCBkPSJNMTAgMTdMMTUgMTJMMTAgNyIvPgo8L3N2Zz4K",
      },
      {
        action: "dismiss",
        title: "Cerrar",
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xOCA2TDYgMThNNiA2bDEyIDEyIi8+Cjwvc3ZnPgo=",
      },
    ],
  };

  // Procesar datos del push si están disponibles
  if (event.data) {
    try {
      const pushData = event.data.json();
      if (pushData.title) notificationData.title = pushData.title;
      if (pushData.body) notificationData.body = pushData.body;
      if (pushData.data)
        notificationData.data = { ...notificationData.data, ...pushData.data };
    } catch (e) {
      // Si no es JSON, usar como texto
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Manejar clics en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notificación clickeada", event.action);

  event.notification.close();

  if (event.action === "view") {
    // Abrir la app y ir a comandas
    event.waitUntil(
      clients.openWindow("/?action=comandas").then(() => {
        // Enviar mensaje a la app para que se abra en comandas
        clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              action: "view_comandas",
            });
          });
        });
      })
    );
  } else if (event.action === "dismiss") {
    // Solo cerrar la notificación
    console.log("Notificación descartada");
    return;
  } else {
    // Click en el cuerpo de la notificación - abrir app
    event.waitUntil(
      clients.openWindow("/").then(() => {
        // Enviar mensaje a la app
        clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              action: "open_app",
            });
          });
        });
      })
    );
  }
});
