import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendTestNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import { validateVapidPublicKey } from '@/utils/vapid-helper';
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
      console.error('JSONパースエラー:', e);
      console.error('リクエストヘッダー:', Object.fromEntries(request.headers.entries()));
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
    
    // iOS向けの追加検証
    if (body.subscription.keys.p256dh && body.subscription.keys.auth) {
      // キーの長さをチェック
      if (body.subscription.keys.p256dh.length < 10 || body.subscription.keys.auth.length < 10) {
        console.error('購読キーが短すぎます:', {
          p256dhLength: body.subscription.keys.p256dh.length,
          authLength: body.subscription.keys.auth.length
        });
        return createApiError(
          'INVALID_SUBSCRIPTION',
          '購読キーが無効です。ブラウザを再起動してもう一度お試しください。',
          400
        );
      }
    }

    // VAPID公開鍵の検証
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (vapidPublicKey) {
      const validation = validateVapidPublicKey(vapidPublicKey);
      if (!validation.isValid) {
        console.error('VAPID公開鍵が無効です:', validation.error);
        return createApiError(
          'CONFIGURATION_ERROR',
          'サーバー設定エラー: VAPID公開鍵が無効です。',
          500
        );
      }
    }
    
    // 購読情報を保存
    console.log('購読情報を保存中...', {
      endpoint: body.subscription.endpoint,
      hasKeys: !!body.subscription.keys,
      userAgent: request.headers.get('user-agent') || 'unknown'
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
          
          // iOS向けの詳細なエラーメッセージ
          const userAgent = request.headers.get('user-agent') || '';
          const isIOS = /iPad|iPhone|iPod/.test(userAgent);
          
          return createApiError(
            'INVALID_SUBSCRIPTION',
            isIOS 
              ? 'iOSで通知の購読に失敗しました。Safariの設定から「Webサイトの通知」を許可し、ブラウザを再起動してください。'
              : '購読情報が無効です。ブラウザの通知設定を確認してください。',
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