/* eslint-disable no-restricted-globals */
/**
 * Offline support for the installed web app.
 *
 * `npm run build:web` replaces the two placeholders below with the build's
 * version hash and the list of every file in the build, so the whole app is
 * stored on the device the first time it is opened and then works without
 * internet. A new deploy produces a new version → new cache, old one removed.
 *
 * Strategy
 *  - App pages (navigations): network first, falling back to the cached app
 *    when offline — so updates arrive whenever you're online.
 *  - Everything else (hashed JS, fonts, icons): cache first.
 *
 * All URLs are relative to this file's location, so the app works both at a
 * domain root and under a sub-path such as GitHub Pages' /<repo>/.
 *
 * Note: this caches the *app's files* only. Your dog data never goes through
 * here; it lives in the browser's local storage on the device.
 */
const VERSION = '__BUILD_VERSION__';
const PRECACHE = __PRECACHE_MANIFEST__;
const CACHE = `rdt-${VERSION}`;
const APP_SHELL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rdt-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Single-page app: every route is served by index.html.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(APP_SHELL, copy));
          return response;
        })
        .catch(() => caches.match(APP_SHELL).then((cached) => cached || caches.match(self.registration.scope))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
