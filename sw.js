const CACHE_NAME = 'musicapp-cache-v8'; // Incrementamos versión
const FILES_TO_CACHE = [
  '/',
  './index.html',
  './style.css',
  './script.js',
  './jsmediatags.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  
  // URLs de imágenes de radio (solo las 2 estables)
  'https://placehold.co/300x300/10b981/white?text=W+Radio',
  'https://placehold.co/300x300/eab308/white?text=CLASSIC'
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Instalando versión 0.0.4...');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Guardando app shell en caché');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activando versión 0.0.4...');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) { 
          console.log('[ServiceWorker] Borrando caché antigua', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(evt.request).catch(() => {});
    })
  );
});