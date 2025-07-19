import { test, expect } from '@playwright/test';

test.describe('JR高崎線運行情報ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3010/jr');
  });

  test('ページの基本要素が表示される', async ({ page }) => {
    // タイトル
    await expect(page.locator('h1')).toContainText('JR高崎線運行情報');
    
    // トップページへのリンク
    const homeLink = page.locator('text=トップページに戻る');
    await expect(homeLink).toBeVisible();
    
    // 運行状況表示エリア
    await expect(page.locator('h2:has-text("現在の運行状況")')).toBeVisible();
    
    // プッシュ通知設定エリア
    await expect(page.locator('h3:has-text("プッシュ通知設定")')).toBeVisible();
    
    // 注意書き
    await expect(page.locator('text=運行情報は1分ごとに自動更新されます')).toBeVisible();
  });

  test('運行状況が表示される', async ({ page }) => {
    // APIレスポンスをモック
    await page.route('**/api/jr/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: '平常運転',
            lastUpdated: new Date().toISOString(),
            details: null
          }
        })
      });
    });

    // ページリロード
    await page.reload();

    // 運行状況が表示されることを確認
    await expect(page.locator('text=平常運転')).toBeVisible();
    
    // 最終確認時刻が表示される
    await expect(page.locator('text=最終確認:')).toBeVisible();
  });

  test('遅延時はハイライト表示される', async ({ page }) => {
    // 遅延状態のAPIレスポンスをモック
    await page.route('**/api/jr/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: '遅延：人身事故の影響で約10分の遅れ',
            lastUpdated: new Date().toISOString(),
            details: '高崎～熊谷間で発生した人身事故の影響で、上下線に遅れが出ています。'
          }
        })
      });
    });

    // ページリロード
    await page.reload();

    // 遅延情報が表示される
    await expect(page.locator('text=遅延：人身事故の影響で約10分の遅れ')).toBeVisible();
    
    // 詳細情報が表示される
    await expect(page.locator('text=高崎～熊谷間で発生した人身事故')).toBeVisible();
    
    // 赤色のハイライト表示を確認
    const statusContainer = page.locator('div').filter({ hasText: '現在の運行状況' }).first();
    await expect(statusContainer).toHaveClass(/bg-red-100/);
  });

  test('更新ボタンが機能する', async ({ page }) => {
    let apiCallCount = 0;
    
    // APIコールをカウント
    await page.route('**/api/jr/status', async route => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: '平常運転',
            lastUpdated: new Date().toISOString(),
            details: null
          }
        })
      });
    });

    // 初回読み込み
    await page.reload();
    expect(apiCallCount).toBe(1);

    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // APIが再度呼ばれることを確認
    await page.waitForTimeout(100);
    expect(apiCallCount).toBe(2);
  });

  test('エラー時の表示とリトライ', async ({ page }) => {
    // エラーレスポンスをモック
    await page.route('**/api/jr/status', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'SCRAPING_ERROR',
          message: 'サーバーエラーが発生しました'
        })
      });
    });

    // ページリロード
    await page.reload();

    // エラーメッセージが表示される
    await expect(page.locator('h2:has-text("エラー")')).toBeVisible();
    await expect(page.locator('text=運行状況の取得に失敗しました')).toBeVisible();
    
    // 再試行ボタンが表示される
    await expect(page.locator('button:has-text("再試行")')).toBeVisible();
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 要素が適切に表示される
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("現在の運行状況")')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 要素が適切に表示される
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("現在の運行状況")')).toBeVisible();
  });

  test('トップページへのナビゲーションが機能する', async ({ page }) => {
    // トップページへのリンクをクリック
    await page.click('text=トップページに戻る');
    
    // URLが変更されることを確認
    await expect(page).toHaveURL('http://localhost:3010/');
  });
});