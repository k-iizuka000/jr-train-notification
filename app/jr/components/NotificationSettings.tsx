'use client';

import { useState, useEffect } from 'react';
import { 
  registerServiceWorker, 
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription,
  isPushNotificationSupported,
  getNotificationPermission
} from '@/lib/service-worker';

// VAPID公開鍵（環境変数から取得）
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export default function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // 初期化
  useEffect(() => {
    const init = async () => {
      // プッシュ通知のサポート確認
      const supported = isPushNotificationSupported();
      setIsSupported(supported);
      
      if (!supported) return;
      
      // 通知許可状態を確認
      const perm = getNotificationPermission();
      setPermission(perm);
      
      // Service Workerを登録
      const reg = await registerServiceWorker();
      if (reg) {
        setRegistration(reg);
        
        // 現在の購読状態を確認
        const subscription = await getCurrentSubscription(reg);
        setIsSubscribed(!!subscription);
      }
    };
    
    init();
  }, []);

  // 通知を有効化
  const enableNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. 通知許可をリクエスト
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        setError('通知の許可が必要です。ブラウザの設定を確認してください。');
        return;
      }
      
      // 2. Service Workerが登録されているか確認
      let reg = registration;
      if (!reg) {
        reg = await registerServiceWorker();
        if (!reg) {
          setError('Service Workerの登録に失敗しました。');
          return;
        }
        setRegistration(reg);
      }
      
      // 3. プッシュ通知を購読
      const subscription = await subscribeToPushNotifications(reg, VAPID_PUBLIC_KEY);
      if (!subscription) {
        setError('プッシュ通知の購読に失敗しました。');
        return;
      }
      
      // 4. サーバーに購読情報を送信
      const response = await fetch('/api/jr/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '購読登録に失敗しました');
      }
      
      setIsSubscribed(true);
      setError(null);
    } catch (err) {
      console.error('通知有効化エラー:', err);
      setError(err instanceof Error ? err.message : '通知の有効化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 通知を無効化
  const disableNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!registration) {
        setError('Service Workerが登録されていません。');
        return;
      }
      
      // 1. 現在の購読を取得
      const subscription = await getCurrentSubscription(registration);
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }
      
      // 2. サーバーから購読情報を削除
      const response = await fetch('/api/jr/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        }),
      });
      
      const data = await response.json();
      
      if (!data.success && response.status !== 404) {
        throw new Error(data.error || '購読解除に失敗しました');
      }
      
      // 3. ブラウザから購読を解除
      await unsubscribeFromPushNotifications(registration);
      
      setIsSubscribed(false);
      setError(null);
    } catch (err) {
      console.error('通知無効化エラー:', err);
      setError(err instanceof Error ? err.message : '通知の無効化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // プッシュ通知がサポートされていない場合
  if (!isSupported) {
    return (
      <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">プッシュ通知</h3>
        <p className="text-gray-600">
          お使いのブラウザはプッシュ通知をサポートしていません。
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">プッシュ通知設定</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            運行状況が変化した際に、プッシュ通知でお知らせします。
          </p>
          <p className="text-sm text-gray-600">
            現在の状態: {' '}
            <span className={`font-semibold ${isSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
              {isSubscribed ? '有効' : '無効'}
            </span>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-300 rounded p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {!VAPID_PUBLIC_KEY && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-700">
              VAPID公開鍵が設定されていません。環境変数を確認してください。
            </p>
          </div>
        )}
        
        <button
          onClick={isSubscribed ? disableNotifications : enableNotifications}
          disabled={loading || !VAPID_PUBLIC_KEY}
          className={`
            w-full py-3 px-4 rounded font-medium transition-colors
            ${loading || !VAPID_PUBLIC_KEY ? 'bg-gray-300 cursor-not-allowed' : ''}
            ${!loading && !isSubscribed && VAPID_PUBLIC_KEY ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            ${!loading && isSubscribed && VAPID_PUBLIC_KEY ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          `}
        >
          {loading ? '処理中...' : isSubscribed ? '通知を無効にする' : '通知を有効にする'}
        </button>
        
        {permission === 'denied' && (
          <p className="text-sm text-red-600">
            通知がブロックされています。ブラウザの設定から通知を許可してください。
          </p>
        )}
      </div>
    </div>
  );
}