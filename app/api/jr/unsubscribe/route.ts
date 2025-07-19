import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import type { UnsubscribeRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: UnsubscribeRequest = await request.json();
    
    // エンドポイントの検証
    if (!body.endpoint) {
      return createApiError(
        'INVALID_REQUEST',
        'エンドポイントが指定されていません。',
        400
      );
    }

    // 購読情報を削除
    const removed = await subscriptionStore.removeSubscription(body.endpoint);

    if (!removed) {
      return createApiError(
        'NOT_FOUND',
        '指定された購読情報が見つかりません。',
        404
      );
    }

    return createApiResponse({
      message: 'プッシュ通知の購読を解除しました。',
      subscribed: false
    });

  } catch (error) {
    logger.error(
      '購読解除エラー',
      'API',
      error instanceof Error ? error : new Error(String(error))
    );
    
    return createApiError(
      'UNSUBSCRIBE_ERROR',
      'プッシュ通知の購読解除に失敗しました。',
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