import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store-wrapper';
import { sendPushNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import { validateVapidPublicKey } from '@/utils/vapid-helper';
import type { SubscribeRequest } from '@/types';

// Vercel Runtime設定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('=== /api/jr/subscribe POST開始 ===');
  console.log('リクエストヘッダー:', Object.fromEntries(request.headers.entries()));
  
  try {
    // 生のリクエストボディを取得してログ出力
    const rawBody = await request.text();
    console.log('生のリクエストボディ:', rawBody);
    
    // Content-Typeヘッダーを確認
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Content-Typeエラー:', contentType);
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
      body = JSON.parse(rawBody);
      console.log('パースされた購読オブジェクト:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('JSONパースエラー:', e);
      console.error('生のボディ:', rawBody);
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
    console.log('購読情報の検証開始...');
    if (!body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      console.error('購読情報が不完全:', {
        hasSubscription: !!body.subscription,
        hasEndpoint: !!(body.subscription && body.subscription.endpoint),
        hasKeys: !!(body.subscription && body.subscription.keys)
      });
      return createApiError(
        'INVALID_REQUEST',
        '購読情報が不正です。',
        400
      );
    }
    
    // iOS向けの追加検証
    console.log('購読キーの詳細:', {
      p256dh: body.subscription.keys.p256dh ? `${body.subscription.keys.p256dh.substring(0, 20)}...` : 'なし',
      auth: body.subscription.keys.auth ? `${body.subscription.keys.auth.substring(0, 20)}...` : 'なし',
      p256dhLength: body.subscription.keys.p256dh ? body.subscription.keys.p256dh.length : 0,
      authLength: body.subscription.keys.auth ? body.subscription.keys.auth.length : 0
    });
    
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
    
    // 購読情報の詳細をログ出力（保存はしない）
    console.log('購読情報を受信:', {
      endpoint: body.subscription.endpoint,
      hasKeys: !!body.subscription.keys,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // 購読成功時に即座にテスト通知を送信
    try {
      console.log('購読成功通知を送信中...');
      
      // 即座に通知を送信（購読情報を直接使用）
      await sendPushNotification(body.subscription, {
        title: '🎉 通知の設定が完了しました',
        body: 'JR高崎線の運行情報をお知らせします。遅延が発生した際に通知でお知らせします。',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        url: '/jr',
        tag: 'subscription-success',
        requireInteraction: false
      });
      
      console.log('購読成功通知の送信完了');
    } catch (error) {
      // 通知の送信に失敗しても購読登録は成功とする
      console.error('購読成功通知の送信に失敗しました:', error);
      
      if (error instanceof PushNotificationError) {
        console.error('PushNotificationError詳細:', {
          message: error.message,
          originalError: error.originalError
        });
        
        if (error.message.includes('無効')) {
          // 無効な購読の場合は失敗を返す
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
    console.error('=== 購読登録エラー（最外側のcatch） ===');
    console.error('エラー:', error);
    console.error('エラーの型:', error?.constructor?.name);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Error以外のオブジェクト:', JSON.stringify(error, null, 2));
    }
    
    try {
      const errorResponse = createApiError(
        'SUBSCRIPTION_ERROR',
        error instanceof Error ? error.message : 'プッシュ通知の購読に失敗しました。',
        500,
        {
          'Content-Type': 'application/json',
        }
      );
      
      console.log('=== エラーレスポンス作成成功 ===');
      console.log('レスポンスステータス:', 500);
      return errorResponse;
    } catch (responseError) {
      console.error('=== エラーレスポンス作成中にエラー ===', responseError);
      // 最後の手段として、基本的なエラーレスポンスを返す
      return new Response(JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
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