const CACHE_NAME = "insuredesk-v2";
const APP_SHELL = [
  "/",
  "/login.html",
  "/register.html",
  "/insurance.html",
  "/dashboard.html",
  "/customers.html",
  "/settings.html",
  "/assets/styles.css",
  "/assets/app.js",
  "/assets/auth.js",
  "/assets/insurance.js",
  "/assets/dashboard.js",
  "/assets/customers.js",
  "/assets/settings.js",
  "/assets/default-avatar.svg",
  "/assets/app-icon.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase.co")) return;
  if (url.pathname === "/assets/config.js") {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
