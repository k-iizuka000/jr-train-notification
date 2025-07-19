import { test, expect } from '@playwright/test';

test.describe('PWA機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/jr');
  });

  test('Web App Manifestが正しく設定される', async ({ page }) => {
    // manifestのリンクタグを確認
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    
    // manifestファイルを取得
    const response = await page.request.get('http://localhost:3010/manifest.json');
    expect(response.ok()).toBe(true);
    
    const manifest = await response.json();
    expect(manifest.name).toBe('JR高崎線運行情報');
    expect(manifest.short_name).toBe('JR高崎線');
    expect(manifest.start_url).toBe('/jr');
    expect(manifest.display).toBe('standalone');
  });

  test('PWAのメタタグが設定される', async ({ page }) => {
    // theme-color
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#0070f3');
    
    // viewport
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
    
    // apple-mobile-web-app-capable
    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');
  });

  test('アイコンファイルが存在する', async ({ page }) => {
    // 主要なアイコンファイルの存在を確認
    const iconSizes = ['192x192', '512x512'];
    
    for (const size of iconSizes) {
      const response = await page.request.get(`http://localhost:3010/icons/icon-${size}.png`);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/png');
    }
    
    // Apple Touch Icon
    const appleTouchIcon = await page.request.get('http://localhost:3010/icons/apple-touch-icon.png');
    expect(appleTouchIcon.ok()).toBe(true);
  });

  test('Service Workerが登録される', async ({ page }) => {
    // Service Workerの登録を待つ
    await page.waitForTimeout(3000);
    
    // Service Workerの状態を確認
    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) {
        return { supported: true, registered: false };
      }
      
      const registration = registrations[0];
      return {
        supported: true,
        registered: true,
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      };
    });
    
    expect(swState.supported).toBe(true);
    expect(swState.registered).toBe(true);
    expect(swState.scope).toContain('localhost:3010');
  });

  test('オフライン時のフォールバック', async ({ page, context }) => {
    // ページを一度読み込んでキャッシュさせる
    await page.goto('http://localhost:3010/jr');
    await page.waitForTimeout(2000);
    
    // オフラインモードに切り替え
    await context.setOffline(true);
    
    // ページをリロード
    await page.reload();
    
    // タイトルが表示されることを確認（キャッシュから読み込まれた）
    await expect(page.locator('h1')).toContainText('JR高崎線運行情報');
    
    // オンラインに戻す
    await context.setOffline(false);
  });

  test('インストールプロンプトのモック', async ({ page }) => {
    // beforeinstallpromptイベントをモック
    await page.evaluate(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        (window as any).deferredPrompt = e;
      });
    });
    
    // イベントをディスパッチ
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      (event as any).prompt = () => Promise.resolve();
      (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    
    // deferredPromptが設定されたことを確認
    const hasDeferredPrompt = await page.evaluate(() => {
      return !!(window as any).deferredPrompt;
    });
    
    expect(hasDeferredPrompt).toBe(true);
  });
});