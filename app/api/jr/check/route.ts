import { NextRequest } from 'next/server';
import { checkTrainStatusAndNotify, getSchedulerState } from '@/lib/scheduler';
import { createApiResponse, createApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

// 内部APIのための簡易的な認証トークン（本番環境では環境変数から取得）
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'dev-internal-api-token';

export async function POST(request: NextRequest) {
  logger.info('POST /api/jr/checkへのリクエスト', 'API', {
    url: request.url,
    method: 'POST'
  });
  
  try {
    // 内部API認証の確認
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_TOKEN}`) {
      logger.warn('認証失敗', 'API', {
        hasAuthHeader: !!authHeader
      });
      return createApiError(
        'UNAUTHORIZED',
        '認証に失敗しました。',
        401
      );
    }

    // 運行状況チェックと通知送信
    logger.info('定期チェックを実行中...', 'API');
    const result = await checkTrainStatusAndNotify();
    
    // 現在の状態を取得
    const state = getSchedulerState();
    
    logger.info('定期チェック完了', 'API', {
      status: result.status,
      notificationSent: result.notificationSent,
      isDelayed: state.isDelayed,
      hasError: !!result.error
    });
    
    return createApiResponse({
      message: '運行状況チェックを実行しました。',
      currentStatus: result.status,
      notificationSent: result.notificationSent,
      lastCheckTime: state.lastCheckTime,
      isDelayed: state.isDelayed,
      error: result.error
    });

  } catch (error) {
    logger.error(
      'POST /api/jr/checkでエラー発生',
      'API',
      error instanceof Error ? error : new Error(String(error))
    );
    
    return createApiError(
      'CHECK_ERROR',
      '運行状況チェックに失敗しました。',
      500,
      undefined,
      error
    );
  }
}

export async function GET(request: NextRequest) {
  logger.info('GET /api/jr/checkへのリクエスト', 'API', {
    url: request.url,
    method: 'GET'
  });
  
  try {
    // 内部API認証の確認
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_TOKEN}`) {
      logger.warn('認証失敗', 'API', {
        hasAuthHeader: !!authHeader
      });
      return createApiError(
        'UNAUTHORIZED',
        '認証に失敗しました。',
        401
      );
    }

    // 現在の状態を返す
    const state = getSchedulerState();
    
    logger.debug('スケジューラ状態を返します', 'API', {
      isDelayed: state.isDelayed,
      hasDelayCheckInterval: state.delayCheckInterval !== null
    });
    
    return createApiResponse({
      lastStatus: state.lastStatus,
      lastCheckTime: state.lastCheckTime,
      isDelayed: state.isDelayed,
      lastNotificationTime: state.lastNotificationTime,
      hasDelayCheckInterval: state.delayCheckInterval !== null
    });

  } catch (error) {
    logger.error(
      'GET /api/jr/checkでエラー発生',
      'API',
      error instanceof Error ? error : new Error(String(error))
    );
    
    return createApiError(
      'STATE_ERROR',
      '状態の取得に失敗しました。',
      500,
      undefined,
      error
    );
  }
}