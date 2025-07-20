'use client';

import { useState, useEffect } from 'react';
import { isIOS, isSafari, isStandalonePWA } from '@/utils/platform-detector';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // すでにPWAとしてインストールされている場合は表示しない
    if (isStandalonePWA()) {
      return;
    }

    // iOS/Safariの場合
    if (isIOS() && isSafari()) {
      // 初回訪問から少し遅延させて表示
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // その他のブラウザの場合（Android Chrome等）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      // iOSの場合は手動インストール手順を表示
      return;
    }

    // Android等の場合
    if (!deferredPrompt) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    if (outcome === 'accepted') {
      console.log('PWAがインストールされました');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      {isIOS() ? (
        // iOS向けのインストール手順
        <div className="max-w-md mx-auto">
          <h3 className="font-semibold text-lg mb-2">アプリとしてインストール</h3>
          <p className="text-sm text-gray-600 mb-3">
            プッシュ通知を有効にするには、このサイトをホーム画面に追加してください。
          </p>
          <ol className="text-sm text-gray-700 space-y-2 mb-4">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Safari下部の共有ボタン <span className="inline-block w-4 h-4 text-blue-600">□↑</span> をタップ</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>「ホーム画面に追加」を選択</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>「追加」をタップ</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>ホーム画面から起動して通知を設定</span>
            </li>
          </ol>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p className="text-xs text-yellow-800">
              <strong>重要:</strong> iOSではホーム画面に追加したアプリからのみプッシュ通知が利用できます。
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2 text-center text-blue-600 font-medium"
          >
            閉じる
          </button>
        </div>
      ) : (
        // その他のブラウザ向け
        <div className="max-w-md mx-auto">
          <h3 className="font-semibold text-lg mb-2">アプリとしてインストール</h3>
          <p className="text-sm text-gray-600 mb-4">
            ホーム画面に追加して、より快適にご利用いただけます。
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700"
            >
              インストール
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded font-medium hover:bg-gray-300"
            >
              後で
            </button>
          </div>
        </div>
      )}
    </div>
  );
}