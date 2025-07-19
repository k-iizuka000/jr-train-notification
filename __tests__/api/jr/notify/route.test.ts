import { POST } from '@/app/api/jr/notify/route';
import { NextRequest } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendPushNotificationToAll } from '@/lib/push-notification';
import type { PushSubscriptionData } from '@/types';

// モック
jest.mock('@/lib/subscription-store', () => ({
  subscriptionStore: {
    getAllSubscriptions: jest.fn(),
    removeInvalidSubscriptions: jest.fn(),
  },
}));

jest.mock('@/lib/push-notification', () => ({
  sendPushNotificationToAll: jest.fn(),
  createStatusChangeNotification: jest.fn((status, isRecovered) => ({
    title: isRecovered ? '🚃 JR高崎線: 平常運転に復旧' : '🚃 JR高崎線: 運行状況に変化',
    body: status,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      status,
      timestamp: new Date().toISOString(),
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/jr/notify', () => {
  const mockSubscriptions: PushSubscriptionData[] = [
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-1',
      keys: { p256dh: 'test-key-1', auth: 'test-auth-1' },
    },
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
      keys: { p256dh: 'test-key-2', auth: 'test-auth-2' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERNAL_API_TOKEN = 'test-token';
  });

  describe('POST', () => {
    it('正常に通知を送信できる', async () => {
      (subscriptionStore.getAllSubscriptions as jest.Mock).mockResolvedValue(mockSubscriptions);
      (sendPushNotificationToAll as jest.Mock).mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: [],
      });

      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: '遅延が発生しています',
          status: '遅延',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.succeeded).toBe(2);
      expect(data.data.failed).toBe(0);
      expect(sendPushNotificationToAll).toHaveBeenCalledWith(
        mockSubscriptions,
        expect.objectContaining({
          title: 'テスト通知',
          body: '遅延が発生しています',
        })
      );
    });

    it('認証トークンがない場合は401エラー', async () => {
      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: 'テスト',
          status: '平常運転',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('無効な認証トークンの場合は401エラー', async () => {
      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: 'テスト',
          status: '平常運転',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('必須パラメータが不足している場合は400エラー', async () => {
      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          // bodyとstatusが不足
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_REQUEST');
    });

    it('購読者が存在しない場合も正常レスポンス', async () => {
      (subscriptionStore.getAllSubscriptions as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: 'テスト',
          status: '平常運転',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSubscribers).toBe(0);
      expect(sendPushNotificationToAll).not.toHaveBeenCalled();
    });

    it('無効な購読がある場合は削除する', async () => {
      (subscriptionStore.getAllSubscriptions as jest.Mock).mockResolvedValue(mockSubscriptions);
      (sendPushNotificationToAll as jest.Mock).mockResolvedValue({
        succeeded: 1,
        failed: 1,
        invalidSubscriptions: ['https://fcm.googleapis.com/fcm/send/test-endpoint-2'],
      });

      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: 'テスト',
          status: '平常運転',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(subscriptionStore.removeInvalidSubscriptions).toHaveBeenCalledWith([
        'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
      ]);
      expect(data.data.invalidSubscriptions).toBe(1);
    });

    it('エラーが発生した場合は500エラー', async () => {
      (subscriptionStore.getAllSubscriptions as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3010/api/jr/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'テスト通知',
          body: 'テスト',
          status: '平常運転',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NOTIFICATION_ERROR');
    });
  });
});