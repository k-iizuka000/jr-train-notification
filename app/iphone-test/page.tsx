// 開発用テストページ - 本番では/jrページを使用してください
'use client';

import { useState, useEffect } from 'react';
import { isIOS, isStandalonePWA } from '@/utils/platform-detector';
import { urlBase64ToUint8Array } from '@/utils/vapid-helper';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export default function IPhoneTestPage() {
  const [status, setStatus] = useState<string>('初期化中...');
  const [error, setError] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // iPhoneチェック
    if (!isIOS()) {
      setStatus('このページはiPhone専用です');
      setError('iPhone/iPadからアクセスしてください');
      return;
    }

    // PWAチェック
    setIsInstalled(isStandalonePWA());
    if (!isStandalonePWA()) {
      setStatus('ホーム画面に追加してください');
      return;
    }

    // iOS専用Service Workerを登録
    registerIOSServiceWorker();
  }, []);

  const registerIOSServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      setError('Service Workerがサポートされていません');
      return;
    }

    try {
      // 既存のService Workerを解除
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // iOS専用Service Workerを登録
      const registration = await navigator.serviceWorker.register('/sw-ios.js', {
        scope: '/'
      });
      
      console.log('iOS Service Worker登録成功');
      
      // Service Workerの準備を待つ
      await navigator.serviceWorker.ready;
      setStatus('Service Worker準備完了');
      
      // 既存の購読確認
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        setSubscription(existingSub);
        setStatus('通知購読済み');
      } else {
        setStatus('通知未設定');
      }
    } catch (err) {
      setError(`Service Workerエラー: ${err}`);
    }
  };

  const enableNotifications = async () => {
    setError(null);
    setStatus('通知を設定中...');

    try {
      // 1. 通知許可リクエスト
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('通知が許可されませんでした');
        return;
      }

      // 2. Service Worker準備
      const registration = await navigator.serviceWorker.ready;

      // 3. VAPID鍵変換（重要）
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('VAPID鍵変換完了:', applicationServerKey.length, 'bytes');

      // 4. プッシュ購読
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      setSubscription(subscription);
      setStatus('購読成功！サーバーに登録中...');

      // 5. サーバーに送信
      const response = await fetch('/api/jr/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }

      setStatus('通知設定完了！テスト通知を送信しました');
      
    } catch (err) {
      console.error('購読エラー:', err);
      setError(`エラー: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/jr/test-notification', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('テスト通知の送信に失敗しました');
      }
      
      setStatus('テスト通知を送信しました');
    } catch (err) {
      setError(`テスト通知エラー: ${err}`);
    }
  };

  // iPhone以外
  if (!isIOS()) {
    return (
      <div className="min-h-screen bg-red-50 p-4">
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            iPhone専用ページ
          </h1>
          <p className="text-gray-600">
            このページはiPhone/iPadからのみアクセス可能です。
          </p>
        </div>
      </div>
    );
  }

  // PWAチェック
  if (!isInstalled) {
    return (
      <div className="min-h-screen bg-blue-50 p-4">
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
          <h1 className="text-xl font-bold text-blue-600 mb-4">
            ホーム画面に追加してください
          </h1>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Safari下部の共有ボタン（□↑）をタップ</li>
            <li>「ホーム画面に追加」を選択</li>
            <li>「追加」をタップ</li>
            <li>ホーム画面から再度アプリを開く</li>
          </ol>
        </div>
      </div>
    );
  }

  // メインUI
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto mt-10 space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">iPhone通知テスト</h1>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm">
              <span className="font-semibold">ステータス:</span> {status}
            </p>
            <p className="text-xs text-gray-500">
              VAPID鍵: {VAPID_PUBLIC_KEY ? `${VAPID_PUBLIC_KEY.substring(0, 20)}...` : '未設定'}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!subscription && (
              <button
                onClick={enableNotifications}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded font-medium hover:bg-blue-700"
              >
                通知を有効にする
              </button>
            )}

            {subscription && (
              <>
                <div className="bg-green-100 p-3 rounded">
                  <p className="text-green-700 text-sm">✓ 通知設定済み</p>
                </div>
                <button
                  onClick={sendTestNotification}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded font-medium hover:bg-green-700"
                >
                  テスト通知を送信
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded text-xs text-gray-600">
          <p>デバッグ情報:</p>
          <p>PWA: {isInstalled ? 'Yes' : 'No'}</p>
          <p>SW: {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'Yes' : 'No'}</p>
          <p>Push: {typeof window !== 'undefined' && 'PushManager' in window ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}