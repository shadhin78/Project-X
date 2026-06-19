const CACHE_NAME = 'projectx-cache-v1.0.5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './icons/logo-x.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// Install Event - Pre-cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      
      // Cache assets one-by-one so that a single network or CORS redirect issue on a CDN does not prevent the service worker from installing.
      const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (!response.ok) {
            throw new Error(`Fetch failed with status: ${response.status}`);
          }
          await cache.put(url, response);
          console.log(`[Service Worker] Cached asset: ${url}`);
        } catch (error) {
          console.warn(`[Service Worker] Failed to pre-cache asset: ${url}`, error);
          
          // Throw error for critical local files so service worker installation fails if they are missing.
          const isCriticalLocal = url.startsWith('./index.html') || 
                                  url.startsWith('./login.html') || 
                                  url.startsWith('./manifest.json') || 
                                  url === './' || 
                                  url === '/';
          if (isCriticalLocal) {
            throw error;
          }
        }
      });
      
      await Promise.all(cachePromises);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Handle caching strategies
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching for Firebase dynamic endpoints or firestore calls
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // Navigation requests: Network-First, fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Put page update in cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline: serve matching request or custom fallbacks from cache
          const url = new URL(event.request.url);
          // Handle login routing specifically to prevent redirect loops
          if (url.pathname === '/login' || url.pathname.endsWith('/login.html')) {
            return caches.match('./login.html');
          }
          // Serve matching request if available, otherwise fallback to dashboard index.html
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Static and CDN assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] Fetch failed, using cached version if available:', err);
        });

      return cachedResponse || fetchPromise;
    })
  );
});
