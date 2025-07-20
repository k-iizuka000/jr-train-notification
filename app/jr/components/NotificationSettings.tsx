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
import { validateVapidPublicKey, getVapidKeyDebugInfo } from '@/utils/vapid-helper';
import { isIOS, getDeviceInfo } from '@/utils/platform-detector';

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
      // VAPID公開鍵の確認
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID公開鍵が設定されていません');
        setError('通知機能を使用するには、環境変数NEXT_PUBLIC_VAPID_PUBLIC_KEYを設定してください');
      } else {
        // VAPID鍵の検証
        const validation = validateVapidPublicKey(VAPID_PUBLIC_KEY);
        if (!validation.isValid) {
          console.error('VAPID鍵検証エラー:', validation.error);
          console.error('VAPID鍵デバッグ情報:', getVapidKeyDebugInfo(VAPID_PUBLIC_KEY));
          console.error('VAPID公開鍵の値:', VAPID_PUBLIC_KEY);
          console.error('VAPID公開鍵の長さ:', VAPID_PUBLIC_KEY.length);
          // Base64文字のチェック
          const invalidChars = VAPID_PUBLIC_KEY.match(/[^A-Za-z0-9\-_]/g);
          if (invalidChars) {
            console.error('無効な文字が含まれています:', invalidChars.join(', '));
          }
        } else {
          console.log('VAPID公開鍵の検証成功');
          console.log('VAPID公開鍵の長さ:', VAPID_PUBLIC_KEY.length);
        }
      }
      
      // デバイス情報をログ出力（デバッグ用）
      if (isIOS()) {
        console.log('iOS端末を検出しました');
        console.log('デバイス情報:', getDeviceInfo());
      }
      
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
    
    // iOS向けデバッグ情報を追加表示
    console.group('🔍 iOS Push Notification Debug Info');
    console.log('VAPID Public Key:', VAPID_PUBLIC_KEY);
    console.log('Key Length:', VAPID_PUBLIC_KEY.length);
    console.log('First 10 chars:', VAPID_PUBLIC_KEY.substring(0, 10));
    console.log('Last 10 chars:', VAPID_PUBLIC_KEY.substring(VAPID_PUBLIC_KEY.length - 10));
    
    // Base64文字チェック
    const invalidChars = VAPID_PUBLIC_KEY.match(/[^A-Za-z0-9\-_=]/g);
    if (invalidChars) {
      console.error('Invalid characters found:', invalidChars);
    }
    
    // デバイス情報
    const deviceInfo = getDeviceInfo();
    console.log('Device Info:', deviceInfo);
    console.groupEnd();
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
      
      // iOS向けの詳細なエラーメッセージ
      if (isIOS() && err instanceof Error) {
        if (err.message.includes('string did not match')) {
          setError('iPhoneでの通知設定にエラーが発生しました。ブラウザを再起動してもう一度お試しください。');
        } else if (err.message.includes('permission')) {
          setError('通知の許可が必要です。Safariの設定から「Webサイトの通知」を許可してください。');
        } else {
          setError(`エラー: ${err.message}`);
        }
      } else {
        setError(err instanceof Error ? err.message : '通知の有効化に失敗しました');
      }
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

  // テスト通知を送信
  const sendTestNotification = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!registration) {
        setError('Service Workerが登録されていません。');
        return;
      }
      
      // 現在の購読を取得
      const subscription = await getCurrentSubscription(registration);
      if (!subscription) {
        setError('通知が有効化されていません。先に通知を有効にしてください。');
        return;
      }
      
      // テスト通知をスケジュール
      const response = await fetch('/api/jr/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'テスト通知の送信に失敗しました');
      }
      
      setError('1分後にテスト通知が送信されます。');
    } catch (err) {
      console.error('テスト通知エラー:', err);
      setError(err instanceof Error ? err.message : 'テスト通知の送信に失敗しました');
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
          <div className="bg-red-50 border border-red-300 rounded p-3">
            <p className="text-sm text-red-700 font-semibold">
              エラー: VAPID公開鍵が設定されていません
            </p>
            <p className="text-sm text-red-600 mt-1">
              通知機能を使用するには、以下の手順を実行してください：
            </p>
            <ol className="text-sm text-red-600 mt-2 list-decimal list-inside space-y-1">
              <li>スクリプトを実行: <code className="bg-red-100 px-1 rounded">node scripts/generate-vapid-keys.js</code></li>
              <li>生成された公開鍵を環境変数に設定</li>
              <li>Vercelの環境変数に <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> を追加</li>
            </ol>
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
        
        {isSubscribed && (
          <button
            onClick={sendTestNotification}
            disabled={loading}
            className={`
              w-full py-3 px-4 rounded font-medium transition-colors
              ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}
            `}
          >
            {loading ? '処理中...' : 'テスト通知を送信（1分後）'}
          </button>
        )}
        
        {permission === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-700 font-semibold">
              通知がブロックされています
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              {isIOS() 
                ? 'Safariの設定 → 「Webサイトの設定」→「通知」から、このサイトの通知を許可してください。'
                : 'ブラウザの設定から通知を許可してください。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}