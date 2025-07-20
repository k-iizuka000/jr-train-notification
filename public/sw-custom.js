// カスタムService Worker - Push通知とキャッシュ機能を統合

// Push通知受信時の処理
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
    return;
  }

  const title = data.title || 'JR高崎線運行情報';
  const options = {
    body: data.body || '運行状況が更新されました',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: data.url || '/jr'
    },
    actions: [
      {
        action: 'view',
        title: '詳細を見る',
        icon: '/icons/icon-128x128.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/icon-128x128.png'
      }
    ],
    tag: 'jr-notification',
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  let targetUrl = '/jr';
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    clients.openWindow(targetUrl)
  );
});

// Service Worker有効化時の処理
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

// Service Workerインストール時の処理
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing');
  self.skipWaiting();
});