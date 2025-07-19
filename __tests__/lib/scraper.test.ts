import { scrapeTrainStatus, getTrainStatus, ScraperError } from '@/lib/scraper';
import { scrapeTrainStatusMock, getTrainStatusMock } from '@/lib/scraper.mock';
import puppeteer from 'puppeteer';

// Puppeteerをモック
jest.mock('puppeteer');
const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('scrapeTrainStatus', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    // モックの初期化
    mockPage = {
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      goto: jest.fn(),
      waitForXPath: jest.fn(),
      $x: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常に運行状況を取得できる', async () => {
    // モックHTMLの要素
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('平常運転');

    const result = await scrapeTrainStatus();

    expect(result.status).toBe('平常運転');
    expect(result.isNormal).toBe(true);
    expect(result.lastUpdated).toBeInstanceOf(Date);
    expect(mockPage.goto).toHaveBeenCalledWith(
      'https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=takasakiline',
      expect.any(Object)
    );
  });

  it('遅延情報を正しく取得できる', async () => {
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('遅延：人身事故の影響で約10分の遅れ');

    const result = await scrapeTrainStatus();

    expect(result.status).toBe('遅延：人身事故の影響で約10分の遅れ');
    expect(result.isNormal).toBe(false);
  });

  it('要素が見つからない場合はエラーを投げる', async () => {
    mockPage.$x.mockResolvedValue([]);

    await expect(scrapeTrainStatus()).rejects.toThrow(ScraperError);
  });

  it('空のテキストの場合はエラーを投げる', async () => {
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('');

    await expect(scrapeTrainStatus()).rejects.toThrow(ScraperError);
  });

  it('タイムアウトした場合はリトライする', async () => {
    // 1回目は失敗、2回目は成功
    let callCount = 0;
    mockPage.goto.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('TimeoutError'));
      }
      return Promise.resolve();
    });
    
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('平常運転');

    const result = await scrapeTrainStatus();

    expect(result.status).toBe('平常運転');
    expect(callCount).toBe(2);
  });

  it('3回リトライしても失敗する場合はエラーを投げる', async () => {
    mockPage.goto.mockRejectedValue(new Error('NetworkError'));

    await expect(scrapeTrainStatus()).rejects.toThrow(ScraperError);
    await expect(scrapeTrainStatus()).rejects.toThrow('3回の試行後もスクレイピングに失敗しました');
    
    // gotoが3回呼ばれることを確認
    expect(mockPage.goto).toHaveBeenCalledTimes(3);
  });

  it('ブラウザが正しくクローズされる', async () => {
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('平常運転');

    await scrapeTrainStatus();

    expect(mockBrowser.close).toHaveBeenCalled();
    expect(mockPage.close).toHaveBeenCalled();
  });
});

describe('getTrainStatus', () => {
  let mockBrowser: any;
  let mockPage: any;
  let getTrainStatusLocal: any;

  beforeEach(async () => {
    // キャッシュをクリア
    jest.resetModules();
    // モジュールを再インポート
    const scraperModule = await import('@/lib/scraper');
    getTrainStatusLocal = scraperModule.getTrainStatus;
    
    // モックの初期化
    mockPage = {
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      goto: jest.fn(),
      waitForXPath: jest.fn(),
      $x: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);
  });

  it('キャッシュが有効な場合は再取得しない', async () => {
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('平常運転');

    // 1回目の取得
    const result1 = await getTrainStatusLocal();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(1);

    // 2回目の取得（キャッシュから）
    const result2 = await getTrainStatusLocal();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(1);
    
    expect(result1).toEqual(result2);
  });

  it('キャッシュを無効にした場合は再取得する', async () => {
    const mockElement = {};
    mockPage.$x.mockResolvedValue([mockElement]);
    mockPage.evaluate.mockResolvedValue('平常運転');

    // 1回目の取得
    await getTrainStatusLocal();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(1);

    // 2回目の取得（キャッシュ無効）
    await getTrainStatusLocal(false);
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
  });
});

describe('scrapeTrainStatusMock', () => {
  it('モックデータを順番に返す', async () => {
    const result1 = await scrapeTrainStatusMock();
    expect(result1.status).toBe('平常運転');
    expect(result1.isNormal).toBe(true);

    const result2 = await scrapeTrainStatusMock();
    expect(result2.status).toContain('遅延');
    expect(result2.isNormal).toBe(false);

    const result3 = await scrapeTrainStatusMock();
    expect(result3.status).toContain('運転見合わせ');
    expect(result3.isNormal).toBe(false);
  });
});

describe('getTrainStatusMock', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('モックでもキャッシュ機能が動作する', async () => {
    // 1回目の取得
    const result1 = await getTrainStatusMock();
    const time1 = result1.lastUpdated;

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 10));

    // 2回目の取得（キャッシュから）
    const result2 = await getTrainStatusMock();
    const time2 = result2.lastUpdated;
    
    // キャッシュから取得した場合、lastUpdatedは同じはず
    expect(time1).toEqual(time2);
    expect(result1.status).toEqual(result2.status);
  });
});