// ===================================================================
// GlobalWay DApp Service Worker v3.0.0 - ИСПРАВЛЕНО!
// Updated: November 01, 2025
// Network: opBNB Mainnet
// ✅ ИЗМЕНЕНО: Версия 3.0.0 - для очистки старого кеша
// ✅ ИСПРАВЛЕНО: Network First для JS файлов
// ===================================================================

const CACHE_VERSION = 'globalway-v3.0.0';  // ← НОВАЯ ВЕРСИЯ!

// ✅ СПИСОК ФАЙЛОВ ДЛЯ КЕШИРОВАНИЯ
const CACHE_ASSETS = [
  // Главная страница
  './',
  './index.html',
  
  // CSS
  './css/variables.css',
  './css/main.css',
  './css/components.css',
  './css/registration.css',
  './css/matrix-enhancements.css',
  './css/v2-additional.css',
  './css/additional-styles.css',
  
  // HTML Components
  './components/dashboard.html',
  './components/partners.html',
  './components/matrix.html',
  './components/tokens.html',
  './components/projects.html',
  './components/admin.html',
  
  // ABI Files - 10 контрактов
  './contracts/abis/GWTToken.json',
  './contracts/abis/GlobalWay.json',
  './contracts/abis/GlobalWayMarketing.json',
  './contracts/abis/GlobalWayLeaderPool.json',
  './contracts/abis/GlobalWayInvestment.json',
  './contracts/abis/GlobalWayQuarterly.json',
  './contracts/abis/GlobalWayTechAccounts.json',
  './contracts/abis/GlobalWayBridge.json',
  './contracts/abis/GlobalWayStats.json',
  './contracts/abis/GlobalWayGovernance.json',
  
  // Assets - Иконки
  './assets/icons/logo.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  
  // Translations
  './translations/en.json',
  './translations/ru.json',
  './translations/uk.json',
  
  // PWA
  './manifest.json'
];

// ⚠️ НЕ КЕШИРУЕМ JavaScript файлы - они всегда с сервера!
const NO_CACHE_FILES = [
  '/js/config.js',
  '/js/utils.js',
  '/js/i18n.js',
  '/js/web3.js',
  '/js/contracts.js',    // ← Всегда свежий!
  '/js/ui.js',
  '/js/registration.js',
  '/js/admin.js',
  '/js/app.js',          // ← Всегда свежий!
  '/js/partners.js',     // ← Всегда свежий!
  '/js/matrix.js',       // ← Всегда свежий!
  '/js/tokens.js',       // ← Всегда свежий!
  '/js/projects.js'      // ← Всегда свежий!
];

// CDN ресурсы (не кешируем)
const EXTERNAL_RESOURCES = [
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Blockchain RPC (не кешируем)
const BLOCKCHAIN_DOMAINS = [
  'bnbchain.org',
  'bscscan.com',
  'opbnb-mainnet-rpc.bnbchain.org',
  'opbnb-testnet-rpc.bnbchain.org',
  'infura.io',
  'alchemy.com',
  'quicknode.com',
  'nodereal.io'
];

// ===================================================================
// INSTALL EVENT
// ===================================================================
self.addEventListener('install', (event) => {
  console.log('[SW v3.0.0] 🔧 Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW v3.0.0] 📦 Caching app assets...');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW v3.0.0] ✅ Installation complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW v3.0.0] ❌ Installation failed:', err);
      })
  );
});

// ===================================================================
// ACTIVATE EVENT - Удаление старого кеша
// ===================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW v3.0.0] 🔄 Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_VERSION) {
              console.log(`[SW v3.0.0] 🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW v3.0.0] ✅ Old cache deleted');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW v3.0.0] 🎉 Service Worker active!');
      })
  );
});

// ===================================================================
// FETCH EVENT - ИСПРАВЛЕНО: Network First для JS!
// ===================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем внешние ресурсы
  if (EXTERNAL_RESOURCES.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Пропускаем Blockchain RPC
  if (BLOCKCHAIN_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Пропускаем non-http(s)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Только наш домен
  if (url.origin !== self.location.origin) {
    return;
  }

  // ===================================================================
  // STRATEGY 1: Network First для HTML
  // ===================================================================
  if (request.destination === 'document' || 
      request.headers.get('accept')?.includes('text/html')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // ===================================================================
  // STRATEGY 2: Network First для JS файлов (КРИТИЧНО!)
  // ===================================================================
  if (url.pathname.endsWith('.js') || 
      NO_CACHE_FILES.some(path => url.pathname.includes(path))) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          console.log(`[SW v3.0.0] 🌐 Fresh from network: ${url.pathname}`);
          
          // НЕ кешируем JS файлы из NO_CACHE_FILES
          if (!NO_CACHE_FILES.some(path => url.pathname.includes(path))) {
            const clonedResponse = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          
          return response;
        })
        .catch(() => {
          console.log(`[SW v3.0.0] ⚠️ Network failed, trying cache: ${url.pathname}`);
          return caches.match(request);
        })
    );
    return;
  }

  // ===================================================================
  // STRATEGY 3: Network First для JSON (ABI и переводы)
  // ===================================================================
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            if (url.pathname.includes('/abis/')) {
              return new Response(
                JSON.stringify({ 
                  error: 'ABI file not available offline'
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            
            return new Response(
              JSON.stringify({ error: 'offline' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // ===================================================================
  // STRATEGY 4: Cache First для статики (CSS, изображения)
  // ===================================================================
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`[SW v3.0.0] 💾 From cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clonedResponse = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          });
      })
  );
});

// ===================================================================
// MESSAGE HANDLER
// ===================================================================
self.addEventListener('message', (event) => {
  console.log('[SW v3.0.0] 💬 Message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v3.0.0] ⏭️ Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW v3.0.0] 🗑️ Clearing cache...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[SW v3.0.0] ✅ Cache cleared');
        return self.registration.unregister();
      })
    );
  }
});

console.log('[SW v3.0.0] 🚀 Service Worker v3.0.0 loaded!');
