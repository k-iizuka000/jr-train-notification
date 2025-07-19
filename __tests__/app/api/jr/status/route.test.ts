/**
 * @jest-environment node
 */
import { GET, OPTIONS } from '@/app/api/jr/status/route';
import { createMockNextRequest } from '@/__tests__/helpers/api-test-helpers';

// モックの設定
jest.mock('@/lib/scraper', () => ({
  getTrainStatus: jest.fn(),
  ScraperError: class ScraperError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ScraperError';
    }
  },
}));

jest.mock('@/lib/scraper.mock', () => ({
  getTrainStatusMock: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// モックモジュールを取得
const { getTrainStatus, ScraperError } = require('@/lib/scraper');
const { getTrainStatusMock } = require('@/lib/scraper.mock');

describe('/api/jr/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数の設定
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCK_SCRAPER = 'false';
  });

  describe('GET', () => {
    it('正常に運行状況を返す', async () => {
      const mockStatus = {
        status: '平常運転',
        lastUpdated: new Date('2024-01-01T12:00:00Z'),
        isNormal: true,
      };

      getTrainStatus.mockResolvedValue(mockStatus);

      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        status: '平常運転',
        lastUpdated: '2024-01-01T12:00:00.000Z',
        isNormal: true,
      });

      // キャッシュヘッダーの確認
      expect(response.headers.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=120');
    });

    it('nocacheパラメータでキャッシュを無効化できる', async () => {
      const mockStatus = {
        status: '遅延',
        lastUpdated: new Date(),
        isNormal: false,
      };

      getTrainStatus.mockResolvedValue(mockStatus);

      const request = createMockNextRequest('http://localhost:3010/api/jr/status?nocache=true');
      await GET(request);

      expect(getTrainStatus).toHaveBeenCalledWith(false);
    });

    it('開発環境でモックスクレイパーを使用する', async () => {
      // 開発環境の設定
      const originalNodeEnv = process.env.NODE_ENV;
      const originalUseMock = process.env.USE_MOCK_SCRAPER;
      
      process.env.NODE_ENV = 'development';
      process.env.USE_MOCK_SCRAPER = 'true';

      const mockStatus = {
        status: '平常運転（モック）',
        lastUpdated: new Date('2024-01-01T12:00:00Z'),
        isNormal: true,
      };

      // モックの設定
      getTrainStatusMock.mockResolvedValue(mockStatus);
      getTrainStatus.mockResolvedValue({
        status: '平常運転（本番）',
        lastUpdated: new Date('2024-01-01T12:00:00Z'),
        isNormal: true,
      });

      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // 環境設定を元に戻す
      process.env.NODE_ENV = originalNodeEnv;
      process.env.USE_MOCK_SCRAPER = originalUseMock;
    });

    it('ScraperErrorの場合は503を返す', async () => {
      const scraperError = new ScraperError('スクレイピングに失敗しました');
      getTrainStatus.mockRejectedValue(scraperError);

      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SCRAPING_ERROR');
      expect(data.message).toBe('JR東日本のサイトから情報を取得できませんでした。しばらく時間をおいてから再度お試しください。');
    });

    it('その他のエラーの場合は500を返す', async () => {
      getTrainStatus.mockRejectedValue(new Error('予期しないエラー'));

      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.message).toBe('予期しないエラーが発生しました。');
    });

    it('エラー時にlogger.errorが呼ばれる', async () => {
      const { logger } = require('@/lib/logger');
      const error = new Error('テストエラー');
      getTrainStatus.mockRejectedValue(error);

      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      await GET(request);

      expect(logger.error).toHaveBeenCalledWith(
        'GET /api/jr/statusでエラー発生',
        'API',
        error,
        expect.any(Object)
      );
    });
  });

  describe('OPTIONS', () => {
    it('CORSヘッダーを返す', async () => {
      const request = createMockNextRequest('http://localhost:3010/api/jr/status');
      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
      expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type');
    });
  });
});