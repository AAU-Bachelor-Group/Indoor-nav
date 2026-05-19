/* eslint-disable */
const CACHE_NAME = "indoor-nav-v3"
const APP_SHELL_URL = "/"
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/logoIOS.png",
  "/logo192.png",
  "/logo512.png",
  "/logo.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        }),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  // Never cache server-function RPC responses. They depend on database state
  // (rooms, nodes, graph edits made by admins) and the cache-first strategy
  // below has no invalidation, so a cached A*/room response would shadow
  // every subsequent edit until CACHE_NAME is bumped. Let these go straight
  // to the network; TanStack Query handles their in-tab caching with proper
  // invalidation on mutation.
  if (new URL(request.url).pathname.startsWith("/_serverFn/")) {
    return
  }

  // Navigation requests: network-first, fall back to cached app shell.
  // Required for Chrome's PWA installability check, which probes the SW
  // with a navigation request while the network is forced offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(APP_SHELL_URL).then((cached) => cached || Response.error()),
      ),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          return response
        })
        .catch(() => cached)
    }),
  )
})
