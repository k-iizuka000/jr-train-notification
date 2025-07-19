// Service Worker - JR高崎線運行状況通知

// プッシュ通知受信イベント
self.addEventListener('push', function(event) {
  console.log('[Service Worker] プッシュ通知を受信しました');

  if (!event.data) {
    console.log('[Service Worker] プッシュ通知にデータがありません');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[Service Worker] 通知ペイロード:', payload);

    // 通知オプションの設定
    const options = {
      body: payload.body || '運行状況が更新されました',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'jr-status-notification',
      renotify: true, // 同じタグでも再通知する
      requireInteraction: false, // 自動的に消える
      data: {
        ...payload.data,
        dateOfArrival: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: '詳細を見る',
          icon: '/icons/action-view.png'
        },
        {
          action: 'close',
          title: '閉じる',
          icon: '/icons/action-close.png'
        }
      ]
    };

    // 通知を表示
    event.waitUntil(
      self.registration.showNotification(
        payload.title || 'JR高崎線 運行状況',
        options
      )
    );
  } catch (error) {
    console.error('[Service Worker] 通知の処理中にエラー:', error);
  }
});

// 通知クリックイベント
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] 通知がクリックされました:', event.action);

  // 通知を閉じる
  event.notification.close();

  if (event.action === 'close') {
    // 閉じるアクションの場合は何もしない
    return;
  }

  // アプリケーションを開く
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // 既に開いているウィンドウがあるか確認
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/jr') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // ウィンドウが開いていない場合は新しく開く
      if (clients.openWindow) {
        return clients.openWindow('/jr');
      }
    })
  );
});

// キャッシュ名
const CACHE_NAME = 'jr-takasaki-v1';
const urlsToCache = [
  '/',
  '/jr',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Service Workerのインストール
self.addEventListener('install', function(event) {
  console.log('[Service Worker] インストールされました');
  
  // キャッシュに必要なファイルを追加
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // 即座にアクティブ化
        return self.skipWaiting();
      })
  );
});

// Service Workerのアクティベート
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] アクティベートされました');
  
  // 古いキャッシュを削除
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // すべてのクライアントを即座に制御下に置く
      return clients.claim();
    })
  );
});

// フェッチイベント（キャッシュ戦略）
self.addEventListener('fetch', function(event) {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // キャッシュがある場合はそれを返す
        if (response) {
          return response;
        }
        
        // ない場合はネットワークから取得
        return fetch(event.request).then(function(response) {
          // 有効なレスポンスでない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(function() {
        // オフライン時のフォールバック
        if (event.request.destination === 'document') {
          return caches.match('/jr');
        }
      })
  );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] バックグラウンド同期:', event.tag);
  
  if (event.tag === 'check-jr-status') {
    event.waitUntil(checkAndNotifyStatus());
  }
});

// 運行状況をチェックして通知する（バックグラウンド同期用）
async function checkAndNotifyStatus() {
  try {
    // APIから最新の運行状況を取得
    const response = await fetch('/api/jr/status');
    const data = await response.json();
    
    if (data.success && data.data.status !== '平常運転') {
      // 運行に問題がある場合は通知
      const notificationData = {
        title: '🚃 JR高崎線: 運行状況に変化',
        body: data.data.status,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: {
          status: data.data.status,
          timestamp: new Date().toISOString()
        }
      };
      
      await self.registration.showNotification(
        notificationData.title,
        notificationData
      );
    }
  } catch (error) {
    console.error('[Service Worker] 状況チェック中にエラー:', error);
  }
}