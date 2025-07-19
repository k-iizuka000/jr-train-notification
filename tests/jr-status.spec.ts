import { test, expect } from '@playwright/test';

test.describe('JR高崎線運行情報', () => {
  test('ページが正しく表示される', async ({ page }) => {
    await page.goto('/jr');
    
    // タイトルが表示される
    await expect(page.locator('h1')).toHaveText('JR高崎線運行情報');
    
    // トップページへのリンクが存在する
    const topLink = page.locator('a:has-text("トップページに戻る")');
    await expect(topLink).toBeVisible();
    await expect(topLink).toHaveAttribute('href', '/');
    
    // 注意書きが表示される
    await expect(page.locator('text=運行情報は1分ごとに自動更新されます')).toBeVisible();
    await expect(page.locator('text=JR東日本の公式サイトから取得した情報を表示しています')).toBeVisible();
  });

  test('運行状況が表示される', async ({ page }) => {
    await page.goto('/jr');
    
    // ローディング状態または運行状況が表示されるまで待つ
    await page.waitForSelector('.bg-green-100, .bg-red-100, .bg-gray-200', { timeout: 10000 });
    
    // 運行状況のテキストが存在する
    const statusText = page.locator('text=現在の運行状況').first();
    await expect(statusText).toBeVisible();
    
    // 最終更新時刻が表示される
    await expect(page.locator('text=最終確認:')).toBeVisible();
    
    // 更新ボタンが存在する
    const updateButton = page.locator('button:has-text("更新")');
    await expect(updateButton).toBeVisible();
  });

  test('APIエンドポイントが正常に動作する', async ({ page, request }) => {
    // APIを直接呼び出す
    const response = await request.get('/api/jr/status');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('lastUpdated');
    expect(data.data).toHaveProperty('isNormal');
    
    // キャッシュヘッダーが設定されている
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('s-maxage=60');
  });

  test('手動更新ボタンが動作する', async ({ page }) => {
    await page.goto('/jr');
    
    // 運行状況が表示されるまで待つ
    await page.waitForSelector('.bg-green-100, .bg-red-100', { timeout: 10000 });
    
    // 更新前の最終更新時刻を取得
    const lastUpdatedBefore = await page.locator('text=最終確認:').textContent();
    
    // 更新ボタンをクリック
    await page.locator('button:has-text("更新")').click();
    
    // 少し待つ（APIリクエストの完了を待つ）
    await page.waitForTimeout(1000);
    
    // 最終更新時刻が変わっている
    const lastUpdatedAfter = await page.locator('text=最終確認:').textContent();
    expect(lastUpdatedBefore).not.toBe(lastUpdatedAfter);
  });

  test('エラー状態が正しく表示される', async ({ page }) => {
    // APIエラーをモック
    await page.route('**/api/jr/status', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'SCRAPING_ERROR',
          message: 'JR東日本のサイトから情報を取得できませんでした。'
        })
      });
    });
    
    await page.goto('/jr');
    
    // エラーメッセージが表示される
    await page.waitForSelector('.bg-red-50', { timeout: 10000 });
    await expect(page.locator('text=エラー')).toBeVisible();
    
    // 再試行ボタンが表示される
    await expect(page.locator('button:has-text("再試行")')).toBeVisible();
  });

  test('平常運転と遅延で表示が切り替わる', async ({ page }) => {
    // 平常運転のモック
    await page.route('**/api/jr/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: '平常運転',
            lastUpdated: new Date().toISOString(),
            isNormal: true
          }
        })
      });
    });
    
    await page.goto('/jr');
    
    // 平常運転の表示（緑色）
    await expect(page.locator('.bg-green-100')).toBeVisible();
    await expect(page.locator('text=現在の運行状況')).toBeVisible();
    await expect(page.locator('text=平常運転')).toBeVisible();
    
    // 遅延のモックに切り替え
    await page.route('**/api/jr/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: '遅延：人身事故の影響で約10分の遅れ',
            lastUpdated: new Date().toISOString(),
            isNormal: false
          }
        })
      });
    });
    
    // 更新ボタンをクリック
    await page.locator('button:has-text("更新")').click();
    
    // 遅延の表示（赤色）に切り替わる
    await page.waitForSelector('.bg-red-100', { timeout: 10000 });
    await expect(page.locator('.animate-pulse')).toBeVisible();
    await expect(page.locator('text=遅延：人身事故の影響で約10分の遅れ')).toBeVisible();
  });
});