import type { PushSubscriptionData } from '@/types';

// Service Worker のサポート確認
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

// プッシュ通知のサポート確認
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'PushManager' in window && isServiceWorkerSupported();
}

// 通知の許可状態を取得
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Service Worker の登録
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('このブラウザはService Workerをサポートしていません');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker登録成功:', registration.scope);
    
    // 更新があれば自動的に適用
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('Service Workerが更新されました');
            // 必要に応じてユーザーに通知
          }
        });
      }
    });
    
    return registration;
  } catch (error) {
    console.error('Service Worker登録エラー:', error);
    return null;
  }
}

// Service Worker の登録解除
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Workerの登録を解除しました');
    return true;
  } catch (error) {
    console.error('Service Worker登録解除エラー:', error);
    return false;
  }
}

// 通知の許可を要求
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('このブラウザは通知をサポートしていません');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('通知許可:', permission);
    return permission;
  } catch (error) {
    console.error('通知許可リクエストエラー:', error);
    return 'denied';
  }
}

// プッシュ通知の購読
export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    console.warn('プッシュ通知がサポートされていません');
    return null;
  }

  try {
    // 既存の購読を確認
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('既存の購読が見つかりました');
      return {
        endpoint: existingSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(existingSubscription.getKey('auth')!)
        }
      };
    }

    // 新規購読
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('プッシュ通知購読成功');
    
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };
  } catch (error) {
    console.error('プッシュ通知購読エラー:', error);
    return null;
  }
}

// プッシュ通知の購読解除
export async function unsubscribeFromPushNotifications(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('購読が見つかりません');
      return true;
    }

    const result = await subscription.unsubscribe();
    console.log('プッシュ通知購読解除:', result);
    return result;
  } catch (error) {
    console.error('プッシュ通知購読解除エラー:', error);
    return false;
  }
}

// 現在の購読状態を取得
export async function getCurrentSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscriptionData | null> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };
  } catch (error) {
    console.error('購読状態取得エラー:', error);
    return null;
  }
}

// ユーティリティ関数: Base64 URL エンコードされた文字列を Uint8Array に変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ユーティリティ関数: ArrayBuffer を Base64 文字列に変換
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}