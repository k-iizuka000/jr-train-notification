import type { Browser, Page, LaunchOptions } from 'puppeteer-core';
import type { TrainStatus } from '@/types';
import { AppError, ErrorType, ErrorLevel } from './error-handler';
import { logger } from './logger';

// Vercel環境検出（ローカルでは常にfalseにする）
const isVercel = (process.env.VERCEL === '1' || process.env.VERCEL_ENV) && process.platform === 'linux';

// 動的インポートで環境に応じてライブラリを選択
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any;

if (isVercel) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  puppeteer = require('puppeteer-core');
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  puppeteer = require('puppeteer');
}

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
    await page.waitForSelector(`::-p-xpath(${STATUS_XPATH})`, { timeout: TIMEOUT });
    const statusTexts = await page.$$eval(`::-p-xpath(${STATUS_XPATH})`, els => els.map(el => el.textContent?.trim() || ''));
    
    if (statusTexts.length === 0) {
      throw new Error('運行状況要素が見つかりませんでした');
    }
    
    // テキストを取得
    const statusText = statusTexts[0];
    
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
      let launchOptions: LaunchOptions;
      
      if (isVercel) {
        // Vercel環境用の設定
        try {
          logger.debug('Chromiumの実行パスを取得中...', 'Scraper');
          const executablePath = await chromium.executablePath();
          logger.debug(`Chromium実行パス: ${executablePath}`, 'Scraper');
          
          // ファイルシステムの確認
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = require('fs');
          const pathExists = fs.existsSync(executablePath);
          logger.debug(`実行ファイルの存在確認: ${pathExists}`, 'Scraper');
          
          launchOptions = {
            args: [
              ...chromium.args,
              '--disable-web-security',
              '--disable-features=IsolateOrigins,site-per-process',
              '--no-first-run',
              '--no-default-browser-check',
              '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: true,
          };
          logger.debug('Vercel環境でchrome-aws-lambdaを使用', 'Scraper', {
            executablePath,
            args: launchOptions.args?.length || 0,
            defaultViewport: launchOptions.defaultViewport
          });
        } catch (error) {
          logger.error('Chromium実行パスの取得に失敗', 'Scraper', 
            error instanceof Error ? error : new Error(String(error)),
            {
              errorName: error instanceof Error ? error.name : 'Unknown',
              errorStack: error instanceof Error ? error.stack : undefined
            }
          );
          throw new Error(`Chromium実行パスの取得に失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // ローカル環境用の設定
        launchOptions = {
          headless: process.env.PUPPETEER_HEADLESS !== 'false',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
          ]
        };
        
        // カスタム実行パス設定
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
          logger.debug(`カスタム実行パスを使用: ${process.env.PUPPETEER_EXECUTABLE_PATH}`, 'Scraper');
        }
      }

      logger.debug('Puppeteerを起動中...', 'Scraper', { 
        launchOptions: {
          ...launchOptions,
          executablePath: launchOptions.executablePath ? '[SET]' : '[UNSET]'
        }, 
        isVercel 
      });
      
      try {
        browser = await puppeteer.launch(launchOptions);
        logger.debug('Puppeteerの起動に成功', 'Scraper');
      } catch (launchError) {
        logger.error('Puppeteerの起動に失敗', 'Scraper',
          launchError instanceof Error ? launchError : new Error(String(launchError)),
          { isVercel, nodeVersion: process.version }
        );
        throw launchError;
      }
      
      const statusText = await scrapeWithBrowser(browser!);
      
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