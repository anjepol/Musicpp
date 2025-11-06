const CACHE_NAME = 'musicapp-cache-v1';
// Archivos principales para que la app funcione offline.
const FILES_TO_CACHE = [
  '/',
  './index.html',
  './style.css',
  './script.js',
  './jsmediatags.min.js',
  'https://cdn.tailwindcss.com', // Cachear Tailwind también
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap' // Cachear fuente
];

// Evento de Instalación: Se guarda el App Shell en caché.
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Instalando...');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Guardando app shell en caché');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Evento de Activación: Limpia cachés antiguas (si es necesario).
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activando...');
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

// Evento Fetch: Intercepta las peticiones de red.
self.addEventListener('fetch', (evt) => {
  // Responder con el caché primero, y si falla, ir a la red.
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      // Si está en caché, lo devuelve. Si no, hace el fetch.
      return response || fetch(evt.request);
    })
  );
});