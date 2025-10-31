// ===================================================================
// GlobalWay DApp Service Worker v2.1.0
// Updated: October 31, 2025
// Network: opBNB Mainnet
// ✅ ОНОВЛЕНО: Всі нові файли v2.0 + admin.js
// ✅ ВИПРАВЛЕНО: Шляхи до ABI файлів
// ===================================================================

const CACHE_VERSION = 'globalway-v2.1.0';

// ✅ ПОВНИЙ СПИСОК ФАЙЛІВ ДЛЯ КЕШУВАННЯ
const CACHE_ASSETS = [
  // Головна сторінка
  './',
  './index.html',
  
  // ===================================================================
  // CSS - ВСІ ФАЙЛИ
  // ===================================================================
  './css/variables.css',
  './css/main.css',
  './css/components.css',
  './css/animations.css',
  './css/registration.css',
  './css/matrix-enhancements.css',
  './css/v2-additional.css',
  './css/additional-styles.css',        // ✅ НОВИЙ
  
  // ===================================================================
  // JavaScript - ВСІ ОНОВЛЕНІ ФАЙЛИ v2.1
  // ===================================================================
  './js/config.js',                      // ✅ ОНОВЛЕНИЙ v2.0
  './js/utils.js',                       // ✅ НОВИЙ v2.0
  './js/i18n.js',                        // Ваш (без змін)
  './js/web3.js',                        // Ваш (без змін)
  './js/contracts.js',                   // ✅ ОНОВЛЕНИЙ v2.0 (з contracts-v2.js)
  './js/ui.js',                          // ✅ НОВИЙ v2.0
  './js/registration.js',                // Ваш (без змін)
  './js/admin.js',                       // ✅ ОНОВЛЕНИЙ v2.1
  './js/app.js',                         // ✅ ОНОВЛЕНИЙ v2.0
  
  // ===================================================================
  // HTML Components (якщо є окремі файли)
  // ===================================================================
  './components/dashboard.html',
  './components/partners.html',
  './components/matrix.html',
  './components/tokens.html',
  './components/projects.html',
  './components/admin.html',
  
  // ===================================================================
  // ABI Files - 10 КОНТРАКТІВ (ПРАВИЛЬНІ ШЛЯХИ)
  // ===================================================================
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
  
  // ===================================================================
  // Assets - Іконки
  // ===================================================================
  './assets/icons/logo.png',
  './assets/icons/icon-72x72.png',
  './assets/icons/icon-96x96.png',
  './assets/icons/icon-128x128.png',
  './assets/icons/icon-144x144.png',
  './assets/icons/icon-152x152.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-384x384.png',
  './assets/icons/icon-512x512.png',
  
  // ===================================================================
  // Assets - Зображення
  // ===================================================================
  './assets/planets/gwt-coin.png',
  './assets/planets/earth.png',
  './assets/planets/mars.png',
  './assets/planets/jupiter.png',
  
  // ===================================================================
  // Translations (переклади)
  // ===================================================================
  './translations/en.json',
  './translations/ru.json',
  './translations/uk.json',
  
  // ===================================================================
  // PWA
  // ===================================================================
  './manifest.json'
];

// ===================================================================
// CDN РЕСУРСИ (не кешуємо, завжди з мережі)
// ===================================================================
const EXTERNAL_RESOURCES = [
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ===================================================================
// BLOCKCHAIN RPC (не кешуємо)
// ===================================================================
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
// INSTALL EVENT - Кешування файлів
// ===================================================================
self.addEventListener('install', (event) => {
  console.log('[SW v2.1.0] 🔧 Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW v2.1.0] 📦 Caching app assets...');
        
        // Кешуємо файли по одному для кращої відладки
        return Promise.all(
          CACHE_ASSETS.map(url => {
            return cache.add(url)
              .then(() => {
                console.log(`[SW v2.1.0] ✅ Cached: ${url}`);
              })
              .catch(err => {
                console.warn(`[SW v2.1.0] ⚠️ Failed to cache: ${url}`, err.message);
              });
          })
        );
      })
      .then(() => {
        console.log('[SW v2.1.0] ✅ Installation complete, skipping waiting...');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW v2.1.0] ❌ Installation failed:', err);
      })
  );
});

