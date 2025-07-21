// iOS専用の最小限Service Worker - プッシュ通知のみ

// Service Workerインストール時
self.addEventListener('install', (event) => {
  console.log('[SW iOS] Installing Service Worker');
  self.skipWaiting();
});

// Service Worker有効化時
self.addEventListener('activate', (event) => {
  console.log('[SW iOS] Activating Service Worker');
  event.waitUntil(self.clients.claim());
});

// プッシュ通知受信時
self.addEventListener('push', (event) => {
  console.log('[SW iOS] Push notification received');

  let data = {
    title: 'JR高崎線運行情報',
    body: '運行状況が更新されました',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png'
  };

  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW iOS] Error parsing push data:', e);
    }
  }

  // 通知オプション（iOS向けに最適化）
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: 'jr-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || '/jr',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  console.log('[SW iOS] Notification clicked');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/jr';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 既存のウィンドウがあればフォーカス
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新規ウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// フェッチイベント（最小限の処理のみ）
self.addEventListener('fetch', (event) => {
  // ネットワークファーストで処理
  event.respondWith(fetch(event.request));
});