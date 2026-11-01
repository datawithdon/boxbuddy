// Offline support: the app shell is cached so BoxBuddy works on moving day
// without signal. Only same-origin GET requests inside this app's scope are
// handled; nothing else is cached or intercepted.

const CACHE = "boxbuddy-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "css/styles.css", "vendor/qrcode.js", "vendor/jsQR.js", "js/app.js", "js/db.js", "js/dom.js", "js/engine/catalog.js", "js/engine/dates.js", "js/engine/label.js", "js/engine/loadplan.js", "js/engine/plan.js", "js/engine/sanitize.js", "js/engine/volume.js", "js/qr.js", "js/router.js", "js/sample.js", "js/state.js", "js/ui.js", "js/views/boxes.js", "js/views/checklist.js", "js/views/home.js", "js/views/inventory.js", "js/views/label.js", "js/views/moveday.js", "js/views/plan.js", "js/views/quotes.js", "js/views/scan.js", "js/views/settings.js", "js/views/shared.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("boxbuddy-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Cache first, refreshed in the background.
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((res) => {
      if (res.ok && res.type === "basic") cache.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