// ===================================================================
// ACTIVATE EVENT - Видалення старого кешу
// ===================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW v2.1.0] 🔄 Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_VERSION) {
              console.log(`[SW v2.1.0] 🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW v2.1.0] ✅ Activation complete, claiming clients...');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW v2.1.0] 🎉 Service Worker is now active and controlling all pages!');
      })
  );
});

// ===================================================================
// FETCH EVENT - Стратегії кешування
// ===================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ===================================================================
  // ПРОПУСКАЄМО: Зовнішні ресурси
  // ===================================================================
  
  // Пропускаємо CDN
  if (EXTERNAL_RESOURCES.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Пропускаємо Blockchain RPC
  if (BLOCKCHAIN_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Пропускаємо non-http(s) протоколи
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Пропускаємо chrome-extension і інші системні
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // Пропускаємо тільки наш домен
  if (url.origin !== self.location.origin) {
    return;
  }

  // ===================================================================
  // STRATEGY 1: Network First для HTML (завжди свіжа версія)
  // ===================================================================
  if (request.destination === 'document' || 
      request.headers.get('accept')?.includes('text/html')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кешуємо успішну відповідь
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Якщо мережа недоступна, беремо з кешу
          console.log('[SW v2.1.0] 📡 Network unavailable, serving HTML from cache');
          return caches.match(request).then(cached => {
            return cached || new Response(
              `<!DOCTYPE html>
              <html>
              <head>
                <title>GlobalWay - Offline</title>
                <style>
                  body {
                    font-family: system-ui, -apple-system, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                  }
                  .offline-container {
                    max-width: 400px;
                  }
                  h1 { font-size: 3rem; margin: 0 0 20px 0; }
                  p { font-size: 1.2rem; margin-bottom: 30px; }
                  button {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 15px 30px;
                    font-size: 1rem;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                  }
                  button:hover { opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="offline-container">
                  <h1>📡</h1>
                  <h2>You're Offline</h2>
                  <p>No internet connection. Please check your network and try again.</p>
                  <button onclick="window.location.reload()">Retry</button>
                </div>
              </body>
              </html>`, 
              { 
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              }
            );
          });
        })
    );
    return;
  }

  // ===================================================================
  // STRATEGY 2: Network First для JSON (config, translations, ABI)
  // ===================================================================
  if (request.headers.get('accept')?.includes('application/json') ||
      url.pathname.endsWith('.json')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[SW v2.1.0] 📡 Network unavailable, serving JSON from cache');
          return caches.match(request).then(cached => {
            if (cached) {
              return cached;
            }
            // Якщо це ABI файл, повертаємо помилку
            if (url.pathname.includes('/abis/')) {
              return new Response(
                JSON.stringify({ 
                  error: 'ABI file not available offline',
                  message: 'Please check your internet connection'
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
  // STRATEGY 3: Cache First для статики (CSS, JS, зображення)
  // ===================================================================
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`[SW v2.1.0] 💾 Serving from cache: ${url.pathname}`);
          
          // Оновлюємо кеш у фоні для наступного разу
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_VERSION).then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {
              // Ігноруємо помилки фонового оновлення
            });
          
          return cachedResponse;
        }
        
        // Якщо немає в кеші, завантажуємо з мережі
        return fetch(request)
          .then((response) => {
            // Кешуємо тільки успішні відповіді
            if (response && response.status === 200) {
              const clonedResponse = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          })
          .catch(err => {
            console.error('[SW v2.1.0] ❌ Fetch failed:', url.pathname, err.message);
            
            // Повертаємо різні помилки для різних типів файлів
            if (url.pathname.endsWith('.css')) {
              return new Response(
                '/* CSS file not available offline */',
                { 
                  status: 503,
                  headers: { 'Content-Type': 'text/css' }
                }
              );
            } else if (url.pathname.endsWith('.js')) {
              return new Response(
                '// JS file not available offline\nconsole.warn("File not available:", "' + url.pathname + '");',
                { 
                  status: 503,
                  headers: { 'Content-Type': 'application/javascript' }
                }
              );
            } else {
              return new Response(
                'Network error',
                { status: 503 }
              );
            }
          });
      })
  );
});

// ===================================================================
// PUSH NOTIFICATIONS (опціонально)
// ===================================================================
self.addEventListener('push', (event) => {
  console.log('[SW v2.1.0] 📬 Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GlobalWay';
  const options = {
    body: data.body || 'New notification from GlobalWay',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'globalway-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || './',
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===================================================================
// NOTIFICATION CLICK
// ===================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW v2.1.0] 🔔 Notification clicked');
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || './';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Якщо є відкрите вікно, фокусуємося на ньому
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      // Інакше відкриваємо нове вікно
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ===================================================================
// MESSAGE HANDLER (для оновлення кешу з застосунку)
// ===================================================================
self.addEventListener('message', (event) => {
  console.log('[SW v2.1.0] 💬 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v2.1.0] ⏭️ Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW v2.1.0] 🗑️ Clearing cache...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[SW v2.1.0] ✅ Cache cleared');
        return self.registration.unregister();
      })
    );
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    console.log('[SW v2.1.0] 🔄 Updating cache...');
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) => {
        return cache.addAll(CACHE_ASSETS);
      }).then(() => {
        console.log('[SW v2.1.0] ✅ Cache updated');
      })
    );
  }
});

// ===================================================================
// BACKGROUND SYNC (опціонально, для офлайн транзакцій)
// ===================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW v2.1.0] 🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      // Тут можна додати логіку синхронізації транзакцій
      Promise.resolve().then(() => {
        console.log('[SW v2.1.0] ✅ Transactions synced');
      })
    );
  }
});

// ===================================================================
// ERROR HANDLER
// ===================================================================
self.addEventListener('error', (event) => {
  console.error('[SW v2.1.0] ❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW v2.1.0] ❌ Unhandled promise rejection:', event.reason);
});

console.log('[SW v2.1.0] 🚀 Service Worker script loaded and ready!');
