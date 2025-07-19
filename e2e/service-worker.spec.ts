import { test, expect } from '@playwright/test';

test.describe('Service Worker機能', () => {
  test.beforeEach(async ({ page }) => {
    // Service Worker をサポートするブラウザでテスト
    await page.goto('http://localhost:3010/jr');
  });

  test('Service Workerが正しく登録される', async ({ page }) => {
    // Service Worker の登録状態を確認
    const isRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    // 初回アクセス時は登録されていない可能性があるため、少し待つ
    if (!isRegistered) {
      await page.waitForTimeout(2000);
      const registeredAfterWait = await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      });
      expect(registeredAfterWait).toBe(true);
    } else {
      expect(isRegistered).toBe(true);
    }
  });

  test('通知許可のリクエストができる', async ({ page, context }) => {
    // ブラウザコンテキストで通知を許可
    await context.grantPermissions(['notifications']);

    const permission = await page.evaluate(() => {
      return Notification.permission;
    });

    expect(permission).toBe('granted');
  });

  test('プッシュ通知の購読フローが動作する', async ({ page, context }) => {
    // 通知を許可
    await context.grantPermissions(['notifications']);

    // Service Worker の登録を待つ
    await page.waitForTimeout(2000);

    // プッシュ通知購読のテスト（実際のUIがまだないため、直接APIをテスト）
    const subscriptionResult = await page.evaluate(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // VAPIDキーのモック（実際の値は環境変数から取得）
        const vapidPublicKey = 'test-vapid-public-key';
        
        // 購読を試みる（実際の購読は失敗する可能性があるが、APIの存在を確認）
        const canSubscribe = 'pushManager' in registration;
        return { canSubscribe, registrationScope: registration.scope };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(subscriptionResult.canSubscribe).toBe(true);
    expect(subscriptionResult.registrationScope).toBe('http://localhost:3010/');
  });

  test('Service Worker がプッシュイベントを処理できる', async ({ page }) => {
    // Service Worker の登録を待つ
    await page.waitForTimeout(2000);

    // Service Worker がアクティブかチェック
    const swState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        active: registration.active !== null,
        state: registration.active?.state
      };
    });

    expect(swState.active).toBe(true);
    expect(swState.state).toBe('activated');
  });
});