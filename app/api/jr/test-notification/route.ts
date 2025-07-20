import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendPushNotification, PushNotificationError } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';

// Vercel Runtime設定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('=== /api/jr/test-notification POST開始 ===');
  
  try {
    // リクエストボディを取得
    let body;
    try {
      body = await request.json();
      console.log('リクエストボディ:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('JSONパースエラー:', jsonError);
      return createApiError(
        'INVALID_REQUEST',
        'リクエストボディが不正です。',
        400,
        {
          'Content-Type': 'application/json',
        }
      );
    }
    
    // エンドポイントの検証
    if (!body.endpoint) {
      console.error('エンドポイントが指定されていません:', body);
      return createApiError(
        'INVALID_REQUEST',
        'エンドポイントが指定されていません。',
        400,
        {
          'Content-Type': 'application/json',
        }
      );
    }

    // 購読情報を取得
    console.log('購読情報を取得中:', body.endpoint);
    const subscription = await subscriptionStore.getSubscription(body.endpoint);
    
    // デバッグ用：現在の全購読情報を出力
    const allSubscriptions = await subscriptionStore.getAllSubscriptions();
    console.log('=== 現在の全購読情報 ===');
    console.log('購読数:', allSubscriptions.length);
    allSubscriptions.forEach((sub, index) => {
      console.log(`購読${index + 1}:`);
      console.log(`  エンドポイント: ${sub.endpoint.substring(0, 50)}...`);
      console.log(`  完全一致チェック: ${sub.endpoint === body.endpoint ? '✅ 一致' : '❌ 不一致'}`);
    });
    
    if (!subscription) {
      console.error('購読情報が見つかりません:', body.endpoint);
      console.error('エンドポイント長:', body.endpoint.length);
      return createApiError(
        'SUBSCRIPTION_NOT_FOUND',
        '購読情報が見つかりません。通知を一度無効にしてから、再度有効にしてください。',
        404,
        {
          'Content-Type': 'application/json',
        }
      );
    }
    
    console.log('購読情報を取得しました:', {
      endpoint: subscription.endpoint,
      hasKeys: !!subscription.keys
    });

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

    const response = createApiResponse({
      message: '1分後にテスト通知を送信します。',
      scheduled: true
    }, 200, {
      'Content-Type': 'application/json',
    });
    
    console.log('=== テスト通知スケジュール成功 ===');
    return response;

  } catch (error) {
    console.error('=== テスト通知スケジュールエラー ===');
    console.error('エラー:', error);
    console.error('エラーの型:', error?.constructor?.name);
    
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return createApiError(
      'NOTIFICATION_ERROR',
      error instanceof Error ? error.message : 'テスト通知のスケジュールに失敗しました。',
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