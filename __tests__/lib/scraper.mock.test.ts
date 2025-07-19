import { scrapeTrainStatusMock, getTrainStatusMock } from '@/lib/scraper.mock';

describe('scrapeTrainStatusMock', () => {
  it('モックデータを順番に返す', async () => {
    // モジュールを新しくインポートして状態をリセット
    jest.resetModules();
    const { scrapeTrainStatusMock: freshScraper } = await import('@/lib/scraper.mock');
    
    const result1 = await freshScraper();
    expect(result1.status).toBe('平常運転');
    expect(result1.isNormal).toBe(true);
    expect(result1.lastUpdated).toBeInstanceOf(Date);

    const result2 = await freshScraper();
    expect(result2.status).toContain('遅延');
    expect(result2.isNormal).toBe(false);

    const result3 = await freshScraper();
    expect(result3.status).toContain('運転見合わせ');
    expect(result3.isNormal).toBe(false);

    const result4 = await freshScraper();
    expect(result4.status).toBe('平常運転');
    expect(result4.isNormal).toBe(true);

    const result5 = await freshScraper();
    expect(result5.status).toContain('遅延');
    expect(result5.isNormal).toBe(false);

    // 6回目は最初に戻る
    const result6 = await freshScraper();
    expect(result6.status).toBe('平常運転');
  }, 10000);

  it('ランダムな遅延をシミュレートする', async () => {
    const start = Date.now();
    await scrapeTrainStatusMock();
    const end = Date.now();
    
    const elapsed = end - start;
    expect(elapsed).toBeGreaterThanOrEqual(500);
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('getTrainStatusMock', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('キャッシュが有効な場合は再取得しない', async () => {
    jest.resetModules();
    const { getTrainStatusMock: freshGetter } = await import('@/lib/scraper.mock');
    
    // 1回目の取得
    const result1 = await freshGetter();
    const timestamp1 = result1.lastUpdated.getTime();

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2回目の取得（キャッシュから）
    const result2 = await freshGetter();
    const timestamp2 = result2.lastUpdated.getTime();
    
    // タイムスタンプが同じ = キャッシュから取得
    expect(timestamp1).toBe(timestamp2);
    expect(result1.status).toBe(result2.status);
  });

  it('キャッシュを無効にした場合は再取得する', async () => {
    jest.resetModules();
    const { getTrainStatusMock: freshGetter } = await import('@/lib/scraper.mock');
    
    // 1回目の取得
    const result1 = await freshGetter();
    const status1 = result1.status;

    // 2回目の取得（キャッシュ無効）
    const result2 = await freshGetter(false);
    const status2 = result2.status;
    
    // ステータスが変わっている可能性がある（モックは順番に返すため）
    // 平常運転の次は遅延情報
    if (status1 === '平常運転') {
      expect(status2).toContain('遅延');
    }
  });
});