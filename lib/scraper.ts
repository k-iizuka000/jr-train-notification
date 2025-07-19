import puppeteer, { Browser, Page } from 'puppeteer';
import type { TrainStatus } from '@/types';
import { AppError, ErrorType, ErrorLevel, errorHandler } from './error-handler';
import { logger } from './logger';

const JR_TAKASAKI_URL = 'https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=takasakiline';
const STATUS_XPATH = '//*[@id="contents"]/section/section[2]/section[1]/div/div';
const TIMEOUT = parseInt(process.env.SCRAPING_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.SCRAPING_MAX_RETRIES || '3', 10);

// 後方互換性のため残す
export class ScraperError extends AppError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(
      ErrorType.SCRAPING_ERROR,
      message,
      ErrorLevel.ERROR,
      originalError,
      { url: JR_TAKASAKI_URL, xpath: STATUS_XPATH }
    );
    this.name = 'ScraperError';
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeWithBrowser(browser: Browser): Promise<string> {
  let page: Page | null = null;
  
  try {
    page = await browser.newPage();
    logger.debug('新しいページを作成しました', 'Scraper');
    
    // タイムアウト設定
    page.setDefaultTimeout(TIMEOUT);
    page.setDefaultNavigationTimeout(TIMEOUT);
    
    // ページに移動
    logger.debug(`${JR_TAKASAKI_URL} へアクセス中...`, 'Scraper');
    await page.goto(JR_TAKASAKI_URL, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT
    });
    logger.debug('ページの読み込みが完了しました', 'Scraper');
    
    // XPathで要素を取得
    await page.waitForXPath(STATUS_XPATH, { timeout: TIMEOUT });
    const elements = await page.$x(STATUS_XPATH);
    
    if (elements.length === 0) {
      throw new Error('運行状況要素が見つかりませんでした');
    }
    
    // テキストを取得
    const statusText = await page.evaluate(
      (el: Element) => el.textContent?.trim() || '',
      elements[0]
    );
    
    if (!statusText) {
      throw new Error('運行状況テキストが空です');
    }
    
    logger.debug(`運行状況を取得: ${statusText}`, 'Scraper');
    return statusText;
    
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

export async function scrapeTrainStatus(): Promise<TrainStatus> {
  const startTime = Date.now();
  logger.info('スクレイピングを開始します', 'Scraper', { url: JR_TAKASAKI_URL });
  
  let browser: Browser | null = null;
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        logger.info(`リトライ ${attempt}/${MAX_RETRIES}`, 'Scraper');
      }
      // ブラウザを起動
      browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ]
      });
      
      const statusText = await scrapeWithBrowser(browser);
      
      // 運行状況オブジェクトを作成
      const trainStatus: TrainStatus = {
        status: statusText,
        lastUpdated: new Date(),
        isNormal: statusText.includes('平常運転')
      };
      
      const duration = Date.now() - startTime;
      logger.logScrapingComplete(statusText, duration);
      
      return trainStatus;
      
    } catch (error) {
      lastError = error;
      logger.error(
        `スクレイピング試行 ${attempt}/${MAX_RETRIES} 失敗`,
        'Scraper',
        error instanceof Error ? error : new Error(String(error)),
        { attempt, maxRetries: MAX_RETRIES }
      );
      
      if (attempt < MAX_RETRIES) {
        // リトライ前に待機（指数バックオフ）
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.debug(`${waitTime}ms待機してからリトライします`, 'Scraper');
        await delay(waitTime);
      }
      
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
      }
    }
  }
  
  // 全てのリトライが失敗した場合
  const duration = Date.now() - startTime;
  const error = new ScraperError(
    `${MAX_RETRIES}回の試行後もスクレイピングに失敗しました`,
    lastError
  );
  logger.logScrapingComplete('', duration, error);
  throw error;
}

// キャッシュ機能
interface CachedStatus {
  data: TrainStatus;
  timestamp: number;
}

let statusCache: CachedStatus | null = null;
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '60000', 10);

export async function getTrainStatus(useCache: boolean = true): Promise<TrainStatus> {
  // キャッシュが有効な場合
  if (useCache && statusCache) {
    const now = Date.now();
    if (now - statusCache.timestamp < CACHE_DURATION) {
      logger.debug('キャッシュから運行状況を返します', 'Scraper', {
        cacheAge: now - statusCache.timestamp,
        cacheDuration: CACHE_DURATION
      });
      return statusCache.data;
    }
  }
  
  // 新しいデータを取得
  logger.debug('新しい運行状況を取得します', 'Scraper');
  const previousStatus = statusCache?.data.status || null;
  const status = await scrapeTrainStatus();
  
  // ステータス変更をログ
  if (previousStatus && previousStatus !== status.status) {
    logger.logStatusChange(status.status, previousStatus);
  }
  
  // キャッシュを更新
  statusCache = {
    data: status,
    timestamp: Date.now()
  };
  logger.debug('キャッシュを更新しました', 'Scraper');
  
  return status;
}