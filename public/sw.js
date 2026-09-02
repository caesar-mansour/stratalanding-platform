const CACHE_NAME = "strata-v2";

const PRECACHE_ASSETS = ["/offline.html"];

// Install: cache offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API routes and auth — always network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Code assets (CSS, JS) — Network First. Cache-first here serves STALE
  // bundles and you stop seeing code changes (esp. in dev). Always try the
  // network; fall back to cache only when offline.
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static media (images, fonts) — Cache First (these are content-hashed / stable)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|ico)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // HTML pages — Network First with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    // SECURITY (audit F73): never cache authenticated/personalized HTML — on a shared
    // device the next user could read a prior user's portal/admin/proposal pages from
    // CacheStorage. These go network-only.
    const isPrivate = /^\/(portal|admin|partner-portal|times|preview|proposal)(\/|$)/.test(url.pathname);
    if (isPrivate) {
      event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html")))
    );
    return;
  }
});
