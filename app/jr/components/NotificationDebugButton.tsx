'use client';

import { useState } from 'react';
import { getCurrentSubscription, registerServiceWorker } from '@/lib/service-worker';

export default function NotificationDebugButton() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const clearAndRetry = async () => {
    setLoading(true);
    setDebugInfo('');
    
    try {
      // 1. Service Workerの登録確認
      const registration = await navigator.serviceWorker.ready;
      setDebugInfo(prev => prev + '✅ Service Worker登録確認\n');
      
      // 2. 既存の購読を取得
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setDebugInfo(prev => prev + '⚠️ 既存の購読が見つかりました\n');
        setDebugInfo(prev => prev + `Endpoint: ${existingSubscription.endpoint.substring(0, 50)}...\n`);
        
        // 3. 既存の購読を解除
        try {
          await existingSubscription.unsubscribe();
          setDebugInfo(prev => prev + '✅ 既存の購読を解除しました\n');
        } catch (error) {
          setDebugInfo(prev => prev + `❌ 購読解除エラー: ${error}\n`);
        }
      } else {
        setDebugInfo(prev => prev + 'ℹ️ 既存の購読はありません\n');
      }
      
      // 4. キャッシュをクリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
        setDebugInfo(prev => prev + '✅ キャッシュをクリアしました\n');
      }
      
      // 5. Service Workerを更新
      await registration.update();
      setDebugInfo(prev => prev + '✅ Service Workerを更新しました\n');
      
      setDebugInfo(prev => prev + '\n✨ クリア完了！ページをリロードして再度通知を有効にしてください。\n');
      
    } catch (error) {
      console.error('デバッグエラー:', error);
      setDebugInfo(prev => prev + `\n❌ エラー: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h4 className="font-semibold text-sm mb-2">通知デバッグツール</h4>
      <button
        onClick={clearAndRetry}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm"
      >
        {loading ? '処理中...' : '購読をクリアして再試行'}
      </button>
      
      {debugInfo && (
        <pre className="mt-3 p-3 bg-white rounded text-xs overflow-x-auto">
          {debugInfo}
        </pre>
      )}
      
      <p className="mt-2 text-xs text-gray-600">
        ※ このボタンは既存の購読情報をクリアします。実行後はページをリロードしてください。
      </p>
    </div>
  );
}