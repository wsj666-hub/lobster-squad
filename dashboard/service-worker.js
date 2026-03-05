/**
 * 🦞 龙虾小队 PWA Service Worker
 * 提供离线缓存和网络优先策略
 */

const CACHE_NAME = 'lobster-squad-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// 安装事件 - 缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete, claiming clients');
        return self.clients.claim();
      })
  );
});

// 请求拦截 - 网络优先，失败时回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 网络优先策略
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 如果请求成功，克隆响应并缓存
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        console.log('[Service Worker] Network failed, trying cache:', request.url);
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache:', request.url);
              return cachedResponse;
            }
            // 如果缓存也没有，返回离线页面
            console.log('[Service Worker] No cache available, returning offline page');
            return caches.match('/index.html');
          });
      })
  );
});

// 监听消息事件
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting requested');
    self.skipWaiting();
  }
});

console.log('[Service Worker] Service Worker loaded');
