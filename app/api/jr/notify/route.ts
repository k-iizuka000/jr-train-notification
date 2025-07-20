import { NextRequest } from 'next/server';
import { sendPushNotification, sendPushNotificationToAll, createStatusChangeNotification } from '@/lib/push-notification';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import type { NotifyRequest, PushSubscriptionData } from '@/types';

// Vercel Runtime設定
export const runtime = 'nodejs';

// 内部APIのための簡易的な認証トークン（本番環境では環境変数から取得）
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'dev-internal-api-token';

export async function POST(request: NextRequest) {
  try {
    // 内部API認証の確認
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_TOKEN}`) {
      return createApiError(
        'UNAUTHORIZED',
        '認証に失敗しました。',
        401
      );
    }

    // リクエストボディを取得
    const body: NotifyRequest & { subscriptions?: PushSubscriptionData[] } = await request.json();
    
    // リクエストの検証
    if (!body.title || !body.body || !body.status) {
      return createApiError(
        'INVALID_REQUEST',
        '通知内容が不正です。title, body, statusは必須です。',
        400
      );
    }

    // 購読情報を取得（リクエストで渡された場合はそれを使用）
    const subscriptions = body.subscriptions || [];
    
    if (subscriptions.length === 0) {
      console.log('通知対象の購読者が指定されていません。');
      return createApiResponse({
        message: '通知対象の購読者が存在しません。',
        totalSubscribers: 0,
        succeeded: 0,
        failed: 0
      });
    }

    // 通知ペイロードを作成
    const isRecovered = body.status === '平常運転';
    const notification = createStatusChangeNotification(body.status, isRecovered);
    
    // カスタムタイトル・本文がある場合は上書き
    notification.title = body.title;
    notification.body = body.body;
    
    // iOS向けの最適化
    // iOS16.4以降では、通知オプションの一部が異なる扱いをされる
    if (notification.data) {
      notification.data = {
        ...notification.data,
        timestamp: new Date().toISOString(),
        url: body.url || '/jr'
      };
    }

    // 全購読者に通知を送信
    console.log(`${subscriptions.length}件の購読者に通知を送信します...`);
    const result = await sendPushNotificationToAll(subscriptions, notification);

    // 無効な購読があった場合はログに記録（削除はしない）
    if (result.invalidSubscriptions.length > 0) {
      console.log(`${result.invalidSubscriptions.length}件の無効な購読がありました:`, result.invalidSubscriptions);
    }

    return createApiResponse({
      message: `${result.succeeded}件の通知送信に成功しました。`,
      totalSubscribers: subscriptions.length,
      succeeded: result.succeeded,
      failed: result.failed,
      invalidSubscriptions: result.invalidSubscriptions.length
    });

  } catch (error) {
    console.error('通知送信エラー:', error);
    
    return createApiError(
      'NOTIFICATION_ERROR',
      '通知の送信に失敗しました。',
      500
    );
  }
}

// このエンドポイントは内部使用のみのため、OPTIONSは不要