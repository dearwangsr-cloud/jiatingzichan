const CACHE_NAME = 'family-finance-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 安装阶段：缓存必要的基础静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 强制跳过等待，让新 SW 立即激活
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 核心拦截请求：实现网络优先策略
self.addEventListener('fetch', (event) => {
  // 只处理同源请求或特定的外部 CDN（如 Chart.js）
  if (event.request.mode === 'navigate' || event.request.url.includes(location.origin) || event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // 如果网络请求成功，克隆一份写入缓存，确保缓存永远是最新的
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 网络失败（如手机没信号），则从本地缓存中查找返回
          return caches.match(event.request);
        })
    );
  }
});