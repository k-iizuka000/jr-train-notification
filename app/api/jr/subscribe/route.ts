import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendTestNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import type { SubscribeRequest } from '@/types';

// Vercel Runtime設定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Content-Typeヘッダーを確認
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return createApiError(
        'INVALID_REQUEST',
        'Content-Type must be application/json',
        400,
        {
          'Content-Type': 'application/json',
        }
      );
    }

    // リクエストボディを取得
    let body: SubscribeRequest;
    try {
      body = await request.json();
    } catch (e) {
      return createApiError(
        'INVALID_REQUEST',
        'Invalid JSON in request body',
        400,
        {
          'Content-Type': 'application/json',
        }
      );
    }
    
    // 購読情報の検証
    if (!body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      return createApiError(
        'INVALID_REQUEST',
        '購読情報が不正です。',
        400
      );
    }

    // 購読情報を保存
    console.log('購読情報を保存中...', {
      endpoint: body.subscription.endpoint,
      hasKeys: !!body.subscription.keys
    });
    
    await subscriptionStore.addSubscription(body.subscription);
    console.log('購読情報の保存完了');

    // テスト通知を送信
    try {
      console.log('テスト通知を送信中...');
      await sendTestNotification(body.subscription);
      console.log('テスト通知の送信完了');
    } catch (error) {
      // テスト通知の送信に失敗しても購読登録は成功とする
      console.error('テスト通知の送信に失敗しました:', error);
      
      if (error instanceof PushNotificationError) {
        console.error('PushNotificationError詳細:', {
          message: error.message,
          originalError: error.originalError
        });
        
        if (error.message.includes('無効')) {
          // 無効な購読の場合は削除して失敗を返す
          await subscriptionStore.removeSubscription(body.subscription.endpoint);
          return createApiError(
            'INVALID_SUBSCRIPTION',
            '購読情報が無効です。ブラウザの通知設定を確認してください。',
            400,
            {
              'Content-Type': 'application/json',
            }
          );
        }
      }
    }

    return createApiResponse({
      message: 'プッシュ通知の購読に成功しました。',
      subscribed: true
    }, 201, {
      'Content-Type': 'application/json',
    });

  } catch (error) {
    console.error('購読登録エラー:', error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return createApiError(
      'SUBSCRIPTION_ERROR',
      error instanceof Error ? error.message : 'プッシュ通知の購読に失敗しました。',
      500,
      {
        'Content-Type': 'application/json',
      }
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