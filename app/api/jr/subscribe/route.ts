import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendTestNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import type { SubscribeRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: SubscribeRequest = await request.json();
    
    // 購読情報の検証
    if (!body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      return createApiError(
        'INVALID_REQUEST',
        '購読情報が不正です。',
        400
      );
    }

    // 購読情報を保存
    await subscriptionStore.addSubscription(body.subscription);

    // テスト通知を送信
    try {
      await sendTestNotification(body.subscription);
    } catch (error) {
      // テスト通知の送信に失敗しても購読登録は成功とする
      console.error('テスト通知の送信に失敗しました:', error);
      
      if (error instanceof PushNotificationError && error.message.includes('無効')) {
        // 無効な購読の場合は削除して失敗を返す
        await subscriptionStore.removeSubscription(body.subscription.endpoint);
        return createApiError(
          'INVALID_SUBSCRIPTION',
          '購読情報が無効です。ブラウザの通知設定を確認してください。',
          400
        );
      }
    }

    return createApiResponse({
      message: 'プッシュ通知の購読に成功しました。',
      subscribed: true
    }, 201);

  } catch (error) {
    console.error('購読登録エラー:', error);
    
    return createApiError(
      'SUBSCRIPTION_ERROR',
      'プッシュ通知の購読に失敗しました。',
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