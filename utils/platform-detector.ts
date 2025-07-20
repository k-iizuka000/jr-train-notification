/**
 * プラットフォーム検出ユーティリティ
 * iOS/Safari環境の検出と互換性チェックを提供
 */

/**
 * iOS端末かどうかを判定
 * @returns iOS端末の場合true
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // iOS 13以降のiPadはiPadOSとしてMacintoshを報告するため、追加チェックが必要
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // iOS 13以降のiPad対応
  const isIPadOS = navigator.platform === 'MacIntel' && 
                   navigator.maxTouchPoints > 1;
  
  return isIOSDevice || isIPadOS;
}

/**
 * Safariブラウザかどうかを判定
 * @returns Safariの場合true
 */
export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Chrome/EdgeなどもSafariを含むため、除外条件を追加
  const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // iOS上のブラウザは全てSafariのWebKitを使用
  return isSafariBrowser || (isIOS() && !isStandalonePWA());
}

/**
 * PWAとしてインストールされているかを判定
 * @returns スタンドアロンモードの場合true
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // iOS Safari
  if ('standalone' in window.navigator) {
    return (window.navigator as any).standalone === true;
  }
  
  // その他のブラウザ
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches;
}

/**
 * iOSのバージョンを取得
 * @returns iOSバージョン（例: 16.0）、取得できない場合はnull
 */
export function getIOSVersion(): number | null {
  if (!isIOS()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return major + (minor / 10);
  }
  
  return null;
}

/**
 * プッシュ通知のサポート状況を詳細にチェック
 * @returns サポート情報
 */
export function checkPushNotificationSupport(): {
  isSupported: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotificationAPI: boolean;
  requiresUserInteraction: boolean;
  error?: string;
} {
  const result: {
    isSupported: boolean;
    hasServiceWorker: boolean;
    hasPushManager: boolean;
    hasNotificationAPI: boolean;
    requiresUserInteraction: boolean;
    error?: string;
  } = {
    isSupported: false,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotificationAPI: 'Notification' in window,
    requiresUserInteraction: false,
  };

  // iOS 16.4以降でプッシュ通知をサポート
  if (isIOS()) {
    const iosVersion = getIOSVersion();
    if (iosVersion && iosVersion < 16.4) {
      return {
        ...result,
        error: `iOS ${iosVersion}はプッシュ通知をサポートしていません。iOS 16.4以降にアップデートしてください。`
      };
    }
    
    // iOSではユーザー操作が必要
    result.requiresUserInteraction = true;
  }

  // 全ての条件を満たす場合のみサポート
  result.isSupported = result.hasServiceWorker && 
                      result.hasPushManager && 
                      result.hasNotificationAPI;

  if (!result.isSupported) {
    const missing = [];
    if (!result.hasServiceWorker) missing.push('Service Worker');
    if (!result.hasPushManager) missing.push('Push Manager');
    if (!result.hasNotificationAPI) missing.push('Notification API');
    
    result.error = `次の機能がサポートされていません: ${missing.join(', ')}`;
  }

  return result;
}

/**
 * デバイス情報を取得（デバッグ用）
 * @returns デバイス情報
 */
export function getDeviceInfo(): {
  platform: string;
  userAgent: string;
  isIOS: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  iosVersion: number | null;
  pushSupport: ReturnType<typeof checkPushNotificationSupport>;
} {
  return {
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent || 'unknown',
    isIOS: isIOS(),
    isSafari: isSafari(),
    isStandalone: isStandalonePWA(),
    iosVersion: getIOSVersion(),
    pushSupport: checkPushNotificationSupport()
  };
}