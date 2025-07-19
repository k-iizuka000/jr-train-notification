import { NextRequest } from 'next/server';
import { getTrainStatus, ScraperError } from '@/lib/scraper';
import { getTrainStatusMock } from '@/lib/scraper.mock';
import { createApiResponse, createApiError, getCacheHeaders } from '@/lib/api-helpers';
import type { TrainStatusResponse } from '@/types';
import { logger } from '@/lib/logger';

// 開発環境でモックを使用するかどうか
const USE_MOCK = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_SCRAPER === 'true';

// Vercel Edge Runtime設定
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('GET /api/jr/statusへのリクエスト', 'API', {
    url: request.url,
    method: 'GET'
  });
  
  try {
    // クエリパラメータからキャッシュ無効化フラグを取得
    const searchParams = request.nextUrl.searchParams;
    const noCache = searchParams.get('nocache') === 'true';
    
    logger.debug('APIパラメータ', 'API', { noCache, useMock: USE_MOCK });

    // 運行状況を取得（環境に応じてモックまたは実際のスクレイピング）
    const trainStatus = USE_MOCK 
      ? await getTrainStatusMock(!noCache)
      : await getTrainStatus(!noCache);

    // レスポンス用に変換
    const response: TrainStatusResponse = {
      status: trainStatus.status,
      lastUpdated: trainStatus.lastUpdated.toISOString(),
      isNormal: trainStatus.isNormal,
    };

    // キャッシュヘッダーを設定（1分間キャッシュ）
    const headers = getCacheHeaders(60);
    
    const duration = Date.now() - startTime;
    logger.info('GET /api/jr/statusのレスポンス作成完了', 'API', {
      status: 200,
      duration,
      trainStatus: trainStatus.status,
      isNormal: trainStatus.isNormal
    });

    return createApiResponse(response, 200, headers);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // エラーの詳細情報を取得
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = {
      duration,
      errorType: error?.constructor?.name || 'Unknown',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      useMock: USE_MOCK
    };
    
    logger.error(
      'GET /api/jr/statusでエラー発生',
      'API',
      error instanceof Error ? error : new Error(String(error)),
      errorDetails
    );

    // エラーの種類に応じて適切なレスポンスを返す
    if (error instanceof ScraperError) {
      return createApiError(
        'SCRAPING_ERROR',
        `JR東日本のサイトから情報を取得できませんでした。${process.env.NODE_ENV === 'development' ? ` 詳細: ${errorMessage}` : ''} しばらく時間をおいてから再度お試しください。`,
        503,
        undefined,
        error
      );
    }

    // Puppeteer関連のエラーを特定
    if (errorMessage.includes('Failed to launch') || errorMessage.includes('puppeteer') || errorMessage.includes('chromium')) {
      return createApiError(
        'BROWSER_LAUNCH_ERROR',
        `ブラウザの起動に失敗しました。${process.env.NODE_ENV === 'development' ? ` 詳細: ${errorMessage}` : ''} システム管理者にお問い合わせください。`,
        500,
        undefined,
        error
      );
    }

    // その他のエラー
    return createApiError(
      'INTERNAL_ERROR',
      `予期しないエラーが発生しました。${process.env.NODE_ENV === 'development' ? ` 詳細: ${errorMessage}` : ''}`,
      500,
      undefined,
      error
    );
  }
}

// OPTIONS メソッドの処理（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}