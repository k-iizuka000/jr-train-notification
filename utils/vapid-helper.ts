/**
 * VAPID鍵変換ユーティリティ
 * iOS/Safari対応のURLBase64形式変換を提供
 */

/**
 * URLBase64形式の文字列をUint8Arrayに変換する
 * iOS/Safariの厳密な検証に対応するための改善版
 * @param base64String - URLBase64形式の文字列
 * @returns Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // 入力検証
  if (!base64String) {
    throw new Error('VAPID公開鍵が空です');
  }

  // iOS Safari互換性のための処理
  // 標準的な方法：パディングを追加（末尾の=を削除しない）
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  try {
    // Node環境とブラウザ環境の両方に対応
    const rawData = typeof window !== 'undefined' 
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    // 変換結果の検証（iOS向け）
    if (outputArray.length === 0) {
      throw new Error('VAPID鍵の変換結果が空です');
    }

    // iOS Safari向けの追加検証
    if (outputArray.length !== 65) {
      console.warn(`VAPID鍵のバイト長が期待値と異なります。期待値: 65, 実際: ${outputArray.length}`);
    }

    return outputArray;
  } catch (error) {
    console.error('VAPID鍵の変換エラー:', error);
    throw new Error('VAPID公開鍵の形式が不正です。URLBase64形式であることを確認してください。');
  }
}

/**
 * iOS Safari向けの代替変換関数
 * 一部のVAPID鍵形式で問題が発生する場合の代替手段
 * @param base64String - URLBase64形式の文字列
 * @returns Uint8Array
 */
export function urlBase64ToUint8ArrayAlternative(base64String: string): Uint8Array {
  // 末尾の=を含む場合と含まない場合の両方を試す
  const base64WithoutPadding = base64String.replace(/=+$/, '');
  
  // URL-safe base64をstandard base64に変換
  const base64 = base64WithoutPadding
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
    
  // 必要に応じてパディングを追加
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  
  try {
    const rawData = typeof window !== 'undefined' 
      ? window.atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');
    
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.error('代替VAPID鍵変換エラー:', error);
    throw new Error('VAPID公開鍵の変換に失敗しました');
  }
}

/**
 * VAPID公開鍵の形式を検証する
 * @param publicKey - VAPID公開鍵
 * @returns 検証結果
 */
export function validateVapidPublicKey(publicKey: string): {
  isValid: boolean;
  error?: string;
} {
  if (!publicKey) {
    return {
      isValid: false,
      error: 'VAPID公開鍵が設定されていません'
    };
  }

  // URLBase64形式の文字のみで構成されているか確認（=も許可）
  const urlBase64Pattern = /^[A-Za-z0-9\-_=]+$/;
  if (!urlBase64Pattern.test(publicKey)) {
    const invalidChars = publicKey.match(/[^A-Za-z0-9\-_=]/g);
    return {
      isValid: false,
      error: `VAPID公開鍵に無効な文字が含まれています: ${invalidChars?.join(', ')}`
    };
  }

  // 長さの確認（一般的なVAPID公開鍵は87文字）
  if (publicKey.length < 80 || publicKey.length > 90) {
    return {
      isValid: false,
      error: `VAPID公開鍵の長さが不正です（現在: ${publicKey.length}文字）`
    };
  }

  try {
    // 実際に変換を試みる
    const uint8Array = urlBase64ToUint8Array(publicKey);
    
    // ECDSAのP-256公開鍵は65バイト（圧縮されていない場合）
    if (uint8Array.length !== 65) {
      return {
        isValid: false,
        error: `VAPID公開鍵のバイト長が不正です（期待値: 65, 実際: ${uint8Array.length}）`
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'VAPID公開鍵の変換に失敗しました'
    };
  }
}

/**
 * デバッグ用：VAPID鍵の詳細情報を取得
 * @param publicKey - VAPID公開鍵
 * @returns デバッグ情報
 */
export function getVapidKeyDebugInfo(publicKey: string): {
  length: number;
  hasValidCharacters: boolean;
  byteLength?: number;
  error?: string;
  rawValue?: string;
  firstChars?: string;
  lastChars?: string;
  hasPadding?: boolean;
  paddingCount?: number;
} {
  const info = {
    length: publicKey.length,
    hasValidCharacters: /^[A-Za-z0-9\-_=]+$/.test(publicKey),
    rawValue: publicKey.substring(0, 20) + '...',
    firstChars: publicKey.substring(0, 10),
    lastChars: publicKey.substring(publicKey.length - 10),
    hasPadding: publicKey.includes('='),
    paddingCount: (publicKey.match(/=/g) || []).length
  };

  try {
    const uint8Array = urlBase64ToUint8Array(publicKey);
    return {
      ...info,
      byteLength: uint8Array.length
    };
  } catch (error) {
    return {
      ...info,
      error: error instanceof Error ? error.message : '変換エラー'
    };
  }
}