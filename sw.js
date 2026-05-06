// sw.js - Service Worker para PWA
const CACHE_NAME = 'lift-os-v1';
const urlsToCache = [
  '/lift-os/',
  '/lift-os/index.html',
  '/lift-os/css/style.css',
  '/lift-os/js/utils.js',
  '/lift-os/js/auth.js',
  '/lift-os/js/app.js',
  '/lift-os/js/google-sheets.js',
  '/lift-os/js/modules/clientes.js',
  '/lift-os/js/modules/os.js',
  '/lift-os/js/modules/orcamento.js',
  '/lift-os/js/modules/estoque.js',
  '/lift-os/js/modules/agendamentos.js',
  '/lift-os/js/modules/checklist.js',
  '/lift-os/js/modules/jornada.js',
  '/lift-os/js/modules/historico.js',
  '/lift-os/js/modules/permissoes.js',
  '/lift-os/js/modules/usuarios.js',
  '/lift-os/js/modules/signature.js',
  '/lift-os/js/modules/signature-orc.js',
  '/lift-os/js/modules/online-users.js',
  '/lift-os/js/modules/notificacoes.js',
  '/lift-os/js/modules/theme.js',
  '/lift-os/js/heartbeat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
