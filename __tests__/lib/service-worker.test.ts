import {
  isServiceWorkerSupported,
  isPushNotificationSupported,
  getNotificationPermission,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription
} from '@/lib/service-worker';

// グローバルオブジェクトのモック
const mockServiceWorker = {
  register: jest.fn(),
  getRegistrations: jest.fn()
};

const mockPushManager = {
  subscribe: jest.fn(),
  getSubscription: jest.fn()
};

const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  unsubscribe: jest.fn(),
  getKey: jest.fn((name: string) => {
    if (name === 'p256dh') return new Uint8Array([1, 2, 3]);
    if (name === 'auth') return new Uint8Array([4, 5, 6]);
    return null;
  }),
  toJSON: jest.fn(() => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: {
      p256dh: 'AQID',
      auth: 'BAUG'
    }
  }))
};

const mockRegistration = {
  scope: '/',
  pushManager: mockPushManager,
  addEventListener: jest.fn(),
  installing: null
};

// window.btoa と window.atob のモック
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// consoleのモック
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

describe('service-worker utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // グローバルオブジェクトを直接設定
    (global as any).navigator = {
      serviceWorker: mockServiceWorker
    };

    (global as any).window = global;
    (global as any).PushManager = jest.fn();
    (global as any).Notification = {
      permission: 'default',
      requestPermission: jest.fn()
    };
  });

  afterEach(() => {
    // モックをリセット
    mockServiceWorker.register.mockReset();
    mockServiceWorker.getRegistrations.mockReset();
    mockPushManager.subscribe.mockReset();
    mockPushManager.getSubscription.mockReset();
    mockSubscription.unsubscribe.mockReset();
  });

  describe('isServiceWorkerSupported', () => {
    it('Service Workerがサポートされている場合はtrueを返す', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('Service Workerがサポートされていない場合はfalseを返す', () => {
      (global as any).navigator = {};
      expect(isServiceWorkerSupported()).toBe(false);
    });
  });

  describe('isPushNotificationSupported', () => {
    it('プッシュ通知がサポートされている場合はtrueを返す', () => {
      expect(isPushNotificationSupported()).toBe(true);
    });

    it('PushManagerがない場合はfalseを返す', () => {
      (global as any).PushManager = undefined;
      expect(isPushNotificationSupported()).toBe(false);
    });
  });

  describe('getNotificationPermission', () => {
    it('通知の許可状態を返す', () => {
      (global as any).Notification.permission = 'granted';
      expect(getNotificationPermission()).toBe('granted');
    });

    it('Notificationがサポートされていない場合はdeniedを返す', () => {
      (global as any).Notification = undefined;
      expect(getNotificationPermission()).toBe('denied');
    });
  });

  describe('registerServiceWorker', () => {
    it('正常にService Workerを登録できる', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      
      const result = await registerServiceWorker();
      
      expect(result).toBe(mockRegistration);
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });

    it('Service Workerがサポートされていない場合はnullを返す', async () => {
      (global as any).navigator = {};
      
      const result = await registerServiceWorker();
      
      expect(result).toBeNull();
    });

    it('登録エラーの場合はnullを返す', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));
      
      const result = await registerServiceWorker();
      
      expect(result).toBeNull();
    });
  });

  describe('requestNotificationPermission', () => {
    it('通知許可をリクエストできる', async () => {
      (global as any).Notification.requestPermission.mockResolvedValue('granted');
      
      const result = await requestNotificationPermission();
      
      expect(result).toBe('granted');
      expect((global as any).Notification.requestPermission).toHaveBeenCalled();
    });

    it('Notificationがサポートされていない場合はdeniedを返す', async () => {
      (global as any).Notification = undefined;
      
      const result = await requestNotificationPermission();
      
      expect(result).toBe('denied');
    });
  });

  describe('subscribeToPushNotifications', () => {
    const vapidPublicKey = 'test-vapid-key';

    it('新規購読を作成できる', async () => {
      mockPushManager.getSubscription.mockResolvedValue(null);
      mockPushManager.subscribe.mockResolvedValue(mockSubscription);
      
      const result = await subscribeToPushNotifications(mockRegistration as any, vapidPublicKey);
      
      expect(result).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'AQID',
          auth: 'BAUG'
        }
      });
    });

    it('既存の購読がある場合はそれを返す', async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      const result = await subscribeToPushNotifications(mockRegistration as any, vapidPublicKey);
      
      expect(result).toBeTruthy();
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    });

    it('プッシュ通知がサポートされていない場合はnullを返す', async () => {
      delete (global.window as any).PushManager;
      
      const result = await subscribeToPushNotifications(mockRegistration as any, vapidPublicKey);
      
      expect(result).toBeNull();
    });
  });

  describe('unsubscribeFromPushNotifications', () => {
    it('購読を解除できる', async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
      mockSubscription.unsubscribe.mockResolvedValue(true);
      
      const result = await unsubscribeFromPushNotifications(mockRegistration as any);
      
      expect(result).toBe(true);
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('購読がない場合もtrueを返す', async () => {
      mockPushManager.getSubscription.mockResolvedValue(null);
      
      const result = await unsubscribeFromPushNotifications(mockRegistration as any);
      
      expect(result).toBe(true);
    });
  });

  describe('getCurrentSubscription', () => {
    it('現在の購読を取得できる', async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      const result = await getCurrentSubscription(mockRegistration as any);
      
      expect(result).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'AQID',
          auth: 'BAUG'
        }
      });
    });

    it('購読がない場合はnullを返す', async () => {
      mockPushManager.getSubscription.mockResolvedValue(null);
      
      const result = await getCurrentSubscription(mockRegistration as any);
      
      expect(result).toBeNull();
    });
  });
});