import { POST, OPTIONS } from '@/app/api/jr/unsubscribe/route';
import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// subscriptionStoreのモック
jest.mock('@/lib/subscription-store', () => ({
  subscriptionStore: {
    removeSubscription: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/jr/unsubscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('正常に購読解除できる', async () => {
      (subscriptionStore.removeSubscription as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3010/api/jr/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('購読を解除しました');
      expect(data.data.subscribed).toBe(false);
      expect(subscriptionStore.removeSubscription).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send/test-endpoint'
      );
    });

    it('エンドポイントが指定されていない場合は400エラー', async () => {
      const request = new NextRequest('http://localhost:3010/api/jr/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_REQUEST');
    });

    it('購読情報が見つからない場合は404エラー', async () => {
      (subscriptionStore.removeSubscription as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3010/api/jr/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/not-found',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NOT_FOUND');
    });

    it('エラーが発生した場合は500エラー', async () => {
      (subscriptionStore.removeSubscription as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3010/api/jr/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNSUBSCRIBE_ERROR');
    });
  });

  describe('OPTIONS', () => {
    it('CORS ヘッダーを正しく返す', async () => {
      const request = new NextRequest('http://localhost:3010/api/jr/unsubscribe', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });
});