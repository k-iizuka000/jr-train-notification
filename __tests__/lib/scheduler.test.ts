import {
  checkTrainStatusAndNotify,
  getSchedulerState,
  resetSchedulerState,
  isWeekday,
  isScheduledTime
} from '@/lib/scheduler';
import { getTrainStatus } from '@/lib/scraper';
import { subscriptionStore } from '@/lib/subscription-store';
import { sendPushNotificationToAll, createStatusChangeNotification } from '@/lib/push-notification';

// モック
jest.mock('@/lib/scraper');
jest.mock('@/lib/subscription-store');
jest.mock('@/lib/push-notification');

const mockGetTrainStatus = getTrainStatus as jest.MockedFunction<typeof getTrainStatus>;
const mockSubscriptionStore = subscriptionStore as jest.Mocked<typeof subscriptionStore>;
const mockSendPushNotificationToAll = sendPushNotificationToAll as jest.MockedFunction<typeof sendPushNotificationToAll>;
const mockCreateStatusChangeNotification = createStatusChangeNotification as jest.MockedFunction<typeof createStatusChangeNotification>;

describe('scheduler', () => {
  const mockSubscriptions = [
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-1',
      keys: { p256dh: 'key1', auth: 'auth1' }
    },
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-2',
      keys: { p256dh: 'key2', auth: 'auth2' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetSchedulerState();
    
    // デフォルトのモック設定
    mockCreateStatusChangeNotification.mockImplementation((status, isRecovered) => ({
      title: isRecovered ? '復旧しました' : '運行状況に変化',
      body: status,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        status,
        timestamp: new Date().toISOString()
      }
    }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('checkTrainStatusAndNotify', () => {
    it('初回チェックで平常運転の場合は通知しない', async () => {
      mockGetTrainStatus.mockResolvedValue({
        status: '平常運転',
        lastUpdated: new Date(),
        details: null
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);

      const result = await checkTrainStatusAndNotify();

      expect(result.status).toBe('平常運転');
      expect(result.notificationSent).toBe(false);
      expect(mockSendPushNotificationToAll).not.toHaveBeenCalled();
    });

    it('初回チェックで遅延の場合は通知する', async () => {
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延：人身事故の影響で約10分の遅れ',
        lastUpdated: new Date(),
        details: '詳細情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: []
      });

      const result = await checkTrainStatusAndNotify();

      expect(result.status).toBe('遅延：人身事故の影響で約10分の遅れ');
      expect(result.notificationSent).toBe(true);
      expect(mockSendPushNotificationToAll).toHaveBeenCalledTimes(1);
    });

    it('平常運転から遅延に変化した場合は通知する', async () => {
      // 1回目: 平常運転
      mockGetTrainStatus.mockResolvedValue({
        status: '平常運転',
        lastUpdated: new Date(),
        details: null
      });
      await checkTrainStatusAndNotify();

      // 2回目: 遅延
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: []
      });

      const result = await checkTrainStatusAndNotify();

      expect(result.notificationSent).toBe(true);
      expect(mockSendPushNotificationToAll).toHaveBeenCalledTimes(1);
    });

    it('遅延から平常運転に復旧した場合は通知する', async () => {
      // 1回目: 遅延
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: []
      });
      await checkTrainStatusAndNotify();

      // 時間を進める（クールダウン期間を超えるため）
      jest.advanceTimersByTime(6 * 60 * 1000); // 6分進める

      // 2回目: 平常運転
      mockGetTrainStatus.mockResolvedValue({
        status: '平常運転',
        lastUpdated: new Date(),
        details: null
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: []
      });

      const result = await checkTrainStatusAndNotify();

      expect(result.notificationSent).toBe(true);
      expect(mockSendPushNotificationToAll).toHaveBeenCalledTimes(2);
    });

    it('クールダウン期間中は通知しない', async () => {
      // 1回目: 遅延
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 2,
        failed: 0,
        invalidSubscriptions: []
      });
      await checkTrainStatusAndNotify();

      // 即座に2回目: 別の遅延（5分以内）
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延：別の理由',
        lastUpdated: new Date(),
        details: '別の遅延情報'
      });

      const result = await checkTrainStatusAndNotify();

      expect(result.notificationSent).toBe(false);
      expect(mockSendPushNotificationToAll).toHaveBeenCalledTimes(1); // 1回目のみ
    });

    it('購読者がいない場合は通知をスキップ', async () => {
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue([]);

      const result = await checkTrainStatusAndNotify();

      expect(result.notificationSent).toBe(false);
      expect(mockSendPushNotificationToAll).not.toHaveBeenCalled();
    });

    it('無効な購読を削除する', async () => {
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue(mockSubscriptions);
      mockSendPushNotificationToAll.mockResolvedValue({
        succeeded: 1,
        failed: 1,
        invalidSubscriptions: ['https://fcm.googleapis.com/fcm/send/test-2']
      });

      await checkTrainStatusAndNotify();

      expect(mockSubscriptionStore.removeInvalidSubscriptions).toHaveBeenCalledWith([
        'https://fcm.googleapis.com/fcm/send/test-2'
      ]);
    });

    it('スクレイピングエラーの場合はエラーを返す', async () => {
      mockGetTrainStatus.mockRejectedValue(new Error('スクレイピングエラー'));

      const result = await checkTrainStatusAndNotify();

      expect(result.status).toBe('エラー');
      expect(result.notificationSent).toBe(false);
      expect(result.error).toBe('スクレイピングエラー');
    });
  });

  describe('isWeekday', () => {
    it('月曜日は平日', () => {
      const monday = new Date('2024-01-15'); // 月曜日
      expect(isWeekday(monday)).toBe(true);
    });

    it('金曜日は平日', () => {
      const friday = new Date('2024-01-19'); // 金曜日
      expect(isWeekday(friday)).toBe(true);
    });

    it('土曜日は平日ではない', () => {
      const saturday = new Date('2024-01-20'); // 土曜日
      expect(isWeekday(saturday)).toBe(false);
    });

    it('日曜日は平日ではない', () => {
      const sunday = new Date('2024-01-21'); // 日曜日
      expect(isWeekday(sunday)).toBe(false);
    });
  });

  describe('isScheduledTime', () => {
    it('7:00は定期チェック時刻', () => {
      const morning = new Date('2024-01-15T07:00:00');
      expect(isScheduledTime(morning)).toBe(true);
    });

    it('17:00は定期チェック時刻', () => {
      const evening = new Date('2024-01-15T17:00:00');
      expect(isScheduledTime(evening)).toBe(true);
    });

    it('7:01は定期チェック時刻ではない', () => {
      const notScheduled = new Date('2024-01-15T07:01:00');
      expect(isScheduledTime(notScheduled)).toBe(false);
    });

    it('12:00は定期チェック時刻ではない', () => {
      const noon = new Date('2024-01-15T12:00:00');
      expect(isScheduledTime(noon)).toBe(false);
    });
  });

  describe('getSchedulerState', () => {
    it('初期状態を返す', () => {
      const state = getSchedulerState();
      
      expect(state.lastStatus).toBeNull();
      expect(state.lastCheckTime).toBeNull();
      expect(state.isDelayed).toBe(false);
      expect(state.lastNotificationTime).toBeNull();
    });

    it('チェック後の状態を返す', async () => {
      mockGetTrainStatus.mockResolvedValue({
        status: '遅延',
        lastUpdated: new Date(),
        details: '遅延情報'
      });
      mockSubscriptionStore.getAllSubscriptions.mockResolvedValue([]);

      await checkTrainStatusAndNotify();
      const state = getSchedulerState();

      expect(state.lastStatus).toBe('遅延');
      expect(state.lastCheckTime).toBeTruthy();
      expect(state.isDelayed).toBe(true);
    });
  });
});