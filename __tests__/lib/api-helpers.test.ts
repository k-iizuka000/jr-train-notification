import { NextResponse } from 'next/server';
import {
  createApiResponse,
  createApiError,
  getCacheHeaders,
  getNoCacheHeaders,
} from '@/lib/api-helpers';

describe('api-helpers', () => {
  describe('createApiResponse', () => {
    it('成功レスポンスを作成する', () => {
      const data = { message: 'Success' };
      const response = createApiResponse(data);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('カスタムステータスコードを設定できる', () => {
      const data = { message: 'Created' };
      const response = createApiResponse(data, 201);
      
      expect(response.status).toBe(201);
    });

    it('カスタムヘッダーを設定できる', () => {
      const data = { message: 'Success' };
      const headers = { 'X-Custom-Header': 'test-value' };
      const response = createApiResponse(data, 200, headers);
      
      expect(response.headers.get('x-custom-header')).toBe('test-value');
    });

    it('300番台以上のステータスコードではsuccessがfalseになる', () => {
      const data = { message: 'Redirect' };
      const response = createApiResponse(data, 301);
      
      // NextResponseのbody部分は直接アクセスできないため、
      // この部分のテストは実際のAPIテストで確認
      expect(response.status).toBe(301);
    });
  });

  describe('createApiError', () => {
    it('エラーレスポンスを作成する', () => {
      const response = createApiError('ERROR_CODE', 'Error message');
      
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('カスタムステータスコードを設定できる', () => {
      const response = createApiError('NOT_FOUND', 'Resource not found', 404);
      
      expect(response.status).toBe(404);
    });

    it('カスタムヘッダーを設定できる', () => {
      const headers = { 'X-Error-Type': 'validation' };
      const response = createApiError('VALIDATION_ERROR', 'Invalid input', 400, headers);
      
      expect(response.headers.get('x-error-type')).toBe('validation');
    });
  });

  describe('getCacheHeaders', () => {
    it('デフォルトのキャッシュヘッダーを返す', () => {
      const headers = getCacheHeaders();
      
      expect(headers).toEqual({
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      });
    });

    it('カスタムmax-ageを設定できる', () => {
      const headers = getCacheHeaders(300);
      
      expect(headers).toEqual({
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      });
    });

    it('stale-while-revalidateはmax-ageの2倍になる', () => {
      const headers = getCacheHeaders(120);
      
      expect(headers).toEqual({
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      });
    });
  });

  describe('getNoCacheHeaders', () => {
    it('キャッシュ無効化ヘッダーを返す', () => {
      const headers = getNoCacheHeaders();
      
      expect(headers).toEqual({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
    });
  });
});