'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Service Workerの登録
    const registerSW = async () => {
      try {
        const registration = await registerServiceWorker();
        
        if (registration) {
          console.log('Service Worker登録成功:', registration.scope);
          
          // 更新があった場合の処理
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                  // 新しいバージョンが利用可能
                  if (window.confirm('新しいバージョンが利用可能です。ページを更新しますか？')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Service Worker登録エラー:', error);
      }
    };

    // ブラウザがService Workerをサポートしている場合のみ登録
    if ('serviceWorker' in navigator) {
      // window.onloadを待って登録（パフォーマンスのため）
      window.addEventListener('load', registerSW);
      
      return () => {
        window.removeEventListener('load', registerSW);
      };
    }
  }, []);

  // このコンポーネントは何も表示しない
  return null;
}