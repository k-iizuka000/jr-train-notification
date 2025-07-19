import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { AppError, errorHandler } from './error-handler';
import { logger } from './logger';

export function createApiResponse<T = any>(
  data: T,
  status: number = 200,
  headers?: HeadersInit
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: status >= 200 && status < 300,
    data,
  };

  logger.debug('APIレスポンスを作成', 'API', {
    status,
    success: response.success,
    hasData: !!data
  });

  return NextResponse.json(response, { status, headers });
}

export function createApiError(
  error: string,
  message: string,
  statusCode: number = 500,
  headers?: HeadersInit,
  originalError?: unknown
): NextResponse<ApiResponse> {
  // エラーをログに記録
  if (originalError) {
    errorHandler.handleError(originalError, `API Error: ${error}`, {
      statusCode,
      apiError: error,
      userMessage: message
    });
  }
  
  logger.error(`APIエラー: ${error}`, 'API', 
    originalError instanceof Error ? originalError : new Error(message),
    { statusCode, errorType: error }
  );

  const response: ApiResponse = {
    success: false,
    error,
    message,
  };

  return NextResponse.json(response, { status: statusCode, headers });
}

export function createApiErrorFromAppError(
  appError: AppError,
  statusCode: number = 500,
  headers?: HeadersInit
): NextResponse<ApiResponse> {
  // ユーザー向けメッセージを取得
  const userMessage = errorHandler.getUserFriendlyMessage(appError);
  
  logger.debug('AppErrorからAPIエラーレスポンスを作成', 'API', {
    errorType: appError.type,
    statusCode
  });
  
  return createApiError(
    appError.type,
    userMessage,
    statusCode,
    headers,
    appError
  );
}

export function getCacheHeaders(maxAge: number = 60): HeadersInit {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
  };
}

export function getNoCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
}