import { 
  sendPushNotification, 
  sendPushNotificationToAll,
  sendTestNotification,
  createStatusChangeNotification,
  PushNotificationError 
} from '@/lib/push-notification';
import webpush from 'web-push';
import type { PushSubscriptionData, NotificationPayload } from '@/types';

// web-pushのモック
jest.mock('web-push');
const mockWebpush = webpush as jest.Mocked<typeof webpush>;

describe('push-notification', () => {
  const mockSubscription: PushSubscriptionData = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトの成功レスポンス
    mockWebpush.sendNotification.mockResolvedValue({
      statusCode: 201,
      body: '',
      headers: {},
    } as any);
  });

  describe('sendPushNotification', () => {
    it('正常に通知を送信できる', async () => {
      const payload: NotificationPayload = {
        title: 'テスト通知',
        body: 'これはテストです',
      };

      await sendPushNotification(mockSubscription, payload);

      expect(mockWebpush.sendNotification).toHaveBeenCalledWith(
        mockSubscription,
        JSON.stringify(payload)
      );
    });

    it('ステータスコードが201/204以外の場合はエラーを投げる', async () => {
      mockWebpush.sendNotification.mockResolvedValue({
        statusCode: 400,
        body: 'Bad Request',
        headers: {},
      } as any);

      const payload: NotificationPayload = {
        title: 'テスト',
        body: 'テスト',
      };

      await expect(sendPushNotification(mockSubscription, payload))
        .rejects.toThrow(PushNotificationError);
    });

    it('410エラーの場合は購読無効エラーを投げる', async () => {
      const error: any = new Error('Gone');
      error.statusCode = 410;
      mockWebpush.sendNotification.mockRejectedValue(error);

      const payload: NotificationPayload = {
        title: 'テスト',
        body: 'テスト',
      };

      await expect(sendPushNotification(mockSubscription, payload))
        .rejects.toThrow('購読が無効になりました');
    });
  });

  describe('sendPushNotificationToAll', () => {
    it('複数の購読者に通知を送信できる', async () => {
      const subscriptions: PushSubscriptionData[] = [
        mockSubscription,
        {
          ...mockSubscription,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
        },
      ];

      const payload: NotificationPayload = {
        title: '一斉通知',
        body: 'すべての購読者へ',
      };

      const result = await sendPushNotificationToAll(subscriptions, payload);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.invalidSubscriptions).toHaveLength(0);
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('一部の送信が失敗しても処理を継続する', async () => {
      const subscriptions: PushSubscriptionData[] = [
        mockSubscription,
        {
          ...mockSubscription,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
        },
      ];

      // 1つ目は成功、2つ目は失敗
      mockWebpush.sendNotification
        .mockResolvedValueOnce({
          statusCode: 201,
          body: '',
          headers: {},
        } as any)
        .mockRejectedValueOnce(new Error('Network error'));

      const payload: NotificationPayload = {
        title: 'テスト',
        body: 'テスト',
      };

      const result = await sendPushNotificationToAll(subscriptions, payload);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('無効な購読を記録する', async () => {
      const subscriptions: PushSubscriptionData[] = [mockSubscription];

      const error: any = new Error('Gone');
      error.statusCode = 410;
      mockWebpush.sendNotification.mockRejectedValue(error);

      const payload: NotificationPayload = {
        title: 'テスト',
        body: 'テスト',
      };

      const result = await sendPushNotificationToAll(subscriptions, payload);

      expect(result.failed).toBe(1);
      expect(result.invalidSubscriptions).toContain(mockSubscription.endpoint);
    });
  });

  describe('sendTestNotification', () => {
    it('テスト通知を送信できる', async () => {
      await sendTestNotification(mockSubscription);

      expect(mockWebpush.sendNotification).toHaveBeenCalledWith(
        mockSubscription,
        expect.stringContaining('テスト通知')
      );

      const callArg = mockWebpush.sendNotification.mock.calls[0][1];
      const payload = JSON.parse(callArg as string);
      
      expect(payload.title).toContain('テスト通知');
      expect(payload.data.status).toBe('テスト');
    });
  });

  describe('createStatusChangeNotification', () => {
    it('平常運転復旧の通知を作成する', () => {
      const notification = createStatusChangeNotification('平常運転', true);

      expect(notification.title).toContain('平常運転に復旧');
      expect(notification.body).toBe('平常運転');
      expect(notification.data?.status).toBe('平常運転');
    });

    it('運行状況変化の通知を作成する', () => {
      const notification = createStatusChangeNotification(
        '遅延：人身事故の影響で約10分の遅れ',
        false
      );

      expect(notification.title).toContain('運行状況に変化');
      expect(notification.body).toBe('遅延：人身事故の影響で約10分の遅れ');
    });

    it('アイコンとバッジが設定される', () => {
      const notification = createStatusChangeNotification('平常運転', true);

      expect(notification.icon).toBe('/icons/icon-192x192.png');
      expect(notification.badge).toBe('/icons/badge-72x72.png');
    });
  });
});