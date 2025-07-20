import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendPushNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';

// Vercel Runtime設定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    
    // エンドポイントの検証
    if (!body.endpoint) {
      return createApiError(
        'INVALID_REQUEST',
        'エンドポイントが指定されていません。',
        400
      );
    }

    // 購読情報を取得
    const subscription = await subscriptionStore.getSubscription(body.endpoint);
    
    if (!subscription) {
      return createApiError(
        'SUBSCRIPTION_NOT_FOUND',
        '購読情報が見つかりません。',
        404
      );
    }

    // 1分後にテスト通知を送信するスケジュール
    setTimeout(async () => {
      try {
        await sendPushNotification(subscription, {
          title: 'テスト通知',
          body: 'これはテスト通知です。正常に通知を受信できました。',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          url: '/jr',
          tag: 'test-notification',
          requireInteraction: false
        });
        console.log('テスト通知を送信しました:', subscription.endpoint);
      } catch (error) {
        console.error('テスト通知の送信に失敗しました:', error);
      }
    }, 60000); // 60秒 = 1分

    return createApiResponse({
      message: '1分後にテスト通知を送信します。',
      scheduled: true
    });

  } catch (error) {
    console.error('テスト通知スケジュールエラー:', error);
    
    return createApiError(
      'NOTIFICATION_ERROR',
      'テスト通知のスケジュールに失敗しました。',
      500
    );
  }
}

// OPTIONS メソッドの処理（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}