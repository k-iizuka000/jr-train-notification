import webpush from 'web-push';
import type { PushSubscriptionData, NotificationPayload } from '@/types';
import { AppError, ErrorType, ErrorLevel, errorHandler } from './error-handler';
import { logger } from './logger';

// VAPID設定を初期化
function initializeWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      'VAPID設定が不足しています。環境変数を確認してください。',
      ErrorLevel.CRITICAL,
      undefined,
      { 
        vapidStatus: { 
          publicKey: !!publicKey, 
          privateKey: !!privateKey, 
          subject: !!subject 
        } 
      }
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  logger.info('Web Push VAPID設定を初期化しました', 'PushNotification');
}

// 初期化を実行
try {
  initializeWebPush();
} catch (error) {
  errorHandler.handleError(error, 'Web Push Initialization');
}

// 後方互換性のため残す
export class PushNotificationError extends AppError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(
      ErrorType.NOTIFICATION_ERROR,
      message,
      ErrorLevel.ERROR,
      originalError
    );
    this.name = 'PushNotificationError';
  }
}

/**
 * プッシュ通知を送信する
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<void> {
  try {
    logger.debug('通知を送信中...', 'PushNotification', {
      endpoint: subscription.endpoint,
      title: payload.title
    });
    
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );

    if (response.statusCode !== 201 && response.statusCode !== 204) {
      throw new PushNotificationError(
        `通知送信に失敗しました。ステータス: ${response.statusCode}`
      );
    }
    
    logger.debug('通知送信成功', 'PushNotification', {
      endpoint: subscription.endpoint,
      statusCode: response.statusCode
    });
  } catch (error) {
    // 410 Gone: 購読が無効になった場合
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
      logger.warn('購読が無効になりました', 'PushNotification', {
        endpoint: subscription.endpoint,
        statusCode: 410
      });
      throw new PushNotificationError('購読が無効になりました', error);
    }

    logger.error(
      '通知送信中にエラーが発生しました',
      'PushNotification',
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: subscription.endpoint }
    );
    throw new PushNotificationError('通知送信中にエラーが発生しました', error);
  }
}

/**
 * 複数の購読者に通知を送信する
 */
export async function sendPushNotificationToAll(
  subscriptions: PushSubscriptionData[],
  payload: NotificationPayload
): Promise<{
  succeeded: number;
  failed: number;
  invalidSubscriptions: string[];
}> {
  logger.info(`${subscriptions.length}件の購読に通知を送信します`, 'PushNotification', {
    title: payload.title,
    body: payload.body
  });
  
  const results = {
    succeeded: 0,
    failed: 0,
    invalidSubscriptions: [] as string[],
  };

  const promises = subscriptions.map(async (subscription) => {
    try {
      await sendPushNotification(subscription, payload);
      results.succeeded++;
    } catch (error) {
      results.failed++;
      
      if (error instanceof PushNotificationError && error.message.includes('無効')) {
        results.invalidSubscriptions.push(subscription.endpoint);
      }
    }
  });

  await Promise.allSettled(promises);
  
  logger.logNotificationSent(results.succeeded, results.failed, {
    totalSubscriptions: subscriptions.length,
    invalidSubscriptions: results.invalidSubscriptions
  });
  
  return results;
}

/**
 * テスト通知を送信する
 */
export async function sendTestNotification(
  subscription: PushSubscriptionData
): Promise<void> {
  const payload: NotificationPayload = {
    title: 'JR高崎線運行情報 - テスト通知',
    body: 'プッシュ通知が正常に設定されました。',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      status: 'テスト',
      timestamp: new Date().toISOString(),
    },
  };

  logger.info('テスト通知を送信します', 'PushNotification', {
    endpoint: subscription.endpoint
  });
  
  await sendPushNotification(subscription, payload);
}

/**
 * 運行状況変更通知を作成する
 */
export function createStatusChangeNotification(
  status: string,
  isNormal: boolean
): NotificationPayload {
  const title = isNormal 
    ? 'JR高崎線 - 平常運転に復旧' 
    : 'JR高崎線 - 運行状況に変化';

  const body = status;
  
  logger.debug('運行状況変更通知を作成', 'PushNotification', {
    status,
    isNormal,
    title
  });

  return {
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      status,
      timestamp: new Date().toISOString(),
    },
  };
}