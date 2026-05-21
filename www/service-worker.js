const CACHE_NAME = 'studymaster-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and CDNs');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new RegExp(event.request.url);
  
  // CRITICAL: Bypass Firebase and Google APIs so dynamic sync and login functions pass through unimpeded
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('firestore') || 
    url.hostname.includes('firebaseapp.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Network-First with Cache Fallback for dynamic app root/index.html to stay fresh
        if (event.request.url.includes('index.html') || url.pathname === '/') {
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                const cacheCopy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
        }
        // Cache-First for version-locked static files & CDNs
        return cachedResponse;
      }

      // Network Fallback for uncached items
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && url.origin === self.location.origin) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      });
    })
  );
});
