// カスタムService WorkerイベントをインポートしたWorkerスクリプトに追加
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { RangeRequestsPlugin } from 'workbox-range-requests'

// プリキャッシュマニフェストの設定
precacheAndRoute(self.__WB_MANIFEST)

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

// ランタイムキャッシュの設定
// Google Fonts
registerRoute(
  /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1年
      })
    ]
  })
);

registerRoute(
  /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 1週間
      })
    ]
  })
);

// 静的アセット
registerRoute(
  /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-font-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 1週間
      })
    ]
  })
);

registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-image-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

registerRoute(
  /\/_next\/image\?url=.+$/i,
  new StaleWhileRevalidate({
    cacheName: 'next-image',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// 音声・動画
registerRoute(
  /\.(?:mp3|wav|ogg)$/i,
  new CacheFirst({
    cacheName: 'static-audio-assets',
    plugins: [
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

registerRoute(
  /\.(?:mp4)$/i,
  new CacheFirst({
    cacheName: 'static-video-assets',
    plugins: [
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// JS/CSS
registerRoute(
  /\.(?:js)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-js-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

registerRoute(
  /\.(?:css|less)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-style-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// Next.js データ
registerRoute(
  /\/_next\/data\/.+\/.+\.json$/i,
  new StaleWhileRevalidate({
    cacheName: 'next-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// JSON/XML/CSV
registerRoute(
  /\.(?:json|xml|csv)$/i,
  new NetworkFirst({
    cacheName: 'static-data-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// API
registerRoute(
  ({ url }) => {
    const isSameOrigin = self.origin === url.origin
    if (!isSameOrigin) return false
    const pathname = url.pathname
    if (pathname.startsWith('/api/auth/')) return false
    return pathname.startsWith('/api/')
  },
  new NetworkFirst({
    cacheName: 'apis',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 16,
        maxAgeSeconds: 24 * 60 * 60 // 1日
      })
    ]
  })
);

// クロスオリジン
registerRoute(
  ({ url }) => {
    const isSameOrigin = self.origin === url.origin
    return !isSameOrigin
  },
  new NetworkFirst({
    cacheName: 'cross-origin',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 60 * 60 // 1時間
      })
    ]
  })
);